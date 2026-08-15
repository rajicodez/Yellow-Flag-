-- Run against a disposable local/staging database containing the reconciled
-- live schema plus 202608150006_race_question_option_validation.sql.
-- The transaction rolls back the synthetic auth user and prediction fixtures.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(28);

select has_table(
  'public',
  'race_question_options',
  'race_question_options exists'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.race_question_options'::regclass),
  'RLS is enabled on race_question_options'
);
select ok(
  has_table_privilege('anon', 'public.race_question_options', 'SELECT'),
  'anonymous users may read visible active options'
);
select ok(
  has_table_privilege('authenticated', 'public.race_question_options', 'SELECT'),
  'authenticated users may read visible active options'
);
select ok(
  not has_table_privilege('authenticated', 'public.race_question_options', 'INSERT'),
  'authenticated users cannot insert options'
);
select ok(
  not has_table_privilege('authenticated', 'public.race_question_options', 'UPDATE'),
  'authenticated users cannot update options'
);
select ok(
  not has_table_privilege('authenticated', 'public.race_question_options', 'DELETE'),
  'authenticated users cannot delete options'
);
select is(
  (
    select count(*)
    from public.race_question_options as option
    join public.race_questions as question on question.id = option.question_id
    join public.races as race on race.id = question.race_id
    where race.slug = '2026-dutch-grand-prix'
      and option.is_active = true
  ),
  132::bigint,
  'Dutch GP has 110 driver and 22 constructor option rows'
);
select is(
  (
    select count(*)
    from (
      select question.id
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
    ) as invalid_question
  ),
  0::bigint,
  'every active Dutch GP question has the expected option count'
);
select is(
  (
    select count(*)
    from public.prediction_answers as answer
    join public.prediction_entries as entry on entry.id = answer.entry_id
    join public.races as race on race.id = entry.race_id
    left join public.race_question_options as option
      on option.question_id = answer.question_id
     and option.option_value = answer.answer_value
     and option.is_active = true
    where race.slug = '2026-dutch-grand-prix'
      and option.id is null
  ),
  0::bigint,
  'existing Dutch GP answers all match active allowed options'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.submit_prediction(text,public.prediction_competition,jsonb)',
    'EXECUTE'
  ),
  'anonymous users cannot execute submit_prediction'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.submit_prediction(text,public.prediction_competition,jsonb)',
    'EXECUTE'
  ),
  'authenticated users can execute submit_prediction'
);
select ok(
  (
    select procedure.prosecdef
      and coalesce(procedure.proconfig, array[]::text[]) @> array['search_path=""']::text[]
    from pg_proc as procedure
    where procedure.oid = to_regprocedure(
      'public.submit_prediction(text,public.prediction_competition,jsonb)'
    )
  ),
  'submit_prediction remains SECURITY DEFINER with an empty search_path'
);

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values (
  '00000000-0000-0000-0000-000000000000',
  'f1000000-0000-0000-0000-000000000006',
  'authenticated',
  'authenticated',
  'option-validation@example.test',
  '',
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Option Validation Fan"}',
  now(),
  now()
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'f1000000-0000-0000-0000-000000000006',
  true
);

select lives_ok(
  $$
    select *
    from public.submit_prediction(
      '2026-dutch-grand-prix',
      'user'::public.prediction_competition,
      '{
        "pole_position":"Lando Norris",
        "race_winner":"Max Verstappen",
        "p2_finisher":"Oscar Piastri",
        "p3_finisher":"George Russell",
        "driver_of_the_day":"Charles Leclerc",
        "top_constructor":"McLaren Formula 1 Team",
        "worst_constructor":"Cadillac Formula 1 Team"
      }'::jsonb
    )
  $$,
  'A. valid Fan submission with seven legitimate values succeeds'
);

reset role;

