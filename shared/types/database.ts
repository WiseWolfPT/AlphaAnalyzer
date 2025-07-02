// Database types generated from migrations
// Auto-generated based on the Supabase schema

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      watchlists: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      watchlist_items: {
        Row: {
          id: string;
          watchlist_id: string;
          symbol: string;
          added_at: string;
          notes: string | null;
          alert_price: number | null;
        };
        Insert: {
          id?: string;
          watchlist_id: string;
          symbol: string;
          added_at?: string;
          notes?: string | null;
          alert_price?: number | null;
        };
        Update: {
          id?: string;
          watchlist_id?: string;
          symbol?: string;
          added_at?: string;
          notes?: string | null;
          alert_price?: number | null;
        };
      };
      portfolios: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          currency: string;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          currency?: string;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          currency?: string;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      transactions: {
        Row: {
          id: string;
          portfolio_id: string;
          symbol: string;
          type: 'buy' | 'sell';
          quantity: number;
          price: number;
          fees: number;
          date: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          portfolio_id: string;
          symbol: string;
          type: 'buy' | 'sell';
          quantity: number;
          price: number;
          fees?: number;
          date: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          portfolio_id?: string;
          symbol?: string;
          type?: 'buy' | 'sell';
          quantity?: number;
          price?: number;
          fees?: number;
          date?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      holdings: {
        Row: {
          id: string;
          portfolio_id: string;
          symbol: string;
          quantity: number;
          average_price: number;
          total_cost: number;
          current_price: number | null;
          current_value: number | null;
          unrealized_pnl: number | null;
          unrealized_pnl_percent: number | null;
          last_updated: string;
        };
        Insert: {
          id?: string;
          portfolio_id: string;
          symbol: string;
          quantity?: number;
          average_price?: number;
          total_cost?: number;
          current_price?: number | null;
          current_value?: number | null;
          unrealized_pnl?: number | null;
          unrealized_pnl_percent?: number | null;
          last_updated?: string;
        };
        Update: {
          id?: string;
          portfolio_id?: string;
          symbol?: string;
          quantity?: number;
          average_price?: number;
          total_cost?: number;
          current_price?: number | null;
          current_value?: number | null;
          unrealized_pnl?: number | null;
          unrealized_pnl_percent?: number | null;
          last_updated?: string;
        };
      };
      dividends: {
        Row: {
          id: string;
          portfolio_id: string;
          symbol: string;
          amount: number;
          payment_date: string;
          ex_dividend_date: string | null;
          shares_owned: number | null;
          amount_per_share: number | null;
          currency: string;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          portfolio_id: string;
          symbol: string;
          amount: number;
          payment_date: string;
          ex_dividend_date?: string | null;
          shares_owned?: number | null;
          amount_per_share?: number | null;
          currency?: string;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          portfolio_id?: string;
          symbol?: string;
          amount?: number;
          payment_date?: string;
          ex_dividend_date?: string | null;
          shares_owned?: number | null;
          amount_per_share?: number | null;
          currency?: string;
          notes?: string | null;
          created_at?: string;
        };
      };
      portfolio_performance: {
        Row: {
          id: string;
          portfolio_id: string;
          date: string;
          total_value: number;
          total_cost: number;
          cash_balance: number;
          total_pnl: number | null;
          total_pnl_percent: number | null;
          daily_pnl: number | null;
          daily_pnl_percent: number | null;
        };
        Insert: {
          id?: string;
          portfolio_id: string;
          date: string;
          total_value: number;
          total_cost: number;
          cash_balance?: number;
          total_pnl?: number | null;
          total_pnl_percent?: number | null;
          daily_pnl?: number | null;
          daily_pnl_percent?: number | null;
        };
        Update: {
          id?: string;
          portfolio_id?: string;
          date?: string;
          total_value?: number;
          total_cost?: number;
          cash_balance?: number;
          total_pnl?: number | null;
          total_pnl_percent?: number | null;
          daily_pnl?: number | null;
          daily_pnl_percent?: number | null;
        };
      };
      cash_transactions: {
        Row: {
          id: string;
          portfolio_id: string;
          type: 'deposit' | 'withdrawal' | 'dividend' | 'fee';
          amount: number;
          date: string;
          description: string | null;
          reference_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          portfolio_id: string;
          type: 'deposit' | 'withdrawal' | 'dividend' | 'fee';
          amount: number;
          date: string;
          description?: string | null;
          reference_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          portfolio_id?: string;
          type?: 'deposit' | 'withdrawal' | 'dividend' | 'fee';
          amount?: number;
          date?: string;
          description?: string | null;
          reference_id?: string | null;
          created_at?: string;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string | null;
          stripe_customer_id: string;
          stripe_subscription_id: string;
          stripe_price_id: string;
          status: 'active' | 'past_due' | 'canceled' | 'incomplete' | 'trialing';
          current_period_start: string | null;
          current_period_end: string | null;
          cancel_at_period_end: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          stripe_customer_id: string;
          stripe_subscription_id: string;
          stripe_price_id: string;
          status: 'active' | 'past_due' | 'canceled' | 'incomplete' | 'trialing';
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          stripe_customer_id?: string;
          stripe_subscription_id?: string;
          stripe_price_id?: string;
          status?: 'active' | 'past_due' | 'canceled' | 'incomplete' | 'trialing';
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      portfolio_summary: {
        Row: {
          portfolio_id: string;
          user_id: string;
          portfolio_name: string;
          currency: string;
          total_holdings_value: number;
          total_cost: number;
          total_unrealized_pnl: number;
          total_unrealized_pnl_percent: number;
          num_holdings: number;
          last_updated: string | null;
        };
      };
    };
    Functions: {
      calculate_holdings: {
        Args: {
          p_portfolio_id: string;
        };
        Returns: {
          symbol: string;
          quantity: number;
          average_price: number;
          total_cost: number;
        }[];
      };
      update_portfolio_holdings: {
        Args: {
          p_portfolio_id: string;
        };
        Returns: void;
      };
      refresh_portfolio_summary: {
        Args: Record<string, never>;
        Returns: void;
      };
    };
  };
}

// Type helpers
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T];

