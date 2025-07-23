-- Enhanced Cache System for Alfalyzer
-- Implements Reddit suggestion: Backend calls APIs, stores in DB, Frontend only queries cache
-- Eliminates CORS/Auth issues definitively

-- 1. Assets Table (Master list of all tracked assets)
CREATE TABLE IF NOT EXISTS assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'stock' CHECK(type IN ('stock', 'etf', 'crypto', 'index', 'forex')),
  exchange TEXT,
  currency TEXT DEFAULT 'USD',
  sector TEXT,
  industry TEXT,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Asset Prices Table (Historical and current prices)
CREATE TABLE IF NOT EXISTS asset_prices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  price DECIMAL(20,6) NOT NULL,
  open DECIMAL(20,6),
  high DECIMAL(20,6),
  low DECIMAL(20,6),
  close DECIMAL(20,6),
  volume BIGINT,
  change DECIMAL(20,6),
  change_percent DECIMAL(10,4),
  market_cap BIGINT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  source TEXT NOT NULL,
  provider TEXT NOT NULL,
  is_realtime BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. API Providers Table (Track API health and quotas)
CREATE TABLE IF NOT EXISTS api_providers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 100,
  quota_limit INTEGER,
  quota_window TEXT, -- 'minute', 'hour', 'day', 'month'
  current_quota_used INTEGER DEFAULT 0,
  quota_reset_at TIMESTAMP WITH TIME ZONE,
  avg_response_time INTEGER, -- milliseconds
  success_rate DECIMAL(5,2), -- percentage
  last_error TEXT,
  last_error_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. API Call Logs (Detailed tracking for optimization)
CREATE TABLE IF NOT EXISTS api_call_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID REFERENCES api_providers(id),
  endpoint TEXT NOT NULL,
  method TEXT DEFAULT 'GET',
  request_params JSONB,
  response_status INTEGER,
  response_time INTEGER, -- milliseconds
  error_message TEXT,
  symbols TEXT[], -- array of symbols requested
  cost DECIMAL(10,6) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Cache Metadata Table (Track cache freshness and strategy)
