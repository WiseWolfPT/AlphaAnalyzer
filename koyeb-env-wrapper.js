#!/usr/bin/env node

/**
 * Koyeb Environment Wrapper
 * Ensures environment variables are properly loaded before starting the server
 */

// Force load environment variables
const fs = require('fs');
const path = require('path');

// Debug: Log all environment variables (redacted)
console.log('🔍 Environment Debug:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT || 'NOT SET');
console.log('API Keys found:', Object.keys(process.env).filter(k => k.includes('_API_KEY')).map(k => k + '=***'));

// Load .env file if exists
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  console.log('📄 Loading .env file...');
  require('dotenv').config({ path: envPath });
}

// Validate critical environment variables
const requiredVars = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY'
];

const missingVars = requiredVars.filter(key => !process.env[key]);
if (missingVars.length > 0) {
  console.warn('⚠️ Missing critical environment variables:', missingVars);
  console.warn('⚠️ Make sure to set them in Koyeb dashboard!');
}

// API Keys check
const apiProviders = [
  'ALPHA_VANTAGE_API_KEY',
  'FINNHUB_API_KEY', 
  'FMP_API_KEY',
  'TWELVE_DATA_API_KEY',
  'POLYGON_API_KEY'
];

const configuredAPIs = apiProviders.filter(key => process.env[key]);
console.log(`\n✅ ${configuredAPIs.length}/${apiProviders.length} API providers configured`);

// Set defaults
process.env.PORT = process.env.PORT || '8000';
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
process.env.SERVE_STATIC = 'false'; // API-only mode

// Start the actual server
console.log('\n🚀 Starting main server...\n');

// Use the compiled JavaScript if available
const serverPath = fs.existsSync('./dist/server/index.js') 
  ? './dist/server/index.js'
  : './server/index.ts';

if (serverPath.endsWith('.ts')) {
  // TypeScript - use tsx
  require('child_process').spawn('npx', ['tsx', serverPath], {
    stdio: 'inherit',
    env: process.env
  });
} else {
  // JavaScript - run directly
  require(serverPath);
}