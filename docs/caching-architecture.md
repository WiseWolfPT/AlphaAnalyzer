# Ultra-Efficient Caching Architecture for Alfalyzer

## Executive Summary

This architecture enables serving 100+ concurrent users with <500 API calls/day through intelligent multi-tier caching, predictive pre-fetching, and collaborative data sharing.

## Core Design Principles

1. **Leader-Follower Pattern**: First user triggers update, all others benefit
2. **Predictive Pre-warming**: Popular stocks cached before users request
3. **Time-Based Intelligence**: Different strategies for market hours vs after-hours
4. **Progressive Loading**: Critical data first, detailed data on-demand
5. **Shared Data Pool**: All users share the same cached data

## Cache Tier Architecture

### 1. Browser Cache (L1)
- **Storage**: IndexedDB + LocalStorage + Memory
- **Size**: 50MB per user
- **TTL**: Variable by data type
- **Hit Rate Target**: 40-50%

### 2. CDN Cache (L2) 
- **Storage**: Cloudflare Workers KV
- **Size**: Unlimited
- **TTL**: 1 minute (quotes), 24 hours (fundamentals)
- **Hit Rate Target**: 30-40%

### 3. Server Memory Cache (L3)
- **Storage**: Node.js Memory + Redis
- **Size**: 2GB RAM
- **TTL**: Real-time synced
- **Hit Rate Target**: 15-20%

### 4. Database Cache (L4)
- **Storage**: PostgreSQL + Materialized Views
- **Size**: 10GB
- **TTL**: Daily refresh
- **Hit Rate Target**: 5-10%

## Data Type Specific Strategies

### 1. Real-Time Quotes
```typescript
{
  marketHours: {
    ttl: 60_000, // 1 minute
    staleWhileRevalidate: 30_000, // 30 seconds
    backgroundRefresh: true,
    batchSize: 50 // Batch multiple symbols
  },
  afterHours: {
    ttl: 900_000, // 15 minutes
    staleWhileRevalidate: 300_000, // 5 minutes
    backgroundRefresh: false
  }
}
```

### 2. Fundamental Metrics
```typescript
{
  ttl: 86_400_000, // 24 hours
  refreshWindow: '02:00-04:00 EST', // Off-peak refresh
  compressionEnabled: true,
  sharedAcrossUsers: true
}
```

### 3. Advanced Charts
```typescript
{
  daily: {
    ttl: 86_400_000, // 24 hours
    precomputed: true,
    formats: ['1D', '1W', '1M', '3M', '6M', '1Y', '5Y']
  },
  intraday: {
    ttl: 300_000, // 5 minutes during market hours
    aggregationLevels: ['1min', '5min', '15min', '30min', '1h']
  }
}
```

## API Call Optimization Strategy

### Daily API Budget (500 calls total)
- **Popular Stocks (Top 20)**: 200 calls
  - 10 updates/day × 20 stocks
- **User-Requested Stocks**: 200 calls
  - Deduplicated across all users
- **Fundamentals Updates**: 50 calls
  - Daily batch update
- **Emergency Buffer**: 50 calls
  - Rate limit recovery

### Request Deduplication
```typescript
class RequestDeduplicator {
  private pending = new Map<string, Promise<any>>();
  
  async request(key: string, fetcher: () => Promise<any>) {
    // If request in-flight, return existing promise
    if (this.pending.has(key)) {
      return this.pending.get(key);
    }
    
    // Create new request
    const promise = fetcher()
      .finally(() => this.pending.delete(key));
    
    this.pending.set(key, promise);
    return promise;
  }
}
```

## Popular Stock Algorithm

### Popularity Scoring
```typescript
interface PopularityScore {
  symbol: string;
  score: number; // 0-100
  factors: {
    recentViews: number;      // 40% weight
    uniqueUsers: number;      // 30% weight
    searchFrequency: number;  // 20% weight
    newsActivity: number;     // 10% weight
  };
}

// Update popularity every 15 minutes
const updatePopularStocks = () => {
  const scores = calculatePopularityScores();
  const top20 = scores.slice(0, 20);
  
  // Pre-warm cache for popular stocks
  top20.forEach(stock => {
    cacheWarmer.warmStock(stock.symbol);
  });
};
```

## Cache Key Structure

### Hierarchical Key Design
```
cache:{version}:{dataType}:{symbol}:{timeframe}:{field}

Examples:
- cache:v1:quote:AAPL:realtime:price
- cache:v1:fundamentals:MSFT:daily:revenue
- cache:v1:chart:GOOGL:1D:ohlcv
- cache:v1:news:TSLA:latest:headlines
```

### Key Benefits:
- Efficient wildcard invalidation
- Version-based migrations
- Granular TTL control
- Easy monitoring

## Background Refresh Strategy

