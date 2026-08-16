-- Add exact per-question answer allow-lists to the reconciled live prediction schema.
--
-- This migration targets the production-compatible schema captured on 2026-08-15:
--   races.opens_at / closes_at
--   race_questions.question_key / answer_type / is_active
--   prediction_entries.competition public.prediction_competition ('user', 'host')
--   prediction_answers(entry_id, question_id, answer_value)
--
-- It is additive and does not change race timestamps or existing predictions.

begin;

do $migration_guard$
declare
  missing_columns text[];
  submission_function oid;
begin
  select array_agg(format('%I.%I', expected.table_name, expected.column_name)
                   order by expected.table_name, expected.column_name)
  into missing_columns
  from (values
    ('races', 'id'),
    ('races', 'slug'),
    ('races', 'opens_at'),
    ('races', 'closes_at'),
    ('races', 'status'),
    ('race_questions', 'id'),
    ('race_questions', 'race_id'),
    ('race_questions', 'question_number'),
    ('race_questions', 'question_key'),
    ('race_questions', 'answer_type'),
    ('race_questions', 'is_active'),
    ('prediction_entries', 'id'),
    ('prediction_entries', 'race_id'),
    ('prediction_entries', 'user_id'),
    ('prediction_entries', 'competition'),
    ('prediction_answers', 'entry_id'),
    ('prediction_answers', 'question_id'),
    ('prediction_answers', 'answer_value'),
    ('host_profiles', 'user_id')
  ) as expected(table_name, column_name)
  where not exists (
    select 1
    from information_schema.columns as actual
    where actual.table_schema = 'public'
      and actual.table_name = expected.table_name
      and actual.column_name = expected.column_name
  );

  if missing_columns is not null then
    raise exception using
      errcode = 'P0001',
      message = format(
        'LIVE_SCHEMA_RECONCILIATION_REQUIRED: missing columns: %s',
        array_to_string(missing_columns, ', ')
      );
  end if;

  if not exists (
    select 1
    from pg_type as enum_type
    join pg_namespace as enum_schema on enum_schema.oid = enum_type.typnamespace
    where enum_schema.nspname = 'public'
      and enum_type.typname = 'prediction_answer_type'
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'LIVE_SCHEMA_RECONCILIATION_REQUIRED: public.prediction_answer_type is missing';
  end if;

  if (
    select array_agg(enum_value.enumlabel::text order by enum_value.enumsortorder)
    from pg_type as enum_type
    join pg_enum as enum_value on enum_value.enumtypid = enum_type.oid
    join pg_namespace as enum_schema on enum_schema.oid = enum_type.typnamespace
    where enum_schema.nspname = 'public'
      and enum_type.typname = 'prediction_answer_type'
  ) <> array['driver', 'constructor']::text[] then
    raise exception using
      errcode = 'P0001',
      message = 'LIVE_SCHEMA_RECONCILIATION_REQUIRED: unexpected prediction_answer_type values';
  end if;

  if (
    select array_agg(enum_value.enumlabel::text order by enum_value.enumsortorder)
    from pg_type as enum_type
    join pg_enum as enum_value on enum_value.enumtypid = enum_type.oid
    join pg_namespace as enum_schema on enum_schema.oid = enum_type.typnamespace
    where enum_schema.nspname = 'public'
      and enum_type.typname = 'prediction_competition'
  ) <> array['user', 'host']::text[] then
    raise exception using
      errcode = 'P0001',
      message = 'LIVE_SCHEMA_RECONCILIATION_REQUIRED: unexpected prediction_competition values';
  end if;

  submission_function := to_regprocedure(
    'public.submit_prediction(text,public.prediction_competition,jsonb)'
  );

  if submission_function is null then
    raise exception using
      errcode = 'P0001',
      message = 'LIVE_SCHEMA_RECONCILIATION_REQUIRED: submit_prediction signature is missing';
  end if;

  if not (
    select procedure.prosecdef
      and coalesce(procedure.proconfig, array[]::text[]) @> array['search_path=""']::text[]
    from pg_proc as procedure
    where procedure.oid = submission_function
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'LIVE_SCHEMA_RECONCILIATION_REQUIRED: submit_prediction security settings differ';
  end if;

  if (
    select pg_get_function_result(submission_function)
  ) <> 'TABLE(entry_id uuid, submitted_at timestamp with time zone)' then
    raise exception using
      errcode = 'P0001',
      message = 'LIVE_SCHEMA_RECONCILIATION_REQUIRED: submit_prediction return type differs';
  end if;

  if not exists (
    select 1
    from public.races
    where races.slug = '2026-dutch-grand-prix'
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'LIVE_SCHEMA_RECONCILIATION_REQUIRED: Dutch GP race is missing';
  end if;

  if (
    select array_agg(questions.question_key order by questions.question_key)
    from public.race_questions as questions
    join public.races as race on race.id = questions.race_id
    where race.slug = '2026-dutch-grand-prix'
      and questions.is_active = true
  ) <> array[
    'driver_of_the_day',
    'p2_finisher',
    'p3_finisher',
    'pole_position',
    'race_winner',
    'top_constructor',
    'worst_constructor'
  ]::text[] then
    raise exception using
      errcode = 'P0001',
      message = 'LIVE_SCHEMA_RECONCILIATION_REQUIRED: Dutch GP active question keys differ';
  end if;

  if exists (
    select 1
    from public.race_questions as questions
    join public.races as race on race.id = questions.race_id
    where race.slug = '2026-dutch-grand-prix'
      and questions.is_active = true
      and (
        (questions.question_key in (
          'pole_position', 'race_winner', 'p2_finisher',
          'p3_finisher', 'driver_of_the_day'
        ) and questions.answer_type <> 'driver'::public.prediction_answer_type)
        or
        (questions.question_key in ('top_constructor', 'worst_constructor')
          and questions.answer_type <> 'constructor'::public.prediction_answer_type)
      )
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'LIVE_SCHEMA_RECONCILIATION_REQUIRED: Dutch GP answer types differ';
  end if;
end;
$migration_guard$;

create table if not exists public.race_question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null
    references public.race_questions(id) on delete cascade,
  option_value text not null
    check (length(btrim(option_value)) > 0),
  option_label text not null
    check (length(btrim(option_label)) > 0),
  option_type public.prediction_answer_type not null,
  sort_order integer not null
    check (sort_order > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint race_question_options_question_value_key
    unique (question_id, option_value),
  constraint race_question_options_question_sort_key
    unique (question_id, sort_order)
);

comment on table public.race_question_options is
  'Server-authoritative allowed answer values for an individual race question.';
comment on column public.race_question_options.option_value is
  'Exact value accepted by submit_prediction for this question.';
comment on column public.race_question_options.option_label is
  'Display label corresponding to option_value.';

create index if not exists race_question_options_active_question_sort_idx
  on public.race_question_options(question_id, sort_order)
  where is_active = true;

alter table public.race_question_options enable row level security;

create or replace function public.is_prediction_question_visible(
  p_question_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.race_questions as question
    join public.races as race on race.id = question.race_id
    where question.id = p_question_id
      and question.is_active = true
      and race.status <> 'draft'::public.race_status
  );
$function$;

revoke all on function public.is_prediction_question_visible(uuid) from public;
grant execute on function public.is_prediction_question_visible(uuid) to anon, authenticated;

revoke all on table public.race_question_options from public, anon, authenticated;
grant select on table public.race_question_options to anon, authenticated;

drop policy if exists race_question_options_select_visible
  on public.race_question_options;
create policy race_question_options_select_visible
on public.race_question_options
for select
to anon, authenticated
using (
  is_active = true
  and public.is_prediction_question_visible(question_id)
);

with driver_options(sort_order, option_value) as (
  values
    (1, 'Lando Norris'),
    (2, 'Max Verstappen'),
    (3, 'Oscar Piastri'),
    (4, 'George Russell'),
    (5, 'Charles Leclerc'),
    (6, 'Lewis Hamilton'),
    (7, 'Kimi Antonelli'),
    (8, 'Alex Albon'),
    (9, 'Carlos Sainz'),
    (10, 'Fernando Alonso'),
    (11, 'Nico Hulkenberg'),
    (12, 'Isack Hadjar'),
    (13, 'Ollie Bearman'),
    (14, 'Liam Lawson'),
    (15, 'Esteban Ocon'),
    (16, 'Lance Stroll'),
    (17, 'Pierre Gasly'),
    (18, 'Gabriel Bortoleto'),
    (19, 'Franco Colapinto'),
    (20, 'Arvid Lindblad'),
    (21, 'Sergio Perez'),
    (22, 'Valtteri Bottas')
), driver_questions as (
  select question.id
  from public.race_questions as question
  join public.races as race on race.id = question.race_id
  where race.slug = '2026-dutch-grand-prix'
    and question.is_active = true
    and question.question_key in (
      'pole_position',
      'race_winner',
      'p2_finisher',
      'p3_finisher',
      'driver_of_the_day'
    )
)
insert into public.race_question_options (
  question_id,
  option_value,
  option_label,
  option_type,
  sort_order,
  is_active
)
select
  driver_questions.id,
  driver_options.option_value,
  driver_options.option_value,
  'driver'::public.prediction_answer_type,
  driver_options.sort_order,
  true
from driver_questions
cross join driver_options
on conflict (question_id, option_value) do update set
  option_label = excluded.option_label,
  option_type = excluded.option_type,
  sort_order = excluded.sort_order,
  is_active = true;

with constructor_options(sort_order, option_value) as (
  values
    (1, 'McLaren Formula 1 Team'),
    (2, 'Mercedes-AMG Petronas F1 Team'),
    (3, 'Oracle Red Bull Racing'),
    (4, 'Scuderia Ferrari HP'),
    (5, 'Atlassian Williams Racing'),
    (6, 'Visa Cash App Racing Bulls'),
    (7, 'Aston Martin Aramco F1 Team'),
    (8, 'TGR Haas F1 Team'),
    (9, 'Audi Revolut F1 Team'),
    (10, 'BWT Alpine F1 Team'),
    (11, 'Cadillac Formula 1 Team')
), constructor_questions as (
  select question.id
  from public.race_questions as question
  join public.races as race on race.id = question.race_id
  where race.slug = '2026-dutch-grand-prix'
    and question.is_active = true
    and question.question_key in ('top_constructor', 'worst_constructor')
)
insert into public.race_question_options (
  question_id,
  option_value,
  option_label,
  option_type,
  sort_order,
  is_active
)
select
  constructor_questions.id,
  constructor_options.option_value,
  constructor_options.option_value,
  'constructor'::public.prediction_answer_type,
  constructor_options.sort_order,
  true
from constructor_questions
cross join constructor_options
on conflict (question_id, option_value) do update set
  option_label = excluded.option_label,
  option_type = excluded.option_type,
  sort_order = excluded.sort_order,
  is_active = true;

do $seed_guard$
begin
  if exists (
    select 1
    from public.race_questions as question
    join public.races as race on race.id = question.race_id
    left join public.race_question_options as option
      on option.question_id = question.id
     and option.is_active = true
    where race.slug = '2026-dutch-grand-prix'
      and question.is_active = true
    group by question.id, question.answer_type
    having count(option.id) <> case question.answer_type
      when 'driver'::public.prediction_answer_type then 22
      when 'constructor'::public.prediction_answer_type then 11
    end
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'DUTCH_GP_OPTION_SEED_INVALID: unexpected active option count';
  end if;

  if exists (
    select 1
    from public.prediction_answers as answer
    join public.prediction_entries as entry on entry.id = answer.entry_id
    join public.races as race on race.id = entry.race_id
    left join public.race_question_options as option
      on option.question_id = answer.question_id
     and option.option_value = answer.answer_value
     and option.is_active = true
    where race.slug = '2026-dutch-grand-prix'
      and option.id is null
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'EXISTING_PREDICTION_OPTION_MISMATCH: migration stopped before function replacement';
  end if;
end;
$seed_guard$;

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
  'Authenticated prediction upsert with server timing, host authorization, exact seven-question completeness, and exact active per-question option validation before writes.';

commit;
