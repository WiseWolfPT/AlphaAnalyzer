# Finnhub API Integration for Alfalyzer

This document provides comprehensive examples and patterns for integrating the Finnhub API into the Alfalyzer project using TypeScript/Node.js.

## 📋 Table of Contents

- [Overview](#overview)
- [Setup & Authentication](#setup--authentication)
- [WebSocket Real-time Data](#websocket-real-time-data)
- [Rate Limiting](#rate-limiting)
- [Error Handling](#error-handling)
- [TypeScript Types](#typescript-types)
- [Advanced Features](#advanced-features)
- [Best Practices](#best-practices)

## 🚀 Overview

The Finnhub API provides institutional-grade financial data including:
- Real-time stock prices
- Company profiles and fundamentals
- News and sentiment analysis
- Technical indicators
- Earnings data
- Cryptocurrency and forex data

## 🔐 Setup & Authentication

### Installation

```bash
npm install finnhub ws limiter node-cache p-queue
npm install -D @types/ws @types/node
```

### Basic Client Setup

```typescript
import finnhub from 'finnhub';

// Initialize client with API key
const api_key = finnhub.ApiClient.instance.authentications['api_key'];
api_key.apiKey = process.env.FINNHUB_API_KEY;
const finnhubClient = new finnhub.DefaultApi();
```

### Type-Safe Client

```typescript
import { TypedFinnhubClient } from './finnhub-integration-examples';

const client = new TypedFinnhubClient(process.env.FINNHUB_API_KEY!);

// Get company profile with proper typing
const profile = await client.getCompanyProfile('AAPL');
console.log(profile.name); // TypeScript knows this is a string
```

## 🌐 WebSocket Real-time Data

### Basic WebSocket Connection

```typescript
import { EnhancedFinnhubWebSocket } from './finnhub-advanced-examples';

const ws = new EnhancedFinnhubWebSocket(process.env.FINNHUB_API_KEY!);

// Set up event listeners
ws.on('connected', () => {
  console.log('Connected to Finnhub WebSocket');
  ws.subscribe(['AAPL', 'MSFT', 'GOOGL']);
});

ws.on('trade', (trade) => {
  console.log(`${trade.symbol}: $${trade.price} (${trade.volume} shares)`);
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});

// Connect
await ws.connect();
```

### WebSocket Features

- **Auto-reconnection** with exponential backoff
- **Circuit breaker** pattern for resilience
- **Event-driven architecture** with TypeScript events
- **Subscription management** with state tracking
- **Ping/pong** for connection health monitoring

## ⚡ Rate Limiting

### Free Tier Limits
- 60 API calls per minute
- 50,000 API calls per month

### Rate-Limited Client

```typescript
import { FinnhubRateLimitedClient } from './finnhub-integration-examples';

const client = new FinnhubRateLimitedClient(process.env.FINNHUB_API_KEY!);

// Automatically handles rate limiting
const quotes = await client.getBatchQuotes(['AAPL', 'MSFT', 'GOOGL']);
```

### Caching Strategy

```typescript
import { CachedFinnhubClient } from './finnhub-advanced-examples';

const client = new CachedFinnhubClient(process.env.FINNHUB_API_KEY!, 300); // 5 min cache

// Subsequent calls within 5 minutes return cached data
const profile1 = await client.getCompanyProfile('AAPL'); // API call
const profile2 = await client.getCompanyProfile('AAPL'); // Cached
```

## 🛡️ Error Handling

### Comprehensive Error Handling

```typescript
import { FinnhubClientWithErrorHandling, FinnhubErrorHandler } from './finnhub-integration-examples';

const client = new FinnhubClientWithErrorHandling(process.env.FINNHUB_API_KEY!);

try {
  const profile = await client.getCompanyProfile('AAPL');
} catch (error) {
  const finnhubError = FinnhubErrorHandler.handleError(error);
  
  if (FinnhubErrorHandler.isRateLimitError(finnhubError)) {
    console.log('Rate limit exceeded, implement backoff');
  } else if (FinnhubErrorHandler.isAuthenticationError(finnhubError)) {
    console.log('Invalid API key');
  }
}
```

### Resilient Client with Fallback

```typescript
import { ResilientFinnhubClient } from './finnhub-advanced-examples';

const client = new ResilientFinnhubClient(
  process.env.FINNHUB_PRIMARY_KEY!,
  process.env.FINNHUB_FALLBACK_KEY // Optional fallback
);

// Automatically switches to fallback on primary failure
const data = await client.executeWithFallback(client => 
  client.getCompanyProfile('AAPL')
);
```

## 📝 TypeScript Types

### Complete Type Definitions

```typescript
import { FinnhubAPI } from './finnhub-types';

// Strongly typed data structures
const quote: FinnhubAPI.Quote = {
  c: 150.25,  // Current price
  d: 1.50,    // Change
  dp: 1.01,   // Percent change
  h: 151.00,  // High
  l: 149.50,  // Low
  o: 149.75,  // Open
  pc: 148.75, // Previous close
  t: 1640995200 // Timestamp
};

// Type guards for runtime validation
import { FinnhubTypeGuards } from './finnhub-types';

if (FinnhubTypeGuards.isQuote(data)) {
  console.log(`Current price: $${data.c}`);
}
```

### Key Interfaces

- `CompanyProfile` - Company information
- `Quote` - Current stock price data
- `Candle` - OHLCV candlestick data
- `NewsArticle` - News articles
- `WebSocketTrade` - Real-time trade data
- `TechnicalIndicator` - Technical analysis data

## 🔧 Advanced Features

### Batch Operations

```typescript
import { BatchFinnhubClient } from './finnhub-advanced-examples';

const client = new BatchFinnhubClient(process.env.FINNHUB_API_KEY!, 5); // 5 concurrent requests

const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'];
const quotes = await client.batchGetQuotes(symbols);

quotes.forEach((quote, symbol) => {
  console.log(`${symbol}: $${quote.c}`);
});
```

### Technical Analysis

```typescript
import { TechnicalAnalysisService } from './finnhub-advanced-examples';

const ta = new TechnicalAnalysisService(process.env.FINNHUB_API_KEY!);

const indicators = await ta.getMultipleIndicators(
  'AAPL',
  'D',
  Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60, // 30 days ago
  Math.floor(Date.now() / 1000),
  ['rsi', 'macd', 'sma', 'ema']
);

const supportResistance = await ta.getSupportResistanceLevels('AAPL', 'D');
```

### Complete Stock Analysis

```typescript
import { AlfalyzerFinnhubService } from './finnhub-integration-examples';

const service = new AlfalyzerFinnhubService(process.env.FINNHUB_API_KEY!);

// Get comprehensive analysis
const analysis = await service.getStockAnalysis('AAPL');
console.log({
  company: analysis.profile.name,
  price: analysis.quote.c,
  change: analysis.quote.dp,
  newsCount: analysis.news.length
});

// Start real-time monitoring
service.startRealTimeMonitoring(['AAPL', 'MSFT']);
```

## 🎯 Best Practices

### 1. Environment Variables
```bash
# .env file
FINNHUB_API_KEY=your_api_key_here
FINNHUB_FALLBACK_KEY=fallback_key_here
```

### 2. Connection Management
- Use connection pooling for REST API calls
- Implement proper WebSocket reconnection logic
- Monitor connection health with ping/pong

### 3. Data Validation
```typescript
import { FinnhubTypeGuards } from './finnhub-types';

function processQuote(data: unknown) {
  if (FinnhubTypeGuards.isQuote(data)) {
    // Safe to use data.c, data.pc, etc.
    return data.c;
  }
  throw new Error('Invalid quote data');
}
```

### 4. Caching Strategy
- Cache company profiles (changes infrequently)
- Cache news for 5-10 minutes
- Cache quotes for 10-30 seconds
- Don't cache real-time trade data

### 5. Error Recovery
```typescript
// Implement exponential backoff
const retryWithBackoff = async (fn: () => Promise<any>, attempts = 3) => {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === attempts - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
};
```

### 6. Resource Cleanup
```typescript
// Always clean up WebSocket connections
process.on('SIGINT', () => {
  service.stopRealTimeMonitoring();
  process.exit(0);
});
```

## 📊 Rate Limits by Plan

| Plan | API Calls/Min | API Calls/Month | WebSocket |
|------|---------------|-----------------|-----------|
| Free | 60 | 50,000 | 1 connection |
| Starter | 300 | 1,000,000 | 5 connections |
| Developer | 600 | 5,000,000 | 10 connections |

## 🔗 Useful Endpoints

### Essential Endpoints
- `/quote` - Real-time quotes
- `/profile` - Company profiles
- `/news` - Company news
- `/candle` - Historical price data
- `/financials` - Financial statements
- `/recommendation` - Analyst recommendations

### Real-time Data
- WebSocket `/trade` - Real-time trades
- WebSocket `/news` - Real-time news

### Technical Analysis
- `/indicator` - Technical indicators
- `/support-resistance` - Support/resistance levels
- `/pattern` - Pattern recognition

## 🚨 Common Pitfalls

1. **Rate Limiting**: Always implement proper rate limiting
2. **WebSocket Reconnection**: Don't forget to handle disconnections
3. **API Key Security**: Never commit API keys to version control
4. **Error Handling**: Always handle API errors gracefully
5. **Data Validation**: Validate API responses before using them
6. **Memory Leaks**: Clean up event listeners and connections

## 📚 Resources

- [Finnhub API Documentation](https://finnhub.io/docs/api)
- [Finnhub JavaScript SDK](https://github.com/finnhub-stock-api/finnhub-js)
- [WebSocket API Guide](https://finnhub.io/docs/api/websocket-trades)
- [Rate Limiting Guide](https://finnhub.io/docs/api/rate-limiting)

## 🤝 Integration with Alfalyzer

The provided code examples are ready to integrate into your Alfalyzer project:

1. Copy the TypeScript files to your project
2. Install the required dependencies
3. Set up environment variables
4. Import and use the services in your application

```typescript
// In your Alfalyzer service
import { AlfalyzerFinnhubService } from './finnhub-integration-examples';

export class AlfalyzerService {
  private finnhub: AlfalyzerFinnhubService;

  constructor() {
    this.finnhub = new AlfalyzerFinnhubService(process.env.FINNHUB_API_KEY!);
  }

  async analyzeStock(symbol: string) {
    return await this.finnhub.getStockAnalysis(symbol);
  }
}
```