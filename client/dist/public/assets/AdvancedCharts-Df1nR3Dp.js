const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/price-chart-B_apOdIr.js","assets/lightweight-chart-CPbISesF.js","assets/index-DF734YkB.js","assets/index-DYOgWAf3.css","assets/revenue-chart-CGW91fJD.js","assets/chart-container-CPbaEAKc.js","assets/GraphicalItemClipPath-C5BaDaiW.js","assets/barSelectors-C4PIc_FS.js","assets/revenue-segment-chart-C9k_j8w5.js","assets/ebitda-chart-ByfVTRKA.js","assets/free-cash-flow-chart-C4QDoyAx.js","assets/net-income-chart-DJ__rMs2.js","assets/eps-chart-CrFKa7XE.js","assets/cash-debt-chart-rCsChvNe.js","assets/dividends-chart-BMnJV_dp.js","assets/return-capital-chart-IBhVloT3.js","assets/shares-chart-DEwJ5TPI.js","assets/ratios-chart-3ergMaMq.js","assets/valuation-chart-BUCCW0L8.js","assets/Area-DLKIhkx_.js","assets/ActivePoints-BIcFr9ho.js","assets/expenses-chart-CoFHIi7p.js"])))=>i.map(i=>d[i]);
import { e as createLucideIcon, r as reactExports, j as jsxRuntimeExports, f as cn, I as Slot, M as Info, B as Button, _ as __vitePreload, w as React, H as useParams, u as useLocation, k as Link, O as House, n as TrendingUp, S as Settings } from "./index-DF734YkB.js";
import { C as ChevronRight, M as MainLayout } from "./main-layout-iPfLAwEH.js";
import { T as TooltipProvider, a as Tooltip, b as TooltipTrigger, c as TooltipContent } from "./tooltip-BFWp8RjG.js";
import { i as invisibleFallbackService } from "./invisible-fallback-service-D6lMsDER.js";
import { b as useCachedQuote, c as useCachedHistorical, d as useCachedFundamentals } from "./use-cache-data-WpPFNsyq.js";
import { useSortable, sortableKeyboardCoordinates, SortableContext, rectSortingStrategy, arrayMove } from "./sortable.esm-ahdMFz1h.js";
import { C as CSS, u as useSensors, a as useSensor, K as KeyboardSensor, P as PointerSensor, D as DndContext, c as closestCenter } from "./core.esm-DqH32QMG.js";
import { E as Eye } from "./eye-DQw-lb5A.js";
import { E as EyeOff } from "./use-auth-monitoring-Ca9Wv08z.js";
import { S as StockHeaderV2 } from "./stock-header-v2-yGzpJaeX.js";
import { S as Star } from "./star-Cp1OMHQ3.js";
import { P as Plus } from "./plus-DmsdXgBw.js";
import { S as Share2 } from "./share-2-C3Zli1IN.js";
import { D as DollarSign } from "./dollar-sign-BDD_kA4E.js";
import { A as Activity } from "./activity-TJHkan0R.js";
import { T as Target } from "./target-D9zmh0Nc.js";
import { C as Clock } from "./clock-CEwJtTm9.js";
import "./dialog-B0u0SV5P.js";
import "./index-DXvlFXpR.js";
import "./input-vX2xFcRS.js";
import "./tabs-CPUG2mtF.js";
import "./index-Dx7UitrF.js";
import "./mail-D5HopcQP.js";
import "./lock-C5qTkNPd.js";
import "./user-C46AQImy.js";
import "./menu-CG6pfADK.js";
import "./chart-column-DNzw3S_G.js";
import "./search-CySG90ju.js";
import "./file-text-BCjG82i7.js";
import "./log-in-CA1V17qY.js";
import "./select-Bm8Ccf9j.js";
import "./index-IXOTxK3N.js";
import "./chevron-down-BYhiF8im.js";
import "./badge-Bax4ZZX3.js";
import "./scroll-area-BRs9U-pP.js";
import "./useQuery-C9HFImIm.js";
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const GripVertical = createLucideIcon("GripVertical", [
  ["circle", { cx: "9", cy: "12", r: "1", key: "1vctgf" }],
  ["circle", { cx: "9", cy: "5", r: "1", key: "hp0tcf" }],
  ["circle", { cx: "9", cy: "19", r: "1", key: "fkjjf6" }],
  ["circle", { cx: "15", cy: "12", r: "1", key: "1tmaij" }],
  ["circle", { cx: "15", cy: "5", r: "1", key: "19l28e" }],
  ["circle", { cx: "15", cy: "19", r: "1", key: "f4zoj3" }]
]);
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const RotateCcw = createLucideIcon("RotateCcw", [
  ["path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8", key: "1357e3" }],
  ["path", { d: "M3 3v5h5", key: "1xhq8a" }]
]);
const Breadcrumb = reactExports.forwardRef(({
  ...props
}, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx("nav", {
  ref,
  "aria-label": "breadcrumb",
  ...props
}));
Breadcrumb.displayName = "Breadcrumb";
const BreadcrumbList = reactExports.forwardRef(({
  className,
  ...props
}, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx("ol", {
  ref,
  className: cn("flex flex-wrap items-center gap-1.5 break-words text-sm text-muted-foreground sm:gap-2.5", className),
  ...props
}));
BreadcrumbList.displayName = "BreadcrumbList";
const BreadcrumbItem = reactExports.forwardRef(({
  className,
  ...props
}, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", {
  ref,
  className: cn("inline-flex items-center gap-1.5", className),
  ...props
}));
BreadcrumbItem.displayName = "BreadcrumbItem";
const BreadcrumbLink = reactExports.forwardRef(({
  asChild,
  className,
  ...props
}, ref) => {
  const Comp = asChild ? Slot : "a";
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Comp, {
    ref,
    className: cn("transition-colors hover:text-foreground", className),
    ...props
  });
});
BreadcrumbLink.displayName = "BreadcrumbLink";
const BreadcrumbPage = reactExports.forwardRef(({
  className,
  ...props
}, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
  ref,
  role: "link",
  "aria-disabled": "true",
  "aria-current": "page",
  className: cn("font-normal text-foreground", className),
  ...props
}));
BreadcrumbPage.displayName = "BreadcrumbPage";
const BreadcrumbSeparator = ({
  children,
  className,
  ...props
}) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", {
  role: "presentation",
  "aria-hidden": "true",
  className: cn("[&>svg]:w-3.5 [&>svg]:h-3.5", className),
  ...props,
  children: children ?? /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, {})
});
BreadcrumbSeparator.displayName = "BreadcrumbSeparator";
function MetricTooltip({
  content
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipProvider, {
    children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Tooltip, {
      children: [/* @__PURE__ */ jsxRuntimeExports.jsx(TooltipTrigger, {
        asChild: true,
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(Info, {
          className: "h-3 w-3 text-muted-foreground/60 hover:text-muted-foreground cursor-help ml-1"
        })
      }), /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipContent, {
        className: "max-w-xs text-xs leading-relaxed",
        style: {
          zIndex: 999999
        },
        side: "top",
        sideOffset: 5,
        children: content
      })]
    })
  });
}
const DEFAULT_CHARTS = [{
  id: "price-chart",
  name: "Price",
  component: null,
  visible: true
}, {
  id: "revenue-chart",
  name: "Revenue",
  component: null,
  visible: true
}, {
  id: "revenue-segment-chart",
  name: "Revenue by Segment",
  component: null,
  visible: true
}, {
  id: "ebitda-chart",
  name: "EBITDA",
  component: null,
  visible: true
}, {
  id: "fcf-chart",
  name: "Free Cash Flow",
  component: null,
  visible: true
}, {
  id: "net-income-chart",
  name: "Net Income",
  component: null,
  visible: true
}, {
  id: "eps-chart",
  name: "EPS",
  component: null,
  visible: true
}, {
  id: "cash-debt-chart",
  name: "Cash & Debt",
  component: null,
  visible: true
}, {
  id: "dividends-chart",
  name: "Dividends",
  component: null,
  visible: true
}, {
  id: "return-capital-chart",
  name: "Return of Capital",
  component: null,
  visible: true
}, {
  id: "shares-chart",
  name: "Shares Outstanding",
  component: null,
  visible: true
}, {
  id: "ratios-chart",
  name: "Ratios",
  component: null,
  visible: true
}, {
  id: "valuation-chart",
  name: "Valuation",
  component: null,
  visible: true
}, {
  id: "expenses-chart",
  name: "Expenses",
  component: null,
  visible: true
}];
function useChartLayout(symbol) {
  const [charts, setCharts] = reactExports.useState(DEFAULT_CHARTS);
  const [isCustomized, setIsCustomized] = reactExports.useState(false);
  const storageKey = symbol ? `chart-layout-${symbol}` : "chart-layout-default";
  reactExports.useEffect(() => {
    try {
      const savedLayout = localStorage.getItem(storageKey);
      if (savedLayout) {
        const parsedLayout = JSON.parse(savedLayout);
        setCharts(parsedLayout);
        setIsCustomized(true);
      }
    } catch (error) {
      console.error("Error loading chart layout:", error);
    }
  }, [storageKey]);
  const saveLayout = (newCharts) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(newCharts));
      setCharts(newCharts);
      setIsCustomized(true);
    } catch (error) {
      console.error("Error saving chart layout:", error);
    }
  };
  const reorderCharts = (newCharts) => {
    saveLayout(newCharts);
  };
  const toggleChartVisibility = (chartId) => {
    const newCharts = charts.map((chart) => chart.id === chartId ? {
      ...chart,
      visible: !chart.visible
    } : chart);
    saveLayout(newCharts);
  };
  const resetLayout = () => {
    try {
      localStorage.removeItem(storageKey);
      setCharts(DEFAULT_CHARTS);
      setIsCustomized(false);
    } catch (error) {
      console.error("Error resetting chart layout:", error);
    }
  };
  const visibleCharts = charts.filter((chart) => chart.visible);
  return {
    charts,
    visibleCharts,
    isCustomized,
    reorderCharts,
    toggleChartVisibility,
    resetLayout
  };
}
function DraggableChart({
  id,
  name,
  visible,
  children,
  onToggleVisibility,
  isDragMode
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };
  if (!visible && !isDragMode) {
    return null;
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
    ref: setNodeRef,
    style,
    className: cn("relative group transition-all duration-200", isDragging && "z-50 shadow-2xl scale-105", !visible && isDragMode && "opacity-50", isDragMode && "cursor-move"),
    children: [isDragMode && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
      className: "absolute -top-2 left-2 right-2 z-10 flex items-center justify-between bg-background/90 backdrop-blur-sm border border-border rounded-lg px-2 py-1 shadow-lg",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "flex items-center gap-2",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
          ...attributes,
          ...listeners,
          className: "cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(GripVertical, {
            className: "h-4 w-4 text-muted-foreground"
          })
        }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
          className: "text-xs font-medium text-foreground",
          children: name
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
        variant: "ghost",
        size: "sm",
        className: "h-6 w-6 p-0",
        onClick: () => onToggleVisibility(id),
        children: visible ? /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, {
          className: "h-3 w-3"
        }) : /* @__PURE__ */ jsxRuntimeExports.jsx(EyeOff, {
          className: "h-3 w-3"
        })
      })]
    }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
      className: cn("transition-all duration-200", isDragMode && "mt-8", !visible && "pointer-events-none"),
      children
    }), !visible && isDragMode && /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
      className: "absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30",
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "text-center",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx(EyeOff, {
          className: "h-8 w-8 text-muted-foreground mx-auto mb-2"
        }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
          className: "text-sm text-muted-foreground",
          children: "Hidden Chart"
        })]
      })
    })]
  });
}
const PriceChart = reactExports.lazy(() => __vitePreload(() => import("./price-chart-B_apOdIr.js"), true ? __vite__mapDeps([0,1,2,3]) : void 0).then((module) => ({
  default: module.PriceChart
})));
const RevenueChart = reactExports.lazy(() => __vitePreload(() => import("./revenue-chart-CGW91fJD.js"), true ? __vite__mapDeps([4,1,2,3,5,6,7]) : void 0).then((module) => ({
  default: module.RevenueChart
})));
const RevenueSegmentChart = reactExports.lazy(() => __vitePreload(() => import("./revenue-segment-chart-C9k_j8w5.js"), true ? __vite__mapDeps([8,1,2,3,5,6,7]) : void 0).then((module) => ({
  default: module.RevenueSegmentChart
})));
const EbitdaChart = reactExports.lazy(() => __vitePreload(() => import("./ebitda-chart-ByfVTRKA.js"), true ? __vite__mapDeps([9,1,2,3,5,6,7]) : void 0).then((module) => ({
  default: module.EbitdaChart
})));
const FreeCashFlowChart = reactExports.lazy(() => __vitePreload(() => import("./free-cash-flow-chart-C4QDoyAx.js"), true ? __vite__mapDeps([10,1,2,3,5,6,7]) : void 0).then((module) => ({
  default: module.FreeCashFlowChart
})));
const NetIncomeChart = reactExports.lazy(() => __vitePreload(() => import("./net-income-chart-DJ__rMs2.js"), true ? __vite__mapDeps([11,1,2,3,5,6,7]) : void 0).then((module) => ({
  default: module.NetIncomeChart
})));
const EpsChart = reactExports.lazy(() => __vitePreload(() => import("./eps-chart-CrFKa7XE.js"), true ? __vite__mapDeps([12,1,2,3,5,6,7]) : void 0).then((module) => ({
  default: module.EpsChart
})));
const CashDebtChart = reactExports.lazy(() => __vitePreload(() => import("./cash-debt-chart-rCsChvNe.js"), true ? __vite__mapDeps([13,1,2,3,5,6,7]) : void 0).then((module) => ({
  default: module.CashDebtChart
})));
const DividendsChart = reactExports.lazy(() => __vitePreload(() => import("./dividends-chart-BMnJV_dp.js"), true ? __vite__mapDeps([14,1,2,3,5,6,7]) : void 0).then((module) => ({
  default: module.DividendsChart
})));
const ReturnCapitalChart = reactExports.lazy(() => __vitePreload(() => import("./return-capital-chart-IBhVloT3.js"), true ? __vite__mapDeps([15,1,2,3,5,6,7]) : void 0).then((module) => ({
  default: module.ReturnCapitalChart
})));
const SharesChart = reactExports.lazy(() => __vitePreload(() => import("./shares-chart-DEwJ5TPI.js"), true ? __vite__mapDeps([16,1,2,3,5,6,7]) : void 0).then((module) => ({
  default: module.SharesChart
})));
const RatiosChart = reactExports.lazy(() => __vitePreload(() => import("./ratios-chart-3ergMaMq.js"), true ? __vite__mapDeps([17,1,2,3,5,6,7]) : void 0).then((module) => ({
  default: module.RatiosChart
})));
const ValuationChart = reactExports.lazy(() => __vitePreload(() => import("./valuation-chart-BUCCW0L8.js"), true ? __vite__mapDeps([18,1,2,3,5,6,19,20]) : void 0).then((module) => ({
  default: module.ValuationChart
})));
const ExpensesChart = reactExports.lazy(() => __vitePreload(() => import("./expenses-chart-CoFHIi7p.js"), true ? __vite__mapDeps([21,1,2,3,5,6,7]) : void 0).then((module) => ({
  default: module.ExpensesChart
})));
const ChartSkeleton = () => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
  className: "animate-pulse",
  children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
    className: "h-4 bg-muted rounded w-1/3 mb-2"
  }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
    className: "h-2 bg-muted rounded w-1/4 mb-4"
  }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
    className: "h-48 bg-muted rounded"
  })]
});
const ChartError = ({
  error
}) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
  className: "flex items-center justify-center h-48 text-muted-foreground",
  children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
    className: "text-center",
    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("p", {
      className: "text-sm",
      children: "Failed to load chart"
    }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
      className: "text-xs",
      children: error.message
    })]
  })
});
const getDynamicChartComponent = (chartId, stockData) => {
  if (!stockData) return null;
  const chartProps = getChartProps(chartId, stockData);
  if (!chartProps) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(reactExports.Suspense, {
    fallback: /* @__PURE__ */ jsxRuntimeExports.jsx(ChartSkeleton, {}),
    children: /* @__PURE__ */ jsxRuntimeExports.jsx(ErrorBoundary, {
      children: renderChart(chartId, chartProps)
    })
  });
};
const getChartProps = (chartId, stockData) => {
  switch (chartId) {
    case "price-chart":
      return {
        data: stockData.charts.price
      };
    case "revenue-chart":
      return {
        data: stockData.charts.revenue
      };
    case "revenue-segment-chart":
      return {
        data: stockData.charts.revenueBySegment
      };
    case "ebitda-chart":
      return {
        data: stockData.charts.ebitda
      };
    case "fcf-chart":
      return {
        data: stockData.charts.freeCashFlow
      };
    case "net-income-chart":
      return {
        data: stockData.charts.netIncome
      };
    case "eps-chart":
      return {
        data: stockData.charts.eps
      };
    case "cash-debt-chart":
      return {
        data: stockData.charts.cashAndDebt
      };
    case "dividends-chart":
      return {
        data: stockData.charts.dividends
      };
    case "return-capital-chart":
      return {
        data: stockData.charts.returnOfCapital
      };
    case "shares-chart":
      return {
        data: stockData.charts.sharesOutstanding
      };
    case "ratios-chart":
      return {
        data: stockData.charts.ratios
      };
    case "valuation-chart":
      return {
        data: stockData.charts.valuation
      };
    case "expenses-chart":
      return {
        data: stockData.charts.expenses
      };
    default:
      return null;
  }
};
const renderChart = (chartId, props) => {
  switch (chartId) {
    case "price-chart":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(PriceChart, {
        ...props
      });
    case "revenue-chart":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(RevenueChart, {
        ...props
      });
    case "revenue-segment-chart":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(RevenueSegmentChart, {
        ...props
      });
    case "ebitda-chart":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(EbitdaChart, {
        ...props
      });
    case "fcf-chart":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(FreeCashFlowChart, {
        ...props
      });
    case "net-income-chart":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(NetIncomeChart, {
        ...props
      });
    case "eps-chart":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(EpsChart, {
        ...props
      });
    case "cash-debt-chart":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(CashDebtChart, {
        ...props
      });
    case "dividends-chart":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(DividendsChart, {
        ...props
      });
    case "return-capital-chart":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(ReturnCapitalChart, {
        ...props
      });
    case "shares-chart":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(SharesChart, {
        ...props
      });
    case "ratios-chart":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(RatiosChart, {
        ...props
      });
    case "valuation-chart":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(ValuationChart, {
        ...props
      });
    case "expenses-chart":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(ExpensesChart, {
        ...props
      });
    default:
      return null;
  }
};
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false
    };
  }
  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error
    };
  }
  componentDidCatch(error, errorInfo) {
    console.error("Chart component error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return /* @__PURE__ */ jsxRuntimeExports.jsx(ChartError, {
        error: this.state.error
      });
    }
    return this.props.children;
  }
}
const preloadCriticalCharts = () => {
  Promise.all([__vitePreload(() => import("./price-chart-B_apOdIr.js"), true ? __vite__mapDeps([0,1,2,3]) : void 0), __vitePreload(() => import("./revenue-chart-CGW91fJD.js"), true ? __vite__mapDeps([4,1,2,3,5,6,7]) : void 0), __vitePreload(() => import("./chart-container-CPbaEAKc.js"), true ? __vite__mapDeps([5,2,3]) : void 0)]).catch(() => {
  });
};
function AdvancedCharts() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const symbol = params.symbol;
  const [stockData, setStockData] = reactExports.useState(null);
  const [loading, setLoading] = reactExports.useState(true);
  const [error, setError] = reactExports.useState(null);
  const [chartPeriod, setChartPeriod] = reactExports.useState("quarterly");
  const [isDragMode, setIsDragMode] = reactExports.useState(false);
  const [isInWatchlist, setIsInWatchlist] = reactExports.useState(false);
  const {
    charts,
    visibleCharts,
    isCustomized,
    reorderCharts,
    toggleChartVisibility,
    resetLayout
  } = useChartLayout(symbol);
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates
  }));
  const getChartComponent = (chartId) => {
    return getDynamicChartComponent(chartId, stockData);
  };
  const handleDragEnd = (event) => {
    const {
      active,
      over
    } = event;
    if (over && active.id !== over.id) {
      const oldIndex = charts.findIndex((chart) => chart.id === active.id);
      const newIndex = charts.findIndex((chart) => chart.id === over.id);
      const newCharts = arrayMove(charts, oldIndex, newIndex);
      reorderCharts(newCharts);
    }
  };
  reactExports.useEffect(() => {
    if (symbol && typeof symbol === "string") {
      fetchStockData(symbol);
    }
  }, [symbol, chartPeriod]);
  reactExports.useEffect(() => {
    preloadCriticalCharts();
  }, []);
  const {
    data: quoteData,
    isLoading: quoteLoading
  } = useCachedQuote(symbol || "", {
    enabled: !!symbol
  });
  const {
    data: historicalData,
    isLoading: historicalLoading
  } = useCachedHistorical(symbol || "", "1M", {
    enabled: !!symbol
  });
  const {
    data: fundamentalsData,
    isLoading: fundamentalsLoading
  } = useCachedFundamentals(symbol || "", {
    enabled: !!symbol
  });
  const fetchStockData = async (stockSymbol) => {
    try {
      setLoading(true);
      setError(null);
      let stockQuote = quoteData;
      if (!stockQuote) {
        const fallbackResponse = await invisibleFallbackService.getFallbackQuotes([stockSymbol]);
        stockQuote = fallbackResponse.quotes[0];
      }
      if (!stockQuote) {
        throw new Error(`No data available for ${stockSymbol}`);
      }
      const revenueData = historicalData?.historical?.map((item) => ({
        quarter: item.date,
        value: item.close * 1e6
        // Convert to revenue-like numbers
      })) || [];
      const stockData2 = {
        symbol: stockQuote.symbol || stockSymbol,
        name: stockQuote.name || stockSymbol,
        logo: stockQuote.logo || `/api/placeholder/48/48`,
        currentPrice: {
          price: stockQuote.price || 0,
          change: stockQuote.change || 0,
          changePercent: stockQuote.changePercent || 0,
          high: stockQuote.high || 0,
          low: stockQuote.low,
          open: stockQuote.open,
          previousClose: stockQuote.price - stockQuote.change
        },
        profile: {
          sector: stockQuote.sector,
          industry: stockQuote.industry,
          marketCap: parseInt(stockQuote.marketCap.replace(/[$B,]/g, "")) * 1e9,
          sharesOutstanding: 157e8,
          // Default value
          country: "US",
          currency: "USD",
          website: `https://${stockQuote.symbol.toLowerCase()}.com`
        },
        charts: {
          price: Array.from({
            length: 30
          }, (_, i) => ({
            date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1e3).toISOString().split("T")[0],
            price: 180 + Math.random() * 40
          })),
          revenue: revenueData,
          revenueBySegment: Array.from({
            length: 8
          }, (_, i) => ({
            quarter: `Q${i % 4 + 1} ${2023 + Math.floor(i / 4)}`,
            segments: {
              "iPhone": 45e3 + Math.random() * 2e4,
              "iPad": 7e3 + Math.random() * 3e3,
              "Mac": 1e4 + Math.random() * 5e3,
              "Services": 2e4 + Math.random() * 1e4,
              "Wearables": 8e3 + Math.random() * 4e3
            }
          })),
          ebitda: revenueData.map((item) => ({
            quarter: item.quarter,
            value: Math.floor(item.value * 0.35) + Math.random() * 5e3
          })),
          freeCashFlow: revenueData.map((item) => ({
            quarter: item.quarter,
            value: Math.floor(item.value * 0.28) + Math.random() * 8e3
          })),
          netIncome: revenueData.map((item) => ({
            quarter: item.quarter,
            value: Math.floor(item.value * 0.25) + Math.random() * 6e3
          })),
          eps: revenueData.map((item) => ({
            quarter: item.quarter,
            value: 1.2 + Math.random() * 0.8
          })),
          cashAndDebt: Array.from({
            length: 8
          }, (_, i) => ({
            quarter: `Q${i % 4 + 1} ${2023 + Math.floor(i / 4)}`,
            cash: 16e4 + Math.random() * 2e4,
            debt: 11e4 + Math.random() * 15e3
          })),
          dividends: Array.from({
            length: 12
          }, (_, i) => ({
            date: new Date(Date.now() - i * 90 * 24 * 60 * 60 * 1e3).toISOString().split("T")[0],
            amount: 0.22 + Math.random() * 0.08
          })),
          returnOfCapital: Array.from({
            length: 8
          }, (_, i) => ({
            quarter: `Q${i % 4 + 1} ${2023 + Math.floor(i / 4)}`,
            value: 15 + Math.random() * 10
          })),
          sharesOutstanding: Array.from({
            length: 8
          }, (_, i) => ({
            quarter: `Q${i % 4 + 1} ${2023 + Math.floor(i / 4)}`,
            value: 15700 + Math.random() * 200
          })),
          ratios: Array.from({
            length: 8
          }, (_, i) => ({
            quarter: `Q${i % 4 + 1} ${2023 + Math.floor(i / 4)}`,
            pe: 25 + Math.random() * 10,
            roe: 0.15 + Math.random() * 0.1,
            roa: 0.08 + Math.random() * 0.05,
            grossMargin: 0.35 + Math.random() * 0.1
          })),
          valuation: Array.from({
            length: 30
          }, (_, i) => ({
            date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1e3).toISOString().split("T")[0],
            value: 28 + Math.random() * 12
          })),
          expenses: Array.from({
            length: 8
          }, (_, i) => ({
            quarter: `Q${i % 4 + 1} ${2023 + Math.floor(i / 4)}`,
            operating: 45e3 + Math.random() * 1e4,
            rd: 25e3 + Math.random() * 5e3,
            sga: 15e3 + Math.random() * 3e3,
            other: 5e3 + Math.random() * 2e3
          }))
        },
        keyMetrics: {
          pe: 28.5,
          eps: 1.89,
          dividendYield: 47e-4,
          marketCap: 32e11,
          freeCashFlow: 93e9,
          netIncome: 97e9,
          ebitda: revenueData[revenueData.length - 1]?.value * 0.35 || 0,
          totalCash: 165e9,
          totalDebt: 11e10,
          roe: 0.175,
          roa: 0.087,
          grossMargin: 0.381,
          operatingMargin: 0.297,
          netMargin: 0.253
        }
      };
      setStockData(stockData2);
    } catch (err) {
      setError("Failed to load stock data. Please try again.");
      console.error("Error fetching stock data:", err);
    } finally {
      setLoading(false);
    }
  };
  if (loading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(MainLayout, {
      children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
        className: "flex items-center justify-center min-h-screen",
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "text-center",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
            className: "text-muted-foreground",
            children: "Loading stock data..."
          })]
        })
      })
    });
  }
  if (error || !stockData) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(MainLayout, {
      children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
        className: "flex items-center justify-center min-h-screen",
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "text-center",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "text-red-500 mb-4",
            children: "⚠️ Error"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("h3", {
            className: "text-xl font-semibold mb-2",
            children: "Failed to load stock data"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
            className: "text-muted-foreground mb-4",
            children: error
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
            onClick: () => setLocation("/dashboard"),
            className: "bg-gradient-to-r from-teya-green via-teya-green-dark to-teya-green hover:from-teya-green-dark hover:via-teya-green hover:to-teya-green-dark text-rich-black font-semibold shadow-lg shadow-teya-green/30 hover:shadow-teya-green/50 hover:scale-105 transition-all duration-300 border-0",
            children: "Go Back"
          })]
        })
      })
    });
  }
  const {
    currentPrice,
    profile,
    keyMetrics
  } = stockData;
  currentPrice.change >= 0;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(MainLayout, {
    children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
      className: "p-8 space-y-6",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "flex items-center justify-between",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Breadcrumb, {
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs(BreadcrumbList, {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(BreadcrumbItem, {
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(BreadcrumbLink, {
                asChild: true,
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(Link, {
                  href: "/",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(House, {
                    className: "h-4 w-4"
                  })
                })
              })
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(BreadcrumbSeparator, {}), /* @__PURE__ */ jsxRuntimeExports.jsx(BreadcrumbItem, {
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(BreadcrumbLink, {
                asChild: true,
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(Link, {
                  href: "/",
                  children: "Dashboard"
                })
              })
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(BreadcrumbSeparator, {}), /* @__PURE__ */ jsxRuntimeExports.jsx(BreadcrumbItem, {
              children: /* @__PURE__ */ jsxRuntimeExports.jsxs(BreadcrumbPage, {
                children: [stockData.name, " (", stockData.symbol, ")"]
              })
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(BreadcrumbSeparator, {}), /* @__PURE__ */ jsxRuntimeExports.jsx(BreadcrumbItem, {
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(BreadcrumbPage, {
                children: "Advanced Charts"
              })
            })]
          })
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "flex items-center gap-2",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
            variant: "outline",
            size: "sm",
            onClick: () => setIsInWatchlist(!isInWatchlist),
            className: cn("gap-2", isInWatchlist ? "bg-teya-green/10 border-teya-green/30 text-teya-green" : "border-teya-green/20 hover:bg-teya-green/10"),
            children: [isInWatchlist ? /* @__PURE__ */ jsxRuntimeExports.jsx(Star, {
              className: "w-4 h-4 fill-current"
            }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, {
              className: "w-4 h-4"
            }), isInWatchlist ? "In Watchlist" : "Add to Watchlist"]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
            variant: "outline",
            size: "sm",
            className: "gap-2",
            onClick: () => {
              if (navigator.share) {
                navigator.share({
                  title: `${stockData.name} (${stockData.symbol})`,
                  text: `Check out ${stockData.name} stock analysis on Alfalyzer`,
                  url: window.location.href
                });
              } else {
                navigator.clipboard.writeText(window.location.href);
              }
            },
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Share2, {
              className: "w-4 h-4"
            }), "Share"]
          })]
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsx(StockHeaderV2, {
        symbol: stockData.symbol,
        company: {
          name: stockData.name,
          sector: profile.sector,
          price: currentPrice.price,
          change: currentPrice.change,
          changePercent: currentPrice.changePercent,
          afterHoursPrice: currentPrice.price + 0.57,
          afterHoursChange: 0.57,
          afterHoursChangePercent: 0.28,
          earningsDate: "Jul 30",
          logo: stockData.logo
        },
        isInWatchlist,
        onAddToWatchlist: () => setIsInWatchlist(!isInWatchlist),
        onShare: () => {
          if (navigator.share) {
            navigator.share({
              title: `${stockData.name} (${stockData.symbol})`,
              text: `Check out ${stockData.name} stock analysis on Alfalyzer`,
              url: window.location.href
            });
          } else {
            navigator.clipboard.writeText(window.location.href);
          }
        }
      }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
        className: "bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-6",
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "bg-secondary/10 rounded-lg p-4",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "flex items-center gap-2 mb-3",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(DollarSign, {
                className: "h-4 w-4 text-primary"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx("h3", {
                className: "text-sm font-semibold text-foreground",
                children: "VALUATION"
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "space-y-2 text-xs",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "flex justify-between",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "flex items-center",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                    className: "text-muted-foreground",
                    children: "P/E Ratio"
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx(MetricTooltip, {
                    content: "Price-to-Earnings ratio. Compares stock price to earnings per share. 15-25 = reasonable, >30 = expensive, <15 = cheap or troubled"
                  })]
                }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                  className: "font-medium",
                  children: keyMetrics.pe.toFixed(1)
                })]
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "flex justify-between",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "flex items-center",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                    className: "text-muted-foreground",
                    children: "Market Cap"
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx(MetricTooltip, {
                    content: "Total value of all company shares. Large cap >$10B, Mid cap $2-10B, Small cap <$2B. Larger = more stable, smaller = more growth potential"
                  })]
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
                  className: "font-medium",
                  children: ["$", (profile.marketCap / 1e9).toFixed(1), "T"]
                })]
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "flex justify-between",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "flex items-center",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                    className: "text-muted-foreground",
                    children: "Price/Sales"
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx(MetricTooltip, {
                    content: "Stock price divided by revenue per share. Compares valuation to sales. <1 = cheap, 1-3 = reasonable, >5 = expensive"
                  })]
                }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                  className: "font-medium",
                  children: "7.8"
                })]
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "flex justify-between",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "flex items-center",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                    className: "text-muted-foreground",
                    children: "Enterprise Value"
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx(MetricTooltip, {
                    content: "Market cap + debt - cash. True cost to buy entire company. More accurate than market cap for comparisons"
                  })]
                }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                  className: "font-medium",
                  children: "$2.98T"
                })]
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "flex justify-between",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "flex items-center",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                    className: "text-muted-foreground",
                    children: "EV/Revenue"
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx(MetricTooltip, {
                    content: "Enterprise Value divided by revenue. Better than P/S for debt-heavy companies. <2 = cheap, 2-5 = fair, >8 = expensive"
                  })]
                }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                  className: "font-medium",
                  children: "7.6"
                })]
              })]
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "bg-secondary/10 rounded-lg p-4",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "flex items-center gap-2 mb-3",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Activity, {
                className: "h-4 w-4 text-emerald-500"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx("h3", {
                className: "text-sm font-semibold text-foreground",
                children: "PERFORMANCE"
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "space-y-2 text-xs",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "flex justify-between",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "flex items-center",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                    className: "text-muted-foreground",
                    children: "ROE"
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx(MetricTooltip, {
                    content: "Return on Equity. How efficiently company uses shareholders' money to generate profit. >15% = excellent, 10-15% = good, <10% = poor"
                  })]
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
                  className: "font-medium",
                  children: [(keyMetrics.roe * 100).toFixed(1), "%"]
                })]
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "flex justify-between",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "flex items-center",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                    className: "text-muted-foreground",
                    children: "Net Margin"
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx(MetricTooltip, {
                    content: "Net income as percentage of revenue. Shows profitability after all expenses. >20% = excellent, 10-20% = good, <5% = poor"
                  })]
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
                  className: "font-medium",
                  children: [(keyMetrics.netMargin * 100).toFixed(1), "%"]
                })]
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "flex justify-between",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "flex items-center",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                    className: "text-muted-foreground",
                    children: "Operating Margin"
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx(MetricTooltip, {
                    content: "Operating income as percentage of revenue. Profit from core business before taxes and interest. >15% = excellent, 5-15% = good"
                  })]
                }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                  className: "font-medium",
                  children: "29.7%"
                })]
              })]
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "bg-secondary/10 rounded-lg p-4",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "flex items-center gap-2 mb-3",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Target, {
                className: "h-4 w-4 text-teya-green-dark"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx("h3", {
                className: "text-sm font-semibold text-foreground",
                children: "FINANCIALS"
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "space-y-2 text-xs",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "flex justify-between",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "flex items-center",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                    className: "text-muted-foreground",
                    children: "Free Cash Flow"
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx(MetricTooltip, {
                    content: "Cash left after capital expenditures. Shows real cash generating ability. Positive = good, growing = excellent"
                  })]
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
                  className: "font-medium",
                  children: ["$", (keyMetrics.freeCashFlow / 1e9).toFixed(1), "B"]
                })]
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "flex justify-between",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "flex items-center",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                    className: "text-muted-foreground",
                    children: "Total Cash"
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx(MetricTooltip, {
                    content: "Cash and cash equivalents on balance sheet. Higher = more financial flexibility and safety during tough times"
                  })]
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
                  className: "font-medium",
                  children: ["$", (keyMetrics.totalCash / 1e9).toFixed(1), "B"]
                })]
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "flex justify-between",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "flex items-center",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                    className: "text-muted-foreground",
                    children: "Debt/Equity"
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx(MetricTooltip, {
                    content: "Total debt divided by shareholder equity. Measures financial leverage. <0.5 = conservative, 0.5-1 = moderate, >2 = risky"
                  })]
                }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                  className: "font-medium",
                  children: "1.75"
                })]
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "flex justify-between",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "flex items-center",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                    className: "text-muted-foreground",
                    children: "Total Debt"
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx(MetricTooltip, {
                    content: "All company debt obligations. Compare to cash and earnings to assess ability to service debt"
                  })]
                }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                  className: "font-medium",
                  children: "$86.5B"
                })]
              })]
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "bg-secondary/10 rounded-lg p-4",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "flex items-center gap-2 mb-3",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, {
                className: "h-4 w-4 text-green-500"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx("h3", {
                className: "text-sm font-semibold text-foreground",
                children: "GROWTH"
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "space-y-2 text-xs",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "flex justify-between",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "flex items-center",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                    className: "text-muted-foreground",
                    children: "Revenue Growth"
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx(MetricTooltip, {
                    content: "Year-over-year revenue growth rate. Shows business expansion. >20% = high growth, 10-20% = moderate, <5% = slow"
                  })]
                }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                  className: "font-medium",
                  children: "8.2%"
                })]
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "flex justify-between",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "flex items-center",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                    className: "text-muted-foreground",
                    children: "EPS Growth"
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx(MetricTooltip, {
                    content: "Earnings per share growth rate. Shows profit growth per share. >15% = excellent, 5-15% = good, negative = declining"
                  })]
                }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                  className: "font-medium",
                  children: "11.1%"
                })]
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "flex justify-between",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "flex items-center",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                    className: "text-muted-foreground",
                    children: "Dividend Yield"
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx(MetricTooltip, {
                    content: "Annual dividends as percentage of stock price. Provides income to investors. 2-4% = reasonable, >6% = high (may be risky)"
                  })]
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
                  className: "font-medium",
                  children: [(keyMetrics.dividendYield * 100).toFixed(1), "%"]
                })]
              })]
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "bg-secondary/10 rounded-lg p-4",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "flex items-center gap-2 mb-3",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Clock, {
                className: "h-4 w-4 text-amber-500"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx("h3", {
                className: "text-sm font-semibold text-foreground",
                children: "TIMING"
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "space-y-2 text-xs",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "flex justify-between",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "flex items-center",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                    className: "text-muted-foreground",
                    children: "Next Earnings"
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx(MetricTooltip, {
                    content: "Date of next quarterly earnings announcement. Key catalyst that often moves stock price significantly"
                  })]
                }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                  className: "font-medium",
                  children: "Jul 30"
                })]
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "flex justify-between",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "flex items-center",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                    className: "text-muted-foreground",
                    children: "Days to Earnings"
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx(MetricTooltip, {
                    content: "Days until next earnings announcement. Stock often becomes more volatile as this date approaches"
                  })]
                }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                  className: "font-medium",
                  children: "23 days"
                })]
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "flex justify-between",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "flex items-center",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                    className: "text-muted-foreground",
                    children: "Dividend Date"
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx(MetricTooltip, {
                    content: "Ex-dividend date. Must own stock before this date to receive dividend payment"
                  })]
                }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                  className: "font-medium",
                  children: "Jul 12"
                })]
              })]
            })]
          })]
        })
      }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
        className: "border-t border-border/30 my-6",
        style: {
          marginTop: "1.5rem",
          marginBottom: "1.5rem"
        }
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "flex items-center justify-between bg-card/30 rounded-lg p-4",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "flex items-center gap-4",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h3", {
            className: "text-lg font-semibold",
            children: "Charts"
          }), isCustomized && /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
            className: "text-xs text-muted-foreground bg-teya-green/10 text-teya-green-dark px-2 py-1 rounded-md",
            children: "Custom Layout"
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
            className: "text-sm text-muted-foreground",
            children: [visibleCharts.length, " of ", charts.length, " visible"]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex items-center bg-secondary/20 rounded-lg p-1 ml-6",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
              variant: "ghost",
              size: "sm",
              onClick: () => setChartPeriod("quarterly"),
              className: `px-4 py-2 text-sm transition-all duration-300 ${chartPeriod === "quarterly" ? "bg-gradient-to-r from-teya-green via-teya-green-dark to-teya-green text-rich-black font-semibold shadow-sm shadow-teya-green/30" : "hover:bg-teya-green/10 hover:text-teya-green"}`,
              children: "Quarterly"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
              variant: "ghost",
              size: "sm",
              onClick: () => setChartPeriod("annual"),
              className: `px-4 py-2 text-sm transition-all duration-300 ${chartPeriod === "annual" ? "bg-gradient-to-r from-teya-green via-teya-green-dark to-teya-green text-rich-black font-semibold shadow-sm shadow-teya-green/30" : "hover:bg-teya-green/10 hover:text-teya-green"}`,
              children: "Annual"
            })]
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "flex items-center gap-2",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
            variant: "ghost",
            size: "sm",
            onClick: () => setIsDragMode(!isDragMode),
            className: `flex items-center gap-2 transition-all duration-300 ${isDragMode ? "bg-gradient-to-r from-teya-green via-teya-green-dark to-teya-green text-rich-black font-semibold shadow-sm shadow-teya-green/30" : "border border-teya-green/30 hover:border-teya-green hover:bg-teya-green/10 hover:text-teya-green"}`,
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Settings, {
              className: "h-4 w-4"
            }), isDragMode ? "Done" : "Customize"]
          }), isCustomized && /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
            variant: "ghost",
            size: "sm",
            onClick: resetLayout,
            className: "flex items-center gap-2 border border-teya-green/30 hover:border-teya-green hover:bg-teya-green/10 hover:text-teya-green transition-all duration-300",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(RotateCcw, {
              className: "h-4 w-4"
            }), "Reset"]
          }), isDragMode && /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
            variant: "outline",
            size: "sm",
            onClick: () => {
              charts.forEach((chart) => {
                if (!chart.visible) {
                  toggleChartVisibility(chart.id);
                }
              });
            },
            className: "flex items-center gap-2",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Eye, {
              className: "h-4 w-4"
            }), "Show All"]
          })]
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsx(DndContext, {
        sensors,
        collisionDetection: closestCenter,
        onDragEnd: handleDragEnd,
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(SortableContext, {
          items: charts.map((chart) => chart.id),
          strategy: rectSortingStrategy,
          children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: cn("grid gap-6 transition-all duration-200", isDragMode ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"),
            children: (isDragMode ? charts : visibleCharts).map((chart) => /* @__PURE__ */ jsxRuntimeExports.jsx(DraggableChart, {
              id: chart.id,
              name: chart.name,
              visible: chart.visible,
              onToggleVisibility: toggleChartVisibility,
              isDragMode,
              children: getChartComponent(chart.id)
            }, chart.id))
          })
        })
      })]
    })
  });
}
export {
  AdvancedCharts as default
};
