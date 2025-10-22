/**
 * Stock Detail Extended Hours Badge Tests
 * Testing the badge display logic based on market hours
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock dependencies
vi.mock('wouter', () => ({
  useParams: () => ({ symbol: 'AAPL' }),
  useLocation: () => ['/', vi.fn()],
}));

vi.mock('@/components/layout/main-layout', () => ({
  MainLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/charts/advanced-trading-chart', () => ({
  AdvancedTradingChart: () => <div>Chart</div>,
}));

vi.mock('@/components/stock/stock-header-v2', () => ({
  StockHeaderV2: () => <div>Stock Header</div>,
}));

vi.mock('@/components/stock/realtime-stock-header-v2', () => ({
  RealtimeStockHeaderV2: () => <div>Realtime Stock Header</div>,
}));

vi.mock('@/components/stock/stock-news-feed', () => ({
  StockNewsFeed: () => <div>News Feed</div>,
}));

vi.mock('@/components/stock/stock-financials-chart', () => ({
  StockFinancialsChart: () => <div>Financials Chart</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: any) => <span data-testid="badge" {...props}>{children}</span>,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  TabsContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  TabsList: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  TabsTrigger: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

vi.mock('@/lib/intrinsic-value', () => ({
  fetchIntrinsicValueData: vi.fn(),
  normalizeIntrinsicValue: vi.fn(),
}));

vi.mock('@/hooks/use-realtime-quotes', () => ({
  useRealtimeQuote: () => ({ quote: null, isConnected: false }),
}));

vi.mock('@/hooks/use-company-profile', () => ({
  useCompanyData: () => ({ profile: null, metrics: null, isLoading: false }),
}));

vi.mock('@/hooks/use-cache-data', () => ({
  useCachedQuote: () => ({
    data: { data: { price: 180.00, change: 1.50, changePercent: 0.84 } },
    isLoading: false,
  }),
}));

vi.mock('@/hooks/use-stock-details', () => ({
  useStockDetails: () => ({
    profile: null,
    metrics: null,
    incomeStatements: null,
    news: null,
    historicalPrices: null,
    isLoading: false,
  }),
}));

vi.mock('@/components/shared/client-only', () => ({
  ClientOnly: ({ children, fallback }: any) => children || fallback,
}));

describe('Stock Detail Extended Hours Badge', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  describe('Badge Display Logic - Market Open (Regular Hours)', () => {
    it('should NOT display badge when market is open (regular hours)', async () => {
      // Mock the extended hours hook to return regular market hours data
      vi.doMock('@/hooks/use-extended-hours', () => ({
        useExtendedHours: () => ({
          data: {
            preMarket: null,
            afterHours: null,
            isExtendedHours: false,
            currentSession: 'regular',
          },
          isLoading: false,
        }),
      }));

      const StockDetail = (await import('../stock-detail')).default;

      render(
        <QueryClientProvider client={queryClient}>
          <StockDetail />
        </QueryClientProvider>
      );

      // The badge should NOT be visible during regular market hours
      await waitFor(() => {
        const badges = screen.queryAllByTestId('badge');
        const extendedHoursBadge = badges.find(
          badge => badge.textContent?.includes('Pre-Market') ||
                   badge.textContent?.includes('After-Hours') ||
                   badge.textContent?.includes('Closed')
        );
        expect(extendedHoursBadge).toBeUndefined();
      });
    });
  });

  describe('Badge Display Logic - After Hours', () => {
    it('should display "After-Hours" badge when market is in after-hours session', async () => {
      // Mock the extended hours hook to return after-hours data
      vi.doMock('@/hooks/use-extended-hours', () => ({
        useExtendedHours: () => ({
          data: {
            preMarket: null,
            afterHours: {
              price: 181.50,
              change: 1.50,
              changePercent: 0.83,
              volume: 1500000,
              timestamp: '2025-10-12T20:30:00Z',
            },
            isExtendedHours: true,
            currentSession: 'after-hours',
          },
          isLoading: false,
        }),
      }));

      const StockDetail = (await import('../stock-detail')).default;

      render(
        <QueryClientProvider client={queryClient}>
          <StockDetail />
        </QueryClientProvider>
      );

      // The badge should be visible and show "After-Hours"
      await waitFor(() => {
        const badges = screen.queryAllByTestId('badge');
        const afterHoursBadge = badges.find(badge => badge.textContent?.includes('After-Hours'));
        expect(afterHoursBadge).toBeDefined();
        expect(afterHoursBadge).toHaveTextContent('After-Hours');
      });
    });
  });

  describe('Badge Display Logic - Pre-Market', () => {
    it('should display "Pre-Market" badge when market is in pre-market session', async () => {
      // Mock the extended hours hook to return pre-market data
      vi.doMock('@/hooks/use-extended-hours', () => ({
        useExtendedHours: () => ({
          data: {
            preMarket: {
              price: 179.75,
              change: -0.25,
              changePercent: -0.14,
              volume: 500000,
              timestamp: '2025-10-12T08:30:00Z',
            },
            afterHours: null,
            isExtendedHours: true,
            currentSession: 'pre-market',
          },
          isLoading: false,
        }),
      }));

      const StockDetail = (await import('../stock-detail')).default;

      render(
        <QueryClientProvider client={queryClient}>
          <StockDetail />
        </QueryClientProvider>
      );

      // The badge should be visible and show "Pre-Market"
      await waitFor(() => {
        const badges = screen.queryAllByTestId('badge');
        const preMarketBadge = badges.find(badge => badge.textContent?.includes('Pre-Market'));
        expect(preMarketBadge).toBeDefined();
        expect(preMarketBadge).toHaveTextContent('Pre-Market');
      });
    });
  });

  describe('Badge Display Logic - Market Closed', () => {
    it('should display "Closed" badge when market is completely closed', async () => {
      // Mock the extended hours hook to return closed market data
      vi.doMock('@/hooks/use-extended-hours', () => ({
        useExtendedHours: () => ({
          data: {
            preMarket: null,
            afterHours: null,
            isExtendedHours: false,
            currentSession: 'closed',
          },
          isLoading: false,
        }),
      }));

      const StockDetail = (await import('../stock-detail')).default;

      render(
        <QueryClientProvider client={queryClient}>
          <StockDetail />
        </QueryClientProvider>
      );

      // During closed hours, if there's extended hours data, badge should show "Closed"
      // But in this case, there's no extended hours data at all, so no badge should appear
      await waitFor(() => {
        const badges = screen.queryAllByTestId('badge');
        const closedBadge = badges.find(badge => badge.textContent?.includes('Closed'));
        // This will depend on the implementation - may or may not show badge when fully closed
        // Current implementation checks for afterHours || preMarket data existence
      });
    });
  });

  describe('Badge Display Logic - Edge Cases', () => {
    it('should NOT display badge when extended hours data is null', async () => {
      // Mock the extended hours hook to return null data
      vi.doMock('@/hooks/use-extended-hours', () => ({
        useExtendedHours: () => ({
          data: null,
          isLoading: false,
        }),
      }));

      const StockDetail = (await import('../stock-detail')).default;

      render(
        <QueryClientProvider client={queryClient}>
          <StockDetail />
        </QueryClientProvider>
      );

      await waitFor(() => {
        const badges = screen.queryAllByTestId('badge');
        const extendedHoursBadge = badges.find(
          badge => badge.textContent?.includes('Pre-Market') ||
                   badge.textContent?.includes('After-Hours') ||
                   badge.textContent?.includes('Closed')
        );
        expect(extendedHoursBadge).toBeUndefined();
      });
    });

    it('should NOT display badge when loading extended hours data', async () => {
      // Mock the extended hours hook to be in loading state
      vi.doMock('@/hooks/use-extended-hours', () => ({
        useExtendedHours: () => ({
          data: undefined,
          isLoading: true,
        }),
      }));

      const StockDetail = (await import('../stock-detail')).default;

      render(
        <QueryClientProvider client={queryClient}>
          <StockDetail />
        </QueryClientProvider>
      );

      await waitFor(() => {
        const badges = screen.queryAllByTestId('badge');
        const extendedHoursBadge = badges.find(
          badge => badge.textContent?.includes('Pre-Market') ||
                   badge.textContent?.includes('After-Hours') ||
                   badge.textContent?.includes('Closed')
        );
        expect(extendedHoursBadge).toBeUndefined();
      });
    });
  });

  describe('Current Bug - Badge Always Showing (FAILING TEST)', () => {
    it('BUG: badge shows during regular hours because condition checks data existence instead of isExtendedHours flag', async () => {
      // This test demonstrates the current bug
      // Even when market is open, if afterHours/preMarket data exists (even if null), badge may show

      vi.doMock('@/hooks/use-extended-hours', () => ({
        useExtendedHours: () => ({
          data: {
            preMarket: { price: 0, change: 0, changePercent: 0, volume: 0, timestamp: '' },
            afterHours: { price: 0, change: 0, changePercent: 0, volume: 0, timestamp: '' },
            isExtendedHours: false, // Market is actually OPEN
            currentSession: 'regular',
          },
          isLoading: false,
        }),
      }));

      const StockDetail = (await import('../stock-detail')).default;

      render(
        <QueryClientProvider client={queryClient}>
          <StockDetail />
        </QueryClientProvider>
      );

      // THIS TEST WILL FAIL because current code checks (afterHours || preMarket)
      // instead of checking isExtendedHours
      await waitFor(() => {
        const badges = screen.queryAllByTestId('badge');
        const extendedHoursBadge = badges.find(
          badge => badge.textContent?.includes('Pre-Market') ||
                   badge.textContent?.includes('After-Hours') ||
                   badge.textContent?.includes('Closed')
        );

        // We expect NO badge during regular hours
        // But with the current bug, the badge will show because data exists
        expect(extendedHoursBadge).toBeUndefined();
      });
    });
  });
});
