import { Router } from 'express';
import { z } from 'zod';
import { enhancedValuationService } from '../services/enhanced-valuation-service';
import { authMiddleware } from '../middleware/auth-middleware';
import { validateRequest } from '../security/security-middleware';
import type { 
  ValuationModelType, 
  DCFParameters, 
  DDMParameters,
  PEMultipleParameters,
  PEGParameters,
  GrahamParameters,
  AssetBasedParameters,
  RevenueMultipleParameters,
  EBITDAMultipleParameters
} from '@shared/schema';

const router = Router();
const authService = authMiddleware.instance;

// Validation schemas for different valuation models
const dcfParametersSchema = z.object({
  eps: z.number().positive(),
  growthRate: z.number().min(0).max(50),
  terminalGrowthRate: z.number().min(0).max(10).optional(),
  horizon: z.number().min(3).max(20),
  requiredReturn: z.number().min(1).max(50),
  marginOfSafety: z.number().min(0).max(50),
  peMultiple: z.number().positive().optional()
});

const ddmParametersSchema = z.object({
  currentDividend: z.number().positive(),
  dividendGrowthRate: z.number().min(0).max(20),
  requiredReturn: z.number().min(1).max(30),
  marginOfSafety: z.number().min(0).max(50)
});

const peMultipleParametersSchema = z.object({
  currentEPS: z.number().positive(),
  industryPE: z.number().positive(),
  peerPEs: z.array(z.number().positive()),
  marginOfSafety: z.number().min(0).max(50)
});

const pegParametersSchema = z.object({
  currentPE: z.number().positive(),
  growthRate: z.number().positive(),
  marginOfSafety: z.number().min(0).max(50)
});

const grahamParametersSchema = z.object({
  eps: z.number().positive(),
  expectedGrowthRate: z.number().min(0).max(20),
  aaaCorpBondYield: z.number().positive(),
  marginOfSafety: z.number().min(0).max(50)
});

const assetBasedParametersSchema = z.object({
  bookValue: z.number().positive(),
  tangibleBookValue: z.number().positive(),
  adjustments: z.number(),
  marginOfSafety: z.number().min(0).max(50)
});

const revenueMultipleParametersSchema = z.object({
  revenue: z.number().positive(),
  industryRevenueMultiple: z.number().positive(),
  peerMultiples: z.array(z.number().positive()),
  marginOfSafety: z.number().min(0).max(50)
});

const ebitdaMultipleParametersSchema = z.object({
  ebitda: z.number().positive(),
  industryEVEBITDA: z.number().positive(),
  peerMultiples: z.array(z.number().positive()),
  netDebt: z.number(),
  marginOfSafety: z.number().min(0).max(50)
});

const calculateValuationSchema = z.object({
  symbol: z.string().regex(/^[A-Z0-9\-\.]+$/).transform(val => val.toUpperCase()),
  modelType: z.enum(['dcf', 'ddm', 'pe_multiple', 'peg', 'graham', 'asset_based', 'revenue_multiple', 'ebitda_multiple']),
  parameters: z.object({}).passthrough(), // Will be validated based on modelType
});

const monteCarloSchema = z.object({
  symbol: z.string().regex(/^[A-Z0-9\-\.]+$/).transform(val => val.toUpperCase()),
  modelType: z.enum(['dcf', 'ddm', 'pe_multiple', 'peg', 'graham', 'asset_based', 'revenue_multiple', 'ebitda_multiple']),
  parameters: z.object({}).passthrough(),
  iterations: z.number().min(100).max(10000).default(1000)
});

