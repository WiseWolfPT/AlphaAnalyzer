#!/usr/bin/env node

/**
 * Railway-Optimized Production Server
 * Simplified server specifically for Railway deployment
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Railway automatically sets PORT
const PORT = process.env.PORT || 3001;

console.log('🚂 Starting Railway Production Server...');
console.log(`📍 Port: ${PORT}`);
console.log(`🔑 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🌐 Railway Domain: ${process.env.RAILWAY_STATIC_URL || 'Not set yet'}`);

// Start the TypeScript server directly
const serverPath = path.join(__dirname, 'server', 'index.ts');
console.log(`📂 Starting server from: ${serverPath}`);

const server = spawn('npx', ['tsx', serverPath], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'production',
    PORT: String(PORT)
  }
});

// Simple graceful shutdown
const shutdown = (signal) => {
  console.log(`\n🛑 ${signal} received, shutting down...`);
  server.kill('SIGTERM');
  setTimeout(() => process.exit(0), 5000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

server.on('error', (err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});

server.on('exit', (code) => {
  console.log(`Server exited with code ${code}`);
  process.exit(code || 0);
});

console.log('🚂 Railway server wrapper started successfully!');