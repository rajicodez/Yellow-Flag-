create or replace function public.audit_official_answer_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  audit_race_id uuid;
  audit_question_id uuid;
  audit_actor uuid;
begin
  audit_race_id := case when tg_op = 'DELETE' then old.race_id else new.race_id end;
  audit_question_id := case when tg_op = 'DELETE' then old.question_id else new.question_id end;
  audit_actor := case
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
    audit_race_id,
    audit_question_id,
    case when tg_op in ('UPDATE', 'DELETE') then old.answer_value end,
    case when tg_op in ('INSERT', 'UPDATE') then new.answer_value end,
    lower(tg_op),
    audit_actor
  );

  -- Correcting a published answer hides the current leaderboard until an
  -- administrator creates a new, fully audited scoring version.
  if tg_op = 'DELETE'
     or (tg_op = 'UPDATE' and old.answer_value is distinct from new.answer_value) then
    update public.races
    set status = 'completed',
        results_published_at = null
    where id = audit_race_id
      and status = 'scored';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists audit_official_answer_change on public.official_answers;
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
set search_path = public, pg_temp
as $$
declare
  requesting_user_id uuid := auth.uid();
  invalid_count integer;
  changed_count integer;
begin
  if requesting_user_id is null then
    raise exception using errcode = 'P0001', message = 'AUTHENTICATION_REQUIRED';
  end if;

  if not public.is_prediction_admin() then
    raise exception using errcode = 'P0001', message = 'ADMIN_ROLE_REQUIRED';
  end if;

  if not exists (select 1 from public.races where id = p_race_id) then
    raise exception using errcode = 'P0001', message = 'RACE_NOT_FOUND';
  end if;

  if p_answers is null
     or jsonb_typeof(p_answers) <> 'object'
     or jsonb_object_length(p_answers) = 0 then
    raise exception using errcode = 'P0001', message = 'OFFICIAL_ANSWERS_OBJECT_REQUIRED';
  end if;

  select count(*)
  into invalid_count
  from jsonb_each_text(p_answers) as submitted(question_key, answer_value)
  left join public.race_questions as question
    on question.race_id = p_race_id
   and question.question_key = submitted.question_key
   and question.active
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
   and question.active
  left join public.answer_options as answer_option
    on answer_option.question_id = question.id
   and answer_option.value = submitted.answer_value
   and answer_option.entity_type = question.question_type
   and answer_option.active
  where answer_option.id is null;

  if invalid_count > 0 then
    raise exception using errcode = 'P0001', message = 'INVALID_OFFICIAL_ANSWER_OPTION';
  end if;

  insert into public.official_answers (
    race_id,
    question_id,
    answer_value,
    entered_by
  )
  select
    p_race_id,
    question.id,
    submitted.answer_value,
    requesting_user_id
  from jsonb_each_text(p_answers) as submitted(question_key, answer_value)
  join public.race_questions as question
    on question.race_id = p_race_id
   and question.question_key = submitted.question_key
   and question.active
  on conflict (race_id, question_id)
  do update set
    answer_value = excluded.answer_value,
    entered_by = excluded.entered_by
  where official_answers.answer_value is distinct from excluded.answer_value;

  get diagnostics changed_count = row_count;

  return jsonb_build_object(
    'race_id', p_race_id,
    'changed_answer_count', changed_count,
    'submitted_answer_count', jsonb_object_length(p_answers)
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
set search_path = public, pg_temp
as $$
declare
  requesting_user_id uuid := auth.uid();
  race_record public.races%rowtype;
  run_id uuid;
  next_version integer;
  question_count integer;
  official_count integer;
  invalid_entry_count integer;
  scored_entry_count integer;
  fan_entry_count integer;
  host_entry_count integer;
  completed_time timestamptz;
begin
  if requesting_user_id is null then
    raise exception using errcode = 'P0001', message = 'AUTHENTICATION_REQUIRED';
  end if;

  if not public.is_prediction_admin() then
    raise exception using errcode = 'P0001', message = 'ADMIN_ROLE_REQUIRED';
  end if;

  if p_notes is not null and char_length(p_notes) > 1000 then
    raise exception using errcode = 'P0001', message = 'SCORING_NOTES_TOO_LONG';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_race_id::text, 0));

  select *
  into race_record
  from public.races
  where id = p_race_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'RACE_NOT_FOUND';
  end if;

  if race_record.status not in ('completed', 'scored') then
    raise exception using errcode = 'P0001', message = 'RACE_NOT_READY_FOR_SCORING';
  end if;

  -- Hold question and official-answer rows stable for the transaction.
  perform 1
  from public.race_questions
  where race_id = p_race_id and active
  for share;

  perform 1
  from public.official_answers
  where race_id = p_race_id
  for share;

  select count(*)
  into question_count
  from public.race_questions
  where race_id = p_race_id and active;

  if question_count <> 7 then
    raise exception using errcode = 'P0001', message = 'RACE_QUESTION_CONFIGURATION_INVALID';
  end if;

  select count(*)
  into official_count
  from public.official_answers as official_answer
  join public.race_questions as question
    on question.id = official_answer.question_id
   and question.race_id = official_answer.race_id
  where official_answer.race_id = p_race_id
    and question.active;

  if official_count <> question_count then
    raise exception using errcode = 'P0001', message = 'OFFICIAL_ANSWERS_INCOMPLETE';
  end if;

  select count(*)
  into invalid_entry_count
  from (
    select entry.id
    from public.prediction_entries as entry
    left join public.prediction_answers as answer
      on answer.entry_id = entry.id
    left join public.race_questions as question
      on question.id = answer.question_id
     and question.race_id = entry.race_id
     and question.active
    where entry.race_id = p_race_id
    group by entry.id
    having count(question.id) <> question_count
  ) as invalid_entries;

  if invalid_entry_count > 0 then
    raise exception using errcode = 'P0001', message = 'INCOMPLETE_ENTRY_FOUND';
  end if;

  select coalesce(max(version), 0) + 1
  into next_version
  from public.score_runs
  where race_id = p_race_id;

  insert into public.score_runs (
    race_id,
    version,
    status,
    started_by,
    notes
  )
  values (
    p_race_id,
    next_version,
    'running',
    requesting_user_id,
    p_notes
  )
  returning id into run_id;

  insert into public.score_breakdown (
    score_run_id,
    race_id,
    entry_id,
    question_id,
    predicted_value,
    official_value,
    awarded_points
  )
  select
    run_id,
    p_race_id,
    entry.id,
    question.id,
    prediction_answer.answer_value,
    official_answer.answer_value,
    case
      when prediction_answer.answer_value = official_answer.answer_value then 1
      else 0
    end
  from public.prediction_entries as entry
  join public.prediction_answers as prediction_answer
    on prediction_answer.entry_id = entry.id
   and prediction_answer.race_id = entry.race_id
  join public.race_questions as question
    on question.id = prediction_answer.question_id
   and question.race_id = entry.race_id
   and question.active
  join public.official_answers as official_answer
    on official_answer.race_id = entry.race_id
   and official_answer.question_id = question.id
  where entry.race_id = p_race_id;

  update public.prediction_answers
  set awarded_points = null
  where race_id = p_race_id;

  update public.prediction_answers as prediction_answer
  set awarded_points = case
    when prediction_answer.answer_value = official_answer.answer_value then 1
    else 0
  end
  from public.official_answers as official_answer
  join public.race_questions as question
    on question.id = official_answer.question_id
   and question.race_id = official_answer.race_id
   and question.active
  where prediction_answer.race_id = p_race_id
    and official_answer.race_id = prediction_answer.race_id
    and official_answer.question_id = prediction_answer.question_id;

  completed_time := clock_timestamp();

  with totals as (
    select
      entry.id,
      coalesce(sum(prediction_answer.awarded_points), 0)::smallint as score
    from public.prediction_entries as entry
    join public.prediction_answers as prediction_answer
      on prediction_answer.entry_id = entry.id
    join public.race_questions as question
      on question.id = prediction_answer.question_id
     and question.race_id = entry.race_id
     and question.active
    where entry.race_id = p_race_id
    group by entry.id
  )
  update public.prediction_entries as entry
  set status = 'scored',
      score = totals.score,
      scored_at = completed_time
  from totals
  where entry.id = totals.id;

  get diagnostics scored_entry_count = row_count;

  update public.score_runs
  set status = 'completed',
      completed_at = completed_time
  where id = run_id;

  update public.races
  set status = 'scored',
      results_published_at = completed_time
  where id = p_race_id;

  select
    count(*) filter (where competition = 'fan'),
    count(*) filter (where competition = 'host')
  into fan_entry_count, host_entry_count
  from public.prediction_entries
  where race_id = p_race_id
    and status = 'scored';

  return jsonb_build_object(
    'score_run_id', run_id,
    'race_id', p_race_id,
    'version', next_version,
    'status', 'completed',
    'scored_entry_count', scored_entry_count,
    'fan_entry_count', fan_entry_count,
    'host_entry_count', host_entry_count,
    'completed_at', completed_time
  );
end;
$$;

revoke all on function public.audit_official_answer_change() from public, anon, authenticated;
revoke all on function public.set_official_answers(uuid, jsonb) from public, anon;
revoke all on function public.score_race(uuid, text) from public, anon;
grant execute on function public.set_official_answers(uuid, jsonb) to authenticated;
grant execute on function public.score_race(uuid, text) to authenticated;

comment on function public.set_official_answers(uuid, jsonb) is
  'Admin-only validated official-answer upsert. Every material change is audited.';
comment on function public.score_race(uuid, text) is
  'Admin-only transactional, versioned scoring of fan and host entries. Exact match equals one point.';
