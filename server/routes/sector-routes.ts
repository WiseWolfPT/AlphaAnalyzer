/**
 * AGENT 16: Sector Routes
 *
 * REST API endpoints for GICS 11-sector navigation and analytics.
 *
 * Endpoints:
 * - GET /api/sectors - List all 11 GICS sectors with counts
 * - GET /api/sectors/:sectorId - Get sector details
 * - GET /api/sectors/:sectorId/stocks - Get all stocks in sector
 * - GET /api/sectors/distribution - Get sector distribution (chart data)
 */

import { Router, Request, Response } from 'express';
import { gicsSectorService } from '../services/gics-sector-service';
import { Sector, SECTOR_INFO, SECTOR_COLORS } from '../../shared/types/sectors';
import { logger } from '../lib/logger';

const router = Router();

// Sector ID to Sector enum mapping
const SECTOR_ID_MAP: Record<string, Sector> = {
  'communication-services': Sector.COMMUNICATION_SERVICES,
  'consumer-discretionary': Sector.CONSUMER_DISCRETIONARY,
  'consumer-staples': Sector.CONSUMER_STAPLES,
  'energy': Sector.ENERGY,
  'financials': Sector.FINANCIALS,
  'healthcare': Sector.HEALTHCARE,
  'industrials': Sector.INDUSTRIALS,
  'information-technology': Sector.INFORMATION_TECHNOLOGY,
  'materials': Sector.MATERIALS,
  'real-estate': Sector.REAL_ESTATE,
  'utilities': Sector.UTILITIES,
};

/**
 * GET /api/sectors
 * List all 11 GICS sectors with stock counts and metadata
 */
router.get('/sectors', async (req: Request, res: Response) => {
  try {
    // Ensure service is initialized
    if (!gicsSectorService.isInitialized()) {
      await gicsSectorService.initialize();
    }

    const distribution = gicsSectorService.getSectorDistribution();

    const sectors = Object.values(Sector)
      .filter(sector => sector !== Sector.OTHER) // Exclude 'Other'
      .map(sector => {
        const info = SECTOR_INFO[sector];
        const colors = SECTOR_COLORS[sector];
        const stocks = gicsSectorService.getStocksBySectorWithIV(sector);
        const sectorId = sector.toLowerCase().replace(/ /g, '-');

        return {
          id: sectorId,
          name: sector,
          description: info.description,
          icon: info.icon,
          color: colors.primary,
          backgroundColor: colors.background,
          stockCount: distribution[sector] || 0,
          stockCountWithIV: stocks.length,
          examples: info.examples,
        };
      })
      .sort((a, b) => b.stockCount - a.stockCount); // Sort by stock count descending

    res.json({
      total: sectors.length,
      totalStocks: gicsSectorService.getTotalStockCount(),
      sectors,
    });
  } catch (error) {
    logger.error('[SectorRoutes] Failed to get sectors:', error);
    res.status(500).json({ error: 'Failed to load sectors' });
  }
});

/**
 * GET /api/sectors/:sectorId
 * Get detailed information for a specific sector
 */
