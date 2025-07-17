-- =============================================================================
-- Migration: 017_create_realtime_prices.sql
-- Description: Create tables for real-time price updates and caching
-- Created: 2025-07-14
-- Dependencies: None
-- =============================================================================

-- Real-time prices table
CREATE TABLE IF NOT EXISTS real_time_prices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol VARCHAR(10) NOT NULL UNIQUE,
  price DECIMAL(12, 4) NOT NULL,
  change DECIMAL(12, 4) DEFAULT 0,
  change_percent DECIMAL(8, 4) DEFAULT 0,
  volume BIGINT DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Price cache table for API responses
CREATE TABLE IF NOT EXISTS price_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol VARCHAR(10) NOT NULL UNIQUE,
  data JSONB NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_real_time_prices_symbol ON real_time_prices(symbol);
CREATE INDEX IF NOT EXISTS idx_real_time_prices_updated_at ON real_time_prices(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_price_cache_symbol ON price_cache(symbol);
CREATE INDEX IF NOT EXISTS idx_price_cache_expires_at ON price_cache(expires_at);

-- Enable Row Level Security
ALTER TABLE real_time_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies for real_time_prices
-- All authenticated users can read price data (public market data)
CREATE POLICY "All users can read real-time prices" ON real_time_prices
  FOR SELECT USING (auth.role() IS NOT NULL);

-- Only service role can update prices (background jobs)
CREATE POLICY "Service role can manage real-time prices" ON real_time_prices
  FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for price_cache
-- All authenticated users can read cached prices
CREATE POLICY "All users can read price cache" ON price_cache
  FOR SELECT USING (auth.role() IS NOT NULL);

-- Only service role can manage cache
CREATE POLICY "Service role can manage price cache" ON price_cache
  FOR ALL USING (auth.role() = 'service_role');

-- Function to clean expired cache entries
CREATE OR REPLACE FUNCTION clean_expired_price_cache()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM price_cache 
  WHERE expires_at < NOW();
END;
$$;

-- Create a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Apply the trigger to both tables
CREATE TRIGGER update_real_time_prices_updated_at
  BEFORE UPDATE ON real_time_prices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_price_cache_updated_at
  BEFORE UPDATE ON price_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert some initial data for testing (popular stocks)
INSERT INTO real_time_prices (symbol, price, change, change_percent, volume) 
VALUES 
  ('AAPL', 195.50, 2.30, 1.19, 45623000),
  ('MSFT', 380.25, -1.45, -0.38, 23456000),
  ('GOOGL', 150.75, 0.85, 0.57, 18934000),
  ('AMZN', 162.40, 3.20, 2.01, 32145000),
  ('TSLA', 265.80, -5.60, -2.06, 67234000)
ON CONFLICT (symbol) DO NOTHING;

-- Comments for documentation
COMMENT ON TABLE real_time_prices IS 'Stores real-time stock price data updated by background jobs';
COMMENT ON TABLE price_cache IS 'Caches API responses for stock prices to reduce API calls';
COMMENT ON FUNCTION clean_expired_price_cache() IS 'Removes expired cache entries to keep the table clean';

-- =============================================================================
-- Verification queries (commented out)
-- =============================================================================
-- SELECT * FROM real_time_prices ORDER BY updated_at DESC LIMIT 10;
-- SELECT * FROM price_cache WHERE expires_at > NOW();
-- SELECT clean_expired_price_cache();