/**
 * Diagnostics Routes - ONDA 4.1
 *
 * Debug endpoints for ETF detection and stock classification
 */

import { Router, Request, Response } from 'express';
import {
  isETF,
  getETFReason,
  getClassificationDetails,
  getETFDetectionStats,
} from '../utils/stock-classifier';
import { getKnownETFCount } from '../data/known-etfs';
import axios from 'axios';

const router = Router();

const FMP_BASE_URL = 'https://financialmodelingprep.com';
const FMP_API_KEY = process.env.FMP_API_KEY || '';

/**
 * Helper function to fetch company profile from FMP
 */
async function getCompanyProfile(ticker: string) {
  try {
    const url = `${FMP_BASE_URL}/api/v3/profile/${ticker}?apikey=${FMP_API_KEY}`;
    const response = await axios.get(url, { timeout: 5000 });

    if (response.data && response.data.length > 0) {
      return response.data[0];
    }
    return null;
  } catch (error) {
    console.error(`Failed to fetch profile for ${ticker}:`, error);
    return null;
  }
}

/**
 * GET /api/diagnostics/classify/:ticker
 *
 * Check if ticker is classified as ETF with detailed reasoning
 *
 * Example: GET /api/diagnostics/classify/SPY
 * Response:
 * {
 *   "ticker": "SPY",
 *   "is_etf": true,
 *   "reason": "Known ETF list (140+ popular ETFs)",
 *   "can_calculate_iv": false,
 *   "checks": { ... },
 *   "company_info": { ... }
 * }
 */
router.get('/classify/:ticker', async (req: Request, res: Response) => {
  try {
    const { ticker } = req.params;

    if (!ticker) {
      return res.status(400).json({ error: 'Ticker symbol required' });
    }

    // Fetch company profile for enhanced detection
    const companyProfile = await getCompanyProfile(ticker);

    // Get detailed classification
    const classification = getClassificationDetails(ticker, companyProfile);

    res.json(classification);
  } catch (error) {
    console.error('Classification error:', error);
    res.status(500).json({
      error: 'Classification failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/diagnostics/classify/batch
 *
 * Classify multiple tickers at once
 *
 * Body: { "tickers": ["AAPL", "SPY", "MSFT", "QQQ"] }
 * Response: Array of classification results
 */
router.post('/classify/batch', async (req: Request, res: Response) => {
  try {
    const { tickers } = req.body;

    if (!Array.isArray(tickers) || tickers.length === 0) {
      return res.status(400).json({ error: 'Array of tickers required' });
    }

    if (tickers.length > 50) {
      return res.status(400).json({ error: 'Maximum 50 tickers per request' });
    }

    const results = await Promise.all(
      tickers.map(async (ticker) => {
        const companyProfile = await getCompanyProfile(ticker);
        return getClassificationDetails(ticker, companyProfile);
      })
    );

    res.json({
      count: results.length,
      etf_count: results.filter((r) => r.is_etf).length,
      stock_count: results.filter((r) => !r.is_etf).length,
      results,
    });
  } catch (error) {
    console.error('Batch classification error:', error);
    res.status(500).json({
      error: 'Batch classification failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/diagnostics/etf-stats
 *
 * Get statistics about ETF detection coverage
 *
 * Response:
 * {
 *   "known_etfs_count": 140,
 *   "providers_count": 16,
 *   "indicators_count": 6,
 *   "total_detection_strategies": 4
 * }
 */
router.get('/etf-stats', (req: Request, res: Response) => {
  try {
    const stats = getETFDetectionStats();
    res.json(stats);
  } catch (error) {
    console.error('ETF stats error:', error);
    res.status(500).json({
      error: 'Failed to get ETF stats',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/diagnostics/health
 *
 * Basic health check for diagnostics system
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'diagnostics',
    timestamp: new Date().toISOString(),
    features: [
      'ETF detection (4 strategies)',
      'Stock classification',
      'Batch processing',
      'Detection statistics',
    ],
  });
});

export default router;
