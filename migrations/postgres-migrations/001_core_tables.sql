-- =============================================================================
-- Migration: 001_core_tables.sql
-- Description: Core tables for Alfalyzer financial platform
-- Created: 2025-06-28
-- =============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- USERS TABLE
-- =============================================================================
-- Core user table for authentication and user management
-- Using UUID for better security and distributed system compatibility
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create index on email for faster authentication lookups
CREATE INDEX idx_users_email ON users(email);

-- Add comment for documentation
COMMENT ON TABLE users IS 'Core user table for authentication and user identification';
COMMENT ON COLUMN users.id IS 'Unique user identifier using UUID v4';
COMMENT ON COLUMN users.email IS 'User email address, must be unique across the system';
COMMENT ON COLUMN users.created_at IS 'Timestamp when user account was created';
COMMENT ON COLUMN users.updated_at IS 'Timestamp when user record was last updated';

-- =============================================================================
-- WATCHLISTS TABLE
-- =============================================================================
-- User watchlists for tracking stocks of interest
CREATE TABLE watchlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Ensure each user can only have one default watchlist
  CONSTRAINT unique_default_watchlist UNIQUE (user_id, is_default) WHERE is_default = TRUE
);

-- Create index on user_id for faster user watchlist queries
CREATE INDEX idx_watchlists_user_id ON watchlists(user_id);

-- Create index for finding default watchlists
CREATE INDEX idx_watchlists_default ON watchlists(user_id, is_default) WHERE is_default = TRUE;

-- Add comments for documentation
COMMENT ON TABLE watchlists IS 'User-created watchlists for tracking stocks';
COMMENT ON COLUMN watchlists.id IS 'Unique watchlist identifier';
COMMENT ON COLUMN watchlists.user_id IS 'Reference to the user who owns this watchlist';
COMMENT ON COLUMN watchlists.name IS 'User-defined name for the watchlist';
COMMENT ON COLUMN watchlists.description IS 'Optional description of the watchlist purpose';
COMMENT ON COLUMN watchlists.is_default IS 'Flag indicating if this is the user''s default watchlist';

-- =============================================================================
-- WATCHLIST_ITEMS TABLE
-- =============================================================================
-- Individual stocks within user watchlists
CREATE TABLE watchlist_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  watchlist_id UUID NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  added_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  notes TEXT,
  alert_price DECIMAL(10, 2),
  
  -- Prevent duplicate symbols in the same watchlist
  CONSTRAINT unique_symbol_per_watchlist UNIQUE (watchlist_id, symbol)
);

-- Create composite index for faster queries on watchlist items
CREATE INDEX idx_watchlist_items_watchlist_symbol ON watchlist_items(watchlist_id, symbol);

-- Create index on symbol for cross-watchlist queries
CREATE INDEX idx_watchlist_items_symbol ON watchlist_items(symbol);

-- Add comments for documentation
COMMENT ON TABLE watchlist_items IS 'Individual stock symbols within user watchlists';
COMMENT ON COLUMN watchlist_items.id IS 'Unique identifier for the watchlist item';
COMMENT ON COLUMN watchlist_items.watchlist_id IS 'Reference to the parent watchlist';
COMMENT ON COLUMN watchlist_items.symbol IS 'Stock ticker symbol (e.g., AAPL, MSFT)';
COMMENT ON COLUMN watchlist_items.added_at IS 'Timestamp when the stock was added to the watchlist';
COMMENT ON COLUMN watchlist_items.notes IS 'Optional user notes about why they''re watching this stock';
COMMENT ON COLUMN watchlist_items.alert_price IS 'Optional price alert threshold';

-- =============================================================================
-- PORTFOLIOS TABLE
-- =============================================================================
-- User investment portfolios for tracking holdings and performance
CREATE TABLE portfolios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  currency TEXT DEFAULT 'USD' NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Ensure each user can only have one default portfolio
  CONSTRAINT unique_default_portfolio UNIQUE (user_id, is_default) WHERE is_default = TRUE
);

-- Create index on user_id for faster user portfolio queries
CREATE INDEX idx_portfolios_user_id ON portfolios(user_id);

-- Create index for finding default portfolios
CREATE INDEX idx_portfolios_default ON portfolios(user_id, is_default) WHERE is_default = TRUE;

