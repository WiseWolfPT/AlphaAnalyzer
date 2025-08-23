# 📊 ALFALYZER STRUCTURE - Estado Completo do Projeto

## 🎯 VISÃO GERAL

**Nome:** Alfalyzer  
**Tipo:** Plataforma de análise financeira  
**Foco:** Stocks e ETFs americanos  
**Público-alvo inicial:** Utilizadores portugueses  
**Status:** Em desenvolvimento (0% funcional)  
**Usuários atuais:** 0  

## 💰 CUSTOS ATUAIS

| Serviço | Custo Mensal | Plano | Observações |
|---------|--------------|-------|-------------|
| **Hetzner CX22** | €3.79 | VPS 2vCPU, 4GB RAM, 40GB SSD | Servidor principal |
| **FMP API** | $29.00 | Mensal | Reduz para $19/mês no plano anual |
| **Supabase** | $0.00 | Free Tier | Limites: 500MB, 500 conexões |
| **Domínio** | ~€7.00 | Anual (~€0.58/mês) | A contratar |
| **TOTAL** | ~€33.37/mês | | ~€400/ano |

### Otimização de Custos Disponível:
- FMP anual: Economia de $120/ano ($10/mês)
- Total com otimização: ~€23.37/mês (~€280/ano)

## 🏗️ ARQUITETURA ATUAL

### Stack Tecnológico

```
┌─────────────────────────────────────────────────┐
│                   FRONTEND                      │
│  React 18.3 + TypeScript 5.6 + Vite 6.0        │
│  Tailwind CSS + shadcn/ui + Wouter             │
└─────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────┐
│                   BACKEND                       │
│  Node.js + Express + TypeScript                 │
│  PM2 (process manager) + Nginx (reverse proxy) │
└─────────────────────────────────────────────────┘
                        │
           ┌────────────┴────────────┐
           ▼                         ▼
┌──────────────────┐       ┌──────────────────┐
│      CACHE       │       │    DATABASE      │
│  Redis (local)   │       │ Supabase (cloud) │
│  In-memory cache │       │ PostgreSQL + Auth│
└──────────────────┘       └──────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────┐
│                EXTERNAL API                     │
│            FMP (Financial Modeling Prep)        │
│              Rate limit: 300 req/min            │
└─────────────────────────────────────────────────┘
```

### Infraestrutura

| Componente | Status | Localização | Configuração |
|------------|--------|-------------|--------------|
| **Frontend** | ✅ Configurado | `/client` | React + Vite |
| **Backend** | ✅ Configurado | `/server` | Express + TypeScript |
| **Redis** | ✅ Configurado | Local (Hetzner) | Cache in-memory |
| **PM2** | ✅ Configurado | `ecosystem.config.cjs` | Process manager |
| **Nginx** | ✅ Configurado | `nginx-alfalyzer.conf` | Reverse proxy |
| **Supabase** | ✅ Configurado | Cloud | Database + Auth |
| **SSL** | ⚠️ Pendente | - | Necessita configuração |

## 🚨 ESTADO ATUAL - PROBLEMAS IDENTIFICADOS

### Vulnerabilidades de Segurança (CRÍTICAS)

1. **SimpleAuthProvider ainda ativo** ⚠️
   - Localização: `/client/src/contexts/simple-auth.tsx`
   - Credenciais hardcoded: `demo@alfalyzer.com / demo123`
   - **Ação necessária:** Remover imediatamente

2. **Secrets expostos no frontend** ⚠️
   - `VITE_VERCEL_PROXY_SECRET` pode estar exposto
   - **Ação necessária:** Verificar todas variáveis VITE_

3. **Duplo sistema de auth** ⚠️
   - SimpleAuth + SupabaseAuth rodando juntos
   - **Ação necessária:** Usar apenas Supabase

### Features - Status de Implementação

