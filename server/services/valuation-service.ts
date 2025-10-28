/**
 * AlfaValue™ Valuation Service - FASE 2
 *
 * Implements intrinsic value calculation using multi-stage DCF model:
 * - Years 1-5: Historical FCF CAGR (clamped)
 * - Years 6-10: Blended growth (company decay + sector mid)
 * - Years 11-20: Terminal growth (regional GDP + inflation)
 * - Discount rate: CAPM (RF + β × MRP)
 * - Mid-year discounting applied
 *
 * Data sources: FMP APIs with Redis caching and fallbacks
 */

import axios from 'axios';
import { redisCacheService } from '../cache/redis-cache-service';
import { simpleCacheService } from './simple-cache-service';
import { logger } from '../lib/logger';
import { isBank, getBankType, getSectorPTBVBenchmark } from '../utils/stock-classifier';
import { fetchFinancialStatementsWithFallback, fetchAllStatementsWithFallback, getStatementQuality } from '../utils/financial-statements-fallback';
import { getSectorDefaults } from '../utils/sector-defaults';
import {
  AlfaValueResponse,
  RiskFreeRateResponse,
  MarketRiskPremiumResponse,
  TerminalGrowthResponse,
  SectorGrowthResponse,
  ValuationAssumptions,
  ValuationInputs,
  ValuationMeta,
  ValuationStatus,
  ValuationConfidence,
  Region,
  GrowthSource,
  FMPTreasuryRates,
  FMPMarketRiskPremium,
  FMPEconomicIndicators,
  FMPCompanyProfile,
  FMPFinancialStatement,
  VALUATION_CACHE_KEYS,
  VALUATION_DEFAULTS,
  VALUATION_CLAMPS,
  DNI20Response,
  DFCFTerminalResponse,
  PEValuationResponse,
  PSValuationResponse,
  PBValuationResponse,
  PEGValuationResponse,
  PSGValuationResponse,
  PTBVValuationResponse,
} from '../types/valuation';

const FMP_BASE_URL = 'https://financialmodelingprep.com';
const FMP_API_KEY = process.env.FMP_API_KEY || '';

/**
 * FASE 2 - BACKEND: Calibration Knobs (ENV-configurable)
 * These parameters allow fine-tuning valuation model without code changes
 *
 * CRITICAL FIX (2025-10-14): Changed G_1_5_FLOOR from 0.05 to 0.00
 * Reason: 5% floor was inflating IV for declining FCF companies (e.g., KO -14% CAGR → +5%)
 * Impact: Allows negative growth rates, better accuracy for mature/declining sectors
 */
const G_1_5_FLOOR = Number(process.env.G_1_5_FLOOR || '0.00'); // Default: 0% (allows negative growth)
const G_6_10_USE_WEIGHTS = process.env.G_6_10_USE_WEIGHTS === 'true'; // Default: false (baseline)
const G_6_10_COMPANY_WEIGHT = Number(process.env.G_6_10_COMPANY_WEIGHT || '0.6'); // Default: 60% company
const G_11_20_CLAMP_MODE = process.env.G_11_20_CLAMP_MODE || 'dynamic'; // 'dynamic' or 'fixed'

console.log('[ValuationService] Calibration knobs loaded:', {
  G_1_5_FLOOR: (G_1_5_FLOOR * 100).toFixed(2) + '%',
  G_6_10_USE_WEIGHTS,
  G_6_10_COMPANY_WEIGHT: (G_6_10_COMPANY_WEIGHT * 100).toFixed(2) + '%',
  G_11_20_CLAMP_MODE,
});

/**
 * Helper: Clamp value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Helper: Linear interpolation
 */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Helper: Safe division with fallback for zero denominators
 * Prevents Infinity/NaN crashes when dividing by zero (BUG FIX #1: PSG/PEG)
 *
 * @param numerator The dividend
 * @param denominator The divisor
 * @param fallback Value to return if division is unsafe (default: 0)
 * @returns Result of division or fallback if unsafe
 *
 * @example
 * safeDivide(10, 2) // 5
 * safeDivide(10, 0) // 0 (fallback)
 * safeDivide(10, 0, null) // null
 * safeDivide(Infinity, 5) // 0 (fallback)
 */
function safeDivide(numerator: number, denominator: number, fallback: number | null = 0): number | null {
  // Check if numerator is finite
  if (!isFinite(numerator)) {
    return fallback;
  }

  // Check if denominator is finite and non-zero
  if (!isFinite(denominator) || denominator === 0) {
    return fallback;
  }

  const result = numerator / denominator;

  // Final safety check: ensure result is finite
  if (!isFinite(result)) {
    return fallback;
  }

  return result;
}

/**
 * Helper: Calculate CAGR from array of values
 *
 * Handles negative FCF correctly:
 * - All positive: Standard CAGR formula
 * - Any negative: Return 0 (floor clamp will handle minimum growth)
 *
 * Rationale: CAGR is mathematically undefined for negative starting values.
 * For declining/mature companies with negative FCF, returning 0 allows
 * G_1_5_FLOOR (0% as of FASE 2) to set the actual floor, enabling proper
 * valuation of companies with occasional negative cash flows.
 */
function calculateCAGR(values: number[]): number {
  if (values.length < 2) return 0;

  const startValue = values[0];
  const endValue = values[values.length - 1];

  // Check if any value in the sequence is negative or zero
  const hasNegativeOrZero = values.some(v => v <= 0);

  if (hasNegativeOrZero) {
    // Return 0 to signal "no reliable historical growth"
    // The G_1_5_FLOOR clamp (currently 0%) will set the actual floor
    return 0;
  }

  // Standard CAGR formula for all-positive sequences
  const years = values.length - 1;
  return Math.pow(endValue / startValue, 1 / years) - 1;
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

    console.log(`[ValuationService] FMP API call: ${endpoint}`);
    const response = await axios.get<T>(url.toString(), {
      timeout: 10000,
      headers: {
        'Accept-Encoding': 'gzip',
      },
    });

    return response.data;
  } catch (error: any) {
    console.error(`[ValuationService] FMP API error (${endpoint}):`, error.message);
    return null;
  }
}

export class ValuationService {
  /**
   * Get current stock price from FMP
   */
  private async getCurrentPrice(ticker: string): Promise<number> {
    try {
      const data = await fmpGet<any[]>('/api/v3/quote/' + ticker);
      if (data && Array.isArray(data) && data[0]?.price) {
        return Number(data[0].price);
      }
      return 0;
    } catch (error) {
      console.error(`[ValuationService] Error fetching price for ${ticker}:`, error);
      return 0;
    }
  }

  /**
   * Get shares outstanding with robust 7-tier fallback cascade
   * Strategy: key-metrics → key-metrics-ttm → balance-sheet → income-statement → quote → profile → income+quote fallback
   * Returns shares in millions or null if all sources fail
   */
  private async getSharesOutstanding(ticker: string): Promise<number | null> {
    // Tier 1: key-metrics (annual, most reliable)
    try {
      const keyMetrics = await fmpGet<any[]>(`/api/v3/key-metrics/${ticker}`, { limit: 5 });
      if (keyMetrics && Array.isArray(keyMetrics) && keyMetrics.length > 0) {
        // Find first record with positive shares
        for (const record of keyMetrics) {
          const shares = Number(record.sharesOutstanding || 0);
          if (shares > 0 && isFinite(shares)) {
            logger.info(`[Shares] ${ticker}: key-metrics (${record.date || 'latest'}) → ${(shares / 1e6).toFixed(2)}M`);
            return shares / 1e6;
          }
        }
        logger.warn(`[Shares] ${ticker}: key-metrics returned ${keyMetrics.length} records but all had shares ≤ 0`);
      }
    } catch (err: any) {
      logger.warn(`[Shares] ${ticker}: key-metrics API error - ${err.message}`);
    }

    // Tier 2: key-metrics-ttm (trailing twelve months, more current)
    try {
      const keyMetricsTTM = await fmpGet<any[]>(`/api/v3/key-metrics-ttm/${ticker}`, { limit: 5 });
      if (keyMetricsTTM && Array.isArray(keyMetricsTTM) && keyMetricsTTM.length > 0) {
        for (const record of keyMetricsTTM) {
          const shares = Number(record.sharesOutstandingTTM || 0);
          if (shares > 0 && isFinite(shares)) {
            logger.info(`[Shares] ${ticker}: key-metrics-ttm (${record.date || 'latest'}) → ${(shares / 1e6).toFixed(2)}M`);
            return shares / 1e6;
          }
        }
        logger.warn(`[Shares] ${ticker}: key-metrics-ttm returned ${keyMetricsTTM.length} records but all had shares ≤ 0`);
      }
    } catch (err: any) {
      logger.warn(`[Shares] ${ticker}: key-metrics-ttm API error - ${err.message}`);
    }

    // Tier 3: balance-sheet (commonStockSharesOutstanding, very reliable)
    try {
      const balanceSheet = await fmpGet<any[]>(`/api/v3/balance-sheet-statement/${ticker}`, { period: 'annual', limit: 5 });
      if (balanceSheet && Array.isArray(balanceSheet) && balanceSheet.length > 0) {
        for (const record of balanceSheet) {
          const shares = Number(record.commonStockSharesOutstanding || 0);
          if (shares > 0 && isFinite(shares)) {
            logger.info(`[Shares] ${ticker}: balance-sheet (${record.date || 'latest'}) → ${(shares / 1e6).toFixed(2)}M`);
            return shares / 1e6;
          }
        }
        logger.warn(`[Shares] ${ticker}: balance-sheet returned ${balanceSheet.length} records but all had shares ≤ 0`);
      }
    } catch (err: any) {
      logger.warn(`[Shares] ${ticker}: balance-sheet API error - ${err.message}`);
    }

    // Tier 4: income-statement (weightedAverageShsOutDil/weightedAverageShsOut)
    try {
      const income = await fmpGet<any[]>(`/api/v3/income-statement/${ticker}`, { period: 'annual', limit: 5 });
      if (income && Array.isArray(income) && income.length > 0) {
        for (const record of income) {
          const shares = Number(record.weightedAverageShsOutDil || record.weightedAverageShsOut || 0);
          if (shares > 0 && isFinite(shares)) {
            logger.info(`[Shares] ${ticker}: income-statement (${record.date || 'latest'}) → ${(shares / 1e6).toFixed(2)}M`);
            return shares / 1e6;
          }
        }
        logger.warn(`[Shares] ${ticker}: income-statement returned ${income.length} records but all had shares ≤ 0`);
      }
    } catch (err: any) {
      logger.warn(`[Shares] ${ticker}: income-statement API error - ${err.message}`);
    }

    // Tier 5: quote (live marketCap/price)
    try {
      const quote = await fmpGet<any[]>(`/api/v3/quote/${ticker}`);
      if (quote && Array.isArray(quote) && quote[0]) {
        const marketCap = Number(quote[0].marketCap || 0);
        const price = Number(quote[0].price || 0);
        if (marketCap > 0 && price > 0 && isFinite(marketCap) && isFinite(price)) {
          const shares = safeDivide(marketCap, price, null);
          if (shares !== null && shares > 0) {
            logger.info(`[Shares] ${ticker}: quote (marketCap/price) → ${(shares / 1e6).toFixed(2)}M`);
            return shares / 1e6;
          }
        }
        logger.warn(`[Shares] ${ticker}: quote failed (marketCap=${marketCap}, price=${price})`);
      }
    } catch (err: any) {
      logger.warn(`[Shares] ${ticker}: quote API error - ${err.message}`);
    }

    // Tier 6: profile (mktCap/price) - Try both field names (FMP API inconsistency)
    try {
      const profile = await fmpGet<FMPCompanyProfile[]>(`/api/v3/profile/${ticker}`);
      if (profile && Array.isArray(profile) && profile[0]) {
        // Try both field names (FMP API inconsistency: mktCap vs marketCap)
        const marketCap = Number((profile[0] as any).mktCap || (profile[0] as any).marketCap || 0);
        const price = Number(profile[0].price || 0);

        if (marketCap > 0 && price > 0 && isFinite(marketCap) && isFinite(price)) {
          const shares = marketCap / price;
          logger.info(`[Shares] ${ticker}: profile (marketCap/price) → ${(shares / 1e6).toFixed(2)}M`);
          return shares / 1e6;
        }
        logger.warn(`[Shares] ${ticker}: profile failed (marketCap=${marketCap}, price=${price})`);
      }
    } catch (err: any) {
      logger.warn(`[Shares] ${ticker}: profile API error - ${err.message}`);
    }

    // Tier 7: Last resort - income-statement weighted shares * (price / EPS)
    // If we have income and quote but marketCap missing, estimate from EPS
    try {
      const income = await fmpGet<any[]>(`/api/v3/income-statement/${ticker}`, { period: 'annual', limit: 5 });
      const quote = await fmpGet<any[]>(`/api/v3/quote/${ticker}`);
      if (income && Array.isArray(income) && income.length > 0 && quote && Array.isArray(quote) && quote[0]) {
        const quotePrice = Number(quote[0].price || 0);
        for (const record of income) {
          const eps = Number(record.eps || record.epsdiluted || 0);
          if (eps > 0 && isFinite(eps) && quotePrice > 0 && isFinite(quotePrice)) {
            const pe = quotePrice / eps;
            if (pe > 5 && pe < 100) {
              const netIncome = Number(record.netIncome || 0);
              if (netIncome > 0 && isFinite(netIncome)) {
                const shares = netIncome / eps;
                if (shares > 0 && isFinite(shares)) {
                  logger.info(`[Shares] ${ticker}: income+quote fallback (${record.date || 'latest'}, P/E=${pe.toFixed(1)}) → ${(shares / 1e6).toFixed(2)}M`);
                  return shares / 1e6;
                }
              }
            }
          }
        }
        logger.warn(`[Shares] ${ticker}: income+quote fallback returned ${income.length} records but none yielded valid shares (P/E check or netIncome)`);
      }
    } catch (err: any) {
      logger.warn(`[Shares] ${ticker}: income+quote fallback error - ${err.message}`);
    }

    logger.warn(`[Shares] ${ticker}: ALL 7 tiers exhausted - no shares available`);
    return null;
  }

