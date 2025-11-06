/**
 * ETF Validation Middleware - FASE 2
 *
 * Defense-in-depth validation to reject ETFs from intrinsic value calculations.
 * Returns HTTP 422 (Unprocessable Entity) with clear error messages.
 *
 * Architecture:
 * - Fetches company profile from cache (no duplicate API calls)
 * - Uses 4-layer ETF detection (suffix, known list, API type, name pattern)
 * - Fails gracefully: if profile fetch fails, allows through (endpoint handles missing data)
 */

import { Request, Response, NextFunction } from 'express';
import { isETF, getETFReason } from '../utils/stock-classifier';
import { simpleCacheService } from '../services/simple-cache-service';
import type { CompanyProfile } from '../types';
import { logger } from '../lib/logger';

/**
 * Middleware to reject ETF symbols for intrinsic value calculations
 *
 * Usage:
 * router.get('/iv/:ticker/chart', authMiddleware, validateNotETF, getIVChart);
 *
 * Returns HTTP 422 if ETF detected, allows through if not
 */
export async function validateNotETF(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const ticker = (req.params.ticker || req.params.symbol)?.toUpperCase();

  if (!ticker) {
    // No ticker provided - let the actual endpoint handle validation
    return next();
  }

  try {
    // Fetch company profile from cache (uses existing cache service, no duplicate API calls)
    const profile = await getCompanyProfileCached(ticker);

    // Check if ticker is an ETF using 4-layer detection strategy
    if (isETF(ticker, profile || undefined)) {
      const reason = getETFReason(ticker, profile || undefined);

      logger.info(`[ETF Validator] Rejected ETF request: ${ticker} (${reason})`);

      res.status(422).json({
        error: 'ETF_NOT_SUPPORTED',
        message: `${ticker} is an ETF. Intrinsic value calculations are only available for individual stocks.`,
        reason,
        ticker,
        suggestion: 'Try analyzing individual stocks within the ETF instead.',
        alternative_methods: [
          'Price momentum analysis',
          'Relative strength comparison',
          'Expense ratio analysis',
          'Tracking error measurement',
          'Holdings analysis'
        ],
        documentation: 'https://docs.alfalyzer.com/why-no-etf-valuation'
      });
      return;
    }

    // Not an ETF - continue to endpoint
    next();
  } catch (error) {
    // If profile fetch fails, allow through (better UX than blocking)
    // Let the actual endpoint handle missing data with proper error messages
    logger.warn(`[ETF Validator] Profile fetch failed for ${ticker}, allowing through:`, error);
    next();
  }
}

/**
 * Helper to get cached company profile (avoid duplicate API calls)
 *
 * Uses simpleCacheService which has 24h TTL for profiles
 */
async function getCompanyProfileCached(ticker: string): Promise<CompanyProfile | null> {
  try {
    const cached = await simpleCacheService.getProfile(ticker);
    return cached || null;
  } catch (error) {
    logger.warn(`[ETF Validator] Cache service error for ${ticker}:`, error);
    return null;
  }
}
