# ALFALYZER — Plano de Execução (Cache Unificada, Transcripts, Admin/RBAC, Navegação)

**STATUS GERAL: 91% COMPLETO (11 de 12 fases) - Sistema em Produção**

**✅ FASES COMPLETAS (0-11):**
- ✅ Fase 0: Baseline configurado
- ✅ Fase 1: Cache unificado, strings "Reddit Strategy" removidas
- ✅ Fase 2/2.5: Frontend DX corrigido, exports implementados
- ✅ Fase 3: TTLs diferenciados implementados
- ✅ Fase 4: Transcripts com worker PM2 configurado
- ✅ Fase 5: Admin & RBAC reforçados com auditoria e UI condicionada a permissões
- ✅ Fase 6: Observabilidade, SLOs e monitorização contínua implementados
- ✅ Fase 7: Segurança (PII) e RLS aplicadas/validadas
- ✅ Fase 8: Deploy & Rollback operacionalizados
- ✅ Fase 9: Arquitetura Híbrida (PG+Redis) ativada
- ✅ Fase 10: Parametrização de TTLs e Budgets implementada

**⚠️ FASES EM PROGRESSO:**
- — Nenhuma (Fase 11 concluída em 2025-09-29). Ver [docs/MONITORING_PLAN.md](docs/MONITORING_PLAN.md).

**📅 FASES FUTURAS:**
- 📅 Fase 12: Medição e Afinação (agendada p/ próxima abertura; CRON_TZ=America/New_York)

Documento operacional para executar as próximas alterações no Alfalyzer após validação de estado atual no Hetzner, leitura de `CLAUDE.md` e `ALFALYZER-PRODUCTION-PLAN-2.md`. Este plano é escrito em PT, mantendo termos técnicos em EN.

## Contexto e Fonte
- Documentos consultados: `CLAUDE.md` e `ALFALYZER-PRODUCTION-PLAN-2.md`.
- Verificação no servidor (Hetzner, pm2/ambiente/código) confirma:
  - Quotes (preços) usam `simple-cache-service` (Redis, TTL 60s, deduplicação in-flight) — OK.
  - Endpoints `/api/market-data/quotes/batch` (GET/POST) estão protegidos com `X-API-Key` + rate limit — OK.
  - Ficheiro legado `threeTierCache` ainda existe, mas não é usado pelas rotas de market data — LEGACY a remover em janela futura.
  - `client/src/hooks/use-cache-data.ts` em dev retorna API base `http://localhost:3001` — DX corrigida.
  - Navegação “/charts” ainda referida em alguns pontos — alinhar decisão.
  - Transcripts: rotas públicas e UI existem; worker de ingestão/sumarização ATIVO (ver PM2 `transcripts-worker`).
  - Admin & RBAC: rotas e `AdminRoute` existem; permissões endurecidas e auditoria ativas.

## Garantias: FMP e Arquitetura de Cache
- Com `simple-cache-service` + Redis (TTL 60s), o frontend nunca chama FMP diretamente; o backend atua como “shield”.
- Por símbolo, no máximo 1 chamada ao FMP por janela de TTL. Com 1000 utilizadores, o backend responde de cache, evitando esgotar a quota do FMP.
- Mecanismos de proteção já presentes: deduplicação de pedidos in-flight por símbolo, batch de misses (até 50), rate limit server-side. Opcionalmente, o worker de priming mantém “hot symbols” sempre em cache.

## Objetivos
1) Unificar cache (remover `threeTierCache`/"Reddit Strategy" legados) mantendo SLOs.
2) Corrigir DX e navegação (dev API base, refs de `/charts`).
3) Concluir A4 (Transcripts: ingestão + sumarização) com worker dedicado.
4) Endurecer A5 (Admin & RBAC) com auditoria e rate limit agressivo.
5) Publicar SLOs e scripts de verificação rápida.
6) Atualizar documentação (`CLAUDE.md`/plano) com estado real.

