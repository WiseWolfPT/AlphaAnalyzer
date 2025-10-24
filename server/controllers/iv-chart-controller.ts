/**
 * IV Chart Controller - FASE 3 + ONDA 1.2
 *
 * Consolidates all valuation methods (10+) for charting and comparison:
 * - 1 Proprietary: AlfaValue"
 * - 4 DCF External: FMP benchmarks (NOW with dynamic growth rates)
 * - 3 Multiples: P/E, P/S, P/B Mean 5y
 * - 2 Growth: PEG, PSG
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
import { methodCacheService } from '../services/method-cache-service';
import { estimateGrowthRates } from '../utils/growth-rate-estimator';
import { isETF, getETFReason } from '../utils/stock-classifier';
import axios from 'axios';
import {
  IVChartResponse,
  ValuationMethod,
  DCFBaseMetric,
  MethodId,
} from '../types/valuation';

const FMP_BASE_URL = 'https://financialmodelingprep.com';
const FMP_API_KEY = process.env.FMP_API_KEY || '';

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
    const ticker = req.params.ticker?.toUpperCase();
    const basedOn = (req.query.based_on as DCFBaseMetric) || 'fcf';

    if (!ticker) {
      res.status(400).json({ error: 'Ticker symbol required' });
      return;
    }

    // ONDA 4.1: Enhanced ETF Detection - Get company profile first for comprehensive check
    const companyProfile = await getCompanyProfile(ticker);

    // ETF Detection with 4 strategies (suffix, known list, API type, name pattern)
    if (isETF(ticker, companyProfile)) {
      const reason = getETFReason(ticker, companyProfile);
      logger.info(`[IV Chart] Rejected ETF request: ${ticker} (${reason})`);
      res.status(400).json({
        error: 'ETF_NOT_SUPPORTED',
        message: `${ticker} is an ETF. Intrinsic value calculations are only available for individual stocks.`,
        reason,
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

    logger.info(`[IVChart] Generating chart for ${ticker} (based_on: ${basedOn})`);

    // 1. Get current price
    const price = await valuationService['getCurrentPrice'](ticker);
    if (!price || price <= 0) {
      res.status(404).json({ error: `No price data found for ${ticker}` });
      return;
    }

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

    // 6. Calculate all 14 methods in parallel using method-level cache (ONDA 7)
    logger.info(`[IV-Chart] Using method-level cache for ${ticker}`);

    const methodIds: MethodId[] = [
      'alfa-value',
      'dcf-fcf-20',
      'dcf-fcfe-20',
      'dcf-terminal-fcf',
      'dcf-terminal-fcfe',
      'dni-20',
      'pe-mean',
      'pe-mean-without-nri',
      'ps-mean',
      'pb-mean',
      'pb-mean-without-nri',
      'peg',
      'psg',
      'dfcf-terminal',
    ];

    const [
      alfaValue,
      dcfFCF,
      dcfFCFE,
      dcfTermFCF,
      dcfTermFCFE,
      dni20,
      peMean,
      peMeanNoNRI,
      psMean,
      pbMean,
      pbMeanNoNRI,
      peg,
      psg,
      dfcfTerminal,
    ] = await Promise.allSettled(
      methodIds.map((id: MethodId) => methodCacheService.warmMethod(ticker, id).then(result => {
        // Attach growth rates for DCF methods
        if (['dcf-fcf-20', 'dcf-fcfe-20', 'dcf-terminal-fcf', 'dcf-terminal-fcfe'].includes(id)) {
          if (result) (result as any).growthRates = growthRates;
        }
        return result;
      }))
    );

    // 4. Build methods array
    const methods: ValuationMethod[] = [];

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
        case 'DCF-20 FCFE FMP':
          return {
            method: 'dcf-20',
            based_on: methodName.includes('FCFE') ? 'fcfe' : 'fcf',
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

        case 'DCF Terminal FCFE FMP':
          return {
            method: 'dcf-20-terminal',
            based_on: 'fcfe',
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
        'DCF-20 FCFE FMP': 'dcf-20-fcfe',
        'DCF Terminal FCF FMP': 'dcf-terminal-fcf',
        'DCF Terminal FCFE FMP': 'dcf-terminal-fcfe',
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
      };
      return mapping[methodName] || methodName.toLowerCase().replace(/\s+/g, '-');
    }

    // Helper to add method
    const addMethod = (
      result: PromiseSettledResult<any>,
      name: string,
      category: 'proprietary' | 'dcf' | 'multiples' | 'growth',
      formula: string,
      source: 'internal' | 'fmp' | 'hybrid',
      extractIV: (data: any) => number | null
    ) => {
      if (result.status === 'fulfilled' && result.value) {
        const rawIV = extractIV(result.value);
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
        }
      }
    };

    // Add all methods
    addMethod(
      alfaValue,
      'AlfaValue™',
      'proprietary',
      'FCF → PV(g1-5, g6-10, g11-20, DR) + Cash - Debt',
      'internal',
      (data) => data.iv
    );

    addMethod(
      dcfFCF,
      'DCF-20 FCF FMP',
      'dcf',
      'FMP 10y FCF projection (unlevered)',
      'fmp',
      (data) => data.dcf
    );

    addMethod(
      dcfFCFE,
      'DCF-20 FCFE FMP',
      'dcf',
      'FMP 10y FCFE projection (levered)',
      'fmp',
      (data) => data.dcf
    );

    addMethod(
      dcfTermFCF,
      'DCF Terminal FCF FMP',
      'dcf',
      'FMP Terminal Value (Gordon Growth)',
      'fmp',
      (data) => data.dcf
    );

    addMethod(
      dcfTermFCFE,
      'DCF Terminal FCFE FMP',
      'dcf',
      'FMP Terminal Value Levered',
      'fmp',
      (data) => data.dcf
    );

    addMethod(
      peMean,
      'P/E Mean 5y',
      'multiples',
      'Mean(P/E���������) � EPS_TTM',
      'internal',
      (data) => data.iv
    );

    addMethod(
      psMean,
      'P/S Mean 5y',
      'multiples',
      'Mean(P/S���������) � Sales_per_Share_TTM',
      'internal',
      (data) => data.iv
    );

    addMethod(
      pbMean,
      'P/B Mean 5y',
      'multiples',
      'Mean(P/B���������) � Book_Value_per_Share_TTM',
      'internal',
      (data) => data.iv
    );

    addMethod(
      pbMeanNoNRI,
      'P/B Mean without NRI',
      'multiples',
      'Mean(P/B_5y_adj) × Adjusted_BVPS_TTM',
      'internal',
      (data) => data.iv
    );

    addMethod(
      peg,
      'PEG Ratio',
      'growth',
      'Fair_PEG (1.5) � Growth% � EPS_TTM',
      'internal',
      (data) => data.iv
    );

    addMethod(
      psg,
      'PSG Ratio',
      'growth',
      'Fair_PSG (0.2) � Revenue_CAGR_3y � Sales_per_Share_TTM',
      'internal',
      (data) => data.iv
    );

    // NEW METHODS - FASE 3.1
    addMethod(
      dni20,
      'DNI-20 NI',
      'dcf',
      'Σ(NI_t / (1 + WACC)^t) + Cash - Debt',
      'internal',
      (data) => data?.iv ?? data  // Support both new rich object and legacy number
    );

    addMethod(
      peMeanNoNRI,
      'P/E Mean without NRI',
      'multiples',
      'Mean(P/E_5y_adj) × Adjusted_EPS_TTM',
      'internal',
      (data) => data.iv
    );

    addMethod(
      dfcfTerminal,
      'DFCF Terminal',
      'dcf',
      '3-Stage DCF: PV(Stage1) + PV(Stage2) + PV(Terminal) + Cash - Debt',
      'internal',
      (data) => data?.iv ?? data  // Support both new rich object and legacy number
    );

    // 5. Build response
    const response: IVChartResponse = {
      ticker,
      price,
      methods: methods.sort((a, b) => {
        // Sort by category: proprietary > dcf > multiples > growth
        const order = { proprietary: 0, dcf: 1, multiples: 2, growth: 3 };
        return order[a.category] - order[b.category];
      }),
      macro_multiplier: macroMultiplier,
      macro_sentiment: macroSentiment,
      as_of: new Date().toISOString().split('T')[0],
    };

    logger.info(`[IVChart] ${ticker}: Generated ${methods.length} methods`);

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
async function getCompanyProfile(ticker: string): Promise<{ sector?: string } | null> {
  try {
    const upperTicker = ticker.toUpperCase();
    const cacheKey = `profile:sector:${upperTicker}`;

    const cached = await redisCacheService.get<{ sector?: string }>(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch from FMP
    const url = `${FMP_BASE_URL}/api/v3/profile/${upperTicker}?apikey=${FMP_API_KEY}`;
    const response = await axios.get(url, {
      timeout: 10000,
      headers: { 'Accept-Encoding': 'gzip' }
    });

    if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
      return null;
    }

    const result = { sector: response.data[0].sector };

    // Cache for 7 days (sector rarely changes)
    await redisCacheService.set(cacheKey, result, 604800);
    return result;
  } catch (error) {
    logger.warn(`[IVChart] Could not fetch profile for ${ticker}:`, error);
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
