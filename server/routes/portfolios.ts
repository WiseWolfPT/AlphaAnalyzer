/**
 * Portfolio Routes - Phase 3 Implementation
 * 
 * CRUD operations for portfolio management with real Supabase integration
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../lib/supabase-admin';
import { authMiddleware } from '../middleware/auth-middleware';
import { portfolioPerformanceService, initializePortfolioPerformanceService } from '../services/portfolio-performance-service';
import { getUnifiedAPIService } from '../services/unified-api';

const router = Router();

// Inicializar PortfolioPerformanceService com UnifiedAPIService - Fase 3.7
try {
  const unifiedAPI = getUnifiedAPIService();
  initializePortfolioPerformanceService(unifiedAPI);
  console.log('✅ PortfolioPerformanceService inicializado com UnifiedAPIService');
} catch (error) {
  console.warn('⚠️ Não foi possível injetar UnifiedAPIService no PortfolioPerformanceService:', error);
  console.log('📊 Portfolio performance continuará em modo demo');
}

// Validation schemas
const portfolioCreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  currency: z.string().min(3).max(3).default('USD'),
  is_default: z.boolean().optional().default(false)
});

const portfolioUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  currency: z.string().min(3).max(3).optional(),
  is_default: z.boolean().optional()
});

const transactionCreateSchema = z.object({
  symbol: z.string().min(1).max(10).regex(/^[A-Z]+$/, 'Symbol must be uppercase letters'),
  type: z.enum(['buy', 'sell', 'dividend']),
  quantity: z.number().positive('Quantity must be positive'),
  price: z.number().positive('Price must be positive'),
  fees: z.number().min(0).optional(),
  notes: z.string().optional(),
  date: z.string().refine(date => !isNaN(Date.parse(date)), 'Invalid date format')
});

const cashTransactionCreateSchema = z.object({
  type: z.enum(['deposit', 'withdrawal']),
  amount: z.number().positive('Amount must be positive'),
  description: z.string().optional(),
  date: z.string().refine(date => !isNaN(Date.parse(date)), 'Invalid date format')
});

// Apply authentication to all routes
router.use(authMiddleware.instance.authenticate());

/**
 * GET /api/portfolios
 * Get all portfolios for the authenticated user
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
        timestamp: new Date().toISOString()
      });
    }

    const portfolios = await db.portfolios.getByUserId(userId);

    res.json({
      success: true,
      data: portfolios,
      count: portfolios.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching portfolios:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch portfolios',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/portfolios/:id
 * Get a specific portfolio by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const portfolioId = req.params.id;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
        timestamp: new Date().toISOString()
      });
    }

    const portfolio = await db.portfolios.getById(portfolioId);

    if (!portfolio) {
      return res.status(404).json({
        success: false,
        error: 'Portfolio not found',
        timestamp: new Date().toISOString()
      });
    }

    // Check ownership
    if (portfolio.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: portfolio,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching portfolio:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch portfolio',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/portfolios
 * Create a new portfolio
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
        timestamp: new Date().toISOString()
      });
    }

    const data = portfolioCreateSchema.parse(req.body);
    
    // If this is set as default, unset other defaults
    if (data.is_default) {
      const existingPortfolios = await db.portfolios.getByUserId(userId);
      for (const portfolio of existingPortfolios) {
        if (portfolio.is_default) {
          await db.portfolios.update(portfolio.id, { is_default: false });
        }
      }
    }

    const portfolio = await db.portfolios.create({
      user_id: userId,
      name: data.name,
      description: data.description || null,
      currency: data.currency,
      is_default: data.is_default
    });

    res.status(201).json({
      success: true,
      data: portfolio,
      message: 'Portfolio created successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error creating portfolio:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
        timestamp: new Date().toISOString()
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to create portfolio',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PUT /api/portfolios/:id
 * Update a portfolio
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const portfolioId = req.params.id;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
        timestamp: new Date().toISOString()
      });
    }

    const data = portfolioUpdateSchema.parse(req.body);

    // Check ownership
    const existingPortfolio = await db.portfolios.getById(portfolioId);
    if (!existingPortfolio || existingPortfolio.user_id !== userId) {
      return res.status(404).json({
        success: false,
        error: 'Portfolio not found',
        timestamp: new Date().toISOString()
      });
    }

    // If setting as default, unset other defaults
    if (data.is_default) {
      const userPortfolios = await db.portfolios.getByUserId(userId);
      for (const portfolio of userPortfolios) {
        if (portfolio.id !== portfolioId && portfolio.is_default) {
          await db.portfolios.update(portfolio.id, { is_default: false });
        }
      }
    }

    const updatedPortfolio = await db.portfolios.update(portfolioId, data);

    res.json({
      success: true,
      data: updatedPortfolio,
      message: 'Portfolio updated successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error updating portfolio:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
        timestamp: new Date().toISOString()
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to update portfolio',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * DELETE /api/portfolios/:id
 * Delete a portfolio
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const portfolioId = req.params.id;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
        timestamp: new Date().toISOString()
      });
    }

    // Check ownership
    const existingPortfolio = await db.portfolios.getById(portfolioId);
    if (!existingPortfolio || existingPortfolio.user_id !== userId) {
      return res.status(404).json({
        success: false,
        error: 'Portfolio not found',
        timestamp: new Date().toISOString()
      });
    }

    const success = await db.portfolios.delete(portfolioId);

    if (!success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to delete portfolio',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: 'Portfolio deleted successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error deleting portfolio:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete portfolio',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/portfolios/:id/holdings
 * Get portfolio holdings
 */
