-- WAVE 4: Supabase Migration Schema
-- Migração de SQLite para PostgreSQL com Row Level Security
-- Foco em investidores portugueses com mercados internacionais

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing tables if they exist (for clean migration)
DROP TABLE IF EXISTS watchlist_stocks CASCADE;
DROP TABLE IF EXISTS watchlists CASCADE;
DROP TABLE IF EXISTS portfolios CASCADE;
DROP TABLE IF EXISTS portfolio_holdings CASCADE;
DROP TABLE IF EXISTS transcripts CASCADE;
DROP TABLE IF EXISTS stocks CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table with Supabase auth integration
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  preferred_currency TEXT DEFAULT 'USD' CHECK (preferred_currency IN ('USD', 'EUR')),
  preferred_language TEXT DEFAULT 'pt' CHECK (preferred_language IN ('pt', 'en')),
  preferred_region TEXT DEFAULT 'EU' CHECK (preferred_region IN ('USA', 'EU', 'APAC')),
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'premium')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  profile_picture_url TEXT,
  timezone TEXT DEFAULT 'Europe/Lisbon'
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = auth_id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = auth_id);

-- Stocks table for international markets (USA & EU focus)
CREATE TABLE stocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  exchange TEXT NOT NULL,
  currency TEXT DEFAULT 'USD' CHECK (currency IN ('USD', 'EUR', 'GBP', 'CHF')),
  sector TEXT,
  industry TEXT,
  market_cap BIGINT,
  logo_url TEXT,
  website_url TEXT,
  description TEXT,
  country TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for stocks (read-only for all authenticated users)
ALTER TABLE stocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view stocks" ON stocks
  FOR SELECT USING (auth.role() = 'authenticated');

-- Portfolios table for investment tracking
CREATE TABLE portfolios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'My Portfolio',
  description TEXT,
  base_currency TEXT DEFAULT 'USD' CHECK (base_currency IN ('USD', 'EUR')),
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for portfolios
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own portfolios" ON portfolios
  FOR ALL USING (auth.uid() = (SELECT auth_id FROM users WHERE id = user_id));

-- Portfolio holdings for real-time P&L tracking
CREATE TABLE portfolio_holdings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portfolio_id UUID REFERENCES portfolios(id) ON DELETE CASCADE,
  stock_symbol TEXT NOT NULL,
  quantity DECIMAL(15,4) NOT NULL CHECK (quantity > 0),
  average_cost DECIMAL(15,4) NOT NULL CHECK (average_cost > 0),
  original_currency TEXT DEFAULT 'USD' CHECK (original_currency IN ('USD', 'EUR')),
  purchase_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure stock exists
  FOREIGN KEY (stock_symbol) REFERENCES stocks(symbol)
);

-- Enable RLS for portfolio holdings
ALTER TABLE portfolio_holdings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own holdings" ON portfolio_holdings
  FOR ALL USING (
    auth.uid() = (
      SELECT u.auth_id 
      FROM users u 
      JOIN portfolios p ON p.user_id = u.id 
      WHERE p.id = portfolio_id
    )
  );

-- Watchlists table
CREATE TABLE watchlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'My Watchlist',
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for watchlists
ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own watchlists" ON watchlists
  FOR ALL USING (auth.uid() = (SELECT auth_id FROM users WHERE id = user_id));

-- Watchlist stocks junction table
CREATE TABLE watchlist_stocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  watchlist_id UUID REFERENCES watchlists(id) ON DELETE CASCADE,
  stock_symbol TEXT NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  
  -- Ensure stock exists
  FOREIGN KEY (stock_symbol) REFERENCES stocks(symbol),
  
  -- Prevent duplicates
  UNIQUE(watchlist_id, stock_symbol)
);

-- Enable RLS for watchlist stocks
ALTER TABLE watchlist_stocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own watchlist stocks" ON watchlist_stocks
  FOR ALL USING (
    auth.uid() = (
      SELECT u.auth_id 
      FROM users u 
      JOIN watchlists w ON w.user_id = u.id 
      WHERE w.id = watchlist_id
    )
  );

-- Transcripts table for earnings calls (Admin managed)
CREATE TABLE transcripts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticker TEXT NOT NULL,
  company_name TEXT NOT NULL,
  quarter TEXT CHECK(quarter IN ('Q1', 'Q2', 'Q3', 'Q4', 'FY')),
  year INTEGER NOT NULL CHECK (year >= 2020 AND year <= 2030),
  call_date DATE,
  raw_transcript TEXT,
  ai_summary JSONB,
  key_highlights TEXT[],
  financial_metrics JSONB,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'review', 'published', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  view_count INTEGER DEFAULT 0,
  admin_notes TEXT,
  
  -- Ensure transcript belongs to valid stock
  FOREIGN KEY (ticker) REFERENCES stocks(symbol)
);

-- Enable RLS for transcripts (public read, admin write)
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published transcripts" ON transcripts
  FOR SELECT USING (status = 'published');

