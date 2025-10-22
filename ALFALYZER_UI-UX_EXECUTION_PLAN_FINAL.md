# Plano de Execução Final UI/UX — Alfalyzer (v2 UTF‑8)

Data: 2025-10-02
Baseado em: Análises completas de Claude (Black‑box) + Codex (White‑box)
Modo: Ultrathink — implementação faseada com validação contínua (local + Hetzner)

Notas: O ficheiro FINAL original contém caracteres fora de UTF‑8. Esta versão v2 consolida e corrige instruções, incluindo os ajustes pedidos (hook de auth correto, rota “/find-stocks”, A11y quick wins adicionais e STOP POINT da Fase 2).

---

## Rating Projetado (evolução)

Estado atual: 4.5/10 (bugs P0 em produção)
Após Fase 1: 7.5/10 (plataforma funcional)
Após Fase 2: 8.5/10 (plataforma profissional)
Após Fase 3: 9.5/10 (arquitetura excelente)

---

## Fase 1 — Correção de Bugs P0 (1–2 semanas)

Objetivo: Remover bloqueadores em produção. Deploy imediato após cada fix (com rollback pronto).
Agente responsável: bug-detective-tdd
Modo: Ultrathink com TDD mínimo (quando aplicável) + validação local e produção.

### Bug #1: $NaN nos índices (omnipresente)
Severidade: P0 crítico
Onde: `client/src/components/layout/top-bar.tsx:45`
Root cause: `convertCurrency(...)` é assíncrono mas usado sem await; o valor passa como Promise → `formatCurrency` gera NaN.
Fix:
- Converter via `useEffect` + estado local (Promise.all) com fallback a valores originais em erro.
- Mostrar loading curto ou “—” até conversão.
Aceitação:
- Zero “$NaN” em qualquer página (desktop/mobile).
- Conversão EUR/USD correta; console sem erros.

### Bug #2: /news crash (Error Boundary)
Severidade: P0 crítico
Onde: `client/src/pages/news.tsx:1`
Root cause: uso de `formatDistanceToNow` sem import.
Fix:
- Adicionar `import { formatDistanceToNow } from 'date-fns'` e `import { pt } from 'date-fns/locale'`; usar `locale: pt`.
Aceitação:
- Página /news carrega sem crash; 5+ artigos; timestamps “há X…” em PT.

### Bug #3: Links GDPR 404 (Terms/Privacy)
Severidade: P0 crítico (compliance)
Onde: `client/src/pages/Register.tsx:308`
Fix:
- Substituir `/terms` → `/terms-of-service` e `/privacy` → `/privacy-policy`.
- Auditar o codebase por outras ocorrências.
Aceitação: Zero 404 para termos/privacidade; leitura disponível antes de aceitar.

### Bug #4: Intrinsic Value (IV) sempre N/A
Severidade: P0 crítico (core)
Onde: `client/src/pages/stock-detail.tsx:1`, `client/src/pages/compare.tsx:1`
Root cause: shape de resposta do endpoint pode variar; normalização insuficiente.
Fix:
- Normalizar múltiplos caminhos possíveis (value, intrinsicValue, dcf.value, dcfValue, fairValue) e logar quando nulo (com símbolo e payload).
- Testar endpoint diretamente (curl) e ajustar server-side se necessário.
Aceitação: IV apresentado para símbolos suportados; quando indisponível, mensagem clara com ação.

### Bug #5: Beta Login → /find-stocks (404)
Severidade: P0 (fluxo bloqueado)
Onde: `client/src/components/layout/Header.tsx:44`, `client/src/App.tsx:1`
Fix (duas opções, escolher uma e documentar):
- A) Adicionar alias explícito em `App.tsx`: `/<Route path="/find-stocks" component={FindStocks} />`.
- B) Trocar destino do botão para rota existente canónica (ex.: `/home` ou `/stocks`).
Aceitação: Clicar “Beta Login” leva à listagem de ações sem 404.

### Bug #6: “Phantom toast” de autenticação e contextos a duplicar
Severidade: P0 (confusão de estado)
Onde: `client/src/contexts/supabase-auth-context.tsx:1`, `client/src/contexts/temp-auth.tsx:1`, header/top-bar
Root cause: toasts no evento `SIGNED_IN` sem gating; uso de `temp-auth` em componentes visuais.
Fix (ajustado):
- Substituir TODOS os usos de `@/contexts/temp-auth` por `useSupabaseAuth` de `@/contexts/supabase-auth-context` (o hook correto é `useSupabaseAuth`, não `useAuth`).
- Só depois de substituir e validar, deprecar `temp-auth.tsx` (não remover antes).
- Introduzir flags em supabase-auth-context: `hasShownWelcomeToast` e `isAuthenticating` para evitar toast prematuro; rever handler de `#access_token&type=recovery` em `client/src/App.tsx:310` para fluxos de recovery.
Aceitação:
- Toast de boas‑vindas apenas após login real; não aparece em navegação anónima.
- Não existem imports de `temp-auth` no codebase.
- Sessão estável entre páginas.

#### Execução (geral Fase 1)
Local:
- `npm run dev` e validação manual dos 6 pontos acima.
Produção (Hetzner):
- `npm run deploy` → validar https://128.140.45.28.sslip.io; `pm2 logs alfalyzer --lines 50` sem erros novos.
Rollback pronto: `scripts/rollback/rollback.sh <ref>`.

