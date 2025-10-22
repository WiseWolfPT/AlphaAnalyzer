/**
 * AlfaValue™ Valuation Types - FASE 2
 *
 * Types for intrinsic value calculation using multi-stage DCF model
 * with dynamic growth rates, sector benchmarks, and regional macro indicators.
 */

/**
 * Valuation status based on price vs intrinsic value
 */
export type ValuationStatus = 'undervalued' | 'overvalued' | 'fair';

/**
 * Confidence level in the valuation calculation
 */
export type ValuationConfidence = 'HIGH' | 'MED' | 'LOW';

/**
 * Source of growth rate data
 */
export type GrowthSource = 'dynamic' | 'sector' | 'static';

/**
 * Region code for macro indicators
 */
export type Region = 'US' | 'EU' | 'CN' | 'BR' | 'UK' | 'JP';

/**
 * Core assumptions used in AlfaValue™ calculation
 */
export interface ValuationAssumptions {
  /** Growth rate years 1-5 (decimal, e.g., 0.15 = 15%) */
  g_1_5: number;
  /** Growth rate years 6-10 (decimal) */
  g_6_10: number;
  /** Growth rate years 11-20 (terminal) (decimal) */
  g_11_20: number;
  /** Discount rate (CAPM: RF + β × MRP) (decimal) */
  discount_rate: number;
  /** Risk-free rate (US 10Y Treasury) (decimal) */
  rf: number;
  /** Beta (volatility vs market) */
  beta: number;
  /** Market Risk Premium (decimal) */
  mrp: number;
}

/**
 * Input data used for valuation calculation
 */
export interface ValuationInputs {
  /** Free Cash Flow TTM in millions USD */
  fcf_ttm_musd: number;
  /** Historical FCF for last 5 years in millions USD */
  fcf_5y_musd: number[];
  /** Cash and short-term investments in millions USD */
  cash_musd: number;
  /** Total debt (ST + LT) in millions USD */
  debt_musd: number;
  /** Shares outstanding (diluted) in millions */
  shares_m: number;
}

/**
 * Metadata about the valuation calculation
 */
export interface ValuationMeta {
  /** Sector mid-growth rate used for g6_10 */
  g_sector_mid: number;
  /** Source of sector growth rate */
  g_sector_source: GrowthSource;
  /** Terminal growth rate for the region */
  g_term_region: number;
  /** Region code */
  region: Region;
  /** Beta source (fmp or computed_5y_mo) */
  beta_source?: 'fmp' | 'computed_5y_mo';
  /** Macro multiplier applied to g6_10 (1.00 = neutral) */
  macro_multiplier?: number;
}

/**
 * Main AlfaValue™ response
 */
export interface AlfaValueResponse {
  /** Stock ticker symbol */
  ticker: string;
  /** Intrinsic value per share (USD) */
  iv: number;
  /** Current market price (USD) */
  price: number;
  /** Discount percentage ((IV - Price) / Price) */
  discount_pct: number;
  /** Valuation status */
  status: ValuationStatus;
  /** Core assumptions */
  assumptions: ValuationAssumptions;
  /** Input data used */
  inputs: ValuationInputs;
  /** Metadata */
  meta: ValuationMeta;
  /** Confidence level */
  confidence: ValuationConfidence;
  /** Calculation date (ISO 8601) */
  as_of: string;
}

/**
 * FASE 3: DNI-20 Response with inputs
 */
export interface DNI20Response {
  ticker: string;
  iv: number;
  netIncome: number;
  totalDebt: number;
  cash: number;
  sharesOutstanding: number;
  discountRate: number;
  growthY1_5: number;
  growthY6_10: number;
  growthY11_20: number;
  confidence: ValuationConfidence;
  as_of: string;
}

/**
 * FASE 3: DFCF Terminal Response with inputs
 */
