# 🚀 ALFALYZER PARALLEL EXECUTION PROMPTS

Execute estes prompts em sequência de fases. Dentro de cada fase, os prompts podem ser executados em PARALELO.

---

## 📋 PHASE 1: BACKEND & DATABASE SETUP (CRITICAL)

### PROMPT 1.1 - Database Schema Setup
```
--ultrathink

Orquestra agentes em paralelo para configurar completamente a base de dados Supabase:

AGENT 1 - "Core Tables Creator"
- Lê IMPLEMENTATION_GUIDE.md linhas 60-104
- Cria /migrations/001_core_tables.sql
- Implementa tabelas: users, watchlists, watchlist_items
- Adiciona todos os campos, tipos e constraints
- Inclui índices para performance

AGENT 2 - "Portfolio Tables Creator"
- Lê IMPLEMENTATION_GUIDE.md linhas 83-99
- Cria /migrations/002_portfolio_tables.sql
- Implementa tabelas: portfolios, transactions
- Garante integridade referencial
- Adiciona checks para tipos de transação

AGENT 3 - "Subscriptions & Billing"
- Lê IMPLEMENTATION_GUIDE.md linhas 171-197
- Cria /migrations/003_subscriptions.sql
- Implementa tabela subscriptions completa
- Adiciona índices para stripe_subscription_id
- Prepara para integração com Stripe

AGENT 4 - "RLS Policies Master"
- Lê IMPLEMENTATION_GUIDE.md linhas 130-168
- Cria /migrations/004_rls_policies.sql
- Implementa TODAS as políticas RLS
- Uma política por operação (SELECT, INSERT, UPDATE, DELETE)
- Testa que auth.uid() está correto

IMPORTANTE: Todos os agentes devem incluir comentários SQL explicando cada decisão.
```

### PROMPT 1.2 - Environment & Configuration
```
--ultrathink

Lança 3 agentes simultâneos para configuração completa do ambiente:

AGENT 1 - "Backend Security Setup"
- Cria /.env.example com TODAS as variáveis backend (sem VITE_)
- Baseado em IMPLEMENTATION_GUIDE.md linhas 107-128
- Inclui: SUPABASE_SERVICE_KEY, ALPHA_VANTAGE_API_KEY, TWELVE_DATA_API_KEY, FMP_API_KEY, FINNHUB_API_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
- Adiciona comentários explicando cada variável
- Cria /server/config/env.ts para validar variáveis

AGENT 2 - "Frontend Public Config"
- Cria /.env.public.example apenas com variáveis VITE_
- Inclui: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
- Adiciona WARNING sobre segurança no topo do ficheiro
- Cria /client/src/config/env.ts para tipos TypeScript

AGENT 3 - "Supabase Client Setup"
- Cria /server/lib/supabase-admin.ts para backend
- Cria /client/src/lib/supabase.ts para frontend  
- Implementa clients com as keys corretas
- Adiciona tipos TypeScript para as tabelas
- Configura auth helpers

CRITICAL: Explica claramente que variáveis SEM VITE_ nunca vão para o cliente!
```

### PROMPT 1.3 - Server Foundation
```
--ultrathink

3 agentes para criar a fundação do servidor Express:

AGENT 1 - "Express Server Core"
- Atualiza /server/index.ts com configuração production-ready
- Implementa middleware de segurança (helmet, cors, rate-limit)
- Configura body parsing para JSON e Stripe webhooks (raw)
- Setup error handling middleware
- Adiciona health check endpoint

AGENT 2 - "Database Connection Layer"
- Cria /server/db/index.ts com pool de conexões
- Implementa retry logic para conexões
- Cria /server/db/migrations.ts para executar migrations
- Adiciona comando npm run migrate
- Testa conexão no startup

AGENT 3 - "Auth Middleware"
- Cria /server/middleware/auth.ts
- Implementa verificação JWT Supabase
- Cria tipos para req.user
- Adiciona role-based access (user, admin)
- Implementa refresh token handling

Todos devem seguir padrões TypeScript strict e incluir error handling robusto.
```

---

## 📊 PHASE 2: API INTEGRATION (HIGH PRIORITY)

