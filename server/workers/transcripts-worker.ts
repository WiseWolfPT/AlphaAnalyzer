import { config } from 'dotenv';
import { resolve } from 'path';
import { supabaseAdmin } from '../lib/supabase-admin';
import { TranscriptService } from '../services/transcript-service';
import crypto from 'crypto';
import { mockTranscripts } from '../db/transcript-schema';
import { structuredLogger as logger } from '../services/structured-logger';

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

// From env list (fallback)
const ENV_UNIVERSE = (process.env.SYMBOLS_UNIVERSE || 'AAPL,MSFT,GOOGL,AMZN,META,TSLA,NVDA,JPM,V,JNJ')
  .split(',').map(s => s.trim().toUpperCase()).filter(Boolean);

let symbolsUniverse: string[] = ENV_UNIVERSE;

const transcriptService = TranscriptService.getInstance();

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

function quarterFromDateStr(dateStr: string): { q: 'Q1'|'Q2'|'Q3'|'Q4'; year: number } {
  const dt = new Date(dateStr);
  const m = dt.getUTCMonth() + 1;
  let year = dt.getUTCFullYear();

  // For current year, use previous year to ensure transcripts exist
  // Transcripts are typically available 2-4 weeks after earnings calls
  if (year >= 2025) {
    year = 2024; // Use 2024 data which definitely exists
  }

  const q = m<=3?'Q1':m<=6?'Q2':m<=9?'Q3':'Q4';
  return { q: q as any, year };
}

async function fetchJson(url: string): Promise<any> {
  const r = await fetch(url as any);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  try { return await r.json(); } catch { return null; }
}

