import { InMemoryCache } from '../cache/in-memory-cache';

describe('InMemoryCache', () => {
  let cache: InMemoryCache;

  beforeEach(() => {
    cache = new InMemoryCache({ maxSizeInMB: 1, defaultTTL: 60 });
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Basic Operations', () => {
    it('should store and retrieve values', async () => {
      await cache.set('key1', 'value1');
      const value = await cache.get('key1');
      expect(value).toBe('value1');
    });

    it('should return null for non-existent keys', async () => {
      const value = await cache.get('nonexistent');
      expect(value).toBeNull();
    });

    it('should delete values', async () => {
      await cache.set('key1', 'value1');
      const deleted = await cache.delete('key1');
      expect(deleted).toBe(true);
      
      const value = await cache.get('key1');
      expect(value).toBeNull();
    });

    it('should clear all values', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.clear();
      
      expect(await cache.size()).toBe(0);
    });
  });

  describe('TTL Functionality', () => {
    it('should expire values after TTL', async () => {
      await cache.set('key1', 'value1', 1); // 1 second TTL
      
      expect(await cache.get('key1')).toBe('value1');
      
      // Fast forward 2 seconds
      jest.advanceTimersByTime(2000);
      
      expect(await cache.get('key1')).toBeNull();
    });

    it('should use default TTL when not specified', async () => {
      await cache.set('key1', 'value1'); // Uses default 60s
      
      jest.advanceTimersByTime(30000); // 30 seconds
      expect(await cache.get('key1')).toBe('value1');
      
      jest.advanceTimersByTime(31000); // Total 61 seconds
      expect(await cache.get('key1')).toBeNull();
    });
  });

  describe('Batch Operations', () => {
    it('should get multiple values', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.set('key3', 'value3');
      
      const values = await cache.getMultiple(['key1', 'key2', 'key4']);
      
      expect(values).toEqual({
        key1: 'value1',
        key2: 'value2'
      });
    });

    it('should set multiple values', async () => {
      await cache.setMultiple({
        key1: 'value1',
        key2: 'value2',
        key3: 'value3'
      }, 10);
      
      expect(await cache.get('key1')).toBe('value1');
      expect(await cache.get('key2')).toBe('value2');
      expect(await cache.get('key3')).toBe('value3');
      
      jest.advanceTimersByTime(11000);
      
      expect(await cache.get('key1')).toBeNull();
    });
  });

  describe('Memory Management', () => {
    it('should track cache statistics', async () => {
      await cache.set('key1', 'a'.repeat(100));
      await cache.set('key2', 'b'.repeat(200));
      
      const stats = cache.getCacheStats();
      
      expect(stats.size).toBe(2);
      expect(stats.memoryUsageBytes).toBeGreaterThan(0);
      expect(stats.maxSizeMB).toBe(1);
    });

    it('should evict oldest entries when memory limit exceeded', async () => {
      // Fill cache near limit
      for (let i = 0; i < 1000; i++) {
        await cache.set(`key${i}`, 'x'.repeat(1000), 3600);
      }
      
      const sizeBefore = await cache.size();
      
      // This should trigger eviction
      await cache.set('newKey', 'y'.repeat(10000));
      
      const sizeAfter = await cache.size();
      expect(sizeAfter).toBeLessThanOrEqual(sizeBefore);
    });
  });

  describe('Complex Data Types', () => {
    it('should handle objects', async () => {
      const obj = { name: 'test', value: 123, nested: { data: true } };
      await cache.set('obj', obj);
      
      const retrieved = await cache.get('obj');
      expect(retrieved).toEqual(obj);
    });

    it('should handle arrays', async () => {
      const arr = [1, 2, 3, { name: 'test' }];
      await cache.set('arr', arr);
      
      const retrieved = await cache.get('arr');
      expect(retrieved).toEqual(arr);
    });
  });
});