## Fase 0 — Baseline e Freeze (0.5 dia) ✅ COMPLETO
- Tarefas
  - Confirmar limites do FMP (calls/min) e configurar thresholds no rate limiter.
  - Validar `.env.production` (sem expor valores em docs): `FMP_API_KEY`, `MARKET_DATA_API_KEY`, `REDIS_*`, `SUPABASE_*`.
  - Recolher baseline: latência P95 (quotes e batch), taxa de erro 5xx, `cacheSize` Redis, taxa de hit atual se disponível.
- Aceitação
  - Checklist assinado; não alterar runtime nesta fase.

## Fase 1 — Unificação de Cache e Remoção de Legacy (1–1.5 dias) ✅ COMPLETO
- Objetivo: substituir `threeTierCache` por Redis simples; remover “Reddit Strategy” (texto/código) onde não fizer sentido.
- Alterações
  - `server/routes/market-data.ts`
    - `GET /chart/:symbol/:period`: trocar `threeTierCache.get(...)` por cache Redis simples (TTL 2h) com fallback a FMP. Resposta com `{ data, _cached, _source, _timestamp }`.
    - `GET /market-status`: usar Redis simples (TTL 2–5 min); fallback calculado quando miss; remover `threeTierCache`.
    - `POST /cache/invalidate`: invalidar chaves Redis relevantes (`quote:*`, `historical:*`, `fundamentals:*`).
    - `GET /cache/stats`: expor estatísticas do Redis/`simple-cache-service` (não de 3-tier).
  - `server/routes/cache-routes.ts`
    - Atualizar semântica e copy: “cache-first com auto‑fill on miss” (retirar “NEVER triggers API call” onde não for verdade).
    - Uniformizar shape de resposta para `{ quotes: [], _cached, _source, _timestamp }` (ou `{ data, ... }` consistente por tipo).
  - `server/services/socket-io-service.ts`
    - Remover referências a `redditStrategy`. Opcional: emitir eventos quando `simple-cache-service` atualiza quotes (pode ficar off inicialmente — UI já usa polling/React Query).
  - `server/services/simple-cache-service.ts`
    - Adicionar contadores `hit`/`miss` (por símbolo e total). Incluir no retorno de `getCacheStats()`.
  - Priming worker (A2)
    - Validar `server/workers/price-worker.ts`: hotlist de símbolos “quentes”, intervalo de atualização (alvo: 60s) e estabilidade sob carga para manter cache hit >90%.
  - A1 “escopo” para `/api/market-data/quotes/batch`
    - Opcional (recomendado): implementar Scoped API Keys (claims com tier/escopo) OU exigir user auth com `subscription_tier` aplicando rate limit por tier. Atualizar middleware e logs.
  - `server/cache/three-tier-cache.ts`
    - Descontinuar uso em rotas (ficheiro mantém-se para rollback até Fase 6; depois remover).
- Aceitação
  - `rg "threeTierCache"` não encontra referências em rotas de market data.
  - `/api/cache/status` devolve `hit`, `miss`, `cacheSize`, `ttl`, `redisHealth`.
  - Sem regressão de latência P95 e sem novos 5xx nos logs.

## Fase 2 — Frontend DX e Navegação (0.5 dia) ✅ COMPLETO
- Alterações
  - `client/src/hooks/use-cache-data.ts`: `getApiUrl()` em dev deve devolver `http://localhost:3001` (ou documentar/ativar proxy equivalente).
  - Navegação “/charts”:
    - Decisão: manter rota como deep‑link apenas (em `App.tsx`) e remover links residuais (ex.: `client/src/pages/insights.tsx:114`).
  - Validar fix em `client/src/pages/compare.tsx` (programação defensiva com `.toFixed`).
- Aceitação
  - Dev mostra preços sem $0.00; navegação consistente com a decisão; build ok.

