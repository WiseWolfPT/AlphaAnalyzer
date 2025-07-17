-- Create real-time data tables for WebSocket integration
-- This enables live market data streaming and caching

-- Create real-time quotes table for live price updates
CREATE TABLE IF NOT EXISTS real_time_quotes (
  symbol TEXT PRIMARY KEY,
  price DECIMAL(15,4) NOT NULL,
  change DECIMAL(15,4),
  change_percent DECIMAL(8,4),
  volume BIGINT,
  market_cap BIGINT,
  high_24h DECIMAL(15,4),
  low_24h DECIMAL(15,4),
  source TEXT NOT NULL CHECK(source IN ('websocket', 'polling', 'api')),
  provider TEXT NOT NULL DEFAULT 'twelve_data',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_real_time_quotes_updated_at ON real_time_quotes(updated_at);
CREATE INDEX IF NOT EXISTS idx_real_time_quotes_source ON real_time_quotes(source);
CREATE INDEX IF NOT EXISTS idx_real_time_quotes_provider ON real_time_quotes(provider);

-- Create WebSocket connections tracking table
CREATE TABLE IF NOT EXISTS websocket_connections (
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  connection_type TEXT NOT NULL CHECK(connection_type IN ('websocket', 'polling')),
  status TEXT NOT NULL CHECK(status IN ('connecting', 'connected', 'disconnected', 'error')) DEFAULT 'connecting',
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  disconnected_at TIMESTAMP WITH TIME ZONE,
  last_ping TIMESTAMP WITH TIME ZONE,
  subscriptions TEXT[] DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  reconnect_count INTEGER DEFAULT 0,
  messages_sent INTEGER DEFAULT 0,
  messages_received INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for websocket_connections
CREATE INDEX IF NOT EXISTS idx_websocket_connections_user_id ON websocket_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_websocket_connections_status ON websocket_connections(status);
CREATE INDEX IF NOT EXISTS idx_websocket_connections_connected_at ON websocket_connections(connected_at);
CREATE INDEX IF NOT EXISTS idx_websocket_connections_session_id ON websocket_connections(session_id);

-- Create WebSocket subscription tracking table
CREATE TABLE IF NOT EXISTS websocket_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  subscription_source TEXT NOT NULL CHECK(subscription_source IN ('websocket', 'polling')),
  last_update TIMESTAMP WITH TIME ZONE,
  update_count INTEGER DEFAULT 0,
  
  UNIQUE(session_id, symbol),
  FOREIGN KEY (session_id) REFERENCES websocket_connections(session_id) ON DELETE CASCADE
);

-- Create indexes for websocket_subscriptions
CREATE INDEX IF NOT EXISTS idx_websocket_subscriptions_symbol ON websocket_subscriptions(symbol);
CREATE INDEX IF NOT EXISTS idx_websocket_subscriptions_session_id ON websocket_subscriptions(session_id);
CREATE INDEX IF NOT EXISTS idx_websocket_subscriptions_active ON websocket_subscriptions(is_active);
CREATE INDEX IF NOT EXISTS idx_websocket_subscriptions_symbol_active ON websocket_subscriptions(symbol, is_active);

-- Create WebSocket performance metrics table
CREATE TABLE IF NOT EXISTS websocket_metrics (
  id BIGSERIAL PRIMARY KEY,
  metric_type TEXT NOT NULL CHECK(metric_type IN ('connection', 'subscription', 'message', 'latency', 'error')),
  symbol TEXT,
  session_id TEXT,
  value DECIMAL(15,4),
  metadata JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for websocket_metrics
CREATE INDEX IF NOT EXISTS idx_websocket_metrics_type ON websocket_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_websocket_metrics_timestamp ON websocket_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_websocket_metrics_symbol ON websocket_metrics(symbol);
CREATE INDEX IF NOT EXISTS idx_websocket_metrics_session_id ON websocket_metrics(session_id);

-- Create function to get real-time quote
CREATE OR REPLACE FUNCTION get_real_time_quote(p_symbol TEXT)
RETURNS TABLE (
  symbol TEXT,
  price DECIMAL(15,4),
  change DECIMAL(15,4),
  change_percent DECIMAL(8,4),
  volume BIGINT,
  market_cap BIGINT,
  high_24h DECIMAL(15,4),
  low_24h DECIMAL(15,4),
  source TEXT,
  provider TEXT,
  updated_at TIMESTAMP WITH TIME ZONE,
  age_seconds INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rtq.symbol,
    rtq.price,
    rtq.change,
    rtq.change_percent,
    rtq.volume,
    rtq.market_cap,
    rtq.high_24h,
    rtq.low_24h,
    rtq.source,
    rtq.provider,
    rtq.updated_at,
    EXTRACT(EPOCH FROM (NOW() - rtq.updated_at))::INTEGER as age_seconds
  FROM real_time_quotes rtq
  WHERE rtq.symbol = UPPER(p_symbol);
END;
$$ LANGUAGE plpgsql;

-- Create function to update real-time quote
CREATE OR REPLACE FUNCTION update_real_time_quote(
  p_symbol TEXT,
  p_price DECIMAL(15,4),
  p_change DECIMAL(15,4) DEFAULT NULL,
  p_change_percent DECIMAL(8,4) DEFAULT NULL,
  p_volume BIGINT DEFAULT NULL,
  p_market_cap BIGINT DEFAULT NULL,
  p_high_24h DECIMAL(15,4) DEFAULT NULL,
  p_low_24h DECIMAL(15,4) DEFAULT NULL,
  p_source TEXT DEFAULT 'websocket',
  p_provider TEXT DEFAULT 'twelve_data'
)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO real_time_quotes (
    symbol, price, change, change_percent, volume, market_cap,
    high_24h, low_24h, source, provider, updated_at
  ) VALUES (
    UPPER(p_symbol), p_price, p_change, p_change_percent, p_volume, p_market_cap,
    p_high_24h, p_low_24h, p_source, p_provider, NOW()
  )
  ON CONFLICT (symbol) DO UPDATE SET
    price = EXCLUDED.price,
    change = COALESCE(EXCLUDED.change, real_time_quotes.change),
    change_percent = COALESCE(EXCLUDED.change_percent, real_time_quotes.change_percent),
    volume = COALESCE(EXCLUDED.volume, real_time_quotes.volume),
    market_cap = COALESCE(EXCLUDED.market_cap, real_time_quotes.market_cap),
    high_24h = COALESCE(EXCLUDED.high_24h, real_time_quotes.high_24h),
    low_24h = COALESCE(EXCLUDED.low_24h, real_time_quotes.low_24h),
    source = EXCLUDED.source,
    provider = EXCLUDED.provider,
    updated_at = NOW();
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create function to track WebSocket connection
CREATE OR REPLACE FUNCTION track_websocket_connection(
  p_session_id TEXT,
  p_user_id UUID DEFAULT NULL,
  p_connection_type TEXT DEFAULT 'websocket',
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO websocket_connections (
    session_id, user_id, connection_type, status, ip_address, user_agent
  ) VALUES (
    p_session_id, p_user_id, p_connection_type, 'connected', p_ip_address, p_user_agent
  )
  ON CONFLICT (session_id) DO UPDATE SET
    status = 'connected',
    connected_at = NOW(),
    disconnected_at = NULL,
    reconnect_count = websocket_connections.reconnect_count + 1,
    updated_at = NOW();
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create function to update WebSocket connection status
CREATE OR REPLACE FUNCTION update_websocket_status(
  p_session_id TEXT,
  p_status TEXT,
  p_subscriptions TEXT[] DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE websocket_connections
  SET 
    status = p_status,
    disconnected_at = CASE WHEN p_status = 'disconnected' THEN NOW() ELSE disconnected_at END,
    last_ping = CASE WHEN p_status = 'connected' THEN NOW() ELSE last_ping END,
    subscriptions = COALESCE(p_subscriptions, subscriptions),
    updated_at = NOW()
  WHERE session_id = p_session_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Create function to track symbol subscription
CREATE OR REPLACE FUNCTION track_symbol_subscription(
  p_session_id TEXT,
  p_symbol TEXT,
  p_action TEXT, -- 'subscribe' or 'unsubscribe'
  p_source TEXT DEFAULT 'websocket'
)
RETURNS BOOLEAN AS $$
BEGIN
  IF p_action = 'subscribe' THEN
    INSERT INTO websocket_subscriptions (
      session_id, symbol, subscription_source, is_active
    ) VALUES (
      p_session_id, UPPER(p_symbol), p_source, TRUE
    )
    ON CONFLICT (session_id, symbol) DO UPDATE SET
      unsubscribed_at = NULL,
      is_active = TRUE,
      subscription_source = EXCLUDED.subscription_source,
      subscribed_at = NOW();
  
  ELSIF p_action = 'unsubscribe' THEN
    UPDATE websocket_subscriptions
    SET 
      unsubscribed_at = NOW(),
      is_active = FALSE
    WHERE session_id = p_session_id 
      AND symbol = UPPER(p_symbol)
      AND is_active = TRUE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create function to get WebSocket statistics
CREATE OR REPLACE FUNCTION get_websocket_stats()
RETURNS TABLE (
  total_connections INTEGER,
  active_connections INTEGER,
  total_subscriptions INTEGER,
  active_subscriptions INTEGER,
  unique_symbols INTEGER,
  messages_sent_total BIGINT,
  messages_received_total BIGINT,
  avg_connection_duration INTERVAL,
  most_subscribed_symbols TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_connections,
    COUNT(CASE WHEN wc.status = 'connected' THEN 1 END)::INTEGER as active_connections,
    (SELECT COUNT(*)::INTEGER FROM websocket_subscriptions) as total_subscriptions,
    (SELECT COUNT(*)::INTEGER FROM websocket_subscriptions WHERE is_active = TRUE) as active_subscriptions,
    (SELECT COUNT(DISTINCT symbol)::INTEGER FROM websocket_subscriptions WHERE is_active = TRUE) as unique_symbols,
    COALESCE(SUM(wc.messages_sent), 0) as messages_sent_total,
    COALESCE(SUM(wc.messages_received), 0) as messages_received_total,
    AVG(CASE 
      WHEN wc.disconnected_at IS NOT NULL THEN wc.disconnected_at - wc.connected_at
      ELSE NOW() - wc.connected_at
    END) as avg_connection_duration,
    (SELECT ARRAY_AGG(symbol ORDER BY sub_count DESC) 
     FROM (
       SELECT symbol, COUNT(*) as sub_count 
       FROM websocket_subscriptions 
       WHERE is_active = TRUE 
       GROUP BY symbol 
       ORDER BY sub_count DESC 
       LIMIT 10
     ) popular_symbols
    ) as most_subscribed_symbols
  FROM websocket_connections wc;
END;
$$ LANGUAGE plpgsql;

-- Create function to cleanup old WebSocket data
CREATE OR REPLACE FUNCTION cleanup_websocket_data()
RETURNS INTEGER AS $$
DECLARE
  cleaned_count INTEGER := 0;
BEGIN
  -- Clean up disconnected connections older than 1 hour
  DELETE FROM websocket_connections 
  WHERE status = 'disconnected' 
    AND disconnected_at < NOW() - INTERVAL '1 hour';
  
  GET DIAGNOSTICS cleaned_count = ROW_COUNT;
  
  -- Clean up old metrics (keep last 24 hours)
  DELETE FROM websocket_metrics 
  WHERE timestamp < NOW() - INTERVAL '24 hours';
  
  -- Clean up old inactive subscriptions (keep last 7 days)
  DELETE FROM websocket_subscriptions 
  WHERE is_active = FALSE 
    AND unsubscribed_at < NOW() - INTERVAL '7 days';
  
  RETURN cleaned_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to get real-time quotes for multiple symbols
CREATE OR REPLACE FUNCTION get_multiple_real_time_quotes(p_symbols TEXT[])
RETURNS TABLE (
  symbol TEXT,
  price DECIMAL(15,4),
  change DECIMAL(15,4),
  change_percent DECIMAL(8,4),
  volume BIGINT,
  source TEXT,
  age_seconds INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rtq.symbol,
    rtq.price,
    rtq.change,
    rtq.change_percent,
    rtq.volume,
    rtq.source,
    EXTRACT(EPOCH FROM (NOW() - rtq.updated_at))::INTEGER as age_seconds
  FROM real_time_quotes rtq
  WHERE rtq.symbol = ANY(p_symbols)
  ORDER BY rtq.updated_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security
ALTER TABLE real_time_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE websocket_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE websocket_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE websocket_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies for real_time_quotes (read for all authenticated users)
CREATE POLICY "real_time_quotes_read_authenticated" ON real_time_quotes
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "real_time_quotes_system_write" ON real_time_quotes
  FOR ALL USING (true);

-- Create policies for websocket_connections (users see own connections, admin sees all)
CREATE POLICY "websocket_connections_read_own" ON websocket_connections
  FOR SELECT USING (
    user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "websocket_connections_system_write" ON websocket_connections
  FOR ALL USING (true);

-- Create policies for websocket_subscriptions (users see own subscriptions, admin sees all)
CREATE POLICY "websocket_subscriptions_read_own" ON websocket_subscriptions
  FOR SELECT USING (
    session_id IN (
      SELECT session_id FROM websocket_connections 
      WHERE user_id = auth.uid()
    ) OR 
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "websocket_subscriptions_system_write" ON websocket_subscriptions
  FOR ALL USING (true);

-- Create policies for websocket_metrics (admin only)
CREATE POLICY "websocket_metrics_admin_read" ON websocket_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "websocket_metrics_system_write" ON websocket_metrics
  FOR ALL USING (true);

-- Create updated_at triggers
CREATE TRIGGER update_websocket_connections_updated_at
  BEFORE UPDATE ON websocket_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for popular symbols (to initialize real-time quotes)
INSERT INTO real_time_quotes (symbol, price, source, provider) VALUES
  ('AAPL', 150.00, 'api', 'initialization'),
  ('MSFT', 300.00, 'api', 'initialization'),
  ('GOOGL', 120.00, 'api', 'initialization'),
  ('AMZN', 100.00, 'api', 'initialization'),
  ('TSLA', 250.00, 'api', 'initialization'),
  ('META', 280.00, 'api', 'initialization'),
  ('NFLX', 400.00, 'api', 'initialization'),
  ('NVDA', 450.00, 'api', 'initialization'),
  ('AMD', 90.00, 'api', 'initialization'),
  ('INTC', 50.00, 'api', 'initialization')
ON CONFLICT (symbol) DO NOTHING;