/**
 * GICS Sector Type Definitions
 *
 * Global Industry Classification Standard (GICS) is a standardized
 * classification system for equities developed by MSCI and S&P.
 *
 * 11 sectors as defined by GICS:
 * - Energy (10)
 * - Materials (15)
 * - Industrials (20)
 * - Consumer Discretionary (25)
 * - Consumer Staples (30)
 * - Health Care (35)
 * - Financials (40)
 * - Information Technology (45)
 * - Communication Services (50)
 * - Utilities (55)
 * - Real Estate (60)
 */

export interface GICSStock {
  symbol: string;
  gicsSector: string;
  gicsCode: number;
  region: string;
  companyName?: string;
  exchange?: string;
}

export interface GICSSector {
  name: string;
  code: number;
  description: string;
  stockCount: number;
}

export interface SectorSummary {
  sector: string;
  code: number;
  stockCount: number;
  topStocks: string[];
  regions: {
    US: number;
    EU: number;
    China: number;
    Other: number;
  };
}

export interface SectorStats {
  sector: string;
  code: number;
  totalStocks: number;
  avgMarketCap?: number;
  topPerformers: string[];
  bottomPerformers: string[];
  regionBreakdown: {
    US: number;
    EU: number;
    China: number;
    Other: number;
  };
}

export interface SectorDistribution {
  sector: string;
  code: number;
  count: number;
  percentage: number;
}

/**
 * Standard GICS sector codes mapping
 */
export const GICS_SECTORS = {
  ENERGY: { code: 10, name: 'Energy' },
  MATERIALS: { code: 15, name: 'Materials' },
  INDUSTRIALS: { code: 20, name: 'Industrials' },
  CONSUMER_DISCRETIONARY: { code: 25, name: 'Consumer Discretionary' },
  CONSUMER_STAPLES: { code: 30, name: 'Consumer Staples' },
  HEALTH_CARE: { code: 35, name: 'Health Care' },
  FINANCIALS: { code: 40, name: 'Financials' },
  INFORMATION_TECHNOLOGY: { code: 45, name: 'Information Technology' },
  COMMUNICATION_SERVICES: { code: 50, name: 'Communication Services' },
  UTILITIES: { code: 55, name: 'Utilities' },
  REAL_ESTATE: { code: 60, name: 'Real Estate' },
} as const;

/**
 * Helper function to get sector code from name
 */
export function getSectorCode(sectorName: string): number | null {
  const normalized = sectorName.toLowerCase().trim();

  for (const [key, value] of Object.entries(GICS_SECTORS)) {
    if (value.name.toLowerCase() === normalized) {
      return value.code;
    }
  }

  return null;
}

/**
 * Helper function to get sector name from code
 */
export function getSectorName(code: number): string | null {
  for (const [key, value] of Object.entries(GICS_SECTORS)) {
    if (value.code === code) {
      return value.name;
    }
  }

  return null;
}

/**
 * Normalize sector names from various APIs to GICS standard
 */
export function normalizeSectorName(apiSector: string): string {
  const normalized = apiSector.toLowerCase().trim();

  // Direct matches
  const directMatches: Record<string, string> = {
    'energy': GICS_SECTORS.ENERGY.name,
    'materials': GICS_SECTORS.MATERIALS.name,
    'basic materials': GICS_SECTORS.MATERIALS.name,
    'industrials': GICS_SECTORS.INDUSTRIALS.name,
    'consumer discretionary': GICS_SECTORS.CONSUMER_DISCRETIONARY.name,
    'consumer cyclical': GICS_SECTORS.CONSUMER_DISCRETIONARY.name,
    'consumer staples': GICS_SECTORS.CONSUMER_STAPLES.name,
    'consumer defensive': GICS_SECTORS.CONSUMER_STAPLES.name,
    'health care': GICS_SECTORS.HEALTH_CARE.name,
    'healthcare': GICS_SECTORS.HEALTH_CARE.name,
    'financials': GICS_SECTORS.FINANCIALS.name,
    'financial services': GICS_SECTORS.FINANCIALS.name,
    'information technology': GICS_SECTORS.INFORMATION_TECHNOLOGY.name,
    'technology': GICS_SECTORS.INFORMATION_TECHNOLOGY.name,
    'communication services': GICS_SECTORS.COMMUNICATION_SERVICES.name,
    'telecommunications': GICS_SECTORS.COMMUNICATION_SERVICES.name,
    'utilities': GICS_SECTORS.UTILITIES.name,
    'real estate': GICS_SECTORS.REAL_ESTATE.name,
  };

  return directMatches[normalized] || apiSector;
}

/**
 * Validate if a sector is a valid GICS sector
 */
export function isValidGICSSector(sector: string): boolean {
  const normalized = normalizeSectorName(sector);
  return Object.values(GICS_SECTORS).some(s => s.name === normalized);
}
