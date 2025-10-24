import type { Express } from "express";
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
import transcriptsRouter from "./routes/transcripts";
import apiProxyRouter from "./routes/api-proxy";
import { imageProxyRouter } from "./routes/image-proxy";
import cronRouter from "./routes/cron";
import cronManagerRouter from "./routes/cron-manager";
import aiAnalysisRouter from "./routes/ai-analysis";
import portfoliosRouter from "./routes/portfolios";
import earningsCalendarRouter from "./routes/earnings-calendar";
import diagnosticRouter from "./routes/diagnostic";
import diagnosticsRouter from "./routes/diagnostics"; // ONDA 4.1: ETF detection diagnostics
import cachedDataRouter from "./routes/cached-data";
import logsRouter from "./routes/logs";
import usageMetricsRouter from "./routes/usage-metrics";
// REMOVED: Cache imports due to startup issues
// import cacheAdminRouter from "./routes/cache-admin";
import { alertsRouter } from "./routes/alerts";
import cacheRoutes from "./routes/cache-routes";
import notificationsRouter from "./routes/notifications";
// BROKEN IMPORTS - Modules don't exist yet
// import pushNotificationsRouter from "./routes/push-notifications"; // TODO: Create this file
// import circuitBreakerRouter from "./routes/circuit-breaker"; // TODO: Create this file
import { authMiddleware } from "./middleware/auth-middleware";
import { authMiddleware as cookieAuth, optionalAuth, autoRefreshMiddleware } from "./middleware/auth-cookie";
import { validateRequest, validationSchemas } from "./security/security-middleware";
import { 
  apiSecurityMiddleware, 
  adminSecurityMiddleware 
} from "./middleware/api-security";

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

