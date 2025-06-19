// Quota Error Handler - Comprehensive error handling for API quota limits
import { backupAPIManager } from './backup-api-manager';
import { finnhubEnhanced } from './finnhub-enhanced';
import { alphaVantageEnhanced } from './alpha-vantage-enhanced';

export interface QuotaError {
  provider: string;
  errorType: 'rate_limit' | 'daily_limit' | 'monthly_limit' | 'account_suspended';
  message: string;
  retryAfter?: number; // seconds
  resetTime?: number; // timestamp
  remainingQuota?: number;
  totalQuota?: number;
}

export interface ErrorHandlingStrategy {
  immediate: 'retry' | 'fallback' | 'cache' | 'queue';
  fallbackProvider?: string;
  retryConfig?: {
    maxAttempts: number;
    backoffMultiplier: number;
    initialDelay: number;
  };
  userNotification?: {
    show: boolean;
    message: string;
    severity: 'info' | 'warning' | 'error';
  };
}

export interface QueuedRequest {
  id: string;
  symbol: string;
  dataType: string;
  priority: number;
  timestamp: number;
  attempts: number;
  resolve: (value: any) => void;
  reject: (error: Error) => void;
}

class QuotaErrorHandler {
  private requestQueue: QueuedRequest[] = [];
  private queueProcessor: number | null = null;
  private userNotificationHandlers: Array<(notification: any) => void> = [];
  
  // Error strategies for different providers and error types
  private strategies: Map<string, Map<string, ErrorHandlingStrategy>> = new Map();
  
  // Circuit breaker states
  private circuitBreakers: Map<string, {
    state: 'closed' | 'open' | 'half-open';
    failureCount: number;
    lastFailure: number;
    nextAttempt: number;
  }> = new Map();

  constructor() {
    this.initializeStrategies();
    this.startQueueProcessor();
  }

  private initializeStrategies(): void {
    // Finnhub error strategies
    const finnhubStrategies = new Map<string, ErrorHandlingStrategy>();
    
    finnhubStrategies.set('rate_limit', {
      immediate: 'queue',
      retryConfig: {
        maxAttempts: 3,
        backoffMultiplier: 2,
        initialDelay: 1000
      },
      userNotification: {
        show: true,
        message: 'Real-time data temporarily limited. Using cached data.',
        severity: 'warning'
      }
    });
    
    finnhubStrategies.set('daily_limit', {
      immediate: 'fallback',
      fallbackProvider: 'rotation',
      userNotification: {
        show: true,
        message: 'Switched to backup data provider due to quota limits.',
        severity: 'info'
      }
    });

    // Alpha Vantage error strategies  
    const alphaVantageStrategies = new Map<string, ErrorHandlingStrategy>();
    
    alphaVantageStrategies.set('rate_limit', {
      immediate: 'queue',
      retryConfig: {
        maxAttempts: 2,
        backoffMultiplier: 1.5,
        initialDelay: 15000 // 15 seconds
      },
      userNotification: {
        show: false,
        message: '',
        severity: 'info'
      }
    });
    
    alphaVantageStrategies.set('daily_limit', {
      immediate: 'cache',
      userNotification: {
        show: true,
        message: 'Daily fundamentals quota reached. Using cached data until tomorrow.',
        severity: 'warning'
      }
    });

    // API Rotation error strategies
    const rotationStrategies = new Map<string, ErrorHandlingStrategy>();
    
    rotationStrategies.set('rate_limit', {
      immediate: 'fallback',
      fallbackProvider: 'finnhub',
      userNotification: {
        show: false,
        message: '',
        severity: 'info'
      }
    });

    this.strategies.set('finnhub', finnhubStrategies);
    this.strategies.set('alphavantage', alphaVantageStrategies);
    this.strategies.set('rotation', rotationStrategies);
  }

  // Main error handling method
  async handleQuotaError(
    error: Error, 
    provider: string, 
    symbol: string, 
    dataType: string,
    originalRequest?: any
  ): Promise<any> {
    const quotaError = this.parseQuotaError(error, provider);
    console.log(`🚫 Quota error detected:`, quotaError);
    
    // Update circuit breaker
    this.updateCircuitBreaker(provider, true);
    
    // Get error handling strategy
    const strategy = this.getErrorStrategy(provider, quotaError.errorType);
    
    if (!strategy) {
      console.error(`❌ No strategy found for ${provider} ${quotaError.errorType}`);
      throw error;
    }
    
    // Show user notification if configured
    if (strategy.userNotification?.show) {
      this.notifyUser(strategy.userNotification);
    }
    
    // Execute strategy
    switch (strategy.immediate) {
      case 'retry':
        return this.handleRetry(symbol, dataType, provider, strategy, originalRequest);
      
      case 'fallback':
        return this.handleFallback(symbol, dataType, strategy.fallbackProvider, originalRequest);
      
      case 'cache':
        return this.handleCacheOnly(symbol, dataType);
      
      case 'queue':
        return this.handleQueue(symbol, dataType, provider, quotaError.retryAfter);
      
      default:
        throw new Error(`Unknown strategy: ${strategy.immediate}`);
    }
  }

