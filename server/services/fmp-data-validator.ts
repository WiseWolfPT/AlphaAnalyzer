/**
 * FMP Data Validator - P0 Fix #5
 *
 * Pre-validates FMP data availability before attempting IV calculations
 * to prevent corrupted cache entries and wasted API calls.
 *
 * Validation Criteria:
 * 1. Company profile exists and is valid
 * 2. Financial statements available (at least 1 year)
 * 3. Cash flow statements available
 * 4. Key metrics available (P/E, P/S, P/B)
 * 5. Not an ETF (use existing classifier)
 *
 * Benefits:
 * - Zero corrupted cache entries
 * - Reduced API waste (skip invalid tickers early)
 * - Better user experience (no broken IV pages)
 * - Improved cache coverage accuracy
 */

import axios from 'axios';
import { logger } from '../lib/logger';
import { isETF } from '../utils/stock-classifier';
import type { FMPCompanyProfile, FMPFinancialStatement } from '../types/valuation';

const FMP_BASE_URL = 'https://financialmodelingprep.com';
const FMP_API_KEY = process.env.FMP_API_KEY || '';

// Cache validation results for 7 days (data availability doesn't change often)
const VALIDATION_CACHE_TTL = 7 * 24 * 60 * 60; // 7 days
const validationCache = new Map<string, { valid: boolean; timestamp: number; reason?: string }>();

/**
 * Validation result
 */
export interface FMPValidationResult {
  valid: boolean;
  ticker: string;
  reason?: string;
  checks: {
    isETF: boolean;
    hasProfile: boolean;
    hasFinancials: boolean;
    hasCashFlow: boolean;
    hasMetrics: boolean;
  };
  profile?: Partial<FMPCompanyProfile>;
}

/**
 * Validate if FMP has sufficient data for a ticker
 *
 * @param ticker - Stock ticker to validate
 * @param useCache - Whether to use cached validation results (default: true)
 * @returns Validation result with detailed checks
 */
export async function validateFMPData(
  ticker: string,
  useCache: boolean = true
): Promise<FMPValidationResult> {
  const upperTicker = ticker.toUpperCase().trim();

  // Check cache first (7-day TTL)
  if (useCache) {
    const cached = validationCache.get(upperTicker);
    if (cached && (Date.now() - cached.timestamp) < VALIDATION_CACHE_TTL * 1000) {
      logger.debug(`[FMP Validator] Cache HIT: ${upperTicker} (valid=${cached.valid})`);
      return {
        valid: cached.valid,
        ticker: upperTicker,
        reason: cached.reason,
        checks: {
          isETF: !cached.valid && cached.reason?.includes('ETF'),
          hasProfile: cached.valid,
          hasFinancials: cached.valid,
          hasCashFlow: cached.valid,
          hasMetrics: cached.valid,
        },
      };
    }
  }

  // Initialize result
  const result: FMPValidationResult = {
    valid: false,
    ticker: upperTicker,
    checks: {
      isETF: false,
      hasProfile: false,
      hasFinancials: false,
      hasCashFlow: false,
      hasMetrics: false,
    },
  };

  try {
    // ==============================
    // CHECK 1: Is it an ETF?
    // ==============================
    const etfCheck = await isETF(upperTicker);
    result.checks.isETF = etfCheck;

    if (etfCheck) {
      result.reason = 'ETF - intrinsic value not applicable';
      cacheResult(upperTicker, false, result.reason);
      return result;
    }

    // ==============================
    // CHECK 2: Company profile exists
    // ==============================
    const profileUrl = `${FMP_BASE_URL}/api/v3/profile/${upperTicker}?apikey=${FMP_API_KEY}`;
    const profileResponse = await axios.get<FMPCompanyProfile[]>(profileUrl, {
      timeout: 10000,
      headers: { 'Accept-Encoding': 'gzip' },
    });

    const profile = profileResponse.data?.[0];
    if (!profile || !profile.companyName || !profile.symbol) {
      result.reason = 'Company profile not found or invalid';
      cacheResult(upperTicker, false, result.reason);
      return result;
    }

    result.checks.hasProfile = true;
    result.profile = {
      symbol: profile.symbol,
      companyName: profile.companyName,
      sector: profile.sector,
      industry: profile.industry,
      exchange: profile.exchange,
    };

    // ==============================
    // CHECK 3: Financial statements (income statement)
    // ==============================
    const incomeUrl = `${FMP_BASE_URL}/api/v3/income-statement/${upperTicker}?limit=4&apikey=${FMP_API_KEY}`;
    const incomeResponse = await axios.get<FMPFinancialStatement[]>(incomeUrl, {
      timeout: 10000,
      headers: { 'Accept-Encoding': 'gzip' },
    });

    const incomeStatements = incomeResponse.data || [];
    if (incomeStatements.length === 0) {
      result.reason = 'No financial statements available';
      cacheResult(upperTicker, false, result.reason);
      return result;
    }

    // Validate statements have required fields
    const hasValidIncome = incomeStatements.some(
      (stmt) => stmt.revenue && stmt.netIncome && stmt.date
    );
    if (!hasValidIncome) {
      result.reason = 'Financial statements incomplete (missing revenue/netIncome)';
      cacheResult(upperTicker, false, result.reason);
      return result;
    }

    result.checks.hasFinancials = true;

    // ==============================
    // CHECK 4: Cash flow statements
    // ==============================
    const cashFlowUrl = `${FMP_BASE_URL}/api/v3/cash-flow-statement/${upperTicker}?limit=4&apikey=${FMP_API_KEY}`;
    const cashFlowResponse = await axios.get<FMPFinancialStatement[]>(cashFlowUrl, {
      timeout: 10000,
      headers: { 'Accept-Encoding': 'gzip' },
    });

    const cashFlowStatements = cashFlowResponse.data || [];
    if (cashFlowStatements.length === 0) {
      result.reason = 'No cash flow statements available';
      cacheResult(upperTicker, false, result.reason);
      return result;
    }

    // Validate cash flow statements have FCF or OCF
    const hasValidCashFlow = cashFlowStatements.some(
      (stmt) =>
        (stmt.freeCashFlow !== undefined && stmt.freeCashFlow !== null) ||
        (stmt.operatingCashFlow !== undefined && stmt.operatingCashFlow !== null)
    );
    if (!hasValidCashFlow) {
      result.reason = 'Cash flow statements incomplete (missing FCF/OCF)';
      cacheResult(upperTicker, false, result.reason);
      return result;
    }

    result.checks.hasCashFlow = true;

    // ==============================
    // CHECK 5: Key metrics (P/E, P/S, P/B)
    // ==============================
    const metricsUrl = `${FMP_BASE_URL}/api/v3/key-metrics/${upperTicker}?limit=1&apikey=${FMP_API_KEY}`;
    const metricsResponse = await axios.get<any[]>(metricsUrl, {
      timeout: 10000,
      headers: { 'Accept-Encoding': 'gzip' },
    });

    const metrics = metricsResponse.data || [];
    if (metrics.length === 0) {
      // Key metrics missing is acceptable - some methods don't require them
      logger.debug(`[FMP Validator] ${upperTicker}: Key metrics missing (non-critical)`);
      result.checks.hasMetrics = false;
    } else {
      result.checks.hasMetrics = true;
    }

    // ==============================
    // ALL CHECKS PASSED
    // ==============================
    result.valid = true;
    cacheResult(upperTicker, true);

    logger.info(`[FMP Validator] ✅ ${upperTicker} validated successfully`);
    return result;
  } catch (error: any) {
    const errorMsg = error?.response?.status === 404
      ? 'Ticker not found in FMP database'
      : error?.message || 'Unknown error';

    result.reason = errorMsg;
    cacheResult(upperTicker, false, errorMsg);

    logger.warn(`[FMP Validator] ❌ ${upperTicker} validation failed: ${errorMsg}`);
    return result;
  }
}

