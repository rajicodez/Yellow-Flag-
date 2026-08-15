create extension if not exists pgcrypto with schema extensions;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 80),
  avatar_url text,
  role text not null default 'fan' check (role in ('fan', 'host', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.profiles.role is
  'Server-authoritative application role. Clients cannot write this column.';

create table if not exists public.races (
  id uuid primary key default gen_random_uuid(),
  season smallint not null check (season between 2020 and 2100),
  round_number smallint check (round_number between 1 and 40),
  slug text not null unique check (slug ~ '^[0-9]{4}-[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (char_length(trim(name)) between 1 and 120),
  country text not null check (char_length(trim(country)) between 1 and 80),
  circuit_name text not null check (char_length(trim(circuit_name)) between 1 and 120),
  fp1_starts_at timestamptz,
  race_starts_at timestamptz,
  prediction_opens_at timestamptz,
  prediction_locks_at timestamptz,
  status text not null default 'draft'
    check (status in ('draft', 'open', 'locked', 'completed', 'scored', 'archived')),
  results_published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint races_season_round_unique unique (season, round_number),
  constraint races_prediction_window_order check (
    prediction_opens_at is null
    or prediction_locks_at is null
    or prediction_opens_at < prediction_locks_at
  ),
  constraint races_lock_is_fp1 check (
    prediction_locks_at is null
    or fp1_starts_at is null
    or prediction_locks_at = fp1_starts_at
  ),
  constraint races_lock_before_race check (
    prediction_locks_at is null
    or race_starts_at is null
    or prediction_locks_at < race_starts_at
  ),
  constraint races_open_requires_schedule check (
    status <> 'open'
    or (
      prediction_opens_at is not null
      and prediction_locks_at is not null
      and fp1_starts_at is not null
      and prediction_locks_at = fp1_starts_at
    )
  )
);

comment on column public.races.prediction_locks_at is
  'Authoritative server-side submission boundary. For Phase 1 it must equal fp1_starts_at.';

create table if not exists public.race_questions (
  id uuid primary key default gen_random_uuid(),
  race_id uuid not null references public.races(id) on delete cascade,
  question_key text not null check (question_key ~ '^[a-z][a-z0-9_]*$'),
  prompt text not null check (char_length(trim(prompt)) between 1 and 300),
  question_type text not null check (question_type in ('driver', 'constructor')),
  answer_group text check (answer_group is null or answer_group ~ '^[a-z][a-z0-9_]*$'),
  display_order smallint not null check (display_order between 1 and 50),
  points smallint not null default 1 check (points = 1),
  required boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint race_questions_key_unique unique (race_id, question_key),
  constraint race_questions_order_unique unique (race_id, display_order),
  constraint race_questions_race_id_id_unique unique (race_id, id)
);

create table if not exists public.answer_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.race_questions(id) on delete cascade,
  value text not null check (char_length(trim(value)) between 1 and 120),
  label text not null check (char_length(trim(label)) between 1 and 120),
  entity_type text not null check (entity_type in ('driver', 'constructor')),
  display_order smallint not null check (display_order between 1 and 100),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint answer_options_value_unique unique (question_id, value),
  constraint answer_options_order_unique unique (question_id, display_order),
  constraint answer_options_question_id_id_unique unique (question_id, id)
);

create table if not exists public.prediction_entries (
  id uuid primary key default gen_random_uuid(),
  race_id uuid not null references public.races(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete cascade,
  competition text not null check (competition in ('fan', 'host')),
  status text not null default 'submitted' check (status in ('submitted', 'scored')),
  submitted_at timestamptz not null default now(),
  locked_at timestamptz not null,
  score smallint check (score between 0 and 7),
  scored_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint prediction_entries_one_per_competition unique (race_id, user_id, competition),
  constraint prediction_entries_race_id_id_unique unique (race_id, id),
  constraint prediction_entries_score_state check (
    (status = 'submitted' and score is null and scored_at is null)
    or (status = 'scored' and score is not null and scored_at is not null)
  )
);

create table if not exists public.prediction_answers (
  id uuid primary key default gen_random_uuid(),
  race_id uuid not null,
  entry_id uuid not null,
  question_id uuid not null,
  answer_value text not null,
  awarded_points smallint check (awarded_points in (0, 1)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint prediction_answers_entry_question_unique unique (entry_id, question_id),
  constraint prediction_answers_entry_race_fk
    foreign key (race_id, entry_id)
    references public.prediction_entries(race_id, id) on delete cascade,
  constraint prediction_answers_question_race_fk
    foreign key (race_id, question_id)
    references public.race_questions(race_id, id) on delete restrict,
  constraint prediction_answers_option_fk
    foreign key (question_id, answer_value)
    references public.answer_options(question_id, value) on update restrict on delete restrict
);

create table if not exists public.official_answers (
  id uuid primary key default gen_random_uuid(),
  race_id uuid not null,
  question_id uuid not null,
  answer_value text not null,
  entered_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint official_answers_question_unique unique (race_id, question_id),
  constraint official_answers_question_race_fk
    foreign key (race_id, question_id)
    references public.race_questions(race_id, id) on delete cascade,
  constraint official_answers_option_fk
    foreign key (question_id, answer_value)
    references public.answer_options(question_id, value) on update restrict on delete restrict
);

create table if not exists public.official_answer_history (
  id bigint generated always as identity primary key,
  race_id uuid not null references public.races(id) on delete cascade,
  question_id uuid not null references public.race_questions(id) on delete cascade,
  previous_answer_value text,
  new_answer_value text,
  action text not null check (action in ('insert', 'update', 'delete')),
  changed_by uuid references public.profiles(id) on delete set null,
  changed_at timestamptz not null default now()
);

create table if not exists public.score_runs (
  id uuid primary key default gen_random_uuid(),
  race_id uuid not null references public.races(id) on delete restrict,
  version integer not null check (version > 0),
  status text not null default 'running' check (status in ('running', 'completed')),
  started_by uuid references public.profiles(id) on delete set null,
  notes text check (notes is null or char_length(notes) <= 1000),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint score_runs_race_version_unique unique (race_id, version),
  constraint score_runs_race_id_id_unique unique (race_id, id),
  constraint score_runs_completion_state check (
    (status = 'running' and completed_at is null)
    or (status = 'completed' and completed_at is not null)
  )
);

create table if not exists public.score_breakdown (
  id bigint generated always as identity primary key,
  score_run_id uuid not null,
  race_id uuid not null,
  entry_id uuid not null,
  question_id uuid not null,
  predicted_value text not null,
  official_value text not null,
  awarded_points smallint not null check (awarded_points in (0, 1)),
  created_at timestamptz not null default now(),
  constraint score_breakdown_run_entry_question_unique
    unique (score_run_id, entry_id, question_id),
  constraint score_breakdown_run_race_fk
    foreign key (race_id, score_run_id)
    references public.score_runs(race_id, id) on delete restrict,
  constraint score_breakdown_entry_race_fk
    foreign key (race_id, entry_id)
    references public.prediction_entries(race_id, id) on delete restrict,
  constraint score_breakdown_question_race_fk
    foreign key (race_id, question_id)
    references public.race_questions(race_id, id) on delete restrict
);

create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists races_season_status_idx on public.races(season, status);
create index if not exists race_questions_active_idx
  on public.race_questions(race_id, display_order) where active;
create index if not exists prediction_entries_race_competition_score_idx
  on public.prediction_entries(race_id, competition, score desc) where score is not null;
create index if not exists prediction_entries_user_idx
  on public.prediction_entries(user_id, race_id);
create index if not exists prediction_answers_entry_idx
  on public.prediction_answers(entry_id);
create index if not exists official_answer_history_race_idx
  on public.official_answer_history(race_id, changed_at desc);
create index if not exists score_runs_race_idx
  on public.score_runs(race_id, version desc);
create index if not exists score_breakdown_entry_idx
  on public.score_breakdown(entry_id, score_run_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'races', 'race_questions', 'answer_options',
    'prediction_entries', 'prediction_answers', 'official_answers'
  ]
  loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', table_name, table_name);
    execute format(
      'create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      table_name,
      table_name
    );
  end loop;
end;
$$;

create or replace function public.handle_new_auth_user_prediction_profile()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  candidate_name text;
begin
  candidate_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'F1 Fan'
  );

  insert into public.profiles (id, display_name, avatar_url, role)
  values (
    new.id,
    left(candidate_name, 80),
    nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
    'fan'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_prediction_profile on auth.users;
create trigger on_auth_user_created_prediction_profile
after insert on auth.users
for each row execute function public.handle_new_auth_user_prediction_profile();

insert into public.profiles (id, display_name, avatar_url, role)
select
  users.id,
  left(coalesce(
    nullif(trim(users.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(users.raw_user_meta_data ->> 'name'), ''),
    nullif(split_part(coalesce(users.email, ''), '@', 1), ''),
    'F1 Fan'
  ), 80),
  nullif(users.raw_user_meta_data ->> 'avatar_url', ''),
  'fan'
from auth.users as users
on conflict (id) do nothing;