  private parseQuotaError(error: Error, provider: string): QuotaError {
    const message = error.message.toLowerCase();
    
    // Finnhub error patterns
    if (provider === 'finnhub') {
      if (message.includes('rate limit') || message.includes('too many requests')) {
        return {
          provider,
          errorType: 'rate_limit',
          message: error.message,
          retryAfter: this.extractRetryAfter(error.message, 60) // Default 1 minute
        };
      }
    }
    
    // Alpha Vantage error patterns
    if (provider === 'alphavantage') {
      if (message.includes('api calls per minute') || message.includes('minute_limit')) {
        return {
          provider,
          errorType: 'rate_limit',
          message: error.message,
          retryAfter: this.extractRetryAfter(error.message, 60)
        };
      }
      
      if (message.includes('daily_limit') || message.includes('api calls per day')) {
        return {
          provider,
          errorType: 'daily_limit',
          message: error.message,
          retryAfter: this.extractRetryAfter(error.message, 24 * 60 * 60) // 24 hours
        };
      }
    }
    
    // Default quota error
    return {
      provider,
      errorType: 'rate_limit',
      message: error.message,
      retryAfter: 60
    };
  }

  private extractRetryAfter(message: string, defaultSeconds: number): number {
    // Try to extract retry time from error message
    const matches = message.match(/(\d+)\s*(second|minute|hour|day)/i);
    if (matches) {
      const value = parseInt(matches[1]);
      const unit = matches[2].toLowerCase();
      
      switch (unit) {
        case 'second': return value;
        case 'minute': return value * 60;
        case 'hour': return value * 60 * 60;
        case 'day': return value * 24 * 60 * 60;
        default: return defaultSeconds;
      }
    }
    
    return defaultSeconds;
  }

  private getErrorStrategy(provider: string, errorType: string): ErrorHandlingStrategy | null {
    const providerStrategies = this.strategies.get(provider);
    return providerStrategies?.get(errorType) || null;
  }

  private async handleRetry(
    symbol: string, 
    dataType: string, 
    provider: string, 
    strategy: ErrorHandlingStrategy,
    originalRequest?: any
  ): Promise<any> {
    const retryConfig = strategy.retryConfig!;
    let delay = retryConfig.initialDelay;
    
    for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
      console.log(`🔄 Retry attempt ${attempt}/${retryConfig.maxAttempts} for ${symbol} after ${delay}ms`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      
      try {
        // Use backup API manager for the retry
        const result = await backupAPIManager.fetchData({
          symbol,
          dataType,
          priority: 'medium',
          fallbackAcceptable: true
        });
        
        // Update circuit breaker on success
        this.updateCircuitBreaker(provider, false);
        return result;
        
      } catch (retryError) {
        if (attempt === retryConfig.maxAttempts) {
          console.error(`❌ All retry attempts failed for ${symbol}`);
          throw retryError;
        }
        
        delay *= retryConfig.backoffMultiplier;
      }
    }
  }

  private async handleFallback(
    symbol: string, 
    dataType: string, 
    fallbackProvider?: string,
    originalRequest?: any
  ): Promise<any> {
    console.log(`🔄 Falling back to alternative provider for ${symbol}`);
    
    try {
      const result = await backupAPIManager.fetchData({
        symbol,
        dataType,
        priority: 'medium',
        fallbackAcceptable: true
      });
      
      console.log(`✅ Fallback successful for ${symbol}`);
      return result;
      
    } catch (fallbackError) {
      console.error(`❌ Fallback failed for ${symbol}:`, fallbackError);
      
      // Try cache as last resort
      return this.handleCacheOnly(symbol, dataType);
    }
  }

  private async handleCacheOnly(symbol: string, dataType: string): Promise<any> {
    console.log(`📦 Attempting cache-only retrieval for ${symbol}`);
    
    // Try to get any cached data, even if stale
    const cacheKey = `backup-${dataType}-${symbol}`;
    const cached = await this.getStaleCache(cacheKey);
    
    if (cached) {
      console.log(`📦 Using stale cache for ${symbol}`);
      return { ...cached, _isStale: true, _source: 'stale_cache' };
    }
    
    throw new Error(`No cached data available for ${symbol}`);
  }

