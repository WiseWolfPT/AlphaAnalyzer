import { j as jsxRuntimeExports, C as Card, a as CardHeader, c as CardContent, r as reactExports, n as TrendingUp, u as useLocation, B as Button } from "./index-DF734YkB.js";
import { d as useQuery } from "./useQuery-C9HFImIm.js";
import { M as MainLayout } from "./main-layout-iPfLAwEH.js";
import { B as Badge } from "./badge-Bax4ZZX3.js";
import { I as Input } from "./input-vX2xFcRS.js";
import { S as Select, a as SelectTrigger, b as SelectValue, c as SelectContent, d as SelectItem } from "./select-Bm8Ccf9j.js";
import { T as Tabs, a as TabsList, b as TabsTrigger, c as TabsContent, C as Calendar } from "./tabs-CPUG2mtF.js";
import { S as Skeleton } from "./skeleton-Cohz4q-x.js";
import { a as useColdStartHandler } from "./use-market-data-B1DbYYS9.js";
import { F as FileText } from "./file-text-BCjG82i7.js";
import { S as Search } from "./search-CySG90ju.js";
import { S as Star } from "./star-Cp1OMHQ3.js";
import { E as ExternalLink } from "./external-link-BNxepo82.js";
import { P as Play } from "./play-67-S07y3.js";
import "./dialog-B0u0SV5P.js";
import "./index-DXvlFXpR.js";
import "./use-auth-monitoring-Ca9Wv08z.js";
import "./mail-D5HopcQP.js";
import "./lock-C5qTkNPd.js";
import "./eye-DQw-lb5A.js";
import "./user-C46AQImy.js";
import "./menu-CG6pfADK.js";
import "./chart-column-DNzw3S_G.js";
import "./log-in-CA1V17qY.js";
import "./index-Dx7UitrF.js";
import "./scroll-area-BRs9U-pP.js";
import "./index-IXOTxK3N.js";
import "./chevron-down-BYhiF8im.js";
import "./index--4L2OUQN.js";
import "./api-BsiXYgjJ.js";
function TranscriptCardSkeleton() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
    className: "h-full",
    children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "flex items-start justify-between",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "flex items-center space-x-3",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, {
            className: "w-12 h-12 rounded-lg"
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "space-y-2",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "flex items-center space-x-2",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, {
                className: "h-5 w-16"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, {
                className: "h-5 w-20 rounded-full"
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, {
              className: "h-4 w-32"
            })]
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "flex items-center space-x-2",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, {
            className: "h-5 w-20 rounded-full"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, {
            className: "h-5 w-12"
          })]
        })]
      })
    }), /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
      className: "space-y-4",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "space-y-2",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, {
          className: "h-5 w-48"
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, {
          className: "h-4 w-full"
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, {
          className: "h-4 w-full"
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, {
          className: "h-4 w-3/4"
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "space-y-2",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, {
          className: "h-4 w-24"
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "space-y-1",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, {
            className: "h-3 w-full"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, {
            className: "h-3 w-full"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, {
            className: "h-3 w-5/6"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, {
            className: "h-3 w-4/5"
          })]
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
        className: "pt-4 border-t",
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "flex items-center justify-between",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex items-center space-x-4",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, {
              className: "h-4 w-20"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, {
              className: "h-4 w-16"
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex items-center space-x-2",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, {
              className: "h-8 w-24"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, {
              className: "h-8 w-32"
            })]
          })]
        })
      })]
    })]
  });
}
const getApiUrl = () => "";
function TranscriptCard({
  transcript
}) {
  const [, setLocation] = useLocation();
  const handleStockClick = () => setLocation(`/stock/${transcript.ticker}`);
  const handleViewTranscript = () => {
    setLocation(`/transcript/${transcript.id}`);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
    className: "hover:shadow-lg transition-shadow",
    children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "flex items-start justify-between",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "flex items-center space-x-3",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center cursor-pointer hover:bg-primary/20 transition-colors",
            onClick: handleStockClick,
            children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
              className: "text-lg font-bold text-primary",
              children: transcript.ticker.charAt(0)
            })
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "flex items-center space-x-2",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h3", {
                className: "font-semibold text-lg",
                children: transcript.ticker
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, {
                variant: "outline",
                children: [transcript.quarter, " ", transcript.year]
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
              className: "text-sm text-muted-foreground",
              children: transcript.company_name
            })]
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
          className: "flex items-center space-x-2"
        })]
      })
    }), /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
      className: "space-y-4",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h4", {
          className: "font-medium mb-2",
          children: `${transcript.ticker} ${transcript.quarter} ${transcript.year} Earnings Call`
        }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
          className: "text-sm text-muted-foreground leading-relaxed",
          children: reactExports.useMemo(() => {
            try {
              let parsed = null;
              if (typeof transcript.ai_summary === "object" && transcript.ai_summary !== null) {
                parsed = transcript.ai_summary;
              } else if (typeof transcript.ai_summary === "string") {
                parsed = JSON.parse(transcript.ai_summary);
              }
              let summary;
              if (parsed?.summary && typeof parsed.summary === "string") {
                summary = parsed.summary;
              } else if (typeof parsed === "string") {
                summary = parsed;
              } else if (parsed?.text && typeof parsed.text === "string") {
                summary = parsed.text;
              }
              return summary ? summary.substring(0, 500) + (summary.length > 500 ? "…" : "") : "Summary not available yet.";
            } catch (error) {
              console.error("Error parsing transcript summary:", error);
              return "Summary not available yet.";
            }
          }, [transcript.ai_summary])
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h5", {
          className: "text-sm font-medium mb-2",
          children: "Key Highlights"
        }), /* @__PURE__ */ jsxRuntimeExports.jsx("ul", {
          className: "space-y-1",
          children: reactExports.useMemo(() => {
            try {
              const parsed = transcript.ai_summary ? JSON.parse(transcript.ai_summary) : null;
              let highlights = [];
              if (parsed?.keyInsights) {
                highlights = parsed.keyInsights;
              } else if (parsed?.financialHighlights) {
                highlights = parsed.financialHighlights;
              } else if (parsed?.key_insights) {
                highlights = parsed.key_insights;
              } else if (parsed?.financial_highlights) {
                highlights = parsed.financial_highlights;
              }
              return highlights.length > 0 ? highlights.slice(0, 4).map((h, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", {
                className: "text-xs text-muted-foreground flex items-start space-x-2",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                  className: "w-1 h-1 bg-primary rounded-full mt-2 flex-shrink-0"
                }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                  children: h
                })]
              }, idx)) : [/* @__PURE__ */ jsxRuntimeExports.jsx("li", {
                className: "text-xs text-muted-foreground",
                children: "Key insights available in full transcript."
              }, "no-highlights")];
            } catch {
              return null;
            }
          }, [transcript.ai_summary])
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "flex items-center justify-between pt-2 border-t",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "flex items-center space-x-4 text-xs text-muted-foreground",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex items-center space-x-1",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Calendar, {
              className: "h-3 w-3"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
              children: transcript.call_date ? new Date(transcript.call_date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "2-digit"
              }) : "-"
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "flex items-center space-x-1"
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "flex items-center space-x-2",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
            variant: "outline",
            size: "sm",
            onClick: handleStockClick,
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, {
              className: "h-3 w-3 mr-1"
            }), "View Charts"]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
            size: "sm",
            onClick: handleViewTranscript,
            className: "bg-gradient-to-r from-teya-green via-teya-green-dark to-teya-green hover:from-teya-green-dark hover:via-teya-green hover:to-teya-green-dark text-rich-black font-semibold",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Play, {
              className: "h-3 w-3 mr-1"
            }), "Read Transcript"]
          })]
        })]
      })]
    })]
  });
}
function Transcripts() {
  const [searchQuery, setSearchQuery] = reactExports.useState("");
  const [selectedQuarter, setSelectedQuarter] = reactExports.useState("all");
  const [selectedSentiment, setSelectedSentiment] = reactExports.useState("all");
  const [selectedSort, setSelectedSort] = reactExports.useState("recent");
  const {
    isColdStart,
    coldStartMessage
  } = useColdStartHandler();
  const {
    data: apiData,
    isLoading,
    error
  } = useQuery({
    queryKey: ["/api/transcripts", searchQuery, selectedQuarter, selectedSentiment, selectedSort],
    queryFn: async () => {
      const api = getApiUrl();
      const params = new URLSearchParams();
      params.set("limit", "50");
      if (searchQuery) params.set("ticker", searchQuery.toUpperCase());
      if (selectedQuarter !== "all") params.set("quarter", selectedQuarter);
      console.log("🔥 FETCHING TRANSCRIPTS:", `${api}/api/transcripts?${params.toString()}`);
      const res = await fetch(`${api}/api/transcripts?${params.toString()}`, {
        headers: {
          "Cache-Control": "no-cache",
          "Content-Type": "application/json"
        }
      });
      if (!res.ok) {
        console.error("❌ API ERROR:", res.status, res.statusText);
        throw new Error(`Failed to fetch transcripts: ${res.status}`);
      }
      const data = await res.json();
      console.log("✅ API SUCCESS:", data);
      if (!data.success) {
        throw new Error("API returned success: false");
      }
      return data;
    },
    staleTime: 30 * 1e3,
    // Reduced to 30 seconds for testing
    retry: 3,
    refetchOnMount: true,
    refetchOnWindowFocus: true
  });
  console.log("🔍 QUERY STATE:", {
    isLoading,
    error: error?.message,
    dataCount: apiData?.data?.length
  });
  const sortedTranscripts = reactExports.useMemo(() => {
    const list = apiData?.data || [];
    const bySearch = list.filter((t) => {
      if (!searchQuery) return true;
      const s = searchQuery.toLowerCase();
      return t.ticker.toLowerCase().includes(s) || (t.company_name || "").toLowerCase().includes(s);
    });
    const byQuarter = selectedQuarter === "all" ? bySearch : bySearch.filter((t) => t.quarter === selectedQuarter);
    const arr = [...byQuarter];
    switch (selectedSort) {
      case "recent":
        return arr.sort((a, b) => new Date(b.published_at || b.call_date || "").getTime() - new Date(a.published_at || a.call_date || "").getTime());
      case "symbol":
        return arr.sort((a, b) => a.ticker.localeCompare(b.ticker));
      default:
        return arr;
    }
  }, [apiData, searchQuery, selectedQuarter, selectedSort]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(MainLayout, {
    children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
      className: "container mx-auto px-6 py-8 max-w-7xl",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "mb-8",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "flex items-center gap-3 mb-4",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "p-2 bg-primary/10 rounded-xl",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, {
              className: "h-6 w-6 text-primary"
            })
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h1", {
              className: "text-3xl font-bold text-foreground",
              children: "Earnings Transcripts"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
              className: "text-muted-foreground",
              children: "AI-powered summaries and analysis of earnings calls"
            })]
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "flex flex-col sm:flex-row gap-4",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "relative flex-1",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Search, {
              className: "absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(Input, {
              placeholder: "Search by company or symbol...",
              value: searchQuery,
              onChange: (e) => setSearchQuery(e.target.value),
              className: "pl-10"
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, {
            value: selectedQuarter,
            onValueChange: setSelectedQuarter,
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, {
              className: "w-full sm:w-40",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {
                placeholder: "Quarter"
              })
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, {
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                value: "all",
                children: "All Quarters"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                value: "Q1",
                children: "Q1"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                value: "Q2",
                children: "Q2"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                value: "Q3",
                children: "Q3"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                value: "Q4",
                children: "Q4"
              })]
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, {
            value: selectedSentiment,
            onValueChange: setSelectedSentiment,
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, {
              className: "w-full sm:w-40",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {
                placeholder: "Sentiment"
              })
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, {
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                value: "all",
                children: "All Sentiment"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                value: "positive",
                children: "Positive"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                value: "neutral",
                children: "Neutral"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                value: "negative",
                children: "Negative"
              })]
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, {
            value: selectedSort,
            onValueChange: setSelectedSort,
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, {
              className: "w-full sm:w-40",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {
                placeholder: "Sort by"
              })
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, {
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                value: "recent",
                children: "Most Recent"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                value: "rating",
                children: "Highest Rated"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                value: "symbol",
                children: "Symbol A-Z"
              })]
            })]
          })]
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Tabs, {
        defaultValue: "recent",
        className: "space-y-6",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(TabsList, {
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, {
            value: "recent",
            children: "Recent Transcripts"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, {
            value: "trending",
            children: "Trending"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, {
            value: "favorites",
            children: "Favorites"
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, {
          value: "recent",
          className: "space-y-6",
          children: isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "space-y-4",
            children: [isColdStart && /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
              className: "text-center p-4 bg-blue-50 dark:bg-blue-950/50 rounded-lg border border-blue-200 dark:border-blue-800",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                className: "text-sm text-blue-800 dark:text-blue-200",
                children: coldStartMessage
              })
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
              className: "grid grid-cols-1 lg:grid-cols-2 gap-6",
              children: [...Array(6)].map((_, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(TranscriptCardSkeleton, {}, i))
            })]
          }) : error ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "text-center py-12",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(FileText, {
              className: "h-12 w-12 text-red-500 mx-auto mb-4"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("h3", {
              className: "text-lg font-medium mb-2 text-red-600",
              children: "API Error"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
              className: "text-muted-foreground mb-4",
              children: error.message
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
              className: "text-xs text-muted-foreground",
              children: "Check console logs for details"
            })]
          }) : sortedTranscripts.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "grid grid-cols-1 lg:grid-cols-2 gap-6",
            children: sortedTranscripts.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx(TranscriptCard, {
              transcript: t
            }, t.id))
          }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "text-center py-12",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(FileText, {
              className: "h-12 w-12 text-muted-foreground mx-auto mb-4"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("h3", {
              className: "text-lg font-medium mb-2",
              children: "No transcripts found"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
              className: "text-muted-foreground",
              children: "Try adjusting your filters or search query"
            })]
          })
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, {
          value: "trending",
          className: "space-y-6",
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "text-center py-12",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, {
              className: "h-12 w-12 text-muted-foreground mx-auto mb-4"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("h3", {
              className: "text-lg font-medium mb-2",
              children: "Trending Transcripts"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
              className: "text-muted-foreground",
              children: "Most discussed earnings calls this week"
            })]
          })
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, {
          value: "favorites",
          className: "space-y-6",
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "text-center py-12",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Star, {
              className: "h-12 w-12 text-muted-foreground mx-auto mb-4"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("h3", {
              className: "text-lg font-medium mb-2",
              children: "Your Favorites"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
              className: "text-muted-foreground",
              children: "Save transcripts to access them quickly"
            })]
          })
        })]
      })]
    })
  });
}
export {
  Transcripts as default
};
