/**
 * FASE 2C: High-Growth DCF (8-year projection) Method
 *
 * This file contains the calculateGrowthDCF8Y method to be added to ValuationService
 */

import { redisCacheService } from '../cache/redis-cache-service';
import { logger } from '../lib/logger';
import {
  GrowthDCF8YResponse,
  ValuationConfidence,
  Region,
  VALUATION_CACHE_KEYS,
  VALUATION_DEFAULTS,
  VALUATION_CLAMPS,
} from '../types/valuation';
import { estimateGrowthRates } from '../utils/growth-rate-estimator';

// Helper: Clamp value between min and max (copied from valuation-service.ts)
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * FASE 2C: Calculate High-Growth DCF (8-year projection)
 *
 * Purpose: Specialized valuation for high-growth tech stocks (NVDA, TSLA, AMZN, GOOGL)
 * following big fintech/hedge fund best practices
 *
 * Key differences from standard DCF-20:
 * 1. 8-year projection (not 20) - focuses on near-term visibility
 * 2. Allows higher growth rates (up to 50% for Y1-5) for hyper-growth phase
 * 3. Higher terminal growth (3-5% vs standard 4%) for growth companies
 * 4. Two-stage model: Years 1-5 (high growth) → Years 6-8 (transition)
 *
 * Use cases:
 * - NVDA: 40%+ revenue growth from AI/datacenter demand
 * - TSLA: 30-40% vehicle delivery growth
 * - AMZN: 20-25% consistent growth across AWS + retail
 * - GOOGL: 15-20% sustained growth from search + cloud
 *
 * Formula:
 * Stage 1 PV = Σ(FCF_t / (1+WACC)^(t-0.5)) for t=1 to 5
 * Stage 2 PV = Σ(FCF_t / (1+WACC)^(t-0.5)) for t=6 to 8
 * Terminal Value = FCF_9 / (WACC - g_term)
 * IV = (Stage1 + Stage2 + Terminal + Cash - Debt) / Shares
 *
 * @param ticker Stock symbol (e.g., 'NVDA', 'TSLA')
 * @param valuationService The ValuationService instance (for accessing helper methods)
 * @returns GrowthDCF8YResponse with IV and inputs, or null if calculation fails
 */
