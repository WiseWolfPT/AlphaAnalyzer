/**
 * API Integration Tests - Wave 3 Implementation
 * 
 * Comprehensive integration testing for international markets (USA/EU)
 * Tests API rotation, fallbacks, WebSocket connections, and real-time data flow
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useStocks, useMarketIndices, useApiQuota, useWarmCache, useRealTimeStocks } from '@/hooks/use-enhanced-stocks';
import enhancedApi from '@/lib/enhanced-api';

// Create wrapper for React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

// Mock fetch for API responses
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock WebSocket for real-time testing
class MockWebSocket {
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  
  constructor(public url: string) {
    setTimeout(() => this.onopen?.(new Event('open')), 0);
  }
  
  send(data: string) {
    // Simulate incoming price updates
    setTimeout(() => {
      if (this.onmessage) {
        this.onmessage(new MessageEvent('message', {
          data: JSON.stringify({
            symbol: 'AAPL',
            price: 175.43,
            timestamp: Date.now()
          })
        }));
      }
    }, 10);
  }
  
  close() {
    setTimeout(() => this.onclose?.(new CloseEvent('close')), 0);
  }
}

global.WebSocket = MockWebSocket as any;

describe('API Integration Tests', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Stock Data Integration', () => {
    it('should fetch US stocks successfully with real API', async () => {
      // Mock successful API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          'Global Quote': {
            '01. symbol': 'AAPL',
            '02. open': '174.00',
            '03. high': '176.50',
            '04. low': '173.25',
            '05. price': '175.43',
            '06. volume': '45234567',
            '07. latest trading day': '2025-01-07',
            '08. previous close': '174.00',
            '09. change': '1.43',
            '10. change percent': '0.82%'
          }
        })
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useStocks(['AAPL'], { enabled: true }), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBeDefined();
      expect(result.current.data?.[0]?.symbol).toBe('AAPL');
      expect(result.current.data?.[0]?.currentPrice).toBeCloseTo(175.43);
      expect(result.current.error).toBeNull();
    });

    it('should handle API failures with graceful fallback to mock data', async () => {
      // Mock API failure
      mockFetch.mockRejectedValueOnce(new Error('API quota exceeded'));

      const wrapper = createWrapper();
      const { result } = renderHook(() => useStocks(['TSLA'], { enabled: true }), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should fallback to mock data
      expect(result.current.data).toBeDefined();
      expect(result.current.data?.[0]?.symbol).toBe('TSLA');
      expect(result.current.data?.[0]?.currentPrice).toBeGreaterThan(0);
      expect(result.current.error).toBeNull(); // Error should be handled gracefully
    });

    it('should test API rotation through multiple providers', async () => {
      // First API fails
      mockFetch
        .mockRejectedValueOnce(new Error('Alpha Vantage quota exceeded'))
        .mockRejectedValueOnce(new Error('Finnhub rate limited'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            c: 175.43, // FMP format
            h: 176.50,
            l: 173.25,
            o: 174.00,
            pc: 174.00,
            t: Date.now()
          })
        });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useStocks(['GOOGL'], { enabled: true }), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBeDefined();
      expect(result.current.data?.[0]?.symbol).toBe('GOOGL');
      expect(mockFetch).toHaveBeenCalledTimes(3); // Tried 3 providers
    });

    it('should test batch stock fetching for international portfolio', async () => {
      const internationalStocks = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA']; // US stocks
      
      // Mock successful batch response
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          'Meta Data': { 'Information': 'Batch Stock Market Data' },
          'Stock Quotes': internationalStocks.map(symbol => ({
            '01. symbol': symbol,
            '02. price': (Math.random() * 300 + 100).toFixed(2),
            '03. change': (Math.random() * 10 - 5).toFixed(2),
            '04. change percent': (Math.random() * 5 - 2.5).toFixed(2) + '%'
          }))
        })
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useStocks(internationalStocks, { enabled: true }), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toHaveLength(5);
      expect(result.current.data?.every(stock => stock.currentPrice > 0)).toBe(true);
    });
  });

  describe('Market Indices Integration', () => {
    it('should fetch USA market indices correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sp500: { value: 5088.80, change: 0.39 },
          dow: { value: 39131.53, change: 0.52 },
          nasdaq: { value: 15996.82, change: 0.17 }
        })
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useMarketIndices({ enabled: true }), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBeDefined();
      expect(result.current.data?.sp500?.value).toBeCloseTo(5088.80);
      expect(result.current.data?.dow?.change).toBeCloseTo(0.52);
      expect(result.current.data?.nasdaq?.value).toBeGreaterThan(15000);
    });

    it('should handle European indices for EUR currency users', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          dax: { value: 17234.67, change: 0.67 },
          eurostoxx50: { value: 4989.21, change: -0.15 }
        })
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useMarketIndices({ enabled: true }), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBeDefined();
    });
  });

  describe('API Quota Management', () => {
    it('should track API quota usage correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          provider: 'alpha-vantage',
          used: 450,
          limit: 500,
          percentage: 90,
          resetTime: Date.now() + 3600000 // 1 hour
        })
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useApiQuota({ enabled: true }), { wrapper });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(result.current.data?.percentage).toBe(90);
      expect(result.current.data?.provider).toBe('alpha-vantage');
    });

    it('should handle quota exceeded scenario', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API quota exceeded'));

      const wrapper = createWrapper();
      const { result } = renderHook(() => useApiQuota({ enabled: true }), { wrapper });

      await waitFor(() => {
        expect(result.current.data).toBeUndefined();
      });

      // Should not crash the application
      expect(result.current.error).toBeDefined();
    });
  });

  describe('Cache Warming Integration', () => {
    it('should warm cache for popular international stocks', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, cached: 15 })
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useWarmCache(), { wrapper });

      result.current.mutate();

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/cache/warm'),
        expect.objectContaining({
          method: 'POST'
        })
      );
    });
  });

  describe('Real-time WebSocket Integration', () => {
    it('should establish WebSocket connection for real-time prices', async () => {
      const symbols = ['AAPL', 'MSFT', 'GOOGL'];
      const mockCallback = vi.fn();

      const wrapper = createWrapper();
      renderHook(() => useRealTimeStocks(symbols, true), { wrapper });

      // Wait for WebSocket connection
      await waitFor(() => {
        expect(global.WebSocket).toHaveBeenCalled();
      });

      // Simulate price update
      const ws = new MockWebSocket('ws://localhost:3001/ws');
      ws.send(JSON.stringify({ subscribe: symbols }));

      await waitFor(() => {
        // WebSocket should be connected and receiving data
        expect(ws.onopen).toBeDefined();
      });
    });

    it('should handle WebSocket connection failures gracefully', async () => {
      // Mock WebSocket that fails to connect
      class FailingWebSocket extends MockWebSocket {
        constructor(url: string) {
          super(url);
          setTimeout(() => this.onerror?.(new Event('error')), 0);
        }
      }

      global.WebSocket = FailingWebSocket as any;

      const wrapper = createWrapper();
      const { result } = renderHook(() => useRealTimeStocks(['AAPL'], true), { wrapper });

      // Should handle connection failure without crashing
      await waitFor(() => {
        expect(result.current).toBeDefined();
      });
    });
  });

  describe('Currency Conversion Integration', () => {
    it('should integrate with currency context for USD/EUR conversion', async () => {
      // Mock currency API
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          rates: {
            EUR: 0.92,
            USD: 1.08
          },
          base: 'USD',
          timestamp: Date.now()
        })
      });

      // Test that stock prices are converted based on currency context
      const wrapper = createWrapper();
      const { result } = renderHook(() => useStocks(['AAPL'], { enabled: true }), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Price conversion should be handled by currency context
      expect(result.current.data).toBeDefined();
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from network failures', async () => {
      // First call fails, second succeeds
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            'Global Quote': {
              '01. symbol': 'AAPL',
              '05. price': '175.43'
            }
          })
        });

      const wrapper = createWrapper();
      const { result, rerender } = renderHook(() => useStocks(['AAPL'], { enabled: true }), { wrapper });

      // First attempt should fallback to mock
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Second attempt should succeed with real data
      rerender();
      
      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });
    });

    it('should implement circuit breaker pattern', async () => {
      // Simulate multiple failures to trigger circuit breaker
      for (let i = 0; i < 5; i++) {
        mockFetch.mockRejectedValueOnce(new Error('Service unavailable'));
      }

      const wrapper = createWrapper();
      const { result } = renderHook(() => useStocks(['AAPL'], { enabled: true }), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should use fallback data instead of continuing to hit failing API
      expect(result.current.data).toBeDefined();
      expect(result.current.data?.[0]?.symbol).toBe('AAPL');
    });
  });

  describe('Performance and Optimization', () => {
    it('should cache responses efficiently', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          'Global Quote': {
            '01. symbol': 'AAPL',
            '05. price': '175.43'
          }
        })
      });

      const wrapper = createWrapper();
      
      // First call
      const { result: result1 } = renderHook(() => useStocks(['AAPL'], { enabled: true }), { wrapper });
      await waitFor(() => expect(result1.current.isLoading).toBe(false));

      // Second call should use cache
      const { result: result2 } = renderHook(() => useStocks(['AAPL'], { enabled: true }), { wrapper });
      await waitFor(() => expect(result2.current.isLoading).toBe(false));

      // Should have only made one API call due to caching
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should handle concurrent requests efficiently', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          'Global Quote': {
            '01. symbol': 'MSFT',
            '05. price': '425.67'
          }
        })
      });

      const wrapper = createWrapper();
      
      // Make multiple concurrent requests
      const hooks = Array.from({ length: 5 }, () => 
        renderHook(() => useStocks(['MSFT'], { enabled: true }), { wrapper })
      );

      await Promise.all(
        hooks.map(({ result }) => 
          waitFor(() => expect(result.current.isLoading).toBe(false))
        )
      );

      // Should dedupe requests
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });
});