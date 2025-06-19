import { 
  pgTable, 
  text, 
  serial, 
  integer, 
  boolean, 
  decimal, 
  timestamp, 
  uuid,
  varchar,
  bigint,
  date,
  jsonb,
  inet,
  pgEnum,
  index,
  unique,
  primaryKey
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// ========================================
// ENUMS
// ========================================

export const subscriptionTierEnum = pgEnum('subscription_tier_enum', [
  'free', 
  'premium', 
  'whop_community', 
  'enterprise'
]);

export const subscriptionStatusEnum = pgEnum('subscription_status_enum', [
  'trial', 
  'active', 
  'past_due', 
  'cancelled', 
  'expired'
]);

export const billingIntervalEnum = pgEnum('billing_interval_enum', [
  'month', 
  'year', 
  'lifetime'
]);

export const transactionTypeEnum = pgEnum('transaction_type_enum', [
  'buy', 
  'sell', 
  'dividend', 
  'split', 
  'merger', 
  'spinoff'
]);

export const marketCapTierEnum = pgEnum('market_cap_tier_enum', [
  'nano', 
  'micro', 
  'small', 
  'mid', 
  'large', 
  'mega'
]);

// ========================================
// USER MANAGEMENT & AUTHENTICATION
// ========================================

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  fullName: varchar("full_name", { length: 255 }),
  avatarUrl: text("avatar_url"),
  phone: varchar("phone", { length: 20 }),
  countryCode: varchar("country_code", { length: 2 }),
  timezone: varchar("timezone", { length: 50 }).default("UTC"),
  language: varchar("language", { length: 10 }).default("en"),
  
  // Subscription management
  subscriptionTier: subscriptionTierEnum("subscription_tier").notNull().default("free"),
  subscriptionStatus: subscriptionStatusEnum("subscription_status").notNull().default("active"),
  subscriptionStartDate: timestamp("subscription_start_date"),
  subscriptionEndDate: timestamp("subscription_end_date"),
  trialEndDate: timestamp("trial_end_date"),
  whopOrderId: varchar("whop_order_id", { length: 255 }),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
  
  // User preferences
  preferences: jsonb("preferences").default({}),
  notificationSettings: jsonb("notification_settings").default({}),
  
  // Security & compliance
  emailVerified: boolean("email_verified").default(false),
  phoneVerified: boolean("phone_verified").default(false),
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  lastLoginAt: timestamp("last_login_at"),
  loginCount: integer("login_count").default(0),
  
  // Audit fields
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
}, (table) => {
  return {
    emailIdx: index("idx_users_email").on(table.email),
    subscriptionIdx: index("idx_users_subscription").on(table.subscriptionTier, table.subscriptionStatus),
    createdAtIdx: index("idx_users_created_at").on(table.createdAt),
  };
});

export const subscriptionPlans = pgTable("subscription_plans", {
  id: varchar("id", { length: 50 }).primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  priceCents: integer("price_cents").notNull(),
  currency: varchar("currency", { length: 3 }).default("EUR"),
  billingInterval: billingIntervalEnum("billing_interval").notNull(),
  trialDays: integer("trial_days").default(0),
  features: jsonb("features").notNull().default([]),
  limits: jsonb("limits").notNull().default({}),
  isActive: boolean("is_active").default(true),
  stripePriceId: varchar("stripe_price_id", { length: 255 }),
  whopProductId: varchar("whop_product_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const subscriptionHistory = pgTable("subscription_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  oldTier: subscriptionTierEnum("old_tier"),
  newTier: subscriptionTierEnum("new_tier").notNull(),
  oldStatus: subscriptionStatusEnum("old_status"),
  newStatus: subscriptionStatusEnum("new_status").notNull(),
  changeReason: varchar("change_reason", { length: 100 }),
  paymentMethod: varchar("payment_method", { length: 50 }),
  amountCents: integer("amount_cents"),
  currency: varchar("currency", { length: 3 }),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    userIdx: index("idx_subscription_history_user").on(table.userId),
    createdIdx: index("idx_subscription_history_created").on(table.createdAt),
  };
});

