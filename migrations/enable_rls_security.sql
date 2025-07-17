-- =====================================================
-- ENABLE ROW LEVEL SECURITY (RLS) FOR ALFALYZER
-- =====================================================
-- This script enables RLS on all user-related tables
-- and creates policies for data isolation

-- Enable RLS on all user-related tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE dividends ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- USERS TABLE POLICIES
-- =====================================================
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- =====================================================
-- WATCHLISTS TABLE POLICIES
-- =====================================================
CREATE POLICY "Users can view own watchlists" ON watchlists
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own watchlists" ON watchlists
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own watchlists" ON watchlists
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own watchlists" ON watchlists
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- WATCHLIST_ITEMS TABLE POLICIES
-- =====================================================
CREATE POLICY "Users can view own watchlist items" ON watchlist_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM watchlists 
      WHERE watchlists.id = watchlist_items.watchlist_id 
      AND watchlists.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add items to own watchlists" ON watchlist_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM watchlists 
      WHERE watchlists.id = watchlist_items.watchlist_id 
      AND watchlists.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own watchlist items" ON watchlist_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM watchlists 
      WHERE watchlists.id = watchlist_items.watchlist_id 
      AND watchlists.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own watchlist items" ON watchlist_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM watchlists 
      WHERE watchlists.id = watchlist_items.watchlist_id 
      AND watchlists.user_id = auth.uid()
    )
  );

-- =====================================================
-- PORTFOLIOS TABLE POLICIES
-- =====================================================
CREATE POLICY "Users can view own portfolios" ON portfolios
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own portfolios" ON portfolios
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own portfolios" ON portfolios
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own portfolios" ON portfolios
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- TRANSACTIONS TABLE POLICIES
-- =====================================================
CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM portfolios 
      WHERE portfolios.id = transactions.portfolio_id 
      AND portfolios.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create transactions in own portfolios" ON transactions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM portfolios 
      WHERE portfolios.id = transactions.portfolio_id 
      AND portfolios.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own transactions" ON transactions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM portfolios 
      WHERE portfolios.id = transactions.portfolio_id 
      AND portfolios.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own transactions" ON transactions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM portfolios 
      WHERE portfolios.id = transactions.portfolio_id 
      AND portfolios.user_id = auth.uid()
    )
  );

-- =====================================================
-- HOLDINGS TABLE POLICIES
-- =====================================================
CREATE POLICY "Users can view own holdings" ON holdings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM portfolios 
      WHERE portfolios.id = holdings.portfolio_id 
      AND portfolios.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own holdings" ON holdings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM portfolios 
      WHERE portfolios.id = holdings.portfolio_id 
      AND portfolios.user_id = auth.uid()
    )
  );

CREATE POLICY "System can create holdings" ON holdings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can delete holdings" ON holdings
  FOR DELETE USING (true);

-- =====================================================
-- DIVIDENDS TABLE POLICIES
-- =====================================================
CREATE POLICY "Users can view own dividends" ON dividends
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM portfolios 
      WHERE portfolios.id = dividends.portfolio_id 
      AND portfolios.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create dividends in own portfolios" ON dividends
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM portfolios 
      WHERE portfolios.id = dividends.portfolio_id 
      AND portfolios.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own dividends" ON dividends
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM portfolios 
      WHERE portfolios.id = dividends.portfolio_id 
      AND portfolios.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own dividends" ON dividends
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM portfolios 
      WHERE portfolios.id = dividends.portfolio_id 
      AND portfolios.user_id = auth.uid()
    )
  );

-- =====================================================
-- CASH_TRANSACTIONS TABLE POLICIES
-- =====================================================
CREATE POLICY "Users can view own cash transactions" ON cash_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM portfolios 
      WHERE portfolios.id = cash_transactions.portfolio_id 
      AND portfolios.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create cash transactions in own portfolios" ON cash_transactions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM portfolios 
      WHERE portfolios.id = cash_transactions.portfolio_id 
      AND portfolios.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own cash transactions" ON cash_transactions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM portfolios 
      WHERE portfolios.id = cash_transactions.portfolio_id 
      AND portfolios.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own cash transactions" ON cash_transactions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM portfolios 
      WHERE portfolios.id = cash_transactions.portfolio_id 
      AND portfolios.user_id = auth.uid()
    )
  );

-- =====================================================
-- PORTFOLIO_PERFORMANCE TABLE POLICIES
-- =====================================================
CREATE POLICY "Users can view own portfolio performance" ON portfolio_performance
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM portfolios 
      WHERE portfolios.id = portfolio_performance.portfolio_id 
      AND portfolios.user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage portfolio performance" ON portfolio_performance
  FOR ALL USING (true);

-- =====================================================
-- SUBSCRIPTIONS TABLE POLICIES
-- =====================================================
CREATE POLICY "Users can view own subscriptions" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own subscriptions" ON subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions" ON subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================
-- ADMIN POLICIES - OVERRIDE ALL RESTRICTIONS
-- =====================================================
-- These policies allow admins to view and manage all data
-- regardless of user ownership

CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can view all watchlists" ON watchlists
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can view all portfolios" ON portfolios
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can view all transactions" ON transactions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can view all holdings" ON holdings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can view all subscriptions" ON subscriptions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- =====================================================
-- SYSTEM TABLES - NO RLS NEEDED
-- =====================================================
-- These tables contain system data and don't need RLS:
-- - stocks (public market data)
-- - stock_prices (public market data)
-- - stock_fundamentals (public market data)
-- - earnings (public earnings data)
-- - intrinsic_values (public calculations)
-- - transcripts (public transcripts)
-- - job_queue (system jobs)
-- - api_cache (system cache)
-- - api_usage (system metrics)
-- - real_time_quotes (public quotes)

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these queries to verify RLS is working:

-- Check RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true;

-- List all policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';

-- Test data isolation (run as different users)
-- SELECT * FROM watchlists; -- Should only show user's own watchlists
-- SELECT * FROM portfolios; -- Should only show user's own portfolios