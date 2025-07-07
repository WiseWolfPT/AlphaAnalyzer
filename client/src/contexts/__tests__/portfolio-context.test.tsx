/**
 * Portfolio Context Tests - AGENT A Emergency Financial Tests
 * Critical tests to ensure zero bugs in portfolio calculations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, renderHook, act } from '@testing-library/react';
import { ReactNode } from 'react';
import { PortfolioProvider, usePortfolio } from '../portfolio-context';
import { CurrencyProvider } from '../currency-context';

// Test wrapper with providers
const AllProviders = ({ children }: { children: ReactNode }) => (
  <CurrencyProvider>
    <PortfolioProvider>
      {children}
    </PortfolioProvider>
  </CurrencyProvider>
);

describe('Portfolio Calculations - CRITICAL FINANCIAL TESTS', () => {
  describe('Portfolio Value Calculations', () => {
    it('should calculate total value correctly in USD', () => {
      const { result } = renderHook(() => usePortfolio(), {
        wrapper: AllProviders
      });

      act(() => {
        // Add test holdings
        result.current.addHolding({
          symbol: 'AAPL',
          quantity: 10,
          averagePrice: 150,
          currentPrice: 155,
          currency: 'USD'
        });
        
        result.current.addHolding({
          symbol: 'MSFT',
          quantity: 5,
          averagePrice: 280,
          currentPrice: 300,
          currency: 'USD'
        });
      });

      // Expected: (10 * 155) + (5 * 300) = 1550 + 1500 = 3050
      expect(result.current.totalValue).toBe(3050);
    });

    it('should calculate P&L correctly for gains and losses', () => {
      const { result } = renderHook(() => usePortfolio(), {
        wrapper: AllProviders
      });

      act(() => {
        // Profitable position
        result.current.addHolding({
          symbol: 'AAPL',
          quantity: 10,
          averagePrice: 150, // Bought at $150
          currentPrice: 155, // Now at $155
          currency: 'USD'
        });
        
        // Loss position
        result.current.addHolding({
          symbol: 'TSLA',
          quantity: 5,
          averagePrice: 250, // Bought at $250
          currentPrice: 240, // Now at $240
          currency: 'USD'
        });
      });

      const totalCost = (10 * 150) + (5 * 250); // 1500 + 1250 = 2750
      const currentValue = (10 * 155) + (5 * 240); // 1550 + 1200 = 2750
      const expectedPnL = currentValue - totalCost; // 2750 - 2750 = 0

      expect(result.current.totalPnL).toBe(expectedPnL);
    });

    it('should handle EUR to USD conversion correctly', () => {
      const { result } = renderHook(() => usePortfolio(), {
        wrapper: AllProviders
      });

      act(() => {
        // EUR holding that should be converted to USD
        result.current.addHolding({
          symbol: 'SAP',
          quantity: 10,
          averagePrice: 100,
          currentPrice: 110,
          currency: 'EUR'
        });
      });

      // With 1 EUR = 1.1 USD exchange rate (default in context)
      // Expected: 10 * 110 * 1.1 = 1210 USD
      expect(result.current.totalValue).toBeCloseTo(1210, 1);
    });

    it('should handle zero and negative values gracefully', () => {
      const { result } = renderHook(() => usePortfolio(), {
        wrapper: AllProviders
      });

      act(() => {
        result.current.addHolding({
          symbol: 'TEST',
          quantity: 0,
          averagePrice: 100,
          currentPrice: 100,
          currency: 'USD'
        });
        
        // Test that we don't add holdings with negative quantities
        try {
          result.current.addHolding({
            symbol: 'NEG',
            quantity: -5,
            averagePrice: 50,
            currentPrice: 50,
            currency: 'USD'
          });
        } catch (error) {
          // Should throw an error for negative quantities
          expect(error).toBeDefined();
        }
      });

      // Zero quantity should result in zero value
      expect(result.current.totalValue).toBe(0);
    });

    it('should maintain calculation accuracy with large numbers', () => {
      const { result } = renderHook(() => usePortfolio(), {
        wrapper: AllProviders
      });

      act(() => {
        result.current.addHolding({
          symbol: 'BRK.A',
          quantity: 1,
          averagePrice: 500000,
          currentPrice: 525000,
          currency: 'USD'
        });
      });

      expect(result.current.totalValue).toBe(525000);
      expect(result.current.totalPnL).toBe(25000);
    });

    it('should handle decimal quantities correctly', () => {
      const { result } = renderHook(() => usePortfolio(), {
        wrapper: AllProviders
      });

      act(() => {
        result.current.addHolding({
          symbol: 'BTC',
          quantity: 0.5,
          averagePrice: 50000,
          currentPrice: 55000,
          currency: 'USD'
        });
      });

      // 0.5 * 55000 = 27500
      expect(result.current.totalValue).toBe(27500);
      // P&L: (0.5 * 55000) - (0.5 * 50000) = 27500 - 25000 = 2500
      expect(result.current.totalPnL).toBe(2500);
    });
  });

  describe('Portfolio Performance Calculations', () => {
    it('should calculate percentage returns correctly', () => {
      const { result } = renderHook(() => usePortfolio(), {
        wrapper: AllProviders
      });

      act(() => {
        result.current.addHolding({
          symbol: 'AAPL',
          quantity: 10,
          averagePrice: 100, // Invested $1000
          currentPrice: 110, // Worth $1100
          currency: 'USD'
        });
      });

      // 10% gain expected
      expect(result.current.totalReturnPercentage).toBeCloseTo(10, 2);
    });

    it('should handle negative returns correctly', () => {
      const { result } = renderHook(() => usePortfolio(), {
        wrapper: AllProviders
      });

      act(() => {
        result.current.addHolding({
          symbol: 'AAPL',
          quantity: 10,
          averagePrice: 100, // Invested $1000
          currentPrice: 90,  // Worth $900
          currency: 'USD'
        });
      });

      // -10% loss expected
      expect(result.current.totalReturnPercentage).toBeCloseTo(-10, 2);
    });
  });

  describe('Portfolio Edge Cases', () => {
    it('should handle empty portfolio', () => {
      const { result } = renderHook(() => usePortfolio(), {
        wrapper: AllProviders
      });

      expect(result.current.totalValue).toBe(0);
      expect(result.current.totalPnL).toBe(0);
      expect(result.current.totalReturnPercentage).toBe(0);
      expect(result.current.holdings).toHaveLength(0);
    });

    it('should handle removal of holdings', () => {
      const { result } = renderHook(() => usePortfolio(), {
        wrapper: AllProviders
      });

      act(() => {
        result.current.addHolding({
          symbol: 'AAPL',
          quantity: 10,
          averagePrice: 100,
          currentPrice: 110,
          currency: 'USD'
        });
      });

      expect(result.current.totalValue).toBe(1100);

      act(() => {
        result.current.removeHolding('AAPL');
      });

      expect(result.current.totalValue).toBe(0);
      expect(result.current.holdings).toHaveLength(0);
    });
  });
});