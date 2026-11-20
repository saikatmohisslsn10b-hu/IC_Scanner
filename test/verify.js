/**
 * Comprehensive Verification Test Suite
 * Validates Strict API-Only Architecture and Token-Only CSV Logging.
 */

import fs from 'fs';
import path from 'path';
import assert from 'assert';
import {
  formatCsvRow,
  escapeCsvField,
  resolveTokenStats,
  formatReadableTimestamp,
  CSV_HEADERS
} from '../src/services/csvLogger.js';
import {
  isApiKeyConfigured,
  isModelConfigured,
  PROVIDERS,
  OPENROUTER_BASE_URL
} from '../src/config.js';

console.log('=== STARTING STRICT API-ONLY ARCHITECTURE VERIFICATION ===\n');

// --- Test 1: Absolute Source Restriction & Elimination of Alternative Sources ---
console.log('1. Checking Elimination of Alternative Sources & Local Datasets...');

// Verify public/json_database is completely removed
const jsonDbPath = path.resolve(process.cwd(), 'public/json_database');
assert.strictEqual(fs.existsSync(jsonDbPath), false, 'public/json_database must be completely eliminated');
console.log('   ✓ Local JSON database (public/json_database) is completely eliminated.');

// Verify package.json contains no database or scraping packages
const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf8'));
const prohibitedPackages = ['@google/genai', 'axios', 'cheerio', 'express', 'cors', 'mongodb', 'mysql', 'pg', 'sqlite3', 'firebase', 'supabase'];
prohibitedPackages.forEach(dep => {
  assert.strictEqual(pkg.dependencies?.[dep], undefined, `Prohibited dependency found: ${dep}`);
});
console.log('   ✓ package.json has zero database, scraping, or alternative AI dependencies.');

// Verify no source files reference json_database or getStandardPinName
const srcFiles = ['src/components/tabs/PinTopologyTab.jsx', 'src/components/tabs/ICViewer3DTab.jsx', 'src/components/tabs/InteractiveBreadboard.jsx'];
srcFiles.forEach(file => {
  const content = fs.readFileSync(path.resolve(process.cwd(), file), 'utf8');
  assert.ok(!content.includes('/json_database/'), `${file} must not reference /json_database/`);
  assert.ok(!content.includes('getStandardPinName'), `${file} must not reference hardcoded pin dictionaries`);
});
console.log('   ✓ All tabs use 100% OpenRouter API pinout data (no local DB, no dictionaries).');

// --- Test 2: Providers Status ---
console.log('2. Checking Active and Disabled Providers...');
assert.strictEqual(PROVIDERS.openrouter?.name, 'OpenRouter', 'OpenRouter must be present in PROVIDERS');
assert.strictEqual(PROVIDERS.local_qwen, undefined, 'local_qwen must be disabled');
assert.strictEqual(PROVIDERS.deepseek, undefined, 'deepseek must be disabled');
assert.strictEqual(PROVIDERS.gemini, undefined, 'direct gemini must be disabled');
assert.strictEqual(PROVIDERS.glm, undefined, 'glm must be disabled');
assert.strictEqual(PROVIDERS.sarvam, undefined, 'sarvam must be disabled');
assert.strictEqual(OPENROUTER_BASE_URL, 'https://openrouter.ai/api/v1');
console.log('   ✓ Only OpenRouter is active. All local and third-party AI models disabled.');

// --- Test 3: 4-Column Token-Only Header & Timestamp ---
console.log('3. Testing CSV Headers and Timestamp Format...');
assert.strictEqual(CSV_HEADERS, 'Timestamp,Input_Tokens,Output_Tokens,Total_Tokens', 'Header must be exactly: Timestamp,Input_Tokens,Output_Tokens,Total_Tokens');

const sampleDate = new Date('2026-11-20T15:25:30.000Z');
const readableTs = formatReadableTimestamp(sampleDate);
assert.match(readableTs, /^\d{2}-\d{2}-\d{4} \d{2}:\d{2}:\d{2}$/, 'Timestamp must match DD-MM-YYYY HH:mm:ss');
console.log(`   ✓ Headers verified: ${CSV_HEADERS}`);

// --- Test 4: Token Stats Resolution from Actual OpenRouter Metadata ---
console.log('4. Testing Token Stats Resolution from OpenRouter Metadata...');
const stats1 = resolveTokenStats({ prompt_tokens: 2191, completion_tokens: 2152 });
assert.strictEqual(stats1.inputTokens, 2191);
assert.strictEqual(stats1.outputTokens, 2152);
assert.strictEqual(stats1.totalTokens, 4343, 'Total_Tokens must equal Input_Tokens + Output_Tokens');

