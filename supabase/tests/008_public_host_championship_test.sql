-- Verifies the public homepage receives only published Host competition totals.
-- Every fixture is rolled back.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(15);

select has_function('public', 'get_public_host_championship', array['integer'], 'public Host championship function exists');
select ok(
  (select procedure.prosecdef and coalesce(procedure.proconfig, array[]::text[]) @> array['search_path=""']::text[]
   from pg_proc as procedure where procedure.oid = to_regprocedure('public.get_public_host_championship(integer)')),
  'the public totals function is SECURITY DEFINER with an empty search path'
);
select ok(has_function_privilege('anon', 'public.get_public_host_championship(integer)', 'EXECUTE'), 'anon may read published Host totals');
select ok(has_function_privilege('authenticated', 'public.get_public_host_championship(integer)', 'EXECUTE'), 'authenticated users may read published Host totals');

set local role anon;
select throws_ok(
  $$select * from public.get_public_host_championship(1900)$$,
  'P0001', 'INVALID_SEASON_YEAR', 'invalid season years are rejected'
);
reset role;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('00000000-0000-0000-0000-000000000000', 'a8000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'lakindu@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Lakindu"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a8000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'kasun@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Kasun"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a8000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'scorer@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Scorer"}', now(), now());

insert into public.user_roles (user_id, role) values
  ('a8000000-0000-0000-0000-000000000001', 'host'),
  ('a8000000-0000-0000-0000-000000000002', 'host');
insert into public.host_profiles (user_id, host_name) values
  ('a8000000-0000-0000-0000-000000000001', 'Lakindu'),
  ('a8000000-0000-0000-0000-000000000002', 'Kasun');

insert into public.seasons (id, year, name, is_active)
values ('a8000000-0000-4000-8000-000000000010', 2099, '2099 Test Season', false);
insert into public.races (id, season_id, round_number, slug, race_name, circuit_name, country_code, opens_at, closes_at, race_starts_at, status)
values
  ('a8000000-0000-4000-8000-000000000011', 'a8000000-0000-4000-8000-000000000010', 1, '2099-published', 'Published GP', 'Test Circuit', 'LK', '2099-01-01', '2099-01-02', '2099-01-03', 'published'),
  ('a8000000-0000-4000-8000-000000000012', 'a8000000-0000-4000-8000-000000000010', 2, '2099-open', 'Open GP', 'Test Circuit', 'LK', '2099-02-01', '2099-02-02', '2099-02-03', 'open');

insert into public.prediction_entries (id, race_id, user_id, competition) values
  ('a8000000-0000-4000-8000-000000000021', 'a8000000-0000-4000-8000-000000000011', 'a8000000-0000-0000-0000-000000000001', 'host'),
  ('a8000000-0000-4000-8000-000000000022', 'a8000000-0000-4000-8000-000000000011', 'a8000000-0000-0000-0000-000000000002', 'host'),
  ('a8000000-0000-4000-8000-000000000023', 'a8000000-0000-4000-8000-000000000012', 'a8000000-0000-0000-0000-000000000001', 'host'),
  ('a8000000-0000-4000-8000-000000000024', 'a8000000-0000-4000-8000-000000000011', 'a8000000-0000-0000-0000-000000000002', 'user');

insert into public.scoring_runs (id, race_id, version, input_fingerprint, scored_by, scored_entry_count) values
  ('a8000000-0000-4000-8000-000000000031', 'a8000000-0000-4000-8000-000000000011', 1, repeat('a', 64), 'a8000000-0000-0000-0000-000000000003', 3),
  ('a8000000-0000-4000-8000-000000000032', 'a8000000-0000-4000-8000-000000000012', 1, repeat('b', 64), 'a8000000-0000-0000-0000-000000000003', 1);
insert into public.prediction_scores (entry_id, score_run_id, score) values
  ('a8000000-0000-4000-8000-000000000021', 'a8000000-0000-4000-8000-000000000031', 5),
  ('a8000000-0000-4000-8000-000000000022', 'a8000000-0000-4000-8000-000000000031', 7),
  ('a8000000-0000-4000-8000-000000000023', 'a8000000-0000-4000-8000-000000000032', 6),
  ('a8000000-0000-4000-8000-000000000024', 'a8000000-0000-4000-8000-000000000031', 7);

set local role anon;
select lives_ok($$select * from public.get_public_host_championship(2099)$$, 'anon can read the homepage totals');
select is((select count(*) from public.get_public_host_championship(2099)), 2::bigint, 'only the two mapped hosts are returned');
select is((select string_agg(host_name, ',' order by host_name) from public.get_public_host_championship(2099)), 'Kasun,Lakindu', 'only public Host names are returned');
select is((select total_score from public.get_public_host_championship(2099) where host_name = 'Lakindu'), 5::bigint, 'Lakindu receives only the published Host score');
select is((select total_score from public.get_public_host_championship(2099) where host_name = 'Kasun'), 7::bigint, 'Kasun receives only the published Host score');
select is((select races_scored from public.get_public_host_championship(2099) where host_name = 'Lakindu'), 1::bigint, 'unpublished Host scores are excluded');
select is((select races_scored from public.get_public_host_championship(2099) where host_name = 'Kasun'), 1::bigint, 'fan entries are excluded from Host totals');
select is((select sum(total_score) from public.get_public_host_championship(2099)), 12::numeric, 'the public total contains no fan or unpublished points');
select is((select sum(races_scored) from public.get_public_host_championship(2099)), 2::numeric, 'the public race count includes published Host entries only');
select is((select count(*) from public.get_public_host_championship(2098)), 2::bigint, 'mapped hosts remain visible before their first published score');
reset role;

select * from finish();
rollback;
