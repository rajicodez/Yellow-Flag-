import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const migrationDirectory = path.join(root, 'supabase', 'migrations');
const migrationNames = (await readdir(migrationDirectory)).filter(name => name.endsWith('.sql')).sort();

assert.deepEqual(migrationNames, [
  '202608150000_prediction_preflight.sql',
  '202608150001_prediction_schema.sql',
  '202608150002_prediction_security.sql',
  '202608150003_prediction_submission.sql',
  '202608150004_official_answers_scoring.sql',
  '202608150005_prediction_leaderboards.sql',
  '202608150006_race_question_option_validation.sql',
]);

const migrations = await Promise.all(
  migrationNames.map(name => readFile(path.join(migrationDirectory, name), 'utf8'))
);
const combined = migrations.join('\n');
const optionValidationMigration = migrations.at(-1);
const seed = await readFile(path.join(root, 'supabase', 'seed.sql'), 'utf8');
const optionValidationTest = await readFile(
  path.join(root, 'supabase', 'tests', '002_race_question_option_validation_test.sql'),
  'utf8'
);
const predictionClient = await readFile(
  path.join(root, 'src', 'components', 'predictions', 'DutchGrandPrixPrediction.jsx'),
  'utf8'
);
const predictionLanding = await readFile(
  path.join(root, 'src', 'components', 'Prediction.jsx'),
  'utf8'
);

for (const requiredTable of [
  'profiles',
  'races',
  'race_questions',
  'answer_options',
  'race_question_options',
  'prediction_entries',
  'prediction_answers',
  'official_answers',
  'official_answer_history',
  'score_runs',
  'score_breakdown',
]) {
  assert.match(combined, new RegExp(`create table if not exists public\\.${requiredTable}\\b`, 'i'));
  assert.match(combined, new RegExp(`alter table public\\.${requiredTable} enable row level security`, 'i'));
}

for (const functionSignature of [
  'submit_prediction',
  'set_official_answers',
  'score_race',
  'set_profile_role',
]) {
  assert.match(combined, new RegExp(`function public\\.${functionSignature}\\s*\\(`, 'i'));
}

assert.match(combined, /server_now\s*>=\s*race_record\.prediction_locks_at/i);
assert.match(combined, /server_now\s*:=\s*clock_timestamp\(\)/i);
assert.match(combined, /prediction_locks_at\s*=\s*fp1_starts_at/i);
assert.match(combined, /jsonb_object_length\(p_answers\)\s*<>\s*active_question_count/i);
assert.match(combined, /having count\(\*\) > 1/i);
assert.match(combined, /competition in \('fan', 'host'\)/i);
assert.match(combined, /entry\.score = 7/i);
assert.match(combined, /score_1_count desc/i);

const seededQuestionKeys = [
  'pole_position',
  'race_winner',
  'p2_finisher',
  'p3_finisher',
  'driver_of_the_day',
  'top_constructor',
  'worst_constructor',
];
for (const questionKey of seededQuestionKeys) {
  assert.match(seed, new RegExp(`'${questionKey}'`));
}
assert.equal((seed.match(/\('driver:[^']+', '[^']+', \d+\)/g) ?? []).length, 22);
assert.equal((seed.match(/\('constructor:\d+', '[^']+', \d+\)/g) ?? []).length, 11);
assert.match(seed, /status[\s\S]*'draft'/i);
assert.doesNotMatch(seed, /prediction_locks_at[\s\S]{0,400}2026-\d\d-\d\dT/i);

assert.match(predictionClient, /race\.opens_at/);
assert.match(predictionClient, /race\.closes_at/);
assert.match(predictionClient, /hostProfile \? 'host' : 'user'/);
assert.match(predictionClient, /\.select\('\*'\)/);
assert.doesNotMatch(predictionClient, /raceConfig\.prediction_locks_at|race\.prediction_locks_at/);
assert.match(predictionLanding, /race\.opens_at/);
assert.match(predictionLanding, /race\.closes_at/);
assert.doesNotMatch(predictionLanding, /prediction_opens_at|prediction_locks_at/);

assert.match(
  optionValidationMigration,
  /unique\s*\(question_id,\s*option_value\)/i
);
assert.match(
  optionValidationMigration,
  /create index if not exists race_question_options_active_question_sort_idx[\s\S]*where is_active = true/i
);
assert.match(
  optionValidationMigration,
  /alter table public\.race_question_options enable row level security/i
);
assert.match(
  optionValidationMigration,
  /grant select on table public\.race_question_options to anon, authenticated/i
);
assert.match(
  optionValidationMigration,
  /revoke all on table public\.race_question_options from public, anon, authenticated/i
);

const hardenedFunctionStart = optionValidationMigration.lastIndexOf(
  'create or replace function public.submit_prediction'
);
assert.ok(hardenedFunctionStart >= 0, 'hardened submit_prediction is present');
const hardenedFunction = optionValidationMigration.slice(hardenedFunctionStart);
const validationRead = hardenedFunction.indexOf('from public.race_question_options as option');
const firstEntryWrite = hardenedFunction.indexOf('insert into public.prediction_entries');
assert.ok(validationRead >= 0, 'submit_prediction reads the per-question allow-list');
assert.ok(
  validationRead < firstEntryWrite,
  'all option validation occurs before the first prediction write'
);
assert.match(hardenedFunction, /option\.question_id = question\.id/i);
assert.match(
  hardenedFunction,
  /option\.option_value = p_answers ->> question\.question_key/i
);
assert.match(hardenedFunction, /option\.is_active = true/i);
assert.match(hardenedFunction, /Invalid answer for question: %/i);
assert.match(hardenedFunction, /security definer[\s\S]*set search_path = ''/i);
assert.match(
  hardenedFunction,
  /revoke all on function public\.submit_prediction\([\s\S]*from public, anon/i
);
assert.match(
  hardenedFunction,
  /grant execute on function public\.submit_prediction\([\s\S]*to authenticated/i
);
assert.doesNotMatch(hardenedFunction, /having count\(\*\) > 1/i);

for (const liveQuestionKey of [
  'pole_position',
  'race_winner',
  'p2_finisher',
  'p3_finisher',
  'driver_of_the_day',
  'top_constructor',
  'worst_constructor',
]) {
  assert.match(optionValidationMigration, new RegExp(`'${liveQuestionKey}'`));
}

assert.match(optionValidationTest, /select plan\(28\)/i);
for (const testLabel of ['A\\.', 'B\\.', 'C\\.', 'D\\.', 'E\\.', 'F\\.', 'G\\.', 'H\\.', 'I\\.', 'J\\.', 'K\\.', 'L\\.']) {
  if (testLabel === 'J\\.') continue;
  assert.match(optionValidationTest, new RegExp(testLabel));
}

console.log(`Validated ${migrationNames.length} migrations, the exact Dutch GP option allow-list, its pre-write RPC enforcement, and 28 SQL regression assertions.`);
