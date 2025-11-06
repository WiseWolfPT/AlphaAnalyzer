/**
 * AGENT 18: Sector-Based Smart Warming Configuration
 *
 * Intelligent warming strategy based on GICS sectors (not generic tiers).
 * Each sector has different volatility, trading activity, and user interest patterns.
 *
 * Architecture:
 * - 11 GICS sectors with differentiated refresh intervals
 * - Market hours vs after-hours scheduling
 * - Priority scoring (1-10, 10 = highest)
 * - Integration with priority stocks index (650 priority stocks)
 *
 * Expected Impact:
 * - Tech stocks: Always fresh (<5 min during market hours)
 * - Defensive sectors: Efficient 30-min refresh cycles
 * - Sector-aware bandwidth allocation
 * - 35-45% API call reduction vs uniform warming
 */

import { Sector } from '../../shared/types/sectors';

export interface SectorWarmingConfig {
  /** Refresh interval during market hours (9:30 AM - 4:00 PM ET) */
  refreshIntervalMarketHours: number; // milliseconds

  /** Refresh interval after market hours */
  refreshIntervalAfterHours: number; // milliseconds

  /** Priority level (1-10, 10 = highest urgency) */
  priority: number;

  /** Reason for this configuration (for logging/monitoring) */
  reason: string;

  /** Whether to skip warming when market is closed */
  marketHoursOnly: boolean;

  /** ETF ticker for sector tracking (e.g., XLK for tech) */
  etfTicker?: string;

  /** Expected volatility class (for monitoring) */
  volatilityClass: 'high' | 'medium' | 'low';
}

/**
 * Sector warming configuration mapping
 * Based on real market behavior, volatility, and user engagement patterns
 */
