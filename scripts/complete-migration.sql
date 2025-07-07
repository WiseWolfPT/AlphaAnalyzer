-- ALFALYZER COMPLETE MIGRATION SCRIPT
-- Execute this in Supabase SQL Editor
-- ====================================

-- 1. CORE TABLES
-- ====================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
  subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'canceled', 'past_due')),
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stocks table
CREATE TABLE IF NOT EXISTS public.stocks (
  id SERIAL PRIMARY KEY,
  symbol VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  exchange VARCHAR(50),
  currency VARCHAR(10) DEFAULT 'USD',
  sector VARCHAR(100),
  industry VARCHAR(100),
  market_cap BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Market data table
CREATE TABLE IF NOT EXISTS public.market_data (
  id SERIAL PRIMARY KEY,
  stock_id INTEGER REFERENCES stocks(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  open DECIMAL(10, 2),
  high DECIMAL(10, 2),
  low DECIMAL(10, 2),
  close DECIMAL(10, 2),
  volume BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(stock_id, date)
);

-- Watchlists table
CREATE TABLE IF NOT EXISTS public.watchlists (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Watchlist stocks junction table
CREATE TABLE IF NOT EXISTS public.watchlist_stocks (
  id SERIAL PRIMARY KEY,
  watchlist_id INTEGER REFERENCES watchlists(id) ON DELETE CASCADE,
  stock_id INTEGER REFERENCES stocks(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  UNIQUE(watchlist_id, stock_id)
);

-- Alerts table
CREATE TABLE IF NOT EXISTS public.alerts (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  stock_id INTEGER REFERENCES stocks(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('price_above', 'price_below', 'percent_change', 'volume_spike')),
  threshold DECIMAL(10, 2) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  last_triggered TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alert triggers table
CREATE TABLE IF NOT EXISTS public.alert_triggers (
  id SERIAL PRIMARY KEY,
  alert_id INTEGER REFERENCES alerts(id) ON DELETE CASCADE,
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  price DECIMAL(10, 2),
  message TEXT
);

-- 2. PORTFOLIO TABLES
-- ====================================

-- Portfolios table
CREATE TABLE IF NOT EXISTS public.portfolios (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  currency VARCHAR(10) DEFAULT 'USD',
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
  id SERIAL PRIMARY KEY,
  portfolio_id INTEGER REFERENCES portfolios(id) ON DELETE CASCADE,
  stock_id INTEGER REFERENCES stocks(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('buy', 'sell', 'dividend')),
  quantity DECIMAL(10, 4) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  fees DECIMAL(10, 2) DEFAULT 0,
  notes TEXT,
  executed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Portfolio holdings view
CREATE OR REPLACE VIEW portfolio_holdings AS
SELECT 
  p.id as portfolio_id,
  s.id as stock_id,
  s.symbol,
  s.name,
  SUM(CASE WHEN t.type = 'buy' THEN t.quantity ELSE -t.quantity END) as total_quantity,
  AVG(CASE WHEN t.type = 'buy' THEN t.price END) as average_price,
  MAX(t.executed_at) as last_transaction_date
FROM portfolios p
JOIN transactions t ON p.id = t.portfolio_id
JOIN stocks s ON t.stock_id = s.id
WHERE t.type IN ('buy', 'sell')
GROUP BY p.id, s.id, s.symbol, s.name
HAVING SUM(CASE WHEN t.type = 'buy' THEN t.quantity ELSE -t.quantity END) > 0;

-- 3. TRANSCRIPTS TABLE
-- ====================================

CREATE TABLE IF NOT EXISTS public.earnings_transcripts (
  id SERIAL PRIMARY KEY,
  stock_id INTEGER REFERENCES stocks(id) ON DELETE CASCADE,
  ticker VARCHAR(10) NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  quarter VARCHAR(10) NOT NULL,
  year INTEGER NOT NULL,
  call_date DATE,
  raw_transcript TEXT,
  ai_summary JSONB,
  key_metrics JSONB,
  sentiment_score DECIMAL(3, 2),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'error')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,
  UNIQUE(ticker, quarter, year)
);

-- 4. ENABLE ROW LEVEL SECURITY
-- ====================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist_stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE earnings_transcripts ENABLE ROW LEVEL SECURITY;

-- 5. RLS POLICIES
-- ====================================

-- Users policies
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- Stocks policies (public read)
CREATE POLICY "Stocks are viewable by everyone" ON stocks FOR SELECT USING (true);
CREATE POLICY "Market data is viewable by everyone" ON market_data FOR SELECT USING (true);

-- Watchlists policies
CREATE POLICY "Users can view own watchlists" ON watchlists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own watchlists" ON watchlists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own watchlists" ON watchlists FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own watchlists" ON watchlists FOR DELETE USING (auth.uid() = user_id);

-- Watchlist stocks policies
CREATE POLICY "Users can view own watchlist stocks" ON watchlist_stocks FOR SELECT 
  USING (EXISTS (SELECT 1 FROM watchlists WHERE watchlists.id = watchlist_stocks.watchlist_id AND watchlists.user_id = auth.uid()));
CREATE POLICY "Users can add to own watchlists" ON watchlist_stocks FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM watchlists WHERE watchlists.id = watchlist_stocks.watchlist_id AND watchlists.user_id = auth.uid()));
CREATE POLICY "Users can remove from own watchlists" ON watchlist_stocks FOR DELETE 
  USING (EXISTS (SELECT 1 FROM watchlists WHERE watchlists.id = watchlist_stocks.watchlist_id AND watchlists.user_id = auth.uid()));

-- Alerts policies
CREATE POLICY "Users can view own alerts" ON alerts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own alerts" ON alerts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own alerts" ON alerts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own alerts" ON alerts FOR DELETE USING (auth.uid() = user_id);

-- Alert triggers policies
CREATE POLICY "Users can view own alert triggers" ON alert_triggers FOR SELECT 
  USING (EXISTS (SELECT 1 FROM alerts WHERE alerts.id = alert_triggers.alert_id AND alerts.user_id = auth.uid()));

-- Portfolios policies
CREATE POLICY "Users can view own portfolios" ON portfolios FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own portfolios" ON portfolios FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own portfolios" ON portfolios FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own portfolios" ON portfolios FOR DELETE USING (auth.uid() = user_id);

-- Transactions policies
CREATE POLICY "Users can view own transactions" ON transactions FOR SELECT 
  USING (EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = transactions.portfolio_id AND portfolios.user_id = auth.uid()));
CREATE POLICY "Users can create own transactions" ON transactions FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = transactions.portfolio_id AND portfolios.user_id = auth.uid()));
CREATE POLICY "Users can update own transactions" ON transactions FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = transactions.portfolio_id AND portfolios.user_id = auth.uid()));
CREATE POLICY "Users can delete own transactions" ON transactions FOR DELETE 
  USING (EXISTS (SELECT 1 FROM portfolios WHERE portfolios.id = transactions.portfolio_id AND portfolios.user_id = auth.uid()));

