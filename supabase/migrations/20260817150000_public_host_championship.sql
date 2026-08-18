-- Public, narrowly scoped totals for the homepage Hosts Championship card.
-- No emails, user ids, predictions, or unpublished scores are exposed.

create or replace function public.get_public_host_championship(p_season_year integer)
returns table (
  host_name text,
  total_score bigint,
  races_scored bigint
)
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
        and season.year = p_season_year
    ), 0::bigint) as total_score,
    coalesce((
      select count(*)::bigint
      from public.prediction_scores as score
      join public.prediction_entries as entry on entry.id = score.entry_id
      join public.races as race on race.id = entry.race_id
      join public.seasons as season on season.id = race.season_id
      where entry.user_id = host.user_id
        and entry.competition = 'host'::public.prediction_competition
        and race.status = 'published'::public.race_status
        and season.year = p_season_year
    ), 0::bigint) as races_scored
  from public.host_profiles as host
  order by case host.host_name when 'Lakindu' then 1 when 'Kasun' then 2 else 3 end;
end;
$$;

revoke all on function public.get_public_host_championship(integer) from public;
grant execute on function public.get_public_host_championship(integer) to anon, authenticated, service_role;

comment on function public.get_public_host_championship(integer) is
  'Public homepage totals for Lakindu and Kasun from published Host competition scores only.';
