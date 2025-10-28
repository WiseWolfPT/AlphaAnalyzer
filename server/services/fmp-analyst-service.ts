/**
 * FMP Analyst Service - ONDA 1.1
 *
 * Provides analyst consensus estimates from Financial Modeling Prep API:
 * - Analyst EPS estimates (5-year forward projections)
 * - EPS growth rate calculation (Year 1-5 CAGR)
 * - High-confidence growth rates for valuation models
 *
 * This service solves the P0 bug where growth rates were hardcoded to 0%
 * by providing real analyst consensus data.
 *
 * FMP Endpoint: /api/v3/analyst-estimates/{symbol}
 * Cache: 24h TTL (analyst estimates change with quarterly earnings)
 */

import axios from 'axios';
import { redisCacheService } from '../cache/redis-cache-service';
import { logger } from '../lib/logger';

const FMP_BASE_URL = 'https://financialmodelingprep.com';

// Lazy-evaluate API key to ensure env is loaded first
function getFmpApiKey(): string {
  return process.env.FMP_API_KEY || '';
}

// Cache key prefix
const CACHE_KEY_PREFIX = 'fmp:analyst:estimates:';
const CACHE_TTL = 86400; // 24 hours

/**
 * Analyst Estimate Response Shape from FMP API
 */
export interface AnalystEstimate {
  symbol: string;
  date: string; // "2025-09-30" (quarter end date)
  estimatedRevenueAvg: number;
  estimatedRevenueHigh: number;
  estimatedRevenueLow: number;
  estimatedEbitdaAvg: number;
  estimatedEbitdaHigh: number;
  estimatedEbitdaLow: number;
  estimatedEbitAvg: number;
  estimatedEbitHigh: number;
  estimatedEbitLow: number;
  estimatedNetIncomeAvg: number;
  estimatedNetIncomeHigh: number;
  estimatedNetIncomeLow: number;
  estimatedSgaExpenseAvg: number;
  estimatedSgaExpenseHigh: number;
  estimatedSgaExpenseLow: number;
  estimatedEpsAvg: number;
  estimatedEpsHigh: number;
  estimatedEpsLow: number;
  numberAnalystsEstimatedRevenue: number;
  numberAnalystsEstimatedEps: number;
}

/**
 * Growth Rate Calculation Result
 */
export interface GrowthRateResult {
  ticker: string;
  growth_rate: number;           // Year 1-5 EPS CAGR (decimal, e.g., 0.1007 = 10.07%)
  current_eps: number;            // Current year EPS estimate
  future_eps: number;             // Year 5 EPS estimate
  analyst_count: number;          // Number of analysts in consensus
  confidence: 'high' | 'medium' | 'low';
  data_source: 'analyst' | 'historical' | 'default';
  as_of: string;                  // ISO date
}

/**
 * Helper: Make FMP API request with error handling
 */
async function fmpGet<T>(endpoint: string): Promise<T | null> {
  try {
    const url = new URL(endpoint, FMP_BASE_URL);
    const apiKey = getFmpApiKey();
    url.searchParams.append('apikey', apiKey);

    logger.info(`[FMP-Analyst] API call: ${endpoint}`);
    const response = await axios.get<T>(url.toString(), {
      timeout: 10000,
      headers: {
        'Accept-Encoding': 'gzip',
      },
    });

    return response.data;
  } catch (error: any) {
    const apiKey = getFmpApiKey();
    const errorDetails = {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      apiKey: apiKey ? `${apiKey.substring(0, 10)}...` : 'MISSING',
    };
    logger.error(`[FMP-Analyst] API error (${endpoint}):`, errorDetails);
    return null;
  }
}

/**
 * Fetch analyst EPS estimates from FMP API
 *
 * Endpoint: /api/v3/analyst-estimates/{symbol}
 * Returns: Array of quarterly estimates (most recent first)
 */
