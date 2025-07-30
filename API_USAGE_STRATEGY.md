# Estratégia de Uso das APIs - Alfalyzer

## Divisão por Tipo de Dados e Frequência

### 1. TEMPO REAL (Alta Frequência)
**API Principal:** Finnhub WebSocket
- ✅ Cotações ao vivo
- ✅ Volume  
- ✅ Bid/Ask
- **Frequência:** Tempo real / 30 segundos
- **Cache:** 30 segundos

### 2. DADOS INTRADAY (Média Frequência)
**APIs:** Finnhub REST, Alpha Vantage
- 📊 Gráficos intraday (5min, 15min, 1h)
- 📊 OHLCV do dia
- 📊 52-week high/low
- **Frequência:** 5-15 minutos
- **Cache:** 5 minutos

### 3. DADOS DIÁRIOS (Baixa Frequência)
**APIs:** Alpha Vantage, Twelve Data, Polygon
- 📈 Histórico de preços (daily/weekly/monthly)
- 📈 Indicadores técnicos (SMA, EMA, RSI, MACD)
- 📈 Volatilidade histórica
- **Frequência:** 1x por dia
- **Cache:** 24 horas

### 4. DADOS FUNDAMENTAIS (Muito Baixa Frequência)
**APIs:** Alpha Vantage, FMP
- 💰 Balanços (trimestral)
- 💰 Income statements
- 💰 Cash flow
- 💰 Métricas (P/E, EPS, ROE)
- **Frequência:** 1x por trimestre
- **Cache:** 90 dias

### 5. DADOS ESTÁTICOS (Raríssima Frequência)
**APIs:** FMP, Polygon
- 🏢 Perfil da empresa
- 🏢 Setor/Indústria
- 🏢 Logo
- 🏢 Descrição
- **Frequência:** 1x por mês
- **Cache:** 30 dias

## Fluxo de Decisão para Chamadas

```
Usuário solicita dados
    ↓
Verificar tipo de dado
    ↓
┌─────────────┬──────────────┬─────────────┬──────────────┐
│ Tempo Real? │ Fundamental? │ Histórico?  │  Estático?   │
└─────┬───────┴──────┬───────┴──────┬──────┴──────┬───────┘
      ↓              ↓               ↓             ↓
  WebSocket    Cache 90d       Cache 24h     Cache 30d
      ↓              ↓               ↓             ↓
   Finnhub    Alpha/FMP      Alpha/Twelve    FMP/Polygon
```

## Limites e Rotação

### Distribuição Diária (Free Tiers)
```javascript
const dailyAllocation = {
  alphaVantage: {
    total: 500,
    reserved: {
      fundamentals: 100,  // 20%
      historical: 200,    // 40%
      indicators: 150,    // 30%
      buffer: 50         // 10%
    }
  },
  finnhub: {
    total: 'unlimited via websocket',
    rest: 60 // por minuto
  },
  fmp: {
    total: 250,
    reserved: {
      profiles: 50,      // 20%
      news: 100,         // 40%
      ratings: 100       // 40%
    }
  },
  twelveData: {
    total: 800,
    reserved: {
      technicals: 400,   // 50%
      timeseries: 400    // 50%
    }
  },
  polygon: {
    perMinute: 5,
    usage: 'historical data only'
  }
};
```

## Implementação do Router Inteligente

```javascript
class SmartAPIRouter {
  async getData(type, symbol, params) {
    // 1. Verificar cache primeiro
    const cached = await cache.get(type, symbol);
    if (cached && !isStale(cached, type)) {
      return cached;
    }

    // 2. Escolher API baseado no tipo
    switch(type) {
      case 'quote':
        return this.getRealtimeQuote(symbol);
      
      case 'fundamentals':
        return this.getFundamentals(symbol);
        
      case 'historical':
        return this.getHistorical(symbol, params);
        
      case 'profile':
        return this.getCompanyProfile(symbol);
    }
  }

  async getRealtimeQuote(symbol) {
    // Prioridade: WebSocket > Finnhub REST > Alpha
    if (websocket.isConnected(symbol)) {
      return websocket.getLatest(symbol);
    }
    return this.tryAPIs([
      () => finnhub.getQuote(symbol),
      () => alpha.getQuote(symbol)
    ]);
  }

  async getFundamentals(symbol) {
    // Prioridade: Alpha Vantage > FMP
    return this.tryAPIs([
      () => alpha.getFundamentals(symbol),
      () => fmp.getFinancials(symbol)
    ]);
  }
}
```

## Monitoramento de Uso

```javascript
// Dashboard admin deve mostrar:
{
  "apiUsage": {
    "alphaVantage": {
      "used": 234,
      "limit": 500,
      "percentage": 46.8,
      "resetIn": "14h 23m"
    },
    "finnhub": {
      "websocketConnections": 7,
      "restCallsLastMinute": 12,
      "limit": 60
    },
    "fmp": {
      "used": 89,
      "limit": 250,
      "percentage": 35.6
    }
  },
  "cacheStats": {
    "hitRate": 0.94,
    "missRate": 0.06,
    "totalSaved": 4532,
    "costSaved": "$45.32"
  }
}
```

## Fallback Strategy

Se uma API falha ou atinge limite:
1. Finnhub → Alpha Vantage → Twelve Data → FMP → Polygon
2. Aumentar TTL do cache temporariamente
3. Notificar admin via dashboard
4. Servir dados do cache mesmo se "stale" (com aviso)

## Resultado Esperado

Com esta estratégia:
- ✅ Preços em tempo real para principais ações
- ✅ Dados fundamentais sempre disponíveis
- ✅ Zero downtime (cache como fallback)
- ✅ Custo $0 (tudo em free tier)
- ✅ Escalável até ~1000 usuários ativos/dia