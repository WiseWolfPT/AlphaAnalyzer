/**
 * TRANSCRIPTS WORKER - Onda 2 Core Implementation
 *
 * Implements:
 * - discoveryJob() - Fetch transcripts with FMP rate limiting
 * - aiWorkerLoop() - Process transcripts queue with RPOPLPUSH
 * - processTranscript() - OpenAI chunking + ai_summary generation
 * - recoverPendingTasks() - Recovery queue on startup
 *
 * CRITICAL PROTECTIONS:
 * - fmpRateLimiter.take() before EVERY FMP API call
 * - gzip headers for bandwidth optimization
 * - RPOPLPUSH (atomic, NOT BRPOP)
 * - Complete chunks to OpenAI (NOT substring)
 * - queued_at timestamp for janitor detection
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { supabaseAdmin } from '../lib/supabase-admin';
import { TranscriptService } from '../services/transcript-service';
import crypto from 'crypto';
import { mockTranscripts } from '../db/transcript-schema';
import { structuredLogger as logger } from '../services/structured-logger';
import { fmpRateLimiter } from '../lib/rate-limiter';
import Redis from 'ioredis';
import OpenAI from 'openai';

// Load environment
const envPath = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
config({ path: resolve(process.cwd(), envPath) });

type IngestSource = 'fmp' | 'local:mock' | 'none';
type UniverseSource = 'env' | 'pg';

const INGEST_SOURCE: IngestSource = (process.env.TRANSCRIPTS_SOURCE as IngestSource) || 'fmp';
const RUN_INTERVAL_MS = parseInt(process.env.TRANSCRIPTS_INTERVAL_MS || '1800000', 10); // 30 min default
const SUMMARY_CONCURRENCY = 2; // As per plan
const MAX_SUMMARIES_PER_CYCLE = parseInt(process.env.OPENAI_SUMMARY_MAX_PER_CYCLE || '25', 10);

// Backfill / calendar windows
const BACKFILL_TRANSCRIPTS = process.env.BACKFILL_TRANSCRIPTS === 'true';
const BACKFILL_DAYS = parseInt(process.env.BACKFILL_DAYS || '180', 10);
const CAL_LOOKBACK_DAYS = parseInt(process.env.FMP_CAL_LOOKBACK_DAYS || '7', 10);
const CAL_LOOKAHEAD_DAYS = parseInt(process.env.FMP_CAL_LOOKAHEAD_DAYS || '2', 10);

// Universe source and limits
const UNIVERSE_SOURCE: UniverseSource = ((process.env.SYMBOLS_UNIVERSE_SOURCE as UniverseSource) || (process.env.SYMBOLS_UNIVERSE === 'PG' ? 'pg' : 'env'));
const UNIVERSE_LIMIT_PER_CYCLE = parseInt(process.env.SYMBOLS_UNIVERSE_LIMIT_PER_CYCLE || '250', 10);

// Bandwidth monitoring (per-cycle tracking)
let fmpApiCallsThisCycle = 0;
const MAX_FMP_CALLS_PER_CYCLE = parseInt(process.env.MAX_FMP_CALLS_PER_CYCLE || '100', 10);

// Daily bandwidth counters (simple in-memory tracking)
let dailyBytes = 0;
let dailyCalls = 0;

async function trackBandwidth(bytes: number) {
  dailyBytes += bytes;
  dailyCalls++;

  // Log incremental (debug level - não poluir logs)
  logger.debug('Bandwidth tracked', {
    mb: (dailyBytes / 1024 / 1024).toFixed(2),
    calls: dailyCalls,
    date: new Date().toISOString().split('T')[0]
  });
}

// Reset diário (24h interval)
setInterval(() => {
  logger.info('Daily bandwidth reset', {
    finalMb: (dailyBytes / 1024 / 1024).toFixed(2),
    finalCalls: dailyCalls,
    date: new Date().toISOString().split('T')[0]
  });
  dailyBytes = 0;
  dailyCalls = 0;
}, 24 * 60 * 60 * 1000);

// From env list (fallback)
const ENV_UNIVERSE = (process.env.SYMBOLS_UNIVERSE || 'AAPL,MSFT,GOOGL,AMZN,META,TSLA,NVDA,JPM,V,JNJ')
  .split(',').map(s => s.trim().toUpperCase()).filter(Boolean);

let symbolsUniverse: string[] = ENV_UNIVERSE;

const transcriptService = TranscriptService.getInstance();

// Redis client for queues
let redisClient: Redis | null = null;
try {
  redisClient = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => Math.min(times * 50, 2000),
  });

  redisClient.on('error', (err) => {
    logger.error('Redis connection error', { error: err.message });
  });

  redisClient.on('connect', () => {
    logger.info('Redis connected for transcript queues');
  });
} catch (e: any) {
  logger.warn('Redis not available - queue functionality disabled', { error: e?.message });
}

// OpenAI client
let openaiClient: OpenAI | null = null;
try {
  if (process.env.OPENAI_API_KEY) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    logger.info('OpenAI client initialized');
  }
} catch (e: any) {
  logger.warn('OpenAI not available - AI summarization disabled', { error: e?.message });
}

// Simple health tracking
let lastRunAt: string | null = null;
let lastIngest: { ingested: number; updated: number; errors: number } | null = null;
let lastSummaries: { summarized: number; errors: number } | null = null;

async function ensureStorage(): Promise<boolean> {
  // If PG is configured, assume available; otherwise require supabaseAdmin
  if (process.env.PGHOST) return true;
  if (!supabaseAdmin) {
    logger.warn('Transcripts worker: no storage configured (PGHOST or Supabase)');
    return false;
  }
  return true;
}

async function loadUniverseFromPg(limit: number): Promise<string[]> {
  if (!process.env.PGHOST) return [];
  try {
    const { Client } = await import('pg');
    const c = new Client({
      host: process.env.PGHOST,
      port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5432,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      database: process.env.PGDATABASE,
      application_name: 'alfalyzer-transcripts-universe'
    });
    await c.connect();
    const q = `SELECT DISTINCT UPPER(symbol) AS symbol FROM stocks WHERE symbol IS NOT NULL AND TRIM(symbol) <> '' ORDER BY symbol LIMIT $1`; // limit applied
    const res = await c.query(q, [Math.max(1, limit)]);
    await c.end();
    return (res.rows || []).map(r => String(r.symbol).toUpperCase());
  } catch (e: any) {
    logger.warn('Transcripts worker: failed to load universe from PG', { error: e?.message });
    return [];
  }
}

async function refreshSymbolsUniverse(): Promise<void> {
  try {
    if (UNIVERSE_SOURCE === 'pg') {
      const fromPg = await loadUniverseFromPg(Math.max(UNIVERSE_LIMIT_PER_CYCLE, 50));
      if (fromPg.length) {
        symbolsUniverse = fromPg;
        logger.info('Transcripts worker: universe loaded from PG', { count: fromPg.length, limitPerCycle: UNIVERSE_LIMIT_PER_CYCLE });
        return;
      }
      // Fallback to env if PG fetch returned empty
      logger.warn('Transcripts worker: PG universe empty, falling back to env list');
    }
    symbolsUniverse = ENV_UNIVERSE;
    logger.info('Transcripts worker: universe set from env', { count: symbolsUniverse.length, limitPerCycle: UNIVERSE_LIMIT_PER_CYCLE });
  } catch (e: any) {
    logger.warn('Transcripts worker: universe refresh error, using env', { error: e?.message });
    symbolsUniverse = ENV_UNIVERSE;
  }
}

/**
 * Get whitelist of symbols for discovery
 * Returns first 914 symbols from universe (or configured limit)
 */
