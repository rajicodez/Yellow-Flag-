-- Verifies guarded, database-backed race and question administration.
-- Every fixture is rolled back.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(29);

select has_function(
  'public',
  'admin_upsert_race',
  array['uuid', 'integer', 'text', 'integer', 'text', 'text', 'text', 'text', 'timestamp with time zone', 'timestamp with time zone', 'timestamp with time zone', 'public.race_status'],
  'admin_upsert_race exists'
);
select has_function(
  'public',
  'admin_save_race_questions',
  array['uuid', 'jsonb'],
  'admin_save_race_questions exists'
);
select ok(
  (select procedure.prosecdef
     and coalesce(procedure.proconfig, array[]::text[]) @> array['search_path=""']::text[]
   from pg_proc as procedure
   where procedure.oid = to_regprocedure('public.admin_upsert_race(uuid,integer,text,integer,text,text,text,text,timestamptz,timestamptz,timestamptz,public.race_status)')),
  'admin_upsert_race is SECURITY DEFINER with an empty search path'
);
select ok(
  (select procedure.prosecdef
     and coalesce(procedure.proconfig, array[]::text[]) @> array['search_path=""']::text[]
   from pg_proc as procedure
   where procedure.oid = to_regprocedure('public.admin_save_race_questions(uuid,jsonb)')),
  'admin_save_race_questions is SECURITY DEFINER with an empty search path'
);
select ok(has_function_privilege('authenticated', 'public.admin_upsert_race(uuid,integer,text,integer,text,text,text,text,timestamptz,timestamptz,timestamptz,public.race_status)', 'EXECUTE'), 'authenticated may call admin_upsert_race');
select ok(not has_function_privilege('anon', 'public.admin_upsert_race(uuid,integer,text,integer,text,text,text,text,timestamptz,timestamptz,timestamptz,public.race_status)', 'EXECUTE'), 'anon cannot call admin_upsert_race');
select ok(has_function_privilege('authenticated', 'public.admin_save_race_questions(uuid,jsonb)', 'EXECUTE'), 'authenticated may call admin_save_race_questions');
select ok(not has_function_privilege('anon', 'public.admin_save_race_questions(uuid,jsonb)', 'EXECUTE'), 'anon cannot call admin_save_race_questions');
select ok(not has_table_privilege('authenticated', 'public.races', 'INSERT'), 'authenticated cannot insert races directly');

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('00000000-0000-0000-0000-000000000000', 'a6000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'race-admin@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Race Admin"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a6000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'race-fan@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Race Fan"}', now(), now());

insert into public.user_roles (user_id, role)
values ('a6000000-0000-0000-0000-000000000001', 'admin'::public.app_role)
on conflict (user_id, role) do nothing;

