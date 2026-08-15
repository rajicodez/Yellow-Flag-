-- Local/development seed for the 2026 Dutch Grand Prix prediction round.
--
-- Schedule fields are deliberately NULL. The repository does not contain a
-- verified 2026 FP1 time, so this race remains a non-submittable draft until an
-- administrator explicitly configures and reviews the schedule.

begin;

insert into public.races (
  season,
  round_number,
  slug,
  name,
  country,
  circuit_name,
  fp1_starts_at,
  race_starts_at,
  prediction_opens_at,
  prediction_locks_at,
  status
)
values (
  2026,
  null,
  '2026-dutch-grand-prix',
  'Dutch Grand Prix',
  'Netherlands',
  'Circuit Zandvoort',
  null,
  null,
  null,
  null,
  'draft'
)
on conflict (slug) do update set
  name = excluded.name,
  country = excluded.country,
  circuit_name = excluded.circuit_name;

with target_race as (
  select id from public.races where slug = '2026-dutch-grand-prix'
), question_seed(question_key, prompt, question_type, answer_group, display_order) as (
  values
    ('pole_position', 'Who will take Pole Position at Zandvoort?', 'driver', null, 1),
    ('race_winner', 'Who will win the Dutch Grand Prix?', 'driver', 'podium', 2),
    ('p2_finisher', 'Who will finish in P2?', 'driver', 'podium', 3),
    ('p3_finisher', 'Who will finish in P3?', 'driver', 'podium', 4),
    ('driver_of_the_day', 'Who will be the Driver of the Day?', 'driver', null, 5),
    ('top_constructor', 'Which constructor will score the most points?', 'constructor', null, 6),
    ('worst_constructor', 'Which team will be the worst-performing team?', 'constructor', null, 7)
)
insert into public.race_questions (
  race_id,
  question_key,
  prompt,
  question_type,
  answer_group,
  display_order,
  points,
  required,
  active
)
select
  target_race.id,
  question_seed.question_key,
  question_seed.prompt,
  question_seed.question_type,
  question_seed.answer_group,
  question_seed.display_order,
  1,
  true,
  true
from target_race
cross join question_seed
on conflict (race_id, question_key) do update set
  prompt = excluded.prompt,
  question_type = excluded.question_type,
  answer_group = excluded.answer_group,
  display_order = excluded.display_order,
  points = 1,
  required = true,
  active = true;

with driver_seed(value, label, display_order) as (
  values
    ('driver:norris', 'Lando Norris', 1),
    ('driver:verstappen', 'Max Verstappen', 2),
    ('driver:piastri', 'Oscar Piastri', 3),
    ('driver:russell', 'George Russell', 4),
    ('driver:leclerc', 'Charles Leclerc', 5),
    ('driver:hamilton', 'Lewis Hamilton', 6),
    ('driver:antonelli', 'Kimi Antonelli', 7),
    ('driver:albon', 'Alex Albon', 8),
    ('driver:sainz', 'Carlos Sainz', 9),
    ('driver:alonso', 'Fernando Alonso', 10),
    ('driver:hulkenberg', 'Nico Hulkenberg', 11),
    ('driver:hadjar', 'Isack Hadjar', 12),
    ('driver:bearman', 'Ollie Bearman', 13),
    ('driver:lawson', 'Liam Lawson', 14),
    ('driver:ocon', 'Esteban Ocon', 15),
    ('driver:stroll', 'Lance Stroll', 16),
    ('driver:gasly', 'Pierre Gasly', 17),
    ('driver:bortoleto', 'Gabriel Bortoleto', 18),
    ('driver:colapinto', 'Franco Colapinto', 19),
    ('driver:lindblad', 'Arvid Lindblad', 20),
    ('driver:perez', 'Sergio Perez', 21),
    ('driver:bottas', 'Valtteri Bottas', 22)
), driver_questions as (
  select id
  from public.race_questions
  where race_id = (select id from public.races where slug = '2026-dutch-grand-prix')
    and question_type = 'driver'
)
insert into public.answer_options (
  question_id,
  value,
  label,
  entity_type,
  display_order,
  active
)
select
  driver_questions.id,
  driver_seed.value,
  driver_seed.label,
  'driver',
  driver_seed.display_order,
  true
from driver_questions
cross join driver_seed
on conflict (question_id, value) do update set
  label = excluded.label,
  entity_type = excluded.entity_type,
  display_order = excluded.display_order,
  active = true;

with constructor_seed(value, label, display_order) as (
  values
    ('constructor:1', 'McLaren Formula 1 Team', 1),
    ('constructor:2', 'Mercedes-AMG Petronas F1 Team', 2),
    ('constructor:4', 'Oracle Red Bull Racing', 3),
    ('constructor:3', 'Scuderia Ferrari HP', 4),
    ('constructor:5', 'Atlassian Williams Racing', 5),
    ('constructor:6', 'Visa Cash App Racing Bulls', 6),
    ('constructor:7', 'Aston Martin Aramco F1 Team', 7),
    ('constructor:8', 'TGR Haas F1 Team', 8),
    ('constructor:10', 'Audi Revolut F1 Team', 9),
    ('constructor:9', 'BWT Alpine F1 Team', 10),
    ('constructor:11', 'Cadillac Formula 1 Team', 11)
), constructor_questions as (
  select id
  from public.race_questions
  where race_id = (select id from public.races where slug = '2026-dutch-grand-prix')
    and question_type = 'constructor'
)
insert into public.answer_options (
  question_id,
  value,
  label,
  entity_type,
  display_order,
  active
)
select
  constructor_questions.id,
  constructor_seed.value,
  constructor_seed.label,
  'constructor',
  constructor_seed.display_order,
  true
from constructor_questions
cross join constructor_seed
on conflict (question_id, value) do update set
  label = excluded.label,
  entity_type = excluded.entity_type,
  display_order = excluded.display_order,
  active = true;

commit;