// Convenience types
export type User = Tables<'users'>;
export type Watchlist = Tables<'watchlists'>;
export type WatchlistItem = Tables<'watchlist_items'>;
export type Portfolio = Tables<'portfolios'>;
export type Transaction = Tables<'transactions'>;
export type Holding = Tables<'holdings'>;
export type Dividend = Tables<'dividends'>;
export type PortfolioPerformance = Tables<'portfolio_performance'>;
export type CashTransaction = Tables<'cash_transactions'>;
export type Subscription = Tables<'subscriptions'>;

// Insert types
export type InsertUser = Database['public']['Tables']['users']['Insert'];
export type InsertWatchlist = Database['public']['Tables']['watchlists']['Insert'];
export type InsertWatchlistItem = Database['public']['Tables']['watchlist_items']['Insert'];
export type InsertPortfolio = Database['public']['Tables']['portfolios']['Insert'];
export type InsertTransaction = Database['public']['Tables']['transactions']['Insert'];
export type InsertDividend = Database['public']['Tables']['dividends']['Insert'];
export type InsertCashTransaction = Database['public']['Tables']['cash_transactions']['Insert'];

// Update types
export type UpdateUser = Database['public']['Tables']['users']['Update'];
export type UpdateWatchlist = Database['public']['Tables']['watchlists']['Update'];
export type UpdateWatchlistItem = Database['public']['Tables']['watchlist_items']['Update'];
export type UpdatePortfolio = Database['public']['Tables']['portfolios']['Update'];
export type UpdateTransaction = Database['public']['Tables']['transactions']['Update'];
export type UpdateHolding = Database['public']['Tables']['holdings']['Update'];
export type UpdateSubscription = Database['public']['Tables']['subscriptions']['Update'];

// View types
export type PortfolioSummary = Database['public']['Views']['portfolio_summary']['Row'];