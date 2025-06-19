# Twelve Data API TypeScript/JavaScript Guide

A comprehensive guide for integrating Twelve Data API with TypeScript/JavaScript applications, focusing on authentication, real-time WebSocket connections, historical data fetching, and optimization strategies for the free tier.

## Table of Contents
1. [Installation & Setup](#installation--setup)
2. [Authentication & API Key Management](#authentication--api-key-management)
3. [Basic API Client Setup](#basic-api-client-setup)
4. [Historical Data Fetching](#historical-data-fetching)
5. [Real-time WebSocket Connections](#real-time-websocket-connections)
6. [Batch Requests for Efficiency](#batch-requests-for-efficiency)
7. [Free Tier Optimization (800 calls/day)](#free-tier-optimization-800-callsday)
8. [Credit System Management](#credit-system-management)
9. [Error Handling & Best Practices](#error-handling--best-practices)
10. [TypeScript Types & Interfaces](#typescript-types--interfaces)

## Installation & Setup

### Using the Official JavaScript SDK

```bash
npm install twelvedata
```

### For WebSocket Support (Node.js)

```bash
npm install ws @types/ws
```

### Environment Setup

Create a `.env` file for your API key:

```env
TWELVE_DATA_API_KEY=your_api_key_here
```

## Authentication & API Key Management

### Basic Authentication Setup

```typescript
// config/twelvedata.ts
interface TwelveDataConfig {
  key: string;
  baseUrl?: string;
}

const config: TwelveDataConfig = {
  key: process.env.TWELVE_DATA_API_KEY || '',
  baseUrl: 'https://api.twelvedata.com'
};

export default config;
```

### TypeScript Client Initialization

```typescript
// Using the official SDK
import twelvedata from 'twelvedata';
import config from './config/twelvedata';

const client = twelvedata(config);

// Using fetch API directly
class TwelveDataClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl: string = 'https://api.twelvedata.com') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  private async makeRequest(endpoint: string, params: Record<string, any> = {}): Promise<any> {
    const url = new URL(`${this.baseUrl}/${endpoint}`);
    url.searchParams.append('apikey', this.apiKey);
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value.toString());
      }
    });

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
}
```

## Basic API Client Setup

### Complete TypeScript Client Implementation

```typescript
// client/TwelveDataClient.ts
export interface TimeSeriesParams {
  symbol: string;
  interval: '1min' | '5min' | '15min' | '30min' | '45min' | '1h' | '2h' | '4h' | '1day' | '1week' | '1month';
  outputsize?: number;
  start_date?: string;
  end_date?: string;
  timezone?: string;
  order?: 'asc' | 'desc';
  format?: 'json' | 'csv';
}

export interface QuoteParams {
  symbol: string;
  interval?: string;
  exchange?: string;
}

export interface BatchTimeSeriesParams {
  symbols: string[];
  interval: string;
  outputsize?: number;
  start_date?: string;
  end_date?: string;
}

export class TwelveDataClient {
  private apiKey: string;
  private baseUrl: string = 'https://api.twelvedata.com';
  private requestCount: number = 0;
  private lastResetTime: number = Date.now();

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  // Rate limit tracking
  private trackRequest(): void {
    const now = Date.now();
    const timeSinceReset = now - this.lastResetTime;
    
    // Reset counter every minute (60000ms)
    if (timeSinceReset >= 60000) {
      this.requestCount = 0;
      this.lastResetTime = now;
    }
    
    this.requestCount++;
  }

  private async makeRequest(endpoint: string, params: Record<string, any> = {}): Promise<any> {
    this.trackRequest();
    
    const url = new URL(`${this.baseUrl}/${endpoint}`);
    url.searchParams.append('apikey', this.apiKey);
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, Array.isArray(value) ? value.join(',') : value.toString());
      }
    });

    try {
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`API request failed: ${response.status} - ${errorData}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Request Error:', error);
      throw error;
    }
  }

  // Time Series Data
  async getTimeSeries(params: TimeSeriesParams): Promise<any> {
    return this.makeRequest('time_series', params);
  }

  // Real-time Quote
  async getQuote(params: QuoteParams): Promise<any> {
    return this.makeRequest('quote', params);
  }

  // Batch Time Series (up to 120 symbols)
  async getBatchTimeSeries(params: BatchTimeSeriesParams): Promise<any> {
    if (params.symbols.length > 120) {
      throw new Error('Maximum 120 symbols allowed per batch request');
    }

    return this.makeRequest('time_series', {
      symbol: params.symbols.join(','),
      interval: params.interval,
      outputsize: params.outputsize,
      start_date: params.start_date,
      end_date: params.end_date
    });
  }

  // API Usage Statistics
  async getApiUsage(): Promise<any> {
    return this.makeRequest('api_usage');
  }

  // Get current request count (for monitoring)
  getCurrentRequestCount(): number {
    return this.requestCount;
  }
}
```

## Historical Data Fetching

### Single Symbol Historical Data

```typescript
// services/HistoricalDataService.ts
import { TwelveDataClient, TimeSeriesParams } from '../client/TwelveDataClient';

export class HistoricalDataService {
  private client: TwelveDataClient;

  constructor(client: TwelveDataClient) {
    this.client = client;
  }

  async getHistoricalData(
    symbol: string, 
    interval: string, 
    days: number = 30
  ): Promise<any> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const params: TimeSeriesParams = {
      symbol,
      interval,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      order: 'desc'
    };

    try {
      const data = await this.client.getTimeSeries(params);
      return this.processHistoricalData(data);
    } catch (error) {
      console.error(`Error fetching historical data for ${symbol}:`, error);
      throw error;
    }
  }

  private processHistoricalData(data: any): any {
    if (data.status === 'error') {
      throw new Error(data.message || 'API returned error status');
    }

    return {
      meta: data.meta,
      values: data.values || [],
      processedAt: new Date().toISOString()
    };
  }

  // Optimized method for multiple symbols using batch requests
  async getMultipleHistoricalData(
    symbols: string[], 
    interval: string, 
    days: number = 30
  ): Promise<Record<string, any>> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    // Split into batches of 120 symbols (API limit)
    const batches = this.chunkArray(symbols, 120);
    const results: Record<string, any> = {};

    for (const batch of batches) {
      try {
        const batchData = await this.client.getBatchTimeSeries({
          symbols: batch,
          interval,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0]
        });

        // Process batch results
        Object.entries(batchData).forEach(([symbol, data]) => {
          results[symbol] = this.processHistoricalData(data);
        });

        // Rate limiting: wait between batches
        if (batches.length > 1) {
          await this.delay(1000); // 1 second delay between batches
        }
      } catch (error) {
        console.error(`Error fetching batch data:`, error);
        // Continue with next batch instead of failing completely
      }
    }

    return results;
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

## Real-time WebSocket Connections

### WebSocket Client Implementation

```typescript
// websocket/TwelveDataWebSocket.ts
import WebSocket from 'ws';

export interface WebSocketMessage {
  event: 'price' | 'subscribe' | 'unsubscribe' | 'heartbeat';
  symbol?: string;
  price?: number;
  timestamp?: number;
  volume?: number;
}

export interface WebSocketConfig {
  apiKey: string;
  reconnectInterval?: number;
  heartbeatInterval?: number;
}

export class TwelveDataWebSocket {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private subscribedSymbols: Set<string> = new Set();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private shouldReconnect: boolean = true;
  private connectionRetries: number = 0;
  private maxRetries: number = 5;

  // Event handlers
  private onMessageHandler: ((message: WebSocketMessage) => void) | null = null;
  private onConnectHandler: (() => void) | null = null;
  private onDisconnectHandler: (() => void) | null = null;
  private onErrorHandler: ((error: Error) => void) | null = null;

  constructor(config: WebSocketConfig) {
    this.config = {
      reconnectInterval: 5000,
      heartbeatInterval: 30000,
      ...config
    };
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const url = `wss://ws.twelvedata.com/v1/quotes/price?apikey=${this.config.apiKey}`;
        this.ws = new WebSocket(url);

        this.ws.on('open', () => {
          console.log('Connected to Twelve Data WebSocket');
          this.connectionRetries = 0;
          this.startHeartbeat();
          
          // Resubscribe to previously subscribed symbols
          if (this.subscribedSymbols.size > 0) {
            this.subscribeToSymbols(Array.from(this.subscribedSymbols));
          }

          this.onConnectHandler?.();
          resolve();
        });

        this.ws.on('message', (data: Buffer) => {
          try {
            const message: WebSocketMessage = JSON.parse(data.toString());
            this.handleMessage(message);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        });

        this.ws.on('close', (code: number, reason: Buffer) => {
          console.log(`WebSocket disconnected: ${code} - ${reason.toString()}`);
          this.cleanup();
          this.onDisconnectHandler?.();

          if (this.shouldReconnect && this.connectionRetries < this.maxRetries) {
            this.scheduleReconnect();
          }
        });

        this.ws.on('error', (error: Error) => {
          console.error('WebSocket error:', error);
          this.onErrorHandler?.(error);
          
          if (this.connectionRetries === 0) {
            reject(error);
          }
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  private handleMessage(message: WebSocketMessage): void {
    // Handle different message types
    switch (message.event) {
      case 'price':
        // Real-time price update
        this.onMessageHandler?.(message);
        break;
      case 'heartbeat':
        // Heartbeat response
        console.log('Heartbeat received');
        break;
      default:
        console.log('Received message:', message);
        this.onMessageHandler?.(message);
    }
  }

  subscribe(symbols: string | string[]): void {
    const symbolArray = Array.isArray(symbols) ? symbols : [symbols];
    symbolArray.forEach(symbol => this.subscribedSymbols.add(symbol));
    
    if (this.isConnected()) {
      this.subscribeToSymbols(symbolArray);
    }
  }

  unsubscribe(symbols: string | string[]): void {
    const symbolArray = Array.isArray(symbols) ? symbols : [symbols];
    symbolArray.forEach(symbol => this.subscribedSymbols.delete(symbol));
    
    if (this.isConnected()) {
      this.unsubscribeFromSymbols(symbolArray);
    }
  }

  private subscribeToSymbols(symbols: string[]): void {
    const payload = {
      action: 'subscribe',
      params: {
        symbols: symbols.join(',')
      }
    };
    this.send(payload);
  }

  private unsubscribeFromSymbols(symbols: string[]): void {
    const payload = {
      action: 'unsubscribe',
      params: {
        symbols: symbols.join(',')
      }
    };
    this.send(payload);
  }

  private send(data: any): void {
    if (this.isConnected()) {
      this.ws!.send(JSON.stringify(data));
    }
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        this.send({ action: 'heartbeat' });
      }
    }, this.config.heartbeatInterval);
  }

  private scheduleReconnect(): void {
    this.connectionRetries++;
    console.log(`Attempting to reconnect (${this.connectionRetries}/${this.maxRetries}) in ${this.config.reconnectInterval}ms`);
    
    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(error => {
        console.error('Reconnection failed:', error);
      });
    }, this.config.reconnectInterval);
  }

  private cleanup(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // Event listeners
  onMessage(handler: (message: WebSocketMessage) => void): void {
    this.onMessageHandler = handler;
  }

  onConnect(handler: () => void): void {
    this.onConnectHandler = handler;
  }

  onDisconnect(handler: () => void): void {
    this.onDisconnectHandler = handler;
  }

  onError(handler: (error: Error) => void): void {
    this.onErrorHandler = handler;
  }

  disconnect(): void {
    this.shouldReconnect = false;
    this.cleanup();
    this.ws?.close();
  }

  getSubscribedSymbols(): string[] {
    return Array.from(this.subscribedSymbols);
  }

  getConnectionState(): string {
    if (!this.ws) return 'DISCONNECTED';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING: return 'CONNECTING';
      case WebSocket.OPEN: return 'CONNECTED';
      case WebSocket.CLOSING: return 'CLOSING';
      case WebSocket.CLOSED: return 'CLOSED';
      default: return 'UNKNOWN';
    }
  }
}
```

### WebSocket Usage Example

```typescript
// examples/websocket-example.ts
import { TwelveDataWebSocket, WebSocketMessage } from '../websocket/TwelveDataWebSocket';

async function main() {
  const wsClient = new TwelveDataWebSocket({
    apiKey: process.env.TWELVE_DATA_API_KEY!,
    reconnectInterval: 5000,
    heartbeatInterval: 30000
  });

  // Set up event handlers
  wsClient.onMessage((message: WebSocketMessage) => {
    console.log('Price update:', {
      symbol: message.symbol,
      price: message.price,
      timestamp: new Date(message.timestamp! * 1000).toISOString(),
      volume: message.volume
    });
  });

  wsClient.onConnect(() => {
    console.log('WebSocket connected successfully');
  });

  wsClient.onDisconnect(() => {
    console.log('WebSocket disconnected');
  });

  wsClient.onError((error: Error) => {
    console.error('WebSocket error:', error.message);
  });

  try {
    // Connect to WebSocket
    await wsClient.connect();

    // Subscribe to symbols
    wsClient.subscribe(['AAPL', 'MSFT', 'GOOGL', 'EUR/USD', 'BTC/USD']);

    // Keep the process running
    process.on('SIGINT', () => {
      console.log('Disconnecting WebSocket...');
      wsClient.disconnect();
      process.exit(0);
    });

  } catch (error) {
    console.error('Failed to connect:', error);
  }
}

main();
```

## Batch Requests for Efficiency

### Batch Request Service

```typescript
// services/BatchRequestService.ts
import { TwelveDataClient } from '../client/TwelveDataClient';

export interface BatchRequest {
  symbols: string[];
  interval: string;
  outputsize?: number;
  start_date?: string;
  end_date?: string;
}

export class BatchRequestService {
  private client: TwelveDataClient;
  private readonly MAX_SYMBOLS_PER_BATCH = 120;

  constructor(client: TwelveDataClient) {
    this.client = client;
  }

  async processBatchRequest(request: BatchRequest): Promise<Record<string, any>> {
    const { symbols, ...params } = request;
    
    if (symbols.length <= this.MAX_SYMBOLS_PER_BATCH) {
      return this.executeSingleBatch(symbols, params);
    }

    return this.executeMultipleBatches(symbols, params);
  }

  private async executeSingleBatch(symbols: string[], params: any): Promise<Record<string, any>> {
    try {
      const response = await this.client.getBatchTimeSeries({
        symbols,
        ...params
      });

      return this.processBatchResponse(response, symbols);
    } catch (error) {
      console.error('Batch request failed:', error);
      throw error;
    }
  }

  private async executeMultipleBatches(symbols: string[], params: any): Promise<Record<string, any>> {
    const batches = this.chunkArray(symbols, this.MAX_SYMBOLS_PER_BATCH);
    const results: Record<string, any> = {};
    
    console.log(`Processing ${batches.length} batches for ${symbols.length} symbols`);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`Processing batch ${i + 1}/${batches.length} (${batch.length} symbols)`);

      try {
        const batchResponse = await this.executeSingleBatch(batch, params);
        Object.assign(results, batchResponse);

        // Rate limiting: wait between batches to avoid hitting rate limits
        if (i < batches.length - 1) {
          await this.delay(1000); // 1 second delay between batches
        }
      } catch (error) {
        console.error(`Batch ${i + 1} failed:`, error);
        // Continue processing other batches
      }
    }

    return results;
  }

  private processBatchResponse(response: any, requestedSymbols: string[]): Record<string, any> {
    const results: Record<string, any> = {};

    // Handle different response formats
    if (typeof response === 'object' && response !== null) {
      // If response contains data for each symbol
      requestedSymbols.forEach(symbol => {
        if (response[symbol]) {
          results[symbol] = {
            data: response[symbol],
            status: 'success',
            processedAt: new Date().toISOString()
          };
        } else {
          results[symbol] = {
            data: null,
            status: 'no_data',
            processedAt: new Date().toISOString()
          };
        }
      });
    }

    return results;
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Utility method to estimate credit consumption
  estimateCreditConsumption(symbolCount: number, endpoint: 'time_series' | 'quote' | 'income_statement' = 'time_series'): number {
    const creditWeights = {
      time_series: 1,
      quote: 1,
      income_statement: 100
    };

    return symbolCount * (creditWeights[endpoint] || 1);
  }

  // Method to optimize symbol batching based on available credits
  optimizeBatching(symbols: string[], availableCredits: number, endpoint: 'time_series' | 'quote' | 'income_statement' = 'time_series'): string[][] {
    const creditPerSymbol = endpoint === 'income_statement' ? 100 : 1;
    const maxSymbolsPerCredit = Math.floor(availableCredits / creditPerSymbol);
    const maxSymbolsPerBatch = Math.min(this.MAX_SYMBOLS_PER_BATCH, maxSymbolsPerCredit);

    if (maxSymbolsPerBatch <= 0) {
      throw new Error('Insufficient credits for any requests');
    }

    return this.chunkArray(symbols, maxSymbolsPerBatch);
  }
}
```

## Free Tier Optimization (800 calls/day)

### Credit Management Service

```typescript
// services/CreditManagementService.ts
import { TwelveDataClient } from '../client/TwelveDataClient';

export interface CreditUsage {
  used: number;
  remaining: number;
  limit: number;
  resetTime: Date;
}

export interface OptimizationStrategy {
  useBatchRequests: boolean;
  prioritizeEndpoints: string[];
  maxDailyRequests: number;
  requestInterval: number; // minimum ms between requests
}

export class CreditManagementService {
  private client: TwelveDataClient;
  private dailyUsage: number = 0;
  private lastResetDate: string = '';
  private requestLog: Date[] = [];

  // Free tier limits
  private readonly FREE_TIER_DAILY_LIMIT = 800;
  private readonly FREE_TIER_PER_MINUTE_LIMIT = 8;

  constructor(client: TwelveDataClient) {
    this.client = client;
    this.initializeDailyTracking();
  }

  private initializeDailyTracking(): void {
    const today = new Date().toISOString().split('T')[0];
    if (this.lastResetDate !== today) {
      this.dailyUsage = 0;
      this.lastResetDate = today;
      this.requestLog = [];
    }
  }

  async getCurrentUsage(): Promise<CreditUsage> {
    try {
      const usage = await this.client.getApiUsage();
      
      return {
        used: usage.current_usage || this.dailyUsage,
        remaining: this.FREE_TIER_DAILY_LIMIT - (usage.current_usage || this.dailyUsage),
        limit: this.FREE_TIER_DAILY_LIMIT,
        resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000) // Next day
      };
    } catch (error) {
      // Fallback to local tracking if API call fails
      return {
        used: this.dailyUsage,
        remaining: this.FREE_TIER_DAILY_LIMIT - this.dailyUsage,
        limit: this.FREE_TIER_DAILY_LIMIT,
        resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000)
      };
    }
  }

  trackRequest(creditsCost: number = 1): void {
    this.initializeDailyTracking();
    this.dailyUsage += creditsCost;
    this.requestLog.push(new Date());
    
    // Keep only last hour of requests for rate limiting
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    this.requestLog = this.requestLog.filter(time => time > oneHourAgo);
  }

  canMakeRequest(creditsCost: number = 1): boolean {
    this.initializeDailyTracking();
    
    // Check daily limit
    if (this.dailyUsage + creditsCost > this.FREE_TIER_DAILY_LIMIT) {
      return false;
    }

    // Check per-minute rate limit
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const recentRequests = this.requestLog.filter(time => time > oneMinuteAgo);
    
    return recentRequests.length < this.FREE_TIER_PER_MINUTE_LIMIT;
  }

  getOptimizedStrategy(): OptimizationStrategy {
    const remainingCredits = this.FREE_TIER_DAILY_LIMIT - this.dailyUsage;
    const hoursUntilReset = 24 - new Date().getHours();
    const optimalRequestsPerHour = Math.floor(remainingCredits / hoursUntilReset);

    return {
      useBatchRequests: true,
      prioritizeEndpoints: ['time_series', 'quote'], // Avoid high-cost endpoints like income_statement (100 credits)
      maxDailyRequests: remainingCredits,
      requestInterval: Math.max(1000, 60000 / this.FREE_TIER_PER_MINUTE_LIMIT) // At least 7.5 seconds between requests
    };
  }

  async waitForRateLimit(): Promise<void> {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const recentRequests = this.requestLog.filter(time => time > oneMinuteAgo);
    
    if (recentRequests.length >= this.FREE_TIER_PER_MINUTE_LIMIT) {
      const oldestRecentRequest = Math.min(...recentRequests.map(time => time.getTime()));
      const waitTime = 60000 - (Date.now() - oldestRecentRequest);
      
      if (waitTime > 0) {
        console.log(`Rate limit reached. Waiting ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  // Optimize symbol requests for maximum efficiency
  optimizeSymbolRequests(symbols: string[], maxCredits?: number): {
    batches: string[][];
    estimatedCredits: number;
    strategy: string;
  } {
    const availableCredits = maxCredits || (this.FREE_TIER_DAILY_LIMIT - this.dailyUsage);
    const maxSymbolsPerBatch = 120; // API limit
    const creditsPerSymbol = 1; // For time_series endpoint

    // Calculate optimal batching
    const totalCreditsNeeded = symbols.length * creditsPerSymbol;
    
    if (totalCreditsNeeded > availableCredits) {
      // Prioritize symbols - take only what we can afford
      const affordableSymbols = symbols.slice(0, availableCredits);
      const batches: string[][] = [];
      
      for (let i = 0; i < affordableSymbols.length; i += maxSymbolsPerBatch) {
        batches.push(affordableSymbols.slice(i, i + maxSymbolsPerBatch));
      }

      return {
        batches,
        estimatedCredits: affordableSymbols.length,
        strategy: `Limited to ${affordableSymbols.length} symbols due to credit constraints`
      };
    }

    // All symbols can be processed
    const batches: string[][] = [];
    for (let i = 0; i < symbols.length; i += maxSymbolsPerBatch) {
      batches.push(symbols.slice(i, i + maxSymbolsPerBatch));
    }

    return {
      batches,
      estimatedCredits: totalCreditsNeeded,
      strategy: `Processing all ${symbols.length} symbols in ${batches.length} batch(es)`
    };
  }

  // Get recommendations for daily usage optimization
  getDailyOptimizationTips(): string[] {
    const usage = this.dailyUsage;
    const remaining = this.FREE_TIER_DAILY_LIMIT - usage;
    const tips: string[] = [];

    if (usage > this.FREE_TIER_DAILY_LIMIT * 0.8) {
      tips.push('⚠️ You\'ve used 80%+ of your daily credits. Consider upgrading or optimizing requests.');
    }

    tips.push(`📊 Daily usage: ${usage}/${this.FREE_TIER_DAILY_LIMIT} credits (${remaining} remaining)`);
    
    if (remaining > 0) {
      tips.push(`💡 Use batch requests to query up to ${Math.min(120, remaining)} symbols in a single API call`);
      tips.push(`⏰ Spread remaining ${remaining} requests throughout the day (max 8 per minute)`);
    }

    tips.push('🚀 Pro tip: Use WebSocket for real-time data (doesn\'t consume API credits for price updates)');
    
    return tips;
  }
}
```

### Free Tier Optimization Strategies

```typescript
// strategies/FreeTierOptimization.ts
import { TwelveDataClient } from '../client/TwelveDataClient';
import { CreditManagementService } from '../services/CreditManagementService';
import { BatchRequestService } from '../services/BatchRequestService';
import { TwelveDataWebSocket } from '../websocket/TwelveDataWebSocket';

export class FreeTierOptimization {
  private client: TwelveDataClient;
  private creditManager: CreditManagementService;
  private batchService: BatchRequestService;
  private wsClient: TwelveDataWebSocket | null = null;

  constructor(apiKey: string) {
    this.client = new TwelveDataClient(apiKey);
    this.creditManager = new CreditManagementService(this.client);
    this.batchService = new BatchRequestService(this.client);
  }

  // Strategy 1: Use WebSocket for real-time data (no API credits consumed)
  async enableRealTimeData(symbols: string[]): Promise<void> {
    if (!this.wsClient) {
      this.wsClient = new TwelveDataWebSocket({
        apiKey: process.env.TWELVE_DATA_API_KEY!
      });

      await this.wsClient.connect();
    }

    this.wsClient.subscribe(symbols);
    console.log(`✅ Real-time data enabled for ${symbols.length} symbols (0 credits used)`);
  }

  // Strategy 2: Batch historical data requests
  async getHistoricalDataOptimized(symbols: string[], interval: string, days: number = 7): Promise<Record<string, any>> {
    const usage = await this.creditManager.getCurrentUsage();
    console.log(`📊 Current usage: ${usage.used}/${usage.limit} credits`);

    if (!this.creditManager.canMakeRequest(symbols.length)) {
      throw new Error('Insufficient credits for this request');
    }

    const optimization = this.creditManager.optimizeSymbolRequests(symbols, usage.remaining);
    console.log(`🎯 ${optimization.strategy}`);

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const results: Record<string, any> = {};

    for (const batch of optimization.batches) {
      await this.creditManager.waitForRateLimit();

      try {
        const batchResults = await this.batchService.processBatchRequest({
          symbols: batch,
          interval,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0]
        });

        Object.assign(results, batchResults);
        this.creditManager.trackRequest(batch.length);
        
        console.log(`✅ Processed batch of ${batch.length} symbols`);
      } catch (error) {
        console.error('Batch processing failed:', error);
      }
    }

    return results;
  }

  // Strategy 3: Smart symbol prioritization
  prioritizeSymbols(symbols: string[], priorities: Record<string, number> = {}): string[] {
    return symbols.sort((a, b) => {
      const priorityA = priorities[a] || 0;
      const priorityB = priorities[b] || 0;
      return priorityB - priorityA; // Higher priority first
    });
  }

  // Strategy 4: Cache management to avoid duplicate requests
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();

  private getCacheKey(endpoint: string, params: any): string {
    return `${endpoint}_${JSON.stringify(params)}`;
  }

  private isCacheValid(cacheEntry: { timestamp: number; ttl: number }): boolean {
    return Date.now() - cacheEntry.timestamp < cacheEntry.ttl;
  }

  async getCachedOrFetch(endpoint: string, params: any, ttlMinutes: number = 5): Promise<any> {
    const cacheKey = this.getCacheKey(endpoint, params);
    const cached = this.cache.get(cacheKey);

    if (cached && this.isCacheValid(cached)) {
      console.log(`📦 Cache hit for ${endpoint}`);
      return cached.data;
    }

    // Make API request
    let data;
    switch (endpoint) {
      case 'quote':
        data = await this.client.getQuote(params);
        break;
      case 'time_series':
        data = await this.client.getTimeSeries(params);
        break;
      default:
        throw new Error(`Unsupported endpoint: ${endpoint}`);
    }

    // Cache the result
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      ttl: ttlMinutes * 60 * 1000
    });

    this.creditManager.trackRequest(1);
    return data;
  }

  // Strategy 5: Daily usage monitoring and alerts
  async getDailyReport(): Promise<any> {
    const usage = await this.creditManager.getCurrentUsage();
    const tips = this.creditManager.getDailyOptimizationTips();
    const strategy = this.creditManager.getOptimizedStrategy();

    return {
      usage,
      tips,
      strategy,
      recommendations: this.generateRecommendations(usage)
    };
  }

  private generateRecommendations(usage: any): string[] {
    const recommendations: string[] = [];
    const usagePercentage = (usage.used / usage.limit) * 100;

    if (usagePercentage < 20) {
      recommendations.push('✅ Great! You\'re well within your daily limit');
      recommendations.push('💡 Consider using batch requests to fetch data for multiple symbols');
    } else if (usagePercentage < 50) {
      recommendations.push('📊 You\'re at moderate usage levels');
      recommendations.push('🔄 Consider caching frequently requested data');
    } else if (usagePercentage < 80) {
      recommendations.push('⚠️ High usage detected');
      recommendations.push('🚀 Switch to WebSocket for real-time updates to save credits');
      recommendations.push('📦 Implement caching for repeated requests');
    } else {
      recommendations.push('🚨 Critical: High credit usage!');
      recommendations.push('⬆️ Consider upgrading to a paid plan');
      recommendations.push('🔒 Implement strict request limiting');
    }

    return recommendations;
  }

  // Cleanup method
  cleanup(): void {
    this.wsClient?.disconnect();
    this.cache.clear();
  }
}
```

## Credit System Management

### Credit Usage Tracking

```typescript
// utils/CreditTracker.ts
export interface CreditLog {
  timestamp: Date;
  endpoint: string;
  symbols: string[];
  creditsUsed: number;
  success: boolean;
  errorMessage?: string;
}

export class CreditTracker {
  private logs: CreditLog[] = [];
  private readonly MAX_LOGS = 1000; // Keep last 1000 requests

  logRequest(endpoint: string, symbols: string[], creditsUsed: number, success: boolean, errorMessage?: string): void {
    const log: CreditLog = {
      timestamp: new Date(),
      endpoint,
      symbols,
      creditsUsed,
      success,
      errorMessage
    };

    this.logs.push(log);

    // Keep only recent logs
    if (this.logs.length > this.MAX_LOGS) {
      this.logs = this.logs.slice(-this.MAX_LOGS);
    }
  }

  getDailyUsage(date?: Date): number {
    const targetDate = date || new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    return this.logs
      .filter(log => log.timestamp >= startOfDay && log.timestamp <= endOfDay && log.success)
      .reduce((total, log) => total + log.creditsUsed, 0);
  }

  getHourlyUsage(hour?: number): number {
    const now = new Date();
    const targetHour = hour !== undefined ? hour : now.getHours();
    const startOfHour = new Date(now);
    startOfHour.setHours(targetHour, 0, 0, 0);
    const endOfHour = new Date(now);
    endOfHour.setHours(targetHour, 59, 59, 999);

    return this.logs
      .filter(log => log.timestamp >= startOfHour && log.timestamp <= endOfHour && log.success)
      .reduce((total, log) => total + log.creditsUsed, 0);
  }

  getFailedRequests(hours: number = 24): CreditLog[] {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.logs.filter(log => !log.success && log.timestamp >= since);
  }

  generateReport(): any {
    const now = new Date();
    const today = this.getDailyUsage();
    const thisHour = this.getHourlyUsage();
    const failed = this.getFailedRequests();

    return {
      daily: {
        used: today,
        remaining: 800 - today,
        percentage: (today / 800) * 100
      },
      hourly: {
        used: thisHour,
        remaining: 8 - thisHour,
        percentage: (thisHour / 8) * 100
      },
      failed: {
        count: failed.length,
        recent: failed.slice(-5) // Last 5 failures
      },
      efficiency: {
        totalRequests: this.logs.length,
        successRate: (this.logs.filter(log => log.success).length / this.logs.length) * 100,
        averageCreditsPerRequest: this.logs.reduce((sum, log) => sum + log.creditsUsed, 0) / this.logs.length
      }
    };
  }
}
```

## Error Handling & Best Practices

### Comprehensive Error Handling

```typescript
// utils/ErrorHandler.ts
export enum TwelveDataErrorType {
  RATE_LIMIT = 'RATE_LIMIT',
  INVALID_API_KEY = 'INVALID_API_KEY',
  INSUFFICIENT_CREDITS = 'INSUFFICIENT_CREDITS',
  INVALID_SYMBOL = 'INVALID_SYMBOL',
  NETWORK_ERROR = 'NETWORK_ERROR',
  WEBSOCKET_ERROR = 'WEBSOCKET_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export class TwelveDataError extends Error {
  type: TwelveDataErrorType;
  originalError?: any;
  retryable: boolean;

  constructor(type: TwelveDataErrorType, message: string, originalError?: any, retryable: boolean = false) {
    super(message);
    this.name = 'TwelveDataError';
    this.type = type;
    this.originalError = originalError;
    this.retryable = retryable;
  }
}

export class ErrorHandler {
  static handleApiError(error: any): TwelveDataError {
    if (error.message?.includes('rate limit')) {
      return new TwelveDataError(
        TwelveDataErrorType.RATE_LIMIT,
        'Rate limit exceeded. Please wait before making more requests.',
        error,
        true
      );
    }

    if (error.message?.includes('API key')) {
      return new TwelveDataError(
        TwelveDataErrorType.INVALID_API_KEY,
        'Invalid API key provided.',
        error,
        false
      );
    }

    if (error.message?.includes('credits') || error.message?.includes('usage limit')) {
      return new TwelveDataError(
        TwelveDataErrorType.INSUFFICIENT_CREDITS,
        'Insufficient API credits remaining.',
        error,
        false
      );
    }

    if (error.message?.includes('symbol')) {
      return new TwelveDataError(
        TwelveDataErrorType.INVALID_SYMBOL,
        'Invalid symbol provided.',
        error,
        false
      );
    }

    if (error.name === 'TypeError' || error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return new TwelveDataError(
        TwelveDataErrorType.NETWORK_ERROR,
        'Network connection error.',
        error,
        true
      );
    }

    return new TwelveDataError(
      TwelveDataErrorType.UNKNOWN_ERROR,
      error.message || 'Unknown error occurred',
      error,
      true
    );
  }

  static async retry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000,
    backoffMultiplier: number = 2
  ): Promise<T> {
    let lastError: TwelveDataError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof TwelveDataError ? error : this.handleApiError(error);

        if (!lastError.retryable || attempt === maxRetries) {
          throw lastError;
        }

        const delay = delayMs * Math.pow(backoffMultiplier, attempt);
        console.log(`Attempt ${attempt + 1} failed. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }
}
```

### Best Practices Implementation

```typescript
// utils/BestPractices.ts
import { TwelveDataClient } from '../client/TwelveDataClient';
import { ErrorHandler, TwelveDataError } from './ErrorHandler';
import { CreditTracker } from './CreditTracker';

export class BestPracticesClient {
  private client: TwelveDataClient;
  private creditTracker: CreditTracker;
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessingQueue: boolean = false;

  constructor(apiKey: string) {
    this.client = new TwelveDataClient(apiKey);
    this.creditTracker = new CreditTracker();
  }

  // Queue-based request management to respect rate limits
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift()!;
      
      try {
        await request();
        // Wait between requests to respect rate limits (8 requests per minute = 7.5 seconds)
        await new Promise(resolve => setTimeout(resolve, 8000));
      } catch (error) {
        console.error('Queued request failed:', error);
      }
    }

    this.isProcessingQueue = false;
  }

  // Safe API request with error handling and retry logic
  async safeRequest<T>(operation: () => Promise<T>, endpoint: string, symbols: string[] = []): Promise<T> {
    return ErrorHandler.retry(async () => {
      try {
        const result = await operation();
        this.creditTracker.logRequest(endpoint, symbols, symbols.length || 1, true);
        return result;
      } catch (error) {
        const twelveDataError = ErrorHandler.handleApiError(error);
        this.creditTracker.logRequest(endpoint, symbols, 0, false, twelveDataError.message);
        throw twelveDataError;
      }
    });
  }

  // Queued request for rate limit compliance
  async queueRequest<T>(operation: () => Promise<T>, endpoint: string, symbols: string[] = []): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await this.safeRequest(operation, endpoint, symbols);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.processQueue();
    });
  }

  // Optimized batch request with automatic symbol splitting
  async getOptimizedTimeSeries(symbols: string[], interval: string, days: number = 7): Promise<Record<string, any>> {
    const MAX_BATCH_SIZE = 120;
    const batches: string[][] = [];
    
    // Split symbols into optimal batches
    for (let i = 0; i < symbols.length; i += MAX_BATCH_SIZE) {
      batches.push(symbols.slice(i, i + MAX_BATCH_SIZE));
    }

    const results: Record<string, any> = {};

    // Process batches sequentially to respect rate limits
    for (const batch of batches) {
      try {
        const batchResult = await this.queueRequest(
          () => this.client.getBatchTimeSeries({
            symbols: batch,
            interval,
            outputsize: days * (interval === '1day' ? 1 : 24),
            start_date: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          }),
          'time_series',
          batch
        );

        Object.assign(results, batchResult);
      } catch (error) {
        console.error(`Batch failed for symbols: ${batch.join(', ')}`, error);
      }
    }

    return results;
  }

  // Health check method
  async healthCheck(): Promise<{
    status: string;
    apiKey: boolean;
    credits: any;
    errors: any;
  }> {
    try {
      const usage = await this.client.getApiUsage();
      const report = this.creditTracker.generateReport();

      return {
        status: 'OK',
        apiKey: true,
        credits: usage,
        errors: report.failed
      };
    } catch (error) {
      return {
        status: 'ERROR',
        apiKey: false,
        credits: null,
        errors: [error.message]
      };
    }
  }

  getCreditReport(): any {
    return this.creditTracker.generateReport();
  }
}
```

## TypeScript Types & Interfaces

### Complete Type Definitions

```typescript
// types/TwelveDataTypes.ts

