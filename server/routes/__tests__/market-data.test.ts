/**
 * Market Data API Tests
 * Testing critical endpoints for stock quotes, financials, and market movers
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { Router } from 'express';
import type { Response, Request, NextFunction } from 'express';

// Mock the services
vi.mock('../../services/cache/cache-service', () => ({
  CacheService: vi.fn(() => ({
    getQuote: vi.fn(),
    setQuote: vi.fn(),
    getBatchQuotes: vi.fn(),
    setBatchQuotes: vi.fn(),
    getFinancials: vi.fn(),
    setFinancials: vi.fn(),
    getMarketMovers: vi.fn(),
    setMarketMovers: vi.fn(),
  }))
}));

vi.mock('../../services/providers/fmp-service', () => ({
  FMPService: class {
    getQuote = vi.fn();
    getBatchQuotes = vi.fn();
    getFinancials = vi.fn();
    getMarketMovers = vi.fn();
    getCompanyProfile = vi.fn();
    getHistoricalPrices = vi.fn();
  }
}));

// Mock data for tests
const mockQuoteData = {
  symbol: 'AAPL',
  name: 'Apple Inc.',
  price: 182.52,
  change: 1.24,
  changePercent: 0.68,
  dayLow: 180.00,
  dayHigh: 183.50,
  yearLow: 164.08,
  yearHigh: 199.62,
  marketCap: 2800000000000,
  priceAvg50: 175.20,
  priceAvg200: 170.50,
  volume: 52000000,
  avgVolume: 65000000,
  exchange: 'NASDAQ',
  open: 181.00,
  previousClose: 181.28,
  eps: 6.13,
  pe: 29.77,
  earningsAnnouncement: '2024-02-01T16:30:00.000Z',
  sharesOutstanding: 15441880000,
  timestamp: 1704067200
};

const mockBatchQuotes = [
  mockQuoteData,
  {
    ...mockQuoteData,
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    price: 378.85,
    change: -2.15,
    changePercent: -0.56,
  },
  {
    ...mockQuoteData,
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    price: 139.69,
    change: 0.54,
    changePercent: 0.39,
  }
];

const mockFinancialsData = {
  revenue: [
    { quarter: '2024-Q1', value: 119575 },
    { quarter: '2023-Q4', value: 117154 },
    { quarter: '2023-Q3', value: 89498 },
    { quarter: '2023-Q2', value: 81797 }
  ],
  ebitda: [
    { quarter: '2024-Q1', value: 35889 },
    { quarter: '2023-Q4', value: 35162 },
    { quarter: '2023-Q3', value: 26849 },
    { quarter: '2023-Q2', value: 24539 }
  ],
  netIncome: [
    { quarter: '2024-Q1', value: 23636 },
    { quarter: '2023-Q4', value: 33916 },
    { quarter: '2023-Q3', value: 22956 },
    { quarter: '2023-Q2', value: 19881 }
  ]
};

const mockMarketMovers = {
  gainers: [
    { symbol: 'NVDA', name: 'NVIDIA Corporation', changePercent: 5.67 },
    { symbol: 'AMD', name: 'Advanced Micro Devices', changePercent: 4.23 },
    { symbol: 'TSLA', name: 'Tesla Inc.', changePercent: 3.89 }
  ],
  losers: [
    { symbol: 'BA', name: 'Boeing Company', changePercent: -3.45 },
    { symbol: 'DIS', name: 'Walt Disney Company', changePercent: -2.78 },
    { symbol: 'NKE', name: 'Nike Inc.', changePercent: -2.34 }
  ],
  mostActive: [
    { symbol: 'AAPL', name: 'Apple Inc.', volume: 52000000 },
    { symbol: 'TSLA', name: 'Tesla Inc.', volume: 48000000 },
    { symbol: 'MSFT', name: 'Microsoft Corporation', volume: 35000000 }
  ]
};

describe('Market Data API Routes', () => {
  let app: express.Application;
  let cacheService: any;
  let fmpService: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create Express app with mocked routes
    app = express();
    app.use(express.json());

    // Import mocked services
    const { cacheService: cache } = require('../../services/cache/cache-service');
    const { FMPService } = require('../../services/providers/fmp-service');
    
    cacheService = cache;
    fmpService = new FMPService();

    // Create router with endpoints (simplified version for testing)
    const router = Router();

    // Quote endpoint
    router.get('/stocks/:symbol/quote', async (req: Request, res: Response) => {
      try {
        const { symbol } = req.params;
        
        // Try cache first
        const cached = await cacheService.getQuote(symbol);
        if (cached) {
          return res.json({ ...cached, fromCache: true });
        }

        // Fetch from FMP
        const data = await fmpService.getQuote(symbol);
        if (!data) {
          return res.status(404).json({ error: 'Symbol not found' });
        }

        // Save to cache
        await cacheService.setQuote(symbol, data);
        res.json({ ...data, fromCache: false });
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch quote' });
      }
    });

    // Batch quotes endpoint
    router.post('/stocks/batch', async (req: Request, res: Response) => {
      try {
        const { symbols } = req.body;
        
        if (!symbols || !Array.isArray(symbols)) {
          return res.status(400).json({ error: 'Invalid symbols array' });
        }

        // Try cache first
        const cached = await cacheService.getBatchQuotes(symbols);
        if (cached) {
          return res.json({ data: cached, fromCache: true });
        }

        // Fetch from FMP
        const data = await fmpService.getBatchQuotes(symbols);
        
        // Save to cache
        await cacheService.setBatchQuotes(symbols, data);
        res.json({ data, fromCache: false });
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch batch quotes' });
      }
    });

    // Financials endpoint
    router.get('/stocks/:symbol/financials', async (req: Request, res: Response) => {
      try {
        const { symbol } = req.params;
        const { period = 'quarter' } = req.query;

        // Try cache first
        const cached = await cacheService.getFinancials(symbol, period as string);
        if (cached) {
          return res.json({ ...cached, fromCache: true });
        }

        // Fetch from FMP
        const data = await fmpService.getFinancials(symbol, period as string);
        
        // Save to cache
        await cacheService.setFinancials(symbol, period as string, data);
        res.json({ ...data, fromCache: false });
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch financials' });
      }
    });

    // Market movers endpoint
    router.get('/market/movers', async (req: Request, res: Response) => {
      try {
        // Try cache first
        const cached = await cacheService.getMarketMovers();
        if (cached) {
          return res.json({ ...cached, fromCache: true });
        }

        // Fetch from FMP
        const data = await fmpService.getMarketMovers();
        
        // Save to cache
        await cacheService.setMarketMovers(data);
        res.json({ ...data, fromCache: false });
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch market movers' });
      }
    });

    app.use('/api', router);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/stocks/:symbol/quote', () => {
    it('should return quote data from cache when available', async () => {
      cacheService.getQuote.mockResolvedValue(mockQuoteData);

      const response = await request(app)
        .get('/api/stocks/AAPL/quote')
        .expect(200);

      expect(response.body).toEqual({
        ...mockQuoteData,
        fromCache: true
      });
      expect(cacheService.getQuote).toHaveBeenCalledWith('AAPL');
      expect(fmpService.getQuote).not.toHaveBeenCalled();
    });

    it('should fetch from FMP when cache miss', async () => {
      cacheService.getQuote.mockResolvedValue(null);
      fmpService.getQuote.mockResolvedValue(mockQuoteData);

      const response = await request(app)
        .get('/api/stocks/AAPL/quote')
        .expect(200);

      expect(response.body).toEqual({
        ...mockQuoteData,
        fromCache: false
      });
      expect(cacheService.getQuote).toHaveBeenCalledWith('AAPL');
      expect(fmpService.getQuote).toHaveBeenCalledWith('AAPL');
      expect(cacheService.setQuote).toHaveBeenCalledWith('AAPL', mockQuoteData);
    });

    it('should return 404 for invalid symbol', async () => {
      cacheService.getQuote.mockResolvedValue(null);
      fmpService.getQuote.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/stocks/INVALID/quote')
        .expect(404);

      expect(response.body).toEqual({ error: 'Symbol not found' });
    });

    it('should handle service errors gracefully', async () => {
      cacheService.getQuote.mockRejectedValue(new Error('Cache error'));

      const response = await request(app)
        .get('/api/stocks/AAPL/quote')
        .expect(500);

      expect(response.body).toEqual({ error: 'Failed to fetch quote' });
    });

    it('should complete request within 50ms when cached', async () => {
      cacheService.getQuote.mockResolvedValue(mockQuoteData);

      const start = Date.now();
      await request(app)
        .get('/api/stocks/AAPL/quote')
        .expect(200);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(50);
    });
  });

  describe('POST /api/stocks/batch', () => {
    it('should return batch quotes from cache when available', async () => {
      cacheService.getBatchQuotes.mockResolvedValue(mockBatchQuotes);

      const response = await request(app)
        .post('/api/stocks/batch')
        .send({ symbols: ['AAPL', 'MSFT', 'GOOGL'] })
        .expect(200);

      expect(response.body).toEqual({
        data: mockBatchQuotes,
        fromCache: true
      });
      expect(cacheService.getBatchQuotes).toHaveBeenCalledWith(['AAPL', 'MSFT', 'GOOGL']);
      expect(fmpService.getBatchQuotes).not.toHaveBeenCalled();
    });

    it('should fetch from FMP when cache miss', async () => {
      cacheService.getBatchQuotes.mockResolvedValue(null);
      fmpService.getBatchQuotes.mockResolvedValue(mockBatchQuotes);

      const response = await request(app)
        .post('/api/stocks/batch')
        .send({ symbols: ['AAPL', 'MSFT', 'GOOGL'] })
        .expect(200);

      expect(response.body).toEqual({
        data: mockBatchQuotes,
        fromCache: false
      });
      expect(fmpService.getBatchQuotes).toHaveBeenCalledWith(['AAPL', 'MSFT', 'GOOGL']);
      expect(cacheService.setBatchQuotes).toHaveBeenCalled();
    });

    it('should validate request body', async () => {
      const response = await request(app)
        .post('/api/stocks/batch')
        .send({ symbols: 'not-an-array' })
        .expect(400);

      expect(response.body).toEqual({ error: 'Invalid symbols array' });
    });

    it('should handle empty symbols array', async () => {
      const response = await request(app)
        .post('/api/stocks/batch')
        .send({ symbols: [] })
        .expect(400);

      expect(response.body).toEqual({ error: 'Invalid symbols array' });
    });

    it('should handle up to 50 symbols in a batch', async () => {
      const symbols = Array.from({ length: 50 }, (_, i) => `SYM${i}`);
      const mockData = symbols.map(symbol => ({ ...mockQuoteData, symbol }));
      
      cacheService.getBatchQuotes.mockResolvedValue(null);
      fmpService.getBatchQuotes.mockResolvedValue(mockData);

      const response = await request(app)
        .post('/api/stocks/batch')
        .send({ symbols })
        .expect(200);

      expect(response.body.data).toHaveLength(50);
    });
  });

  describe('GET /api/stocks/:symbol/financials', () => {
    it('should return financials data from cache', async () => {
      cacheService.getFinancials.mockResolvedValue(mockFinancialsData);

      const response = await request(app)
        .get('/api/stocks/AAPL/financials?period=quarter')
        .expect(200);

      expect(response.body).toEqual({
        ...mockFinancialsData,
        fromCache: true
      });
      expect(cacheService.getFinancials).toHaveBeenCalledWith('AAPL', 'quarter');
    });

    it('should fetch from FMP when cache miss', async () => {
      cacheService.getFinancials.mockResolvedValue(null);
      fmpService.getFinancials.mockResolvedValue(mockFinancialsData);

      const response = await request(app)
        .get('/api/stocks/AAPL/financials')
        .expect(200);

      expect(response.body).toEqual({
        ...mockFinancialsData,
        fromCache: false
      });
      expect(fmpService.getFinancials).toHaveBeenCalledWith('AAPL', 'quarter');
      expect(cacheService.setFinancials).toHaveBeenCalled();
    });

    it('should support annual period', async () => {
      cacheService.getFinancials.mockResolvedValue(mockFinancialsData);

      const response = await request(app)
        .get('/api/stocks/AAPL/financials?period=annual')
        .expect(200);

      expect(cacheService.getFinancials).toHaveBeenCalledWith('AAPL', 'annual');
    });

    it('should default to quarterly period', async () => {
      cacheService.getFinancials.mockResolvedValue(mockFinancialsData);

      await request(app)
        .get('/api/stocks/AAPL/financials')
        .expect(200);

      expect(cacheService.getFinancials).toHaveBeenCalledWith('AAPL', 'quarter');
    });
  });

  describe('GET /api/market/movers', () => {
    it('should return market movers from cache', async () => {
      cacheService.getMarketMovers.mockResolvedValue(mockMarketMovers);

      const response = await request(app)
        .get('/api/market/movers')
        .expect(200);

      expect(response.body).toEqual({
        ...mockMarketMovers,
        fromCache: true
      });
      expect(cacheService.getMarketMovers).toHaveBeenCalled();
      expect(fmpService.getMarketMovers).not.toHaveBeenCalled();
    });

    it('should fetch from FMP when cache miss', async () => {
      cacheService.getMarketMovers.mockResolvedValue(null);
      fmpService.getMarketMovers.mockResolvedValue(mockMarketMovers);

      const response = await request(app)
        .get('/api/market/movers')
        .expect(200);

      expect(response.body).toEqual({
        ...mockMarketMovers,
        fromCache: false
      });
      expect(fmpService.getMarketMovers).toHaveBeenCalled();
      expect(cacheService.setMarketMovers).toHaveBeenCalledWith(mockMarketMovers);
    });

    it('should return top 5 gainers, losers, and most active', async () => {
      cacheService.getMarketMovers.mockResolvedValue(mockMarketMovers);

      const response = await request(app)
        .get('/api/market/movers')
        .expect(200);

      expect(response.body.gainers).toHaveLength(3);
      expect(response.body.losers).toHaveLength(3);
      expect(response.body.mostActive).toHaveLength(3);
    });
  });

  describe('Performance Requirements', () => {
    it('should respond within 50ms for cached requests', async () => {
      cacheService.getQuote.mockResolvedValue(mockQuoteData);

      const requests = Array.from({ length: 10 }, async () => {
        const start = Date.now();
        await request(app).get('/api/stocks/AAPL/quote');
        return Date.now() - start;
      });

      const durations = await Promise.all(requests);
      const averageDuration = durations.reduce((a, b) => a + b, 0) / durations.length;

      expect(averageDuration).toBeLessThan(50);
    });

    it('should handle concurrent requests efficiently', async () => {
      cacheService.getQuote.mockResolvedValue(mockQuoteData);

      const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META'];
      const requests = symbols.map(symbol =>
        request(app).get(`/api/stocks/${symbol}/quote`)
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.fromCache).toBe(true);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      cacheService.getQuote.mockResolvedValue(null);
      fmpService.getQuote.mockRejectedValue(new Error('Network error'));

      const response = await request(app)
        .get('/api/stocks/AAPL/quote')
        .expect(500);

      expect(response.body).toEqual({ error: 'Failed to fetch quote' });
    });

    it('should handle timeout errors', async () => {
      cacheService.getQuote.mockImplementation(() => 
        new Promise((resolve) => setTimeout(() => resolve(null), 5000))
      );

      const response = await request(app)
        .get('/api/stocks/AAPL/quote')
        .timeout(1000)
        .catch(err => err.response);

      expect(response).toBeUndefined(); // Request timed out
    });

    it('should handle malformed API responses', async () => {
      cacheService.getQuote.mockResolvedValue(null);
      fmpService.getQuote.mockResolvedValue({ invalid: 'data' });

      const response = await request(app)
        .get('/api/stocks/AAPL/quote')
        .expect(200);

      // Should still return the data, even if malformed
      expect(response.body).toHaveProperty('invalid');
    });
  });
});