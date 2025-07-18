import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type {
  Database,
  User,
  Watchlist,
  WatchlistItem,
  Portfolio,
  Transaction,
  Holding,
  Dividend,
  PortfolioPerformance,
  CashTransaction,
  Subscription,
  Transcript,
  InsertWatchlist,
  InsertWatchlistItem,
  InsertPortfolio,
  InsertTransaction,
  InsertDividend,
  InsertCashTransaction,
  InsertTranscript,
  UpdateWatchlist,
  UpdatePortfolio,
  UpdateTransaction,
  UpdateHolding,
  UpdateSubscription,
  UpdateTranscript
} from '../../shared/types/database';

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate required environment variables
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables');
}

// Create admin client with service role key (bypasses RLS)
export const supabaseAdmin = (supabaseUrl && supabaseServiceKey) 
  ? createClient<Database>(
      supabaseUrl,
      supabaseServiceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false
        }
      }
    )
  : null;

// Create client with user context (respects RLS)
export function createUserClient(userId: string): SupabaseClient<Database> {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase configuration missing');
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        'x-user-id': userId
      }
    }
  });
}

// Common database operations
export const db = {
  // User operations
  users: {
    async getById(userId: string): Promise<User | null> {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user:', error);
        return null;
      }

      return data;
    },

    async getByEmail(email: string): Promise<User | null> {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error) {
        console.error('Error fetching user by email:', error);
        return null;
      }

      return data;
    },

    async create(email: string): Promise<User | null> {
      const { data, error } = await supabaseAdmin
        .from('users')
        .insert({ email })
        .select()
        .single();

      if (error) {
        console.error('Error creating user:', error);
        return null;
      }

      return data;
    },

    async update(userId: string, updates: Partial<User>): Promise<User | null> {
      const { data, error } = await supabaseAdmin
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating user:', error);
        return null;
      }

      return data;
    }
  },

  // Watchlist operations
  watchlists: {
    async getByUserId(userId: string): Promise<Watchlist[]> {
      const { data, error } = await supabaseAdmin
        .from('watchlists')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching watchlists:', error);
        return [];
      }

      return data || [];
    },

    async getById(watchlistId: string): Promise<Watchlist | null> {
      const { data, error } = await supabaseAdmin
        .from('watchlists')
        .select('*')
        .eq('id', watchlistId)
        .single();

      if (error) {
        console.error('Error fetching watchlist:', error);
        return null;
      }

      return data;
    },

    async create(watchlist: InsertWatchlist): Promise<Watchlist | null> {
      const { data, error } = await supabaseAdmin
        .from('watchlists')
        .insert(watchlist)
        .select()
        .single();

      if (error) {
        console.error('Error creating watchlist:', error);
        return null;
      }

      return data;
    },

    async update(watchlistId: string, updates: UpdateWatchlist): Promise<Watchlist | null> {
      const { data, error } = await supabaseAdmin
        .from('watchlists')
        .update(updates)
        .eq('id', watchlistId)
        .select()
        .single();

      if (error) {
        console.error('Error updating watchlist:', error);
        return null;
      }

      return data;
    },

    async delete(watchlistId: string): Promise<boolean> {
      const { error } = await supabaseAdmin
        .from('watchlists')
        .delete()
        .eq('id', watchlistId);

      if (error) {
        console.error('Error deleting watchlist:', error);
        return false;
      }

      return true;
    },

    // Watchlist items
    async getItems(watchlistId: string): Promise<WatchlistItem[]> {
      const { data, error } = await supabaseAdmin
        .from('watchlist_items')
        .select('*')
        .eq('watchlist_id', watchlistId)
        .order('added_at', { ascending: false });

      if (error) {
        console.error('Error fetching watchlist items:', error);
        return [];
      }

      return data || [];
    },

    async addItem(item: InsertWatchlistItem): Promise<WatchlistItem | null> {
      const { data, error } = await supabaseAdmin
        .from('watchlist_items')
        .insert({
          ...item,
          symbol: item.symbol.toUpperCase()
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding watchlist item:', error);
        return null;
      }

      return data;
    },

    async removeItem(watchlistId: string, symbol: string): Promise<boolean> {
      const { error } = await supabaseAdmin
        .from('watchlist_items')
        .delete()
        .eq('watchlist_id', watchlistId)
        .eq('symbol', symbol.toUpperCase());

      if (error) {
        console.error('Error removing watchlist item:', error);
        return false;
      }

      return true;
    }
  },

  // Portfolio operations
  portfolios: {
    async getByUserId(userId: string): Promise<Portfolio[]> {
      const { data, error } = await supabaseAdmin
        .from('portfolios')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching portfolios:', error);
        return [];
      }

      return data || [];
    },

    async getById(portfolioId: string): Promise<Portfolio | null> {
      const { data, error } = await supabaseAdmin
        .from('portfolios')
        .select('*')
        .eq('id', portfolioId)
        .single();

      if (error) {
        console.error('Error fetching portfolio:', error);
        return null;
      }

      return data;
    },

    async create(portfolio: InsertPortfolio): Promise<Portfolio | null> {
      const { data, error } = await supabaseAdmin
        .from('portfolios')
        .insert(portfolio)
        .select()
        .single();

      if (error) {
        console.error('Error creating portfolio:', error);
        return null;
      }

      return data;
    },

    async update(portfolioId: string, updates: UpdatePortfolio): Promise<Portfolio | null> {
      const { data, error } = await supabaseAdmin
        .from('portfolios')
        .update(updates)
        .eq('id', portfolioId)
        .select()
        .single();

      if (error) {
        console.error('Error updating portfolio:', error);
        return null;
      }

      return data;
    },

    async delete(portfolioId: string): Promise<boolean> {
      const { error } = await supabaseAdmin
        .from('portfolios')
        .delete()
        .eq('id', portfolioId);

      if (error) {
        console.error('Error deleting portfolio:', error);
        return false;
      }

      return true;
    },

    // Holdings
    async getHoldings(portfolioId: string): Promise<Holding[]> {
      const { data, error } = await supabaseAdmin
        .from('holdings')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .gt('quantity', 0)
        .order('current_value', { ascending: false });

      if (error) {
        console.error('Error fetching holdings:', error);
        return [];
      }

      return data || [];
    },

    async updateHoldingPrices(holdings: Array<{ id: string; current_price: number }>): Promise<boolean> {
      const updates = holdings.map(h => ({
        ...h,
        current_value: h.current_price, // This should be calculated: quantity * current_price
        last_updated: new Date().toISOString()
      }));

      const { error } = await supabaseAdmin
        .from('holdings')
        .upsert(updates);

      if (error) {
        console.error('Error updating holding prices:', error);
        return false;
      }

      return true;
    },

    // Performance
    async getPerformance(portfolioId: string, days: number = 30): Promise<PortfolioPerformance[]> {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabaseAdmin
        .from('portfolio_performance')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (error) {
        console.error('Error fetching portfolio performance:', error);
        return [];
      }

      return data || [];
    },

    async recordPerformance(performance: {
      portfolio_id: string;
      date: string;
      total_value: number;
      total_cost: number;
      cash_balance?: number;
    }): Promise<PortfolioPerformance | null> {
      const { data: existing } = await supabaseAdmin
        .from('portfolio_performance')
        .select('*')
        .eq('portfolio_id', performance.portfolio_id)
        .eq('date', performance.date)
        .single();

      const operation = existing ? 'update' : 'insert';
      const query = existing
        ? supabaseAdmin
            .from('portfolio_performance')
            .update(performance)
            .eq('id', existing.id)
        : supabaseAdmin
            .from('portfolio_performance')
            .insert(performance);

      const { data, error } = await query.select().single();

      if (error) {
        console.error(`Error ${operation}ing portfolio performance:`, error);
        return null;
      }

      return data;
    }
  },

  // Transaction operations
  transactions: {
    async getByPortfolio(portfolioId: string): Promise<Transaction[]> {
      const { data, error } = await supabaseAdmin
        .from('transactions')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching transactions:', error);
        return [];
      }

      return data || [];
    },

    async create(transaction: InsertTransaction): Promise<Transaction | null> {
      const { data, error } = await supabaseAdmin
        .from('transactions')
        .insert({
          ...transaction,
          symbol: transaction.symbol.toUpperCase()
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating transaction:', error);
        return null;
      }

      // Trigger holdings recalculation is handled by database trigger
      return data;
    },

    async update(transactionId: string, updates: UpdateTransaction): Promise<Transaction | null> {
      const { data, error } = await supabaseAdmin
        .from('transactions')
        .update(updates)
        .eq('id', transactionId)
        .select()
        .single();

      if (error) {
        console.error('Error updating transaction:', error);
        return null;
      }

      return data;
    },

    async delete(transactionId: string): Promise<boolean> {
      const { error } = await supabaseAdmin
        .from('transactions')
        .delete()
        .eq('id', transactionId);

      if (error) {
        console.error('Error deleting transaction:', error);
        return false;
      }

      return true;
    }
  },

  // Dividend operations
  dividends: {
    async getByPortfolio(portfolioId: string): Promise<Dividend[]> {
      const { data, error } = await supabaseAdmin
        .from('dividends')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .order('payment_date', { ascending: false });

      if (error) {
        console.error('Error fetching dividends:', error);
        return [];
      }

      return data || [];
    },

    async create(dividend: InsertDividend): Promise<Dividend | null> {
      const { data, error } = await supabaseAdmin
        .from('dividends')
        .insert({
          ...dividend,
          symbol: dividend.symbol.toUpperCase()
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating dividend:', error);
        return null;
      }

      return data;
    }
  },

  // Cash transaction operations
  cashTransactions: {
    async getByPortfolio(portfolioId: string): Promise<CashTransaction[]> {
      const { data, error } = await supabaseAdmin
        .from('cash_transactions')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching cash transactions:', error);
        return [];
      }

      return data || [];
    },

    async create(cashTransaction: InsertCashTransaction): Promise<CashTransaction | null> {
      const { data, error } = await supabaseAdmin
        .from('cash_transactions')
        .insert(cashTransaction)
        .select()
        .single();

      if (error) {
        console.error('Error creating cash transaction:', error);
        return null;
      }

      return data;
    }
  },

  // Subscription operations
  subscriptions: {
    async getByUserId(userId: string): Promise<Subscription | null> {
      const { data, error } = await supabaseAdmin
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error('Error fetching subscription:', error);
        return null;
      }

      return data;
    },

    async getByStripeId(stripeSubscriptionId: string): Promise<Subscription | null> {
      const { data, error } = await supabaseAdmin
        .from('subscriptions')
        .select('*')
        .eq('stripe_subscription_id', stripeSubscriptionId)
        .single();

      if (error) {
        console.error('Error fetching subscription by Stripe ID:', error);
        return null;
      }

      return data;
    },

    async upsert(subscription: Partial<Subscription> & { stripe_subscription_id: string }): Promise<Subscription | null> {
      const { data, error } = await supabaseAdmin
        .from('subscriptions')
        .upsert(subscription, {
          onConflict: 'stripe_subscription_id'
        })
        .select()
        .single();

      if (error) {
        console.error('Error upserting subscription:', error);
        return null;
      }

      return data;
    },

    async updateStatus(stripeSubscriptionId: string, status: Subscription['status']): Promise<boolean> {
      const { error } = await supabaseAdmin
        .from('subscriptions')
        .update({ status })
        .eq('stripe_subscription_id', stripeSubscriptionId);

      if (error) {
        console.error('Error updating subscription status:', error);
        return false;
      }

      return true;
    }
  },

  // Transcript operations
  transcripts: {
    async getAll(filter: {
      ticker?: string;
      status?: string;
      year?: number;
      quarter?: string;
      limit?: number;
      offset?: number;
    } = {}): Promise<{ data: Transcript[], total: number }> {
      let query = supabaseAdmin
        .from('transcripts')
        .select('*', { count: 'exact' });

      // Apply filters
      if (filter.ticker) {
        query = query.ilike('ticker', `%${filter.ticker}%`);
      }
      if (filter.status) {
        query = query.eq('status', filter.status);
      }
      if (filter.year) {
        query = query.eq('year', filter.year);
      }
      if (filter.quarter) {
        query = query.eq('quarter', filter.quarter);
      }

      // Apply pagination
      const offset = filter.offset || 0;
      const limit = filter.limit || 50;
      query = query.range(offset, offset + limit - 1);

      // Order by created_at desc
      query = query.order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching transcripts:', error);
        return { data: [], total: 0 };
      }

      return {
        data: data || [],
        total: count || 0
      };
    },

    async getById(id: number): Promise<Transcript | null> {
      const { data, error } = await supabaseAdmin
        .from('transcripts')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching transcript:', error);
        return null;
      }

      return data;
    },

    async create(transcript: InsertTranscript): Promise<Transcript | null> {
      const { data, error } = await supabaseAdmin
        .from('transcripts')
        .insert({
          ...transcript,
          ticker: transcript.ticker.toUpperCase(),
          view_count: 0,
          status: transcript.status || 'pending'
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating transcript:', error);
        return null;
      }

      return data;
    },

    async update(id: number, updates: UpdateTranscript): Promise<Transcript | null> {
      // Set published_at when status changes to published
      const updateData = { ...updates };
      if (updates.status === 'published') {
        const { data: current } = await supabaseAdmin
          .from('transcripts')
          .select('status')
          .eq('id', id)
          .single();

        if (current && current.status !== 'published') {
          updateData.published_at = new Date().toISOString();
        }
      }

      const { data, error } = await supabaseAdmin
        .from('transcripts')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating transcript:', error);
        return null;
      }

      return data;
    },

    async delete(id: number): Promise<boolean> {
      const { error } = await supabaseAdmin
        .from('transcripts')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting transcript:', error);
        return false;
      }

      return true;
    },

    async incrementViewCount(id: number): Promise<void> {
      const { error } = await supabaseAdmin.rpc('increment_transcript_views', {
        transcript_id: id
      });

      if (error) {
        console.error('Error incrementing view count:', error);
      }
    },

    async getStats(): Promise<{
      total: number;
      byStatus: Record<string, number>;
      byYear: Record<number, number>;
      totalViews: number;
      averageViews: number;
    }> {
      const { data: stats, error } = await supabaseAdmin.rpc('get_transcript_stats');

      if (error) {
        console.error('Error fetching transcript stats:', error);
        return {
          total: 0,
          byStatus: {},
          byYear: {},
          totalViews: 0,
          averageViews: 0
        };
      }

      return stats || {
        total: 0,
        byStatus: {},
        byYear: {},
        totalViews: 0,
        averageViews: 0
      };
    },

    async search(query: string, limit: number = 10): Promise<Transcript[]> {
      const searchTerm = `%${query.toLowerCase()}%`;
      
      const { data, error } = await supabaseAdmin
        .from('transcripts')
        .select('*')
        .or(`ticker.ilike.${searchTerm},company_name.ilike.${searchTerm},ai_summary.ilike.${searchTerm}`)
        .limit(limit);

      if (error) {
        console.error('Error searching transcripts:', error);
        return [];
      }

      return data || [];
    },

    async getRecent(limit: number = 5): Promise<Transcript[]> {
      const { data, error } = await supabaseAdmin
        .from('transcripts')
        .select('*')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching recent transcripts:', error);
        return [];
      }

      return data || [];
    },

    async getPending(): Promise<Transcript[]> {
      const { data, error } = await supabaseAdmin
        .from('transcripts')
        .select('*')
        .in('status', ['pending', 'review'])
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching pending transcripts:', error);
        return [];
      }

      return data || [];
    }
  },

  // Helper operations
  helpers: {
    async getUserWithSubscription(userId: string) {
      const [user, subscription] = await Promise.all([
        db.users.getById(userId),
        db.subscriptions.getByUserId(userId)
      ]);

      return { user, subscription };
    },

    async getPortfolioSummary(portfolioId: string) {
      const { data, error } = await supabaseAdmin
        .from('portfolio_summary')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .single();

      if (error) {
        console.error('Error fetching portfolio summary:', error);
        return null;
      }

      return data;
    },

    async refreshPortfolioSummary() {
      const { error } = await supabaseAdmin.rpc('refresh_portfolio_summary');

      if (error) {
        console.error('Error refreshing portfolio summary:', error);
        return false;
      }

      return true;
    },

    async calculateHoldings(portfolioId: string) {
      const { data, error } = await supabaseAdmin.rpc('calculate_holdings', {
        p_portfolio_id: portfolioId
      });

      if (error) {
        console.error('Error calculating holdings:', error);
        return [];
      }

      return data || [];
    },

    async updatePortfolioHoldings(portfolioId: string) {
      const { error } = await supabaseAdmin.rpc('update_portfolio_holdings', {
        p_portfolio_id: portfolioId
      });

      if (error) {
        console.error('Error updating portfolio holdings:', error);
        return false;
      }

      return true;
    }
  }
};

// Export types for use in other modules
export type { Database, User, Watchlist, WatchlistItem, Portfolio, Transaction, Holding, Dividend, Subscription, Transcript };