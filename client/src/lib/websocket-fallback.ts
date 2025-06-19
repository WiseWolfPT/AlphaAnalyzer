// WebSocket Fallback Strategies and Resilience Manager
import { EventEmitter } from 'events';
import { websocketManager, FinancialDataPoint } from './websocket-manager';
import { finnhubService } from '@/services/finnhub';
import { alphaVantageService } from '@/services/alpha-vantage';

export interface FallbackConfig {
  enablePollingFallback: boolean;
  pollingInterval: number;
  maxPollingRetries: number;
  enableRESTFallback: boolean;
  restFallbackDelay: number;
  enableOfflineMode: boolean;
  offlineDataRetention: number;
  prioritizedAPIs: string[];
  circuitBreakerEnabled: boolean;
  circuitBreakerThreshold: number;
  circuitBreakerResetTime: number;
}

export interface FallbackState {
  isActive: boolean;
  currentStrategy: FallbackStrategy;
  lastWebSocketData: number;
  restAPICallCount: number;
  pollingActive: boolean;
  offlineMode: boolean;
  dataAge: number;
}

export enum FallbackStrategy {
  WEBSOCKET = 'websocket',
  POLLING = 'polling',
  REST_API = 'rest-api',
  CACHED_DATA = 'cached-data',
  OFFLINE = 'offline'
}

export interface CachedDataPoint extends FinancialDataPoint {
  expiresAt: number;
  fallbackSource: string;
}

class WebSocketFallbackManager extends EventEmitter {
  private fallbackState: FallbackState;
  private cachedData = new Map<string, CachedDataPoint[]>();
  private pollingTimers = new Map<string, NodeJS.Timeout>();
  private restFallbackTimers = new Map<string, NodeJS.Timeout>();
  private subscribedSymbols = new Set<string>();
  private circuitBreakers = new Map<string, { isOpen: boolean; failures: number; lastFailure: number }>();
  private lastSuccessfulConnection = Date.now();

  constructor(private config: FallbackConfig) {
    super();
    
    this.fallbackState = {
      isActive: false,
      currentStrategy: FallbackStrategy.WEBSOCKET,
      lastWebSocketData: Date.now(),
      restAPICallCount: 0,
      pollingActive: false,
      offlineMode: false,
      dataAge: 0
    };

    this.initializeEventListeners();
    this.startHealthMonitoring();
  }

  private initializeEventListeners(): void {
    // Monitor WebSocket connection status
    websocketManager.on('connected', (sourceId: string) => {
      this.handleWebSocketConnected(sourceId);
    });

    websocketManager.on('disconnected', (sourceId: string) => {
      this.handleWebSocketDisconnected(sourceId);
    });

    websocketManager.on('connectionError', (sourceId: string, error: Error) => {
      this.handleWebSocketError(sourceId, error);
    });

    websocketManager.on('dataReceived', (data: FinancialDataPoint) => {
      this.handleWebSocketData(data);
    });

    // Monitor for extended periods without data
    setInterval(() => {
      this.checkDataFreshness();
    }, 10000); // Check every 10 seconds
  }

  // Subscribe to symbols with fallback support
  subscribeWithFallback(symbols: string[]): void {
    symbols.forEach(symbol => this.subscribedSymbols.add(symbol));
    
    // Try WebSocket first
    websocketManager.subscribeToSymbols(symbols);
    
    // If WebSocket is not available, start fallback immediately
    if (!this.isWebSocketHealthy()) {
      this.activateFallback(symbols);
    }
  }

  unsubscribeFromFallback(symbols: string[]): void {
    symbols.forEach(symbol => {
      this.subscribedSymbols.delete(symbol);
      this.stopPolling(symbol);
      this.clearRestFallback(symbol);
    });
    
    websocketManager.unsubscribeFromSymbols(symbols);
  }

  // Get data with automatic fallback
  async getDataWithFallback(symbol: string): Promise<FinancialDataPoint | null> {
    // Try fresh WebSocket data first
    if (this.fallbackState.currentStrategy === FallbackStrategy.WEBSOCKET) {
      const wsData = websocketManager.getAggregatedData(symbol);
      if (wsData.length > 0) {
        const latest = wsData[0];
        if (Date.now() - latest.timestamp < 30000) { // Data is less than 30 seconds old
          return latest;
        }
      }
    }

    // Try cached data
    const cachedData = this.getCachedData(symbol);
    if (cachedData) {
      return cachedData;
    }

    // Try REST API fallback
    if (this.config.enableRESTFallback) {
      try {
        const restData = await this.fetchRestData(symbol);
        if (restData) {
          this.cacheData(symbol, restData, 'rest-api');
          return restData;
        }
      } catch (error) {
        console.warn(`REST API fallback failed for ${symbol}:`, error);
      }
    }

    // Return offline/cached data if available
    if (this.config.enableOfflineMode) {
      return this.getOfflineData(symbol);
    }

    return null;
  }

