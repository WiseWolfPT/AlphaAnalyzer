import { e as createLucideIcon, r as reactExports, j as jsxRuntimeExports, R as RefreshCw, C as Card, c as CardContent, B as Button, a as CardHeader, b as CardTitle, K as TriangleAlert, l as CircleCheckBig } from "./index-DF734YkB.js";
import { B as Badge } from "./badge-Bax4ZZX3.js";
import { C as CircleX } from "./circle-x-Bp-yOAsa.js";
import { D as Database } from "./database-BIWFOkVP.js";
import { Z as Zap } from "./zap-_XnM8rww.js";
import { A as Activity } from "./activity-TJHkan0R.js";
import { f as formatDistanceToNow } from "./formatDistanceToNow-Cp_4CwS9.js";
import "./en-US-CFe7Dxf-.js";
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Server = createLucideIcon("Server", [
  ["rect", { width: "20", height: "8", x: "2", y: "2", rx: "2", ry: "2", key: "ngkwjq" }],
  ["rect", { width: "20", height: "8", x: "2", y: "14", rx: "2", ry: "2", key: "iecqi9" }],
  ["line", { x1: "6", x2: "6.01", y1: "6", y2: "6", key: "16zg32" }],
  ["line", { x1: "6", x2: "6.01", y1: "18", y2: "18", key: "nzw8ys" }]
]);
function HealthDashboard() {
  const [health, setHealth] = reactExports.useState(null);
  const [loading, setLoading] = reactExports.useState(true);
  const [error, setError] = reactExports.useState(null);
  const [lastUpdate, setLastUpdate] = reactExports.useState(/* @__PURE__ */ new Date());
  const fetchHealth = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/health");
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }
      const data = await response.json();
      setHealth(data);
      setLastUpdate(/* @__PURE__ */ new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch health data");
    } finally {
      setLoading(false);
    }
  };
  reactExports.useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 3e4);
    return () => clearInterval(interval);
  }, []);
  const getStatusColor = (status) => {
    switch (status) {
      case "healthy":
        return "text-green-500";
      case "degraded":
        return "text-yellow-500";
      case "unhealthy":
        return "text-red-500";
      default:
        return "text-gray-500";
    }
  };
  const getStatusIcon = (status) => {
    switch (status) {
      case "healthy":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheckBig, {
          className: "h-5 w-5 text-green-500"
        });
      case "degraded":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, {
          className: "h-5 w-5 text-yellow-500"
        });
      case "unhealthy":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(CircleX, {
          className: "h-5 w-5 text-red-500"
        });
      default:
        return /* @__PURE__ */ jsxRuntimeExports.jsx(Activity, {
          className: "h-5 w-5 text-gray-500"
        });
    }
  };
  const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor(seconds % 86400 / 3600);
    const minutes = Math.floor(seconds % 3600 / 60);
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    return parts.join(" ") || "< 1m";
  };
  if (loading && !health) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
      className: "flex items-center justify-center min-h-[400px]",
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, {
        className: "h-8 w-8 animate-spin text-gray-400"
      })
    });
  }
  if (error && !health) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Card, {
      className: "bg-red-950/20 border-red-900",
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
        className: "pt-6",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "flex items-center gap-3",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CircleX, {
            className: "h-6 w-6 text-red-500"
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("p", {
              className: "font-semibold text-red-400",
              children: "Health Check Failed"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
              className: "text-sm text-gray-400",
              children: error
            })]
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
          onClick: fetchHealth,
          variant: "outline",
          size: "sm",
          className: "mt-4",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, {
            className: "h-4 w-4 mr-2"
          }), "Retry"]
        })]
      })
    });
  }
  if (!health) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
    className: "space-y-6",
    children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
      className: "glass-card",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "flex justify-between items-center",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex items-center gap-3",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, {
              children: "System Health"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, {
              variant: health.status === "healthy" ? "default" : health.status === "degraded" ? "secondary" : "destructive",
              className: `${getStatusColor(health.status)} bg-opacity-20`,
              children: health.status.toUpperCase()
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
            onClick: fetchHealth,
            variant: "outline",
            size: "sm",
            disabled: loading,
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, {
              className: `h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`
            }), "Refresh"]
          })]
        })
      }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "grid grid-cols-2 md:grid-cols-4 gap-4",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("p", {
              className: "text-sm text-gray-400",
              children: "Environment"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
              className: "font-semibold",
              children: health.environment
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("p", {
              className: "text-sm text-gray-400",
              children: "Version"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
              className: "font-semibold",
              children: health.version
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("p", {
              className: "text-sm text-gray-400",
              children: "Uptime"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
              className: "font-semibold",
              children: formatUptime(health.uptime)
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("p", {
              className: "text-sm text-gray-400",
              children: "Last Update"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
              className: "font-semibold",
              children: formatDistanceToNow(lastUpdate, {
                addSuffix: true
              })
            })]
          })]
        })
      })]
    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
      className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
        className: "glass-card hover:scale-105 transition-transform",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
          className: "pb-3",
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex items-center justify-between",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "flex items-center gap-2",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Server, {
                className: "h-5 w-5 text-blue-400"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, {
                className: "text-base",
                children: "Server"
              })]
            }), getStatusIcon(health.checks.server.status)]
          })
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
          children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
            className: "text-sm text-gray-400",
            children: health.checks.server.message || "Server is running"
          })
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
        className: "glass-card hover:scale-105 transition-transform",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
          className: "pb-3",
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex items-center justify-between",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "flex items-center gap-2",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Database, {
                className: "h-5 w-5 text-green-400"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, {
                className: "text-base",
                children: "Database"
              })]
            }), getStatusIcon(health.checks.database.status)]
          })
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx("p", {
            className: "text-sm text-gray-400",
            children: health.checks.database.message || "Database connection status"
          }), health.checks.database.details?.url && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
            className: "text-xs text-gray-500 mt-1",
            children: ["Project: ", health.checks.database.details.url]
          })]
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
        className: "glass-card hover:scale-105 transition-transform",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
          className: "pb-3",
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex items-center justify-between",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "flex items-center gap-2",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Zap, {
                className: "h-5 w-5 text-yellow-400"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, {
                className: "text-base",
                children: "Redis Cache"
              })]
            }), getStatusIcon(health.checks.redis.status)]
          })
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx("p", {
            className: "text-sm text-gray-400",
            children: health.checks.redis.message || "Cache status"
          }), health.checks.redis.details?.memoryUsage && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
            className: "text-xs text-gray-500 mt-1",
            children: ["Memory: ", health.checks.redis.details.memoryUsage]
          })]
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
        className: "glass-card hover:scale-105 transition-transform",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
          className: "pb-3",
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex items-center justify-between",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "flex items-center gap-2",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Activity, {
                className: "h-5 w-5 text-purple-400"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, {
                className: "text-base",
                children: "Price Worker"
              })]
            }), getStatusIcon(health.checks.worker.status)]
          })
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx("p", {
            className: "text-sm text-gray-400",
            children: health.checks.worker.message || "Worker status"
          }), health.checks.worker.details?.stocksMonitored && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
            className: "text-xs text-gray-500 mt-1",
            children: ["Monitoring: ", health.checks.worker.details.stocksMonitored, " stocks"]
          })]
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
        className: "glass-card hover:scale-105 transition-transform",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
          className: "pb-3",
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex items-center justify-between",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "flex items-center gap-2",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Zap, {
                className: "h-5 w-5 text-cyan-400"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, {
                className: "text-base",
                children: "FMP API"
              })]
            }), getStatusIcon(health.checks.fmp_api.status)]
          })
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx("p", {
            className: "text-sm text-gray-400",
            children: health.checks.fmp_api.message || "API status"
          }), health.checks.fmp_api.details?.endpoint && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
            className: "text-xs text-gray-500 mt-1",
            children: ["Endpoint: ", health.checks.fmp_api.details.endpoint]
          })]
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
        className: "glass-card hover:scale-105 transition-transform",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
          className: "pb-3",
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex items-center justify-between",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "flex items-center gap-2",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Server, {
                className: "h-5 w-5 text-orange-400"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, {
                className: "text-base",
                children: "Memory"
              })]
            }), getStatusIcon(health.checks.memory.status)]
          })
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx("p", {
            className: "text-sm text-gray-400",
            children: health.checks.memory.message || "Memory usage"
          }), health.checks.memory.details?.heapUsagePercent && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
            className: "text-xs text-gray-500 mt-1",
            children: ["Heap: ", health.checks.memory.details.heapUsagePercent]
          })]
        })]
      })]
    }), health.checks.performance && /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
      className: "glass-card",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, {
          className: "text-lg",
          children: "Performance Metrics"
        })
      }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "grid grid-cols-2 md:grid-cols-4 gap-4",
          children: [health.checks.performance.details?.avgResponseTime && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("p", {
              className: "text-sm text-gray-400",
              children: "Avg Response Time"
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
              className: "font-semibold",
              children: [health.checks.performance.details.avgResponseTime.toFixed(0), "ms"]
            })]
          }), health.checks.performance.details?.requestCount !== void 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("p", {
              className: "text-sm text-gray-400",
              children: "Request Count"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
              className: "font-semibold",
              children: health.checks.performance.details.requestCount.toLocaleString()
            })]
          }), health.checks.performance.details?.errorRate !== void 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("p", {
              className: "text-sm text-gray-400",
              children: "Error Rate"
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
              className: "font-semibold",
              children: [(health.checks.performance.details.errorRate * 100).toFixed(2), "%"]
            })]
          }), health.checks.performance.details?.cacheHitRate !== void 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("p", {
              className: "text-sm text-gray-400",
              children: "Cache Hit Rate"
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
              className: "font-semibold",
              children: [(health.checks.performance.details.cacheHitRate * 100).toFixed(1), "%"]
            })]
          })]
        })
      })]
    })]
  });
}
function HealthMonitorPage() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
    className: "container mx-auto px-4 py-8",
    children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
      className: "mb-8",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "flex items-center gap-3 mb-2",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Activity, {
          className: "h-8 w-8 text-green-400"
        }), /* @__PURE__ */ jsxRuntimeExports.jsx("h1", {
          className: "text-3xl font-bold",
          children: "System Health Monitor"
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
        className: "text-gray-400",
        children: "Real-time monitoring of system components and performance metrics"
      })]
    }), /* @__PURE__ */ jsxRuntimeExports.jsx(HealthDashboard, {})]
  });
}
export {
  HealthMonitorPage as default
};
