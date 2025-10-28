import { e as createLucideIcon, r as reactExports, u as useLocation, j as jsxRuntimeExports, C as Card, c as CardContent, B as Button, n as TrendingUp, f as cn, P as Popover, q as PopoverTrigger, s as PopoverContent, L as Label, t as Switch, a as CardHeader, b as CardTitle, l as CircleCheckBig, o as Alert, p as AlertDescription, R as RefreshCw, T as TrendingDown, v as CircleAlert, h as useSupabaseAuth, w as React } from "./index-DF734YkB.js";
import { M as MainLayout } from "./main-layout-iPfLAwEH.js";
import { B as Badge } from "./badge-Bax4ZZX3.js";
import { W as WifiOff } from "./wifi-off-BwUXtVIE.js";
import { A as Activity } from "./activity-TJHkan0R.js";
import { P as Plus } from "./plus-DmsdXgBw.js";
import { a as Calculator, C as ChartColumn } from "./chart-column-DNzw3S_G.js";
import { S as Slider, U as UniversalSearch } from "./slider-CfurqznE.js";
import { S as Separator } from "./use-auth-monitoring-Ca9Wv08z.js";
import { F as Filter } from "./filter-XvEjFBoX.js";
import { D as DollarSign } from "./dollar-sign-BDD_kA4E.js";
import { G as Globe } from "./globe-b19obaKp.js";
import { P as Percent } from "./percent-DjAI93Y2.js";
import { S as Select, a as SelectTrigger, b as SelectValue, c as SelectContent, d as SelectItem } from "./select-Bm8Ccf9j.js";
import { u as useDirectFMPBatchQuotes, a as useCachedBatchQuotes } from "./use-cache-data-WpPFNsyq.js";
import { A as API_CONFIG } from "./api-BsiXYgjJ.js";
import { L as LoaderCircle } from "./loader-circle-Cj-w8NSX.js";
import { C as CircleX } from "./circle-x-Bp-yOAsa.js";
import { S as Skeleton } from "./skeleton-Cohz4q-x.js";
import { A as ArrowUp, a as ArrowDown } from "./arrow-up-B4M5gJ8s.js";
import { S as Search } from "./search-CySG90ju.js";
import { W as Wifi } from "./wifi-Cr-Lls-T.js";
import { Z as Zap } from "./zap-_XnM8rww.js";
import "./dialog-B0u0SV5P.js";
import "./index-DXvlFXpR.js";
import "./input-vX2xFcRS.js";
import "./tabs-CPUG2mtF.js";
import "./index-Dx7UitrF.js";
import "./mail-D5HopcQP.js";
import "./lock-C5qTkNPd.js";
import "./eye-DQw-lb5A.js";
import "./user-C46AQImy.js";
import "./menu-CG6pfADK.js";
import "./file-text-BCjG82i7.js";
import "./log-in-CA1V17qY.js";
import "./scroll-area-BRs9U-pP.js";
import "./index-IXOTxK3N.js";
import "./clock-CEwJtTm9.js";
import "./sparkles-b_IcKR33.js";
import "./chevron-down-BYhiF8im.js";
import "./useQuery-C9HFImIm.js";
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Building2 = createLucideIcon("Building2", [
  ["path", { d: "M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z", key: "1b4qmf" }],
  ["path", { d: "M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2", key: "i71pzd" }],
  ["path", { d: "M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2", key: "10jefs" }],
  ["path", { d: "M10 6h4", key: "1itunk" }],
  ["path", { d: "M10 10h4", key: "tcdvrf" }],
  ["path", { d: "M10 14h4", key: "kelpxr" }],
  ["path", { d: "M10 18h4", key: "1ulq68" }]
]);
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Grid3x3 = createLucideIcon("Grid3x3", [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2", key: "afitv7" }],
  ["path", { d: "M3 9h18", key: "1pudct" }],
  ["path", { d: "M3 15h18", key: "5xshup" }],
  ["path", { d: "M9 3v18", key: "fh3hqa" }],
  ["path", { d: "M15 3v18", key: "14nvp0" }]
]);
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const List = createLucideIcon("List", [
  ["path", { d: "M3 12h.01", key: "nlz23k" }],
  ["path", { d: "M3 18h.01", key: "1tta3j" }],
  ["path", { d: "M3 6h.01", key: "1rqtza" }],
  ["path", { d: "M8 12h13", key: "1za7za" }],
  ["path", { d: "M8 18h13", key: "1lx6n3" }],
  ["path", { d: "M8 6h13", key: "ik3vkj" }]
]);
const WebSocketStockCard = reactExports.memo(({
  symbol,
  companyName,
  industry,
  sector,
  initialPrice = 0,
  onRemove,
  onQuoteUpdate
}) => {
  const [, setLocation] = useLocation();
  const priceRef = reactExports.useRef(null);
  const changeRef = reactExports.useRef(null);
  const changePercentRef = reactExports.useRef(null);
  const changeIconRef = reactExports.useRef(null);
  const volumeRef = reactExports.useRef(null);
  const timestampRef = reactExports.useRef(null);
  const connectionIconRef = reactExports.useRef(null);
  const lastValuesRef = reactExports.useRef({
    price: initialPrice,
    change: 0,
    changePercent: 0,
    volume: 0,
    connected: false
  });
  const updateQuoteDisplay = (quote) => {
    if (priceRef.current && quote.price != null) {
      const newPrice = Number(quote.price);
      const oldPrice = lastValuesRef.current.price;
      priceRef.current.textContent = `$${newPrice.toFixed(2)}`;
      if (newPrice !== oldPrice) {
        priceRef.current.classList.remove("price-flash");
        void priceRef.current.offsetWidth;
        priceRef.current.classList.add("price-flash");
        lastValuesRef.current.price = newPrice;
      }
    }
    if (changeRef.current && quote.change != null) {
      const change = Number(quote.change);
      changeRef.current.textContent = change >= 0 ? `+$${Math.abs(change).toFixed(2)}` : `-$${Math.abs(change).toFixed(2)}`;
      changeRef.current.className = change >= 0 ? "text-green-600" : "text-red-600";
    }
    if (changePercentRef.current && quote.changePercent != null) {
      const changePercent = Number(quote.changePercent);
      changePercentRef.current.textContent = `${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(2)}%`;
      changePercentRef.current.className = cn("font-medium text-sm", changePercent >= 0 ? "text-green-600" : "text-red-600");
    }
    if (changeIconRef.current && quote.changePercent != null) {
      const changePercent = Number(quote.changePercent);
      const isPositive = changePercent >= 0;
      changeIconRef.current.innerHTML = "";
      const icon = document.createElement("div");
      icon.className = cn("w-4 h-4", isPositive ? "text-green-600" : "text-red-600");
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.setAttribute("fill", "none");
      svg.setAttribute("stroke", "currentColor");
      svg.setAttribute("stroke-width", "2");
      svg.setAttribute("class", icon.className);
      if (isPositive) {
        svg.innerHTML = '<line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline>';
      } else {
        svg.innerHTML = '<line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline>';
      }
      changeIconRef.current.appendChild(svg);
    }
    if (volumeRef.current && quote.volume != null) {
      const volume = Number(quote.volume);
      volumeRef.current.textContent = volume > 1e6 ? `${(volume / 1e6).toFixed(1)}M` : volume > 1e3 ? `${(volume / 1e3).toFixed(1)}K` : volume.toString();
    }
    if (timestampRef.current) {
      const now = /* @__PURE__ */ new Date();
      timestampRef.current.textContent = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
    }
    if (onQuoteUpdate) {
      onQuoteUpdate(quote);
    }
  };
  const updateConnectionStatus = (connected) => {
    if (connectionIconRef.current && connected !== lastValuesRef.current.connected) {
      connectionIconRef.current.innerHTML = "";
      const icon = document.createElement("div");
      icon.className = cn("w-3 h-3", connected ? "text-green-500" : "text-gray-400");
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.setAttribute("fill", "none");
      svg.setAttribute("stroke", "currentColor");
      svg.setAttribute("stroke-width", "2");
      svg.setAttribute("class", icon.className);
      svg.innerHTML = connected ? '<path d="M5 12.55a11 11 0 0 1 14.08 0"></path><path d="M1.42 9a16 16 0 0 1 21.16 0"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line>' : '<line x1="1" y1="1" x2="23" y2="23"></line><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path><path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line>';
      connectionIconRef.current.appendChild(svg);
      lastValuesRef.current.connected = connected;
    }
  };
  reactExports.useEffect(() => {
    if (!window.__stockCardUpdaters) {
      window.__stockCardUpdaters = /* @__PURE__ */ new Map();
    }
    window.__stockCardUpdaters.set(symbol, {
      updateQuote: updateQuoteDisplay,
      updateConnection: updateConnectionStatus
    });
    return () => {
      window.__stockCardUpdaters?.delete(symbol);
    };
  }, [symbol]);
  const handleClick = () => {
    setLocation(`/stock/${symbol}`);
  };
  const handleAddToWatchlist = reactExports.useCallback((e) => {
    e.stopPropagation();
    const watchlistStr = localStorage.getItem("watchlist");
    const watchlist = watchlistStr ? JSON.parse(watchlistStr) : [];
    if (watchlist.some((item) => item.symbol === symbol)) {
      console.log(`${symbol} is already in watchlist`);
      return;
    }
    watchlist.push({
      symbol,
      name: companyName
    });
    localStorage.setItem("watchlist", JSON.stringify(watchlist));
    console.log(`${symbol} added to watchlist`);
  }, [symbol, companyName]);
  const handleCalculateIV = (e) => {
    e.stopPropagation();
    setLocation(`/intrinsic-value?symbol=${symbol}`);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
    className: "group hover:shadow-lg transition-all duration-200 cursor-pointer border-border/50 hover:border-teya-green/30 overflow-hidden relative websocket-card",
    onClick: handleClick,
    "data-symbol": symbol,
    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
      className: "absolute top-2 right-2 z-10",
      ref: connectionIconRef,
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(WifiOff, {
        className: "w-3 h-3 text-gray-400"
      })
    }), /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
      className: "p-4",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
        className: "flex justify-between items-start mb-3",
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "flex items-center gap-2",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-sm font-bold",
            children: symbol.charAt(0)
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h3", {
              className: "font-semibold text-sm",
              children: symbol
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
              className: "text-xs text-muted-foreground truncate max-w-[120px]",
              children: companyName
            })]
          })]
        })
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "space-y-2",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "flex justify-between items-center",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
            ref: priceRef,
            className: "text-lg font-bold price-display",
            children: ["$", initialPrice.toFixed(2)]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex items-center gap-1",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
              ref: changeIconRef,
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(Activity, {
                className: "w-4 h-4 text-gray-400"
              })
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
              ref: changePercentRef,
              className: "font-medium text-sm text-muted-foreground",
              children: "0.00%"
            })]
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "flex justify-between items-center text-xs text-muted-foreground",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
            ref: changeRef,
            children: "$0.00"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "flex items-center gap-2",
            children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
              children: ["Vol: ", /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                ref: volumeRef,
                children: "-"
              })]
            })
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-2 mt-2",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
            size: "sm",
            variant: "ghost",
            className: "h-7 px-2 text-xs hover:bg-teya-green/10 hover:text-teya-green",
            onClick: handleAddToWatchlist,
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Plus, {
              className: "w-3 h-3 mr-1"
            }), "Watchlist"]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
            size: "sm",
            variant: "ghost",
            className: "h-7 px-2 text-xs hover:bg-blue-500/10 hover:text-blue-400",
            onClick: handleCalculateIV,
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Calculator, {
              className: "w-3 h-3 mr-1"
            }), "IV Calc"]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
            size: "sm",
            variant: "ghost",
            className: "h-7 px-2 text-xs hover:bg-orange-500/10 hover:text-orange-400",
            onClick: (e) => {
              e.stopPropagation();
              setLocation(`/stock/${symbol}/charts`);
            },
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, {
              className: "w-3 h-3 mr-1"
            }), "Charts"]
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
          className: "pt-2 border-t border-border/50",
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex justify-between items-center",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Badge, {
              variant: "secondary",
              className: "text-xs",
              children: sector
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
              ref: timestampRef,
              className: "text-xs text-muted-foreground",
              children: "--:--:--"
            })]
          })
        })]
      })]
    }), /* @__PURE__ */ jsxRuntimeExports.jsx("style", {
      jsx: true,
      children: `
        @keyframes priceFlash {
          0% { background-color: transparent; }
          50% { background-color: rgba(34, 197, 94, 0.2); }
          100% { background-color: transparent; }
        }
        
        .price-flash {
          animation: priceFlash 0.5s ease-in-out;
        }
      `
    })]
  });
});
WebSocketStockCard.displayName = "WebSocketStockCard";
function AdvancedFilters({
  onFiltersChange,
  availableSectors,
  className
}) {
  const [filters, setFilters] = reactExports.useState({
    sectors: [],
    showOnlyGainers: false,
    showOnlyLosers: false
  });
  const [priceRange, setPriceRange] = reactExports.useState([0, 1e3]);
  const [marketCapRange, setMarketCapRange] = reactExports.useState([0, 1e3]);
  const [peRange, setPeRange] = reactExports.useState([0, 50]);
  const [changeRange, setChangeRange] = reactExports.useState([-10, 10]);
  const [minVolume, setMinVolume] = reactExports.useState(0);
  const [isOpen, setIsOpen] = reactExports.useState(false);
  const handleSectorToggle = (sector) => {
    const newSectors = filters.sectors.includes(sector) ? filters.sectors.filter((s) => s !== sector) : [...filters.sectors, sector];
    const newFilters = {
      ...filters,
      sectors: newSectors
    };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };
  const handlePriceChange = (value2) => {
    setPriceRange([value2[0], value2[1]]);
    const newFilters = {
      ...filters,
      minPrice: value2[0] > 0 ? value2[0] : void 0,
      maxPrice: value2[1] < 1e3 ? value2[1] : void 0
    };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };
  const handleMarketCapChange = (value2) => {
    setMarketCapRange([value2[0], value2[1]]);
    const newFilters = {
      ...filters,
      minMarketCap: value2[0] > 0 ? value2[0] * 1e9 : void 0,
      maxMarketCap: value2[1] < 1e3 ? value2[1] * 1e9 : void 0
    };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };
  const handlePEChange = (value2) => {
    setPeRange([value2[0], value2[1]]);
    const newFilters = {
      ...filters,
      minPE: value2[0] > 0 ? value2[0] : void 0,
      maxPE: value2[1] < 50 ? value2[1] : void 0
    };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };
  const handleChangePercentChange = (value2) => {
    setChangeRange([value2[0], value2[1]]);
    const newFilters = {
      ...filters,
      minChangePercent: value2[0] > -10 ? value2[0] : void 0,
      maxChangePercent: value2[1] < 10 ? value2[1] : void 0
    };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };
  const handleVolumeChange = (value2) => {
    setMinVolume(value2[0]);
    const newFilters = {
      ...filters,
      minVolume: value2[0] > 0 ? value2[0] * 1e6 : void 0
    };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };
  const handleGainersToggle = (checked) => {
    const newFilters = {
      ...filters,
      showOnlyGainers: checked,
      showOnlyLosers: checked ? false : filters.showOnlyLosers
    };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };
  const handleLosersToggle = (checked) => {
    const newFilters = {
      ...filters,
      showOnlyLosers: checked,
      showOnlyGainers: checked ? false : filters.showOnlyGainers
    };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };
  const clearAllFilters = () => {
    const newFilters = {
      sectors: []
    };
    setFilters(newFilters);
    setPriceRange([0, 1e3]);
    setMarketCapRange([0, 1e3]);
    setPeRange([0, 50]);
    setChangeRange([-10, 10]);
    setMinVolume(0);
    onFiltersChange(newFilters);
  };
  const activeFiltersCount = filters.sectors.length + (filters.minPrice ? 1 : 0) + (filters.maxPrice ? 1 : 0) + (filters.minMarketCap ? 1 : 0) + (filters.maxMarketCap ? 1 : 0) + (filters.minPE ? 1 : 0) + (filters.maxPE ? 1 : 0) + (filters.minChangePercent ? 1 : 0) + (filters.maxChangePercent ? 1 : 0) + (filters.showOnlyGainers ? 1 : 0) + (filters.showOnlyLosers ? 1 : 0) + (filters.minVolume ? 1 : 0);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Popover, {
    open: isOpen,
    onOpenChange: setIsOpen,
    children: [/* @__PURE__ */ jsxRuntimeExports.jsx(PopoverTrigger, {
      asChild: true,
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
        variant: "outline",
        size: "sm",
        className: cn("gap-2", className),
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Filter, {
          className: "w-4 h-4"
        }), "Filtros Avançados", activeFiltersCount > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, {
          variant: "secondary",
          className: "ml-1",
          children: activeFiltersCount
        })]
      })
    }), /* @__PURE__ */ jsxRuntimeExports.jsx(PopoverContent, {
      className: "w-[420px] p-0",
      align: "end",
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "p-4",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "flex items-center justify-between mb-4",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h3", {
            className: "font-semibold",
            children: "Filtros Avançados"
          }), activeFiltersCount > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
            variant: "ghost",
            size: "sm",
            onClick: clearAllFilters,
            className: "text-xs text-foreground hover:bg-secondary/60 border border-border/50",
            children: "Limpar tudo"
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "space-y-4",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(Label, {
              className: "text-sm font-medium flex items-center gap-2 mb-2",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Building2, {
                className: "w-4 h-4"
              }), "Sectors"]
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
              className: "flex flex-wrap gap-2",
              children: availableSectors.map((sector) => /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, {
                variant: filters.sectors.includes(sector) ? "default" : "outline",
                className: cn("cursor-pointer transition-colors", filters.sectors.includes(sector) ? "bg-teya-green text-black hover:bg-teya-green-dark" : "hover:bg-teya-green/10"),
                onClick: () => handleSectorToggle(sector),
                children: sector
              }, sector))
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(Separator, {}), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(Label, {
              className: "text-sm font-medium flex items-center gap-2 mb-2",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(DollarSign, {
                className: "w-4 h-4"
              }), "Price Range: $", priceRange[0], " - $", priceRange[1]]
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(Slider, {
              value: priceRange,
              onValueChange: handlePriceChange,
              min: 0,
              max: 1e3,
              step: 10,
              className: "mt-2"
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(Label, {
              className: "text-sm font-medium flex items-center gap-2 mb-2",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Globe, {
                className: "w-4 h-4"
              }), "Market Cap: $", marketCapRange[0], "B - $", marketCapRange[1], "B"]
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(Slider, {
              value: marketCapRange,
              onValueChange: handleMarketCapChange,
              min: 0,
              max: 1e3,
              step: 10,
              className: "mt-2"
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(Label, {
              className: "text-sm font-medium flex items-center gap-2 mb-2",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Percent, {
                className: "w-4 h-4"
              }), "P/E Ratio: ", peRange[0], " - ", peRange[1]]
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(Slider, {
              value: peRange,
              onValueChange: handlePEChange,
              min: 0,
              max: 50,
              step: 1,
              className: "mt-2"
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(Label, {
              className: "text-sm font-medium flex items-center gap-2 mb-2",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, {
                className: "w-4 h-4"
              }), "Daily Change: ", changeRange[0], "% to ", changeRange[1], "%"]
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(Slider, {
              value: changeRange,
              onValueChange: handleChangePercentChange,
              min: -10,
              max: 10,
              step: 0.5,
              className: "mt-2"
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(Label, {
              className: "text-sm font-medium flex items-center gap-2 mb-2",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Activity, {
                className: "w-4 h-4"
              }), "Min Volume: ", minVolume, "M shares"]
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(Slider, {
              value: [minVolume],
              onValueChange: handleVolumeChange,
              min: 0,
              max: 100,
              step: 1,
              className: "mt-2"
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(Separator, {}), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "space-y-3",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "flex items-center justify-between",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label, {
                htmlFor: "gainers",
                className: "text-sm font-medium",
                children: "Show Only Gainers"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(Switch, {
                id: "gainers",
                checked: filters.showOnlyGainers || false,
                onCheckedChange: handleGainersToggle
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "flex items-center justify-between",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label, {
                htmlFor: "losers",
                className: "text-sm font-medium",
                children: "Show Only Losers"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(Switch, {
                id: "losers",
                checked: filters.showOnlyLosers || false,
                onCheckedChange: handleLosersToggle
              })]
            })]
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "mt-4 pt-4 border-t flex justify-end gap-2",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
            variant: "outline",
            size: "sm",
            onClick: () => setIsOpen(false),
            children: "Cancel"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
            size: "sm",
            onClick: () => setIsOpen(false),
            className: "bg-teya-green hover:bg-teya-green-dark text-black",
            children: "Apply Filters"
          })]
        })]
      })
    })]
  });
}
function BetaBanner() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
    style: {
      padding: "12px",
      background: "rgba(245, 158, 11, 0.1)",
      border: "1px solid rgba(245, 158, 11, 0.3)",
      borderRadius: "8px",
      color: "#d97706",
      fontSize: "14px",
      marginBottom: "20px"
    },
    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("strong", {
      children: "BETA"
    }), " Está a usar o Alpha Analyzer BETA! Junte-se à nossa comunidade para atualizações."]
  });
}
const PACKET_TYPES = /* @__PURE__ */ Object.create(null);
PACKET_TYPES["open"] = "0";
PACKET_TYPES["close"] = "1";
PACKET_TYPES["ping"] = "2";
PACKET_TYPES["pong"] = "3";
PACKET_TYPES["message"] = "4";
PACKET_TYPES["upgrade"] = "5";
PACKET_TYPES["noop"] = "6";
const PACKET_TYPES_REVERSE = /* @__PURE__ */ Object.create(null);
Object.keys(PACKET_TYPES).forEach((key) => {
  PACKET_TYPES_REVERSE[PACKET_TYPES[key]] = key;
});
const ERROR_PACKET = { type: "error", data: "parser error" };
const withNativeBlob$1 = typeof Blob === "function" || typeof Blob !== "undefined" && Object.prototype.toString.call(Blob) === "[object BlobConstructor]";
const withNativeArrayBuffer$2 = typeof ArrayBuffer === "function";
const isView$1 = (obj) => {
  return typeof ArrayBuffer.isView === "function" ? ArrayBuffer.isView(obj) : obj && obj.buffer instanceof ArrayBuffer;
};
const encodePacket = ({ type, data }, supportsBinary, callback) => {
  if (withNativeBlob$1 && data instanceof Blob) {
    if (supportsBinary) {
      return callback(data);
    } else {
      return encodeBlobAsBase64(data, callback);
    }
  } else if (withNativeArrayBuffer$2 && (data instanceof ArrayBuffer || isView$1(data))) {
    if (supportsBinary) {
      return callback(data);
    } else {
      return encodeBlobAsBase64(new Blob([data]), callback);
    }
  }
  return callback(PACKET_TYPES[type] + (data || ""));
};
const encodeBlobAsBase64 = (data, callback) => {
  const fileReader = new FileReader();
  fileReader.onload = function() {
    const content = fileReader.result.split(",")[1];
    callback("b" + (content || ""));
  };
  return fileReader.readAsDataURL(data);
};
function toArray(data) {
  if (data instanceof Uint8Array) {
    return data;
  } else if (data instanceof ArrayBuffer) {
    return new Uint8Array(data);
  } else {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }
}
let TEXT_ENCODER;
function encodePacketToBinary(packet, callback) {
  if (withNativeBlob$1 && packet.data instanceof Blob) {
    return packet.data.arrayBuffer().then(toArray).then(callback);
  } else if (withNativeArrayBuffer$2 && (packet.data instanceof ArrayBuffer || isView$1(packet.data))) {
    return callback(toArray(packet.data));
  }
  encodePacket(packet, false, (encoded) => {
    if (!TEXT_ENCODER) {
      TEXT_ENCODER = new TextEncoder();
    }
    callback(TEXT_ENCODER.encode(encoded));
  });
}
const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const lookup$1 = typeof Uint8Array === "undefined" ? [] : new Uint8Array(256);
for (let i = 0; i < chars.length; i++) {
  lookup$1[chars.charCodeAt(i)] = i;
}
const decode$1 = (base64) => {
  let bufferLength = base64.length * 0.75, len = base64.length, i, p = 0, encoded1, encoded2, encoded3, encoded4;
  if (base64[base64.length - 1] === "=") {
    bufferLength--;
    if (base64[base64.length - 2] === "=") {
      bufferLength--;
    }
  }
  const arraybuffer = new ArrayBuffer(bufferLength), bytes = new Uint8Array(arraybuffer);
  for (i = 0; i < len; i += 4) {
    encoded1 = lookup$1[base64.charCodeAt(i)];
    encoded2 = lookup$1[base64.charCodeAt(i + 1)];
    encoded3 = lookup$1[base64.charCodeAt(i + 2)];
    encoded4 = lookup$1[base64.charCodeAt(i + 3)];
    bytes[p++] = encoded1 << 2 | encoded2 >> 4;
    bytes[p++] = (encoded2 & 15) << 4 | encoded3 >> 2;
    bytes[p++] = (encoded3 & 3) << 6 | encoded4 & 63;
  }
  return arraybuffer;
};
const withNativeArrayBuffer$1 = typeof ArrayBuffer === "function";
const decodePacket = (encodedPacket, binaryType) => {
  if (typeof encodedPacket !== "string") {
    return {
      type: "message",
      data: mapBinary(encodedPacket, binaryType)
    };
  }
  const type = encodedPacket.charAt(0);
  if (type === "b") {
    return {
      type: "message",
      data: decodeBase64Packet(encodedPacket.substring(1), binaryType)
    };
  }
  const packetType = PACKET_TYPES_REVERSE[type];
  if (!packetType) {
    return ERROR_PACKET;
  }
  return encodedPacket.length > 1 ? {
    type: PACKET_TYPES_REVERSE[type],
    data: encodedPacket.substring(1)
  } : {
    type: PACKET_TYPES_REVERSE[type]
  };
};
const decodeBase64Packet = (data, binaryType) => {
  if (withNativeArrayBuffer$1) {
    const decoded = decode$1(data);
    return mapBinary(decoded, binaryType);
  } else {
    return { base64: true, data };
  }
};
const mapBinary = (data, binaryType) => {
  switch (binaryType) {
    case "blob":
      if (data instanceof Blob) {
        return data;
      } else {
        return new Blob([data]);
      }
    case "arraybuffer":
    default:
      if (data instanceof ArrayBuffer) {
        return data;
      } else {
        return data.buffer;
      }
  }
};
const SEPARATOR = String.fromCharCode(30);
const encodePayload = (packets, callback) => {
  const length = packets.length;
  const encodedPackets = new Array(length);
  let count = 0;
  packets.forEach((packet, i) => {
    encodePacket(packet, false, (encodedPacket) => {
      encodedPackets[i] = encodedPacket;
      if (++count === length) {
        callback(encodedPackets.join(SEPARATOR));
      }
    });
  });
};
const decodePayload = (encodedPayload, binaryType) => {
  const encodedPackets = encodedPayload.split(SEPARATOR);
  const packets = [];
  for (let i = 0; i < encodedPackets.length; i++) {
    const decodedPacket = decodePacket(encodedPackets[i], binaryType);
    packets.push(decodedPacket);
    if (decodedPacket.type === "error") {
      break;
    }
  }
  return packets;
};
function createPacketEncoderStream() {
  return new TransformStream({
    transform(packet, controller) {
      encodePacketToBinary(packet, (encodedPacket) => {
        const payloadLength = encodedPacket.length;
        let header;
        if (payloadLength < 126) {
          header = new Uint8Array(1);
          new DataView(header.buffer).setUint8(0, payloadLength);
        } else if (payloadLength < 65536) {
          header = new Uint8Array(3);
          const view = new DataView(header.buffer);
          view.setUint8(0, 126);
          view.setUint16(1, payloadLength);
        } else {
          header = new Uint8Array(9);
          const view = new DataView(header.buffer);
          view.setUint8(0, 127);
          view.setBigUint64(1, BigInt(payloadLength));
        }
        if (packet.data && typeof packet.data !== "string") {
          header[0] |= 128;
        }
        controller.enqueue(header);
        controller.enqueue(encodedPacket);
      });
    }
  });
}
let TEXT_DECODER;
function totalLength(chunks) {
  return chunks.reduce((acc, chunk) => acc + chunk.length, 0);
}
function concatChunks(chunks, size) {
  if (chunks[0].length === size) {
    return chunks.shift();
  }
  const buffer = new Uint8Array(size);
  let j = 0;
  for (let i = 0; i < size; i++) {
    buffer[i] = chunks[0][j++];
    if (j === chunks[0].length) {
      chunks.shift();
      j = 0;
    }
  }
  if (chunks.length && j < chunks[0].length) {
    chunks[0] = chunks[0].slice(j);
  }
  return buffer;
}
function createPacketDecoderStream(maxPayload, binaryType) {
  if (!TEXT_DECODER) {
    TEXT_DECODER = new TextDecoder();
  }
  const chunks = [];
  let state = 0;
  let expectedLength = -1;
  let isBinary2 = false;
  return new TransformStream({
    transform(chunk, controller) {
      chunks.push(chunk);
      while (true) {
        if (state === 0) {
          if (totalLength(chunks) < 1) {
            break;
          }
          const header = concatChunks(chunks, 1);
          isBinary2 = (header[0] & 128) === 128;
          expectedLength = header[0] & 127;
          if (expectedLength < 126) {
            state = 3;
          } else if (expectedLength === 126) {
            state = 1;
          } else {
            state = 2;
          }
        } else if (state === 1) {
          if (totalLength(chunks) < 2) {
            break;
          }
          const headerArray = concatChunks(chunks, 2);
          expectedLength = new DataView(headerArray.buffer, headerArray.byteOffset, headerArray.length).getUint16(0);
          state = 3;
        } else if (state === 2) {
          if (totalLength(chunks) < 8) {
            break;
          }
          const headerArray = concatChunks(chunks, 8);
          const view = new DataView(headerArray.buffer, headerArray.byteOffset, headerArray.length);
          const n = view.getUint32(0);
          if (n > Math.pow(2, 53 - 32) - 1) {
            controller.enqueue(ERROR_PACKET);
            break;
          }
          expectedLength = n * Math.pow(2, 32) + view.getUint32(4);
          state = 3;
        } else {
          if (totalLength(chunks) < expectedLength) {
            break;
          }
          const data = concatChunks(chunks, expectedLength);
          controller.enqueue(decodePacket(isBinary2 ? data : TEXT_DECODER.decode(data), binaryType));
          state = 0;
        }
        if (expectedLength === 0 || expectedLength > maxPayload) {
          controller.enqueue(ERROR_PACKET);
          break;
        }
      }
    }
  });
}
const protocol$1 = 4;
function Emitter(obj) {
  if (obj) return mixin(obj);
}
function mixin(obj) {
  for (var key in Emitter.prototype) {
    obj[key] = Emitter.prototype[key];
  }
  return obj;
}
Emitter.prototype.on = Emitter.prototype.addEventListener = function(event, fn) {
  this._callbacks = this._callbacks || {};
  (this._callbacks["$" + event] = this._callbacks["$" + event] || []).push(fn);
  return this;
};
Emitter.prototype.once = function(event, fn) {
  function on2() {
    this.off(event, on2);
    fn.apply(this, arguments);
  }
  on2.fn = fn;
  this.on(event, on2);
  return this;
};
Emitter.prototype.off = Emitter.prototype.removeListener = Emitter.prototype.removeAllListeners = Emitter.prototype.removeEventListener = function(event, fn) {
  this._callbacks = this._callbacks || {};
  if (0 == arguments.length) {
    this._callbacks = {};
    return this;
  }
  var callbacks = this._callbacks["$" + event];
  if (!callbacks) return this;
  if (1 == arguments.length) {
    delete this._callbacks["$" + event];
    return this;
  }
  var cb;
  for (var i = 0; i < callbacks.length; i++) {
    cb = callbacks[i];
    if (cb === fn || cb.fn === fn) {
      callbacks.splice(i, 1);
      break;
    }
  }
  if (callbacks.length === 0) {
    delete this._callbacks["$" + event];
  }
  return this;
};
Emitter.prototype.emit = function(event) {
  this._callbacks = this._callbacks || {};
  var args = new Array(arguments.length - 1), callbacks = this._callbacks["$" + event];
  for (var i = 1; i < arguments.length; i++) {
    args[i - 1] = arguments[i];
  }
  if (callbacks) {
    callbacks = callbacks.slice(0);
    for (var i = 0, len = callbacks.length; i < len; ++i) {
      callbacks[i].apply(this, args);
    }
  }
  return this;
};
Emitter.prototype.emitReserved = Emitter.prototype.emit;
Emitter.prototype.listeners = function(event) {
  this._callbacks = this._callbacks || {};
  return this._callbacks["$" + event] || [];
};
Emitter.prototype.hasListeners = function(event) {
  return !!this.listeners(event).length;
};
const nextTick = (() => {
  const isPromiseAvailable = typeof Promise === "function" && typeof Promise.resolve === "function";
  if (isPromiseAvailable) {
    return (cb) => Promise.resolve().then(cb);
  } else {
    return (cb, setTimeoutFn) => setTimeoutFn(cb, 0);
  }
})();
const globalThisShim = (() => {
  if (typeof self !== "undefined") {
    return self;
  } else if (typeof window !== "undefined") {
    return window;
  } else {
    return Function("return this")();
  }
})();
const defaultBinaryType = "arraybuffer";
function createCookieJar() {
}
function pick(obj, ...attr) {
  return attr.reduce((acc, k) => {
    if (obj.hasOwnProperty(k)) {
      acc[k] = obj[k];
    }
    return acc;
  }, {});
}
const NATIVE_SET_TIMEOUT = globalThisShim.setTimeout;
const NATIVE_CLEAR_TIMEOUT = globalThisShim.clearTimeout;
function installTimerFunctions(obj, opts) {
  if (opts.useNativeTimers) {
    obj.setTimeoutFn = NATIVE_SET_TIMEOUT.bind(globalThisShim);
    obj.clearTimeoutFn = NATIVE_CLEAR_TIMEOUT.bind(globalThisShim);
  } else {
    obj.setTimeoutFn = globalThisShim.setTimeout.bind(globalThisShim);
    obj.clearTimeoutFn = globalThisShim.clearTimeout.bind(globalThisShim);
  }
}
const BASE64_OVERHEAD = 1.33;
function byteLength(obj) {
  if (typeof obj === "string") {
    return utf8Length(obj);
  }
  return Math.ceil((obj.byteLength || obj.size) * BASE64_OVERHEAD);
}
function utf8Length(str) {
  let c = 0, length = 0;
  for (let i = 0, l = str.length; i < l; i++) {
    c = str.charCodeAt(i);
    if (c < 128) {
      length += 1;
    } else if (c < 2048) {
      length += 2;
    } else if (c < 55296 || c >= 57344) {
      length += 3;
    } else {
      i++;
      length += 4;
    }
  }
  return length;
}
function randomString() {
  return Date.now().toString(36).substring(3) + Math.random().toString(36).substring(2, 5);
}
function encode(obj) {
  let str = "";
  for (let i in obj) {
    if (obj.hasOwnProperty(i)) {
      if (str.length)
        str += "&";
      str += encodeURIComponent(i) + "=" + encodeURIComponent(obj[i]);
    }
  }
  return str;
}
function decode(qs) {
  let qry = {};
  let pairs = qs.split("&");
  for (let i = 0, l = pairs.length; i < l; i++) {
    let pair = pairs[i].split("=");
    qry[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
  }
  return qry;
}
class TransportError extends Error {
  constructor(reason, description, context) {
    super(reason);
    this.description = description;
    this.context = context;
    this.type = "TransportError";
  }
}
class Transport extends Emitter {
  /**
   * Transport abstract constructor.
   *
   * @param {Object} opts - options
   * @protected
   */
  constructor(opts) {
    super();
    this.writable = false;
    installTimerFunctions(this, opts);
    this.opts = opts;
    this.query = opts.query;
    this.socket = opts.socket;
    this.supportsBinary = !opts.forceBase64;
  }
  /**
   * Emits an error.
   *
   * @param {String} reason
   * @param description
   * @param context - the error context
   * @return {Transport} for chaining
   * @protected
   */
  onError(reason, description, context) {
    super.emitReserved("error", new TransportError(reason, description, context));
    return this;
  }
  /**
   * Opens the transport.
   */
  open() {
    this.readyState = "opening";
    this.doOpen();
    return this;
  }
  /**
   * Closes the transport.
   */
  close() {
    if (this.readyState === "opening" || this.readyState === "open") {
      this.doClose();
      this.onClose();
    }
    return this;
  }
  /**
   * Sends multiple packets.
   *
   * @param {Array} packets
   */
  send(packets) {
    if (this.readyState === "open") {
      this.write(packets);
    }
  }
  /**
   * Called upon open
   *
   * @protected
   */
  onOpen() {
    this.readyState = "open";
    this.writable = true;
    super.emitReserved("open");
  }
  /**
   * Called with data.
   *
   * @param {String} data
   * @protected
   */
  onData(data) {
    const packet = decodePacket(data, this.socket.binaryType);
    this.onPacket(packet);
  }
  /**
   * Called with a decoded packet.
   *
   * @protected
   */
  onPacket(packet) {
    super.emitReserved("packet", packet);
  }
  /**
   * Called upon close.
   *
   * @protected
   */
  onClose(details) {
    this.readyState = "closed";
    super.emitReserved("close", details);
  }
  /**
   * Pauses the transport, in order not to lose packets during an upgrade.
   *
   * @param onPause
   */
  pause(onPause) {
  }
  createUri(schema, query = {}) {
    return schema + "://" + this._hostname() + this._port() + this.opts.path + this._query(query);
  }
  _hostname() {
    const hostname = this.opts.hostname;
    return hostname.indexOf(":") === -1 ? hostname : "[" + hostname + "]";
  }
  _port() {
    if (this.opts.port && (this.opts.secure && Number(this.opts.port !== 443) || !this.opts.secure && Number(this.opts.port) !== 80)) {
      return ":" + this.opts.port;
    } else {
      return "";
    }
  }
  _query(query) {
    const encodedQuery = encode(query);
    return encodedQuery.length ? "?" + encodedQuery : "";
  }
}
class Polling extends Transport {
  constructor() {
    super(...arguments);
    this._polling = false;
  }
  get name() {
    return "polling";
  }
  /**
   * Opens the socket (triggers polling). We write a PING message to determine
   * when the transport is open.
   *
   * @protected
   */
  doOpen() {
    this._poll();
  }
  /**
   * Pauses polling.
   *
   * @param {Function} onPause - callback upon buffers are flushed and transport is paused
   * @package
   */
  pause(onPause) {
    this.readyState = "pausing";
    const pause = () => {
      this.readyState = "paused";
      onPause();
    };
    if (this._polling || !this.writable) {
      let total = 0;
      if (this._polling) {
        total++;
        this.once("pollComplete", function() {
          --total || pause();
        });
      }
      if (!this.writable) {
        total++;
        this.once("drain", function() {
          --total || pause();
        });
      }
    } else {
      pause();
    }
  }
  /**
   * Starts polling cycle.
   *
   * @private
   */
  _poll() {
    this._polling = true;
    this.doPoll();
    this.emitReserved("poll");
  }
  /**
   * Overloads onData to detect payloads.
   *
   * @protected
   */
  onData(data) {
    const callback = (packet) => {
      if ("opening" === this.readyState && packet.type === "open") {
        this.onOpen();
      }
      if ("close" === packet.type) {
        this.onClose({ description: "transport closed by the server" });
        return false;
      }
      this.onPacket(packet);
    };
    decodePayload(data, this.socket.binaryType).forEach(callback);
    if ("closed" !== this.readyState) {
      this._polling = false;
      this.emitReserved("pollComplete");
      if ("open" === this.readyState) {
        this._poll();
      }
    }
  }
  /**
   * For polling, send a close packet.
   *
   * @protected
   */
  doClose() {
    const close = () => {
      this.write([{ type: "close" }]);
    };
    if ("open" === this.readyState) {
      close();
    } else {
      this.once("open", close);
    }
  }
  /**
   * Writes a packets payload.
   *
   * @param {Array} packets - data packets
   * @protected
   */
  write(packets) {
    this.writable = false;
    encodePayload(packets, (data) => {
      this.doWrite(data, () => {
        this.writable = true;
        this.emitReserved("drain");
      });
    });
  }
  /**
   * Generates uri for connection.
   *
   * @private
   */
  uri() {
    const schema = this.opts.secure ? "https" : "http";
    const query = this.query || {};
    if (false !== this.opts.timestampRequests) {
      query[this.opts.timestampParam] = randomString();
    }
    if (!this.supportsBinary && !query.sid) {
      query.b64 = 1;
    }
    return this.createUri(schema, query);
  }
}
let value = false;
try {
  value = typeof XMLHttpRequest !== "undefined" && "withCredentials" in new XMLHttpRequest();
} catch (err) {
}
const hasCORS = value;
function empty() {
}
class BaseXHR extends Polling {
  /**
   * XHR Polling constructor.
   *
   * @param {Object} opts
   * @package
   */
  constructor(opts) {
    super(opts);
    if (typeof location !== "undefined") {
      const isSSL = "https:" === location.protocol;
      let port = location.port;
      if (!port) {
        port = isSSL ? "443" : "80";
      }
      this.xd = typeof location !== "undefined" && opts.hostname !== location.hostname || port !== opts.port;
    }
  }
  /**
   * Sends data.
   *
   * @param {String} data to send.
   * @param {Function} called upon flush.
   * @private
   */
  doWrite(data, fn) {
    const req = this.request({
      method: "POST",
      data
    });
    req.on("success", fn);
    req.on("error", (xhrStatus, context) => {
      this.onError("xhr post error", xhrStatus, context);
    });
  }
  /**
   * Starts a poll cycle.
   *
   * @private
   */
  doPoll() {
    const req = this.request();
    req.on("data", this.onData.bind(this));
    req.on("error", (xhrStatus, context) => {
      this.onError("xhr poll error", xhrStatus, context);
    });
    this.pollXhr = req;
  }
}
class Request extends Emitter {
  /**
   * Request constructor
   *
   * @param {Object} options
   * @package
   */
  constructor(createRequest, uri, opts) {
    super();
    this.createRequest = createRequest;
    installTimerFunctions(this, opts);
    this._opts = opts;
    this._method = opts.method || "GET";
    this._uri = uri;
    this._data = void 0 !== opts.data ? opts.data : null;
    this._create();
  }
  /**
   * Creates the XHR object and sends the request.
   *
   * @private
   */
  _create() {
    var _a;
    const opts = pick(this._opts, "agent", "pfx", "key", "passphrase", "cert", "ca", "ciphers", "rejectUnauthorized", "autoUnref");
    opts.xdomain = !!this._opts.xd;
    const xhr = this._xhr = this.createRequest(opts);
    try {
      xhr.open(this._method, this._uri, true);
      try {
        if (this._opts.extraHeaders) {
          xhr.setDisableHeaderCheck && xhr.setDisableHeaderCheck(true);
          for (let i in this._opts.extraHeaders) {
            if (this._opts.extraHeaders.hasOwnProperty(i)) {
              xhr.setRequestHeader(i, this._opts.extraHeaders[i]);
            }
          }
        }
      } catch (e) {
      }
      if ("POST" === this._method) {
        try {
          xhr.setRequestHeader("Content-type", "text/plain;charset=UTF-8");
        } catch (e) {
        }
      }
      try {
        xhr.setRequestHeader("Accept", "*/*");
      } catch (e) {
      }
      (_a = this._opts.cookieJar) === null || _a === void 0 ? void 0 : _a.addCookies(xhr);
      if ("withCredentials" in xhr) {
        xhr.withCredentials = this._opts.withCredentials;
      }
      if (this._opts.requestTimeout) {
        xhr.timeout = this._opts.requestTimeout;
      }
      xhr.onreadystatechange = () => {
        var _a2;
        if (xhr.readyState === 3) {
          (_a2 = this._opts.cookieJar) === null || _a2 === void 0 ? void 0 : _a2.parseCookies(
            // @ts-ignore
            xhr.getResponseHeader("set-cookie")
          );
        }
        if (4 !== xhr.readyState)
          return;
        if (200 === xhr.status || 1223 === xhr.status) {
          this._onLoad();
        } else {
          this.setTimeoutFn(() => {
            this._onError(typeof xhr.status === "number" ? xhr.status : 0);
          }, 0);
        }
      };
      xhr.send(this._data);
    } catch (e) {
      this.setTimeoutFn(() => {
        this._onError(e);
      }, 0);
      return;
    }
    if (typeof document !== "undefined") {
      this._index = Request.requestsCount++;
      Request.requests[this._index] = this;
    }
  }
  /**
   * Called upon error.
   *
   * @private
   */
  _onError(err) {
    this.emitReserved("error", err, this._xhr);
    this._cleanup(true);
  }
  /**
   * Cleans up house.
   *
   * @private
   */
  _cleanup(fromError) {
    if ("undefined" === typeof this._xhr || null === this._xhr) {
      return;
    }
    this._xhr.onreadystatechange = empty;
    if (fromError) {
      try {
        this._xhr.abort();
      } catch (e) {
      }
    }
    if (typeof document !== "undefined") {
      delete Request.requests[this._index];
    }
    this._xhr = null;
  }
  /**
   * Called upon load.
   *
   * @private
   */
  _onLoad() {
    const data = this._xhr.responseText;
    if (data !== null) {
      this.emitReserved("data", data);
      this.emitReserved("success");
      this._cleanup();
    }
  }
  /**
   * Aborts the request.
   *
   * @package
   */
  abort() {
    this._cleanup();
  }
}
Request.requestsCount = 0;
Request.requests = {};
if (typeof document !== "undefined") {
  if (typeof attachEvent === "function") {
    attachEvent("onunload", unloadHandler);
  } else if (typeof addEventListener === "function") {
    const terminationEvent = "onpagehide" in globalThisShim ? "pagehide" : "unload";
    addEventListener(terminationEvent, unloadHandler, false);
  }
}
function unloadHandler() {
  for (let i in Request.requests) {
    if (Request.requests.hasOwnProperty(i)) {
      Request.requests[i].abort();
    }
  }
}
const hasXHR2 = function() {
  const xhr = newRequest({
    xdomain: false
  });
  return xhr && xhr.responseType !== null;
}();
class XHR extends BaseXHR {
  constructor(opts) {
    super(opts);
    const forceBase64 = opts && opts.forceBase64;
    this.supportsBinary = hasXHR2 && !forceBase64;
  }
  request(opts = {}) {
    Object.assign(opts, { xd: this.xd }, this.opts);
    return new Request(newRequest, this.uri(), opts);
  }
}
function newRequest(opts) {
  const xdomain = opts.xdomain;
  try {
    if ("undefined" !== typeof XMLHttpRequest && (!xdomain || hasCORS)) {
      return new XMLHttpRequest();
    }
  } catch (e) {
  }
  if (!xdomain) {
    try {
      return new globalThisShim[["Active"].concat("Object").join("X")]("Microsoft.XMLHTTP");
    } catch (e) {
    }
  }
}
const isReactNative = typeof navigator !== "undefined" && typeof navigator.product === "string" && navigator.product.toLowerCase() === "reactnative";
class BaseWS extends Transport {
  get name() {
    return "websocket";
  }
  doOpen() {
    const uri = this.uri();
    const protocols = this.opts.protocols;
    const opts = isReactNative ? {} : pick(this.opts, "agent", "perMessageDeflate", "pfx", "key", "passphrase", "cert", "ca", "ciphers", "rejectUnauthorized", "localAddress", "protocolVersion", "origin", "maxPayload", "family", "checkServerIdentity");
    if (this.opts.extraHeaders) {
      opts.headers = this.opts.extraHeaders;
    }
    try {
      this.ws = this.createSocket(uri, protocols, opts);
    } catch (err) {
      return this.emitReserved("error", err);
    }
    this.ws.binaryType = this.socket.binaryType;
    this.addEventListeners();
  }
  /**
   * Adds event listeners to the socket
   *
   * @private
   */
  addEventListeners() {
    this.ws.onopen = () => {
      if (this.opts.autoUnref) {
        this.ws._socket.unref();
      }
      this.onOpen();
    };
    this.ws.onclose = (closeEvent) => this.onClose({
      description: "websocket connection closed",
      context: closeEvent
    });
    this.ws.onmessage = (ev) => this.onData(ev.data);
    this.ws.onerror = (e) => this.onError("websocket error", e);
  }
  write(packets) {
    this.writable = false;
    for (let i = 0; i < packets.length; i++) {
      const packet = packets[i];
      const lastPacket = i === packets.length - 1;
      encodePacket(packet, this.supportsBinary, (data) => {
        try {
          this.doWrite(packet, data);
        } catch (e) {
        }
        if (lastPacket) {
          nextTick(() => {
            this.writable = true;
            this.emitReserved("drain");
          }, this.setTimeoutFn);
        }
      });
    }
  }
  doClose() {
    if (typeof this.ws !== "undefined") {
      this.ws.onerror = () => {
      };
      this.ws.close();
      this.ws = null;
    }
  }
  /**
   * Generates uri for connection.
   *
   * @private
   */
  uri() {
    const schema = this.opts.secure ? "wss" : "ws";
    const query = this.query || {};
    if (this.opts.timestampRequests) {
      query[this.opts.timestampParam] = randomString();
    }
    if (!this.supportsBinary) {
      query.b64 = 1;
    }
    return this.createUri(schema, query);
  }
}
const WebSocketCtor = globalThisShim.WebSocket || globalThisShim.MozWebSocket;
class WS extends BaseWS {
  createSocket(uri, protocols, opts) {
    return !isReactNative ? protocols ? new WebSocketCtor(uri, protocols) : new WebSocketCtor(uri) : new WebSocketCtor(uri, protocols, opts);
  }
  doWrite(_packet, data) {
    this.ws.send(data);
  }
}
class WT extends Transport {
  get name() {
    return "webtransport";
  }
  doOpen() {
    try {
      this._transport = new WebTransport(this.createUri("https"), this.opts.transportOptions[this.name]);
    } catch (err) {
      return this.emitReserved("error", err);
    }
    this._transport.closed.then(() => {
      this.onClose();
    }).catch((err) => {
      this.onError("webtransport error", err);
    });
    this._transport.ready.then(() => {
      this._transport.createBidirectionalStream().then((stream) => {
        const decoderStream = createPacketDecoderStream(Number.MAX_SAFE_INTEGER, this.socket.binaryType);
        const reader = stream.readable.pipeThrough(decoderStream).getReader();
        const encoderStream = createPacketEncoderStream();
        encoderStream.readable.pipeTo(stream.writable);
        this._writer = encoderStream.writable.getWriter();
        const read = () => {
          reader.read().then(({ done, value: value2 }) => {
            if (done) {
              return;
            }
            this.onPacket(value2);
            read();
          }).catch((err) => {
          });
        };
        read();
        const packet = { type: "open" };
        if (this.query.sid) {
          packet.data = `{"sid":"${this.query.sid}"}`;
        }
        this._writer.write(packet).then(() => this.onOpen());
      });
    });
  }
  write(packets) {
    this.writable = false;
    for (let i = 0; i < packets.length; i++) {
      const packet = packets[i];
      const lastPacket = i === packets.length - 1;
      this._writer.write(packet).then(() => {
        if (lastPacket) {
          nextTick(() => {
            this.writable = true;
            this.emitReserved("drain");
          }, this.setTimeoutFn);
        }
      });
    }
  }
  doClose() {
    var _a;
    (_a = this._transport) === null || _a === void 0 ? void 0 : _a.close();
  }
}
const transports = {
  websocket: WS,
  webtransport: WT,
  polling: XHR
};
const re = /^(?:(?![^:@\/?#]+:[^:@\/]*@)(http|https|ws|wss):\/\/)?((?:(([^:@\/?#]*)(?::([^:@\/?#]*))?)?@)?((?:[a-f0-9]{0,4}:){2,7}[a-f0-9]{0,4}|[^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/;
const parts = [
  "source",
  "protocol",
  "authority",
  "userInfo",
  "user",
  "password",
  "host",
  "port",
  "relative",
  "path",
  "directory",
  "file",
  "query",
  "anchor"
];
function parse(str) {
  if (str.length > 8e3) {
    throw "URI too long";
  }
  const src = str, b = str.indexOf("["), e = str.indexOf("]");
  if (b != -1 && e != -1) {
    str = str.substring(0, b) + str.substring(b, e).replace(/:/g, ";") + str.substring(e, str.length);
  }
  let m = re.exec(str || ""), uri = {}, i = 14;
  while (i--) {
    uri[parts[i]] = m[i] || "";
  }
  if (b != -1 && e != -1) {
    uri.source = src;
    uri.host = uri.host.substring(1, uri.host.length - 1).replace(/;/g, ":");
    uri.authority = uri.authority.replace("[", "").replace("]", "").replace(/;/g, ":");
    uri.ipv6uri = true;
  }
  uri.pathNames = pathNames(uri, uri["path"]);
  uri.queryKey = queryKey(uri, uri["query"]);
  return uri;
}
function pathNames(obj, path) {
  const regx = /\/{2,9}/g, names = path.replace(regx, "/").split("/");
  if (path.slice(0, 1) == "/" || path.length === 0) {
    names.splice(0, 1);
  }
  if (path.slice(-1) == "/") {
    names.splice(names.length - 1, 1);
  }
  return names;
}
function queryKey(uri, query) {
  const data = {};
  query.replace(/(?:^|&)([^&=]*)=?([^&]*)/g, function($0, $1, $2) {
    if ($1) {
      data[$1] = $2;
    }
  });
  return data;
}
const withEventListeners = typeof addEventListener === "function" && typeof removeEventListener === "function";
const OFFLINE_EVENT_LISTENERS = [];
if (withEventListeners) {
  addEventListener("offline", () => {
    OFFLINE_EVENT_LISTENERS.forEach((listener) => listener());
  }, false);
}
class SocketWithoutUpgrade extends Emitter {
  /**
   * Socket constructor.
   *
   * @param {String|Object} uri - uri or options
   * @param {Object} opts - options
   */
  constructor(uri, opts) {
    super();
    this.binaryType = defaultBinaryType;
    this.writeBuffer = [];
    this._prevBufferLen = 0;
    this._pingInterval = -1;
    this._pingTimeout = -1;
    this._maxPayload = -1;
    this._pingTimeoutTime = Infinity;
    if (uri && "object" === typeof uri) {
      opts = uri;
      uri = null;
    }
    if (uri) {
      const parsedUri = parse(uri);
      opts.hostname = parsedUri.host;
      opts.secure = parsedUri.protocol === "https" || parsedUri.protocol === "wss";
      opts.port = parsedUri.port;
      if (parsedUri.query)
        opts.query = parsedUri.query;
    } else if (opts.host) {
      opts.hostname = parse(opts.host).host;
    }
    installTimerFunctions(this, opts);
    this.secure = null != opts.secure ? opts.secure : typeof location !== "undefined" && "https:" === location.protocol;
    if (opts.hostname && !opts.port) {
      opts.port = this.secure ? "443" : "80";
    }
    this.hostname = opts.hostname || (typeof location !== "undefined" ? location.hostname : "localhost");
    this.port = opts.port || (typeof location !== "undefined" && location.port ? location.port : this.secure ? "443" : "80");
    this.transports = [];
    this._transportsByName = {};
    opts.transports.forEach((t) => {
      const transportName = t.prototype.name;
      this.transports.push(transportName);
      this._transportsByName[transportName] = t;
    });
    this.opts = Object.assign({
      path: "/engine.io",
      agent: false,
      withCredentials: false,
      upgrade: true,
      timestampParam: "t",
      rememberUpgrade: false,
      addTrailingSlash: true,
      rejectUnauthorized: true,
      perMessageDeflate: {
        threshold: 1024
      },
      transportOptions: {},
      closeOnBeforeunload: false
    }, opts);
    this.opts.path = this.opts.path.replace(/\/$/, "") + (this.opts.addTrailingSlash ? "/" : "");
    if (typeof this.opts.query === "string") {
      this.opts.query = decode(this.opts.query);
    }
    if (withEventListeners) {
      if (this.opts.closeOnBeforeunload) {
        this._beforeunloadEventListener = () => {
          if (this.transport) {
            this.transport.removeAllListeners();
            this.transport.close();
          }
        };
        addEventListener("beforeunload", this._beforeunloadEventListener, false);
      }
      if (this.hostname !== "localhost") {
        this._offlineEventListener = () => {
          this._onClose("transport close", {
            description: "network connection lost"
          });
        };
        OFFLINE_EVENT_LISTENERS.push(this._offlineEventListener);
      }
    }
    if (this.opts.withCredentials) {
      this._cookieJar = createCookieJar();
    }
    this._open();
  }
  /**
   * Creates transport of the given type.
   *
   * @param {String} name - transport name
   * @return {Transport}
   * @private
   */
  createTransport(name) {
    const query = Object.assign({}, this.opts.query);
    query.EIO = protocol$1;
    query.transport = name;
    if (this.id)
      query.sid = this.id;
    const opts = Object.assign({}, this.opts, {
      query,
      socket: this,
      hostname: this.hostname,
      secure: this.secure,
      port: this.port
    }, this.opts.transportOptions[name]);
    return new this._transportsByName[name](opts);
  }
  /**
   * Initializes transport to use and starts probe.
   *
   * @private
   */
  _open() {
    if (this.transports.length === 0) {
      this.setTimeoutFn(() => {
        this.emitReserved("error", "No transports available");
      }, 0);
      return;
    }
    const transportName = this.opts.rememberUpgrade && SocketWithoutUpgrade.priorWebsocketSuccess && this.transports.indexOf("websocket") !== -1 ? "websocket" : this.transports[0];
    this.readyState = "opening";
    const transport = this.createTransport(transportName);
    transport.open();
    this.setTransport(transport);
  }
  /**
   * Sets the current transport. Disables the existing one (if any).
   *
   * @private
   */
  setTransport(transport) {
    if (this.transport) {
      this.transport.removeAllListeners();
    }
    this.transport = transport;
    transport.on("drain", this._onDrain.bind(this)).on("packet", this._onPacket.bind(this)).on("error", this._onError.bind(this)).on("close", (reason) => this._onClose("transport close", reason));
  }
  /**
   * Called when connection is deemed open.
   *
   * @private
   */
  onOpen() {
    this.readyState = "open";
    SocketWithoutUpgrade.priorWebsocketSuccess = "websocket" === this.transport.name;
    this.emitReserved("open");
    this.flush();
  }
  /**
   * Handles a packet.
   *
   * @private
   */
  _onPacket(packet) {
    if ("opening" === this.readyState || "open" === this.readyState || "closing" === this.readyState) {
      this.emitReserved("packet", packet);
      this.emitReserved("heartbeat");
      switch (packet.type) {
        case "open":
          this.onHandshake(JSON.parse(packet.data));
          break;
        case "ping":
          this._sendPacket("pong");
          this.emitReserved("ping");
          this.emitReserved("pong");
          this._resetPingTimeout();
          break;
        case "error":
          const err = new Error("server error");
          err.code = packet.data;
          this._onError(err);
          break;
        case "message":
          this.emitReserved("data", packet.data);
          this.emitReserved("message", packet.data);
          break;
      }
    }
  }
  /**
   * Called upon handshake completion.
   *
   * @param {Object} data - handshake obj
   * @private
   */
  onHandshake(data) {
    this.emitReserved("handshake", data);
    this.id = data.sid;
    this.transport.query.sid = data.sid;
    this._pingInterval = data.pingInterval;
    this._pingTimeout = data.pingTimeout;
    this._maxPayload = data.maxPayload;
    this.onOpen();
    if ("closed" === this.readyState)
      return;
    this._resetPingTimeout();
  }
  /**
   * Sets and resets ping timeout timer based on server pings.
   *
   * @private
   */
  _resetPingTimeout() {
    this.clearTimeoutFn(this._pingTimeoutTimer);
    const delay = this._pingInterval + this._pingTimeout;
    this._pingTimeoutTime = Date.now() + delay;
    this._pingTimeoutTimer = this.setTimeoutFn(() => {
      this._onClose("ping timeout");
    }, delay);
    if (this.opts.autoUnref) {
      this._pingTimeoutTimer.unref();
    }
  }
  /**
   * Called on `drain` event
   *
   * @private
   */
  _onDrain() {
    this.writeBuffer.splice(0, this._prevBufferLen);
    this._prevBufferLen = 0;
    if (0 === this.writeBuffer.length) {
      this.emitReserved("drain");
    } else {
      this.flush();
    }
  }
  /**
   * Flush write buffers.
   *
   * @private
   */
  flush() {
    if ("closed" !== this.readyState && this.transport.writable && !this.upgrading && this.writeBuffer.length) {
      const packets = this._getWritablePackets();
      this.transport.send(packets);
      this._prevBufferLen = packets.length;
      this.emitReserved("flush");
    }
  }
  /**
   * Ensure the encoded size of the writeBuffer is below the maxPayload value sent by the server (only for HTTP
   * long-polling)
   *
   * @private
   */
  _getWritablePackets() {
    const shouldCheckPayloadSize = this._maxPayload && this.transport.name === "polling" && this.writeBuffer.length > 1;
    if (!shouldCheckPayloadSize) {
      return this.writeBuffer;
    }
    let payloadSize = 1;
    for (let i = 0; i < this.writeBuffer.length; i++) {
      const data = this.writeBuffer[i].data;
      if (data) {
        payloadSize += byteLength(data);
      }
      if (i > 0 && payloadSize > this._maxPayload) {
        return this.writeBuffer.slice(0, i);
      }
      payloadSize += 2;
    }
    return this.writeBuffer;
  }
  /**
   * Checks whether the heartbeat timer has expired but the socket has not yet been notified.
   *
   * Note: this method is private for now because it does not really fit the WebSocket API, but if we put it in the
   * `write()` method then the message would not be buffered by the Socket.IO client.
   *
   * @return {boolean}
   * @private
   */
  /* private */
  _hasPingExpired() {
    if (!this._pingTimeoutTime)
      return true;
    const hasExpired = Date.now() > this._pingTimeoutTime;
    if (hasExpired) {
      this._pingTimeoutTime = 0;
      nextTick(() => {
        this._onClose("ping timeout");
      }, this.setTimeoutFn);
    }
    return hasExpired;
  }
  /**
   * Sends a message.
   *
   * @param {String} msg - message.
   * @param {Object} options.
   * @param {Function} fn - callback function.
   * @return {Socket} for chaining.
   */
  write(msg, options, fn) {
    this._sendPacket("message", msg, options, fn);
    return this;
  }
  /**
   * Sends a message. Alias of {@link Socket#write}.
   *
   * @param {String} msg - message.
   * @param {Object} options.
   * @param {Function} fn - callback function.
   * @return {Socket} for chaining.
   */
  send(msg, options, fn) {
    this._sendPacket("message", msg, options, fn);
    return this;
  }
  /**
   * Sends a packet.
   *
   * @param {String} type: packet type.
   * @param {String} data.
   * @param {Object} options.
   * @param {Function} fn - callback function.
   * @private
   */
  _sendPacket(type, data, options, fn) {
    if ("function" === typeof data) {
      fn = data;
      data = void 0;
    }
    if ("function" === typeof options) {
      fn = options;
      options = null;
    }
    if ("closing" === this.readyState || "closed" === this.readyState) {
      return;
    }
    options = options || {};
    options.compress = false !== options.compress;
    const packet = {
      type,
      data,
      options
    };
    this.emitReserved("packetCreate", packet);
    this.writeBuffer.push(packet);
    if (fn)
      this.once("flush", fn);
    this.flush();
  }
  /**
   * Closes the connection.
   */
  close() {
    const close = () => {
      this._onClose("forced close");
      this.transport.close();
    };
    const cleanupAndClose = () => {
      this.off("upgrade", cleanupAndClose);
      this.off("upgradeError", cleanupAndClose);
      close();
    };
    const waitForUpgrade = () => {
      this.once("upgrade", cleanupAndClose);
      this.once("upgradeError", cleanupAndClose);
    };
    if ("opening" === this.readyState || "open" === this.readyState) {
      this.readyState = "closing";
      if (this.writeBuffer.length) {
        this.once("drain", () => {
          if (this.upgrading) {
            waitForUpgrade();
          } else {
            close();
          }
        });
      } else if (this.upgrading) {
        waitForUpgrade();
      } else {
        close();
      }
    }
    return this;
  }
  /**
   * Called upon transport error
   *
   * @private
   */
  _onError(err) {
    SocketWithoutUpgrade.priorWebsocketSuccess = false;
    if (this.opts.tryAllTransports && this.transports.length > 1 && this.readyState === "opening") {
      this.transports.shift();
      return this._open();
    }
    this.emitReserved("error", err);
    this._onClose("transport error", err);
  }
  /**
   * Called upon transport close.
   *
   * @private
   */
  _onClose(reason, description) {
    if ("opening" === this.readyState || "open" === this.readyState || "closing" === this.readyState) {
      this.clearTimeoutFn(this._pingTimeoutTimer);
      this.transport.removeAllListeners("close");
      this.transport.close();
      this.transport.removeAllListeners();
      if (withEventListeners) {
        if (this._beforeunloadEventListener) {
          removeEventListener("beforeunload", this._beforeunloadEventListener, false);
        }
        if (this._offlineEventListener) {
          const i = OFFLINE_EVENT_LISTENERS.indexOf(this._offlineEventListener);
          if (i !== -1) {
            OFFLINE_EVENT_LISTENERS.splice(i, 1);
          }
        }
      }
      this.readyState = "closed";
      this.id = null;
      this.emitReserved("close", reason, description);
      this.writeBuffer = [];
      this._prevBufferLen = 0;
    }
  }
}
SocketWithoutUpgrade.protocol = protocol$1;
class SocketWithUpgrade extends SocketWithoutUpgrade {
  constructor() {
    super(...arguments);
    this._upgrades = [];
  }
  onOpen() {
    super.onOpen();
    if ("open" === this.readyState && this.opts.upgrade) {
      for (let i = 0; i < this._upgrades.length; i++) {
        this._probe(this._upgrades[i]);
      }
    }
  }
  /**
   * Probes a transport.
   *
   * @param {String} name - transport name
   * @private
   */
  _probe(name) {
    let transport = this.createTransport(name);
    let failed = false;
    SocketWithoutUpgrade.priorWebsocketSuccess = false;
    const onTransportOpen = () => {
      if (failed)
        return;
      transport.send([{ type: "ping", data: "probe" }]);
      transport.once("packet", (msg) => {
        if (failed)
          return;
        if ("pong" === msg.type && "probe" === msg.data) {
          this.upgrading = true;
          this.emitReserved("upgrading", transport);
          if (!transport)
            return;
          SocketWithoutUpgrade.priorWebsocketSuccess = "websocket" === transport.name;
          this.transport.pause(() => {
            if (failed)
              return;
            if ("closed" === this.readyState)
              return;
            cleanup();
            this.setTransport(transport);
            transport.send([{ type: "upgrade" }]);
            this.emitReserved("upgrade", transport);
            transport = null;
            this.upgrading = false;
            this.flush();
          });
        } else {
          const err = new Error("probe error");
          err.transport = transport.name;
          this.emitReserved("upgradeError", err);
        }
      });
    };
    function freezeTransport() {
      if (failed)
        return;
      failed = true;
      cleanup();
      transport.close();
      transport = null;
    }
    const onerror = (err) => {
      const error = new Error("probe error: " + err);
      error.transport = transport.name;
      freezeTransport();
      this.emitReserved("upgradeError", error);
    };
    function onTransportClose() {
      onerror("transport closed");
    }
    function onclose() {
      onerror("socket closed");
    }
    function onupgrade(to) {
      if (transport && to.name !== transport.name) {
        freezeTransport();
      }
    }
    const cleanup = () => {
      transport.removeListener("open", onTransportOpen);
      transport.removeListener("error", onerror);
      transport.removeListener("close", onTransportClose);
      this.off("close", onclose);
      this.off("upgrading", onupgrade);
    };
    transport.once("open", onTransportOpen);
    transport.once("error", onerror);
    transport.once("close", onTransportClose);
    this.once("close", onclose);
    this.once("upgrading", onupgrade);
    if (this._upgrades.indexOf("webtransport") !== -1 && name !== "webtransport") {
      this.setTimeoutFn(() => {
        if (!failed) {
          transport.open();
        }
      }, 200);
    } else {
      transport.open();
    }
  }
  onHandshake(data) {
    this._upgrades = this._filterUpgrades(data.upgrades);
    super.onHandshake(data);
  }
  /**
   * Filters upgrades, returning only those matching client transports.
   *
   * @param {Array} upgrades - server upgrades
   * @private
   */
  _filterUpgrades(upgrades) {
    const filteredUpgrades = [];
    for (let i = 0; i < upgrades.length; i++) {
      if (~this.transports.indexOf(upgrades[i]))
        filteredUpgrades.push(upgrades[i]);
    }
    return filteredUpgrades;
  }
}
let Socket$1 = class Socket extends SocketWithUpgrade {
  constructor(uri, opts = {}) {
    const o = typeof uri === "object" ? uri : opts;
    if (!o.transports || o.transports && typeof o.transports[0] === "string") {
      o.transports = (o.transports || ["polling", "websocket", "webtransport"]).map((transportName) => transports[transportName]).filter((t) => !!t);
    }
    super(uri, o);
  }
};
function url(uri, path = "", loc) {
  let obj = uri;
  loc = loc || typeof location !== "undefined" && location;
  if (null == uri)
    uri = loc.protocol + "//" + loc.host;
  if (typeof uri === "string") {
    if ("/" === uri.charAt(0)) {
      if ("/" === uri.charAt(1)) {
        uri = loc.protocol + uri;
      } else {
        uri = loc.host + uri;
      }
    }
    if (!/^(https?|wss?):\/\//.test(uri)) {
      if ("undefined" !== typeof loc) {
        uri = loc.protocol + "//" + uri;
      } else {
        uri = "https://" + uri;
      }
    }
    obj = parse(uri);
  }
  if (!obj.port) {
    if (/^(http|ws)$/.test(obj.protocol)) {
      obj.port = "80";
    } else if (/^(http|ws)s$/.test(obj.protocol)) {
      obj.port = "443";
    }
  }
  obj.path = obj.path || "/";
  const ipv6 = obj.host.indexOf(":") !== -1;
  const host = ipv6 ? "[" + obj.host + "]" : obj.host;
  obj.id = obj.protocol + "://" + host + ":" + obj.port + path;
  obj.href = obj.protocol + "://" + host + (loc && loc.port === obj.port ? "" : ":" + obj.port);
  return obj;
}
const withNativeArrayBuffer = typeof ArrayBuffer === "function";
const isView = (obj) => {
  return typeof ArrayBuffer.isView === "function" ? ArrayBuffer.isView(obj) : obj.buffer instanceof ArrayBuffer;
};
const toString = Object.prototype.toString;
const withNativeBlob = typeof Blob === "function" || typeof Blob !== "undefined" && toString.call(Blob) === "[object BlobConstructor]";
const withNativeFile = typeof File === "function" || typeof File !== "undefined" && toString.call(File) === "[object FileConstructor]";
function isBinary(obj) {
  return withNativeArrayBuffer && (obj instanceof ArrayBuffer || isView(obj)) || withNativeBlob && obj instanceof Blob || withNativeFile && obj instanceof File;
}
function hasBinary(obj, toJSON) {
  if (!obj || typeof obj !== "object") {
    return false;
  }
  if (Array.isArray(obj)) {
    for (let i = 0, l = obj.length; i < l; i++) {
      if (hasBinary(obj[i])) {
        return true;
      }
    }
    return false;
  }
  if (isBinary(obj)) {
    return true;
  }
  if (obj.toJSON && typeof obj.toJSON === "function" && arguments.length === 1) {
    return hasBinary(obj.toJSON(), true);
  }
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key) && hasBinary(obj[key])) {
      return true;
    }
  }
  return false;
}
function deconstructPacket(packet) {
  const buffers = [];
  const packetData = packet.data;
  const pack = packet;
  pack.data = _deconstructPacket(packetData, buffers);
  pack.attachments = buffers.length;
  return { packet: pack, buffers };
}
function _deconstructPacket(data, buffers) {
  if (!data)
    return data;
  if (isBinary(data)) {
    const placeholder = { _placeholder: true, num: buffers.length };
    buffers.push(data);
    return placeholder;
  } else if (Array.isArray(data)) {
    const newData = new Array(data.length);
    for (let i = 0; i < data.length; i++) {
      newData[i] = _deconstructPacket(data[i], buffers);
    }
    return newData;
  } else if (typeof data === "object" && !(data instanceof Date)) {
    const newData = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        newData[key] = _deconstructPacket(data[key], buffers);
      }
    }
    return newData;
  }
  return data;
}
function reconstructPacket(packet, buffers) {
  packet.data = _reconstructPacket(packet.data, buffers);
  delete packet.attachments;
  return packet;
}
function _reconstructPacket(data, buffers) {
  if (!data)
    return data;
  if (data && data._placeholder === true) {
    const isIndexValid = typeof data.num === "number" && data.num >= 0 && data.num < buffers.length;
    if (isIndexValid) {
      return buffers[data.num];
    } else {
      throw new Error("illegal attachments");
    }
  } else if (Array.isArray(data)) {
    for (let i = 0; i < data.length; i++) {
      data[i] = _reconstructPacket(data[i], buffers);
    }
  } else if (typeof data === "object") {
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        data[key] = _reconstructPacket(data[key], buffers);
      }
    }
  }
  return data;
}
const RESERVED_EVENTS$1 = [
  "connect",
  "connect_error",
  "disconnect",
  "disconnecting",
  "newListener",
  "removeListener"
  // used by the Node.js EventEmitter
];
const protocol = 5;
var PacketType;
(function(PacketType2) {
  PacketType2[PacketType2["CONNECT"] = 0] = "CONNECT";
  PacketType2[PacketType2["DISCONNECT"] = 1] = "DISCONNECT";
  PacketType2[PacketType2["EVENT"] = 2] = "EVENT";
  PacketType2[PacketType2["ACK"] = 3] = "ACK";
  PacketType2[PacketType2["CONNECT_ERROR"] = 4] = "CONNECT_ERROR";
  PacketType2[PacketType2["BINARY_EVENT"] = 5] = "BINARY_EVENT";
  PacketType2[PacketType2["BINARY_ACK"] = 6] = "BINARY_ACK";
})(PacketType || (PacketType = {}));
class Encoder {
  /**
   * Encoder constructor
   *
   * @param {function} replacer - custom replacer to pass down to JSON.parse
   */
  constructor(replacer) {
    this.replacer = replacer;
  }
  /**
   * Encode a packet as a single string if non-binary, or as a
   * buffer sequence, depending on packet type.
   *
   * @param {Object} obj - packet object
   */
  encode(obj) {
    if (obj.type === PacketType.EVENT || obj.type === PacketType.ACK) {
      if (hasBinary(obj)) {
        return this.encodeAsBinary({
          type: obj.type === PacketType.EVENT ? PacketType.BINARY_EVENT : PacketType.BINARY_ACK,
          nsp: obj.nsp,
          data: obj.data,
          id: obj.id
        });
      }
    }
    return [this.encodeAsString(obj)];
  }
  /**
   * Encode packet as string.
   */
  encodeAsString(obj) {
    let str = "" + obj.type;
    if (obj.type === PacketType.BINARY_EVENT || obj.type === PacketType.BINARY_ACK) {
      str += obj.attachments + "-";
    }
    if (obj.nsp && "/" !== obj.nsp) {
      str += obj.nsp + ",";
    }
    if (null != obj.id) {
      str += obj.id;
    }
    if (null != obj.data) {
      str += JSON.stringify(obj.data, this.replacer);
    }
    return str;
  }
  /**
   * Encode packet as 'buffer sequence' by removing blobs, and
   * deconstructing packet into object with placeholders and
   * a list of buffers.
   */
  encodeAsBinary(obj) {
    const deconstruction = deconstructPacket(obj);
    const pack = this.encodeAsString(deconstruction.packet);
    const buffers = deconstruction.buffers;
    buffers.unshift(pack);
    return buffers;
  }
}
function isObject(value2) {
  return Object.prototype.toString.call(value2) === "[object Object]";
}
class Decoder extends Emitter {
  /**
   * Decoder constructor
   *
   * @param {function} reviver - custom reviver to pass down to JSON.stringify
   */
  constructor(reviver) {
    super();
    this.reviver = reviver;
  }
  /**
   * Decodes an encoded packet string into packet JSON.
   *
   * @param {String} obj - encoded packet
   */
  add(obj) {
    let packet;
    if (typeof obj === "string") {
      if (this.reconstructor) {
        throw new Error("got plaintext data when reconstructing a packet");
      }
      packet = this.decodeString(obj);
      const isBinaryEvent = packet.type === PacketType.BINARY_EVENT;
      if (isBinaryEvent || packet.type === PacketType.BINARY_ACK) {
        packet.type = isBinaryEvent ? PacketType.EVENT : PacketType.ACK;
        this.reconstructor = new BinaryReconstructor(packet);
        if (packet.attachments === 0) {
          super.emitReserved("decoded", packet);
        }
      } else {
        super.emitReserved("decoded", packet);
      }
    } else if (isBinary(obj) || obj.base64) {
      if (!this.reconstructor) {
        throw new Error("got binary data when not reconstructing a packet");
      } else {
        packet = this.reconstructor.takeBinaryData(obj);
        if (packet) {
          this.reconstructor = null;
          super.emitReserved("decoded", packet);
        }
      }
    } else {
      throw new Error("Unknown type: " + obj);
    }
  }
  /**
   * Decode a packet String (JSON data)
   *
   * @param {String} str
   * @return {Object} packet
   */
  decodeString(str) {
    let i = 0;
    const p = {
      type: Number(str.charAt(0))
    };
    if (PacketType[p.type] === void 0) {
      throw new Error("unknown packet type " + p.type);
    }
    if (p.type === PacketType.BINARY_EVENT || p.type === PacketType.BINARY_ACK) {
      const start = i + 1;
      while (str.charAt(++i) !== "-" && i != str.length) {
      }
      const buf = str.substring(start, i);
      if (buf != Number(buf) || str.charAt(i) !== "-") {
        throw new Error("Illegal attachments");
      }
      p.attachments = Number(buf);
    }
    if ("/" === str.charAt(i + 1)) {
      const start = i + 1;
      while (++i) {
        const c = str.charAt(i);
        if ("," === c)
          break;
        if (i === str.length)
          break;
      }
      p.nsp = str.substring(start, i);
    } else {
      p.nsp = "/";
    }
    const next = str.charAt(i + 1);
    if ("" !== next && Number(next) == next) {
      const start = i + 1;
      while (++i) {
        const c = str.charAt(i);
        if (null == c || Number(c) != c) {
          --i;
          break;
        }
        if (i === str.length)
          break;
      }
      p.id = Number(str.substring(start, i + 1));
    }
    if (str.charAt(++i)) {
      const payload = this.tryParse(str.substr(i));
      if (Decoder.isPayloadValid(p.type, payload)) {
        p.data = payload;
      } else {
        throw new Error("invalid payload");
      }
    }
    return p;
  }
  tryParse(str) {
    try {
      return JSON.parse(str, this.reviver);
    } catch (e) {
      return false;
    }
  }
  static isPayloadValid(type, payload) {
    switch (type) {
      case PacketType.CONNECT:
        return isObject(payload);
      case PacketType.DISCONNECT:
        return payload === void 0;
      case PacketType.CONNECT_ERROR:
        return typeof payload === "string" || isObject(payload);
      case PacketType.EVENT:
      case PacketType.BINARY_EVENT:
        return Array.isArray(payload) && (typeof payload[0] === "number" || typeof payload[0] === "string" && RESERVED_EVENTS$1.indexOf(payload[0]) === -1);
      case PacketType.ACK:
      case PacketType.BINARY_ACK:
        return Array.isArray(payload);
    }
  }
  /**
   * Deallocates a parser's resources
   */
  destroy() {
    if (this.reconstructor) {
      this.reconstructor.finishedReconstruction();
      this.reconstructor = null;
    }
  }
}
class BinaryReconstructor {
  constructor(packet) {
    this.packet = packet;
    this.buffers = [];
    this.reconPack = packet;
  }
  /**
   * Method to be called when binary data received from connection
   * after a BINARY_EVENT packet.
   *
   * @param {Buffer | ArrayBuffer} binData - the raw binary data received
   * @return {null | Object} returns null if more binary data is expected or
   *   a reconstructed packet object if all buffers have been received.
   */
  takeBinaryData(binData) {
    this.buffers.push(binData);
    if (this.buffers.length === this.reconPack.attachments) {
      const packet = reconstructPacket(this.reconPack, this.buffers);
      this.finishedReconstruction();
      return packet;
    }
    return null;
  }
  /**
   * Cleans up binary packet reconstruction variables.
   */
  finishedReconstruction() {
    this.reconPack = null;
    this.buffers = [];
  }
}
const parser = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  Decoder,
  Encoder,
  get PacketType() {
    return PacketType;
  },
  protocol
}, Symbol.toStringTag, { value: "Module" }));
function on(obj, ev, fn) {
  obj.on(ev, fn);
  return function subDestroy() {
    obj.off(ev, fn);
  };
}
const RESERVED_EVENTS = Object.freeze({
  connect: 1,
  connect_error: 1,
  disconnect: 1,
  disconnecting: 1,
  // EventEmitter reserved events: https://nodejs.org/api/events.html#events_event_newlistener
  newListener: 1,
  removeListener: 1
});
class Socket2 extends Emitter {
  /**
   * `Socket` constructor.
   */
  constructor(io, nsp, opts) {
    super();
    this.connected = false;
    this.recovered = false;
    this.receiveBuffer = [];
    this.sendBuffer = [];
    this._queue = [];
    this._queueSeq = 0;
    this.ids = 0;
    this.acks = {};
    this.flags = {};
    this.io = io;
    this.nsp = nsp;
    if (opts && opts.auth) {
      this.auth = opts.auth;
    }
    this._opts = Object.assign({}, opts);
    if (this.io._autoConnect)
      this.open();
  }
  /**
   * Whether the socket is currently disconnected
   *
   * @example
   * const socket = io();
   *
   * socket.on("connect", () => {
   *   console.log(socket.disconnected); // false
   * });
   *
   * socket.on("disconnect", () => {
   *   console.log(socket.disconnected); // true
   * });
   */
  get disconnected() {
    return !this.connected;
  }
  /**
   * Subscribe to open, close and packet events
   *
   * @private
   */
  subEvents() {
    if (this.subs)
      return;
    const io = this.io;
    this.subs = [
      on(io, "open", this.onopen.bind(this)),
      on(io, "packet", this.onpacket.bind(this)),
      on(io, "error", this.onerror.bind(this)),
      on(io, "close", this.onclose.bind(this))
    ];
  }
  /**
   * Whether the Socket will try to reconnect when its Manager connects or reconnects.
   *
   * @example
   * const socket = io();
   *
   * console.log(socket.active); // true
   *
   * socket.on("disconnect", (reason) => {
   *   if (reason === "io server disconnect") {
   *     // the disconnection was initiated by the server, you need to manually reconnect
   *     console.log(socket.active); // false
   *   }
   *   // else the socket will automatically try to reconnect
   *   console.log(socket.active); // true
   * });
   */
  get active() {
    return !!this.subs;
  }
  /**
   * "Opens" the socket.
   *
   * @example
   * const socket = io({
   *   autoConnect: false
   * });
   *
   * socket.connect();
   */
  connect() {
    if (this.connected)
      return this;
    this.subEvents();
    if (!this.io["_reconnecting"])
      this.io.open();
    if ("open" === this.io._readyState)
      this.onopen();
    return this;
  }
  /**
   * Alias for {@link connect()}.
   */
  open() {
    return this.connect();
  }
  /**
   * Sends a `message` event.
   *
   * This method mimics the WebSocket.send() method.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/send
   *
   * @example
   * socket.send("hello");
   *
   * // this is equivalent to
   * socket.emit("message", "hello");
   *
   * @return self
   */
  send(...args) {
    args.unshift("message");
    this.emit.apply(this, args);
    return this;
  }
  /**
   * Override `emit`.
   * If the event is in `events`, it's emitted normally.
   *
   * @example
   * socket.emit("hello", "world");
   *
   * // all serializable datastructures are supported (no need to call JSON.stringify)
   * socket.emit("hello", 1, "2", { 3: ["4"], 5: Uint8Array.from([6]) });
   *
   * // with an acknowledgement from the server
   * socket.emit("hello", "world", (val) => {
   *   // ...
   * });
   *
   * @return self
   */
  emit(ev, ...args) {
    var _a, _b, _c;
    if (RESERVED_EVENTS.hasOwnProperty(ev)) {
      throw new Error('"' + ev.toString() + '" is a reserved event name');
    }
    args.unshift(ev);
    if (this._opts.retries && !this.flags.fromQueue && !this.flags.volatile) {
      this._addToQueue(args);
      return this;
    }
    const packet = {
      type: PacketType.EVENT,
      data: args
    };
    packet.options = {};
    packet.options.compress = this.flags.compress !== false;
    if ("function" === typeof args[args.length - 1]) {
      const id = this.ids++;
      const ack = args.pop();
      this._registerAckCallback(id, ack);
      packet.id = id;
    }
    const isTransportWritable = (_b = (_a = this.io.engine) === null || _a === void 0 ? void 0 : _a.transport) === null || _b === void 0 ? void 0 : _b.writable;
    const isConnected = this.connected && !((_c = this.io.engine) === null || _c === void 0 ? void 0 : _c._hasPingExpired());
    const discardPacket = this.flags.volatile && !isTransportWritable;
    if (discardPacket) ;
    else if (isConnected) {
      this.notifyOutgoingListeners(packet);
      this.packet(packet);
    } else {
      this.sendBuffer.push(packet);
    }
    this.flags = {};
    return this;
  }
  /**
   * @private
   */
  _registerAckCallback(id, ack) {
    var _a;
    const timeout = (_a = this.flags.timeout) !== null && _a !== void 0 ? _a : this._opts.ackTimeout;
    if (timeout === void 0) {
      this.acks[id] = ack;
      return;
    }
    const timer = this.io.setTimeoutFn(() => {
      delete this.acks[id];
      for (let i = 0; i < this.sendBuffer.length; i++) {
        if (this.sendBuffer[i].id === id) {
          this.sendBuffer.splice(i, 1);
        }
      }
      ack.call(this, new Error("operation has timed out"));
    }, timeout);
    const fn = (...args) => {
      this.io.clearTimeoutFn(timer);
      ack.apply(this, args);
    };
    fn.withError = true;
    this.acks[id] = fn;
  }
  /**
   * Emits an event and waits for an acknowledgement
   *
   * @example
   * // without timeout
   * const response = await socket.emitWithAck("hello", "world");
   *
   * // with a specific timeout
   * try {
   *   const response = await socket.timeout(1000).emitWithAck("hello", "world");
   * } catch (err) {
   *   // the server did not acknowledge the event in the given delay
   * }
   *
   * @return a Promise that will be fulfilled when the server acknowledges the event
   */
  emitWithAck(ev, ...args) {
    return new Promise((resolve, reject) => {
      const fn = (arg1, arg2) => {
        return arg1 ? reject(arg1) : resolve(arg2);
      };
      fn.withError = true;
      args.push(fn);
      this.emit(ev, ...args);
    });
  }
  /**
   * Add the packet to the queue.
   * @param args
   * @private
   */
  _addToQueue(args) {
    let ack;
    if (typeof args[args.length - 1] === "function") {
      ack = args.pop();
    }
    const packet = {
      id: this._queueSeq++,
      tryCount: 0,
      pending: false,
      args,
      flags: Object.assign({ fromQueue: true }, this.flags)
    };
    args.push((err, ...responseArgs) => {
      if (packet !== this._queue[0]) {
        return;
      }
      const hasError = err !== null;
      if (hasError) {
        if (packet.tryCount > this._opts.retries) {
          this._queue.shift();
          if (ack) {
            ack(err);
          }
        }
      } else {
        this._queue.shift();
        if (ack) {
          ack(null, ...responseArgs);
        }
      }
      packet.pending = false;
      return this._drainQueue();
    });
    this._queue.push(packet);
    this._drainQueue();
  }
  /**
   * Send the first packet of the queue, and wait for an acknowledgement from the server.
   * @param force - whether to resend a packet that has not been acknowledged yet
   *
   * @private
   */
  _drainQueue(force = false) {
    if (!this.connected || this._queue.length === 0) {
      return;
    }
    const packet = this._queue[0];
    if (packet.pending && !force) {
      return;
    }
    packet.pending = true;
    packet.tryCount++;
    this.flags = packet.flags;
    this.emit.apply(this, packet.args);
  }
  /**
   * Sends a packet.
   *
   * @param packet
   * @private
   */
  packet(packet) {
    packet.nsp = this.nsp;
    this.io._packet(packet);
  }
  /**
   * Called upon engine `open`.
   *
   * @private
   */
  onopen() {
    if (typeof this.auth == "function") {
      this.auth((data) => {
        this._sendConnectPacket(data);
      });
    } else {
      this._sendConnectPacket(this.auth);
    }
  }
  /**
   * Sends a CONNECT packet to initiate the Socket.IO session.
   *
   * @param data
   * @private
   */
  _sendConnectPacket(data) {
    this.packet({
      type: PacketType.CONNECT,
      data: this._pid ? Object.assign({ pid: this._pid, offset: this._lastOffset }, data) : data
    });
  }
  /**
   * Called upon engine or manager `error`.
   *
   * @param err
   * @private
   */
  onerror(err) {
    if (!this.connected) {
      this.emitReserved("connect_error", err);
    }
  }
  /**
   * Called upon engine `close`.
   *
   * @param reason
   * @param description
   * @private
   */
  onclose(reason, description) {
    this.connected = false;
    delete this.id;
    this.emitReserved("disconnect", reason, description);
    this._clearAcks();
  }
  /**
   * Clears the acknowledgement handlers upon disconnection, since the client will never receive an acknowledgement from
   * the server.
   *
   * @private
   */
  _clearAcks() {
    Object.keys(this.acks).forEach((id) => {
      const isBuffered = this.sendBuffer.some((packet) => String(packet.id) === id);
      if (!isBuffered) {
        const ack = this.acks[id];
        delete this.acks[id];
        if (ack.withError) {
          ack.call(this, new Error("socket has been disconnected"));
        }
      }
    });
  }
  /**
   * Called with socket packet.
   *
   * @param packet
   * @private
   */
  onpacket(packet) {
    const sameNamespace = packet.nsp === this.nsp;
    if (!sameNamespace)
      return;
    switch (packet.type) {
      case PacketType.CONNECT:
        if (packet.data && packet.data.sid) {
          this.onconnect(packet.data.sid, packet.data.pid);
        } else {
          this.emitReserved("connect_error", new Error("It seems you are trying to reach a Socket.IO server in v2.x with a v3.x client, but they are not compatible (more information here: https://socket.io/docs/v3/migrating-from-2-x-to-3-0/)"));
        }
        break;
      case PacketType.EVENT:
      case PacketType.BINARY_EVENT:
        this.onevent(packet);
        break;
      case PacketType.ACK:
      case PacketType.BINARY_ACK:
        this.onack(packet);
        break;
      case PacketType.DISCONNECT:
        this.ondisconnect();
        break;
      case PacketType.CONNECT_ERROR:
        this.destroy();
        const err = new Error(packet.data.message);
        err.data = packet.data.data;
        this.emitReserved("connect_error", err);
        break;
    }
  }
  /**
   * Called upon a server event.
   *
   * @param packet
   * @private
   */
  onevent(packet) {
    const args = packet.data || [];
    if (null != packet.id) {
      args.push(this.ack(packet.id));
    }
    if (this.connected) {
      this.emitEvent(args);
    } else {
      this.receiveBuffer.push(Object.freeze(args));
    }
  }
  emitEvent(args) {
    if (this._anyListeners && this._anyListeners.length) {
      const listeners = this._anyListeners.slice();
      for (const listener of listeners) {
        listener.apply(this, args);
      }
    }
    super.emit.apply(this, args);
    if (this._pid && args.length && typeof args[args.length - 1] === "string") {
      this._lastOffset = args[args.length - 1];
    }
  }
  /**
   * Produces an ack callback to emit with an event.
   *
   * @private
   */
  ack(id) {
    const self2 = this;
    let sent = false;
    return function(...args) {
      if (sent)
        return;
      sent = true;
      self2.packet({
        type: PacketType.ACK,
        id,
        data: args
      });
    };
  }
  /**
   * Called upon a server acknowledgement.
   *
   * @param packet
   * @private
   */
  onack(packet) {
    const ack = this.acks[packet.id];
    if (typeof ack !== "function") {
      return;
    }
    delete this.acks[packet.id];
    if (ack.withError) {
      packet.data.unshift(null);
    }
    ack.apply(this, packet.data);
  }
  /**
   * Called upon server connect.
   *
   * @private
   */
  onconnect(id, pid) {
    this.id = id;
    this.recovered = pid && this._pid === pid;
    this._pid = pid;
    this.connected = true;
    this.emitBuffered();
    this.emitReserved("connect");
    this._drainQueue(true);
  }
  /**
   * Emit buffered events (received and emitted).
   *
   * @private
   */
  emitBuffered() {
    this.receiveBuffer.forEach((args) => this.emitEvent(args));
    this.receiveBuffer = [];
    this.sendBuffer.forEach((packet) => {
      this.notifyOutgoingListeners(packet);
      this.packet(packet);
    });
    this.sendBuffer = [];
  }
  /**
   * Called upon server disconnect.
   *
   * @private
   */
  ondisconnect() {
    this.destroy();
    this.onclose("io server disconnect");
  }
  /**
   * Called upon forced client/server side disconnections,
   * this method ensures the manager stops tracking us and
   * that reconnections don't get triggered for this.
   *
   * @private
   */
  destroy() {
    if (this.subs) {
      this.subs.forEach((subDestroy) => subDestroy());
      this.subs = void 0;
    }
    this.io["_destroy"](this);
  }
  /**
   * Disconnects the socket manually. In that case, the socket will not try to reconnect.
   *
   * If this is the last active Socket instance of the {@link Manager}, the low-level connection will be closed.
   *
   * @example
   * const socket = io();
   *
   * socket.on("disconnect", (reason) => {
   *   // console.log(reason); prints "io client disconnect"
   * });
   *
   * socket.disconnect();
   *
   * @return self
   */
  disconnect() {
    if (this.connected) {
      this.packet({ type: PacketType.DISCONNECT });
    }
    this.destroy();
    if (this.connected) {
      this.onclose("io client disconnect");
    }
    return this;
  }
  /**
   * Alias for {@link disconnect()}.
   *
   * @return self
   */
  close() {
    return this.disconnect();
  }
  /**
   * Sets the compress flag.
   *
   * @example
   * socket.compress(false).emit("hello");
   *
   * @param compress - if `true`, compresses the sending data
   * @return self
   */
  compress(compress) {
    this.flags.compress = compress;
    return this;
  }
  /**
   * Sets a modifier for a subsequent event emission that the event message will be dropped when this socket is not
   * ready to send messages.
   *
   * @example
   * socket.volatile.emit("hello"); // the server may or may not receive it
   *
   * @returns self
   */
  get volatile() {
    this.flags.volatile = true;
    return this;
  }
  /**
   * Sets a modifier for a subsequent event emission that the callback will be called with an error when the
   * given number of milliseconds have elapsed without an acknowledgement from the server:
   *
   * @example
   * socket.timeout(5000).emit("my-event", (err) => {
   *   if (err) {
   *     // the server did not acknowledge the event in the given delay
   *   }
   * });
   *
   * @returns self
   */
  timeout(timeout) {
    this.flags.timeout = timeout;
    return this;
  }
  /**
   * Adds a listener that will be fired when any event is emitted. The event name is passed as the first argument to the
   * callback.
   *
   * @example
   * socket.onAny((event, ...args) => {
   *   console.log(`got ${event}`);
   * });
   *
   * @param listener
   */
  onAny(listener) {
    this._anyListeners = this._anyListeners || [];
    this._anyListeners.push(listener);
    return this;
  }
  /**
   * Adds a listener that will be fired when any event is emitted. The event name is passed as the first argument to the
   * callback. The listener is added to the beginning of the listeners array.
   *
   * @example
   * socket.prependAny((event, ...args) => {
   *   console.log(`got event ${event}`);
   * });
   *
   * @param listener
   */
  prependAny(listener) {
    this._anyListeners = this._anyListeners || [];
    this._anyListeners.unshift(listener);
    return this;
  }
  /**
   * Removes the listener that will be fired when any event is emitted.
   *
   * @example
   * const catchAllListener = (event, ...args) => {
   *   console.log(`got event ${event}`);
   * }
   *
   * socket.onAny(catchAllListener);
   *
   * // remove a specific listener
   * socket.offAny(catchAllListener);
   *
   * // or remove all listeners
   * socket.offAny();
   *
   * @param listener
   */
  offAny(listener) {
    if (!this._anyListeners) {
      return this;
    }
    if (listener) {
      const listeners = this._anyListeners;
      for (let i = 0; i < listeners.length; i++) {
        if (listener === listeners[i]) {
          listeners.splice(i, 1);
          return this;
        }
      }
    } else {
      this._anyListeners = [];
    }
    return this;
  }
  /**
   * Returns an array of listeners that are listening for any event that is specified. This array can be manipulated,
   * e.g. to remove listeners.
   */
  listenersAny() {
    return this._anyListeners || [];
  }
  /**
   * Adds a listener that will be fired when any event is emitted. The event name is passed as the first argument to the
   * callback.
   *
   * Note: acknowledgements sent to the server are not included.
   *
   * @example
   * socket.onAnyOutgoing((event, ...args) => {
   *   console.log(`sent event ${event}`);
   * });
   *
   * @param listener
   */
  onAnyOutgoing(listener) {
    this._anyOutgoingListeners = this._anyOutgoingListeners || [];
    this._anyOutgoingListeners.push(listener);
    return this;
  }
  /**
   * Adds a listener that will be fired when any event is emitted. The event name is passed as the first argument to the
   * callback. The listener is added to the beginning of the listeners array.
   *
   * Note: acknowledgements sent to the server are not included.
   *
   * @example
   * socket.prependAnyOutgoing((event, ...args) => {
   *   console.log(`sent event ${event}`);
   * });
   *
   * @param listener
   */
  prependAnyOutgoing(listener) {
    this._anyOutgoingListeners = this._anyOutgoingListeners || [];
    this._anyOutgoingListeners.unshift(listener);
    return this;
  }
  /**
   * Removes the listener that will be fired when any event is emitted.
   *
   * @example
   * const catchAllListener = (event, ...args) => {
   *   console.log(`sent event ${event}`);
   * }
   *
   * socket.onAnyOutgoing(catchAllListener);
   *
   * // remove a specific listener
   * socket.offAnyOutgoing(catchAllListener);
   *
   * // or remove all listeners
   * socket.offAnyOutgoing();
   *
   * @param [listener] - the catch-all listener (optional)
   */
  offAnyOutgoing(listener) {
    if (!this._anyOutgoingListeners) {
      return this;
    }
    if (listener) {
      const listeners = this._anyOutgoingListeners;
      for (let i = 0; i < listeners.length; i++) {
        if (listener === listeners[i]) {
          listeners.splice(i, 1);
          return this;
        }
      }
    } else {
      this._anyOutgoingListeners = [];
    }
    return this;
  }
  /**
   * Returns an array of listeners that are listening for any event that is specified. This array can be manipulated,
   * e.g. to remove listeners.
   */
  listenersAnyOutgoing() {
    return this._anyOutgoingListeners || [];
  }
  /**
   * Notify the listeners for each packet sent
   *
   * @param packet
   *
   * @private
   */
  notifyOutgoingListeners(packet) {
    if (this._anyOutgoingListeners && this._anyOutgoingListeners.length) {
      const listeners = this._anyOutgoingListeners.slice();
      for (const listener of listeners) {
        listener.apply(this, packet.data);
      }
    }
  }
}
function Backoff(opts) {
  opts = opts || {};
  this.ms = opts.min || 100;
  this.max = opts.max || 1e4;
  this.factor = opts.factor || 2;
  this.jitter = opts.jitter > 0 && opts.jitter <= 1 ? opts.jitter : 0;
  this.attempts = 0;
}
Backoff.prototype.duration = function() {
  var ms = this.ms * Math.pow(this.factor, this.attempts++);
  if (this.jitter) {
    var rand = Math.random();
    var deviation = Math.floor(rand * this.jitter * ms);
    ms = (Math.floor(rand * 10) & 1) == 0 ? ms - deviation : ms + deviation;
  }
  return Math.min(ms, this.max) | 0;
};
Backoff.prototype.reset = function() {
  this.attempts = 0;
};
Backoff.prototype.setMin = function(min) {
  this.ms = min;
};
Backoff.prototype.setMax = function(max) {
  this.max = max;
};
Backoff.prototype.setJitter = function(jitter) {
  this.jitter = jitter;
};
class Manager extends Emitter {
  constructor(uri, opts) {
    var _a;
    super();
    this.nsps = {};
    this.subs = [];
    if (uri && "object" === typeof uri) {
      opts = uri;
      uri = void 0;
    }
    opts = opts || {};
    opts.path = opts.path || "/socket.io";
    this.opts = opts;
    installTimerFunctions(this, opts);
    this.reconnection(opts.reconnection !== false);
    this.reconnectionAttempts(opts.reconnectionAttempts || Infinity);
    this.reconnectionDelay(opts.reconnectionDelay || 1e3);
    this.reconnectionDelayMax(opts.reconnectionDelayMax || 5e3);
    this.randomizationFactor((_a = opts.randomizationFactor) !== null && _a !== void 0 ? _a : 0.5);
    this.backoff = new Backoff({
      min: this.reconnectionDelay(),
      max: this.reconnectionDelayMax(),
      jitter: this.randomizationFactor()
    });
    this.timeout(null == opts.timeout ? 2e4 : opts.timeout);
    this._readyState = "closed";
    this.uri = uri;
    const _parser = opts.parser || parser;
    this.encoder = new _parser.Encoder();
    this.decoder = new _parser.Decoder();
    this._autoConnect = opts.autoConnect !== false;
    if (this._autoConnect)
      this.open();
  }
  reconnection(v) {
    if (!arguments.length)
      return this._reconnection;
    this._reconnection = !!v;
    if (!v) {
      this.skipReconnect = true;
    }
    return this;
  }
  reconnectionAttempts(v) {
    if (v === void 0)
      return this._reconnectionAttempts;
    this._reconnectionAttempts = v;
    return this;
  }
  reconnectionDelay(v) {
    var _a;
    if (v === void 0)
      return this._reconnectionDelay;
    this._reconnectionDelay = v;
    (_a = this.backoff) === null || _a === void 0 ? void 0 : _a.setMin(v);
    return this;
  }
  randomizationFactor(v) {
    var _a;
    if (v === void 0)
      return this._randomizationFactor;
    this._randomizationFactor = v;
    (_a = this.backoff) === null || _a === void 0 ? void 0 : _a.setJitter(v);
    return this;
  }
  reconnectionDelayMax(v) {
    var _a;
    if (v === void 0)
      return this._reconnectionDelayMax;
    this._reconnectionDelayMax = v;
    (_a = this.backoff) === null || _a === void 0 ? void 0 : _a.setMax(v);
    return this;
  }
  timeout(v) {
    if (!arguments.length)
      return this._timeout;
    this._timeout = v;
    return this;
  }
  /**
   * Starts trying to reconnect if reconnection is enabled and we have not
   * started reconnecting yet
   *
   * @private
   */
  maybeReconnectOnOpen() {
    if (!this._reconnecting && this._reconnection && this.backoff.attempts === 0) {
      this.reconnect();
    }
  }
  /**
   * Sets the current transport `socket`.
   *
   * @param {Function} fn - optional, callback
   * @return self
   * @public
   */
  open(fn) {
    if (~this._readyState.indexOf("open"))
      return this;
    this.engine = new Socket$1(this.uri, this.opts);
    const socket = this.engine;
    const self2 = this;
    this._readyState = "opening";
    this.skipReconnect = false;
    const openSubDestroy = on(socket, "open", function() {
      self2.onopen();
      fn && fn();
    });
    const onError = (err) => {
      this.cleanup();
      this._readyState = "closed";
      this.emitReserved("error", err);
      if (fn) {
        fn(err);
      } else {
        this.maybeReconnectOnOpen();
      }
    };
    const errorSub = on(socket, "error", onError);
    if (false !== this._timeout) {
      const timeout = this._timeout;
      const timer = this.setTimeoutFn(() => {
        openSubDestroy();
        onError(new Error("timeout"));
        socket.close();
      }, timeout);
      if (this.opts.autoUnref) {
        timer.unref();
      }
      this.subs.push(() => {
        this.clearTimeoutFn(timer);
      });
    }
    this.subs.push(openSubDestroy);
    this.subs.push(errorSub);
    return this;
  }
  /**
   * Alias for open()
   *
   * @return self
   * @public
   */
  connect(fn) {
    return this.open(fn);
  }
  /**
   * Called upon transport open.
   *
   * @private
   */
  onopen() {
    this.cleanup();
    this._readyState = "open";
    this.emitReserved("open");
    const socket = this.engine;
    this.subs.push(
      on(socket, "ping", this.onping.bind(this)),
      on(socket, "data", this.ondata.bind(this)),
      on(socket, "error", this.onerror.bind(this)),
      on(socket, "close", this.onclose.bind(this)),
      // @ts-ignore
      on(this.decoder, "decoded", this.ondecoded.bind(this))
    );
  }
  /**
   * Called upon a ping.
   *
   * @private
   */
  onping() {
    this.emitReserved("ping");
  }
  /**
   * Called with data.
   *
   * @private
   */
  ondata(data) {
    try {
      this.decoder.add(data);
    } catch (e) {
      this.onclose("parse error", e);
    }
  }
  /**
   * Called when parser fully decodes a packet.
   *
   * @private
   */
  ondecoded(packet) {
    nextTick(() => {
      this.emitReserved("packet", packet);
    }, this.setTimeoutFn);
  }
  /**
   * Called upon socket error.
   *
   * @private
   */
  onerror(err) {
    this.emitReserved("error", err);
  }
  /**
   * Creates a new socket for the given `nsp`.
   *
   * @return {Socket}
   * @public
   */
  socket(nsp, opts) {
    let socket = this.nsps[nsp];
    if (!socket) {
      socket = new Socket2(this, nsp, opts);
      this.nsps[nsp] = socket;
    } else if (this._autoConnect && !socket.active) {
      socket.connect();
    }
    return socket;
  }
  /**
   * Called upon a socket close.
   *
   * @param socket
   * @private
   */
  _destroy(socket) {
    const nsps = Object.keys(this.nsps);
    for (const nsp of nsps) {
      const socket2 = this.nsps[nsp];
      if (socket2.active) {
        return;
      }
    }
    this._close();
  }
  /**
   * Writes a packet.
   *
   * @param packet
   * @private
   */
  _packet(packet) {
    const encodedPackets = this.encoder.encode(packet);
    for (let i = 0; i < encodedPackets.length; i++) {
      this.engine.write(encodedPackets[i], packet.options);
    }
  }
  /**
   * Clean up transport subscriptions and packet buffer.
   *
   * @private
   */
  cleanup() {
    this.subs.forEach((subDestroy) => subDestroy());
    this.subs.length = 0;
    this.decoder.destroy();
  }
  /**
   * Close the current socket.
   *
   * @private
   */
  _close() {
    this.skipReconnect = true;
    this._reconnecting = false;
    this.onclose("forced close");
  }
  /**
   * Alias for close()
   *
   * @private
   */
  disconnect() {
    return this._close();
  }
  /**
   * Called when:
   *
   * - the low-level engine is closed
   * - the parser encountered a badly formatted packet
   * - all sockets are disconnected
   *
   * @private
   */
  onclose(reason, description) {
    var _a;
    this.cleanup();
    (_a = this.engine) === null || _a === void 0 ? void 0 : _a.close();
    this.backoff.reset();
    this._readyState = "closed";
    this.emitReserved("close", reason, description);
    if (this._reconnection && !this.skipReconnect) {
      this.reconnect();
    }
  }
  /**
   * Attempt a reconnection.
   *
   * @private
   */
  reconnect() {
    if (this._reconnecting || this.skipReconnect)
      return this;
    const self2 = this;
    if (this.backoff.attempts >= this._reconnectionAttempts) {
      this.backoff.reset();
      this.emitReserved("reconnect_failed");
      this._reconnecting = false;
    } else {
      const delay = this.backoff.duration();
      this._reconnecting = true;
      const timer = this.setTimeoutFn(() => {
        if (self2.skipReconnect)
          return;
        this.emitReserved("reconnect_attempt", self2.backoff.attempts);
        if (self2.skipReconnect)
          return;
        self2.open((err) => {
          if (err) {
            self2._reconnecting = false;
            self2.reconnect();
            this.emitReserved("reconnect_error", err);
          } else {
            self2.onreconnect();
          }
        });
      }, delay);
      if (this.opts.autoUnref) {
        timer.unref();
      }
      this.subs.push(() => {
        this.clearTimeoutFn(timer);
      });
    }
  }
  /**
   * Called upon successful reconnect.
   *
   * @private
   */
  onreconnect() {
    const attempt = this.backoff.attempts;
    this._reconnecting = false;
    this.backoff.reset();
    this.emitReserved("reconnect", attempt);
  }
}
const cache = {};
function lookup(uri, opts) {
  if (typeof uri === "object") {
    opts = uri;
    uri = void 0;
  }
  opts = opts || {};
  const parsed = url(uri, opts.path || "/socket.io");
  const source = parsed.source;
  const id = parsed.id;
  const path = parsed.path;
  const sameNamespace = cache[id] && path in cache[id]["nsps"];
  const newConnection = opts.forceNew || opts["force new connection"] || false === opts.multiplex || sameNamespace;
  let io;
  if (newConnection) {
    io = new Manager(source, opts);
  } else {
    if (!cache[id]) {
      cache[id] = new Manager(source, opts);
    }
    io = cache[id];
  }
  if (parsed.query && !opts.query) {
    opts.query = parsed.queryKey;
  }
  return io.socket(parsed.path, opts);
}
Object.assign(lookup, {
  Manager,
  Socket: Socket2,
  io: lookup,
  connect: lookup
});
function useSocketQuotes(options = {}) {
  const {
    symbols = [],
    onQuoteUpdate,
    enabled = true
  } = options;
  const [quotes, setQuotes] = reactExports.useState(/* @__PURE__ */ new Map());
  const [connected, setConnected] = reactExports.useState(false);
  const [error, setError] = reactExports.useState(null);
  const socketRef = reactExports.useRef(null);
  const quotesMapRef = reactExports.useRef(/* @__PURE__ */ new Map());
  reactExports.useEffect(() => {
    if (!enabled) return;
    const socketUrl = "https://crucial-ivonne-alfalyzer-90666a9e.coolify.app";
    console.log("🔌 Connecting to Socket.IO server at:", socketUrl);
    const socket = lookup(socketUrl, {
      path: "/socket.io/",
      transports: ["polling", "websocket"],
      // Start with polling, then upgrade
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1e3,
      withCredentials: true
    });
    socketRef.current = socket;
    socket.on("connect", () => {
      console.log("✅ Socket.IO connected:", socket.id);
      setConnected(true);
      setError(null);
      if (symbols.length > 0) {
        console.log("📊 Subscribing to symbols:", symbols);
        socket.emit("subscribe", symbols);
      }
    });
    socket.on("disconnect", () => {
      console.log("❌ Socket.IO disconnected");
      setConnected(false);
    });
    socket.on("connect_error", (err) => {
      console.error("🔴 Socket.IO connection error:", err.message);
      setError(`Connection error: ${err.message}`);
    });
    socket.on("batch-update", (data) => {
      console.log(`📡 Received batch update with ${data.data?.length || 0} quotes`);
      if (data.data && Array.isArray(data.data)) {
        const newQuotesMap = new Map(quotesMapRef.current);
        data.data.forEach((quote) => {
          newQuotesMap.set(quote.symbol, {
            ...quote,
            timestamp: data.timestamp || Date.now()
          });
          if (onQuoteUpdate) {
            onQuoteUpdate(quote);
          }
        });
        quotesMapRef.current = newQuotesMap;
        setQuotes(new Map(newQuotesMap));
      }
    });
    socket.on("quote-update", (data) => {
      console.log(`📈 Received quote update for ${data.symbol}: $${data.price}`);
      const newQuotesMap = new Map(quotesMapRef.current);
      newQuotesMap.set(data.symbol, data);
      quotesMapRef.current = newQuotesMap;
      setQuotes(new Map(newQuotesMap));
      if (onQuoteUpdate) {
        onQuoteUpdate(data);
      }
    });
    socket.on("market-update", (data) => {
      console.log("🌐 Received market update:", data.type, data.symbol);
      if (data.type === "quote" && data.data) {
        const newQuotesMap = new Map(quotesMapRef.current);
        newQuotesMap.set(data.symbol, {
          ...data.data,
          symbol: data.symbol,
          timestamp: data.timestamp || Date.now()
        });
        quotesMapRef.current = newQuotesMap;
        setQuotes(new Map(newQuotesMap));
        if (onQuoteUpdate) {
          onQuoteUpdate(data.data);
        }
      }
    });
    return () => {
      console.log("🔌 Cleaning up Socket.IO connection");
      if (socket) {
        socket.disconnect();
      }
    };
  }, [enabled]);
  reactExports.useEffect(() => {
    if (socketRef.current && socketRef.current.connected && symbols.length > 0) {
      console.log("📊 Updating subscription to symbols:", symbols);
      socketRef.current.emit("subscribe", symbols);
    }
  }, [symbols.join(",")]);
  const getQuote = reactExports.useCallback((symbol) => {
    return quotesMapRef.current.get(symbol);
  }, []);
  const getAllQuotes = reactExports.useCallback(() => {
    return Array.from(quotesMapRef.current.values());
  }, []);
  const reconnect = reactExports.useCallback(() => {
    if (socketRef.current) {
      console.log("🔄 Forcing Socket.IO reconnection");
      socketRef.current.connect();
    }
  }, []);
  return {
    quotes,
    connected,
    error,
    getQuote,
    getAllQuotes,
    reconnect,
    socket: socketRef.current
  };
}
function TestAPIConnection() {
  const [tests, setTests] = reactExports.useState([{
    name: "Backend Health Check",
    status: "pending"
  }, {
    name: "Stock Quote API (AAPL)",
    status: "pending"
  }, {
    name: "Simple POST Test",
    status: "pending"
  }, {
    name: "Batch Quotes API",
    status: "pending"
  }, {
    name: "Market Status API",
    status: "pending"
  }]);
  const [isRunning, setIsRunning] = reactExports.useState(false);
  const runTests = async () => {
    setIsRunning(true);
    const results = [];
    const baseURL = API_CONFIG.baseURL;
    try {
      const healthRes = await fetch(`${baseURL}/api/v1/health`);
      const healthData = await healthRes.json();
      results.push({
        name: "Backend Health Check",
        status: healthRes.ok ? "success" : "error",
        message: healthRes.ok ? "Backend is healthy" : "Backend health check failed",
        data: healthData
      });
    } catch (error) {
      results.push({
        name: "Backend Health Check",
        status: "error",
        message: `Failed to connect: ${error instanceof Error ? error.message : "Unknown error"}`
      });
    }
    try {
      const quoteRes = await fetch(`${baseURL}/api/v1/stock/AAPL/quote`);
      const quoteData = await quoteRes.json();
      const price = quoteData.success && quoteData.data ? quoteData.data.price : quoteData.price;
      results.push({
        name: "Stock Quote API (AAPL)",
        status: quoteRes.ok && price ? "success" : "error",
        message: quoteRes.ok ? `AAPL Price: $${price} (Real-time)` : "Failed to fetch quote",
        data: quoteData
      });
    } catch (error) {
      results.push({
        name: "Stock Quote API (AAPL)",
        status: "error",
        message: `Failed to fetch: ${error instanceof Error ? error.message : "Unknown error"}`
      });
    }
    try {
      const postRes = await fetch(`${baseURL}/api/market-data/test-post`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          test: "data",
          timestamp: Date.now()
        })
      });
      const contentType = postRes.headers.get("content-type");
      let postData;
      if (contentType && contentType.includes("application/json")) {
        postData = await postRes.json();
      } else {
        const text = await postRes.text();
        postData = {
          error: "Non-JSON response",
          body: text.substring(0, 100)
        };
      }
      results.push({
        name: "Simple POST Test",
        status: postRes.ok ? "success" : "error",
        message: postRes.ok ? "POST request successful" : `Failed with status ${postRes.status}`,
        data: postData
      });
    } catch (error) {
      results.push({
        name: "Simple POST Test",
        status: "error",
        message: `Failed to POST: ${error instanceof Error ? error.message : "Unknown error"}`
      });
    }
    try {
      const batchRes = await fetch(`${baseURL}/api/market-data/quotes/batch?symbols=AAPL,GOOGL,MSFT`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        }
      });
      const contentType = batchRes.headers.get("content-type");
      let batchData;
      if (contentType && contentType.includes("application/json")) {
        batchData = await batchRes.json();
      } else {
        const text = await batchRes.text();
        throw new Error(`Unexpected response format: ${text.substring(0, 100)}...`);
      }
      const quotesCount = batchData.quotes ? batchData.quotes.length : 0;
      results.push({
        name: "Batch Quotes API",
        status: batchRes.ok && quotesCount > 0 ? "success" : "error",
        message: batchRes.ok ? `Fetched ${quotesCount} quotes` : "Failed to fetch batch quotes",
        data: batchData
      });
    } catch (error) {
      results.push({
        name: "Batch Quotes API",
        status: "error",
        message: `Failed to fetch: ${error instanceof Error ? error.message : "Unknown error"}`
      });
    }
    try {
      const statusRes = await fetch(`${baseURL}/api/market-data/market-status`);
      const statusData = await statusRes.json();
      results.push({
        name: "Market Status API",
        status: statusRes.ok ? "success" : "error",
        message: statusRes.ok ? `Market is ${statusData.isOpen ? "OPEN" : "CLOSED"}` : "Failed to fetch status",
        data: statusData
      });
    } catch (error) {
      results.push({
        name: "Market Status API",
        status: "error",
        message: `Failed to fetch: ${error instanceof Error ? error.message : "Unknown error"}`
      });
    }
    setTests(results);
    setIsRunning(false);
  };
  const getStatusIcon = (status) => {
    switch (status) {
      case "success":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheckBig, {
          className: "h-5 w-5 text-green-500"
        });
      case "error":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(CircleX, {
          className: "h-5 w-5 text-red-500"
        });
      default:
        return /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, {
          className: "h-5 w-5 animate-spin text-gray-500"
        });
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
    className: "max-w-2xl mx-auto",
    children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, {
        children: "API Connection Test"
      })
    }), /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
      className: "space-y-4",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
        onClick: runTests,
        disabled: isRunning,
        className: "w-full",
        children: isRunning ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, {
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, {
            className: "mr-2 h-4 w-4 animate-spin"
          }), "Running Tests..."]
        }) : "Run API Tests"
      }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
        className: "space-y-2",
        children: tests.map((test, index) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
          className: "flex items-center justify-between p-3 border rounded-lg",
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex items-center space-x-3",
            children: [getStatusIcon(test.status), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                className: "font-medium",
                children: test.name
              }), test.message && /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                className: "text-sm text-muted-foreground",
                children: test.message
              })]
            })]
          })
        }, index))
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "mt-4 p-4 bg-muted rounded-lg",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx("p", {
          className: "text-sm font-medium mb-2",
          children: "Expected Results:"
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("ul", {
          className: "text-sm text-muted-foreground space-y-1",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx("li", {
            children: "✅ Backend Health Check should pass"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("li", {
            children: "✅ Stock quotes should show real prices (not demo data)"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("li", {
            children: "✅ No CORS errors in browser console"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("li", {
            children: "✅ No WebSocket errors (they're disabled)"
          })]
        })]
      })]
    })]
  });
}
const __vite_import_meta_env__ = { "BASE_URL": "/", "DEV": false, "MODE": "production", "PROD": true, "SSR": false, "VITE_API_URL": "https://crucial-ivonne-alfalyzer-90666a9e.coolify.app", "VITE_STRIPE_PUBLISHABLE_KEY": "pk_test_51Rk4X709S131S3SekOeSHiCXa1GGcnKqBtW9czmrggHqj7yinv8rupIbOMYmmfGGNdisSU62QW14GGDgllI9k6qy00TyIffmuw", "VITE_SUPABASE_ANON_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2am5mZXNzZWZ4dGZ1cmF5eWJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzMzA0MzUsImV4cCI6MjA2NzkwNjQzNX0.Y5PnmWmemcXroIKBcycgTiUceINMOuVe34aQUcygl9Q", "VITE_SUPABASE_URL": "https://avjnfessefxtfurayybp.supabase.co" };
var define_process_env_default = {};
const FORBIDDEN_FRONTEND_VARS = [
  "VITE_DATABASE_URL",
  "JWT_SECRET",
  "JWT_REFRESH_SECRET"
  // API keys também não devem estar no frontend em produção
  // SECURITY: API keys moved to server-side for security
  // Client should use server proxy endpoints instead
];
const getEnvVar = (key, defaultValue = "") => {
  if (typeof window !== "undefined" && FORBIDDEN_FRONTEND_VARS.includes(key)) {
    console.error(`🚨 SECURITY WARNING: Attempted to access forbidden variable "${key}" in frontend!`);
    console.error("This variable should only be accessed from the backend.");
    return "";
  }
  if (typeof window === "undefined") {
    try {
      const serverValue = define_process_env_default?.[key];
      if (serverValue && serverValue !== "undefined") {
        return serverValue;
      }
    } catch {
    }
    return defaultValue;
  }
  try {
    return __vite_import_meta_env__?.[key] || defaultValue;
  } catch {
    return defaultValue;
  }
};
const env = {
  // URLs públicas (OK no frontend)
  VITE_SUPABASE_URL: getEnvVar("VITE_SUPABASE_URL", ""),
  VITE_SUPABASE_ANON_KEY: getEnvVar("VITE_SUPABASE_ANON_KEY", ""),
  // Anon key é pública por design
  VITE_WHOP_CLIENT_ID: getEnvVar("VITE_WHOP_CLIENT_ID", ""),
  // Deprecated - should not be used
  // Ambiente
  NODE_ENV: getEnvVar("NODE_ENV", "development"),
  VITE_APP_NAME: getEnvVar("VITE_APP_NAME", "Alfalyzer")
};
const isDevelopment = () => {
  return env.NODE_ENV === "development" || false;
};
const isServer = () => {
  return typeof window === "undefined";
};
if (isDevelopment() && !isServer()) {
  console.log("%c⚠️ Security Notice", "color: orange; font-size: 16px; font-weight: bold;", "\nAPI keys should not be used directly in the frontend.", "\nUse backend proxy endpoints instead.", "\nSee /api/market-data/* routes.");
}
function ConnectionTest() {
  const [isLoading, setIsLoading] = reactExports.useState(false);
  const [result, setResult] = reactExports.useState(null);
  const testConnection = async () => {
    setIsLoading(true);
    setResult(null);
    const isVercel = typeof window !== "undefined" && (window.location.hostname.includes(".vercel.app") || window.location.hostname === "alfalyzer.com");
    const apiUrl = isVercel ? "" : "";
    const testUrl = `${apiUrl}/api/market-data/test`;
    console.log("🧪 Testing connection to:", testUrl);
    try {
      const response = await fetch(testUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        },
        mode: "cors"
      });
      const data = await response.json();
      if (response.ok) {
        setResult({
          success: true,
          message: "Successfully connected to backend!",
          details: data
        });
      } else {
        setResult({
          success: false,
          message: `Backend returned error: ${response.status}`,
          details: data
        });
      }
    } catch (error) {
      console.error("Connection test failed:", error);
      setResult({
        success: false,
        message: error.message || "Failed to connect to backend",
        details: {
          error: error.toString(),
          apiUrl,
          suggestion: "Make sure the backend server is running with: npm run dev"
        }
      });
    } finally {
      setIsLoading(false);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
    className: "max-w-2xl mx-auto",
    children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, {
        children: "Backend Connection Test"
      })
    }), /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
      className: "space-y-4",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
        className: "text-sm text-muted-foreground",
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
          children: ["API URL: ", /* @__PURE__ */ jsxRuntimeExports.jsx("code", {
            className: "text-xs bg-muted px-1 py-0.5 rounded",
            children: typeof window !== "undefined" && (window.location.hostname.includes(".vercel.app") || window.location.hostname === "alfalyzer.com") ? "Using Vercel Proxy (relative URLs)" : "http://jsg00k40sgo0k4swsoc4gcsg.128.140.45.28.sslip.io"
          })]
        })
      }), /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
        onClick: testConnection,
        disabled: isLoading,
        className: "w-full",
        children: isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, {
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, {
            className: "mr-2 h-4 w-4 animate-spin"
          }), "Testing..."]
        }) : "Test Connection"
      }), result && /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, {
        variant: result.success ? "default" : "destructive",
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "flex items-start gap-2",
          children: [result.success ? /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheckBig, {
            className: "h-4 w-4 mt-0.5 text-green-500"
          }) : /* @__PURE__ */ jsxRuntimeExports.jsx(CircleX, {
            className: "h-4 w-4 mt-0.5"
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex-1",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(AlertDescription, {
              children: result.message
            }), result.details && /* @__PURE__ */ jsxRuntimeExports.jsx("pre", {
              className: "mt-2 text-xs overflow-auto bg-muted p-2 rounded",
              children: JSON.stringify(result.details, null, 2)
            })]
          })]
        })
      })]
    })]
  });
}
const MarketMovers = () => {
  const [, setLocation] = useLocation();
  const [data, setData] = reactExports.useState(null);
  const [loading, setLoading] = reactExports.useState(true);
  const [error, setError] = reactExports.useState(null);
  const [activeTab, setActiveTab] = reactExports.useState("gainers");
  const fetchMarketMovers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/market-data/market/movers", {
        headers: {
          "Accept": "application/json"
        },
        credentials: "include"
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch market movers: ${response.status}`);
      }
      const moversData = await response.json();
      setData(moversData);
    } catch (err) {
      console.error("Error fetching market movers:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch market movers");
    } finally {
      setLoading(false);
    }
  };
  reactExports.useEffect(() => {
    fetchMarketMovers();
    const interval = setInterval(fetchMarketMovers, 5 * 60 * 1e3);
    return () => clearInterval(interval);
  }, []);
  const handleStockClick = (symbol) => {
    setLocation(`/stock/${symbol}`);
  };
  const formatVolume = (volume) => {
    if (volume >= 1e9) return `${(volume / 1e9).toFixed(2)}B`;
    if (volume >= 1e6) return `${(volume / 1e6).toFixed(2)}M`;
    if (volume >= 1e3) return `${(volume / 1e3).toFixed(2)}K`;
    return volume.toString();
  };
  const renderMoverCard = (mover, index) => {
    const isPositive = mover.changePercent >= 0;
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
      className: "flex items-center justify-between p-3 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer",
      onClick: () => handleStockClick(mover.symbol),
      children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "flex items-center gap-3",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
          className: "flex items-center justify-center w-8 h-8 rounded-full bg-muted text-xs font-bold",
          children: index + 1
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "font-semibold",
            children: mover.symbol
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "text-xs text-muted-foreground truncate max-w-[150px]",
            children: mover.name
          })]
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "text-right",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "font-semibold",
          children: ["$", mover.price.toFixed(2)]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: cn("flex items-center gap-1 text-sm font-medium justify-end", isPositive ? "text-green-600" : "text-red-600"),
          children: [isPositive ? /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowUp, {
            className: "w-3 h-3"
          }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowDown, {
            className: "w-3 h-3"
          }), isPositive ? "+" : "", mover.changePercent.toFixed(2), "%"]
        }), activeTab === "active" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "text-xs text-muted-foreground",
          children: ["Vol: ", formatVolume(mover.volume)]
        })]
      })]
    }, mover.symbol);
  };
  const renderLoadingState = () => /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
    className: "space-y-3",
    children: [1, 2, 3, 4, 5].map((i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
      className: "flex items-center justify-between p-3",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "flex items-center gap-3",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, {
          className: "w-8 h-8 rounded-full"
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, {
            className: "h-4 w-16 mb-1"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, {
            className: "h-3 w-24"
          })]
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "text-right",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, {
          className: "h-4 w-12 mb-1"
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, {
          className: "h-3 w-16"
        })]
      })]
    }, i))
  });
  const getCurrentMovers = () => {
    if (!data) return [];
    switch (activeTab) {
      case "gainers":
        return data.gainers;
      case "losers":
        return data.losers;
      case "active":
        return data.mostActive;
      default:
        return [];
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
    className: "border-teya-green/20",
    children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, {
      children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "flex items-center justify-between",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, {
          className: "flex items-center gap-2",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Activity, {
            className: "w-5 h-5 text-teya-green"
          }), "Market Movers"]
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
          variant: "ghost",
          size: "sm",
          onClick: fetchMarketMovers,
          disabled: loading,
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, {
            className: cn("w-4 h-4", loading && "animate-spin")
          })
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "flex gap-2 mt-4",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
          variant: activeTab === "gainers" ? "default" : "outline",
          size: "sm",
          onClick: () => setActiveTab("gainers"),
          className: activeTab === "gainers" ? "bg-green-600 hover:bg-green-700" : "",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, {
            className: "w-4 h-4 mr-1"
          }), "Maiores Ganhos"]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
          variant: activeTab === "losers" ? "default" : "outline",
          size: "sm",
          onClick: () => setActiveTab("losers"),
          className: activeTab === "losers" ? "bg-red-600 hover:bg-red-700" : "",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(TrendingDown, {
            className: "w-4 h-4 mr-1"
          }), "Maiores Quedas"]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
          variant: activeTab === "active" ? "default" : "outline",
          size: "sm",
          onClick: () => setActiveTab("active"),
          className: activeTab === "active" ? "bg-blue-600 hover:bg-blue-700" : "",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Activity, {
            className: "w-4 h-4 mr-1"
          }), "Mais Ativas"]
        })]
      })]
    }), /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
      children: [error ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "flex flex-col items-center justify-center py-8 text-center",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, {
          className: "w-8 h-8 text-yellow-500 mb-2"
        }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
          className: "text-sm text-muted-foreground",
          children: error
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
          variant: "outline",
          size: "sm",
          onClick: fetchMarketMovers,
          className: "mt-2",
          children: "Try Again"
        })]
      }) : loading ? renderLoadingState() : data && getCurrentMovers().length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
        className: "space-y-2",
        children: getCurrentMovers().map((mover, index) => renderMoverCard(mover, index))
      }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
        className: "text-center py-8",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
          className: "text-sm text-muted-foreground",
          children: "No market movers available"
        })
      }), data && !loading && !error && /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
        className: "mt-4 pt-4 border-t",
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
          className: "text-xs text-muted-foreground text-center",
          children: ["Last updated: ", new Date(data.timestamp).toLocaleTimeString()]
        })
      })]
    })]
  });
};
function StockCardSkeleton() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
    className: "h-full",
    children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, {
      children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "flex justify-between items-start mb-2",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "flex items-center gap-3",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, {
            className: "h-12 w-12 rounded-lg"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, {
            className: "h-6 w-16 rounded-full"
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, {
          className: "h-6 w-20"
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, {
        className: "h-6 w-32 mb-1"
      }), /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, {
        className: "h-4 w-48"
      })]
    }), /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
      children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, {
        className: "h-8 w-24 mb-4"
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "grid grid-cols-2 gap-2 mb-4",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, {
          className: "h-16"
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, {
          className: "h-16"
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "flex gap-2",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, {
          className: "h-9 flex-1"
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, {
          className: "h-9 flex-1"
        })]
      })]
    })]
  });
}
const ALL_STOCKS = [
  // Tech Giants
  "AAPL",
  "MSFT",
  "GOOGL",
  "AMZN",
  "META",
  "NVDA",
  // Financial
  "JPM",
  "V",
  "MA",
  "BAC",
  "WFC",
  "BRK-B",
  // Healthcare
  "JNJ",
  "UNH",
  "PFE",
  "ABBV",
  "TMO",
  "ABT",
  "CVS",
  "MDT",
  "BMY",
  // Consumer
  "WMT",
  "PG",
  "DIS",
  "NKE",
  "MCD",
  "COST",
  "LOW",
  "HD",
  "PEP",
  // Energy & Industrials
  "XOM",
  "CVX",
  "UPS",
  "UNP",
  "HON",
  "LIN",
  "DHR",
  // Tech/Software
  "CRM",
  "ORCL",
  "ADBE",
  "NFLX",
  "PYPL",
  "TXN",
  "QCOM",
  "AVGO",
  "INTC",
  // Telecom & Others
  "VZ",
  "CMCSA",
  "NEE",
  "PM",
  "TSLA",
  "ACN"
];
const POPULAR_SYMBOLS = ALL_STOCKS.slice(0, 15);
function getCompanyName(symbol) {
  const companyNames = {
    // Tech Giants
    "AAPL": "Apple Inc.",
    "MSFT": "Microsoft Corporation",
    "GOOGL": "Alphabet Inc.",
    "AMZN": "Amazon.com Inc.",
    "META": "Meta Platforms Inc.",
    "NVDA": "NVIDIA Corporation",
    // Financial
    "JPM": "JPMorgan Chase & Co.",
    "V": "Visa Inc.",
    "MA": "Mastercard Incorporated",
    "BAC": "Bank of America Corp.",
    "WFC": "Wells Fargo & Company",
    "BRK-B": "Berkshire Hathaway Inc.",
    // Healthcare
    "JNJ": "Johnson & Johnson",
    "UNH": "UnitedHealth Group Inc.",
    "PFE": "Pfizer Inc.",
    "ABBV": "AbbVie Inc.",
    "TMO": "Thermo Fisher Scientific Inc.",
    "ABT": "Abbott Laboratories",
    "CVS": "CVS Health Corporation",
    "MDT": "Medtronic plc",
    "BMY": "Bristol-Myers Squibb Co.",
    // Consumer
    "WMT": "Walmart Inc.",
    "PG": "Procter & Gamble Co.",
    "DIS": "The Walt Disney Company",
    "NKE": "Nike Inc.",
    "MCD": "McDonald's Corporation",
    "COST": "Costco Wholesale Corporation",
    "LOW": "Lowe's Companies Inc.",
    "HD": "The Home Depot Inc.",
    "PEP": "PepsiCo Inc.",
    // Energy & Industrials
    "XOM": "Exxon Mobil Corporation",
    "CVX": "Chevron Corporation",
    "UPS": "United Parcel Service Inc.",
    "UNP": "Union Pacific Corporation",
    "HON": "Honeywell International Inc.",
    "LIN": "Linde plc",
    "DHR": "Danaher Corporation",
    // Tech/Software
    "CRM": "Salesforce Inc.",
    "ORCL": "Oracle Corporation",
    "ADBE": "Adobe Inc.",
    "NFLX": "Netflix Inc.",
    "PYPL": "PayPal Holdings Inc.",
    "TXN": "Texas Instruments Inc.",
    "QCOM": "QUALCOMM Inc.",
    "AVGO": "Broadcom Inc.",
    "INTC": "Intel Corporation",
    // Telecom & Others
    "VZ": "Verizon Communications Inc.",
    "CMCSA": "Comcast Corporation",
    "NEE": "NextEra Energy Inc.",
    "PM": "Philip Morris International Inc.",
    "TSLA": "Tesla Inc.",
    "ACN": "Accenture plc"
  };
  return companyNames[symbol] || `${symbol} Corporation`;
}
function getIndustry(symbol) {
  const industries = {
    // Tech Giants
    "AAPL": "Consumer Electronics",
    "MSFT": "Software",
    "GOOGL": "Internet Services",
    "AMZN": "E-Commerce",
    "META": "Social Media",
    "NVDA": "Semiconductors",
    // Financial
    "JPM": "Banking",
    "V": "Payment Services",
    "MA": "Payment Services",
    "BAC": "Banking",
    "WFC": "Banking",
    "BRK-B": "Insurance & Investments",
    // Healthcare
    "JNJ": "Pharmaceuticals",
    "UNH": "Health Insurance",
    "PFE": "Pharmaceuticals",
    "ABBV": "Biotechnology",
    "TMO": "Medical Equipment",
    "ABT": "Medical Devices",
    "CVS": "Healthcare Services",
    "MDT": "Medical Devices",
    "BMY": "Pharmaceuticals",
    // Consumer
    "WMT": "Retail",
    "PG": "Consumer Goods",
    "DIS": "Entertainment",
    "NKE": "Apparel & Footwear",
    "MCD": "Restaurants",
    "COST": "Retail",
    "LOW": "Home Improvement",
    "HD": "Home Improvement",
    "PEP": "Beverages",
    // Energy & Industrials
    "XOM": "Oil & Gas",
    "CVX": "Oil & Gas",
    "UPS": "Logistics",
    "UNP": "Railroads",
    "HON": "Industrial Conglomerate",
    "LIN": "Industrial Gases",
    "DHR": "Industrial Conglomerate",
    // Tech/Software
    "CRM": "Software",
    "ORCL": "Software",
    "ADBE": "Software",
    "NFLX": "Streaming Services",
    "PYPL": "Payment Services",
    "TXN": "Semiconductors",
    "QCOM": "Semiconductors",
    "AVGO": "Semiconductors",
    "INTC": "Semiconductors",
    // Telecom & Others
    "VZ": "Telecommunications",
    "CMCSA": "Media & Cable",
    "NEE": "Utilities",
    "PM": "Tobacco",
    "TSLA": "Automotive",
    "ACN": "IT Services"
  };
  return industries[symbol] || "Technology";
}
function getSector(symbol) {
  const sectors = {
    // Technology
    "AAPL": "Technology",
    "MSFT": "Technology",
    "GOOGL": "Technology",
    "META": "Technology",
    "NVDA": "Technology",
    "CRM": "Technology",
    "ORCL": "Technology",
    "ADBE": "Technology",
    "PYPL": "Technology",
    "TXN": "Technology",
    "QCOM": "Technology",
    "AVGO": "Technology",
    "INTC": "Technology",
    "ACN": "Technology",
    // Financial Services
    "JPM": "Financial Services",
    "V": "Financial Services",
    "MA": "Financial Services",
    "BAC": "Financial Services",
    "WFC": "Financial Services",
    "BRK-B": "Financial Services",
    // Healthcare
    "JNJ": "Healthcare",
    "UNH": "Healthcare",
    "PFE": "Healthcare",
    "ABBV": "Healthcare",
    "TMO": "Healthcare",
    "ABT": "Healthcare",
    "CVS": "Healthcare",
    "MDT": "Healthcare",
    "BMY": "Healthcare",
    // Consumer Staples
    "WMT": "Consumer Staples",
    "PG": "Consumer Staples",
    "COST": "Consumer Staples",
    "PEP": "Consumer Staples",
    "PM": "Consumer Staples",
    // Consumer Discretionary
    "AMZN": "Consumer Discretionary",
    "TSLA": "Consumer Discretionary",
    "NKE": "Consumer Discretionary",
    "MCD": "Consumer Discretionary",
    "LOW": "Consumer Discretionary",
    "HD": "Consumer Discretionary",
    // Communication Services
    "DIS": "Communication Services",
    "NFLX": "Communication Services",
    "CMCSA": "Communication Services",
    "VZ": "Communication Services",
    // Energy
    "XOM": "Energy",
    "CVX": "Energy",
    // Industrials
    "UPS": "Industrials",
    "UNP": "Industrials",
    "HON": "Industrials",
    "LIN": "Industrials",
    "DHR": "Industrials",
    // Utilities
    "NEE": "Utilities"
  };
  return sectors[symbol] || "Technology";
}
function FindStocks() {
  const [, setLocation] = useLocation();
  const {
    user
  } = useSupabaseAuth();
  const [displayedSymbols, setDisplayedSymbols] = reactExports.useState(() => {
    return POPULAR_SYMBOLS;
  });
  const [viewMode, setViewMode] = reactExports.useState("grid");
  const [searchQuery, setSearchQuery] = reactExports.useState("");
  const [useRealtime, setUseRealtime] = reactExports.useState(true);
  const [activeFilter, setActiveFilter] = reactExports.useState("all");
  const [sortBy, setSortBy] = reactExports.useState("alphabetical");
  const [useDirectFMP, setUseDirectFMP] = reactExports.useState(false);
  const [useWebSocket, setUseWebSocket] = reactExports.useState(false);
  const [advancedFilters, setAdvancedFilters] = reactExports.useState({
    sectors: []
  });
  const [marketCapFilter, setMarketCapFilter] = reactExports.useState("all");
  const directFMPQuery = useDirectFMPBatchQuotes(displayedSymbols, {
    enabled: useDirectFMP,
    onError: (error2) => {
      console.error("Failed to fetch direct FMP quotes:", error2);
    }
  });
  const cachedQuery = useCachedBatchQuotes(displayedSymbols, {
    enabled: !useDirectFMP || directFMPQuery.isError,
    onError: (error2) => {
      console.error("Failed to fetch cached quotes:", error2);
    }
  });
  const {
    data: quotesData,
    isLoading,
    error,
    refetch,
    status,
    fetchStatus
  } = useDirectFMP && !directFMPQuery.isError ? directFMPQuery : cachedQuery;
  const {
    quotes: socketQuotes,
    connected: socketConnected
  } = useSocketQuotes({
    symbols: displayedSymbols,
    enabled: useWebSocket,
    onQuoteUpdate: (quote) => {
      const updater = window.__stockCardUpdaters?.get(quote.symbol);
      if (updater) {
        updater.updateQuote(quote);
      }
    }
  });
  reactExports.useEffect(() => {
    if (window.__stockCardUpdaters) {
      window.__stockCardUpdaters.forEach((updater) => {
        updater.updateConnection(socketConnected);
      });
    }
  }, [socketConnected]);
  reactExports.useEffect(() => {
    console.log("🚀 Find Stocks page loaded");
  }, []);
  const countStocksBySector = (sector) => {
    if (sector === "all") return ALL_STOCKS.length;
    return ALL_STOCKS.filter((symbol) => getSector(symbol) === sector).length;
  };
  const filterByMarketCap = (category) => {
    setMarketCapFilter(category);
    if (category === "all") {
      return;
    }
    const ranges = {
      "mega": {
        min: 200,
        max: Infinity
      },
      "large": {
        min: 10,
        max: 200
      },
      "mid": {
        min: 2,
        max: 10
      },
      "small": {
        min: 0.3,
        max: 2
      },
      "micro": {
        min: 0,
        max: 0.3
      }
    };
    const range = ranges[category];
    if (range) {
      setAdvancedFilters((prev) => ({
        ...prev,
        minMarketCap: range.min * 1e9,
        maxMarketCap: range.max === Infinity ? void 0 : range.max * 1e9
      }));
    }
  };
  const filterBySector = (sector) => {
    setActiveFilter(sector);
    if (sector === "all") {
      setDisplayedSymbols(ALL_STOCKS);
    } else {
      const filtered = ALL_STOCKS.filter((symbol) => getSector(symbol) === sector);
      setDisplayedSymbols(filtered);
    }
    setSearchQuery("");
  };
  const trackStockView = (symbol) => {
    const views = JSON.parse(localStorage.getItem("stock-views") || "{}");
    views[symbol] = (views[symbol] || 0) + 1;
    views.lastUpdated = Date.now();
    localStorage.setItem("stock-views", JSON.stringify(views));
  };
  const getMostPopularStocks = (limit = 10) => {
    const views = JSON.parse(localStorage.getItem("stock-views") || "{}");
    delete views.lastUpdated;
    return Object.entries(views).sort(([, a], [, b]) => b - a).slice(0, limit).map(([symbol]) => symbol);
  };
  console.log("Find Stocks Debug:", {
    displayedSymbols,
    quotesData,
    isLoading,
    error,
    status,
    fetchStatus,
    hasQuotes: quotesData?.quotes?.length > 0,
    apiUrl: "Using Vercel Proxy",
    symbolsLength: displayedSymbols.length
  });
  const stocks = React.useMemo(() => {
    return displayedSymbols.map((symbol, index) => {
      const quote = quotesData?.quotes?.find((q) => q?.symbol === symbol || q?.symbol?.replace("-", ".") === symbol || symbol.replace(".", "-") === q?.symbol);
      const price = quote?.price || quote?.close || quote?.last || 0;
      const change = quote?.change || 0;
      const changePercent = quote?.changePercent || quote?.changesPercentage || 0;
      const volume = quote?.volume || 0;
      const marketCap = quote?.marketCap || 0;
      return {
        id: index + 1,
        symbol,
        name: getCompanyName(symbol),
        price: price > 0 ? price.toFixed(2) : "0.00",
        change: change.toFixed(2),
        changePercent: changePercent.toFixed(2),
        marketCap: marketCap > 0 ? `$${(marketCap / 1e9).toFixed(2)}B` : "N/A",
        sector: getSector(symbol),
        industry: getIndustry(symbol),
        eps: quote?.eps ? quote.eps.toFixed(2) : "N/A",
        peRatio: quote?.pe ? quote.pe.toFixed(2) : "N/A",
        logo: `/api/placeholder/40/40`,
        lastUpdated: new Date(quote?.timestamp || Date.now()),
        volume,
        high: quote?.high || 0,
        low: quote?.low || 0,
        open: quote?.open || 0,
        _isRealData: !quote?._cached,
        _provider: quote?.provider || "unknown",
        _cached: quote?._cached || false
      };
    });
  }, [displayedSymbols, quotesData]);
  const handleStockSelect = (symbol) => {
    trackStockView(symbol);
    setLocation(`/stock/${symbol}`);
  };
  const showTopGainers = () => {
    const sorted = [...displayedSymbols].sort((a, b) => {
      const aChange = quotesData?.quotes?.find((q) => q.symbol === a)?.changePercent || 0;
      const bChange = quotesData?.quotes?.find((q) => q.symbol === b)?.changePercent || 0;
      return bChange - aChange;
    });
    setDisplayedSymbols(sorted.slice(0, 10));
    setActiveFilter("gainers");
  };
  const showTopLosers = () => {
    const sorted = [...displayedSymbols].sort((a, b) => {
      const aChange = quotesData?.quotes?.find((q) => q.symbol === a)?.changePercent || 0;
      const bChange = quotesData?.quotes?.find((q) => q.symbol === b)?.changePercent || 0;
      return aChange - bChange;
    });
    setDisplayedSymbols(sorted.slice(0, 10));
    setActiveFilter("losers");
  };
  const showMostPopular = () => {
    const popular = getMostPopularStocks(15);
    const validPopular = popular.filter((s) => ALL_STOCKS.includes(s));
    setDisplayedSymbols(validPopular.length > 0 ? validPopular : POPULAR_SYMBOLS);
    setActiveFilter("popular");
  };
  const filteredStocks = React.useMemo(() => {
    let filtered = stocks.filter((stock) => {
      if (!displayedSymbols.includes(stock.symbol)) return false;
      if (advancedFilters.sectors && advancedFilters.sectors.length > 0) {
        if (!advancedFilters.sectors.includes(stock.sector)) return false;
      }
      const price = parseFloat(stock.price) || 0;
      if (advancedFilters.minPrice && price < advancedFilters.minPrice) return false;
      if (advancedFilters.maxPrice && price > advancedFilters.maxPrice) return false;
      const changePercent = parseFloat(stock.changePercent) || 0;
      if (advancedFilters.minChangePercent && changePercent < advancedFilters.minChangePercent) return false;
      if (advancedFilters.maxChangePercent && changePercent > advancedFilters.maxChangePercent) return false;
      if (advancedFilters.showOnlyGainers && changePercent <= 0) return false;
      if (advancedFilters.showOnlyLosers && changePercent >= 0) return false;
      const marketCapValue = stock.marketCap === "N/A" ? 0 : parseFloat(stock.marketCap.replace(/[^0-9.-]+/g, "")) * 1e9 || 0;
      if (advancedFilters.minMarketCap && marketCapValue < advancedFilters.minMarketCap) return false;
      if (advancedFilters.maxMarketCap && marketCapValue > advancedFilters.maxMarketCap) return false;
      const pe = stock.peRatio === "N/A" ? 0 : parseFloat(stock.peRatio) || 0;
      if (advancedFilters.minPE && pe < advancedFilters.minPE) return false;
      if (advancedFilters.maxPE && pe > advancedFilters.maxPE) return false;
      if (advancedFilters.minVolume && stock.volume < advancedFilters.minVolume) return false;
      if (!searchQuery) return true;
      return stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) || stock.name.toLowerCase().includes(searchQuery.toLowerCase()) || stock.sector.toLowerCase().includes(searchQuery.toLowerCase()) || stock.industry.toLowerCase().includes(searchQuery.toLowerCase());
    });
    if (sortBy && sortBy !== "alphabetical") {
      filtered = [...filtered].sort((a, b) => {
        switch (sortBy) {
          case "alphabetical-desc":
            return b.symbol.localeCompare(a.symbol);
          case "price-high":
            return parseFloat(b.price) - parseFloat(a.price);
          case "price-low":
            return parseFloat(a.price) - parseFloat(b.price);
          case "gainers":
            const bChange = parseFloat(b.changePercent) || 0;
            const aChange = parseFloat(a.changePercent) || 0;
            return bChange - aChange;
          case "losers":
            const aLosersChange = parseFloat(a.changePercent) || 0;
            const bLosersChange = parseFloat(b.changePercent) || 0;
            return aLosersChange - bLosersChange;
          case "volume":
            return (b.volume || 0) - (a.volume || 0);
          case "marketCap":
            const aMarket = a.marketCap === "N/A" ? 0 : parseFloat(a.marketCap.replace(/[^0-9.-]+/g, "")) || 0;
            const bMarket = b.marketCap === "N/A" ? 0 : parseFloat(b.marketCap.replace(/[^0-9.-]+/g, "")) || 0;
            return bMarket - aMarket;
          case "pe-high":
            const aPE = a.peRatio === "N/A" ? 0 : parseFloat(a.peRatio) || 0;
            const bPE = b.peRatio === "N/A" ? 0 : parseFloat(b.peRatio) || 0;
            return bPE - aPE;
          case "pe-low":
            const aPELow = a.peRatio === "N/A" ? 999999 : parseFloat(a.peRatio) || 999999;
            const bPELow = b.peRatio === "N/A" ? 999999 : parseFloat(b.peRatio) || 999999;
            return aPELow - bPELow;
          default:
            return 0;
        }
      });
    }
    return filtered;
  }, [stocks, displayedSymbols, advancedFilters, searchQuery, sortBy]);
  if (isLoading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(MainLayout, {
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "space-y-6 px-4 sm:px-6 lg:px-8 py-4 sm:py-6",
        "aria-busy": "true",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx(BetaBanner, {}), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "space-y-4",
          role: "status",
          "aria-live": "polite",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "space-y-2",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, {
                className: "h-8 w-48"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, {
                className: "h-4 w-64 max-w-xs"
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
              className: "flex flex-wrap items-center gap-2",
              children: Array.from({
                length: 4
              }).map((_, index) => /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, {
                className: "h-10 w-24"
              }, index))
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(Card, {
            className: "border-teya-green/20",
            children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
              className: "p-6 space-y-4",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, {
                className: "h-12 w-full"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                className: "flex flex-wrap gap-2",
                children: Array.from({
                  length: 6
                }).map((_, index) => /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, {
                  className: "h-9 w-24"
                }, index))
              })]
            })
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4",
            "aria-hidden": "true",
            children: POPULAR_SYMBOLS.slice(0, 15).map((symbol) => /* @__PURE__ */ jsxRuntimeExports.jsx(StockCardSkeleton, {}, symbol))
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(ConnectionTest, {})]
      })
    });
  }
  if (error && stocks.length === 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(MainLayout, {
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "space-y-8",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx(BetaBanner, {}), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "text-center py-12",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, {
            className: "w-12 h-12 text-yellow-500 mx-auto mb-4"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("h3", {
            className: "text-lg font-medium mb-2",
            children: "Market Data Temporarily Unavailable"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
            className: "text-muted-foreground mb-4",
            children: "We're having trouble connecting to our market data service."
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
            onClick: () => refetch(),
            className: "bg-teya-green hover:bg-teya-green-dark text-black",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, {
              className: "w-4 h-4 mr-2"
            }), "Try Again"]
          })]
        })]
      })
    });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(MainLayout, {
    children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
      className: "space-y-6 px-4 sm:px-6 lg:px-8 py-4 sm:py-6",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "flex flex-col space-y-4",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("h1", {
              className: "text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Search, {
                className: "w-6 h-6 sm:w-8 sm:h-8 text-teya-green"
              }), "🔍 Pesquisar ações"]
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
              className: "text-sm sm:text-base text-muted-foreground mt-1",
              children: "Descubra e analise empresas com ferramentas avançadas de pesquisa e filtros inteligentes"
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex flex-wrap items-center gap-2",
            children: [useWebSocket && /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
              className: "flex items-center gap-2 px-3 py-1 rounded-full bg-background border",
              children: socketConnected ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, {
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Wifi, {
                  className: "w-4 h-4 text-green-500 animate-pulse"
                }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                  className: "text-sm font-medium text-green-600",
                  children: "Live"
                })]
              }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, {
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(WifiOff, {
                  className: "w-4 h-4 text-gray-400"
                }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                  className: "text-sm text-gray-500",
                  children: "Connecting..."
                })]
              })
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
              variant: useDirectFMP ? "default" : "outline",
              size: "sm",
              onClick: () => setUseDirectFMP(!useDirectFMP),
              className: useDirectFMP ? "bg-blue-500 hover:bg-blue-600 text-white" : "",
              title: useDirectFMP ? "A usar FMP Direto (tempo real)" : "A usar dados em cache",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Zap, {
                className: "w-4 h-4"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                className: "ml-1 hidden sm:inline",
                children: useDirectFMP ? "FMP Direto" : "Dados em cache"
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
              variant: "outline",
              size: "sm",
              onClick: () => refetch(),
              disabled: isLoading,
              title: "Atualizar dados das ações",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, {
                className: cn("w-4 h-4", isLoading && "animate-spin")
              })
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
              variant: useRealtime ? "default" : "outline",
              size: "sm",
              onClick: () => setUseRealtime(!useRealtime),
              className: useRealtime ? "bg-teya-green hover:bg-teya-green-dark text-black" : "",
              title: "Alternar atualizações em tempo real",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Wifi, {
                className: "w-4 h-4"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                className: "ml-1 hidden sm:inline",
                children: "Tempo Real"
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "border-l pl-2 ml-2 flex items-center gap-1",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
                variant: viewMode === "grid" ? "default" : "outline",
                size: "sm",
                onClick: () => setViewMode("grid"),
                className: viewMode === "grid" ? "bg-teya-green hover:bg-teya-green-dark text-black" : "",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(Grid3x3, {
                  className: "w-4 h-4"
                })
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
                variant: viewMode === "list" ? "default" : "outline",
                size: "sm",
                onClick: () => setViewMode("list"),
                className: viewMode === "list" ? "bg-teya-green hover:bg-teya-green-dark text-black" : "",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(List, {
                  className: "w-4 h-4"
                })
              })]
            })]
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(Card, {
          className: "border-teya-green/20",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
            className: "p-6",
            children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "space-y-4",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(UniversalSearch, {
                onSelect: (stock) => {
                  setSearchQuery(stock.symbol);
                  handleStockSelect(stock.symbol);
                },
                placeholder: "Pesquisar mais de 50 ações por símbolo, nome ou setor...",
                showRecentSearches: true,
                showPopularStocks: true
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "flex flex-wrap gap-2",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, {
                  variant: activeFilter === "all" ? "default" : "outline",
                  className: cn("cursor-pointer", activeFilter === "all" ? "bg-teya-green text-black hover:bg-teya-green-dark" : "border-teya-green/30 hover:bg-teya-green/10"),
                  onClick: () => filterBySector("all"),
                  children: ["Todas as ações (", countStocksBySector("all"), ")"]
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, {
                  variant: activeFilter === "Technology" ? "default" : "outline",
                  className: cn("cursor-pointer", activeFilter === "Technology" ? "bg-teya-green text-black hover:bg-teya-green-dark" : "border-teya-green/30 hover:bg-teya-green/10"),
                  onClick: () => filterBySector("Technology"),
                  children: ["Technology (", countStocksBySector("Technology"), ")"]
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, {
                  variant: activeFilter === "Healthcare" ? "default" : "outline",
                  className: cn("cursor-pointer", activeFilter === "Healthcare" ? "bg-teya-green text-black hover:bg-teya-green-dark" : "border-teya-green/30 hover:bg-teya-green/10"),
                  onClick: () => filterBySector("Healthcare"),
                  children: ["Healthcare (", countStocksBySector("Healthcare"), ")"]
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, {
                  variant: activeFilter === "Financial Services" ? "default" : "outline",
                  className: cn("cursor-pointer", activeFilter === "Financial Services" ? "bg-teya-green text-black hover:bg-teya-green-dark" : "border-teya-green/30 hover:bg-teya-green/10"),
                  onClick: () => filterBySector("Financial Services"),
                  children: ["Financial (", countStocksBySector("Financial Services"), ")"]
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, {
                  variant: activeFilter === "Consumer Staples" ? "default" : "outline",
                  className: cn("cursor-pointer", activeFilter === "Consumer Staples" ? "bg-teya-green text-black hover:bg-teya-green-dark" : "border-teya-green/30 hover:bg-teya-green/10"),
                  onClick: () => filterBySector("Consumer Staples"),
                  children: ["Consumer Staples (", countStocksBySector("Consumer Staples"), ")"]
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, {
                  variant: activeFilter === "Consumer Discretionary" ? "default" : "outline",
                  className: cn("cursor-pointer", activeFilter === "Consumer Discretionary" ? "bg-teya-green text-black hover:bg-teya-green-dark" : "border-teya-green/30 hover:bg-teya-green/10"),
                  onClick: () => filterBySector("Consumer Discretionary"),
                  children: ["Consumer (", countStocksBySector("Consumer Discretionary"), ")"]
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, {
                  variant: activeFilter === "Energy" ? "default" : "outline",
                  className: cn("cursor-pointer", activeFilter === "Energy" ? "bg-teya-green text-black hover:bg-teya-green-dark" : "border-teya-green/30 hover:bg-teya-green/10"),
                  onClick: () => filterBySector("Energy"),
                  children: ["Energy (", countStocksBySector("Energy"), ")"]
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, {
                  variant: activeFilter === "Industrials" ? "default" : "outline",
                  className: cn("cursor-pointer", activeFilter === "Industrials" ? "bg-teya-green text-black hover:bg-teya-green-dark" : "border-teya-green/30 hover:bg-teya-green/10"),
                  onClick: () => filterBySector("Industrials"),
                  children: ["Industrials (", countStocksBySector("Industrials"), ")"]
                })]
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "flex flex-wrap gap-2 pt-2 border-t",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                  className: "text-sm text-muted-foreground",
                  children: "Market Cap:"
                }), /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, {
                  variant: marketCapFilter === "all" ? "default" : "outline",
                  className: cn("cursor-pointer", marketCapFilter === "all" ? "bg-blue-500 text-white hover:bg-blue-600" : "border-blue-500/30 hover:bg-blue-500/10"),
                  onClick: () => filterByMarketCap("all"),
                  children: "All Sizes"
                }), /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, {
                  variant: marketCapFilter === "mega" ? "default" : "outline",
                  className: cn("cursor-pointer", marketCapFilter === "mega" ? "bg-blue-500 text-white hover:bg-blue-600" : "border-blue-500/30 hover:bg-blue-500/10"),
                  onClick: () => filterByMarketCap("mega"),
                  children: "Mega Cap ($200B+)"
                }), /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, {
                  variant: marketCapFilter === "large" ? "default" : "outline",
                  className: cn("cursor-pointer", marketCapFilter === "large" ? "bg-blue-500 text-white hover:bg-blue-600" : "border-blue-500/30 hover:bg-blue-500/10"),
                  onClick: () => filterByMarketCap("large"),
                  children: "Large Cap ($10B-$200B)"
                }), /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, {
                  variant: marketCapFilter === "mid" ? "default" : "outline",
                  className: cn("cursor-pointer", marketCapFilter === "mid" ? "bg-blue-500 text-white hover:bg-blue-600" : "border-blue-500/30 hover:bg-blue-500/10"),
                  onClick: () => filterByMarketCap("mid"),
                  children: "Mid Cap ($2B-$10B)"
                }), /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, {
                  variant: marketCapFilter === "small" ? "default" : "outline",
                  className: cn("cursor-pointer", marketCapFilter === "small" ? "bg-blue-500 text-white hover:bg-blue-600" : "border-blue-500/30 hover:bg-blue-500/10"),
                  onClick: () => filterByMarketCap("small"),
                  children: "Small Cap ($300M-$2B)"
                })]
              })]
            })
          })
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsx(BetaBanner, {}), /* @__PURE__ */ jsxRuntimeExports.jsx(MarketMovers, {}), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "grid grid-cols-2 lg:grid-cols-4 gap-4",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
          className: "p-4 cursor-pointer hover:bg-secondary/10 transition-colors border-teya-green/20",
          onClick: showTopGainers,
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex items-center gap-2 mb-2",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(ArrowUp, {
              className: "w-5 h-5 text-green-500"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("h3", {
              className: "font-semibold",
              children: "Maiores Ganhos"
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
            className: "text-sm text-muted-foreground",
            children: "Biggest % gains today"
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
          className: "p-4 cursor-pointer hover:bg-secondary/10 transition-colors border-teya-green/20",
          onClick: showTopLosers,
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex items-center gap-2 mb-2",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(ArrowDown, {
              className: "w-5 h-5 text-red-500"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("h3", {
              className: "font-semibold",
              children: "Maiores Quedas"
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
            className: "text-sm text-muted-foreground",
            children: "Biggest % losses today"
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
          className: "p-4 cursor-pointer hover:bg-secondary/10 transition-colors border-teya-green/20",
          onClick: showMostPopular,
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex items-center gap-2 mb-2",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, {
              className: "w-5 h-5 text-orange-500"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("h3", {
              className: "font-semibold",
              children: "Most Popular"
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
            className: "text-sm text-muted-foreground",
            children: "Most viewed stocks"
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
          className: "p-4 cursor-pointer hover:bg-secondary/10 transition-colors border-teya-green/20",
          onClick: () => filterBySector("all"),
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex items-center gap-2 mb-2",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(ChartColumn, {
              className: "w-5 h-5 text-blue-500"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("h3", {
              className: "font-semibold",
              children: "All Stocks"
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
            className: "text-sm text-muted-foreground",
            children: [ALL_STOCKS.length, " total stocks"]
          })]
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "space-y-4",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "flex items-center justify-between",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex items-center gap-2",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
              className: "text-sm text-muted-foreground",
              children: ["Showing ", filteredStocks.length, " of ", ALL_STOCKS.length, " stocks", searchQuery && ` for "${searchQuery}"`, activeFilter !== "all" && ` in ${activeFilter}`]
            }), quotesData && quotesData._source && /* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, {
              variant: "outline",
              className: cn("text-xs", quotesData._source === "fmp_direct" ? "border-green-500 text-green-600" : ""),
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Activity, {
                className: "w-3 h-3 mr-1"
              }), quotesData._source === "fmp_direct" ? "🎯 Dados FMP em tempo real" : quotesData.quotes?.some((q) => q.provider === "fallback") ? "Dados de demonstração (backend indisponível)" : "Dados em cache"]
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex items-center gap-2",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(Select, {
              value: sortBy,
              onValueChange: setSortBy,
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, {
                className: "w-[180px]",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {
                  placeholder: "Sort by..."
                })
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, {
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                  value: "alphabetical",
                  children: "A → Z"
                }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                  value: "alphabetical-desc",
                  children: "Z → A"
                }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                  value: "price-high",
                  children: "Price (High → Low)"
                }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                  value: "price-low",
                  children: "Price (Low → High)"
                }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                  value: "gainers",
                  children: "Maiores Ganhos ↑"
                }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                  value: "losers",
                  children: "Maiores Quedas ↓"
                }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                  value: "volume",
                  children: "Mais Ativas"
                }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                  value: "marketCap",
                  children: "Market Cap ↓"
                }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                  value: "pe-high",
                  children: "P/E Ratio (High)"
                }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                  value: "pe-low",
                  children: "P/E Ratio (Low)"
                })]
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(AdvancedFilters, {
              onFiltersChange: setAdvancedFilters,
              availableSectors: [...new Set(ALL_STOCKS.map((s) => getSector(s)))]
            })]
          })]
        }), error && !isLoading && /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, {
          variant: "default",
          className: "border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, {
            className: "h-4 w-4 text-yellow-600"
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDescription, {
            className: "text-sm",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("strong", {
              children: "Conectividade limitada:"
            }), " Alguns dados em tempo real podem estar indisponíveis.", stocks.length > 0 ? " A mostrar dados em cache." : " Por favor, tente novamente mais tarde.", /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
              variant: "ghost",
              size: "sm",
              onClick: () => refetch(),
              className: "ml-2 text-foreground hover:bg-secondary/60 border border-border/50",
              children: "Tentar novamente"
            })]
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
          className: cn(viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4" : "space-y-4"),
          children: useWebSocket && viewMode === "grid" ? (
            // Render WebSocket cards for real-time updates without re-renders
            displayedSymbols.map((symbol) => {
              const socketQuote = socketQuotes.get(symbol);
              const fallbackQuote = quotesData?.quotes?.find((q) => q.symbol === symbol);
              const initialPrice = socketQuote?.price || fallbackQuote?.price || 0;
              return /* @__PURE__ */ jsxRuntimeExports.jsx(WebSocketStockCard, {
                symbol,
                companyName: getCompanyName(symbol),
                industry: getIndustry(symbol),
                sector: getSector(symbol),
                initialPrice,
                onRemove: () => {
                  const newSymbols = displayedSymbols.filter((s) => s !== symbol);
                  setDisplayedSymbols(newSymbols);
                  localStorage.setItem("alfalyzer-watchlist", JSON.stringify(newSymbols));
                }
              }, symbol);
            })
          ) : (
            // Render standard cards
            filteredStocks.map((stock) => /* @__PURE__ */ jsxRuntimeExports.jsx(Card, {
              className: "group hover:shadow-lg transition-all duration-200 cursor-pointer border-border/50 hover:border-teya-green/30 overflow-hidden",
              onClick: () => handleStockSelect(stock.symbol),
              children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
                className: "p-4",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                  className: "flex justify-between items-start mb-3",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex items-center gap-2",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                      className: "w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-sm font-bold",
                      children: stock.symbol.charAt(0)
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                      children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h3", {
                        className: "font-semibold text-sm",
                        children: stock.symbol
                      }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                        className: "text-xs text-muted-foreground truncate max-w-[120px]",
                        children: stock.name
                      })]
                    })]
                  })
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "space-y-2",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex justify-between items-center",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
                      className: "text-lg font-bold",
                      children: ["$", stock.price]
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                      className: cn("flex items-center gap-1 text-sm font-medium", (parseFloat(stock.changePercent) || 0) >= 0 ? "text-green-600" : "text-red-600"),
                      children: [(parseFloat(stock.changePercent) || 0) >= 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, {
                        className: "w-3 h-3"
                      }) : /* @__PURE__ */ jsxRuntimeExports.jsx(TrendingDown, {
                        className: "w-3 h-3"
                      }), (parseFloat(stock.changePercent) || 0) >= 0 ? "+" : "", stock.changePercent, "%"]
                    })]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                    className: "text-xs text-muted-foreground",
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      children: stock.sector
                    })
                  })]
                })]
              })
            }, stock.id))
          )
        }), filteredStocks.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "text-center py-12",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, {
            className: "w-12 h-12 text-muted-foreground mx-auto mb-4"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("h3", {
            className: "text-lg font-medium mb-2",
            children: "No stocks found"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
            className: "text-muted-foreground mb-4",
            children: "Try adjusting your search terms or browse popular stocks instead."
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
            onClick: () => setSearchQuery(""),
            className: "bg-teya-green hover:bg-teya-green-dark text-black",
            children: "Show All Stocks"
          })]
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "mt-8 p-4 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg border border-yellow-200 dark:border-yellow-800",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h3", {
          className: "text-lg font-semibold mb-2 text-yellow-800 dark:text-yellow-200",
          children: "🧪 API Connection Test (Temporary)"
        }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
          className: "text-sm text-yellow-700 dark:text-yellow-300 mb-4",
          children: "This test component verifies that the API is properly connected and CORS is configured correctly."
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(TestAPIConnection, {})]
      }), /* @__PURE__ */ jsxRuntimeExports.jsx(Card, {
        className: "border-teya-green/20 bg-gradient-to-r from-teya-green/5 to-transparent",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
          className: "p-6",
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex flex-col md:flex-row items-center justify-between gap-4",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h3", {
                className: "font-semibold mb-2",
                children: "Need help finding the right stocks?"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                className: "text-sm text-muted-foreground",
                children: "Explore our advanced tools and educational resources"
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "flex gap-2",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
                variant: "outline",
                onClick: () => setLocation("/intrinsic-value"),
                className: "border-teya-green/20 hover:bg-teya-green/10",
                children: "Value Calculator"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
                onClick: () => setLocation("/help"),
                className: "bg-teya-green hover:bg-teya-green-dark text-black",
                children: "Get Help"
              })]
            })]
          })
        })
      })]
    })
  });
}
export {
  FindStocks as default
};
