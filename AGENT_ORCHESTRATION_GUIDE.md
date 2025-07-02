# 🤖 AGENT ORCHESTRATION GUIDE - Como Comandar Agentes para Implementar Alfalyzer

## 📋 VISÃO GERAL

Este guia mostra como dar comandos eficientes para múltiplos agentes trabalharem nas implementações do Alfalyzer de forma paralela e organizada.

## 🎯 PRINCÍPIOS DE ORQUESTRAÇÃO

### 1. **Trabalho Paralelo**
- Sempre que possível, lance múltiplos agentes para tarefas independentes
- Maximize a eficiência com trabalho simultâneo
- Evite dependências desnecessárias entre tarefas

### 2. **Comandos Claros e Específicos**
- Seja preciso sobre O QUE fazer
- Indique ONDE fazer (ficheiros/pastas)
- Especifique COMO verificar o sucesso

### 3. **Ordem de Implementação**
Siga sempre esta ordem (do IMPLEMENTATION_GUIDE.md):
1. Backend & Database (CRITICAL)
2. Data Integration (HIGH)
3. Feature Implementation (HIGH)
4. User Features (MEDIUM)
5. Monetization (MEDIUM)

---

## 📝 TEMPLATES DE COMANDOS

### 🔴 PHASE 1: Backend & Database Setup

#### Comando 1.1: Setup Inicial Supabase
```
Preciso que orquestres 3 agentes para configurar o Supabase:

AGENT 1 - "Setup Supabase Tables"
- Lê IMPLEMENTATION_GUIDE.md linhas 60-104
- Cria script SQL em /migrations/001_initial_setup.sql
- Inclui todas as tabelas: users, watchlists, watchlist_items, portfolios, transactions
- Adiciona os índices necessários

AGENT 2 - "Setup RLS Policies"  
- Lê IMPLEMENTATION_GUIDE.md linhas 130-168
- Cria script SQL em /migrations/002_rls_policies.sql
- Implementa todas as políticas RLS para cada tabela
- Testa que as políticas estão corretas

AGENT 3 - "Setup Subscriptions Table"
- Lê IMPLEMENTATION_GUIDE.md linhas 171-197
- Cria script SQL em /migrations/003_subscriptions.sql
- Adiciona tabela subscriptions com todos os campos
- Inclui políticas RLS e índices

Confirma quando todos terminarem e mostra os ficheiros criados.
```

#### Comando 1.2: Configuração de Environment Variables
```
Orquestra 2 agentes para configurar as variáveis de ambiente:

AGENT 1 - "Backend Environment Setup"
- Cria ficheiro .env.example com todas as variáveis do backend
- Baseado em IMPLEMENTATION_GUIDE.md linhas 107-128
- NÃO incluir prefixo VITE_ nestas variáveis
- Incluir: SUPABASE_SERVICE_KEY, todas as API keys, Stripe keys

AGENT 2 - "Frontend Environment Setup"
- Cria ficheiro .env.public.example
- APENAS variáveis com prefixo VITE_
- Incluir: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
- Adicionar comentários explicando a diferença

Importante: Explica claramente que .env fica no servidor e .env.public vai para o cliente.
```

### 🟡 PHASE 2: API Integration

#### Comando 2.1: Implementar Serviços de API
```
Preciso 4 agentes trabalhando em paralelo nos serviços de API:

AGENT 1 - "Twelve Data Service"
- Implementa server/services/twelve-data-service.ts
- Baseado em IMPLEMENTATION_GUIDE.md linhas 200-220
- Métodos: getQuote(), getTimeSeries()
- Cache de 1 minuto para preços
- Trata erros e rate limits

AGENT 2 - "FMP Service"
- Implementa server/services/fmp-service.ts
- Métodos: getCompanyProfile(), getFinancialStatements()
- Cache de 24 horas para fundamentals
- 250 calls/day limit handling

AGENT 3 - "Finnhub Service"
- Implementa server/services/finnhub-service.ts
- Métodos: getQuote(), getCompanyNews()
- 60 calls/minute rate limit
- Serve como backup para preços

AGENT 4 - "Alpha Vantage Service"
- Implementa server/services/alpha-vantage-service.ts
- Métodos: getIncomeStatement(), getBalanceSheet()
- 25 calls/day - usar com moderação
- Cache agressivo de 24 horas

Todos devem seguir o padrão de error handling da linha 520-532.
```

#### Comando 2.2: Unified API Service
```
Orquestra 1 agente para criar o serviço unificado:

AGENT - "Unified API Service"
- Implementa server/services/unified-api-service.ts
- Segue exatamente o código das linhas 222-272 do IMPLEMENTATION_GUIDE.md
- Integra os 4 serviços criados anteriormente
- Implementa fallback inteligente entre APIs
- Adiciona monitoring com apiMonitor.trackRequest()
- IMPORTANTE: Este serviço roda no BACKEND, não no frontend!

Verifica que o fluxo seja: Frontend → Backend → APIs Externas
```

### 🟢 PHASE 3: Feature Implementation

#### Comando 3.1: Find Stocks Page
```
2 agentes para implementar a página Find Stocks:

AGENT 1 - "Find Stocks UI"
- Implementa client/src/pages/find-stocks.tsx
- Adiciona search com autocomplete
- Grid de stocks populares
- Lista de trending stocks
- Usa componentes shadcn/ui existentes
- Navigation para /stock/[symbol] ao clicar

AGENT 2 - "Stock Search API"
- Cria endpoint server/routes/stock-search.ts
- Implementa busca usando Twelve Data symbol search
- Cache de resultados por 1 hora
- Retorna formato compatível com autocomplete
```

