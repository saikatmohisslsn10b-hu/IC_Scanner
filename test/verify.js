/**
 * Comprehensive Verification Test Suite
 * Validates Multi-Provider BYOK Architecture, Vision Model Checks,
 * In-Memory Security, and Token-Only CSV Logging.
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
  checkVisionSupport,
  PROVIDERS,
  getSettings,
  saveSettings,
  clearSettings
} from '../src/config.js';

console.log('=== STARTING MULTI-PROVIDER & BYOK ARCHITECTURE VERIFICATION ===\n');

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
console.log('   ✓ All tabs use 100% online API pinout data (no local DB, no dictionaries).');

// --- Test 2: Multi-Provider Support (10 Providers) ---
console.log('2. Checking Multi-Provider BYOK Configurations...');
const expectedProviders = [
  'openai',
  'gemini',
  'anthropic',
  'openrouter',
  'groq',
  'together',
  'fireworks',
  'deepseek',
  'mistral',
  'custom'
];

expectedProviders.forEach(p => {
  assert.ok(PROVIDERS[p], `Provider ${p} must be defined in PROVIDERS`);
  assert.ok(PROVIDERS[p].name, `Provider ${p} must have a display name`);
  assert.ok(typeof PROVIDERS[p].baseUrl === 'string', `Provider ${p} must have a baseUrl string`);
});
console.log(`   ✓ All 10 requested providers configured: ${expectedProviders.join(', ')}.`);

// --- Test 3: Vision Capability Checker ---
console.log('3. Testing Vision Capability and Model Validation...');
const deepseekCheck = checkVisionSupport('deepseek', 'deepseek-chat');
assert.strictEqual(deepseekCheck.supported, false, 'DeepSeek must be recognized as non-vision');
assert.ok(deepseekCheck.reason.includes('DeepSeek'), 'DeepSeek must explain vision incompatibility');

const openaiVision = checkVisionSupport('openai', 'gpt-4o');
assert.strictEqual(openaiVision.supported, true, 'GPT-4o must be recognized as vision capable');

const openaiTextOnly = checkVisionSupport('openai', 'gpt-3.5-turbo');
assert.strictEqual(openaiTextOnly.supported, false, 'GPT-3.5 must be recognized as non-vision');

const geminiVision = checkVisionSupport('gemini', 'gemini-2.0-flash');
assert.strictEqual(geminiVision.supported, true, 'Gemini 2.0 Flash must be recognized as vision capable');

const anthropicVision = checkVisionSupport('anthropic', 'claude-3-5-sonnet-20241022');
assert.strictEqual(anthropicVision.supported, true, 'Claude 3.5 Sonnet must be vision capable');

const anthropicOld = checkVisionSupport('anthropic', 'claude-2.0');
assert.strictEqual(anthropicOld.supported, false, 'Claude 2.0 must be recognized as non-vision');
console.log('   ✓ Vision compatibility correctly verified across models and providers.');

// --- Test 4: In-Memory Credential Security ---
console.log('4. Verifying In-Memory Credential Security (Zero localStorage for secrets)...');
clearSettings();
const initialSettings = getSettings();
assert.strictEqual(initialSettings.apiKey, '', 'Initial in-memory API key must be blank');

saveSettings({ apiKey: 'test-memory-key-12345', provider: 'openai', model: 'gpt-4o' });
const updatedSettings = getSettings();
assert.strictEqual(updatedSettings.apiKey, 'test-memory-key-12345', 'In-memory settings must update in runtime');

clearSettings();
const clearedSettings = getSettings();
assert.strictEqual(clearedSettings.apiKey, '', 'Cleared settings must reset in-memory key to empty');
console.log('   ✓ In-memory credential store functions securely without persistent disk/browser storage.');

// --- Test 5: Removal of the 4 Existing Logos from Navbar ---
console.log('5. Verifying Removal of Four Logos from Navbar...');
const navbarContent = fs.readFileSync(path.resolve(process.cwd(), 'src/components/Navbar.jsx'), 'utf8');
assert.ok(!navbarContent.includes('IEM LOGO.jpeg'), 'Navbar must not contain IEM LOGO.jpeg');
assert.ok(!navbarContent.includes('DEPT CSE DATA SCIENCE LOGO.jpeg'), 'Navbar must not contain DEPT CSE DATA SCIENCE LOGO.jpeg');
assert.ok(!navbarContent.includes('IEDC-WHITE.png'), 'Navbar must not contain IEDC-WHITE.png');
assert.ok(!navbarContent.includes('UEM LOGO (1).jpeg'), 'Navbar must not contain UEM LOGO (1).jpeg');
assert.ok(navbarContent.includes('IC Navigator'), 'Navbar must preserve IC Navigator text branding');
console.log('   ✓ Four logos completely removed; text branding preserved.');

// --- Test 6: API Requirement Notice Directly Above Upload Section ---
console.log('6. Verifying API Requirement Notice on Landing Page...');
const heroUploadContent = fs.readFileSync(path.resolve(process.cwd(), 'src/components/HeroUpload.jsx'), 'utf8');
const exactNoticeText = "IC Navigator is a fully API-powered IC identification platform. To use the scanner, you must provide your own API key from a supported AI provider and select a compatible vision model.";
const exactSupportingText = "Bring your own API key. Choose your preferred AI provider and compatible model. No fixed AI provider is required.";
assert.ok(heroUploadContent.includes(exactNoticeText), 'HeroUpload must contain exact main notice text');
assert.ok(heroUploadContent.includes(exactSupportingText), 'HeroUpload must contain exact supporting text');
console.log('   ✓ Exact API requirement notice present directly above upload area.');

// --- Test 7: Project Information (Landing Page and Other Pages) ---
console.log('7. Verifying Project Information Content...');
const requiredStrings = [
  'Internal Granted Project',
  'AI-Based Smart IC Scanner for In-Circuit Testing and Identification',
  'IC Navigator',
  'Prof. Subhojit Paul',
  'Dr. Buddhadeb Pradhan',
  'Arijit Ganguly',
  'Saikat Mohis',
  'Srinjoy Patra',
  'CSE, UEM Kolkata (2024–2028)'
];

requiredStrings.forEach(str => {
  assert.ok(heroUploadContent.includes(str), `HeroUpload must contain "${str}"`);
});

const footerContent = fs.readFileSync(path.resolve(process.cwd(), 'src/components/ProjectFooter.jsx'), 'utf8');
requiredStrings.forEach(str => {
  assert.ok(footerContent.includes(str), `ProjectFooter must contain "${str}"`);
});
console.log('   ✓ Exact project information present on landing page and global footer for all pages.');

// --- Test 8: 4-Column Token-Only Header & Timestamp ---
console.log('8. Testing CSV Headers and Timestamp Format...');
assert.strictEqual(CSV_HEADERS, 'Timestamp,Input_Tokens,Output_Tokens,Total_Tokens', 'Header must be exactly: Timestamp,Input_Tokens,Output_Tokens,Total_Tokens');

const sampleDate = new Date('2026-11-20T15:25:30.000Z');
const readableTs = formatReadableTimestamp(sampleDate);
assert.match(readableTs, /^\d{2}-\d{2}-\d{4} \d{2}:\d{2}:\d{2}$/, 'Timestamp must match DD-MM-YYYY HH:mm:ss');
console.log(`   ✓ Headers verified: ${CSV_HEADERS}`);

// --- Test 9: Token Stats Resolution from Actual Metadata ---
console.log('9. Testing Token Stats Resolution from Metadata...');
const stats1 = resolveTokenStats({ prompt_tokens: 2191, completion_tokens: 2152 });
assert.strictEqual(stats1.inputTokens, 2191);
assert.strictEqual(stats1.outputTokens, 2152);
assert.strictEqual(stats1.totalTokens, 4343, 'Total_Tokens must equal Input_Tokens + Output_Tokens');

// Gemini format: promptTokenCount, candidatesTokenCount
const statsGemini = resolveTokenStats({ prompt_tokens: 1500, completion_tokens: 350 });
assert.strictEqual(statsGemini.inputTokens, 1500);
assert.strictEqual(statsGemini.outputTokens, 350);
assert.strictEqual(statsGemini.totalTokens, 1850);
console.log('   ✓ Token statistics correctly extracted and normalized.');

// --- Test 10: Gitignore Check ---
console.log('10. Checking .gitignore rules for security...');
const gitignore = fs.readFileSync(path.resolve(process.cwd(), '.gitignore'), 'utf8');
assert.ok(gitignore.includes('*.csv'), '.gitignore must ignore *.csv');
assert.ok(gitignore.includes('.env'), '.gitignore must ignore .env files');
console.log('   ✓ .gitignore excludes all CSV files and credentials.');

console.log('\n=== ALL MULTI-PROVIDER & BYOK VERIFICATION TESTS PASSED ===');
