import { an as retryWithBackoff, r as reactExports, j as jsxRuntimeExports, o as Alert, v as CircleAlert, p as AlertDescription, C as Card, a as CardHeader, b as CardTitle, c as CardContent, M as Info } from "./index-DF734YkB.js";
import { P as Progress } from "./progress-BEgkdgaS.js";
import { B as Badge } from "./badge-Bax4ZZX3.js";
import { i as invisibleFallbackService } from "./invisible-fallback-service-D6lMsDER.js";
import { A as Activity } from "./activity-TJHkan0R.js";
import { D as Database } from "./database-BIWFOkVP.js";
import { C as Clock } from "./clock-CEwJtTm9.js";
function isVercelProduction() {
  return true;
}
function getAuthHeaderConfig() {
  const isVercel = isVercelProduction();
  return {
    isVercelProduction: isVercel,
    headerName: "X-Auth-Token",
    environment: "Production (Vercel)"
  };
}
function createAuthHeaders(token, additionalHeaders) {
  const config = getAuthHeaderConfig();
  const headers = {
    "Content-Type": "application/json",
    ...additionalHeaders
  };
  if (token) {
    headers[config.headerName] = `Bearer ${token}`;
    console.log(`🔐 Using ${config.headerName} header (${config.environment})`);
  }
  return headers;
}
function logAuthConfig() {
  const config = getAuthHeaderConfig();
  console.log("🔧 Auth Header Configuration:", {
    environment: config.environment,
    isVercelProduction: config.isVercelProduction,
    headerName: config.headerName,
    hostname: window.location.hostname,
    isProd: true,
    mode: "production"
  });
}
var define_process_env_default = {};
const isVercelDeployment = typeof window !== "undefined" ? window.location.hostname.includes("vercel.app") : define_process_env_default.VERCEL === "1";
const PROXY_SECRET = typeof window !== "undefined" ? void 0 : define_process_env_default.VERCEL_PROXY_SECRET || define_process_env_default.NEXT_PUBLIC_VERCEL_PROXY_SECRET;
function addVercelProxyHeaders(headers = {}) {
  const newHeaders = new Headers(headers);
  if (PROXY_SECRET && isVercelDeployment) {
    newHeaders.set("x-vercel-proxy-secret", PROXY_SECRET);
  }
  if (isVercelDeployment) {
    newHeaders.set("x-vercel-proxy", "1");
    newHeaders.set("x-vercel-edge", "true");
  }
  return newHeaders;
}
const API_BASE_URL = "";
class MarketDataClient {
  constructor() {
    this.authToken = null;
    this.baseUrl = `${API_BASE_URL}/api/market-data`;
    this.authToken = localStorage.getItem("alfalyzer-token") || localStorage.getItem("auth-token");
    console.log("🔧 Market Data Client Configuration:", {
      API_BASE_URL,
      baseUrl: this.baseUrl,
      hasAuthToken: !!this.authToken,
      authNotRequired: true,
      // Backend doesn't require auth
      environment: "production",
      isVercel: isVercelDeployment
    });
    logAuthConfig();
  }
  async fetchWithAuth(url, options) {
    let headers = createAuthHeaders(this.authToken, options?.headers);
    if (isVercelDeployment) {
      headers = addVercelProxyHeaders(headers);
      console.log(`🚀 Running on Vercel - proxy headers added`);
    }
    console.log(`🌐 Making request to: ${url}`);
    try {
      const response = await fetch(url, {
        ...options,
        headers,
        mode: "cors",
        credentials: "omit"
      });
      console.log(`📡 Response status: ${response.status}`);
      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = {
            message: errorText
          };
        }
        console.error(`❌ API Error Response:`, {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          url
        });
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      console.log(`✅ API Response received`);
      return data;
    } catch (error) {
      if (error.name === "TypeError" && error.message.includes("Failed to fetch")) {
        console.error(`🚫 Network Error - Cannot reach API at ${url}`);
        console.error(`📍 This might be a CORS issue or the backend is not accessible`);
        console.error(`💡 Check if VITE_API_URL is correctly set to: ${"https://crucial-ivonne-alfalyzer-90666a9e.coolify.app"}`);
        console.error(`🔍 Full error details:`, error);
        const betterError = new Error(`Network error: Unable to connect to backend API at ${this.baseUrl}. Make sure the backend server is running on port 3001.`);
        betterError.name = "NetworkError";
        throw betterError;
      }
      throw error;
    }
  }
  getHeaders() {
    return createAuthHeaders(this.authToken);
  }
  async getQuote(symbol) {
    console.log(`📊 getQuote called for symbol: ${symbol}`);
    try {
      const batchResponse = await retryWithBackoff(() => this.getBatchQuotes([symbol]), 3, 1e3);
      if (batchResponse.quotes && batchResponse.quotes.length > 0) {
        const quote = batchResponse.quotes.find((q) => q.symbol === symbol || q.requestedSymbol === symbol || q.symbol?.replace("-", ".") === symbol || q.symbol?.replace(".", "-") === symbol);
        if (quote) {
          console.log(`✅ Successfully extracted quote for ${symbol} from batch response`);
          return quote;
        }
      }
      throw new Error(`No quote data found for symbol: ${symbol}`);
    } catch (error) {
      console.error(`❌ Error fetching quote for ${symbol}:`, error);
      throw error;
    }
  }
  async getBatchQuotes(symbols) {
    try {
      const params = new URLSearchParams({
        symbols: symbols.join(",")
      });
      console.log(`📡 Fetching batch quotes from: ${this.baseUrl}/quotes/batch?${params}`);
      console.log(`📊 Symbols: ${symbols.join(", ")}`);
      const headers = {};
      if (void 0) ;
      const response = await this.fetchWithAuth(`${this.baseUrl}/quotes/batch?${params}`, {
        method: "GET",
        headers
      });
      console.log(`✅ Successfully fetched batch quotes from backend`);
      if (!response.quotes) {
        console.warn("⚠️ Backend response missing quotes array, wrapping response");
        return {
          quotes: Array.isArray(response) ? response : [],
          errors: {},
          timestamp: Date.now(),
          _timestamp: Date.now() / 1e3
        };
      }
      return response;
    } catch (error) {
      console.error("❌ Error fetching batch quotes:", error);
      console.error(`🔗 API URL was: ${this.baseUrl}`);
      console.error(`📍 Full error details:`, {
        message: error.message,
        baseUrl: this.baseUrl,
        symbols
      });
      if (error.name === "NetworkError" || error.name === "TypeError" && error.message.includes("Failed to fetch")) {
        console.log("🔄 Backend unavailable, using fallback service");
        const fallbackResponse = invisibleFallbackService.getFallbackQuotes(symbols);
        return {
          quotes: fallbackResponse.quotes.map((stock) => ({
            symbol: stock.symbol,
            price: stock.price,
            change: stock.change,
            changePercent: stock.changePercent,
            high: stock.high,
            low: stock.low,
            open: stock.open,
            previousClose: stock.price - stock.change,
            volume: stock.volume,
            marketCap: parseFloat(stock.marketCap.replace(/[^0-9.]/g, "")) * 1e9,
            eps: parseFloat(stock.eps) || void 0,
            pe: parseFloat(stock.peRatio) || void 0,
            provider: "fallback",
            timestamp: Math.floor(Date.now() / 1e3),
            _cached: true,
            _timestamp: Date.now() / 1e3
          })),
          errors: {},
          timestamp: Date.now(),
          _timestamp: Date.now() / 1e3
        };
      }
      return {
        quotes: [],
        errors: {
          general: error.message
        },
        failed: symbols,
        timestamp: Date.now(),
        _timestamp: Date.now() / 1e3
      };
    }
  }
  async searchSymbols(query) {
    const params = new URLSearchParams({
      query
    });
    return this.fetchWithAuth(`${this.baseUrl}/search?${params}`);
  }
  async search(query) {
    try {
      const response = await this.searchSymbols(query);
      return response.results || [];
    } catch (error) {
      console.error("Error searching stocks:", error);
      return [];
    }
  }
  async getMarketOverview() {
    try {
      const response = await this.fetchWithAuth(`${this.baseUrl}/market-overview`);
      return response;
    } catch (error) {
      console.error("Error fetching market overview:", error);
      return null;
    }
  }
  // New method to get cache statistics
  async getCacheStats() {
    return null;
  }
  // New method to get API provider status
  async getProviderStatus() {
    return null;
  }
  async getStatus() {
    return this.fetchWithAuth(`${this.baseUrl}/status`);
  }
  // Update auth token when user logs in
  setAuthToken(token) {
    this.authToken = token;
    localStorage.setItem("alfalyzer-token", token);
    localStorage.setItem("auth-token", token);
  }
  // Clear auth token on logout
  clearAuthToken() {
    this.authToken = null;
    localStorage.removeItem("alfalyzer-token");
    localStorage.removeItem("auth-token");
  }
  // Enable or disable cached endpoints (placeholder for future implementation)
  setUseCachedEndpoints(enabled) {
    console.log(`🗄️ Cached endpoints ${enabled ? "enabled" : "disabled"} (not implemented yet)`);
  }
  // Test connectivity without authentication
  async testConnectivity() {
    try {
      console.log("🔍 Testing market data API connectivity...");
      console.log(`📡 Testing endpoint: ${this.baseUrl}/health`);
      let headers = {
        "Content-Type": "application/json"
        // Intentionally not sending auth token
      };
      if (isVercelDeployment) {
        headers = addVercelProxyHeaders(headers);
        console.log(`🚀 Running on Vercel - proxy headers added for health check`);
      }
      const response = await fetch(`${this.baseUrl}/health`, {
        method: "GET",
        headers,
        mode: "cors",
        credentials: "omit"
      });
      const data = await response.json();
      if (response.ok) {
        console.log("✅ API connectivity test successful");
        return {
          success: true,
          message: "API is accessible without authentication",
          details: data
        };
      } else {
        console.warn("⚠️ API returned non-OK status:", response.status);
        return {
          success: false,
          message: `API returned status ${response.status}`,
          details: data
        };
      }
    } catch (error) {
      console.error("❌ API connectivity test failed:", error);
      return {
        success: false,
        message: error.message || "Failed to connect to API",
        details: {
          error: error.toString()
        }
      };
    }
  }
}
const marketDataClient = new MarketDataClient();
function CacheMonitor() {
  const [cacheStats, setCacheStats] = reactExports.useState(null);
  const [providers, setProviders] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(true);
  const [error, setError] = reactExports.useState(null);
  const [refreshing, setRefreshing] = reactExports.useState(false);
  const fetchData = async () => {
    try {
      setRefreshing(true);
      const [statsResponse, providersResponse] = await Promise.all([marketDataClient.getCacheStats(), marketDataClient.getProviderStatus()]);
      if (statsResponse) {
        setCacheStats(statsResponse);
      }
      if (providersResponse?.providers) {
        setProviders(providersResponse.providers);
      }
      setError(null);
    } catch (err) {
      console.error("Error fetching cache data:", err);
      setError("Failed to fetch cache statistics");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  reactExports.useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3e4);
    return () => clearInterval(interval);
  }, []);
  const formatTime = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h`;
  };
  const getProviderStatusColor = (provider) => {
    if (!provider.isActive) return "bg-gray-500";
    if (provider.lastError && provider.lastErrorAt) {
      const errorTime = new Date(provider.lastErrorAt).getTime();
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1e3;
      if (errorTime > fiveMinutesAgo) return "bg-yellow-500";
    }
    return "bg-green-500";
  };
  if (loading && !refreshing) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
      className: "container mx-auto p-6",
      children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
        className: "flex items-center justify-center h-64",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
          className: "text-muted-foreground",
          children: "Loading cache statistics..."
        })
      })
    });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
    className: "container mx-auto p-6 space-y-6",
    children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
      className: "flex items-center justify-between",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h1", {
        className: "text-3xl font-bold",
        children: "Cache Monitor"
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, {
        variant: refreshing ? "secondary" : "outline",
        className: "gap-2",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Activity, {
          className: `h-3 w-3 ${refreshing ? "animate-pulse" : ""}`
        }), refreshing ? "Refreshing..." : "Live"]
      })]
    }), error && /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, {
      className: "bg-red-50 border-red-200",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, {
        className: "h-4 w-4 text-red-600"
      }), /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDescription, {
        className: "text-red-800",
        children: error
      })]
    }), cacheStats && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, {
      children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
            className: "pb-2",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, {
              className: "text-sm font-medium text-muted-foreground",
              children: "Total Assets"
            })
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
              className: "text-2xl font-bold",
              children: cacheStats.total_assets.toLocaleString()
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
              className: "text-xs text-muted-foreground mt-1",
              children: "Tracked symbols"
            })]
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
            className: "pb-2",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, {
              className: "text-sm font-medium text-muted-foreground",
              children: "Cache Hit Rate"
            })
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "text-2xl font-bold",
              children: [cacheStats.cache_hit_rate.toFixed(1), "%"]
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(Progress, {
              value: cacheStats.cache_hit_rate,
              className: "mt-2 h-2"
            })]
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
            className: "pb-2",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, {
              className: "text-sm font-medium text-muted-foreground",
              children: "Fresh Quotes"
            })
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "flex items-baseline gap-2",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                className: "text-2xl font-bold text-green-600",
                children: cacheStats.fresh_quotes
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "text-sm text-muted-foreground",
                children: ["/ ", cacheStats.fresh_quotes + cacheStats.stale_quotes]
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
              className: "text-xs text-muted-foreground mt-1",
              children: "Updated in last minute"
            })]
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
            className: "pb-2",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, {
              className: "text-sm font-medium text-muted-foreground",
              children: "API Calls (1h)"
            })
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
              className: "text-2xl font-bold",
              children: cacheStats.api_calls_last_hour
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
              className: "text-xs text-muted-foreground mt-1",
              children: "External API requests"
            })]
          })]
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, {
            className: "text-lg flex items-center gap-2",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Database, {
              className: "h-5 w-5"
            }), "Cache Status"]
          })
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
          className: "space-y-4",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "grid grid-cols-1 md:grid-cols-2 gap-4",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "flex justify-between items-center mb-2",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                  className: "text-sm font-medium",
                  children: "Cache Freshness"
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
                  className: "text-sm text-muted-foreground",
                  children: [(cacheStats.fresh_quotes / (cacheStats.fresh_quotes + cacheStats.stale_quotes) * 100).toFixed(1), "%"]
                })]
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(Progress, {
                value: cacheStats.fresh_quotes / (cacheStats.fresh_quotes + cacheStats.stale_quotes) * 100,
                className: "h-2"
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "flex justify-between items-center mb-2",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                  className: "text-sm font-medium",
                  children: "Average Age"
                }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                  className: "text-sm text-muted-foreground",
                  children: formatTime(cacheStats.avg_age_seconds)
                })]
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "flex items-center gap-2",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Clock, {
                  className: "h-4 w-4 text-muted-foreground"
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
                  className: "text-xs text-muted-foreground",
                  children: ["Last update: ", new Date(cacheStats.most_recent_update).toLocaleTimeString()]
                })]
              })]
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "pt-2",
            children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "flex items-center gap-2 text-sm text-muted-foreground",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Info, {
                className: "h-4 w-4"
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
                children: [cacheStats.total_prices.toLocaleString(), " price records stored •", cacheStats.providers_active, " active providers"]
              })]
            })
          })]
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, {
            className: "text-lg",
            children: "API Providers"
          })
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
          children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "space-y-3",
            children: providers.map((provider) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "flex items-center justify-between p-3 rounded-lg border",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "flex items-center gap-3",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                  className: `w-2 h-2 rounded-full ${getProviderStatusColor(provider)}`
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                    className: "font-medium capitalize",
                    children: provider.name
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "text-xs text-muted-foreground",
                    children: ["Priority: ", provider.priority]
                  })]
                })]
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "flex items-center gap-4",
                children: [provider.quotaLimit && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "text-sm",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                    className: "font-medium",
                    children: provider.quotaUsed
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
                    className: "text-muted-foreground",
                    children: [" / ", provider.quotaLimit]
                  })]
                }), provider.avgResponseTime && /* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, {
                  variant: "outline",
                  className: "text-xs",
                  children: [provider.avgResponseTime, "ms"]
                }), provider.successRate && /* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, {
                  variant: provider.successRate > 95 ? "default" : "secondary",
                  className: "text-xs",
                  children: [provider.successRate.toFixed(1), "%"]
                }), !provider.isActive && /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, {
                  variant: "destructive",
                  className: "text-xs",
                  children: "Inactive"
                })]
              })]
            }, provider.name))
          })
        })]
      })]
    })]
  });
}
export {
  CacheMonitor
};
