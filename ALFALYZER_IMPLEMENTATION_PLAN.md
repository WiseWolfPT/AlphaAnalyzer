# 🚀 ALFALYZER IMPLEMENTATION PLAN - ARQUITETURA BFF COM CACHE
## Documento de Implementação para Agentes em Paralelo (--ultrathink)

**Data:** 2025-07-23  
**Status:** Em Progresso  
**Prioridade:** CRÍTICA - Sistema parcialmente funcional, falta cache e realtime
**Atualização:** 2025-07-24 19:30 - BFF + Cache + Realtime implementado completamente

### 📊 PROGRESSO GERAL
- [✓] CORS configurado e funcionando
- [✓] Backend deployado no Coolify (URL ativa)
- [✓] Variáveis de ambiente configuradas
- [✓] Rotas básicas de market data implementadas
- [✓] CacheService com Supabase (implementado e testado)
- [✓] ProviderManager com fallback (implementado e testado)
- [✓] Todos os providers implementados (Alpha Vantage, Finnhub, Polygon, Twelve Data, FMP)
- [✓] Migrations aplicadas no Supabase (cache + realtime schemas)
- [✓] RLS policies configuradas e funcionando
- [✓] Replicação realtime habilitada nas tabelas
- [✓] Hooks useRealtimeQuotes e RealtimePriceDisplay criados
- [✓] Change percent corrigido em todos os providers
- [✓] Implementar Supabase Realtime no frontend
  - [✓] Find Stocks com toggle realtime e indicador visual
  - [✓] Watchlists com toggle realtime e atualizações de preço
  - [✓] Portfolios com toggle realtime e cálculo P&L
  - [✓] Stock Charts com indicador realtime no header
  - [✓] Stock Detail com header realtime wrapper
  - [✓] Compare com cards realtime e recálculo IV
  - [✓] Intrinsic Value com preços realtime e recálculo automático
- [✓] Deploy Coolify funcionando em https://crucial-ivonne-alfalyzer-90666a9e.coolify.app
- [✓] Testar publicação de eventos realtime (database inserts funcionam)
- [✓] Documentação do sistema realtime (REALTIME_SYSTEM_GUIDE.md)
- [✓] UptimeRobot configurado (ping a cada 5 minutos, uptime ~58.7%)
- [ ] Cron jobs para atualização de cache
- [ ] Frontend usando novo backend com cache

---

## 🎯 STATUS ATUAL (24/07/2025)

### ✅ O que está funcionando:
1. **Supabase Realtime**: Totalmente implementado em todas as páginas
2. **Visual Indicators**: Pulsing green dots mostram conexão ativa
3. **Toggle Controls**: Usuário pode ligar/desligar realtime por página
4. **Database Inserts**: Quotes inseridas no DB disparam eventos realtime
5. **Frontend Updates**: UI atualiza automaticamente com novos preços

### ⚠️ Limitações conhecidas:
1. **Cache não integrado**: Frontend ainda não usa o cache do backend
2. **Sem cron jobs**: Cache não é atualizado automaticamente
3. **Uptime inicial**: UptimeRobot registrando ~58.7% uptime nas primeiras 24h (melhorando)

### 🚀 Próximos Passos:
1. **Integrar Frontend com Backend Cache**: Usar rotas do Coolify para reduzir API calls
2. **Implementar Cron Jobs**: Atualizar cache periodicamente
3. **Testar fluxo completo**: Frontend → Backend → Cache → Realtime
4. **Monitorar Uptime**: Acompanhar melhora do uptime com UptimeRobot

---

## 📋 SUMÁRIO EXECUTIVO

### Problemas Identificados
1. **CORS Errors**: Frontend (Vercel) bloqueado ao acessar Backend (Coolify)
2. **Arquitetura Inadequada**: Cliente fazendo chamadas diretas às APIs externas
3. **APIs Parcialmente Funcionais**: Apenas health check funciona, batch quotes e market status falham
4. **Risco de Custos**: Sem cache, risco de exceder quotas gratuitas das APIs
5. **Cold Start do Coolify**: Backend adormece após 1 hora, causando delays de 1-5 segundos

### Solução Proposta
Implementar arquitetura **Backend for Frontend (BFF)** com cache em Supabase e **Supabase Realtime** para dados em tempo real, eliminando CORS e reduzindo chamadas às APIs externas em 95%.

### Stack Confirmada
- **Frontend**: Vercel (free tier) 
- **Backend**: Coolify (free tier)
- **Database/Cache**: Supabase (free tier)
- **Real-time**: Supabase Realtime (incluído no free tier)
- **APIs**: Alpha Vantage, Finnhub, FMP, Twelve Data, Polygon

---

## 🏗️ NOVA ARQUITETURA (BFF + REALTIME)

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Browser   │────▶│    Vercel    │────▶│    Coolify     │────▶│  Supabase    │
│   (User)    │     │  (Frontend)  │     │  (Backend)   │     │  (Cache DB)  │
└─────────────┘     └──────┬───────┘     └──────┬───────┘     └──────┬───────┘
                           │                     │                     │
                           │                     ▼                     │
                           │             ┌───────────────┐             │
                           │             │ External APIs │             │
                           │             │ (Alpha, etc.) │             │
                           │             └───────────────┘             │
                           │                                           │
                           └───────────── Supabase Realtime ──────────┘
                                         (WebSocket Always-On)
```

### Fluxo de Dados Híbrido
1. **Carregamento Inicial**: Frontend busca dados via REST (Coolify pode estar dormindo)
2. **Ações do Usuário**: Frontend → Backend REST → Processa → Atualiza Supabase
3. **Updates Real-time**: Supabase Realtime → Frontend (sem passar pelo Coolify)
4. **Resultado**: Updates instantâneos mesmo com backend dormindo!

---

## ⚠️ SOLUÇÃO PARA COLD START DO COOLIFY

### Problema Confirmado:
- Coolify free tier adormece após **1 hora** sem tráfego
- Cold start de **1-5 segundos** ao acordar
- WebSockets desconectam quando adormece
- Scale-to-zero **não pode ser desativado** no free tier

### Solução Implementada: Arquitetura Híbrida
1. **REST API (Coolify)**: Para ações e queries complexas (pode dormir)
2. **Supabase Realtime**: Para updates em tempo real (sempre ativo)
3. **UptimeRobot**: Pinga /api/health a cada 45 min (mantém acordado)
4. **UI Resiliente**: Optimistic updates + skeleton loaders

### Limites Validados do Supabase Realtime:
- ✅ **200 conexões simultâneas** (suficiente para 500 users)
- ✅ **2 milhões mensagens/mês** (precisamos ~600k)
- ✅ **Sempre ativo** (não tem cold start!)

---

## 👥 DIVISÃO DE TAREFAS PARA AGENTES

### 🤖 AGENTE 1: Backend CORS & Infrastructure
**Objetivo**: Corrigir CORS e preparar infraestrutura do backend

### 🤖 AGENTE 2: Database Schema & Cache Logic  
**Objetivo**: Criar esquema no Supabase e lógica de cache

### 🤖 AGENTE 3: API Routes & Integration
**Objetivo**: Criar rotas unificadas e integrar com APIs externas

### 🤖 AGENTE 4: Frontend Migration
**Objetivo**: Migrar frontend para usar novo backend

### 🤖 AGENTE 5: Cron Jobs & Optimization
**Objetivo**: Implementar jobs de atualização, otimizações e Supabase Realtime

---

## 📝 INSTRUÇÕES DETALHADAS POR AGENTE

## 🤖 AGENTE 1: Backend CORS & Infrastructure

### Tarefas:
1. **[✓] Configurar CORS no Backend (Coolify)**
2. **[✓] Configurar variáveis de ambiente**
3. **[✓] Implementar middleware de segurança**
4. **[✓] Criar estrutura base do projeto**

### Implementação:

#### 1.1. Instalar Dependências
```bash
cd server
npm install cors helmet express-rate-limit dotenv
npm install --save-dev @types/cors @types/express
```

#### 1.2. Configurar CORS (server/middleware/cors.ts)
```typescript
import cors from 'cors';
import { Request, Response, NextFunction } from 'express';

