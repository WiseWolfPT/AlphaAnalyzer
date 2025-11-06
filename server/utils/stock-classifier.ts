/**
 * Stock Classifier - ETF Detection (ONDA 4.1)
 *
 * Comprehensive ETF detection using multiple strategies:
 * 1. Suffix detection (.ETF, -ETF, .ETP)
 * 2. Known ETF list (140+ popular ETFs)
 * 3. Company profile type check (API data)
 * 4. Name pattern detection (provider names, indicators)
 *
 * ETFs do not have intrinsic value (they are baskets of stocks),
 * so IV calculations must be blocked for these instruments.
 */

import {
  KNOWN_ETFS,
  ETF_PROVIDERS,
  ETF_NAME_INDICATORS,
  isInKnownETFList,
} from '../data/known-etfs';

/**
 * Company profile data structure (optional param for enhanced detection)
 */
export interface CompanyProfile {
  type?: string;
  isEtf?: boolean;
  companyName?: string;
  industry?: string;
  description?: string;
}

/**
 * Main ETF detection function
 *
 * @param ticker - Stock ticker symbol (e.g., 'SPY', 'AAPL')
 * @param companyData - Optional company profile data for enhanced detection
 * @returns true if ticker is classified as ETF, false otherwise
 */
export function isETF(ticker: string, companyData?: CompanyProfile): boolean {
  const normalizedTicker = ticker.toUpperCase().trim();

  // Strategy 1: Suffix detection
  const etfSuffixes = ['.ETF', '-ETF', '.ETP', '_ETF'];
  if (etfSuffixes.some((suffix) => normalizedTicker.endsWith(suffix))) {
    return true;
  }

  // Strategy 2: Known ETF list (140+ popular ETFs)
  if (isInKnownETFList(normalizedTicker)) {
    return true;
  }

  // Strategy 3: Company profile type check (if data available)
  if (companyData) {
    const type = companyData.type?.toLowerCase() || '';
    const isEtf = companyData.isEtf;

    // Direct ETF flag
    if (type === 'etf' || isEtf === true) {
      return true;
    }

    // Fund-related types
    const fundTypes = ['fund', 'trust', 'closed-end fund', 'mutual fund', 'index fund'];
    if (fundTypes.some((fundType) => type.includes(fundType))) {
      return true;
    }
  }

  // Strategy 4: Name pattern detection (most conservative)
  if (companyData?.companyName) {
    const name = companyData.companyName.toLowerCase();

    // Check if name includes ETF provider + indicator combination
    const hasProvider = ETF_PROVIDERS.some((provider) => name.includes(provider));
    const hasIndicator = ETF_NAME_INDICATORS.some((indicator) => name.includes(indicator));

    if (hasProvider && hasIndicator) {
      return true;
    }

    // Check for explicit ETF/fund declaration in name (with word boundaries to avoid false positives like "Netflix")
    if (/\betf\b/i.test(name) || /\bexchange traded fund\b/i.test(name)) {
      return true;
    }

    // Check for index fund patterns
    const indexPatterns = [
      /\bindex fund\b/i,
      /\btracker\b.*\bfund\b/i,
      /\bfund\b.*\btracker\b/i,
    ];
    if (indexPatterns.some((pattern) => pattern.test(name))) {
      return true;
    }
  }

  return false;
}

/**
 * Get human-readable reason why ticker is classified as ETF
 *
 * @param ticker - Stock ticker symbol
 * @param companyData - Optional company profile data
 * @returns Reason string if ETF, null otherwise
 */
