-- Create rate limits table for persistent quota tracking
-- This replaces in-memory tracking with database-persistent tracking

CREATE TABLE IF NOT EXISTS rate_limits (
  id BIGSERIAL PRIMARY KEY,
  provider TEXT NOT NULL CHECK(provider IN ('alpha_vantage', 'finnhub', 'fmp', 'twelve_data', 'polygon')),
  endpoint TEXT NOT NULL,
  used INTEGER DEFAULT 0,
  limit_daily INTEGER NOT NULL,
  limit_per_minute INTEGER,
  reset_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_call TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(provider, endpoint)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rate_limits_provider ON rate_limits(provider);
CREATE INDEX IF NOT EXISTS idx_rate_limits_reset_at ON rate_limits(reset_at);
CREATE INDEX IF NOT EXISTS idx_rate_limits_provider_endpoint ON rate_limits(provider, endpoint);

-- Create rate limit usage logs for detailed tracking
CREATE TABLE IF NOT EXISTS rate_limit_logs (
  id BIGSERIAL PRIMARY KEY,
  provider TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_id UUID REFERENCES auth.users(id),
  response_time_ms INTEGER,
  status_code INTEGER,
  request_size INTEGER,
  response_size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for logs
CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_provider ON rate_limit_logs(provider);
CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_timestamp ON rate_limit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_provider_timestamp ON rate_limit_logs(provider, timestamp);

-- Insert initial rate limits for all providers
INSERT INTO rate_limits (provider, endpoint, limit_daily, limit_per_minute, reset_at) 
VALUES 
  -- Twelve Data
  ('twelve_data', 'quote', 800, 8, CURRENT_DATE + INTERVAL '1 day'),
  ('twelve_data', 'time_series', 800, 8, CURRENT_DATE + INTERVAL '1 day'),
  ('twelve_data', 'fundamentals', 800, 8, CURRENT_DATE + INTERVAL '1 day'),
  
  -- Polygon.io
  ('polygon', 'quote', 7200, 5, CURRENT_DATE + INTERVAL '1 day'),
  ('polygon', 'aggregates', 7200, 5, CURRENT_DATE + INTERVAL '1 day'),
  ('polygon', 'market_status', 7200, 5, CURRENT_DATE + INTERVAL '1 day'),
  
  -- FMP
  ('fmp', 'quote', 250, NULL, CURRENT_DATE + INTERVAL '1 day'),
  ('fmp', 'profile', 250, NULL, CURRENT_DATE + INTERVAL '1 day'),
  ('fmp', 'financials', 250, NULL, CURRENT_DATE + INTERVAL '1 day'),
  
  -- Alpha Vantage
  ('alpha_vantage', 'quote', 25, NULL, CURRENT_DATE + INTERVAL '1 day'),
  ('alpha_vantage', 'overview', 25, NULL, CURRENT_DATE + INTERVAL '1 day'),
  ('alpha_vantage', 'earnings', 25, NULL, CURRENT_DATE + INTERVAL '1 day'),
  
  -- Finnhub
  ('finnhub', 'quote', 60, 1, CURRENT_DATE + INTERVAL '1 day'),
  ('finnhub', 'profile', 60, 1, CURRENT_DATE + INTERVAL '1 day'),
  ('finnhub', 'financials', 60, 1, CURRENT_DATE + INTERVAL '1 day')
ON CONFLICT (provider, endpoint) DO NOTHING;

-- Create function to increment API usage atomically
CREATE OR REPLACE FUNCTION increment_api_usage(
  p_provider TEXT,
  p_endpoint TEXT,
  p_user_id UUID DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_response_time_ms INTEGER DEFAULT NULL,
  p_status_code INTEGER DEFAULT 200
)
RETURNS RECORD AS $$
DECLARE
  current_usage INTEGER;
  daily_limit INTEGER;
  minute_limit INTEGER;
  last_reset TIMESTAMP WITH TIME ZONE;
  can_proceed BOOLEAN DEFAULT FALSE;
  result RECORD;
BEGIN
  -- Get current limits and usage
  SELECT used, limit_daily, limit_per_minute, reset_at
  INTO current_usage, daily_limit, minute_limit, last_reset
  FROM rate_limits
  WHERE provider = p_provider AND endpoint = p_endpoint;
  
  -- If no record exists, create one
  IF NOT FOUND THEN
    INSERT INTO rate_limits (provider, endpoint, limit_daily, limit_per_minute, reset_at, used)
    VALUES (p_provider, p_endpoint, 1000, 10, CURRENT_DATE + INTERVAL '1 day', 0);
    current_usage := 0;
    daily_limit := 1000;
    minute_limit := 10;
  END IF;
  
  -- Reset daily counter if needed
  IF last_reset < CURRENT_DATE THEN
    UPDATE rate_limits 
    SET used = 0, reset_at = CURRENT_DATE + INTERVAL '1 day', updated_at = NOW()
    WHERE provider = p_provider AND endpoint = p_endpoint;
    current_usage := 0;
  END IF;
  
  -- Check if we can proceed
  can_proceed := current_usage < daily_limit;
  
  -- If we have minute limits, check them too
  IF minute_limit IS NOT NULL AND can_proceed THEN
    DECLARE
      minute_calls INTEGER;
    BEGIN
      SELECT COUNT(*)
      INTO minute_calls
      FROM rate_limit_logs
      WHERE provider = p_provider 
        AND endpoint = p_endpoint 
        AND timestamp >= NOW() - INTERVAL '1 minute';
      
      can_proceed := minute_calls < minute_limit;
    END;
  END IF;
  
  -- If we can proceed, increment and log
  IF can_proceed THEN
    UPDATE rate_limits 
    SET used = used + 1, last_call = NOW(), updated_at = NOW()
    WHERE provider = p_provider AND endpoint = p_endpoint;
    
    INSERT INTO rate_limit_logs (provider, endpoint, user_id, ip_address, response_time_ms, status_code)
    VALUES (p_provider, p_endpoint, p_user_id, p_ip_address, p_response_time_ms, p_status_code);
    
    current_usage := current_usage + 1;
  END IF;
  
  -- Return result
  SELECT 
    can_proceed as allowed,
    current_usage as used,
    daily_limit as daily_limit,
    minute_limit as minute_limit,
    (daily_limit - current_usage) as remaining
  INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create function to check if API call is allowed
CREATE OR REPLACE FUNCTION check_api_limit(
  p_provider TEXT,
  p_endpoint TEXT
)
RETURNS RECORD AS $$
DECLARE
  current_usage INTEGER;
  daily_limit INTEGER;
  minute_limit INTEGER;
  last_reset TIMESTAMP WITH TIME ZONE;
  minute_calls INTEGER;
  result RECORD;
BEGIN
  -- Get current limits and usage
  SELECT used, limit_daily, limit_per_minute, reset_at
  INTO current_usage, daily_limit, minute_limit, last_reset
  FROM rate_limits
  WHERE provider = p_provider AND endpoint = p_endpoint;
  
  -- If no record exists, allow (will be created on first call)
  IF NOT FOUND THEN
    SELECT TRUE as allowed, 0 as used, 1000 as daily_limit, 10 as minute_limit, 1000 as remaining
    INTO result;
    RETURN result;
  END IF;
  
  -- Reset daily counter if needed
  IF last_reset < CURRENT_DATE THEN
    current_usage := 0;
  END IF;
  
  -- Check minute limits if they exist
  minute_calls := 0;
  IF minute_limit IS NOT NULL THEN
    SELECT COUNT(*)
    INTO minute_calls
    FROM rate_limit_logs
    WHERE provider = p_provider 
      AND endpoint = p_endpoint 
      AND timestamp >= NOW() - INTERVAL '1 minute';
  END IF;
  
  -- Return result
  SELECT 
    (current_usage < daily_limit AND (minute_limit IS NULL OR minute_calls < minute_limit)) as allowed,
    current_usage as used,
    daily_limit as daily_limit,
    minute_limit as minute_limit,
    (daily_limit - current_usage) as remaining
  INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create function to get quota usage statistics
CREATE OR REPLACE FUNCTION get_quota_stats()
RETURNS TABLE (
  provider TEXT,
  endpoint TEXT,
  used INTEGER,
  daily_limit INTEGER,
  minute_limit INTEGER,
  usage_percent NUMERIC,
  calls_last_hour INTEGER,
  calls_last_minute INTEGER,
  last_call TIMESTAMP WITH TIME ZONE,
  reset_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rl.provider,
    rl.endpoint,
    rl.used,
    rl.limit_daily,
    rl.limit_per_minute,
    ROUND((rl.used::NUMERIC / rl.limit_daily::NUMERIC) * 100, 2) as usage_percent,
    (SELECT COUNT(*)::INTEGER 
     FROM rate_limit_logs rll 
     WHERE rll.provider = rl.provider 
       AND rll.endpoint = rl.endpoint 
       AND rll.timestamp >= NOW() - INTERVAL '1 hour') as calls_last_hour,
    (SELECT COUNT(*)::INTEGER 
     FROM rate_limit_logs rll 
     WHERE rll.provider = rl.provider 
       AND rll.endpoint = rl.endpoint 
       AND rll.timestamp >= NOW() - INTERVAL '1 minute') as calls_last_minute,
    rl.last_call,
    rl.reset_at
  FROM rate_limits rl
  ORDER BY rl.provider, rl.endpoint;
END;
$$ LANGUAGE plpgsql;

-- Create cleanup function for old logs
CREATE OR REPLACE FUNCTION cleanup_old_rate_limit_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Keep only last 7 days of logs
  DELETE FROM rate_limit_logs 
  WHERE timestamp < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create rate limit alerts table for alert history
CREATE TABLE IF NOT EXISTS rate_limit_alerts (
  id BIGSERIAL PRIMARY KEY,
  alert_id TEXT NOT NULL UNIQUE,
  rule_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  usage_percent NUMERIC(5,2) NOT NULL,
  threshold INTEGER NOT NULL,
  severity TEXT NOT NULL CHECK(severity IN ('low', 'medium', 'high', 'critical')),
  message TEXT NOT NULL,
  notification_channels TEXT[] NOT NULL DEFAULT '{}',
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_by TEXT,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for rate_limit_alerts
CREATE INDEX IF NOT EXISTS idx_rate_limit_alerts_created_at ON rate_limit_alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_rate_limit_alerts_provider ON rate_limit_alerts(provider);
CREATE INDEX IF NOT EXISTS idx_rate_limit_alerts_severity ON rate_limit_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_rate_limit_alerts_rule_id ON rate_limit_alerts(rule_id);
CREATE INDEX IF NOT EXISTS idx_rate_limit_alerts_resolved ON rate_limit_alerts(resolved);

-- Enable Row Level Security for alerts
ALTER TABLE rate_limit_alerts ENABLE ROW LEVEL SECURITY;

-- Create policies for rate_limit_alerts (admin read/write)
CREATE POLICY "rate_limit_alerts_admin_all" ON rate_limit_alerts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Enable Row Level Security
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for rate_limits (read-only for most, admin only for write)
CREATE POLICY "rate_limits_read_all" ON rate_limits
  FOR SELECT USING (true);

CREATE POLICY "rate_limits_admin_write" ON rate_limits
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Create policies for rate_limit_logs (read for owner/admin, write for system)
CREATE POLICY "rate_limit_logs_read_own" ON rate_limit_logs
  FOR SELECT USING (
    user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "rate_limit_logs_system_write" ON rate_limit_logs
  FOR INSERT WITH CHECK (true);

-- Create updated_at trigger for rate_limits
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_rate_limits_updated_at
  BEFORE UPDATE ON rate_limits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();