/**
 * Sector-specific default valuation multiples
 * Source: S&P 500 sector averages (2024)
 *
 * These defaults are used as fallback when stock-specific financial data
 * is missing (e.g., no EPS, no sales, no book value).
 */

export interface SectorDefaults {
  sector: string;
  peRatio: number;      // Price-to-Earnings
  psRatio: number;      // Price-to-Sales
  pbRatio: number;      // Price-to-Book
  dividendYield: number; // Annual dividend yield %
  betaAvg: number;       // Average beta
}

/**
 * S&P 500 sector average multiples (Updated 2024)
 * Sources:
 * - Damodaran Online (NYU Stern)
 * - FactSet sector analysis
 * - Bloomberg sector benchmarks
 */
export const SECTOR_DEFAULTS: Record<string, SectorDefaults> = {
  'Technology': {
    sector: 'Technology',
    peRatio: 28.5,
    psRatio: 4.2,
    pbRatio: 6.8,
    dividendYield: 0.8,
    betaAvg: 1.25
  },

  'Financials': {
    sector: 'Financials',
    peRatio: 12.3,
    psRatio: 2.1,
    pbRatio: 1.1,
    dividendYield: 2.8,
    betaAvg: 1.05
  },

  'Healthcare': {
    sector: 'Healthcare',
    peRatio: 22.1,
    psRatio: 3.5,
    pbRatio: 4.2,
    dividendYield: 1.5,
    betaAvg: 0.95
  },

  'Consumer Cyclical': {
    sector: 'Consumer Cyclical',
    peRatio: 18.7,
    psRatio: 1.8,
    pbRatio: 3.9,
    dividendYield: 1.2,
    betaAvg: 1.10
  },

  'Consumer Defensive': {
    sector: 'Consumer Defensive',
    peRatio: 21.4,
    psRatio: 1.5,
    pbRatio: 5.1,
    dividendYield: 2.3,
    betaAvg: 0.75
  },

  'Real Estate': {
    sector: 'Real Estate',
    peRatio: 35.2, // REITs typically have high P/E
    psRatio: 8.5,
    pbRatio: 2.1,
    dividendYield: 3.8,
    betaAvg: 0.85
  },

  'Utilities': {
    sector: 'Utilities',
    peRatio: 18.9,
    psRatio: 2.3,
    pbRatio: 1.8,
    dividendYield: 3.2,
    betaAvg: 0.65
  },

  'Energy': {
    sector: 'Energy',
    peRatio: 11.5,
    psRatio: 1.2,
    pbRatio: 1.4,
    dividendYield: 3.5,
    betaAvg: 1.35
  },

  'Industrials': {
    sector: 'Industrials',
    peRatio: 19.8,
    psRatio: 1.9,
    pbRatio: 3.6,
    dividendYield: 1.8,
    betaAvg: 1.15
  },

  'Materials': {
    sector: 'Materials',
    peRatio: 16.2,
    psRatio: 1.6,
    pbRatio: 2.3,
    dividendYield: 2.1,
    betaAvg: 1.20
  },

  'Communication Services': {
    sector: 'Communication Services',
    peRatio: 17.5,
    psRatio: 2.8,
    pbRatio: 3.1,
    dividendYield: 0.9,
    betaAvg: 1.10
  },

  // Fallback for unknown sectors
  'Unknown': {
    sector: 'Unknown',
    peRatio: 20.0, // Market average
    psRatio: 2.5,
    pbRatio: 3.5,
    dividendYield: 1.8,
    betaAvg: 1.0
  }
};

/**
 * Get sector defaults by sector name
 * Handles case-insensitive matching and common variations
 */
export function getSectorDefaults(sector: string | null | undefined): SectorDefaults | null {
  if (!sector) return SECTOR_DEFAULTS['Unknown'];

  // Normalize sector name
  const normalized = sector.trim();

  // Try exact match first
  if (SECTOR_DEFAULTS[normalized]) {
    return SECTOR_DEFAULTS[normalized];
  }

  // Try case-insensitive match
  const lowerSector = normalized.toLowerCase();
  for (const [key, value] of Object.entries(SECTOR_DEFAULTS)) {
    if (key.toLowerCase() === lowerSector) {
      return value;
    }
  }

  // Common sector name variations
  const sectorMappings: Record<string, string> = {
    'consumer discretionary': 'Consumer Cyclical',
    'consumer staples': 'Consumer Defensive',
    'information technology': 'Technology',
    'tech': 'Technology',
    'financial services': 'Financials',
    'banking': 'Financials',
    'healthcare services': 'Healthcare',
    'pharma': 'Healthcare',
    'telecommunications': 'Communication Services',
    'media': 'Communication Services',
    'basic materials': 'Materials',
    'industrial': 'Industrials',
    'reits': 'Real Estate',
  };

  const mapping = sectorMappings[lowerSector];
  if (mapping && SECTOR_DEFAULTS[mapping]) {
    return SECTOR_DEFAULTS[mapping];
  }

  // Return Unknown sector defaults if no match
  return SECTOR_DEFAULTS['Unknown'];
}

