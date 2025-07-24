-- Create schema for cache
CREATE SCHEMA IF NOT EXISTS cache;

-- Tabela para cotações individuais
CREATE TABLE cache.stock_quotes (
  symbol TEXT PRIMARY KEY,
  quote_data JSONB NOT NULL,
  provider TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  hit_count INTEGER DEFAULT 0,
  last_accessed TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela para batch quotes
CREATE TABLE cache.batch_quotes (
  batch_id TEXT PRIMARY KEY,
  symbols TEXT[] NOT NULL,
  quotes_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Tabela para market status
CREATE TABLE cache.market_status (
  market TEXT PRIMARY KEY,
  status_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Tabela para metadados de API
CREATE TABLE cache.api_metadata (
  id SERIAL PRIMARY KEY,
  provider TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  call_count INTEGER DEFAULT 0,
  last_called TIMESTAMPTZ DEFAULT NOW(),
  quota_remaining INTEGER,
  quota_reset_at TIMESTAMPTZ,
  avg_response_time_ms INTEGER
);

-- NOVA: Tabela para real-time updates
CREATE TABLE public.realtime_quotes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  change DECIMAL(10,2),
  change_percent DECIMAL(5,2),
  volume BIGINT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  INDEX idx_symbol_timestamp (symbol, timestamp DESC)
);

-- Habilitar Realtime para a tabela
ALTER TABLE public.realtime_quotes REPLICA IDENTITY FULL;

-- Índices para performance
CREATE INDEX idx_stock_quotes_expires ON cache.stock_quotes(expires_at);
CREATE INDEX idx_stock_quotes_symbol_expires ON cache.stock_quotes(symbol, expires_at);
CREATE INDEX idx_batch_quotes_expires ON cache.batch_quotes(expires_at);
CREATE INDEX idx_market_status_expires ON cache.market_status(expires_at);

-- Função para limpar cache expirado
CREATE OR REPLACE FUNCTION cache.cleanup_expired_entries()
RETURNS void AS $$
BEGIN
  DELETE FROM cache.stock_quotes WHERE expires_at < NOW();
  DELETE FROM cache.batch_quotes WHERE expires_at < NOW();
  DELETE FROM cache.market_status WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION cache.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_stock_quotes_updated_at
  BEFORE UPDATE ON cache.stock_quotes
  FOR EACH ROW
  EXECUTE FUNCTION cache.update_updated_at_column();

-- Políticas RLS para Realtime
ALTER TABLE public.realtime_quotes ENABLE ROW LEVEL SECURITY;

-- Política para permitir leitura pública
CREATE POLICY "Enable read access for all users" ON public.realtime_quotes
  FOR SELECT USING (true);

-- Política para permitir escrita apenas do backend
CREATE POLICY "Enable insert for service role only" ON public.realtime_quotes
  FOR INSERT WITH CHECK (auth.role() = 'service_role');