-- ====================================================================
-- SUPABASE CACHE SCHEMA FOR ALFALYZER
-- ====================================================================
-- This schema creates the necessary tables for caching market data
-- to reduce API calls and improve performance
-- ====================================================================

-- Create a separate schema for cache tables
CREATE SCHEMA IF NOT EXISTS cache;

-- ====================================================================
-- 1. STOCK QUOTES CACHE TABLE
-- ====================================================================
-- Stores individual stock quotes with TTL
CREATE TABLE IF NOT EXISTS cache.stock_quotes (
  id BIGSERIAL PRIMARY KEY,
  symbol VARCHAR(10) NOT NULL,
  quote_data JSONB NOT NULL,
  provider VARCHAR(50),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(symbol)
);

-- Create indexes for performance
CREATE INDEX idx_stock_quotes_symbol ON cache.stock_quotes(symbol);
CREATE INDEX idx_stock_quotes_expires_at ON cache.stock_quotes(expires_at);
CREATE INDEX idx_stock_quotes_provider ON cache.stock_quotes(provider);

-- ====================================================================
-- 2. BATCH QUOTES CACHE TABLE
-- ====================================================================
-- Stores batch quote requests to optimize multiple symbol lookups
CREATE TABLE IF NOT EXISTS cache.batch_quotes (
  id BIGSERIAL PRIMARY KEY,
  symbols_hash VARCHAR(64) NOT NULL, -- MD5 hash of sorted symbols array
  symbols TEXT[] NOT NULL,
  quotes_data JSONB NOT NULL,
  provider VARCHAR(50),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(symbols_hash)
);

-- Create indexes
CREATE INDEX idx_batch_quotes_symbols_hash ON cache.batch_quotes(symbols_hash);
CREATE INDEX idx_batch_quotes_expires_at ON cache.batch_quotes(expires_at);

-- ====================================================================
-- 3. MARKET STATUS CACHE TABLE
-- ====================================================================
-- Stores market open/close status
CREATE TABLE IF NOT EXISTS cache.market_status (
  id BIGSERIAL PRIMARY KEY,
  market VARCHAR(10) NOT NULL DEFAULT 'US',
  status_data JSONB NOT NULL,
  provider VARCHAR(50),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(market)
);

-- Create indexes
CREATE INDEX idx_market_status_market ON cache.market_status(market);
CREATE INDEX idx_market_status_expires_at ON cache.market_status(expires_at);

-- ====================================================================
-- 4. CHART DATA CACHE TABLE
-- ====================================================================
-- Stores historical chart data for different time periods
CREATE TABLE IF NOT EXISTS cache.chart_data (
  id BIGSERIAL PRIMARY KEY,
  symbol VARCHAR(10) NOT NULL,
  period VARCHAR(10) NOT NULL, -- '1D', '1W', '1M', '3M', '1Y'
  chart_data JSONB NOT NULL,
  provider VARCHAR(50),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(symbol, period)
);

-- Create indexes
CREATE INDEX idx_chart_data_symbol_period ON cache.chart_data(symbol, period);
CREATE INDEX idx_chart_data_expires_at ON cache.chart_data(expires_at);

-- ====================================================================
-- 5. API QUOTA TRACKING TABLE
-- ====================================================================
-- Tracks API usage to prevent quota exhaustion
CREATE TABLE IF NOT EXISTS cache.api_quota_usage (
  id BIGSERIAL PRIMARY KEY,
  provider VARCHAR(50) NOT NULL,
  endpoint VARCHAR(100) NOT NULL,
  request_count INTEGER DEFAULT 0,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider, endpoint, period_start)
);

-- Create indexes
CREATE INDEX idx_api_quota_provider_period ON cache.api_quota_usage(provider, period_start, period_end);

-- ====================================================================
-- HELPER FUNCTIONS
-- ====================================================================

-- Function to clean up expired cache entries
CREATE OR REPLACE FUNCTION cache.cleanup_expired_entries()
RETURNS void AS $$
BEGIN
  DELETE FROM cache.stock_quotes WHERE expires_at < NOW();
  DELETE FROM cache.batch_quotes WHERE expires_at < NOW();
  DELETE FROM cache.market_status WHERE expires_at < NOW();
  DELETE FROM cache.chart_data WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to get cache statistics
