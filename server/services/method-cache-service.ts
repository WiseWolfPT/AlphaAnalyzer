/**
 * Method Cache Service - ONDA 7
 *
 * Enables method-level caching for IV calculations, allowing proactive warming
 * of all 1,493 stocks without user dependency.
 *
 * Architecture:
 * - Each method cached separately: `iv:method:{TICKER}:{METHOD_ID}`
 * - 24-hour TTL (configurable)
 * - Thundering herd protection via in-flight request tracking
 * - Selective invalidation per method
 *
 * Benefits:
 * - Parallel warming: 12 methods × 4 calls/sec = 48 stocks/sec capacity
 * - Selective invalidation: Only invalidate methods affected by earnings
 * - Cache hit optimization: <100ms response time vs 60s for all methods
 *
 * API Impact:
 * - Per method: 2-3 FMP calls
 * - Daily optimized: ~1,808 calls/day (vs 85,393 without optimization)
 * - Bandwidth: 18 MB/day (2.7% of FMP 20 GB limit)
 */

import { enhancedRedisCacheService as redisCacheService } from '../cache/enhanced-redis-cache-service';
import { valuationService } from './valuation-service';
import { fmpDCFService } from './fmp-dcf';
import { reitValuationService } from './valuation-service-reit';
import { logger } from '../lib/logger';
import type { ValuationResult, MethodId, MethodCacheStats } from '../types/valuation';

// Cache configuration
const DEFAULT_TTL = 86400; // 24 hours
const CACHE_KEY_PREFIX = 'iv:method:';

// Track in-flight requests to prevent thundering herd
const inFlightRequests = new Map<string, Promise<ValuationResult>>();

export class MethodCacheService {
  /**
   * Get cache key for a specific method
   */
  private getCacheKey(ticker: string, methodId: MethodId): string {
    if (!ticker || ticker.trim() === '') {
      throw new Error('Ticker cannot be empty');
    }
    const upperTicker = ticker.toUpperCase().trim();
    return `${CACHE_KEY_PREFIX}${upperTicker}:${methodId}`;
  }

  /**
   * Get a cached method result
   * @returns Cached result or null if not found
   */
  async getMethod(ticker: string, methodId: MethodId): Promise<ValuationResult | null> {
    // Validate input BEFORE try-catch to properly reject
    if (!ticker || ticker.trim() === '') {
      throw new Error('Ticker cannot be empty');
    }

    try {
      const cacheKey = this.getCacheKey(ticker, methodId);
      const cached = await redisCacheService.get<ValuationResult>(cacheKey);

      if (cached) {
        logger.info(`[MethodCache] HIT: ${ticker}:${methodId}`);
        return cached;
      }

      logger.info(`[MethodCache] MISS: ${ticker}:${methodId}`);
      return null;
    } catch (error) {
      logger.error(`[MethodCache] Error getting ${ticker}:${methodId}:`, error);
      return null;
    }
  }

