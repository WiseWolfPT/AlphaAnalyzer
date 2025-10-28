import { r as reactExports, j as jsxRuntimeExports, C as Card, c as CardContent, o as Alert, p as AlertDescription, M as Info, n as TrendingUp, T as TrendingDown, f as cn, B as Button } from "./index-DF734YkB.js";
import { E as arrayTooltipSearcher } from "./GraphicalItemClipPath-C5BaDaiW.js";
import { C as CartesianChart } from "./CartesianChart-DjA-4J1-.js";
import { d as useQuery } from "./useQuery-C9HFImIm.js";
import { B as Badge } from "./badge-Bax4ZZX3.js";
import { S as Skeleton } from "./skeleton-Cohz4q-x.js";
import { D as Dialog, a as DialogTrigger, b as DialogContent, c as DialogHeader, d as DialogTitle, e as DialogDescription } from "./dialog-B0u0SV5P.js";
import { T as TooltipProvider, a as Tooltip, b as TooltipTrigger, c as TooltipContent } from "./tooltip-BFWp8RjG.js";
import { q as queryKeys } from "./use-cache-data-WpPFNsyq.js";
import { M as Minus } from "./minus-CfWEs6ED.js";
var allowedTooltipTypes = ["axis", "item"];
var BarChart = /* @__PURE__ */ reactExports.forwardRef((props, ref) => {
  return /* @__PURE__ */ reactExports.createElement(CartesianChart, {
    chartName: "BarChart",
    defaultTooltipEventType: "axis",
    validateTooltipEventTypes: allowedTooltipTypes,
    tooltipPayloadSearcher: arrayTooltipSearcher,
    categoricalChartProps: props,
    ref
  });
});
function useAlfaValue(ticker) {
  return useQuery({
    queryKey: queryKeys.alfaValueMain(ticker),
    queryFn: async () => {
      if (!ticker) {
        throw new Error("Ticker is required");
      }
      const response = await fetch(`/api/iv/${ticker}/main`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Intrinsic value data not available for ${ticker}`);
        }
        throw new Error(`Failed to fetch intrinsic value: ${response.statusText}`);
      }
      const data = await response.json();
      return data;
    },
    enabled: !!ticker,
    staleTime: 24 * 60 * 60 * 1e3,
    // 24 hours - intrinsic value changes rarely
    gcTime: 48 * 60 * 60 * 1e3,
    // 48 hours - keep in cache longer
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1e3 * 2 ** attemptIndex, 1e4)
  });
}
function getStatusColor(status) {
  switch (status) {
    case "undervalued":
      return "bg-green-500/10 text-green-700 border-green-500/20";
    case "overvalued":
      return "bg-red-500/10 text-red-700 border-red-500/20";
    case "fair":
      return "bg-gray-500/10 text-gray-700 border-gray-500/20";
    default:
      return "bg-gray-500/10 text-gray-700 border-gray-500/20";
  }
}
function getStatusLabel(status) {
  switch (status) {
    case "undervalued":
      return "Undervalued";
    case "overvalued":
      return "Overvalued";
    case "fair":
      return "Fairly Priced";
    default:
      return "Unknown";
  }
}
function getStatusIcon(status) {
  switch (status) {
    case "undervalued":
      return "▼";
    case "overvalued":
      return "▲";
    case "fair":
      return "=";
    default:
      return "=";
  }
}
function AlfaValueHeader({
  ticker
}) {
  const {
    data,
    isLoading,
    error
  } = useAlfaValue(ticker);
  const [showAssumptions, setShowAssumptions] = reactExports.useState(false);
  const {
    data: quoteData
  } = useQuery({
    queryKey: ["quote-realtime", ticker],
    queryFn: async () => {
      const res = await fetch(`/api/market-data/quote/${ticker}`);
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 6e4,
    // 60s - refresh every minute
    refetchInterval: 6e4,
    // Auto-refresh every minute
    enabled: !!ticker && !!data,
    // Only fetch if we have AlfaValue data
    retry: 1
    // Retry once on failure
  });
  if (isLoading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Card, {
      className: "border-teya-green/20 bg-gradient-to-r from-teya-green/5 to-transparent",
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
        className: "p-6",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, {
          className: "h-24 w-full"
        })
      })
    });
  }
  if (error || !data) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Card, {
      className: "border-red-500/20",
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
        className: "p-6",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, {
          variant: "destructive",
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDescription, {
            children: ["Unable to calculate intrinsic value. Data may be unavailable for ", ticker, "."]
          })
        })
      })
    });
  }
  const isInvalidIV = !data.iv || data.iv <= 0;
  if (isInvalidIV) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Card, {
      className: "border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-transparent",
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
        className: "p-6",
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, {
          className: "border-amber-500/20",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Info, {
            className: "h-4 w-4 text-amber-600"
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDescription, {
            className: "text-amber-700",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("strong", {
              children: "DCF Valuation Not Applicable"
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
              className: "mt-2",
              children: ["Intrinsic value cannot be calculated using DCF for ", ticker, ". This is common for financial institutions (banks, insurance companies) which have negative or irregular free cash flows."]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
              className: "mt-2 text-sm",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx("strong", {
                children: "Recommended alternative methods:"
              }), " P/TBV (Price-to-Tangible Book Value), P/B (Price-to-Book), or P/E (Price-to-Earnings) multiples."]
            })]
          })]
        })
      })
    });
  }
  const formatCurrency = (value) => new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
  const currentPrice = quoteData?.price ?? data.price;
  const isPremium = data.discount_pct < 0;
  const isDiscount = data.discount_pct > 0;
  const displayPercent = Math.abs(data.discount_pct);
  const statusColor = getStatusColor(data.status);
  const statusLabel = getStatusLabel(data.status);
  const statusIcon = getStatusIcon(data.status);
  const StatusIcon = data.status === "undervalued" ? TrendingUp : data.status === "overvalued" ? TrendingDown : Minus;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Card, {
    className: "border-teya-green/20 bg-gradient-to-r from-teya-green/5 to-transparent",
    children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
      className: "p-6",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "flex items-center justify-between mb-4",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "flex items-center gap-2",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h3", {
            className: "text-sm font-medium text-muted-foreground",
            children: "AlfaValue™"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipProvider, {
            children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Tooltip, {
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(TooltipTrigger, {
                asChild: true,
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(Info, {
                  className: "h-4 w-4 text-muted-foreground cursor-help"
                })
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipContent, {
                children: /* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
                  children: ["Intrinsic value calculated using 20-year DCF model", /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}), "with dynamic growth rates and WACC"]
                })
              })]
            })
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, {
          variant: "outline",
          className: "text-xs",
          children: ["Updated: ", new Date(data.as_of).toLocaleDateString()]
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "text-center md:text-left",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx("p", {
            className: "text-sm text-muted-foreground mb-1",
            children: "Intrinsic Value"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
            className: "text-3xl md:text-4xl font-bold text-teya-green",
            children: formatCurrency(data.iv)
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "text-center md:text-left",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx("p", {
            className: "text-sm text-muted-foreground mb-1",
            children: "Current Price"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
            className: "text-3xl md:text-4xl font-bold",
            children: formatCurrency(currentPrice)
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "flex flex-col items-center md:items-end justify-center gap-2",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, {
            className: cn("text-sm px-3 py-1.5", statusColor),
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(StatusIcon, {
              className: "h-4 w-4 mr-1"
            }), statusLabel, " ", statusIcon]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "text-center md:text-right",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
              className: cn("text-2xl font-bold", isDiscount ? "text-green-600" : isPremium ? "text-red-600" : "text-muted-foreground"),
              children: [displayPercent.toFixed(1), "%"]
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
              className: "text-xs text-muted-foreground",
              children: isDiscount ? "Discount" : isPremium ? "Premium" : "Fair Value"
            })]
          })]
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
        className: "mt-4 pt-4 border-t border-border/50",
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, {
          open: showAssumptions,
          onOpenChange: setShowAssumptions,
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(DialogTrigger, {
            asChild: true,
            children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
              variant: "outline",
              size: "sm",
              className: "w-full md:w-auto",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Info, {
                className: "h-4 w-4 mr-2"
              }), "View Assumptions"]
            })
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, {
            className: "max-w-2xl",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, {
              children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(DialogTitle, {
                children: ["Calculation Assumptions - ", ticker]
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, {
                children: "AlfaValue™ is calculated using a 20-year Discounted Cash Flow (DCF) model with dynamic growth rates and company-specific discount rate (WACC)."
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "grid grid-cols-1 md:grid-cols-2 gap-6 mt-4",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h4", {
                  className: "font-semibold mb-3 text-teya-green",
                  children: "Growth Assumptions"
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "space-y-2 text-sm",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex justify-between",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "text-muted-foreground",
                      children: "Growth Years 1-5:"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
                      className: "font-medium",
                      children: [(data.assumptions.g_1_5 * 100).toFixed(1), "%"]
                    })]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex justify-between",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "text-muted-foreground",
                      children: "Growth Years 6-10:"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
                      className: "font-medium",
                      children: [(data.assumptions.g_6_10 * 100).toFixed(1), "%"]
                    })]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex justify-between",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "text-muted-foreground",
                      children: "Terminal Growth (11-20):"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
                      className: "font-medium",
                      children: [(data.assumptions.g_11_20 * 100).toFixed(1), "%"]
                    })]
                  })]
                })]
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h4", {
                  className: "font-semibold mb-3 text-blue-600",
                  children: "Discount Rate (WACC)"
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "space-y-2 text-sm",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex justify-between",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "text-muted-foreground",
                      children: "Risk-Free Rate:"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
                      className: "font-medium",
                      children: [(data.assumptions.rf * 100).toFixed(2), "%"]
                    })]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex justify-between",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "text-muted-foreground",
                      children: "Beta:"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "font-medium",
                      children: data.assumptions.beta.toFixed(2)
                    })]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex justify-between",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "text-muted-foreground",
                      children: "Market Risk Premium:"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
                      className: "font-medium",
                      children: [(data.assumptions.mrp * 100).toFixed(1), "%"]
                    })]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex justify-between pt-2 border-t",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "text-muted-foreground font-medium",
                      children: "Discount Rate:"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
                      className: "font-bold text-blue-600",
                      children: [(data.assumptions.discount_rate * 100).toFixed(2), "%"]
                    })]
                  })]
                })]
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h4", {
                  className: "font-semibold mb-3 text-purple-600",
                  children: "Financial Inputs"
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "space-y-2 text-sm",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex justify-between",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "text-muted-foreground",
                      children: "FCF TTM:"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
                      className: "font-medium",
                      children: ["$", data.inputs.fcf_ttm_musd.toFixed(0), "M"]
                    })]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex justify-between",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "text-muted-foreground",
                      children: "Cash:"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
                      className: "font-medium",
                      children: ["$", data.inputs.cash_musd.toFixed(0), "M"]
                    })]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex justify-between",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "text-muted-foreground",
                      children: "Total Debt:"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
                      className: "font-medium",
                      children: ["$", data.inputs.debt_musd.toFixed(0), "M"]
                    })]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex justify-between",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "text-muted-foreground",
                      children: "Shares Outstanding:"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
                      className: "font-medium",
                      children: [data.inputs.shares_m.toFixed(0), "M"]
                    })]
                  })]
                })]
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h4", {
                  className: "font-semibold mb-3 text-amber-600",
                  children: "Additional Info"
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "space-y-2 text-sm",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex justify-between",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "text-muted-foreground",
                      children: "Sector Mid Growth:"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
                      className: "font-medium",
                      children: [(data.meta.g_sector_mid * 100).toFixed(1), "%"]
                    })]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex justify-between",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "text-muted-foreground",
                      children: "Sector Source:"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "font-medium capitalize",
                      children: data.meta.g_sector_source
                    })]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex justify-between",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "text-muted-foreground",
                      children: "Regional Terminal:"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
                      className: "font-medium",
                      children: [(data.meta.g_term_region * 100).toFixed(1), "%"]
                    })]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex justify-between",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "text-muted-foreground",
                      children: "Region:"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "font-medium",
                      children: data.meta.region
                    })]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex justify-between pt-2 border-t",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "text-muted-foreground",
                      children: "Confidence:"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, {
                      variant: data.confidence === "HIGH" ? "default" : data.confidence === "MED" ? "secondary" : "outline",
                      children: data.confidence
                    })]
                  })]
                })]
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "mt-6 pt-4 border-t text-center text-sm text-muted-foreground",
              children: ["Calculated: ", new Date(data.as_of).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric"
              }), " UTC"]
            })]
          })]
        })
      })]
    })
  });
}
export {
  AlfaValueHeader as A,
  BarChart as B,
  useAlfaValue as u
};
