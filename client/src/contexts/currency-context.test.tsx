/**
 * Currency Context Tests - International Markets (USA/EU)
 * Tests for USD/EUR currency conversion and formatting
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { CurrencyProvider, useCurrency } from './currency-context';

// Test component to access currency context
function TestCurrencyComponent() {
  const { currentCurrency, setCurrency, formatCurrency, convertCurrency } = useCurrency();

  return (
    <div>
      <div data-testid="current-currency">{currentCurrency}</div>
      <div data-testid="formatted-price">{formatCurrency(1000)}</div>
      <div data-testid="converted-price">
        {formatCurrency(convertCurrency(1000, 'USD', 'EUR'), 'EUR')}
      </div>
      <button 
        onClick={() => setCurrency('EUR')}
        data-testid="set-eur"
      >
        Set EUR
      </button>
      <button 
        onClick={() => setCurrency('USD')}
        data-testid="set-usd"
      >
        Set USD
      </button>
    </div>
  );
}

function renderWithCurrencyProvider(children: React.ReactNode) {
  return render(
    <CurrencyProvider>
      {children}
    </CurrencyProvider>
  );
}

describe('CurrencyProvider', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should default to USD when no stored currency', () => {
      renderWithCurrencyProvider(<TestCurrencyComponent />);
      
      expect(screen.getByTestId('current-currency')).toHaveTextContent('USD');
    });

    it('should use stored currency from localStorage', () => {
      localStorage.setItem('alfalyzer-currency', 'EUR');
      
      renderWithCurrencyProvider(<TestCurrencyComponent />);
      
      expect(screen.getByTestId('current-currency')).toHaveTextContent('EUR');
    });

    it('should default to EUR when region is EU', () => {
      localStorage.setItem('aa-region', 'EU');
      
      renderWithCurrencyProvider(<TestCurrencyComponent />);
      
      expect(screen.getByTestId('current-currency')).toHaveTextContent('EUR');
    });

    it('should default to USD when region is USA', () => {
      localStorage.setItem('aa-region', 'USA');
      
      renderWithCurrencyProvider(<TestCurrencyComponent />);
      
      expect(screen.getByTestId('current-currency')).toHaveTextContent('USD');
    });
  });

  describe('currency switching', () => {
    it('should change currency when setCurrency is called', async () => {
      renderWithCurrencyProvider(<TestCurrencyComponent />);
      
      const setEurButton = screen.getByTestId('set-eur');
      
      await act(async () => {
        await userEvent.click(setEurButton);
      });
      
      expect(screen.getByTestId('current-currency')).toHaveTextContent('EUR');
    });

    it('should persist currency change to localStorage', async () => {
      renderWithCurrencyProvider(<TestCurrencyComponent />);
      
      const setEurButton = screen.getByTestId('set-eur');
      
      await act(async () => {
        await userEvent.click(setEurButton);
      });
      
      expect(localStorage.getItem('alfalyzer-currency')).toBe('EUR');
    });
  });

  describe('currency formatting', () => {
    it('should format USD currency correctly', () => {
      renderWithCurrencyProvider(<TestCurrencyComponent />);
      
      const formattedPrice = screen.getByTestId('formatted-price');
      
      // Should format as USD with US locale
      expect(formattedPrice).toHaveTextContent('$1,000.00');
    });

    it('should format EUR currency correctly', async () => {
      renderWithCurrencyProvider(<TestCurrencyComponent />);
      
      const setEurButton = screen.getByTestId('set-eur');
      
      await act(async () => {
        await userEvent.click(setEurButton);
      });
      
      const formattedPrice = screen.getByTestId('formatted-price');
      
      // Should format as EUR with Portuguese locale
      expect(formattedPrice).toHaveTextContent('1.000,00 €');
    });

    it('should handle large numbers correctly', () => {
      renderWithCurrencyProvider(<TestCurrencyComponent />);
      
      const { formatCurrency } = useCurrency();
      const formatted = formatCurrency(1234567.89);
      
      expect(formatted).toMatch(/\$1,234,567\.89/);
    });

    it('should handle zero and negative values', () => {
      renderWithCurrencyProvider(<TestCurrencyComponent />);
      
      const { formatCurrency } = useCurrency();
      
      expect(formatCurrency(0)).toMatch(/\$0\.00/);
      expect(formatCurrency(-100)).toMatch(/-\$100\.00/);
    });
  });

  describe('currency conversion', () => {
    it('should convert USD to EUR correctly', () => {
      renderWithCurrencyProvider(<TestCurrencyComponent />);
      
      const convertedPrice = screen.getByTestId('converted-price');
      
      // 1000 USD * 0.92 EUR/USD = 920 EUR
      expect(convertedPrice).toHaveTextContent('920,00 €');
    });

    it('should return same value for same currency conversion', () => {
      renderWithCurrencyProvider(<TestCurrencyComponent />);
      
      const { convertCurrency } = useCurrency();
      const result = convertCurrency(1000, 'USD', 'USD');
      
      expect(result).toBe(1000);
    });

    it('should handle EUR to USD conversion', () => {
      renderWithCurrencyProvider(<TestCurrencyComponent />);
      
      const { convertCurrency } = useCurrency();
      const result = convertCurrency(1000, 'EUR', 'USD');
      
      // 1000 EUR * 1.08 USD/EUR = 1080 USD
      expect(result).toBe(1080);
    });

    it('should warn for unsupported currency pairs', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      renderWithCurrencyProvider(<TestCurrencyComponent />);
      
      const { convertCurrency } = useCurrency();
      const result = convertCurrency(1000, 'USD', 'GBP' as any);
      
      expect(result).toBe(1000); // Should return original value
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('No conversion rate found for USD to GBP')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('edge cases', () => {
    it('should handle undefined currency gracefully', () => {
      renderWithCurrencyProvider(<TestCurrencyComponent />);
      
      const { formatCurrency } = useCurrency();
      
      // Should not throw error
      expect(() => formatCurrency(100, undefined)).not.toThrow();
    });

    it('should handle very large numbers', () => {
      renderWithCurrencyProvider(<TestCurrencyComponent />);
      
      const { formatCurrency } = useCurrency();
      const result = formatCurrency(Number.MAX_SAFE_INTEGER);
      
      expect(result).toContain('$');
      expect(result).toContain(',');
    });

    it('should handle decimal precision correctly', () => {
      renderWithCurrencyProvider(<TestCurrencyComponent />);
      
      const { formatCurrency } = useCurrency();
      const result = formatCurrency(123.456789);
      
      // Should round to 2 decimal places
      expect(result).toBe('$123.46');
    });
  });

  describe('context provider errors', () => {
    it('should throw error when used outside provider', () => {
      // Test component without provider
      function TestWithoutProvider() {
        const { currentCurrency } = useCurrency();
        return <div>{currentCurrency}</div>;
      }

      // Should throw error
      expect(() => render(<TestWithoutProvider />)).toThrow(
        'useCurrency must be used within a CurrencyProvider'
      );
    });
  });

  describe('i18n integration', () => {
    it('should use correct locale for currency formatting', () => {
      // Mock i18n to return Portuguese language
      const mockUseTranslation = vi.mocked(useTranslation);
      mockUseTranslation.mockReturnValue({
        t: vi.fn(),
        i18n: { language: 'pt' } as any,
      });

      renderWithCurrencyProvider(<TestCurrencyComponent />);
      
      const { formatCurrency } = useCurrency();
      const result = formatCurrency(1000, 'EUR');
      
      // Should use pt-PT locale for EUR formatting
      expect(result).toMatch(/1\.000,00/);
    });
  });

  describe('performance', () => {
    it('should not cause unnecessary re-renders', () => {
      let renderCount = 0;
      
      function TestComponent() {
        renderCount++;
        const { currentCurrency } = useCurrency();
        return <div>{currentCurrency}</div>;
      }
      
      renderWithCurrencyProvider(<TestComponent />);
      
      const initialRenderCount = renderCount;
      
      // Re-render the same component
      renderWithCurrencyProvider(<TestComponent />);
      
      // Should not increase render count significantly
      expect(renderCount).toBeLessThanOrEqual(initialRenderCount + 2);
    });
  });
});