#### STOP POINT — Fase 1
Reportar no chat (modelo):
- FASE 1 COMPLETA — Bugs P0 corrigidos (listar 6 itens)
- Ambientes validados (Local/Produção)
- Rating atualizado: 4.5/10 → 7.5/10

---

## Fase 2 — Melhorias de Qualidade e Acessibilidade (2–4 semanas)

Objetivo: Tornar a plataforma profissional — A11y AA, copy PT, consistência visual.
Agentes: ui-ux-specialist + frontend-react-specialist

### Quick Win #1: Skip‑link global (WCAG 2.1 AA)
Onde: `client/src/components/layout/main-layout.tsx:1`
Snippet:
- Adicionar `<a href="#main" className="sr-only focus:not-sr-only ...">Saltar para conteúdo principal</a>` antes do header/sidebar e `id="main"` no `<main>`.
Teste: Tab inicial foca skip‑link; Enter move foco para `<main>`.

### Quick Win #2: Normalizar Microcopy PT/EN
Onde: `client/src/pages/stock-detail.tsx:1`, `client/src/pages/find-stocks.tsx:1`.
- “Back to Find Stocks” → “Voltar à pesquisa” (idealmente `<Link href="/stocks">`).
- Placeholder da pesquisa em PT.

### Quick Win #3: ARIA Labels completos
Onde: ícones/botões no header/top‑bar/menus
- Adicionar `aria-label`/`title` em botões só com ícone (tema, menu, logout, user) e `aria-hidden` quando decorativos.
- Garantir `focus-visible` consistente.
Teste: Navegação por teclado + leitor de ecrã anunciam ações corretamente.

### Quick Win #4: i18n fallback PT por omissão
Onde: `client/src/i18n/index.ts:1`
- `fallbackLng: 'pt'`; garantir `public/locales/pt/common.json` básico.

### Quick Win #5: html lang="pt"
Onde: `client/index.html:1`
- `<html lang="pt">`.

### Quick Win #6: Tap targets ≥44px (mobile)
Onde: `client/src/components/layout/top-bar.tsx:68`, `client/src/components/layout/Header.tsx:164`
- Padronizar `className="h-11 w-11 p-0"` em botões de ícone (tema/menu/user), respeitando guidelines iOS.

### Quick Win #7: Contraste nos botões “ghost” em dark
Onde: `client/src/components/layout/Header.tsx:1`, menus relacionados
- Ajustar para `text-foreground hover:bg-secondary/60 border-border/50` ou usar `teya-green` sólido em CTAs críticos.

### Quick Win #8: Menu mobile acessível (focus‑trap)
Onde: `client/src/components/layout/Header.tsx:1`
- Trocar implementação custom por `Sheet`/`Dialog` do shadcn (Radix) com `aria-modal`, focus‑trap, `Esc` para fechar, e foco inicial no primeiro item.
Teste: Teclado e leitor de ecrã conseguem abrir, navegar e fechar o menu sem “fugas” de foco.

### Quick Win #9: Skeleton loaders consistentes
Onde: listagens iniciais (`find-stocks`, componentes de cards)
- Renderizar 12–15 placeholders estáveis (<100ms) e retirar quando `isLoading=false`.
Teste: Sem “saltos” de layout e sem piscar.

### Quick Win #10: aria‑live para preços em tempo real
Onde: `components/stock/realtime-stock-header-v2.tsx`
- Container do preço com `role="status" aria-live="polite" aria-atomic="true"`; respeitar `prefers-reduced-motion`.

#### STOP POINT — Fase 2 (novo)
Checklist mínimo antes de avançar:
- [ ] html lang=pt
- [ ] fallbackLng=pt
- [ ] Skip‑link funcional
- [ ] Tap targets ≥44px
- [ ] Contraste ghost AA em dark
- [ ] aria‑live em preços
- [ ] Microcopy PT padronizada
Reportar no chat com evidências e rating atualizado: 7.5/10 → 8.5/10.

---

## Fase 3 — Refactors Estruturais (2–3 semanas)

Objetivo: Arquitetura de excelência — navegação unificada, breadcrumbs, landing modular e perceived latency.

### Refactor #1: Landing page modular
Onde: `client/src/pages/landing.tsx:1`
- Criar `client/src/components/landing/*` e quebrar em secções (Hero, Demo, Pricing, etc.).
Benefícios: A/B por secção, manutenção, code‑splitting.

### Refactor #2: Config única de rotas + breadcrumbs
Onde: `client/src/config/routes.ts` e `client/src/App.tsx:1`
- Declarar rotas com metadados (title, breadcrumb, requireAuth) e gerar `<Route>`.
- Canonizar `/stocks` como listagem; manter aliases `/home` e `/insights` como redirects.
- Breadcrumbs simples no `<main>`.

### Refactor #3: Prefetch em hover (perceived latency)
Onde: `components/stock/stock-search.tsx`
- `queryClient.prefetchQuery` ao hover de resultados.

### Refactor #4: Design tokens refinados
Onde: `client/src/index.css:1`, `tailwind.config.ts:1`
- Consolidar escala de espaçamentos e tipografia (tokens CSS) e mapear em Tailwind.
- Estados semânticos (success/warn/error/info) e documentação breve.

#### STOP POINT — Fase 3
Reportar no chat: refactors concluídos, sem regressões, rating 8.5/10 → 9.5/10.

---

## Fase 4 — Sistema de Transcripts Automatizado com AI (2–3 semanas)

