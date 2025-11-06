# CLAUDE.md - Alfalyzer

Financial analysis platform with real-time market data, earnings transcripts, and advanced charting. Built for Portuguese market focus with global capabilities.

## PRODUCTION STATUS

**URL:** https://128.140.45.28.sslip.io/ ✅ **FUNCIONANDO!**  
**Server:** Hetzner CX22 (128.140.45.28)  
**Status:** 95% Production Ready  
**SSL Certificate:** Valid until 2025-11-16 (auto-renews)

✅ **Working:**
- Frontend loading correctly (CORS fixed)
- Nginx serving static files properly  
- HTTPS functioning at https://128.140.45.28.sslip.io/
- PM2 stable (alfalyzer process)
- Redis connected (256MB, password: alfalyzer2025redis)
- FMP API key valid and working
- All external APIs responding
- Real-time quotes updating

⚠️ **Pending Features:**
- Observabilidade e SLOs (scripts de verificação rápida – Fase 6)
- Revisão final de segurança/RLS e documentação (Fases 7-8)

## TECH STACK

**Frontend:** React 18.3.1, TypeScript 5.6.3, Vite 6.0, Tailwind 3.4, shadcn/ui, Wouter 3.3.5  
**Backend:** Node.js 20+, Express 4.21.2, TypeScript  
**Database:** Supabase (PostgreSQL + Auth + Realtime + Storage)  
**Cache:** Redis 6.2+ (256MB configured)
**APIs:** Alpha Vantage, Finnhub, FMP, Twelve Data, Polygon  
**Deployment:** Hetzner CX22 (€3.79/mo) - Frontend e Backend no mesmo servidor com PM2

## MONITORING & SLOs

SLOs (alvo):
- Latência P95: < 200ms (API)
- Erros 5xx: < 0.1%
- Cache hit rate: > 80%
- Uptime: > 99.9%

### System Monitoring Scripts

Scripts (funcionam com localhost:3001 e produção):
- `scripts/monitoring/check-health.sh [URL]`
  - Verifica `/api/health` e mede latência.
- `scripts/monitoring/check-cache.sh [URL]`
  - Verifica `/api/cache/status` e calcula hit rate.
- `scripts/monitoring/check-batch.sh [URL]`
  - Faz POST em `/api/market-data/quotes/batch` (usa `MARKET_DATA_API_KEY` se definido).
- `scripts/monitoring/check-slo.sh [URL]`
  - Executa amostragem, calcula P95, taxa de erro 5xx, hit rate, e uptime (rolling).
- `scripts/monitoring/monitor-all.sh [URL]`
  - Executa todos os checks acima de forma sequencial.

### ONDA 7: Intelligent Warming Worker Monitoring

**NEW:** Comprehensive observability for IV cache warming system

Scripts:
- `scripts/monitoring/watch-warming.sh [URL]`
  - Live dashboard com atualização a cada 5s
  - Mostra: cache coverage, bandwidth, queue metrics, worker status
- `scripts/monitoring/daily-summary-warming.sh [URL]`
  - Relatório diário completo com recomendações
  - Guardado em `/var/log/alfalyzer/monitoring/warming-summary-YYYY-MM-DD.txt`

API Endpoints:
- `GET /api/monitoring/warming/overview` - Dashboard completo
- `GET /api/monitoring/warming/cache-heatmap?limit=100` - Cobertura por stock
- `GET /api/monitoring/warming/method-coverage` - Cobertura por método (12 métodos (FCFE removed))
- `GET /api/monitoring/warming/real-time` - SSE stream (atualizações 5s)

Métricas Rastreadas:
- **Cache Coverage:** % de 1,493 stocks × 12 métodos (FCFE removed) de valorização cached
- **Cache Hotness:** Hot (<1h), Warm (1-12h), Cold (12-24h), Stale (>24h)
- **Bandwidth:** Uso diário vs budget (682.67 MB/dia = 20 GB/mês)
- **API Calls:** Rastreamento de chamadas FMP (rate limit: 4 req/s)
- **Workers Status:** Health de 4 workers (earnings, warming, price, transcripts)
- **Queue Metrics:** Pending, in-progress, throughput, avg wait time

