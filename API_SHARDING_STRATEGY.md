# Estratégia de API Sharding - Distribuição Inteligente

## 🎯 Conceito: Dividir APIs por Tipo de Ação

### 1. **Distribuição por Categoria de Ações**

```typescript
const API_SHARDING_STRATEGY = {
  // Ações Tech/NASDAQ - Alta frequência de consulta
  'TECH_STOCKS': {
    symbols: ['AAPL', 'GOOGL', 'MSFT', 'META', 'AMZN', 'NVDA', 'TSLA'],
    primaryAPI: 'finnhub',      // 60 req/min
    secondaryAPI: 'twelveData'  // 800/dia
  },
  
  // Índices e ETFs - Consulta média
  'INDICES_ETFS': {
    symbols: ['SPY', 'QQQ', 'DIA', 'IWM', 'VTI', 'VOO'],
    primaryAPI: 'polygon',      // 5 req/min
    secondaryAPI: 'fmp'         // 250/dia
  },
  
  // Blue Chips/Dow Jones - Consulta média
  'BLUE_CHIPS': {
    symbols: ['JPM', 'BAC', 'JNJ', 'WMT', 'PG', 'KO', 'DIS'],
    primaryAPI: 'fmp',          // 250/dia
    secondaryAPI: 'alphaVantage' // 25/dia
  },
  
  // Ações Internacionais/Menos populares
  'INTERNATIONAL': {
    symbols: ['BABA', 'TSM', 'NVO', 'ASML', 'SAP'],
    primaryAPI: 'alphaVantage',  // 25/dia
    secondaryAPI: 'yahooFinance' // Sem limite oficial
  },
  
  // Crypto (se implementar)
  'CRYPTO': {
    symbols: ['BTC', 'ETH', 'BNB'],
    primaryAPI: 'finnhub',       // Tem suporte crypto
    secondaryAPI: 'polygon'      // Também suporta
  }
};
```

### 2. **Sistema de Hash para Distribuição Automática**

```typescript
// Distribui ações automaticamente entre APIs baseado no símbolo
function getAPIForSymbol(symbol: string): string {
  const hash = symbol.split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0);
  }, 0);
  
  const apis = [
    { name: 'finnhub', weight: 40 },      // 40% do tráfego
    { name: 'twelveData', weight: 25 },   // 25% do tráfego
    { name: 'polygon', weight: 15 },      // 15% do tráfego
    { name: 'fmp', weight: 15 },          // 15% do tráfego
    { name: 'alphaVantage', weight: 5 }   // 5% do tráfego
  ];
  
  // Distribui baseado no peso
  const totalWeight = 100;
  const normalized = hash % totalWeight;
  
  let accumulated = 0;
  for (const api of apis) {
    accumulated += api.weight;
    if (normalized < accumulated) {
      return api.name;
    }
  }
  
  return 'finnhub'; // fallback
}
```

### 3. **Cache Compartilhado Global**

```typescript
// Cache unificado que todas as APIs alimentam
const UNIFIED_CACHE_STRATEGY = {
  // Nível 1: Memória local (mais rápido)
  MEMORY_CACHE: {
    maxSize: 1000,
    ttl: 60 * 1000, // 1 minuto
    scope: 'preços em tempo real'
  },
  
  // Nível 2: Redis/Upstash (compartilhado entre instâncias)
  REDIS_CACHE: {
    maxSize: 10000,
    ttl: 5 * 60 * 1000, // 5 minutos
    scope: 'todos os dados de mercado'
  },
  
  // Nível 3: Supabase (persistente)
  DATABASE_CACHE: {
    maxSize: 'unlimited',
    ttl: 24 * 60 * 60 * 1000, // 24 horas
    scope: 'histórico e fundamentals'
  }
};
```

### 4. **Rotação Inteligente de APIs**

