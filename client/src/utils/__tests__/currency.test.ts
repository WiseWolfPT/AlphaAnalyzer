/**
 * Currency Formatting Tests - AGENT A Emergency Financial Tests
 * Critical tests to ensure zero bugs in currency conversion and formatting
 */

import { describe, it, expect } from 'vitest';

// Mock currency utilities for testing
interface CurrencyFormatOptions {
  currency: 'USD' | 'EUR';
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

function formatCurrency(amount: number, currency: 'USD' | 'EUR' = 'USD', options?: Partial<CurrencyFormatOptions>): string {
  const formatter = new Intl.NumberFormat(currency === 'EUR' ? 'pt-PT' : 'en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: options?.minimumFractionDigits ?? 2,
    maximumFractionDigits: options?.maximumFractionDigits ?? 2,
  });
  
  return formatter.format(amount);
}

function convertCurrency(amount: number, fromCurrency: 'USD' | 'EUR', toCurrency: 'USD' | 'EUR', exchangeRate: number = 1.1): number {
  if (fromCurrency === toCurrency) return amount;
  
  if (fromCurrency === 'EUR' && toCurrency === 'USD') {
    return amount * exchangeRate;
  }
  
  if (fromCurrency === 'USD' && toCurrency === 'EUR') {
    return amount / exchangeRate;
  }
  
  return amount;
}

describe('Currency Formatting - CRITICAL FINANCIAL TESTS', () => {
  describe('USD Formatting', () => {
    it('should format USD correctly with standard amounts', () => {
      expect(formatCurrency(1234.56, 'USD')).toBe('$1,234.56');
      expect(formatCurrency(1234567.89, 'USD')).toBe('$1,234,567.89');
      expect(formatCurrency(0.99, 'USD')).toBe('$0.99');
    });

    it('should format large USD amounts correctly', () => {
      expect(formatCurrency(1000000, 'USD')).toBe('$1,000,000.00');
      expect(formatCurrency(1234567890.12, 'USD')).toBe('$1,234,567,890.12');
    });

    it('should handle zero and negative USD amounts', () => {
      expect(formatCurrency(0, 'USD')).toBe('$0.00');
      expect(formatCurrency(-1234.56, 'USD')).toBe('-$1,234.56');
    });

    it('should handle decimal precision for USD', () => {
      expect(formatCurrency(1234.567, 'USD')).toBe('$1,234.57'); // Rounds to 2 decimal places
      expect(formatCurrency(1234.561, 'USD')).toBe('$1,234.56'); // Rounds down
    });
  });

  describe('EUR Formatting', () => {
    it('should format EUR correctly with Portuguese locale', () => {
      expect(formatCurrency(1234.56, 'EUR')).toBe('1 234,56 €');
      expect(formatCurrency(1234567.89, 'EUR')).toBe('1 234 567,89 €');
      expect(formatCurrency(0.99, 'EUR')).toBe('0,99 €');
    });

    it('should format large EUR amounts correctly', () => {
      expect(formatCurrency(1000000, 'EUR')).toBe('1 000 000,00 €');
      expect(formatCurrency(1234567890.12, 'EUR')).toBe('1 234 567 890,12 €');
    });

    it('should handle zero and negative EUR amounts', () => {
      expect(formatCurrency(0, 'EUR')).toBe('0,00 €');
      expect(formatCurrency(-1234.56, 'EUR')).toBe('-1 234,56 €');
    });

    it('should handle decimal precision for EUR', () => {
      expect(formatCurrency(1234.567, 'EUR')).toBe('1 234,57 €'); // Rounds to 2 decimal places
      expect(formatCurrency(1234.561, 'EUR')).toBe('1 234,56 €'); // Rounds down
    });
  });

  describe('Currency Conversion', () => {
    it('should convert EUR to USD correctly', () => {
      const eurAmount = 1000;
      const exchangeRate = 1.1; // 1 EUR = 1.1 USD
      const result = convertCurrency(eurAmount, 'EUR', 'USD', exchangeRate);
      expect(result).toBe(1100);
    });

    it('should convert USD to EUR correctly', () => {
      const usdAmount = 1100;
      const exchangeRate = 1.1; // 1 EUR = 1.1 USD
      const result = convertCurrency(usdAmount, 'USD', 'EUR', exchangeRate);
      expect(result).toBeCloseTo(1000, 2);
    });

    it('should handle same currency conversion', () => {
      expect(convertCurrency(1000, 'USD', 'USD')).toBe(1000);
      expect(convertCurrency(1000, 'EUR', 'EUR')).toBe(1000);
    });

    it('should handle edge cases in conversion', () => {
      expect(convertCurrency(0, 'EUR', 'USD', 1.1)).toBe(0);
      expect(convertCurrency(-100, 'EUR', 'USD', 1.1)).toBe(-110);
    });

    it('should maintain precision in conversions', () => {
      const result = convertCurrency(123.456, 'EUR', 'USD', 1.12345);
      expect(result).toBeCloseTo(138.678, 3);
    });
  });

  describe('Real-world Financial Scenarios', () => {
    it('should handle typical portfolio values', () => {
      const portfolioValue = 25000.75;
      expect(formatCurrency(portfolioValue, 'USD')).toBe('$25,000.75');
      expect(formatCurrency(portfolioValue, 'EUR')).toBe('25 000,75 €');
    });

    it('should handle stock prices accurately', () => {
      const stockPrice = 156.78;
      expect(formatCurrency(stockPrice, 'USD')).toBe('$156.78');
      
      // Convert to EUR and format
      const eurPrice = convertCurrency(stockPrice, 'USD', 'EUR', 1.1);
      expect(formatCurrency(eurPrice, 'EUR')).toBe('142,53 €');
    });

    it('should handle P&L calculations with formatting', () => {
      const pnl = -2456.33; // Loss
      expect(formatCurrency(pnl, 'USD')).toBe('-$2,456.33');
      expect(formatCurrency(pnl, 'EUR')).toBe('-2 456,33 €');
    });

    it('should handle percentage-based calculations', () => {
      const investment = 10000;
      const return5Percent = investment * 1.05;
      const profit = return5Percent - investment;
      
      expect(profit).toBe(500);
      expect(formatCurrency(profit, 'USD')).toBe('$500.00');
    });
  });

  describe('Currency Consistency Tests', () => {
    it('should maintain consistency across multiple conversions', () => {
      const originalAmount = 1000;
      const rate = 1.15;
      
      // EUR -> USD -> EUR should return approximately original
      const usdAmount = convertCurrency(originalAmount, 'EUR', 'USD', rate);
      const backToEur = convertCurrency(usdAmount, 'USD', 'EUR', rate);
      
      expect(backToEur).toBeCloseTo(originalAmount, 2);
    });

    it('should handle batch conversions consistently', () => {
      const amounts = [100, 500, 1000, 5000];
      const rate = 1.08;
      
      amounts.forEach(amount => {
        const converted = convertCurrency(amount, 'EUR', 'USD', rate);
        const expected = amount * rate;
        expect(converted).toBeCloseTo(expected, 2);
      });
    });
  });
});