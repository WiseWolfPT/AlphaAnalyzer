-- ====================================================================
-- SUPABASE REALTIME SCHEMA FOR ALFALYZER
-- ====================================================================
-- This schema creates the necessary tables for real-time market data
-- updates using Supabase Realtime
-- ====================================================================

-- ====================================================================
-- 1. REALTIME QUOTES TABLE
-- ====================================================================
-- Stores real-time quote updates for broadcasting to connected clients
CREATE TABLE IF NOT EXISTS public.realtime_quotes (
  id BIGSERIAL PRIMARY KEY,
  symbol VARCHAR(10) NOT NULL,
  price DECIMAL(12, 4) NOT NULL,
  change DECIMAL(12, 4),
  change_percent DECIMAL(8, 4),
  volume BIGINT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_realtime_quotes_symbol ON public.realtime_quotes(symbol);
CREATE INDEX idx_realtime_quotes_timestamp ON public.realtime_quotes(timestamp);

-- Keep only recent data (last 24 hours) to prevent table bloat
CREATE INDEX idx_realtime_quotes_created_at ON public.realtime_quotes(created_at);

-- ====================================================================
-- 2. REALTIME ALERTS TABLE
-- ====================================================================
-- Stores real-time price alerts for users
CREATE TABLE IF NOT EXISTS public.realtime_alerts (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol VARCHAR(10) NOT NULL,
  alert_type VARCHAR(20) NOT NULL, -- 'price_above', 'price_below', 'percent_change'
  threshold DECIMAL(12, 4) NOT NULL,
  message TEXT,
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_realtime_alerts_user_id ON public.realtime_alerts(user_id);
CREATE INDEX idx_realtime_alerts_symbol ON public.realtime_alerts(symbol);
CREATE INDEX idx_realtime_alerts_triggered_at ON public.realtime_alerts(triggered_at);

-- ====================================================================
-- 3. REALTIME MARKET STATUS TABLE
-- ====================================================================
-- Broadcasts market open/close status changes
CREATE TABLE IF NOT EXISTS public.realtime_market_status (
  id BIGSERIAL PRIMARY KEY,
  market VARCHAR(10) NOT NULL DEFAULT 'US',
  is_open BOOLEAN NOT NULL,
  next_open TIMESTAMPTZ,
  next_close TIMESTAMPTZ,
  message TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_realtime_market_status_market ON public.realtime_market_status(market);
CREATE INDEX idx_realtime_market_status_timestamp ON public.realtime_market_status(timestamp);

-- ====================================================================
-- 4. REALTIME PORTFOLIO UPDATES TABLE
-- ====================================================================
-- Tracks portfolio value changes in real-time
CREATE TABLE IF NOT EXISTS public.realtime_portfolio_updates (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  portfolio_id UUID NOT NULL,
  total_value DECIMAL(15, 2) NOT NULL,
  daily_change DECIMAL(15, 2),
  daily_change_percent DECIMAL(8, 4),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_realtime_portfolio_user_id ON public.realtime_portfolio_updates(user_id);
CREATE INDEX idx_realtime_portfolio_portfolio_id ON public.realtime_portfolio_updates(portfolio_id);
CREATE INDEX idx_realtime_portfolio_timestamp ON public.realtime_portfolio_updates(timestamp);

-- ====================================================================
-- CLEANUP FUNCTIONS
-- ====================================================================

-- Function to clean up old realtime data (keep only last 24 hours)
CREATE OR REPLACE FUNCTION public.cleanup_old_realtime_data()
RETURNS void AS $$
BEGIN
  -- Delete quotes older than 24 hours
  DELETE FROM public.realtime_quotes 
  WHERE created_at < NOW() - INTERVAL '24 hours';
  
  -- Delete alerts older than 7 days
  DELETE FROM public.realtime_alerts 
  WHERE triggered_at < NOW() - INTERVAL '7 days';
  
  -- Delete market status older than 24 hours
  DELETE FROM public.realtime_market_status 
  WHERE created_at < NOW() - INTERVAL '24 hours';
  
  -- Delete portfolio updates older than 7 days
  DELETE FROM public.realtime_portfolio_updates 
  WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- ====================================================================
-- ROW LEVEL SECURITY (RLS)
-- ====================================================================
-- Enable RLS on all realtime tables
ALTER TABLE public.realtime_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.realtime_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.realtime_market_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.realtime_portfolio_updates ENABLE ROW LEVEL SECURITY;

-- Realtime quotes are public read, service write
CREATE POLICY "Anyone can read realtime quotes" ON public.realtime_quotes
  FOR SELECT USING (true);

CREATE POLICY "Service role can write realtime quotes" ON public.realtime_quotes
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Realtime alerts are user-specific
CREATE POLICY "Users can read own alerts" ON public.realtime_alerts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage alerts" ON public.realtime_alerts
  FOR ALL USING (auth.role() = 'service_role');

-- Market status is public read, service write
CREATE POLICY "Anyone can read market status" ON public.realtime_market_status
  FOR SELECT USING (true);

CREATE POLICY "Service role can write market status" ON public.realtime_market_status
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Portfolio updates are user-specific
CREATE POLICY "Users can read own portfolio updates" ON public.realtime_portfolio_updates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage portfolio updates" ON public.realtime_portfolio_updates
  FOR ALL USING (auth.role() = 'service_role');

-- ====================================================================
-- REALTIME PUBLICATION
-- ====================================================================
-- Enable realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.realtime_quotes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.realtime_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.realtime_market_status;
ALTER PUBLICATION supabase_realtime ADD TABLE public.realtime_portfolio_updates;

-- ====================================================================
-- TRIGGERS FOR AUTOMATIC CLEANUP
-- ====================================================================

-- Trigger to automatically limit realtime_quotes to last 1000 entries per symbol
CREATE OR REPLACE FUNCTION public.limit_realtime_quotes_per_symbol()
RETURNS TRIGGER AS $$
BEGIN
  -- Keep only the last 1000 quotes per symbol
  DELETE FROM public.realtime_quotes
  WHERE symbol = NEW.symbol
  AND id NOT IN (
    SELECT id FROM public.realtime_quotes
    WHERE symbol = NEW.symbol
    ORDER BY timestamp DESC
    LIMIT 1000
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER limit_quotes_trigger
AFTER INSERT ON public.realtime_quotes
FOR EACH ROW
EXECUTE FUNCTION public.limit_realtime_quotes_per_symbol();

-- ====================================================================
-- SCHEDULED CLEANUP (TO BE CONFIGURED IN SUPABASE DASHBOARD)
-- ====================================================================
-- Run this function every hour to clean up old data:
-- SELECT public.cleanup_old_realtime_data();

-- ====================================================================
-- GRANTS
-- ====================================================================
-- Grant necessary permissions
GRANT SELECT ON public.realtime_quotes TO authenticated, anon;
GRANT SELECT ON public.realtime_market_status TO authenticated, anon;

-- ====================================================================
-- COMMENTS FOR DOCUMENTATION
-- ====================================================================
COMMENT ON TABLE public.realtime_quotes IS 'Real-time stock quote updates for WebSocket broadcasting';
COMMENT ON TABLE public.realtime_alerts IS 'User-specific price alerts triggered in real-time';
COMMENT ON TABLE public.realtime_market_status IS 'Market open/close status updates';
COMMENT ON TABLE public.realtime_portfolio_updates IS 'Real-time portfolio value tracking';