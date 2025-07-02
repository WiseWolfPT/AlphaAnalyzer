-- UP
CREATE TABLE watchlists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE watchlist_stocks (
  watchlist_id INTEGER NOT NULL,
  stock_symbol TEXT NOT NULL,
  added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  PRIMARY KEY (watchlist_id, stock_symbol),
  FOREIGN KEY (watchlist_id) REFERENCES watchlists(id) ON DELETE CASCADE,
  FOREIGN KEY (stock_symbol) REFERENCES stocks(symbol) ON DELETE CASCADE
);

CREATE INDEX idx_watchlists_user_id ON watchlists(user_id);
CREATE INDEX idx_watchlist_stocks_symbol ON watchlist_stocks(stock_symbol);

-- DOWN
DROP TABLE IF EXISTS watchlist_stocks;
DROP TABLE IF EXISTS watchlists;