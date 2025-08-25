/**
 * Formatting Utility Tests
 * Testing number, currency, percentage, and date formatting functions
 */

import { describe, it, expect } from 'vitest';

// Formatting utility functions
export const formatNumber = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '0';
  return new Intl.NumberFormat('en-US').format(value);
};

export const formatCurrency = (
  value: number | null | undefined,
  currency: string = 'USD'
): string => {
  if (value === null || value === undefined) return '$0.00';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

export const formatPercentage = (
  value: number | null | undefined,
  decimals: number = 2
): string => {
  if (value === null || value === undefined) return '0.00%';
  return `${value.toFixed(decimals)}%`;
};

export const formatMarketCap = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '$0';
  
  const billion = 1000000000;
  const million = 1000000;
  const thousand = 1000;
  
  if (value >= billion) {
    return `$${(value / billion).toFixed(2)}B`;
  } else if (value >= million) {
    return `$${(value / million).toFixed(2)}M`;
  } else if (value >= thousand) {
    return `$${(value / thousand).toFixed(2)}K`;
  }
  
  return formatCurrency(value);
};

export const formatVolume = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '0';
  
  const million = 1000000;
  const thousand = 1000;
  
  if (value >= million) {
    return `${(value / million).toFixed(2)}M`;
  } else if (value >= thousand) {
    return `${(value / thousand).toFixed(2)}K`;
  }
  
  return formatNumber(value);
};

export const formatDate = (
  date: string | Date | null | undefined,
  format: 'short' | 'long' | 'time' = 'short'
): string => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) return '';
  
  switch (format) {
    case 'long':
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    case 'time':
      return dateObj.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    default:
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
  }
};

export const formatPriceChange = (
  change: number | null | undefined,
  changePercent: number | null | undefined
): { text: string; color: string; isPositive: boolean } => {
  if (change === null || change === undefined || changePercent === null || changePercent === undefined) {
    return {
      text: '$0.00 (0.00%)',
      color: 'text-gray-400',
      isPositive: false
    };
  }
  
  const isPositive = change >= 0;
  const sign = isPositive ? '+' : '';
  const color = isPositive ? 'text-green-500' : 'text-red-500';
  const text = `${sign}${formatCurrency(Math.abs(change))} (${sign}${formatPercentage(Math.abs(changePercent))})`;
  
  return { text, color, isPositive };
};

