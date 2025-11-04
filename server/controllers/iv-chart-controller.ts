/**
 * IV Chart Controller - FASE 3 + ONDA 1.2
 *
 * Consolidates all valuation methods (12 total) for charting and comparison:
 * - 1 Proprietary: AlfaValue™
 * - 2 DCF External: FMP benchmarks (dynamic growth rates)
 * - 7 Multiples: P/E, P/S, P/B Mean 5y (with/without NRI variants)
 * - 2 Growth: PEG, PSG
 *
 * REMOVED: 2 FCFE methods (FMP API returns empty array - no data available)
 *
 * Applies macro multiplier to all IVs and calculates discount percentages
 *
 * ONDA 1.2 FIX: Growth rates now dynamic (analyst + historical fallback)
 */

import { Request, Response } from 'express';
import { valuationService } from '../services/valuation-service';
import { fmpDCFService } from '../services/fmp-dcf';
import { macroService } from '../services/macro-service';
import { logger } from '../lib/logger';
import { redisCacheService } from '../cache/redis-cache-service';
import { simpleCacheService } from '../services/simple-cache-service';
import { methodCacheService } from '../services/method-cache-service';
import { getPriceWithFallbacks } from '../services/price-fallback-service';
import { estimateGrowthRates } from '../utils/growth-rate-estimator';
import { isETF, getETFReason, isREIT, isGrowthStock, isBank } from '../utils/stock-classifier';
import { reitValuationService } from '../services/valuation-service-reit';
import { fmpRateLimiter } from '../middleware/fmp-rate-limiter';
import axios from 'axios';
import {
  IVChartResponse,
  ValuationMethod,
  DCFBaseMetric,
  MethodId,
  FailedMethod,
  FAILURE_REASONS,
} from '../types/valuation';

const FMP_BASE_URL = 'https://financialmodelingprep.com';
const FMP_API_KEY = process.env.FMP_API_KEY || '';
const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY || '';

/**
 * Normalize ticker format for FMP API compatibility
 * FMP uses hyphens for share classes (BRK-B, BF-A), not dots
 *
 * Examples:
 * - BRK.B → BRK-B (Berkshire Hathaway Class B)
 * - BF.A → BF-A (Brown-Forman Class A)
 * - ASML.AS → ASML.AS (European exchange suffix preserved)
 * - BMW.F → BMW.F (Frankfurt exchange preserved)
 * - ABI.BR → ABI.BR (Brussels exchange preserved)
 * - AAPL → AAPL (unchanged)
 */
function normalizeTickerFormat(symbol: string): string {
  const upper = symbol.toUpperCase();

  // Known exchange suffixes to preserve (don't convert . to -)
  const exchangeSuffixes = [
    'AS', 'L', 'PA', 'DE', 'LS', 'SW', 'HK', 'TO', 'V',  // Existing
    'F', 'BR', 'MC', 'MI', 'ST', 'HE', 'CO', 'OL', 'VI'  // NEW (Frankfurt, Brussels, Madrid, Milan, Stockholm, Helsinki, Copenhagen, Oslo, Vienna)
  ];

  // Check if has exchange suffix
  const suffixMatch = upper.match(/\.([A-Z]+)$/);
  if (suffixMatch) {
    const suffix = suffixMatch[1];

    // If exchange suffix, preserve it
    if (exchangeSuffixes.includes(suffix)) {
      return upper;
    }

    // Otherwise convert to hyphen (share class: BRK.B → BRK-B)
    if (suffix.length === 1) {
      return upper.replace(/\.([A-Z])$/, '-$1');
    }
  }

  return upper;
}

/**
 * GET /api/iv/:ticker/chart
 *
 * Returns consolidated valuation methods with macro adjustment
 *
 * Query params:
 * - based_on: 'fcf' | 'ocf' | 'ni' (default: 'fcf') - GAP #3
 */
