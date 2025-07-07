// Wave 4: Supabase Client Configuration
// Real-time P&L tracking for Portuguese investors
import { createClient } from '@supabase/supabase-js';

// Environment variables for Supabase connection
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}

// Create Supabase client with enhanced configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: window.localStorage,
    // Enable auto-retry for better reliability
    autoRetry: true,
    retryMinDelay: 1000,
    retryMaxAttempts: 3,
  },
  realtime: {
    // Enable real-time for portfolio P&L tracking
    params: {
      eventsPerSecond: 10
    }
  },
  global: {
    headers: {
      'x-client-platform': 'alfalyzer-web',
      'x-client-version': '4.0.0'
    }
  }
});

// Real-time subscription for portfolio updates
export class PortfolioRealtimeManager {
  private subscriptions: Map<string, any> = new Map();

  // Subscribe to portfolio holdings changes for real-time P&L
  subscribeToPortfolioUpdates(portfolioId: string, callback: (payload: any) => void) {
    const subscription = supabase
      .channel(`portfolio_${portfolioId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'portfolio_holdings',
          filter: `portfolio_id=eq.${portfolioId}`
        },
        callback
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public', 
          table: 'portfolios',
          filter: `id=eq.${portfolioId}`
        },
        callback
      )
      .subscribe();

    this.subscriptions.set(portfolioId, subscription);
    return subscription;
  }

  // Subscribe to stock price updates (when we implement real-time prices)
  subscribeToStockPriceUpdates(symbols: string[], callback: (payload: any) => void) {
    const channelName = `stock_prices_${symbols.join('_')}`;
    const subscription = supabase
      .channel(channelName)
      .on('broadcast', { event: 'price_update' }, callback)
      .subscribe();

    this.subscriptions.set(channelName, subscription);
    return subscription;
  }

  // Unsubscribe from portfolio updates
  unsubscribeFromPortfolio(portfolioId: string) {
    const subscription = this.subscriptions.get(portfolioId);
    if (subscription) {
      supabase.removeChannel(subscription);
      this.subscriptions.delete(portfolioId);
    }
  }

  // Unsubscribe from all subscriptions
  unsubscribeAll() {
    this.subscriptions.forEach((subscription) => {
      supabase.removeChannel(subscription);
    });
    this.subscriptions.clear();
  }
}

// Export singleton instance
export const portfolioRealtimeManager = new PortfolioRealtimeManager();

// Helper function to check if user is authenticated
export const isAuthenticated = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return !!session;
};

// Helper function to get current user
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

// Enhanced error handling for Supabase operations
export const handleSupabaseError = (error: any, operation: string) => {
  console.error(`Supabase ${operation} error:`, error);
  
  // Handle specific error types
  if (error?.code === 'PGRST116') {
    throw new Error('Resource not found');
  }
  
  if (error?.message?.includes('JWT')) {
    throw new Error('Authentication required. Please log in again.');
  }
  
  if (error?.message?.includes('RLS')) {
    throw new Error('Access denied. You can only access your own data.');
  }
  
  // Generic error
  throw new Error(error?.message || `Failed to ${operation}`);
};

// Multi-currency exchange rate helper (for international markets)
export const convertCurrency = async (amount: number, fromCurrency: string, toCurrency: string): Promise<number> => {
  if (fromCurrency === toCurrency) return amount;
  
  // This would normally call a real exchange rate API
  // For now, using mock exchange rates focused on EUR/USD
  const exchangeRates: Record<string, Record<string, number>> = {
    'USD': { 'EUR': 0.85, 'GBP': 0.73, 'CHF': 0.91 },
    'EUR': { 'USD': 1.18, 'GBP': 0.86, 'CHF': 1.07 },
    'GBP': { 'USD': 1.37, 'EUR': 1.16, 'CHF': 1.24 },
    'CHF': { 'USD': 1.10, 'EUR': 0.93, 'GBP': 0.81 }
  };
  
  const rate = exchangeRates[fromCurrency]?.[toCurrency] || 1;
  return amount * rate;
};