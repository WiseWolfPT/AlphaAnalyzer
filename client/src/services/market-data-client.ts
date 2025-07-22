// Market Data Client - Connects to our backend API for real market data
import { env } from '@/lib/env';
import { invisibleFallbackService } from './invisible-fallback-service';

const API_BASE_URL = env.VITE_API_URL || 'http://localhost:3001';

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
    // Get auth token from localStorage (multiple possible keys for compatibility)
    this.authToken = localStorage.getItem('alfalyzer-token') || localStorage.getItem('auth-token');
    
    // Log configuration for debugging
    console.log('🔧 Market Data Client Configuration:', {
      API_BASE_URL,
      baseUrl: this.baseUrl,
      VITE_API_URL: env.VITE_API_URL,
      hasAuthToken: !!this.authToken,
      environment: import.meta.env.MODE
    });
  }

  private async fetchWithAuth(url: string, options?: RequestInit) {
    const headers = {
      'Content-Type': 'application/json',
      ...(this.authToken && { Authorization: `Bearer ${this.authToken}` }),
      ...options?.headers,
    };

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
        
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
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
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }
    
    return headers;
  }

  async getQuote(symbol: string): Promise<MarketQuote> {
    return this.fetchWithAuth(`${this.baseUrl}/quote/${symbol}`);
  }

  async getBatchQuotes(symbols: string[]): Promise<BatchQuotesResponse> {
    try {
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
      
      // For other errors, return empty response
      return {
        quotes: [],
        errors: { general: error.message },
        timestamp: Date.now(),
        _timestamp: Date.now() / 1000
      };
    }
  }

  async searchSymbols(query: string): Promise<{ results: SearchResult[]; count: number }> {
    const params = new URLSearchParams({ query });
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
      const response = await this.fetchWithAuth(`${this.baseUrl}/market-overview`);
      return response;
    } catch (error) {
      console.error('Error fetching market overview:', error);
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
}

// Export singleton instance
export const marketDataClient = new MarketDataClient();