export function getETFReason(
  ticker: string,
  companyData?: CompanyProfile
): string | null {
  if (!isETF(ticker, companyData)) return null;

  const normalizedTicker = ticker.toUpperCase();

  // Check suffix
  const etfSuffixes = ['.ETF', '-ETF', '.ETP', '_ETF'];
  const matchedSuffix = etfSuffixes.find((suffix) =>
    normalizedTicker.endsWith(suffix)
  );
  if (matchedSuffix) {
    return `Ticker suffix (${matchedSuffix})`;
  }

  // Check known list
  if (isInKnownETFList(normalizedTicker)) {
    return 'Known ETF list (140+ popular ETFs)';
  }

  // Check profile type
  if (companyData) {
    const type = companyData.type?.toLowerCase() || '';

    if (type === 'etf') {
      return 'Company profile type=etf';
    }

    if (companyData.isEtf === true) {
      return 'Company profile isEtf flag';
    }

    const fundTypes = ['fund', 'trust', 'closed-end fund', 'mutual fund', 'index fund'];
    const matchedFundType = fundTypes.find((fundType) => type.includes(fundType));
    if (matchedFundType) {
      return `Company profile type contains "${matchedFundType}"`;
    }
  }

  // Check name pattern
  if (companyData?.companyName) {
    const name = companyData.companyName.toLowerCase();

    if (/\betf\b/i.test(name) || /\bexchange traded fund\b/i.test(name)) {
      return 'Name explicitly mentions ETF';
    }

    const matchedProvider = ETF_PROVIDERS.find((provider) => name.includes(provider));
    const matchedIndicator = ETF_NAME_INDICATORS.find((indicator) =>
      name.includes(indicator)
    );

    if (matchedProvider && matchedIndicator) {
      return `Name pattern: ${matchedProvider} + ${matchedIndicator}`;
    }

    if (/\bindex fund\b/i.test(name)) {
      return 'Name contains "index fund"';
    }
  }

  return 'Name pattern detection';
}

/**
 * Get detailed classification info for debugging
 *
 * @param ticker - Stock ticker symbol
 * @param companyData - Optional company profile data
 * @returns Object with classification details
 */
export function getClassificationDetails(
  ticker: string,
  companyData?: CompanyProfile
) {
  const normalizedTicker = ticker.toUpperCase();
  const isEtfResult = isETF(ticker, companyData);
  const reason = getETFReason(ticker, companyData);

  return {
    ticker: normalizedTicker,
    is_etf: isEtfResult,
    reason: reason || 'Not an ETF',
    checks: {
      suffix_match: ['.ETF', '-ETF', '.ETP', '_ETF'].some((suffix) =>
        normalizedTicker.endsWith(suffix)
      ),
      in_known_list: isInKnownETFList(normalizedTicker),
      profile_type_etf: companyData?.type?.toLowerCase() === 'etf',
      profile_is_etf_flag: companyData?.isEtf === true,
      name_pattern_match:
        companyData?.companyName
          ? ETF_PROVIDERS.some((provider) =>
              companyData.companyName!.toLowerCase().includes(provider)
            ) &&
            ETF_NAME_INDICATORS.some((indicator) =>
              companyData.companyName!.toLowerCase().includes(indicator)
            )
          : false,
    },
    company_info: companyData
      ? {
          type: companyData.type,
          name: companyData.companyName,
          is_etf_flag: companyData.isEtf,
        }
      : null,
    can_calculate_iv: !isEtfResult,
  };
}

/**
 * Get statistics about ETF detection coverage
 */
export function getETFDetectionStats() {
  return {
    known_etfs_count: KNOWN_ETFS.length,
    providers_count: ETF_PROVIDERS.length,
    indicators_count: ETF_NAME_INDICATORS.length,
    total_detection_strategies: 4,
  };
}

/**
 * Validate that ticker is a stock (throws if ETF)
 *
 * Use this for defensive programming at service/calculation boundaries
 *
 * @param ticker - Stock ticker symbol
 * @param companyData - Optional company profile data
 * @throws Error if ticker is classified as ETF
 *
 * @example
 * assertIsStock('AAPL', profile); // OK
 * assertIsStock('SPY', profile);  // Throws: "SPY is an ETF, not an individual stock"
 */
export function assertIsStock(ticker: string, companyData?: CompanyProfile): void {
  if (isETF(ticker, companyData)) {
    const reason = getETFReason(ticker, companyData);
    throw new Error(
      `${ticker.toUpperCase()} is an ETF, not an individual stock. ` +
      `Reason: ${reason || 'ETF detected'}`
    );
  }
}

/**
 * AGENT 1D: REIT Detection and Classification (2025-10-27)
 * FIXED: Bank → REIT misclassification (2025-11-04)
 *
 * REITs require specialized valuation methods (FFO/AFFO instead of DCF).
 * This module provides detection logic and subsector classification.
 */

import { REITSubSector } from '../types/valuation';

/**
 * Detect if a company is a REIT based on profile data
 *
 * Detection strategies:
 * 1. Sector check: "Real Estate"
 * 2. Industry keywords: "REIT", "Trust", "Properties", "Realty"
 * 3. Company name patterns
 *
 * @param sector - Company sector from FMP profile
 * @param industry - Company industry from FMP profile
 * @param companyName - Company name
 * @returns true if REIT, false otherwise
 */
