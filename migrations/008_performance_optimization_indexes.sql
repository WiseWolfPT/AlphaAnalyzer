-- =============================================================================
-- Performance Optimization Migration: Composite Indexes and Query Optimization
-- Target: Support 100+ concurrent users efficiently
-- Created: 2025-07-07 by Database Optimization Agent
-- =============================================================================

-- UP

-- =============================================================================
-- COMPOSITE INDEXES FOR FREQUENT QUERY PATTERNS
-- =============================================================================

-- Portfolio Performance Queries (Critical for Dashboard)
-- Query pattern: SELECT * FROM transactions WHERE portfolio_id = ? AND date BETWEEN ? AND ? ORDER BY date DESC
CREATE INDEX IF NOT EXISTS idx_transactions_portfolio_date_desc 
ON portfolio_transactions(portfolio_id, transaction_date DESC, transaction_type);

-- Watchlist Stock Queries with Real-time Data Join
-- Query pattern: JOIN watchlist_stocks ws ON portfolios/stocks 
CREATE INDEX IF NOT EXISTS idx_watchlist_stocks_composite 
ON watchlist_stocks(watchlist_id, stock_symbol, added_at DESC);

-- User Activity Composite Index
-- Query pattern: All user-related data queries (portfolios, watchlists, transactions)
CREATE INDEX IF NOT EXISTS idx_portfolios_user_active 
ON portfolios(user_id, created_at DESC) WHERE is_active = 1;

CREATE INDEX IF NOT EXISTS idx_watchlists_user_active 
ON watchlists(user_id, created_at DESC) WHERE is_active = 1;

-- =============================================================================
-- STOCK DATA OPTIMIZATION INDEXES
-- =============================================================================

-- Stock Price History Queries (Charts and Analysis)
-- Query pattern: SELECT * FROM stock_prices WHERE symbol = ? AND date >= ? ORDER BY date
CREATE INDEX IF NOT EXISTS idx_stock_prices_symbol_date_range 
ON stock_prices(symbol, date DESC, close, volume);

-- Stock Fundamentals with Market Cap Filtering
-- Query pattern: SELECT * FROM stock_fundamentals WHERE market_cap > ? ORDER BY pe_ratio
CREATE INDEX IF NOT EXISTS idx_stock_fundamentals_market_cap_pe 
ON stock_fundamentals(market_cap DESC, pe_ratio ASC, last_updated DESC);

-- Stock Sector Performance Queries
-- Query pattern: SELECT * FROM stocks WHERE sector = ? ORDER BY market_cap DESC
CREATE INDEX IF NOT EXISTS idx_stocks_sector_market_cap 
ON stocks(sector, market_cap DESC, is_active) WHERE is_active = 1;

-- =============================================================================
-- API CACHE AND USAGE OPTIMIZATION
-- =============================================================================

-- API Cache Lookups (High Frequency)
-- Query pattern: SELECT * FROM api_cache WHERE cache_key = ? AND expires_at > NOW()
CREATE INDEX IF NOT EXISTS idx_api_cache_key_expires 
ON api_cache(cache_key, expires_at DESC) WHERE expires_at > CURRENT_TIMESTAMP;

-- API Usage Analytics and Rate Limiting
-- Query pattern: SELECT COUNT(*) FROM api_usage WHERE provider = ? AND created_at >= ?
CREATE INDEX IF NOT EXISTS idx_api_usage_provider_time 
ON api_usage(provider, created_at DESC, user_id);

-- API Usage by User (Rate Limiting)
-- Query pattern: SELECT COUNT(*) FROM api_usage WHERE user_id = ? AND created_at >= ?
CREATE INDEX IF NOT EXISTS idx_api_usage_user_time 
ON api_usage(user_id, created_at DESC, provider);

-- =============================================================================
-- SESSION AND SECURITY OPTIMIZATION
-- =============================================================================

-- User Session Lookups (Authentication)
-- Query pattern: SELECT * FROM user_sessions WHERE session_token = ? AND expires_at > NOW()
CREATE INDEX IF NOT EXISTS idx_user_sessions_token_expires 
ON user_sessions(session_token, expires_at DESC) WHERE expires_at > CURRENT_TIMESTAMP;

-- Security Audit Queries
-- Query pattern: SELECT * FROM audit_logs WHERE user_id = ? AND created_at >= ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_time 
ON audit_logs(user_id, created_at DESC, action);

