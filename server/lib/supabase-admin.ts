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
  InsertWatchlist,
  InsertWatchlistItem,
  InsertPortfolio,
  InsertTransaction,
  InsertDividend,
  InsertCashTransaction,
  UpdateWatchlist,
  UpdatePortfolio,
  UpdateTransaction,
  UpdateHolding,
  UpdateSubscription
} from '../../shared/types/database';

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Validate required environment variables
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in environment variables');
}

// Create admin client with service role key (bypasses RLS)
export const supabaseAdmin = createClient<Database>(
  supabaseUrl || '',
  supabaseServiceKey || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  }
);

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
  }
};

// Helper functions
export const helpers = {
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
};

// Export types for use in other modules
export type { Database, User, Watchlist, WatchlistItem, Portfolio, Transaction, Holding, Dividend, Subscription };