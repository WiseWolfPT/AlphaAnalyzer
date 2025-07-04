import { Router, Request, Response } from 'express';
import { getUnifiedAPIService } from '../services/unified-api';
import { getQuotaTracker } from '../services/quota';
import { FinnhubProvider } from '../services/unified-api/providers/finnhub.provider';
import { TwelveDataProvider } from '../services/unified-api/providers/twelve-data.provider';
import { FMPProvider } from '../services/unified-api/providers/fmp.provider';
import { AlphaVantageProvider } from '../services/unified-api/providers/alpha-vantage.provider';
import { marketDataRateLimiters } from '../middleware/rate-limit';
import { metrics, formatMetricsForPrometheus } from '../services/monitoring';
import { memoryCache } from '../services/cache';
import { marketTimezone } from '../services/market-timezone';

const router = Router();
const unifiedAPI = getUnifiedAPIService();
const quotaTracker = getQuotaTracker();

// Initialize providers on startup
(async () => {
  try {
    // Initialize all providers in priority order
    const providers = [
      new FinnhubProvider(),      // Priority 1
      new TwelveDataProvider(),   // Priority 2
      new FMPProvider(),          // Priority 3
      new AlphaVantageProvider()  // Priority 4 (backup)
    ];
    
    await unifiedAPI.initialize(providers);
    console.log('[Market Data V2] API providers initialized');
  } catch (error) {
    console.error('[Market Data V2] Failed to initialize providers:', error);
  }
})();

// GET /api/stocks/:symbol/price
router.get('/stocks/:symbol/price', marketDataRateLimiters.price, async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const useCache = req.query.cache !== 'false';
    
    const priceData = await unifiedAPI.getPrice(symbol.toUpperCase(), useCache);
    
    res.json({
      success: true,
      data: priceData,
      cached: (priceData as any).cached || false
    });
  } catch (error: any) {
    console.error('[Market Data V2] Price error:', error);
    res.status(error.message.includes('Rate limit') ? 429 : 500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/stocks/batch/prices
router.post('/stocks/batch/prices', marketDataRateLimiters.batchPrice, async (req: Request, res: Response) => {
  try {
    const { symbols } = req.body;
    
    if (!Array.isArray(symbols) || symbols.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid symbols array'
      });
    }

    // Limit batch size to prevent abuse
    const limitedSymbols = symbols.slice(0, 20).map(s => s.toUpperCase());
    const useCache = req.query.cache !== 'false';
    
    const prices = await unifiedAPI.getBatchPrices(limitedSymbols, useCache);
    
    res.json({
      success: true,
      data: prices,
      requested: limitedSymbols.length,
      returned: prices.length
    });
  } catch (error: any) {
    console.error('[Market Data V2] Batch price error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/stocks/:symbol/fundamentals
router.get('/stocks/:symbol/fundamentals', marketDataRateLimiters.fundamentals, async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const useCache = req.query.cache !== 'false';
    
    const fundamentals = await unifiedAPI.getFundamentals(symbol.toUpperCase(), useCache);
    
    res.json({
      success: true,
      data: fundamentals,
      cached: (fundamentals as any).cached || false
    });
  } catch (error: any) {
    console.error('[Market Data V2] Fundamentals error:', error);
    res.status(error.message.includes('Rate limit') ? 429 : 500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/stocks/:symbol/historical/:range
router.get('/stocks/:symbol/historical/:range', marketDataRateLimiters.historical, async (req: Request, res: Response) => {
  try {
    const { symbol, range } = req.params;
    const validRanges = ['1d', '5d', '1m', '3m', '6m', '1y', '5y', 'max'];
    
    if (!validRanges.includes(range)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid range. Valid values: ' + validRanges.join(', ')
      });
    }
    
    const useCache = req.query.cache !== 'false';
    const historical = await unifiedAPI.getHistorical(symbol.toUpperCase(), range as any, useCache);
    
    res.json({
      success: true,
      data: historical,
      cached: (historical as any).cached || false
    });
  } catch (error: any) {
    console.error('[Market Data V2] Historical error:', error);
    res.status(error.message.includes('not available') ? 501 : 500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/stocks/:symbol/company
router.get('/stocks/:symbol/company', marketDataRateLimiters.company, async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const useCache = req.query.cache !== 'false';
    
    const companyInfo = await unifiedAPI.getCompanyInfo(symbol.toUpperCase(), useCache);
    
    res.json({
      success: true,
      data: companyInfo,
      cached: (companyInfo as any).cached || false
    });
  } catch (error: any) {
    console.error('[Market Data V2] Company info error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/stocks/:symbol/news
router.get('/stocks/:symbol/news', marketDataRateLimiters.news, async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;
    const useCache = req.query.cache !== 'false';
    
    const news = await unifiedAPI.getNews(symbol.toUpperCase(), limit, useCache);
    
    res.json({
      success: true,
      data: news,
      cached: (news as any).cached || false
    });
  } catch (error: any) {
    console.error('[Market Data V2] News error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/quota/status
router.get('/quota/status', marketDataRateLimiters.status, async (req: Request, res: Response) => {
  try {
    const allUsage = await quotaTracker.getAllProvidersUsage();
    const alerts = await quotaTracker.checkQuotaAlerts();
    
    res.json({
      success: true,
      data: {
        usage: allUsage,
        alerts
      }
    });
  } catch (error: any) {
    console.error('[Market Data V2] Quota status error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/system/status
router.get('/system/status', marketDataRateLimiters.status, async (req: Request, res: Response) => {
  try {
    const status = await unifiedAPI.getStatus();
    
    res.json({
      success: true,
      data: status
    });
  } catch (error: any) {
    console.error('[Market Data V2] System status error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/metrics
router.get('/metrics', marketDataRateLimiters.status, async (req: Request, res: Response) => {
  try {
    const format = req.query.format as string;
    
    if (format === 'prometheus') {
      // Return Prometheus-compatible format
      res.set('Content-Type', 'text/plain');
      res.send(formatMetricsForPrometheus());
    } else {
      // Return JSON format
      res.json({
        success: true,
        data: metrics.getMetrics()
      });
    }
  } catch (error: any) {
    console.error('[Market Data V2] Metrics error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/cache/stats
router.get('/cache/stats', marketDataRateLimiters.status, async (req: Request, res: Response) => {
  try {
    const stats = memoryCache.getStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error('[Market Data V2] Cache stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/market/status
router.get('/market/status', marketDataRateLimiters.status, async (req: Request, res: Response) => {
  try {
    const status = marketTimezone.getStatus();
    
    res.json({
      success: true,
      data: status
    });
  } catch (error: any) {
    console.error('[Market Data V2] Market status error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;