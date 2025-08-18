/**
 * Configuração e validação de variáveis de ambiente
 * 
 * IMPORTANTE: Este ficheiro valida que todas as variáveis de ambiente necessárias
 * estão configuradas antes de iniciar o servidor. Isto previne erros em runtime.
 */

import dotenv from 'dotenv';
import { z } from 'zod';

// Carregar variáveis de ambiente do ficheiro .env
dotenv.config();

/**
 * Schema de validação para as variáveis de ambiente
 * Define quais variáveis são obrigatórias e seus tipos
 */
const envSchema = z.object({
  // Configuração do Servidor
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  
  // Base de Dados
  DATABASE_URL: z.string().optional(), // Opcional porque pode usar SQLite em dev
  
  // Chaves de API Financeiras (opcionais em desenvolvimento)
  ALPHA_VANTAGE_API_KEY: z.string().optional(),
  TWELVE_DATA_API_KEY: z.string().optional(),
  FMP_API_KEY: z.string().optional(),
  FINNHUB_API_KEY: z.string().optional(),
  
  // Stripe (opcional em desenvolvimento)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  
  // Supabase
  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  
  // Autenticação - REQUIRED in production
  JWT_SECRET: z.string().optional().refine(
    (val) => process.env.NODE_ENV !== 'production' || (val && val.length >= 32),
    'JWT_SECRET is required in production and must be at least 32 characters'
  ),
  JWT_ACCESS_SECRET: z.string().optional().refine(
    (val) => process.env.NODE_ENV !== 'production' || (val && val.length >= 32),
    'JWT_ACCESS_SECRET is required in production and must be at least 32 characters'
  ),
  JWT_REFRESH_SECRET: z.string().optional().refine(
    (val) => process.env.NODE_ENV !== 'production' || (val && val.length >= 32),
    'JWT_REFRESH_SECRET is required in production and must be at least 32 characters'
  ),
  
  // Redis Configuration
  REDIS_URL: z.string().optional(),
  REDIS_HOST: z.string().optional(),
  REDIS_PORT: z.string().optional(),
  REDIS_PASSWORD: z.string().optional(),
  
  // Configurações Opcionais
  EMAIL_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().email().optional(),
  SENTRY_DSN: z.string().url().optional(),
  OPENAI_API_KEY: z.string().optional(),
  POLYGON_API_KEY: z.string().optional(),
  
  // Configurações de Log e CORS
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug', 'trace']).optional(),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().default('60000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100'),
  
  // SECURITY FIX: Add market data API key validation
  MARKET_DATA_API_KEY: z.string().optional().refine(
    (val) => process.env.NODE_ENV !== 'production' || (val && val.length >= 32),
    'MARKET_DATA_API_KEY is required in production and must be at least 32 characters'
  ),
});

/**
 * Tipo TypeScript inferido do schema
 * Garante type safety ao usar process.env
 */
export type Env = z.infer<typeof envSchema>;

/**
 * Função para validar e parsear as variáveis de ambiente
 * Lança erro se alguma variável obrigatória estiver faltando
 */
function validateEnv(): Env {
  try {
    // Parsear e validar as variáveis
    const env = envSchema.parse(process.env);
    
    // Log de sucesso em desenvolvimento
    if (env.NODE_ENV === 'development') {
      console.log('✅ Variáveis de ambiente validadas com sucesso');
    }
    
    return env;
  } catch (error) {
    // Formatar erros de validação
    if (error instanceof z.ZodError) {
      console.error('❌ Erro na validação das variáveis de ambiente:');
      
      error.errors.forEach((err) => {
        console.error(`   - ${err.path.join('.')}: ${err.message}`);
      });
      
      console.error('\n📋 Copie o ficheiro .env.example para .env e preencha as variáveis necessárias');
      console.error('   cp .env.example .env');
      
      // Verificar se as APIs críticas estão configuradas
      const criticalAPIs = ['ALPHA_VANTAGE_API_KEY', 'TWELVE_DATA_API_KEY', 'FMP_API_KEY', 'FINNHUB_API_KEY'];
      const missingAPIs = criticalAPIs.filter(key => !process.env[key]);
      
      if (missingAPIs.length > 0) {
        console.error('\n🔑 APIs faltando:', missingAPIs.join(', '));
        console.error('   Obtenha chaves gratuitas nos seguintes sites:');
        console.error('   - Alpha Vantage: https://www.alphavantage.co/support/#api-key');
        console.error('   - Twelve Data: https://twelvedata.com/apikey');
        console.error('   - FMP: https://site.financialmodelingprep.com/developer/docs');
        console.error('   - Finnhub: https://finnhub.io/register');
      }
    }
    
    // Terminar o processo com erro
    process.exit(1);
  }
}