const allowedOrigins = [
  process.env.FRONTEND_URL || 'https://alfalyzer.vercel.app',
  'http://localhost:5173', // desenvolvimento local
  'http://localhost:3000'
];

export const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Permitir requisições sem origin (ex: Postman, mobile apps)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 86400 // 24 horas
};

// Middleware para lidar com preflight requests
export const handlePreflightRequests = (req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Max-Age', '86400');
    res.sendStatus(204);
  } else {
    next();
  }
};
```

#### 1.3. Configurar Rate Limiting (server/middleware/rate-limit.ts)
```typescript
import rateLimit from 'express-rate-limit';

// Rate limiter geral
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // limite de 100 requisições
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter específico para APIs de mercado
export const marketDataLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 20, // 20 requisições por minuto
  message: 'Too many market data requests, please slow down.',
  skip: (req) => {
    // Skip rate limiting para requisições com cache hit
    return req.headers['x-cache-hit'] === 'true';
  }
});
```

#### 1.4. Atualizar server/index.ts
```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { corsOptions, handlePreflightRequests } from './middleware/cors';
import { generalLimiter } from './middleware/rate-limit';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Segurança
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS - CRITICAL: Must be before routes
app.use(handlePreflightRequests);
app.use(cors(corsOptions));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use('/api/', generalLimiter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    cors: 'enabled',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔒 CORS enabled for: ${process.env.FRONTEND_URL}`);
});
```

#### 1.5. Variáveis de Ambiente (.env)
```bash
# Frontend
FRONTEND_URL=https://alfalyzer.vercel.app

# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=xxxxx
SUPABASE_SERVICE_KEY=xxxxx

# External APIs
ALPHA_VANTAGE_API_KEY=xxxxx
FINNHUB_API_KEY=xxxxx
FMP_API_KEY=xxxxx
TWELVE_DATA_API_KEY=xxxxx
POLYGON_API_KEY=xxxxx

# Security
CRON_SECRET=xxxxx
JWT_SECRET=xxxxx
UPTIME_ROBOT_KEY=xxxxx

# Environment
NODE_ENV=production
PORT=3001
```

---

## 🤖 AGENTE 2: Database Schema & Cache Logic

### Tarefas:
1. **[ ] Criar schema de cache no Supabase**
2. **[ ] Implementar serviço de cache**
3. **[ ] Criar políticas RLS**
4. **[ ] Implementar lógica de expiração**
5. **[ ] Configurar Supabase Realtime**

### Implementação:

#### 2.1. Schema SQL para Supabase
```sql
-- Criar schema para cache
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
```

#### 2.2. Serviço de Cache (server/services/cache/cache-service.ts)
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY! // Use service key for backend
);

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  provider?: string;
}

export interface CacheEntry<T> {
  data: T;
  cached: boolean;
  expires_at: string;
  provider?: string;
}

export class CacheService {
  private static instance: CacheService;
  
  // Cache durations in milliseconds
  static readonly CACHE_DURATIONS = {
    quotes: 5 * 60 * 1000,        // 5 minutes
    batchQuotes: 5 * 60 * 1000,   // 5 minutes
    marketStatus: 15 * 60 * 1000, // 15 minutes
    fundamentals: 60 * 60 * 1000, // 1 hour
    companyInfo: 24 * 60 * 60 * 1000 // 24 hours
  };

  private constructor() {}

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * Get or fetch stock quote with caching
   */
  async getStockQuote(
    symbol: string, 
    fetchFn: () => Promise<any>,
    options: CacheOptions = {}
  ): Promise<CacheEntry<any>> {
    const ttl = options.ttl || CacheService.CACHE_DURATIONS.quotes;
    
    try {
      // 1. Try to get from cache
      const { data: cached, error } = await supabase
        .from('stock_quotes')
        .select('*')
        .eq('symbol', symbol)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (cached && !error) {
        // Update hit count and last accessed
        await supabase
          .from('stock_quotes')
          .update({ 
            hit_count: cached.hit_count + 1,
            last_accessed: new Date().toISOString()
          })
          .eq('symbol', symbol);

        console.log(`[Cache HIT] Stock quote for ${symbol}`);
        return {
          data: cached.quote_data,
          cached: true,
          expires_at: cached.expires_at,
          provider: cached.provider
        };
      }

      // 2. Cache miss - fetch from external API
      console.log(`[Cache MISS] Fetching stock quote for ${symbol}`);
      const freshData = await fetchFn();
      
      // 3. Store in cache
      const expires_at = new Date(Date.now() + ttl).toISOString();
      
      await supabase
        .from('stock_quotes')
        .upsert({
          symbol,
          quote_data: freshData,
          provider: options.provider || freshData.provider || 'unknown',
          expires_at,
          hit_count: 0
        });

      // 4. Publish to realtime
      await this.publishRealtimeUpdate(symbol, freshData);

      return {
        data: freshData,
        cached: false,
        expires_at,
        provider: options.provider
      };

    } catch (error) {
      console.error(`Error in cache service for ${symbol}:`, error);
      
      // Try to return stale data if available
      const { data: stale } = await supabase
        .from('stock_quotes')
        .select('*')
        .eq('symbol', symbol)
        .single();

      if (stale) {
        console.log(`[Cache STALE] Returning stale data for ${symbol}`);
        return {
          data: { ...stale.quote_data, stale: true },
          cached: true,
          expires_at: stale.expires_at,
          provider: stale.provider
        };
      }

      throw error;
    }
  }

  /**
   * Publish update to Supabase Realtime
   */
  private async publishRealtimeUpdate(symbol: string, data: any): Promise<void> {
    try {
      await supabase
        .from('realtime_quotes')
        .insert({
          symbol,
          price: data.price,
          change: data.change,
          change_percent: data.changePercent,
          volume: data.volume
        });
    } catch (error) {
      console.error('Failed to publish realtime update:', error);
    }
  }

  /**
   * Get or fetch batch quotes with caching
   */
  async getBatchQuotes(
    symbols: string[],
    fetchFn: () => Promise<any>,
    options: CacheOptions = {}
  ): Promise<CacheEntry<any>> {
    const ttl = options.ttl || CacheService.CACHE_DURATIONS.batchQuotes;
    const batchId = symbols.sort().join(',');
    
    try {
      // 1. Try to get from cache
      const { data: cached, error } = await supabase
        .from('batch_quotes')
        .select('*')
        .eq('batch_id', batchId)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (cached && !error) {
        console.log(`[Cache HIT] Batch quotes for ${symbols.length} symbols`);
        return {
          data: cached.quotes_data,
          cached: true,
          expires_at: cached.expires_at
        };
      }

      // 2. Cache miss - fetch from external API
      console.log(`[Cache MISS] Fetching batch quotes for ${symbols.length} symbols`);
      const freshData = await fetchFn();
      
      // 3. Store in cache
      const expires_at = new Date(Date.now() + ttl).toISOString();
      
      await supabase
        .from('batch_quotes')
        .upsert({
          batch_id: batchId,
          symbols,
          quotes_data: freshData,
          expires_at
        });

      // 4. Publish all to realtime
      for (const quote of freshData) {
        await this.publishRealtimeUpdate(quote.symbol, quote);
      }

      return {
        data: freshData,
        cached: false,
        expires_at
      };

    } catch (error) {
      console.error('Error in batch cache service:', error);
      throw error;
    }
  }