export async function getAnalystEstimates(ticker: string): Promise<AnalystEstimate[]> {
  const upperTicker = ticker.toUpperCase();
  const cacheKey = CACHE_KEY_PREFIX + upperTicker;

  // Check cache first
  const cached = await redisCacheService.get(cacheKey);
  if (cached) {
    logger.info(`[FMP-Analyst] Cache hit for ${upperTicker}`);
    return cached as AnalystEstimate[];
  }

  logger.info(`[FMP-Analyst] Cache miss for ${upperTicker}, fetching from FMP`);

  // Fetch from FMP
  const data = await fmpGet<AnalystEstimate[]>(`/api/v3/analyst-estimates/${upperTicker}`);

  if (!data || !Array.isArray(data) || data.length === 0) {
    logger.warn(`[FMP-Analyst] No analyst estimates available for ${upperTicker}`);
    return [];
  }

  // Cache for 24 hours
  await redisCacheService.set(cacheKey, data, CACHE_TTL);
  logger.info(`[FMP-Analyst] Cached ${data.length} estimates for ${upperTicker}`);

  return data;
}

/**
 * Calculate Year 1-5 EPS CAGR from analyst estimates
 *
 * Formula: CAGR = (FutureEPS / CurrentEPS)^(1/years) - 1
 *
 * IMPORTANT: FMP returns estimates in REVERSE chronological order (newest first)
 * - estimates[0] = furthest future (e.g., 2029)
 * - estimates[4] = current year (e.g., 2025)
 *
 * Validation:
 * - Requires at least 5 years of estimates
 * - EPS values must be positive
 * - Growth rate must be reasonable (-20% to +50%)
 *
 * Returns: Growth rate as decimal (0.1007 = 10.07%) or undefined if data insufficient
 */
export function calculateAnalystEpsGrowth(estimates: AnalystEstimate[]): number | undefined {
  if (estimates.length < 5) {
    logger.warn(`[FMP-Analyst] Insufficient estimates for growth calculation: ${estimates.length} < 5`);
    return undefined;
  }

  // FMP returns estimates in reverse chronological order
  // We want growth from current year (later index) to future year (earlier index)
  const currentYearIdx = Math.min(4, estimates.length - 1); // Use 5th estimate or last available
  const futureYearIdx = 0; // Most recent future estimate

  const currentEps = estimates[currentYearIdx].estimatedEpsAvg;
  const futureEps = estimates[futureYearIdx].estimatedEpsAvg;

  // Calculate number of years between estimates
  const currentYear = new Date(estimates[currentYearIdx].date).getFullYear();
  const futureYear = new Date(estimates[futureYearIdx].date).getFullYear();
  const years = futureYear - currentYear;

  if (years <= 0) {
    logger.warn(`[FMP-Analyst] Invalid date range: ${currentYear} to ${futureYear}`);
    return undefined;
  }

  // Validate positive EPS (cannot calculate growth from negative base)
  if (currentEps <= 0 || futureEps <= 0) {
    logger.warn(`[FMP-Analyst] Invalid EPS values: current=${currentEps}, future=${futureEps}`);
    return undefined;
  }

  // Calculate CAGR
  const growth = Math.pow(futureEps / currentEps, 1 / years) - 1;

  // Sanity checks: growth rate must be reasonable
  if (growth < -0.20 || growth > 0.50) {
    logger.warn(`[FMP-Analyst] Growth rate out of bounds: ${(growth * 100).toFixed(2)}%`);
    return undefined;
  }

  logger.info(
    `[FMP-Analyst] Calculated EPS growth: ${(growth * 100).toFixed(2)}% over ${years} years ` +
    `(${currentYear}: $${currentEps.toFixed(2)} → ${futureYear}: $${futureEps.toFixed(2)})`
  );

  return growth;
}

/**
 * Get analyst-based growth rate with full metadata
 *
 * Primary interface for IV calculation controllers.
 * Returns high-confidence growth rate if sufficient analyst coverage exists.
 */
