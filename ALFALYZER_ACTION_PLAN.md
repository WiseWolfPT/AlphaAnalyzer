# PLANO DE AÇÃO DEFINITIVO PARA ALFALYZER
**Data: 23/07/2025**
**Status: Crítico - Frontend não funciona em produção**

## 🚨 PROBLEMA ATUAL

### Sintomas Identificados:
1. **Erro 401 (Unauthorized)** em todas as chamadas API
2. **CORS errors** quando frontend tenta acessar backend
3. **VITE_API_URL** está configurado com URL direta do Koyeb
4. **Health check funciona** mas chamadas reais falham
5. **Frontend ignora proxy do Vercel** e chama Koyeb diretamente

### Diagnóstico:
- Frontend está usando `VITE_API_URL=https://crucial-ivonne-alfalyzer-90666a9e.koyeb.app`
- Isso faz as chamadas irem direto para Koyeb, ignorando o proxy do Vercel
- Resultado: CORS errors e problemas de autenticação

## 🛠️ SOLUÇÃO IMEDIATA (FASE 1 - URGENTE)

### 1.1 Remover VITE_API_URL do Vercel
**Responsável**: Agent 1
**Tempo**: 5 minutos
**Ações**:
```bash
# No dashboard do Vercel:
1. Ir para Settings → Environment Variables
2. REMOVER completamente VITE_API_URL
3. Manter apenas:
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_ANON_KEY
4. Fazer redeploy
```

### 1.2 Verificar market-data-client.ts
**Responsável**: Agent 2
**Tempo**: 10 minutos
**Arquivo**: `client/src/services/market-data-client.ts`
```typescript
// Linha 6 deve estar assim:
const API_BASE_URL = typeof window !== 'undefined' ? '' : (env.VITE_API_URL || 'https://crucial-ivonne-alfalyzer-90666a9e.koyeb.app');

// Isso garante que no browser usa '' (relativo)
```

### 1.3 Adicionar Headers de Autenticação
**Responsável**: Agent 3
**Tempo**: 15 minutos
**Arquivo**: `server/middleware/auth.ts`
```typescript
// Adicionar middleware para aceitar requests do proxy Vercel
export const vercelProxyAuth = (req, res, next) => {
  // Aceitar requests vindos do Vercel
  const origin = req.headers.origin || req.headers.referer;
  if (origin && origin.includes('vercel.app')) {
    // Permitir acesso sem token para proxy Vercel
    req.isVercelProxy = true;
  }
  next();
};
```

### 1.4 Configurar CORS no Koyeb
**Responsável**: Agent 4
**Tempo**: 10 minutos
**Arquivo**: `server/index.js` ou `server/app.js`
```javascript
app.use(cors({
  origin: [
    'https://alfalyzerpro4-q0y5xznl7-antonios-projects-f9cd3cd0.vercel.app',
    'https://alfalyzer.vercel.app',
    /\.vercel\.app$/,  // Aceitar todos os subdomínios Vercel
  ],
  credentials: true
}));
```

## 📊 SOLUÇÃO DEFINITIVA (FASE 2 - ARQUITETURA DE CACHE)

### 2.1 Criar Schema no Supabase
**Responsável**: Agent 5
**Tempo**: 30 minutos
```sql
-- Tabela de ativos
CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker TEXT NOT NULL UNIQUE,
  name TEXT,
  exchange TEXT,
  type TEXT,
  sector TEXT,
  industry TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de preços em tempo real
CREATE TABLE IF NOT EXISTS asset_prices (
  id BIGSERIAL PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  price NUMERIC(18, 8) NOT NULL,
  volume BIGINT,
  high NUMERIC(18, 8),
  low NUMERIC(18, 8),
  open NUMERIC(18, 8),
  previous_close NUMERIC(18, 8),
  change_percent NUMERIC(10, 4),
  price_time TIMESTAMPTZ NOT NULL,
  source_api TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_asset_prices_asset_time ON asset_prices (asset_id, price_time DESC);
CREATE INDEX idx_asset_prices_time ON asset_prices (price_time DESC);

-- Função para pegar último preço
CREATE OR REPLACE FUNCTION get_latest_prices()
RETURNS TABLE(
  ticker TEXT,
  name TEXT,
  price NUMERIC,
  change_percent NUMERIC,
  volume BIGINT,
  price_time TIMESTAMPTZ,
  source_api TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (a.ticker)
    a.ticker,
    a.name,
    p.price,
    p.change_percent,
    p.volume,
    p.price_time,
    p.source_api
  FROM assets a
  JOIN asset_prices p ON a.id = p.asset_id
  ORDER BY a.ticker, p.price_time DESC;
END;
$$ LANGUAGE plpgsql;

-- RLS policies
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_prices ENABLE ROW LEVEL SECURITY;

-- Permitir leitura pública
CREATE POLICY "Public read access" ON assets FOR SELECT USING (true);
CREATE POLICY "Public read access" ON asset_prices FOR SELECT USING (true);
```