async function getWhitelistSymbols(): Promise<string[]> {
  await refreshSymbolsUniverse();
  return symbolsUniverse.slice(0, Math.min(914, UNIVERSE_LIMIT_PER_CYCLE));
}

function maskPII(text: string): string {
  try {
    // Mask emails and obvious phone patterns
    return text
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]')
      .replace(/\b\+?\d[\d\s().-]{7,}\b/g, '[redacted-phone]');
  } catch {
    return text;
  }
}

async function fetchSourceTranscripts(): Promise<any[]> {
  switch (INGEST_SOURCE) {
    case 'local:mock':
      return mockTranscripts.map(t => ({ ...t }));
    case 'fmp':
      return await fetchFmpCalendarWindow(CAL_LOOKBACK_DAYS, CAL_LOOKAHEAD_DAYS);
    default:
      return [];
  }
}

function isoDate(d: Date): string { return d.toISOString().slice(0,10); }

/**
 * Calculate quarter and year from a date string
 * FIXED: Now actually uses the dateStr parameter instead of hard-coded values
 */
function quarterFromDateStr(dateStr: string): { q: 'Q1'|'Q2'|'Q3'|'Q4'; year: number } {
  // Parse the actual date from the parameter
  const date = new Date(dateStr);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth(); // 0-11

  // Calculate quarter based on month
  // Q1: Jan-Mar (0-2), Q2: Apr-Jun (3-5), Q3: Jul-Sep (6-8), Q4: Oct-Dec (9-11)
  const quarter = Math.floor(month / 3) + 1; // 1-4

  return {
    q: `Q${quarter}` as 'Q1'|'Q2'|'Q3'|'Q4',
    year
  };
}

async function fetchJson(url: string): Promise<any> {
  const r = await fetch(url as any);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);

  // Track bandwidth from Content-Length header
  const bytes = parseInt(r.headers.get('content-length') || '0', 10);
  if (bytes > 0) {
    await trackBandwidth(bytes);
  }

  try { return await r.json(); } catch { return null; }
}

