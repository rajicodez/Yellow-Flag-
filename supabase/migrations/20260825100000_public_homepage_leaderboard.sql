-- Public, privacy-limited leaderboard preview for the marketing homepage.

create or replace function public.get_homepage_fan_leaderboard()
returns table (
  race_name text,
  race_slug text,
  rank bigint,
  display_name text,
  avatar_url text,
  score smallint,
  total_competitors bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with latest_published_race as (
    select race.id, race.race_name, race.slug
    from public.races as race
    where race.status = 'published'::public.race_status
      and race.is_demo = false
    order by race.race_starts_at desc
    limit 1
  ),
  fan_standings as (
    select
      leaderboard.race_id,
      leaderboard.rank,
      leaderboard.display_name,
      leaderboard.avatar_url,
      leaderboard.score,
      count(*) over () as total_competitors
    from public.race_prediction_leaderboard as leaderboard
    join latest_published_race as race on race.id = leaderboard.race_id
    where leaderboard.competition = 'user'::public.prediction_competition
  )
  select
    race.race_name,
    race.slug,
    standings.rank,
    standings.display_name,
    standings.avatar_url,
    standings.score,
    standings.total_competitors
  from fan_standings as standings
  join latest_published_race as race on race.id = standings.race_id
  order by standings.rank, standings.display_name
  limit 10;
$$;

revoke all on function public.get_homepage_fan_leaderboard() from public;
grant execute on function public.get_homepage_fan_leaderboard() to anon, authenticated, service_role;

comment on function public.get_homepage_fan_leaderboard() is
  'Returns only the latest published non-demo race top-ten fan ranks for the public homepage.';
