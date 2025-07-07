-- =============================================================================
-- Materialized Views for Dashboard Performance Optimization
-- Target: Pre-calculated aggregations for heavy dashboard queries
-- Created: 2025-07-07 by Database Optimization Agent
-- =============================================================================

-- UP

-- =============================================================================
-- PORTFOLIO PERFORMANCE MATERIALIZED VIEW
-- =============================================================================
-- Pre-calculate portfolio performance metrics to avoid real-time aggregations
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_portfolio_performance AS
SELECT 
    p.id as portfolio_id,
    p.user_id,
    p.name as portfolio_name,
    p.currency,
    COUNT(DISTINCT ph.stock_symbol) as total_holdings,
    SUM(ph.quantity * ph.average_price) as invested_amount,
    SUM(ph.quantity * COALESCE(sf.market_cap / 1000000, ph.average_price)) as current_value,
    CASE 
        WHEN SUM(ph.quantity * ph.average_price) > 0 THEN
            ((SUM(ph.quantity * COALESCE(sf.market_cap / 1000000, ph.average_price)) / SUM(ph.quantity * ph.average_price)) - 1) * 100
        ELSE 0 
    END as performance_percent,
    COUNT(pt.id) as total_transactions,
    COALESCE(SUM(CASE WHEN pt.transaction_type = 'buy' THEN pt.total_amount ELSE 0 END), 0) as total_invested,
    COALESCE(SUM(CASE WHEN pt.transaction_type = 'sell' THEN pt.total_amount ELSE 0 END), 0) as total_divested,
    MAX(pt.transaction_date) as last_transaction_date,
    p.updated_at as last_portfolio_update
FROM portfolios p
LEFT JOIN portfolio_holdings ph ON p.id = ph.portfolio_id
LEFT JOIN portfolio_transactions pt ON p.id = pt.portfolio_id  
LEFT JOIN stock_fundamentals sf ON ph.stock_symbol = sf.symbol
WHERE p.is_active = 1
GROUP BY p.id, p.user_id, p.name, p.currency, p.updated_at;

-- Create indexes on the materialized view for fast lookups
CREATE INDEX IF NOT EXISTS idx_mv_portfolio_performance_user ON mv_portfolio_performance(user_id, performance_percent DESC);
CREATE INDEX IF NOT EXISTS idx_mv_portfolio_performance_portfolio ON mv_portfolio_performance(portfolio_id);

-- =============================================================================
-- USER DASHBOARD METRICS MATERIALIZED VIEW  
-- =============================================================================
-- Aggregate all user metrics for dashboard in a single query
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_user_dashboard_metrics AS
SELECT 
    u.id as user_id,
    u.email,
    -- Portfolio Metrics
    COUNT(DISTINCT p.id) as total_portfolios,
    COALESCE(SUM(pp.invested_amount), 0) as total_invested,
    COALESCE(SUM(pp.current_value), 0) as total_current_value,
    CASE 
        WHEN COALESCE(SUM(pp.invested_amount), 0) > 0 THEN
            ((COALESCE(SUM(pp.current_value), 0) / COALESCE(SUM(pp.invested_amount), 1)) - 1) * 100
        ELSE 0 
    END as overall_performance_percent,
    
    -- Watchlist Metrics
    COUNT(DISTINCT w.id) as total_watchlists,
    COUNT(DISTINCT wi.stock_symbol) as total_watched_stocks,
    
    -- Activity Metrics
    COUNT(DISTINCT pt.id) as total_transactions,
    MAX(GREATEST(
        COALESCE(p.updated_at, '1970-01-01'::timestamp),
        COALESCE(w.updated_at, '1970-01-01'::timestamp), 
        COALESCE(pt.created_at, '1970-01-01'::timestamp)
    )) as last_activity,
    
    -- Account Info
    u.created_at as member_since,
    u.updated_at as profile_updated
FROM users u
LEFT JOIN portfolios p ON u.id = p.user_id AND p.is_active = 1
LEFT JOIN mv_portfolio_performance pp ON p.id = pp.portfolio_id
LEFT JOIN watchlists w ON u.id = w.user_id AND w.is_active = 1  
LEFT JOIN watchlist_items wi ON w.id = wi.watchlist_id
LEFT JOIN portfolio_transactions pt ON p.id = pt.portfolio_id
WHERE u.is_active = 1
GROUP BY u.id, u.email, u.created_at, u.updated_at;