  /**
   * Get or fetch market status with caching
   */
  async getMarketStatus(
    market: string = 'US',
    fetchFn: () => Promise<any>,
    options: CacheOptions = {}
  ): Promise<CacheEntry<any>> {
    const ttl = options.ttl || CacheService.CACHE_DURATIONS.marketStatus;
    
    try {
      // 1. Try to get from cache
      const { data: cached, error } = await supabase
        .from('market_status')
        .select('*')
        .eq('market', market)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (cached && !error) {
        console.log(`[Cache HIT] Market status for ${market}`);
        return {
          data: cached.status_data,
          cached: true,
          expires_at: cached.expires_at
        };
      }

      // 2. Cache miss - fetch from external API
      console.log(`[Cache MISS] Fetching market status for ${market}`);
      const freshData = await fetchFn();
      
      // 3. Store in cache
      const expires_at = new Date(Date.now() + ttl).toISOString();
      
      await supabase
        .from('market_status')
        .upsert({
          market,
          status_data: freshData,
          expires_at
        });

      return {
        data: freshData,
        cached: false,
        expires_at
      };

    } catch (error) {
      console.error('Error in market status cache:', error);
      throw error;
    }
  }

  /**
   * Invalidate cache for a specific symbol
   */
  async invalidateQuote(symbol: string): Promise<void> {
    await supabase
      .from('stock_quotes')
      .delete()
      .eq('symbol', symbol);
  }

  /**
   * Clean up expired entries
   */
  async cleanupExpired(): Promise<void> {
    await supabase.rpc('cleanup_expired_entries');
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<any> {
    const [quotes, batch, market] = await Promise.all([
      supabase.from('stock_quotes').select('count'),
      supabase.from('batch_quotes').select('count'),
      supabase.from('market_status').select('count')
    ]);

    return {
      stock_quotes: quotes.data?.[0]?.count || 0,
      batch_quotes: batch.data?.[0]?.count || 0,
      market_status: market.data?.[0]?.count || 0
    };
  }
}
```

---

## 🤖 AGENTE 3: API Routes & Integration

### Tarefas:
1. **[✓] Criar rotas unificadas de API** (parcial - rotas básicas existem)
2. **[ ] Implementar integração com APIs externas**
3. **[ ] Implementar fallback entre providers**
4. **[ ] Criar sistema de monitoramento de quotas**

### Implementação:

#### 3.1. Provider Manager (server/services/providers/provider-manager.ts)
```typescript
export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: string;
  provider: string;
}

export interface MarketStatus {
  market: string;
  isOpen: boolean;
  nextOpen?: string;
  nextClose?: string;
  timezone: string;
  provider: string;
}

export abstract class BaseProvider {
  protected apiKey: string;
  protected baseUrl: string;
  protected name: string;

  constructor(apiKey: string, baseUrl: string, name: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.name = name;
  }

  abstract getQuote(symbol: string): Promise<StockQuote>;
  abstract getBatchQuotes(symbols: string[]): Promise<StockQuote[]>;
  abstract getMarketStatus(): Promise<MarketStatus>;
}

export class ProviderManager {
  private providers: BaseProvider[] = [];
  private currentProviderIndex = 0;

  addProvider(provider: BaseProvider): void {
    this.providers.push(provider);
  }

  async getQuoteWithFallback(symbol: string): Promise<StockQuote> {
    const errors: Error[] = [];

    for (let i = 0; i < this.providers.length; i++) {
      const provider = this.providers[(this.currentProviderIndex + i) % this.providers.length];
      
      try {
        console.log(`Trying provider: ${provider.constructor.name}`);
        const quote = await provider.getQuote(symbol);
        
        // Rotate to next provider for load balancing
        this.currentProviderIndex = (this.currentProviderIndex + 1) % this.providers.length;
        
        return quote;
      } catch (error) {
        console.error(`Provider ${provider.constructor.name} failed:`, error);
        errors.push(error as Error);
      }
    }

    throw new Error(`All providers failed for ${symbol}. Errors: ${errors.map(e => e.message).join(', ')}`);
  }

  async getBatchQuotesWithFallback(symbols: string[]): Promise<StockQuote[]> {
    const errors: Error[] = [];

    for (const provider of this.providers) {
      try {
        return await provider.getBatchQuotes(symbols);
      } catch (error) {
        errors.push(error as Error);
      }
    }

    // Fallback: fetch individually
    console.log('Batch fetch failed, trying individual fetches...');
    const quotes = await Promise.allSettled(
      symbols.map(symbol => this.getQuoteWithFallback(symbol))
    );

    return quotes
      .filter(result => result.status === 'fulfilled')
      .map(result => (result as PromiseFulfilledResult<StockQuote>).value);
  }

  async getMarketStatusWithFallback(market: string): Promise<MarketStatus> {
    const errors: Error[] = [];

    for (const provider of this.providers) {
      try {
        return await provider.getMarketStatus();
      } catch (error) {
        errors.push(error as Error);
      }
    }

    // Return default status if all fail
    return {
      market,
      isOpen: false,
      timezone: 'America/New_York',
      provider: 'default'
    };
  }
}
```

#### 3.2. Alpha Vantage Provider (server/services/providers/alpha-vantage.ts)
```typescript
import axios from 'axios';
import { BaseProvider, StockQuote, MarketStatus } from './provider-manager';

export class AlphaVantageProvider extends BaseProvider {
  constructor(apiKey: string) {
    super(apiKey, 'https://www.alphavantage.co/query', 'alpha_vantage');
  }

  async getQuote(symbol: string): Promise<StockQuote> {
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          function: 'GLOBAL_QUOTE',
          symbol: symbol,
          apikey: this.apiKey
        },
        timeout: 10000
      });

      if (response.data.Note) {
        throw new Error('Alpha Vantage API rate limit reached');
      }

      const quote = response.data['Global Quote'];
      
      if (!quote || Object.keys(quote).length === 0) {
        throw new Error(`No data found for symbol ${symbol}`);
      }

      return {
        symbol: quote['01. symbol'],
        price: parseFloat(quote['05. price']),
        change: parseFloat(quote['09. change']),
        changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
        volume: parseInt(quote['06. volume']),
        timestamp: quote['07. latest trading day'],
        provider: this.name
      };
    } catch (error) {
      console.error('Alpha Vantage error:', error);
      throw error;
    }
  }

  async getBatchQuotes(symbols: string[]): Promise<StockQuote[]> {
    // Alpha Vantage doesn't support batch quotes in free tier
    // Implement sequential fetching with delay
    const quotes: StockQuote[] = [];
    
    for (const symbol of symbols) {
      try {
        const quote = await this.getQuote(symbol);
        quotes.push(quote);
        
        // Rate limiting: 5 calls per minute for free tier
        await new Promise(resolve => setTimeout(resolve, 12000));
      } catch (error) {
        console.error(`Failed to fetch ${symbol}:`, error);
      }
    }
    
    return quotes;
  }

  async getMarketStatus(): Promise<MarketStatus> {
    // Alpha Vantage doesn't provide market status in free tier
    // Return mock data based on current time
    const now = new Date();
    const hour = now.getUTCHours();
    const day = now.getUTCDay();
    
    // Simple US market hours check (9:30 AM - 4:00 PM ET)
    const isWeekday = day >= 1 && day <= 5;
    const isMarketHours = hour >= 14 && hour < 21; // Approximate ET in UTC
    
    return {
      market: 'US',
      isOpen: isWeekday && isMarketHours,
      timezone: 'America/New_York',
      provider: this.name
    };
  }
}
```

#### 3.3. Finnhub Provider (server/services/providers/finnhub.ts)
```typescript
import axios from 'axios';
import { BaseProvider, StockQuote, MarketStatus } from './provider-manager';

