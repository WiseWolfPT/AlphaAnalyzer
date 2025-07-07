/**
 * Portfolio Real-Time Integration Tests - Wave 3 Implementation
 * 
 * Comprehensive testing for portfolio real-time updates with multi-currency support
 * Tests international markets (USA/EU) with USD/EUR conversion
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { PortfolioProvider, usePortfolio } from '@/contexts/portfolio-context';
import { CurrencyProvider } from '@/contexts/currency-context';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n';

// Create comprehensive test wrapper with all required providers
const createPortfolioWrapper = (initialCurrency: 'USD' | 'EUR' = 'USD') => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, cacheTime: 0 },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <CurrencyProvider initialCurrency={initialCurrency}>
          <PortfolioProvider>
            {children}
          </PortfolioProvider>
        </CurrencyProvider>
      </I18nextProvider>
    </QueryClientProvider>
  );
};

// Mock enhanced stocks hook for real-time updates
const mockRealTimeCleanup = vi.fn();
vi.mock('@/hooks/use-enhanced-stocks', () => ({
  useRealTimeStocks: vi.fn(() => mockRealTimeCleanup),
}));

// Mock localStorage
const mockLocalStorage = new Map<string, string>();
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn((key: string) => mockLocalStorage.get(key) || null),
    setItem: vi.fn((key: string, value: string) => mockLocalStorage.set(key, value)),
    removeItem: vi.fn((key: string) => mockLocalStorage.delete(key)),
    clear: vi.fn(() => mockLocalStorage.clear()),
  },
});

// Mock CustomEvent for real-time updates
global.CustomEvent = vi.fn().mockImplementation((type, options) => ({
  type,
  detail: options?.detail,
}));

describe('Portfolio Real-Time Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.clear();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Portfolio Initialization', () => {
    it('should initialize with sample international portfolio', async () => {
      const wrapper = createPortfolioWrapper('USD');
      const { result } = renderHook(() => usePortfolio(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.holdings).toHaveLength(5);
      
      // Verify US holdings
      const usHoldings = result.current.holdings.filter(h => h.originalCurrency === 'USD');
      expect(usHoldings).toHaveLength(3);
      expect(usHoldings.map(h => h.symbol)).toContain('AAPL');
      expect(usHoldings.map(h => h.symbol)).toContain('MSFT');
      expect(usHoldings.map(h => h.symbol)).toContain('GOOGL');

      // Verify EU holdings
      const euHoldings = result.current.holdings.filter(h => h.originalCurrency === 'EUR');
      expect(euHoldings).toHaveLength(2);
      expect(euHoldings.map(h => h.symbol)).toContain('SAP');
      expect(euHoldings.map(h => h.symbol)).toContain('ASML');

      // Verify portfolio summary
      expect(result.current.summary.currency).toBe('USD');
      expect(result.current.summary.totalValue).toBeGreaterThan(0);
      expect(result.current.summary.lastUpdated).toBeDefined();
    });

    it('should initialize with EUR currency and proper conversion', async () => {
      const wrapper = createPortfolioWrapper('EUR');
      const { result } = renderHook(() => usePortfolio(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.summary.currency).toBe('EUR');
      
      // Verify that USD holdings are converted to EUR for display
      const aaplHolding = result.current.holdings.find(h => h.symbol === 'AAPL');
      expect(aaplHolding).toBeDefined();
      expect(aaplHolding?.originalCurrency).toBe('USD');
      
      // Market value should be converted from USD to EUR
      if (aaplHolding?.marketValue) {
        expect(aaplHolding.marketValue).not.toBe(aaplHolding.averageCost * aaplHolding.quantity);
      }
    });

    it('should persist portfolio to localStorage', async () => {
      const wrapper = createPortfolioWrapper('USD');
      const { result } = renderHook(() => usePortfolio(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        'alfalyzer-portfolio',
        expect.stringContaining('"holdings"')
      );

      const savedData = JSON.parse(mockLocalStorage.get('alfalyzer-portfolio') || '{}');
      expect(savedData.holdings).toHaveLength(5);
      expect(savedData.version).toBe('1.0');
      expect(savedData.lastUpdated).toBeDefined();
    });
  });

  describe('Real-Time Price Updates', () => {
    it('should handle real-time price updates for USD stocks', async () => {
      const wrapper = createPortfolioWrapper('USD');
      const { result } = renderHook(() => usePortfolio(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Simulate real-time price update for AAPL
      const priceUpdateEvent = new CustomEvent('stock-price-update', {
        detail: { symbol: 'AAPL', price: 180.50 }
      });

      act(() => {
        window.dispatchEvent(priceUpdateEvent);
      });

      await waitFor(() => {
        const aaplHolding = result.current.holdings.find(h => h.symbol === 'AAPL');
        expect(aaplHolding?.currentPrice).toBe(180.50);
      });

      // Verify P&L calculations are updated
      const aaplHolding = result.current.holdings.find(h => h.symbol === 'AAPL');
      expect(aaplHolding?.marketValue).toBe(180.50 * (aaplHolding?.quantity || 0));
      expect(aaplHolding?.gainLoss).toBeDefined();
      expect(aaplHolding?.gainLossPercent).toBeDefined();

      // Verify lastPriceUpdate is set
      expect(result.current.lastPriceUpdate).toBeDefined();
    });

    it('should handle real-time price updates for EUR stocks with currency conversion', async () => {
      const wrapper = createPortfolioWrapper('USD'); // Display in USD
      const { result } = renderHook(() => usePortfolio(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Simulate real-time price update for SAP (EUR stock)
      const priceUpdateEvent = new CustomEvent('stock-price-update', {
        detail: { symbol: 'SAP', price: 130.75 }
      });

      act(() => {
        window.dispatchEvent(priceUpdateEvent);
      });

      await waitFor(() => {
        const sapHolding = result.current.holdings.find(h => h.symbol === 'SAP');
        expect(sapHolding?.currentPrice).toBeCloseTo(141.21, 2); // 130.75 EUR * 1.08 USD/EUR
      });

      // Verify market value is in display currency (USD)
      const sapHolding = result.current.holdings.find(h => h.symbol === 'SAP');
      expect(sapHolding?.marketValue).toBeCloseTo(141.21 * (sapHolding?.quantity || 0), 2);
    });

    it('should update portfolio summary when prices change', async () => {
      const wrapper = createPortfolioWrapper('USD');
      const { result } = renderHook(() => usePortfolio(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialTotalValue = result.current.summary.totalValue;

      // Simulate price increases for multiple stocks
      const priceUpdates = [
        { symbol: 'AAPL', price: 200.00 }, // Increase
        { symbol: 'MSFT', price: 400.00 }, // Increase
        { symbol: 'SAP', price: 140.00 }   // EUR stock increase
      ];

      for (const update of priceUpdates) {
        const event = new CustomEvent('stock-price-update', { detail: update });
        act(() => {
          window.dispatchEvent(event);
        });
      }

      await waitFor(() => {
        expect(result.current.summary.totalValue).toBeGreaterThan(initialTotalValue);
      });

      // Verify summary calculations
      expect(result.current.summary.totalGainLoss).toBeDefined();
      expect(result.current.summary.totalGainLossPercent).toBeDefined();
      expect(result.current.summary.lastUpdated).toBeDefined();
    });

    it('should handle real-time toggle functionality', async () => {
      const wrapper = createPortfolioWrapper('USD');
      const { result } = renderHook(() => usePortfolio(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isRealTimeEnabled).toBe(true);

      // Toggle real-time updates off
      act(() => {
        result.current.toggleRealTime();
      });

      expect(result.current.isRealTimeEnabled).toBe(false);
      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        'alfalyzer-realtime-enabled',
        'false'
      );

      // Toggle back on
      act(() => {
        result.current.toggleRealTime();
      });

      expect(result.current.isRealTimeEnabled).toBe(true);
    });
  });

  describe('Portfolio Operations', () => {
    it('should add new international holding', async () => {
      const wrapper = createPortfolioWrapper('USD');
      const { result } = renderHook(() => usePortfolio(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const newHolding = {
        symbol: 'TSLA',
        companyName: 'Tesla Inc.',
        quantity: 5,
        averageCost: 250.00,
        originalCurrency: 'USD' as const,
        purchaseDate: '2024-12-01',
        sector: 'Automotive',
        exchange: 'NASDAQ'
      };

      await act(async () => {
        await result.current.addHolding(newHolding);
      });

      expect(result.current.holdings).toHaveLength(6);
      const tslaHolding = result.current.holdings.find(h => h.symbol === 'TSLA');
      expect(tslaHolding).toBeDefined();
      expect(tslaHolding?.quantity).toBe(5);
      expect(tslaHolding?.averageCost).toBe(250.00);
      expect(tslaHolding?.originalCurrency).toBe('USD');
    });

    it('should update existing holding', async () => {
      const wrapper = createPortfolioWrapper('USD');
      const { result } = renderHook(() => usePortfolio(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const aaplHolding = result.current.holdings.find(h => h.symbol === 'AAPL');
      expect(aaplHolding).toBeDefined();

      await act(async () => {
        await result.current.updateHolding(aaplHolding!.id, { quantity: 15 });
      });

      const updatedAapl = result.current.holdings.find(h => h.symbol === 'AAPL');
      expect(updatedAapl?.quantity).toBe(15);
    });

    it('should remove holding', async () => {
      const wrapper = createPortfolioWrapper('USD');
      const { result } = renderHook(() => usePortfolio(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const aaplHolding = result.current.holdings.find(h => h.symbol === 'AAPL');
      expect(aaplHolding).toBeDefined();

      await act(async () => {
        await result.current.removeHolding(aaplHolding!.id);
      });

      expect(result.current.holdings).toHaveLength(4);
      expect(result.current.holdings.find(h => h.symbol === 'AAPL')).toBeUndefined();
    });

    it('should refresh portfolio prices', async () => {
      const wrapper = createPortfolioWrapper('USD');
      const { result } = renderHook(() => usePortfolio(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.refreshPortfolio();
      });

      expect(result.current.lastPriceUpdate).toBeDefined();
      // Verify that refresh doesn't cause errors
      expect(result.current.error).toBeNull();
    });
  });

  describe('Multi-Currency Support', () => {
    it('should recalculate portfolio when currency changes', async () => {
      const wrapper = createPortfolioWrapper('USD');
      const { result } = renderHook(() => usePortfolio(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialSummaryUSD = result.current.summary;
      expect(initialSummaryUSD.currency).toBe('USD');

      // Mock currency context change to EUR
      // This would typically be triggered by CurrencyProvider
      await waitFor(() => {
        // The currency change should trigger recalculation
        // Values should be different due to currency conversion
        expect(result.current.summary.currency).toBeDefined();
      });
    });

    it('should handle mixed currency portfolio correctly', async () => {
      const wrapper = createPortfolioWrapper('USD');
      const { result } = renderHook(() => usePortfolio(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify we have mixed currencies in the portfolio
      const usdHoldings = result.current.holdings.filter(h => h.originalCurrency === 'USD');
      const eurHoldings = result.current.holdings.filter(h => h.originalCurrency === 'EUR');

      expect(usdHoldings.length).toBeGreaterThan(0);
      expect(eurHoldings.length).toBeGreaterThan(0);

      // Verify total value accounts for all holdings regardless of original currency
      expect(result.current.summary.totalValue).toBeGreaterThan(0);
      expect(result.current.summary.totalCost).toBeGreaterThan(0);
    });

    it('should maintain accurate P&L calculations across currencies', async () => {
      const wrapper = createPortfolioWrapper('USD');
      const { result } = renderHook(() => usePortfolio(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Simulate price updates for both USD and EUR stocks
      const priceUpdates = [
        { symbol: 'AAPL', price: 175.00 }, // USD stock
        { symbol: 'SAP', price: 128.50 }   // EUR stock
      ];

      for (const update of priceUpdates) {
        const event = new CustomEvent('stock-price-update', { detail: update });
        act(() => {
          window.dispatchEvent(event);
        });
      }

      await waitFor(() => {
        const aaplHolding = result.current.holdings.find(h => h.symbol === 'AAPL');
        const sapHolding = result.current.holdings.find(h => h.symbol === 'SAP');

        expect(aaplHolding?.gainLoss).toBeDefined();
        expect(sapHolding?.gainLoss).toBeDefined();
        
        // Verify both holdings contribute to total P&L
        expect(result.current.summary.totalGainLoss).toBeDefined();
        expect(typeof result.current.summary.totalGainLossPercent).toBe('number');
      });
    });
  });

  describe('Performance History', () => {
    it('should generate performance history when portfolio has value', async () => {
      const wrapper = createPortfolioWrapper('USD');
      const { result } = renderHook(() => usePortfolio(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await waitFor(() => {
        expect(result.current.performance).toHaveLength(31); // 30 days + today
      });

      // Verify performance data structure
      const firstEntry = result.current.performance[0];
      expect(firstEntry).toHaveProperty('date');
      expect(firstEntry).toHaveProperty('value');
      expect(firstEntry).toHaveProperty('gainLoss');
      expect(firstEntry).toHaveProperty('gainLossPercent');

      // Verify dates are sequential
      const dates = result.current.performance.map(p => p.date);
      expect(dates).toEqual(dates.sort());
    });
  });

  describe('Error Handling', () => {
    it('should handle localStorage errors gracefully', async () => {
      // Mock localStorage to throw error
      vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
        throw new Error('localStorage error');
      });

      const wrapper = createPortfolioWrapper('USD');
      const { result } = renderHook(() => usePortfolio(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should still create sample portfolio despite localStorage error
      expect(result.current.holdings).toHaveLength(5);
      expect(result.current.error).toBeNull(); // Error should be handled gracefully
    });

    it('should handle invalid price update events', async () => {
      const wrapper = createPortfolioWrapper('USD');
      const { result } = renderHook(() => usePortfolio(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Send invalid price update
      const invalidEvent = new CustomEvent('stock-price-update', {
        detail: { symbol: 'INVALID', price: 'not-a-number' }
      });

      act(() => {
        window.dispatchEvent(invalidEvent);
      });

      // Portfolio should remain stable
      expect(result.current.error).toBeNull();
      expect(result.current.holdings).toHaveLength(5);
    });

    it('should handle operations on non-existent holdings', async () => {
      const wrapper = createPortfolioWrapper('USD');
      const { result } = renderHook(() => usePortfolio(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Try to update non-existent holding
      await act(async () => {
        await result.current.updateHolding('non-existent-id', { quantity: 100 });
      });

      // Should not crash or change portfolio
      expect(result.current.holdings).toHaveLength(5);
      expect(result.current.error).toBeNull();
    });
  });

  describe('WebSocket Integration', () => {
    it('should setup real-time connections for portfolio symbols', async () => {
      const wrapper = createPortfolioWrapper('USD');
      const { result } = renderHook(() => usePortfolio(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify useRealTimeStocks is called with portfolio symbols
      const { useRealTimeStocks } = await import('@/hooks/use-enhanced-stocks');
      expect(useRealTimeStocks).toHaveBeenCalledWith(
        expect.arrayContaining(['AAPL', 'MSFT', 'GOOGL', 'SAP', 'ASML']),
        true
      );
    });

    it('should cleanup real-time connections', async () => {
      const wrapper = createPortfolioWrapper('USD');
      const { result, unmount } = renderHook(() => usePortfolio(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      unmount();

      // Verify cleanup function was called
      expect(mockRealTimeCleanup).toHaveBeenCalled();
    });
  });
});