## Fase 2.5 — Phase 4 Day 21–24 (Compare Exports + IV Bug) (0.5–1 dia) ✅ COMPLETO
- Objetivo: entregar exports no `/compare` e corrigir bug do Intrinsic Value (mesmo valor em todas as stocks).
- Alterações
  - `client/src/pages/compare.tsx`
    - Export CSV: transformar dados visíveis (colunas/ordem atuais) em CSV, gerar `Blob`, `download` com nome `compare-YYYYMMDD.csv`.
    - Export PDF: opção A (client) com lib light; opção B (server endpoint) para render robusto (recomendado se layout é complexo). Preservar colunas/ordem.
  - Intrinsic Value bug fix
    - Garantir cálculo isolado por símbolo (sem shared state), checks defensivos, e memoização quando aplicável.
    - Verificar `client/src/pages/intrinsic-value.tsx` e/ou serviço de cálculo para variáveis globais/estáticas inadvertidas.
- Aceitação
  - Botões/export presentes no `/compare`, ficheiros exportam com dados corretos.
  - IV apresenta valores distintos por símbolo; sem erros `.toFixed()`; testes manuais com 2–3 símbolos OK.

## Fase 3 — Políticas de TTL e Canonicalização (0.5 dia) ✅ COMPLETO
- Alterações
  - Definir TTLs por tipo (manter no serviço/rotas):
    - Quotes: 60s.
    - Historical (charts): 2h.
    - Financials/Key metrics: 1h.
    - Company profile: 24h.
    - Market status: 2–5 min.
  - Canonicalização de símbolos (BRK.B ↔ BRK‑B):
    - Reaproveitar mapping já usado no batch para manter resposta com símbolo canónico e opcionalmente `requestedSymbol`.
- Aceitação
  - Endpoints devolvem `_cached`, `_source`, `_timestamp` e respeitam TTLs; aliases consistentes.

## Fase 4 — A4 Transcripts: Ingestão + Sumarização (1.5–2 dias) ✅ COMPLETO
- Alterações
  - Worker `transcripts-worker` (PM2):
    - Ingestão periódica de fontes definidas; mapeamento `ticker/company`; normalização para tabela `transcripts`.
    - Limitar tamanho de payload; armazenar `raw_transcript` apenas no servidor (fora do client).
  - Sumarização AI (assíncrona):
    - Usar `server/services/ai/anthropic-service.ts` (ou equivalente). Concurrency 2; retries exponenciais; rate limit.
    - Preencher `ai_summary`; registar estado, timestamps e erros.
  - API pública (já existe):
    - Confirmar paginação em `/api/transcripts`; listas não retornam `raw_transcript`; `GET /api/transcripts/:id` retorna `raw_transcript`.
  - Métricas/Logs: contadores por sessão de ingestão, tempo médio de sumarização, fila pendente.
- Aceitação
  - `pm2` mostra `transcripts-worker` saudável; `ai_summary` preenchido em novos registos; paginação ok; sem PII no `ai_summary`.

## Fase 5 — A5 Admin & RBAC + Auditoria (1 dia) ✅ COMPLETO (validado em produção 2025-09-26)
- Alterações
  - Backend
    - Garantir `requireAdmin()` + `rateLimit` agressivo em `/api/admin/**`.
    - Adicionar logs de auditoria (quem/ação/alvo/timestamp/result) em operações sensíveis.
  - Frontend Admin
    - Assegurar UI mostra/oculta funcionalidades por role/permissions.
    - Gestão de feature flags simples (sem expor segredos em client).
    - Painel para gestão de chaves/limites (Admin): rotação de Scoped API Keys (sem expor segredo raw), ajuste de limites por tier/feature; histórico em logs de auditoria.
  - Segurança
    - Confirmar ordem dos middlewares (CORS, cookies, CSRF) nas rotas admin.
- Aceitação
  - Non‑admin bloqueado; ações admin logadas; sem regressões.
- ✅ Implementado: middleware `requireAdmin` aplicado globalmente, rate limit endurecido (10 req/min), auditoria centralizada via `logAdminAction`, filtros de UI por permissões (nav e páginas de usuários/transcripts) e ações bloqueadas para roles sem acesso.

