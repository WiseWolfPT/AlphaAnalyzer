/**
 * Simple Cache Service - Phase 4.5 Cache Simplification
 * 
 * Single Redis cache layer with 60s TTL
 * Eliminates the complex 3-layer architecture
 * Direct FMP calls on cache miss
 * Thundering herd protection with in-flight request tracking
 */

import { redisCacheService } from '../cache/redis-cache-service';
import { FMPProvider } from './providers/fmp-provider';
import { AlphaVantageProvider } from './providers/alpha-vantage-provider';
import type { StockQuote } from '@/types/market-data';

// Track in-flight requests to prevent thundering herd
const inFlightRequests = new Map<string, Promise<StockQuote | null>>();

// Cache configuration
const CACHE_TTL = 60; // 60 seconds
const MAX_BATCH_SIZE = 50; // FMP supports up to 50 symbols per batch

// Initialize providers
const fmpProvider = process.env.FMP_API_KEY ? new FMPProvider(process.env.FMP_API_KEY) : null;
const alphaVantageProvider = process.env.ALPHA_VANTAGE_API_KEY ? new AlphaVantageProvider(process.env.ALPHA_VANTAGE_API_KEY) : null;

class SimpleCacheService {
  /**
   * Get a single stock quote with caching
   */
  async getQuote(symbol: string): Promise<StockQuote | null> {
    try {
      const upperSymbol = symbol.toUpperCase();
      const cacheKey = `quote:${upperSymbol}`;

      // Check cache first
      const cached = await redisCacheService.get<StockQuote>(cacheKey);
      if (cached) {
        console.log(`✅ Cache hit for ${upperSymbol}`);
        return cached;
      }

      // Check if there's already an in-flight request for this symbol
      const inFlight = inFlightRequests.get(upperSymbol);
      if (inFlight) {
        console.log(`⏳ Waiting for in-flight request for ${upperSymbol}`);
        return await inFlight;
      }

      // Create new request and track it
      console.log(`📡 Cache miss for ${upperSymbol}, fetching from FMP`);
      const requestPromise = this.fetchQuoteFromAPI(upperSymbol);
      inFlightRequests.set(upperSymbol, requestPromise);

      try {
        const quote = await requestPromise;
        
        // Cache the result if successful
        if (quote) {
          await redisCacheService.set(cacheKey, quote, CACHE_TTL);
          console.log(`💾 Cached ${upperSymbol} for ${CACHE_TTL}s`);
        }

        return quote;
      } finally {
        // Clean up in-flight tracking
        inFlightRequests.delete(upperSymbol);
      }
    } catch (error) {
      console.error(`❌ Error getting quote for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get batch quotes with caching
   */
  async getBatchQuotes(symbols: string[]): Promise<Record<string, StockQuote>> {
    try {
      // Normalize symbols
      const upperSymbols = symbols.map(s => s.toUpperCase());
      const results: Record<string, StockQuote> = {};
      const missingSymbols: string[] = [];

      // Check cache for each symbol
      await Promise.all(
        upperSymbols.map(async (symbol) => {
          const cacheKey = `quote:${symbol}`;
          const cached = await redisCacheService.get<StockQuote>(cacheKey);
          
          if (cached) {
            results[symbol] = cached;
            console.log(`✅ Batch cache hit for ${symbol}`);
          } else {
            missingSymbols.push(symbol);
          }
        })
      );

      // Fetch missing symbols in batches
      if (missingSymbols.length > 0) {
        console.log(`📡 Fetching ${missingSymbols.length} missing symbols from FMP`);
        
        // Split into batches if needed
        const batches = [];
        for (let i = 0; i < missingSymbols.length; i += MAX_BATCH_SIZE) {
          batches.push(missingSymbols.slice(i, i + MAX_BATCH_SIZE));
        }

        // Fetch each batch
        await Promise.all(
          batches.map(async (batch) => {
            const batchQuotes = await this.fetchBatchQuotesFromAPI(batch);
            
            // Cache and store results
            await Promise.all(
              Object.entries(batchQuotes).map(async ([symbol, quote]) => {
                const cacheKey = `quote:${symbol}`;
                await redisCacheService.set(cacheKey, quote, CACHE_TTL);
                results[symbol] = quote;
                console.log(`💾 Batch cached ${symbol} for ${CACHE_TTL}s`);
              })
            );
          })
        );
      }

      return results;
    } catch (error) {
      console.error('❌ Error getting batch quotes:', error);
      return {};
    }
  }

  /**
   * Fetch single quote from API (FMP with Alpha Vantage fallback)
   */
  private async fetchQuoteFromAPI(symbol: string): Promise<StockQuote | null> {
    try {
      // Try FMP first (our paid service)
      if (fmpProvider) {
        const fmpQuote = await fmpProvider.getQuote(symbol);
        if (fmpQuote) {
          return this.normalizeQuote(fmpQuote, symbol);
        }
        // Edge case: dot-class tickers like BRK.B – try hyphen variant for provider quirks
        if (symbol.includes('.')) {
          try {
            const altSymbol = symbol.replace('.', '-');
            const altQuote = await fmpProvider.getQuote(altSymbol);
            if (altQuote) {
              // Map back to original symbol to keep UI consistent
              return this.normalizeQuote(altQuote, symbol);
            }
          } catch {
            // ignore and continue to fallback provider
          }
        }
      }

      // Fallback to Alpha Vantage
      if (alphaVantageProvider) {
        console.log(`⚠️ FMP failed for ${symbol}, trying Alpha Vantage`);
        const avQuote = await alphaVantageProvider.getQuote(symbol);
        if (avQuote) {
          return this.normalizeQuote(avQuote, symbol);
        }
      }

      console.error(`❌ All APIs failed for ${symbol}`);
      return null;
    } catch (error) {
      console.error(`❌ Error fetching quote for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Fetch batch quotes from API
   */
  private async fetchBatchQuotesFromAPI(symbols: string[]): Promise<Record<string, StockQuote>> {
    try {
      // FMP supports batch requests
      if (fmpProvider) {
        const quotes = await fmpProvider.getBatchQuotes(symbols);

        // FMP returns an array; build a symbol-keyed map safely
        const normalized: Record<string, StockQuote> = {};
        const requested = new Set(symbols.map(s => s.toUpperCase()));
        if (Array.isArray(quotes)) {
          for (const q of quotes) {
            const sym = String((q as any).symbol || '').toUpperCase().trim();
            if (!sym) continue;
            normalized[sym] = this.normalizeQuote(q, sym);
          }
        } else if (quotes && typeof quotes === 'object') {
          // Defensive: handle unexpected object shape
          for (const [symRaw, q] of Object.entries(quotes as any)) {
            const sym = String(symRaw).toUpperCase().trim();
            if (!q) continue;
            normalized[sym] = this.normalizeQuote(q, sym);
          }
        }

        // Backfill any requested symbols missing from the batch response
        const missing = [...requested].filter(sym => !normalized[sym]);
        if (missing.length > 0) {
          await Promise.all(
            missing.map(async (sym) => {
              const q = await this.fetchQuoteFromAPI(sym);
              if (q) normalized[sym] = q;
            })
          );
        }

        if (Object.keys(normalized).length > 0) {
          return normalized;
        }
      }
    } catch (error) {
      console.error('❌ Error fetching batch quotes:', error);
    }
    
    // Fallback: fetch individually
    const results: Record<string, StockQuote> = {};
    await Promise.all(
      symbols.map(async (symbol) => {
        const quote = await this.fetchQuoteFromAPI(symbol);
        if (quote) {
          results[symbol] = quote;
        }
      })
    );
    
    return results;
  }

  /**
   * Normalize quote data to ensure consistent format
   */
  private normalizeQuote(quote: any, symbol: string): StockQuote {
    const price = Number(quote.price || quote.latestPrice || quote.c || 0);
    const prevClose = Number(quote.previousClose || quote.prevClose || quote.pc || 0);
    // Prefer provider change; fallback to price - prevClose
    let change = Number(quote.change || quote.priceChange || quote.d || 0);
    if (!isFinite(change) || (change === 0 && prevClose > 0 && price > 0)) {
      change = prevClose > 0 ? price - prevClose : change;
    }
    // Prefer provider changePercent; fallback to computed based on previousClose
    let changePercent = Number(quote.changePercent || quote.changePercentage || quote.dp || 0);
    if (!isFinite(changePercent) && prevClose > 0) {
      changePercent = ((price - prevClose) / prevClose) * 100;
    }
    return {
      symbol: symbol.toUpperCase(),
      price,
      change,
      changePercent,
      volume: Number(quote.volume || 0),
      marketCap: Number(quote.marketCap || 0),
      peRatio: Number(quote.peRatio || quote.pe || 0),
      high: Number(quote.high || quote.dayHigh || 0),
      low: Number(quote.low || quote.dayLow || 0),
      open: Number(quote.open || 0),
      previousClose: prevClose,
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Clear cache for a symbol
   */
  async clearCache(symbol?: string): Promise<void> {
    if (symbol) {
      const cacheKey = `quote:${symbol.toUpperCase()}`;
      await redisCacheService.delete(cacheKey);
      console.log(`🗑️ Cleared cache for ${symbol}`);
    } else {
      // Clear all quote cache keys
      const keys = await redisCacheService.keys('quote:*');
      if (keys.length > 0) {
        await Promise.all(keys.map(key => redisCacheService.delete(key)));
        console.log(`🗑️ Cleared ${keys.length} cached quotes`);
      }
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    cacheSize: number;
    memoryUsage: string;
    ttl: number;
  }> {
    const keys = await redisCacheService.keys('quote:*');
    const health = await redisCacheService.healthCheck();
    
    return {
      cacheSize: keys.length,
      memoryUsage: health.memoryUsage ? `${(health.memoryUsage / 1024 / 1024).toFixed(2)}MB` : 'N/A',
      ttl: CACHE_TTL
    };
  }
}

// Export singleton instance
export const simpleCacheService = new SimpleCacheService();
