-- Restricted user directory and role assignment for the admin control centre.

create table public.user_access_history (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null references auth.users(id) on delete cascade,
  changed_by uuid not null references auth.users(id) on delete restrict,
  previous_roles text[] not null,
  new_roles text[] not null,
  previous_host_name text,
  new_host_name text,
  changed_at timestamptz not null default now()
);

alter table public.user_access_history enable row level security;

create policy user_access_history_super_admin_select
on public.user_access_history
for select
to authenticated
using (public.has_role('super_admin'::public.app_role));

create or replace function public.admin_list_users()
returns table (
  user_id uuid,
  display_name text,
  email text,
  avatar_url text,
  joined_at timestamptz,
  email_confirmed boolean,
  roles text[],
  host_name text,
  total_points bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (
    public.has_role('admin'::public.app_role)
    or public.has_role('super_admin'::public.app_role)
  ) then
    raise exception 'ADMIN_ROLE_REQUIRED';
  end if;

  return query
  select
    profile.id,
    profile.display_name,
    auth_user.email::text,
    profile.avatar_url,
    profile.created_at,
    auth_user.email_confirmed_at is not null,
    coalesce(
      (select array_agg(user_role.role::text order by user_role.role::text)
       from public.user_roles as user_role
       where user_role.user_id = profile.id),
      array['user']::text[]
    ),
    (select host.host_name from public.host_profiles as host where host.user_id = profile.id),
    coalesce(
      (select sum(score.score)::bigint
       from public.prediction_scores as score
       join public.prediction_entries as entry on entry.id = score.entry_id
       join public.races as race on race.id = entry.race_id
       where entry.user_id = profile.id
         and entry.competition = 'user'::public.prediction_competition
         and race.status = 'published'::public.race_status),
      0::bigint
    )
  from public.profiles as profile
  join auth.users as auth_user on auth_user.id = profile.id
  order by profile.created_at desc, profile.display_name;
end;
$$;

create or replace function public.admin_update_user_access(
  p_user_id uuid,
  p_admin_access boolean,
  p_host_name text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_host_name text := nullif(btrim(p_host_name), '');
  previous_roles text[];
  updated_roles text[];
  previous_host_name text;
begin
  if current_user_id is null
    or not public.has_role('super_admin'::public.app_role)
  then
    raise exception 'SUPER_ADMIN_ROLE_REQUIRED';
  end if;

  if p_user_id is null or not exists(select 1 from public.profiles where id = p_user_id) then
    raise exception 'USER_NOT_FOUND';
  end if;

  if p_admin_access is null then
    raise exception 'ADMIN_ACCESS_REQUIRED';
  end if;

  if normalized_host_name is not null
    and normalized_host_name not in ('Lakindu', 'Kasun')
  then
    raise exception 'INVALID_HOST_NAME';
  end if;

  if normalized_host_name is not null and not p_admin_access then
    raise exception 'HOST_REQUIRES_ADMIN_ACCESS';
  end if;

  if normalized_host_name is not null and exists (
    select 1 from public.host_profiles
    where host_name = normalized_host_name and user_id <> p_user_id
  ) then
    raise exception 'HOST_NAME_ALREADY_ASSIGNED';
  end if;

  select coalesce(array_agg(role::text order by role::text), array[]::text[])
  into previous_roles
  from public.user_roles
  where user_id = p_user_id;

  select host_name into previous_host_name
  from public.host_profiles
  where user_id = p_user_id;

  insert into public.user_roles (user_id, role)
  values (p_user_id, 'user'::public.app_role)
  on conflict (user_id, role) do nothing;

  if p_admin_access then
    insert into public.user_roles (user_id, role)
    values (p_user_id, 'admin'::public.app_role)
    on conflict (user_id, role) do nothing;
  else
    delete from public.user_roles
    where user_id = p_user_id and role = 'admin'::public.app_role;
  end if;

  if normalized_host_name is null then
    delete from public.host_profiles where user_id = p_user_id;
    delete from public.user_roles
    where user_id = p_user_id and role = 'host'::public.app_role;
  else
    insert into public.user_roles (user_id, role)
    values (p_user_id, 'host'::public.app_role)
    on conflict (user_id, role) do nothing;

    insert into public.host_profiles (user_id, host_name)
    values (p_user_id, normalized_host_name)
    on conflict (user_id) do update set host_name = excluded.host_name;
  end if;

  select coalesce(array_agg(role::text order by role::text), array[]::text[])
  into updated_roles
  from public.user_roles
  where user_id = p_user_id;

  if previous_roles is distinct from updated_roles
    or previous_host_name is distinct from normalized_host_name
  then
    insert into public.user_access_history (
      target_user_id, changed_by, previous_roles, new_roles,
      previous_host_name, new_host_name
    ) values (
      p_user_id, current_user_id, previous_roles, updated_roles,
      previous_host_name, normalized_host_name
    );
  end if;
end;
$$;

revoke all on table public.user_access_history from public, anon, authenticated;
grant select on table public.user_access_history to authenticated;
grant all on table public.user_access_history to service_role;

revoke all on function public.admin_list_users() from public, anon;
revoke all on function public.admin_update_user_access(uuid, boolean, text) from public, anon;
grant execute on function public.admin_list_users() to authenticated, service_role;
grant execute on function public.admin_update_user_access(uuid, boolean, text) to authenticated, service_role;
