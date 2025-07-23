import { createClient } from '@supabase/supabase-js';
import { Logger } from '../structured-logger';
import { AlphaVantageService } from '../alpha-vantage-service';
import { FinnhubService } from '../finnhub-service';
import { PolygonService } from '../polygon-service';
import { YahooFinanceService } from '../yahoo-finance-service';

const logger = new Logger('PriceUpdateWorker');

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// API Services
const apiServices = {
  alpha_vantage: new AlphaVantageService(),
  finnhub: new FinnhubService(),
  polygon: new PolygonService(),
  yahoo_finance: new YahooFinanceService()
};

interface PriceData {
  symbol: string;
  price: number;
  change?: number;
  changePercent?: number;
  volume?: number;
  marketCap?: number;
  timestamp?: Date;
}

export class PriceUpdateWorker {
  private isRunning = false;
  private updateInterval: NodeJS.Timeout | null = null;
  private readonly UPDATE_INTERVAL = 60000; // 1 minute
  private readonly BATCH_SIZE = 10; // Process 10 symbols at a time

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Price update worker is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting price update worker');

    // Run immediately on start
    await this.updatePrices();

    // Then run every minute
    this.updateInterval = setInterval(async () => {
      await this.updatePrices();
    }, this.UPDATE_INTERVAL);
  }

  async stop(): Promise<void> {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.isRunning = false;
    logger.info('Stopped price update worker');
  }

  private async updatePrices(): Promise<void> {
    try {
      const startTime = Date.now();
      logger.info('Starting price update cycle');

      // Get symbols that need updating
      const symbolsToUpdate = await this.getSymbolsToUpdate();
      
      if (symbolsToUpdate.length === 0) {
        logger.info('No symbols need updating');
        return;
      }

      logger.info(`Updating ${symbolsToUpdate.length} symbols`);

      // Process in batches
      for (let i = 0; i < symbolsToUpdate.length; i += this.BATCH_SIZE) {
        const batch = symbolsToUpdate.slice(i, i + this.BATCH_SIZE);
        await this.updateBatch(batch);
      }

      const duration = Date.now() - startTime;
      logger.info(`Price update cycle completed in ${duration}ms`);

      // Update cache statistics
      await this.updateCacheStats();
    } catch (error) {
      logger.error('Error in price update cycle', error);
    }
  }

  private async getSymbolsToUpdate(): Promise<string[]> {
    try {
      // Get all active assets that are stale (older than 1 minute)
      const { data, error } = await supabase
        .from('latest_asset_prices')
        .select('symbol')
        .or('age_seconds.gt.60,age_seconds.is.null')
        .order('age_seconds', { ascending: false, nullsFirst: true })
        .limit(50); // Limit to 50 symbols per cycle

      if (error) {
        logger.error('Error fetching symbols to update', error);
        return [];
      }

      return data?.map(d => d.symbol) || [];
    } catch (error) {
      logger.error('Error in getSymbolsToUpdate', error);
      return [];
    }
  }

  private async updateBatch(symbols: string[]): Promise<void> {
    // Get next available API provider
    const provider = await this.getNextProvider();
    if (!provider) {
      logger.error('No available API provider');
      return;
    }

    logger.info(`Using provider: ${provider.provider_name} for batch: ${symbols.join(',')}`);

    try {
      const prices = await this.fetchPricesFromProvider(provider.provider_name, symbols);
      
      // Update each price in the database
      for (const priceData of prices) {
        await this.updatePrice(priceData, provider.provider_name);
      }

      // Log successful API call
      await this.logApiCall(provider.provider_name, symbols, 200, Date.now());
    } catch (error: any) {
      logger.error(`Error fetching prices from ${provider.provider_name}`, error);
      
      // Log failed API call
      await this.logApiCall(provider.provider_name, symbols, error.status || 500, Date.now(), error.message);
      
      // Try next provider
      await this.updateBatchWithFallback(symbols, provider.provider_name);
    }
  }

  private async updateBatchWithFallback(symbols: string[], failedProvider: string): Promise<void> {
    const provider = await this.getNextProvider(failedProvider);
    if (!provider) {
      logger.error('No fallback provider available');
      return;
    }

    logger.info(`Fallback to provider: ${provider.provider_name}`);
    await this.updateBatch(symbols);
  }

  private async getNextProvider(excludeProvider?: string): Promise<any> {
    const { data, error } = await supabase
      .rpc('get_next_api_provider');

    if (error || !data || data.length === 0) {
      return null;
    }

    // If we need to exclude a provider, filter it out
    if (excludeProvider) {
      const filtered = data.filter((p: any) => p.provider_name !== excludeProvider);
      return filtered[0] || null;
    }

    return data[0];
  }

  private async fetchPricesFromProvider(provider: string, symbols: string[]): Promise<PriceData[]> {
    const service = apiServices[provider as keyof typeof apiServices];
    if (!service) {
      throw new Error(`Unknown provider: ${provider}`);
    }

    const prices: PriceData[] = [];

    // Different providers have different batch capabilities
    switch (provider) {
      case 'alpha_vantage':
        // Alpha Vantage: One symbol at a time due to rate limits
        for (const symbol of symbols) {
          const quote = await service.getQuote(symbol);
          prices.push({
            symbol,
            price: quote.price,
            change: quote.change,
            changePercent: quote.changePercent,
            volume: quote.volume
          });
          // Wait 12 seconds between calls (5 per minute limit)
          if (symbols.indexOf(symbol) < symbols.length - 1) {
            await this.sleep(12000);
          }
        }
        break;

      case 'finnhub':
        // Finnhub: Can fetch multiple quotes
        for (const symbol of symbols) {
          const quote = await service.getQuote(symbol);
          prices.push({
            symbol,
            price: quote.c, // current price
            change: quote.d, // change
            changePercent: quote.dp, // change percent
            volume: quote.v // volume
          });
        }
        break;

      case 'polygon':
        // Polygon: Batch quotes available
        const polygonData = await service.getBatchQuotes(symbols);
        for (const quote of polygonData) {
          prices.push({
            symbol: quote.symbol,
            price: quote.price,
            change: quote.change,
            changePercent: quote.changePercent,
            volume: quote.volume
          });
        }
        break;

      case 'yahoo_finance':
        // Yahoo Finance: Unofficial but reliable
        const yahooData = await service.getBatchQuotes(symbols);
        for (const quote of yahooData) {
          prices.push({
            symbol: quote.symbol,
            price: quote.regularMarketPrice,
            change: quote.regularMarketChange,
            changePercent: quote.regularMarketChangePercent,
            volume: quote.regularMarketVolume,
            marketCap: quote.marketCap
          });
        }
        break;

      default:
        throw new Error(`Provider ${provider} not implemented`);
    }

    return prices;
  }

  private async updatePrice(priceData: PriceData, provider: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('update_asset_price', {
        p_symbol: priceData.symbol,
        p_price: priceData.price,
        p_change: priceData.change,
        p_change_percent: priceData.changePercent,
        p_volume: priceData.volume,
        p_market_cap: priceData.marketCap,
        p_provider: provider,
        p_metadata: {
          timestamp: priceData.timestamp || new Date().toISOString(),
          source: 'price_update_worker'
        }
      });

      if (error) {
        logger.error(`Error updating price for ${priceData.symbol}`, error);
      } else {
        logger.debug(`Updated price for ${priceData.symbol}: $${priceData.price}`);
      }
    } catch (error) {
      logger.error(`Error in updatePrice for ${priceData.symbol}`, error);
    }
  }

  private async logApiCall(
    provider: string, 
    symbols: string[], 
    status: number, 
    responseTime: number,
    errorMessage?: string
  ): Promise<void> {
    try {
      await supabase.rpc('log_api_call', {
        p_provider: provider,
        p_endpoint: '/quotes',
        p_symbols: symbols,
        p_response_status: status,
        p_response_time: responseTime,
        p_error_message: errorMessage
      });
    } catch (error) {
      logger.error('Error logging API call', error);
    }
  }

  private async updateCacheStats(): Promise<void> {
    try {
      const { data } = await supabase.rpc('get_cache_statistics');
      if (data) {
        logger.info('Cache statistics', data);
      }
    } catch (error) {
      logger.error('Error updating cache stats', error);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const priceUpdateWorker = new PriceUpdateWorker();

// Start worker if running as main module
if (require.main === module) {
  priceUpdateWorker.start().catch(error => {
    logger.error('Failed to start price update worker', error);
    process.exit(1);
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down gracefully');
    await priceUpdateWorker.stop();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down gracefully');
    await priceUpdateWorker.stop();
    process.exit(0);
  });
}