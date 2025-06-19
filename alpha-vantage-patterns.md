# Alpha Vantage API Integration Patterns for TypeScript

## Overview
This guide provides efficient patterns for integrating Alpha Vantage API with TypeScript, optimized for the free tier (25 calls/day).

## 1. API Client Setup and Authentication

### Basic Client Configuration
```typescript
interface AlphaVantageConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  retryAttempts?: number;
}

class AlphaVantageClient {
  private config: Required<AlphaVantageConfig>;
  private requestCount: number = 0;
  private lastRequestTime: number = 0;
  private readonly RATE_LIMIT_DELAY = 12000; // 12 seconds between requests (5 calls/minute)

  constructor(config: AlphaVantageConfig) {
    this.config = {
      baseUrl: 'https://www.alphavantage.co/query',
      timeout: 10000,
      retryAttempts: 3,
      ...config
    };
  }

  private async makeRequest<T>(params: Record<string, string>): Promise<T> {
    await this.enforceRateLimit();
    
    const url = new URL(this.config.baseUrl);
    url.searchParams.append('apikey', this.config.apiKey);
    
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': 'AlphaVantage-TypeScript-Client/1.0'
      },
      signal: AbortSignal.timeout(this.config.timeout)
    });

    if (!response.ok) {
      throw new AlphaVantageError(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    this.handleApiResponse(data);
    
    return data;
  }

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.RATE_LIMIT_DELAY) {
      const delay = this.RATE_LIMIT_DELAY - timeSinceLastRequest;
      console.log(`Rate limiting: waiting ${delay}ms before next request`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    this.lastRequestTime = Date.now();
    this.requestCount++;
  }

  private handleApiResponse(data: any): void {
    // Check for API error responses
    if (data['Error Message']) {
      throw new AlphaVantageError(data['Error Message']);
    }

    if (data['Note']) {
      throw new QuotaExceededError(data['Note']);
    }

    if (data['Information']) {
      throw new RateLimitError(data['Information']);
    }
  }

  public getRequestCount(): number {
    return this.requestCount;
  }

  public getRemainingQuota(): number {
    return Math.max(0, 25 - this.requestCount);
  }
}
```

### Error Handling Classes
```typescript
class AlphaVantageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AlphaVantageError';
  }
}

class QuotaExceededError extends AlphaVantageError {
  constructor(message: string) {
    super(`Quota exceeded: ${message}`);
    this.name = 'QuotaExceededError';
  }
}

class RateLimitError extends AlphaVantageError {
  constructor(message: string) {
    super(`Rate limit: ${message}`);
    this.name = 'RateLimitError';
  }
}
```

## 2. TypeScript Interfaces for API Responses

### Company Overview Interface
```typescript
interface CompanyOverview {
  Symbol: string;
  AssetType: string;
  Name: string;
  Description: string;
  CIK: string;
  Exchange: string;
  Currency: string;
  Country: string;
  Sector: string;
  Industry: string;
  Address: string;
  FiscalYearEnd: string;
  LatestQuarter: string;
  MarketCapitalization: string;
  EBITDA: string;
  PERatio: string;
  PEGRatio: string;
  BookValue: string;
  DividendPerShare: string;
  DividendYield: string;
  EPS: string;
  RevenuePerShareTTM: string;
  ProfitMargin: string;
  OperatingMarginTTM: string;
  ReturnOnAssetsTTM: string;
  ReturnOnEquityTTM: string;
  RevenueTTM: string;
  GrossProfitTTM: string;
  DilutedEPSTTM: string;
  QuarterlyEarningsGrowthYOY: string;
  QuarterlyRevenueGrowthYOY: string;
  AnalystTargetPrice: string;
  TrailingPE: string;
  ForwardPE: string;
  PriceToSalesRatioTTM: string;
  PriceToBookRatio: string;
  EVToRevenue: string;
  EVToEBITDA: string;
  Beta: string;
  '52WeekHigh': string;
  '52WeekLow': string;
  '50DayMovingAverage': string;
  '200DayMovingAverage': string;
  SharesOutstanding: string;
  DividendDate: string;
  ExDividendDate: string;
}
```

### Earnings Data Interface
```typescript
interface QuarterlyEarning {
  fiscalDateEnding: string;
  reportedDate: string;
  reportedEPS: string;
  estimatedEPS: string;
  surprise: string;
  surprisePercentage: string;
}

interface AnnualEarning {
  fiscalDateEnding: string;
  reportedEPS: string;
}

interface EarningsData {
  symbol: string;
  annualEarnings: AnnualEarning[];
  quarterlyEarnings: QuarterlyEarning[];
}
```

### Time Series Data Interface
```typescript
interface TimeSeriesData {
  [date: string]: {
    '1. open': string;
    '2. high': string;
    '3. low': string;
    '4. close': string;
    '5. volume': string;
  };
}

interface TimeSeriesResponse {
  'Meta Data': {
    '1. Information': string;
    '2. Symbol': string;
    '3. Last Refreshed': string;
    '4. Output Size': string;
    '5. Time Zone': string;
  };
  'Time Series (Daily)': TimeSeriesData;
}
```

