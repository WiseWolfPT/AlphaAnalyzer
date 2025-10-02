import { redisCacheService } from '../cache/redis-cache-service';
import { TranscriptService } from './transcript-service';

const transcriptService = TranscriptService.getInstance();

// From transcript worker
async function fetchFmpTranscript(symbol: string, quarter: string, year: number): Promise<string | null> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) return null;
  const qn = quarter.replace('Q','');
  const url = `https://financialmodelingprep.com/api/v3/earning_call_transcript/${encodeURIComponent(symbol)}?quarter=${encodeURIComponent(qn)}&year=${encodeURIComponent(String(year))}&apikey=${apiKey}`;
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
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

class TranscriptCacheService {
  private readonly LATEST_TTL = 90 * 86400; // 90 dias
  private readonly LIST_TTL = 300; // 5 minutos

  // Obter último transcript (com cache)
  async getLatestTranscript(symbol: string) {
    const cacheKey = `transcript:${symbol}:latest`;

    // 1. Verificar cache
    const cached = await redisCacheService.get(cacheKey);
    if (cached) {
      console.log(`✅ Cache hit for ${symbol} transcript`);
      return cached;
    }

    // 2. Buscar do DB
    const dbResult = await transcriptService.getTranscripts({
      ticker: symbol,
      status: 'published',
      limit: 1
    });

    if (dbResult.data.length > 0) {
      // Cachear resultado
      await this.cacheTranscript(symbol, dbResult.data[0]);
      return dbResult.data[0];
    }

    // 3. Fetch on-demand (último recurso)
    console.log(`📡 Fetching ${symbol} transcript from FMP...`);
    const fresh = await fetchLatestTranscriptForSymbol(symbol);
    if (fresh) {
      await this.storeAndCache(symbol, fresh);
      return fresh;
    }

    return null;
  }

  // Cachear transcript
  async cacheTranscript(symbol: string, data: any) {
    const cacheKey = `transcript:${symbol}:latest`;
    await redisCacheService.set(cacheKey, data, this.LATEST_TTL);
    console.log(`💾 Cached ${symbol} transcript for 90 days`);
  }

  // Armazenar e cachear
  async storeAndCache(symbol: string, fresh: any) {
    // Store in DB
    const id = await transcriptService.upsertByKey({
      ticker: symbol,
      company_name: symbol,
      quarter: fresh.quarter,
      year: fresh.year,
      raw_transcript: fresh.content,
      status: 'pending'
    });

    if (id) {
      // Cache the stored data
      await this.cacheTranscript(symbol, {
        ...fresh,
        id,
        ticker: symbol,
        company_name: symbol,
        status: 'pending'
      });
    }
  }

  // Invalidar quando sai novo
  async invalidateTranscript(symbol: string) {
    await redisCacheService.del(`transcript:${symbol}:latest`);
    await redisCacheService.del('transcripts:list:latest');
    console.log(`🗑️ Invalidated cache for ${symbol}`)
  }

  // Cache da lista completa
  async getCachedList() {
    return await redisCacheService.get('transcripts:list:latest');
  }

  async cacheList(data: any) {
    await redisCacheService.set('transcripts:list:latest', data, this.LIST_TTL);
  }
}

export const transcriptCacheService = new TranscriptCacheService();
