/**
 * Request Queue with Rate Limiting
 * 
 * Manages API requests with provider-specific rate limits
 * to prevent hitting API quotas too quickly
 */

import { ProviderName } from '../quota/quota-limits';
import { logger } from '../../config/logger-config';

interface QueuedRequest<T> {
  id: string;
  provider: ProviderName;
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
  timestamp: number;
}

interface RateLimitConfig {
  maxPerMinute: number;
  delayMs: number; // Minimum delay between requests
}

const RATE_LIMITS: Record<ProviderName, RateLimitConfig> = {
  finnhub: { maxPerMinute: 60, delayMs: 1000 }, // 1 req/sec
  twelveData: { maxPerMinute: 8, delayMs: 7500 }, // ~8 req/min
  fmp: { maxPerMinute: 5, delayMs: 12000 }, // 5 req/min
  alphaVantage: { maxPerMinute: 5, delayMs: 12000 }, // 5 req/min
  polygon: { maxPerMinute: 5, delayMs: 12000 }, // 5 req/min
};

export class RequestQueue {
  private queues: Map<ProviderName, QueuedRequest<any>[]> = new Map();
  private processing: Map<ProviderName, boolean> = new Map();
  private lastRequestTime: Map<ProviderName, number> = new Map();
  private requestCounts: Map<ProviderName, { count: number; resetTime: number }> = new Map();

  constructor() {
    // Initialize queues for each provider
    Object.keys(RATE_LIMITS).forEach(provider => {
      this.queues.set(provider as ProviderName, []);
      this.processing.set(provider as ProviderName, false);
      this.lastRequestTime.set(provider as ProviderName, 0);
      this.requestCounts.set(provider as ProviderName, { count: 0, resetTime: Date.now() + 60000 });
    });
  }

  /**
   * Add a request to the queue
   */
  async enqueue<T>(provider: ProviderName, execute: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const request: QueuedRequest<T> = {
        id: `${provider}-${Date.now()}-${Math.random()}`,
        provider,
        execute,
        resolve,
        reject,
        timestamp: Date.now()
      };

      const queue = this.queues.get(provider) || [];
      queue.push(request);
      this.queues.set(provider, queue);

      logger.debug(`[RequestQueue] Enqueued request for ${provider}. Queue size: ${queue.length}`);

      // Start processing if not already running
      this.processQueue(provider);
    });
  }

  /**
   * Process requests for a specific provider
   */
  private async processQueue(provider: ProviderName): Promise<void> {
    // Check if already processing
    if (this.processing.get(provider)) {
      return;
    }

    this.processing.set(provider, true);

    try {
      while (true) {
        const queue = this.queues.get(provider) || [];
        if (queue.length === 0) {
          break;
        }

        // Check rate limits
        if (!this.canMakeRequest(provider)) {
          // Wait before checking again
          await this.delay(1000);
          continue;
        }

        // Get next request
        const request = queue.shift();
        if (!request) continue;

        // Calculate required delay
        const lastTime = this.lastRequestTime.get(provider) || 0;
        const rateLimit = RATE_LIMITS[provider];
        const timeSinceLastRequest = Date.now() - lastTime;
        const requiredDelay = Math.max(0, rateLimit.delayMs - timeSinceLastRequest);

        // Apply delay if needed
        if (requiredDelay > 0) {
          logger.debug(`[RequestQueue] Delaying ${provider} request by ${requiredDelay}ms`);
          await this.delay(requiredDelay);
        }

        // Execute request
        try {
          logger.debug(`[RequestQueue] Executing ${provider} request. Remaining in queue: ${queue.length}`);
          const result = await request.execute();
          request.resolve(result);
          
          // Update tracking
          this.lastRequestTime.set(provider, Date.now());
          this.incrementRequestCount(provider);
          
        } catch (error) {
          logger.error(`[RequestQueue] Request failed for ${provider}:`, error);
          request.reject(error);
        }
      }
    } finally {
      this.processing.set(provider, false);
    }
  }

  /**
   * Check if we can make a request based on rate limits
   */
  private canMakeRequest(provider: ProviderName): boolean {
    const counts = this.requestCounts.get(provider);
    if (!counts) return true;

    const now = Date.now();
    
    // Reset counter if minute has passed
    if (now > counts.resetTime) {
      counts.count = 0;
      counts.resetTime = now + 60000;
    }

    const rateLimit = RATE_LIMITS[provider];
    return counts.count < rateLimit.maxPerMinute;
  }

  /**
   * Increment request count for a provider
   */
  private incrementRequestCount(provider: ProviderName): void {
    const counts = this.requestCounts.get(provider);
    if (counts) {
      counts.count++;
    }
  }

  /**
   * Helper to delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get queue statistics
   */
  getStats(): Record<ProviderName, { queueSize: number; requestsLastMinute: number }> {
    const stats: Record<string, any> = {};
    
    for (const [provider, queue] of this.queues.entries()) {
      const counts = this.requestCounts.get(provider);
      stats[provider] = {
        queueSize: queue.length,
        requestsLastMinute: counts?.count || 0
      };
    }
    
    return stats;
  }
}

// Export singleton instance
export const requestQueue = new RequestQueue();