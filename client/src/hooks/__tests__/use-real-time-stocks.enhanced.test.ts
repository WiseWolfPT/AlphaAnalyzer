/**
 * Comprehensive test suite for useRealTimeStocks hook
 * Covers critical business flows, error handling, and edge cases
 */
import { renderHook, waitFor } from '@testing-library/react-hooks';
import { act } from 'react-dom/test-utils';
import { useRealTimeStocks, useRealTimeStock } from '../use-real-time-stocks';
import * as queryClient from '@/lib/queryClient';

// Mock the queryClient
jest.mock('@/lib/queryClient', () => ({
  apiRequest: jest.fn()
}));

describe('useRealTimeStocks Hook - Critical Business Flows', () => {
  const mockApiRequest = queryClient.apiRequest as jest.MockedFunction<typeof queryClient.apiRequest>;
  
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Empty Symbol List Edge Cases', () => {
    it('should handle empty symbols list without infinite loading', async () => {
      const { result } = renderHook(() => 
        useRealTimeStocks({ symbols: [], updateInterval: 0 })
      );

      expect(result.current.isLoading).toBe(true);
      expect(result.current.stocks).toEqual({});

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockApiRequest).not.toHaveBeenCalled();
    });

    it('should handle transition from populated to empty symbols', async () => {
      const { result, rerender } = renderHook(
        (props) => useRealTimeStocks(props),
        { initialProps: { symbols: ['AAPL'], updateInterval: 0 } }
      );

      // Mock successful response
      mockApiRequest.mockResolvedValue({
        json: async () => ({
          AAPL: {
            symbol: 'AAPL',
            name: 'Apple Inc.',
            currentPrice: '150.00',
            change: '2.00',
            changePercent: '1.35'
          }
        })
      } as any);

      await waitFor(() => {
        expect(result.current.stocks.AAPL).toBeDefined();
      });

      // Transition to empty symbols
      rerender({ symbols: [], updateInterval: 0 });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.stocks).toEqual({});
      });
    });
  });

  describe('API Error Handling & Fallback', () => {
    it('should handle network failures gracefully', async () => {
      mockApiRequest.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => 
        useRealTimeStocks({ symbols: ['AAPL'], updateInterval: 0 })
      );

      await waitFor(() => {
        expect(result.current.error).toBe('Network error');
        expect(result.current.isLoading).toBe(false);
        expect(result.current.stocks).toEqual({});
      });
    });

    it('should handle malformed API response', async () => {
      mockApiRequest.mockResolvedValue({
        json: async () => null
      } as any);

      const { result } = renderHook(() => 
        useRealTimeStocks({ symbols: ['AAPL'], updateInterval: 0 })
      );

      await waitFor(() => {
        expect(result.current.stocks).toEqual({});
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should handle API timeout scenarios', async () => {
      // Simulate timeout by rejecting with specific error
      mockApiRequest.mockRejectedValue(new Error('Request timeout'));

      const { result } = renderHook(() => 
        useRealTimeStocks({ symbols: ['AAPL'], updateInterval: 0 })
      );

      await waitFor(() => {
        expect(result.current.error).toBe('Request timeout');
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should recover from errors on subsequent calls', async () => {
      // First call fails
      mockApiRequest.mockRejectedValueOnce(new Error('Network error'));
      
      const { result } = renderHook(() => 
        useRealTimeStocks({ symbols: ['AAPL'], updateInterval: 0 })
      );

      await waitFor(() => {
        expect(result.current.error).toBe('Network error');
      });

      // Mock successful response for retry
      mockApiRequest.mockResolvedValue({
        json: async () => ({
          AAPL: {
            symbol: 'AAPL',
            currentPrice: '150.00',
            change: '2.00'
          }
        })
      } as any);

      // Trigger retry
      act(() => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
        expect(result.current.stocks.AAPL).toBeDefined();
      });
    });
  });

  describe('Price Change Detection & Animation', () => {
    it('should detect price changes and trigger animations', async () => {
      const { result } = renderHook(() => 
        useRealTimeStocks({ symbols: ['AAPL'], updateInterval: 0 })
      );

      // First fetch
      mockApiRequest.mockResolvedValueOnce({
        json: async () => ({
          AAPL: { symbol: 'AAPL', currentPrice: '150.00' }
        })
      } as any);

      await waitFor(() => {
        expect(result.current.stocks.AAPL).toBeDefined();
      });

      expect(result.current.updatingStocks.has('AAPL')).toBe(false);

      // Second fetch with price change
      mockApiRequest.mockResolvedValueOnce({
        json: async () => ({
          AAPL: { symbol: 'AAPL', currentPrice: '152.50' }
        })
      } as any);

      act(() => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.updatingStocks.has('AAPL')).toBe(true);
      });

      // Animation should clear after timeout
      act(() => {
        jest.advanceTimersByTime(700);
      });

      expect(result.current.updatingStocks.has('AAPL')).toBe(false);
    });

    it('should not trigger animation for insignificant price changes', async () => {
      const { result } = renderHook(() => 
        useRealTimeStocks({ symbols: ['AAPL'], updateInterval: 0 })
      );

      // First fetch
      mockApiRequest.mockResolvedValueOnce({
        json: async () => ({
          AAPL: { symbol: 'AAPL', currentPrice: '150.00' }
        })
      } as any);

      await waitFor(() => {
        expect(result.current.stocks.AAPL).toBeDefined();
      });

      // Second fetch with minimal price change (< 0.01)
      mockApiRequest.mockResolvedValueOnce({
        json: async () => ({
          AAPL: { symbol: 'AAPL', currentPrice: '150.005' }
        })
      } as any);

      act(() => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.updatingStocks.has('AAPL')).toBe(false);
      });
    });
  });

  describe('Interval Management & Cleanup', () => {
    it('should set up and clean up intervals properly', () => {
      const { unmount } = renderHook(() => 
        useRealTimeStocks({ symbols: ['AAPL'], updateInterval: 5000 })
      );

      // Verify interval is set
      expect(jest.getTimerCount()).toBe(1);

      // Unmount should clear interval
      unmount();
      expect(jest.getTimerCount()).toBe(0);
    });

    it('should not set up interval when updateInterval is 0', () => {
      renderHook(() => 
        useRealTimeStocks({ symbols: ['AAPL'], updateInterval: 0 })
      );

      expect(jest.getTimerCount()).toBe(0);
    });

    it('should update interval when updateInterval prop changes', () => {
      const { rerender } = renderHook(
        (props) => useRealTimeStocks(props),
        { initialProps: { symbols: ['AAPL'], updateInterval: 5000 } }
      );

      expect(jest.getTimerCount()).toBe(1);

      // Change interval
      rerender({ symbols: ['AAPL'], updateInterval: 3000 });

      // Should still have only one timer (old cleared, new set)
      expect(jest.getTimerCount()).toBe(1);
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle rapid symbol changes without race conditions', async () => {
      const { result, rerender } = renderHook(
        (props) => useRealTimeStocks(props),
        { initialProps: { symbols: ['AAPL'], updateInterval: 0 } }
      );

      // Mock different responses for different calls
      mockApiRequest
        .mockResolvedValueOnce({
          json: async () => ({ AAPL: { symbol: 'AAPL', currentPrice: '150.00' } })
        } as any)
        .mockResolvedValueOnce({
          json: async () => ({ MSFT: { symbol: 'MSFT', currentPrice: '300.00' } })
        } as any);

      await waitFor(() => {
        expect(result.current.stocks.AAPL).toBeDefined();
      });

      // Quickly change symbols
      rerender({ symbols: ['MSFT'], updateInterval: 0 });

      await waitFor(() => {
        expect(result.current.stocks.MSFT).toBeDefined();
        expect(result.current.stocks.AAPL).toBeUndefined();
      });
    });
  });

  describe('Data Normalization Edge Cases', () => {
    it('should handle missing or invalid stock data fields', async () => {
      mockApiRequest.mockResolvedValue({
        json: async () => ({
          AAPL: {
            symbol: 'AAPL',
            // Missing name, using fallback
            currentPrice: null, // Invalid price
            change: 'invalid', // Invalid number
            volume: undefined
          }
        })
      } as any);

      const { result } = renderHook(() => 
        useRealTimeStocks({ symbols: ['AAPL'], updateInterval: 0 })
      );

      await waitFor(() => {
        const stock = result.current.stocks.AAPL;
        expect(stock).toBeDefined();
        expect(stock.name).toBe('AAPL Corp'); // Fallback name
        expect(stock.price).toBe(0); // Fallback for invalid price
        expect(stock.change).toBe(0); // Fallback for invalid change
        expect(stock.volume).toBe(0); // Fallback for undefined volume
      });
    });

    it('should handle partial stock data in batch response', async () => {
      mockApiRequest.mockResolvedValue({
        json: async () => ({
          AAPL: {
            symbol: 'AAPL',
            name: 'Apple Inc.',
            currentPrice: '150.00'
          },
          // MSFT missing from response
        })
      } as any);

      const { result } = renderHook(() => 
        useRealTimeStocks({ symbols: ['AAPL', 'MSFT'], updateInterval: 0 })
      );

      await waitFor(() => {
        expect(result.current.stocks.AAPL).toBeDefined();
        expect(result.current.stocks.MSFT).toBeUndefined();
      });
    });
  });
});

describe('useRealTimeStock Single Stock Hook', () => {
  const mockApiRequest = queryClient.apiRequest as jest.MockedFunction<typeof queryClient.apiRequest>;
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return null when no symbol provided', () => {
    const { result } = renderHook(() => useRealTimeStock(''));
    
    expect(result.current.stock).toBeNull();
    expect(result.current.isUpdating).toBe(false);
  });

  it('should return correct stock data and updating state', async () => {
    mockApiRequest.mockResolvedValue({
      json: async () => ({
        AAPL: {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          currentPrice: '150.00'
        }
      })
    } as any);

    const { result } = renderHook(() => 
      useRealTimeStock('AAPL', 0)
    );

    await waitFor(() => {
      expect(result.current.stock).toBeDefined();
      expect(result.current.stock?.symbol).toBe('AAPL');
      expect(result.current.isUpdating).toBe(false);
    });
  });

  it('should handle errors specific to single stock', async () => {
    mockApiRequest.mockRejectedValue(new Error('Stock not found'));

    const { result } = renderHook(() => 
      useRealTimeStock('INVALID', 0)
    );

    await waitFor(() => {
      expect(result.current.error).toBe('Stock not found');
      expect(result.current.stock).toBeNull();
    });
  });
});