const stats2 = resolveTokenStats({ prompt_tokens: 1000, completion_tokens: 250, total_tokens: 1250 });
assert.strictEqual(stats2.inputTokens, 1000);
assert.strictEqual(stats2.outputTokens, 250);
assert.strictEqual(stats2.totalTokens, 1250);

// Missing completion tokens: leave output blank
const stats3 = resolveTokenStats({ prompt_tokens: 500 });
assert.strictEqual(stats3.inputTokens, 500);
assert.strictEqual(stats3.outputTokens, '');
assert.strictEqual(stats3.totalTokens, 500);

// Missing all metadata: leave all blank without error
const stats4 = resolveTokenStats(null);
assert.strictEqual(stats4.inputTokens, '');
assert.strictEqual(stats4.outputTokens, '');
assert.strictEqual(stats4.totalTokens, '');
console.log('   ✓ Token statistics correctly extracted and missing values handled as blanks.');

// --- Test 5: Verify NO Prompts, IC Names, Raw JSON, or Outputs are Logged ---
console.log('5. Verifying Exclusion of Text/Prompt/JSON from CSV...');
const rowFormatted = formatCsvRow({
  timestamp: '20-11-2026 15:25:30',
  inputTokens: 2191,
  outputTokens: 2152,
  totalTokens: 4343
});
assert.strictEqual(rowFormatted, '20-11-2026 15:25:30,2191,2152,4343\r\n');
assert.ok(!rowFormatted.includes('Identify'), 'Must NOT contain prompt/input text');
assert.ok(!rowFormatted.includes('ATmega'), 'Must NOT contain IC name');
assert.ok(!rowFormatted.includes('{'), 'Must NOT contain raw JSON');
console.log('   ✓ Verified: CSV strictly contains token statistics only.');

// --- Test 6: Writing and Appending Multiple Token Rows ---
console.log('6. Testing Multi-Row Token Logging and Excel Formatting...');
const testCsvPath = path.resolve(process.cwd(), 'test_tokens_sample.csv');
if (fs.existsSync(testCsvPath)) {
  fs.unlinkSync(testCsvPath);
}

fs.writeFileSync(testCsvPath, CSV_HEADERS + '\r\n', 'utf8');

// Append call 1 (Scan: 2191 in, 2152 out, 4343 total)
fs.appendFileSync(testCsvPath, formatCsvRow({
  timestamp: '20-11-2026 15:44:13',
  inputTokens: 2191,
  outputTokens: 2152,
  totalTokens: 4343
}), 'utf8');

// Append call 2 (Chat: 1000 in, 250 out, 1250 total)
fs.appendFileSync(testCsvPath, formatCsvRow({
  timestamp: '20-11-2026 15:50:00',
  inputTokens: 1000,
  outputTokens: 250,
  totalTokens: 1250
}), 'utf8');

const content = fs.readFileSync(testCsvPath, 'utf8');
const lines = content.trim().split(/\r?\n/);
assert.strictEqual(lines.length, 3, 'Must have header + 2 rows');
assert.strictEqual(lines[0], 'Timestamp,Input_Tokens,Output_Tokens,Total_Tokens');

for (let i = 0; i < lines.length; i++) {
  const cols = lines[i].split(',');
  assert.strictEqual(cols.length, 4, `Line ${i} must have exactly 4 columns: ${lines[i]}`);
}

assert.strictEqual(lines[1], '20-11-2026 15:44:13,2191,2152,4343');
assert.strictEqual(lines[2], '20-11-2026 15:50:00,1000,250,1250');

console.log('   ✓ Verified 4-column token-only table:');
lines.forEach(l => console.log('     | ' + l));

// Clean up sample file
fs.unlinkSync(testCsvPath);

// --- Test 7: Gitignore Check ---
console.log('7. Checking .gitignore rules for security...');
const gitignore = fs.readFileSync(path.resolve(process.cwd(), '.gitignore'), 'utf8');
assert.ok(gitignore.includes('*.csv'), '.gitignore must ignore *.csv');
assert.ok(gitignore.includes('openrouter_usage_log.csv'), '.gitignore must ignore openrouter_usage_log.csv');
console.log('   ✓ .gitignore excludes all CSV files.');

console.log('\n=== ALL STRICT API-ONLY VERIFICATION TESTS PASSED ===');
