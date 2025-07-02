-- UP
CREATE TABLE portfolios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  currency TEXT DEFAULT 'USD',
  is_public BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE portfolio_holdings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  portfolio_id INTEGER NOT NULL,
  stock_symbol TEXT NOT NULL,
  quantity REAL NOT NULL,
  average_price REAL NOT NULL,
  purchase_date DATE NOT NULL,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE,
  FOREIGN KEY (stock_symbol) REFERENCES stocks(symbol)
);

CREATE TABLE portfolio_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  portfolio_id INTEGER NOT NULL,
  stock_symbol TEXT NOT NULL,
  transaction_type TEXT NOT NULL CHECK(transaction_type IN ('buy', 'sell', 'dividend', 'split')),
  quantity REAL NOT NULL,
  price REAL NOT NULL,
  total_amount REAL NOT NULL,
  transaction_date DATETIME NOT NULL,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE,
  FOREIGN KEY (stock_symbol) REFERENCES stocks(symbol)
);

CREATE INDEX idx_portfolios_user_id ON portfolios(user_id);
CREATE INDEX idx_portfolio_holdings_portfolio_id ON portfolio_holdings(portfolio_id);
CREATE INDEX idx_portfolio_holdings_symbol ON portfolio_holdings(stock_symbol);
CREATE INDEX idx_portfolio_transactions_portfolio_id ON portfolio_transactions(portfolio_id);
CREATE INDEX idx_portfolio_transactions_date ON portfolio_transactions(transaction_date);

-- DOWN
DROP TABLE IF EXISTS portfolio_transactions;
DROP TABLE IF EXISTS portfolio_holdings;
DROP TABLE IF EXISTS portfolios;