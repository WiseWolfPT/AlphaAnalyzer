import { FinnhubProvider } from '../unified-api/providers/finnhub.provider';
import { getCache } from '../cache';
import { getQuotaTracker } from '../quota';

describe('Finnhub Integration Tests', () => {
  let provider: FinnhubProvider;
  const cache = getCache();
  const quotaTracker = getQuotaTracker();

  beforeAll(async () => {
    // Clear cache before tests
    await cache.clear();
    
    provider = new FinnhubProvider();
    
    // Check if we have a valid API key
    const apiKey = provider.getApiKey();
    if (!apiKey || apiKey === 'demo') {
      console.warn('Skipping Finnhub tests - no valid API key configured');
      return;
    }
    
    await provider.initialize();
  });

  afterAll(async () => {
    await cache.clear();
  });

  describe('Provider Health', () => {
    it('should report healthy when API key is valid', async () => {
      if (provider.getApiKey() === 'demo') {
        return;
      }
      
      const isHealthy = await provider.isHealthy();
      expect(isHealthy).toBe(true);
    });
  });

  describe('Price Data', () => {
    it('should fetch real-time price for AAPL', async () => {
      if (provider.getApiKey() === 'demo') {
        return;
      }
      
      const price = await provider.getPrice('AAPL');
      
      expect(price).toBeDefined();
      expect(price.symbol).toBe('AAPL');
      expect(price.price).toBeGreaterThan(0);
      expect(price.provider).toBe('finnhub');
      expect(price.timestamp).toBeGreaterThan(Date.now() - 5000);
      
      // Record quota usage
      await quotaTracker.recordCall('finnhub', 'price');
    });

    it('should handle invalid symbol gracefully', async () => {
      if (provider.getApiKey() === 'demo') {
        return;
      }
      
      await expect(provider.getPrice('INVALID123')).rejects.toThrow();
    });
  });

  describe('Company Info', () => {
    it('should fetch company information', async () => {
      if (provider.getApiKey() === 'demo') {
        return;
      }
      
      const info = await provider.getCompanyInfo('MSFT');
      
      expect(info).toBeDefined();
      expect(info.symbol).toBe('MSFT');
      expect(info.name).toContain('Microsoft');
      expect(info.exchange).toBeDefined();
      expect(info.sector).toBeDefined();
      
      await quotaTracker.recordCall('finnhub', 'company');
    });
  });

  describe('Fundamentals', () => {
    it('should fetch fundamental data', async () => {
      if (provider.getApiKey() === 'demo') {
        return;
      }
      
      const fundamentals = await provider.getFundamentals('GOOGL');
      
      expect(fundamentals).toBeDefined();
      expect(fundamentals.symbol).toBe('GOOGL');
      expect(fundamentals.marketCap).toBeGreaterThan(0);
      expect(fundamentals.pe).toBeDefined();
      expect(fundamentals.eps).toBeDefined();
      
      await quotaTracker.recordCall('finnhub', 'fundamentals');
    });
  });

  describe('News', () => {
    it('should fetch recent news', async () => {
      if (provider.getApiKey() === 'demo') {
        return;
      }
      
      const news = await provider.getNews('TSLA', 5);
      
      expect(news).toBeDefined();
      expect(news.symbol).toBe('TSLA');
      expect(news.items).toBeDefined();
      expect(news.items.length).toBeLessThanOrEqual(5);
      
      if (news.items.length > 0) {
        const firstItem = news.items[0];
        expect(firstItem.headline).toBeDefined();
        expect(firstItem.url).toBeDefined();
        expect(firstItem.source).toBeDefined();
        expect(firstItem.publishedAt).toBeDefined();
      }
      
      await quotaTracker.recordCall('finnhub', 'news');
    });
  });

  describe('Rate Limiting', () => {
    it('should respect rate limits', async () => {
      if (provider.getApiKey() === 'demo') {
        return;
      }
      
      const usage = await quotaTracker.getUsage('finnhub');
      console.log('Current Finnhub usage:', {
        today: usage.today,
        lastMinute: usage.lastMinute,
        quotaRemaining: usage.quotaRemaining
      });
      
      expect(usage.lastMinute).toBeLessThan(60);
    });
  });
});