create temporary table admin_test_question_payload(payload jsonb not null);
grant select on admin_test_question_payload to authenticated;
insert into admin_test_question_payload(payload)
values (
  '[
    {"question_number":1,"question_key":"pole_position","question_text":"Who will take Pole Position?","answer_type":"driver","is_active":true,"options":[{"option_value":"Driver One","option_label":"Driver One","sort_order":1},{"option_value":"Driver Two","option_label":"Driver Two","sort_order":2}]},
    {"question_number":2,"question_key":"race_winner","question_text":"Who will finish P1?","answer_type":"driver","is_active":true,"options":[{"option_value":"Driver One","option_label":"Driver One","sort_order":1},{"option_value":"Driver Two","option_label":"Driver Two","sort_order":2}]},
    {"question_number":3,"question_key":"p2_finisher","question_text":"Who will finish P2?","answer_type":"driver","is_active":true,"options":[{"option_value":"Driver One","option_label":"Driver One","sort_order":1},{"option_value":"Driver Two","option_label":"Driver Two","sort_order":2}]},
    {"question_number":4,"question_key":"p3_finisher","question_text":"Who will finish P3?","answer_type":"driver","is_active":true,"options":[{"option_value":"Driver One","option_label":"Driver One","sort_order":1},{"option_value":"Driver Two","option_label":"Driver Two","sort_order":2}]},
    {"question_number":5,"question_key":"driver_of_the_day","question_text":"Who will be Driver of the Day?","answer_type":"driver","is_active":true,"options":[{"option_value":"Driver One","option_label":"Driver One","sort_order":1},{"option_value":"Driver Two","option_label":"Driver Two","sort_order":2}]},
    {"question_number":6,"question_key":"top_constructor","question_text":"Which constructor will score the most points?","answer_type":"constructor","is_active":true,"options":[{"option_value":"Team One","option_label":"Team One","sort_order":1},{"option_value":"Team Two","option_label":"Team Two","sort_order":2}]},
    {"question_number":7,"question_key":"worst_constructor","question_text":"Which constructor will perform the worst?","answer_type":"constructor","is_active":true,"options":[{"option_value":"Team One","option_label":"Team One","sort_order":1},{"option_value":"Team Two","option_label":"Team Two","sort_order":2}]}
  ]'::jsonb
);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a6000000-0000-0000-0000-000000000002', true);
select throws_ok(
  $$select public.admin_upsert_race(
    null, 2027, '2027 Formula 1 World Championship', 1,
    '2027-test-grand-prix', 'Test Grand Prix', 'Test Circuit', 'LK',
    '2027-03-01 00:00:00+00'::timestamptz, '2027-03-05 00:00:00+00'::timestamptz,
    '2027-03-06 00:00:00+00'::timestamptz, 'draft'::public.race_status
  )$$,
  'P0001',
  'ADMIN_ROLE_REQUIRED',
  'a Fan cannot create a race'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a6000000-0000-0000-0000-000000000001', true);
select lives_ok(
  $$select public.admin_upsert_race(
    null, 2027, '2027 Formula 1 World Championship', 1,
    '2027-test-grand-prix', 'Test Grand Prix', 'Test Circuit', 'LK',
    '2027-03-01 00:00:00+00'::timestamptz, '2027-03-05 00:00:00+00'::timestamptz,
    '2027-03-06 00:00:00+00'::timestamptz, 'draft'::public.race_status
  )$$,
  'an Admin creates a draft race'
);
reset role;

select is((select count(*) from public.races where slug = '2027-test-grand-prix'), 1::bigint, 'the draft race is stored once');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a6000000-0000-0000-0000-000000000002', true);
select is((select count(*) from public.races where slug = '2027-test-grand-prix'), 0::bigint, 'a Fan cannot see a draft race');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a6000000-0000-0000-0000-000000000001', true);
select is((select count(*) from public.races where slug = '2027-test-grand-prix'), 1::bigint, 'an Admin can see a draft race');
select throws_ok(
  $$select public.admin_upsert_race(
    (select id from public.races where slug = '2027-test-grand-prix'),
    2027, '2027 Formula 1 World Championship', 1,
    '2027-test-grand-prix', 'Test Grand Prix', 'Test Circuit', 'LK',
    '2027-03-01 00:00:00+00'::timestamptz, '2027-03-05 00:00:00+00'::timestamptz,
    '2027-03-06 00:00:00+00'::timestamptz, 'open'::public.race_status
  )$$,
  'P0001',
  'SEVEN_CONFIGURED_QUESTIONS_REQUIRED_TO_OPEN',
  'a race cannot open before its seven questions are configured'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a6000000-0000-0000-0000-000000000002', true);
select throws_ok(
  $$select public.admin_save_race_questions(
    (select id from public.races where slug = '2027-test-grand-prix'),
    (select payload from admin_test_question_payload)
  )$$,
  'P0001',
  'ADMIN_ROLE_REQUIRED',
  'a Fan cannot configure race questions'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a6000000-0000-0000-0000-000000000001', true);
select lives_ok(
  $$select public.admin_save_race_questions(
    (select id from public.races where slug = '2027-test-grand-prix'),
    (select payload from admin_test_question_payload)
  )$$,
  'an Admin saves seven configured questions'
);
reset role;

select is((select count(*) from public.race_questions question join public.races race on race.id = question.race_id where race.slug = '2027-test-grand-prix'), 7::bigint, 'seven questions were saved');
select is((select count(*) from public.race_question_options option join public.race_questions question on question.id = option.question_id join public.races race on race.id = question.race_id where race.slug = '2027-test-grand-prix'), 14::bigint, 'all question options were saved');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a6000000-0000-0000-0000-000000000001', true);
select throws_ok(
  $$select public.admin_save_race_questions(
    (select id from public.races where slug = '2027-test-grand-prix'),
    '[]'::jsonb
  )$$,
  'P0001',
  'EXACTLY_SEVEN_QUESTIONS_REQUIRED',
  'an invalid question count is rejected without replacing the saved set'
);
select lives_ok(
  $$select public.admin_upsert_race(
    (select id from public.races where slug = '2027-test-grand-prix'),
    2027, '2027 Formula 1 World Championship', 1,
    '2027-test-grand-prix', 'Test Grand Prix', 'Test Circuit', 'LK',
    '2027-03-01 00:00:00+00'::timestamptz, '2027-03-05 00:00:00+00'::timestamptz,
    '2027-03-06 00:00:00+00'::timestamptz, 'open'::public.race_status
  )$$,
  'a fully configured race can be opened'
);
reset role;

select is((select status::text from public.races where slug = '2027-test-grand-prix'), 'open', 'the race status is open');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a6000000-0000-0000-0000-000000000002', true);
select is((select count(*) from public.races where slug = '2027-test-grand-prix'), 1::bigint, 'a Fan can see the open race');
reset role;

insert into public.prediction_entries (race_id, user_id, competition)
select race.id, 'a6000000-0000-0000-0000-000000000002', 'user'::public.prediction_competition
from public.races as race
where race.slug = '2027-test-grand-prix';

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a6000000-0000-0000-0000-000000000001', true);
select throws_ok(
  $$select public.admin_save_race_questions(
    (select id from public.races where slug = '2027-test-grand-prix'),
    (select payload from admin_test_question_payload)
  )$$,
  'P0001',
  'RACE_HAS_SUBMISSIONS',
  'question replacement is blocked after a submission exists'
);
select throws_ok(
  $$select public.admin_upsert_race(
    (select id from public.races where slug = '2027-test-grand-prix'),
    2027, '2027 Formula 1 World Championship', 1,
    '2027-test-grand-prix', 'Renamed Grand Prix', 'Test Circuit', 'LK',
    '2027-03-01 00:00:00+00'::timestamptz, '2027-03-05 00:00:00+00'::timestamptz,
    '2027-03-06 00:00:00+00'::timestamptz, 'open'::public.race_status
  )$$,
  'P0001',
  'RACE_IDENTITY_LOCKED_AFTER_SUBMISSIONS',
  'race identity is locked after a submission exists'
);
select lives_ok(
  $$select public.admin_upsert_race(
    (select id from public.races where slug = '2027-test-grand-prix'),
    2027, '2027 Formula 1 World Championship', 1,
    '2027-test-grand-prix', 'Test Grand Prix', 'Test Circuit', 'LK',
    '2027-03-01 00:00:00+00'::timestamptz, '2027-03-04 00:00:00+00'::timestamptz,
    '2027-03-06 00:00:00+00'::timestamptz, 'locked'::public.race_status
  )$$,
  'an Admin may adjust timing and lock the same race after submissions'
);
reset role;

select is((select status::text from public.races where slug = '2027-test-grand-prix'), 'locked', 'the race was manually locked');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a6000000-0000-0000-0000-000000000001', true);
select throws_ok(
  $$select public.admin_upsert_race(
    (select id from public.races where slug = '2027-test-grand-prix'),
    2027, '2027 Formula 1 World Championship', 1,
    '2027-test-grand-prix', 'Test Grand Prix', 'Test Circuit', 'LK',
    '2027-03-01 00:00:00+00'::timestamptz, '2027-03-04 00:00:00+00'::timestamptz,
    '2027-03-06 00:00:00+00'::timestamptz, 'scored'::public.race_status
  )$$,
  'P0001',
  'RACE_STATUS_MANAGED_BY_RESULTS_FLOW',
  'race administration cannot bypass the scoring flow'
);
reset role;

select is((select count(*) from public.race_questions question join public.races race on race.id = question.race_id where race.slug = '2027-test-grand-prix'), 7::bigint, 'failed mutations leave the seven questions intact');

select * from finish();
rollback;
