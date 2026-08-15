-- Require three distinct submitted drivers for race winner, P2, and P3.
--
-- This function-only migration is guarded against the exact submit_prediction
-- definition captured from production on 2026-08-15. It does not alter tables,
-- race timestamps, question options, or existing prediction data.

begin;

do $migration_guard$
declare
  submission_function oid;
  live_definition text;
begin
  submission_function := to_regprocedure(
    'public.submit_prediction(text,public.prediction_competition,jsonb)'
  );

  if submission_function is null then
    raise exception using
      errcode = 'P0001',
      message = 'LIVE_SUBMIT_PREDICTION_MISMATCH: expected function signature is missing';
  end if;

  select pg_get_functiondef(procedure.oid)
  into live_definition
  from pg_proc as procedure
  where procedure.oid = submission_function;

  if md5(live_definition) <> 'faaad203c5e8da2bd48d462e58f30d0a' then
    raise exception using
      errcode = 'P0001',
      message = format(
        'LIVE_SUBMIT_PREDICTION_MISMATCH: expected faaad203c5e8da2bd48d462e58f30d0a, found %s',
        md5(live_definition)
      );
  end if;

  if (
    select pg_get_function_result(submission_function)
  ) <> 'TABLE(entry_id uuid, submitted_at timestamp with time zone)' then
    raise exception using
      errcode = 'P0001',
      message = 'LIVE_SUBMIT_PREDICTION_MISMATCH: return type differs';
  end if;

  if not (
    select procedure.prosecdef
      and coalesce(procedure.proconfig, array[]::text[]) @> array['search_path=""']::text[]
    from pg_proc as procedure
    where procedure.oid = submission_function
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'LIVE_SUBMIT_PREDICTION_MISMATCH: security settings differ';
  end if;

  if not has_function_privilege('authenticated', submission_function, 'EXECUTE')
     or has_function_privilege('anon', submission_function, 'EXECUTE')
     or has_function_privilege('public', submission_function, 'EXECUTE') then
    raise exception using
      errcode = 'P0001',
      message = 'LIVE_SUBMIT_PREDICTION_MISMATCH: execute grants differ';
  end if;

  if to_regclass('public.race_question_options') is null then
    raise exception using
      errcode = 'P0001',
      message = 'LIVE_SUBMIT_PREDICTION_MISMATCH: race_question_options is missing';
  end if;
end;
$migration_guard$;

create or replace function public.submit_prediction(
  p_race_slug text,
  p_competition public.prediction_competition,
  p_answers jsonb
)
returns table(entry_id uuid, submitted_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  current_user_id uuid;
  selected_race public.races%rowtype;
  saved_entry_id uuid;
  saved_submission_time timestamptz;
  required_question_count integer;
  invalid_question_key text;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Authentication is required to submit a prediction.';
  end if;

  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then
    raise exception 'Prediction answers must be a JSON object.';
  end if;

  select *
  into selected_race
  from public.races
  where slug = p_race_slug;

  if not found then
    raise exception 'Race not found.';
  end if;

  if selected_race.status <> 'open' then
    raise exception 'Predictions are not open for this race.';
  end if;

  if now() < selected_race.opens_at then
    raise exception 'Predictions have not opened yet.';
  end if;

  if now() >= selected_race.closes_at then
    raise exception 'The prediction deadline has passed.';
  end if;

  if p_competition = 'host' then
    if not (
      public.has_role('host'::public.app_role)
      and exists (
        select 1
        from public.host_profiles
        where host_profiles.user_id = current_user_id
      )
    ) then
      raise exception 'This account is not authorized for host predictions.';
    end if;
  end if;

  select count(*)
  into required_question_count
  from public.race_questions
  where race_id = selected_race.id
    and is_active = true;

  if required_question_count <> 7 then
    raise exception 'This race does not have exactly seven active questions.';
  end if;

  if public.jsonb_object_length(p_answers) <> required_question_count then
    raise exception 'All seven questions must be answered.';
  end if;

  if exists (
    select 1
    from public.race_questions
    where race_id = selected_race.id
      and is_active = true
      and (
        not (p_answers ? question_key)
        or nullif(btrim(p_answers ->> question_key), '') is null
      )
  ) then
    raise exception 'One or more required answers are missing.';
  end if;

  select question.question_key
  into invalid_question_key
  from public.race_questions as question
  where question.race_id = selected_race.id
    and question.is_active = true
    and not exists (
      select 1
      from public.race_question_options as option
      where option.question_id = question.id
        and option.option_value = p_answers ->> question.question_key
        and option.is_active = true
    )
  order by question.question_number
  limit 1;

  if invalid_question_key is not null then
    raise exception 'Invalid answer for question: %', invalid_question_key;
  end if;

  if btrim(p_answers ->> 'race_winner') = btrim(p_answers ->> 'p2_finisher')
     or btrim(p_answers ->> 'race_winner') = btrim(p_answers ->> 'p3_finisher')
     or btrim(p_answers ->> 'p2_finisher') = btrim(p_answers ->> 'p3_finisher') then
    raise exception 'Winner, P2 and P3 must be three different drivers.';
  end if;

  saved_submission_time := now();

  insert into public.prediction_entries (
    race_id,
    user_id,
    competition,
    status,
    submitted_at,
    updated_at
  )
  values (
    selected_race.id,
    current_user_id,
    p_competition,
    'submitted',
    saved_submission_time,
    saved_submission_time
  )
  on conflict (race_id, user_id, competition)
  do update set
    status = 'submitted',
    submitted_at = excluded.submitted_at,
    updated_at = excluded.updated_at
  returning id into saved_entry_id;

  delete from public.prediction_answers
  where prediction_answers.entry_id = saved_entry_id;

  insert into public.prediction_answers (
    entry_id,
    question_id,
    answer_value,
    created_at,
    updated_at
  )
  select
    saved_entry_id,
    race_questions.id,
    btrim(p_answers ->> race_questions.question_key),
    saved_submission_time,
    saved_submission_time
  from public.race_questions
  where race_questions.race_id = selected_race.id
    and race_questions.is_active = true;

  return query
  select saved_entry_id, saved_submission_time;
end;
$function$;

revoke all on function public.submit_prediction(
  text,
  public.prediction_competition,
  jsonb
) from public, anon;
grant execute on function public.submit_prediction(
  text,
  public.prediction_competition,
  jsonb
) to authenticated;

comment on function public.submit_prediction(
  text,
  public.prediction_competition,
  jsonb
) is
  'Authenticated prediction upsert with server timing, host authorization, exact option validation, and distinct winner/P2/P3 enforcement before writes.';

commit;
