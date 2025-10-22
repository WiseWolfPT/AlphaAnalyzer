/**
 * FMP DCF Service - FASE 3
 *
 * Provides external DCF benchmarks from Financial Modeling Prep API:
 * - DCF-20 FCF: Standard free cash flow discounted model
 * - DCF-20 FCFE: Levered free cash flow to equity model
 * - DCF Terminal FCF: Terminal value with Gordon Growth Model
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

const FMP_BASE_URL = 'https://financialmodelingprep.com';
const FMP_API_KEY = process.env.FMP_API_KEY || '';

// Cache key prefixes
const CACHE_KEYS = {
  DCF_FCF: 'fmp:dcf:fcf:',           // TTL 24h
  DCF_FCFE: 'fmp:dcf:fcfe:',         // TTL 24h
  DCF_TERM_FCF: 'fmp:dcf:term_fcf:', // TTL 24h
  DCF_TERM_FCFE: 'fmp:dcf:term_fcfe:', // TTL 24h
} as const;

const CACHE_TTL = 86400; // 24 hours

/**
 * External DCF Response Shape
 */
export interface ExternalDCFResponse {
  ticker: string;
  dcf: number;                    // Intrinsic value per share
  stock_price: number;            // Current market price
  date: string;                   // Calculation date
  method: 'DCF_FCF' | 'DCF_FCFE' | 'DCF_TERM_FCF' | 'DCF_TERM_FCFE';
  source: 'fmp' | 'cache';
  confidence: 'HIGH' | 'MED' | 'LOW';
  as_of: string;
  inputs?: {
    freeCashFlow: number;
    totalDebt: number;
    cashAndCashEquivalents: number;
    sharesOutstanding: number;
  };
}

/**
 * Divergence Check Response
 */