### 2.2 Implementar Price Update Worker
**Responsável**: Agent 6
**Tempo**: 1 hora
**Arquivo**: `server/workers/priceUpdater.js`
```javascript
const cron = require('node-cron');
const { createClient } = require('@supabase/supabase-js');
const pLimit = require('p-limit');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Limitar a 5 chamadas simultâneas para não sobrecarregar APIs
const limit = pLimit(5);

class PriceUpdater {
  constructor() {
    this.apis = {
      alphaVantage: require('../services/alpha-vantage'),
      finnhub: require('../services/finnhub'),
      fmp: require('../services/fmp'),
      twelveData: require('../services/twelve-data'),
      polygon: require('../services/polygon')
    };
  }

  async updateAllPrices() {
    console.log(`[${new Date().toISOString()}] Iniciando atualização de preços...`);
    
    try {
      // 1. Buscar todos os ativos
      const { data: assets, error } = await supabase
        .from('assets')
        .select('id, ticker');

      if (error) throw error;

      // 2. Atualizar preços em paralelo (com limite)
      const updatePromises = assets.map(asset => 
        limit(() => this.updateAssetPrice(asset))
      );

      const results = await Promise.allSettled(updatePromises);
      
      // 3. Log de resultados
      const success = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      console.log(`[${new Date().toISOString()}] Atualização concluída: ${success} sucessos, ${failed} falhas`);
      
    } catch (error) {
      console.error('Erro no job de atualização:', error);
    }
  }

  async updateAssetPrice(asset) {
    const { id, ticker } = asset;
    
    // Tentar APIs em ordem de prioridade
    const apiOrder = ['alphaVantage', 'finnhub', 'fmp', 'twelveData', 'polygon'];
    
    for (const apiName of apiOrder) {
      try {
        const api = this.apis[apiName];
        if (!api || !api.isEnabled()) continue;
        
        const priceData = await api.getQuote(ticker);
        
        if (priceData && priceData.price) {
          // Salvar no banco
          const { error } = await supabase
            .from('asset_prices')
            .insert({
              asset_id: id,
              price: priceData.price,
              volume: priceData.volume,
              high: priceData.high,
              low: priceData.low,
              open: priceData.open,
              previous_close: priceData.previousClose,
              change_percent: priceData.changePercent,
              price_time: new Date().toISOString(),
              source_api: apiName
            });
            
          if (!error) {
            console.log(`✓ ${ticker} atualizado via ${apiName}: $${priceData.price}`);
            return; // Sucesso, não precisa tentar outras APIs
          }
        }
      } catch (error) {
        console.warn(`✗ Falha ${apiName} para ${ticker}:`, error.message);
        // Continuar para próxima API
      }
    }
    
    throw new Error(`Todas as APIs falharam para ${ticker}`);
  }
}

// Inicializar worker
const priceUpdater = new PriceUpdater();

// Agendar para rodar a cada minuto
cron.schedule('* * * * *', () => {
  priceUpdater.updateAllPrices();
});

// Executar imediatamente ao iniciar
priceUpdater.updateAllPrices();

console.log('Price updater iniciado. Executará a cada minuto.');

module.exports = priceUpdater;
```

