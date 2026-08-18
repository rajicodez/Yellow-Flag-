-- Isolated rehearsal races for end-to-end testing without affecting season totals.

alter table public.races
add column if not exists is_demo boolean not null default false;

create or replace function public.admin_create_demo_race(
  p_race_name text,
  p_opens_at timestamptz,
  p_closes_at timestamptz,
  p_questions jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_round integer;
  demo_slug text;
  saved_race jsonb;
  saved_race_id uuid;
begin
  if auth.uid() is null or not public.is_prediction_admin() then
    raise exception 'ADMIN_ROLE_REQUIRED';
  end if;
  if btrim(coalesce(p_race_name, '')) = '' or char_length(btrim(p_race_name)) > 80 then
    raise exception 'INVALID_DEMO_RACE_NAME';
  end if;
  if p_opens_at is null or p_closes_at is null or p_opens_at >= p_closes_at then
    raise exception 'INVALID_RACE_TIME_ORDER';
  end if;

  -- Serializes demo numbering so two admins cannot claim the same synthetic round.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('yellow-flag-demo-race'));
  select greatest(coalesce(max(round_number) filter (where round_number >= 900), 899) + 1, 900)
  into next_round
  from public.races as race
  join public.seasons as season on season.id = race.season_id
  where season.year = 2026;

  demo_slug := '2026-demo-grand-prix-' || pg_catalog.to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS');
  saved_race := public.admin_upsert_race(
    null,
    2026,
    '2026 Formula 1 World Championship',
    next_round,
    demo_slug,
    btrim(p_race_name),
    'Demo Circuit',
    'LK',
    p_opens_at,
    p_closes_at,
    p_closes_at + interval '1 hour',
    'draft'::public.race_status
  );
  saved_race_id := (saved_race ->> 'race_id')::uuid;

  perform public.admin_save_race_questions(saved_race_id, p_questions);

  update public.races
  set is_demo = true,
      status = 'open'::public.race_status,
      updated_at = clock_timestamp()
  where id = saved_race_id;

  return jsonb_build_object(
    'race_id', saved_race_id,
    'race_name', btrim(p_race_name),
    'slug', demo_slug,
    'round_number', next_round,
    'status', 'open',
    'question_count', 7,
    'is_demo', true
  );
end;
$$;

revoke all on function public.admin_create_demo_race(text, timestamptz, timestamptz, jsonb) from public, anon;
grant execute on function public.admin_create_demo_race(text, timestamptz, timestamptz, jsonb) to authenticated, service_role;

create or replace view public.season_prediction_leaderboard
with (security_barrier = true, security_invoker = false)
as
with season_totals as (
  select
    season.id as season_id,
    season.year as season_year,
    entry.competition,
    entry.user_id,
    profile.display_name,
    profile.avatar_url,
    count(*)::integer as races_entered,
    sum(score.score)::integer as total_score,
    count(*) filter (where score.score = 7)::integer as score_7_count,
    count(*) filter (where score.score = 6)::integer as score_6_count,
    count(*) filter (where score.score = 5)::integer as score_5_count,
    count(*) filter (where score.score = 4)::integer as score_4_count,
    count(*) filter (where score.score = 3)::integer as score_3_count,
    count(*) filter (where score.score = 2)::integer as score_2_count,
    count(*) filter (where score.score = 1)::integer as score_1_count
  from public.prediction_scores as score
  join public.prediction_entries as entry on entry.id = score.entry_id
  join public.races as race on race.id = entry.race_id
  join public.seasons as season on season.id = race.season_id
  join public.profiles as profile on profile.id = entry.user_id
  where race.status = 'published'::public.race_status
    and not race.is_demo
  group by season.id, season.year, entry.competition, entry.user_id, profile.display_name, profile.avatar_url
)
select
  season_id,
  season_year,
  competition,
  rank() over (
    partition by season_id, competition
    order by total_score desc, score_7_count desc, score_6_count desc, score_5_count desc,
      score_4_count desc, score_3_count desc, score_2_count desc, score_1_count desc
  ) as rank,
  user_id,
  display_name,
  avatar_url,
  races_entered,
  total_score,
  score_7_count,
  score_6_count,
  score_5_count,
  score_4_count,
  score_3_count,
  score_2_count,
  score_1_count
from season_totals;

create or replace function public.get_public_host_championship(p_season_year integer)
returns table (host_name text, total_score bigint, races_scored bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_season_year is null or p_season_year < 2020 or p_season_year > 2100 then
    raise exception 'INVALID_SEASON_YEAR';
  end if;

  return query
  select
    host.host_name,
    coalesce((
      select sum(score.score)::bigint
      from public.prediction_scores as score
      join public.prediction_entries as entry on entry.id = score.entry_id
      join public.races as race on race.id = entry.race_id
      join public.seasons as season on season.id = race.season_id
      where entry.user_id = host.user_id
        and entry.competition = 'host'::public.prediction_competition
        and race.status = 'published'::public.race_status
        and not race.is_demo
        and season.year = p_season_year
    ), 0::bigint),
    coalesce((
      select count(*)::bigint
      from public.prediction_scores as score
      join public.prediction_entries as entry on entry.id = score.entry_id
      join public.races as race on race.id = entry.race_id
      join public.seasons as season on season.id = race.season_id
      where entry.user_id = host.user_id
        and entry.competition = 'host'::public.prediction_competition
        and race.status = 'published'::public.race_status
        and not race.is_demo
        and season.year = p_season_year
    ), 0::bigint)
  from public.host_profiles as host
  order by case host.host_name when 'Lakindu' then 1 when 'Kasun' then 2 else 3 end;
end;
$$;

revoke all on function public.get_public_host_championship(integer) from public;
grant execute on function public.get_public_host_championship(integer) to anon, authenticated, service_role;

comment on column public.races.is_demo is 'True for rehearsal races excluded from season and public Host championship totals.';
comment on function public.admin_create_demo_race(text, timestamptz, timestamptz, jsonb) is 'Creates and opens an isolated seven-question rehearsal race for prediction workflow testing.';
