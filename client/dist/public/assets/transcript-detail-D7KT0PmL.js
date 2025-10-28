import { r as reactExports, j as jsxRuntimeExports, w as React, C as Card, a as CardHeader, f as cn, b as CardTitle, c as CardContent, n as TrendingUp, T as TrendingDown, H as useParams, u as useLocation, G as useToast, B as Button } from "./index-DF734YkB.js";
import { d as useQuery } from "./useQuery-C9HFImIm.js";
import { f as ChartPie, M as MainLayout } from "./main-layout-iPfLAwEH.js";
import { B as Badge } from "./badge-Bax4ZZX3.js";
import { C as Calendar, T as Tabs, a as TabsList, b as TabsTrigger, c as TabsContent } from "./tabs-CPUG2mtF.js";
import { C as ChartColumn } from "./chart-column-DNzw3S_G.js";
import { A as Activity } from "./activity-TJHkan0R.js";
import { D as DollarSign } from "./dollar-sign-BDD_kA4E.js";
import { M as Minus } from "./minus-CfWEs6ED.js";
import { A as ArrowLeft } from "./arrow-left-D76waWDu.js";
import { B as Bookmark, S as Share } from "./share-CE1JpwR-.js";
import { D as Download } from "./download-8GhWTv4F.js";
import { E as ExternalLink } from "./external-link-BNxepo82.js";
import { F as FileText } from "./file-text-BCjG82i7.js";
import "./dialog-B0u0SV5P.js";
import "./index-DXvlFXpR.js";
import "./input-vX2xFcRS.js";
import "./use-auth-monitoring-Ca9Wv08z.js";
import "./mail-D5HopcQP.js";
import "./lock-C5qTkNPd.js";
import "./eye-DQw-lb5A.js";
import "./user-C46AQImy.js";
import "./menu-CG6pfADK.js";
import "./search-CySG90ju.js";
import "./log-in-CA1V17qY.js";
import "./select-Bm8Ccf9j.js";
import "./index-IXOTxK3N.js";
import "./index-Dx7UitrF.js";
import "./chevron-down-BYhiF8im.js";
import "./scroll-area-BRs9U-pP.js";
function TypewriterText({
  text,
  speed = 30,
  onComplete,
  className = "",
  cursor = true,
  delay = 0
}) {
  const [displayedText, setDisplayedText] = reactExports.useState("");
  const [currentIndex, setCurrentIndex] = reactExports.useState(0);
  const [showCursor, setShowCursor] = reactExports.useState(cursor);
  const [started, setStarted] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (delay > 0) {
      const timer = setTimeout(() => setStarted(true), delay);
      return () => clearTimeout(timer);
    } else {
      setStarted(true);
    }
  }, [delay]);
  reactExports.useEffect(() => {
    if (!started || !text) return;
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText((prev) => prev + text[currentIndex]);
        setCurrentIndex((prev) => prev + 1);
      }, speed);
      return () => clearTimeout(timer);
    } else {
      setShowCursor(false);
      onComplete?.();
    }
  }, [currentIndex, text, speed, onComplete, started]);
  reactExports.useEffect(() => {
    setDisplayedText("");
    setCurrentIndex(0);
    setShowCursor(cursor);
  }, [text, cursor]);
  reactExports.useEffect(() => {
    if (!cursor || !showCursor) return;
    const interval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 500);
    return () => clearInterval(interval);
  }, [cursor, showCursor]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
    className,
    children: [displayedText.split("\n").map((line, i, arr) => /* @__PURE__ */ jsxRuntimeExports.jsxs(React.Fragment, {
      children: [line, i < arr.length - 1 && /* @__PURE__ */ jsxRuntimeExports.jsx("br", {})]
    }, i)), showCursor && currentIndex < text.length && /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
      className: "animate-pulse",
      children: "|"
    })]
  });
}
function FinancialMetricsDisplay({
  ticker,
  quarter,
  year,
  metrics,
  rawMetrics
}) {
  const getCategoryIcon = (category) => {
    switch (category) {
      case "revenue":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(DollarSign, {
          className: "h-4 w-4"
        });
      case "earnings":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(ChartColumn, {
          className: "h-4 w-4"
        });
      case "margins":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(ChartPie, {
          className: "h-4 w-4"
        });
      case "cash_flow":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(Activity, {
          className: "h-4 w-4"
        });
      default:
        return /* @__PURE__ */ jsxRuntimeExports.jsx(ChartColumn, {
          className: "h-4 w-4"
        });
    }
  };
  const getTrendIcon = (change) => {
    if (!change) return /* @__PURE__ */ jsxRuntimeExports.jsx(Minus, {
      className: "h-4 w-4 text-muted-foreground"
    });
    if (change > 0) return /* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, {
      className: "h-4 w-4 text-green-500"
    });
    return /* @__PURE__ */ jsxRuntimeExports.jsx(TrendingDown, {
      className: "h-4 w-4 text-red-500"
    });
  };
  const formatChange = (change, type) => {
    const isPositive = change > 0;
    const color = isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400";
    let formatted = "";
    switch (type) {
      case "basis_points":
        formatted = `${isPositive ? "+" : ""}${change}bps`;
        break;
      case "absolute":
        formatted = `${isPositive ? "+" : ""}${change}`;
        break;
      default:
        formatted = `${isPositive ? "+" : ""}${change}%`;
    }
    return /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
      className: cn("font-medium", color),
      children: formatted
    });
  };
  const groupedMetrics = metrics.reduce((acc, metric) => {
    const category = metric.category || "other";
    if (!acc[category]) acc[category] = [];
    acc[category].push(metric);
    return acc;
  }, {});
  const categoryTitles = {
    revenue: "Revenue Metrics",
    earnings: "Earnings & Profitability",
    margins: "Margin Analysis",
    cash_flow: "Cash Flow & Balance Sheet",
    guidance: "Guidance & Outlook",
    operational: "Operational KPIs",
    other: "Additional Metrics"
  };
  const categoryColors = {
    revenue: "from-green-500/10 to-green-500/20",
    earnings: "from-blue-500/10 to-blue-500/20",
    margins: "from-purple-500/10 to-purple-500/20",
    cash_flow: "from-amber-500/10 to-amber-500/20",
    guidance: "from-indigo-500/10 to-indigo-500/20",
    operational: "from-pink-500/10 to-pink-500/20",
    other: "from-gray-500/10 to-gray-500/20"
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
    className: "space-y-6",
    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
      className: "flex items-center justify-between mb-6",
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("h2", {
          className: "text-2xl font-bold flex items-center gap-2",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
            children: ticker
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, {
            variant: "outline",
            children: [quarter, " ", year]
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
          className: "text-sm text-muted-foreground mt-1",
          children: "Comprehensive financial metrics from earnings call"
        })]
      })
    }), Object.entries(groupedMetrics).map(([category, categoryMetrics]) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
      className: "overflow-hidden",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
        className: cn("bg-gradient-to-r", categoryColors[category] || categoryColors.other),
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, {
          className: "flex items-center gap-2",
          children: [getCategoryIcon(category), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
            children: categoryTitles[category] || "Metrics"
          })]
        })
      }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
        className: "pt-6",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
          className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4",
          children: categoryMetrics.map((metric, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "p-4 rounded-lg bg-card hover:bg-card/80 transition-colors border border-border/50",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "flex items-start justify-between mb-2",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                className: "text-sm text-muted-foreground",
                children: metric.label
              }), metric.icon || getTrendIcon(metric.change)]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "space-y-1",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                className: "text-2xl font-bold",
                children: metric.value
              }), metric.change !== void 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "text-sm",
                children: [formatChange(metric.change, metric.changeType), metric.comparison && /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                  className: "text-muted-foreground ml-2",
                  children: metric.comparison
                })]
              })]
            })]
          }, idx))
        })
      })]
    }, category)), rawMetrics && false]
  });
}
const getApiUrl = () => "";
function parseSummary(aiSummary) {
  if (!aiSummary) return null;
  let parsed;
  try {
    if (typeof aiSummary === "object") {
      parsed = aiSummary;
    } else if (typeof aiSummary === "string") {
      parsed = JSON.parse(aiSummary);
    } else {
      return null;
    }
    const safeStringArray = (arr) => {
      if (!Array.isArray(arr)) return [];
      return arr.filter((item) => typeof item === "string" && item.trim().length > 0);
    };
    const safeString = (value) => {
      if (typeof value === "string") return value;
      if (value === null || value === void 0) return "";
      return String(value);
    };
    if (parsed?.model === "openai" && parsed?.summary) {
      const summaryText = typeof parsed.summary === "string" ? parsed.summary : String(parsed.summary);
      console.log("🔍 OpenAI structure detected, extracting summary:", summaryText.substring(0, 100));
      return {
        summary: summaryText,
        key_insights: safeStringArray(parsed.key_insights || parsed.keyInsights || []),
        financial_highlights: safeStringArray(parsed.financial_highlights || parsed.financialHighlights || []),
        risk_factors: safeStringArray(parsed.risk_factors || [])
      };
    }
    if (parsed?.summary && typeof parsed.summary === "string") {
      return {
        summary: safeString(parsed.summary),
        key_insights: safeStringArray(parsed.key_insights || parsed.keyInsights || []),
        financial_highlights: safeStringArray(parsed.financial_highlights || parsed.financialHighlights || []),
        risk_factors: safeStringArray(parsed.risk_factors || [])
      };
    }
    const result = {
      summary: "",
      key_insights: [],
      financial_highlights: [],
      risk_factors: []
    };
    if (parsed.summary) {
      result.summary = safeString(parsed.summary);
    } else if (parsed.outlook) {
      result.summary = safeString(parsed.outlook);
    } else if (parsed.text) {
      result.summary = safeString(parsed.text);
    } else if (typeof parsed === "string") {
      result.summary = safeString(parsed);
    } else {
      const parts = [];
      if (parsed.outlook) parts.push(`Outlook: ${safeString(parsed.outlook)}`);
      if (Array.isArray(parsed.risks) && parsed.risks.length > 0) {
        const safeRisks = safeStringArray(parsed.risks);
        if (safeRisks.length > 0) parts.push(`Risks: ${safeRisks.join(", ")}`);
      }
      result.summary = parts.length > 0 ? parts.join(" | ") : "Summary content available in detailed view.";
    }
    result.key_insights = safeStringArray(parsed.key_insights || parsed.keyInsights || parsed.risks);
    result.financial_highlights = safeStringArray(parsed.financial_highlights || parsed.financialHighlights);
    result.risk_factors = safeStringArray(parsed.risk_factors || parsed.risks);
    return result;
  } catch (error) {
    console.error("Error parsing AI summary:", error);
    const safeText = typeof aiSummary === "string" ? aiSummary : "Summary not available.";
    return {
      summary: safeText,
      key_insights: [],
      financial_highlights: [],
      risk_factors: [],
      stock_specific_metrics: []
    };
  }
}
function TranscriptDetail() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const {
    toast
  } = useToast();
  const [isFavorite, setIsFavorite] = reactExports.useState(false);
  const transcriptId = params.id || "";
  const {
    data,
    isLoading,
    isError
  } = useQuery({
    queryKey: ["/api/transcripts/:id", transcriptId],
    enabled: !!transcriptId,
    queryFn: async () => {
      const api = getApiUrl();
      const res = await fetch(`${api}/api/transcripts/${transcriptId}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to fetch transcript");
      }
      const body = await res.json();
      return body.data;
    },
    staleTime: 5 * 60 * 1e3,
    retry: 1
  });
  const transcript = data || null;
  console.log("🔍 TRANSCRIPT DEBUG:", {
    transcriptExists: !!transcript,
    aiSummaryType: typeof transcript?.ai_summary,
    aiSummaryValue: transcript?.ai_summary
  });
  const parsed = reactExports.useMemo(() => {
    const result = parseSummary(transcript?.ai_summary || null);
    console.log("🔍 PARSED SUMMARY RESULT:", {
      result,
      type: typeof result,
      hasSummary: !!result?.summary,
      summaryType: typeof result?.summary
    });
    return result;
  }, [transcript?.ai_summary]);
  const summaryText = reactExports.useMemo(() => {
    console.log("🔍 COMPUTING SUMMARY TEXT:", {
      parsed,
      hasParsed: !!parsed,
      parsedSummary: parsed?.summary,
      parsedSummaryType: typeof parsed?.summary
    });
    if (!parsed) return "Summary not available yet.";
    if (parsed.summary) {
      if (typeof parsed.summary === "string") {
        console.log("🔍 RETURNING STRING SUMMARY:", parsed.summary.substring(0, 100));
        return parsed.summary;
      } else {
        console.warn("Summary is not a string, type:", typeof parsed.summary);
        return "Summary format not supported. Please regenerate the AI analysis.";
      }
    }
    return "Summary not available yet.";
  }, [parsed]);
  const highlights = reactExports.useMemo(() => {
    console.log("🔍 COMPUTING HIGHLIGHTS:", {
      parsed,
      hasParsed: !!parsed,
      keyInsights: parsed?.key_insights,
      keyInsightsType: typeof parsed?.key_insights,
      financialHighlights: parsed?.financial_highlights,
      financialHighlightsType: typeof parsed?.financial_highlights
    });
    if (!parsed) return [];
    const insights = parsed.key_insights || parsed.keyInsights || [];
    const financials = parsed.financial_highlights || parsed.financialHighlights || [];
    console.log("🔍 RAW HIGHLIGHTS DATA:", {
      insights,
      insightsType: typeof insights,
      insightsIsArray: Array.isArray(insights),
      financials,
      financialsType: typeof financials,
      financialsIsArray: Array.isArray(financials)
    });
    const safeInsights = Array.isArray(insights) ? insights : [];
    const safeFinancials = Array.isArray(financials) ? financials : [];
    const allHighlights = [...safeInsights, ...safeFinancials].filter((item) => {
      if (typeof item !== "string") {
        console.warn("Non-string item found in highlights, type:", typeof item, "item:", item);
        return false;
      }
      return item.trim().length > 0;
    });
    console.log("🔍 FINAL HIGHLIGHTS:", allHighlights);
    return allHighlights.slice(0, 8);
  }, [parsed]);
  const [insightsComplete, setInsightsComplete] = reactExports.useState(false);
  const [highlightsComplete, setHighlightsComplete] = reactExports.useState(false);
  if (isLoading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(MainLayout, {
      children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
        className: "container mx-auto px-6 py-8",
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "space-y-4",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "h-6 w-40 bg-muted rounded"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "h-10 w-3/4 bg-muted rounded"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "h-24 w-full bg-muted rounded"
          })]
        })
      })
    });
  }
  if (isError || !transcript) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(MainLayout, {
      children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
        className: "container mx-auto px-6 py-8",
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "text-center",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h1", {
            className: "text-2xl font-bold mb-4",
            children: "Transcrição Não Encontrada"
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
            onClick: () => setLocation("/transcripts"),
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(ArrowLeft, {
              className: "h-4 w-4 mr-2"
            }), "Voltar às Transcrições"]
          })]
        })
      })
    });
  }
  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast({
      description: "Ligação copiada para a área de transferência",
      forceRegenerate: true
    });
  };
  const handleStockClick = () => {
    setLocation(`/stock/${transcript.ticker}`);
  };
  const handleDownload = () => {
    const title = `${transcript.ticker} ${transcript.quarter} ${transcript.year} Earnings Call`;
    const content = `${title}
${transcript.company_name} (${transcript.ticker})
${transcript.quarter} ${transcript.year}
Date: ${transcript.call_date || "-"}

${transcript.raw_transcript || ""}`;
    const blob = new Blob([content], {
      type: "text/plain"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${transcript.ticker}_${transcript.quarter}_${transcript.year}_transcript.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({
      title: "Download Started",
      description: "Transcript is being downloaded as a text file."
    });
  };
  const handleToggleFavorite = () => {
    setIsFavorite(!isFavorite);
    toast({
      title: isFavorite ? "Removed from Favorites" : "Added to Favorites",
      description: isFavorite ? "Transcript removed from your favorites." : "Transcript saved to your favorites."
    });
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(MainLayout, {
    children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
      className: "container mx-auto px-6 py-8 max-w-7xl",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
        className: "mb-8",
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "flex items-center gap-4 mb-6",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
            variant: "ghost",
            onClick: () => setLocation("/transcripts"),
            className: "h-10 w-10 p-0 text-foreground hover:bg-secondary/60 border border-border/50",
            "aria-label": "Voltar à lista de transcrições",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowLeft, {
              className: "h-5 w-5"
            })
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex-1",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "flex items-center gap-3 mb-2",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                className: "w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center cursor-pointer hover:bg-primary/20 transition-colors",
                onClick: handleStockClick,
                children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                  className: "text-lg font-bold text-primary",
                  children: transcript.ticker.charAt(0)
                })
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "flex items-center gap-2",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h1", {
                    className: "text-2xl font-bold",
                    children: transcript.ticker
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, {
                    variant: "outline",
                    children: [transcript.quarter, " ", transcript.year]
                  })]
                }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                  className: "text-muted-foreground",
                  children: transcript.company_name
                })]
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("h2", {
              className: "text-xl font-semibold mb-4",
              children: `${transcript.ticker} ${transcript.quarter} ${transcript.year} Earnings Call`
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
              className: "flex items-center gap-6 text-sm text-muted-foreground",
              children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "flex items-center gap-1",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Calendar, {
                  className: "h-4 w-4"
                }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                  children: transcript.call_date ? new Date(transcript.call_date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                  }) : "-"
                })]
              })
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex items-center gap-2",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
              variant: "outline",
              size: "sm",
              onClick: handleToggleFavorite,
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(Bookmark, {
                className: cn("h-4 w-4", {
                  "fill-current": isFavorite
                })
              })
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
              variant: "outline",
              size: "sm",
              onClick: handleShare,
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(Share, {
                className: "h-4 w-4"
              })
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
              variant: "outline",
              size: "sm",
              onClick: handleDownload,
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(Download, {
                className: "h-4 w-4"
              })
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
              variant: "outline",
              size: "sm",
              onClick: handleStockClick,
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, {
                className: "h-4 w-4 mr-1"
              }), "View Charts"]
            })]
          })]
        })
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "grid grid-cols-1 lg:grid-cols-3 gap-8",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
          className: "lg:col-span-2 space-y-6",
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Tabs, {
            defaultValue: "transcript",
            className: "w-full",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(TabsList, {
              className: "grid w-full grid-cols-3",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, {
                value: "transcript",
                children: "Full Transcript"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, {
                value: "summary",
                children: "Summary"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, {
                value: "metrics",
                children: "Key Metrics"
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, {
              value: "transcript",
              className: "space-y-4",
              children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
                className: "overflow-hidden",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
                  className: "bg-gradient-to-r from-primary/5 to-primary/10 border-b",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, {
                    className: "flex items-center gap-3",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                      className: "p-2 bg-primary/10 rounded-lg",
                      children: /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, {
                        className: "h-5 w-5 text-primary"
                      })
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "text-xl font-semibold",
                      children: "Full Earnings Call Transcript"
                    })]
                  })
                }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
                  className: "p-8",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                    className: "prose prose-lg dark:prose-invert max-w-none",
                    children: (transcript.raw_transcript || "Transcript not available.").split("\n\n").map((paragraph, index) => {
                      const isSpeaker = paragraph.match(/^[A-Z][^:]*:/) || paragraph.includes("CEO") || paragraph.includes("CFO") || paragraph.includes("Operator") || paragraph.includes("Analyst");
                      if (isSpeaker) {
                        const [speaker, ...content] = paragraph.split(":");
                        return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                          className: "mb-6 pl-4 border-l-4 border-primary/30 hover:border-primary/50 transition-colors",
                          children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                            className: "font-semibold text-primary mb-2 text-sm uppercase tracking-wider",
                            children: speaker.trim()
                          }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                            className: "text-base leading-relaxed text-foreground/90 whitespace-pre-wrap",
                            children: content.join(":").trim()
                          })]
                        }, index);
                      }
                      return /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                        className: "mb-6 text-base leading-[1.8] text-foreground/85 whitespace-pre-wrap tracking-wide",
                        children: paragraph
                      }, index);
                    })
                  })
                })]
              })
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, {
              value: "summary",
              className: "space-y-4",
              children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
                className: "overflow-hidden",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
                  className: "bg-gradient-to-r from-blue-500/5 to-blue-500/10 border-b",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, {
                    className: "flex items-center gap-3",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                      className: "p-2 bg-blue-500/10 rounded-lg",
                      children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                        className: "text-xl",
                        children: "📊"
                      })
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "text-xl font-semibold",
                      children: "Executive Summary"
                    })]
                  })
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
                  className: "p-8",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                    className: "p-6 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border border-primary/20 mb-6",
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                      className: "text-lg leading-[1.8] text-foreground/90 font-medium",
                      children: typeof summaryText === "string" ? summaryText : "Summary not available yet."
                    })
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("h4", {
                      className: "font-semibold text-lg mb-4 flex items-center gap-2",
                      children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                        className: "text-xl",
                        children: "🎯"
                      }), "Key Highlights"]
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                      className: "grid gap-3",
                      children: highlights.length > 0 ? highlights.map((h, index) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                        className: "flex items-start gap-3 p-4 rounded-lg bg-card hover:bg-card/80 transition-colors border border-border/50",
                        children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                          className: "w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0",
                          children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                            className: "text-sm font-semibold text-primary",
                            children: index + 1
                          })
                        }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                          className: "text-base leading-relaxed",
                          children: typeof h === "string" ? h : "Invalid highlight"
                        })]
                      }, index)) : /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                        className: "text-base text-muted-foreground p-4 text-center",
                        children: "No highlights available."
                      })
                    })]
                  })]
                })]
              })
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, {
              value: "metrics",
              className: "space-y-4",
              children: (() => {
                const financialHighlights = parsed?.financial_highlights || parsed?.financialHighlights || [];
                const stockMetrics = parsed?.stock_specific_metrics || parsed?.stockSpecificMetrics || [];
                const metrics = [];
                financialHighlights.forEach((highlight) => {
                  if (typeof highlight !== "string") return;
                  if (highlight.toLowerCase().includes("revenue")) {
                    const value = highlight.match(/\$[\d.,]+\s*(billion|million)?/i)?.[0] || "";
                    const change = highlight.match(/[+-]?\d+\.?\d*%/)?.[0];
                    metrics.push({
                      label: "Revenue",
                      value,
                      change: change ? parseFloat(change) : void 0,
                      changeType: "percent",
                      comparison: highlight.includes("YoY") ? "YoY" : highlight.includes("QoQ") ? "QoQ" : void 0,
                      category: "revenue"
                    });
                  } else if (highlight.toLowerCase().includes("eps")) {
                    const value = highlight.match(/\$[\d.]+/)?.[0] || "";
                    const beat = highlight.match(/beat.*?\$[\d.]+/i)?.[0];
                    metrics.push({
                      label: highlight.includes("GAAP") ? "GAAP EPS" : "EPS",
                      value,
                      comparison: beat ? `Beat by ${beat.match(/\$[\d.]+/)?.[0]}` : void 0,
                      category: "earnings"
                    });
                  } else if (highlight.toLowerCase().includes("margin")) {
                    const value = highlight.match(/\d+\.?\d*%/)?.[0] || "";
                    const change = highlight.match(/[+-]?\d+bps/)?.[0];
                    const marginType = highlight.match(/(gross|operating|net|ebitda)/i)?.[0] || "Margin";
                    metrics.push({
                      label: `${marginType.charAt(0).toUpperCase() + marginType.slice(1)} Margin`,
                      value,
                      change: change ? parseInt(change) : void 0,
                      changeType: "basis_points",
                      category: "margins"
                    });
                  } else if (highlight.toLowerCase().includes("cash flow") || highlight.toLowerCase().includes("fcf")) {
                    const value = highlight.match(/\$[\d.,]+\s*(billion|million)?/i)?.[0] || "";
                    const change = highlight.match(/[+-]?\d+\.?\d*%/)?.[0];
                    metrics.push({
                      label: highlight.includes("free") ? "Free Cash Flow" : "Operating Cash Flow",
                      value,
                      change: change ? parseFloat(change) : void 0,
                      changeType: "percent",
                      category: "cash_flow"
                    });
                  } else if (highlight.toLowerCase().includes("guidance")) {
                    metrics.push({
                      label: "Guidance Update",
                      value: highlight.match(/(raised|lowered|maintained|initiated)/i)?.[0] || "Updated",
                      comparison: highlight,
                      category: "guidance"
                    });
                  }
                });
                stockMetrics.forEach((metric) => {
                  if (typeof metric !== "string") return;
                  const metricName = metric.split(":")[0] || metric;
                  const metricValue = metric.split(":")[1] || metric;
                  metrics.push({
                    label: metricName.trim(),
                    value: metricValue.trim(),
                    category: "operational"
                  });
                });
                if (metrics.length > 0) {
                  return /* @__PURE__ */ jsxRuntimeExports.jsx(FinancialMetricsDisplay, {
                    ticker: transcript.ticker,
                    quarter: transcript.quarter,
                    year: transcript.year,
                    metrics
                  });
                }
                return /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
                  className: "overflow-hidden",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
                    className: "bg-gradient-to-r from-green-500/5 to-green-500/10 border-b",
                    children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, {
                      className: "flex items-center gap-3",
                      children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                        className: "p-2 bg-green-500/10 rounded-lg",
                        children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                          className: "text-xl",
                          children: "💰"
                        })
                      }), /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
                        className: "text-xl font-semibold",
                        children: ["Financial Highlights - ", transcript.ticker]
                      })]
                    })
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
                    className: "p-8",
                    children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                      className: "p-8 text-center",
                      children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                        className: "text-4xl mb-4",
                        children: "📈"
                      }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                        className: "text-muted-foreground",
                        children: "No financial highlights available yet."
                      }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                        className: "text-sm text-muted-foreground mt-2",
                        children: "AI analysis will extract metrics once processed."
                      })]
                    })
                  })]
                });
              })()
            })]
          })
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "space-y-6",
          children: [parsed && /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
              children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, {
                className: "flex items-center gap-2",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                  className: "text-2xl",
                  children: "📊"
                }), "AI Analysis"]
              })
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
              className: "space-y-6",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg border border-primary/20",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("h3", {
                  className: "font-semibold mb-3 text-sm text-primary flex items-center gap-2",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                    className: "text-lg",
                    children: "📝"
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                    className: "uppercase tracking-wider",
                    children: "Executive Summary"
                  })]
                }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                  className: "text-base leading-[1.75] text-foreground/90",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(TypewriterText, {
                    text: summaryText,
                    speed: 20,
                    onComplete: () => setInsightsComplete(true),
                    className: "font-medium"
                  })
                })]
              }), insightsComplete && parsed.key_insights && parsed.key_insights.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "animate-in fade-in slide-in-from-bottom-2 duration-500",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("h3", {
                  className: "font-semibold mb-4 text-sm text-primary flex items-center gap-2",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                    className: "p-1.5 bg-yellow-500/10 rounded",
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "text-base",
                      children: "💡"
                    })
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                    className: "uppercase tracking-wider",
                    children: "Key Insights"
                  })]
                }), /* @__PURE__ */ jsxRuntimeExports.jsx("ul", {
                  className: "space-y-3",
                  children: parsed.key_insights.map((insight, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", {
                    className: "flex items-start gap-3 p-3 rounded-lg bg-card/50 hover:bg-card transition-colors border border-border/50",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "text-primary mt-1 text-lg",
                      children: "▸"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "text-sm leading-relaxed flex-1",
                      children: /* @__PURE__ */ jsxRuntimeExports.jsx(TypewriterText, {
                        text: insight,
                        speed: 15,
                        delay: idx * 500,
                        onComplete: idx === (parsed.key_insights?.length || 0) - 1 ? () => setHighlightsComplete(true) : void 0,
                        className: "text-foreground/85"
                      })
                    })]
                  }, idx))
                })]
              }), highlightsComplete && parsed.financial_highlights && parsed.financial_highlights.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "animate-in fade-in slide-in-from-bottom-2 duration-500 delay-100",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("h3", {
                  className: "font-semibold mb-4 text-sm text-primary flex items-center gap-2",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                    className: "p-1.5 bg-green-500/10 rounded",
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "text-base",
                      children: "📈"
                    })
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                    className: "uppercase tracking-wider",
                    children: "Financial Highlights"
                  })]
                }), /* @__PURE__ */ jsxRuntimeExports.jsx("ul", {
                  className: "space-y-3",
                  children: parsed.financial_highlights.map((highlight, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", {
                    className: "flex items-start gap-3 p-3 rounded-lg bg-gradient-to-r from-green-500/5 to-green-500/10 border border-green-500/20",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "text-green-600 dark:text-green-400 mt-1 text-lg",
                      children: "▸"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "text-sm leading-relaxed flex-1",
                      children: /* @__PURE__ */ jsxRuntimeExports.jsx(TypewriterText, {
                        text: highlight,
                        speed: 15,
                        delay: idx * 500,
                        className: "text-foreground/85 font-medium"
                      })
                    })]
                  }, idx))
                })]
              }), highlightsComplete && parsed.risk_factors && parsed.risk_factors.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "animate-in fade-in slide-in-from-bottom-2 duration-500 delay-200",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("h3", {
                  className: "font-semibold mb-4 text-sm text-primary flex items-center gap-2",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                    className: "p-1.5 bg-red-500/10 rounded",
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "text-base",
                      children: "⚠️"
                    })
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                    className: "uppercase tracking-wider",
                    children: "Risk Factors"
                  })]
                }), /* @__PURE__ */ jsxRuntimeExports.jsx("ul", {
                  className: "space-y-3",
                  children: parsed.risk_factors.map((risk, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", {
                    className: "flex items-start gap-3 p-3 rounded-lg bg-gradient-to-r from-red-500/5 to-red-500/10 border border-red-500/20",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "text-red-600 dark:text-red-400 mt-1 text-lg",
                      children: "▸"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "text-sm leading-relaxed flex-1",
                      children: /* @__PURE__ */ jsxRuntimeExports.jsx(TypewriterText, {
                        text: risk,
                        speed: 15,
                        delay: idx * 500,
                        className: "text-foreground/85"
                      })
                    })]
                  }, idx))
                })]
              })]
            })]
          }), !parsed && /* @__PURE__ */ jsxRuntimeExports.jsx(Card, {
            className: "border-dashed",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
              className: "py-12",
              children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "text-center space-y-3",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                  className: "text-4xl",
                  children: "🤖"
                }), /* @__PURE__ */ jsxRuntimeExports.jsx("h3", {
                  className: "font-semibold",
                  children: "AI Analysis Pending"
                }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                  className: "text-sm text-muted-foreground max-w-xs mx-auto",
                  children: "AI analysis will appear here automatically once processed by our system."
                })]
              })
            })
          })]
        })]
      })]
    })
  });
}
export {
  TranscriptDetail as default
};
