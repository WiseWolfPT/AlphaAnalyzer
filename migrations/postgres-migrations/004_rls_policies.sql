-- =============================================================================
-- Migration: 004_rls_policies.sql
-- Description: Comprehensive Row Level Security policies for all user data tables
-- Created: 2025-06-28
-- Dependencies: Previous migrations that created the tables
-- =============================================================================

-- =============================================================================
-- DROP EXISTING POLICIES (to avoid conflicts)
-- =============================================================================
-- Note: Using IF EXISTS to prevent errors if policies don't exist

-- Core tables policies
DROP POLICY IF EXISTS users_select_own ON users;
DROP POLICY IF EXISTS users_update_own ON users;
DROP POLICY IF EXISTS watchlists_owner_only ON watchlists;
DROP POLICY IF EXISTS watchlist_items_owner_only ON watchlist_items;
DROP POLICY IF EXISTS portfolios_owner_only ON portfolios;
DROP POLICY IF EXISTS transactions_owner_only ON transactions;

-- Portfolio extension tables policies
DROP POLICY IF EXISTS holdings_owner_only ON holdings;
DROP POLICY IF EXISTS dividends_owner_only ON dividends;
DROP POLICY IF EXISTS portfolio_performance_owner_only ON portfolio_performance;
DROP POLICY IF EXISTS cash_transactions_owner_only ON cash_transactions;

-- Subscription policies
DROP POLICY IF EXISTS "Users can read own subscription" ON subscriptions;
DROP POLICY IF EXISTS "Service role can insert subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Service role can update subscriptions" ON subscriptions;

-- =============================================================================
-- USERS TABLE POLICIES
-- =============================================================================
-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Service role can manage all users (for admin operations)
CREATE POLICY "Service role can manage users" ON users
  FOR ALL USING (auth.role() = 'service_role');

-- =============================================================================
-- WATCHLISTS TABLE POLICIES
-- =============================================================================
-- Users can read their own watchlists
CREATE POLICY "Users can read own watchlists" ON watchlists
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own watchlists
CREATE POLICY "Users can create own watchlists" ON watchlists
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own watchlists
CREATE POLICY "Users can update own watchlists" ON watchlists
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own watchlists
CREATE POLICY "Users can delete own watchlists" ON watchlists
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================================================
-- WATCHLIST_ITEMS TABLE POLICIES
-- =============================================================================
-- Users can view items in their watchlists
CREATE POLICY "Users can view own watchlist items" ON watchlist_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM watchlists 
      WHERE watchlists.id = watchlist_items.watchlist_id 
      AND watchlists.user_id = auth.uid()
    )
  );

-- Users can add items to their watchlists
CREATE POLICY "Users can add items to own watchlists" ON watchlist_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM watchlists 
      WHERE watchlists.id = watchlist_items.watchlist_id 
      AND watchlists.user_id = auth.uid()
    )
  );

-- Users can update items in their watchlists
CREATE POLICY "Users can update own watchlist items" ON watchlist_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM watchlists 
      WHERE watchlists.id = watchlist_items.watchlist_id 
      AND watchlists.user_id = auth.uid()
    )
  );

-- Users can delete items from their watchlists
CREATE POLICY "Users can delete own watchlist items" ON watchlist_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM watchlists 
      WHERE watchlists.id = watchlist_items.watchlist_id 
      AND watchlists.user_id = auth.uid()
    )
  );

-- =============================================================================
-- PORTFOLIOS TABLE POLICIES
-- =============================================================================
-- Users can read their own portfolios
CREATE POLICY "Users can read own portfolios" ON portfolios
  FOR SELECT USING (auth.uid() = user_id);

-- Users can manage all aspects of their portfolios
CREATE POLICY "Users can manage own portfolios" ON portfolios
  FOR ALL USING (auth.uid() = user_id);

-- =============================================================================
-- TRANSACTIONS TABLE POLICIES
-- =============================================================================
-- Users can view transactions in their portfolios
CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT USING (
    portfolio_id IN (
      SELECT id FROM portfolios WHERE user_id = auth.uid()
    )
  );

-- Users can manage transactions in their portfolios
CREATE POLICY "Users can manage own transactions" ON transactions
  FOR ALL USING (
    portfolio_id IN (
      SELECT id FROM portfolios WHERE user_id = auth.uid()
    )
  );

-- =============================================================================
-- HOLDINGS TABLE POLICIES
-- =============================================================================
-- Users can view holdings in their portfolios
CREATE POLICY "Users can view own holdings" ON holdings
  FOR SELECT USING (
    portfolio_id IN (
      SELECT id FROM portfolios WHERE user_id = auth.uid()
    )
  );

-- Users can manage holdings in their portfolios (typically updated via triggers)
CREATE POLICY "Users can manage own holdings" ON holdings
  FOR ALL USING (
    portfolio_id IN (
      SELECT id FROM portfolios WHERE user_id = auth.uid()
    )
  );

