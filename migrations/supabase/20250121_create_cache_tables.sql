-- Create cache tables in Supabase
-- Run this in the Supabase SQL editor

-- Stock quotes cache table
CREATE TABLE IF NOT EXISTS stock_quotes_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL UNIQUE,
  name TEXT,
  price DECIMAL(10, 2),
  change DECIMAL(10, 2),
  change_percent DECIMAL(5, 2),
  volume BIGINT,
  market_cap TEXT,
  pe_ratio DECIMAL(10, 2),
  eps DECIMAL(10, 2),
  sector TEXT,
  industry TEXT,
  logo_url TEXT,
  source TEXT DEFAULT 'api',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_stock_quotes_symbol ON stock_quotes_cache(symbol);
CREATE INDEX idx_stock_quotes_updated ON stock_quotes_cache(updated_at);

-- Company profiles cache
CREATE TABLE IF NOT EXISTS company_profiles_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL UNIQUE,
  name TEXT,
  description TEXT,
  sector TEXT,
  industry TEXT,
  website TEXT,
  ceo TEXT,
  employees INTEGER,
  headquarters TEXT,
  founded_year INTEGER,
  ipo_date DATE,
  market_cap DECIMAL(15, 2),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_company_profiles_symbol ON company_profiles_cache(symbol);

-- Financial data cache
CREATE TABLE IF NOT EXISTS financial_data_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  statement_type TEXT NOT NULL, -- 'income_statement', 'balance_sheet', 'cash_flow'
  period TEXT NOT NULL, -- 'quarterly', 'annual'
  data JSONB NOT NULL,
  fiscal_date DATE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(symbol, statement_type, period, fiscal_date)
);

CREATE INDEX idx_financial_data_symbol ON financial_data_cache(symbol);
CREATE INDEX idx_financial_data_type ON financial_data_cache(statement_type);

-- Market indices cache
CREATE TABLE IF NOT EXISTS market_indices_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL UNIQUE,
  name TEXT,
  value DECIMAL(10, 2),
  change DECIMAL(10, 2),
  change_percent DECIMAL(5, 2),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API usage tracking
CREATE TABLE IF NOT EXISTS api_usage_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL,
  endpoint TEXT,
  symbol TEXT,
  response_time INTEGER,
  status_code INTEGER,
  error_message TEXT,
  cost DECIMAL(10, 6), -- Track API costs
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_api_usage_provider ON api_usage_log(provider);
CREATE INDEX idx_api_usage_created ON api_usage_log(created_at);

-- Row Level Security (RLS)
ALTER TABLE stock_quotes_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_profiles_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_data_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_indices_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_log ENABLE ROW LEVEL SECURITY;

-- Public read access for cache tables
CREATE POLICY "Public read access" ON stock_quotes_cache FOR SELECT USING (true);
CREATE POLICY "Public read access" ON company_profiles_cache FOR SELECT USING (true);
CREATE POLICY "Public read access" ON financial_data_cache FOR SELECT USING (true);
CREATE POLICY "Public read access" ON market_indices_cache FOR SELECT USING (true);

-- Only service role can write to cache
CREATE POLICY "Service role write" ON stock_quotes_cache FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role write" ON company_profiles_cache FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role write" ON financial_data_cache FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role write" ON market_indices_cache FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role only" ON api_usage_log FOR ALL USING (auth.role() = 'service_role');

-- Function to clean old cache entries
CREATE OR REPLACE FUNCTION clean_old_cache()
RETURNS void AS $$
BEGIN
  -- Delete stock quotes older than 24 hours
  DELETE FROM stock_quotes_cache WHERE updated_at < NOW() - INTERVAL '24 hours';
  
  -- Delete financial data older than 7 days
  DELETE FROM financial_data_cache WHERE updated_at < NOW() - INTERVAL '7 days';
  
  -- Delete API logs older than 30 days
  DELETE FROM api_usage_log WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to clean cache (if pg_cron is enabled)
-- SELECT cron.schedule('clean-cache', '0 2 * * *', 'SELECT clean_old_cache();');