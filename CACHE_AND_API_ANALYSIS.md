# Análise de Cache e Chamadas API - Alfalyzer

## 📊 Configuração Atual de Cache (TTL - Time To Live)

### Tempos de Cache por Tipo de Dados:

| Tipo de Dados | TTL Atual | Ideal Sugerido | Justificativa |
|---------------|-----------|----------------|---------------|
| **Preços (Price)** | 30 segundos | 30-60 segundos | Dados em tempo real, precisa ser atualizado |
| **Fundamentals** | 1 hora | 4-6 horas | Métricas mudam raramente durante o dia |
| **Histórico** | 24 horas | 24 horas | Dados passados não mudam |
| **Info da Empresa** | 24 horas | 7 dias | Informações estáticas |
| **Notícias** | 10 minutos | 30 minutos | Balanço entre frescor e economia |

## 🔢 Estimativa de Chamadas API

### Dashboard Principal (por usuário):

#### Carga Inicial:
- **Watchlist (10 ações)**: 10 chamadas de preço
- **Top Movers**: 1 chamada (lista pré-definida)
- **Índices**: 3 chamadas (S&P, Nasdaq, Dow)
- **Total inicial**: ~14 chamadas

#### Atualizações:
- **Preços**: A cada 30-60 segundos = 2-4 chamadas/minuto
- **Com cache**: Reduz para 0.5-1 chamada/minuto

### Página de Detalhes da Ação:

#### Carga Inicial:
- **Preço atual**: 1 chamada
- **Fundamentals**: 1 chamada
- **Gráfico histórico**: 1 chamada
- **Notícias**: 1 chamada
- **Total**: 4 chamadas

#### Com Cache:
- **Primeira visita**: 4 chamadas
- **Revisitas em 1h**: 1-2 chamadas (só preço)

## 💰 Economia com Cache

### Sem Cache:
- **100 usuários ativos**: 100 × 14 = 1.400 chamadas iniciais
- **Atualizações (1h)**: 100 × 60 × 2 = 12.000 chamadas/hora
- **Total/hora**: ~13.400 chamadas

### Com Cache Otimizado:
- **Chamadas únicas**: ~50 símbolos diferentes
- **Atualizações/hora**: 50 × 60 = 3.000 chamadas
- **Economia**: ~78% menos chamadas!

## 🎯 Otimizações Recomendadas

### 1. **Ajustar TTLs**:
```typescript
export const CACHE_TTL = {
  PRICE: 60 * 1000,              // 60 segundos (aumentar)
  FUNDAMENTALS: 4 * 60 * 60 * 1000, // 4 horas (aumentar)
  HISTORICAL: 24 * 60 * 60 * 1000,  // 24 horas (manter)
  COMPANY_INFO: 7 * 24 * 60 * 60 * 1000, // 7 dias (aumentar)
  NEWS: 30 * 60 * 1000,          // 30 minutos (aumentar)
};
```

### 2. **Implementar Cache em Camadas**:
- **Memória (Redis)**: Dados quentes (preços)
- **Supabase**: Dados mornos (fundamentals)
- **CDN**: Dados frios (logos, info estática)

### 3. **Batch Requests**:
- Agrupar múltiplas requisições de preços
- Usar endpoints de batch quando disponível

### 4. **Smart Refresh**:
- Atualizar preços apenas durante horário de mercado
- Reduzir frequência fora do horário (fins de semana)

## 📈 Limites das APIs Gratuitas vs Necessidades

### Cenário: 100 usuários simultâneos

| API | Limite Gratuito | Necessidade/hora | Status |
|-----|-----------------|------------------|---------|
| **Finnhub** | 60/min (3.600/h) | ~1.000 | ✅ OK |
| **Twelve Data** | 800/dia (33/h) | ~500 | ❌ Insuficiente |
| **FMP** | 250/dia (10/h) | ~300 | ❌ Insuficiente |
| **Alpha Vantage** | 25/dia (1/h) | ~200 | ❌ Crítico |
| **Polygon** | 5/min (300/h) | ~200 | ⚠️ Limitado |

### Solução com Cache:
- **Com cache otimizado**: ~300-500 chamadas/hora total
- **Finnhub sozinho** pode atender a demanda
- Outras APIs servem como backup

## 🚀 Implementação Prioritária

### 1. **Imediato** (Economia 50%):
- Aumentar TTL de preços para 60 segundos
- Aumentar TTL de fundamentals para 4 horas

### 2. **Curto Prazo** (Economia 70%):
- Implementar batch requests
- Cache de logos e info estática no CDN

### 3. **Médio Prazo** (Economia 80%):
- WebSocket para preços em tempo real
- Cache distribuído com Redis

## 📊 Monitoramento Necessário

### Métricas a Acompanhar:
1. **Taxa de Cache Hit**: Meta > 80%
2. **Latência de API**: < 500ms
3. **Quota de APIs**: < 70% do limite
4. **Custo por usuário**: Calcular mensalmente

### Dashboard de Monitoramento:
```typescript
// Adicionar no admin panel
- API calls por provider
- Cache hit rate por tipo
- Tempo médio de resposta
- Quotas restantes
```

## 💡 Conclusão

Com as otimizações sugeridas, o Alfalyzer pode suportar:
- **100-200 usuários simultâneos** com APIs gratuitas
- **Latência < 200ms** para dados em cache
- **Economia de 80%** nas chamadas de API

A chave é o **cache inteligente** e uso prioritário do Finnhub (melhor limite gratuito).