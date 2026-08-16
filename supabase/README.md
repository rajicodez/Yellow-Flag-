# Yellow Flag Supabase live baseline

The authoritative migration starting point is:

`migrations/20260815213203_live_production_baseline.sql`

It was generated from project `qvjkqsubsabsspdaazzr` with `supabase db pull`
on 2026-08-15. The initial pull was explicitly told **not** to update remote
migration history. Production schema and application data were not changed by
the capture.

## Historical migrations

Migrations `202608150000` through `202608150007` and their proposed-schema seed
are preserved under `archive/pre-live-baseline-20260815/`. They are retained for
audit history only and must never be moved back into the active migrations
directory or replayed against production:

- `000`–`005` describe a proposed schema that does not match production.
- `006` and `007` were applied manually and are already incorporated into the
  captured live baseline.
- The former scoring/admin/leaderboard test is archived with that proposal.

## Captured production contract

The baseline contains the actual live enum values and legacy-compatible tables:

- `app_role`: `user`, `host`, `admin`, `super_admin`
- `prediction_competition`: `user`, `host`
- `prediction_answer_type`: `driver`, `constructor`
- `race_status`: `draft`, `open`, `locked`, `scored`, `published`
- `seasons`, `races`, `race_questions`, `race_question_options`
- `profiles`, `user_roles`, `host_profiles`
- `prediction_entries`, `prediction_answers`

`prediction_entries` is unique by `(race_id, user_id, competition)`.
`prediction_answers` is keyed by `(entry_id, question_id)`. RLS is enabled on
every application table and authenticated clients receive read access only to
their permitted prediction rows.

The live `submit_prediction(text, prediction_competition, jsonb)` RPC:

- is `SECURITY DEFINER` with an empty `search_path`;
- derives the caller from `auth.uid()`;
- validates race status and database time against `opens_at` / `closes_at`;
- requires Host role plus a matching `host_profiles` row for Host submissions;
- requires exactly seven active questions and seven answers;
- validates exact display-name values through `race_question_options`;
- requires winner, P2, and P3 to be different drivers;
- performs every validation before its first prediction write;
- updates the same entry and replaces its seven answer rows; and
- is executable by `authenticated` and `service_role`, not `anon` or `PUBLIC`.

## Local-only seed

`seed.sql` recreates only the non-user Dutch GP configuration captured from
production:

- the 2026 season;
- the Dutch Grand Prix schedule and verified FP1 close time
  `2026-08-21 10:30:00+00`;
- the seven live question keys and prompts;
- 22 display-name driver options for each driver question; and
- 11 display-name constructor options for each constructor question.

The seed contains no auth users, host mappings, roles, predictions, credentials,
API keys, or secrets. It is for a disposable local database only and must never
be executed against a linked project.

## Local verification

Docker Desktop and the Supabase CLI are required. From the repository root:

```sh
supabase start
supabase db reset
supabase test db
npm run test:supabase:static
npm run build
```

Never add `--linked` to `db reset`. The pgTAP suite uses transaction-wrapped
synthetic users and rolls every test fixture back:

- `001_live_baseline_contract_test.sql` checks enums, tables, RLS, grants, Host
  resolution, authenticated execution, and user isolation.
- `002_race_question_option_validation_test.sql` checks exact option validation,
  same-entry edits, and zero-write rejection behavior.
- `003_podium_uniqueness_validation_test.sql` checks all duplicate podium cases,
  unchanged prior data, same-entry edits, grants, RLS, and deadline behavior.

## Migration-history reconciliation

Do not run a real `supabase db push` until all of these conditions are met:

1. local reset, pgTAP, static validation, and the application build pass;
2. a schema diff against linked production has no meaningful difference;
3. only baseline timestamp `20260815213203` is repaired as `applied` remotely;
4. `supabase migration list --linked` shows that timestamp both local and remote;
5. `supabase db push --linked --dry-run` reports no migration to apply; and
6. read-only production integrity counts remain unchanged.

The repair operation records history only. It must not execute the baseline SQL
against production. Never mark or replay archived migrations `000`–`007`.

After reconciliation, every future production change must be a new reviewed,
forward-only migration created after the baseline timestamp. Do not redesign
the production schema from the archived proposal.
