import { CacheManager } from '../cache-manager';

describe('CacheManager', () => {
  let cacheManager: CacheManager;

  beforeEach(() => {
    cacheManager = new CacheManager();
    // Clear localStorage before each test
    localStorage.clear();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Memory Cache', () => {
    it('should store and retrieve data from memory cache', () => {
      const key = 'test-key';
      const data = { value: 'test-data' };

      cacheManager.set(key, data, { ttl: 60000 });
      const retrieved = cacheManager.get(key);

      expect(retrieved).toEqual(data);
    });

    it('should return null for non-existent keys', () => {
      const result = cacheManager.get('non-existent');
      expect(result).toBeNull();
    });

    it('should expire data after TTL', () => {
      const key = 'expire-test';
      const data = { value: 'will-expire' };

      cacheManager.set(key, data, { ttl: 5000 }); // 5 seconds

      // Data should exist immediately
      expect(cacheManager.get(key)).toEqual(data);

      // Fast forward 6 seconds
      jest.advanceTimersByTime(6000);

      // Data should be expired
      expect(cacheManager.get(key)).toBeNull();
    });

    it('should handle cache invalidation', () => {
      const key = 'invalidate-test';
      const data = { value: 'to-invalidate' };

      cacheManager.set(key, data);
      expect(cacheManager.get(key)).toEqual(data);

      cacheManager.invalidate(key);
      expect(cacheManager.get(key)).toBeNull();
    });

    it('should clear all cache entries', () => {
      cacheManager.set('key1', { value: 1 });
      cacheManager.set('key2', { value: 2 });
      cacheManager.set('key3', { value: 3 });

      cacheManager.clear();

      expect(cacheManager.get('key1')).toBeNull();
      expect(cacheManager.get('key2')).toBeNull();
      expect(cacheManager.get('key3')).toBeNull();
    });
  });

  describe('LocalStorage Persistence', () => {
    it('should persist data to localStorage when configured', () => {
      const key = 'persist-test';
      const data = { value: 'persistent' };

      cacheManager.set(key, data, { persist: true });

      const storageKey = `cache:${key}`;
      const storedData = localStorage.getItem(storageKey);
      expect(storedData).toBeTruthy();

      const parsed = JSON.parse(storedData!);
      expect(parsed.data).toEqual(data);
    });

    it('should load persisted data on initialization', () => {
      const key = 'preload-test';
      const data = { value: 'preloaded' };
      const storageKey = `cache:${key}`;

      // Manually set data in localStorage
      localStorage.setItem(storageKey, JSON.stringify({
        data,
        expires: Date.now() + 60000,
        version: 1
      }));

      // Create new cache manager instance
      const newCacheManager = new CacheManager();
      const retrieved = newCacheManager.get(key);

      expect(retrieved).toEqual(data);
    });

    it('should not load expired persisted data', () => {
      const key = 'expired-persist';
      const data = { value: 'expired' };
      const storageKey = `cache:${key}`;

      // Set expired data in localStorage
      localStorage.setItem(storageKey, JSON.stringify({
        data,
        expires: Date.now() - 1000, // Expired 1 second ago
        version: 1
      }));

      const newCacheManager = new CacheManager();
      const retrieved = newCacheManager.get(key);

      expect(retrieved).toBeNull();
      // Should clean up expired data
      expect(localStorage.getItem(storageKey)).toBeNull();
    });
  });

  describe('Cache Patterns', () => {
    it('should invalidate pattern-based keys', () => {
      cacheManager.set('user:1', { id: 1, name: 'User 1' });
      cacheManager.set('user:2', { id: 2, name: 'User 2' });
      cacheManager.set('post:1', { id: 1, title: 'Post 1' });

      cacheManager.invalidatePattern('user:*');

      expect(cacheManager.get('user:1')).toBeNull();
      expect(cacheManager.get('user:2')).toBeNull();
      expect(cacheManager.get('post:1')).not.toBeNull();
    });

    it('should get cache statistics', () => {
      cacheManager.set('key1', { value: 1 });
      cacheManager.set('key2', { value: 2 });
      cacheManager.get('key1'); // Hit
      cacheManager.get('key1'); // Hit
      cacheManager.get('key3'); // Miss

      const stats = cacheManager.getStats();

      expect(stats.size).toBe(2);
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(0.67, 2);
    });
  });

  describe('Error Handling', () => {
    it('should handle localStorage quota exceeded', () => {
      const key = 'large-data';
      const largeData = 'x'.repeat(10 * 1024 * 1024); // 10MB string

      // Mock localStorage.setItem to throw quota error
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn().mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      // Should not throw, but handle gracefully
      expect(() => {
        cacheManager.set(key, largeData, { persist: true });
      }).not.toThrow();

      // Data should still be in memory cache
      expect(cacheManager.get(key)).toBe(largeData);

      localStorage.setItem = originalSetItem;
    });

    it('should handle corrupted localStorage data', () => {
      const key = 'corrupted';
      const storageKey = `cache:${key}`;

      // Set corrupted data
      localStorage.setItem(storageKey, 'not-json');

      const newCacheManager = new CacheManager();
      const retrieved = newCacheManager.get(key);

      expect(retrieved).toBeNull();
      // Should clean up corrupted data
      expect(localStorage.getItem(storageKey)).toBeNull();
    });
  });
});