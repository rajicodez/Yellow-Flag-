-- Verifies the restricted user directory, Super Admin mutations, host pairing, and audit trail.
-- Every fixture is rolled back.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(33);

select has_table('public', 'user_access_history', 'user access audit table exists');
select ok((select relrowsecurity from pg_class where oid = 'public.user_access_history'::regclass), 'user access audit table has RLS enabled');
select has_function('public', 'admin_list_users', array[]::text[], 'admin_list_users exists');
select has_function('public', 'admin_update_user_access', array['uuid', 'boolean', 'text'], 'admin_update_user_access exists');
select ok(
  (select procedure.prosecdef and coalesce(procedure.proconfig, array[]::text[]) @> array['search_path=""']::text[]
   from pg_proc as procedure where procedure.oid = to_regprocedure('public.admin_list_users()')),
  'admin_list_users is SECURITY DEFINER with an empty search path'
);
select ok(
  (select procedure.prosecdef and coalesce(procedure.proconfig, array[]::text[]) @> array['search_path=""']::text[]
   from pg_proc as procedure where procedure.oid = to_regprocedure('public.admin_update_user_access(uuid,boolean,text)')),
  'admin_update_user_access is SECURITY DEFINER with an empty search path'
);
select ok(has_function_privilege('authenticated', 'public.admin_list_users()', 'EXECUTE'), 'authenticated may call the guarded directory');
select ok(has_function_privilege('authenticated', 'public.admin_update_user_access(uuid,boolean,text)', 'EXECUTE'), 'authenticated may call the guarded access mutation');
select ok(not has_function_privilege('anon', 'public.admin_list_users()', 'EXECUTE'), 'anon cannot call the user directory');
select ok(not has_function_privilege('anon', 'public.admin_update_user_access(uuid,boolean,text)', 'EXECUTE'), 'anon cannot call the access mutation');
select ok(not has_table_privilege('authenticated', 'public.user_access_history', 'INSERT'), 'authenticated cannot forge access audit records');

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('00000000-0000-0000-0000-000000000000', 'a7000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'super@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Super Admin"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a7000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'admin@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Admin User"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a7000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'fan@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Fan User"}', now(), now());

insert into public.user_roles (user_id, role)
values
  ('a7000000-0000-0000-0000-000000000001', 'super_admin'::public.app_role),
  ('a7000000-0000-0000-0000-000000000002', 'admin'::public.app_role)
on conflict (user_id, role) do nothing;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a7000000-0000-0000-0000-000000000003', true);
select throws_ok(
  $$select * from public.admin_list_users()$$,
  'P0001', 'ADMIN_ROLE_REQUIRED', 'a Fan cannot read the administrator directory'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a7000000-0000-0000-0000-000000000002', true);
select lives_ok($$select * from public.admin_list_users()$$, 'an Admin can read the directory');
select is((select count(*) from public.admin_list_users()), 3::bigint, 'the directory returns all three test accounts');
select throws_ok(
  $$select public.admin_update_user_access('a7000000-0000-0000-0000-000000000003', true, null)$$,
  'P0001', 'SUPER_ADMIN_ROLE_REQUIRED', 'an Admin cannot change user access'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a7000000-0000-0000-0000-000000000001', true);
select throws_ok(
  $$select public.admin_update_user_access('a7000000-0000-0000-0000-000000000099', true, null)$$,
  'P0001', 'USER_NOT_FOUND', 'an unknown user is rejected'
);
select throws_ok(
  $$select public.admin_update_user_access('a7000000-0000-0000-0000-000000000003', true, 'Unknown Host')$$,
  'P0001', 'INVALID_HOST_NAME', 'an unknown host identity is rejected'
);
select throws_ok(
  $$select public.admin_update_user_access('a7000000-0000-0000-0000-000000000003', false, 'Lakindu')$$,
  'P0001', 'HOST_REQUIRES_ADMIN_ACCESS', 'a Host must also receive Admin access'
);
select lives_ok(
  $$select public.admin_update_user_access('a7000000-0000-0000-0000-000000000003', true, 'Lakindu')$$,
  'a Super Admin grants the paired Admin and Host access'
);
reset role;

select is((select count(*) from public.user_roles where user_id = 'a7000000-0000-0000-0000-000000000003' and role = 'admin'), 1::bigint, 'the target receives Admin access');
select is((select count(*) from public.user_roles where user_id = 'a7000000-0000-0000-0000-000000000003' and role = 'host'), 1::bigint, 'the target receives Host access');
select is((select host_name from public.host_profiles where user_id = 'a7000000-0000-0000-0000-000000000003'), 'Lakindu', 'the Host identity is stored');
select is((select count(*) from public.user_access_history where target_user_id = 'a7000000-0000-0000-0000-000000000003'), 1::bigint, 'the access grant is audited once');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a7000000-0000-0000-0000-000000000002', true);
select is((select host_name from public.admin_list_users() where user_id = 'a7000000-0000-0000-0000-000000000003'), 'Lakindu', 'the directory reports the Host identity');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a7000000-0000-0000-0000-000000000001', true);
select throws_ok(
  $$select public.admin_update_user_access('a7000000-0000-0000-0000-000000000002', true, 'Lakindu')$$,
  'P0001', 'HOST_NAME_ALREADY_ASSIGNED', 'one Host identity cannot be assigned to two accounts'
);
select lives_ok(
  $$select public.admin_update_user_access('a7000000-0000-0000-0000-000000000003', true, 'Lakindu')$$,
  'repeating an identical assignment is idempotent'
);
reset role;

select is((select count(*) from public.user_access_history where target_user_id = 'a7000000-0000-0000-0000-000000000003'), 1::bigint, 'an idempotent assignment creates no duplicate audit record');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a7000000-0000-0000-0000-000000000001', true);
select lives_ok(
  $$select public.admin_update_user_access('a7000000-0000-0000-0000-000000000003', false, null)$$,
  'a Super Admin removes Admin and Host access together'
);
reset role;

select is((select count(*) from public.user_roles where user_id = 'a7000000-0000-0000-0000-000000000003' and role = 'admin'), 0::bigint, 'Admin access is removed');
select is((select count(*) from public.user_roles where user_id = 'a7000000-0000-0000-0000-000000000003' and role = 'host'), 0::bigint, 'Host access is removed');
select is((select count(*) from public.host_profiles where user_id = 'a7000000-0000-0000-0000-000000000003'), 0::bigint, 'the Host profile is removed');
select is((select count(*) from public.user_roles where user_id = 'a7000000-0000-0000-0000-000000000003' and role = 'user'), 1::bigint, 'the baseline User role is preserved');
select is((select count(*) from public.user_access_history where target_user_id = 'a7000000-0000-0000-0000-000000000003'), 2::bigint, 'the access removal is audited');

select * from finish();
rollback;
