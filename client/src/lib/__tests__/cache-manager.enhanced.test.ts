/**
 * Comprehensive test suite for CacheManager
 * Covers TTL, LRU eviction, memory management, and edge cases
 */
import { CacheManager, cacheManager } from '../cache-manager';

describe('CacheManager - Memory and TTL Management', () => {
  let cache: CacheManager;

  beforeEach(() => {
    jest.useFakeTimers();
    cache = new CacheManager();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Basic Cache Operations', () => {
    it('should store and retrieve data correctly', () => {
      const testData = { symbol: 'AAPL', price: 150.00 };
      cache.set('test-key', testData, 'stock-quote');

      const retrieved = cache.get('test-key', 'stock-quote');
      expect(retrieved).toEqual(testData);
    });

    it('should return null for non-existent keys', () => {
      const result = cache.get('non-existent-key', 'stock-quote');
      expect(result).toBeNull();
    });

    it('should handle different data types correctly', () => {
      const testCases = [
        { key: 'string-test', data: 'test string' },
        { key: 'number-test', data: 42 },
        { key: 'boolean-test', data: true },
        { key: 'array-test', data: [1, 2, 3] },
        { key: 'object-test', data: { nested: { value: 'test' } } },
        { key: 'null-test', data: null },
        { key: 'undefined-test', data: undefined }
      ];

      testCases.forEach(({ key, data }) => {
        cache.set(key, data, 'stock-quote');
        expect(cache.get(key, 'stock-quote')).toEqual(data);
      });
    });
  });

  describe('TTL (Time To Live) Management', () => {
    it('should expire entries after TTL', () => {
      cache.set('test-key', 'test-data', 'stock-quote');
      expect(cache.get('test-key', 'stock-quote')).toBe('test-data');

      // Fast forward past TTL (stock-quote TTL is 60 seconds)
      jest.advanceTimersByTime(61000);

      expect(cache.get('test-key', 'stock-quote')).toBeNull();
    });

    it('should respect different TTLs for different categories', () => {
      cache.set('quote-key', 'quote-data', 'stock-quote'); // 1 minute TTL
      cache.set('profile-key', 'profile-data', 'profile'); // 24 hour TTL
      cache.set('news-key', 'news-data', 'news'); // 15 minute TTL

      // Fast forward 10 minutes
      jest.advanceTimersByTime(10 * 60 * 1000);

      expect(cache.get('quote-key', 'stock-quote')).toBeNull(); // Expired
      expect(cache.get('profile-key', 'profile')).toBe('profile-data'); // Still valid
      expect(cache.get('news-key', 'news')).toBe('news-data'); // Still valid

      // Fast forward to 20 minutes total
      jest.advanceTimersByTime(10 * 60 * 1000);

      expect(cache.get('profile-key', 'profile')).toBe('profile-data'); // Still valid
      expect(cache.get('news-key', 'news')).toBeNull(); // Expired
    });

    it('should update access time on get operations', () => {
      cache.set('test-key', 'test-data', 'stock-quote');
      
      // Forward 30 seconds and access
      jest.advanceTimersByTime(30000);
      expect(cache.get('test-key', 'stock-quote')).toBe('test-data');

      // Forward another 45 seconds (75 total, but access was updated at 30)
      jest.advanceTimersByTime(45000);
      expect(cache.get('test-key', 'stock-quote')).toBeNull(); // Should be expired
    });

    it('should handle edge case of exactly at TTL boundary', () => {
      cache.set('boundary-test', 'data', 'stock-quote');
      
      // Advance exactly to TTL boundary (60 seconds)
      jest.advanceTimersByTime(60000);
      
      expect(cache.get('boundary-test', 'stock-quote')).toBeNull();
    });
  });

  describe('LRU Eviction Policy', () => {
    it('should evict oldest entry when maxSize is reached', () => {
      // Stock-quote category has maxSize of 100
      // Fill cache to max capacity
      for (let i = 0; i < 100; i++) {
        cache.set(`stock-quote-${i}`, `data-${i}`, 'stock-quote');
      }

      // Verify all entries are present
      for (let i = 0; i < 100; i++) {
        expect(cache.get(`stock-quote-${i}`, 'stock-quote')).toBe(`data-${i}`);
      }

      // Add one more entry to trigger eviction
      cache.set('stock-quote-new', 'new-data', 'stock-quote');

      // First entry should be evicted
      expect(cache.get('stock-quote-0', 'stock-quote')).toBeNull();
      expect(cache.get('stock-quote-new', 'stock-quote')).toBe('new-data');
      expect(cache.get('stock-quote-99', 'stock-quote')).toBe('data-99');
    });

    it('should evict based on access time, not insertion time', () => {
      // Add multiple entries
      cache.set('old-key', 'old-data', 'stock-quote');
      cache.set('middle-key', 'middle-data', 'stock-quote');
      cache.set('new-key', 'new-data', 'stock-quote');

      // Advance time and access the old key to update its timestamp
      jest.advanceTimersByTime(1000);
      cache.get('old-key', 'stock-quote');

      // Fill cache to trigger eviction
      for (let i = 0; i < 98; i++) {
        cache.set(`filler-${i}`, `data-${i}`, 'stock-quote');
      }

      // Add one more to trigger eviction
      cache.set('trigger-eviction', 'trigger-data', 'stock-quote');

      // Middle key should be evicted (oldest access time), old key should remain
      expect(cache.get('old-key', 'stock-quote')).toBe('old-data');
      expect(cache.get('middle-key', 'stock-quote')).toBeNull();
      expect(cache.get('new-key', 'stock-quote')).toBe('new-data');
    });

    it('should handle eviction across different categories correctly', () => {
      // Fill profile category to max (50 entries)
      for (let i = 0; i < 50; i++) {
        cache.set(`profile-${i}`, `profile-data-${i}`, 'profile');
      }

      // Fill stock-quote category to max (100 entries)
      for (let i = 0; i < 100; i++) {
        cache.set(`quote-${i}`, `quote-data-${i}`, 'stock-quote');
      }

      // Add to profile category to trigger eviction
      cache.set('profile-new', 'new-profile-data', 'profile');

      // Should evict from profile category only
      expect(cache.get('profile-0', 'profile')).toBeNull();
      expect(cache.get('profile-new', 'profile')).toBe('new-profile-data');
      expect(cache.get('quote-0', 'stock-quote')).toBe('quote-data-0');
    });

    it('should handle eviction when no entries exist for category', () => {
      // Try to evict from empty category - should not crash
      expect(() => {
        cache.set('test-key', 'test-data', 'stock-quote');
        // Manually trigger eviction logic
        (cache as any).evictOldest('nonexistent-category');
      }).not.toThrow();
    });
  });

  describe('Clear Operations', () => {
    beforeEach(() => {
      // Set up test data across categories
      cache.set('quote-1', 'quote-data-1', 'stock-quote');
      cache.set('quote-2', 'quote-data-2', 'stock-quote');
      cache.set('profile-1', 'profile-data-1', 'profile');
      cache.set('news-1', 'news-data-1', 'news');
    });

    it('should clear all entries when no category specified', () => {
      cache.clear();

      expect(cache.get('quote-1', 'stock-quote')).toBeNull();
      expect(cache.get('profile-1', 'profile')).toBeNull();
      expect(cache.get('news-1', 'news')).toBeNull();
    });

    it('should clear only specified category', () => {
      cache.clear('stock-quote');

      expect(cache.get('quote-1', 'stock-quote')).toBeNull();
      expect(cache.get('quote-2', 'stock-quote')).toBeNull();
      expect(cache.get('profile-1', 'profile')).toBe('profile-data-1');
      expect(cache.get('news-1', 'news')).toBe('news-data-1');
    });

    it('should handle clearing non-existent category gracefully', () => {
      expect(() => {
        cache.clear('non-existent-category');
      }).not.toThrow();

      // Existing data should remain
      expect(cache.get('quote-1', 'stock-quote')).toBe('quote-data-1');
    });

    it('should handle clearing when cache is already empty', () => {
      cache.clear();
      
      expect(() => {
        cache.clear();
        cache.clear('stock-quote');
      }).not.toThrow();
    });
  });

  describe('Statistics and Monitoring', () => {
    beforeEach(() => {
      cache.set('stock-quote-1', 'data1', 'stock-quote');
      cache.set('stock-quote-2', 'data2', 'stock-quote');
      cache.set('profile-1', 'data3', 'profile');
      cache.set('news-1', 'data4', 'news');
      cache.set('earnings-1', 'data5', 'earnings');
    });

    it('should return correct statistics', () => {
      const stats = cache.getStats();

      expect(stats.totalEntries).toBe(5);
      expect(stats.categories).toEqual({
        stock: 2,
        profile: 1,
        news: 1,
        earnings: 1
      });
    });

    it('should update statistics after cache operations', () => {
      cache.set('stock-quote-3', 'data6', 'stock-quote');
      cache.clear('profile');

      const stats = cache.getStats();

      expect(stats.totalEntries).toBe(4);
      expect(stats.categories.stock).toBe(3);
      expect(stats.categories.profile).toBeUndefined();
    });

    it('should handle statistics with empty cache', () => {
      cache.clear();
      const stats = cache.getStats();

      expect(stats.totalEntries).toBe(0);
      expect(Object.keys(stats.categories)).toHaveLength(0);
    });

    it('should categorize keys correctly based on prefix', () => {
      cache.set('custom-prefix-test', 'data', 'stock-quote');
      const stats = cache.getStats();

      expect(stats.categories.custom).toBe(1);
    });
  });

  describe('Memory Management and Performance', () => {
    it('should handle large data objects efficiently', () => {
      const largeObject = {
        data: new Array(10000).fill(0).map((_, i) => ({
          id: i,
          value: `value-${i}`,
          timestamp: Date.now()
        }))
      };

      expect(() => {
        cache.set('large-object', largeObject, 'stock-quote');
        const retrieved = cache.get('large-object', 'stock-quote');
        expect(retrieved).toEqual(largeObject);
      }).not.toThrow();
    });

    it('should handle rapid successive operations', () => {
      const operations = 1000;
      
      expect(() => {
        for (let i = 0; i < operations; i++) {
          cache.set(`rapid-${i}`, `data-${i}`, 'stock-quote');
          cache.get(`rapid-${i}`, 'stock-quote');
        }
      }).not.toThrow();
    });

    it('should maintain performance with mixed operations', () => {
      const start = performance.now();
      
      // Mixed operations
      for (let i = 0; i < 100; i++) {
        cache.set(`key-${i}`, `data-${i}`, 'stock-quote');
        if (i % 10 === 0) cache.clear('news');
        if (i % 5 === 0) cache.getStats();
        cache.get(`key-${i}`, 'stock-quote');
      }
      
      const end = performance.now();
      
      // Should complete quickly (under 100ms on modern hardware)
      expect(end - start).toBeLessThan(100);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle circular references in objects', () => {
      const circularObj: any = { name: 'test' };
      circularObj.self = circularObj;

      expect(() => {
        cache.set('circular', circularObj, 'stock-quote');
        const retrieved = cache.get('circular', 'stock-quote');
        expect(retrieved?.name).toBe('test');
        expect(retrieved?.self).toBe(retrieved);
      }).not.toThrow();
    });

    it('should handle special numeric values', () => {
      const specialValues = [
        { key: 'infinity', value: Infinity },
        { key: 'negative-infinity', value: -Infinity },
        { key: 'nan', value: NaN },
        { key: 'zero', value: 0 },
        { key: 'negative-zero', value: -0 }
      ];

      specialValues.forEach(({ key, value }) => {
        cache.set(key, value, 'stock-quote');
        const retrieved = cache.get(key, 'stock-quote');
        
        if (Number.isNaN(value)) {
          expect(Number.isNaN(retrieved)).toBe(true);
        } else if (Object.is(value, -0)) {
          expect(Object.is(retrieved, -0)).toBe(true);
        } else {
          expect(retrieved).toBe(value);
        }
      });
    });

    it('should handle very long keys', () => {
      const longKey = 'a'.repeat(10000);
      const data = 'test-data';

      expect(() => {
        cache.set(longKey, data, 'stock-quote');
        expect(cache.get(longKey, 'stock-quote')).toBe(data);
      }).not.toThrow();
    });

    it('should handle empty strings and special characters in keys', () => {
      const specialKeys = [
        '',
        ' ',
        '\n\t\r',
        '特殊字符',
        '🚀📈',
        'key-with-emojis-🎯',
        'key.with.dots',
        'key-with-dashes',
        'key_with_underscores',
        'key with spaces'
      ];

      specialKeys.forEach((key, index) => {
        const data = `data-${index}`;
        cache.set(key, data, 'stock-quote');
        expect(cache.get(key, 'stock-quote')).toBe(data);
      });
    });

    it('should handle undefined and null category gracefully', () => {
      expect(() => {
        cache.set('test', 'data', undefined as any);
        cache.get('test', null as any);
      }).not.toThrow();
    });
  });

  describe('Global Cache Instance', () => {
    it('should provide a global singleton instance', () => {
      expect(cacheManager).toBeInstanceOf(CacheManager);
      
      // Test that it's truly a singleton
      cacheManager.set('global-test', 'global-data', 'stock-quote');
      expect(cacheManager.get('global-test', 'stock-quote')).toBe('global-data');
    });

    it('should maintain state across operations on global instance', () => {
      cacheManager.clear();
      
      cacheManager.set('persistence-test', 'persistent-data', 'profile');
      
      // Simulate some time passing
      jest.advanceTimersByTime(1000);
      
      expect(cacheManager.get('persistence-test', 'profile')).toBe('persistent-data');
      
      const stats = cacheManager.getStats();
      expect(stats.totalEntries).toBe(1);
    });
  });

  describe('Category Configuration Integrity', () => {
    it('should have correct TTL values for each category', () => {
      const expectedTTLs = {
        'stock-quote': 60 * 1000, // 1 minute
        'financials': 60 * 60 * 1000, // 1 hour
        'profile': 24 * 60 * 60 * 1000, // 1 day
        'historical': 30 * 60 * 1000, // 30 minutes
        'earnings': 6 * 60 * 60 * 1000, // 6 hours
        'news': 15 * 60 * 1000 // 15 minutes
      };

      Object.entries(expectedTTLs).forEach(([category, expectedTTL]) => {
        cache.set('ttl-test', 'test-data', category as any);
        
        // Just before TTL
        jest.advanceTimersByTime(expectedTTL - 1000);
        expect(cache.get('ttl-test', category as any)).toBe('test-data');
        
        // Just after TTL
        jest.advanceTimersByTime(2000);
        expect(cache.get('ttl-test', category as any)).toBeNull();
        
        // Reset for next iteration
        jest.clearAllTimers();
        jest.useFakeTimers();
      });
    });

    it('should have appropriate maxSize values for each category', () => {
      const categories = ['stock-quote', 'financials', 'profile', 'historical', 'earnings', 'news'];
      
      categories.forEach(category => {
        // Each category should have a reasonable maxSize
        const categoryTyped = category as any;
        
        // Fill beyond reasonable limits to test maxSize enforcement
        for (let i = 0; i < 500; i++) {
          cache.set(`test-${i}`, `data-${i}`, categoryTyped);
        }
        
        const stats = cache.getStats();
        const categoryStats = stats.categories[category.split('-')[0]];
        
        // Should not exceed reasonable memory limits
        expect(categoryStats).toBeLessThanOrEqual(200);
      });
    });
  });
});