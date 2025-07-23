// Auth Headers Utility - Handles Vercel production header bug
// Vercel removes Authorization header in production, so we use X-Auth-Token as workaround

export interface AuthHeaderConfig {
  isVercelProduction: boolean;
  headerName: string;
  environment: string;
}

/**
 * Detects if we're running in Vercel production environment
 */
export function isVercelProduction(): boolean {
  return (
    import.meta.env.PROD || 
    window.location.hostname.includes('vercel.app') ||
    window.location.hostname.includes('.vercel.app') ||
    (window.location.hostname !== 'localhost' && !window.location.hostname.includes('127.0.0.1'))
  );
}

/**
 * Gets the appropriate auth header configuration based on environment
 */
export function getAuthHeaderConfig(): AuthHeaderConfig {
  const isVercel = isVercelProduction();
  
  return {
    isVercelProduction: isVercel,
    headerName: isVercel ? 'X-Auth-Token' : 'Authorization',
    environment: isVercel ? 'Production (Vercel)' : 'Development'
  };
}

/**
 * Creates headers object with appropriate auth header based on environment
 */
export function createAuthHeaders(token?: string | null, additionalHeaders?: Record<string, string>): Record<string, string> {
  const config = getAuthHeaderConfig();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...additionalHeaders
  };
  
  if (token) {
    headers[config.headerName] = `Bearer ${token}`;
    console.log(`🔐 Using ${config.headerName} header (${config.environment})`);
  }
  
  return headers;
}

/**
 * Logs auth configuration for debugging
 */
export function logAuthConfig(): void {
  const config = getAuthHeaderConfig();
  console.log('🔧 Auth Header Configuration:', {
    environment: config.environment,
    isVercelProduction: config.isVercelProduction,
    headerName: config.headerName,
    hostname: window.location.hostname,
    isProd: import.meta.env.PROD,
    mode: import.meta.env.MODE
  });
}