-- =============================================================================
-- DIVIDENDS TABLE POLICIES
-- =============================================================================
-- Users can view dividends in their portfolios
CREATE POLICY "Users can view own dividends" ON dividends
  FOR SELECT USING (
    portfolio_id IN (
      SELECT id FROM portfolios WHERE user_id = auth.uid()
    )
  );

-- Users can manage dividends in their portfolios
CREATE POLICY "Users can manage own dividends" ON dividends
  FOR ALL USING (
    portfolio_id IN (
      SELECT id FROM portfolios WHERE user_id = auth.uid()
    )
  );

-- =============================================================================
-- PORTFOLIO_PERFORMANCE TABLE POLICIES
-- =============================================================================
-- Users can view performance data for their portfolios
CREATE POLICY "Users can view own portfolio performance" ON portfolio_performance
  FOR SELECT USING (
    portfolio_id IN (
      SELECT id FROM portfolios WHERE user_id = auth.uid()
    )
  );

-- System/service role can manage performance snapshots
CREATE POLICY "Service role can manage portfolio performance" ON portfolio_performance
  FOR ALL USING (auth.role() = 'service_role');

-- =============================================================================
-- CASH_TRANSACTIONS TABLE POLICIES
-- =============================================================================
-- Users can view cash transactions in their portfolios
CREATE POLICY "Users can view own cash transactions" ON cash_transactions
  FOR SELECT USING (
    portfolio_id IN (
      SELECT id FROM portfolios WHERE user_id = auth.uid()
    )
  );

-- Users can manage cash transactions in their portfolios
CREATE POLICY "Users can manage own cash transactions" ON cash_transactions
  FOR ALL USING (
    portfolio_id IN (
      SELECT id FROM portfolios WHERE user_id = auth.uid()
    )
  );

-- =============================================================================
-- SUBSCRIPTIONS TABLE POLICIES (refined)
-- =============================================================================
-- Users can read their own subscription
CREATE POLICY "Users can read own subscription" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Only service role can insert/update/delete subscriptions (managed by Stripe webhooks)
CREATE POLICY "Service role manages subscriptions" ON subscriptions
  FOR ALL USING (auth.role() = 'service_role');

-- =============================================================================
-- ENHANCED_WATCHLISTS TABLE POLICIES
-- =============================================================================
-- Enable RLS if not already enabled
ALTER TABLE enhanced_watchlists ENABLE ROW LEVEL SECURITY;

-- Users can view their own enhanced watchlists
CREATE POLICY "Users can view own enhanced watchlists" ON enhanced_watchlists
  FOR SELECT USING (auth.uid()::text = user_id);

-- Users can create their own enhanced watchlists
CREATE POLICY "Users can create own enhanced watchlists" ON enhanced_watchlists
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Users can update their own enhanced watchlists
CREATE POLICY "Users can update own enhanced watchlists" ON enhanced_watchlists
  FOR UPDATE USING (auth.uid()::text = user_id);

-- Users can delete their own enhanced watchlists
CREATE POLICY "Users can delete own enhanced watchlists" ON enhanced_watchlists
  FOR DELETE USING (auth.uid()::text = user_id);

-- Public watchlists can be viewed by anyone
CREATE POLICY "Public watchlists are viewable by all" ON enhanced_watchlists
  FOR SELECT USING (is_public = true);

-- =============================================================================
-- PORTFOLIO_HOLDINGS TABLE POLICIES (enhanced version)
-- =============================================================================
-- Enable RLS if not already enabled
ALTER TABLE portfolio_holdings ENABLE ROW LEVEL SECURITY;

-- Users can view holdings in their portfolios
CREATE POLICY "Users can view own portfolio holdings" ON portfolio_holdings
  FOR SELECT USING (
    portfolio_id IN (
      SELECT id FROM portfolios WHERE user_id = auth.uid()
    )
  );

-- Users can manage holdings in their portfolios
CREATE POLICY "Users can manage own portfolio holdings" ON portfolio_holdings
  FOR ALL USING (
    portfolio_id IN (
      SELECT id FROM portfolios WHERE user_id = auth.uid()
    )
  );

-- =============================================================================
-- PORTFOLIO_TRANSACTIONS TABLE POLICIES (enhanced version)
-- =============================================================================
-- Enable RLS if not already enabled
ALTER TABLE portfolio_transactions ENABLE ROW LEVEL SECURITY;

-- Users can view transactions in their portfolios
CREATE POLICY "Users can view own portfolio transactions" ON portfolio_transactions
  FOR SELECT USING (
    portfolio_id IN (
      SELECT id FROM portfolios WHERE user_id = auth.uid()
    )
  );

-- Users can manage transactions in their portfolios
CREATE POLICY "Users can manage own portfolio transactions" ON portfolio_transactions
  FOR ALL USING (
    portfolio_id IN (
      SELECT id FROM portfolios WHERE user_id = auth.uid()
    )
  );

-- =============================================================================
-- API_USAGE_LOGS TABLE POLICIES
-- =============================================================================
-- Enable RLS if not already enabled
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own API usage
CREATE POLICY "Users can view own API usage" ON api_usage_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can manage all API logs
CREATE POLICY "Service role manages API logs" ON api_usage_logs
  FOR ALL USING (auth.role() = 'service_role');

