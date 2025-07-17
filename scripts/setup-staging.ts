#!/usr/bin/env tsx
/**
 * Script para configurar ambiente de staging
 * - Criar projeto Supabase separado
 * - Configurar variáveis de ambiente
 * - Aplicar migrações
 * - Configurar RLS
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';

const STAGING_ENV_PATH = path.join(process.cwd(), '.env.staging');

function createStagingEnv() {
  console.log('📝 Criando arquivo .env.staging...');

  const stagingConfig = `# ================================================================
# ALFALYZER - STAGING ENVIRONMENT
# ================================================================
# Este arquivo configura o ambiente de staging
# IMPORTANTE: Configure as variáveis abaixo com valores reais

NODE_ENV=staging
APP_VERSION=1.0.0-staging
INSTANCE_ID=alfalyzer-staging

# ================================================================
# STAGING URLS
# ================================================================
APP_URL=https://alfalyzer-staging.railway.app
CLIENT_URL=https://alfalyzer-staging.railway.app
FRONTEND_URL=https://alfalyzer-staging.railway.app
FRONTEND_ORIGIN=https://alfalyzer-staging.railway.app

# ================================================================
# SUPABASE STAGING PROJECT
# ================================================================
# OBRIGATÓRIO: Criar projeto separado no Supabase para staging
SUPABASE_URL=https://your-staging-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-staging-service-key
SUPABASE_ANON_KEY=your-staging-anon-key

# Frontend (mesmo projeto, keys diferentes)
VITE_SUPABASE_URL=https://your-staging-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-staging-anon-key

# ================================================================
# API KEYS STAGING (podem usar as mesmas keys de desenvolvimento)
# ================================================================
ALPHA_VANTAGE_API_KEY=demo
TWELVE_DATA_API_KEY=demo
FMP_API_KEY=demo
FINNHUB_API_KEY=demo
POLYGON_API_KEY=demo

# ================================================================
# STRIPE STAGING (usar Stripe test keys)
# ================================================================
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your-staging-publishable-key
STRIPE_SECRET_KEY=sk_test_your-staging-secret-key
STRIPE_WEBHOOK_SECRET=whsec_your-staging-webhook-secret

# ================================================================
# CORS & SECURITY STAGING
# ================================================================
CORS_ORIGIN=https://alfalyzer-staging.railway.app
ALLOWED_ORIGINS=https://alfalyzer-staging.railway.app

# ================================================================
# LOGGING STAGING
# ================================================================
LOG_LEVEL=debug
ENABLE_FILE_LOGGING=true
ERROR_SAMPLING=false

# ================================================================
# PERFORMANCE STAGING
# ================================================================
ENABLE_BACKGROUND_JOBS=true
ENABLE_WEBSOCKET_SERVICE=true
RATE_LIMIT_MAX_REQUESTS=200

# ================================================================
# FEATURE FLAGS STAGING
# ================================================================
VITE_ENABLE_REAL_TIME=true
VITE_ENABLE_PAYMENTS=true
VITE_ENABLE_AI_FEATURES=true
VITE_ENABLE_NOTIFICATIONS=true

# ================================================================
# DEBUGGING STAGING
# ================================================================
DEBUG_LEVEL=debug
ANALYZE_BUNDLE=true
`;

  fs.writeFileSync(STAGING_ENV_PATH, stagingConfig);
  console.log(`✅ Arquivo criado: ${STAGING_ENV_PATH}`);
}

function createRailwayConfig() {
  console.log('🚂 Criando configuração Railway para staging...');

  const railwayConfig = `# Railway.app configuration for staging
[build]
builder = "nixpacks"

[deploy]
healthcheckPath = "/health"
healthcheckTimeout = 300
restartPolicyType = "on-failure"
restartPolicyMaxRetries = 3

# Staging web service
[[services]]
name = "alfalyzer-staging"
source = "."
variables = { 
  NODE_ENV = "staging",
  PORT = "3000"
}

[services.healthcheck]
path = "/health"
timeout = 300

# Staging price update cron (every 30 minutes for staging)
[[services]]
name = "alfalyzer-staging-cron"
source = "."
cron = "*/30 * * * *"
command = "npm run cron:update-prices"

# Environment-specific variables
[env]
NODE_ENV = "staging"
LOG_LEVEL = "debug"
`;

  const railwayConfigPath = path.join(process.cwd(), 'railway.staging.toml');
  fs.writeFileSync(railwayConfigPath, railwayConfig);
  console.log(`✅ Arquivo criado: ${railwayConfigPath}`);
}

function createStagingMigrationScript() {
  console.log('📊 Criando script de migração para staging...');

  const migrationScript = `#!/usr/bin/env tsx
/**
 * Script para migrar dados para ambiente de staging
 */

import 'dotenv/config';
import { supabaseAdmin } from '../server/db/supabase-client';