Objetivo: Implementar sistema completo de earnings transcripts com histórico de 5 anos, AI analysis automática, e UI com toggle para não overwhelming users.
Agentes: backend-architect + tdd-advocate + ui-ux-specialist
Modo: Ultrathink com validação de bandwidth, testes de automação, e proteções de produção.

**⚠️ VALIDADO POR:** Gemini Pro 2.5 + OpenAI O3 + Codex (aprovação final)

**📝 REVISÃO FINAL (Codex):** Plano simplificado removendo overkills mantendo essencial produção-ready:
- ✅ PostgreSQL-first (Redis só Latest metadata 9MB)
- ✅ Fixes P0: Chunking, cache parsing, schema BE/FE, recovery queue
- ✅ Essencial mantido: Rate limit, retry, DLQ, timeouts, índice SQL
- ❌ Removidos: Sliding TTL, ETag/HTTP caching, budgets Redis, circuit breaker complexo
- **Foco:** Fechar Fase 4 com solução robusta e simples

### Contexto e Requisitos

**Objetivos Principais:**
- ✅ Último transcript disponível para todas as empresas com AI analysis
- ✅ Histórico de 5 anos (máx 20 transcripts/empresa) com toggle UI
- ✅ 100% automatizado (discovery + AI processing + cache invalidation)
- ✅ **PostgreSQL-first; Redis apenas Latest metadata (TTL 7 dias)**
- ✅ **Bandwidth garantido: <200 MB/mês (194MB recorrente, 0.97% de 20GB)** com gzip
- ✅ **Resiliência: Reliable queue + DLQ + Janitor + Recovery no startup**
- ✅ **Custos controlados: $5/dia cap OpenAI com auto-pause**

**Endpoints FMP Legacy (v4) Disponíveis:**
- `/api/v4/earning_call_transcript?symbol=X` → Lista quarters disponíveis
- `/api/v4/batch_earning_call_transcript/X?year=Y` → Fetch batch por ano
- `/api/v3/earning_call_transcript/X?quarter=Q&year=Y` → Individual transcript

**⚠️ FMP Limits:**
- Rate limit: **5 req/s** (usamos 4 req/s para headroom)
- Bandwidth: **20 GB/mês** (usamos 0.97% = 194 MB/mês recorrente)

### Implementação Backend

#### Task #1: Rate Limiter + Gzip (CRÍTICO - Implementar primeiro!)
Onde: `server/lib/rate-limiter.ts` (novo) + todas chamadas FMP

**Token Bucket Pattern:**
```typescript
// server/lib/rate-limiter.ts
export class TokenBucket {
  private tokens: number;
  private readonly capacity: number;
  private readonly refillRate: number; // tokens per second
  private lastRefill: number;

  constructor(capacity = 4, refillRate = 4) {
    this.capacity = capacity;
    this.refillRate = refillRate;
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  async take(count = 1): Promise<void> {
    await this.refill();

    while (this.tokens < count) {
      const waitTime = ((count - this.tokens) / this.refillRate) * 1000;
      await new Promise(resolve => setTimeout(resolve, waitTime));
      await this.refill();
    }

    this.tokens -= count;
  }

  private async refill() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    const tokensToAdd = elapsed * this.refillRate;

    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }
}

// Singleton global
export const fmpRateLimiter = new TokenBucket(4, 4); // 4 req/s
```

**Aplicar a TODAS chamadas FMP:**
```typescript
import { fmpRateLimiter } from '@/lib/rate-limiter';

async function fetchFmpWithProtection(url: string) {
  // Rate limit
  await fmpRateLimiter.take();

  // Fetch com gzip
  const response = await fetch(url, {
    headers: { 'Accept-Encoding': 'gzip' },
    signal: AbortSignal.timeout(10_000) // 10s timeout
  });

  if (!response.ok) {
    throw new Error(`FMP error: ${response.status}`);
  }

  // Track bandwidth
  const bytes = parseInt(response.headers.get('content-length') || '0');
  trackBandwidth(bytes);  // ✅ Uniforme com Task #9

  return await response.json();
}
```

Aceitação:
- Todas chamadas FMP usam rate limiter
- Header `Accept-Encoding: gzip` presente
- Timeout 10s configurado
- Bandwidth tracking ativo

---

#### Task #2: Discovery Job com SHA-256 Dedup (Diário - 3am)
Onde: `server/workers/transcripts-worker.ts`