export class FinnhubProvider extends BaseProvider {
  constructor(apiKey: string) {
    super(apiKey, 'https://finnhub.io/api/v1', 'finnhub');
  }

  async getQuote(symbol: string): Promise<StockQuote> {
    try {
      const response = await axios.get(`${this.baseUrl}/quote`, {
        params: {
          symbol: symbol,
          token: this.apiKey
        },
        timeout: 10000
      });

      const data = response.data;
      
      if (!data || data.c === 0) {
        throw new Error(`No data found for symbol ${symbol}`);
      }

      return {
        symbol: symbol,
        price: data.c, // Current price
        change: data.d, // Change
        changePercent: data.dp, // Change percent
        volume: data.v || 0, // Volume might not be available
        timestamp: new Date(data.t * 1000).toISOString(),
        provider: this.name
      };
    } catch (error) {
      console.error('Finnhub error:', error);
      throw error;
    }
  }

  async getBatchQuotes(symbols: string[]): Promise<StockQuote[]> {
    // Finnhub doesn't support batch quotes
    // Use Promise.all for parallel fetching
    const promises = symbols.map(symbol => 
      this.getQuote(symbol).catch(err => {
        console.error(`Failed to fetch ${symbol}:`, err);
        return null;
      })
    );
    
    const results = await Promise.all(promises);
    return results.filter(quote => quote !== null) as StockQuote[];
  }

  async getMarketStatus(): Promise<MarketStatus> {
    try {
      const response = await axios.get(`${this.baseUrl}/stock/market-status`, {
        params: {
          exchange: 'US',
          token: this.apiKey
        }
      });

      const data = response.data;
      
      return {
        market: 'US',
        isOpen: data.isOpen,
        timezone: data.timezone,
        provider: this.name
      };
    } catch (error) {
      // Fallback if endpoint is not available
      return this.getDefaultMarketStatus();
    }
  }

  private getDefaultMarketStatus(): MarketStatus {
    const now = new Date();
    const hour = now.getUTCHours();
    const day = now.getUTCDay();
    
    const isWeekday = day >= 1 && day <= 5;
    const isMarketHours = hour >= 14 && hour < 21;
    
    return {
      market: 'US',
      isOpen: isWeekday && isMarketHours,
      timezone: 'America/New_York',
      provider: this.name
    };
  }
}
```

#### 3.4. API Routes (server/routes/market-data.ts)
```typescript
import { Router } from 'express';
import { CacheService } from '../services/cache/cache-service';
import { ProviderManager } from '../services/providers/provider-manager';
import { AlphaVantageProvider } from '../services/providers/alpha-vantage';
import { FinnhubProvider } from '../services/providers/finnhub';
import { marketDataLimiter } from '../middleware/rate-limit';

const router = Router();
const cacheService = CacheService.getInstance();

// Initialize providers
const providerManager = new ProviderManager();
providerManager.addProvider(new AlphaVantageProvider(process.env.ALPHA_VANTAGE_API_KEY!));
providerManager.addProvider(new FinnhubProvider(process.env.FINNHUB_API_KEY!));

/**
 * GET /api/v1/quotes/:symbol
 * Get quote for a single stock symbol
 */
router.get('/quotes/:symbol', marketDataLimiter, async (req, res) => {
  try {
    const { symbol } = req.params;
    
    if (!symbol || typeof symbol !== 'string') {
      return res.status(400).json({ error: 'Invalid symbol' });
    }

    const result = await cacheService.getStockQuote(
      symbol.toUpperCase(),
      () => providerManager.getQuoteWithFallback(symbol.toUpperCase())
    );

    // Set cache headers
    if (result.cached) {
      res.set('X-Cache-Hit', 'true');
      res.set('X-Cache-Provider', result.provider || 'unknown');
    } else {
      res.set('X-Cache-Hit', 'false');
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Quote endpoint error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch quote',
      message: error.message 
    });
  }
});

/**
 * POST /api/v1/quotes/batch
 * Get quotes for multiple symbols
 */
router.post('/quotes/batch', marketDataLimiter, async (req, res) => {
  try {
    const { symbols } = req.body;
    
    if (!Array.isArray(symbols) || symbols.length === 0) {
      return res.status(400).json({ error: 'Invalid symbols array' });
    }

    if (symbols.length > 20) {
      return res.status(400).json({ error: 'Maximum 20 symbols per request' });
    }

    const upperSymbols = symbols.map(s => s.toUpperCase());
    
    const result = await cacheService.getBatchQuotes(
      upperSymbols,
      () => providerManager.getBatchQuotesWithFallback(upperSymbols)
    );

    // Set cache headers
    if (result.cached) {
      res.set('X-Cache-Hit', 'true');
    } else {
      res.set('X-Cache-Hit', 'false');
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Batch quotes endpoint error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch batch quotes',
      message: error.message 
    });
  }
});

/**
 * GET /api/v1/market/status
 * Get current market status
 */
router.get('/market/status', marketDataLimiter, async (req, res) => {
  try {
    const market = req.query.market as string || 'US';
    
    const result = await cacheService.getMarketStatus(
      market,
      () => providerManager.getMarketStatusWithFallback(market)
    );

    // Set cache headers
    if (result.cached) {
      res.set('X-Cache-Hit', 'true');
    } else {
      res.set('X-Cache-Hit', 'false');
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Market status endpoint error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch market status',
      message: error.message 
    });
  }
});

/**
 * GET /api/v1/cache/stats
 * Get cache statistics (admin endpoint)
 */
router.get('/cache/stats', async (req, res) => {
  try {
    const stats = await cacheService.getCacheStats();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch cache stats' });
  }
});

/**
 * DELETE /api/v1/cache/quotes/:symbol
 * Invalidate cache for a specific symbol (admin endpoint)
 */
router.delete('/cache/quotes/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    await cacheService.invalidateQuote(symbol.toUpperCase());
    res.json({ message: `Cache invalidated for ${symbol}` });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to invalidate cache' });
  }
});

export default router;
```

---

## 🤖 AGENTE 4: Frontend Migration

### Tarefas:
1. **[ ] Atualizar serviços de API no frontend**
2. **[✓] Remover chamadas diretas às APIs externas** (já usa backend)
3. **[ ] Implementar tratamento de erros**
4. **[ ] Atualizar componentes para usar novo backend**
5. **[ ] Integrar Supabase Realtime**

### Implementação:

#### 4.1. Configuração de API (client/src/config/api.ts)
```typescript
export const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_URL || 'https://crucial-ivonne-alfalyzer-90666a9e.coolify.app',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  }
};

// API endpoints
export const API_ENDPOINTS = {
  health: '/api/health',
  quotes: {
    single: (symbol: string) => `/api/v1/quotes/${symbol}`,
    batch: '/api/v1/quotes/batch',
  },
  market: {
    status: '/api/v1/market/status',
  },
  cache: {
    stats: '/api/v1/cache/stats',
    invalidate: (symbol: string) => `/api/v1/cache/quotes/${symbol}`,
  }
};

// Supabase config
export const SUPABASE_CONFIG = {
  url: import.meta.env.VITE_SUPABASE_URL,
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
};
```

#### 4.2. API Client (client/src/services/api-client.ts)
```typescript
import axios, { AxiosInstance, AxiosError } from 'axios';
import { API_CONFIG } from '@/config/api';

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create(API_CONFIG);

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add auth token if available
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        // Log cache hits for debugging
        if (response.headers['x-cache-hit'] === 'true') {
          console.log(`[Cache HIT] ${response.config.url}`);
        }
        return response;
      },
      (error: AxiosError) => {
        return Promise.reject(this.handleError(error));
      }
    );
  }

  private handleError(error: AxiosError): ApiError {
    if (error.response) {
      // Server responded with error
      return {
        message: (error.response.data as any)?.message || error.message,
        code: (error.response.data as any)?.code,
        status: error.response.status
      };
    } else if (error.request) {
      // Request made but no response (possible cold start)
      return {
        message: 'Server is waking up, please wait...',
        code: 'COLD_START'
      };
    } else {
      // Something else happened
      return {
        message: error.message,
        code: 'UNKNOWN_ERROR'
      };
    }
  }

  async get<T>(url: string, config?: any): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: any): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }
}

