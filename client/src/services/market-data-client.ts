// Market Data Client - Connects to our backend API for real market data
import { env } from '@/lib/env';
import { invisibleFallbackService } from './invisible-fallback-service';
import { createAuthHeaders, logAuthConfig } from '@/lib/auth-headers';
import { addVercelProxyHeaders, isVercelDeployment } from '@/lib/vercel-proxy-client';
import { handleApiError, retryWithBackoff } from '@/services/error-handler-service';

// Use relative path for Vercel proxy instead of direct Koyeb URL
const API_BASE_URL = typeof window !== 'undefined' ? '' : (env.VITE_API_URL || 'https://crucial-ivonne-alfalyzer-90666a9e.koyeb.app');

export interface MarketQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  volume: number;
  marketCap?: number;
  eps?: number;
  pe?: number;
  provider: string;
  timestamp: number;
  _cached: boolean;
  _timestamp: number;
}

export interface BatchQuotesResponse {
  quotes: MarketQuote[];
  failed?: string[];
  errors?: Record<string, string>;
  timestamp: number;
  _timestamp?: number;
}

export interface SearchResult {
  symbol: string;
  name: string;
  type: string;
  exchange: string;
}

export interface MarketOverview {
  sp500: { value: number; change: number };
  nasdaq: { value: number; change: number };
  dow: { value: number; change: number };
  vix: { value: number; change: number };
}

class MarketDataClient {
  private baseUrl: string;
  private cachedBaseUrl: string;
  private authToken: string | null = null;
  private useCachedEndpoints: boolean = true; // New flag to use cached endpoints

  constructor() {
    this.baseUrl = `${API_BASE_URL}/api/market-data`;
    this.cachedBaseUrl = `${API_BASE_URL}/api/cached`; // New cached endpoints
    // Get auth token from localStorage (multiple possible keys for compatibility)
    // Note: The backend doesn't require authentication, but we still check for token
    // in case it's implemented in the future
    this.authToken = localStorage.getItem('alfalyzer-token') || localStorage.getItem('auth-token');
    
    // Log configuration for debugging
    console.log('🔧 Market Data Client Configuration:', {
      API_BASE_URL,
      baseUrl: this.baseUrl,
      cachedBaseUrl: this.cachedBaseUrl,
      VITE_API_URL: env.VITE_API_URL,
      hasAuthToken: !!this.authToken,
      authNotRequired: true, // Backend doesn't require auth
      useCachedEndpoints: this.useCachedEndpoints,
      environment: import.meta.env.MODE
    });
    
    // Log auth header configuration
    logAuthConfig();
  }

