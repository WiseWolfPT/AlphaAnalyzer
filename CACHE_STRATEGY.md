# Estratégia de Cache do Alfalyzer

## Configuração Recomendada para Produção

### 1. TTL (Time To Live) por Tipo de Dados

| Tipo de Dados | TTL Atual | TTL Recomendado | Justificativa |
|--------------|-----------|-----------------|---------------|
| Stock Quotes | 1 min | 5-15 min | Mercado muda a cada 15-30s mas 5 min é aceitável |
| Fundamentals | - | 24 horas | Dados trimestrais, mudam raramente |
| Company Info | - | 7 dias | Nome, setor, logo mudam muito raramente |
| Historical Data | - | Infinito* | Dados passados nunca mudam |
| News | - | 1 hora | Notícias precisam ser relativamente frescas |

*Para dados históricos, invalidar apenas se houver split/dividend

### 2. Estratégia de Atualização

#### A. Background Jobs (Recomendado)
```javascript
// Cron job a cada 5 minutos durante horário de mercado
// Atualiza os 100 símbolos mais populares automaticamente
setInterval(updatePopularStocks, 5 * 60 * 1000);
```

#### B. Smart Caching
- Track quais símbolos são mais consultados
- Pre-cache os top 100 durante abertura do mercado
- Cache mais agressivo fora do horário de mercado

### 3. Variáveis de Ambiente para Cache

```env
# Cache Configuration
CACHE_QUOTES_TTL=300  # 5 minutos
CACHE_FUNDAMENTALS_TTL=86400  # 24 horas
CACHE_COMPANY_TTL=604800  # 7 dias
CACHE_HISTORICAL_TTL=2592000  # 30 dias

# Background Updates
ENABLE_CACHE_WARMER=true
CACHE_WARMER_SYMBOLS=AAPL,GOOGL,MSFT,AMZN,TSLA,META,NVDA
CACHE_WARMER_INTERVAL=300  # 5 minutos
```

### 4. Implementação no Coolify

Adicionar estas variáveis no Coolify permitirá ajustar o comportamento do cache sem redeploy:

```javascript
// No código
const CACHE_TTL = {
  quotes: parseInt(process.env.CACHE_QUOTES_TTL || '300'),
  fundamentals: parseInt(process.env.CACHE_FUNDAMENTALS_TTL || '86400'),
  company: parseInt(process.env.CACHE_COMPANY_TTL || '604800')
};
```

### 5. Monitoramento

Criar endpoint `/api/admin/cache/stats` para monitorar:
- Hit rate (% de requests servidos do cache)
- Miss rate (% que precisou chamar API)
- API calls saved
- Estimated cost savings

### 6. Benefícios Esperados

Com esta estratégia:
- **Redução de 95%+ nas chamadas de API**
- **Resposta 10-40x mais rápida**
- **Custo próximo de zero** para APIs pagas
- **100% uptime** mesmo se APIs caírem
- **Melhor UX** com dados sempre disponíveis

### 7. Próximos Passos

1. Implementar cache warming para símbolos populares
2. Adicionar métricas de cache hit/miss
3. Criar dashboard admin para monitorar cache
4. Implementar invalidação inteligente de cache