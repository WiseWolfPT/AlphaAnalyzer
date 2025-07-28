#!/usr/bin/env node

/**
 * Koyeb Production Server
 * Starts the full TypeScript server using tsx
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting Koyeb Production Server...');
console.log(`📍 Port: ${process.env.PORT || 3001}`);
console.log(`📁 Working directory: ${process.cwd()}`);
console.log(`📊 Node version: ${process.version}`);
console.log(`🔑 Environment: ${process.env.NODE_ENV || 'development'}`);

// Check for API keys
const apiKeys = {
  ALPHA_VANTAGE: !!process.env.ALPHA_VANTAGE_API_KEY,
  FINNHUB: !!process.env.FINNHUB_API_KEY,
  FMP: !!process.env.FMP_API_KEY,
  TWELVE_DATA: !!process.env.TWELVE_DATA_API_KEY,
  POLYGON: !!process.env.POLYGON_API_KEY,
  SUPABASE: !!process.env.SUPABASE_URL
};

console.log('\n🔑 API Keys configured:');
Object.entries(apiKeys).forEach(([key, configured]) => {
  console.log(`  ${configured ? '✅' : '❌'} ${key}`);
});

// Start the TypeScript server
const serverPath = path.join(__dirname, 'server', 'index.ts');
console.log(`\n📂 Starting server from: ${serverPath}`);

const server = spawn('npx', ['tsx', serverPath], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'production'
  }
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n🛑 SIGTERM received, shutting down gracefully...');
  server.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('\n🛑 SIGINT received, shutting down gracefully...');
  server.kill('SIGINT');
});

server.on('error', (err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});

server.on('exit', (code) => {
  console.log(`\n📊 Server exited with code ${code}`);
  process.exit(code || 0);
});