// ========================================
// PORTFOLIO & HOLDINGS MANAGEMENT
// ========================================

export const portfolios = pgTable("portfolios", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  currency: varchar("currency", { length: 3 }).default("USD"),
  isDefault: boolean("is_default").default(false),
  isPublic: boolean("is_public").default(false),
  benchmarkSymbol: varchar("benchmark_symbol", { length: 10 }).default("SPY"),
  
  // Performance tracking
  totalValueCents: bigint("total_value_cents", { mode: "number" }).default(0),
  totalCostCents: bigint("total_cost_cents", { mode: "number" }).default(0),
  totalReturnCents: bigint("total_return_cents", { mode: "number" }).default(0),
  totalReturnPercent: decimal("total_return_percent", { precision: 10, scale: 4 }).default("0"),
  dayChangeCents: bigint("day_change_cents", { mode: "number" }).default(0),
  dayChangePercent: decimal("day_change_percent", { precision: 10, scale: 4 }).default("0"),
  
  // Risk metrics
  beta: decimal("beta", { precision: 10, scale: 4 }),
  sharpeRatio: decimal("sharpe_ratio", { precision: 10, scale: 4 }),
  volatility: decimal("volatility", { precision: 10, scale: 4 }),
  maxDrawdown: decimal("max_drawdown", { precision: 10, scale: 4 }),
  
  // Audit fields
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
}, (table) => {
  return {
    userNameUnique: unique("unique_user_portfolio_name").on(table.userId, table.name),
    userIdx: index("idx_portfolios_user").on(table.userId),
    updatedIdx: index("idx_portfolios_updated").on(table.updatedAt),
  };
});

export const portfolioHoldings = pgTable("portfolio_holdings", {
  id: uuid("id").primaryKey().defaultRandom(),
  portfolioId: uuid("portfolio_id").notNull().references(() => portfolios.id, { onDelete: "cascade" }),
  symbol: varchar("symbol", { length: 10 }).notNull(),
  
  // Position details
  quantity: decimal("quantity", { precision: 15, scale: 6 }).notNull(),
  averageCostCents: bigint("average_cost_cents", { mode: "number" }).notNull(),
  currentPriceCents: bigint("current_price_cents", { mode: "number" }),
  marketValueCents: bigint("market_value_cents", { mode: "number" }),
  unrealizedPnlCents: bigint("unrealized_pnl_cents", { mode: "number" }).default(0),
  realizedPnlCents: bigint("realized_pnl_cents", { mode: "number" }).default(0),
  
  // Position metrics
  weightPercent: decimal("weight_percent", { precision: 5, scale: 2 }),
  dayChangeCents: bigint("day_change_cents", { mode: "number" }).default(0),
  dayChangePercent: decimal("day_change_percent", { precision: 10, scale: 4 }).default("0"),
  
  // Dates
  firstPurchaseDate: date("first_purchase_date"),
  lastTransactionDate: date("last_transaction_date"),
  
  // Audit fields
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    portfolioSymbolUnique: unique("unique_portfolio_symbol").on(table.portfolioId, table.symbol),
    portfolioIdx: index("idx_holdings_portfolio").on(table.portfolioId),
    symbolIdx: index("idx_holdings_symbol").on(table.symbol),
    updatedIdx: index("idx_holdings_updated").on(table.updatedAt),
  };
});

