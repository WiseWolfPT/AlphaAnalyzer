-- =============================================================================
-- Migration: 002_portfolio_tables.sql
-- Description: Extended portfolio functionality for Alfalyzer financial platform
-- Created: 2025-06-28
-- Dependencies: 001_core_tables.sql (portfolios and transactions tables must exist)
-- =============================================================================

-- =============================================================================
-- HOLDINGS TABLE
-- =============================================================================
-- Current portfolio positions calculated from transactions
-- This table is maintained via triggers or periodic recalculation
CREATE TABLE holdings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  quantity DECIMAL(12, 4) NOT NULL DEFAULT 0,
  average_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_cost DECIMAL(12, 2) NOT NULL DEFAULT 0,
  current_price DECIMAL(10, 2),
  current_value DECIMAL(12, 2),
  unrealized_pnl DECIMAL(12, 2),
  unrealized_pnl_percent DECIMAL(5, 2),
  last_updated TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Ensure unique symbol per portfolio
  CONSTRAINT unique_holding_per_portfolio UNIQUE (portfolio_id, symbol)
);

-- Create indexes for performance
CREATE INDEX idx_holdings_portfolio ON holdings(portfolio_id);
CREATE INDEX idx_holdings_symbol ON holdings(symbol);
CREATE INDEX idx_holdings_pnl ON holdings(portfolio_id, unrealized_pnl);

-- Add comments for documentation
COMMENT ON TABLE holdings IS 'Current positions in each portfolio calculated from transactions';
COMMENT ON COLUMN holdings.quantity IS 'Current number of shares held (can be 0 if fully sold)';
COMMENT ON COLUMN holdings.average_price IS 'Weighted average purchase price';
COMMENT ON COLUMN holdings.total_cost IS 'Total cost basis for tax calculations';
COMMENT ON COLUMN holdings.current_price IS 'Latest market price (updated periodically)';
COMMENT ON COLUMN holdings.current_value IS 'quantity * current_price';
COMMENT ON COLUMN holdings.unrealized_pnl IS 'current_value - total_cost';
COMMENT ON COLUMN holdings.unrealized_pnl_percent IS '(unrealized_pnl / total_cost) * 100';

-- =============================================================================
-- DIVIDENDS TABLE
-- =============================================================================
-- Track dividend payments received
CREATE TABLE dividends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL,
  ex_dividend_date DATE,
  shares_owned DECIMAL(12, 4),
  amount_per_share DECIMAL(6, 4),
  currency TEXT DEFAULT 'USD' NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Prevent duplicate dividend entries
  CONSTRAINT unique_dividend_entry UNIQUE (portfolio_id, symbol, payment_date)
);

-- Create indexes for dividend queries
CREATE INDEX idx_dividends_portfolio_date ON dividends(portfolio_id, payment_date DESC);
CREATE INDEX idx_dividends_symbol ON dividends(symbol);
CREATE INDEX idx_dividends_year ON dividends(portfolio_id, EXTRACT(YEAR FROM payment_date));

-- Add comments
COMMENT ON TABLE dividends IS 'Dividend payments received in portfolios';
COMMENT ON COLUMN dividends.amount IS 'Total dividend amount received';
COMMENT ON COLUMN dividends.ex_dividend_date IS 'Ex-dividend date for the payment';
COMMENT ON COLUMN dividends.shares_owned IS 'Number of shares owned at payment time';
COMMENT ON COLUMN dividends.amount_per_share IS 'Dividend per share (calculated or manual)';

-- =============================================================================
-- PORTFOLIO_PERFORMANCE TABLE
-- =============================================================================
-- Daily snapshots of portfolio performance for historical tracking
CREATE TABLE portfolio_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_value DECIMAL(12, 2) NOT NULL,
  total_cost DECIMAL(12, 2) NOT NULL,
  cash_balance DECIMAL(12, 2) DEFAULT 0,
  total_pnl DECIMAL(12, 2),
  total_pnl_percent DECIMAL(8, 2),
  daily_pnl DECIMAL(12, 2),
  daily_pnl_percent DECIMAL(6, 2),
  
  -- Ensure one snapshot per portfolio per day
  CONSTRAINT unique_performance_snapshot UNIQUE (portfolio_id, date)
);