-- Create indexes for fast user dashboard lookups
CREATE INDEX IF NOT EXISTS idx_mv_user_dashboard_metrics_user ON mv_user_dashboard_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_mv_user_dashboard_metrics_performance ON mv_user_dashboard_metrics(overall_performance_percent DESC);

-- =============================================================================
-- MARKET OVERVIEW STATISTICS MATERIALIZED VIEW
-- =============================================================================
-- Market-wide statistics for the main dashboard
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_market_overview_stats AS
SELECT 
    -- Stock Universe Stats
    COUNT(DISTINCT s.symbol) as total_stocks,
    COUNT(DISTINCT s.sector) as total_sectors,
    AVG(sf.market_cap) as avg_market_cap,
    
    -- Price Movement Stats (from recent stock_prices)
    COUNT(CASE WHEN sp.close > sp.open THEN 1 END) as stocks_up,
    COUNT(CASE WHEN sp.close < sp.open THEN 1 END) as stocks_down,
    COUNT(CASE WHEN sp.close = sp.open THEN 1 END) as stocks_unchanged,
    
    -- Volume Stats
    SUM(sp.volume) as total_volume,
    AVG(sp.volume) as avg_volume,
    
    -- Platform Activity Stats
    COUNT(DISTINCT pt.user_id) as active_investors,
    COUNT(pt.id) as total_transactions_today,
    SUM(CASE WHEN pt.transaction_type = 'buy' THEN pt.total_amount ELSE 0 END) as total_bought_today,
    SUM(CASE WHEN pt.transaction_type = 'sell' THEN pt.total_amount ELSE 0 END) as total_sold_today,
    
    -- Most Active Stocks
    (SELECT json_agg(
        json_build_object(
            'symbol', symbol,
            'transaction_count', transaction_count
        )
    ) FROM (
        SELECT pt.stock_symbol as symbol, COUNT(*) as transaction_count
        FROM portfolio_transactions pt 
        WHERE pt.created_at >= CURRENT_DATE
        GROUP BY pt.stock_symbol
        ORDER BY COUNT(*) DESC
        LIMIT 10
    ) top_stocks) as most_active_stocks,
    
    -- Top Sectors by Volume
    (SELECT json_agg(
        json_build_object(
            'sector', sector,
            'total_volume', total_volume
        )
    ) FROM (
        SELECT s.sector, SUM(sp.volume) as total_volume
        FROM stocks s
        JOIN stock_prices sp ON s.symbol = sp.symbol
        WHERE sp.date = CURRENT_DATE
        GROUP BY s.sector
        ORDER BY SUM(sp.volume) DESC
        LIMIT 10
    ) top_sectors) as top_sectors_by_volume,
    
    -- Last Update
    NOW() as last_updated
FROM stocks s
LEFT JOIN stock_fundamentals sf ON s.symbol = sf.symbol
LEFT JOIN stock_prices sp ON s.symbol = sp.symbol AND sp.date = CURRENT_DATE
LEFT JOIN portfolio_transactions pt ON s.symbol = pt.stock_symbol AND pt.created_at >= CURRENT_DATE
WHERE s.is_active = 1;

