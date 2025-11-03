import { useMemo } from 'react';

/**
 * DCF Methods Display Format
 * Maps: FCF/OCF/NI, debt, cash, discount rate, growth rates, shares
 */
export type DCFInputs = {
  type: 'dcf';
  operatingCF: number;
  totalDebt: number;
  cash: number;
  discountRate: number;
  shares: number;
  growthY1_5: number;
  growthY6_10: number;
  growthY11_20: number;
  deductDebt: boolean;
  addCash: boolean;
};

/**
 * Growth-Adjusted Methods Display Format (PEG, PSG)
 * Maps: last_price, EPS/Sales, fair ratio, growth rate
 */
export type GrowthAdjustedInputs = {
  type: 'growth-adjusted';
  fairRatio: number;
  lastPrice: number;
  metric: number;
  metricName: string;
  growthRate: number;
  pe_without_nri?: number;
  peg_ratio_without_nri?: number;
  ps_ratio?: number;
  psg_ratio?: number;
};

/**
 * Multiples Methods Display Format (P/E, P/S, P/B)
 * Maps: current_price, historical ratios, per-share metrics
 */
export type MultiplesInputs = {
  type: 'multiples';
  ratio: number;
  ratioName: string;
  currentPrice: number;
  metricPerShare: number;
  metricName: string;
  historicalRatios: number[];
};

/**
 * Discriminated union for type-safe input mapping
 */
export type MappedInputs = DCFInputs | GrowthAdjustedInputs | MultiplesInputs | null;

interface ValuationMethod {
  method_id: string;
  name: string;
  iv: number;
  inputs?: any;
}

interface ValuationChartData {
  methods: ValuationMethod[];
  price: number;
}

/**
 * Custom hook to map backend valuation method inputs to frontend display format
 *
 * Handles 19 valuation methods across 3 categories:
 * - DCF: AlfaValue, DCF-20 (FCF/OCF/NI), DNI-20, DFCF Terminal, DFCF-20
 * - Multiples: P/E Mean/Median (5Y), P/S Mean/Median (5Y), P/B Mean/Median (5Y)
 * - Growth-Adjusted: PEG, PSG
 *
 * @param selectedMethod - Method ID (e.g., 'alfavalue', 'peg', 'pe-mean')
 * @param valuationChartData - Data from /api/iv/:ticker/chart
 * @param alfaValueData - Legacy parameter (kept for backward compatibility, not used)
 * @returns Mapped inputs or null if unavailable
 *
 * @example
 * ```tsx
 * const mappedInputs = useMethodInputMapper('alfavalue', chartData, alfaValueData);
 * if (mappedInputs?.type === 'dcf') {
 *   console.log('Operating CF:', mappedInputs.operatingCF);
 *   console.log('Growth Y1-5:', mappedInputs.growthY1_5);
 * }
 * ```
 */
