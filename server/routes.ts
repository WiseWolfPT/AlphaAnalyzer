import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertStockSchema, insertWatchlistSchema, insertWatchlistStockSchema, insertIntrinsicValueSchema, insertRecentSearchSchema } from "@shared/schema";
import { z } from "zod";
import marketDataRouter from "./routes/market-data";
import authRouter from "./routes/auth";
import adminRouter from "./routes/admin";
import subscriptionsRouter from "./routes/subscriptions";
import enhancedValuationRouter from "./routes/enhanced-valuation";
import healthRouter from "./routes/health";
import stocksRouter from "./routes/stocks";
import { authMiddleware } from "./middleware/auth-middleware";
import { validateRequest, validationSchemas } from "./security/security-middleware";

// SECURITY FIX: Add API versioning for backward compatibility
const API_VERSION = 'v1';

// SECURITY FIX: Comprehensive validation schemas for all endpoints
const routeValidationSchemas = {
  // Stock routes validation
  getStocks: z.object({
    limit: z.coerce.number().min(1).max(100).default(50),
    offset: z.coerce.number().min(0).default(0),
  }),
  
  searchStocks: z.object({
    q: z.string().min(1).max(50).regex(/^[A-Za-z0-9\s\-\.]+$/, 'Invalid search query'),
    limit: z.coerce.number().min(1).max(20).default(10),
  }),
  
  getStock: z.object({
    symbol: z.string().min(1).max(10).regex(/^[A-Z0-9\-\.]+$/, 'Invalid symbol format').transform(val => val.toUpperCase()),
  }),
  
  // Watchlist validation
  getWatchlistStocks: z.object({
    id: z.coerce.number().positive('Invalid watchlist ID'),
  }),
  
  addStockToWatchlist: z.object({
    id: z.coerce.number().positive('Invalid watchlist ID'),
  }),
  
  removeStockFromWatchlist: z.object({
    id: z.coerce.number().positive('Invalid watchlist ID'),
    symbol: z.string().min(1).max(10).regex(/^[A-Z0-9\-\.]+$/, 'Invalid symbol').transform(val => val.toUpperCase()),
  }),
  
  // Intrinsic value validation
  getIntrinsicValues: z.object({
    limit: z.coerce.number().min(1).max(100).default(50),
  }),
  
  getIntrinsicValue: z.object({
    symbol: z.string().min(1).max(10).regex(/^[A-Z0-9\-\.]+$/, 'Invalid symbol').transform(val => val.toUpperCase()),
  }),
  
  calculateIntrinsicValue: z.object({
    stockSymbol: z.string().min(1).max(10).regex(/^[A-Z0-9\-\.]+$/, 'Invalid symbol'),
    eps: z.number().positive('EPS must be positive'),
    growthRate: z.number().min(0).max(50).default(10),
    horizon: z.number().min(1).max(20).default(10),
    peMultiple: z.number().positive().optional(),
    requiredReturn: z.number().min(1).max(50).default(15),
    marginOfSafety: z.number().min(0).max(50).default(25),
  }),
  
  // Recent searches validation
  getRecentSearches: z.object({
    limit: z.coerce.number().min(1).max(20).default(5),
  }),
  
  // Earnings validation
  getEarnings: z.object({
    limit: z.coerce.number().min(1).max(100).default(50),
  }),
  
  getEarningsForStock: z.object({
    symbol: z.string().min(1).max(10).regex(/^[A-Z0-9\-\.]+$/, 'Invalid symbol').transform(val => val.toUpperCase()),
  }),
};

