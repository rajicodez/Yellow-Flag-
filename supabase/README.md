# Yellow Flag prediction backend

> **Production reconciliation warning (2026-08-15):** migrations `000`–`005`
> describe a proposed Phase 1 schema and do not match the currently deployed
> legacy production schema. Do not run an unrestricted linked `supabase db push`
> against production. Migration `006` is a standalone, guarded migration built
> from a read-only audit of the live schema. Migrations `006` and `007` were applied
> through the production SQL editor on 2026-08-15 after transaction-wrapped
> verification. The project did
> not have `supabase_migrations.schema_migrations`, so this deployment is not yet
> represented in CLI history. Reconcile that history before any future linked push,
> and proceed only when its dry run contains no legacy `000`–`005` migrations.

This directory contains the version-controlled Phase 1 Supabase foundation for
seven-question Formula 1 predictions. It does not deploy itself and contains no
credentials. The browser uses only the project URL and publishable key; never
place a service-role key in a `VITE_*` variable.

## Architecture overview

`profiles` mirrors authenticated identities and owns the protected application
role. `races` owns the schedule and FP1 lock. `race_questions` and
`answer_options` provide the data-driven seven-question contract.
`prediction_entries` is the one-per-user/race/competition header and
`prediction_answers` contains its normalized answers. `official_answers` plus
`official_answer_history` store reviewed results and their audit trail.
`score_runs` and `score_breakdown` preserve every scoring version. The
`race_prediction_leaderboard` and `season_prediction_leaderboard` views expose
only results belonging to scored, published races.

Phase 1 does not add `prediction_rounds`: fan and host use the same questions,
schedule, and official classification, while `prediction_entries.competition`
and leaderboard partitions provide the required separation. This avoids
duplicating question and answer configuration without limiting multiple races.

## Migration order

Supabase applies the timestamped files in `migrations/` order:

1. `202608150000_prediction_preflight.sql` stops on an unrecognized legacy shape.
2. `202608150001_prediction_schema.sql` creates profiles, race configuration,
   options, entries, answers, official-answer history, and scoring audit tables.
3. `202608150002_prediction_security.sql` adds role helpers, grants, and RLS.
4. `202608150003_prediction_submission.sql` adds the sole client prediction
   write path, `submit_prediction`.
5. `202608150004_official_answers_scoring.sql` adds admin-only official answers
   and versioned transactional scoring.
6. `202608150005_prediction_leaderboards.sql` adds published race and season views.
7. `202608150006_race_question_option_validation.sql` targets the reconciled live
   schema, adds exact per-question option allow-lists for the Dutch GP, and
   validates every submitted value before any prediction write.
8. `202608150007_podium_uniqueness_validation.sql` is guarded against the captured
   live `submit_prediction` definition and requires winner, P2, and P3 to be
   distinct before any prediction write. It makes no table or data changes.

Migrations are additive: they do not delete `host_profiles`, rename live columns,
or erase prediction data. The preflight deliberately refuses to guess how an
unknown existing schema maps to this contract.

## Local setup

Install the Supabase CLI and Docker, then run from the repository root:

```sh
supabase start
supabase db reset
supabase test db
```

`db reset` is destructive and is for the local container only. Never point that
command at a linked or production project. The reset applies migrations and then
`seed.sql`.

Copy `.env.example` to `.env.local` and set the local API URL and publishable
key printed by `supabase status`. Keep `.env.local` uncommitted.

```dotenv
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

## Dutch GP seed and scheduling

The seed creates `2026-dutch-grand-prix`, all seven required questions, 22 driver
options, and 11 constructor options. Answer values are immutable application IDs
such as `driver:norris` and `constructor:1`; labels remain editable display data.

The seeded race is intentionally a draft with NULL schedule fields. Before
opening it, verify the event schedule with an authoritative source and execute a
reviewed admin migration or SQL change equivalent to:

```sql
update public.races
set round_number = :verified_round_number,
    fp1_starts_at = :verified_fp1_timestamptz,
    prediction_locks_at = :verified_fp1_timestamptz,
    race_starts_at = :verified_race_timestamptz,
    prediction_opens_at = :approved_open_timestamptz,
    status = 'open'
where slug = '2026-dutch-grand-prix'
  and status = 'draft';
```

Use timezone-qualified `timestamptz` values. A database constraint requires the
lock to equal FP1, and an open race must have a complete schedule. The submit RPC
uses `clock_timestamp()` and rejects at `server_time >= prediction_locks_at`.
The browser countdown is informational only.

## Profiles and role onboarding

An `auth.users` trigger creates a `profiles` row with role `fan`. Roles are
`fan`, `host`, or `admin`; they are assigned by user UUID, never by a display
name or email string.

Bootstrap the first administrator once through the protected Supabase SQL editor
or another service-role-only process:

```sql
update public.profiles
set role = 'admin'
where id = :verified_admin_auth_user_uuid;
```

After that, an authenticated admin can call:

```sql
select public.set_profile_role(:verified_user_uuid, 'host');
```

Create the real Lakindu and Kasun auth accounts first, verify their UUIDs, and
then assign `host`. No host UUID is seeded because inventing identities would be
unsafe. A host submits to the host competition by requesting `host`; a host is
included in the fan competition only by explicitly requesting `fan`. Fans and
admins cannot request `host`.

## Google OAuth

In Supabase Authentication, enable Google and configure the Google client ID and
secret in the dashboard. Add the Supabase callback URL shown by the dashboard to
Google's authorized redirect URIs. Add each approved application origin and the
prediction route to Supabase redirect URLs. For local development, this project
uses `http://localhost:5173`; production origins must be added explicitly.

