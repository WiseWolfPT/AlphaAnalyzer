/**
 * Polygon.io Provider for UnifiedAPIService
 * Free tier: 5 calls/minute
 * Excellent data quality for US stocks
 */

import { 
  IMarketDataProvider, 
  PriceData, 
  Fundamentals, 
  HistoricalData, 
  CompanyInfo,
  NewsData,
  TimeRange,
  ProviderCapabilities 
} from '../provider.interface';
import { PolygonService } from '../../polygon-service';
import { DataType } from '../../quota/quota-limits';

export class PolygonProvider implements IMarketDataProvider {
  public readonly name = 'polygon' as const;
  public readonly capabilities: ProviderCapabilities = {
    realtime: false,      // Delayed quotes on free tier
    historical: true,
    fundamentals: false,  // Basic info only on free tier
    news: false,         // Not implemented yet
    batchRequests: false,
    rateLimits: {
      daily: 5,          // Free tier: 5 calls/minute (very conservative)
      monthly: 150       // ~5 calls/day for 30 days
    }
  };

  private polygonService: PolygonService;

  constructor() {
    this.polygonService = new PolygonService();
  }

  async initialize(): Promise<void> {
    const healthCheck = await this.polygonService.healthCheck();
    if (healthCheck.status === 'error') {
      console.warn('[PolygonProvider] Health check failed during initialization');
    } else {
      console.log(`[PolygonProvider] Initialized successfully (${healthCheck.apiKey})`);
    }
  }

  canHandle(dataType: DataType): boolean {
    switch (dataType) {
      case 'price':
        return true;
      case 'historical':
        return true;
      case 'fundamentals':
        return false; // Basic only
      case 'companyInfo':
        return false; // Basic only
      case 'news':
        return false; // Not implemented
      default:
        return false;
    }
  }

  async getPrice(symbol: string): Promise<PriceData> {
    try {
      console.log(`[PolygonProvider] Getting price for ${symbol}`);
      
      const quote = await this.polygonService.getQuote(symbol);
      
      if (!quote) {
        throw new Error(`No price data available for ${symbol}`);
      }

      return {
        symbol: symbol.toUpperCase(),
        price: quote.price,
        change: quote.change || 0,
        changePercent: quote.changePercent || 0,
        volume: quote.volume || 0,
        marketCap: quote.marketCap,
        timestamp: Date.now(),
        source: this.name,
        currency: 'USD'
      };
    } catch (error: any) {
      console.error(`[PolygonProvider] Error getting price for ${symbol}:`, error.message);
      throw new Error(`Failed to get price from Polygon: ${error.message}`);
    }
  }

  async getHistorical(symbol: string, range: TimeRange): Promise<HistoricalData> {
    try {
      console.log(`[PolygonProvider] Getting historical data for ${symbol} (${range})`);
      
      // Convert TimeRange to date range
      const { from, to, timespan, limit } = this.convertTimeRange(range);
      
      const aggregates = await this.polygonService.getAggregates(
        symbol, 
        from, 
        to, 
        timespan,
        limit
      );
      
      if (!aggregates || aggregates.length === 0) {
        throw new Error(`No historical data available for ${symbol}`);
      }

      const data = aggregates.map(agg => ({
        timestamp: agg.timestamp,
        open: agg.open,
        high: agg.high,
        low: agg.low,
        close: agg.close,
        volume: agg.volume
      }));

      return {
        symbol: symbol.toUpperCase(),
        data,
        period: range,
        source: this.name
      };
    } catch (error: any) {
      console.error(`[PolygonProvider] Error getting historical data for ${symbol}:`, error.message);
      throw new Error(`Failed to get historical data from Polygon: ${error.message}`);
    }
  }

  async getFundamentals(symbol: string): Promise<Fundamentals> {
    try {
      console.log(`[PolygonProvider] Getting fundamentals for ${symbol}`);
      
      const details = await this.polygonService.getCompanyDetails(symbol);
      
      if (!details) {
        throw new Error(`No fundamental data available for ${symbol}`);
      }

      return {
        symbol: symbol.toUpperCase(),
        pe: details.pe,
        eps: details.eps,
        revenue: details.revenue,
        marketCap: details.marketCap,
        sharesOutstanding: details.sharesOutstanding,
        bookValue: details.bookValue,
        source: this.name,
        lastUpdated: Date.now()
      };
    } catch (error: any) {
      console.error(`[PolygonProvider] Error getting fundamentals for ${symbol}:`, error.message);
      throw new Error(`Failed to get fundamentals from Polygon: ${error.message}`);
    }
  }

  async getCompanyInfo(symbol: string): Promise<CompanyInfo> {
    try {
      console.log(`[PolygonProvider] Getting company info for ${symbol}`);
      
      const details = await this.polygonService.getCompanyDetails(symbol);
      
      if (!details) {
        throw new Error(`No company info available for ${symbol}`);
      }

      return {
        symbol: symbol.toUpperCase(),
        name: symbol, // Polygon doesn't provide company name in free tier
        sector: 'Unknown',
        industry: 'Unknown',
        marketCap: details.marketCap,
        description: `Company information for ${symbol}`,
        employees: undefined,
        website: undefined,
        source: this.name
      };
    } catch (error: any) {
      console.error(`[PolygonProvider] Error getting company info for ${symbol}:`, error.message);
      throw new Error(`Failed to get company info from Polygon: ${error.message}`);
    }
  }

  async getNews(symbol: string, limit = 10): Promise<NewsData> {
    // News not implemented yet for Polygon
    throw new Error('News not supported by Polygon provider');
  }

  async isHealthy(): Promise<boolean> {
    try {
      const healthCheck = await this.polygonService.healthCheck();
      return healthCheck.status === 'healthy';
    } catch (error) {
      console.error('[PolygonProvider] Health check failed:', error);
      return false;
    }
  }

  private convertTimeRange(range: TimeRange): {
    from: string;
    to: string;
    timespan: 'minute' | 'hour' | 'day' | 'week' | 'month';
    limit: number;
  } {
    const now = new Date();
    const to = now.toISOString().split('T')[0];
    let from: string;
    let timespan: 'minute' | 'hour' | 'day' | 'week' | 'month' = 'day';
    let limit = 50;

    switch (range) {
      case '1D':
        from = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        timespan = 'minute';
        limit = 100;
        break;
      case '1W':
        from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        timespan = 'hour';
        limit = 100;
        break;
      case '1M':
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        timespan = 'day';
        limit = 30;
        break;
      case '3M':
        from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        timespan = 'day';
        limit = 90;
        break;
      case '6M':
        from = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        timespan = 'day';
        limit = 180;
        break;
      case '1Y':
        from = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        timespan = 'week';
        limit = 52;
        break;
      case '5Y':
        from = new Date(now.getTime() - 5 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        timespan = 'month';
        limit = 60;
        break;
      default:
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
    }

    return { from, to, timespan, limit };
  }
}