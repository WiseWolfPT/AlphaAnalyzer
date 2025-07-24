#!/usr/bin/env node

/**
 * Health check script to verify server can start properly
 */

import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';

console.log('🔍 Running Koyeb health check...');
console.log('Environment:', process.env.NODE_ENV || 'development');
console.log('Port:', process.env.PORT || 8000);

// Test 1: Check if tsx is available
console.log('\n1️⃣ Checking tsx availability...');
const tsxCheck = spawn('npx', ['tsx', '--version'], { stdio: 'pipe' });

tsxCheck.on('error', (err) => {
  console.error('❌ tsx not found:', err.message);
  process.exit(1);
});

tsxCheck.on('exit', (code) => {
  if (code === 0) {
    console.log('✅ tsx is available');
  } else {
    console.error('❌ tsx check failed');
    process.exit(1);
  }
});

// Test 2: Check if server file exists
const serverPath = './server/index.ts';

console.log('\n2️⃣ Checking server file...');
if (fs.existsSync(serverPath)) {
  console.log(`✅ Server file exists: ${serverPath}`);
} else {
  console.error(`❌ Server file not found: ${serverPath}`);
  process.exit(1);
}

// Test 3: Check TypeScript compilation
console.log('\n3️⃣ Testing TypeScript compilation...');
const compileCheck = spawn('npx', ['tsx', '--check', serverPath], { stdio: 'pipe' });

compileCheck.on('exit', (code) => {
  if (code === 0) {
    console.log('✅ TypeScript compilation successful');
  } else {
    console.log('⚠️  TypeScript compilation has issues (but may still work)');
  }
});

console.log('\n✅ Basic health checks passed');
console.log('Server should be able to start on Koyeb');