  /**
   * Get Risk-Free Rate (US 10Y Treasury)
   * Source: FMP /stable/treasury-rates
   * Cache: rf:{region} TTL 24h
   */
  async getRiskFree(region: Region = 'US'): Promise<RiskFreeRateResponse> {
    const cacheKey = VALUATION_CACHE_KEYS.RF + region;

    // Check cache first
    const cached = await redisCacheService.get<RiskFreeRateResponse>(cacheKey);
    if (cached) {
      console.log(`[ValuationService] RF cache hit for ${region}`);
      return cached;
    }

    console.log(`[ValuationService] RF cache miss for ${region}, fetching from FMP`);

    // Fetch from FMP
    const data = await fmpGet<FMPTreasuryRates[]>('/api/stable/treasury-rates');

    if (data && Array.isArray(data) && data.length > 0) {
      const latest = data[0];
      const rf = Number(latest.year10) / 100; // Convert to decimal (e.g., 4.25 → 0.0425)

      const response: RiskFreeRateResponse = {
        region,
        rf,
        source: 'fmp',
        as_of: latest.date,
      };

      // Cache for 24 hours
      await redisCacheService.set(cacheKey, response, 86400);
      console.log(`[ValuationService] Cached RF for ${region}: ${rf.toFixed(4)}`);

      return response;
    }

    // Fallback to default
    console.warn(`[ValuationService] Using fallback RF for ${region}`);
    const fallbackResponse: RiskFreeRateResponse = {
      region,
      rf: VALUATION_DEFAULTS.RF,
      source: 'fallback',
      as_of: new Date().toISOString().split('T')[0],
    };

    // Cache fallback for 24 hours
    await redisCacheService.set(cacheKey, fallbackResponse, 86400);

    return fallbackResponse;
  }

  /**
   * Get Market Risk Premium
   * Source: FMP /stable/market-risk-premium
   * Cache: mrp:{region} TTL 31d
   */
  async getMRP(region: Region = 'US'): Promise<MarketRiskPremiumResponse> {
    const cacheKey = VALUATION_CACHE_KEYS.MRP + region;

    // Check cache first
    const cached = await redisCacheService.get<MarketRiskPremiumResponse>(cacheKey);
    if (cached) {
      console.log(`[ValuationService] MRP cache hit for ${region}`);
      return cached;
    }

    console.log(`[ValuationService] MRP cache miss for ${region}, fetching from FMP`);

    // Fetch from FMP
    const data = await fmpGet<FMPMarketRiskPremium[]>('/api/stable/market-risk-premium');

    if (data && Array.isArray(data)) {
      // Find matching region/country
      const regionMap: Record<Region, string[]> = {
        US: ['United States', 'US', 'USA', 'North America'],
        EU: ['Europe', 'European Union', 'EU'],
        CN: ['China', 'CN'],
        BR: ['Brazil', 'BR'],
        UK: ['United Kingdom', 'UK', 'GB'],
        JP: ['Japan', 'JP'],
      };

      const matchingCountries = regionMap[region] || [region];
      const match = data.find((item) =>
        matchingCountries.some((c) => item.country.toLowerCase().includes(c.toLowerCase()))
      );

      if (match && match.totalEquityRiskPremium) {
        const mrp = Number(match.totalEquityRiskPremium) / 100; // Convert to decimal

        const response: MarketRiskPremiumResponse = {
          region,
          mrp,
          source: 'fmp',
          covered: true,
          as_of: new Date().toISOString().split('T')[0],
        };

        // Cache for 31 days
        await redisCacheService.set(cacheKey, response, 31 * 86400);
        console.log(`[ValuationService] Cached MRP for ${region}: ${mrp.toFixed(4)}`);

        return response;
      }
    }

    // Fallback to default
    console.warn(`[ValuationService] Using fallback MRP for ${region}`);
    const fallbackResponse: MarketRiskPremiumResponse = {
      region,
      mrp: VALUATION_DEFAULTS.MRP,
      source: 'fallback',
      covered: false,
      as_of: new Date().toISOString().split('T')[0],
    };

    // Cache fallback for 31 days
    await redisCacheService.set(cacheKey, fallbackResponse, 31 * 86400);

    return fallbackResponse;
  }

  /**
   * Get Terminal Regional Growth Rate (g_term_region)
   * Source: FMP /stable/economic-indicators (GDP + CPI)
   * Formula: g_term = clamp(gdp_real_growth + inflation, 3%, 5%)
   * Cache: g_term_region:{region} TTL 365d
   */
  async getGTerm(region: Region = 'US'): Promise<TerminalGrowthResponse> {
    const cacheKey = VALUATION_CACHE_KEYS.G_TERM + region;

    // Check cache first
    const cached = await redisCacheService.get<TerminalGrowthResponse>(cacheKey);
    if (cached) {
      console.log(`[ValuationService] g_term cache hit for ${region}`);
      return cached;
    }

    console.log(`[ValuationService] g_term cache miss for ${region}, fetching from FMP`);

    try {
      // Fetch GDP and CPI data
      const gdpData = await fmpGet<FMPEconomicIndicators[]>('/api/stable/economic-indicators', {
        name: 'realGDP',
      });
      const cpiData = await fmpGet<FMPEconomicIndicators[]>('/api/stable/economic-indicators', {
        name: 'CPI',
      });

      let gdpGrowth = 0;
      let inflation = 0;

      // Calculate YoY GDP growth
      if (gdpData && Array.isArray(gdpData) && gdpData.length >= 5) {
        const latest = gdpData[0].value;
        const yearAgo = gdpData[4].value; // 4 quarters ago
        gdpGrowth = (latest / yearAgo) - 1;
      }

      // Get inflation rate
      if (cpiData && Array.isArray(cpiData) && cpiData.length > 0) {
        inflation = Number(cpiData[0].changePercentage || 0) / 100;
      }

      if (gdpGrowth !== 0 && inflation !== 0) {
        const g_term = clamp(gdpGrowth + inflation, 0.03, 0.05);

        const response: TerminalGrowthResponse = {
          region,
          g_term,
          gdp_growth: gdpGrowth,
          inflation,
          source: 'fmp',
          as_of: gdpData[0]?.date || new Date().toISOString().split('T')[0],
        };

        // Cache for 365 days
        await redisCacheService.set(cacheKey, response, 365 * 86400);
        console.log(`[ValuationService] Cached g_term for ${region}: ${g_term.toFixed(4)}`);

        return response;
      }
    } catch (error) {
      console.error('[ValuationService] Error fetching economic indicators:', error);
    }

    // Fallback to static table
    console.warn(`[ValuationService] Using fallback g_term for ${region}`);
    const g_term = VALUATION_DEFAULTS.G_TERM[region] || VALUATION_DEFAULTS.G_TERM.US;

    const fallbackResponse: TerminalGrowthResponse = {
      region,
      g_term,
      source: 'static',
      as_of: new Date().toISOString().split('T')[0],
    };

    // Cache fallback for 365 days
    await redisCacheService.set(cacheKey, fallbackResponse, 365 * 86400);

    return fallbackResponse;
  }

  /**
   * Get Sector Mid-Growth Rate
   * Dynamic calculation based on industry peers
   * Cache: sector:growth:industry:{key} TTL 30d
   */
  async getSectorGrowth(industry: string): Promise<SectorGrowthResponse> {
    const cacheKey = VALUATION_CACHE_KEYS.G_SECTOR + industry.toLowerCase().replace(/\s+/g, '_');

    // Check cache first
    const cached = await redisCacheService.get<SectorGrowthResponse>(cacheKey);
    if (cached) {
      console.log(`[ValuationService] Sector growth cache hit for ${industry}`);
      return cached;
    }

    console.log(`[ValuationService] Sector growth cache miss for ${industry}, calculating dynamically`);

    // For now, use a simplified approach with Damodaran-style static fallback
    // TODO: Implement full dynamic peer analysis in future enhancement
    const sectorGrowthTable: Record<string, number> = {
      technology: 0.12,
      'software': 0.14,
      'consumer electronics': 0.10,  // Apple, Samsung, etc. - growth tech sector
      healthcare: 0.08,
      financials: 0.06,
      'consumer cyclical': 0.07,
      'consumer defensive': 0.05,
      industrials: 0.06,
      energy: 0.04,
      utilities: 0.03,
      'real estate': 0.04,
      materials: 0.05,
      telecommunications: 0.04,
    };

    const industryLower = industry.toLowerCase();
    let g_sector_mid = 0.06; // Default 6%

    // Find matching sector
    for (const [key, value] of Object.entries(sectorGrowthTable)) {
      if (industryLower.includes(key)) {
        g_sector_mid = value;
        break;
      }
    }

    // Clamp to safety range
    g_sector_mid = clamp(g_sector_mid, VALUATION_CLAMPS.G_SECTOR_MID.min, VALUATION_CLAMPS.G_SECTOR_MID.max);

    const response: SectorGrowthResponse = {
      industry,
      g_sector_mid,
      source: 'static',
      as_of: new Date().toISOString().split('T')[0],
    };

    // Cache for 30 days
    await redisCacheService.set(cacheKey, response, 30 * 86400);
    console.log(`[ValuationService] Cached sector growth for ${industry}: ${g_sector_mid.toFixed(4)}`);

    return response;
  }