export interface DFCFTerminalResponse {
  ticker: string;
  iv: number;
  fcf: number;
  totalDebt: number;
  cash: number;
  wacc: number;
  sharesOutstanding: number;
  growthY1_5: number;
  growthY6_10: number;
  terminalGrowth: number;
  stage1Value: number;
  stage2Value: number;
  terminalValue: number;
  confidence: ValuationConfidence;
  as_of: string;
}

/**
 * Risk-free rate response
 */
export interface RiskFreeRateResponse {
  /** Region code */
  region: Region;
  /** Risk-free rate (decimal) */
  rf: number;
  /** Source of data */
  source: 'fmp' | 'cache' | 'fallback';
  /** Data date (ISO 8601) */
  as_of: string;
}

/**
 * Market Risk Premium response
 */
export interface MarketRiskPremiumResponse {
  /** Region code */
  region: Region;
  /** Market risk premium (decimal) */
  mrp: number;
  /** Source of data */
  source: 'fmp' | 'fallback' | 'static';
  /** Whether region is covered by FMP API */
  covered: boolean;
  /** Data date (ISO 8601) */
  as_of: string;
}

/**
 * Terminal growth rate response
 */
export interface TerminalGrowthResponse {
  /** Region code */
  region: Region;
  /** Terminal growth rate (decimal) */
  g_term: number;
  /** GDP real growth component (decimal) */
  gdp_growth?: number;
  /** Inflation component (decimal) */
  inflation?: number;
  /** Source of data */
  source: 'fmp' | 'fallback' | 'static';
  /** Data date (ISO 8601) */
  as_of: string;
}

/**
 * Sector growth rate response
 */
export interface SectorGrowthResponse {
  /** Industry or sector name */
  industry: string;
  /** Mid-growth rate for the sector (decimal) */
  g_sector_mid: number;
  /** Source of calculation */
  source: GrowthSource;
  /** Number of peers used in calculation */
  peer_count?: number;
  /** Data date (ISO 8601) */
  as_of: string;
}

/**
 * FMP Treasury Rates API response shape
 */
export interface FMPTreasuryRates {
  date: string;
  month1: number;
  month2: number;
  month3: number;
  month6: number;
  year1: number;
  year2: number;
  year3: number;
  year5: number;
  year7: number;
  year10: number;
  year20: number;
  year30: number;
}

/**
 * FMP Market Risk Premium API response shape
 */
export interface FMPMarketRiskPremium {
  country: string;
  continent: string;
  totalEquityRiskPremium: number;
  countryRiskPremium: number;
}

/**
 * FMP Economic Indicators API response shape
 */
export interface FMPEconomicIndicators {
  date: string;
  indicator: string;
  value: number;
  change: number;
  changePercentage: number;
}

/**
 * FMP Company Profile response (subset needed for valuation)
 */
export interface FMPCompanyProfile {
  symbol: string;
  companyName: string;
  industry: string;
  sector: string;
  beta: number;
  marketCap: number;
  price: number;
}

/**
 * FMP Financial Statement response (subset)
 */
export interface FMPFinancialStatement {
  date: string;
  symbol: string;
  reportedCurrency: string;
  cik: string;
  fillingDate: string;
  acceptedDate: string;
  calendarYear: string;
  period: string;

  // Income Statement
  revenue?: number;
  netIncome?: number;
  operatingCashFlow?: number;
  capitalExpenditure?: number;
  freeCashFlow?: number;

  // Balance Sheet
  cashAndCashEquivalents?: number;
  shortTermInvestments?: number;
  totalDebt?: number;
  netDebt?: number;

  // Shares
  weightedAverageShsOut?: number;
  weightedAverageShsOutDil?: number;
}

/**
 * Cache key prefixes for valuation data
 */
export const VALUATION_CACHE_KEYS = {
  IV_CALC: 'iv:calc:',           // TTL 24h - full IV calculation
  RF: 'rf:',                      // TTL 24h - risk-free rate
  MRP: 'mrp:',                    // TTL 31d - market risk premium
  MRP_COVERAGE: 'mrp:coverage:',  // TTL 30d - MRP API coverage check
  G_TERM: 'g_term_region:',       // TTL 365d - terminal growth rate
  G_SECTOR: 'sector:growth:industry:', // TTL 30d - sector growth rate
  BETA: 'beta:',                  // TTL 30d - company beta
} as const;