export const portfolioTransactions = pgTable("portfolio_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  portfolioId: uuid("portfolio_id").notNull().references(() => portfolios.id, { onDelete: "cascade" }),
  symbol: varchar("symbol", { length: 10 }).notNull(),
  
  // Transaction details
  transactionType: transactionTypeEnum("transaction_type").notNull(),
  quantity: decimal("quantity", { precision: 15, scale: 6 }).notNull(),
  priceCents: bigint("price_cents", { mode: "number" }).notNull(),
  feesCents: bigint("fees_cents", { mode: "number" }).default(0),
  totalAmountCents: bigint("total_amount_cents", { mode: "number" }).notNull(),
  
  // Transaction metadata
  transactionDate: date("transaction_date").notNull(),
  notes: text("notes"),
  broker: varchar("broker", { length: 50 }),
  accountId: varchar("account_id", { length: 100 }),
  referenceId: varchar("reference_id", { length: 100 }),
  
  // Audit fields
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    portfolioIdx: index("idx_transactions_portfolio").on(table.portfolioId),
    symbolIdx: index("idx_transactions_symbol").on(table.symbol),
    dateIdx: index("idx_transactions_date").on(table.transactionDate),
    typeIdx: index("idx_transactions_type").on(table.transactionType),
  };
});

// ========================================
// ENHANCED WATCHLISTS SYSTEM
// ========================================

export const enhancedWatchlists = pgTable("enhanced_watchlists", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  userId: text("user_id").notNull(),
  description: text("description"),
  isPublic: boolean("is_public").default(false),
  category: varchar("category", { length: 50 }),
  sortOrder: integer("sort_order").default(0),
  color: varchar("color", { length: 7 }), // Hex color code
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    userIdx: index("idx_enhanced_watchlists_user").on(table.userId),
    categoryIdx: index("idx_enhanced_watchlists_category").on(table.category),
  };
});

export const watchlistPerformance = pgTable("watchlist_performance", {
  id: uuid("id").primaryKey().defaultRandom(),
  watchlistId: integer("watchlist_id").notNull().references(() => enhancedWatchlists.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  
  // Performance metrics
  totalReturnPercent: decimal("total_return_percent", { precision: 10, scale: 4 }),
  dayChangePercent: decimal("day_change_percent", { precision: 10, scale: 4 }),
  bestPerformerSymbol: varchar("best_performer_symbol", { length: 10 }),
  worstPerformerSymbol: varchar("worst_performer_symbol", { length: 10 }),
  avgPeRatio: decimal("avg_pe_ratio", { precision: 10, scale: 4 }),
  avgMarketCapMillions: bigint("avg_market_cap_millions", { mode: "number" }),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    watchlistDateUnique: unique("unique_watchlist_date").on(table.watchlistId, table.date),
    dateIdx: index("idx_watchlist_perf_date").on(table.date),
  };
});

// ========================================
// ENHANCED FINANCIAL DATA
// ========================================

export const enhancedStocks = pgTable("enhanced_stocks", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull().unique(),
  name: text("name").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  change: decimal("change", { precision: 10, scale: 2 }).notNull(),
  changePercent: decimal("change_percent", { precision: 5, scale: 2 }).notNull(),
  marketCap: text("market_cap").notNull(),
  
  // Enhanced fields
  sectorId: integer("sector_id"),
  industryId: integer("industry_id"),
  country: varchar("country", { length: 2 }),
  exchange: varchar("exchange", { length: 10 }),
  currency: varchar("currency", { length: 3 }).default("USD"),
  marketCapTier: marketCapTierEnum("market_cap_tier"),
  isActive: boolean("is_active").default(true),
  dividendYield: decimal("dividend_yield", { precision: 5, scale: 4 }),
  beta: decimal("beta", { precision: 10, scale: 4 }),
  
  // Original fields
  sector: text("sector"),
  industry: text("industry"),
  eps: decimal("eps", { precision: 10, scale: 2 }),
  peRatio: decimal("pe_ratio", { precision: 10, scale: 2 }),
  logo: text("logo"),
  lastUpdated: timestamp("last_updated").defaultNow(),
}, (table) => {
  return {
    symbolIdx: index("idx_enhanced_stocks_symbol").on(table.symbol),
    sectorIdx: index("idx_enhanced_stocks_sector").on(table.sectorId),
    exchangeIdx: index("idx_enhanced_stocks_exchange").on(table.exchange),
    marketCapTierIdx: index("idx_enhanced_stocks_market_cap_tier").on(table.marketCapTier),
  };
});

