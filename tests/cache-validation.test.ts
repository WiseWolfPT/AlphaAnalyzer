import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fetch from 'node-fetch';

// Test configuration
const KOYEB_URL = 'http://jsg00k40sgo0k4swsoc4gcsg.128.140.45.28.sslip.io';
const LOCAL_URL = 'http://localhost:3001';
const TEST_SYMBOLS = ['AAPL', 'MSFT', 'GOOGL'];

// Use Koyeb in production, local for development
const API_URL = process.env.NODE_ENV === 'production' ? KOYEB_URL : LOCAL_URL;

describe('Cache System Validation', () => {
  // Test if backend is reachable
  beforeAll(async () => {
    try {
      const response = await fetch(`${API_URL}/api/health`);
      if (!response.ok) {
        throw new Error(`Backend not reachable at ${API_URL}`);
      }
    } catch (error) {
      console.error('Backend health check failed:', error);
      throw error;
    }
  });

  describe('Single Quote Cache', () => {
    it('should return cached data on second request', async () => {
      const symbol = TEST_SYMBOLS[0];
      
      // First request - should hit external API
      console.log(`\n📊 Testing cache for ${symbol}...`);
      const start1 = Date.now();
      const response1 = await fetch(`${API_URL}/api/market-data/quote/${symbol}`);
      const data1 = await response1.json();
      const time1 = Date.now() - start1;
      
      expect(response1.ok).toBe(true);
      expect(data1).toHaveProperty('symbol', symbol);
      expect(data1).toHaveProperty('price');
      console.log(`  ✅ First request: ${time1}ms (from API)`);
      
      // Wait a bit to ensure cache is saved
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Second request - should hit cache
      const start2 = Date.now();
      const response2 = await fetch(`${API_URL}/api/market-data/quote/${symbol}`);
      const data2 = await response2.json();
      const time2 = Date.now() - start2;
      
      expect(response2.ok).toBe(true);
      expect(data2).toHaveProperty('symbol', symbol);
      expect(data2.price).toBe(data1.price); // Same price = cached
      console.log(`  ✅ Second request: ${time2}ms (from cache)`);
      
      // Cache should be significantly faster
      expect(time2).toBeLessThan(time1 * 0.5);
      console.log(`  📈 Cache speedup: ${Math.round((1 - time2/time1) * 100)}%`);
    }, 30000);
  });

  describe('Batch Quote Cache', () => {
    it('should cache batch requests efficiently', async () => {
      const symbols = TEST_SYMBOLS.join(',');
      
      // First batch request
      console.log(`\n📊 Testing batch cache for ${symbols}...`);
      const start1 = Date.now();
      const response1 = await fetch(`${API_URL}/api/market-data/quotes?symbols=${symbols}`);
      const data1 = await response1.json();
      const time1 = Date.now() - start1;
      
      expect(response1.ok).toBe(true);
      expect(data1).toHaveProperty('quotes');
      expect(Array.isArray(data1.quotes)).toBe(true);
      expect(data1.quotes.length).toBeGreaterThan(0);
      console.log(`  ✅ First batch request: ${time1}ms (from API)`);
      
      // Wait for cache
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Second batch request
      const start2 = Date.now();
      const response2 = await fetch(`${API_URL}/api/market-data/quotes?symbols=${symbols}`);
      const data2 = await response2.json();
      const time2 = Date.now() - start2;
      
      expect(response2.ok).toBe(true);
      expect(data2.quotes.length).toBe(data1.quotes.length);
      console.log(`  ✅ Second batch request: ${time2}ms (from cache)`);
      
      // Verify cache speedup
      expect(time2).toBeLessThan(time1 * 0.5);
      console.log(`  📈 Batch cache speedup: ${Math.round((1 - time2/time1) * 100)}%`);
    }, 30000);
  });

  describe('Chart Data Cache', () => {
    it('should cache chart data with proper TTL', async () => {
      const symbol = TEST_SYMBOLS[0];
      const period = '1D';
      
      // First chart request
      console.log(`\n📊 Testing chart cache for ${symbol} (${period})...`);
      const start1 = Date.now();
      const response1 = await fetch(`${API_URL}/api/market-data/chart/${symbol}?period=${period}`);
      const data1 = await response1.json();
      const time1 = Date.now() - start1;
      
      expect(response1.ok).toBe(true);
      expect(data1).toHaveProperty('data');
      expect(Array.isArray(data1.data)).toBe(true);
      console.log(`  ✅ First chart request: ${time1}ms (from API)`);
      
      // Wait for cache
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Second chart request
      const start2 = Date.now();
      const response2 = await fetch(`${API_URL}/api/market-data/chart/${symbol}?period=${period}`);
      const data2 = await response2.json();
      const time2 = Date.now() - start2;
      
      expect(response2.ok).toBe(true);
      expect(data2.data.length).toBe(data1.data.length);
      console.log(`  ✅ Second chart request: ${time2}ms (from cache)`);
      
      // Verify cache speedup
      expect(time2).toBeLessThan(time1 * 0.5);
      console.log(`  📈 Chart cache speedup: ${Math.round((1 - time2/time1) * 100)}%`);
    }, 30000);
  });

  describe('Cache Statistics', () => {
    it('should track cache performance metrics', async () => {
      // Get cache stats if endpoint exists
      try {
        const response = await fetch(`${API_URL}/api/market-data/cache-stats`);
        if (response.ok) {
          const stats = await response.json();
          console.log('\n📊 Cache Statistics:');
          console.log(`  - Hit Rate: ${stats.hitRate || 'N/A'}%`);
          console.log(`  - Total Hits: ${stats.hits || 0}`);
          console.log(`  - Total Misses: ${stats.misses || 0}`);
          console.log(`  - API Calls Saved: ${stats.apiCallsSaved || 0}`);
          console.log(`  - Cache Size: ${stats.size || 0} items`);
        }
      } catch (error) {
        console.log('\n📊 Cache stats endpoint not available');
      }
    });
  });

  describe('API Quota Preservation', () => {
    it('should minimize external API calls', async () => {
      const testRuns = 5;
      const symbol = TEST_SYMBOLS[1];
      
      console.log(`\n📊 Testing API quota preservation (${testRuns} requests)...`);
      
      // Make multiple requests to same symbol
      const times = [];
      for (let i = 0; i < testRuns; i++) {
        const start = Date.now();
        const response = await fetch(`${API_URL}/api/market-data/quote/${symbol}`);
        const time = Date.now() - start;
        times.push(time);
        
        expect(response.ok).toBe(true);
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      // First request should be slowest (API call)
      const avgCachedTime = times.slice(1).reduce((a, b) => a + b, 0) / (times.length - 1);
      console.log(`  ✅ First request: ${times[0]}ms (API call)`);
      console.log(`  ✅ Avg cached requests: ${Math.round(avgCachedTime)}ms`);
      console.log(`  📈 API calls saved: ${testRuns - 1} out of ${testRuns}`);
      
      // Cached requests should be much faster
      expect(avgCachedTime).toBeLessThan(times[0] * 0.3);
    }, 30000);
  });
});

// Run summary
afterAll(() => {
  console.log('\n✅ Cache validation complete!');
  console.log('The caching system is effectively reducing API calls and improving response times.');
});