### PROMPT 2.1 - Individual API Services
```
--ultrathink

Orquestra 4 agentes SIMULTÂNEOS para implementar TODOS os serviços de API:

AGENT 1 - "Twelve Data Master"
- Implementa /server/services/apis/twelve-data-service.ts
- Lê IMPLEMENTATION_GUIDE.md linhas 206-209
- Métodos: getQuote(), getTimeSeries(), searchSymbols()
- Rate limit: 800 calls/day (track usage)
- Cache: 1 minuto para quotes, 5 minutos para time series
- WebSocket: prepara conexão para real-time

AGENT 2 - "FMP Specialist"  
- Implementa /server/services/apis/fmp-service.ts
- Lê IMPLEMENTATION_GUIDE.md linhas 211-214
- Métodos: getCompanyProfile(), getFinancialStatements(), getKeyMetrics()
- Rate limit: 250 calls/day (STRICT)
- Cache: 24 horas para fundamentals
- Batch requests quando possível

AGENT 3 - "Finnhub Integration"
- Implementa /server/services/apis/finnhub-service.ts
- Lê IMPLEMENTATION_GUIDE.md linhas 216-218
- Métodos: getQuote(), getCompanyNews(), getRecommendations()
- Rate limit: 60 calls/minute
- Serve como backup rápido
- Implementa circuit breaker

AGENT 4 - "Alpha Vantage Conservative"
- Implementa /server/services/apis/alpha-vantage-service.ts
- Lê IMPLEMENTATION_GUIDE.md linhas 220-222
- Métodos: getIncomeStatement(), getBalanceSheet(), getCashFlow()
- Rate limit: 25 calls/day (USE SPARINGLY)
- Cache: 48 horas mínimo
- Só usar quando outros falham

TODOS devem implementar: error handling, retry logic, logging detalhado, tipos TypeScript.
```

### PROMPT 2.2 - Unified API & Cache Layer
```
--ultrathink

3 agentes para sistema unificado e cache:

AGENT 1 - "Unified API Orchestrator"
- Implementa /server/services/unified-api-service.ts
- COPIA EXATAMENTE linhas 222-272 do IMPLEMENTATION_GUIDE.md
- Integra os 4 serviços do prompt anterior
- Implementa fallback inteligente
- Adiciona prioridade por tipo de dados
- Tracking com apiMonitor

AGENT 2 - "Cache Manager Supreme"
- Cria /server/services/cache-manager.ts
- Implementa cache em memória com TTL
- Respeita durações do IMPLEMENTATION_GUIDE.md linha 276-283
- Adiciona cache warming para stocks populares
- Implementa invalidação inteligente
- Prepara para Redis futuro

AGENT 3 - "API Monitor & Alerts"
- Implementa /server/middleware/api-monitor.ts
- COPIA código das linhas 537-586
- Adiciona métricas Prometheus
- Alerta quando > 80% quota
- Endpoint GET /api/metrics
- Dashboard simples HTML em /api/metrics/dashboard

CRUCIAL: Frontend NUNCA chama APIs externas diretamente!
```

### PROMPT 2.3 - API Routes
```
--ultrathink

2 agentes para criar todos os endpoints:

AGENT 1 - "Stock Data Routes"
- Cria /server/routes/api/stocks.ts
- GET /api/stocks/:symbol - dados em tempo real
- GET /api/stocks/:symbol/fundamentals - dados fundamentais
- GET /api/stocks/:symbol/historical - dados históricos
- GET /api/stocks/search - pesquisa símbolos
- POST /api/stocks/batch - múltiplos símbolos
- Usa UnifiedAPIService para tudo

AGENT 2 - "Market Data Routes"
- Cria /server/routes/api/market.ts
- GET /api/market/indices - DOW, S&P, NASDAQ
- GET /api/market/trending - stocks em alta
- GET /api/market/movers - maiores variações
- GET /api/market/news - notícias gerais
- Cache agressivo para reduzir calls

Ambos devem incluir validação de input, auth quando necessário, e documentação inline.
```

---

## 🎨 PHASE 3: FEATURE IMPLEMENTATION (HIGH PRIORITY)

