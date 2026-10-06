-- Sprint weekend questions follow the event chronology: Sprint first, then Grand Prix.

-- Move through a temporary range so the per-race question-number uniqueness
-- constraint is never violated while existing Sprint races are reordered.
alter table public.race_questions
  drop constraint if exists race_questions_race_id_question_number_key;
alter table public.race_questions
  drop constraint if exists race_questions_question_number_check;

update public.race_questions as question
set question_number = question.question_number + 100
from public.races as race
where race.id = question.race_id
  and race.is_sprint_weekend = true;

update public.race_questions as question
set question_number = case question.question_key
  when 'sprint_pole_position' then 1
  when 'sprint_race_winner' then 2
  when 'pole_position' then 3
  when 'race_winner' then 4
  when 'p2_finisher' then 5
  when 'p3_finisher' then 6
  when 'driver_of_the_day' then 7
  when 'top_constructor' then 8
  when 'worst_constructor' then 9
end
from public.races as race
where race.id = question.race_id
  and race.is_sprint_weekend = true
  and question.question_key in (
    'sprint_pole_position', 'sprint_race_winner', 'pole_position',
    'race_winner', 'p2_finisher', 'p3_finisher', 'driver_of_the_day',
    'top_constructor', 'worst_constructor'
  );

alter table public.race_questions
  add constraint race_questions_question_number_check
  check (question_number between 1 and 9);
alter table public.race_questions
  add constraint race_questions_race_id_question_number_key
  unique (race_id, question_number);

-- The protected question-saving RPC validates canonical key/number pairs.
-- Update only that validation block; all authorization and data-integrity
-- behavior remains unchanged.
do $$
declare
  definition text;
  previous_definition text;
  old_validation text := $old$
    where (item ->> 'question_number', item ->> 'question_key', item ->> 'answer_type') in (
      ('1', 'pole_position', 'driver'),
      ('2', 'race_winner', 'driver'),
      ('3', 'p2_finisher', 'driver'),
      ('4', 'p3_finisher', 'driver'),
      ('5', 'driver_of_the_day', 'driver'),
      ('6', 'top_constructor', 'constructor'),
      ('7', 'worst_constructor', 'constructor'),
      ('8', 'sprint_pole_position', 'driver'),
      ('9', 'sprint_race_winner', 'driver')
    )
  ) <> expected_count then raise exception 'STANDARD_QUESTION_KEYS_AND_TYPES_REQUIRED'; end if;
$old$;
  new_validation text := $new$
    where (
      (not selected_race.is_sprint_weekend and (item ->> 'question_number', item ->> 'question_key', item ->> 'answer_type') in (
        ('1', 'pole_position', 'driver'),
        ('2', 'race_winner', 'driver'),
        ('3', 'p2_finisher', 'driver'),
        ('4', 'p3_finisher', 'driver'),
        ('5', 'driver_of_the_day', 'driver'),
        ('6', 'top_constructor', 'constructor'),
        ('7', 'worst_constructor', 'constructor')
      ))
      or
      (selected_race.is_sprint_weekend and (item ->> 'question_number', item ->> 'question_key', item ->> 'answer_type') in (
        ('1', 'sprint_pole_position', 'driver'),
        ('2', 'sprint_race_winner', 'driver'),
        ('3', 'pole_position', 'driver'),
        ('4', 'race_winner', 'driver'),
        ('5', 'p2_finisher', 'driver'),
        ('6', 'p3_finisher', 'driver'),
        ('7', 'driver_of_the_day', 'driver'),
        ('8', 'top_constructor', 'constructor'),
        ('9', 'worst_constructor', 'constructor')
      ))
    )
  ) <> expected_count then raise exception 'STANDARD_QUESTION_KEYS_AND_TYPES_REQUIRED'; end if;
$new$;
begin
  select pg_get_functiondef('public.admin_save_race_questions_v2(uuid,jsonb)'::regprocedure)
  into definition;
  previous_definition := definition;
  definition := replace(definition, old_validation, new_validation);

  if definition = previous_definition
     or position($check$('1', 'sprint_pole_position', 'driver')$check$ in definition) = 0 then
    raise exception 'SPRINT_QUESTION_ORDER_PATCH_FAILED';
  end if;

  execute definition;
end;
$$;

notify pgrst, 'reload schema';