  // Activate appropriate fallback strategy
  private activateFallback(symbols: string[]): void {
    if (this.fallbackState.isActive) return;

    this.fallbackState.isActive = true;
    
    let strategy = FallbackStrategy.CACHED_DATA;

    // Determine best fallback strategy
    if (this.config.enablePollingFallback && this.hasValidRestAPI()) {
      strategy = FallbackStrategy.POLLING;
      this.startPolling(symbols);
    } else if (this.config.enableRESTFallback && this.hasValidRestAPI()) {
      strategy = FallbackStrategy.REST_API;
      this.scheduleRestFallback(symbols);
    } else if (this.config.enableOfflineMode) {
      strategy = FallbackStrategy.OFFLINE;
      this.enterOfflineMode();
    }

    this.fallbackState.currentStrategy = strategy;
    this.emit('fallbackActivated', strategy, symbols);
  }

  // Deactivate fallback when WebSocket recovers
  private deactivateFallback(): void {
    if (!this.fallbackState.isActive) return;

    this.fallbackState.isActive = false;
    this.fallbackState.currentStrategy = FallbackStrategy.WEBSOCKET;
    
    // Stop all fallback mechanisms
    this.stopAllPolling();
    this.clearAllRestFallbacks();
    this.exitOfflineMode();
    
    this.emit('fallbackDeactivated');
  }

  // Polling fallback implementation
  private startPolling(symbols: string[]): void {
    if (!this.config.enablePollingFallback) return;

    this.fallbackState.pollingActive = true;

    symbols.forEach(symbol => {
      const timer = setInterval(async () => {
        try {
          const data = await this.fetchRestData(symbol);
          if (data) {
            this.cacheData(symbol, data, 'polling');
            this.emit('dataReceived', data);
          }
        } catch (error) {
          console.warn(`Polling failed for ${symbol}:`, error);
          this.handlePollingError(symbol, error as Error);
        }
      }, this.config.pollingInterval);

      this.pollingTimers.set(symbol, timer);
    });

    this.emit('pollingStarted', symbols);
  }

  private stopPolling(symbol: string): void {
    const timer = this.pollingTimers.get(symbol);
    if (timer) {
      clearInterval(timer);
      this.pollingTimers.delete(symbol);
    }
  }

  private stopAllPolling(): void {
    this.pollingTimers.forEach(timer => clearInterval(timer));
    this.pollingTimers.clear();
    this.fallbackState.pollingActive = false;
  }

  // REST API fallback with delay
  private scheduleRestFallback(symbols: string[]): void {
    symbols.forEach(symbol => {
      const timer = setTimeout(async () => {
        try {
          const data = await this.fetchRestData(symbol);
          if (data) {
            this.cacheData(symbol, data, 'rest-fallback');
            this.emit('dataReceived', data);
          }
        } catch (error) {
          console.warn(`REST fallback failed for ${symbol}:`, error);
        }
      }, this.config.restFallbackDelay);

      this.restFallbackTimers.set(symbol, timer);
    });
  }

  private clearRestFallback(symbol: string): void {
    const timer = this.restFallbackTimers.get(symbol);
    if (timer) {
      clearTimeout(timer);
      this.restFallbackTimers.delete(symbol);
    }
  }

  private clearAllRestFallbacks(): void {
    this.restFallbackTimers.forEach(timer => clearTimeout(timer));
    this.restFallbackTimers.clear();
  }

