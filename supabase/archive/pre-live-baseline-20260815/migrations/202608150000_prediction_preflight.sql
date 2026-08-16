-- Yellow Flag prediction backend preflight.
--
-- This migration is intentionally read-only. It prevents a legacy schema from
-- being silently treated as the canonical Phase 1 schema. A fresh database is
-- unaffected. If a named table already exists, its canonical columns must
-- already be present; otherwise stop and reconcile it using supabase/README.md.

do $$
declare
  table_spec record;
  missing_columns text[];
begin
  for table_spec in
    select *
    from (values
      ('profiles', array[
        'id', 'display_name', 'avatar_url', 'role', 'created_at', 'updated_at'
      ]::text[]),
      ('races', array[
        'id', 'season', 'round_number', 'slug', 'name', 'country',
        'circuit_name', 'fp1_starts_at', 'race_starts_at',
        'prediction_opens_at', 'prediction_locks_at', 'status',
        'results_published_at', 'created_at', 'updated_at'
      ]::text[]),
      ('race_questions', array[
        'id', 'race_id', 'question_key', 'prompt', 'question_type',
        'answer_group', 'display_order', 'points', 'required', 'active',
        'created_at', 'updated_at'
      ]::text[]),
      ('prediction_entries', array[
        'id', 'race_id', 'user_id', 'competition', 'status',
        'submitted_at', 'locked_at', 'score', 'scored_at',
        'created_at', 'updated_at'
      ]::text[]),
      ('prediction_answers', array[
        'id', 'race_id', 'entry_id', 'question_id', 'answer_value',
        'awarded_points', 'created_at', 'updated_at'
      ]::text[]),
      ('answer_options', array[
        'id', 'question_id', 'value', 'label', 'entity_type',
        'display_order', 'active', 'created_at', 'updated_at'
      ]::text[]),
      ('official_answers', array[
        'id', 'race_id', 'question_id', 'answer_value', 'entered_by',
        'created_at', 'updated_at'
      ]::text[]),
      ('official_answer_history', array[
        'id', 'race_id', 'question_id', 'previous_answer_value',
        'new_answer_value', 'action', 'changed_by', 'changed_at'
      ]::text[]),
      ('score_runs', array[
        'id', 'race_id', 'version', 'status', 'started_by', 'notes',
        'started_at', 'completed_at'
      ]::text[]),
      ('score_breakdown', array[
        'id', 'score_run_id', 'race_id', 'entry_id', 'question_id',
        'predicted_value', 'official_value', 'awarded_points', 'created_at'
      ]::text[])
    ) as specifications(table_name, required_columns)
  loop
    if to_regclass(format('public.%I', table_spec.table_name)) is not null then
      select array_agg(required_column order by required_column)
      into missing_columns
      from unnest(table_spec.required_columns) as required_column
      where not exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = table_spec.table_name
          and column_name = required_column
      );

      if missing_columns is not null then
        raise exception using
          errcode = 'P0001',
          message = format(
            'PREDICTION_SCHEMA_RECONCILIATION_REQUIRED: public.%I is missing canonical columns: %s',
            table_spec.table_name,
            array_to_string(missing_columns, ', ')
          ),
          hint = 'Do not rename or drop live columns blindly. Follow the legacy reconciliation procedure in supabase/README.md.';
      end if;
    end if;
  end loop;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name in (
        'profiles', 'races', 'race_questions', 'answer_options',
        'prediction_entries', 'prediction_answers', 'official_answers',
        'score_runs', 'score_breakdown'
      )
      and column_name in (
        'id', 'race_id', 'user_id', 'entry_id', 'question_id',
        'score_run_id', 'started_by', 'entered_by'
      )
      and not (table_name = 'score_breakdown' and column_name = 'id')
      and udt_name <> 'uuid'
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'PREDICTION_SCHEMA_RECONCILIATION_REQUIRED: canonical identifiers must use uuid',
      hint = 'Map legacy identifiers in a reviewed data migration before applying Phase 1.';
  end if;
end;
$$;