/**
 * Default fallback values
 */
export const VALUATION_DEFAULTS = {
  RF: 0.04,           // 4% default risk-free rate
  MRP: 0.05,          // 5% default market risk premium
  BETA: 1.0,          // Market beta
  G_TERM: {
    US: 0.04,         // 4% US terminal growth
    EU: 0.03,         // 3% EU terminal growth
    CN: 0.05,         // 5% China terminal growth
    BR: 0.04,         // 4% Brazil terminal growth
    UK: 0.03,         // 3% UK terminal growth
    JP: 0.02,         // 2% Japan terminal growth
  },
} as const;

/**
 * Clamp ranges for safety
 */
export const VALUATION_CLAMPS = {
  G_1_5: { min: 0.05, max: 0.30 },      // 5% to 30%
  G_6_10: { min: 0.02, max: 0.20 },     // 2% to 20%
  G_11_20: { min: 0.03, max: 0.05 },    // 3% to 5%
  DR: { min: 0.05, max: 0.15 },         // 5% to 15%
  BETA: { min: 0.5, max: 2.0 },         // 0.5 to 2.0
  G_SECTOR_MID: { min: 0.02, max: 0.15 }, // 2% to 15%
} as const;

/**
 * FASE 3: Valuation Method Categories
 */
export type ValuationMethodCategory = 'proprietary' | 'dcf' | 'multiples' | 'growth';

/**
 * FASE 3: Valuation Method Result
 */
export interface ValuationMethod {
  name: string;                     // "AlfaValue™", "DCF-20 FCF FMP", "P/E Mean 5y", etc
  category: ValuationMethodCategory;
  iv: number | null;                // Intrinsic value per share (null if unavailable)
  discount_pct: number | null;      // ((IV - Price) / Price) * 100
  formula: string;                  // Human-readable formula
  confidence: ValuationConfidence;
  source: 'internal' | 'fmp' | 'hybrid';
  as_of: string;
  inputs?: any;                     // FASE 3: Method-specific inputs for dropdown UI
}

/**
 * FASE 3: Consolidated IV Chart Response
 */
export interface IVChartResponse {
  ticker: string;
  price: number;                    // Current market price
  methods: ValuationMethod[];       // All valuation methods
  macro_multiplier: number;         // Applied to all IVs
  macro_sentiment: 'bearish' | 'neutral' | 'bullish';
  as_of: string;
}

/**
 * FASE 3: DCF Base Metric (GAP #3)
 */
export type DCFBaseMetric = 'fcf' | 'ocf' | 'ni';

/**
 * FASE 3: DCF Calculation Request with "Based On" selector
 */
export interface DCFCalcRequest {
  ticker: string;
  based_on: DCFBaseMetric;          // User-selected base metric
  current_value?: number;           // Override value (optional)
  growth_1_5?: number;              // Override g1-5 (optional)
  growth_6_10?: number;             // Override g6-10 (optional)
  growth_11_20?: number;            // Override g11-20 (optional)
  discount_rate?: number;           // Override DR (optional)
}

/**
 * FASE 3: Method-Specific Inputs (GAP #1 - Dropdown Bug Fix)
 *
 * Validated against StockOracle on 2025-10-21:
 * - All 17 methods have unique input structures
 * - DFCF Terminal uses 3-stage model with calculated stage values
 * - Discount rate varies: 6.27% for DCF-20, 10.36% for DFCF Terminal
 * - Custom method includes "Based On" dropdown, checkboxes, and Note field
 */

/**
 * Base inputs common to all DCF methods (20-year models)
 */