export async function getIVChart(req: Request, res: Response): Promise<void> {
  try {
    const ticker = normalizeTickerFormat(req.params.ticker || '');
    const basedOn = (req.query.based_on as DCFBaseMetric) || 'fcf';

    if (!ticker) {
      res.status(400).json({ error: 'Ticker symbol required' });
      return;
    }

    // ONDA 4.1: Enhanced ETF Detection - Get company profile first for comprehensive check
    const companyProfile = await getCompanyProfile(ticker);

    // ETF Detection with 4 strategies (suffix, known list, API type, name pattern)
    // HTTP 422 (Unprocessable Entity) - semantically correct for ETFs (valid format, wrong entity type)
    if (isETF(ticker, companyProfile)) {
      const reason = getETFReason(ticker, companyProfile);
      logger.info(`[IV Chart] Rejected ETF request: ${ticker} (${reason})`);
      res.status(422).json({
        error: 'ETF_NOT_SUPPORTED',
        message: `${ticker} is an ETF. Intrinsic value calculations are only available for individual stocks.`,
        reason,
        ticker,
        suggestion: 'Try analyzing individual stocks within the ETF instead.',
        alternative_methods: [
          'Price momentum',
          'Relative strength',
          'Expense ratio analysis',
          'Tracking error analysis'
        ]
      });
      return;
    }

    // Redis Cache Check - 24h TTL to reduce FMP API calls (27 → 0 when cached)
    const cacheKey = `iv:chart:${ticker}:${basedOn}`;
    try {
      const cached = await redisCacheService.get<IVChartResponse>(cacheKey);
      if (cached) {
        logger.info(`[IV Chart] Cache HIT for ${ticker} (based_on: ${basedOn})`);
        res.json(cached);
        return;
      }
      logger.info(`[IV Chart] Cache MISS for ${ticker} (based_on: ${basedOn}) - fetching from FMP`);
    } catch (cacheError) {
      // Cache error shouldn't block the request, just log and continue
      logger.error(`[IV Chart] Cache read error for ${ticker}:`, cacheError);
    }

    // P0 FIX: FMP Rate Limiter - Check budget before expensive calculations
    // Each IV calculation makes ~12 FMP calls (profile, financials, metrics, DCF, etc.)
    // Budget: 200 calls/min to prevent 429 errors and rate exhaustion
    try {
      logger.info(`[IV Chart] Checking FMP rate limit budget for ${ticker}`);
      await fmpRateLimiter.checkBudget(12); // Estimate 12 FMP calls per IV
      const stats = fmpRateLimiter.getStats();
      logger.info(`[IV Chart] FMP budget check passed for ${ticker}`, {
        used: stats.currentUsed,
        budget: stats.currentBudget,
        utilization: fmpRateLimiter.getUtilization().toFixed(1) + '%',
      });
    } catch (rateLimitError: any) {
      logger.error(`[IV Chart] FMP rate limit exceeded for ${ticker}:`, rateLimitError.message);
      res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'FMP API rate limit exceeded. Please try again in a moment.',
        ticker,
        retryAfter: Math.ceil(fmpRateLimiter.getTimeUntilReset() / 1000), // seconds
        stats: fmpRateLimiter.getStats(),
      });
      return;
    }

    logger.info(`[IVChart] Generating chart for ${ticker} (based_on: ${basedOn})`);

    // 1. Get current price - ULTRAFIX FASE 2: 4-tier fallback system
    // Fixes European stocks 404 bug (1,045 stocks recovered)
    // Tier 1: quote (cached) → Tier 2: profile → Tier 3: historical → Tier 4: calculated
    const price = await getPriceWithFallbacks(ticker);
    if (!price || price <= 0) {
      logger.warn(`[IVChart] No price data found for ${ticker} (tried all 4 tiers)`);
      res.status(404).json({ error: `No price data found for ${ticker}` });
      return;
    }
    logger.info(`[IVChart] Current price for ${ticker}: $${price.toFixed(2)}`);

    // 2. Get macro multiplier
    const macroData = await macroService.getMacroMultiplier('US');
    const macroMultiplier = macroData.multiplier;
    const macroSentiment = macroData.sentiment;

    logger.info(`[IVChart] Macro multiplier: ${macroMultiplier.toFixed(3)} (${macroSentiment})`);
    const sector = companyProfile?.sector;

    // 4. Estimate growth rates (ONDA 1.2 FIX - P0 Bug Resolution)
    logger.info(`[IVChart] Fetching growth rates for ${ticker} (sector: ${sector || 'unknown'})`);
    const growthRates = await estimateGrowthRates({
      ticker,
      sector
    });
    logger.info(
      `[IVChart] Growth rates: Y1-5=${(growthRates.year1To5 * 100).toFixed(2)}%, ` +
      `Y6-10=${(growthRates.year6To10 * 100).toFixed(2)}%, ` +
      `Y11-20=${(growthRates.year11To20 * 100).toFixed(2)}% ` +
      `(source: ${growthRates.dataSource}, confidence: ${growthRates.confidence})`
    );

    // 5. Get base metric if "based_on" is specified (GAP #3)
    let baseMetricInfo: { current: number; historical: number[] } | null = null;
    if (basedOn !== 'fcf') {
      // Only fetch if user selected OCF or NI (FCF is default in AlfaValue)
      baseMetricInfo = await valuationService.getBaseMetricForDCF(ticker, basedOn);
      if (baseMetricInfo) {
        logger.info(
          `[IVChart] Using ${basedOn.toUpperCase()} base metric: ` +
          `Current=${baseMetricInfo.current.toFixed(2)}M`
        );
      }
    }

    // 6. FASE 2C: Classify stock and dynamically add specialized methods
    // Fetch growth metrics for classification (beta, EPS growth, revenue growth)
    logger.info(`[IV-Chart] Classifying ${ticker} (sector: ${sector || 'unknown'})`);

    let beta = 1.0; // Default neutral beta
    let epsGrowth = 0.05; // Default 5% growth
    let revenueGrowth = 0.05;

    try {
      // Fetch beta from profile
      if (companyProfile && 'beta' in companyProfile) {
        beta = (companyProfile as any).beta || 1.0;
      }

      // Fetch growth rates from FMP key metrics (5-year historical)
      const metricsUrl = `${FMP_BASE_URL}/api/v3/key-metrics/${ticker}?period=annual&limit=5&apikey=${FMP_API_KEY}`;
      const metricsRes = await axios.get(metricsUrl, { timeout: 10000, headers: { 'Accept-Encoding': 'gzip' } });

      if (metricsRes.data && Array.isArray(metricsRes.data) && metricsRes.data.length >= 2) {
        // Calculate 5-year EPS CAGR
        const oldest = metricsRes.data[metricsRes.data.length - 1];
        const newest = metricsRes.data[0];
        const years = metricsRes.data.length - 1;

        if (oldest.netIncomePerShare && newest.netIncomePerShare && oldest.netIncomePerShare > 0) {
          epsGrowth = Math.pow(newest.netIncomePerShare / oldest.netIncomePerShare, 1 / years) - 1;
        }

        if (oldest.revenuePerShare && newest.revenuePerShare && oldest.revenuePerShare > 0) {
          revenueGrowth = Math.pow(newest.revenuePerShare / oldest.revenuePerShare, 1 / years) - 1;
        }
      }

      logger.info(
        `[IV-Chart] ${ticker} metrics: beta=${beta.toFixed(2)}, ` +
        `epsGrowth=${(epsGrowth * 100).toFixed(1)}%, ` +
        `revenueGrowth=${(revenueGrowth * 100).toFixed(1)}%`
      );
    } catch (error) {
      logger.warn(`[IV-Chart] Could not fetch growth metrics for ${ticker}, using defaults`);
    }

    // Classify stock type
    const isGrowth = isGrowthStock(beta, epsGrowth, revenueGrowth, sector);
    const isBankStock = isBank(sector, undefined, ticker);
    const isReitStock = isREIT(
      sector || '',
      companyProfile?.industry || '',
      companyProfile?.companyName || ''
    );

    logger.info(
      `[IV-Chart] ${ticker} classification: ` +
      `growth=${isGrowth}, bank=${isBankStock}, REIT=${isReitStock}`
    );

    // 7. Calculate all methods in parallel using method-level cache (ONDA 7)
    // REMOVED: dcf-fcfe-20 and dcf-terminal-fcfe (FMP API returns empty array - no FCFE data)
    // AGENT 1C: Added p-tbv-mean and p-tbv-sector for banks (Financial Services)
    // AGENT 1D: Added 5 REIT methods for Real Estate sector
    // SUB-FASE 2D: Added graham-number and ddm for value stocks
    // FASE 2C: Added growth-dcf-8y for growth stocks
    logger.info(`[IV-Chart] Using method-level cache for ${ticker} (base: 21 methods, dynamic additions)`);

    // Base methodIds (always calculated)
    const methodIds: MethodId[] = [
      'alfa-value',
      'dcf-fcf-20',
      'dcf-terminal-fcf',
      'dni-20',
      'pe-mean',
      'pe-mean-without-nri',
      'ps-mean',
      'pb-mean',
      'pb-mean-without-nri',
      'peg',
      'psg',
      'dfcf-terminal',
      'p-tbv-mean',      // AGENT 1C: P/TBV historical mean (banks)
      'p-tbv-sector',    // AGENT 1C: P/TBV sector benchmark (banks)
      'ffo-reit',        // AGENT 1D: FFO (Funds From Operations) for REITs
      'affo-reit',       // AGENT 1D: AFFO (Adjusted FFO) for REITs
      'p-ffo-mean',      // AGENT 1D: P/FFO historical mean for REITs
      'p-ffo-sector',    // AGENT 1D: P/FFO sector benchmark for REITs
      'dividend-yield-reit', // AGENT 1D: Dividend discount model for REITs
      'graham-number',   // SUB-FASE 2D: Benjamin Graham's intrinsic value formula
      'ddm',             // SUB-FASE 2D: Dividend Discount Model (Gordon Growth Model)
    ];

    // AGENT 4 FIX (P0.4): Block DCF methods for banks - negative FCF makes DCF meaningless
    // Banks use alternative financing (deposits, interbank lending) not traditional FCF
    if (isBankStock) {
      // Remove all DCF methods: dcf-fcf-20, dcf-terminal-fcf, dni-20, dfcf-terminal
      const dcfMethods = ['dcf-fcf-20', 'dcf-terminal-fcf', 'dni-20', 'dfcf-terminal'];
      const filteredMethods = methodIds.filter(m => !dcfMethods.includes(m));
      const removedCount = methodIds.length - filteredMethods.length;

      logger.info(
        `[IV-Chart] ${ticker} is a bank - blocking ${removedCount} DCF methods (inappropriate for financial institutions): ` +
        `${dcfMethods.filter(m => methodIds.includes(m as MethodId)).join(', ')}`
      );

      methodIds.length = 0;
      methodIds.push(...filteredMethods);
    }

    // FASE 2C: Dynamic method addition based on classification
    // Growth DCF 8Y ONLY for true growth stocks (NOT banks/REITs, even if they meet growth criteria)
    if (isGrowth && !isBankStock && !isReitStock) {
      methodIds.push('growth-dcf-8y' as MethodId);
      logger.info(`[IV-Chart] ${ticker} is growth stock - added growth-dcf-8y method`);
    } else if (isGrowth && (isBankStock || isReitStock)) {
      logger.info(`[IV-Chart] ${ticker} excluded from growth-dcf-8y (bank=${isBankStock}, REIT=${isReitStock})`);
    }

    // ONDA 1 FIX: Per-method defensive error handling with detailed logging
    const results = await Promise.allSettled(
      methodIds.map(async (id: MethodId) => {
        try {
          logger.info(`[IV-Chart] ${ticker}: Calculating ${id}...`);
          const result = await methodCacheService.warmMethod(ticker, id);

          if (!result) {
            logger.warn(`[IV-Chart] ${ticker}: ${id} returned null`);
            throw new Error(`Method ${id} returned null`);
          }

          // Attach growth rates for DCF methods (FCFE removed, growth-dcf-8y added)
          if (['dcf-fcf-20', 'dcf-terminal-fcf', 'growth-dcf-8y'].includes(id)) {
            if (result) (result as any).growthRates = growthRates;
          }

          logger.info(`[IV-Chart] ${ticker}: ${id} calculated successfully`);
          return result;
        } catch (error: any) {
          logger.error(`[IV-Chart] ${ticker}: ${id} calculation failed:`, error.message);
          throw error; // Re-throw to mark as rejected in Promise.allSettled
        }
      })
    );

    // AGENT 4 FIX: Map results by methodId instead of by index
    // This allows dynamic filtering (e.g., removing DCF methods for banks)
    // Build a map: methodId -> result
    const resultMap = new Map<MethodId, PromiseSettledResult<any>>();
    methodIds.forEach((methodId, index) => {
      resultMap.set(methodId, results[index]);
    });

    // FASE 2C: Extract method results using resultMap (handles variable method counts)
    const alfaValue = resultMap.get('alfa-value');
    const dcfFCF = resultMap.get('dcf-fcf-20');
    const dcfTermFCF = resultMap.get('dcf-terminal-fcf');
    const dni20 = resultMap.get('dni-20');
    const peMean = resultMap.get('pe-mean');
    const peMeanNoNRI = resultMap.get('pe-mean-without-nri');
    const psMean = resultMap.get('ps-mean');
    const pbMean = resultMap.get('pb-mean');
    const pbMeanNoNRI = resultMap.get('pb-mean-without-nri');
    const peg = resultMap.get('peg');
    const psg = resultMap.get('psg');
    const dfcfTerminal = resultMap.get('dfcf-terminal');
    const ptbvMean = resultMap.get('p-tbv-mean');
    const ptbvSector = resultMap.get('p-tbv-sector');
    const ffoREIT = resultMap.get('ffo-reit');
    const affoREIT = resultMap.get('affo-reit');
    const pFFOMean = resultMap.get('p-ffo-mean');
    const pFFOSector = resultMap.get('p-ffo-sector');
    const dividendYieldREIT = resultMap.get('dividend-yield-reit');
    const grahamNumber = resultMap.get('graham-number');
    const ddm = resultMap.get('ddm');
    const growthDCF8Y = resultMap.get('growth-dcf-8y');

    if (isBankStock && (dcfFCF || dcfTermFCF || dni20 || dfcfTerminal)) {
      logger.info(
        `[IV-Chart] ${ticker} bank: Confirmed DCF methods filtered out (expected: all null)`
      );
    }

    if (isGrowth && growthDCF8Y) {
      logger.info(
        `[IV-Chart] ${ticker} growth stock: growthDCF8Y present, status=${growthDCF8Y?.status || 'N/A'}`
      );
    }

    // 4. Build methods array + track failures
    const methods: ValuationMethod[] = [];
    const failedMethods: FailedMethod[] = [];

    /**
     * Extract method-specific inputs from valuation data
     * @param methodName - Name of the method (e.g., 'DCF-20 FCF FMP')
     * @param data - Raw valuation data from service
     * @param ticker - Stock symbol
     * @returns Method inputs object or null
     */
    function getInputsForMethod(
      methodName: string,
      data: any,
      ticker: string
    ): any | null {
      if (!data) return null;

      // Map method name to input structure
      switch (methodName) {
        case 'AlfaValue™':  // ✅ FIXED: nome correto usado em addMethod
          return {
            method: 'alfavalue',
            based_on: 'fcf',
            // ✅ FIXED: usar campos de data.inputs (AlfaValueResponse)
            fcf_ttm_musd: data.inputs?.fcf_ttm_musd || 0,
            total_debt_musd: data.inputs?.debt_musd || 0,
            cash_musd: data.inputs?.cash_musd || 0,
            // ✅ FIXED: usar data.assumptions.discount_rate
            discount_rate: data.assumptions?.discount_rate || 0.0627,
            shares_outstanding_m: data.inputs?.shares_m || 0,
            // ✅ FIXED: usar data.assumptions (g_1_5, g_6_10, g_11_20)
            growth_rate_y1_5: data.assumptions?.g_1_5 || 0,
            growth_rate_y6_10: data.assumptions?.g_6_10 || 0,
            growth_rate_y11_20: data.assumptions?.g_11_20 || 0,
            deduct_debt: true,
            add_cash: true,
          };

        case 'DCF-20 FCF FMP':
          return {
            method: 'dcf-20',
            based_on: 'fcf',
            // ✅ ATUALIZADO para usar ExtendedFMPDCFResponse.inputs
            fcf_ttm_musd: data.inputs?.freeCashFlow || 0,
            total_debt_musd: data.inputs?.totalDebt || 0,
            cash_musd: data.inputs?.cashAndCashEquivalents || 0,
            discount_rate: 0.0627,  // ✅ CAPM conservador (Rf=1%, MRP=4.8%)
            shares_outstanding_m: data.inputs?.sharesOutstanding || 0,
            // ✅ ONDA 1.2 FIX: Growth rates now dynamic from estimator
            growth_rate_y1_5: data.growthRates?.year1To5 || 0,
            growth_rate_y6_10: data.growthRates?.year6To10 || 0,
            growth_rate_y11_20: data.growthRates?.year11To20 || 0,
            data_source: data.growthRates?.dataSource || 'default',
            confidence: data.growthRates?.confidence || 'low',
            deduct_debt: true,
            add_cash: true,
          };

        case 'DFCF Terminal':
          return {
            method: 'dfcf-terminal',
            based_on: 'fcf',
            fcf_ttm_musd: data.fcf || 0,
            total_debt_musd: data.totalDebt || 0,
            cash_musd: data.cash || 0,
            discount_rate: data.wacc || 0.1036,  // ✅ WACC (calculated)
            shares_outstanding_m: data.sharesOutstanding || 0,
            stage1_years: 5,
            stage1_growth_rate: data.growthY1_5 || 0,
            stage1_value: data.stage1Value || 0,  // CALCULATED
            stage2_years: 5,
            stage2_growth_rate: data.growthY6_10 || 0,
            stage2_value: data.stage2Value || 0,  // CALCULATED
            terminal_growth_rate: data.terminalGrowth || 0.0363,
            terminal_value: data.terminalValue || 0,  // CALCULATED
            deduct_debt: true,
            add_cash: true,
          };

        case 'DCF Terminal FCF FMP':
          return {
            method: 'dcf-20-terminal',
            based_on: 'fcf',
            // ✅ ATUALIZADO para usar ExtendedFMPDCFResponse.inputs
            fcf_ttm_musd: data.inputs?.freeCashFlow || 0,
            total_debt_musd: data.inputs?.totalDebt || 0,
            cash_musd: data.inputs?.cashAndCashEquivalents || 0,
            discount_rate: 0.0627,  // ✅ CAPM conservador (Rf=1%, MRP=4.8%)
            shares_outstanding_m: data.inputs?.sharesOutstanding || 0,
            // ✅ ONDA 1.2 FIX: Growth rates now dynamic from estimator
            growth_rate_y1_5: data.growthRates?.year1To5 || 0,
            growth_rate_y6_10: data.growthRates?.year6To10 || 0,
            growth_rate_y11_20: data.growthRates?.year11To20 || 0,
            data_source: data.growthRates?.dataSource || 'default',
            confidence: data.growthRates?.confidence || 'low',
            deduct_debt: true,
            add_cash: true,
          };

        case 'DNI-20 NI':  // ✅ FIXED: bate com addMethod
          return {
            method: 'dni-20',
            based_on: 'ni',
            net_income_ttm_musd: data.netIncome || 0,
            total_debt_musd: data.totalDebt || 0,
            cash_musd: data.cash || 0,
            discount_rate: data.discountRate || 0.0627,  // ✅ CAPM calculated (fallback 6.27%)
            shares_outstanding_m: data.sharesOutstanding || 0,
            growth_rate_y1_5: data.growthY1_5 || 0,
            growth_rate_y6_10: data.growthY6_10 || 0,
            growth_rate_y11_20: data.growthY11_20 || 0,
            deduct_debt: true,
            add_cash: true,
          };

        case 'P/E Mean 5y':  // ✅ FIXED: bate com addMethod
        case 'P/E Mean without NRI':  // ✅ FIXED: bate com addMethod
          return {
            method: 'pe-mean',
            exclude_nri: methodName.includes('without NRI'),
            mean_pe_ratio_5y: data.avgPE || 0,
            current_price: data.currentPrice || 0,
            eps_ttm: data.eps || 0,
            // Historical ratios (read-only)
            pe_ratios: data.historicalPE || [],
          };

        case 'P/S Mean 5y':  // ✅ FIXED: bate com addMethod
          return {
            method: 'ps-mean',
            mean_ps_ratio_5y: data.avgPS || 0,
            current_price: data.currentPrice || 0,
            sales_per_share_ttm: data.salesPerShare || 0,
            ps_ratios: data.historicalPS || [],
          };

        case 'P/B Mean 5y':  // ✅ FIXED: bate com addMethod
        case 'P/B Mean without NRI':  // ✅ FIXED: bate com addMethod
          return {
            method: 'pb-mean',
            exclude_nri: methodName.includes('without NRI'),
            mean_pb_ratio_5y: data.avgPB || 0,
            current_price: data.currentPrice || 0,
            book_value_per_share_ttm: data.bookValuePerShare || 0,
            pb_ratios: data.historicalPB || [],
          };

        case 'PEG Ratio':  // ✅ FIXED: bate com addMethod
          return {
            method: 'peg',
            fair_peg_ratio: 1.5,  // ✅ DEFAULT EDITÁVEL
            last_price: data.currentPrice || 0,
            eps_without_nri: data.epsWithoutNRI || 0,
            pe_without_nri: data.peWithoutNRI || 0,
            growth_rate: data.epsGrowthRate || 0,
            peg_ratio_without_nri: data.pegRatio || 0,
          };

        case 'PSG Ratio':  // ✅ FIXED: bate com addMethod
          return {
            method: 'psg',
            fair_psg_ratio: 0.2,  // ✅ DEFAULT EDITÁVEL
            last_price: data.currentPrice || 0,
            sales_per_share: data.salesPerShare || 0,
            ps_ratio: data.psRatio || 0,
            growth_rate: data.revenueGrowthRate || 0,
            psg_ratio: data.psgRatio || 0,
          };

        case 'P/TBV Mean 5Y':  // AGENT 1C: Banks valuation
          return {
            method: 'p-tbv-mean',
            mean_ptbv_ratio_5y: data.benchmarkPTBV || 0,
            tangible_book_value_per_share: data.tangibleBookValuePerShare || 0,
            current_price: data.currentPrice || 0,
            current_ptbv: data.currentPTBV || 0,
            // Historical ratios (read-only)
            ptbv_ratios: data.historicalPTBV || [],
            // TBV components
            total_equity_musd: (data.totalEquity || 0) / 1_000_000,
            intangible_assets_musd: (data.intangibleAssets || 0) / 1_000_000,
            goodwill_musd: (data.goodwill || 0) / 1_000_000,
            tangible_book_value_musd: (data.tangibleBookValue || 0) / 1_000_000,
            shares_outstanding_m: (data.sharesOutstanding || 0) / 1_000_000,
          };

        case 'P/TBV Sector':  // AGENT 1C: Banks sector benchmark
          return {
            method: 'p-tbv-sector',
            sector_avg_ptbv: data.benchmarkPTBV || 0,
            tangible_book_value_per_share: data.tangibleBookValuePerShare || 0,
            current_price: data.currentPrice || 0,
            current_ptbv: data.currentPTBV || 0,
            sector: data.sector || 'Financial Services',
            bank_type: data.bankType || 'large',
            // TBV components
            total_equity_musd: (data.totalEquity || 0) / 1_000_000,
            intangible_assets_musd: (data.intangibleAssets || 0) / 1_000_000,
            goodwill_musd: (data.goodwill || 0) / 1_000_000,
            tangible_book_value_musd: (data.tangibleBookValue || 0) / 1_000_000,
            shares_outstanding_m: (data.sharesOutstanding || 0) / 1_000_000,
          };

        case 'FFO (REITs)':  // AGENT 1D: REITs FFO valuation
          return {
            method: 'ffo-reit',
            ffo_per_share: data.ffoPerShare || 0,
            sector_avg_p_ffo: data.sectorAvgPFFO || 0,
            current_p_ffo: data.currentPFFO || 0,
            current_price: data.currentPrice || 0,
            subsector: data.subsector || 'diversified',
            // FFO components
            net_income_musd: data.netIncome || 0,
            depreciation_amortization_musd: data.depreciationAndAmortization || 0,
            ffo_musd: data.ffo || 0,
          };

        case 'AFFO (REITs)':  // AGENT 1D: REITs AFFO valuation
          return {
            method: 'affo-reit',
            affo_per_share: data.affoPerShare || 0,
            sector_avg_p_affo: data.sectorAvgPAFFO || 0,
            current_p_affo: data.currentPAFFO || 0,
            current_price: data.currentPrice || 0,
            subsector: data.subsector || 'diversified',
            // AFFO components
            ffo_musd: data.ffo || 0,
            recurring_capex_musd: data.recurringCapex || 0,
            affo_musd: data.affo || 0,
          };

        case 'P/FFO Mean':  // AGENT 1D: REITs historical P/FFO
          return {
            method: 'p-ffo-mean',
            mean_p_ffo_5y: data.meanPFFO5Y || 0,
            ffo_per_share: data.ffoPerShare || 0,
            current_price: data.currentPrice || 0,
            current_p_ffo: data.currentPFFO || 0,
            subsector: data.subsector || 'diversified',
            // Historical P/FFO ratios
            historical_p_ffo: data.historicalPFFO || [],
          };

        case 'P/FFO Sector':  // AGENT 1D: REITs sector benchmark
          return {
            method: 'p-ffo-sector',
            sector_avg_p_ffo: data.sectorAvgPFFO || 0,
            ffo_per_share: data.ffoPerShare || 0,
            current_price: data.currentPrice || 0,
            current_p_ffo: data.currentPFFO || 0,
            subsector: data.subsector || 'diversified',
          };

        case 'Dividend Yield (REITs)':  // AGENT 1D: REITs dividend discount
          return {
            method: 'dividend-yield-reit',
            annual_dividend_per_share: data.annualDividendPerShare || 0,
            required_yield: data.requiredYield || 0,
            current_yield: data.currentYield || 0,
            current_price: data.currentPrice || 0,
            subsector: data.subsector || 'diversified',
            dividend_growth_rate: data.dividendGrowthRate || 0,
            payout_ratio: data.payoutRatio || 0,
          };

        case 'Graham Number':  // SUB-FASE 2D: Benjamin Graham's formula
          return {
            method: 'Graham Number',
            eps_ttm: data.eps || 0,
            book_value_per_share: data.bookValuePerShare || 0,
            current_price: data.currentPrice || 0,
          };

        case 'DDM':  // SUB-FASE 2D: Dividend Discount Model
          return {
            method: 'DDM',
            annual_dividend: data.annualDividend || 0,
            dividend_growth_rate: data.dividendGrowthRate || 0,
            discount_rate: data.discountRate || 0.10,
            payout_ratio: data.payoutRatio || 0,
            current_price: data.currentPrice || 0,
            warning: data.warning,
          };

        case 'Growth DCF 8Y':  // FASE 2C: 8-year high-growth DCF for growth stocks
          return {
            method: 'growth-dcf-8y',
            based_on: 'fcf',
            // ✅ FIX: Map from GrowthDCF8YResponse top-level fields (not data.inputs)
            fcf_ttm_musd: data.fcf || 0,
            total_debt_musd: data.totalDebt || 0,
            cash_musd: data.cash || 0,
            discount_rate: data.wacc || 0.0627,
            shares_outstanding_m: data.sharesOutstanding || 0,
            // ✅ FIX: Map from GrowthDCF8YResponse top-level growth fields
            growth_rate_y1_3: data.growthY1_3 || 0,
            growth_rate_y4_6: data.growthY4_6 || 0,
            growth_rate_y7_8: data.growthY7_8 || 0,
            deduct_debt: true,
            add_cash: true,
          };

        default:
          return null;
      }
    }

    /**
     * Map display names to frontend method IDs
     * Ensures consistent lookup between backend and frontend
     */
    function getMethodId(methodName: string): string {
      const mapping: Record<string, string> = {
        'AlfaValue™': 'alfavalue',
        'DCF-20 Free Cash Flow': 'dcf-20-fcf',
        'DCF-20 Operating Cash Flow': 'dcf-20-ocf',
        'DCF-20 Net Income': 'dcf-20-ni',
        'DNI-20 Net Income': 'dni-20',
        'DNI-20 NI': 'dni-20',
        'DFCF Terminal (FMP)': 'dfcf-terminal',
        'DFCF Terminal': 'dfcf-terminal',
        'DFCF-20 (FMP)': 'dfcf-20',
        'DCF-20 FCF FMP': 'dcf-20-fcf',
        'DCF Terminal FCF FMP': 'dcf-terminal-fcf',
        'P/E Mean 5Y': 'pe-mean',
        'P/E Mean 5y': 'pe-mean',
        'P/E Mean 5Y (without NRI)': 'pe-mean-without-nri',
        'P/E Mean without NRI': 'pe-mean-without-nri',
        'P/S Mean 5Y': 'ps-mean',
        'P/S Mean 5y': 'ps-mean',
        'P/B Mean 5Y': 'pb-mean',
        'P/B Mean 5y': 'pb-mean',
        'P/B Mean 5Y (without NRI)': 'pb-mean-without-nri',
        'P/B Mean without NRI': 'pb-mean-without-nri',
        'PEG Ratio': 'peg',
        'PSG Ratio': 'psg',
        'P/TBV Mean 5Y': 'p-tbv-mean',       // AGENT 1C: Banks
        'P/TBV Sector': 'p-tbv-sector',      // AGENT 1C: Banks
        'Growth DCF 8Y': 'growth-dcf-8y',    // FASE 2C: Growth stocks
      };
      return mapping[methodName] || methodName.toLowerCase().replace(/\s+/g, '-');
    }

    // Helper to add method with failure tracking
    const addMethod = (
      result: PromiseSettledResult<any>,
      name: string,
      methodId: MethodId,
      category: 'proprietary' | 'dcf' | 'multiples' | 'growth',
      formula: string,
      source: 'internal' | 'fmp' | 'hybrid',
      extractIV: (data: any) => number | null
    ) => {
      try {
        if (methodId === 'growth-dcf-8y') {
          logger.info(
            `[addMethod] growth-dcf-8y: status=${result.status}, ` +
            `hasValue=${!!result.value}, valueKeys=${result.value ? Object.keys(result.value).join(',') : 'N/A'}`
          );
        }
        if (result.status === 'fulfilled' && result.value) {
          const rawIV = extractIV(result.value);
          if (methodId === 'growth-dcf-8y') {
            logger.info(`[addMethod] growth-dcf-8y: extractIV returned ${rawIV}`);
          }
          if (rawIV && rawIV > 0 && isFinite(rawIV)) {
            const adjustedIV = macroService.applyMultiplier(rawIV, macroMultiplier);
            const discount_pct = ((adjustedIV - price) / price) * 100;

            methods.push({
              name,
              method_id: getMethodId(name),  // ✅ FASE 3.2 FIX: Frontend lookup ID
              category,
              iv: adjustedIV,
              discount_pct,
              formula,
              confidence: result.value.confidence || 'MED',
              source,
              as_of: result.value.as_of || new Date().toISOString().split('T')[0],
              inputs: getInputsForMethod(name, result.value, ticker),  // ✅ FASE 3 FIX
            });
          } else {
            // Method returned invalid/zero IV
            failedMethods.push({
              method_id: methodId,
              method_name: name,
              reason: determineFailureReason(name, result.value, sector),
              error_code: 'NO_DATA',
            });
          }
        } else if (result.status === 'rejected') {
          // Promise rejected (API error, network error, etc.)
          failedMethods.push({
            method_id: methodId,
            method_name: name,
            reason: result.reason?.message || FAILURE_REASONS.API_ERROR,
            error_code: 'API_ERROR',
          });
        } else {
          // Fulfilled but returned null/undefined
          failedMethods.push({
            method_id: methodId,
            method_name: name,
            reason: FAILURE_REASONS.INSUFFICIENT_DATA,
            error_code: 'NO_DATA',
          });
        }
      } catch (error: any) {
        // Catch any unexpected errors in processing
        failedMethods.push({
          method_id: methodId,
          method_name: name,
          reason: error.message || FAILURE_REASONS.CALCULATION_ERROR,
          error_code: 'CALCULATION_ERROR',
        });
      }
    };

    /**
     * Determine specific failure reason based on method type and data
     */
    const determineFailureReason = (methodName: string, data: any, sector?: string): string => {
      // REIT-specific incompatibilities
      if (sector === 'Real Estate') {
        if (methodName.includes('P/E')) return FAILURE_REASONS.REIT_INCOMPATIBLE;
        if (methodName.includes('P/B')) return FAILURE_REASONS.REIT_INCOMPATIBLE;
        if (methodName.includes('PEG')) return FAILURE_REASONS.REIT_INCOMPATIBLE;
      }

      // Method-specific reasons
      if (methodName.includes('DDM') || methodName.includes('Dividend')) {
        return FAILURE_REASONS.NO_DIVIDEND;
      }

      if (methodName.includes('P/E') || methodName.includes('PEG')) {
        if (data?.eps !== undefined && data.eps <= 0) {
          return FAILURE_REASONS.NEGATIVE_EARNINGS;
        }
        return FAILURE_REASONS.INSUFFICIENT_DATA;
      }

      if (methodName.includes('FCF') || methodName.includes('DFCF')) {
        return FAILURE_REASONS.NO_FCF;
      }

      if (methodName.includes('OCF')) {
        return FAILURE_REASONS.NO_OCF;
      }

      if (methodName.includes('DNI') || methodName.includes('Net Income')) {
        if (data?.netIncome !== undefined && data.netIncome <= 0) {
          return FAILURE_REASONS.NEGATIVE_EARNINGS;
        }
        return FAILURE_REASONS.NO_NET_INCOME;
      }

      if (methodName.includes('P/B')) {
        if (data?.bookValuePerShare !== undefined && data.bookValuePerShare <= 0) {
          return FAILURE_REASONS.NEGATIVE_BOOK_VALUE;
        }
        return FAILURE_REASONS.INSUFFICIENT_DATA;
      }

      if (methodName.includes('P/S') || methodName.includes('PSG')) {
        return FAILURE_REASONS.NO_SALES;
      }

      // Generic fallback
      return FAILURE_REASONS.INSUFFICIENT_DATA;
    };

    // Add all methods (with MethodId for failure tracking)
    addMethod(
      alfaValue,
      'AlfaValue™',
      'alfa-value',
      'proprietary',
      'FCF → PV(g1-5, g6-10, g11-20, DR) + Cash - Debt',
      'internal',
      (data) => data.iv
    );

    addMethod(
      dcfFCF,
      'DCF-20 FCF FMP',
      'dcf-fcf-20',
      'dcf',
      'FMP 10y FCF projection (unlevered)',
      'fmp',
      (data) => data.dcf
    );

    addMethod(
      dcfTermFCF,
      'DCF Terminal FCF FMP',
      'dcf-terminal-fcf',
      'dcf',
      'FMP Terminal Value (Gordon Growth)',
      'fmp',
      (data) => data.dcf
    );

    addMethod(
      peMean,
      'P/E Mean 5y',
      'pe-mean',
      'multiples',
      'Mean(P/E���������) � EPS_TTM',
      'internal',
      (data) => data.iv
    );

    addMethod(
      psMean,
      'P/S Mean 5y',
      'ps-mean',
      'multiples',
      'Mean(P/S���������) � Sales_per_Share_TTM',
      'internal',
      (data) => data.iv
    );

    addMethod(
      pbMean,
      'P/B Mean 5y',
      'pb-mean',
      'multiples',
      'Mean(P/B���������) � Book_Value_per_Share_TTM',
      'internal',
      (data) => data.iv
    );

    addMethod(
      pbMeanNoNRI,
      'P/B Mean without NRI',
      'pb-mean-without-nri',
      'multiples',
      'Mean(P/B_5y_adj) × Adjusted_BVPS_TTM',
      'internal',
      (data) => data.iv
    );

    addMethod(
      peg,
      'PEG Ratio',
      'peg',
      'growth',
      'Fair_PEG (1.5) � Growth% � EPS_TTM',
      'internal',
      (data) => data.iv
    );

    addMethod(
      psg,
      'PSG Ratio',
      'psg',
      'growth',
      'Fair_PSG (0.2) � Revenue_CAGR_3y � Sales_per_Share_TTM',
      'internal',
      (data) => data.iv
    );

    // NEW METHODS - FASE 3.1
    addMethod(
      dni20,
      'DNI-20 NI',
      'dni-20',
      'dcf',
      'Σ(NI_t / (1 + WACC)^t) + Cash - Debt',
      'internal',
      (data) => data?.iv ?? data  // Support both new rich object and legacy number
    );

    addMethod(
      peMeanNoNRI,
      'P/E Mean without NRI',
      'pe-mean-without-nri',
      'multiples',
      'Mean(P/E_5y_adj) × Adjusted_EPS_TTM',
      'internal',
      (data) => data.iv
    );

    addMethod(
      dfcfTerminal,
      'DFCF Terminal',
      'dfcf-terminal',
      'dcf',
      '3-Stage DCF: PV(Stage1) + PV(Stage2) + PV(Terminal) + Cash - Debt',
      'internal',
      (data) => data?.iv ?? data  // Support both new rich object and legacy number
    );

    // AGENT 1C: P/TBV Methods for Banks (Financial Services sector)
    addMethod(
      ptbvMean,
      'P/TBV Mean 5Y',
      'p-tbv-mean',
      'multiples',
      'Mean(P/TBV_5y) × Tangible_Book_Value_per_Share',
      'internal',
      (data) => data.iv
    );

    addMethod(
      ptbvSector,
      'P/TBV Sector',
      'p-tbv-sector',
      'multiples',
      'Sector_Avg_P/TBV × Tangible_Book_Value_per_Share',
      'internal',
      (data) => data.iv
    );

    // AGENT 1D: REIT Methods for Real Estate sector
    addMethod(
      ffoREIT,
      'FFO (REITs)',
      'ffo-reit',
      'multiples',
      'Sector_Avg_P/FFO × FFO_per_Share (NAREIT standard)',
      'internal',
      (data) => data.iv
    );

    addMethod(
      affoREIT,
      'AFFO (REITs)',
      'affo-reit',
      'multiples',
      'Sector_Avg_P/AFFO × AFFO_per_Share (adjusted for recurring capex)',
      'internal',
      (data) => data.iv
    );

    addMethod(
      pFFOMean,
      'P/FFO Mean',
      'p-ffo-mean',
      'multiples',
      'Mean(P/FFO_5y) × FFO_per_Share',
      'internal',
      (data) => data.iv
    );

    addMethod(
      pFFOSector,
      'P/FFO Sector',
      'p-ffo-sector',
      'multiples',
      'Sector_Avg_P/FFO × FFO_per_Share (REIT subsector benchmark)',
      'internal',
      (data) => data.iv
    );

    addMethod(
      dividendYieldREIT,
      'Dividend Yield (REITs)',
      'dividend-yield-reit',
      'multiples',
      'Annual_Dividend ÷ Required_Yield (dividend discount model)',
      'internal',
      (data) => data.iv
    );

    // SUB-FASE 2D: Value stocks methods
    addMethod(
      grahamNumber,
      'Graham Number',
      'graham-number',
      'multiples',
      '√(22.5 × EPS × Book_Value_per_Share) - Benjamin Graham formula',
      'internal',
      (data) => data.iv
    );

    addMethod(
      ddm,
      'DDM',
      'ddm',
      'multiples',
      'Dividend ÷ (Discount_Rate - Growth_Rate) - Gordon Growth Model',
      'internal',
      (data) => data.iv
    );

    // FASE 2C: Growth stock method (dynamic - only for growth stocks)
    logger.info(
      `[IV-Chart] ${ticker} checking growth method condition: ` +
      `isGrowth=${isGrowth}, growthDCF8Y=${!!growthDCF8Y}, ` +
      `condition=${isGrowth && growthDCF8Y ? 'TRUE' : 'FALSE'}`
    );
    if (isGrowth && growthDCF8Y) {
      logger.info(`[IV-Chart] ${ticker} adding growth-dcf-8y to methods array`);
      addMethod(
        growthDCF8Y,
        'Growth DCF 8Y',
        'growth-dcf-8y',
        'dcf',
        '8Y high-growth DCF: PV(Y1-3: 30-50%, Y4-6: 20-30%, Y7-8: 10-15%)',
        'internal',
        (data) => data.iv
      );
      logger.info(`[IV-Chart] ${ticker} growth-dcf-8y added, methods.length=${methods.length}`);
    }

    // 5. Build response with failedMethods transparency
    // FASE 2 FIX: Add available_methods and stock_classification for dynamic frontend dropdown
    // P0 FIX #3 (2025-11-04): Derive available_methods from methodIds (attempted), not methods (successful)
    // BUG: When all methods fail, methods.length=0 → available_methods=[] (broken UX)
    // FIX: Use methodIds array which contains ALL attempted methods (before filtering)
    const availableMethods = methodIds.map(id => {
      // Map MethodId to frontend method_id format (same as getMethodId helper)
      const mapping: Record<string, string> = {
        'alfa-value': 'alfavalue',
        'dcf-fcf-20': 'dcf-20-fcf',
        'dcf-terminal-fcf': 'dcf-terminal-fcf',
        'dni-20': 'dni-20',
        'pe-mean': 'pe-mean',
        'pe-mean-without-nri': 'pe-mean-without-nri',
        'ps-mean': 'ps-mean',
        'pb-mean': 'pb-mean',
        'pb-mean-without-nri': 'pb-mean-without-nri',
        'peg': 'peg',
        'psg': 'psg',
        'dfcf-terminal': 'dfcf-terminal',
        'p-tbv-mean': 'p-tbv-mean',
        'p-tbv-sector': 'p-tbv-sector',
        'ffo-reit': 'ffo-reit',
        'affo-reit': 'affo-reit',
        'p-ffo-mean': 'p-ffo-mean',
        'p-ffo-sector': 'p-ffo-sector',
        'dividend-yield-reit': 'dividend-yield-reit',
        'graham-number': 'graham-number',
        'ddm': 'ddm',
        'growth-dcf-8y': 'growth-dcf-8y',
      };
      return mapping[id] || id;
    });
    // CRITICAL FIX: Classification order - check most specific categories FIRST
    // Wrong order (growth first): JPM (bank with growth) → misclassified as 'growth'
    // Correct order (specific to general): bank → REIT → growth → value
    const stockClassification = isBankStock ? 'bank' : isReitStock ? 'reit' : isGrowth ? 'growth' : 'value';

    const response: IVChartResponse = {
      ticker,
      price,
      methods: methods.sort((a, b) => {
        // Sort by category: proprietary > dcf > multiples > growth
        const order = { proprietary: 0, dcf: 1, multiples: 2, growth: 3 };
        return order[a.category] - order[b.category];
      }),
      available_methods: availableMethods, // NEW: Dynamic list of method IDs for frontend dropdown
      stock_classification: stockClassification, // NEW: Stock type classification (growth/value/bank/reit)
      failedMethods,
      macro_multiplier: macroMultiplier,
      macro_sentiment: macroSentiment,
      as_of: new Date().toISOString().split('T')[0],
    };

    // ONDA 1 FIX: Method count validation and detailed failure reporting
    // THRESHOLD RELAX (2025-10-29): Lowered from 8 to 6 to recover +26 stocks
    // Rationale: 6 methods still provide meaningful valuation triangulation
    // (e.g., stocks missing P/S, PEG due to negative sales/growth but have solid DCF/P/E/P/B)
    const expectedMinMethods = 6; // Minimum expected methods per stock (relaxed from 8)
    logger.info(
      `[IVChart] ${ticker}: Generated ${methods.length} methods ` +
      `(${failedMethods.length} failed, ${methods.length + failedMethods.length} total)`
    );

    if (methods.length < expectedMinMethods) {
      logger.warn(
        `[IV-Chart] ${ticker}: LOW METHOD COUNT - Only ${methods.length}/${expectedMinMethods} expected methods`
      );
      logger.warn(
        `[IV-Chart] ${ticker}: Successful methods: ${methods.map(m => m.method_id).join(', ')}`
      );
      logger.warn(
        `[IV-Chart] ${ticker}: Failed methods (${failedMethods.length}): ` +
        failedMethods.map(f => `${f.method_id} (${f.reason})`).join(', ')
      );
    }

    // Save to Redis cache with 24h TTL
    try {
      const TTL_24H = 86400; // 24 hours in seconds
      await redisCacheService.set(cacheKey, response, TTL_24H);
      logger.info(`[IV Chart] Cached ${ticker} for 24h (key: ${cacheKey})`);
    } catch (cacheError) {
      // Cache save failure shouldn't block the response
      logger.error(`[IV Chart] Cache save error for ${ticker}:`, cacheError);
    }

    res.json(response);
  } catch (error: any) {
    logger.error('[IVChart] Error generating chart:', error);
    res.status(500).json({ error: 'Failed to generate IV chart', details: error.message });
  }
}

