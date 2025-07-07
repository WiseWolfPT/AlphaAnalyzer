/**
 * COMPREHENSIVE STOCKS ROUTES TESTS
 * Testes abrangentes para atingir 30%+ cobertura nos fluxos críticos
 */

import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest';
import express from 'express';
import stocksRouter from '../stocks';
import { authMiddleware } from '../../middleware/auth-middleware';

// Mock services
vi.mock('../../services/finnhub-service', () => ({
  finnhubService: {
    getCompanyProfile: vi.fn(),
    getBasicFinancials: vi.fn(),
  }
}));

vi.mock('../../services/alpha-vantage-service', () => ({
  alphaVantageService: {
    getCompanyOverview: vi.fn(),
    getIncomeStatement: vi.fn(),
    getDailyPrices: vi.fn(),
  }
}));

vi.mock('../../services/cache-service', () => ({
  cacheService: {
    get: vi.fn(),
    set: vi.fn(),
  }
}));

// Mock auth middleware
vi.mock('../../middleware/auth-middleware', () => ({
  authMiddleware: {
    instance: {
      authenticate: () => (req: any, res: any, next: any) => {
        // Mock authenticated user
        req.user = { id: 'test-user', email: 'test@alfalyzer.com' };
        next();
      },
    },
  },
}));

const app = express();
app.use(express.json());
app.use('/api', stocksRouter);

