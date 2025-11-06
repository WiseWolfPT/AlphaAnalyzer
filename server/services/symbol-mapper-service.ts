/**
 * Symbol Mapper Service
 *
 * Normalizes stock symbols across different exchange conventions.
 * Handles conversions like JMT-LS → JMT.LS for FMP API compatibility.
 *
 * Supports:
 * - Lisbon Stock Exchange (LS)
 * - London Stock Exchange (L)
 * - Euronext Paris (PA)
 * - Euronext Amsterdam (AS)
 * - Deutsche Börse (DE)
 * - Swiss Exchange (SW)
 */

export interface ExchangeMapping {
  fmpSuffix: string;
  alternatives: string[];
  region: string;
  currency: string;
  examples: string[];
}

export class SymbolMapperService {
  private exchangeMappings: Map<string, ExchangeMapping> = new Map([
    // Lisbon Stock Exchange (Portugal)
    ['LS', {
      fmpSuffix: '.LS',
      alternatives: [''],  // Try without suffix if .LS fails
      region: 'Portugal',
      currency: 'EUR',
      examples: ['EDP.LS', 'GALP.LS', 'JMT.LS', 'NOS.LS']
    }],

    // London Stock Exchange (UK)
    ['L', {
      fmpSuffix: '.L',
      alternatives: [],
      region: 'United Kingdom',
      currency: 'GBP',
      examples: ['BP.L', 'HSBA.L', 'ULVR.L', 'AZN.L']
    }],

    // Euronext Paris (France)
    ['PA', {
      fmpSuffix: '.PA',
      alternatives: [],
      region: 'France',
      currency: 'EUR',
      examples: ['MC.PA', 'OR.PA', 'SAN.PA', 'AIR.PA']
    }],

    // Euronext Amsterdam (Netherlands)
    ['AS', {
      fmpSuffix: '.AS',
      alternatives: [],
      region: 'Netherlands',
      currency: 'EUR',
      examples: ['ASML.AS', 'INGA.AS', 'HEIA.AS', 'PHIA.AS']
    }],

    // Deutsche Börse (Germany)
    ['DE', {
      fmpSuffix: '.DE',
      alternatives: ['.F'],  // Frankfurt alternative
      region: 'Germany',
      currency: 'EUR',
      examples: ['SAP.DE', 'SIE.DE', 'VOW3.DE', 'BAS.DE']
    }],

    // Swiss Exchange (Switzerland)
    ['SW', {
      fmpSuffix: '.SW',
      alternatives: [],
      region: 'Switzerland',
      currency: 'CHF',
      examples: ['NESN.SW', 'ROG.SW', 'NOVN.SW', 'UBSG.SW']
    }]
  ]);

  /**
   * Normalize symbol for FMP API compatibility
   *
   * Converts hyphenated exchange suffixes to dot notation:
   * - JMT-LS → JMT.LS
   * - BP-L → BP.L
   * - SAP-DE → SAP.DE
   *
   * @param symbol - User input symbol (e.g., "JMT-LS", "AAPL")
   * @returns FMP-compatible symbol (e.g., "JMT.LS", "AAPL")
   */
  normalizeFmpSymbol(symbol: string): string {
    if (!symbol) return symbol;

    // Handle hyphenated exchange suffixes (e.g., JMT-LS)
    const hyphenMatch = symbol.match(/^([A-Z0-9]+)-([A-Z]+)$/);
    if (hyphenMatch) {
      const [_, ticker, exchange] = hyphenMatch;
      const mapping = this.exchangeMappings.get(exchange);
      if (mapping) {
        return `${ticker}${mapping.fmpSuffix}`;
      }
    }

    // Already in correct format (e.g., JMT.LS, AAPL)
    return symbol;
  }

  /**
   * Get alternative symbols to try if primary lookup fails
   *
   * Returns list of symbols to try in order of preference:
   * 1. Primary normalized symbol (e.g., JMT.LS)
   * 2. Alternative formats (e.g., JMT without suffix)
   *
   * @param symbol - User input symbol
   * @returns Array of symbols to try (e.g., ['JMT.LS', 'JMT'])
   */
  getAlternativeSymbols(symbol: string): string[] {
    const normalized = this.normalizeFmpSymbol(symbol);
    const alternatives = [normalized];

    // Extract exchange suffix to find alternatives
    const hyphenMatch = symbol.match(/^([A-Z0-9]+)-([A-Z]+)$/);
    const dotMatch = normalized.match(/^([A-Z0-9]+)\.([A-Z]+)$/);

    if (hyphenMatch) {
      const [_, ticker, exchange] = hyphenMatch;
      const mapping = this.exchangeMappings.get(exchange);
      if (mapping?.alternatives) {
        alternatives.push(...mapping.alternatives.map(alt => `${ticker}${alt}`));
      }
    } else if (dotMatch) {
      const [_, ticker, exchange] = dotMatch;
      const mapping = this.exchangeMappings.get(exchange);
      if (mapping?.alternatives) {
        alternatives.push(...mapping.alternatives.map(alt => `${ticker}${alt}`));
      }
    }

    return [...new Set(alternatives)]; // Remove duplicates
  }

  /**
   * Get exchange information for a symbol
   *
   * @param symbol - User input symbol
   * @returns Exchange mapping or null if not found
   */
  getExchangeInfo(symbol: string): ExchangeMapping | null {
    const hyphenMatch = symbol.match(/^[A-Z0-9]+-([A-Z]+)$/);
    const dotMatch = symbol.match(/^[A-Z0-9]+\.([A-Z]+)$/);

    const exchangeCode = hyphenMatch?.[1] || dotMatch?.[1];
    if (exchangeCode) {
      return this.exchangeMappings.get(exchangeCode) || null;
    }

    return null;
  }

  /**
   * Check if symbol is a US stock (no exchange suffix)
   *
   * @param symbol - Stock symbol
   * @returns True if US stock (e.g., AAPL, MSFT)
   */
  isUsStock(symbol: string): boolean {
    return !symbol.includes('.') && !symbol.includes('-');
  }

  /**
   * Get display symbol (user-friendly format)
   *
   * Converts dot notation back to hyphen for display:
   * - JMT.LS → JMT-LS
   * - AAPL → AAPL
   *
   * @param symbol - FMP symbol (e.g., "JMT.LS")
   * @returns Display symbol (e.g., "JMT-LS")
   */
  getDisplaySymbol(symbol: string): string {
    // Convert dot notation to hyphen for European exchanges
    return symbol.replace(/^([A-Z0-9]+)\.([A-Z]+)$/, '$1-$2');
  }
}

// Singleton instance
export const symbolMapper = new SymbolMapperService();