-- =============================================================================
-- POPULAR STOCKS TRACKING MATERIALIZED VIEW
-- =============================================================================
-- Track stock popularity across watchlists and portfolios
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_popular_stocks AS
SELECT 
    s.symbol,
    s.name,
    s.sector,
    s.market_cap,
    
    -- Watchlist Popularity
    COUNT(DISTINCT wi.watchlist_id) as watchlist_count,
    COUNT(DISTINCT w.user_id) as watching_users,
    
    -- Portfolio Popularity  
    COUNT(DISTINCT ph.portfolio_id) as portfolio_count,
    COUNT(DISTINCT p.user_id) as holding_users,
    SUM(ph.quantity) as total_shares_held,
    
    -- Transaction Activity (last 30 days)
    COUNT(CASE WHEN pt.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as recent_transactions,
    SUM(CASE WHEN pt.transaction_type = 'buy' AND pt.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN pt.quantity ELSE 0 END) as recent_shares_bought,
    SUM(CASE WHEN pt.transaction_type = 'sell' AND pt.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN pt.quantity ELSE 0 END) as recent_shares_sold,
    
    -- Popularity Score (combination of all factors)
    (
        (COUNT(DISTINCT wi.watchlist_id) * 2) +
        (COUNT(DISTINCT ph.portfolio_id) * 3) +
        (COUNT(CASE WHEN pt.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) * 1)
    ) as popularity_score,
    
    -- Price Data (latest)
    sp.close as latest_price,
    sp.volume as latest_volume,
    sp.date as price_date,
    
    NOW() as last_updated
FROM stocks s
LEFT JOIN watchlist_items wi ON s.symbol = wi.symbol
LEFT JOIN watchlists w ON wi.watchlist_id = w.id AND w.is_active = 1
LEFT JOIN portfolio_holdings ph ON s.symbol = ph.stock_symbol  
LEFT JOIN portfolios p ON ph.portfolio_id = p.id AND p.is_active = 1
LEFT JOIN portfolio_transactions pt ON s.symbol = pt.stock_symbol
LEFT JOIN stock_prices sp ON s.symbol = sp.symbol AND sp.date = CURRENT_DATE
WHERE s.is_active = 1
GROUP BY s.symbol, s.name, s.sector, s.market_cap, sp.close, sp.volume, sp.date
HAVING (
    COUNT(DISTINCT wi.watchlist_id) > 0 OR 
    COUNT(DISTINCT ph.portfolio_id) > 0 OR
    COUNT(CASE WHEN pt.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) > 0
)
ORDER BY popularity_score DESC;

-- Create indexes for popular stocks queries
CREATE INDEX IF NOT EXISTS idx_mv_popular_stocks_popularity ON mv_popular_stocks(popularity_score DESC, symbol);
CREATE INDEX IF NOT EXISTS idx_mv_popular_stocks_sector ON mv_popular_stocks(sector, popularity_score DESC);

-- =============================================================================
-- REFRESH POLICIES AND TRIGGERS
-- =============================================================================

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_dashboard_materialized_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_portfolio_performance;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_dashboard_metrics;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_market_overview_stats;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_popular_stocks;
    
    RAISE NOTICE 'Dashboard materialized views refreshed successfully';
END;
$$ LANGUAGE plpgsql;

-- Schedule automatic refresh every 5 minutes for real-time dashboards
-- Note: This requires pg_cron extension in production
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('refresh-dashboard-views', '*/5 * * * *', 'SELECT refresh_dashboard_materialized_views();');

-- =============================================================================
-- MANUAL REFRESH TRIGGERS (For Development)
-- =============================================================================

-- Trigger to refresh views when critical data changes
CREATE OR REPLACE FUNCTION trigger_dashboard_refresh()
RETURNS trigger AS $$
BEGIN
    -- Only refresh if significant data changed
    IF TG_TABLE_NAME IN ('portfolio_transactions', 'portfolio_holdings', 'watchlist_items') THEN
        PERFORM refresh_dashboard_materialized_views();
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to critical tables (uncomment in production)
-- CREATE TRIGGER refresh_on_transaction_change
--     AFTER INSERT OR UPDATE OR DELETE ON portfolio_transactions
--     FOR EACH STATEMENT EXECUTE FUNCTION trigger_dashboard_refresh();

-- =============================================================================
-- QUERY OPTIMIZATION HINTS
-- =============================================================================

-- Comments for developers on optimal usage
COMMENT ON MATERIALIZED VIEW mv_portfolio_performance IS 'Use for portfolio dashboards - refreshed every 5 minutes. Query by user_id for user portfolios, by portfolio_id for specific portfolio.';
COMMENT ON MATERIALIZED VIEW mv_user_dashboard_metrics IS 'Use for user dashboard overview - contains all user metrics in one query. Refresh when user data changes significantly.';
COMMENT ON MATERIALIZED VIEW mv_market_overview_stats IS 'Use for market overview widgets - contains market-wide statistics. Refresh every 5 minutes during market hours.';
COMMENT ON MATERIALIZED VIEW mv_popular_stocks IS 'Use for trending stocks features - tracks popularity across platform. Query by popularity_score DESC for trending stocks.';

-- DOWN
DROP MATERIALIZED VIEW IF EXISTS mv_popular_stocks;
DROP MATERIALIZED VIEW IF EXISTS mv_market_overview_stats;  
DROP MATERIALIZED VIEW IF EXISTS mv_user_dashboard_metrics;
DROP MATERIALIZED VIEW IF EXISTS mv_portfolio_performance;
DROP FUNCTION IF EXISTS refresh_dashboard_materialized_views();
DROP FUNCTION IF EXISTS trigger_dashboard_refresh();