import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRealTimeStocks } from '../use-real-time-stocks';
import * as marketDataModule from '@/services/market-data-client';
import type { ReactNode } from 'react';

// Mock das dependências
jest.mock('@/services/market-data-client');
jest.mock('@/lib/websocket-manager');

const mockedMarketData = marketDataModule as jest.Mocked<typeof marketDataModule>;

describe('useRealTimeStocks', () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    });
    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('should fetch stock data successfully', async () => {
    const mockStockData = [
      {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        price: 150.00,
        change: 2.50,
        changePercent: 1.69,
        volume: 1000000,
        marketCap: 2500000000000,
        lastUpdated: new Date().toISOString(),
      },
    ];

    mockedMarketData.fetchBatchQuotes = jest.fn().mockResolvedValue(mockStockData);

    const { result } = renderHook(
      () => useRealTimeStocks(['AAPL'], { enableRealTime: false }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockStockData);
    expect(result.current.error).toBeNull();
    expect(mockedMarketData.fetchBatchQuotes).toHaveBeenCalledWith(['AAPL']);
  });

  it('should handle empty symbols array', async () => {
    const { result } = renderHook(
      () => useRealTimeStocks([], { enableRealTime: false }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual([]);
    expect(mockedMarketData.fetchBatchQuotes).not.toHaveBeenCalled();
  });

  it('should handle API errors gracefully', async () => {
    const mockError = new Error('API Error');
    mockedMarketData.fetchBatchQuotes = jest.fn().mockRejectedValue(mockError);

    const { result } = renderHook(
      () => useRealTimeStocks(['INVALID'], { enableRealTime: false }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBe(mockError);
    expect(result.current.data).toBeUndefined();
  });

  it('should refetch data at specified intervals', async () => {
    const mockStockData = [{ symbol: 'AAPL', price: 150 }];
    mockedMarketData.fetchBatchQuotes = jest.fn().mockResolvedValue(mockStockData);

    jest.useFakeTimers();

    renderHook(
      () => useRealTimeStocks(['AAPL'], { 
        enableRealTime: false,
        refetchInterval: 5000 
      }),
      { wrapper }
    );

    // Initial call
    expect(mockedMarketData.fetchBatchQuotes).toHaveBeenCalledTimes(1);

    // Fast forward 5 seconds
    jest.advanceTimersByTime(5000);

    await waitFor(() => {
      expect(mockedMarketData.fetchBatchQuotes).toHaveBeenCalledTimes(2);
    });

    jest.useRealTimers();
  });

  it('should deduplicate symbols', async () => {
    const mockStockData = [
      { symbol: 'AAPL', price: 150 },
      { symbol: 'GOOGL', price: 2800 },
    ];
    mockedMarketData.fetchBatchQuotes = jest.fn().mockResolvedValue(mockStockData);

    const { result } = renderHook(
      () => useRealTimeStocks(['AAPL', 'GOOGL', 'AAPL'], { enableRealTime: false }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should only call with unique symbols
    expect(mockedMarketData.fetchBatchQuotes).toHaveBeenCalledWith(['AAPL', 'GOOGL']);
  });
});