## Fase 6 — Observabilidade, SLOs e Scripts (0.5 dia) ✅ COMPLETO (2025-09-26)
- Alterações
  - SLOs (documento):
    - P95 latência: quotes < 150ms via cache; batch < 300ms.
    - Erros 5xx < 1%.
    - Cache hit "hot symbols" > 90%.
  - Scripts de verificação rápida:
    - `scripts/check-health.sh` → `GET /api/market-data/health`.
    - `scripts/check-cache.sh` → `GET /api/cache/status`.
    - `scripts/check-batch.sh` → `POST /api/market-data/quotes/batch`.
  - Testes direcionados (mínimos): unit de `simple-cache-service` (hit/miss) e rotas alteradas de TTLs.
- Aceitação
  - SLOs publicados; scripts executam e passam; cobertura mínima nas alterações.
- ✅ Implementado: Scripts de monitorização completos em `/scripts/monitoring/`, SLOs documentados em CLAUDE.md, cron job configurada (*/15) para monitorização contínua, logs em `/var/log/alfalyzer/monitoring/`, métricas atuais: cache hit 93-94%, uptime 100%, P95 ~250ms.

## Fase 7 — Segurança e RLS (A1/A8/A9) (0.5 dia) ✅ COMPLETO (2025-09-26)
- Alterações
  - `CLAUDE.md`:
    - Marcar `/api/market-data/quotes/batch` como protegido (DONE).
    - Documentar arquitetura de cache unificada (Redis simples), TTLs e que o client nunca chama provedores.
  - RLS em Supabase (9 tabelas protegidas)
    - ✅ `portfolios`, `portfolio_positions` (via EXISTS)
    - ✅ `watchlists`, `watchlist_stocks` (via EXISTS)
    - ✅ `profiles`, `users` (read-only)
    - ✅ `price_alerts`, `realtime_alerts`, `user_sessions`
    - Políticas com WITH CHECK explícito para INSERT/UPDATE
    - Aplicado via Supabase Management API
  - Logs sem PII
    - Funções `maskEmail()`, `redactTokens()`, `sanitizePII()` implementadas
- Aceitação
  - ✅ RLS verificado em 9 tabelas (100% cobertura user data)
  - ✅ Anonymous access completamente bloqueado (USING false)
  - ✅ Scripts de verificação: `check-rls.ts`, `check-rls.mjs` (9 tabelas)
  - ✅ Migração versionada: `20250926_rls_policies.sql` com rollback
  - ✅ Docs: CLAUDE.md, RLS_CHECKLIST.md, PHASE_7_MIGRATION_REPORT.md

## Fase 8 — Deploy e Rollback (0.5 dia) ✅ COMPLETO (2025-09-26)
- Alterações
  - Deploy
    - `npm run build`, `pm2 restart alfalyzer --update-env`.
    - Scripts adicionados: `deploy:server`, `deploy:full` (build + assets + server + restart)
    - Iniciar/gerir `price-worker` e `transcripts-worker`.
  - Rollback
    - Script criado: `scripts/rollback/rollback.sh <ref>`
    - Faz backup, git reset --hard, rebuild e restart PM2
- Aceitação
  - ✅ Scripts de deploy funcionais (deploy:full testado)
  - ✅ Script de rollback com backup de segurança
  - ✅ CLAUDE.md com seção DEPLOY & ROLLBACK completa
  - ✅ Site estável; logs limpos; monitorização ativa (cron */15)

## Alterações por Ficheiro (alvo)
- Backend
  - `server/routes/market-data.ts` — historical/market-status/invalidate/stats + TTLs + alias.
    - Rate limits normalizados (free/pro/premium: 100/1000/5000)
    - Defense‑in‑depth no batch: validação explícita de `X‑API‑Key` em GET/POST
  - `server/routes/cache-routes.ts` — semântica “cache-first” + uniformização de resposta.
  - `server/services/simple-cache-service.ts` — contadores `hit/miss` em `getCacheStats()`.
  - `server/services/socket-io-service.ts` — remover `redditStrategy` (opcional: emitir eventos de update de cache).
  - `server/cache/three-tier-cache.ts` — descontinuar (remover numa etapa posterior).
