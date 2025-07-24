#!/usr/bin/env node

/**
 * Ultra-simple Koyeb startup script
 * Directly starts the server without any complex logic
 */

console.log('🚀 Koyeb Direct Start');
console.log('📍 Environment:', process.env.NODE_ENV || 'development');
console.log('📍 Port:', process.env.PORT || 8000);

// Load environment variables
require('dotenv').config();

// Set production environment
process.env.NODE_ENV = 'production';

// Import and start the server directly
try {
  console.log('🔧 Loading server...');
  require('tsx/cjs');
  require('./server/index.ts');
  console.log('✅ Server loaded successfully');
} catch (error) {
  console.error('❌ Failed to start server:', error);
  console.error('Stack trace:', error.stack);
  
  // Try alternative approach
  console.log('🔄 Trying alternative startup method...');
  const { spawn } = require('child_process');
  
  const server = spawn('npx', ['tsx', 'server/index.ts'], {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  });
  
  server.on('error', (err) => {
    console.error('❌ Alternative method also failed:', err);
    process.exit(1);
  });
  
  server.on('exit', (code) => {
    console.log(`Server exited with code ${code}`);
    process.exit(code || 0);
  });
}

// Keep process alive
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully');
  process.exit(0);
});