export const SECTOR_WARMING_CONFIG: Record<string, SectorWarmingConfig> = {
  /**
   * HIGH FREQUENCY SECTORS (Every 5 minutes during market hours)
   * These are the most volatile, actively traded, and user-viewed sectors
   */
  [Sector.INFORMATION_TECHNOLOGY]: {
    refreshIntervalMarketHours: 5 * 60 * 1000,      // 5 min
    refreshIntervalAfterHours: 30 * 60 * 1000,      // 30 min
    priority: 10,
    reason: 'Highest volatility, most user traffic (AAPL, MSFT, NVDA, GOOGL)',
    marketHoursOnly: true,
    etfTicker: 'XLK',
    volatilityClass: 'high'
  },

  [Sector.COMMUNICATION_SERVICES]: {
    refreshIntervalMarketHours: 5 * 60 * 1000,      // 5 min
    refreshIntervalAfterHours: 30 * 60 * 1000,      // 30 min
    priority: 9,
    reason: 'News-driven, active trading (META, GOOGL, DIS, NFLX)',
    marketHoursOnly: true,
    etfTicker: 'XLC',
    volatilityClass: 'high'
  },

  [Sector.CONSUMER_DISCRETIONARY]: {
    refreshIntervalMarketHours: 5 * 60 * 1000,      // 5 min
    refreshIntervalAfterHours: 30 * 60 * 1000,      // 30 min
    priority: 9,
    reason: 'E-commerce, retail activity (AMZN, TSLA, HD, NKE)',
    marketHoursOnly: true,
    etfTicker: 'XLY',
    volatilityClass: 'high'
  },

  /**
   * MEDIUM FREQUENCY SECTORS (Every 15 minutes during market hours)
   * Moderate volatility with steady user interest
   */
  [Sector.FINANCIALS]: {
    refreshIntervalMarketHours: 15 * 60 * 1000,     // 15 min
    refreshIntervalAfterHours: 60 * 60 * 1000,      // 60 min
    priority: 7,
    reason: 'Banks, insurance (JPM, BAC, WFC, GS) - moderate volatility',
    marketHoursOnly: true,
    etfTicker: 'XLF',
    volatilityClass: 'medium'
  },

  [Sector.HEALTHCARE]: {
    refreshIntervalMarketHours: 15 * 60 * 1000,     // 15 min
    refreshIntervalAfterHours: 60 * 60 * 1000,      // 60 min
    priority: 7,
    reason: 'Pharma, biotech (JNJ, PFE, UNH, ABBV)',
    marketHoursOnly: true,
    etfTicker: 'XLV',
    volatilityClass: 'medium'
  },

  [Sector.INDUSTRIALS]: {
    refreshIntervalMarketHours: 15 * 60 * 1000,     // 15 min
    refreshIntervalAfterHours: 60 * 60 * 1000,      // 60 min
    priority: 6,
    reason: 'Manufacturing, steady (BA, CAT, UPS, HON)',
    marketHoursOnly: true,
    etfTicker: 'XLI',
    volatilityClass: 'medium'
  },

  [Sector.CONSUMER_STAPLES]: {
    refreshIntervalMarketHours: 15 * 60 * 1000,     // 15 min
    refreshIntervalAfterHours: 120 * 60 * 1000,     // 2 hours
    priority: 6,
    reason: 'Defensive, stable (PG, KO, WMT, COST)',
    marketHoursOnly: false,  // Can warm after hours (low urgency)
    etfTicker: 'XLP',
    volatilityClass: 'low'
  },

  /**
   * LOW FREQUENCY SECTORS (Every 30 minutes during market hours)
   * Lower volatility, commodity-linked, or defensive stocks
   */
  [Sector.ENERGY]: {
    refreshIntervalMarketHours: 30 * 60 * 1000,     // 30 min
    refreshIntervalAfterHours: 120 * 60 * 1000,     // 2 hours
    priority: 5,
    reason: 'Commodity-linked, slower moves (XOM, CVX, COP)',
    marketHoursOnly: false,
    etfTicker: 'XLE',
    volatilityClass: 'medium'
  },

  [Sector.MATERIALS]: {
    refreshIntervalMarketHours: 30 * 60 * 1000,     // 30 min
    refreshIntervalAfterHours: 120 * 60 * 1000,     // 2 hours
    priority: 5,
    reason: 'Industrial commodities (LIN, APD, SHW)',
    marketHoursOnly: false,
    etfTicker: 'XLB',
    volatilityClass: 'medium'
  },

  [Sector.UTILITIES]: {
    refreshIntervalMarketHours: 30 * 60 * 1000,     // 30 min
    refreshIntervalAfterHours: 120 * 60 * 1000,     // 2 hours
    priority: 4,
    reason: 'Very stable, defensive (NEE, DUK, SO)',
    marketHoursOnly: false,
    etfTicker: 'XLU',
    volatilityClass: 'low'
  },

  [Sector.REAL_ESTATE]: {
    refreshIntervalMarketHours: 30 * 60 * 1000,     // 30 min
    refreshIntervalAfterHours: 120 * 60 * 1000,     // 2 hours
    priority: 4,
    reason: 'REITs, slow-moving (AMT, PLD, SPG)',
    marketHoursOnly: false,
    etfTicker: 'XLRE',
    volatilityClass: 'low'
  },

  /**
   * FALLBACK FOR OTHER/UNKNOWN SECTORS
   * Default to conservative warming strategy
   */
  [Sector.OTHER]: {
    refreshIntervalMarketHours: 60 * 60 * 1000,     // 60 min
    refreshIntervalAfterHours: 120 * 60 * 1000,     // 2 hours
    priority: 1,
    reason: 'Unknown/other sectors - conservative approach',
    marketHoursOnly: false,
    etfTicker: undefined,
    volatilityClass: 'low'
  }
};

/**
 * Get refresh interval for a sector (dynamic based on market hours)
 *
 * @param sector - GICS sector name
 * @param isMarketOpen - Whether US market is currently open
 * @returns Refresh interval in milliseconds
 */
export function getRefreshIntervalForSector(sector: string, isMarketOpen: boolean): number {
  const config = SECTOR_WARMING_CONFIG[sector];

  if (!config) {
    // Fallback to conservative 60-min interval
    return isMarketOpen ? 60 * 60 * 1000 : 120 * 60 * 1000;
  }

  return isMarketOpen
    ? config.refreshIntervalMarketHours
    : config.refreshIntervalAfterHours;
}

