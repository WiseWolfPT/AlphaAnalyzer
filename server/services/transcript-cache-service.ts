/**
 * Transcript Cache Service - Onda 2 (Fase 4)
 *
 * PostgreSQL-First Strategy:
 * - Redis: Latest metadata ONLY (9MB total for 914 symbols)
 * - PostgreSQL: History + Full transcripts (direct queries)
 *
 * Memory Impact:
 * - Redis Latest metadata: 914 symbols × 10KB = 9MB (3.5% of 256MB)
 * - Remaining for quotes/news: 247MB (96.5%)
 *
 * Performance:
 * - Latest: <50ms (Redis hit)
 * - History: 200-300ms (PostgreSQL acceptable)
 * - Full: 300-500ms (PostgreSQL acceptable)
 */

import { redisCacheService } from '../cache/redis-cache-service';
import { transcriptsPgRepo } from '../repositories/transcripts-pg';
import type { TranscriptRow } from '../repositories/transcripts-pg';

// Cache TTL: 7 days (quarterly earnings cycle)
const TRANSCRIPT_CACHE_TTL = 7 * 24 * 60 * 60; // 604800 seconds

/**
 * Transcript metadata for Latest cache (WITHOUT raw content)
 */
export interface TranscriptMetadata {
  id: number;
  ticker: string;
  quarter: string;
  year: number;
  call_date: string | null;
  ai_summary: string | null;
  published_at: string | null;
  view_count: number;
  company_name: string;
}

/**
 * Transcript history item (metadata ONLY)
 */
export interface TranscriptHistoryItem extends TranscriptMetadata {}

/**
 * Full transcript with raw content
 */
export interface TranscriptFull extends TranscriptRow {}

class TranscriptCacheService {
  // Public list cache TTL (short-lived): 2 minutes
  private static readonly PUBLIC_LIST_TTL_SECONDS = 120;

  /**
   * Get cached public transcripts list (unfiltered)
   *
   * Used by GET /api/transcripts before hitting the DB. This is intended to
   * cache a frequently requested public list (default limit/offset) to reduce
   * DB load during spikes. Filters in the UI can still apply client-side.
   */
  async getCachedList(): Promise<TranscriptMetadata[] | null> {
    try {
      const key = 'transcripts:public:list:v1';
      const cached = await redisCacheService.get(key);
      if (cached && Array.isArray(cached)) {
        return cached as TranscriptMetadata[];
      }
      return null;
    } catch (error) {
      console.error('❌ Error reading cached public transcripts list:', error);
      return null;
    }
  }

  /**
   * Cache public transcripts list (unfiltered)
   *
   * Accepts already-sanitized items (no raw_transcript). Keeps a short TTL to
   * ensure freshness while smoothing burst traffic.
   */
  async cacheList(items: TranscriptMetadata[]): Promise<void> {
    try {
      if (!items || !Array.isArray(items) || items.length === 0) return;
      const key = 'transcripts:public:list:v1';
      await redisCacheService.set(key, items, TranscriptCacheService.PUBLIC_LIST_TTL_SECONDS);
    } catch (error) {
      console.error('❌ Error caching public transcripts list:', error);
    }
  }

