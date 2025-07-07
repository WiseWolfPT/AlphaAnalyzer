// Market Data Client - Connects to our backend API for real market data
import { env } from '@/lib/env';
import { invisibleFallbackService } from './invisible-fallback-service';

const API_BASE_URL = env.VITE_API_URL || 'http://localhost:3003';

export interface MarketQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  high?: number;
  low?: number;
  open?: number;
  previousClose?: number;
  volume?: number;
  marketCap?: number;
  eps?: number;
  pe?: number;
  provider: string;
  timestamp?: number;
  _cached?: boolean;
}

export interface BatchQuotesResponse {
  quotes: MarketQuote[];
  failed: string[];
  timestamp: number;
}

class MarketDataClient {
  private baseUrl: string;
  private authToken: string | null = null;

  constructor() {
    this.baseUrl = `${API_BASE_URL}/api/market-data`;
    // Get auth token from localStorage (multiple possible keys for compatibility)
    this.authToken = localStorage.getItem('alfalyzer-token') || localStorage.getItem('auth-token');
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

  async getQuote(symbol: string): Promise<MarketQuote | null> {
    try {
      const response = await fetch(`${this.baseUrl}/quote/${symbol}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        console.error(`Failed to fetch quote for ${symbol}:`, response.status);
        return null;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error fetching quote for ${symbol}:`, error);
      return null;
    }
  }

  async getBatchQuotes(symbols: string[]): Promise<BatchQuotesResponse> {
    console.log(`📊 Fetching batch quotes for ${symbols.length} symbols:`, symbols.join(', '));
    
    // Use invisible fallback service for seamless user experience
    const fallbackResponse = await invisibleFallbackService.getQuotesWithFallback(
      symbols,
      async () => {
        console.log('🚀 Attempting to fetch real data from API...');
        
        // Try to fetch real data with better error handling
        const quotePromises = symbols.map(async (symbol) => {
          try {
            const quote = await this.getQuote(symbol);
            return { symbol, quote, success: true };
          } catch (error) {
            console.warn(`Failed to fetch ${symbol}:`, error.message);
            return { symbol, quote: null, success: false, error: error.message };
          }
        });
        
        const results = await Promise.allSettled(quotePromises);
        
        const quotes: MarketQuote[] = [];
        const failed: string[] = [];
        
        results.forEach((result) => {
          if (result.status === 'fulfilled') {
            const { symbol, quote, success } = result.value;
            if (success && quote) {
              quotes.push(quote);
            } else {
              failed.push(symbol);
            }
          } else {
            console.error('Promise rejected:', result.reason);
          }
        });

        if (quotes.length === 0) {
          throw new Error('No real data available from any provider');
        }

        console.log(`✅ Successfully fetched ${quotes.length} real quotes, ${failed.length} failed`);
        return { quotes, failed, timestamp: Date.now() };
      }
    );

    // Convert fallback response to expected format with better error handling
    const processedQuotes = fallbackResponse.quotes.map(quote => {
      try {
        return {
          symbol: quote.symbol,
          price: quote.price,
          change: quote.change,
          changePercent: quote.changePercent,
          high: quote.high,
          low: quote.low,
          open: quote.open,
          volume: quote.volume,
          marketCap: typeof quote.marketCap === 'string' 
            ? parseInt(quote.marketCap.replace(/[$B,]/g, '')) * 1000000000 
            : quote.marketCap || 0,
          eps: typeof quote.eps === 'string' ? parseFloat(quote.eps) : quote.eps || 0,
          pe: typeof quote.peRatio === 'string' ? parseFloat(quote.peRatio) : quote.pe || 0,
          provider: fallbackResponse.source === 'fallback' ? 'alfalyzer' : 'api',
          timestamp: Date.now(),
          _cached: fallbackResponse.source === 'cache'
        };
      } catch (error) {
        console.error('Error processing quote:', quote, error);
        return null;
      }
    }).filter(Boolean) as MarketQuote[];

    console.log(`📈 Returning ${processedQuotes.length} processed quotes (source: ${fallbackResponse.source})`);

    return {
      quotes: processedQuotes,
      failed: [],
      timestamp: Date.now()
    };
  }

  async search(query: string): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/search?q=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        console.error('Failed to search stocks:', response.status);
        return [];
      }

      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('Error searching stocks:', error);
      return [];
    }
  }

  async getMarketOverview(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/market-overview`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        console.error('Failed to fetch market overview:', response.status);
        return null;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching market overview:', error);
      return null;
    }
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