### 2.3 Criar Nova API Endpoint
**Responsável**: Agent 7
**Tempo**: 30 minutos
**Arquivo**: `server/routes/market-data.ts`
```typescript
// Nova rota que busca do cache/banco
router.get('/api/market-data/cached/quotes/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    
    // Buscar do Supabase (não da API externa)
    const { data, error } = await supabase
      .from('get_latest_prices')
      .select()
      .eq('ticker', ticker.toUpperCase())
      .single();
      
    if (error) throw error;
    
    if (!data) {
      return res.status(404).json({ error: 'Ticker not found' });
    }
    
    // Formatar resposta no padrão esperado
    res.json({
      symbol: data.ticker,
      price: parseFloat(data.price),
      changePercent: parseFloat(data.change_percent),
      volume: data.volume,
      timestamp: data.price_time,
      source: data.source_api,
      cached: true
    });
    
  } catch (error) {
    console.error('Erro ao buscar preço:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Batch endpoint para múltiplos tickers
router.post('/api/market-data/cached/quotes/batch', async (req, res) => {
  try {
    const { symbols } = req.body;
    
    if (!Array.isArray(symbols)) {
      return res.status(400).json({ error: 'symbols must be an array' });
    }
    
    const { data, error } = await supabase
      .rpc('get_latest_prices')
      .in('ticker', symbols.map(s => s.toUpperCase()));
      
    if (error) throw error;
    
    // Transformar para o formato esperado
    const quotes = data.map(item => ({
      symbol: item.ticker,
      price: parseFloat(item.price),
      changePercent: parseFloat(item.change_percent),
      volume: item.volume,
      timestamp: item.price_time,
      source: item.source_api,
      cached: true
    }));
    
    res.json({ quotes });
    
  } catch (error) {
    console.error('Erro ao buscar preços em batch:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

### 2.4 Atualizar Frontend para Usar Cache
**Responsável**: Agent 8
**Tempo**: 30 minutos
**Arquivo**: `client/src/services/market-data-client.ts`
```typescript
// Adicionar flag para usar cache
const USE_CACHE = true; // Pode vir de env var depois

export const marketDataClient = {
  async getQuote(symbol: string): Promise<StockQuote> {
    const endpoint = USE_CACHE 
      ? `/api/market-data/cached/quotes/${symbol}`
      : `/api/market-data/quotes/${symbol}`;
      
    const response = await fetchWithAuth(endpoint);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch quote for ${symbol}`);
    }
    
    return response.json();
  },
  
  async getBatchQuotes(symbols: string[]): Promise<BatchQuotesResponse> {
    const endpoint = USE_CACHE
      ? '/api/market-data/cached/quotes/batch'
      : '/api/market-data/quotes/batch';
      
    const response = await fetchWithAuth(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbols })
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch batch quotes');
    }
    
    return response.json();
  }
};
```

## 🚀 PLANO DE EXECUÇÃO

### Fase 1 - Correção Imediata (HOJE)
1. **[00:00-00:05]** Agent 1: Remover VITE_API_URL do Vercel
2. **[00:05-00:15]** Agent 2: Verificar market-data-client.ts
3. **[00:15-00:30]** Agent 3: Adicionar auth middleware
4. **[00:30-00:40]** Agent 4: Configurar CORS
5. **[00:40-00:50]** Testar se frontend funciona

### Fase 2 - Implementar Cache (AMANHÃ)
1. **[09:00-09:30]** Agent 5: Criar schema Supabase
2. **[09:30-10:30]** Agent 6: Implementar price updater
3. **[10:30-11:00]** Agent 7: Criar endpoints cached
4. **[11:00-11:30]** Agent 8: Atualizar frontend
5. **[11:30-12:00]** Testes integrados

### Fase 3 - Otimização (SEXTA)
1. Popular banco com dados históricos
2. Implementar dashboard de monitoramento
3. Adicionar alertas para falhas de API
4. Otimizar queries e índices

## 📊 BENEFÍCIOS ESPERADOS

### Performance
- **Antes**: 2-5 segundos por request (depende da API)
- **Depois**: 50-100ms (query no banco)
- **Melhoria**: 20-100x mais rápido

### Custos
- **Antes**: N usuários = N × 5 chamadas API
- **Depois**: 1 chamada/minuto independente de usuários
- **Economia**: 99%+ em chamadas API

### Confiabilidade
- **Antes**: Se API cair, app para
- **Depois**: Se API cair, serve cache de 1min atrás
- **Uptime**: 99.9%+ garantido

## 🎯 MÉTRICAS DE SUCESSO

1. **Imediato**: Frontend funcionando sem erro 401/CORS
2. **24h**: Price updater rodando a cada minuto
3. **48h**: 100% requests servidos do cache
4. **72h**: Dashboard mostrando métricas de performance

## 🚨 RISCOS E MITIGAÇÕES

1. **Risco**: Worker falhar e não atualizar preços
   - **Mitigação**: Logs detalhados + alertas

2. **Risco**: Limite de API excedido
   - **Mitigação**: Rate limiting + fallback para outras APIs

3. **Risco**: Banco ficar muito grande
   - **Mitigação**: Retention policy (manter 30 dias)

---

**IMPORTANTE**: Executar Fase 1 IMEDIATAMENTE para restaurar funcionalidade.
Fase 2 pode ser implementada gradualmente sem quebrar nada.