/**
 * Valores default para desenvolvimento
 * Facilita o setup inicial sem configurar todas as variáveis
 */
export const defaultEnvValues = {
  // Usar valores de teste apenas em desenvolvimento
  isDevelopment: process.env.NODE_ENV === 'development',
  
  // URLs default
  databaseUrl: process.env.DATABASE_URL || 'sqlite://./dev.db',
  redisUrl: process.env.REDIS_URL || undefined,
  
  // Configurações de desenvolvimento
  port: parseInt(process.env.PORT || '3000', 10),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  
  // Rate limiting
  rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
};

/**
 * Exportar as variáveis validadas
 * Use este objeto em todo o código ao invés de process.env diretamente
 */
export const env = validateEnv();

/**
 * Helper para verificar se estamos em produção
 */
export const isProduction = env.NODE_ENV === 'production';

/**
 * Helper para verificar se estamos em desenvolvimento
 */
export const isDevelopment = env.NODE_ENV === 'development';

/**
 * Helper para verificar se estamos em teste
 */
export const isTest = env.NODE_ENV === 'test';

/**
 * Função para verificar se todas as APIs de pagamento estão configuradas
 */
export function isPaymentConfigured(): boolean {
  return Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET);
}

/**
 * Função para verificar se o email está configurado
 */
export function isEmailConfigured(): boolean {
  return Boolean(env.EMAIL_API_KEY && env.EMAIL_FROM);
}

/**
 * Função para obter configuração de API específica
 */
export function getApiConfig(provider: 'alphaVantage' | 'twelveData' | 'fmp' | 'finnhub') {
  const configs = {
    alphaVantage: {
      key: env.ALPHA_VANTAGE_API_KEY,
      baseUrl: 'https://www.alphavantage.co/query',
    },
    twelveData: {
      key: env.TWELVE_DATA_API_KEY,
      baseUrl: 'https://api.twelvedata.com',
    },
    fmp: {
      key: env.FMP_API_KEY,
      baseUrl: 'https://financialmodelingprep.com/api/v3',
    },
    finnhub: {
      key: env.FINNHUB_API_KEY,
      baseUrl: 'https://finnhub.io/api/v1',
    },
  };
  
  return configs[provider];
}

/**
 * Exportar tipos para uso em outros ficheiros
 */
export type ApiProvider = 'alphaVantage' | 'twelveData' | 'fmp' | 'finnhub';

/**
 * EXEMPLO DE MIGRAÇÃO
 * ===================
 * 
 * Para migrar código existente que usa process.env diretamente:
 * 
 * ANTES:
 * ```typescript
 * const apiKey = process.env.FINNHUB_API_KEY;
 * const port = process.env.PORT || 3000;
 * ```
 * 
 * DEPOIS:
 * ```typescript
 * import { env, getApiConfig } from '../config/env';
 * 
 * const apiKey = env.FINNHUB_API_KEY;
 * const port = env.PORT;
 * 
 * // Ou usar o helper para configuração de API:
 * const finnhubConfig = getApiConfig('finnhub');
 * const apiKey = finnhubConfig.key;
 * const baseUrl = finnhubConfig.baseUrl;
 * ```
 * 
 * Para migrar múltiplas APIs:
 * ```typescript
 * // ANTES:
 * const apiProviders = [
 *   { name: 'finnhub', getKey: () => process.env.FINNHUB_API_KEY },
 *   { name: 'alphaVantage', getKey: () => process.env.ALPHA_VANTAGE_API_KEY },
 * ];
 * 
 * // DEPOIS:
 * import { env } from '../config/env';
 * 
 * const apiProviders = [
 *   { name: 'finnhub', getKey: () => env.FINNHUB_API_KEY },
 *   { name: 'alphaVantage', getKey: () => env.ALPHA_VANTAGE_API_KEY },
 * ];
 * ```
 */