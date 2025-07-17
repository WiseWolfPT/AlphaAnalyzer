-- Performance Optimization Migration - Strategic Indexes and Query Optimizations
-- This migration adds strategic indexes and optimizations for high-traffic queries

-- =============================================
-- STOCK DATA PERFORMANCE OPTIMIZATIONS
-- =============================================

-- Composite index for stock searches with price data
CREATE INDEX IF NOT EXISTS idx_stocks_symbol_sector_market_cap 
ON stocks(symbol, sector, market_cap DESC);

-- Index for stock price queries by date range
CREATE INDEX IF NOT EXISTS idx_stock_prices_symbol_date_volume 
ON stock_prices(symbol, date DESC, volume DESC);

-- Composite index for fundamentals analysis
CREATE INDEX IF NOT EXISTS idx_stock_fundamentals_symbol_updated_pe 
ON stock_fundamentals(symbol, updated_at DESC, pe_ratio);

-- =============================================
-- USER DATA PERFORMANCE OPTIMIZATIONS  
-- =============================================

-- Composite index for user authentication and session management
CREATE INDEX IF NOT EXISTS idx_users_email_status_role 
ON users(email, account_status, role);

-- Index for session lookups and cleanup
CREATE INDEX IF NOT EXISTS idx_sessions_token_expires 
ON sessions(session_token, expires_at DESC);

-- =============================================
-- PORTFOLIO & WATCHLIST OPTIMIZATIONS
-- =============================================

-- Portfolio performance queries
CREATE INDEX IF NOT EXISTS idx_portfolios_user_updated_performance 
ON portfolios(user_id, updated_at DESC, total_value DESC);

-- Portfolio holdings with performance data
CREATE INDEX IF NOT EXISTS idx_portfolio_holdings_portfolio_symbol_quantity 
ON portfolio_holdings(portfolio_id, symbol, quantity DESC, current_value DESC);

-- Transaction history by date and type
CREATE INDEX IF NOT EXISTS idx_portfolio_transactions_portfolio_date_type 
ON portfolio_transactions(portfolio_id, transaction_date DESC, transaction_type);

-- Watchlist performance queries
CREATE INDEX IF NOT EXISTS idx_watchlist_stocks_user_added 
ON watchlist_stocks(watchlist_id, added_at DESC);

-- =============================================
-- API CACHE & USAGE OPTIMIZATIONS
-- =============================================

-- API cache lookups by endpoint and freshness
CREATE INDEX IF NOT EXISTS idx_api_cache_endpoint_params_created 
ON api_cache(endpoint, cache_key, created_at DESC);

-- API usage analytics and rate limiting
CREATE INDEX IF NOT EXISTS idx_api_usage_provider_date_count 
ON api_usage(provider, date DESC, request_count DESC);

-- =============================================
-- REAL-TIME DATA OPTIMIZATIONS
-- =============================================

-- Real-time quotes by symbol and freshness
CREATE INDEX IF NOT EXISTS idx_real_time_quotes_symbol_updated_price 
ON real_time_quotes(symbol, updated_at DESC, price);

-- WebSocket connections by status and activity
CREATE INDEX IF NOT EXISTS idx_websocket_connections_status_connected_active 
ON websocket_connections(status, connected_at DESC, last_ping DESC);

-- Active subscriptions for monitoring
CREATE INDEX IF NOT EXISTS idx_websocket_subscriptions_active_symbol_updated 
ON websocket_subscriptions(is_active, symbol, last_update DESC);

-- WebSocket metrics for analytics
CREATE INDEX IF NOT EXISTS idx_websocket_metrics_type_timestamp_value 
ON websocket_metrics(metric_type, timestamp DESC, value);

-- =============================================
-- AUDIT & MONITORING OPTIMIZATIONS
-- =============================================

-- Audit log queries by user and date
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_timestamp_action 
ON audit_logs(user_id, timestamp DESC, action);

-- System alerts by status and priority
CREATE INDEX IF NOT EXISTS idx_alerts_status_priority_created 
ON alerts(status, priority DESC, created_at DESC);