select is(
  (
    select count(*)
    from public.prediction_entries as entry
    join public.races as race on race.id = entry.race_id
    where race.slug = '2026-dutch-grand-prix'
      and entry.user_id = 'f1000000-0000-0000-0000-000000000006'
      and entry.competition = 'user'::public.prediction_competition
  ),
  1::bigint,
  'A/K. valid submission creates exactly one entry'
);
select is(
  (
    select count(*)
    from public.prediction_answers as answer
    join public.prediction_entries as entry on entry.id = answer.entry_id
    where entry.user_id = 'f1000000-0000-0000-0000-000000000006'
      and entry.competition = 'user'::public.prediction_competition
  ),
  7::bigint,
  'A/L. valid submission creates exactly seven answers'
);

create temp table yf_original_entry on commit drop as
select entry.id
from public.prediction_entries as entry
join public.races as race on race.id = entry.race_id
where race.slug = '2026-dutch-grand-prix'
  and entry.user_id = 'f1000000-0000-0000-0000-000000000006'
  and entry.competition = 'user'::public.prediction_competition;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'f1000000-0000-0000-0000-000000000006',
  true
);

select lives_ok(
  $$
    select *
    from public.submit_prediction(
      '2026-dutch-grand-prix',
      'user'::public.prediction_competition,
      '{
        "pole_position":"Lewis Hamilton",
        "race_winner":"Max Verstappen",
        "p2_finisher":"Oscar Piastri",
        "p3_finisher":"George Russell",
        "driver_of_the_day":"Charles Leclerc",
        "top_constructor":"McLaren Formula 1 Team",
        "worst_constructor":"Cadillac Formula 1 Team"
      }'::jsonb
    )
  $$,
  'B. valid edit before FP1 succeeds'
);

reset role;

select is(
  (
    select count(*)
    from public.prediction_entries as entry
    join public.races as race on race.id = entry.race_id
    where race.slug = '2026-dutch-grand-prix'
      and entry.user_id = 'f1000000-0000-0000-0000-000000000006'
      and entry.competition = 'user'::public.prediction_competition
  ),
  1::bigint,
  'B/K. edit keeps exactly one entry'
);
select is(
  (
    select entry.id
    from public.prediction_entries as entry
    join public.races as race on race.id = entry.race_id
    where race.slug = '2026-dutch-grand-prix'
      and entry.user_id = 'f1000000-0000-0000-0000-000000000006'
      and entry.competition = 'user'::public.prediction_competition
  ),
  (select id from yf_original_entry),
  'B. edit updates the same prediction_entries row'
);
select is(
  (
    select answer.answer_value
    from public.prediction_answers as answer
    join public.prediction_entries as entry on entry.id = answer.entry_id
    join public.race_questions as question on question.id = answer.question_id
    where entry.user_id = 'f1000000-0000-0000-0000-000000000006'
      and entry.competition = 'user'::public.prediction_competition
      and question.question_key = 'pole_position'
  ),
  'Lewis Hamilton',
  'B. edit replaces the selected answer'
);
select is(
  (
    select count(*)
    from public.prediction_answers as answer
    join public.prediction_entries as entry on entry.id = answer.entry_id
    where entry.user_id = 'f1000000-0000-0000-0000-000000000006'
      and entry.competition = 'user'::public.prediction_competition
  ),
  7::bigint,
  'B/L. edit keeps exactly seven answers'
);

create temp table yf_expected_state on commit drop as
select
  entry.id,
  entry.submitted_at,
  entry.updated_at,
  jsonb_object_agg(question.question_key, answer.answer_value) as answers
from public.prediction_entries as entry
join public.prediction_answers as answer on answer.entry_id = entry.id
join public.race_questions as question on question.id = answer.question_id
where entry.user_id = 'f1000000-0000-0000-0000-000000000006'
  and entry.competition = 'user'::public.prediction_competition
group by entry.id, entry.submitted_at, entry.updated_at;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'f1000000-0000-0000-0000-000000000006',
  true
);