CREATE OR REPLACE FUNCTION cache.get_cache_stats()
RETURNS TABLE (
  table_name TEXT,
  total_entries BIGINT,
  expired_entries BIGINT,
  cache_hit_potential NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'stock_quotes'::TEXT,
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE expires_at < NOW())::BIGINT,
    ROUND(100.0 * COUNT(*) FILTER (WHERE expires_at > NOW()) / NULLIF(COUNT(*), 0), 2)
  FROM cache.stock_quotes
  UNION ALL
  SELECT 
    'batch_quotes'::TEXT,
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE expires_at < NOW())::BIGINT,
    ROUND(100.0 * COUNT(*) FILTER (WHERE expires_at > NOW()) / NULLIF(COUNT(*), 0), 2)
  FROM cache.batch_quotes
  UNION ALL
  SELECT 
    'market_status'::TEXT,
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE expires_at < NOW())::BIGINT,
    ROUND(100.0 * COUNT(*) FILTER (WHERE expires_at > NOW()) / NULLIF(COUNT(*), 0), 2)
  FROM cache.market_status
  UNION ALL
  SELECT 
    'chart_data'::TEXT,
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE expires_at < NOW())::BIGINT,
    ROUND(100.0 * COUNT(*) FILTER (WHERE expires_at > NOW()) / NULLIF(COUNT(*), 0), 2)
  FROM cache.chart_data;
END;
$$ LANGUAGE plpgsql;

-- ====================================================================
-- ROW LEVEL SECURITY (RLS)
-- ====================================================================
-- Enable RLS on all cache tables
ALTER TABLE cache.stock_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cache.batch_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cache.market_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE cache.chart_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE cache.api_quota_usage ENABLE ROW LEVEL SECURITY;

-- Create policies for service role access (backend)
-- Note: These policies allow full access to service role while blocking direct access

-- Stock quotes policies
CREATE POLICY "Service role can manage stock quotes" ON cache.stock_quotes
  FOR ALL USING (auth.role() = 'service_role');

-- Batch quotes policies
CREATE POLICY "Service role can manage batch quotes" ON cache.batch_quotes
  FOR ALL USING (auth.role() = 'service_role');

-- Market status policies
CREATE POLICY "Service role can manage market status" ON cache.market_status
  FOR ALL USING (auth.role() = 'service_role');

-- Chart data policies
CREATE POLICY "Service role can manage chart data" ON cache.chart_data
  FOR ALL USING (auth.role() = 'service_role');

-- API quota policies
CREATE POLICY "Service role can manage API quota" ON cache.api_quota_usage
  FOR ALL USING (auth.role() = 'service_role');

-- ====================================================================
-- REALTIME PUBLICATION
-- ====================================================================
-- Enable realtime for stock quotes updates
ALTER PUBLICATION supabase_realtime ADD TABLE cache.stock_quotes;

-- ====================================================================
-- SCHEDULED CLEANUP (TO BE CONFIGURED IN SUPABASE DASHBOARD)
-- ====================================================================
-- Run this function every hour to clean up expired entries:
-- SELECT cache.cleanup_expired_entries();

-- ====================================================================
-- GRANTS
-- ====================================================================
-- Grant usage on schema to authenticated users (for future direct access)
GRANT USAGE ON SCHEMA cache TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA cache TO authenticated;

-- Grant all privileges to service role
GRANT ALL ON SCHEMA cache TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA cache TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA cache TO service_role;

-- ====================================================================
-- COMMENTS FOR DOCUMENTATION
-- ====================================================================
COMMENT ON SCHEMA cache IS 'Cache schema for market data to reduce external API calls';
COMMENT ON TABLE cache.stock_quotes IS 'Caches individual stock quote data with TTL';
COMMENT ON TABLE cache.batch_quotes IS 'Caches batch quote requests for multiple symbols';
COMMENT ON TABLE cache.market_status IS 'Caches market open/close status';
COMMENT ON TABLE cache.chart_data IS 'Caches historical chart data for different time periods';
COMMENT ON TABLE cache.api_quota_usage IS 'Tracks API usage to prevent quota exhaustion';