// Base types
export interface ApiResponse<T = any> {
  meta?: {
    symbol: string;
    interval: string;
    currency: string;
    exchange_timezone: string;
    exchange: string;
    mic_code: string;
    type: string;
  };
  values?: T[];
  status?: string;
  message?: string;
}

export interface TimeSeriesValue {
  datetime: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}

export interface QuoteData {
  symbol: string;
  name: string;
  exchange: string;
  mic_code: string;
  currency: string;
  datetime: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  previous_close: number;
  change: number;
  percent_change: number;
  average_volume: number;
  is_market_open: boolean;
  fifty_two_week: {
    low: number;
    high: number;
    low_change: number;
    high_change: number;
    low_change_percent: number;
    high_change_percent: number;
    range: string;
  };
}

// WebSocket types
export interface WebSocketSubscription {
  action: 'subscribe' | 'unsubscribe' | 'reset' | 'heartbeat';
  params?: {
    symbols: string;
  };
}

export interface WebSocketPriceUpdate {
  event: 'price';
  symbol: string;
  price: number;
  timestamp: number;
  volume?: number;
}

// API endpoints configuration
export interface EndpointConfig {
  name: string;
  creditWeight: number;
  maxSymbols: number;
  description: string;
}

export const ENDPOINTS: Record<string, EndpointConfig> = {
  TIME_SERIES: {
    name: 'time_series',
    creditWeight: 1,
    maxSymbols: 120,
    description: 'Historical time series data'
  },
  QUOTE: {
    name: 'quote',
    creditWeight: 1,
    maxSymbols: 120,
    description: 'Real-time quote data'
  },
  INCOME_STATEMENT: {
    name: 'income_statement',
    creditWeight: 100,
    maxSymbols: 1,
    description: 'Income statement data'
  },
  BALANCE_SHEET: {
    name: 'balance_sheet',
    creditWeight: 100,
    maxSymbols: 1,
    description: 'Balance sheet data'
  },
  CASH_FLOW: {
    name: 'cash_flow',
    creditWeight: 100,
    maxSymbols: 1,
    description: 'Cash flow statement data'
  }
};

