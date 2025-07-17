-- ================================================================
-- ALFALYZER - SETUP MANUAL DO SUPABASE
-- ================================================================
-- INSTRUÇÕES:
-- 1. Acesse o Supabase Dashboard
-- 2. Vá para SQL Editor
-- 3. Execute este script completo
-- 4. Verifique se todas as tabelas foram criadas
-- ================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabela de users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS para users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policies para users
DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = auth_id);

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = auth_id);

-- 2. Tabela de stocks
CREATE TABLE IF NOT EXISTS stocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  exchange TEXT,
  currency TEXT DEFAULT 'USD',
  sector TEXT,
  industry TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS para stocks
ALTER TABLE stocks ENABLE ROW LEVEL SECURITY;

-- Policies para stocks
DROP POLICY IF EXISTS "Anyone can view stocks" ON stocks;
CREATE POLICY "Anyone can view stocks" ON stocks
  FOR SELECT USING (true);

-- 3. Tabela de watchlists
CREATE TABLE IF NOT EXISTS watchlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'My Watchlist',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS para watchlists
ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;

-- Policies para watchlists
DROP POLICY IF EXISTS "Users can manage own watchlists" ON watchlists;
CREATE POLICY "Users can manage own watchlists" ON watchlists
  FOR ALL USING (auth.uid() = (SELECT auth_id FROM users WHERE id = user_id));

-- 4. Tabela de watchlist_stocks
CREATE TABLE IF NOT EXISTS watchlist_stocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  watchlist_id UUID REFERENCES watchlists(id) ON DELETE CASCADE,
  stock_symbol TEXT NOT NULL REFERENCES stocks(symbol),
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  UNIQUE(watchlist_id, stock_symbol)
);

-- Enable RLS para watchlist_stocks
ALTER TABLE watchlist_stocks ENABLE ROW LEVEL SECURITY;

-- Policies para watchlist_stocks
DROP POLICY IF EXISTS "Users can manage own watchlist stocks" ON watchlist_stocks;
CREATE POLICY "Users can manage own watchlist stocks" ON watchlist_stocks
  FOR ALL USING (
    auth.uid() = (
      SELECT u.auth_id 
      FROM users u 
      JOIN watchlists w ON w.user_id = u.id 
      WHERE w.id = watchlist_id
    )
  );

-- 5. Tabela de portfolios (para uso futuro)
CREATE TABLE IF NOT EXISTS portfolios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'My Portfolio',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS para portfolios
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;

-- Policies para portfolios
DROP POLICY IF EXISTS "Users can manage own portfolios" ON portfolios;
CREATE POLICY "Users can manage own portfolios" ON portfolios
  FOR ALL USING (auth.uid() = (SELECT auth_id FROM users WHERE id = user_id));

-- 6. Criar indexes para performance
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_stocks_symbol ON stocks(symbol);
CREATE INDEX IF NOT EXISTS idx_watchlists_user_id ON watchlists(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_stocks_watchlist_id ON watchlist_stocks(watchlist_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_stocks_symbol ON watchlist_stocks(stock_symbol);

-- 7. Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 8. Triggers para updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_stocks_updated_at ON stocks;
CREATE TRIGGER update_stocks_updated_at 
  BEFORE UPDATE ON stocks 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_watchlists_updated_at ON watchlists;
CREATE TRIGGER update_watchlists_updated_at 
  BEFORE UPDATE ON watchlists 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. Função para handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users (auth_id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email));
  
  -- Criar watchlist padrão
  INSERT INTO watchlists (user_id, name)
  VALUES (
    (SELECT id FROM users WHERE auth_id = NEW.id),
    'My Watchlist'
  );
  
  -- Criar portfolio padrão
  INSERT INTO portfolios (user_id, name)
  VALUES (
    (SELECT id FROM users WHERE auth_id = NEW.id),
    'My Portfolio'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Trigger para new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 11. Tabela de preços históricos para backfill
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

-- Enable RLS para historical_prices
ALTER TABLE historical_prices ENABLE ROW LEVEL SECURITY;

-- Policies para historical_prices (read-only for authenticated users)
DROP POLICY IF EXISTS "Anyone can view historical prices" ON historical_prices;
CREATE POLICY "Anyone can view historical prices" ON historical_prices
  FOR SELECT USING (true);

-- Indexes para historical_prices
CREATE INDEX IF NOT EXISTS idx_historical_prices_symbol ON historical_prices(symbol);
CREATE INDEX IF NOT EXISTS idx_historical_prices_date ON historical_prices(symbol, date);

-- 12. Inserir stocks básicos para testing
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
ON CONFLICT (symbol) DO NOTHING;

-- ================================================================
-- VERIFICAÇÃO FINAL
-- ================================================================
-- Execute esta query para verificar se tudo está correto:

SELECT 
  schemaname,
  tablename,
  tableowner,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('users', 'stocks', 'watchlists', 'watchlist_stocks', 'portfolios')
ORDER BY tablename;

-- Verificar se os stocks foram inseridos:
SELECT COUNT(*) as total_stocks FROM stocks;

-- ================================================================
-- SETUP CONCLUÍDO!
-- ================================================================