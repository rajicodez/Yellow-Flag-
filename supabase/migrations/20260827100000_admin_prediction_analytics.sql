-- Secure, aggregated prediction analytics for the Admin Control Centre.

create table public.prediction_analytics_events (
  id bigint generated always as identity primary key,
  race_id uuid not null references public.races(id) on delete cascade,
  entry_id uuid not null references public.prediction_entries(id) on delete cascade,
  competition public.prediction_competition not null,
  event_type text not null check (event_type in ('submitted', 'edited')),
  occurred_at timestamptz not null default clock_timestamp()
);

create index prediction_analytics_events_race_time_idx
  on public.prediction_analytics_events (race_id, competition, occurred_at desc);

alter table public.prediction_analytics_events enable row level security;

create policy prediction_analytics_events_admin_select
on public.prediction_analytics_events
for select
to authenticated
using (public.is_prediction_admin());

create or replace function public.record_prediction_analytics_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.prediction_analytics_events (
    race_id,
    entry_id,
    competition,
    event_type,
    occurred_at
  ) values (
    new.race_id,
    new.id,
    new.competition,
    case when tg_op = 'INSERT' then 'submitted' else 'edited' end,
    clock_timestamp()
  );
  return new;
end;
$$;

drop trigger if exists record_prediction_analytics_event on public.prediction_entries;
create trigger record_prediction_analytics_event
after insert or update on public.prediction_entries
for each row execute function public.record_prediction_analytics_event();

