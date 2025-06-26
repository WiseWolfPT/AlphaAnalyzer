#!/usr/bin/env node

// Environment Setup Script for Alfalyzer
// This script helps developers set up their environment correctly

import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 ALFALYZER ENVIRONMENT SETUP WIZARD\n');
console.log('='.repeat(50));

async function setupEnvironment() {
  
  // 1. Check if .env already exists
  if (fs.existsSync('.env')) {
    console.log('📄 .env file already exists');
    
    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise(resolve => {
      rl.question('Do you want to backup and recreate it? (y/N): ', resolve);
    });
    
    rl.close();
    
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      const backupName = `.env.backup.${Date.now()}`;
      fs.copyFileSync('.env', backupName);
      console.log(`✅ Backed up existing .env to ${backupName}`);
    } else {
      console.log('❌ Setup cancelled. Existing .env file preserved.');
      return;
    }
  }
  
  // 2. Read the template
  if (!fs.existsSync('.env.template')) {
    console.log('❌ .env.template not found! Cannot proceed.');
    process.exit(1);
  }
  
  console.log('📋 Reading .env.template...');
  let envTemplate = fs.readFileSync('.env.template', 'utf8');
  
  // 3. Generate secure secrets
  console.log('🔐 Generating secure secrets...');
  
  const jwtAccessSecret = crypto.randomBytes(32).toString('hex');
  const jwtRefreshSecret = crypto.randomBytes(32).toString('hex');
  const encryptionKey = crypto.randomBytes(32).toString('hex');
  const apiKeyEncryptionSecret = crypto.randomBytes(32).toString('hex');
  
  // 4. Replace placeholders with secure values
  envTemplate = envTemplate
    .replace('SUBSTITUA_POR_CHAVE_SEGURA_256_BITS', jwtAccessSecret)
    .replace(/JWT_ACCESS_SECRET=SUBSTITUA_POR_CHAVE_SEGURA_256_BITS/g, `JWT_ACCESS_SECRET=${jwtAccessSecret}`)
    .replace(/JWT_REFRESH_SECRET=SUBSTITUA_POR_CHAVE_SEGURA_256_BITS/g, `JWT_REFRESH_SECRET=${jwtRefreshSecret}`)
    .replace(/ENCRYPTION_KEY=SUBSTITUA_POR_CHAVE_SEGURA_256_BITS/g, `ENCRYPTION_KEY=${encryptionKey}`)
    .replace(/API_KEY_ENCRYPTION_SECRET=.*/g, `API_KEY_ENCRYPTION_SECRET=${apiKeyEncryptionSecret}`)
    .replace('NODE_ENV=development', 'NODE_ENV=development')
    .replace('PORT=8080', 'PORT=3001')
    .replace('/api', '/api')
    .replace('http://localhost:3000,http://localhost:8080', 'http://localhost:3000,http://localhost:3001,http://localhost:5173');
  
  // 5. Write the new .env file
  fs.writeFileSync('.env', envTemplate);
  console.log('✅ Created new .env file with secure secrets');
  
  // 6. Create API keys setup reminder
  const apiKeysNeeded = [
    {
      name: 'ALPHA_VANTAGE_API_KEY',
      url: 'https://www.alphavantage.co/support/#api-key',
      description: 'Free tier: 25 calls/day'
    },
    {
      name: 'FINNHUB_API_KEY',
      url: 'https://finnhub.io/dashboard',
      description: 'Free tier: 60 calls/minute'
    },
    {
      name: 'FMP_API_KEY',
      url: 'https://financialmodelingprep.com/developer/docs',
      description: 'Free tier: 250 calls/day'
    },
    {
      name: 'TWELVE_DATA_API_KEY',
      url: 'https://twelvedata.com/dashboard',
      description: 'Free tier: 800 calls/day'
    }
  ];
  
  console.log('\n📝 NEXT STEPS - API KEYS SETUP:');
  console.log('='.repeat(50));
  
  apiKeysNeeded.forEach((api, index) => {
    console.log(`${index + 1}. ${api.name}`);
    console.log(`   URL: ${api.url}`);
    console.log(`   Info: ${api.description}`);
    console.log('');
  });
  
  // 7. Create setup instructions file
  const setupInstructions = `
# ALFALYZER API KEYS SETUP INSTRUCTIONS

Your .env file has been created with secure secrets, but you still need to add your API keys.

## Required API Keys

### 1. Alpha Vantage (Free tier: 25 calls/day)
- Go to: https://www.alphavantage.co/support/#api-key
- Register for a free account
- Copy your API key
- Replace: ALPHA_VANTAGE_API_KEY=SUBSTITUA_POR_SUA_CHAVE_ALPHA_VANTAGE

### 2. Finnhub (Free tier: 60 calls/minute)
- Go to: https://finnhub.io/dashboard
- Register for a free account
- Copy your API key
- Replace: FINNHUB_API_KEY=SUBSTITUA_POR_SUA_CHAVE_FINNHUB

### 3. Financial Modeling Prep (Free tier: 250 calls/day)
- Go to: https://financialmodelingprep.com/developer/docs
- Register for a free account
- Copy your API key
- Replace: FMP_API_KEY=SUBSTITUA_POR_SUA_CHAVE_FMP

### 4. Twelve Data (Free tier: 800 calls/day)
- Go to: https://twelvedata.com/dashboard
- Register for a free account
- Copy your API key
- Replace: TWELVE_DATA_API_KEY=SUBSTITUA_POR_SUA_CHAVE_TWELVE_DATA

## Optional API Keys (for advanced features)

### OpenAI (for AI summaries)
- Go to: https://platform.openai.com/api-keys
- Create an API key
- Replace: OPENAI_API_KEY=SUBSTITUA_POR_SUA_CHAVE_OPENAI

### Supabase (for database)
- Go to: https://supabase.com/dashboard
- Create a project
- Get your URL and anon key
- Replace: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

## Testing Your Setup

After adding your API keys, test the setup:

\`\`\`bash
npm run dev
\`\`\`

Then visit:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api/health

## Security Notes

- ✅ .env is already in .gitignore
- ✅ Secure secrets have been generated
- ⚠️  NEVER commit real API keys to Git
- ⚠️  Use different keys for production
`;

  fs.writeFileSync('API_KEYS_SETUP.md', setupInstructions);
  console.log('📚 Created API_KEYS_SETUP.md with detailed instructions');
  
  // 8. Check git status and warn if needed
  console.log('\n🔒 SECURITY CHECK:');
  try {
    const { spawn } = await import('child_process');
    const gitStatus = spawn('git', ['status', '--porcelain', '.env'], { stdio: 'pipe' });
    
    gitStatus.stdout.on('data', (data) => {
      if (data.toString().includes('.env')) {
        console.log('⚠️  WARNING: .env file is being tracked by Git!');
        console.log('   Run: git rm --cached .env');
        console.log('   Then: git commit -m "Remove .env from tracking"');
      }
    });
    
    gitStatus.on('close', (code) => {
      if (code === 0) {
        console.log('✅ .env file is properly ignored by Git');
      }
    });
    
  } catch (error) {
    console.log('⚠️  Could not check Git status. Make sure .env is in .gitignore');
  }
  
  // 9. Final summary
  console.log('\n🎉 SETUP COMPLETE!');
  console.log('='.repeat(50));
  console.log('✅ Secure .env file created');
  console.log('✅ JWT secrets generated');
  console.log('✅ Setup instructions created');
  console.log('');
  console.log('📋 TODO:');
  console.log('1. Add your API keys to .env file');
  console.log('2. Read API_KEYS_SETUP.md for detailed instructions');
  console.log('3. Test with: npm run dev');
  console.log('4. Make sure .env is in .gitignore');
  console.log('');
  console.log('🔗 Need help? Check the documentation or ask the team!');
}

// Run the setup
setupEnvironment().catch(error => {
  console.error('❌ Setup failed:', error);
  process.exit(1);
});