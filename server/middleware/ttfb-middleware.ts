/**
 * TTFB (Time To First Byte) Middleware - Roadmap V4
 * 
 * Implements X-Edge-TTFB header to monitor and maintain < 300ms on cache hits.
 * Tracks response times and provides insights for performance optimization.
 */

import { Request, Response, NextFunction } from 'express';

// TTFB tracking statistics
interface TTFBStats {
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  averageTTFB: number;
  cacheHitTTFB: number;
  cacheMissTTFB: number;
  lastReset: number;
}

let ttfbStats: TTFBStats = {
  totalRequests: 0,
  cacheHits: 0,
  cacheMisses: 0,
  averageTTFB: 0,
  cacheHitTTFB: 0,
  cacheMissTTFB: 0,
  lastReset: Date.now()
};

// Reset stats every hour
const STATS_RESET_INTERVAL = 60 * 60 * 1000; // 1 hour

/**
 * TTFB Middleware
 * Measures and reports Time To First Byte performance
 */
export const ttfbMiddleware = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    
    // Capture the original methods
    const originalSend = res.send;
    const originalJson = res.json;
    const originalEnd = res.end;
    
    let responseStarted = false;
    
    // Function to calculate and set TTFB
    const calculateTTFB = () => {
      if (responseStarted) return;
      responseStarted = true;
      
      const ttfb = Date.now() - startTime;
      
      // Set X-Edge-TTFB header as specified in roadmap
      res.setHeader('X-Edge-TTFB', ttfb.toString());
      
      // Determine if this was a cache hit
      const isCacheHit = res.getHeader('X-Cache-Status') === 'HIT' || 
                        res.getHeader('X-Cache') === 'HIT' ||
                        req.path.includes('/api/market-data/') && ttfb < 100; // Heuristic for cache hits
      
      // Update statistics
      updateTTFBStats(ttfb, isCacheHit);
      
      // Set additional performance headers
      res.setHeader('X-Response-Time', ttfb.toString());
      res.setHeader('X-Cache-Type', isCacheHit ? 'HIT' : 'MISS');
      
      // Log performance warnings
      if (isCacheHit && ttfb > 300) {
        console.warn(`⚠️ Cache hit TTFB exceeded 300ms: ${ttfb}ms for ${req.method} ${req.path}`);
      }
      
      if (ttfb > 1000) {
        console.warn(`🐌 Slow response detected: ${ttfb}ms for ${req.method} ${req.path}`);
      }
    };
    
    // Override response methods to capture TTFB at first byte
    res.send = function(data: any) {
      calculateTTFB();
      return originalSend.call(this, data);
    };
    
    res.json = function(data: any) {
      calculateTTFB();
      return originalJson.call(this, data);
    };
    
    res.end = function(chunk?: any, encoding?: any) {
      calculateTTFB();
      return originalEnd.call(this, chunk, encoding);
    };
    
    next();
  };
};

/**
 * Update TTFB statistics
 */
function updateTTFBStats(ttfb: number, isCacheHit: boolean): void {
  const now = Date.now();
  
  // Reset stats if interval has passed
  if (now - ttfbStats.lastReset > STATS_RESET_INTERVAL) {
    resetTTFBStats();
  }
  
  // Update counters
  ttfbStats.totalRequests++;
  
  if (isCacheHit) {
    ttfbStats.cacheHits++;
    ttfbStats.cacheHitTTFB = ((ttfbStats.cacheHitTTFB * (ttfbStats.cacheHits - 1)) + ttfb) / ttfbStats.cacheHits;
  } else {
    ttfbStats.cacheMisses++;
    ttfbStats.cacheMissTTFB = ((ttfbStats.cacheMissTTFB * (ttfbStats.cacheMisses - 1)) + ttfb) / ttfbStats.cacheMisses;
  }
  
  // Update overall average
  ttfbStats.averageTTFB = ((ttfbStats.averageTTFB * (ttfbStats.totalRequests - 1)) + ttfb) / ttfbStats.totalRequests;
}

/**
 * Reset TTFB statistics
 */
function resetTTFBStats(): void {
  ttfbStats = {
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    averageTTFB: 0,
    cacheHitTTFB: 0,
    cacheMissTTFB: 0,
    lastReset: Date.now()
  };
  
  console.log('🔄 TTFB Statistics reset');
}

/**
 * Get current TTFB statistics
 */
export function getTTFBStats(): TTFBStats & { 
  cacheHitRate: number;
  performanceStatus: 'good' | 'warning' | 'critical';
} {
  const cacheHitRate = ttfbStats.totalRequests > 0 ? 
    (ttfbStats.cacheHits / ttfbStats.totalRequests) * 100 : 0;
  
  // Determine performance status based on cache hit TTFB
  let performanceStatus: 'good' | 'warning' | 'critical' = 'good';
  if (ttfbStats.cacheHitTTFB > 300) {
    performanceStatus = 'critical';
  } else if (ttfbStats.cacheHitTTFB > 200) {
    performanceStatus = 'warning';
  }
  
  return {
    ...ttfbStats,
    cacheHitRate: Math.round(cacheHitRate * 100) / 100,
    performanceStatus
  };
}

/**
 * Check if TTFB performance is within acceptable limits
 */
export function isTTFBPerformanceGood(): boolean {
  return ttfbStats.cacheHitTTFB <= 300 && ttfbStats.averageTTFB <= 1000;
}

/**
 * Get TTFB performance recommendations
 */
export function getTTFBRecommendations(): string[] {
  const recommendations: string[] = [];
  
  if (ttfbStats.cacheHitTTFB > 300) {
    recommendations.push('Cache hit TTFB exceeds 300ms - optimize cache layer');
  }
  
  if (ttfbStats.cacheHitRate < 80) {
    recommendations.push('Low cache hit rate - review caching strategy');
  }
  
  if (ttfbStats.averageTTFB > 1000) {
    recommendations.push('High average response time - optimize backend processing');
  }
  
  if (ttfbStats.cacheMissTTFB > 2000) {
    recommendations.push('Cache miss responses are very slow - optimize data fetching');
  }
  
  return recommendations;
}