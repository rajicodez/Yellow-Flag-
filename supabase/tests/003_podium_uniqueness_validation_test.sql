-- Run against a disposable or transaction-wrapped database containing the
-- reconciled live schema and migration 202608150007. All fixtures roll back.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(25);

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
select ok(
  position(
    'from public.race_question_options as option' in
    pg_get_functiondef(to_regprocedure(
      'public.submit_prediction(text,public.prediction_competition,jsonb)'
    ))
  ) > 0,
  'valid answer allow-list enforcement remains present'
);
select ok(
  position(
    'Winner, P2 and P3 must be three different drivers.' in
    pg_get_functiondef(to_regprocedure(
      'public.submit_prediction(text,public.prediction_competition,jsonb)'
    ))
  ) > 0,
  'podium uniqueness enforcement is present'
);
select ok(
  (
    select
      position(
        'Winner, P2 and P3 must be three different drivers.' in definition
      ) > position('from public.race_question_options as option' in definition)
      and position(
        'Winner, P2 and P3 must be three different drivers.' in definition
      ) < position('insert into public.prediction_entries' in definition)
    from (
      select pg_get_functiondef(to_regprocedure(
        'public.submit_prediction(text,public.prediction_competition,jsonb)'
      )) as definition
    ) as function_source
  ),
  'podium uniqueness runs after allow-list validation and before entry writes'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.submit_prediction(text,public.prediction_competition,jsonb)',
    'EXECUTE'
  ),
  'L. authenticated can execute submit_prediction'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.submit_prediction(text,public.prediction_competition,jsonb)',
    'EXECUTE'
  ),
  'M. anon cannot execute submit_prediction'
);
select ok(
  not has_function_privilege(
    'public',
    'public.submit_prediction(text,public.prediction_competition,jsonb)',
    'EXECUTE'
  ),
  'PUBLIC cannot execute submit_prediction'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.prediction_entries'::regclass),
  'N. RLS remains enabled on prediction_entries'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.prediction_answers'::regclass),
  'N. RLS remains enabled on prediction_answers'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.race_question_options'::regclass),
  'N. RLS remains enabled on race_question_options'
);
select ok(
  position(
    'if now() >= selected_race.closes_at then' in
    pg_get_functiondef(to_regprocedure(
      'public.submit_prediction(text,public.prediction_competition,jsonb)'
    ))
  ) > 0,
  'K. database-time FP1 deadline check is unchanged'
);
select is(
  (
    select closes_at
    from public.races
    where slug = '2026-dutch-grand-prix'
  ),
  '2026-08-21 10:30:00+00'::timestamptz,
  'K. Dutch GP closes_at remains the verified FP1 timestamp'
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
  'f2000000-0000-0000-0000-000000000007',
  'authenticated',
  'authenticated',
  'podium-validation@example.test',
  '',
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Podium Validation Fan"}',
  now(),
  now()
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'f2000000-0000-0000-0000-000000000007',
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
  'A. three distinct valid podium drivers are accepted'
);

reset role;

select is(
  (
    select count(*)
    from public.prediction_entries as entry
    join public.races as race on race.id = entry.race_id
    where race.slug = '2026-dutch-grand-prix'
      and entry.user_id = 'f2000000-0000-0000-0000-000000000007'
      and entry.competition = 'user'::public.prediction_competition
  ),
  1::bigint,
  'A. valid submission creates exactly one test entry'
);
select is(
  (
    select count(*)
    from public.prediction_answers as answer
    join public.prediction_entries as entry on entry.id = answer.entry_id
    where entry.user_id = 'f2000000-0000-0000-0000-000000000007'
      and entry.competition = 'user'::public.prediction_competition
  ),
  7::bigint,
  'A. valid submission creates exactly seven test answers'
);

create temp table yf_podium_expected_entry on commit drop as
select entry.id, entry.status, entry.submitted_at, entry.updated_at
from public.prediction_entries as entry
join public.races as race on race.id = entry.race_id
where race.slug = '2026-dutch-grand-prix'
  and entry.user_id = 'f2000000-0000-0000-0000-000000000007'
  and entry.competition = 'user'::public.prediction_competition;

create temp table yf_podium_expected_answers on commit drop as
select jsonb_object_agg(question.question_key, answer.answer_value) as answers
from public.prediction_answers as answer
join public.prediction_entries as entry on entry.id = answer.entry_id
join public.race_questions as question on question.id = answer.question_id
where entry.user_id = 'f2000000-0000-0000-0000-000000000007'
  and entry.competition = 'user'::public.prediction_competition;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'f2000000-0000-0000-0000-000000000007',
  true
);