export interface DCF20BaseInputs {
  base_metric_musd: number;          // OCF/FCF/NI in millions
  total_debt_musd: number;           // Total debt (excl. lease obligations)
  cash_musd: number;                 // Cash & ST Investments
  discount_rate: number;             // Discount rate (%)
  shares_outstanding_m: number;      // Shares outstanding in millions
  growth_rate_1_5: number;           // Growth rate year 1-5 (%)
  growth_rate_6_10: number;          // Growth rate year 6-10 (%)
  growth_rate_11_20: number;         // Growth rate year 11-20 (%)
}

/**
 * DCF-20 (Operating Cash Flow) - METHOD #1
 */
export interface DCF20OCFInputs extends DCF20BaseInputs {
  method: 'DCF-20 OCF';
  ocf_ttm_musd: number;              // Same as base_metric_musd
}

/**
 * DFCF-20 (Free Cash Flow) - METHOD #2
 */
export interface DFCF20Inputs extends DCF20BaseInputs {
  method: 'DFCF-20';
  fcf_ttm_musd: number;              // Same as base_metric_musd
}

/**
 * DNI-20 (Net Income) - METHOD #3
 */
export interface DNI20Inputs extends DCF20BaseInputs {
  method: 'DNI-20';
  ni_ttm_musd: number;               // Same as base_metric_musd
}

/**
 * DFCF Terminal (3-Stage Model) - METHOD #4
 *
 * ⚠️ CRITICAL DISCOVERY (2025-10-21):
 * - Uses 3-stage model with CALCULATED stage values
 * - Discount rate is 10.36% (NOT 6.27% like DCF-20!)
 * - Terminal growth is 3.63% (NOT 4%)
 * - Stage 1 Value: $31.92, Stage 2 Value: $29.17, Terminal Value: $76.84
 */
export interface DFCFTerminalInputs {
  method: 'DFCF-Terminal';
  fcf_ttm_musd: number;
  total_debt_musd: number;
  cash_musd: number;
  discount_rate: number;             // 10.36% for AAPL
  shares_outstanding_m: number;

  // Stage 1 Growth
  stage1_years: number;              // Number of years (5)
  stage1_growth_rate: number;        // Growth rate year 1-5 (10.07%)
  stage1_value: number;              // ✅ CALCULATED: Stage 1 intrinsic value ($31.92)

  // Stage 2 Growth
  stage2_years: number;              // Number of years (5)
  stage2_growth_rate: number;        // Growth rate year 6-10 (7.26%)
  stage2_value: number;              // ✅ CALCULATED: Stage 2 intrinsic value ($29.17)

  // Terminal Stage
  terminal_growth_rate: number;      // Terminal growth (3.63%)
  terminal_value: number;            // ✅ CALCULATED: Terminal intrinsic value ($76.84)
}

/**
 * P/S Mean (5-year historical mean) - METHOD #5
 */
export interface PSMeanInputs {
  method: 'P/S Mean 5Y';
  mean_ps_ratio_5y: number;          // Mean P/S ratio (7.43)
  revenue_per_share_ttm: number;     // Revenue per share ($27.34)
}

/**
 * P/S Median (5-year historical median) - METHOD #6
 */
export interface PSMedianInputs {
  method: 'P/S Median 5Y';
  median_ps_ratio_5y: number;        // Median P/S ratio (7.34)
  revenue_per_share_ttm: number;     // Revenue per share ($27.34)
}

/**
 * P/E Mean (5-year historical mean, excluding NRI) - METHOD #7
 */
export interface PEMeanInputs {
  method: 'P/E Mean 5Y ex-NRI';
  mean_pe_ratio_5y: number;          // Mean P/E ratio (30.22)
  eps_ttm: number;                   // Earnings per share ($6.61)
}

/**
 * P/E Median (5-year historical median, excluding NRI) - METHOD #8
 */
export interface PEMedianInputs {
  method: 'P/E Median 5Y ex-NRI';
  median_pe_ratio_5y: number;        // Median P/E ratio (29.42)
  eps_ttm: number;                   // Earnings per share ($6.61)
}

/**
 * P/B Mean (5-year historical mean) - METHOD #9
 */
export interface PBMeanInputs {
  method: 'P/B Mean 5Y';
  mean_pb_ratio_5y: number;          // Mean P/B ratio (43.06)
  book_value_per_share_ttm: number;  // Book value per share ($4.43)
}