export function isREIT(sector: string, industry: string, companyName: string): boolean {
  // Strategy 1: Sector check
  if (sector && sector === 'Real Estate') {
    return true;
  }

  // Strategy 2: Industry keywords (null-safe)
  const reitIndustryKeywords = [
    'REIT',
    'Real Estate Investment Trust',
    'Property Trust',
    'Equity Trust',
  ];

  if (industry && reitIndustryKeywords.some(keyword => industry.includes(keyword))) {
    return true;
  }

  // Strategy 3: Company name patterns (null-safe)
  const reitNamePatterns = [
    /\bREIT\b/i,
    /\bTrust\b/i,
    /\bProperties\b$/i,
    /\bRealty\b/i,
    /Real Estate/i,
    /\bStorage\b/i,  // ADD: "Public Storage"
    /\bCommunities\b/i,  // ADD: "AvalonBay Communities"
  ];

  if (companyName && reitNamePatterns.some(pattern => pattern.test(companyName))) {
    return true;
  }

  return false;
}

/**
 * Detect if a company is a REIT based on available valuation methods
 *
 * FIXED (2025-11-04): Banks were incorrectly classified as REITs because
 * 'dividend-yield-reit' method name contains 'reit' substring.
 *
 * Solution: Require explicit REIT-specific methods (FFO/AFFO/NAV) as positive evidence.
 * The dividend-yield-reit method alone is NOT sufficient.
 *
 * @param methods - Array of method IDs available for the stock
 * @returns true if REIT (has FFO/AFFO/NAV methods), false otherwise
 *
 * @example
 * isREITByMethods(['ffo-reit', 'affo-reit', 'dividend-yield-reit']) // true (has FFO)
 * isREITByMethods(['dividend-yield-reit', 'pe-mean', 'dcf-fcf-20']) // false (no FFO/AFFO)
 */
export function isREITByMethods(methods: string[]): boolean {
  // Require explicit REIT-specific methods (positive evidence)
  // FFO (Funds From Operations) and AFFO (Adjusted FFO) are ONLY used for REITs
  const reitSpecificMethods = ['ffo', 'affo', 'p-ffo', 'nav'];

  return reitSpecificMethods.some(rm =>
    methods.some(m => m.toLowerCase().includes(rm))
  );
}

/**
 * Classify REIT subsector based on industry description
 *
 * Returns appropriate P/FFO multiple category for valuation.
 *
 * @param industry - Industry description from FMP profile
 * @returns REIT subsector category
 */
export function getREITSubSector(industry: string): REITSubSector {
  // Null-safe: if industry is null/undefined, default to 'diversified'
  if (!industry) {
    return 'diversified';
  }

  const lowerIndustry = industry.toLowerCase();

  // Data Center REITs (highest P/FFO multiples)
  if (
    lowerIndustry.includes('data center') ||
    lowerIndustry.includes('datacenter') ||
    lowerIndustry.includes('colocation')
  ) {
    return 'data-center';
  }

  // Cell Tower REITs
  if (
    lowerIndustry.includes('cell tower') ||
    lowerIndustry.includes('wireless') ||
    lowerIndustry.includes('telecommunication') ||
    lowerIndustry.includes('infrastructure')
  ) {
    return 'cell-tower';
  }

  // Industrial REITs (logistics, warehouses)
  if (
    lowerIndustry.includes('industrial') ||
    lowerIndustry.includes('warehouse') ||
    lowerIndustry.includes('logistics') ||
    lowerIndustry.includes('distribution')
  ) {
    return 'industrial';
  }

  // Residential REITs (apartments, multi-family)
  if (
    lowerIndustry.includes('residential') ||
    lowerIndustry.includes('apartment') ||
    lowerIndustry.includes('multi-family') ||
    lowerIndustry.includes('multifamily') ||
    lowerIndustry.includes('housing')
  ) {
    return 'residential';
  }

  // Retail REITs (shopping malls, retail centers)
  if (
    lowerIndustry.includes('retail') ||
    lowerIndustry.includes('shopping') ||
    lowerIndustry.includes('mall') ||
    lowerIndustry.includes('outlet')
  ) {
    return 'retail';
  }

  // Healthcare REITs (medical facilities, senior housing)
  if (
    lowerIndustry.includes('healthcare') ||
    lowerIndustry.includes('medical') ||
    lowerIndustry.includes('senior') ||
    lowerIndustry.includes('skilled nursing')
  ) {
    return 'healthcare';
  }

  // Office REITs
  if (
    lowerIndustry.includes('office') ||
    lowerIndustry.includes('commercial')
  ) {
    return 'office';
  }

  // Diversified REITs (fallback)
  return 'diversified';
}