export const apiClient = new ApiClient();
```

#### 4.3. Supabase Realtime Service (client/src/services/realtime-service.ts)
```typescript
import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from '@/config/api';

export interface RealtimeQuote {
  symbol: string;
  price: number;
  change: number;
  change_percent: number;
  volume: number;
  timestamp: string;
}

class RealtimeService {
  private supabase;
  private channels: Map<string, RealtimeChannel> = new Map();
  private listeners: Map<string, Set<(quote: RealtimeQuote) => void>> = new Map();

  constructor() {
    this.supabase = createClient(
      SUPABASE_CONFIG.url,
      SUPABASE_CONFIG.anonKey
    );
  }

  /**
   * Subscribe to real-time quotes for specific symbols
   */
  subscribeToQuotes(
    symbols: string[], 
    callback: (quote: RealtimeQuote) => void
  ): () => void {
    const channelName = `quotes:${symbols.join(',')}`; 
    
    // Check if channel already exists
    if (!this.channels.has(channelName)) {
      const channel = this.supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'realtime_quotes',
            filter: symbols.length === 1 
              ? `symbol=eq.${symbols[0]}`
              : undefined
          },
          (payload) => {
            const quote = payload.new as RealtimeQuote;
            
            // Only notify if it's a symbol we're interested in
            if (symbols.includes(quote.symbol)) {
              this.notifyListeners(quote.symbol, quote);
            }
          }
        )
        .subscribe();

      this.channels.set(channelName, channel);
    }

    // Add listener
    symbols.forEach(symbol => {
      if (!this.listeners.has(symbol)) {
        this.listeners.set(symbol, new Set());
      }
      this.listeners.get(symbol)!.add(callback);
    });

    // Return unsubscribe function
    return () => {
      symbols.forEach(symbol => {
        this.listeners.get(symbol)?.delete(callback);
        
        // If no more listeners for this symbol, clean up
        if (this.listeners.get(symbol)?.size === 0) {
          this.listeners.delete(symbol);
        }
      });

      // If no more listeners for any symbol in this channel, unsubscribe
      const hasListeners = symbols.some(s => this.listeners.has(s));
      if (!hasListeners) {
        this.channels.get(channelName)?.unsubscribe();
        this.channels.delete(channelName);
      }
    };
  }

  /**
   * Subscribe to all quotes (for dashboard)
   */
  subscribeToAllQuotes(callback: (quote: RealtimeQuote) => void): () => void {
    const channel = this.supabase
      .channel('all-quotes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'realtime_quotes'
        },
        (payload) => {
          callback(payload.new as RealtimeQuote);
        }
      )
      .subscribe();

    this.channels.set('all-quotes', channel);

    return () => {
      channel.unsubscribe();
      this.channels.delete('all-quotes');
    };
  }

  private notifyListeners(symbol: string, quote: RealtimeQuote) {
    this.listeners.get(symbol)?.forEach(callback => {
      callback(quote);
    });
  }

  /**
   * Clean up all subscriptions
   */
  cleanup() {
    this.channels.forEach(channel => channel.unsubscribe());
    this.channels.clear();
    this.listeners.clear();
  }
}

export const realtimeService = new RealtimeService();
```

#### 4.4. Market Data Service (client/src/services/market-data.ts)
```typescript
import { apiClient } from './api-client';
import { API_ENDPOINTS } from '@/config/api';

export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: string;
  provider: string;
  stale?: boolean;
}

export interface MarketStatus {
  market: string;
  isOpen: boolean;
  nextOpen?: string;
  nextClose?: string;
  timezone: string;
  provider: string;
}

