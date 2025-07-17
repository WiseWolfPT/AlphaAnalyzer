-- Migration: Create Portfolio Performance Tables
-- Convertido de PostgreSQL para SQLite - Fase 3.7
-- Data: 2025-07-13

-- Tabela principal de performance de portfólio
CREATE TABLE IF NOT EXISTS portfolio_performance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  portfolio_id TEXT NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_value DECIMAL(20,2) NOT NULL DEFAULT 0,
  total_cost DECIMAL(20,2) NOT NULL DEFAULT 0,
  cash_balance DECIMAL(20,2) DEFAULT 0,
  unrealized_gain_loss DECIMAL(20,2) GENERATED ALWAYS AS (total_value - total_cost) STORED,
  unrealized_gain_loss_percent DECIMAL(8,4) GENERATED ALWAYS AS (
    CASE 
      WHEN total_cost > 0 THEN (total_value - total_cost) * 100.0 / total_cost
      ELSE 0.0
    END
  ) STORED,
  day_change DECIMAL(20,2) DEFAULT 0,
  day_change_percent DECIMAL(8,4) DEFAULT 0,
  ytd_change DECIMAL(20,2) DEFAULT 0,
  ytd_change_percent DECIMAL(8,4) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(portfolio_id, date)
);

-- Tabela de performance por holding individual
CREATE TABLE IF NOT EXISTS holding_performance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  portfolio_id TEXT NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  date DATE NOT NULL,
  quantity DECIMAL(20,8) NOT NULL,
  average_price DECIMAL(20,8) NOT NULL,
  current_price DECIMAL(20,8) NOT NULL,
  current_value DECIMAL(20,2) GENERATED ALWAYS AS (quantity * current_price) STORED,
  total_cost DECIMAL(20,2) GENERATED ALWAYS AS (quantity * average_price) STORED,
  unrealized_gain_loss DECIMAL(20,2) GENERATED ALWAYS AS (current_value - total_cost) STORED,
  unrealized_gain_loss_percent DECIMAL(8,4) GENERATED ALWAYS AS (
    CASE 
      WHEN total_cost > 0 THEN (current_value - total_cost) * 100.0 / total_cost
      ELSE 0.0
    END
  ) STORED,
  day_change DECIMAL(20,2) DEFAULT 0,
  day_change_percent DECIMAL(8,4) DEFAULT 0,
  weight_percent DECIMAL(8,4) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(portfolio_id, symbol, date)
);

-- Índices para performance otimizada
CREATE INDEX IF NOT EXISTS idx_portfolio_performance_portfolio_date 
ON portfolio_performance(portfolio_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_portfolio_performance_date 
ON portfolio_performance(date DESC);

CREATE INDEX IF NOT EXISTS idx_holding_performance_portfolio_date 
ON holding_performance(portfolio_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_holding_performance_symbol_date 
ON holding_performance(symbol, date DESC);

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER IF NOT EXISTS update_portfolio_performance_timestamp 
  AFTER UPDATE ON portfolio_performance
  FOR EACH ROW
  BEGIN
    UPDATE portfolio_performance 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
  END;

CREATE TRIGGER IF NOT EXISTS update_holding_performance_timestamp 
  AFTER UPDATE ON holding_performance
  FOR EACH ROW
  BEGIN
    UPDATE holding_performance 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
  END;

-- Views para consultas frequentes (SQLite suporta views)
CREATE VIEW IF NOT EXISTS portfolio_performance_summary AS
SELECT 
  pp.portfolio_id,
  pp.date,
  pp.total_value,
  pp.total_cost,
  pp.unrealized_gain_loss,
  pp.unrealized_gain_loss_percent,
  pp.day_change,
  pp.day_change_percent,
  COUNT(hp.symbol) as holdings_count,
  AVG(hp.unrealized_gain_loss_percent) as avg_holding_performance
FROM portfolio_performance pp
LEFT JOIN holding_performance hp ON pp.portfolio_id = hp.portfolio_id AND pp.date = hp.date
GROUP BY pp.portfolio_id, pp.date, pp.total_value, pp.total_cost, 
         pp.unrealized_gain_loss, pp.unrealized_gain_loss_percent, 
         pp.day_change, pp.day_change_percent;

CREATE VIEW IF NOT EXISTS latest_portfolio_performance AS
SELECT 
  pp.*,
  p.name as portfolio_name,
  p.currency
FROM portfolio_performance pp
JOIN portfolios p ON pp.portfolio_id = p.id
JOIN (
  SELECT portfolio_id, MAX(date) as latest_date
  FROM portfolio_performance
  GROUP BY portfolio_id
) latest ON pp.portfolio_id = latest.portfolio_id AND pp.date = latest.latest_date;

-- Insert inicial para portfolios existentes (se houver)
INSERT OR IGNORE INTO portfolio_performance (portfolio_id, date, total_value, total_cost, cash_balance)
SELECT 
  id as portfolio_id,
  DATE('now') as date,
  0.0 as total_value,
  0.0 as total_cost,
  0.0 as cash_balance
FROM portfolios 
WHERE EXISTS (SELECT 1 FROM portfolios);

-- Comentários para documentação
-- Esta migration cria as tabelas necessárias para tracking de performance de portfólio
-- Inclui cálculos automáticos via computed columns para SQLite
-- Otimizada para consultas frequentes com índices apropriados
-- Compatível com estrutura existente de portfolios e holdings