/**
 * Get human-readable REIT classification details
 *
 * @param sector - Company sector
 * @param industry - Company industry
 * @param companyName - Company name
 * @returns Classification details object
 */
export function getREITClassificationDetails(
  sector: string,
  industry: string,
  companyName: string
) {
  const isReit = isREIT(sector, industry, companyName);
  const subsector = isReit ? getREITSubSector(industry) : null;

  return {
    is_reit: isReit,
    subsector,
    reason: isReit ? determineREITReason(sector, industry, companyName) : null,
    recommended_methods: isReit
      ? ['ffo-reit', 'affo-reit', 'p-ffo-sector', 'dividend-yield-reit']
      : null,
    avoid_methods: isReit
      ? ['dcf-fcf-20', 'dcf-terminal-fcf', 'dni-20', 'pe-mean', 'peg']
      : null,
  };
}

/**
 * Helper: Determine why a company was classified as REIT
 */
function determineREITReason(sector: string, industry: string, companyName: string): string {
  if (sector === 'Real Estate') {
    return 'Sector: Real Estate';
  }

  const reitIndustryKeywords = ['REIT', 'Real Estate Investment Trust', 'Property Trust', 'Equity Trust'];
  const matchedKeyword = reitIndustryKeywords.find(keyword => industry.includes(keyword));
  if (matchedKeyword) {
    return `Industry contains: "${matchedKeyword}"`;
  }

  const reitNamePatterns = [
    { pattern: /\bREIT\b/i, label: 'REIT' },
    { pattern: /\bTrust\b/i, label: 'Trust' },
    { pattern: /\bProperties\b$/i, label: 'Properties' },
    { pattern: /\bRealty\b/i, label: 'Realty' },
  ];

  const matchedPattern = reitNamePatterns.find(({ pattern }) => pattern.test(companyName));
  if (matchedPattern) {
    return `Company name contains: "${matchedPattern.label}"`;
  }

  return 'REIT classification (unknown reason)';
}

/**
 * AGENT 1C: Bank Detection Function
 * FIXED: Bank → REIT misclassification (2025-11-04)
 *
 * Detects if a company is a bank/financial institution that should use P/TBV valuation
 * Banks have negative/inconsistent FCF because they ARE the cash flow, making DCF inappropriate.
 *
 * Detection strategies:
 * 1. Sector match: "Financial Services", "Banks", "Financials"
 * 2. Industry match: "Banks - Regional", "Banks - Diversified", "Banks - Global", "Investment Banking & Brokerage"
 * 3. Known major banks list (top 50 US/global banks)
 * 4. Bank exceptions list (prevents false REIT classification)
 *
 * @param sector - Company sector from FMP API
 * @param industry - Company industry from FMP API
 * @param ticker - Stock ticker (optional, for known bank list check)
 * @returns true if company is a bank, false otherwise
 */
export function isBank(sector?: string, industry?: string, ticker?: string): boolean {
  // Normalize inputs
  const normalizedSector = sector?.toLowerCase() || '';
  const normalizedIndustry = industry?.toLowerCase() || '';
  const normalizedTicker = ticker?.toUpperCase() || '';

  // Strategy 1: Sector-based detection
  const bankSectors = [
    'financial services',
    'banks',
    'financials',
    'financial',
    'banking'
  ];

  if (bankSectors.some(s => normalizedSector.includes(s))) {
    // Exclude insurance, asset management, REITs from financial services
    const exclusions = ['insurance', 'asset management', 'reit', 'real estate', 'investment trust'];
    if (!exclusions.some(e => normalizedIndustry.includes(e))) {
      return true;
    }
  }

  // Strategy 2: Industry-based detection
  const bankIndustries = [
    'banks - regional',
    'banks - diversified',
    'banks - global',
    'investment banking',
    'commercial banking',
    'retail banking',
    'universal banks'
  ];

  if (bankIndustries.some(i => normalizedIndustry.includes(i))) {
    return true;
  }

  // Strategy 3: Known major banks (top 50 US/global banks by market cap)
  const KNOWN_BANKS = [
    // US Money Center Banks
    'JPM', 'BAC', 'WFC', 'C', 'USB', 'PNC', 'TFC', 'GS', 'MS', 'BK',
    // US Regional Banks
    'KEY', 'CFG', 'FITB', 'RF', 'HBAN', 'MTB', 'ZION', 'CMA', 'BOKF', 'FNB',
    // Canadian Banks
    'RY', 'TD', 'BNS', 'BMO', 'CM',
    // European Banks
    'HSBC', 'BCS', 'DB', 'UBS', 'CS', 'SAN', 'BBVA',
    // Asian Banks
    'MUFG', 'SMFG', 'DBS'
  ];

  if (normalizedTicker && KNOWN_BANKS.includes(normalizedTicker)) {
    return true;
  }

  return false;
}

