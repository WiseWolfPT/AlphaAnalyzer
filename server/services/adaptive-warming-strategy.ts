/**
 * Adaptive Warming Strategy - ONDA 7
 *
 * Calculates dynamic priority for cache warming based on:
 * 1. Tier (S&P 100 > S&P 500 > Extended)
 * 2. User Activity (views in last 24h)
 * 3. Earnings Proximity (next 2/7/30 days)
 * 4. Cache Staleness (hours since last warm)
 * 5. Market Hours (boost during trading hours)
 *
 * Priority Scale: 1-5 (5 = highest)
 */

import { logger } from '../lib/logger';
import { warmingQueueService } from './warming-queue-service';
import { getFullStockUniverse } from '../utils/stock-universe';

export interface WarmingContext {
  // Tier lists
  sp100: string[];
  sp500: string[];
  extended: string[];

  // User analytics (supports both sync and async for flexibility)
  analytics: {
    getViews: (ticker: string, timeframe: '1h' | '24h' | '7d') => number | Promise<number>;
  };

  // Earnings calendar
  earningsCalendar: {
    getNext: (ticker: string) => Date | null;
  };

  // Cache status (supports both sync and async for flexibility)
  cache: {
    getLastWarmed: (ticker: string, methodId: string) => Date | string | null | Promise<Date | null>;
  };

  // Market hours
  marketHours: {
    isOpen: () => boolean;
  };
}

/**
 * Parse lastWarmed value to Date object
 * Handles: Date, string (ISO), null, undefined, Promise<Date | null>
 *
 * @param lastWarmed - Value from cache (can be Promise, Date, string, or null)
 * @returns Promise<Date | null>
 */