/**
 * Get priority score for a sector
 *
 * @param sector - GICS sector name
 * @returns Priority (1-10, 10 = highest)
 */
export function getSectorPriority(sector: string): number {
  return SECTOR_WARMING_CONFIG[sector]?.priority || 1;
}

/**
 * Check if sector should only be warmed during market hours
 *
 * @param sector - GICS sector name
 * @returns true if market-hours-only
 */
export function isMarketHoursOnly(sector: string): boolean {
  return SECTOR_WARMING_CONFIG[sector]?.marketHoursOnly ?? true;
}

/**
 * Get sector configuration reason (for logging/monitoring)
 *
 * @param sector - GICS sector name
 * @returns Reason string
 */
export function getSectorReason(sector: string): string {
  return SECTOR_WARMING_CONFIG[sector]?.reason || 'Unknown sector';
}

/**
 * Get volatility class for a sector
 *
 * @param sector - GICS sector name
 * @returns Volatility class
 */
export function getSectorVolatility(sector: string): 'high' | 'medium' | 'low' {
  return SECTOR_WARMING_CONFIG[sector]?.volatilityClass || 'low';
}

/**
 * Calculate expected API calls per day for sector-based strategy
 *
 * Assumptions:
 * - Market hours: 6.5 hours/day (9:30 AM - 4:00 PM ET)
 * - After hours: 17.5 hours/day
 * - 12 methods per stock
 *
 * @param stocksBySector - Map of sector → stock count
 * @returns Expected API calls breakdown by sector
 */
export function calculateSectorApiCalls(
  stocksBySector: Record<string, number>
): {
  bySector: Record<string, number>;
  total: number;
  reduction: number; // % reduction vs uniform 30-min warming
} {
  const METHODS_PER_STOCK = 12;
  const MARKET_HOURS = 6.5;
  const AFTER_HOURS = 17.5;

  let totalCalls = 0;
  const bySector: Record<string, number> = {};

  // Calculate calls per sector
  for (const [sector, stockCount] of Object.entries(stocksBySector)) {
    const config = SECTOR_WARMING_CONFIG[sector] || SECTOR_WARMING_CONFIG[Sector.OTHER];

    // Market hours cycles
    const marketCyclesPerDay = Math.floor(
      (MARKET_HOURS * 60) / (config.refreshIntervalMarketHours / 60000)
    );

    // After hours cycles (0 if market-hours-only)
    const afterCyclesPerDay = config.marketHoursOnly
      ? 0
      : Math.floor((AFTER_HOURS * 60) / (config.refreshIntervalAfterHours / 60000));

    const sectorCalls = stockCount * METHODS_PER_STOCK * (marketCyclesPerDay + afterCyclesPerDay);

    bySector[sector] = Math.round(sectorCalls);
    totalCalls += sectorCalls;
  }

  // Baseline: All stocks warmed every 30 minutes
  const totalStocks = Object.values(stocksBySector).reduce((sum, count) => sum + count, 0);
  const baselineCalls = totalStocks * METHODS_PER_STOCK * 48; // 48 cycles per day (30-min intervals)

  const reduction = ((baselineCalls - totalCalls) / baselineCalls) * 100;

  return {
    bySector,
    total: Math.round(totalCalls),
    reduction: Math.round(reduction * 100) / 100
  };
}

/**
 * Get all configured sectors (for iteration)
 *
 * @returns Array of sector names
 */
export function getAllSectors(): string[] {
  return Object.keys(SECTOR_WARMING_CONFIG);
}

/**
 * Export sector names for convenience
 */
export const GICS_SECTORS = {
  HIGH_FREQUENCY: [
    Sector.INFORMATION_TECHNOLOGY,
    Sector.COMMUNICATION_SERVICES,
    Sector.CONSUMER_DISCRETIONARY
  ],
  MEDIUM_FREQUENCY: [
    Sector.FINANCIALS,
    Sector.HEALTHCARE,
    Sector.INDUSTRIALS,
    Sector.CONSUMER_STAPLES
  ],
  LOW_FREQUENCY: [
    Sector.ENERGY,
    Sector.MATERIALS,
    Sector.UTILITIES,
    Sector.REAL_ESTATE
  ]
} as const;
