/**
 * Stock Universe Loader - P0 Fix #4
 *
 * Loads complete stock universe from CSV (1,493 stocks)
 * and provides tier-based segmentation for intelligent warming.
 *
 * Tiers:
 * - Tier 1 (S&P 100): 100 stocks, hourly warming
 * - Tier 2 (S&P 500): 400 stocks, daily warming
 * - Tier 3 (Extended): 993 stocks, earnings-driven warming
 *
 * Total: 1,493 stocks (100% FMP coverage)
 */

import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { logger } from '../lib/logger';

/**
 * Stock entry from CSV
 */
export interface StockEntry {
  symbol: string;
  companyName: string;
  exchange: string;
  sector: string;
  industry: string;
  type: string;
  canCalculateIV: string; // YES, NO, MAYBE
}

/**
 * Stock universe tiers
 */
export interface StockUniverseTiers {
  sp100: string[];
  sp500: string[];
  extended: string[];
  all: string[];
}

// S&P 100 tickers (manually curated - top 100 by market cap)
const SP100_TICKERS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK.B', 'V', 'UNH',
  'JPM', 'XOM', 'JNJ', 'WMT', 'PG', 'MA', 'HD', 'CVX', 'LLY', 'MRK',
  'ABBV', 'KO', 'PEP', 'COST', 'AVGO', 'BAC', 'TMO', 'ADBE', 'CSCO', 'MCD',
  'ACN', 'ABT', 'NFLX', 'CRM', 'DHR', 'CMCSA', 'AMD', 'WFC', 'TXN', 'NEE',
  'DIS', 'VZ', 'PM', 'UNP', 'ORCL', 'INTC', 'RTX', 'BMY', 'QCOM', 'HON',
  'UPS', 'LOW', 'AMGN', 'SBUX', 'BA', 'LMT', 'INTU', 'CAT', 'AXP', 'GS',
  'DE', 'SPGI', 'BLK', 'ELV', 'GILD', 'BKNG', 'ADI', 'MDT', 'SYK', 'AMT',
  'ISRG', 'CVS', 'ADP', 'CI', 'VRTX', 'MMC', 'TJX', 'MDLZ', 'REGN', 'PLD',
  'ZTS', 'CME', 'NOW', 'SCHW', 'CB', 'MO', 'PGR', 'SO', 'COP', 'DUK',
  'ITW', 'EOG', 'MS', 'TMUS', 'FI', 'USB', 'BSX', 'AON', 'CL', 'HCA',
];

// S&P 500 additional tickers (top 400 excluding S&P 100)
// This is a subset - full list would be 400 tickers
const SP500_ADDITIONAL = [
  'TSLA', 'BRK.A', 'GOOG', 'NVDA', 'TSM', 'V', 'UNH', 'XOM', 'JNJ', 'WMT',
  'MA', 'PG', 'HD', 'CVX', 'ABBV', 'LLY', 'BAC', 'MRK', 'KO', 'PFE',
  // ... (add more as needed)
];

let cachedUniverse: StockUniverseTiers | null = null;

/**
 * Load stock universe from CSV
 *
 * @param csvPath - Path to stock_universe_complete.csv (relative to project root)
 * @returns Stock universe with tiers
 */