export async function registerRoutes(app: Express): Promise<void> {
  // SECURITY FIX: Initialize auth middleware
  const authService = authMiddleware.instance;

  // Enhanced health monitoring endpoints (no auth required)
  app.use("/api/health", healthRouter);
  
  // Diagnostic endpoint for debugging production issues (no auth required)
  app.use("/api/diagnostic", diagnosticRouter);

  // ONDA 4.1: ETF detection and stock classification diagnostics
  app.use("/api/diagnostics", diagnosticsRouter);

  // Logs management routes (protected by admin auth in production)
  app.use("/api/logs", process.env.NODE_ENV === 'production' ? adminSecurityMiddleware : (req: any, res: any, next: any) => next(), logsRouter);
  
  // Local usage metrics for monitoring scripts (local-only guard inside router)
  app.use('/api/monitoring/usage', usageMetricsRouter);
  app.use('/monitoring/usage', usageMetricsRouter);

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
        "/api/health/kv",
        "/api/health/ttfb",
        "/api/diagnostic",
        "/api/auth",
        "/api/stocks",
        "/api/market-data",
        "/api/subscriptions",
        "/api/admin",
        "/api/transcripts",
        "/api/portfolios",
        "/api/proxy",
        "/api/ai",
        "/api/alerts",
        "/api/push",
        "/api/circuit-breaker"
      ]
    });
  });

  // SECURITY FIX: Register all route modules with proper authentication
  app.use("/api/auth", authRouter);
  // Back-compat alias: some clients call /api/user/* (without /auth prefix)
  // Mount auth routes also at /api to serve /api/user/profile and /api/user/stats
  app.use("/api", authRouter);
  app.use("/api/admin", adminSecurityMiddleware, adminRouter);
  app.use("/api/cron", cronRouter);
  app.use("/api/cron-manager", cronManagerRouter);
  // REMOVED: Cache admin router due to startup issues
  // app.use("/api/admin/cache", cacheAdminRouter);
  app.use("/api/subscriptions", subscriptionsRouter);
  app.use("/api/valuation", enhancedValuationRouter);
  
  // ROADMAP V4: Public transcripts routes
  app.use("/api/transcripts", transcriptsRouter);
  
  // PHASE 3: Portfolio Management CRUD routes
  app.use("/api/portfolios", portfoliosRouter);
  
  // PHASE 3: AI Analysis routes for OpenAI-powered transcript analysis
  app.use("/api/ai", aiAnalysisRouter);
  
  // FASE 3.7: Earnings Calendar with real API data (Alpha Vantage/FMP)
  app.use("/api/earnings", earningsCalendarRouter);
  
  // WAVE 4: API proxy routes for secure external API access
  app.use("/api/proxy", apiProxyRouter);
  
  // Image optimization proxy routes
  app.use("/api/image", imageProxyRouter);
  
  // GDPR compliance routes
  const gdprRouter = await import("./routes/gdpr").then(m => m.default);
  app.use("/api/gdpr", gdprRouter);
  
  // Cached data routes (eliminates CORS/Auth issues)
  app.use("/api/cached", cachedDataRouter);
  
  // Cache-first routes with auto-fill on miss
  app.use("/api/cache", cacheRoutes);
  
  // Alert system routes
  app.use("/api/alerts", alertsRouter);
  
  // Email notifications and preferences
  app.use(notificationsRouter);
  
  // BROKEN - Push notifications routes (module doesn't exist)
  // app.use("/api/push", pushNotificationsRouter);
  
  // BROKEN - Circuit breaker management routes (module doesn't exist)
  // app.use("/api/circuit-breaker", circuitBreakerRouter);
  
  // SECURITY FIX: Register versioned routes first
  app.use(`/api/${API_VERSION}/market-data`, marketDataRouter);
  app.use(`/api/${API_VERSION}/valuation`, enhancedValuationRouter);
  
  // Special redirect for AAPL steel thread endpoint (compatibility with frontend)
  app.get(`/api/${API_VERSION}/stock/AAPL/quote`, (req, res) => {
    // Redirect to standard market-data endpoint
    res.redirect('/api/market-data/quote/AAPL');
  });
  
  // Maintain backward compatibility
  // TEMPORARILY: Remove apiSecurityMiddleware for development
  app.use("/api/market-data", marketDataRouter);

  // FASE 2 - BACKEND: Alias /api/iv/* → /api/market-data/iv/*
  // Allows frontend to call shorter routes while reusing market-data router
  app.use("/api/iv", marketDataRouter);
  
  // Stock data routes (keep after auth alias so /api/user/* resolves first)
  app.use("/api", stocksRouter);

  // Backward-compat alias: some bundles still call /api/api/intrinsic-values/:symbol
  app.get("/api/api/intrinsic-values/:symbol", async (req, res) => {
    try {
      const symbol = String(req.params.symbol || '').toUpperCase().trim();
      if (!symbol) return res.status(400).json({ error: 'INVALID_SYMBOL', message: 'Symbol required' });
      const { redisCacheService } = await import('./cache/redis-cache-service');
      const data = await redisCacheService.get(`iv:${symbol}`);
      if (data) return res.json({ success: true, data, cached: true });
      const { storage } = await import('./storage');
      const dbVal = await storage.getIntrinsicValue(symbol).catch(() => undefined);
      if (dbVal) return res.json({ success: true, data: dbVal, cached: false, source: 'db' });
      return res.json({ success: true, data: null, cached: false });
    } catch (error) {
      res.status(500).json({ error: 'CACHE_ERROR', message: 'Failed to fetch intrinsic value' });
    }
  });

  // Stub notifications to avoid 404 noise on public pages
  app.get("/api/alerts/notifications", (req, res) => {
    res.json([]);
  });

  // Read-only Intrinsic Value from cache/DB (no calculation)
  app.get("/api/cache/intrinsic-values/:symbol", async (req, res) => {
    try {
      const symbol = String(req.params.symbol || '').toUpperCase().trim();
      if (!symbol) return res.status(400).json({ error: 'INVALID_SYMBOL', message: 'Symbol required' });
      const { redisCacheService } = await import('./cache/redis-cache-service');
      const data = await redisCacheService.get(`iv:${symbol}`);
      if (data) return res.json({ success: true, data, cached: true });
      const { storage } = await import('./storage');
      const dbVal = await storage.getIntrinsicValue(symbol).catch(() => undefined);
      if (dbVal) return res.json({ success: true, data: dbVal, cached: false, source: 'db' });
      return res.json({ success: true, data: null, cached: false });
    } catch (error) {
      console.error('IV cache fetch error:', error);
      res.status(500).json({ error: 'CACHE_ERROR', message: 'Failed to fetch intrinsic value' });
    }
  });

  // Friendly alias for official valuation endpoint
  app.get("/api/valuation/intrinsic/:symbol", async (req, res) => {
    try {
      const symbol = String(req.params.symbol || '').toUpperCase().trim();
      if (!symbol) return res.status(400).json({ error: 'INVALID_SYMBOL', message: 'Symbol required' });
      const { redisCacheService } = await import('./cache/redis-cache-service');
      const forceRefresh = String(req.query.refresh || '').toLowerCase() === '1' || String(req.query.refresh || '').toLowerCase() === 'true';
      const data = forceRefresh ? null : await redisCacheService.get(`iv:${symbol}`);
      if (data && !forceRefresh) return res.json({ success: true, data, cached: true });
      const { storage } = await import('./storage');
      const dbVal = forceRefresh ? undefined : await storage.getIntrinsicValue(symbol).catch(() => undefined);
      if (dbVal && !forceRefresh) return res.json({ success: true, data: dbVal, cached: false, source: 'db' });

      // On cache+DB miss: compute official intrinsic value from fundamentals and persist
      try {
        const upper = symbol;
        // Providers / helpers
        const { default: fetchFn } = await import('node-fetch');
        const { simpleCacheService } = await import('./services/simple-cache-service');
        const { EnhancedValuationService } = await import('./services/enhanced-valuation-service');
        const valuation = new EnhancedValuationService();

        // Get current price (cached)
        const quote = await simpleCacheService.getQuote(upper).catch(() => null);
        const currentPrice = Number(quote?.price ?? 0);

        // Fetch fundamentals from FMP directly (stable endpoints)
        const apiKey = process.env.FMP_API_KEY || '';
        const params = `?period=annual&limit=1&apikey=${apiKey}`;
        const [incomeRes, keyRes, profileRes, growthRes] = await Promise.all([
          fetchFn(`https://financialmodelingprep.com/api/v3/income-statement/${upper}${params}`),
          fetchFn(`https://financialmodelingprep.com/api/v3/key-metrics/${upper}${params}`),
          fetchFn(`https://financialmodelingprep.com/api/v3/profile/${upper}?apikey=${apiKey}`),
          fetchFn(`https://financialmodelingprep.com/api/v3/financial-growth/${upper}${params}`)
        ]);

        const [incomeArr, keyArr, profileArr, growthArr] = await Promise.all([
          incomeRes.json(), keyRes.json(), profileRes.json(), growthRes.json()
        ]);

        const income = Array.isArray(incomeArr) && incomeArr[0] ? incomeArr[0] : {};
        const key = Array.isArray(keyArr) && keyArr[0] ? keyArr[0] : {};
        const profile = Array.isArray(profileArr) && profileArr[0] ? profileArr[0] : {};
        const growth = Array.isArray(growthArr) && growthArr[0] ? growthArr[0] : {};

        // Derive inputs (defensive defaults + clamps)
        const epsRaw = Number(income?.eps ?? key?.eps ?? 0);
        const eps = isFinite(epsRaw) && epsRaw > 0 ? epsRaw : (currentPrice && key?.peRatio ? Number(currentPrice) / Number(key.peRatio) : 0);
        // growthRate in %: prefer EPS growth, fallback to revenue growth, else 8%
        const grCandidates = [
          Number(growth?.epsgrowth ?? growth?.epsGrowth ?? 0) * 100,
          Number(growth?.revenueGrowth ?? growth?.revenuegrowth ?? 0) * 100,
          8
        ];
        let growthRate = grCandidates.find(v => isFinite(v) && Math.abs(v) > 0) ?? 8;
        growthRate = Math.max(0, Math.min(20, growthRate));

        // Required return via CAPM aproximado: 4% RF + beta*5.5% ERP (clamp 7–14)
        const beta = Number(profile?.beta ?? key?.beta ?? 1);
        let requiredReturn = 4 + (isFinite(beta) ? beta : 1) * 5.5;
        requiredReturn = Math.max(7, Math.min(14, requiredReturn));

        // PE terminal conservador: usar min(peRatio, 20) com piso 10
        let peMultiple = Number(key?.peRatio ?? 15);
        if (!isFinite(peMultiple) || peMultiple <= 0) peMultiple = 15;
        peMultiple = Math.max(10, Math.min(25, peMultiple));

        // Outros parâmetros
        const marginOfSafety = 20; // %
        const horizon = 10; // anos
        const terminalGrowthRate = 2.5; // %

        // Se preço ainda 0, tenta de novo via provider
        const px = currentPrice > 0 ? currentPrice : Number(key?.price ?? profile?.price ?? 0);

        // Se ainda não há inputs mínimos, devolver null
        if (!eps || !isFinite(px) || px <= 0) {
          return res.json({ success: true, data: null, cached: false, reason: 'INSUFFICIENT_DATA' });
        }

        // Calcular via EnhancedValuationService (modelo EPS-based com terminal PE)
        const model = valuation.calculateDCF({
          eps,
          growthRate, // %
          terminalGrowthRate, // %
          horizon,
          requiredReturn, // %
          marginOfSafety, // %
          peMultiple
        } as any, px);

        // Preparar payload compatível com schema/DB
        const deltaPercent = ((Number(model.intrinsicValue) / px) - 1) * 100;
        const record = {
          stockSymbol: upper,
          intrinsicValue: Number(model.intrinsicValue).toFixed(2),
          currentPrice: Number(px).toFixed(2),
          valuation: deltaPercent <= -3 ? 'undervalued' : (deltaPercent >= 3 ? 'overvalued' : 'fair'),
          deltaPercent: deltaPercent.toFixed(2),
          eps: Number(eps).toFixed(2),
          growthRate: Number(growthRate).toFixed(2),
          peMultiple: Number(peMultiple).toFixed(2),
          requiredReturn: Number(requiredReturn).toFixed(2),
          marginOfSafety: Number(marginOfSafety).toFixed(2)
        } as any;

        // Persistir (DB + Redis 24h)
        try {
          await storage.createIntrinsicValue(record);
        } catch (e) {
          // Se já existir, tenta update
          try { await storage.updateIntrinsicValue(upper, record); } catch {}
        }
        await redisCacheService.set(`iv:${upper}`, record, 24 * 60 * 60);

        return res.json({ success: true, data: record, cached: false, source: 'computed' });
      } catch (computeError) {
        console.error('IV compute error:', computeError);
        return res.json({ success: true, data: null, cached: false, error: 'COMPUTE_FAILED' });
      }
    } catch (error) {
      console.error('IV valuation fetch error:', error);
      res.status(500).json({ error: 'CACHE_ERROR', message: 'Failed to fetch intrinsic value' });
    }
  });

  // Alias: /api/cache/iv/:symbol
  app.get("/api/cache/iv/:symbol", async (req, res) => {
    try {
      const symbol = String(req.params.symbol || '').toUpperCase().trim();
      if (!symbol) return res.status(400).json({ error: 'INVALID_SYMBOL', message: 'Symbol required' });
      const { redisCacheService } = await import('./cache/redis-cache-service');
      const data = await redisCacheService.get(`iv:${symbol}`);
      if (data) return res.json({ success: true, data, cached: true });
      const { storage } = await import('./storage');
      const dbVal = await storage.getIntrinsicValue(symbol).catch(() => undefined);
      if (dbVal) return res.json({ success: true, data: dbVal, cached: false, source: 'db' });
      return res.json({ success: true, data: null, cached: false });
    } catch (error) {
      console.error('IV cache alias fetch error:', error);
      res.status(500).json({ error: 'CACHE_ERROR', message: 'Failed to fetch intrinsic value' });
    }
  });
  
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
      // Canonicalize symbols in search results (e.g., BRK.B -> BRK-B)
      const canonicalized = stocks.map((s) => {
        const symbol = String(s.symbol || '').toUpperCase();
        const can = symbol.includes('.') ? symbol.replace(/\./g, '-') : symbol;
        return { ...s, symbol: can };
      });
      res.json(canonicalized);
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
      const upper = String(symbol).toUpperCase();
      let stock = await storage.getStock(upper);
      // Alias fallback: try dot variant if hyphen was provided
      if (!stock && upper.includes('-')) {
        stock = await storage.getStock(upper.replace(/-/g, '.'));
      }
      // If we found a dot-variant in DB, canonicalize symbol in response
      if (stock && /\./.test(stock.symbol)) {
        stock = { ...stock, symbol: stock.symbol.replace(/\./g, '-') } as any;
      }
      
      if (!stock) {
        return res.status(404).json({ message: "Stock not found" });
      }
      
      res.json(stock);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stock" });
    }
  });

  app.post("/api/stocks", authService.authenticate(), apiSecurityMiddleware, async (req, res) => {
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
    apiSecurityMiddleware,
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

      // Store the calculation (DB)
      await storage.createIntrinsicValue(calculationResult);
      
      // Cache the result in Redis for fast reads
      try {
        const { redisCacheService } = await import('./cache/redis-cache-service');
        await redisCacheService.set(`iv:${stockSymbol.toUpperCase()}`, calculationResult, 24 * 60 * 60);
      } catch (cacheError) {
        console.warn('⚠️ Failed to cache intrinsic value:', cacheError);
      }

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

  // DEPRECATED: Old earnings routes - moved to dedicated earnings-calendar router in FASE 3.7
  // Keeping commented for reference - now handled by /api/earnings routes above
  /*
  app.get("/api/earnings-old", authService.optionalAuth(), async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const earnings = await storage.getEarnings(limit);
      res.json(earnings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch earnings" });
    }
  });

  app.get("/api/earnings-old/:symbol", authService.optionalAuth(), async (req, res) => {
    try {
      const symbol = req.params.symbol.toUpperCase();
      const earnings = await storage.getEarningsForStock(symbol);
      res.json(earnings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch earnings for stock" });
    }
  });
  */

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

  // CORS Test Endpoint - for debugging CORS issues
  app.get("/api/cors-test", (req, res) => {
    const origin = req.headers.origin || 'NO-ORIGIN';
    const userAgent = req.headers['user-agent'] || 'NO-USER-AGENT';
    const referer = req.headers.referer || 'NO-REFERER';
    
    console.log(`🔍 CORS Test Request:`);
    console.log(`   Origin: ${origin}`);
    console.log(`   User-Agent: ${userAgent}`);
    console.log(`   Referer: ${referer}`);
    console.log(`   Headers:`, req.headers);
    
    res.json({
      success: true,
      message: "CORS test successful!",
      requestInfo: {
        origin,
        userAgent,
        referer,
        headers: req.headers,
        method: req.method,
        url: req.url,
        timestamp: new Date().toISOString()
      },
      corsInfo: {
        allowedOrigins: process.env.NODE_ENV === 'production' 
          ? ['*.vercel.app', '*.coolify.app', 'alfalyzer.com', 'alphaanalyzer.com']
          : ['localhost:*', '127.0.0.1:*'],
        credentialsAllowed: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH']
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        frontendOrigin: process.env.FRONTEND_ORIGIN || 'NOT-SET',
        appUrl: process.env.APP_URL || process.env.COOLIFY_APP_URL || 'NOT-SET',
        strictCors: process.env.STRICT_CORS || 'false'
      }
    });
  });

  // CORS Test with POST - for testing preflight requests
  app.post("/api/cors-test", (req, res) => {
    console.log(`🔍 CORS Test POST Request:`);
    console.log(`   Origin: ${req.headers.origin || 'NO-ORIGIN'}`);
    console.log(`   Content-Type: ${req.headers['content-type']}`);
    console.log(`   Body:`, req.body);
    
    res.json({
      success: true,
      message: "CORS POST test successful!",
      receivedData: req.body,
      timestamp: new Date().toISOString()
    });
  });

  // Server is now created in index.ts
}