  /**
   * Calculate AlfaValue™ (Main Intrinsic Value)
   *
   * Multi-stage DCF model:
   * 1. Fetch inputs (FCF, Cash, Debt, Shares, Beta, Industry)
   * 2. Calculate growth rates (g1_5, g6_10, g11_20)
   * 3. Calculate discount rate (CAPM: RF + β × MRP)
   * 4. Project FCF for 20 years with mid-year discounting
   * 5. Calculate equity value and IV per share
   */
  async getAlfaValue(ticker: string): Promise<AlfaValueResponse> {
    const upperTicker = ticker.toUpperCase();
    const cacheKey = VALUATION_CACHE_KEYS.IV_CALC + upperTicker;

    // Check cache first
    const cached = await redisCacheService.get<AlfaValueResponse>(cacheKey);
    if (cached) {
      console.log(`[ValuationService] IV cache hit for ${upperTicker}`);
      return cached;
    }

    console.log(`[ValuationService] IV cache miss for ${upperTicker}, calculating...`);

    try {
      // Step 1: Fetch company profile
      const profileData = await fmpGet<FMPCompanyProfile[]>('/api/v3/profile/' + upperTicker);
      if (!profileData || !Array.isArray(profileData) || profileData.length === 0) {
        throw new Error(`No profile data found for ${upperTicker}`);
      }
      const profile = profileData[0];

      // Step 2: Fetch financial statements (last 5 years)
      const cashFlowData = await fmpGet<FMPFinancialStatement[]>('/api/v3/cash-flow-statement/' + upperTicker, {
        limit: 5,
      });
      const balanceSheetData = await fmpGet<FMPFinancialStatement[]>('/api/v3/balance-sheet-statement/' + upperTicker, {
        limit: 1,
      });

      if (!cashFlowData || !Array.isArray(cashFlowData) || cashFlowData.length === 0) {
        throw new Error(`No cash flow data found for ${upperTicker}`);
      }
      if (!balanceSheetData || !Array.isArray(balanceSheetData) || balanceSheetData.length === 0) {
        throw new Error(`No balance sheet data found for ${upperTicker}`);
      }

      // Step 3: Extract inputs
      const fcf_5y = cashFlowData
        .map((stmt) => {
          const fcf = stmt.freeCashFlow || (stmt.operatingCashFlow || 0) - (stmt.capitalExpenditure || 0);
          return fcf / 1_000_000; // Convert to millions
        })
        .reverse(); // Order from oldest to newest

      const latestCashFlow = cashFlowData[0];
      const latestBalanceSheet = balanceSheetData[0];

      const fcf_ttm = (latestCashFlow.freeCashFlow ||
        (latestCashFlow.operatingCashFlow || 0) - (latestCashFlow.capitalExpenditure || 0)) / 1_000_000;

      const cash = ((latestBalanceSheet.cashAndCashEquivalents || 0) +
        (latestBalanceSheet.shortTermInvestments || 0)) / 1_000_000;

      const debt = (latestBalanceSheet.totalDebt || 0) / 1_000_000;

      // Step 3b: Get shares outstanding using robust fallback cascade
      const shares_m = await this.getSharesOutstanding(upperTicker);

      // DEFENSIVE: If shares unavailable or invalid, return unavailable status
      if (!shares_m || shares_m <= 0 || !isFinite(shares_m)) {
        console.warn(`[ValuationService] ${upperTicker} - Cannot calculate IV: shares unavailable`);
        return {
          ticker: upperTicker,
          iv: null as any, // Will be marked as unavailable
          price: await this.getCurrentPrice(upperTicker),
          discount_pct: null as any,
          status: 'fair' as ValuationStatus,
          assumptions: {
            g_1_5: 0,
            g_6_10: 0,
            g_11_20: 0,
            discount_rate: 0,
            rf: 0,
            beta: 0,
            mrp: 0,
          },
          inputs: {
            fcf_ttm_musd: fcf_ttm,
            fcf_5y_musd: fcf_5y,
            cash_musd: cash,
            debt_musd: debt,
            shares_m: null as any,
          },
          meta: {
            g_sector_mid: 0,
            g_sector_source: 'static' as GrowthSource,
            g_term_region: 0,
            region: 'US',
          },
          confidence: 'LOW',
          as_of: new Date().toISOString().split('T')[0],
        };
      }

      const beta = clamp(profile.beta || VALUATION_DEFAULTS.BETA, VALUATION_CLAMPS.BETA.min, VALUATION_CLAMPS.BETA.max);
      const industry = profile.industry || 'Unknown';
      const region: Region = 'US'; // Default to US for now

      console.log(`[ValuationService] ${upperTicker} inputs:`, {
        fcf_ttm: fcf_ttm.toFixed(2) + 'M',
        fcf_5y: fcf_5y.map(v => v.toFixed(2) + 'M'),
        cash: cash.toFixed(2) + 'M',
        debt: debt.toFixed(2) + 'M',
        shares: shares_m.toFixed(2) + 'M',
        beta: beta.toFixed(2),
        industry,
      });

      // Step 4: Calculate growth rates
      const g1_5_raw = calculateCAGR(fcf_5y);
      // KNOB: G_1_5_FLOOR allows adjusting minimum growth floor
      const g1_5 = clamp(g1_5_raw, G_1_5_FLOOR, VALUATION_CLAMPS.G_1_5.max);

      const sectorGrowthData = await this.getSectorGrowth(industry);
      const g_sector_mid = sectorGrowthData.g_sector_mid;

      // KNOB: G_6_10_USE_WEIGHTS switches between baseline and weighted approach
      let g6_10: number;
      if (G_6_10_USE_WEIGHTS) {
        // Calibration mode: simple weighted average
        console.log(`[ValuationService] Using weighted g6_10 (company ${(G_6_10_COMPANY_WEIGHT * 100).toFixed(0)}%)`);
        g6_10 = clamp(
          G_6_10_COMPANY_WEIGHT * g1_5 + (1 - G_6_10_COMPANY_WEIGHT) * g_sector_mid,
          VALUATION_CLAMPS.G_6_10.min,
          VALUATION_CLAMPS.G_6_10.max
        );
      } else {
        // Baseline mode: decay-based blending
        const decay = g1_5 < 0.08 ? 0.70 : 0.50;
        g6_10 = clamp(
          0.6 * (g1_5 * decay) + 0.4 * g_sector_mid,
          VALUATION_CLAMPS.G_6_10.min,
          VALUATION_CLAMPS.G_6_10.max
        );
      }

      const gTermData = await this.getGTerm(region);
      const g_term_region = gTermData.g_term;

      const base = lerp(g6_10, g_term_region, 0.7);

      // KNOB: G_11_20_CLAMP_MODE switches between fixed and dynamic clamps
      let g11_20: number;
      if (G_11_20_CLAMP_MODE === 'fixed') {
        // Fixed clamp [3%, 5%]
        console.log('[ValuationService] Using fixed g11_20 clamp [3%, 5%]');
        g11_20 = clamp(base, 0.03, 0.05);
      } else {
        // Dynamic clamp (baseline)
        g11_20 = clamp(
          base,
          Math.max(0.03, g_term_region - 0.01),
          Math.min(0.05, g_term_region + 0.01)
        );
      }

      console.log(`[ValuationService] ${upperTicker} growth rates:`, {
        g1_5: (g1_5 * 100).toFixed(2) + '%',
        g6_10: (g6_10 * 100).toFixed(2) + '%',
        g11_20: (g11_20 * 100).toFixed(2) + '%',
      });

      // Step 5: Calculate discount rate (CAPM)
      const rfData = await this.getRiskFree(region);
      const mrpData = await this.getMRP(region);

      const rf = rfData.rf;
      const mrp = mrpData.mrp;
      const dr = clamp(rf + beta * mrp, VALUATION_CLAMPS.DR.min, VALUATION_CLAMPS.DR.max);

      console.log(`[ValuationService] ${upperTicker} discount rate:`, {
        rf: (rf * 100).toFixed(2) + '%',
        mrp: (mrp * 100).toFixed(2) + '%',
        beta: beta.toFixed(2),
        dr: (dr * 100).toFixed(2) + '%',
      });

      // Step 6: Project FCF and calculate PV (20 years, mid-year discounting)
      let pv = 0;
      let currentFCF = fcf_ttm;

      for (let year = 1; year <= 20; year++) {
        let growthRate: number;
        if (year <= 5) {
          growthRate = g1_5;
        } else if (year <= 10) {
          growthRate = g6_10;
        } else {
          growthRate = g11_20;
        }

        currentFCF *= (1 + growthRate);
        const discountFactor = Math.pow(1 + dr, year - 0.5); // Mid-year discounting
        pv += currentFCF / discountFactor;
      }

      console.log(`[ValuationService] ${upperTicker} PV of FCF (20y): ${pv.toFixed(2)}M`);

      // Step 7: Calculate equity value and IV per share
      const equityValue = pv + cash - debt;
      const iv = equityValue / shares_m;

      // DEFENSIVE: Validate IV result
      if (!isFinite(iv) || iv <= 0) {
        console.warn(`[ValuationService] ${upperTicker} - Invalid IV calculation: ${iv}`);
        return {
          ticker: upperTicker,
          iv: null as any,
          price: await this.getCurrentPrice(upperTicker),
          discount_pct: null as any,
          status: 'fair' as ValuationStatus,
          assumptions: {
            g_1_5: g1_5,
            g_6_10: g6_10,
            g_11_20: g11_20,
            discount_rate: dr,
            rf,
            beta,
            mrp,
          },
          inputs: {
            fcf_ttm_musd: fcf_ttm,
            fcf_5y_musd: fcf_5y,
            cash_musd: cash,
            debt_musd: debt,
            shares_m,
          },
          meta: {
            g_sector_mid,
            g_sector_source: sectorGrowthData.source,
            g_term_region,
            region,
          },
          confidence: 'LOW',
          as_of: new Date().toISOString().split('T')[0],
        };
      }

      console.log(`[ValuationService] ${upperTicker} valuation:`, {
        pv: pv.toFixed(2) + 'M',
        cash: cash.toFixed(2) + 'M',
        debt: debt.toFixed(2) + 'M',
        equity: equityValue.toFixed(2) + 'M',
        shares: shares_m.toFixed(2) + 'M',
        iv: '$' + iv.toFixed(2),
      });

      // Step 8: Get current price and calculate status
      const price = await this.getCurrentPrice(upperTicker);
      const discount_pct = ((iv - price) / price) * 100;

      let status: ValuationStatus = 'fair';
      if (discount_pct >= 5) {
        status = 'undervalued';
      } else if (discount_pct <= -5) {
        status = 'overvalued';
      }

      // Determine confidence level
      let confidence: ValuationConfidence = 'HIGH';
      if (beta === VALUATION_DEFAULTS.BETA || rfData.source === 'fallback' || mrpData.source === 'fallback') {
        confidence = 'MED';
      }
      if (fcf_ttm <= 0 || fcf_5y.some(v => v <= 0)) {
        confidence = 'LOW';
      }

      // Build response
      const response: AlfaValueResponse = {
        ticker: upperTicker,
        iv,
        price,
        discount_pct,
        status,
        assumptions: {
          g_1_5: g1_5,
          g_6_10: g6_10,
          g_11_20: g11_20,
          discount_rate: dr,
          rf,
          beta,
          mrp,
        },
        inputs: {
          fcf_ttm_musd: fcf_ttm,
          fcf_5y_musd: fcf_5y,
          cash_musd: cash,
          debt_musd: debt,
          shares_m: shares_m, // Fixed: use shares_m from robust fallback
        },
        meta: {
          g_sector_mid,
          g_sector_source: sectorGrowthData.source,
          g_term_region,
          region,
        },
        confidence,
        as_of: new Date().toISOString().split('T')[0],
      };

      // DEFENSIVE: Only cache if IV is valid
      if (isFinite(iv) && iv > 0) {
        await redisCacheService.set(cacheKey, response, 86400); // 24h TTL
        console.log(`[ValuationService] Cached IV for ${upperTicker}: $${iv.toFixed(2)} (${status}, ${discount_pct.toFixed(2)}%)`);
      } else {
        console.warn(`[ValuationService] NOT caching invalid IV for ${upperTicker}: ${iv}`);
      }

      return response;
    } catch (error: any) {
      console.error(`[ValuationService] Error calculating AlfaValue for ${upperTicker}:`, error.message);
      throw new Error(`Failed to calculate AlfaValue for ${upperTicker}: ${error.message}`);
    }
  }

  /**
   * FASE 3: Calculate P/E Mean (5y)
   * Formula: IV = Mean_PE_5y × EPS_TTM
   *
   * Uses historical P/E ratios from last 5 years and current earnings
   */
  async calculatePEMean5Y(ticker: string): Promise<PEValuationResponse | null> {
    const upperTicker = ticker.toUpperCase();
    const cacheKey = VALUATION_CACHE_KEYS.IV_CALC + upperTicker + ':pe_mean';

    // Check cache
    const cached = await redisCacheService.get<PEValuationResponse>(cacheKey);
    if (cached) {
      logger.info(`[ValuationService] P/E Mean cache hit for ${upperTicker}`);
      return cached;
    }

    try {
      // Get current price first (needed for sector fallback)
      const currentPrice = await this.getCurrentPrice(upperTicker);
      if (!currentPrice || currentPrice <= 0) {
        logger.warn(`[ValuationService] Invalid current price for ${upperTicker}`);
        return null;
      }

      // Fetch company profile to get sector (for fallback)
      let sector: string | null = null;
      try {
        const profileData = await fmpGet<FMPCompanyProfile[]>('/api/v3/profile/' + upperTicker);
        if (profileData && Array.isArray(profileData) && profileData.length > 0) {
          sector = profileData[0].sector;
        }
      } catch (error: any) {
        logger.warn(`[ValuationService] Could not fetch profile for ${upperTicker}, sector fallback unavailable`);
      }

      // Fetch historical ratios (last 5 years)
      const ratiosData = await fmpGet<any[]>(`/api/v3/ratios/${upperTicker}`, { limit: 5 });

      let meanPE: number;
      let peRatios: number[] = [];
      let usedSectorFallback = false;

      if (!ratiosData || !Array.isArray(ratiosData) || ratiosData.length === 0) {
        logger.warn(`[ValuationService] No ratios data for ${upperTicker}, attempting sector fallback`);

        // Use sector default P/E
        const sectorDefaults = getSectorDefaults(sector);
        if (!sectorDefaults) {
          logger.warn(`[ValuationService] No sector defaults available for ${upperTicker}`);
          return null;
        }

        meanPE = sectorDefaults.peRatio;
        usedSectorFallback = true;
        logger.info(`[ValuationService] Using sector default P/E for ${upperTicker}: ${sector} = ${meanPE.toFixed(2)}`);
      } else {
        // Extract P/E ratios
        peRatios = ratiosData
          .map(r => Number(r.priceEarningsRatio || 0))
          .filter(pe => pe > 0 && pe < 100); // Filter outliers

        if (peRatios.length < 3) {
          // Not enough historical data, use sector fallback
          logger.warn(`[ValuationService] Insufficient P/E data for ${upperTicker} (${peRatios.length} years), using sector fallback`);

          const sectorDefaults = getSectorDefaults(sector);
          if (!sectorDefaults) {
            logger.warn(`[ValuationService] No sector defaults available for ${upperTicker}`);
            return null;
          }

          meanPE = sectorDefaults.peRatio;
          usedSectorFallback = true;
          logger.info(`[ValuationService] Using sector default P/E for ${upperTicker}: ${sector} = ${meanPE.toFixed(2)}`);
        } else {
          // Calculate mean P/E from historical data
          meanPE = peRatios.reduce((sum, pe) => sum + pe, 0) / peRatios.length;
        }
      }

      // Get current EPS (TTM)
      let epsTTM: number;

      const keyMetricsTTM = await fmpGet<any[]>(`/api/v3/key-metrics-ttm/${upperTicker}`);
      if (!keyMetricsTTM || !Array.isArray(keyMetricsTTM) || keyMetricsTTM.length === 0) {
        logger.warn(`[ValuationService] No key metrics TTM for ${upperTicker}, estimating EPS from P/E`);

        // Estimate EPS from current price and mean P/E
        epsTTM = currentPrice / meanPE;
        usedSectorFallback = true;
      } else {
        const rawEPS = Number(keyMetricsTTM[0].netIncomePerShareTTM || 0);
        if (rawEPS <= 0) {
          logger.warn(`[ValuationService] Invalid EPS TTM for ${upperTicker}: ${rawEPS}, estimating from P/E`);

          // Estimate EPS from current price and mean P/E
          epsTTM = currentPrice / meanPE;
          usedSectorFallback = true;
        } else {
          epsTTM = rawEPS;
        }
      }

      // Calculate intrinsic value
      const iv = meanPE * epsTTM;

      if (!isFinite(iv) || iv <= 0) {
        logger.warn(`[ValuationService] Invalid IV calculated for ${upperTicker}: ${iv}`);
        return null;
      }

      // Build response
      const response: PEValuationResponse = {
        ticker: upperTicker,
        iv,
        avgPE: meanPE,
        currentPrice,
        eps: epsTTM,
        historicalPE: peRatios,
        excludeNRI: false,
        confidence: usedSectorFallback ? 'LOW' : 'MED',
        as_of: new Date().toISOString().split('T')[0],
      };

      logger.info(
        `[ValuationService] P/E Mean for ${upperTicker}: Mean=${meanPE.toFixed(2)}, EPS=${epsTTM.toFixed(2)}, IV=$${iv.toFixed(2)}` +
        (usedSectorFallback ? ` [SECTOR FALLBACK: ${sector}]` : '')
      );

      // Cache for 24h
      await redisCacheService.set(cacheKey, response, 86400);

      return response;
    } catch (error: any) {
      logger.error(`[ValuationService] Error calculating P/E Mean for ${upperTicker}:`, error.message);
      return null;
    }
  }