export async function registerRoutes(app: Express, server: Server): Promise<void> {
  // SECURITY FIX: Initialize auth middleware
  const authService = authMiddleware.instance;

  // Enhanced health monitoring endpoints (no auth required)
  app.use("/api/health", healthRouter);

  // Basic API info endpoint
  app.get("/api", (req, res) => {
    res.json({
      name: "Alfalyzer API",
      version: "1.0.0",
      endpoints: [
        "/api/health",
        "/api/health/detailed",
        "/api/health/quick",
        "/api/health/ready",
        "/api/health/live",
        "/api/health/metrics",
        "/api/auth",
        "/api/stocks",
        "/api/market-data",
        "/api/subscriptions",
        "/api/admin"
      ]
    });
  });

  // SECURITY FIX: Register all route modules with proper authentication
  app.use("/api/auth", authRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/subscriptions", subscriptionsRouter);
  app.use("/api/valuation", enhancedValuationRouter);
  
  // SECURITY FIX: Register versioned routes first
  app.use(`/api/${API_VERSION}/market-data`, marketDataRouter);
  app.use(`/api/${API_VERSION}/valuation`, enhancedValuationRouter);
  
  // Maintain backward compatibility
  app.use("/api/market-data", marketDataRouter);
  
  // Stock data routes
  app.use("/api", stocksRouter);
  
  // Stock routes - public data, allow optional auth for rate limiting
  app.get("/api/stocks", 
    authService.optionalAuth(), 
    validateRequest(routeValidationSchemas.getStocks),
    async (req, res) => {
    try {
      const validatedQuery = routeValidationSchemas.getStocks.parse(req.query);
      const { limit, offset } = validatedQuery;
      const stocks = await storage.getStocks(limit, offset);
      res.json(stocks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stocks" });
    }
  });

  app.get("/api/stocks/search", 
    authService.optionalAuth(), 
    validateRequest(routeValidationSchemas.searchStocks),
    async (req, res) => {
    try {
      const validatedQuery = routeValidationSchemas.searchStocks.parse(req.query);
      const { q: query, limit } = validatedQuery;
      
      if (!query || query.trim().length === 0) {
        return res.json([]);
      }
      
      const stocks = await storage.searchStocks(query, limit);
      res.json(stocks);
    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({ message: "Failed to search stocks" });
    }
  });

  app.get("/api/stocks/:symbol", 
    authService.optionalAuth(), 
    validateRequest(routeValidationSchemas.getStock),
    async (req, res) => {
    try {
      const validatedParams = routeValidationSchemas.getStock.parse(req.params);
      const { symbol } = validatedParams;
      const stock = await storage.getStock(symbol);
      
      if (!stock) {
        return res.status(404).json({ message: "Stock not found" });
      }
      
      res.json(stock);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stock" });
    }
  });

  app.post("/api/stocks", authService.authenticate(), async (req, res) => {
    try {
      const stockData = insertStockSchema.parse(req.body);
      const stock = await storage.createStock(stockData);
      res.status(201).json(stock);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid stock data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create stock" });
    }
  });

  // Watchlist routes - SECURITY FIX: Require authentication for user-specific data
  app.get("/api/watchlists", authService.authenticate(), async (req, res) => {
    try {
      const userId = req.user?.id || "default";
      const watchlists = await storage.getWatchlists(userId);
      res.json(watchlists);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch watchlists" });
    }
  });

  app.post("/api/watchlists", authService.authenticate(), async (req, res) => {
    try {
      const watchlistData = insertWatchlistSchema.parse({
        ...req.body,
        userId: req.user?.id || "default"
      });
      const watchlist = await storage.createWatchlist(watchlistData);
      res.status(201).json(watchlist);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid watchlist data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create watchlist" });
    }
  });

  app.get("/api/watchlists/:id/stocks", authService.authenticate(), async (req, res) => {
    try {
      const watchlistId = parseInt(req.params.id);
      const watchlistStocks = await storage.getWatchlistStocks(watchlistId);
      res.json(watchlistStocks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch watchlist stocks" });
    }
  });

  app.post("/api/watchlists/:id/stocks", authService.authenticate(), async (req, res) => {
    try {
      const watchlistId = parseInt(req.params.id);
      const stockData = insertWatchlistStockSchema.parse({
        ...req.body,
        watchlistId
      });
      const watchlistStock = await storage.addStockToWatchlist(stockData);
      res.status(201).json(watchlistStock);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to add stock to watchlist" });
    }
  });

  app.delete("/api/watchlists/:id/stocks/:symbol", authService.authenticate(), async (req, res) => {
    try {
      const watchlistId = parseInt(req.params.id);
      const symbol = req.params.symbol.toUpperCase();
      const success = await storage.removeStockFromWatchlist(watchlistId, symbol);
      
      if (!success) {
        return res.status(404).json({ message: "Stock not found in watchlist" });
      }
      
      res.json({ message: "Stock removed from watchlist" });
    } catch (error) {
      res.status(500).json({ message: "Failed to remove stock from watchlist" });
    }
  });

  // Intrinsic value routes - SECURITY FIX: Require authentication for calculations
  app.get("/api/intrinsic-values", authService.authenticate(), async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const intrinsicValues = await storage.getIntrinsicValues(limit);
      res.json(intrinsicValues);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch intrinsic values" });
    }
  });

  app.get("/api/intrinsic-values/:symbol", authService.authenticate(), async (req, res) => {
    try {
      const symbol = req.params.symbol.toUpperCase();
      const intrinsicValue = await storage.getIntrinsicValue(symbol);
      
      if (!intrinsicValue) {
        return res.status(404).json({ message: "Intrinsic value not found" });
      }
      
      res.json(intrinsicValue);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch intrinsic value" });
    }
  });

  app.post("/api/intrinsic-values", authService.authenticate(), async (req, res) => {
    try {
      const intrinsicValueData = insertIntrinsicValueSchema.parse(req.body);
      const intrinsicValue = await storage.createIntrinsicValue(intrinsicValueData);
      res.status(201).json(intrinsicValue);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid intrinsic value data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create intrinsic value" });
    }
  });

  // Adam Khoo intrinsic value calculation
  app.post("/api/intrinsic-values/calculate", 
    authService.authenticate(), 
    validateRequest(routeValidationSchemas.calculateIntrinsicValue),
    async (req, res) => {
    try {
      const validatedData = routeValidationSchemas.calculateIntrinsicValue.parse(req.body);
      const { stockSymbol, eps, growthRate, horizon, peMultiple, requiredReturn, marginOfSafety } = validatedData;

      const stock = await storage.getStock(stockSymbol.toUpperCase());
      if (!stock) {
        return res.status(404).json({ message: "Stock not found" });
      }

      // Adam Khoo method calculation
      const epsValue = parseFloat(eps);
      const growthRateValue = Math.min(parseFloat(growthRate), 20) / 100; // Cap at 20%
      const horizonValue = parseInt(horizon);
      const currentPE = stock.peRatio ? parseFloat(stock.peRatio) : 15;
      const peValue = peMultiple ? parseFloat(peMultiple) : Math.min(currentPE, 2 * parseFloat(growthRate), 35);
      const requiredReturnValue = parseFloat(requiredReturn) / 100;
      const marginOfSafetyValue = parseFloat(marginOfSafety) / 100;

      // Future EPS = EPS * (1 + growth rate)^years
      const futureEPS = epsValue * Math.pow(1 + growthRateValue, horizonValue);
      
      // Future Price = Future EPS * PE
      const futurePrice = futureEPS * peValue;
      
      // Present Value = Future Price / (1 + required return)^years
      const presentValue = futurePrice / Math.pow(1 + requiredReturnValue, horizonValue);
      
      // Intrinsic Value = Present Value * (1 - margin of safety)
      const intrinsicValue = presentValue * (1 - marginOfSafetyValue);
      
      // Delta % = (Intrinsic Value / Current Price - 1) * 100
      const currentPrice = parseFloat(stock.price);
      const deltaPercent = (intrinsicValue / currentPrice - 1) * 100;
      
      // Classification
      let valuation: string;
      if (deltaPercent <= -3) {
        valuation = "undervalued";
      } else if (deltaPercent >= 3) {
        valuation = "overvalued";
      } else {
        valuation = "neutral";
      }

      const calculationResult = {
        stockSymbol: stockSymbol.toUpperCase(),
        intrinsicValue: intrinsicValue.toFixed(2),
        currentPrice: currentPrice.toFixed(2),
        valuation,
        deltaPercent: deltaPercent.toFixed(2),
        eps: epsValue.toFixed(2),
        growthRate: (growthRateValue * 100).toFixed(2),
        peMultiple: peValue.toFixed(2),
        requiredReturn: (requiredReturnValue * 100).toFixed(2),
        marginOfSafety: (marginOfSafetyValue * 100).toFixed(2),
        futureEPS: futureEPS.toFixed(2),
        futurePrice: futurePrice.toFixed(2),
        presentValue: presentValue.toFixed(2)
      };

      // Store the calculation
      await storage.createIntrinsicValue(calculationResult);

      res.json(calculationResult);
    } catch (error) {
      res.status(500).json({ message: "Failed to calculate intrinsic value" });
    }
  });

  // Recent searches routes - SECURITY FIX: Require authentication for user-specific data
  app.get("/api/recent-searches", authService.authenticate(), async (req, res) => {
    try {
      const userId = req.user?.id || "default";
      const limit = parseInt(req.query.limit as string) || 5;
      const searches = await storage.getRecentSearches(userId, limit);
      res.json(searches);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recent searches" });
    }
  });

  app.post("/api/recent-searches", authService.authenticate(), async (req, res) => {
    try {
      const searchData = insertRecentSearchSchema.parse({
        ...req.body,
        userId: req.user?.id || "default"
      });
      const search = await storage.addRecentSearch(searchData);
      res.status(201).json(search);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid search data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to add recent search" });
    }
  });

  // Earnings routes - SECURITY FIX: Public data but add optional auth for rate limiting
  app.get("/api/earnings", authService.optionalAuth(), async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const earnings = await storage.getEarnings(limit);
      res.json(earnings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch earnings" });
    }
  });

  app.get("/api/earnings/:symbol", authService.optionalAuth(), async (req, res) => {
    try {
      const symbol = req.params.symbol.toUpperCase();
      const earnings = await storage.getEarningsForStock(symbol);
      res.json(earnings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch earnings for stock" });
    }
  });

  // Market indices endpoint (simulated) - SECURITY FIX: Public data but add optional auth for rate limiting
  app.get("/api/market-indices", authService.optionalAuth(), async (req, res) => {
    try {
      // Simulate real-time market data
      const indices = {
        dow: {
          value: 34567.89 + (Math.random() - 0.5) * 100,
          change: 0.52 + (Math.random() - 0.5) * 0.5,
        },
        sp500: {
          value: 4234.56 + (Math.random() - 0.5) * 50,
          change: 0.31 + (Math.random() - 0.5) * 0.3,
        },
        nasdaq: {
          value: 13789.12 + (Math.random() - 0.5) * 200,
          change: -0.18 + (Math.random() - 0.5) * 0.4,
        },
      };
      
      res.json(indices);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch market indices" });
    }
  });

  // Server is now created in index.ts
}
