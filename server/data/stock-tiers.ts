/**
 * AGENT 12: Smart Warming Tiers Configuration
 *
 * Implements 3-tier warming strategy to optimize cache freshness vs API usage:
 *
 * Tier 1 (HOT - S&P 100): 100 stocks
 * - Refresh: Every 5 minutes during market hours, 30 minutes after close
 * - Reason: Most viewed stocks, require real-time data
 * - Priority: 10 (highest)
 *
 * Tier 2 (WARM - S&P 500): 400 stocks
 * - Refresh: Every 30 minutes during market hours, 2 hours after close
 * - Reason: Frequently viewed, but not critical real-time
 * - Priority: 5 (medium)
 *
 * Tier 3 (COLD - Extended): 993 stocks
 * - Refresh: On-demand only (24h TTL, earnings-driven)
 * - Reason: Rarely viewed, waste of bandwidth
 * - Priority: 1 (low)
 *
 * Expected Impact:
 * - API calls reduced by ~60% (focus on popular stocks)
 * - Tier 1: Always fresh (<5 min old during market hours)
 * - Tier 2: Semi-fresh (<30 min old during market hours)
 * - Tier 3: On-demand (triggered by user views or earnings)
 */

import { logger } from '../lib/logger';

/**
 * Tier definition with refresh intervals and priority
 */
export interface TierConfig {
  name: string;
  description: string;
  refreshIntervalMarketHours: number; // milliseconds
  refreshIntervalAfterHours: number;  // milliseconds
  priority: number; // 1-10 (10 = highest)
  stocks: string[];
}

/**
 * S&P 100 Tickers (Tier 1: HOT)
 * Top 100 US stocks by market cap - Most viewed
 */
const SP100_TICKERS = [
  // Technology (30 stocks)
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'ADBE', 'NFLX', 'CRM',
  'CSCO', 'INTC', 'AMD', 'ORCL', 'QCOM', 'TXN', 'AVGO', 'NOW', 'INTU', 'PYPL',
  'IBM', 'AMAT', 'MU', 'ADI', 'LRCX', 'KLAC', 'SNPS', 'CDNS', 'MRVL', 'FTNT',

  // Healthcare (15 stocks)
  'JNJ', 'UNH', 'PFE', 'ABBV', 'TMO', 'ABT', 'MRK', 'LLY', 'BMY', 'DHR',
  'AMGN', 'GILD', 'ISRG', 'SYK', 'MDT',

  // Financials (15 stocks)
  'JPM', 'BAC', 'WFC', 'V', 'MA', 'GS', 'MS', 'BLK', 'SCHW', 'C',
  'AXP', 'USB', 'PNC', 'SPGI', 'COF',

  // Consumer Discretionary (10 stocks)
  'HD', 'MCD', 'NKE', 'SBUX', 'TGT', 'LOW', 'BKNG', 'MAR', 'YUM', 'CMG',

  // Consumer Staples (8 stocks)
  'WMT', 'PG', 'KO', 'PEP', 'COST', 'MDLZ', 'CL', 'MO',

  // Energy (7 stocks)
  'XOM', 'CVX', 'COP', 'SLB', 'EOG', 'PXD', 'VLO',

  // Industrials (8 stocks)
  'BA', 'CAT', 'UPS', 'HON', 'RTX', 'DE', 'MMM', 'GE',

  // Communication Services (4 stocks)
  'DIS', 'CMCSA', 'VZ', 'T',

  // Real Estate (3 stocks)
  'AMT', 'PLD', 'SPG'
];

/**
 * S&P 500 additional tickers (Tier 2: WARM)
 * ~400 stocks from S&P 500 excluding S&P 100
 * Full list to be loaded from stock_universe_complete.csv
 */
const SP500_ADDITIONAL_SAMPLE = [
  // Large Cap Tech
  'PANW', 'DDOG', 'CRWD', 'ZS', 'SNOW', 'WDAY', 'TEAM', 'DOCU', 'ZM', 'OKTA',

  // Large Cap Healthcare
  'CI', 'CVS', 'HUM', 'ANTM', 'REGN', 'VRTX', 'BIIB', 'IDXX', 'IQV', 'A',

  // Large Cap Financials
  'AIG', 'TFC', 'BK', 'STT', 'TROW', 'FITB', 'MTB', 'KEY', 'RF', 'CFG',

  // Large Cap Consumer
  'TJX', 'LULU', 'RCL', 'CCL', 'NCLH', 'HLT', 'WYNN', 'LVS', 'MGM', 'DRI',

  // ... (remaining ~370 stocks loaded from CSV)
];

