/**
 * Macro Multiplier Service - FASE 3
 *
 * Calculates macro-economic multiplier based on:
 * - Treasury yield curve (US10Y - US2Y)
 * - Fed Funds Rate changes (YoY)
 *
 * Multiplier ranges:
 * - 0.97 (Bearish): Inverted yield curve + aggressive Fed
 * - 1.00 (Neutral): Normal conditions
 * - 1.03 (Bullish): Steep yield curve + dovish Fed
 *
 * Applied to ALL intrinsic value calculations to adjust for macro environment
 *
 * Cache: 6h TTL (macro conditions change gradually)
 */

import axios from 'axios';
import { redisCacheService } from '../cache/redis-cache-service';
import { logger } from '../lib/logger';
import { Region } from '../types/valuation';

const FMP_BASE_URL = 'https://financialmodelingprep.com';
const FMP_API_KEY = process.env.FMP_API_KEY || '';
const CACHE_TTL = 6 * 3600; // 6 hours

// Cache keys
const CACHE_KEYS = {
  MACRO_MULTIPLIER: 'macro:multiplier:', // TTL 6h
  TREASURY_YIELDS: 'macro:treasury:',    // TTL 6h
  FED_FUNDS: 'macro:fed_funds:',         // TTL 6h
} as const;

/**
 * Macro Multiplier Response
 */
export interface MacroMultiplierResponse {
  region: Region;
  multiplier: number;              // 0.97 (bearish) to 1.03 (bullish)
  sentiment: 'bearish' | 'neutral' | 'bullish';
  yield_slope: number;             // US10Y - US2Y
  fed_funds_yoy_change: number;    // Current FFR - 1y ago FFR
  us10y: number;
  us2y: number;
  ffr_current: number;
  ffr_1y_ago: number;
  source: 'fmp' | 'cache' | 'fallback';
  as_of: string;
}

/**
 * Helper: Make FMP API request
 */
async function fmpGet<T>(endpoint: string, params: Record<string, any> = {}): Promise<T | null> {
  try {
    const url = new URL(endpoint, FMP_BASE_URL);
    url.searchParams.append('apikey', FMP_API_KEY);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    }

    logger.info(`[MacroService] API call: ${endpoint}`);
    const response = await axios.get<T>(url.toString(), {
      timeout: 10000,
      headers: {
        'Accept-Encoding': 'gzip',
      },
    });

    return response.data;
  } catch (error: any) {
    logger.error(`[MacroService] API error (${endpoint}):`, error.message);
    return null;
  }
}

export class MacroService {
  /**
   * Get current treasury yields (US10Y, US2Y)
   */
  private async getTreasuryYields(): Promise<{ us10y: number; us2y: number } | null> {
    const cacheKey = CACHE_KEYS.TREASURY_YIELDS + 'US';

    // Check cache
    const cached = await redisCacheService.get<{ us10y: number; us2y: number }>(cacheKey);
    if (cached) {
      logger.info('[MacroService] Treasury yields cache hit');
      return cached;
    }

    // Fetch from FMP
    const data = await fmpGet<any[]>('/api/v4/treasury');

    if (!data || !Array.isArray(data) || data.length === 0) {
      logger.warn('[MacroService] No treasury data available');
      return null;
    }

    // Extract latest values
    const latest = data[0];
    const us10y = Number(latest.year10 || 0) / 100; // Convert to decimal
    const us2y = Number(latest.year2 || 0) / 100;

    if (us10y <= 0 || us2y <= 0) {
      logger.warn('[MacroService] Invalid treasury yields');
      return null;
    }

    const yields = { us10y, us2y };

    // Cache for 6 hours
    await redisCacheService.set(cacheKey, yields, CACHE_TTL);
    logger.info(`[MacroService] Treasury yields: US10Y=${(us10y * 100).toFixed(2)}%, US2Y=${(us2y * 100).toFixed(2)}%`);

    return yields;
  }

  /**
   * Get Fed Funds Rate (current and 1 year ago)
   */
  private async getFedFundsRates(): Promise<{ current: number; yoy: number } | null> {
    const cacheKey = CACHE_KEYS.FED_FUNDS + 'US';

    // Check cache
    const cached = await redisCacheService.get<{ current: number; yoy: number }>(cacheKey);
    if (cached) {
      logger.info('[MacroService] Fed Funds cache hit');
      return cached;
    }

    // Fetch from FMP
    const data = await fmpGet<any[]>('/api/v4/economic', {
      name: 'federalFunds',
    });

    if (!data || !Array.isArray(data) || data.length < 5) {
      logger.warn('[MacroService] Insufficient Fed Funds data');
      return null;
    }

    // Get current and 1 year ago (approximately 4 quarters)
    const current = Number(data[0]?.value || 0) / 100; // Convert to decimal
    const oneYearAgo = Number(data[4]?.value || 0) / 100;

    if (current < 0 || oneYearAgo < 0) {
      logger.warn('[MacroService] Invalid Fed Funds data');
      return null;
    }

    const yoy = current - oneYearAgo;
    const rates = { current, yoy };

    // Cache for 6 hours
    await redisCacheService.set(cacheKey, rates, CACHE_TTL);
    logger.info(`[MacroService] Fed Funds: Current=${(current * 100).toFixed(2)}%, YoY=${(yoy * 100).toFixed(2)}%`);

    return rates;
  }