export function useMethodInputMapper(
  selectedMethod: string,
  valuationChartData: ValuationChartData | undefined,
  alfaValueData: any // Kept for backward compatibility, not used
): MappedInputs {
  return useMemo(() => {
    if (!valuationChartData) return null;

    const method = valuationChartData.methods.find(
      m => m.method_id === selectedMethod
    );

    if (!method?.inputs) return null;

    const inputs = method.inputs;

    // Determine method category from inputs.method field
    const methodType = inputs.method;

    // FASE 2 FIX: Special handling for Growth DCF 8Y method (different growth period structure)
    if (methodType === 'growth-dcf-8y' || selectedMethod === 'growth-dcf-8y') {
      // Growth DCF 8Y uses Y1-3, Y4-6, Y7-8 periods instead of Y1-5, Y6-10, Y11-20
      // Map to frontend display (we'll show them as Y1-5, Y6-10, Y11-20 for consistency)
      const shares = Number(
        inputs.shares_outstanding_m ||
        inputs.shares_m ||
        inputs.sharesOutstanding ||
        inputs.shares_outstanding ||
        inputs.outstanding_shares_m ||
        inputs.outstanding_shares ||
        inputs.diluted_shares_outstanding ||
        inputs.dilutedSharesOutstanding ||
        inputs.shares ||
        0
      );

      return {
        type: 'dcf',
        operatingCF: Number(
          inputs.fcf_ttm_musd ||
          inputs.base_value ||
          inputs.operating_cf ||
          inputs.ocf_ttm_musd ||
          inputs.net_income_ttm_musd || 0
        ),
        totalDebt: Number(
          inputs.total_debt_musd ||
          inputs.debt_musd || 0
        ),
        cash: Number(
          inputs.cash_musd ||
          inputs.cash || 0
        ),
        discountRate: Number(
          inputs.discount_rate ?
            inputs.discount_rate * 100 :
            inputs.discount_rate || 0
        ),
        shares: shares,
        // Map Growth DCF 8Y growth periods to display format
        growthY1_5: Number(
          inputs.growth_rate_y1_3 ?
            inputs.growth_rate_y1_3 * 100 :
            inputs.g1_3 ?
              inputs.g1_3 * 100 : 0
        ), // Y1-3 growth → display as Y1-5
        growthY6_10: Number(
          inputs.growth_rate_y4_6 ?
            inputs.growth_rate_y4_6 * 100 :
            inputs.g4_6 ?
              inputs.g4_6 * 100 : 0
        ), // Y4-6 growth → display as Y6-10
        growthY11_20: Number(
          inputs.growth_rate_y7_8 ?
            inputs.growth_rate_y7_8 * 100 :
            inputs.g7_8 ?
              inputs.g7_8 * 100 : 0
        ), // Y7-8 growth → display as Y11-20
        deductDebt: inputs.deduct_debt !== false, // Default true
        addCash: inputs.add_cash !== false, // Default true
      };
    }

    // DCF Methods: alfavalue, dcf-20, dfcf-terminal, dni-20, dfcf-20
    if (
      methodType === 'alfavalue' ||
      methodType === 'dcf-20' ||
      methodType === 'dcf-20-fcf' ||
      methodType === 'dcf-20-ocf' ||
      methodType === 'dcf-20-ni' ||
      methodType === 'dfcf-terminal' ||
      methodType === 'dfcf-20' ||
      methodType === 'dni-20' ||
      methodType?.toLowerCase().includes('dcf') ||
      methodType?.toLowerCase().includes('dni') ||
      methodType?.toLowerCase().includes('dfcf')
    ) {
      // BUG FIX #3: Extended field mapping for shares outstanding
      // Different backend methods use different field names - check all possibilities
      const shares = Number(
        inputs.shares_outstanding_m ||
        inputs.shares_m ||
        inputs.sharesOutstanding ||
        inputs.shares_outstanding ||
        inputs.outstanding_shares_m ||
        inputs.outstanding_shares ||
        inputs.diluted_shares_outstanding ||
        inputs.dilutedSharesOutstanding ||
        inputs.shares ||
        0
      );

      // Log warning if shares is 0 (helps debugging)
      if (shares === 0 && process.env.NODE_ENV === 'development') {
        console.warn(
          `[useMethodInputMapper] Shares Outstanding is 0 for method: ${methodType}. ` +
          `Available input fields:`, Object.keys(inputs)
        );
      }

      return {
        type: 'dcf',
        operatingCF: Number(
          inputs.fcf_ttm_musd ||
          inputs.ocf_ttm_musd ||
          inputs.net_income_ttm_musd ||
          inputs.ni_ttm_musd ||
          inputs.operating_cf ||
          inputs.base_metric_musd || 0
        ),
        totalDebt: Number(
          inputs.total_debt_musd ||
          inputs.debt_musd || 0
        ),
        cash: Number(
          inputs.cash_musd ||
          inputs.cash || 0
        ),
        discountRate: Number(
          inputs.discount_rate ?
            inputs.discount_rate * 100 :
            inputs.discount_rate || 0
        ),
        shares: shares,
        growthY1_5: Number(
          inputs.growth_rate_y1_5 ?
            inputs.growth_rate_y1_5 * 100 :
            inputs.growth_rate_1_5 ?
              inputs.growth_rate_1_5 * 100 :
              inputs.stage1_growth_rate ?
                inputs.stage1_growth_rate * 100 : 0
        ),
        growthY6_10: Number(
          inputs.growth_rate_y6_10 ?
            inputs.growth_rate_y6_10 * 100 :
            inputs.growth_rate_6_10 ?
              inputs.growth_rate_6_10 * 100 :
              inputs.stage2_growth_rate ?
                inputs.stage2_growth_rate * 100 : 0
        ),
        growthY11_20: Number(
          inputs.growth_rate_y11_20 ?
            inputs.growth_rate_y11_20 * 100 :
            inputs.growth_rate_11_20 ?
              inputs.growth_rate_11_20 * 100 :
              inputs.terminal_growth_rate ?
                inputs.terminal_growth_rate * 100 : 0
        ),
        deductDebt: inputs.deduct_debt !== false, // Default true
        addCash: inputs.add_cash !== false, // Default true
      };
    }

    // Growth-Adjusted Methods: PEG, PSG
    if (methodType === 'peg' || methodType === 'psg' || methodType?.toLowerCase().includes('peg') || methodType?.toLowerCase().includes('psg')) {
      const isPEG = methodType?.toLowerCase().includes('peg');
      return {
        type: 'growth-adjusted',
        fairRatio: Number(
          inputs.fair_peg_ratio ||
          inputs.fair_psg_ratio || 1.5
        ),
        lastPrice: Number(inputs.last_price || inputs.current_price || 0),
        metric: Number(
          inputs.eps_without_nri ||
          inputs.eps_ttm ||
          inputs.sales_per_share ||
          inputs.revenue_per_share_ttm || 0
        ),
        metricName: isPEG ? 'EPS without NRI' : 'Sales per Share',
        growthRate: Number(
          inputs.growth_rate ?
            inputs.growth_rate * 100 :
            inputs.growth_rate_3_5y ?
              inputs.growth_rate_3_5y * 100 :
              inputs.eps_growth_rate ?
                inputs.eps_growth_rate * 100 :
                inputs.revenue_growth_rate ?
                  inputs.revenue_growth_rate * 100 : 0
        ),
        pe_without_nri: inputs.pe_without_nri,
        peg_ratio_without_nri: inputs.peg_ratio || inputs.peg_ratio_without_nri,
        ps_ratio: inputs.ps_ratio,
        psg_ratio: inputs.psg_ratio,
      };
    }

    // Multiples Methods: pe-, ps-, pb-
    if (
      methodType?.includes('pe-') ||
      methodType?.includes('ps-') ||
      methodType?.includes('pb-') ||
      methodType?.toLowerCase().includes('p/e') ||
      methodType?.toLowerCase().includes('p/s') ||
      methodType?.toLowerCase().includes('p/b')
    ) {
      let ratio = 0;
      let ratioName = '';
      let metricPerShare = 0;
      let metricName = '';
      let historicalRatios: number[] = [];

      // P/E methods
      if (methodType?.includes('pe-') || methodType?.toLowerCase().includes('p/e')) {
        ratio = Number(
          inputs.mean_pe_ratio_5y ||
          inputs.median_pe_ratio_5y ||
          inputs.mean_pe_ratio_5y_without_nri ||
          inputs.median_pe_ratio_5y_without_nri ||
          inputs.avg_pe ||
          inputs.median_pe || 0
        );
        ratioName = methodType?.includes('mean') || methodType?.includes('Mean')
          ? 'Mean P/E Ratio (5Y)'
          : 'Median P/E Ratio (5Y)';
        metricPerShare = Number(
          inputs.eps_ttm ||
          inputs.eps_ttm_without_nri ||
          inputs.eps || 0
        );
        metricName = inputs.exclude_nri || inputs.eps_ttm_without_nri
          ? 'EPS without NRI'
          : 'EPS TTM';
        historicalRatios = inputs.pe_ratios || inputs.historical_pe || [];
      }
      // P/S methods
      else if (methodType?.includes('ps-') || methodType?.toLowerCase().includes('p/s')) {
        ratio = Number(
          inputs.mean_ps_ratio_5y ||
          inputs.median_ps_ratio_5y ||
          inputs.avg_ps ||
          inputs.median_ps || 0
        );
        ratioName = methodType?.includes('mean') || methodType?.includes('Mean')
          ? 'Mean P/S Ratio (5Y)'
          : 'Median P/S Ratio (5Y)';
        metricPerShare = Number(
          inputs.sales_per_share_ttm ||
          inputs.revenue_per_share_ttm ||
          inputs.sales_per_share || 0
        );
        metricName = 'Sales per Share TTM';
        historicalRatios = inputs.ps_ratios || inputs.historical_ps || [];
      }
      // P/B methods
      else if (methodType?.includes('pb-') || methodType?.toLowerCase().includes('p/b')) {
        ratio = Number(
          inputs.mean_pb_ratio_5y ||
          inputs.median_pb_ratio_5y ||
          inputs.mean_pb_ratio_5y_without_nri ||
          inputs.median_pb_ratio_5y_without_nri ||
          inputs.avg_pb ||
          inputs.median_pb || 0
        );
        ratioName = methodType?.includes('mean') || methodType?.includes('Mean')
          ? 'Mean P/B Ratio (5Y)'
          : 'Median P/B Ratio (5Y)';
        metricPerShare = Number(
          inputs.book_value_per_share_ttm ||
          inputs.book_value_per_share_ttm_without_nri ||
          inputs.book_value_per_share || 0
        );
        metricName = inputs.exclude_nri || inputs.book_value_per_share_ttm_without_nri
          ? 'Book Value per Share without NRI'
          : 'Book Value per Share TTM';
        historicalRatios = inputs.pb_ratios || inputs.historical_pb || [];
      }

      return {
        type: 'multiples',
        ratio,
        ratioName,
        currentPrice: Number(inputs.current_price || inputs.last_price || 0),
        metricPerShare,
        metricName,
        historicalRatios,
      };
    }

    // Unknown method type - log warning and return null
    console.warn(`[useMethodInputMapper] Unknown method type: ${methodType}`);
    return null;
  }, [selectedMethod, valuationChartData]); // Memoize based on these dependencies
}
