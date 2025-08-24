-- SCRIPT PARA CORRIGIR AS TABELAS EXISTENTES
-- Execute este script no Supabase SQL Editor

-- 1. Primeiro, vamos renomear a tabela price_alerts existente (parece ser uma tabela de cache)
ALTER TABLE IF EXISTS price_alerts RENAME TO old_price_alerts_backup;

-- 2. Agora criar as tabelas corretas que estão faltando

-- Users metadata table
CREATE TABLE IF NOT EXISTS users_metadata (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium', 'pro')),
  stripe_customer_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Watchlists table
CREATE TABLE IF NOT EXISTS watchlists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  symbols TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Portfolios table
CREATE TABLE IF NOT EXISTS portfolios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  holdings JSONB DEFAULT '[]',
  total_value DECIMAL(15,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Price alerts table (NOVA - a correta para alertas de preço)
CREATE TABLE IF NOT EXISTS price_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  symbol TEXT NOT NULL,
  target_price DECIMAL(10,2) NOT NULL,
  alert_type TEXT CHECK (alert_type IN ('above', 'below')) NOT NULL,
  triggered BOOLEAN DEFAULT FALSE,
  triggered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cache quotes table (para cache de preços)
CREATE TABLE IF NOT EXISTS cache_quotes (
  symbol TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_watchlists_user ON watchlists(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolios_user ON portfolios(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_user ON price_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_symbol ON price_alerts(symbol);
CREATE INDEX IF NOT EXISTS idx_cache_quotes_updated ON cache_quotes(updated_at);

-- 4. Habilitar Row Level Security em todas as tabelas
ALTER TABLE users_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cache_quotes ENABLE ROW LEVEL SECURITY;

-- 5. Criar políticas RLS (removendo antigas se existirem)

-- Users metadata
DROP POLICY IF EXISTS "Users can view own metadata" ON users_metadata;
DROP POLICY IF EXISTS "Users can update own metadata" ON users_metadata;
DROP POLICY IF EXISTS "Users can insert own metadata" ON users_metadata;

CREATE POLICY "Users can view own metadata" ON users_metadata
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own metadata" ON users_metadata
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own metadata" ON users_metadata
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Watchlists
DROP POLICY IF EXISTS "Users can view own watchlists" ON watchlists;
DROP POLICY IF EXISTS "Users can create own watchlists" ON watchlists;
DROP POLICY IF EXISTS "Users can update own watchlists" ON watchlists;
DROP POLICY IF EXISTS "Users can delete own watchlists" ON watchlists;

CREATE POLICY "Users can view own watchlists" ON watchlists
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own watchlists" ON watchlists
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own watchlists" ON watchlists
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own watchlists" ON watchlists
  FOR DELETE USING (auth.uid() = user_id);

-- Portfolios
DROP POLICY IF EXISTS "Users can view own portfolios" ON portfolios;
DROP POLICY IF EXISTS "Users can create own portfolios" ON portfolios;
DROP POLICY IF EXISTS "Users can update own portfolios" ON portfolios;
DROP POLICY IF EXISTS "Users can delete own portfolios" ON portfolios;

CREATE POLICY "Users can view own portfolios" ON portfolios
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own portfolios" ON portfolios
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own portfolios" ON portfolios
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own portfolios" ON portfolios
  FOR DELETE USING (auth.uid() = user_id);

-- Price alerts
DROP POLICY IF EXISTS "Users can view own alerts" ON price_alerts;
DROP POLICY IF EXISTS "Users can create own alerts" ON price_alerts;
DROP POLICY IF EXISTS "Users can update own alerts" ON price_alerts;
DROP POLICY IF EXISTS "Users can delete own alerts" ON price_alerts;

CREATE POLICY "Users can view own alerts" ON price_alerts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own alerts" ON price_alerts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own alerts" ON price_alerts
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own alerts" ON price_alerts
  FOR DELETE USING (auth.uid() = user_id);

-- Cache quotes
DROP POLICY IF EXISTS "Public can read cache" ON cache_quotes;
CREATE POLICY "Public can read cache" ON cache_quotes
  FOR SELECT USING (true);

-- 6. Criar função e triggers para updated_at
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Criar triggers
CREATE TRIGGER update_users_metadata_updated_at BEFORE UPDATE ON users_metadata
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_watchlists_updated_at BEFORE UPDATE ON watchlists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_portfolios_updated_at BEFORE UPDATE ON portfolios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_price_alerts_updated_at BEFORE UPDATE ON price_alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. Verificar resultado final
SELECT 
    'Tables created successfully!' as message,
    (SELECT COUNT(*) FROM information_schema.tables 
     WHERE table_schema = 'public' 
     AND table_name IN ('users_metadata', 'watchlists', 'portfolios', 'price_alerts', 'cache_quotes')) as total_tables;