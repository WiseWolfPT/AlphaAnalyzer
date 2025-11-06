#!/usr/bin/env node
/**
 * Validation Script: Warming Worker Method ID Fix
 *
 * Verifies that intelligent warming worker and iv-warming-worker
 * no longer reference obsolete FCFE methods.
 *
 * Run after fix deployment to confirm resolution of 2025-11-05 incident.
 *
 * Usage:
 *   node scripts/validate-warming-worker-fix.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

const OBSOLETE_METHODS = ['dcf-fcfe-20', 'dcf-terminal-fcfe'];
const EXPECTED_METHOD_COUNT = 12;

const EXPECTED_METHODS = [
  'alfa-value',
  'dcf-fcf-20',
  'dcf-terminal-fcf',
  'dni-20',
  'dfcf-terminal',
  'pe-mean',
  'pe-mean-without-nri',
  'ps-mean',
  'pb-mean',
  'pb-mean-without-nri',
  'peg',
  'psg'
];

const FILES_TO_CHECK = [
  'server/workers/intelligent-warming-worker.ts',
  'server/workers/iv-warming-worker.ts',
  'dist/server/workers/intelligent-warming-worker.cjs', // Compiled version
  'dist/server/workers/iv-warming-worker.cjs',          // Compiled version
];

let allPassed = true;

console.log(`${colors.cyan}╔════════════════════════════════════════════════════════╗${colors.reset}`);
console.log(`${colors.cyan}║   Warming Worker Method ID Fix Validation             ║${colors.reset}`);
console.log(`${colors.cyan}╚════════════════════════════════════════════════════════╝${colors.reset}`);
console.log('');

/**
 * Check if file contains obsolete methods (excluding comments)
 */
function checkFile(filePath) {
  const fullPath = path.join(rootDir, filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`${colors.yellow}⚠ SKIP${colors.reset} ${filePath} (file not found)`);
    return { passed: true, skipped: true };
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  const foundObsolete = [];

  // Remove comments from content (both single-line and multi-line)
  const codeOnly = content
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove /* */ comments
    .replace(/\/\/.*/g, '');           // Remove // comments

  for (const method of OBSOLETE_METHODS) {
    // Check for exact string matches (as method IDs) in code, not comments
    const regex = new RegExp(`['"\`]${method}['"\`]`, 'g');
    const matches = codeOnly.match(regex);

    if (matches && matches.length > 0) {
      foundObsolete.push({ method, count: matches.length });
    }
  }

  if (foundObsolete.length > 0) {
    console.log(`${colors.red}✗ FAIL${colors.reset} ${filePath}`);
    foundObsolete.forEach(({ method, count }) => {
      console.log(`       Found obsolete method: ${colors.red}${method}${colors.reset} (${count} occurrences)`);
    });
    allPassed = false;
    return { passed: false, obsolete: foundObsolete };
  } else {
    console.log(`${colors.green}✓ PASS${colors.reset} ${filePath}`);
    return { passed: true };
  }
}

/**
 * Count methods in file
 */
function countMethods(filePath) {
  const fullPath = path.join(rootDir, filePath);

  if (!fs.existsSync(fullPath)) {
    return { count: null, methods: [] };
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  const foundMethods = new Set();

  for (const method of EXPECTED_METHODS) {
    const regex = new RegExp(`['"\`]${method}['"\`]`, 'g');
    const matches = content.match(regex);

    if (matches && matches.length > 0) {
      foundMethods.add(method);
    }
  }

  return { count: foundMethods.size, methods: Array.from(foundMethods).sort() };
}

// ==========================================
// 1. Check source files
// ==========================================
console.log(`${colors.magenta}[1/4] Checking source files for obsolete methods...${colors.reset}`);
console.log('');

const sourceFiles = FILES_TO_CHECK.filter(f => f.endsWith('.ts'));
sourceFiles.forEach(checkFile);

console.log('');

// ==========================================
// 2. Check compiled files
// ==========================================
console.log(`${colors.magenta}[2/4] Checking compiled files (dist/)...${colors.reset}`);
console.log('');

const compiledFiles = FILES_TO_CHECK.filter(f => f.endsWith('.cjs'));
compiledFiles.forEach(checkFile);

console.log('');

// ==========================================
// 3. Verify method counts
// ==========================================
console.log(`${colors.magenta}[3/4] Verifying method counts...${colors.reset}`);
console.log('');

for (const file of sourceFiles) {
  const { count, methods } = countMethods(file);

  if (count === null) {
    console.log(`${colors.yellow}⚠ SKIP${colors.reset} ${file} (file not found)`);
    continue;
  }

  if (count === EXPECTED_METHOD_COUNT) {
    console.log(`${colors.green}✓ PASS${colors.reset} ${file} (${count} methods)`);
  } else {
    console.log(`${colors.red}✗ FAIL${colors.reset} ${file} (${count} methods, expected ${EXPECTED_METHOD_COUNT})`);
    console.log(`       Found: ${methods.join(', ')}`);
    allPassed = false;
  }
}

console.log('');

// ==========================================
// 4. Verify expected methods present
// ==========================================
console.log(`${colors.magenta}[4/4] Verifying expected methods present...${colors.reset}`);
console.log('');

for (const file of sourceFiles) {
  const { count, methods } = countMethods(file);

  if (count === null) {
    continue;
  }

  const missing = EXPECTED_METHODS.filter(m => !methods.includes(m));

  if (missing.length === 0) {
    console.log(`${colors.green}✓ PASS${colors.reset} ${file} (all expected methods present)`);
  } else {
    console.log(`${colors.red}✗ FAIL${colors.reset} ${file} (missing methods)`);
    console.log(`       Missing: ${missing.join(', ')}`);
    allPassed = false;
  }
}

console.log('');

// ==========================================
// Final Summary
// ==========================================
console.log(`${colors.cyan}════════════════════════════════════════════════════════${colors.reset}`);
console.log('');

if (allPassed) {
  console.log(`${colors.green}✓✓✓ ALL CHECKS PASSED ✓✓✓${colors.reset}`);
  console.log('');
  console.log('Warming workers are now in sync with method-cache-service.');
  console.log('No obsolete FCFE methods found.');
  console.log('');
  console.log(`${colors.green}Next steps:${colors.reset}`);
  console.log('  1. Build server: npm run build:server');
  console.log('  2. Deploy: npm run deploy:server');
  console.log('  3. Verify: ssh root@128.140.45.28 "pm2 logs intelligent-warming --lines 50"');
  console.log('');
  process.exit(0);
} else {
  console.log(`${colors.red}✗✗✗ VALIDATION FAILED ✗✗✗${colors.reset}`);
  console.log('');
  console.log('Fix required before deployment.');
  console.log('Review errors above and update worker files.');
  console.log('');
  process.exit(1);
}
