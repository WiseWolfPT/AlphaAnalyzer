/**
 * Bandwidth Tracker Utility
 *
 * Tracks actual FMP API response sizes for accurate bandwidth accounting.
 * SECURITY FIX P0-5: Replaces hardcoded 60 KB estimate with real measurements.
 */

import { logger } from '../lib/logger';

/**
 * API call metadata
 */
export interface ApiCallMetadata {
  endpoint: string;
  symbol: string;
  responseSize: number;
  timestamp: Date;
  cached: boolean;
}

/**
 * Bandwidth statistics
 */
export interface BandwidthStats {
  totalCalls: number;
  totalBytes: number;
  avgBytesPerCall: number;
  minBytes: number;
  maxBytes: number;
}

/**
 * Bandwidth Tracker Service
 *
 * Tracks actual API response sizes for accurate bandwidth monitoring
 */
class BandwidthTracker {
  private calls: ApiCallMetadata[] = [];
  private readonly MAX_HISTORY = 1000; // Keep last 1000 calls in memory

  /**
   * Track an API call
   *
   * @param endpoint - API endpoint called
   * @param symbol - Stock symbol
   * @param responseSize - Actual response size in bytes
   * @param cached - Whether result was cached
   */
  track(endpoint: string, symbol: string, responseSize: number, cached: boolean = false): void {
    const call: ApiCallMetadata = {
      endpoint,
      symbol,
      responseSize,
      timestamp: new Date(),
      cached
    };

    this.calls.push(call);

    // Keep only recent history
    if (this.calls.length > this.MAX_HISTORY) {
      this.calls.shift();
    }

    logger.debug(`[BandwidthTracker] ${endpoint} ${symbol}: ${responseSize} bytes (cached: ${cached})`);
  }

  /**
   * Get statistics for a specific endpoint
   *
   * @param endpoint - API endpoint (optional, all if not specified)
   * @returns Bandwidth statistics
   */
  getStats(endpoint?: string): BandwidthStats {
    const relevantCalls = endpoint
      ? this.calls.filter(c => c.endpoint === endpoint && !c.cached)
      : this.calls.filter(c => !c.cached);

    if (relevantCalls.length === 0) {
      return {
        totalCalls: 0,
        totalBytes: 0,
        avgBytesPerCall: 0,
        minBytes: 0,
        maxBytes: 0
      };
    }

    const totalBytes = relevantCalls.reduce((sum, call) => sum + call.responseSize, 0);
    const sizes = relevantCalls.map(c => c.responseSize);

    return {
      totalCalls: relevantCalls.length,
      totalBytes,
      avgBytesPerCall: Math.round(totalBytes / relevantCalls.length),
      minBytes: Math.min(...sizes),
      maxBytes: Math.max(...sizes)
    };
  }

  /**
   * Get estimated size for an endpoint based on historical data
   *
   * @param endpoint - API endpoint
   * @returns Estimated size in bytes (or conservative default if no data)
   */
  getEstimatedSize(endpoint: string): number {
    const stats = this.getStats(endpoint);

    // If we have data, use average
    if (stats.totalCalls > 0) {
      return stats.avgBytesPerCall;
    }

    // Conservative estimates by endpoint type (fallback)
    const estimates: Record<string, number> = {
      'income-statement': 50 * 1024,    // 50 KB
      'key-metrics': 30 * 1024,          // 30 KB
      'profile': 10 * 1024,              // 10 KB
      'financial-growth': 20 * 1024,     // 20 KB
      'quote': 5 * 1024,                 // 5 KB
      'historical': 100 * 1024,          // 100 KB
      'dcf': 15 * 1024                   // 15 KB
    };

    for (const [key, estimate] of Object.entries(estimates)) {
      if (endpoint.includes(key)) {
        return estimate;
      }
    }

    // Default conservative estimate
    return 30 * 1024; // 30 KB
  }

  /**
   * Clear all tracked data
   */
  clear(): void {
    this.calls = [];
    logger.info('[BandwidthTracker] History cleared');
  }

  /**
   * Get recent calls (for debugging)
   *
   * @param limit - Number of recent calls to return
   * @returns Recent API calls
   */
  getRecentCalls(limit: number = 10): ApiCallMetadata[] {
    return this.calls.slice(-limit);
  }
}

// Export singleton instance
export const bandwidthTracker = new BandwidthTracker();

/**
 * Measure response size helper
 *
 * Wraps fetch calls to automatically track response size
 *
 * @param url - URL to fetch
 * @param options - Fetch options
 * @returns Fetch response with _responseSize metadata
 */
export async function fetchWithTracking(url: string, options?: RequestInit): Promise<Response & { _responseSize?: number }> {
  const response = await fetch(url, options);

  // Clone response to read body without consuming it
  const clone = response.clone();
  const text = await clone.text();
  const responseSize = Buffer.byteLength(text, 'utf8');

  // Attach metadata to response object
  (response as any)._responseSize = responseSize;

  return response as Response & { _responseSize?: number };
}