## 3. Fundamentals Data Fetching

### Company Overview Method
```typescript
class AlphaVantageClient {
  // ... previous methods ...

  async getCompanyOverview(symbol: string): Promise<CompanyOverview> {
    const params = {
      function: 'OVERVIEW',
      symbol: symbol.toUpperCase()
    };

    try {
      const data = await this.makeRequest<CompanyOverview>(params);
      return data;
    } catch (error) {
      if (error instanceof QuotaExceededError) {
        console.error(`Quota exceeded when fetching overview for ${symbol}`);
        throw error;
      }
      throw new AlphaVantageError(`Failed to fetch company overview for ${symbol}: ${error.message}`);
    }
  }

  async getEarningsData(symbol: string): Promise<EarningsData> {
    const params = {
      function: 'EARNINGS',
      symbol: symbol.toUpperCase()
    };

    try {
      const data = await this.makeRequest<EarningsData>(params);
      return data;
    } catch (error) {
      if (error instanceof QuotaExceededError) {
        console.error(`Quota exceeded when fetching earnings for ${symbol}`);
        throw error;
      }
      throw new AlphaVantageError(`Failed to fetch earnings data for ${symbol}: ${error.message}`);
    }
  }

  async getDailyPrices(symbol: string, outputSize: 'compact' | 'full' = 'compact'): Promise<TimeSeriesResponse> {
    const params = {
      function: 'TIME_SERIES_DAILY',
      symbol: symbol.toUpperCase(),
      outputsize: outputSize
    };

    try {
      const data = await this.makeRequest<TimeSeriesResponse>(params);
      return data;
    } catch (error) {
      if (error instanceof QuotaExceededError) {
        console.error(`Quota exceeded when fetching daily prices for ${symbol}`);
        throw error;
      }
      throw new AlphaVantageError(`Failed to fetch daily prices for ${symbol}: ${error.message}`);
    }
  }
}
```

## 4. Smart Caching for Free Tier Optimization

### Local Storage Cache Implementation
```typescript
interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

class AlphaVantageCache {
  private cache = new Map<string, CacheItem<any>>();
  private readonly DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours

  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + ttl
    };
    this.cache.set(key, item);
    
    // Persist to localStorage if available
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(`av_cache_${key}`, JSON.stringify(item));
      } catch (e) {
        console.warn('Failed to persist cache to localStorage:', e);
      }
    }
  }

  get<T>(key: string): T | null {
    let item = this.cache.get(key);
    
    // Try to load from localStorage if not in memory
    if (!item && typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem(`av_cache_${key}`);
        if (stored) {
          item = JSON.parse(stored);
          this.cache.set(key, item);
        }
      } catch (e) {
        console.warn('Failed to load cache from localStorage:', e);
      }
    }

    if (!item) return null;

    if (Date.now() > item.expiry) {
      this.delete(key);
      return null;
    }

    return item.data;
  }

  delete(key: string): void {
    this.cache.delete(key);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(`av_cache_${key}`);
    }
  }

  clear(): void {
    this.cache.clear();
    if (typeof localStorage !== 'undefined') {
      const keys = Object.keys(localStorage).filter(key => key.startsWith('av_cache_'));
      keys.forEach(key => localStorage.removeItem(key));
    }
  }
}
```

### Enhanced Client with Caching
```typescript
class CachedAlphaVantageClient extends AlphaVantageClient {
  private cache = new AlphaVantageCache();

  async getCompanyOverview(symbol: string, useCache: boolean = true): Promise<CompanyOverview> {
    const cacheKey = `overview_${symbol}`;
    
    if (useCache) {
      const cached = this.cache.get<CompanyOverview>(cacheKey);
      if (cached) {
        console.log(`Using cached company overview for ${symbol}`);
        return cached;
      }
    }

    const data = await super.getCompanyOverview(symbol);
    
    if (useCache) {
      // Cache company overview for 24 hours (fundamentals don't change often)
      this.cache.set(cacheKey, data, 24 * 60 * 60 * 1000);
    }

    return data;
  }

  async getEarningsData(symbol: string, useCache: boolean = true): Promise<EarningsData> {
    const cacheKey = `earnings_${symbol}`;
    
    if (useCache) {
      const cached = this.cache.get<EarningsData>(cacheKey);
      if (cached) {
        console.log(`Using cached earnings data for ${symbol}`);
        return cached;
      }
    }

    const data = await super.getEarningsData(symbol);
    
    if (useCache) {
      // Cache earnings for 6 hours (updated quarterly)
      this.cache.set(cacheKey, data, 6 * 60 * 60 * 1000);
    }

    return data;
  }
}
```

## 5. Batch Processing for Free Tier

