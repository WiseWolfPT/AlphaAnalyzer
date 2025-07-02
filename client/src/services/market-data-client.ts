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
    // Use invisible fallback service for seamless user experience
    const fallbackResponse = await invisibleFallbackService.getQuotesWithFallback(
      symbols,
      async () => {
        // Try to fetch real data
        const quotePromises = symbols.map(symbol => this.getQuote(symbol));
        const results = await Promise.allSettled(quotePromises);
        
        const quotes: MarketQuote[] = [];
        const failed: string[] = [];
        
        results.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value) {
            quotes.push(result.value);
          } else {
            failed.push(symbols[index]);
          }
        });

        if (quotes.length === 0) {
          throw new Error('No real data available');
        }

        return { quotes, failed, timestamp: Date.now() };
      }
    );

    // Convert fallback response to expected format
    return {
      quotes: fallbackResponse.quotes.map(quote => ({
        symbol: quote.symbol,
        price: quote.price,
        change: quote.change,
        changePercent: quote.changePercent,
        high: quote.high,
        low: quote.low,
        open: quote.open,
        volume: quote.volume,
        marketCap: parseInt(quote.marketCap.replace(/[$B,]/g, '')) * 1000000000,
        eps: parseFloat(quote.eps),
        pe: parseFloat(quote.peRatio),
        provider: fallbackResponse.source === 'fallback' ? 'alfalyzer' : 'api',
        timestamp: Date.now(),
        _cached: fallbackResponse.source === 'cache'
      })),
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