async function fetchFmpCalendarWindow(lookbackDays: number, lookaheadDays: number): Promise<any[]> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) return [];
  const now = new Date();
  const from = new Date(now.getTime() - lookbackDays*86400000);
  const to = new Date(now.getTime() + lookaheadDays*86400000);

  // Guard: Check limit BEFORE rate limiter
  if (fmpApiCallsThisCycle >= MAX_FMP_CALLS_PER_CYCLE) {
    logger.error('FMP calls limit reached - aborting calendar fetch', {
      calls: fmpApiCallsThisCycle,
      limit: MAX_FMP_CALLS_PER_CYCLE
    });
    return [];
  }

  // Apply rate limiter before API call
  await fmpRateLimiter.take();

  const url = `https://financialmodelingprep.com/api/v3/earning_calendar?from=${isoDate(from)}&to=${isoDate(to)}&apikey=${apiKey}`;
  try {
    fmpApiCallsThisCycle++;
    const r = await fetch(url as any, {
      headers: {
        'Accept-Encoding': 'gzip'
      }
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);

    // Track bandwidth from Content-Length header
    const bytes = parseInt(r.headers.get('content-length') || '0', 10);
    if (bytes > 0) {
      await trackBandwidth(bytes);
    }

    const arr = await r.json().catch(() => null);
    if (!Array.isArray(arr)) return [];
    const uniq = new Map<string, any>();
    const allowed = new Set(symbolsUniverse.slice(0, UNIVERSE_LIMIT_PER_CYCLE));
    for (const r of arr) {
      const sym = String(r.symbol || '').toUpperCase();
      if (allowed.size && !allowed.has(sym)) continue;
      const date = String(r.date || r.fiscalDateEnding || r.announcementDate || '').split('T')[0] || isoDate(now);
      const { q, year } = quarterFromDateStr(date);
      uniq.set(`${sym}:${year}:${q}`, { symbol: sym, companyName: r.company || r.companyName || sym, date, quarter: q, year });
    }
    // Limit events to prevent overload
    return Array.from(uniq.values()).slice(0, UNIVERSE_LIMIT_PER_CYCLE);
  } catch (e) {
    logger.warn('FMP calendar fetch failed', { error: (e as any)?.message });
    return [];
  }
}

async function fetchFmpTranscript(symbol: string, quarter: string, year: number): Promise<string | null> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) return null;
  const qn = quarter.replace('Q','');

  // Guard: Check limit BEFORE rate limiter
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

  // Apply rate limiter before API call
  await fmpRateLimiter.take();

  const url = `https://financialmodelingprep.com/api/v3/earning_call_transcript/${encodeURIComponent(symbol)}?quarter=${encodeURIComponent(qn)}&year=${encodeURIComponent(String(year))}&apikey=${apiKey}`;
  try {
    fmpApiCallsThisCycle++; // Track bandwidth usage

    // Add gzip header for bandwidth optimization
    const r = await fetch(url as any, {
      headers: {
        'Accept-Encoding': 'gzip'
      }
    });

    if (!r.ok) throw new Error(`HTTP ${r.status}`);

    // Track bandwidth
    const bytes = parseInt(r.headers.get('content-length') || '0', 10);
    if (bytes > 0) {
      await trackBandwidth(bytes);
    }

    const data = await r.json();
    if (Array.isArray(data) && data[0]?.content) return String(data[0].content);
    if (data && typeof data === 'object' && data.content) return String(data.content);
    return null;
  } catch (e) {
    logger.warn('FMP transcript fetch failed', { symbol, quarter, year, error: (e as any)?.message });
    return null;
  }
}

/**
 * Dynamically calculate recent quarters based on current date
 * Returns last 6 quarters to cover cases where companies report late
 */
function getRecentQuarters(): Array<{quarter: string, year: number}> {
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth(); // 0-11

  // Determine current quarter based on month (Q1=Jan-Mar, Q2=Apr-Jun, Q3=Jul-Sep, Q4=Oct-Dec)
  let currentQuarter = Math.floor(currentMonth / 3) + 1; // 1-4

  const quarters = [];
  let q = currentQuarter;
  let y = currentYear;

  // Generate last 6 quarters (covers late reports and provides fallback)
  for (let i = 0; i < 6; i++) {
    quarters.push({
      quarter: `Q${q}`,
      year: y
    });

    q--;
    if (q < 1) {
      q = 4;
      y--;
    }
  }

  logger.info('Transcripts worker: calculated recent quarters', {
    currentDate: now.toISOString().split('T')[0],
    quarters: quarters.map(qt => `${qt.quarter} ${qt.year}`).join(', ')
  });

  return quarters;
}

async function checkTranscriptExists(symbol: string, quarter: string, year: number): Promise<boolean> {
  try {
    const existing = await transcriptService.findByKey(symbol.toUpperCase(), quarter, year);
    return !!existing;
  } catch (e) {
    return false;
  }
}

