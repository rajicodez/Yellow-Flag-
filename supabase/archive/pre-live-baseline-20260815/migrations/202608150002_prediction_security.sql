create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select role
  from public.profiles
  where id = auth.uid()
$$;

create or replace function public.is_prediction_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(public.current_profile_role() = 'admin', false)
$$;

create or replace function public.set_profile_role(
  p_user_id uuid,
  p_role text
)
returns public.profiles
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  updated_profile public.profiles;
begin
  if auth.uid() is null then
    raise exception using errcode = 'P0001', message = 'AUTHENTICATION_REQUIRED';
  end if;

  if not public.is_prediction_admin() then
    raise exception using errcode = 'P0001', message = 'ADMIN_ROLE_REQUIRED';
  end if;

  if p_role not in ('fan', 'host', 'admin') then
    raise exception using errcode = 'P0001', message = 'INVALID_PROFILE_ROLE';
  end if;

  update public.profiles
  set role = p_role
  where id = p_user_id
  returning * into updated_profile;

  if updated_profile.id is null then
    raise exception using errcode = 'P0001', message = 'PROFILE_NOT_FOUND';
  end if;

  return updated_profile;
end;
$$;

create or replace function public.validate_answer_option_type()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  expected_type text;
begin
  select question_type
  into expected_type
  from public.race_questions
  where id = new.question_id;

  if expected_type is null then
    raise exception using errcode = '23503', message = 'QUESTION_NOT_FOUND';
  end if;

  if new.entity_type <> expected_type then
    raise exception using errcode = '23514', message = 'ANSWER_OPTION_TYPE_MISMATCH';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_answer_option_type on public.answer_options;
create trigger validate_answer_option_type
before insert or update of question_id, entity_type on public.answer_options
for each row execute function public.validate_answer_option_type();

alter table public.profiles enable row level security;
alter table public.races enable row level security;
alter table public.race_questions enable row level security;
alter table public.answer_options enable row level security;
alter table public.prediction_entries enable row level security;
alter table public.prediction_answers enable row level security;
alter table public.official_answers enable row level security;
alter table public.official_answer_history enable row level security;
alter table public.score_runs enable row level security;
alter table public.score_breakdown enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.races from anon, authenticated;
revoke all on table public.race_questions from anon, authenticated;
revoke all on table public.answer_options from anon, authenticated;
revoke all on table public.prediction_entries from anon, authenticated;
revoke all on table public.prediction_answers from anon, authenticated;
revoke all on table public.official_answers from anon, authenticated;
revoke all on table public.official_answer_history from anon, authenticated;
revoke all on table public.score_runs from anon, authenticated;
revoke all on table public.score_breakdown from anon, authenticated;

grant usage on schema public to anon, authenticated;

grant select on public.races, public.race_questions, public.answer_options to anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, avatar_url) on public.profiles to authenticated;
grant select on public.prediction_entries, public.prediction_answers to authenticated;
grant select on public.official_answers, public.official_answer_history to authenticated;
grant select on public.score_runs, public.score_breakdown to authenticated;

grant insert, update, delete on public.races to authenticated;
grant insert, update, delete on public.race_questions to authenticated;
grant insert, update, delete on public.answer_options to authenticated;
grant insert, update, delete on public.official_answers to authenticated;

drop policy if exists profiles_select_self_or_admin on public.profiles;
create policy profiles_select_self_or_admin
on public.profiles for select
to authenticated
using (id = auth.uid() or public.is_prediction_admin());

drop policy if exists profiles_update_self_safe on public.profiles;
create policy profiles_update_self_safe
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists races_read_visible on public.races;
create policy races_read_visible
on public.races for select
to anon, authenticated
using (status <> 'draft' or public.is_prediction_admin());

drop policy if exists races_admin_insert on public.races;
create policy races_admin_insert
on public.races for insert
to authenticated
with check (public.is_prediction_admin());

drop policy if exists races_admin_update on public.races;
create policy races_admin_update
on public.races for update
to authenticated
using (public.is_prediction_admin())
with check (public.is_prediction_admin());

drop policy if exists races_admin_delete on public.races;
create policy races_admin_delete
on public.races for delete
to authenticated
using (public.is_prediction_admin());

drop policy if exists race_questions_read_visible on public.race_questions;
create policy race_questions_read_visible
on public.race_questions for select
to anon, authenticated
using (
  active
  and exists (
    select 1
    from public.races
    where races.id = race_questions.race_id
      and races.status <> 'draft'
  )
  or public.is_prediction_admin()
);

