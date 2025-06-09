import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertStockSchema, insertWatchlistSchema, insertWatchlistStockSchema, insertIntrinsicValueSchema, insertRecentSearchSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Stock routes
  app.get("/api/stocks", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const stocks = await storage.getStocks(limit, offset);
      res.json(stocks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stocks" });
    }
  });

  app.get("/api/stocks/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query || query.trim().length === 0) {
        return res.json([]);
      }
      
      const limit = parseInt(req.query.limit as string) || 10;
      const stocks = await storage.searchStocks(query, limit);
      res.json(stocks);
    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({ message: "Failed to search stocks" });
    }
  });

  app.get("/api/stocks/:symbol", async (req, res) => {
    try {
      const { symbol } = req.params;
      const stock = await storage.getStock(symbol.toUpperCase());
      
      if (!stock) {
        return res.status(404).json({ message: "Stock not found" });
      }
      
      res.json(stock);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stock" });
    }
  });

  app.post("/api/stocks", async (req, res) => {
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

  // Watchlist routes
  app.get("/api/watchlists", async (req, res) => {
    try {
      const userId = req.query.userId as string || "default";
      const watchlists = await storage.getWatchlists(userId);
      res.json(watchlists);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch watchlists" });
    }
  });

  app.post("/api/watchlists", async (req, res) => {
    try {
      const watchlistData = insertWatchlistSchema.parse({
        ...req.body,
        userId: req.body.userId || "default"
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

  app.get("/api/watchlists/:id/stocks", async (req, res) => {
    try {
      const watchlistId = parseInt(req.params.id);
      const watchlistStocks = await storage.getWatchlistStocks(watchlistId);
      res.json(watchlistStocks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch watchlist stocks" });
    }
  });

  app.post("/api/watchlists/:id/stocks", async (req, res) => {
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

  app.delete("/api/watchlists/:id/stocks/:symbol", async (req, res) => {
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

  // Intrinsic value routes
  app.get("/api/intrinsic-values", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const intrinsicValues = await storage.getIntrinsicValues(limit);
      res.json(intrinsicValues);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch intrinsic values" });
    }
  });

  app.get("/api/intrinsic-values/:symbol", async (req, res) => {
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

  app.post("/api/intrinsic-values", async (req, res) => {
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
  app.post("/api/intrinsic-values/calculate", async (req, res) => {
    try {
      const { stockSymbol, eps, growthRate = 10, horizon = 10, peMultiple, requiredReturn = 15, marginOfSafety = 25 } = req.body;
      
      if (!stockSymbol || !eps) {
        return res.status(400).json({ message: "Stock symbol and EPS are required" });
      }

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

  // Recent searches routes
  app.get("/api/recent-searches", async (req, res) => {
    try {
      const userId = req.query.userId as string || "default";
      const limit = parseInt(req.query.limit as string) || 5;
      const searches = await storage.getRecentSearches(userId, limit);
      res.json(searches);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recent searches" });
    }
  });

  app.post("/api/recent-searches", async (req, res) => {
    try {
      const searchData = insertRecentSearchSchema.parse({
        ...req.body,
        userId: req.body.userId || "default"
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

  // Earnings routes
  app.get("/api/earnings", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const earnings = await storage.getEarnings(limit);
      res.json(earnings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch earnings" });
    }
  });

  app.get("/api/earnings/:symbol", async (req, res) => {
    try {
      const symbol = req.params.symbol.toUpperCase();
      const earnings = await storage.getEarningsForStock(symbol);
      res.json(earnings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch earnings for stock" });
    }
  });

  // Market indices endpoint (simulated)
  app.get("/api/market-indices", async (req, res) => {
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

  const httpServer = createServer(app);
  return httpServer;
}
