create or replace view public.race_prediction_leaderboard
with (security_barrier = true, security_invoker = false)
as
select
  entry.race_id,
  race.slug as race_slug,
  race.season,
  entry.competition,
  rank() over (
    partition by entry.race_id, entry.competition
    order by entry.score desc
  ) as rank,
  entry.id as entry_id,
  entry.user_id,
  profile.display_name,
  profile.avatar_url,
  entry.score,
  entry.submitted_at,
  entry.scored_at
from public.prediction_entries as entry
join public.races as race on race.id = entry.race_id
join public.profiles as profile on profile.id = entry.user_id
where entry.status = 'scored'
  and entry.score is not null
  and race.status = 'scored'
  and race.results_published_at is not null;

create or replace view public.season_prediction_leaderboard
with (security_barrier = true, security_invoker = false)
as
with season_totals as (
  select
    race.season,
    entry.competition,
    entry.user_id,
    profile.display_name,
    profile.avatar_url,
    count(*)::integer as races_entered,
    sum(entry.score)::integer as total_score,
    count(*) filter (where entry.score = 7)::integer as perfect_score_count,
    count(*) filter (where entry.score = 6)::integer as score_6_count,
    count(*) filter (where entry.score = 5)::integer as score_5_count,
    count(*) filter (where entry.score = 4)::integer as score_4_count,
    count(*) filter (where entry.score = 3)::integer as score_3_count,
    count(*) filter (where entry.score = 2)::integer as score_2_count,
    count(*) filter (where entry.score = 1)::integer as score_1_count
  from public.prediction_entries as entry
  join public.races as race on race.id = entry.race_id
  join public.profiles as profile on profile.id = entry.user_id
  where entry.status = 'scored'
    and entry.score is not null
    and race.status = 'scored'
    and race.results_published_at is not null
  group by
    race.season,
    entry.competition,
    entry.user_id,
    profile.display_name,
    profile.avatar_url
)
select
  season,
  competition,
  rank() over (
    partition by season, competition
    order by
      total_score desc,
      perfect_score_count desc,
      score_6_count desc,
      score_5_count desc,
      score_4_count desc,
      score_3_count desc,
      score_2_count desc,
      score_1_count desc
  ) as rank,
  user_id,
  display_name,
  avatar_url,
  races_entered,
  total_score,
  perfect_score_count,
  score_6_count,
  score_5_count,
  score_4_count,
  score_3_count,
  score_2_count,
  score_1_count
from season_totals;

revoke all on table public.race_prediction_leaderboard from public, anon;
revoke all on table public.season_prediction_leaderboard from public, anon;
grant select on table public.race_prediction_leaderboard to authenticated;
grant select on table public.season_prediction_leaderboard to authenticated;

comment on view public.race_prediction_leaderboard is
  'Published per-race standings. Fan and host competitions are partitioned and never mixed.';
comment on view public.season_prediction_leaderboard is
  'Published season standings. Ties compare total, then score frequencies 7 through 1; exact ties share rank.';
