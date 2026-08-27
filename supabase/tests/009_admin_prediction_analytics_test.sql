-- Verifies secure aggregate analytics, visibility locking, and submission/edit events.
-- Every fixture is rolled back.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(18);

select has_table('public', 'prediction_analytics_events', 'prediction analytics event table exists');
select ok((select relrowsecurity from pg_class where oid = 'public.prediction_analytics_events'::regclass), 'analytics events have RLS enabled');
select has_function('public', 'get_admin_prediction_analytics', array['uuid', 'prediction_competition'], 'admin analytics function exists');
select ok(
  (select procedure.prosecdef and coalesce(procedure.proconfig, array[]::text[]) @> array['search_path=""']::text[]
   from pg_proc as procedure where procedure.oid = to_regprocedure('public.get_admin_prediction_analytics(uuid,public.prediction_competition)')),
  'analytics function is SECURITY DEFINER with an empty search path'
);
select ok(has_function_privilege('authenticated', 'public.get_admin_prediction_analytics(uuid,public.prediction_competition)', 'EXECUTE'), 'authenticated may call the guarded analytics RPC');
select ok(not has_function_privilege('anon', 'public.get_admin_prediction_analytics(uuid,public.prediction_competition)', 'EXECUTE'), 'anon cannot call admin analytics');
select ok(not has_table_privilege('authenticated', 'public.prediction_analytics_events', 'INSERT'), 'authenticated users cannot forge analytics events');
select has_trigger('public', 'prediction_entries', 'record_prediction_analytics_event', 'prediction entries record analytics events');

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'a9000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'analytics-admin@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Analytics Admin"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a9000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'analytics-fan@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Analytics Fan"}', now(), now());

insert into public.user_roles (user_id, role)
values ('a9000000-0000-0000-0000-000000000001', 'admin')
on conflict (user_id, role) do nothing;

insert into public.seasons (id, year, name, is_active)
values ('a9000000-0000-4000-8000-000000000010', 2098, 'Analytics Test Season', false);

insert into public.races (id, season_id, round_number, slug, race_name, circuit_name, country_code, opens_at, closes_at, race_starts_at, status)
values
  ('a9000000-0000-4000-8000-000000000011', 'a9000000-0000-4000-8000-000000000010', 1, 'analytics-locked', 'Analytics Locked GP', 'Test Circuit', 'LK', now() - interval '2 days', now() - interval '1 hour', now() + interval '1 day', 'locked'),
  ('a9000000-0000-4000-8000-000000000012', 'a9000000-0000-4000-8000-000000000010', 2, 'analytics-open', 'Analytics Open GP', 'Test Circuit', 'LK', now() - interval '1 day', now() + interval '1 day', now() + interval '2 days', 'open');

insert into public.race_questions (id, race_id, question_number, question_key, question_text, answer_type, is_active)
values
  ('a9000000-0000-4000-8000-000000000021', 'a9000000-0000-4000-8000-000000000011', 1, 'race_winner', 'Who wins?', 'driver', true),
  ('a9000000-0000-4000-8000-000000000022', 'a9000000-0000-4000-8000-000000000012', 1, 'race_winner', 'Who wins?', 'driver', true);

insert into public.race_question_options (question_id, option_value, option_label, option_type, sort_order)
values
  ('a9000000-0000-4000-8000-000000000021', 'driver:1', 'Driver One', 'driver', 1),
  ('a9000000-0000-4000-8000-000000000022', 'driver:1', 'Driver One', 'driver', 1);

insert into public.prediction_entries (id, race_id, user_id, competition)
values
  ('a9000000-0000-4000-8000-000000000031', 'a9000000-0000-4000-8000-000000000011', 'a9000000-0000-0000-0000-000000000002', 'user'),
  ('a9000000-0000-4000-8000-000000000032', 'a9000000-0000-4000-8000-000000000012', 'a9000000-0000-0000-0000-000000000002', 'user');

insert into public.prediction_answers (entry_id, question_id, answer_value)
values
  ('a9000000-0000-4000-8000-000000000031', 'a9000000-0000-4000-8000-000000000021', 'driver:1'),
  ('a9000000-0000-4000-8000-000000000032', 'a9000000-0000-4000-8000-000000000022', 'driver:1');

select is((select count(*) from public.prediction_analytics_events where event_type = 'submitted'), 2::bigint, 'inserts create submission events');
update public.prediction_entries set updated_at = clock_timestamp() where id = 'a9000000-0000-4000-8000-000000000031';
select is((select count(*) from public.prediction_analytics_events where event_type = 'edited'), 1::bigint, 'updates create edit events');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a9000000-0000-0000-0000-000000000002', true);
select throws_ok(
  $$select public.get_admin_prediction_analytics('a9000000-0000-4000-8000-000000000011', 'user')$$,
  'P0001', 'admin_role_required', 'a Fan cannot read aggregate admin analytics'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a9000000-0000-0000-0000-000000000001', true);
select lives_ok(
  $$select public.get_admin_prediction_analytics('a9000000-0000-4000-8000-000000000011', 'user')$$,
  'an Admin can read aggregate analytics'
);
select is((public.get_admin_prediction_analytics('a9000000-0000-4000-8000-000000000011', 'user')->'totals'->>'entries')::integer, 1, 'analytics count unique race entries');
select is(public.get_admin_prediction_analytics('a9000000-0000-4000-8000-000000000011', 'user')->>'distributions_locked', 'false', 'closed race distributions are revealed');
select is(jsonb_array_length(public.get_admin_prediction_analytics('a9000000-0000-4000-8000-000000000011', 'user')->'questions'), 1, 'closed race returns question analytics');
select is((public.get_admin_prediction_analytics('a9000000-0000-4000-8000-000000000011', 'user')->'questions'->0->'choices'->0->>'count')::integer, 1, 'choice distribution counts the selected competition');
select is(public.get_admin_prediction_analytics('a9000000-0000-4000-8000-000000000012', 'user')->>'distributions_locked', 'true', 'open race distributions stay locked');
select is(jsonb_array_length(public.get_admin_prediction_analytics('a9000000-0000-4000-8000-000000000012', 'user')->'questions'), 0, 'open race does not expose question choices');
reset role;

select * from finish();
rollback;