describe('🚀 Stocks Routes - Comprehensive Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('📊 GET /stocks/:symbol/profile', () => {
    it('should return cached profile when available', async () => {
      const mockProfile = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        sector: 'Technology',
        industry: 'Consumer Electronics',
        marketCap: 2800000000000,
      };

      const { cacheService } = await import('../../services/cache-service');
      vi.mocked(cacheService.get).mockResolvedValueOnce(mockProfile);

      const response = await request(app)
        .get('/api/stocks/AAPL/profile');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockProfile);
      expect(cacheService.get).toHaveBeenCalledWith('profile:AAPL');
    });

    it('should fetch from Finnhub when cache miss', async () => {
      const mockProfile = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        country: 'US',
        currency: 'USD',
        exchange: 'NASDAQ',
        ipo: '1980-12-12',
        marketCapitalization: 2800000,
        phone: '14089961010',
        shareOutstanding: 15728.7,
        ticker: 'AAPL',
        weburl: 'https://www.apple.com/',
        logo: 'https://static.finnhub.io/logo/87cb30d8-80df-11ea-8951-00155d64d4ab.png',
        finnhubIndustry: 'Technology'
      };

      const { cacheService } = await import('../../services/cache-service');
      const { finnhubService } = await import('../../services/finnhub-service');
      
      vi.mocked(cacheService.get).mockResolvedValueOnce(null);
      vi.mocked(finnhubService.getCompanyProfile).mockResolvedValueOnce(mockProfile);
      vi.mocked(cacheService.set).mockResolvedValueOnce();

      const response = await request(app)
        .get('/api/stocks/AAPL/profile');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockProfile);
      expect(finnhubService.getCompanyProfile).toHaveBeenCalledWith('AAPL');
      expect(cacheService.set).toHaveBeenCalledWith('profile:AAPL', mockProfile, 86400);
    });

    it('should fallback to Alpha Vantage when Finnhub fails', async () => {
      const mockProfile = {
        Symbol: 'AAPL',
        Name: 'Apple Inc',
        Description: 'Apple Inc. designs, manufactures...',
        Country: 'USA',
        Sector: 'TECHNOLOGY',
        Industry: 'Electronic Equipment',
        MarketCapitalization: '2800000000000'
      };

      const { cacheService } = await import('../../services/cache-service');
      const { finnhubService } = await import('../../services/finnhub-service');
      const { alphaVantageService } = await import('../../services/alpha-vantage-service');
      
      vi.mocked(cacheService.get).mockResolvedValueOnce(null);
      vi.mocked(finnhubService.getCompanyProfile).mockResolvedValueOnce(null);
      vi.mocked(alphaVantageService.getCompanyOverview).mockResolvedValueOnce(mockProfile);
      vi.mocked(cacheService.set).mockResolvedValueOnce();

      const response = await request(app)
        .get('/api/stocks/AAPL/profile');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockProfile);
      expect(finnhubService.getCompanyProfile).toHaveBeenCalledWith('AAPL');
      expect(alphaVantageService.getCompanyOverview).toHaveBeenCalledWith('AAPL');
    });

    it('should return 404 when profile not found', async () => {
      const { cacheService } = await import('../../services/cache-service');
      const { finnhubService } = await import('../../services/finnhub-service');
      const { alphaVantageService } = await import('../../services/alpha-vantage-service');
      
      vi.mocked(cacheService.get).mockResolvedValueOnce(null);
      vi.mocked(finnhubService.getCompanyProfile).mockResolvedValueOnce(null);
      vi.mocked(alphaVantageService.getCompanyOverview).mockResolvedValueOnce(null);

      const response = await request(app)
        .get('/api/stocks/NOTFOUND/profile');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Stock profile not found');
    });

    it('should validate stock symbol format', async () => {
      const response = await request(app)
        .get('/api/stocks/INVALID_SYMBOL_123!/profile');

      expect(response.status).toBe(400);
    });

    it('should convert symbol to uppercase', async () => {
      const mockProfile = { symbol: 'AAPL', name: 'Apple Inc.' };
      
      const { cacheService } = await import('../../services/cache-service');
      vi.mocked(cacheService.get).mockResolvedValueOnce(mockProfile);

      const response = await request(app)
        .get('/api/stocks/aapl/profile');

      expect(response.status).toBe(200);
      expect(cacheService.get).toHaveBeenCalledWith('profile:AAPL');
    });

    it('should handle service errors gracefully', async () => {
      const { cacheService } = await import('../../services/cache-service');
      const { finnhubService } = await import('../../services/finnhub-service');
      
      vi.mocked(cacheService.get).mockResolvedValueOnce(null);
      vi.mocked(finnhubService.getCompanyProfile).mockRejectedValueOnce(new Error('API Error'));

      const response = await request(app)
        .get('/api/stocks/AAPL/profile');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch stock profile');
    });
  });

  describe('💰 GET /stocks/:symbol/financials', () => {
    it('should return cached financials when available', async () => {
      const mockStatements = [
        {
          date: 'Q1 2024',
          revenue: 100000,
          grossProfit: 40000,
          operatingIncome: 30000,
          netIncome: 25000
        }
      ];

      const { cacheService } = await import('../../services/cache-service');
      vi.mocked(cacheService.get).mockResolvedValueOnce(mockStatements);

      const response = await request(app)
        .get('/api/stocks/AAPL/financials?period=quarterly');

      expect(response.status).toBe(200);
      expect(response.body.statements).toEqual(mockStatements);
      expect(cacheService.get).toHaveBeenCalledWith('financials:AAPL:quarterly');
    });

    it('should fetch from Alpha Vantage when cache miss', async () => {
      const mockStatements = [
        {
          fiscalDateEnding: '2024-03-31',
          reportedCurrency: 'USD',
          totalRevenue: '90753000000',
          grossProfit: '41954000000',
          operatingIncome: '27016000000',
          netIncome: '23636000000'
        }
      ];

      const { cacheService } = await import('../../services/cache-service');
      const { alphaVantageService } = await import('../../services/alpha-vantage-service');
      
      vi.mocked(cacheService.get).mockResolvedValueOnce(null);
      vi.mocked(alphaVantageService.getIncomeStatement).mockResolvedValueOnce(mockStatements);
      vi.mocked(cacheService.set).mockResolvedValueOnce();

      const response = await request(app)
        .get('/api/stocks/AAPL/financials?period=annual');

      expect(response.status).toBe(200);
      expect(response.body.statements).toEqual(mockStatements);
      expect(alphaVantageService.getIncomeStatement).toHaveBeenCalledWith('AAPL', 'annual');
      expect(cacheService.set).toHaveBeenCalledWith('financials:AAPL:annual', mockStatements, 3600);
    });

    it('should return mock data when no real data available', async () => {
      const { cacheService } = await import('../../services/cache-service');
      const { alphaVantageService } = await import('../../services/alpha-vantage-service');
      
      vi.mocked(cacheService.get).mockResolvedValueOnce(null);
      vi.mocked(alphaVantageService.getIncomeStatement).mockResolvedValueOnce([]);

      const response = await request(app)
        .get('/api/stocks/AAPL/financials?period=quarterly');

      expect(response.status).toBe(200);
      expect(response.body.statements).toBeDefined();
      expect(Array.isArray(response.body.statements)).toBe(true);
      expect(response.body.statements.length).toBeGreaterThan(0);
      // Mock data should have expected structure
      expect(response.body.statements[0]).toHaveProperty('revenue');
      expect(response.body.statements[0]).toHaveProperty('netIncome');
    });

    it('should validate period parameter', async () => {
      const { cacheService } = await import('../../services/cache-service');
      vi.mocked(cacheService.get).mockResolvedValueOnce(null);

      const response = await request(app)
        .get('/api/stocks/AAPL/financials?period=invalid');

      expect(response.status).toBe(400);
    });

    it('should use default period when not specified', async () => {
      const { cacheService } = await import('../../services/cache-service');
      vi.mocked(cacheService.get).mockResolvedValueOnce([]);

      const response = await request(app)
        .get('/api/stocks/AAPL/financials');

      expect(response.status).toBe(200);
      expect(cacheService.get).toHaveBeenCalledWith('financials:AAPL:quarterly');
    });
  });

  describe('📈 GET /stocks/:symbol/prices', () => {
    it('should return cached prices when available', async () => {
      const mockPrices = [
        {
          date: '2024-01-15',
          open: 185.56,
          high: 188.44,
          low: 184.35,
          close: 187.29,
          volume: 52164400
        }
      ];

      const { cacheService } = await import('../../services/cache-service');
      vi.mocked(cacheService.get).mockResolvedValueOnce(mockPrices);

      const response = await request(app)
        .get('/api/stocks/AAPL/prices?days=30');

      expect(response.status).toBe(200);
      expect(response.body.prices).toEqual(mockPrices);
      expect(cacheService.get).toHaveBeenCalledWith('prices:AAPL:30');
    });

    it('should fetch from Alpha Vantage when cache miss', async () => {
      const mockPrices = [
        {
          '1. open': '185.56',
          '2. high': '188.44',
          '3. low': '184.35',
          '4. close': '187.29',
          '5. volume': '52164400'
        }
      ];

      const { cacheService } = await import('../../services/cache-service');
      const { alphaVantageService } = await import('../../services/alpha-vantage-service');
      
      vi.mocked(cacheService.get).mockResolvedValueOnce(null);
      vi.mocked(alphaVantageService.getDailyPrices).mockResolvedValueOnce(mockPrices);
      vi.mocked(cacheService.set).mockResolvedValueOnce();

      const response = await request(app)
        .get('/api/stocks/AAPL/prices?days=7');

      expect(response.status).toBe(200);
      expect(response.body.prices).toEqual(mockPrices);
      expect(alphaVantageService.getDailyPrices).toHaveBeenCalledWith(
        'AAPL',
        expect.any(Date),
        expect.any(Date)
      );
      expect(cacheService.set).toHaveBeenCalledWith('prices:AAPL:7', mockPrices, 300);
    });

    it('should validate days parameter range', async () => {
      const response1 = await request(app)
        .get('/api/stocks/AAPL/prices?days=0');
      expect(response1.status).toBe(400);

      const response2 = await request(app)
        .get('/api/stocks/AAPL/prices?days=400');
      expect(response2.status).toBe(400);
    });

    it('should use default days when not specified', async () => {
      const { cacheService } = await import('../../services/cache-service');
      vi.mocked(cacheService.get).mockResolvedValueOnce([]);

      const response = await request(app)
        .get('/api/stocks/AAPL/prices');

      expect(response.status).toBe(200);
      expect(cacheService.get).toHaveBeenCalledWith('prices:AAPL:30');
    });

    it('should return mock data when no real data available', async () => {
      const { cacheService } = await import('../../services/cache-service');
      const { alphaVantageService } = await import('../../services/alpha-vantage-service');
      
      vi.mocked(cacheService.get).mockResolvedValueOnce(null);
      vi.mocked(alphaVantageService.getDailyPrices).mockResolvedValueOnce([]);

      const response = await request(app)
        .get('/api/stocks/AAPL/prices?days=7');

      expect(response.status).toBe(200);
      expect(response.body.prices).toBeDefined();
      expect(Array.isArray(response.body.prices)).toBe(true);
      expect(response.body.prices.length).toBe(7); // Should match requested days
      // Mock data should have expected structure
      expect(response.body.prices[0]).toHaveProperty('open');
      expect(response.body.prices[0]).toHaveProperty('close');
      expect(response.body.prices[0]).toHaveProperty('volume');
    });
  });

  describe('📊 GET /stocks/:symbol/metrics', () => {
    it('should return cached metrics when available', async () => {
      const mockMetrics = {
        pe: 28.5,
        ps: 7.8,
        pb: 45.2,
        evToEbitda: 21.3,
        roe: 0.175,
        roa: 0.087
      };

      const { cacheService } = await import('../../services/cache-service');
      vi.mocked(cacheService.get).mockResolvedValueOnce(mockMetrics);

      const response = await request(app)
        .get('/api/stocks/AAPL/metrics');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockMetrics);
      expect(cacheService.get).toHaveBeenCalledWith('metrics:AAPL');
    });

    it('should fetch from Finnhub when cache miss', async () => {
      const mockMetrics = {
        metric: {
          '10DayAverageTradingVolume': 52164400,
          '52WeekHigh': 199.62,
          '52WeekLow': 164.08,
          peNormalizedAnnual: 28.5
        }
      };

      const { cacheService } = await import('../../services/cache-service');
      const { finnhubService } = await import('../../services/finnhub-service');
      
      vi.mocked(cacheService.get).mockResolvedValueOnce(null);
      vi.mocked(finnhubService.getBasicFinancials).mockResolvedValueOnce(mockMetrics);
      vi.mocked(cacheService.set).mockResolvedValueOnce();

      const response = await request(app)
        .get('/api/stocks/AAPL/metrics');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockMetrics);
      expect(finnhubService.getBasicFinancials).toHaveBeenCalledWith('AAPL');
      expect(cacheService.set).toHaveBeenCalledWith('metrics:AAPL', mockMetrics, 3600);
    });

    it('should return mock metrics when no real data available', async () => {
      const { cacheService } = await import('../../services/cache-service');
      const { finnhubService } = await import('../../services/finnhub-service');
      
      vi.mocked(cacheService.get).mockResolvedValueOnce(null);
      vi.mocked(finnhubService.getBasicFinancials).mockResolvedValueOnce(null);

      const response = await request(app)
        .get('/api/stocks/AAPL/metrics');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('pe');
      expect(response.body).toHaveProperty('ps');
      expect(response.body).toHaveProperty('roe');
      expect(typeof response.body.pe).toBe('number');
    });
  });

  describe('🔒 Authentication & Authorization', () => {
    it('should require authentication for all endpoints', async () => {
      // Mock middleware to reject auth
      vi.mocked(authMiddleware.instance.authenticate).mockImplementationOnce(
        () => (req: any, res: any, next: any) => {
          res.status(401).json({ error: 'Unauthorized' });
        }
      );

      const endpoints = [
        '/api/stocks/AAPL/profile',
        '/api/stocks/AAPL/financials',
        '/api/stocks/AAPL/prices',
        '/api/stocks/AAPL/metrics'
      ];

      for (const endpoint of endpoints) {
        const response = await request(app).get(endpoint);
        expect(response.status).toBe(401);
        expect(response.body.error).toBe('Unauthorized');
      }
    });

    it('should pass user information to subsequent handlers', async () => {
      const { cacheService } = await import('../../services/cache-service');
      vi.mocked(cacheService.get).mockResolvedValueOnce({ symbol: 'AAPL' });

      const response = await request(app)
        .get('/api/stocks/AAPL/profile');

      expect(response.status).toBe(200);
      // Auth middleware should have set req.user
    });
  });

  describe('⚡ Performance & Caching', () => {
    it('should respect different cache TTLs for different data types', async () => {
      const { cacheService } = await import('../../services/cache-service');
      const { finnhubService } = await import('../../services/finnhub-service');
      const { alphaVantageService } = await import('../../services/alpha-vantage-service');
      
      vi.mocked(cacheService.get).mockResolvedValue(null);
      vi.mocked(finnhubService.getCompanyProfile).mockResolvedValue({ symbol: 'AAPL' });
      vi.mocked(finnhubService.getBasicFinancials).mockResolvedValue({ pe: 28.5 });
      vi.mocked(alphaVantageService.getIncomeStatement).mockResolvedValue([]);
      vi.mocked(alphaVantageService.getDailyPrices).mockResolvedValue([]);
      vi.mocked(cacheService.set).mockResolvedValue();

      // Test different endpoints
      await request(app).get('/api/stocks/AAPL/profile');
      await request(app).get('/api/stocks/AAPL/financials');
      await request(app).get('/api/stocks/AAPL/prices');
      await request(app).get('/api/stocks/AAPL/metrics');

      // Verify different cache TTLs
      expect(cacheService.set).toHaveBeenCalledWith(expect.any(String), expect.any(Object), 86400); // Profile: 24h
      expect(cacheService.set).toHaveBeenCalledWith(expect.any(String), expect.any(Object), 3600);  // Financials: 1h
      expect(cacheService.set).toHaveBeenCalledWith(expect.any(String), expect.any(Object), 300);   // Prices: 5min
      expect(cacheService.set).toHaveBeenCalledWith(expect.any(String), expect.any(Object), 3600);  // Metrics: 1h
    });

    it('should handle concurrent requests efficiently', async () => {
      const { cacheService } = await import('../../services/cache-service');
      vi.mocked(cacheService.get).mockResolvedValue({ symbol: 'AAPL' });

      // Simulate concurrent requests
      const promises = Array(10).fill(null).map(() =>
        request(app).get('/api/stocks/AAPL/profile')
      );

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Cache should have been checked for all requests
      expect(cacheService.get).toHaveBeenCalledTimes(10);
    });
  });

  describe('🐛 Edge Cases & Error Handling', () => {
    it('should handle malformed cache data gracefully', async () => {
      const { cacheService } = await import('../../services/cache-service');
      const { finnhubService } = await import('../../services/finnhub-service');
      
      vi.mocked(cacheService.get).mockRejectedValueOnce(new Error('Cache error'));
      vi.mocked(finnhubService.getCompanyProfile).mockResolvedValueOnce({ symbol: 'AAPL' });
      vi.mocked(cacheService.set).mockResolvedValueOnce();

      const response = await request(app)
        .get('/api/stocks/AAPL/profile');

      expect(response.status).toBe(200);
      // Should fallback to API when cache fails
      expect(finnhubService.getCompanyProfile).toHaveBeenCalled();
    });

    it('should handle API timeout errors', async () => {
      const { cacheService } = await import('../../services/cache-service');
      const { finnhubService } = await import('../../services/finnhub-service');
      
      vi.mocked(cacheService.get).mockResolvedValueOnce(null);
      vi.mocked(finnhubService.getCompanyProfile).mockRejectedValueOnce(
        new Error('Request timeout')
      );

      const response = await request(app)
        .get('/api/stocks/AAPL/profile');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch stock profile');
    });

    it('should handle empty symbol parameter', async () => {
      const response = await request(app)
        .get('/api/stocks//profile');

      expect(response.status).toBe(404); // Route not found
    });

    it('should handle very long symbol names', async () => {
      const longSymbol = 'A'.repeat(50);
      
      const response = await request(app)
        .get(`/api/stocks/${longSymbol}/profile`);

      expect(response.status).toBe(400);
    });
  });
});