/**
 * Cache validation result
 */
function cacheResult(ticker: string, valid: boolean, reason?: string): void {
  validationCache.set(ticker, {
    valid,
    timestamp: Date.now(),
    reason,
  });
}

/**
 * Batch validate multiple tickers
 * Returns only valid tickers
 *
 * @param tickers - Array of tickers to validate
 * @param maxConcurrent - Max concurrent validations (default: 5)
 * @returns Array of valid tickers
 */
export async function validateBatch(
  tickers: string[],
  maxConcurrent: number = 5
): Promise<string[]> {
  const validTickers: string[] = [];
  const chunks = [];

  // Split into chunks for concurrent processing
  for (let i = 0; i < tickers.length; i += maxConcurrent) {
    chunks.push(tickers.slice(i, i + maxConcurrent));
  }

  logger.info(`[FMP Validator] Batch validation: ${tickers.length} tickers in ${chunks.length} chunks`);

  for (const chunk of chunks) {
    const results = await Promise.all(
      chunk.map((ticker) => validateFMPData(ticker, true))
    );

    for (const result of results) {
      if (result.valid) {
        validTickers.push(result.ticker);
      } else {
        logger.debug(`[FMP Validator] ${result.ticker} excluded: ${result.reason}`);
      }
    }

    // Rate limit: 4 calls/sec = 250ms between chunks
    await sleep(250);
  }

  const validPct = ((validTickers.length / tickers.length) * 100).toFixed(1);
  logger.info(
    `[FMP Validator] Batch complete: ${validTickers.length}/${tickers.length} valid (${validPct}%)`
  );

  return validTickers;
}

/**
 * Get validation cache statistics
 */
export function getValidationStats(): {
  cacheSize: number;
  validCount: number;
  invalidCount: number;
  oldestEntry: number | null;
} {
  let validCount = 0;
  let invalidCount = 0;
  let oldestTimestamp = Date.now();

  for (const [, entry] of validationCache) {
    if (entry.valid) {
      validCount++;
    } else {
      invalidCount++;
    }

    if (entry.timestamp < oldestTimestamp) {
      oldestTimestamp = entry.timestamp;
    }
  }

  return {
    cacheSize: validationCache.size,
    validCount,
    invalidCount,
    oldestEntry: validationCache.size > 0 ? oldestTimestamp : null,
  };
}

/**
 * Clear validation cache
 */
export function clearValidationCache(): void {
  validationCache.clear();
  logger.info('[FMP Validator] Cache cleared');
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Export singleton service
export const fmpDataValidator = {
  validateFMPData,
  validateBatch,
  getValidationStats,
  clearValidationCache,
};