-- =============================================================================
-- AUDIT_LOGS TABLE POLICIES
-- =============================================================================
-- Enable RLS if not already enabled
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own audit logs (for transparency)
CREATE POLICY "Users can view own audit logs" ON audit_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Only service role can create/manage audit logs
CREATE POLICY "Service role manages audit logs" ON audit_logs
  FOR ALL USING (auth.role() = 'service_role');

-- =============================================================================
-- DATA_ACCESS_LOGS TABLE POLICIES
-- =============================================================================
-- Enable RLS if not already enabled
ALTER TABLE data_access_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own data access logs (GDPR compliance)
CREATE POLICY "Users can view own data access logs" ON data_access_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Only service role can create/manage data access logs
CREATE POLICY "Service role manages data access logs" ON data_access_logs
  FOR ALL USING (auth.role() = 'service_role');

-- =============================================================================
-- SUBSCRIPTION_HISTORY TABLE POLICIES
-- =============================================================================
-- Enable RLS if not already enabled
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscription history
CREATE POLICY "Users can view own subscription history" ON subscription_history
  FOR SELECT USING (auth.uid() = user_id);

-- Only service role can manage subscription history
CREATE POLICY "Service role manages subscription history" ON subscription_history
  FOR ALL USING (auth.role() = 'service_role');

-- =============================================================================
-- USER_CONSENTS TABLE POLICIES
-- =============================================================================
-- Enable RLS if not already enabled
ALTER TABLE user_consents ENABLE ROW LEVEL SECURITY;

-- Users can view their own consent records
CREATE POLICY "Users can view own consents" ON user_consents
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create new consent records (for giving consent)
CREATE POLICY "Users can create consent records" ON user_consents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service role can manage all consent records
CREATE POLICY "Service role manages consents" ON user_consents
  FOR ALL USING (auth.role() = 'service_role');

-- =============================================================================
-- WATCHLIST_PERFORMANCE TABLE POLICIES
-- =============================================================================
-- Enable RLS if not already enabled
ALTER TABLE watchlist_performance ENABLE ROW LEVEL SECURITY;

-- Users can view performance of their watchlists
CREATE POLICY "Users can view own watchlist performance" ON watchlist_performance
  FOR SELECT USING (
    watchlist_id IN (
      SELECT id FROM enhanced_watchlists 
      WHERE user_id = auth.uid()::text
    )
  );

-- Service role can manage watchlist performance data
CREATE POLICY "Service role manages watchlist performance" ON watchlist_performance
  FOR ALL USING (auth.role() = 'service_role');

-- =============================================================================
-- PUBLIC DATA TABLES (READ-ONLY FOR ALL AUTHENTICATED USERS)
-- =============================================================================

-- Enhanced stocks - all authenticated users can read
ALTER TABLE enhanced_stocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All users can read stock data" ON enhanced_stocks
  FOR SELECT USING (auth.role() IS NOT NULL);

-- Stock fundamentals - all authenticated users can read
ALTER TABLE stock_fundamentals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All users can read stock fundamentals" ON stock_fundamentals
  FOR SELECT USING (auth.role() IS NOT NULL);

-- Subscription plans - all authenticated users can read
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All users can read subscription plans" ON subscription_plans
  FOR SELECT USING (auth.role() IS NOT NULL);

-- Cache entries - service role only
ALTER TABLE cache_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages cache" ON cache_entries
  FOR ALL USING (auth.role() = 'service_role');

-- =============================================================================
-- POLICY DOCUMENTATION
-- =============================================================================
COMMENT ON POLICY "Users can view own profile" ON users IS 
'Allows users to view their own profile data for account management';

COMMENT ON POLICY "Users can read own watchlists" ON watchlists IS 
'Ensures users can only access watchlists they created';

COMMENT ON POLICY "Users can view own portfolio holdings" ON portfolio_holdings IS 
'Restricts portfolio holdings visibility to the portfolio owner';

COMMENT ON POLICY "Public watchlists are viewable by all" ON enhanced_watchlists IS 
'Allows sharing of watchlists marked as public for community features';

COMMENT ON POLICY "All users can read stock data" ON enhanced_stocks IS 
'Stock market data is public information available to all authenticated users';

COMMENT ON POLICY "Service role manages cache" ON cache_entries IS 
'Only backend services can manage the cache to prevent tampering';

-- =============================================================================
-- VERIFICATION QUERIES (commented out, for testing purposes)
-- =============================================================================
-- To verify policies are working correctly, you can run these queries:
-- 
-- -- Check if user can see only their own watchlists:
-- SELECT * FROM watchlists WHERE user_id = auth.uid();
-- 
-- -- Check if user can see public watchlists:
-- SELECT * FROM enhanced_watchlists WHERE is_public = true;
-- 
-- -- Verify portfolio isolation:
-- SELECT * FROM portfolios WHERE user_id = auth.uid();
-- 
-- -- Ensure stock data is accessible:
-- SELECT * FROM enhanced_stocks LIMIT 10;