  private async handleQueue(
    symbol: string, 
    dataType: string, 
    provider: string, 
    retryAfter?: number
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const queuedRequest: QueuedRequest = {
        id: `${provider}-${symbol}-${dataType}-${Date.now()}`,
        symbol,
        dataType,
        priority: 1,
        timestamp: Date.now(),
        attempts: 0,
        resolve,
        reject
      };
      
      // Calculate when to process this request
      const delay = retryAfter ? retryAfter * 1000 : 60000; // Default 1 minute
      queuedRequest.timestamp = Date.now() + delay;
      
      this.requestQueue.push(queuedRequest);
      this.requestQueue.sort((a, b) => a.timestamp - b.timestamp); // Sort by timestamp
      
      console.log(`📋 Queued request for ${symbol} (will retry in ${delay/1000}s)`);
    });
  }

  private startQueueProcessor(): void {
    this.queueProcessor = window.setInterval(() => {
      this.processQueue();
    }, 5000); // Check queue every 5 seconds
  }

  private async processQueue(): Promise<void> {
    if (this.requestQueue.length === 0) return;
    
    const now = Date.now();
    const readyRequests = this.requestQueue.filter(req => req.timestamp <= now);
    
    if (readyRequests.length === 0) return;
    
    console.log(`📋 Processing ${readyRequests.length} queued requests`);
    
    for (const request of readyRequests) {
      // Remove from queue
      this.requestQueue = this.requestQueue.filter(req => req.id !== request.id);
      
      try {
        const result = await backupAPIManager.fetchData({
          symbol: request.symbol,
          dataType: request.dataType,
          priority: 'low',
          fallbackAcceptable: true
        });
        
        request.resolve(result);
        
      } catch (error) {
        request.attempts++;
        
        if (request.attempts < 3) {
          // Requeue with increased delay
          request.timestamp = now + (request.attempts * 30000); // 30s, 60s, 90s
          this.requestQueue.push(request);
          this.requestQueue.sort((a, b) => a.timestamp - b.timestamp);
        } else {
          request.reject(error);
        }
      }
      
      // Small delay between processing requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Circuit breaker implementation
  private updateCircuitBreaker(provider: string, isFailure: boolean): void {
    let breaker = this.circuitBreakers.get(provider);
    
    if (!breaker) {
      breaker = {
        state: 'closed',
        failureCount: 0,
        lastFailure: 0,
        nextAttempt: 0
      };
      this.circuitBreakers.set(provider, breaker);
    }
    
    if (isFailure) {
      breaker.failureCount++;
      breaker.lastFailure = Date.now();
      
      // Open circuit after 5 failures
      if (breaker.failureCount >= 5) {
        breaker.state = 'open';
        breaker.nextAttempt = Date.now() + (5 * 60 * 1000); // 5 minutes
        console.log(`🚫 Circuit breaker OPEN for ${provider}`);
      }
    } else {
      // Success - reset or close circuit
      if (breaker.state === 'half-open') {
        breaker.state = 'closed';
        breaker.failureCount = 0;
        console.log(`✅ Circuit breaker CLOSED for ${provider}`);
      } else if (breaker.state === 'closed') {
        breaker.failureCount = Math.max(0, breaker.failureCount - 1);
      }
    }
  }

  isProviderCircuitOpen(provider: string): boolean {
    const breaker = this.circuitBreakers.get(provider);
    if (!breaker) return false;
    
    if (breaker.state === 'open') {
      // Check if we should try half-open
      if (Date.now() > breaker.nextAttempt) {
        breaker.state = 'half-open';
        console.log(`🔄 Circuit breaker HALF-OPEN for ${provider}`);
        return false;
      }
      return true;
    }
    
    return false;
  }

  // User notification system
  onUserNotification(handler: (notification: any) => void): void {
    this.userNotificationHandlers.push(handler);
  }

  private notifyUser(notification: any): void {
    this.userNotificationHandlers.forEach(handler => {
      try {
        handler(notification);
      } catch (error) {
        console.error('Error in notification handler:', error);
      }
    });
  }

  // Cache utilities
  private async getStaleCache(cacheKey: string): Promise<any> {
    // This would integrate with your cache manager to get even expired data
    // For now, simplified implementation
    try {
      const cached = localStorage.getItem(cacheKey);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  }

  // Monitoring and reporting
  getQuotaStatus(): Record<string, any> {
    return {
      finnhub: finnhubEnhanced.getRateLimitStatus(),
      alphavantage: alphaVantageEnhanced.getRateLimitStatus(),
      queueLength: this.requestQueue.length,
      circuitBreakers: Object.fromEntries(this.circuitBreakers),
      providers: backupAPIManager.getProviderStatus()
    };
  }

  // Emergency methods
  clearQueue(): void {
    this.requestQueue = [];
    console.log('🗑️ Request queue cleared');
  }

  resetCircuitBreakers(): void {
    this.circuitBreakers.clear();
    console.log('🔧 All circuit breakers reset');
  }

  // Cleanup
  destroy(): void {
    if (this.queueProcessor) {
      clearInterval(this.queueProcessor);
      this.queueProcessor = null;
    }
    
    // Reject all pending requests
    this.requestQueue.forEach(request => {
      request.reject(new Error('Service shutting down'));
    });
    
    this.requestQueue = [];
    this.userNotificationHandlers = [];
  }
}

export const quotaErrorHandler = new QuotaErrorHandler();