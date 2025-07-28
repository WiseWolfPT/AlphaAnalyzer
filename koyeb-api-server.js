#!/usr/bin/env node

/**
 * Koyeb API Server
 * API-only server for Koyeb deployment (no static file serving)
 * Frontend is served separately on Vercel
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting Koyeb API Server...');
console.log(`📍 Port: ${process.env.PORT || 3001}`);
console.log(`📁 Working directory: ${process.cwd()}`);
console.log(`📊 Node version: ${process.version}`);
console.log(`🔑 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🌐 Frontend URL: ${process.env.VITE_APP_URL || 'https://alfalyzer.vercel.app'}`);
console.log('📡 Mode: API-only (no static file serving)');

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

// Ensure we're in API-only mode
process.env.SERVE_STATIC = 'false';
process.env.NODE_ENV = 'production';

// Start the TypeScript server
const serverPath = path.join(__dirname, 'server', 'index.ts');
console.log(`\n📂 Starting API server from: ${serverPath}`);

const server = spawn('npx', ['tsx', serverPath], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'production',
    SERVE_STATIC: 'false' // Explicitly disable static file serving
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