export async function getAnalystGrowthRate(ticker: string): Promise<GrowthRateResult | null> {
  const estimates = await getAnalystEstimates(ticker);

  if (estimates.length === 0) {
    logger.info(`[FMP-Analyst] No analyst coverage for ${ticker}`);
    return null;
  }

  const growth = calculateAnalystEpsGrowth(estimates);

  if (growth === undefined) {
    logger.info(`[FMP-Analyst] Cannot calculate growth for ${ticker}`);
    return null;
  }

  // Determine confidence based on analyst count
  // Use average analyst count from current year estimates (indices 2-6 typically have more coverage)
  const currentYearIdx = Math.min(4, estimates.length - 1);
  const analystCount = estimates[currentYearIdx].numberAnalystsEstimatedEps || 0;
  let confidence: 'high' | 'medium' | 'low' = 'low';
  if (analystCount >= 10) {
    confidence = 'high';
  } else if (analystCount >= 5) {
    confidence = 'medium';
  }

  // Remember: estimates are in reverse chronological order
  // estimates[4] = current year, estimates[0] = future year
  return {
    ticker: ticker.toUpperCase(),
    growth_rate: growth,
    current_eps: estimates[currentYearIdx].estimatedEpsAvg, // Current year (later index)
    future_eps: estimates[0].estimatedEpsAvg,               // Future year (index 0)
    analyst_count: analystCount,
    confidence,
    data_source: 'analyst',
    as_of: new Date().toISOString().split('T')[0],
  };
}

/**
 * Batch fetch growth rates for multiple tickers
 *
 * Useful for warming cache or portfolio analysis.
 * Returns only successful results (filters out null).
 */
export async function getAnalystGrowthRateBatch(tickers: string[]): Promise<GrowthRateResult[]> {
  const results = await Promise.allSettled(
    tickers.map(ticker => getAnalystGrowthRate(ticker))
  );

  return results
    .filter((r): r is PromiseFulfilledResult<GrowthRateResult | null> =>
      r.status === 'fulfilled' && r.value !== null
    )
    .map(r => r.value as GrowthRateResult);
}

/**
 * Get cash flow statement for historical FCF data
 *
 * Used as fallback when analyst estimates are unavailable.
 * Returns last N years of FCF data for CAGR calculation.
 */
export async function getCashFlowStatement(
  ticker: string,
  limit: number = 6
): Promise<number[] | null> {
  const upperTicker = ticker.toUpperCase();
  const cacheKey = `fmp:cashflow:${upperTicker}:${limit}`;

  // Check cache first
  const cached = await redisCacheService.get(cacheKey);
  if (cached) {
    logger.info(`[FMP-Analyst] Cash flow cache hit for ${upperTicker}`);
    return cached as number[];
  }

  logger.info(`[FMP-Analyst] Cash flow cache miss for ${upperTicker}, fetching from FMP`);

  // Fetch from FMP
  const data = await fmpGet<any[]>(`/api/v3/cash-flow-statement/${upperTicker}?period=annual&limit=${limit}`);

  if (!data || !Array.isArray(data) || data.length === 0) {
    logger.warn(`[FMP-Analyst] No cash flow data available for ${upperTicker}`);
    return null;
  }

  // Extract FCF values (most recent first, reverse to oldest first)
  const fcfValues = data
    .map(item => item.freeCashFlow || 0)
    .reverse(); // Oldest first for CAGR calculation

  if (fcfValues.length < 2) {
    logger.warn(`[FMP-Analyst] Insufficient cash flow data for ${upperTicker}: ${fcfValues.length} years`);
    return null;
  }

  // Cache for 24 hours
  await redisCacheService.set(cacheKey, fcfValues, CACHE_TTL);
  logger.info(`[FMP-Analyst] Cached ${fcfValues.length} years of FCF for ${upperTicker}`);

  return fcfValues;
}
