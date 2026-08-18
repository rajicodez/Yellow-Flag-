-- Verifies the captured live baseline and local-only Dutch GP seed.
-- All synthetic users and predictions are rolled back.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(39);

select is(
  (select string_agg(enum_value.enumlabel::text, ',' order by enum_value.enumsortorder)
   from pg_type as enum_type
   join pg_enum as enum_value on enum_value.enumtypid = enum_type.oid
   where enum_type.oid = 'public.app_role'::regtype),
  'user,host,admin,super_admin',
  'live app_role enum values are preserved'
);
select is(
  (select string_agg(enum_value.enumlabel::text, ',' order by enum_value.enumsortorder)
   from pg_type as enum_type
   join pg_enum as enum_value on enum_value.enumtypid = enum_type.oid
   where enum_type.oid = 'public.prediction_answer_type'::regtype),
  'driver,constructor',
  'live prediction_answer_type enum values are preserved'
);
select is(
  (select string_agg(enum_value.enumlabel::text, ',' order by enum_value.enumsortorder)
   from pg_type as enum_type
   join pg_enum as enum_value on enum_value.enumtypid = enum_type.oid
   where enum_type.oid = 'public.prediction_competition'::regtype),
  'user,host',
  'live prediction_competition enum values are preserved'
);
select is(
  (select string_agg(enum_value.enumlabel::text, ',' order by enum_value.enumsortorder)
   from pg_type as enum_type
   join pg_enum as enum_value on enum_value.enumtypid = enum_type.oid
   where enum_type.oid = 'public.race_status'::regtype),
  'draft,open,locked,scored,published',
  'live race_status enum values are preserved'
);

select has_table('public', 'seasons', 'seasons exists');
select has_table('public', 'races', 'races exists');
select has_table('public', 'race_questions', 'race_questions exists');
select has_table('public', 'race_question_options', 'race_question_options exists');
select has_table('public', 'profiles', 'profiles exists');
select has_table('public', 'user_roles', 'user_roles exists');
select has_table('public', 'host_profiles', 'host_profiles exists');
select has_table('public', 'prediction_entries', 'prediction_entries exists');
select has_table('public', 'prediction_answers', 'prediction_answers exists');

select ok((select relrowsecurity from pg_class where oid = 'public.seasons'::regclass), 'RLS is enabled on seasons');
select ok((select relrowsecurity from pg_class where oid = 'public.races'::regclass), 'RLS is enabled on races');
select ok((select relrowsecurity from pg_class where oid = 'public.race_questions'::regclass), 'RLS is enabled on race_questions');
select ok((select relrowsecurity from pg_class where oid = 'public.race_question_options'::regclass), 'RLS is enabled on race_question_options');
select ok((select relrowsecurity from pg_class where oid = 'public.profiles'::regclass), 'RLS is enabled on profiles');
select ok((select relrowsecurity from pg_class where oid = 'public.user_roles'::regclass), 'RLS is enabled on user_roles');
select ok((select relrowsecurity from pg_class where oid = 'public.host_profiles'::regclass), 'RLS is enabled on host_profiles');
select ok((select relrowsecurity from pg_class where oid = 'public.prediction_answers'::regclass), 'RLS is enabled on prediction_answers');

select ok(
  (select procedure.prosecdef
     and coalesce(procedure.proconfig, array[]::text[]) @> array['search_path=""']::text[]
   from pg_proc as procedure
   where procedure.oid = to_regprocedure(
     'public.submit_prediction(text,public.prediction_competition,jsonb)'
   )),
  'submit_prediction is SECURITY DEFINER with an empty search_path'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.submit_prediction(text,public.prediction_competition,jsonb)',
    'EXECUTE'
  ),
  'authenticated can execute submit_prediction'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.submit_prediction(text,public.prediction_competition,jsonb)',
    'EXECUTE'
  ),
  'anon cannot execute submit_prediction'
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
  not has_table_privilege('authenticated', 'public.prediction_entries', 'INSERT'),
  'authenticated cannot insert prediction entries directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.prediction_answers', 'INSERT'),
  'authenticated cannot insert prediction answers directly'
);