#### Comando 3.2: Advanced Charts Implementation
```
Orquestra 3 agentes para os Advanced Charts:

AGENT 1 - "Chart Components"
- Cria components para cada métrica financeira:
  - RevenueChart.tsx
  - EPSChart.tsx
  - CashFlowChart.tsx
  - NetIncomeChart.tsx
- Usa Recharts (já instalado)
- Segue padrão dos screenshots fornecidos

AGENT 2 - "Advanced Charts Page"
- Atualiza client/src/pages/AdvancedCharts.tsx
- Implementa grid layout com os chart components
- Adiciona seletor Quarterly/Annual
- Período selecionável (1Y, 3Y, 5Y, etc)

AGENT 3 - "Financial Data Endpoint"
- Cria server/routes/financial-metrics.ts
- Busca dados do FMP (fundamentals)
- Formata dados para os gráficos
- Cache de 24 horas
```

### 🔵 PHASE 4: Testing & Monitoring

#### Comando 4.1: Setup de Testes
```
2 agentes para configurar testes:

AGENT 1 - "Test Configuration"
- Cria vitest.config.ts seguindo linhas 726-748
- Configura React Testing Library
- Setup arquivo de configuração de testes
- Adiciona scripts no package.json

AGENT 2 - "Initial Tests"
- Implementa testes das linhas 751-811
- Cria testes para hooks principais
- Testes de contrato de API
- Pelo menos 5 testes funcionando
```

#### Comando 4.2: Monitoring Setup
```
1 agente para monitoring:

AGENT - "API Monitoring"
- Implementa server/middleware/api-monitor.ts
- Segue código das linhas 537-586
- Adiciona métricas Prometheus
- Implementa alertas de quota (80%)
- Cria endpoint /metrics para visualização
```

### 🟣 PHASE 5: CI/CD Pipeline

#### Comando 5.1: GitHub Actions
```
1 agente para CI/CD:

AGENT - "CI/CD Pipeline"
- Cria .github/workflows/ci.yml
- Copia exatamente das linhas 649-720
- Adiciona secrets necessários no README
- Testa que o pipeline funciona com um commit de teste
```

---

## 🚀 COMANDOS DE VERIFICAÇÃO

### Após cada fase, use estes comandos:

#### Verificar Phase 1 (Database)
```
Verifica o seguinte:
1. Todos os scripts SQL foram criados em /migrations?
2. As tabelas têm políticas RLS?
3. Os ficheiros .env.example estão corretos?
4. A separação backend/frontend está clara?
```

#### Verificar Phase 2 (APIs)
```
Testa a integração:
1. Cada serviço de API está implementado?
2. O UnifiedAPIService integra todos os serviços?
3. O cache está configurado corretamente?
4. Os rate limits estão respeitados?
```

#### Verificar Phase 3 (Features)
```
Confirma funcionalidades:
1. Find Stocks tem search funcionando?
2. Advanced Charts mostra dados reais?
3. A navegação entre páginas funciona?
4. Os dados estão sendo cached?
```

---

## 💡 DICAS PARA COMANDOS EFICAZES

### 1. **Seja Específico com Números de Linha**
```
❌ "Implementa o serviço de API"
✅ "Implementa o serviço seguindo IMPLEMENTATION_GUIDE.md linhas 222-272"
```

### 2. **Agrupe Tarefas Relacionadas**
```
❌ Um agente por ficheiro pequeno
✅ Um agente para todos os componentes de chart relacionados
```

### 3. **Defina Critérios de Sucesso**
```
✅ "O agente deve confirmar que:
   - Os testes passam
   - Não há erros de TypeScript
   - O componente renderiza corretamente"
```

### 4. **Use Contexto dos Ficheiros**
```
✅ "Baseado no padrão existente em client/src/components/stock/"
✅ "Segue o mesmo estilo dos hooks em client/src/hooks/"
```

### 5. **Priorize Tarefas Críticas**
```
1º Backend e Database (bloqueante)
2º APIs (necessário para features)
3º Features (valor para usuário)
4º Testes (qualidade)
5º CI/CD (automação)
```

---

## 📊 EXEMPLO DE SESSÃO COMPLETA

```
USER: "Vamos começar a implementar o Alfalyzer. Começa pela Phase 1."

ASSISTANT: [Lança 3 agentes para Supabase setup]

USER: "Ótimo, agora configura as variáveis de ambiente."

ASSISTANT: [Lança 2 agentes para environment setup]

USER: "Perfeito. Vamos para as APIs."

ASSISTANT: [Lança 4 agentes para serviços individuais]
[Depois lança 1 agente para UnifiedAPIService]

USER: "Excelente. Implementa a página Find Stocks."

ASSISTANT: [Lança 2 agentes paralelos]

[... continua através das fases ...]
```

---

## 🎯 MÉTRICAS DE SUCESSO

Ao final de cada sessão, verifique:

- [ ] Quantos agentes foram lançados?
- [ ] Quantas tarefas foram completadas?
- [ ] Há erros ou bloqueios?
- [ ] O que precisa ser feito na próxima sessão?

---

## 🔧 TROUBLESHOOTING

### Problema: Agente não entende a tarefa
**Solução**: Seja mais específico com números de linha e exemplos

### Problema: Agentes criando código duplicado
**Solução**: Sempre peça para verificar se já existe antes de criar

### Problema: Dependências entre agentes
**Solução**: Agrupe tarefas dependentes num único agente

### Problema: Agente fazendo demais
**Solução**: Divida em tarefas menores e mais focadas

---

**Lembra-te**: O objetivo é transformar o Alfalyzer de UI bonita com dados mock numa plataforma funcional. Cada comando deve aproximar-nos desse objetivo! 🚀