# Mapeamento de Dados do Alfalyzer para APIs

## 1. DADOS EM TEMPO REAL (Header + Cards)
| Dado | API | Endpoint | Cache |
|------|-----|----------|-------|
| Preço atual | Finnhub WebSocket | ws://ws.finnhub.io | Tempo real |
| Variação % | Finnhub WebSocket | ws://ws.finnhub.io | Tempo real |
| Volume | Finnhub WebSocket | ws://ws.finnhub.io | Tempo real |
| Índices | Alpha Vantage | GLOBAL_QUOTE | 5 min |
| Intrinsic Value | FMP/Calculado | /discounted-cash-flow | 24h |

## 2. PÁGINA DETALHADA DA AÇÃO

### VALUATION
```javascript
// Alpha Vantage - Company Overview
{
  "PERatio": "28.5",
  "MarketCapitalization": "3200000000000",
  "PriceToSalesRatioTTM": "7.8",
  "EnterpriseValue": "2980000000000",
  "EVToRevenue": "7.6"
}
```

### PERFORMANCE
```javascript
// Alpha Vantage - Income Statement
{
  "netIncome": "94680000000",
  "totalRevenue": "394328000000",
  "operatingIncome": "114301000000"
}
// Calcular: ROE = netIncome / shareholderEquity
```

### FINANCIALS
```javascript
// Alpha Vantage - Cash Flow
{
  "operatingCashflow": "122151000000",
  "capitalExpenditures": "-10959000000"
}
// Free Cash Flow = operatingCashflow - capitalExpenditures
```

### GROWTH
```javascript
// Comparar YoY dos statements
const revenueGrowth = (revenue2024 - revenue2023) / revenue2023 * 100;
const epsGrowth = (eps2024 - eps2023) / eps2023 * 100;
```

## 3. GRÁFICOS DETALHADOS

### Gráfico de Preço
```javascript
// Alpha Vantage - TIME_SERIES_DAILY
await alpha.getTimeSeries('AAPL', 'daily', 'full');
```

### Revenue & Expenses
```javascript
// Alpha Vantage - INCOME_STATEMENT (quarterly)
const quarters = await alpha.getIncomeStatement('AAPL', 'quarterly');
// Plotar: totalRevenue, costOfRevenue, operatingExpenses
```

### Revenue by Segment
```javascript
// FMP - Segment Revenue
await fmp.getRevenueBySegment('AAPL');
// Ou extrair de 10-K filings
```

### Cash Flow Components
```javascript
// Alpha Vantage - CASH_FLOW
const cashFlow = await alpha.getCashFlow('AAPL', 'quarterly');
// Plotar cada componente
```

## 4. ESTRATÉGIA DE IMPLEMENTAÇÃO

### Fase 1: Cache Inteligente
```javascript
const dataFreshness = {
  quotes: 30,        // segundos
  overview: 86400,   // 24 horas
  statements: 86400, // 24 horas
  timeseries: 300,   // 5 minutos
  segments: 604800   // 7 dias
};
```

### Fase 2: Agregação de Dados
```javascript
async function getCompleteStockData(symbol) {
  const [quote, overview, income, balance, cashflow] = await Promise.all([
    getRealtimeQuote(symbol),      // WebSocket/REST
    getCompanyOverview(symbol),     // Alpha Vantage
    getIncomeStatement(symbol),     // Alpha Vantage
    getBalanceSheet(symbol),        // Alpha Vantage
    getCashFlow(symbol)             // Alpha Vantage
  ]);
  
  return {
    realtime: quote,
    valuation: calculateValuationMetrics(overview, income),
    performance: calculatePerformanceMetrics(income, balance),
    financials: extractFinancials(balance, cashflow),
    growth: calculateGrowthMetrics(income, cashflow)
  };
}
```

### Fase 3: Cálculos Derivados
```javascript
function calculateValuationMetrics(overview, income) {
  return {
    peRatio: overview.PERatio,
    marketCap: overview.MarketCapitalization,
    priceSales: overview.PriceToSalesRatioTTM,
    evRevenue: overview.EVToRevenue,
    pegRatio: overview.PEGRatio
  };
}

function calculatePerformanceMetrics(income, balance) {
  const netIncome = parseFloat(income.netIncome);
  const equity = parseFloat(balance.totalShareholderEquity);
  const revenue = parseFloat(income.totalRevenue);
  
  return {
    roe: (netIncome / equity * 100).toFixed(2),
    netMargin: (netIncome / revenue * 100).toFixed(2),
    operatingMargin: (income.operatingIncome / revenue * 100).toFixed(2)
  };
}
```

## 5. EARNINGS & TRANSCRIPTS

### Earnings Calendar
```javascript
// Alpha Vantage
const earnings = await alpha.getEarningsCalendar('AAPL');
```

### Transcripts com AI
```javascript
// 1. Buscar transcript (web scraping ou API parceira)
const transcript = await getEarningsTranscript('AAPL', 'Q4-2024');

// 2. Processar com OpenAI
const summary = await openai.createCompletion({
  model: "gpt-4",
  prompt: `Summarize this earnings call transcript focusing on:
    1. Key financial highlights
    2. Future guidance
    3. Major announcements
    4. Risks mentioned
    
    Transcript: ${transcript}`
});
```

## 6. FALLBACK STRATEGY

```javascript
const apiPriority = {
  quotes: ['finnhub', 'alpha', 'twelve'],
  fundamentals: ['alpha', 'fmp', 'polygon'],
  segments: ['fmp', 'polygon'],
  news: ['finnhub', 'fmp'],
  technicals: ['twelve', 'alpha']
};
```

## CONCLUSÃO

✅ **100% dos dados podem ser obtidos com as APIs atuais**
- Finnhub WebSocket para tempo real
- Alpha Vantage para fundamentais
- FMP para dados segmentados
- OpenAI para análise de transcripts
- Cálculos locais para métricas derivadas

Custo estimado: $0/mês com estratégia de cache adequada!