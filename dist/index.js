var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  earnings: () => earnings,
  insertEarningsSchema: () => insertEarningsSchema,
  insertIntrinsicValueSchema: () => insertIntrinsicValueSchema,
  insertRecentSearchSchema: () => insertRecentSearchSchema,
  insertStockSchema: () => insertStockSchema,
  insertWatchlistSchema: () => insertWatchlistSchema,
  insertWatchlistStockSchema: () => insertWatchlistStockSchema,
  intrinsicValues: () => intrinsicValues,
  recentSearches: () => recentSearches,
  stocks: () => stocks,
  watchlistStocks: () => watchlistStocks,
  watchlists: () => watchlists
});
import { pgTable, text, serial, integer, decimal, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var stocks = pgTable("stocks", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull().unique(),
  name: text("name").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  change: decimal("change", { precision: 10, scale: 2 }).notNull(),
  changePercent: decimal("change_percent", { precision: 5, scale: 2 }).notNull(),
  marketCap: text("market_cap").notNull(),
  sector: text("sector"),
  industry: text("industry"),
  eps: decimal("eps", { precision: 10, scale: 2 }),
  peRatio: decimal("pe_ratio", { precision: 10, scale: 2 }),
  logo: text("logo"),
  lastUpdated: timestamp("last_updated").defaultNow()
});
var watchlists = pgTable("watchlists", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  userId: text("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});
var watchlistStocks = pgTable("watchlist_stocks", {
  id: serial("id").primaryKey(),
  watchlistId: integer("watchlist_id").notNull(),
  stockSymbol: text("stock_symbol").notNull(),
  addedAt: timestamp("added_at").defaultNow()
});
var intrinsicValues = pgTable("intrinsic_values", {
  id: serial("id").primaryKey(),
  stockSymbol: text("stock_symbol").notNull(),
  intrinsicValue: decimal("intrinsic_value", { precision: 10, scale: 2 }).notNull(),
  currentPrice: decimal("current_price", { precision: 10, scale: 2 }).notNull(),
  valuation: text("valuation").notNull(),
  // 'undervalued', 'neutral', 'overvalued'
  deltaPercent: decimal("delta_percent", { precision: 5, scale: 2 }).notNull(),
  eps: decimal("eps", { precision: 10, scale: 2 }).notNull(),
  growthRate: decimal("growth_rate", { precision: 5, scale: 2 }).notNull(),
  peMultiple: decimal("pe_multiple", { precision: 5, scale: 2 }).notNull(),
  requiredReturn: decimal("required_return", { precision: 5, scale: 2 }).notNull(),
  marginOfSafety: decimal("margin_of_safety", { precision: 5, scale: 2 }).notNull(),
  calculatedAt: timestamp("calculated_at").defaultNow()
});
var earnings = pgTable("earnings", {
  id: serial("id").primaryKey(),
  stockSymbol: text("stock_symbol").notNull(),
  date: timestamp("date").notNull(),
  time: text("time").notNull(),
  // 'before_open', 'after_close'
  estimatedEPS: decimal("estimated_eps", { precision: 10, scale: 4 }),
  estimatedRevenue: decimal("estimated_revenue", { precision: 15, scale: 0 }),
  actualEPS: decimal("actual_eps", { precision: 10, scale: 4 }),
  actualRevenue: decimal("actual_revenue", { precision: 15, scale: 0 })
});
var recentSearches = pgTable("recent_searches", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  name: text("name").notNull(),
  userId: text("user_id").notNull(),
  searchedAt: timestamp("searched_at").defaultNow()
});
var insertStockSchema = createInsertSchema(stocks).omit({
  id: true,
  lastUpdated: true
});
var insertWatchlistSchema = createInsertSchema(watchlists).omit({
  id: true,
  createdAt: true
});
var insertWatchlistStockSchema = createInsertSchema(watchlistStocks).omit({
  id: true,
  addedAt: true
});
var insertIntrinsicValueSchema = createInsertSchema(intrinsicValues).omit({
  id: true,
  calculatedAt: true
});
var insertEarningsSchema = createInsertSchema(earnings).omit({
  id: true
});
var insertRecentSearchSchema = createInsertSchema(recentSearches).omit({
  id: true,
  searchedAt: true
});

// server/db.ts
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
var dbPath = "./dev.db";
var sqlite = new Database(dbPath);
var db = drizzle(sqlite, { schema: schema_exports });
try {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS stocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      price TEXT NOT NULL,
      change TEXT NOT NULL,
      change_percent TEXT NOT NULL,
      market_cap TEXT NOT NULL,
      sector TEXT,
      industry TEXT,
      eps TEXT,
      pe_ratio TEXT,
      logo TEXT,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS watchlists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS watchlist_stocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      watchlist_id INTEGER NOT NULL,
      stock_symbol TEXT NOT NULL,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS intrinsic_values (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stock_symbol TEXT NOT NULL,
      intrinsic_value TEXT NOT NULL,
      current_price TEXT NOT NULL,
      valuation TEXT NOT NULL,
      delta_percent TEXT NOT NULL,
      eps TEXT NOT NULL,
      growth_rate TEXT NOT NULL,
      pe_multiple TEXT NOT NULL,
      required_return TEXT NOT NULL,
      margin_of_safety TEXT NOT NULL,
      calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS earnings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stock_symbol TEXT NOT NULL,
      date DATETIME NOT NULL,
      time TEXT NOT NULL,
      estimated_eps TEXT,
      estimated_revenue TEXT,
      actual_eps TEXT,
      actual_revenue TEXT
    );

    CREATE TABLE IF NOT EXISTS recent_searches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL,
      name TEXT NOT NULL,
      user_id TEXT NOT NULL,
      searched_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log("\u2713 Database initialized with SQLite");
} catch (error) {
  console.error("Database initialization failed:", error);
  throw error;
}

// server/storage.ts
import { eq, desc, sql, or, ilike } from "drizzle-orm";
var DatabaseStorage = class {
  constructor() {
    this.initializeDatabase();
  }
  async initializeDatabase() {
    try {
      const existingStocks = await db.select().from(stocks).limit(1);
      if (existingStocks.length === 0) {
        await this.seedDefaultData();
      }
    } catch (error) {
      console.error("Database initialization error:", error);
    }
  }
  async seedDefaultData() {
    const defaultStocks = [
      { symbol: "AAPL", name: "Apple Inc.", price: "175.43", change: "2.34", changePercent: "1.35", marketCap: "$2.7T", sector: "Technology", eps: "6.13", peRatio: "28.6", logo: "https://logo.clearbit.com/apple.com" },
      { symbol: "MSFT", name: "Microsoft Corporation", price: "378.85", change: "-1.23", changePercent: "-0.32", marketCap: "$2.8T", sector: "Technology", eps: "9.65", peRatio: "39.2", logo: "https://logo.clearbit.com/microsoft.com" },
      { symbol: "GOOGL", name: "Alphabet Inc.", price: "141.28", change: "0.89", changePercent: "0.63", marketCap: "$1.8T", sector: "Technology", eps: "5.61", peRatio: "25.2", logo: "https://logo.clearbit.com/google.com" },
      { symbol: "AMZN", name: "Amazon.com Inc.", price: "142.56", change: "3.45", changePercent: "2.48", marketCap: "$1.5T", sector: "Consumer Discretionary", eps: "0.98", peRatio: "145.5", logo: "https://logo.clearbit.com/amazon.com" },
      { symbol: "TSLA", name: "Tesla Inc.", price: "248.79", change: "-5.67", changePercent: "-2.23", marketCap: "$792B", sector: "Automotive", eps: "4.73", peRatio: "52.6", logo: "https://logo.clearbit.com/tesla.com" },
      { symbol: "NVDA", name: "NVIDIA Corporation", price: "875.28", change: "12.34", changePercent: "1.43", marketCap: "$2.2T", sector: "Technology", eps: "12.96", peRatio: "67.5", logo: "https://logo.clearbit.com/nvidia.com" },
      { symbol: "META", name: "Meta Platforms Inc.", price: "494.32", change: "10.42", changePercent: "2.15", marketCap: "$1.3T", sector: "Technology", eps: "14.87", peRatio: "33.2", logo: "https://logo.clearbit.com/meta.com" },
      { symbol: "BRK.B", name: "Berkshire Hathaway Inc.", price: "432.18", change: "3.58", changePercent: "0.84", marketCap: "$954B", sector: "Financial Services", eps: "22.55", peRatio: "19.2", logo: "https://logo.clearbit.com/berkshirehathaway.com" }
    ];
    for (const stockData of defaultStocks) {
      await db.insert(stocks).values({
        ...stockData,
        lastUpdated: /* @__PURE__ */ new Date()
      }).onConflictDoNothing();
    }
    const intrinsicValuesData = [
      { stockSymbol: "AAPL", intrinsicValue: "185.50", currentPrice: "175.43", valuation: "undervalued", deltaPercent: "5.74", eps: "6.13", growthRate: "8.00", peMultiple: "25.0", requiredReturn: "15.00", marginOfSafety: "25.00", futureEPS: "13.24", futurePrice: "331.00", presentValue: "247.33" },
      { stockSymbol: "MSFT", intrinsicValue: "320.45", currentPrice: "378.85", valuation: "overvalued", deltaPercent: "-15.42", eps: "9.65", growthRate: "6.50", peMultiple: "28.0", requiredReturn: "15.00", marginOfSafety: "25.00", futureEPS: "18.27", futurePrice: "511.56", presentValue: "427.27" },
      { stockSymbol: "GOOGL", intrinsicValue: "155.80", currentPrice: "141.28", valuation: "undervalued", deltaPercent: "10.28", eps: "5.61", growthRate: "12.00", peMultiple: "22.0", requiredReturn: "15.00", marginOfSafety: "25.00", futureEPS: "17.37", futurePrice: "382.14", presentValue: "207.73" },
      { stockSymbol: "AMZN", intrinsicValue: "165.20", currentPrice: "142.56", valuation: "undervalued", deltaPercent: "15.89", eps: "0.98", growthRate: "18.00", peMultiple: "35.0", requiredReturn: "15.00", marginOfSafety: "25.00", futureEPS: "5.15", futurePrice: "180.25", presentValue: "220.27" },
      { stockSymbol: "TSLA", intrinsicValue: "195.30", currentPrice: "248.79", valuation: "overvalued", deltaPercent: "-21.51", eps: "4.73", growthRate: "15.00", peMultiple: "35.0", requiredReturn: "15.00", marginOfSafety: "25.00", futureEPS: "19.12", futurePrice: "669.20", presentValue: "260.40" },
      { stockSymbol: "NVDA", intrinsicValue: "650.80", currentPrice: "875.28", valuation: "overvalued", deltaPercent: "-25.65", eps: "12.96", growthRate: "20.00", peMultiple: "35.0", requiredReturn: "15.00", marginOfSafety: "25.00", futureEPS: "79.65", futurePrice: "2787.75", presentValue: "867.73" },
      { stockSymbol: "META", intrinsicValue: "420.15", currentPrice: "494.32", valuation: "overvalued", deltaPercent: "-15.00", eps: "14.87", growthRate: "10.00", peMultiple: "28.0", requiredReturn: "15.00", marginOfSafety: "25.00", futureEPS: "38.57", futurePrice: "1079.96", presentValue: "560.20" },
      { stockSymbol: "BRK.B", intrinsicValue: "445.20", currentPrice: "432.18", valuation: "neutral", deltaPercent: "3.01", eps: "22.55", growthRate: "5.00", peMultiple: "18.0", requiredReturn: "15.00", marginOfSafety: "25.00", futureEPS: "36.74", futurePrice: "661.32", presentValue: "594.27" }
    ];
    for (const data of intrinsicValuesData) {
      await db.insert(intrinsicValues).values({
        ...data,
        calculatedAt: /* @__PURE__ */ new Date()
      }).onConflictDoNothing();
    }
  }
  // Stocks
  async getStocks(limit = 50, offset = 0) {
    return await db.select().from(stocks).limit(limit).offset(offset);
  }
  async getStock(symbol) {
    const [stock] = await db.select().from(stocks).where(eq(stocks.symbol, symbol));
    return stock || void 0;
  }
  async createStock(stockData) {
    const [stock] = await db.insert(stocks).values({
      ...stockData,
      lastUpdated: /* @__PURE__ */ new Date()
    }).returning();
    return stock;
  }
  async updateStock(symbol, stockData) {
    const [stock] = await db.update(stocks).set({ ...stockData, lastUpdated: /* @__PURE__ */ new Date() }).where(eq(stocks.symbol, symbol)).returning();
    return stock || void 0;
  }
  async searchStocks(query, limit = 10) {
    if (!query.trim()) return [];
    const searchTerm = query.toLowerCase().trim();
    const results = await db.select().from(stocks).where(
      or(
        ilike(stocks.symbol, `%${searchTerm}%`),
        ilike(stocks.name, `%${searchTerm}%`)
      )
    );
    const sortedResults = results.sort((a, b) => {
      const aSymbol = a.symbol.toLowerCase();
      const aName = a.name.toLowerCase();
      const bSymbol = b.symbol.toLowerCase();
      const bName = b.name.toLowerCase();
      if (aSymbol === searchTerm && bSymbol !== searchTerm) return -1;
      if (bSymbol === searchTerm && aSymbol !== searchTerm) return 1;
      if (aSymbol.startsWith(searchTerm) && !bSymbol.startsWith(searchTerm)) return -1;
      if (bSymbol.startsWith(searchTerm) && !aSymbol.startsWith(searchTerm)) return 1;
      if (aName.startsWith(searchTerm) && !bName.startsWith(searchTerm)) return -1;
      if (bName.startsWith(searchTerm) && !aName.startsWith(searchTerm)) return 1;
      return aSymbol.localeCompare(bSymbol);
    });
    return sortedResults.slice(0, limit);
  }
  async getStocksBySector(sector) {
    return await db.select().from(stocks).where(eq(stocks.sector, sector));
  }
  // Watchlists
  async getWatchlists(userId) {
    return await db.select().from(watchlists).where(eq(watchlists.userId, userId));
  }
  async getWatchlist(id) {
    const [watchlist] = await db.select().from(watchlists).where(eq(watchlists.id, id));
    return watchlist || void 0;
  }
  async createWatchlist(watchlistData) {
    const [watchlist] = await db.insert(watchlists).values({
      ...watchlistData,
      createdAt: /* @__PURE__ */ new Date()
    }).returning();
    return watchlist;
  }
  async updateWatchlist(id, watchlistData) {
    const [watchlist] = await db.update(watchlists).set(watchlistData).where(eq(watchlists.id, id)).returning();
    return watchlist || void 0;
  }
  async deleteWatchlist(id) {
    const result = await db.delete(watchlists).where(eq(watchlists.id, id));
    return result.rowCount > 0;
  }
  // Watchlist Stocks
  async getWatchlistStocks(watchlistId) {
    return await db.select().from(watchlistStocks).where(eq(watchlistStocks.watchlistId, watchlistId));
  }
  async addStockToWatchlist(watchlistStockData) {
    const [watchlistStock] = await db.insert(watchlistStocks).values({
      ...watchlistStockData,
      addedAt: /* @__PURE__ */ new Date()
    }).returning();
    return watchlistStock;
  }
  async removeStockFromWatchlist(watchlistId, stockSymbol) {
    const result = await db.delete(watchlistStocks).where(
      sql`${watchlistStocks.watchlistId} = ${watchlistId} AND ${watchlistStocks.stockSymbol} = ${stockSymbol}`
    );
    return result.rowCount > 0;
  }
  // Intrinsic Values
  async getIntrinsicValues(limit = 50) {
    return await db.select().from(intrinsicValues).limit(limit).orderBy(desc(intrinsicValues.calculatedAt));
  }
  async getIntrinsicValue(stockSymbol) {
    const [intrinsicValue] = await db.select().from(intrinsicValues).where(eq(intrinsicValues.stockSymbol, stockSymbol));
    return intrinsicValue || void 0;
  }
  async createIntrinsicValue(intrinsicValueData) {
    const [intrinsicValue] = await db.insert(intrinsicValues).values({
      ...intrinsicValueData,
      calculatedAt: /* @__PURE__ */ new Date()
    }).returning();
    return intrinsicValue;
  }
  async updateIntrinsicValue(stockSymbol, intrinsicValueData) {
    const [intrinsicValue] = await db.update(intrinsicValues).set({ ...intrinsicValueData, calculatedAt: /* @__PURE__ */ new Date() }).where(eq(intrinsicValues.stockSymbol, stockSymbol)).returning();
    return intrinsicValue || void 0;
  }
  // Earnings
  async getEarnings(limit = 50) {
    return await db.select().from(earnings).limit(limit).orderBy(desc(earnings.date));
  }
  async getEarningsForStock(stockSymbol) {
    return await db.select().from(earnings).where(eq(earnings.stockSymbol, stockSymbol)).orderBy(desc(earnings.date));
  }
  async createEarning(earningData) {
    const [earning] = await db.insert(earnings).values({
      ...earningData,
      estimatedEPS: earningData.estimatedEPS || null,
      estimatedRevenue: earningData.estimatedRevenue || null,
      actualEPS: earningData.actualEPS || null,
      actualRevenue: earningData.actualRevenue || null
    }).returning();
    return earning;
  }
  // Recent Searches
  async getRecentSearches(userId, limit = 5) {
    return await db.select().from(recentSearches).where(eq(recentSearches.userId, userId)).orderBy(desc(recentSearches.searchedAt)).limit(limit);
  }
  async addRecentSearch(searchData) {
    const [search] = await db.insert(recentSearches).values({
      ...searchData,
      searchedAt: /* @__PURE__ */ new Date()
    }).returning();
    return search;
  }
};
var storage = new DatabaseStorage();

// server/routes.ts
import { z } from "zod";
async function registerRoutes(app2) {
  app2.get("/api/stocks", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;
      const stocks2 = await storage.getStocks(limit, offset);
      res.json(stocks2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stocks" });
    }
  });
  app2.get("/api/stocks/search", async (req, res) => {
    try {
      const query = req.query.q;
      if (!query || query.trim().length === 0) {
        return res.json([]);
      }
      const limit = parseInt(req.query.limit) || 10;
      const stocks2 = await storage.searchStocks(query, limit);
      res.json(stocks2);
    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({ message: "Failed to search stocks" });
    }
  });
  app2.get("/api/stocks/:symbol", async (req, res) => {
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
  app2.post("/api/stocks", async (req, res) => {
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
  app2.get("/api/watchlists", async (req, res) => {
    try {
      const userId = req.query.userId || "default";
      const watchlists2 = await storage.getWatchlists(userId);
      res.json(watchlists2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch watchlists" });
    }
  });
  app2.post("/api/watchlists", async (req, res) => {
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
  app2.get("/api/watchlists/:id/stocks", async (req, res) => {
    try {
      const watchlistId = parseInt(req.params.id);
      const watchlistStocks2 = await storage.getWatchlistStocks(watchlistId);
      res.json(watchlistStocks2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch watchlist stocks" });
    }
  });
  app2.post("/api/watchlists/:id/stocks", async (req, res) => {
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
  app2.delete("/api/watchlists/:id/stocks/:symbol", async (req, res) => {
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
  app2.get("/api/intrinsic-values", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const intrinsicValues2 = await storage.getIntrinsicValues(limit);
      res.json(intrinsicValues2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch intrinsic values" });
    }
  });
  app2.get("/api/intrinsic-values/:symbol", async (req, res) => {
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
  app2.post("/api/intrinsic-values", async (req, res) => {
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
  app2.post("/api/intrinsic-values/calculate", async (req, res) => {
    try {
      const { stockSymbol, eps, growthRate = 10, horizon = 10, peMultiple, requiredReturn = 15, marginOfSafety = 25 } = req.body;
      if (!stockSymbol || !eps) {
        return res.status(400).json({ message: "Stock symbol and EPS are required" });
      }
      const stock = await storage.getStock(stockSymbol.toUpperCase());
      if (!stock) {
        return res.status(404).json({ message: "Stock not found" });
      }
      const epsValue = parseFloat(eps);
      const growthRateValue = Math.min(parseFloat(growthRate), 20) / 100;
      const horizonValue = parseInt(horizon);
      const currentPE = stock.peRatio ? parseFloat(stock.peRatio) : 15;
      const peValue = peMultiple ? parseFloat(peMultiple) : Math.min(currentPE, 2 * parseFloat(growthRate), 35);
      const requiredReturnValue = parseFloat(requiredReturn) / 100;
      const marginOfSafetyValue = parseFloat(marginOfSafety) / 100;
      const futureEPS = epsValue * Math.pow(1 + growthRateValue, horizonValue);
      const futurePrice = futureEPS * peValue;
      const presentValue = futurePrice / Math.pow(1 + requiredReturnValue, horizonValue);
      const intrinsicValue = presentValue * (1 - marginOfSafetyValue);
      const currentPrice = parseFloat(stock.price);
      const deltaPercent = (intrinsicValue / currentPrice - 1) * 100;
      let valuation;
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
      await storage.createIntrinsicValue(calculationResult);
      res.json(calculationResult);
    } catch (error) {
      res.status(500).json({ message: "Failed to calculate intrinsic value" });
    }
  });
  app2.get("/api/recent-searches", async (req, res) => {
    try {
      const userId = req.query.userId || "default";
      const limit = parseInt(req.query.limit) || 5;
      const searches = await storage.getRecentSearches(userId, limit);
      res.json(searches);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recent searches" });
    }
  });
  app2.post("/api/recent-searches", async (req, res) => {
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
  app2.get("/api/earnings", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const earnings2 = await storage.getEarnings(limit);
      res.json(earnings2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch earnings" });
    }
  });
  app2.get("/api/earnings/:symbol", async (req, res) => {
    try {
      const symbol = req.params.symbol.toUpperCase();
      const earnings2 = await storage.getEarningsForStock(symbol);
      res.json(earnings2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch earnings for stock" });
    }
  });
  app2.get("/api/market-indices", async (req, res) => {
    try {
      const indices = {
        dow: {
          value: 34567.89 + (Math.random() - 0.5) * 100,
          change: 0.52 + (Math.random() - 0.5) * 0.5
        },
        sp500: {
          value: 4234.56 + (Math.random() - 0.5) * 50,
          change: 0.31 + (Math.random() - 0.5) * 0.3
        },
        nasdaq: {
          value: 13789.12 + (Math.random() - 0.5) * 200,
          change: -0.18 + (Math.random() - 0.5) * 0.4
        }
      };
      res.json(indices);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch market indices" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  try {
    const server = await registerRoutes(app);
    app.use((err, _req, res, _next) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error("App Error:", err);
      res.status(status).json({ message });
    });
    if (process.env.NODE_ENV === "development") {
      console.log("Setting up Vite development server...");
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }
    const port = Number(process.env.PORT) || 8080;
    server.on("error", (err) => {
      console.error("\u274C Server error:", err);
    });
    server.listen(port, "localhost", () => {
      console.log(`\u{1F680} Stock Analysis App is running!`);
      console.log(`\u{1F4F1} Local:    http://localhost:${port}`);
      console.log(`\u{1F310} Network:  http://127.0.0.1:${port}`);
      console.log(`\u{1F527} API:      http://localhost:${port}/api/stocks`);
      console.log("");
      console.log("Ready to accept connections...");
      console.log("\u{1F527} Try these URLs in your browser:");
      console.log(`   http://localhost:${port}`);
      console.log(`   http://127.0.0.1:${port}`);
    });
    process.on("SIGTERM", () => {
      console.log("SIGTERM received, shutting down gracefully");
      server.close(() => {
        console.log("Process terminated");
      });
    });
  } catch (error) {
    console.error("\u274C Failed to start server:", error);
    process.exit(1);
  }
})();