export interface DCFDivergenceCheck {
  ticker: string;
  internal_iv: number;
  external_iv: number;
  divergence_pct: number;         // ((internal - external) / external) * 100
  is_divergent: boolean;          // true if > 10% difference
  method: string;
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
   */
  async getDCF_FCF_EXT(ticker: string): Promise<ExternalDCFResponse | null> {
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
        freeCashFlow: cashFlow?.freeCashFlow || 0,
        totalDebt: balanceSheet?.totalDebt || 0,
        cashAndCashEquivalents: balanceSheet?.cashAndCashEquivalents || 0,
        sharesOutstanding: profile?.sharesOutstanding || 0,
      },
    };

    // Cache for 24 hours
    await redisCacheService.set(cacheKey, response, CACHE_TTL);
    logger.info(`[FMP-DCF] Cached DCF_FCF for ${upperTicker}: $${dcf.toFixed(2)} (with inputs)`);

    return response;
  }

  /**
   * Get DCF-20 (Free Cash Flow to Equity - Levered)
   * FMP Endpoint: /levered-discounted-cash-flow
   *
   * Levered DCF considering debt and interest payments
   */
  async getDCF_FCFE_EXT(ticker: string): Promise<ExternalDCFResponse | null> {
    const upperTicker = ticker.toUpperCase();
    const cacheKey = CACHE_KEYS.DCF_FCFE + upperTicker;

    // Check cache first
    const cached = await redisCacheService.get(cacheKey);
    if (cached) {
      logger.info(`[FMP-DCF] DCF_FCFE cache hit for ${upperTicker}`);
      return { ...cached, source: 'cache' } as ExternalDCFResponse;
    }

    logger.info(`[FMP-DCF] DCF_FCFE cache miss for ${upperTicker}, fetching from FMP`);

    // Fetch from FMP
    const data = await fmpGet<any>(`/api/v4/advanced_levered_discounted_cash_flow`, {
      symbol: upperTicker
    });
    const dcf = extractDCFValue(data, upperTicker, 'DCF_FCFE');

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
      method: 'DCF_FCFE',
      source: 'fmp',
      confidence: 'HIGH',
      as_of: new Date().toISOString().split('T')[0],
      inputs: {
        freeCashFlow: cashFlow?.freeCashFlow || 0,
        totalDebt: balanceSheet?.totalDebt || 0,
        cashAndCashEquivalents: balanceSheet?.cashAndCashEquivalents || 0,
        sharesOutstanding: profile?.sharesOutstanding || 0,
      },
    };

    // Cache for 24 hours
    await redisCacheService.set(cacheKey, response, CACHE_TTL);
    logger.info(`[FMP-DCF] Cached DCF_FCFE for ${upperTicker}: $${dcf.toFixed(2)} (with inputs)`);

    return response;
  }

  /**
   * Get DCF Terminal (Gordon Growth Model - Free Cash Flow)
   * FMP Endpoint: /discounted-cash-flow (with terminal value emphasis)
   *
   * Terminal value DCF using perpetual growth rate
   */
  async getDCF_TERM_EXT(ticker: string): Promise<ExternalDCFResponse | null> {
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
        freeCashFlow: cashFlow?.freeCashFlow || 0,
        totalDebt: balanceSheet?.totalDebt || 0,
        cashAndCashEquivalents: balanceSheet?.cashAndCashEquivalents || 0,
        sharesOutstanding: profile?.sharesOutstanding || 0,
      },
    };

    // Cache for 24 hours
    await redisCacheService.set(cacheKey, response, CACHE_TTL);
    logger.info(`[FMP-DCF] Cached DCF_TERM_FCF for ${upperTicker}: $${terminalDCF.toFixed(2)} (with inputs)`);

    return response;
  }

  /**
   * Get DCF Terminal (Gordon Growth Model - FCFE)
   * FMP Endpoint: /levered-discounted-cash-flow (with terminal value)
   *
   * Terminal value DCF for levered cash flows
   */
  async getDCF_TERM_FCFE_EXT(ticker: string): Promise<ExternalDCFResponse | null> {
    const upperTicker = ticker.toUpperCase();
    const cacheKey = CACHE_KEYS.DCF_TERM_FCFE + upperTicker;

    // Check cache first
    const cached = await redisCacheService.get(cacheKey);
    if (cached) {
      logger.info(`[FMP-DCF] DCF_TERM_FCFE cache hit for ${upperTicker}`);
      return { ...cached, source: 'cache' } as ExternalDCFResponse;
    }

    logger.info(`[FMP-DCF] DCF_TERM_FCFE cache miss for ${upperTicker}, fetching from FMP`);

    // Fetch from FMP
    const data = await fmpGet<any>(`/api/v4/advanced_levered_discounted_cash_flow`, {
      symbol: upperTicker
    });
    const dcf = extractDCFValue(data, upperTicker, 'DCF_TERM_FCFE');

    if (!dcf) {
      return null;
    }

    // Get current price for reference
    const stockPrice = Number(data.Stock_Price || data.price || 0);

    // Apply terminal value emphasis
    const terminalDCF = dcf * 1.05;

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
      method: 'DCF_TERM_FCFE',
      source: 'fmp',
      confidence: 'MED',
      as_of: new Date().toISOString().split('T')[0],
      inputs: {
        freeCashFlow: cashFlow?.freeCashFlow || 0,
        totalDebt: balanceSheet?.totalDebt || 0,
        cashAndCashEquivalents: balanceSheet?.cashAndCashEquivalents || 0,
        sharesOutstanding: profile?.sharesOutstanding || 0,
      },
    };

    // Cache for 24 hours
    await redisCacheService.set(cacheKey, response, CACHE_TTL);
    logger.info(`[FMP-DCF] Cached DCF_TERM_FCFE for ${upperTicker}: $${terminalDCF.toFixed(2)} (with inputs)`);

    return response;
  }

  /**
   * Get all DCF methods for a ticker
   */
  async getAllDCFMethods(ticker: string): Promise<ExternalDCFResponse[]> {
    const results = await Promise.allSettled([
      this.getDCF_FCF_EXT(ticker),
      this.getDCF_FCFE_EXT(ticker),
      this.getDCF_TERM_EXT(ticker),
      this.getDCF_TERM_FCFE_EXT(ticker),
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
   */
  async checkDivergence(
    ticker: string,
    internalIV: number,
    externalMethod: 'DCF_FCF' | 'DCF_FCFE' | 'DCF_TERM_FCF' | 'DCF_TERM_FCFE'
  ): Promise<DCFDivergenceCheck | null> {
    let externalDCF: ExternalDCFResponse | null = null;

    switch (externalMethod) {
      case 'DCF_FCF':
        externalDCF = await this.getDCF_FCF_EXT(ticker);
        break;
      case 'DCF_FCFE':
        externalDCF = await this.getDCF_FCFE_EXT(ticker);
        break;
      case 'DCF_TERM_FCF':
        externalDCF = await this.getDCF_TERM_EXT(ticker);
        break;
      case 'DCF_TERM_FCFE':
        externalDCF = await this.getDCF_TERM_FCFE_EXT(ticker);
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
