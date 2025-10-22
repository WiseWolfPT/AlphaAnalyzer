/**
 * IV Chart Controller - FASE 3
 *
 * Consolidates all valuation methods (10+) for charting and comparison:
 * - 1 Proprietary: AlfaValue"
 * - 4 DCF External: FMP benchmarks
 * - 3 Multiples: P/E, P/S, P/B Mean 5y
 * - 2 Growth: PEG, PSG
 *
 * Applies macro multiplier to all IVs and calculates discount percentages
 */

import { Request, Response } from 'express';
import { valuationService } from '../services/valuation-service';
import { fmpDCFService } from '../services/fmp-dcf';
import { macroService } from '../services/macro-service';
import { logger } from '../lib/logger';
import {
  IVChartResponse,
  ValuationMethod,
  DCFBaseMetric,
} from '../types/valuation';

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

    // 3. Get base metric if "based_on" is specified (GAP #3)
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

    // 4. Calculate all 17 methods in parallel (15 valid + 2 FCFE variants)
    const [
      alfaValue,
      dcfFCF,
      dcfFCFE,
      dcfTermFCF,
      dcfTermFCFE,
      dni20,
      peMean,
      peMeanNoNRI,
      peMedian,
      peMedianNoNRI,
      psMean,
      psMedian,
      pbMean,
      pbMeanNoNRI,
      pbMedian,
      pbMedianNoNRI,
      peg,
      psg,
      dfcfTerminal,
    ] = await Promise.allSettled([
      // Proprietary
      valuationService.getAlfaValue(ticker),
      // DCF External
      fmpDCFService.getDCF_FCF_EXT(ticker),
      fmpDCFService.getDCF_FCFE_EXT(ticker),
      fmpDCFService.getDCF_TERM_EXT(ticker),
      fmpDCFService.getDCF_TERM_FCFE_EXT(ticker),
      // DCF Internal - NEW
      valuationService.calculateDNI20(ticker),
      // Multiples - Mean
      valuationService.calculatePEMean5Y(ticker),
      valuationService.calculatePEMeanWithoutNRI(ticker),
      valuationService.calculatePEMedian5Y(ticker),
      valuationService.calculatePEMedianWithoutNRI(ticker),
      valuationService.calculatePSMean5Y(ticker),
      valuationService.calculatePSMedian5Y(ticker),
      valuationService.calculatePBMean5Y(ticker),
      valuationService.calculatePBMeanWithoutNRI(ticker),
      valuationService.calculatePBMedian5Y(ticker),
      valuationService.calculatePBMedianWithoutNRI(ticker),
      // Growth
      valuationService.calculatePEG(ticker),
      valuationService.calculatePSG(ticker),
      // Terminal Value - NEW
      valuationService.calculateDFCFTerminal(ticker),
    ]);

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
        case 'AlfaValue"':  // ✅ FIXED: nome correto usado em addMethod
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
            // Growth rates não disponíveis no FMP, usar defaults
            growth_rate_y1_5: 0,
            growth_rate_y6_10: 0,
            growth_rate_y11_20: 0,
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
            // Growth rates não disponíveis no FMP, usar defaults
            growth_rate_y1_5: 0,
            growth_rate_y6_10: 0,
            growth_rate_y11_20: 0,
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
            // Growth rates não disponíveis no FMP, usar defaults
            growth_rate_y1_5: 0,
            growth_rate_y6_10: 0,
            growth_rate_y11_20: 0,
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

        case 'P/E Median 5y':  // ✅ FIXED: bate com addMethod
        case 'P/E Median without NRI':  // ✅ FIXED: bate com addMethod
          return {
            method: 'pe-median',
            exclude_nri: methodName.includes('without NRI'),
            median_pe_ratio_5y: data.medianPE || 0,
            current_price: data.currentPrice || 0,
            eps_ttm: data.eps || 0,
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

        case 'P/S Median 5y':  // ✅ FIXED: bate com addMethod
          return {
            method: 'ps-median',
            median_ps_ratio_5y: data.medianPS || 0,
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

        case 'P/B Median 5y':  // ✅ FIXED: bate com addMethod
        case 'P/B Median without NRI':  // ✅ FIXED: bate com addMethod
          return {
            method: 'pb-median',
            exclude_nri: methodName.includes('without NRI'),
            median_pb_ratio_5y: data.medianPB || 0,
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
      'AlfaValue"',
      'proprietary',
      'FCF � PV(g���, g����, g�����, DR) + Cash - Debt',
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
      peMedian,
      'P/E Median 5y',
      'multiples',
      'Median(P/E_5y) × EPS_TTM',
      'internal',
      (data) => data.iv
    );

    addMethod(
      peMedianNoNRI,
      'P/E Median without NRI',
      'multiples',
      'Median(P/E_5y_adj) × Adjusted_EPS_TTM',
      'internal',
      (data) => data.iv
    );

    addMethod(
      psMedian,
      'P/S Median 5y',
      'multiples',
      'Median(P/S_5y) × Sales_per_Share_TTM',
      'internal',
      (data) => data.iv
    );

    addMethod(
      pbMedian,
      'P/B Median 5y',
      'multiples',
      'Median(P/B_5y) × Book_Value_per_Share_TTM',
      'internal',
      (data) => data.iv
    );

    addMethod(
      pbMedianNoNRI,
      'P/B Median without NRI',
      'multiples',
      'Median(P/B_5y_adj) × Adjusted_BVPS_TTM',
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

    res.json(response);
  } catch (error: any) {
    logger.error('[IVChart] Error generating chart:', error);
    res.status(500).json({ error: 'Failed to generate IV chart', details: error.message });
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
