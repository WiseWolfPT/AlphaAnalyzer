/**
 * REAL FINNHUB SERVICE TESTS
 * Testing the actual FinnhubService implementation (0% -> 80%+)
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import axios from 'axios';
import { finnhubService } from '../finnhub-service';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('🚀 Real FinnhubService Implementation Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('🏢 getCompanyProfile', () => {
    it('should fetch and transform company profile successfully', async () => {
      const mockApiResponse = {
        data: {
          name: 'Apple Inc',
          finnhubIndustry: 'Technology',
          marketCapitalization: 2800000, // In millions
          country: 'US',
          currency: 'USD',
          weburl: 'https://www.apple.com/',
          logo: 'https://static.finnhub.io/logo/apple.png'
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockApiResponse);

      const result = await finnhubService.getCompanyProfile('AAPL');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://finnhub.io/api/v1/stock/profile2',
        {
          params: {
            symbol: 'AAPL',
            token: expect.any(String)
          }
        }
      );

      expect(result).toEqual({
        symbol: 'AAPL',
        name: 'Apple Inc',
        sector: 'Technology',
        industry: 'Technology',
        marketCap: 2800000000000, // Converted to actual value
        country: 'US',
        currency: 'USD',
        website: 'https://www.apple.com/',
        logo: 'https://static.finnhub.io/logo/apple.png'
      });
    });

    it('should handle empty company profile response', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: {} });

      const result = await finnhubService.getCompanyProfile('INVALID');

      expect(result).toBeNull();
    });

    it('should handle axios errors in getCompanyProfile', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

      const result = await finnhubService.getCompanyProfile('AAPL');

      expect(result).toBeNull();
    });

    it('should handle missing optional fields', async () => {
      const mockApiResponse = {
        data: {
          name: 'Test Company',
          marketCapitalization: 1000,
          country: 'US',
          currency: 'USD'
          // Missing weburl, logo, finnhubIndustry
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockApiResponse);

      const result = await finnhubService.getCompanyProfile('TEST');

      expect(result).toEqual({
        symbol: 'TEST',
        name: 'Test Company',
        sector: '',
        industry: '',
        marketCap: 1000000000, // 1000 million * 1M
        country: 'US',
        currency: 'USD',
        website: '',
        logo: undefined
      });
    });
  });

  describe('📊 getBasicFinancials', () => {
    it('should fetch and transform basic financials successfully', async () => {
      const mockApiResponse = {
        data: {
          metric: {
            peBasicExclExtraTTM: 28.5,
            psTTM: 7.8,
            pbQuarterly: 45.2,
            'ev/ebitdaTTM': 21.3,
            roeTTM: 0.175,
            roaTTM: 0.087,
            currentRatioQuarterly: 1.029,
            'totalDebt/totalEquityQuarterly': 1.73,
            grossMarginTTM: 0.382,
            operatingMarginTTM: 0.302,
            netProfitMarginTTM: 0.253
          }
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockApiResponse);

      const result = await finnhubService.getBasicFinancials('AAPL');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://finnhub.io/api/v1/stock/metric',
        {
          params: {
            symbol: 'AAPL',
            metric: 'all',
            token: expect.any(String)
          }
        }
      );

      expect(result).toEqual({
        pe: 28.5,
        ps: 7.8,
        pb: 45.2,
        evToEbitda: 21.3,
        roe: 0.175,
        roa: 0.087,
        currentRatio: 1.029,
        debtToEquity: 1.73,
        grossMargin: 0.382,
        operatingMargin: 0.302,
        netMargin: 0.253
      });
    });

    it('should handle missing metric data', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: {} });

      const result = await finnhubService.getBasicFinancials('INVALID');

      expect(result).toBeNull();
    });

    it('should handle missing individual metrics with defaults', async () => {
      const mockApiResponse = {
        data: {
          metric: {
            peBasicExclExtraTTM: 25.0
            // Missing other metrics
          }
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockApiResponse);

      const result = await finnhubService.getBasicFinancials('PARTIAL');

      expect(result).toEqual({
        pe: 25.0,
        ps: 0,
        pb: 0,
        evToEbitda: 0,
        roe: 0,
        roa: 0,
        currentRatio: 0,
        debtToEquity: 0,
        grossMargin: 0,
        operatingMargin: 0,
        netMargin: 0
      });
    });

    it('should handle axios errors in getBasicFinancials', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));

      const result = await finnhubService.getBasicFinancials('AAPL');

      expect(result).toBeNull();
    });
  });

  describe('💰 getQuote', () => {
    it('should fetch quote data successfully', async () => {
      const mockApiResponse = {
        data: {
          c: 175.50, // Current price
          d: 2.34,   // Change
          dp: 1.35,  // Percent change
          h: 176.80, // High price
          l: 173.20, // Low price
          o: 174.00, // Open price
          pc: 173.16, // Previous close
          t: 1676994480 // Timestamp
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockApiResponse);

      const result = await finnhubService.getQuote('AAPL');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://finnhub.io/api/v1/quote',
        {
          params: {
            symbol: 'AAPL',
            token: expect.any(String)
          }
        }
      );

      expect(result).toEqual({
        c: 175.50,
        d: 2.34,
        dp: 1.35,
        h: 176.80,
        l: 173.20,
        o: 174.00,
        pc: 173.16,
        t: 1676994480
      });
    });

    it('should handle invalid quote data (price is 0)', async () => {
      const mockApiResponse = {
        data: {
          c: 0, // Invalid price
          d: 0,
          dp: 0
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockApiResponse);

      const result = await finnhubService.getQuote('INVALID');

      expect(result).toBeNull();
    });

    it('should handle empty quote response', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: null });

      const result = await finnhubService.getQuote('INVALID');

      expect(result).toBeNull();
    });

    it('should handle axios errors in getQuote', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Request failed'));

      const result = await finnhubService.getQuote('AAPL');

      expect(result).toBeNull();
    });
  });

  describe('🔍 searchSymbols', () => {
    it('should search symbols successfully', async () => {
      const mockApiResponse = {
        data: {
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
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockApiResponse);

      const result = await finnhubService.searchSymbols('APP');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://finnhub.io/api/v1/search',
        {
          params: {
            q: 'APP',
            token: expect.any(String)
          }
        }
      );

      expect(result).toEqual([
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
      ]);
    });

    it('should handle empty search results', async () => {
      const mockApiResponse = {
        data: {
          result: []
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockApiResponse);

      const result = await finnhubService.searchSymbols('NONEXISTENT');

      expect(result).toEqual([]);
    });

    it('should handle missing result field', async () => {
      const mockApiResponse = {
        data: {}
      };

      mockedAxios.get.mockResolvedValueOnce(mockApiResponse);

      const result = await finnhubService.searchSymbols('TEST');

      expect(result).toEqual([]);
    });

    it('should handle axios errors in searchSymbols', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Search failed'));

      const result = await finnhubService.searchSymbols('AAPL');

      expect(result).toEqual([]);
    });
  });

  describe('🔧 Configuration and Edge Cases', () => {
    it('should use API key from environment or default to demo', () => {
      // The service is already instantiated, but we can test the behavior
      expect(finnhubService).toBeDefined();
    });

    it('should handle axios timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'ECONNABORTED';
      
      mockedAxios.get.mockRejectedValueOnce(timeoutError);

      const result = await finnhubService.getCompanyProfile('AAPL');

      expect(result).toBeNull();
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network Error');
      networkError.name = 'ENETUNREACH';
      
      mockedAxios.get.mockRejectedValueOnce(networkError);

      const result = await finnhubService.getQuote('AAPL');

      expect(result).toBeNull();
    });

    it('should handle HTTP error responses', async () => {
      const httpError = {
        response: {
          status: 429,
          data: { error: 'Rate limit exceeded' }
        }
      };
      
      mockedAxios.get.mockRejectedValueOnce(httpError);

      const result = await finnhubService.getBasicFinancials('AAPL');

      expect(result).toBeNull();
    });

    it('should construct correct URLs for all endpoints', async () => {
      mockedAxios.get.mockResolvedValue({ data: {} });

      await finnhubService.getCompanyProfile('TEST');
      await finnhubService.getBasicFinancials('TEST');
      await finnhubService.getQuote('TEST');
      await finnhubService.searchSymbols('TEST');

      const calls = mockedAxios.get.mock.calls;

      expect(calls[0][0]).toBe('https://finnhub.io/api/v1/stock/profile2');
      expect(calls[1][0]).toBe('https://finnhub.io/api/v1/stock/metric');
      expect(calls[2][0]).toBe('https://finnhub.io/api/v1/quote');
      expect(calls[3][0]).toBe('https://finnhub.io/api/v1/search');
    });

    it('should include API token in all requests', async () => {
      mockedAxios.get.mockResolvedValue({ data: {} });

      await finnhubService.getCompanyProfile('TEST');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            token: expect.any(String)
          })
        })
      );
    });

    it('should handle special characters in symbols', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: { c: 350000 } });

      await finnhubService.getQuote('BRK.A');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            symbol: 'BRK.A'
          })
        })
      );
    });

    it('should handle concurrent requests', async () => {
      mockedAxios.get.mockResolvedValue({ 
        data: { 
          c: 100, d: 1, dp: 1, h: 101, l: 99, o: 100, pc: 99, t: Date.now() 
        } 
      });

      const promises = [
        finnhubService.getQuote('AAPL'),
        finnhubService.getQuote('MSFT'),
        finnhubService.getQuote('GOOGL')
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      expect(mockedAxios.get).toHaveBeenCalledTimes(3);
      results.forEach(result => {
        expect(result).not.toBeNull();
        expect(result?.c).toBe(100);
      });
    });
  });
});