- Frontend
  - `client/src/hooks/use-cache-data.ts` — `getApiUrl()` em dev.
  - `client/src/pages/insights.tsx` — remover navegação “/charts”.
  - `client/src/pages/compare.tsx` — programação defensiva `.toFixed` (confirmar deploy).
  - `client/src/App.tsx` — manter rota de charts apenas como deep‑link.
- Workers
  - `server/workers/transcripts-worker.ts` (novo) + configuração PM2.
- Docs
  - `CLAUDE.md`, `ALFALYZER-PRODUCTION-PLAN-2.md` — atualizar DONE/PARTIAL, TTLs, e remover “Reddit Strategy”.

## Testes/Validação (amostras)
- Cache status
  - `GET /api/cache/status` → `{ cache: { stats: { hit, miss, cacheSize, ttl }, redis: {...} }, timestamp }`.
- Batch quotes (EXIGE `X-API-Key` – ver “Notas de Segurança”)
  - `POST /api/market-data/quotes/batch` body `{ symbols: ["AAPL","MSFT","GOOGL"] }` → `quotes[]` com `_cached: true`, sem `$0.00`. Sem API key → 401.
- Historical
  - `GET /api/market-data/historical-price-full/AAPL` → resposta < 300ms quando em cache; TTL ~2h.
- Transcripts
  - `GET /api/transcripts` paginado (sem `raw_transcript`);
  - `GET /api/transcripts/:id` inclui `raw_transcript` e incrementa `view_count`.
- Admin
  - `GET /api/admin/auth/check` recusa non‑admin; ações sensíveis registadas em logs de auditoria.

## SLOs Propostos
- P95 latência: quotes < 150ms via cache; batch < 300ms.
- Erros 5xx < 1%.
- Cache hit “hot symbols” > 90%.

## Checklists Rápidos
- Antes do deploy
  - `.env.production` válido (sem expor valores em commits/docs).
  - `pm2 status` saudável; logs sem 5xx frequentes.
- Pós‑deploy
  - `pm2 restart alfalyzer --update-env`.
  - Verificar `price-worker`/`transcripts-worker`.
  - Correr scripts de verificação.
  - Segurança (batch):
    - GET /api/market-data/quotes/batch sem key → 401
    - GET /api/market-data/quotes/batch com key → 200
    - POST /api/market-data/quotes/batch sem key → 401
    - POST /api/market-data/quotes/batch com key → 200

## Rollback
- Manter tag/branch anterior pronto.
- `rollback.sh`: `git checkout <tag> && npm ci && npm run build && pm2 restart alfalyzer --update-env`.

## Notas de Segurança
- Não expor segredos no client (`VITE_` apenas para valores públicos). Segredos só no servidor.
- `X-API-Key` obrigatório em endpoints públicos sensíveis. Observação: foi identificado bypass no `GET /api/market-data/quotes/batch` (200 sem header). Medidas aplicadas:
  - Reforço “defense-in-depth” no handler (`GET` e `POST`) para validar explicitamente a key.
  - Reversão de rate limits temporários para valores normais por tier.
  - Auditoria Nginx concluída (não injeta segredo por defeito). Caso continue comportamento anómalo, revalidar após deploy.
- RLS ativada em todas as tabelas; logs sem PII.

## Atualizações de Métricas/Estado (2025‑10‑01)
- Transcripts em PG: 984 registos (antes: 134 em snapshot antigo)
- Universo de stocks em PG: 1493 símbolos
- P95 observado em janela 1h: ~800ms (picos de batch até ~3.9s em janelas anteriores). Acompanhamento em curso na Fase 12.

## Glossário
- `simple-cache-service`: camada única Redis para quotes (TTL 60s), com deduplicação de pedidos in-flight e fallback a FMP em miss; suporta batch até 50 símbolos.
- `threeTierCache` (LEGACY): estratégia de 3 camadas (Memory → Redis → Supabase) que nunca chama provedores em request path, dependendo de cron/worker. Substituída para quotes; remover para restantes dados conforme este plano.
- “Reddit Strategy”: nomenclatura antiga para a política “users never trigger API calls”. Atualmente substituída por “cache-first com auto‑fill on miss” (quotes) e, opcionalmente, por um worker de priming para hot symbols.