-- Notification performance
CREATE INDEX IF NOT EXISTS idx_notification_log_user_sent_type 
ON notification_log(user_id, sent_at DESC, notification_type);

-- =============================================
-- TRANSCRIPT & CONTENT OPTIMIZATIONS
-- =============================================

-- Transcript searches by company and date
CREATE INDEX IF NOT EXISTS idx_transcripts_symbol_date_status 
ON transcripts(ticker, call_date DESC, status);

-- Full-text search optimization (if supported)
-- Note: SQLite FTS would require separate tables, keeping simple for now
CREATE INDEX IF NOT EXISTS idx_transcripts_company_quarter_year 
ON transcripts(company_name, year DESC, quarter);

-- =============================================
-- PERFORMANCE ANALYSIS VIEWS
-- =============================================

-- Create materialized view for popular stocks (updated periodically)
DROP VIEW IF EXISTS popular_stocks_view;
CREATE VIEW popular_stocks_view AS
SELECT 
  s.symbol,
  s.company_name,
  s.sector,
  s.market_cap,
  COUNT(DISTINCT ws.watchlist_id) as watchlist_count,
  COUNT(DISTINCT ph.portfolio_id) as portfolio_count,
  MAX(rtq.updated_at) as last_price_update,
  rtq.price as current_price,
  rtq.change_percent as daily_change
FROM stocks s
LEFT JOIN watchlist_stocks ws ON s.symbol = ws.symbol
LEFT JOIN portfolio_holdings ph ON s.symbol = ph.symbol
LEFT JOIN real_time_quotes rtq ON s.symbol = rtq.symbol
GROUP BY s.symbol, s.company_name, s.sector, s.market_cap, rtq.price, rtq.change_percent
HAVING (watchlist_count > 0 OR portfolio_count > 0)
ORDER BY (watchlist_count + portfolio_count) DESC, s.market_cap DESC;

-- User activity summary view
DROP VIEW IF EXISTS user_activity_summary;
CREATE VIEW user_activity_summary AS
SELECT 
  u.id as user_id,
  u.email,
  u.role,
  COUNT(DISTINCT p.id) as portfolio_count,
  COUNT(DISTINCT w.id) as watchlist_count,
  COUNT(DISTINCT pt.id) as transaction_count,
  MAX(al.timestamp) as last_activity,
  SUM(p.total_value) as total_portfolio_value
FROM users u
LEFT JOIN portfolios p ON u.id = p.user_id
LEFT JOIN watchlists w ON u.id = w.user_id
LEFT JOIN portfolio_transactions pt ON p.id = pt.portfolio_id
LEFT JOIN audit_logs al ON u.id = al.user_id
GROUP BY u.id, u.email, u.role
ORDER BY last_activity DESC;

-- API performance summary view
DROP VIEW IF EXISTS api_performance_summary;
CREATE VIEW api_performance_summary AS
SELECT 
  au.provider,
  au.endpoint,
  COUNT(*) as total_requests,
  SUM(au.request_count) as total_request_count,
  AVG(au.response_time) as avg_response_time,
  SUM(CASE WHEN au.status_code >= 400 THEN 1 ELSE 0 END) as error_count,
  MAX(au.date) as last_used,
  COUNT(DISTINCT DATE(au.date)) as days_active
FROM api_usage au
WHERE au.date >= DATE('now', '-30 days')
GROUP BY au.provider, au.endpoint
ORDER BY total_request_count DESC, avg_response_time ASC;

-- =============================================
-- PERFORMANCE OPTIMIZATION FUNCTIONS
-- =============================================

-- Note: SQLite doesn't support stored procedures, but we can create helper views
-- for common queries that benefit from the new indexes

-- Most active stocks (for caching)
DROP VIEW IF EXISTS most_active_stocks;
CREATE VIEW most_active_stocks AS
SELECT 
  rtq.symbol,
  rtq.price,
  rtq.change_percent,
  rtq.volume,
  rtq.updated_at,
  s.company_name,
  s.sector,
  COUNT(DISTINCT ws.watchlist_id) + COUNT(DISTINCT ph.portfolio_id) as popularity_score