| Feature | Status | Observações |
|---------|--------|-------------|
| **Find Stocks** | 🟡 Parcial | Página existe com search e filtros |
| **Dashboard** | 🟡 Parcial | Existe mas não 100% funcional |
| **Advanced Charts** | 🟡 Parcial | Interface criada, gráficos price/revenue visíveis |
| **My Portfolios** | ❌ Não implementado | Menu existe mas sem funcionalidade |
| **Watchlists** | ❌ Não implementado | Menu existe mas sem funcionalidade |
| **Transcripts** | ❌ Não implementado | Menu existe, planejado com ChatGPT/Gemini/Grok |
| **Earnings** | ❌ Não implementado | Menu existe mas sem funcionalidade |
| **Intrinsic Value** | ❌ Não implementado | Menu existe mas sem funcionalidade |
| **Real-time Quotes** | 🟡 Parcial | Cards com preços configurados mas não testado |
| **Stock Details** | 🟡 Parcial | Valuation, Performance, Financials, Growth, Timing tabs |
| **Top Gainers** | 🟡 Visível | Card na dashboard |
| **Top Losers** | 🟡 Visível | Card na dashboard |
| **Most Popular** | 🟡 Visível | Card na dashboard |
| **All Stocks** | 🟡 Visível | Lista com 52 stocks totais |
| **Admin Panel** | 🟡 Existe | Múltiplos componentes criados mas não integrados |
| **Sistema de Auth** | 🟡 Parcial | Supabase configurado mas SimpleAuth ainda ativo |
| **Cache System** | ✅ Configurado | Redis + Supabase cache |
| **API Integration** | 🟡 Parcial | FMP configurado, outros para remover |
| **Setor Filters** | 🟡 Implementado | All Stocks, Technology, Healthcare, Consumer, etc. |
| **Revenue by Segment** | 🟡 Visível | Gráfico de pizza nos detalhes |
| **EBITDA Chart** | 🟡 Visível | Gráfico de tendência nos detalhes |

### Código Morto Identificado

- **40+ componentes UI não utilizados** (shadcn/ui)
- **84 arquivos Stripe** (stubs não implementados)
- **6+ sistemas de cache** redundantes
- **10+ dashboards** duplicados
- **Múltiplos providers de API** (AlphaVantage, Finnhub, Polygon) para remover

## 📈 OBJETIVOS E METAS

### Objetivos de Negócio

| Período | Meta de Usuários | Revenue Target | Observações |
|---------|------------------|----------------|-------------|
| **6 meses** | 500 usuários | €500/mês | Launch + growth |
| **12 meses** | 1000 usuários | €2000/mês | Scale |
| **24 meses** | 5000 usuários | €10000/mês | Expansion |

### Modelo de Monetização

```
FREE TIER (70% dos usuários)
├── Quotes com delay 5 min
├── 5 watchlists
└── Sem portfolio tracking

PREMIUM (€9.99/mês)
├── Quotes com delay 1 min  
├── 20 watchlists
├── 5 portfolios
└── Alertas básicos

PRO (€29.99/mês)
├── Real-time quotes
├── Watchlists ilimitadas
├── Portfolios ilimitados
├── Alertas avançados
└── Transcripts com AI
```

### Requisitos Técnicos

1. **100% Automatizado** - Zero manutenção manual
2. **DORA Compliance** - Audit trails obrigatórios (EU 2025)
3. **Escalabilidade** - Suportar 1000+ usuários com 1 API key
4. **Performance** - Response time <100ms (cache)
5. **Uptime** - 99.9% disponibilidade

## 🔧 ARQUITETURA DE CACHE (ESTRATÉGIA CORE)

### Como Funciona

```javascript
// FETCHER ISOLADO - Único ponto que toca FMP
class IsolatedFetcher {
  // Roda 1x por minuto
  async fetchBatch() {
    // Busca 300 símbolos em 6 batches
    // Total: 6 calls/min (2% do limite de 300)
    const data = await fmp.getBatchQuotes(symbols);
    
    // Armazena para TODOS usuários
    await redis.setex('quotes', 60, data);
    await supabase.insert(data);
  }
}

// USUÁRIOS nunca tocam FMP
app.get('/api/quote/:symbol', async (req, res) => {
  // 95% cache hit rate
  const cached = await redis.get('quotes');
  return cached[req.params.symbol];
});
```

### Matemática do Sistema

