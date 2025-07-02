import { Router } from 'express';
import { z } from 'zod';
import { finnhubService } from '../services/finnhub-service';
import { alphaVantageService } from '../services/alpha-vantage-service';
import { cacheService } from '../services/cache-service';
import { authMiddleware } from '../middleware/auth-middleware';

const router = Router();

// Schema validation
const stockSymbolSchema = z.string().min(1).max(10).toUpperCase();
const periodSchema = z.enum(['quarterly', 'annual']).default('quarterly');
const daysSchema = z.coerce.number().min(1).max(365).default(30);

// Get stock profile
router.get('/stocks/:symbol/profile', authMiddleware.instance.authenticate(), async (req, res) => {
  try {
    const symbol = stockSymbolSchema.parse(req.params.symbol);
    
    // Try cache first
    const cacheKey = `profile:${symbol}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }
    
    // Try Finnhub first
    let profile = await finnhubService.getCompanyProfile(symbol);
    
    // If Finnhub fails, try Alpha Vantage
    if (!profile) {
      profile = await alphaVantageService.getCompanyOverview(symbol);
    }
    
    if (!profile) {
      return res.status(404).json({ error: 'Stock profile not found' });
    }
    
    // Cache for 24 hours
    await cacheService.set(cacheKey, profile, 86400);
    
    res.json(profile);
  } catch (error) {
    console.error('Error fetching stock profile:', error);
    res.status(500).json({ error: 'Failed to fetch stock profile' });
  }
});

// Get financial statements
router.get('/stocks/:symbol/financials', authMiddleware.instance.authenticate(), async (req, res) => {
  try {
    const symbol = stockSymbolSchema.parse(req.params.symbol);
    const period = periodSchema.parse(req.query.period);
    
    // Try cache first
    const cacheKey = `financials:${symbol}:${period}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return res.json({ statements: cached });
    }
    
    // Try Alpha Vantage for income statements
    const statements = await alphaVantageService.getIncomeStatement(symbol, period);
    
    if (!statements || statements.length === 0) {
      // Return mock data for demo
      const mockStatements = generateMockFinancials(symbol, period);
      return res.json({ statements: mockStatements });
    }
    
    // Cache for 1 hour
    await cacheService.set(cacheKey, statements, 3600);
    
    res.json({ statements });
  } catch (error) {
    console.error('Error fetching financials:', error);
    res.status(500).json({ error: 'Failed to fetch financial statements' });
  }
});

// Get historical prices
router.get('/stocks/:symbol/prices', authMiddleware.instance.authenticate(), async (req, res) => {
  try {
    const symbol = stockSymbolSchema.parse(req.params.symbol);
    const days = daysSchema.parse(req.query.days);
    
    // Try cache first
    const cacheKey = `prices:${symbol}:${days}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return res.json({ prices: cached });
    }
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Try Alpha Vantage daily prices
    const prices = await alphaVantageService.getDailyPrices(symbol, startDate, endDate);
    
    if (!prices || prices.length === 0) {
      // Return mock data for demo
      const mockPrices = generateMockPrices(symbol, days);
      return res.json({ prices: mockPrices });
    }
    
    // Cache for 5 minutes
    await cacheService.set(cacheKey, prices, 300);
    
    res.json({ prices });
  } catch (error) {
    console.error('Error fetching prices:', error);
    res.status(500).json({ error: 'Failed to fetch historical prices' });
  }
});

// Get financial metrics
router.get('/stocks/:symbol/metrics', authMiddleware.instance.authenticate(), async (req, res) => {
  try {
    const symbol = stockSymbolSchema.parse(req.params.symbol);
    
    // Try cache first
    const cacheKey = `metrics:${symbol}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }
    
    // Try Finnhub for basic financials
    const metrics = await finnhubService.getBasicFinancials(symbol);
    
    if (!metrics) {
      // Return mock data for demo
      const mockMetrics = {
        pe: 28.5,
        ps: 7.8,
        pb: 45.2,
        evToEbitda: 21.3,
        roe: 0.175,
        roa: 0.087,
        currentRatio: 1.05,
        debtToEquity: 1.75,
        grossMargin: 0.381,
        operatingMargin: 0.297,
        netMargin: 0.253
      };
      return res.json(mockMetrics);
    }
    
    // Cache for 1 hour
    await cacheService.set(cacheKey, metrics, 3600);
    
    res.json(metrics);
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch financial metrics' });
  }
});

// Helper functions
function generateMockFinancials(symbol: string, period: string) {
  const statements = [];
  const count = period === 'quarterly' ? 8 : 5;
  const baseRevenue = 100000;
  
  for (let i = 0; i < count; i++) {
    const date = period === 'quarterly' 
      ? `Q${(i % 4) + 1} ${2024 - Math.floor(i / 4)}`
      : `${2024 - i}`;
    
    statements.push({
      date,
      revenue: baseRevenue + Math.random() * 30000,
      grossProfit: baseRevenue * 0.4 + Math.random() * 10000,
      operatingIncome: baseRevenue * 0.3 + Math.random() * 8000,
      netIncome: baseRevenue * 0.25 + Math.random() * 6000,
      eps: 1.2 + Math.random() * 0.8,
      ebitda: baseRevenue * 0.35 + Math.random() * 10000,
      freeCashFlow: baseRevenue * 0.28 + Math.random() * 8000,
      totalAssets: baseRevenue * 10,
      totalLiabilities: baseRevenue * 6,
      totalEquity: baseRevenue * 4,
      cash: baseRevenue * 1.5,
      debt: baseRevenue * 1.1,
      sharesOutstanding: 15700000000
    });
  }
  
  return statements;
}

function generateMockPrices(symbol: string, days: number) {
  const prices = [];
  const basePrice = 180;
  
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (days - i - 1));
    
    const price = basePrice + Math.random() * 40 - 20;
    prices.push({
      date: date.toISOString().split('T')[0],
      open: price + Math.random() * 2,
      high: price + Math.random() * 5,
      low: price - Math.random() * 5,
      close: price,
      volume: Math.floor(10000000 + Math.random() * 5000000)
    });
  }
  
  return prices;
}

export default router;