export async function parseLastWarmed(
  lastWarmed: Date | string | null | undefined | Promise<Date | null>
): Promise<Date | null> {
  // Handle Promise (from async getLastWarmed)
  if (lastWarmed instanceof Promise) {
    lastWarmed = await lastWarmed;
  }

  // Handle null/undefined
  if (!lastWarmed) {
    return null;
  }

  // Handle Date object
  if (lastWarmed instanceof Date) {
    return isNaN(lastWarmed.getTime()) ? null : lastWarmed;
  }

  // Handle string (ISO timestamp from Redis)
  if (typeof lastWarmed === 'string') {
    const parsed = new Date(lastWarmed);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

/**
 * S&P 100 Tickers (Top 100 US stocks by market cap)
 * Updated: 2025-10-24
 */
const SP100_TICKERS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK-B', 'JPM', 'JNJ',
  'V', 'PG', 'UNH', 'HD', 'MA', 'DIS', 'BAC', 'ADBE', 'NFLX', 'CRM',
  'CMCSA', 'XOM', 'CVX', 'PFE', 'ABBV', 'KO', 'TMO', 'CSCO', 'PEP', 'WMT',
  'MRK', 'AVGO', 'LLY', 'VZ', 'INTC', 'DHR', 'ABT', 'ACN', 'NKE', 'ORCL',
  'IBM', 'QCOM', 'TXN', 'AMD', 'NOW', 'INTU', 'PYPL', 'UPS', 'RTX', 'HON',
  'CAT', 'LOW', 'SBUX', 'COST', 'MDT', 'BMY', 'AMGN', 'GILD', 'ISRG', 'SYK',
  'TGT', 'BKNG', 'MAR', 'HLT', 'YUM', 'CMG', 'DPZ', 'LULU', 'COP', 'SLB',
  'EOG', 'PXD', 'VLO', 'MPC', 'FCX', 'NEM', 'APD', 'LIN', 'ECL', 'SHW',
  'DD', 'DOW', 'BA', 'GE', 'MMM', 'DE', 'FDX', 'NSC', 'UNP', 'WM',
  'EMR', 'ETN', 'ITW', 'AMT', 'PLD', 'CCI', 'EQIX', 'PSA', 'O', 'SPG'
];

/**
 * S&P 500 Tickers (Tier 2: 101-500)
 * In production, this will be fetched from PostgreSQL
 */
const SP500_TICKERS = [
  'WELL', 'AVB', 'EQR', 'DLR', 'SUI', 'VTR', 'PEAK', 'ARE', 'MAA', 'GS',
  'MS', 'WFC', 'C', 'USB', 'BLK', 'SCHW', 'AXP', 'SPGI', 'CME', 'ICE',
  'COF', 'PNC', 'TFC', 'FISV', 'NEE', 'DUK', 'SO', 'D', 'AEP', 'EXC',
  'SRE', 'XEL', 'T', 'MO', 'PM', 'BTI', 'KMI', 'ENB', 'EPD', 'MMP',
  'ET', 'OKE', 'WMB', 'LNG', 'ATVI', 'EA', 'TTWO', 'NTDOY', 'RBLX', 'DKNG'
  // ... (400 more - fetch from PG in production)
];

/**
 * Calculate priority for a ticker/method combination
 *
 * @param ticker - Stock ticker symbol
 * @param methodId - Valuation method ID
 * @param context - Warming context (tier, analytics, earnings, cache, market)
 * @returns Priority score (1-5)
 */
export async function calculatePriority(
  ticker: string,
  methodId: string,
  context: WarmingContext
): Promise<number> {
  let priority = 1; // Base priority

  // Factor 1: Tier (S&P 100 = +3, S&P 500 = +2, Extended = +1)
  if (context.sp100.includes(ticker)) {
    priority += 3;
  } else if (context.sp500.includes(ticker)) {
    priority += 2;
  } else {
    priority += 1;
  }

  // Factor 2: User activity (last 24h)
  const viewsRaw = context.analytics.getViews(ticker, '24h');
  const views = viewsRaw instanceof Promise ? await viewsRaw : viewsRaw;
  if (views > 100) {
    priority += 2;
  } else if (views > 10) {
    priority += 1;
  }

  // Factor 3: Earnings proximity
  const nextEarnings = context.earningsCalendar.getNext(ticker);
  if (nextEarnings) {
    const daysUntil = Math.floor((nextEarnings.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysUntil <= 2) {
      priority += 3; // Earnings in next 2 days
    } else if (daysUntil <= 7) {
      priority += 2; // Earnings in next 7 days
    } else if (daysUntil <= 30) {
      priority += 1; // Earnings in next 30 days
    }
  }

  // Factor 4: Cache staleness (FIXED: handles Promise, Date, string, null)
  const lastWarmedRaw = context.cache.getLastWarmed(ticker, methodId);
  const lastWarmed = await parseLastWarmed(lastWarmedRaw);

  if (lastWarmed) {
    const hoursStale = (Date.now() - lastWarmed.getTime()) / (1000 * 60 * 60);
    if (hoursStale > 20) {
      priority += 2; // Very stale
    } else if (hoursStale > 12) {
      priority += 1; // Moderately stale
    }
  } else {
    priority += 2; // Never warmed
  }

  // Factor 5: Market hours boost
  if (context.marketHours.isOpen()) {
    priority += 1;
  }

  // Cap at 5
  return Math.min(priority, 5);
}

/**
 * Check if US market is open (NYSE hours: 9:30 AM - 4:00 PM ET)
 *
 * @returns true if market is currently open
 */
export function isMarketOpen(): boolean {
  const now = new Date();

  // Get ET time (UTC-5 or UTC-4 depending on DST)
  const etOffset = isDST(now) ? -4 : -5;
  const etTime = new Date(now.getTime() + (etOffset * 60 * 60 * 1000));

  const day = etTime.getUTCDay(); // 0 = Sunday, 6 = Saturday
  const hour = etTime.getUTCHours();
  const minute = etTime.getUTCMinutes();

  // Monday-Friday only
  if (day === 0 || day === 6) {
    return false;
  }

  // 9:30 AM - 4:00 PM ET
  const currentMinutes = hour * 60 + minute;
  const marketOpenMinutes = 9 * 60 + 30; // 9:30 AM
  const marketCloseMinutes = 16 * 60; // 4:00 PM

  return currentMinutes >= marketOpenMinutes && currentMinutes < marketCloseMinutes;
}

/**
 * Check if date is in Daylight Saving Time (DST)
 *
 * @param date - Date to check
 * @returns true if date is in DST
 */
function isDST(date: Date): boolean {
  const jan = new Date(date.getFullYear(), 0, 1).getTimezoneOffset();
  const jul = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
  return Math.max(jan, jul) !== date.getTimezoneOffset();
}

/**
 * Calculate days between two dates
 *
 * @param date1 - First date
 * @param date2 - Second date
 * @returns Number of days between dates
 */
export function daysBetween(date1: Date, date2: Date): number {
  const diffMs = date2.getTime() - date1.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Schedule warming tasks based on adaptive strategy
 *
 * @param context - Warming context
 * @param methodIds - Array of valuation method IDs
 * @param batchSize - Number of tasks to schedule per batch
 * @returns Promise<void>
 */
export async function scheduleAdaptiveTasks(
  context: WarmingContext,
  methodIds: string[],
  batchSize: number = 50
): Promise<void> {
  logger.info('[AdaptiveWarming] Starting adaptive task scheduling...');

  // Get full universe
  const allTickers = [...context.sp100, ...context.sp500, ...context.extended];
  logger.info(`[AdaptiveWarming] Universe: ${allTickers.length} tickers × ${methodIds.length} methods`);

  // Calculate priority for all ticker/method combinations
  const tasks: Array<{
    ticker: string;
    methodId: string;
    priority: number;
  }> = [];

  for (const ticker of allTickers) {
    for (const methodId of methodIds) {
      const priority = await calculatePriority(ticker, methodId, context);
      tasks.push({ ticker, methodId, priority });
    }
  }

  // Sort by priority (descending)
  tasks.sort((a, b) => b.priority - a.priority);

  // Add top N tasks to queue
  const topTasks = tasks.slice(0, batchSize);
  for (const task of topTasks) {
    // Parse lastWarmed (handles Promise, string, Date, null)
    const lastWarmedRaw = context.cache.getLastWarmed(task.ticker, task.methodId);
    const lastWarmed = await parseLastWarmed(lastWarmedRaw);

    await warmingQueueService.addTask({
      ticker: task.ticker,
      methodId: task.methodId,
      priority: task.priority,
      lastWarmed,
      nextWarm: new Date(),
      reason: 'scheduled'
    });
  }

  logger.info(`[AdaptiveWarming] Scheduled ${topTasks.length} tasks (avg priority: ${(topTasks.reduce((sum, t) => sum + t.priority, 0) / topTasks.length).toFixed(2)})`);
}

/**
 * Get tier lists from PostgreSQL or fallback
 *
 * @returns Promise<{ sp100: string[], sp500: string[], extended: string[] }>
 */
export async function getTierLists(): Promise<{
  sp100: string[];
  sp500: string[];
  extended: string[];
}> {
  try {
    // Get full universe from PG
    const allTickers = await getFullStockUniverse({ source: 'pg', limit: 2000 });

    // In production, PG would have tier column
    // For now, use hardcoded SP100 and heuristic for SP500/Extended
    const sp100 = SP100_TICKERS.filter(t => allTickers.includes(t));
    const sp500 = SP500_TICKERS.filter(t => allTickers.includes(t) && !sp100.includes(t));
    const extended = allTickers.filter(t => !sp100.includes(t) && !sp500.includes(t));

    logger.info(`[AdaptiveWarming] Tiers loaded: SP100=${sp100.length}, SP500=${sp500.length}, Extended=${extended.length}`);

    return { sp100, sp500, extended };
  } catch (error) {
    logger.error('[AdaptiveWarming] Failed to load tier lists:', error);

    // Fallback to hardcoded
    return {
      sp100: SP100_TICKERS,
      sp500: SP500_TICKERS,
      extended: []
    };
  }
}

/**
 * Create default warming context (for worker startup)
 *
 * @returns Promise<WarmingContext>
 */
export async function createDefaultContext(): Promise<WarmingContext> {
  const { sp100, sp500, extended } = await getTierLists();

  return {
    sp100,
    sp500,
    extended,

    analytics: {
      getViews: () => 0 // Will be replaced by real analytics
    },

    earningsCalendar: {
      getNext: () => null // Will be replaced by real earnings data
    },

    cache: {
      getLastWarmed: () => null // Will be replaced by Redis lookup
    },

    marketHours: {
      isOpen: isMarketOpen
    }
  };
}