/**
 * P/B Median (5-year historical median) - METHOD #10
 */
export interface PBMedianInputs {
  method: 'P/B Median 5Y';
  median_pb_ratio_5y: number;        // Median P/B ratio (42.78)
  book_value_per_share_ttm: number;  // Book value per share ($4.43)
}

/**
 * PEG (Price/Earnings-to-Growth, excluding NRI) - METHOD #11
 */
export interface PEGInputs {
  method: 'PEG ex-NRI';
  fair_peg_ratio: number;            // Fair PEG ratio (1.5)
  eps_ttm: number;                   // Earnings per share ($6.61)
  growth_rate_3_5y: number;          // 3-5 year EPS growth rate (10.07%)
}

/**
 * PSG (Price/Sales-to-Growth) - METHOD #12
 */
export interface PSGInputs {
  method: 'PSG';
  fair_psg_ratio: number;            // Fair PSG ratio (0.2)
  revenue_per_share_ttm: number;     // Revenue per share ($27.34)
  growth_rate_3_5y: number;          // 3-5 year revenue growth rate (5.47%)
}

/**
 * P/E Mean without NRI (alternative calculation) - METHOD #13
 */
export interface PEMeanWithoutNRIInputs {
  method: 'P/E Mean 5Y without NRI';
  mean_pe_ratio_5y_without_nri: number;  // Mean P/E ratio without NRI (30.22)
  eps_ttm_without_nri: number;           // EPS without NRI ($6.61)
}

/**
 * P/E Median without NRI (alternative calculation) - METHOD #14
 */
export interface PEMedianWithoutNRIInputs {
  method: 'P/E Median 5Y without NRI';
  median_pe_ratio_5y_without_nri: number; // Median P/E ratio without NRI (29.42)
  eps_ttm_without_nri: number;            // EPS without NRI ($6.61)
}

/**
 * P/B Mean without NRI (alternative calculation) - METHOD #15
 */
export interface PBMeanWithoutNRIInputs {
  method: 'P/B Mean 5Y without NRI';
  mean_pb_ratio_5y_without_nri: number;   // Mean P/B ratio without NRI
  book_value_per_share_ttm_without_nri: number;
}

/**
 * P/B Median without NRI (alternative calculation) - METHOD #16
 */
export interface PBMedianWithoutNRIInputs {
  method: 'P/B Median 5Y without NRI';
  median_pb_ratio_5y_without_nri: number; // Median P/B ratio without NRI
  book_value_per_share_ttm_without_nri: number;
}

/**
 * OracleValue™ - METHOD #17 (Proprietary Black Box)
 *
 * ⚠️ NOTE: StockOracle does NOT expose inputs for OracleValue™
 * This is their proprietary algorithm with no public formula
 */
export interface OracleValueInputs {
  method: 'OracleValue™';
  // No inputs exposed - black box proprietary method
  note: 'Proprietary algorithm - no public inputs';
}

/**
 * Custom Method - METHOD #18
 *
 * Features:
 * - "Based On" dropdown (FCF, OCF, NI)
 * - Debt/Cash checkboxes ("Deduct from IV", "Add to IV")
 * - Note field for user annotations
 */
export interface CustomMethodInputs {
  method: 'Custom';
  based_on: DCFBaseMetric;           // User-selected base metric
  base_metric_musd: number;          // FCF/OCF/NI in millions
  total_debt_musd: number;
  cash_musd: number;
  discount_rate: number;
  shares_outstanding_m: number;
  growth_rate_1_5: number;
  growth_rate_6_10: number;
  growth_rate_11_20: number;

  // Custom features
  deduct_debt: boolean;              // Checkbox: "Deduct from Intrinsic Value"
  add_cash: boolean;                 // Checkbox: "Add to Intrinsic Value"
  note?: string;                     // User note field
}

/**
 * Union type for all method inputs
 */
