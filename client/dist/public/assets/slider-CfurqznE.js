import { r as reactExports, u as useLocation, j as jsxRuntimeExports, f as cn, X, n as TrendingUp, a0 as useControllableState, a1 as createContextScope, $ as createCollection, a5 as composeEventHandlers, a3 as Primitive, a4 as useComposedRefs, af as useSize, ag as usePrevious } from "./index-DF734YkB.js";
import { S as Search } from "./search-CySG90ju.js";
import { C as Clock } from "./clock-CEwJtTm9.js";
import { S as Sparkles } from "./sparkles-b_IcKR33.js";
import { c as clamp } from "./index-IXOTxK3N.js";
import { u as useDirection } from "./index-Dx7UitrF.js";
const ALL_STOCKS = [
  // Tech Giants
  {
    symbol: "AAPL",
    name: "Apple Inc.",
    sector: "Technology",
    industry: "Consumer Electronics"
  },
  {
    symbol: "MSFT",
    name: "Microsoft Corporation",
    sector: "Technology",
    industry: "Software"
  },
  {
    symbol: "GOOGL",
    name: "Alphabet Inc.",
    sector: "Technology",
    industry: "Internet Services"
  },
  {
    symbol: "AMZN",
    name: "Amazon.com Inc.",
    sector: "Technology",
    industry: "E-Commerce"
  },
  {
    symbol: "META",
    name: "Meta Platforms Inc.",
    sector: "Technology",
    industry: "Social Media"
  },
  {
    symbol: "NVDA",
    name: "NVIDIA Corporation",
    sector: "Technology",
    industry: "Semiconductors"
  },
  // Financial
  {
    symbol: "JPM",
    name: "JPMorgan Chase & Co.",
    sector: "Financial",
    industry: "Banking"
  },
  {
    symbol: "V",
    name: "Visa Inc.",
    sector: "Financial",
    industry: "Payment Processing"
  },
  {
    symbol: "MA",
    name: "Mastercard Incorporated",
    sector: "Financial",
    industry: "Payment Processing"
  },
  {
    symbol: "BAC",
    name: "Bank of America Corp.",
    sector: "Financial",
    industry: "Banking"
  },
  {
    symbol: "WFC",
    name: "Wells Fargo & Company",
    sector: "Financial",
    industry: "Banking"
  },
  {
    symbol: "BRK-B",
    name: "Berkshire Hathaway Inc.",
    sector: "Financial",
    industry: "Conglomerate"
  },
  // Healthcare
  {
    symbol: "JNJ",
    name: "Johnson & Johnson",
    sector: "Healthcare",
    industry: "Pharmaceuticals"
  },
  {
    symbol: "UNH",
    name: "UnitedHealth Group Inc.",
    sector: "Healthcare",
    industry: "Health Insurance"
  },
  {
    symbol: "PFE",
    name: "Pfizer Inc.",
    sector: "Healthcare",
    industry: "Pharmaceuticals"
  },
  {
    symbol: "ABBV",
    name: "AbbVie Inc.",
    sector: "Healthcare",
    industry: "Pharmaceuticals"
  },
  {
    symbol: "TMO",
    name: "Thermo Fisher Scientific Inc.",
    sector: "Healthcare",
    industry: "Medical Devices"
  },
  {
    symbol: "ABT",
    name: "Abbott Laboratories",
    sector: "Healthcare",
    industry: "Medical Devices"
  },
  {
    symbol: "CVS",
    name: "CVS Health Corporation",
    sector: "Healthcare",
    industry: "Healthcare Services"
  },
  {
    symbol: "MDT",
    name: "Medtronic plc",
    sector: "Healthcare",
    industry: "Medical Devices"
  },
  {
    symbol: "BMY",
    name: "Bristol-Myers Squibb Co.",
    sector: "Healthcare",
    industry: "Pharmaceuticals"
  },
  // Consumer
  {
    symbol: "WMT",
    name: "Walmart Inc.",
    sector: "Consumer",
    industry: "Retail"
  },
  {
    symbol: "PG",
    name: "Procter & Gamble Co.",
    sector: "Consumer",
    industry: "Consumer Goods"
  },
  {
    symbol: "DIS",
    name: "The Walt Disney Company",
    sector: "Consumer",
    industry: "Entertainment"
  },
  {
    symbol: "NKE",
    name: "Nike Inc.",
    sector: "Consumer",
    industry: "Apparel"
  },
  {
    symbol: "MCD",
    name: "McDonald's Corporation",
    sector: "Consumer",
    industry: "Restaurants"
  },
  {
    symbol: "COST",
    name: "Costco Wholesale Corporation",
    sector: "Consumer",
    industry: "Retail"
  },
  {
    symbol: "LOW",
    name: "Lowe's Companies Inc.",
    sector: "Consumer",
    industry: "Retail"
  },
  {
    symbol: "HD",
    name: "The Home Depot Inc.",
    sector: "Consumer",
    industry: "Retail"
  },
  {
    symbol: "PEP",
    name: "PepsiCo Inc.",
    sector: "Consumer",
    industry: "Beverages"
  },
  // Energy & Industrials
  {
    symbol: "XOM",
    name: "Exxon Mobil Corporation",
    sector: "Energy",
    industry: "Oil & Gas"
  },
  {
    symbol: "CVX",
    name: "Chevron Corporation",
    sector: "Energy",
    industry: "Oil & Gas"
  },
  {
    symbol: "UPS",
    name: "United Parcel Service Inc.",
    sector: "Industrial",
    industry: "Logistics"
  },
  {
    symbol: "UNP",
    name: "Union Pacific Corporation",
    sector: "Industrial",
    industry: "Railroads"
  },
  {
    symbol: "HON",
    name: "Honeywell International Inc.",
    sector: "Industrial",
    industry: "Conglomerate"
  },
  {
    symbol: "LIN",
    name: "Linde plc",
    sector: "Industrial",
    industry: "Chemicals"
  },
  {
    symbol: "DHR",
    name: "Danaher Corporation",
    sector: "Healthcare",
    industry: "Medical Devices"
  },
  // Tech/Software
  {
    symbol: "CRM",
    name: "Salesforce Inc.",
    sector: "Technology",
    industry: "Software"
  },
  {
    symbol: "ORCL",
    name: "Oracle Corporation",
    sector: "Technology",
    industry: "Software"
  },
  {
    symbol: "ADBE",
    name: "Adobe Inc.",
    sector: "Technology",
    industry: "Software"
  },
  {
    symbol: "NFLX",
    name: "Netflix Inc.",
    sector: "Technology",
    industry: "Entertainment"
  },
  {
    symbol: "PYPL",
    name: "PayPal Holdings Inc.",
    sector: "Technology",
    industry: "Payment Processing"
  },
  {
    symbol: "TXN",
    name: "Texas Instruments Inc.",
    sector: "Technology",
    industry: "Semiconductors"
  },
  {
    symbol: "QCOM",
    name: "QUALCOMM Inc.",
    sector: "Technology",
    industry: "Semiconductors"
  },
  {
    symbol: "AVGO",
    name: "Broadcom Inc.",
    sector: "Technology",
    industry: "Semiconductors"
  },
  {
    symbol: "INTC",
    name: "Intel Corporation",
    sector: "Technology",
    industry: "Semiconductors"
  },
  // Telecom & Others
  {
    symbol: "VZ",
    name: "Verizon Communications Inc.",
    sector: "Telecom",
    industry: "Telecommunications"
  },
  {
    symbol: "CMCSA",
    name: "Comcast Corporation",
    sector: "Telecom",
    industry: "Cable & Internet"
  },
  {
    symbol: "NEE",
    name: "NextEra Energy Inc.",
    sector: "Utilities",
    industry: "Electric Utilities"
  },
  {
    symbol: "PM",
    name: "Philip Morris International Inc.",
    sector: "Consumer",
    industry: "Tobacco"
  },
  {
    symbol: "TSLA",
    name: "Tesla Inc.",
    sector: "Consumer",
    industry: "Electric Vehicles"
  },
  {
    symbol: "ACN",
    name: "Accenture plc",
    sector: "Technology",
    industry: "Consulting"
  }
];
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = reactExports.useState(value);
  reactExports.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}
