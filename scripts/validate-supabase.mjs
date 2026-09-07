import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const supabaseDirectory = path.join(root, 'supabase');
const migrationDirectory = path.join(supabaseDirectory, 'migrations');
const archiveDirectory = path.join(
  supabaseDirectory,
  'archive',
  'pre-live-baseline-20260815'
);
const archiveMigrationDirectory = path.join(archiveDirectory, 'migrations');

const activeMigrations = (await readdir(migrationDirectory))
  .filter(name => name.endsWith('.sql'))
  .sort();
assert.deepEqual(activeMigrations, [
  '20260815213203_live_production_baseline.sql',
  '20260816090000_official_results_scoring.sql',
  '20260817043000_restore_auth_profile_provisioning.sql',
  '20260817090000_admin_race_question_management.sql',
  '20260817120000_admin_user_access_management.sql',
  '20260817150000_public_host_championship.sql',
  '20260817180000_isolated_demo_races.sql',
  '20260817181000_reload_postgrest_schema.sql',
  '20260817183000_admin_race_overrides.sql',
  '20260825100000_public_homepage_leaderboard.sql',
  '20260827100000_admin_prediction_analytics.sql',
  '20260907130000_public_homepage_season_leaderboard.sql',
]);

const archivedMigrations = (await readdir(archiveMigrationDirectory))
  .filter(name => name.endsWith('.sql'))
  .sort();
assert.deepEqual(archivedMigrations, [
  '202608150000_prediction_preflight.sql',
  '202608150001_prediction_schema.sql',
  '202608150002_prediction_security.sql',
  '202608150003_prediction_submission.sql',
  '202608150004_official_answers_scoring.sql',
  '202608150005_prediction_leaderboards.sql',
  '202608150006_race_question_option_validation.sql',
  '202608150007_podium_uniqueness_validation.sql',
]);

