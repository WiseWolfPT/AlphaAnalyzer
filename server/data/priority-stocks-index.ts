/**
 * Priority Stocks Index
 *
 * Consolidated index of all priority stocks for the intelligent warming system.
 * Includes: US (S&P 500), EU (Top 150), and Chinese ADRs (Top 50).
 *
 * This is the master list that will receive highest priority in cache warming,
 * sector-based warming schedules, and real-time monitoring.
 *
 * Generated: 2025-11-05
 * Total Priority Stocks: ~700
 */

import { US_SP500_STOCKS, ALL_US_SP500, US_SP500_SECTOR_STATS } from './priority-stocks/us-sp500';
import { EU_TOP_STOCKS, ALL_EU_STOCKS, EU_STOCKS_BY_COUNTRY, EU_STOCKS_STATS } from './priority-stocks/eu-top150';
import { CHINA_ADRS_TOP_50, CHINA_ADRS_TOP_50_FLAT, CHINA_ADRS_METADATA } from './priority-stocks/china-adrs';

/**
 * All priority stocks organized by region
 */
export const PRIORITY_STOCKS = {
  us: ALL_US_SP500,                    // 504 stocks
  eu: ALL_EU_STOCKS,                   // 150 stocks
  china: CHINA_ADRS_TOP_50_FLAT        // 50 stocks
};

/**
 * Flattened array of all priority stocks (~700 total)
 */
export const ALL_PRIORITY_STOCKS = [
  ...PRIORITY_STOCKS.us,
  ...PRIORITY_STOCKS.eu,
  ...PRIORITY_STOCKS.china
];

/**
 * Priority stocks organized by GICS sector (11 sectors)
 * Combines US, EU, and Chinese stocks by their sector classification
 */
export const PRIORITY_STOCKS_BY_SECTOR: Record<string, string[]> = {
  'Energy': [
    ...(US_SP500_STOCKS['Energy'] || []),
    ...(EU_TOP_STOCKS['Energy'] || []),
  ],
  'Materials': [
    ...(US_SP500_STOCKS['Materials'] || []),
    ...(EU_TOP_STOCKS['Materials'] || []),
  ],
  'Industrials': [
    ...(US_SP500_STOCKS['Industrials'] || []),
    ...(EU_TOP_STOCKS['Industrials'] || []),
  ],
  'Consumer Discretionary': [
    ...(US_SP500_STOCKS['Consumer Discretionary'] || []),
    ...(EU_TOP_STOCKS['Consumer Discretionary'] || []),
  ],
  'Consumer Staples': [
    ...(US_SP500_STOCKS['Consumer Staples'] || []),
    ...(EU_TOP_STOCKS['Consumer Staples'] || []),
  ],
  'Health Care': [
    ...(US_SP500_STOCKS['Health Care'] || []),
    ...(EU_TOP_STOCKS['Health Care'] || []),
  ],
  'Financials': [
    ...(US_SP500_STOCKS['Financials'] || []),
    ...(EU_TOP_STOCKS['Financials'] || []),
  ],
  'Information Technology': [
    ...(US_SP500_STOCKS['Information Technology'] || []),
    ...(EU_TOP_STOCKS['Information Technology'] || []),
  ],
  'Communication Services': [
    ...(US_SP500_STOCKS['Communication Services'] || []),
    ...(EU_TOP_STOCKS['Communication Services'] || []),
  ],
  'Utilities': [
    ...(US_SP500_STOCKS['Utilities'] || []),
    ...(EU_TOP_STOCKS['Utilities'] || []),
  ],
  'Real Estate': [
    ...(US_SP500_STOCKS['Real Estate'] || []),
    ...(EU_TOP_STOCKS['Real Estate'] || []),
  ]
};

/**
 * Check if a stock is in the priority list
 */
export function isPriorityStock(symbol: string): boolean {
  return ALL_PRIORITY_STOCKS.includes(symbol);
}

/**
 * Get the region for a priority stock
 */
export function getPriorityStockRegion(symbol: string): 'US' | 'EU' | 'China' | null {
  if (PRIORITY_STOCKS.us.includes(symbol)) return 'US';
  if (PRIORITY_STOCKS.eu.includes(symbol)) return 'EU';
  if (PRIORITY_STOCKS.china.includes(symbol)) return 'China';
  return null;
}

