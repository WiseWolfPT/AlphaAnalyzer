-- UP
CREATE TABLE api_cache (
  cache_key TEXT PRIMARY KEY,
  cache_value TEXT NOT NULL,
  cache_type TEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE api_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider TEXT NOT NULL CHECK(provider IN ('alpha_vantage', 'finnhub', 'fmp', 'twelve_data')),
  endpoint TEXT NOT NULL,
  user_id INTEGER,
  ip_address TEXT,
  request_count INTEGER DEFAULT 1,
  response_time_ms INTEGER,
  status_code INTEGER,
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE stock_prices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  symbol TEXT NOT NULL,
  date DATE NOT NULL,
  open REAL,
  high REAL,
  low REAL,
  close REAL,
  adjusted_close REAL,
  volume INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (symbol) REFERENCES stocks(symbol),
  UNIQUE(symbol, date)
);

CREATE TABLE stock_fundamentals (
  symbol TEXT PRIMARY KEY,
  market_cap REAL,
  pe_ratio REAL,
  peg_ratio REAL,
  dividend_yield REAL,
  eps REAL,
  revenue_per_share REAL,
  profit_margin REAL,
  operating_margin REAL,
  return_on_assets REAL,
  return_on_equity REAL,
  revenue_growth REAL,
  earnings_growth REAL,
  current_ratio REAL,
  debt_to_equity REAL,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (symbol) REFERENCES stocks(symbol)
);

CREATE INDEX idx_api_cache_expires ON api_cache(expires_at);
CREATE INDEX idx_api_usage_provider ON api_usage(provider);
CREATE INDEX idx_api_usage_created ON api_usage(created_at);
CREATE INDEX idx_stock_prices_symbol_date ON stock_prices(symbol, date);
CREATE INDEX idx_stock_fundamentals_updated ON stock_fundamentals(last_updated);

-- DOWN
DROP TABLE IF EXISTS stock_fundamentals;
DROP TABLE IF EXISTS stock_prices;
DROP TABLE IF EXISTS api_usage;
DROP TABLE IF EXISTS api_cache;