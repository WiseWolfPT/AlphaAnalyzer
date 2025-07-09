# API Providers Documentation

Complete documentation for all financial data API providers configured in the Alfalyzer platform, including rate limits, fallback chains, and optimization strategies.

## Table of Contents

1. [Overview](#overview)
2. [Configured Providers](#configured-providers)
3. [Rate Limits & Quotas](#rate-limits--quotas)
4. [Fallback Chain Strategy](#fallback-chain-strategy)
5. [Optimization Strategies](#optimization-strategies)
6. [Usage Examples](#usage-examples)
7. [Monitoring & Analytics](#monitoring--analytics)
8. [Security Considerations](#security-considerations)
9. [Error Handling](#error-handling)
10. [Performance Tuning](#performance-tuning)

## Overview

Alfalyzer implements a sophisticated multi-provider API architecture designed to maximize data availability while minimizing costs. The system uses intelligent routing, caching, and fallback mechanisms to ensure reliable financial data delivery.

### Architecture Components

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Client App    │ -> │  API Optimizer   │ -> │  Data Providers │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                       ┌──────────────────┐
                       │  Cache Manager   │
                       └──────────────────┘
                              │
                       ┌──────────────────┐
                       │ Usage Tracker    │
                       └──────────────────┘
```

## Configured Providers

### 1. Financial Modeling Prep (FMP) 💼

**Primary Use:** Comprehensive financial statements, earnings calendar, company profiles
**Reliability:** High
**Data Quality:** Excellent
**Cost Efficiency:** Good

#### Configuration
```typescript
FMP: {
  baseUrl: 'https://financialmodelingprep.com/api/v3',
  apiKey: process.env.FMP_API_KEY,
  dailyLimit: 250,
  rateLimit: 'No explicit minute limit',
  priority: 1,
  enabled: true
}
```

#### Supported Endpoints
- `/profile/{symbol}` - Company profile
- `/quote/{symbol}` - Real-time quote
- `/income-statement/{symbol}` - Income statements
- `/balance-sheet-statement/{symbol}` - Balance sheets
- `/cash-flow-statement/{symbol}` - Cash flow statements
- `/earnings-calendar` - Earnings calendar
- `/historical-price-full/{symbol}` - Historical data

#### Rate Limits
- **Daily:** 250 API calls
- **Minute:** No official limit (recommended: 10/min)
- **Burst:** 5 concurrent requests
- **Reset:** Midnight UTC

### 2. Alpha Vantage 📈

**Primary Use:** Fundamental analysis, technical indicators, time series data
**Reliability:** High
**Data Quality:** Excellent
**Cost Efficiency:** Low (premium cost model)

#### Configuration
```typescript
ALPHA_VANTAGE: {
  baseUrl: 'https://www.alphavantage.co/query',
  apiKey: process.env.ALPHA_VANTAGE_API_KEY,
  dailyLimit: 25,
  minuteLimit: 5,
  priority: 4,
  enabled: true,
  estimatedCost: 4 // Higher cost for premium data
}
```

#### Supported Functions
- `GLOBAL_QUOTE` - Real-time quote
- `OVERVIEW` - Company fundamentals
- `INCOME_STATEMENT` - Annual/quarterly income
- `BALANCE_SHEET` - Annual/quarterly balance sheet
- `CASH_FLOW` - Annual/quarterly cash flow
- `EARNINGS` - Earnings data
- `TIME_SERIES_DAILY` - Daily historical data

#### Rate Limits
- **Daily:** 25 API calls
- **Minute:** 5 API calls
- **Burst:** 1 concurrent request
- **Reset:** Midnight UTC

### 3. Finnhub 🚀

**Primary Use:** Real-time quotes, WebSocket feeds, basic company data
**Reliability:** Very High
**Data Quality:** Good
**Cost Efficiency:** Excellent

#### Configuration
```typescript
FINNHUB: {
  baseUrl: 'https://finnhub.io/api/v1',
  apiKey: process.env.FINNHUB_API_KEY,
  dailyLimit: 86400, // 60/min theoretical
  minuteLimit: 60,
  priority: 2,
  enabled: true,
  batchSize: 1
}
```

#### Supported Endpoints
- `/quote` - Real-time quote
- `/profile2` - Company profile
- `/recommendation` - Analyst recommendations
- `/news` - Company news
- `/earnings` - Earnings surprises
- `/metric` - Key metrics

#### Rate Limits
- **Daily:** Unlimited
- **Minute:** 60 API calls
- **WebSocket:** 50 symbols per connection
- **Burst:** 10 concurrent requests

### 4. Twelve Data 📊

**Primary Use:** Historical data, time series, real-time WebSocket
**Reliability:** High
**Data Quality:** Good
**Cost Efficiency:** Very Good

#### Configuration
```typescript
TWELVE_DATA: {
  baseUrl: 'https://api.twelvedata.com',
  apiKey: process.env.TWELVE_DATA_API_KEY,
  dailyLimit: 800,
  minuteLimit: 8,
  priority: 2,
  enabled: true,
  batchSize: 120
}
```

#### Supported Endpoints
- `/quote` - Real-time quote
- `/profile` - Company profile
- `/time_series` - Historical time series
- `/earnings` - Earnings data
- `/statistics` - Key statistics
- `/logo` - Company logos

#### Rate Limits
- **Daily:** 800 API calls
- **Minute:** 8 API calls
- **Batch:** Up to 120 symbols per request
- **Reset:** Midnight UTC

### 5. Polygon.io 🔥

**Primary Use:** High-frequency data, advanced market data
**Reliability:** Very High
**Data Quality:** Excellent
**Cost Efficiency:** Good (free tier limited)

#### Configuration
```typescript
POLYGON: {
  baseUrl: 'https://api.polygon.io',
  apiKey: process.env.POLYGON_API_KEY,
  dailyLimit: 5, // Free tier very limited
  minuteLimit: 5,
  priority: 5,
  enabled: false // Disabled due to low free limits
}
```

#### Supported Endpoints
- `/v2/aggs/ticker/{symbol}/range/` - Aggregated data
- `/v3/reference/tickers/{symbol}` - Ticker details
- `/v2/last/trade/{symbol}` - Last trade
- `/v2/snapshot/locale/us/markets/stocks/tickers` - Market snapshot

#### Rate Limits
- **Daily:** 5 API calls (free tier)
- **Minute:** 5 API calls
- **Premium:** Significantly higher limits
- **Reset:** Midnight EST

## Rate Limits & Quotas

### Daily Allocation Strategy

```typescript
const DAILY_ALLOCATION = {
  FMP: {
    total: 250,
    allocation: {
      quotes: 150,        // 60% for real-time quotes
      fundamentals: 50,   // 20% for fundamental data
      historical: 30,     // 12% for historical data
      earnings: 20        // 8% for earnings data
    }
  },
  ALPHA_VANTAGE: {
    total: 25,
    allocation: {
      fundamentals: 15,   // 60% for premium fundamental data
      technical: 10       // 40% for technical indicators
    }
  },
  FINNHUB: {
    total: 86400, // Theoretical daily max
    allocation: {
      quotes: 3600,       // Real-time quotes
      news: 1440,         // Company news
      profiles: 720       // Company profiles
    }
  },
  TWELVE_DATA: {
    total: 800,
    allocation: {
      historical: 400,    // 50% for historical data
      quotes: 200,        // 25% for quotes
      batch_requests: 200 // 25% for batch operations
    }
  }
};
```

### Quota Tracking

The system tracks quota usage in real-time:

```typescript
interface QuotaTracker {
  used: number;
  limit: number;
  resetTime: number;
  provider: string;
  allocation: Record<string, number>;
  warningThreshold: number; // 80% of limit
  criticalThreshold: number; // 95% of limit
}
```

## Fallback Chain Strategy

### Primary Fallback Chains

#### For Real-time Quotes
1. **Finnhub** (Primary) - High rate limit, reliable
2. **Twelve Data** (Secondary) - Good batch support
3. **FMP** (Tertiary) - Comprehensive coverage
4. **Alpha Vantage** (Emergency) - Premium quality, low limits

#### For Fundamental Data
1. **FMP** (Primary) - Comprehensive financial statements
2. **Alpha Vantage** (Secondary) - Premium fundamental data
3. **Twelve Data** (Tertiary) - Basic fundamentals

#### For Historical Data
1. **Twelve Data** (Primary) - Excellent historical coverage
2. **FMP** (Secondary) - Reliable historical data
3. **Alpha Vantage** (Tertiary) - Time series functions

### Intelligent Provider Selection

```typescript
class ProviderSelector {
  selectOptimalProvider(
    endpoint: string,
    symbolCount: number,
    priority: 'critical' | 'high' | 'medium' | 'low'
  ): string {
    const candidates = this.getProvidersForEndpoint(endpoint);
    
    // Filter by quota availability
    const available = candidates.filter(provider => 
      this.hasQuotaRemaining(provider, symbolCount)
    );
    
    if (available.length === 0) {
      return this.getEmergencyProvider(endpoint);
    }
    
    // Score providers based on:
    // 1. Remaining quota percentage
    // 2. Historical success rate
    // 3. Average response time
    // 4. Cost efficiency
    
    return available.reduce((best, current) => {
      const bestScore = this.calculateProviderScore(best, endpoint);
      const currentScore = this.calculateProviderScore(current, endpoint);
      return currentScore > bestScore ? current : best;
    });
  }
}
```

## Optimization Strategies

### 1. Request Batching

The API optimizer groups related requests to minimize API calls:

```typescript
// Example: Batch quote requests
const symbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA'];

// Instead of 4 separate calls:
// GET /quote/AAPL
// GET /quote/GOOGL
// GET /quote/MSFT
// GET /quote/TSLA

// Make 1 batched call:
// GET /quote?symbols=AAPL,GOOGL,MSFT,TSLA
```

### 2. Intelligent Caching

```typescript
const CACHE_STRATEGY = {
  quotes: {
    ttl: 60, // 1 minute for real-time data
    strategy: 'write-through'
  },
  fundamentals: {
    ttl: 3600, // 1 hour for fundamental data
    strategy: 'write-behind'
  },
  historical: {
    ttl: 86400, // 24 hours for historical data
    strategy: 'cache-aside'
  },
  profiles: {
    ttl: 604800, // 7 days for company profiles
    strategy: 'write-through'
  }
};
```

### 3. Request Prioritization

```typescript
interface APICall {
  priority: 'critical' | 'high' | 'medium' | 'low';
  estimatedCost: number;
  symbols: string[];
  endpoint: string;
}

// Critical: User-initiated requests
// High: Dashboard data, watchlist updates
// Medium: Background refreshes
// Low: Prefetch operations
```

### 4. Market Hours Optimization

```typescript
const isMarketHours = (): boolean => {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  
  // Monday-Friday, 9:30 AM - 4:00 PM EST
  return day >= 1 && day <= 5 && hour >= 9.5 && hour < 16;
};

// Adjust request frequency based on market hours
const getRefreshInterval = (dataType: string): number => {
  const baseIntervals = {
    quotes: isMarketHours() ? 60000 : 300000,     // 1min vs 5min
    fundamentals: 3600000,                        // 1 hour
    historical: 86400000                          // 24 hours
  };
  
  return baseIntervals[dataType] || 300000;
};
```

## Usage Examples

### Basic Quote Request

```typescript
import { apiOptimizer } from './services/api-optimizer';

// Single symbol
const quote = await apiOptimizer.addRequest(
  '/quote',
  'AAPL',
  'high'
);

// Multiple symbols (automatically batched)
const quotes = await apiOptimizer.addRequest(
  '/quote',
  ['AAPL', 'GOOGL', 'MSFT'],
  'medium'
);
```

### Fundamental Data Request

```typescript
// Request company fundamentals
const fundamentals = await apiOptimizer.addRequest(
  '/fundamentals',
  'AAPL',
  'medium'
);

// This will automatically:
// 1. Check cache first
// 2. Select optimal provider (likely FMP)
// 3. Fall back to Alpha Vantage if FMP quota exceeded
// 4. Cache the result for 1 hour
```

### Scheduled Bulk Updates

```typescript
// Schedule popular stock updates
const popularSymbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN'];

apiOptimizer.schedulePopularStockUpdates(popularSymbols);

// This will:
// 1. Batch symbols into optimal request sizes
// 2. Spread requests over time to avoid rate limits
// 3. Adjust frequency based on market hours
```

### Real-time WebSocket Integration

```typescript
// For high-frequency data (when available)
import { WebSocketManager } from './services/websocket-manager';

const wsManager = new WebSocketManager();

// Subscribe to real-time quotes
wsManager.subscribe('quotes', ['AAPL', 'GOOGL'], (data) => {
  console.log('Real-time quote:', data);
});

// Fallback to polling if WebSocket fails
wsManager.onError(() => {
  console.log('WebSocket failed, falling back to polling');
  // Automatically switches to REST API polling
});
```

## Monitoring & Analytics

### Usage Statistics

```typescript
// Get real-time usage statistics
const stats = apiOptimizer.getStats();

console.log(stats);
// Output:
{
  totalRequests: 1250,
  batchedRequests: 890,
  deduplicatedRequests: 45,
  apiCallsSaved: 234,
  avgBatchSize: 3.2,
  costSavings: 187.2,
  quotaUsage: [
    { provider: 'fmp', usage: 180, limit: 250 },
    { provider: 'finnhub', usage: 450, limit: 3600 },
    // ...
  ]
}
```

### Daily Quota Prediction

```typescript
// Predict if you'll exceed daily quotas
const prediction = apiOptimizer.predictDailyQuotaUsage();

console.log(prediction);
// Output:
{
  current: 145,
  predicted: 298,
  riskLevel: 'medium'
}
```

### Performance Metrics

```typescript
// Track API performance across providers
const metrics = await apiUsageTracker.getMetricsSummary('day');

console.log(metrics);
// Output:
{
  totalRequests: 1500,
  successfulRequests: 1456,
  errorRequests: 44,
  averageResponseTime: 285,
  uniqueUsers: 23,
  topSubscriptionTier: 'free',
  dataProviderUsage: {
    'fmp': 650,
    'finnhub': 580,
    'twelve-data': 270
  }
}
```

## Security Considerations

### API Key Management

```typescript
// Secure API key configuration
const API_KEYS = {
  // Server-side only (never exposed to client)
  FMP_API_KEY: process.env.FMP_API_KEY,
  ALPHA_VANTAGE_API_KEY: process.env.ALPHA_VANTAGE_API_KEY,
  FINNHUB_API_KEY: process.env.FINNHUB_API_KEY,
  TWELVE_DATA_API_KEY: process.env.TWELVE_DATA_API_KEY,
  POLYGON_API_KEY: process.env.POLYGON_API_KEY,
  
  // Client-side (only public keys)
  VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY
};
```

### Request Validation

```typescript
// Input sanitization and validation
import { z } from 'zod';

const QuoteRequestSchema = z.object({
  symbols: z.array(z.string().regex(/^[A-Z]{1,5}$/)).max(50),
  fields: z.array(z.string()).optional(),
  interval: z.enum(['1min', '5min', '15min', '30min', '1hour', '1day']).optional()
});

// Validate all incoming requests
app.post('/api/quotes', async (req, res) => {
  try {
    const validated = QuoteRequestSchema.parse(req.body);
    // Process validated request...
  } catch (error) {
    res.status(400).json({ error: 'Invalid request format' });
  }
});
```

### Rate Limiting Protection

```typescript
// Protect against abuse
import rateLimit from 'express-rate-limit';

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: (req) => {
    // Different limits based on subscription tier
    const tier = req.user?.subscriptionTier || 'free';
    const limits = { free: 100, pro: 1000, premium: 5000 };
    return limits[tier];
  },
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', apiLimiter);
```

## Error Handling

### Comprehensive Error Recovery

```typescript
class APIErrorHandler {
  async handleProviderError(
    error: any,
    provider: string,
    endpoint: string,
    symbols: string[]
  ): Promise<any> {
    
    // Log error for monitoring
    console.error(`Provider ${provider} error:`, error);
    
    // Determine error type
    const errorType = this.classifyError(error);
    
    switch (errorType) {
      case 'RATE_LIMIT_EXCEEDED':
        // Switch to fallback provider
        return this.switchToFallbackProvider(endpoint, symbols);
        
      case 'QUOTA_EXCEEDED':
        // Mark provider as temporarily unavailable
        this.markProviderUnavailable(provider, 3600000); // 1 hour
        return this.retryWithDifferentProvider(endpoint, symbols);
        
      case 'INVALID_SYMBOL':
        // Return specific error for invalid symbols
        return { error: 'Invalid symbol', symbols };
        
      case 'NETWORK_ERROR':
        // Retry with exponential backoff
        return this.retryWithBackoff(provider, endpoint, symbols);
        
      case 'API_KEY_INVALID':
        // Disable provider and alert administrators
        this.disableProvider(provider);
        this.alertAdministrators(`Invalid API key for ${provider}`);
        return this.retryWithDifferentProvider(endpoint, symbols);
        
      default:
        // Generic error handling
        return this.handleGenericError(error, provider, endpoint, symbols);
    }
  }
  
  private classifyError(error: any): string {
    const message = error.message?.toLowerCase() || '';
    const status = error.status || error.statusCode;
    
    if (status === 429) return 'RATE_LIMIT_EXCEEDED';
    if (status === 403 && message.includes('quota')) return 'QUOTA_EXCEEDED';
    if (status === 401) return 'API_KEY_INVALID';
    if (status === 404 && message.includes('symbol')) return 'INVALID_SYMBOL';
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') return 'NETWORK_ERROR';
    
    return 'UNKNOWN_ERROR';
  }
}
```

### Circuit Breaker Pattern

```typescript
class CircuitBreaker {
  private failures = new Map<string, number>();
  private lastFailure = new Map<string, number>();
  private readonly threshold = 5; // failures
  private readonly timeout = 60000; // 1 minute
  
  async call<T>(
    provider: string,
    operation: () => Promise<T>
  ): Promise<T> {
    
    // Check if circuit is open
    if (this.isCircuitOpen(provider)) {
      throw new Error(`Circuit breaker open for ${provider}`);
    }
    
    try {
      const result = await operation();
      this.onSuccess(provider);
      return result;
    } catch (error) {
      this.onFailure(provider);
      throw error;
    }
  }
  
  private isCircuitOpen(provider: string): boolean {
    const failures = this.failures.get(provider) || 0;
    const lastFailure = this.lastFailure.get(provider) || 0;
    
    if (failures >= this.threshold) {
      const timeSinceLastFailure = Date.now() - lastFailure;
      return timeSinceLastFailure < this.timeout;
    }
    
    return false;
  }
}
```

## Performance Tuning

### Connection Pooling

```typescript
// HTTP Agent configuration for connection reuse
import https from 'https';

const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 30000,
  freeSocketTimeout: 30000
});

// Use with fetch
const response = await fetch(url, {
  agent: httpsAgent,
  timeout: 30000
});
```

### Response Compression

```typescript
// Enable compression for API responses
import compression from 'compression';

app.use(compression({
  filter: (req, res) => {
    // Don't compress small responses
    const contentLength = res.get('content-length');
    if (contentLength && parseInt(contentLength) < 1024) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6, // Balanced compression
  threshold: 1024 // Only compress responses > 1KB
}));
```

### Memory Management

```typescript
// Efficient data structures for large datasets
class OptimizedCache {
  private cache = new Map<string, {
    data: any;
    timestamp: number;
    hits: number;
    size: number;
  }>();
  
  private maxMemory = 50 * 1024 * 1024; // 50MB
  private currentMemory = 0;
  
  set(key: string, value: any, ttl: number): void {
    const size = this.calculateSize(value);
    
    // Evict old entries if memory limit would be exceeded
    if (this.currentMemory + size > this.maxMemory) {
      this.evictLRU(size);
    }
    
    this.cache.set(key, {
      data: value,
      timestamp: Date.now() + ttl,
      hits: 0,
      size
    });
    
    this.currentMemory += size;
  }
  
  private evictLRU(requiredSpace: number): void {
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => {
        // Sort by hits (LFU) then by timestamp (LRU)
        if (a[1].hits !== b[1].hits) {
          return a[1].hits - b[1].hits;
        }
        return a[1].timestamp - b[1].timestamp;
      });
    
    let freedSpace = 0;
    for (const [key, entry] of entries) {
      if (freedSpace >= requiredSpace) break;
      
      this.cache.delete(key);
      this.currentMemory -= entry.size;
      freedSpace += entry.size;
    }
  }
}
```

### Database Optimization

```typescript
// Optimized database queries for metrics storage
const storeMetricsBatch = async (metrics: APIMetrics[]): Promise<void> => {
  const query = `
    INSERT INTO api_metrics (
      endpoint, method, status_code, response_time, 
      timestamp, user_id, provider, bytes_transferred
    ) VALUES ${metrics.map(() => '(?, ?, ?, ?, ?, ?, ?, ?)').join(', ')}
  `;
  
  const values = metrics.flatMap(m => [
    m.endpoint, m.method, m.statusCode, m.responseTime,
    m.timestamp, m.userId, m.dataProvider, m.bytesTransferred
  ]);
  
  await db.query(query, values);
};
```

---

## Summary

The Alfalyzer API provider system is designed for reliability, efficiency, and cost optimization. Key features include:

- **Multi-provider fallback chains** ensure data availability
- **Intelligent request batching** minimizes API calls
- **Advanced caching strategies** reduce redundant requests
- **Real-time quota tracking** prevents limit violations
- **Circuit breaker patterns** handle provider failures gracefully
- **Comprehensive monitoring** provides insights into usage patterns

This architecture enables the platform to serve financial data reliably while staying within free tier limits of multiple API providers.

---

*Last updated: July 8, 2025*
*Alfalyzer Financial Data Platform*