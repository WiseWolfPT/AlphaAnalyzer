import { EventEmitter } from 'eventemitter3';

interface APICall {
  id: string;
  endpoint: string;
  symbols: string[];
  priority: 'critical' | 'high' | 'medium' | 'low';
  timestamp: number;
  userId?: string;
  estimatedCost: number;
}

interface BatchRequest {
  id: string;
  calls: APICall[];
  scheduledTime: number;
  provider: string;
  totalCost: number;
}

interface OptimizationStats {
  totalRequests: number;
  batchedRequests: number;
  deduplicatedRequests: number;
  apiCallsSaved: number;
  avgBatchSize: number;
  costSavings: number;
}

interface QuotaTracker {
  used: number;
  limit: number;
  resetTime: number;
  provider: string;
}

export class APIOptimizer extends EventEmitter {
  private requestQueue: APICall[] = [];
  private processedBatches: BatchRequest[] = [];
  private quotaTrackers: Map<string, QuotaTracker> = new Map();
  private stats: OptimizationStats = {
    totalRequests: 0,
    batchedRequests: 0,
    deduplicatedRequests: 0,
    apiCallsSaved: 0,
    avgBatchSize: 0,
    costSavings: 0
  };

  private readonly BATCH_WINDOW = 2000; // 2 seconds
  private readonly MAX_BATCH_SIZE = 50;
  private readonly DAILY_QUOTA_LIMIT = 450; // Out of 500 total

  // Provider configurations
  private readonly providers = {
    twelvedata: { limit: 800, cost: 1, batchSize: 120 },
    fmp: { limit: 250, cost: 1, batchSize: 10 },
    finnhub: { limit: 60, cost: 1, batchSize: 1 },
    alphavantage: { limit: 25, cost: 4, batchSize: 1 } // Higher cost for premium data
  };

  constructor() {
    super();
    this.initializeQuotaTrackers();
    this.startBatchProcessor();
  }

  private initializeQuotaTrackers(): void {
    for (const [provider, config] of Object.entries(this.providers)) {
      this.quotaTrackers.set(provider, {
        used: 0,
        limit: config.limit,
        resetTime: this.getNextMidnight(),
        provider
      });
    }
  }

  private getNextMidnight(): number {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.getTime();
  }

  /**
   * Add API request to optimization queue
   */
  addRequest(
    endpoint: string,
    symbols: string | string[],
    priority: APICall['priority'] = 'medium',
    userId?: string
  ): Promise<any> {
    const symbolArray = Array.isArray(symbols) ? symbols : [symbols];
    const requestId = this.generateRequestId(endpoint, symbolArray);

    // Check for duplicate request
    const existingRequest = this.requestQueue.find(r => r.id === requestId);
    if (existingRequest) {
      this.stats.deduplicatedRequests++;
      console.log(`🔄 Deduplicated request: ${requestId}`);
      return this.waitForBatch(requestId);
    }

    const apiCall: APICall = {
      id: requestId,
      endpoint,
      symbols: symbolArray,
      priority,
      timestamp: Date.now(),
      userId,
      estimatedCost: this.estimateRequestCost(endpoint, symbolArray)
    };

    this.requestQueue.push(apiCall);
    this.stats.totalRequests++;

    console.log(`📥 Queued API request: ${endpoint} for ${symbolArray.join(', ')} (${priority})`);

    return this.waitForBatch(requestId);
  }

  private generateRequestId(endpoint: string, symbols: string[]): string {
    return `${endpoint}:${symbols.sort().join(',')}`;
  }

  private estimateRequestCost(endpoint: string, symbols: string[]): number {
    // Base cost
    let cost = 1;

    // Additional cost for multiple symbols
    if (symbols.length > 1) {
      cost += Math.ceil(symbols.length / 10);
    }

    // Premium endpoints cost more
    if (endpoint.includes('fundamentals') || endpoint.includes('earnings')) {
      cost *= 2;
    }

    return cost;
  }