Alerting Service:
- Auto-monitoring via `WarmingAlertingService`
- Alertas: Bandwidth >85% (WARNING), >95% (CRITICAL)
- Canais: Structured logger, Slack, Discord, Email
- Cooldown: 1 hora entre alertas duplicados

Documentação completa: `docs/WARMING_MONITORING_GUIDE.md`

Uso (local):
```bash
export TARGET_URL=http://localhost:3001
scripts/monitoring/monitor-all.sh

# Warming worker específico
scripts/monitoring/watch-warming.sh
```

Uso (produção):
```bash
export TARGET_URL=https://128.140.45.28.sslip.io
export MARKET_DATA_API_KEY="<sua_api_key>"  # necessário para batch
scripts/monitoring/monitor-all.sh

# Warming worker dashboard
scripts/monitoring/watch-warming.sh https://128.140.45.28.sslip.io
```

Logs:
- Os scripts gravam logs em `/var/log/alfalyzer/monitoring/` sempre que possível.
- Caso sem permissões, usam `scripts/monitoring/logs/` no repositório.

Cron (produção):
- `*/1 4-20 * * 1-5` — job `cache-warmer` (20 tickers core) usando `simpleCacheService.getQuote`
- `*/5 4-20 * * 1-5` — job novo `find-stocks-warm`, aquece 57 tickers dos cartões Find Stocks via `getBatchQuotes` (≈2 chamadas FMP por execução, ~408/dia)
- `*/15 * * * * cd '/home/teste 1' && TARGET_URL=https://128.140.45.28.sslip.io scripts/monitoring/monitor-all.sh >> /var/log/alfalyzer/monitoring/cron.log 2>&1`
- `0 0 * * * cd '/home/teste 1' && scripts/monitoring/daily-summary-warming.sh https://128.140.45.28.sslip.io >> /var/log/alfalyzer/monitoring/daily-summary.log 2>&1` — Daily warming summary

## OPERAÇÃO / ENV (Pacing & TTL)

Parâmetros (podem ser ajustados sem alterar código; defaults mantêm comportamento atual):

- Warming / Pacing
  - `HOT_SET_SIZE` (default: 0 = usa todos)
  - `HOT_SET_REFRESH_SECONDS` (default: 30) — worker de preços
  - `WARM_SET_SIZE` (default: 0 = desativado)
  - `WARM_SET_REFRESH_SECONDS` (default: 0 = desativado)
  - `QUOTES_CALLS_PER_MIN_BUDGET` (default: 0 = desativado) — token bucket por minuto

- TTLs de cache
  - `TTL_QUOTE_SECONDS` (default: 60)
  - `TTL_HISTORICAL_SECONDS` (default: 7200)
  - `TTL_FUNDAMENTALS_SECONDS` (default: 3600)
  - `TTL_PROFILE_SECONDS` (default: 86400)
  - `TTL_MARKET_STATUS_SECONDS` (default: 300)
  - `TTL_DEFAULT_SECONDS` (default: 3600)

Notas:
- Ativar budgets e warm set é opt‑in: definir os ENV acima quando quisermos aplicar segmentação/pacing.
- UNIVERSE_SOURCE (`pg`/`env`): gerir universo via PG (tabela `stocks`) ou fallback por ENV.

## DEPLOY & ROLLBACK

### 🚨 CRITICAL DEPLOYMENT SAFETY RULE (Incident 2025-10-04)

**⚠️ ALWAYS use npm scripts - NEVER run rsync --delete manually!**

```bash
# ✅ CORRECT - Use these npm scripts:
npm run deploy          # Frontend only (build + assets + restart)
npm run deploy:full     # Complete deploy (frontend + backend)
npm run deploy:server   # Backend only
npm run deploy:assets   # Frontend assets only

# ❌ NEVER DO THIS - Will delete backend/frontend:
rsync --delete 'client/dist/public/' root@128.140.45.28:'/home/teste\ 1/dist/'
```

**Why this rule exists:**
- **Incident (2025-10-04):** Manual rsync to wrong path deleted entire `/dist/server/` directory
- **Impact:** Backend crash, all stock prices disappeared (502 errors)
- **Root cause:** `rsync --delete 'client/dist/public/' → '/dist/'` removed everything not in source (including `/dist/server/`)
- **Recovery time:** ~15 minutes (rebuild + redeploy server)

