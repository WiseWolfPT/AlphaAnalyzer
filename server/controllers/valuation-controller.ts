/**
 * Valuation Controller - FASE 2
 *
 * Express request handlers for AlfaValue™ valuation endpoints
 */

import { Request, Response } from 'express';
import { valuationService } from '../services/valuation-service';
import { Region } from '../types/valuation';

/**
 * GET /api/iv/:ticker/main
 * Get AlfaValue™ intrinsic value calculation for a stock
 */
export const getAlfaValue = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ticker } = req.params;

    if (!ticker || typeof ticker !== 'string') {
      res.status(400).json({
        error: 'Stock ticker is required',
        code: 'MISSING_TICKER',
      });
      return;
    }

    console.log(`[ValuationController] GET /api/iv/${ticker}/main`);

    const result = await valuationService.getAlfaValue(ticker);

    res.json(result);
  } catch (error: any) {
    console.error('[ValuationController] Error in getAlfaValue:', error);

    res.status(500).json({
      error: error.message || 'Failed to calculate intrinsic value',
      code: 'VALUATION_ERROR',
    });
  }
};

/**
 * GET /api/iv/rf?region=US
 * Get risk-free rate for a region
 */
export const getRiskFree = async (req: Request, res: Response): Promise<void> => {
  try {
    const region = (req.query.region as string)?.toUpperCase() || 'US';

    // Validate region
    const validRegions = ['US', 'EU', 'CN', 'BR', 'UK', 'JP'];
    if (!validRegions.includes(region)) {
      res.status(400).json({
        error: `Invalid region. Must be one of: ${validRegions.join(', ')}`,
        code: 'INVALID_REGION',
      });
      return;
    }

    console.log(`[ValuationController] GET /api/iv/rf?region=${region}`);

    const result = await valuationService.getRiskFree(region as Region);

    res.json(result);
  } catch (error: any) {
    console.error('[ValuationController] Error in getRiskFree:', error);

    res.status(500).json({
      error: error.message || 'Failed to fetch risk-free rate',
      code: 'RF_ERROR',
    });
  }
};

/**
 * GET /api/iv/mrp?region=US
 * Get market risk premium for a region
 */
export const getMRP = async (req: Request, res: Response): Promise<void> => {
  try {
    const region = (req.query.region as string)?.toUpperCase() || 'US';

    // Validate region
    const validRegions = ['US', 'EU', 'CN', 'BR', 'UK', 'JP'];
    if (!validRegions.includes(region)) {
      res.status(400).json({
        error: `Invalid region. Must be one of: ${validRegions.join(', ')}`,
        code: 'INVALID_REGION',
      });
      return;
    }

    console.log(`[ValuationController] GET /api/iv/mrp?region=${region}`);

    const result = await valuationService.getMRP(region as Region);

    res.json(result);
  } catch (error: any) {
    console.error('[ValuationController] Error in getMRP:', error);

    res.status(500).json({
      error: error.message || 'Failed to fetch market risk premium',
      code: 'MRP_ERROR',
    });
  }
};

/**
 * GET /api/iv/gterm?region=US
 * Get terminal growth rate for a region
 */
export const getGTerm = async (req: Request, res: Response): Promise<void> => {
  try {
    const region = (req.query.region as string)?.toUpperCase() || 'US';

    // Validate region
    const validRegions = ['US', 'EU', 'CN', 'BR', 'UK', 'JP'];
    if (!validRegions.includes(region)) {
      res.status(400).json({
        error: `Invalid region. Must be one of: ${validRegions.join(', ')}`,
        code: 'INVALID_REGION',
      });
      return;
    }

    console.log(`[ValuationController] GET /api/iv/gterm?region=${region}`);

    const result = await valuationService.getGTerm(region as Region);

    res.json(result);
  } catch (error: any) {
    console.error('[ValuationController] Error in getGTerm:', error);

    res.status(500).json({
      error: error.message || 'Failed to fetch terminal growth rate',
      code: 'GTERM_ERROR',
    });
  }
};

/**
 * GET /api/iv/sector/growth?industry=Technology
 * Get sector mid-growth rate for an industry
 */
export const getSectorGrowth = async (req: Request, res: Response): Promise<void> => {
  try {
    const industry = req.query.industry as string;

    if (!industry || typeof industry !== 'string') {
      res.status(400).json({
        error: 'Industry parameter is required',
        code: 'MISSING_INDUSTRY',
      });
      return;
    }

    console.log(`[ValuationController] GET /api/iv/sector/growth?industry=${industry}`);

    const result = await valuationService.getSectorGrowth(industry);

    res.json(result);
  } catch (error: any) {
    console.error('[ValuationController] Error in getSectorGrowth:', error);

    res.status(500).json({
      error: error.message || 'Failed to fetch sector growth rate',
      code: 'SECTOR_GROWTH_ERROR',
    });
  }
};