  private waitForBatch(requestId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Request ${requestId} timed out`));
      }, 30000); // 30 second timeout

      const checkForCompletion = () => {
        const batch = this.processedBatches.find(b => 
          b.calls.some(c => c.id === requestId)
        );

        if (batch) {
          clearTimeout(timeout);
          resolve(batch);
        } else {
          setTimeout(checkForCompletion, 100);
        }
      };

      checkForCompletion();
    });
  }

  private startBatchProcessor(): void {
    setInterval(() => {
      this.processBatches();
    }, this.BATCH_WINDOW);

    // Reset quotas at midnight
    setInterval(() => {
      this.resetDailyQuotas();
    }, 60000); // Check every minute
  }

  private async processBatches(): Promise<void> {
    if (this.requestQueue.length === 0) return;

    // Group requests by endpoint and priority
    const batches = this.createOptimalBatches();

    for (const batch of batches) {
      // Check if we have quota for this batch
      const provider = this.selectOptimalProvider(batch);
      if (!provider) {
        console.warn('⚠️ No available provider for batch, postponing');
        continue;
      }

      batch.provider = provider;
      
      try {
        await this.executeBatch(batch);
        this.updateQuota(provider, batch.totalCost);
        this.stats.batchedRequests += batch.calls.length;
        this.stats.apiCallsSaved += Math.max(0, batch.calls.length - 1);
      } catch (error) {
        console.error(`❌ Batch execution failed:`, error);
        // Add failed requests back to queue with lower priority
        this.requeueFailedCalls(batch.calls);
      }
    }
  }

  private createOptimalBatches(): BatchRequest[] {
    const batches: BatchRequest[] = [];
    const groupedRequests = this.groupRequestsByEndpoint();

    for (const [endpoint, requests] of groupedRequests.entries()) {
      // Sort by priority
      const sorted = requests.sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });

      // Create batches
      while (sorted.length > 0) {
        const batchCalls = sorted.splice(0, this.MAX_BATCH_SIZE);
        const totalCost = batchCalls.reduce((sum, call) => sum + call.estimatedCost, 0);

        const batch: BatchRequest = {
          id: `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          calls: batchCalls,
          scheduledTime: Date.now(),
          provider: '', // Will be set later
          totalCost
        };

