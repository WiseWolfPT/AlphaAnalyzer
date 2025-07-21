// Supabase Cache Service - Professional caching with PostgreSQL
import { supabaseAdmin } from '../db/supabase-client.js';
import { fiscalAI } from './fiscal-ai-service.js';

interface StockQuote {
  symbol: string;
  name?: string;
  price: number;
  change: number;
  change_percent: number;
  volume?: number;
  market_cap?: string;
  pe_ratio?: number;
  eps?: number;
  sector?: string;
  industry?: string;
  logo_url?: string;
  source?: string;
}

export class SupabaseCacheService {
  // Get cached stock quote
  static async getCachedQuote(symbol: string): Promise<StockQuote | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('stock_quotes_cache')
        .select('*')
        .eq('symbol', symbol.toUpperCase())
        .single();

      if (error || !data) return null;

      // Check if data is fresh (less than 1 minute old)
      const updatedAt = new Date(data.updated_at);
      const now = new Date();
      const diffMinutes = (now.getTime() - updatedAt.getTime()) / 1000 / 60;

      if (diffMinutes > 1) {
        // Data is stale
        return null;
      }

      return {
        symbol: data.symbol,
        name: data.name || undefined,
        price: Number(data.price),
        change: Number(data.change),
        change_percent: Number(data.change_percent),
        volume: data.volume || undefined,
        market_cap: data.market_cap || undefined,
        pe_ratio: data.pe_ratio ? Number(data.pe_ratio) : undefined,
        eps: data.eps ? Number(data.eps) : undefined,
        sector: data.sector || undefined,
        industry: data.industry || undefined,
        logo_url: data.logo_url || undefined,
        source: 'cache'
      };
    } catch (error) {
      console.error('Error getting cached quote:', error);
      return null;
    }
  }

  // Save stock quote to cache
  static async saveQuoteToCache(quote: StockQuote): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('stock_quotes_cache')
        .upsert({
          symbol: quote.symbol.toUpperCase(),
          name: quote.name,
          price: quote.price,
          change: quote.change,
          change_percent: quote.change_percent,
          volume: quote.volume,
          market_cap: quote.market_cap,
          pe_ratio: quote.pe_ratio,
          eps: quote.eps,
          sector: quote.sector,
          industry: quote.industry,
          logo_url: quote.logo_url,
          source: quote.source || 'api',
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error saving to cache:', error);
      }
    } catch (error) {
      console.error('Error in saveQuoteToCache:', error);
    }
  }

  // Get multiple cached quotes
  static async getCachedQuotes(symbols: string[]): Promise<Record<string, StockQuote>> {
    try {
      const { data, error } = await supabaseAdmin
        .from('stock_quotes_cache')
        .select('*')
        .in('symbol', symbols.map(s => s.toUpperCase()))
        .gte('updated_at', new Date(Date.now() - 60000).toISOString()); // 1 minute

      if (error) {
        console.error('Error getting cached quotes:', error);
        return {};
      }

      const result: Record<string, StockQuote> = {};
      
      data?.forEach(item => {
        result[item.symbol] = {
          symbol: item.symbol,
          name: item.name || undefined,
          price: Number(item.price),
          change: Number(item.change),
          change_percent: Number(item.change_percent),
          volume: item.volume || undefined,
          market_cap: item.market_cap || undefined,
          pe_ratio: item.pe_ratio ? Number(item.pe_ratio) : undefined,
          eps: item.eps ? Number(item.eps) : undefined,
          sector: item.sector || undefined,
          industry: item.industry || undefined,
          logo_url: item.logo_url || undefined,
          source: 'cache'
        };
      });

      return result;
    } catch (error) {
      console.error('Error getting cached quotes:', error);
      return {};
    }
  }

  // Save financial data to cache
  static async saveFinancialData(
    symbol: string, 
    type: 'income_statement' | 'balance_sheet' | 'cash_flow',
    period: 'quarterly' | 'annual',
    data: any,
    fiscalDate?: string
  ): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('financial_data_cache')
        .upsert({
          symbol: symbol.toUpperCase(),
          statement_type: type,
          period,
          data,
          fiscal_date: fiscalDate,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error saving financial data:', error);
      }
    } catch (error) {
      console.error('Error in saveFinancialData:', error);
    }
  }

  // Get cached financial data
  static async getCachedFinancialData(
    symbol: string,
    type: 'income_statement' | 'balance_sheet' | 'cash_flow',
    period: 'quarterly' | 'annual' = 'quarterly'
  ): Promise<any | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('financial_data_cache')
        .select('*')
        .eq('symbol', symbol.toUpperCase())
        .eq('statement_type', type)
        .eq('period', period)
        .order('fiscal_date', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) return null;

      // Check if data is fresh (less than 6 hours old)
      const updatedAt = new Date(data.updated_at);
      const now = new Date();
      const diffHours = (now.getTime() - updatedAt.getTime()) / 1000 / 60 / 60;

      if (diffHours > 6) {
        return null;
      }

      return data.data;
    } catch (error) {
      console.error('Error getting cached financial data:', error);
      return null;
    }
  }

  // Track API usage
  static async trackAPIUsage(
    provider: string,
    endpoint: string,
    symbol: string | null,
    responseTime: number,
    statusCode: number,
    errorMessage?: string,
    cost?: number
  ): Promise<void> {
    try {
      await supabaseAdmin
        .from('api_usage_log')
        .insert({
          provider,
          endpoint,
          symbol,
          response_time: responseTime,
          status_code: statusCode,
          error_message: errorMessage,
          cost: cost || 0
        });
    } catch (error) {
      console.error('Error tracking API usage:', error);
    }
  }

  // Get market indices
  static async getMarketIndices(): Promise<any[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('market_indices_cache')
        .select('*')
        .gte('updated_at', new Date(Date.now() - 300000).toISOString()); // 5 minutes

      if (error) {
        console.error('Error getting market indices:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getMarketIndices:', error);
      return [];
    }
  }

  // Save market index
  static async saveMarketIndex(
    symbol: string,
    name: string,
    value: number,
    change: number,
    changePercent: number
  ): Promise<void> {
    try {
      await supabaseAdmin
        .from('market_indices_cache')
        .upsert({
          symbol,
          name,
          value,
          change,
          change_percent: changePercent,
          updated_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error saving market index:', error);
    }
  }
}

// Real-time subscription for live updates
export function subscribeToStockUpdates(
  symbols: string[], 
  callback: (quote: StockQuote) => void
) {
  const channel = supabaseAdmin
    .channel('stock-updates')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'stock_quotes_cache',
        filter: `symbol=in.(${symbols.join(',')})`
      },
      (payload) => {
        if (payload.new) {
          const data = payload.new as any;
          callback({
            symbol: data.symbol,
            name: data.name,
            price: Number(data.price),
            change: Number(data.change),
            change_percent: Number(data.change_percent),
            volume: data.volume,
            market_cap: data.market_cap,
            source: 'realtime'
          });
        }
      }
    )
    .subscribe();

  return () => {
    supabaseAdmin.removeChannel(channel);
  };
}