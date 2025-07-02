-- UP
CREATE TABLE stocks (
  symbol TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  exchange TEXT,
  sector TEXT,
  industry TEXT,
  market_cap REAL,
  currency TEXT DEFAULT 'USD',
  country TEXT,
  ipo_date DATE,
  logo_url TEXT,
  website_url TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_stocks_name ON stocks(name);
CREATE INDEX idx_stocks_sector ON stocks(sector);
CREATE INDEX idx_stocks_exchange ON stocks(exchange);

-- DOWN
DROP TABLE IF EXISTS stocks;