// Utility types
export type Interval = '1min' | '5min' | '15min' | '30min' | '45min' | '1h' | '2h' | '4h' | '1day' | '1week' | '1month';
export type OrderType = 'asc' | 'desc';
export type FormatType = 'json' | 'csv';

// Configuration interfaces
export interface ClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
  rateLimitPerMinute?: number;
  rateLimitPerDay?: number;
}

export interface WebSocketConfig {
  apiKey: string;
  url?: string;
  reconnectInterval?: number;
  heartbeatInterval?: number;
  maxReconnectAttempts?: number;
}

// Error types
export interface ApiError {
  code: string;
  message: string;
  status: number;
  details?: any;
}

// Usage tracking types
export interface UsageStats {
  current_usage: number;
  plan_limit: number;
  remaining: number;
  reset_time: string;
}

export interface RequestLog {
  timestamp: Date;
  endpoint: string;
  symbols: string[];
  credits_used: number;
  success: boolean;
  duration_ms: number;
  error?: string;
}

// Optimization types
export interface BatchOptimization {
  original_symbols: string[];
  batches: string[][];
  estimated_credits: number;
  estimated_time_seconds: number;
  strategy: 'single_batch' | 'multiple_batches' | 'symbol_limit';
}

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
}
```

## Usage Examples

### Complete Implementation Example

```typescript
// examples/complete-example.ts
import { BestPracticesClient } from '../utils/BestPractices';
import { FreeTierOptimization } from '../strategies/FreeTierOptimization';
import { TwelveDataWebSocket } from '../websocket/TwelveDataWebSocket';

