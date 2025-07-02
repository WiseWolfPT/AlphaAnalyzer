import { pgTable, text, serial, integer, boolean, decimal, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const stocks = pgTable("stocks", {
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
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const watchlists = pgTable("watchlists", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  userId: text("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const watchlistStocks = pgTable("watchlist_stocks", {
  id: serial("id").primaryKey(),
  watchlistId: integer("watchlist_id").notNull(),
  stockSymbol: text("stock_symbol").notNull(),
  addedAt: timestamp("added_at").defaultNow(),
});

// Legacy intrinsic values table (maintained for backward compatibility)
export const intrinsicValues = pgTable("intrinsic_values", {
  id: serial("id").primaryKey(),
  stockSymbol: text("stock_symbol").notNull(),
  intrinsicValue: decimal("intrinsic_value", { precision: 10, scale: 2 }).notNull(),
  currentPrice: decimal("current_price", { precision: 10, scale: 2 }).notNull(),
  valuation: text("valuation").notNull(), // 'undervalued', 'neutral', 'overvalued'
  deltaPercent: decimal("delta_percent", { precision: 5, scale: 2 }).notNull(),
  eps: decimal("eps", { precision: 10, scale: 2 }).notNull(),
  growthRate: decimal("growth_rate", { precision: 5, scale: 2 }).notNull(),
  peMultiple: decimal("pe_multiple", { precision: 5, scale: 2 }).notNull(),
  requiredReturn: decimal("required_return", { precision: 5, scale: 2 }).notNull(),
  marginOfSafety: decimal("margin_of_safety", { precision: 5, scale: 2 }).notNull(),
  calculatedAt: timestamp("calculated_at").defaultNow(),
});

// Enhanced multi-model valuation table
export const valuationModels = pgTable("valuation_models", {
  id: serial("id").primaryKey(),
  stockSymbol: text("stock_symbol").notNull(),
  modelType: text("model_type").notNull(), // 'dcf', 'ddm', 'pe_multiple', 'peg', 'graham', 'asset_based', 'revenue_multiple', 'ebitda_multiple'
  intrinsicValue: decimal("intrinsic_value", { precision: 10, scale: 2 }).notNull(),
  currentPrice: decimal("current_price", { precision: 10, scale: 2 }).notNull(),
  valuation: text("valuation").notNull(), // 'undervalued', 'neutral', 'overvalued'
  deltaPercent: decimal("delta_percent", { precision: 5, scale: 2 }).notNull(),
  confidenceScore: decimal("confidence_score", { precision: 3, scale: 2 }), // 0.00 to 1.00
  // Model-specific parameters (stored as JSON for flexibility)
  parameters: text("parameters"), // JSON string of model parameters
  // Range analysis
  lowEstimate: decimal("low_estimate", { precision: 10, scale: 2 }),
  highEstimate: decimal("high_estimate", { precision: 10, scale: 2 }),
  // Metadata
  calculatedAt: timestamp("calculated_at").defaultNow(),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

// Valuation summary for quick access
export const valuationSummaries = pgTable("valuation_summaries", {
  id: serial("id").primaryKey(),
  stockSymbol: text("stock_symbol").notNull().unique(),
  // Consensus values
  consensusValue: decimal("consensus_value", { precision: 10, scale: 2 }),
  consensusValuation: text("consensus_valuation"), // 'undervalued', 'neutral', 'overvalued'
  consensusConfidence: decimal("consensus_confidence", { precision: 3, scale: 2 }),
  // Model count and spread
  modelCount: integer("model_count").default(0),
  valueSpread: decimal("value_spread", { precision: 5, scale: 2 }), // Standard deviation of values
  // Best and worst case scenarios
  bullishValue: decimal("bullish_value", { precision: 10, scale: 2 }),
  bearishValue: decimal("bearish_value", { precision: 10, scale: 2 }),
  // Current market data
  currentPrice: decimal("current_price", { precision: 10, scale: 2 }),
  marketCap: text("market_cap"),
  // Timestamps
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const earnings = pgTable("earnings", {
  id: serial("id").primaryKey(),
  stockSymbol: text("stock_symbol").notNull(),
  date: timestamp("date").notNull(),
  time: text("time").notNull(), // 'before_open', 'after_close'
  estimatedEPS: decimal("estimated_eps", { precision: 10, scale: 4 }),
  estimatedRevenue: decimal("estimated_revenue", { precision: 15, scale: 0 }),
  actualEPS: decimal("actual_eps", { precision: 10, scale: 4 }),
  actualRevenue: decimal("actual_revenue", { precision: 15, scale: 0 }),
});

export const recentSearches = pgTable("recent_searches", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  name: text("name").notNull(),
  userId: text("user_id").notNull(),
  searchedAt: timestamp("searched_at").defaultNow(),
});

// Insert schemas
export const insertStockSchema = createInsertSchema(stocks).omit({
  id: true,
  lastUpdated: true
} as const);

export const insertWatchlistSchema = createInsertSchema(watchlists).omit({
  id: true,
  createdAt: true
} as const);

export const insertWatchlistStockSchema = createInsertSchema(watchlistStocks).omit({
  id: true,
  addedAt: true
} as const);

export const insertIntrinsicValueSchema = createInsertSchema(intrinsicValues).omit({
  id: true,
  calculatedAt: true
} as const);

export const insertValuationModelSchema = createInsertSchema(valuationModels).omit({
  id: true,
  calculatedAt: true,
  lastUpdated: true,
});

export const insertValuationSummarySchema = createInsertSchema(valuationSummaries).omit({
  id: true,
  lastUpdated: true,
});

export const insertEarningsSchema = createInsertSchema(earnings).omit({
  id: true,
});

export const insertRecentSearchSchema = createInsertSchema(recentSearches).omit({
  id: true,
  searchedAt: true,
});

// Types
export type Stock = typeof stocks.$inferSelect & {
  currentPrice?: number; // Add currentPrice for compatibility
  volume?: number; // Add volume for enhanced stock cards
};
export type InsertStock = z.infer<typeof insertStockSchema>;
export type Watchlist = typeof watchlists.$inferSelect;
export type InsertWatchlist = z.infer<typeof insertWatchlistSchema>;
export type WatchlistStock = typeof watchlistStocks.$inferSelect;
export type InsertWatchlistStock = z.infer<typeof insertWatchlistStockSchema>;
export type IntrinsicValue = typeof intrinsicValues.$inferSelect;
export type InsertIntrinsicValue = z.infer<typeof insertIntrinsicValueSchema>;
export type ValuationModel = typeof valuationModels.$inferSelect;
export type InsertValuationModel = z.infer<typeof insertValuationModelSchema>;
export type ValuationSummary = typeof valuationSummaries.$inferSelect;
export type InsertValuationSummary = z.infer<typeof insertValuationSummarySchema>;
export type Earnings = typeof earnings.$inferSelect;
export type InsertEarnings = z.infer<typeof insertEarningsSchema>;
export type RecentSearch = typeof recentSearches.$inferSelect;
export type InsertRecentSearch = z.infer<typeof insertRecentSearchSchema>;

// Enhanced Transaction type with all required properties
export type Transaction = {
  id: number;
  stockSymbol: string;
  symbol: string; // Keep for backward compatibility
  type: 'buy' | 'sell' | 'dividend';
  quantity: number;
  price: number;
  date: Date;
  executedAt: Date;
  value: number;
  fees?: number;
  notes?: string;
};

export type PortfolioTransaction = Transaction;
export type InsertTransaction = Omit<Transaction, 'id'>;
export type InsertPortfolioTransaction = InsertTransaction;

// Enhanced Valuation System Types
export type ValuationModelType = 
  | 'dcf' 
  | 'ddm' 
  | 'pe_multiple' 
  | 'peg' 
  | 'graham' 
  | 'asset_based' 
  | 'revenue_multiple' 
  | 'ebitda_multiple';

export type ValuationClassification = 'undervalued' | 'neutral' | 'overvalued';

// DCF Model Parameters
export interface DCFParameters {
  eps: number;
  growthRate: number;
  terminalGrowthRate?: number;
  horizon: number;
  requiredReturn: number;
  marginOfSafety: number;
  peMultiple?: number;
}

// Dividend Discount Model Parameters
export interface DDMParameters {
  currentDividend: number;
  dividendGrowthRate: number;
  requiredReturn: number;
  marginOfSafety: number;
}

// P/E Multiple Parameters
export interface PEMultipleParameters {
  currentEPS: number;
  industryPE: number;
  peerPEs: number[];
  marginOfSafety: number;
}

// PEG Ratio Parameters
export interface PEGParameters {
  currentPE: number;
  growthRate: number;
  marginOfSafety: number;
}

// Benjamin Graham Formula Parameters
export interface GrahamParameters {
  eps: number;
  expectedGrowthRate: number;
  aaaCorpBondYield: number;
  marginOfSafety: number;
}

// Asset-Based Valuation Parameters
export interface AssetBasedParameters {
  bookValue: number;
  tangibleBookValue: number;
  adjustments: number;
  marginOfSafety: number;
}

// Revenue Multiple Parameters
export interface RevenueMultipleParameters {
  revenue: number;
  industryRevenueMultiple: number;
  peerMultiples: number[];
  marginOfSafety: number;
}

// EBITDA Multiple Parameters
export interface EBITDAMultipleParameters {
  ebitda: number;
  industryEVEBITDA: number;
  peerMultiples: number[];
  netDebt: number;
  marginOfSafety: number;
}

// Union type for all parameters
export type ValuationParameters = 
  | DCFParameters 
  | DDMParameters 
  | PEMultipleParameters 
  | PEGParameters 
  | GrahamParameters 
  | AssetBasedParameters 
  | RevenueMultipleParameters 
  | EBITDAMultipleParameters;

// Enhanced valuation result with all models
export interface EnhancedValuationResult {
  symbol: string;
  currentPrice: number;
  models: ValuationModel[];
  summary: ValuationSummary;
  consensus: {
    value: number;
    classification: ValuationClassification;
    confidence: number;
    spread: number;
  };
  ranges: {
    bullish: number;
    bearish: number;
    mostLikely: number;
  };
}
