import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { MarketDataService } from '../market-data-service';
import { cache } from '../cache-service';

// Mock cache service
jest.mock('../cache-service', () => ({
  cache: {
    get: jest.fn(),
    set: jest.fn(),
    has: jest.fn(),
    delete: jest.fn(),
  },
}));

// Mock API services
jest.mock('../alpha-vantage-service');
jest.mock('../finnhub-service');

describe('MarketDataService', () => {
  let marketDataService: MarketDataService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    marketDataService = new MarketDataService();
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });
  
  describe('getQuote', () => {
    it('should return cached quote if available', async () => {
      const symbol = 'AAPL';
      const cachedQuote = {
        symbol,
        price: 150.00,
        change: 2.50,
        changePercent: 1.69,
        volume: 1000000,
        timestamp: new Date().toISOString(),
      };
      
      (cache.get as jest.Mock).mockReturnValue(cachedQuote);
      
      const result = await marketDataService.getQuote(symbol);
      
      expect(cache.get).toHaveBeenCalledWith(`quote:${symbol}`);
      expect(result).toEqual(cachedQuote);
    });
    
    it('should fetch from API if not cached', async () => {
      const symbol = 'AAPL';
      const apiQuote = {
        symbol,
        price: 150.00,
        change: 2.50,
        changePercent: 1.69,
        volume: 1000000,
      };
      
      (cache.get as jest.Mock).mockReturnValue(null);
      
      // Mock the private fetchQuoteFromAPIs method
      const fetchSpy = jest.spyOn(marketDataService as any, 'fetchQuoteFromAPIs')
        .mockResolvedValue(apiQuote);
      
      const result = await marketDataService.getQuote(symbol);
      
      expect(cache.get).toHaveBeenCalledWith(`quote:${symbol}`);
      expect(fetchSpy).toHaveBeenCalledWith(symbol);
      expect(cache.set).toHaveBeenCalledWith(
        `quote:${symbol}`,
        expect.objectContaining(apiQuote),
        300 // 5 minutes TTL
      );
      expect(result).toMatchObject(apiQuote);
    });
    
    it('should handle API failures gracefully', async () => {
      const symbol = 'INVALID';
      
      (cache.get as jest.Mock).mockReturnValue(null);
      
      const fetchSpy = jest.spyOn(marketDataService as any, 'fetchQuoteFromAPIs')
        .mockRejectedValue(new Error('All APIs failed'));
      
      await expect(marketDataService.getQuote(symbol)).rejects.toThrow('All APIs failed');
      
      expect(cache.set).not.toHaveBeenCalled();
    });
  });
  
  describe('getBatchQuotes', () => {
    it('should fetch multiple quotes efficiently', async () => {
      const symbols = ['AAPL', 'GOOGL', 'MSFT'];
      const quotes = symbols.map(symbol => ({
        symbol,
        price: Math.random() * 1000,
        change: Math.random() * 10,
        changePercent: Math.random() * 5,
        volume: Math.floor(Math.random() * 1000000),
        timestamp: new Date().toISOString(),
      }));
      
      const getQuoteSpy = jest.spyOn(marketDataService, 'getQuote');
      quotes.forEach((quote, index) => {
        getQuoteSpy.mockResolvedValueOnce(quote);
      });
      
      const result = await marketDataService.getBatchQuotes(symbols);
      
      expect(getQuoteSpy).toHaveBeenCalledTimes(symbols.length);
      expect(result).toHaveLength(symbols.length);
      expect(result).toEqual(quotes);
    });
    
    it('should handle partial failures in batch requests', async () => {
      const symbols = ['AAPL', 'INVALID', 'MSFT'];
      
      const getQuoteSpy = jest.spyOn(marketDataService, 'getQuote');
      getQuoteSpy
        .mockResolvedValueOnce({ symbol: 'AAPL', price: 150 } as any)
        .mockRejectedValueOnce(new Error('Invalid symbol'))
        .mockResolvedValueOnce({ symbol: 'MSFT', price: 300 } as any);
      
      const result = await marketDataService.getBatchQuotes(symbols);
      
      expect(result).toHaveLength(2);
      expect(result.map(q => q.symbol)).toEqual(['AAPL', 'MSFT']);
    });
  });
  
  describe('getHistoricalData', () => {
    it('should return cached historical data if available', async () => {
      const symbol = 'AAPL';
      const range = '1M';
      const cachedData = {
        symbol,
        range,
        data: [
          { date: '2024-01-01', open: 145, high: 150, low: 144, close: 149, volume: 1000000 },
          { date: '2024-01-02', open: 149, high: 152, low: 148, close: 151, volume: 1100000 },
        ],
      };
      
      (cache.get as jest.Mock).mockReturnValue(cachedData);
      
      const result = await marketDataService.getHistoricalData(symbol, range);
      
      expect(cache.get).toHaveBeenCalledWith(`historical:${symbol}:${range}`);
      expect(result).toEqual(cachedData);
    });
    
    it('should validate date range parameter', async () => {
      const symbol = 'AAPL';
      const invalidRange = 'INVALID' as any;
      
      await expect(marketDataService.getHistoricalData(symbol, invalidRange))
        .rejects.toThrow('Invalid date range');
    });
  });
  
  describe('getMarketStatus', () => {
    it('should determine market status based on current time', async () => {
      // Mock a weekday during market hours (10 AM EST)
      const marketOpenTime = new Date('2024-01-02T15:00:00Z'); // Tuesday 10 AM EST
      jest.useFakeTimers();
      jest.setSystemTime(marketOpenTime);
      
      const status = await marketDataService.getMarketStatus();
      
      expect(status).toEqual({
        isOpen: true,
        session: 'regular',
        nextOpen: expect.any(Date),
        nextClose: expect.any(Date),
      });
      
      jest.useRealTimers();
    });
    
    it('should handle pre-market hours correctly', async () => {
      // Mock a weekday during pre-market hours (5 AM EST)
      const preMarketTime = new Date('2024-01-02T10:00:00Z'); // Tuesday 5 AM EST
      jest.useFakeTimers();
      jest.setSystemTime(preMarketTime);
      
      const status = await marketDataService.getMarketStatus();
      
      expect(status).toEqual({
        isOpen: true,
        session: 'pre-market',
        nextOpen: expect.any(Date),
        nextClose: expect.any(Date),
      });
      
      jest.useRealTimers();
    });
    
    it('should handle weekend correctly', async () => {
      // Mock a Saturday
      const weekendTime = new Date('2024-01-06T15:00:00Z'); // Saturday
      jest.useFakeTimers();
      jest.setSystemTime(weekendTime);
      
      const status = await marketDataService.getMarketStatus();
      
      expect(status).toEqual({
        isOpen: false,
        session: 'closed',
        nextOpen: expect.any(Date),
        nextClose: expect.any(Date),
      });
      
      jest.useRealTimers();
    });
  });
  
  describe('API rotation and fallback', () => {
    it('should rotate through APIs on failure', async () => {
      const symbol = 'AAPL';
      
      (cache.get as jest.Mock).mockReturnValue(null);
      
      // Mock API calls to simulate failures
      const alphaVantageService = require('../alpha-vantage-service').default;
      const finnhubService = require('../finnhub-service').default;
      
      alphaVantageService.getQuote = jest.fn().mockRejectedValue(new Error('API limit reached'));
      finnhubService.getQuote = jest.fn().mockResolvedValue({
        symbol,
        price: 150.00,
        change: 2.50,
        changePercent: 1.69,
      });
      
      const result = await marketDataService.getQuote(symbol);
      
      expect(alphaVantageService.getQuote).toHaveBeenCalledWith(symbol);
      expect(finnhubService.getQuote).toHaveBeenCalledWith(symbol);
      expect(result.symbol).toBe(symbol);
    });
    
    it('should track API usage for quota management', async () => {
      const symbol = 'AAPL';
      const trackUsageSpy = jest.spyOn(marketDataService as any, 'trackApiUsage');
      
      (cache.get as jest.Mock).mockReturnValue(null);
      
      // Mock successful API call
      const finnhubService = require('../finnhub-service').default;
      finnhubService.getQuote = jest.fn().mockResolvedValue({
        symbol,
        price: 150.00,
      });
      
      await marketDataService.getQuote(symbol);
      
      expect(trackUsageSpy).toHaveBeenCalled();
    });
  });
});