  /**
   * Get latest transcript metadata for a symbol
   *
   * Strategy:
   * - Redis cache: metadata ONLY (no raw_transcript)
   * - PostgreSQL: metadata + ai_summary (excludes raw content for memory)
   * - Cache TTL: 7 days (transcripts change quarterly)
   *
   * Memory: ~10KB per symbol (914 symbols = 9MB total)
   * Latency: <50ms (Redis hit), ~200ms (PostgreSQL miss)
   */
  async getLatest(symbol: string): Promise<TranscriptMetadata | null> {
    try {
      const upperSymbol = symbol.toUpperCase();
      const cacheKey = `transcript:${upperSymbol}:latest`;

      // Check Redis cache first
      const cached = await redisCacheService.get(cacheKey);
      if (cached) {
        console.log(`✅ Transcript cache hit for ${upperSymbol}`);
        // ✅ FIX: Parse JSON (cached is already parsed by redisCacheService.get)
        return cached as TranscriptMetadata;
      }

      // PostgreSQL: fetch metadata WITHOUT raw_transcript
      console.log(`📡 Transcript cache miss for ${upperSymbol}, fetching from PostgreSQL`);
      const pgClient = await this.getPgClient();

      try {
        const result = await pgClient.query(`
          SELECT
            id, ticker, company_name, quarter, year, call_date,
            ai_summary, published_at, view_count
          FROM transcripts
          WHERE ticker = $1 AND status = 'published'
          ORDER BY year DESC,
                   CASE quarter
                     WHEN 'Q4' THEN 4
                     WHEN 'Q3' THEN 3
                     WHEN 'Q2' THEN 2
                     WHEN 'Q1' THEN 1
                     ELSE 0
                   END DESC
          LIMIT 1
        `, [upperSymbol]);

        if (result.rows && result.rows.length > 0) {
          const metadata: TranscriptMetadata = {
            id: result.rows[0].id,
            ticker: result.rows[0].ticker,
            company_name: result.rows[0].company_name,
            quarter: result.rows[0].quarter,
            year: result.rows[0].year,
            call_date: result.rows[0].call_date,
            ai_summary: result.rows[0].ai_summary,
            published_at: result.rows[0].published_at,
            view_count: result.rows[0].view_count || 0
          };

          // Cache for 7 days (quarterly earnings cycle)
          await redisCacheService.set(cacheKey, metadata, TRANSCRIPT_CACHE_TTL);
          console.log(`💾 Cached transcript metadata for ${upperSymbol} (7 days)`);

          return metadata;
        }

        console.log(`❌ No published transcript found for ${upperSymbol}`);
        return null;
      } finally {
        await pgClient.end();
      }
    } catch (error) {
      console.error(`❌ Error getting latest transcript for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get transcript history for a symbol
   *
   * Strategy:
   * - PostgreSQL direct query (NO Redis cache)
   * - Returns metadata ONLY (no raw_transcript)
   * - Last 5 years of history
   *
   * Latency: 200-300ms (acceptable - user clicked toggle)
   * Memory: Zero Redis impact
   */
  async getHistory(symbol: string, limit: number = 20): Promise<TranscriptHistoryItem[]> {
    try {
      const upperSymbol = symbol.toUpperCase();
      const currentYear = new Date().getFullYear();
      const minYear = currentYear - 5; // Last 5 years

      console.log(`📡 Fetching transcript history for ${upperSymbol} (last 5 years)`);
      const pgClient = await this.getPgClient();

      try {
        const result = await pgClient.query(`
          SELECT
            id, ticker, company_name, quarter, year, call_date,
            ai_summary, published_at, view_count
          FROM transcripts
          WHERE ticker = $1 AND status = 'published' AND year >= $2
          ORDER BY year DESC,
                   CASE quarter
                     WHEN 'Q4' THEN 4
                     WHEN 'Q3' THEN 3
                     WHEN 'Q2' THEN 2
                     WHEN 'Q1' THEN 1
                     ELSE 0
                   END DESC
          LIMIT $3
        `, [upperSymbol, minYear, limit]);

        const history: TranscriptHistoryItem[] = result.rows.map((row: any) => ({
          id: row.id,
          ticker: row.ticker,
          company_name: row.company_name,
          quarter: row.quarter,
          year: row.year,
          call_date: row.call_date,
          ai_summary: row.ai_summary,
          published_at: row.published_at,
          view_count: row.view_count || 0
        }));

        console.log(`✅ Found ${history.length} historical transcripts for ${upperSymbol}`);
        return history;
      } finally {
        await pgClient.end();
      }
    } catch (error) {
      console.error(`❌ Error getting transcript history for ${symbol}:`, error);
      return [];
    }
  }

  /**
   * Get full transcript with raw content
   *
   * Strategy:
   * - PostgreSQL direct query (NO Redis cache)
   * - Returns complete transcript including raw_transcript
   * - Used when user clicks "Read Full Transcript"
   *
   * Latency: 300-500ms (acceptable - user explicit action)
   * Memory: Zero Redis impact
   */
  async getFullTranscript(
    symbol: string,
    quarter: string,
    year: number
  ): Promise<TranscriptFull | null> {
    try {
      const upperSymbol = symbol.toUpperCase();
      console.log(`📡 Fetching full transcript for ${upperSymbol} ${quarter} ${year}`);

      const pgClient = await this.getPgClient();

      try {
        const result = await pgClient.query(`
          SELECT * FROM transcripts
          WHERE ticker = $1 AND quarter = $2 AND year = $3
          LIMIT 1
        `, [upperSymbol, quarter, year]);

        if (result.rows && result.rows.length > 0) {
          console.log(`✅ Found full transcript for ${upperSymbol} ${quarter} ${year}`);
          return result.rows[0] as TranscriptFull;
        }

        console.log(`❌ Full transcript not found for ${upperSymbol} ${quarter} ${year}`);
        return null;
      } finally {
        await pgClient.end();
      }
    } catch (error) {
      console.error(`❌ Error getting full transcript for ${symbol} ${quarter} ${year}:`, error);
      return null;
    }
  }

  /**
   * Invalidate latest cache when transcript is published
   *
   * Call this when transcript status changes to 'published'
   */
  async invalidateLatest(symbol: string): Promise<void> {
    try {
      const upperSymbol = symbol.toUpperCase();
      const cacheKey = `transcript:${upperSymbol}:latest`;

      await redisCacheService.del(cacheKey);
      console.log(`🗑️ Invalidated transcript cache for ${upperSymbol}`);
    } catch (error) {
      console.error(`❌ Error invalidating transcript cache for ${symbol}:`, error);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    redisKeys: number;
    memoryUsage: string;
    ttl: string;
  }> {
    try {
      const keys = await redisCacheService.keys('transcript:*:latest');
      const health = await redisCacheService.healthCheck();

      return {
        redisKeys: keys.length,
        memoryUsage: health.memoryUsage ? `${(health.memoryUsage / 1024 / 1024).toFixed(2)}MB` : 'N/A',
        ttl: `${TRANSCRIPT_CACHE_TTL / 86400} days`
      };
    } catch (error) {
      console.error('❌ Error getting transcript cache stats:', error);
      return {
        redisKeys: 0,
        memoryUsage: 'N/A',
        ttl: `${TRANSCRIPT_CACHE_TTL / 86400} days`
      };
    }
  }

  /**
   * Helper: Get PostgreSQL client
   * Uses dynamic import to avoid hard dependency
   * Creates new connection per request (stateless)
   */
  private async getPgClient(): Promise<any> {
    if (!process.env.PGHOST) {
      throw new Error('PostgreSQL not configured: PGHOST environment variable missing');
    }

    const { Client } = await import('pg');
    const client = new Client({
      host: process.env.PGHOST,
      port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5432,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      database: process.env.PGDATABASE,
      application_name: 'alfalyzer-transcript-cache',
      connectionTimeoutMillis: 5000
    });

    try {
      await client.connect();
      return client;
    } catch (error) {
      console.error('PostgreSQL connection failed:', error);
      throw new Error('Database connection unavailable');
    }
  }
}

// Export singleton instance
export const transcriptCacheService = new TranscriptCacheService();