### Market Hours (9:30 AM - 4:00 PM EST)
```typescript
const marketHoursSchedule = {
  popularStocks: {
    interval: 60_000, // Every minute
    symbols: getTop20Stocks(),
    priority: 'high'
  },
  activeStocks: {
    interval: 120_000, // Every 2 minutes
    symbols: getRecentlyViewed(),
    priority: 'medium'
  },
  watchlistStocks: {
    interval: 300_000, // Every 5 minutes
    symbols: getAllWatchlistStocks(),
    priority: 'low'
  }
};
```

### After Hours
```typescript
const afterHoursSchedule = {
  allCachedStocks: {
    interval: 1_800_000, // Every 30 minutes
    batchSize: 50,
    priority: 'low'
  }
};
```

## Cache Storage Requirements

### Memory Requirements (2GB Total)
- **Hot Data (Quotes)**: 500MB
  - 1000 symbols × 500KB each
- **Warm Data (Charts)**: 1GB
  - 200 symbols × 5MB each
- **Cold Data (Fundamentals)**: 500MB
  - 500 symbols × 1MB each

### Disk Requirements (10GB Total)
- **Historical Data**: 5GB
- **Fundamentals Archive**: 3GB
- **News & Sentiment**: 1GB
- **User Preferences**: 1GB

## Implementation Architecture

### 1. Redis Data Structures
```typescript
// Sorted Sets for popularity tracking
ZADD popular:stocks {timestamp} "AAPL"

// Hashes for quote data
HSET quote:AAPL price "150.25" volume "75000000"

// Lists for historical data
LPUSH history:AAPL:1D "{...ohlcv data...}"

// Pub/Sub for real-time updates
PUBLISH updates:quotes "AAPL:150.25"
```

### 2. Cache Warming Service
```typescript
class CacheWarmer {
  private queue = new PriorityQueue<WarmingTask>();
  
  async warmPopularStocks() {
    const popular = await getPopularStocks();
    
    // Batch API calls
    const batchSize = 10;
    for (let i = 0; i < popular.length; i += batchSize) {
      const batch = popular.slice(i, i + batchSize);
      await this.warmBatch(batch);
      
      // Rate limit protection
      await sleep(1000);
    }
  }
  
  private async warmBatch(symbols: string[]) {
    const promises = symbols.map(symbol => 
      this.warmSingleStock(symbol)
    );
    
    await Promise.allSettled(promises);
  }
}
```

### 3. Stale-While-Revalidate Implementation
```typescript
class SWRCache {
  async get(key: string, fetcher: () => Promise<any>) {
    const cached = await redis.get(key);
    
    if (!cached) {
      // Cache miss - fetch and return
      return this.fetchAndCache(key, fetcher);
    }
    
    const { data, expiry, staleTime } = JSON.parse(cached);
    const now = Date.now();
    
    if (now < staleTime) {
      // Fresh - return immediately
      return data;
    }
    
    if (now < expiry) {
      // Stale but valid - return and refresh in background
      this.backgroundRefresh(key, fetcher);
      return data;
    }
    
    // Expired - fetch new data
    return this.fetchAndCache(key, fetcher);
  }
}
```

## Monitoring & Alerting

### Key Metrics
```typescript
interface CacheMetrics {
  hitRate: number;           // Target: >95%
  apiCallsPerDay: number;    // Target: <500
  avgResponseTime: number;   // Target: <100ms
  cacheSize: number;         // Monitor growth
  errorRate: number;         // Target: <0.1%
}

// Real-time dashboard
const dashboard = {
  updateInterval: 5000,
  metrics: [
    'Cache Hit Rate by Tier',
    'API Calls by Provider',
    'Popular Stocks Heatmap',
    'Response Time Distribution',
    'Cache Memory Usage'
  ]
};
```

## Cost Analysis

### API Costs (Per Month)
- **Free Tier Usage**: $0
  - 500 calls/day × 30 days = 15,000 calls
  - Well within all provider limits

### Infrastructure Costs
- **Redis**: $0 (self-hosted)
- **CDN**: $0 (Cloudflare free tier)
- **Server**: Existing infrastructure
- **Storage**: Minimal incremental cost

### Scaling Projections
- **100 users**: 95% cache hit rate = 500 API calls/day
- **500 users**: 97% cache hit rate = 2,500 API calls/day
- **1000 users**: 98% cache hit rate = 5,000 API calls/day

## Performance Guarantees

### User Experience Targets
- **Quote Load Time**: <100ms (cached), <500ms (fresh)
- **Chart Render Time**: <200ms
- **Page Load Time**: <1 second
- **Data Freshness**: 
  - Quotes: Max 1 minute old during market hours
  - Fundamentals: Max 24 hours old
  - Charts: Max 5 minutes old (intraday)

### Availability Targets
- **Cache Availability**: 99.9%
- **API Fallback**: Automatic with graceful degradation
- **Data Consistency**: Eventually consistent within 1 minute

## Security Considerations

### Cache Security
- Encrypted at rest (Redis AUTH)
- No sensitive user data in shared cache
- API keys rotated monthly
- Rate limiting per IP

### Data Validation
- Schema validation on cache write
- Checksum verification
- Timestamp validation
- Anomaly detection for price data