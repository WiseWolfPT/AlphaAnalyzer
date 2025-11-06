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
import { FinnhubProvider } from './providers/finnhub-provider';
import type { StockQuote } from '@/types/market-data';

// Track in-flight requests to prevent thundering herd
const inFlightRequests = new Map<string, Promise<StockQuote | null>>();

// Hit/Miss counters
const hitCounters = {
  total: 0,
  bySymbol: new Map<string, number>(),
};
const missCounters = {
  total: 0,
  bySymbol: new Map<string, number>(),
};

function inc(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) || 0) + 1);
}

// Cache configuration with differentiated TTLs (parametrizable via ENV)
const TTL_QUOTES = parseInt(process.env.TTL_QUOTE_SECONDS || '60', 10);          // 60 seconds for real-time quotes
const TTL_HISTORICAL = parseInt(process.env.TTL_HISTORICAL_SECONDS || '7200', 10);  // 2 hours for historical data
const TTL_FINANCIALS = parseInt(process.env.TTL_FUNDAMENTALS_SECONDS || '3600', 10);  // 1 hour for financial statements
const TTL_PROFILE = parseInt(process.env.TTL_PROFILE_SECONDS || '86400', 10);        // 24 hours for company profiles
const TTL_MARKET_STATUS = parseInt(process.env.TTL_MARKET_STATUS_SECONDS || '300', 10); // 5 minutes for market status
const TTL_DEFAULT = parseInt(process.env.TTL_DEFAULT_SECONDS || '3600', 10);          // 1 hour default

// Legacy constant for backward compatibility (used for quotes caching)
const CACHE_TTL = TTL_QUOTES;
const MAX_BATCH_SIZE = 50; // FMP supports up to 50 symbols per batch

// Initialize providers
const fmpProvider = process.env.FMP_API_KEY ? new FMPProvider(process.env.FMP_API_KEY) : null;
const finnhubProvider = process.env.FINNHUB_API_KEY ? new FinnhubProvider(process.env.FINNHUB_API_KEY) : null;

/**
 * Normalize ticker format for FMP API compatibility
 * FMP uses hyphens for share classes (BRK-B, BF-A), not dots
 *
 * Examples:
 * - BRK.B → BRK-B (Berkshire Hathaway Class B)
 * - BF.A → BF-A (Brown-Forman Class A)
 * - ASML.AS → ASML.AS (European exchange suffix preserved)
 * - BMW.F → BMW.F (Frankfurt exchange preserved)
 * - ABI.BR → ABI.BR (Brussels exchange preserved)
 * - AAPL → AAPL (unchanged)
 */
function normalizeTickerFormat(symbol: string): string {
  const upper = symbol.toUpperCase();

  // Known exchange suffixes to preserve (don't convert . to -)
  const exchangeSuffixes = [
    'AS', 'L', 'PA', 'DE', 'LS', 'SW', 'HK', 'TO', 'V',  // Existing
    'F', 'BR', 'MC', 'MI', 'ST', 'HE', 'CO', 'OL', 'VI'  // NEW (Frankfurt, Brussels, Madrid, Milan, Stockholm, Helsinki, Copenhagen, Oslo, Vienna)
  ];

  // Check if has exchange suffix
  const suffixMatch = upper.match(/\.([A-Z]+)$/);
  if (suffixMatch) {
    const suffix = suffixMatch[1];

    // If exchange suffix, preserve it
    if (exchangeSuffixes.includes(suffix)) {
      return upper;
    }

    // Otherwise convert to hyphen (share class: BRK.B → BRK-B)
    if (suffix.length === 1) {
      return upper.replace(/\.([A-Z])$/, '-$1');
    }
  }

  return upper;
}

