-- EXECUTE CADA PARTE SEPARADAMENTE NO SUPABASE

-- ========================================
-- PARTE 1: LIMPAR E PREPARAR (VERSÃO CORRIGIDA)
-- ========================================

-- Remover função antiga se existir (sem se preocupar com triggers)
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Renomear a tabela price_alerts problemática (que tem estrutura errada)
ALTER TABLE IF EXISTS price_alerts RENAME TO old_cache_table;

-- ========================================
-- PARTE 2: CRIAR TODAS AS 5 TABELAS
-- ========================================

-- Users metadata
CREATE TABLE users_metadata (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium', 'pro')),
  stripe_customer_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Watchlists
CREATE TABLE watchlists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  symbols TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Portfolios
CREATE TABLE portfolios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  holdings JSONB DEFAULT '[]',
  total_value DECIMAL(15,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Price alerts
CREATE TABLE price_alerts (
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

-- Cache quotes
CREATE TABLE cache_quotes (
  symbol TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- PARTE 3: CRIAR ÍNDICES
-- ========================================

CREATE INDEX idx_watchlists_user ON watchlists(user_id);
CREATE INDEX idx_portfolios_user ON portfolios(user_id);
CREATE INDEX idx_alerts_user ON price_alerts(user_id);
CREATE INDEX idx_alerts_symbol ON price_alerts(symbol);
CREATE INDEX idx_cache_quotes_updated ON cache_quotes(updated_at);

-- ========================================
-- PARTE 4: HABILITAR RLS
-- ========================================

ALTER TABLE users_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cache_quotes ENABLE ROW LEVEL SECURITY;

-- ========================================
-- PARTE 5: CRIAR POLÍTICAS RLS
-- ========================================

-- Users metadata
CREATE POLICY "Users can view own metadata" ON users_metadata
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own metadata" ON users_metadata
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own metadata" ON users_metadata
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Watchlists
CREATE POLICY "Users can view own watchlists" ON watchlists
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own watchlists" ON watchlists
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own watchlists" ON watchlists
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own watchlists" ON watchlists
  FOR DELETE USING (auth.uid() = user_id);

-- Portfolios
CREATE POLICY "Users can view own portfolios" ON portfolios
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own portfolios" ON portfolios
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own portfolios" ON portfolios
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own portfolios" ON portfolios
  FOR DELETE USING (auth.uid() = user_id);

-- Price alerts
CREATE POLICY "Users can view own alerts" ON price_alerts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own alerts" ON price_alerts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own alerts" ON price_alerts
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own alerts" ON price_alerts
  FOR DELETE USING (auth.uid() = user_id);

-- Cache quotes
CREATE POLICY "Public can read cache" ON cache_quotes
  FOR SELECT USING (true);

-- ========================================
-- PARTE 6: CRIAR FUNÇÃO E TRIGGERS
-- ========================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para cada tabela
CREATE TRIGGER update_users_metadata_updated_at 
  BEFORE UPDATE ON users_metadata
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_watchlists_updated_at 
  BEFORE UPDATE ON watchlists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_portfolios_updated_at 
  BEFORE UPDATE ON portfolios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_price_alerts_updated_at 
  BEFORE UPDATE ON price_alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- PARTE 7: VERIFICAR RESULTADO FINAL
-- ========================================

SELECT 
  'SUCCESS! All tables created' as status,
  COUNT(*) as total_tables
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users_metadata', 'watchlists', 'portfolios', 'price_alerts', 'cache_quotes');

-- Verificar colunas de cada tabela
SELECT 
  table_name,
  COUNT(*) as columns
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name IN ('users_metadata', 'watchlists', 'portfolios', 'price_alerts', 'cache_quotes')
GROUP BY table_name
ORDER BY table_name;