/**
 * Tier configuration with dynamic refresh intervals
 */
export const STOCK_TIERS: Record<'tier1_hot' | 'tier2_warm' | 'tier3_cold', TierConfig> = {
  tier1_hot: {
    name: 'Tier 1: HOT (S&P 100)',
    description: 'Most popular stocks, real-time requirement',
    refreshIntervalMarketHours: 5 * 60 * 1000,   // 5 minutes during market hours
    refreshIntervalAfterHours: 30 * 60 * 1000,   // 30 minutes after hours
    priority: 10,
    stocks: SP100_TICKERS
  },

  tier2_warm: {
    name: 'Tier 2: WARM (S&P 500)',
    description: 'Popular stocks, semi-real-time',
    refreshIntervalMarketHours: 30 * 60 * 1000,  // 30 minutes during market hours
    refreshIntervalAfterHours: 2 * 60 * 60 * 1000, // 2 hours after hours
    priority: 5,
    stocks: SP500_ADDITIONAL_SAMPLE // Will be populated from CSV loader
  },

  tier3_cold: {
    name: 'Tier 3: COLD (Extended Universe)',
    description: 'On-demand only, long TTL, earnings-driven',
    refreshIntervalMarketHours: 24 * 60 * 60 * 1000, // 24 hours (on-demand)
    refreshIntervalAfterHours: 24 * 60 * 60 * 1000,  // 24 hours (on-demand)
    priority: 1,
    stocks: [] // Populated dynamically from universe loader
  }
};

/**
 * Get tier for a given stock symbol
 *
 * @param symbol - Stock ticker (e.g., 'AAPL')
 * @returns Tier name
 */
export function getStockTier(symbol: string): 'tier1_hot' | 'tier2_warm' | 'tier3_cold' {
  const upperSymbol = symbol.toUpperCase().trim();

  // Check Tier 1 (S&P 100)
  if (STOCK_TIERS.tier1_hot.stocks.includes(upperSymbol)) {
    return 'tier1_hot';
  }

  // Check Tier 2 (S&P 500)
  if (STOCK_TIERS.tier2_warm.stocks.includes(upperSymbol)) {
    return 'tier2_warm';
  }

  // Default to Tier 3 (Extended)
  return 'tier3_cold';
}

/**
 * Get refresh interval for a stock symbol (dynamic based on market hours)
 *
 * @param symbol - Stock ticker
 * @param isMarketOpen - Whether US market is currently open
 * @returns Refresh interval in milliseconds
 */
export function getRefreshInterval(symbol: string, isMarketOpen: boolean): number {
  const tier = getStockTier(symbol);
  const config = STOCK_TIERS[tier];

  return isMarketOpen
    ? config.refreshIntervalMarketHours
    : config.refreshIntervalAfterHours;
}

/**
 * Get priority for a stock symbol
 *
 * @param symbol - Stock ticker
 * @returns Priority (1-10, 10 = highest)
 */
export function getStockPriority(symbol: string): number {
  const tier = getStockTier(symbol);
  return STOCK_TIERS[tier].priority;
}

/**
 * Check if stock should be warmed based on last warmed timestamp
 *
 * @param symbol - Stock ticker
 * @param lastWarmed - Last warmed timestamp (Date or null)
 * @param isMarketOpen - Whether US market is currently open
 * @returns true if stock needs warming
 */
export function shouldWarm(symbol: string, lastWarmed: Date | null, isMarketOpen: boolean): boolean {
  if (!lastWarmed) {
    return true; // Never warmed, always warm
  }

  const refreshInterval = getRefreshInterval(symbol, isMarketOpen);
  const timeSinceWarmed = Date.now() - lastWarmed.getTime();

  return timeSinceWarmed >= refreshInterval;
}

