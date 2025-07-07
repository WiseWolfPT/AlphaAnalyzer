/**
 * AGENTE 3: Tipos do banco de dados Supabase
 * Gerado automaticamente baseado no schema do PostgreSQL
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          username: string
          name: string | null
          created_at: string
          updated_at: string
          subscription_tier: 'free' | 'pro' | 'premium'
          subscription_status: 'active' | 'inactive' | 'canceled'
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          last_login: string | null
          email_verified: boolean
          avatar_url: string | null
        }
        Insert: {
          id?: string
          email: string
          username: string
          name?: string | null
          created_at?: string
          updated_at?: string
          subscription_tier?: 'free' | 'pro' | 'premium'
          subscription_status?: 'active' | 'inactive' | 'canceled'
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          last_login?: string | null
          email_verified?: boolean
          avatar_url?: string | null
        }
        Update: {
          id?: string
          email?: string
          username?: string
          name?: string | null
          created_at?: string
          updated_at?: string
          subscription_tier?: 'free' | 'pro' | 'premium'
          subscription_status?: 'active' | 'inactive' | 'canceled'
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          last_login?: string | null
          email_verified?: boolean
          avatar_url?: string | null
        }
      }
      stocks: {
        Row: {
          symbol: string
          name: string
          exchange: string | null
          currency: string | null
          country: string | null
          sector: string | null
          industry: string | null
          market_cap: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          symbol: string
          name: string
          exchange?: string | null
          currency?: string | null
          country?: string | null
          sector?: string | null
          industry?: string | null
          market_cap?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          symbol?: string
          name?: string
          exchange?: string | null
          currency?: string | null
          country?: string | null
          sector?: string | null
          industry?: string | null
          market_cap?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      watchlists: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          is_public: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      watchlist_stocks: {
        Row: {
          id: string
          watchlist_id: string
          stock_symbol: string
          added_at: string
          notes: string | null
          target_price: number | null
          alert_enabled: boolean
        }
        Insert: {
          id?: string
          watchlist_id: string
          stock_symbol: string
          added_at?: string
          notes?: string | null
          target_price?: number | null
          alert_enabled?: boolean
        }
        Update: {
          id?: string
          watchlist_id?: string
          stock_symbol?: string
          added_at?: string
          notes?: string | null
          target_price?: number | null
          alert_enabled?: boolean
        }
      }
      portfolios: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          currency: string
          is_public: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          currency?: string
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          currency?: string
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      portfolio_holdings: {
        Row: {
          id: string
          portfolio_id: string
          stock_symbol: string
          quantity: number
          average_cost: number
          purchase_date: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          portfolio_id: string
          stock_symbol: string
          quantity: number
          average_cost: number
          purchase_date: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          portfolio_id?: string
          stock_symbol?: string
          quantity?: number
          average_cost?: number
          purchase_date?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      transcripts: {
        Row: {
          id: string
          ticker: string
          company_name: string
          quarter: string
          year: number
          call_date: string | null
          raw_transcript: string | null
          ai_summary: Json | null
          status: 'pending' | 'processing' | 'published' | 'archived'
          created_at: string
          published_at: string | null
          view_count: number
        }
        Insert: {
          id?: string
          ticker: string
          company_name: string
          quarter: string
          year: number
          call_date?: string | null
          raw_transcript?: string | null
          ai_summary?: Json | null
          status?: 'pending' | 'processing' | 'published' | 'archived'
          created_at?: string
          published_at?: string | null
          view_count?: number
        }
        Update: {
          id?: string
          ticker?: string
          company_name?: string
          quarter?: string
          year?: number
          call_date?: string | null
          raw_transcript?: string | null
          ai_summary?: Json | null
          status?: 'pending' | 'processing' | 'published' | 'archived'
          created_at?: string
          published_at?: string | null
          view_count?: number
        }
      }
      alerts: {
        Row: {
          id: string
          user_id: string
          stock_symbol: string
          alert_type: 'price_above' | 'price_below' | 'percent_change' | 'volume_spike'
          threshold: number
          is_active: boolean
          triggered_count: number
          last_triggered: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          stock_symbol: string
          alert_type: 'price_above' | 'price_below' | 'percent_change' | 'volume_spike'
          threshold: number
          is_active?: boolean
          triggered_count?: number
          last_triggered?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          stock_symbol?: string
          alert_type?: 'price_above' | 'price_below' | 'percent_change' | 'volume_spike'
          threshold?: number
          is_active?: boolean
          triggered_count?: number
          last_triggered?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      api_usage: {
        Row: {
          id: string
          user_id: string | null
          api_provider: string
          endpoint: string
          status_code: number
          response_time: number
          cost: number | null
          created_at: string
          ip_address: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          api_provider: string
          endpoint: string
          status_code: number
          response_time: number
          cost?: number | null
          created_at?: string
          ip_address?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          api_provider?: string
          endpoint?: string
          status_code?: number
          response_time?: number
          cost?: number | null
          created_at?: string
          ip_address?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      subscription_tier: 'free' | 'pro' | 'premium'
      subscription_status: 'active' | 'inactive' | 'canceled'
      alert_type: 'price_above' | 'price_below' | 'percent_change' | 'volume_spike'
      transcript_status: 'pending' | 'processing' | 'published' | 'archived'
    }
  }
}