---

Se esta conversa for limpa, seguir este plano fase a fase. Começar pela Fase 0; depois avançar para a Fase 1 (unificação de cache) com alterações cirúrgicas nos ficheiros listados e testes/validação descritos.

## Fase 9 — Phase 17 (Hybrid Architecture: PostgreSQL + Redis) — Pilot (1–2 dias) ✅ COMPLETO (2025-09-26)
- Objetivo: alinhar com o plano de produção (“Hybrid Architecture”) de forma incremental, começando por dados pesados (Transcripts) e mantendo Supabase para Auth/Profiles.
- Alterações
  - Provisionar PostgreSQL local (Hetzner), criar DB/roles, configurar `.env.production` (`PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`).
  - Criar camada de repositórios (Node `pg`/`postgres`) para `transcripts` (CRUD + índices), mantendo Redis como cache.
  - Migrar ingestão/sumarização de transcripts para PG local; Supabase continua para Auth/Profiles.
  - Migrações SQL (schema/índices) e migração de dados (se existente), com plano de rollback.
  - Monitorizar latência/custos; apenas após sucesso estender a outras tabelas.
- Aceitação
  - Transcripts a ler/gravar no Postgres local; Auth/Profiles no Supabase.
  - `.env.production` atualizado com `PG*`; password do user PG rotacionada com script seguro; PM2 reiniciado.
  - Tabela `transcripts` confirmada (≥984 registos; ver “Atualizações de Métricas/Estado (2025‑10‑01)”) e `stocks` criada com seed inicial (≥10 símbolos).
  - Script de verificação PG instalado (local e servidor) e executado com sucesso.
  - SLOs mantidos; rollback documentado e testado.

  - Governança do seed (stocks)
    - Seed inicial feito (≥10). Expansão futura: 100–200 (curado/CSV) sem warming agressivo; até 500 conforme métricas.
    - `UNIVERSE_SOURCE=pg` quando quisermos gerir universo pelo PG; fallback por `env` mantém‑se.

## Fase 10 — Parametrização de Budgets e Warming (0.5 dia) ✅ COMPLETO (2025-09-26)
- Objetivo: expor e documentar parâmetros operacionais para controlar ritmo de refresh e TTLs sem alterar código.
- Parâmetros (ENV sugeridos; sem aplicar agora):
  - `HOT_SET_SIZE=100`
  - `HOT_SET_REFRESH_SECONDS=60`
  - `WARM_SET_SIZE=500`
  - `WARM_SET_REFRESH_SECONDS=600` (10 min)
  - `QUOTES_CALLS_PER_MIN_BUDGET=180`
  - `HEAVY_CALLS_PER_MIN_BUDGET=30` (fundamentals/historical/profile)
  - `TTL_QUOTE_SECONDS=60`
  - `TTL_FUNDAMENTALS_SECONDS=3600` (1h)
  - `TTL_HISTORICAL_SECONDS=7200` (2h)
  - `TTL_PROFILE_SECONDS=86400` (24h)
- Tarefas
  - Documentar os ENV acima (CLAUDE.md / docs/ops) e onde serão lidos.
  - Confirmar UNIVERSE_SOURCE (`pg` vs `env`) — sem aplicar.
  - Não alterar lógica existente; apenas preparar a parametrização.
  - Governança do seed: planear expansão (10 → 100–200) sem aquecer todos; critérios por métricas (unique symbols/min, calls/min, hit/latência).
- Aceitação
  - ENV listados e documentados; equipa alinhada com os valores alvo.

## Fase 11 — Pacing e Segmentação (Hot/Warm/Tail) (1 dia) ✅ CONCLUÍDO (2025-09-29)
- Objetivo: garantir que o worker respeita budgets por minuto e separa hot/warm/tail por intervalos distintos.
- Tarefas
  - Verificar se o price-worker já implementa warming com cadência configurável. ✅
  - Se necessário, adicionar: token bucket simples para quotes (`QUOTES_CALLS_PER_MIN_BUDGET`) e um round‑robin para o warm set lendo `WARM_SET_*`. ✅
  - Manter long tail "on demand" com TTLs longos — sem warming. ✅
  - Backoff em 429 e fallback AV já existentes: validar integração com o bucket. ✅
