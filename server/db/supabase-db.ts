import { createClient } from '@supabase/supabase-js';
import { Database, Tables, InsertPortfolio, InsertTransaction, InsertDividend, InsertCashTransaction, UpdatePortfolio, UpdateTransaction, UpdateHolding } from '../../shared/types/database';
import { env } from '../config/env';

// Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate configuration
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Supabase configuration missing!');
  console.error('Required environment variables:');
  console.error('  - SUPABASE_URL or VITE_SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  throw new Error('Supabase configuration is required');
}

// Create Supabase client with service role for backend operations
export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  },
  db: {
    schema: 'public'
  }
});

// Database operations wrapper
export const supabaseDb = {
  // Users
  users: {
    async findById(id: string) {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },

    async findByEmail(email: string) {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
      return data;
    },

    async create(userData: { email: string }) {
      const { data, error } = await supabaseAdmin
        .from('users')
        .insert(userData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },

    async update(id: string, updates: any) {
      const { data, error } = await supabaseAdmin
        .from('users')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    }
  },

  // Watchlists
  watchlists: {
    async findByUserId(userId: string) {
      const { data, error } = await supabaseAdmin
        .from('watchlists')
        .select(`
          *,
          watchlist_items (
            *
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },

    async findById(id: string) {
      const { data, error } = await supabaseAdmin
        .from('watchlists')
        .select(`
          *,
          watchlist_items (
            *
          )
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },

    async create(watchlistData: any) {
      const { data, error } = await supabaseAdmin
        .from('watchlists')
        .insert(watchlistData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },

    async update(id: string, updates: any) {
      const { data, error } = await supabaseAdmin
        .from('watchlists')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },

    async delete(id: string) {
      const { error } = await supabaseAdmin
        .from('watchlists')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    }
  },

  // Watchlist Items
  watchlistItems: {
    async create(itemData: any) {
      const { data, error } = await supabaseAdmin
        .from('watchlist_items')
        .insert(itemData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },

    async delete(id: string) {
      const { error } = await supabaseAdmin
        .from('watchlist_items')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    }
  },

  // Portfolios
  portfolios: {
    async findByUserId(userId: string): Promise<Tables<'portfolios'>[]> {
      const { data, error } = await supabaseAdmin
        .from('portfolios')
        .select(`
          *,
          transactions (*),
          holdings (*),
          dividends (*),
          cash_transactions (*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },

    async findById(id: string): Promise<Tables<'portfolios'> & {
      transactions: Tables<'transactions'>[];
      holdings: Tables<'holdings'>[];
      dividends: Tables<'dividends'>[];
      cash_transactions: Tables<'cash_transactions'>[];
      portfolio_performance: Tables<'portfolio_performance'>[];
    }> {
      const { data, error } = await supabaseAdmin
        .from('portfolios')
        .select(`
          *,
          transactions (*),
          holdings (*),
          dividends (*),
          cash_transactions (*),
          portfolio_performance (*)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },

    async findByIdWithSummary(id: string) {
      // Get portfolio with summary view for performance
      const { data, error } = await supabaseAdmin
        .from('portfolio_summary')
        .select('*')
        .eq('portfolio_id', id)
        .single();
      
      if (error) throw error;
      return data;
    },

    async create(portfolioData: InsertPortfolio): Promise<Tables<'portfolios'>> {
      const { data, error } = await supabaseAdmin
        .from('portfolios')
        .insert(portfolioData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },

    async update(id: string, updates: UpdatePortfolio): Promise<Tables<'portfolios'>> {
      const { data, error } = await supabaseAdmin
        .from('portfolios')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },

    async delete(id: string): Promise<void> {
      const { error } = await supabaseAdmin
        .from('portfolios')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },

    async getPerformanceHistory(portfolioId: string, days: number = 30) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const { data, error } = await supabaseAdmin
        .from('portfolio_performance')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },

    async refreshSummaryView(): Promise<void> {
      const { error } = await supabaseAdmin.rpc('refresh_portfolio_summary');
      if (error) throw error;
    }
  },

  // Transactions
  transactions: {
    async create(transactionData: InsertTransaction): Promise<Tables<'transactions'>> {
      const { data, error } = await supabaseAdmin
        .from('transactions')
        .insert(transactionData)
        .select()
        .single();
      
      if (error) throw error;

      // Update holdings after transaction (triggers handle this automatically)
      // But we can manually trigger if needed
      await supabaseAdmin.rpc('update_portfolio_holdings', {
        p_portfolio_id: transactionData.portfolio_id
      });

      return data;
    },

    async createBulk(transactions: InsertTransaction[]): Promise<Tables<'transactions'>[]> {
      // For CSV imports - insert multiple transactions
      const { data, error } = await supabaseAdmin
        .from('transactions')
        .insert(transactions)
        .select();
      
      if (error) throw error;

      // Update holdings for all affected portfolios
      const portfolioIds = [...new Set(transactions.map(t => t.portfolio_id))];
      for (const portfolioId of portfolioIds) {
        await supabaseAdmin.rpc('update_portfolio_holdings', {
          p_portfolio_id: portfolioId
        });
      }

      return data || [];
    },

    async findByPortfolioId(portfolioId: string): Promise<Tables<'transactions'>[]> {
      const { data, error } = await supabaseAdmin
        .from('transactions')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .order('date', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },

    async findBySymbol(portfolioId: string, symbol: string): Promise<Tables<'transactions'>[]> {
      const { data, error } = await supabaseAdmin
        .from('transactions')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .eq('symbol', symbol)
        .order('date', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },

    async update(id: string, updates: UpdateTransaction): Promise<Tables<'transactions'>> {
      const { data, error } = await supabaseAdmin
        .from('transactions')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;

      // Update holdings after transaction update
      if (data) {
        await supabaseAdmin.rpc('update_portfolio_holdings', {
          p_portfolio_id: data.portfolio_id
        });
      }

      return data;
    },

    async delete(id: string): Promise<void> {
      // Get portfolio_id before deletion
      const { data: transaction } = await supabaseAdmin
        .from('transactions')
        .select('portfolio_id')
        .eq('id', id)
        .single();

      const { error } = await supabaseAdmin
        .from('transactions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;

      // Update holdings after transaction deletion
      if (transaction) {
        await supabaseAdmin.rpc('update_portfolio_holdings', {
          p_portfolio_id: transaction.portfolio_id
        });
      }
    }
  },

  // Holdings
  holdings: {
    async findByPortfolioId(portfolioId: string): Promise<Tables<'holdings'>[]> {
      const { data, error } = await supabaseAdmin
        .from('holdings')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .order('symbol', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },

    async findBySymbol(portfolioId: string, symbol: string): Promise<Tables<'holdings'> | null> {
      const { data, error } = await supabaseAdmin
        .from('holdings')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .eq('symbol', symbol)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },

    async updateCurrentPrices(portfolioId: string, priceUpdates: { symbol: string; price: number }[]): Promise<void> {
      // Bulk update current prices for holdings
      for (const update of priceUpdates) {
        const { error } = await supabaseAdmin
          .from('holdings')
          .update({
            current_price: update.price,
            current_value: supabaseAdmin.sql`quantity * ${update.price}`,
            unrealized_pnl: supabaseAdmin.sql`(quantity * ${update.price}) - total_cost`,
            unrealized_pnl_percent: supabaseAdmin.sql`CASE WHEN total_cost > 0 THEN (((quantity * ${update.price}) - total_cost) / total_cost) * 100 ELSE 0 END`,
            last_updated: new Date().toISOString()
          })
          .eq('portfolio_id', portfolioId)
          .eq('symbol', update.symbol);

        if (error) {
          console.error(`Failed to update price for ${update.symbol}:`, error);
        }
      }
    },

    async recalculate(portfolioId: string): Promise<void> {
      // Trigger manual recalculation of holdings
      const { error } = await supabaseAdmin.rpc('update_portfolio_holdings', {
        p_portfolio_id: portfolioId
      });
      
      if (error) throw error;
    }
  },

  // Dividends
  dividends: {
    async create(dividendData: InsertDividend): Promise<Tables<'dividends'>> {
      const { data, error } = await supabaseAdmin
        .from('dividends')
        .insert(dividendData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },

    async findByPortfolioId(portfolioId: string): Promise<Tables<'dividends'>[]> {
      const { data, error } = await supabaseAdmin
        .from('dividends')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .order('payment_date', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },

    async findBySymbol(portfolioId: string, symbol: string): Promise<Tables<'dividends'>[]> {
      const { data, error } = await supabaseAdmin
        .from('dividends')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .eq('symbol', symbol)
        .order('payment_date', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },

    async getDividendSummary(portfolioId: string, year?: number) {
      let query = supabaseAdmin
        .from('dividends')
        .select('symbol, amount, payment_date')
        .eq('portfolio_id', portfolioId);

      if (year) {
        query = query.gte('payment_date', `${year}-01-01`)
                    .lt('payment_date', `${year + 1}-01-01`);
      }

      const { data, error } = await query.order('payment_date', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  },

  // Cash Transactions
  cashTransactions: {
    async create(cashData: InsertCashTransaction): Promise<Tables<'cash_transactions'>> {
      const { data, error } = await supabaseAdmin
        .from('cash_transactions')
        .insert(cashData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },

    async findByPortfolioId(portfolioId: string): Promise<Tables<'cash_transactions'>[]> {
      const { data, error } = await supabaseAdmin
        .from('cash_transactions')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .order('date', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },

    async getCashBalance(portfolioId: string): Promise<number> {
      const { data, error } = await supabaseAdmin
        .from('cash_transactions')
        .select('amount, type')
        .eq('portfolio_id', portfolioId);
      
      if (error) throw error;
      
      // Calculate balance: deposits and dividends add, withdrawals and fees subtract
      return (data || []).reduce((balance, transaction) => {
        const amount = transaction.amount;
        switch (transaction.type) {
          case 'deposit':
          case 'dividend':
            return balance + amount;
          case 'withdrawal':
          case 'fee':
            return balance - amount;
          default:
            return balance;
        }
      }, 0);
    }
  },

  // Portfolio Performance
  portfolioPerformance: {
    async create(performanceData: Database['public']['Tables']['portfolio_performance']['Insert']): Promise<Tables<'portfolio_performance'>> {
      const { data, error } = await supabaseAdmin
        .from('portfolio_performance')
        .insert(performanceData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },

    async findByPortfolioId(portfolioId: string, days: number = 30): Promise<Tables<'portfolio_performance'>[]> {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const { data, error } = await supabaseAdmin
        .from('portfolio_performance')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },

    async getLatest(portfolioId: string): Promise<Tables<'portfolio_performance'> | null> {
      const { data, error } = await supabaseAdmin
        .from('portfolio_performance')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .order('date', { ascending: false })
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },

    async createDailySnapshot(portfolioId: string): Promise<void> {
      // This would be called by a daily job to create performance snapshots
      const portfolio = await supabaseDb.portfolios.findById(portfolioId);
      const holdings = await supabaseDb.holdings.findByPortfolioId(portfolioId);
      const cashBalance = await supabaseDb.cashTransactions.getCashBalance(portfolioId);
      
      const totalValue = holdings.reduce((sum, holding) => {
        return sum + (holding.current_value || 0);
      }, 0) + cashBalance;
      
      const totalCost = holdings.reduce((sum, holding) => {
        return sum + holding.total_cost;
      }, 0);
      
      const totalPnl = totalValue - totalCost;
      const totalPnlPercent = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
      
      await this.create({
        portfolio_id: portfolioId,
        date: new Date().toISOString().split('T')[0],
        total_value: totalValue,
        total_cost: totalCost,
        cash_balance: cashBalance,
        total_pnl: totalPnl,
        total_pnl_percent: totalPnlPercent,
        daily_pnl: null, // Would need previous day's value to calculate
        daily_pnl_percent: null
      });
    }
  },

  // Transcripts
  transcripts: {
    async findByTicker(ticker: string) {
      const { data, error } = await supabaseAdmin
        .from('transcripts')
        .select('*')
        .eq('ticker', ticker)
        .eq('status', 'published')
        .order('year', { ascending: false })
        .order('quarter', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },

    async findById(id: string) {
      const { data, error } = await supabaseAdmin
        .from('transcripts')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      // Increment view count
      await supabaseAdmin.rpc('increment_transcript_view_count', {
        transcript_id: id
      });

      return data;
    },

    async findLatest(limit: number = 10) {
      const { data, error } = await supabaseAdmin
        .from('transcripts')
        .select('*')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data || [];
    },

    async create(transcriptData: any) {
      const { data, error } = await supabaseAdmin
        .from('transcripts')
        .insert(transcriptData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },

    async update(id: string, updates: any) {
      const { data, error } = await supabaseAdmin
        .from('transcripts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },

    async publish(id: string, publisherId: string) {
      const { error } = await supabaseAdmin.rpc('publish_transcript', {
        transcript_id: id,
        publisher_id: publisherId
      });
      
      if (error) throw error;
    }
  },

  // Cache
  cache: {
    async get(key: string) {
      const { data, error } = await supabaseAdmin
        .from('cache')
        .select('*')
        .eq('key', key)
        .gte('expires_at', new Date().toISOString())
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data?.value;
    },

    async set(key: string, value: any, expiresInSeconds: number = 300, tags: string[] = []) {
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + expiresInSeconds);

      const { error } = await supabaseAdmin
        .from('cache')
        .upsert({
          key,
          value,
          expires_at: expiresAt.toISOString(),
          tags
        });
      
      if (error) throw error;
    },

    async invalidate(key: string) {
      const { error } = await supabaseAdmin
        .from('cache')
        .delete()
        .eq('key', key);
      
      if (error) throw error;
    },

    async invalidateByTags(tags: string[]) {
      const { error } = await supabaseAdmin
        .from('cache')
        .delete()
        .contains('tags', tags);
      
      if (error) throw error;
    },

    async cleanup() {
      await supabaseAdmin.rpc('clean_expired_cache');
    }
  },

  // Sessions
  sessions: {
    async create(sessionData: any) {
      const { data, error } = await supabaseAdmin
        .from('user_sessions')
        .insert(sessionData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },

    async findByToken(token: string) {
      const { data, error } = await supabaseAdmin
        .from('user_sessions')
        .select('*')
        .eq('session_token', token)
        .eq('active', true)
        .gte('expires_at', new Date().toISOString())
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },

    async updateActivity(id: string) {
      const { error } = await supabaseAdmin
        .from('user_sessions')
        .update({ last_activity: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
    },

    async invalidate(id: string) {
      const { error } = await supabaseAdmin
        .from('user_sessions')
        .update({ active: false })
        .eq('id', id);
      
      if (error) throw error;
    },

    async cleanup() {
      await supabaseAdmin.rpc('clean_expired_sessions');
    }
  },

  // API Usage
  apiUsage: {
    async log(logData: any) {
      const { error } = await supabaseAdmin
        .from('api_usage_logs')
        .insert(logData);
      
      if (error) throw error;
    },

    async getUsage(userId: string, hoursAgo: number = 1) {
      const since = new Date();
      since.setHours(since.getHours() - hoursAgo);

      const { data, error } = await supabaseAdmin
        .from('api_usage_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('timestamp', since.toISOString());
      
      if (error) throw error;
      return data || [];
    }
  },

  // Stocks
  stocks: {
    async findBySymbol(symbol: string) {
      const { data, error } = await supabaseAdmin
        .from('stocks')
        .select('*')
        .eq('symbol', symbol)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },

    async upsert(stockData: any) {
      const { data, error } = await supabaseAdmin
        .from('stocks')
        .upsert(stockData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },

    async search(query: string, limit: number = 10) {
      const { data, error } = await supabaseAdmin
        .from('stocks')
        .select('*')
        .or(`symbol.ilike.${query}%,name.ilike.%${query}%`)
        .limit(limit);
      
      if (error) throw error;
      return data || [];
    }
  },

  // Health check
  async healthCheck() {
    try {
      const { error } = await supabaseAdmin.from('users').select('id').limit(1);
      return !error;
    } catch {
      return false;
    }
  }
};

// Export for backward compatibility
export default supabaseDb;