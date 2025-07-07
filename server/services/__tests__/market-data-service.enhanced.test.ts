/**
 * Comprehensive test suite for ServerMarketDataService
 * Covers API rotation, quota management, caching, and error handling
 */
import { ServerMarketDataService } from '../market-data-service';
import { yahooFinanceService } from '../yahoo-finance-service';
import { globalCache } from '../../cache/intelligent-cache-manager';

// Mock external dependencies
jest.mock('../yahoo-finance-service');
jest.mock('../../cache/intelligent-cache-manager');

// Mock fetch globally
global.fetch = jest.fn();

describe('ServerMarketDataService - Critical Business Flows', () => {
  let service: ServerMarketDataService;
  let mockFetch: jest.MockedFunction<typeof fetch>;
  let mockYahooService: jest.Mocked<typeof yahooFinanceService>;
  let mockGlobalCache: jest.Mocked<typeof globalCache>;

  // Mock environment variables for testing
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Set up clean environment
    process.env = {
      ...originalEnv,
      FINNHUB_API_KEY: 'test_finnhub_key_12345',
      ALPHA_VANTAGE_API_KEY: 'test_alphavantage_key_12345',
      FMP_API_KEY: 'test_fmp_key_12345',
      TWELVE_DATA_API_KEY: 'test_twelvedata_key_12345',
    };

    mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
    mockYahooService = yahooFinanceService as jest.Mocked<typeof yahooFinanceService>;
    mockGlobalCache = globalCache as jest.Mocked<typeof globalCache>;

    service = new ServerMarketDataService();
  });

  afterEach(() => {
    jest.useRealTimers();
    process.env = originalEnv;
  });

  describe('API Provider Rotation & Fallback', () => {
    it('should use providers in priority order (real keys first)', async () => {
      // Mock successful response from first provider (Twelve Data)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          symbol: 'AAPL',
          name: 'Apple Inc.',
          close: '150.00',
          previous_close: '148.00',
          change: '2.00',
          percent_change: '1.35',
          volume: '50000000'
        })
      } as Response);

      mockGlobalCache.get.mockReturnValue(null);

      const result = await service.getRealTimeQuote('AAPL');

      expect(result).toBeDefined();
      expect(result?.symbol).toBe('AAPL');
      expect(result?.provider).toBe('twelvedata');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('api.twelvedata.com'),
        undefined
      );
    });

    it('should fallback to next provider when first fails', async () => {
      // First provider (Twelve Data) fails
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      
      // Second provider (FMP) succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ([{
          symbol: 'AAPL',
          name: 'Apple Inc.',
          price: 150.00,
          previousClose: 148.00,
          change: 2.00,
          changesPercentage: 1.35,
          volume: 50000000
        }])
      } as Response);

      mockGlobalCache.get.mockReturnValue(null);

      const result = await service.getRealTimeQuote('AAPL');

      expect(result).toBeDefined();
      expect(result?.provider).toBe('fmp');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should use Yahoo Finance as final fallback', async () => {
      // All API providers fail
      mockFetch.mockRejectedValue(new Error('All APIs down'));
      
      // Yahoo Finance succeeds
      mockYahooService.getQuote.mockResolvedValue({
        id: 0,
        symbol: 'AAPL',
        name: 'Apple Inc.',
        price: 150.00,
        previousClose: 148.00,
        change: 2.00,
        changePercent: 1.35,
        volume: 50000000,
        high: 152.00,
        low: 147.00,
        open: 149.00,
        marketCap: '2500000000000',
        week52High: 180.00,
        week52Low: 120.00,
        sector: 'Technology',
        industry: null,
        eps: null,
        peRatio: null,
        logo: null,
        lastUpdated: new Date()
      });

      mockGlobalCache.get.mockReturnValue(null);

      const result = await service.getRealTimeQuote('AAPL');

      expect(result).toBeDefined();
      expect(result?.provider).toBe('yahoo');
      expect(mockYahooService.getQuote).toHaveBeenCalledWith('AAPL');
    });

    it('should return null when all providers fail including Yahoo', async () => {
      mockFetch.mockRejectedValue(new Error('All APIs down'));
      mockYahooService.getQuote.mockRejectedValue(new Error('Yahoo also down'));
      mockGlobalCache.get.mockReturnValue(null);

      const result = await service.getRealTimeQuote('AAPL');

      expect(result).toBeNull();
    });
  });

  describe('Quota Management & Limits', () => {
    it('should skip providers that have exhausted quotas', async () => {
      // Exhaust quota for first provider
      const quotaStatus = service.getQuotaStatus();
      const twelveDataQuota = quotaStatus.get('twelvedata');
      if (twelveDataQuota) {
        twelveDataQuota.remaining = 0;
      }

      // Second provider should be used
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ([{
          symbol: 'AAPL',
          price: 150.00
        }])
      } as Response);

      mockGlobalCache.get.mockReturnValue(null);

      const result = await service.getRealTimeQuote('AAPL');

      expect(result?.provider).toBe('fmp');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('financialmodelingprep.com'),
        undefined
      );
    });

    it('should increment quota usage on successful API calls', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          symbol: 'AAPL',
          close: '150.00'
        })
      } as Response);

      mockGlobalCache.get.mockReturnValue(null);

      const initialQuota = service.getQuotaStatus().get('twelvedata')?.used || 0;
      
      await service.getRealTimeQuote('AAPL');

      const finalQuota = service.getQuotaStatus().get('twelvedata')?.used || 0;
      expect(finalQuota).toBe(initialQuota + 1);
    });

    it('should reset quotas at next midnight', () => {
      const quotaStatus = service.getQuotaStatus();
      const provider = quotaStatus.get('twelvedata');
      
      expect(provider).toBeDefined();
      expect(provider?.resetAt.getHours()).toBe(0);
      expect(provider?.resetAt.getMinutes()).toBe(0);
      expect(provider?.resetAt.getSeconds()).toBe(0);
    });
  });

  describe('Caching Behavior', () => {
    it('should return cached data when available', async () => {
      const cachedData = {
        id: 0,
        symbol: 'AAPL',
        name: 'Apple Inc.',
        price: 149.00,
        provider: 'cache'
      };

      mockGlobalCache.get.mockReturnValue(cachedData);

      const result = await service.getRealTimeQuote('AAPL');

      expect(result).toEqual(cachedData);
      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockYahooService.getQuote).not.toHaveBeenCalled();
    });

    it('should cache successful API responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          symbol: 'AAPL',
          close: '150.00'
        })
      } as Response);

      mockGlobalCache.get.mockReturnValue(null);

      await service.getRealTimeQuote('AAPL');

      expect(mockGlobalCache.set).toHaveBeenCalledWith(
        expect.stringContaining('realtime:AAPL'),
        expect.objectContaining({
          symbol: 'AAPL',
          provider: 'twelvedata'
        }),
        expect.any(String), // DataType
        'twelvedata'
      );
    });

    it('should handle cache warming for multiple symbols', async () => {
      const symbols = ['AAPL', 'MSFT', 'GOOGL'];
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          symbol: 'TEST',
          close: '100.00'
        })
      } as Response);

      mockGlobalCache.get.mockReturnValue(null);
      mockGlobalCache.warmCache.mockResolvedValue();

      await service.warmCache(symbols);

      expect(mockGlobalCache.warmCache).toHaveBeenCalledWith(symbols);
      expect(mockFetch).toHaveBeenCalledTimes(symbols.length);
    });
  });

  describe('Data Normalization & Validation', () => {
    it('should handle Twelve Data API response format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          symbol: 'AAPL',
          name: 'Apple Inc.',
          close: '150.25',
          previous_close: '148.50',
          change: '1.75',
          percent_change: '1.18',
          volume: '52000000',
          high: '151.00',
          low: '149.00',
          open: '149.50',
          fifty_two_week: {
            high: '180.00',
            low: '120.00'
          }
        })
      } as Response);

      mockGlobalCache.get.mockReturnValue(null);

      const result = await service.getRealTimeQuote('AAPL');

      expect(result).toMatchObject({
        symbol: 'AAPL',
        name: 'Apple Inc.',
        price: 150.25,
        previousClose: 148.50,
        change: 1.75,
        changePercent: 1.18,
        volume: 52000000,
        high: 151.00,
        low: 149.00,
        open: 149.50,
        week52High: 180.00,
        week52Low: 120.00
      });
    });

    it('should handle FMP API response format', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Twelve Data down'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ([{
            symbol: 'AAPL',
            name: 'Apple Inc.',
            price: 150.25,
            previousClose: 148.50,
            change: 1.75,
            changesPercentage: 1.18,
            volume: 52000000,
            dayHigh: 151.00,
            dayLow: 149.00,
            open: 149.50,
            marketCap: 2500000000000,
            yearHigh: 180.00,
            yearLow: 120.00,
            eps: 6.05,
            pe: 24.8
          }])
        } as Response);

      mockGlobalCache.get.mockReturnValue(null);

      const result = await service.getRealTimeQuote('AAPL');

      expect(result).toMatchObject({
        symbol: 'AAPL',
        name: 'Apple Inc.',
        price: 150.25,
        eps: 6.05,
        peRatio: 24.8,
        marketCap: '2500000000000'
      });
    });

    it('should handle invalid or empty API responses', async () => {
      const invalidResponses = [
        { json: async () => ({}) }, // Empty object
        { json: async () => null }, // Null response
        { json: async () => ({ error: 'Invalid symbol' }) }, // Error response
        { json: async () => [] } // Empty array (for FMP)
      ];

      mockGlobalCache.get.mockReturnValue(null);

      for (const response of invalidResponses) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          ...response
        } as Response);

        const result = await service.getRealTimeQuote('AAPL');
        expect(result).toBeNull();
      }
    });

    it('should handle malformed JSON responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        }
      } as Response);

      mockGlobalCache.get.mockReturnValue(null);

      const result = await service.getRealTimeQuote('AAPL');
      expect(result).toBeNull();
    });
  });

  describe('Error Handling & Recovery', () => {
    it('should handle HTTP error responses', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests'
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ([{
            symbol: 'AAPL',
            price: 150.00
          }])
        } as Response);

      mockGlobalCache.get.mockReturnValue(null);

      const result = await service.getRealTimeQuote('AAPL');

      expect(result?.provider).toBe('fmp');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should handle network timeouts', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Request timeout'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ([{
            symbol: 'AAPL',
            price: 150.00
          }])
        } as Response);

      mockGlobalCache.get.mockReturnValue(null);

      const result = await service.getRealTimeQuote('AAPL');

      expect(result?.provider).toBe('fmp');
    });

    it('should handle API key validation errors', async () => {
      // Mock response indicating invalid API key
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          code: 401,
          message: 'Invalid API key'
        })
      } as Response);

      mockGlobalCache.get.mockReturnValue(null);

      const result = await service.getRealTimeQuote('AAPL');
      expect(result).toBeNull();
    });
  });

  describe('Batch Operations', () => {
    it('should fetch quotes for multiple symbols in parallel', async () => {
      const symbols = ['AAPL', 'MSFT', 'GOOGL'];
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          symbol: 'TEST',
          close: '100.00'
        })
      } as Response);

      mockGlobalCache.get.mockReturnValue(null);

      const results = await service.getBatchQuotes(symbols);

      expect(results).toHaveLength(symbols.length);
      expect(mockFetch).toHaveBeenCalledTimes(symbols.length);
    });

    it('should filter out null results from batch operations', async () => {
      const symbols = ['AAPL', 'INVALID', 'MSFT'];
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ symbol: 'AAPL', close: '150.00' })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({}) // Invalid response
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ symbol: 'MSFT', close: '300.00' })
        } as Response);

      mockGlobalCache.get.mockReturnValue(null);

      const results = await service.getBatchQuotes(symbols);

      expect(results).toHaveLength(2); // Only AAPL and MSFT
      expect(results.map(r => r.symbol)).toEqual(['AAPL', 'MSFT']);
    });
  });

  describe('API Status & Monitoring', () => {
    it('should report API key configuration status', () => {
      const status = service.getApiStatus();

      expect(status.apiKeys).toMatchObject({
        finnhub: {
          configured: true,
          isReal: true,
          masked: expect.stringMatching(/^test_fin.*\.\.\./)
        },
        alphaVantage: {
          configured: true,
          isReal: true,
          masked: expect.stringMatching(/^test_alp.*\.\.\./)
        }
      });
    });

    it('should test all API connections', async () => {
      // Mock various API responses
      mockYahooService.getQuote.mockResolvedValue({
        id: 0,
        symbol: 'AAPL',
        name: 'Apple Inc.',
        price: 150.00,
        previousClose: 148.00,
        change: 2.00,
        changePercent: 1.35,
        volume: 50000000,
        high: 152.00,
        low: 147.00,
        open: 149.00,
        marketCap: '2500000000000',
        week52High: 180.00,
        week52Low: 120.00,
        sector: 'Technology',
        industry: null,
        eps: null,
        peRatio: null,
        logo: null,
        lastUpdated: new Date()
      });

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ symbol: 'AAPL', close: '150.00' })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ([{ symbol: 'AAPL', price: 150.00 }])
        } as Response)
        .mockRejectedValueOnce(new Error('Finnhub error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ 'Global Quote': { '01. symbol': 'AAPL', '05. price': '150.00' } })
        } as Response);

      const results = await service.testApiConnections();

      expect(results.yahoo.status).toBe('success');
      expect(results.twelvedata.status).toBe('success');
      expect(results.fmp.status).toBe('success');
      expect(results.finnhub.status).toBe('failed');
      expect(results.alphavantage.status).toBe('success');
    });
  });

  describe('Environment Configuration Edge Cases', () => {
    it('should handle missing API keys gracefully', () => {
      process.env = {
        ...originalEnv,
        FINNHUB_API_KEY: undefined,
        ALPHA_VANTAGE_API_KEY: 'demo',
        FMP_API_KEY: '',
        TWELVE_DATA_API_KEY: 'your_twelve_data_key_here'
      };

      const testService = new ServerMarketDataService();
      const status = testService.getApiStatus();

      expect(status.apiKeys.finnhub.configured).toBe(false);
      expect(status.apiKeys.alphaVantage.isReal).toBe(false);
      expect(status.apiKeys.fmp.configured).toBe(false);
      expect(status.apiKeys.twelveData.isReal).toBe(false);
    });

    it('should prioritize real API keys over demo keys', async () => {
      process.env = {
        ...originalEnv,
        FINNHUB_API_KEY: 'demo',
        ALPHA_VANTAGE_API_KEY: 'demo',
        FMP_API_KEY: 'real_fmp_key_123456',
        TWELVE_DATA_API_KEY: 'demo'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ([{
          symbol: 'AAPL',
          price: 150.00
        }])
      } as Response);

      mockGlobalCache.get.mockReturnValue(null);

      const testService = new ServerMarketDataService();
      const result = await testService.getRealTimeQuote('AAPL');

      expect(result?.provider).toBe('fmp');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('financialmodelingprep.com'),
        undefined
      );
    });
  });
});