**Lógica Completa:**
```typescript
import crypto from 'crypto';
import { fmpRateLimiter } from '@/lib/rate-limiter';

async function discoveryJob() {
  const symbols = await getWhitelistSymbols(); // 914 símbolos

  logger.info('Discovery job started', { symbols: symbols.length });

  for (const symbol of symbols) {
    try {
      // 1. Rate limit + gzip
      await fmpRateLimiter.take();
      const transcriptsList = await fetch(
        `/api/v4/earning_call_transcript?symbol=${symbol}`,
        { headers: { 'Accept-Encoding': 'gzip' }}
      ).then(r => r.json());

      // 2. Filtrar últimos 5 anos
      const fiveYearsAgo = new Date().getFullYear() - 5;
      const recentTranscripts = transcriptsList.filter(
        ([q, year]) => year >= fiveYearsAgo
      );

      // 3. Para cada quarter, check PostgreSQL + SHA-256
      for (const [quarter, year, date] of recentTranscripts) {
        const existing = await db.query(
          'SELECT content_hash FROM transcripts WHERE ticker=$1 AND quarter=$2 AND year=$3',
          [symbol, quarter, year]
        );

        // Se não existe OU existe mas precisa verificar se mudou
        if (existing.rows.length === 0 || !existing.rows[0].content_hash) {
          await fetchAndQueueTranscript(symbol, quarter, year);
        }
      }

    } catch (error) {
      logger.error('Discovery failed for symbol', { symbol, error });
    }
  }
}

async function fetchAndQueueTranscript(symbol: string, quarter: number, year: number) {
  // Batch fetch (mais eficiente)
  await fmpRateLimiter.take();
  const batch = await fetch(
    `/api/v4/batch_earning_call_transcript/${symbol}?year=${year}`,
    { headers: { 'Accept-Encoding': 'gzip' }}
  ).then(r => r.json());

  const transcript = batch.find(t => t.quarter === quarter);
  if (!transcript) return;

  // SHA-256 hash para dedup
  const contentHash = crypto
    .createHash('sha256')
    .update(transcript.content)
    .digest('hex');

  // Insert com ON CONFLICT inteligente
  await db.query(`
    INSERT INTO transcripts (
      ticker, quarter, year, content, content_hash,
      call_date, status, created_at, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW(), NOW())
    ON CONFLICT (ticker, quarter, year)
    DO UPDATE SET
      content = EXCLUDED.content,
      content_hash = EXCLUDED.content_hash,
      call_date = EXCLUDED.call_date,
      status = 'pending',        -- Reset para reprocessar
      ai_summary = NULL,          -- Limpar summary antigo se mudou
      updated_at = NOW()
    WHERE transcripts.content_hash IS DISTINCT FROM EXCLUDED.content_hash
  `, [symbol, quarter, year, transcript.content, contentHash, transcript.date]);

  // Push para Redis queue (não DB polling!)
  await redis.lpush('transcript_queue', JSON.stringify({
    id: transcript.id,
    ticker: symbol,
    quarter,
    year,
    queued_at: new Date().toISOString()  // ✅ Necessário para janitor detectar stuck
  }));
}
```

**Bandwidth Realista (com gzip):**
- Discovery listas: 914 × 6KB × 30% (gzip) × 30 dias = 50 MB/mês
- Batch fetch inicial: ~100 MB (1x primeiro mês)
- Poller (100 top): 100 × 6KB × 48x/dia × 30% (gzip) × 30 dias = 144 MB/mês
- **Total primeiro mês: 294 MB** (discovery + batch + poller)
- **Total recorrente: 194 MB/mês** (discovery + poller, sem batch) ✅

Aceitação:
- Job executa em < 10 minutos
- SHA-256 detecta transcripts alterados upstream
- ON CONFLICT evita duplicados
- Redis queue populated (não DB polling)

#### Task #2: New Transcripts Poller (30min - Top 100)
Onde: `server/workers/transcripts-worker.ts`

**Lógica:**
```typescript
// Símbolos prioritários (AAPL, MSFT, GOOGL, AMZN, etc.)
const topSymbols = await getTopSymbols(100);

for (const symbol of topSymbols) {
  // GET /api/v4/earning_call_transcript?symbol=X
  const latest = transcriptsList[0]; // Primeiro item = mais recente

  // Check se é mais novo que o que temos
  const newest = await db.query(
    'SELECT * FROM transcripts WHERE ticker=$1 ORDER BY created_at DESC LIMIT 1',
    [symbol]
  );

  if (isNewer(latest, newest)) {
    await fetchAndStore(symbol, latest.quarter, latest.year);
  }
}
```

**Bandwidth Estimado:**
- 100 symbols × 1KB × 48/dia = 144MB/mês ✅

Aceitação:
- Novos transcripts descobertos em < 30 min
- AI processing automático
- Logs mostram símbolos verificados

#### Task #3: Reliable Queue + DLQ + AI Processing (CRÍTICO - Resiliência)
Onde: `server/workers/transcripts-worker.ts`

**⚠️ Feedback Gemini Pro + O3:** "Usar RPOPLPUSH em vez de BRPOP, adicionar DLQ para poison pills, janitor para recovery, timeouts + retry exponencial"

**Lógica Completa com Proteções:**
```typescript
import { openai } from '@/lib/openai';

// Worker principal - loop infinito resiliente
async function aiWorkerLoop() {
  while (true) {
    try {
      // RPOPLPUSH move atomicamente para processing queue
      const payload = await redis.rpoplpush(
        'transcript_queue',
        'transcript_processing'
      );

      if (!payload) {
        await sleep(5000); // 5s backoff se vazio
        continue;
      }

      const task = JSON.parse(payload);
      await processWithRetry(task);

      // Remove da processing queue após sucesso
      await redis.lrem('transcript_processing', 1, payload);

    } catch (error) {
      logger.error('Worker loop error', { error });
      await sleep(10000); // 10s backoff em erro
    }
  }
}

// Processamento com retry exponencial
async function processWithRetry(task: TranscriptTask, attempt = 1) {
  const MAX_ATTEMPTS = 3;

  try {
    await processTranscript(task);
  } catch (error) {
    if (attempt >= MAX_ATTEMPTS) {
      // Move para Dead Letter Queue
      await redis.lpush('transcript_dlq', JSON.stringify({
        ...task,
        error: error.message,
        failed_at: new Date().toISOString(),
        attempts: attempt
      }));

      logger.error('Task moved to DLQ', { task, error });
      return;
    }

    // Retry com backoff exponencial: 2s, 4s, 8s
    const backoff = Math.pow(2, attempt) * 1000;
    logger.warn(`Retry attempt ${attempt}/${MAX_ATTEMPTS}`, { task, backoff });
    await sleep(backoff);

    await processWithRetry(task, attempt + 1);
  }
}

// Processamento individual com timeout
async function processTranscript(task: TranscriptTask) {
  const { id, ticker, quarter, year } = task;

  // Buscar transcript do PostgreSQL
  const transcript = await db.query(
    'SELECT content FROM transcripts WHERE id=$1',
    [id]
  );

  if (!transcript.rows[0]) {
    throw new Error('Transcript not found in database');
  }

  const content = transcript.rows[0].content;

  // Chunking para transcripts grandes (>100k tokens ~400k chars)
  const chunks = content.length > 400_000
    ? chunkTranscript(content, 350_000)
    : [content];

  let summaries: string[] = [];

  for (const chunk of chunks) {
    // OpenAI call com timeout 60s
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'user',
          content: `Analyze this earnings call transcript and provide:
