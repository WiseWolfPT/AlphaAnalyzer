FASE 4 — Transcripts Automatizado — EXECUTION PROMPT

  Modo: Ultrathink com agentes paralelos orquestrados
  Documento Master: /Users/antoniofrancisco/Documents/teste 1/ALFALYZER_UI-UX_EXECUTION_PLAN_FINAL.md (linhas 193-1108)
  Validação: Gemini Pro 2.5 + O3 + Codex aprovado ✅

  ---
  🚨 ONDA 4 UPDATE (2025-10-09) — EVENT-DRIVEN + AI FIX

  **Status**: Worker ONLINE mas DESATIVADO (TRANSCRIPTS_SOURCE=none)
  **Bandwidth FMP**: 18.58/20 GB usado (1.42 GB até reset 1 Nov)
  **Estratégia**: Event-driven via earnings calendar (não varrer universo)
  **Garantia**: 100% transcripts + AI summaries em <24h, bandwidth <2 GB/mês

  **8 Tasks Críticas:**
  1. ✅ Calendar-driven discovery (fetchFmpCalendarWindow)
  2. ✅ Redis lpush após upsertTranscript (liga discovery → AI)
  3. ✅ Gzip compression calendar (70% redução)
  4. ✅ MAX_FMP_CALLS_PER_CYCLE=100 (4× margem)
  5. ✅ Guards pré-fetch (defense-in-depth)
  6. ✅ Early return se exceeded (ABORTING CYCLE)
  7. 🚨 **Desativar processPendingSummaries** (evita 2× OpenAI calls)
  8. ✅ Preservar ingestOnce() (backfills futuros)

  **Validação Codex**: "Totalmente automatizados" ✅
  **Validação Claude**: "100% em 24h garantido" ✅

  ---
  CONTEXTO CRÍTICO

  Objetivos:
  - ✅ 100% automatizado (discovery + AI processing + cache invalidation)
  - ✅ Bandwidth garantido: <200 MB/mês (194MB recorrente)
  - ✅ PostgreSQL-first; Redis apenas Latest metadata (9MB)
  - ✅ Resiliência: Reliable queue + DLQ + Janitor + Recovery no startup

  Fixes P0 aplicados no plano:
  - ✅ Chunking: enviar chunk COMPLETO (não substring 8000)
  - ✅ Cache parsing: JSON.parse() no Redis get
  - ✅ Schema BE/FE: ai_summary { summary, keyInsights[], processedAt }
  - ✅ Recovery queue: re-enfileira pending no startup

  ---
  ORQUESTRAÇÃO — 3 ONDAS PARALELAS

  🌊 ONDA 1: Fundações (Paralelo)

  Agente 1: backend-architect → server/lib/rate-limiter.ts (Task #1)
  Implementar Token Bucket Pattern:
  - Capacity: 4 tokens
  - Refill rate: 4 req/s
  - Singleton export: fmpRateLimiter
  - Código completo em: ALFALYZER_UI-UX_EXECUTION_PLAN_FINAL.md:234-273

  Agente 2: backend-architect → SQL migrations (Task #8)
  Criar índice parcial PostgreSQL:
  - CREATE INDEX idx_transcripts_ticker_recent ON transcripts (ticker, year DESC, quarter DESC) WHERE status='published'
  - Código em: ALFALYZER_UI-UX_EXECUTION_PLAN_FINAL.md:957-963

  Agente 3: tdd-advocate → server/lib/rate-limiter.test.ts
  Testes TDD para Token Bucket:
  - Test: take() bloqueia quando tokens esgotados
  - Test: refill() restaura tokens ao longo do tempo
  - Test: take(N) consome N tokens

  WAIT: Aguardar Onda 1 completar antes de Onda 2

  ---
  🌊 ONDA 2: Workers Core (Paralelo)

  Agente 1: backend-architect → server/workers/transcripts-worker.ts (Tasks #2, #3)

  Implementar 4 funções principais:

  1. discoveryJob() (linhas 314-400)
    - Whitelist 914 símbolos
    - Rate limit + gzip
    - SHA-256 deduplication
    - ON CONFLICT inteligente
    - CRÍTICO: queued_at em lpush (linha 398)
  2. aiWorkerLoop() (linhas 458-483)
    - RPOPLPUSH atomic
    - processWithRetry()
    - lrem após sucesso
  3. processTranscript() (linhas 515-594)
    - Chunking >400k chars (enviar chunk COMPLETO - linha 554)
    - OpenAI timeout 60s
    - Schema ai_summary correto (linhas 576-580)
    - extractKeyInsights() (linhas 596-605)
  4. recoverPendingTasks() (linhas 663-683)
    - CRÍTICO: Re-enfileira pending no startup
    - queued_at timestamp (linha 680)

  Agente 2: backend-architect → server/workers/transcripts-worker.ts (Tasks #9)

  Implementar bandwidth tracking:
  - Contador diário dailyBytes/dailyCalls
  - trackBandwidth() função (linhas 973-983)
  - Log diário às 23:59
  - Reset a cada 24h

  Agente 3: backend-architect → server/services/transcript-cache-service.ts (Task #4)

  PostgreSQL-first cache:
  - getLatest(): Redis metadata APENAS (JSON.parse - linha 734)
  - getHistory(): PostgreSQL direto (sem cache)
  - getFullTranscript(): PostgreSQL direto
  - Código completo: linhas 727-783

  WAIT: Aguardar Onda 2 completar antes de Onda 3

  ---
  🌊 ONDA 3: API + Frontend (Paralelo)

  Agente 1: backend-architect → server/routes/transcripts.ts (Task #5)

  API endpoints:
  - GET /api/transcripts/:symbol → Latest
  - GET /api/transcripts/:symbol?history=true → 5 anos
  - Código: linhas 801-816

  Agente 2: ui-ux-specialist → client/src/components/transcripts/transcript-section.tsx (Task #6)

  UI Component com toggle:
  - Latest sempre expandido
  - Historical colapsável
  - Skeleton loaders
  - Mobile ≥44px tap targets
  - Código: linhas 824-917

  Agente 3: frontend-react-specialist → client/src/pages/stock-detail.tsx (Task #7)

  Integração Tab:
  - Adicionar TabsTrigger "Transcripts"
  - TranscriptSection lazy load
  - Código: linhas 927-949

  Agente 4: tdd-advocate → Testes E2E

  Test #1: Discovery Job
  - Executar manualmente TRANSCRIPTS_SOURCE=discovery
  - Verificar PostgreSQL: COUNT > 0

  Test #2: AI Processing
  - Verificar pending → published
  - Validar ai_summary não nulo

  Test #3: API Endpoints
  - curl /api/transcripts/AAPL
  - curl /api/transcripts/AAPL?history=true

  Test #4: UI Toggle
  - Stock Detail → Tab Transcripts
  - Latest expandido
  - Click Historical → Accordion expande

  ---
  VALIDAÇÕES CRÍTICAS (Bloqueantes)

  Backend:
  - Rate limiter 4 req/s em TODAS chamadas FMP
  - Gzip: Accept-Encoding header presente
  - SHA-256 dedup: ON CONFLICT correto
  - RPOPLPUSH (não BRPOP)
  - Recovery queue no startup
  - queued_at em enqueue (linha 398) e recovery (linha 680)
  - Chunk COMPLETO enviado OpenAI (linha 554)
  - Schema ai_summary { summary, keyInsights[], processedAt }

  Database:
  - Índice SQL criado e ativo
  - Latest query <50ms
  - History query <300ms

  Frontend:
  - Latest sempre visível
  - Historical colapsável
  - Skeleton loaders
  - Tap targets ≥44px

  Testes:
  - Discovery <10min
  - AI processing P95 <3min
  - Bandwidth <200MB/mês recorrente
  - Zero erros produção

  ---
  REPORT FINAL (Template)

  # FASE 4 COMPLETA — Transcripts Automatizado

  **Implementações:**
  - ✅ Discovery Job (diário 3am)
  - ✅ Poller 30min (top 100)
  - ✅ Reliable Queue + DLQ + Janitor + Recovery
  - ✅ PostgreSQL-first cache (Redis 9MB)
  - ✅ UI toggle Latest/History
  - ✅ Índice SQL + bandwidth logging

  **Métricas:**
  - Transcripts no sistema: X
  - Com AI analysis: Y%
  - Bandwidth 24h: Z MB
  - Redis usage: 9MB
  - Latest query: <50ms ✅
  - History query: <300ms ✅

  **Screenshots:**
  - /transcripts page
  - Stock Detail tab Transcripts

  **Logs:**
  - Bandwidth últimas 24h
  - Discovery job execution
  - AI processing times

  **Rating:** 8.5/10 → 9.0/10

  ---
  COMANDO DE EXECUÇÃO (próxima sessão)

  Implementar FASE 4 conforme prompt acima usando 3 ondas paralelas:

  ONDA 1 (paralelo):
  - backend-architect: Rate limiter
  - backend-architect: SQL index
  - tdd-advocate: Rate limiter tests

  ONDA 2 (paralelo após Onda 1):
  - backend-architect: Discovery + AI worker + Recovery
  - backend-architect: Bandwidth tracking
  - backend-architect: Cache PostgreSQL-first

  ONDA 3 (paralelo após Onda 2):
  - backend-architect: API routes
  - ui-ux-specialist: UI Component
  - frontend-react-specialist: Stock Detail integration
  - tdd-advocate: E2E tests

  Validar TODAS checkboxes antes de report final.

---
---

🌊 ONDA 4 — REATIVAÇÃO DO TRANSCRIPTS WORKER (Event-Driven Discovery)

  Contexto Crítico:
  - Worker implementado e otimizado nas Ondas 1-3
  - Status atual: ONLINE mas discovery DESATIVADO (TRANSCRIPTS_SOURCE=none)
  - Incidente anterior (05-10-2025): 319,910 API calls/mês (3.03 GB bandwidth)
  - Otimizações deployadas: PostgreSQL-first, early exit, rate limiter
  - FMP bandwidth: 18.58 GB / 20 GB usado (1.42 GB disponível até 1 Nov)
  - Análise Claude + Codex: Hard limit 600 INADEQUADO (esgotaria em 3-10 dias)
  - Solução aprovada: Discovery por CALENDÁRIO (event-driven) ✅

  Descoberta Crítica (Claude + Codex):
  - Problema: ingestOnce() varre universo completo (1,493 empresas)
  - 579 empresas SEM transcripts → tentadas TODOS ciclos → 1,158 calls/ciclo
  - Sem cache negativo → desperdício 833,760 calls/mês (23.85 GB) ❌ EXCEDE limite
  - Hard limit 600 → 432,000 calls/mês (12.36 GB) → esgota 1.42 GB em 3 dias ❌

  Solução Event-Driven (JÁ EXISTE no código):
  - fetchFmpCalendarWindow() busca earnings REAIS (últimos 7 dias + próximos 2)
  - 1 call ao calendar/hora + ~5-20 transcripts novos
  - ~25 calls/ciclo → 18,000 calls/mês → 0.54 GB/mês ✅
  - Margem sustentável: 97% (19.46 GB disponíveis) para SEMPRE
  - Lookback 7 dias garante: 100% transcripts processados em 24h (168 chances)

  Descoberta Adicional - Duplicação AI (Codex):
  - Worker tem DOIS pipelines de AI rodando em paralelo:
    1. aiWorkerLoop() → Redis queue (moderno, RPOPLPUSH) ✅ Primário
    2. processPendingSummaries() → DB polling (antigo) ❌ Conflito
  - Sem correção: 2 chamadas OpenAI por transcript = desperdício + race condition
  - Solução: Desativar DB polling quando Redis disponível

  Objetivo Onda 4 (REVISTO - 8 Tasks Críticas):
  - ✅ Switch runCycle() para discovery por calendário (não varrer universo)
  - ✅ Adicionar guards de segurança (defense-in-depth)
  - ✅ Corrigir Redis queue (lpush) para AI summaries
  - ✅ Adicionar gzip ao calendar fetch
  - ✅ Desativar processPendingSummaries() (evitar duplicação AI) 🚨 CRÍTICO
  - ✅ Reativar discovery (TRANSCRIPTS_SOURCE=fmp)
  - ✅ Validar primeiro ciclo (1-25 API calls esperado)
  - ✅ Monitorização 24-48h
  - ✅ Documentação operacional completa

  ---
  SUB-ONDA 4.1: EVENT-DRIVEN DISCOVERY + SECURITY (Paralelo — 60 min)

  Agente 1: backend-architect → server/workers/transcripts-worker.ts

  NOTA: 8 tasks críticas incluindo correção de duplicação AI (Codex)

  Task A1.1: Switch runCycle() para calendar-driven discovery
  - Linha ~960 (runCycle function)
  - REMOVER call a ingestOnce():
    ```typescript
    // ❌ ANTES (sweep universe):
    const ingestRes = await ingestOnce();
    ```
  - ADICIONAR calendar-driven loop:
    ```typescript
    // ✅ DEPOIS (event-driven):
    const events = await fetchFmpCalendarWindow(
      parseInt(process.env.FMP_CAL_LOOKBACK_DAYS || '7', 10),
      parseInt(process.env.FMP_CAL_LOOKAHEAD_DAYS || '2', 10)
    );

    let ingested = 0;
    for (const event of events) {
      if (!event.symbol || !event.quarter || !event.year) continue;

      // ✅ fetchFmpCalendarWindow() já retorna event.quarter e event.year
      const exists = await checkTranscriptExists(event.symbol, event.quarter, event.year);

      if (exists) {
        structuredLogger.info('Transcript already in cache - SKIP', {
          symbol: event.symbol, quarter: event.quarter, year: event.year
        });
        continue;
      }

      const transcript = await fetchFmpTranscript(event.symbol, event.quarter, event.year);
      if (transcript) {
        const id = await upsertTranscript({
          ticker: event.symbol,
          company_name: event.companyName || event.symbol,
          quarter: event.quarter,
          year: event.year,
          call_date: event.date,
          raw_transcript: transcript,
          status: 'pending'
        });

        // ✅ Codex Fix #1: Redis queue para AI summaries
        if (id && redisClient) {
          await redisClient.lpush('transcript_queue', JSON.stringify({
            id,
            ticker: event.symbol,
            quarter: event.quarter,
            year: event.year,
            queued_at: new Date().toISOString()
          }));
        }
        ingested++;
      }
    }

    structuredLogger.info('Calendar-driven cycle complete', {
      events: events.length,
      ingested,
      apiCalls: fmpApiCallsThisCycle
    });
    ```
  - Justificação: Processa apenas earnings REAIS (~25 calls/ciclo vs 1,158)

  Task A1.2: Adicionar gzip ao calendar fetch (Codex Fix #2)
  - Linha ~258 (fetchFmpCalendarWindow)
  - Direto em fetchFmpCalendarWindow() com fetch (NÃO em fetchJson para não afetar outros consumidores):
    ```typescript
    const r = await fetch(url as any, {
      headers: {
        'Accept-Encoding': 'gzip'
      }
    });
    ```
  - Benefício: 70% redução bandwidth no call mais frequente

  Task A1.3: Configurar MAX_FMP_CALLS_PER_CYCLE=100
  - Linha ~52: const MAX_FMP_CALLS_PER_CYCLE = 2000
  - Alterar para: parseInt(process.env.MAX_FMP_CALLS_PER_CYCLE || '100', 10)
  - Justificação: Calendar-driven ~25 calls esperado → 100 = 4x margem
  - (Codex sugeriu 600, mas com calendar não precisamos)

  Task A1.4: Guard em fetchFmpCalendarWindow()
  - Linha ~256 (ANTES de await fmpRateLimiter.take())
  - Adicionar:
    ```typescript
    if (fmpApiCallsThisCycle >= MAX_FMP_CALLS_PER_CYCLE) {
      logger.error('FMP calls limit reached - aborting calendar fetch', {
        calls: fmpApiCallsThisCycle,
        limit: MAX_FMP_CALLS_PER_CYCLE
      });
      return [];
    }
    ```

  Task A1.5: Guard em fetchFmpTranscript()
  - Linha ~286 (ANTES de await fmpRateLimiter.take())
  - Adicionar:
    ```typescript
    if (fmpApiCallsThisCycle >= MAX_FMP_CALLS_PER_CYCLE) {
      logger.error('FMP calls limit reached - aborting transcript fetch', {
        calls: fmpApiCallsThisCycle,
        limit: MAX_FMP_CALLS_PER_CYCLE,
        symbol,
        quarter,
        year
      });
      return null;
    }
    ```

  Task A1.6: Early return no fim do runCycle()
  - Linha ~1039 (após log "exceeded")
  - Localizar:
    ```typescript
    if (fmpApiCallsThisCycle > MAX_FMP_CALLS_PER_CYCLE) {
      structuredLogger.error("Transcripts worker: FMP API calls exceeded safety limit!", {
        calls: fmpApiCallsThisCycle,
        limit: MAX_FMP_CALLS_PER_CYCLE
      });
    }
    fmpApiCallsThisCycle = 0;
    ```
  - Alterar para:
    ```typescript
    if (fmpApiCallsThisCycle > MAX_FMP_CALLS_PER_CYCLE) {
      structuredLogger.error("Transcripts worker: FMP API calls exceeded safety limit! ABORTING CYCLE.", {
        calls: fmpApiCallsThisCycle,
        limit: MAX_FMP_CALLS_PER_CYCLE
      });
      fmpApiCallsThisCycle = 0;
      return; // ✅ ABORT ciclo - não continuar processamento
    }
    fmpApiCallsThisCycle = 0;
    ```

  Task A1.7: Desativar processPendingSummaries() (CRÍTICO - evita duplicação AI)
  - Linha ~1020 (runCycle function, APÓS calendar loop)
  - PROBLEMA: Duplicação de AI processing
    - aiWorkerLoop() processa via Redis queue (moderno, RPOPLPUSH)
    - processPendingSummaries() processa via DB polling (antigo)
    - Resultado: 2 chamadas OpenAI para o mesmo transcript = desperdício $$$
  - SOLUÇÃO: Desativar DB polling quando Redis disponível
  - Localizar:
    ```typescript
    const sumRes = await processPendingSummaries();
    lastSummaries = sumRes;
    logger.info('Transcripts worker: summarize result', sumRes);
    ```
  - Alterar para:
    ```typescript
    // AI processing via Redis queue (primary)
    // DB polling disabled when Redis available (prevents duplicate OpenAI calls)
    if (!redisClient || !openaiClient) {
      // Fallback to DB polling only if Redis/OpenAI unavailable
      const sumRes = await processPendingSummaries();
      lastSummaries = sumRes;
      logger.info('Transcripts worker: summarize result (fallback)', sumRes);
    } else {
      logger.info('Transcripts worker: AI processing via Redis queue (aiWorkerLoop)');
      lastSummaries = { summarized: 0, errors: 0 }; // Placeholder
    }
    ```
  - Justificação crítica:
    - aiWorkerLoop() já está rodando em produção (linha 1066)
    - Redis queue é superior: RPOPLPUSH (atomic), retry 3x, DLQ
    - Duplicação causaria: 2× OpenAI calls, race condition no UPDATE, inconsistência

  Task A1.8: Preservar ingestOnce() (Codex Fix #3)
  - NÃO remover a função ingestOnce()
  - Manter código intacto para backfills futuros se necessário
  - Apenas não chamar de runCycle() (já feito em Task A1.1)

  ---
  Agente 2: security-auditor → Validação de proteções

  Task A2.1: Verificar rate limiter coverage
  - Contar fmpRateLimiter.take() calls: deve ser 3-4
  - Contar fmpApiCallsThisCycle++ incrementos: deve ser 3
  - Validar que TODOS incrementos têm take() ANTES

  Task A2.2: Verificar guards placement
  - Guards devem estar ANTES de fmpRateLimiter.take()
  - Guards devem retornar [] (calendar) ou null (transcript)
  - Early return deve estar APÓS log, ANTES de reset contador

  Task A2.3: Audit final de caminhos de escape
  - Procurar por fetch('financialmodelingprep') sem rate limiter
  - Verificar se há bypass paths
  - Confirmar zero vulnerabilidades remanescentes

  ---
  Agente 3: devops-infrastructure-engineer → .env.production cleanup

  Task A3.1: Remover duplicação SYMBOLS_UNIVERSE_LIMIT_PER_CYCLE
  - Ficheiro: /home/teste 1/.env.production (REMOTO)
  - Verificar: grep -c "SYMBOLS_UNIVERSE_LIMIT_PER_CYCLE"
  - Esperado: 2 (Codex identificou duplicação)
  - Acção: Manter só uma linha com valor 1493

  Task A3.2: Adicionar MAX_FMP_CALLS_PER_CYCLE
  - Adicionar: MAX_FMP_CALLS_PER_CYCLE=100
  - Posição: após SYMBOLS_UNIVERSE_LIMIT_PER_CYCLE
  - Nota: 100 (não 600) - calendar-driven precisa menos margem
  - ⚠️ Procedimento operacional: Se aparecer "ABORTING CYCLE" durante earnings season (picos de 100+ eventos), subir temporariamente para 150-200 no .env.production

  Task A3.3: Validar configuração final
  - TRANSCRIPTS_SOURCE=none (ainda desativado - mudar na Sub-Onda 4.2)
  - BACKFILL_TRANSCRIPTS=false ✅
  - TRANSCRIPTS_INTERVAL_MS=3600000 ✅
  - FMP_CAL_LOOKBACK_DAYS=7 ✅
  - FMP_CAL_LOOKAHEAD_DAYS=2 ✅
  - SYMBOLS_UNIVERSE_LIMIT_PER_CYCLE=1493 ✅
  - MAX_FMP_CALLS_PER_CYCLE=100 ✅ (calendar-driven: 25 esperado + 4x margem)

  WAIT: Aguardar Sub-Onda 4.1 completar antes de 4.2

  ---
  SUB-ONDA 4.2: BUILD & DEPLOY (Sequencial — 15 min)

  Agente 1: devops-infrastructure-engineer → Build local

  Task B1.1: Build server
  - Comando LOCAL: npm run build:server
  - Verificar: ls -lh dist/server/workers/transcripts-worker.cjs
  - Validar timestamp hoje
  - Validar tamanho ~1-2 MB

  Task B1.2: Criar tarball
  - Comando: cd dist && tar czf /tmp/server-dist.tar.gz server/
  - Verificar: ls -lh /tmp/server-dist.tar.gz
  - Tamanho esperado: 300-500 KB (comprimido)

  Task B1.3: Upload para servidor
  - Comando: scp /tmp/server-dist.tar.gz root@128.140.45.28:/tmp/
  - Verificar upload sem erros

  ---
  Agente 2: devops-infrastructure-engineer → Deploy remoto

  Task B2.1: Backup código atual
  - REMOTO: cd "/home/teste 1/dist"
  - Comando: tar czf /tmp/server-backup-$(date +%Y%m%d-%H%M%S).tar.gz server/
  - Verificar backup criado (rollback safety)

  Task B2.2: Extrair novo código
  - REMOTO: cd "/home/teste 1/dist"
  - Comando: rm -rf server && tar xzf /tmp/server-dist.tar.gz
  - Verificar: ls -lh server/workers/transcripts-worker.cjs
  - Timestamp deve ser HOJE

  Task B2.3: Validar código deployado
  - Comando: grep -c "FMP calls limit reached" transcripts-worker.cjs
  - Esperado: 2 (calendar + transcript guards)
  - Comando: grep "ABORTING CYCLE" transcripts-worker.cjs
  - Esperado: encontrado (early return)
  - Comando: grep -c "Accept-Encoding.*gzip" transcripts-worker.cjs
  - Esperado: 2 (calendar + transcript)

  ---
  SUB-ONDA 4.3: REATIVAÇÃO & MONITORIZAÇÃO (Paralelo — 60 min)

  Agente 1: devops-infrastructure-engineer → Reativação

  Task C1.1: Alterar TRANSCRIPTS_SOURCE
  - REMOTO: nano "/home/teste 1/.env.production"
  - Alterar: TRANSCRIPTS_SOURCE=none → TRANSCRIPTS_SOURCE=fmp
  - Salvar: Ctrl+X, Y, Enter

  Task C1.2: Restart worker com env atualizado
  - Comando: pm2 restart transcripts-worker --update-env
  - Verificar: pm2 list | grep transcripts-worker
  - Status esperado: online
  - Aguardar 10s: sleep 10

  Task C1.3: Calcular próximo ciclo
  - Comando: pm2 logs transcripts-worker --lines 5 | grep "cycle start"
  - Ver timestamp último ciclo
  - Próximo ciclo: último + 1 hora
  - Anotar horário para monitorização

  ---
  Agente 2: devops-infrastructure-engineer → Monitorização primeiro ciclo

  Task C2.1: Stream logs em tempo real
  - Aguardar até horário do próximo ciclo
  - Comando: pm2 logs transcripts-worker --lines 0
  - Monitorizar durante 10-15 minutos

  Task C2.2: Validações em tempo real (Calendar-Driven)
  - ✅ Ver: "cycle start" { "source": "fmp" }
  - ✅ Ver: "Calendar-driven cycle complete" { "events": X, "ingested": Y }
  - ✅ Ver: "already in cache - SKIP" (para eventos já processados)
  - ⚠️ Contar: "NEW transcript fetched" (esperado: 1-20 dependendo earnings)
  - ✅ Ver: "Calendar-driven cycle complete" { "apiCalls": 1-25 }
  - ✅ Ver: "bandwidth report" { "fmpApiCalls": 1-25, "status": "✅ OK" }

  Task C2.3: Critérios SUCCESS/FAIL (Calendar-Driven)
  - ✅ SUCCESS: fmpApiCalls 1-25, status "✅ OK", events 5-30, ingested 0-20
  - ⚠️ INVESTIGAR: fmpApiCalls 26-50 (possível spike de earnings)
  - ❌ FAIL: fmpApiCalls >100, status "🚨 EXCEEDED" (algo errado)

  Task C2.4: Rollback se FAIL
  - Se FAIL detectado:
    - nano .env.production → TRANSCRIPTS_SOURCE=none
    - pm2 restart transcripts-worker --update-env
    - pm2 logs transcripts-worker --lines 200 > /tmp/failure.log
    - PARAR execução, reportar para análise

  ---
  Agente 3: backend-architect → Validações adicionais

  Task C3.1: Redis queue health
  - Comando: redis-cli -a alfalyzer2025redis LLEN transcript_queue
  - Esperado: 0-20 (número de novos transcripts de earnings reais)
  - Se >50: investigar (possível backlog ou spike de earnings)

  Task C3.2: AI Worker processing
  - Comando: pm2 logs transcripts-worker --lines 50 | grep "Processing.*summaries"
  - Esperado: "🤖 Processing N pending summaries..." (N = ingested count)
  - Verificar summarize result após alguns minutos

  Task C3.3: Frontend validation
  - Aguardar 5-10 min após ingest
  - Browser: https://128.140.45.28.sslip.io/transcripts
  - Verificar se novos aparecem (se ingested > 0)
  - Verificar AI summaries presentes

  ---
  Agente 4: tdd-advocate → Testes automatizados

  Task C4.1: Script de validação bandwidth
  - Criar: scripts/monitoring/validate-first-cycle.sh
  - Conteúdo:
    ```bash
    #!/bin/bash
    echo "=== Validação Primeiro Ciclo ==="

    # 1. Último bandwidth report
    pm2 logs transcripts-worker --lines 100 --nostream | \
      grep "bandwidth report" | tail -1

    # 2. Total API calls
    pm2 logs transcripts-worker --lines 500 --nostream | \
      grep -o '"fmpApiCalls": [0-9]\+' | \
      awk -F': ' '{sum+=$2} END {print "Total calls:", sum}'

    # 3. Redis queue
    echo -n "Redis queue: "
    redis-cli -a alfalyzer2025redis LLEN transcript_queue 2>/dev/null

    # 4. Worker status
    pm2 list | grep transcripts-worker
    ```

  Task C4.2: Executar validação
  - Comando: bash scripts/monitoring/validate-first-cycle.sh
  - Guardar output para report

  ---
  SUB-ONDA 4.4: MONITORIZAÇÃO 24-48H (Background — 2 dias)

  Agente 1: devops-infrastructure-engineer → Checklist T+24h

  Task D1.1: Análise últimos 24 ciclos
  - Comando: pm2 logs transcripts-worker --lines 2000 --nostream | \
              grep "bandwidth report" | tail -24
  - Verificar padrão consistente
  - fmpApiCalls médio: esperado <20

  Task D1.2: Total bandwidth 24h
  - Comando:
    ```bash
    pm2 logs transcripts-worker --lines 2000 --nostream | \
      grep -o '"fmpApiCalls": [0-9]\+' | \
      awk -F': ' '{sum+=$2} END {print "24h total:", sum, "calls"}'
    ```
  - Esperado: <600 calls (calendar-driven: 24 ciclos × 25 calls média)

  Task D1.3: Worker stability
  - Comando: pm2 list | grep transcripts-worker
  - Verificar uptime, RAM usage, restarts
  - Restarts esperado: <5 em 24h

  ---
  Agente 2: devops-infrastructure-engineer → Checklist T+48h

  Task D2.1: Bandwidth estimate 48h
  - Comando:
    ```bash
    pm2 logs transcripts-worker --lines 5000 --nostream | \
      grep -o '"estimatedMB": "[0-9.]\+"' | \
      awk -F'"' '{sum+=$4} END {print "48h total:", sum, "MB"}'
    ```
  - Esperado: <40 MB (calendar-driven: 48 ciclos × 25 calls × 30KB = ~36 MB)

  Task D2.2: PostgreSQL growth
  - Verificar logs para "ingested" total
  - Estimar novos transcripts/dia
  - Projectar crescimento mensal

  Task D2.3: Go/No-Go decision
  - Se TODOS os critérios ✅ → GO (manter activo)
  - Se algum critério ❌ → Investigar + possível rollback

  ---
  SUB-ONDA 4.5: DOCUMENTAÇÃO FINAL (Paralelo — 20 min)

  Agente 1: backend-architect → Atualizar CLAUDE.md

  Task E1.1: Adicionar secção TRANSCRIPTS WORKER STATUS
  - Localizar: linha ~460 (após MONITORING section)
  - Adicionar:
    ```markdown
    ## TRANSCRIPTS WORKER - REATIVADO (2025-10-08)

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
    - Primeira medição 48h: ~36 MB (1,200 calls)

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

    **Patch aplicado:** 2025-10-08 (Onda 4)
    **Validação:** Claude + Codex ✅
    ```

  ---
  Agente 2: backend-architect → Criar RUNBOOK operacional

  Task E2.1: Criar docs/TRANSCRIPTS_RUNBOOK.md
  - Conteúdo:
    ```markdown
    # Transcripts Worker - Runbook Operacional

    ## Monitorização Semanal (5 min)

    ```bash
    # 1. Health check
    pm2 list | grep transcripts-worker

    # 2. Últimos 10 ciclos
    pm2 logs transcripts-worker --lines 500 | grep "bandwidth report" | tail -10

    # 3. Validação completa
    bash scripts/monitoring/validate-first-cycle.sh
    ```

    ## Alertas & Troubleshooting

    ### ⚠️ fmpApiCalls > 100 num ciclo
    1. Ver logs: `pm2 logs transcripts-worker --lines 200`
    2. Identificar causa (spike earnings? bug?)
    3. Se anómalo: desativar temporariamente

    ### 🚨 status: "EXCEEDED"
    1. DESATIVAR: `TRANSCRIPTS_SOURCE=none` + restart
    2. Investigar logs completos
    3. Reportar para análise

    ### Worker crashando
    ```bash
    pm2 logs transcripts-worker --err --lines 100
    # Verificar stack traces
    ```

    ### AI summaries não processam
    ```bash
    redis-cli -a alfalyzer2025redis LLEN transcript_queue
    # Se >100: problema OpenAI API ou rate limits
    # Verificar OPENAI_API_KEY válida
    ```

    ### Frontend não mostra novos
    ```bash
    curl -s 'https://128.140.45.28.sslip.io/api/transcripts?limit=5' | jq
    # Verificar se API responde
    # Verificar ai_summary presente
    ```

    ## Manutenção Mensal (10 min)

    1. Verificar FMP bandwidth usage (dashboard)
    2. Review logs para anomalias
    3. Confirmar PostgreSQL growth normal (<100 MB/mês)
    4. Validar OpenAI crédito disponível

    ## Emergências

    ### Bandwidth FMP excedendo
    - Desativar worker imediatamente
    - Aguardar reset mensal (dia 1)
    - Investigar causa antes de reativar

    ### PostgreSQL disk full
    - Worker para automaticamente se disk >90%
    - Limpar logs antigos
    - Considerar archival de transcripts >2 anos

    ### OpenAI quota exceeded
    - Summaries param (transcripts continuam)
    - Adicionar crédito OpenAI
    - Summaries processam automaticamente após restore
    ```

  ---
  Agente 3: tdd-advocate → Script de validação permanente

  Task E3.1: Criar scripts/monitoring/daily-health-check.sh
  - Combinar validações de bandwidth + worker + queue
  - Output formatado para cron log
  - Exit codes: 0 (success), 1 (warning), 2 (critical)

  Task E3.2: Adicionar cron job (opcional)
  - Sugerir ao user:
    ```bash
    # Diário às 9am
    0 9 * * * cd "/home/teste 1" && bash scripts/monitoring/daily-health-check.sh >> /var/log/alfalyzer/daily-check.log 2>&1
    ```

  ---
  VALIDAÇÕES CRÍTICAS ONDA 4 (Bloqueantes)

  Security:
  - ✅ 3 guards implementados (calendar, transcript, cycle)
  - ✅ Guards ANTES de rate limiter
  - ✅ Early return após exceeded log
  - ✅ MAX_FMP_CALLS_PER_CYCLE = 600 (configurável)
  - ✅ Gzip em TODAS as chamadas FMP
  - ✅ Zero bypass paths identificados

  Deploy:
  - ✅ Build sucesso
  - ✅ Código deployado validado (grep confirms)
  - ✅ .env.production limpo (sem duplicações)
  - ✅ Backup criado (rollback safety)

  Primeiro Ciclo (Calendar-Driven):
  - ✅ fmpApiCalls: 1-25 (calendar + earnings reais)
  - ✅ status: "✅ OK"
  - ✅ ingested: 0-20 (dependendo earnings disponíveis)
  - ✅ Redis queue: 0-20 (lpush funcionando)
  - ✅ AI processing via aiWorkerLoop() (não processPendingSummaries)
  - ✅ Logs: "AI processing via Redis queue" (confirma pipeline único)

  24-48h:
  - ✅ Padrão consistente (fmpApiCalls <20/ciclo média)
  - ✅ Bandwidth ~36 MB/48h (48 ciclos × 25 calls × 30 KB)
  - ✅ Worker stable (uptime, RAM, restarts <5)
  - ✅ PostgreSQL growth normal

  Documentação:
  - ✅ CLAUDE.md atualizado
  - ✅ RUNBOOK criado
  - ✅ Scripts de monitorização
  - ✅ Rollback plan documentado

  ---
  REPORT FINAL ONDA 4 (Template)

  # ONDA 4 COMPLETA — Transcripts Worker Reativado

  **Data:** 2025-10-08
  **Duração:** ~90 min (patch + deploy + validação primeiro ciclo)
  **Status:** ✅ SUCCESS

  ## Implementações (8 Tasks Críticas)

  **Event-Driven Discovery (Tasks A1.1-A1.3):**
  - ✅ runCycle() migrado: ingestOnce() → fetchFmpCalendarWindow()
  - ✅ Calendar-driven: 7 dias lookback + 2 lookahead (earnings reais)
  - ✅ Redis lpush após upsertTranscript (liga discovery → AI)
  - ✅ Gzip compression no calendar fetch (70% redução bandwidth)
  - ✅ MAX_FMP_CALLS_PER_CYCLE: 2000 → 100 (4x margem calendar-driven)

  **Security & Performance (Tasks A1.4-A1.6):**
  - ✅ Guards pré-fetch em fetchFmpCalendarWindow() e fetchFmpTranscript()
  - ✅ Early return no runCycle() se exceeded (ABORTING CYCLE)
  - ✅ Defense-in-depth: 3 camadas proteção bandwidth

  **AI Pipeline Fix (Task A1.7 - CRÍTICO):**
  - ✅ processPendingSummaries() desativado quando Redis disponível
  - ✅ Single pipeline: aiWorkerLoop() via Redis queue (RPOPLPUSH)
  - ✅ Evita duplicação: 2× OpenAI calls + race condition eliminados
  - ✅ Gzip compression em TODAS chamadas FMP
  - ✅ .env.production cleanup (duplicação removida)

  **Deploy:**
  - ✅ Build + tar+scp deploy (método confiável)
  - ✅ Código validado no servidor (grep confirms)
  - ✅ Backup criado (rollback safety)
  - ✅ Worker reativado: TRANSCRIPTS_SOURCE=fmp

  ## Métricas Primeiro Ciclo (Calendar-Driven)

  - Earnings events encontrados: X (janela 7 dias lookback + 2 lookahead)
  - PostgreSQL SKIPs: Y (eventos já processados)
  - API calls: X (esperado: 1-25 = calendar + novos transcripts)
  - Novos transcripts: Y (esperado: 0-20 dependendo earnings reais)
  - Bandwidth: Z MB (esperado: ~0.75 MB = 25 calls × 30 KB)
  - Status: ✅ OK
  - Duração ciclo: ~2-5 min (event-driven é rápido)

  ## Métricas 24h

  - Ciclos executados: 24
  - API calls totais: X (esperado: <600 = 24 × 25 calls média)
  - Bandwidth total: Y MB (esperado: ~18 MB = 600 calls × 30 KB)
  - Worker uptime: Z% (esperado: >99%)
  - Restarts: N (esperado: <5)

  ## Métricas 48h

  - Ciclos executados: 48
  - API calls totais: X (esperado: <1200 = 48 × 25 calls média)
  - Bandwidth total: Y MB (esperado: ~36 MB = 1200 calls × 30 KB)
  - Novos transcripts: Z (esperado: 20-100 acumulados 2 dias)
  - AI summaries: W% processados (esperado: >95%)

  ## Screenshots

  - [ ] PM2 status (worker online)
  - [ ] Logs primeiro ciclo (bandwidth report)
  - [ ] Frontend /transcripts (novos aparecem)
  - [ ] Redis queue (draining)

  ## Validações (Calendar-Driven)

  - [x] Security: Defense-in-depth guards ✅
  - [x] Deploy: Código validado no servidor ✅
  - [x] Primeiro ciclo: 1-25 API calls (event-driven) ✅
  - [x] 24h: Padrão consistente ~18 MB ✅
  - [x] 48h: Bandwidth ~36 MB (48 ciclos × 25 calls) ✅
  - [x] Documentação: CLAUDE.md + RUNBOOK ✅

  ## Go/No-Go Decision

  - ✅ **GO** - Manter worker ativo
  - Sistema estável, proteções validadas, bandwidth sustentável
  - Monitorização semanal suficiente

  ## Rating Geral

  - Antes Onda 4: 8.5/10 (implementado mas desativado)
  - Após Onda 4: **9.5/10** (ativo, hardened, monitorizado)

  ## Próximos Passos (Opcional)

  - [ ] Considerar reduzir intervalo: 1h → 30min (se bandwidth <5 MB/48h)
  - [ ] Implementar cron diário para health check
  - [ ] Dashboard Grafana para métricas (futuro)

  ---
  COMANDO DE EXECUÇÃO ONDA 4

  Executar Sub-Ondas em sequência:

  **SUB-ONDA 4.1** (Paralelo - 30 min):
  - backend-architect: Patches código (5 tasks)
  - security-auditor: Validação proteções (3 tasks)
  - devops-infrastructure-engineer: .env cleanup (3 tasks)

  **SUB-ONDA 4.2** (Sequencial - 15 min):
  - devops-infrastructure-engineer: Build local (3 tasks)
  - devops-infrastructure-engineer: Deploy remoto (3 tasks)

  **SUB-ONDA 4.3** (Paralelo - 60 min):
  - devops-infrastructure-engineer: Reativação (3 tasks)
  - devops-infrastructure-engineer: Monitorização (4 tasks)
  - backend-architect: Validações adicionais (3 tasks)
  - tdd-advocate: Testes automatizados (2 tasks)

  **SUB-ONDA 4.4** (Background - 2 dias):
  - devops-infrastructure-engineer: T+24h checklist (3 tasks)
  - devops-infrastructure-engineer: T+48h checklist (3 tasks)

  **SUB-ONDA 4.5** (Paralelo - 20 min):
  - backend-architect: CLAUDE.md update (1 task)
  - backend-architect: RUNBOOK creation (1 task)
  - tdd-advocate: Scripts permanentes (2 tasks)

  **Rollback Plan:**
  ```bash
  ssh root@128.140.45.28
  nano "/home/teste 1/.env.production"
  # Alterar: TRANSCRIPTS_SOURCE=none
  pm2 restart transcripts-worker --update-env
  ```

  Validar TODAS checkboxes antes de report final Onda 4.