/**
 * Bank exceptions list - Stocks that should NEVER be classified as REITs
 * Used by validation scripts to prevent false positives
 *
 * FIXED (2025-11-04): Banks have 'dividend-yield-reit' in available methods,
 * which was triggering incorrect REIT classification in validation scripts.
 */
export const BANK_EXCEPTIONS = [
  // US Money Center Banks
  'JPM', 'BAC', 'WFC', 'C',
  // Investment Banks
  'GS', 'MS',
  // Regional Banks
  'USB', 'PNC', 'TFC', 'COF', 'KEY', 'CFG', 'FITB',
  // Specialty Banks
  'BK', 'SCHW', 'AXP', 'DFS', 'SYF', 'NTRS', 'STT',
];

/**
 * AGENT 1C: Bank Type Classification
 *
 * Classifies banks into categories for appropriate P/TBV benchmark selection:
 * - Large Money Center Banks: P/TBV = 1.2-1.5x (JPM, BAC, C, WFC)
 * - Regional Banks: P/TBV = 0.8-1.2x (USB, PNC, TFC, KEY)
 * - Investment Banks: P/TBV = 1.0-1.3x (GS, MS)
 *
 * @param ticker - Stock ticker
 * @param industry - Company industry from FMP API
 * @returns Bank type classification
 */
export function getBankType(ticker: string, industry?: string): 'large' | 'regional' | 'investment' {
  const normalizedTicker = ticker.toUpperCase();
  const normalizedIndustry = industry?.toLowerCase() || '';

  // Large money center banks (systemically important, >$500B assets)
  const largeBanks = ['JPM', 'BAC', 'WFC', 'C'];
  if (largeBanks.includes(normalizedTicker)) {
    return 'large';
  }

  // Investment banks (focus on trading, advisory, underwriting)
  const investmentBanks = ['GS', 'MS'];
  if (investmentBanks.includes(normalizedTicker) || normalizedIndustry.includes('investment banking')) {
    return 'investment';
  }

  // Default to regional (includes super-regionals like USB, PNC)
  return 'regional';
}

/**
 * AGENT 1C: Sector Average P/TBV Benchmarks
 *
 * Research-backed P/TBV benchmarks by bank type
 * Sources: Goldman Sachs Equity Research, Morgan Stanley Bank Coverage, JPMorgan Banking Analysis
 *
 * @param bankType - Bank classification
 * @returns Sector average P/TBV ratio
 */
export function getSectorPTBVBenchmark(bankType: 'large' | 'regional' | 'investment'): number {
  const benchmarks = {
    large: 1.35,       // Large money center banks (1.2-1.5x range)
    regional: 1.00,    // Regional banks (0.8-1.2x range)
    investment: 1.15   // Investment banks (1.0-1.3x range)
  };

  return benchmarks[bankType];
}

/**
 * FASE 2C: Growth Stock Detection (2025-10-28)
 *
 * Identifies high-growth stocks that should use specialized valuation methods:
 * - Growth DCF-8Y (shorter time horizon, higher growth rates)
 * - Higher G_1_5 allowance (up to 50% vs standard 30%)
 * - Less aggressive decay factors
 *
 * Detection Criteria (following hedge fund best practices):
 * 1. Beta > 1.5 (high volatility/growth stocks)
 * 2. Historical EPS growth > 20% CAGR (sustained high earnings growth)
 * 3. Revenue growth > 15% CAGR (top-line expansion)
 * 4. Tech sector bias (but not exclusive)
 *
 * Examples:
 * - NVDA: Beta ~1.8, 40%+ revenue growth, AI datacenter demand
 * - TSLA: Beta ~2.0, 30-40% delivery growth, EV market expansion
 * - AMZN: Beta ~1.2, 20-25% growth, AWS + retail dominance
 * - GOOGL: Beta ~1.1, 15-20% growth, search + cloud + AI
 *
 * @param beta - Stock beta from profile (volatility vs market)
 * @param epsGrowth - Historical EPS CAGR (5-year) as decimal (e.g., 0.20 = 20%)
 * @param revenueGrowth - Historical revenue CAGR (5-year) as decimal
 * @param sector - Optional: Company sector (boosts Tech/Consumer Cyclical)
 * @returns true if classified as growth stock, false otherwise
 */