1. Executive summary (2-3 sentences)
2. Key insights (3-5 bullet points)
3. Financial highlights
4. Risk factors

Transcript for ${ticker} ${quarter} ${year}:
${chunk}`  // ✅ FIX: enviar chunk completo, NÃO .substring(0, 8000)
        }],
        temperature: 0.3,
        max_tokens: 800
      }, { signal: controller.signal });

      summaries.push(response.choices[0].message.content || '');

    } finally {
      clearTimeout(timeout);
    }

    // Rate limit OpenAI: 1 req/s
    await sleep(1000);
  }

  // Merge summaries se houve chunking
  const finalSummary = chunks.length > 1
    ? await mergeSummaries(summaries, ticker, quarter, year)
    : summaries[0];

  // ✅ FIX: Schema ai_summary com keyInsights[] para alinhar BE/FE
  const aiSummaryPayload = {
    summary: finalSummary,
    keyInsights: extractKeyInsights(finalSummary),  // Extrai bullet points
    processedAt: new Date().toISOString()
  };

  // Update PostgreSQL
  await db.query(`
    UPDATE transcripts
    SET
      ai_summary = $1,
      status = 'published',
      published_at = NOW(),
      ai_processed_at = NOW()
    WHERE id = $2
  `, [JSON.stringify(aiSummaryPayload), id]);

  logger.info('Transcript processed', { id, ticker, quarter, year, chunks: chunks.length });
}

// Extrai key insights do summary (bullet points)
function extractKeyInsights(summary: string): string[] {
  const lines = summary.split('\n');
  const insights = lines
    .filter(line => line.trim().match(/^[•\-\*]\s+/))
    .map(line => line.replace(/^[•\-\*]\s+/, '').trim())
    .slice(0, 5);  // Máx 5 insights

  return insights.length > 0 ? insights : [];
}

// Chunking inteligente por parágrafos
function chunkTranscript(content: string, maxChars: number): string[] {
  const paragraphs = content.split('\n\n');
  const chunks: string[] = [];
  let currentChunk = '';

  for (const para of paragraphs) {
    if ((currentChunk + para).length > maxChars) {
      if (currentChunk) chunks.push(currentChunk);
      currentChunk = para;
    } else {
      currentChunk += '\n\n' + para;
    }
  }

  if (currentChunk) chunks.push(currentChunk);
  return chunks;
}

// Merge de summaries chunked
async function mergeSummaries(summaries: string[], ticker: string, quarter: number, year: number): Promise<string> {
  const combined = summaries.join('\n\n---\n\n');

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{
      role: 'user',
      content: `These are summaries of different parts of the same earnings call. Merge them into one cohesive summary:\n\n${combined}`
    }],
    temperature: 0.3,
    max_tokens: 1000
  });

  return response.choices[0].message.content || combined;
}

// Janitor - limpa processing queue de mensagens stuck
async function janitorProcess() {
  setInterval(async () => {
    const stuck = await redis.lrange('transcript_processing', 0, -1);

    for (const payload of stuck) {
      const task = JSON.parse(payload);

      // Se está há mais de 10 minutos, re-enfileira
      const processingTime = Date.now() - new Date(task.queued_at).getTime();
      if (processingTime > 10 * 60 * 1000) {
        await redis.lrem('transcript_processing', 1, payload);
        await redis.lpush('transcript_queue', payload);
        logger.warn('Stuck task re-queued', { task });
      }
    }
  }, 5 * 60 * 1000); // Check a cada 5 minutos
}

// ✅ CRÍTICO: Recovery queue no startup (se Redis crashou)
async function recoverPendingTasks() {
  const pending = await db.query(`
    SELECT id, ticker, quarter, year
    FROM transcripts
    WHERE status='pending'
    AND ai_summary IS NULL
    ORDER BY created_at ASC
  `);

  logger.info('Recovering pending tasks', { count: pending.rows.length });

  for (const task of pending.rows) {
    await redis.lpush('transcript_queue', JSON.stringify({
      id: task.id,
      ticker: task.ticker,
      quarter: task.quarter,
      year: task.year,
      queued_at: new Date().toISOString()  // ✅ FIX: adicionar timestamp
    }));
  }
}

// Start workers
async function startWorkers() {
  await recoverPendingTasks();  // ✅ SEMPRE recover antes de processar
  await Promise.all([
    aiWorkerLoop(),
    janitorProcess()
  ]);
}

startWorkers();
```

