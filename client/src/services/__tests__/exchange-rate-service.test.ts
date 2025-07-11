import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExchangeRateService } from '../exchange-rate-service';
import { CacheManager } from '@/lib/cache-manager';

// Mock the CacheManager
vi.mock('@/lib/cache-manager', () => ({
  CacheManager: vi.fn(() => ({
    getAsync: vi.fn(),
    setAsync: vi.fn(),
    deleteAsync: vi.fn(),
  })),
}));

// Mock fetch globally
global.fetch = vi.fn();

describe('ExchangeRateService', () => {
  let exchangeRateService: ExchangeRateService;
  let mockCache: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockCache = {
      getAsync: vi.fn(),
      setAsync: vi.fn(),
      deleteAsync: vi.fn(),
    };
    
    exchangeRateService = new ExchangeRateService(mockCache);
  });

  describe('getExchangeRates', () => {
    it('should return cached rates when cache is valid', async () => {
      const cachedRates = {
        base: 'USD',
        date: '2024-01-01',
        rates: { EUR: 0.92, GBP: 0.79 },
        timestamp: Date.now() - 30 * 60 * 1000, // 30 minutes ago
      };

      mockCache.getAsync.mockResolvedValue(cachedRates);

      const result = await exchangeRateService.getExchangeRates('USD');
      
      expect(result).toEqual(cachedRates);
      expect(mockCache.getAsync).toHaveBeenCalledWith('exchange-rates:USD');
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should fetch new rates when cache is invalid', async () => {
      const expiredRates = {
        base: 'USD',
        date: '2024-01-01',
        rates: { EUR: 0.92 },
        timestamp: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
      };

      const freshRates = {
        base: 'USD',
        date: '2024-01-01',
        rates: { EUR: 0.93, GBP: 0.80 },
      };

      mockCache.getAsync.mockResolvedValue(expiredRates);
      (fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(freshRates),
      });

      const result = await exchangeRateService.getExchangeRates('USD');
      
      expect(result).toMatchObject({
        base: 'USD',
        rates: { EUR: 0.93, GBP: 0.80 },
      });
      expect(mockCache.setAsync).toHaveBeenCalled();
    });

    it('should handle provider failures and use fallback', async () => {
      mockCache.getAsync.mockResolvedValue(null);
      (fetch as any).mockRejectedValue(new Error('Network error'));

      const result = await exchangeRateService.getExchangeRates('USD');
      
      expect(result).toMatchObject({
        base: 'USD',
        rates: {
          EUR: 0.92,
          GBP: 0.79,
          CHF: 0.88,
          CAD: 1.36,
          AUD: 1.52,
          JPY: 149.50,
        },
      });
    });

    it('should try multiple providers on failure', async () => {
      mockCache.getAsync.mockResolvedValue(null);
      
      // First provider fails
      (fetch as any)
        .mockRejectedValueOnce(new Error('Provider 1 failed'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            base: 'USD',
            rates: { EUR: 0.93 },
          }),
        });

      const result = await exchangeRateService.getExchangeRates('USD');
      
      expect(result).toMatchObject({
        base: 'USD',
        rates: { EUR: 0.93 },
      });
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('should handle different provider response formats', async () => {
      mockCache.getAsync.mockResolvedValue(null);
      
      // Test currencyapi.com format
      const currencyApiResponse = {
        data: {
          EUR: { value: 0.93 },
          GBP: { value: 0.80 },
        },
      };

      (fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(currencyApiResponse),
      });

      const result = await exchangeRateService.getExchangeRates('USD');
      
      expect(result).toMatchObject({
        base: 'USD',
        rates: { EUR: 0.93, GBP: 0.80 },
      });
    });

    it('should handle HTTP errors gracefully', async () => {
      mockCache.getAsync.mockResolvedValue(null);
      
      (fetch as any).mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      });

      const result = await exchangeRateService.getExchangeRates('USD');
      
      // Should fallback to static rates
      expect(result).toMatchObject({
        base: 'USD',
        rates: expect.objectContaining({
          EUR: 0.92,
        }),
      });
    });

    it('should handle EUR as base currency', async () => {
      mockCache.getAsync.mockResolvedValue(null);
      (fetch as any).mockRejectedValue(new Error('All providers failed'));

      const result = await exchangeRateService.getExchangeRates('EUR');
      
      expect(result).toMatchObject({
        base: 'EUR',
        rates: {
          USD: 1.08,
          GBP: 0.86,
          CHF: 0.96,
          CAD: 1.47,
          AUD: 1.65,
          JPY: 162.30,
        },
      });
    });
  });

  describe('convertCurrency', () => {
    it('should convert currency using live rates', async () => {
      const mockRates = {
        base: 'USD',
        date: '2024-01-01',
        rates: { EUR: 0.92 },
        timestamp: Date.now(),
      };

      mockCache.getAsync.mockResolvedValue(mockRates);

      const result = await exchangeRateService.convertCurrency(100, 'USD', 'EUR');
      
      expect(result).toBe(92); // 100 * 0.92
    });

    it('should return original amount for same currency', async () => {
      const result = await exchangeRateService.convertCurrency(100, 'USD', 'USD');
      
      expect(result).toBe(100);
      expect(mockCache.getAsync).not.toHaveBeenCalled();
    });

    it('should handle missing exchange rate', async () => {
      const mockRates = {
        base: 'USD',
        date: '2024-01-01',
        rates: { EUR: 0.92 }, // Missing JPY
        timestamp: Date.now(),
      };

      mockCache.getAsync.mockResolvedValue(mockRates);

      const result = await exchangeRateService.convertCurrency(100, 'USD', 'JPY');
      
      expect(result).toBe(100); // Should return original amount
    });

    it('should handle API errors gracefully', async () => {
      mockCache.getAsync.mockRejectedValue(new Error('Cache error'));

      const result = await exchangeRateService.convertCurrency(100, 'USD', 'EUR');
      
      expect(result).toBe(100); // Should return original amount
    });

    it('should handle null rates response', async () => {
      mockCache.getAsync.mockResolvedValue(null);
      (fetch as any).mockRejectedValue(new Error('All providers failed'));

      const result = await exchangeRateService.convertCurrency(100, 'USD', 'EUR');
      
      expect(result).toBe(92); // Should use fallback rate (0.92)
    });
  });

  describe('getExchangeRate', () => {
    it('should return specific exchange rate', async () => {
      const mockRates = {
        base: 'USD',
        date: '2024-01-01',
        rates: { EUR: 0.92, GBP: 0.79 },
        timestamp: Date.now(),
      };

      mockCache.getAsync.mockResolvedValue(mockRates);

      const result = await exchangeRateService.getExchangeRate('USD', 'EUR');
      
      expect(result).toBe(0.92);
    });

    it('should return 1 for same currency', async () => {
      const result = await exchangeRateService.getExchangeRate('USD', 'USD');
      
      expect(result).toBe(1);
    });

    it('should return null for missing rate', async () => {
      const mockRates = {
        base: 'USD',
        date: '2024-01-01',
        rates: { EUR: 0.92 },
        timestamp: Date.now(),
      };

      mockCache.getAsync.mockResolvedValue(mockRates);

      const result = await exchangeRateService.getExchangeRate('USD', 'JPY');
      
      expect(result).toBeNull();
    });

    it('should handle errors and return null', async () => {
      mockCache.getAsync.mockRejectedValue(new Error('Cache error'));

      const result = await exchangeRateService.getExchangeRate('USD', 'EUR');
      
      expect(result).toBeNull();
    });
  });

  describe('warmCache', () => {
    it('should warm cache for popular currencies', async () => {
      const mockRates = {
        base: 'USD',
        date: '2024-01-01',
        rates: { EUR: 0.92 },
        timestamp: Date.now(),
      };

      mockCache.getAsync.mockResolvedValue(mockRates);

      await exchangeRateService.warmCache();
      
      expect(mockCache.getAsync).toHaveBeenCalledWith('exchange-rates:USD');
      expect(mockCache.getAsync).toHaveBeenCalledWith('exchange-rates:EUR');
    });

    it('should handle errors during cache warming', async () => {
      mockCache.getAsync.mockRejectedValue(new Error('Cache error'));

      await expect(exchangeRateService.warmCache()).resolves.toBeUndefined();
    });
  });

  describe('forceRefresh', () => {
    it('should delete cache and fetch fresh rates', async () => {
      const freshRates = {
        base: 'USD',
        date: '2024-01-01',
        rates: { EUR: 0.93 },
      };

      (fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(freshRates),
      });

      const result = await exchangeRateService.forceRefresh('USD');
      
      expect(mockCache.deleteAsync).toHaveBeenCalledWith('exchange-rates:USD');
      expect(result).toMatchObject({
        base: 'USD',
        rates: { EUR: 0.93 },
      });
    });
  });

  describe('getStatus', () => {
    it('should return service status', () => {
      const status = exchangeRateService.getStatus();
      
      expect(status).toMatchObject({
        currentProvider: 'exchangerate-api.com',
        totalProviders: 4,
        cacheStatus: 'Active',
      });
    });
  });

  describe('provider rotation', () => {
    it('should rotate to next provider on failure', async () => {
      mockCache.getAsync.mockResolvedValue(null);
      
      // First provider fails
      (fetch as any)
        .mockRejectedValueOnce(new Error('Provider 1 failed'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            base: 'USD',
            rates: { EUR: 0.93 },
          }),
        });

      await exchangeRateService.getExchangeRates('USD');
      
      // Check that currentProvider was updated
      const status = exchangeRateService.getStatus();
      expect(status.currentProvider).toBe('fixer.io');
    });
  });

  describe('cache validation', () => {
    it('should invalidate old cache entries', async () => {
      const oldRates = {
        base: 'USD',
        date: '2024-01-01',
        rates: { EUR: 0.92 },
        timestamp: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
      };

      mockCache.getAsync.mockResolvedValue(oldRates);
      (fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          base: 'USD',
          rates: { EUR: 0.93 },
        }),
      });

      const result = await exchangeRateService.getExchangeRates('USD');
      
      expect(result.rates.EUR).toBe(0.93); // Should get fresh data
      expect(mockCache.setAsync).toHaveBeenCalled();
    });

    it('should use valid cache entries', async () => {
      const validRates = {
        base: 'USD',
        date: '2024-01-01',
        rates: { EUR: 0.92 },
        timestamp: Date.now() - 30 * 60 * 1000, // 30 minutes ago
      };

      mockCache.getAsync.mockResolvedValue(validRates);

      const result = await exchangeRateService.getExchangeRates('USD');
      
      expect(result).toEqual(validRates);
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle JSON parsing errors', async () => {
      mockCache.getAsync.mockResolvedValue(null);
      
      (fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      const result = await exchangeRateService.getExchangeRates('USD');
      
      // Should fallback to static rates
      expect(result).toMatchObject({
        base: 'USD',
        rates: expect.objectContaining({
          EUR: 0.92,
        }),
      });
    });

    it('should handle malformed provider responses', async () => {
      mockCache.getAsync.mockResolvedValue(null);
      
      (fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ unexpected: 'format' }),
      });

      const result = await exchangeRateService.getExchangeRates('USD');
      
      // Should fallback to static rates
      expect(result).toMatchObject({
        base: 'USD',
        rates: expect.objectContaining({
          EUR: 0.92,
        }),
      });
    });
  });
});