async function main() {
  const apiKey = process.env.TWELVE_DATA_API_KEY!;
  
  // Initialize clients
  const client = new BestPracticesClient(apiKey);
  const optimizer = new FreeTierOptimization(apiKey);

  try {
    // 1. Health check
    console.log('🔍 Performing health check...');
    const health = await client.healthCheck();
    console.log('Health status:', health.status);

    // 2. Get daily usage report
    console.log('\n📊 Getting daily usage report...');
    const report = await optimizer.getDailyReport();
    console.log('Daily report:', JSON.stringify(report, null, 2));

    // 3. Define symbols to track
    const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX'];
    const priorities = {
      'AAPL': 10,
      'MSFT': 9,
      'GOOGL': 8,
      'AMZN': 7,
      'TSLA': 6
    };

    // 4. Prioritize symbols based on importance
    const prioritizedSymbols = optimizer.prioritizeSymbols(symbols, priorities);
    console.log('\n🎯 Prioritized symbols:', prioritizedSymbols);

    // 5. Enable real-time data via WebSocket (no credits used)
    console.log('\n🚀 Enabling real-time data...');
    await optimizer.enableRealTimeData(prioritizedSymbols.slice(0, 5)); // Top 5 symbols

    // 6. Get optimized historical data
    console.log('\n📈 Fetching historical data...');
    const historicalData = await optimizer.getHistoricalDataOptimized(
      prioritizedSymbols.slice(0, 10), // Top 10 symbols
      '1day',
      7 // Last 7 days
    );

    console.log(`✅ Retrieved historical data for ${Object.keys(historicalData).length} symbols`);

    // 7. Get final credit report
    console.log('\n💳 Final credit report:');
    const finalReport = client.getCreditReport();
    console.log(JSON.stringify(finalReport, null, 2));

    // 8. Display optimization tips
    console.log('\n💡 Optimization tips:');
    report.tips.forEach(tip => console.log(tip));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    // Cleanup
    optimizer.cleanup();
  }
}

