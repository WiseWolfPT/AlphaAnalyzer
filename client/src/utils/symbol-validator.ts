/**
 * Symbol Validator and Normalizer (Frontend)
 *
 * Validates and normalizes stock symbols for user input.
 * Converts hyphenated exchange suffixes to dot notation for API compatibility.
 *
 * Examples:
 * - JMT-LS → JMT.LS (Portuguese stocks)
 * - BP-L → BP.L (London stocks)
 * - SAP-DE → SAP.DE (German stocks)
 * - AAPL → AAPL (US stocks - no change)
 */

/**
 * Exchange mappings (must match backend SymbolMapperService)
 */
const EXCHANGE_MAPPINGS: Record<string, { suffix: string; region: string }> = {
  LS: { suffix: '.LS', region: 'Portugal' },
  L: { suffix: '.L', region: 'UK' },
  PA: { suffix: '.PA', region: 'France' },
  AS: { suffix: '.AS', region: 'Netherlands' },
  DE: { suffix: '.DE', region: 'Germany' },
  F: { suffix: '.F', region: 'Germany (Frankfurt)' },
  SW: { suffix: '.SW', region: 'Switzerland' }
};

/**
 * Validate and normalize a stock symbol for API consumption
 *
 * Converts user-friendly hyphenated format to API-compatible dot notation:
 * - JMT-LS → JMT.LS
 * - EDP-LS → EDP.LS
 * - AAPL → AAPL (no change)
 *
 * @param input - User input symbol (e.g., "JMT-LS", "AAPL")
 * @returns Normalized symbol for API (e.g., "JMT.LS", "AAPL")
 */
export function validateAndNormalizeSymbol(input: string): string {
  if (!input) return input;

  // Convert to uppercase
  const upper = input.toUpperCase().trim();

  // Handle hyphenated exchange suffixes (e.g., JMT-LS → JMT.LS)
  const hyphenMatch = upper.match(/^([A-Z0-9]+)-([A-Z]+)$/);
  if (hyphenMatch) {
    const [_, ticker, exchange] = hyphenMatch;
    const mapping = EXCHANGE_MAPPINGS[exchange];
    if (mapping) {
      return `${ticker}${mapping.suffix}`;
    }
  }

  // Already in correct format or US stock (no exchange suffix)
  return upper;
}

/**
 * Get display symbol (user-friendly format)
 *
 * Converts API format back to hyphenated format for display:
 * - JMT.LS → JMT-LS
 * - AAPL → AAPL
 *
 * @param symbol - API symbol (e.g., "JMT.LS")
 * @returns Display symbol (e.g., "JMT-LS")
 */
export function getDisplaySymbol(symbol: string): string {
  if (!symbol) return symbol;

  // Convert dot notation to hyphen for European exchanges
  return symbol.replace(/^([A-Z0-9]+)\.([A-Z]+)$/, '$1-$2');
}

/**
 * Check if symbol is a Portuguese stock
 *
 * @param symbol - Stock symbol (any format)
 * @returns True if Portuguese stock
 */
export function isPortugueseStock(symbol: string): boolean {
  const upper = symbol.toUpperCase();
  return upper.endsWith('-LS') || upper.endsWith('.LS');
}

/**
 * Check if symbol is a US stock (no exchange suffix)
 *
 * @param symbol - Stock symbol
 * @returns True if US stock (e.g., AAPL, MSFT)
 */
export function isUsStock(symbol: string): boolean {
  return !symbol.includes('.') && !symbol.includes('-');
}

/**
 * Get exchange information from symbol
 *
 * @param symbol - Stock symbol (any format)
 * @returns Exchange info or null
 */
export function getExchangeInfo(symbol: string): { exchange: string; region: string } | null {
  const upper = symbol.toUpperCase();

  // Check hyphenated format (e.g., JMT-LS)
  const hyphenMatch = upper.match(/^[A-Z0-9]+-([A-Z]+)$/);
  if (hyphenMatch) {
    const exchange = hyphenMatch[1];
    const mapping = EXCHANGE_MAPPINGS[exchange];
    if (mapping) {
      return { exchange, region: mapping.region };
    }
  }

  // Check dot format (e.g., JMT.LS)
  const dotMatch = upper.match(/^[A-Z0-9]+\.([A-Z]+)$/);
  if (dotMatch) {
    const exchange = dotMatch[1];
    const mapping = EXCHANGE_MAPPINGS[exchange];
    if (mapping) {
      return { exchange, region: mapping.region };
    }
  }

  return null;
}

/**
 * Validate symbol format (basic syntax check)
 *
 * @param symbol - Stock symbol
 * @returns Error message or null if valid
 */
export function validateSymbolFormat(symbol: string): string | null {
  if (!symbol || symbol.trim().length === 0) {
    return 'Symbol cannot be empty';
  }

  const upper = symbol.toUpperCase().trim();

  // Allow letters, numbers, hyphens, and dots only
  if (!/^[A-Z0-9.-]+$/.test(upper)) {
    return 'Symbol can only contain letters, numbers, hyphens, and dots';
  }

  // Check length (1-10 characters before suffix)
  const baseTicker = upper.replace(/[.-][A-Z]+$/, '');
  if (baseTicker.length < 1 || baseTicker.length > 10) {
    return 'Ticker symbol must be 1-10 characters';
  }

  return null; // Valid
}

/**
 * Auto-suggest correct format if user enters common mistakes
 *
 * @param input - User input
 * @returns Suggestion or null
 */
export function suggestCorrection(input: string): string | null {
  if (!input) return null;

  const upper = input.toUpperCase().trim();

  // Common mistakes:
  // 1. Missing hyphen/dot before exchange suffix
  const missingHyphenMatch = upper.match(/^([A-Z0-9]+)(LS|PA|AS|DE|SW)$/);
  if (missingHyphenMatch) {
    const [_, ticker, exchange] = missingHyphenMatch;
    return `${ticker}-${exchange}`;
  }

  // 2. Space instead of hyphen/dot
  const spaceMatch = upper.match(/^([A-Z0-9]+)\s+([A-Z]+)$/);
  if (spaceMatch) {
    const [_, ticker, exchange] = spaceMatch;
    if (EXCHANGE_MAPPINGS[exchange]) {
      return `${ticker}-${exchange}`;
    }
  }

  return null;
}

/**
 * Format symbol for search display (with region badge)
 *
 * @param symbol - Stock symbol
 * @returns Formatted display object
 */
export function formatSymbolDisplay(symbol: string): {
  symbol: string;
  displaySymbol: string;
  region: string | null;
  badge: string | null;
} {
  const displaySymbol = getDisplaySymbol(symbol);
  const exchangeInfo = getExchangeInfo(symbol);

  return {
    symbol,
    displaySymbol,
    region: exchangeInfo?.region || null,
    badge: exchangeInfo?.exchange || null
  };
}