-- =============================================================================
-- TRANSCRIPT AND CONTENT OPTIMIZATION
-- =============================================================================

-- Transcript Search and Discovery
-- Query pattern: SELECT * FROM transcripts WHERE ticker = ? AND status = 'published' ORDER BY year DESC, quarter DESC
CREATE INDEX IF NOT EXISTS idx_transcripts_ticker_status_date 
ON transcripts(ticker, status, year DESC, quarter DESC, published_at DESC) 
WHERE status = 'published';

-- Latest Published Transcripts (Homepage)
-- Query pattern: SELECT * FROM transcripts WHERE status = 'published' ORDER BY published_at DESC LIMIT 10
CREATE INDEX IF NOT EXISTS idx_transcripts_published_recent 
ON transcripts(status, published_at DESC, view_count DESC) 
WHERE status = 'published';

-- =============================================================================
-- PORTFOLIO HOLDINGS OPTIMIZATION  
-- =============================================================================

-- Current Holdings Calculation (Critical for Portfolio Value)
-- Query pattern: Complex aggregation to calculate current positions
CREATE INDEX IF NOT EXISTS idx_portfolio_holdings_symbol_date 
ON portfolio_holdings(portfolio_id, stock_symbol, updated_at DESC);

-- Holdings with Average Price Calculation
-- Query pattern: SELECT stock_symbol, SUM(quantity), AVG(average_price) FROM portfolio_holdings WHERE portfolio_id = ? GROUP BY stock_symbol
CREATE INDEX IF NOT EXISTS idx_portfolio_holdings_aggregation 
ON portfolio_holdings(portfolio_id, stock_symbol, quantity, average_price);

-- =============================================================================
-- USER PREFERENCES AND SETTINGS
-- =============================================================================

-- User Settings Lookups
-- Query pattern: SELECT * FROM user_preferences WHERE user_id = ? AND category = ?
CREATE INDEX IF NOT EXISTS idx_user_preferences_category 
ON user_preferences(user_id, category, key);

-- =============================================================================
-- VACUUM AND STATISTICS UPDATE
-- =============================================================================

-- Update table statistics for query planner optimization
ANALYZE users;
ANALYZE stocks;
ANALYZE watchlists;
ANALYZE watchlist_stocks;
ANALYZE portfolios;
ANALYZE portfolio_holdings;
ANALYZE portfolio_transactions;
ANALYZE stock_prices;
ANALYZE stock_fundamentals;
ANALYZE api_cache;
ANALYZE api_usage;

-- =============================================================================
-- PERFORMANCE MONITORING QUERIES
-- =============================================================================

-- Add comments for monitoring these indexes
COMMENT ON INDEX idx_transactions_portfolio_date_desc IS 'Critical for portfolio dashboard performance - monitors transaction history efficiently';
COMMENT ON INDEX idx_watchlist_stocks_composite IS 'Optimizes watchlist real-time data joins';
COMMENT ON INDEX idx_stock_prices_symbol_date_range IS 'Essential for chart data queries and price history';
COMMENT ON INDEX idx_api_cache_key_expires IS 'High-frequency cache lookups for API rate limiting';

-- DOWN
DROP INDEX IF EXISTS idx_transactions_portfolio_date_desc;
DROP INDEX IF EXISTS idx_watchlist_stocks_composite;
DROP INDEX IF EXISTS idx_portfolios_user_active;
DROP INDEX IF EXISTS idx_watchlists_user_active;
DROP INDEX IF EXISTS idx_stock_prices_symbol_date_range;
DROP INDEX IF EXISTS idx_stock_fundamentals_market_cap_pe;
DROP INDEX IF EXISTS idx_stocks_sector_market_cap;
DROP INDEX IF EXISTS idx_api_cache_key_expires;
DROP INDEX IF EXISTS idx_api_usage_provider_time;
DROP INDEX IF EXISTS idx_api_usage_user_time;
DROP INDEX IF EXISTS idx_user_sessions_token_expires;
DROP INDEX IF EXISTS idx_audit_logs_user_time;
DROP INDEX IF EXISTS idx_transcripts_ticker_status_date;
DROP INDEX IF EXISTS idx_transcripts_published_recent;
DROP INDEX IF EXISTS idx_portfolio_holdings_symbol_date;
DROP INDEX IF EXISTS idx_portfolio_holdings_aggregation;
DROP INDEX IF EXISTS idx_user_preferences_category;