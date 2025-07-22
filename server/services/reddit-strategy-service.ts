// Reddit Strategy Service - Backend fetches from APIs and caches in Supabase
// Frontend only calls our backend, never external APIs directly
import { SupabaseCacheService } from './supabase-cache-service';
import { alphaVantageService } from './alpha-vantage-service';
import { finnhubService } from './finnhub-service';

interface StockQuote {
  symbol: string;
  name?: string;
  price: number;
  change: number;
  change_percent: number;
  volume?: number;
  market_cap?: number;
  pe_ratio?: number;
  eps?: number;
  sector?: string;
  high?: number;
  low?: number;
  open?: number;
  previousClose?: number;
  timestamp?: number;
}

export class RedditStrategyService {
  private static readonly CACHE_DURATION_MINUTES = 5; // 5 minutes cache
  private static readonly BATCH_SIZE = 5; // Process in smaller batches to avoid rate limits

  /**
   * Get batch quotes using Reddit strategy:
   * 1. Check Supabase cache first
   * 2. For missing quotes, fetch from APIs in the backend
   * 3. Store in Supabase for future requests
   * 4. Return all data to frontend
   */
  static async getBatchQuotes(symbols: string[]): Promise<{
    quotes: StockQuote[];
    errors: Record<string, string>;
    source: string;
  }> {
    console.log(`🚀 Reddit Strategy: Getting quotes for ${symbols.length} symbols`);
    
    // Step 1: Check cache for all symbols
    const cachedQuotes = await SupabaseCacheService.getCachedQuotes(symbols);
    const foundSymbols = Object.keys(cachedQuotes);
    const missingSymbols = symbols.filter(s => !foundSymbols.includes(s.toUpperCase()));
    
    console.log(`📦 Cache hit: ${foundSymbols.length}/${symbols.length} symbols`);
    
    const quotes: StockQuote[] = Object.values(cachedQuotes);
    const errors: Record<string, string> = {};
    
    // Step 2: Fetch missing symbols from APIs
    if (missingSymbols.length > 0) {
      console.log(`🔄 Fetching ${missingSymbols.length} missing symbols from APIs`);
      
      // Process in batches to avoid rate limits
      for (let i = 0; i < missingSymbols.length; i += this.BATCH_SIZE) {
        const batch = missingSymbols.slice(i, i + this.BATCH_SIZE);
        
        // Try different API providers with fallback
        const batchResults = await this.fetchBatchFromAPIs(batch);
        
        // Step 3: Save successful fetches to cache
        for (const quote of batchResults.quotes) {
          await SupabaseCacheService.saveQuoteToCache({
            symbol: quote.symbol,
            name: quote.name,
            price: quote.price,
            change: quote.change,
            change_percent: quote.change_percent,
            volume: quote.volume,
            market_cap: quote.market_cap,
            pe_ratio: quote.pe_ratio,
            eps: quote.eps,
            sector: quote.sector
          });
          quotes.push(quote);
        }
        
        // Merge errors
        Object.assign(errors, batchResults.errors);
        
        // Add small delay between batches to respect rate limits
        if (i + this.BATCH_SIZE < missingSymbols.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    return {
      quotes,
      errors,
      source: missingSymbols.length > 0 ? 'mixed' : 'cache'
    };
  }

  /**
   * Fetch batch of quotes from APIs with fallback strategy
   */
  private static async fetchBatchFromAPIs(symbols: string[]): Promise<{
    quotes: StockQuote[];
    errors: Record<string, string>;
  }> {
    const quotes: StockQuote[] = [];
    const errors: Record<string, string> = {};
    
    // Process each symbol individually using available APIs
    const remainingSymbols = symbols;
    
    for (const symbol of remainingSymbols) {
      try {
        // Try Alpha Vantage
        const avQuote = await alphaVantageService.getQuote(symbol);
        if (avQuote && avQuote.price > 0) {
          quotes.push({
            symbol: avQuote.symbol,
            name: `${avQuote.symbol} Corp`,
            price: avQuote.price,
            change: avQuote.change,
            change_percent: avQuote.changePercent,
            volume: avQuote.volume,
            high: avQuote.high,
            low: avQuote.low,
            open: avQuote.open,
            previousClose: avQuote.previousClose,
            timestamp: Date.now() / 1000
          });
          continue;
        }
      } catch (error: any) {
        console.warn(`Alpha Vantage failed for ${symbol}:`, error.message);
      }
      
      try {
        // Try Finnhub as fallback
        const finnhubQuote = await finnhubService.getQuote(symbol);
        if (finnhubQuote && finnhubQuote.c > 0) {
          quotes.push({
            symbol: symbol.toUpperCase(),
            name: `${symbol.toUpperCase()} Corp`,
            price: finnhubQuote.c,
            change: finnhubQuote.d || 0,
            change_percent: finnhubQuote.dp || 0,
            volume: 0, // Finnhub doesn't provide volume in quote
            high: finnhubQuote.h,
            low: finnhubQuote.l,
            open: finnhubQuote.o,
            previousClose: finnhubQuote.pc,
            timestamp: finnhubQuote.t
          });
          continue;
        }
      } catch (error: any) {
        console.warn(`Finnhub failed for ${symbol}:`, error.message);
      }
      
      // If all APIs fail, record error
      errors[symbol] = 'Unable to fetch quote from any provider';
    }
    
    return { quotes, errors };
  }

  /**
   * Get a single quote using the Reddit strategy
   */
  static async getQuote(symbol: string): Promise<StockQuote | null> {
    const result = await this.getBatchQuotes([symbol]);
    return result.quotes[0] || null;
  }

  /**
   * Refresh quotes for symbols (force API fetch)
   */
  static async refreshQuotes(symbols: string[]): Promise<{
    quotes: StockQuote[];
    errors: Record<string, string>;
  }> {
    console.log(`🔄 Force refresh for ${symbols.length} symbols`);
    
    // Clear cache for these symbols (by fetching fresh data)
    const result = await this.fetchBatchFromAPIs(symbols);
    
    // Save all successful quotes to cache
    for (const quote of result.quotes) {
      await SupabaseCacheService.saveQuoteToCache({
        symbol: quote.symbol,
        name: quote.name,
        price: quote.price,
        change: quote.change,
        change_percent: quote.change_percent,
        volume: quote.volume,
        market_cap: quote.market_cap,
        pe_ratio: quote.pe_ratio,
        eps: quote.eps,
        sector: quote.sector
      });
    }
    
    return result;
  }
}