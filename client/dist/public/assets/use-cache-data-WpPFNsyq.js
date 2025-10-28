import { d as useQuery } from "./useQuery-C9HFImIm.js";
const queryKeys = {
  // Base key for all queries
  all: ["app"],
  // Stock-related queries
  stocks: () => [...queryKeys.all, "stocks"],
  stock: (symbol) => [...queryKeys.stocks(), symbol],
  stockQuote: (symbol) => [...queryKeys.stock(symbol), "quote"],
  stockChart: (symbol, params) => [...queryKeys.stock(symbol), "chart", params],
  stockFundamentals: (symbol) => [...queryKeys.stock(symbol), "fundamentals"],
  stockNews: (symbol) => [...queryKeys.stock(symbol), "news"],
  stockBatch: (symbols) => [...queryKeys.stocks(), "batch", symbols.sort().join(",")],
  // Stock details queries (for use-stock-queries.ts)
  stockProfile: (symbol) => [...queryKeys.stock(symbol), "profile"],
  stockMetrics: (symbol) => [...queryKeys.stock(symbol), "metrics"],
  stockFinancials: (symbol) => [...queryKeys.stock(symbol), "financials"],
  // Portfolio-related queries
  portfolios: () => [...queryKeys.all, "portfolios"],
  portfolio: (id) => [...queryKeys.portfolios(), id],
  portfolioPerformance: (id) => [...queryKeys.portfolio(id), "performance"],
  portfolioHoldings: (id) => [...queryKeys.portfolio(id), "holdings"],
  portfolioSummary: (id) => [...queryKeys.portfolio(id), "summary"],
  // Watchlist-related queries
  watchlists: () => [...queryKeys.all, "watchlists"],
  watchlist: (id) => [...queryKeys.watchlists(), id],
  watchlistStocks: (id) => [...queryKeys.watchlist(id), "stocks"],
  // Earnings-related queries
  earnings: () => [...queryKeys.all, "earnings"],
  earningsCalendar: (params) => [...queryKeys.earnings(), "calendar", params],
  earningsTranscripts: () => [...queryKeys.earnings(), "transcripts"],
  earningsTranscript: (id) => [...queryKeys.earningsTranscripts(), id],
  // Market data queries
  market: () => [...queryKeys.all, "market"],
  marketOverview: () => [...queryKeys.market(), "overview"],
  marketSectors: () => [...queryKeys.market(), "sectors"],
  marketNews: () => [...queryKeys.market(), "news"],
  marketGainers: () => [...queryKeys.market(), "gainers"],
  marketLosers: () => [...queryKeys.market(), "losers"],
  // User-related queries
  user: () => [...queryKeys.all, "user"],
  userProfile: () => [...queryKeys.user(), "profile"],
  userSettings: () => [...queryKeys.user(), "settings"],
  userSubscription: () => [...queryKeys.user(), "subscription"],
  // Admin queries
  admin: () => [...queryKeys.all, "admin"],
  adminUsers: () => [...queryKeys.admin(), "users"],
  adminStats: () => [...queryKeys.admin(), "stats"],
  adminApiQuotas: () => [...queryKeys.admin(), "api-quotas"],
  adminJobs: () => [...queryKeys.admin(), "jobs"],
  // Search queries
  search: () => [...queryKeys.all, "search"],
  searchStocks: (query) => [...queryKeys.search(), "stocks", query],
  searchCompanies: (query) => [...queryKeys.search(), "companies", query],
  // Intrinsic Value / AlfaValue queries
  intrinsicValue: () => [...queryKeys.all, "intrinsic-value"],
  alfaValue: (ticker) => [...queryKeys.intrinsicValue(), ticker.toUpperCase()],
  alfaValueMain: (ticker) => [...queryKeys.alfaValue(ticker), "main"],
  valuationChart: (ticker, basedOn, excludeNRI) => [...queryKeys.alfaValue(ticker), "chart", basedOn, excludeNRI]
};
const getApiUrl = () => {
  return "";
};
function useCachedBatchQuotes(symbols, options = {}) {
  const unique = Array.from(new Set(symbols)).filter(Boolean);
  const chunk = (arr, size) => Array.from({
    length: Math.ceil(arr.length / size)
  }, (_, i) => arr.slice(i * size, i * size + size));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  return useQuery({
    queryKey: ["market-data", "quotes", "batch", unique],
    queryFn: async () => {
      const chunks = chunk(unique, 50);
      const allQuotes = [];
      for (const c of chunks) {
        const apiUrl = getApiUrl();
        const url = `${apiUrl}/api/cache/quotes/batch`;
        try {
          const r = await fetch(url, {
            method: "POST",
            headers: {
              "Accept": "application/json",
              "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({
              symbols: c
            })
          });
          if (r.ok) {
            const b = await r.json();
            let quotes = [];
            if (Array.isArray(b?.quotes)) {
              quotes = b.quotes;
            } else if (Array.isArray(b?.data)) {
              quotes = b.data;
            } else if (b?.data && typeof b.data === "object") {
              quotes = Object.values(b.data);
            }
            if (quotes.length) {
              allQuotes.push(...quotes);
            }
          } else {
            console.warn(`Failed to fetch cached quotes for ${c.join(",")}: ${r.status} ${r.statusText}`);
          }
        } catch (error) {
          console.error("Error fetching cached quotes:", error);
        }
        await sleep(250);
      }
      return {
        quotes: allQuotes.filter((q) => q && (q.price ?? q.close ?? q.last) != null),
        _source: "cache",
        _cached: true
      };
    },
    staleTime: 6e4,
    // 60 seconds to match backend cache TTL
    gcTime: 12e4,
    // 2 minutes garbage collection
    refetchInterval: 6e4,
    // Auto-refresh every 60 seconds
    retry: (count) => count < 2,
    ...options
  });
}
function useCachedQuote(symbol, options = {}) {
  return useQuery({
    queryKey: queryKeys.stockQuote(symbol),
    queryFn: async () => {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/cache/quotes/${symbol}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch cached quote: ${response.statusText}`);
      }
      const b = await response.json();
      let quote = null;
      if (Array.isArray(b?.quotes)) {
        quote = b.quotes[0] ?? null;
      } else if (b && typeof b === "object" && "data" in b) {
        quote = b.data;
      } else if (b && typeof b === "object" && ("price" in b || "symbol" in b)) {
        quote = b;
      }
      return {
        data: quote,
        _cached: b?._cached ?? true,
        _source: b?._source ?? "cache",
        _timestamp: b?._timestamp ?? Date.now()
      };
    },
    // Gentle retry/backoff to smooth out cold starts or brief hiccups
    retry: (count, error) => count < 2,
    retryDelay: (attempt) => Math.min(500 * attempt, 1e3),
    staleTime: 60 * 1e3,
    // 60 seconds to match backend cache TTL
    gcTime: 120 * 1e3,
    // 2 minutes garbage collection
    refetchOnWindowFocus: true,
    // Refetch when window regains focus
    refetchInterval: 60 * 1e3,
    // Auto-refresh every 60 seconds
    ...options
  });
}
function useCachedHistorical(symbol, period = "1M", options = {}) {
  return useQuery({
    queryKey: ["cache", "historical", symbol, period],
    queryFn: async () => {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/cache/historical/${symbol}/${period}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch cached historical data: ${response.statusText}`);
      }
      return response.json();
    },
    staleTime: 60 * 60 * 1e3,
    // 1 hour
    gcTime: 2 * 60 * 60 * 1e3,
    // 2 hours
    placeholderData: (previousData) => previousData,
    // Keep old data while loading
    ...options
  });
}
function useCachedFundamentals(symbol, options = {}) {
  return useQuery({
    queryKey: queryKeys.stockFundamentals(symbol),
    queryFn: async () => {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/cache/fundamentals/${symbol}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch cached fundamentals: ${response.statusText}`);
      }
      return response.json();
    },
    staleTime: 2 * 60 * 60 * 1e3,
    // 2 hours
    gcTime: 4 * 60 * 60 * 1e3,
    // 4 hours
    ...options
  });
}
function useCachedFinancials(symbol, options = {}) {
  return useQuery({
    queryKey: queryKeys.stockFinancials(symbol),
    queryFn: async () => {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/cache/financials/${symbol}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch cached financials: ${response.statusText}`);
      }
      return response.json();
    },
    staleTime: 24 * 60 * 60 * 1e3,
    // 24 hours
    gcTime: 48 * 60 * 60 * 1e3,
    // 48 hours
    ...options
  });
}
function useDirectFMPBatchQuotes(symbols, options = {}) {
  const unique = Array.from(new Set(symbols)).filter(Boolean);
  return useQuery({
    queryKey: ["direct", "batch", unique],
    queryFn: async () => {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/market-data/direct/batch`, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          symbols: unique
        })
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch direct batch quotes: ${response.statusText}`);
      }
      const data = await response.json();
      return {
        quotes: data.quotes || data || [],
        _source: "fmp_direct",
        _cached: false
      };
    },
    staleTime: 10 * 1e3,
    // 10 seconds - very fresh data
    gcTime: 60 * 1e3,
    // 1 minute  
    refetchInterval: 60 * 1e3,
    // Auto-refresh every minute
    retry: 2,
    ...options
  });
}
function useDirectFMPFinancials(symbol, period = "quarterly", options = {}) {
  return useQuery({
    queryKey: ["direct", "financials", symbol, period],
    queryFn: async () => {
      const apiUrl = getApiUrl();
      const periodParam = period === "annual" ? "annual" : "quarter";
      const response = await fetch(`${apiUrl}/api/market-data/direct/financials/${symbol}?period=${periodParam}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch direct financials: ${response.statusText}`);
      }
      return response.json();
    },
    staleTime: 60 * 60 * 1e3,
    // 1 hour - financials don't change often
    gcTime: 2 * 60 * 60 * 1e3,
    // 2 hours
    retry: 2,
    ...options
  });
}
export {
  useCachedBatchQuotes as a,
  useCachedQuote as b,
  useCachedHistorical as c,
  useCachedFundamentals as d,
  useCachedFinancials as e,
  useDirectFMPFinancials as f,
  queryKeys as q,
  useDirectFMPBatchQuotes as u
};