export const stockFundamentals = pgTable("stock_fundamentals", {
  id: uuid("id").primaryKey().defaultRandom(),
  symbol: varchar("symbol", { length: 10 }).notNull(),
  fiscalYear: integer("fiscal_year").notNull(),
  fiscalQuarter: integer("fiscal_quarter"),
  
  // Income statement
  revenueCents: bigint("revenue_cents", { mode: "number" }),
  grossProfitCents: bigint("gross_profit_cents", { mode: "number" }),
  operatingIncomeCents: bigint("operating_income_cents", { mode: "number" }),
  netIncomeCents: bigint("net_income_cents", { mode: "number" }),
  eps: decimal("eps", { precision: 10, scale: 4 }),
  
  // Balance sheet
  totalAssetsCents: bigint("total_assets_cents", { mode: "number" }),
  totalDebtCents: bigint("total_debt_cents", { mode: "number" }),
  shareholdersEquityCents: bigint("shareholders_equity_cents", { mode: "number" }),
  bookValuePerShare: decimal("book_value_per_share", { precision: 10, scale: 4 }),
  
  // Cash flow
  operatingCashFlowCents: bigint("operating_cash_flow_cents", { mode: "number" }),
  freeCashFlowCents: bigint("free_cash_flow_cents", { mode: "number" }),
  capitalExpendituresCents: bigint("capital_expenditures_cents", { mode: "number" }),
  
  // Ratios
  peRatio: decimal("pe_ratio", { precision: 10, scale: 4 }),
  pbRatio: decimal("pb_ratio", { precision: 10, scale: 4 }),
  debtToEquity: decimal("debt_to_equity", { precision: 10, scale: 4 }),
  roe: decimal("roe", { precision: 10, scale: 4 }),
  roa: decimal("roa", { precision: 10, scale: 4 }),
  currentRatio: decimal("current_ratio", { precision: 10, scale: 4 }),
  
  // Dates
  reportDate: date("report_date"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    symbolYearQuarterUnique: unique("unique_symbol_year_quarter").on(table.symbol, table.fiscalYear, table.fiscalQuarter),
    symbolIdx: index("idx_fundamentals_symbol").on(table.symbol),
    yearIdx: index("idx_fundamentals_year").on(table.fiscalYear),
  };
});

// ========================================
// AUDIT TRAIL & COMPLIANCE
// ========================================

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  
  // User context
  userId: uuid("user_id").references(() => users.id),
  sessionId: varchar("session_id", { length: 255 }),
  ipAddress: inet("ip_address"),
  userAgent: text("user_agent"),
  
  // Action details
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entity_type", { length: 50 }),
  entityId: varchar("entity_id", { length: 255 }),
  oldValues: jsonb("old_values"),
  newValues: jsonb("new_values"),
  
  // Request context
  requestId: varchar("request_id", { length: 255 }),
  endpoint: varchar("endpoint", { length: 255 }),
  method: varchar("method", { length: 10 }),
  statusCode: integer("status_code"),
  
  // Compliance fields
  complianceReason: varchar("compliance_reason", { length: 100 }),
  dataClassification: varchar("data_classification", { length: 50 }).default("internal"),
  retentionPeriodDays: integer("retention_period_days").default(2555), // 7 years
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    userIdx: index("idx_audit_user").on(table.userId),
    actionIdx: index("idx_audit_action").on(table.action),
    entityIdx: index("idx_audit_entity").on(table.entityType, table.entityId),
    createdIdx: index("idx_audit_created").on(table.createdAt),
    sessionIdx: index("idx_audit_session").on(table.sessionId),
  };
});

