# Financial API Testing Strategies for TypeScript

## Overview

This document provides comprehensive testing patterns and strategies for financial APIs in TypeScript, focusing on data integrity, error handling, rate limiting, and WebSocket testing. All examples use Jest and modern TypeScript patterns.

## Table of Contents

1. [Jest Patterns for API Integration Tests](#jest-patterns-for-api-integration-tests)
2. [Mock Patterns for External APIs](#mock-patterns-for-external-apis)
3. [WebSocket Testing Strategies](#websocket-testing-strategies)
4. [Rate Limiting Test Patterns](#rate-limiting-test-patterns)
5. [Error Scenario Testing](#error-scenario-testing)
6. [Financial Data Integrity Testing](#financial-data-integrity-testing)

## Jest Patterns for API Integration Tests

### Basic API Test Setup

```typescript
// tests/setup/api-test-setup.ts
import { jest } from '@jest/globals';

// Configure Jest for API testing
jest.setTimeout(30000); // 30 second timeout for API calls

// Global test configuration
export const API_CONFIG = {
  baseUrl: process.env.TEST_API_URL || 'https://api.financialdata.com',
  apiKey: process.env.TEST_API_KEY || 'test-key',
  timeout: 10000,
  retries: 3
};

// HTTP status codes for financial APIs
export const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
} as const;
```

### Financial API Service Test

```typescript
// tests/services/financial-api.test.ts
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import axios from 'axios';
import { FinancialApiService } from '../src/services/financial-api.service';
import { API_CONFIG, HTTP_STATUS } from './setup/api-test-setup';

jest.mock('axios');
const mockedAxios = jest.mocked(axios);

describe('FinancialApiService', () => {
  let service: FinancialApiService;

  beforeEach(() => {
    service = new FinancialApiService(API_CONFIG);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Stock Quote API', () => {
    test('should fetch stock quote successfully', async () => {
      // Arrange
      const symbol = 'AAPL';
      const mockResponse = {
        data: {
          symbol: 'AAPL',
          price: 150.25,
          change: 2.35,
          changePercent: 1.59,
          timestamp: new Date().toISOString(),
          volume: 1000000,
          marketCap: 2500000000000
        }
      };
      
      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      // Act
      const result = await service.getStockQuote(symbol);

      // Assert
      expect(mockedAxios.get).toHaveBeenCalledWith(
        `/v3/quote/${symbol}`,
        expect.objectContaining({
          timeout: API_CONFIG.timeout,
          headers: expect.objectContaining({
            'Authorization': `Bearer ${API_CONFIG.apiKey}`
          })
        })
      );
      
      expect(result).toEqual(mockResponse.data);
      expect(result.price).toBeGreaterThan(0);
      expect(result.volume).toBeGreaterThanOrEqual(0);
    });

    test('should handle invalid symbol gracefully', async () => {
      // Arrange
      const invalidSymbol = 'INVALID';
      mockedAxios.get.mockRejectedValueOnce({
        response: {
          status: HTTP_STATUS.NOT_FOUND,
          data: { error: 'Symbol not found' }
        }
      });

      // Act & Assert
      await expect(service.getStockQuote(invalidSymbol))
        .rejects
        .toThrow('Symbol not found');
      
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('Historical Data API', () => {
    test('should fetch historical data with date range validation', async () => {
      // Arrange
      const symbol = 'TSLA';
      const startDate = '2023-01-01';
      const endDate = '2023-12-31';
      
      const mockHistoricalData = {
        data: {
          symbol,
          historical: [
            {
              date: '2023-12-31',
              open: 248.48,
              high: 250.28,
              low: 246.64,
              close: 248.48,
              volume: 23000000,
              adjustedClose: 248.48
            }
          ]
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockHistoricalData);

      // Act
      const result = await service.getHistoricalData(symbol, startDate, endDate);

      // Assert
      expect(result.historical).toHaveLength(1);
      expect(result.historical[0].date).toBe('2023-12-31');
      expect(result.historical[0].close).toBeGreaterThan(0);
      
      // Validate financial data integrity
      const dataPoint = result.historical[0];
      expect(dataPoint.high).toBeGreaterThanOrEqual(dataPoint.low);
      expect(dataPoint.open).toBeGreaterThan(0);
      expect(dataPoint.volume).toBeGreaterThanOrEqual(0);
    });
  });
});
```

## Mock Patterns for External APIs

### Advanced Axios Mocking

```typescript
// tests/mocks/axios-mock-factory.ts
import { jest } from '@jest/globals';
import type { AxiosResponse, AxiosError } from 'axios';

export class AxiosMockFactory {
  /**
   * Creates a successful response mock
   */
  static createSuccessResponse<T>(data: T, status = 200): AxiosResponse<T> {
    return {
      data,
      status,
      statusText: 'OK',
      headers: {},
      config: {} as any
    };
  }

  /**
   * Creates an error response mock
   */
  static createErrorResponse(
    status: number, 
    message: string,
    code?: string
  ): AxiosError {
    const error = new Error(message) as AxiosError;
    error.response = {
      status,
      statusText: this.getStatusText(status),
      data: { error: message, code },
      headers: {},
      config: {} as any
    };
    error.code = code;
    return error;
  }

  /**
   * Creates rate limit error
   */
  static createRateLimitError(): AxiosError {
    return this.createErrorResponse(
      429,
      'Rate limit exceeded',
      'RATE_LIMIT_EXCEEDED'
    );
  }

  /**
   * Creates network timeout error
   */
  static createTimeoutError(): AxiosError {
    const error = new Error('Network timeout') as AxiosError;
    error.code = 'ECONNABORTED';
    return error;
  }

  private static getStatusText(status: number): string {
    const statusTexts: Record<number, string> = {
      200: 'OK',
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
      503: 'Service Unavailable'
    };
    return statusTexts[status] || 'Unknown';
  }
}
```

### Financial Data Mocks

```typescript
// tests/mocks/financial-data.mocks.ts
export const MOCK_FINANCIAL_DATA = {
  stockQuote: {
    symbol: 'AAPL',
    price: 150.25,
    change: 2.35,
    changePercent: 1.59,
    dayLow: 148.50,
    dayHigh: 151.00,
    volume: 50000000,
    avgVolume: 45000000,
    marketCap: 2400000000000,
    peRatio: 28.5,
    eps: 5.25,
    timestamp: '2023-12-31T16:00:00Z'
  },

  historicalData: [
    {
      date: '2023-12-31',
      open: 148.50,
      high: 151.00,
      low: 148.00,
      close: 150.25,
      adjustedClose: 150.25,
      volume: 50000000
    },
    {
      date: '2023-12-30',
      open: 149.00,
      high: 150.50,
      low: 147.50,
      close: 148.75,
      adjustedClose: 148.75,
      volume: 45000000
    }
  ],

  marketData: {
    indices: [
      { symbol: '^GSPC', name: 'S&P 500', value: 4769.83, change: 24.54 },
      { symbol: '^DJI', name: 'Dow Jones', value: 37689.54, change: 123.84 },
      { symbol: '^IXIC', name: 'NASDAQ', value: 15011.35, change: 55.61 }
    ],
    sectors: [
      { name: 'Technology', performance: 2.15 },
      { name: 'Healthcare', performance: 1.85 },
      { name: 'Financials', performance: -0.45 }
    ]
  },

  optionsChain: {
    symbol: 'AAPL',
    expirationDates: ['2024-01-19', '2024-02-16', '2024-03-15'],
    options: [
      {
        strike: 150,
        type: 'call',
        bid: 5.20,
        ask: 5.35,
        volume: 1500,
        openInterest: 25000,
        impliedVolatility: 0.235
      }
    ]
  }
};

// Mock factory for generating test data
export class FinancialDataFactory {
  static generateStockQuote(overrides?: Partial<typeof MOCK_FINANCIAL_DATA.stockQuote>) {
    return {
      ...MOCK_FINANCIAL_DATA.stockQuote,
      ...overrides,
      timestamp: new Date().toISOString()
    };
  }

  static generateHistoricalData(days: number = 30) {
    const data = [];
    const basePrice = 150;
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const randomFactor = 0.95 + Math.random() * 0.1; // ±5% variation
      const price = basePrice * randomFactor;
      
      data.push({
        date: date.toISOString().split('T')[0],
        open: price * (0.98 + Math.random() * 0.04),
        high: price * (1.01 + Math.random() * 0.02),
        low: price * (0.97 + Math.random() * 0.02),
        close: price,
        adjustedClose: price,
        volume: Math.floor(30000000 + Math.random() * 40000000)
      });
    }
    
    return data.reverse();
  }
}
```

### Sequence-Based Mocking for Complex Scenarios

```typescript
// tests/integration/market-data-service.test.ts
import { describe, test, expect, beforeEach } from '@jest/globals';
import axios from 'axios';
import { MarketDataService } from '../src/services/market-data.service';
import { AxiosMockFactory } from './mocks/axios-mock-factory';

jest.mock('axios');
const mockedAxios = jest.mocked(axios);

describe('MarketDataService - Complex Scenarios', () => {
  let service: MarketDataService;

  beforeEach(() => {
    service = new MarketDataService();
    jest.clearAllMocks();
  });

  test('should handle API retry logic on temporary failures', async () => {
    // Arrange - sequence of responses: fail, fail, success
    const symbol = 'NVDA';
    const successResponse = AxiosMockFactory.createSuccessResponse({
      symbol,
      price: 475.50
    });

    mockedAxios.get
      .mockRejectedValueOnce(AxiosMockFactory.createTimeoutError())
      .mockRejectedValueOnce(AxiosMockFactory.createErrorResponse(503, 'Service temporarily unavailable'))
      .mockResolvedValueOnce(successResponse);

    // Act
    const result = await service.getStockQuoteWithRetry(symbol);

    // Assert
    expect(mockedAxios.get).toHaveBeenCalledTimes(3);
    expect(result.price).toBe(475.50);
  });

  test('should aggregate data from multiple API calls', async () => {
    // Arrange
    const symbols = ['AAPL', 'GOOGL', 'MSFT'];
    const mockResponses = symbols.map(symbol => 
      AxiosMockFactory.createSuccessResponse({
        symbol,
        price: 100 + Math.random() * 100
      })
    );

    mockedAxios.get.mockImplementation((url: string) => {
      const symbol = url.split('/').pop();
      const response = mockResponses.find(r => r.data.symbol === symbol);
      return Promise.resolve(response);
    });

    // Act
    const results = await service.getBatchQuotes(symbols);

    // Assert
    expect(results).toHaveLength(3);
    expect(mockedAxios.get).toHaveBeenCalledTimes(3);
    symbols.forEach(symbol => {
      expect(results.find(r => r.symbol === symbol)).toBeDefined();
    });
  });
});
```

## WebSocket Testing Strategies

### WebSocket Mock Factory

```typescript
// tests/mocks/websocket.mock.ts
import { jest } from '@jest/globals';

export class WebSocketMock {
  public readyState: number = WebSocket.CONNECTING;
  public onopen: ((event: Event) => void) | null = null;
  public onclose: ((event: CloseEvent) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;

  private listeners: Map<string, Function[]> = new Map();

  constructor(public url: string, public protocols?: string | string[]) {
    // Simulate connection delay
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      this.triggerEvent('open', new Event('open'));
    }, 10);
  }

  send = jest.fn((data: string | ArrayBuffer | Blob) => {
    if (this.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
  });

  close = jest.fn((code?: number, reason?: string) => {
    this.readyState = WebSocket.CLOSED;
    const closeEvent = new CloseEvent('close', { code, reason });
    this.triggerEvent('close', closeEvent);
  });

  addEventListener = jest.fn((type: string, listener: Function) => {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)!.push(listener);
  });

  removeEventListener = jest.fn((type: string, listener: Function) => {
    const listeners = this.listeners.get(type);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  });

  // Test utilities
  simulateMessage(data: any) {
    if (this.readyState === WebSocket.OPEN) {
      const messageEvent = new MessageEvent('message', { 
        data: typeof data === 'string' ? data : JSON.stringify(data) 
      });
      this.triggerEvent('message', messageEvent);
    }
  }

  simulateError(error?: Error) {
    const errorEvent = new ErrorEvent('error', { error });
    this.triggerEvent('error', errorEvent);
  }

  simulateClose(code = 1000, reason = 'Normal closure') {
    this.readyState = WebSocket.CLOSED;
    const closeEvent = new CloseEvent('close', { code, reason });
    this.triggerEvent('close', closeEvent);
  }

  private triggerEvent(type: string, event: Event) {
    // Trigger callback-style handlers
    switch (type) {
      case 'open':
        this.onopen?.(event);
        break;
      case 'close':
        this.onclose?.(event as CloseEvent);
        break;
      case 'message':
        this.onmessage?.(event as MessageEvent);
        break;
      case 'error':
        this.onerror?.(event);
        break;
    }

    // Trigger addEventListener handlers
    const listeners = this.listeners.get(type);
    if (listeners) {
      listeners.forEach(listener => listener(event));
    }
  }
}

// Global WebSocket mock setup
export function setupWebSocketMock() {
  (global as any).WebSocket = WebSocketMock;
  return WebSocketMock;
}
```

### Financial WebSocket Service Test

```typescript
// tests/services/realtime-market-data.test.ts
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { RealtimeMarketDataService } from '../src/services/realtime-market-data.service';
import { WebSocketMock, setupWebSocketMock } from './mocks/websocket.mock';

describe('RealtimeMarketDataService', () => {
  let service: RealtimeMarketDataService;
  let mockWebSocket: typeof WebSocketMock;

  beforeEach(() => {
    mockWebSocket = setupWebSocketMock();
    service = new RealtimeMarketDataService('wss://api.financialdata.com/v1/realtime');
  });

  afterEach(() => {
    service.disconnect();
    jest.clearAllMocks();
  });

  test('should establish WebSocket connection successfully', async () => {
    // Arrange
    const connectionPromise = service.connect();

    // Act
    await connectionPromise;

    // Assert
    expect(service.isConnected()).toBe(true);
    expect(mockWebSocket).toHaveBeenCalledWith('wss://api.financialdata.com/v1/realtime');
  });

  test('should subscribe to stock price updates', async () => {
    // Arrange
    await service.connect();
    const symbol = 'AAPL';
    const priceUpdate = {
      type: 'price_update',
      symbol: 'AAPL',
      price: 151.75,
      change: 1.50,
      timestamp: Date.now()
    };

    let receivedUpdate: any = null;
    service.onPriceUpdate((update) => {
      receivedUpdate = update;
    });

    // Act
    service.subscribe(symbol);
    
    // Simulate receiving price update
    const wsInstance = (service as any).ws as WebSocketMock;
    wsInstance.simulateMessage(priceUpdate);

    // Assert
    expect(wsInstance.send).toHaveBeenCalledWith(
      JSON.stringify({
        action: 'subscribe',
        symbol: symbol
      })
    );
    
    await new Promise(resolve => setTimeout(resolve, 10)); // Allow async handling
    expect(receivedUpdate).toEqual(priceUpdate);
  });

  test('should handle WebSocket connection errors', async () => {
    // Arrange
    const errorHandler = jest.fn();
    service.onError(errorHandler);

    // Act
    const connectionPromise = service.connect();
    
    // Simulate connection error
    const wsInstance = (service as any).ws as WebSocketMock;
    wsInstance.simulateError(new Error('Connection failed'));

    // Assert
    await expect(connectionPromise).rejects.toThrow('Connection failed');
    expect(errorHandler).toHaveBeenCalledWith(expect.any(Error));
  });

  test('should implement heartbeat mechanism', async () => {
    // Arrange
    jest.useFakeTimers();
    await service.connect();
    const wsInstance = (service as any).ws as WebSocketMock;

    // Act
    jest.advanceTimersByTime(30000); // Advance 30 seconds

    // Assert
    expect(wsInstance.send).toHaveBeenCalledWith(
      JSON.stringify({ type: 'ping' })
    );

    jest.useRealTimers();
  });

  test('should reconnect automatically on unexpected disconnection', async () => {
    // Arrange
    await service.connect();
    const reconnectSpy = jest.spyOn(service, 'connect');

    // Act
    const wsInstance = (service as any).ws as WebSocketMock;
    wsInstance.simulateClose(1006, 'Abnormal closure'); // Unexpected closure

    // Wait for reconnection attempt
    await new Promise(resolve => setTimeout(resolve, 100));

    // Assert
    expect(reconnectSpy).toHaveBeenCalled();
  });

  test('should handle message parsing errors gracefully', async () => {
    // Arrange
    await service.connect();
    const errorHandler = jest.fn();
    service.onError(errorHandler);

    // Act
    const wsInstance = (service as any).ws as WebSocketMock;
    wsInstance.simulateMessage('invalid json {'); // Invalid JSON

    // Assert
    expect(errorHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('JSON')
      })
    );
  });

  test('should handle rate limiting from WebSocket server', async () => {
    // Arrange
    await service.connect();
    const rateLimitHandler = jest.fn();
    service.onRateLimit(rateLimitHandler);

    // Act
    const wsInstance = (service as any).ws as WebSocketMock;
    wsInstance.simulateMessage({
      type: 'error',
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests',
      retryAfter: 5000
    });

    // Assert
    expect(rateLimitHandler).toHaveBeenCalledWith({
      retryAfter: 5000,
      message: 'Too many requests'
    });
  });
});
```

## Rate Limiting Test Patterns

### Rate Limiter Mock

```typescript
// tests/mocks/rate-limiter.mock.ts
import { jest } from '@jest/globals';

export class RateLimiterMock {
  private calls: Date[] = [];
  private readonly maxCalls: number;
  private readonly windowMs: number;

  constructor(maxCalls: number = 100, windowMs: number = 60000) {
    this.maxCalls = maxCalls;
    this.windowMs = windowMs;
  }

  async checkLimit(identifier: string = 'default'): Promise<boolean> {
    const now = new Date();
    
    // Remove old calls outside the window
    this.calls = this.calls.filter(
      callTime => now.getTime() - callTime.getTime() < this.windowMs
    );

    if (this.calls.length >= this.maxCalls) {
      return false; // Rate limit exceeded
    }

    this.calls.push(now);
    return true;
  }

  getRemainingCalls(): number {
    return Math.max(0, this.maxCalls - this.calls.length);
  }

  getResetTime(): Date {
    if (this.calls.length === 0) {
      return new Date();
    }
    
    const oldestCall = this.calls[0];
    return new Date(oldestCall.getTime() + this.windowMs);
  }

  reset() {
    this.calls = [];
  }
}
```

### Rate Limiting Integration Tests

```typescript
// tests/integration/rate-limiting.test.ts
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import axios from 'axios';
import { FinancialApiClient } from '../src/clients/financial-api.client';
import { AxiosMockFactory } from './mocks/axios-mock-factory';

jest.mock('axios');
const mockedAxios = jest.mocked(axios);

describe('Rate Limiting Integration', () => {
  let client: FinancialApiClient;

  beforeEach(() => {
    client = new FinancialApiClient({
      rateLimiting: {
        enabled: true,
        maxRequests: 5,
        windowMs: 1000
      }
    });
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('should respect rate limits and queue requests', async () => {
    // Arrange
    const mockResponse = AxiosMockFactory.createSuccessResponse({ price: 100 });
    mockedAxios.get.mockResolvedValue(mockResponse);

    // Act - make 7 requests (exceeds limit of 5)
    const promises = Array.from({ length: 7 }, (_, i) => 
      client.getStockQuote(`STOCK${i}`)
    );

    // Advance time to process first batch
    jest.advanceTimersByTime(100);
    await Promise.resolve(); // Allow microtasks to complete

    // Assert - only 5 requests should have been made initially
    expect(mockedAxios.get).toHaveBeenCalledTimes(5);

    // Advance past the rate limit window
    jest.advanceTimersByTime(1000);
    await Promise.resolve();

    // Wait for all promises to resolve
    await Promise.all(promises);

    // All 7 requests should eventually complete
    expect(mockedAxios.get).toHaveBeenCalledTimes(7);
  });

  test('should handle rate limit response from API', async () => {
    // Arrange
    mockedAxios.get
      .mockRejectedValueOnce(AxiosMockFactory.createRateLimitError())
      .mockResolvedValueOnce(AxiosMockFactory.createSuccessResponse({ price: 100 }));

    // Act
    const result = await client.getStockQuoteWithRetry('AAPL');

    // Assert
    expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    expect(result.price).toBe(100);
  });

  test('should implement exponential backoff on rate limit errors', async () => {
    // Arrange
    const startTime = Date.now();
    let callTimes: number[] = [];
    
    mockedAxios.get.mockImplementation(() => {
      callTimes.push(Date.now() - startTime);
      if (callTimes.length < 3) {
        return Promise.reject(AxiosMockFactory.createRateLimitError());
      }
      return Promise.resolve(AxiosMockFactory.createSuccessResponse({ price: 100 }));
    });

    // Act
    const promise = client.getStockQuoteWithBackoff('AAPL');
    
    // Simulate time passing for backoff delays
    jest.advanceTimersByTime(1000); // First retry after 1s
    await Promise.resolve();
    
    jest.advanceTimersByTime(2000); // Second retry after 2s
    await Promise.resolve();
    
    jest.advanceTimersByTime(4000); // Third attempt after 4s
    const result = await promise;

    // Assert
    expect(mockedAxios.get).toHaveBeenCalledTimes(3);
    expect(result.price).toBe(100);
    
    // Verify exponential backoff timing
    expect(callTimes[1] - callTimes[0]).toBeGreaterThanOrEqual(1000);
    expect(callTimes[2] - callTimes[1]).toBeGreaterThanOrEqual(2000);
  });

  test('should provide rate limit status information', async () => {
    // Arrange
    const mockResponse = AxiosMockFactory.createSuccessResponse({ price: 100 });
    mockedAxios.get.mockResolvedValue(mockResponse);

    // Act
    await client.getStockQuote('AAPL');
    const status = client.getRateLimitStatus();

    // Assert
    expect(status).toEqual({
      remaining: 4, // 5 - 1 used
      resetTime: expect.any(Date),
      total: 5
    });
  });
});
```

## Error Scenario Testing

### Comprehensive Error Testing

```typescript
// tests/error-scenarios/api-error-handling.test.ts
import { describe, test, expect, beforeEach } from '@jest/globals';
import axios from 'axios';
import { FinancialDataService } from '../src/services/financial-data.service';
import { AxiosMockFactory } from './mocks/axios-mock-factory';
import { 
  ApiError, 
  NetworkError, 
  RateLimitError, 
  ValidationError 
} from '../src/errors/api-errors';

jest.mock('axios');
const mockedAxios = jest.mocked(axios);

describe('API Error Handling', () => {
  let service: FinancialDataService;

  beforeEach(() => {
    service = new FinancialDataService();
    jest.clearAllMocks();
  });

  describe('Network Errors', () => {
    test('should handle network timeout errors', async () => {
      // Arrange
      mockedAxios.get.mockRejectedValueOnce(
        AxiosMockFactory.createTimeoutError()
      );

      // Act & Assert
      await expect(service.getStockQuote('AAPL'))
        .rejects
        .toThrow(NetworkError);
      
      // Verify error details
      try {
        await service.getStockQuote('AAPL');
      } catch (error) {
        expect(error).toBeInstanceOf(NetworkError);
        expect((error as NetworkError).code).toBe('NETWORK_TIMEOUT');
        expect((error as NetworkError).retryable).toBe(true);
      }
    });

    test('should handle DNS resolution errors', async () => {
      // Arrange
      const dnsError = new Error('getaddrinfo ENOTFOUND') as any;
      dnsError.code = 'ENOTFOUND';
      mockedAxios.get.mockRejectedValueOnce(dnsError);

      // Act & Assert
      await expect(service.getStockQuote('AAPL'))
        .rejects
        .toThrow(NetworkError);
    });
  });

  describe('HTTP Status Errors', () => {
    test('should handle 401 Unauthorized errors', async () => {
      // Arrange
      mockedAxios.get.mockRejectedValueOnce(
        AxiosMockFactory.createErrorResponse(401, 'Invalid API key')
      );

      // Act & Assert
      await expect(service.getStockQuote('AAPL'))
        .rejects
        .toThrow('Invalid API key');
    });

    test('should handle 429 Rate Limit errors with retry-after header', async () => {
      // Arrange
      const rateLimitError = AxiosMockFactory.createRateLimitError();
      rateLimitError.response!.headers = { 'retry-after': '60' };
      mockedAxios.get.mockRejectedValueOnce(rateLimitError);

      // Act & Assert
      try {
        await service.getStockQuote('AAPL');
      } catch (error) {
        expect(error).toBeInstanceOf(RateLimitError);
        expect((error as RateLimitError).retryAfter).toBe(60);
      }
    });

    test('should handle 500 Internal Server errors', async () => {
      // Arrange
      mockedAxios.get.mockRejectedValueOnce(
        AxiosMockFactory.createErrorResponse(500, 'Internal server error')
      );

      // Act & Assert
      await expect(service.getStockQuote('AAPL'))
        .rejects
        .toThrow(ApiError);
    });
  });

  describe('Data Validation Errors', () => {
    test('should handle invalid symbol format', async () => {
      // Act & Assert
      await expect(service.getStockQuote(''))
        .rejects
        .toThrow(ValidationError);
      
      await expect(service.getStockQuote('invalid-symbol-123'))
        .rejects
        .toThrow(ValidationError);
    });

    test('should handle invalid date ranges', async () => {
      // Arrange
      const symbol = 'AAPL';
      const invalidStartDate = '2024-01-01';
      const invalidEndDate = '2023-01-01'; // End before start

      // Act & Assert
      await expect(
        service.getHistoricalData(symbol, invalidStartDate, invalidEndDate)
      ).rejects.toThrow(ValidationError);
    });

    test('should handle corrupted response data', async () => {
      // Arrange
      const corruptedResponse = AxiosMockFactory.createSuccessResponse({
        symbol: 'AAPL',
        price: 'invalid-price', // Should be number
        timestamp: 'invalid-date' // Should be valid ISO date
      });
      
      mockedAxios.get.mockResolvedValueOnce(corruptedResponse);

      // Act & Assert
      await expect(service.getStockQuote('AAPL'))
        .rejects
        .toThrow('Invalid response data');
    });
  });

  describe('Circuit Breaker Pattern', () => {
    test('should open circuit after consecutive failures', async () => {
      // Arrange
      const serverError = AxiosMockFactory.createErrorResponse(500, 'Server error');
      mockedAxios.get.mockRejectedValue(serverError);

      // Act - Make requests until circuit opens
      const failures = [];
      for (let i = 0; i < 5; i++) {
        try {
          await service.getStockQuote('AAPL');
        } catch (error) {
          failures.push(error);
        }
      }

      // Circuit should now be open
      await expect(service.getStockQuote('AAPL'))
        .rejects
        .toThrow('Circuit breaker is open');

      // Assert
      expect(failures).toHaveLength(5);
      expect(mockedAxios.get).toHaveBeenCalledTimes(5); // No more calls after circuit opens
    });
  });
});
```

## Financial Data Integrity Testing

### Data Validation Utilities

```typescript
// tests/utils/financial-data-validators.ts
export class FinancialDataValidator {
  /**
   * Validates stock quote data structure and values
   */
  static validateStockQuote(quote: any): boolean {
    const required = ['symbol', 'price', 'timestamp'];
    const hasRequired = required.every(field => quote[field] !== undefined);
    
    if (!hasRequired) return false;

    // Price validations
    if (typeof quote.price !== 'number' || quote.price <= 0) return false;
    
    // Volume validation (if present)
    if (quote.volume !== undefined && (typeof quote.volume !== 'number' || quote.volume < 0)) {
      return false;
    }

    // Timestamp validation
    const timestamp = new Date(quote.timestamp);
    if (isNaN(timestamp.getTime())) return false;

    // Market hours validation (basic check)
    if (quote.marketHours !== undefined) {
      const hour = timestamp.getUTCHours();
      const isWeekend = timestamp.getUTCDay() === 0 || timestamp.getUTCDay() === 6;
      
      if (quote.marketHours && (isWeekend || hour < 9 || hour > 16)) {
        console.warn('Quote marked as market hours but timestamp suggests otherwise');
      }
    }

    return true;
  }

  /**
   * Validates OHLC data consistency
   */
  static validateOHLC(data: any): boolean {
    const { open, high, low, close } = data;
    
    // Type validation
    if (![open, high, low, close].every(val => typeof val === 'number' && val > 0)) {
      return false;
    }

    // OHLC logical validation
    if (high < low) return false;
    if (high < open || high < close) return false;
    if (low > open || low > close) return false;

    return true;
  }

  /**
   * Validates options data
   */
  static validateOptionsData(option: any): boolean {
    const required = ['strike', 'type', 'bid', 'ask', 'expiration'];
    if (!required.every(field => option[field] !== undefined)) return false;

    // Strike price validation
    if (typeof option.strike !== 'number' || option.strike <= 0) return false;

    // Option type validation
    if (!['call', 'put'].includes(option.type.toLowerCase())) return false;

    // Bid/Ask validation
    if (typeof option.bid !== 'number' || typeof option.ask !== 'number') return false;
    if (option.bid < 0 || option.ask < 0) return false;
    if (option.bid > option.ask) return false; // Bid should not exceed ask

    // Expiration validation
    const expiration = new Date(option.expiration);
    if (isNaN(expiration.getTime()) || expiration < new Date()) return false;

    return true;
  }

  /**
   * Validates financial ratios
   */
  static validateFinancialRatios(ratios: any): boolean {
    // P/E ratio validation
    if (ratios.peRatio !== undefined) {
      if (typeof ratios.peRatio !== 'number' || ratios.peRatio < 0) return false;
    }

    // Market cap validation
    if (ratios.marketCap !== undefined) {
      if (typeof ratios.marketCap !== 'number' || ratios.marketCap <= 0) return false;
    }

    // EPS validation
    if (ratios.eps !== undefined) {
      if (typeof ratios.eps !== 'number') return false;
    }

    return true;
  }
}
```

### Integration Tests with Data Integrity Checks

```typescript
// tests/integration/data-integrity.test.ts
import { describe, test, expect, beforeEach } from '@jest/globals';
import axios from 'axios';
import { MarketDataService } from '../src/services/market-data.service';
import { FinancialDataValidator } from './utils/financial-data-validators';
import { MOCK_FINANCIAL_DATA } from './mocks/financial-data.mocks';

jest.mock('axios');
const mockedAxios = jest.mocked(axios);

describe('Financial Data Integrity', () => {
  let service: MarketDataService;

  beforeEach(() => {
    service = new MarketDataService();
    jest.clearAllMocks();
  });

  test('should validate stock quote data integrity', async () => {
    // Arrange
    mockedAxios.get.mockResolvedValueOnce({
      data: MOCK_FINANCIAL_DATA.stockQuote
    });

    // Act
    const quote = await service.getStockQuote('AAPL');

    // Assert - Data structure validation
    expect(FinancialDataValidator.validateStockQuote(quote)).toBe(true);
    
    // Assert - Business logic validation
    expect(quote.price).toBeGreaterThan(0);
    expect(quote.volume).toBeGreaterThanOrEqual(0);
    expect(new Date(quote.timestamp)).toBeInstanceOf(Date);
    
    // Assert - Market data consistency
    if (quote.dayHigh && quote.dayLow) {
      expect(quote.dayHigh).toBeGreaterThanOrEqual(quote.dayLow);
      expect(quote.price).toBeGreaterThanOrEqual(quote.dayLow);
      expect(quote.price).toBeLessThanOrEqual(quote.dayHigh);
    }
  });

  test('should validate historical OHLC data consistency', async () => {
    // Arrange
    mockedAxios.get.mockResolvedValueOnce({
      data: { historical: MOCK_FINANCIAL_DATA.historicalData }
    });

    // Act
    const data = await service.getHistoricalData('AAPL', '2023-01-01', '2023-12-31');

    // Assert
    data.historical.forEach((candle, index) => {
      // Individual candle validation
      expect(FinancialDataValidator.validateOHLC(candle)).toBe(true);
      
      // Sequential data validation
      if (index > 0) {
        const prevCandle = data.historical[index - 1];
        const currentDate = new Date(candle.date);
        const prevDate = new Date(prevCandle.date);
        
        // Dates should be in chronological order
        expect(currentDate.getTime()).toBeGreaterThan(prevDate.getTime());
      }
      
      // Adjusted close validation
      if (candle.adjustedClose) {
        expect(candle.adjustedClose).toBeGreaterThan(0);
        // Adjusted close should be reasonable compared to close
        const ratio = candle.adjustedClose / candle.close;
        expect(ratio).toBeGreaterThan(0.1); // Sanity check
        expect(ratio).toBeLessThan(10); // Sanity check
      }
    });
  });

  test('should validate options chain data', async () => {
    // Arrange
    mockedAxios.get.mockResolvedValueOnce({
      data: MOCK_FINANCIAL_DATA.optionsChain
    });

    // Act
    const optionsChain = await service.getOptionsChain('AAPL');

    // Assert
    expect(optionsChain.symbol).toBe('AAPL');
    expect(Array.isArray(optionsChain.expirationDates)).toBe(true);
    expect(Array.isArray(optionsChain.options)).toBe(true);

    optionsChain.options.forEach(option => {
      expect(FinancialDataValidator.validateOptionsData(option)).toBe(true);
      
      // Additional business logic checks
      expect(option.impliedVolatility).toBeGreaterThan(0);
      expect(option.impliedVolatility).toBeLessThan(5); // Reasonable IV range
      
      if (option.openInterest) {
        expect(option.openInterest).toBeGreaterThanOrEqual(0);
      }
    });
  });

  test('should detect and handle data anomalies', async () => {
    // Arrange - Mock data with anomaly
    const anomalousData = {
      ...MOCK_FINANCIAL_DATA.stockQuote,
      price: -100, // Negative price anomaly
      volume: -1000000 // Negative volume anomaly
    };
    
    mockedAxios.get.mockResolvedValueOnce({ data: anomalousData });

    // Act & Assert
    await expect(service.getStockQuote('AAPL'))
      .rejects
      .toThrow('Data validation failed');
  });

  test('should validate real-time vs delayed data consistency', async () => {
    // Arrange
    const realTimeData = { ...MOCK_FINANCIAL_DATA.stockQuote, timestamp: new Date().toISOString() };
    const delayedData = { ...MOCK_FINANCIAL_DATA.stockQuote, timestamp: new Date(Date.now() - 900000).toISOString() }; // 15 min ago

    mockedAxios.get
      .mockResolvedValueOnce({ data: realTimeData })
      .mockResolvedValueOnce({ data: delayedData });

    // Act
    const realTime = await service.getStockQuote('AAPL', { realTime: true });
    const delayed = await service.getStockQuote('AAPL', { realTime: false });

    // Assert
    const realTimeTimestamp = new Date(realTime.timestamp);
    const delayedTimestamp = new Date(delayed.timestamp);
    
    expect(realTimeTimestamp.getTime()).toBeGreaterThan(delayedTimestamp.getTime());
    
    // Real-time data should be within last minute
    expect(Date.now() - realTimeTimestamp.getTime()).toBeLessThan(60000);
    
    // Delayed data should be at least 15 minutes old
    expect(Date.now() - delayedTimestamp.getTime()).toBeGreaterThan(900000);
  });

  test('should validate market hours and trading status', async () => {
    // Arrange
    const marketHoursData = {
      ...MOCK_FINANCIAL_DATA.stockQuote,
      marketStatus: 'OPEN',
      timestamp: '2023-12-29T15:30:00Z' // Friday 3:30 PM UTC (market hours)
    };

    mockedAxios.get.mockResolvedValueOnce({ data: marketHoursData });

    // Act
    const quote = await service.getStockQuote('AAPL');

    // Assert
    const timestamp = new Date(quote.timestamp);
    const hour = timestamp.getUTCHours();
    const dayOfWeek = timestamp.getUTCDay();
    
    if (quote.marketStatus === 'OPEN') {
      // Should be weekday and within market hours (9:30 AM - 4:00 PM EST = 14:30 - 21:00 UTC)
      expect(dayOfWeek).toBeGreaterThan(0); // Not Sunday
      expect(dayOfWeek).toBeLessThan(6); // Not Saturday
      expect(hour).toBeGreaterThanOrEqual(14); // After 9:30 AM EST
      expect(hour).toBeLessThan(21); // Before 4:00 PM EST
    }
  });
});
```

### Performance and Load Testing

```typescript
// tests/performance/load-testing.test.ts
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { FinancialApiService } from '../src/services/financial-api.service';

describe('Performance and Load Testing', () => {
  let service: FinancialApiService;

  beforeEach(() => {
    service = new FinancialApiService();
  });

  test('should handle concurrent requests efficiently', async () => {
    // Arrange
    const symbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA'];
    const concurrentRequests = 50;
    
    const startTime = Date.now();

    // Act
    const promises = Array.from({ length: concurrentRequests }, (_, i) => 
      service.getStockQuote(symbols[i % symbols.length])
    );

    const results = await Promise.all(promises);
    const endTime = Date.now();

    // Assert
    expect(results).toHaveLength(concurrentRequests);
    expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    
    // All results should be valid
    results.forEach(result => {
      expect(result).toBeDefined();
      expect(result.price).toBeGreaterThan(0);
    });
  });

  test('should maintain performance under sustained load', async () => {
    // Arrange
    const iterations = 100;
    const responseTimes: number[] = [];

    // Act
    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      await service.getStockQuote('AAPL');
      const responseTime = Date.now() - startTime;
      responseTimes.push(responseTime);
    }

    // Assert
    const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const maxResponseTime = Math.max(...responseTimes);
    
    expect(averageResponseTime).toBeLessThan(1000); // Average under 1 second
    expect(maxResponseTime).toBeLessThan(3000); // Max under 3 seconds
    
    // 95th percentile should be reasonable
    const sorted = responseTimes.sort((a, b) => a - b);
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    expect(p95).toBeLessThan(2000);
  });
});
```

## Best Practices Summary

### 1. Test Organization
- Separate unit tests, integration tests, and e2e tests
- Use descriptive test names that explain the scenario
- Group related tests using `describe` blocks
- Use `beforeEach`/`afterEach` for setup and cleanup

### 2. Mock Management
- Create reusable mock factories
- Use sequence-based mocking for complex scenarios
- Reset mocks between tests to avoid interference
- Mock at the appropriate level (HTTP client vs business logic)

### 3. Error Testing
- Test all error conditions (network, HTTP status, validation)
- Verify error messages and error types
- Test retry mechanisms and circuit breakers
- Include edge cases and boundary conditions

### 4. Data Integrity
- Validate data structure and business rules
- Test data consistency across related fields
- Verify timestamp and date handling
- Include market-specific validations

### 5. Performance Considerations
- Test with realistic data volumes
- Verify timeout handling
- Test concurrent request handling
- Monitor memory usage in long-running tests

This comprehensive testing strategy ensures robust, reliable financial applications that handle real-world scenarios gracefully while maintaining data integrity and performance standards.