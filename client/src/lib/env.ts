/**
 * SEGURANÇA: Este arquivo NÃO deve conter secrets ou chaves privadas!
 * Todas as chaves sensíveis devem ser mantidas no backend.
 * 
 * Variáveis com prefixo VITE_ são expostas no bundle do frontend,
 * portanto NUNCA coloque secrets aqui.
 */

// Lista de variáveis que NUNCA devem estar no frontend
const FORBIDDEN_FRONTEND_VARS = [
  'VITE_DATABASE_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  // API keys também não devem estar no frontend em produção
  // SECURITY: API keys moved to server-side for security
  // Client should use server proxy endpoints instead
];

// Função segura para acessar variáveis de ambiente
export const getEnvVar = (key: string, defaultValue: string = ''): string => {
  // Verificar se é uma variável proibida no frontend
  if (typeof window !== 'undefined' && FORBIDDEN_FRONTEND_VARS.includes(key)) {
    console.error(`🚨 SECURITY WARNING: Attempted to access forbidden variable "${key}" in frontend!`);
    console.error('This variable should only be accessed from the backend.');
    
    // Em desenvolvimento, mostrar aviso claro
    if (import.meta.env.DEV) {
      throw new Error(
        `Security Error: "${key}" contains sensitive data and cannot be accessed in the browser. ` +
        `Move this logic to the backend API.`
      );
    }
    
    return '';
  }

  // No servidor (Node.js), acessar process.env
  if (typeof window === 'undefined') {
    try {
      const serverValue = process.env?.[key];
      if (serverValue && serverValue !== 'undefined') {
        return serverValue;
      }
    } catch {
      // Fallback silencioso
    }
    return defaultValue;
  }
  
  // No browser, acessar import.meta.env (apenas variáveis públicas)
  try {
    return import.meta?.env?.[key] || defaultValue;
  } catch {
    return defaultValue;
  }
};

// Variáveis de ambiente PÚBLICAS (seguras para o frontend)
export const env = {
  // URLs públicas (OK no frontend)
  VITE_SUPABASE_URL: getEnvVar('VITE_SUPABASE_URL', ''),
  VITE_SUPABASE_ANON_KEY: getEnvVar('VITE_SUPABASE_ANON_KEY', ''), // Anon key é pública por design
  VITE_WHOP_CLIENT_ID: getEnvVar('VITE_WHOP_CLIENT_ID', ''), // Client ID é público
  
  // API Base URLs (públicas)
  VITE_API_BASE_URL: getEnvVar('VITE_API_BASE_URL', '/api'),
  VITE_API_URL: getEnvVar('VITE_API_URL', 'http://localhost:3001'),
  
  // Ambiente
  NODE_ENV: getEnvVar('NODE_ENV', 'development'),
  VITE_APP_NAME: getEnvVar('VITE_APP_NAME', 'Alfalyzer'),
} as const;

// Interface para configuração de API segura
export interface SecureApiConfig {
  baseUrl: string;
  // NÃO incluir apiKey aqui!
}

// Configuração de APIs SEM chaves (as chaves ficam no backend)
export const API_ENDPOINTS = {
  FMP: {
    baseUrl: 'https://financialmodelingprep.com/api/v3',
    // Proxy através do nosso backend
    proxyUrl: '/api/market-data/fmp',
  },
  TWELVE_DATA: {
    baseUrl: 'https://api.twelvedata.com',
    wsUrl: 'wss://ws.twelvedata.com/v1/quotes/price',
    proxyUrl: '/api/market-data/twelve-data',
  },
  FINNHUB: {
    baseUrl: 'https://finnhub.io/api/v1',
    wsUrl: 'wss://ws.finnhub.io',
    proxyUrl: '/api/market-data/finnhub',
  },
  ALPHA_VANTAGE: {
    baseUrl: 'https://www.alphavantage.co/query',
    proxyUrl: '/api/market-data/alpha-vantage',
  },
} as const;

/**
 * IMPORTANTE: Para acessar APIs externas com chaves:
 * 
 * 1. NUNCA faça chamadas diretas do frontend para APIs externas
 * 2. SEMPRE use os endpoints proxy do backend
 * 
 * Exemplo correto:
 * ```typescript
 * // ❌ ERRADO - Expõe a API key
 * fetch(`https://finnhub.io/api/v1/quote?symbol=AAPL&token=${API_KEY}`)
 * 
 * // ✅ CORRETO - Usa proxy do backend
 * fetch('/api/market-data/finnhub/quote?symbol=AAPL')
 * ```
 * 
 * O backend irá adicionar a API key de forma segura.
 */

// Função helper para verificar se estamos em desenvolvimento
export const isDevelopment = () => {
  return env.NODE_ENV === 'development' || import.meta.env.DEV;
};

// Função helper para verificar se estamos no servidor
export const isServer = () => {
  return typeof window === 'undefined';
};

// Exportar aviso para desenvolvedores
if (isDevelopment() && !isServer()) {
  console.log(
    '%c⚠️ Security Notice',
    'color: orange; font-size: 16px; font-weight: bold;',
    '\nAPI keys should not be used directly in the frontend.',
    '\nUse backend proxy endpoints instead.',
    '\nSee /api/market-data/* routes.'
  );
}