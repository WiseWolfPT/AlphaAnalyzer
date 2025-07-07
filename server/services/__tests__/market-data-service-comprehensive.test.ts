/**
 * COMPREHENSIVE MARKET DATA SERVICE TESTS
 * Testes críticos para provider rotation, quota management e cache
 */

import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import { ServerMarketDataService } from '../market-data-service';
import { globalCache } from '../../cache/intelligent-cache-manager';

// Mock global fetch
global.fetch = vi.fn();
const mockFetch = vi.mocked(fetch);

// Mock Yahoo Finance Service
vi.mock('../yahoo-finance-service', () => ({
  yahooFinanceService: {
    getQuote: vi.fn(),
  }
}));

// Mock intelligent cache
vi.mock('../../cache/intelligent-cache-manager', () => ({
  globalCache: {
    get: vi.fn(),
    set: vi.fn(),
    getStats: vi.fn().mockReturnValue({
      hits: 0,
      misses: 0,
      size: 0
    }),
  },
  DataType: {
    REAL_TIME_PRICE: 'REAL_TIME_PRICE',
  },
  CacheKeys: {
    realtimePrice: (symbol: string) => `realtime:${symbol}`,
  },
}));

// Mock environment variables
const originalEnv = process.env;

describe('🚀 ServerMarketDataService - Comprehensive Tests', () => {
  let service: ServerMarketDataService;

  beforeAll(() => {
    // Set up environment variables for testing
    process.env = {
      ...originalEnv,
      FINNHUB_API_KEY: 'test_finnhub_key',
      ALPHA_VANTAGE_API_KEY: 'test_alpha_key',
      FMP_API_KEY: 'test_fmp_key',
      TWELVE_DATA_API_KEY: 'test_twelve_key',
    };
  });

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ServerMarketDataService();
    mockFetch.mockClear();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('🔄 Provider Rotation & Fallback Logic', () => {
    it('should prioritize providers with real API keys', async () => {
      // Mock cache miss
      vi.mocked(globalCache.get).mockReturnValueOnce(null);

      // Mock successful TwelveData response (first in priority with real key)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          symbol: 'AAPL',
          close: '175.50',
          change: '2.34',
          percent_change: '1.35',
          volume: '45234567'
        })
      });

      const result = await service.getRealTimeQuote('AAPL');

      expect(result).toBeDefined();
      expect(result?.symbol).toBe('AAPL');
      expect(result?.price).toBe(175.50);
      expect(result?.provider).toBe('twelvedata');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('twelvedata.com')
      );
    });

    it('should fallback to next provider when first fails', async () => {
      vi.mocked(globalCache.get).mockReturnValueOnce(null);

      // Mock TwelveData failure
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          json: async () => ({ message: 'Rate limit exceeded' })
        })
        // Mock FMP success
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ([{
            symbol: 'AAPL',
            price: 175.50,
            change: 2.34,
            changesPercentage: 1.35,
            volume: 45234567
          }])
        });

      const result = await service.getRealTimeQuote('AAPL');

      expect(result).toBeDefined();
      expect(result?.provider).toBe('fmp');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should fallback to Yahoo Finance when all API providers fail', async () => {
      vi.mocked(globalCache.get).mockReturnValueOnce(null);

      // Mock all API providers failing
      mockFetch.mockRejectedValue(new Error('API Error'));

      const { yahooFinanceService } = await import('../yahoo-finance-service');
      vi.mocked(yahooFinanceService.getQuote).mockResolvedValueOnce({
        id: 0,
        symbol: 'AAPL',
        name: 'Apple Inc.',
        price: 175.50,
        change: 2.34,
        changePercent: 1.35,
        volume: 45234567,
        high: 176.80,
        low: 173.20,
        open: 174.00,
        previousClose: 173.16,
        marketCap: '2800000000000',
        week52High: 199.62,
        week52Low: 164.08,
        sector: 'Technology',
        industry: null,
        eps: null,
        peRatio: null,
        logo: null,
        lastUpdated: new Date()
      });

      const result = await service.getRealTimeQuote('AAPL');

      expect(result).toBeDefined();
      expect(result?.provider).toBe('yahoo');
      expect(yahooFinanceService.getQuote).toHaveBeenCalledWith('AAPL');
    });

    it('should return null when all providers fail', async () => {
      vi.mocked(globalCache.get).mockReturnValueOnce(null);

      // Mock all providers failing
      mockFetch.mockRejectedValue(new Error('API Error'));

      const { yahooFinanceService } = await import('../yahoo-finance-service');
      vi.mocked(yahooFinanceService.getQuote).mockRejectedValueOnce(new Error('Yahoo failed'));

      const result = await service.getRealTimeQuote('AAPL');

      expect(result).toBeNull();
    });
  });

  describe('📊 Quota Management', () => {
    it('should initialize quota tracking for all providers', () => {
      const quotaStatus = service.getQuotaStatus();

      expect(quotaStatus.has('twelvedata')).toBe(true);
      expect(quotaStatus.has('fmp')).toBe(true);
      expect(quotaStatus.has('finnhub')).toBe(true);
      expect(quotaStatus.has('alphavantage')).toBe(true);

      const twelvDataQuota = quotaStatus.get('twelvedata');
      expect(twelvDataQuota?.limit).toBe(800);
      expect(twelvDataQuota?.remaining).toBe(800);
      expect(twelvDataQuota?.used).toBe(0);
    });

    it('should skip providers with exhausted quotas', async () => {
      vi.mocked(globalCache.get).mockReturnValueOnce(null);

      // Exhaust TwelveData quota
      const quotaStatus = service.getQuotaStatus();
      const twelvDataQuota = quotaStatus.get('twelvedata');
      if (twelvDataQuota) {
        twelvDataQuota.remaining = 0;
        twelvDataQuota.used = twelvDataQuota.limit;
      }

      // Mock FMP success (should be tried after TwelveData is skipped)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ([{
          symbol: 'AAPL',
          price: 175.50,
          change: 2.34
        }])
      });

      const result = await service.getRealTimeQuote('AAPL');

      expect(result?.provider).toBe('fmp');
      // Should skip TwelveData and go directly to FMP
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('financialmodelingprep.com')
      );
    });

    it('should increment quota usage on successful API calls', async () => {
      vi.mocked(globalCache.get).mockReturnValueOnce(null);

      const initialQuota = service.getQuotaStatus().get('twelvedata');
      const initialRemaining = initialQuota?.remaining || 0;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          symbol: 'AAPL',
          close: '175.50'
        })
      });

      await service.getRealTimeQuote('AAPL');

      const updatedQuota = service.getQuotaStatus().get('twelvedata');
      expect(updatedQuota?.remaining).toBe(initialRemaining - 1);
      expect(updatedQuota?.used).toBe(1);
    });

    it('should not increment quota on failed API calls', async () => {
      vi.mocked(globalCache.get).mockReturnValueOnce(null);

      const initialQuota = service.getQuotaStatus().get('twelvedata');
      const initialRemaining = initialQuota?.remaining || 0;

      mockFetch.mockRejectedValueOnce(new Error('API Error'));

      // Mock Yahoo as fallback to avoid null result
      const { yahooFinanceService } = await import('../yahoo-finance-service');
      vi.mocked(yahooFinanceService.getQuote).mockResolvedValueOnce({
        id: 0,
        symbol: 'AAPL',
        name: 'Apple Inc.',
        price: 175.50,
        change: 2.34,
        changePercent: 1.35,
        volume: 45234567,
        high: 0,
        low: 0,
        open: 0,
        previousClose: 0,
        marketCap: '0',
        week52High: 0,
        week52Low: 0,
        sector: '',
        industry: null,
        eps: null,
        peRatio: null,
        logo: null,
        lastUpdated: new Date()
      });

      await service.getRealTimeQuote('AAPL');

      const finalQuota = service.getQuotaStatus().get('twelvedata');
      expect(finalQuota?.remaining).toBe(initialRemaining); // Should not change
      expect(finalQuota?.used).toBe(0);
    });
  });

  describe('💾 Intelligent Caching', () => {
    it('should return cached data when available', async () => {
      const cachedData = {
        id: 0,
        symbol: 'AAPL',
        name: 'Apple Inc.',
        price: 175.50,
        change: 2.34,
        changePercent: 1.35,
        volume: 45234567,
        high: 176.80,
        low: 173.20,
        open: 174.00,
        previousClose: 173.16,
        marketCap: '2800000000000',
        week52High: 199.62,
        week52Low: 164.08,
        sector: 'Technology',
        industry: null,
        eps: null,
        peRatio: null,
        logo: null,
        lastUpdated: new Date(),
        provider: 'cache'
      };

      vi.mocked(globalCache.get).mockReturnValueOnce(cachedData);

      const result = await service.getRealTimeQuote('AAPL');

      expect(result).toEqual(cachedData);
      expect(mockFetch).not.toHaveBeenCalled();
      expect(globalCache.get).toHaveBeenCalledWith('realtime:AAPL', 'REAL_TIME_PRICE');
    });

    it('should cache successful API responses', async () => {
      vi.mocked(globalCache.get).mockReturnValueOnce(null);

      const mockResponse = {
        symbol: 'AAPL',
        close: '175.50',
        change: '2.34',
        percent_change: '1.35',
        volume: '45234567'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await service.getRealTimeQuote('AAPL');

      expect(globalCache.set).toHaveBeenCalledWith(
        'realtime:AAPL',
        expect.objectContaining({
          symbol: 'AAPL',
          price: 175.50,
          provider: 'twelvedata'
        }),
        'REAL_TIME_PRICE',
        'twelvedata'
      );
    });

    it('should not cache failed responses', async () => {
      vi.mocked(globalCache.get).mockReturnValueOnce(null);

      mockFetch.mockRejectedValue(new Error('API Error'));

      const { yahooFinanceService } = await import('../yahoo-finance-service');
      vi.mocked(yahooFinanceService.getQuote).mockRejectedValueOnce(new Error('All failed'));

      await service.getRealTimeQuote('AAPL');

      expect(globalCache.set).not.toHaveBeenCalled();
    });
  });

  describe('🔢 Batch Operations', () => {
    it('should handle batch quote requests', async () => {
      const symbols = ['AAPL', 'MSFT', 'GOOGL'];
      
      // Mock individual getRealTimeQuote calls
      vi.spyOn(service, 'getRealTimeQuote')
        .mockResolvedValueOnce({
          id: 0,
          symbol: 'AAPL',
          name: 'Apple Inc.',
          price: 175.50,
          change: 2.34,
          changePercent: 1.35,
          volume: 45234567,
          high: 0,
          low: 0,
          open: 0,
          previousClose: 0,
          marketCap: '0',
          week52High: 0,
          week52Low: 0,
          sector: '',
          industry: null,
          eps: null,
          peRatio: null,
          logo: null,
          lastUpdated: new Date()
        })
        .mockResolvedValueOnce({
          id: 0,
          symbol: 'MSFT',
          name: 'Microsoft Corp.',
          price: 380.25,
          change: -1.25,
          changePercent: -0.33,
          volume: 23456789,
          high: 0,
          low: 0,
          open: 0,
          previousClose: 0,
          marketCap: '0',
          week52High: 0,
          week52Low: 0,
          sector: '',
          industry: null,
          eps: null,
          peRatio: null,
          logo: null,
          lastUpdated: new Date()
        })
        .mockResolvedValueOnce(null); // GOOGL fails

      const results = await service.getBatchQuotes(symbols);

      expect(results).toHaveLength(2); // Should filter out null results
      expect(results[0].symbol).toBe('AAPL');
      expect(results[1].symbol).toBe('MSFT');
    });

    it('should handle empty batch requests', async () => {
      const results = await service.getBatchQuotes([]);
      expect(results).toEqual([]);
    });
  });

  describe('🔧 Provider-Specific Logic', () => {
    describe('TwelveData Provider', () => {
      it('should handle TwelveData API response format', async () => {
        vi.mocked(globalCache.get).mockReturnValueOnce(null);

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            symbol: 'AAPL',
            name: 'Apple Inc.',
            close: '175.50',
            previous_close: '173.16',
            change: '2.34',
            percent_change: '1.35',
            volume: '45234567',
            high: '176.80',
            low: '173.20',
            open: '174.00',
            fifty_two_week: {
              high: '199.62',
              low: '164.08'
            }
          })
        });

        const result = await service.getRealTimeQuote('AAPL');

        expect(result).toMatchObject({
          symbol: 'AAPL',
          name: 'Apple Inc.',
          price: 175.50,
          previousClose: 173.16,
          change: 2.34,
          changePercent: 1.35,
          volume: 45234567,
          high: 176.80,
          low: 173.20,
          open: 174.00,
          week52High: 199.62,
          week52Low: 164.08
        });
      });

      it('should handle TwelveData error responses', async () => {
        vi.mocked(globalCache.get).mockReturnValueOnce(null);

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            code: 400,
            message: 'Invalid symbol'
          })
        });

        // Mock fallback provider
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ([{
            symbol: 'AAPL',
            price: 175.50
          }])
        });

        const result = await service.getRealTimeQuote('AAPL');

        expect(result?.provider).toBe('fmp'); // Should fallback
      });
    });

    describe('Finnhub Provider', () => {
      it('should handle Finnhub API response format', async () => {
        vi.mocked(globalCache.get).mockReturnValueOnce(null);

        // Skip TwelveData by exhausting quota
        const quotaStatus = service.getQuotaStatus();
        const twelvDataQuota = quotaStatus.get('twelvedata');
        if (twelvDataQuota) twelvDataQuota.remaining = 0;

        // Skip FMP by exhausting quota
        const fmpQuota = quotaStatus.get('fmp');
        if (fmpQuota) fmpQuota.remaining = 0;

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            c: 175.50, // current price
            d: 2.34,   // change
            dp: 1.35,  // percent change
            h: 176.80, // high
            l: 173.20, // low
            o: 174.00, // open
            pc: 173.16 // previous close
          })
        });

        const result = await service.getRealTimeQuote('AAPL');

        expect(result).toMatchObject({
          symbol: 'AAPL',
          price: 175.50,
          change: 2.34,
          changePercent: 1.35,
          high: 176.80,
          low: 173.20,
          open: 174.00,
          previousClose: 173.16
        });
      });
    });

    describe('Alpha Vantage Provider', () => {
      it('should handle Alpha Vantage API response format', async () => {
        vi.mocked(globalCache.get).mockReturnValueOnce(null);

        // Exhaust other quotas to force Alpha Vantage
        const quotaStatus = service.getQuotaStatus();
        ['twelvedata', 'fmp', 'finnhub'].forEach(provider => {
          const quota = quotaStatus.get(provider);
          if (quota) quota.remaining = 0;
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            'Global Quote': {
              '01. symbol': 'AAPL',
              '02. open': '174.00',
              '03. high': '176.80',
              '04. low': '173.20',
              '05. price': '175.50',
              '06. volume': '45234567',
              '07. latest trading day': '2024-01-15',
              '08. previous close': '173.16',
              '09. change': '2.34',
              '10. change percent': '1.35%'
            }
          })
        });

        const result = await service.getRealTimeQuote('AAPL');

        expect(result).toMatchObject({
          symbol: 'AAPL',
          price: 175.50,
          open: 174.00,
          high: 176.80,
          low: 173.20,
          volume: 45234567,
          previousClose: 173.16,
          change: 2.34,
          changePercent: 1.35
        });
      });
    });
  });

  describe('🔍 API Status & Testing', () => {
    it('should provide API status information', () => {
      const status = service.getApiStatus();

      expect(status.apiKeys).toBeDefined();
      expect(status.quotas).toBeDefined();
      expect(status.cache).toBeDefined();

      expect(status.apiKeys.finnhub.configured).toBe(true);
      expect(status.apiKeys.finnhub.isReal).toBe(true);
      expect(status.apiKeys.finnhub.masked).toBe('test_fin...');
    });

    it('should test all API connections', async () => {
      // Mock Yahoo Finance
      const { yahooFinanceService } = await import('../yahoo-finance-service');
      vi.mocked(yahooFinanceService.getQuote).mockResolvedValueOnce({
        id: 0,
        symbol: 'AAPL',
        name: 'Apple Inc.',
        price: 175.50,
        change: 0,
        changePercent: 0,
        volume: 0,
        high: 0,
        low: 0,
        open: 0,
        previousClose: 0,
        marketCap: '0',
        week52High: 0,
        week52Low: 0,
        sector: '',
        industry: null,
        eps: null,
        peRatio: null,
        logo: null,
        lastUpdated: new Date()
      });

      // Mock API providers
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ symbol: 'AAPL' }) }) // TwelveData
        .mockResolvedValueOnce({ ok: true, json: async () => [{ symbol: 'AAPL' }] }) // FMP
        .mockResolvedValueOnce({ ok: true, json: async () => ({ c: 175.50 }) }) // Finnhub
        .mockResolvedValueOnce({ ok: true, json: async () => ({ 'Global Quote': { '01. symbol': 'AAPL' } }) }); // Alpha Vantage

      const results = await service.testApiConnections();

      expect(results.yahoo.status).toBe('success');
      expect(results.twelvedata.status).toBe('success');
      expect(results.fmp.status).toBe('success');
      expect(results.finnhub.status).toBe('success');
      expect(results.alphavantage.status).toBe('success');
    });

    it('should handle API connection failures in testing', async () => {
      // Mock all providers failing
      mockFetch.mockRejectedValue(new Error('Connection failed'));

      const { yahooFinanceService } = await import('../yahoo-finance-service');
      vi.mocked(yahooFinanceService.getQuote).mockRejectedValueOnce(new Error('Yahoo failed'));

      const results = await service.testApiConnections();

      expect(results.yahoo.status).toBe('failed');
      expect(results.twelvedata.status).toBe('failed');
      expect(results.fmp.status).toBe('failed');
      expect(results.finnhub.status).toBe('failed');
      expect(results.alphavantage.status).toBe('failed');
    });
  });

  describe('🚀 Cache Warming', () => {
    it('should warm cache for multiple symbols', async () => {
      const symbols = ['AAPL', 'MSFT', 'GOOGL'];
      
      vi.spyOn(service, 'getRealTimeQuote').mockImplementation(async (symbol) => ({
        id: 0,
        symbol,
        name: `${symbol} Inc.`,
        price: 100,
        change: 0,
        changePercent: 0,
        volume: 0,
        high: 0,
        low: 0,
        open: 0,
        previousClose: 0,
        marketCap: '0',
        week52High: 0,
        week52Low: 0,
        sector: '',
        industry: null,
        eps: null,
        peRatio: null,
        logo: null,
        lastUpdated: new Date()
      }));

      // Mock global cache warmCache method
      vi.mocked(globalCache).warmCache = vi.fn().mockResolvedValueOnce(undefined);

      await service.warmCache(symbols);

      // Should call getRealTimeQuote for each symbol
      expect(service.getRealTimeQuote).toHaveBeenCalledTimes(symbols.length);
      symbols.forEach(symbol => {
        expect(service.getRealTimeQuote).toHaveBeenCalledWith(symbol);
      });

      // Should also warm the global cache
      expect(globalCache.warmCache).toHaveBeenCalledWith(symbols);
    });
  });

  describe('🧪 Edge Cases & Error Scenarios', () => {
    it('should handle network timeouts gracefully', async () => {
      vi.mocked(globalCache.get).mockReturnValueOnce(null);

      mockFetch.mockRejectedValueOnce(new Error('Request timeout'));

      const { yahooFinanceService } = await import('../yahoo-finance-service');
      vi.mocked(yahooFinanceService.getQuote).mockResolvedValueOnce({
        id: 0,
        symbol: 'AAPL',
        name: 'Apple Inc.',
        price: 175.50,
        change: 0,
        changePercent: 0,
        volume: 0,
        high: 0,
        low: 0,
        open: 0,
        previousClose: 0,
        marketCap: '0',
        week52High: 0,
        week52Low: 0,
        sector: '',
        industry: null,
        eps: null,
        peRatio: null,
        logo: null,
        lastUpdated: new Date()
      });

      const result = await service.getRealTimeQuote('AAPL');

      expect(result?.provider).toBe('yahoo');
    });

    it('should handle malformed API responses', async () => {
      vi.mocked(globalCache.get).mockReturnValueOnce(null);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invalid: 'response' })
      });

      const { yahooFinanceService } = await import('../yahoo-finance-service');
      vi.mocked(yahooFinanceService.getQuote).mockResolvedValueOnce({
        id: 0,
        symbol: 'AAPL',
        name: 'Apple Inc.',
        price: 175.50,
        change: 0,
        changePercent: 0,
        volume: 0,
        high: 0,
        low: 0,
        open: 0,
        previousClose: 0,
        marketCap: '0',
        week52High: 0,
        week52Low: 0,
        sector: '',
        industry: null,
        eps: null,
        peRatio: null,
        logo: null,
        lastUpdated: new Date()
      });

      const result = await service.getRealTimeQuote('AAPL');

      expect(result?.provider).toBe('yahoo'); // Should fallback
    });

    it('should handle invalid symbols gracefully', async () => {
      vi.mocked(globalCache.get).mockReturnValueOnce(null);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Symbol not found' })
      });

      const { yahooFinanceService } = await import('../yahoo-finance-service');
      vi.mocked(yahooFinanceService.getQuote).mockRejectedValueOnce(new Error('Invalid symbol'));

      const result = await service.getRealTimeQuote('INVALID');

      expect(result).toBeNull();
    });
  });
});