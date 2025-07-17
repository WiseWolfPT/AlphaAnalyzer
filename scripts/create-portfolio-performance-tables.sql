-- =====================================================
-- Portfolio Performance Tables & Functions
-- ALFALYZER - Fase 3 Implementation
-- Criado para suportar análise avançada de performance
-- =====================================================

-- Criar tabela principal de performance de portfólios
CREATE TABLE IF NOT EXISTS portfolio_performance (
  id SERIAL PRIMARY KEY,
  portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_value DECIMAL(20,2) NOT NULL DEFAULT 0,
  total_cost DECIMAL(20,2) NOT NULL DEFAULT 0,
  cash_balance DECIMAL(20,2) DEFAULT 0,
  unrealized_gain_loss DECIMAL(20,2) GENERATED ALWAYS AS (total_value - total_cost) STORED,
  day_change DECIMAL(20,2) DEFAULT 0,
  day_change_percent DECIMAL(10,4) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraint para garantir um registro por portfolio por dia
  UNIQUE(portfolio_id, date)
);

-- Comentários explicativos
COMMENT ON TABLE portfolio_performance IS 'Armazena snapshots diários de performance dos portfólios';
COMMENT ON COLUMN portfolio_performance.total_value IS 'Valor total atual do portfólio (market value)';
COMMENT ON COLUMN portfolio_performance.total_cost IS 'Custo total investido (cost basis)';
COMMENT ON COLUMN portfolio_performance.cash_balance IS 'Saldo em dinheiro disponível';
COMMENT ON COLUMN portfolio_performance.unrealized_gain_loss IS 'Ganho/perda não realizado (calculado automaticamente)';
COMMENT ON COLUMN portfolio_performance.day_change IS 'Mudança em valor desde o dia anterior';
COMMENT ON COLUMN portfolio_performance.day_change_percent IS 'Mudança percentual desde o dia anterior';