export const dataAccessLogs = pgTable("data_access_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  
  // Access details
  dataType: varchar("data_type", { length: 50 }).notNull(),
  dataIdentifier: varchar("data_identifier", { length: 255 }),
  accessReason: varchar("access_reason", { length: 100 }),
  
  // Context
  ipAddress: inet("ip_address"),
  userAgent: text("user_agent"),
  sessionId: varchar("session_id", { length: 255 }),
  requestId: varchar("request_id", { length: 255 }),
  
  // Compliance
  authorized: boolean("authorized").default(true),
  authorizationMethod: varchar("authorization_method", { length: 50 }),
  dataSensitivity: varchar("data_sensitivity", { length: 20 }).default("public"),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    userIdx: index("idx_data_access_user").on(table.userId),
    typeIdx: index("idx_data_access_type").on(table.dataType),
    createdIdx: index("idx_data_access_created").on(table.createdAt),
  };
});

export const userConsents = pgTable("user_consents", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Consent details
  consentType: varchar("consent_type", { length: 50 }).notNull(),
  consentVersion: varchar("consent_version", { length: 20 }).notNull(),
  granted: boolean("granted").notNull(),
  
  // Context
  ipAddress: inet("ip_address"),
  userAgent: text("user_agent"),
  method: varchar("method", { length: 50 }), // 'explicit', 'implicit', 'opt_out'
  
  // Timestamps
  grantedAt: timestamp("granted_at"),
  revokedAt: timestamp("revoked_at"),
  expiresAt: timestamp("expires_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    userIdx: index("idx_consent_user").on(table.userId),
    typeIdx: index("idx_consent_type").on(table.consentType),
    grantedIdx: index("idx_consent_granted").on(table.grantedAt),
  };
});

// ========================================
// CACHING & PERFORMANCE
// ========================================

export const cacheEntries = pgTable("cache_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  cacheKey: varchar("cache_key", { length: 255 }).notNull().unique(),
  cacheValue: jsonb("cache_value").notNull(),
  
  // Cache metadata
  cacheType: varchar("cache_type", { length: 50 }).notNull(),
  ttlSeconds: integer("ttl_seconds").notNull(),
  tags: varchar("tags", { length: 255 }).array(),
  
  // Performance tracking
  hitCount: integer("hit_count").default(0),
  lastHitAt: timestamp("last_hit_at"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
}, (table) => {
  return {
    keyIdx: index("idx_cache_key").on(table.cacheKey),
    typeIdx: index("idx_cache_type").on(table.cacheType),
    expiresIdx: index("idx_cache_expires").on(table.expiresAt),
  };
});

export const apiUsageLogs = pgTable("api_usage_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  
  // API details
  endpoint: varchar("endpoint", { length: 255 }).notNull(),
  method: varchar("method", { length: 10 }).notNull(),
  apiKeyId: varchar("api_key_id", { length: 255 }),
  
  // Usage metrics
  requestsCount: integer("requests_count").default(1),
  responseTimeMs: integer("response_time_ms"),
  statusCode: integer("status_code"),
  errorMessage: text("error_message"),
  
  // Rate limiting
  rateLimitWindow: varchar("rate_limit_window", { length: 20 }),
  rateLimitRemaining: integer("rate_limit_remaining"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  windowStart: timestamp("window_start"),
}, (table) => {
  return {
    userIdx: index("idx_usage_user").on(table.userId),
    endpointIdx: index("idx_usage_endpoint").on(table.endpoint),
    windowIdx: index("idx_usage_window").on(table.windowStart),
    createdIdx: index("idx_usage_created").on(table.createdAt),
  };
});

// ========================================
// RELATIONS
// ========================================

export const usersRelations = relations(users, ({ many }) => ({
  portfolios: many(portfolios),
  subscriptionHistory: many(subscriptionHistory),
  auditLogs: many(auditLogs),
  dataAccessLogs: many(dataAccessLogs),
  userConsents: many(userConsents),
  apiUsageLogs: many(apiUsageLogs),
}));

export const portfoliosRelations = relations(portfolios, ({ one, many }) => ({
  user: one(users, {
    fields: [portfolios.userId],
    references: [users.id],
  }),
  holdings: many(portfolioHoldings),
  transactions: many(portfolioTransactions),
}));

