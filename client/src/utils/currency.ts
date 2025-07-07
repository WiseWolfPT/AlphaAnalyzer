/**
 * Currency formatting utilities for Alfalyzer
 * Ensures consistent formatting across the application
 */

export type Currency = 'USD' | 'EUR';

interface CurrencyFormatOptions {
  currency: Currency;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

/**
 * Format currency amount with proper locale-specific formatting
 * EUR uses Portuguese (pt-PT) locale with forced thousand separators
 * USD uses English (en-US) locale
 */
export function formatCurrency(
  amount: number, 
  currency: Currency = 'USD', 
  options?: Partial<CurrencyFormatOptions>
): string {
  if (currency === 'USD') {
    // Use standard US formatting
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: options?.minimumFractionDigits ?? 2,
      maximumFractionDigits: options?.maximumFractionDigits ?? 2,
    });
    return formatter.format(amount);
  }
  
  // For EUR, we need custom logic to ensure proper spacing
  const isNegative = amount < 0;
  const absoluteAmount = Math.abs(amount);
  
  // Format the number with proper decimal places
  const rounded = Number(absoluteAmount.toFixed(options?.maximumFractionDigits ?? 2));
  const integerPart = Math.floor(rounded);
  const decimalPart = Math.round((rounded - integerPart) * 100);
  
  // Add spaces as thousand separators for integers >= 1000
  let formattedInteger = integerPart.toString();
  if (integerPart >= 1000) {
    formattedInteger = formattedInteger.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }
  
  // Format decimal part with comma as decimal separator
  const formattedDecimal = decimalPart.toString().padStart(2, '0');
  
  // Construct the final string
  const sign = isNegative ? '-' : '';
  return `${sign}${formattedInteger},${formattedDecimal} €`;
}

/**
 * Convert between currencies using exchange rate
 */
export function convertCurrency(
  amount: number, 
  fromCurrency: Currency, 
  toCurrency: Currency, 
  exchangeRate: number = 1.1
): number {
  if (fromCurrency === toCurrency) return amount;
  
  let result: number;
  
  if (fromCurrency === 'EUR' && toCurrency === 'USD') {
    result = amount * exchangeRate;
  } else if (fromCurrency === 'USD' && toCurrency === 'EUR') {
    result = amount / exchangeRate;
  } else {
    result = amount;
  }
  
  // Round to avoid floating point precision issues, keep more precision for calculations
  return Math.round(result * 100000) / 100000;
}