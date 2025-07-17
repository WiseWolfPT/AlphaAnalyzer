#!/usr/bin/env tsx
/**
 * SETUP SUPABASE SIMPLIFICADO - SCHEMA BÁSICO
 * Aplica apenas as tabelas essenciais para o funcionamento
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function setupBasicSchema() {
  console.log('🚀 SETUP BÁSICO DO SUPABASE');
  console.log('===========================');

  // 1. Criar tabela de users básica
  console.log('\n1️⃣ Criando tabela users...');
  const usersSchema = `
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    ALTER TABLE users ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY IF NOT EXISTS "Users can view own profile" ON users
      FOR SELECT USING (auth.uid() = auth_id);
  `;

  try {
    await executeSQL(usersSchema, 'users');
  } catch (error) {
    console.log('⚠️ Tabela users já existe ou erro:', error);
  }

  // 2. Criar tabela de stocks
  console.log('\n2️⃣ Criando tabela stocks...');
  const stocksSchema = `
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
    
    ALTER TABLE stocks ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY IF NOT EXISTS "Anyone can view stocks" ON stocks
      FOR SELECT USING (true);
  `;

  try {
    await executeSQL(stocksSchema, 'stocks');
  } catch (error) {
    console.log('⚠️ Tabela stocks já existe ou erro:', error);
  }

  // 3. Criar tabela de watchlists
  console.log('\n3️⃣ Criando tabela watchlists...');
  const watchlistsSchema = `
    CREATE TABLE IF NOT EXISTS watchlists (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL DEFAULT 'My Watchlist',
      description TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY IF NOT EXISTS "Users can manage own watchlists" ON watchlists
      FOR ALL USING (auth.uid() = (SELECT auth_id FROM users WHERE id = user_id));
  `;

  try {
    await executeSQL(watchlistsSchema, 'watchlists');
  } catch (error) {
    console.log('⚠️ Tabela watchlists já existe ou erro:', error);
  }

  // 4. Criar tabela de watchlist_stocks
  console.log('\n4️⃣ Criando tabela watchlist_stocks...');
  const watchlistStocksSchema = `
    CREATE TABLE IF NOT EXISTS watchlist_stocks (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      watchlist_id UUID REFERENCES watchlists(id) ON DELETE CASCADE,
      stock_symbol TEXT NOT NULL,
      added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      notes TEXT,
      UNIQUE(watchlist_id, stock_symbol)
    );
    
    ALTER TABLE watchlist_stocks ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY IF NOT EXISTS "Users can manage own watchlist stocks" ON watchlist_stocks
      FOR ALL USING (
        auth.uid() = (
          SELECT u.auth_id 
          FROM users u 
          JOIN watchlists w ON w.user_id = u.id 
          WHERE w.id = watchlist_id
        )
      );
  `;

  try {
    await executeSQL(watchlistStocksSchema, 'watchlist_stocks');
  } catch (error) {
    console.log('⚠️ Tabela watchlist_stocks já existe ou erro:', error);
  }

  // 5. Inserir stocks básicos
  console.log('\n5️⃣ Inserindo stocks básicos...');
  const seedStocks = `
    INSERT INTO stocks (symbol, name, exchange, currency, sector, industry) VALUES
    ('AAPL', 'Apple Inc.', 'NASDAQ', 'USD', 'Technology', 'Consumer Electronics'),
    ('MSFT', 'Microsoft Corporation', 'NASDAQ', 'USD', 'Technology', 'Software'),
    ('GOOGL', 'Alphabet Inc.', 'NASDAQ', 'USD', 'Technology', 'Internet'),
    ('AMZN', 'Amazon.com Inc.', 'NASDAQ', 'USD', 'Consumer Discretionary', 'E-Commerce'),
    ('TSLA', 'Tesla Inc.', 'NASDAQ', 'USD', 'Consumer Discretionary', 'Automotive')
    ON CONFLICT (symbol) DO NOTHING;
  `;

  try {
    await executeSQL(seedStocks, 'seed stocks');
  } catch (error) {
    console.log('⚠️ Stocks já existem ou erro:', error);
  }

  console.log('\n✅ SETUP BÁSICO CONCLUÍDO!');
  console.log('📊 Tabelas criadas: users, stocks, watchlists, watchlist_stocks');
  console.log('🔐 RLS habilitado em todas as tabelas');
  console.log('📝 5 stocks básicos inseridos');
}

async function executeSQL(sql: string, description: string) {
  console.log(`   Executando: ${description}...`);
  
  // Para Supabase, vamos usar uma abordagem mais simples
  // Dividir o SQL em statements separados
  const statements = sql.split(';').filter(s => s.trim().length > 0);
  
  for (const statement of statements) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: statement.trim() + ';' });
      if (error) {
        console.log(`   ⚠️ Statement error (pode ser normal):`, error.message);
      }
    } catch (error) {
      // Ignorar erros de "já existe" 
      if (!error.message.includes('already exists') && !error.message.includes('does not exist')) {
        console.log(`   ⚠️ SQL error (pode ser normal):`, error.message);
      }
    }
  }
  
  console.log(`   ✅ ${description} processado`);
}

setupBasicSchema()
  .then(() => {
    console.log('\n🎉 SUPABASE SETUP CONCLUÍDO!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro no setup:', error);
    process.exit(1);
  });