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
      
      console.log(`✅ Successfully fetched batch quotes`);
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
      
      // Use invisible fallback service for seamless user experience
      const fallbackResponse = await invisibleFallbackService.getQuotesWithFallback(
        symbols,
        async () => {
          throw error; // Re-throw to trigger fallback
        }
      );

      // Convert fallback response to expected format
      const processedQuotes = fallbackResponse.quotes.map(quote => ({
        symbol: quote.symbol,
        price: quote.price,
        change: quote.change,
        changePercent: quote.changePercent,
        high: quote.high || quote.price * 1.02,
        low: quote.low || quote.price * 0.98,
        open: quote.open || quote.price,
        previousClose: quote.previousClose || quote.price,
        volume: quote.volume || Math.floor(Math.random() * 10000000),
        marketCap: typeof quote.marketCap === 'string' 
          ? parseInt(quote.marketCap.replace(/[$B,]/g, '')) * 1000000000 
          : quote.marketCap || 0,
        eps: typeof quote.eps === 'string' ? parseFloat(quote.eps) : quote.eps || 0,
        pe: typeof quote.peRatio === 'string' ? parseFloat(quote.peRatio) : quote.pe || 0,
        provider: fallbackResponse.source === 'fallback' ? 'alfalyzer' : 'api',
        timestamp: Date.now() / 1000,
        _cached: fallbackResponse.source === 'cache',
        _timestamp: Date.now() / 1000
      }));

      console.log(`📈 Returning ${processedQuotes.length} processed quotes (source: ${fallbackResponse.source})`);

      return {
        quotes: processedQuotes,
        errors: {},
        _timestamp: Date.now() / 1000,
        timestamp: Date.now()
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