  // Fetch data from REST APIs with prioritization
  private async fetchRestData(symbol: string): Promise<FinancialDataPoint | null> {
    this.fallbackState.restAPICallCount++;

    for (const apiName of this.config.prioritizedAPIs) {
      if (this.isCircuitBreakerOpen(apiName)) {
        continue; // Skip this API due to circuit breaker
      }

      try {
        let data: FinancialDataPoint | null = null;

        switch (apiName) {
          case 'finnhub':
            const finnhubData = await finnhubService.getStockPrice(symbol);
            if (finnhubData) {
              data = {
                symbol: symbol.toUpperCase(),
                price: finnhubData.c,
                change: finnhubData.d,
                changePercent: finnhubData.dp,
                volume: 0, // Not available in this endpoint
                timestamp: Date.now(),
                source: 'finnhub-rest',
                high: finnhubData.h,
                low: finnhubData.l,
                open: finnhubData.o
              };
            }
            break;

          case 'alphaVantage':
            // Note: Alpha Vantage doesn't have a real-time quote endpoint in the current implementation
            // This would need to be implemented based on their actual API
            console.warn('Alpha Vantage real-time fallback not implemented');
            break;

          default:
            console.warn(`Unknown API: ${apiName}`);
            continue;
        }

        if (data) {
          this.resetCircuitBreaker(apiName);
          return data;
        }

      } catch (error) {
        console.warn(`${apiName} REST API error for ${symbol}:`, error);
        this.handleCircuitBreaker(apiName, error as Error);
      }
    }

    return null;
  }

  // Offline mode management
  private enterOfflineMode(): void {
    this.fallbackState.offlineMode = true;
    this.emit('offlineModeActivated');
  }

  private exitOfflineMode(): void {
    this.fallbackState.offlineMode = false;
    this.emit('offlineModeDeactivated');
  }

  // Data caching
  private cacheData(symbol: string, data: FinancialDataPoint, source: string): void {
    const expiresAt = Date.now() + (this.config.offlineDataRetention * 1000);
    
    const cachedPoint: CachedDataPoint = {
      ...data,
      expiresAt,
      fallbackSource: source
    };

    const symbolCache = this.cachedData.get(symbol) || [];
    symbolCache.unshift(cachedPoint);
    
    // Keep only the last 100 data points
    if (symbolCache.length > 100) {
      symbolCache.splice(100);
    }

    this.cachedData.set(symbol, symbolCache);
  }

  private getCachedData(symbol: string): FinancialDataPoint | null {
    const symbolCache = this.cachedData.get(symbol) || [];
    const now = Date.now();
    
    // Find the most recent non-expired data
    for (const cachedPoint of symbolCache) {
      if (cachedPoint.expiresAt > now) {
        return {
          symbol: cachedPoint.symbol,
          price: cachedPoint.price,
          change: cachedPoint.change,
          changePercent: cachedPoint.changePercent,
          volume: cachedPoint.volume,
          timestamp: cachedPoint.timestamp,
          source: `cached-${cachedPoint.fallbackSource}`,
          high: cachedPoint.high,
          low: cachedPoint.low,
          open: cachedPoint.open
        };
      }
    }

    return null;
  }

  private getOfflineData(symbol: string): FinancialDataPoint | null {
    const symbolCache = this.cachedData.get(symbol) || [];
    return symbolCache.length > 0 ? symbolCache[0] : null;
  }

  // Circuit breaker pattern
  private handleCircuitBreaker(apiName: string, error: Error): void {
    if (!this.config.circuitBreakerEnabled) return;

    const breaker = this.circuitBreakers.get(apiName) || { isOpen: false, failures: 0, lastFailure: 0 };
    breaker.failures++;
    breaker.lastFailure = Date.now();

    if (breaker.failures >= this.config.circuitBreakerThreshold) {
      breaker.isOpen = true;
      this.emit('circuitBreakerOpened', apiName);

      // Schedule reset
      setTimeout(() => {
        this.resetCircuitBreaker(apiName);
      }, this.config.circuitBreakerResetTime);
    }

    this.circuitBreakers.set(apiName, breaker);
  }

  private resetCircuitBreaker(apiName: string): void {
    const breaker = this.circuitBreakers.get(apiName);
    if (breaker) {
      breaker.isOpen = false;
      breaker.failures = 0;
      this.emit('circuitBreakerReset', apiName);
    }
  }

  private isCircuitBreakerOpen(apiName: string): boolean {
    const breaker = this.circuitBreakers.get(apiName);
    return breaker?.isOpen || false;
  }

  // Health monitoring
  private startHealthMonitoring(): void {
    setInterval(() => {
      this.checkSystemHealth();
    }, 5000); // Check every 5 seconds
  }

  private checkSystemHealth(): void {
    const isHealthy = this.isWebSocketHealthy();
    
    if (!isHealthy && !this.fallbackState.isActive) {
      this.activateFallback(Array.from(this.subscribedSymbols));
    } else if (isHealthy && this.fallbackState.isActive) {
      this.deactivateFallback();
    }
  }

