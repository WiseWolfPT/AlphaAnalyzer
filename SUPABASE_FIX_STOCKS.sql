-- ================================================================
-- ALFALYZER - FIX PARA TABELA STOCKS EXISTENTE
-- ================================================================

-- 1. Adicionar colunas que podem estar em falta
ALTER TABLE stocks 
ADD COLUMN IF NOT EXISTS industry TEXT,
ADD COLUMN IF NOT EXISTS sector TEXT,
ADD COLUMN IF NOT EXISTS exchange TEXT,
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. Adicionar outras tabelas que podem não existir
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS watchlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'My Watchlist',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS watchlist_stocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  watchlist_id UUID REFERENCES watchlists(id) ON DELETE CASCADE,
  stock_symbol TEXT NOT NULL REFERENCES stocks(symbol),
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  UNIQUE(watchlist_id, stock_symbol)
);

CREATE TABLE IF NOT EXISTS portfolios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'My Portfolio',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS historical_prices (
  id BIGSERIAL PRIMARY KEY,
  symbol TEXT NOT NULL,
  date DATE NOT NULL,
  open DECIMAL(15,4) NOT NULL,
  high DECIMAL(15,4) NOT NULL,
  low DECIMAL(15,4) NOT NULL,
  close DECIMAL(15,4) NOT NULL,
  volume BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(symbol, date)
);

-- 3. Enable RLS em todas as tabelas
ALTER TABLE stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist_stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE historical_prices ENABLE ROW LEVEL SECURITY;

-- 4. Criar policies básicas
DROP POLICY IF EXISTS "Anyone can view stocks" ON stocks;
CREATE POLICY "Anyone can view stocks" ON stocks FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = auth_id);

DROP POLICY IF EXISTS "Anyone can view historical prices" ON historical_prices;
CREATE POLICY "Anyone can view historical prices" ON historical_prices
  FOR SELECT USING (true);

-- 5. Inserir stocks básicos (agora com as colunas corretas)
INSERT INTO stocks (symbol, name, exchange, currency, sector, industry) VALUES
('AAPL', 'Apple Inc.', 'NASDAQ', 'USD', 'Technology', 'Consumer Electronics'),
('MSFT', 'Microsoft Corporation', 'NASDAQ', 'USD', 'Technology', 'Software'),
('GOOGL', 'Alphabet Inc.', 'NASDAQ', 'USD', 'Technology', 'Internet'),
('AMZN', 'Amazon.com Inc.', 'NASDAQ', 'USD', 'Consumer Discretionary', 'E-Commerce'),
('TSLA', 'Tesla Inc.', 'NASDAQ', 'USD', 'Consumer Discretionary', 'Automotive'),
('META', 'Meta Platforms Inc.', 'NASDAQ', 'USD', 'Technology', 'Internet'),
('NVDA', 'NVIDIA Corporation', 'NASDAQ', 'USD', 'Technology', 'Semiconductors'),
('JPM', 'JPMorgan Chase & Co.', 'NYSE', 'USD', 'Financial Services', 'Banks'),
('V', 'Visa Inc.', 'NYSE', 'USD', 'Financial Services', 'Credit Services'),
('JNJ', 'Johnson & Johnson', 'NYSE', 'USD', 'Healthcare', 'Drug Manufacturers')
ON CONFLICT (symbol) DO UPDATE SET
  name = EXCLUDED.name,
  exchange = EXCLUDED.exchange,
  currency = EXCLUDED.currency,
  sector = EXCLUDED.sector,
  industry = EXCLUDED.industry,
  updated_at = NOW();

-- 6. Criar indexes importantes
CREATE INDEX IF NOT EXISTS idx_stocks_symbol ON stocks(symbol);
CREATE INDEX IF NOT EXISTS idx_historical_prices_symbol ON historical_prices(symbol);
CREATE INDEX IF NOT EXISTS idx_historical_prices_date ON historical_prices(symbol, date);

-- 7. Verificação final
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'stocks' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verificar stocks inseridos
SELECT symbol, name, industry FROM stocks ORDER BY symbol;