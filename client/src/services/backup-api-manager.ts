// Backup API Manager - Intelligent fallback system for secondary APIs
import { finnhubEnhanced } from './finnhub-enhanced';
import { alphaVantageEnhanced } from './alpha-vantage-enhanced';
import { apiRotation } from '../lib/api-rotation';
import { cacheManager } from '../lib/cache-manager';

export interface APIProvider {
  name: string;
  type: 'primary' | 'secondary' | 'fallback';
  status: 'healthy' | 'degraded' | 'unavailable';
  priority: number;
  lastHealthCheck: number;
  responseTime: number;
  errorCount: number;
  capabilities: string[];
}

export interface BackupStrategy {
  dataType: 'quote' | 'profile' | 'financials' | 'historical' | 'realtime';
  providers: APIProvider[];
  fallbackOrder: string[];
  cacheStrategy: 'aggressive' | 'normal' | 'minimal';
}

export interface DataRequest {
  symbol: string;
  dataType: string;
  priority: 'high' | 'medium' | 'low';
  maxAge?: number; // Maximum cache age in ms
  fallbackAcceptable?: boolean;
}

class BackupAPIManager {
  private providers: Map<string, APIProvider> = new Map();
  private healthCheckInterval: number | null = null;
  private healthCheckFrequency = 5 * 60 * 1000; // 5 minutes
  
  private strategies: Map<string, BackupStrategy> = new Map();
  
  constructor() {
    this.initializeProviders();
    this.initializeStrategies();
    this.startHealthChecks();
  }

  private initializeProviders(): void {
    // Primary provider - existing API rotation system
    this.providers.set('rotation', {
      name: 'API Rotation',
      type: 'primary',
      status: 'healthy',
      priority: 1,
      lastHealthCheck: Date.now(),
      responseTime: 0,
      errorCount: 0,
      capabilities: ['quote', 'profile', 'financials', 'historical']
    });

    // Secondary provider - Finnhub WebSocket + REST
    this.providers.set('finnhub', {
      name: 'Finnhub Enhanced',
      type: 'secondary',
      status: 'healthy',
      priority: 2,
      lastHealthCheck: Date.now(),
      responseTime: 0,
      errorCount: 0,
      capabilities: ['quote', 'profile', 'financials', 'realtime']
    });

    // Secondary provider - Alpha Vantage for fundamentals
    this.providers.set('alphavantage', {
      name: 'Alpha Vantage Enhanced',
      type: 'secondary',
      status: 'healthy',
      priority: 3,
      lastHealthCheck: Date.now(),
      responseTime: 0,
      errorCount: 0,
      capabilities: ['profile', 'financials', 'earnings']
    });

    // Fallback provider - Mock data
    this.providers.set('mock', {
      name: 'Mock Data',
      type: 'fallback',
      status: 'healthy',
      priority: 10,
      lastHealthCheck: Date.now(),
      responseTime: 0,
      errorCount: 0,
      capabilities: ['quote', 'profile', 'financials', 'historical']
    });
  }

  private initializeStrategies(): void {
    // Real-time quotes strategy
    this.strategies.set('quote', {
      dataType: 'quote',
      providers: [
        this.providers.get('finnhub')!,  // Finnhub WebSocket for real-time
        this.providers.get('rotation')!, // API rotation as backup
        this.providers.get('mock')!      // Mock data as final fallback
      ],
      fallbackOrder: ['finnhub', 'rotation', 'mock'],
      cacheStrategy: 'minimal' // Quotes need to be fresh
    });

    // Company profiles strategy
    this.strategies.set('profile', {
      dataType: 'profile',
      providers: [
        this.providers.get('rotation')!,     // Primary rotation system
        this.providers.get('alphavantage')!, // Alpha Vantage for detailed fundamentals
        this.providers.get('finnhub')!,      // Finnhub as backup
        this.providers.get('mock')!          // Mock data fallback
      ],
      fallbackOrder: ['rotation', 'alphavantage', 'finnhub', 'mock'],
      cacheStrategy: 'aggressive' // Profile data changes rarely
    });

    // Financial data strategy
    this.strategies.set('financials', {
      dataType: 'financials',
      providers: [
        this.providers.get('alphavantage')!, // Alpha Vantage excels at fundamentals
        this.providers.get('rotation')!,     // API rotation as backup
        this.providers.get('finnhub')!,      // Finnhub for basic metrics
        this.providers.get('mock')!          // Mock data fallback
      ],
      fallbackOrder: ['alphavantage', 'rotation', 'finnhub', 'mock'],
      cacheStrategy: 'aggressive' // Financial data changes quarterly
    });

    // Real-time streaming strategy
    this.strategies.set('realtime', {
      dataType: 'realtime',
      providers: [
        this.providers.get('finnhub')!,  // Only Finnhub supports WebSocket
        this.providers.get('rotation')!, // Polling fallback
        this.providers.get('mock')!      // Mock streaming
      ],
      fallbackOrder: ['finnhub', 'rotation', 'mock'],
      cacheStrategy: 'minimal'
    });
  }

