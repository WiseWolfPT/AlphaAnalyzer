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
import { getManualPeers, hasManualPeers } from '../data/manual-peers';

export interface StockSectorData {
  symbol: string;
  companyName: string;
  sector: string;
  industry: string;
  exchange: string;
  type: string;
  canCalculateIV: boolean;
}

export interface StockPeer {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  marketCap: number;
  price: number;
  change: number;
  changePercent: number;
}

export interface StockPeersResponse {
  symbol: string;
  peers: StockPeer[];
  source: 'algorithm' | 'manual_fallback';
  cached?: boolean;
  timestamp: string;
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
   * Determines if a stock symbol is from a supported exchange
   * Only US stocks are supported by FMP API
   */
  private isSupportedExchange(symbol: string): boolean {
    // ❌ REJECT: Foreign exchange suffixes
    const UNSUPPORTED_SUFFIXES = [
      '.BO',  // Bombay Stock Exchange
      '.NS',  // National Stock Exchange of India
      '.TO',  // Toronto Stock Exchange
      '.T',   // Tokyo Stock Exchange
      '.L',   // London Stock Exchange
      '-LS',  // Euronext Lisbon
      '.LS',  // Euronext Lisbon (alternate)
      '.DE',  // Frankfurt Xetra
      '.F',   // Frankfurt Stock Exchange
      '.HK',  // Hong Kong Stock Exchange
      '.SS',  // Shanghai Stock Exchange
      '.SZ',  // Shenzhen Stock Exchange
      '.PA',  // Euronext Paris
      '.AS',  // Euronext Amsterdam
      '.BR',  // Euronext Brussels
      '.MC',  // Madrid Stock Exchange
      '.MI',  // Milan Stock Exchange
      '.SW',  // Swiss Exchange
      '.ST',  // Stockholm Stock Exchange
      '.CO',  // Copenhagen Stock Exchange
      '.OL',  // Oslo Stock Exchange
      '.HE',  // Helsinki Stock Exchange
      '.IC',  // Iceland Stock Exchange
      '.VI',  // Vienna Stock Exchange
      '.PR',  // Prague Stock Exchange
    ];

    const upperSymbol = symbol.toUpperCase();

    // Check for any unsupported suffix
    for (const suffix of UNSUPPORTED_SUFFIXES) {
      if (upperSymbol.endsWith(suffix)) {
        logger.debug(`[GICSSectorService] Skipping foreign exchange symbol: ${symbol}`);
        return false;
      }
    }

    // ❌ REJECT: Numeric Asian tickers (e.g., 600519.SS, 000001.SZ)
    if (/^\d+\./.test(symbol)) {
      logger.debug(`[GICSSectorService] Skipping numeric Asian ticker: ${symbol}`);
      return false;
    }

    // ✅ ACCEPT: US stocks only (1-5 letters, optional .A/.B class)
    if (/^[A-Z]{1,5}(\.[AB])?$/i.test(upperSymbol)) {
      return true;
    }

    // ❌ REJECT: Everything else
    logger.debug(`[GICSSectorService] Skipping non-US symbol: ${symbol}`);
    return false;
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

      // ✅ Filter to US-only stocks BEFORE processing
      const allStocks = records;
      const usStocks = allStocks.filter(record =>
        this.isSupportedExchange(record.symbol)
      );

      const filteredCount = allStocks.length - usStocks.length;
      logger.info(`[GICSSectorService] Filtered to ${usStocks.length} US stocks (removed ${filteredCount} foreign stocks)`);

      // Build mappings
      let stored = 0;
      let skipped = 0;
      let unknownSectors = 0;

      for (const record of usStocks) {
        try {
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
            stored++;
          } else {
            // Unknown sector - add to 'Other'
            this.sectorToStocks.get(Sector.OTHER)?.add(symbol);
            unknownSectors++;
            stored++;
          }
        } catch (error: any) {
          logger.error(`[GICSSectorService] Error storing ${record.symbol}:`, error.message);
          skipped++;
        }
      }

      logger.info(`[GICSSectorService] Stored ${stored} US stocks, skipped ${skipped} errors`);

      // Log exchange breakdown of filtered stocks
      const exchangeCounts: Record<string, number> = {};
      for (const stock of allStocks) {
        if (!this.isSupportedExchange(stock.symbol)) {
          const match = stock.symbol.match(/\.(BO|NS|TO|T|L|LS|DE|F|HK|SS|SZ|PA|AS|BR|MC|MI|SW|ST|CO|OL|HE|IC|VI|PR)$/);
          const exchange = match ? match[1] : 'OTHER';
          exchangeCounts[exchange] = (exchangeCounts[exchange] || 0) + 1;
        }
      }

      if (Object.keys(exchangeCounts).length > 0) {
        logger.info('[GICSSectorService] Foreign stocks filtered (by exchange):', exchangeCounts);
      }

      this.initialized = true;

      // Log sector distribution
      const sectorStats: Record<string, number> = {};
      for (const [sector, stocks] of this.sectorToStocks.entries()) {
        sectorStats[sector] = stocks.size;
      }

