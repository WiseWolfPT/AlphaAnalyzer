/**
 * Centralized API Configuration
 * Handles base URLs, environment detection, and proxy configuration
 */

export interface APIConfig {
  baseURL: string;
  timeout: number;
  retries: number;
  retryDelay: number;
  wsURL: string;
}

export interface Environment {
  name: 'development' | 'production' | 'staging';
  apiBase: string;
  wsBase: string;
  debug: boolean;
}

/**
 * Detect current environment and configuration
 */
function detectEnvironment(): Environment {
  // Check if we're in browser
  if (typeof window === 'undefined') {
    return {
      name: 'development',
      apiBase: 'http://localhost:3001/api',
      wsBase: 'ws://localhost:3001',
      debug: true
    };
  }

  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  const port = window.location.port;

  // Production environment (deployed)
  if (hostname.includes('vercel.app') || 
      hostname.includes('netlify.app') || 
      hostname.includes('alfalyzer.com') ||
      hostname.includes('herokuapp.com')) {
    return {
      name: 'production',
      apiBase: `${protocol}//${hostname}/api`,
      wsBase: `${protocol === 'https:' ? 'wss:' : 'ws:'}//${hostname}`,
      debug: false
    };
  }

  // Staging environment
  if (hostname.includes('staging') || hostname.includes('dev')) {
    return {
      name: 'staging',
      apiBase: `${protocol}//${hostname}/api`,
      wsBase: `${protocol === 'https:' ? 'wss:' : 'ws:'}//${hostname}`,
      debug: true
    };
  }

  // Development environment
  // When frontend runs on port 3000, use Vite proxy
  if (port === '3000' || hostname === 'localhost' && port === '3000') {
    return {
      name: 'development',
      apiBase: '/api', // Uses Vite proxy
      wsBase: '/ws', // Uses Vite proxy
      debug: true
    };
  }

  // Fallback to direct backend connection
  return {
    name: 'development',
    apiBase: 'http://localhost:3003/api',
    wsBase: 'ws://localhost:3003',
    debug: true
  };
}

// Get current environment
export const environment = detectEnvironment();

// Default API configuration
export const apiConfig: APIConfig = {
  baseURL: environment.apiBase,
  timeout: 30000, // 30 seconds
  retries: 3,
  retryDelay: 1000, // 1 second
  wsURL: environment.wsBase
};

/**
 * Get full API URL for a given endpoint
 */
export function getAPIURL(endpoint: string): string {
  // Remove leading slash if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  
  // If base URL already includes /api, don't add it again
  if (apiConfig.baseURL.endsWith('/api')) {
    return `${apiConfig.baseURL}/${cleanEndpoint}`;
  }
  
  return `${apiConfig.baseURL}/api/${cleanEndpoint}`;
}

/**
 * Get WebSocket URL
 */
export function getWebSocketURL(path: string = ''): string {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return cleanPath ? `${apiConfig.wsURL}/${cleanPath}` : apiConfig.wsURL;
}

/**
 * Check if API is available
 */
export async function checkAPIHealth(): Promise<{
  available: boolean;
  responseTime: number;
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${apiConfig.baseURL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      signal: AbortSignal.timeout(5000) // 5 second timeout for health check
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      available: data.status === 'healthy',
      responseTime: Date.now() - startTime
    };
  } catch (error) {
    return {
      available: false,
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get authentication headers
 */
function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('alfalyzer-token') || localStorage.getItem('auth-token');
  if (token) {
    return {
      'Authorization': `Bearer ${token}`
    };
  }
  return {};
}

/**
 * Enhanced fetch with retry logic and better error handling
 */
export async function enhancedFetch(
  url: string, 
  options: RequestInit = {},
  customConfig: Partial<APIConfig> = {}
): Promise<Response> {
  const config = { ...apiConfig, ...customConfig };
  const fullURL = url.startsWith('http') ? url : getAPIURL(url);
  
  let lastError: Error;
  
  for (let attempt = 1; attempt <= config.retries; attempt++) {
    try {
      // Add timeout to request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeout);
      
      const response = await fetch(fullURL, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      // Don't retry on client errors (4xx), only on server errors (5xx) or network issues
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }

      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      // Log attempt in development
      if (environment.debug) {
        console.warn(`API request failed (attempt ${attempt}/${config.retries}):`, {
          url: fullURL,
          error: lastError.message,
          attempt
        });
      }

      // Don't retry on the last attempt
      if (attempt === config.retries) {
        break;
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, config.retryDelay * attempt));
    }
  }

  // All retries failed
  throw new Error(`API request failed after ${config.retries} attempts: ${lastError.message}`);
}

/**
 * Enhanced WebSocket connection with reconnection logic
 */
export class EnhancedWebSocket extends EventTarget {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isReconnecting = false;

  constructor(url: string) {
    super();
    this.url = url.startsWith('ws') ? url : getWebSocketURL(url);
    this.connect();
  }

  private connect(): void {
    try {
      this.ws = new WebSocket(this.url);
      
      this.ws.onopen = (event) => {
        this.reconnectAttempts = 0;
        this.isReconnecting = false;
        this.dispatchEvent(new CustomEvent('open', { detail: event }));
        
        if (environment.debug) {
          console.log('✅ WebSocket connected:', this.url);
        }
      };

      this.ws.onmessage = (event) => {
        this.dispatchEvent(new CustomEvent('message', { detail: event }));
      };

      this.ws.onclose = (event) => {
        this.dispatchEvent(new CustomEvent('close', { detail: event }));
        
        if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.attemptReconnect();
        }
      };

      this.ws.onerror = (event) => {
        this.dispatchEvent(new CustomEvent('error', { detail: event }));
        
        if (environment.debug) {
          console.error('❌ WebSocket error:', event);
        }
      };
    } catch (error) {
      if (environment.debug) {
        console.error('❌ Failed to create WebSocket:', error);
      }
      this.attemptReconnect();
    }
  }

  private attemptReconnect(): void {
    if (this.isReconnecting) return;
    
    this.isReconnecting = true;
    this.reconnectAttempts++;
    
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
    
    if (environment.debug) {
      console.log(`🔄 Attempting WebSocket reconnection (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`);
    }
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    } else {
      if (environment.debug) {
        console.warn('⚠️ WebSocket not ready, message not sent:', data);
      }
    }
  }

  close(): void {
    this.maxReconnectAttempts = 0; // Prevent reconnection
    if (this.ws) {
      this.ws.close();
    }
  }

  get readyState(): number {
    return this.ws ? this.ws.readyState : WebSocket.CLOSED;
  }
}

// Export singleton instances
export const apiHealthCheck = checkAPIHealth;
export const apiURL = getAPIURL;
export const wsURL = getWebSocketURL;

// Log current configuration in development
if (environment.debug && typeof window !== 'undefined') {
  console.log('🔧 API Configuration:', {
    environment: environment.name,
    apiBase: environment.apiBase,
    wsBase: environment.wsBase,
    baseURL: apiConfig.baseURL,
    timeout: apiConfig.timeout
  });
}