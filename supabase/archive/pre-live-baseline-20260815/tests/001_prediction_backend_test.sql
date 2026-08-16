begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(63);

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
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'fan-one@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Fan One"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'fan-two@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Fan Two"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'host@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Test Host"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'admin@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Test Admin"}', now(), now());

update public.profiles set role = 'host' where id = '10000000-0000-0000-0000-000000000003';
update public.profiles set role = 'admin' where id = '10000000-0000-0000-0000-000000000004';

update public.races
set fp1_starts_at = clock_timestamp() + interval '2 hours',
    prediction_locks_at = clock_timestamp() + interval '2 hours',
    race_starts_at = clock_timestamp() + interval '2 days',
    prediction_opens_at = clock_timestamp() - interval '1 hour',
    status = 'open'
where slug = '2026-dutch-grand-prix';

select is((select count(*) from public.profiles), 4::bigint, 'auth trigger creates four profiles');
select is((select role from public.profiles where id = '10000000-0000-0000-0000-000000000003'), 'host', 'host role is UUID-backed');
select is((select role from public.profiles where id = '10000000-0000-0000-0000-000000000004'), 'admin', 'admin role is UUID-backed');
select ok(not has_function_privilege('anon', 'public.submit_prediction(text,text,jsonb)', 'EXECUTE'), 'anonymous users cannot execute submission');
select ok(has_function_privilege('authenticated', 'public.submit_prediction(text,text,jsonb)', 'EXECUTE'), 'authenticated users can execute submission');
select ok(not has_table_privilege('authenticated', 'public.prediction_entries', 'UPDATE'), 'clients cannot update entry scores directly');
select ok(not has_table_privilege('authenticated', 'public.prediction_answers', 'INSERT'), 'clients cannot insert answers directly');
select ok(not has_column_privilege('authenticated', 'public.profiles', 'role', 'UPDATE'), 'clients cannot self-promote profile roles');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select lives_ok(
  $$select public.submit_prediction(
    '2026-dutch-grand-prix',
    'fan',
    '{"pole_position":"driver:norris","race_winner":"driver:verstappen","p2_finisher":"driver:piastri","p3_finisher":"driver:russell","driver_of_the_day":"driver:leclerc","top_constructor":"constructor:1","worst_constructor":"constructor:11"}'::jsonb
  )$$,
  'fan can submit seven valid answers'
);
reset role;

select is(
  (select count(*) from public.prediction_answers where entry_id = (
    select id from public.prediction_entries where user_id = '10000000-0000-0000-0000-000000000001'
  )),
  7::bigint,
  'valid submission stores exactly seven answers'
);
select is((select count(*) from public.prediction_entries where user_id = '10000000-0000-0000-0000-000000000001'), 1::bigint, 'first submission creates one entry');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select throws_ok(
  $$select public.submit_prediction('2026-dutch-grand-prix', 'host', '{"pole_position":"driver:norris","race_winner":"driver:verstappen","p2_finisher":"driver:piastri","p3_finisher":"driver:russell","driver_of_the_day":"driver:leclerc","top_constructor":"constructor:1","worst_constructor":"constructor:11"}'::jsonb)$$,
  'P0001',
  'HOST_COMPETITION_FORBIDDEN',
  'fan cannot enter host competition'
);
select throws_ok(
  $$select public.submit_prediction('2026-dutch-grand-prix', 'fan', '{"pole_position":"driver:norris"}'::jsonb)$$,
  'P0001',
  'EXACTLY_SEVEN_ANSWERS_REQUIRED',
  'incomplete submission is rejected'
);
select throws_ok(
  $$select public.submit_prediction('2026-dutch-grand-prix', 'fan', '{"pole_position":"driver:not-real","race_winner":"driver:verstappen","p2_finisher":"driver:piastri","p3_finisher":"driver:russell","driver_of_the_day":"driver:leclerc","top_constructor":"constructor:1","worst_constructor":"constructor:11"}'::jsonb)$$,
  'P0001',
  'INVALID_ANSWER_OPTION',
  'invalid answer option is rejected'
);
select throws_ok(
  $$select public.submit_prediction('2026-dutch-grand-prix', 'fan', '{"not_a_question":"driver:norris","race_winner":"driver:verstappen","p2_finisher":"driver:piastri","p3_finisher":"driver:russell","driver_of_the_day":"driver:leclerc","top_constructor":"constructor:1","worst_constructor":"constructor:11"}'::jsonb)$$,
  'P0001',
  'UNKNOWN_OR_INACTIVE_QUESTION',
  'unknown question key is rejected'
);
select throws_ok(
  $$select public.submit_prediction('2026-dutch-grand-prix', 'fan', '{"pole_position":"driver:norris","race_winner":"driver:verstappen","p2_finisher":"driver:verstappen","p3_finisher":"driver:russell","driver_of_the_day":"driver:leclerc","top_constructor":"constructor:1","worst_constructor":"constructor:11"}'::jsonb)$$,
  'P0001',
  'DUPLICATE_GROUP_ANSWER',
  'duplicate podium driver is rejected'
);
reset role;