-- Criar índices para otimização de performance
CREATE INDEX IF NOT EXISTS idx_portfolio_performance_portfolio_id ON portfolio_performance(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_performance_date ON portfolio_performance(date DESC);
CREATE INDEX IF NOT EXISTS idx_portfolio_performance_portfolio_date ON portfolio_performance(portfolio_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_portfolio_performance_created_at ON portfolio_performance(created_at DESC);

-- Tabela auxiliar para métricas de holdings individuais
CREATE TABLE IF NOT EXISTS holding_performance (
  id SERIAL PRIMARY KEY,
  holding_id UUID NOT NULL REFERENCES holdings(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  symbol VARCHAR(10) NOT NULL,
  quantity DECIMAL(20,8) NOT NULL,
  price DECIMAL(20,4) NOT NULL,
  market_value DECIMAL(20,2) NOT NULL,
  cost_basis DECIMAL(20,2) NOT NULL,
  unrealized_pnl DECIMAL(20,2) NOT NULL,
  day_change DECIMAL(20,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(holding_id, date)
);

COMMENT ON TABLE holding_performance IS 'Histórico de performance de holdings individuais';

-- Índices para holding_performance
CREATE INDEX IF NOT EXISTS idx_holding_performance_holding_id ON holding_performance(holding_id);
CREATE INDEX IF NOT EXISTS idx_holding_performance_symbol ON holding_performance(symbol);
CREATE INDEX IF NOT EXISTS idx_holding_performance_date ON holding_performance(date DESC);

-- =====================================================
-- STORED PROCEDURES E FUNCTIONS
-- =====================================================

-- Function para calcular holdings de um portfólio baseado em transações
CREATE OR REPLACE FUNCTION calculate_holdings(p_portfolio_id UUID)
RETURNS TABLE(
  symbol VARCHAR(10),
  quantity DECIMAL(20,8),
  average_price DECIMAL(20,4),
  total_cost DECIMAL(20,2),
  last_updated TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  WITH transaction_summary AS (
    SELECT 
      t.symbol,
      SUM(CASE 
        WHEN t.type = 'buy' THEN t.quantity 
        WHEN t.type = 'sell' THEN -t.quantity 
        ELSE 0 
      END) as net_quantity,
      SUM(CASE 
        WHEN t.type = 'buy' THEN t.quantity * t.price + COALESCE(t.fees, 0)
        WHEN t.type = 'sell' THEN -(t.quantity * t.price - COALESCE(t.fees, 0))
        ELSE 0 
      END) as net_cost
    FROM transactions t
    WHERE t.portfolio_id = p_portfolio_id
    GROUP BY t.symbol
    HAVING SUM(CASE 
      WHEN t.type = 'buy' THEN t.quantity 
      WHEN t.type = 'sell' THEN -t.quantity 
      ELSE 0 
    END) > 0
  )
  SELECT 
    ts.symbol,
    ts.net_quantity,
    CASE 
      WHEN ts.net_quantity > 0 THEN ts.net_cost / ts.net_quantity
      ELSE 0
    END as avg_price,
    ts.net_cost,
    NOW() as last_updated
  FROM transaction_summary ts;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_holdings IS 'Calcula holdings atuais baseado no histórico de transações';

-- Function para atualizar holdings de um portfólio
CREATE OR REPLACE FUNCTION update_portfolio_holdings(p_portfolio_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  holding_record RECORD;
  existing_holding_id UUID;
BEGIN
  -- Deletar holdings com quantidade zero
  DELETE FROM holdings 
  WHERE portfolio_id = p_portfolio_id 
  AND quantity <= 0;
  
  -- Recalcular e atualizar holdings
  FOR holding_record IN 
    SELECT * FROM calculate_holdings(p_portfolio_id)
  LOOP
    -- Verificar se o holding já existe
    SELECT id INTO existing_holding_id
    FROM holdings 
    WHERE portfolio_id = p_portfolio_id 
    AND symbol = holding_record.symbol;
    
    IF existing_holding_id IS NOT NULL THEN
      -- Atualizar holding existente
      UPDATE holdings 
      SET 
        quantity = holding_record.quantity,
        average_price = holding_record.average_price,
        total_cost = holding_record.total_cost,
        last_updated = holding_record.last_updated
      WHERE id = existing_holding_id;
    ELSE
      -- Criar novo holding
      INSERT INTO holdings (
        portfolio_id, 
        symbol, 
        quantity, 
        average_price, 
        total_cost,
        last_updated
      ) VALUES (
        p_portfolio_id,
        holding_record.symbol,
        holding_record.quantity,
        holding_record.average_price,
        holding_record.total_cost,
        holding_record.last_updated
      );
    END IF;
  END LOOP;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Erro ao atualizar holdings do portfólio %: %', p_portfolio_id, SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_portfolio_holdings IS 'Atualiza a tabela holdings baseado nas transações do portfólio';

-- Function para calcular resumo de portfólio
CREATE OR REPLACE FUNCTION get_portfolio_summary(p_portfolio_id UUID)
RETURNS TABLE(
  portfolio_id UUID,
  total_holdings INTEGER,
  total_market_value DECIMAL(20,2),
  total_cost_basis DECIMAL(20,2),
  total_unrealized_pnl DECIMAL(20,2),
  total_cash_balance DECIMAL(20,2),
  last_updated TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as portfolio_id,
    COALESCE(COUNT(h.id)::INTEGER, 0) as total_holdings,
    COALESCE(SUM(h.current_value), 0) as total_market_value,
    COALESCE(SUM(h.total_cost), 0) as total_cost_basis,
    COALESCE(SUM(h.current_value - h.total_cost), 0) as total_unrealized_pnl,
    COALESCE(p.cash_balance, 0) as total_cash_balance,
    NOW() as last_updated
  FROM portfolios p
  LEFT JOIN holdings h ON h.portfolio_id = p.id AND h.quantity > 0
  WHERE p.id = p_portfolio_id
  GROUP BY p.id, p.cash_balance;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_portfolio_summary IS 'Retorna resumo consolidado de um portfólio';

-- Function para refreshar materialized view de resumo de portfólios
CREATE OR REPLACE FUNCTION refresh_portfolio_summary()
RETURNS BOOLEAN AS $$
BEGIN
  -- Esta function pode ser usada para refresh de materialized views no futuro
  -- Por enquanto, apenas retorna sucesso
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger na tabela portfolio_performance
DROP TRIGGER IF EXISTS trigger_portfolio_performance_updated_at ON portfolio_performance;
CREATE TRIGGER trigger_portfolio_performance_updated_at
  BEFORE UPDATE ON portfolio_performance
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para atualizar holdings automaticamente após transação
CREATE OR REPLACE FUNCTION trigger_update_holdings_after_transaction()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualizar holdings do portfólio após INSERT/UPDATE/DELETE de transação
  PERFORM update_portfolio_holdings(
    CASE 
      WHEN TG_OP = 'DELETE' THEN OLD.portfolio_id
      ELSE NEW.portfolio_id
    END
  );
  
  RETURN CASE 
    WHEN TG_OP = 'DELETE' THEN OLD
    ELSE NEW
  END;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger nas transações
DROP TRIGGER IF EXISTS trigger_transactions_update_holdings ON transactions;
CREATE TRIGGER trigger_transactions_update_holdings
  AFTER INSERT OR UPDATE OR DELETE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_holdings_after_transaction();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS nas tabelas
ALTER TABLE portfolio_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE holding_performance ENABLE ROW LEVEL SECURITY;

-- Policy para portfolio_performance - usuários só veem seus próprios dados
CREATE POLICY "Users can view own portfolio performance" ON portfolio_performance
  FOR SELECT USING (
    portfolio_id IN (
      SELECT id FROM portfolios WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own portfolio performance" ON portfolio_performance
  FOR INSERT WITH CHECK (
    portfolio_id IN (
      SELECT id FROM portfolios WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own portfolio performance" ON portfolio_performance
  FOR UPDATE USING (
    portfolio_id IN (
      SELECT id FROM portfolios WHERE user_id = auth.uid()
    )
  );

-- Policy para holding_performance
CREATE POLICY "Users can view own holding performance" ON holding_performance
  FOR SELECT USING (
    holding_id IN (
      SELECT h.id FROM holdings h
      JOIN portfolios p ON p.id = h.portfolio_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own holding performance" ON holding_performance
  FOR INSERT WITH CHECK (
    holding_id IN (
      SELECT h.id FROM holdings h
      JOIN portfolios p ON p.id = h.portfolio_id
      WHERE p.user_id = auth.uid()
    )
  );

-- =====================================================
-- DADOS INICIAIS E VALIDAÇÃO
-- =====================================================

-- Function para validar integridade dos dados
CREATE OR REPLACE FUNCTION validate_portfolio_data()
RETURNS TABLE(
  portfolio_id UUID,
  issue_type VARCHAR(50),
  issue_description TEXT
) AS $$
BEGIN
  -- Verificar holdings órfãos (sem portfolio)
  RETURN QUERY
  SELECT 
    h.portfolio_id,
    'orphaned_holding'::VARCHAR(50),
    'Holding sem portfólio correspondente: ' || h.symbol
  FROM holdings h
  LEFT JOIN portfolios p ON p.id = h.portfolio_id
  WHERE p.id IS NULL;
  
  -- Verificar portfólios sem holdings
  RETURN QUERY
  SELECT 
    p.id,
    'empty_portfolio'::VARCHAR(50),
    'Portfólio sem holdings: ' || p.name
  FROM portfolios p
  LEFT JOIN holdings h ON h.portfolio_id = p.id
  WHERE h.id IS NULL;
  
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_portfolio_data IS 'Valida integridade dos dados de portfólio e identifica problemas';

-- =====================================================
-- MIGRATION COMPLETED
-- =====================================================

-- Log da criação
DO $$
BEGIN
  RAISE NOTICE '✅ Portfolio Performance Migration Completed Successfully';
  RAISE NOTICE 'Tabelas criadas: portfolio_performance, holding_performance';
  RAISE NOTICE 'Functions criadas: calculate_holdings, update_portfolio_holdings, get_portfolio_summary';
  RAISE NOTICE 'Triggers configurados para atualização automática';
  RAISE NOTICE 'RLS policies aplicadas para segurança';
END $$;