export async function loadStockUniverse(
  csvPath: string = 'stock_universe_complete.csv'
): Promise<StockUniverseTiers> {
  // Return cached if available
  if (cachedUniverse) {
    logger.debug('[StockUniverseLoader] Returning cached universe');
    return cachedUniverse;
  }

  try {
    // Resolve path relative to project root
    // In production (CJS), __dirname will be /home/teste 1/dist/server/
    // We need to go up to /home/teste 1/
    const projectRoot = process.env.NODE_ENV === 'production'
      ? path.resolve(__dirname, '../../..')  // dist/server/ -> ../../../ = /home/teste 1/
      : path.resolve(__dirname, '../..');     // server/ -> ../../ = project root
    const absolutePath = path.resolve(projectRoot, csvPath);

    logger.info(`[StockUniverseLoader] Loading from: ${absolutePath}`);

    // Check if file exists
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Stock universe CSV not found: ${absolutePath}`);
    }

    // Read and parse CSV
    const csvContent = fs.readFileSync(absolutePath, 'utf-8');
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as StockEntry[];

    logger.info(`[StockUniverseLoader] Parsed ${records.length} records from CSV`);

    // Filter valid stocks (exclude LSE, focus on US exchanges)
    const validStocks = records.filter((stock) => {
      // Exclude London Stock Exchange tickers (e.g., "0A7O.L")
      if (stock.exchange === 'LSE' || stock.symbol.endsWith('.L')) {
        return false;
      }

      // Only include stocks that can calculate IV
      if (stock.canCalculateIV === 'NO') {
        return false;
      }

      // Exclude empty symbols
      if (!stock.symbol || stock.symbol.trim() === '') {
        return false;
      }

      return true;
    });

    logger.info(`[StockUniverseLoader] Filtered to ${validStocks.length} valid stocks (excluded LSE)`);

    // Extract symbols
    const allSymbols = validStocks.map((s) => s.symbol.toUpperCase().trim());

    // Build tiers
    const sp100 = allSymbols.filter((symbol) => SP100_TICKERS.includes(symbol));
    const sp500 = allSymbols.filter(
      (symbol) =>
        !SP100_TICKERS.includes(symbol) &&
        (SP500_ADDITIONAL.includes(symbol) || isLikelySP500(symbol, validStocks))
    );
    const extended = allSymbols.filter(
      (symbol) => !sp100.includes(symbol) && !sp500.includes(symbol)
    );

    cachedUniverse = {
      sp100,
      sp500,
      extended,
      all: allSymbols,
    };

    logger.info(`[StockUniverseLoader] Universe loaded successfully:`, {
      total: cachedUniverse.all.length,
      sp100: cachedUniverse.sp100.length,
      sp500: cachedUniverse.sp500.length,
      extended: cachedUniverse.extended.length,
    });

    return cachedUniverse;
  } catch (error: any) {
    logger.error('[StockUniverseLoader] Failed to load stock universe:', error);
    throw error;
  }
}

/**
 * Heuristic to determine if a stock is likely in S&P 500
 * (based on exchange and sector)
 */
function isLikelySP500(symbol: string, stocks: StockEntry[]): boolean {
  const stock = stocks.find((s) => s.symbol.toUpperCase() === symbol.toUpperCase());
  if (!stock) return false;

  // S&P 500 stocks are typically on major US exchanges
  const majorExchanges = ['NASDAQ', 'NYSE', 'AMEX'];
  if (!majorExchanges.includes(stock.exchange)) {
    return false;
  }

  // Prioritize common stocks
  if (stock.type === 'COMMON' && stock.canCalculateIV === 'YES') {
    return true;
  }

  return false;
}

/**
 * Get stock universe tiers (cached)
 */
export async function getStockUniverseTiers(): Promise<StockUniverseTiers> {
  if (!cachedUniverse) {
    return loadStockUniverse();
  }
  return cachedUniverse;
}

/**
 * Refresh cached universe (force reload)
 */
export async function refreshStockUniverse(): Promise<StockUniverseTiers> {
  cachedUniverse = null;
  return loadStockUniverse();
}

/**
 * Get stocks by tier
 */
export async function getStocksByTier(tier: 'sp100' | 'sp500' | 'extended' | 'all'): Promise<string[]> {
  const universe = await getStockUniverseTiers();
  return universe[tier];
}

/**
 * Check if ticker is in universe
 */
export async function isInUniverse(ticker: string): Promise<boolean> {
  const universe = await getStockUniverseTiers();
  return universe.all.includes(ticker.toUpperCase());
}

/**
 * Get universe statistics
 */
export async function getUniverseStats(): Promise<{
  total: number;
  sp100: number;
  sp500: number;
  extended: number;
  cached: boolean;
}> {
  const universe = await getStockUniverseTiers();
  return {
    total: universe.all.length,
    sp100: universe.sp100.length,
    sp500: universe.sp500.length,
    extended: universe.extended.length,
    cached: cachedUniverse !== null,
  };
}

// Export singleton
export const stockUniverseLoader = {
  loadStockUniverse,
  getStockUniverseTiers,
  refreshStockUniverse,
  getStocksByTier,
  isInUniverse,
  getUniverseStats,
};
