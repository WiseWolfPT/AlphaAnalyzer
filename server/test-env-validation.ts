/**
 * Script de teste para validação de variáveis de ambiente
 * 
 * Execute com: npx tsx server/test-env-validation.ts
 */

import { config } from 'dotenv';

// Primeiro, mostrar as variáveis atuais (sem valores sensíveis)
console.log('🔍 Verificando variáveis de ambiente...\n');

const requiredVars = [
  'ALPHA_VANTAGE_API_KEY',
  'TWELVE_DATA_API_KEY',
  'FMP_API_KEY',
  'FINNHUB_API_KEY',
  'JWT_SECRET',
  'PORT',
  'NODE_ENV'
];

const optionalVars = [
  'DATABASE_URL',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'SUPABASE_SERVICE_ROLE_KEY',
  'REDIS_URL',
  'EMAIL_API_KEY',
  'EMAIL_FROM',
  'SENTRY_DSN',
  'OPENAI_API_KEY',
  'POLYGON_API_KEY'
];

// Carregar .env
config();

console.log('📋 Variáveis Obrigatórias:');
console.log('─'.repeat(50));

requiredVars.forEach(varName => {
  const value = process.env[varName];
  const status = value ? '✅' : '❌';
  const display = value ? `${value.substring(0, 10)}...` : 'NÃO DEFINIDA';
  console.log(`${status} ${varName}: ${display}`);
});

console.log('\n📋 Variáveis Opcionais:');
console.log('─'.repeat(50));

optionalVars.forEach(varName => {
  const value = process.env[varName];
  const status = value ? '✅' : '⚪';
  const display = value ? `${value.substring(0, 10)}...` : 'não definida';
  console.log(`${status} ${varName}: ${display}`);
});

// Agora tentar carregar o módulo de validação
console.log('\n🚀 Testando validação do módulo env.ts...\n');

try {
  const { env, isProduction, isDevelopment, getApiConfig } = await import('./config/env');
  
  console.log('✅ Validação passou com sucesso!\n');
  
  console.log('📊 Resumo da Configuração:');
  console.log('─'.repeat(50));
  console.log(`Ambiente: ${env.NODE_ENV}`);
  console.log(`Porta: ${env.PORT}`);
  console.log(`Em Produção: ${isProduction}`);
  console.log(`Em Desenvolvimento: ${isDevelopment}`);
  
  console.log('\n🔑 Configuração das APIs:');
  console.log('─'.repeat(50));
  
  const apis: Array<'alphaVantage' | 'twelveData' | 'fmp' | 'finnhub'> = ['alphaVantage', 'twelveData', 'fmp', 'finnhub'];
  
  apis.forEach(api => {
    const config = getApiConfig(api);
    console.log(`${api}:`);
    console.log(`  - URL Base: ${config.baseUrl}`);
    console.log(`  - Chave: ${config.key.substring(0, 10)}...`);
  });
  
} catch (error) {
  console.error('❌ Falha na validação!\n');
  console.error('Certifique-se de ter copiado .env.example para .env e preenchido as variáveis necessárias.\n');
  process.exit(1);
}

console.log('\n✨ Teste concluído!');