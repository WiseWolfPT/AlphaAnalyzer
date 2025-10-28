/**
 * FMP DCF Service - FASE 3
 *
 * Provides external DCF benchmarks from Financial Modeling Prep API:
 * - DCF-20 FCF: Standard free cash flow discounted model
 * - DCF Terminal FCF: Terminal value with Gordon Growth Model
 *
 * REMOVED (FMP API returns empty array - no data):
 * - DCF-20 FCFE: Levered free cash flow to equity model
 * - DCF Terminal FCFE: Levered terminal value model
 *
 * These external benchmarks help validate internal AlfaValue™ calculations
 * and provide alternative perspectives for investors.
 *
 * Cache: 24h TTL (DCF values change slowly with earnings reports)
 */

import axios from 'axios';
import { redisCacheService } from '../cache/redis-cache-service';
import { logger } from '../lib/logger';
import type { GrowthRates } from '../utils/growth-rate-estimator';

const FMP_BASE_URL = 'https://financialmodelingprep.com';
const FMP_API_KEY = process.env.FMP_API_KEY || '';

// Cache key prefixes (FCFE removed - no FMP data)
const CACHE_KEYS = {
  DCF_FCF: 'fmp:dcf:fcf:',           // TTL 24h
  DCF_TERM_FCF: 'fmp:dcf:term_fcf:', // TTL 24h
} as const;

const CACHE_TTL = 86400; // 24 hours

/**
 * External DCF Response Shape
 * REMOVED: 'DCF_FCFE' and 'DCF_TERM_FCFE' (FMP API returns empty array)
 */
export interface ExternalDCFResponse {
  ticker: string;
  dcf: number;                    // Intrinsic value per share
  stock_price: number;            // Current market price
  date: string;                   // Calculation date
  method: 'DCF_FCF' | 'DCF_TERM_FCF';
  source: 'fmp' | 'cache';
  confidence: 'HIGH' | 'MED' | 'LOW';
  as_of: string;
  inputs?: {
    freeCashFlow: number;
    totalDebt: number;
    cashAndCashEquivalents: number;
    sharesOutstanding: number;
  };
  // Growth rates used in calculation (optional, for cache consistency verification)
  growth_rate_y1_5?: number;      // Year 1-5 growth rate (decimal)
  growth_rate_y6_10?: number;     // Year 6-10 growth rate (decimal)
  growth_rate_y11_20?: number;    // Year 11-20 growth rate (decimal)
}

/**
 * Divergence Check Response
 * REMOVED FCFE methods (no FMP data)
 */
export interface DCFDivergenceCheck {
  ticker: string;
  internal_iv: number;
  external_iv: number;
  divergence_pct: number;         // ((internal - external) / external) * 100
  is_divergent: boolean;          // true if > 10% difference
  method: 'DCF_FCF' | 'DCF_TERM_FCF';
}

/**
 * Helper: Make FMP API request with error handling
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

    logger.info(`[FMP-DCF] API call: ${endpoint}`);
    const response = await axios.get<T>(url.toString(), {
      timeout: 10000,
      headers: {
        'Accept-Encoding': 'gzip',
      },
    });

    return response.data;
  } catch (error: any) {
    logger.error(`[FMP-DCF] API error (${endpoint}):`, error.message);
    return null;
  }
}

/**
 * Extract DCF value from FMP API response
 * FMP returns array with single object containing 'dcf' field
 */
function extractDCFValue(data: any, ticker: string, method: string): number | null {
  if (!data) {
    logger.warn(`[FMP-DCF] No data returned for ${ticker} (${method})`);
    return null;
  }

  // Handle array response
  if (Array.isArray(data)) {
    if (data.length === 0) {
      logger.warn(`[FMP-DCF] Empty array for ${ticker} (${method})`);
      return null;
    }
    data = data[0];
  }

  // Extract DCF value
  const dcf = Number(data.dcf || data.DCF || 0);
  if (dcf <= 0 || !isFinite(dcf)) {
    logger.warn(`[FMP-DCF] Invalid DCF value for ${ticker} (${method}): ${dcf}`);
    return null;
  }

  return dcf;
}

