-- Verifies the live-compatible admin results, scoring, and leaderboard flow.
-- Every synthetic user, answer, score, and status change is rolled back.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(69);

select has_table('public', 'official_answers', 'official_answers exists');
select has_table('public', 'official_answer_history', 'official_answer_history exists');
select has_table('public', 'scoring_runs', 'scoring_runs exists');
select has_table('public', 'score_breakdown', 'score_breakdown exists');
select has_table('public', 'prediction_scores', 'prediction_scores exists');

select ok((select relrowsecurity from pg_class where oid = 'public.official_answers'::regclass), 'RLS is enabled on official_answers');
select ok((select relrowsecurity from pg_class where oid = 'public.official_answer_history'::regclass), 'RLS is enabled on official_answer_history');
select ok((select relrowsecurity from pg_class where oid = 'public.scoring_runs'::regclass), 'RLS is enabled on scoring_runs');
select ok((select relrowsecurity from pg_class where oid = 'public.score_breakdown'::regclass), 'RLS is enabled on score_breakdown');
select ok((select relrowsecurity from pg_class where oid = 'public.prediction_scores'::regclass), 'RLS is enabled on prediction_scores');

select ok(
  (select procedure.prosecdef
     and coalesce(procedure.proconfig, array[]::text[]) @> array['search_path=""']::text[]
   from pg_proc as procedure
   where procedure.oid = to_regprocedure('public.is_prediction_admin()')),
  'is_prediction_admin is SECURITY DEFINER with an empty search_path'
);
select ok(
  (select procedure.prosecdef
     and coalesce(procedure.proconfig, array[]::text[]) @> array['search_path=""']::text[]
   from pg_proc as procedure
   where procedure.oid = to_regprocedure('public.score_race(uuid,text)')),
  'score_race is SECURITY DEFINER with an empty search_path'
);
select ok(has_function_privilege('authenticated', 'public.set_official_answers(uuid,jsonb)', 'EXECUTE'), 'authenticated may call set_official_answers');
select ok(not has_function_privilege('anon', 'public.set_official_answers(uuid,jsonb)', 'EXECUTE'), 'anon cannot call set_official_answers');
select ok(has_function_privilege('authenticated', 'public.score_race(uuid,text)', 'EXECUTE'), 'authenticated may call score_race');
select ok(not has_function_privilege('anon', 'public.score_race(uuid,text)', 'EXECUTE'), 'anon cannot call score_race');
select ok(has_function_privilege('authenticated', 'public.publish_race_results(uuid)', 'EXECUTE'), 'authenticated may call publish_race_results');
select ok(not has_function_privilege('anon', 'public.publish_race_results(uuid)', 'EXECUTE'), 'anon cannot call publish_race_results');
select ok(not has_table_privilege('authenticated', 'public.official_answers', 'INSERT'), 'authenticated cannot insert official answers directly');
select ok(not has_table_privilege('anon', 'public.race_prediction_leaderboard', 'SELECT'), 'anon cannot read the race leaderboard');
select ok(has_table_privilege('authenticated', 'public.race_prediction_leaderboard', 'SELECT'), 'authenticated may read the published race leaderboard');
select ok(not has_table_privilege('authenticated', 'public.prediction_entries', 'TRUNCATE'), 'authenticated cannot truncate prediction entries');
select ok(not has_table_privilege('authenticated', 'public.prediction_answers', 'TRIGGER'), 'authenticated cannot create prediction-answer triggers');
select ok(not has_table_privilege('anon', 'public.races', 'REFERENCES'), 'anon cannot create references to races');

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
values
  ('00000000-0000-0000-0000-000000000000', 'a4000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'scoring-admin@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Scoring Admin"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a4000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'scoring-fan-one@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Scoring Fan One"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a4000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'scoring-fan-two@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Scoring Fan Two"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a4000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'scoring-host@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Scoring Host"}', now(), now());

insert into public.profiles (id, display_name)
values
  ('a4000000-0000-0000-0000-000000000001', 'Scoring Admin'),
  ('a4000000-0000-0000-0000-000000000002', 'Scoring Fan One'),
  ('a4000000-0000-0000-0000-000000000003', 'Scoring Fan Two'),
  ('a4000000-0000-0000-0000-000000000004', 'Scoring Host')
on conflict (id) do update set display_name = excluded.display_name;

insert into public.user_roles (user_id, role)
values
  ('a4000000-0000-0000-0000-000000000001', 'admin'::public.app_role),
  ('a4000000-0000-0000-0000-000000000004', 'host'::public.app_role)
on conflict (user_id, role) do nothing;

insert into public.host_profiles (user_id, host_name)
values ('a4000000-0000-0000-0000-000000000004', 'Kasun')
on conflict (user_id) do update set host_name = excluded.host_name;

update public.races
set opens_at = clock_timestamp() - interval '1 hour',
    closes_at = clock_timestamp() + interval '2 hours',
    race_starts_at = clock_timestamp() + interval '2 days',
    status = 'open'::public.race_status
where slug = '2026-dutch-grand-prix';

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a4000000-0000-0000-0000-000000000002', true);
select lives_ok(
  $$select * from public.submit_prediction(
    '2026-dutch-grand-prix',
    'user'::public.prediction_competition,
    '{"pole_position":"Lando Norris","race_winner":"Max Verstappen","p2_finisher":"Oscar Piastri","p3_finisher":"George Russell","driver_of_the_day":"Charles Leclerc","top_constructor":"McLaren Formula 1 Team","worst_constructor":"Cadillac Formula 1 Team"}'::jsonb
  )$$,
  'first Fan submits a seven-answer prediction'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a4000000-0000-0000-0000-000000000003', true);
select lives_ok(
  $$select * from public.submit_prediction(
    '2026-dutch-grand-prix',
    'user'::public.prediction_competition,
    '{"pole_position":"Lando Norris","race_winner":"Max Verstappen","p2_finisher":"Oscar Piastri","p3_finisher":"George Russell","driver_of_the_day":"Charles Leclerc","top_constructor":"McLaren Formula 1 Team","worst_constructor":"Cadillac Formula 1 Team"}'::jsonb
  )$$,
  'second Fan submits the same seven-answer prediction'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a4000000-0000-0000-0000-000000000004', true);
select lives_ok(
  $$select * from public.submit_prediction(
    '2026-dutch-grand-prix',
    'host'::public.prediction_competition,
    '{"pole_position":"Lewis Hamilton","race_winner":"Max Verstappen","p2_finisher":"Oscar Piastri","p3_finisher":"George Russell","driver_of_the_day":"Charles Leclerc","top_constructor":"McLaren Formula 1 Team","worst_constructor":"Cadillac Formula 1 Team"}'::jsonb
  )$$,
  'Host submits a separate Host prediction'
);
reset role;

select is(
  (select count(*) from public.prediction_entries as entry join public.races as race on race.id = entry.race_id where race.slug = '2026-dutch-grand-prix' and entry.competition = 'user'),
  2::bigint,
  'two Fan entries exist'
);
select is(
  (select count(*) from public.prediction_entries as entry join public.races as race on race.id = entry.race_id where race.slug = '2026-dutch-grand-prix' and entry.competition = 'host'),
  1::bigint,
  'one Host entry exists'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a4000000-0000-0000-0000-000000000002', true);
select is((select count(*) from public.prediction_entries), 1::bigint, 'a Fan still sees only their own entry');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a4000000-0000-0000-0000-000000000001', true);
select is((select count(*) from public.prediction_entries), 3::bigint, 'an admin may read all entries for scoring administration');
reset role;

update public.races
set opens_at = clock_timestamp() - interval '3 hours',
    closes_at = clock_timestamp() - interval '1 hour',
    race_starts_at = clock_timestamp() + interval '1 day'
where slug = '2026-dutch-grand-prix';

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a4000000-0000-0000-0000-000000000002', true);
select throws_ok(
  $$select public.set_official_answers(
    (select id from public.races where slug = '2026-dutch-grand-prix'),
    '{"pole_position":"Lando Norris","race_winner":"Max Verstappen","p2_finisher":"Oscar Piastri","p3_finisher":"George Russell","driver_of_the_day":"Charles Leclerc","top_constructor":"McLaren Formula 1 Team","worst_constructor":"Cadillac Formula 1 Team"}'::jsonb
  )$$,
  'P0001',
  'ADMIN_ROLE_REQUIRED',
  'a Fan cannot set official answers'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a4000000-0000-0000-0000-000000000001', true);
select throws_ok(
  $$select public.set_official_answers(
    (select id from public.races where slug = '2026-dutch-grand-prix'),
    '{"pole_position":"Not A Driver","race_winner":"Max Verstappen","p2_finisher":"Oscar Piastri","p3_finisher":"George Russell","driver_of_the_day":"Charles Leclerc","top_constructor":"McLaren Formula 1 Team","worst_constructor":"Cadillac Formula 1 Team"}'::jsonb
  )$$,
  'P0001',
  'INVALID_OFFICIAL_ANSWER_OPTION',
  'an invalid official option is rejected'
);
select throws_ok(
  $$select public.set_official_answers(
    (select id from public.races where slug = '2026-dutch-grand-prix'),
    '{"pole_position":"Lando Norris","race_winner":"Max Verstappen","p2_finisher":"Max Verstappen","p3_finisher":"George Russell","driver_of_the_day":"Charles Leclerc","top_constructor":"McLaren Formula 1 Team","worst_constructor":"Cadillac Formula 1 Team"}'::jsonb
  )$$,
  'P0001',
  'PODIUM_DRIVERS_MUST_BE_DISTINCT',
  'duplicate official podium drivers are rejected'
);
select lives_ok(
  $$select public.set_official_answers(
    (select id from public.races where slug = '2026-dutch-grand-prix'),
    '{"pole_position":"Lando Norris","race_winner":"Max Verstappen","p2_finisher":"Oscar Piastri","p3_finisher":"George Russell","driver_of_the_day":"Charles Leclerc","top_constructor":"McLaren Formula 1 Team","worst_constructor":"Cadillac Formula 1 Team"}'::jsonb
  )$$,
  'an admin records all seven official answers'
);
reset role;

select is(
  (select count(*) from public.official_answers as official join public.race_questions as question on question.id = official.question_id join public.races as race on race.id = question.race_id where race.slug = '2026-dutch-grand-prix'),
  7::bigint,
  'exactly seven current official answers exist'
);
select is(
  (select count(*) from public.official_answer_history as history join public.races as race on race.id = history.race_id where race.slug = '2026-dutch-grand-prix'),
  7::bigint,
  'the seven initial answers are audited'
);
select is(
  (select status::text from public.races where slug = '2026-dutch-grand-prix'),
  'locked',
  'recording results locks an expired open race'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a4000000-0000-0000-0000-000000000002', true);
select is((select count(*) from public.official_answers), 0::bigint, 'RLS hides official answers from a Fan');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a4000000-0000-0000-0000-000000000001', true);
select is((select count(*) from public.official_answers), 7::bigint, 'RLS allows an admin to review official answers');
select lives_ok(
  $$select public.score_race(
    (select id from public.races where slug = '2026-dutch-grand-prix'),
    'Initial local scoring test'
  )$$,
  'admin scoring succeeds'
);
reset role;

select is(
  (select count(*) from public.prediction_scores as score join public.prediction_entries as entry on entry.id = score.entry_id join public.races as race on race.id = entry.race_id where race.slug = '2026-dutch-grand-prix' and entry.competition = 'user' and score.score = 7),
  2::bigint,
  'both matching Fan entries receive 7 points'
);
select is(
  (select score.score from public.prediction_scores as score join public.prediction_entries as entry on entry.id = score.entry_id join public.races as race on race.id = entry.race_id where race.slug = '2026-dutch-grand-prix' and entry.competition = 'host'),
  6::smallint,
  'the Host entry receives 6 points'
);
select is((select count(*) from public.scoring_runs), 1::bigint, 'the first score creates one scoring run');
select is((select count(*) from public.score_breakdown), 21::bigint, 'the first score records 21 per-question decisions');
select is((select count(*) from public.race_prediction_leaderboard), 0::bigint, 'scored results remain hidden before publication');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a4000000-0000-0000-0000-000000000001', true);
select lives_ok(
  $$select public.score_race(
    (select id from public.races where slug = '2026-dutch-grand-prix'),
    'Repeated local scoring test'
  )$$,
  'repeating identical scoring succeeds idempotently'
);
reset role;

select is((select count(*) from public.scoring_runs), 1::bigint, 'identical scoring does not create another run');
select is((select count(*) from public.prediction_scores), 3::bigint, 'identical scoring keeps one current score per entry');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a4000000-0000-0000-0000-000000000001', true);
select lives_ok(
  $$select public.set_official_answers(
    (select id from public.races where slug = '2026-dutch-grand-prix'),
    '{"pole_position":"Lewis Hamilton","race_winner":"Max Verstappen","p2_finisher":"Oscar Piastri","p3_finisher":"George Russell","driver_of_the_day":"Charles Leclerc","top_constructor":"McLaren Formula 1 Team","worst_constructor":"Cadillac Formula 1 Team"}'::jsonb
  )$$,
  'an admin may correct an unpublished scored answer'
);
reset role;

select is((select status::text from public.races where slug = '2026-dutch-grand-prix'), 'locked', 'a correction returns the race to locked');
select is((select count(*) from public.prediction_scores), 0::bigint, 'a correction invalidates current scores');
select is((select count(*) from public.official_answer_history), 8::bigint, 'the corrected answer adds one audit record');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a4000000-0000-0000-0000-000000000001', true);
select lives_ok(
  $$select public.score_race(
    (select id from public.races where slug = '2026-dutch-grand-prix'),
    'Corrected local scoring test'
  )$$,
  'corrected answers create a new scoring version'
);
reset role;

select is((select count(*) from public.scoring_runs), 2::bigint, 'corrected scoring creates version two');
select is(
  (select count(*) from public.prediction_scores as score join public.prediction_entries as entry on entry.id = score.entry_id where entry.competition = 'user' and score.score = 6),
  2::bigint,
  'the corrected answer changes both Fan scores to 6'
);
select is(
  (select score.score from public.prediction_scores as score join public.prediction_entries as entry on entry.id = score.entry_id where entry.competition = 'host'),
  7::smallint,
  'the corrected answer changes the Host score to 7'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a4000000-0000-0000-0000-000000000001', true);
select lives_ok(
  $$select public.score_race(
    (select id from public.races where slug = '2026-dutch-grand-prix'),
    'Repeated corrected scoring test'
  )$$,
  'repeating corrected scoring is also idempotent'
);
reset role;

select is((select count(*) from public.scoring_runs), 2::bigint, 'repeating version two creates no duplicate run');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a4000000-0000-0000-0000-000000000002', true);
select throws_ok(
  $$select public.publish_race_results((select id from public.races where slug = '2026-dutch-grand-prix'))$$,
  'P0001',
  'ADMIN_ROLE_REQUIRED',
  'a Fan cannot publish results'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a4000000-0000-0000-0000-000000000001', true);
select lives_ok(
  $$select public.publish_race_results((select id from public.races where slug = '2026-dutch-grand-prix'))$$,
  'an admin publishes complete scores'
);
reset role;

select is((select status::text from public.races where slug = '2026-dutch-grand-prix'), 'published', 'publication updates the race status');
select is((select count(*) from public.race_prediction_leaderboard), 3::bigint, 'publication exposes all three scored entries');
select is(
  (select string_agg(rank::text, ',' order by display_name) from public.race_prediction_leaderboard where competition = 'user'),
  '1,1',
  'equal Fan scores share race rank one'
);
select is((select count(*) from public.race_prediction_leaderboard where competition = 'host'), 1::bigint, 'Host standings remain a separate competition');
select is(
  (select string_agg(rank::text, ',' order by display_name) from public.season_prediction_leaderboard where competition = 'user'),
  '1,1',
  'equal Fan totals and tie-break frequencies share season rank one'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a4000000-0000-0000-0000-000000000001', true);
select throws_ok(
  $$select public.set_official_answers(
    (select id from public.races where slug = '2026-dutch-grand-prix'),
    '{"pole_position":"Lando Norris","race_winner":"Max Verstappen","p2_finisher":"Oscar Piastri","p3_finisher":"George Russell","driver_of_the_day":"Charles Leclerc","top_constructor":"McLaren Formula 1 Team","worst_constructor":"Cadillac Formula 1 Team"}'::jsonb
  )$$,
  'P0001',
  'PUBLISHED_RESULTS_IMMUTABLE',
  'published official answers cannot be silently changed'
);
select lives_ok(
  $$select public.publish_race_results((select id from public.races where slug = '2026-dutch-grand-prix'))$$,
  'repeating publication is idempotent'
);
reset role;

select is((select status::text from public.races where slug = '2026-dutch-grand-prix'), 'published', 'idempotent publication keeps the race published');

select * from finish();
rollback;
