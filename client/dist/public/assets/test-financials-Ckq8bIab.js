import { r as reactExports, j as jsxRuntimeExports, B as Button, C as Card, o as Alert, aW as AlertTitle, p as AlertDescription, v as CircleAlert, n as TrendingUp } from "./index-DF734YkB.js";
import { f as useDirectFMPFinancials } from "./use-cache-data-WpPFNsyq.js";
import { RevenueChart } from "./revenue-chart-CGW91fJD.js";
import { EbitdaChart } from "./ebitda-chart-ByfVTRKA.js";
import { NetIncomeChart } from "./net-income-chart-DJ__rMs2.js";
import { A as Activity } from "./activity-TJHkan0R.js";
import { D as DollarSign } from "./dollar-sign-BDD_kA4E.js";
import "./useQuery-C9HFImIm.js";
import "./lightweight-chart-CPbISesF.js";
import "./chart-container-CPbaEAKc.js";
import "./GraphicalItemClipPath-C5BaDaiW.js";
import "./barSelectors-C4PIc_FS.js";
function TestFinancials() {
  const [testSymbol, setTestSymbol] = reactExports.useState("AAPL");
  const [period, setPeriod] = reactExports.useState("quarterly");
  const {
    data: financials,
    isLoading,
    error,
    refetch
  } = useDirectFMPFinancials(testSymbol, period);
  const handleTestStock = (symbol) => {
    setTestSymbol(symbol);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
    className: "min-h-screen bg-background p-8",
    children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
      className: "max-w-7xl mx-auto space-y-6",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "flex items-center justify-between",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h1", {
            className: "text-3xl font-bold",
            children: "Financial Charts Test - Phase 2, Day 8"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
            className: "text-muted-foreground mt-2",
            children: "Testing direct FMP financial data connection for charts"
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "flex gap-2",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
            variant: period === "quarterly" ? "default" : "outline",
            onClick: () => setPeriod("quarterly"),
            children: "Quarterly"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
            variant: period === "annual" ? "default" : "outline",
            onClick: () => setPeriod("annual"),
            children: "Annual"
          })]
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
        className: "p-6",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h2", {
          className: "text-lg font-semibold mb-4",
          children: "Test Stocks"
        }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
          className: "flex gap-2 flex-wrap",
          children: ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "META", "NVDA"].map((symbol) => /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
            variant: testSymbol === symbol ? "default" : "outline",
            onClick: () => handleTestStock(symbol),
            size: "sm",
            children: symbol
          }, symbol))
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "mt-4 flex items-center gap-4",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx("input", {
            type: "text",
            value: testSymbol,
            onChange: (e) => setTestSymbol(e.target.value.toUpperCase()),
            placeholder: "Enter symbol...",
            className: "px-3 py-2 border rounded-md bg-background"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
            onClick: () => refetch(),
            children: "Refresh Data"
          })]
        })]
      }), financials && /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, {
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Activity, {
          className: "h-4 w-4"
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(AlertTitle, {
          children: "FMP Data Received"
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDescription, {
          children: ["Symbol: ", financials.symbol, " | Period: ", financials.period, " | Provider: ", financials.provider, " | Data Points: Revenue (", financials.revenue?.length || 0, "), EBITDA (", financials.ebitda?.length || 0, "), Net Income (", financials.netIncome?.length || 0, ")"]
        })]
      }), error && /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, {
        variant: "destructive",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, {
          className: "h-4 w-4"
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(AlertTitle, {
          children: "Error"
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDescription, {
          children: error.message || "Failed to fetch financial data"
        })]
      }), isLoading && /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
        className: "grid grid-cols-1 md:grid-cols-3 gap-6",
        children: [1, 2, 3].map((i) => /* @__PURE__ */ jsxRuntimeExports.jsx(Card, {
          className: "h-[400px] animate-pulse",
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "p-6",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
              className: "h-4 bg-muted rounded w-1/2 mb-4"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
              className: "h-8 bg-muted rounded w-3/4 mb-2"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
              className: "h-64 bg-muted rounded mt-4"
            })]
          })
        }, i))
      }), financials && !isLoading && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "grid grid-cols-1 md:grid-cols-3 gap-6",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
          className: "p-6",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex items-center gap-2 mb-4",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(DollarSign, {
              className: "h-5 w-5 text-amber-500"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("h3", {
              className: "font-semibold",
              children: "Revenue"
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(RevenueChart, {
            data: financials.revenue || []
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
          className: "p-6",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex items-center gap-2 mb-4",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, {
              className: "h-5 w-5 text-green-500"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("h3", {
              className: "font-semibold",
              children: "EBITDA"
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(EbitdaChart, {
            data: financials.ebitda || []
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
          className: "p-6",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex items-center gap-2 mb-4",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Activity, {
              className: "h-5 w-5 text-blue-500"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("h3", {
              className: "font-semibold",
              children: "Net Income"
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(NetIncomeChart, {
            data: financials.netIncome || []
          })]
        })]
      }), financials && /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
        className: "p-6",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h3", {
          className: "font-semibold mb-4",
          children: "Raw API Response (Debug)"
        }), /* @__PURE__ */ jsxRuntimeExports.jsx("pre", {
          className: "text-xs overflow-auto max-h-96 p-4 bg-muted rounded",
          children: JSON.stringify(financials, null, 2)
        })]
      }), financials?.latestMetrics && /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
        className: "p-6",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h3", {
          className: "font-semibold mb-4",
          children: "Latest Financial Metrics"
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "grid grid-cols-2 md:grid-cols-4 gap-4",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("p", {
              className: "text-sm text-muted-foreground",
              children: "Revenue"
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
              className: "text-xl font-bold",
              children: ["$", (financials.latestMetrics.revenue / 1e6).toFixed(0), "M"]
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("p", {
              className: "text-sm text-muted-foreground",
              children: "Gross Margin"
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
              className: "text-xl font-bold",
              children: [(financials.latestMetrics.grossProfitRatio * 100).toFixed(1), "%"]
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("p", {
              className: "text-sm text-muted-foreground",
              children: "Operating Margin"
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
              className: "text-xl font-bold",
              children: [(financials.latestMetrics.operatingIncomeRatio * 100).toFixed(1), "%"]
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("p", {
              className: "text-sm text-muted-foreground",
              children: "EPS"
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
              className: "text-xl font-bold",
              children: ["$", financials.latestMetrics.eps?.toFixed(2) || "0.00"]
            })]
          })]
        })]
      })]
    })
  });
}
export {
  TestFinancials as default
};
