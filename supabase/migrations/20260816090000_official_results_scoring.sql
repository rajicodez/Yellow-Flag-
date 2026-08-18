-- Live-compatible official results, scoring, and leaderboard backend.
-- This migration builds forward from 20260815213203_live_production_baseline.sql.

create or replace function public.is_prediction_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    public.has_role('admin'::public.app_role)
    or public.has_role('super_admin'::public.app_role);
$$;

create table public.official_answers (
  question_id uuid primary key references public.race_questions(id) on delete cascade,
  answer_value text not null check (length(btrim(answer_value)) > 0),
  entered_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.official_answer_history (
  id uuid primary key default gen_random_uuid(),
  race_id uuid not null references public.races(id) on delete cascade,
  question_id uuid not null references public.race_questions(id) on delete cascade,
  previous_answer_value text,
  new_answer_value text,
  action text not null check (action in ('insert', 'update', 'delete')),
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now()
);

create table public.scoring_runs (
  id uuid primary key default gen_random_uuid(),
  race_id uuid not null references public.races(id) on delete cascade,
  version integer not null check (version > 0),
  input_fingerprint text not null check (length(input_fingerprint) = 64),
  scored_by uuid not null references auth.users(id) on delete restrict,
  scored_entry_count integer not null check (scored_entry_count >= 0),
  notes text check (notes is null or length(notes) <= 1000),
  completed_at timestamptz not null default now(),
  unique (race_id, version),
  unique (race_id, input_fingerprint)
);

create table public.score_breakdown (
  score_run_id uuid not null references public.scoring_runs(id) on delete cascade,
  entry_id uuid not null references public.prediction_entries(id) on delete cascade,
  question_id uuid not null references public.race_questions(id) on delete cascade,
  predicted_value text not null,
  official_value text not null,
  awarded_points smallint not null check (awarded_points in (0, 1)),
  primary key (score_run_id, entry_id, question_id)
);

create table public.prediction_scores (
  entry_id uuid primary key references public.prediction_entries(id) on delete cascade,
  score_run_id uuid not null references public.scoring_runs(id) on delete cascade,
  score smallint not null check (score between 0 and 7),
  scored_at timestamptz not null default now()
);

create index official_answer_history_race_changed_idx
  on public.official_answer_history (race_id, changed_at desc);
create index scoring_runs_race_completed_idx
  on public.scoring_runs (race_id, completed_at desc);
create index score_breakdown_entry_idx
  on public.score_breakdown (entry_id);
create index prediction_scores_run_idx
  on public.prediction_scores (score_run_id);

alter table public.official_answers enable row level security;
alter table public.official_answer_history enable row level security;
alter table public.scoring_runs enable row level security;
alter table public.score_breakdown enable row level security;
alter table public.prediction_scores enable row level security;

create policy official_answers_admin_select
on public.official_answers
for select
to authenticated
using (public.is_prediction_admin());

create policy official_answer_history_admin_select
on public.official_answer_history
for select
to authenticated
using (public.is_prediction_admin());

create policy scoring_runs_admin_select
on public.scoring_runs
for select
to authenticated
using (public.is_prediction_admin());

create policy score_breakdown_admin_select
on public.score_breakdown
for select
to authenticated
using (public.is_prediction_admin());

create policy prediction_scores_admin_select
on public.prediction_scores
for select
to authenticated
using (public.is_prediction_admin());

create policy prediction_entries_admin_select
on public.prediction_entries
for select
to authenticated
using (public.is_prediction_admin());

create policy prediction_answers_admin_select
on public.prediction_answers
for select
to authenticated
using (public.is_prediction_admin());

create or replace function public.set_official_answer_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.audit_official_answer_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_question_id uuid;
  affected_race_id uuid;
  actor_id uuid;
begin
  affected_question_id := case when tg_op = 'DELETE' then old.question_id else new.question_id end;

  select question.race_id
  into affected_race_id
  from public.race_questions as question
  where question.id = affected_question_id;

  actor_id := case
    when tg_op = 'DELETE' then coalesce(auth.uid(), old.entered_by)
    else coalesce(auth.uid(), new.entered_by)
  end;

  if tg_op = 'UPDATE' and old.answer_value is not distinct from new.answer_value then
    return new;
  end if;

  insert into public.official_answer_history (
    race_id,
    question_id,
    previous_answer_value,
    new_answer_value,
    action,
    changed_by
  )
  values (
    affected_race_id,
    affected_question_id,
    case when tg_op in ('UPDATE', 'DELETE') then old.answer_value end,
    case when tg_op in ('INSERT', 'UPDATE') then new.answer_value end,
    lower(tg_op),
    actor_id
  );

  if tg_op = 'DELETE'
     or (tg_op = 'UPDATE' and old.answer_value is distinct from new.answer_value) then
    delete from public.prediction_scores as score
    using public.prediction_entries as entry
    where score.entry_id = entry.id
      and entry.race_id = affected_race_id;

    update public.races
    set status = 'locked'::public.race_status,
        updated_at = now()
    where id = affected_race_id
      and status in ('scored'::public.race_status, 'published'::public.race_status);
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create trigger set_official_answer_updated_at
before update on public.official_answers
for each row execute function public.set_official_answer_updated_at();

create trigger audit_official_answer_change
after insert or update or delete on public.official_answers
for each row execute function public.audit_official_answer_change();

create or replace function public.set_official_answers(
  p_race_id uuid,
  p_answers jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  requesting_user_id uuid := auth.uid();
  selected_race public.races%rowtype;
  active_question_count integer;
  invalid_count integer;
  changed_count integer;
begin
  if requesting_user_id is null then
    raise exception using errcode = 'P0001', message = 'AUTHENTICATION_REQUIRED';
  end if;

  if not public.is_prediction_admin() then
    raise exception using errcode = 'P0001', message = 'ADMIN_ROLE_REQUIRED';
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

  if selected_race.status = 'draft'::public.race_status then
    raise exception using errcode = 'P0001', message = 'RACE_NOT_READY_FOR_RESULTS';
  end if;

  if selected_race.status = 'published'::public.race_status then
    raise exception using errcode = 'P0001', message = 'PUBLISHED_RESULTS_IMMUTABLE';
  end if;

  if now() < selected_race.closes_at then
    raise exception using errcode = 'P0001', message = 'PREDICTIONS_NOT_CLOSED';
  end if;

  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then
    raise exception using errcode = 'P0001', message = 'OFFICIAL_ANSWERS_OBJECT_REQUIRED';
  end if;

  select count(*)
  into active_question_count
  from public.race_questions
  where race_id = p_race_id
    and is_active = true;

  if active_question_count <> 7 then
    raise exception using errcode = 'P0001', message = 'RACE_QUESTION_CONFIGURATION_INVALID';
  end if;

  if public.jsonb_object_length(p_answers) <> active_question_count then
    raise exception using errcode = 'P0001', message = 'ALL_SEVEN_OFFICIAL_ANSWERS_REQUIRED';
  end if;

  select count(*)
  into invalid_count
  from jsonb_each_text(p_answers) as submitted(question_key, answer_value)
  left join public.race_questions as question
    on question.race_id = p_race_id
   and question.question_key = submitted.question_key
   and question.is_active = true
  where question.id is null;

  if invalid_count > 0 then
    raise exception using errcode = 'P0001', message = 'UNKNOWN_OR_INACTIVE_QUESTION';
  end if;

  select count(*)
  into invalid_count
  from jsonb_each_text(p_answers) as submitted(question_key, answer_value)
  join public.race_questions as question
    on question.race_id = p_race_id
   and question.question_key = submitted.question_key
   and question.is_active = true
  left join public.race_question_options as option
    on option.question_id = question.id
   and option.option_value = submitted.answer_value
   and option.option_type = question.answer_type
   and option.is_active = true
  where option.id is null;

  if invalid_count > 0 then
    raise exception using errcode = 'P0001', message = 'INVALID_OFFICIAL_ANSWER_OPTION';
  end if;

  if (p_answers ->> 'race_winner') = (p_answers ->> 'p2_finisher')
     or (p_answers ->> 'race_winner') = (p_answers ->> 'p3_finisher')
     or (p_answers ->> 'p2_finisher') = (p_answers ->> 'p3_finisher') then
    raise exception using errcode = 'P0001', message = 'PODIUM_DRIVERS_MUST_BE_DISTINCT';
  end if;

  insert into public.official_answers (
    question_id,
    answer_value,
    entered_by
  )
  select
    question.id,
    submitted.answer_value,
    requesting_user_id
  from jsonb_each_text(p_answers) as submitted(question_key, answer_value)
  join public.race_questions as question
    on question.race_id = p_race_id
   and question.question_key = submitted.question_key
   and question.is_active = true
  on conflict (question_id)
  do update set
    answer_value = excluded.answer_value,
    entered_by = excluded.entered_by
  where official_answers.answer_value is distinct from excluded.answer_value;

  get diagnostics changed_count = row_count;

  update public.races
  set status = 'locked'::public.race_status,
      updated_at = now()
  where id = p_race_id
    and status = 'open'::public.race_status;

  return jsonb_build_object(
    'race_id', p_race_id,
    'changed_answer_count', changed_count,
    'submitted_answer_count', active_question_count,
    'race_status', (select status::text from public.races where id = p_race_id)
  );
end;
$$;

create or replace function public.score_race(
  p_race_id uuid,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  requesting_user_id uuid := auth.uid();
  selected_race public.races%rowtype;
  active_question_count integer;
  official_answer_count integer;
  invalid_entry_count integer;
  entry_count integer;
  current_fingerprint text;
  selected_run public.scoring_runs%rowtype;
  next_version integer;
  completed_time timestamptz := clock_timestamp();
begin
  if requesting_user_id is null then
    raise exception using errcode = 'P0001', message = 'AUTHENTICATION_REQUIRED';
  end if;

  if not public.is_prediction_admin() then
    raise exception using errcode = 'P0001', message = 'ADMIN_ROLE_REQUIRED';
  end if;

  if p_notes is not null and length(p_notes) > 1000 then
    raise exception using errcode = 'P0001', message = 'SCORING_NOTES_TOO_LONG';
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

  if selected_race.status not in (
    'locked'::public.race_status,
    'scored'::public.race_status
  ) then
    raise exception using errcode = 'P0001', message = 'RACE_NOT_READY_FOR_SCORING';
  end if;

  if now() < selected_race.closes_at then
    raise exception using errcode = 'P0001', message = 'PREDICTIONS_NOT_CLOSED';
  end if;

  select count(*)
  into active_question_count
  from public.race_questions
  where race_id = p_race_id
    and is_active = true;

  if active_question_count <> 7 then
    raise exception using errcode = 'P0001', message = 'RACE_QUESTION_CONFIGURATION_INVALID';
  end if;

  select count(*)
  into official_answer_count
  from public.official_answers as official
  join public.race_questions as question on question.id = official.question_id
  where question.race_id = p_race_id
    and question.is_active = true;

  if official_answer_count <> active_question_count then
    raise exception using errcode = 'P0001', message = 'OFFICIAL_ANSWERS_INCOMPLETE';
  end if;

  select count(*)
  into invalid_entry_count
  from (
    select entry.id
    from public.prediction_entries as entry
    left join public.prediction_answers as answer on answer.entry_id = entry.id
    left join public.race_questions as question
      on question.id = answer.question_id
     and question.race_id = entry.race_id
     and question.is_active = true
    where entry.race_id = p_race_id
    group by entry.id
    having count(question.id) <> active_question_count
  ) as invalid_entry;

  if invalid_entry_count > 0 then
    raise exception using errcode = 'P0001', message = 'INCOMPLETE_ENTRY_FOUND';
  end if;

  select count(*)
  into entry_count
  from public.prediction_entries
  where race_id = p_race_id;

  select encode(
    extensions.digest(
      coalesce((
        select string_agg(
          question.id::text || '=' || official.answer_value,
          '|' order by question.id
        )
        from public.official_answers as official
        join public.race_questions as question on question.id = official.question_id
        where question.race_id = p_race_id
          and question.is_active = true
      ), '') || '||' || coalesce((
        select string_agg(
          entry.id::text || ':' || answer.question_id::text || '=' || answer.answer_value,
          '|' order by entry.id, answer.question_id
        )
        from public.prediction_entries as entry
        join public.prediction_answers as answer on answer.entry_id = entry.id
        where entry.race_id = p_race_id
      ), ''),
      'sha256'
    ),
    'hex'
  )
  into current_fingerprint;

  select *
  into selected_run
  from public.scoring_runs
  where race_id = p_race_id
    and input_fingerprint = current_fingerprint;

  if found then
    delete from public.prediction_scores as score
    using public.prediction_entries as entry
    where score.entry_id = entry.id
      and entry.race_id = p_race_id;

    insert into public.prediction_scores (entry_id, score_run_id, score, scored_at)
    select
      breakdown.entry_id,
      selected_run.id,
      sum(breakdown.awarded_points)::smallint,
      selected_run.completed_at
    from public.score_breakdown as breakdown
    where breakdown.score_run_id = selected_run.id
    group by breakdown.entry_id
    on conflict (entry_id)
    do update set
      score_run_id = excluded.score_run_id,
      score = excluded.score,
      scored_at = excluded.scored_at;

    update public.races
    set status = 'scored'::public.race_status,
        updated_at = now()
    where id = p_race_id;

    return jsonb_build_object(
      'score_run_id', selected_run.id,
      'race_id', p_race_id,
      'version', selected_run.version,
      'scored_entry_count', selected_run.scored_entry_count,
      'reused', true,
      'completed_at', selected_run.completed_at
    );
  end if;

  select coalesce(max(version), 0) + 1
  into next_version
  from public.scoring_runs
  where race_id = p_race_id;

  insert into public.scoring_runs (
    race_id,
    version,
    input_fingerprint,
    scored_by,
    scored_entry_count,
    notes,
    completed_at
  )
  values (
    p_race_id,
    next_version,
    current_fingerprint,
    requesting_user_id,
    entry_count,
    nullif(btrim(p_notes), ''),
    completed_time
  )
  returning * into selected_run;

  insert into public.score_breakdown (
    score_run_id,
    entry_id,
    question_id,
    predicted_value,
    official_value,
    awarded_points
  )
  select
    selected_run.id,
    entry.id,
    question.id,
    predicted.answer_value,
    official.answer_value,
    case when predicted.answer_value = official.answer_value then 1 else 0 end
  from public.prediction_entries as entry
  join public.prediction_answers as predicted on predicted.entry_id = entry.id
  join public.race_questions as question
    on question.id = predicted.question_id
   and question.race_id = entry.race_id
   and question.is_active = true
  join public.official_answers as official on official.question_id = question.id
  where entry.race_id = p_race_id;

  delete from public.prediction_scores as score
  using public.prediction_entries as entry
  where score.entry_id = entry.id
    and entry.race_id = p_race_id;

  insert into public.prediction_scores (entry_id, score_run_id, score, scored_at)
  select
    breakdown.entry_id,
    selected_run.id,
    sum(breakdown.awarded_points)::smallint,
    completed_time
  from public.score_breakdown as breakdown
  where breakdown.score_run_id = selected_run.id
  group by breakdown.entry_id;

  update public.races
  set status = 'scored'::public.race_status,
      updated_at = now()
  where id = p_race_id;

  return jsonb_build_object(
    'score_run_id', selected_run.id,
    'race_id', p_race_id,
    'version', selected_run.version,
    'scored_entry_count', selected_run.scored_entry_count,
    'reused', false,
    'completed_at', selected_run.completed_at
  );
end;
$$;

create or replace function public.publish_race_results(p_race_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  requesting_user_id uuid := auth.uid();
  selected_race public.races%rowtype;
  entry_count integer;
  score_count integer;
  published_time timestamptz := clock_timestamp();
begin
  if requesting_user_id is null then
    raise exception using errcode = 'P0001', message = 'AUTHENTICATION_REQUIRED';
  end if;

  if not public.is_prediction_admin() then
    raise exception using errcode = 'P0001', message = 'ADMIN_ROLE_REQUIRED';
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

  if selected_race.status = 'published'::public.race_status then
    return jsonb_build_object(
      'race_id', p_race_id,
      'status', 'published',
      'already_published', true
    );
  end if;

  if selected_race.status <> 'scored'::public.race_status then
    raise exception using errcode = 'P0001', message = 'RACE_NOT_SCORED';
  end if;

  select count(*) into entry_count
  from public.prediction_entries
  where race_id = p_race_id;

  select count(*) into score_count
  from public.prediction_scores as score
  join public.prediction_entries as entry on entry.id = score.entry_id
  where entry.race_id = p_race_id;

  if score_count <> entry_count then
    raise exception using errcode = 'P0001', message = 'RACE_SCORES_INCOMPLETE';
  end if;

  update public.races
  set status = 'published'::public.race_status,
      updated_at = published_time
  where id = p_race_id;

  return jsonb_build_object(
    'race_id', p_race_id,
    'status', 'published',
    'already_published', false,
    'published_at', published_time,
    'published_score_count', score_count
  );
end;
$$;

create or replace view public.race_prediction_leaderboard
with (security_barrier = true, security_invoker = false)
as
select
  entry.race_id,
  race.slug as race_slug,
  season.year as season_year,
  entry.competition,
  rank() over (
    partition by entry.race_id, entry.competition
    order by score.score desc
  ) as rank,
  entry.id as entry_id,
  entry.user_id,
  profile.display_name,
  profile.avatar_url,
  score.score,
  entry.submitted_at,
  score.scored_at
from public.prediction_scores as score
join public.prediction_entries as entry on entry.id = score.entry_id
join public.races as race on race.id = entry.race_id
join public.seasons as season on season.id = race.season_id
join public.profiles as profile on profile.id = entry.user_id
where race.status = 'published'::public.race_status;

create or replace view public.season_prediction_leaderboard
with (security_barrier = true, security_invoker = false)
as
with season_totals as (
  select
    season.id as season_id,
    season.year as season_year,
    entry.competition,
    entry.user_id,
    profile.display_name,
    profile.avatar_url,
    count(*)::integer as races_entered,
    sum(score.score)::integer as total_score,
    count(*) filter (where score.score = 7)::integer as score_7_count,
    count(*) filter (where score.score = 6)::integer as score_6_count,
    count(*) filter (where score.score = 5)::integer as score_5_count,
    count(*) filter (where score.score = 4)::integer as score_4_count,
    count(*) filter (where score.score = 3)::integer as score_3_count,
    count(*) filter (where score.score = 2)::integer as score_2_count,
    count(*) filter (where score.score = 1)::integer as score_1_count
  from public.prediction_scores as score
  join public.prediction_entries as entry on entry.id = score.entry_id
  join public.races as race on race.id = entry.race_id
  join public.seasons as season on season.id = race.season_id
  join public.profiles as profile on profile.id = entry.user_id
  where race.status = 'published'::public.race_status
  group by
    season.id,
    season.year,
    entry.competition,
    entry.user_id,
    profile.display_name,
    profile.avatar_url
)
select
  season_id,
  season_year,
  competition,
  rank() over (
    partition by season_id, competition
    order by
      total_score desc,
      score_7_count desc,
      score_6_count desc,
      score_5_count desc,
      score_4_count desc,
      score_3_count desc,
      score_2_count desc,
      score_1_count desc
  ) as rank,
  user_id,
  display_name,
  avatar_url,
  races_entered,
  total_score,
  score_7_count,
  score_6_count,
  score_5_count,
  score_4_count,
  score_3_count,
  score_2_count,
  score_1_count
from season_totals;

revoke all on function public.is_prediction_admin() from public, anon;
revoke all on function public.set_official_answer_updated_at() from public, anon, authenticated;
revoke all on function public.audit_official_answer_change() from public, anon, authenticated;
revoke all on function public.set_official_answers(uuid, jsonb) from public, anon;
revoke all on function public.score_race(uuid, text) from public, anon;
revoke all on function public.publish_race_results(uuid) from public, anon;

grant execute on function public.is_prediction_admin() to authenticated, service_role;
grant execute on function public.set_official_answers(uuid, jsonb) to authenticated, service_role;
grant execute on function public.score_race(uuid, text) to authenticated, service_role;
grant execute on function public.publish_race_results(uuid) to authenticated, service_role;

revoke all on table public.official_answers from public, anon, authenticated;
revoke all on table public.official_answer_history from public, anon, authenticated;
revoke all on table public.scoring_runs from public, anon, authenticated;
revoke all on table public.score_breakdown from public, anon, authenticated;
revoke all on table public.prediction_scores from public, anon, authenticated;

grant select on table public.official_answers to authenticated;
grant select on table public.official_answer_history to authenticated;
grant select on table public.scoring_runs to authenticated;
grant select on table public.score_breakdown to authenticated;
grant select on table public.prediction_scores to authenticated;
grant all on table public.official_answers to service_role;
grant all on table public.official_answer_history to service_role;
grant all on table public.scoring_runs to service_role;
grant all on table public.score_breakdown to service_role;
grant all on table public.prediction_scores to service_role;

revoke all on table public.race_prediction_leaderboard from public, anon;
revoke all on table public.season_prediction_leaderboard from public, anon;
grant select on table public.race_prediction_leaderboard to authenticated, service_role;
grant select on table public.season_prediction_leaderboard to authenticated, service_role;

-- Normalize broad table privileges inherited by production before the live
-- baseline was captured. PostgREST does not need these capabilities.
revoke references, trigger, truncate on table public.host_profiles from anon, authenticated;
revoke references, trigger, truncate on table public.prediction_answers from anon, authenticated;
revoke references, trigger, truncate on table public.prediction_entries from anon, authenticated;
revoke references, trigger, truncate on table public.profiles from anon, authenticated;
revoke references, trigger, truncate on table public.race_question_options from anon, authenticated;
revoke references, trigger, truncate on table public.race_questions from anon, authenticated;
revoke references, trigger, truncate on table public.races from anon, authenticated;
revoke references, trigger, truncate on table public.seasons from anon, authenticated;
revoke references, trigger, truncate on table public.user_roles from anon, authenticated;

comment on function public.set_official_answers(uuid, jsonb) is
  'Admin-only exact seven-answer upsert after the FP1 prediction deadline.';
comment on function public.score_race(uuid, text) is
  'Admin-only transactional and idempotent scoring. Exact matches receive one point.';
comment on function public.publish_race_results(uuid) is
  'Admin-only publication of a complete scored race.';
comment on view public.race_prediction_leaderboard is
  'Published race standings partitioned into user and host competitions; ties share rank.';
comment on view public.season_prediction_leaderboard is
  'Published season standings ranked by total then score frequencies from 7/7 through 1/7.';