  /**
   * Calculate macro multiplier
   *
   * Logic:
   * - Bearish (0.97): Inverted curve (US10Y < US2Y) + Fed raising (YoY > 0.5%)
   * - Bullish (1.03): Steep curve (US10Y - US2Y > 1.0%) + Fed cutting (YoY < -0.5%)
   * - Neutral (1.00): All other scenarios
   */
  async getMacroMultiplier(region: Region = 'US'): Promise<MacroMultiplierResponse> {
    const cacheKey = CACHE_KEYS.MACRO_MULTIPLIER + region;

    // Check cache
    const cached = await redisCacheService.get<MacroMultiplierResponse>(cacheKey);
    if (cached) {
      logger.info(`[MacroService] Macro multiplier cache hit for ${region}`);
      return { ...cached, source: 'cache' };
    }

    try {
      // Fetch treasury yields
      const yields = await this.getTreasuryYields();
      if (!yields) {
        throw new Error('Failed to fetch treasury yields');
      }

      // Fetch Fed Funds rates
      const fedFunds = await this.getFedFundsRates();
      if (!fedFunds) {
        throw new Error('Failed to fetch Fed Funds rates');
      }

      const { us10y, us2y } = yields;
      const { current: ffrCurrent, yoy: ffrYoY } = fedFunds;
      const yieldSlope = us10y - us2y;

      // Calculate multiplier
      let multiplier = 1.00;
      let sentiment: 'bearish' | 'neutral' | 'bullish' = 'neutral';

      // Bearish conditions: Inverted curve + aggressive Fed
      if (yieldSlope < 0 && ffrYoY > 0.005) {
        multiplier = 0.97;
        sentiment = 'bearish';
        logger.info('[MacroService] BEARISH macro environment detected');
      }
      // Bullish conditions: Steep curve + dovish Fed
      else if (yieldSlope > 0.01 && ffrYoY < -0.005) {
        multiplier = 1.03;
        sentiment = 'bullish';
        logger.info('[MacroService] BULLISH macro environment detected');
      }
      // Neutral: Everything else
      else {
        multiplier = 1.00;
        sentiment = 'neutral';
        logger.info('[MacroService] NEUTRAL macro environment');
      }

      const response: MacroMultiplierResponse = {
        region,
        multiplier,
        sentiment,
        yield_slope: yieldSlope,
        fed_funds_yoy_change: ffrYoY,
        us10y,
        us2y,
        ffr_current: ffrCurrent,
        ffr_1y_ago: ffrCurrent - ffrYoY,
        source: 'fmp',
        as_of: new Date().toISOString().split('T')[0],
      };

      // Cache for 6 hours
      await redisCacheService.set(cacheKey, response, CACHE_TTL);
      logger.info(`[MacroService] Macro multiplier for ${region}: ${multiplier.toFixed(3)} (${sentiment})`);

      return response;
    } catch (error: any) {
      logger.error(`[MacroService] Error calculating macro multiplier:`, error.message);

      // Fallback to neutral
      const fallbackResponse: MacroMultiplierResponse = {
        region,
        multiplier: 1.00,
        sentiment: 'neutral',
        yield_slope: 0,
        fed_funds_yoy_change: 0,
        us10y: 0.04,
        us2y: 0.04,
        ffr_current: 0.05,
        ffr_1y_ago: 0.05,
        source: 'fallback',
        as_of: new Date().toISOString().split('T')[0],
      };

      // Cache fallback for 6 hours
      await redisCacheService.set(cacheKey, fallbackResponse, CACHE_TTL);

      return fallbackResponse;
    }
  }

  /**
   * Apply macro multiplier to an intrinsic value
   */
  applyMultiplier(iv: number, multiplier: number): number {
    return iv * multiplier;
  }

  /**
   * Get macro sentiment without full calculation
   */
  async getCurrentSentiment(region: Region = 'US'): Promise<'bearish' | 'neutral' | 'bullish'> {
    const macro = await this.getMacroMultiplier(region);
    return macro.sentiment;
  }
}

// Export singleton instance
export const macroService = new MacroService();
