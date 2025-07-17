-- Create api_cache table for Multi-Layer Cache System (Layer 2)
-- This table stores cached API responses with TTL and data type classification

CREATE TABLE IF NOT EXISTS api_cache (
  id BIGSERIAL PRIMARY KEY,
  cache_key TEXT NOT NULL UNIQUE,
  cache_value TEXT NOT NULL, -- JSON serialized data
  data_type TEXT NOT NULL,   -- quotes, daily, company, historical, etc.
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Metadata for analytics
  hit_count INTEGER DEFAULT 0,
  last_accessed TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_cache_key ON api_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_api_cache_expires ON api_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_api_cache_type ON api_cache(data_type);
CREATE INDEX IF NOT EXISTS idx_api_cache_created ON api_cache(created_at);

-- Composite index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_api_cache_type_expires ON api_cache(data_type, expires_at);

-- Partial index for active (non-expired) entries
CREATE INDEX IF NOT EXISTS idx_api_cache_active ON api_cache(cache_key, expires_at) 
  WHERE expires_at > NOW();

-- Enable Row Level Security (RLS)
ALTER TABLE api_cache ENABLE ROW LEVEL SECURITY;

-- Create policy for unrestricted access (cache is not user-specific)
-- Note: In production, you might want to restrict this based on your security requirements
CREATE POLICY "Cache access policy" ON api_cache
  FOR ALL USING (true);

-- Comments for documentation
COMMENT ON TABLE api_cache IS 'Multi-layer cache system Layer 2 - stores API responses with TTL';
COMMENT ON COLUMN api_cache.cache_key IS 'Unique cache key in format: provider:method:symbol:params';
COMMENT ON COLUMN api_cache.cache_value IS 'JSON serialized cached data';
COMMENT ON COLUMN api_cache.data_type IS 'Data classification: quotes, daily, company, historical, snapshot, trades, dividends, splits, market_status';
COMMENT ON COLUMN api_cache.expires_at IS 'Cache expiration timestamp';
COMMENT ON COLUMN api_cache.hit_count IS 'Number of times this cache entry was accessed';

-- Function to automatically cleanup expired entries
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM api_cache WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log cleanup
  RAISE NOTICE 'Cleaned up % expired cache entries', deleted_count;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled cleanup job (runs every hour)
-- Note: This requires pg_cron extension. If not available, cleanup will be handled by the application
DO $$
BEGIN
  -- Try to schedule cleanup, but don't fail if pg_cron is not available
  BEGIN
    PERFORM cron.schedule('cache-cleanup', '0 * * * *', 'SELECT cleanup_expired_cache();');
    RAISE NOTICE 'Scheduled automatic cache cleanup every hour';
  EXCEPTION
    WHEN undefined_function THEN
      RAISE NOTICE 'pg_cron not available - cache cleanup will be handled by application';
  END;
END;
$$;

-- Create function to get cache statistics
CREATE OR REPLACE FUNCTION get_cache_stats()
RETURNS TABLE(
  total_entries BIGINT,
  active_entries BIGINT,
  expired_entries BIGINT,
  data_types JSONB,
  avg_age_minutes NUMERIC,
  hit_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_entries,
    COUNT(*) FILTER (WHERE expires_at > NOW()) as active_entries,
    COUNT(*) FILTER (WHERE expires_at <= NOW()) as expired_entries,
    jsonb_object_agg(data_type, type_count) as data_types,
    ROUND(AVG(EXTRACT(EPOCH FROM (NOW() - created_at)) / 60), 2) as avg_age_minutes,
    CASE 
      WHEN SUM(hit_count) > 0 THEN ROUND(AVG(hit_count), 2)
      ELSE 0
    END as hit_rate
  FROM (
    SELECT 
      data_type,
      COUNT(*) as type_count,
      hit_count,
      created_at
    FROM api_cache 
    GROUP BY data_type, hit_count, created_at
  ) grouped;
END;
$$ LANGUAGE plpgsql;

-- Sample usage:
-- SELECT * FROM get_cache_stats();
-- SELECT cleanup_expired_cache();

-- Grant permissions (adjust based on your user setup)
-- GRANT ALL ON api_cache TO your_application_user;
-- GRANT USAGE ON SEQUENCE api_cache_id_seq TO your_application_user;