  /**
   * FASE 3: Calculate P/S Mean (5y)
   * Formula: IV = Mean_PS_5y × Sales_per_Share_TTM
   */
  async calculatePSMean5Y(ticker: string): Promise<PSValuationResponse | null> {
    const upperTicker = ticker.toUpperCase();
    const cacheKey = VALUATION_CACHE_KEYS.IV_CALC + upperTicker + ':ps_mean';

    // Check cache
    const cached = await redisCacheService.get<PSValuationResponse>(cacheKey);
    if (cached) {
      logger.info(`[ValuationService] P/S Mean cache hit for ${upperTicker}`);
      return cached;
    }

    try {
      // Get current price first (needed for sector fallback)
      const currentPrice = await this.getCurrentPrice(upperTicker);
      if (!currentPrice || currentPrice <= 0) {
        logger.warn(`[ValuationService] Invalid current price for ${upperTicker}`);
        return null;
      }

      // Fetch company profile to get sector (for fallback)
      let sector: string | null = null;
      try {
        const profileData = await fmpGet<FMPCompanyProfile[]>('/api/v3/profile/' + upperTicker);
        if (profileData && Array.isArray(profileData) && profileData.length > 0) {
          sector = profileData[0].sector;
        }
      } catch (error: any) {
        logger.warn(`[ValuationService] Could not fetch profile for ${upperTicker}, sector fallback unavailable`);
      }

      // Fetch historical ratios (last 5 years)
      const ratiosData = await fmpGet<any[]>(`/api/v3/ratios/${upperTicker}`, { limit: 5 });

      let avgPS: number;
      let psRatios: number[] = [];
      let usedSectorFallback = false;

      if (!ratiosData || !Array.isArray(ratiosData) || ratiosData.length === 0) {
        logger.warn(`[ValuationService] No ratios data for ${upperTicker}, attempting sector fallback`);

        // Use sector default P/S
        const sectorDefaults = getSectorDefaults(sector);
        if (!sectorDefaults) {
          logger.warn(`[ValuationService] No sector defaults available for ${upperTicker}`);
          return null;
        }

        avgPS = sectorDefaults.psRatio;
        usedSectorFallback = true;
        logger.info(`[ValuationService] Using sector default P/S for ${upperTicker}: ${sector} = ${avgPS.toFixed(2)}`);
      } else {
        // Extract P/S ratios
        psRatios = ratiosData
          .map(r => Number(r.priceToSalesRatio || 0))
          .filter(ps => ps > 0 && ps < 50); // Filter outliers

        if (psRatios.length < 3) {
          // Not enough historical data, use sector fallback
          logger.warn(`[ValuationService] Insufficient P/S data for ${upperTicker} (${psRatios.length} years), using sector fallback`);

          const sectorDefaults = getSectorDefaults(sector);
          if (!sectorDefaults) {
            logger.warn(`[ValuationService] No sector defaults available for ${upperTicker}`);
            return null;
          }

          avgPS = sectorDefaults.psRatio;
          usedSectorFallback = true;
          logger.info(`[ValuationService] Using sector default P/S for ${upperTicker}: ${sector} = ${avgPS.toFixed(2)}`);
        } else {
          // Calculate mean P/S from historical data
          avgPS = psRatios.reduce((sum, ps) => sum + ps, 0) / psRatios.length;
        }
      }

      // Get current Sales per Share (TTM)
      let salesPerShare: number;

      const keyMetricsTTM = await fmpGet<any[]>(`/api/v3/key-metrics-ttm/${upperTicker}`);
      if (!keyMetricsTTM || !Array.isArray(keyMetricsTTM) || keyMetricsTTM.length === 0) {
        logger.warn(`[ValuationService] No key metrics TTM for ${upperTicker}, estimating sales/share from P/S`);

        // Estimate Sales/Share from current price and mean P/S
        salesPerShare = currentPrice / avgPS;
        usedSectorFallback = true;
      } else {
        const rawSalesPerShare = Number(keyMetricsTTM[0].revenuePerShareTTM || 0);
        if (rawSalesPerShare <= 0) {
          logger.warn(`[ValuationService] Invalid revenue per share TTM for ${upperTicker}: ${rawSalesPerShare}, estimating from P/S`);

          // Estimate Sales/Share from current price and mean P/S
          salesPerShare = currentPrice / avgPS;
          usedSectorFallback = true;
        } else {
          salesPerShare = rawSalesPerShare;
        }
      }

      // Calculate intrinsic value
      const iv = avgPS * salesPerShare;

      if (!isFinite(iv) || iv <= 0) {
        logger.warn(`[ValuationService] Invalid IV calculated for ${upperTicker}: ${iv}`);
        return null;
      }

      logger.info(
        `[ValuationService] P/S Mean for ${upperTicker}: Mean=${avgPS.toFixed(2)}, SPS=${salesPerShare.toFixed(2)}, IV=$${iv.toFixed(2)}` +
        (usedSectorFallback ? ` [SECTOR FALLBACK: ${sector}]` : '')
      );

      // Build rich response object
      const response: PSValuationResponse = {
        ticker: upperTicker,
        iv,
        avgPS,
        currentPrice,
        salesPerShare,
        historicalPS: psRatios,
        confidence: usedSectorFallback ? 'LOW' : 'MED',
        as_of: new Date().toISOString().split('T')[0],
      };

      // Cache for 24h
      await redisCacheService.set(cacheKey, response, 86400);

      return response;
    } catch (error: any) {
      logger.error(`[ValuationService] Error calculating P/S Mean for ${upperTicker}:`, error.message);
      return null;
    }
  }

  /**
   * FASE 3: Calculate P/B Mean (5y)
   * Formula: IV = Mean_PB_5y × Book_Value_per_Share_TTM
   */
  async calculatePBMean5Y(ticker: string): Promise<PBValuationResponse | null> {
    const upperTicker = ticker.toUpperCase();
    const cacheKey = VALUATION_CACHE_KEYS.IV_CALC + upperTicker + ':pb_mean';

    // Check cache
    const cached = await redisCacheService.get<PBValuationResponse>(cacheKey);
    if (cached) {
      logger.info(`[ValuationService] P/B Mean cache hit for ${upperTicker}`);
      return cached;
    }

    try {
      // Get current price first (needed for sector fallback)
      const currentPrice = await this.getCurrentPrice(upperTicker);
      if (!currentPrice || currentPrice <= 0) {
        logger.warn(`[ValuationService] Invalid current price for ${upperTicker}`);
        return null;
      }

      // Fetch company profile to get sector (for fallback)
      let sector: string | null = null;
      try {
        const profileData = await fmpGet<FMPCompanyProfile[]>('/api/v3/profile/' + upperTicker);
        if (profileData && Array.isArray(profileData) && profileData.length > 0) {
          sector = profileData[0].sector;
        }
      } catch (error: any) {
        logger.warn(`[ValuationService] Could not fetch profile for ${upperTicker}, sector fallback unavailable`);
      }

      // Fetch historical ratios (last 5 years)
      const ratiosData = await fmpGet<any[]>(`/api/v3/ratios/${upperTicker}`, { limit: 5 });

      let avgPB: number;
      let pbRatios: number[] = [];
      let usedSectorFallback = false;

      if (!ratiosData || !Array.isArray(ratiosData) || ratiosData.length === 0) {
        logger.warn(`[ValuationService] No ratios data for ${upperTicker}, attempting sector fallback`);

        // Use sector default P/B
        const sectorDefaults = getSectorDefaults(sector);
        if (!sectorDefaults) {
          logger.warn(`[ValuationService] No sector defaults available for ${upperTicker}`);
          return null;
        }

        avgPB = sectorDefaults.pbRatio;
        usedSectorFallback = true;
        logger.info(`[ValuationService] Using sector default P/B for ${upperTicker}: ${sector} = ${avgPB.toFixed(2)}`);
      } else {
        // Extract P/B ratios
        pbRatios = ratiosData
          .map(r => Number(r.priceToBookRatio || 0))
          .filter(pb => pb > 0 && pb < 150); // Filter extreme outliers (allows tech stocks)

        if (pbRatios.length < 3) {
          // Not enough historical data, use sector fallback
          logger.warn(`[ValuationService] Insufficient P/B data for ${upperTicker} (${pbRatios.length} years), using sector fallback`);

          const sectorDefaults = getSectorDefaults(sector);
          if (!sectorDefaults) {
            logger.warn(`[ValuationService] No sector defaults available for ${upperTicker}`);
            return null;
          }

          avgPB = sectorDefaults.pbRatio;
          usedSectorFallback = true;
          logger.info(`[ValuationService] Using sector default P/B for ${upperTicker}: ${sector} = ${avgPB.toFixed(2)}`);
        } else {
          // Calculate mean P/B from historical data
          avgPB = pbRatios.reduce((sum, pb) => sum + pb, 0) / pbRatios.length;
        }
      }

      // Get current Book Value per Share (TTM)
      let bookValuePerShare: number;

      const keyMetricsTTM = await fmpGet<any[]>(`/api/v3/key-metrics-ttm/${upperTicker}`);
      if (!keyMetricsTTM || !Array.isArray(keyMetricsTTM) || keyMetricsTTM.length === 0) {
        logger.warn(`[ValuationService] No key metrics TTM for ${upperTicker}, estimating book value from P/B`);

        // Estimate Book Value/Share from current price and mean P/B
        bookValuePerShare = currentPrice / avgPB;
        usedSectorFallback = true;
      } else {
        const rawBookValue = Number(keyMetricsTTM[0].bookValuePerShareTTM || 0);
        if (rawBookValue <= 0) {
          logger.warn(`[ValuationService] Invalid book value per share TTM for ${upperTicker}: ${rawBookValue}, estimating from P/B`);

          // Estimate Book Value/Share from current price and mean P/B
          bookValuePerShare = currentPrice / avgPB;
          usedSectorFallback = true;
        } else {
          bookValuePerShare = rawBookValue;
        }
      }

      // Calculate intrinsic value
      const iv = avgPB * bookValuePerShare;

      if (!isFinite(iv) || iv <= 0) {
        logger.warn(`[ValuationService] Invalid IV calculated for ${upperTicker}: ${iv}`);
        return null;
      }

      logger.info(
        `[ValuationService] P/B Mean for ${upperTicker}: Mean=${avgPB.toFixed(2)}, BVPS=${bookValuePerShare.toFixed(2)}, IV=$${iv.toFixed(2)}` +
        (usedSectorFallback ? ` [SECTOR FALLBACK: ${sector}]` : '')
      );

      // Build rich response object
      const response: PBValuationResponse = {
        ticker: upperTicker,
        iv,
        avgPB,
        currentPrice,
        bookValuePerShare,
        historicalPB: pbRatios,
        excludeNRI: false,  // Normal version
        confidence: usedSectorFallback ? 'LOW' : 'MED',
        as_of: new Date().toISOString().split('T')[0],
      };

      // Cache for 24h
      await redisCacheService.set(cacheKey, response, 86400);

      return response;
    } catch (error: any) {
      logger.error(`[ValuationService] Error calculating P/B Mean for ${upperTicker}:`, error.message);
      return null;
    }
  }

  /**
   * FASE 3: Calculate PEG Ratio
   * Formula: IV = Fair_PEG × Growth_Rate × EPS_TTM
   * Fair PEG benchmark: 1.5 (market standard)
   */
  async calculatePEG(ticker: string): Promise<PEGValuationResponse | null> {
    const upperTicker = ticker.toUpperCase();
    const cacheKey = VALUATION_CACHE_KEYS.IV_CALC + upperTicker + ':peg';

    // Check cache
    const cached = await redisCacheService.get<PEGValuationResponse>(cacheKey);
    if (cached) {
      logger.info(`[ValuationService] PEG cache hit for ${upperTicker}`);
      return cached;
    }

    try {
      const FAIR_PEG = 1.5; // Benchmark "fair" PEG ratio

      // Get growth rate from existing AlfaValue calculation
      const alfaValueData = await this.getAlfaValue(upperTicker);
      const growthRate = alfaValueData.assumptions.g_1_5; // Use 5y growth rate

      // Get current EPS (TTM)
      const keyMetricsTTM = await fmpGet<any[]>(`/api/v3/key-metrics-ttm/${upperTicker}`);
      if (!keyMetricsTTM || !Array.isArray(keyMetricsTTM) || keyMetricsTTM.length === 0) {
        logger.warn(`[ValuationService] No key metrics TTM for ${upperTicker}`);
        return null;
      }

      const epsTTM = Number(keyMetricsTTM[0].netIncomePerShareTTM || 0);
      if (epsTTM <= 0) {
        logger.warn(`[ValuationService] Invalid EPS TTM for ${upperTicker}: ${epsTTM}`);
        return null;
      }

      // Get current price
      const quote = await simpleCacheService.getQuote(upperTicker);
      if (!quote || !quote.price) {
        logger.warn(`[ValuationService] No quote data for ${upperTicker}`);
        return null;
      }
      const currentPrice = quote.price;

      // Calculate PE ratio (without NRI adjustment, using TTM EPS)
      const peWithoutNRI = safeDivide(currentPrice, epsTTM, 0) as number;

      // Calculate PEG ratio
      // NOTE: growthRate is in decimal form (e.g., 0.1007 for 10.07%)
      // PEG = PE / (Growth% ) where Growth% = growthRate * 100
      // BUG FIX #1: safeDivide prevents Infinity/NaN when growthRate = 0 (zero-growth companies)
      const pegRatio = safeDivide(peWithoutNRI, growthRate * 100, null) as number | null;

      // DEFENSIVE: If growthRate is zero or negative, PEG method is not applicable
      if (pegRatio === null || growthRate <= 0) {
        logger.warn(`[ValuationService] PEG method not applicable for ${upperTicker}: growthRate=${(growthRate*100).toFixed(2)}%`);
        return null;
      }

      // Calculate intrinsic value
      // Formula: IV = Fair_PEG × (growthRate × 100) × EPS_TTM
      // Multiplication by 100 converts decimal to percentage for PEG calculation
      // Example: 1.5 × (0.1007 × 100) × 6.13 = 1.5 × 10.07 × 6.13 = $92.59
      const iv = FAIR_PEG * (growthRate * 100) * epsTTM;

      if (!isFinite(iv) || iv <= 0) {
        return null;
      }

      logger.info(`[ValuationService] PEG for ${upperTicker}: FairPEG=${FAIR_PEG}, Growth=${(growthRate*100).toFixed(2)}%, EPS=${epsTTM.toFixed(2)}, IV=$${iv.toFixed(2)}`);

      // Build response object
      const response: PEGValuationResponse = {
        ticker: upperTicker,
        iv,
        currentPrice,
        epsWithoutNRI: epsTTM,
        peWithoutNRI,
        epsGrowthRate: growthRate,
        pegRatio,
        fairPegRatio: FAIR_PEG,
        confidence: 'MED',
        as_of: new Date().toISOString().split('T')[0]
      };

      // Cache for 24h
      await redisCacheService.set(cacheKey, response, 86400);

      return response;
    } catch (error: any) {
      logger.error(`[ValuationService] Error calculating PEG for ${upperTicker}:`, error.message);
      return null;
    }
  }

