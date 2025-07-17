-- Create real-time data tables for WebSocket integration (SQLite version)
-- This enables live market data streaming and caching

-- Create real-time quotes table for live price updates
CREATE TABLE IF NOT EXISTS real_time_quotes (
  symbol TEXT PRIMARY KEY,
  price DECIMAL(15,4) NOT NULL,
  change DECIMAL(15,4),
  change_percent DECIMAL(8,4),
  volume INTEGER,
  market_cap INTEGER,
  high_24h DECIMAL(15,4),
  low_24h DECIMAL(15,4),
  source TEXT NOT NULL CHECK(source IN ('websocket', 'polling', 'api')),
  provider TEXT NOT NULL DEFAULT 'twelve_data',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_real_time_quotes_updated_at ON real_time_quotes(updated_at);
CREATE INDEX IF NOT EXISTS idx_real_time_quotes_source ON real_time_quotes(source);
CREATE INDEX IF NOT EXISTS idx_real_time_quotes_provider ON real_time_quotes(provider);

-- Create WebSocket connections tracking table
CREATE TABLE IF NOT EXISTS websocket_connections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT UNIQUE NOT NULL,
  user_id TEXT,
  connection_type TEXT NOT NULL CHECK(connection_type IN ('websocket', 'polling')),
  status TEXT NOT NULL CHECK(status IN ('connecting', 'connected', 'disconnected', 'error')) DEFAULT 'connecting',
  connected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  disconnected_at DATETIME,
  last_ping DATETIME,
  subscriptions TEXT DEFAULT '[]', -- JSON array as text
  ip_address TEXT,
  user_agent TEXT,
  reconnect_count INTEGER DEFAULT 0,
  messages_sent INTEGER DEFAULT 0,
  messages_received INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for websocket_connections
CREATE INDEX IF NOT EXISTS idx_websocket_connections_user_id ON websocket_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_websocket_connections_status ON websocket_connections(status);
CREATE INDEX IF NOT EXISTS idx_websocket_connections_connected_at ON websocket_connections(connected_at);
CREATE INDEX IF NOT EXISTS idx_websocket_connections_session_id ON websocket_connections(session_id);

-- Create WebSocket subscription tracking table
CREATE TABLE IF NOT EXISTS websocket_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  subscribed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  unsubscribed_at DATETIME,
  is_active BOOLEAN DEFAULT TRUE,
  subscription_source TEXT NOT NULL CHECK(subscription_source IN ('websocket', 'polling')),
  last_update DATETIME,
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
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  metric_type TEXT NOT NULL CHECK(metric_type IN ('connection', 'subscription', 'message', 'latency', 'error')),
  symbol TEXT,
  session_id TEXT,
  value DECIMAL(15,4),
  metadata TEXT, -- JSON as text
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for websocket_metrics
CREATE INDEX IF NOT EXISTS idx_websocket_metrics_type ON websocket_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_websocket_metrics_timestamp ON websocket_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_websocket_metrics_symbol ON websocket_metrics(symbol);
CREATE INDEX IF NOT EXISTS idx_websocket_metrics_session_id ON websocket_metrics(session_id);

-- Create triggers for updated_at columns
CREATE TRIGGER IF NOT EXISTS update_websocket_connections_updated_at
  AFTER UPDATE ON websocket_connections
  FOR EACH ROW
  BEGIN
    UPDATE websocket_connections 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
  END;

-- Insert sample data for popular symbols (to initialize real-time quotes)
INSERT OR IGNORE INTO real_time_quotes (symbol, price, source, provider) VALUES
  ('AAPL', 150.00, 'api', 'initialization'),
  ('MSFT', 300.00, 'api', 'initialization'),
  ('GOOGL', 120.00, 'api', 'initialization'),
  ('AMZN', 100.00, 'api', 'initialization'),
  ('TSLA', 250.00, 'api', 'initialization'),
  ('META', 280.00, 'api', 'initialization'),
  ('NFLX', 400.00, 'api', 'initialization'),
  ('NVDA', 450.00, 'api', 'initialization'),
  ('AMD', 90.00, 'api', 'initialization'),
  ('INTC', 50.00, 'api', 'initialization');