// Run the example
if (require.main === module) {
  main().catch(console.error);
}
```

---

## Free Tier Optimization Summary (800 calls/day)

### Key Strategies:

1. **Use Batch Requests**: Query up to 120 symbols in a single API call
2. **WebSocket for Real-time**: Real-time price updates don't consume API credits
3. **Smart Caching**: Cache frequently requested data with appropriate TTL
4. **Rate Limiting**: Respect 8 requests per minute limit
5. **Symbol Prioritization**: Focus on most important symbols first
6. **Endpoint Selection**: Avoid high-cost endpoints (income_statement = 100 credits)
7. **Historical Data Optimization**: Use date parameters to limit data retrieval
8. **Queue Management**: Process requests sequentially to avoid rate limit violations

### Daily Usage Breakdown:
- **800 credits total per day**
- **8 requests per minute maximum**
- **Time series data: 1 credit per symbol**
- **Batch requests: 1 credit per symbol, but only 1 API call**
- **WebSocket: No credits for real-time price updates**

### Best Practices:
- Monitor daily usage proactively
- Use WebSocket for active trading/monitoring
- Batch historical data requests
- Implement caching for repeated requests
- Prioritize symbols by importance
- Consider upgrading for production use

This comprehensive guide provides everything needed to effectively use the Twelve Data API with TypeScript while optimizing for the free tier's 800 calls per day limit.