select throws_ok(
  $$select * from public.submit_prediction(
    '2026-dutch-grand-prix', 'user'::public.prediction_competition,
    '{"pole_position":"Lewis Hamilton","race_winner":"Max Verstappen","p2_finisher":"Max Verstappen","p3_finisher":"George Russell","driver_of_the_day":"Charles Leclerc","top_constructor":"McLaren Formula 1 Team","worst_constructor":"Cadillac Formula 1 Team"}'::jsonb
  )$$,
  'P0001',
  'Winner, P2 and P3 must be three different drivers.',
  'B. winner equal to P2 is rejected'
);
select throws_ok(
  $$select * from public.submit_prediction(
    '2026-dutch-grand-prix', 'user'::public.prediction_competition,
    '{"pole_position":"Lewis Hamilton","race_winner":"Max Verstappen","p2_finisher":"Oscar Piastri","p3_finisher":"Max Verstappen","driver_of_the_day":"Charles Leclerc","top_constructor":"McLaren Formula 1 Team","worst_constructor":"Cadillac Formula 1 Team"}'::jsonb
  )$$,
  'P0001',
  'Winner, P2 and P3 must be three different drivers.',
  'C. winner equal to P3 is rejected'
);
select throws_ok(
  $$select * from public.submit_prediction(
    '2026-dutch-grand-prix', 'user'::public.prediction_competition,
    '{"pole_position":"Lewis Hamilton","race_winner":"Max Verstappen","p2_finisher":"Oscar Piastri","p3_finisher":"Oscar Piastri","driver_of_the_day":"Charles Leclerc","top_constructor":"McLaren Formula 1 Team","worst_constructor":"Cadillac Formula 1 Team"}'::jsonb
  )$$,
  'P0001',
  'Winner, P2 and P3 must be three different drivers.',
  'D. P2 equal to P3 is rejected'
);
select throws_ok(
  $$select * from public.submit_prediction(
    '2026-dutch-grand-prix', 'user'::public.prediction_competition,
    '{"pole_position":"Lewis Hamilton","race_winner":"Max Verstappen","p2_finisher":"Max Verstappen","p3_finisher":"Max Verstappen","driver_of_the_day":"Charles Leclerc","top_constructor":"McLaren Formula 1 Team","worst_constructor":"Cadillac Formula 1 Team"}'::jsonb
  )$$,
  'P0001',
  'Winner, P2 and P3 must be three different drivers.',
  'E. winner equal to P2 and P3 is rejected'
);

reset role;

select is(
  (
    select jsonb_build_object(
      'id', entry.id,
      'status', entry.status,
      'submitted_at', entry.submitted_at,
      'updated_at', entry.updated_at
    )
    from public.prediction_entries as entry
    where entry.user_id = 'f2000000-0000-0000-0000-000000000007'
      and entry.competition = 'user'::public.prediction_competition
  ),
  (
    select jsonb_build_object(
      'id', expected.id,
      'status', expected.status,
      'submitted_at', expected.submitted_at,
      'updated_at', expected.updated_at
    )
    from yf_podium_expected_entry as expected
  ),
  'F. rejected duplicate podium requests leave the saved entry unchanged'
);
select is(
  (
    select jsonb_object_agg(question.question_key, answer.answer_value)
    from public.prediction_answers as answer
    join public.prediction_entries as entry on entry.id = answer.entry_id
    join public.race_questions as question on question.id = answer.question_id
    where entry.user_id = 'f2000000-0000-0000-0000-000000000007'
      and entry.competition = 'user'::public.prediction_competition
  ),
  (select answers from yf_podium_expected_answers),
  'G. rejected duplicate podium requests leave all seven answers unchanged'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'f2000000-0000-0000-0000-000000000007',
  true
);

select lives_ok(
  $$select * from public.submit_prediction(
    '2026-dutch-grand-prix', 'user'::public.prediction_competition,
    '{"pole_position":"Lewis Hamilton","race_winner":"Lewis Hamilton","p2_finisher":"Max Verstappen","p3_finisher":"Oscar Piastri","driver_of_the_day":"Charles Leclerc","top_constructor":"McLaren Formula 1 Team","worst_constructor":"Cadillac Formula 1 Team"}'::jsonb
  )$$,
  'H. valid edit with three distinct podium drivers succeeds'
);

reset role;

select is(
  (
    select entry.id
    from public.prediction_entries as entry
    where entry.user_id = 'f2000000-0000-0000-0000-000000000007'
      and entry.competition = 'user'::public.prediction_competition
  ),
  (select id from yf_podium_expected_entry),
  'H. valid edit updates the same prediction_entries row'
);
select is(
  (
    select count(*)
    from public.prediction_answers as answer
    join public.prediction_entries as entry on entry.id = answer.entry_id
    where entry.user_id = 'f2000000-0000-0000-0000-000000000007'
      and entry.competition = 'user'::public.prediction_competition
  ),
  7::bigint,
  'I. valid edit still has exactly seven answer rows'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'f2000000-0000-0000-0000-000000000007',
  true
);

select throws_ok(
  $$select * from public.submit_prediction(
    '2026-dutch-grand-prix', 'user'::public.prediction_competition,
    '{"pole_position":"Lewis Hamilton","race_winner":"Batman","p2_finisher":"Max Verstappen","p3_finisher":"Oscar Piastri","driver_of_the_day":"Charles Leclerc","top_constructor":"McLaren Formula 1 Team","worst_constructor":"Cadillac Formula 1 Team"}'::jsonb
  )$$,
  'P0001',
  'Invalid answer for question: race_winner',
  'J. fake driver validation remains enforced before podium uniqueness'
);

reset role;

select * from finish();

rollback;