FROM real_time_quotes rtq
JOIN stocks s ON rtq.symbol = s.symbol
LEFT JOIN watchlist_stocks ws ON s.symbol = ws.symbol
LEFT JOIN portfolio_holdings ph ON s.symbol = ph.symbol
WHERE rtq.updated_at >= DATETIME('now', '-1 hour')
GROUP BY rtq.symbol, rtq.price, rtq.change_percent, rtq.volume, rtq.updated_at, s.company_name, s.sector
ORDER BY popularity_score DESC, rtq.volume DESC
LIMIT 50;

-- Recent user portfolio performance
DROP VIEW IF EXISTS recent_portfolio_performance;
CREATE VIEW recent_portfolio_performance AS
SELECT 
  p.id as portfolio_id,
  p.user_id,
  p.name,
  p.total_value,
  p.daily_change,
  p.total_change_percent,
  p.updated_at,
  COUNT(ph.id) as holdings_count,
  SUM(ph.current_value) as calculated_value
FROM portfolios p
LEFT JOIN portfolio_holdings ph ON p.id = ph.portfolio_id
WHERE p.updated_at >= DATETIME('now', '-24 hours')
GROUP BY p.id, p.user_id, p.name, p.total_value, p.daily_change, p.total_change_percent, p.updated_at
ORDER BY p.updated_at DESC;

-- =============================================
-- MAINTENANCE AND CLEANUP
-- =============================================

-- Analyze tables to update statistics (SQLite equivalent of PostgreSQL ANALYZE)
ANALYZE;

-- Update SQLite optimizer with fresh statistics
PRAGMA optimize;

-- Vacuum to reclaim space and optimize file structure (only in maintenance window)
-- VACUUM; -- Commented out as it can be expensive, run manually when needed

-- =============================================
-- PERFORMANCE MONITORING SETUP
-- =============================================

-- Create performance monitoring table for tracking slow queries
CREATE TABLE IF NOT EXISTS performance_monitoring (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  query_hash TEXT NOT NULL,
  query_type TEXT NOT NULL, -- 'SELECT', 'INSERT', 'UPDATE', 'DELETE'
  execution_time_ms INTEGER NOT NULL,
  rows_examined INTEGER,
  rows_returned INTEGER,
  cache_hit BOOLEAN DEFAULT FALSE,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  context TEXT,
  
  INDEX idx_performance_monitoring_timestamp_time(timestamp DESC, execution_time_ms DESC),
  INDEX idx_performance_monitoring_type_time(query_type, execution_time_ms DESC),
  INDEX idx_performance_monitoring_hash(query_hash)
);

-- Create index usage statistics table
CREATE TABLE IF NOT EXISTS index_usage_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name TEXT NOT NULL,
  index_name TEXT NOT NULL,
  usage_count INTEGER DEFAULT 0,
  last_used DATETIME DEFAULT CURRENT_TIMESTAMP,
  avg_selectivity REAL, -- How selective the index is (lower is better)
  
  UNIQUE(table_name, index_name),
  INDEX idx_index_usage_stats_table(table_name),
  INDEX idx_index_usage_stats_usage(usage_count DESC, last_used DESC)
);

-- =============================================
-- CONFIGURATION AND PRAGMA OPTIMIZATIONS
-- =============================================

-- Optimize SQLite for better performance (these should be set in the application)
-- PRAGMA journal_mode = WAL;           -- Write-Ahead Logging for better concurrency
-- PRAGMA synchronous = NORMAL;         -- Balance between safety and performance  
-- PRAGMA cache_size = -64000;          -- 64MB cache size (negative = KB)
-- PRAGMA temp_store = MEMORY;          -- Store temporary tables in memory
-- PRAGMA mmap_size = 268435456;        -- 256MB memory-mapped I/O