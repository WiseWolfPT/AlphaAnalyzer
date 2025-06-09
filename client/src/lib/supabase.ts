import { createClient } from '@supabase/supabase-js';

// Supabase configuration - using environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project-id.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Database types
export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  subscription_tier: 'free' | 'pro' | 'premium';
  created_at: string;
  updated_at: string;
}

export interface Watchlist {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface WatchlistStock {
  id: string;
  watchlist_id: string;
  symbol: string;
  added_at: string;
  notes?: string;
}

export interface StockAlert {
  id: string;
  user_id: string;
  symbol: string;
  alert_type: 'price_above' | 'price_below' | 'earnings' | 'news';
  target_value?: number;
  is_active: boolean;
  created_at: string;
}

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
  // Profile operations
  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    
    return data;
  },

  async updateProfile(userId: string, updates: Partial<Profile>) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    
    return { data, error };
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

  async createWatchlist(userId: string, name: string, description?: string): Promise<Watchlist | null> {
    const { data, error } = await supabase
      .from('watchlists')
      .insert({
        user_id: userId,
        name,
        description,
        is_public: false
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating watchlist:', error);
      return null;
    }
    
    return data;
  },

  async deleteWatchlist(watchlistId: string) {
    const { error } = await supabase
      .from('watchlists')
      .delete()
      .eq('id', watchlistId);
    
    return { error };
  },

  // Watchlist stocks operations
  async getWatchlistStocks(watchlistId: string): Promise<WatchlistStock[]> {
    const { data, error } = await supabase
      .from('watchlist_stocks')
      .select('*')
      .eq('watchlist_id', watchlistId)
      .order('added_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching watchlist stocks:', error);
      return [];
    }
    
    return data || [];
  },

  async addStockToWatchlist(watchlistId: string, symbol: string, notes?: string) {
    const { data, error } = await supabase
      .from('watchlist_stocks')
      .insert({
        watchlist_id: watchlistId,
        symbol: symbol.toUpperCase(),
        notes
      })
      .select()
      .single();
    
    return { data, error };
  },

  async removeStockFromWatchlist(watchlistId: string, symbol: string) {
    const { error } = await supabase
      .from('watchlist_stocks')
      .delete()
      .eq('watchlist_id', watchlistId)
      .eq('symbol', symbol.toUpperCase());
    
    return { error };
  },

  // Stock alerts operations
  async getUserAlerts(userId: string): Promise<StockAlert[]> {
    const { data, error } = await supabase
      .from('stock_alerts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching alerts:', error);
      return [];
    }
    
    return data || [];
  },

  async createAlert(userId: string, alert: Omit<StockAlert, 'id' | 'user_id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('stock_alerts')
      .insert({
        user_id: userId,
        ...alert
      })
      .select()
      .single();
    
    return { data, error };
  },

  async deleteAlert(alertId: string) {
    const { error } = await supabase
      .from('stock_alerts')
      .delete()
      .eq('id', alertId);
    
    return { error };
  }
};

// Real-time subscriptions
export const realtime = {
  subscribeToWatchlists(userId: string, callback: (payload: any) => void) {
    return supabase
      .channel('watchlists')
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

  subscribeToWatchlistStocks(watchlistId: string, callback: (payload: any) => void) {
    return supabase
      .channel('watchlist_stocks')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'watchlist_stocks',
          filter: `watchlist_id=eq.${watchlistId}`
        }, 
        callback
      )
      .subscribe();
  },

  unsubscribe(subscription: any) {
    return supabase.removeChannel(subscription);
  }
};