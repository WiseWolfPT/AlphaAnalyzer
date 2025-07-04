# 🎯 Plano Híbrido V4 – Alfalyzer MVP (Claude + O3-mini + Gemini Pro)

```yaml
consenso: "true"
se_divergente: null

plano_v4:
  # ------------------------------------------------------------------
  #  SEMANA 0  ·  QUICK-WINS (D-0 → D-1)
  # ------------------------------------------------------------------
  semana_0:
    - "Snapshot de segurança: git checkout -b backup/<data> && git push origin backup/<data>"
    - "Preservar scripts úteis: manter scripts/seed.ts  scripts/test-e2e.*  bulletproof-*.sh"
    - "CORS seguro em todas as /api/**: res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_ORIGIN)"
    - "Back-off 429 global: if (resp.status===429) await new Promise(r=>setTimeout(r,1000))  // log 'backoff'"
    - "Novo endpoint: api/health/kv.ts  →  { totalOps, limitOps: 100000 }"
    - "GH Action kv-usage-check.yml 07:30 UTC (falha se totalOps ≥ 90000)"
    - "Header X-Edge-TTFB: expor e manter < 300 ms em cache-hit"

  # ------------------------------------------------------------------
  #  SEMANA 1  ·  FEATURES CORE
  # ------------------------------------------------------------------
  semana_1:
    dia_1-2:
      - "Admin panel básico para transcripts (CRUD mock em SQLite)"
    dia_3-4:
      - "Completar integração de dados reais em Top Gainers/Losers, Watchlist, Earnings Calendar"
    dia_5:
      - "Rate Limiting: @upstash/ratelimit 30 req/min IP usando contador KV"

  # ------------------------------------------------------------------
  #  SEMANA 2  ·  POLISH & DEPLOY
  # ------------------------------------------------------------------
  semana_2:
    dia_6:
      - "Playwright refactor (0,5 dia) – ajustar seletores quebrados"
    dia_7:
      - "Supabase Auth (email/password) + rotas protegidas"
    dia_8:
      - "Seed Supabase: 5 users demo / 20 stocks fav  →  docs/SEED_GUIDE.md"
    dia_9:
      - "Legal / GDPR: /terms  /privacy  cookie-consent  disclaimer '15-min delayed'"
    dia_10:
      - "Deploy Vercel prod + Vercel Analytics + validação TTFB & quota action verde"

metricas_sucesso:
  - descricao: "Segurança: zero VITE_ exposto"
    alvo: "grep -r 'VITE_' src/ = 0"
  - descricao: "Performance: cache-hit TTFB"
    alvo: "<= 300 ms"
    medicao: "X-Edge-TTFB header"
  - descricao: "Cache hit rate"
    alvo: ">= 80 %"
    medicao: "/api/cache/stats ou Vercel Analytics"
  - descricao: "Rate limit funcional"
    alvo: "30 req/min IP"
  - descricao: "Custo infra"
    alvo: "€0.00"

riscos_e_mitigacao:
  - risco: "Quebrar funcionalidades ao remover dead-code"
    mitigacao: "Branch backup + smoke-tests"
  - risco: "Limite KV diário 100 k ops"
    mitigacao: "endpoint /health/kv + GH Action"
  - risco: "Burst 429 dos providers"
    mitigacao: "back-off simples + log"

checklist_lancamento_MVP:
  - "[ ] Codebase limpo **sem** apagar infra útil (Docker, SQLite, scripts)"
  - "[ ] grep -r 'VITE_' src/ === 0"
  - "[ ] /api/stock/[symbol].ts com cache TTL 15 min"
  - "[ ] /api/health/kv + kv-usage-check.yml verde"
  - "[ ] Rate-limit 30 req/min ativo"
  - "[ ] Supabase Auth + seed executado"
  - "[ ] Playwright E2E verdes"
  - "[ ] TTFB < 300 ms (cache-hit)"
  - "[ ] Custo dashboards = €0"
  - "[ ] Checklist MVP completo"

tecnologias_finais:
  hosting: "Vercel Hobby (free)"
  database: "SQLite local → Supabase Free (500 MB) futuramente"
  cache: "In-memory atual + contador KV (sem migração full KV por ora)"
  auth: "Supabase Auth (50 k MAU)"
  rate_limit: "@upstash/ratelimit"
  monitoring: "Vercel Analytics"
```

## 🚀 Quando TODOS os items acima estiverem OK responde, linha por linha:

```
SMOKE TEST OK
SEED OK
QUOTA CHECK OK
DOCS OK
READY FOR DEMO
```

---

## 📋 Estado de Implementação

### Semana 0 - Quick Wins
- [ ] Snapshot de segurança
- [ ] Preservar scripts úteis
- [ ] CORS seguro em todas as /api/**
- [ ] Back-off 429 global
- [ ] Novo endpoint: api/health/kv.ts
- [ ] GH Action kv-usage-check.yml
- [ ] Header X-Edge-TTFB

### Semana 1 - Features Core
- [ ] Admin panel básico para transcripts
- [ ] Completar integração de dados reais
- [ ] Rate Limiting implementado

### Semana 2 - Polish & Deploy
- [ ] Playwright refactor
- [ ] Supabase Auth
- [ ] Seed Supabase
- [ ] Legal / GDPR
- [ ] Deploy Vercel prod

---

**Última atualização**: 2025-07-05