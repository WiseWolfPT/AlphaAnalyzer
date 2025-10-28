/**
 * AGENT 1D: REIT Valuation Service (2025-10-27)
 *
 * Specialized valuation methods for REITs (Real Estate Investment Trusts).
 * REITs require FFO/AFFO-based valuation instead of traditional DCF because
 * they must distribute 90%+ of taxable income as dividends by law.
 *
 * Industry standards from NAREIT (National Association of Real Estate Investment Trusts):
 * - FFO (Funds From Operations): Net Income + D&A + Losses - Gains on property sales
 * - AFFO (Adjusted FFO): FFO - Recurring Capex - Straight-line rent adjustments
 * - P/FFO Ratio: REIT equivalent of P/E ratio
 * - Dividend Yield: Critical valuation metric for income-focused investors
 */

import axios from 'axios';
import { redisCacheService } from '../cache/redis-cache-service';
import { simpleCacheService } from './simple-cache-service';
import { logger } from '../lib/logger';
import { isREIT, getREITSubSector } from '../utils/stock-classifier';
import {
  FFOValuationResponse,
  AFFOValuationResponse,
  PFFOMeanValuationResponse,
  PFFOSectorValuationResponse,
  DividendYieldValuationResponse,
  REIT_SECTOR_BENCHMARKS,
  REITSubSector,
  ValuationConfidence,
  VALUATION_CACHE_KEYS,
} from '../types/valuation';

const FMP_BASE_URL = 'https://financialmodelingprep.com';
const FMP_API_KEY = process.env.FMP_API_KEY || '';

/**
 * Helper: Make FMP API request with error handling
 */
async function fmpGet<T>(endpoint: string, params: Record<string, any> = {}): Promise<T | null> {
  try {
    const url = `${FMP_BASE_URL}${endpoint}`;
    const response = await axios.get<T>(url, {
      params: { ...params, apikey: FMP_API_KEY },
      timeout: 10000,
    });
    return response.data;
  } catch (error: any) {
    logger.error(`[REITValuationService] FMP API error (${endpoint}):`, error.message);
    return null;
  }
}

export class REITValuationService {
  /**
   * Get current price for a stock
   */
  private async getCurrentPrice(ticker: string): number {
    const quote = await simpleCacheService.getQuote(ticker);
    if (!quote || !quote.price) {
      throw new Error(`No quote data for ${ticker}`);
    }
    return quote.price;
  }

  /**
   * Get shares outstanding
   */
  private async getSharesOutstanding(ticker: string): Promise<number> {
    const profile = await fmpGet<any[]>(`/api/v3/profile/${ticker}`);
    if (!profile || !Array.isArray(profile) || profile.length === 0) {
      throw new Error(`No profile data for ${ticker}`);
    }

    const sharesOutstanding = profile[0].mktCap / profile[0].price;
    if (!sharesOutstanding || sharesOutstanding <= 0) {
      throw new Error(`Invalid shares outstanding for ${ticker}`);
    }

    return sharesOutstanding / 1_000_000; // Convert to millions
  }

  /**
   * Get REIT subsector classification
   */
  private async getREITSubSector(ticker: string): Promise<REITSubSector> {
    const profile = await fmpGet<any[]>(`/api/v3/profile/${ticker}`);
    if (!profile || !Array.isArray(profile) || profile.length === 0) {
      logger.warn(`[REITValuationService] No profile for ${ticker}, defaulting to diversified`);
      return 'diversified';
    }

    const industry = profile[0].industry || '';
    return getREITSubSector(industry);
  }

