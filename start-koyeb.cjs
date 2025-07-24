#!/usr/bin/env node

// Simple starter script for Koyeb that uses the koyeb-server.ts
const { spawn } = require('child_process');

console.log('Starting Koyeb server...');
console.log('Environment:', process.env.NODE_ENV || 'development');
console.log('Port:', process.env.PORT || 8000);

// Start the server using tsx - using the main server index
const server = spawn('npx', ['tsx', 'server/index.ts'], {
  stdio: 'inherit',
  env: process.env
});

server.on('error', (err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

server.on('exit', (code) => {
  console.log(`Server exited with code ${code}`);
  process.exit(code);
});