router.get('/:id/holdings', async (req: Request, res: Response) => {
  try {
    const portfolioId = req.params.id;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
        timestamp: new Date().toISOString()
      });
    }

    // Check ownership
    const portfolio = await db.portfolios.getById(portfolioId);
    if (!portfolio || portfolio.user_id !== userId) {
      return res.status(404).json({
        success: false,
        error: 'Portfolio not found',
        timestamp: new Date().toISOString()
      });
    }

    const holdings = await db.portfolios.getHoldings(portfolioId);

    res.json({
      success: true,
      data: holdings,
      count: holdings.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching holdings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch holdings',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/portfolios/:id/transactions
 * Get portfolio transactions
 */
router.get('/:id/transactions', async (req: Request, res: Response) => {
  try {
    const portfolioId = req.params.id;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
        timestamp: new Date().toISOString()
      });
    }

    // Check ownership
    const portfolio = await db.portfolios.getById(portfolioId);
    if (!portfolio || portfolio.user_id !== userId) {
      return res.status(404).json({
        success: false,
        error: 'Portfolio not found',
        timestamp: new Date().toISOString()
      });
    }

    const transactions = await db.transactions.getByPortfolio(portfolioId);

    res.json({
      success: true,
      data: transactions,
      count: transactions.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transactions',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/portfolios/:id/transactions
 * Add a new transaction to portfolio
 */
router.post('/:id/transactions', async (req: Request, res: Response) => {
  try {
    const portfolioId = req.params.id;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
        timestamp: new Date().toISOString()
      });
    }

    // Check ownership
    const portfolio = await db.portfolios.getById(portfolioId);
    if (!portfolio || portfolio.user_id !== userId) {
      return res.status(404).json({
        success: false,
        error: 'Portfolio not found',
        timestamp: new Date().toISOString()
      });
    }

    const data = transactionCreateSchema.parse(req.body);

    const transaction = await db.transactions.create({
      portfolio_id: portfolioId,
      symbol: data.symbol.toUpperCase(),
      type: data.type,
      quantity: data.quantity,
      price: data.price,
      fees: data.fees || 0,
      notes: data.notes || null,
      date: data.date
    });

    // Trigger holdings recalculation (this is handled by database triggers)
    await db.helpers.updatePortfolioHoldings(portfolioId);

    res.status(201).json({
      success: true,
      data: transaction,
      message: 'Transaction added successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error creating transaction:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
        timestamp: new Date().toISOString()
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to create transaction',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/portfolios/:id/performance
 * Get portfolio performance metrics
 */
router.get('/:id/performance', async (req: Request, res: Response) => {
  try {
    const portfolioId = req.params.id;
    const userId = req.user?.id;
    const days = parseInt(req.query.days as string) || 30;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
        timestamp: new Date().toISOString()
      });
    }

    // Check ownership
    const portfolio = await db.portfolios.getById(portfolioId);
    if (!portfolio || portfolio.user_id !== userId) {
      return res.status(404).json({
        success: false,
        error: 'Portfolio not found',
        timestamp: new Date().toISOString()
      });
    }

    const performance = await db.portfolios.getPerformance(portfolioId, days);

    res.json({
      success: true,
      data: performance,
      period: { days },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching performance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch performance data',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/portfolios/:id/analysis
 * Get comprehensive portfolio analysis with advanced metrics
 */
router.get('/:id/analysis', async (req: Request, res: Response) => {
  try {
    const portfolioId = req.params.id;
    const userId = req.user?.id;
    const days = parseInt(req.query.days as string) || 30;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
        timestamp: new Date().toISOString()
      });
    }

    // Check ownership
    const portfolio = await db.portfolios.getById(portfolioId);
    if (!portfolio || portfolio.user_id !== userId) {
      return res.status(404).json({
        success: false,
        error: 'Portfolio not found',
        timestamp: new Date().toISOString()
      });
    }

    // Get comprehensive analysis
    const analysis = await portfolioPerformanceService.calculatePortfolioPerformance(portfolioId, days);

    // Record performance snapshot for historical tracking
    await portfolioPerformanceService.recordPerformanceSnapshot(portfolioId, analysis);

    res.json({
      success: true,
      data: analysis,
      period: { days },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching portfolio analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch portfolio analysis',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/portfolios/:id/benchmark
 * Compare portfolio performance to benchmark
 */
router.get('/:id/benchmark', async (req: Request, res: Response) => {
  try {
    const portfolioId = req.params.id;
    const userId = req.user?.id;
    const benchmark = req.query.benchmark as string || 'SPY';

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
        timestamp: new Date().toISOString()
      });
    }

    // Check ownership
    const portfolio = await db.portfolios.getById(portfolioId);
    if (!portfolio || portfolio.user_id !== userId) {
      return res.status(404).json({
        success: false,
        error: 'Portfolio not found',
        timestamp: new Date().toISOString()
      });
    }

    const comparison = await portfolioPerformanceService.calculateBenchmarkComparison(portfolioId, benchmark);

    res.json({
      success: true,
      data: comparison,
      benchmark,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching benchmark comparison:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch benchmark comparison',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/portfolios/:id/cash-transactions
 * Add cash deposit/withdrawal
 */
router.post('/:id/cash-transactions', async (req: Request, res: Response) => {
  try {
    const portfolioId = req.params.id;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
        timestamp: new Date().toISOString()
      });
    }

    // Check ownership
    const portfolio = await db.portfolios.getById(portfolioId);
    if (!portfolio || portfolio.user_id !== userId) {
      return res.status(404).json({
        success: false,
        error: 'Portfolio not found',
        timestamp: new Date().toISOString()
      });
    }

    const data = cashTransactionCreateSchema.parse(req.body);

    const cashTransaction = await db.cashTransactions.create({
      portfolio_id: portfolioId,
      type: data.type,
      amount: data.amount,
      description: data.description || null,
      date: data.date
    });

    res.status(201).json({
      success: true,
      data: cashTransaction,
      message: 'Cash transaction added successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error creating cash transaction:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
        timestamp: new Date().toISOString()
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to create cash transaction',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/portfolios/:id/summary
 * Get portfolio summary with current values
 */
router.get('/:id/summary', async (req: Request, res: Response) => {
  try {
    const portfolioId = req.params.id;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
        timestamp: new Date().toISOString()
      });
    }

    // Check ownership
    const portfolio = await db.portfolios.getById(portfolioId);
    if (!portfolio || portfolio.user_id !== userId) {
      return res.status(404).json({
        success: false,
        error: 'Portfolio not found',
        timestamp: new Date().toISOString()
      });
    }

    const summary = await db.helpers.getPortfolioSummary(portfolioId);

    res.json({
      success: true,
      data: summary,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching portfolio summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch portfolio summary',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;