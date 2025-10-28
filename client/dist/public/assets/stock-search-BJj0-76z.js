import { r as reactExports, j as jsxRuntimeExports, f as cn, w as React, D as useQueryClient } from "./index-DF734YkB.js";
import { u as useMutation } from "./useMutation-BTJ0XPNX.js";
import { I as Input } from "./input-vX2xFcRS.js";
import { a as apiRequest } from "./queryClient-CXMFu_RS.js";
import { S as Search } from "./search-CySG90ju.js";
import "./api-config-Zh6ttKls.js";
const DEFAULT_CONFIG = {
  quality: 85,
  format: "webp",
  blur: true,
  placeholder: true,
  lazy: true,
  srcSet: true,
  sizes: "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
};
function generateSrcSet(src, widths = [640, 828, 1200, 1920]) {
  const baseUrl = src.split(".").slice(0, -1).join(".");
  src.split(".").pop();
  return widths.map((width) => `${baseUrl}-${width}w.webp ${width}w`).join(", ");
}
function generateBlurPlaceholder(width = 10, height = 10) {
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="blur">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1"/>
        </filter>
      </defs>
      <rect width="100%" height="100%" fill="#f3f4f6" filter="url(#blur)"/>
    </svg>
  `;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
function supportsWebP() {
  return new Promise((resolve) => {
    const webP = new Image();
    webP.onload = webP.onerror = () => {
      resolve(webP.height === 2);
    };
    webP.src = "data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA";
  });
}
const LOADING_STRATEGIES = {
  CRITICAL: {
    loading: "eager",
    fetchPriority: "high",
    preload: true
  },
  ABOVE_FOLD: {
    loading: "eager",
    fetchPriority: "auto",
    preload: false
  },
  BELOW_FOLD: {
    loading: "lazy",
    fetchPriority: "low",
    preload: false
  }
};
function calculateAspectRatio(width, height) {
  const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
  const divisor = gcd(width, height);
  return `${width / divisor}/${height / divisor}`;
}
function OptimizedImage({
  src,
  alt,
  width,
  height,
  priority = "below-fold",
  placeholder = "blur",
  optimization = {},
  onLoad,
  onError,
  fallback,
  blurDataURL,
  sizes,
  className,
  style,
  ...props
}) {
  const [isLoaded, setIsLoaded] = reactExports.useState(false);
  const [hasError, setHasError] = reactExports.useState(false);
  const [webpSupported, setWebpSupported] = reactExports.useState(null);
  const imgRef = reactExports.useRef(null);
  const [isInView, setIsInView] = reactExports.useState(priority === "critical");
  const config = {
    ...DEFAULT_CONFIG,
    ...optimization
  };
  const strategyConfig = LOADING_STRATEGIES[priority.toUpperCase()];
  reactExports.useEffect(() => {
    supportsWebP().then(setWebpSupported);
  }, []);
  reactExports.useEffect(() => {
    if (priority === "critical" || !imgRef.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsInView(true);
        observer.disconnect();
      }
    }, {
      rootMargin: "50px"
      // Start loading 50px before the image enters viewport
    });
    observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, [priority]);
  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };
  const handleError = (e) => {
    setHasError(true);
    const error = new Error(`Failed to load image: ${src}`);
    onError?.(error);
    if (fallback && imgRef.current) {
      imgRef.current.src = fallback;
      setHasError(false);
    }
  };
  const getOptimizedSrc = () => {
    if (webpSupported && config.format === "webp") {
      const webpSrc = src.replace(/\.(jpg|jpeg|png)$/i, ".webp");
      return webpSrc;
    }
    return src;
  };
  const getSrcSet = () => {
    if (!config.srcSet) return void 0;
    return generateSrcSet(getOptimizedSrc());
  };
  const getPlaceholder = () => {
    if (placeholder === "empty") return void 0;
    if (blurDataURL) return blurDataURL;
    if (placeholder === "blur" && width && height) {
      return generateBlurPlaceholder(width, height);
    }
    return generateBlurPlaceholder();
  };
  const containerStyle = {
    ...style,
    position: "relative",
    overflow: "hidden"
  };
  if (width && height) {
    containerStyle.aspectRatio = calculateAspectRatio(width, height);
  }
  const renderSkeleton = () => {
    if (placeholder !== "skeleton") return null;
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
      className: cn("absolute inset-0 bg-gray-200 animate-pulse", "flex items-center justify-center"),
      children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
        className: "w-8 h-8 bg-gray-300 rounded"
      })
    });
  };
  const renderBlurPlaceholder = () => {
    const placeholderSrc = getPlaceholder();
    if (!placeholderSrc || placeholder === "skeleton") return null;
    return /* @__PURE__ */ jsxRuntimeExports.jsx("img", {
      src: placeholderSrc,
      alt: "",
      className: cn("absolute inset-0 w-full h-full object-cover", "transition-opacity duration-300", isLoaded ? "opacity-0" : "opacity-100"),
      style: {
        filter: "blur(10px)",
        transform: "scale(1.1)"
        // Prevent white edges from blur
      }
    });
  };
  if (!isInView) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
      ref: imgRef,
      className,
      style: containerStyle,
      children: [renderSkeleton(), renderBlurPlaceholder()]
    });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
    className,
    style: containerStyle,
    children: [renderBlurPlaceholder(), renderSkeleton(), /* @__PURE__ */ jsxRuntimeExports.jsx("img", {
      ref: imgRef,
      src: getOptimizedSrc(),
      srcSet: getSrcSet(),
      sizes: sizes || config.sizes,
      alt,
      width,
      height,
      loading: strategyConfig.loading,
      fetchPriority: strategyConfig.fetchPriority,
      className: cn("w-full h-full object-cover", "transition-opacity duration-300", isLoaded ? "opacity-100" : "opacity-0", hasError && "hidden"),
      onLoad: handleLoad,
      onError: handleError,
      ...props
    }), hasError && !fallback && /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
      className: cn("absolute inset-0 bg-gray-100", "flex items-center justify-center text-gray-400"),
      children: /* @__PURE__ */ jsxRuntimeExports.jsx("svg", {
        className: "w-8 h-8",
        fill: "currentColor",
        viewBox: "0 0 20 20",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", {
          fillRule: "evenodd",
          d: "M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z",
          clipRule: "evenodd"
        })
      })
    })]
  });
}
React.memo(OptimizedImage, (prevProps, nextProps) => {
  return prevProps.src === nextProps.src && prevProps.alt === nextProps.alt && prevProps.width === nextProps.width && prevProps.height === nextProps.height && prevProps.priority === nextProps.priority && prevProps.className === nextProps.className;
});
function StockSearch({
  onSearch,
  searchResults,
  onStockSelect,
  placeholder = "Search stocks, ETFs, or companies..."
}) {
  const [query, setQuery] = reactExports.useState("");
  const [isOpen, setIsOpen] = reactExports.useState(false);
  const [debounceTimeout, setDebounceTimeout] = reactExports.useState(null);
  const searchRef = reactExports.useRef(null);
  const inputRef = reactExports.useRef(null);
  const queryClient = useQueryClient();
  const addRecentSearchMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiRequest("POST", "/api/recent-searches", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["recent-searches"]
      });
    }
  });
  reactExports.useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  reactExports.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "/" && !e.target?.matches?.("input, textarea")) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);
  const handleInputChange = (value) => {
    setQuery(value);
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }
    const timeout = setTimeout(() => {
      onSearch(value);
      setIsOpen(value.length > 0);
    }, 300);
    setDebounceTimeout(timeout);
  };
  const handleStockSelect = (stock) => {
    setQuery("");
    setIsOpen(false);
    onSearch("");
    addRecentSearchMutation.mutate({
      symbol: stock.symbol,
      name: stock.name
    });
    onStockSelect?.(stock);
  };
  const displayResults = searchResults?.slice(0, 10) || [];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
    ref: searchRef,
    className: "relative w-full",
    children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
      className: "relative",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Search, {
        className: "absolute left-5 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground"
      }), /* @__PURE__ */ jsxRuntimeExports.jsx(Input, {
        ref: inputRef,
        type: "text",
        placeholder,
        value: query,
        onChange: (e) => handleInputChange(e.target.value),
        onFocus: () => query.length > 0 && setIsOpen(true),
        className: "pl-14 pr-16 py-6 text-lg bg-teya-green/5 dark:bg-card/50 backdrop-blur-sm border border-teya-green/20 dark:border-border/50 rounded-2xl focus:ring-2 focus:ring-teya-green/30 focus:border-teya-green/50 transition-all duration-200 placeholder:text-muted-foreground/60"
      }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
        className: "absolute right-5 top-1/2 transform -translate-y-1/2",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx("kbd", {
          className: "px-3 py-1.5 text-xs bg-secondary/80 rounded-lg border border-border/50 text-muted-foreground font-mono backdrop-blur-sm",
          children: "/"
        })
      })]
    }), isOpen && displayResults.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
      className: "absolute top-full left-0 right-0 mt-3 bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in slide-in-from-top-2",
      children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
        className: "max-h-80 overflow-y-auto",
        children: displayResults.map((stock) => /* @__PURE__ */ jsxRuntimeExports.jsxs("button", {
          onClick: () => handleStockSelect(stock),
          className: "w-full flex items-center space-x-4 px-6 py-4 hover:bg-secondary/50 transition-all duration-200 text-left group",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "w-10 h-10 rounded-xl bg-secondary/50 flex-shrink-0 flex items-center justify-center overflow-hidden border border-border/30",
            children: stock.logo ? /* @__PURE__ */ jsxRuntimeExports.jsx(OptimizedImage, {
              src: stock.logo,
              alt: `${stock.name} logo`,
              className: "w-full h-full object-cover rounded-xl",
              onError: (e) => {
                e.currentTarget.style.display = "none";
              },
              priority: "low",
              lazy: true
            }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
              className: "text-sm font-bold text-primary",
              children: stock.symbol.charAt(0)
            })
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex-1 min-w-0",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
              className: "font-semibold text-foreground group-hover:text-primary transition-colors",
              children: stock.symbol
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
              className: "text-sm text-muted-foreground truncate",
              children: stock.name
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "text-right",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "font-bold text-foreground",
              children: ["$", stock.price]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: cn("text-sm font-medium px-2 py-0.5 rounded-full", parseFloat(stock.changePercent) >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"),
              children: [parseFloat(stock.changePercent) >= 0 ? "+" : "", stock.changePercent, "%"]
            })]
          })]
        }, stock.symbol))
      })
    }), isOpen && query.length > 0 && displayResults.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
      className: "absolute top-full left-0 right-0 mt-3 bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl z-50 p-6 text-center",
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "text-muted-foreground",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Search, {
          className: "h-8 w-8 mx-auto mb-2 opacity-50"
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
          children: ['No stocks found for "', /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
            className: "font-medium text-foreground",
            children: query
          }), '"']
        })]
      })
    })]
  });
}
export {
  StockSearch
};