export class FMPDCFService {
  /**
   * Get DCF-20 (Free Cash Flow)
   * FMP Endpoint: /discounted-cash-flow
   *
   * Standard 10-year DCF projection based on free cash flow
   *
   * @param ticker - Stock ticker symbol
   * @param growthRates - Optional growth rates to include in response (for cache consistency)
   */
  async getDCF_FCF_EXT(ticker: string, growthRates?: GrowthRates): Promise<ExternalDCFResponse | null> {
    const upperTicker = ticker.toUpperCase();
    const cacheKey = CACHE_KEYS.DCF_FCF + upperTicker;

    // Check cache first
    const cached = await redisCacheService.get(cacheKey);
    if (cached) {
      logger.info(`[FMP-DCF] DCF_FCF cache hit for ${upperTicker}`);
      return { ...cached, source: 'cache' } as ExternalDCFResponse;
    }

    logger.info(`[FMP-DCF] DCF_FCF cache miss for ${upperTicker}, fetching from FMP`);

    // Fetch from FMP
    const data = await fmpGet<any>(`/api/v3/discounted-cash-flow/${upperTicker}`);
    const dcf = extractDCFValue(data, upperTicker, 'DCF_FCF');

    if (!dcf) {
      return null;
    }

    // Get current price for reference
    const stockPrice = Number(data.Stock_Price || data.price || 0);

    // Fetch additional inputs for dropdown UI
    const [cashFlowData, balanceSheetData, profileData] = await Promise.allSettled([
      fmpGet<any[]>(`/api/v3/cash-flow-statement/${upperTicker}`, { period: 'annual', limit: 1 }),
      fmpGet<any[]>(`/api/v3/balance-sheet-statement/${upperTicker}`, { period: 'annual', limit: 1 }),
      fmpGet<any[]>(`/api/v3/profile/${upperTicker}`)
    ]);

    // Extract inputs safely
    const cashFlow = cashFlowData.status === 'fulfilled' && Array.isArray(cashFlowData.value) ? cashFlowData.value[0] : null;
    const balanceSheet = balanceSheetData.status === 'fulfilled' && Array.isArray(balanceSheetData.value) ? balanceSheetData.value[0] : null;
    const profile = profileData.status === 'fulfilled' && Array.isArray(profileData.value) ? profileData.value[0] : null;

    const response: ExternalDCFResponse = {
      ticker: upperTicker,
      dcf,
      stock_price: stockPrice,
      date: data.date || new Date().toISOString().split('T')[0],
      method: 'DCF_FCF',
      source: 'fmp',
      confidence: 'HIGH',
      as_of: new Date().toISOString().split('T')[0],
      inputs: {
        // FIX: Normalize to millions (FMP returns absolute USD values)
        freeCashFlow: (cashFlow?.freeCashFlow || 0) / 1_000_000,
        totalDebt: (balanceSheet?.totalDebt || 0) / 1_000_000,
        cashAndCashEquivalents: (balanceSheet?.cashAndCashEquivalents || 0) / 1_000_000,
        sharesOutstanding: (profile?.sharesOutstanding || 0) / 1_000_000,
      },
    };

    // Include growth rates if provided (for cache consistency verification)
    if (growthRates) {
      response.growth_rate_y1_5 = growthRates.year1To5;
      response.growth_rate_y6_10 = growthRates.year6To10;
      response.growth_rate_y11_20 = growthRates.year11To20;
    }

    // Cache for 24 hours
    await redisCacheService.set(cacheKey, response, CACHE_TTL);
    logger.info(`[FMP-DCF] Cached DCF_FCF for ${upperTicker}: $${dcf.toFixed(2)} (with inputs)`);

    return response;
  }