-- Create indexes for performance queries
CREATE INDEX idx_portfolio_performance_date ON portfolio_performance(portfolio_id, date DESC);
CREATE INDEX idx_portfolio_performance_year ON portfolio_performance(
  portfolio_id, 
  EXTRACT(YEAR FROM date)
);

-- Add comments
COMMENT ON TABLE portfolio_performance IS 'Daily performance snapshots for portfolio tracking';
COMMENT ON COLUMN portfolio_performance.total_value IS 'Sum of all holdings at market price + cash';
COMMENT ON COLUMN portfolio_performance.total_cost IS 'Sum of all transaction costs';
COMMENT ON COLUMN portfolio_performance.cash_balance IS 'Uninvested cash in portfolio';
COMMENT ON COLUMN portfolio_performance.daily_pnl IS 'Change from previous day';

-- =============================================================================
-- CASH_TRANSACTIONS TABLE
-- =============================================================================
-- Track cash deposits and withdrawals
CREATE TABLE cash_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'dividend', 'fee')),
  amount DECIMAL(12, 2) NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  reference_id UUID, -- Can reference dividends.id or other related records
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Add constraint for amount based on type
  CONSTRAINT valid_cash_amount CHECK (
    (type IN ('deposit', 'dividend') AND amount > 0) OR
    (type IN ('withdrawal', 'fee') AND amount < 0)
  )
);

-- Create indexes
CREATE INDEX idx_cash_transactions_portfolio ON cash_transactions(portfolio_id, date DESC);
CREATE INDEX idx_cash_transactions_type ON cash_transactions(portfolio_id, type);

-- Add comments
COMMENT ON TABLE cash_transactions IS 'Cash movements in and out of portfolios';
COMMENT ON COLUMN cash_transactions.type IS 'Type of cash movement: deposit, withdrawal, dividend, fee';
COMMENT ON COLUMN cash_transactions.reference_id IS 'Reference to related record (e.g., dividend payment)';

-- =============================================================================
-- MATERIALIZED VIEWS FOR PERFORMANCE
-- =============================================================================

-- Current portfolio summary view
CREATE MATERIALIZED VIEW portfolio_summary AS
SELECT 
  p.id AS portfolio_id,
  p.user_id,
  p.name AS portfolio_name,
  p.currency,
  COALESCE(SUM(h.current_value), 0) AS total_holdings_value,
  COALESCE(SUM(h.total_cost), 0) AS total_cost,
  COALESCE(SUM(h.unrealized_pnl), 0) AS total_unrealized_pnl,
  CASE 
    WHEN COALESCE(SUM(h.total_cost), 0) > 0 
    THEN (COALESCE(SUM(h.unrealized_pnl), 0) / SUM(h.total_cost)) * 100
    ELSE 0 
  END AS total_unrealized_pnl_percent,
  COUNT(DISTINCT h.symbol) AS num_holdings,
  MAX(h.last_updated) AS last_updated
FROM portfolios p
LEFT JOIN holdings h ON p.id = h.portfolio_id AND h.quantity > 0
GROUP BY p.id, p.user_id, p.name, p.currency;

-- Create index on materialized view
CREATE INDEX idx_portfolio_summary_user ON portfolio_summary(user_id);

-- Add refresh function for materialized view
CREATE OR REPLACE FUNCTION refresh_portfolio_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY portfolio_summary;
END;
$$ LANGUAGE plpgsql;