/**
 * Get the GICS sector for a priority stock
 */
export function getPriorityStockSector(symbol: string): string | null {
  for (const [sector, stocks] of Object.entries(PRIORITY_STOCKS_BY_SECTOR)) {
    if (stocks.includes(symbol)) {
      return sector;
    }
  }
  return null;
}

/**
 * Get stocks by priority tier (for warming scheduling)
 * - Tier 1: Top 100 US + Top 20 EU + Top 10 China = 130 stocks (highest priority)
 * - Tier 2: Next 200 US + Next 50 EU + Next 20 China = 270 stocks
 * - Tier 3: Remaining stocks = ~300 stocks
 */
export const PRIORITY_TIERS = {
  tier1: [
    ...ALL_US_SP500.slice(0, 100),      // Top 100 S&P 500 (by market cap)
    ...ALL_EU_STOCKS.slice(0, 20),      // Top 20 EU
    ...CHINA_ADRS_TOP_50_FLAT.slice(0, 10)  // Top 10 Chinese ADRs
  ],
  tier2: [
    ...ALL_US_SP500.slice(100, 300),
    ...ALL_EU_STOCKS.slice(20, 70),
    ...CHINA_ADRS_TOP_50_FLAT.slice(10, 30)
  ],
  tier3: [
    ...ALL_US_SP500.slice(300),
    ...ALL_EU_STOCKS.slice(70),
    ...CHINA_ADRS_TOP_50_FLAT.slice(30)
  ]
};

/**
 * Get priority tier for a stock
 */
export function getPriorityTier(symbol: string): 1 | 2 | 3 | null {
  if (PRIORITY_TIERS.tier1.includes(symbol)) return 1;
  if (PRIORITY_TIERS.tier2.includes(symbol)) return 2;
  if (PRIORITY_TIERS.tier3.includes(symbol)) return 3;
  return null;
}

/**
 * Statistics for priority stocks
 */
export const PRIORITY_STOCKS_STATS = {
  total: ALL_PRIORITY_STOCKS.length,
  byRegion: {
    US: PRIORITY_STOCKS.us.length,
    EU: PRIORITY_STOCKS.eu.length,
    China: PRIORITY_STOCKS.china.length
  },
  bySector: {
    'Energy': PRIORITY_STOCKS_BY_SECTOR['Energy'].length,
    'Materials': PRIORITY_STOCKS_BY_SECTOR['Materials'].length,
    'Industrials': PRIORITY_STOCKS_BY_SECTOR['Industrials'].length,
    'Consumer Discretionary': PRIORITY_STOCKS_BY_SECTOR['Consumer Discretionary'].length,
    'Consumer Staples': PRIORITY_STOCKS_BY_SECTOR['Consumer Staples'].length,
    'Health Care': PRIORITY_STOCKS_BY_SECTOR['Health Care'].length,
    'Financials': PRIORITY_STOCKS_BY_SECTOR['Financials'].length,
    'Information Technology': PRIORITY_STOCKS_BY_SECTOR['Information Technology'].length,
    'Communication Services': PRIORITY_STOCKS_BY_SECTOR['Communication Services'].length,
    'Utilities': PRIORITY_STOCKS_BY_SECTOR['Utilities'].length,
    'Real Estate': PRIORITY_STOCKS_BY_SECTOR['Real Estate'].length
  },
  byTier: {
    tier1: PRIORITY_TIERS.tier1.length,
    tier2: PRIORITY_TIERS.tier2.length,
    tier3: PRIORITY_TIERS.tier3.length
  }
};

/**
 * Get priority stocks statistics (function for compatibility)
 */
export function getPriorityStocksStats() {
  return PRIORITY_STOCKS_STATS;
}

/**
 * Export sector and country breakdowns from sub-modules
 */
export {
  US_SP500_STOCKS,
  US_SP500_SECTOR_STATS,
  EU_TOP_STOCKS,
  EU_STOCKS_BY_COUNTRY,
  EU_STOCKS_STATS,
  CHINA_ADRS_TOP_50,
  CHINA_ADRS_METADATA
};