router.get('/sectors/:sectorId', async (req: Request, res: Response) => {
  try {
    const { sectorId } = req.params;

    // Ensure service is initialized
    if (!gicsSectorService.isInitialized()) {
      await gicsSectorService.initialize();
    }

    // Map sectorId to Sector enum
    const sector = SECTOR_ID_MAP[sectorId];
    if (!sector) {
      return res.status(404).json({ error: 'Sector not found' });
    }

    const info = SECTOR_INFO[sector];
    const colors = SECTOR_COLORS[sector];
    const allStocks = gicsSectorService.getStocksBySector(sector);
    const stocksWithIV = gicsSectorService.getStocksBySectorWithIV(sector);

    // Get industries within sector
    const industries = new Map<string, string[]>();
    for (const symbol of allStocks) {
      const stockData = gicsSectorService.getStockData(symbol);
      if (stockData && stockData.industry && stockData.industry !== 'N/A') {
        if (!industries.has(stockData.industry)) {
          industries.set(stockData.industry, []);
        }
        industries.get(stockData.industry)!.push(symbol);
      }
    }

    const industryList = Array.from(industries.entries())
      .map(([name, symbols]) => ({
        name,
        stockCount: symbols.length,
        stocks: symbols.slice(0, 10), // Limit to 10 stocks per industry
      }))
      .sort((a, b) => b.stockCount - a.stockCount);

    res.json({
      id: sectorId,
      name: sector,
      description: info.description,
      icon: info.icon,
      color: colors.primary,
      backgroundColor: colors.background,
      stockCount: allStocks.length,
      stockCountWithIV: stocksWithIV.length,
      examples: info.examples,
      industries: industryList,
      topStocks: stocksWithIV.slice(0, 20), // Top 20 stocks
    });
  } catch (error) {
    logger.error('[SectorRoutes] Failed to get sector details:', error);
    res.status(500).json({ error: 'Failed to load sector details' });
  }
});

/**
 * GET /api/sectors/:sectorId/stocks
 * Get all stocks in a specific sector (paginated)
 */
router.get('/sectors/:sectorId/stocks', async (req: Request, res: Response) => {
  try {
    const { sectorId } = req.params;
    const { page = '1', limit = '50', ivOnly = 'false' } = req.query;

    // Ensure service is initialized
    if (!gicsSectorService.isInitialized()) {
      await gicsSectorService.initialize();
    }

    // Map sectorId to Sector enum
    const sector = SECTOR_ID_MAP[sectorId];
    if (!sector) {
      return res.status(404).json({ error: 'Sector not found' });
    }

    // Get stocks
    const allStocks = ivOnly === 'true'
      ? gicsSectorService.getStocksBySectorWithIV(sector)
      : gicsSectorService.getStocksBySector(sector);

    // Pagination
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const startIdx = (pageNum - 1) * limitNum;
    const endIdx = startIdx + limitNum;
    const paginatedStocks = allStocks.slice(startIdx, endIdx);

    // Get full stock data
    const stockData = paginatedStocks.map(symbol => {
      const data = gicsSectorService.getStockData(symbol);
      return {
        symbol,
        companyName: data?.companyName,
        industry: data?.industry,
        exchange: data?.exchange,
        canCalculateIV: data?.canCalculateIV ?? false,
      };
    });

    res.json({
      sector: sector,
      page: pageNum,
      limit: limitNum,
      total: allStocks.length,
      totalPages: Math.ceil(allStocks.length / limitNum),
      stocks: stockData,
    });
  } catch (error) {
    logger.error('[SectorRoutes] Failed to get sector stocks:', error);
    res.status(500).json({ error: 'Failed to load sector stocks' });
  }
});

/**
 * GET /api/sectors/distribution
 * Get sector distribution data for charts/visualizations
 */
router.get('/sectors/distribution', async (req: Request, res: Response) => {
  try {
    // Ensure service is initialized
    if (!gicsSectorService.isInitialized()) {
      await gicsSectorService.initialize();
    }

    const distribution = gicsSectorService.getSectorDistribution();
    const totalStocks = gicsSectorService.getTotalStockCount();

    const chartData = Object.entries(distribution)
      .filter(([sector]) => sector !== Sector.OTHER) // Exclude 'Other'
      .map(([sector, count]) => {
        const sectorEnum = sector as Sector;
        const colors = SECTOR_COLORS[sectorEnum];
        const percentage = (count / totalStocks) * 100;

        return {
          sector: sectorEnum,
          count,
          percentage: parseFloat(percentage.toFixed(2)),
          color: colors.primary,
        };
      })
      .sort((a, b) => b.count - a.count);

    res.json({
      totalStocks,
      distribution: chartData,
    });
  } catch (error) {
    logger.error('[SectorRoutes] Failed to get distribution:', error);
    res.status(500).json({ error: 'Failed to load distribution' });
  }
});

export default router;