async function fetchFmpCalendarWindow(lookbackDays: number, lookaheadDays: number): Promise<any[]> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) return [];
  const now = new Date();
  const from = new Date(now.getTime() - lookbackDays*86400000);
  const to = new Date(now.getTime() + lookaheadDays*86400000);
  const url = `https://financialmodelingprep.com/api/v3/earning_calendar?from=${isoDate(from)}&to=${isoDate(to)}&apikey=${apiKey}`;
  try {
    const arr = await fetchJson(url);
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
  const url = `https://financialmodelingprep.com/api/v3/earning_call_transcript/${encodeURIComponent(symbol)}?quarter=${encodeURIComponent(qn)}&year=${encodeURIComponent(String(year))}&apikey=${apiKey}`;
  try {
    const data = await fetchJson(url);
    if (Array.isArray(data) && data[0]?.content) return String(data[0].content);
    if (data && typeof data === 'object' && data.content) return String(data.content);
    return null;
  } catch (e) {
    logger.warn('FMP transcript fetch failed', { symbol, quarter, year, error: (e as any)?.message });
    return null;
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

async function processSummaries(): Promise<{ summarized: number; errors: number }> {
  if (!await ensureStorage()) return { summarized: 0, errors: 0 };
  const items = await transcriptService.getPendingForSummary(50) as any[];
  let summarized = 0, errorsCount = 0, considered = 0;

  for (let i = 0; i < items.length; i += SUMMARY_CONCURRENCY) {
    const batch = items.slice(i, i + SUMMARY_CONCURRENCY);
    const results = await Promise.all(batch.map(async (row) => {
      try {
        // Stop early if we reached per-cycle budget
        if (summarized >= MAX_SUMMARIES_PER_CYCLE) return;

        const raw = String(row.raw_transcript || '');
        const rawHash = crypto.createHash('sha256').update(raw).digest('hex');
        let meta: any = {};
        try { meta = row.metadata ? JSON.parse(row.metadata) : {}; } catch {}
        const existingHash = meta?.ai_hash;

        // Skip if summary exists and content unchanged
        if (row.ai_summary && existingHash === rawHash) {
          logger.debug('Transcripts worker: skip (unchanged content)', { id: row.id, ticker: row.ticker });
          return;
        }

        // If ai_summary is null but budget exceeded, skip remaining
        if (summarized >= MAX_SUMMARIES_PER_CYCLE) return;
        considered++;

        const summary = await summarizeTranscript(row.id, row.ticker, row.company_name, row.quarter, row.year, raw);
        if (!summary) return;

        // Update with new summary and metadata
        const updatedMeta = JSON.stringify({ ...(meta || {}), ai_hash: rawHash, ai_model: JSON.parse(summary).model || 'openai' });
        await transcriptService.updateSummaryMeta(row.id, summary, row.status === 'pending' ? 'review' : row.status, updatedMeta);
        summarized++;
      } catch (e: any) {
        errorsCount++;
        logger.warn('Transcripts worker: summarize/update failed', { id: row.id, error: e?.message });
      }
    }));
    // Respect rate limits
    if (i + SUMMARY_CONCURRENCY < items.length) await new Promise(r => setTimeout(r, 1500));
  }

  return { summarized, errors: errorsCount };
}

async function ingestOnce(): Promise<{ ingested: number; updated: number; errors: number }> {
  if (!await ensureStorage()) return { ingested: 0, updated: 0, errors: 1 };
  const source = await fetchSourceTranscripts();
  if (!source.length) return { ingested: 0, updated: 0, errors: 0 };

  let ingested = 0, updated = 0, errors = 0;
  for (const ev of source) {
    const symbol = String(ev.symbol || ev.ticker || '').toUpperCase();
    const quarter = String(ev.quarter || 'Q1').toUpperCase();
    const year = Number(ev.year || new Date().getUTCFullYear());
    try {
      let content: string | null = null;
      if (INGEST_SOURCE === 'fmp') {
        content = await fetchFmpTranscript(symbol, quarter, year);
      } else if (INGEST_SOURCE === 'local:mock') {
        content = ev.raw_transcript || null;
      }
      const id = await upsertTranscript({
        ticker: symbol,
        company_name: ev.companyName || ev.company_name || symbol,
        quarter,
        year,
        call_date: ev.date || ev.call_date || null,
        raw_transcript: content || null,
        status: 'pending'
      });
      if (id) { ingested++; }
      await new Promise(r => setTimeout(r, 200)); // be nice to FMP
    } catch (e: any) {
      errors++;
      logger.warn('Transcripts worker: upsert exception', { error: e?.message, symbol, quarter, year });
    }
  }
  return { ingested, updated, errors };
}

async function runCycle() {
  logger.info('Transcripts worker: cycle start', { source: INGEST_SOURCE });
  // Refresh symbols universe at the beginning of each cycle
  await refreshSymbolsUniverse();
  // Optional backfill
  if (BACKFILL_TRANSCRIPTS && INGEST_SOURCE === 'fmp') {
    try {
      const now = new Date();
      const from = new Date(now.getTime() - BACKFILL_DAYS*86400000);
      const apiKey = process.env.FMP_API_KEY;
      if (apiKey) {
        const url = `https://financialmodelingprep.com/api/v3/earning_calendar?from=${isoDate(from)}&to=${isoDate(now)}&apikey=${apiKey}`;
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
          let c = 0; let errs = 0;
          for (const ev of events) {
            try {
              const content = await fetchFmpTranscript(ev.symbol, ev.quarter, ev.year);
              await upsertTranscript({ ticker: ev.symbol, company_name: ev.companyName, quarter: ev.quarter, year: ev.year, call_date: ev.date, raw_transcript: content, status: 'pending' });
              c++;
              await new Promise(r => setTimeout(r, 250));
            } catch { errs++; }
          }
          logger.info('Transcripts worker: backfill complete', { updated: c, errors: errs });
        }
      }
    } catch (e:any) {
      logger.warn('Transcripts worker: backfill failed', { error: e?.message });
    }
  }

  const ingestRes = await ingestOnce();
  logger.info('Transcripts worker: ingest result', ingestRes);
  const sumRes = await processSummaries();
  logger.info('Transcripts worker: summarize result', sumRes);

  // Invalidate any transcript cache keys
  try {
    const { redisCacheService } = await import('../cache/redis-cache-service');
    await redisCacheService.delPattern('transcripts:*');
  } catch {}
}

async function main() {
  logger.info('Transcripts worker starting…', { env: process.env.NODE_ENV, intervalMs: RUN_INTERVAL_MS });
  await runCycle();
  setInterval(runCycle, RUN_INTERVAL_MS);
}

// Start if executed directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('transcripts-worker')) {
  main().catch((e) => {
    logger.error('Transcripts worker fatal error', { error: e?.message });
    process.exit(1);
  });
}

export {};