**Safe deployment architecture:**
- `deploy:assets` → deploys ONLY to `/dist/public/` (frontend safe, backend untouched)
- `deploy:server` → deploys ONLY to `/dist/server/` (backend safe, frontend untouched)
- Each script uses `--delete` safely within its own isolated directory

**If you must troubleshoot deployment:**
1. Check `package.json` scripts first
2. Use `npm run deploy:full` for complete deployments
3. Only run manual rsync WITHOUT `--delete` flag for testing
4. Always verify with: `ssh root@128.140.45.28 "ls -lah '/home/teste 1/dist/'"`

---

Comandos principais:
- Deploy frontend: `npm run deploy` (build + assets + restart)
- Deploy completo (frontend + server): `npm run deploy:full`
- Restart PM2: `npm run deploy:restart`
- Rollback (servidor): `scripts/rollback/rollback.sh [ref]`
  - Ex.: `scripts/rollback/rollback.sh HEAD~1` ou `scripts/rollback/rollback.sh <tag>`

Pós‑deploy:
- Verificar health e endpoints com scripts de monitoring (acima)
- Ver logs em `/var/log/alfalyzer/monitoring/cron.log`

### Deployment Troubleshooting (2025‑10‑01)

- Force rsync quando o caminho remoto tem espaço:
  ```bash
  rsync --archive --verbose --delete --checksum --progress \
    dist/server/ root@128.140.45.28:'/home/teste\ 1/dist/server/'
  ```
- Confirmar binário remoto atualizado:
  ```bash
  ssh root@128.140.45.28 "grep -RIn 'MISSING_OR_INVALID_API_KEY' '/home/teste 1/dist/server/index.cjs'"
  ssh root@128.140.45.28 "md5sum '/home/teste 1/dist/server/index.cjs'"
  ```
- Reiniciar com env atualizado (app + worker):
  ```bash
  ssh root@128.140.45.28 "pm2 restart alfalyzer --update-env && pm2 restart price-worker --update-env && pm2 save"
  ```
- Validações de segurança e rate limits:
  ```bash
  # 401 sem key
  curl -i 'https://128.140.45.28.sslip.io/api/market-data/quotes/batch?symbols=AAPL,MSFT'
  # 200 com key
  curl -i -H "X-API-Key: $MARKET_DATA_API_KEY" \
    'https://128.140.45.28.sslip.io/api/market-data/quotes/batch?symbols=AAPL,MSFT'
  # rate limit header=100
  curl -i 'https://128.140.45.28.sslip.io/api/market-data/quote/AAPL' | grep X-RateLimit-Limit
  ```

### ⚠️ Deploy Confiável via tar+scp (2025-10-03)

**Problema**: rsync com `--checksum` às vezes não detecta mudanças em bundles grandes (1.2MB+).

**Solução garantida** (usar quando rsync falhar):
```bash
# 1. Build local
npm run build:server

# 2. Criar tar e enviar
cd dist
tar czf /tmp/server-dist.tar.gz server/
scp /tmp/server-dist.tar.gz root@128.140.45.28:/tmp/

# 3. Extrair no servidor (limpa primeiro)
ssh root@128.140.45.28 'cd "/home/teste 1/dist" && rm -rf server && tar xzf /tmp/server-dist.tar.gz'

# 4. Restart PM2
ssh root@128.140.45.28 "pm2 restart alfalyzer --update-env"

# 5. Validar timestamp
ssh root@128.140.45.28 "ls -lh '/home/teste 1/dist/server/index.cjs'"
# Deve mostrar timestamp de hoje

# 6. Validar código deployado
ssh root@128.140.45.28 "grep -n 'simpleCacheService.getQuote' '/home/teste 1/dist/server/index.cjs' | wc -l"
# Deve retornar > 0 se código novo usar simpleCacheService
```

**Quando usar**: Se rsync reportar "sent 288 bytes" para arquivo de 1.2MB → usar tar+scp.

## HYBRID DB (Phase 9)

- Configuração PG em produção (`.env.production`):
  - `PGHOST=127.0.0.1`
  - `PGPORT=5432`
  - `PGUSER=alfalyzer`
  - `PGPASSWORD=********`
  - `PGDATABASE=alfalyzer_db`