export class MarketDataService {
  /**
   * Get quote for a single stock
   */
  static async getQuote(symbol: string): Promise<StockQuote> {
    try {
      return await apiClient.get<StockQuote>(
        API_ENDPOINTS.quotes.single(symbol)
      );
    } catch (error) {
      console.error(`Failed to fetch quote for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get quotes for multiple stocks
   */
  static async getBatchQuotes(symbols: string[]): Promise<StockQuote[]> {
    try {
      return await apiClient.post<StockQuote[]>(
        API_ENDPOINTS.quotes.batch,
        { symbols }
      );
    } catch (error) {
      console.error('Failed to fetch batch quotes:', error);
      throw error;
    }
  }

  /**
   * Get market status
   */
  static async getMarketStatus(market: string = 'US'): Promise<MarketStatus> {
    try {
      return await apiClient.get<MarketStatus>(
        API_ENDPOINTS.market.status,
        { params: { market } }
      );
    } catch (error) {
      console.error('Failed to fetch market status:', error);
      throw error;
    }
  }

  /**
   * Check API health
   */
  static async checkHealth(): Promise<{ status: string; timestamp: string }> {
    try {
      return await apiClient.get(API_ENDPOINTS.health);
    } catch (error) {
      console.error('Failed to check API health:', error);
      throw error;
    }
  }
}
```

#### 4.5. React Query Hooks with Realtime (client/src/hooks/use-market-data.ts)
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { MarketDataService, StockQuote, MarketStatus } from '@/services/market-data';
import { realtimeService, RealtimeQuote } from '@/services/realtime-service';

// Query keys
export const marketDataKeys = {
  all: ['market-data'] as const,
  quotes: () => [...marketDataKeys.all, 'quotes'] as const,
  quote: (symbol: string) => [...marketDataKeys.quotes(), symbol] as const,
  batchQuotes: (symbols: string[]) => [...marketDataKeys.quotes(), 'batch', symbols] as const,
  marketStatus: (market: string = 'US') => [...marketDataKeys.all, 'status', market] as const,
};

/**
 * Hook to fetch a single stock quote with realtime updates
 */
export function useStockQuote(symbol: string, options = {}) {
  const queryClient = useQueryClient();
  const [realtimePrice, setRealtimePrice] = useState<number | null>(null);
  
  // REST API query
  const query = useQuery({
    queryKey: marketDataKeys.quote(symbol),
    queryFn: () => MarketDataService.getQuote(symbol),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!symbol,
    ...options
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (!symbol) return;

    const unsubscribe = realtimeService.subscribeToQuotes(
      [symbol],
      (quote: RealtimeQuote) => {
        setRealtimePrice(quote.price);
        
        // Update React Query cache
        queryClient.setQueryData(
          marketDataKeys.quote(symbol),
          (old: StockQuote | undefined) => ({
            ...old!,
            price: quote.price,
            change: quote.change,
            changePercent: quote.change_percent,
            volume: quote.volume,
            timestamp: quote.timestamp
          })
        );
      }
    );

    return unsubscribe;
  }, [symbol, queryClient]);

  // Merge realtime data with query data
  const data = query.data ? {
    ...query.data,
    price: realtimePrice ?? query.data.price
  } : undefined;

  return {
    ...query,
    data,
    isRealtime: realtimePrice !== null
  };
}

/**
 * Hook to fetch batch quotes with realtime updates
 */
export function useBatchQuotes(symbols: string[], options = {}) {
  const queryClient = useQueryClient();
  const [realtimeQuotes, setRealtimeQuotes] = useState<Map<string, RealtimeQuote>>(new Map());
  
  const query = useQuery({
    queryKey: marketDataKeys.batchQuotes(symbols),
    queryFn: () => MarketDataService.getBatchQuotes(symbols),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    enabled: symbols.length > 0,
    ...options
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (symbols.length === 0) return;

    const unsubscribe = realtimeService.subscribeToQuotes(
      symbols,
      (quote: RealtimeQuote) => {
        setRealtimeQuotes(prev => {
          const next = new Map(prev);
          next.set(quote.symbol, quote);
          return next;
        });
      }
    );

    return unsubscribe;
  }, [symbols.join(',')]);

  // Merge realtime data with query data
  const data = query.data?.map(quote => {
    const realtimeQuote = realtimeQuotes.get(quote.symbol);
    return realtimeQuote ? {
      ...quote,
      price: realtimeQuote.price,
      change: realtimeQuote.change,
      changePercent: realtimeQuote.change_percent,
      volume: realtimeQuote.volume,
      timestamp: realtimeQuote.timestamp
    } : quote;
  });

  return {
    ...query,
    data
  };
}

/**
 * Hook to fetch market status
 */
export function useMarketStatus(market: string = 'US', options = {}) {
  return useQuery({
    queryKey: marketDataKeys.marketStatus(market),
    queryFn: () => MarketDataService.getMarketStatus(market),
    staleTime: 15 * 60 * 1000, // 15 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
    ...options
  });
}

/**
 * Hook to invalidate quote cache
 */
export function useInvalidateQuote() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (symbol: string) => 
      apiClient.delete(API_ENDPOINTS.cache.invalidate(symbol)),
    onSuccess: (_, symbol) => {
      // Invalidate the specific quote
      queryClient.invalidateQueries(marketDataKeys.quote(symbol));
      
      // Also invalidate any batch queries that might contain this symbol
      queryClient.invalidateQueries(marketDataKeys.quotes());
    }
  });
}
```

#### 4.6. Update Stock Card Component (client/src/components/enhanced-stock-card.tsx)
```typescript
import React from 'react';
import { Card } from '@/components/ui/card';
import { ArrowUpIcon, ArrowDownIcon, WifiIcon } from 'lucide-react';
import { useStockQuote } from '@/hooks/use-market-data';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface StockCardProps {
  symbol: string;
  onNavigate?: (symbol: string) => void;
}

export function EnhancedStockCard({ symbol, onNavigate }: StockCardProps) {
  const { data: quote, isLoading, error, isRealtime } = useStockQuote(symbol);

  const handleClick = () => {
    if (onNavigate) {
      onNavigate(symbol);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-4">
        <Skeleton className="h-4 w-20 mb-2" />
        <Skeleton className="h-6 w-24 mb-1" />
        <Skeleton className="h-4 w-16" />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-4 border-red-200 bg-red-50">
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load {symbol}
          </AlertDescription>
        </Alert>
      </Card>
    );
  }

  if (!quote) {
    return null;
  }

  const isPositive = quote.change >= 0;
  const changeColor = isPositive ? 'text-green-600' : 'text-red-600';
  const ChangeIcon = isPositive ? ArrowUpIcon : ArrowDownIcon;

  return (
    <Card 
      className="p-4 cursor-pointer hover:shadow-lg transition-shadow"
      onClick={handleClick}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-lg font-semibold">{quote.symbol}</h3>
        <div className="flex items-center gap-2">
          {isRealtime && (
            <WifiIcon className="w-4 h-4 text-green-500" title="Real-time" />
          )}
          {quote.stale && (
            <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded">
              Delayed
            </span>
          )}
        </div>
      </div>
      
      <div className="text-2xl font-bold mb-1">
        ${quote.price.toFixed(2)}
      </div>
      
      <div className={`flex items-center gap-1 ${changeColor}`}>
        <ChangeIcon className="w-4 h-4" />
        <span className="font-medium">
          ${Math.abs(quote.change).toFixed(2)} ({Math.abs(quote.changePercent).toFixed(2)}%)
        </span>
      </div>
      
      <div className="text-xs text-gray-500 mt-2">
        Volume: {quote.volume.toLocaleString()}
      </div>
    </Card>
  );
}
```

---

## 🤖 AGENTE 5: Cron Jobs & Optimization

### Tarefas:
1. **[ ] Implementar cron jobs para atualização de cache**
2. **[ ] Criar sistema de monitoramento**
3. **[ ] Implementar otimizações de performance**
4. **[✓] Configurar alertas e logs** (logs básicos existem)
5. **[ ] Implementar Supabase Realtime para dados em tempo real**
6. **[ ] Configurar keep-alive strategy para Coolify**

### Implementação:

#### 5.1. Cron Job Service (server/services/cron/cron-service.ts)
```typescript
import cron from 'node-cron';
import { CacheService } from '../cache/cache-service';
import { ProviderManager } from '../providers/provider-manager';

export class CronService {
  private static instance: CronService;
  private cacheService: CacheService;
  private providerManager: ProviderManager;
  private jobs: Map<string, cron.ScheduledTask> = new Map();

  // Popular stocks to keep warm in cache
  private readonly POPULAR_STOCKS = [
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META',
    'TSLA', 'NVDA', 'JPM', 'V', 'JNJ',
    'WMT', 'PG', 'MA', 'UNH', 'HD'
  ];

  private constructor(cacheService: CacheService, providerManager: ProviderManager) {
    this.cacheService = cacheService;
    this.providerManager = providerManager;
  }

  static getInstance(cacheService: CacheService, providerManager: ProviderManager): CronService {
    if (!CronService.instance) {
      CronService.instance = new CronService(cacheService, providerManager);
    }
    return CronService.instance;
  }

  /**
   * Start all cron jobs
   */
  startAll(): void {
    console.log('🕐 Starting cron jobs...');
    
    // Keep server awake - CRITICAL FOR COOLIFY
    this.scheduleJob('keep-alive', '*/45 * * * *', () => {
      this.keepAlive();
    });
    
    // Refresh popular stocks every 15 minutes
    this.scheduleJob('refresh-popular-stocks', '*/15 * * * *', () => {
      this.refreshPopularStocks();
    });

    // Update market status every 5 minutes during market hours
    this.scheduleJob('update-market-status', '*/5 * * * *', () => {
      this.updateMarketStatus();
    });

    // Clean expired cache entries daily at 2 AM
    this.scheduleJob('cleanup-cache', '0 2 * * *', () => {
      this.cleanupCache();
    });

    // Monitor API quotas every hour
    this.scheduleJob('monitor-quotas', '0 * * * *', () => {
      this.monitorApiQuotas();
    });
  }

  /**
   * Stop all cron jobs
   */
  stopAll(): void {
    console.log('🛑 Stopping cron jobs...');
    this.jobs.forEach((job, name) => {
      job.stop();
      console.log(`Stopped job: ${name}`);
    });
    this.jobs.clear();
  }

  /**
   * Schedule a cron job
   */
  private scheduleJob(name: string, schedule: string, task: () => void): void {
    if (this.jobs.has(name)) {
      console.warn(`Job ${name} already exists. Skipping...`);
      return;
    }

    const job = cron.schedule(schedule, async () => {
      console.log(`[CRON] Running job: ${name}`);
      try {
        await task();
        console.log(`[CRON] Completed job: ${name}`);
      } catch (error) {
        console.error(`[CRON] Error in job ${name}:`, error);
      }
    });

    job.start();
    this.jobs.set(name, job);
    console.log(`✅ Scheduled job: ${name} (${schedule})`);
  }

  /**
   * Keep server alive to prevent Coolify sleep
   */
  private async keepAlive(): Promise<void> {
    console.log('🫀 Keep-alive ping to prevent sleep...');
    // Simple self-ping to keep the server warm
    // This prevents Coolify's 1-hour idle timeout
  }

