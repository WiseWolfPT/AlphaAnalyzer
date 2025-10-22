/**
 * Centralized Query Key Factory for React Query
 * Provides consistent, type-safe query keys across the application
 */

export const queryKeys = {
  // Base key for all queries
  all: ['app'] as const,

  // Stock-related queries
  stocks: () => [...queryKeys.all, 'stocks'] as const,
  stock: (symbol: string) => [...queryKeys.stocks(), symbol] as const,
  stockQuote: (symbol: string) => [...queryKeys.stock(symbol), 'quote'] as const,
  stockChart: (symbol: string, params: ChartParams) =>
    [...queryKeys.stock(symbol), 'chart', params] as const,
  stockFundamentals: (symbol: string) => [...queryKeys.stock(symbol), 'fundamentals'] as const,
  stockNews: (symbol: string) => [...queryKeys.stock(symbol), 'news'] as const,
  stockBatch: (symbols: string[]) => [...queryKeys.stocks(), 'batch', symbols.sort().join(',')] as const,
  // Stock details queries (for use-stock-queries.ts)
  stockProfile: (symbol: string) => [...queryKeys.stock(symbol), 'profile'] as const,
  stockMetrics: (symbol: string) => [...queryKeys.stock(symbol), 'metrics'] as const,
  stockFinancials: (symbol: string) => [...queryKeys.stock(symbol), 'financials'] as const,

  // Portfolio-related queries
  portfolios: () => [...queryKeys.all, 'portfolios'] as const,
  portfolio: (id: string) => [...queryKeys.portfolios(), id] as const,
  portfolioPerformance: (id: string) => [...queryKeys.portfolio(id), 'performance'] as const,
  portfolioHoldings: (id: string) => [...queryKeys.portfolio(id), 'holdings'] as const,
  portfolioSummary: (id: string) => [...queryKeys.portfolio(id), 'summary'] as const,

  // Watchlist-related queries
  watchlists: () => [...queryKeys.all, 'watchlists'] as const,
  watchlist: (id: string) => [...queryKeys.watchlists(), id] as const,
  watchlistStocks: (id: string) => [...queryKeys.watchlist(id), 'stocks'] as const,

  // Earnings-related queries
  earnings: () => [...queryKeys.all, 'earnings'] as const,
  earningsCalendar: (params: EarningsParams) => [...queryKeys.earnings(), 'calendar', params] as const,
  earningsTranscripts: () => [...queryKeys.earnings(), 'transcripts'] as const,
  earningsTranscript: (id: string) => [...queryKeys.earningsTranscripts(), id] as const,

  // Market data queries
  market: () => [...queryKeys.all, 'market'] as const,
  marketOverview: () => [...queryKeys.market(), 'overview'] as const,
  marketSectors: () => [...queryKeys.market(), 'sectors'] as const,
  marketNews: () => [...queryKeys.market(), 'news'] as const,
  marketGainers: () => [...queryKeys.market(), 'gainers'] as const,
  marketLosers: () => [...queryKeys.market(), 'losers'] as const,

  // User-related queries
  user: () => [...queryKeys.all, 'user'] as const,
  userProfile: () => [...queryKeys.user(), 'profile'] as const,
  userSettings: () => [...queryKeys.user(), 'settings'] as const,
  userSubscription: () => [...queryKeys.user(), 'subscription'] as const,

  // Admin queries
  admin: () => [...queryKeys.all, 'admin'] as const,
  adminUsers: () => [...queryKeys.admin(), 'users'] as const,
  adminStats: () => [...queryKeys.admin(), 'stats'] as const,
  adminApiQuotas: () => [...queryKeys.admin(), 'api-quotas'] as const,
  adminJobs: () => [...queryKeys.admin(), 'jobs'] as const,

  // Search queries
  search: () => [...queryKeys.all, 'search'] as const,
  searchStocks: (query: string) => [...queryKeys.search(), 'stocks', query] as const,
  searchCompanies: (query: string) => [...queryKeys.search(), 'companies', query] as const,

  // Intrinsic Value / AlfaValue queries
  intrinsicValue: () => [...queryKeys.all, 'intrinsic-value'] as const,
  alfaValue: (ticker: string) => [...queryKeys.intrinsicValue(), ticker.toUpperCase()] as const,
  alfaValueMain: (ticker: string) => [...queryKeys.alfaValue(ticker), 'main'] as const,
  valuationChart: (ticker: string, basedOn: string, excludeNRI: boolean) =>
    [...queryKeys.alfaValue(ticker), 'chart', basedOn, excludeNRI] as const,
} as const;

// Type definitions for query parameters
export interface ChartParams {
  period?: '1D' | '1W' | '1M' | '3M' | '1Y' | '5Y';
  interval?: '1m' | '5m' | '15m' | '30m' | '1h' | '1d';
  indicators?: string[];
}

export interface EarningsParams {
  from?: string;
  to?: string;
  symbols?: string[];
}

// Query key utilities
export const queryKeyUtils = {
  /**
   * Invalidate all queries for a specific stock
   */
  invalidateStock: (symbol: string) => ({
    predicate: (query: any) => {
      const queryKey = query.queryKey as string[];
      return queryKey.includes('stocks') && queryKey.includes(symbol);
    }
  }),

  /**
   * Invalidate all queries for a specific portfolio
   */
  invalidatePortfolio: (id: string) => ({
    predicate: (query: any) => {
      const queryKey = query.queryKey as string[];
      return queryKey.includes('portfolios') && queryKey.includes(id);
    }
  }),

  /**
   * Invalidate all market data queries
   */
  invalidateMarketData: () => ({
    predicate: (query: any) => {
      const queryKey = query.queryKey as string[];
      return queryKey.includes('market');
    }
  }),

  /**
   * Get all related queries for a stock symbol
   */
  getStockQueries: (symbol: string) => [
    queryKeys.stockQuote(symbol),
    queryKeys.stockFundamentals(symbol),
    queryKeys.stockNews(symbol),
  ],

  /**
   * Get all related queries for a portfolio
   */
  getPortfolioQueries: (id: string) => [
    queryKeys.portfolio(id),
    queryKeys.portfolioPerformance(id),
    queryKeys.portfolioHoldings(id),
    queryKeys.portfolioSummary(id),
  ],
};

// Query key validation (development helper)
export const validateQueryKey = (key: readonly string[]) => {
  if (process.env.NODE_ENV === 'development') {
    if (!key.includes('app')) {
      console.warn('Query key should start with base "app" key:', key);
    }
    
    if (key.length < 2) {
      console.warn('Query key should have at least 2 levels:', key);
    }
    
    // Check for common patterns that might cause cache issues
    if (key.some(k => typeof k === 'object')) {
      console.warn('Query key contains object - consider serializing:', key);
    }
  }
  
  return key;
};

// Export type for use in components
export type QueryKey = ReturnType<typeof queryKeys[keyof typeof queryKeys]>;