**Proteções Implementadas:**
- ✅ RPOPLPUSH (atomic, zero message loss)
- ✅ Dead Letter Queue para poison pills (após 3 tentativas)
- ✅ Janitor para recovery de stuck messages (>10min)
- ✅ **Recovery queue no startup** (re-enfileira pending se Redis crashou)
- ✅ Timeout 60s em OpenAI calls
- ✅ Retry exponencial (2s, 4s, 8s)
- ✅ Map-reduce chunking para transcripts >400k chars (chunk COMPLETO, não substring)
- ✅ Rate limiting OpenAI (1 req/s)
- ✅ Schema ai_summary alinhado BE/FE (summary + keyInsights[])
- ✅ Timestamp queued_at em payloads para janitor

Aceitação:
- Zero message loss durante restart/crash Redis
- DLQ tem < 1% de tasks totais
- Processing latency P95 < 3 minutos
- Stuck messages recuperados em < 10 minutos
- Recovery automático de pending tasks no startup
- Logs mostram retry attempts e DLQ moves

#### Task #4: Cache PostgreSQL-First (Simplificado)
Onde: `server/services/transcript-cache-service.ts`

**⚠️ Estratégia:** Redis APENAS Latest metadata (9MB total), History/Full do PostgreSQL direto

**Memória Redis:**
- Latest metadata: 914 símbolos × 10KB = **9MB** (3.5% de 256MB) ✅
- Sobra para quotes/news/fundamentals: **247MB** (96.5%) ✅

```typescript
class TranscriptCacheService {

  // Latest: Redis cache metadata (SEM content)
  async getLatest(symbol: string) {
    const cacheKey = `transcript:${symbol}:latest`;
    let cached = await redis.get(cacheKey);

    if (cached) return JSON.parse(cached);  // ✅ Parse JSON

    // PostgreSQL: metadados + ai_summary (SEM raw content)
    const dbResult = await db.query(`
      SELECT
        id, ticker, quarter, year, call_date,
        ai_summary,
        published_at
      FROM transcripts
      WHERE ticker=$1 AND status='published'
      ORDER BY year DESC, quarter DESC
      LIMIT 1
    `, [symbol]);

    if (dbResult.rows[0]) {
      // Cache 7 dias (transcripts mudam trimestral)
      await redis.setex(cacheKey, 7 * 86400, JSON.stringify(dbResult.rows[0]));
      return dbResult.rows[0];
    }
  }

  // History: PostgreSQL direto (SEM cache Redis)
  async getHistory(symbol: string, limit = 20) {
    // Latency: 200-300ms (aceitável - user clicou toggle)
    const result = await db.query(`
      SELECT
        id, ticker, quarter, year, call_date,
        ai_summary,
        published_at
      FROM transcripts
      WHERE ticker=$1 AND status='published'
      AND year >= $2
      ORDER BY year DESC, quarter DESC
      LIMIT $3
    `, [symbol, new Date().getFullYear() - 5, limit]);

    return result.rows;
  }

  // Full transcript: PostgreSQL direto
  async getFullTranscript(symbol: string, quarter: number, year: number) {
    // Latency: 300-500ms (aceitável - user clicou "Read Full")
    const result = await db.query(`
      SELECT * FROM transcripts
      WHERE ticker=$1 AND quarter=$2 AND year=$3
    `, [symbol, quarter, year]);

    return result.rows[0];
  }
}
```

**Invalidação ao publicar novo:**
```typescript
// Quando transcript muda status='published'
await redis.del(`transcript:${ticker}:latest`);
```

Aceitação:
- Latest metadata < 50ms (Redis hit)
- History list 200-300ms (PostgreSQL, aceitável)
- Full content 300-500ms (PostgreSQL, aceitável)
- Redis usage < 10MB para transcripts

### Implementação Frontend

#### Task #5: API Routes com Toggle
Onde: `server/routes/transcripts.ts`

```typescript
// Latest only (default)
router.get('/api/transcripts/:symbol', async (req, res) => {
  const { symbol } = req.params;
  const { history } = req.query;

  if (history === 'true') {
    const data = await transcriptCacheService.getHistory(symbol, 20);
    return res.json({ success: true, data });
  }

  const latest = await transcriptCacheService.getLatest(symbol);
  return res.json({ success: true, data: latest });
});
```

Aceitação:
- `/api/transcripts/AAPL` → Último transcript
- `/api/transcripts/AAPL?history=true` → Últimos 5 anos

#### Task #6: UI Component com Toggle
Onde: `client/src/components/transcripts/transcript-section.tsx` (novo)

