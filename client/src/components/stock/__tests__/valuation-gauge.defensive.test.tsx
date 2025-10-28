import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ValuationGauge } from '../valuation-gauge';

/**
 * TDD PHASE: Test Suite for .toFixed() Defensive Programming
 *
 * This test suite validates that ValuationGauge handles null/undefined values
 * without crashing, per CLAUDE.md rule #8.
 *
 * Bug Context:
 * - Lines 362, 369, 388 call .toFixed() on potentially null values
 * - Crash discovered in FASE 4 Chrome DevTools testing
 * - Impact: ALL bank stocks crash when clicking "Show All Methods"
 */
describe('ValuationGauge - Defensive Programming', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });
  describe('.toFixed() null safety', () => {
    it('should handle null intrinsic value (iv) without crashing', () => {
      // ARRANGE: Mock props with null IV (line 362 crash scenario)
      const props = {
        iv: null as any, // Simulating null from API
        price: 100,
        method: 'DCF',
      };

      // ACT & ASSERT: Should render without throwing
      expect(() => {
        render(<ValuationGauge {...props} />);
      }).not.toThrow();

      // Verify component renders with fallback value
      expect(screen.getByText(/Intrinsic Value/i)).toBeInTheDocument();
    });

    it('should handle null current price without crashing', () => {
      // ARRANGE: Mock props with null price (line 369 crash scenario)
      const props = {
        iv: 200,
        price: null as any, // Simulating null from API
        method: 'DCF',
      };

      // ACT & ASSERT: Should render without throwing
      expect(() => {
        render(<ValuationGauge {...props} />);
      }).not.toThrow();

      // Verify component renders with fallback value
      expect(screen.getByText(/Current Price/i)).toBeInTheDocument();
    });

    it('should handle both null values without crashing', () => {
      // ARRANGE: Mock props with both null (worst case scenario)
      const props = {
        iv: null as any,
        price: null as any,
        method: 'DCF',
      };

      // ACT & ASSERT: Should render without throwing
      expect(() => {
        render(<ValuationGauge {...props} />);
      }).not.toThrow();
    });

    it('should handle undefined intrinsic value without crashing', () => {
      // ARRANGE: Mock props with undefined IV
      const props = {
        iv: undefined as any,
        price: 100,
        method: 'DCF',
      };

      // ACT & ASSERT: Should render without throwing
      expect(() => {
        render(<ValuationGauge {...props} />);
      }).not.toThrow();
    });

    it('should display $0.00 for null intrinsic value', () => {
      // ARRANGE: Mock props with null IV
      const props = {
        iv: null as any,
        price: 100,
        method: 'DCF',
      };

      // ACT
      render(<ValuationGauge {...props} />);

      // ASSERT: Should display $0.00 as fallback
      expect(screen.getByText(/\$0\.00/)).toBeInTheDocument();
    });

    it('should display $0.00 for null current price', () => {
      // ARRANGE: Mock props with null price
      const props = {
        iv: 200,
        price: null as any,
        method: 'DCF',
      };

      // ACT
      render(<ValuationGauge {...props} />);

      // ASSERT: Should display $0.00 as fallback
      expect(screen.getByText(/\$0\.00/)).toBeInTheDocument();
    });

    it('should display correct discount percentage with valid values', () => {
      // ARRANGE: Mock props with valid values (control test)
      const props = {
        iv: 200,
        price: 100,
        method: 'DCF',
      };

      // ACT
      render(<ValuationGauge {...props} />);

      // ASSERT: Should display +100.0% discount
      expect(screen.getByText(/\+100\.0%/)).toBeInTheDocument();
    });

    it('should handle NaN values gracefully', () => {
      // ARRANGE: Mock props that could produce NaN
      const props = {
        iv: NaN,
        price: 100,
        method: 'DCF',
      };

      // ACT & ASSERT: Should render without throwing
      expect(() => {
        render(<ValuationGauge {...props} />);
      }).not.toThrow();
    });

    it('should handle negative zero without crashing', () => {
      // ARRANGE: Edge case with -0
      const props = {
        iv: -0,
        price: 100,
        method: 'DCF',
      };

      // ACT & ASSERT: Should render without throwing
      expect(() => {
        render(<ValuationGauge {...props} />);
      }).not.toThrow();
    });
  });

  describe('Integration with "Show All Methods" scenario', () => {
    it('should handle bank stock scenario (JPM with null DCF values)', () => {
      // ARRANGE: Simulate bank stock clicking "Show All Methods"
      // This is the exact scenario that caused production crashes
      const bankStockProps = {
        iv: null as any, // Banks often have null DCF intrinsic values
        price: 210.45, // Real JPM price
        method: 'DCF',
      };

      // ACT & ASSERT: Should not crash
      expect(() => {
        render(<ValuationGauge {...bankStockProps} />);
      }).not.toThrow();

      // Verify user sees something meaningful
      expect(screen.getByText(/Valuation Gauge/i)).toBeInTheDocument();
    });
  });
});
