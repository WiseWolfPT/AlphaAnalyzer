/**
 * FMP Bandwidth Protection Middleware
 *
 * Prevents bandwidth spikes by implementing:
 * 1. Request counting per rolling window
 * 2. Auto-throttling when approaching limits
 * 3. Circuit breaker at critical threshold
 *
 * ONDA 6: Bandwidth Safety System
 */

import { Request, Response, NextFunction } from 'express';
import { redisCacheService } from '../cache/redis-cache-service';
import { logger } from '../lib/logger';

// Configuration
const BANDWIDTH_LIMIT_GB = 20;
const DAILY_BUDGET_MB = (BANDWIDTH_LIMIT_GB * 1024) / 30; // ~682 MB/day
const WARNING_THRESHOLD = 0.85; // 85%
const CRITICAL_THRESHOLD = 0.95; // 95%

// Estimate bandwidth per request type (in KB)
const BANDWIDTH_ESTIMATES = {
  'analyst-estimates': 7.5,    // Pre-optimization
  'analyst-estimates-opt': 0.8, // Post-optimization (gzip + selective)
  'cash-flow': 10,
  'company-profile': 5,
  'quote': 2,
  'historical': 15,
  'earnings-calendar': 20,
  'default': 5,
};

interface BandwidthStats {
  dailyUsedMB: number;
  dailyBudgetMB: number;
  percentUsed: number;
  requestsToday: number;
  estimatedMBRemaining: number;
}

/**
 * Get current bandwidth usage from Redis
 */
async function getBandwidthStats(): Promise<BandwidthStats> {
  const today = new Date().toISOString().split('T')[0];
  const key = `bandwidth:daily:${today}`;

  const dailyUsedKB = await redisCacheService.get(key) || 0;
  const dailyUsedMB = Number(dailyUsedKB) / 1024;
  const percentUsed = dailyUsedMB / DAILY_BUDGET_MB;

  const requestsKey = `bandwidth:requests:${today}`;
  const requestsToday = await redisCacheService.get(requestsKey) || 0;

  return {
    dailyUsedMB,
    dailyBudgetMB: DAILY_BUDGET_MB,
    percentUsed,
    requestsToday: Number(requestsToday),
    estimatedMBRemaining: DAILY_BUDGET_MB - dailyUsedMB,
  };
}

/**
 * Track bandwidth usage for a request
 */
async function trackBandwidth(requestType: string, sizeKB: number): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const key = `bandwidth:daily:${today}`;
  const requestsKey = `bandwidth:requests:${today}`;

  // Increment usage
  const currentUsage = await redisCacheService.get(key) || 0;
  await redisCacheService.set(key, Number(currentUsage) + sizeKB, 86400); // 24h TTL

  // Increment request count
  const currentRequests = await redisCacheService.get(requestsKey) || 0;
  await redisCacheService.set(requestsKey, Number(currentRequests) + 1, 86400);

  logger.debug(`[BandwidthProtection] Tracked ${sizeKB} KB for ${requestType}`);
}

/**
 * Estimate bandwidth for request type
 */
function estimateBandwidth(endpoint: string): number {
  if (endpoint.includes('analyst-estimates')) {
    // Check if optimized (gzip + selective fields)
    return BANDWIDTH_ESTIMATES['analyst-estimates-opt'];
  }

  if (endpoint.includes('cash-flow')) return BANDWIDTH_ESTIMATES['cash-flow'];
  if (endpoint.includes('profile')) return BANDWIDTH_ESTIMATES['company-profile'];
  if (endpoint.includes('quote')) return BANDWIDTH_ESTIMATES['quote'];
  if (endpoint.includes('historical')) return BANDWIDTH_ESTIMATES['historical'];
  if (endpoint.includes('earnings')) return BANDWIDTH_ESTIMATES['earnings-calendar'];

  return BANDWIDTH_ESTIMATES['default'];
}

/**
 * Bandwidth Protection Middleware
 *
 * Checks bandwidth budget before allowing FMP API calls
 */
export async function bandwidthProtection(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Only apply to FMP API routes
    if (!req.path.includes('/api/iv') && !req.path.includes('/api/market-data')) {
      return next();
    }

    // Get current stats
    const stats = await getBandwidthStats();

    // Estimate bandwidth for this request
    const estimatedKB = estimateBandwidth(req.path);
    const estimatedMB = estimatedKB / 1024;

    // Check if this request would exceed budget
    const projectedUsage = stats.dailyUsedMB + estimatedMB;
    const projectedPercent = projectedUsage / stats.dailyBudgetMB;

    // Log status
    logger.info(`[BandwidthProtection] ${req.path}`, {
      dailyUsed: `${stats.dailyUsedMB.toFixed(2)} MB`,
      dailyBudget: `${stats.dailyBudgetMB.toFixed(2)} MB`,
      percentUsed: `${(stats.percentUsed * 100).toFixed(2)}%`,
      estimatedRequest: `${estimatedKB} KB`,
      projectedPercent: `${(projectedPercent * 100).toFixed(2)}%`,
    });

    // CRITICAL: Circuit breaker at 95%
    if (projectedPercent >= CRITICAL_THRESHOLD) {
      logger.error(`[BandwidthProtection] CRITICAL: Bandwidth limit reached (${(projectedPercent * 100).toFixed(2)}%)`);

      res.status(503).json({
        error: 'Service temporarily unavailable',
        code: 'BANDWIDTH_LIMIT_EXCEEDED',
        message: 'Daily bandwidth budget exceeded. Service will resume tomorrow.',
        retryAfter: getSecondsUntilMidnight(),
      });
      return;
    }

    // WARNING: Throttle at 85%
    if (stats.percentUsed >= WARNING_THRESHOLD) {
      logger.warn(`[BandwidthProtection] WARNING: Approaching bandwidth limit (${(stats.percentUsed * 100).toFixed(2)}%)`);

      // Add throttling header
      res.setHeader('X-Bandwidth-Warning', 'Approaching daily limit');
      res.setHeader('X-Bandwidth-Used', `${(stats.percentUsed * 100).toFixed(2)}%`);
    }

    // Track bandwidth usage after response
    res.on('finish', async () => {
      await trackBandwidth(req.path, estimatedKB);
    });

    next();
  } catch (error) {
    logger.error('[BandwidthProtection] Error in middleware:', error);
    // On error, allow request (fail-open for availability)
    next();
  }
}

/**
 * Get seconds until midnight UTC
 */
function getSecondsUntilMidnight(): number {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCHours(24, 0, 0, 0);
  return Math.floor((tomorrow.getTime() - now.getTime()) / 1000);
}

/**
 * Get bandwidth stats (for monitoring endpoint)
 */
export async function getBandwidthStatsForMonitoring(): Promise<BandwidthStats> {
  return getBandwidthStats();
}
