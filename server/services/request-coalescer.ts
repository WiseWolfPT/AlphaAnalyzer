import { logger } from '../lib/logger';

interface CoalescedRequest<T> {
  key: string;
  promise: Promise<T>;
  timestamp: number;
  count: number;
}

export class RequestCoalescer {
  private static instance: RequestCoalescer;
  private pendingRequests = new Map<string, CoalescedRequest<any>>();
  private readonly TTL = 5000; // 5 seconds TTL for coalesced requests
  
  private constructor() {
    logger.info('🔄 Request Coalescer initialized');
  }

  static getInstance(): RequestCoalescer {
    if (!RequestCoalescer.instance) {
      RequestCoalescer.instance = new RequestCoalescer();
    }
    return RequestCoalescer.instance;
  }

  /**
   * Coalesce identical requests into a single promise
   */
  async coalesce<T>(
    key: string,
    fetchFn: () => Promise<T>
  ): Promise<T> {
    // Check if we have a pending request for this key
    const existing = this.pendingRequests.get(key);
    
    if (existing && Date.now() - existing.timestamp < this.TTL) {
      // Return existing promise
      existing.count++;
      logger.info(`♻️  Coalescing request for ${key} (${existing.count} requests)`);
      return existing.promise;
    }
    
    // Create new request
    const promise = fetchFn()
      .finally(() => {
        // Clean up after request completes
        setTimeout(() => {
          this.pendingRequests.delete(key);
        }, 100); // Small delay to catch any immediate duplicates
      });
    
    const request: CoalescedRequest<T> = {
      key,
      promise,
      timestamp: Date.now(),
      count: 1
    };
    
    this.pendingRequests.set(key, request);
    
    return promise;
  }

  /**
   * Get current coalescing statistics
   */
  getStats(): any {
    const stats = {
      pendingRequests: this.pendingRequests.size,
      requests: Array.from(this.pendingRequests.entries()).map(([key, req]) => ({
        key,
        count: req.count,
        age: Date.now() - req.timestamp
      }))
    };
    
    return stats;
  }

  /**
   * Clean up stale entries
   */
  async cleanup(): Promise<number> {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, request] of this.pendingRequests.entries()) {
      if (now - request.timestamp > this.TTL * 2) {
        this.pendingRequests.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      logger.info(`🧹 Cleaned ${cleaned} stale coalescing entries`);
    }
    
    return cleaned;
  }

  /**
   * Clear all pending requests (for testing)
   */
  clear(): void {
    this.pendingRequests.clear();
    logger.info('Request coalescer cleared');
  }
}

// Export singleton instance
export const requestCoalescer = RequestCoalescer.getInstance();