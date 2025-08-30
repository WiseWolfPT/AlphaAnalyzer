import Redis from 'ioredis';
import { logger } from '../lib/logger';

interface CachedQuote {
  symbol: string;
  name?: string;
  price: number;
  changesPercentage: number;
  change: number;
  dayLow?: number;
  dayHigh?: number;
  yearHigh?: number;
  yearLow?: number;
  marketCap?: number;
  priceAvg50?: number;
  priceAvg200?: number;
  volume?: number;
  avgVolume?: number;
  exchange?: string;
  open?: number;
  previousClose?: number;
  eps?: number;
  pe?: number;
  earningsAnnouncement?: string;
  sharesOutstanding?: number;
  timestamp?: number;
  cachedAt: number;
}

class CacheService {
  private redis: Redis | null = null;
  private isConnected: boolean = false;
  private fallbackCache: Map<string, { value: any; expires: number }> = new Map();
  private cleanupInterval: NodeJS.Timeout;
  
  constructor() {
    this.connect();
    // Fallback to in-memory cache if Redis fails
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, 60000);
  }
  
  private async connect() {
    try {
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || 'alfalyzer2025redis',
        maxRetriesPerRequest: 3,
        retryStrategy: (times: number) => {
          if (times > 3) {
            logger.error('Redis: Max connection attempts reached, falling back to in-memory cache');
            return null;
          }
          const delay = Math.min(times * 50, 2000);
          logger.info(`Redis: Retrying connection in ${delay}ms...`);
          return delay;
        },
        enableOfflineQueue: false,
      });
      
      this.redis.on('connect', () => {
        this.isConnected = true;
        logger.info('✅ Redis Cache Service connected successfully');
      });
      
      this.redis.on('error', (error) => {
        logger.error('Redis error:', error);
        this.isConnected = false;
      });
      
      this.redis.on('close', () => {
        this.isConnected = false;
        logger.warn('Redis connection closed, falling back to in-memory cache');
      });
      
      await this.redis.ping();
      
    } catch (error) {
      logger.error('Failed to connect to Redis, using in-memory cache:', error);
      this.isConnected = false;
    }
  }
  
  // Maintain backward compatibility with existing code
  async get(key: string): Promise<any | null> {
    if (this.isConnected && this.redis) {
      try {
        const cached = await this.redis.get(key);
        if (cached) {
          logger.debug(`Redis cache hit for ${key}`);
          return JSON.parse(cached);
        }
      } catch (error) {
        logger.error(`Redis get error for ${key}:`, error);
      }
    }
    
    // Fallback to in-memory cache
    const entry = this.fallbackCache.get(key);
    if (entry && Date.now() <= entry.expires) {
      logger.debug(`In-memory cache hit for ${key}`);
      return entry.value;
    }
    
    return null;
  }
  
  async set(key: string, value: any, ttlSeconds: number): Promise<void> {
    if (this.isConnected && this.redis) {
      try {
        await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
        logger.debug(`Cached ${key} in Redis`);
        return;
      } catch (error) {
        logger.error(`Redis set error for ${key}:`, error);
      }
    }
    
    // Fallback to in-memory cache
    const expires = Date.now() + (ttlSeconds * 1000);
    this.fallbackCache.set(key, { value, expires });
    logger.debug(`Cached ${key} in memory`);
  }
  
  async delete(key: string): Promise<void> {
    if (this.isConnected && this.redis) {
      try {
        await this.redis.del(key);
      } catch (error) {
        logger.error(`Redis delete error for ${key}:`, error);
      }
    }
    this.fallbackCache.delete(key);
  }
  
  async clear(): Promise<void> {
    if (this.isConnected && this.redis) {
      try {
        await this.redis.flushdb();
      } catch (error) {
        logger.error('Redis clear error:', error);
      }
    }
    this.fallbackCache.clear();
  }
  
  // New methods for quotes
  async setQuote(symbol: string, data: any, ttl: number = 60): Promise<void> {
    await this.set(`quote:${symbol}`, { ...data, cachedAt: Date.now() }, ttl);
  }
  
  async getQuote(symbol: string): Promise<CachedQuote | null> {
    return await this.get(`quote:${symbol}`);
  }
  
  async setQuotes(quotes: Record<string, any>): Promise<void> {
    for (const [symbol, data] of Object.entries(quotes)) {
      await this.setQuote(symbol, data);
    }
  }
  
  async getBatchQuotes(symbols: string[]): Promise<Record<string, CachedQuote | null>> {
    const results: Record<string, CachedQuote | null> = {};
    for (const symbol of symbols) {
      results[symbol] = await this.getQuote(symbol);
    }
    return results;
  }
  
  async setFinancials(symbol: string, period: string, data: any, ttl: number = 3600): Promise<void> {
    await this.set(`financials:${symbol}:${period}`, { ...data, cachedAt: Date.now() }, ttl);
  }
  
  async getFinancials(symbol: string, period: string): Promise<any> {
    return await this.get(`financials:${symbol}:${period}`);
  }
  
  async setMarketMovers(data: any, ttl: number = 300): Promise<void> {
    await this.set('market:movers', { ...data, cachedAt: Date.now() }, ttl);
  }
  
  async getMarketMovers(): Promise<any> {
    return await this.get('market:movers');
  }
  
  async getCacheStats(): Promise<{
    connected: boolean;
    type: 'redis' | 'memory';
    memoryUsage?: string;
    totalKeys?: number;
  }> {
    if (this.isConnected && this.redis) {
      try {
        const info = await this.redis.info('memory');
        const memoryMatch = info.match(/used_memory_human:(.+)/);
        const memoryUsage = memoryMatch ? memoryMatch[1].trim() : 'unknown';
        const totalKeys = await this.redis.dbsize();
        
        return {
          connected: true,
          type: 'redis',
          memoryUsage,
          totalKeys
        };
      } catch (error) {
        logger.error('Failed to get Redis stats:', error);
      }
    }
    
    return {
      connected: false,
      type: 'memory',
      totalKeys: this.fallbackCache.size
    };
  }
  
  private cleanupExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.fallbackCache.entries()) {
      if (now > entry.expires) {
        this.fallbackCache.delete(key);
      }
    }
  }
  
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    if (this.redis) {
      this.redis.quit();
    }
    this.fallbackCache.clear();
  }
  
  isAvailable(): boolean {
    return this.isConnected || this.fallbackCache.size > 0;
  }
}

// Export both the class and the singleton instance
export { CacheService };
export const cacheService = new CacheService();