const POPULAR_STOCKS = [{
  symbol: "AAPL",
  name: "Apple Inc."
}, {
  symbol: "MSFT",
  name: "Microsoft Corporation"
}, {
  symbol: "GOOGL",
  name: "Alphabet Inc."
}, {
  symbol: "AMZN",
  name: "Amazon.com Inc."
}, {
  symbol: "NVDA",
  name: "NVIDIA Corporation"
}, {
  symbol: "TSLA",
  name: "Tesla Inc."
}];
const UniversalSearch = ({
  onSelect,
  placeholder = "Search stocks by symbol or name...",
  className,
  autoFocus = false,
  showRecentSearches = true,
  showPopularStocks = true,
  closeOnSelect = true
}) => {
  const [, navigate] = useLocation();
  const [query, setQuery] = reactExports.useState("");
  const [isOpen, setIsOpen] = reactExports.useState(false);
  const [suggestions, setSuggestions] = reactExports.useState([]);
  const [selectedIndex, setSelectedIndex] = reactExports.useState(-1);
  const [recentSearches, setRecentSearches] = reactExports.useState([]);
  const searchRef = reactExports.useRef(null);
  const inputRef = reactExports.useRef(null);
  const debouncedQuery = useDebounce(query, 300);
  reactExports.useEffect(() => {
    const stored = localStorage.getItem("alfalyzer_recent_searches");
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored).slice(0, 5));
      } catch (e) {
        console.error("Failed to parse recent searches:", e);
      }
    }
  }, []);
  const saveToRecent = reactExports.useCallback((stock) => {
    const newRecent = [stock, ...recentSearches.filter((s) => s.symbol !== stock.symbol)].slice(0, 5);
    setRecentSearches(newRecent);
    localStorage.setItem("alfalyzer_recent_searches", JSON.stringify(newRecent));
  }, [recentSearches]);
  reactExports.useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) {
        setSuggestions([]);
        setSelectedIndex(-1);
        return;
      }
      const q = debouncedQuery.trim();
      try {
        const res = await fetch(`/api/market-data/search?query=${encodeURIComponent(q)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        const results = Array.isArray(data?.results) ? data.results : [];
        const mapped = results.map((r) => ({
          symbol: r.symbol,
          name: r.name
        }));
        setSuggestions(mapped);
        setSelectedIndex(-1);
      } catch (e) {
        const searchTerm = q.toUpperCase();
        const filtered = ALL_STOCKS.map((stock) => {
          let score = 0;
          const upperSymbol = stock.symbol.toUpperCase();
          const upperName = stock.name.toUpperCase();
          if (upperSymbol === searchTerm) score = 1e3;
          else if (upperSymbol.startsWith(searchTerm)) score = 100 - (upperSymbol.length - searchTerm.length);
          else if (upperName.startsWith(searchTerm)) score = 80;
          else if (upperSymbol.includes(searchTerm)) score = 50;
          else if (upperName.includes(searchTerm)) score = 10;
          return {
            ...stock,
            score
          };
        }).filter((stock) => stock.score > 0).sort((a, b) => b.score - a.score).slice(0, 10);
        if (!cancelled) {
          setSuggestions(filtered);
          setSelectedIndex(-1);
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);
  const handleKeyDown = reactExports.useCallback((e) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setIsOpen(true);
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => {
          const max = suggestions.length - 1;
          return prev < max ? prev + 1 : 0;
        });
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => {
          const max = suggestions.length - 1;
          return prev > 0 ? prev - 1 : max;
        });
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleSelectStock(suggestions[selectedIndex]);
        } else if (suggestions.length > 0) {
          handleSelectStock(suggestions[0]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        setQuery("");
        inputRef.current?.blur();
        break;
    }
  }, [isOpen, suggestions, selectedIndex]);
  const handleSelectStock = reactExports.useCallback((stock) => {
    saveToRecent(stock);
    if (onSelect) {
      onSelect(stock);
    } else {
      navigate(`/stock/${stock.symbol}`);
    }
    if (closeOnSelect) {
      setQuery("");
      setIsOpen(false);
      setSuggestions([]);
      setSelectedIndex(-1);
    }
  }, [onSelect, navigate, closeOnSelect, saveToRecent]);
  reactExports.useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const showDropdown = isOpen && (suggestions.length > 0 || query.length === 0 && (showRecentSearches && recentSearches.length > 0 || showPopularStocks));
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
    ref: searchRef,
    className: cn("relative w-full", className),
    children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
      className: "relative",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Search, {
        className: "absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4"
      }), /* @__PURE__ */ jsxRuntimeExports.jsx("input", {
        ref: inputRef,
        type: "text",
        value: query,
        onChange: (e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        },
        onFocus: () => setIsOpen(true),
        onKeyDown: handleKeyDown,
        placeholder,
        autoFocus,
        className: cn("w-full pl-10 pr-10 py-2.5 bg-slate-800/50 border border-slate-700", "rounded-lg text-white placeholder-gray-400", "focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent", "transition-all duration-200")
      }), query && /* @__PURE__ */ jsxRuntimeExports.jsx("button", {
        onClick: () => {
          setQuery("");
          setSuggestions([]);
          inputRef.current?.focus();
        },
        className: "absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, {
          className: "h-4 w-4"
        })
      })]
    }), showDropdown && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
      className: "absolute z-50 w-full mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden",
      children: [suggestions.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "py-2",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
          className: "px-3 py-1.5 text-xs text-gray-400 uppercase tracking-wider",
          children: "Search Results"
        }), suggestions.map((stock, index) => /* @__PURE__ */ jsxRuntimeExports.jsxs("button", {
          onClick: () => handleSelectStock(stock),
          onMouseEnter: () => setSelectedIndex(index),
          className: cn("w-full px-3 py-2 text-left flex items-center justify-between", "hover:bg-slate-700/50 transition-colors", selectedIndex === index && "bg-slate-700/50"),
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "flex items-center gap-3",
            children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                className: "font-semibold text-white",
                children: stock.symbol
              }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                className: "text-sm text-gray-400 truncate max-w-[300px]",
                children: stock.name
              })]
            })
          }), stock.sector && /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
            className: "text-xs text-gray-500",
            children: stock.sector
          })]
        }, stock.symbol))]
      }), query.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, {
        children: [showRecentSearches && recentSearches.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "py-2 border-b border-slate-700",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "px-3 py-1.5 text-xs text-gray-400 uppercase tracking-wider flex items-center gap-1",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Clock, {
              className: "h-3 w-3"
            }), "Recent Searches"]
          }), recentSearches.map((stock) => /* @__PURE__ */ jsxRuntimeExports.jsxs("button", {
            onClick: () => handleSelectStock(stock),
            className: "w-full px-3 py-2 text-left hover:bg-slate-700/50 transition-colors",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
              className: "font-semibold text-white",
              children: stock.symbol
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
              className: "text-sm text-gray-400 truncate",
              children: stock.name
            })]
          }, `recent-${stock.symbol}`))]
        }), showPopularStocks && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "py-2",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "px-3 py-1.5 text-xs text-gray-400 uppercase tracking-wider flex items-center gap-1",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, {
              className: "h-3 w-3"
            }), "Popular Stocks"]
          }), POPULAR_STOCKS.map((stock) => /* @__PURE__ */ jsxRuntimeExports.jsxs("button", {
            onClick: () => handleSelectStock(stock),
            className: "w-full px-3 py-2 text-left hover:bg-slate-700/50 transition-colors flex items-center gap-2",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, {
              className: "h-3 w-3 text-yellow-500"
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                className: "font-semibold text-white",
                children: stock.symbol
              }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                className: "text-gray-400 ml-2",
                children: stock.name
              })]
            })]
          }, `popular-${stock.symbol}`))]
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "px-3 py-2 bg-slate-900/50 border-t border-slate-700 text-xs text-gray-500",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
          className: "inline-flex items-center gap-1",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx("kbd", {
            className: "px-1.5 py-0.5 bg-slate-700 rounded",
            children: "↑↓"
          }), " Navigate"]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
          className: "inline-flex items-center gap-1 ml-3",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx("kbd", {
            className: "px-1.5 py-0.5 bg-slate-700 rounded",
            children: "Enter"
          }), " Select"]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
          className: "inline-flex items-center gap-1 ml-3",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx("kbd", {
            className: "px-1.5 py-0.5 bg-slate-700 rounded",
            children: "Esc"
          }), " Close"]
        })]
      })]
    })]
  });
};
var PAGE_KEYS = ["PageUp", "PageDown"];
var ARROW_KEYS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
var BACK_KEYS = {
  "from-left": ["Home", "PageDown", "ArrowDown", "ArrowLeft"],
  "from-right": ["Home", "PageDown", "ArrowDown", "ArrowRight"],
  "from-bottom": ["Home", "PageDown", "ArrowDown", "ArrowLeft"],
  "from-top": ["Home", "PageDown", "ArrowUp", "ArrowLeft"]
};
var SLIDER_NAME = "Slider";
var [Collection, useCollection, createCollectionScope] = createCollection(SLIDER_NAME);
var [createSliderContext, createSliderScope] = createContextScope(SLIDER_NAME, [
  createCollectionScope
]);
var [SliderProvider, useSliderContext] = createSliderContext(SLIDER_NAME);
var Slider$1 = reactExports.forwardRef(
  (props, forwardedRef) => {
    const {
      name,
      min = 0,
      max = 100,
      step = 1,
      orientation = "horizontal",
      disabled = false,
      minStepsBetweenThumbs = 0,
      defaultValue = [min],
      value,
      onValueChange = () => {
      },
      onValueCommit = () => {
      },
      inverted = false,
      form,
      ...sliderProps
    } = props;
    const thumbRefs = reactExports.useRef(/* @__PURE__ */ new Set());
    const valueIndexToChangeRef = reactExports.useRef(0);
    const isHorizontal = orientation === "horizontal";
    const SliderOrientation = isHorizontal ? SliderHorizontal : SliderVertical;
    const [values = [], setValues] = useControllableState({
      prop: value,
      defaultProp: defaultValue,
      onChange: (value2) => {
        const thumbs = [...thumbRefs.current];
        thumbs[valueIndexToChangeRef.current]?.focus();
        onValueChange(value2);
      }
    });
    const valuesBeforeSlideStartRef = reactExports.useRef(values);
    function handleSlideStart(value2) {
      const closestIndex = getClosestValueIndex(values, value2);
      updateValues(value2, closestIndex);
    }
    function handleSlideMove(value2) {
      updateValues(value2, valueIndexToChangeRef.current);
    }
    function handleSlideEnd() {
      const prevValue = valuesBeforeSlideStartRef.current[valueIndexToChangeRef.current];
      const nextValue = values[valueIndexToChangeRef.current];
      const hasChanged = nextValue !== prevValue;
      if (hasChanged) onValueCommit(values);
    }
    function updateValues(value2, atIndex, { commit } = { commit: false }) {
      const decimalCount = getDecimalCount(step);
      const snapToStep = roundValue(Math.round((value2 - min) / step) * step + min, decimalCount);
      const nextValue = clamp(snapToStep, [min, max]);
      setValues((prevValues = []) => {
        const nextValues = getNextSortedValues(prevValues, nextValue, atIndex);
        if (hasMinStepsBetweenValues(nextValues, minStepsBetweenThumbs * step)) {
          valueIndexToChangeRef.current = nextValues.indexOf(nextValue);
          const hasChanged = String(nextValues) !== String(prevValues);
          if (hasChanged && commit) onValueCommit(nextValues);
          return hasChanged ? nextValues : prevValues;
        } else {
          return prevValues;
        }
      });
    }
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      SliderProvider,
      {
        scope: props.__scopeSlider,
        name,
        disabled,
        min,
        max,
        valueIndexToChangeRef,
        thumbs: thumbRefs.current,
        values,
        orientation,
        form,
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(Collection.Provider, { scope: props.__scopeSlider, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Collection.Slot, { scope: props.__scopeSlider, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          SliderOrientation,
          {
            "aria-disabled": disabled,
            "data-disabled": disabled ? "" : void 0,
            ...sliderProps,
            ref: forwardedRef,
            onPointerDown: composeEventHandlers(sliderProps.onPointerDown, () => {
              if (!disabled) valuesBeforeSlideStartRef.current = values;
            }),
            min,
            max,
            inverted,
            onSlideStart: disabled ? void 0 : handleSlideStart,
            onSlideMove: disabled ? void 0 : handleSlideMove,
            onSlideEnd: disabled ? void 0 : handleSlideEnd,
            onHomeKeyDown: () => !disabled && updateValues(min, 0, { commit: true }),
            onEndKeyDown: () => !disabled && updateValues(max, values.length - 1, { commit: true }),
            onStepKeyDown: ({ event, direction: stepDirection }) => {
              if (!disabled) {
                const isPageKey = PAGE_KEYS.includes(event.key);
                const isSkipKey = isPageKey || event.shiftKey && ARROW_KEYS.includes(event.key);
                const multiplier = isSkipKey ? 10 : 1;
                const atIndex = valueIndexToChangeRef.current;
                const value2 = values[atIndex];
                const stepInDirection = step * multiplier * stepDirection;
                updateValues(value2 + stepInDirection, atIndex, { commit: true });
              }
            }
          }
        ) }) })
      }
    );
  }
);
Slider$1.displayName = SLIDER_NAME;
var [SliderOrientationProvider, useSliderOrientationContext] = createSliderContext(SLIDER_NAME, {
  startEdge: "left",
  endEdge: "right",
  size: "width",
  direction: 1
});
var SliderHorizontal = reactExports.forwardRef(
  (props, forwardedRef) => {
    const {
      min,
      max,
      dir,
      inverted,
      onSlideStart,
      onSlideMove,
      onSlideEnd,
      onStepKeyDown,
      ...sliderProps
    } = props;
    const [slider, setSlider] = reactExports.useState(null);
    const composedRefs = useComposedRefs(forwardedRef, (node) => setSlider(node));
    const rectRef = reactExports.useRef(void 0);
    const direction = useDirection(dir);
    const isDirectionLTR = direction === "ltr";
    const isSlidingFromLeft = isDirectionLTR && !inverted || !isDirectionLTR && inverted;
    function getValueFromPointer(pointerPosition) {
      const rect = rectRef.current || slider.getBoundingClientRect();
      const input = [0, rect.width];
      const output = isSlidingFromLeft ? [min, max] : [max, min];
      const value = linearScale(input, output);
      rectRef.current = rect;
      return value(pointerPosition - rect.left);
    }
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      SliderOrientationProvider,
      {
        scope: props.__scopeSlider,
        startEdge: isSlidingFromLeft ? "left" : "right",
        endEdge: isSlidingFromLeft ? "right" : "left",
        direction: isSlidingFromLeft ? 1 : -1,
        size: "width",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          SliderImpl,
          {
            dir: direction,
            "data-orientation": "horizontal",
            ...sliderProps,
            ref: composedRefs,
            style: {
              ...sliderProps.style,
              ["--radix-slider-thumb-transform"]: "translateX(-50%)"
            },
            onSlideStart: (event) => {
              const value = getValueFromPointer(event.clientX);
              onSlideStart?.(value);
            },
            onSlideMove: (event) => {
              const value = getValueFromPointer(event.clientX);
              onSlideMove?.(value);
            },
            onSlideEnd: () => {
              rectRef.current = void 0;
              onSlideEnd?.();
            },
            onStepKeyDown: (event) => {
              const slideDirection = isSlidingFromLeft ? "from-left" : "from-right";
              const isBackKey = BACK_KEYS[slideDirection].includes(event.key);
              onStepKeyDown?.({ event, direction: isBackKey ? -1 : 1 });
            }
          }
        )
      }
    );
  }
);
var SliderVertical = reactExports.forwardRef(
  (props, forwardedRef) => {
    const {
      min,
      max,
      inverted,
      onSlideStart,
      onSlideMove,
      onSlideEnd,
      onStepKeyDown,
      ...sliderProps
    } = props;
    const sliderRef = reactExports.useRef(null);
    const ref = useComposedRefs(forwardedRef, sliderRef);
    const rectRef = reactExports.useRef(void 0);
    const isSlidingFromBottom = !inverted;
    function getValueFromPointer(pointerPosition) {
      const rect = rectRef.current || sliderRef.current.getBoundingClientRect();
      const input = [0, rect.height];
      const output = isSlidingFromBottom ? [max, min] : [min, max];
      const value = linearScale(input, output);
      rectRef.current = rect;
      return value(pointerPosition - rect.top);
    }
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      SliderOrientationProvider,
      {
        scope: props.__scopeSlider,
        startEdge: isSlidingFromBottom ? "bottom" : "top",
        endEdge: isSlidingFromBottom ? "top" : "bottom",
        size: "height",
        direction: isSlidingFromBottom ? 1 : -1,
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          SliderImpl,
          {
            "data-orientation": "vertical",
            ...sliderProps,
            ref,
            style: {
              ...sliderProps.style,
              ["--radix-slider-thumb-transform"]: "translateY(50%)"
            },
            onSlideStart: (event) => {
              const value = getValueFromPointer(event.clientY);
              onSlideStart?.(value);
            },
            onSlideMove: (event) => {
              const value = getValueFromPointer(event.clientY);
              onSlideMove?.(value);
            },
            onSlideEnd: () => {
              rectRef.current = void 0;
              onSlideEnd?.();
            },
            onStepKeyDown: (event) => {
              const slideDirection = isSlidingFromBottom ? "from-bottom" : "from-top";
              const isBackKey = BACK_KEYS[slideDirection].includes(event.key);
              onStepKeyDown?.({ event, direction: isBackKey ? -1 : 1 });
            }
          }
        )
      }
    );
  }
);
var SliderImpl = reactExports.forwardRef(
  (props, forwardedRef) => {
    const {
      __scopeSlider,
      onSlideStart,
      onSlideMove,
      onSlideEnd,
      onHomeKeyDown,
      onEndKeyDown,
      onStepKeyDown,
      ...sliderProps
    } = props;
    const context = useSliderContext(SLIDER_NAME, __scopeSlider);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      Primitive.span,
      {
        ...sliderProps,
        ref: forwardedRef,
        onKeyDown: composeEventHandlers(props.onKeyDown, (event) => {
          if (event.key === "Home") {
            onHomeKeyDown(event);
            event.preventDefault();
          } else if (event.key === "End") {
            onEndKeyDown(event);
            event.preventDefault();
          } else if (PAGE_KEYS.concat(ARROW_KEYS).includes(event.key)) {
            onStepKeyDown(event);
            event.preventDefault();
          }
        }),
        onPointerDown: composeEventHandlers(props.onPointerDown, (event) => {
          const target = event.target;
          target.setPointerCapture(event.pointerId);
          event.preventDefault();
          if (context.thumbs.has(target)) {
            target.focus();
          } else {
            onSlideStart(event);
          }
        }),
        onPointerMove: composeEventHandlers(props.onPointerMove, (event) => {
          const target = event.target;
          if (target.hasPointerCapture(event.pointerId)) onSlideMove(event);
        }),
        onPointerUp: composeEventHandlers(props.onPointerUp, (event) => {
          const target = event.target;
          if (target.hasPointerCapture(event.pointerId)) {
            target.releasePointerCapture(event.pointerId);
            onSlideEnd(event);
          }
        })
      }
    );
  }
);
var TRACK_NAME = "SliderTrack";
var SliderTrack = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeSlider, ...trackProps } = props;
    const context = useSliderContext(TRACK_NAME, __scopeSlider);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      Primitive.span,
      {
        "data-disabled": context.disabled ? "" : void 0,
        "data-orientation": context.orientation,
        ...trackProps,
        ref: forwardedRef
      }
    );
  }
);
SliderTrack.displayName = TRACK_NAME;
var RANGE_NAME = "SliderRange";
var SliderRange = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeSlider, ...rangeProps } = props;
    const context = useSliderContext(RANGE_NAME, __scopeSlider);
    const orientation = useSliderOrientationContext(RANGE_NAME, __scopeSlider);
    const ref = reactExports.useRef(null);
    const composedRefs = useComposedRefs(forwardedRef, ref);
    const valuesCount = context.values.length;
    const percentages = context.values.map(
      (value) => convertValueToPercentage(value, context.min, context.max)
    );
    const offsetStart = valuesCount > 1 ? Math.min(...percentages) : 0;
    const offsetEnd = 100 - Math.max(...percentages);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      Primitive.span,
      {
        "data-orientation": context.orientation,
        "data-disabled": context.disabled ? "" : void 0,
        ...rangeProps,
        ref: composedRefs,
        style: {
          ...props.style,
          [orientation.startEdge]: offsetStart + "%",
          [orientation.endEdge]: offsetEnd + "%"
        }
      }
    );
  }
);
SliderRange.displayName = RANGE_NAME;
var THUMB_NAME = "SliderThumb";
var SliderThumb = reactExports.forwardRef(
  (props, forwardedRef) => {
    const getItems = useCollection(props.__scopeSlider);
    const [thumb, setThumb] = reactExports.useState(null);
    const composedRefs = useComposedRefs(forwardedRef, (node) => setThumb(node));
    const index = reactExports.useMemo(
      () => thumb ? getItems().findIndex((item) => item.ref.current === thumb) : -1,
      [getItems, thumb]
    );
    return /* @__PURE__ */ jsxRuntimeExports.jsx(SliderThumbImpl, { ...props, ref: composedRefs, index });
  }
);
var SliderThumbImpl = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeSlider, index, name, ...thumbProps } = props;
    const context = useSliderContext(THUMB_NAME, __scopeSlider);
    const orientation = useSliderOrientationContext(THUMB_NAME, __scopeSlider);
    const [thumb, setThumb] = reactExports.useState(null);
    const composedRefs = useComposedRefs(forwardedRef, (node) => setThumb(node));
    const isFormControl = thumb ? context.form || !!thumb.closest("form") : true;
    const size = useSize(thumb);
    const value = context.values[index];
    const percent = value === void 0 ? 0 : convertValueToPercentage(value, context.min, context.max);
    const label = getLabel(index, context.values.length);
    const orientationSize = size?.[orientation.size];
    const thumbInBoundsOffset = orientationSize ? getThumbInBoundsOffset(orientationSize, percent, orientation.direction) : 0;
    reactExports.useEffect(() => {
      if (thumb) {
        context.thumbs.add(thumb);
        return () => {
          context.thumbs.delete(thumb);
        };
      }
    }, [thumb, context.thumbs]);
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "span",
      {
        style: {
          transform: "var(--radix-slider-thumb-transform)",
          position: "absolute",
          [orientation.startEdge]: `calc(${percent}% + ${thumbInBoundsOffset}px)`
        },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Collection.ItemSlot, { scope: props.__scopeSlider, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Primitive.span,
            {
              role: "slider",
              "aria-label": props["aria-label"] || label,
              "aria-valuemin": context.min,
              "aria-valuenow": value,
              "aria-valuemax": context.max,
              "aria-orientation": context.orientation,
              "data-orientation": context.orientation,
              "data-disabled": context.disabled ? "" : void 0,
              tabIndex: context.disabled ? void 0 : 0,
              ...thumbProps,
              ref: composedRefs,
              style: value === void 0 ? { display: "none" } : props.style,
              onFocus: composeEventHandlers(props.onFocus, () => {
                context.valueIndexToChangeRef.current = index;
              })
            }
          ) }),
          isFormControl && /* @__PURE__ */ jsxRuntimeExports.jsx(
            SliderBubbleInput,
            {
              name: name ?? (context.name ? context.name + (context.values.length > 1 ? "[]" : "") : void 0),
              form: context.form,
              value
            },
            index
          )
        ]
      }
    );
  }
);
SliderThumb.displayName = THUMB_NAME;
var BUBBLE_INPUT_NAME = "RadioBubbleInput";
var SliderBubbleInput = reactExports.forwardRef(
  ({ __scopeSlider, value, ...props }, forwardedRef) => {
    const ref = reactExports.useRef(null);
    const composedRefs = useComposedRefs(ref, forwardedRef);
    const prevValue = usePrevious(value);
    reactExports.useEffect(() => {
      const input = ref.current;
      if (!input) return;
      const inputProto = window.HTMLInputElement.prototype;
      const descriptor = Object.getOwnPropertyDescriptor(inputProto, "value");
      const setValue = descriptor.set;
      if (prevValue !== value && setValue) {
        const event = new Event("input", { bubbles: true });
        setValue.call(input, value);
        input.dispatchEvent(event);
      }
    }, [prevValue, value]);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      Primitive.input,
      {
        style: { display: "none" },
        ...props,
        ref: composedRefs,
        defaultValue: value
      }
    );
  }
);
SliderBubbleInput.displayName = BUBBLE_INPUT_NAME;
function getNextSortedValues(prevValues = [], nextValue, atIndex) {
  const nextValues = [...prevValues];
  nextValues[atIndex] = nextValue;
  return nextValues.sort((a, b) => a - b);
}
function convertValueToPercentage(value, min, max) {
  const maxSteps = max - min;
  const percentPerStep = 100 / maxSteps;
  const percentage = percentPerStep * (value - min);
  return clamp(percentage, [0, 100]);
}
function getLabel(index, totalValues) {
  if (totalValues > 2) {
    return `Value ${index + 1} of ${totalValues}`;
  } else if (totalValues === 2) {
    return ["Minimum", "Maximum"][index];
  } else {
    return void 0;
  }
}
function getClosestValueIndex(values, nextValue) {
  if (values.length === 1) return 0;
  const distances = values.map((value) => Math.abs(value - nextValue));
  const closestDistance = Math.min(...distances);
  return distances.indexOf(closestDistance);
}
function getThumbInBoundsOffset(width, left, direction) {
  const halfWidth = width / 2;
  const halfPercent = 50;
  const offset = linearScale([0, halfPercent], [0, halfWidth]);
  return (halfWidth - offset(left) * direction) * direction;
}
function getStepsBetweenValues(values) {
  return values.slice(0, -1).map((value, index) => values[index + 1] - value);
}
function hasMinStepsBetweenValues(values, minStepsBetweenValues) {
  if (minStepsBetweenValues > 0) {
    const stepsBetweenValues = getStepsBetweenValues(values);
    const actualMinStepsBetweenValues = Math.min(...stepsBetweenValues);
    return actualMinStepsBetweenValues >= minStepsBetweenValues;
  }
  return true;
}
function linearScale(input, output) {
  return (value) => {
    if (input[0] === input[1] || output[0] === output[1]) return output[0];
    const ratio = (output[1] - output[0]) / (input[1] - input[0]);
    return output[0] + ratio * (value - input[0]);
  };
}
function getDecimalCount(value) {
  return (String(value).split(".")[1] || "").length;
}
function roundValue(value, decimalCount) {
  const rounder = Math.pow(10, decimalCount);
  return Math.round(value * rounder) / rounder;
}
var Root = Slider$1;
var Track = SliderTrack;
var Range = SliderRange;
var Thumb = SliderThumb;
const Slider = reactExports.forwardRef(({
  className,
  ...props
}, ref) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Root, {
  ref,
  className: cn("relative flex w-full touch-none select-none items-center", className),
  ...props,
  children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Track, {
    className: "relative h-2 w-full grow overflow-hidden rounded-full bg-secondary",
    children: /* @__PURE__ */ jsxRuntimeExports.jsx(Range, {
      className: "absolute h-full bg-primary"
    })
  }), /* @__PURE__ */ jsxRuntimeExports.jsx(Thumb, {
    className: "block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
  })]
}));
Slider.displayName = Root.displayName;
export {
  Slider as S,
  UniversalSearch as U
};
