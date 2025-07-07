import { createClient } from '@supabase/supabase-js';
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
  UpdateTransaction
} from '../../../shared/types/database';

// Supabase configuration - using environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}

// Create Supabase client
export const supabase = createClient<Database>(
  supabaseUrl || '',
  supabaseAnonKey || '',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: window.localStorage
    }
  }
);

// Auth helper functions
export const auth = {
  async signUp(email: string, password: string, metadata: { full_name?: string } = {}) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    });
    return { data, error };
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { data, error };
  },

  async signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
    return { data, error };
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  async resetPassword(email: string) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`
    });
    return { data, error };
  },

  async updatePassword(newPassword: string) {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    });
    return { data, error };
  },

  getCurrentUser() {
    return supabase.auth.getUser();
  },

  getSession() {
    return supabase.auth.getSession();
  },

  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }
};

// Database helper functions
export const db = {
  // User operations
  async getCurrentUser(): Promise<User | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (error) {
      console.error('Error fetching user:', error);
      return null;
    }
    
    return data;
  },

  // Watchlist operations
  async getUserWatchlists(userId: string): Promise<Watchlist[]> {
    const { data, error } = await supabase
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

  async getWatchlist(watchlistId: string): Promise<Watchlist | null> {
    const { data, error } = await supabase
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

  async createWatchlist(watchlist: InsertWatchlist): Promise<Watchlist | null> {
    const { data, error } = await supabase
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

  async updateWatchlist(watchlistId: string, updates: UpdateWatchlist): Promise<Watchlist | null> {
    const { data, error } = await supabase
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

  async deleteWatchlist(watchlistId: string): Promise<boolean> {
    const { error } = await supabase
      .from('watchlists')
      .delete()
      .eq('id', watchlistId);
    
    if (error) {
      console.error('Error deleting watchlist:', error);
      return false;
    }
    
    return true;
  },

  // Watchlist items operations
  async getWatchlistItems(watchlistId: string): Promise<WatchlistItem[]> {
    const { data, error } = await supabase
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

  async addWatchlistItem(item: InsertWatchlistItem): Promise<WatchlistItem | null> {
    const { data, error } = await supabase
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

  async removeWatchlistItem(watchlistId: string, symbol: string): Promise<boolean> {
    const { error } = await supabase
      .from('watchlist_items')
      .delete()
      .eq('watchlist_id', watchlistId)
      .eq('symbol', symbol.toUpperCase());
    
    if (error) {
      console.error('Error removing watchlist item:', error);
      return false;
    }
    
    return true;
  },

  // Portfolio operations
  async getUserPortfolios(userId: string): Promise<Portfolio[]> {
    const { data, error } = await supabase
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

  async getPortfolio(portfolioId: string): Promise<Portfolio | null> {
    const { data, error } = await supabase
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

  async createPortfolio(portfolio: InsertPortfolio): Promise<Portfolio | null> {
    const { data, error } = await supabase
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

  async updatePortfolio(portfolioId: string, updates: UpdatePortfolio): Promise<Portfolio | null> {
    const { data, error } = await supabase
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

  async deletePortfolio(portfolioId: string): Promise<boolean> {
    const { error } = await supabase
      .from('portfolios')
      .delete()
      .eq('id', portfolioId);
    
    if (error) {
      console.error('Error deleting portfolio:', error);
      return false;
    }
    
    return true;
  },

  // Holdings operations
  async getPortfolioHoldings(portfolioId: string): Promise<Holding[]> {
    const { data, error } = await supabase
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

  // Transaction operations
  async getPortfolioTransactions(portfolioId: string): Promise<Transaction[]> {
    const { data, error } = await supabase
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

  async createTransaction(transaction: InsertTransaction): Promise<Transaction | null> {
    const { data, error } = await supabase
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
    
    return data;
  },

  async updateTransaction(transactionId: string, updates: UpdateTransaction): Promise<Transaction | null> {
    const { data, error } = await supabase
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

  async deleteTransaction(transactionId: string): Promise<boolean> {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', transactionId);
    
    if (error) {
      console.error('Error deleting transaction:', error);
      return false;
    }
    
    return true;
  },

  // Dividend operations
  async getPortfolioDividends(portfolioId: string): Promise<Dividend[]> {
    const { data, error } = await supabase
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

  async createDividend(dividend: InsertDividend): Promise<Dividend | null> {
    const { data, error } = await supabase
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
  },

  // Cash transaction operations
  async getPortfolioCashTransactions(portfolioId: string): Promise<CashTransaction[]> {
    const { data, error } = await supabase
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

  async createCashTransaction(cashTransaction: InsertCashTransaction): Promise<CashTransaction | null> {
    const { data, error } = await supabase
      .from('cash_transactions')
      .insert(cashTransaction)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating cash transaction:', error);
      return null;
    }
    
    return data;
  },

  // Portfolio performance operations
  async getPortfolioPerformance(portfolioId: string, days: number = 30): Promise<PortfolioPerformance[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
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

  // Subscription operations
  async getUserSubscription(userId: string): Promise<Subscription | null> {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching subscription:', error);
      return null;
    }
    
    return data;
  },

  // Portfolio summary (materialized view)
  async getPortfolioSummary(portfolioId: string) {
    const { data, error } = await supabase
      .from('portfolio_summary')
      .select('*')
      .eq('portfolio_id', portfolioId)
      .single();
    
    if (error) {
      console.error('Error fetching portfolio summary:', error);
      return null;
    }
    
    return data;
  }
};

// Real-time subscriptions
export const realtime = {
  subscribeToWatchlists(userId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`watchlists:${userId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'watchlists',
          filter: `user_id=eq.${userId}`
        }, 
        callback
      )
      .subscribe();
  },

  subscribeToWatchlistItems(watchlistId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`watchlist_items:${watchlistId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'watchlist_items',
          filter: `watchlist_id=eq.${watchlistId}`
        }, 
        callback
      )
      .subscribe();
  },

  subscribeToPortfolios(userId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`portfolios:${userId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'portfolios',
          filter: `user_id=eq.${userId}`
        }, 
        callback
      )
      .subscribe();
  },

  subscribeToHoldings(portfolioId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`holdings:${portfolioId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'holdings',
          filter: `portfolio_id=eq.${portfolioId}`
        }, 
        callback
      )
      .subscribe();
  },

  subscribeToTransactions(portfolioId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`transactions:${portfolioId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'transactions',
          filter: `portfolio_id=eq.${portfolioId}`
        }, 
        callback
      )
      .subscribe();
  },

  unsubscribe(channel: any) {
    return supabase.removeChannel(channel);
  },

  unsubscribeAll() {
    return supabase.removeAllChannels();
  }
};

