-- ================================================================
-- TABELAS EM FALTA PARA O ALFALYZER
-- ================================================================
-- Execute este script no Supabase SQL Editor para criar as tabelas
-- que estão em falta mas são necessárias para o sistema funcionar
-- ================================================================

-- 1. Tabela de preços em tempo real
CREATE TABLE IF NOT EXISTS stock_prices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol TEXT NOT NULL REFERENCES stocks(symbol),
  price DECIMAL(15,4) NOT NULL,
  change DECIMAL(15,4),
  change_percent DECIMAL(10,4),
  volume BIGINT,
  market_cap BIGINT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE stock_prices ENABLE ROW LEVEL SECURITY;

-- Policy para leitura pública
CREATE POLICY "Anyone can view stock prices" ON stock_prices
  FOR SELECT USING (true);

-- Indexes para performance
CREATE INDEX IF NOT EXISTS idx_stock_prices_symbol ON stock_prices(symbol);
CREATE INDEX IF NOT EXISTS idx_stock_prices_timestamp ON stock_prices(symbol, timestamp DESC);

-- 2. Tabela para job queue (necessária para cron jobs)
CREATE TABLE IF NOT EXISTS job_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL,
  payload JSONB,
  status TEXT DEFAULT 'pending',
  priority INTEGER DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  result JSONB
);

-- Enable RLS
ALTER TABLE job_queue ENABLE ROW LEVEL SECURITY;

-- Policy para service role apenas
CREATE POLICY "Service role can manage jobs" ON job_queue
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_job_queue_status ON job_queue(status);
CREATE INDEX IF NOT EXISTS idx_job_queue_created ON job_queue(created_at);

-- 3. Tabela para rate limiting
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  daily_limit INTEGER NOT NULL DEFAULT 1000,
  minute_limit INTEGER,
  used INTEGER DEFAULT 0,
  reset_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(provider, endpoint)
);

-- Enable RLS
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Policy
CREATE POLICY "Service role can manage rate limits" ON rate_limits
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- 4. Tabela para logs de rate limiting
CREATE TABLE IF NOT EXISTS rate_limit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  user_id UUID,
  ip_address INET,
  response_time_ms INTEGER,
  status_code INTEGER,
  request_size INTEGER,
  response_size INTEGER,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE rate_limit_logs ENABLE ROW LEVEL SECURITY;

-- Policy
CREATE POLICY "Service role can manage rate limit logs" ON rate_limit_logs
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_timestamp ON rate_limit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_provider ON rate_limit_logs(provider, endpoint);

-- 5. Inserir rate limits iniciais
INSERT INTO rate_limits (provider, endpoint, daily_limit, minute_limit) VALUES
('polygon', 'quote', 5, 5),
('polygon', 'historical', 5, 5),
('twelvedata', 'quote', 800, 60),
('twelvedata', 'historical', 800, 60),
('fmp', 'quote', 250, NULL),
('fmp', 'historical', 250, NULL),
('alphavantage', 'quote', 25, 5),
('alphavantage', 'historical', 25, 5),
('finnhub', 'quote', 60, 30),
('finnhub', 'historical', 60, 30)
ON CONFLICT (provider, endpoint) DO NOTHING;

-- ================================================================
-- VERIFICAÇÃO FINAL
-- ================================================================
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('stock_prices', 'job_queue', 'rate_limits', 'rate_limit_logs')
ORDER BY table_name;

-- Verificar rate limits inseridos
SELECT provider, endpoint, daily_limit, minute_limit 
FROM rate_limits 
ORDER BY provider, endpoint;