import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth-middleware';
import { rateLimitMiddleware } from '../middleware/rate-limit-middleware';
import { supabaseDb } from '../db/supabase-db';

const router = Router();

// Rate limiting for portfolio endpoints
const portfolioRateLimit = rateLimitMiddleware.endpointRateLimit('/api/portfolios', {
  'free': 30,     // 30 requests per hour
  'pro': 100,     // 100 requests per hour
  'premium': 500, // 500 requests per hour
});

// Validation schemas
const createPortfolioSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  currency: z.string().length(3).default('USD'),
  is_default: z.boolean().default(false),
});

const updatePortfolioSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  currency: z.string().length(3).optional(),
  is_default: z.boolean().optional(),
});

const createTransactionSchema = z.object({
  symbol: z.string().min(1).max(10).toUpperCase(),
  type: z.enum(['buy', 'sell']),
  quantity: z.number().positive(),
  price: z.number().positive(),
  fees: z.number().min(0).default(0),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD format
  notes: z.string().max(500).optional(),
});

/**
 * GET /api/portfolios
 * Get all portfolios for the authenticated user
 */
router.get('/',
  authMiddleware.instance.authenticate(),
  portfolioRateLimit,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      
      console.log(`📊 Fetching portfolios for user ${userId}`);
      
      const portfolios = await supabaseDb.portfolios.findByUserId(userId);
      
      res.json({
        count: portfolios.length,
        portfolios,
      });
    } catch (error) {
      console.error('Error fetching portfolios:', error);
      res.status(500).json({
        error: 'FETCH_ERROR',
        message: 'Failed to fetch portfolios',
      });
    }
  }
);

/**
 * GET /api/portfolios/:id
 * Get a specific portfolio with all details
 */
router.get('/:id',
  authMiddleware.instance.authenticate(),
  portfolioRateLimit,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      
      console.log(`📊 Fetching portfolio ${id}`);
      
      const portfolio = await supabaseDb.portfolios.findById(id);
      
      if (!portfolio) {
        return res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Portfolio not found',
        });
      }
      
      // Check ownership
      if (portfolio.user_id !== userId) {
        return res.status(403).json({
          error: 'FORBIDDEN',
          message: 'Access denied',
        });
      }
      
      res.json(portfolio);
    } catch (error) {
      console.error('Error fetching portfolio:', error);
      res.status(500).json({
        error: 'FETCH_ERROR',
        message: 'Failed to fetch portfolio',
      });
    }
  }
);

/**
 * POST /api/portfolios
 * Create a new portfolio
 */
router.post('/',
  authMiddleware.instance.authenticate(),
  portfolioRateLimit,
  async (req: Request, res: Response) => {
    try {
      const validation = createPortfolioSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'INVALID_DATA',
          message: validation.error.errors[0].message,
        });
      }
      
      const userId = req.user!.id;
      const portfolioData = validation.data;
      
      console.log(`📊 Creating portfolio "${portfolioData.name}" for user ${userId}`);
      
      // If this is set as default, unset other defaults
      if (portfolioData.is_default) {
        const existingPortfolios = await supabaseDb.portfolios.findByUserId(userId);
        for (const portfolio of existingPortfolios) {
          if (portfolio.is_default) {
            await supabaseDb.portfolios.update(portfolio.id, { is_default: false });
          }
        }
      }
      
      const portfolio = await supabaseDb.portfolios.create({
        ...portfolioData,
        user_id: userId,
      });
      
      res.status(201).json({
        message: 'Portfolio created successfully',
        portfolio,
      });
    } catch (error) {
      console.error('Error creating portfolio:', error);
      res.status(500).json({
        error: 'CREATE_ERROR',
        message: 'Failed to create portfolio',
      });
    }
  }
);

/**
 * PUT /api/portfolios/:id
 * Update a portfolio
 */