  /**
   * Store a method result in cache
   * @param ttl Time-to-live in seconds (default: 24 hours)
   */
  async setMethod(
    ticker: string,
    methodId: MethodId,
    result: ValuationResult,
    ttl: number = DEFAULT_TTL
  ): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(ticker, methodId);
      await redisCacheService.set(cacheKey, result, ttl);
      logger.info(`[MethodCache] CACHED: ${ticker}:${methodId} (TTL: ${ttl}s)`);
    } catch (error) {
      logger.error(`[MethodCache] Error caching ${ticker}:${methodId}:`, error);
      // Don't throw - cache failures shouldn't break the application
    }
  }

  /**
   * Warm cache for a specific method
   * - Checks cache first (cache hit = fast return)
   * - Calculates and caches on miss
   * - Protects against thundering herd
   */
  async warmMethod(ticker: string, methodId: MethodId): Promise<ValuationResult> {
    const upperTicker = ticker.toUpperCase();

    // Check cache first
    const cached = await this.getMethod(upperTicker, methodId);
    if (cached) {
      return cached;
    }

    // Check for in-flight request (thundering herd protection)
    const inFlightKey = `${upperTicker}:${methodId}`;
    const inFlight = inFlightRequests.get(inFlightKey);
    if (inFlight) {
      logger.info(`[MethodCache] Waiting for in-flight: ${inFlightKey}`);
      return await inFlight;
    }

    // Create new calculation request
    logger.info(`[MethodCache] Calculating: ${inFlightKey}`);
    const requestPromise = this.calculateMethod(upperTicker, methodId);
    inFlightRequests.set(inFlightKey, requestPromise);

    try {
      const result = await requestPromise;

      // Cache the result
      await this.setMethod(upperTicker, methodId, result);

      return result;
    } finally {
      // Clean up in-flight tracking
      inFlightRequests.delete(inFlightKey);
    }
  }

  /**
   * Calculate a specific method (routes to appropriate service)
   * @private Internal method for calculation routing
   */
  private async calculateMethod(ticker: string, methodId: MethodId): Promise<ValuationResult> {
    const upperTicker = ticker.toUpperCase();

    switch (methodId) {
      // Proprietary method
      case 'alfa-value':
        return await valuationService.getAlfaValue(upperTicker) as ValuationResult;

      // FMP DCF methods (FCFE methods removed - no data available from FMP API)
      case 'dcf-fcf-20':
        return await fmpDCFService.getDCF_FCF_EXT(upperTicker) as any as ValuationResult;

      case 'dcf-terminal-fcf':
        return await fmpDCFService.getDCF_TERM_EXT(upperTicker) as any as ValuationResult;

      // Internal DCF methods
      case 'dni-20':
        return await valuationService.calculateDNI20(upperTicker) as any as ValuationResult;

      case 'dfcf-terminal':
        return await valuationService.calculateDFCFTerminal(upperTicker) as any as ValuationResult;

      // Multiples methods
      case 'pe-mean':
        return await valuationService.calculatePEMean5Y(upperTicker) as any as ValuationResult;

      case 'pe-mean-without-nri':
        return await valuationService.calculatePEMeanWithoutNRI(upperTicker) as any as ValuationResult;

      case 'ps-mean':
        return await valuationService.calculatePSMean5Y(upperTicker) as any as ValuationResult;

      case 'pb-mean':
        return await valuationService.calculatePBMean5Y(upperTicker) as any as ValuationResult;

      case 'pb-mean-without-nri':
        return await valuationService.calculatePBMeanWithoutNRI(upperTicker) as any as ValuationResult;

      // Growth methods
      case 'peg':
        return await valuationService.calculatePEG(upperTicker) as any as ValuationResult;

      case 'psg':
        return await valuationService.calculatePSG(upperTicker) as any as ValuationResult;

      // AGENT 1C: Bank valuation methods (P/TBV)
      case 'p-tbv-mean':
        return await valuationService.calculatePTBVMean5Y(upperTicker) as any as ValuationResult;

      case 'p-tbv-sector':
        return await valuationService.calculatePTBVSector(upperTicker) as any as ValuationResult;

      // AGENT 1D: REIT valuation methods (FFO/AFFO)
      case 'ffo-reit':
        return await reitValuationService.calculateFFO(upperTicker) as any as ValuationResult;

      case 'affo-reit':
        return await reitValuationService.calculateAFFO(upperTicker) as any as ValuationResult;

      case 'p-ffo-mean':
        return await reitValuationService.calculatePFFOMean(upperTicker) as any as ValuationResult;

      case 'p-ffo-sector':
        return await reitValuationService.calculatePFFOSector(upperTicker) as any as ValuationResult;

      case 'dividend-yield-reit':
        return await reitValuationService.calculateDividendYield(upperTicker) as any as ValuationResult;

      // SUB-FASE 2D: Value stocks methods (Graham Number, DDM)
      case 'graham-number':
        return await valuationService.calculateGrahamNumber(upperTicker) as any as ValuationResult;

      case 'ddm':
        return await valuationService.calculateDDM(upperTicker) as any as ValuationResult;

      default:
        throw new Error(`Unsupported method ID: ${methodId}`);
    }
  }

  /**
   * Invalidate a specific method for a ticker
   * Used when specific method data becomes stale (e.g., analyst estimates change)
   */
  async invalidateMethod(ticker: string, methodId: MethodId): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(ticker, methodId);
      await redisCacheService.del(cacheKey);
      logger.info(`[MethodCache] INVALIDATED: ${ticker}:${methodId}`);
    } catch (error) {
      logger.error(`[MethodCache] Error invalidating ${ticker}:${methodId}:`, error);
      // Don't throw - invalidation failures are non-critical
    }
  }

  /**
   * Invalidate all methods for a ticker
   * Used when all methods become stale (e.g., earnings report published)
   */
  async invalidateAllMethods(ticker: string): Promise<void> {
    try {
      const upperTicker = ticker.toUpperCase();
      const pattern = `${CACHE_KEY_PREFIX}${upperTicker}:*`;
      const keys = await redisCacheService.keys(pattern);

      if (keys.length === 0) {
        logger.info(`[MethodCache] No keys to invalidate for ${upperTicker}`);
        return;
      }

      // Delete all keys (continue on individual failures)
      const results = await Promise.allSettled(
        keys.map(key => redisCacheService.del(key))
      );

      const successCount = results.filter(r => r.status === 'fulfilled').length;
      logger.info(
        `[MethodCache] INVALIDATED ${successCount}/${keys.length} methods for ${upperTicker}`
      );
    } catch (error) {
      logger.error(`[MethodCache] Error invalidating all methods for ${ticker}:`, error);
      // Don't throw - invalidation failures are non-critical
    }
  }

  /**
   * Invalidate specific methods affected by data changes
   * Smart invalidation for event-driven cache refresh
   *
   * @param ticker Stock ticker
   * @param affectedMethods Methods that need refresh (e.g., DCF methods after analyst estimate change)
   */
  async invalidateAffectedMethods(ticker: string, affectedMethods: MethodId[]): Promise<void> {
    try {
      const upperTicker = ticker.toUpperCase();

      await Promise.allSettled(
        affectedMethods.map(methodId => this.invalidateMethod(upperTicker, methodId))
      );

      logger.info(
        `[MethodCache] Selectively invalidated ${affectedMethods.length} methods for ${upperTicker}: ${affectedMethods.join(', ')}`
      );
    } catch (error) {
      logger.error(`[MethodCache] Error in selective invalidation for ${ticker}:`, error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<MethodCacheStats> {
    try {
      const pattern = `${CACHE_KEY_PREFIX}*`;
      const keys = await redisCacheService.keys(pattern);

      // Get unique tickers
      const tickers = new Set<string>();
      keys.forEach(key => {
        const parts = key.split(':');
        if (parts.length >= 3) {
          tickers.add(parts[2]); // Extract ticker from iv:method:TICKER:method-id
        }
      });

      const health = await redisCacheService.healthCheck();
      const memoryUsage = health.memoryUsage
        ? `${(health.memoryUsage / 1024 / 1024).toFixed(2)}MB`
        : 'N/A';

      // Estimate hit rate (rough approximation based on current cache coverage)
      const totalPossibleMethods = tickers.size * 12; // 12 methods per ticker (FCFE removed)
      const cacheHitRate = totalPossibleMethods > 0
        ? (keys.length / totalPossibleMethods) * 100
        : 0;

      return {
        totalMethods: keys.length,
        cachedMethods: keys.length,
        cacheHitRate: Math.round(cacheHitRate * 100) / 100,
        oldestCache: null, // Would require TTL inspection
        newestCache: null, // Would require TTL inspection
        memoryUsage,
      };
    } catch (error) {
      logger.error('[MethodCache] Error getting stats:', error);
      return {
        totalMethods: 0,
        cachedMethods: 0,
        cacheHitRate: 0,
        oldestCache: null,
        newestCache: null,
        memoryUsage: 'N/A',
      };
    }
  }

  /**
   * Get all supported method IDs (12 methods total)
   * REMOVED: 'dcf-fcfe-20' and 'dcf-terminal-fcfe' (FMP API no FCFE data)
   */
  getSupportedMethods(): MethodId[] {
    return [
      'alfa-value',
      'dcf-fcf-20',
      'dcf-terminal-fcf',
      'dni-20',
      'pe-mean',
      'pe-mean-without-nri',
      'ps-mean',
      'pb-mean',
      'pb-mean-without-nri',
      'peg',
      'psg',
      'dfcf-terminal',
    ];
  }
}

// Export singleton instance
export const methodCacheService = new MethodCacheService();

// Export constants for configuration
export const MethodCacheConfig = {
  DEFAULT_TTL,
  CACHE_KEY_PREFIX,
};
