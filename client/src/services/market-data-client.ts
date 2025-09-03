// Market Data Client - Connects to our backend API for real market data
import { invisibleFallbackService } from './invisible-fallback-service';
import { createAuthHeaders, logAuthConfig } from '@/lib/auth-headers';
import { addVercelProxyHeaders, isVercelDeployment } from '@/lib/vercel-proxy-client';
import { retryWithBackoff } from '@/services/error-handler-service';

// Use relative path for Vercel proxy - empty string allows proxy to work
const API_BASE_URL = '';

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
  private authToken: string | null = null;

  constructor() {
    this.baseUrl = `${API_BASE_URL}/api/market-data`;
    // Get auth token from localStorage (backend doesn't require it, but we keep for future)
    this.authToken = localStorage.getItem('alfalyzer-token') || localStorage.getItem('auth-token');
    
    // Log configuration for debugging
    console.log('🔧 Market Data Client Configuration:', {
      API_BASE_URL,
      baseUrl: this.baseUrl,
      hasAuthToken: !!this.authToken,
      authNotRequired: true, // Backend doesn't require auth
      environment: import.meta.env.MODE,
      isVercel: isVercelDeployment
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
        
        // Always throw error for non-OK responses
        // This allows the fallback service to be used
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ API Response received`);
      return data;
    } catch (error: any) {
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        console.error(`🚫 Network Error - Cannot reach API at ${url}`);
        console.error(`📍 This might be a CORS issue or the backend is not accessible`);
        console.error(`💡 Check if VITE_API_URL is correctly set to: ${import.meta.env.VITE_API_URL}`);
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
        // Prefer exact match; fall back to requestedSymbol or common alias swap (dot↔hyphen)
        const quote = batchResponse.quotes.find(q => 
          q.symbol === symbol ||
          (q as any).requestedSymbol === symbol ||
          q.symbol?.replace('-', '.') === symbol ||
          q.symbol?.replace('.', '-') === symbol
        );
        if (quote) {
          console.log(`✅ Successfully extracted quote for ${symbol} from batch response`);
          return quote;
        }
      }
      
      // If no quote found in batch response, throw error
      throw new Error(`No quote data found for symbol: ${symbol}`);
    } catch (error) {
      console.error(`❌ Error fetching quote for ${symbol}:`, error);
      throw error;
    }
  }

  async getBatchQuotes(symbols: string[]): Promise<BatchQuotesResponse> {
    try {
      // Use GET method with query params as backend expects
      const params = new URLSearchParams({ symbols: symbols.join(',') });
      console.log(`📡 Fetching batch quotes from: ${this.baseUrl}/quotes/batch?${params}`);
      console.log(`📊 Symbols: ${symbols.join(', ')}`);
      
      // Add API key header for batch quotes endpoint
      const headers: Record<string, string> = {};
      if (import.meta.env.VITE_MARKET_DATA_API_KEY) {
        headers['X-API-Key'] = import.meta.env.VITE_MARKET_DATA_API_KEY;
        console.log('🔑 Adding X-API-Key header for batch quotes');
      }
      
      const response = await this.fetchWithAuth(`${this.baseUrl}/quotes/batch?${params}`, {
        method: 'GET',
        headers,
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
        symbols: symbols
      });
      
      // Check if this is a network error (backend not available)
      if (error.name === 'NetworkError' || (error.name === 'TypeError' && error.message.includes('Failed to fetch'))) {
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
    
    // Direct API call - no cached endpoints for now
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
      // Direct API call - no cached endpoints for now
      const response = await this.fetchWithAuth(`${this.baseUrl}/market-overview`);
      return response;
    } catch (error) {
      console.error('Error fetching market overview:', error);
      return null;
    }
  }

  // New method to get cache statistics
  async getCacheStats(): Promise<any> {
    // Cached endpoints not implemented yet
    return null;
  }

  // New method to get API provider status
  async getProviderStatus(): Promise<any> {
    // Provider status endpoint not implemented yet
    return null;
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

  // Enable or disable cached endpoints (placeholder for future implementation)
  setUseCachedEndpoints(enabled: boolean) {
    console.log(`🗄️ Cached endpoints ${enabled ? 'enabled' : 'disabled'} (not implemented yet)`);
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
