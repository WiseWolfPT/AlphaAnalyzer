import type { Stock } from '@shared/schema';

/**
 * Stock Data Normalizer
 * 
 * Ensures consistent stock data interface across all components.
 * Handles the currentPrice vs price property mismatch.
 */

export interface NormalizedStock extends Omit<Stock, 'price'> {
  currentPrice: number;
  price: number;
}

/**
 * Normalizes stock data to ensure both currentPrice and price are available
 * This handles the data flow inconsistency where some components expect currentPrice
 * and others expect price.
 */
export function normalizeStockData(stock: Partial<Stock>): NormalizedStock {
  if (!stock) {
    throw new Error('Stock data is required for normalization');
  }

  // Determine the current price from available fields
  const currentPrice = Number(
    (stock as any).currentPrice || 
    stock.price || 
    0
  );

  // Create normalized stock with both properties
  const normalizedStock: NormalizedStock = {
    id: stock.id || 0,
    symbol: stock.symbol || '',
    name: stock.name || '',
    price: currentPrice,
    currentPrice: currentPrice,
    change: Number(stock.change || 0),
    changePercent: Number(stock.changePercent || 0),
    marketCap: stock.marketCap || 'N/A',
    sector: stock.sector || null,
    industry: stock.industry || null,
    eps: stock.eps ? Number(stock.eps) : null,
    peRatio: stock.peRatio ? Number(stock.peRatio) : null,
    logo: stock.logo || null,
    lastUpdated: stock.lastUpdated || null,
    // Add any additional properties from the original stock
    ...(stock as any).volume && { volume: Number(stock.volume) },
    ...(stock as any).high52Week && { high52Week: Number((stock as any).high52Week) },
    ...(stock as any).low52Week && { low52Week: Number((stock as any).low52Week) },
    ...(stock as any).intrinsicValue && { intrinsicValue: Number((stock as any).intrinsicValue) },
    ...(stock as any).valuation && { valuation: (stock as any).valuation },
  };

  return normalizedStock;
}

/**
 * Normalizes an array of stock data
 */
export function normalizeStockDataArray(stocks: Partial<Stock>[]): NormalizedStock[] {
  return stocks.map(normalizeStockData);
}

/**
 * Hook utility to normalize stock data from React Query
 */
export function useNormalizedStock(stock: Partial<Stock> | undefined): NormalizedStock | null {
  if (!stock) return null;
  
  try {
    return normalizeStockData(stock);
  } catch (error) {
    console.warn('Failed to normalize stock data:', error);
    return null;
  }
}

/**
 * Validates if stock data has required fields
 */
export function validateStockData(stock: any): boolean {
  return !!(
    stock &&
    stock.symbol &&
    stock.name &&
    (stock.currentPrice || stock.price)
  );
}

/**
 * Gets the display price from stock data (handles both formats)
 */
export function getStockPrice(stock: any): number {
  return Number(stock?.currentPrice || stock?.price || 0);
}

/**
 * Gets the change percentage with proper formatting
 */
export function getStockChangePercent(stock: any): number {
  return Number(stock?.changePercent || 0);
}

/**
 * Gets the change amount with proper formatting
 */
export function getStockChange(stock: any): number {
  return Number(stock?.change || 0);
}

/**
 * Checks if stock is trending up
 */
export function isStockPositive(stock: any): boolean {
  return getStockChangePercent(stock) >= 0;
}

/**
 * Type guard to check if object is a valid stock
 */
export function isValidStock(obj: any): obj is Stock {
  return validateStockData(obj);
}