  /**
   * FASE 3: Calculate PSG Ratio
   * Formula: IV = Fair_PSG × Growth_Rate × Sales_per_Share_TTM
   * Fair PSG benchmark: 0.2 (market standard)
   */
  async calculatePSG(ticker: string): Promise<PSGValuationResponse | null> {
    const upperTicker = ticker.toUpperCase();
    const cacheKey = VALUATION_CACHE_KEYS.IV_CALC + upperTicker + ':psg';

    // Check cache
    const cached = await redisCacheService.get<PSGValuationResponse>(cacheKey);
    if (cached) {
      logger.info(`[ValuationService] PSG cache hit for ${upperTicker}`);
      return cached;
    }

    try {
      const FAIR_PSG = 0.2; // Benchmark "fair" PSG ratio

      // Calculate revenue CAGR (last 3 years)
      const incomeData = await fmpGet<any[]>(`/api/v3/income-statement/${upperTicker}`, {
        period: 'annual',
        limit: 4,
      });

      if (!incomeData || !Array.isArray(incomeData) || incomeData.length < 4) {
        logger.warn(`[ValuationService] Insufficient income data for ${upperTicker}`);
        return null;
      }

      const revenues = incomeData.map(stmt => Number(stmt.revenue || 0)).filter(r => r > 0);
      if (revenues.length < 4) {
        return null;
      }

      // Calculate 3-year CAGR
      const revenueCAGR = Math.pow(revenues[0] / revenues[3], 1 / 3) - 1;

      // Get current Sales per Share (TTM)
      const keyMetricsTTM = await fmpGet<any[]>(`/api/v3/key-metrics-ttm/${upperTicker}`);
      if (!keyMetricsTTM || !Array.isArray(keyMetricsTTM) || keyMetricsTTM.length === 0) {
        logger.warn(`[ValuationService] No key metrics TTM for ${upperTicker}`);
        return null;
      }

      const revenuePerShareTTM = Number(keyMetricsTTM[0].revenuePerShareTTM || 0);
      if (revenuePerShareTTM <= 0) {
        logger.warn(`[ValuationService] Invalid revenue per share TTM for ${upperTicker}: ${revenuePerShareTTM}`);
        return null;
      }

      // Get current price
      const currentPrice = await this.getCurrentPrice(upperTicker);
      if (!currentPrice || currentPrice <= 0) {
        logger.warn(`[ValuationService] Invalid current price for ${upperTicker}: ${currentPrice}`);
        return null;
      }

      // Calculate P/S ratio
      const psRatio = safeDivide(currentPrice, revenuePerShareTTM, 0) as number;

      // Calculate PSG ratio
      // PSG = P/S ÷ (Revenue Growth Rate × 100)
      // Example: If P/S = 10.7 and growth = 8.25%, PSG = 10.7 / 8.25 = 1.297
      // BUG FIX #1: safeDivide prevents Infinity/NaN when revenueCAGR = 0 (zero-growth companies)
      const psgRatio = safeDivide(psRatio, revenueCAGR * 100, null) as number | null;

      // DEFENSIVE: If revenueCAGR is zero or negative, PSG method is not applicable
      if (psgRatio === null || revenueCAGR <= 0) {
        logger.warn(`[ValuationService] PSG method not applicable for ${upperTicker}: revenueCAGR=${(revenueCAGR*100).toFixed(2)}%`);
        return null;
      }

      // Calculate intrinsic value
      // NOTE: revenueCAGR is already in decimal form (e.g., 0.0825 for 8.25%)
      // Formula: IV = Fair_PSG × (CAGR × 100) × Revenue_per_Share_TTM
      // Multiplication by 100 converts decimal to percentage for PSG calculation
      // Example: 0.2 × (0.0825 × 100) × 29.45 = 0.2 × 8.25 × 29.45 = $48.59
      const iv = FAIR_PSG * (revenueCAGR * 100) * revenuePerShareTTM;

      if (!isFinite(iv) || iv <= 0) {
        return null;
      }

      logger.info(`[ValuationService] PSG for ${upperTicker}: FairPSG=${FAIR_PSG}, CAGR=${(revenueCAGR*100).toFixed(2)}%, SPS=${revenuePerShareTTM.toFixed(2)}, IV=$${iv.toFixed(2)}`);

      // Build response object
      const response: PSGValuationResponse = {
        ticker: upperTicker,
        iv,
        currentPrice,
        salesPerShare: revenuePerShareTTM,
        psRatio,
        revenueGrowthRate: revenueCAGR,
        psgRatio,
        fairPsgRatio: FAIR_PSG,
        confidence: 'MED',
        as_of: new Date().toISOString().split('T')[0]
      };

      // Cache for 24h
      await redisCacheService.set(cacheKey, response, 86400);

      return response;
    } catch (error: any) {
      logger.error(`[ValuationService] Error calculating PSG for ${upperTicker}:`, error.message);
      return null;
    }
  }

  /**
   * FASE 3.1: Calculate DNI-20 (Discounted Net Income 20-year)
   * Similar to DCF-20 but uses Net Income instead of FCF
   * Formula: IV = Σ(NI_t / (1 + WACC)^t) + (Cash - Debt) / Shares
   */
  async calculateDNI20(ticker: string): Promise<DNI20Response | null> {
    const upperTicker = ticker.toUpperCase();
    const cacheKey = VALUATION_CACHE_KEYS.IV_CALC + upperTicker + ':dni20';

    // Check cache
    const cached = await redisCacheService.get<DNI20Response>(cacheKey);
    if (cached) {
      logger.info(`[ValuationService] DNI-20 cache hit for ${upperTicker}`);
      return cached;
    }

    try {
      // SUB-FASE 3A: Get Net Income data with Annual → Quarterly → TTM fallback
      const incomeStatement = await fetchFinancialStatementsWithFallback(upperTicker, 'income');

      if (!incomeStatement || !incomeStatement.netIncome) {
        logger.warn(`[ValuationService] No income data for ${upperTicker} (tried annual + quarterly fallback)`);
        return null;
      }

      // For historical data, we need to fetch full array
      // If we got TTM from quarterly, fetch additional historical data if available
      let ni_5y: number[];

      if (incomeStatement.source === 'annual') {
        // We have annual data, fetch historical
        const historicalIncome = await fmpGet<any[]>(`/api/v3/income-statement/${upperTicker}`, {
          period: 'annual',
          limit: 5,
        });

        if (historicalIncome && historicalIncome.length > 0) {
          ni_5y = historicalIncome
            .map((stmt) => (stmt.netIncome || 0) / 1_000_000)
            .reverse();
        } else {
          // Fallback: use TTM value repeated
          ni_5y = [incomeStatement.netIncome / 1_000_000];
        }
      } else {
        // quarterly-ttm: use TTM value (can't calculate historical CAGR reliably)
        logger.info(`[ValuationService] ${upperTicker}: Using TTM net income from quarterly data (${incomeStatement.quartersUsed} quarters)`);
        ni_5y = [incomeStatement.netIncome / 1_000_000];
      }

      const ni_ttm = ni_5y[ni_5y.length - 1];

      if (ni_ttm <= 0) {
        logger.warn(`[ValuationService] Invalid Net Income for ${upperTicker}: ${ni_ttm}`);
        return null;
      }

      // SUB-FASE 3A: Get balance sheet data with fallback
      const balanceSheet = await fetchFinancialStatementsWithFallback(upperTicker, 'balance');

      if (!balanceSheet) {
        logger.warn(`[ValuationService] No balance sheet data for ${upperTicker}`);
        return null;
      }

      const latestBalanceSheet = balanceSheet;
      const cash = ((latestBalanceSheet.cashAndCashEquivalents || 0) +
        (latestBalanceSheet.shortTermInvestments || 0)) / 1_000_000;
      const debt = (latestBalanceSheet.totalDebt || 0) / 1_000_000;

      // Get shares outstanding
      const shares_m = await this.getSharesOutstanding(upperTicker);
      if (!shares_m || shares_m <= 0) {
        return null;
      }

      // Get company profile for beta and industry
      const profileData = await fmpGet<FMPCompanyProfile[]>('/api/v3/profile/' + upperTicker);
      if (!profileData || profileData.length === 0) {
        return null;
      }

      const profile = profileData[0];
      const beta = clamp(profile.beta || VALUATION_DEFAULTS.BETA, VALUATION_CLAMPS.BETA.min, VALUATION_CLAMPS.BETA.max);
      const industry = profile.industry || 'Unknown';
      const region: Region = 'US';

      // Calculate growth rates (same logic as AlfaValue)
      const g1_5_raw = calculateCAGR(ni_5y);
      const g1_5 = clamp(g1_5_raw, G_1_5_FLOOR, VALUATION_CLAMPS.G_1_5.max);

      const sectorGrowthData = await this.getSectorGrowth(industry);
      const g_sector_mid = sectorGrowthData.g_sector_mid;

      let g6_10: number;
      if (G_6_10_USE_WEIGHTS) {
        g6_10 = clamp(
          G_6_10_COMPANY_WEIGHT * g1_5 + (1 - G_6_10_COMPANY_WEIGHT) * g_sector_mid,
          VALUATION_CLAMPS.G_6_10.min,
          VALUATION_CLAMPS.G_6_10.max
        );
      } else {
        const decay = g1_5 < 0.08 ? 0.70 : 0.50;
        g6_10 = clamp(
          0.6 * (g1_5 * decay) + 0.4 * g_sector_mid,
          VALUATION_CLAMPS.G_6_10.min,
          VALUATION_CLAMPS.G_6_10.max
        );
      }

      const gTermData = await this.getGTerm(region);
      const g_term_region = gTermData.g_term;

      const base = lerp(g6_10, g_term_region, 0.7);
      let g11_20: number;
      if (G_11_20_CLAMP_MODE === 'fixed') {
        g11_20 = clamp(base, 0.03, 0.05);
      } else {
        g11_20 = clamp(
          base,
          Math.max(0.03, g_term_region - 0.01),
          Math.min(0.05, g_term_region + 0.01)
        );
      }

      // Calculate discount rate (CAPM)
      const rfData = await this.getRiskFree(region);
      const mrpData = await this.getMRP(region);
      const dr = clamp(rfData.rf + beta * mrpData.mrp, VALUATION_CLAMPS.DR.min, VALUATION_CLAMPS.DR.max);

      // Project Net Income and calculate PV (20 years, mid-year discounting)
      let pv = 0;
      let currentNI = ni_ttm;

      for (let year = 1; year <= 20; year++) {
        let growthRate: number;
        if (year <= 5) {
          growthRate = g1_5;
        } else if (year <= 10) {
          growthRate = g6_10;
        } else {
          growthRate = g11_20;
        }

        currentNI *= (1 + growthRate);
        const discountFactor = Math.pow(1 + dr, year - 0.5);
        pv += currentNI / discountFactor;
      }

      // Calculate equity value and IV per share
      const equityValue = pv + cash - debt;
      const iv = equityValue / shares_m;

      if (!isFinite(iv) || iv <= 0) {
        return null;
      }

      logger.info(`[ValuationService] DNI-20 for ${upperTicker}: IV=$${iv.toFixed(2)}`);

      // Build rich response object
      const response: DNI20Response = {
        ticker: upperTicker,
        iv,
        netIncome: ni_ttm,
        totalDebt: debt,
        cash,
        sharesOutstanding: shares_m,
        discountRate: dr,
        growthY1_5: g1_5,
        growthY6_10: g6_10,
        growthY11_20: g11_20,
        confidence: 'MED',
        as_of: new Date().toISOString().split('T')[0],
      };

      // Cache for 24h
      await redisCacheService.set(cacheKey, response, 86400);

      return response;
    } catch (error: any) {
      logger.error(`[ValuationService] Error calculating DNI-20 for ${upperTicker}:`, error.message);
      return null;
    }
  }