select throws_ok(
  $$
    select * from public.submit_prediction(
      '2026-dutch-grand-prix', 'user'::public.prediction_competition,
      '{"pole_position":"Lewis Hamilton","race_winner":"Batman","p2_finisher":"Oscar Piastri","p3_finisher":"George Russell","driver_of_the_day":"Charles Leclerc","top_constructor":"McLaren Formula 1 Team","worst_constructor":"Cadillac Formula 1 Team"}'::jsonb
    )
  $$,
  'P0001',
  'Invalid answer for question: race_winner',
  'C. fake race winner is rejected'
);
select throws_ok(
  $$
    select * from public.submit_prediction(
      '2026-dutch-grand-prix', 'user'::public.prediction_competition,
      '{"pole_position":"Lewis Hamilton","race_winner":"McLaren Formula 1 Team","p2_finisher":"Oscar Piastri","p3_finisher":"George Russell","driver_of_the_day":"Charles Leclerc","top_constructor":"McLaren Formula 1 Team","worst_constructor":"Cadillac Formula 1 Team"}'::jsonb
    )
  $$,
  'P0001',
  'Invalid answer for question: race_winner',
  'D. a valid constructor is rejected for race_winner'
);
select throws_ok(
  $$
    select * from public.submit_prediction(
      '2026-dutch-grand-prix', 'user'::public.prediction_competition,
      '{"pole_position":"Lewis Hamilton","race_winner":"Max Verstappen","p2_finisher":"Oscar Piastri","p3_finisher":"George Russell","driver_of_the_day":"Charles Leclerc","top_constructor":"Lewis Hamilton","worst_constructor":"Cadillac Formula 1 Team"}'::jsonb
    )
  $$,
  'P0001',
  'Invalid answer for question: top_constructor',
  'E. a valid driver is rejected for top_constructor'
);
select throws_ok(
  $$
    select * from public.submit_prediction(
      '2026-dutch-grand-prix', 'user'::public.prediction_competition,
      '{"pole_position":"Lewis Hamilton","race_winner":"Max Verstappen","p2_finisher":"Oscar Piastri","p3_finisher":"George Russell","driver_of_the_day":"Charles Leclerc","top_constructor":"McLaren Formula 1 Team","worst_constructor":"Wayne Enterprises"}'::jsonb
    )
  $$,
  'P0001',
  'Invalid answer for question: worst_constructor',
  'F. an unknown constructor is rejected'
);
select throws_ok(
  $$
    select * from public.submit_prediction(
      '2026-dutch-grand-prix', 'user'::public.prediction_competition,
      '{"pole_position":"Lewis Hamilton","race_winner":"Max Verstappen","p2_finisher":"Oscar Piastri","p3_finisher":"George Russell","driver_of_the_day":"Charles Leclerc","top_constructor":"McLaren Formula 1 Team"}'::jsonb
    )
  $$,
  'P0001',
  'All seven questions must be answered.',
  'G. a missing answer is rejected'
);
select throws_ok(
  $$
    select * from public.submit_prediction(
      '2026-dutch-grand-prix', 'user'::public.prediction_competition,
      '{"pole_position":"Lewis Hamilton","race_winner":"Max Verstappen","p2_finisher":"Oscar Piastri","p3_finisher":"George Russell","driver_of_the_day":"Charles Leclerc","top_constructor":"McLaren Formula 1 Team","worst_constructor":"Cadillac Formula 1 Team","unknown_question":"Batman"}'::jsonb
    )
  $$,
  'P0001',
  'All seven questions must be answered.',
  'H. an eighth unknown question key is rejected'
);

reset role;

select ok(
  (
    select jsonb_build_object(
      'id', entry.id,
      'submitted_at', entry.submitted_at,
      'updated_at', entry.updated_at,
      'answers', jsonb_object_agg(question.question_key, answer.answer_value)
    )
    from public.prediction_entries as entry
    join public.prediction_answers as answer on answer.entry_id = entry.id
    join public.race_questions as question on question.id = answer.question_id
    where entry.user_id = 'f1000000-0000-0000-0000-000000000006'
      and entry.competition = 'user'::public.prediction_competition
    group by entry.id, entry.submitted_at, entry.updated_at
  ) = (
    select jsonb_build_object(
      'id', expected.id,
      'submitted_at', expected.submitted_at,
      'updated_at', expected.updated_at,
      'answers', expected.answers
    )
    from yf_expected_state as expected
  ),
  'I. rejected submissions leave the entry and all seven answers unchanged'
);

select * from finish();

rollback;
