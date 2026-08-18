-- Guarded race and question administration for the reusable prediction system.

create policy races_admin_select_all
on public.races
for select
to authenticated
using (public.is_prediction_admin());

create policy seasons_admin_select_all
on public.seasons
for select
to authenticated
using (public.is_prediction_admin());

create policy race_questions_admin_select_all
on public.race_questions
for select
to authenticated
using (public.is_prediction_admin());

create policy race_question_options_admin_select_all
on public.race_question_options
for select
to authenticated
using (public.is_prediction_admin());

create or replace function public.admin_upsert_race(
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
  saved_race_id uuid;
  active_question_count integer;
  configured_question_count integer;
  has_submissions boolean;
begin
  if auth.uid() is null or not public.is_prediction_admin() then
    raise exception 'ADMIN_ROLE_REQUIRED';
  end if;

  if p_season_year < 2020 or p_season_year > 2100 then
    raise exception 'INVALID_SEASON_YEAR';
  end if;
  if p_round_number < 1 then
    raise exception 'INVALID_ROUND_NUMBER';
  end if;
  if btrim(coalesce(p_season_name, '')) = ''
     or btrim(coalesce(p_race_name, '')) = ''
     or btrim(coalesce(p_circuit_name, '')) = '' then
    raise exception 'RACE_TEXT_FIELDS_REQUIRED';
  end if;
  if coalesce(p_slug, '') !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'INVALID_RACE_SLUG';
  end if;
  if upper(coalesce(p_country_code, '')) !~ '^[A-Z]{2}$' then
    raise exception 'INVALID_COUNTRY_CODE';
  end if;
  if p_opens_at is null or p_closes_at is null or p_race_starts_at is null
     or not (p_opens_at < p_closes_at and p_closes_at < p_race_starts_at) then
    raise exception 'INVALID_RACE_TIME_ORDER';
  end if;
  if p_status not in ('draft'::public.race_status, 'open'::public.race_status, 'locked'::public.race_status) then
    raise exception 'RACE_STATUS_MANAGED_BY_RESULTS_FLOW';
  end if;

  insert into public.seasons (year, name, is_active)
  values (p_season_year, btrim(p_season_name), true)
  on conflict (year) do update
    set name = excluded.name
  returning id into selected_season_id;

  if p_race_id is null then
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
    values (
      selected_season_id,
      p_round_number,
      p_slug,
      btrim(p_race_name),
      btrim(p_circuit_name),
      upper(p_country_code),
      p_opens_at,
      p_closes_at,
      p_race_starts_at,
      p_status
    )
    returning id into saved_race_id;
  else
    select *
    into selected_race
    from public.races
    where id = p_race_id
    for update;

    if not found then
      raise exception 'RACE_NOT_FOUND';
    end if;
    if selected_race.status in ('scored'::public.race_status, 'published'::public.race_status) then
      raise exception 'COMPLETED_RACE_IMMUTABLE';
    end if;

    select exists(
      select 1 from public.prediction_entries where race_id = p_race_id
    ) into has_submissions;

    if has_submissions and (
      selected_race.season_id <> selected_season_id
      or selected_race.round_number <> p_round_number
      or selected_race.slug <> p_slug
      or selected_race.race_name <> btrim(p_race_name)
      or selected_race.circuit_name <> btrim(p_circuit_name)
      or selected_race.country_code <> upper(p_country_code)
      or selected_race.race_starts_at <> p_race_starts_at
    ) then
      raise exception 'RACE_IDENTITY_LOCKED_AFTER_SUBMISSIONS';
    end if;

    update public.races
    set season_id = selected_season_id,
        round_number = p_round_number,
        slug = p_slug,
        race_name = btrim(p_race_name),
        circuit_name = btrim(p_circuit_name),
        country_code = upper(p_country_code),
        opens_at = p_opens_at,
        closes_at = p_closes_at,
        race_starts_at = p_race_starts_at,
        status = p_status,
        updated_at = now()
    where id = p_race_id
    returning id into saved_race_id;
  end if;

  if p_status = 'open'::public.race_status then
    select count(*)::integer
    into active_question_count
    from public.race_questions
    where race_id = saved_race_id and is_active;

    select count(*)::integer
    into configured_question_count
    from public.race_questions as question
    where question.race_id = saved_race_id
      and question.is_active
      and exists (
        select 1
        from public.race_question_options as option
        where option.question_id = question.id and option.is_active
      );

    if active_question_count <> 7 or configured_question_count <> 7 then
      raise exception 'SEVEN_CONFIGURED_QUESTIONS_REQUIRED_TO_OPEN';
    end if;
  end if;

  return jsonb_build_object('race_id', saved_race_id, 'status', p_status);
end;
$$;

create or replace function public.admin_save_race_questions(
  p_race_id uuid,
  p_questions jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_race public.races%rowtype;
  question_payload jsonb;
  option_payload jsonb;
  saved_question_id uuid;
  active_question_count integer;
  configured_question_count integer;
begin
  if auth.uid() is null or not public.is_prediction_admin() then
    raise exception 'ADMIN_ROLE_REQUIRED';
  end if;
  if jsonb_typeof(p_questions) <> 'array' or jsonb_array_length(p_questions) <> 7 then
    raise exception 'EXACTLY_SEVEN_QUESTIONS_REQUIRED';
  end if;

  select *
  into selected_race
  from public.races
  where id = p_race_id
  for update;

  if not found then
    raise exception 'RACE_NOT_FOUND';
  end if;
  if selected_race.status in ('scored'::public.race_status, 'published'::public.race_status) then
    raise exception 'COMPLETED_RACE_IMMUTABLE';
  end if;
  if exists(select 1 from public.prediction_entries where race_id = p_race_id) then
    raise exception 'RACE_HAS_SUBMISSIONS';
  end if;
  if exists(
    select 1
    from public.official_answers as answer
    join public.race_questions as question on question.id = answer.question_id
    where question.race_id = p_race_id
  ) then
    raise exception 'RACE_HAS_OFFICIAL_ANSWERS';
  end if;

  if (
    select count(distinct (item ->> 'question_number')::integer)
    from jsonb_array_elements(p_questions) as item
    where (item ->> 'question_number') ~ '^[1-7]$'
  ) <> 7 then
    raise exception 'QUESTION_NUMBERS_MUST_BE_ONE_THROUGH_SEVEN';
  end if;
  if (
    select count(distinct btrim(item ->> 'question_key'))
    from jsonb_array_elements(p_questions) as item
    where btrim(coalesce(item ->> 'question_key', '')) <> ''
  ) <> 7 then
    raise exception 'QUESTION_KEYS_MUST_BE_UNIQUE';
  end if;
  if (
    select count(*)
    from jsonb_array_elements(p_questions) as item
    where (item ->> 'question_number', item ->> 'question_key', item ->> 'answer_type') in (
      ('1', 'pole_position', 'driver'),
      ('2', 'race_winner', 'driver'),
      ('3', 'p2_finisher', 'driver'),
      ('4', 'p3_finisher', 'driver'),
      ('5', 'driver_of_the_day', 'driver'),
      ('6', 'top_constructor', 'constructor'),
      ('7', 'worst_constructor', 'constructor')
    )
  ) <> 7 then
    raise exception 'STANDARD_QUESTION_KEYS_AND_TYPES_REQUIRED';
  end if;

  delete from public.race_questions where race_id = p_race_id;

  for question_payload in
    select value from jsonb_array_elements(p_questions)
    order by (value ->> 'question_number')::integer
  loop
    if btrim(coalesce(question_payload ->> 'question_text', '')) = '' then
      raise exception 'QUESTION_TEXT_REQUIRED';
    end if;
    if coalesce(question_payload ->> 'answer_type', '') not in ('driver', 'constructor') then
      raise exception 'INVALID_QUESTION_ANSWER_TYPE';
    end if;
    if jsonb_typeof(question_payload -> 'options') <> 'array'
       or jsonb_array_length(question_payload -> 'options') < 1 then
      raise exception 'QUESTION_OPTIONS_REQUIRED';
    end if;

    insert into public.race_questions (
      race_id,
      question_number,
      question_key,
      question_text,
      answer_type,
      points,
      is_active
    )
    values (
      p_race_id,
      (question_payload ->> 'question_number')::integer,
      btrim(question_payload ->> 'question_key'),
      btrim(question_payload ->> 'question_text'),
      (question_payload ->> 'answer_type')::public.prediction_answer_type,
      1,
      coalesce((question_payload ->> 'is_active')::boolean, true)
    )
    returning id into saved_question_id;

    for option_payload in
      select value from jsonb_array_elements(question_payload -> 'options')
      order by (value ->> 'sort_order')::integer
    loop
      if btrim(coalesce(option_payload ->> 'option_value', '')) = ''
         or btrim(coalesce(option_payload ->> 'option_label', '')) = '' then
        raise exception 'QUESTION_OPTION_VALUE_REQUIRED';
      end if;

      insert into public.race_question_options (
        question_id,
        option_value,
        option_label,
        option_type,
        sort_order,
        is_active
      )
      values (
        saved_question_id,
        btrim(option_payload ->> 'option_value'),
        btrim(option_payload ->> 'option_label'),
        (question_payload ->> 'answer_type')::public.prediction_answer_type,
        (option_payload ->> 'sort_order')::integer,
        coalesce((option_payload ->> 'is_active')::boolean, true)
      );
    end loop;
  end loop;

  select count(*)::integer
  into active_question_count
  from public.race_questions
  where race_id = p_race_id and is_active;

  select count(*)::integer
  into configured_question_count
  from public.race_questions as question
  where question.race_id = p_race_id
    and question.is_active
    and exists (
      select 1 from public.race_question_options as option
      where option.question_id = question.id and option.is_active
    );

  if active_question_count <> 7 or configured_question_count <> 7 then
    raise exception 'SEVEN_ACTIVE_CONFIGURED_QUESTIONS_REQUIRED';
  end if;

  return jsonb_build_object(
    'race_id', p_race_id,
    'question_count', active_question_count
  );
end;
$$;

revoke all on function public.admin_upsert_race(
  uuid, integer, text, integer, text, text, text, text,
  timestamptz, timestamptz, timestamptz, public.race_status
) from public, anon;
grant execute on function public.admin_upsert_race(
  uuid, integer, text, integer, text, text, text, text,
  timestamptz, timestamptz, timestamptz, public.race_status
) to authenticated, service_role;

revoke all on function public.admin_save_race_questions(uuid, jsonb) from public, anon;
grant execute on function public.admin_save_race_questions(uuid, jsonb) to authenticated, service_role;

comment on function public.admin_upsert_race(
  uuid, integer, text, integer, text, text, text, text,
  timestamptz, timestamptz, timestamptz, public.race_status
) is 'Creates or updates an editable prediction race. Opening requires seven configured questions; completed races remain immutable.';

comment on function public.admin_save_race_questions(uuid, jsonb) is
  'Atomically replaces the seven-question configuration before submissions exist, including the server-authoritative option allow-list.';