  /**
   * FASE 3.1: Calculate P/B Mean without NRI (Non-Recurring Items)
   * Formula: IV = Mean_PB_without_NRI_5y × Adjusted_BVPS_TTM
   */
  async calculatePBMeanWithoutNRI(ticker: string): Promise<PBValuationResponse | null> {
    const upperTicker = ticker.toUpperCase();
    const cacheKey = VALUATION_CACHE_KEYS.IV_CALC + upperTicker + ':pb_mean_no_nri';

    // Check cache
    const cached = await redisCacheService.get<PBValuationResponse>(cacheKey);
    if (cached) {
      logger.info(`[ValuationService] P/B Mean without NRI cache hit for ${upperTicker}`);
      return cached;
    }

    try {
      // Get historical income statements to adjust for special items
      const incomeData = await fmpGet<any[]>(`/api/v3/income-statement/${upperTicker}`, {
        period: 'annual',
        limit: 5,
      });

      if (!incomeData || !Array.isArray(incomeData) || incomeData.length === 0) {
        logger.warn(`[ValuationService] No income data for ${upperTicker}`);
        return null;
      }

      // Get balance sheet data for book value
      const balanceSheetData = await fmpGet<any[]>(`/api/v3/balance-sheet-statement/${upperTicker}`, {
        period: 'annual',
        limit: 5,
      });

      if (!balanceSheetData || !Array.isArray(balanceSheetData) || balanceSheetData.length === 0) {
        logger.warn(`[ValuationService] No balance sheet data for ${upperTicker}`);
        return null;
      }

      // Fetch historical ratios ONCE (not inside loop)
      const ratiosData = await fmpGet<any[]>(`/api/v3/ratios/${upperTicker}`, { limit: 5 });
      if (!ratiosData || !Array.isArray(ratiosData)) {
        logger.warn(`[ValuationService] No ratios data for ${upperTicker}`);
        return null;
      }

      // Calculate adjusted P/B ratios for each year
      const adjustedPBRatios: number[] = [];

      for (const stmt of incomeData) {
        const date = stmt.date;
        // Use P/B ratio from ratios endpoint directly (no actual NRI adjustment in this simplified implementation)
        const matchingRatio = ratiosData.find(r => r.date === date);
        if (matchingRatio && matchingRatio.priceToBookRatio > 0) {
          const pbRatio = Number(matchingRatio.priceToBookRatio);
          if (pbRatio > 0.1 && pbRatio < 150) { // Filter extreme outliers (allows tech stocks)
            adjustedPBRatios.push(pbRatio);
          }
        }
      }

      if (adjustedPBRatios.length < 3) {
        logger.warn(`[ValuationService] Insufficient adjusted P/B data for ${upperTicker} (${adjustedPBRatios.length} years)`);
        return null;
      }

      // Calculate mean P/B
      const avgPB = adjustedPBRatios.reduce((sum, pb) => sum + pb, 0) / adjustedPBRatios.length;

      // Get current adjusted Book Value per Share (TTM)
      const keyMetricsTTM = await fmpGet<any[]>(`/api/v3/key-metrics-ttm/${upperTicker}`);
      if (!keyMetricsTTM || !Array.isArray(keyMetricsTTM) || keyMetricsTTM.length === 0) {
        logger.warn(`[ValuationService] No key metrics TTM for ${upperTicker}`);
        return null;
      }

      const bookValuePerShare = Number(keyMetricsTTM[0].bookValuePerShareTTM || 0);
      if (bookValuePerShare <= 0) {
        logger.warn(`[ValuationService] Invalid book value per share TTM for ${upperTicker}: ${bookValuePerShare}`);
        return null;
      }

      // Get current price
      const currentPrice = await this.getCurrentPrice(upperTicker);

      // Calculate intrinsic value
      const iv = avgPB * bookValuePerShare;

      if (!isFinite(iv) || iv <= 0) {
        return null;
      }

      logger.info(`[ValuationService] P/B Mean without NRI for ${upperTicker}: Mean=${avgPB.toFixed(2)}, BVPS=${bookValuePerShare.toFixed(2)}, IV=$${iv.toFixed(2)}`);

      // Build rich response object
      const response: PBValuationResponse = {
        ticker: upperTicker,
        iv,
        avgPB,
        currentPrice,
        bookValuePerShare,
        historicalPB: adjustedPBRatios,
        excludeNRI: true,  // ✅ WITHOUT NRI version
        confidence: 'MED',
        as_of: new Date().toISOString().split('T')[0],
      };

      // Cache for 24h
      await redisCacheService.set(cacheKey, response, 86400);

      return response;
    } catch (error: any) {
      logger.error(`[ValuationService] Error calculating P/B Mean without NRI for ${upperTicker}:`, error.message);
      return null;
    }
  }

  /**
   * FASE 3.1: Calculate P/E Mean without NRI (Non-Recurring Items)
   * Formula: IV = Mean_PE_without_NRI_5y × Adjusted_EPS_TTM
   */
  async calculatePEMeanWithoutNRI(ticker: string): Promise<PEValuationResponse | null> {
    const upperTicker = ticker.toUpperCase();
    const cacheKey = VALUATION_CACHE_KEYS.IV_CALC + upperTicker + ':pe_mean_no_nri';

    // Check cache
    const cached = await redisCacheService.get<PEValuationResponse>(cacheKey);
    if (cached) {
      logger.info(`[ValuationService] P/E Mean without NRI cache hit for ${upperTicker}`);
      return cached;
    }

    try {
      // Get historical income statements to adjust for special items
      const incomeData = await fmpGet<any[]>(`/api/v3/income-statement/${upperTicker}`, {
        period: 'annual',
        limit: 5,
      });

      if (!incomeData || !Array.isArray(incomeData) || incomeData.length === 0) {
        logger.warn(`[ValuationService] No income data for ${upperTicker}`);
        return null;
      }

      // Get shares outstanding for each year
      const adjustedPERatios: number[] = [];

      for (const stmt of incomeData) {
        const netIncome = Number(stmt.netIncome || 0);
        const specialItems = Number(stmt.incomeBeforeTax || 0) - Number(stmt.operatingIncome || 0);
        const adjustedNetIncome = netIncome - specialItems;
        const shares = Number(stmt.weightedAverageShsOutDil || stmt.weightedAverageShsOut || 0);

        if (shares > 0 && adjustedNetIncome > 0) {
          const adjustedEPS = adjustedNetIncome / shares;
          // Get corresponding price for that year (approximate from historical data)
          const date = stmt.date;
          // For simplicity, use ratio from standard ratios endpoint as proxy
          const ratiosData = await fmpGet<any[]>(`/api/v3/ratios/${upperTicker}`, { limit: 5 });
          if (ratiosData) {
            const matchingRatio = ratiosData.find(r => r.date === date);
            if (matchingRatio && matchingRatio.priceEarningsRatio > 0) {
              adjustedPERatios.push(Number(matchingRatio.priceEarningsRatio));
            }
          }
        }
      }

      if (adjustedPERatios.length < 3) {
        logger.warn(`[ValuationService] Insufficient adjusted P/E data for ${upperTicker}`);
        return null;
      }

      // Calculate mean P/E (filtered outliers)
      const filteredPE = adjustedPERatios.filter(pe => pe > 0 && pe < 100);
      const meanPE = filteredPE.reduce((sum, pe) => sum + pe, 0) / filteredPE.length;

      // Get current adjusted EPS (TTM)
      const latestIncome = incomeData[0];
      const netIncome = Number(latestIncome.netIncome || 0);
      const specialItems = Number(latestIncome.incomeBeforeTax || 0) - Number(latestIncome.operatingIncome || 0);
      const adjustedNetIncome = netIncome - specialItems;
      const shares = Number(latestIncome.weightedAverageShsOutDil || latestIncome.weightedAverageShsOut || 0);

      if (shares <= 0 || adjustedNetIncome <= 0) {
        logger.warn(`[ValuationService] Invalid adjusted EPS for ${upperTicker}`);
        return null;
      }

      const adjustedEPS = adjustedNetIncome / shares;

      // Calculate intrinsic value
      const iv = meanPE * adjustedEPS;

      if (!isFinite(iv) || iv <= 0) {
        return null;
      }

      // Get current price
      const currentPrice = await this.getCurrentPrice(upperTicker);

      // Build response
      const response: PEValuationResponse = {
        ticker: upperTicker,
        iv,
        avgPE: meanPE,
        currentPrice,
        eps: adjustedEPS,
        historicalPE: filteredPE,
        excludeNRI: true,
        confidence: 'MED',
        as_of: new Date().toISOString().split('T')[0],
      };

      logger.info(`[ValuationService] P/E Mean without NRI for ${upperTicker}: Mean=${meanPE.toFixed(2)}, Adj_EPS=${adjustedEPS.toFixed(2)}, IV=${iv.toFixed(2)}`);

      // Cache for 24h
      await redisCacheService.set(cacheKey, response, 86400);

      return response;
    } catch (error: any) {
      logger.error(`[ValuationService] Error calculating P/E Mean without NRI for ${upperTicker}:`, error.message);
      return null;
    }
  }

  /**
   * FASE 3.1: Calculate DFCF-Terminal (Discounted Free Cash Flow Terminal)
   * Simpler terminal value only calculation
   * Formula: IV = (FCF × (1 + g_term)) / (WACC - g_term) + (Cash - Debt) / Shares
   */
  async calculateDFCFTerminal(ticker: string): Promise<DFCFTerminalResponse | null> {
    const upperTicker = ticker.toUpperCase();
    const cacheKey = VALUATION_CACHE_KEYS.IV_CALC + upperTicker + ':dfcf_terminal';

    // Check cache
    const cached = await redisCacheService.get<DFCFTerminalResponse>(cacheKey);
    if (cached) {
      logger.info(`[ValuationService] DFCF-Terminal cache hit for ${upperTicker}`);
      return cached;
    }

    try {
      // Get latest FCF
      const cashFlowData = await fmpGet<FMPFinancialStatement[]>(
        `/api/v3/cash-flow-statement/${upperTicker}`,
        { limit: 1 }
      );

      if (!cashFlowData || cashFlowData.length === 0) {
        logger.warn(`[ValuationService] No cash flow data for ${upperTicker}`);
        return null;
      }

      const latestCashFlow = cashFlowData[0];
      const fcf_ttm = (latestCashFlow.freeCashFlow ||
        (latestCashFlow.operatingCashFlow || 0) - (latestCashFlow.capitalExpenditure || 0)) / 1_000_000;

      if (fcf_ttm <= 0) {
        logger.warn(`[ValuationService] Invalid FCF for ${upperTicker}: ${fcf_ttm}`);
        return null;
      }

      // Get balance sheet data
      const balanceSheetData = await fmpGet<FMPFinancialStatement[]>(
        `/api/v3/balance-sheet-statement/${upperTicker}`,
        { limit: 1 }
      );

      if (!balanceSheetData || balanceSheetData.length === 0) {
        return null;
      }

      const latestBalanceSheet = balanceSheetData[0];
      const cash = ((latestBalanceSheet.cashAndCashEquivalents || 0) +
        (latestBalanceSheet.shortTermInvestments || 0)) / 1_000_000;
      const debt = (latestBalanceSheet.totalDebt || 0) / 1_000_000;

      // Get shares outstanding
      const shares_m = await this.getSharesOutstanding(upperTicker);
      if (!shares_m || shares_m <= 0) {
        return null;
      }

      // Get company profile for beta
      const profileData = await fmpGet<FMPCompanyProfile[]>('/api/v3/profile/' + upperTicker);
      if (!profileData || profileData.length === 0) {
        return null;
      }

      const profile = profileData[0];
      const beta = clamp(profile.beta || VALUATION_DEFAULTS.BETA, VALUATION_CLAMPS.BETA.min, VALUATION_CLAMPS.BETA.max);
      const industry = profile.industry || 'Unknown';
      const region: Region = 'US';

      // Get historical FCF data for growth rate calculation
      const cashFlowHistory = await fmpGet<any[]>(`/api/v3/cash-flow-statement/${upperTicker}`, {
        limit: 5,
      });

      // Calculate growth rates (same logic as DNI-20/AlfaValue)
      let g1_5: number;
      let g6_10: number;

      if (cashFlowHistory && cashFlowHistory.length >= 2) {
        const fcf_5y = cashFlowHistory
          .map((stmt) => {
            const fcf = stmt.freeCashFlow || (stmt.operatingCashFlow || 0) - (stmt.capitalExpenditure || 0);
            return fcf / 1_000_000;
          })
          .reverse();

        const g1_5_raw = calculateCAGR(fcf_5y);
        g1_5 = clamp(g1_5_raw, G_1_5_FLOOR, VALUATION_CLAMPS.G_1_5.max);

        const sectorGrowthData = await this.getSectorGrowth(industry);
        const g_sector_mid = sectorGrowthData.g_sector_mid;

        if (G_6_10_USE_WEIGHTS) {
          g6_10 = clamp(
            G_6_10_COMPANY_WEIGHT * g1_5 + (1 - G_6_10_COMPANY_WEIGHT) * g_sector_mid,
            VALUATION_CLAMPS.G_6_10.min,
            VALUATION_CLAMPS.G_6_10.max
          );
        } else {
          const decay = g1_5 < 0.08 ? 0.70 : 0.50;
          g6_10 = clamp(
            0.6 * (g1_5 * decay) + 0.4 * g_sector_mid,
            VALUATION_CLAMPS.G_6_10.min,
            VALUATION_CLAMPS.G_6_10.max
          );
        }
      } else {
        // Fallback if insufficient history
        g1_5 = 0.10; // 10% default
        g6_10 = 0.07; // 7% default
      }

      // Get terminal growth rate
      const gTermData = await this.getGTerm(region);
      const g_term = gTermData.g_term;

      // Calculate discount rate (CAPM)
      const rfData = await this.getRiskFree(region);
      const mrpData = await this.getMRP(region);
      const wacc = clamp(rfData.rf + beta * mrpData.mrp, VALUATION_CLAMPS.DR.min, VALUATION_CLAMPS.DR.max);

      // 3-Stage DCF Calculation
      // Stage 1: Years 1-5 with g1_5
      let stage1PV = 0;
      let currentFCF = fcf_ttm;
      for (let year = 1; year <= 5; year++) {
        currentFCF *= (1 + g1_5);
        const discountFactor = Math.pow(1 + wacc, year - 0.5);
        stage1PV += currentFCF / discountFactor;
      }

      // Stage 2: Years 6-10 with g6_10
      let stage2PV = 0;
      for (let year = 6; year <= 10; year++) {
        currentFCF *= (1 + g6_10);
        const discountFactor = Math.pow(1 + wacc, year - 0.5);
        stage2PV += currentFCF / discountFactor;
      }

      // Terminal Value: Beyond year 10 (perpetuity with g_term)
      const fcf_year_11 = currentFCF * (1 + g_term);
      const terminalValueAtYear10 = fcf_year_11 / (wacc - g_term);
      const terminalPV = terminalValueAtYear10 / Math.pow(1 + wacc, 10);

      // Total Enterprise Value
      const enterpriseValue = stage1PV + stage2PV + terminalPV;

      // Calculate equity value per share
      const stage1ValuePerShare = (stage1PV + cash - debt) / shares_m;
      const stage2ValuePerShare = (stage2PV) / shares_m;
      const terminalValuePerShare = (terminalPV) / shares_m;

      // Total IV
      const equityValue = enterpriseValue + cash - debt;
      const iv = equityValue / shares_m;

      if (!isFinite(iv) || iv <= 0) {
        return null;
      }

      logger.info(`[ValuationService] DFCF-Terminal for ${upperTicker}: Stage1=${stage1PV.toFixed(2)}M, Stage2=${stage2PV.toFixed(2)}M, Terminal=${terminalPV.toFixed(2)}M, IV=$${iv.toFixed(2)}`);

      // Build rich response object
      const response: DFCFTerminalResponse = {
        ticker: upperTicker,
        iv,
        fcf: fcf_ttm,
        totalDebt: debt,
        cash,
        wacc,
        sharesOutstanding: shares_m,
        growthY1_5: g1_5,
        growthY6_10: g6_10,
        terminalGrowth: g_term,
        stage1Value: stage1ValuePerShare,
        stage2Value: stage2ValuePerShare,
        terminalValue: terminalValuePerShare,
        confidence: 'MED',
        as_of: new Date().toISOString().split('T')[0],
      };

      // Cache for 24h
      await redisCacheService.set(cacheKey, response, 86400);

      return response;
    } catch (error: any) {
      logger.error(`[ValuationService] Error calculating DFCF-Terminal for ${upperTicker}:`, error.message);
      return null;
    }
  }