async function fetchLatestTranscriptForSymbol(symbol: string): Promise<{content: string, quarter: string, year: number} | null> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) return null;

  // Dynamic: Calculate recent quarters based on current date
  const allQuarters = getRecentQuarters();

  // Bandwidth protection: Only try most recent 3 quarters (not all 6)
  const quarters = allQuarters.slice(0, 3);

  let consecutiveMisses = 0;
  const MAX_CONSECUTIVE_MISSES = 2; // Early exit after 2 API misses

  for (const {quarter, year} of quarters) {
    try {
      // CHECK POSTGRESQL FIRST - avoid unnecessary API calls
      const exists = await checkTranscriptExists(symbol, quarter, year);
      if (exists) {
        logger.info('Transcripts worker: already in cache - SKIP', { symbol, quarter, year });
        consecutiveMisses = 0; // Reset counter on cache hit
        continue; // 0 API calls
      }

      // Only fetch if NOT exists
      const content = await fetchFmpTranscript(symbol, quarter, year);
      if (content) {
        logger.info('Transcripts worker: NEW transcript fetched', { symbol, quarter, year });
        return { content, quarter, year };
      } else {
        consecutiveMisses++;
        logger.debug('Transcripts worker: API miss', { symbol, quarter, year, consecutiveMisses });

        // Early exit: If 2 consecutive quarters have no transcript, skip remaining
        if (consecutiveMisses >= MAX_CONSECUTIVE_MISSES) {
          logger.info('Transcripts worker: early exit after misses', { symbol, consecutiveMisses });
          break;
        }
      }
    } catch (e) {
      consecutiveMisses++;
      if (consecutiveMisses >= MAX_CONSECUTIVE_MISSES) break;
      continue;
    }
    // Rate limiting
    await new Promise(r => setTimeout(r, 200));
  }

  return null;
}

/**
 * TASK #2: Discovery Job
 *
 * Fetches transcripts for whitelist symbols with:
 * - Rate limiting via fmpRateLimiter.take()
 * - Gzip headers for bandwidth optimization
 * - SHA-256 deduplication
 * - ON CONFLICT intelligent update
 * - Redis queue population with queued_at timestamp
 */
async function discoveryJob(): Promise<{ discovered: number; queued: number; errors: number }> {
  logger.info('Discovery job started');

  const symbols = await getWhitelistSymbols();
  let discovered = 0;
  let queued = 0;
  let errors = 0;

  for (const symbol of symbols) {
    try {
      // 1. Fetch latest transcript with rate limiting
      const latest = await fetchLatestTranscriptForSymbol(symbol);

      if (!latest) {
        continue; // No transcript found for this symbol
      }

      // 2. SHA-256 hash for deduplication
      const contentHash = crypto
        .createHash('sha256')
        .update(latest.content)
        .digest('hex');

      // 3. Check if transcript already exists
      const existing = await transcriptService.findByKey(symbol, latest.quarter, latest.year);

      // 4. Insert with ON CONFLICT intelligent update
      if (!existing || existing.content_hash !== contentHash) {
        const id = await upsertTranscript({
          ticker: symbol,
          company_name: symbol,
          quarter: latest.quarter,
          year: latest.year,
          call_date: null,
          raw_transcript: latest.content,
          content_hash: contentHash,
          status: 'pending',
        });

        if (id) {
          discovered++;

          // 5. Push to Redis queue with queued_at timestamp
          if (redisClient) {
            await redisClient.lpush('transcript_queue', JSON.stringify({
              id,
              ticker: symbol,
              quarter: latest.quarter,
              year: latest.year,
              queued_at: new Date().toISOString(), // CRITICAL for janitor detection
            }));
            queued++;
          }

          logger.info('Discovery: new transcript queued', {
            symbol,
            quarter: latest.quarter,
            year: latest.year,
            contentHash: contentHash.substring(0, 16)
          });
        }
      } else {
        logger.debug('Discovery: transcript unchanged', { symbol, quarter: latest.quarter, year: latest.year });
      }

    } catch (error: any) {
      errors++;
      logger.error('Discovery failed for symbol', { symbol, error: error.message });
    }

    // Rate limiting between symbols
    await new Promise(r => setTimeout(r, 300));
  }

  logger.info('Discovery job completed', { discovered, queued, errors, symbols: symbols.length });
  return { discovered, queued, errors };
}

/**
 * TASK #3: AI Worker Loop
 *
 * Processes transcript queue with:
 * - RPOPLPUSH (atomic, NOT BRPOP)
 * - Retry with exponential backoff
 * - Dead Letter Queue for failed tasks
 * - Processing queue cleanup after success
 */
async function aiWorkerLoop(): Promise<void> {
  logger.info('AI Worker Loop started');

  if (!redisClient || !openaiClient) {
    logger.warn('AI Worker disabled - Redis or OpenAI not available');
    return;
  }

  while (true) {
    try {
      // RPOPLPUSH - atomic move to processing queue
      const payload = await redisClient.rpoplpush(
        'transcript_queue',
        'transcript_processing'
      );

      if (!payload) {
        await new Promise(r => setTimeout(r, 5000)); // 5s backoff if empty
        continue;
      }

      const task = JSON.parse(payload);

      // Process with retry
      await processWithRetry(task, payload);

      // Remove from processing queue after success
      await redisClient.lrem('transcript_processing', 1, payload);

    } catch (error: any) {
      logger.error('Worker loop error', { error: error.message });
      await new Promise(r => setTimeout(r, 10000)); // 10s backoff on error
    }
  }
}