select is(
  (select closes_at from public.races where slug = '2026-dutch-grand-prix'),
  '2026-08-21 10:30:00+00'::timestamptz,
  'local seed preserves the verified Dutch GP FP1 close time'
);
select is(
  (select string_agg(question.question_key, ',' order by question.question_key)
   from public.race_questions as question
   join public.races as race on race.id = question.race_id
   where race.slug = '2026-dutch-grand-prix'
     and question.is_active = true),
  'driver_of_the_day,p2_finisher,p3_finisher,pole_position,race_winner,top_constructor,worst_constructor',
  'local seed contains exactly the seven live question keys'
);
select is(
  (select count(*)
   from public.race_question_options as option
   join public.race_questions as question on question.id = option.question_id
   join public.races as race on race.id = question.race_id
   where race.slug = '2026-dutch-grand-prix'
     and option.is_active = true),
  132::bigint,
  'local seed contains the 132 live option rows'
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
values
  (
    '00000000-0000-0000-0000-000000000000',
    'f0000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'baseline-fan@example.test',
    '',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Baseline Fan"}',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'f0000000-0000-0000-0000-000000000002',
    'authenticated',
    'authenticated',
    'baseline-host@example.test',
    '',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Baseline Host"}',
    now(),
    now()
  );

insert into public.profiles (id, display_name)
values
  ('f0000000-0000-0000-0000-000000000001', 'Baseline Fan'),
  ('f0000000-0000-0000-0000-000000000002', 'Baseline Host')
on conflict (id) do update set display_name = excluded.display_name;

insert into public.user_roles (user_id, role)
values
  ('f0000000-0000-0000-0000-000000000001', 'user'::public.app_role),
  ('f0000000-0000-0000-0000-000000000002', 'user'::public.app_role),
  ('f0000000-0000-0000-0000-000000000002', 'host'::public.app_role)
on conflict (user_id, role) do nothing;

insert into public.host_profiles (user_id, host_name)
values ('f0000000-0000-0000-0000-000000000002', 'Lakindu')
on conflict (user_id) do update set host_name = excluded.host_name;

update public.races
set opens_at = clock_timestamp() - interval '1 hour',
    closes_at = clock_timestamp() + interval '2 hours',
    race_starts_at = clock_timestamp() + interval '2 days',
    status = 'open'::public.race_status
where slug = '2026-dutch-grand-prix';

set local role authenticated;
select set_config('request.jwt.claim.sub', 'f0000000-0000-0000-0000-000000000001', true);
select throws_ok(
  $$select * from public.submit_prediction(
    '2026-dutch-grand-prix',
    'host'::public.prediction_competition,
    '{"pole_position":"Lando Norris","race_winner":"Max Verstappen","p2_finisher":"Oscar Piastri","p3_finisher":"George Russell","driver_of_the_day":"Charles Leclerc","top_constructor":"McLaren Formula 1 Team","worst_constructor":"Cadillac Formula 1 Team"}'::jsonb
  )$$,
  'P0001',
  'This account is not authorized for host predictions.',
  'a Fan cannot submit to the Host competition'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'f0000000-0000-0000-0000-000000000002', true);
select lives_ok(
  $$select * from public.submit_prediction(
    '2026-dutch-grand-prix',
    'host'::public.prediction_competition,
    '{"pole_position":"Lando Norris","race_winner":"Max Verstappen","p2_finisher":"Oscar Piastri","p3_finisher":"George Russell","driver_of_the_day":"Charles Leclerc","top_constructor":"McLaren Formula 1 Team","worst_constructor":"Cadillac Formula 1 Team"}'::jsonb
  )$$,
  'an authorized Host can submit to the Host competition'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'f0000000-0000-0000-0000-000000000001', true);
select lives_ok(
  $$select * from public.submit_prediction(
    '2026-dutch-grand-prix',
    'user'::public.prediction_competition,
    '{"pole_position":"Lewis Hamilton","race_winner":"Max Verstappen","p2_finisher":"Oscar Piastri","p3_finisher":"George Russell","driver_of_the_day":"Charles Leclerc","top_constructor":"McLaren Formula 1 Team","worst_constructor":"Cadillac Formula 1 Team"}'::jsonb
  )$$,
  'a Fan can submit to the user competition'
);
reset role;

select is(
  (select count(*) from public.prediction_entries
   where user_id = 'f0000000-0000-0000-0000-000000000002'
     and competition = 'host'::public.prediction_competition),
  1::bigint,
  'Host submission creates exactly one Host entry'
);
select is(
  (select count(*)
   from public.prediction_answers as answer
   join public.prediction_entries as entry on entry.id = answer.entry_id
   where entry.user_id = 'f0000000-0000-0000-0000-000000000002'
     and entry.competition = 'host'::public.prediction_competition),
  7::bigint,
  'Host submission creates exactly seven answers'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'f0000000-0000-0000-0000-000000000001', true);
select is((select count(*) from public.prediction_entries), 1::bigint, 'RLS exposes only the Fan entry');
select is((select count(*) from public.prediction_answers), 7::bigint, 'RLS exposes only the Fan answers');
select is((select count(*) from public.host_profiles), 0::bigint, 'RLS hides Host profiles from a Fan');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'f0000000-0000-0000-0000-000000000002', true);
select is((select count(*) from public.host_profiles), 1::bigint, 'RLS exposes the Host own profile');
reset role;

select * from finish();

rollback;