// Helper functions
export const helpers = {
  // Check if user has active subscription
  async hasActiveSubscription(userId: string): Promise<boolean> {
    const subscription = await db.getUserSubscription(userId);
    return subscription !== null && ['active', 'trialing'].includes(subscription.status);
  },

  // Get user's default watchlist
  async getDefaultWatchlist(userId: string): Promise<Watchlist | null> {
    const { data, error } = await supabase
      .from('watchlists')
      .select('*')
      .eq('user_id', userId)
      .eq('is_default', true)
      .single();
    
    if (error) {
      console.error('Error fetching default watchlist:', error);
      return null;
    }
    
    return data;
  },

  // Get user's default portfolio
  async getDefaultPortfolio(userId: string): Promise<Portfolio | null> {
    const { data, error } = await supabase
      .from('portfolios')
      .select('*')
      .eq('user_id', userId)
      .eq('is_default', true)
      .single();
    
    if (error) {
      console.error('Error fetching default portfolio:', error);
      return null;
    }
    
    return data;
  },

  // Calculate total portfolio value
  async calculatePortfolioValue(portfolioId: string): Promise<number> {
    const holdings = await db.getPortfolioHoldings(portfolioId);
    return holdings.reduce((total, holding) => total + (holding.current_value || 0), 0);
  },

  // Get all user data
  async getUserData(userId: string) {
    const [user, watchlists, portfolios, subscription] = await Promise.all([
      db.getCurrentUser(),
      db.getUserWatchlists(userId),
      db.getUserPortfolios(userId),
      db.getUserSubscription(userId)
    ]);

    return { user, watchlists, portfolios, subscription };
  },

  // Batch fetch watchlist items for multiple watchlists
  async getMultipleWatchlistItems(watchlistIds: string[]): Promise<Map<string, WatchlistItem[]>> {
    const { data, error } = await supabase
      .from('watchlist_items')
      .select('*')
      .in('watchlist_id', watchlistIds);
    
    if (error) {
      console.error('Error fetching multiple watchlist items:', error);
      return new Map();
    }

    const itemsMap = new Map<string, WatchlistItem[]>();
    (data || []).forEach(item => {
      const items = itemsMap.get(item.watchlist_id) || [];
      items.push(item);
      itemsMap.set(item.watchlist_id, items);
    });

    return itemsMap;
  }
};

// Export types for use in components
export type { 
  User, 
  Watchlist, 
  WatchlistItem, 
  Portfolio, 
  Transaction, 
  Holding, 
  Dividend, 
  PortfolioPerformance,
  CashTransaction,
  Subscription 
};