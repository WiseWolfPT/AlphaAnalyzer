import { Router, Request, Response } from 'express';
import { getSupabaseClient } from '../lib/supabase-client';
import { Logger } from '../services/structured-logger';

const router = Router();
const logger = new Logger('CachedDataRoute');

// GET /api/cached/quotes/:symbol - Get single quote from cache
router.get('/quotes/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const maxAge = parseInt(req.query.maxAge as string) || 60; // Default 60 seconds

    logger.info(`Fetching cached quote for ${symbol}`);

    const { data, error } = await getSupabaseClient()
      .rpc('get_cached_quote', {
        p_symbol: symbol.toUpperCase(),
        p_max_age: maxAge
      });

    if (error) {
      logger.error('Error fetching cached quote', error);
      return res.status(500).json({ error: 'Failed to fetch quote' });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Symbol not found' });
    }

    const quote = data[0];
    
    // Add cache headers
    res.set({
      'Cache-Control': 'public, max-age=10', // Browser can cache for 10 seconds
      'X-Cache-Age': quote.age_seconds.toString(),
      'X-Cache-Status': quote.is_stale ? 'stale' : 'fresh'
    });

    res.json({
      symbol: quote.symbol,
      name: quote.name,
      price: parseFloat(quote.price),
      change: quote.change ? parseFloat(quote.change) : null,
      changePercent: quote.change_percent ? parseFloat(quote.change_percent) : null,
      volume: quote.volume,
      marketCap: quote.market_cap,
      lastUpdated: quote.last_updated,
      isStale: quote.is_stale
    });
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

    logger.info(`Fetching cached quotes for ${symbols.length} symbols`);

    const upperSymbols = symbols.map(s => s.toUpperCase());
    
    const { data, error } = await getSupabaseClient()
      .rpc('get_cached_quotes_batch', {
        p_symbols: upperSymbols,
        p_max_age: maxAge
      });

    if (error) {
      logger.error('Error fetching batch quotes', error);
      return res.status(500).json({ error: 'Failed to fetch quotes' });
    }

    const quotes = (data || []).map((quote: any) => ({
      symbol: quote.symbol,
      name: quote.name,
      price: parseFloat(quote.price),
      change: quote.change ? parseFloat(quote.change) : null,
      changePercent: quote.change_percent ? parseFloat(quote.change_percent) : null,
      volume: quote.volume,
      marketCap: quote.market_cap,
      lastUpdated: quote.last_updated,
      isStale: quote.is_stale
    }));

    // Calculate cache statistics
    const freshCount = quotes.filter(q => !q.isStale).length;
    const staleCount = quotes.filter(q => q.isStale).length;

    res.set({
      'Cache-Control': 'public, max-age=10',
      'X-Cache-Fresh': freshCount.toString(),
      'X-Cache-Stale': staleCount.toString()
    });

    res.json({ quotes });
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

    res.json({ results: data || [] });
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

export default router;