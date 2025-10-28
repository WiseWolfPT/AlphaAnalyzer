import { e as createLucideIcon, r as reactExports, U as toast, u as useLocation, j as jsxRuntimeExports, f as cn, X, C as Card, n as TrendingUp, a as CardHeader, c as CardContent, B as Button, T as TrendingDown, b as CardTitle, L as Label } from "./index-DF734YkB.js";
import { M as MainLayout, D as DropdownMenu, a as DropdownMenuTrigger, b as DropdownMenuContent, c as DropdownMenuItem, d as DropdownMenuSeparator, H as Heart } from "./main-layout-iPfLAwEH.js";
import { B as Badge } from "./badge-Bax4ZZX3.js";
import { D as Dialog, b as DialogContent, c as DialogHeader, d as DialogTitle, f as DialogFooter } from "./dialog-B0u0SV5P.js";
import { I as Input } from "./input-vX2xFcRS.js";
import { T as Tabs, a as TabsList, b as TabsTrigger, c as TabsContent } from "./tabs-CPUG2mtF.js";
import { a as useCachedBatchQuotes } from "./use-cache-data-WpPFNsyq.js";
import { S as Search } from "./search-CySG90ju.js";
import { C as Clock } from "./clock-CEwJtTm9.js";
import { u as useStockQuote } from "./use-market-data-B1DbYYS9.js";
import { W as Wifi } from "./wifi-Cr-Lls-T.js";
import { L as LoaderCircle } from "./loader-circle-Cj-w8NSX.js";
import { A as ArrowUp, a as ArrowDown } from "./arrow-up-B4M5gJ8s.js";
import { E as Eye } from "./eye-DQw-lb5A.js";
import { P as Plus } from "./plus-DmsdXgBw.js";
import { T as Trash2 } from "./trash-2-BYXtUTac.js";
import "./use-auth-monitoring-Ca9Wv08z.js";
import "./mail-D5HopcQP.js";
import "./lock-C5qTkNPd.js";
import "./user-C46AQImy.js";
import "./menu-CG6pfADK.js";
import "./chart-column-DNzw3S_G.js";
import "./file-text-BCjG82i7.js";
import "./log-in-CA1V17qY.js";
import "./select-Bm8Ccf9j.js";
import "./index-IXOTxK3N.js";
import "./index-Dx7UitrF.js";
import "./chevron-down-BYhiF8im.js";
import "./scroll-area-BRs9U-pP.js";
import "./index-DXvlFXpR.js";
import "./useQuery-C9HFImIm.js";
import "./index--4L2OUQN.js";
import "./api-BsiXYgjJ.js";
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const EllipsisVertical = createLucideIcon("EllipsisVertical", [
  ["circle", { cx: "12", cy: "12", r: "1", key: "41hilf" }],
  ["circle", { cx: "12", cy: "5", r: "1", key: "gxeob9" }],
  ["circle", { cx: "12", cy: "19", r: "1", key: "lyex9k" }]
]);
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Pen = createLucideIcon("Pen", [
  [
    "path",
    {
      d: "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",
      key: "1a8usu"
    }
  ]
]);
const WATCHLISTS_KEY = "alfalyzer-watchlists";
const DEFAULT_WATCHLIST_ID = "default";
function useWatchlists() {
  const [watchlists, setWatchlists] = reactExports.useState([]);
  const [isLoading, setIsLoading] = reactExports.useState(true);
  reactExports.useEffect(() => {
    try {
      const stored = localStorage.getItem(WATCHLISTS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setWatchlists(parsed.map((w) => ({
          ...w,
          createdAt: new Date(w.createdAt),
          updatedAt: new Date(w.updatedAt)
        })));
      } else {
        const defaultWatchlist = {
          id: DEFAULT_WATCHLIST_ID,
          name: "My Watchlist",
          symbols: [],
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        };
        setWatchlists([defaultWatchlist]);
        localStorage.setItem(WATCHLISTS_KEY, JSON.stringify([defaultWatchlist]));
      }
    } catch (error) {
      console.error("Failed to load watchlists:", error);
      toast({
        title: "Error",
        description: "Failed to load watchlists",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, []);
  const saveWatchlists = reactExports.useCallback((lists) => {
    try {
      localStorage.setItem(WATCHLISTS_KEY, JSON.stringify(lists));
      setWatchlists(lists);
    } catch (error) {
      console.error("Failed to save watchlists:", error);
      toast({
        title: "Error",
        description: "Failed to save watchlists",
        variant: "destructive"
      });
    }
  }, []);
  const createWatchlist = reactExports.useCallback((name) => {
    const newWatchlist = {
      id: Date.now().toString(),
      name,
      symbols: [],
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    };
    const updated = [...watchlists, newWatchlist];
    saveWatchlists(updated);
    toast({
      title: "Success",
      description: `Watchlist "${name}" created`
    });
    return newWatchlist;
  }, [watchlists, saveWatchlists]);
  const renameWatchlist = reactExports.useCallback((id, newName) => {
    const updated = watchlists.map((w) => w.id === id ? {
      ...w,
      name: newName,
      updatedAt: /* @__PURE__ */ new Date()
    } : w);
    saveWatchlists(updated);
    toast({
      title: "Success",
      description: "Watchlist renamed"
    });
  }, [watchlists, saveWatchlists]);
  const deleteWatchlist = reactExports.useCallback((id) => {
    if (id === DEFAULT_WATCHLIST_ID) {
      toast({
        title: "Error",
        description: "Cannot delete the default watchlist",
        variant: "destructive"
      });
      return;
    }
    const watchlist = watchlists.find((w) => w.id === id);
    const updated = watchlists.filter((w) => w.id !== id);
    saveWatchlists(updated);
    toast({
      title: "Success",
      description: `Watchlist "${watchlist?.name}" deleted`
    });
  }, [watchlists, saveWatchlists]);
  const addSymbolToWatchlist = reactExports.useCallback((watchlistId, symbol) => {
    const updated = watchlists.map((w) => {
      if (w.id === watchlistId) {
        if (w.symbols.includes(symbol)) {
          toast({
            title: "Info",
            description: `${symbol} is already in this watchlist`
          });
          return w;
        }
        return {
          ...w,
          symbols: [...w.symbols, symbol],
          updatedAt: /* @__PURE__ */ new Date()
        };
      }
      return w;
    });
    saveWatchlists(updated);
    toast({
      title: "Success",
      description: `${symbol} added to watchlist`
    });
  }, [watchlists, saveWatchlists]);
  const removeSymbolFromWatchlist = reactExports.useCallback((watchlistId, symbol) => {
    const updated = watchlists.map((w) => {
      if (w.id === watchlistId) {
        return {
          ...w,
          symbols: w.symbols.filter((s) => s !== symbol),
          updatedAt: /* @__PURE__ */ new Date()
        };
      }
      return w;
    });
    saveWatchlists(updated);
    toast({
      title: "Success",
      description: `${symbol} removed from watchlist`
    });
  }, [watchlists, saveWatchlists]);
  const reorderSymbols = reactExports.useCallback((watchlistId, newOrder) => {
    const updated = watchlists.map((w) => {
      if (w.id === watchlistId) {
        return {
          ...w,
          symbols: newOrder,
          updatedAt: /* @__PURE__ */ new Date()
        };
      }
      return w;
    });
    saveWatchlists(updated);
  }, [watchlists, saveWatchlists]);
  const isSymbolInWatchlist = reactExports.useCallback((symbol, watchlistId) => {
    if (watchlistId) {
      const watchlist = watchlists.find((w) => w.id === watchlistId);
      return watchlist?.symbols.includes(symbol) || false;
    }
    return watchlists.some((w) => w.symbols.includes(symbol));
  }, [watchlists]);
  const getDefaultWatchlist = reactExports.useCallback(() => {
    return watchlists.find((w) => w.id === DEFAULT_WATCHLIST_ID) || watchlists[0];
  }, [watchlists]);
  return {
    watchlists,
    isLoading,
    createWatchlist,
    renameWatchlist,
    deleteWatchlist,
    addSymbolToWatchlist,
    removeSymbolFromWatchlist,
    reorderSymbols,
    isSymbolInWatchlist,
    getDefaultWatchlist
  };
}
function OptimizedSearchBar({
  allStocks,
  onStockSelect,
  placeholder = "Search stocks by symbol or name (e.g., AAPL, Apple)...",
  className
}) {
  const [query, setQuery] = reactExports.useState("");
  const [suggestions, setSuggestions] = reactExports.useState([]);
  const [showSuggestions, setShowSuggestions] = reactExports.useState(false);
  const [selectedIndex, setSelectedIndex] = reactExports.useState(-1);
  const [recentSearches, setRecentSearches] = reactExports.useState([]);
  const [popularSearches] = reactExports.useState(["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA"]);
  const [, setLocation] = useLocation();
  const inputRef = reactExports.useRef(null);
  const suggestionsRef = reactExports.useRef(null);
  const debounceRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    const stored = localStorage.getItem("alfalyzer-recent-searches");
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored).slice(0, 5));
      } catch (e) {
        console.error("Failed to parse recent searches:", e);
      }
    }
  }, []);
  const saveToRecentSearches = (symbol) => {
    const updated = [symbol, ...recentSearches.filter((s) => s !== symbol)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem("alfalyzer-recent-searches", JSON.stringify(updated));
  };
  const performSearch = reactExports.useCallback((searchQuery) => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      return;
    }
    const upperQuery = searchQuery.toUpperCase();
    const filtered = allStocks.filter((stock) => stock.symbol.toUpperCase().includes(upperQuery) || stock.name.toUpperCase().includes(upperQuery)).sort((a, b) => {
      if (a.symbol.toUpperCase() === upperQuery) return -1;
      if (b.symbol.toUpperCase() === upperQuery) return 1;
      const aStartsWithSymbol = a.symbol.toUpperCase().startsWith(upperQuery);
      const bStartsWithSymbol = b.symbol.toUpperCase().startsWith(upperQuery);
      if (aStartsWithSymbol && !bStartsWithSymbol) return -1;
      if (!aStartsWithSymbol && bStartsWithSymbol) return 1;
      const aContainsSymbol = a.symbol.toUpperCase().includes(upperQuery);
      const bContainsSymbol = b.symbol.toUpperCase().includes(upperQuery);
      if (aContainsSymbol && !bContainsSymbol) return -1;
      if (!aContainsSymbol && bContainsSymbol) return 1;
      const aStartsWithName = a.name.toUpperCase().startsWith(upperQuery);
      const bStartsWithName = b.name.toUpperCase().startsWith(upperQuery);
      if (aStartsWithName && !bStartsWithName) return -1;
      if (!aStartsWithName && bStartsWithName) return 1;
      return a.symbol.localeCompare(b.symbol);
    }).slice(0, 10);
    setSuggestions(filtered);
    setSelectedIndex(-1);
  }, [allStocks]);
  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    setShowSuggestions(true);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      performSearch(value);
    }, 300);
  };
  const handleKeyDown = (e) => {
    if (!showSuggestions) return;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => prev < suggestions.length - 1 ? prev + 1 : prev);
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => prev > 0 ? prev - 1 : -1);
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          selectStock(suggestions[selectedIndex].symbol);
        } else if (suggestions.length > 0) {
          selectStock(suggestions[0].symbol);
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };
  const selectStock = (symbol) => {
    saveToRecentSearches(symbol);
    setQuery("");
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    if (onStockSelect) {
      onStockSelect(symbol);
    } else {
      setLocation(`/stock/${symbol}`);
    }
  };
  const handleClear = () => {
    setQuery("");
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };
  reactExports.useEffect(() => {
    const handleClickOutside = (event) => {
      if (inputRef.current && !inputRef.current.contains(event.target) && suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  reactExports.useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
    className: cn("relative w-full", className),
    children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
      className: "relative",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Search, {
        className: "absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5"
      }), /* @__PURE__ */ jsxRuntimeExports.jsx("input", {
        ref: inputRef,
        type: "text",
        value: query,
        onChange: handleInputChange,
        onKeyDown: handleKeyDown,
        onFocus: () => setShowSuggestions(true),
        placeholder,
        className: "w-full pl-10 pr-10 py-3 border border-teya-green/20 rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-teya-green/50 focus:border-teya-green"
      }), query && /* @__PURE__ */ jsxRuntimeExports.jsx("button", {
        onClick: handleClear,
        className: "absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, {
          className: "w-4 h-4"
        })
      })]
    }), showSuggestions && /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
      ref: suggestionsRef,
      className: "absolute z-50 w-full mt-2 max-h-[400px] overflow-y-auto shadow-lg border-teya-green/20",
      children: [suggestions.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "p-2",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
          className: "text-xs text-muted-foreground px-2 py-1",
          children: "Search Results"
        }), suggestions.map((stock, index) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
          className: cn("px-3 py-2 cursor-pointer rounded-md transition-colors", "hover:bg-teya-green/10", selectedIndex === index && "bg-teya-green/20"),
          onClick: () => selectStock(stock.symbol),
          onMouseEnter: () => setSelectedIndex(index),
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex items-center justify-between",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "flex-1",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "flex items-center gap-2",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                  className: "font-semibold",
                  children: stock.symbol
                }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                  className: "text-sm text-muted-foreground truncate max-w-[200px]",
                  children: stock.name
                })]
              }), stock.sector && /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, {
                variant: "outline",
                className: "text-xs mt-1",
                children: stock.sector
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, {
              className: "w-4 h-4 text-muted-foreground"
            })]
          })
        }, stock.symbol))]
      }), query && suggestions.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "p-4 text-center text-muted-foreground",
        children: ['No stocks found for "', query, '"']
      }), !query && recentSearches.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "p-2 border-t",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "text-xs text-muted-foreground px-2 py-1 flex items-center gap-1",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Clock, {
            className: "w-3 h-3"
          }), "Recent Searches"]
        }), recentSearches.map((symbol) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
          className: "px-3 py-2 cursor-pointer rounded-md hover:bg-teya-green/10 transition-colors",
          onClick: () => selectStock(symbol),
          children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
            className: "font-medium",
            children: symbol
          })
        }, symbol))]
      }), !query && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "p-2 border-t",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "text-xs text-muted-foreground px-2 py-1 flex items-center gap-1",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, {
            className: "w-3 h-3"
          }), "Popular Searches"]
        }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
          className: "flex flex-wrap gap-2 p-2",
          children: popularSearches.map((symbol) => /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, {
            variant: "outline",
            className: "cursor-pointer hover:bg-teya-green/10 transition-colors",
            onClick: () => selectStock(symbol),
            children: symbol
          }, symbol))
        })]
      })]
    })]
  });
}
function RealtimeStockCard({
  symbol,
  companyName,
  industry,
  sector,
  onRemove,
  className
}) {
  const [, setLocation] = useLocation();
  const {
    data: quote,
    isLoading,
    error,
    isRealtime
  } = useStockQuote(symbol);
  const handleCardClick = () => {
    setLocation(`/stock/${symbol}`);
  };
  const isPositive = quote ? (quote.change ?? 0) >= 0 : false;
  const changeColor = isPositive ? "text-green-600" : "text-red-600";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
    className: cn("relative overflow-hidden cursor-pointer transition-all hover:shadow-lg group", className),
    onClick: handleCardClick,
    children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
      className: "pb-2",
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "flex items-start justify-between",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "flex-1",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex items-center gap-2",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h3", {
              className: "text-lg font-semibold",
              children: symbol
            }), isRealtime && /* @__PURE__ */ jsxRuntimeExports.jsx(Wifi, {
              className: "w-3 h-3 text-green-500",
              title: "Dados em tempo real"
            })]
          }), companyName && /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
            className: "text-sm text-muted-foreground line-clamp-1",
            children: companyName
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, {
          variant: "secondary",
          className: "text-xs",
          children: sector || "Technology"
        })]
      })
    }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
      className: "space-y-3",
      children: error ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
        className: "text-sm text-red-600",
        children: "Erro ao carregar dados"
      }) : isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
        className: "flex items-center justify-center h-20",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, {
          className: "h-6 w-6 animate-spin text-muted-foreground"
        })
      }) : quote ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, {
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "flex items-end justify-between",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
              className: "text-2xl font-bold",
              children: ["$", (quote?.price ?? 0).toFixed(2)]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: cn("flex items-center gap-1 text-sm", changeColor),
              children: [isPositive ? /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowUp, {
                className: "h-4 w-4"
              }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowDown, {
                className: "h-4 w-4"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                children: Math.abs(quote.change ?? 0).toFixed(2)
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
                children: ["(", Math.abs(quote.changePercent ?? 0).toFixed(2), "%)"]
              })]
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "text-right",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("p", {
              className: "text-xs text-muted-foreground",
              children: "Volume"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
              className: "text-sm font-medium",
              children: quote.volume ? (quote.volume / 1e6).toFixed(2) + "M" : "N/A"
            })]
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "flex items-center justify-between pt-2 border-t",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex items-center gap-2",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, {
              className: "h-4 w-4 text-muted-foreground"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
              className: "text-xs text-muted-foreground",
              children: industry || "Technology"
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
            variant: "ghost",
            size: "sm",
            className: "opacity-0 group-hover:opacity-100 transition-opacity",
            onClick: (e) => {
              e.stopPropagation();
              onRemove?.();
            },
            children: "Remover"
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
          className: cn("absolute inset-0 opacity-0 pointer-events-none transition-opacity", "bg-gradient-to-r", isPositive ? "from-green-500/10" : "from-red-500/10")
        })]
      }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
        className: "text-sm text-muted-foreground text-center",
        children: "Sem dados disponíveis"
      })
    })]
  });
}
const getStockInfo = (symbol) => {
  const stockInfo = {
    "AAPL": {
      name: "Apple Inc.",
      sector: "Technology"
    },
    "MSFT": {
      name: "Microsoft Corporation",
      sector: "Technology"
    },
    "GOOGL": {
      name: "Alphabet Inc.",
      sector: "Technology"
    },
    "AMZN": {
      name: "Amazon.com Inc.",
      sector: "Consumer Discretionary"
    },
    "TSLA": {
      name: "Tesla Inc.",
      sector: "Consumer Discretionary"
    },
    "META": {
      name: "Meta Platforms Inc.",
      sector: "Technology"
    },
    "NVDA": {
      name: "NVIDIA Corporation",
      sector: "Technology"
    },
    "JPM": {
      name: "JPMorgan Chase & Co.",
      sector: "Financial Services"
    },
    "V": {
      name: "Visa Inc.",
      sector: "Financial Services"
    },
    "WMT": {
      name: "Walmart Inc.",
      sector: "Consumer Staples"
    }
  };
  return stockInfo[symbol] || {
    name: `${symbol} Corporation`,
    sector: "Technology"
  };
};
function WatchlistsV2() {
  useLocation();
  const {
    watchlists,
    isLoading,
    createWatchlist,
    renameWatchlist,
    deleteWatchlist,
    addSymbolToWatchlist,
    removeSymbolFromWatchlist,
    getDefaultWatchlist
  } = useWatchlists();
  const [selectedWatchlistId, setSelectedWatchlistId] = reactExports.useState(getDefaultWatchlist()?.id || "default");
  const [newWatchlistName, setNewWatchlistName] = reactExports.useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = reactExports.useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = reactExports.useState(false);
  const [isAddStockDialogOpen, setIsAddStockDialogOpen] = reactExports.useState(false);
  const [useRealtime, setUseRealtime] = reactExports.useState(true);
  const [searchQuery, setSearchQuery] = reactExports.useState("");
  const selectedWatchlist = watchlists.find((w) => w.id === selectedWatchlistId) || getDefaultWatchlist();
  const watchlistSymbols = selectedWatchlist?.symbols || [];
  const {
    data: quotesData,
    isLoading: quotesLoading,
    refetch
  } = useCachedBatchQuotes(watchlistSymbols, {
    enabled: watchlistSymbols.length > 0,
    refetchInterval: useRealtime ? 3e4 : void 0
    // Refresh every 30 seconds if realtime
  });
  const handleCreateWatchlist = () => {
    if (newWatchlistName.trim()) {
      const newWatchlist = createWatchlist(newWatchlistName);
      setSelectedWatchlistId(newWatchlist.id);
      setNewWatchlistName("");
      setIsCreateDialogOpen(false);
    }
  };
  const handleRenameWatchlist = () => {
    if (selectedWatchlist && newWatchlistName.trim()) {
      renameWatchlist(selectedWatchlist.id, newWatchlistName);
      setNewWatchlistName("");
      setIsRenameDialogOpen(false);
    }
  };
  const handleDeleteWatchlist = () => {
    if (selectedWatchlist && selectedWatchlist.id !== "default") {
      deleteWatchlist(selectedWatchlist.id);
      setSelectedWatchlistId(getDefaultWatchlist()?.id || "default");
    }
  };
  const handleAddStock = (symbol) => {
    if (selectedWatchlist) {
      addSymbolToWatchlist(selectedWatchlist.id, symbol);
      setIsAddStockDialogOpen(false);
    }
  };
  const handleRemoveStock = (symbol) => {
    if (selectedWatchlist) {
      removeSymbolFromWatchlist(selectedWatchlist.id, symbol);
    }
  };
  const calculateTotalChange = () => {
    if (!quotesData?.quotes) return {
      value: 0,
      percent: 0
    };
    const total = quotesData.quotes.reduce((sum, quote) => {
      const changePercent = quote?.changePercent || 0;
      return sum + changePercent;
    }, 0);
    const avgPercent = quotesData.quotes.length > 0 ? total / quotesData.quotes.length : 0;
    return {
      value: total,
      percent: avgPercent
    };
  };
  const totalChange = calculateTotalChange();
  if (isLoading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(MainLayout, {
      children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
        className: "flex items-center justify-center h-64",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
          className: "animate-spin rounded-full h-12 w-12 border-b-2 border-primary"
        })
      })
    });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(MainLayout, {
    children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
      className: "space-y-6",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "flex items-center justify-between",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("h1", {
            className: "text-3xl font-bold tracking-tight flex items-center gap-2",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Eye, {
              className: "w-8 h-8 text-teya-green"
            }), "Watchlists"]
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
            className: "text-muted-foreground",
            children: "Track your favorite stocks in organized lists"
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "flex items-center gap-2",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
            variant: useRealtime ? "default" : "outline",
            size: "sm",
            onClick: () => setUseRealtime(!useRealtime),
            className: useRealtime ? "bg-teya-green hover:bg-teya-green-dark text-black" : "",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Wifi, {
              className: "w-4 h-4"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
              className: "ml-1 hidden sm:inline",
              children: "Real-time"
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
            onClick: () => setIsCreateDialogOpen(true),
            className: "bg-teya-green hover:bg-teya-green-dark text-black",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Plus, {
              className: "w-4 h-4 mr-2"
            }), "New Watchlist"]
          })]
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Tabs, {
        value: selectedWatchlistId,
        onValueChange: setSelectedWatchlistId,
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "flex items-center justify-between mb-4",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(TabsList, {
            className: "grid grid-cols-auto gap-1",
            children: watchlists.map((watchlist) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsTrigger, {
              value: watchlist.id,
              children: [watchlist.name, watchlist.symbols.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, {
                variant: "secondary",
                className: "ml-2",
                children: watchlist.symbols.length
              })]
            }, watchlist.id))
          }), selectedWatchlist && /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenu, {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuTrigger, {
              asChild: true,
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
                variant: "ghost",
                size: "sm",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(EllipsisVertical, {
                  className: "w-4 h-4"
                })
              })
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuContent, {
              align: "end",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, {
                onClick: () => {
                  setNewWatchlistName(selectedWatchlist.name);
                  setIsRenameDialogOpen(true);
                },
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Pen, {
                  className: "w-4 h-4 mr-2"
                }), "Rename"]
              }), selectedWatchlist.id !== "default" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, {
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuSeparator, {}), /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, {
                  onClick: handleDeleteWatchlist,
                  className: "text-red-600",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, {
                    className: "w-4 h-4 mr-2"
                  }), "Delete"]
                })]
              })]
            })]
          })]
        }), watchlists.map((watchlist) => /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, {
          value: watchlist.id,
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "space-y-4",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Card, {
              className: "border-teya-green/20",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
                className: "p-6",
                children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "grid grid-cols-1 md:grid-cols-3 gap-4",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                      className: "text-sm text-muted-foreground",
                      children: "Total Stocks"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                      className: "text-2xl font-bold",
                      children: watchlist.symbols.length
                    })]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                      className: "text-sm text-muted-foreground",
                      children: "Daily Change"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
                      className: cn("text-2xl font-bold flex items-center gap-1", totalChange.percent >= 0 ? "text-green-600" : "text-red-600"),
                      children: [totalChange.percent >= 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, {
                        className: "w-5 h-5"
                      }) : /* @__PURE__ */ jsxRuntimeExports.jsx(TrendingDown, {
                        className: "w-5 h-5"
                      }), totalChange.percent >= 0 ? "+" : "", totalChange.percent.toFixed(2), "%"]
                    })]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                      className: "text-sm text-muted-foreground",
                      children: "Last Updated"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
                      className: "text-sm flex items-center gap-1",
                      children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Clock, {
                        className: "w-4 h-4"
                      }), (/* @__PURE__ */ new Date()).toLocaleTimeString()]
                    })]
                  })]
                })
              })
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
              className: "border-teya-green/20",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, {
                  className: "text-lg",
                  children: "Add Stocks to Watchlist"
                })
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(OptimizedSearchBar, {
                  allStocks: ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "META", "NVDA", "JPM", "V", "WMT", "JNJ", "PG", "UNH", "MA", "HD", "DIS", "BAC", "ADBE", "NFLX", "CRM", "PFE", "TMO", "CSCO"].map((symbol) => ({
                    symbol,
                    name: getStockInfo(symbol).name,
                    sector: getStockInfo(symbol).sector
                  })),
                  onStockSelect: handleAddStock,
                  placeholder: "Search and add stocks to this watchlist..."
                })
              })]
            }), watchlist.symbols.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(Card, {
              className: "border-dashed",
              children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
                className: "p-12 text-center",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Heart, {
                  className: "w-12 h-12 text-muted-foreground mx-auto mb-4"
                }), /* @__PURE__ */ jsxRuntimeExports.jsx("h3", {
                  className: "text-lg font-medium mb-2",
                  children: "No stocks in this watchlist"
                }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                  className: "text-muted-foreground mb-4",
                  children: "Start adding stocks to track their performance"
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
                  onClick: () => setIsAddStockDialogOpen(true),
                  className: "bg-teya-green hover:bg-teya-green-dark text-black",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Plus, {
                    className: "w-4 h-4 mr-2"
                  }), "Add Your First Stock"]
                })]
              })
            }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
              className: "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4",
              children: watchlist.symbols.map((symbol) => {
                quotesData?.quotes?.find((q) => q.symbol === symbol);
                const info = getStockInfo(symbol);
                return /* @__PURE__ */ jsxRuntimeExports.jsx(RealtimeStockCard, {
                  symbol,
                  companyName: info.name,
                  industry: info.sector,
                  sector: info.sector,
                  onRemove: () => handleRemoveStock(symbol),
                  showRemoveButton: true
                }, symbol);
              })
            })]
          })
        }, watchlist.id))]
      }), /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, {
        open: isCreateDialogOpen,
        onOpenChange: setIsCreateDialogOpen,
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, {
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(DialogHeader, {
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, {
              children: "Create New Watchlist"
            })
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "space-y-4",
            children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label, {
                htmlFor: "watchlist-name",
                children: "Watchlist Name"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(Input, {
                id: "watchlist-name",
                value: newWatchlistName,
                onChange: (e) => setNewWatchlistName(e.target.value),
                placeholder: "e.g., Tech Stocks, Value Picks...",
                onKeyDown: (e) => e.key === "Enter" && handleCreateWatchlist()
              })]
            })
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
              variant: "outline",
              onClick: () => setIsCreateDialogOpen(false),
              children: "Cancel"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
              onClick: handleCreateWatchlist,
              className: "bg-teya-green hover:bg-teya-green-dark text-black",
              disabled: !newWatchlistName.trim(),
              children: "Create Watchlist"
            })]
          })]
        })
      }), /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, {
        open: isRenameDialogOpen,
        onOpenChange: setIsRenameDialogOpen,
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, {
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(DialogHeader, {
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, {
              children: "Rename Watchlist"
            })
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "space-y-4",
            children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label, {
                htmlFor: "rename-watchlist",
                children: "New Name"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(Input, {
                id: "rename-watchlist",
                value: newWatchlistName,
                onChange: (e) => setNewWatchlistName(e.target.value),
                placeholder: "Enter new name...",
                onKeyDown: (e) => e.key === "Enter" && handleRenameWatchlist()
              })]
            })
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
              variant: "outline",
              onClick: () => setIsRenameDialogOpen(false),
              children: "Cancel"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
              onClick: handleRenameWatchlist,
              className: "bg-teya-green hover:bg-teya-green-dark text-black",
              disabled: !newWatchlistName.trim(),
              children: "Rename"
            })]
          })]
        })
      })]
    })
  });
}
export {
  WatchlistsV2 as default
};