async function setupStagingData() {
  console.log('🏗️  Configurando dados de staging...');

  try {
    // 1. Criar usuários de teste
    const testUsers = [
      { 
        email: 'test@alfalyzer.com', 
        username: 'test_user',
        name: 'Test User',
        subscription_tier: 'pro',
        email_verified: true
      },
      { 
        email: 'admin@alfalyzer.com', 
        username: 'admin_user',
        name: 'Admin User',
        subscription_tier: 'premium',
        email_verified: true
      }
    ];

    console.log('👥 Criando usuários de teste...');
    for (const user of testUsers) {
      const { error } = await supabaseAdmin
        .from('users')
        .upsert(user, { onConflict: 'email' });
      
      if (error) {
        console.error(\`❌ Erro ao criar usuário \${user.email}:\`, error);
      } else {
        console.log(\`✅ Usuário criado: \${user.email}\`);
      }
    }

    // 2. Criar stocks populares
    const popularStocks = [
      { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology', industry: 'Consumer Electronics' },
      { symbol: 'MSFT', name: 'Microsoft Corporation', sector: 'Technology', industry: 'Software' },
      { symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Technology', industry: 'Internet' },
      { symbol: 'AMZN', name: 'Amazon.com Inc.', sector: 'Consumer Cyclical', industry: 'E-Commerce' },
      { symbol: 'TSLA', name: 'Tesla Inc.', sector: 'Consumer Cyclical', industry: 'Automotive' },
      { symbol: 'META', name: 'Meta Platforms Inc.', sector: 'Technology', industry: 'Social Media' },
      { symbol: 'NVDA', name: 'NVIDIA Corporation', sector: 'Technology', industry: 'Semiconductors' },
      { symbol: 'JPM', name: 'JPMorgan Chase & Co.', sector: 'Financial', industry: 'Banking' }
    ];

    console.log('📈 Criando stocks populares...');
    for (const stock of popularStocks) {
      const { error } = await supabaseAdmin
        .from('stocks')
        .upsert(stock, { onConflict: 'symbol' });
      
      if (error) {
        console.error(\`❌ Erro ao criar stock \${stock.symbol}:\`, error);
      } else {
        console.log(\`✅ Stock criado: \${stock.symbol}\`);
      }
    }

    console.log('🎉 Dados de staging configurados com sucesso!');

  } catch (error) {
    console.error('❌ Erro ao configurar staging:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  setupStagingData()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('💥 Falha na configuração de staging:', error);
      process.exit(1);
    });
}

export { setupStagingData };
`;

  const scriptPath = path.join(process.cwd(), 'scripts/setup-staging-data.ts');
  fs.writeFileSync(scriptPath, migrationScript);
  console.log(`✅ Script criado: ${scriptPath}`);
}

function createVercelStagingConfig() {
  console.log('▲ Criando configuração Vercel para staging...');

  const vercelConfig = {
    "$schema": "https://openapi.vercel.sh/vercel.json",
    "version": 2,
    "name": "alfalyzer-staging",
    "alias": ["alfalyzer-staging.vercel.app"],
    "builds": [
      {
        "src": "client/package.json",
        "use": "@vercel/static-build",
        "config": {
          "distDir": "dist"
        }
      }
    ],
    "routes": [
      {
        "src": "/api/(.*)",
        "dest": "https://alfalyzer-staging.railway.app/api/$1"
      },
      {
        "src": "/(.*)",
        "dest": "/client/$1"
      }
    ],
    "env": {
      "NODE_ENV": "staging",
      "VITE_API_URL": "https://alfalyzer-staging.railway.app",
      "VITE_BACKEND_URL": "https://alfalyzer-staging.railway.app",
      "VITE_ENABLE_REAL_TIME": "true",
      "VITE_ENABLE_PAYMENTS": "true"
    },
    "functions": {
      "client/dist/**": {
        "includeFiles": "client/dist/**"
      }
    }
  };

  const vercelConfigPath = path.join(process.cwd(), 'vercel.staging.json');
  fs.writeFileSync(vercelConfigPath, JSON.stringify(vercelConfig, null, 2));
  console.log(`✅ Arquivo criado: ${vercelConfigPath}`);
}

async function setupStaging() {
  console.log('🏗️  CONFIGURAÇÃO AMBIENTE DE STAGING\n');

  try {
    // 1. Criar configurações de ambiente
    createStagingEnv();
    
    // 2. Criar configuração Railway
    createRailwayConfig();
    
    // 3. Criar script de migração
    createStagingMigrationScript();
    
    // 4. Criar configuração Vercel
    createVercelStagingConfig();

    console.log('\n✅ STAGING ENVIRONMENT CONFIGURADO!');
    console.log('\n📋 PRÓXIMOS PASSOS:');
    console.log('1. 🆕 Criar novo projeto no Supabase dashboard');
    console.log('2. 📝 Atualizar .env.staging com URLs e chaves reais do Supabase');
    console.log('3. 🚀 Deploy no Railway usando railway.staging.toml');
    console.log('4. 📊 Executar migrações: npm run supabase:migrate-staging');
    console.log('5. 🔧 Aplicar RLS: npm run supabase:rls-staging');
    console.log('6. 👥 Configurar dados de teste: npm run staging:setup-data');
    console.log('7. 🧪 Testar funcionalidades críticas');
    
    console.log('\n🔗 LINKS ÚTEIS:');
    console.log('• Supabase: https://app.supabase.com/new');
    console.log('• Railway: https://railway.app/dashboard');
    console.log('• Vercel: https://vercel.com/dashboard');

  } catch (error) {
    console.error('❌ Erro na configuração de staging:', error);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  setupStaging()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('💥 Falha na configuração de staging:', error);
      process.exit(1);
    });
}

export { setupStaging };
`;

  fs.writeFileSync(STAGING_ENV_PATH.replace('.env.staging', 'setup-staging.ts'), migrationScript);
}

// Execute the setup
setupStaging();