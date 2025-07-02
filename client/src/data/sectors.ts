/**
 * Stock to Sector Mapping for Alfalyzer
 * Comprehensive mapping of top 100+ stocks to their respective sectors
 */

import { Sector } from '../../../shared/types/sectors';

export const STOCK_SECTORS: Record<string, Sector> = {
  // Information Technology
  'AAPL': Sector.INFORMATION_TECHNOLOGY,
  'MSFT': Sector.INFORMATION_TECHNOLOGY,
  'NVDA': Sector.INFORMATION_TECHNOLOGY,
  'INTC': Sector.INFORMATION_TECHNOLOGY,
  'AMD': Sector.INFORMATION_TECHNOLOGY,
  'CRM': Sector.INFORMATION_TECHNOLOGY,
  'ORCL': Sector.INFORMATION_TECHNOLOGY,
  'ADBE': Sector.INFORMATION_TECHNOLOGY,
  'NOW': Sector.INFORMATION_TECHNOLOGY,
  'IBM': Sector.INFORMATION_TECHNOLOGY,
  'QCOM': Sector.INFORMATION_TECHNOLOGY,
  'TXN': Sector.INFORMATION_TECHNOLOGY,
  'AVGO': Sector.INFORMATION_TECHNOLOGY,
  'HPQ': Sector.INFORMATION_TECHNOLOGY,
  'DELL': Sector.INFORMATION_TECHNOLOGY,

  // Communication Services
  'GOOGL': Sector.COMMUNICATION_SERVICES,
  'GOOG': Sector.COMMUNICATION_SERVICES,
  'META': Sector.COMMUNICATION_SERVICES,
  'NFLX': Sector.COMMUNICATION_SERVICES,
  'DIS': Sector.COMMUNICATION_SERVICES,
  'VZ': Sector.COMMUNICATION_SERVICES,
  'T': Sector.COMMUNICATION_SERVICES,
  'CMCSA': Sector.COMMUNICATION_SERVICES,
  'TMUS': Sector.COMMUNICATION_SERVICES,
  'CHTR': Sector.COMMUNICATION_SERVICES,
  'DISH': Sector.COMMUNICATION_SERVICES,
  'TWTR': Sector.COMMUNICATION_SERVICES,
  'SNAP': Sector.COMMUNICATION_SERVICES,
  'PINS': Sector.COMMUNICATION_SERVICES,
  'ROKU': Sector.COMMUNICATION_SERVICES,

  // Consumer Discretionary
  'AMZN': Sector.CONSUMER_DISCRETIONARY,
  'TSLA': Sector.CONSUMER_DISCRETIONARY,
  'HD': Sector.CONSUMER_DISCRETIONARY,
  'MCD': Sector.CONSUMER_DISCRETIONARY,
  'SBUX': Sector.CONSUMER_DISCRETIONARY,
  'NKE': Sector.CONSUMER_DISCRETIONARY,
  'LOW': Sector.CONSUMER_DISCRETIONARY,
  'TJX': Sector.CONSUMER_DISCRETIONARY,
  'BKNG': Sector.CONSUMER_DISCRETIONARY,
  'GM': Sector.CONSUMER_DISCRETIONARY,
  'F': Sector.CONSUMER_DISCRETIONARY,
  'ABNB': Sector.CONSUMER_DISCRETIONARY,
  'EBAY': Sector.CONSUMER_DISCRETIONARY,
  'MAR': Sector.CONSUMER_DISCRETIONARY,
  'MGM': Sector.CONSUMER_DISCRETIONARY,

  // Financials
  'JPM': Sector.FINANCIALS,
  'BAC': Sector.FINANCIALS,
  'WFC': Sector.FINANCIALS,
  'GS': Sector.FINANCIALS,
  'MS': Sector.FINANCIALS,
  'C': Sector.FINANCIALS,
  'USB': Sector.FINANCIALS,
  'PNC': Sector.FINANCIALS,
  'BLK': Sector.FINANCIALS,
  'AXP': Sector.FINANCIALS,
  'V': Sector.FINANCIALS,
  'MA': Sector.FINANCIALS,
  'PYPL': Sector.FINANCIALS,
  'SQ': Sector.FINANCIALS,
  'COIN': Sector.FINANCIALS,

  // Healthcare
  'JNJ': Sector.HEALTHCARE,
  'PFE': Sector.HEALTHCARE,
  'UNH': Sector.HEALTHCARE,
  'ABBV': Sector.HEALTHCARE,
  'TMO': Sector.HEALTHCARE,
  'ABT': Sector.HEALTHCARE,
  'LLY': Sector.HEALTHCARE,
  'MRK': Sector.HEALTHCARE,
  'MDT': Sector.HEALTHCARE,
  'AMGN': Sector.HEALTHCARE,
  'GILD': Sector.HEALTHCARE,
  'BMY': Sector.HEALTHCARE,
  'CVS': Sector.HEALTHCARE,
  'ANTM': Sector.HEALTHCARE,
  'CI': Sector.HEALTHCARE,

  // Consumer Staples
  'PG': Sector.CONSUMER_STAPLES,
  'KO': Sector.CONSUMER_STAPLES,
  'PEP': Sector.CONSUMER_STAPLES,
  'WMT': Sector.CONSUMER_STAPLES,
  'COST': Sector.CONSUMER_STAPLES,
  'CL': Sector.CONSUMER_STAPLES,
  'KMB': Sector.CONSUMER_STAPLES,
  'GIS': Sector.CONSUMER_STAPLES,
  'K': Sector.CONSUMER_STAPLES,
  'HSY': Sector.CONSUMER_STAPLES,
  'CPB': Sector.CONSUMER_STAPLES,
  'CAG': Sector.CONSUMER_STAPLES,
  'KR': Sector.CONSUMER_STAPLES,
  'SYY': Sector.CONSUMER_STAPLES,
  'ADM': Sector.CONSUMER_STAPLES,

  // Energy
  'XOM': Sector.ENERGY,
  'CVX': Sector.ENERGY,
  'COP': Sector.ENERGY,
  'EOG': Sector.ENERGY,
  'SLB': Sector.ENERGY,
  'PSX': Sector.ENERGY,
  'VLO': Sector.ENERGY,
  'MPC': Sector.ENERGY,
  'OXY': Sector.ENERGY,
  'BKR': Sector.ENERGY,
  'HAL': Sector.ENERGY,
  'DVN': Sector.ENERGY,
  'FANG': Sector.ENERGY,
  'MRO': Sector.ENERGY,
  'APA': Sector.ENERGY,

  // Industrials
  'BA': Sector.INDUSTRIALS,
  'CAT': Sector.INDUSTRIALS,
  'MMM': Sector.INDUSTRIALS,
  'GE': Sector.INDUSTRIALS,
  'HON': Sector.INDUSTRIALS,
  'UPS': Sector.INDUSTRIALS,
  'RTX': Sector.INDUSTRIALS,
  'LMT': Sector.INDUSTRIALS,
  'NOC': Sector.INDUSTRIALS,
  'GD': Sector.INDUSTRIALS,
  'DE': Sector.INDUSTRIALS,
  'EMR': Sector.INDUSTRIALS,
  'ITW': Sector.INDUSTRIALS,
  'WM': Sector.INDUSTRIALS,
  'RSG': Sector.INDUSTRIALS,

  // Materials
  'LIN': Sector.MATERIALS,
  'SHW': Sector.MATERIALS,
  'APD': Sector.MATERIALS,
  'ECL': Sector.MATERIALS,
  'FCX': Sector.MATERIALS,
  'NEM': Sector.MATERIALS,
  'DOW': Sector.MATERIALS,
  'DD': Sector.MATERIALS,
  'PPG': Sector.MATERIALS,
  'CF': Sector.MATERIALS,
  'MOS': Sector.MATERIALS,
  'ALB': Sector.MATERIALS,
  'FMC': Sector.MATERIALS,
  'LYB': Sector.MATERIALS,
  'CE': Sector.MATERIALS,

  // Utilities
  'NEE': Sector.UTILITIES,
  'DUK': Sector.UTILITIES,
  'SO': Sector.UTILITIES,
  'D': Sector.UTILITIES,
  'AEP': Sector.UTILITIES,
  'EXC': Sector.UTILITIES,
  'XEL': Sector.UTILITIES,
  'PEG': Sector.UTILITIES,
  'SRE': Sector.UTILITIES,
  'ED': Sector.UTILITIES,
  'EIX': Sector.UTILITIES,
  'WEC': Sector.UTILITIES,
  'AWK': Sector.UTILITIES,
  'ATO': Sector.UTILITIES,
  'CMS': Sector.UTILITIES,

  // Real Estate
  'AMT': Sector.REAL_ESTATE,
  'PLD': Sector.REAL_ESTATE,
  'CCI': Sector.REAL_ESTATE,
  'EQIX': Sector.REAL_ESTATE,
  'PSA': Sector.REAL_ESTATE,
  'O': Sector.REAL_ESTATE,
  'WELL': Sector.REAL_ESTATE,
  'SPG': Sector.REAL_ESTATE,
  'DLR': Sector.REAL_ESTATE,
  'BXP': Sector.REAL_ESTATE,
  'VTR': Sector.REAL_ESTATE,
  'ARE': Sector.REAL_ESTATE,
  'UDR': Sector.REAL_ESTATE,
  'EQR': Sector.REAL_ESTATE,
  'AVB': Sector.REAL_ESTATE,
};

/**
 * Get sector for a given stock symbol
 */
export function getStockSector(symbol: string): Sector {
  return STOCK_SECTORS[symbol.toUpperCase()] || Sector.OTHER;
}

/**
 * Get all stocks for a given sector
 */
export function getStocksBySector(sector: Sector): string[] {
  return Object.entries(STOCK_SECTORS)
    .filter(([_, stockSector]) => stockSector === sector)
    .map(([symbol]) => symbol);
}

/**
 * Get sector statistics
 */
export function getSectorStats() {
  const sectorCounts: Record<Sector, number> = {} as Record<Sector, number>;
  
  Object.values(STOCK_SECTORS).forEach(sector => {
    sectorCounts[sector] = (sectorCounts[sector] || 0) + 1;
  });

  return sectorCounts;
}

/**
 * Check if stock exists in our mapping
 */
export function isStockMapped(symbol: string): boolean {
  return symbol.toUpperCase() in STOCK_SECTORS;
}