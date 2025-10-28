import { U as toast, r as reactExports, j as jsxRuntimeExports, C as Card, a as CardHeader, b as CardTitle, M as Info, d as CardDescription, c as CardContent, B as Button, l as CircleCheckBig, K as TriangleAlert, v as CircleAlert, aV as logger } from "./index-DF734YkB.js";
import { L as LoaderCircle } from "./loader-circle-Cj-w8NSX.js";
const showSuccess = (message, options) => {
  return toast({
    title: options?.title || "Success",
    description: message,
    duration: options?.duration || 3e3,
    variant: "default",
    action: options?.action
  });
};
const showError = (error, options) => {
  const errorMessage = typeof error === "string" ? error : error.message;
  return toast({
    title: options?.title || "Error",
    description: errorMessage,
    duration: options?.duration || 5e3,
    variant: "destructive",
    action: options?.action
  });
};
const showWarning = (message, options) => {
  return toast({
    title: options?.title || "Warning",
    description: message,
    duration: options?.duration || 4e3,
    variant: "default",
    action: options?.action,
    className: "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20"
  });
};
const showInfo = (message, options) => {
  return toast({
    title: options?.title || "Info",
    description: message,
    duration: options?.duration || 3e3,
    variant: "default",
    action: options?.action
  });
};
const showLoading = (message = "Loading...") => {
  const {
    id,
    dismiss
  } = toast({
    title: "Loading",
    description: message,
    duration: Infinity,
    // Don't auto-dismiss
    variant: "default"
  });
  return {
    id,
    dismiss,
    update: (newMessage) => {
      toast({
        id,
        title: "Loading",
        description: newMessage,
        duration: Infinity,
        variant: "default"
      });
    }
  };
};
async function showPromise(promise, messages) {
  const loadingToast = showLoading(messages.loading || "Processing...");
  try {
    const result = await promise;
    loadingToast.dismiss();
    const successMessage = typeof messages.success === "function" ? messages.success(result) : messages.success || "Operation completed successfully";
    showSuccess(successMessage);
    return result;
  } catch (error) {
    loadingToast.dismiss();
    const errorMessage = typeof messages.error === "function" ? messages.error(error) : messages.error || error.message || "Operation failed";
    showError(errorMessage);
    throw error;
  }
}
const stockToast = {
  addedToWatchlist: (symbol) => showSuccess(`${symbol} added to watchlist`),
  removedFromWatchlist: (symbol) => showSuccess(`${symbol} removed from watchlist`),
  priceAlert: (symbol, price) => showInfo(`${symbol} has reached $${price.toFixed(2)}`, {
    title: "Price Alert",
    duration: 1e4
  }),
  portfolioUpdate: (action, symbol, shares) => showSuccess(`Successfully ${action} ${shares} shares of ${symbol}`),
  dataRefreshed: () => showSuccess("Market data refreshed", {
    duration: 2e3
  }),
  connectionLost: () => showError("Connection to market data lost. Retrying...", {
    title: "Connection Error",
    duration: 5e3
  }),
  connectionRestored: () => showSuccess("Connection restored", {
    duration: 2e3
  })
};
const authToast = {
  loginSuccess: (userName) => showSuccess(userName ? `Welcome back, ${userName}!` : "Successfully logged in"),
  loginError: (error) => showError(error || "Login failed. Please check your credentials."),
  logoutSuccess: () => showSuccess("Successfully logged out"),
  sessionExpired: () => showWarning("Your session has expired. Please log in again.", {
    duration: 5e3
  }),
  registerSuccess: () => showSuccess("Account created successfully! Please check your email to verify."),
  registerError: (error) => showError(error || "Registration failed. Please try again."),
  unauthorized: () => showError("You don't have permission to access this resource")
};
const DEFAULT_OPTIONS = {
  maxRetries: 3,
  initialDelay: 1e3,
  // 1 second
  maxDelay: 3e4,
  // 30 seconds
  backoffFactor: 2,
  retryCondition: (error) => {
    if (error.name === "NetworkError" || error.name === "TypeError") {
      return true;
    }
    if (error.status >= 500 && error.status < 600) {
      return true;
    }
    const retryableMessages = ["network", "timeout", "fetch", "ECONNRESET", "ETIMEDOUT", "ENOTFOUND", "ECONNREFUSED"];
    const errorMessage = error.message?.toLowerCase() || "";
    return retryableMessages.some((msg) => errorMessage.includes(msg));
  },
  onRetry: (error, attempt, delay) => {
    console.warn(`[FetchWithRetry] Retry attempt ${attempt} after ${delay}ms:`, error.message);
  }
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const calculateDelay = (attempt, initialDelay, maxDelay, backoffFactor) => {
  const exponentialDelay = initialDelay * Math.pow(backoffFactor, attempt - 1);
  const jitteredDelay = exponentialDelay * (0.5 + Math.random() * 0.5);
  return Math.min(jitteredDelay, maxDelay);
};
async function fetchWithRetry(url, init, options) {
  const config = {
    ...DEFAULT_OPTIONS,
    ...options
  };
  let lastError;
  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3e4);
      const response = await fetch(url, {
        ...init,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
        error.status = response.status;
        error.response = response;
        try {
          const errorData = await response.text();
          error.message = errorData || error.message;
        } catch {
        }
        throw error;
      }
      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        return await response.json();
      } else {
        return await response.text();
      }
    } catch (error) {
      lastError = error;
      if (attempt === config.maxRetries || !config.retryCondition(error, attempt)) {
        throw error;
      }
      const delay = calculateDelay(attempt, config.initialDelay, config.maxDelay, config.backoffFactor);
      config.onRetry(error, attempt, delay);
      await sleep(delay);
    }
  }
  throw lastError;
}
class ResilientApiClient {
  constructor(baseUrl, defaultOptions) {
    this.baseUrl = baseUrl;
    this.defaultOptions = defaultOptions || {};
  }
  getUrl(endpoint) {
    const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    return `${this.baseUrl}${normalizedEndpoint}`;
  }
  async get(endpoint, options) {
    const {
      retry,
      ...fetchOptions
    } = options || {};
    return fetchWithRetry(this.getUrl(endpoint), {
      ...fetchOptions,
      method: "GET"
    }, {
      ...this.defaultOptions,
      ...retry
    });
  }
  async post(endpoint, data, options) {
    const {
      retry,
      ...fetchOptions
    } = options || {};
    return fetchWithRetry(this.getUrl(endpoint), {
      ...fetchOptions,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...fetchOptions.headers
      },
      body: data ? JSON.stringify(data) : void 0
    }, {
      ...this.defaultOptions,
      ...retry
    });
  }
  async put(endpoint, data, options) {
    const {
      retry,
      ...fetchOptions
    } = options || {};
    return fetchWithRetry(this.getUrl(endpoint), {
      ...fetchOptions,
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...fetchOptions.headers
      },
      body: data ? JSON.stringify(data) : void 0
    }, {
      ...this.defaultOptions,
      ...retry
    });
  }
  async delete(endpoint, options) {
    const {
      retry,
      ...fetchOptions
    } = options || {};
    return fetchWithRetry(this.getUrl(endpoint), {
      ...fetchOptions,
      method: "DELETE"
    }, {
      ...this.defaultOptions,
      ...retry
    });
  }
}
const resilientApi = new ResilientApiClient("/api", {
  maxRetries: 3,
  initialDelay: 1e3,
  onRetry: (error, attempt, delay) => {
    console.log(`[API Retry] Attempt ${attempt} after ${delay}ms - Error: ${error.message}`);
  }
});
function TestErrorHandling() {
  const [isLoading, setIsLoading] = reactExports.useState(false);
  const [testResults, setTestResults] = reactExports.useState({});
  const testErrorBoundary = () => {
    throw new Error("Test error boundary - This error should be caught!");
  };
  const testToastNotifications = async () => {
    showSuccess("Success toast test!");
    await new Promise((resolve) => setTimeout(resolve, 500));
    showError("Error toast test!");
    await new Promise((resolve) => setTimeout(resolve, 500));
    showWarning("Warning toast test!");
    await new Promise((resolve) => setTimeout(resolve, 500));
    showInfo("Info toast test!");
    await new Promise((resolve) => setTimeout(resolve, 500));
    stockToast.addedToWatchlist("AAPL");
    await new Promise((resolve) => setTimeout(resolve, 500));
    stockToast.priceAlert("TSLA", 850.5);
    await new Promise((resolve) => setTimeout(resolve, 500));
    authToast.loginSuccess("Test User");
    setTestResults((prev) => ({
      ...prev,
      toast: true
    }));
  };
  const testPromiseToast = async () => {
    const fakeApiCall = () => new Promise((resolve) => {
      setTimeout(() => resolve("Data loaded successfully!"), 2e3);
    });
    await showPromise(fakeApiCall(), {
      loading: "Loading data...",
      success: (data) => `Success: ${data}`,
      error: "Failed to load data"
    });
    setTestResults((prev) => ({
      ...prev,
      promiseToast: true
    }));
  };
  const testRetryLogic = async () => {
    setIsLoading(true);
    try {
      await fetchWithRetry("/api/test/fail", {}, {
        maxRetries: 3,
        initialDelay: 500,
        onRetry: (error, attempt, delay) => {
          showWarning(`Retry attempt ${attempt} after ${delay}ms`);
        }
      });
    } catch (error) {
      showError(`Expected failure after retries: ${error.message}`);
      setTestResults((prev) => ({
        ...prev,
        retry: true
      }));
    } finally {
      setIsLoading(false);
    }
  };
  const testSuccessfulRetry = async () => {
    setIsLoading(true);
    try {
      const result = await resilientApi.get("/api/health");
      showSuccess("API call successful with retry logic!");
      console.log("Health check result:", result);
      setTestResults((prev) => ({
        ...prev,
        successfulRetry: true
      }));
    } catch (error) {
      showError(`API call failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  const testLogger = () => {
    logger.debug("Debug log test", {
      test: true,
      timestamp: Date.now()
    });
    logger.info("Info log test", {
      component: "TestErrorHandling"
    });
    logger.warn("Warning log test", {
      warning: "This is a test warning"
    });
    logger.error("Error log test", {
      error: "This is a test error",
      stack: new Error().stack
    });
    logger.logPerformance("test-operation", 123.45, {
      operation: "test"
    });
    logger.logAuth("login", true, {
      userId: "test-user"
    });
    logger.logAuth("unauthorized", false, {
      reason: "Invalid token"
    });
    const correlationId = logger.generateCorrelationId();
    logger.logRequest("GET", "/api/test", void 0, {
      "x-api-key": "test-key"
    });
    logger.logResponse(correlationId, 200, "/api/test", {
      success: true
    }, 150);
    showSuccess("Check console for log outputs!");
    setTestResults((prev) => ({
      ...prev,
      logger: true
    }));
  };
  const testChunkError = () => {
    const error = new Error("Failed to fetch dynamically imported module");
    error.message = "Loading chunk 123 failed";
    throw error;
  };
  const testNetworkError = () => {
    const error = new Error("Network request failed");
    error.name = "NetworkError";
    throw error;
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
    className: "container mx-auto py-8 space-y-6",
    children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
      className: "text-center mb-8",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h1", {
        className: "text-3xl font-bold mb-2",
        children: "Error Handling Test Suite"
      }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
        className: "text-muted-foreground",
        children: "Test all error handling features implemented in Phase 3"
      })]
    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
      className: "grid grid-cols-1 md:grid-cols-2 gap-4",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, {
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, {
            className: "flex items-center gap-2",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Info, {
              className: "h-5 w-5"
            }), "Toast Notifications"]
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardDescription, {
            children: "Test various toast notification types"
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
          className: "space-y-2",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
            onClick: testToastNotifications,
            className: "w-full",
            children: "Test All Toast Types"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
            onClick: testPromiseToast,
            variant: "secondary",
            className: "w-full",
            children: "Test Promise Toast"
          }), testResults.toast && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex items-center gap-2 text-green-600",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheckBig, {
              className: "h-4 w-4"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
              children: "Toast notifications working!"
            })]
          })]
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, {
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, {
            className: "flex items-center gap-2",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, {
              className: "h-5 w-5"
            }), "API Retry Logic"]
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardDescription, {
            children: "Test exponential backoff retry"
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
          className: "space-y-2",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
            onClick: testRetryLogic,
            disabled: isLoading,
            className: "w-full",
            children: isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, {
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, {
                className: "mr-2 h-4 w-4 animate-spin"
              }), "Testing Retry..."]
            }) : "Test Failed API (3 Retries)"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
            onClick: testSuccessfulRetry,
            disabled: isLoading,
            variant: "secondary",
            className: "w-full",
            children: "Test Successful API Call"
          }), testResults.retry && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex items-center gap-2 text-green-600",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheckBig, {
              className: "h-4 w-4"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
              children: "Retry logic working!"
            })]
          })]
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, {
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, {
            className: "flex items-center gap-2",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, {
              className: "h-5 w-5"
            }), "Error Boundary"]
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardDescription, {
            children: "Test React error boundary"
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
          className: "space-y-2",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
            onClick: testErrorBoundary,
            variant: "destructive",
            className: "w-full",
            children: "Trigger Component Error"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
            onClick: testChunkError,
            variant: "destructive",
            className: "w-full",
            children: "Trigger Chunk Error"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
            onClick: testNetworkError,
            variant: "destructive",
            className: "w-full",
            children: "Trigger Network Error"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
            className: "text-xs text-muted-foreground",
            children: "These will crash the component and show error UI"
          })]
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, {
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, {
            className: "flex items-center gap-2",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Info, {
              className: "h-5 w-5"
            }), "Comprehensive Logging"]
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardDescription, {
            children: "Test logging system"
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
          className: "space-y-2",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
            onClick: testLogger,
            className: "w-full",
            children: "Test All Log Levels"
          }), testResults.logger && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex items-center gap-2 text-green-600",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheckBig, {
              className: "h-4 w-4"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
              children: "Logger working! Check console"
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
            className: "text-xs text-muted-foreground",
            children: "Open browser console to see log outputs"
          })]
        })]
      })]
    }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
      children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, {
          children: "Test Summary"
        })
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "space-y-2",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex items-center gap-2",
            children: [testResults.toast ? /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheckBig, {
              className: "h-4 w-4 text-green-600"
            }) : /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, {
              className: "h-4 w-4 text-gray-400"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
              children: "Toast Notifications"
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex items-center gap-2",
            children: [testResults.promiseToast ? /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheckBig, {
              className: "h-4 w-4 text-green-600"
            }) : /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, {
              className: "h-4 w-4 text-gray-400"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
              children: "Promise Toast"
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex items-center gap-2",
            children: [testResults.retry ? /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheckBig, {
              className: "h-4 w-4 text-green-600"
            }) : /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, {
              className: "h-4 w-4 text-gray-400"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
              children: "API Retry Logic"
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex items-center gap-2",
            children: [testResults.successfulRetry ? /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheckBig, {
              className: "h-4 w-4 text-green-600"
            }) : /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, {
              className: "h-4 w-4 text-gray-400"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
              children: "Successful API with Retry"
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex items-center gap-2",
            children: [testResults.logger ? /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheckBig, {
              className: "h-4 w-4 text-green-600"
            }) : /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, {
              className: "h-4 w-4 text-gray-400"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
              children: "Comprehensive Logging"
            })]
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "mt-4 p-4 bg-muted rounded-lg",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx("p", {
            className: "text-sm font-medium mb-2",
            children: "Phase 3 Implementation Status:"
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("ul", {
            className: "text-sm space-y-1 text-muted-foreground",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("li", {
              children: "✅ Error Boundaries in React"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("li", {
              children: "✅ API Retry Logic with Exponential Backoff"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("li", {
              children: "✅ Toast Notifications for User Feedback"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("li", {
              children: "✅ Comprehensive Error Logging"
            })]
          })]
        })]
      })]
    })]
  });
}
export {
  TestErrorHandling as default
};