export type MethodInputs =
  | DCF20OCFInputs
  | DFCF20Inputs
  | DNI20Inputs
  | DFCFTerminalInputs
  | PSMeanInputs
  | PSMedianInputs
  | PEMeanInputs
  | PEMedianInputs
  | PBMeanInputs
  | PBMedianInputs
  | PEGInputs
  | PSGInputs
  | PEMeanWithoutNRIInputs
  | PEMedianWithoutNRIInputs
  | PBMeanWithoutNRIInputs
  | PBMedianWithoutNRIInputs
  | OracleValueInputs
  | CustomMethodInputs;

/**
 * FASE 3: Updated ValuationMethod with inputs field
 */
export interface ValuationMethodWithInputs extends ValuationMethod {
  inputs: Record<string, number | string | boolean>; // Method-specific inputs
}

/**
 * FASE 3: PEG Ratio Valuation Response
 */
export interface PEGValuationResponse {
  ticker: string;
  iv: number;
  currentPrice: number;
  epsWithoutNRI: number;
  peWithoutNRI: number;
  epsGrowthRate: number;
  pegRatio: number;
  fairPegRatio: number;    // Default 1.5 (editável)
  confidence: ValuationConfidence;
  as_of: string;
}

/**
 * FASE 3: PSG Ratio Valuation Response
 */
export interface PSGValuationResponse {
  ticker: string;
  iv: number;
  currentPrice: number;
  salesPerShare: number;
  psRatio: number;
  revenueGrowthRate: number;
  psgRatio: number;
  fairPsgRatio: number;    // Default 0.2 (editável)
  confidence: ValuationConfidence;
  as_of: string;
}

/**
 * FASE 3: P/E Valuation Response (Mean/Median, with/without NRI)
 */
export interface PEValuationResponse {
  ticker: string;
  iv: number;
  avgPE?: number;          // Para Mean
  medianPE?: number;       // Para Median
  currentPrice: number;
  eps: number;
  historicalPE: number[];
  excludeNRI: boolean;
  confidence: ValuationConfidence;
  as_of: string;
}

/**
 * FASE 3: P/S Valuation Response (Mean/Median)
 */
export interface PSValuationResponse {
  ticker: string;
  iv: number;
  avgPS?: number;          // Para Mean
  medianPS?: number;       // Para Median
  currentPrice: number;
  salesPerShare: number;
  historicalPS: number[];
  confidence: ValuationConfidence;
  as_of: string;
}

/**
 * FASE 3: P/B Valuation Response (Mean/Median, with/without NRI)
 */
export interface PBValuationResponse {
  ticker: string;
  iv: number;
  avgPB?: number;          // Para Mean
  medianPB?: number;       // Para Median
  currentPrice: number;
  bookValuePerShare: number;
  historicalPB: number[];
  excludeNRI: boolean;
  confidence: ValuationConfidence;
  as_of: string;
}

/**
 * FASE 3: Extended FMP DCF Response with inputs
 *
 * Expands ExternalDCFResponse to include the actual financial data
 * used in DCF calculations. This enables:
 * - UI dropdowns showing calculation details
 * - Validation of FMP DCF methodology
 * - Educational transparency for users
 */
export interface ExtendedFMPDCFResponse {
  ticker: string;
  dcf: number;                    // Intrinsic value per share
  stock_price: number;            // Current market price
  date: string;                   // Calculation date
  method: 'DCF_FCF' | 'DCF_FCFE' | 'DCF_TERM_FCF' | 'DCF_TERM_FCFE';
  source: 'fmp' | 'cache';
  confidence: 'HIGH' | 'MED' | 'LOW';
  as_of: string;

  /**
   * Financial inputs used in DCF calculation
   * Optional to maintain backward compatibility
   */
  inputs?: {
    freeCashFlow: number;              // TTM FCF (millions USD)
    totalDebt: number;                 // Total debt (millions USD)
    cashAndCashEquivalents: number;    // Cash & ST investments (millions USD)
    sharesOutstanding: number;         // Shares outstanding (millions)
  };
}