-- Create indexes for performance
CREATE INDEX idx_users_auth_id ON users(auth_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_stocks_symbol ON stocks(symbol);
CREATE INDEX idx_stocks_exchange_currency ON stocks(exchange, currency);
CREATE INDEX idx_portfolios_user_id ON portfolios(user_id);
CREATE INDEX idx_portfolio_holdings_portfolio_id ON portfolio_holdings(portfolio_id);
CREATE INDEX idx_portfolio_holdings_stock_symbol ON portfolio_holdings(stock_symbol);
CREATE INDEX idx_watchlists_user_id ON watchlists(user_id);
CREATE INDEX idx_watchlist_stocks_watchlist_id ON watchlist_stocks(watchlist_id);
CREATE INDEX idx_watchlist_stocks_symbol ON watchlist_stocks(stock_symbol);
CREATE INDEX idx_transcripts_ticker_status ON transcripts(ticker, status);
CREATE INDEX idx_transcripts_published_at ON transcripts(published_at DESC) WHERE status = 'published';

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stocks_updated_at BEFORE UPDATE ON stocks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_portfolios_updated_at BEFORE UPDATE ON portfolios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_portfolio_holdings_updated_at BEFORE UPDATE ON portfolio_holdings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_watchlists_updated_at BEFORE UPDATE ON watchlists FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transcripts_updated_at BEFORE UPDATE ON transcripts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed initial international stocks (USA & EU focus)
INSERT INTO stocks (symbol, name, exchange, currency, sector, industry, country) VALUES
-- US Stocks
('AAPL', 'Apple Inc.', 'NASDAQ', 'USD', 'Technology', 'Consumer Electronics', 'US'),
('MSFT', 'Microsoft Corporation', 'NASDAQ', 'USD', 'Technology', 'Software', 'US'),
('GOOGL', 'Alphabet Inc.', 'NASDAQ', 'USD', 'Technology', 'Internet Content & Information', 'US'),
('AMZN', 'Amazon.com Inc.', 'NASDAQ', 'USD', 'Consumer Discretionary', 'Internet Retail', 'US'),
('TSLA', 'Tesla Inc.', 'NASDAQ', 'USD', 'Consumer Discretionary', 'Auto Manufacturers', 'US'),
('META', 'Meta Platforms Inc.', 'NASDAQ', 'USD', 'Technology', 'Internet Content & Information', 'US'),
('NVDA', 'NVIDIA Corporation', 'NASDAQ', 'USD', 'Technology', 'Semiconductors', 'US'),
('JPM', 'JPMorgan Chase & Co.', 'NYSE', 'USD', 'Financial Services', 'Banks', 'US'),
('V', 'Visa Inc.', 'NYSE', 'USD', 'Financial Services', 'Credit Services', 'US'),
('JNJ', 'Johnson & Johnson', 'NYSE', 'USD', 'Healthcare', 'Drug Manufacturers', 'US'),

-- European Stocks
('SAP', 'SAP SE', 'XETRA', 'EUR', 'Technology', 'Software', 'DE'),
('ASML', 'ASML Holding N.V.', 'EURONEXT', 'EUR', 'Technology', 'Semiconductors', 'NL'),
('LVMH', 'LVMH Moët Hennessy Louis Vuitton', 'EURONEXT', 'EUR', 'Consumer Discretionary', 'Luxury Goods', 'FR'),
('NVO', 'Novo Nordisk A/S', 'NASDAQ', 'USD', 'Healthcare', 'Drug Manufacturers', 'DK'),
('TM', 'Toyota Motor Corporation', 'NYSE', 'USD', 'Consumer Discretionary', 'Auto Manufacturers', 'JP'),
('SHEL', 'Shell plc', 'LSE', 'GBP', 'Energy', 'Oil & Gas Integrated', 'GB'),
('UNA', 'Unilever PLC', 'LSE', 'GBP', 'Consumer Staples', 'Household & Personal Products', 'GB'),
('OR', 'L''Oréal S.A.', 'EURONEXT', 'EUR', 'Consumer Staples', 'Household & Personal Products', 'FR'),
('MC', 'LVMH Moët Hennessy Louis Vuitton', 'EURONEXT', 'EUR', 'Consumer Discretionary', 'Luxury Goods', 'FR'),
('EL', 'The Estée Lauder Companies Inc.', 'NYSE', 'USD', 'Consumer Staples', 'Household & Personal Products', 'US');

-- Create a view for portfolio performance (real-time P&L)
CREATE OR REPLACE VIEW portfolio_performance AS
SELECT 
  h.portfolio_id,
  h.id as holding_id,
  h.stock_symbol,
  s.name as stock_name,
  s.currency as stock_currency,
  h.quantity,
  h.average_cost,
  h.original_currency,
  h.purchase_date,
  -- Calculate total cost basis
  (h.quantity * h.average_cost) as total_cost,
  -- These will be updated via real-time price feeds
  NULL::DECIMAL as current_price,
  NULL::DECIMAL as market_value,
  NULL::DECIMAL as unrealized_gain_loss,
  NULL::DECIMAL as unrealized_gain_loss_percent,
  h.created_at,
  h.updated_at
FROM portfolio_holdings h
JOIN stocks s ON s.symbol = h.stock_symbol;

-- Create function for user signup (called by triggers)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users (auth_id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email));
  
  -- Create default portfolio
  INSERT INTO portfolios (user_id, name, is_default)
  VALUES (
    (SELECT id FROM users WHERE auth_id = NEW.id),
    'My Portfolio',
    true
  );
  
  -- Create default watchlist
  INSERT INTO watchlists (user_id, name, is_default)
  VALUES (
    (SELECT id FROM users WHERE auth_id = NEW.id),
    'My Watchlist',
    true
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Migration complete
SELECT 'Supabase migration completed successfully!' as status;