export async function calculateGrowthDCF8Y(
  ticker: string,
  valuationService: any // Use any to avoid circular dependency
): Promise<GrowthDCF8YResponse | null> {
  const upperTicker = ticker.toUpperCase();
  const cacheKey = `${VALUATION_CACHE_KEYS.IV_CALC}${upperTicker}:growth_dcf_8y`;

  // Check cache
  const cached = await redisCacheService.get<GrowthDCF8YResponse>(cacheKey);
  if (cached) {
    logger.info(`[ValuationService] Growth DCF-8Y cache hit for ${upperTicker}`);
    return cached;
  }

  try {
    logger.info(`[ValuationService] Calculating Growth DCF-8Y for ${upperTicker}`);

    // Step 1: Get company profile (beta, sector)
    const profile = await valuationService.getProfile(upperTicker);
    if (!profile) {
      logger.warn(`[ValuationService] No profile data for ${upperTicker}`);
      return null;
    }

    const beta = clamp(profile.beta || VALUATION_DEFAULTS.BETA, VALUATION_CLAMPS.BETA.min, VALUATION_CLAMPS.BETA.max);
    const region: Region = 'US'; // Growth stocks are primarily US-based

    // Step 2: Get FCF data (use base metric helper)
    const baseMetricData = await valuationService.getBaseMetricForDCF(upperTicker, 'fcf');
    if (!baseMetricData) {
      logger.warn(`[ValuationService] No FCF data for ${upperTicker}`);
      return null;
    }

    const fcf_ttm = baseMetricData.current;
    if (fcf_ttm <= 0 || !isFinite(fcf_ttm)) {
      logger.warn(`[ValuationService] Invalid FCF TTM for ${upperTicker}: ${fcf_ttm}`);
      return null;
    }

    // Step 3: Get cash, debt, and shares outstanding (use existing helper)
    const cashDebtData = await valuationService.getCashAndDebt(upperTicker);
    if (!cashDebtData) {
      logger.warn(`[ValuationService] No cash/debt data for ${upperTicker}`);
      return null;
    }

    const { cash, debt } = cashDebtData;

    const shares_m = await valuationService.getSharesOutstanding(upperTicker);
    if (!shares_m || shares_m <= 0) {
      logger.warn(`[ValuationService] Invalid shares outstanding for ${upperTicker}: ${shares_m}`);
      return null;
    }

    logger.info(`[ValuationService] ${upperTicker} inputs: FCF_TTM=${fcf_ttm.toFixed(2)}M, Cash=${cash.toFixed(2)}M, Debt=${debt.toFixed(2)}M, Shares=${shares_m.toFixed(2)}M`);

    // Step 4: Calculate growth rates
    // For growth stocks, use analyst estimates with higher clamps
    const growthRates = await estimateGrowthRates({
      ticker: upperTicker,
      sector: profile.sector
    });

    // Allow higher growth for Y1-5 (up to 50%)
    let g1_5 = growthRates.year1To5;
    g1_5 = clamp(g1_5, 0.05, 0.50); // 5% to 50% (UPDATED)

    // Transition phase (Y6-8): Moderate decay toward terminal
    // Use 70% retention factor for high-growth stocks (less aggressive decay)
    const retentionFactor = 0.70;
    let g6_8 = g1_5 * retentionFactor;
    g6_8 = clamp(g6_8, 0.03, 0.15); // 3% to 15%

    // Terminal growth: Higher for growth stocks (3-5% vs standard 4%)
    const gTermData = await valuationService.getGTerm(region);
    const g_term = clamp(gTermData.g_term, 0.03, 0.05); // 3% to 5%

    logger.info(`[ValuationService] ${upperTicker} growth rates: Y1-5=${(g1_5 * 100).toFixed(2)}%, Y6-8=${(g6_8 * 100).toFixed(2)}%, Terminal=${(g_term * 100).toFixed(2)}%`);

    // Step 5: Calculate WACC (CAPM)
    const rfData = await valuationService.getRiskFree(region);
    const mrpData = await valuationService.getMRP(region);
    const wacc = clamp(rfData.rf + beta * mrpData.mrp, VALUATION_CLAMPS.DR.min, VALUATION_CLAMPS.DR.max);

    logger.info(`[ValuationService] ${upperTicker} WACC: ${(wacc * 100).toFixed(2)}% (RF=${(rfData.rf * 100).toFixed(2)}%, Beta=${beta.toFixed(2)}, MRP=${(mrpData.mrp * 100).toFixed(2)}%)`);

    // Step 6: 2-Stage DCF Calculation with mid-year discounting
    // Stage 1: Years 1-5 (high growth)
    let stage1PV = 0;
    let currentFCF = fcf_ttm;
    for (let year = 1; year <= 5; year++) {
      currentFCF *= (1 + g1_5);
      const discountFactor = Math.pow(1 + wacc, year - 0.5); // Mid-year convention
      stage1PV += currentFCF / discountFactor;
    }

    // Stage 2: Years 6-8 (transition)
    let stage2PV = 0;
    for (let year = 6; year <= 8; year++) {
      currentFCF *= (1 + g6_8);
      const discountFactor = Math.pow(1 + wacc, year - 0.5);
      stage2PV += currentFCF / discountFactor;
    }

    // Terminal Value: Beyond year 8 (perpetuity with g_term)
    const fcf_year_9 = currentFCF * (1 + g_term);
    const terminalValueAtYear8 = fcf_year_9 / (wacc - g_term);
    const terminalPV = terminalValueAtYear8 / Math.pow(1 + wacc, 8);

    // Total Enterprise Value
    const enterpriseValue = stage1PV + stage2PV + terminalPV;

    // Calculate equity value per share
    const equityValue = enterpriseValue + cash - debt;
    const iv = equityValue / shares_m;

    // Defensive: Validate IV result
    if (!isFinite(iv) || iv <= 0) {
      logger.warn(`[ValuationService] ${upperTicker} - Invalid Growth DCF-8Y IV: ${iv}`);
      return null;
    }

    logger.info(`[ValuationService] Growth DCF-8Y for ${upperTicker}: Stage1=${stage1PV.toFixed(2)}M, Stage2=${stage2PV.toFixed(2)}M, Terminal=${terminalPV.toFixed(2)}M, EV=${enterpriseValue.toFixed(2)}M, IV=$${iv.toFixed(2)}`);

    // Step 7: Determine confidence level
    let confidence: ValuationConfidence = 'HIGH';
    if (beta === VALUATION_DEFAULTS.BETA || rfData.source === 'fallback' || mrpData.source === 'fallback') {
      confidence = 'MED';
    }
    if (growthRates.confidence === 'low' || growthRates.dataSource === 'default') {
      confidence = 'LOW';
    }

    // Step 8: Build response
    const response: GrowthDCF8YResponse = {
      ticker: upperTicker,
      iv,
      fcf: fcf_ttm,
      totalDebt: debt,
      cash,
      wacc,
      sharesOutstanding: shares_m,
      growthY1_5: g1_5,
      growthY6_8: g6_8,
      terminalGrowth: g_term,
      stage1Years: 5,
      stage2Years: 3,
      confidence,
      as_of: new Date().toISOString().split('T')[0],
    };

    // Cache for 24h
    await redisCacheService.set(cacheKey, response, 86400);

    return response;
  } catch (error: any) {
    logger.error(`[ValuationService] Error calculating Growth DCF-8Y for ${upperTicker}:`, error);
    return null;
  }
}
