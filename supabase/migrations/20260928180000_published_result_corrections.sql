-- Super Admin-only, audited correction of already-published race results.
-- The answer update, rescoring, and republication happen in one transaction.

create table if not exists public.published_result_corrections (
  id uuid primary key default gen_random_uuid(),
  race_id uuid not null references public.races(id) on delete restrict,
  corrected_by uuid not null references auth.users(id) on delete restrict,
  reason text not null check (char_length(reason) between 10 and 500),
  previous_answers jsonb not null,
  corrected_answers jsonb not null,
  previous_score_version integer,
  corrected_score_version integer not null,
  corrected_at timestamptz not null default now()
);

alter table public.published_result_corrections enable row level security;

create policy published_result_corrections_super_admin_select
on public.published_result_corrections
for select
to authenticated
using (public.has_role('super_admin'::public.app_role));

create or replace function public.correct_published_race_results(
  p_race_id uuid,
  p_answers jsonb,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  requesting_user_id uuid := auth.uid();
  selected_race public.races%rowtype;
  normalized_reason text := btrim(coalesce(p_reason, ''));
  previous_answers jsonb;
  corrected_answers jsonb;
  answer_result jsonb;
  scoring_result jsonb;
  publication_result jsonb;
  previous_version integer;
begin
  if requesting_user_id is null then
    raise exception using errcode = 'P0001', message = 'AUTHENTICATION_REQUIRED';
  end if;

  if not public.has_role('super_admin'::public.app_role) then
    raise exception using errcode = 'P0001', message = 'SUPER_ADMIN_ROLE_REQUIRED';
  end if;

  if char_length(normalized_reason) < 10 then
    raise exception using errcode = 'P0001', message = 'CORRECTION_REASON_REQUIRED';
  end if;

  if char_length(normalized_reason) > 500 then
    raise exception using errcode = 'P0001', message = 'CORRECTION_REASON_TOO_LONG';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_race_id::text, 0));

  select *
  into selected_race
  from public.races
  where id = p_race_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'RACE_NOT_FOUND';
  end if;

  if selected_race.status <> 'published'::public.race_status then
    raise exception using errcode = 'P0001', message = 'PUBLISHED_RACE_REQUIRED';
  end if;

  select jsonb_object_agg(question.question_key, official.answer_value order by question.question_number)
  into previous_answers
  from public.official_answers as official
  join public.race_questions as question on question.id = official.question_id
  where question.race_id = p_race_id
    and question.is_active = true;

  select max(version)
  into previous_version
  from public.scoring_runs
  where race_id = p_race_id;

  -- Temporarily withdraw this race inside the same transaction. If any later
  -- validation or scoring step fails, PostgreSQL rolls the entire change back.
  update public.races
  set status = 'locked'::public.race_status,
      updated_at = now()
  where id = p_race_id;

  select public.set_official_answers(p_race_id, p_answers)
  into answer_result;

  if coalesce((answer_result ->> 'changed_answer_count')::integer, 0) = 0 then
    raise exception using errcode = 'P0001', message = 'NO_OFFICIAL_ANSWER_CHANGE';
  end if;

  select public.score_race(p_race_id, 'Published result correction: ' || normalized_reason)
  into scoring_result;

  select public.publish_race_results(p_race_id)
  into publication_result;

  select jsonb_object_agg(question.question_key, official.answer_value order by question.question_number)
  into corrected_answers
  from public.official_answers as official
  join public.race_questions as question on question.id = official.question_id
  where question.race_id = p_race_id
    and question.is_active = true;

  insert into public.published_result_corrections (
    race_id,
    corrected_by,
    reason,
    previous_answers,
    corrected_answers,
    previous_score_version,
    corrected_score_version
  ) values (
    p_race_id,
    requesting_user_id,
    normalized_reason,
    previous_answers,
    corrected_answers,
    previous_version,
    (scoring_result ->> 'version')::integer
  );

  return jsonb_build_object(
    'race_id', p_race_id,
    'status', publication_result ->> 'status',
    'changed_answer_count', (answer_result ->> 'changed_answer_count')::integer,
    'previous_score_version', previous_version,
    'corrected_score_version', (scoring_result ->> 'version')::integer,
    'scored_entry_count', (scoring_result ->> 'scored_entry_count')::integer,
    'published_score_count', (publication_result ->> 'published_score_count')::integer
  );
end;
$$;

revoke all on table public.published_result_corrections from public, anon, authenticated;
grant select on table public.published_result_corrections to authenticated;
grant all on table public.published_result_corrections to service_role;

revoke all on function public.correct_published_race_results(uuid, jsonb, text) from public, anon;
grant execute on function public.correct_published_race_results(uuid, jsonb, text) to authenticated, service_role;

comment on table public.published_result_corrections is
  'Immutable audit records for Super Admin corrections to previously published race results.';
comment on function public.correct_published_race_results(uuid, jsonb, text) is
  'Atomically corrects, rescores, audits, and republishes a published race. Super Admin only.';

notify pgrst, 'reload schema';
