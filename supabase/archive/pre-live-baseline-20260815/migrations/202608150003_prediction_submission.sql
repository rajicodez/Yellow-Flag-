create or replace function public.submit_prediction(
  p_race_slug text,
  p_competition text,
  p_answers jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  requesting_user_id uuid := auth.uid();
  requesting_role text;
  race_record public.races%rowtype;
  entry_id uuid;
  active_question_count integer;
  required_question_count integer;
  invalid_count integer;
  duplicate_group text;
  server_now timestamptz;
begin
  if requesting_user_id is null then
    raise exception using errcode = 'P0001', message = 'AUTHENTICATION_REQUIRED';
  end if;

  if p_race_slug is null or trim(p_race_slug) = '' then
    raise exception using errcode = 'P0001', message = 'RACE_SLUG_REQUIRED';
  end if;

  select *
  into race_record
  from public.races
  where slug = p_race_slug
  for share;

  if not found then
    raise exception using errcode = 'P0001', message = 'RACE_NOT_FOUND';
  end if;

  server_now := clock_timestamp();

  if race_record.status <> 'open' then
    raise exception using errcode = 'P0001', message = 'PREDICTIONS_NOT_OPEN';
  end if;

  if race_record.prediction_opens_at is null
     or race_record.prediction_locks_at is null
     or race_record.fp1_starts_at is null
     or race_record.prediction_locks_at <> race_record.fp1_starts_at then
    raise exception using errcode = 'P0001', message = 'RACE_SCHEDULE_INCOMPLETE';
  end if;

  if server_now < race_record.prediction_opens_at then
    raise exception using errcode = 'P0001', message = 'PREDICTIONS_NOT_OPEN';
  end if;

  if server_now >= race_record.prediction_locks_at then
    raise exception using errcode = 'P0001', message = 'PREDICTION_LOCKED';
  end if;

  select role
  into requesting_role
  from public.profiles
  where id = requesting_user_id;

  if requesting_role is null then
    raise exception using errcode = 'P0001', message = 'PROFILE_REQUIRED';
  end if;

  if p_competition is null or p_competition not in ('fan', 'host') then
    raise exception using errcode = 'P0001', message = 'INVALID_COMPETITION';
  end if;

  if p_competition = 'host' and requesting_role <> 'host' then
    raise exception using errcode = 'P0001', message = 'HOST_COMPETITION_FORBIDDEN';
  end if;

  -- A host is entered into the fan competition only when the caller explicitly
  -- sends p_competition = 'fan'. No name, email, or client flag grants host access.
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then
    raise exception using errcode = 'P0001', message = 'ANSWERS_MUST_BE_AN_OBJECT';
  end if;

  select
    count(*),
    count(*) filter (where required)
  into active_question_count, required_question_count
  from public.race_questions
  where race_id = race_record.id
    and active;

  if active_question_count <> 7 or required_question_count <> 7 then
    raise exception using errcode = 'P0001', message = 'RACE_QUESTION_CONFIGURATION_INVALID';
  end if;

  if jsonb_object_length(p_answers) <> active_question_count then
    raise exception using errcode = 'P0001', message = 'EXACTLY_SEVEN_ANSWERS_REQUIRED';
  end if;

  select count(*)
  into invalid_count
  from jsonb_each_text(p_answers) as submitted(question_key, answer_value)
  left join public.race_questions as question
    on question.race_id = race_record.id
   and question.question_key = submitted.question_key
   and question.active
  where question.id is null;

  if invalid_count > 0 then
    raise exception using errcode = 'P0001', message = 'UNKNOWN_OR_INACTIVE_QUESTION';
  end if;

  select count(*)
  into invalid_count
  from public.race_questions as question
  where question.race_id = race_record.id
    and question.active
    and question.required
    and not (p_answers ? question.question_key);

  if invalid_count > 0 then
    raise exception using errcode = 'P0001', message = 'REQUIRED_ANSWER_MISSING';
  end if;

  select count(*)
  into invalid_count
  from jsonb_each_text(p_answers) as submitted(question_key, answer_value)
  join public.race_questions as question
    on question.race_id = race_record.id
   and question.question_key = submitted.question_key
   and question.active
  left join public.answer_options as answer_option
    on answer_option.question_id = question.id
   and answer_option.value = submitted.answer_value
   and answer_option.entity_type = question.question_type
   and answer_option.active
  where answer_option.id is null;

  if invalid_count > 0 then
    raise exception using errcode = 'P0001', message = 'INVALID_ANSWER_OPTION';
  end if;

  select question.answer_group
  into duplicate_group
  from jsonb_each_text(p_answers) as submitted(question_key, answer_value)
  join public.race_questions as question
    on question.race_id = race_record.id
   and question.question_key = submitted.question_key
   and question.active
  where question.answer_group is not null
  group by question.answer_group, submitted.answer_value
  having count(*) > 1
  limit 1;

  if duplicate_group is not null then
    raise exception using errcode = 'P0001', message = 'DUPLICATE_GROUP_ANSWER';
  end if;

  -- Re-read wall-clock time immediately before the write. PostgreSQL now()
  -- is transaction-start time, so it is intentionally not used here.
  server_now := clock_timestamp();
  if server_now >= race_record.prediction_locks_at then
    raise exception using errcode = 'P0001', message = 'PREDICTION_LOCKED';
  end if;

  insert into public.prediction_entries (
    race_id,
    user_id,
    competition,
    status,
    submitted_at,
    locked_at,
    score,
    scored_at
  )
  values (
    race_record.id,
    requesting_user_id,
    p_competition,
    'submitted',
    server_now,
    race_record.prediction_locks_at,
    null,
    null
  )
  on conflict (race_id, user_id, competition)
  do update set
    status = 'submitted',
    submitted_at = excluded.submitted_at,
    locked_at = excluded.locked_at,
    score = null,
    scored_at = null
  returning id into entry_id;

  insert into public.prediction_answers (
    race_id,
    entry_id,
    question_id,
    answer_value,
    awarded_points
  )
  select
    race_record.id,
    entry_id,
    question.id,
    submitted.answer_value,
    null
  from jsonb_each_text(p_answers) as submitted(question_key, answer_value)
  join public.race_questions as question
    on question.race_id = race_record.id
   and question.question_key = submitted.question_key
   and question.active
  on conflict (entry_id, question_id)
  do update set
    answer_value = excluded.answer_value,
    awarded_points = null;

  delete from public.prediction_answers as saved_answer
  where saved_answer.entry_id = entry_id
    and not exists (
      select 1
      from public.race_questions as active_question
      where active_question.id = saved_answer.question_id
        and active_question.race_id = race_record.id
        and active_question.active
    );

  return jsonb_build_object(
    'entry_id', entry_id,
    'race_id', race_record.id,
    'competition', p_competition,
    'status', 'submitted',
    'submitted_at', server_now,
    'prediction_locks_at', race_record.prediction_locks_at,
    'answer_count', active_question_count
  );
end;
$$;

revoke all on function public.submit_prediction(text, text, jsonb) from public, anon;
grant execute on function public.submit_prediction(text, text, jsonb) to authenticated;

comment on function public.submit_prediction(text, text, jsonb) is
  'The only client write path for predictions. Validates identity, role, server time, all seven answers, options, and grouped uniqueness in one transaction.';
