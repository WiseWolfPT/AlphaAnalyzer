#!/usr/bin/env tsx

/**
 * SECURE ENV SHARE - Sistema seguro para compartilhar configurações
 * =================================================================
 * Este script permite compartilhar status das APIs sem expor chaves
 */

import { readFileSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';
import { resolve } from 'path';

// Função para criar hash seguro
function createSecureHash(value: string): string {
  if (!value || value === 'your-key-here' || value.includes('your-') || value.includes('-key-here')) {
    return 'not-configured';
  }
  // Hash apenas dos primeiros 6 caracteres para validação
  const prefix = value.substring(0, 6);
  return createHash('sha256').update(prefix).digest('hex').substring(0, 8);
}

// Função para validar chave de API
async function validateApiKey(apiName: string, key: string): Promise<boolean> {
  if (!key || key === 'your-key-here' || key.includes('your_') || key.includes('_here')) {
    return false;
  }
  
  // Validações básicas por tipo de API
  const validations: Record<string, (key: string) => boolean> = {
    POLYGON: (k) => k.length === 32,
    ALPHA_VANTAGE: (k) => k.length === 16,
    TWELVE_DATA: (k) => k.length === 32,
    FMP: (k) => k.length === 32,
    FINNHUB: (k) => k.length === 40,
    STRIPE_PUBLIC: (k) => k.startsWith('pk_test_'),
    STRIPE_SECRET: (k) => k.startsWith('sk_test_'),
    STRIPE_WEBHOOK: (k) => k.startsWith('whsec_')
  };
  
  const validator = validations[apiName];
  return validator ? validator(key) : true;
}

// Função principal
async function generateSecureStatus() {
  console.log('🔐 GERANDO STATUS SEGURO DO AMBIENTE');
  console.log('=====================================\n');
  
  // Ler .env
  const envPath = resolve(process.cwd(), '.env');
  const envContent = readFileSync(envPath, 'utf8');
  const envVars = Object.fromEntries(
    envContent.split('\n')
      .filter(line => line && !line.startsWith('#'))
      .map(line => line.split('='))
      .filter(([key, value]) => key && value)
  );
  
  // APIs para verificar
  const apisToCheck = [
    { env: 'POLYGON_API_KEY', name: 'POLYGON' },
    { env: 'ALPHA_VANTAGE_API_KEY', name: 'ALPHA_VANTAGE' },
    { env: 'TWELVE_DATA_API_KEY', name: 'TWELVE_DATA' },
    { env: 'FMP_API_KEY', name: 'FMP' },
    { env: 'FINNHUB_API_KEY', name: 'FINNHUB' },
    { env: 'VITE_STRIPE_PUBLISHABLE_KEY', name: 'STRIPE_PUBLIC' },
    { env: 'STRIPE_SECRET_KEY', name: 'STRIPE_SECRET' },
    { env: 'STRIPE_WEBHOOK_SECRET', name: 'STRIPE_WEBHOOK' }
  ];
  
  const status: Record<string, any> = {
    generated_at: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    apis: {},
    summary: {
      configured: 0,
      not_configured: 0,
      total: apisToCheck.length
    }
  };
  
  // Verificar cada API
  for (const api of apisToCheck) {
    const value = envVars[api.env];
    const isValid = await validateApiKey(api.name, value);
    
    status.apis[api.env] = {
      configured: isValid,
      hash: createSecureHash(value || ''),
      validation: isValid ? 'valid' : 'invalid or missing'
    };
    
    if (isValid) {
      status.summary.configured++;
      console.log(`✅ ${api.name}: Configurada e válida`);
    } else {
      status.summary.not_configured++;
      console.log(`❌ ${api.name}: Não configurada ou inválida`);
    }
  }
  
  // Salvar status seguro
  const statusPath = resolve(process.cwd(), '.env.status.json');
  writeFileSync(statusPath, JSON.stringify(status, null, 2));
  
  console.log('\n📊 RESUMO');
  console.log('=========');
  console.log(`Total APIs: ${status.summary.total}`);
  console.log(`Configuradas: ${status.summary.configured}`);
  console.log(`Não configuradas: ${status.summary.not_configured}`);
  console.log(`\n✅ Status salvo em: .env.status.json`);
  
  // Adicionar ao .gitignore se necessário
  const gitignorePath = resolve(process.cwd(), '.gitignore');
  const gitignoreContent = readFileSync(gitignorePath, 'utf8');
  
  if (!gitignoreContent.includes('.env.status.json')) {
    writeFileSync(gitignorePath, gitignoreContent + '\n.env.status.json\n');
    console.log('✅ Adicionado .env.status.json ao .gitignore');
  }
}

// Executar
generateSecureStatus().catch(console.error);