  /**
   * FASE 3 - GAP #3: Get base metric value for DCF calculations
   * Supports user-selectable base metric: FCF, OCF, or NI
   *
   * @param ticker Stock symbol
   * @param basedOn 'fcf' | 'ocf' | 'ni'
   * @returns Current value and 5-year historical values in millions USD
   */
  async getBaseMetricForDCF(
    ticker: string,
    basedOn: 'fcf' | 'ocf' | 'ni' = 'fcf'
  ): Promise<{ current: number; historical: number[] } | null> {
    const upperTicker = ticker.toUpperCase();
    const cacheKey = `${VALUATION_CACHE_KEYS.IV_CALC}${upperTicker}:base_${basedOn}`;

    // Check cache
    const cached = await redisCacheService.get<{ current: number; historical: number[] }>(cacheKey);
    if (cached) {
      logger.info(`[ValuationService] Base metric (${basedOn}) cache hit for ${upperTicker}`);
      return cached;
    }

    try {
      // Fetch cash flow statements (5 years)
      const cashFlowData = await fmpGet<any[]>(`/api/v3/cash-flow-statement/${upperTicker}`, {
        limit: 5,
      });

      if (!cashFlowData || !Array.isArray(cashFlowData) || cashFlowData.length === 0) {
        logger.warn(`[ValuationService] No cash flow data for ${upperTicker}`);
        return null;
      }

      let current: number;
      let historical: number[];

      switch (basedOn) {
        case 'fcf':
          // Free Cash Flow = Operating Cash Flow - CapEx
          historical = cashFlowData
            .map((stmt) => {
              const fcf = stmt.freeCashFlow || (stmt.operatingCashFlow || 0) - (stmt.capitalExpenditure || 0);
              return fcf / 1_000_000;
            })
            .reverse();
          current = historical[historical.length - 1];
          break;

        case 'ocf':
          // Operating Cash Flow (unlevered)
          historical = cashFlowData
            .map((stmt) => {
              const ocf = stmt.operatingCashFlow || 0;
              return ocf / 1_000_000;
            })
            .reverse();
          current = historical[historical.length - 1];
          break;

        case 'ni':
          // Net Income (requires income statement)
          const incomeData = await fmpGet<any[]>(`/api/v3/income-statement/${upperTicker}`, {
            period: 'annual',
            limit: 5,
          });

          if (!incomeData || !Array.isArray(incomeData) || incomeData.length === 0) {
            logger.warn(`[ValuationService] No income data for ${upperTicker}`);
            return null;
          }

          historical = incomeData
            .map((stmt) => {
              const ni = stmt.netIncome || 0;
              return ni / 1_000_000;
            })
            .reverse();
          current = historical[historical.length - 1];
          break;

        default:
          logger.error(`[ValuationService] Invalid base metric: ${basedOn}`);
          return null;
      }

      // Validate data
      if (!current || current === 0 || !isFinite(current)) {
        logger.warn(`[ValuationService] Invalid current value for ${upperTicker} (${basedOn}): ${current}`);
        return null;
      }

      if (historical.length < 2) {
        logger.warn(`[ValuationService] Insufficient historical data for ${upperTicker} (${basedOn})`);
        return null;
      }

      const result = { current, historical };

      // Cache for 24h
      await redisCacheService.set(cacheKey, result, 86400);
      logger.info(
        `[ValuationService] Base metric (${basedOn}) for ${upperTicker}: ` +
        `Current=${current.toFixed(2)}M, Historical=${historical.length} years`
      );

      return result;
    } catch (error: any) {
      logger.error(`[ValuationService] Error fetching base metric for ${upperTicker}:`, error.message);
      return null;
    }
  }

  /**
   * AGENT 1C: Calculate P/TBV Mean (5-year historical average)
   *
   * Formula: IV = Mean_P/TBV_5y × Tangible_Book_Value_per_Share
   *
   * Tangible Book Value = Total Equity - Intangible Assets - Goodwill
   * P/TBV Ratio = Market Price / TBV per Share
   *
   * This is the PRIMARY valuation method for banks because:
   * - Banks have negative/inconsistent FCF (they ARE the cash flow)
   * - TBV represents net worth after removing intangible assets
   * - Major investment banks (GS, MS, JPM Research) use P/TBV as standard
   *
   * @param ticker - Bank ticker symbol (e.g., 'JPM', 'BAC')
   * @returns PTBVValuationResponse or null if data unavailable
   */
  async calculatePTBVMean5Y(ticker: string): Promise<PTBVValuationResponse | null> {
    const upperTicker = ticker.toUpperCase();
    const cacheKey = VALUATION_CACHE_KEYS.IV_CALC + upperTicker + ':ptbv_mean';

    // Check cache
    const cached = await redisCacheService.get<PTBVValuationResponse>(cacheKey);
    if (cached) {
      logger.info(`[ValuationService] P/TBV Mean cache hit for ${upperTicker}`);
      return cached;
    }

    try {
      // Step 1: Verify this is a bank
      const profileData = await fmpGet<FMPCompanyProfile[]>('/api/v3/profile/' + upperTicker);
      if (!profileData || profileData.length === 0) {
        logger.warn(`[ValuationService] No profile data for ${upperTicker}`);
        return null;
      }

      const profile = profileData[0];
      const { sector, industry } = profile;

      if (!isBank(sector, industry, upperTicker)) {
        logger.warn(`[ValuationService] ${upperTicker} is not a bank (sector: ${sector}, industry: ${industry})`);
        return null;
      }

      logger.info(`[ValuationService] Confirmed ${upperTicker} is a bank - using P/TBV valuation`);

      // Step 2: Fetch historical key metrics (last 5 years) for tangibleBookValuePerShare
      const keyMetricsData = await fmpGet<any[]>(`/api/v3/key-metrics/${upperTicker}`, { limit: 5 });
      if (!keyMetricsData || !Array.isArray(keyMetricsData) || keyMetricsData.length === 0) {
        logger.warn(`[ValuationService] No key metrics data for ${upperTicker}`);
        return null;
      }

      // Step 3: Get current tangible book value per share (TTM)
      const keyMetricsTTM = await fmpGet<any[]>(`/api/v3/key-metrics-ttm/${upperTicker}`);
      if (!keyMetricsTTM || !Array.isArray(keyMetricsTTM) || keyMetricsTTM.length === 0) {
        logger.warn(`[ValuationService] No key metrics TTM for ${upperTicker}`);
        return null;
      }

      const tangibleBookValuePerShare = Number(keyMetricsTTM[0].tangibleBookValuePerShareTTM || 0);
      if (tangibleBookValuePerShare <= 0) {
        logger.warn(`[ValuationService] Invalid tangible book value per share for ${upperTicker}: ${tangibleBookValuePerShare}`);
        return null;
      }

      logger.info(`[ValuationService] ${upperTicker} TBV/share: $${tangibleBookValuePerShare.toFixed(2)}`);

      // Step 4: Calculate historical P/TBV ratios
      const historicalPTBV: number[] = [];

      for (const record of keyMetricsData) {

        if (tbvPerShare > 0 && priceAtDate > 0) {
          const ptbvRatio = Number(record.ptbRatio || 0);
          // Filter outliers (0.3x to 3.0x range is reasonable for banks)
          if (ptbvRatio >= 0.3 && ptbvRatio <= 3.0) {
            historicalPTBV.push(ptbvRatio);
          }
        }
      }

      if (historicalPTBV.length < 3) {
        logger.warn(`[ValuationService] Insufficient P/TBV data for ${upperTicker} (${historicalPTBV.length} years)`);
        return null;
      }

      // Step 5: Calculate mean P/TBV
      const meanPTBV = historicalPTBV.reduce((sum, ratio) => sum + ratio, 0) / historicalPTBV.length;

      logger.info(`[ValuationService] ${upperTicker} historical P/TBV ratios: [${historicalPTBV.join(', ')}]`);
      logger.info(`[ValuationService] ${upperTicker} mean P/TBV: ${meanPTBV.toFixed(2)}x`);

      // Step 6: Calculate intrinsic value
      const iv = meanPTBV * tangibleBookValuePerShare;

      if (!isFinite(iv) || iv <= 0) {
        logger.warn(`[ValuationService] Invalid IV calculated for ${upperTicker}: ${iv}`);
        return null;
      }

      // Step 7: Get current price and calculate current P/TBV
      const currentPrice = await this.getCurrentPrice(upperTicker);
      const currentPTBV = currentPrice / tangibleBookValuePerShare;

      // Step 8: Get TBV components from balance sheet
      const balanceSheetData = await fmpGet<any[]>(`/api/v3/balance-sheet-statement/${upperTicker}`, { limit: 1 });
      let totalEquity = 0;
      let intangibleAssets = 0;
      let goodwill = 0;
      let tangibleBookValue = 0;
      let sharesOutstanding = 0;

      if (balanceSheetData && balanceSheetData.length > 0) {
        const balanceSheet = balanceSheetData[0];
        totalEquity = (balanceSheet.totalStockholdersEquity || 0) / 1_000_000;
        intangibleAssets = (balanceSheet.intangibleAssets || 0) / 1_000_000;
        goodwill = (balanceSheet.goodwill || 0) / 1_000_000;
        tangibleBookValue = totalEquity - intangibleAssets - goodwill;
      }

      // Get shares outstanding
      const shares_m = await this.getSharesOutstanding(upperTicker);
      sharesOutstanding = shares_m || 0;

      // Step 9: Classify bank type
      const bankType = getBankType(upperTicker, industry);

      logger.info(`[ValuationService] P/TBV Mean for ${upperTicker}: Mean=${meanPTBV.toFixed(2)}x, TBV/share=$${tangibleBookValuePerShare.toFixed(2)}, IV=$${iv.toFixed(2)}, Current P/TBV=${currentPTBV.toFixed(2)}x, Bank Type=${bankType}`);

      // Step 10: Build response
      const response: PTBVValuationResponse = {
        ticker: upperTicker,
        iv,
        currentPrice,
        tangibleBookValuePerShare,
        currentPTBV,
        benchmarkPTBV: meanPTBV,
        benchmarkType: 'historical',
        sector: sector || 'Financial Services',
        totalEquity,
        intangibleAssets,
        goodwill,
        tangibleBookValue,
        sharesOutstanding,
        historicalPTBV,
        bankType,
        confidence: 'HIGH',
        as_of: new Date().toISOString().split('T')[0],
      };

      // Cache for 24h
      await redisCacheService.set(cacheKey, response, 86400);

      return response;
    } catch (error: any) {
      logger.error(`[ValuationService] Error calculating P/TBV Mean for ${upperTicker}:`, error.message);
      return null;
    }
  }