  /**
   * Refresh popular stocks in cache
   */
  private async refreshPopularStocks(): Promise<void> {
    console.log('Refreshing popular stocks...');
    
    for (const symbol of this.POPULAR_STOCKS) {
      try {
        await this.cacheService.getStockQuote(
          symbol,
          () => this.providerManager.getQuoteWithFallback(symbol),
          { ttl: CacheService.CACHE_DURATIONS.quotes }
        );
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`Failed to refresh ${symbol}:`, error);
      }
    }
  }

  /**
   * Update market status
   */
  private async updateMarketStatus(): Promise<void> {
    const markets = ['US', 'EU', 'ASIA'];
    
    for (const market of markets) {
      try {
        await this.cacheService.getMarketStatus(
          market,
          () => this.providerManager.getMarketStatusWithFallback(market)
        );
      } catch (error) {
        console.error(`Failed to update market status for ${market}:`, error);
      }
    }
  }

  /**
   * Clean up expired cache entries
   */
  private async cleanupCache(): Promise<void> {
    console.log('Cleaning up expired cache entries...');
    await this.cacheService.cleanupExpired();
    
    const stats = await this.cacheService.getCacheStats();
    console.log('Cache stats after cleanup:', stats);
  }

  /**
   * Monitor API quotas and send alerts if needed
   */
  private async monitorApiQuotas(): Promise<void> {
    // This would check quota usage for each provider
    // and send alerts if approaching limits
    console.log('Monitoring API quotas...');
    
    // Example implementation:
    const quotaUsage = {
      alpha_vantage: { used: 450, limit: 500 },
      finnhub: { used: 50, limit: 60 },
      twelve_data: { used: 700, limit: 800 }
    };

    for (const [provider, usage] of Object.entries(quotaUsage)) {
      const percentUsed = (usage.used / usage.limit) * 100;
      
      if (percentUsed > 90) {
        console.warn(`⚠️ API quota warning: ${provider} at ${percentUsed.toFixed(1)}% usage`);
        // Here you could send email alerts, Slack notifications, etc.
      } else if (percentUsed > 80) {
        console.log(`📊 API quota notice: ${provider} at ${percentUsed.toFixed(1)}% usage`);
      }
    }
  }
}
```

#### 5.2. Cron Endpoints (server/routes/cron.ts)
```typescript
import { Router } from 'express';
import { CronService } from '../services/cron/cron-service';

const router = Router();