export const portfolioHoldingsRelations = relations(portfolioHoldings, ({ one }) => ({
  portfolio: one(portfolios, {
    fields: [portfolioHoldings.portfolioId],
    references: [portfolios.id],
  }),
}));

export const portfolioTransactionsRelations = relations(portfolioTransactions, ({ one }) => ({
  portfolio: one(portfolios, {
    fields: [portfolioTransactions.portfolioId],
    references: [portfolios.id],
  }),
}));

// ========================================
// INSERT SCHEMAS & TYPES
// ========================================

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPortfolioSchema = createInsertSchema(portfolios).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPortfolioHoldingSchema = createInsertSchema(portfolioHoldings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPortfolioTransactionSchema = createInsertSchema(portfolioTransactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStockFundamentalsSchema = createInsertSchema(stockFundamentals).omit({
  id: true,
  createdAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

// ========================================
// TYPES
// ========================================

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Portfolio = typeof portfolios.$inferSelect;
export type InsertPortfolio = z.infer<typeof insertPortfolioSchema>;

export type PortfolioHolding = typeof portfolioHoldings.$inferSelect;
export type InsertPortfolioHolding = z.infer<typeof insertPortfolioHoldingSchema>;

export type PortfolioTransaction = typeof portfolioTransactions.$inferSelect;
export type InsertPortfolioTransaction = z.infer<typeof insertPortfolioTransactionSchema>;

export type StockFundamentals = typeof stockFundamentals.$inferSelect;
export type InsertStockFundamentals = z.infer<typeof insertStockFundamentalsSchema>;

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

export type SubscriptionHistory = typeof subscriptionHistory.$inferSelect;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type UserConsent = typeof userConsents.$inferSelect;
export type CacheEntry = typeof cacheEntries.$inferSelect;
export type ApiUsageLog = typeof apiUsageLogs.$inferSelect;

// ========================================
// SUBSCRIPTION TIER DEFINITIONS
// ========================================

export interface SubscriptionTierFeatures {
  maxWatchlists: number;
  maxPortfolios: number;
  maxHoldingsPerPortfolio: number;
  realTimeData: boolean;
  advancedAnalytics: boolean;
  exportCapabilities: boolean;
  apiAccess: boolean;
  prioritySupport: boolean;
  customAlerts: number;
  historicalDataYears: number;
}

export const SUBSCRIPTION_TIERS: Record<string, SubscriptionTierFeatures> = {
  free: {
    maxWatchlists: 3,
    maxPortfolios: 1,
    maxHoldingsPerPortfolio: 10,
    realTimeData: false,
    advancedAnalytics: false,
    exportCapabilities: false,
    apiAccess: false,
    prioritySupport: false,
    customAlerts: 3,
    historicalDataYears: 1,
  },
  premium: {
    maxWatchlists: 20,
    maxPortfolios: 10,
    maxHoldingsPerPortfolio: 100,
    realTimeData: true,
    advancedAnalytics: true,
    exportCapabilities: true,
    apiAccess: true,
    prioritySupport: true,
    customAlerts: 50,
    historicalDataYears: 10,
  },
  whop_community: {
    maxWatchlists: 10,
    maxPortfolios: 5,
    maxHoldingsPerPortfolio: 50,
    realTimeData: true,
    advancedAnalytics: true,
    exportCapabilities: true,
    apiAccess: false,
    prioritySupport: true,
    customAlerts: 25,
    historicalDataYears: 5,
  },
  enterprise: {
    maxWatchlists: -1, // unlimited
    maxPortfolios: -1, // unlimited
    maxHoldingsPerPortfolio: -1, // unlimited
    realTimeData: true,
    advancedAnalytics: true,
    exportCapabilities: true,
    apiAccess: true,
    prioritySupport: true,
    customAlerts: -1, // unlimited
    historicalDataYears: 20,
  },
};