### Symbol Queue Management
```typescript
class SymbolQueue {
  private queue: string[] = [];
  private processing = false;
  private results: Map<string, any> = new Map();
  private errors: Map<string, Error> = new Map();

  constructor(private client: CachedAlphaVantageClient) {}

  addSymbols(symbols: string[]): void {
    this.queue.push(...symbols.map(s => s.toUpperCase()));
  }

  async processQueue(batchSize: number = 5): Promise<{
    results: Map<string, any>;
    errors: Map<string, Error>;
  }> {
    if (this.processing) {
      throw new Error('Queue is already being processed');
    }

    this.processing = true;
    this.results.clear();
    this.errors.clear();

    try {
      const batches = this.createBatches(this.queue, batchSize);
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`Processing batch ${i + 1}/${batches.length}: ${batch.join(', ')}`);
        
        // Check remaining quota
        const remaining = this.client.getRemainingQuota();
        if (remaining < batch.length) {
          console.warn(`Insufficient quota remaining (${remaining}) for batch size (${batch.length})`);
          break;
        }

        await this.processBatch(batch);
        
        // Add delay between batches if not the last batch
        if (i < batches.length - 1) {
          console.log('Waiting between batches...');
          await new Promise(resolve => setTimeout(resolve, 15000));
        }
      }
    } finally {
      this.processing = false;
    }

    return {
      results: new Map(this.results),
      errors: new Map(this.errors)
    };
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private async processBatch(symbols: string[]): Promise<void> {
    const promises = symbols.map(async (symbol) => {
      try {
        const overview = await this.client.getCompanyOverview(symbol);
        this.results.set(symbol, overview);
      } catch (error) {
        this.errors.set(symbol, error as Error);
        console.error(`Failed to process ${symbol}:`, error.message);
      }
    });

    await Promise.allSettled(promises);
  }
}
```

## 6. Usage Examples

### Basic Usage
```typescript
const client = new CachedAlphaVantageClient({
  apiKey: process.env.ALPHA_VANTAGE_API_KEY!
});

// Get company fundamentals
try {
  const overview = await client.getCompanyOverview('AAPL');
  console.log(`${overview.Name} (${overview.Symbol})`);
  console.log(`Market Cap: $${overview.MarketCapitalization}`);
  console.log(`P/E Ratio: ${overview.PERatio}`);
  
  const earnings = await client.getEarningsData('AAPL');
  console.log(`Latest EPS: ${earnings.quarterlyEarnings[0]?.reportedEPS}`);
  
} catch (error) {
  if (error instanceof QuotaExceededError) {
    console.error('Daily quota exceeded. Try again tomorrow.');
  } else {
    console.error('Error:', error.message);
  }
}
```

### Batch Processing Example
```typescript
const queue = new SymbolQueue(client);
const symbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA'];

queue.addSymbols(symbols);

const { results, errors } = await queue.processQueue(3); // Process 3 at a time

results.forEach((data, symbol) => {
  console.log(`${symbol}: ${data.Name} - $${data.MarketCapitalization}`);
});

errors.forEach((error, symbol) => {
  console.error(`${symbol}: ${error.message}`);
});

console.log(`Quota remaining: ${client.getRemainingQuota()}`);
```

### Error Recovery Pattern
```typescript
async function fetchWithRetry<T>(
  fetchFn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fetchFn();
    } catch (error) {
      lastError = error as Error;
      
      if (error instanceof QuotaExceededError) {
        // Don't retry on quota exceeded
        throw error;
      }
      
      if (error instanceof RateLimitError) {
        // Wait longer on rate limit
        const delay = Math.min(60000, attempt * 15000);
        console.log(`Rate limited, waiting ${delay}ms before retry ${attempt}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      if (attempt === maxRetries) {
        break;
      }
      
      // Exponential backoff for other errors
      const delay = Math.min(30000, Math.pow(2, attempt) * 1000);
      console.log(`Attempt ${attempt} failed, retrying in ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

// Usage
const overview = await fetchWithRetry(() => 
  client.getCompanyOverview('AAPL')
);
```

## 7. Free Tier Best Practices

1. **Cache Aggressively**: Company fundamentals rarely change daily
2. **Batch Process**: Group similar requests together
3. **Monitor Quota**: Always check remaining calls before making requests
4. **Prioritize Symbols**: Focus on most important stocks first
5. **Use Compact Data**: Request only necessary data size
6. **Implement Circuit Breakers**: Stop processing when quota is low
7. **Plan Your Calls**: Decide which data is most critical for your use case
8. **Handle Errors Gracefully**: Don't waste calls on repeated failures
9. **Use WebSockets**: Consider real-time data alternatives for price updates
10. **Upgrade When Ready**: Monitor usage patterns to decide when to upgrade

This pattern provides a robust foundation for working with Alpha Vantage API on the free tier while maintaining clean TypeScript code and efficient resource usage.