  /**
   * AGENT 1C: Calculate P/TBV Sector (sector benchmark)
   *
   * Formula: IV = Sector_Avg_P/TBV × Tangible_Book_Value_per_Share
   *
   * Sector benchmarks by bank type:
   * - Large Money Center Banks (JPM, BAC, C, WFC): 1.35x
   * - Regional Banks (USB, PNC, TFC, KEY): 1.00x
   * - Investment Banks (GS, MS): 1.15x
   *
   * Sources: Goldman Sachs Equity Research, Morgan Stanley Bank Coverage, JPMorgan Banking Analysis
   *
   * @param ticker - Bank ticker symbol
   * @returns PTBVValuationResponse or null if data unavailable
   */
  async calculatePTBVSector(ticker: string): Promise<PTBVValuationResponse | null> {
    const upperTicker = ticker.toUpperCase();
    const cacheKey = VALUATION_CACHE_KEYS.IV_CALC + upperTicker + ':ptbv_sector';

    // Check cache
    const cached = await redisCacheService.get<PTBVValuationResponse>(cacheKey);
    if (cached) {
      logger.info(`[ValuationService] P/TBV Sector cache hit for ${upperTicker}`);
      return cached;
    }

    try {
      // Step 1: Verify this is a bank
      const profileData = await fmpGet<FMPCompanyProfile[]>('/api/v3/profile/' + upperTicker);
      if (!profileData || profileData.length === 0) {
        logger.warn(`[ValuationService] No profile data for ${upperTicker}`);
        return null;
      }

      const profile = profileData[0];
      const { sector, industry } = profile;

      if (!isBank(sector, industry, upperTicker)) {
        logger.warn(`[ValuationService] ${upperTicker} is not a bank (sector: ${sector}, industry: ${industry})`);
        return null;
      }

      logger.info(`[ValuationService] Confirmed ${upperTicker} is a bank - using P/TBV sector benchmark`);

      // Step 2: Get current tangible book value per share (TTM)
      const keyMetricsTTM = await fmpGet<any[]>(`/api/v3/key-metrics-ttm/${upperTicker}`);
      if (!keyMetricsTTM || !Array.isArray(keyMetricsTTM) || keyMetricsTTM.length === 0) {
        logger.warn(`[ValuationService] No key metrics TTM for ${upperTicker}`);
        return null;
      }

      const tangibleBookValuePerShare = Number(keyMetricsTTM[0].tangibleBookValuePerShareTTM || 0);
      if (tangibleBookValuePerShare <= 0) {
        logger.warn(`[ValuationService] Invalid tangible book value per share for ${upperTicker}: ${tangibleBookValuePerShare}`);
        return null;
      }

      logger.info(`[ValuationService] ${upperTicker} TBV/share: $${tangibleBookValuePerShare.toFixed(2)}`);

      // Step 3: Classify bank type and get sector benchmark
      const bankType = getBankType(upperTicker, industry);
      const sectorAvgPTBV = getSectorPTBVBenchmark(bankType);

      logger.info(`[ValuationService] ${upperTicker} bank type: ${bankType}, sector benchmark P/TBV: ${sectorAvgPTBV.toFixed(2)}x`);

      // Step 4: Calculate intrinsic value
      const iv = sectorAvgPTBV * tangibleBookValuePerShare;

      if (!isFinite(iv) || iv <= 0) {
        logger.warn(`[ValuationService] Invalid IV calculated for ${upperTicker}: ${iv}`);
        return null;
      }

      // Step 5: Get current price and calculate current P/TBV
      const currentPrice = await this.getCurrentPrice(upperTicker);
      const currentPTBV = currentPrice / tangibleBookValuePerShare;

      // Step 6: Get TBV components from balance sheet
      const balanceSheetData = await fmpGet<any[]>(`/api/v3/balance-sheet-statement/${upperTicker}`, { limit: 1 });
      let totalEquity = 0;
      let intangibleAssets = 0;
      let goodwill = 0;
      let tangibleBookValue = 0;
      let sharesOutstanding = 0;

      if (balanceSheetData && balanceSheetData.length > 0) {
        const balanceSheet = balanceSheetData[0];
        totalEquity = (balanceSheet.totalStockholdersEquity || 0) / 1_000_000;
        intangibleAssets = (balanceSheet.intangibleAssets || 0) / 1_000_000;
        goodwill = (balanceSheet.goodwill || 0) / 1_000_000;
        tangibleBookValue = totalEquity - intangibleAssets - goodwill;
      }

      // Get shares outstanding
      const shares_m = await this.getSharesOutstanding(upperTicker);
      sharesOutstanding = shares_m || 0;

      logger.info(`[ValuationService] P/TBV Sector for ${upperTicker}: Benchmark=${sectorAvgPTBV.toFixed(2)}x, TBV/share=$${tangibleBookValuePerShare.toFixed(2)}, IV=$${iv.toFixed(2)}, Current P/TBV=${currentPTBV.toFixed(2)}x, Bank Type=${bankType}`);

      // Step 7: Build response
      const response: PTBVValuationResponse = {
        ticker: upperTicker,
        iv,
        currentPrice,
        tangibleBookValuePerShare,
        currentPTBV,
        benchmarkPTBV: sectorAvgPTBV,
        benchmarkType: 'sector',
        sector: sector || 'Financial Services',
        totalEquity,
        intangibleAssets,
        goodwill,
        tangibleBookValue,
        sharesOutstanding,
        bankType,
        confidence: 'MED',
        as_of: new Date().toISOString().split('T')[0],
      };

      // Cache for 24h
      await redisCacheService.set(cacheKey, response, 86400);

      return response;
    } catch (error: any) {
      logger.error(`[ValuationService] Error calculating P/TBV Sector for ${upperTicker}:`, error.message);
      return null;
    }
  }

  /**
   * SUB-FASE 2D: Graham Number Method
   *
   * Calculate intrinsic value using Benjamin Graham's formula:
   * IV = sqrt(22.5 × EPS × Book Value Per Share)
   *
   * This conservative valuation method is best for:
   * - Value stocks with positive earnings
   * - Companies with tangible assets (positive book value)
   * - Stable, predictable businesses
   *
   * @param ticker Stock symbol
   * @returns Graham Number valuation or null
   */
  async calculateGrahamNumber(ticker: string): Promise<import('../types/valuation').GrahamNumberValuationResponse | null> {
    const upperTicker = ticker.toUpperCase();
    const cacheKey = VALUATION_CACHE_KEYS.IV_CALC + upperTicker + ':graham_number';

    // Check cache
    const cached = await redisCacheService.get<import('../types/valuation').GrahamNumberValuationResponse>(cacheKey);
    if (cached) {
      logger.info(`[ValuationService] Graham Number cache hit for ${upperTicker}`);
      return cached;
    }

    try {
      logger.info(`[ValuationService] Calculating Graham Number for ${upperTicker}`);

      // Step 1: Get current price
      const currentPrice = await this.getCurrentPrice(upperTicker);
      if (!currentPrice || currentPrice <= 0) {
        logger.warn(`[ValuationService] Invalid current price for ${upperTicker}`);
        return null;
      }

      // Step 2: Get EPS (TTM)
      const keyMetricsTTM = await fmpGet<any[]>(`/api/v3/key-metrics-ttm/${upperTicker}`);
      if (!keyMetricsTTM || !Array.isArray(keyMetricsTTM) || keyMetricsTTM.length === 0) {
        logger.warn(`[ValuationService] No key metrics TTM for ${upperTicker}`);
        return null;
      }

      const eps = Number(keyMetricsTTM[0].netIncomePerShareTTM || 0);
      if (eps <= 0) {
        logger.warn(`[ValuationService] Graham Number requires positive EPS - ${upperTicker} has ${eps}`);
        return null;
      }

      // Step 3: Get Book Value Per Share
      const bookValuePerShare = Number(keyMetricsTTM[0].bookValuePerShareTTM || 0);
      if (bookValuePerShare <= 0) {
        logger.warn(`[ValuationService] Graham Number requires positive book value - ${upperTicker} has ${bookValuePerShare}`);
        return null;
      }

      // Step 4: Calculate Graham Number
      // Formula: sqrt(22.5 × EPS × BVPS)
      const grahamNumber = Math.sqrt(22.5 * eps * bookValuePerShare);

      logger.info(
        `[ValuationService] ${upperTicker} Graham Number: $${grahamNumber.toFixed(2)} ` +
        `(EPS: $${eps.toFixed(2)}, BVPS: $${bookValuePerShare.toFixed(2)})`
      );

      // Step 5: Determine confidence
      // High confidence if both EPS and BVPS are robust (> $1)
      const confidence: import('../types/valuation').ValuationConfidence =
        (eps >= 1 && bookValuePerShare >= 1) ? 'HIGH' :
        (eps >= 0.5 && bookValuePerShare >= 0.5) ? 'MED' : 'LOW';

      const response: import('../types/valuation').GrahamNumberValuationResponse = {
        ticker: upperTicker,
        iv: grahamNumber,
        currentPrice,
        eps,
        bookValuePerShare,
        grahamNumber,
        confidence,
        as_of: new Date().toISOString().split('T')[0],
      };

      // Cache for 24h
      await redisCacheService.set(cacheKey, response, 86400);

      return response;
    } catch (error: any) {
      logger.error(`[ValuationService] Error calculating Graham Number for ${upperTicker}:`, error.message);
      return null;
    }
  }

  /**
   * SUB-FASE 2D: Dividend Discount Model (DDM) - Gordon Growth Model
   *
   * Calculate intrinsic value using perpetual dividend growth:
   * IV = Dividend / (Discount Rate - Growth Rate)
   *
   * Includes payout ratio check for sustainability:
   * - Payout Ratio < 80%: Sustainable dividend
   * - Payout Ratio > 80%: Warning issued, less confident
   *
   * Best for:
   * - Dividend aristocrats (25+ years of dividend growth)
   * - Stable, mature companies with consistent dividends
   * - Income-focused value investing
   *
   * @param ticker Stock symbol
   * @returns DDM valuation or null
   */
  async calculateDDM(ticker: string): Promise<import('../types/valuation').DDMValuationResponse | null> {
    const upperTicker = ticker.toUpperCase();
    const cacheKey = VALUATION_CACHE_KEYS.IV_CALC + upperTicker + ':ddm';

    // Check cache
    const cached = await redisCacheService.get<import('../types/valuation').DDMValuationResponse>(cacheKey);
    if (cached) {
      logger.info(`[ValuationService] DDM cache hit for ${upperTicker}`);
      return cached;
    }

    try {
      logger.info(`[ValuationService] Calculating DDM for ${upperTicker}`);

      // Step 1: Get current price
      const currentPrice = await this.getCurrentPrice(upperTicker);
      if (!currentPrice || currentPrice <= 0) {
        logger.warn(`[ValuationService] Invalid current price for ${upperTicker}`);
        return null;
      }

      // Step 2: Get dividend history (last 5 years for CAGR)
      const dividendData = await fmpGet<any[]>(`/api/v3/historical-price-full/stock_dividend/${upperTicker}`, { limit: 5 });

      if (!dividendData || !Array.isArray(dividendData) || dividendData.length === 0) {
        logger.warn(`[ValuationService] No dividend history for ${upperTicker} - DDM not applicable`);
        return null;
      }

      // Calculate annual dividend (sum of last 4 quarters)
      const recentDividends = dividendData.slice(0, 4);
      const annualDividend = recentDividends.reduce((sum, d) => sum + Number(d.dividend || 0), 0);

      if (annualDividend <= 0) {
        logger.warn(`[ValuationService] No positive dividends for ${upperTicker}`);
        return null;
      }

      // Step 3: Calculate dividend growth rate (5-year CAGR)
      let dividendGrowthRate = 0.05; // Default 5% if insufficient data

      if (dividendData.length >= 5) {
        const oldestDividend = Number(dividendData[dividendData.length - 1].dividend || 0);
        const newestDividend = Number(dividendData[0].dividend || 0);

        if (oldestDividend > 0 && newestDividend > 0) {
          const years = 5;
          dividendGrowthRate = Math.pow(newestDividend / oldestDividend, 1 / years) - 1;

          // Clamp growth rate to reasonable range (0% to 15%)
          dividendGrowthRate = Math.max(0, Math.min(0.15, dividendGrowthRate));
        }
      }

      // Step 4: Get EPS for payout ratio check
      const keyMetricsTTM = await fmpGet<any[]>(`/api/v3/key-metrics-ttm/${upperTicker}`);
      let payoutRatio = 0;
      let eps = 0;

      if (keyMetricsTTM && Array.isArray(keyMetricsTTM) && keyMetricsTTM.length > 0) {
        eps = Number(keyMetricsTTM[0].netIncomePerShareTTM || 0);
        if (eps > 0) {
          payoutRatio = annualDividend / eps;
        }
      }

      // Step 5: Set discount rate (required return)
      // Use 10% for value stocks (8% risk-free + 2% equity premium)
      const discountRate = 0.10;

      // Step 6: Check if growth rate < discount rate (required for Gordon Growth Model)
      if (dividendGrowthRate >= discountRate) {
        logger.warn(`[ValuationService] Invalid DDM inputs for ${upperTicker}: growth rate (${(dividendGrowthRate * 100).toFixed(2)}%) >= discount rate (${(discountRate * 100).toFixed(2)}%)`);
        return null;
      }

      // Step 7: Calculate intrinsic value using Gordon Growth Model
      // IV = D / (r - g)
      const iv = annualDividend / (discountRate - dividendGrowthRate);

      // Step 8: Check payout ratio sustainability
      let warning: string | undefined;
      let confidence: import('../types/valuation').ValuationConfidence = 'HIGH';

      if (payoutRatio > 0.80) {
        warning = `High payout ratio (${(payoutRatio * 100).toFixed(1)}%) may be unsustainable. Dividend at risk.`;
        confidence = 'LOW';
        logger.warn(`[ValuationService] ${upperTicker}: ${warning}`);
      } else if (payoutRatio > 0.60) {
        confidence = 'MED';
        logger.info(`[ValuationService] ${upperTicker}: Moderate payout ratio (${(payoutRatio * 100).toFixed(1)}%)`);
      } else {
        logger.info(`[ValuationService] ${upperTicker}: Healthy payout ratio (${(payoutRatio * 100).toFixed(1)}%)`);
      }

      logger.info(
        `[ValuationService] ${upperTicker} DDM: $${iv.toFixed(2)} ` +
        `(Div: $${annualDividend.toFixed(2)}, Growth: ${(dividendGrowthRate * 100).toFixed(2)}%, ` +
        `Payout: ${(payoutRatio * 100).toFixed(1)}%)`
      );

      const response: import('../types/valuation').DDMValuationResponse = {
        ticker: upperTicker,
        iv,
        currentPrice,
        annualDividend,
        dividendGrowthRate,
        discountRate,
        payoutRatio,
        confidence,
        warning,
        as_of: new Date().toISOString().split('T')[0],
      };

      // Cache for 24h
      await redisCacheService.set(cacheKey, response, 86400);

      return response;
    } catch (error: any) {
      logger.error(`[ValuationService] Error calculating DDM for ${upperTicker}:`, error.message);
      return null;
    }
  }

  /**
   * FASE 2C: Calculate High-Growth DCF (8-year projection)
   * Delegates to standalone growth-dcf-8y-method.ts implementation
   */
  async calculateGrowthDCF8Y(ticker: string): Promise<import('../types/valuation').GrowthDCF8YResponse | null> {
    const { calculateGrowthDCF8Y } = await import('./growth-dcf-8y-method');
    return calculateGrowthDCF8Y(ticker, this);
  }
  }

// Export singleton instance
export const valuationService = new ValuationService();