-- Transcripts policies (public read)
CREATE POLICY "Transcripts viewable by everyone" ON earnings_transcripts FOR SELECT USING (status = 'completed');

-- 6. HELPER FUNCTIONS
-- ====================================

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers to all relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stocks_updated_at BEFORE UPDATE ON stocks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_watchlists_updated_at BEFORE UPDATE ON watchlists FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_alerts_updated_at BEFORE UPDATE ON alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_portfolios_updated_at BEFORE UPDATE ON portfolios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transcripts_updated_at BEFORE UPDATE ON earnings_transcripts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. INDEXES FOR PERFORMANCE
-- ====================================

CREATE INDEX idx_market_data_stock_date ON market_data(stock_id, date DESC);
CREATE INDEX idx_transactions_portfolio ON transactions(portfolio_id);
CREATE INDEX idx_transactions_executed ON transactions(executed_at DESC);
CREATE INDEX idx_alerts_user_active ON alerts(user_id, is_active);
CREATE INDEX idx_watchlist_stocks_watchlist ON watchlist_stocks(watchlist_id);
CREATE INDEX idx_transcripts_ticker_date ON earnings_transcripts(ticker, call_date DESC);

-- 8. INITIAL DATA
-- ====================================

-- Insert some popular stocks
INSERT INTO stocks (symbol, name, exchange, sector, industry) VALUES
  ('AAPL', 'Apple Inc.', 'NASDAQ', 'Technology', 'Consumer Electronics'),
  ('MSFT', 'Microsoft Corporation', 'NASDAQ', 'Technology', 'Software'),
  ('GOOGL', 'Alphabet Inc.', 'NASDAQ', 'Technology', 'Internet Services'),
  ('AMZN', 'Amazon.com Inc.', 'NASDAQ', 'Consumer Cyclical', 'E-Commerce'),
  ('TSLA', 'Tesla Inc.', 'NASDAQ', 'Consumer Cyclical', 'Auto Manufacturers')
ON CONFLICT (symbol) DO NOTHING;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully!';
END $$;