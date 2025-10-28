import { d as useQuery } from "./useQuery-C9HFImIm.js";
import { Z as createClient, r as reactExports, D as useQueryClient } from "./index-DF734YkB.js";
import { a as axios } from "./index--4L2OUQN.js";
import { A as API_CONFIG, C as COLD_START_CONFIG, a as API_FEATURE_FLAGS, b as API_ENDPOINTS, S as SUPABASE_CONFIG } from "./api-BsiXYgjJ.js";
class ApiClient {
  constructor() {
    this.coldStartHandlers = /* @__PURE__ */ new Set();
    this.csrfToken = null;
    this.csrfTokenPromise = null;
    const baseURL = "";
    this.client = axios.create({
      baseURL,
      timeout: API_CONFIG.timeout,
      headers: API_CONFIG.headers,
      withCredentials: true
      // Enable cookies for CSRF
    });
    this.setupInterceptors();
  }
  async fetchCsrfToken() {
    if (this.csrfTokenPromise) {
      return this.csrfTokenPromise;
    }
    if (this.csrfToken) {
      return this.csrfToken;
    }
    this.csrfTokenPromise = this.client.get("/api/csrf-token").then((response) => {
      this.csrfToken = response.data.csrfToken;
      this.csrfTokenPromise = null;
      return this.csrfToken;
    }).catch((error) => {
      console.error("Failed to fetch CSRF token:", error);
      this.csrfTokenPromise = null;
      throw error;
    });
    return this.csrfTokenPromise;
  }
  setupInterceptors() {
    this.client.interceptors.request.use(async (config) => {
      const token = this.getAuthToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      if (config.url?.includes("/market-data/")) ;
      if (config.method && ["POST", "PUT", "DELETE", "PATCH"].includes(config.method.toUpperCase()) && !config.url?.includes("/csrf-token")) {
        try {
          const csrfToken = await this.fetchCsrfToken();
          config.headers["X-CSRF-Token"] = csrfToken;
        } catch (error) {
          console.warn("Could not fetch CSRF token:", error);
        }
      }
      config.metadata = {
        startTime: Date.now()
      };
      return config;
    }, (error) => {
      return Promise.reject(error);
    });
    this.client.interceptors.response.use((response) => {
      const startTime = response.config.metadata?.startTime || Date.now();
      const responseTime = Date.now() - startTime;
      if (responseTime > COLD_START_CONFIG.threshold) {
        console.log(`🥶 Cold start detected: ${responseTime}ms response time`);
        this.notifyColdStartHandlers(true);
      } else {
        this.notifyColdStartHandlers(false);
      }
      if (response.headers["x-cache-hit"] === "true") {
        console.log(`✨ Cache HIT for ${response.config.url}`);
      }
      return response;
    }, async (error) => {
      return this.handleErrorWithRetry(error);
    });
  }
  async handleErrorWithRetry(error) {
    const config = error.config;
    if (!config) {
      return Promise.reject(this.formatError(error));
    }
    config._retryCount = config._retryCount || 0;
    if (this.shouldRetry(error) && config._retryCount < API_CONFIG.retry.attempts) {
      config._retryCount++;
      const delay = API_CONFIG.retry.delay * Math.pow(API_CONFIG.retry.backoffMultiplier, config._retryCount - 1);
      console.log(`🔄 Retrying request (attempt ${config._retryCount}/${API_CONFIG.retry.attempts}) after ${delay}ms`);
      if (this.isColdStartError(error)) {
        this.notifyColdStartHandlers(true);
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
      return this.client.request(config);
    }
    return Promise.reject(this.formatError(error));
  }
  shouldRetry(error) {
    if (error.response && error.response.status >= 400 && error.response.status < 500 && error.response.status !== 401) {
      return false;
    }
    if (error.code === "ECONNABORTED" || error.code === "ECONNREFUSED" || !error.response) {
      return true;
    }
    if (error.response && error.response.status >= 500) {
      return true;
    }
    return false;
  }
  isColdStartError(error) {
    return error.code === "ECONNABORTED" || error.code === "ETIMEDOUT" || !error.response && error.request;
  }
  formatError(error) {
    if (error.response) {
      const data = error.response.data;
      return {
        message: data?.message || data?.error || error.message,
        code: data?.code || error.code,
        status: error.response.status,
        isColdStart: false
      };
    } else if (error.request) {
      return {
        message: COLD_START_CONFIG.message,
        code: "COLD_START",
        isColdStart: true
      };
    } else {
      return {
        message: error.message || "Unknown error occurred",
        code: "UNKNOWN_ERROR",
        isColdStart: false
      };
    }
  }
  getAuthToken() {
    return localStorage.getItem("alfalyzer-token") || localStorage.getItem("auth-token");
  }
  notifyColdStartHandlers(isColdStart) {
    this.coldStartHandlers.forEach((handler) => handler(isColdStart));
  }
  // Public methods
  /**
   * Register a cold start handler
   */
  onColdStart(handler) {
    this.coldStartHandlers.add(handler);
    return () => {
      this.coldStartHandlers.delete(handler);
    };
  }
  /**
   * GET request
   */
  async get(url, config) {
    const response = await this.client.get(url, config);
    return response.data;
  }
  /**
   * POST request
   */
  async post(url, data, config) {
    const response = await this.client.post(url, data, config);
    return response.data;
  }
  /**
   * PUT request
   */
  async put(url, data, config) {
    const response = await this.client.put(url, data, config);
    return response.data;
  }
  /**
   * DELETE request
   */
  async delete(url, config) {
    const response = await this.client.delete(url, config);
    return response.data;
  }
  /**
   * Health check with cold start detection
   */
  async checkHealth() {
    const startTime = Date.now();
    try {
      const response = await this.get("/api/health");
      const responseTime = Date.now() - startTime;
      return {
        ...response,
        isColdStart: responseTime > COLD_START_CONFIG.threshold,
        responseTime
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      throw {
        ...error,
        responseTime
      };
    }
  }
  /**
   * Set authentication token
   */
  setAuthToken(token) {
    localStorage.setItem("alfalyzer-token", token);
    localStorage.setItem("auth-token", token);
  }
  /**
   * Clear authentication token
   */
  clearAuthToken() {
    localStorage.removeItem("alfalyzer-token");
    localStorage.removeItem("auth-token");
  }
}
const apiClient = new ApiClient();
class MarketDataService {
  constructor() {
  }
  static getInstance() {
    if (!MarketDataService.instance) {
      MarketDataService.instance = new MarketDataService();
    }
    return MarketDataService.instance;
  }
  /**
   * Get quote for a single stock
   */
  async getQuote(symbol) {
    try {
      console.log(`📊 Fetching quote for ${symbol}...`);
      const apiSymbol = symbol.replace(".", "-");
      let endpoint;
      if (API_FEATURE_FLAGS.useRealApi(apiSymbol)) {
        console.log(`🔥 Using real API (v1) for ${symbol}`);
        endpoint = API_ENDPOINTS.v1.stock.quote(apiSymbol);
      } else {
        endpoint = API_ENDPOINTS.quotes.single(apiSymbol);
      }
      const response = await apiClient.get(endpoint);
      let quote;
      if (response.data && response.success) {
        quote = response.data;
        console.log(`✅ Real quote received for ${symbol}:`, quote.price, "from", quote.provider || "v1");
      } else {
        quote = response;
        console.log(`✅ Quote received for ${symbol}:`, quote.price);
      }
      return quote;
    } catch (error) {
      console.error(`❌ Failed to fetch quote for ${symbol}:`, error);
      if (error.isColdStart) {
        throw new Error(`Server is starting up. Please wait a moment and try again.`);
      }
      throw error;
    }
  }
  /**
   * Get quotes for multiple stocks
   */
  async getBatchQuotes(symbols) {
    try {
      console.log(`📊 Fetching batch quotes for ${symbols.length} symbols...`);
      const normalizedSymbols = symbols.map((s) => s.replace(".", "-"));
      const CHUNK_SIZE = 20;
      const chunks = [];
      for (let i = 0; i < normalizedSymbols.length; i += CHUNK_SIZE) {
        chunks.push(normalizedSymbols.slice(i, i + CHUNK_SIZE));
      }
      console.log(`📦 Splitting into ${chunks.length} chunks of max ${CHUNK_SIZE} symbols`);
      const chunkPromises = chunks.map(async (chunk, index) => {
        const symbolsParam = chunk.join(",");
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Request timeout")), 8e3);
        });
        const endpoint = `/api/market-data/quotes/batch?symbols=${symbolsParam}`;
        try {
          const response = await Promise.race([apiClient.get(endpoint), timeoutPromise]);
          console.log(`✅ Chunk ${index + 1}/${chunks.length} completed`);
          return Array.isArray(response) ? response : response.quotes || [];
        } catch (chunkError) {
          console.error(`❌ Chunk ${index + 1} failed:`, chunkError.message);
          return [];
        }
      });
      const results = await Promise.allSettled(chunkPromises);
      const allQuotes = [];
      const errors = {};
      let failedChunks = 0;
      results.forEach((result, index) => {
        if (result.status === "fulfilled" && Array.isArray(result.value)) {
          allQuotes.push(...result.value);
        } else {
          failedChunks++;
          const chunkSymbols = chunks[index];
          chunkSymbols.forEach((symbol) => {
            errors[symbol] = "Failed to fetch quote";
          });
        }
      });
      console.log(`✅ Batch complete: ${allQuotes.length} quotes received, ${failedChunks} chunks failed`);
      return {
        quotes: allQuotes,
        errors,
        failed: Object.keys(errors),
        timestamp: Date.now(),
        _timestamp: Date.now() / 1e3
      };
    } catch (error) {
      console.error("❌ Failed to fetch batch quotes:", error);
      return {
        quotes: [],
        errors: {
          general: error.isColdStart ? "Server is starting up. Data will load in a moment." : error.message || "Failed to fetch market data"
        },
        failed: symbols,
        timestamp: Date.now(),
        _timestamp: Date.now() / 1e3
      };
    }
  }
  /**
   * Get market status
   */
  async getMarketStatus(market = "US") {
    try {
      const status = await apiClient.get(`/api/market-data/market-status?market=${market}`);
      return status;
    } catch (error) {
      console.error("❌ Failed to fetch market status:", error);
      return this.getDefaultMarketStatus(market);
    }
  }
  /**
   * Search for stocks
   */
  async searchSymbols(query) {
    try {
      const params = new URLSearchParams({
        query
      });
      const response = await apiClient.get(`/api/stocks/search?${params}`);
      return response.results || [];
    } catch (error) {
      console.error("❌ Failed to search stocks:", error);
      return [];
    }
  }
  /**
   * Get market overview (indices)
   */
  async getMarketOverview() {
    try {
      const overview = await apiClient.get("/api/v1/market/overview");
      return overview;
    } catch (error) {
      console.warn("⚠️ Market overview not available, using fallback data");
      return this.getFallbackMarketOverview();
    }
  }
  /**
   * Get cache statistics
   */
  async getCacheStats() {
    try {
      const stats = await apiClient.get(API_ENDPOINTS.cache.stats);
      return stats;
    } catch (error) {
      console.error("❌ Failed to fetch cache stats:", error);
      return null;
    }
  }
  /**
   * Invalidate cache for a specific symbol
   */
  async invalidateQuote(symbol) {
    try {
      await apiClient.delete(API_ENDPOINTS.cache.invalidate(symbol));
      console.log(`✅ Cache invalidated for ${symbol}`);
    } catch (error) {
      console.error(`❌ Failed to invalidate cache for ${symbol}:`, error);
      throw error;
    }
  }
  /**
   * Check API health
   */
  async checkHealth() {
    return apiClient.checkHealth();
  }
  // Private helper methods
  getDefaultMarketStatus(market) {
    const now = /* @__PURE__ */ new Date();
    const hour = now.getUTCHours();
    const day = now.getUTCDay();
    const isWeekday = day >= 1 && day <= 5;
    const isMarketHours = hour >= 14 && hour < 21;
    return {
      market,
      isOpen: isWeekday && isMarketHours,
      timezone: "America/New_York",
      provider: "default"
    };
  }
  getFallbackMarketOverview() {
    const baseData = {
      sp500: {
        value: 4712.34,
        change: 1.24
      },
      nasdaq: {
        value: 14789.45,
        change: 1.89
      },
      dow: {
        value: 35234.67,
        change: 0.78
      },
      vix: {
        value: 16.23,
        change: -5.2
      }
    };
    return {
      sp500: {
        value: baseData.sp500.value + (Math.random() - 0.5) * 50,
        change: baseData.sp500.change + (Math.random() - 0.5) * 0.5
      },
      nasdaq: {
        value: baseData.nasdaq.value + (Math.random() - 0.5) * 100,
        change: baseData.nasdaq.change + (Math.random() - 0.5) * 0.5
      },
      dow: {
        value: baseData.dow.value + (Math.random() - 0.5) * 200,
        change: baseData.dow.change + (Math.random() - 0.5) * 0.3
      },
      vix: {
        value: baseData.vix.value + (Math.random() - 0.5) * 2,
        change: baseData.vix.change + (Math.random() - 0.5) * 1
      }
    };
  }
}
const marketDataService = MarketDataService.getInstance();
class RealtimeService {
  constructor() {
    this.channels = /* @__PURE__ */ new Map();
    this.listeners = /* @__PURE__ */ new Map();
    this.reconnectAttempts = /* @__PURE__ */ new Map();
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1e3;
    this.supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    });
  }
  /**
   * Subscribe to real-time quotes for specific symbols
   */
  subscribeToQuotes(symbols, callback) {
    const sortedSymbols = [...symbols].sort();
    const channelName = `quotes:${sortedSymbols.join(",")}`;
    console.log(`📡 Subscribing to real-time quotes for: ${symbols.join(", ")}`);
    if (!this.channels.has(channelName)) {
      this.createChannel(channelName, sortedSymbols);
    }
    symbols.forEach((symbol) => {
      if (!this.listeners.has(symbol)) {
        this.listeners.set(symbol, /* @__PURE__ */ new Set());
      }
      this.listeners.get(symbol).add(callback);
    });
    return {
      unsubscribe: () => {
        symbols.forEach((symbol) => {
          this.listeners.get(symbol)?.delete(callback);
          if (this.listeners.get(symbol)?.size === 0) {
            this.listeners.delete(symbol);
          }
        });
        const hasListeners = sortedSymbols.some((s) => this.listeners.has(s));
        if (!hasListeners) {
          this.removeChannel(channelName);
        }
      }
    };
  }
  /**
   * Subscribe to all quotes (for dashboard)
   */
  subscribeToAllQuotes(callback) {
    const channelName = "all-quotes";
    console.log("📡 Subscribing to all real-time quotes");
    if (!this.channels.has(channelName)) {
      const channel = this.supabase.channel(channelName).on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "realtime_quotes"
      }, (payload) => {
        const quote = payload.new;
        console.log("✨ Realtime quote received:", quote.symbol, quote.price);
        callback(quote);
      }).subscribe((status) => {
        console.log(`📡 Realtime channel status: ${status}`);
        if (status === "SUBSCRIBED") {
          console.log("✅ Successfully subscribed to all quotes");
          this.reconnectAttempts.set(channelName, 0);
        } else if (status === "CHANNEL_ERROR") {
          console.error("❌ Channel error, attempting reconnect...");
          this.handleReconnect(channelName);
        } else if (status === "TIMED_OUT") {
          console.error("⏱️ Channel timed out, attempting reconnect...");
          this.handleReconnect(channelName);
        }
      });
      this.channels.set(channelName, channel);
    }
    return {
      unsubscribe: () => {
        this.removeChannel(channelName);
      }
    };
  }
  /**
   * Publish a quote update (for testing or manual updates)
   */
  async publishQuote(quote) {
    try {
      const {
        error
      } = await this.supabase.from("realtime_quotes").insert({
        symbol: quote.symbol,
        price: quote.price,
        change: quote.change,
        change_percent: quote.change_percent,
        volume: quote.volume,
        timestamp: quote.timestamp || (/* @__PURE__ */ new Date()).toISOString()
      });
      if (error) {
        console.error("❌ Failed to publish quote:", error);
        throw error;
      }
      console.log("✅ Quote published:", quote.symbol);
    } catch (error) {
      console.error("❌ Error publishing quote:", error);
      throw error;
    }
  }
  /**
   * Get connection status
   */
  getConnectionStatus() {
    const activeChannels = Array.from(this.channels.keys());
    const totalListeners = Array.from(this.listeners.values()).reduce((sum, set) => sum + set.size, 0);
    return {
      connected: activeChannels.length > 0,
      channels: activeChannels,
      listeners: totalListeners
    };
  }
  /**
   * Clean up all subscriptions
   */
  cleanup() {
    console.log("🧹 Cleaning up realtime subscriptions...");
    this.channels.forEach((channel, name) => {
      this.supabase.removeChannel(channel);
      console.log(`❌ Removed channel: ${name}`);
    });
    this.channels.clear();
    this.listeners.clear();
    this.reconnectAttempts.clear();
  }
  // Private methods
  createChannel(channelName, symbols) {
    console.log(`🔧 Creating channel: ${channelName}`);
    const channel = this.supabase.channel(channelName);
    if (symbols.length === 1) {
      channel.on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "realtime_quotes",
        filter: `symbol=eq.${symbols[0]}`
      }, (payload) => this.handleQuoteUpdate(payload.new));
    } else {
      channel.on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "realtime_quotes"
      }, (payload) => {
        const quote = payload.new;
        if (symbols.includes(quote.symbol)) {
          this.handleQuoteUpdate(quote);
        }
      });
    }
    channel.subscribe((status) => {
      console.log(`📡 Channel ${channelName} status: ${status}`);
      if (status === "SUBSCRIBED") {
        console.log(`✅ Successfully subscribed to ${channelName}`);
        this.reconnectAttempts.set(channelName, 0);
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        console.error(`❌ Channel error for ${channelName}, attempting reconnect...`);
        this.handleReconnect(channelName);
      }
    });
    this.channels.set(channelName, channel);
  }
  removeChannel(channelName) {
    const channel = this.channels.get(channelName);
    if (channel) {
      console.log(`🔌 Removing channel: ${channelName}`);
      this.supabase.removeChannel(channel);
      this.channels.delete(channelName);
      this.reconnectAttempts.delete(channelName);
    }
  }
  handleQuoteUpdate(quote) {
    console.log("📈 Quote update received:", quote.symbol, quote.price);
    const listeners = this.listeners.get(quote.symbol);
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(quote);
        } catch (error) {
          console.error("Error in quote listener:", error);
        }
      });
    }
  }
  async handleReconnect(channelName) {
    const attempts = this.reconnectAttempts.get(channelName) || 0;
    if (attempts >= this.maxReconnectAttempts) {
      console.error(`❌ Max reconnect attempts reached for ${channelName}`);
      return;
    }
    const delay = this.reconnectDelay * Math.pow(2, attempts);
    console.log(`🔄 Reconnecting ${channelName} in ${delay}ms (attempt ${attempts + 1}/${this.maxReconnectAttempts})`);
    this.reconnectAttempts.set(channelName, attempts + 1);
    setTimeout(() => {
      const channel = this.channels.get(channelName);
      if (channel) {
        this.supabase.removeChannel(channel);
        this.channels.delete(channelName);
        if (channelName === "all-quotes") {
          const firstListener = Array.from(this.listeners.values())[0]?.values().next().value;
          if (firstListener) {
            this.subscribeToAllQuotes(firstListener);
          }
        } else if (channelName.startsWith("quotes:")) {
          const symbols = channelName.replace("quotes:", "").split(",");
          const listeners = /* @__PURE__ */ new Set();
          symbols.forEach((symbol) => {
            const symbolListeners = this.listeners.get(symbol);
            if (symbolListeners) {
              symbolListeners.forEach((listener) => listeners.add(listener));
            }
          });
          if (listeners.size > 0) {
            this.createChannel(channelName, symbols);
          }
        }
      }
    }, delay);
  }
}
const realtimeService = new RealtimeService();
const marketDataKeys = {
  all: ["market-data"],
  quotes: () => [...marketDataKeys.all, "quotes"],
  quote: (symbol) => [...marketDataKeys.quotes(), symbol],
  batchQuotes: (symbols) => [...marketDataKeys.quotes(), "batch", symbols],
  marketStatus: (market = "US") => [...marketDataKeys.all, "status", market],
  marketOverview: () => [...marketDataKeys.all, "overview"]
};
function useStockQuote(symbol, options = {}) {
  const queryClient = useQueryClient();
  const [realtimePrice, setRealtimePrice] = reactExports.useState(null);
  const [isColdStart, setIsColdStart] = reactExports.useState(false);
  reactExports.useEffect(() => {
    const unsubscribe = apiClient.onColdStart(setIsColdStart);
    return unsubscribe;
  }, []);
  const query = useQuery({
    queryKey: marketDataKeys.quote(symbol),
    queryFn: () => marketDataService.getQuote(symbol),
    staleTime: 60 * 1e3,
    // 1 minute - matches FMP update frequency
    gcTime: 10 * 60 * 1e3,
    // 10 minutes (renamed from cacheTime)
    enabled: !!symbol,
    refetchInterval: 60 * 1e3,
    // Refetch every minute (FMP only updates each minute)
    refetchOnWindowFocus: true,
    // Also refresh when user returns to tab
    ...options
  });
  reactExports.useEffect(() => {
    if (!symbol) return;
    const subscription = realtimeService.subscribeToQuotes([symbol], (quote) => {
      setRealtimePrice(quote.price);
      queryClient.setQueryData(marketDataKeys.quote(symbol), (old) => ({
        ...old,
        price: quote.price,
        change: quote.change,
        changePercent: quote.change_percent,
        volume: quote.volume,
        timestamp: quote.timestamp
      }));
    });
    return () => subscription.unsubscribe();
  }, [symbol, queryClient]);
  const data = query.data ? {
    ...query.data,
    price: realtimePrice ?? query.data.price
  } : void 0;
  return {
    ...query,
    data,
    isRealtime: realtimePrice !== null,
    isColdStart
  };
}
function useColdStartHandler() {
  const [isColdStart, setIsColdStart] = reactExports.useState(false);
  const [coldStartMessage, setColdStartMessage] = reactExports.useState("");
  reactExports.useEffect(() => {
    const unsubscribe = apiClient.onColdStart((coldStart) => {
      setIsColdStart(coldStart);
      if (coldStart) {
        setColdStartMessage("Server is waking up, please wait...");
        setTimeout(() => setColdStartMessage(""), 1e4);
      }
    });
    return unsubscribe;
  }, []);
  return {
    isColdStart,
    coldStartMessage
  };
}
export {
  useColdStartHandler as a,
  useStockQuote as u
};