create or replace function public.get_admin_prediction_analytics(
  p_race_id uuid,
  p_competition public.prediction_competition default 'user'::public.prediction_competition
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  selected_race public.races%rowtype;
  reveal_distributions boolean;
  result jsonb;
begin
  if not public.is_prediction_admin() then
    raise exception 'admin_role_required';
  end if;

  select * into selected_race
  from public.races
  where id = p_race_id;

  if not found then
    raise exception 'race_not_found';
  end if;

  reveal_distributions := clock_timestamp() >= selected_race.closes_at
    or selected_race.status in (
      'locked'::public.race_status,
      'scored'::public.race_status,
      'published'::public.race_status
    );

  with selected_entries as (
    select entry.*
    from public.prediction_entries as entry
    where entry.race_id = p_race_id
      and entry.competition = p_competition
  ),
  totals as (
    select
      (select count(*) from selected_entries) as entries,
      (select count(*) from public.profiles) as registered_users,
      (select count(*) from public.host_profiles) as expected_hosts,
      (select count(*) from public.prediction_entries as host_entry
        where host_entry.race_id = p_race_id
          and host_entry.competition = 'host'::public.prediction_competition) as submitted_hosts,
      (select count(*) from public.prediction_analytics_events as event
        where event.race_id = p_race_id
          and event.competition = p_competition
          and event.occurred_at >= clock_timestamp() - interval '1 hour') as activity_last_hour,
      (select count(*) from public.prediction_analytics_events as event
        where event.race_id = p_race_id
          and event.competition = p_competition
          and event.event_type = 'edited') as edits
  ),
  question_choices as (
    select
      question.id as question_id,
      question.question_number,
      question.question_key,
      question.question_text,
      question.answer_type,
      option.option_value,
      option.option_label,
      count(entry.id)::bigint as prediction_count
    from public.race_questions as question
    join public.race_question_options as option
      on option.question_id = question.id
     and option.is_active = true
    left join public.prediction_answers as answer
      on answer.question_id = question.id
     and answer.answer_value = option.option_value
    left join selected_entries as entry
      on entry.id = answer.entry_id
    where question.race_id = p_race_id
      and question.is_active = true
    group by question.id, question.question_number, question.question_key,
      question.question_text, question.answer_type, option.option_value,
      option.option_label, option.sort_order
    having count(entry.id) > 0
    order by question.question_number, prediction_count desc, option.sort_order
  ),
  questions as (
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'question_id', grouped.question_id,
        'question_number', grouped.question_number,
        'question_key', grouped.question_key,
        'question_text', grouped.question_text,
        'answer_type', grouped.answer_type,
        'choices', grouped.choices
      ) order by grouped.question_number
    ), '[]'::jsonb) as payload
    from (
      select
        choice.question_id,
        choice.question_number,
        choice.question_key,
        choice.question_text,
        choice.answer_type,
        jsonb_agg(jsonb_build_object(
          'value', choice.option_value,
          'label', choice.option_label,
          'count', choice.prediction_count
        ) order by choice.prediction_count desc, choice.option_label) as choices
      from question_choices as choice
      group by choice.question_id, choice.question_number, choice.question_key,
        choice.question_text, choice.answer_type
    ) as grouped
  ),
  podium_combinations as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'p1', combination.p1,
      'p2', combination.p2,
      'p3', combination.p3,
      'count', combination.prediction_count
    ) order by combination.prediction_count desc, combination.p1, combination.p2, combination.p3), '[]'::jsonb) as payload
    from (
      select
        coalesce(p1_option.option_label, p1.answer_value) as p1,
        coalesce(p2_option.option_label, p2.answer_value) as p2,
        coalesce(p3_option.option_label, p3.answer_value) as p3,
        count(*)::bigint as prediction_count
      from selected_entries as entry
      join public.race_questions as p1_question on p1_question.race_id = p_race_id and p1_question.question_key = 'race_winner'
      join public.race_questions as p2_question on p2_question.race_id = p_race_id and p2_question.question_key = 'p2_finisher'
      join public.race_questions as p3_question on p3_question.race_id = p_race_id and p3_question.question_key = 'p3_finisher'
      join public.prediction_answers as p1 on p1.entry_id = entry.id and p1.question_id = p1_question.id
      join public.prediction_answers as p2 on p2.entry_id = entry.id and p2.question_id = p2_question.id
      join public.prediction_answers as p3 on p3.entry_id = entry.id and p3.question_id = p3_question.id
      left join public.race_question_options as p1_option on p1_option.question_id = p1_question.id and p1_option.option_value = p1.answer_value
      left join public.race_question_options as p2_option on p2_option.question_id = p2_question.id and p2_option.option_value = p2.answer_value
      left join public.race_question_options as p3_option on p3_option.question_id = p3_question.id and p3_option.option_value = p3.answer_value
      group by p1_option.option_label, p1.answer_value, p2_option.option_label,
        p2.answer_value, p3_option.option_label, p3.answer_value
      order by prediction_count desc
      limit 5
    ) as combination
  ),
  timeline_source as (
    select entry.id::text as source_id, 'submitted'::text as event_type,
      coalesce(min(event.occurred_at) filter (where event.event_type = 'submitted'), entry.submitted_at) as occurred_at
    from selected_entries as entry
    left join public.prediction_analytics_events as event on event.entry_id = entry.id
    group by entry.id, entry.submitted_at
    union all
    select event.id::text, 'edited'::text, event.occurred_at
    from public.prediction_analytics_events as event
    where event.race_id = p_race_id
      and event.competition = p_competition
      and event.event_type = 'edited'
  ),
  timeline as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'time', bucket.bucket,
      'submissions', bucket.submissions,
      'edits', bucket.edits
    ) order by bucket.bucket), '[]'::jsonb) as payload
    from (
      select date_trunc('hour', source.occurred_at) as bucket,
        count(*) filter (where source.event_type = 'submitted')::bigint as submissions,
        count(*) filter (where source.event_type = 'edited')::bigint as edits
      from timeline_source as source
      group by date_trunc('hour', source.occurred_at)
    ) as bucket
  ),
  scoring as (
    select jsonb_build_object(
      'available', count(score.entry_id) > 0,
      'average_score', coalesce(round(avg(score.score)::numeric, 2), 0),
      'perfect_scores', count(*) filter (where score.score = 7),
      'distribution', coalesce((
        select jsonb_agg(jsonb_build_object('score', series.score, 'count', coalesce(score_count.total, 0)) order by series.score)
        from generate_series(0, 7) as series(score)
        left join (
          select prediction_score.score, count(*)::bigint as total
          from public.prediction_scores as prediction_score
          join selected_entries as scored_entry on scored_entry.id = prediction_score.entry_id
          group by prediction_score.score
        ) as score_count on score_count.score = series.score
      ), '[]'::jsonb)
    ) as payload
    from public.prediction_scores as score
    join selected_entries as entry on entry.id = score.entry_id
  )
  select jsonb_build_object(
    'race', jsonb_build_object(
      'id', selected_race.id,
      'name', selected_race.race_name,
      'status', selected_race.status,
      'opens_at', selected_race.opens_at,
      'closes_at', selected_race.closes_at
    ),
    'competition', p_competition,
    'distributions_locked', not reveal_distributions,
    'totals', jsonb_build_object(
      'entries', totals.entries,
      'registered_users', totals.registered_users,
      'participation_rate', case when totals.registered_users = 0 then 0 else round((totals.entries::numeric / totals.registered_users::numeric) * 100, 1) end,
      'expected_hosts', totals.expected_hosts,
      'submitted_hosts', totals.submitted_hosts,
      'activity_last_hour', totals.activity_last_hour,
      'edits', totals.edits
    ),
    'questions', case when reveal_distributions then questions.payload else '[]'::jsonb end,
    'podium_combinations', case when reveal_distributions then podium_combinations.payload else '[]'::jsonb end,
    'timeline', timeline.payload,
    'scoring', scoring.payload,
    'generated_at', clock_timestamp()
  ) into result
  from totals, questions, podium_combinations, timeline, scoring;

  return result;
end;
$$;

revoke all on table public.prediction_analytics_events from public, anon;
grant select on table public.prediction_analytics_events to authenticated, service_role;

revoke all on function public.record_prediction_analytics_event() from public, anon, authenticated;
grant execute on function public.record_prediction_analytics_event() to service_role;

revoke all on function public.get_admin_prediction_analytics(uuid, public.prediction_competition) from public, anon;
grant execute on function public.get_admin_prediction_analytics(uuid, public.prediction_competition) to authenticated, service_role;

do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'prediction_analytics_events'
  ) then
    execute 'alter publication supabase_realtime add table public.prediction_analytics_events';
  end if;
end;
$$;

comment on function public.get_admin_prediction_analytics(uuid, public.prediction_competition) is
  'Returns privacy-preserving aggregate prediction analytics to Admin and Super Admin accounts.';