### PROMPT 3.1 - Find Stocks Feature
```
--ultrathink

4 agentes para implementar Find Stocks completo:

AGENT 1 - "Search UI Master"
- Atualiza /client/src/pages/find-stocks.tsx
- Implementa search com debounce 300ms
- Autocomplete mostra símbolo + nome
- Grid com categorias: Popular, Trending, Recent
- Usa shadcn/ui Command component
- Navigate to /stock/[symbol] ao selecionar

AGENT 2 - "Search Backend"
- Cria /server/routes/api/search.ts
- Implementa fuzzy search
- Combina resultados de Twelve Data + cache local
- Ranking por relevância e popularidade
- Cache de 1 hora para queries comuns

AGENT 3 - "Stock Categories Service"
- Cria /server/services/stock-categories.ts
- getPopularStocks() - top 20 mais vistos
- getTrendingStocks() - maiores variações
- getRecentlyViewed() - por usuário
- Cache strategies diferentes por categoria

AGENT 4 - "Search Analytics"
- Cria /server/services/search-analytics.ts
- Track queries para melhorar resultados
- Track clicks para popular stocks
- Implementa "Did you mean?" para typos
- Prepara dados para ML futuro

Coordenem para garantir tipos TypeScript consistentes.
```

### PROMPT 3.2 - Advanced Charts Implementation
```
--ultrathink

5 agentes PARALELOS para Advanced Charts completo:

AGENT 1 - "Financial Charts Components"
- Cria componentes em /client/src/components/charts/financial/
- RevenueChart.tsx - receita trimestral/anual
- EPSChart.tsx - earnings per share
- CashFlowChart.tsx - fluxo de caixa
- Usa Recharts com theme consistente
- Props tipadas para período e intervalo

AGENT 2 - "Metrics Charts Components"  
- Cria em /client/src/components/charts/metrics/
- NetIncomeChart.tsx - lucro líquido
- EBITDAChart.tsx - EBITDA
- DebtChart.tsx - dívida vs caixa
- Todos responsivos e com loading states

AGENT 3 - "Advanced Charts Page"
- Atualiza /client/src/pages/AdvancedCharts.tsx
- Grid layout 2x3 em desktop, 1x6 mobile
- Toggle Quarterly/Annual
- Selector de período: 1Y, 3Y, 5Y, 10Y, MAX
- Sync período entre todos os charts
- Export to PNG/CSV

AGENT 4 - "Financial Data Aggregator"
- Cria /server/services/financial-aggregator.ts  
- Agrega dados de FMP + Alpha Vantage
- Normaliza diferentes formatos
- Calcula métricas derivadas
- Cache 24h com refresh manual

AGENT 5 - "Charts Data Routes"
- Cria /server/routes/api/charts.ts
- GET /api/charts/:symbol/revenue
- GET /api/charts/:symbol/all - todos os dados
- Query params: period, interval
- Otimiza payload size
- Compressão gzip

Garantam que os gráficos correspondam aos screenshots fornecidos!
```

### PROMPT 3.3 - Stock Details Page
```
--ultrathink

3 agentes para página de detalhes completa:

AGENT 1 - "Stock Details UI"
- Cria /client/src/pages/stock/[symbol].tsx
- Header com preço real-time e variação
- Tabs: Overview, Charts, Fundamentals, News
- Botão Add to Watchlist
- Mini gráfico intraday
- Métricas-chave em cards

AGENT 2 - "Real-time Price Hook"
- Cria /client/src/hooks/use-realtime-price.ts
- Implementa WebSocket com Supabase Realtime
- Fallback para polling se WS falhar
- Reconexão automática
- Optimistic updates

AGENT 3 - "Company Info Service"
- Cria /server/services/company-info.ts
- Agrega perfil de múltiplas fontes
- Logo, descrição, sector, industry
- Executives e informação fiscal
- Links para investor relations
- Cache 7 dias

Usem wouter para routing, NÃO React Router!
```

---

## 🧪 PHASE 4: TESTING & QUALITY (MEDIUM PRIORITY)