/**
 * Process with retry and exponential backoff
 */
async function processWithRetry(task: any, payload: string, attempt = 1): Promise<void> {
  const MAX_ATTEMPTS = 3;

  try {
    await processTranscript(task);
  } catch (error: any) {
    if (attempt >= MAX_ATTEMPTS) {
      // Move to Dead Letter Queue
      if (redisClient) {
        await redisClient.lpush('transcript_dlq', JSON.stringify({
          ...task,
          error: error.message,
          failed_at: new Date().toISOString(),
          attempts: attempt
        }));
      }

      logger.error('Task moved to DLQ', { task, error: error.message });
      return;
    }

    // Retry with exponential backoff: 2s, 4s, 8s
    const backoff = Math.pow(2, attempt) * 1000;
    logger.warn(`Retry attempt ${attempt}/${MAX_ATTEMPTS}`, { task, backoff });
    await new Promise(r => setTimeout(r, backoff));

    await processWithRetry(task, payload, attempt + 1);
  }
}

/**
 * TASK #3 (continued): Process Transcript
 *
 * Handles:
 * - Chunking for transcripts >400k chars (COMPLETE chunks, NOT substring)
 * - OpenAI timeout 60s with AbortController
 * - Schema: ai_summary with keyInsights[] array
 * - extractKeyInsights() helper
 */
async function processTranscript(task: any): Promise<void> {
  const { id, ticker, quarter, year } = task;

  // Fetch transcript from PostgreSQL
  const transcript = await transcriptService.findById(id);

  if (!transcript || !transcript.raw_transcript) {
    throw new Error('Transcript not found in database');
  }

  const content = transcript.raw_transcript;

  // Chunking for large transcripts (>400k chars ~100k tokens)
  const chunks = content.length > 400_000
    ? chunkTranscript(content, 350_000)
    : [content];

  let summaries: string[] = [];

  for (const chunk of chunks) {
    // OpenAI call with timeout 60s
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);

    try {
      if (!openaiClient) {
        throw new Error('OpenAI client not initialized');
      }

      const response = await openaiClient.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'user',
          content: `Analyze this earnings call transcript and provide:
1. Executive summary (2-3 sentences)
2. Key insights (3-5 bullet points)
3. Financial highlights
4. Risk factors

Transcript for ${ticker} ${quarter} ${year}:
${chunk}` // COMPLETE chunk, NOT substring
        }],
        temperature: 0.3,
        max_tokens: 800
      }, { signal: controller.signal as any });

      summaries.push(response.choices[0].message.content || '');

    } finally {
      clearTimeout(timeout);
    }

    // Rate limit OpenAI: 1 req/s
    await new Promise(r => setTimeout(r, 1000));
  }

  // Merge summaries if chunking was used
  const finalSummary = chunks.length > 1
    ? await mergeSummaries(summaries, ticker, quarter, year)
    : summaries[0];

  // Schema: ai_summary with keyInsights[] for BE/FE alignment
  const aiSummaryPayload = {
    summary: finalSummary,
    keyInsights: extractKeyInsights(finalSummary),
    processedAt: new Date().toISOString()
  };

  // Update PostgreSQL
  await transcriptService.updateSummaryMeta(
    id,
    JSON.stringify(aiSummaryPayload),
    'published',
    { ai_processed_at: new Date().toISOString() }
  );

  logger.info('Transcript processed', { id, ticker, quarter, year, chunks: chunks.length });
}

/**
 * Extract key insights from summary (bullet points)
 */
function extractKeyInsights(summary: string): string[] {
  const lines = summary.split('\n');
  const insights = lines
    .filter(line => line.trim().match(/^[•\-\*]\s+/))
    .map(line => line.replace(/^[•\-\*]\s+/, '').trim())
    .slice(0, 5);  // Max 5 insights

  return insights.length > 0 ? insights : [];
}

/**
 * Chunking inteligente por parágrafos
 */
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

/**
 * Merge summaries from chunked transcript
 */