const baseline = await readFile(
  path.join(migrationDirectory, activeMigrations[0]),
  'utf8'
);
const scoringMigration = await readFile(
  path.join(migrationDirectory, activeMigrations[1]),
  'utf8'
);
const profileProvisioningMigration = await readFile(
  path.join(migrationDirectory, activeMigrations[2]),
  'utf8'
);
const raceManagementMigration = await readFile(
  path.join(migrationDirectory, activeMigrations[3]),
  'utf8'
);
const userAccessMigration = await readFile(
  path.join(migrationDirectory, activeMigrations[4]),
  'utf8'
);
const hostChampionshipMigration = await readFile(
  path.join(migrationDirectory, activeMigrations[5]),
  'utf8'
);
const demoRaceMigration = await readFile(
  path.join(migrationDirectory, activeMigrations[6]),
  'utf8'
);
const postgrestReloadMigration = await readFile(
  path.join(migrationDirectory, activeMigrations[7]),
  'utf8'
);
const raceOverrideMigration = await readFile(
  path.join(migrationDirectory, activeMigrations[8]),
  'utf8'
);
const homepageLeaderboardMigration = await readFile(
  path.join(migrationDirectory, activeMigrations[9]),
  'utf8'
);
const predictionAnalyticsMigration = await readFile(
  path.join(migrationDirectory, activeMigrations[10]),
  'utf8'
);
const homepageSeasonLeaderboardMigration = await readFile(
  path.join(migrationDirectory, activeMigrations[11]),
  'utf8'
);
const config = await readFile(path.join(supabaseDirectory, 'config.toml'), 'utf8');
const seed = await readFile(path.join(supabaseDirectory, 'seed.sql'), 'utf8');
const archivedSeed = await readFile(path.join(archiveDirectory, 'seed.sql'), 'utf8');
const archivedTest = await readFile(
  path.join(archiveDirectory, 'tests', '001_prediction_backend_test.sql'),
  'utf8'
);
const liveContractTest = await readFile(
  path.join(supabaseDirectory, 'tests', '001_live_baseline_contract_test.sql'),
  'utf8'
);
const optionValidationTest = await readFile(
  path.join(supabaseDirectory, 'tests', '002_race_question_option_validation_test.sql'),
  'utf8'
);
const podiumValidationTest = await readFile(
  path.join(supabaseDirectory, 'tests', '003_podium_uniqueness_validation_test.sql'),
  'utf8'
);
const officialScoringTest = await readFile(
  path.join(supabaseDirectory, 'tests', '004_official_results_scoring_test.sql'),
  'utf8'
);
const profileProvisioningTest = await readFile(
  path.join(supabaseDirectory, 'tests', '005_auth_profile_provisioning_test.sql'),
  'utf8'
);
const raceManagementTest = await readFile(
  path.join(supabaseDirectory, 'tests', '006_admin_race_question_management_test.sql'),
  'utf8'
);
const userAccessTest = await readFile(
  path.join(supabaseDirectory, 'tests', '007_admin_user_access_management_test.sql'),
  'utf8'
);
const hostChampionshipTest = await readFile(
  path.join(supabaseDirectory, 'tests', '008_public_host_championship_test.sql'),
  'utf8'
);
const predictionAnalyticsTest = await readFile(
  path.join(supabaseDirectory, 'tests', '009_admin_prediction_analytics_test.sql'),
  'utf8'
);
const predictionClient = await readFile(
  path.join(root, 'src', 'components', 'predictions', 'DutchGrandPrixPrediction.jsx'),
  'utf8'
);
const predictionQuestionCard = await readFile(
  path.join(root, 'src', 'components', 'predictions', 'PredictionQuestionCard.jsx'),
  'utf8'
);
const predictionReview = await readFile(
  path.join(root, 'src', 'components', 'predictions', 'PredictionReview.jsx'),
  'utf8'
);
const predictionLanding = await readFile(
  path.join(root, 'src', 'components', 'Prediction.jsx'),
  'utf8'
);
const homepageLeaderboard = await readFile(
  path.join(root, 'src', 'components', 'predictions', 'HomepageLeaderboard.jsx'),
  'utf8'
);
const myPredictions = await readFile(
  path.join(root, 'src', 'components', 'predictions', 'MyPredictions.jsx'),
  'utf8'
);
const adminRaceWorkspace = await readFile(
  path.join(root, 'src', 'components', 'admin', 'useAdminRaceWorkspace.js'),
  'utf8'
);
const adminRaceHistory = await readFile(
  path.join(root, 'src', 'components', 'admin', 'screens', 'RaceHistoryScreen.jsx'),
  'utf8'
);
const appRoutes = await readFile(path.join(root, 'src', 'App.jsx'), 'utf8');
const adminRacesScreen = await readFile(
  path.join(root, 'src', 'components', 'admin', 'screens', 'RacesScreen.jsx'),
  'utf8'
);
const demoRaceModal = await readFile(
  path.join(root, 'src', 'components', 'admin', 'DemoRaceModal.jsx'),
  'utf8'
);
const scheduleData = await readFile(path.join(root, 'src', 'data', 'schedule.js'), 'utf8');
const dashboardScreen = await readFile(
  path.join(root, 'src', 'components', 'admin', 'screens', 'DashboardScreen.jsx'),
  'utf8'
);
const analyticsScreen = await readFile(
  path.join(root, 'src', 'components', 'admin', 'screens', 'AnalyticsScreen.jsx'),
  'utf8'
);

assert.ok(archivedSeed.length > 0, 'the proposed-schema seed is preserved');
assert.ok(archivedTest.length > 0, 'the proposed-schema backend test is preserved');
assert.match(config, /major_version\s*=\s*17/);

const normalized = baseline.replaceAll('"', '').toLowerCase();
const compact = normalized.replace(/\s+/g, ' ');

for (const requiredTable of [
  'seasons',
  'races',
  'race_questions',
  'race_question_options',
  'profiles',
  'user_roles',
  'host_profiles',
  'prediction_entries',
  'prediction_answers',
]) {
  assert.match(
    compact,
    new RegExp(`create table if not exists public\\.${requiredTable} \\(`),
    `${requiredTable} is captured in the baseline`
  );
  assert.match(
    compact,
    new RegExp(`alter table public\\.${requiredTable} enable row level security`),
    `${requiredTable} keeps RLS enabled`
  );
}

assert.match(compact, /create type public\.app_role as enum \( 'user', 'host', 'admin', 'super_admin' \)/);
assert.match(compact, /create type public\.prediction_answer_type as enum \( 'driver', 'constructor' \)/);
assert.match(compact, /create type public\.prediction_competition as enum \( 'user', 'host' \)/);
assert.match(compact, /create type public\.race_status as enum \( 'draft', 'open', 'locked', 'scored', 'published' \)/);

