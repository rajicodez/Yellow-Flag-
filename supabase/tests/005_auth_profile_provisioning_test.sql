-- Verifies that a fresh Supabase Auth user is provisioned for predictions and
-- leaderboards. All synthetic data is rolled back.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(7);

select is(
  (select count(*)
   from pg_trigger
   where tgrelid = 'auth.users'::regclass
     and tgname = 'on_auth_user_created'
     and not tgisinternal),
  1::bigint,
  'auth.users has exactly one Yellow Flag provisioning trigger'
);

select ok(
  (select procedure.prosecdef
     and coalesce(procedure.proconfig, array[]::text[]) @> array['search_path=""']::text[]
   from pg_proc as procedure
   where procedure.oid = to_regprocedure('public.handle_new_auth_user()')),
  'profile provisioning is SECURITY DEFINER with an empty search_path'
);

select ok(
  not has_function_privilege('authenticated', 'public.handle_new_auth_user()', 'EXECUTE'),
  'authenticated clients cannot invoke the trigger function directly'
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
  'f5000000-0000-0000-0000-000000000001',
  'authenticated',
  'authenticated',
  'profile-trigger@example.test',
  '',
  now(),
  '{"provider":"google","providers":["google"]}',
  '{"full_name":"Trigger Test Fan","avatar_url":"https://example.test/avatar.png"}',
  now(),
  now()
);

select is(
  (select display_name from public.profiles
   where id = 'f5000000-0000-0000-0000-000000000001'),
  'Trigger Test Fan',
  'new Auth user receives the Google display name'
);

select is(
  (select avatar_url from public.profiles
   where id = 'f5000000-0000-0000-0000-000000000001'),
  'https://example.test/avatar.png',
  'new Auth user receives the Google avatar URL'
);

select is(
  (select count(*) from public.user_roles
   where user_id = 'f5000000-0000-0000-0000-000000000001'
     and role = 'user'::public.app_role),
  1::bigint,
  'new Auth user receives exactly one baseline user role'
);

select is(
  (select count(*) from public.user_roles
   where user_id = 'f5000000-0000-0000-0000-000000000001'
     and role in ('admin'::public.app_role, 'super_admin'::public.app_role)),
  0::bigint,
  'profile provisioning never grants an administrative role'
);

select * from finish();

rollback;