  /**
   * Calculate FFO (Funds From Operations) for a REIT
   *
   * Formula (NAREIT standard):
   * FFO = Net Income
   *       + Depreciation & Amortization (real estate)
   *       + Losses on Sale of Property
   *       - Gains on Sale of Property
   *
   * Simplified version (FMP doesn't provide gains/losses granularly):
   * FFO ≈ Net Income + D&A
   *
   * @param ticker - REIT ticker symbol
   * @returns FFO valuation response or null if calculation fails
   */
  async calculateFFO(ticker: string): Promise<FFOValuationResponse | null> {
    const upperTicker = ticker.toUpperCase();
    const cacheKey = VALUATION_CACHE_KEYS.IV_CALC + upperTicker + ':ffo';

    // Check cache
    const cached = await redisCacheService.get<FFOValuationResponse>(cacheKey);
    if (cached) {
      logger.info(`[REITValuationService] FFO cache hit for ${upperTicker}`);
      return cached;
    }

    try {
      // 1. Verify this is a REIT
      const profile = await fmpGet<any[]>(`/api/v3/profile/${upperTicker}`);
      if (!profile || !Array.isArray(profile) || profile.length === 0) {
        logger.warn(`[REITValuationService] No profile for ${upperTicker}`);
        return null;
      }

      const sector = profile[0].sector || '';
      const industry = profile[0].industry || '';
      const companyName = profile[0].companyName || '';

      if (!isREIT(sector, industry, companyName)) {
        logger.warn(`[REITValuationService] ${upperTicker} is not a REIT`);
        return null;
      }

      // 2. Fetch TTM income statement
      const incomeData = await fmpGet<any[]>(`/api/v3/income-statement/${upperTicker}`, { period: 'annual', limit: 1 });
      if (!incomeData || !Array.isArray(incomeData) || incomeData.length === 0) {
        logger.warn(`[REITValuationService] No income data for ${upperTicker}`);
        return null;
      }

      const netIncome = Number(incomeData[0].netIncome || 0);
      const depAmort = Number(incomeData[0].depreciationAndAmortization || 0);

      if (netIncome === 0 && depAmort === 0) {
        logger.warn(`[REITValuationService] Invalid financial data for ${upperTicker}`);
        return null;
      }

      // 3. Calculate FFO (simplified NAREIT formula)
      const ffo = netIncome + depAmort; // In USD (not millions)
      const ffoMillions = ffo / 1_000_000;

      // 4. Get shares outstanding and calculate FFO per share
      const sharesOutstandingM = await this.getSharesOutstanding(upperTicker);
      const ffoPerShare = ffoMillions / sharesOutstandingM;

      if (!isFinite(ffoPerShare) || ffoPerShare <= 0) {
        logger.warn(`[REITValuationService] Invalid FFO per share for ${upperTicker}: ${ffoPerShare}`);
        return null;
      }

      // 5. Get subsector and sector average P/FFO
      const subsector = await this.getREITSubSector(upperTicker);
      const sectorAvgPFFO = REIT_SECTOR_BENCHMARKS[subsector].pFFO;

      // 6. Calculate current price and P/FFO ratio
      const currentPrice = await this.getCurrentPrice(upperTicker);
      const currentPFFO = currentPrice / ffoPerShare;

      // 7. Calculate intrinsic value using sector average P/FFO
      const iv = ffoPerShare * sectorAvgPFFO;

      if (!isFinite(iv) || iv <= 0) {
        return null;
      }

      logger.info(
        `[REITValuationService] FFO for ${upperTicker}: FFO/Share=$${ffoPerShare.toFixed(2)}, ` +
        `Sector P/FFO=${sectorAvgPFFO}x, Current P/FFO=${currentPFFO.toFixed(2)}x, IV=$${iv.toFixed(2)}`
      );

      // 8. Build response object
      const response: FFOValuationResponse = {
        ticker: upperTicker,
        iv,
        currentPrice,
        ffo: ffoMillions,
        ffoPerShare,
        currentPFFO,
        sectorAvgPFFO,
        subsector,
        netIncome: netIncome / 1_000_000,
        depreciationAndAmortization: depAmort / 1_000_000,
        confidence: 'MED',
        as_of: new Date().toISOString().split('T')[0],
      };

      // Cache for 24h
      await redisCacheService.set(cacheKey, response, 86400);

      return response;
    } catch (error: any) {
      logger.error(`[REITValuationService] Error calculating FFO for ${upperTicker}:`, error.message);
      return null;
    }
  }

