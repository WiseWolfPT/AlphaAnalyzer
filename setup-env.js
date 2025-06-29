#!/usr/bin/env node

/**
 * ALFALYZER ENVIRONMENT SETUP SCRIPT
 * 
 * Este script ajuda a configurar o ambiente de desenvolvimento
 * com chaves criptográficamente seguras e validação.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

console.log('🚀 ALFALYZER - ENVIRONMENT SETUP SCRIPT');
console.log('=====================================\n');

// Verificar se .env já existe
const envPath = path.join(__dirname, '.env');
const envExists = fs.existsSync(envPath);

if (envExists) {
  console.log('✅ .env file already exists');
  console.log('   To regenerate, delete .env and run this script again\n');
} else {
  console.log('❌ .env file not found');
  console.log('   Copying from .env.template...\n');
  
  const templatePath = path.join(__dirname, '.env.template');
  if (fs.existsSync(templatePath)) {
    fs.copyFileSync(templatePath, envPath);
    console.log('✅ .env file created from template\n');
  }
}

// Gerar chaves seguras
console.log('🔐 GENERATING SECURE KEYS');
console.log('=========================');

const jwtAccessSecret = crypto.randomBytes(32).toString('hex');
const jwtRefreshSecret = crypto.randomBytes(32).toString('hex');
const encryptionKey = crypto.randomBytes(32).toString('hex');

console.log('Generated secure keys:');
console.log(`JWT_ACCESS_SECRET=${jwtAccessSecret}`);
console.log(`JWT_REFRESH_SECRET=${jwtRefreshSecret}`);
console.log(`ENCRYPTION_KEY=${encryptionKey}\n`);

// Instruções para APIs
console.log('💰 API KEYS SETUP REQUIRED');
console.log('==========================');
console.log('To get real market data, obtain API keys from:');
console.log('');
console.log('1. 🌟 Alpha Vantage (FREE - 25 calls/day)');
console.log('   → https://www.alphavantage.co/support/#api-key');
console.log('');
console.log('2. 🚀 Finnhub (FREE - 60 calls/minute)');
console.log('   → https://finnhub.io/dashboard');
console.log('');
console.log('3. 💎 Financial Modeling Prep (PAID - $15/month)');
console.log('   → https://financialmodelingprep.com/developer/docs');
console.log('');
console.log('4. ⚡ Twelve Data (FREE - 800 calls/day)');
console.log('   → https://twelvedata.com/dashboard');
console.log('');

// Instruções de segurança
console.log('🛡️  SECURITY CHECKLIST');
console.log('=====================');
console.log('✅ .env is in .gitignore (never commit API keys)');
console.log('✅ Use different keys for development/production');
console.log('✅ Rotate keys every 90 days');
console.log('✅ Use environment variables in production');
console.log('✅ Monitor API usage and costs');
console.log('');

// Comandos de desenvolvimento
console.log('🔧 DEVELOPMENT COMMANDS');
console.log('======================');
console.log('npm install          # Install dependencies');
console.log('npm run dev          # Start development server');
console.log('npm run build        # Build for production');
console.log('npm run test         # Run tests (when implemented)');
console.log('');

console.log('🎉 Setup complete! Edit .env with your real API keys to enable full functionality.');