describe('Formatting Utilities', () => {
  describe('formatNumber', () => {
    it('should format numbers with thousand separators', () => {
      expect(formatNumber(1000)).toBe('1,000');
      expect(formatNumber(1000000)).toBe('1,000,000');
      expect(formatNumber(1234567.89)).toBe('1,234,568');
    });

    it('should handle zero', () => {
      expect(formatNumber(0)).toBe('0');
    });

    it('should handle negative numbers', () => {
      expect(formatNumber(-1000)).toBe('-1,000');
      expect(formatNumber(-1234567)).toBe('-1,234,567');
    });

    it('should handle null and undefined', () => {
      expect(formatNumber(null)).toBe('0');
      expect(formatNumber(undefined)).toBe('0');
    });

    it('should handle decimal numbers', () => {
      expect(formatNumber(1234.56)).toBe('1,235');
      expect(formatNumber(0.123)).toBe('0');
    });
  });

  describe('formatCurrency', () => {
    it('should format USD currency correctly', () => {
      expect(formatCurrency(100)).toBe('$100.00');
      expect(formatCurrency(1234.56)).toBe('$1,234.56');
      expect(formatCurrency(0.99)).toBe('$0.99');
    });

    it('should format EUR currency correctly', () => {
      expect(formatCurrency(100, 'EUR')).toContain('100');
      expect(formatCurrency(1234.56, 'EUR')).toContain('1,234.56');
    });

    it('should handle negative values', () => {
      expect(formatCurrency(-100)).toBe('-$100.00');
      expect(formatCurrency(-1234.56)).toBe('-$1,234.56');
    });

    it('should handle null and undefined', () => {
      expect(formatCurrency(null)).toBe('$0.00');
      expect(formatCurrency(undefined)).toBe('$0.00');
    });

    it('should round to 2 decimal places', () => {
      expect(formatCurrency(100.999)).toBe('$101.00');
      expect(formatCurrency(100.001)).toBe('$100.00');
      expect(formatCurrency(100.555)).toBe('$100.56');
    });
  });

  describe('formatPercentage', () => {
    it('should format percentages with default 2 decimals', () => {
      expect(formatPercentage(10)).toBe('10.00%');
      expect(formatPercentage(0.5)).toBe('0.50%');
      expect(formatPercentage(99.99)).toBe('99.99%');
    });

    it('should format with custom decimal places', () => {
      expect(formatPercentage(10.12345, 0)).toBe('10%');
      expect(formatPercentage(10.12345, 1)).toBe('10.1%');
      expect(formatPercentage(10.12345, 3)).toBe('10.123%');
    });

    it('should handle negative percentages', () => {
      expect(formatPercentage(-5.25)).toBe('-5.25%');
      expect(formatPercentage(-0.01)).toBe('-0.01%');
    });

    it('should handle null and undefined', () => {
      expect(formatPercentage(null)).toBe('0.00%');
      expect(formatPercentage(undefined)).toBe('0.00%');
    });
  });

  describe('formatMarketCap', () => {
    it('should format billions', () => {
      expect(formatMarketCap(1000000000)).toBe('$1.00B');
      expect(formatMarketCap(2500000000000)).toBe('$2500.00B');
      expect(formatMarketCap(1234567890000)).toBe('$1234.57B');
    });

    it('should format millions', () => {
      expect(formatMarketCap(1000000)).toBe('$1.00M');
      expect(formatMarketCap(999999999)).toBe('$1000.00M');
      expect(formatMarketCap(50500000)).toBe('$50.50M');
    });

    it('should format thousands', () => {
      expect(formatMarketCap(1000)).toBe('$1.00K');
      expect(formatMarketCap(999999)).toBe('$1000.00K');
      expect(formatMarketCap(12345)).toBe('$12.35K');
    });

    it('should format small values as currency', () => {
      expect(formatMarketCap(999)).toBe('$999.00');
      expect(formatMarketCap(1.5)).toBe('$1.50');
    });

    it('should handle null and undefined', () => {
      expect(formatMarketCap(null)).toBe('$0');
      expect(formatMarketCap(undefined)).toBe('$0');
    });
  });

  describe('formatVolume', () => {
    it('should format millions', () => {
      expect(formatVolume(1000000)).toBe('1.00M');
      expect(formatVolume(52000000)).toBe('52.00M');
      expect(formatVolume(1234567)).toBe('1.23M');
    });

    it('should format thousands', () => {
      expect(formatVolume(1000)).toBe('1.00K');
      expect(formatVolume(999999)).toBe('1000.00K');
      expect(formatVolume(12345)).toBe('12.35K');
    });

    it('should format small values as numbers', () => {
      expect(formatVolume(999)).toBe('999');
      expect(formatVolume(1)).toBe('1');
    });

    it('should handle null and undefined', () => {
      expect(formatVolume(null)).toBe('0');
      expect(formatVolume(undefined)).toBe('0');
    });
  });

  describe('formatDate', () => {
    const testDate = '2024-01-15T10:30:00Z';
    
    it('should format short date', () => {
      const result = formatDate(testDate, 'short');
      expect(result).toMatch(/01\/15\/2024/);
    });

    it('should format long date', () => {
      const result = formatDate(testDate, 'long');
      expect(result).toContain('January');
      expect(result).toContain('15');
      expect(result).toContain('2024');
    });

    it('should format with time', () => {
      const result = formatDate(testDate, 'time');
      expect(result).toContain('Jan');
      expect(result).toContain('15');
      expect(result).toContain('2024');
      // Time will vary based on timezone
    });

    it('should handle Date objects', () => {
      const date = new Date('2024-01-15');
      const result = formatDate(date, 'short');
      expect(result).toMatch(/01\/15\/2024/);
    });

    it('should handle null and undefined', () => {
      expect(formatDate(null)).toBe('');
      expect(formatDate(undefined)).toBe('');
    });

    it('should handle invalid dates', () => {
      expect(formatDate('invalid-date')).toBe('');
      expect(formatDate('2024-13-45')).toBe('');
    });
  });

  describe('formatPriceChange', () => {
    it('should format positive changes', () => {
      const result = formatPriceChange(1.24, 0.68);
      expect(result.text).toBe('+$1.24 (+0.68%)');
      expect(result.color).toBe('text-green-500');
      expect(result.isPositive).toBe(true);
    });

    it('should format negative changes', () => {
      const result = formatPriceChange(-2.15, -0.56);
      expect(result.text).toBe('-$2.15 (-0.56%)');
      expect(result.color).toBe('text-red-500');
      expect(result.isPositive).toBe(false);
    });

    it('should handle zero change', () => {
      const result = formatPriceChange(0, 0);
      expect(result.text).toBe('+$0.00 (+0.00%)');
      expect(result.color).toBe('text-green-500');
      expect(result.isPositive).toBe(true);
    });

    it('should handle null and undefined', () => {
      const result1 = formatPriceChange(null, 0.5);
      expect(result1.text).toBe('$0.00 (0.00%)');
      expect(result1.color).toBe('text-gray-400');
      
      const result2 = formatPriceChange(1.5, undefined);
      expect(result2.text).toBe('$0.00 (0.00%)');
      expect(result2.color).toBe('text-gray-400');
    });

    it('should format large changes correctly', () => {
      const result = formatPriceChange(123.45, 15.67);
      expect(result.text).toBe('+$123.45 (+15.67%)');
      expect(result.isPositive).toBe(true);
    });
  });
});