      logger.info('[GICSSectorService] Initialization complete:', {
        totalStocksInCSV: records.length,
        foreignStocksFiltered: filteredCount,
        usStocksStored: stored,
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

  /**
   * Get stock peers using algorithm with manual fallback
   *
   * Algorithm attempts to find peers in same sector with similar market cap.
   * If algorithm fails (returns 0 peers) and symbol has manual peers defined,
   * uses manual fallback with hand-picked peers.
   *
   * @param symbol - Stock ticker
   * @param fmpProvider - FMP provider instance for fetching profiles
   * @returns StockPeersResponse with peers array and metadata
   */
  async getStockPeers(symbol: string, fmpProvider: any): Promise<StockPeersResponse> {
    const upperSymbol = symbol.toUpperCase().trim();

    try {
      // Step 1: Get stock profile to extract sector and market cap
      const profile = await fmpProvider.getProfile(upperSymbol);

      if (!profile) {
        logger.warn(`[GICSSectorService] No profile found for ${upperSymbol}`);

        // Try manual fallback immediately if profile fails
        if (hasManualPeers(upperSymbol)) {
          return await this.getManualPeersResponse(upperSymbol, fmpProvider);
        }

        return {
          symbol: upperSymbol,
          peers: [],
          source: 'algorithm',
          cached: false,
          timestamp: new Date().toISOString()
        };
      }

      const sector = profile.sector;
      const marketCap = profile.mktCap;

      if (!sector || !marketCap) {
        logger.warn(`[GICSSectorService] Missing sector or market cap for ${upperSymbol}`);

        // Try manual fallback if data is insufficient
        if (hasManualPeers(upperSymbol)) {
          return await this.getManualPeersResponse(upperSymbol, fmpProvider);
        }

        return {
          symbol: upperSymbol,
          peers: [],
          source: 'algorithm',
          cached: false,
          timestamp: new Date().toISOString()
        };
      }

      logger.info(`[GICSSectorService] Finding peers for ${upperSymbol}: Sector=${sector}, MarketCap=$${(marketCap / 1e9).toFixed(2)}B`);

      // Step 2: Calculate market cap range (±50%)
      const marketCapMin = Math.floor(marketCap * 0.5);
      const marketCapMax = Math.floor(marketCap * 1.5);

      // Step 3: Try to find peers using FMP screener
      const apiKey = process.env.FMP_API_KEY;
      if (!apiKey || apiKey === 'demo') {
        logger.error('[GICSSectorService] FMP API key not configured');

        if (hasManualPeers(upperSymbol)) {
          return await this.getManualPeersResponse(upperSymbol, fmpProvider);
        }

        return {
          symbol: upperSymbol,
          peers: [],
          source: 'algorithm',
          cached: false,
          timestamp: new Date().toISOString()
        };
      }

      // Map GICS sector to FMP sector names
      const fmpSectorNames = this.mapGICSToFMPSectors(sector);
      logger.info(`[GICSSectorService] GICS sector "${sector}" → FMP sectors: ${fmpSectorNames.join(', ')}`);

      let allPeers: any[] = [];

      // Try each FMP sector name
      for (const fmpSector of fmpSectorNames) {
        try {
          const screenerUrl = `https://financialmodelingprep.com/api/v3/stock-screener?sector=${encodeURIComponent(fmpSector)}&marketCapMoreThan=${marketCapMin}&marketCapLowerThan=${marketCapMax}&limit=50&apikey=${apiKey}`;

          logger.debug(`[GICSSectorService] Querying screener for FMP sector: ${fmpSector}`);
          const screenerRes = await fetch(screenerUrl);

          if (!screenerRes.ok) {
            logger.warn(`[GICSSectorService] Screener API failed for sector ${fmpSector}: ${screenerRes.status}`);
            continue;
          }

          const screenerData = await screenerRes.json();

          if (!Array.isArray(screenerData)) {
            logger.warn(`[GICSSectorService] Invalid screener response format for sector ${fmpSector}`);
            continue;
          }

          logger.debug(`[GICSSectorService] Found ${screenerData.length} candidates for FMP sector: ${fmpSector}`);

          if (screenerData.length > 0) {
            allPeers.push(...screenerData);
          }
        } catch (error) {
          logger.warn(`[GICSSectorService] Error querying sector ${fmpSector}:`, error);
          continue;
        }
      }

      // Step 4: Filter and rank peers
      const filtered = allPeers
        .filter(stock => stock.symbol !== upperSymbol) // Exclude target stock
        .filter(stock => stock.isActivelyTrading === true) // Only active stocks
        .filter(stock => !stock.isEtf && !stock.isFund) // Exclude ETFs/funds
        .sort((a, b) => (b.volume || 0) - (a.volume || 0)) // Sort by volume DESC
        .slice(0, 5) // Top 5
        .map(stock => ({
          symbol: stock.symbol,
          name: stock.companyName || stock.name,
          sector: stock.sector,
          industry: stock.industry,
          marketCap: stock.marketCap,
          price: stock.price,
          change: stock.change || 0,
          changePercent: stock.changesPercentage || 0
        }));

      // Algorithm succeeded - return peers
      if (filtered.length > 0) {
        logger.info(`[GICSSectorService] Found ${filtered.length} peers for ${upperSymbol} using algorithm`);
        return {
          symbol: upperSymbol,
          peers: filtered,
          source: 'algorithm',
          cached: false,
          timestamp: new Date().toISOString()
        };
      }

      // Algorithm failed - try manual fallback
      if (hasManualPeers(upperSymbol)) {
        logger.info(`[GICSSectorService] Algorithm returned 0 peers, trying manual fallback for ${upperSymbol}`);
        return await this.getManualPeersResponse(upperSymbol, fmpProvider);
      }

      // No peers found (algorithm + manual fallback both failed)
      logger.warn(`[GICSSectorService] No peers found for ${upperSymbol} (tried algorithm + manual fallback)`);
      return {
        symbol: upperSymbol,
        peers: [],
        source: 'algorithm',
        cached: false,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error(`[GICSSectorService] Error getting peers for ${upperSymbol}:`, error);

      // Last resort: try manual fallback on error
      if (hasManualPeers(upperSymbol)) {
        logger.info(`[GICSSectorService] Error occurred, trying manual fallback for ${upperSymbol}`);
        try {
          return await this.getManualPeersResponse(upperSymbol, fmpProvider);
        } catch (fallbackError) {
          logger.error(`[GICSSectorService] Manual fallback also failed for ${upperSymbol}:`, fallbackError);
        }
      }

      return {
        symbol: upperSymbol,
        peers: [],
        source: 'algorithm',
        cached: false,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get manual peers response (private helper)
   *
   * Fetches profile data for manually curated peer list
   *
   * @param symbol - Stock ticker
   * @param fmpProvider - FMP provider instance
   * @returns StockPeersResponse with manual peers
   */
  private async getManualPeersResponse(symbol: string, fmpProvider: any): Promise<StockPeersResponse> {
    const manualPeerSymbols = getManualPeers(symbol);

    if (!manualPeerSymbols) {
      return {
        symbol,
        peers: [],
        source: 'manual_fallback',
        cached: false,
        timestamp: new Date().toISOString()
      };
    }

    logger.info(`[GICSSectorService] Using manual fallback peers for ${symbol}:`, manualPeerSymbols);

    try {
      // Fetch profile data for manual peers
      const manualPeers = await Promise.all(
        manualPeerSymbols.map(async (peerSymbol) => {
          try {
            const profile = await fmpProvider.getProfile(peerSymbol);
            return {
              symbol: profile.symbol,
              name: profile.companyName,
              sector: profile.sector,
              industry: profile.industry,
              marketCap: profile.mktCap,
              price: profile.price,
              change: profile.changes || 0,
              changePercent: profile.changesPercentage || 0
            };
          } catch (error) {
            logger.warn(`[GICSSectorService] Failed to fetch manual peer ${peerSymbol}:`, error);
            return null;
          }
        })
      );

      // Filter out nulls and return
      const validPeers = manualPeers.filter((p): p is StockPeer => p !== null);

      if (validPeers.length > 0) {
        logger.info(`[GICSSectorService] Returning ${validPeers.length} manual peers for ${symbol}`);
        return {
          symbol,
          peers: validPeers,
          source: 'manual_fallback',
          cached: false,
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      logger.error(`[GICSSectorService] Failed to fetch manual peers for ${symbol}:`, error);
    }

    return {
      symbol,
      peers: [],
      source: 'manual_fallback',
      cached: false,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Map GICS sector to FMP sector names
   *
   * FMP uses different sector naming than GICS
   *
   * @param gicsSector - GICS sector name
   * @returns Array of FMP sector names to try
   */
  private mapGICSToFMPSectors(gicsSector: string): string[] {
    const sectorMap: Record<string, string[]> = {
      [Sector.INFORMATION_TECHNOLOGY]: ['Technology'],
      [Sector.HEALTHCARE]: ['Healthcare'],
      [Sector.FINANCIALS]: ['Financial Services', 'Financials'],
      [Sector.CONSUMER_DISCRETIONARY]: ['Consumer Cyclical'],
      [Sector.COMMUNICATION_SERVICES]: ['Communication Services'],
      [Sector.INDUSTRIALS]: ['Industrials'],
      [Sector.CONSUMER_STAPLES]: ['Consumer Defensive'],
      [Sector.ENERGY]: ['Energy'],
      [Sector.MATERIALS]: ['Basic Materials'],
      [Sector.REAL_ESTATE]: ['Real Estate'],
      [Sector.UTILITIES]: ['Utilities']
    };

    return sectorMap[gicsSector] || [gicsSector];
  }
}

/**
 * Singleton instance
 */
export const gicsSectorService = new GICSSectorService();