async function mergeSummaries(summaries: string[], ticker: string, quarter: string, year: number): Promise<string> {
  if (!openaiClient) {
    return summaries.join('\n\n---\n\n');
  }

  const combined = summaries.join('\n\n---\n\n');

  const response = await openaiClient.chat.completions.create({
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

/**
 * Janitor - Clean stuck messages from processing queue
 */
async function janitorProcess(): Promise<void> {
  if (!redisClient) return;

  setInterval(async () => {
    try {
      const stuck = await redisClient!.lrange('transcript_processing', 0, -1);

      for (const payload of stuck) {
        const task = JSON.parse(payload);

        // If processing for >10 minutes, re-enqueue
        const processingTime = Date.now() - new Date(task.queued_at).getTime();
        if (processingTime > 10 * 60 * 1000) {
          await redisClient!.lrem('transcript_processing', 1, payload);
          await redisClient!.lpush('transcript_queue', payload);
          logger.warn('Stuck task re-queued', { task });
        }
      }
    } catch (error: any) {
      logger.error('Janitor process error', { error: error.message });
    }
  }, 5 * 60 * 1000); // Check every 5 minutes
}

/**
 * TASK #4: Recover Pending Tasks
 *
 * CRITICAL: Re-enqueue pending tasks on startup (if Redis crashed)
 * - Query: status='pending' AND ai_summary IS NULL
 * - Add queued_at timestamp in payload
 */
async function recoverPendingTasks(): Promise<void> {
  if (!redisClient) {
    logger.warn('Recovery disabled - Redis not available');
    return;
  }

  try {
    const pending = await transcriptService.getPendingForSummary(1000);

    logger.info('Recovering pending tasks', { count: pending.length });

    for (const task of pending) {
      await redisClient.lpush('transcript_queue', JSON.stringify({
        id: task.id,
        ticker: task.ticker,
        quarter: task.quarter,
        year: task.year,
        queued_at: new Date().toISOString() // CRITICAL: timestamp for janitor
      }));
    }

    logger.info('Recovery complete', { recovered: pending.length });
  } catch (error: any) {
    logger.error('Recovery failed', { error: error.message });
  }
}

async function upsertTranscript(t: any): Promise<number | null> {
  const insert = {
    ticker: String(t.ticker).toUpperCase(),
    company_name: t.company_name || t.ticker,
    quarter: t.quarter || 'Q1',
    year: Number(t.year) || new Date().getUTCFullYear(),
    call_date: t.call_date || null,
    raw_transcript: t.raw_transcript ? maskPII(String(t.raw_transcript)) : null,
    content_hash: t.content_hash || null,
    ai_summary: t.ai_summary || null,
    status: t.status || 'pending',
    metadata: t.metadata || null,
  };
  return await transcriptService.upsertByKey(insert as any);
}

async function summarizeTranscript(id: number, ticker: string, company: string, quarter: string, year: number, transcript: string): Promise<string | null> {
  // Prefer OpenAI, fallback to Anthropic, then heuristic
  try {
    if (process.env.OPENAI_API_KEY) {
      const { openaiService } = await import('../services/ai/openai-service');
      const resp = await openaiService.analyzeContent({
        content: transcript.substring(0, 6000),
        type: 'summary',
        priority: 'normal',
        maxTokens: 800,
      });
      return JSON.stringify({ summary: resp.content, model: 'openai', tokens: resp.tokensUsed });
    }
  } catch (e: any) {
    logger.warn('Transcripts worker: OpenAI summary failed', { id, error: e?.message });
  }

  try {
    if (process.env.ANTHROPIC_API_KEY) {
      const { anthropicService } = await import('../services/ai/anthropic-service');
      const resp = await anthropicService.generateTranscriptSummary({
        transcript,
        ticker,
        companyName: company,
        quarter,
        year,
        priority: 'normal',
        maxTokens: 800,
      });
      return JSON.stringify({
        summary: resp.summary,
        keyInsights: resp.keyInsights,
        financialHighlights: resp.financialHighlights,
        riskFactors: resp.riskFactors,
        stockSpecificMetrics: resp.stockSpecificMetrics || [],
        model: resp.model,
      });
    }
  } catch (e: any) {
    logger.warn('Transcripts worker: Anthropic summary failed', { id, error: e?.message });
  }

  // Fallback heuristic: first paragraphs truncated
  const trimmed = transcript.replace(/\s+/g, ' ').trim();
  const snippet = trimmed.substring(0, 800);
  return JSON.stringify({ summary: snippet + (trimmed.length > 800 ? '…' : ''), model: 'heuristic' });
}

async function processPendingSummaries(): Promise<{ summarized: number; errors: number }> {
  if (!await ensureStorage()) return { summarized: 0, errors: 0 };
  const pending = await transcriptService.getPendingForSummary(10) as any[];

  console.log(`🤖 Processing ${pending.length} pending summaries...`);

  let summarized = 0, errorsCount = 0;

  for (const transcript of pending) {
    try {
      // Gerar resumo com OpenAI
      const { openaiService } = await import('../services/ai/openai-service');
      const summary = await openaiService.generateTranscriptSummary({
        transcript: transcript.raw_transcript,
        ticker: transcript.ticker,
        quarter: transcript.quarter,
        year: transcript.year
      });

      // Atualizar no DB
      await transcriptService.updateSummaryMeta(
        transcript.id,
        JSON.stringify(summary),
        'published', // Marcar como publicado
        { ai_processed_at: new Date().toISOString() }
      );

      console.log(`✅ AI Summary completed for ${transcript.ticker}`);
      summarized++;

    } catch (error) {
      console.error(`❌ AI Summary failed for ${transcript.ticker}:`, error);
      errorsCount++;
    }

    // Rate limiting OpenAI
    await new Promise(r => setTimeout(r, 1000));
  }

  return { summarized, errors: errorsCount };
}

async function ingestOnce(): Promise<{ ingested: number; updated: number; errors: number }> {
  if (!await ensureStorage()) return { ingested: 0, updated: 0, errors: 1 };

  // Strategy: Fetch latest transcript for each symbol directly
  let ingested = 0, updated = 0, errors = 0;

  if (INGEST_SOURCE === 'fmp') {
    // Get symbols to process
    const symbols = symbolsUniverse.slice(0, UNIVERSE_LIMIT_PER_CYCLE);
    logger.info('Transcripts worker: fetching latest transcripts', { symbols: symbols.length });

    for (const symbol of symbols) {
      try {
        const latest = await fetchLatestTranscriptForSymbol(symbol);
        if (!latest) {
          continue; // No recent transcript found
        }

        const id = await upsertTranscript({
          ticker: symbol,
          company_name: symbol, // FMP API doesn't provide company name in transcript endpoint
          quarter: latest.quarter,
          year: latest.year,
          call_date: null,
          raw_transcript: latest.content,
          status: 'pending'
        });

        if (id) {
          ingested++;
          logger.info('Transcripts worker: ingested latest', { symbol, quarter: latest.quarter, year: latest.year });
        }

        // Rate limiting: be nice to FMP API
        await new Promise(r => setTimeout(r, 300));
      } catch (e: any) {
        errors++;
        logger.warn('Transcripts worker: latest fetch failed', { error: e?.message, symbol });
      }
    }
  } else if (INGEST_SOURCE === 'local:mock') {
    // Legacy calendar-based approach for mocks
    const source = await fetchSourceTranscripts();
    for (const ev of source) {
      const symbol = String(ev.symbol || ev.ticker || '').toUpperCase();
      const quarter = String(ev.quarter || 'Q1').toUpperCase();
      const year = Number(ev.year || new Date().getUTCFullYear());
      try {
        const id = await upsertTranscript({
          ticker: symbol,
          company_name: ev.companyName || ev.company_name || symbol,
          quarter,
          year,
          call_date: ev.date || ev.call_date || null,
          raw_transcript: ev.raw_transcript || null,
          status: 'pending'
        });
        if (id) { ingested++; }
      } catch (e: any) {
        errors++;
        logger.warn('Transcripts worker: mock upsert exception', { error: e?.message, symbol, quarter, year });
      }
    }
  }

  return { ingested, updated, errors };
}

async function runCycle() {
  logger.info('Transcripts worker: cycle start', { source: INGEST_SOURCE });

  // Refresh symbols universe at the beginning of each cycle
  await refreshSymbolsUniverse();

  // Optional backfill (disabled by default - only fetch NEW transcripts)
  if (BACKFILL_TRANSCRIPTS && INGEST_SOURCE === 'fmp') {
    try {
      const now = new Date();
      const from = new Date(now.getTime() - BACKFILL_DAYS*86400000);
      const apiKey = process.env.FMP_API_KEY;
      if (apiKey) {
        // Apply rate limiter
        await fmpRateLimiter.take();

        const url = `https://financialmodelingprep.com/api/v3/earning_calendar?from=${isoDate(from)}&to=${isoDate(now)}&apikey=${apiKey}`;
        fmpApiCallsThisCycle++;
        const arr = await fetchJson(url);
        if (Array.isArray(arr)) {
          const uniq = new Map<string, any>();
          const allowed = new Set(symbolsUniverse.slice(0, UNIVERSE_LIMIT_PER_CYCLE));
          for (const r of arr) {
            const sym = String(r.symbol || '').toUpperCase();
            if (allowed.size && !allowed.has(sym)) continue;
            const date = String(r.date || r.fiscalDateEnding || '').split('T')[0] || isoDate(now);
            const { q, year } = quarterFromDateStr(date);
            uniq.set(`${sym}:${year}:${q}`, { symbol: sym, companyName: r.company || sym, date, quarter: q, year });
          }
          const events = Array.from(uniq.values()).slice(0, UNIVERSE_LIMIT_PER_CYCLE);
          let c = 0; let errs = 0; let skipped = 0;
          for (const ev of events) {
            try {
              // CHECK POSTGRESQL FIRST - critical optimization
              const exists = await checkTranscriptExists(ev.symbol, ev.quarter, ev.year);
              if (exists) {
                skipped++;
                continue; // Skip - already in database (0 API calls)
              }

              // Only fetch if NOT exists
              const content = await fetchFmpTranscript(ev.symbol, ev.quarter, ev.year);
              if (content) {
                await upsertTranscript({ ticker: ev.symbol, company_name: ev.companyName, quarter: ev.quarter, year: ev.year, call_date: ev.date, raw_transcript: content, status: 'pending' });
                c++;
              }
              await new Promise(r => setTimeout(r, 250));
            } catch { errs++; }
          }
          logger.info('Transcripts worker: backfill complete', { updated: c, skipped, errors: errs });
        }
      }
    } catch (e:any) {
      logger.warn('Transcripts worker: backfill failed', { error: e?.message });
    }
  }

  // ✅ CALENDAR-DRIVEN DISCOVERY (event-driven, NOT universe sweep)
  const events = await fetchFmpCalendarWindow(
    parseInt(process.env.FMP_CAL_LOOKBACK_DAYS || '7', 10),
    parseInt(process.env.FMP_CAL_LOOKAHEAD_DAYS || '2', 10)
  );

  let ingested = 0;
  let skipped = 0;
  let queuePushed = 0;

  for (const event of events) {
    if (!event.symbol || !event.quarter || !event.year) continue;

    const exists = await checkTranscriptExists(event.symbol, event.quarter, event.year);

    if (exists) {
      skipped++;
      logger.debug('Transcript already in cache - SKIP', {
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

      // ✅ Redis queue para AI summaries
      if (id && redisClient) {
        await redisClient.lpush('transcript_queue', JSON.stringify({
          id,
          ticker: event.symbol,
          quarter: event.quarter,
          year: event.year,
          queued_at: new Date().toISOString()
        }));
        queuePushed++;
      }
      ingested++;
    }
  }

  lastIngest = { ingested, updated: 0, errors: 0 };
  logger.info('Calendar-driven cycle complete', {
    events: events.length,
    skipped,
    ingested,
    queuePushed,
    apiCalls: fmpApiCallsThisCycle
  });

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

  // Invalidate any transcript cache keys
  try {
    const { redisCacheService } = await import('../cache/redis-cache-service');
    await redisCacheService.delPattern('transcripts:*');
  } catch {}

  // Bandwidth report
  const estimatedMB = (fmpApiCallsThisCycle * 30 / 1024).toFixed(2); // ~30KB per call
  logger.info('Transcripts worker: bandwidth report', {
    fmpApiCalls: fmpApiCallsThisCycle,
    estimatedMB,
    limit: MAX_FMP_CALLS_PER_CYCLE,
    status: fmpApiCallsThisCycle > MAX_FMP_CALLS_PER_CYCLE ? '🚨 EXCEEDED' : '✅ OK'
  });

  if (fmpApiCallsThisCycle > MAX_FMP_CALLS_PER_CYCLE) {
    logger.error("Transcripts worker: FMP API calls exceeded safety limit! ABORTING CYCLE.", {
      calls: fmpApiCallsThisCycle,
      limit: MAX_FMP_CALLS_PER_CYCLE
    });
    fmpApiCallsThisCycle = 0;
    return; // ✅ ABORT ciclo
  }

  fmpApiCallsThisCycle = 0; // Reset counter for next cycle

  // Update last run timestamp
  lastRunAt = new Date().toISOString();
}

/**
 * Start all workers
 *
 * Orchestrates:
 * - Recovery queue (runs ALWAYS on startup)
 * - AI worker loop
 * - Janitor process
 */
async function startWorkers() {
  // CRITICAL: Always recover pending tasks first
  await recoverPendingTasks();

  // Start AI worker and janitor in parallel
  await Promise.all([
    aiWorkerLoop(),
    janitorProcess()
  ]);
}

async function main() {
  logger.info('Transcripts worker starting…', { env: process.env.NODE_ENV, intervalMs: RUN_INTERVAL_MS });

  // Optional health endpoint
  try {
    if (process.env.WORKER_HEALTH_PORT) {
      const http = await import('http');
      const server = http.createServer((_req: any, res: any) => {
        if (_req.url === '/health') {
          const body = JSON.stringify({
            status: 'healthy',
            worker: 'transcripts',
            lastRunAt,
            lastIngest,
            lastSummaries,
            isRunning: true,
          });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(body);
        } else {
          res.writeHead(404);
          res.end('Not found');
        }
      });
      const port = parseInt(process.env.WORKER_HEALTH_PORT);
      server.listen(port, () => logger.info(`🏥 Transcripts worker health listening on ${port}`));
    }
  } catch {}

  // Start workers (recovery + AI loop + janitor)
  startWorkers().catch(e => {
    logger.error('Workers failed to start', { error: e?.message });
  });

  // Run cycle immediately, then schedule
  await runCycle();
  setInterval(runCycle, RUN_INTERVAL_MS);
}

// Start immediately (CJS-compatible)
main().catch((e) => {
  logger.error('Transcripts worker fatal error', {
    error: e?.message || String(e),
    stack: e?.stack,
    name: e?.name,
    code: e?.code,
    fullError: JSON.stringify(e, Object.getOwnPropertyNames(e))
  });
  process.exit(1);
});

export {};
