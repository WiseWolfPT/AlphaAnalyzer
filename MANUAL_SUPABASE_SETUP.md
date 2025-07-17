# 🚨 CONFIGURAÇÃO MANUAL SUPABASE - EMERGÊNCIA

**PROBLEMA**: Tabelas não existem no Supabase
**SOLUÇÃO**: Aplicar schema manualmente no SQL Editor

## 📋 PASSOS OBRIGATÓRIOS:

### 1. Acessar Supabase Dashboard
- URL: https://avjnfessefxtfurayybp.supabase.co
- Fazer login na conta Supabase

### 2. Abrir SQL Editor
- Navegar para: SQL Editor (ícone </> na sidebar)
- Clicar em "New Query"

### 3. Executar Schema Básico
Copiar e colar o SQL abaixo **EXATAMENTE**:

```sql
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table with Supabase auth integration
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  preferred_currency TEXT DEFAULT 'USD' CHECK (preferred_currency IN ('USD', 'EUR')),
  preferred_language TEXT DEFAULT 'pt' CHECK (preferred_language IN ('pt', 'en')),
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'premium')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Stocks table
CREATE TABLE stocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  exchange TEXT NOT NULL,
  currency TEXT DEFAULT 'USD',
  sector TEXT,
  country TEXT DEFAULT 'US',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Watchlists table
CREATE TABLE watchlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Portfolios table
CREATE TABLE portfolios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  base_currency TEXT DEFAULT 'USD',
  total_value DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = auth_id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = auth_id);

CREATE POLICY "Public can view stocks" ON stocks
  FOR SELECT USING (true);

CREATE POLICY "Users can manage own watchlists" ON watchlists
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own portfolios" ON portfolios
  FOR ALL USING (auth.uid() = user_id);
```

### 4. Executar Query
- Clicar no botão "Run" ou usar Ctrl+Enter
- Aguardar confirmação de sucesso

### 5. Validar Criação
Executar esta query para confirmar:

```sql
SELECT 
  schemaname,
  tablename,
  tableowner
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN ('users', 'stocks', 'watchlists', 'portfolios');
```

Deve retornar 4 linhas.

## 🧪 TESTE FINAL

Após criar as tabelas, executar:
```bash
npm run supabase:test
```

**RESULTADO ESPERADO**: 8/8 testes passando

---

**IMPORTANTE**: Este é o schema mínimo. Migrations completas podem ser aplicadas posteriormente.