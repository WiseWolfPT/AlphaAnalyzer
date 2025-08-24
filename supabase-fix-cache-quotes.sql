-- CORRIGIR A TABELA cache_quotes

-- ========================================
-- ADICIONAR COLUNA updated_at NA cache_quotes
-- ========================================

-- Verificar se a coluna existe
SELECT column_name 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'cache_quotes';

-- Adicionar coluna updated_at se não existir
ALTER TABLE cache_quotes 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Agora criar o índice
CREATE INDEX IF NOT EXISTS idx_cache_quotes_updated ON cache_quotes(updated_at);

-- ========================================
-- CONTINUAR COM OS OUTROS ÍNDICES
-- ========================================

CREATE INDEX IF NOT EXISTS idx_watchlists_user ON watchlists(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolios_user ON portfolios(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_user ON price_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_symbol ON price_alerts(symbol);

-- ========================================
-- VERIFICAR ESTRUTURA FINAL DA cache_quotes
-- ========================================

SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'cache_quotes'
ORDER BY ordinal_position;