class SimpleCacheService {
  /**
   * Get a single stock quote with caching
   */
  async getQuote(symbol: string): Promise<StockQuote | null> {
    try {
      const normalizedSymbol = normalizeTickerFormat(symbol);
      const cacheKey = `quote:${normalizedSymbol}`;

      // Check cache first
      const cached = await redisCacheService.get<StockQuote>(cacheKey);
      if (cached) {
        console.log(`✅ Cache hit for ${normalizedSymbol}`);
        hitCounters.total++;
        inc(hitCounters.bySymbol, normalizedSymbol);
        return cached;
      }

      // Check if there's already an in-flight request for this symbol
      const inFlight = inFlightRequests.get(normalizedSymbol);
      if (inFlight) {
        console.log(`⏳ Waiting for in-flight request for ${normalizedSymbol}`);
        return await inFlight;
      }

      // Create new request and track it
      console.log(`📡 Cache miss for ${normalizedSymbol}, fetching from FMP`);
      const requestPromise = this.fetchQuoteFromAPI(normalizedSymbol);
      inFlightRequests.set(normalizedSymbol, requestPromise);

      try {
        const quote = await requestPromise;

        // Circuit breaker: Only cache valid quotes (price > 0)
        if (quote && quote.price && quote.price > 0) {
          await redisCacheService.set(cacheKey, quote, CACHE_TTL);
          console.log(`💾 Cached ${normalizedSymbol} for ${CACHE_TTL}s`);
        } else if (quote) {
          // Quote exists but price is invalid - don't cache
          console.warn(`⚠️ Invalid quote for ${normalizedSymbol} (price: ${quote.price}), NOT caching`);
          missCounters.total++;
          inc(missCounters.bySymbol, normalizedSymbol);
        } else {
          // count a miss only when we truly couldn't fetch
          missCounters.total++;
          inc(missCounters.bySymbol, normalizedSymbol);
        }

        return quote;
      } finally {
        // Clean up in-flight tracking
        inFlightRequests.delete(normalizedSymbol);
      }
    } catch (error) {
      console.error(`❌ Error getting quote for ${symbol}:`, error);
      missCounters.total++;
      inc(missCounters.bySymbol, normalizeTickerFormat(symbol));
      return null;
    }
  }