```typescript
class SmartAPIRotator {
  private apiUsage = new Map<string, {
    calls: number;
    resetTime: Date;
    limit: number;
  }>();
  
  async getNextAvailableAPI(dataType: string): Promise<string> {
    const eligibleAPIs = DATA_TYPE_PROVIDERS[dataType];
    
    // Encontra API com menor uso percentual
    let bestAPI = null;
    let lowestUsage = 100;
    
    for (const api of eligibleAPIs) {
      const usage = this.getUsagePercentage(api);
      if (usage < lowestUsage && usage < 80) {
        lowestUsage = usage;
        bestAPI = api;
      }
    }
    
    return bestAPI || eligibleAPIs[0]; // fallback
  }
  
  private getUsagePercentage(api: string): number {
    const stats = this.apiUsage.get(api);
    if (!stats) return 0;
    
    // Reset se passou do tempo
    if (new Date() > stats.resetTime) {
      stats.calls = 0;
      stats.resetTime = this.getNextResetTime(api);
    }
    
    return (stats.calls / stats.limit) * 100;
  }
}
```

### 5. **Estratégia de Escalabilidade**

#### Com 100 usuários:
```
- Finnhub: 40 usuários (1.440 calls/hora)
- TwelveData: 25 usuários (200 calls/hora)
- Polygon: 15 usuários (45 calls/hora)
- FMP: 15 usuários (37 calls/hora)
- AlphaVantage: 5 usuários (5 calls/hora)
```

#### Com 500 usuários (com cache 90% hit rate):
```
- Chamadas reais necessárias: 50/hora por API
- Todas as APIs conseguem atender
- Cache serve 450 usuários (90%)
```

#### Com 1000+ usuários:
```
- Implementar WebSocket para tempo real
- Cache hit rate deve ser > 95%
- Considerar plano pago de 1 API principal
```

### 6. **Implementação Prática**

```typescript
// No unified-api-service.ts
class UnifiedAPIService {
  private rotator = new SmartAPIRotator();
  private sharding = new APIShardingStrategy();
  
  async getPrice(symbol: string): Promise<PriceData> {
    // 1. Verifica cache primeiro
    const cached = await this.checkAllCacheLevels(symbol);
    if (cached) return cached;
    
    // 2. Determina melhor API para este símbolo
    const assignedAPI = this.sharding.getAPIForSymbol(symbol);
    
    // 3. Verifica se API está disponível
    const availableAPI = await this.rotator.getNextAvailableAPI('price');
    
    // 4. Usa API atribuída ou próxima disponível
    const apiToUse = this.isAPIAvailable(assignedAPI) 
      ? assignedAPI 
      : availableAPI;
    
    // 5. Faz a chamada
    const data = await this.providers.get(apiToUse).getPrice(symbol);
    
    // 6. Alimenta todos os níveis de cache
    await this.updateAllCacheLevels(symbol, data);
    
    return data;
  }
}
```

### 7. **Benefícios da Estratégia**

1. **Distribuição de Carga**: Nenhuma API fica sobrecarregada
2. **Redundância**: Se uma API falha, outras assumem
3. **Escalabilidade**: Suporta 500-1000 usuários com APIs gratuitas
4. **Eficiência**: Cache compartilhado entre todas as APIs
5. **Inteligente**: Aprende padrões de uso e otimiza

### 8. **Monitoramento e Ajustes**

```typescript
// Dashboard de monitoramento deve mostrar:
interface APIMetrics {
  apiName: string;
  requestsToday: number;
  quotaRemaining: number;
  successRate: number;
  avgResponseTime: number;
  assignedSymbols: string[];
  cacheHitRate: number;
}

// Ajuste automático baseado em métricas
if (api.successRate < 80) {
  // Reduz peso desta API
  adjustAPIWeight(api.name, -10);
}

if (api.avgResponseTime > 1000) {
  // Move símbolos para API mais rápida
  redistributeSymbols(api.assignedSymbols);
}
```

## 💡 Conclusão

Com esta estratégia de sharding + cache inteligente:

- **100 usuários**: ✅ Fácil, todas APIs gratuitas funcionam
- **500 usuários**: ✅ Possível com cache 90%+ hit rate  
- **1000 usuários**: ✅ Possível com WebSocket + cache 95%+
- **5000+ usuários**: 💰 Necessário 1 API paga principal

O segredo é **distribuir inteligentemente** e **cachear agressivamente**!