**Design:**
```tsx
export function TranscriptSection({ symbol }: { symbol: string }) {
  const [showHistory, setShowHistory] = useState(false);
  const { data: latest } = useQuery(['transcript-latest', symbol],
    () => fetchLatestTranscript(symbol)
  );
  const { data: history } = useQuery(
    ['transcript-history', symbol],
    () => fetchTranscriptHistory(symbol),
    { enabled: showHistory }
  );

  return (
    <div className="space-y-4">
      {/* Latest Transcript - Always Expanded */}
      <Card>
        <CardHeader>
          <CardTitle>🆕 Latest Earnings Transcript</CardTitle>
          <p className="text-sm text-muted-foreground">
            {latest?.quarter} {latest?.year} • {formatDate(latest?.date)}
          </p>
        </CardHeader>
        <CardContent>
          {/* AI Summary */}
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">🤖 AI Summary</h4>
              <p className="text-sm">{latest?.ai_summary?.summary}</p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">💡 Key Insights</h4>
              <ul className="list-disc list-inside text-sm space-y-1">
                {latest?.ai_summary?.keyInsights?.map((insight, i) => (
                  <li key={i}>{insight}</li>
                ))}
              </ul>
            </div>

            <Button variant="outline" asChild>
              <Link href={`/transcripts/${symbol}/${latest?.quarter}/${latest?.year}`}>
                Read Full Transcript →
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Historical Transcripts - Collapsible */}
      <Card>
        <CardHeader>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-between text-left"
          >
            <CardTitle>📚 Historical Transcripts</CardTitle>
            <span className="text-sm text-muted-foreground">
              {history?.length || '—'} available
              {showHistory ? ' ▲' : ' ▼'}
            </span>
          </button>
        </CardHeader>

        {showHistory && (
          <CardContent>
            <Accordion type="single" collapsible>
              {history?.map((transcript) => (
                <AccordionItem key={transcript.id} value={transcript.id}>
                  <AccordionTrigger>
                    {transcript.quarter} {transcript.year} • {formatDate(transcript.date)}
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 text-sm">
                      <p>{transcript.ai_summary?.summary}</p>
                      <Button variant="link" asChild>
                        <Link href={`/transcripts/${symbol}/${transcript.quarter}/${transcript.year}`}>
                          Read more →
                        </Link>
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
```

Aceitação:
- Latest transcript sempre visível e expandido
- Historical section colapsada por default
- Toggle funciona sem re-fetch
- Mobile-friendly (tap targets ≥44px)
- Skeleton loaders durante fetch

#### Task #7: Integração em Stock Detail Page
Onde: `client/src/pages/stock-detail.tsx`

```tsx
import { TranscriptSection } from '@/components/transcripts/transcript-section';

// Adicionar tab "Transcripts"
<Tabs>
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="transcripts">Transcripts</TabsTrigger>
    {/* ... outros tabs */}
  </TabsList>

  <TabsContent value="transcripts">
    <TranscriptSection symbol={symbol} />
  </TabsContent>
</Tabs>
```

Aceitação:
- Tab "Transcripts" disponível em todas stock detail pages
- Data carrega apenas quando tab é ativado (lazy)
- Funciona com todos símbolos (graceful degradation se sem transcripts)

### Database & Monitoring

#### Task #8: Índice SQL (Performance Crítica)
Onde: PostgreSQL migrations

```sql
-- ✅ Índice parcial para queries rápidas de published
CREATE INDEX idx_transcripts_ticker_recent
ON transcripts (ticker, year DESC, quarter DESC)
WHERE status='published';

-- Melhoria: 500ms → <50ms em queries Latest/History
```

#### Task #9: Bandwidth Logging (Simples)
Onde: `server/workers/transcripts-worker.ts`

```typescript
// Contador simples de bandwidth diário
let dailyBytes = 0;
let dailyCalls = 0;

async function trackBandwidth(bytes: number) {
  dailyBytes += bytes;
  dailyCalls++;

  // Log diário às 23:59
  logger.info('Daily bandwidth', {
    mb: (dailyBytes / 1024 / 1024).toFixed(2),
    calls: dailyCalls,
    date: new Date().toISOString().split('T')[0]
  });
}

// Reset diário
setInterval(() => {
  dailyBytes = 0;
  dailyCalls = 0;
}, 24 * 60 * 60 * 1000);
```

Aceitação:
- Índice SQL criado e ativo
- Logs diários de bandwidth (MB + calls)
- Queries Latest < 50ms

### Testes e Validação

#### Test #1: Discovery Job
```bash
# Executar job manualmente
TRANSCRIPTS_SOURCE=discovery npm run worker:transcripts

# Verificar logs
grep "Discovery complete" logs/transcripts-*.log

# Validar PostgreSQL
psql -c "SELECT COUNT(*) FROM transcripts WHERE created_at > NOW() - INTERVAL '1 hour';"
```

#### Test #2: AI Processing
```bash
# Verificar pending
psql -c "SELECT COUNT(*) FROM transcripts WHERE status='pending' AND ai_summary IS NULL;"

# Aguardar processing
sleep 120

# Verificar published
psql -c "SELECT COUNT(*) FROM transcripts WHERE status='published' AND ai_summary IS NOT NULL;"
```

#### Test #3: API Endpoints
```bash
# Latest
curl 'https://128.140.45.28.sslip.io/api/transcripts/AAPL' | jq '.data | {quarter, year, has_ai: (.ai_summary != null)}'

# History
curl 'https://128.140.45.28.sslip.io/api/transcripts/AAPL?history=true' | jq '.data | length'
```

#### Test #4: UI Toggle
- Navegação: Stock Detail → Tab Transcripts
- Verificar: Latest expandido
- Click: "Historical Transcripts (X available)"
- Verificar: Accordion expande com histórico
- Verificar: Skeleton loaders durante fetch
- Verificar: Mobile tap targets ≥44px

### Métricas de Sucesso