  // Main data fetching method with intelligent fallback
  async fetchData(request: DataRequest): Promise<any> {
    const strategy = this.strategies.get(request.dataType);
    
    if (!strategy) {
      throw new Error(`No strategy defined for data type: ${request.dataType}`);
    }

    console.log(`🔄 Fetching ${request.dataType} data for ${request.symbol} (priority: ${request.priority})`);

    // Check cache first based on strategy
    if (strategy.cacheStrategy !== 'minimal') {
      const cached = this.getCachedData(request);
      if (cached) {
        console.log(`📦 Cache hit for ${request.symbol} ${request.dataType}`);
        return cached;
      }
    }

    // Try providers in fallback order
    for (const providerName of strategy.fallbackOrder) {
      const provider = this.providers.get(providerName);
      
      if (!provider || provider.status === 'unavailable') {
        console.log(`⚠️ Provider ${providerName} unavailable, trying next...`);
        continue;
      }

      try {
        const startTime = Date.now();
        const data = await this.fetchFromProvider(providerName, request);
        const responseTime = Date.now() - startTime;
        
        // Update provider health
        this.updateProviderHealth(providerName, true, responseTime);
        
        // Cache the result based on strategy
        this.cacheData(request, data, strategy.cacheStrategy);
        
        console.log(`✅ Successfully fetched ${request.dataType} for ${request.symbol} from ${providerName} (${responseTime}ms)`);
        return data;
        
      } catch (error) {
        console.warn(`⚠️ Provider ${providerName} failed for ${request.symbol}:`, error);
        this.updateProviderHealth(providerName, false);
        
        // If this was the last provider and fallback is not acceptable, throw error
        if (strategy.fallbackOrder.indexOf(providerName) === strategy.fallbackOrder.length - 1 && !request.fallbackAcceptable) {
          throw error;
        }
        
        continue; // Try next provider
      }
    }

    throw new Error(`All providers failed for ${request.dataType} data for ${request.symbol}`);
  }

  private async fetchFromProvider(providerName: string, request: DataRequest): Promise<any> {
    switch (providerName) {
      case 'rotation':
        return this.fetchFromRotation(request);
      
      case 'finnhub':
        return this.fetchFromFinnhub(request);
      
      case 'alphavantage':
        return this.fetchFromAlphaVantage(request);
      
      case 'mock':
        return this.fetchFromMock(request);
      
      default:
        throw new Error(`Unknown provider: ${providerName}`);
    }
  }

  private async fetchFromRotation(request: DataRequest): Promise<any> {
    switch (request.dataType) {
      case 'quote':
        return apiRotation.makeAPICall('/quote', request.symbol, 'quote');
      case 'profile':
        return apiRotation.makeAPICall('/profile', request.symbol, 'profile');
      case 'financials':
        return apiRotation.makeAPICall('/financials', request.symbol, 'financials');
      default:
        throw new Error(`Rotation provider doesn't support ${request.dataType}`);
    }
  }

  private async fetchFromFinnhub(request: DataRequest): Promise<any> {
    switch (request.dataType) {
      case 'quote':
        return finnhubEnhanced.getStockQuoteWithRateLimit(request.symbol);
      case 'profile':
        return finnhubEnhanced.getCompanyProfileWithRateLimit(request.symbol);
      case 'financials':
        return finnhubEnhanced.getBasicFinancialsWithRateLimit(request.symbol);
      default:
        throw new Error(`Finnhub provider doesn't support ${request.dataType}`);
    }
  }

  private async fetchFromAlphaVantage(request: DataRequest): Promise<any> {
    switch (request.dataType) {
      case 'profile':
        return alphaVantageEnhanced.getCompanyOverviewOptimized(request.symbol);
      case 'financials':
        return alphaVantageEnhanced.getFundamentalsBundle(request.symbol);
      default:
        throw new Error(`Alpha Vantage provider doesn't support ${request.dataType}`);
    }
  }

  private async fetchFromMock(request: DataRequest): Promise<any> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
    