- Verificação de conectividade:
  - Local: `node scripts/monitoring/check-pg.mjs` (usa PG* envs)
  - Servidor: `ssh root@128.140.45.28 "cd '/home/teste 1' && PGHOST=127.0.0.1 PGPORT=5432 PGUSER=... PGPASSWORD=... PGDATABASE=alfalyzer_db node scripts/monitoring/check-pg.mjs"`
- Transcripts Worker: usa PG se `PGHOST` estiver definido; caso contrário, fallback a Supabase Admin.
- Tabela `stocks`: usada para o universo de símbolos; verifique se existe ou crie conforme migrações de dados.

## TRANSCRIPTS WORKER - REATIVADO (2025-10-09)

✅ **STATUS: ACTIVE & EVENT-DRIVEN**

**Configuração produção:**
- Discovery: EVENT-DRIVEN via earnings calendar (TRANSCRIPTS_SOURCE=fmp)
- Intervalo: 1 hora (3600000ms)
- Universo total: 1,493 empresas (914 já têm transcripts cached)
- Janela temporal: 7 dias lookback + 2 dias lookahead
- Hard limit: 100 calls/ciclo (4x margem sobre 25 esperado)

**Event-Driven Strategy (Onda 4):**
1. Calendar lookup: fetchFmpCalendarWindow() → earnings REAIS
2. PostgreSQL check: Skip se transcript já existe
3. Fetch apenas novos: ~5-20 transcripts/dia dependendo earnings
4. Redis queue: lpush para AI summaries automáticas (aiWorkerLoop)
5. Zero desperdício: Não tenta empresas sem earnings
6. Single AI pipeline: DB polling desativado (evita duplicação OpenAI)

**AI Processing (100% Automático):**
- aiWorkerLoop() processa Redis queue via RPOPLPUSH (atomic)
- Retry 3x com exponential backoff (2s, 4s, 8s)
- Dead Letter Queue (DLQ) para falhas permanentes
- Latência típica: 5-15 min após ingestão
- Garantia: 100% processados em 24h (lookback 7 dias)

**Proteções ativas:**
1. Rate limiter: 4 req/s (hard ceiling FMP)
2. Guards pré-fetch: calendar + transcript (defense-in-depth)
3. Early return no ciclo se limit excedido
4. BACKFILL disabled (zero re-fetching histórico)
5. Gzip compression (calendar + transcript fetches)
6. AI pipeline único (processPendingSummaries desativado)

**Bandwidth usage esperado:**
- Normal: ~540 MB/mês (18,000 calls × 30 KB)
- Earnings season spike: até 1 GB/mês
- Cap FMP: 20 GB/mês (margem 97%+ sustentável)
- Primeira medição: 0.26 MB/ciclo (9 calls)

**Primeiro Ciclo Validado (2025-10-09 22:24 UTC):**
- Events encontrados: 9
- Ingested: 0 (todos já em cache ✅)
- API calls: 9 (1 calendar + 8 checks)
- Bandwidth: 0.26 MB
- Status: ✅ OK (bem abaixo de 100 limit)

**Monitorização:**
```bash
# Ver últimos ciclos
pm2 logs transcripts-worker --lines 100 | grep "bandwidth report"

# Validação completa
bash scripts/monitoring/validate-first-cycle.sh
```

**Rollback rápido (se necessário):**
```bash
ssh root@128.140.45.28
nano "/home/teste 1/.env.production"
# Alterar: TRANSCRIPTS_SOURCE=none
pm2 restart transcripts-worker --update-env
```

**Patch aplicado:** 2025-10-09 (Onda 4)
**Validação:** Claude + Codex ✅

## TRANSCRIPTS SYSTEM (Frontend)

### Architecture
- **Storage:** PostgreSQL local (`transcripts` table) - 1,393 transcripts (62MB)
- **Frontend:** React components em `/client/src/pages/` e `/client/src/components/transcripts/`

### Key Components & Routes
- `transcripts.tsx` → `/transcripts` - Lista com search, filters, tabs
- `transcript-detail.tsx` → `/transcript/:id` - Detalhe com 3 tabs:
  - Full Transcript
  - Summary (AI-generated)
  - Key Metrics (via FinancialMetricsDisplay)