select is(
  (
    select answer.answer_value
    from public.prediction_answers as answer
    join public.prediction_entries as entry on entry.id = answer.entry_id
    join public.race_questions as question on question.id = answer.question_id
    where entry.user_id = '10000000-0000-0000-0000-000000000001'
      and question.question_key = 'pole_position'
  ),
  'driver:norris',
  'failed submissions leave the original entry unchanged'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select lives_ok(
  $$select public.submit_prediction('2026-dutch-grand-prix', 'fan', '{"pole_position":"driver:hamilton","race_winner":"driver:verstappen","p2_finisher":"driver:piastri","p3_finisher":"driver:russell","driver_of_the_day":"driver:leclerc","top_constructor":"constructor:1","worst_constructor":"constructor:11"}'::jsonb)$$,
  'resubmission before lock succeeds'
);
reset role;

select is((select count(*) from public.prediction_entries where user_id = '10000000-0000-0000-0000-000000000001'), 1::bigint, 'resubmission updates instead of duplicating');
select is(
  (
    select answer.answer_value
    from public.prediction_answers as answer
    join public.prediction_entries as entry on entry.id = answer.entry_id
    join public.race_questions as question on question.id = answer.question_id
    where entry.user_id = '10000000-0000-0000-0000-000000000001'
      and question.question_key = 'pole_position'
  ),
  'driver:hamilton',
  'resubmission replaces the changed answer'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
select lives_ok(
  $$select public.submit_prediction('2026-dutch-grand-prix', 'fan', '{"pole_position":"driver:hamilton","race_winner":"driver:verstappen","p2_finisher":"driver:piastri","p3_finisher":"driver:russell","driver_of_the_day":"driver:leclerc","top_constructor":"constructor:1","worst_constructor":"constructor:9"}'::jsonb)$$,
  'second fan can submit independently'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000004', true);
select lives_ok(
  $$select public.submit_prediction('2026-dutch-grand-prix', 'fan', '{"pole_position":"driver:hamilton","race_winner":"driver:verstappen","p2_finisher":"driver:piastri","p3_finisher":"driver:russell","driver_of_the_day":"driver:leclerc","top_constructor":"constructor:1","worst_constructor":"constructor:9"}'::jsonb)$$,
  'admin may participate as a fan'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);
select lives_ok(
  $$select public.submit_prediction('2026-dutch-grand-prix', 'host', '{"pole_position":"driver:norris","race_winner":"driver:verstappen","p2_finisher":"driver:piastri","p3_finisher":"driver:russell","driver_of_the_day":"driver:leclerc","top_constructor":"constructor:1","worst_constructor":"constructor:11"}'::jsonb)$$,
  'host can enter the host competition'
);
reset role;

select is((select count(*) from public.prediction_entries where user_id = '10000000-0000-0000-0000-000000000003'), 1::bigint, 'host is not automatically entered as a fan');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);
select lives_ok(
  $$select public.submit_prediction('2026-dutch-grand-prix', 'fan', '{"pole_position":"driver:hamilton","race_winner":"driver:norris","p2_finisher":"driver:verstappen","p3_finisher":"driver:piastri","driver_of_the_day":"driver:hamilton","top_constructor":"constructor:2","worst_constructor":"constructor:9"}'::jsonb)$$,
  'host can explicitly enter as a fan'
);
reset role;

select is((select count(*) from public.prediction_entries where user_id = '10000000-0000-0000-0000-000000000003'), 2::bigint, 'explicit fan entry is separate from host entry');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select is((select count(*) from public.prediction_entries), 1::bigint, 'RLS exposes only the requesting user entries');
select is((select count(*) from public.prediction_answers), 7::bigint, 'RLS exposes only the requesting user answers');
select throws_ok(
  $$select public.set_official_answers((select id from public.races where slug = '2026-dutch-grand-prix'), '{"pole_position":"driver:norris"}'::jsonb)$$,
  'P0001',
  'ADMIN_ROLE_REQUIRED',
  'fan cannot set official answers'
);
select throws_ok(
  $$select public.score_race((select id from public.races where slug = '2026-dutch-grand-prix'), 'unauthorized attempt')$$,
  'P0001',
  'ADMIN_ROLE_REQUIRED',
  'fan cannot run scoring'
);
reset role;

update public.races
set fp1_starts_at = clock_timestamp() - interval '1 minute',
    prediction_locks_at = clock_timestamp() - interval '1 minute'
where slug = '2026-dutch-grand-prix';

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select throws_ok(
  $$select public.submit_prediction('2026-dutch-grand-prix', 'fan', '{"pole_position":"driver:norris","race_winner":"driver:verstappen","p2_finisher":"driver:piastri","p3_finisher":"driver:russell","driver_of_the_day":"driver:leclerc","top_constructor":"constructor:1","worst_constructor":"constructor:11"}'::jsonb)$$,
  'P0001',
  'PREDICTION_LOCKED',
  'database server time rejects submission at the FP1 lock'
);
reset role;

update public.races set status = 'completed' where slug = '2026-dutch-grand-prix';

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000004', true);
select lives_ok(
  $$select public.set_official_answers(
    (select id from public.races where slug = '2026-dutch-grand-prix'),
    '{"pole_position":"driver:norris","race_winner":"driver:verstappen","p2_finisher":"driver:piastri","p3_finisher":"driver:russell","driver_of_the_day":"driver:leclerc","top_constructor":"constructor:1","worst_constructor":"constructor:11"}'::jsonb
  )$$,
  'admin can save all official answers'
);
reset role;

select is((select count(*) from public.official_answer_history), 7::bigint, 'initial official answers create seven audit records');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000004', true);
select lives_ok(
  $$select public.score_race((select id from public.races where slug = '2026-dutch-grand-prix'), 'pgTAP initial run')$$,
  'admin can score a completed race'
);
reset role;

select is((select score from public.prediction_entries where user_id = '10000000-0000-0000-0000-000000000001' and competition = 'fan'), 6::smallint, 'fan one receives six exact-match points');
select is((select score from public.prediction_entries where user_id = '10000000-0000-0000-0000-000000000002' and competition = 'fan'), 5::smallint, 'fan two receives five exact-match points');
select is((select score from public.prediction_entries where user_id = '10000000-0000-0000-0000-000000000004' and competition = 'fan'), 5::smallint, 'admin fan entry is scored normally');
select is((select score from public.prediction_entries where user_id = '10000000-0000-0000-0000-000000000003' and competition = 'host'), 7::smallint, 'host perfect entry receives seven points');
select is((select score from public.prediction_entries where user_id = '10000000-0000-0000-0000-000000000003' and competition = 'fan'), 0::smallint, 'all-wrong entry scores zero, including drivers in wrong podium positions');
select is((select count(*) from public.score_breakdown), 35::bigint, 'score run stores seven breakdown rows for each entry');
select is((select status from public.score_runs where version = 1), 'completed', 'first score run is completed and versioned');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000004', true);
select lives_ok(
  $$select public.score_race((select id from public.races where slug = '2026-dutch-grand-prix'), 'pgTAP repeat run')$$,
  'repeat scoring creates a new auditable version'
);
reset role;

select is((select count(*) from public.score_runs), 2::bigint, 'two scoring versions are retained');
select is((select count(*) from public.score_breakdown), 70::bigint, 'repeat scoring preserves both breakdown versions');
select is((select count(*) from public.race_prediction_leaderboard where race_slug = '2026-dutch-grand-prix' and competition = 'host'), 1::bigint, 'host race leaderboard is isolated');
select is((select count(*) from public.race_prediction_leaderboard where race_slug = '2026-dutch-grand-prix' and competition = 'fan'), 4::bigint, 'fan race leaderboard is isolated');
select is((select rank from public.race_prediction_leaderboard where race_slug = '2026-dutch-grand-prix' and competition = 'fan' and user_id = '10000000-0000-0000-0000-000000000001'), 1::bigint, 'highest fan score ranks first');
select is((select count(*) from public.race_prediction_leaderboard where race_slug = '2026-dutch-grand-prix' and competition = 'fan' and rank = 2), 2::bigint, 'equal race scores share the same rank');
select is((select user_id from public.race_prediction_leaderboard where race_slug = '2026-dutch-grand-prix' and competition = 'host' and rank = 1), '10000000-0000-0000-0000-000000000003'::uuid, 'host leaderboard contains the host account');

insert into public.races (
  season, round_number, slug, name, country, circuit_name,
  fp1_starts_at, race_starts_at, prediction_opens_at, prediction_locks_at,
  status, results_published_at
)
values (
  2026, 40, '2026-test-grand-prix', 'Test Grand Prix', 'Testland', 'Test Circuit',
  clock_timestamp() - interval '3 days', clock_timestamp() - interval '2 days',
  clock_timestamp() - interval '4 days', clock_timestamp() - interval '3 days',
  'scored', clock_timestamp()
);

insert into public.prediction_entries (
  race_id, user_id, competition, status, submitted_at, locked_at, score, scored_at
)
select race.id, values_to_insert.user_id, 'fan', 'scored',
       clock_timestamp() - interval '4 days', race.prediction_locks_at,
       values_to_insert.score, clock_timestamp()
from public.races as race
cross join (values
  ('10000000-0000-0000-0000-000000000001'::uuid, 6::smallint),
  ('10000000-0000-0000-0000-000000000002'::uuid, 7::smallint),
  ('10000000-0000-0000-0000-000000000004'::uuid, 7::smallint)
) as values_to_insert(user_id, score)
where race.slug = '2026-test-grand-prix';

select is((select rank from public.season_prediction_leaderboard where season = 2026 and competition = 'fan' and user_id = '10000000-0000-0000-0000-000000000002'), 1::bigint, 'season perfect-score tie-break ranks fan two first');
select is((select rank from public.season_prediction_leaderboard where season = 2026 and competition = 'fan' and user_id = '10000000-0000-0000-0000-000000000004'), 1::bigint, 'exact season tie shares first rank');
select is((select rank from public.season_prediction_leaderboard where season = 2026 and competition = 'fan' and user_id = '10000000-0000-0000-0000-000000000001'), 3::bigint, 'same total without a perfect score ranks after tied leaders');
select is((select total_score from public.season_prediction_leaderboard where season = 2026 and competition = 'fan' and user_id = '10000000-0000-0000-0000-000000000002'), 12, 'fan two season total is twelve');
select is((select total_score from public.season_prediction_leaderboard where season = 2026 and competition = 'fan' and user_id = '10000000-0000-0000-0000-000000000001'), 12, 'fan one season total is also twelve');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000004', true);
select lives_ok(
  $$select public.set_official_answers(
    (select id from public.races where slug = '2026-dutch-grand-prix'),
    '{"pole_position":"driver:hamilton"}'::jsonb
  )$$,
  'admin can correct an official answer'
);
reset role;

select is((select status from public.races where slug = '2026-dutch-grand-prix'), 'completed', 'official correction returns race to completed state');
select ok((select results_published_at is null from public.races where slug = '2026-dutch-grand-prix'), 'official correction clears publication time');
select is((select count(*) from public.race_prediction_leaderboard where race_slug = '2026-dutch-grand-prix'), 0::bigint, 'stale leaderboard is hidden after correction');
select is((select count(*) from public.official_answer_history where race_id = (select id from public.races where slug = '2026-dutch-grand-prix')), 8::bigint, 'official correction appends an audit record');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000004', true);
select lives_ok(
  $$select public.score_race((select id from public.races where slug = '2026-dutch-grand-prix'), 'pgTAP corrected run')$$,
  'corrected official answers can be rescored'
);
reset role;

select is((select count(*) from public.race_prediction_leaderboard where race_slug = '2026-dutch-grand-prix'), 5::bigint, 'corrected leaderboard is republished');
select is((select max(version) from public.score_runs where race_id = (select id from public.races where slug = '2026-dutch-grand-prix')), 3, 'corrected scoring is version three');
select is((select count(*) from public.score_breakdown where race_id = (select id from public.races where slug = '2026-dutch-grand-prix')), 105::bigint, 'all three scoring breakdown versions are retained');

select * from finish();
rollback;
