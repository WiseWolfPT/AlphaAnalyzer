import { Router, Request, Response } from 'express';
import { getSupabaseClient } from '../lib/supabase-client';
import { Logger } from '../services/structured-logger';
import { storage } from '../storage';

const router = Router();
const logger = new Logger('CachedDataRoute');

// GET /api/cached/quotes/:symbol - Get single quote from cache
router.get('/quotes/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const maxAge = parseInt(req.query.maxAge as string) || 60; // Default 60 seconds

    logger.info(`Fetching cached quote for ${symbol}`);
    // PURE CACHE READ: return only what is cached (no upstream fetch)
    const { redisCacheService } = await import('../cache/redis-cache-service');
    const cacheKey = `quote:${symbol.toUpperCase()}`;
    const cached = await redisCacheService.get(cacheKey);

    if (!cached) {
      return res.json({ success: true, data: null, cached: false, message: 'Not in cache' });
    }

    res.set({ 'Cache-Control': 'public, max-age=10' });
    res.json({ success: true, data: cached, cached: true });
  } catch (error) {
    logger.error('Error in /quotes/:symbol', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/cached/quotes/batch - Get multiple quotes from cache
router.post('/quotes/batch', async (req: Request, res: Response) => {
  try {
    const { symbols } = req.body;
    const maxAge = parseInt(req.query.maxAge as string) || 60;

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return res.status(400).json({ error: 'Invalid symbols array' });
    }

    if (symbols.length > 100) {
      return res.status(400).json({ error: 'Maximum 100 symbols per request' });
    }

    logger.info(`Fetching cached quotes (pure read) for ${symbols.length} symbols`);

    const upperSymbols = symbols.map((s: string) => s.toUpperCase());
    const { redisCacheService } = await import('../cache/redis-cache-service');

    const quotes: any[] = [];
    for (const s of upperSymbols) {
      const cached = await redisCacheService.get(`quote:${s}`);
      if (cached) quotes.push(cached);
    }

    // Calculate cache statistics
    const freshCount = quotes.filter(q => !q.isStale).length;
    const staleCount = quotes.filter(q => q.isStale).length;

    res.set({ 'Cache-Control': 'public, max-age=10' });
    res.json({ success: true, data: quotes, cached: true, stats: { fresh: freshCount, stale: staleCount } });
  } catch (error) {
    logger.error('Error in /quotes/batch', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/cached/market-overview - Get market indices and top movers
router.get('/market-overview', async (req: Request, res: Response) => {
  try {
    logger.info('Fetching market overview');

    // Get major indices
    const indicesSymbols = ['^GSPC', '^DJI', '^IXIC', '^RUT']; // S&P 500, Dow, Nasdaq, Russell
    
    const { data: indices, error: indicesError } = await getSupabaseClient()
      .rpc('get_cached_quotes_batch', {
        p_symbols: indicesSymbols,
        p_max_age: 300 // 5 minutes for indices
      });

    if (indicesError) {
      logger.error('Error fetching indices', indicesError);
    }

    // Get top gainers (simplified - in production, use a dedicated query)
    const { data: allQuotes, error: quotesError } = await getSupabaseClient()
      .from('latest_asset_prices')
      .select('*')
      .not('change_percent', 'is', null)
      .order('change_percent', { ascending: false })
      .limit(10);

    if (quotesError) {
      logger.error('Error fetching top movers', quotesError);
    }

    const topGainers = allQuotes?.slice(0, 5) || [];
    const topLosers = allQuotes?.slice(-5).reverse() || [];

    res.json({
      indices: indices || [],
      topGainers,
      topLosers,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error in /market-overview', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/cached/search - Search for symbols
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { query } = req.query;
    
    if (!query || typeof query !== 'string' || query.length < 1) {
      return res.status(400).json({ error: 'Invalid search query' });
    }

    logger.info(`Searching for symbols matching: ${query}`);

    const { data, error } = await getSupabaseClient()
      .from('assets')
      .select('symbol, name, type, sector, exchange')
      .or(`symbol.ilike.%${query}%,name.ilike.%${query}%`)
      .eq('is_active', true)
      .limit(20);

    if (error) {
      logger.error('Error searching symbols', error);
      return res.status(500).json({ error: 'Search failed' });
    }

    // Canonicalize symbols (e.g., BRK.B -> BRK-B) so UI navigates to canónico
    const canonicalized = (data || []).map((it: any) => {
      const sym = String(it.symbol || '').toUpperCase();
      const can = sym.includes('.') ? sym.replace(/\./g, '-') : sym;
      return { ...it, symbol: can };
    });
    res.json({ results: canonicalized });
  } catch (error) {
    logger.error('Error in /search', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/cached/stats - Get cache statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    logger.info('Fetching cache statistics');

    const { data, error } = await getSupabaseClient().rpc('get_cache_statistics');

    if (error) {
      logger.error('Error fetching cache stats', error);
      return res.status(500).json({ error: 'Failed to fetch statistics' });
    }

    res.json(data?.[0] || {});
  } catch (error) {
    logger.error('Error in /stats', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/cached/providers - Get API provider status
router.get('/providers', async (req: Request, res: Response) => {
  try {
    logger.info('Fetching API provider status');

    const { data, error } = await getSupabaseClient()
      .from('api_providers')
      .select('*')
      .order('priority', { ascending: false });

    if (error) {
      logger.error('Error fetching providers', error);
      return res.status(500).json({ error: 'Failed to fetch providers' });
    }

    const providers = data?.map(p => ({
      name: p.name,
      isActive: p.is_active,
      priority: p.priority,
      quotaLimit: p.quota_limit,
      quotaUsed: p.current_quota_used,
      quotaRemaining: p.quota_limit ? p.quota_limit - p.current_quota_used : null,
      avgResponseTime: p.avg_response_time,
      successRate: p.success_rate,
      lastError: p.last_error,
      lastErrorAt: p.last_error_at
    }));

    res.json({ providers });
  } catch (error) {
    logger.error('Error in /providers', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/cached/refresh/:symbol - Force refresh a symbol (admin only)
router.post('/refresh/:symbol', async (req: Request, res: Response) => {
  try {
    // TODO: Add admin authentication check
    const { symbol } = req.params;
    
    logger.info(`Force refreshing ${symbol}`);

    // Mark cache as stale to trigger update on next worker cycle
    const { error } = await getSupabaseClient()
      .from('cache_metadata')
      .update({ is_stale: true, last_updated: new Date().toISOString() })
      .eq('cache_key', `quote:${symbol.toUpperCase()}`);

    if (error) {
      logger.error('Error marking cache as stale', error);
      return res.status(500).json({ error: 'Failed to refresh symbol' });
    }

    res.json({ 
      message: 'Symbol marked for refresh',
      symbol: symbol.toUpperCase() 
    });
  } catch (error) {
    logger.error('Error in /refresh/:symbol', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Intrinsic Values (cache-first, read-only)
router.get('/intrinsic-values/:symbol', async (req: Request, res: Response) => {
  try {
    const symbol = (req.params.symbol || '').toUpperCase();
    if (!symbol) return res.status(400).json({ error: 'Invalid symbol' });

    const { redisCacheService } = await import('../cache/redis-cache-service');
    const cacheKey = `iv:${symbol}`;
    const cached = await redisCacheService.get(cacheKey);

    if (cached) {
      return res.json({ success: true, data: cached, cached: true });
    }

    // Fallback to last DB value (optional) without triggering recalculation
    const dbValue = await storage.getIntrinsicValue(symbol).catch(() => undefined);
    if (dbValue) {
      return res.json({ success: true, data: dbValue, cached: false, source: 'db' });
    }

    return res.json({ success: true, data: null, cached: false });
  } catch (error) {
    logger.error('Error in /intrinsic-values/:symbol', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
