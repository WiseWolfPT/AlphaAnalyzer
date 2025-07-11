import { describe, it, expect, vi, beforeEach } from 'vitest';
import { finnhubService } from '../finnhub';
import type { StockPrice, CompanyProfile, BasicFinancials } from '../finnhub';

// Mock fetch globally
global.fetch = vi.fn();

describe('FinnhubService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getStockPrice', () => {
    it('should fetch stock price successfully', async () => {
      const mockResponse: StockPrice = {
        c: 150.25,
        d: 2.15,
        dp: 1.45,
        h: 152.00,
        l: 148.50,
        o: 149.00,
        pc: 148.10,
      };

      (fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: mockResponse,
        }),
      });

      const result = await finnhubService.getStockPrice('AAPL');

      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith('/api/proxy/finnhub/quote?symbol=AAPL');
    });

    it('should convert symbol to uppercase', async () => {
      const mockResponse: StockPrice = {
        c: 150.25,
        d: 2.15,
        dp: 1.45,
        h: 152.00,
        l: 148.50,
        o: 149.00,
        pc: 148.10,
      };

      (fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: mockResponse,
        }),
      });

      await finnhubService.getStockPrice('aapl');

      expect(fetch).toHaveBeenCalledWith('/api/proxy/finnhub/quote?symbol=AAPL');
    });

    it('should handle HTTP errors', async () => {
      (fetch as any).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(finnhubService.getStockPrice('INVALID')).rejects.toThrow(
        'Finnhub proxy error: 404 Not Found'
      );
    });

    it('should handle network errors', async () => {
      (fetch as any).mockRejectedValue(new Error('Network error'));

      await expect(finnhubService.getStockPrice('AAPL')).rejects.toThrow(
        'Network error'
      );
    });

    it('should handle unsuccessful proxy response', async () => {
      (fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: false,
          message: 'API quota exceeded',
        }),
      });

      await expect(finnhubService.getStockPrice('AAPL')).rejects.toThrow(
        'API quota exceeded'
      );
    });

    it('should handle proxy response without message', async () => {
      (fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: false,
        }),
      });

      await expect(finnhubService.getStockPrice('AAPL')).rejects.toThrow(
        'Finnhub API request failed'
      );
    });

    it('should handle JSON parsing errors', async () => {
      (fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      await expect(finnhubService.getStockPrice('AAPL')).rejects.toThrow(
        'Invalid JSON'
      );
    });
  });

  describe('getCompanyProfile', () => {
    it('should fetch company profile successfully', async () => {
      const mockProfile: CompanyProfile = {
        country: 'US',
        currency: 'USD',
        exchange: 'NASDAQ',
        ipo: '1980-12-12',
        marketCapitalization: 2800000,
        name: 'Apple Inc.',
        phone: '14089961010',
        shareOutstanding: 16070000000,
        ticker: 'AAPL',
        weburl: 'https://www.apple.com/',
        logo: 'https://static.finnhub.io/logo/87cb30d8-80df-11ea-8951-00505692583a.png',
        finnhubIndustry: 'Technology',
      };

      (fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: mockProfile,
        }),
      });

      const result = await finnhubService.getCompanyProfile('AAPL');

      expect(result).toEqual(mockProfile);
      expect(fetch).toHaveBeenCalledWith('/api/proxy/finnhub/stock/profile2?symbol=AAPL');
    });

    it('should handle company profile errors', async () => {
      (fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(finnhubService.getCompanyProfile('AAPL')).rejects.toThrow(
        'Finnhub proxy error: 500 Internal Server Error'
      );
    });
  });

  describe('getBasicFinancials', () => {
    it('should fetch basic financials successfully', async () => {
      const mockFinancials: BasicFinancials = {
        metric: {
          '10DayAverageTradingVolume': 50000000,
          '52WeekHigh': 180.95,
          '52WeekLow': 124.17,
          marketCapitalization: 2800000000000,
          peBasicExclExtraTTM: 28.5,
          dividendYieldIndicatedAnnual: 0.0046,
          epsBasicExclExtraTTM: 5.89,
          totalSharesOutstanding: 16070000000,
          freeCashFlowTTM: 99584000000,
          netIncomeCommonShareholdersTTM: 94680000000,
          ebitdaTTM: 123136000000,
          totalDebt: 132480000000,
          totalCash: 63913000000,
          roeTTM: 1.7204,
          roaTTM: 0.2839,
          grossMarginTTM: 0.4531,
          operatingMarginTTM: 0.3058,
          netProfitMarginTTM: 0.2447,
        },
      };

      (fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: mockFinancials,
        }),
      });

      const result = await finnhubService.getBasicFinancials('AAPL');

      expect(result).toEqual(mockFinancials);
      expect(fetch).toHaveBeenCalledWith('/api/proxy/finnhub/stock/metric?symbol=AAPL&metric=all');
    });

    it('should handle basic financials errors', async () => {
      (fetch as any).mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      });

      await expect(finnhubService.getBasicFinancials('AAPL')).rejects.toThrow(
        'Finnhub proxy error: 429 Too Many Requests'
      );
    });
  });

  describe('getIncomeStatement', () => {
    it('should fetch income statement successfully', async () => {
      const mockIncomeStatement = {
        data: [
          {
            year: 2023,
            quarter: 4,
            period: 'Q4',
            totalRevenue: 119575000000,
            costOfRevenue: 65775000000,
            grossProfit: 53800000000,
            operatingExpense: 16425000000,
            operatingIncome: 37375000000,
            netIncome: 33916000000,
            eps: 2.18,
            ebitda: 40275000000,
            freeCashFlow: 28175000000,
            totalCash: 63913000000,
            totalDebt: 132480000000,
            totalAssets: 352755000000,
            totalEquity: 74100000000,
            sharesOutstanding: 15552752000,
          },
        ],
      };

      (fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: mockIncomeStatement,
        }),
      });

      const result = await finnhubService.getIncomeStatement('AAPL');

      expect(result).toEqual(mockIncomeStatement);
      expect(fetch).toHaveBeenCalledWith('/api/proxy/finnhub/stock/financials?symbol=AAPL&statement=income&freq=quarterly');
    });

    it('should handle different frequency parameters', async () => {
      const mockIncomeStatement = {
        data: [
          {
            year: 2023,
            quarter: 0,
            period: 'FY',
            totalRevenue: 383285000000,
            costOfRevenue: 214137000000,
            grossProfit: 169148000000,
            operatingExpense: 55013000000,
            operatingIncome: 114301000000,
            netIncome: 96995000000,
            eps: 6.16,
            ebitda: 123136000000,
            freeCashFlow: 99584000000,
            totalCash: 63913000000,
            totalDebt: 132480000000,
            totalAssets: 352755000000,
            totalEquity: 74100000000,
            sharesOutstanding: 15552752000,
          },
        ],
      };

      (fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: mockIncomeStatement,
        }),
      });

      const result = await finnhubService.getIncomeStatement('AAPL', 'annual');

      expect(result).toEqual(mockIncomeStatement);
      expect(fetch).toHaveBeenCalledWith('/api/proxy/finnhub/stock/financials?symbol=AAPL&statement=income&freq=annual');
    });

    it('should handle income statement errors', async () => {
      (fetch as any).mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      });

      await expect(finnhubService.getIncomeStatement('AAPL')).rejects.toThrow(
        'Finnhub proxy error: 403 Forbidden'
      );
    });
  });

  describe('getBalanceSheet', () => {
    it('should fetch balance sheet successfully', async () => {
      const mockBalanceSheet = {
        data: [
          {
            year: 2023,
            quarter: 4,
            period: 'Q4',
            totalRevenue: 0,
            costOfRevenue: 0,
            grossProfit: 0,
            operatingExpense: 0,
            operatingIncome: 0,
            netIncome: 0,
            eps: 0,
            ebitda: 0,
            freeCashFlow: 0,
            totalCash: 63913000000,
            totalDebt: 132480000000,
            totalAssets: 352755000000,
            totalEquity: 74100000000,
            sharesOutstanding: 15552752000,
          },
        ],
      };

      (fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: mockBalanceSheet,
        }),
      });

      const result = await finnhubService.getBalanceSheet('AAPL');

      expect(result).toEqual(mockBalanceSheet);
      expect(fetch).toHaveBeenCalledWith('/api/proxy/finnhub/stock/financials?symbol=AAPL&statement=balance-sheet&freq=quarterly');
    });
  });

  describe('getCashFlowStatement', () => {
    it('should fetch cash flow statement successfully', async () => {
      const mockCashFlow = {
        data: [
          {
            year: 2023,
            quarter: 4,
            period: 'Q4',
            totalRevenue: 0,
            costOfRevenue: 0,
            grossProfit: 0,
            operatingExpense: 0,
            operatingIncome: 0,
            netIncome: 0,
            eps: 0,
            ebitda: 0,
            freeCashFlow: 28175000000,
            totalCash: 63913000000,
            totalDebt: 132480000000,
            totalAssets: 352755000000,
            totalEquity: 74100000000,
            sharesOutstanding: 15552752000,
          },
        ],
      };

      (fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: mockCashFlow,
        }),
      });

      const result = await finnhubService.getCashFlowStatement('AAPL');

      expect(result).toEqual(mockCashFlow);
      expect(fetch).toHaveBeenCalledWith('/api/proxy/finnhub/stock/financials?symbol=AAPL&statement=cash-flow&freq=quarterly');
    });
  });

  describe('getDividends', () => {
    it('should fetch dividends successfully', async () => {
      const mockDividends = [
        {
          symbol: 'AAPL',
          date: '2023-11-10',
          amount: 0.24,
          adjustedAmount: 0.24,
          payDate: '2023-11-16',
          recordDate: '2023-11-13',
          declarationDate: '2023-11-02',
          currency: 'USD',
        },
        {
          symbol: 'AAPL',
          date: '2023-08-11',
          amount: 0.24,
          adjustedAmount: 0.24,
          payDate: '2023-08-17',
          recordDate: '2023-08-14',
          declarationDate: '2023-08-03',
          currency: 'USD',
        },
      ];

      (fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: mockDividends,
        }),
      });

      const result = await finnhubService.getDividends('AAPL', '2023-01-01', '2023-12-31');

      expect(result).toEqual(mockDividends);
      expect(fetch).toHaveBeenCalledWith('/api/proxy/finnhub/stock/dividend?symbol=AAPL&from=2023-01-01&to=2023-12-31');
    });

    it('should handle dividends errors', async () => {
      (fetch as any).mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      });

      await expect(finnhubService.getDividends('AAPL', '2023-01-01', '2023-12-31')).rejects.toThrow(
        'Finnhub proxy error: 400 Bad Request'
      );
    });
  });

  describe('getHistoricalPrices', () => {
    it('should fetch historical prices successfully', async () => {
      const mockHistoricalData = {
        c: [150.25, 152.30, 148.75, 155.10],
        h: [152.00, 154.50, 150.00, 156.25],
        l: [148.50, 150.75, 146.25, 152.80],
        o: [149.00, 151.00, 149.50, 153.25],
        v: [50000000, 45000000, 60000000, 40000000],
        t: [1640995200, 1641081600, 1641168000, 1641254400],
        s: 'ok',
      };

      (fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: mockHistoricalData,
        }),
      });

      const result = await finnhubService.getHistoricalPrices('AAPL', 'D', 1640995200, 1641254400);

      expect(result).toEqual(mockHistoricalData);
      expect(fetch).toHaveBeenCalledWith('/api/proxy/finnhub/stock/candle?symbol=AAPL&resolution=D&from=1640995200&to=1641254400');
    });

    it('should handle historical prices errors', async () => {
      (fetch as any).mockResolvedValue({
        ok: false,
        status: 422,
        statusText: 'Unprocessable Entity',
      });

      await expect(finnhubService.getHistoricalPrices('AAPL', 'D', 1640995200, 1641254400)).rejects.toThrow(
        'Finnhub proxy error: 422 Unprocessable Entity'
      );
    });
  });

  describe('error handling', () => {
    it('should handle timeout errors', async () => {
      (fetch as any).mockImplementation(() => 
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), 100);
        })
      );

      await expect(finnhubService.getStockPrice('AAPL')).rejects.toThrow(
        'Request timeout'
      );
    });

    it('should handle malformed JSON responses', async () => {
      (fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve('invalid json'),
      });

      await expect(finnhubService.getStockPrice('AAPL')).rejects.toThrow(
        'Finnhub API request failed'
      );
    });

    it('should handle empty responses', async () => {
      (fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await expect(finnhubService.getStockPrice('AAPL')).rejects.toThrow(
        'Finnhub API request failed'
      );
    });

    it('should handle network connectivity issues', async () => {
      (fetch as any).mockRejectedValue(new TypeError('Failed to fetch'));

      await expect(finnhubService.getStockPrice('AAPL')).rejects.toThrow(
        'Failed to fetch'
      );
    });
  });

  describe('request URL construction', () => {
    it('should construct URLs correctly for different endpoints', async () => {
      (fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {},
        }),
      });

      await finnhubService.getStockPrice('AAPL');
      expect(fetch).toHaveBeenCalledWith('/api/proxy/finnhub/quote?symbol=AAPL');

      await finnhubService.getCompanyProfile('AAPL');
      expect(fetch).toHaveBeenCalledWith('/api/proxy/finnhub/stock/profile2?symbol=AAPL');

      await finnhubService.getBasicFinancials('AAPL');
      expect(fetch).toHaveBeenCalledWith('/api/proxy/finnhub/stock/metric?symbol=AAPL&metric=all');

      await finnhubService.getIncomeStatement('AAPL');
      expect(fetch).toHaveBeenCalledWith('/api/proxy/finnhub/stock/financials?symbol=AAPL&statement=income&freq=quarterly');

      await finnhubService.getBalanceSheet('AAPL');
      expect(fetch).toHaveBeenCalledWith('/api/proxy/finnhub/stock/financials?symbol=AAPL&statement=balance-sheet&freq=quarterly');

      await finnhubService.getCashFlowStatement('AAPL');
      expect(fetch).toHaveBeenCalledWith('/api/proxy/finnhub/stock/financials?symbol=AAPL&statement=cash-flow&freq=quarterly');

      await finnhubService.getDividends('AAPL', '2023-01-01', '2023-12-31');
      expect(fetch).toHaveBeenCalledWith('/api/proxy/finnhub/stock/dividend?symbol=AAPL&from=2023-01-01&to=2023-12-31');

      await finnhubService.getHistoricalPrices('AAPL', 'D', 1640995200, 1641254400);
      expect(fetch).toHaveBeenCalledWith('/api/proxy/finnhub/stock/candle?symbol=AAPL&resolution=D&from=1640995200&to=1641254400');
    });
  });
});