  /**
   * Calculate AFFO (Adjusted Funds From Operations) for a REIT
   *
   * Formula (NAREIT standard):
   * AFFO = FFO
   *        - Recurring Capital Expenditures
   *        - Straight-line rent adjustments
   *
   * Simplified version (estimate recurring capex as 60% of total capex):
   * AFFO ≈ FFO - (Capex × 0.6)
   *
   * @param ticker - REIT ticker symbol
   * @returns AFFO valuation response or null if calculation fails
   */
  async calculateAFFO(ticker: string): Promise<AFFOValuationResponse | null> {
    const upperTicker = ticker.toUpperCase();
    const cacheKey = VALUATION_CACHE_KEYS.IV_CALC + upperTicker + ':affo';

    // Check cache
    const cached = await redisCacheService.get<AFFOValuationResponse>(cacheKey);
    if (cached) {
      logger.info(`[REITValuationService] AFFO cache hit for ${upperTicker}`);
      return cached;
    }

    try {
      // 1. Calculate FFO first
      const ffoResult = await this.calculateFFO(upperTicker);
      if (!ffoResult) {
        logger.warn(`[REITValuationService] Cannot calculate AFFO without FFO for ${upperTicker}`);
        return null;
      }

      const ffo = ffoResult.ffo; // Already in millions

      // 2. Fetch cash flow statement for capex
      const cashFlowData = await fmpGet<any[]>(`/api/v3/cash-flow-statement/${upperTicker}`, { period: 'annual', limit: 1 });
      if (!cashFlowData || !Array.isArray(cashFlowData) || cashFlowData.length === 0) {
        logger.warn(`[REITValuationService] No cash flow data for ${upperTicker}`);
        return null;
      }

      const capex = Math.abs(Number(cashFlowData[0].capitalExpenditure || 0));
      const capexMillions = capex / 1_000_000;

      // 3. Estimate recurring capex (60% of total capex is conservative estimate)
      const recurringCapex = capexMillions * 0.6;

      // 4. Calculate AFFO
      const affo = ffo - recurringCapex;

      // 5. Get shares outstanding and calculate AFFO per share
      const sharesOutstandingM = await this.getSharesOutstanding(upperTicker);
      const affoPerShare = affo / sharesOutstandingM;

      if (!isFinite(affoPerShare) || affoPerShare <= 0) {
        logger.warn(`[REITValuationService] Invalid AFFO per share for ${upperTicker}: ${affoPerShare}`);
        return null;
      }

      // 6. Get subsector and sector average P/AFFO (typically 0.9x P/FFO)
      const subsector = ffoResult.subsector;
      const sectorAvgPFFO = REIT_SECTOR_BENCHMARKS[subsector].pFFO;
      const sectorAvgPAFFO = sectorAvgPFFO * 0.9; // More conservative multiple for AFFO

      // 7. Calculate current price and P/AFFO ratio
      const currentPrice = await this.getCurrentPrice(upperTicker);
      const currentPAFFO = currentPrice / affoPerShare;

      // 8. Calculate intrinsic value using sector average P/AFFO
      const iv = affoPerShare * sectorAvgPAFFO;

      if (!isFinite(iv) || iv <= 0) {
        return null;
      }

      logger.info(
        `[REITValuationService] AFFO for ${upperTicker}: AFFO/Share=$${affoPerShare.toFixed(2)}, ` +
        `Sector P/AFFO=${sectorAvgPAFFO.toFixed(2)}x, Current P/AFFO=${currentPAFFO.toFixed(2)}x, IV=$${iv.toFixed(2)}`
      );

      // 9. Build response object
      const response: AFFOValuationResponse = {
        ticker: upperTicker,
        iv,
        currentPrice,
        ffo,
        recurringCapex,
        affo,
        affoPerShare,
        currentPAFFO,
        sectorAvgPAFFO,
        subsector,
        confidence: 'HIGH', // AFFO is more accurate than FFO
        as_of: new Date().toISOString().split('T')[0],
      };

      // Cache for 24h
      await redisCacheService.set(cacheKey, response, 86400);

      return response;
    } catch (error: any) {
      logger.error(`[REITValuationService] Error calculating AFFO for ${upperTicker}:`, error.message);
      return null;
    }
  }

