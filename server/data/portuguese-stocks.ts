/**
 * Portuguese Stock Mappings
 *
 * Complete list of Portuguese stocks traded on Euronext Lisbon (formerly Lisbon Stock Exchange).
 * Maps user-friendly symbols (JMT-LS) to FMP API symbols (JMT.LS).
 *
 * Data source: Euronext Lisbon official listings
 * Last updated: 2025-11-05
 */

export interface PortugueseStockMapping {
  userSymbol: string;      // User input format (e.g., "JMT-LS")
  fmpSymbol: string;        // FMP API format (e.g., "JMT.LS")
  name: string;             // Company name
  isin: string;             // International Securities Identification Number
  sector: string;           // Business sector
  alternatives: string[];   // Alternative symbols to try if primary fails
}

export const PORTUGUESE_STOCKS: PortugueseStockMapping[] = [
  // PSI 20 (Main Index Components)
  {
    userSymbol: 'NOS-LS',
    fmpSymbol: 'NOS.LS',
    name: 'NOS SGPS SA',
    isin: 'PTZON0AM0006',
    sector: 'Telecommunications',
    alternatives: ['NOS']
  },
  {
    userSymbol: 'JMT-LS',
    fmpSymbol: 'JMT.LS',
    name: 'Jerónimo Martins SGPS SA',
    isin: 'PTJMT0AE0001',
    sector: 'Consumer Retail',
    alternatives: ['JMT']
  },
  {
    userSymbol: 'ALTRI-LS',
    fmpSymbol: 'ALTRI.LS',
    name: 'Altri SGPS SA',
    isin: 'PTALTR0AM0007',
    sector: 'Basic Materials',
    alternatives: ['ALTRI']
  },
  {
    userSymbol: 'EDP-LS',
    fmpSymbol: 'EDP.LS',
    name: 'EDP - Energias de Portugal SA',
    isin: 'PTEDP0AM0009',
    sector: 'Utilities',
    alternatives: ['EDP']
  },
  {
    userSymbol: 'GALP-LS',
    fmpSymbol: 'GALP.LS',
    name: 'Galp Energia SGPS SA',
    isin: 'PTGAL0AM0009',
    sector: 'Energy',
    alternatives: ['GALP']
  },

  // Additional Major Portuguese Stocks
  {
    userSymbol: 'BCP-LS',
    fmpSymbol: 'BCP.LS',
    name: 'Banco Comercial Português SA',
    isin: 'PTBCP0AM0007',
    sector: 'Financial Services',
    alternatives: ['BCP']
  },
  {
    userSymbol: 'REN-LS',
    fmpSymbol: 'REN.LS',
    name: 'REN - Redes Energéticas Nacionais SGPS SA',
    isin: 'PTREL0AM0008',
    sector: 'Utilities',
    alternatives: ['REN']
  },
  {
    userSymbol: 'EGL-LS',
    fmpSymbol: 'EGL.LS',
    name: 'Mota-Engil SGPS SA',
    isin: 'PTMEN0AM0006',
    sector: 'Construction',
    alternatives: ['EGL']
  },
  {
    userSymbol: 'SNC-LS',
    fmpSymbol: 'SNC.LS',
    name: 'Sonae SGPS SA',
    isin: 'PTSON0AM0001',
    sector: 'Consumer Retail',
    alternatives: ['SNC']
  },
  {
    userSymbol: 'SEMAPA-LS',
    fmpSymbol: 'SEMAPA.LS',
    name: 'Semapa SGPS SA',
    isin: 'PTSEM0AM0006',
    sector: 'Basic Materials',
    alternatives: ['SEMAPA']
  },
  {
    userSymbol: 'CORTICEIRA-LS',
    fmpSymbol: 'CORTICEIRA.LS',
    name: 'Corticeira Amorim SGPS SA',
    isin: 'PTCOR0AE0006',
    sector: 'Basic Materials',
    alternatives: ['CORTICEIRA']
  },
  {
    userSymbol: 'CTT-LS',
    fmpSymbol: 'CTT.LS',
    name: 'CTT - Correios de Portugal SA',
    isin: 'PTCTT0AE0001',
    sector: 'Industrial Services',
    alternatives: ['CTT']
  },
  {
    userSymbol: 'Navigator-LS',
    fmpSymbol: 'NAVIGATOR.LS',
    name: 'The Navigator Company SA',
    isin: 'PTNVG0AM0007',
    sector: 'Basic Materials',
    alternatives: ['NAVIGATOR']
  },
  {
    userSymbol: 'SONAECOM-LS',
    fmpSymbol: 'SONAECOM.LS',
    name: 'Sonaecom SGPS SA',
    isin: 'PTSON0AM0019',
    sector: 'Telecommunications',
    alternatives: ['SONAECOM']
  },
  {
    userSymbol: 'PHAROL-LS',
    fmpSymbol: 'PHAROL.LS',
    name: 'Pharol SGPS SA',
    isin: 'PTPHO0AM0019',
    sector: 'Telecommunications',
    alternatives: ['PHAROL']
  }
];

/**
 * Quick lookup map for O(1) symbol resolution
 */
export const PORTUGUESE_STOCKS_MAP = new Map<string, PortugueseStockMapping>(
  PORTUGUESE_STOCKS.map(stock => [stock.userSymbol, stock])
);

/**
 * Get Portuguese stock mapping by user symbol
 *
 * @param symbol - User input (e.g., "JMT-LS", "JMT.LS")
 * @returns Stock mapping or undefined
 */
export function getPortugueseStock(symbol: string): PortugueseStockMapping | undefined {
  // Normalize to hyphenated format for lookup
  const normalizedSymbol = symbol.replace(/^([A-Z0-9]+)\.LS$/, '$1-LS');
  return PORTUGUESE_STOCKS_MAP.get(normalizedSymbol);
}

/**
 * Check if symbol is a Portuguese stock
 *
 * @param symbol - Stock symbol (any format)
 * @returns True if Portuguese stock
 */
export function isPortugueseStock(symbol: string): boolean {
  return symbol.endsWith('-LS') || symbol.endsWith('.LS');
}

/**
 * Get all Portuguese stock symbols (FMP format)
 *
 * @returns Array of FMP symbols (e.g., ["JMT.LS", "EDP.LS", ...])
 */
export function getAllPortugueseSymbols(): string[] {
  return PORTUGUESE_STOCKS.map(stock => stock.fmpSymbol);
}

/**
 * Get Portuguese stocks by sector
 *
 * @param sector - Sector name
 * @returns Array of stocks in that sector
 */
export function getPortugueseStocksBySector(sector: string): PortugueseStockMapping[] {
  return PORTUGUESE_STOCKS.filter(stock =>
    stock.sector.toLowerCase() === sector.toLowerCase()
  );
}
