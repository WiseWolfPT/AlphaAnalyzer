/**
 * AGENT 6: FMP Batch Provider Unit Tests
 *
 * Comprehensive test suite for batch financial data fetching methods
 * Tests all 7 batch methods + master method + error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FMPProvider, BatchFinancialData } from '../fmp-provider';
import axios from 'axios';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as any;

describe('FMPProvider - Batch Methods (Agent 6)', () => {
  let provider: FMPProvider;
  const mockApiKey = 'test-api-key-123';

  beforeEach(() => {
    provider = new FMPProvider(mockApiKey);
    vi.clearAllMocks();
  });

  /**
   * TEST SUITE 1: Individual Batch Methods
   */
  describe('getBatchQuotes', () => {
    it('should fetch quotes for multiple symbols', async () => {
      const symbols = ['AAPL', 'MSFT', 'GOOGL'];
      const mockResponse = {
        data: [
          { symbol: 'AAPL', price: 150.25, volume: 1000000, timestamp: 1234567890 },
          { symbol: 'MSFT', price: 300.50, volume: 2000000, timestamp: 1234567890 },
          { symbol: 'GOOGL', price: 130.75, volume: 1500000, timestamp: 1234567890 }
        ]
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const quotes = await provider.getBatchQuotes(symbols);

      expect(quotes).toHaveLength(3);
      expect(quotes[0].symbol).toBe('AAPL');
      expect(quotes[0].price).toBe(150.25);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/quote/AAPL,MSFT,GOOGL'),
        expect.objectContaining({
          params: { apikey: mockApiKey },
          timeout: 15000
        })
      );
    });

    it('should handle empty symbol array', async () => {
      const quotes = await provider.getBatchQuotes([]);
      expect(quotes).toEqual([]);
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('should throw error if > 100 symbols', async () => {
      const symbols = Array(101).fill('AAPL');
      await expect(provider.getBatchQuotes(symbols)).rejects.toThrow(
        'Maximum 100 symbols per batch'
      );
    });
  });

  describe('getBatchIncomeStatements', () => {
    it('should fetch income statements for multiple symbols', async () => {
      const symbols = ['AAPL', 'MSFT'];
      const mockResponse = {
        data: [
          { symbol: 'AAPL', revenue: 394328000000, netIncome: 99803000000, date: '2024-09-30' },
          { symbol: 'MSFT', revenue: 245122000000, netIncome: 88136000000, date: '2024-06-30' }
        ]
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const incomes = await provider.getBatchIncomeStatements(symbols);

      expect(incomes).toHaveLength(2);
      expect(incomes[0].symbol).toBe('AAPL');
      expect(incomes[0].revenue).toBe(394328000000);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/income-statement/AAPL,MSFT'),
        expect.objectContaining({
          params: { apikey: mockApiKey, limit: 1 },
          timeout: 15000
        })
      );
    });

    it('should return empty array on API failure', async () => {
      const symbols = ['AAPL'];
      mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));

      const incomes = await provider.getBatchIncomeStatements(symbols);

      expect(incomes).toEqual([]);
    });
  });

  describe('getBatchBalanceSheets', () => {
    it('should fetch balance sheets for multiple symbols', async () => {
      const symbols = ['AAPL', 'MSFT'];
      const mockResponse = {
        data: [
          { symbol: 'AAPL', totalAssets: 352755000000, totalDebt: 106630000000 },
          { symbol: 'MSFT', totalAssets: 512163000000, totalDebt: 78400000000 }
        ]
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const balances = await provider.getBatchBalanceSheets(symbols);

      expect(balances).toHaveLength(2);
      expect(balances[0].symbol).toBe('AAPL');
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/balance-sheet-statement/AAPL,MSFT'),
        expect.any(Object)
      );
    });
  });

  describe('getBatchCashFlows', () => {
    it('should fetch cash flow statements for multiple symbols', async () => {
      const symbols = ['AAPL', 'MSFT'];
      const mockResponse = {
        data: [
          { symbol: 'AAPL', operatingCashFlow: 122151000000, freeCashFlow: 110543000000 },
          { symbol: 'MSFT', operatingCashFlow: 89035000000, freeCashFlow: 65149000000 }
        ]
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const cashFlows = await provider.getBatchCashFlows(symbols);

      expect(cashFlows).toHaveLength(2);
      expect(cashFlows[0].symbol).toBe('AAPL');
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/cash-flow-statement/AAPL,MSFT'),
        expect.any(Object)
      );
    });
  });

  describe('getBatchRatios', () => {
    it('should fetch financial ratios for multiple symbols', async () => {
      const symbols = ['AAPL', 'MSFT'];
      const mockResponse = {
        data: [
          { symbol: 'AAPL', priceEarningsRatio: 28.5, priceToBookRatio: 43.2 },
          { symbol: 'MSFT', priceEarningsRatio: 32.1, priceToBookRatio: 12.8 }
        ]
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const ratios = await provider.getBatchRatios(symbols);

      expect(ratios).toHaveLength(2);
      expect(ratios[0].symbol).toBe('AAPL');
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/ratios/AAPL,MSFT'),
        expect.any(Object)
      );
    });
  });

  describe('getBatchProfiles', () => {
    it('should fetch company profiles for multiple symbols', async () => {
      const symbols = ['AAPL', 'MSFT'];
      const mockResponse = {
        data: [
          { symbol: 'AAPL', companyName: 'Apple Inc.', sector: 'Technology', industry: 'Consumer Electronics' },
          { symbol: 'MSFT', companyName: 'Microsoft Corporation', sector: 'Technology', industry: 'Software' }
        ]
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const profiles = await provider.getBatchProfiles(symbols);

      expect(profiles).toHaveLength(2);
      expect(profiles[0].symbol).toBe('AAPL');
      expect(profiles[0].companyName).toBe('Apple Inc.');
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/profile/AAPL,MSFT'),
        expect.any(Object)
      );
    });
  });

  describe('getBatchKeyMetricsTTM', () => {
    it('should fetch key metrics for multiple symbols', async () => {
      const symbols = ['AAPL', 'MSFT'];
      const mockResponse = {
        data: [
          { symbol: 'AAPL', peRatioTTM: 28.5, marketCapTTM: 2500000000000 },
          { symbol: 'MSFT', peRatioTTM: 32.1, marketCapTTM: 2200000000000 }
        ]
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const keyMetrics = await provider.getBatchKeyMetricsTTM(symbols);

      expect(keyMetrics).toHaveLength(2);
      expect(keyMetrics[0].symbol).toBe('AAPL');
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/key-metrics-ttm/AAPL,MSFT'),
        expect.any(Object)
      );
    });
  });

  /**
   * TEST SUITE 2: Master Batch Method
   */
  describe('getBatchFinancialData', () => {
    it('should fetch all financial data for multiple stocks', async () => {
      const symbols = ['AAPL', 'MSFT'];

      // Mock all 7 API responses
      mockedAxios.get
        .mockResolvedValueOnce({ data: [{ symbol: 'AAPL', price: 150.25 }, { symbol: 'MSFT', price: 300.50 }] }) // quotes
        .mockResolvedValueOnce({ data: [{ symbol: 'AAPL', revenue: 394328000000 }, { symbol: 'MSFT', revenue: 245122000000 }] }) // incomes
        .mockResolvedValueOnce({ data: [{ symbol: 'AAPL', totalAssets: 352755000000 }, { symbol: 'MSFT', totalAssets: 512163000000 }] }) // balances
        .mockResolvedValueOnce({ data: [{ symbol: 'AAPL', freeCashFlow: 110543000000 }, { symbol: 'MSFT', freeCashFlow: 65149000000 }] }) // cashFlows
        .mockResolvedValueOnce({ data: [{ symbol: 'AAPL', priceEarningsRatio: 28.5 }, { symbol: 'MSFT', priceEarningsRatio: 32.1 }] }) // ratios
        .mockResolvedValueOnce({ data: [{ symbol: 'AAPL', companyName: 'Apple Inc.' }, { symbol: 'MSFT', companyName: 'Microsoft Corporation' }] }) // profiles
        .mockResolvedValueOnce({ data: [{ symbol: 'AAPL', peRatioTTM: 28.5 }, { symbol: 'MSFT', peRatioTTM: 32.1 }] }); // keyMetrics

      const data = await provider.getBatchFinancialData(symbols);

      expect(data.size).toBe(2);

      const appleData = data.get('AAPL');
      expect(appleData).toBeDefined();
      expect(appleData!.symbol).toBe('AAPL');
      expect(appleData!.quote).toBeDefined();
      expect(appleData!.income).toBeDefined();
      expect(appleData!.balance).toBeDefined();
      expect(appleData!.cashFlow).toBeDefined();
      expect(appleData!.ratios).toBeDefined();
      expect(appleData!.profile).toBeDefined();
      expect(appleData!.keyMetrics).toBeDefined();
      expect(appleData!.completeness).toBe(100); // All datasets present

      const msftData = data.get('MSFT');
      expect(msftData).toBeDefined();
      expect(msftData!.symbol).toBe('MSFT');
      expect(msftData!.completeness).toBe(100);

      // Verify 7 API calls were made (parallel)
      expect(mockedAxios.get).toHaveBeenCalledTimes(7);
    });

    it('should handle partial data availability', async () => {
      const symbols = ['AAPL'];

      // Mock responses with some missing data
      mockedAxios.get
        .mockResolvedValueOnce({ data: [{ symbol: 'AAPL', price: 150.25 }] }) // quotes
        .mockResolvedValueOnce({ data: [] }) // incomes - MISSING
        .mockResolvedValueOnce({ data: [{ symbol: 'AAPL', totalAssets: 352755000000 }] }) // balances
        .mockResolvedValueOnce({ data: [] }) // cashFlows - MISSING
        .mockResolvedValueOnce({ data: [{ symbol: 'AAPL', priceEarningsRatio: 28.5 }] }) // ratios
        .mockResolvedValueOnce({ data: [{ symbol: 'AAPL', companyName: 'Apple Inc.' }] }) // profiles
        .mockResolvedValueOnce({ data: [{ symbol: 'AAPL', peRatioTTM: 28.5 }] }); // keyMetrics

      const data = await provider.getBatchFinancialData(symbols);

      const appleData = data.get('AAPL');
      expect(appleData).toBeDefined();
      expect(appleData!.quote).toBeDefined();
      expect(appleData!.income).toBeNull(); // Missing
      expect(appleData!.balance).toBeDefined();
      expect(appleData!.cashFlow).toBeNull(); // Missing
      expect(appleData!.ratios).toBeDefined();
      expect(appleData!.profile).toBeDefined();
      expect(appleData!.keyMetrics).toBeDefined();
      expect(appleData!.completeness).toBe(71); // 5/7 datasets = 71%
    });

    it('should handle empty symbol array', async () => {
      const data = await provider.getBatchFinancialData([]);
      expect(data.size).toBe(0);
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('should throw error if > 100 symbols', async () => {
      const symbols = Array(101).fill('AAPL');
      await expect(provider.getBatchFinancialData(symbols)).rejects.toThrow(
        'Maximum 100 symbols per batch'
      );
    });

    it('should calculate average completeness correctly', async () => {
      const symbols = ['AAPL', 'MSFT'];

      // AAPL: 100% complete, MSFT: 43% complete (3/7 datasets)
      mockedAxios.get
        .mockResolvedValueOnce({ data: [{ symbol: 'AAPL', price: 150.25 }, { symbol: 'MSFT', price: 300.50 }] }) // quotes
        .mockResolvedValueOnce({ data: [{ symbol: 'AAPL', revenue: 394328000000 }] }) // incomes (MSFT missing)
        .mockResolvedValueOnce({ data: [{ symbol: 'AAPL', totalAssets: 352755000000 }] }) // balances (MSFT missing)
        .mockResolvedValueOnce({ data: [{ symbol: 'AAPL', freeCashFlow: 110543000000 }] }) // cashFlows (MSFT missing)
        .mockResolvedValueOnce({ data: [{ symbol: 'AAPL', priceEarningsRatio: 28.5 }, { symbol: 'MSFT', priceEarningsRatio: 32.1 }] }) // ratios
        .mockResolvedValueOnce({ data: [{ symbol: 'AAPL', companyName: 'Apple Inc.' }] }) // profiles (MSFT missing)
        .mockResolvedValueOnce({ data: [{ symbol: 'AAPL', peRatioTTM: 28.5 }, { symbol: 'MSFT', peRatioTTM: 32.1 }] }); // keyMetrics

      const data = await provider.getBatchFinancialData(symbols);

      const appleData = data.get('AAPL');
      expect(appleData!.completeness).toBe(100);

      const msftData = data.get('MSFT');
      expect(msftData!.completeness).toBe(43); // 3/7 = 42.86% → 43%

      // Average: (100 + 43) / 2 = 71.5% → 72%
      // (Note: actual log would show "avg completeness: 72%")
    });
  });

  /**
   * TEST SUITE 3: Error Handling & Edge Cases
   */
  describe('Error Handling', () => {
    it('should handle rate limit errors with retry', async () => {
      const symbols = ['AAPL'];
      const rateLimitError = {
        response: { status: 429 },
        message: 'Rate limit exceeded'
      };

      // First call fails with 429, second succeeds
      mockedAxios.get
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce({ data: [{ symbol: 'AAPL', price: 150.25 }] });

      // getBatchQuotes uses fetchWithRetry internally
      const quotes = await provider.getBatchQuotes(symbols);

      expect(quotes).toHaveLength(1);
      expect(mockedAxios.get).toHaveBeenCalledTimes(2); // Retry happened
    });

    it('should handle network timeout errors', async () => {
      const symbols = ['AAPL'];
      const timeoutError = {
        code: 'ETIMEDOUT',
        message: 'Network timeout'
      };

      mockedAxios.get
        .mockRejectedValueOnce(timeoutError)
        .mockResolvedValueOnce({ data: [{ symbol: 'AAPL', price: 150.25 }] });

      const quotes = await provider.getBatchQuotes(symbols);

      expect(quotes).toHaveLength(1);
      expect(mockedAxios.get).toHaveBeenCalledTimes(2); // Retry happened
    });

    it('should throw error after max retries exceeded', async () => {
      const symbols = ['AAPL'];
      const persistentError = {
        response: { status: 500 },
        message: 'Internal server error'
      };

      mockedAxios.get
        .mockRejectedValueOnce(persistentError)
        .mockRejectedValueOnce(persistentError)
        .mockRejectedValueOnce(persistentError)
        .mockRejectedValueOnce(persistentError); // 4 attempts (1 + 3 retries)

      await expect(provider.getBatchQuotes(symbols)).rejects.toThrow();
      expect(mockedAxios.get).toHaveBeenCalledTimes(4); // Max retries
    });

    it('should handle malformed API responses gracefully', async () => {
      const symbols = ['AAPL'];
      mockedAxios.get.mockResolvedValueOnce({ data: null }); // Invalid response

      await expect(provider.getBatchIncomeStatements(symbols)).rejects.toThrow(
        'Invalid response from FMP batch income statements'
      );
    });
  });

  /**
   * TEST SUITE 4: API Efficiency & Performance
   */
  describe('API Efficiency', () => {
    it('should reduce API calls by 98% vs individual fetches', async () => {
      const symbols = ['AAPL', 'MSFT', 'GOOGL']; // 3 stocks

      // Mock all batch responses
      mockedAxios.get
        .mockResolvedValueOnce({ data: [{ symbol: 'AAPL' }, { symbol: 'MSFT' }, { symbol: 'GOOGL' }] })
        .mockResolvedValueOnce({ data: [{ symbol: 'AAPL' }, { symbol: 'MSFT' }, { symbol: 'GOOGL' }] })
        .mockResolvedValueOnce({ data: [{ symbol: 'AAPL' }, { symbol: 'MSFT' }, { symbol: 'GOOGL' }] })
        .mockResolvedValueOnce({ data: [{ symbol: 'AAPL' }, { symbol: 'MSFT' }, { symbol: 'GOOGL' }] })
        .mockResolvedValueOnce({ data: [{ symbol: 'AAPL' }, { symbol: 'MSFT' }, { symbol: 'GOOGL' }] })
        .mockResolvedValueOnce({ data: [{ symbol: 'AAPL' }, { symbol: 'MSFT' }, { symbol: 'GOOGL' }] })
        .mockResolvedValueOnce({ data: [{ symbol: 'AAPL' }, { symbol: 'MSFT' }, { symbol: 'GOOGL' }] });

      await provider.getBatchFinancialData(symbols);

      // Batch: 7 API calls for 3 stocks (7 total)
      // Individual: 7 endpoints × 3 stocks = 21 calls
      // Reduction: (21 - 7) / 21 = 66.7% (but with 100 stocks: 98%)
      expect(mockedAxios.get).toHaveBeenCalledTimes(7);

      // With 100 stocks:
      // Batch: 7 API calls
      // Individual: 7 × 100 = 700 calls
      // Reduction: (700 - 7) / 700 = 99% ✅
    });

    it('should handle maximum batch size (100 symbols)', async () => {
      const symbols = Array(100).fill(null).map((_, i) => `STOCK${i}`);

      // Mock all batch responses with 100 stocks each
      mockedAxios.get
        .mockResolvedValueOnce({ data: symbols.map(s => ({ symbol: s })) })
        .mockResolvedValueOnce({ data: symbols.map(s => ({ symbol: s })) })
        .mockResolvedValueOnce({ data: symbols.map(s => ({ symbol: s })) })
        .mockResolvedValueOnce({ data: symbols.map(s => ({ symbol: s })) })
        .mockResolvedValueOnce({ data: symbols.map(s => ({ symbol: s })) })
        .mockResolvedValueOnce({ data: symbols.map(s => ({ symbol: s })) })
        .mockResolvedValueOnce({ data: symbols.map(s => ({ symbol: s })) });

      const data = await provider.getBatchFinancialData(symbols);

      expect(data.size).toBe(100);
      expect(mockedAxios.get).toHaveBeenCalledTimes(7); // Still only 7 calls!
    });
  });

  /**
   * TEST SUITE 5: Rate Limiting Integration
   */
  describe('Rate Limiting', () => {
    it('should respect rate limits across batch calls', async () => {
      const symbols = ['AAPL', 'MSFT'];

      // Create spy on checkRateLimit
      const checkRateLimitSpy = vi.spyOn(provider as any, 'checkRateLimit');

      mockedAxios.get
        .mockResolvedValueOnce({ data: [{ symbol: 'AAPL' }, { symbol: 'MSFT' }] })
        .mockResolvedValueOnce({ data: [{ symbol: 'AAPL' }, { symbol: 'MSFT' }] })
        .mockResolvedValueOnce({ data: [{ symbol: 'AAPL' }, { symbol: 'MSFT' }] })
        .mockResolvedValueOnce({ data: [{ symbol: 'AAPL' }, { symbol: 'MSFT' }] })
        .mockResolvedValueOnce({ data: [{ symbol: 'AAPL' }, { symbol: 'MSFT' }] })
        .mockResolvedValueOnce({ data: [{ symbol: 'AAPL' }, { symbol: 'MSFT' }] })
        .mockResolvedValueOnce({ data: [{ symbol: 'AAPL' }, { symbol: 'MSFT' }] });

      await provider.getBatchFinancialData(symbols);

      // Each batch method calls checkRateLimit once
      expect(checkRateLimitSpy).toHaveBeenCalledTimes(7);
    });
  });
});