  /**
   * Calculate P/FFO Mean (5-year historical average)
   *
   * Uses historical P/FFO ratios to determine fair value.
   *
   * @param ticker - REIT ticker symbol
   * @returns P/FFO mean valuation response or null if calculation fails
   */
  async calculatePFFOMean(ticker: string): Promise<PFFOMeanValuationResponse | null> {
    const upperTicker = ticker.toUpperCase();
    const cacheKey = VALUATION_CACHE_KEYS.IV_CALC + upperTicker + ':p_ffo_mean';

    // Check cache
    const cached = await redisCacheService.get<PFFOMeanValuationResponse>(cacheKey);
    if (cached) {
      logger.info(`[REITValuationService] P/FFO Mean cache hit for ${upperTicker}`);
      return cached;
    }

    try {
      // 1. Get current FFO result
      const ffoResult = await this.calculateFFO(upperTicker);
      if (!ffoResult) {
        return null;
      }

      // 2. Fetch historical price data (5 years annual)
      const historicalPrices = await fmpGet<any[]>(`/api/v3/historical-price-full/${upperTicker}`, {
        from: new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        to: new Date().toISOString().split('T')[0],
      });

      if (!historicalPrices || !historicalPrices.historical || historicalPrices.historical.length < 3) {
        logger.warn(`[REITValuationService] Insufficient historical price data for ${upperTicker}`);
        return null;
      }

      // 3. Fetch historical income statements (5 years)
      const incomeData = await fmpGet<any[]>(`/api/v3/income-statement/${upperTicker}`, { period: 'annual', limit: 5 });
      if (!incomeData || !Array.isArray(incomeData) || incomeData.length < 3) {
        logger.warn(`[REITValuationService] Insufficient historical income data for ${upperTicker}`);
        return null;
      }

      // 4. Calculate historical P/FFO ratios
      const historicalPFFO: number[] = [];
      for (let i = 0; i < Math.min(incomeData.length, 5); i++) {
        const netIncome = Number(incomeData[i].netIncome || 0);
        const depAmort = Number(incomeData[i].depreciationAndAmortization || 0);
        const ffo = (netIncome + depAmort) / 1_000_000;

        const year = incomeData[i].date.split('-')[0];
        const yearEndPrice = historicalPrices.historical.find((p: any) => p.date.startsWith(year + '-12'))?.close;

        if (yearEndPrice && ffo > 0) {
          const sharesM = await this.getSharesOutstanding(upperTicker);
          const ffoPerShare = ffo / sharesM;
          const pFFO = yearEndPrice / ffoPerShare;

          if (isFinite(pFFO) && pFFO > 0 && pFFO < 50) { // Filter outliers
            historicalPFFO.push(pFFO);
          }
        }
      }

      if (historicalPFFO.length < 3) {
        logger.warn(`[REITValuationService] Insufficient P/FFO history for ${upperTicker}`);
        return null;
      }

      // 5. Calculate mean P/FFO
      const meanPFFO5Y = historicalPFFO.reduce((sum, p) => sum + p, 0) / historicalPFFO.length;

      // 6. Calculate intrinsic value
      const iv = ffoResult.ffoPerShare * meanPFFO5Y;

      if (!isFinite(iv) || iv <= 0) {
        return null;
      }

      logger.info(
        `[REITValuationService] P/FFO Mean for ${upperTicker}: Mean P/FFO=${meanPFFO5Y.toFixed(2)}x, ` +
        `FFO/Share=$${ffoResult.ffoPerShare.toFixed(2)}, IV=$${iv.toFixed(2)}`
      );

      // 7. Build response object
      const response: PFFOMeanValuationResponse = {
        ticker: upperTicker,
        iv,
        currentPrice: ffoResult.currentPrice,
        meanPFFO5Y,
        ffoPerShare: ffoResult.ffoPerShare,
        historicalPFFO,
        currentPFFO: ffoResult.currentPFFO,
        subsector: ffoResult.subsector,
        confidence: 'MED',
        as_of: new Date().toISOString().split('T')[0],
      };

      // Cache for 24h
      await redisCacheService.set(cacheKey, response, 86400);

      return response;
    } catch (error: any) {
      logger.error(`[REITValuationService] Error calculating P/FFO Mean for ${upperTicker}:`, error.message);
      return null;
    }
  }