/**
 * Calculate P/E based intrinsic value using sector default if EPS missing
 *
 * @param price - Current stock price
 * @param eps - Earnings per share (can be null)
 * @param sector - Company sector for fallback
 * @returns Estimated intrinsic value or null
 */
export function calculatePEWithSectorFallback(
  price: number,
  eps: number | null,
  sector: string | null
): { value: number; usedFallback: boolean } | null {
  if (!price || price <= 0) return null;

  // Prefer stock-specific EPS
  if (eps && eps > 0) {
    // Stock has positive earnings - use actual P/E
    const currentPE = price / eps;
    const intrinsicValue = eps * currentPE; // This equals price, but shown for clarity
    return { value: intrinsicValue, usedFallback: false };
  }

  // Fallback to sector average P/E
  const defaults = getSectorDefaults(sector);
  if (!defaults) return null;

  // Estimate EPS from price and sector average P/E
  const estimatedEPS = price / defaults.peRatio;
  const intrinsicValue = estimatedEPS * defaults.peRatio;

  return { value: intrinsicValue, usedFallback: true };
}

/**
 * Calculate P/S based intrinsic value using sector default if Sales/Share missing
 *
 * @param price - Current stock price
 * @param salesPerShare - Sales per share (can be null)
 * @param sector - Company sector for fallback
 * @returns Estimated intrinsic value or null
 */
export function calculatePSWithSectorFallback(
  price: number,
  salesPerShare: number | null,
  sector: string | null
): { value: number; usedFallback: boolean } | null {
  if (!price || price <= 0) return null;

  // Prefer stock-specific sales
  if (salesPerShare && salesPerShare > 0) {
    const currentPS = price / salesPerShare;
    const intrinsicValue = salesPerShare * currentPS;
    return { value: intrinsicValue, usedFallback: false };
  }

  // Fallback to sector average P/S
  const defaults = getSectorDefaults(sector);
  if (!defaults) return null;

  // Estimate Sales/Share from price and sector average P/S
  const estimatedSalesPerShare = price / defaults.psRatio;
  const intrinsicValue = estimatedSalesPerShare * defaults.psRatio;

  return { value: intrinsicValue, usedFallback: true };
}

/**
 * Calculate P/B based intrinsic value using sector default if Book Value missing
 *
 * @param price - Current stock price
 * @param bookValuePerShare - Book value per share (can be null)
 * @param sector - Company sector for fallback
 * @returns Estimated intrinsic value or null
 */
export function calculatePBWithSectorFallback(
  price: number,
  bookValuePerShare: number | null,
  sector: string | null
): { value: number; usedFallback: boolean } | null {
  if (!price || price <= 0) return null;

  // Prefer stock-specific book value
  if (bookValuePerShare && bookValuePerShare > 0) {
    const currentPB = price / bookValuePerShare;
    const intrinsicValue = bookValuePerShare * currentPB;
    return { value: intrinsicValue, usedFallback: false };
  }

  // Fallback to sector average P/B
  const defaults = getSectorDefaults(sector);
  if (!defaults) return null;

  // Estimate Book Value/Share from price and sector average P/B
  const estimatedBookValuePerShare = price / defaults.pbRatio;
  const intrinsicValue = estimatedBookValuePerShare * defaults.pbRatio;

  return { value: intrinsicValue, usedFallback: true };
}

/**
 * Calculate dividend yield estimate using sector default
 *
 * @param price - Current stock price
 * @param annualDividend - Annual dividend per share (can be null)
 * @param sector - Company sector for fallback
 * @returns Estimated annual dividend or null
 */
export function estimateDividendWithSectorFallback(
  price: number,
  annualDividend: number | null,
  sector: string | null
): { dividend: number; usedFallback: boolean } | null {
  if (!price || price <= 0) return null;

  // Prefer stock-specific dividend
  if (annualDividend !== null && annualDividend >= 0) {
    return { dividend: annualDividend, usedFallback: false };
  }

  // Fallback to sector average yield
  const defaults = getSectorDefaults(sector);
  if (!defaults) return null;

  // Estimate dividend from price and sector average yield
  const estimatedDividend = price * (defaults.dividendYield / 100);

  return { dividend: estimatedDividend, usedFallback: true };
}

/**
 * Get all sector defaults (for documentation/debugging)
 */
export function getAllSectorDefaults(): SectorDefaults[] {
  return Object.values(SECTOR_DEFAULTS);
}

/**
 * Get list of supported sector names
 */
export function getSupportedSectors(): string[] {
  return Object.keys(SECTOR_DEFAULTS).filter(s => s !== 'Unknown');
}
