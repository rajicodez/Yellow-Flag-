-- Guarded administrator overrides for calendar corrections and immediate closure.

create table if not exists public.race_admin_events (
  id bigint generated always as identity primary key,
  race_id uuid not null references public.races(id) on delete cascade,
  event_type text not null,
  previous_values jsonb not null default '{}'::jsonb,
  new_values jsonb not null default '{}'::jsonb,
  changed_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.race_admin_events enable row level security;
create policy race_admin_events_admin_select
on public.race_admin_events for select to authenticated
using (public.is_prediction_admin());

create or replace function public.admin_override_race(
  p_race_id uuid,
  p_season_year integer,
  p_season_name text,
  p_round_number integer,
  p_slug text,
  p_race_name text,
  p_circuit_name text,
  p_country_code text,
  p_opens_at timestamptz,
  p_closes_at timestamptz,
  p_race_starts_at timestamptz,
  p_status public.race_status
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_race public.races%rowtype;
  selected_season_id uuid;
  has_submissions boolean;
  configured_question_count integer;
begin
  if auth.uid() is null or not public.is_prediction_admin() then raise exception 'ADMIN_ROLE_REQUIRED'; end if;
  if p_race_id is null then raise exception 'RACE_NOT_FOUND'; end if;
  if p_season_year < 2020 or p_season_year > 2100 or p_round_number < 1 then raise exception 'INVALID_RACE_IDENTITY'; end if;
  if btrim(coalesce(p_race_name, '')) = '' or btrim(coalesce(p_circuit_name, '')) = '' then raise exception 'RACE_TEXT_FIELDS_REQUIRED'; end if;
  if coalesce(p_slug, '') !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then raise exception 'INVALID_RACE_SLUG'; end if;
  if upper(coalesce(p_country_code, '')) !~ '^[A-Z]{2}$' then raise exception 'INVALID_COUNTRY_CODE'; end if;
  if p_opens_at is null or p_closes_at is null or p_race_starts_at is null or not (p_opens_at < p_closes_at and p_closes_at < p_race_starts_at) then raise exception 'INVALID_RACE_TIME_ORDER'; end if;
  if p_status not in ('draft'::public.race_status, 'open'::public.race_status, 'locked'::public.race_status) then raise exception 'RACE_STATUS_MANAGED_BY_RESULTS_FLOW'; end if;

  select * into selected_race from public.races where id = p_race_id for update;
  if not found then raise exception 'RACE_NOT_FOUND'; end if;
  if selected_race.status in ('scored'::public.race_status, 'published'::public.race_status) then raise exception 'COMPLETED_RACE_IMMUTABLE'; end if;

  insert into public.seasons(year, name, is_active)
  values (p_season_year, btrim(p_season_name), true)
  on conflict (year) do update set name = excluded.name
  returning id into selected_season_id;

  select exists(select 1 from public.prediction_entries where race_id = p_race_id) into has_submissions;
  if has_submissions and (selected_race.season_id <> selected_season_id or selected_race.round_number <> p_round_number or selected_race.slug <> p_slug) then
    raise exception 'CORE_RACE_IDENTITY_LOCKED_AFTER_SUBMISSIONS';
  end if;

  if p_status = 'open'::public.race_status then
    select count(*)::integer into configured_question_count
    from public.race_questions as question
    where question.race_id = p_race_id and question.is_active
      and exists (select 1 from public.race_question_options as option where option.question_id = question.id and option.is_active);
    if configured_question_count <> 7 then raise exception 'SEVEN_CONFIGURED_QUESTIONS_REQUIRED_TO_OPEN'; end if;
  end if;

  insert into public.race_admin_events(race_id, event_type, previous_values, new_values, changed_by)
  values (
    p_race_id, 'race_override',
    jsonb_build_object('race_name', selected_race.race_name, 'circuit_name', selected_race.circuit_name, 'country_code', selected_race.country_code, 'opens_at', selected_race.opens_at, 'closes_at', selected_race.closes_at, 'race_starts_at', selected_race.race_starts_at, 'status', selected_race.status),
    jsonb_build_object('race_name', btrim(p_race_name), 'circuit_name', btrim(p_circuit_name), 'country_code', upper(p_country_code), 'opens_at', p_opens_at, 'closes_at', p_closes_at, 'race_starts_at', p_race_starts_at, 'status', p_status),
    auth.uid()
  );

  update public.races set
    season_id = selected_season_id, round_number = p_round_number, slug = p_slug,
    race_name = btrim(p_race_name), circuit_name = btrim(p_circuit_name), country_code = upper(p_country_code),
    opens_at = p_opens_at, closes_at = p_closes_at, race_starts_at = p_race_starts_at,
    status = p_status, updated_at = clock_timestamp()
  where id = p_race_id;

  return jsonb_build_object('race_id', p_race_id, 'status', p_status, 'has_submissions', has_submissions);
end;
$$;

create or replace function public.admin_close_race_now(p_race_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_race public.races%rowtype;
  closed_at timestamptz := clock_timestamp();
begin
  if auth.uid() is null or not public.is_prediction_admin() then raise exception 'ADMIN_ROLE_REQUIRED'; end if;
  select * into selected_race from public.races where id = p_race_id for update;
  if not found then raise exception 'RACE_NOT_FOUND'; end if;
  if selected_race.status <> 'open'::public.race_status then raise exception 'ONLY_OPEN_RACES_CAN_BE_CLOSED'; end if;

  insert into public.race_admin_events(race_id, event_type, previous_values, new_values, changed_by)
  values (p_race_id, 'closed_now', jsonb_build_object('status', selected_race.status, 'opens_at', selected_race.opens_at, 'closes_at', selected_race.closes_at), jsonb_build_object('status', 'locked', 'closes_at', closed_at), auth.uid());

  update public.races
  set opens_at = least(opens_at, closed_at - interval '1 second'),
      closes_at = closed_at,
      status = 'locked'::public.race_status,
      updated_at = closed_at
  where id = p_race_id;

  return jsonb_build_object('race_id', p_race_id, 'status', 'locked', 'closed_at', closed_at);
end;
$$;

create or replace function public.admin_open_race_now(p_race_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_race public.races%rowtype;
  opened_at timestamptz := clock_timestamp();
  effective_close timestamptz;
  configured_question_count integer;
begin
  if auth.uid() is null or not public.is_prediction_admin() then raise exception 'ADMIN_ROLE_REQUIRED'; end if;
  select * into selected_race from public.races where id = p_race_id for update;
  if not found then raise exception 'RACE_NOT_FOUND'; end if;
  if selected_race.status in ('scored'::public.race_status, 'published'::public.race_status) then raise exception 'COMPLETED_RACE_IMMUTABLE'; end if;

  select count(*)::integer into configured_question_count
  from public.race_questions as question
  where question.race_id = p_race_id and question.is_active
    and exists (select 1 from public.race_question_options as option where option.question_id = question.id and option.is_active);
  if configured_question_count <> 7 then raise exception 'SEVEN_CONFIGURED_QUESTIONS_REQUIRED_TO_OPEN'; end if;

  effective_close := case when selected_race.closes_at > opened_at then selected_race.closes_at else opened_at + interval '30 minutes' end;
  insert into public.race_admin_events(race_id, event_type, previous_values, new_values, changed_by)
  values (p_race_id, 'opened_now', jsonb_build_object('status', selected_race.status, 'opens_at', selected_race.opens_at, 'closes_at', selected_race.closes_at), jsonb_build_object('status', 'open', 'opens_at', opened_at, 'closes_at', effective_close), auth.uid());

  update public.races
  set opens_at = opened_at,
      closes_at = effective_close,
      race_starts_at = greatest(race_starts_at, effective_close + interval '1 hour'),
      status = 'open'::public.race_status,
      updated_at = opened_at
  where id = p_race_id;

  return jsonb_build_object('race_id', p_race_id, 'status', 'open', 'opened_at', opened_at, 'closes_at', effective_close);
end;
$$;

revoke all on table public.race_admin_events from public, anon;
grant select on table public.race_admin_events to authenticated, service_role;
grant all on table public.race_admin_events to service_role;
revoke all on function public.admin_override_race(uuid, integer, text, integer, text, text, text, text, timestamptz, timestamptz, timestamptz, public.race_status) from public, anon;
grant execute on function public.admin_override_race(uuid, integer, text, integer, text, text, text, text, timestamptz, timestamptz, timestamptz, public.race_status) to authenticated, service_role;
revoke all on function public.admin_close_race_now(uuid) from public, anon;
grant execute on function public.admin_close_race_now(uuid) to authenticated, service_role;
revoke all on function public.admin_open_race_now(uuid) from public, anon;
grant execute on function public.admin_open_race_now(uuid) to authenticated, service_role;

notify pgrst, 'reload schema';