  private async fetchWithAuth(url: string, options?: RequestInit) {
    let headers = createAuthHeaders(this.authToken, options?.headers as Record<string, string>);
    
    // Add Vercel proxy headers if running on Vercel
    if (isVercelDeployment) {
      headers = addVercelProxyHeaders(headers);
      console.log(`🚀 Running on Vercel - proxy headers added`);
    }

    console.log(`🌐 Making request to: ${url}`);
    
    try {
      const response = await fetch(url, {
        ...options,
        headers,
        mode: 'cors',
        credentials: 'omit',
      });

      console.log(`📡 Response status: ${response.status}`);

      if (!response.ok) {
        // Special handling for 401 Unauthorized when auth is not required
        if (response.status === 401 && !this.authToken) {
          console.warn(`⚠️ Received 401 but auth token is not required. Proceeding anyway.`);
          // Don't throw error for 401 when no auth token exists
          // The backend doesn't require auth, so this might be a misconfiguration
          // Return empty data for 401 without auth
          return { quotes: [], errors: { auth: '401 received but auth not required' }, timestamp: Date.now() };
        } else {
          const errorText = await response.text();
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { message: errorText };
          }
          
          console.error(`❌ API Error Response:`, {
            status: response.status,
            statusText: response.statusText,
            error: errorData,
            url: url
          });
          
          throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        }
      }

      const data = await response.json();
      console.log(`✅ API Response received`);
      return data;
    } catch (error: any) {
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        console.error(`🚫 Network Error - Cannot reach API at ${url}`);
        console.error(`📍 This might be a CORS issue or the backend is not accessible`);
        console.error(`💡 Check if VITE_API_URL is correctly set to: ${env.VITE_API_URL}`);
        console.error(`🔍 Full error details:`, error);
        
        // Provide more helpful error message
        const betterError = new Error(
          `Network error: Unable to connect to backend API at ${this.baseUrl}. ` +
          `Make sure the backend server is running on port 3001.`
        );
        betterError.name = 'NetworkError';
        throw betterError;
      }
      throw error;
    }
  }

  private getHeaders(): HeadersInit {
    return createAuthHeaders(this.authToken);
  }

  async getQuote(symbol: string): Promise<MarketQuote> {
    console.log(`📊 getQuote called for symbol: ${symbol}`);
    
    // Use batch endpoint to get a single quote since individual endpoints don't exist
    try {
      const batchResponse = await retryWithBackoff(
        () => this.getBatchQuotes([symbol]),
        3,
        1000
      );
      
      // Extract the single quote from batch response
      if (batchResponse.quotes && batchResponse.quotes.length > 0) {
        const quote = batchResponse.quotes.find(q => q.symbol === symbol);
        if (quote) {
          console.log(`✅ Successfully extracted quote for ${symbol} from batch response`);
          return quote;
        }
      }
      
      // If no quote found in batch response, throw error
      throw new Error(`No quote data found for symbol: ${symbol}`);
    } catch (error) {
      console.error(`❌ Error fetching quote for ${symbol}:`, error);
      
      // Try to handle the error and provide fallback
      await handleApiError(
        error, 
        `quote/${symbol}`,
        () => this.getQuote(symbol)
      );
      
      // If we reach here, error handler couldn't recover, throw the error
      throw error;
    }
  }

  async getBatchQuotes(symbols: string[]): Promise<BatchQuotesResponse> {
    try {
      // Try cached endpoints first if enabled
      if (this.useCachedEndpoints) {
        try {
          console.log(`🗄️ Fetching batch quotes from cache: ${this.cachedBaseUrl}/quotes/batch`);
          console.log(`📊 Symbols: ${symbols.join(', ')}`);
          
          const response = await this.fetchWithAuth(`${this.cachedBaseUrl}/quotes/batch`, {
            method: 'POST',
            body: JSON.stringify({ symbols }),
          });
          
          console.log(`✅ Successfully fetched batch quotes from cache`);
          
          // Transform cached response to our format
          if (response.quotes && Array.isArray(response.quotes)) {
            return {
              quotes: response.quotes.map((q: any) => ({
                symbol: q.symbol,
                price: q.price,
                change: q.change || 0,
                changePercent: q.changePercent || 0,
                high: q.price,
                low: q.price,
                open: q.price,
                previousClose: q.price - (q.change || 0),
                volume: q.volume || 0,
                marketCap: q.marketCap,
                provider: 'cache',
                timestamp: new Date(q.lastUpdated).getTime() / 1000,
                _cached: true,
                _timestamp: Date.now() / 1000
              })),
              errors: {},
              timestamp: Date.now(),
              _timestamp: Date.now() / 1000
            };
          }
        } catch (cacheError) {
          console.warn('⚠️ Cache fetch failed, falling back to direct API', cacheError);
          // Continue to fallback below
        }
      }
      
      // Original direct API call (fallback)
      console.log(`📡 Fetching batch quotes from: ${this.baseUrl}/quotes/batch`);
      console.log(`📊 Symbols: ${symbols.join(', ')}`);
      
      const response = await this.fetchWithAuth(`${this.baseUrl}/quotes/batch`, {
        method: 'POST',
        body: JSON.stringify({ symbols }),
      });
      
      console.log(`✅ Successfully fetched batch quotes from backend`);
      
      // Ensure response has the expected format
      if (!response.quotes) {
        console.warn('⚠️ Backend response missing quotes array, wrapping response');
        return {
          quotes: Array.isArray(response) ? response : [],
          errors: {},
          timestamp: Date.now(),
          _timestamp: Date.now() / 1000
        };
      }
      
      return response;
    } catch (error: any) {
      console.error('❌ Error fetching batch quotes:', error);
      console.error(`🔗 API URL was: ${this.baseUrl}`);
      console.error(`📍 Full error details:`, {
        message: error.message,
        baseUrl: this.baseUrl,
        apiUrl: env.VITE_API_URL,
        symbols: symbols
      });
      
      // Check if this is a network error (backend not available)
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        console.log('🔄 Backend unavailable, using fallback service');
        
        // Use the invisible fallback service
        const fallbackResponse = invisibleFallbackService.getFallbackQuotes(symbols);
        
        // Transform fallback response to match our API format
        return {
          quotes: fallbackResponse.quotes.map(stock => ({
            symbol: stock.symbol,
            price: stock.price,
            change: stock.change,
            changePercent: stock.changePercent,
            high: stock.high,
            low: stock.low,
            open: stock.open,
            previousClose: stock.price - stock.change,
            volume: stock.volume,
            marketCap: parseFloat(stock.marketCap.replace(/[^0-9.]/g, '')) * 1e9,
            eps: parseFloat(stock.eps) || undefined,
            pe: parseFloat(stock.peRatio) || undefined,
            provider: 'fallback',
            timestamp: Math.floor(Date.now() / 1000),
            _cached: true,
            _timestamp: Date.now() / 1000
          })),
          errors: {},
          timestamp: Date.now(),
          _timestamp: Date.now() / 1000
        };
      }
      
      // Handle API errors with the error handler
      await handleApiError(
        error,
        'quotes/batch',
        async () => {
          // Retry with exponential backoff
          return await retryWithBackoff(
            () => this.fetchWithAuth(`${this.baseUrl}/quotes/batch`, {
              method: 'POST',
              body: JSON.stringify({ symbols }),
            }),
            3,
            2000
          );
        }
      );
      
      // For other errors, return empty response with proper error info
      return {
        quotes: [],
        errors: { general: error.message },
        failed: symbols,
        timestamp: Date.now(),
        _timestamp: Date.now() / 1000
      };
    }
  }

  async searchSymbols(query: string): Promise<{ results: SearchResult[]; count: number }> {
    const params = new URLSearchParams({ query });
    
    // Try cached search first
    if (this.useCachedEndpoints) {
      try {
        console.log(`🗄️ Searching symbols in cache: ${query}`);
        return await this.fetchWithAuth(`${this.cachedBaseUrl}/search?${params}`);
      } catch (error) {
        console.warn('⚠️ Cache search failed, falling back to direct API', error);
      }
    }
    
    // Fallback to direct API
    return this.fetchWithAuth(`${this.baseUrl}/search?${params}`);
  }

  async search(query: string): Promise<SearchResult[]> {
    try {
      const response = await this.searchSymbols(query);
      return response.results || [];
    } catch (error) {
      console.error('Error searching stocks:', error);
      return [];
    }
  }

  async getMarketOverview(): Promise<MarketOverview | null> {
    try {
      // Try cached market overview first
      if (this.useCachedEndpoints) {
        try {
          console.log('🗄️ Fetching market overview from cache');
          const response = await this.fetchWithAuth(`${this.cachedBaseUrl}/market-overview`);
          
          // Transform cached response to MarketOverview format
          if (response.indices && Array.isArray(response.indices)) {
            const findIndex = (symbol: string) => response.indices.find((i: any) => i.symbol === symbol);
            
            const sp500 = findIndex('^GSPC') || { price: 0, change_percent: 0 };
            const nasdaq = findIndex('^IXIC') || { price: 0, change_percent: 0 };
            const dow = findIndex('^DJI') || { price: 0, change_percent: 0 };
            const vix = findIndex('^VIX') || { price: 0, change_percent: 0 };
            
            return {
              sp500: { value: sp500.price, change: sp500.change_percent },
              nasdaq: { value: nasdaq.price, change: nasdaq.change_percent },
              dow: { value: dow.price, change: dow.change_percent },
              vix: { value: vix.price, change: vix.change_percent }
            };
          }
        } catch (error) {
          console.warn('⚠️ Cache market overview failed, falling back to direct API', error);
        }
      }
      
      // Fallback to direct API
      const response = await this.fetchWithAuth(`${this.baseUrl}/market-overview`);
      return response;
    } catch (error) {
      console.error('Error fetching market overview:', error);
      return null;
    }
  }

  // New method to get cache statistics
  async getCacheStats(): Promise<any> {
    if (!this.useCachedEndpoints) {
      return null;
    }
    
    try {
      console.log('📊 Fetching cache statistics');
      return await this.fetchWithAuth(`${this.cachedBaseUrl}/stats`);
    } catch (error) {
      console.error('Error fetching cache stats:', error);
      return null;
    }
  }

  // New method to get API provider status
  async getProviderStatus(): Promise<any> {
    if (!this.useCachedEndpoints) {
      return null;
    }
    
    try {
      console.log('🔍 Fetching API provider status');
      return await this.fetchWithAuth(`${this.cachedBaseUrl}/providers`);
    } catch (error) {
      console.error('Error fetching provider status:', error);
      return null;
    }
  }

  async getStatus() {
    return this.fetchWithAuth(`${this.baseUrl}/status`);
  }

  // Update auth token when user logs in
  setAuthToken(token: string) {
    this.authToken = token;
    localStorage.setItem('alfalyzer-token', token);
    localStorage.setItem('auth-token', token); // Keep for compatibility
  }

  // Clear auth token on logout
  clearAuthToken() {
    this.authToken = null;
    localStorage.removeItem('alfalyzer-token');
    localStorage.removeItem('auth-token');
  }

  // Test connectivity without authentication
  async testConnectivity(): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      console.log('🔍 Testing market data API connectivity...');
      console.log(`📡 Testing endpoint: ${this.baseUrl}/health`);
      
      // Test without auth token to verify backend doesn't require it
      let headers: HeadersInit = {
        'Content-Type': 'application/json',
        // Intentionally not sending auth token
      };
      
      // Add Vercel proxy headers if running on Vercel
      if (isVercelDeployment) {
        headers = addVercelProxyHeaders(headers);
        console.log(`🚀 Running on Vercel - proxy headers added for health check`);
      }
      
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers,
        mode: 'cors',
        credentials: 'omit',
      });

      const data = await response.json();
      
      if (response.ok) {
        console.log('✅ API connectivity test successful');
        return {
          success: true,
          message: 'API is accessible without authentication',
          details: data
        };
      } else {
        console.warn('⚠️ API returned non-OK status:', response.status);
        return {
          success: false,
          message: `API returned status ${response.status}`,
          details: data
        };
      }
    } catch (error: any) {
      console.error('❌ API connectivity test failed:', error);
      return {
        success: false,
        message: error.message || 'Failed to connect to API',
        details: { error: error.toString() }
      };
    }
  }
}

// Export singleton instance
export const marketDataClient = new MarketDataClient();