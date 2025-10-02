import { redisCacheService } from '../cache/redis-cache-service';
import { transcriptCacheService } from './transcript-cache-service';
import { TranscriptService } from './transcript-service';
import { openaiService } from './ai/openai-service';

const transcriptService = TranscriptService.getInstance();

// Helper function to get Redis client directly
async function getRedisClient() {
  const Redis = (await import('ioredis')).default;
  return new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
  });
}

// From transcript worker - need to import these functions
async function fetchJson(url: string): Promise<any> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  try { return await r.json(); } catch { return null; }
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
    console.warn('FMP transcript fetch failed', { symbol, quarter, year, error: (e as any)?.message });
    return null;
  }
}

async function fetchLatestTranscriptForSymbol(symbol: string): Promise<{content: string, quarter: string, year: number} | null> {
  // Ordem correta para setembro 2025
  const quarters = [
    { quarter: 'Q2', year: 2025 }, // Mais recente disponível
    { quarter: 'Q1', year: 2025 },
    { quarter: 'Q4', year: 2024 },
    { quarter: 'Q3', year: 2024 }
  ];

  for (const {quarter, year} of quarters) {
    try {
      const content = await fetchFmpTranscript(symbol, quarter, year);
      if (content) {
        console.log(`✅ Found ${symbol} transcript: ${quarter} ${year}`);
        return { content, quarter, year };
      }
    } catch (e) {
      continue;
    }
  }
  return null;
}

class EarningsScheduleManager {
  // Atualizar calendário diariamente
  async updateEarningsCalendar() {
    console.log('📅 Updating earnings calendar...');

    const from = new Date();
    const to = new Date();
    to.setDate(to.getDate() + 90); // Próximos 90 dias

    const url = `https://financialmodelingprep.com/api/v3/earning_calendar?from=${from.toISOString().split('T')[0]}&to=${to.toISOString().split('T')[0]}&apikey=${process.env.FMP_API_KEY}`;

    const response = await fetch(url);
    const earnings = await response.json();

    // Armazenar no Redis como sorted set
    const redis = await getRedisClient();
    for (const earning of earnings) {
      const timestamp = new Date(earning.date).getTime();
      await redis.zadd('earnings:schedule', timestamp, JSON.stringify({
        symbol: earning.symbol,
        date: earning.date,
        time: earning.time || 'AMC'
      }));
    }

    await redis.quit();
    console.log(`📅 Scheduled ${earnings.length} upcoming earnings`);
  }

  // Verificar earnings de hoje
  async getTodaysEarnings() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const redis = await getRedisClient();
    const results = await redis.zrangebyscore(
      'earnings:schedule',
      today.getTime(),
      tomorrow.getTime()
    );
    await redis.quit();

    return results.map(r => JSON.parse(r));
  }

  // Processar earnings automaticamente
  async processNewEarnings() {
    const todaysEarnings = await this.getTodaysEarnings();

    if (todaysEarnings.length === 0) {
      console.log('📅 No earnings today');
      return;
    }

    console.log(`📊 Processing ${todaysEarnings.length} earnings today`);

    for (const earning of todaysEarnings) {
      // Esperar após market close (22:00 UTC)
      const now = new Date();
      if (now.getHours() < 22) {
        console.log(`⏰ Waiting for market close to process ${earning.symbol}`);
        continue;
      }

      try {
        // 1. Buscar novo transcript
        const transcript = await fetchLatestTranscriptForSymbol(earning.symbol);

        if (!transcript) {
          console.log(`⏳ Transcript not yet available for ${earning.symbol}`);
          continue;
        }

        // 2. Invalidar cache antigo
        await transcriptCacheService.invalidateTranscript(earning.symbol);

        // 3. Salvar novo no DB
        const id = await transcriptService.upsertByKey({
          ticker: earning.symbol,
          company_name: earning.symbol,
          quarter: transcript.quarter,
          year: transcript.year,
          call_date: null,
          raw_transcript: transcript.content,
          status: 'pending'
        });

        // 4. Trigger AI summary
        const summary = await openaiService.generateTranscriptSummary({
          transcript: transcript.content,
          ticker: earning.symbol,
          quarter: transcript.quarter,
          year: transcript.year
        });

        // 5. Atualizar com summary
        if (id) {
          await transcriptService.updateSummaryMeta(
            id,
            JSON.stringify(summary),
            'published',
            { processed_at: new Date().toISOString() }
          );
        }

        // 6. Cachear novo como latest
        await transcriptCacheService.cacheTranscript(earning.symbol, {
          ...transcript,
          ai_summary: summary
        });

        console.log(`✅ ${earning.symbol} Q${transcript.quarter} ${transcript.year} processed and cached`);

      } catch (error) {
        console.error(`❌ Error processing ${earning.symbol}:`, error);
      }

      // Rate limiting
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

export const earningsScheduleManager = new EarningsScheduleManager();