OAuth provider secrets and the service-role key remain server/dashboard-only.
The application receives a publishable key and relies on RLS and RPC checks.

## Security contract

- Authenticated users can read only their own entries and answers.
- Direct client insert/update/delete on entries, answers, scores, score runs, and
  score breakdowns is not granted.
- `submit_prediction` derives `auth.uid()` and profile role server-side, validates
  exactly seven active required questions and valid active options, rejects
  duplicate podium drivers, and upserts one entry per race/user/competition.
- RLS independently restricts configuration writes and official answers to admins.
- `set_official_answers` and `score_race` also perform explicit admin checks.
- Exact stable-ID match awards one point; all other results award zero. There is
  no negative scoring, and the database bounds totals to 0–7.
- Score runs are versioned. Every run stores per-entry, per-question breakdowns.
  Official-answer changes are audited; correcting a published result hides stale
  leaderboards until a new scoring run completes.

## Race lifecycle and admin workflow

1. Create a `draft` race, its seven questions, and answer options.
2. Verify schedule values and change the race to `open`.
3. At FP1 the submit RPC rejects further writes even if status was not yet changed.
4. Change status to `locked`, then to `completed` after official results exist.
5. As an admin, save official answers using stable values:

   ```sql
   select public.set_official_answers(
     :race_uuid,
     '{"pole_position":"driver:norris","race_winner":"driver:verstappen"}'::jsonb
   );
   ```

   Partial official-answer saves are allowed for review; scoring requires all seven.

6. Review `official_answers` and `official_answer_history`, then run:

   ```sql
   select public.score_race(:race_uuid, 'Initial official classification');
   ```

7. Review the returned counts, `score_runs`, and `score_breakdown`. A successful
   transaction marks the race `scored` and publishes both leaderboard views.

## Leaderboards

Always filter by competition; fan and host standings never share a rank partition:

```sql
select *
from public.race_prediction_leaderboard
where race_slug = '2026-dutch-grand-prix'
  and competition = 'fan'
order by rank, display_name;

select *
from public.season_prediction_leaderboard
where season = 2026
  and competition = 'host'
order by rank, display_name;
```

Season order is total points, then counts of 7-point results, 6-point results,
and downward through 1-point results. Exact ties share a rank.

## Legacy-schema reconciliation

Before linking or pushing to an existing project, export a schema-only backup and
inspect the current objects:

```sh
supabase db dump --linked --schema public --schema-only --file legacy-public.sql
supabase db push --linked --dry-run
```

Review any existing `races`, `race_questions`, `prediction_entries`, and
`prediction_answers` definitions. The former prototype expected `opens_at`,
`closes_at`, competition `user`, answer display names, and sometimes alternative
answer foreign-key names. Do not bulk-convert those assumptions without a sampled
data audit. Build a project-specific migration that:

1. maps legacy IDs to UUIDs without changing references in place;
2. maps `opens_at` to `prediction_opens_at` only after confirming semantics;
3. maps `closes_at` to `prediction_locks_at` only when it is verified FP1;
4. maps `user` competition to `fan` after checking constraints and duplicates;
5. maps answer labels to seeded stable IDs with an explicit reviewed lookup;
6. verifies one complete seven-answer entry per user/race/competition; and
7. takes a backup before any cutover.

The Phase 1 preflight stops before mutation when the legacy shape is not already
canonical. This is a safety boundary, not an instruction to drop the tables.

## Recovery and rollback

Prefer a forward corrective migration. Before a production push, take a database
backup and test restore procedures. If submissions must be stopped, set the race
to `locked` or `draft`; do not delete prediction rows. If an RPC issue is found,
revoke its authenticated execute grant in a forward migration while preserving
the tables and audit data. Revert application code independently after confirming
it can still read the deployed schema. Never roll back by dropping scored data.

## Production checklist

- Run all SQL tests against a reset local database.
- Review the dry-run SQL against a schema-only export of the target.
- Verify the Google callback URL and approved application origins.
- Confirm only publishable client variables are present in the frontend host.
- Bootstrap and verify admin/host UUIDs through a protected process.
- Confirm all seven Dutch GP questions and option labels with the product owner.
- Enter an authoritative FP1 timestamp and verify lock equals FP1.
- Exercise fan submit/resubmit, host separation, direct-write denial, FP1 lock,
  official-answer correction, rescoring, and both leaderboard queries in staging.
- Take a backup, define an operator and maintenance window, then apply migrations.

No command or file in this repository deploys to a live Supabase project.