- `transcripts-symbol.tsx` → `/transcripts/:symbol` - Por empresa

### Known Issues Fixed
- **2025-10-10:** Missing import `FinancialMetricsDisplay` causava crash em `/transcript/:id`
  - Fix: `import { FinancialMetricsDisplay } from '@/components/transcript/financial-metrics-display';` em `transcript-detail.tsx:26`
  - Deploy: Usar `tar+scp` método se `rsync` falhar com bundles grandes (648KB `index-*.js`)

---

### 📜 Histórico: Incidente Crítico de Bandwidth (2025-10-05)

**Descoberta:** Worker estava fazendo **319,910 API calls/mês** à FMP, consumindo 3.03GB bandwidth (15% do limite mensal total).

**Root Causes Identificados:**
1. **BACKFILL infinito**: Re-fetching todos os transcripts dos últimos 180 dias a cada 30min
2. **Sem PostgreSQL check**: Ignorava dados já em cache, sempre chamava API
3. **4 tentativas por símbolo**: fetchLatestTranscriptForSymbol tentava Q2, Q1, Q4, Q3 sequencialmente

**Impacto:** FMP bandwidth excedido (20.25/20 GB), worker parado desde 2025-10-05 até 2025-10-09.

**Evolução da solução:**
- **Onda 3 (2025-10-05):** PostgreSQL-first strategy + BACKFILL=false
- **Onda 4 (2025-10-09):** Event-driven discovery via earnings calendar
- **Resultado:** 319,910 → 9 calls/ciclo (redução 99.997% ✅)

## SECURITY & RLS (Phase 7)

- Logs: PII redaction habilitado no backend (e-mails/tokens mascarados em `server/lib/logger.ts`).
- RLS: ✅ ATIVO em 9 tabelas Supabase (portfolios, watchlists, profiles, users, alerts). Ver `docs/RLS_CHECKLIST.md` para detalhes.

### Monitorização Contínua (Cron)
- **Frequência:** A cada 15 minutos
- **Logs consolidados:** `/var/log/alfalyzer/monitoring/cron.log`
- **Métricas SLO:** `/var/log/alfalyzer/monitoring/slo-*.log`

Verificar status atual:
```bash
tail -20 /var/log/alfalyzer/monitoring/cron.log
tail -1 /var/log/alfalyzer/monitoring/slo-*.log
```


## PORTS & SERVICES

### Local Development
- **Frontend (Vite):** http://localhost:3000
- **Backend (Express):** http://localhost:3001
- **Redis Cache:** localhost:6379
- **Supabase:** Hosted cloud (not local)

### Production (Hetzner)
- **Public URL:** https://128.140.45.28.sslip.io
- **Nginx:** Port 80/443 (proxies to backend 3001)
- **Backend:** localhost:3001 (internal)
- **Redis:** 127.0.0.1:6379 (password: alfalyzer2025redis)
- **PM2 Process:** alfalyzer

## ARCHITECTURE (UPDATED 2025-09-01)