COMMENT ON MATERIALIZED VIEW portfolio_summary IS 'Aggregated portfolio statistics for quick access';

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Function to calculate holdings from transactions
CREATE OR REPLACE FUNCTION calculate_holdings(p_portfolio_id UUID)
RETURNS TABLE (
  symbol TEXT,
  quantity DECIMAL,
  average_price DECIMAL,
  total_cost DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH transaction_summary AS (
    SELECT 
      t.symbol,
      SUM(CASE 
        WHEN t.type = 'buy' THEN t.quantity 
        ELSE -t.quantity 
      END) AS net_quantity,
      SUM(CASE 
        WHEN t.type = 'buy' THEN t.quantity * t.price + COALESCE(t.fees, 0)
        ELSE 0 
      END) AS total_buy_cost,
      SUM(CASE 
        WHEN t.type = 'buy' THEN t.quantity 
        ELSE 0 
      END) AS total_buy_quantity
    FROM transactions t
    WHERE t.portfolio_id = p_portfolio_id
    GROUP BY t.symbol
  )
  SELECT 
    ts.symbol,
    ts.net_quantity AS quantity,
    CASE 
      WHEN ts.total_buy_quantity > 0 
      THEN ts.total_buy_cost / ts.total_buy_quantity 
      ELSE 0 
    END AS average_price,
    CASE 
      WHEN ts.net_quantity > 0 
      THEN (ts.total_buy_cost / ts.total_buy_quantity) * ts.net_quantity
      ELSE 0 
    END AS total_cost
  FROM transaction_summary ts
  WHERE ts.net_quantity != 0;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_holdings IS 'Calculate current holdings from transaction history';

-- Function to update holdings for a specific portfolio
CREATE OR REPLACE FUNCTION update_portfolio_holdings(p_portfolio_id UUID)
RETURNS void AS $$
BEGIN
  -- Delete existing holdings
  DELETE FROM holdings WHERE portfolio_id = p_portfolio_id;
  
  -- Insert recalculated holdings
  INSERT INTO holdings (portfolio_id, symbol, quantity, average_price, total_cost)
  SELECT 
    p_portfolio_id,
    ch.symbol,
    ch.quantity,
    ch.average_price,
    ch.total_cost
  FROM calculate_holdings(p_portfolio_id) ch;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Trigger to update holdings after transaction changes
CREATE OR REPLACE FUNCTION trigger_update_holdings()
RETURNS TRIGGER AS $$
BEGIN
  -- Update holdings for the affected portfolio
  IF TG_OP = 'DELETE' THEN
    PERFORM update_portfolio_holdings(OLD.portfolio_id);
  ELSE
    PERFORM update_portfolio_holdings(NEW.portfolio_id);
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_holdings_on_transaction
AFTER INSERT OR UPDATE OR DELETE ON transactions
FOR EACH ROW EXECUTE FUNCTION trigger_update_holdings();

COMMENT ON TRIGGER update_holdings_on_transaction ON transactions IS 
'Automatically recalculate holdings when transactions change';

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
-- Enable RLS for new tables
ALTER TABLE holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE dividends ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY holdings_owner_only ON holdings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM portfolios 
      WHERE portfolios.id = holdings.portfolio_id 
      AND portfolios.user_id = auth.uid()
    )
  );

CREATE POLICY dividends_owner_only ON dividends
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM portfolios 
      WHERE portfolios.id = dividends.portfolio_id 
      AND portfolios.user_id = auth.uid()
    )
  );

CREATE POLICY portfolio_performance_owner_only ON portfolio_performance
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM portfolios 
      WHERE portfolios.id = portfolio_performance.portfolio_id 
      AND portfolios.user_id = auth.uid()
    )
  );

CREATE POLICY cash_transactions_owner_only ON cash_transactions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM portfolios 
      WHERE portfolios.id = cash_transactions.portfolio_id 
      AND portfolios.user_id = auth.uid()
    )
  );

-- =============================================================================
-- MIGRATION NOTES
-- =============================================================================
-- This migration extends the portfolio functionality with:
-- 1. Holdings table for current positions (auto-calculated from transactions)
-- 2. Dividends tracking for income analysis
-- 3. Portfolio performance history for charting
-- 4. Cash transactions for complete portfolio accounting
-- 5. Helper functions for complex calculations
-- 6. Materialized view for performance optimization
--
-- The holdings table is automatically maintained via triggers when transactions
-- are added, updated, or deleted. This ensures data consistency and eliminates
-- the need for manual recalculation.
--
-- For production deployment:
-- 1. Run this migration after 001_core_tables.sql
-- 2. Schedule periodic refresh of portfolio_summary materialized view
-- 3. Implement background job to update current_price in holdings table
-- 4. Consider partitioning portfolio_performance by date for large datasets