  /**
   * Get batch quotes with caching
   */
  async getBatchQuotes(symbols: string[]): Promise<Record<string, StockQuote>> {
    try {
      // Normalize symbols (uppercase + convert dots to hyphens for FMP compatibility)
      const normalizedSymbols = symbols.map(s => normalizeTickerFormat(s));
      const results: Record<string, StockQuote> = {};
      const missingSymbols: string[] = [];

      // Check cache for each symbol
      await Promise.all(
        normalizedSymbols.map(async (symbol) => {
          const cacheKey = `quote:${symbol}`;
          const cached = await redisCacheService.get<StockQuote>(cacheKey);
          
          if (cached) {
            results[symbol] = cached;
            console.log(`✅ Batch cache hit for ${symbol}`);
            hitCounters.total++;
            inc(hitCounters.bySymbol, symbol);
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
                results[symbol] = quote as StockQuote;
                console.log(`💾 Batch cached ${symbol} for ${CACHE_TTL}s`);
                // Consider this a miss that we filled
                missCounters.total++;
                inc(missCounters.bySymbol, symbol);
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
   * Fetch single quote from API (FMP with Finnhub fallback)
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
        // BUG FIX #2: Exclude exchange suffixes (.LS, .DE, .PA, etc.) from conversion
        // Portuguese stocks (GALP.LS), German (SAP.DE), etc. must keep dots
        if (symbol.includes('.') && !symbol.match(/\.(LS|DE|PA|AS|L|TO|SW|HK|T|AX)$/i)) {
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

      // Fallback to Finnhub
      if (finnhubProvider) {
        console.log(`⚠️ FMP failed for ${symbol}, trying Finnhub`);
        const finnhubSymbol = symbol.includes('-') ? symbol.replace('-', '.') : symbol;
        const fhQuote = await finnhubProvider.getQuote(finnhubSymbol);
        if (fhQuote) {
          return this.normalizeQuote(fhQuote, symbol);
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
    
    // Fallback: fetch individually (using Finnhub if available)
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
      await redisCacheService.del(cacheKey);
      console.log(`🗑️ Cleared cache for ${symbol}`);
    } else {
      // Clear all quote cache keys
      const keys = await redisCacheService.keys('quote:*');
      if (keys.length > 0) {
        await Promise.all(keys.map(key => redisCacheService.del(key)));
        console.log(`🗑️ Cleared ${keys.length} cached quotes`);
      }
    }
  }

  /**
   * Get cache statistics
   */
  /**
   * Get company profile with caching
   */
  async getProfile(symbol: string): Promise<any | null> {
    try {
      const upperSymbol = symbol.toUpperCase();
      const cacheKey = `profile:${upperSymbol}`;

      // Check cache first
      const cached = await redisCacheService.get<any>(cacheKey);
      if (cached) {
        console.log(`✅ Profile cache hit for ${upperSymbol}`);
        return cached;
      }

      // Cache miss - fetch from FMP API
      console.log(`📡 Profile cache miss for ${upperSymbol}, fetching from FMP`);
      const profile = await this.fetchProfileFromAPI(upperSymbol);

      // Cache the result if successful
      if (profile) {
        await redisCacheService.set(cacheKey, profile, TTL_PROFILE);
        console.log(`💾 Cached profile for ${upperSymbol} for ${TTL_PROFILE}s (24h)`);
      }

      return profile;
    } catch (error) {
      console.error(`❌ Error getting profile for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Fetch company profile from FMP API with circuit breaker
   */
  private async fetchProfileFromAPI(symbol: string): Promise<any | null> {
    try {
      if (!fmpProvider) {
        console.error('❌ FMP provider not initialized (missing API key)');
        return null;
      }

      const FMP_BASE_URL = 'https://financialmodelingprep.com';
      const url = `${FMP_BASE_URL}/api/v3/profile/${symbol}?apikey=${process.env.FMP_API_KEY}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      // Circuit breaker: Don't cache rate limit errors (HTTP 429)
      if (response.status === 429) {
        console.warn(`⚠️ Rate limit hit for ${symbol}, NOT caching (circuit breaker active)`);
        return null; // Don't cache rate limit errors
      }

      if (!response.ok) {
        console.error(`❌ FMP profile API failed for ${symbol}: ${response.status} ${response.statusText}`);
        return null;
      }

      const data = await response.json();

      // Circuit breaker: Check if response indicates rate limit error
      if (data && data.error && typeof data.error === 'string' && data.error.toLowerCase().includes('rate limit')) {
        console.warn(`⚠️ Rate limit error in response for ${symbol}, NOT caching`);
        return null;
      }

      // FMP returns an array for profile endpoint
      if (!Array.isArray(data) || data.length === 0) {
        console.error(`❌ No profile data found for ${symbol}`);
        return null;
      }

      return data[0]; // Return first profile object
    } catch (error) {
      console.error(`❌ Error fetching profile for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Cache historical data with 2-hour TTL
   */
  async cacheHistorical(symbol: string, data: any): Promise<void> {
    const key = `historical:${symbol.toUpperCase()}`;
    await redisCacheService.set(key, data, TTL_HISTORICAL);
  }

  /**
   * Cache financial data with 1-hour TTL
   */
  async cacheFinancials(symbol: string, data: any): Promise<void> {
    const key = `financials:${symbol.toUpperCase()}`;
    await redisCacheService.set(key, data, TTL_FINANCIALS);
  }

  /**
   * Cache company profile with 24-hour TTL
   */
  async cacheProfile(symbol: string, data: any): Promise<void> {
    const key = `profile:${symbol.toUpperCase()}`;
    await redisCacheService.set(key, data, TTL_PROFILE);
  }

  /**
   * Cache market status with 5-minute TTL
   */
  async cacheMarketStatus(data: any): Promise<void> {
    const key = 'market:status';
    await redisCacheService.set(key, data, TTL_MARKET_STATUS);
  }

  async getCacheStats(): Promise<{
    cacheSize: number;
    memoryUsage: string;
    ttl: number;
    hit: number;
    miss: number;
    bySymbol: { [symbol: string]: { hit: number; miss: number } };
  }> {
    const keys = await redisCacheService.keys('quote:*');
    const health = await redisCacheService.healthCheck();
    const bySymbol: { [k: string]: { hit: number; miss: number } } = {};
    for (const [sym, count] of hitCounters.bySymbol.entries()) {
      bySymbol[sym] = { hit: count, miss: 0 };
    }
    for (const [sym, count] of missCounters.bySymbol.entries()) {
      if (!bySymbol[sym]) bySymbol[sym] = { hit: 0, miss: count };
      else bySymbol[sym].miss = count;
    }
    
    return {
      cacheSize: keys.length,
      memoryUsage: health.memoryUsage ? `${(health.memoryUsage / 1024 / 1024).toFixed(2)}MB` : 'N/A',
      ttl: CACHE_TTL,
      hit: hitCounters.total,
      miss: missCounters.total,
      bySymbol,
    };
  }
}

// Export singleton instance
export const simpleCacheService = new SimpleCacheService();

// Export TTL constants for use in other modules
export const CacheTTL = {
  QUOTES: TTL_QUOTES,
  HISTORICAL: TTL_HISTORICAL,
  FINANCIALS: TTL_FINANCIALS,
  PROFILE: TTL_PROFILE,
  MARKET_STATUS: TTL_MARKET_STATUS,
  DEFAULT: TTL_DEFAULT
};
