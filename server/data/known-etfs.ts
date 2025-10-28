/**
 * Comprehensive list of known ETFs
 * Updated: 2025-10-24
 * Source: Major US + International exchanges
 *
 * This list is used for early detection of ETFs to prevent
 * intrinsic value calculations on fund instruments.
 */

export const KNOWN_ETFS: string[] = [
  // === US MARKET BROAD (15) ===
  'SPY', 'QQQ', 'IWM', 'DIA', 'VOO', 'IVV', 'VTI', 'VTV', 'VUG', 'VEA',
  'VWO', 'VXUS', 'ITOT', 'SCHB', 'RSP',

  // === SECTOR - SPDR (11 official sectors) ===
  'XLF', 'XLE', 'XLK', 'XLV', 'XLI', 'XLP', 'XLU', 'XLB', 'XLY', 'XLRE', 'XLC',

  // === INTERNATIONAL (12) ===
  'EFA', 'EEM', 'IEFA', 'IEMG', 'VEA', 'VWO', 'IXUS', 'VXUS', 'SCHF', 'EWJ',
  'EWZ', 'FXI',

  // === FIXED INCOME (15) ===
  'AGG', 'BND', 'LQD', 'HYG', 'TLT', 'SHY', 'IEF', 'MUB', 'VCIT', 'VCSH',
  'BNDX', 'EMB', 'JNK', 'TIP', 'GOVT',

  // === COMMODITIES (10) ===
  'GLD', 'SLV', 'USO', 'IAU', 'DBC', 'DBA', 'UNG', 'GSG', 'PDBC', 'BCI',

  // === THEMATIC - ARK Invest (5) ===
  'ARKK', 'ARKG', 'ARKW', 'ARKF', 'ARKQ',

  // === VOLATILITY & LEVERAGED (12) ===
  'VXX', 'UVXY', 'VIXY', 'SVXY', 'TQQQ', 'SQQQ', 'UPRO', 'SPXU', 'TNA',
  'TZA', 'FAS', 'FAZ',

  // === DIVIDEND FOCUSED (8) ===
  'VYM', 'SCHD', 'DVY', 'SDY', 'VIG', 'DGRO', 'SPHD', 'HDV',

  // === GROWTH & VALUE (6) ===
  'IWF', 'IWD', 'VUG', 'VTV', 'SPYG', 'SPYV',

  // === REAL ESTATE (4) ===
  'VNQ', 'XLRE', 'IYR', 'SCHH',

  // === TECHNOLOGY SPECIFIC (6) ===
  'XLK', 'VGT', 'IGV', 'QTEC', 'SOXX', 'SMH',

  // === EUROPEAN TICKERS (10) ===
  'IWDA.AS', 'CSPX.L', 'VWCE.DE', 'EUNL.DE', 'VUSA.L', 'IUSA.L',
  'VUAA.AS', 'SWDA.L', 'SSAC.L', 'IUAG.DE',

  // === SMART BETA & FACTOR (8) ===
  'MTUM', 'USMV', 'VLUE', 'SIZE', 'QUAL', 'SPHD', 'SPLV', 'DGRW',

  // === CRYPTO & ALTERNATIVE (4) ===
  'BITO', 'GBTC', 'ETHE', 'BLOK',

  // === EMERGING & FRONTIER (5) ===
  'EEM', 'VWO', 'IEMG', 'EWY', 'EWT',

  // === SMALL CAP & MID CAP (6) ===
  'IWM', 'IJH', 'MDY', 'VB', 'VO', 'SCHA',
];

/**
 * Major ETF providers - used for name-based detection
 */
export const ETF_PROVIDERS = [
  'ishares',
  'vanguard',
  'spdr',
  'invesco',
  'proshares',
  'ark invest',
  'ark innovation',
  'state street',
  'blackrock',
  'wisdomtree',
  'first trust',
  'global x',
  'direxion',
  'vaneck',
  'schwab',
  'fidelity',
];

/**
 * ETF name indicators - keywords that suggest ETF/fund structure
 */
export const ETF_NAME_INDICATORS = [
  'etf',
  'fund',
  'trust',
  'index',
  'tracker',
  'portfolio',
];

/**
 * Get count of known ETFs
 */
export function getKnownETFCount(): number {
  return KNOWN_ETFS.length;
}

/**
 * Check if ticker exists in known ETF list
 */
export function isInKnownETFList(ticker: string): boolean {
  return KNOWN_ETFS.includes(ticker.toUpperCase());
}
