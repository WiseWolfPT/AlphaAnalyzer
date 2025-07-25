#!/usr/bin/env node

/**
 * Simplified Koyeb starter - Uses pre-built koyeb-server.ts
 */

const { spawn } = require('child_process');
const PORT = process.env.PORT || 8000;

console.log('🚀 Starting Alfalyzer on Koyeb');
console.log('📍 Port:', PORT);
console.log('📍 Node Version:', process.version);

// Set production environment
process.env.NODE_ENV = 'production';

// Start the koyeb-specific server
const server = spawn('npx', ['tsx', 'server/koyeb-server.ts'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'production',
    PORT: PORT
  }
});

server.on('error', (err) => {
  console.error('❌ Failed to start:', err);
  process.exit(1);
});

server.on('exit', (code) => {
  console.log('Server exited with code', code);
  process.exit(code || 0);
});

// Keep process alive
process.stdin.resume();