### Arquitetura Híbrida Viável - €18.78/mês Total
```
┌─────────────────────────────────────────┐
│         1000+ Utilizadores              │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│     NGINX (Hetzner - Port 443/80)       │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│    EXPRESS BACKEND (Hetzner:3001)       │
│    RAM: 200MB                           │
├─────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────────┐ │
│  │Redis Local  │  │PostgreSQL Local  │ │
│  │RAM: 256MB   │  │RAM: 500MB        │ │
│  └─────────────┘  └──────────────────┘ │
│                                         │
│  ┌────────────────────────────────────┐ │
│  │   Supabase Free (Remoto)           │ │
│  │   - Auth (Login/Register)          │ │
│  │   - User Profiles (Leve)           │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**Recursos Confirmados (Hetzner CX22):**
- CPU: 2 vCPUs ✅ Suficiente
- RAM: 4 GB (1.5 GB usado, 2.5 GB livre) ✅
- Disco: 40 GB (5 GB usado, 35 GB livre) ✅
- Capacidade: 1000-2000 users simultâneos

**Data Distribution:**
- **Redis Local**: Cache temporário (preços, news) - TTL 60s a 24h
- **PostgreSQL Local**: Dados pesados (transcripts: 134+, AI analyses) - Database: alfalyzer_db
- **Supabase Free**: Apenas auth + profiles leves (NÃO transcripts)

**Patterns:**
- 3-tier backend: Controllers → Services → Repositories
- API rotation with automatic fallback
- Single Redis cache layer with differentiated TTLs:
  - Quotes: 60s
  - Historical: 2h
  - Financials: 1h
  - Company Profile: 24h
  - Market Status: 5min
- Cache-first strategy with auto-fill on miss
- Shared types in `/shared` directory
- Workers compilados (CJS) para produção:
  - alfalyzer: `dist/server/index.cjs`
  - price-worker: `dist/server/workers/price-worker.cjs`
  - transcripts-worker: `dist/server/workers/transcripts-worker.cjs`

## KEY CONVENTIONS

1. **Routing: Use Wouter, NOT React Router**
   ```typescript
   // ✅ CORRECT
   import { useLocation } from 'wouter';
   
   // ❌ WRONG
   import { useNavigate } from 'react-router-dom';
   ```

2. **Environment Variables Security**
   - `VITE_` prefix = exposed to client (BE CAREFUL!)
   - No prefix = server only (secure)

3. **Supabase RLS**
   - ALL tables MUST have Row Level Security enabled
   - Create policies for user data isolation

4. **API Fallback Order**
   FMP → Alpha Vantage

5. **File Naming**
   - Components: `PascalCase.tsx`
   - Other files: `kebab-case.ts`
   - No default exports

## DEVELOPMENT COMMANDS

```bash
npm install          # Install dependencies
npm run dev          # Start dev server
npm run build        # Production build (frontend)
npm run build:server # Compile server and workers to CJS
npm test             # Run tests
npm run lint         # Lint code
```

## DEPLOYMENT COMMANDS ✅ (SSH Key Configured - No Password!)

```bash
npm run deploy       # Build + Deploy to Hetzner (quick)
npm run ship         # Git commit + push + deploy (complete)
./ship-to-production.sh  # Interactive deploy with custom commit message