/**
 * Helper: Get company profile for sector classification
 * Used by growth rate estimator for sector-specific caps
 */
async function getCompanyProfile(ticker: string): Promise<{
  sector?: string;
  beta?: number;
  industry?: string;
  companyName?: string;
} | null> {
  try {
    const upperTicker = ticker.toUpperCase();
    const cacheKey = `profile:full:${upperTicker}`;

    const cached = await redisCacheService.get<{
      sector?: string;
      beta?: number;
      industry?: string;
      companyName?: string;
    }>(cacheKey);
    if (cached) {
      return cached;
    }

    // Try FMP first
    try {
      const url = `${FMP_BASE_URL}/api/v3/profile/${upperTicker}?apikey=${FMP_API_KEY}`;
      const response = await axios.get(url, {
        timeout: 10000,
        headers: { 'Accept-Encoding': 'gzip' }
      });

      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        const profileData = response.data[0];
        const result = {
          sector: profileData.sector,
          beta: profileData.beta,
          industry: profileData.industry,
          companyName: profileData.companyName
        };

        // Cache for 7 days (profile data rarely changes)
        await redisCacheService.set(cacheKey, result, 604800);
        return result;
      }
    } catch (error) {
      logger.warn(`[IVChart] FMP profile failed for ${upperTicker}, trying Alpha Vantage fallback`);
    }

    // Fallback to Alpha Vantage
    if (ALPHA_VANTAGE_API_KEY) {
      try {
        const avUrl = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${upperTicker}&apikey=${ALPHA_VANTAGE_API_KEY}`;
        const avResponse = await axios.get(avUrl, {
          timeout: 10000,
          headers: { 'Accept-Encoding': 'gzip' }
        });

        if (avResponse.data && avResponse.data.Sector) {
          const result = {
            sector: avResponse.data.Sector,
            beta: parseFloat(avResponse.data.Beta) || undefined,
            industry: avResponse.data.Industry,
            companyName: avResponse.data.Name
          };

          // Cache for 7 days
          await redisCacheService.set(cacheKey, result, 604800);
          logger.info(`[IVChart] Alpha Vantage fallback successful for ${upperTicker}`);
          return result;
        }
      } catch (error) {
        logger.error(`[IVChart] Alpha Vantage fallback also failed for ${upperTicker}`);
      }
    }

    logger.warn(`[IVChart] Both FMP and Alpha Vantage failed for ${upperTicker}`);
    return null;
  } catch (error) {
    logger.error(`[IVChart] Unexpected error fetching profile for ${ticker}:`, error);
    return null;
  }
}

/**
 * GET /api/macro/multiplier
 *
 * Returns current macro multiplier and sentiment
 *
 * Query params:
 * - region: 'US' | 'EU' | etc (default: 'US')
 */
export async function getMacroMultiplier(req: Request, res: Response): Promise<void> {
  try {
    const region = (req.query.region as any) || 'US';

    const macroData = await macroService.getMacroMultiplier(region);

    res.json(macroData);
  } catch (error: any) {
    logger.error('[MacroMultiplier] Error fetching multiplier:', error);
    res.status(500).json({ error: 'Failed to fetch macro multiplier', details: error.message });
  }
}
