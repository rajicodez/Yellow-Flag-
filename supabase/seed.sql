-- LOCAL DEVELOPMENT ONLY.
-- Reproduces the non-user Dutch GP configuration captured from production on
-- 2026-08-15. It contains no auth users, host mappings, predictions, or secrets.
-- Never execute this file against a linked project.

begin;

insert into public.seasons (year, name, is_active)
values (2026, '2026 Formula 1 World Championship', true)
on conflict (year) do update set
  name = excluded.name,
  is_active = excluded.is_active;

insert into public.races (
  season_id,
  round_number,
  slug,
  race_name,
  circuit_name,
  country_code,
  opens_at,
  closes_at,
  race_starts_at,
  status
)
select
  season.id,
  12,
  '2026-dutch-grand-prix',
  'Dutch Grand Prix',
  'Circuit Zandvoort',
  'NL',
  '2026-08-11 00:00:00+00'::timestamptz,
  '2026-08-21 10:30:00+00'::timestamptz,
  '2026-08-23 13:00:00+00'::timestamptz,
  'open'::public.race_status
from public.seasons as season
where season.year = 2026
on conflict (slug) do update set
  season_id = excluded.season_id,
  round_number = excluded.round_number,
  race_name = excluded.race_name,
  circuit_name = excluded.circuit_name,
  country_code = excluded.country_code,
  opens_at = excluded.opens_at,
  closes_at = excluded.closes_at,
  race_starts_at = excluded.race_starts_at,
  status = excluded.status;

with question_seed(
  question_number,
  question_key,
  question_text,
  answer_type
) as (
  values
    (1, 'pole_position', 'Who will take Pole Position at Zandvoort?', 'driver'::public.prediction_answer_type),
    (2, 'race_winner', 'Who will win the Dutch Grand Prix?', 'driver'::public.prediction_answer_type),
    (3, 'p2_finisher', 'Who will finish in P2?', 'driver'::public.prediction_answer_type),
    (4, 'p3_finisher', 'Who will finish in P3?', 'driver'::public.prediction_answer_type),
    (5, 'driver_of_the_day', 'Who will be the Driver of the Day?', 'driver'::public.prediction_answer_type),
    (6, 'top_constructor', 'Which constructor will score the most points?', 'constructor'::public.prediction_answer_type),
    (7, 'worst_constructor', 'Which constructor will perform the worst?', 'constructor'::public.prediction_answer_type)
)
insert into public.race_questions (
  race_id,
  question_number,
  question_key,
  question_text,
  answer_type,
  points,
  is_active
)
select
  race.id,
  question_seed.question_number,
  question_seed.question_key,
  question_seed.question_text,
  question_seed.answer_type,
  1,
  true
from public.races as race
cross join question_seed
where race.slug = '2026-dutch-grand-prix'
on conflict (race_id, question_key) do update set
  question_number = excluded.question_number,
  question_text = excluded.question_text,
  answer_type = excluded.answer_type,
  points = excluded.points,
  is_active = excluded.is_active;

with driver_options(sort_order, option_value) as (
  values
    (1, 'Lando Norris'),
    (2, 'Max Verstappen'),
    (3, 'Oscar Piastri'),
    (4, 'George Russell'),
    (5, 'Charles Leclerc'),
    (6, 'Lewis Hamilton'),
    (7, 'Kimi Antonelli'),
    (8, 'Alex Albon'),
    (9, 'Carlos Sainz'),
    (10, 'Fernando Alonso'),
    (11, 'Nico Hulkenberg'),
    (12, 'Isack Hadjar'),
    (13, 'Ollie Bearman'),
    (14, 'Liam Lawson'),
    (15, 'Esteban Ocon'),
    (16, 'Lance Stroll'),
    (17, 'Pierre Gasly'),
    (18, 'Gabriel Bortoleto'),
    (19, 'Franco Colapinto'),
    (20, 'Arvid Lindblad'),
    (21, 'Sergio Perez'),
    (22, 'Valtteri Bottas')
), driver_questions as (
  select question.id
  from public.race_questions as question
  join public.races as race on race.id = question.race_id
  where race.slug = '2026-dutch-grand-prix'
    and question.is_active = true
    and question.answer_type = 'driver'::public.prediction_answer_type
)
insert into public.race_question_options (
  question_id,
  option_value,
  option_label,
  option_type,
  sort_order,
  is_active
)
select
  driver_questions.id,
  driver_options.option_value,
  driver_options.option_value,
  'driver'::public.prediction_answer_type,
  driver_options.sort_order,
  true
from driver_questions
cross join driver_options
on conflict (question_id, option_value) do update set
  option_label = excluded.option_label,
  option_type = excluded.option_type,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

with constructor_options(sort_order, option_value) as (
  values
    (1, 'McLaren Formula 1 Team'),
    (2, 'Mercedes-AMG Petronas F1 Team'),
    (3, 'Oracle Red Bull Racing'),
    (4, 'Scuderia Ferrari HP'),
    (5, 'Atlassian Williams Racing'),
    (6, 'Visa Cash App Racing Bulls'),
    (7, 'Aston Martin Aramco F1 Team'),
    (8, 'TGR Haas F1 Team'),
    (9, 'Audi Revolut F1 Team'),
    (10, 'BWT Alpine F1 Team'),
    (11, 'Cadillac Formula 1 Team')
), constructor_questions as (
  select question.id
  from public.race_questions as question
  join public.races as race on race.id = question.race_id
  where race.slug = '2026-dutch-grand-prix'
    and question.is_active = true
    and question.answer_type = 'constructor'::public.prediction_answer_type
)
insert into public.race_question_options (
  question_id,
  option_value,
  option_label,
  option_type,
  sort_order,
  is_active
)
select
  constructor_questions.id,
  constructor_options.option_value,
  constructor_options.option_value,
  'constructor'::public.prediction_answer_type,
  constructor_options.sort_order,
  true
from constructor_questions
cross join constructor_options
on conflict (question_id, option_value) do update set
  option_label = excluded.option_label,
  option_type = excluded.option_type,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

do $seed_guard$
declare
  active_question_count integer;
  active_option_count integer;
begin
  select count(*)
  into active_question_count
  from public.race_questions as question
  join public.races as race on race.id = question.race_id
  where race.slug = '2026-dutch-grand-prix'
    and question.is_active = true;

  select count(*)
  into active_option_count
  from public.race_question_options as option
  join public.race_questions as question on question.id = option.question_id
  join public.races as race on race.id = question.race_id
  where race.slug = '2026-dutch-grand-prix'
    and option.is_active = true;

  if active_question_count <> 7 or active_option_count <> 132 then
    raise exception
      'LOCAL_SEED_INVALID: expected 7 active questions and 132 active options, found % and %',
      active_question_count,
      active_option_count;
  end if;
end;
$seed_guard$;

commit;