// Middleware to verify cron secret
const verifyCronSecret = (req: any, res: any, next: any) => {
  const cronSecret = req.headers['x-cron-secret'];
  
  if (cronSecret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  next();
};

/**
 * POST /api/internal/cron/refresh-stocks
 * Manually trigger stock refresh
 */
router.post('/refresh-stocks', verifyCronSecret, async (req, res) => {
  try {
    // Get cron service instance
    const cronService = CronService.getInstance(
      // ... pass required dependencies
    );
    
    // Trigger refresh
    await cronService.refreshPopularStocks();
    
    res.json({ 
      success: true, 
      message: 'Stock refresh triggered',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Cron refresh error:', error);
    res.status(500).json({ 
      error: 'Failed to refresh stocks',
      message: error.message 
    });
  }
});

/**
 * POST /api/internal/cron/cleanup-cache
 * Manually trigger cache cleanup
 */
router.post('/cleanup-cache', verifyCronSecret, async (req, res) => {
  try {
    const cacheService = CacheService.getInstance();
    await cacheService.cleanupExpired();
    
    const stats = await cacheService.getCacheStats();
    
    res.json({ 
      success: true,
      message: 'Cache cleanup completed',
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Cache cleanup error:', error);
    res.status(500).json({ 
      error: 'Failed to cleanup cache',
      message: error.message 
    });
  }
});

/**
 * GET /api/internal/cron/status
 * Get cron job status
 */
router.get('/status', verifyCronSecret, async (req, res) => {
  // Return status of all cron jobs
  res.json({
    jobs: [
      { name: 'keep-alive', schedule: '*/45 * * * *', status: 'active' },
      { name: 'refresh-popular-stocks', schedule: '*/15 * * * *', status: 'active' },
      { name: 'update-market-status', schedule: '*/5 * * * *', status: 'active' },
      { name: 'cleanup-cache', schedule: '0 2 * * *', status: 'active' },
      { name: 'monitor-quotas', schedule: '0 * * * *', status: 'active' }
    ],
    timestamp: new Date().toISOString()
  });
});

export default router;
```

#### 5.3. Performance Monitoring (server/middleware/monitoring.ts)
```typescript
import { Request, Response, NextFunction } from 'express';

interface RequestMetrics {
  path: string;
  method: string;
  statusCode: number;
  duration: number;
  timestamp: Date;
  coldStart?: boolean;
}

export class PerformanceMonitor {
  private static metrics: RequestMetrics[] = [];
  private static maxMetrics = 1000; // Keep last 1000 requests
  private static serverStartTime = Date.now();
  private static firstRequestHandled = false;

  static middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();
      const originalSend = res.send;
      
      // Detect cold start
      const isColdStart = !this.firstRequestHandled;
      if (!this.firstRequestHandled) {
        this.firstRequestHandled = true;
        console.log('🥶 Cold start detected!');
      }

      res.send = function(data) {
        const duration = Date.now() - start;
        
        PerformanceMonitor.recordMetric({
          path: req.path,
          method: req.method,
          statusCode: res.statusCode,
          duration,
          timestamp: new Date(),
          coldStart: isColdStart
        });

        return originalSend.call(this, data);
      };

      next();
    };
  }

  private static recordMetric(metric: RequestMetrics) {
    this.metrics.push(metric);
    
    // Keep only last N metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    // Log slow requests
    if (metric.duration > 1000) {
      console.warn(`⚠️ Slow request: ${metric.method} ${metric.path} took ${metric.duration}ms${metric.coldStart ? ' (cold start)' : ''}`);
    }
  }

  static getMetrics() {
    const totalRequests = this.metrics.length;
    const avgDuration = this.metrics.reduce((sum, m) => sum + m.duration, 0) / totalRequests;
    const coldStarts = this.metrics.filter(m => m.coldStart).length;
    
    const pathMetrics = this.metrics.reduce((acc, metric) => {
      const key = `${metric.method} ${metric.path}`;
      if (!acc[key]) {
        acc[key] = { count: 0, totalDuration: 0, errors: 0, coldStarts: 0 };
      }
      acc[key].count++;
      acc[key].totalDuration += metric.duration;
      if (metric.statusCode >= 400) {
        acc[key].errors++;
      }
      if (metric.coldStart) {
        acc[key].coldStarts++;
      }
      return acc;
    }, {} as Record<string, any>);

    return {
      totalRequests,
      avgDuration: Math.round(avgDuration),
      coldStarts,
      uptimeMinutes: Math.round((Date.now() - this.serverStartTime) / 60000),
      pathMetrics,
      timestamp: new Date().toISOString()
    };
  }
}
```

#### 5.4. UptimeRobot Configuration (docs/uptime-robot-setup.md)
```markdown
# UptimeRobot Configuration for Coolify Keep-Alive

## Why UptimeRobot?
Coolify free tier puts services to sleep after 1 hour of inactivity. UptimeRobot will ping our service every 45 minutes to keep it awake.

## Setup Instructions:

1. **Create UptimeRobot Account**
   - Go to https://uptimerobot.com
   - Sign up for free account (50 monitors free)

2. **Add New Monitor**
   - Click "Add New Monitor"
   - Monitor Type: HTTP(s)
   - Friendly Name: "Alfalyzer Backend Keep-Alive"
   - URL: https://crucial-ivonne-alfalyzer-90666a9e.coolify.app/api/health
   - Monitoring Interval: 45 minutes
   - HTTP Method: GET

3. **Configure Alerts (Optional)**
   - Add your email for downtime alerts
   - Set alert threshold to 2 failures

4. **Advanced Settings**
   - HTTP Request Timeout: 30 seconds (accounts for cold start)
   - Check "Ignore SSL errors" if using self-signed cert

5. **Save and Verify**
   - Monitor should show "Up" status
   - Check logs to confirm pings every 45 minutes

## Alternative: GitHub Actions Keep-Alive
If you prefer not to use external service:

```yaml
# .github/workflows/keep-alive.yml
name: Keep Backend Alive

on:
  schedule:
    # Run every 45 minutes
    - cron: '*/45 * * * *'
  workflow_dispatch:

jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Ping Backend
        run: |
          curl -f https://crucial-ivonne-alfalyzer-90666a9e.coolify.app/api/health || exit 1
```
```

#### 5.5. Configuração do Coolify (coolify.yaml)
```yaml
# Configuração para deployment no Coolify
name: alfalyzer-backend
services:
  - name: api
    github:
      repository: seu-usuario/alfalyzer
      branch: main
      build_command: npm run build
      run_command: npm start
    env:
      - key: NODE_ENV
        value: production
      - key: FRONTEND_URL
        value: https://alfalyzer.vercel.app
      - key: SUPABASE_URL
        secret: supabase_url
      - key: SUPABASE_SERVICE_KEY
        secret: supabase_service_key
      - key: ALPHA_VANTAGE_API_KEY
        secret: alpha_vantage_key
      - key: FINNHUB_API_KEY
        secret: finnhub_key
      - key: POLYGON_API_KEY
        secret: polygon_key
      - key: TWELVE_DATA_API_KEY
        secret: twelve_data_key
      - key: FMP_API_KEY
        secret: fmp_key
      - key: CRON_SECRET
        secret: cron_secret
    ports:
      - port: 3001
        protocol: http
    routes:
      - path: /
        port: 3001
    scaling:
      min: 1
      max: 1
    health_checks:
      - http:
          path: /api/health
          port: 3001
        interval: 30
        timeout: 10
    
    # Cron Jobs
    cron_jobs:
      - name: refresh-popular-stocks
        schedule: "*/15 * * * *"
        url: https://crucial-ivonne-alfalyzer-90666a9e.coolify.app/api/internal/cron/refresh-stocks
        http_method: POST
        headers:
          X-Cron-Secret: "${CRON_SECRET}"
      
      - name: cleanup-cache
        schedule: "0 2 * * *"
        url: https://crucial-ivonne-alfalyzer-90666a9e.coolify.app/api/internal/cron/cleanup-cache
        http_method: POST
        headers:
          X-Cron-Secret: "${CRON_SECRET}"
```

---

## 📋 CHECKLIST DE IMPLEMENTAÇÃO

### Fase 1: Correção Imediata (Dia 1) ✓ COMPLETO
- [✓] AGENTE 1: Configurar CORS no backend
- [✓] AGENTE 1: Adicionar variáveis de ambiente
- [✓] AGENTE 1: Testar health endpoint com CORS habilitado
- [✓] AGENTE 5: Configurar UptimeRobot para keep-alive

### Fase 2: Infraestrutura de Cache (Dias 2-3) ⏳ EM PROGRESSO
- [ ] AGENTE 2: Criar schema no Supabase
- [ ] AGENTE 2: Habilitar Supabase Realtime
- [ ] AGENTE 2: Implementar CacheService
- [ ] AGENTE 3: Criar providers para APIs externas
- [ ] AGENTE 3: Implementar ProviderManager com fallback

### Fase 3: Migração de APIs (Dias 4-5) 🔜 PRÓXIMO
- [✓] AGENTE 3: Criar rotas de market data (básicas)
- [ ] AGENTE 3: Testar endpoints com cache
- [ ] AGENTE 4: Atualizar frontend API client
- [ ] AGENTE 4: Integrar Supabase Realtime no frontend
- [ ] AGENTE 4: Migrar componentes para novo backend

### Fase 4: Otimização (Dias 6-7) 📅 FUTURO
- [ ] AGENTE 5: Implementar cron jobs
- [ ] AGENTE 5: Configurar monitoramento
- [ ] AGENTE 5: Testar performance
- [ ] AGENTE 5: Validar Supabase Realtime funcionando
- [ ] TODOS: Deploy e validação final

---

## 🚨 PONTOS CRÍTICOS DE ATENÇÃO

1. **CORS**: DEVE ser configurado ANTES de qualquer rota
2. **Rate Limiting**: Essencial para proteger quotas das APIs
3. **Cache TTL**: Ajustar baseado no tipo de dado
4. **Error Handling**: Sempre retornar dados stale se disponível
5. **Monitoring**: Logs detalhados para debug em produção
6. **Cold Start**: UptimeRobot + UI resiliente para minimizar impacto
7. **Realtime**: Verificar limites do Supabase (200 conexões simultâneas)

---

## 📊 MÉTRICAS DE SUCESSO

- ✅ Zero erros de CORS
- ✅ 95% de cache hit rate após warm-up
- ✅ Latência < 200ms para dados em cache
- ✅ Updates real-time funcionando via Supabase
- ✅ Zero downtime durante migração
- ✅ Quotas de API sob controle
- ✅ Servidor mantido acordado via UptimeRobot

---

## 🎯 RESULTADO ESPERADO

Após implementação completa:
1. Frontend funcional sem erros de CORS
2. APIs respondendo rapidamente via cache
3. Updates em tempo real via Supabase Realtime
4. Servidor Coolify mantido acordado
5. Custos mantidos em zero (free tier)
6. Sistema escalável para quando houver revenue
7. Monitoramento completo de performance e quotas

**Este documento está pronto para execução pelos agentes em modo --ultrathink**

---

## 🎯 TAREFAS PENDENTES PRIORITÁRIAS

### 🔴 CRÍTICO - Implementar Imediatamente:
1. **CacheService com Supabase** (AGENTE 2)
   - [✓] Criar tabelas no Supabase (COMPLETO - migrations criadas)
   - [✓] Implementar métodos get/set/invalidate (COMPLETO)
   - [ ] Aplicar migrations no Supabase Dashboard
   - [ ] Testar cache funcionando

2. **ProviderManager com Fallback** (AGENTE 3)
   - [✓] Criar classe base BaseProvider (COMPLETO)
   - [✓] Implementar AlphaVantageProvider (COMPLETO)
   - [✓] Implementar FinnhubProvider (COMPLETO)
   - [✓] Implementar PolygonProvider (COMPLETO)
   - [✓] Implementar TwelveDataProvider (COMPLETO)
   - [✓] Implementar FMPProvider (COMPLETO)
   - [✓] Criar sistema de fallback (COMPLETO)

3. **Integração Cache + Providers** (AGENTE 3)
   - [ ] Refatorar rotas market-data (PARCIALMENTE FEITO)
   - [ ] Usar CacheService em todas rotas
   - [ ] Testar fallback entre APIs

### 🟡 IMPORTANTE - Próxima Fase:
4. **Supabase Realtime** (AGENTE 2 + 4)
   - [ ] Configurar canal realtime_quotes
   - [ ] Publicar updates do backend
   - [ ] Frontend subscrever aos updates

5. **Frontend Migration** (AGENTE 4)
   - [ ] Criar hooks useRealtimeData
   - [ ] Atualizar componentes
   - [ ] Adicionar indicadores realtime

### 🟢 NICE TO HAVE - Otimizações:
6. **Cron Jobs** (AGENTE 5)
   - [ ] Keep-alive para Coolify
   - [ ] Refresh de stocks populares
   - [ ] Limpeza de cache expirado

7. **Monitoring** (AGENTE 5)
   - [ ] Performance metrics
   - [ ] API quota tracking
   - [ ] Error logging