- Status Final
  - **ATIVO em produção:** HOT_SET_SIZE=100, HOT_SET_REFRESH_SECONDS=60, QUOTES_CALLS_PER_MIN_BUDGET=180
  - **WARM ATIVO:** WARM_SET_SIZE=1000, WARM_SET_REFRESH_SECONDS=600; TTL_HOT_SECONDS=60; TTL_WARM_SECONDS=600 (worker)
  - Nginx otimizado com upstream keepalive (HTTP/2) e health leve disponível em `/api/health/light`
  - CRON_TZ=America/New_York ativo no crontab (track-1h às 09:30/16:00 ET)
  - Node HTTP alinhado: `keepAliveTimeout=65s`, `headersTimeout=66s`
  - Universe workers `universe-weekly`/`universe-light`: STOPPED (não crítico)
  - **Monitorização:** série 24h em curso (logs em `scripts/monitoring/logs/`)
- Aceitação
  - Orçamentos respeitados; hot ~60s; warm ~10 min; tail on‑demand
  - Cache Hit ≥ 90% (observado ~95%)
  - P95 público reduzido vs baseline (540ms → ~137ms após estabilização com keepalive/HTTP2); continuar a monitorizar 24h

## Fase 12 — Medição e Afinação (0.5 dia)
- Objetivo: medir 24–48h e afinar sem risco.
- Status: Agendado para 24h a partir da próxima abertura (CRON_TZ=America/New_York; track‑1h às 09:30/16:00 ET; monitor‑all */15).
- Métricas a recolher
  - `unique_symbols_per_minute`
  - `provider_calls_per_minute` (FMP/AV)
  - `cache_hit_rate` e latência (P95)
  - `swap_usage_trend` (free -h, swapon --show)
- Regras de ajuste
  - Se `calls/min > 220` por 5 min: reduzir `HOT_SET_SIZE` ou aumentar `WARM_SET_REFRESH_SECONDS`.
  - Se `hit < 70%` com latência a subir: aumentar `HOT_SET_SIZE` ou reduzir `HOT_SET_REFRESH_SECONDS`.
- Aceitação
  - Report de 24–48h com decisões de tuning (mesmo que “manter”).
  - Reavaliar amplitude do seed com base em métricas e decidir expansão gradual (até 500) com pacing/TTL.

## Tech Debt (não crítico)
- Duplicação de rota `/search` em `server/routes/market-data.ts` (2 ocorrências). Unificar numa única implementação futura.

## Agenda & Entregáveis (Fase 12)
- T+24h — Relatório de monitorização (2025‑10‑02 ~16:00 UTC)
  - Conteúdo:
    - Resumo executivo (ESTÁVEL/INSTÁVEL/DEGRADADO)
    - Tabela comparativa antes/depois (P95 batch e geral, hit rate, restarts, swap)
    - Eventos críticos (spikes > 2000ms, erros 5xx, 429/backoff)
    - Tendências (latência, estabilidade do worker, eficiência de cache)
    - Recomendações data‑driven (ajustar HOT_SET_SIZE/budgets/TTLs ou manter)
  - Métricas/Fonte:
    - `pm2 status | grep price-worker` (restarts)
    - `scripts/monitoring/track-1h.sh` (lat_batch_ms, P95)
    - `/var/log/alfalyzer/monitoring/cron.log` (hit rate)
    - `curl -s https://128.140.45.28.sslip.io/api/cache/status` (cache stats)
    - `free -h` e `swapon --show` (swap usage trend)
- T+48h — Decisão de tuning (2025‑10‑03 ~16:00 UTC)
  - Aplicar ajustes (se necessários) com base no relatório T+24h
  - Atualizar este documento com decisões e novos alvos

Nota: Caso a conversa seja limpa, usar esta secção como lembrete operacional para a entrega dos relatórios da Fase 12.