  /**
   * Calculate P/FFO Sector (sector benchmark valuation)
   *
   * Uses sector-specific P/FFO benchmarks from REIT_SECTOR_BENCHMARKS.
   *
   * @param ticker - REIT ticker symbol
   * @returns P/FFO sector valuation response or null if calculation fails
   */
  async calculatePFFOSector(ticker: string): Promise<PFFOSectorValuationResponse | null> {
    const upperTicker = ticker.toUpperCase();
    const cacheKey = VALUATION_CACHE_KEYS.IV_CALC + upperTicker + ':p_ffo_sector';

    // Check cache
    const cached = await redisCacheService.get<PFFOSectorValuationResponse>(cacheKey);
    if (cached) {
      logger.info(`[REITValuationService] P/FFO Sector cache hit for ${upperTicker}`);
      return cached;
    }

    try {
      // 1. Calculate FFO (already includes sector classification)
      const ffoResult = await this.calculateFFO(upperTicker);
      if (!ffoResult) {
        return null;
      }

      // 2. Use sector benchmark from REIT_SECTOR_BENCHMARKS
      const sectorAvgPFFO = ffoResult.sectorAvgPFFO;
      const iv = ffoResult.ffoPerShare * sectorAvgPFFO;

      logger.info(
        `[REITValuationService] P/FFO Sector for ${upperTicker}: Sector=${ffoResult.subsector}, ` +
        `P/FFO=${sectorAvgPFFO}x, FFO/Share=$${ffoResult.ffoPerShare.toFixed(2)}, IV=$${iv.toFixed(2)}`
      );

      // 3. Build response object
      const response: PFFOSectorValuationResponse = {
        ticker: upperTicker,
        iv,
        currentPrice: ffoResult.currentPrice,
        sectorAvgPFFO,
        ffoPerShare: ffoResult.ffoPerShare,
        currentPFFO: ffoResult.currentPFFO,
        subsector: ffoResult.subsector,
        peerCount: 10, // Placeholder - could be enhanced with actual peer count
        confidence: 'HIGH', // Sector benchmarks are reliable
        as_of: new Date().toISOString().split('T')[0],
      };

      // Cache for 24h
      await redisCacheService.set(cacheKey, response, 86400);

      return response;
    } catch (error: any) {
      logger.error(`[REITValuationService] Error calculating P/FFO Sector for ${upperTicker}:`, error.message);
      return null;
    }
  }