### PROMPT 4.1 - Test Infrastructure
```
--ultrathink

3 agentes para configurar testes completos:

AGENT 1 - "Test Configuration Master"
- Cria /vitest.config.ts seguindo linhas 726-748
- Configura coverage mínima 80%
- Setup React Testing Library
- Cria /client/src/test/setup.ts
- Adiciona scripts no package.json
- Configura CI para rodar testes

AGENT 2 - "API Contract Tests"
- Cria testes em /server/services/apis/__tests__/
- Um ficheiro por serviço de API
- Testa schema de resposta
- Testa rate limiting
- Testa error scenarios
- Mock HTTP calls

AGENT 3 - "Component Tests"
- Cria /client/src/components/__tests__/
- Testa componentes críticos
- Testa hooks customizados
- Testa integração com React Query
- Accessibility tests (a11y)

Objetivo: 80% coverage no core business logic.
```

### PROMPT 4.2 - Monitoring & Observability
```
--ultrathink

2 agentes para observabilidade completa:

AGENT 1 - "Metrics & Monitoring"
- Implementa sistema completo de métricas
- Usa código das linhas 534-586
- Adiciona custom business metrics
- Cria dashboard em /api/metrics/dashboard
- Integra Prometheus format
- Prepara para Grafana

AGENT 2 - "Logging & Tracing"
- Implementa structured logging com Winston
- Correlation IDs para requests
- Log levels por ambiente
- Rotation de logs
- Integração futura com Datadog
- Performance timing

Incluam alertas para problemas críticos.
```

---

## 🚢 PHASE 5: CI/CD & DEPLOYMENT (MEDIUM PRIORITY)

### PROMPT 5.1 - CI/CD Pipeline
```
--ultrathink

2 agentes para automação completa:

AGENT 1 - "GitHub Actions Master"
- Cria /.github/workflows/ci.yml
- COPIA exatamente linhas 649-720
- Adiciona jobs para cada fase
- Matrix testing Node 18/20
- Cache dependencies
- Deploy automático em main

AGENT 2 - "Pre-commit & Quality"
- Configura Husky pre-commit hooks
- ESLint + Prettier automático
- Type checking antes de commit
- Impede commits com testes falhados
- Conventional commits enforcement
- Atualiza CHANGELOG automático

Garantam que tudo corre em < 5 minutos.
```

### PROMPT 5.2 - Production Readiness
```
--ultrathink

3 agentes para preparar produção:

AGENT 1 - "Security Hardening"
- Audit de todas as dependências
- Implementa rate limiting global
- CORS configuration estrita
- Headers de segurança com Helmet
- Input validation em todos os endpoints
- SQL injection prevention

AGENT 2 - "Performance Optimization"
- Implementa compression
- Bundle splitting otimizado
- Lazy loading de routes
- Image optimization
- Service worker para cache
- CDN preparation

AGENT 3 - "Documentation Master"
- Cria API documentation com Swagger
- README.md para deployment
- Environment setup guide
- Troubleshooting guide
- Architecture diagrams
- Runbook para incidentes

Objetivo: Production-ready, secure, fast!
```

---

## 🎯 PROMPT FINAL - INTEGRATION CHECK

### PROMPT 6.1 - Final Integration
```
--ultrathink

2 agentes para verificação final:

AGENT 1 - "Integration Tester"
- Testa fluxo completo: Login → Search → View Stock → Add to Watchlist
- Verifica que dados reais aparecem
- Testa em Chrome, Firefox, Safari
- Testa mobile responsive
- Lista TODOS os bugs encontrados

AGENT 2 - "Checklist Validator"
- Verifica TODOS os items do SUCCESS CRITERIA (linhas 900-913)
- Cria relatório do que está completo
- Lista o que falta implementar
- Sugere prioridades para próximos passos
- Estima tempo restante

Este é o momento da verdade - funciona tudo integrado?
```

---

## 📋 COMO USAR ESTES PROMPTS

1. **Comece pela PHASE 1** - é bloqueante para o resto
2. **Dentro de cada fase**, execute os prompts em PARALELO
3. **Use --ultrathink** para máxima eficiência
4. **Aguarde confirmação** antes de passar à próxima fase
5. **Se houver erros**, crie prompts específicos para correção

## 🚀 INÍCIO RÁPIDO

Copie e cole este comando para começar:
```
"Vamos implementar o Alfalyzer! Começa com o PROMPT 1.1 da PHASE 1. Usa o modo --ultrathink e lança os 4 agentes em paralelo para configurar a base de dados."
```

Boa sorte! O Alfalyzer vai ficar incrível! 🎉