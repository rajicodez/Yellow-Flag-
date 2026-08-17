-- A schema-only production baseline cannot reliably reproduce triggers owned by
-- the managed auth schema. Restore that boundary explicitly and backfill users
-- who signed in before the trigger was present.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (
    id,
    display_name,
    avatar_url
  )
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      nullif(split_part(new.email, '@', 1), ''),
      'Yellow Flag User'
    ),
    coalesce(
      nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
      nullif(new.raw_user_meta_data ->> 'picture', '')
    )
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'user'::public.app_role)
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;

alter function public.handle_new_auth_user() owner to postgres;
revoke all on function public.handle_new_auth_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists on_auth_user_created_prediction_profile on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

insert into public.profiles (
  id,
  display_name,
  avatar_url
)
select
  auth_user.id,
  coalesce(
    nullif(auth_user.raw_user_meta_data ->> 'full_name', ''),
    nullif(auth_user.raw_user_meta_data ->> 'name', ''),
    nullif(split_part(auth_user.email, '@', 1), ''),
    'Yellow Flag User'
  ),
  coalesce(
    nullif(auth_user.raw_user_meta_data ->> 'avatar_url', ''),
    nullif(auth_user.raw_user_meta_data ->> 'picture', '')
  )
from auth.users as auth_user
on conflict (id) do nothing;

insert into public.user_roles (user_id, role)
select auth_user.id, 'user'::public.app_role
from auth.users as auth_user
on conflict (user_id, role) do nothing;

comment on function public.handle_new_auth_user() is
  'Creates the public profile and baseline user role for every new Supabase Auth user.';
