/**
 * SECURE LOGGER - Prevenção de vazamento de informações sensíveis
 * =============================================================
 * Utility para fazer logs seguros sem expor chaves de API ou dados sensíveis
 */

/**
 * Log seguro do status de configuração de APIs
 * Mostra apenas os primeiros 6 caracteres da chave
 */
export function logApiStatus(apiName: string, key: string | undefined) {
  if (!key || key === 'your-key-here' || key.startsWith('your-')) {
    console.log(`❌ ${apiName}: Não configurada`);
    return false;
  } else {
    const safeKey = key.substring(0, 6) + '...';
    console.log(`✅ ${apiName}: Configurada (${safeKey})`);
    return true;
  }
}

/**
 * Log seguro de URLs
 * Remove parâmetros sensíveis da URL
 */
export function logSafeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    // Remove parâmetros que podem conter chaves
    urlObj.searchParams.delete('apikey');
    urlObj.searchParams.delete('api_key');
    urlObj.searchParams.delete('token');
    urlObj.searchParams.delete('key');
    
    return urlObj.toString();
  } catch {
    return '[URL inválida]';
  }
}

/**
 * Log seguro de dados do usuário
 * Remove informações pessoais sensíveis
 */
export function logSafeUserData(userData: any) {
  const safeData = {
    id: userData.id,
    email: userData.email ? `${userData.email.substring(0, 3)}***@${userData.email.split('@')[1]}` : 'N/A',
    created_at: userData.created_at,
    subscription_tier: userData.subscription_tier
  };
  
  console.log('👤 Dados do usuário (seguros):', safeData);
  return safeData;
}

/**
 * Log seguro de erros
 * Remove stack traces em produção
 */
export function logSafeError(error: Error | any, context?: string) {
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    console.error(`❌ Erro${context ? ` em ${context}` : ''}:`, error.message);
  } else {
    console.error(`❌ Erro${context ? ` em ${context}` : ''}:`, error);
  }
}

/**
 * Verificar se uma string contém informações sensíveis
 * Usado em pre-commit hooks
 */
export function containsSensitiveData(content: string): boolean {
  const sensitivePatterns = [
    /pk_test_[A-Za-z0-9]{24,}/g,  // Stripe public keys
    /sk_test_[A-Za-z0-9]{24,}/g,  // Stripe secret keys  
    /whsec_[A-Za-z0-9]{32,}/g,    // Stripe webhook secrets
    /[A-Za-z0-9]{32,}/g,          // Generic API keys (32+ chars)
    /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, // JWT tokens
    /postgres:\/\/.*:.*@.*:.*\/.*/g, // Database URLs
  ];
  
  return sensitivePatterns.some(pattern => pattern.test(content));
}

/**
 * Sanitizar conteúdo removendo dados sensíveis
 */
export function sanitizeContent(content: string): string {
  return content
    .replace(/pk_test_[A-Za-z0-9]{24,}/g, 'pk_test_***REDACTED***')
    .replace(/sk_test_[A-Za-z0-9]{24,}/g, 'sk_test_***REDACTED***')
    .replace(/whsec_[A-Za-z0-9]{32,}/g, 'whsec_***REDACTED***')
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '***JWT_TOKEN_REDACTED***')
    .replace(/postgres:\/\/.*:.*@.*:.*\/.*/g, 'postgres://***REDACTED***');
}

/**
 * Logger principal - decide automaticamente o nível de segurança
 */
export const secureLogger = {
  apiStatus: logApiStatus,
  safeUrl: logSafeUrl,
  safeUser: logSafeUserData,
  safeError: logSafeError,
  containsSensitive: containsSensitiveData,
  sanitize: sanitizeContent
};