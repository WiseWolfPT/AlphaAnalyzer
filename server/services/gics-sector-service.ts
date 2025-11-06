/**
 * AGENT 18: GICS Sector Service
 *
 * Maps stocks to their GICS sectors for sector-based warming strategy.
 * Data source: stock_universe_complete.csv (1,493 stocks with sector metadata)
 *
 * Architecture:
 * - In-memory sector → stocks mapping (fast lookups)
 * - Stock → sector reverse mapping
 * - Integration with stock universe loader
 * - Fallback to 'Other' for unknown tickers
 *
 * Usage:
 * ```typescript
 * const service = new GICSSectorService();
 * await service.initialize();
 *
 * const techStocks = service.getStocksBySector('Information Technology');
 * const applesSector = service.getSectorForStock('AAPL');
 * ```
 */

import { Sector } from '../../shared/types/sectors';
import { logger } from '../lib/logger';
import fs from 'fs/promises';
import path from 'path';
import { parse } from 'csv-parse/sync';

export interface StockSectorData {
  symbol: string;
  companyName: string;
  sector: string;
  industry: string;
  exchange: string;
  type: string;
  canCalculateIV: boolean;
}

export class GICSSectorService {
  private sectorToStocks: Map<string, Set<string>> = new Map();
  private stockToSector: Map<string, string> = new Map();
  private stockData: Map<string, StockSectorData> = new Map();
  private initialized = false;

  constructor() {
    // Initialize sector sets for all GICS sectors
    Object.values(Sector).forEach(sector => {
      this.sectorToStocks.set(sector, new Set());
    });
  }

  /**
   * Initialize service by loading stock universe CSV
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      logger.info('[GICSSectorService] Initializing from stock_universe_complete.csv...');

      const csvPath = path.join(process.cwd(), 'stock_universe_complete.csv');
      const csvContent = await fs.readFile(csvPath, 'utf-8');

      // Parse CSV
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      }) as Array<{
        symbol: string;
        company_name: string;
        exchange: string;
        sector: string;
        industry: string;
        type: string;
        can_calculate_iv: string;
      }>;

      logger.info(`[GICSSectorService] Loaded ${records.length} stocks from CSV`);

      // Build mappings
      let validStocks = 0;
      let unknownSectors = 0;

      for (const record of records) {
        const symbol = record.symbol.toUpperCase().trim();
        const sector = this.normalizeSectorName(record.sector);
        const canCalculateIV = record.can_calculate_iv.toUpperCase() === 'YES';

        // Store full stock data
        this.stockData.set(symbol, {
          symbol,
          companyName: record.company_name,
          sector,
          industry: record.industry,
          exchange: record.exchange,
          type: record.type,
          canCalculateIV
        });

        // Map stock to sector
        this.stockToSector.set(symbol, sector);

        // Add to sector set
        const sectorSet = this.sectorToStocks.get(sector);
        if (sectorSet) {
          sectorSet.add(symbol);
          validStocks++;
        } else {
          // Unknown sector - add to 'Other'
          this.sectorToStocks.get(Sector.OTHER)?.add(symbol);
          unknownSectors++;
        }
      }

      this.initialized = true;

      // Log sector distribution
      const sectorStats: Record<string, number> = {};
      for (const [sector, stocks] of this.sectorToStocks.entries()) {
        sectorStats[sector] = stocks.size;
      }

      logger.info('[GICSSectorService] Initialization complete:', {
        totalStocks: records.length,
        validStocks,
        unknownSectors,
        sectorDistribution: sectorStats
      });
    } catch (error) {
      logger.error('[GICSSectorService] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Normalize sector name to match Sector enum
   * Handles variations: "Health Care" vs "Healthcare", etc.
   */
  private normalizeSectorName(sectorName: string): string {
    const normalized = sectorName.trim();

    // Map variations to standard GICS sectors
    const sectorMap: Record<string, string> = {
      'Health Care': Sector.HEALTHCARE,
      'Healthcare': Sector.HEALTHCARE,
      'Information Technology': Sector.INFORMATION_TECHNOLOGY,
      'IT': Sector.INFORMATION_TECHNOLOGY,
      'Technology': Sector.INFORMATION_TECHNOLOGY,
      'Communication Services': Sector.COMMUNICATION_SERVICES,
      'Communications': Sector.COMMUNICATION_SERVICES,
      'Consumer Discretionary': Sector.CONSUMER_DISCRETIONARY,
      'Consumer Staples': Sector.CONSUMER_STAPLES,
      'Financials': Sector.FINANCIALS,
      'Financial Services': Sector.FINANCIALS,
      'Industrials': Sector.INDUSTRIALS,
      'Materials': Sector.MATERIALS,
      'Energy': Sector.ENERGY,
      'Real Estate': Sector.REAL_ESTATE,
      'Utilities': Sector.UTILITIES,
      'N/A': Sector.OTHER,
      'Other': Sector.OTHER
    };

    return sectorMap[normalized] || Sector.OTHER;
  }