/**
 * Get tier statistics
 *
 * @returns Tier stats with stock counts and intervals
 */
export function getTierStats(): {
  tier1_hot: { count: number; refreshMin: number; refreshMax: number };
  tier2_warm: { count: number; refreshMin: number; refreshMax: number };
  tier3_cold: { count: number; refreshMin: number; refreshMax: number };
  total: number;
} {
  return {
    tier1_hot: {
      count: STOCK_TIERS.tier1_hot.stocks.length,
      refreshMin: STOCK_TIERS.tier1_hot.refreshIntervalMarketHours / 60000, // minutes
      refreshMax: STOCK_TIERS.tier1_hot.refreshIntervalAfterHours / 60000
    },
    tier2_warm: {
      count: STOCK_TIERS.tier2_warm.stocks.length,
      refreshMin: STOCK_TIERS.tier2_warm.refreshIntervalMarketHours / 60000,
      refreshMax: STOCK_TIERS.tier2_warm.refreshIntervalAfterHours / 60000
    },
    tier3_cold: {
      count: STOCK_TIERS.tier3_cold.stocks.length,
      refreshMin: STOCK_TIERS.tier3_cold.refreshIntervalMarketHours / 60000,
      refreshMax: STOCK_TIERS.tier3_cold.refreshIntervalAfterHours / 60000
    },
    total: STOCK_TIERS.tier1_hot.stocks.length +
           STOCK_TIERS.tier2_warm.stocks.length +
           STOCK_TIERS.tier3_cold.stocks.length
  };
}

/**
 * Initialize Tier 2 and Tier 3 stocks from universe loader
 * Called once during worker startup
 *
 * @param sp100 - S&P 100 tickers from universe loader
 * @param sp500 - S&P 500 tickers from universe loader
 * @param extended - Extended universe tickers from universe loader
 */
export function initializeTiers(sp100: string[], sp500: string[], extended: string[]): void {
  logger.info('[StockTiers] Initializing tiers from universe loader...');

  // Tier 1: Keep hardcoded S&P 100 (guaranteed coverage)
  // Filter to only include tickers that exist in loaded universe
  const validSP100 = STOCK_TIERS.tier1_hot.stocks.filter(ticker => sp100.includes(ticker));
  STOCK_TIERS.tier1_hot.stocks = validSP100;

  // Tier 2: S&P 500 minus S&P 100
  const tier2Tickers = sp500.filter(ticker => !validSP100.includes(ticker));
  STOCK_TIERS.tier2_warm.stocks = tier2Tickers;

  // Tier 3: Extended universe (minus Tier 1 and Tier 2)
  const tier3Tickers = extended.filter(ticker =>
    !validSP100.includes(ticker) && !tier2Tickers.includes(ticker)
  );
  STOCK_TIERS.tier3_cold.stocks = tier3Tickers;

  const stats = getTierStats();
  logger.info('[StockTiers] Tiers initialized:', {
    tier1_hot: `${stats.tier1_hot.count} stocks (${stats.tier1_hot.refreshMin}-${stats.tier1_hot.refreshMax} min)`,
    tier2_warm: `${stats.tier2_warm.count} stocks (${stats.tier2_warm.refreshMin}-${stats.tier2_warm.refreshMax} min)`,
    tier3_cold: `${stats.tier3_cold.count} stocks (${stats.tier3_cold.refreshMin} min on-demand)`,
    total: stats.total
  });
}

/**
 * Get stocks by tier (for selective warming)
 *
 * @param tier - Tier name
 * @returns Array of stock tickers
 */
export function getStocksByTier(tier: 'tier1_hot' | 'tier2_warm' | 'tier3_cold'): string[] {
  return [...STOCK_TIERS[tier].stocks]; // Return copy to prevent mutations
}

/**
 * Get all stocks needing refresh (based on last warmed timestamps)
 *
 * @param lastWarmedMap - Map of ticker → last warmed Date
 * @param isMarketOpen - Whether US market is currently open
 * @returns Array of tickers needing refresh, sorted by priority
 */