        batches.push(batch);
      }
    }

    // Remove processed requests from queue
    this.requestQueue = [];

    return batches;
  }

  private groupRequestsByEndpoint(): Map<string, APICall[]> {
    const groups = new Map<string, APICall[]>();

    for (const request of this.requestQueue) {
      const existing = groups.get(request.endpoint) || [];
      existing.push(request);
      groups.set(request.endpoint, existing);
    }

    return groups;
  }

  private selectOptimalProvider(batch: BatchRequest): string | null {
    const endpoint = batch.calls[0]?.endpoint;
    if (!endpoint) return null;

    // Determine which providers support this endpoint
    const supportedProviders = this.getProvidersForEndpoint(endpoint);

    // Find provider with best quota/cost ratio
    let bestProvider = '';
    let bestScore = 0;

    for (const provider of supportedProviders) {
      const quota = this.quotaTrackers.get(provider);
      const config = this.providers[provider as keyof typeof this.providers];

      if (!quota || quota.used + batch.totalCost > quota.limit) {
        continue; // No quota available
      }

      // Score based on remaining quota and efficiency
      const remainingQuota = quota.limit - quota.used;
      const efficiency = config.batchSize / config.cost;
      const score = remainingQuota * efficiency;

      if (score > bestScore) {
        bestScore = score;
        bestProvider = provider;
      }
    }

    return bestProvider || null;
  }

  private getProvidersForEndpoint(endpoint: string): string[] {
    // Map endpoints to supported providers
    const mapping: Record<string, string[]> = {
      '/quote': ['twelvedata', 'fmp', 'finnhub'],
      '/fundamentals': ['fmp', 'alphavantage'],
      '/historical': ['twelvedata', 'fmp', 'alphavantage'],
      '/earnings': ['fmp', 'alphavantage'],
      '/news': ['fmp', 'finnhub']
    };

    return mapping[endpoint] || ['fmp']; // Default fallback
  }

  private async executeBatch(batch: BatchRequest): Promise<void> {
    console.log(`🚀 Executing batch ${batch.id} with ${batch.calls.length} calls using ${batch.provider}`);

    // Simulate batch execution - in production, integrate with actual API services
    const delay = Math.random() * 1000 + 500; // 500-1500ms
    await new Promise(resolve => setTimeout(resolve, delay));

    // Mark batch as processed
    this.processedBatches.push(batch);

    // Emit event for cache warming
    this.emit('batchExecuted', {
      provider: batch.provider,
      callCount: batch.calls.length,
      symbols: batch.calls.flatMap(c => c.symbols),
      cost: batch.totalCost
    });

    // Clean up old batches
    if (this.processedBatches.length > 100) {
      this.processedBatches = this.processedBatches.slice(-50);
    }
  }

  private updateQuota(provider: string, cost: number): void {
    const quota = this.quotaTrackers.get(provider);
    if (quota) {
      quota.used += cost;
      this.stats.costSavings += cost * 0.8; // Assume 80% savings from batching
    }
  }

  private requeueFailedCalls(calls: APICall[]): void {
    for (const call of calls) {
      // Lower priority and add back to queue
      const lowerPriority = call.priority === 'critical' ? 'high' :
                           call.priority === 'high' ? 'medium' :
                           call.priority === 'medium' ? 'low' : 'low';
      
      this.requestQueue.push({
        ...call,
        priority: lowerPriority,
        timestamp: Date.now() + 60000 // Delay by 1 minute
      });
    }
  }

  private resetDailyQuotas(): void {
    const now = Date.now();
    
    for (const [provider, quota] of this.quotaTrackers.entries()) {
      if (now >= quota.resetTime) {
        quota.used = 0;
        quota.resetTime = this.getNextMidnight();
        console.log(`🔄 Reset quota for ${provider}`);
      }
    }
  }

  /**
   * Smart request scheduling based on market hours and user patterns
   */
  scheduleRequest(
    endpoint: string,
    symbols: string[],
    priority: APICall['priority'],
    delay: number = 0
  ): void {
    setTimeout(() => {
      this.addRequest(endpoint, symbols, priority);
    }, delay);
  }

  /**
   * Bulk schedule requests for popular stocks
   */
  schedulePopularStockUpdates(symbols: string[]): void {
    const isMarketHours = this.isMarketHours();
    const batchSize = isMarketHours ? 10 : 20;
    const delay = isMarketHours ? 60000 : 300000; // 1 min vs 5 min

    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      const scheduleDelay = (i / batchSize) * delay;
      
      this.scheduleRequest('/quote', batch, 'high', scheduleDelay);
    }
  }

  private isMarketHours(): boolean {
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();
    const minute = now.getMinutes();
    
    // Monday-Friday
    if (day === 0 || day === 6) return false;
    
    // 9:30 AM - 4:00 PM EST
    const totalMinutes = hour * 60 + minute;
    const marketOpen = 9 * 60 + 30;
    const marketClose = 16 * 60;
    
    return totalMinutes >= marketOpen && totalMinutes < marketClose;
  }

  /**
   * Get optimization statistics
   */
  getStats(): OptimizationStats & { quotaUsage: Array<{provider: string; usage: number; limit: number}> } {
    const quotaUsage = Array.from(this.quotaTrackers.entries()).map(([provider, quota]) => ({
      provider,
      usage: quota.used,
      limit: quota.limit
    }));

    // Calculate average batch size
    const totalBatches = this.processedBatches.length;
    const totalCalls = this.stats.batchedRequests;
    this.stats.avgBatchSize = totalBatches > 0 ? totalCalls / totalBatches : 0;

    return {
      ...this.stats,
      quotaUsage
    };
  }

  /**
   * Force process queue (for testing)
   */
  async forceProcessQueue(): Promise<void> {
    await this.processBatches();
  }

  /**
   * Get current queue status
   */
  getQueueStatus(): {
    queueLength: number;
    pendingBatches: number;
    nextProcessingTime: number;
  } {
    return {
      queueLength: this.requestQueue.length,
      pendingBatches: this.processedBatches.length,
      nextProcessingTime: Date.now() + this.BATCH_WINDOW
    };
  }

  /**
   * Emergency quota check
   */
  hasQuotaRemaining(): boolean {
    const totalUsed = Array.from(this.quotaTrackers.values())
      .reduce((sum, quota) => sum + quota.used, 0);
    
    return totalUsed < this.DAILY_QUOTA_LIMIT;
  }

  /**
   * Predict quota usage for the day
   */
  predictDailyQuotaUsage(): {
    current: number;
    predicted: number;
    riskLevel: 'low' | 'medium' | 'high';
  } {
    const now = new Date();
    const hoursElapsed = now.getHours() + now.getMinutes() / 60;
    const hoursInDay = 24;
    
    const totalUsed = Array.from(this.quotaTrackers.values())
      .reduce((sum, quota) => sum + quota.used, 0);
    
    const predictedUsage = (totalUsed / hoursElapsed) * hoursInDay;
    
    const riskLevel = predictedUsage > 400 ? 'high' :
                     predictedUsage > 300 ? 'medium' : 'low';

    return {
      current: totalUsed,
      predicted: Math.round(predictedUsage),
      riskLevel
    };
  }
}

// Export singleton instance
export const apiOptimizer = new APIOptimizer();