| Métrica                    | Target        | Medição                          |
|----------------------------|---------------|----------------------------------|
| Transcripts no sistema     | > 10,000      | PostgreSQL count                 |
| Com AI analysis            | 100%          | WHERE ai_summary IS NOT NULL     |
| **Bandwidth mensal (FMP)** | **< 200MB**   | **Logs agregados (calc: 194MB recorrente)** |
| Redis usage (transcripts)  | < 10MB        | INFO memory namespace            |
| Discovery latency          | < 10 min      | Job execution time               |
| AI processing latency P95  | < 3 min       | Pending → Published time         |
| DLQ poison pills           | < 1%          | transcript_dlq / total tasks     |
| PostgreSQL Latest query    | < 50ms        | Logs (com índice)                |
| PostgreSQL History query   | < 300ms       | Logs (sem cache)                 |
| UI loading (Latest)        | < 100ms       | Redis hit                        |
| UI loading (History)       | < 500ms       | PostgreSQL direto                |

### STOP POINT — Fase 4

**⚠️ Validado por Gemini Pro 2.5 + O3 + Codex - Versão SIMPLIFICADA Produção-Ready**

Checklist mínimo antes de avançar:

**Backend - Essencial:**
- [ ] Discovery job executa diariamente às 3am (cron configurado)
- [ ] Poller 30min ativo para top 100 símbolos
- [ ] Rate limiter 4 req/s em todas chamadas FMP
- [ ] Gzip habilitado (Accept-Encoding em fetch)
- [ ] SHA-256 deduplication (ON CONFLICT correto)
- [ ] Reliable queue RPOPLPUSH + DLQ + Janitor
- [ ] **Recovery queue no startup** (re-enfileira pending)
- [ ] Retry exponencial (2s, 4s, 8s)
- [ ] Timeouts (10s FMP, 60s OpenAI)
- [ ] Chunking >400k chars (enviar chunk COMPLETO)
- [ ] Schema ai_summary com keyInsights[] alinhado BE/FE

**Database & Cache:**
- [ ] **Índice SQL criado** (ticker, year DESC, quarter DESC WHERE published)
- [ ] PostgreSQL-first: Latest/History queries <50ms/<300ms
- [ ] Redis Latest metadata APENAS (9MB total)
- [ ] Cache invalidation (DEL ao publicar)
- [ ] PostgreSQL armazena 1.46GB transcripts

**Monitoring Simples:**
- [ ] Bandwidth logging diário (MB + calls)
- [ ] Logs estruturados (info/warn/error)
- [ ] DLQ monitoring < 1% tasks

**Frontend:**
- [ ] API /transcripts/:symbol (latest)
- [ ] API /transcripts/:symbol?history=true
- [ ] UI toggle Latest/History
- [ ] Tab Transcripts em Stock Detail
- [ ] Skeleton loaders

**Testes:**
- [ ] Discovery Job <10min
- [ ] AI processing P95 <3min
- [ ] Latest query <50ms (PostgreSQL com índice)
- [ ] Bandwidth <200MB/mês recorrente
- [ ] Zero erros em produção

Reportar no chat:
- **FASE 4 COMPLETA — Transcripts Automatizado (Versão Simplificada)**
- Métricas: X transcripts, Y% com AI, Z MB bandwidth
- Screenshots: UI /transcripts + Stock Detail tab
- Logs: Bandwidth últimas 24h
- Validação: Codex aprovou versão simplificada ✅
- Rating: 8.5/10

---

## Fase 5 — Validação Final e Documentação (1 semana)

Auditorias (reviews):
- Review #1: Conteúdo e microcopy (PT/EN, consistência de CTAs, mensagens de erro/estado)
- Review #2: Testes de regressão nos fluxos principais (pesquisa→detalhe, comparação, IV, transcripts, watchlists)
- Review #3: Acessibilidade final (WCAG 2.1 AA: foco, semântica, contrastes, teclado)
- Review #4: Performance (LCP < 2.5s, CLS < 0.1, Lighthouse > 90)
- Review #5: Documentação — atualizar `CLAUDE.md` (padrões, A11y, performance, deploy/rollback)

STOP POINT — Fase 4
- Report final com métricas, screenshots e checklist 100%.

---

## Workflow e Regras

- Sequencialidade: Fase N+1 só inicia após aprovação da Fase N.
- Stop Points: obrigatório report no chat após cada fase.
- Validação dual: testar local e produção sempre que aplicável.
- Rollback: manter scripts e referências de commit/tag prontos.
- Logs: documentar decisões e alterações relevantes.

Template de Report (após cada fase):

Título: [FASE X] — [Nome] — COMPLETA
- Implementações realizadas (lista)
- Ambientes validados (Local/Produção)
- Testes executados
- Problemas encontrados (se houver)
- Rating atualizado (antes → depois)
- Screenshots/evidências (links/nomes)
- Próximos passos (aguardar autorização para Fase X+1)

---

## Métricas de Sucesso (exemplo)

| Métrica              | Antes | F1  | F2  | F3  |
|----------------------|-------|-----|-----|-----|
| Bugs P0              | 6     | 0   | 0   | 0   |
| WCAG AA              | ~40%  | 40% | 100%| 100%|
| Conversion Rate      | base  | +15%| +25%| +35%|
| User Satisfaction    | 6.0   | 7.5 | 8.5 | 9.2 |
| Lighthouse (perf)    | 65    | 75  | 85  | 92  |

---

## Suporte e Escalação

Durante a implementação:
- Documentar bloqueios e reportar no chat imediatamente.
- Aguardar orientação antes de workarounds com risco.
- Manter rollback pronto e registos de alterações.

---

Autor: Claude + Codex (consolidado)
Última atualização: 2025-10-02
Status: PRONTO PARA EXECUÇÃO (com STOP POINTS por fase)