  /**
   * Calculate Dividend Yield Valuation for REITs
   *
   * Formula: IV = Annual_Dividend_per_Share / Required_Yield
   * Required yield typically 5-7% for REITs depending on subsector risk.
   *
   * @param ticker - REIT ticker symbol
   * @returns Dividend yield valuation response or null if calculation fails
   */
  async calculateDividendYield(ticker: string): Promise<DividendYieldValuationResponse | null> {
    const upperTicker = ticker.toUpperCase();
    const cacheKey = VALUATION_CACHE_KEYS.IV_CALC + upperTicker + ':dividend_yield';

    // Check cache
    const cached = await redisCacheService.get<DividendYieldValuationResponse>(cacheKey);
    if (cached) {
      logger.info(`[REITValuationService] Dividend Yield cache hit for ${upperTicker}`);
      return cached;
    }

    try {
      // 1. Get subsector for risk-adjusted required yield
      const subsector = await this.getREITSubSector(upperTicker);

      // Risk-adjusted required yields by subsector
      const REQUIRED_YIELDS: Record<REITSubSector, number> = {
        'data-center': 0.045,    // 4.5% (lower risk, high growth)
        'cell-tower': 0.050,     // 5.0% (stable infrastructure)
        'industrial': 0.050,     // 5.0% (e-commerce tailwind)
        'residential': 0.055,    // 5.5% (moderate risk)
        'healthcare': 0.060,     // 6.0% (regulatory risk)
        'retail': 0.070,         // 7.0% (higher risk)
        'office': 0.075,         // 7.5% (highest risk, remote work impact)
        'diversified': 0.060,    // 6.0% (blended risk)
      };

      const requiredYield = REQUIRED_YIELDS[subsector];

      // 2. Fetch dividend history (last 5 years)
      const dividendData = await fmpGet<any[]>(`/api/v3/historical-price-full/stock_dividend/${upperTicker}`);
      if (!dividendData || !dividendData.historical || dividendData.historical.length === 0) {
        logger.warn(`[REITValuationService] No dividend data for ${upperTicker}`);
        return null;
      }

      // 3. Calculate TTM dividend per share
      const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      const recentDividends = dividendData.historical.filter((d: any) =>
        new Date(d.date) >= oneYearAgo
      );

      if (recentDividends.length === 0) {
        logger.warn(`[REITValuationService] No recent dividend data for ${upperTicker}`);
        return null;
      }

      const annualDividendPerShare = recentDividends.reduce((sum: number, d: any) => sum + Number(d.dividend || 0), 0);

      if (annualDividendPerShare <= 0) {
        logger.warn(`[REITValuationService] Invalid dividend data for ${upperTicker}`);
        return null;
      }

      // 4. Calculate dividend growth rate (5-year CAGR)
      const historicalDividends = dividendData.historical.slice(0, 5);
      const dividendGrowthRate = historicalDividends.length >= 2
        ? Math.pow(historicalDividends[0].dividend / historicalDividends[historicalDividends.length - 1].dividend, 1 / (historicalDividends.length - 1)) - 1
        : 0;

      // 5. Get current price and calculate current yield
      const currentPrice = await this.getCurrentPrice(upperTicker);
      const currentYield = annualDividendPerShare / currentPrice;

      // 6. Calculate intrinsic value
      const iv = annualDividendPerShare / requiredYield;

      if (!isFinite(iv) || iv <= 0) {
        return null;
      }

      // 7. Get FFO for payout ratio calculation
      const ffoResult = await this.calculateFFO(upperTicker);
      const payoutRatio = ffoResult ? (annualDividendPerShare / ffoResult.ffoPerShare) : 0;

      logger.info(
        `[REITValuationService] Dividend Yield for ${upperTicker}: Annual Div=$${annualDividendPerShare.toFixed(2)}, ` +
        `Required Yield=${(requiredYield * 100).toFixed(2)}%, Current Yield=${(currentYield * 100).toFixed(2)}%, IV=$${iv.toFixed(2)}`
      );

      // 8. Build response object
      const response: DividendYieldValuationResponse = {
        ticker: upperTicker,
        iv,
        currentPrice,
        annualDividendPerShare,
        requiredYield,
        currentYield,
        dividendGrowthRate,
        payoutRatio,
        subsector,
        confidence: 'HIGH', // Dividend yield is very reliable for REITs
        as_of: new Date().toISOString().split('T')[0],
      };

      // Cache for 24h
      await redisCacheService.set(cacheKey, response, 86400);

      return response;
    } catch (error: any) {
      logger.error(`[REITValuationService] Error calculating Dividend Yield for ${upperTicker}:`, error.message);
      return null;
    }
  }
}

// Export singleton instance
export const reitValuationService = new REITValuationService();