| Métrica | Valor | Cálculo |
|---------|-------|---------|
| **API Calls para FMP** | 6/min | 300 símbolos ÷ 50 por batch |
| **Limite FMP** | 300/min | Plano atual |
| **Utilização** | 2% | 6 ÷ 300 |
| **Margem de segurança** | 98% | 294 calls disponíveis |
| **Usuários suportados** | 10,000+ | Todos leem do cache |
| **Cache hit rate** | 95%+ | Redis hot cache |

## 🚀 ROADMAP DE IMPLEMENTAÇÃO

### FASE 1: Correções Críticas (Semana 1)
- [ ] Remover SimpleAuthProvider
- [ ] Corrigir secrets expostos
- [ ] Ativar apenas Supabase Auth
- [ ] Configurar SSL/HTTPS

### FASE 2: Limpeza de Código (Semana 2-3)
- [ ] Remover 40+ componentes UI não usados
- [ ] Deletar 84 arquivos Stripe
- [ ] Remover providers de API extras
- [ ] Consolidar dashboards (10→1)

### FASE 3: Core Features (Semana 4-6)
- [ ] Dashboard principal funcional
- [ ] Real-time quotes funcionando
- [ ] Sistema de watchlists
- [ ] Portfolio básico

### FASE 4: Admin & Monitoring (Semana 7-8)
- [ ] Admin panel integrado
- [ ] Monitoring com Prometheus
- [ ] Alertas e logs
- [ ] Rate limit dashboard

### FASE 5: Launch Preparation (Semana 9-12)
- [ ] Transcripts com AI (ChatGPT/Gemini)
- [ ] Sistema de pagamentos
- [ ] Onboarding flow
- [ ] Marketing website

## 📊 MÉTRICAS DE SUCESSO

| KPI | Target | Como Medir |
|-----|--------|------------|
| **Uptime** | 99.9% | UptimeRobot |
| **Response Time** | <100ms | Prometheus |
| **Cache Hit Rate** | >95% | Redis stats |
| **API Usage** | <10% limite | FMP dashboard |
| **User Growth** | 50/mês | Supabase analytics |
| **Churn Rate** | <5% | Custom tracking |
| **MRR Growth** | 20%/mês | Stripe metrics |

## 🔐 COMPLIANCE & SEGURANÇA

### DORA Requirements (Janeiro 2025)
- ✅ Audit trails (Supabase)
- ⚠️ Incident reporting (parcial)
- ❌ Operational resilience testing
- ⚠️ Third-party risk management

### Segurança
- ⚠️ Auth system (precisa consolidar)
- ❌ Rate limiting por usuário
- ⚠️ API key rotation
- ❌ Encryption at rest

## 💡 DECISÕES ARQUITETURAIS

### Confirmadas
1. **Supabase + Redis** como stack principal
2. **FMP como único provider** de dados
3. **Cache-first architecture** para escalabilidade
4. **Wouter em vez de React Router**
5. **PM2 + Nginx** para produção

### Rejeitadas
1. ~~VictoriaMetrics~~ - Complexidade desnecessária
2. ~~QuestDB~~ - Overhead de JVM
3. ~~Múltiplos API providers~~ - Complexidade sem benefício
4. ~~Stripe payments inicialmente~~ - MVP primeiro

## 📝 NOTAS IMPORTANTES

1. **Sistema atualmente 0% funcional** - Necessita desenvolvimento core
2. **Vulnerabilidades de segurança críticas** não corrigidas
3. **50-60% do código pode ser removido** (over-engineering)
4. **Supabase Free tier insuficiente** para 1000 users (upgrade necessário)
5. **Admin panel existe mas não integrado**
6. **Transcripts planejado mas não implementado**

## 🎯 PRÓXIMOS PASSOS IMEDIATOS

1. **HOJE:** Corrigir vulnerabilidades de segurança
2. **ESTA SEMANA:** Remover SimpleAuth e código morto
3. **PRÓXIMA SEMANA:** Implementar dashboard funcional
4. **EM 2 SEMANAS:** Sistema de quotes funcionando
5. **EM 1 MÊS:** MVP pronto para testes

---

**Última atualização:** 2025-08-21  
**Responsável:** António Francisco  
**Versão:** 1.0.0