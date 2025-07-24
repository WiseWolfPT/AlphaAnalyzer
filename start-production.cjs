#!/usr/bin/env node

/**
 * Production starter script for Koyeb deployment
 * Ensures the server starts correctly in production environment
 */

const { spawn } = require('child_process');
const path = require('path');

// Force production environment
process.env.NODE_ENV = 'production';

// Log startup information
console.log('🚀 Starting Alfalyzer Production Server');
console.log('📍 Environment:', process.env.NODE_ENV);
console.log('📍 Port:', process.env.PORT || 8000);
console.log('📍 Platform:', process.env.KOYEB_SERVICE_NAME ? 'Koyeb' : 'Unknown');
console.log('📍 Node Version:', process.version);
console.log('📍 Working Directory:', process.cwd());

// Ensure we're in the correct directory
const projectRoot = path.resolve(__dirname);
process.chdir(projectRoot);

// Function to handle graceful shutdown
function gracefulShutdown(signal) {
  console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
  if (serverProcess) {
    serverProcess.kill(signal);
  }
}

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start the server using tsx
console.log('🔧 Starting server process...');
const serverProcess = spawn('npx', ['tsx', 'server/index.ts'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'production',
    // Ensure TypeScript doesn't type check in production (faster startup)
    TS_NODE_TRANSPILE_ONLY: 'true',
    // Disable source maps in production
    NODE_OPTIONS: '--no-deprecation'
  }
});

// Handle server process errors
serverProcess.on('error', (err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});

// Handle server process exit
serverProcess.on('exit', (code, signal) => {
  if (signal) {
    console.log(`Server was killed by signal ${signal}`);
    process.exit(0);
  } else if (code !== 0) {
    console.error(`❌ Server exited with code ${code}`);
    process.exit(code);
  } else {
    console.log('✅ Server exited normally');
    process.exit(0);
  }
});

// Keep the process alive
process.stdin.resume();