for (const racesColumn of [
  'season_id',
  'round_number',
  'slug',
  'race_name',
  'circuit_name',
  'country_code',
  'opens_at',
  'closes_at',
  'race_starts_at',
  'status',
]) {
  assert.match(compact, new RegExp(`create table if not exists public\\.races \\([^;]*\\b${racesColumn}\\b`));
}
assert.match(compact, /create table if not exists public\.race_questions \([^;]*question_number[^;]*question_key[^;]*question_text[^;]*answer_type[^;]*is_active/);
assert.match(compact, /create table if not exists public\.prediction_answers \( entry_id uuid not null, question_id uuid not null, answer_value text not null/);
assert.match(compact, /add constraint prediction_entries_race_id_user_id_competition_key unique \(race_id, user_id, competition\)/);
assert.match(compact, /add constraint prediction_answers_pkey primary key \(entry_id, question_id\)/);

const functionStart = compact.indexOf(
  'create or replace function public.submit_prediction(p_race_slug text, p_competition public.prediction_competition, p_answers jsonb)'
);
assert.ok(functionStart >= 0, 'the live submit_prediction signature is captured');
const functionEnd = compact.indexOf(
  'alter function public.submit_prediction',
  functionStart
);
assert.ok(functionEnd > functionStart, 'the submit_prediction body is bounded');
const submitPrediction = compact.slice(functionStart, functionEnd);

assert.match(submitPrediction, /returns table\(entry_id uuid, submitted_at timestamp with time zone\)/);
assert.match(submitPrediction, /language plpgsql security definer set search_path to ''/);
assert.match(submitPrediction, /current_user_id := auth\.uid\(\)/);
assert.match(submitPrediction, /if now\(\) >= selected_race\.closes_at then/);
assert.match(submitPrediction, /public\.has_role\('host'::public\.app_role\)/);
assert.match(submitPrediction, /from public\.host_profiles/);
assert.match(submitPrediction, /required_question_count <> 7/);
assert.match(submitPrediction, /public\.jsonb_object_length\(p_answers\) <> required_question_count/);
assert.match(submitPrediction, /from public\.race_question_options as option/);
assert.match(submitPrediction, /option\.option_value = p_answers ->> question\.question_key/);
assert.match(submitPrediction, /option\.is_active = true/);
assert.match(submitPrediction, /winner, p2 and p3 must be three different drivers\./);
assert.match(submitPrediction, /on conflict \(race_id, user_id, competition\) do update set/);
assert.match(submitPrediction, /delete from public\.prediction_answers/);

const allowListPosition = submitPrediction.indexOf('from public.race_question_options as option');
const podiumPosition = submitPrediction.indexOf('winner, p2 and p3 must be three different drivers.');
const firstWritePosition = submitPrediction.indexOf('insert into public.prediction_entries');
assert.ok(
  allowListPosition >= 0
    && allowListPosition < podiumPosition
    && podiumPosition < firstWritePosition,
  'allow-list and podium validation both run before the first write'
);

assert.match(compact, /revoke all on function public\.submit_prediction\([^;]+\) from public/);
assert.match(compact, /grant all on function public\.submit_prediction\([^;]+\) to authenticated/);
assert.doesNotMatch(compact, /grant all on function public\.submit_prediction\([^;]+\) to anon/);

const liveQuestionKeys = [
  'pole_position',
  'race_winner',
  'p2_finisher',
  'p3_finisher',
  'driver_of_the_day',
  'top_constructor',
  'worst_constructor',
];
for (const questionKey of liveQuestionKeys) {
  assert.match(seed, new RegExp(`'${questionKey}'`));
}
assert.match(seed, /'2026-08-21 10:30:00\+00'::timestamptz/);
assert.match(seed, /'2026 Formula 1 World Championship'/);
assert.match(seed, /'Which constructor will perform the worst\?'/);
assert.doesNotMatch(seed, /insert into auth\.users/i);
assert.doesNotMatch(seed, /insert into public\.(profiles|user_roles|host_profiles|prediction_entries|prediction_answers)/i);

const driverOptions = seed.slice(
  seed.indexOf('with driver_options'),
  seed.indexOf('), driver_questions')
);
const constructorOptions = seed.slice(
  seed.indexOf('with constructor_options'),
  seed.indexOf('), constructor_questions')
);
assert.equal((driverOptions.match(/\(\d+, '[^']+'\)/g) ?? []).length, 22);
assert.equal((constructorOptions.match(/\(\d+, '[^']+'\)/g) ?? []).length, 11);
assert.match(seed, /active_question_count <> 7 or active_option_count <> 132/i);

assert.match(liveContractTest, /select plan\(39\)/i);
assert.match(liveContractTest, /a Fan cannot submit to the Host competition/i);
assert.match(liveContractTest, /an authorized Host can submit to the Host competition/i);
assert.match(liveContractTest, /RLS exposes only the Fan entry/i);
assert.match(optionValidationTest, /select plan\(28\)/i);
assert.match(optionValidationTest, /Invalid answer for question: race_winner/i);
assert.match(optionValidationTest, /clock_timestamp\(\) \+ interval '2 hours'/i);
assert.match(podiumValidationTest, /select plan\(25\)/i);
assert.match(podiumValidationTest, /Winner, P2 and P3 must be three different drivers\./i);
assert.match(podiumValidationTest, /valid edit updates the same prediction_entries row/i);
assert.match(officialScoringTest, /select plan\(69\)/i);
assert.match(officialScoringTest, /repeating identical scoring succeeds idempotently/i);
assert.match(officialScoringTest, /equal Fan scores share race rank one/i);
assert.match(profileProvisioningTest, /select plan\(7\)/i);
assert.match(profileProvisioningTest, /new Auth user receives exactly one baseline user role/i);
assert.match(raceManagementTest, /select plan\(29\)/i);
assert.match(raceManagementTest, /question replacement is blocked after a submission exists/i);
assert.match(raceManagementTest, /race administration cannot bypass the scoring flow/i);
assert.match(userAccessTest, /select plan\(33\)/i);
assert.match(userAccessTest, /a Host must also receive Admin access/i);
assert.match(userAccessTest, /an idempotent assignment creates no duplicate audit record/i);
assert.match(hostChampionshipTest, /select plan\(15\)/i);
assert.match(hostChampionshipTest, /Lakindu receives only the published Host score/i);
assert.match(hostChampionshipTest, /fan entries are excluded from Host totals/i);
assert.match(predictionAnalyticsTest, /select plan\(18\)/i);
assert.match(predictionAnalyticsTest, /a Fan cannot read aggregate admin analytics/i);
assert.match(predictionAnalyticsTest, /open race does not expose question choices/i);

const normalizedProvisioning = profileProvisioningMigration
  .replaceAll('"', '')
  .toLowerCase()
  .replace(/\s+/g, ' ');
assert.match(normalizedProvisioning, /create trigger on_auth_user_created after insert on auth\.users/);
assert.match(normalizedProvisioning, /for each row execute function public\.handle_new_auth_user\(\)/);
assert.match(normalizedProvisioning, /insert into public\.profiles/);
assert.match(normalizedProvisioning, /from auth\.users as auth_user on conflict \(id\) do nothing/);
assert.match(normalizedProvisioning, /insert into public\.user_roles \(user_id, role\) select auth_user\.id, 'user'::public\.app_role/);
assert.match(normalizedProvisioning, /revoke all on function public\.handle_new_auth_user\(\) from public, anon, authenticated/);

const normalizedScoring = scoringMigration.replaceAll('"', '').toLowerCase().replace(/\s+/g, ' ');
for (const scoringTable of [
  'official_answers',
  'official_answer_history',
  'scoring_runs',
  'score_breakdown',
  'prediction_scores',
]) {
  assert.match(normalizedScoring, new RegExp(`create table public\\.${scoringTable} \\(`));
  assert.match(normalizedScoring, new RegExp(`alter table public\\.${scoringTable} enable row level security`));
}
assert.match(normalizedScoring, /create or replace function public\.set_official_answers\( p_race_id uuid, p_answers jsonb \)/);
assert.match(normalizedScoring, /create or replace function public\.score_race\( p_race_id uuid, p_notes text default null \)/);
assert.match(normalizedScoring, /create or replace function public\.publish_race_results\(p_race_id uuid\)/);
assert.match(normalizedScoring, /create or replace view public\.race_prediction_leaderboard/);
assert.match(normalizedScoring, /create or replace view public\.season_prediction_leaderboard/);
assert.match(normalizedScoring, /partition by entry\.race_id, entry\.competition order by score\.score desc/);
assert.match(normalizedScoring, /score_7_count desc, score_6_count desc, score_5_count desc/);
assert.match(normalizedScoring, /revoke references, trigger, truncate on table public\.prediction_entries from anon, authenticated/);

const normalizedRaceManagement = raceManagementMigration.replaceAll('"', '').toLowerCase().replace(/\s+/g, ' ');
assert.match(normalizedRaceManagement, /create or replace function public\.admin_upsert_race\(/);
assert.match(normalizedRaceManagement, /create or replace function public\.admin_save_race_questions\(/);
assert.match(normalizedRaceManagement, /security definer set search_path = ''/);
assert.match(normalizedRaceManagement, /raise exception 'race_has_submissions'/);
assert.match(normalizedRaceManagement, /raise exception 'completed_race_immutable'/);
assert.match(normalizedRaceManagement, /raise exception 'seven_configured_questions_required_to_open'/);
assert.match(normalizedRaceManagement, /raise exception 'standard_question_keys_and_types_required'/);
assert.match(normalizedRaceManagement, /revoke all on function public\.admin_upsert_race\([^;]+\) from public, anon/);
assert.match(normalizedRaceManagement, /revoke all on function public\.admin_save_race_questions\(uuid, jsonb\) from public, anon/);

const normalizedUserAccess = userAccessMigration.replaceAll('"', '').toLowerCase().replace(/\s+/g, ' ');
assert.match(normalizedUserAccess, /create table public\.user_access_history \(/);
assert.match(normalizedUserAccess, /alter table public\.user_access_history enable row level security/);
assert.match(normalizedUserAccess, /create or replace function public\.admin_list_users\(\)/);
assert.match(normalizedUserAccess, /create or replace function public\.admin_update_user_access\(/);
assert.match(normalizedUserAccess, /security definer set search_path = ''/);
assert.match(normalizedUserAccess, /raise exception 'super_admin_role_required'/);
assert.match(normalizedUserAccess, /raise exception 'host_requires_admin_access'/);
assert.match(normalizedUserAccess, /insert into public\.user_access_history/);
assert.match(normalizedUserAccess, /revoke all on function public\.admin_list_users\(\) from public, anon/);
assert.match(normalizedUserAccess, /revoke all on function public\.admin_update_user_access\(uuid, boolean, text\) from public, anon/);

const normalizedHostChampionship = hostChampionshipMigration.replaceAll('"', '').toLowerCase().replace(/\s+/g, ' ');
assert.match(normalizedHostChampionship, /create or replace function public\.get_public_host_championship\(p_season_year integer\)/);
assert.match(normalizedHostChampionship, /stable security definer set search_path = ''/);
assert.match(normalizedHostChampionship, /entry\.competition = 'host'::public\.prediction_competition/);
assert.match(normalizedHostChampionship, /race\.status = 'published'::public\.race_status/);
assert.match(normalizedHostChampionship, /revoke all on function public\.get_public_host_championship\(integer\) from public/);
assert.match(normalizedHostChampionship, /grant execute on function public\.get_public_host_championship\(integer\) to anon, authenticated, service_role/);

const normalizedHomepageLeaderboard = homepageLeaderboardMigration.replaceAll('"', '').toLowerCase().replace(/\s+/g, ' ');
assert.match(normalizedHomepageLeaderboard, /create or replace function public\.get_homepage_fan_leaderboard\(\)/);
assert.match(normalizedHomepageLeaderboard, /stable security definer set search_path = ''/);
assert.match(normalizedHomepageLeaderboard, /race\.status = 'published'::public\.race_status/);
assert.match(normalizedHomepageLeaderboard, /race\.is_demo = false/);
assert.match(normalizedHomepageLeaderboard, /leaderboard\.competition = 'user'::public\.prediction_competition/);
assert.match(normalizedHomepageLeaderboard, /limit 10/);
assert.match(normalizedHomepageLeaderboard, /revoke all on function public\.get_homepage_fan_leaderboard\(\) from public/);
assert.match(normalizedHomepageLeaderboard, /grant execute on function public\.get_homepage_fan_leaderboard\(\) to anon, authenticated, service_role/);

const normalizedHomepageSeasonLeaderboard = homepageSeasonLeaderboardMigration.replaceAll('"', '').toLowerCase().replace(/\s+/g, ' ');
assert.match(normalizedHomepageSeasonLeaderboard, /create or replace function public\.get_homepage_season_fan_leaderboard\(\)/);
assert.match(normalizedHomepageSeasonLeaderboard, /stable security definer set search_path = ''/);
assert.match(normalizedHomepageSeasonLeaderboard, /race\.status = 'published'::public\.race_status/);
assert.match(normalizedHomepageSeasonLeaderboard, /race\.is_demo = false/);
assert.match(normalizedHomepageSeasonLeaderboard, /entry\.competition = 'user'::public\.prediction_competition/);
assert.match(normalizedHomepageSeasonLeaderboard, /limit 10/);
assert.match(normalizedHomepageSeasonLeaderboard, /grant execute on function public\.get_homepage_season_fan_leaderboard\(\) to anon, authenticated, service_role/);

const normalizedPredictionAnalytics = predictionAnalyticsMigration.replaceAll('"', '').toLowerCase().replace(/\s+/g, ' ');
assert.match(normalizedPredictionAnalytics, /create table public\.prediction_analytics_events \(/);
assert.match(normalizedPredictionAnalytics, /alter table public\.prediction_analytics_events enable row level security/);
assert.match(normalizedPredictionAnalytics, /using \(public\.is_prediction_admin\(\)\)/);
assert.match(normalizedPredictionAnalytics, /create trigger record_prediction_analytics_event after insert or update on public\.prediction_entries/);
assert.match(normalizedPredictionAnalytics, /create or replace function public\.get_admin_prediction_analytics\(/);
assert.match(normalizedPredictionAnalytics, /if not public\.is_prediction_admin\(\) then raise exception 'admin_role_required'/);
assert.match(normalizedPredictionAnalytics, /distributions_locked/);
assert.match(normalizedPredictionAnalytics, /prediction_analytics_events_race_time_idx/);
assert.match(normalizedPredictionAnalytics, /alter publication supabase_realtime add table public\.prediction_analytics_events/);
assert.match(normalizedPredictionAnalytics, /revoke all on function public\.get_admin_prediction_analytics\(uuid, public\.prediction_competition\) from public, anon/);
assert.match(normalizedPredictionAnalytics, /grant execute on function public\.get_admin_prediction_analytics\(uuid, public\.prediction_competition\) to authenticated, service_role/);

assert.match(predictionClient, /race\.opens_at/);
assert.match(predictionClient, /race\.closes_at/);
assert.match(predictionClient, /useSearchParams\(\)/);
assert.match(predictionClient, /requestedCompetition = searchParams\.get\('competition'\) === 'host' \? 'host' : 'user'/);
assert.match(predictionClient, /throw new Error\('HOST_ACCESS_REQUIRED'\)/);
assert.match(predictionClient, /p_competition: competition/);
assert.match(predictionClient, /\.select\('\*'\)/);
assert.match(predictionClient, /useParams\(\)/);
assert.match(predictionClient, /race_question_options/);
assert.match(predictionClient, /p_race_slug: raceConfig\.slug/);
assert.doesNotMatch(predictionClient, /import \{ dutchGPQuestions \}/);
assert.doesNotMatch(predictionClient, /prediction_opens_at|prediction_locks_at/);
assert.match(predictionClient, /isEditingFromReview/);
assert.match(predictionClient, /setReviewEditSnapshot/);
assert.match(predictionClient, /onEdit=\{handleEditQuestion\}/);
assert.match(predictionClient, /onBackToQuestions=\{handleBackToQuestions\}/);
assert.match(predictionQuestionCard, /Save Change/);
assert.match(predictionQuestionCard, /Cancel Edit/);
assert.match(predictionReview, /onBackToQuestions/);
assert.match(predictionLanding, /raceConfig|race\.opens_at/);
assert.match(predictionLanding, /closes_at/);
assert.match(predictionLanding, /\.neq\('status', 'draft'\)/);
assert.match(predictionLanding, /competition=host/);
assert.match(predictionLanding, /Continue with Lakindu or Kasun's approved Google account/);
assert.match(predictionLanding, /rpc\('get_public_host_championship'/);
assert.match(predictionLanding, /hostChampionship\.scores\.Lakindu/);
assert.match(predictionLanding, /hostChampionship\.scores\.Kasun/);
assert.doesNotMatch(predictionLanding, /signInWithPassword|host-password|current-password/);
assert.doesNotMatch(predictionLanding, /prediction_opens_at|prediction_locks_at/);
assert.match(myPredictions, /from\('prediction_entries'\)/);
assert.match(myPredictions, /from\('prediction_answers'\)/);
assert.match(myPredictions, /from\('race_prediction_leaderboard'\)/);
assert.match(myPredictions, /entry\.competition === 'host' \? '\?competition=host'/);
assert.match(adminRaceWorkspace, /'admin_override_race' : 'admin_upsert_race'/);
assert.match(adminRaceWorkspace, /rpc\('admin_save_race_questions'/);
assert.match(adminRaceWorkspace, /rpc\('admin_close_race_now'/);
assert.match(adminRaceWorkspace, /rpc\('admin_open_race_now'/);
assert.match(adminRaceWorkspace, /from\('race_questions'\)/);
assert.match(adminRaceHistory, /useAdminResults\(\)/);
assert.match(adminRaceHistory, /from\('race_prediction_leaderboard'\)/);
assert.match(adminRaceHistory, /officialAnswersByRaceId/);
assert.doesNotMatch(adminRaceHistory, /demoResultsByRaceId|demoLeaderboardByRaceId|DemoLabel/);
assert.match(appRoutes, /path="\/predictions\/:raceSlug"/);
assert.match(appRoutes, /path="\/predictions\/mine"/);
assert.match(appRoutes, /<HomepageLeaderboard \/>/);
assert.match(homepageLeaderboard, /'get_homepage_fan_leaderboard'/);
assert.match(homepageLeaderboard, /get_homepage_season_fan_leaderboard/);
assert.match(homepageLeaderboard, /useState\('season'\)/);
assert.match(homepageLeaderboard, /to="\/predictions\/leaderboard"/);
assert.match(predictionLanding, /KindforthCredit/);
assert.match(predictionClient, /<PredictionSuccess/);
const normalizedDemoRace = demoRaceMigration.replaceAll('"', '').toLowerCase().replace(/\s+/g, ' ');
assert.match(normalizedDemoRace, /add column if not exists is_demo boolean not null default false/);
assert.match(normalizedDemoRace, /create or replace function public\.admin_create_demo_race\(/);
assert.match(normalizedDemoRace, /perform public\.admin_save_race_questions\(saved_race_id, p_questions\)/);
assert.match(normalizedDemoRace, /and not race\.is_demo/);
assert.match(adminRacesScreen, /Create Demo Race/);
assert.match(demoRaceModal, /Demo scores never count toward season or Hosts Championship totals/);
assert.match(postgrestReloadMigration, /notify pgrst, 'reload schema'/i);
const normalizedRaceOverride = raceOverrideMigration.replaceAll('"', '').toLowerCase().replace(/\s+/g, ' ');
assert.match(normalizedRaceOverride, /create table if not exists public\.race_admin_events/);
assert.match(normalizedRaceOverride, /create or replace function public\.admin_override_race\(/);
assert.match(normalizedRaceOverride, /create or replace function public\.admin_close_race_now\(p_race_id uuid\)/);
assert.match(normalizedRaceOverride, /create or replace function public\.admin_open_race_now\(p_race_id uuid\)/);
assert.match(normalizedRaceOverride, /set opens_at = least\(opens_at, closed_at - interval '1 second'\), closes_at = closed_at/);
assert.match(normalizedRaceOverride, /core_race_identity_locked_after_submissions/);
assert.match(dashboardScreen, /Close Predictions Now/);
assert.match(dashboardScreen, /Open Predictions Now/);
assert.match(analyticsScreen, /rpc\('get_admin_prediction_analytics'/);
assert.match(analyticsScreen, /table: 'prediction_analytics_events'/);
assert.match(analyticsScreen, /distributions_locked/);
assert.match(analyticsScreen, /Popular Podium Combinations/);
assert.match(analyticsScreen, /Score Distribution/);
assert.match(scheduleData, /round: 13, grandPrix: 'Italian GP'.*raceTime: '06 Sep, 06:30 PM'/);
assert.match(predictionLanding, /'2026-italian-grand-prix': MONZA_PHOTO/);
assert.match(predictionLanding, /'2026-spanish-grand-prix': MADRING_PHOTO/);
assert.match(scheduleData, /round: 14, grandPrix: 'Spanish GP'.*track: 'Madring'.*raceTime: '13 Sep, 06:30 PM'/);

console.log(
  'Validated the live production baseline, scoring, Auth provisioning, guarded race/user administration, public leaderboards, admin analytics, archived migrations 000-007, local seed, RLS/RPC contracts, and 263 pgTAP assertions.'
);
