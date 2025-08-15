import { pgTable, text, serial, integer, decimal, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
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
});
export const insertWatchlistSchema = createInsertSchema(watchlists).omit({
    id: true,
    createdAt: true
});
export const insertWatchlistStockSchema = createInsertSchema(watchlistStocks).omit({
    id: true,
    addedAt: true
});
export const insertIntrinsicValueSchema = createInsertSchema(intrinsicValues).omit({
    id: true,
    calculatedAt: true
});
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