drop policy if exists race_questions_admin_insert on public.race_questions;
create policy race_questions_admin_insert
on public.race_questions for insert
to authenticated
with check (public.is_prediction_admin());

drop policy if exists race_questions_admin_update on public.race_questions;
create policy race_questions_admin_update
on public.race_questions for update
to authenticated
using (public.is_prediction_admin())
with check (public.is_prediction_admin());

drop policy if exists race_questions_admin_delete on public.race_questions;
create policy race_questions_admin_delete
on public.race_questions for delete
to authenticated
using (public.is_prediction_admin());

drop policy if exists answer_options_read_visible on public.answer_options;
create policy answer_options_read_visible
on public.answer_options for select
to anon, authenticated
using (
  active
  and exists (
    select 1
    from public.race_questions
    join public.races on races.id = race_questions.race_id
    where race_questions.id = answer_options.question_id
      and race_questions.active
      and races.status <> 'draft'
  )
  or public.is_prediction_admin()
);

drop policy if exists answer_options_admin_insert on public.answer_options;
create policy answer_options_admin_insert
on public.answer_options for insert
to authenticated
with check (public.is_prediction_admin());

drop policy if exists answer_options_admin_update on public.answer_options;
create policy answer_options_admin_update
on public.answer_options for update
to authenticated
using (public.is_prediction_admin())
with check (public.is_prediction_admin());

drop policy if exists answer_options_admin_delete on public.answer_options;
create policy answer_options_admin_delete
on public.answer_options for delete
to authenticated
using (public.is_prediction_admin());

drop policy if exists prediction_entries_read_own_or_admin on public.prediction_entries;
create policy prediction_entries_read_own_or_admin
on public.prediction_entries for select
to authenticated
using (user_id = auth.uid() or public.is_prediction_admin());

drop policy if exists prediction_answers_read_own_or_admin on public.prediction_answers;
create policy prediction_answers_read_own_or_admin
on public.prediction_answers for select
to authenticated
using (
  exists (
    select 1
    from public.prediction_entries
    where prediction_entries.id = prediction_answers.entry_id
      and prediction_entries.user_id = auth.uid()
  )
  or public.is_prediction_admin()
);

drop policy if exists official_answers_read_after_publish_or_admin on public.official_answers;
create policy official_answers_read_after_publish_or_admin
on public.official_answers for select
to authenticated
using (
  exists (
    select 1
    from public.races
    where races.id = official_answers.race_id
      and races.results_published_at is not null
  )
  or public.is_prediction_admin()
);

drop policy if exists official_answers_admin_insert on public.official_answers;
create policy official_answers_admin_insert
on public.official_answers for insert
to authenticated
with check (public.is_prediction_admin());

drop policy if exists official_answers_admin_update on public.official_answers;
create policy official_answers_admin_update
on public.official_answers for update
to authenticated
using (public.is_prediction_admin())
with check (public.is_prediction_admin());

drop policy if exists official_answers_admin_delete on public.official_answers;
create policy official_answers_admin_delete
on public.official_answers for delete
to authenticated
using (public.is_prediction_admin());

drop policy if exists official_answer_history_admin_read on public.official_answer_history;
create policy official_answer_history_admin_read
on public.official_answer_history for select
to authenticated
using (public.is_prediction_admin());

drop policy if exists score_runs_read_published_or_admin on public.score_runs;
create policy score_runs_read_published_or_admin
on public.score_runs for select
to authenticated
using (
  exists (
    select 1
    from public.races
    where races.id = score_runs.race_id
      and races.results_published_at is not null
  )
  or public.is_prediction_admin()
);

drop policy if exists score_breakdown_read_own_or_admin on public.score_breakdown;
create policy score_breakdown_read_own_or_admin
on public.score_breakdown for select
to authenticated
using (
  (
    exists (
      select 1
      from public.prediction_entries
      join public.races on races.id = prediction_entries.race_id
      where prediction_entries.id = score_breakdown.entry_id
        and prediction_entries.user_id = auth.uid()
        and races.results_published_at is not null
    )
  )
  or public.is_prediction_admin()
);

revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.handle_new_auth_user_prediction_profile() from public, anon, authenticated;
revoke all on function public.current_profile_role() from public, anon, authenticated;
revoke all on function public.is_prediction_admin() from public, anon, authenticated;
revoke all on function public.validate_answer_option_type() from public, anon, authenticated;
revoke all on function public.set_profile_role(uuid, text) from public, anon;
grant execute on function public.is_prediction_admin() to anon, authenticated;
grant execute on function public.set_profile_role(uuid, text) to authenticated;