# Manual deployment if needed:
scp -r dist/* root@128.140.45.28:"/home/teste 1/dist/"
ssh root@128.140.45.28 "pm2 restart alfalyzer"
```

**SSH Setup Complete**: Passwordless deployment configured on 2025-08-25

## DATABASE SCHEMA

```sql
-- Main tables (simplified)
users (id, email, created_at)
portfolios (id, user_id, name, created_at)
watchlists (id, user_id, name, symbols[])
transcripts (id, ticker, company_name, quarter, year, content, ai_summary)
cache_quotes (symbol, data, expires_at)
```

## API PATTERNS

```typescript
// All endpoints follow REST conventions
GET    /api/stocks/:symbol/quote
GET    /api/portfolios/:id
POST   /api/watchlists
PUT    /api/portfolios/:id
DELETE /api/watchlists/:id

// Standard error response
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "status": 400
}
```

## DON'T DO THIS

1. ❌ Don't use React Router (use Wouter)
2. ❌ Don't expose secrets with VITE_ prefix  
3. ❌ Don't skip RLS on Supabase tables
4. ❌ Don't make uncached API calls
5. ❌ Don't use `any` type in TypeScript
6. ❌ Don't commit .env files
7. ❌ Don't create new auth systems (use Supabase Auth)
8. ❌ Don't use .toFixed() without null checks
   ```typescript
   // ❌ WRONG - Crashes if value is undefined
   price.toFixed(2)
   
   // ✅ CORRECT - Safe with defensive programming
   (price ?? 0).toFixed(2)
   // or
   price ? price.toFixed(2) : '0.00'
   ```

## ETF EXCLUSION POLICY (FASE 2 - 2025-10-29)

**Rule:** Intrinsic value calculations are ONLY for individual stocks, NOT for:
- ETFs (Exchange-Traded Funds)
- Mutual funds
- Closed-end funds (CEFs)
- Index funds

**Why:** ETFs are baskets of stocks and have no intrinsic business value (they track underlying holdings). Valuation methods like DCF, DDM, and PE ratios are meaningless for ETFs.

**Implementation:**
- **Middleware:** `server/middleware/etf-validator.ts` (applies to all IV routes)
- **Returns:** HTTP 422 (Unprocessable Entity) with structured error
- **Detection:** 4-layer strategy:
  1. Suffix detection (`.ETF`, `-ETF`, `.ETP`, `_ETF`)
  2. Known ETF list (140+ popular ETFs: SPY, QQQ, ARKK, etc.)
  3. Company profile type check (FMP API: `type=etf` or `isEtf=true`)
  4. Name pattern matching (provider + indicator combinations)

**Protected Endpoints:**
- `/api/iv/:ticker/chart` - IV chart endpoint
- `/api/iv/:ticker/main` - AlfaValue™ calculation
- `/api/iv/:ticker` - IV chart alias
- `/api/cache/intrinsic-values/:symbol` - Cached IV data
- `/api/cache/iv/:symbol` - Cached IV alias

**Defense-in-Depth:**
- **Layer 1:** Middleware validation (routes)
- **Layer 2:** Controller validation (iv-chart-controller.ts line 63-81)
- **Layer 3:** Service validation (valuation-service.ts line 649-653)

**Known ETFs (Curated List):** 140+ in `server/data/known-etfs.ts`
- Equity: SPY, QQQ, IWM, VTI, VOO, DIA
- Sector: XLF, XLE, XLK, XLV, XLP, XLI, XLU
- Thematic: ARKK, ICLN, TAN, QCLN
- International: EEM, VWO, EFA, IEMG
- Fixed Income: AGG, BND, LQD, TLT
- Commodities: GLD, SLV, USO, DBC

**False Positives:**
If a stock is incorrectly rejected as ETF, add to `STOCK_EXCEPTIONS` in `server/utils/stock-classifier.ts`:

```typescript
const STOCK_EXCEPTIONS = [
  'NFLX', // Netflix (fixed: name contains "flix" not "flix fund")
  // Add more exceptions here if needed
];
```

**Testing:**
```bash
# Test ETF rejection
bash scripts/test-etf-rejection.sh

# Test specific endpoint
curl -i https://128.140.45.28.sslip.io/api/iv/SPY/chart
# Expected: HTTP 422 with error message

# Test valid stock
curl -i https://128.140.45.28.sslip.io/api/iv/AAPL/chart
# Expected: HTTP 200 with IV data
```

**Error Response Format:**
```json
{
  "error": "ETF_NOT_SUPPORTED",
  "message": "SPY is an ETF. Intrinsic value calculations are only available for individual stocks.",
  "reason": "Known ETF list (140+ popular ETFs)",
  "ticker": "SPY",
  "suggestion": "Try analyzing individual stocks within the ETF instead.",
  "alternative_methods": [
    "Price momentum analysis",
    "Relative strength comparison",
    "Expense ratio analysis",
    "Tracking error measurement",
    "Holdings analysis"
  ],
  "documentation": "https://docs.alfalyzer.com/why-no-etf-valuation"
}
```

**Documentation:**
- Middleware: `server/middleware/etf-validator.ts`
- Stock Classifier: `server/utils/stock-classifier.ts`
- Known ETFs List: `server/data/known-etfs.ts`
- Test Script: `scripts/test-etf-rejection.sh`

## KNOWN ISSUES & SOLUTIONS

### ✅ RESOLVED: Prices showing $0.00 (2025-09-07)
**Previous Cause:** Two configuration issues identified and fixed:
1. **Origin Validation**: Regex only accepted HTTP but site uses HTTPS
2. **Missing API Key**: `.env.production` had placeholder instead of real FMP API key

**Solutions Applied:**
1. Fixed regex in `server/middleware/api-security.ts` line 176: `/^https?:\/\/[a-z0-9]*\.?128\.140\.45\.28\.sslip\.io$/`
2. Updated `.env.production` with real FMP API key: `FMP_API_KEY=<YOUR_FMP_API_KEY>`

**Result:** Real-time stock prices now display correctly. System supports 1000+ concurrent users through Redis cache architecture.

### ✅ RESOLVED: Batch endpoint sem autenticação (2025‑10‑01)
**Previous Cause:** Middleware de API key podia ser bypassado — endpoints de batch retornavam 200 sem `X‑API‑Key`.

**Root Cause:** Ausência de defense‑in‑depth nos handlers GET/POST (confiança apenas no middleware/proxy).

**Solutions Applied:**
1) Adicionada verificação explícita de API key em `server/routes/market-data.ts`:
   - GET `/api/market-data/quotes/batch`: valida `X-API-Key`/query antes de processar
   - POST `/api/market-data/quotes/batch`: valida `X-API-Key`/query antes de processar
2) Rate limits normalizados (100/1000/5000) no rate limiter específico de market data
3) Force deploy com checksum para caminho com espaço e validação pós‑deploy (grep + md5sum)

**Result:** Batch agora exige autenticação. GET/POST sem key → 401; com key → 200. Headers mostram `X‑RateLimit‑Limit: 100` em produção.

### Page crashes with .toFixed() error
**Cause:** Calling .toFixed() on undefined values
**Solution:** Always use defensive programming (see DON'T DO THIS #8)

## CRITICAL FILES

- `/client/src/App.tsx` - Main routes (needs navigation fix)
- `/server/routes/market-data.ts` - API endpoints
- `/client/src/hooks/use-realtime-quotes.ts` - WebSocket logic
- `/server/services/simple-cache-service.ts` - Redis cache with differentiated TTLs
- `/server/middleware/api-security.ts` - Origin validation & security

## SERVER ACCESS

```bash
ssh root@128.140.45.28
cd "/home/teste 1/"
pm2 status              # Check all processes
pm2 logs alfalyzer      # API logs
pm2 logs price-worker   # Price worker logs
pm2 logs transcripts-worker # Transcripts worker logs
pm2 restart all         # Restart everything

# Health checks
curl localhost:3001/api/health  # API
curl localhost:3002/health      # Price worker
curl localhost:3003/health      # Transcripts worker
```

## ENVIRONMENT VARIABLES

Production file: `/home/teste 1/.env.production`

Key variables:
- `FMP_API_KEY` - Primary data provider (most important)
- `REDIS_PASSWORD=alfalyzer2025redis`
- Supabase keys configured and working

## TROUBLESHOOTING GUIDE

### Stock Prices Show $0.00
1. **Check FMP API Key**: `ssh root@128.140.45.28 "grep FMP_API_KEY '/home/teste 1/.env.production'"`
2. **Verify Origin Validation**: Check browser console for 403 Forbidden errors
3. **Test Cache Endpoint**: `curl -X POST localhost:3001/api/cache/quotes/batch -H 'Content-Type: application/json' -d '{"symbols":["AAPL"]}'`
4. **Check PM2 Logs**: `ssh root@128.140.45.28 "pm2 logs alfalyzer --lines 20"`

### 403 Forbidden Errors
- **File**: `/server/middleware/api-security.ts` line 176
- **Fix**: Ensure regex accepts HTTPS: `/^https?:\/\/[a-z0-9]*\.?128\.140\.45\.28\.sslip\.io$/`

### API Key Issues
- **Production**: `/home/teste 1/.env.production` must have real API keys
- **Development**: Local `.env` file
- **Restart Required**: `pm2 restart alfalyzer --update-env` after changes

## MONITORIZAÇÃO ATIVA (2025-09-26)

**⚠️ Fase 11 em Progresso - Monitorização de Pacing/Budget**

ENVs ativos em produção:
- `HOT_SET_SIZE=100` (top 100 símbolos sempre quentes)
- `HOT_SET_REFRESH_SECONDS=60` (atualização a cada 60s)
- `QUOTES_CALLS_PER_MIN_BUDGET=180` (limite 180 calls/min)

Próximas verificações:
- **T+24h (2025-09-27):** Primeira análise de métricas
- **T+48h (2025-09-28):** Decisão sobre ativação warm set

**📊 Ver detalhes completos:** [docs/MONITORING_PLAN.md](docs/MONITORING_PLAN.md)

## PRODUCTION STATUS (Updated 2025-10-09)
✅ **WORKING**: Stock prices displaying correctly
✅ **CAPACITY**: Supports 1000+ concurrent users
✅ **ARCHITECTURE**: Redis cache + FMP API integration operational
✅ **MONITORING**: Active pacing control with token bucket
✅ **TRANSCRIPTS**: Event-driven worker active (9 API calls/cycle vs 10,664 previous)

---
Last updated: 2025-10-09