router.put('/:id',
  authMiddleware.instance.authenticate(),
  portfolioRateLimit,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      
      const validation = updatePortfolioSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'INVALID_DATA',
          message: validation.error.errors[0].message,
        });
      }
      
      console.log(`📊 Updating portfolio ${id}`);
      
      // Check ownership
      const existingPortfolio = await supabaseDb.portfolios.findById(id);
      if (!existingPortfolio) {
        return res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Portfolio not found',
        });
      }
      
      if (existingPortfolio.user_id !== userId) {
        return res.status(403).json({
          error: 'FORBIDDEN',
          message: 'Access denied',
        });
      }
      
      const updates = validation.data;
      
      // If setting as default, unset other defaults
      if (updates.is_default === true) {
        const portfolios = await supabaseDb.portfolios.findByUserId(userId);
        for (const portfolio of portfolios) {
          if (portfolio.id !== id && portfolio.is_default) {
            await supabaseDb.portfolios.update(portfolio.id, { is_default: false });
          }
        }
      }
      
      const updatedPortfolio = await supabaseDb.portfolios.update(id, updates);
      
      res.json({
        message: 'Portfolio updated successfully',
        portfolio: updatedPortfolio,
      });
    } catch (error) {
      console.error('Error updating portfolio:', error);
      res.status(500).json({
        error: 'UPDATE_ERROR',
        message: 'Failed to update portfolio',
      });
    }
  }
);

/**
 * DELETE /api/portfolios/:id
 * Delete a portfolio
 */
router.delete('/:id',
  authMiddleware.instance.authenticate(),
  portfolioRateLimit,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      
      console.log(`📊 Deleting portfolio ${id}`);
      
      // Check ownership
      const portfolio = await supabaseDb.portfolios.findById(id);
      if (!portfolio) {
        return res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Portfolio not found',
        });
      }
      
      if (portfolio.user_id !== userId) {
        return res.status(403).json({
          error: 'FORBIDDEN',
          message: 'Access denied',
        });
      }
      
      await supabaseDb.portfolios.delete(id);
      
      res.json({
        message: 'Portfolio deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting portfolio:', error);
      res.status(500).json({
        error: 'DELETE_ERROR',
        message: 'Failed to delete portfolio',
      });
    }
  }
);

/**
 * POST /api/portfolios/:id/transactions
 * Add a transaction to a portfolio
 */
router.post('/:id/transactions',
  authMiddleware.instance.authenticate(),
  portfolioRateLimit,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      
      const validation = createTransactionSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'INVALID_DATA',
          message: validation.error.errors[0].message,
        });
      }
      
      console.log(`📊 Adding transaction to portfolio ${id}`);
      
      // Check ownership
      const portfolio = await supabaseDb.portfolios.findById(id);
      if (!portfolio) {
        return res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Portfolio not found',
        });
      }
      
      if (portfolio.user_id !== userId) {
        return res.status(403).json({
          error: 'FORBIDDEN',
          message: 'Access denied',
        });
      }
      
      const transactionData = validation.data;
      
      // Create stock record if it doesn't exist
      await supabaseDb.stocks.upsert({
        symbol: transactionData.symbol,
        name: `${transactionData.symbol} Company`, // Will be updated by market data service
      });
      
      const transaction = await supabaseDb.transactions.create({
        ...transactionData,
        portfolio_id: id,
      });
      
      res.status(201).json({
        message: 'Transaction added successfully',
        transaction,
      });
    } catch (error) {
      console.error('Error adding transaction:', error);
      res.status(500).json({
        error: 'CREATE_ERROR',
        message: 'Failed to add transaction',
      });
    }
  }
);

/**
 * GET /api/portfolios/:id/transactions
 * Get all transactions for a portfolio
 */
router.get('/:id/transactions',
  authMiddleware.instance.authenticate(),
  portfolioRateLimit,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      
      console.log(`📊 Fetching transactions for portfolio ${id}`);
      
      // Check ownership
      const portfolio = await supabaseDb.portfolios.findById(id);
      if (!portfolio) {
        return res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Portfolio not found',
        });
      }
      
      if (portfolio.user_id !== userId) {
        return res.status(403).json({
          error: 'FORBIDDEN',
          message: 'Access denied',
        });
      }
      
      const transactions = await supabaseDb.transactions.findByPortfolioId(id);
      
      res.json({
        count: transactions.length,
        transactions,
      });
    } catch (error) {
      console.error('Error fetching transactions:', error);
      res.status(500).json({
        error: 'FETCH_ERROR',
        message: 'Failed to fetch transactions',
      });
    }
  }
);

export default router;