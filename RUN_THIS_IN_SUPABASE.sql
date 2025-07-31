-- IMPORTANT: Run this SQL in your Supabase SQL Editor
-- URL: https://supabase.com/dashboard/project/avjnfessefxtfurayybp/sql
-- This creates the cache table for Alpha Vantage API responses

-- Create cache_quotes table for Alpha Vantage API responses
CREATE TABLE IF NOT EXISTS cache_quotes (
  key VARCHAR(255) PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  provider VARCHAR(50)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_cache_quotes_expires_at ON cache_quotes(expires_at);
CREATE INDEX IF NOT EXISTS idx_cache_quotes_provider ON cache_quotes(provider);

-- Create function to automatically clean expired entries
CREATE OR REPLACE FUNCTION clean_expired_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM cache_quotes WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security
ALTER TABLE cache_quotes ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anonymous reads (for public API)
CREATE POLICY "Allow anonymous reads" ON cache_quotes
  FOR SELECT
  USING (true);

-- Create policy to allow service role to manage cache
CREATE POLICY "Allow service role full access" ON cache_quotes
  FOR ALL
  USING (auth.role() = 'service_role');

-- Add comment
COMMENT ON TABLE cache_quotes IS 'Cache table for external API responses with TTL support';

-- Test the table
INSERT INTO cache_quotes (key, data, expires_at, provider)
VALUES (
  'test_key_' || extract(epoch from now())::text,
  '{"symbol": "TEST", "price": 123.45}'::jsonb,
  NOW() + INTERVAL '5 minutes',
  'test'
);

-- Verify it works
SELECT * FROM cache_quotes WHERE key LIKE 'test_key_%';

-- Clean up test data
DELETE FROM cache_quotes WHERE key LIKE 'test_key_%';

-- Success message
SELECT 'Cache table created successfully!' as message;