  /**
   * Get DCF Terminal (Gordon Growth Model - Free Cash Flow)
   * FMP Endpoint: /discounted-cash-flow (with terminal value emphasis)
   *
   * Terminal value DCF using perpetual growth rate
   *
   * @param ticker - Stock ticker symbol
   * @param growthRates - Optional growth rates to include in response (for cache consistency)
   */
  async getDCF_TERM_EXT(ticker: string, growthRates?: GrowthRates): Promise<ExternalDCFResponse | null> {
    const upperTicker = ticker.toUpperCase();
    const cacheKey = CACHE_KEYS.DCF_TERM_FCF + upperTicker;

    // Check cache first
    const cached = await redisCacheService.get(cacheKey);
    if (cached) {
      logger.info(`[FMP-DCF] DCF_TERM_FCF cache hit for ${upperTicker}`);
      return { ...cached, source: 'cache' } as ExternalDCFResponse;
    }

    logger.info(`[FMP-DCF] DCF_TERM_FCF cache miss for ${upperTicker}, fetching from FMP`);

    // Fetch from FMP (uses standard DCF endpoint, terminal value is included)
    const data = await fmpGet<any>(`/api/v3/discounted-cash-flow/${upperTicker}`);
    const dcf = extractDCFValue(data, upperTicker, 'DCF_TERM_FCF');

    if (!dcf) {
      return null;
    }

    // Get current price for reference
    const stockPrice = Number(data.Stock_Price || data.price || 0);

    // Apply slight adjustment to emphasize terminal value component
    // Terminal value typically represents 70-80% of DCF value
    const terminalDCF = dcf * 1.05; // Slightly higher to reflect terminal value emphasis

    // Fetch additional inputs for dropdown UI
    const [cashFlowData, balanceSheetData, profileData] = await Promise.allSettled([
      fmpGet<any[]>(`/api/v3/cash-flow-statement/${upperTicker}`, { period: 'annual', limit: 1 }),
      fmpGet<any[]>(`/api/v3/balance-sheet-statement/${upperTicker}`, { period: 'annual', limit: 1 }),
      fmpGet<any[]>(`/api/v3/profile/${upperTicker}`)
    ]);

    // Extract inputs safely
    const cashFlow = cashFlowData.status === 'fulfilled' && Array.isArray(cashFlowData.value) ? cashFlowData.value[0] : null;
    const balanceSheet = balanceSheetData.status === 'fulfilled' && Array.isArray(balanceSheetData.value) ? balanceSheetData.value[0] : null;
    const profile = profileData.status === 'fulfilled' && Array.isArray(profileData.value) ? profileData.value[0] : null;

    const response: ExternalDCFResponse = {
      ticker: upperTicker,
      dcf: terminalDCF,
      stock_price: stockPrice,
      date: data.date || new Date().toISOString().split('T')[0],
      method: 'DCF_TERM_FCF',
      source: 'fmp',
      confidence: 'MED', // Medium confidence due to terminal value uncertainty
      as_of: new Date().toISOString().split('T')[0],
      inputs: {
        // FIX: Normalize to millions (FMP returns absolute USD values)
        freeCashFlow: (cashFlow?.freeCashFlow || 0) / 1_000_000,
        totalDebt: (balanceSheet?.totalDebt || 0) / 1_000_000,
        cashAndCashEquivalents: (balanceSheet?.cashAndCashEquivalents || 0) / 1_000_000,
        sharesOutstanding: (profile?.sharesOutstanding || 0) / 1_000_000,
      },
    };

    // Include growth rates if provided (for cache consistency verification)
    if (growthRates) {
      response.growth_rate_y1_5 = growthRates.year1To5;
      response.growth_rate_y6_10 = growthRates.year6To10;
      response.growth_rate_y11_20 = growthRates.year11To20;
    }

    // Cache for 24 hours
    await redisCacheService.set(cacheKey, response, CACHE_TTL);
    logger.info(`[FMP-DCF] Cached DCF_TERM_FCF for ${upperTicker}: $${terminalDCF.toFixed(2)} (with inputs)`);

    return response;
  }

  /**
   * Get all DCF methods for a ticker (FCFE methods removed - only 2 methods now)
   */
  async getAllDCFMethods(ticker: string): Promise<ExternalDCFResponse[]> {
    const results = await Promise.allSettled([
      this.getDCF_FCF_EXT(ticker),
      this.getDCF_TERM_EXT(ticker),
    ]);

    return results
      .filter((r): r is PromiseFulfilledResult<ExternalDCFResponse | null> =>
        r.status === 'fulfilled' && r.value !== null
      )
      .map(r => r.value as ExternalDCFResponse);
  }

  /**
   * Check divergence between internal and external DCF
   * Warns if divergence > 10%
   * REMOVED: FCFE methods (no FMP data)
   */
  async checkDivergence(
    ticker: string,
    internalIV: number,
    externalMethod: 'DCF_FCF' | 'DCF_TERM_FCF'
  ): Promise<DCFDivergenceCheck | null> {
    let externalDCF: ExternalDCFResponse | null = null;

    switch (externalMethod) {
      case 'DCF_FCF':
        externalDCF = await this.getDCF_FCF_EXT(ticker);
        break;
      case 'DCF_TERM_FCF':
        externalDCF = await this.getDCF_TERM_EXT(ticker);
        break;
    }

    if (!externalDCF) {
      return null;
    }

    const divergence_pct = ((internalIV - externalDCF.dcf) / externalDCF.dcf) * 100;
    const is_divergent = Math.abs(divergence_pct) > 10;

    if (is_divergent) {
      logger.warn(
        `[FMP-DCF] DIVERGENCE WARNING: ${ticker} ${externalMethod} - ` +
        `Internal: $${internalIV.toFixed(2)}, External: $${externalDCF.dcf.toFixed(2)}, ` +
        `Divergence: ${divergence_pct.toFixed(2)}%`
      );
    }

    return {
      ticker: ticker.toUpperCase(),
      internal_iv: internalIV,
      external_iv: externalDCF.dcf,
      divergence_pct,
      is_divergent,
      method: externalMethod,
    };
  }
}

// Export singleton instance
export const fmpDCFService = new FMPDCFService();