-- Add comments for documentation
COMMENT ON TABLE portfolios IS 'User investment portfolios for tracking holdings';
COMMENT ON COLUMN portfolios.id IS 'Unique portfolio identifier';
COMMENT ON COLUMN portfolios.user_id IS 'Reference to the user who owns this portfolio';
COMMENT ON COLUMN portfolios.name IS 'User-defined name for the portfolio';
COMMENT ON COLUMN portfolios.currency IS 'Base currency for the portfolio (default USD)';
COMMENT ON COLUMN portfolios.is_default IS 'Flag indicating if this is the user''s default portfolio';

-- =============================================================================
-- TRANSACTIONS TABLE
-- =============================================================================
-- Buy/sell transactions within user portfolios
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
  quantity DECIMAL(12, 4) NOT NULL CHECK (quantity > 0),
  price DECIMAL(10, 2) NOT NULL CHECK (price > 0),
  fees DECIMAL(10, 2) DEFAULT 0 CHECK (fees >= 0),
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create composite index for portfolio transaction queries
CREATE INDEX idx_transactions_portfolio_date ON transactions(portfolio_id, date DESC);

-- Create index on symbol for cross-portfolio analysis
CREATE INDEX idx_transactions_symbol ON transactions(symbol);

-- Create index for transaction type filtering
CREATE INDEX idx_transactions_type ON transactions(portfolio_id, type);

-- Add comments for documentation
COMMENT ON TABLE transactions IS 'Buy/sell transactions within user portfolios';
COMMENT ON COLUMN transactions.id IS 'Unique transaction identifier';
COMMENT ON COLUMN transactions.portfolio_id IS 'Reference to the parent portfolio';
COMMENT ON COLUMN transactions.symbol IS 'Stock ticker symbol for the transaction';
COMMENT ON COLUMN transactions.type IS 'Transaction type: buy or sell';
COMMENT ON COLUMN transactions.quantity IS 'Number of shares in the transaction';
COMMENT ON COLUMN transactions.price IS 'Price per share at transaction time';
COMMENT ON COLUMN transactions.fees IS 'Transaction fees/commissions (default 0)';
COMMENT ON COLUMN transactions.date IS 'Date when the transaction occurred';
COMMENT ON COLUMN transactions.notes IS 'Optional user notes about the transaction';

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================
-- Enable RLS for all user-data tables to ensure data isolation
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- =============================================================================
-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables with updated_at column
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_watchlists_updated_at BEFORE UPDATE ON watchlists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_portfolios_updated_at BEFORE UPDATE ON portfolios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- INITIAL POLICIES (to be expanded based on auth implementation)
-- =============================================================================
-- These are basic policies that will need to be refined based on your auth system

-- Users can only view their own data
CREATE POLICY users_select_own ON users
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own data
CREATE POLICY users_update_own ON users
  FOR UPDATE USING (auth.uid() = id);

-- Users can only access their own watchlists
CREATE POLICY watchlists_owner_only ON watchlists
  FOR ALL USING (auth.uid() = user_id);

-- Users can only access watchlist items from their own watchlists
CREATE POLICY watchlist_items_owner_only ON watchlist_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM watchlists 
      WHERE watchlists.id = watchlist_items.watchlist_id 
      AND watchlists.user_id = auth.uid()
    )
  );

-- Users can only access their own portfolios
CREATE POLICY portfolios_owner_only ON portfolios
  FOR ALL USING (auth.uid() = user_id);

-- Users can only access transactions from their own portfolios
CREATE POLICY transactions_owner_only ON transactions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM portfolios 
      WHERE portfolios.id = transactions.portfolio_id 
      AND portfolios.user_id = auth.uid()
    )
  );

-- =============================================================================
-- PERFORMANCE NOTES
-- =============================================================================
-- 1. UUID primary keys provide better distribution for sharding if needed
-- 2. Indexes on foreign keys improve JOIN performance
-- 3. Partial indexes (WHERE clauses) reduce index size for boolean flags
-- 4. Composite indexes support common query patterns
-- 5. ON DELETE CASCADE ensures referential integrity without orphaned records
-- 6. CHECK constraints validate data at the database level
-- 7. UNIQUE constraints prevent duplicate data
-- 8. RLS policies ensure data isolation between users