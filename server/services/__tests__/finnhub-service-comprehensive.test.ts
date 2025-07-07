/**
 * COMPREHENSIVE FINNHUB SERVICE TESTS
 * Tests críticos para cobrir finnhub-service.ts (0% -> target 80%+)
 */

import { describe, it, expect, beforeEach, vi, beforeAll, afterAll } from 'vitest';
import { finnhubService } from '../finnhub-service';

// Mock fetch
global.fetch = vi.fn();
const mockFetch = vi.mocked(fetch);

// Mock environment variables
const originalEnv = process.env;

describe('🚀 Finnhub Service - Comprehensive Tests', () => {
  beforeAll(() => {
    process.env = {
      ...originalEnv,
      FINNHUB_API_KEY: 'test_finnhub_key_123',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  describe('🏢 Company Profile', () => {
    it('should fetch company profile successfully', async () => {
      const mockProfile = {
        country: 'US',
        currency: 'USD',
        exchange: 'NASDAQ',
        ipo: '1980-12-12',
        marketCapitalization: 2800000,
        name: 'Apple Inc',
        phone: '14089961010',
        shareOutstanding: 15728.7,
        ticker: 'AAPL',
        weburl: 'https://www.apple.com/',
        logo: 'https://static.finnhub.io/logo/87cb30d8-80df-11ea-8951-00155d64d4ab.png',
        finnhubIndustry: 'Technology'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProfile
      } as Response);

      const result = await finnhubService.getCompanyProfile('AAPL');

      expect(result).toEqual(mockProfile);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('finnhub.io/api/v1/stock/profile2')
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('symbol=AAPL')
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('token=test_finnhub_key_123')
      );
    });

    it('should handle company profile API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Invalid symbol' })
      } as Response);

      const result = await finnhubService.getCompanyProfile('INVALID');

      expect(result).toBeNull();
    });

    it('should handle network errors for company profile', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await finnhubService.getCompanyProfile('AAPL');

      expect(result).toBeNull();
    });

    it('should validate symbol parameter', async () => {
      const result = await finnhubService.getCompanyProfile('');

      expect(result).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('📊 Basic Financials', () => {
    it('should fetch basic financials successfully', async () => {
      const mockFinancials = {
        metric: {
          '10DayAverageTradingVolume': 52164400,
          '52WeekHigh': 199.62,
          '52WeekLow': 164.08,
          'peNormalizedAnnual': 28.5,
          'beta': 1.25,
          'eps': 6.13,
          'evToEbitda': 21.3,
          'peRatio': 28.5,
          'priceToBookRatio': 45.2,
          'priceToSalesRatio': 7.8,
          'returnOnEquity': 0.175,
          'returnOnAssets': 0.087
        },
        series: {
          annual: {
            currentRatio: [
              { period: '2023-09-30', v: 1.029 },
              { period: '2022-09-24', v: 0.879 }
            ]
          }
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockFinancials
      } as Response);

      const result = await finnhubService.getBasicFinancials('AAPL');

      expect(result).toEqual(mockFinancials);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('finnhub.io/api/v1/stock/metric')
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('symbol=AAPL')
      );
    });

    it('should handle basic financials API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ error: 'Rate limit exceeded' })
      } as Response);

      const result = await finnhubService.getBasicFinancials('AAPL');

      expect(result).toBeNull();
    });

    it('should handle malformed financials response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invalid: 'data' })
      } as Response);

      const result = await finnhubService.getBasicFinancials('AAPL');

      expect(result).toEqual({ invalid: 'data' });
    });

    it('should validate symbol for basic financials', async () => {
      const result = await finnhubService.getBasicFinancials('');

      expect(result).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('📰 Company News', () => {
    it('should fetch company news successfully', async () => {
      const mockNews = [
        {
          id: 106190,
          datetime: 1676994480,
          headline: 'Apple Inc. Q1 Earnings Preview',
          image: 'https://example.com/image.jpg',
          related: 'AAPL',
          source: 'Yahoo',
          summary: 'Apple is expected to report...',
          url: 'https://example.com/news/1'
        },
        {
          id: 106191,
          datetime: 1676990880,
          headline: 'Market Update: Tech Stocks Rise',
          image: 'https://example.com/image2.jpg',
          related: 'AAPL',
          source: 'Reuters',
          summary: 'Tech stocks including Apple...',
          url: 'https://example.com/news/2'
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockNews
      } as Response);

      const result = await finnhubService.getCompanyNews('AAPL');

      expect(result).toEqual(mockNews);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('finnhub.io/api/v1/company-news')
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('symbol=AAPL')
      );
    });

    it('should fetch news with custom date range', async () => {
      const mockNews = [{ id: 1, headline: 'Test news' }];
      const fromDate = '2024-01-01';
      const toDate = '2024-01-31';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockNews
      } as Response);

      const result = await finnhubService.getCompanyNews('AAPL', fromDate, toDate);

      expect(result).toEqual(mockNews);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(`from=${fromDate}`)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(`to=${toDate}`)
      );
    });

    it('should handle empty news response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      } as Response);

      const result = await finnhubService.getCompanyNews('AAPL');

      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle news API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Not found' })
      } as Response);

      const result = await finnhubService.getCompanyNews('INVALID');

      expect(result).toEqual([]);
    });

    it('should handle network errors for news', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network timeout'));

      const result = await finnhubService.getCompanyNews('AAPL');

      expect(result).toEqual([]);
    });

    it('should validate symbol for news', async () => {
      const result = await finnhubService.getCompanyNews('');

      expect(result).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('💰 Quote Data', () => {
    it('should fetch real-time quote successfully', async () => {
      const mockQuote = {
        c: 175.50, // current price
        d: 2.34,   // change
        dp: 1.35,  // percent change
        h: 176.80, // high
        l: 173.20, // low
        o: 174.00, // open
        pc: 173.16, // previous close
        t: 1676994480 // timestamp
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockQuote
      } as Response);

      const result = await finnhubService.getQuote('AAPL');

      expect(result).toEqual(mockQuote);
      expect(result?.c).toBe(175.50);
      expect(result?.d).toBe(2.34);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('finnhub.io/api/v1/quote')
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('symbol=AAPL')
      );
    });

    it('should handle quote API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' })
      } as Response);

      const result = await finnhubService.getQuote('AAPL');

      expect(result).toBeNull();
    });

    it('should validate symbol for quote', async () => {
      const result = await finnhubService.getQuote('');

      expect(result).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('🔍 Symbol Search', () => {
    it('should search symbols successfully', async () => {
      const mockSearchResult = {
        count: 2,
        result: [
          {
            description: 'Apple Inc',
            displaySymbol: 'AAPL',
            symbol: 'AAPL',
            type: 'Common Stock'
          },
          {
            description: 'Applied Materials Inc',
            displaySymbol: 'AMAT',
            symbol: 'AMAT',
            type: 'Common Stock'
          }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSearchResult
      } as Response);

      const result = await finnhubService.searchSymbol('APP');

      expect(result).toEqual(mockSearchResult);
      expect(result?.count).toBe(2);
      expect(result?.result).toHaveLength(2);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('finnhub.io/api/v1/search')
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('q=APP')
      );
    });

    it('should handle empty search results', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ count: 0, result: [] })
      } as Response);

      const result = await finnhubService.searchSymbol('NONEXISTENT');

      expect(result?.count).toBe(0);
      expect(result?.result).toEqual([]);
    });

    it('should handle search API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' })
      } as Response);

      const result = await finnhubService.searchSymbol('TEST');

      expect(result).toBeNull();
    });

    it('should validate search query', async () => {
      const result = await finnhubService.searchSymbol('');

      expect(result).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('⚙️ Configuration & Error Handling', () => {
    it('should handle missing API key', async () => {
      // Temporarily remove API key
      delete process.env.FINNHUB_API_KEY;

      const result = await finnhubService.getCompanyProfile('AAPL');

      expect(result).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();

      // Restore API key
      process.env.FINNHUB_API_KEY = 'test_finnhub_key_123';
    });

    it('should handle rate limiting (429 error)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers({ 'retry-after': '60' }),
        json: async () => ({ error: 'Rate limit exceeded' })
      } as Response);

      const result = await finnhubService.getQuote('AAPL');

      expect(result).toBeNull();
    });

    it('should handle API key validation error (401)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Invalid API key' })
      } as Response);

      const result = await finnhubService.getBasicFinancials('AAPL');

      expect(result).toBeNull();
    });

    it('should handle JSON parsing errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        }
      } as Response);

      const result = await finnhubService.getCompanyProfile('AAPL');

      expect(result).toBeNull();
    });

    it('should handle fetch network errors', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      const result = await finnhubService.getQuote('AAPL');

      expect(result).toBeNull();
    });

    it('should handle timeout errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Request timeout'));

      const result = await finnhubService.getCompanyNews('AAPL');

      expect(result).toEqual([]);
    });
  });

  describe('🔄 URL Building & Parameter Handling', () => {
    it('should build URLs correctly for different endpoints', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({})
      } as Response);

      // Test different endpoints
      await finnhubService.getCompanyProfile('AAPL');
      await finnhubService.getBasicFinancials('MSFT');
      await finnhubService.getQuote('GOOGL');
      await finnhubService.searchSymbol('TESLA');

      const calls = mockFetch.mock.calls;
      
      // Verify endpoint URLs
      expect(calls[0][0]).toContain('/stock/profile2');
      expect(calls[1][0]).toContain('/stock/metric');
      expect(calls[2][0]).toContain('/quote');
      expect(calls[3][0]).toContain('/search');

      // Verify parameters
      expect(calls[0][0]).toContain('symbol=AAPL');
      expect(calls[1][0]).toContain('symbol=MSFT');
      expect(calls[2][0]).toContain('symbol=GOOGL');
      expect(calls[3][0]).toContain('q=TESLA');
    });

    it('should handle special characters in symbols', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({})
      } as Response);

      await finnhubService.getQuote('BRK.A');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('symbol=BRK.A')
      );
    });

    it('should handle URL encoding properly', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ count: 0, result: [] })
      } as Response);

      await finnhubService.searchSymbol('test query with spaces');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('q=test%20query%20with%20spaces')
      );
    });
  });

  describe('🧪 Edge Cases & Data Validation', () => {
    it('should handle null/undefined responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => null
      } as Response);

      const result = await finnhubService.getCompanyProfile('AAPL');

      expect(result).toBeNull();
    });

    it('should handle empty object responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      } as Response);

      const result = await finnhubService.getBasicFinancials('AAPL');

      expect(result).toEqual({});
    });

    it('should handle very long symbol names', async () => {
      const longSymbol = 'A'.repeat(100);
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      } as Response);

      const result = await finnhubService.getQuote(longSymbol);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(`symbol=${longSymbol}`)
      );
    });

    it('should handle concurrent requests', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ test: 'data' })
      } as Response);

      // Make multiple concurrent requests
      const promises = [
        finnhubService.getQuote('AAPL'),
        finnhubService.getQuote('MSFT'),
        finnhubService.getQuote('GOOGL')
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      expect(mockFetch).toHaveBeenCalledTimes(3);
      results.forEach(result => {
        expect(result).toEqual({ test: 'data' });
      });
    });
  });
});