export function getStocksNeedingRefresh(
  lastWarmedMap: Map<string, Date | null>,
  isMarketOpen: boolean
): string[] {
  const needsRefresh: Array<{ ticker: string; priority: number }> = [];

  // Check all tracked tickers
  for (const [ticker, lastWarmed] of lastWarmedMap.entries()) {
    if (shouldWarm(ticker, lastWarmed, isMarketOpen)) {
      needsRefresh.push({
        ticker,
        priority: getStockPriority(ticker)
      });
    }
  }

  // Sort by priority (descending) then by staleness
  needsRefresh.sort((a, b) => {
    if (a.priority !== b.priority) {
      return b.priority - a.priority; // Higher priority first
    }

    // If same priority, prioritize never-warmed over stale
    const aLastWarmed = lastWarmedMap.get(a.ticker);
    const bLastWarmed = lastWarmedMap.get(b.ticker);

    if (!aLastWarmed && bLastWarmed) return -1;
    if (aLastWarmed && !bLastWarmed) return 1;
    if (!aLastWarmed && !bLastWarmed) return 0;

    // Both warmed: prioritize stalest
    return aLastWarmed.getTime() - bLastWarmed.getTime();
  });

  return needsRefresh.map(item => item.ticker);
}

/**
 * Calculate expected API calls per day for tiered strategy
 *
 * Assumptions:
 * - Market hours: 6.5 hours/day (9:30 AM - 4:00 PM ET)
 * - After hours: 17.5 hours/day
 * - 12 methods per stock
 *
 * @returns Expected API calls per day
 */
export function calculateExpectedApiCalls(): {
  tier1: number;
  tier2: number;
  tier3: number;
  total: number;
  reduction: number; // % reduction vs warming all stocks hourly
} {
  const METHODS_PER_STOCK = 12;
  const MARKET_HOURS_PER_DAY = 6.5;
  const AFTER_HOURS_PER_DAY = 17.5;

  const tier1Count = STOCK_TIERS.tier1_hot.stocks.length;
  const tier2Count = STOCK_TIERS.tier2_warm.stocks.length;
  const tier3Count = STOCK_TIERS.tier3_cold.stocks.length;
  const totalStocks = tier1Count + tier2Count + tier3Count;

  // Tier 1: 5 min intervals during market, 30 min after hours
  const tier1MarketCycles = Math.floor((MARKET_HOURS_PER_DAY * 60) / 5);
  const tier1AfterCycles = Math.floor((AFTER_HOURS_PER_DAY * 60) / 30);
  const tier1CallsPerDay = tier1Count * METHODS_PER_STOCK * (tier1MarketCycles + tier1AfterCycles);

  // Tier 2: 30 min intervals during market, 2 hour after hours
  const tier2MarketCycles = Math.floor((MARKET_HOURS_PER_DAY * 60) / 30);
  const tier2AfterCycles = Math.floor((AFTER_HOURS_PER_DAY * 60) / 120);
  const tier2CallsPerDay = tier2Count * METHODS_PER_STOCK * (tier2MarketCycles + tier2AfterCycles);

  // Tier 3: On-demand only (assume 1 refresh per day for active stocks, 10% active)
  const tier3CallsPerDay = (tier3Count * 0.1) * METHODS_PER_STOCK * 1;

  const totalCallsPerDay = tier1CallsPerDay + tier2CallsPerDay + tier3CallsPerDay;

  // Baseline: All stocks warmed every hour
  const baselineCallsPerDay = totalStocks * METHODS_PER_STOCK * 24;
  const reduction = ((baselineCallsPerDay - totalCallsPerDay) / baselineCallsPerDay) * 100;

  return {
    tier1: Math.round(tier1CallsPerDay),
    tier2: Math.round(tier2CallsPerDay),
    tier3: Math.round(tier3CallsPerDay),
    total: Math.round(totalCallsPerDay),
    reduction: Math.round(reduction * 100) / 100
  };
}

/**
 * Export constants for configuration
 */
export const StockTiersConfig = {
  TIER1_COUNT: SP100_TICKERS.length,
  TIER2_SAMPLE_COUNT: SP500_ADDITIONAL_SAMPLE.length,
  METHODS_PER_STOCK: 12,
  SP100_TICKERS, // Export for reference
};
