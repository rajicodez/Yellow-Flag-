-- Public, privacy-limited season leaderboard preview for the marketing homepage.

create or replace function public.get_homepage_season_fan_leaderboard()
returns table (
  season_year integer,
  rank bigint,
  display_name text,
  avatar_url text,
  score integer,
  races_entered integer,
  total_competitors bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with latest_published_season as (
    select max(season.year) as season_year
    from public.races as race
    join public.seasons as season on season.id = race.season_id
    where race.status = 'published'::public.race_status
      and race.is_demo = false
  ),
  season_totals as (
    select
      season.year as season_year,
      entry.user_id,
      profile.display_name,
      profile.avatar_url,
      count(*)::integer as races_entered,
      sum(prediction_score.score)::integer as total_score,
      count(*) filter (where prediction_score.score = 7)::integer as score_7_count,
      count(*) filter (where prediction_score.score = 6)::integer as score_6_count,
      count(*) filter (where prediction_score.score = 5)::integer as score_5_count,
      count(*) filter (where prediction_score.score = 4)::integer as score_4_count,
      count(*) filter (where prediction_score.score = 3)::integer as score_3_count,
      count(*) filter (where prediction_score.score = 2)::integer as score_2_count,
      count(*) filter (where prediction_score.score = 1)::integer as score_1_count
    from public.prediction_scores as prediction_score
    join public.prediction_entries as entry on entry.id = prediction_score.entry_id
    join public.races as race on race.id = entry.race_id
    join public.seasons as season on season.id = race.season_id
    join public.profiles as profile on profile.id = entry.user_id
    join latest_published_season as latest on latest.season_year = season.year
    where race.status = 'published'::public.race_status
      and race.is_demo = false
      and entry.competition = 'user'::public.prediction_competition
    group by season.year, entry.user_id, profile.display_name, profile.avatar_url
  ),
  ranked_standings as (
    select
      totals.*,
      rank() over (
        order by
          totals.total_score desc,
          totals.score_7_count desc,
          totals.score_6_count desc,
          totals.score_5_count desc,
          totals.score_4_count desc,
          totals.score_3_count desc,
          totals.score_2_count desc,
          totals.score_1_count desc
      ) as standing_rank,
      count(*) over () as competitor_count
    from season_totals as totals
  )
  select
    standings.season_year,
    standings.standing_rank,
    standings.display_name,
    standings.avatar_url,
    standings.total_score,
    standings.races_entered,
    standings.competitor_count
  from ranked_standings as standings
  order by standings.standing_rank, standings.display_name
  limit 10;
$$;

revoke all on function public.get_homepage_season_fan_leaderboard() from public;
grant execute on function public.get_homepage_season_fan_leaderboard() to anon, authenticated, service_role;

comment on function public.get_homepage_season_fan_leaderboard() is
  'Returns the latest published non-demo season top-ten fan standings for the public homepage.';

notify pgrst, 'reload schema';