CREATE TABLE IF NOT EXISTS cache_metadata (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_key TEXT NOT NULL UNIQUE,
  cache_type TEXT NOT NULL, -- 'quote', 'fundamentals', 'news', 'financials'
  symbols TEXT[],
  last_updated TIMESTAMP WITH TIME ZONE,
  update_frequency INTEGER, -- seconds
  priority INTEGER DEFAULT 100,
  is_stale BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_assets_symbol ON assets(symbol);
CREATE INDEX idx_assets_type ON assets(type);
CREATE INDEX idx_assets_active ON assets(is_active);

CREATE INDEX idx_asset_prices_asset_id ON asset_prices(asset_id);
CREATE INDEX idx_asset_prices_timestamp ON asset_prices(timestamp DESC);
CREATE INDEX idx_asset_prices_asset_timestamp ON asset_prices(asset_id, timestamp DESC);
CREATE INDEX idx_asset_prices_provider ON asset_prices(provider);

CREATE INDEX idx_api_providers_active ON api_providers(is_active);
CREATE INDEX idx_api_providers_priority ON api_providers(priority DESC);

CREATE INDEX idx_api_call_logs_provider ON api_call_logs(provider_id);
CREATE INDEX idx_api_call_logs_created ON api_call_logs(created_at DESC);
CREATE INDEX idx_api_call_logs_symbols ON api_call_logs USING GIN(symbols);

CREATE INDEX idx_cache_metadata_key ON cache_metadata(cache_key);
CREATE INDEX idx_cache_metadata_type ON cache_metadata(cache_type);
CREATE INDEX idx_cache_metadata_updated ON cache_metadata(last_updated);

-- Insert default API providers
INSERT INTO api_providers (name, priority, quota_limit, quota_window) VALUES
  ('alpha_vantage', 100, 5, 'minute'),
  ('finnhub', 90, 60, 'minute'),
  ('fmp', 80, 250, 'day'),
  ('twelve_data', 70, 800, 'day'),
  ('polygon', 60, 5, 'minute')
ON CONFLICT (name) DO NOTHING;

-- Materialized view for latest prices (ultra-fast queries)
CREATE MATERIALIZED VIEW IF NOT EXISTS latest_asset_prices AS
SELECT DISTINCT ON (a.symbol)
  a.id as asset_id,
  a.symbol,
  a.name,
  a.type,
  a.sector,
  a.industry,
  a.logo_url,
  ap.price,
  ap.change,
  ap.change_percent,
  ap.volume,
  ap.market_cap,
  ap.timestamp as last_updated,
  ap.provider,
  EXTRACT(EPOCH FROM (NOW() - ap.timestamp))::INTEGER as age_seconds
FROM assets a
LEFT JOIN asset_prices ap ON a.id = ap.asset_id
WHERE a.is_active = true
ORDER BY a.symbol, ap.timestamp DESC;

-- Create index on materialized view
CREATE UNIQUE INDEX idx_latest_prices_symbol ON latest_asset_prices(symbol);

-- Function to get cached quote
CREATE OR REPLACE FUNCTION get_cached_quote(p_symbol TEXT, p_max_age INTEGER DEFAULT 60)
RETURNS TABLE (
  symbol TEXT,
  name TEXT,
  price DECIMAL(20,6),
  change DECIMAL(20,6),
  change_percent DECIMAL(10,4),
  volume BIGINT,
  market_cap BIGINT,
  last_updated TIMESTAMP WITH TIME ZONE,
  age_seconds INTEGER,
  is_stale BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    lap.symbol,
    lap.name,
    lap.price,
    lap.change,
    lap.change_percent,
    lap.volume,
    lap.market_cap,
    lap.last_updated,
    lap.age_seconds,
    lap.age_seconds > p_max_age as is_stale
  FROM latest_asset_prices lap
  WHERE lap.symbol = UPPER(p_symbol);
END;
$$ LANGUAGE plpgsql;

-- Function to get multiple cached quotes
CREATE OR REPLACE FUNCTION get_cached_quotes_batch(p_symbols TEXT[], p_max_age INTEGER DEFAULT 60)
RETURNS TABLE (
  symbol TEXT,
  name TEXT,
  price DECIMAL(20,6),
  change DECIMAL(20,6),
  change_percent DECIMAL(10,4),
  volume BIGINT,
  market_cap BIGINT,
  last_updated TIMESTAMP WITH TIME ZONE,
  age_seconds INTEGER,
  is_stale BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    lap.symbol,
    lap.name,
    lap.price,
    lap.change,
    lap.change_percent,
    lap.volume,
    lap.market_cap,
    lap.last_updated,
    lap.age_seconds,
    lap.age_seconds > p_max_age as is_stale
  FROM latest_asset_prices lap
  WHERE lap.symbol = ANY(p_symbols);
END;
$$ LANGUAGE plpgsql;

-- Function to update asset price
CREATE OR REPLACE FUNCTION update_asset_price(
  p_symbol TEXT,
  p_price DECIMAL(20,6),
  p_change DECIMAL(20,6) DEFAULT NULL,
  p_change_percent DECIMAL(10,4) DEFAULT NULL,
  p_volume BIGINT DEFAULT NULL,
  p_market_cap BIGINT DEFAULT NULL,
  p_provider TEXT DEFAULT 'alpha_vantage',
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_asset_id UUID;
  v_price_id UUID;
BEGIN
  -- Get or create asset
  INSERT INTO assets (symbol, name, type)
  VALUES (UPPER(p_symbol), UPPER(p_symbol), 'stock')
  ON CONFLICT (symbol) DO UPDATE
    SET updated_at = NOW()
  RETURNING id INTO v_asset_id;
  
  -- Insert new price record
  INSERT INTO asset_prices (
    asset_id, price, change, change_percent, volume, market_cap,
    provider, metadata, timestamp
  ) VALUES (
    v_asset_id, p_price, p_change, p_change_percent, p_volume, p_market_cap,
    p_provider, p_metadata, NOW()
  )
  RETURNING id INTO v_price_id;
  
  -- Update cache metadata
  INSERT INTO cache_metadata (cache_key, cache_type, symbols, last_updated)
  VALUES ('quote:' || UPPER(p_symbol), 'quote', ARRAY[UPPER(p_symbol)], NOW())
  ON CONFLICT (cache_key) DO UPDATE
    SET last_updated = NOW(),
        is_stale = false;
  
  -- Refresh materialized view (async in production)
  REFRESH MATERIALIZED VIEW CONCURRENTLY latest_asset_prices;
  
  RETURN v_price_id;
END;
$$ LANGUAGE plpgsql;

-- Function to log API call
CREATE OR REPLACE FUNCTION log_api_call(
  p_provider TEXT,
  p_endpoint TEXT,
  p_symbols TEXT[],
  p_response_status INTEGER,
  p_response_time INTEGER,
  p_error_message TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_provider_id UUID;
BEGIN
  -- Get provider ID
  SELECT id INTO v_provider_id FROM api_providers WHERE name = p_provider;
  
  -- Log the call
  INSERT INTO api_call_logs (
    provider_id, endpoint, symbols, response_status, 
    response_time, error_message
  ) VALUES (
    v_provider_id, p_endpoint, p_symbols, p_response_status,
    p_response_time, p_error_message
  );
  
  -- Update provider stats
  UPDATE api_providers
  SET 
    current_quota_used = current_quota_used + 1,
    avg_response_time = (
      SELECT AVG(response_time)::INTEGER 
      FROM api_call_logs 
      WHERE provider_id = v_provider_id 
        AND created_at > NOW() - INTERVAL '1 hour'
    ),
    success_rate = (
      SELECT (COUNT(CASE WHEN response_status = 200 THEN 1 END)::DECIMAL / COUNT(*) * 100)
      FROM api_call_logs 
      WHERE provider_id = v_provider_id 
        AND created_at > NOW() - INTERVAL '1 hour'
    ),
    last_error = CASE WHEN p_response_status != 200 THEN p_error_message END,
    last_error_at = CASE WHEN p_response_status != 200 THEN NOW() END,
    updated_at = NOW()
  WHERE id = v_provider_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get next available API provider
CREATE OR REPLACE FUNCTION get_next_api_provider()
RETURNS TABLE (
  provider_name TEXT,
  remaining_quota INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ap.name as provider_name,
    CASE 
      WHEN ap.quota_limit IS NULL THEN 999999
      ELSE ap.quota_limit - ap.current_quota_used
    END as remaining_quota
  FROM api_providers ap
  WHERE ap.is_active = true
    AND (ap.quota_limit IS NULL OR ap.current_quota_used < ap.quota_limit)
    AND (ap.last_error_at IS NULL OR ap.last_error_at < NOW() - INTERVAL '5 minutes')
  ORDER BY 
    ap.priority DESC,
    ap.success_rate DESC NULLS LAST,
    ap.avg_response_time ASC NULLS LAST
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to get cache statistics
CREATE OR REPLACE FUNCTION get_cache_statistics()
RETURNS TABLE (
  total_assets INTEGER,
  total_prices INTEGER,
  fresh_quotes INTEGER,
  stale_quotes INTEGER,
  avg_age_seconds INTEGER,
  most_recent_update TIMESTAMP WITH TIME ZONE,
  providers_active INTEGER,
  api_calls_last_hour INTEGER,
  cache_hit_rate DECIMAL(5,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::INTEGER FROM assets WHERE is_active = true) as total_assets,
    (SELECT COUNT(*)::INTEGER FROM asset_prices) as total_prices,
    (SELECT COUNT(*)::INTEGER FROM latest_asset_prices WHERE age_seconds <= 60) as fresh_quotes,
    (SELECT COUNT(*)::INTEGER FROM latest_asset_prices WHERE age_seconds > 60) as stale_quotes,
    (SELECT AVG(age_seconds)::INTEGER FROM latest_asset_prices) as avg_age_seconds,
    (SELECT MAX(timestamp) FROM asset_prices) as most_recent_update,
    (SELECT COUNT(*)::INTEGER FROM api_providers WHERE is_active = true) as providers_active,
    (SELECT COUNT(*)::INTEGER FROM api_call_logs WHERE created_at > NOW() - INTERVAL '1 hour') as api_calls_last_hour,
    95.5::DECIMAL(5,2) as cache_hit_rate; -- Placeholder, calculate from actual metrics
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cache_metadata ENABLE ROW LEVEL SECURITY;

-- Public read access for assets and prices
CREATE POLICY "public_read_assets" ON assets FOR SELECT USING (true);
CREATE POLICY "public_read_prices" ON asset_prices FOR SELECT USING (true);
CREATE POLICY "public_read_cache_metadata" ON cache_metadata FOR SELECT USING (true);

-- Service role only for writes
CREATE POLICY "service_write_assets" ON assets FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_write_prices" ON asset_prices FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_write_providers" ON api_providers FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_write_logs" ON api_call_logs FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_write_cache" ON cache_metadata FOR ALL USING (auth.role() = 'service_role');

-- Admin read for monitoring tables
CREATE POLICY "admin_read_providers" ON api_providers FOR SELECT 
  USING (auth.jwt() ->> 'role' = 'admin' OR auth.role() = 'service_role');
CREATE POLICY "admin_read_logs" ON api_call_logs FOR SELECT 
  USING (auth.jwt() ->> 'role' = 'admin' OR auth.role() = 'service_role');

-- Scheduled job to reset API quotas (if pg_cron is enabled)
-- SELECT cron.schedule('reset-api-quotas', '0 * * * *', $$
--   UPDATE api_providers 
--   SET current_quota_used = 0, 
--       quota_reset_at = NOW() + INTERVAL '1 ' || quota_window
--   WHERE quota_window = 'hour';
-- $$);

-- Job to clean old data
-- SELECT cron.schedule('clean-old-data', '0 3 * * *', $$
--   DELETE FROM asset_prices WHERE timestamp < NOW() - INTERVAL '30 days';
--   DELETE FROM api_call_logs WHERE created_at < NOW() - INTERVAL '7 days';
-- $$);