  /**
   * Get all stocks in a specific sector
   *
   * @param sector - GICS sector name
   * @returns Array of stock tickers
   */
  getStocksBySector(sector: string): string[] {
    const stocks = this.sectorToStocks.get(sector);
    return stocks ? Array.from(stocks) : [];
  }

  /**
   * Get sector for a specific stock
   *
   * @param symbol - Stock ticker
   * @returns GICS sector name (defaults to 'Other' if not found)
   */
  getSectorForStock(symbol: string): string {
    const upperSymbol = symbol.toUpperCase().trim();
    return this.stockToSector.get(upperSymbol) || Sector.OTHER;
  }

  /**
   * Get full stock data
   *
   * @param symbol - Stock ticker
   * @returns Stock data or undefined
   */
  getStockData(symbol: string): StockSectorData | undefined {
    const upperSymbol = symbol.toUpperCase().trim();
    return this.stockData.get(upperSymbol);
  }

  /**
   * Get sector distribution statistics
   *
   * @returns Map of sector → stock count
   */
  getSectorDistribution(): Record<string, number> {
    const distribution: Record<string, number> = {};

    for (const [sector, stocks] of this.sectorToStocks.entries()) {
      distribution[sector] = stocks.size;
    }

    return distribution;
  }

  /**
   * Check if stock exists in universe
   *
   * @param symbol - Stock ticker
   * @returns true if stock exists
   */
  hasStock(symbol: string): boolean {
    const upperSymbol = symbol.toUpperCase().trim();
    return this.stockData.has(upperSymbol);
  }

  /**
   * Get all stocks that can calculate IV
   *
   * @returns Array of stock tickers
   */
  getStocksWithIV(): string[] {
    return Array.from(this.stockData.values())
      .filter(stock => stock.canCalculateIV)
      .map(stock => stock.symbol);
  }

  /**
   * Get stocks by sector that can calculate IV
   *
   * @param sector - GICS sector name
   * @returns Array of stock tickers
   */
  getStocksBySectorWithIV(sector: string): string[] {
    const sectorStocks = this.getStocksBySector(sector);
    return sectorStocks.filter(symbol => {
      const data = this.stockData.get(symbol);
      return data?.canCalculateIV ?? false;
    });
  }

  /**
   * Get total stock count
   *
   * @returns Total number of stocks
   */
  getTotalStockCount(): number {
    return this.stockData.size;
  }

  /**
   * Check if service is initialized
   *
   * @returns true if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get stock count by sector (for API call calculations)
   *
   * @returns Map of sector → stock count
   */
  getStockCountBySector(): Record<string, number> {
    return this.getSectorDistribution();
  }

  /**
   * Get high-priority sectors (for targeted warming)
   *
   * @returns Array of high-frequency sector names
   */
  getHighPrioritySectors(): string[] {
    return [
      Sector.INFORMATION_TECHNOLOGY,
      Sector.COMMUNICATION_SERVICES,
      Sector.CONSUMER_DISCRETIONARY
    ];
  }

  /**
   * Get medium-priority sectors
   *
   * @returns Array of medium-frequency sector names
   */
  getMediumPrioritySectors(): string[] {
    return [
      Sector.FINANCIALS,
      Sector.HEALTHCARE,
      Sector.INDUSTRIALS,
      Sector.CONSUMER_STAPLES
    ];
  }

  /**
   * Get low-priority sectors
   *
   * @returns Array of low-frequency sector names
   */
  getLowPrioritySectors(): string[] {
    return [
      Sector.ENERGY,
      Sector.MATERIALS,
      Sector.UTILITIES,
      Sector.REAL_ESTATE
    ];
  }
}

/**
 * Singleton instance
 */
export const gicsSectorService = new GICSSectorService();