    // Return mock data based on data type
    switch (request.dataType) {
      case 'quote':
        return {
          symbol: request.symbol,
          price: 100 + Math.random() * 50,
          change: (Math.random() - 0.5) * 10,
          changePercent: (Math.random() - 0.5) * 5,
          source: 'mock'
        };
      
      case 'profile':
        return {
          symbol: request.symbol,
          name: `${request.symbol} Corporation`,
          sector: 'Technology',
          industry: 'Software',
          marketCap: 1000000000 + Math.random() * 50000000000,
          source: 'mock'
        };
      
      case 'financials':
        return {
          symbol: request.symbol,
          revenue: 1000000 + Math.random() * 10000000,
          netIncome: 100000 + Math.random() * 1000000,
          eps: 1 + Math.random() * 10,
          pe: 15 + Math.random() * 20,
          source: 'mock'
        };
      
      default:
        return { symbol: request.symbol, source: 'mock', dataType: request.dataType };
    }
  }

  private getCachedData(request: DataRequest): any | null {
    const cacheKey = `backup-${request.dataType}-${request.symbol}`;
    return cacheManager.get(cacheKey, request.dataType);
  }

  private cacheData(request: DataRequest, data: any, strategy: string): void {
    const cacheKey = `backup-${request.dataType}-${request.symbol}`;
    
    let cacheDuration: number;
    switch (strategy) {
      case 'aggressive':
        cacheDuration = 24 * 60 * 60 * 1000; // 24 hours
        break;
      case 'normal':
        cacheDuration = 60 * 60 * 1000; // 1 hour
        break;
      case 'minimal':
        cacheDuration = 5 * 60 * 1000; // 5 minutes
        break;
      default:
        cacheDuration = 60 * 60 * 1000;
    }
    
    cacheManager.set(cacheKey, data, request.dataType, cacheDuration);
  }

  private updateProviderHealth(providerName: string, success: boolean, responseTime: number = 0): void {
    const provider = this.providers.get(providerName);
    if (!provider) return;

    provider.lastHealthCheck = Date.now();
    
    if (success) {
      provider.errorCount = Math.max(0, provider.errorCount - 1);
      provider.responseTime = responseTime;
      
      if (provider.status === 'unavailable') {
        provider.status = 'healthy';
        console.log(`✅ Provider ${providerName} back online`);
      }
    } else {
      provider.errorCount++;
      
      // Mark as degraded after 3 errors, unavailable after 5
      if (provider.errorCount >= 5) {
        provider.status = 'unavailable';
        console.log(`❌ Provider ${providerName} marked as unavailable`);
      } else if (provider.errorCount >= 3) {
        provider.status = 'degraded';
        console.log(`⚠️ Provider ${providerName} marked as degraded`);
      }
    }
  }

  // Health monitoring
  private async performHealthCheck(providerName: string): Promise<void> {
    const provider = this.providers.get(providerName);
    if (!provider) return;

    try {
      const testRequest: DataRequest = {
        symbol: 'AAPL',
        dataType: provider.capabilities[0],
        priority: 'low',
        fallbackAcceptable: true
      };

      const startTime = Date.now();
      await this.fetchFromProvider(providerName, testRequest);
      const responseTime = Date.now() - startTime;
      
      this.updateProviderHealth(providerName, true, responseTime);
    } catch (error) {
      this.updateProviderHealth(providerName, false);
    }
  }

  private startHealthChecks(): void {
    this.healthCheckInterval = window.setInterval(() => {
      console.log('🔍 Performing provider health checks...');
      
      for (const providerName of this.providers.keys()) {
        this.performHealthCheck(providerName);
      }
    }, this.healthCheckFrequency);
  }

  // Public methods
  getProviderStatus(): Record<string, APIProvider> {
    const status: Record<string, APIProvider> = {};
    this.providers.forEach((provider, name) => {
      status[name] = { ...provider };
    });
    return status;
  }

  forceProviderUnavailable(providerName: string): void {
    const provider = this.providers.get(providerName);
    if (provider) {
      provider.status = 'unavailable';
      console.log(`🔧 Manually marked ${providerName} as unavailable`);
    }
  }

  forceProviderHealthy(providerName: string): void {
    const provider = this.providers.get(providerName);
    if (provider) {
      provider.status = 'healthy';
      provider.errorCount = 0;
      console.log(`🔧 Manually marked ${providerName} as healthy`);
    }
  }

  // Batch operations with smart routing
  async fetchMultipleData(requests: DataRequest[]): Promise<Record<string, any>> {
    const results: Record<string, any> = {};
    
    // Group requests by provider for optimal batching
    const groupedRequests = this.groupRequestsByOptimalProvider(requests);
    
    // Process each group
    for (const [providerName, providerRequests] of Object.entries(groupedRequests)) {
      console.log(`🔄 Processing ${providerRequests.length} requests with ${providerName}`);
      
      for (const request of providerRequests) {
        try {
          const data = await this.fetchData(request);
          results[request.symbol] = data;
          
          // Add small delay between requests to respect rate limits
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.warn(`⚠️ Failed to fetch data for ${request.symbol}:`, error);
          results[request.symbol] = null;
        }
      }
    }
    
    return results;
  }

  private groupRequestsByOptimalProvider(requests: DataRequest[]): Record<string, DataRequest[]> {
    const groups: Record<string, DataRequest[]> = {};
    
    for (const request of requests) {
      const strategy = this.strategies.get(request.dataType);
      if (!strategy) continue;
      
      // Find the first healthy provider for this data type
      const optimalProvider = strategy.fallbackOrder.find(providerName => {
        const provider = this.providers.get(providerName);
        return provider && provider.status === 'healthy';
      }) || strategy.fallbackOrder[0];
      
      if (!groups[optimalProvider]) {
        groups[optimalProvider] = [];
      }
      groups[optimalProvider].push(request);
    }
    
    return groups;
  }

  // Cleanup
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    // Disconnect any WebSocket connections
    finnhubEnhanced.disconnect();
  }
}

export const backupAPIManager = new BackupAPIManager();