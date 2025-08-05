# Supabase Cache Architecture

## Overview

O Alfalyzer usa **Supabase PostgreSQL** como base de dados central para:
- 🔐 Autenticação de utilizadores
- 💾 Cache de dados de mercado
- 📊 Dados financeiros
- ⚡ Atualizações em tempo real

## Vantagens do Supabase vs SQLite

1. **PostgreSQL** - Base de dados profissional e escalável
2. **Real-time subscriptions** - Atualizações ao vivo sem polling
3. **Row Level Security (RLS)** - Segurança a nível de linha
4. **Backups automáticos** - Não perdes dados
5. **Edge Functions** - Para workers e cron jobs
6. **Gratuito até 500MB** - Perfeito para começar

## Arquitetura de Cache

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   APIs Externas │────▶│  Backend/Coolify  │────▶│    Supabase     │
│  (Alpha Vantage)│     │                 │     │   PostgreSQL    │
│   (Fiscal.ai)  │     │  Cache Logic    │     │                 │
│   (Finnhub)    │     │  Rate Limiting  │     │ - stock_quotes  │
└─────────────────┘     └─────────────────┘     │ - financials    │
                                                 │ - profiles      │
                                ┌──────────────▶│ - api_usage     │
                                │                └─────────────────┘
                                │                         │
                        ┌───────┴────────┐               │
                        │ Frontend/Vercel│◀──────────────┘
                        │                │    Real-time
                        │  React + Vite  │    Subscriptions
                        └────────────────┘
```

## Como Funciona

1. **Frontend** pede dados ao backend
2. **Backend** verifica cache no Supabase:
   - Se existe e é recente (< 1 min) → retorna cache
   - Se não existe ou é antigo → busca na API externa
3. **Dados novos** são guardados no Supabase
4. **Real-time updates** notificam todos os clientes conectados

## Configuração

### 1. Executar migrations no Supabase

Vai ao SQL Editor do Supabase e executa:
```sql
-- Ficheiro: migrations/supabase/20250121_create_cache_tables.sql
```

### 2. Variáveis de ambiente no Coolify

```env
# Supabase (obrigatório)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# APIs de dados
ALPHA_VANTAGE_API_KEY=xxx
FISCAL_AI_API_KEY=xxx
```

### 3. Frontend já está configurado

O frontend já usa o `apiConfig` que aponta para o Coolify.

## Custos

- **Supabase Free Tier**:
  - 500MB armazenamento
  - 2GB transferência/mês
  - 50MB ficheiros
  - Suficiente para ~100k quotes em cache

- **APIs**:
  - Alpha Vantage: 5 calls/min (grátis)
  - Fiscal.ai: 30 dias trial grátis
  - Com cache, reduzimos 90%+ das chamadas

## Monitorização

### Ver cache no Supabase:
```sql
-- Quotes em cache
SELECT * FROM stock_quotes_cache 
ORDER BY updated_at DESC;

-- API usage
SELECT provider, COUNT(*), AVG(response_time) 
FROM api_usage_log 
GROUP BY provider;
```

### Limpar cache antigo:
```sql
SELECT clean_old_cache();
```

## Próximos Passos

1. **Supabase Edge Functions** para atualizar cache periodicamente
2. **Webhooks** para notificar mudanças de preço
3. **Analytics** com Supabase Realtime
4. **Backup automático** dos dados críticos

## Exemplo de Real-time

```typescript
// No frontend, subscrever a atualizações
import { supabase } from '@/lib/supabase';

// Subscrever a mudanças de preço
const channel = supabase
  .channel('stock-prices')
  .on('postgres_changes', 
    { 
      event: 'UPDATE', 
      schema: 'public', 
      table: 'stock_quotes_cache',
      filter: 'symbol=eq.AAPL' 
    },
    (payload) => {
      console.log('Price updated:', payload.new);
    }
  )
  .subscribe();
```

Esta arquitetura é **profissional**, **escalável** e **económica**! 🚀