  private isWebSocketHealthy(): boolean {
    const connectionStates = websocketManager.getConnectionStates();
    const hasActiveConnection = Array.from(connectionStates.values())
      .some(state => state === 'connected');
    
    const dataRecent = Date.now() - this.fallbackState.lastWebSocketData < 60000; // Within last minute
    
    return hasActiveConnection && dataRecent;
  }

  private checkDataFreshness(): void {
    const now = Date.now();
    this.fallbackState.dataAge = now - this.fallbackState.lastWebSocketData;
    
    // If data is stale, consider activating fallback
    if (this.fallbackState.dataAge > 120000 && !this.fallbackState.isActive) { // 2 minutes
      this.activateFallback(Array.from(this.subscribedSymbols));
    }
  }

  private hasValidRestAPI(): boolean {
    return this.config.prioritizedAPIs.some(apiName => !this.isCircuitBreakerOpen(apiName));
  }

  // Event handlers
  private handleWebSocketConnected(sourceId: string): void {
    this.lastSuccessfulConnection = Date.now();
    
    if (this.fallbackState.isActive) {
      // Give WebSocket a moment to start receiving data before deactivating fallback
      setTimeout(() => {
        if (this.isWebSocketHealthy()) {
          this.deactivateFallback();
        }
      }, 5000);
    }
  }

  private handleWebSocketDisconnected(sourceId: string): void {
    // Don't immediately activate fallback - wait to see if other sources are available
    setTimeout(() => {
      if (!this.isWebSocketHealthy()) {
        this.activateFallback(Array.from(this.subscribedSymbols));
      }
    }, 2000);
  }

  private handleWebSocketError(sourceId: string, error: Error): void {
    console.warn(`WebSocket error from ${sourceId}:`, error);
    
    // Consider this in health checks
    setTimeout(() => {
      this.checkSystemHealth();
    }, 1000);
  }

  private handleWebSocketData(data: FinancialDataPoint): void {
    this.fallbackState.lastWebSocketData = Date.now();
    
    // Cache the data for potential offline use
    this.cacheData(data.symbol, data, 'websocket');
  }

  private handlePollingError(symbol: string, error: Error): void {
    console.warn(`Polling error for ${symbol}:`, error);
    // Could implement additional error handling here
  }

  // Public API
  getFallbackState(): FallbackState {
    return { ...this.fallbackState };
  }

  getCacheStats(): { totalCachedSymbols: number; totalDataPoints: number; oldestData: number } {
    let totalDataPoints = 0;
    let oldestData = Date.now();

    this.cachedData.forEach(symbolCache => {
      totalDataPoints += symbolCache.length;
      if (symbolCache.length > 0) {
        const oldest = Math.min(...symbolCache.map(point => point.timestamp));
        oldestData = Math.min(oldestData, oldest);
      }
    });

    return {
      totalCachedSymbols: this.cachedData.size,
      totalDataPoints,
      oldestData
    };
  }

  clearExpiredCache(): void {
    const now = Date.now();
    
    this.cachedData.forEach((symbolCache, symbol) => {
      const validData = symbolCache.filter(point => point.expiresAt > now);
      if (validData.length > 0) {
        this.cachedData.set(symbol, validData);
      } else {
        this.cachedData.delete(symbol);
      }
    });

    this.emit('cacheCleared');
  }

  destroy(): void {
    this.stopAllPolling();
    this.clearAllRestFallbacks();
    this.cachedData.clear();
    this.subscribedSymbols.clear();
    this.circuitBreakers.clear();
    
    this.emit('destroyed');
  }
}

// Default fallback configuration
export const DEFAULT_FALLBACK_CONFIG: FallbackConfig = {
  enablePollingFallback: true,
  pollingInterval: 30000, // 30 seconds
  maxPollingRetries: 3,
  enableRESTFallback: true,
  restFallbackDelay: 2000, // 2 seconds
  enableOfflineMode: true,
  offlineDataRetention: 3600, // 1 hour
  prioritizedAPIs: ['finnhub', 'alphaVantage'],
  circuitBreakerEnabled: true,
  circuitBreakerThreshold: 3,
  circuitBreakerResetTime: 60000 // 1 minute
};

// Global fallback manager instance
export const websocketFallbackManager = new WebSocketFallbackManager(DEFAULT_FALLBACK_CONFIG);