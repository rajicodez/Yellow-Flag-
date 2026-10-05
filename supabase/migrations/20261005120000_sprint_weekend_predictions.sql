-- Sprint weekends use the standard seven questions plus Sprint Pole and Sprint Winner.

alter table public.races
  add column if not exists is_sprint_weekend boolean not null default false;

alter table public.race_questions
  drop constraint if exists race_questions_question_number_check;
alter table public.race_questions
  add constraint race_questions_question_number_check
  check (question_number between 1 and 9);

alter table public.prediction_scores
  drop constraint if exists prediction_scores_score_check;
alter table public.prediction_scores
  add constraint prediction_scores_score_check
  check (score between 0 and 9);

create or replace function public.expected_question_count(p_race_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select case when race.is_sprint_weekend then 9 else 7 end
  from public.races as race
  where race.id = p_race_id;
$$;

create or replace function public.admin_set_sprint_weekend(p_race_id uuid, p_is_sprint_weekend boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_race public.races%rowtype;
  configured_question_count integer;
  target_question_count integer;
begin
  if auth.uid() is null or not public.is_prediction_admin() then
    raise exception 'ADMIN_ROLE_REQUIRED';
  end if;

  select * into selected_race
  from public.races
  where id = p_race_id
  for update;

  if not found then raise exception 'RACE_NOT_FOUND'; end if;
  if selected_race.status in ('scored'::public.race_status, 'published'::public.race_status) then
    raise exception 'COMPLETED_RACE_IMMUTABLE';
  end if;
  if selected_race.is_sprint_weekend is distinct from p_is_sprint_weekend
     and exists (select 1 from public.prediction_entries where race_id = p_race_id) then
    raise exception 'SPRINT_FORMAT_LOCKED_AFTER_SUBMISSIONS';
  end if;
  if selected_race.is_sprint_weekend is distinct from p_is_sprint_weekend
     and exists (
       select 1 from public.official_answers as answer
       join public.race_questions as question on question.id = answer.question_id
       where question.race_id = p_race_id
     ) then
    raise exception 'SPRINT_FORMAT_LOCKED_AFTER_RESULTS';
  end if;

  target_question_count := case when p_is_sprint_weekend then 9 else 7 end;
  if selected_race.status = 'open'::public.race_status then
    select count(*)::integer into configured_question_count
    from public.race_questions as question
    where question.race_id = p_race_id
      and question.is_active
      and exists (
        select 1 from public.race_question_options as option
        where option.question_id = question.id and option.is_active
      );
    if configured_question_count <> target_question_count then
      raise exception 'SPRINT_FORMAT_QUESTIONS_REQUIRED_BEFORE_OPEN';
    end if;
  end if;

  update public.races
  set is_sprint_weekend = p_is_sprint_weekend,
      updated_at = now()
  where id = p_race_id;

  return jsonb_build_object(
    'race_id', p_race_id,
    'is_sprint_weekend', p_is_sprint_weekend,
    'expected_question_count', target_question_count
  );
end;
$$;

create or replace function public.admin_save_race_questions_v2(p_race_id uuid, p_questions jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_race public.races%rowtype;
  expected_count integer;
  question_payload jsonb;
  option_payload jsonb;
  saved_question_id uuid;
  active_question_count integer;
  configured_question_count integer;
begin
  if auth.uid() is null or not public.is_prediction_admin() then raise exception 'ADMIN_ROLE_REQUIRED'; end if;

  select * into selected_race from public.races where id = p_race_id for update;
  if not found then raise exception 'RACE_NOT_FOUND'; end if;
  expected_count := case when selected_race.is_sprint_weekend then 9 else 7 end;

  if jsonb_typeof(p_questions) <> 'array' or jsonb_array_length(p_questions) <> expected_count then
    raise exception 'EXPECTED_QUESTION_COUNT_REQUIRED';
  end if;
  if selected_race.status in ('scored'::public.race_status, 'published'::public.race_status) then raise exception 'COMPLETED_RACE_IMMUTABLE'; end if;
  if exists(select 1 from public.prediction_entries where race_id = p_race_id) then raise exception 'RACE_HAS_SUBMISSIONS'; end if;
  if exists(
    select 1 from public.official_answers as answer
    join public.race_questions as question on question.id = answer.question_id
    where question.race_id = p_race_id
  ) then raise exception 'RACE_HAS_OFFICIAL_ANSWERS'; end if;

  if (
    select count(distinct (item ->> 'question_number')::integer)
    from jsonb_array_elements(p_questions) as item
    where (item ->> 'question_number') ~ '^[1-9]$'
  ) <> expected_count then raise exception 'QUESTION_NUMBERS_INVALID'; end if;

  if (
    select count(distinct btrim(item ->> 'question_key'))
    from jsonb_array_elements(p_questions) as item
    where btrim(coalesce(item ->> 'question_key', '')) <> ''
  ) <> expected_count then raise exception 'QUESTION_KEYS_MUST_BE_UNIQUE'; end if;

  if (
    select count(*)
    from jsonb_array_elements(p_questions) as item
    where (item ->> 'question_number', item ->> 'question_key', item ->> 'answer_type') in (
      ('1', 'pole_position', 'driver'),
      ('2', 'race_winner', 'driver'),
      ('3', 'p2_finisher', 'driver'),
      ('4', 'p3_finisher', 'driver'),
      ('5', 'driver_of_the_day', 'driver'),
      ('6', 'top_constructor', 'constructor'),
      ('7', 'worst_constructor', 'constructor'),
      ('8', 'sprint_pole_position', 'driver'),
      ('9', 'sprint_race_winner', 'driver')
    )
  ) <> expected_count then raise exception 'STANDARD_QUESTION_KEYS_AND_TYPES_REQUIRED'; end if;

  delete from public.race_questions where race_id = p_race_id;

  for question_payload in
    select value from jsonb_array_elements(p_questions)
    order by (value ->> 'question_number')::integer
  loop
    if btrim(coalesce(question_payload ->> 'question_text', '')) = '' then raise exception 'QUESTION_TEXT_REQUIRED'; end if;
    if coalesce(question_payload ->> 'answer_type', '') not in ('driver', 'constructor') then raise exception 'INVALID_QUESTION_ANSWER_TYPE'; end if;
    if jsonb_typeof(question_payload -> 'options') <> 'array' or jsonb_array_length(question_payload -> 'options') < 1 then raise exception 'QUESTION_OPTIONS_REQUIRED'; end if;

    insert into public.race_questions (race_id, question_number, question_key, question_text, answer_type, points, is_active)
    values (
      p_race_id,
      (question_payload ->> 'question_number')::integer,
      btrim(question_payload ->> 'question_key'),
      btrim(question_payload ->> 'question_text'),
      (question_payload ->> 'answer_type')::public.prediction_answer_type,
      1,
      coalesce((question_payload ->> 'is_active')::boolean, true)
    ) returning id into saved_question_id;

    for option_payload in
      select value from jsonb_array_elements(question_payload -> 'options')
      order by (value ->> 'sort_order')::integer
    loop
      if btrim(coalesce(option_payload ->> 'option_value', '')) = '' or btrim(coalesce(option_payload ->> 'option_label', '')) = '' then raise exception 'QUESTION_OPTION_VALUE_REQUIRED'; end if;
      insert into public.race_question_options (question_id, option_value, option_label, option_type, sort_order, is_active)
      values (
        saved_question_id,
        btrim(option_payload ->> 'option_value'),
        btrim(option_payload ->> 'option_label'),
        (question_payload ->> 'answer_type')::public.prediction_answer_type,
        (option_payload ->> 'sort_order')::integer,
        coalesce((option_payload ->> 'is_active')::boolean, true)
      );
    end loop;
  end loop;

  select count(*)::integer into active_question_count
  from public.race_questions where race_id = p_race_id and is_active;
  select count(*)::integer into configured_question_count
  from public.race_questions as question
  where question.race_id = p_race_id and question.is_active
    and exists (select 1 from public.race_question_options as option where option.question_id = question.id and option.is_active);

  if active_question_count <> expected_count or configured_question_count <> expected_count then
    raise exception 'ACTIVE_CONFIGURED_QUESTION_COUNT_INVALID';
  end if;

  return jsonb_build_object('race_id', p_race_id, 'question_count', active_question_count);
end;
$$;

create or replace function public.submit_prediction(p_race_slug text, p_competition public.prediction_competition, p_answers jsonb)
returns table(entry_id uuid, submitted_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  selected_race public.races%rowtype;
  saved_entry_id uuid;
  saved_submission_time timestamptz;
  required_question_count integer;
  expected_count integer;
  invalid_question_key text;
begin
  if current_user_id is null then raise exception 'Authentication is required to submit a prediction.'; end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then raise exception 'Prediction answers must be a JSON object.'; end if;

  select * into selected_race from public.races where slug = p_race_slug;
  if not found then raise exception 'Race not found.'; end if;
  if selected_race.status <> 'open' then raise exception 'Predictions are not open for this race.'; end if;
  if now() < selected_race.opens_at then raise exception 'Predictions have not opened yet.'; end if;
  if now() >= selected_race.closes_at then raise exception 'The prediction deadline has passed.'; end if;
  if p_competition = 'host' and not (
    public.has_role('host'::public.app_role)
    and exists (select 1 from public.host_profiles where host_profiles.user_id = current_user_id)
  ) then raise exception 'This account is not authorized for host predictions.'; end if;

  expected_count := case when selected_race.is_sprint_weekend then 9 else 7 end;
  select count(*) into required_question_count
  from public.race_questions where race_id = selected_race.id and is_active;
  if required_question_count <> expected_count then raise exception 'Race question configuration is incomplete.'; end if;
  if public.jsonb_object_length(p_answers) <> required_question_count then raise exception 'All race questions must be answered.'; end if;
  if exists (
    select 1 from public.race_questions
    where race_id = selected_race.id and is_active
      and (not (p_answers ? question_key) or nullif(btrim(p_answers ->> question_key), '') is null)
  ) then raise exception 'One or more required answers are missing.'; end if;

  select question.question_key into invalid_question_key
  from public.race_questions as question
  where question.race_id = selected_race.id and question.is_active
    and not exists (
      select 1 from public.race_question_options as option
      where option.question_id = question.id
        and option.option_value = p_answers ->> question.question_key
        and option.is_active
    )
  order by question.question_number limit 1;
  if invalid_question_key is not null then raise exception 'Invalid answer for question: %', invalid_question_key; end if;

  if btrim(p_answers ->> 'race_winner') = btrim(p_answers ->> 'p2_finisher')
     or btrim(p_answers ->> 'race_winner') = btrim(p_answers ->> 'p3_finisher')
     or btrim(p_answers ->> 'p2_finisher') = btrim(p_answers ->> 'p3_finisher') then
    raise exception 'Winner, P2 and P3 must be three different drivers.';
  end if;

  saved_submission_time := now();
  insert into public.prediction_entries (race_id, user_id, competition, status, submitted_at, updated_at)
  values (selected_race.id, current_user_id, p_competition, 'submitted', saved_submission_time, saved_submission_time)
  on conflict (race_id, user_id, competition) do update
    set status = 'submitted', submitted_at = excluded.submitted_at, updated_at = excluded.updated_at
  returning id into saved_entry_id;

  delete from public.prediction_answers where prediction_answers.entry_id = saved_entry_id;
  insert into public.prediction_answers (entry_id, question_id, answer_value, created_at, updated_at)
  select saved_entry_id, question.id, btrim(p_answers ->> question.question_key), saved_submission_time, saved_submission_time
  from public.race_questions as question
  where question.race_id = selected_race.id and question.is_active;

  return query select saved_entry_id, saved_submission_time;
end;
$$;

-- Existing protected functions only need their fixed seven-count guards made race-aware.
do $$
declare
  definition text;
  previous_definition text;
begin
  select pg_get_functiondef('public.admin_upsert_race(uuid,integer,text,integer,text,text,text,text,timestamptz,timestamptz,timestamptz,public.race_status)'::regprocedure) into definition;
  previous_definition := definition;
  definition := replace(definition, 'active_question_count <> 7 or configured_question_count <> 7', 'active_question_count <> public.expected_question_count(saved_race_id) or configured_question_count <> public.expected_question_count(saved_race_id)');
  if definition = previous_definition then raise exception 'SPRINT_PATCH_FAILED_ADMIN_UPSERT_RACE'; end if;
  execute definition;

  select pg_get_functiondef('public.admin_override_race(uuid,integer,text,integer,text,text,text,text,timestamptz,timestamptz,timestamptz,public.race_status)'::regprocedure) into definition;
  previous_definition := definition;
  definition := replace(definition, 'configured_question_count <> 7', 'configured_question_count <> public.expected_question_count(p_race_id)');
  if definition = previous_definition then raise exception 'SPRINT_PATCH_FAILED_ADMIN_OVERRIDE_RACE'; end if;
  execute definition;

  select pg_get_functiondef('public.admin_open_race_now(uuid)'::regprocedure) into definition;
  previous_definition := definition;
  definition := replace(definition, 'configured_question_count <> 7', 'configured_question_count <> public.expected_question_count(p_race_id)');
  if definition = previous_definition then raise exception 'SPRINT_PATCH_FAILED_ADMIN_OPEN_RACE'; end if;
  execute definition;

  select pg_get_functiondef('public.set_official_answers(uuid,jsonb)'::regprocedure) into definition;
  previous_definition := definition;
  definition := replace(definition, 'active_question_count <> 7', 'active_question_count <> public.expected_question_count(p_race_id)');
  if definition = previous_definition then raise exception 'SPRINT_PATCH_FAILED_OFFICIAL_ANSWERS'; end if;
  execute definition;

  select pg_get_functiondef('public.score_race(uuid,text)'::regprocedure) into definition;
  previous_definition := definition;
  definition := replace(definition, 'active_question_count <> 7', 'active_question_count <> public.expected_question_count(p_race_id)');
  if definition = previous_definition then raise exception 'SPRINT_PATCH_FAILED_SCORE_RACE'; end if;
  execute definition;

  select pg_get_functiondef('public.get_admin_prediction_analytics(uuid,public.prediction_competition)'::regprocedure) into definition;
  previous_definition := definition;
  definition := replace(definition, 'reveal_distributions boolean;', 'reveal_distributions boolean; expected_count integer;');
  definition := replace(definition, 'reveal_distributions := clock_timestamp()', 'expected_count := case when selected_race.is_sprint_weekend then 9 else 7 end; reveal_distributions := clock_timestamp()');
  definition := replace(definition, 'score.score = 7', 'score.score = expected_count');
  definition := replace(definition, 'generate_series(0, 7)', 'generate_series(0, expected_count)');
  if definition = previous_definition
     or position('expected_count integer' in definition) = 0
     or position('generate_series(0, expected_count)' in definition) = 0 then
    raise exception 'SPRINT_PATCH_FAILED_ANALYTICS';
  end if;
  execute definition;
end;
$$;

-- Preserve the public season leaderboard shape while ranking Sprint scores fairly in ties.
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
    count(*) filter (where score.score = 9)::integer as score_9_count,
    count(*) filter (where score.score = 8)::integer as score_8_count,
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
  where race.status = 'published'::public.race_status and not race.is_demo
  group by season.id, season.year, entry.competition, entry.user_id, profile.display_name, profile.avatar_url
)
select
  season_id,
  season_year,
  competition,
  rank() over (
    partition by season_id, competition
    order by total_score desc, score_9_count desc, score_8_count desc,
      score_7_count desc, score_6_count desc, score_5_count desc,
      score_4_count desc, score_3_count desc, score_2_count desc, score_1_count desc
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

do $$
declare
  definition text;
  previous_definition text;
begin
  select pg_get_functiondef('public.get_homepage_season_fan_leaderboard()'::regprocedure) into definition;
  previous_definition := definition;
  definition := replace(
    definition,
    'count(*) filter (where prediction_score.score = 7)::integer as score_7_count,',
    'count(*) filter (where prediction_score.score = 9)::integer as score_9_count, count(*) filter (where prediction_score.score = 8)::integer as score_8_count, count(*) filter (where prediction_score.score = 7)::integer as score_7_count,'
  );
  definition := replace(
    definition,
    'totals.total_score desc,',
    'totals.total_score desc, totals.score_9_count desc, totals.score_8_count desc,'
  );
  if definition = previous_definition or position('score_9_count' in definition) = 0 then
    raise exception 'SPRINT_PATCH_FAILED_HOMEPAGE_SEASON_LEADERBOARD';
  end if;
  execute definition;
end;
$$;

revoke all on function public.expected_question_count(uuid) from public, anon;
grant execute on function public.expected_question_count(uuid) to authenticated, service_role;
revoke all on function public.admin_set_sprint_weekend(uuid, boolean) from public, anon;
grant execute on function public.admin_set_sprint_weekend(uuid, boolean) to authenticated, service_role;
revoke all on function public.admin_save_race_questions_v2(uuid, jsonb) from public, anon;
grant execute on function public.admin_save_race_questions_v2(uuid, jsonb) to authenticated, service_role;
revoke all on function public.submit_prediction(text, public.prediction_competition, jsonb) from public, anon;
grant execute on function public.submit_prediction(text, public.prediction_competition, jsonb) to authenticated, service_role;

comment on column public.races.is_sprint_weekend is 'When true, the race requires Sprint Pole and Sprint Winner in addition to the standard seven questions.';
comment on function public.admin_save_race_questions_v2(uuid, jsonb) is 'Saves the canonical seven-question or nine-question Sprint prediction set.';

notify pgrst, 'reload schema';
