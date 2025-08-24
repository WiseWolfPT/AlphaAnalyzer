-- Script para adicionar colunas faltantes às tabelas existentes
-- Execute isto DEPOIS de verificar o que está faltando

-- Adicionar updated_at em tabelas que não têm
DO $$ 
BEGIN
    -- Check and add updated_at to users_metadata
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users_metadata' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE users_metadata 
        ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;

    -- Check and add updated_at to watchlists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'watchlists' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE watchlists 
        ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;

    -- Check and add updated_at to portfolios
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'portfolios' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE portfolios 
        ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;

    -- Check and add updated_at to price_alerts
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'price_alerts' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE price_alerts 
        ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Agora criar os triggers apenas se as tabelas existirem
-- Drop existing triggers and function first
DROP TRIGGER IF EXISTS update_users_metadata_updated_at ON users_metadata;
DROP TRIGGER IF EXISTS update_watchlists_updated_at ON watchlists;
DROP TRIGGER IF EXISTS update_portfolios_updated_at ON portfolios;
DROP TRIGGER IF EXISTS update_price_alerts_updated_at ON price_alerts;
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Create the function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers only for existing tables
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users_metadata') THEN
        CREATE TRIGGER update_users_metadata_updated_at 
        BEFORE UPDATE ON users_metadata
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'watchlists') THEN
        CREATE TRIGGER update_watchlists_updated_at 
        BEFORE UPDATE ON watchlists
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'portfolios') THEN
        CREATE TRIGGER update_portfolios_updated_at 
        BEFORE UPDATE ON portfolios
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'price_alerts') THEN
        CREATE TRIGGER update_price_alerts_updated_at 
        BEFORE UPDATE ON price_alerts
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Verificar o resultado
SELECT 
    table_name,
    COUNT(*) as column_count,
    string_agg(column_name, ', ') as columns
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('users_metadata', 'watchlists', 'portfolios', 'price_alerts', 'cache_quotes')
GROUP BY table_name
ORDER BY table_name;