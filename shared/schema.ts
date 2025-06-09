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
  lastUpdated: true,
});

export const insertWatchlistSchema = createInsertSchema(watchlists).omit({
  id: true,
  createdAt: true,
});

export const insertWatchlistStockSchema = createInsertSchema(watchlistStocks).omit({
  id: true,
  addedAt: true,
});

export const insertIntrinsicValueSchema = createInsertSchema(intrinsicValues).omit({
  id: true,
  calculatedAt: true,
});

export const insertEarningsSchema = createInsertSchema(earnings).omit({
  id: true,
});

export const insertRecentSearchSchema = createInsertSchema(recentSearches).omit({
  id: true,
  searchedAt: true,
});

// Types
export type Stock = typeof stocks.$inferSelect;
export type InsertStock = z.infer<typeof insertStockSchema>;
export type Watchlist = typeof watchlists.$inferSelect;
export type InsertWatchlist = z.infer<typeof insertWatchlistSchema>;
export type WatchlistStock = typeof watchlistStocks.$inferSelect;
export type InsertWatchlistStock = z.infer<typeof insertWatchlistStockSchema>;
export type IntrinsicValue = typeof intrinsicValues.$inferSelect;
export type InsertIntrinsicValue = z.infer<typeof insertIntrinsicValueSchema>;
export type Earnings = typeof earnings.$inferSelect;
export type InsertEarnings = z.infer<typeof insertEarningsSchema>;
export type RecentSearch = typeof recentSearches.$inferSelect;
export type InsertRecentSearch = z.infer<typeof insertRecentSearchSchema>;