// GET /api/valuation/enhanced/:symbol - Get comprehensive valuation analysis
router.get('/enhanced/:symbol', 
  authService.optionalAuth(),
  async (req, res) => {
    try {
      const symbol = req.params.symbol.toUpperCase();
      
      // TODO: Get real stock and market data
      const mockStockData = {
        eps: 5.25,
        growthRate: 12,
        currentPrice: 150,
        peRatio: 18.5,
        dividendYield: 2.1,
        dividend: 3.15,
        sector: 'Technology'
      };
      
      const mockMarketData = {
        industryPE: 19.2,
        peerPEs: [16.8, 17.2, 18.9, 19.5, 20.1],
        aaaCorpBondYield: 4.5,
        sectorMultiples: {
          revenue: 5.2,
          ebitda: 12.8
        }
      };

      const result = await enhancedValuationService.calculateComprehensiveValuation(
        symbol,
        mockStockData,
        mockMarketData
      );

      res.json(result);
    } catch (error) {
      console.error('Enhanced valuation error:', error);
      res.status(500).json({ 
        message: 'Failed to calculate enhanced valuation',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

// GET /api/valuation/models/:symbol - Get all valuation models for a symbol
router.get('/models/:symbol',
  authService.optionalAuth(),
  async (req, res) => {
    try {
      const symbol = req.params.symbol.toUpperCase();
      
      // TODO: Fetch from database
      // For now, return mock data
      const result = await enhancedValuationService.calculateComprehensiveValuation(
        symbol,
        { eps: 5.25, growthRate: 12, currentPrice: 150, peRatio: 18.5, dividendYield: 2.1 },
        { industryPE: 19.2, peerPEs: [16.8, 17.2, 18.9, 19.5, 20.1], aaaCorpBondYield: 4.5 }
      );

      res.json(result.models);
    } catch (error) {
      console.error('Valuation models error:', error);
      res.status(500).json({ message: 'Failed to fetch valuation models' });
    }
  }
);

// GET /api/valuation/summary/:symbol - Get valuation summary
router.get('/summary/:symbol',
  authService.optionalAuth(),
  async (req, res) => {
    try {
      const symbol = req.params.symbol.toUpperCase();
      
      // TODO: Fetch from database
      const result = await enhancedValuationService.calculateComprehensiveValuation(
        symbol,
        { eps: 5.25, growthRate: 12, currentPrice: 150, peRatio: 18.5, dividendYield: 2.1 },
        { industryPE: 19.2, peerPEs: [16.8, 17.2, 18.9, 19.5, 20.1], aaaCorpBondYield: 4.5 }
      );

      res.json(result.summary);
    } catch (error) {
      console.error('Valuation summary error:', error);
      res.status(500).json({ message: 'Failed to fetch valuation summary' });
    }
  }
);

// POST /api/valuation/calculate - Calculate specific valuation model
router.post('/calculate',
  authService.authenticate(),
  validateRequest(calculateValuationSchema),
  async (req, res) => {
    try {
      const { symbol, modelType, parameters } = req.body;
      const currentPrice = 150; // TODO: Get from stock data

      // Validate parameters based on model type
      let validatedParams;
      switch (modelType) {
        case 'dcf':
          validatedParams = dcfParametersSchema.parse(parameters);
          break;
        case 'ddm':
          validatedParams = ddmParametersSchema.parse(parameters);
          break;
        case 'pe_multiple':
          validatedParams = peMultipleParametersSchema.parse(parameters);
          break;
        case 'peg':
          validatedParams = pegParametersSchema.parse(parameters);
          break;
        case 'graham':
          validatedParams = grahamParametersSchema.parse(parameters);
          break;
        case 'asset_based':
          validatedParams = assetBasedParametersSchema.parse(parameters);
          break;
        case 'revenue_multiple':
          validatedParams = revenueMultipleParametersSchema.parse(parameters);
          break;
        case 'ebitda_multiple':
          validatedParams = ebitdaMultipleParametersSchema.parse(parameters);
          break;
        default:
          return res.status(400).json({ message: 'Invalid model type' });
      }

      // Calculate valuation using the service
      let result;
      switch (modelType) {
        case 'dcf':
          result = enhancedValuationService.calculateDCF(validatedParams as DCFParameters, currentPrice);
          break;
        case 'ddm':
          result = enhancedValuationService.calculateDDM(validatedParams as DDMParameters, currentPrice);
          break;
        case 'pe_multiple':
          result = enhancedValuationService.calculatePEMultiple(validatedParams as PEMultipleParameters, currentPrice);
          break;
        case 'peg':
          result = enhancedValuationService.calculatePEG(validatedParams as PEGParameters, currentPrice);
          break;
        case 'graham':
          result = enhancedValuationService.calculateGraham(validatedParams as GrahamParameters, currentPrice);
          break;
        case 'asset_based':
          result = enhancedValuationService.calculateAssetBased(validatedParams as AssetBasedParameters, currentPrice);
          break;
        case 'revenue_multiple':
          result = enhancedValuationService.calculateRevenueMultiple(validatedParams as RevenueMultipleParameters, currentPrice);
          break;
        case 'ebitda_multiple':
          result = enhancedValuationService.calculateEBITDAMultiple(validatedParams as EBITDAMultipleParameters, currentPrice);
          break;
      }

      result.stockSymbol = symbol;

      // TODO: Save to database

      res.json(result);
    } catch (error) {
      console.error('Calculate valuation error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Invalid parameters', 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: 'Failed to calculate valuation' });
    }
  }
);

// POST /api/valuation/recalculate/:symbol - Recalculate all models for a symbol
router.post('/recalculate/:symbol',
  authService.authenticate(),
  async (req, res) => {
    try {
      const symbol = req.params.symbol.toUpperCase();
      
      // TODO: Get fresh stock and market data
      const mockStockData = {
        eps: 5.25,
        growthRate: 12,
        currentPrice: 150,
        peRatio: 18.5,
        dividendYield: 2.1,
        dividend: 3.15,
        sector: 'Technology'
      };
      
      const mockMarketData = {
        industryPE: 19.2,
        peerPEs: [16.8, 17.2, 18.9, 19.5, 20.1],
        aaaCorpBondYield: 4.5
      };

      const result = await enhancedValuationService.calculateComprehensiveValuation(
        symbol,
        mockStockData,
        mockMarketData
      );

      // TODO: Save to database

      res.json({
        message: 'All valuation models recalculated',
        result
      });
    } catch (error) {
      console.error('Recalculate valuation error:', error);
      res.status(500).json({ message: 'Failed to recalculate valuations' });
    }
  }
);

// POST /api/valuation/monte-carlo - Run Monte Carlo simulation
router.post('/monte-carlo',
  authService.authenticate(),
  validateRequest(monteCarloSchema),
  async (req, res) => {
    try {
      const { symbol, modelType, parameters, iterations } = req.body;
      const currentPrice = 150; // TODO: Get from stock data

      // Validate parameters based on model type (same as calculate endpoint)
      let validatedParams;
      switch (modelType) {
        case 'dcf':
          validatedParams = dcfParametersSchema.parse(parameters);
          break;
        case 'ddm':
          validatedParams = ddmParametersSchema.parse(parameters);
          break;
        // Add other cases as needed
        default:
          return res.status(400).json({ message: 'Monte Carlo not supported for this model type yet' });
      }

      const simulation = enhancedValuationService.runMonteCarloSimulation(
        modelType,
        validatedParams,
        currentPrice,
        iterations
      );

      res.json({
        symbol,
        modelType,
        iterations,
        simulation
      });
    } catch (error) {
      console.error('Monte Carlo simulation error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Invalid parameters', 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: 'Failed to run Monte Carlo simulation' });
    }
  }
);

// GET /api/valuation/peer-comparison/:symbol - Get peer comparison data
router.get('/peer-comparison/:symbol',
  authService.optionalAuth(),
  async (req, res) => {
    try {
      const symbol = req.params.symbol.toUpperCase();
      
      // TODO: Implement real peer comparison
      const mockPeerData = {
        symbol,
        sector: 'Technology',
        peers: [
          { symbol: 'AAPL', name: 'Apple Inc.', pe: 18.2, pb: 5.1, ps: 6.8, ev_ebitda: 15.2 },
          { symbol: 'MSFT', name: 'Microsoft Corp.', pe: 19.5, pb: 4.8, ps: 7.2, ev_ebitda: 16.1 },
          { symbol: 'GOOGL', name: 'Alphabet Inc.', pe: 17.8, pb: 3.9, ps: 4.5, ev_ebitda: 14.8 },
        ],
        industryAverages: {
          pe: 18.5,
          pb: 4.6,
          ps: 6.2,
          ev_ebitda: 15.4
        },
        currentStock: {
          pe: 18.5,
          pb: 4.2,
          ps: 5.8,
          ev_ebitda: 15.1
        }
      };

      res.json(mockPeerData);
    } catch (error) {
      console.error('Peer comparison error:', error);
      res.status(500).json({ message: 'Failed to fetch peer comparison' });
    }
  }
);

// GET /api/valuation/sector/:sector - Get sector valuation metrics
router.get('/sector/:sector',
  authService.optionalAuth(),
  async (req, res) => {
    try {
      const sector = req.params.sector;
      
      // TODO: Implement real sector data
      const mockSectorData = {
        sector,
        averageMetrics: {
          pe: 18.5,
          pb: 4.6,
          ps: 6.2,
          ev_ebitda: 15.4,
          roe: 15.2,
          roa: 8.5,
          debt_to_equity: 0.45
        },
        medianMetrics: {
          pe: 17.2,
          pb: 4.1,
          ps: 5.8,
          ev_ebitda: 14.9,
          roe: 14.8,
          roa: 8.1,
          debt_to_equity: 0.38
        },
        quartiles: {
          pe: { q1: 14.5, q3: 21.8 },
          pb: { q1: 2.8, q3: 6.2 },
          ps: { q1: 3.2, q3: 8.5 }
        }
      };

      res.json(mockSectorData);
    } catch (error) {
      console.error('Sector valuation error:', error);
      res.status(500).json({ message: 'Failed to fetch sector valuation' });
    }
  }
);

// GET /api/valuation/historical/:symbol - Get historical valuation data
router.get('/historical/:symbol',
  authService.optionalAuth(),
  async (req, res) => {
    try {
      const symbol = req.params.symbol.toUpperCase();
      
      // TODO: Implement real historical data
      const mockHistoricalData = {
        symbol,
        valuationHistory: Array.from({ length: 12 }, (_, i) => ({
          date: new Date(Date.now() - (11 - i) * 30 * 24 * 60 * 60 * 1000).toISOString(),
          consensusValue: 145 + Math.random() * 20,
          actualPrice: 140 + Math.random() * 25,
          safetyMargin: (Math.random() - 0.5) * 30,
          modelCount: 3 + Math.floor(Math.random() * 3)
        })),
        accuracyMetrics: {
          averageError: 8.5,
          correctDirectionPercentage: 72,
          valuationAccuracy: 'Good'
        }
      };

      res.json(mockHistoricalData);
    } catch (error) {
      console.error('Historical valuation error:', error);
      res.status(500).json({ message: 'Failed to fetch historical valuation' });
    }
  }
);

// POST /api/valuation/validate - Validate model parameters
router.post('/validate',
  authService.authenticate(),
  async (req, res) => {
    try {
      const { modelType, parameters } = req.body;

      let validation = { valid: false, errors: [] as string[] };

      try {
        switch (modelType) {
          case 'dcf':
            dcfParametersSchema.parse(parameters);
            validation.valid = true;
            break;
          case 'ddm':
            ddmParametersSchema.parse(parameters);
            validation.valid = true;
            break;
          case 'pe_multiple':
            peMultipleParametersSchema.parse(parameters);
            validation.valid = true;
            break;
          case 'peg':
            pegParametersSchema.parse(parameters);
            validation.valid = true;
            break;
          case 'graham':
            grahamParametersSchema.parse(parameters);
            validation.valid = true;
            break;
          case 'asset_based':
            assetBasedParametersSchema.parse(parameters);
            validation.valid = true;
            break;
          case 'revenue_multiple':
            revenueMultipleParametersSchema.parse(parameters);
            validation.valid = true;
            break;
          case 'ebitda_multiple':
            ebitdaMultipleParametersSchema.parse(parameters);
            validation.valid = true;
            break;
          default:
            validation.errors.push('Invalid model type');
        }
      } catch (error) {
        if (error instanceof z.ZodError) {
          validation.errors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
        }
      }

      res.json(validation);
    } catch (error) {
      console.error('Parameter validation error:', error);
      res.status(500).json({ message: 'Failed to validate parameters' });
    }
  }
);

export default router;