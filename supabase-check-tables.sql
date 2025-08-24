-- Script para verificar o estado atual das tabelas
-- Execute isto PRIMEIRO para ver o que já existe

-- Verificar quais tabelas existem
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users_metadata', 'watchlists', 'portfolios', 'price_alerts', 'cache_quotes');

-- Verificar colunas da tabela users_metadata (se existir)
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'users_metadata'
ORDER BY ordinal_position;

-- Verificar colunas da tabela watchlists (se existir)
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'watchlists'
ORDER BY ordinal_position;

-- Verificar colunas da tabela portfolios (se existir)
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'portfolios'
ORDER BY ordinal_position;

-- Verificar colunas da tabela price_alerts (se existir)
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'price_alerts'
ORDER BY ordinal_position;

-- Verificar colunas da tabela cache_quotes (se existir)
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'cache_quotes'
ORDER BY ordinal_position;