export function isGrowthStock(
  beta: number,
  epsGrowth: number,
  revenueGrowth: number,
  sector?: string
): boolean {
  // Criteria 1: High beta (volatility indicator for growth stocks)
  const highBeta = beta > 1.5;

  // Criteria 2: Strong EPS growth
  const strongEpsGrowth = epsGrowth > 0.20; // 20%+ CAGR

  // Criteria 3: Strong revenue growth
  const strongRevenueGrowth = revenueGrowth > 0.15; // 15%+ CAGR

  // Criteria 4: Tech sector boost (optional but common)
  const techSectorBias = sector?.toLowerCase().includes('tech') ||
                          sector?.toLowerCase().includes('consumer cyclical') ||
                          sector?.toLowerCase().includes('communication');

  // Classification logic:
  // - Must meet at least 2 of 3 core criteria (beta, EPS, revenue)
  // - Tech sector can substitute for 1 criterion if others are borderline
  const coreScore = [highBeta, strongEpsGrowth, strongRevenueGrowth].filter(Boolean).length;

  // Strict classification: 2+ core criteria OR tech + 1 core
  if (coreScore >= 2) {
    return true;
  }

  // Relaxed classification: Tech sector + 1 strong criterion
  if (techSectorBias && coreScore >= 1) {
    // Additional check: ensure at least moderate growth metrics
    if (beta > 1.2 && (epsGrowth > 0.15 || revenueGrowth > 0.12)) {
      return true;
    }
  }

  return false;
}

/**
 * Get human-readable reason why stock is classified as growth stock
 *
 * @param beta - Stock beta
 * @param epsGrowth - EPS CAGR (decimal)
 * @param revenueGrowth - Revenue CAGR (decimal)
 * @param sector - Company sector
 * @returns Reason string if growth stock, null otherwise
 */
export function getGrowthStockReason(
  beta: number,
  epsGrowth: number,
  revenueGrowth: number,
  sector?: string
): string | null {
  if (!isGrowthStock(beta, epsGrowth, revenueGrowth, sector)) {
    return null;
  }

  const reasons: string[] = [];

  if (beta > 1.5) {
    reasons.push(`High beta (${beta.toFixed(2)}, volatility indicator)`);
  }

  if (epsGrowth > 0.20) {
    reasons.push(`Strong EPS growth (${(epsGrowth * 100).toFixed(1)}% CAGR)`);
  }

  if (revenueGrowth > 0.15) {
    reasons.push(`Strong revenue growth (${(revenueGrowth * 100).toFixed(1)}% CAGR)`);
  }

  if (sector?.toLowerCase().includes('tech') ||
      sector?.toLowerCase().includes('consumer cyclical')) {
    reasons.push(`Growth-oriented sector (${sector})`);
  }

  return reasons.join(', ');
}

/**
 * Get growth stock classification details with recommended methods
 *
 * @param beta - Stock beta
 * @param epsGrowth - EPS CAGR (decimal)
 * @param revenueGrowth - Revenue CAGR (decimal)
 * @param sector - Company sector
 * @returns Classification details object
 */
export function getGrowthStockDetails(
  beta: number,
  epsGrowth: number,
  revenueGrowth: number,
  sector?: string
) {
  const isGrowth = isGrowthStock(beta, epsGrowth, revenueGrowth, sector);
  const reason = getGrowthStockReason(beta, epsGrowth, revenueGrowth, sector);

  return {
    is_growth_stock: isGrowth,
    reason,
    metrics: {
      beta: beta.toFixed(2),
      eps_growth_cagr: (epsGrowth * 100).toFixed(1) + '%',
      revenue_growth_cagr: (revenueGrowth * 100).toFixed(1) + '%',
      sector: sector || 'Unknown',
    },
    recommended_methods: isGrowth
      ? ['growth-dcf-8y', 'peg', 'psg', 'dcf-fcf-20']
      : ['dcf-fcf-20', 'dcf-terminal-fcf', 'pe-mean', 'ps-mean'],
    growth_parameters: isGrowth
      ? {
          max_g1_5: '50%',
          retention_factor: '70%',
          terminal_growth: '3-5%',
          time_horizon: '8 years',
        }
      : null,
  };
}
