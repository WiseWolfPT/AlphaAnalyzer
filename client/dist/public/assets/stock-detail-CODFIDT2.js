var __typeError = (msg) => {
  throw TypeError(msg);
};
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);
var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);
var _client, _result, _queries, _options, _observers, _combinedResult, _lastCombine, _lastResult, _observerMatches, _QueriesObserver_instances, trackResult_fn, combineResult_fn, findMatchingObservers_fn, onUpdate_fn, notify_fn, _a;
import { x as Subscribable, y as notifyManager, z as replaceEqualDeep, D as useQueryClient, r as reactExports, E as noop, e as createLucideIcon, j as jsxRuntimeExports, C as Card, a as CardHeader, b as CardTitle, c as CardContent, F as clsx, n as TrendingUp, G as useToast, w as React, H as useParams, u as useLocation, B as Button, f as cn, T as TrendingDown } from "./index-DF734YkB.js";
import { M as MainLayout } from "./main-layout-iPfLAwEH.js";
import { S as StockHeaderV2 } from "./stock-header-v2-yGzpJaeX.js";
import { B as Badge } from "./badge-Bax4ZZX3.js";
import { N as Newspaper } from "./newspaper-pVO4VILD.js";
import { E as ExternalLink } from "./external-link-BNxepo82.js";
import { f as formatDistanceToNow } from "./formatDistanceToNow-Cp_4CwS9.js";
import { C as Calendar, T as Tabs, a as TabsList, b as TabsTrigger, c as TabsContent } from "./tabs-CPUG2mtF.js";
import { D as DollarSign } from "./dollar-sign-BDD_kA4E.js";
import { C as CartesianChart, R as ResponsiveContainer, a as CartesianGrid, X as XAxis, Y as YAxis } from "./CartesianChart-DjA-4J1-.js";
import { B as BarChart, u as useAlfaValue, A as AlfaValueHeader } from "./alfa-value-header-CLdKtMlR.js";
import { c as createSelector, s as selectChartLayout, a as selectAxisWithScale, b as selectTicksOfGraphicalItem, d as selectChartDataWithIndexesIfNotInPanorama, e as selectUnfilteredCartesianItems, i as isCategoricalAxis, g as getBandSizeOfAxis, C as CartesianGraphicalItemContext, S as SetLegendPayload, f as SetTooltipEntrySettings, h as getTooltipNameProp, r as resolveDefaultProps, u as useNeedsClip, j as usePlotArea, k as useChartLayout, l as useIsPanorama, m as useAppSelector, G as Global, n as isNullish, o as filterProps, p as isClipDot, L as Layer, q as GraphicalItemClipPath, t as SetErrorBarContext, v as getValueByDataKey, w as getCateCoordinateOfLine, x as useAnimationId, A as Animate, y as interpolateNumber, z as Curve, B as LabelList, D as uniqueId, E as arrayTooltipSearcher, T as Tooltip } from "./GraphicalItemClipPath-C5BaDaiW.js";
import { S as SetErrorBarPreferredDirection, B as Bar } from "./barSelectors-C4PIc_FS.js";
import { A as Activity } from "./activity-TJHkan0R.js";
import { A as ActivePoints, D as Dot } from "./ActivePoints-BIcFr9ho.js";
import { S as Skeleton } from "./skeleton-Cohz4q-x.js";
import { u as useRealtimeQuote } from "./use-realtime-quotes-C1iJFH8l.js";
import { Q as QueryObserver, u as useIsRestoring, a as useQueryErrorResetBoundary, e as ensureSuspenseTimers, b as ensurePreventErrorBoundaryRetry, c as useClearResetErrorBoundary, s as shouldSuspend, f as fetchOptimistic, w as willFetch, g as getHasError, d as useQuery } from "./useQuery-C9HFImIm.js";
import { a as apiConfig } from "./api-config-Zh6ttKls.js";
import { q as queryKeys, b as useCachedQuote } from "./use-cache-data-WpPFNsyq.js";
import { A as ArrowLeft } from "./arrow-left-D76waWDu.js";
import { W as Wifi } from "./wifi-Cr-Lls-T.js";
import { C as ChartColumn, a as Calculator } from "./chart-column-DNzw3S_G.js";
import { P as Plus } from "./plus-DmsdXgBw.js";
import { T as Target } from "./target-D9zmh0Nc.js";
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
import "./file-text-BCjG82i7.js";
import "./log-in-CA1V17qY.js";
import "./select-Bm8Ccf9j.js";
import "./index-IXOTxK3N.js";
import "./index-Dx7UitrF.js";
import "./chevron-down-BYhiF8im.js";
import "./scroll-area-BRs9U-pP.js";
import "./en-US-CFe7Dxf-.js";
import "./tooltip-BFWp8RjG.js";
import "./minus-CfWEs6ED.js";
function difference(array1, array2) {
  const excludeSet = new Set(array2);
  return array1.filter((x) => !excludeSet.has(x));
}
function replaceAt(array, index, value) {
  const copy = array.slice(0);
  copy[index] = value;
  return copy;
}
var QueriesObserver = (_a = class extends Subscribable {
  constructor(client, queries, options) {
    super();
    __privateAdd(this, _QueriesObserver_instances);
    __privateAdd(this, _client);
    __privateAdd(this, _result);
    __privateAdd(this, _queries);
    __privateAdd(this, _options);
    __privateAdd(this, _observers);
    __privateAdd(this, _combinedResult);
    __privateAdd(this, _lastCombine);
    __privateAdd(this, _lastResult);
    __privateAdd(this, _observerMatches, []);
    __privateSet(this, _client, client);
    __privateSet(this, _options, options);
    __privateSet(this, _queries, []);
    __privateSet(this, _observers, []);
    __privateSet(this, _result, []);
    this.setQueries(queries);
  }
  onSubscribe() {
    if (this.listeners.size === 1) {
      __privateGet(this, _observers).forEach((observer) => {
        observer.subscribe((result) => {
          __privateMethod(this, _QueriesObserver_instances, onUpdate_fn).call(this, observer, result);
        });
      });
    }
  }
  onUnsubscribe() {
    if (!this.listeners.size) {
      this.destroy();
    }
  }
  destroy() {
    this.listeners = /* @__PURE__ */ new Set();
    __privateGet(this, _observers).forEach((observer) => {
      observer.destroy();
    });
  }
  setQueries(queries, options) {
    __privateSet(this, _queries, queries);
    __privateSet(this, _options, options);
    notifyManager.batch(() => {
      const prevObservers = __privateGet(this, _observers);
      const newObserverMatches = __privateMethod(this, _QueriesObserver_instances, findMatchingObservers_fn).call(this, __privateGet(this, _queries));
      __privateSet(this, _observerMatches, newObserverMatches);
      newObserverMatches.forEach(
        (match) => match.observer.setOptions(match.defaultedQueryOptions)
      );
      const newObservers = newObserverMatches.map((match) => match.observer);
      const newResult = newObservers.map(
        (observer) => observer.getCurrentResult()
      );
      const hasIndexChange = newObservers.some(
        (observer, index) => observer !== prevObservers[index]
      );
      if (prevObservers.length === newObservers.length && !hasIndexChange) {
        return;
      }
      __privateSet(this, _observers, newObservers);
      __privateSet(this, _result, newResult);
      if (!this.hasListeners()) {
        return;
      }
      difference(prevObservers, newObservers).forEach((observer) => {
        observer.destroy();
      });
      difference(newObservers, prevObservers).forEach((observer) => {
        observer.subscribe((result) => {
          __privateMethod(this, _QueriesObserver_instances, onUpdate_fn).call(this, observer, result);
        });
      });
      __privateMethod(this, _QueriesObserver_instances, notify_fn).call(this);
    });
  }
  getCurrentResult() {
    return __privateGet(this, _result);
  }
  getQueries() {
    return __privateGet(this, _observers).map((observer) => observer.getCurrentQuery());
  }
  getObservers() {
    return __privateGet(this, _observers);
  }
  getOptimisticResult(queries, combine) {
    const matches = __privateMethod(this, _QueriesObserver_instances, findMatchingObservers_fn).call(this, queries);
    const result = matches.map(
      (match) => match.observer.getOptimisticResult(match.defaultedQueryOptions)
    );
    return [
      result,
      (r) => {
        return __privateMethod(this, _QueriesObserver_instances, combineResult_fn).call(this, r ?? result, combine);
      },
      () => {
        return __privateMethod(this, _QueriesObserver_instances, trackResult_fn).call(this, result, matches);
      }
    ];
  }
}, _client = new WeakMap(), _result = new WeakMap(), _queries = new WeakMap(), _options = new WeakMap(), _observers = new WeakMap(), _combinedResult = new WeakMap(), _lastCombine = new WeakMap(), _lastResult = new WeakMap(), _observerMatches = new WeakMap(), _QueriesObserver_instances = new WeakSet(), trackResult_fn = function(result, matches) {
  return matches.map((match, index) => {
    const observerResult = result[index];
    return !match.defaultedQueryOptions.notifyOnChangeProps ? match.observer.trackResult(observerResult, (accessedProp) => {
      matches.forEach((m) => {
        m.observer.trackProp(accessedProp);
      });
    }) : observerResult;
  });
}, combineResult_fn = function(input, combine) {
  if (combine) {
    if (!__privateGet(this, _combinedResult) || __privateGet(this, _result) !== __privateGet(this, _lastResult) || combine !== __privateGet(this, _lastCombine)) {
      __privateSet(this, _lastCombine, combine);
      __privateSet(this, _lastResult, __privateGet(this, _result));
      __privateSet(this, _combinedResult, replaceEqualDeep(
        __privateGet(this, _combinedResult),
        combine(input)
      ));
    }
    return __privateGet(this, _combinedResult);
  }
  return input;
}, findMatchingObservers_fn = function(queries) {
  const prevObserversMap = new Map(
    __privateGet(this, _observers).map((observer) => [observer.options.queryHash, observer])
  );
  const observers = [];
  queries.forEach((options) => {
    const defaultedOptions = __privateGet(this, _client).defaultQueryOptions(options);
    const match = prevObserversMap.get(defaultedOptions.queryHash);
    if (match) {
      observers.push({
        defaultedQueryOptions: defaultedOptions,
        observer: match
      });
    } else {
      observers.push({
        defaultedQueryOptions: defaultedOptions,
        observer: new QueryObserver(__privateGet(this, _client), defaultedOptions)
      });
    }
  });
  return observers;
}, onUpdate_fn = function(observer, result) {
  const index = __privateGet(this, _observers).indexOf(observer);
  if (index !== -1) {
    __privateSet(this, _result, replaceAt(__privateGet(this, _result), index, result));
    __privateMethod(this, _QueriesObserver_instances, notify_fn).call(this);
  }
}, notify_fn = function() {
  if (this.hasListeners()) {
    const previousResult = __privateGet(this, _combinedResult);
    const newTracked = __privateMethod(this, _QueriesObserver_instances, trackResult_fn).call(this, __privateGet(this, _result), __privateGet(this, _observerMatches));
    const newResult = __privateMethod(this, _QueriesObserver_instances, combineResult_fn).call(this, newTracked, __privateGet(this, _options)?.combine);
    if (previousResult !== newResult) {
      notifyManager.batch(() => {
        this.listeners.forEach((listener) => {
          listener(__privateGet(this, _result));
        });
      });
    }
  }
}, _a);
function useQueries({
  queries,
  ...options
}, queryClient) {
  const client = useQueryClient();
  const isRestoring = useIsRestoring();
  const errorResetBoundary = useQueryErrorResetBoundary();
  const defaultedQueries = reactExports.useMemo(
    () => queries.map((opts) => {
      const defaultedOptions = client.defaultQueryOptions(
        opts
      );
      defaultedOptions._optimisticResults = isRestoring ? "isRestoring" : "optimistic";
      return defaultedOptions;
    }),
    [queries, client, isRestoring]
  );
  defaultedQueries.forEach((query) => {
    ensureSuspenseTimers(query);
    ensurePreventErrorBoundaryRetry(query, errorResetBoundary);
  });
  useClearResetErrorBoundary(errorResetBoundary);
  const [observer] = reactExports.useState(
    () => new QueriesObserver(
      client,
      defaultedQueries,
      options
    )
  );
  const [optimisticResult, getCombinedResult, trackResult] = observer.getOptimisticResult(
    defaultedQueries,
    options.combine
  );
  const shouldSubscribe = !isRestoring && options.subscribed !== false;
  reactExports.useSyncExternalStore(
    reactExports.useCallback(
      (onStoreChange) => shouldSubscribe ? observer.subscribe(notifyManager.batchCalls(onStoreChange)) : noop,
      [observer, shouldSubscribe]
    ),
    () => observer.getCurrentResult(),
    () => observer.getCurrentResult()
  );
  reactExports.useEffect(() => {
    observer.setQueries(
      defaultedQueries,
      options
    );
  }, [defaultedQueries, options, observer]);
  const shouldAtLeastOneSuspend = optimisticResult.some(
    (result, index) => shouldSuspend(defaultedQueries[index], result)
  );
  const suspensePromises = shouldAtLeastOneSuspend ? optimisticResult.flatMap((result, index) => {
    const opts = defaultedQueries[index];
    if (opts) {
      const queryObserver = new QueryObserver(client, opts);
      if (shouldSuspend(opts, result)) {
        return fetchOptimistic(opts, queryObserver, errorResetBoundary);
      } else if (willFetch(result, isRestoring)) {
        void fetchOptimistic(opts, queryObserver, errorResetBoundary);
      }
    }
    return [];
  }) : [];
  if (suspensePromises.length > 0) {
    throw Promise.all(suspensePromises);
  }
  const firstSingleResultWhichShouldThrow = optimisticResult.find(
    (result, index) => {
      const query = defaultedQueries[index];
      return query && getHasError({
        result,
        errorResetBoundary,
        throwOnError: query.throwOnError,
        query: client.getQueryCache().get(query.queryHash),
        suspense: query.suspense
      });
    }
  );
  if (firstSingleResultWhichShouldThrow?.error) {
    throw firstSingleResultWhichShouldThrow.error;
  }
  return getCombinedResult(trackResult());
}
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const ChartLine = createLucideIcon("ChartLine", [
  ["path", { d: "M3 3v16a2 2 0 0 0 2 2h16", key: "c24i48" }],
  ["path", { d: "m19 9-5 5-4-4-3 3", key: "2osh9i" }]
]);
function RealtimeStockHeaderV2({
  symbol,
  company,
  isInWatchlist,
  onAddToWatchlist,
  onShare,
  realtimeQuote,
  isConnected
}) {
  const mergedCompany = realtimeQuote ? {
    ...company,
    price: realtimeQuote.price,
    change: realtimeQuote.change,
    changePercent: realtimeQuote.change_percent,
    // Keep after hours data from original as realtime doesn't provide it
    afterHoursPrice: company.afterHoursPrice,
    afterHoursChange: company.afterHoursChange,
    afterHoursChangePercent: company.afterHoursChangePercent
  } : company;
  const liveAnnouncement = realtimeQuote ? `Preco atualizado para ${symbol}: ${realtimeQuote.price.toFixed(2)} dolares.` : isConnected ? `Ligacao em tempo real ativa para ${symbol}.` : `Modo em tempo real inativo para ${symbol}.`;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
    className: "relative",
    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
      className: "sr-only",
      role: "status",
      "aria-live": "polite",
      children: liveAnnouncement
    }), isConnected && realtimeQuote && /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
      className: "absolute -top-2 -right-2",
      children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
        className: "inline-flex h-2 w-2 rounded-full bg-green-500 motion-safe:animate-pulse",
        title: "Dados em tempo real"
      })
    }), /* @__PURE__ */ jsxRuntimeExports.jsx(StockHeaderV2, {
      symbol,
      company: mergedCompany,
      isInWatchlist,
      onAddToWatchlist,
      onShare
    })]
  });
}
function StockNewsFeed({
  articles,
  isLoading
}) {
  if (isLoading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
      children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, {
          className: "flex items-center gap-2",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Newspaper, {
            className: "h-5 w-5 text-teya-green"
          }), "Latest News"]
        })
      }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
        children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
          className: "space-y-4",
          children: [1, 2, 3].map((i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "animate-pulse",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
              className: "h-4 bg-secondary rounded w-3/4 mb-2"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
              className: "h-3 bg-secondary rounded w-1/2"
            })]
          }, i))
        })
      })]
    });
  }
  if (!articles || articles.length === 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
      children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, {
          className: "flex items-center gap-2",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Newspaper, {
            className: "h-5 w-5 text-teya-green"
          }), "Latest News"]
        })
      }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
        children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
          className: "text-muted-foreground text-sm",
          children: "No recent news available."
        })
      })]
    });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
    children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, {
        className: "flex items-center gap-2",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Newspaper, {
          className: "h-5 w-5 text-teya-green"
        }), "Latest News"]
      })
    }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
      className: "space-y-4",
      children: articles.map((article, index) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
        className: "border-b last:border-0 pb-4 last:pb-0 hover:bg-secondary/20 transition-colors rounded-lg p-2 -m-2",
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs("a", {
          href: article.url,
          target: "_blank",
          rel: "noopener noreferrer",
          className: "block space-y-2",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex items-start justify-between gap-3",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h4", {
              className: "font-medium text-sm line-clamp-2 flex-1",
              children: article.title
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, {
              className: "h-4 w-4 text-muted-foreground flex-shrink-0"
            })]
          }), article.text && /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
            className: "text-xs text-muted-foreground line-clamp-2",
            children: article.text
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex items-center gap-3 text-xs",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Badge, {
              variant: "secondary",
              className: "text-xs",
              children: article.site
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
              className: "flex items-center gap-1 text-muted-foreground",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Calendar, {
                className: "h-3 w-3"
              }), formatDistanceToNow(new Date(article.publishedDate), {
                addSuffix: true
              })]
            })]
          })]
        })
      }, index))
    })]
  });
}
var selectXAxisWithScale = (state, xAxisId, _yAxisId, isPanorama) => selectAxisWithScale(state, "xAxis", xAxisId, isPanorama);
var selectXAxisTicks = (state, xAxisId, _yAxisId, isPanorama) => selectTicksOfGraphicalItem(state, "xAxis", xAxisId, isPanorama);
var selectYAxisWithScale = (state, _xAxisId, yAxisId, isPanorama) => selectAxisWithScale(state, "yAxis", yAxisId, isPanorama);
var selectYAxisTicks = (state, _xAxisId, yAxisId, isPanorama) => selectTicksOfGraphicalItem(state, "yAxis", yAxisId, isPanorama);
var selectBandSize = createSelector([selectChartLayout, selectXAxisWithScale, selectYAxisWithScale, selectXAxisTicks, selectYAxisTicks], (layout, xAxis, yAxis, xAxisTicks, yAxisTicks) => {
  if (isCategoricalAxis(layout, "xAxis")) {
    return getBandSizeOfAxis(xAxis, xAxisTicks, false);
  }
  return getBandSizeOfAxis(yAxis, yAxisTicks, false);
});
var pickLineSettings = (_state, _xAxisId, _yAxisId, _isPanorama, lineSettings) => lineSettings;
var selectSynchronisedLineSettings = createSelector([selectUnfilteredCartesianItems, pickLineSettings], (graphicalItems, lineSettingsFromProps) => {
  if (graphicalItems.some((cgis) => cgis.type === "line" && lineSettingsFromProps.dataKey === cgis.dataKey && lineSettingsFromProps.data === cgis.data)) {
    return lineSettingsFromProps;
  }
  return void 0;
});
var selectLinePoints = createSelector([selectChartLayout, selectXAxisWithScale, selectYAxisWithScale, selectXAxisTicks, selectYAxisTicks, selectSynchronisedLineSettings, selectBandSize, selectChartDataWithIndexesIfNotInPanorama], (layout, xAxis, yAxis, xAxisTicks, yAxisTicks, lineSettings, bandSize, _ref) => {
  var {
    chartData,
    dataStartIndex,
    dataEndIndex
  } = _ref;
  if (lineSettings == null || xAxis == null || yAxis == null || xAxisTicks == null || yAxisTicks == null || xAxisTicks.length === 0 || yAxisTicks.length === 0 || bandSize == null) {
    return void 0;
  }
  var {
    dataKey,
    data
  } = lineSettings;
  var displayedData;
  if (data != null && data.length > 0) {
    displayedData = data;
  } else {
    displayedData = chartData === null || chartData === void 0 ? void 0 : chartData.slice(dataStartIndex, dataEndIndex + 1);
  }
  if (displayedData == null) {
    return void 0;
  }
  return computeLinePoints({
    layout,
    xAxis,
    yAxis,
    xAxisTicks,
    yAxisTicks,
    dataKey,
    bandSize,
    displayedData
  });
});
var _excluded = ["type", "layout", "connectNulls", "needClip"], _excluded2 = ["activeDot", "animateNewValues", "animationBegin", "animationDuration", "animationEasing", "connectNulls", "dot", "hide", "isAnimationActive", "label", "legendType", "xAxisId", "yAxisId"];
function _objectWithoutProperties(e, t) {
  if (null == e) return {};
  var o, r, i = _objectWithoutPropertiesLoose(e, t);
  if (Object.getOwnPropertySymbols) {
    var n = Object.getOwnPropertySymbols(e);
    for (r = 0; r < n.length; r++) o = n[r], -1 === t.indexOf(o) && {}.propertyIsEnumerable.call(e, o) && (i[o] = e[o]);
  }
  return i;
}
function _objectWithoutPropertiesLoose(r, e) {
  if (null == r) return {};
  var t = {};
  for (var n in r) if ({}.hasOwnProperty.call(r, n)) {
    if (-1 !== e.indexOf(n)) continue;
    t[n] = r[n];
  }
  return t;
}
function ownKeys(e, r) {
  var t = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var o = Object.getOwnPropertySymbols(e);
    r && (o = o.filter(function(r2) {
      return Object.getOwnPropertyDescriptor(e, r2).enumerable;
    })), t.push.apply(t, o);
  }
  return t;
}
function _objectSpread(e) {
  for (var r = 1; r < arguments.length; r++) {
    var t = null != arguments[r] ? arguments[r] : {};
    r % 2 ? ownKeys(Object(t), true).forEach(function(r2) {
      _defineProperty(e, r2, t[r2]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function(r2) {
      Object.defineProperty(e, r2, Object.getOwnPropertyDescriptor(t, r2));
    });
  }
  return e;
}
function _defineProperty(e, r, t) {
  return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: true, configurable: true, writable: true }) : e[r] = t, e;
}
function _toPropertyKey(t) {
  var i = _toPrimitive(t, "string");
  return "symbol" == typeof i ? i : i + "";
}
function _toPrimitive(t, r) {
  if ("object" != typeof t || !t) return t;
  var e = t[Symbol.toPrimitive];
  if (void 0 !== e) {
    var i = e.call(t, r);
    if ("object" != typeof i) return i;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return ("string" === r ? String : Number)(t);
}
function _extends() {
  return _extends = Object.assign ? Object.assign.bind() : function(n) {
    for (var e = 1; e < arguments.length; e++) {
      var t = arguments[e];
      for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]);
    }
    return n;
  }, _extends.apply(null, arguments);
}
var computeLegendPayloadFromAreaData = (props) => {
  var {
    dataKey,
    name,
    stroke,
    legendType,
    hide
  } = props;
  return [{
    inactive: hide,
    dataKey,
    type: legendType,
    color: stroke,
    value: getTooltipNameProp(name, dataKey),
    payload: props
  }];
};
function getTooltipEntrySettings(props) {
  var {
    dataKey,
    data,
    stroke,
    strokeWidth,
    fill,
    name,
    hide,
    unit
  } = props;
  return {
    dataDefinedOnItem: data,
    positions: void 0,
    settings: {
      stroke,
      strokeWidth,
      fill,
      dataKey,
      nameKey: void 0,
      name: getTooltipNameProp(name, dataKey),
      hide,
      type: props.tooltipType,
      color: props.stroke,
      unit
    }
  };
}
var generateSimpleStrokeDasharray = (totalLength, length) => {
  return "".concat(length, "px ").concat(totalLength - length, "px");
};
function repeat(lines, count) {
  var linesUnit = lines.length % 2 !== 0 ? [...lines, 0] : lines;
  var result = [];
  for (var i = 0; i < count; ++i) {
    result = [...result, ...linesUnit];
  }
  return result;
}
var getStrokeDasharray = (length, totalLength, lines) => {
  var lineLength = lines.reduce((pre, next) => pre + next);
  if (!lineLength) {
    return generateSimpleStrokeDasharray(totalLength, length);
  }
  var count = Math.floor(length / lineLength);
  var remainLength = length % lineLength;
  var restLength = totalLength - length;
  var remainLines = [];
  for (var i = 0, sum = 0; i < lines.length; sum += lines[i], ++i) {
    if (sum + lines[i] > remainLength) {
      remainLines = [...lines.slice(0, i), remainLength - sum];
      break;
    }
  }
  var emptyLines = remainLines.length % 2 === 0 ? [0, restLength] : [restLength];
  return [...repeat(lines, count), ...remainLines, ...emptyLines].map((line) => "".concat(line, "px")).join(", ");
};
function renderDotItem(option, props) {
  var dotItem;
  if (/* @__PURE__ */ reactExports.isValidElement(option)) {
    dotItem = /* @__PURE__ */ reactExports.cloneElement(option, props);
  } else if (typeof option === "function") {
    dotItem = option(props);
  } else {
    var className = clsx("recharts-line-dot", typeof option !== "boolean" ? option.className : "");
    dotItem = /* @__PURE__ */ reactExports.createElement(Dot, _extends({}, props, {
      className
    }));
  }
  return dotItem;
}
function shouldRenderDots(points, dot) {
  if (points == null) {
    return false;
  }
  if (dot) {
    return true;
  }
  return points.length === 1;
}
function Dots(_ref) {
  var {
    clipPathId,
    points,
    props
  } = _ref;
  var {
    dot,
    dataKey,
    needClip
  } = props;
  if (!shouldRenderDots(points, dot)) {
    return null;
  }
  var clipDot = isClipDot(dot);
  var lineProps = filterProps(props, false);
  var customDotProps = filterProps(dot, true);
  var dots = points.map((entry, i) => {
    var dotProps = _objectSpread(_objectSpread(_objectSpread({
      key: "dot-".concat(i),
      r: 3
    }, lineProps), customDotProps), {}, {
      index: i,
      cx: entry.x,
      cy: entry.y,
      dataKey,
      value: entry.value,
      payload: entry.payload,
      points
    });
    return renderDotItem(dot, dotProps);
  });
  var dotsProps = {
    clipPath: needClip ? "url(#clipPath-".concat(clipDot ? "" : "dots-").concat(clipPathId, ")") : null
  };
  return /* @__PURE__ */ reactExports.createElement(Layer, _extends({
    className: "recharts-line-dots",
    key: "dots"
  }, dotsProps), dots);
}
function StaticCurve(_ref2) {
  var {
    clipPathId,
    pathRef,
    points,
    strokeDasharray,
    props,
    showLabels
  } = _ref2;
  var {
    type,
    layout,
    connectNulls,
    needClip
  } = props, others = _objectWithoutProperties(props, _excluded);
  var curveProps = _objectSpread(_objectSpread({}, filterProps(others, true)), {}, {
    fill: "none",
    className: "recharts-line-curve",
    clipPath: needClip ? "url(#clipPath-".concat(clipPathId, ")") : null,
    points,
    type,
    layout,
    connectNulls,
    strokeDasharray: strokeDasharray !== null && strokeDasharray !== void 0 ? strokeDasharray : props.strokeDasharray
  });
  return /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, (points === null || points === void 0 ? void 0 : points.length) > 1 && /* @__PURE__ */ reactExports.createElement(Curve, _extends({}, curveProps, {
    pathRef
  })), /* @__PURE__ */ reactExports.createElement(Dots, {
    points,
    clipPathId,
    props
  }), showLabels && LabelList.renderCallByParent(props, points));
}
function getTotalLength(mainCurve) {
  try {
    return mainCurve && mainCurve.getTotalLength && mainCurve.getTotalLength() || 0;
  } catch (_unused) {
    return 0;
  }
}
function CurveWithAnimation(_ref3) {
  var {
    clipPathId,
    props,
    pathRef,
    previousPointsRef,
    longestAnimatedLengthRef
  } = _ref3;
  var {
    points,
    strokeDasharray,
    isAnimationActive,
    animationBegin,
    animationDuration,
    animationEasing,
    animateNewValues,
    width,
    height,
    onAnimationEnd,
    onAnimationStart
  } = props;
  var prevPoints = previousPointsRef.current;
  var animationId = useAnimationId(props, "recharts-line-");
  var [isAnimating, setIsAnimating] = reactExports.useState(false);
  var handleAnimationEnd = reactExports.useCallback(() => {
    if (typeof onAnimationEnd === "function") {
      onAnimationEnd();
    }
    setIsAnimating(false);
  }, [onAnimationEnd]);
  var handleAnimationStart = reactExports.useCallback(() => {
    if (typeof onAnimationStart === "function") {
      onAnimationStart();
    }
    setIsAnimating(true);
  }, [onAnimationStart]);
  var totalLength = getTotalLength(pathRef.current);
  var startingPoint = longestAnimatedLengthRef.current;
  return /* @__PURE__ */ reactExports.createElement(Animate, {
    begin: animationBegin,
    duration: animationDuration,
    isActive: isAnimationActive,
    easing: animationEasing,
    from: {
      t: 0
    },
    to: {
      t: 1
    },
    onAnimationEnd: handleAnimationEnd,
    onAnimationStart: handleAnimationStart,
    key: animationId
  }, (_ref4) => {
    var {
      t
    } = _ref4;
    var interpolator = interpolateNumber(startingPoint, totalLength + startingPoint);
    var curLength = Math.min(interpolator(t), totalLength);
    var currentStrokeDasharray;
    if (strokeDasharray) {
      var lines = "".concat(strokeDasharray).split(/[,\s]+/gim).map((num) => parseFloat(num));
      currentStrokeDasharray = getStrokeDasharray(curLength, totalLength, lines);
    } else {
      currentStrokeDasharray = generateSimpleStrokeDasharray(totalLength, curLength);
    }
    if (prevPoints) {
      var prevPointsDiffFactor = prevPoints.length / points.length;
      var stepData = t === 1 ? points : points.map((entry, index) => {
        var prevPointIndex = Math.floor(index * prevPointsDiffFactor);
        if (prevPoints[prevPointIndex]) {
          var prev = prevPoints[prevPointIndex];
          var interpolatorX = interpolateNumber(prev.x, entry.x);
          var interpolatorY = interpolateNumber(prev.y, entry.y);
          return _objectSpread(_objectSpread({}, entry), {}, {
            x: interpolatorX(t),
            y: interpolatorY(t)
          });
        }
        if (animateNewValues) {
          var _interpolatorX = interpolateNumber(width * 2, entry.x);
          var _interpolatorY = interpolateNumber(height / 2, entry.y);
          return _objectSpread(_objectSpread({}, entry), {}, {
            x: _interpolatorX(t),
            y: _interpolatorY(t)
          });
        }
        return _objectSpread(_objectSpread({}, entry), {}, {
          x: entry.x,
          y: entry.y
        });
      });
      previousPointsRef.current = stepData;
      return /* @__PURE__ */ reactExports.createElement(StaticCurve, {
        props,
        points: stepData,
        clipPathId,
        pathRef,
        showLabels: !isAnimating,
        strokeDasharray: currentStrokeDasharray
      });
    }
    if (t > 0 && totalLength > 0) {
      previousPointsRef.current = points;
      longestAnimatedLengthRef.current = curLength;
    }
    return /* @__PURE__ */ reactExports.createElement(StaticCurve, {
      props,
      points,
      clipPathId,
      pathRef,
      showLabels: !isAnimating,
      strokeDasharray: currentStrokeDasharray
    });
  });
}
function RenderCurve(_ref5) {
  var {
    clipPathId,
    props
  } = _ref5;
  var {
    points,
    isAnimationActive
  } = props;
  var previousPointsRef = reactExports.useRef(null);
  var longestAnimatedLengthRef = reactExports.useRef(0);
  var pathRef = reactExports.useRef(null);
  var prevPoints = previousPointsRef.current;
  if (isAnimationActive && points && points.length && prevPoints !== points) {
    return /* @__PURE__ */ reactExports.createElement(CurveWithAnimation, {
      props,
      clipPathId,
      previousPointsRef,
      longestAnimatedLengthRef,
      pathRef
    });
  }
  return /* @__PURE__ */ reactExports.createElement(StaticCurve, {
    props,
    points,
    clipPathId,
    pathRef,
    showLabels: true
  });
}
var errorBarDataPointFormatter = (dataPoint, dataKey) => {
  return {
    x: dataPoint.x,
    y: dataPoint.y,
    value: dataPoint.value,
    // @ts-expect-error getValueByDataKey does not validate the output type
    errorVal: getValueByDataKey(dataPoint.payload, dataKey)
  };
};
class LineWithState extends reactExports.Component {
  constructor() {
    super(...arguments);
    _defineProperty(this, "id", uniqueId("recharts-line-"));
  }
  render() {
    var _filterProps;
    var {
      hide,
      dot,
      points,
      className,
      xAxisId,
      yAxisId,
      top,
      left,
      width,
      height,
      id,
      needClip,
      layout
    } = this.props;
    if (hide) {
      return null;
    }
    var layerClass = clsx("recharts-line", className);
    var clipPathId = isNullish(id) ? this.id : id;
    var {
      r = 3,
      strokeWidth = 2
    } = (_filterProps = filterProps(dot, false)) !== null && _filterProps !== void 0 ? _filterProps : {
      r: 3,
      strokeWidth: 2
    };
    var clipDot = isClipDot(dot);
    var dotSize = r * 2 + strokeWidth;
    return /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement(Layer, {
      className: layerClass
    }, needClip && /* @__PURE__ */ reactExports.createElement("defs", null, /* @__PURE__ */ reactExports.createElement(GraphicalItemClipPath, {
      clipPathId,
      xAxisId,
      yAxisId
    }), !clipDot && /* @__PURE__ */ reactExports.createElement("clipPath", {
      id: "clipPath-dots-".concat(clipPathId)
    }, /* @__PURE__ */ reactExports.createElement("rect", {
      x: left - dotSize / 2,
      y: top - dotSize / 2,
      width: width + dotSize,
      height: height + dotSize
    }))), /* @__PURE__ */ reactExports.createElement(RenderCurve, {
      props: this.props,
      clipPathId
    }), /* @__PURE__ */ reactExports.createElement(SetErrorBarPreferredDirection, {
      direction: layout === "horizontal" ? "y" : "x"
    }, /* @__PURE__ */ reactExports.createElement(SetErrorBarContext, {
      xAxisId,
      yAxisId,
      data: points,
      dataPointFormatter: errorBarDataPointFormatter,
      errorBarOffset: 0
    }, this.props.children))), /* @__PURE__ */ reactExports.createElement(ActivePoints, {
      activeDot: this.props.activeDot,
      points,
      mainColor: this.props.stroke,
      itemDataKey: this.props.dataKey
    }));
  }
}
var defaultLineProps = {
  activeDot: true,
  animateNewValues: true,
  animationBegin: 0,
  animationDuration: 1500,
  animationEasing: "ease",
  connectNulls: false,
  dot: true,
  fill: "#fff",
  hide: false,
  isAnimationActive: !Global.isSsr,
  label: false,
  legendType: "line",
  stroke: "#3182bd",
  strokeWidth: 1,
  xAxisId: 0,
  yAxisId: 0
};
function LineImpl(props) {
  var _resolveDefaultProps = resolveDefaultProps(props, defaultLineProps), {
    activeDot,
    animateNewValues,
    animationBegin,
    animationDuration,
    animationEasing,
    connectNulls,
    dot,
    hide,
    isAnimationActive,
    label,
    legendType,
    xAxisId,
    yAxisId
  } = _resolveDefaultProps, everythingElse = _objectWithoutProperties(_resolveDefaultProps, _excluded2);
  var {
    needClip
  } = useNeedsClip(xAxisId, yAxisId);
  var {
    height,
    width,
    x: left,
    y: top
  } = usePlotArea();
  var layout = useChartLayout();
  var isPanorama = useIsPanorama();
  var lineSettings = reactExports.useMemo(() => ({
    dataKey: props.dataKey,
    data: props.data
  }), [props.dataKey, props.data]);
  var points = useAppSelector((state) => selectLinePoints(state, xAxisId, yAxisId, isPanorama, lineSettings));
  if (layout !== "horizontal" && layout !== "vertical") {
    return null;
  }
  return /* @__PURE__ */ reactExports.createElement(LineWithState, _extends({}, everythingElse, {
    connectNulls,
    dot,
    activeDot,
    animateNewValues,
    animationBegin,
    animationDuration,
    animationEasing,
    isAnimationActive,
    hide,
    label,
    legendType,
    xAxisId,
    yAxisId,
    points,
    layout,
    height,
    width,
    left,
    top,
    needClip
  }));
}
function computeLinePoints(_ref6) {
  var {
    layout,
    xAxis,
    yAxis,
    xAxisTicks,
    yAxisTicks,
    dataKey,
    bandSize,
    displayedData
  } = _ref6;
  return displayedData.map((entry, index) => {
    var value = getValueByDataKey(entry, dataKey);
    if (layout === "horizontal") {
      return {
        x: getCateCoordinateOfLine({
          axis: xAxis,
          ticks: xAxisTicks,
          bandSize,
          entry,
          index
        }),
        y: isNullish(value) ? null : yAxis.scale(value),
        value,
        payload: entry
      };
    }
    return {
      x: isNullish(value) ? null : xAxis.scale(value),
      y: getCateCoordinateOfLine({
        axis: yAxis,
        ticks: yAxisTicks,
        bandSize,
        entry,
        index
      }),
      value,
      payload: entry
    };
  });
}
class Line extends reactExports.PureComponent {
  render() {
    return /* @__PURE__ */ reactExports.createElement(CartesianGraphicalItemContext, {
      type: "line",
      data: this.props.data,
      xAxisId: this.props.xAxisId,
      yAxisId: this.props.yAxisId,
      zAxisId: 0,
      dataKey: this.props.dataKey,
      stackId: void 0,
      hide: this.props.hide,
      barSize: void 0
    }, /* @__PURE__ */ reactExports.createElement(SetLegendPayload, {
      legendPayload: computeLegendPayloadFromAreaData(this.props)
    }), /* @__PURE__ */ reactExports.createElement(SetTooltipEntrySettings, {
      fn: getTooltipEntrySettings,
      args: this.props
    }), /* @__PURE__ */ reactExports.createElement(LineImpl, this.props));
  }
}
_defineProperty(Line, "displayName", "Line");
_defineProperty(Line, "defaultProps", defaultLineProps);
var allowedTooltipTypes = ["axis"];
var LineChart = /* @__PURE__ */ reactExports.forwardRef((props, ref) => {
  return /* @__PURE__ */ reactExports.createElement(CartesianChart, {
    chartName: "LineChart",
    defaultTooltipEventType: "axis",
    validateTooltipEventTypes: allowedTooltipTypes,
    tooltipPayloadSearcher: arrayTooltipSearcher,
    categoricalChartProps: props,
    ref
  });
});
function StockFinancialsChart({
  data,
  isLoading
}) {
  if (isLoading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
      className: "grid grid-cols-1 lg:grid-cols-2 gap-6",
      children: [1, 2, 3, 4].map((i) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
          children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "h-5 bg-secondary rounded w-32 animate-pulse"
          })
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
          children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "h-64 bg-secondary/20 rounded animate-pulse"
          })
        })]
      }, i))
    });
  }
  if (!data || data.length === 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Card, {
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
        className: "pt-6",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
          className: "text-muted-foreground text-center",
          children: "No financial data available."
        })
      })
    });
  }
  const chartData = [...data].reverse().map((item) => ({
    quarter: item.date.substring(0, 7),
    revenue: Math.round(item.revenue / 1e6),
    // Convert to millions
    netIncome: Math.round(item.netIncome / 1e6),
    ebitda: Math.round(item.ebitda / 1e6),
    eps: item.eps
  }));
  const revenueGrowth = data.length >= 2 ? ((data[0].revenue - data[1].revenue) / data[1].revenue * 100).toFixed(1) : 0;
  data.length >= 2 ? ((data[0].netIncome - data[1].netIncome) / data[1].netIncome * 100).toFixed(1) : 0;
  const profitMargin = data[0] ? (data[0].netIncome / data[0].revenue * 100).toFixed(1) : 0;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
    className: "grid grid-cols-1 lg:grid-cols-2 gap-6",
    children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
      children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, {
          className: "flex items-center gap-2",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(DollarSign, {
            className: "h-5 w-5 text-teya-green"
          }), "Revenue (Quarterly)"]
        })
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx(ResponsiveContainer, {
          width: "100%",
          height: 250,
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs(BarChart, {
            data: chartData,
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CartesianGrid, {
              strokeDasharray: "3 3",
              className: "opacity-30"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(XAxis, {
              dataKey: "quarter",
              tick: {
                fontSize: 12
              },
              angle: -45,
              textAnchor: "end",
              height: 60
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(YAxis, {
              tick: {
                fontSize: 12
              },
              label: {
                value: "Millions ($)",
                angle: -90,
                position: "insideLeft",
                style: {
                  fontSize: 12
                }
              }
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, {
              formatter: (value) => [`$${value}M`, "Revenue"],
              contentStyle: {
                backgroundColor: "rgba(0, 0, 0, 0.8)",
                border: "none"
              }
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(Bar, {
              dataKey: "revenue",
              fill: "#00DC82"
            })]
          })
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "mt-4 flex justify-between text-sm",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
            className: "text-muted-foreground",
            children: "YoY Growth"
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
            className: `font-bold ${Number(revenueGrowth) >= 0 ? "text-green-600" : "text-red-600"}`,
            children: [Number(revenueGrowth) >= 0 ? "+" : "", revenueGrowth, "%"]
          })]
        })]
      })]
    }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
      children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, {
          className: "flex items-center gap-2",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, {
            className: "h-5 w-5 text-blue-500"
          }), "Net Income (Quarterly)"]
        })
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx(ResponsiveContainer, {
          width: "100%",
          height: 250,
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs(BarChart, {
            data: chartData,
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CartesianGrid, {
              strokeDasharray: "3 3",
              className: "opacity-30"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(XAxis, {
              dataKey: "quarter",
              tick: {
                fontSize: 12
              },
              angle: -45,
              textAnchor: "end",
              height: 60
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(YAxis, {
              tick: {
                fontSize: 12
              },
              label: {
                value: "Millions ($)",
                angle: -90,
                position: "insideLeft",
                style: {
                  fontSize: 12
                }
              }
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, {
              formatter: (value) => [`$${value}M`, "Net Income"],
              contentStyle: {
                backgroundColor: "rgba(0, 0, 0, 0.8)",
                border: "none"
              }
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(Bar, {
              dataKey: "netIncome",
              fill: "#3B82F6"
            })]
          })
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "mt-4 flex justify-between text-sm",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
            className: "text-muted-foreground",
            children: "Profit Margin"
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
            className: "font-bold text-blue-600",
            children: [profitMargin, "%"]
          })]
        })]
      })]
    }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
      children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, {
          className: "flex items-center gap-2",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Activity, {
            className: "h-5 w-5 text-purple-500"
          }), "EBITDA (Quarterly)"]
        })
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx(ResponsiveContainer, {
          width: "100%",
          height: 250,
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs(BarChart, {
            data: chartData,
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CartesianGrid, {
              strokeDasharray: "3 3",
              className: "opacity-30"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(XAxis, {
              dataKey: "quarter",
              tick: {
                fontSize: 12
              },
              angle: -45,
              textAnchor: "end",
              height: 60
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(YAxis, {
              tick: {
                fontSize: 12
              },
              label: {
                value: "Millions ($)",
                angle: -90,
                position: "insideLeft",
                style: {
                  fontSize: 12
                }
              }
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, {
              formatter: (value) => [`$${value}M`, "EBITDA"],
              contentStyle: {
                backgroundColor: "rgba(0, 0, 0, 0.8)",
                border: "none"
              }
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(Bar, {
              dataKey: "ebitda",
              fill: "#A855F7"
            })]
          })
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "mt-4 flex justify-between text-sm",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
            className: "text-muted-foreground",
            children: "EBITDA Margin"
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
            className: "font-bold text-purple-600",
            children: [data[0] ? (data[0].ebitda / data[0].revenue * 100).toFixed(1) : 0, "%"]
          })]
        })]
      })]
    }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
      children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, {
          className: "flex items-center gap-2",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, {
            className: "h-5 w-5 text-orange-500"
          }), "Earnings Per Share (EPS)"]
        })
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx(ResponsiveContainer, {
          width: "100%",
          height: 250,
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs(LineChart, {
            data: chartData,
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CartesianGrid, {
              strokeDasharray: "3 3",
              className: "opacity-30"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(XAxis, {
              dataKey: "quarter",
              tick: {
                fontSize: 12
              },
              angle: -45,
              textAnchor: "end",
              height: 60
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(YAxis, {
              tick: {
                fontSize: 12
              },
              label: {
                value: "EPS ($)",
                angle: -90,
                position: "insideLeft",
                style: {
                  fontSize: 12
                }
              }
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, {
              formatter: (value) => [`$${value}`, "EPS"],
              contentStyle: {
                backgroundColor: "rgba(0, 0, 0, 0.8)",
                border: "none"
              }
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(Line, {
              type: "monotone",
              dataKey: "eps",
              stroke: "#FB923C",
              strokeWidth: 2,
              dot: {
                fill: "#FB923C",
                r: 4
              }
            })]
          })
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "mt-4 flex justify-between text-sm",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
            className: "text-muted-foreground",
            children: "Latest EPS"
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
            className: "font-bold text-orange-600",
            children: ["$", data[0]?.eps?.toFixed(2) || "0.00"]
          })]
        })]
      })]
    })]
  });
}
async function fetchCompanyProfile(symbol) {
  try {
    const baseUrl = apiConfig.getBaseUrl();
    const response = await fetch(`${baseUrl}/api/stocks/${symbol}/profile`);
    if (!response.ok) {
      console.error("Failed to fetch company profile:", response.statusText);
      return null;
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching company profile:", error);
    return null;
  }
}
async function fetchKeyMetrics(symbol) {
  try {
    const baseUrl = apiConfig.getBaseUrl();
    const response = await fetch(`${baseUrl}/api/stocks/${symbol}/metrics`);
    if (!response.ok) {
      console.error("Failed to fetch key metrics:", response.statusText);
      return null;
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching key metrics:", error);
    return null;
  }
}
function useCompanyProfile(symbol) {
  return useQuery({
    queryKey: ["company-profile", symbol],
    queryFn: () => fetchCompanyProfile(symbol),
    staleTime: 1e3 * 60 * 60,
    // 1 hour
    cacheTime: 1e3 * 60 * 60 * 24,
    // 24 hours
    enabled: true,
    retry: 2
  });
}
function useKeyMetrics(symbol) {
  return useQuery({
    queryKey: ["key-metrics", symbol],
    queryFn: () => fetchKeyMetrics(symbol),
    staleTime: 1e3 * 60 * 60,
    // 1 hour
    cacheTime: 1e3 * 60 * 60 * 24,
    // 24 hours
    enabled: true,
    retry: 2
  });
}
function useCompanyData(symbol) {
  const profileQuery = useCompanyProfile(symbol);
  const metricsQuery = useKeyMetrics(symbol);
  return {
    profile: profileQuery.data,
    metrics: metricsQuery.data,
    isLoading: profileQuery.isLoading || metricsQuery.isLoading,
    error: profileQuery.error || metricsQuery.error,
    refetch: () => {
      profileQuery.refetch();
      metricsQuery.refetch();
    }
  };
}
const getApiUrl = () => "";
function useExtendedHours(symbol) {
  return useQuery({
    queryKey: ["extended-hours", symbol],
    queryFn: async () => {
      const api = getApiUrl();
      const res = await fetch(`${api}/api/market-data/extended-hours/${encodeURIComponent(symbol)}`);
      if (!res.ok) throw new Error(`Extended hours fetch failed: ${res.status}`);
      return res.json();
    },
    staleTime: 3e4,
    refetchInterval: 3e4,
    retry: 2
  });
}
const buildAuthenticatedUrl = (path) => {
  const apiKey = "alfalyzer_demo_key_32_characters_minimum";
  const prefix = path.startsWith("/api") ? "" : "/api";
  const separator = path.includes("?") ? "&" : "?";
  return `${prefix}${path}${separator}api_key=${encodeURIComponent(apiKey)}`;
};
const fetchJson = async (path) => {
  try {
    const url = buildAuthenticatedUrl(path);
    const apiKey = "alfalyzer_demo_key_32_characters_minimum";
    const response = await fetch(url, {
      headers: {
        "X-API-Key": apiKey,
        "x-api-key": apiKey
      },
      credentials: "include"
    });
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.warn(`[StockQueries] Request failed for ${path}:`, error);
    return null;
  }
};
function useStockDetails(symbol) {
  const {
    toast
  } = useToast();
  const fundamentalsResult = useQueries({
    queries: [{
      queryKey: queryKeys.stockFundamentals(symbol),
      queryFn: async () => {
        return await fetchJson(`/cache/fundamentals/${symbol}`) || await fetchJson(`/market-data/fundamentals/${symbol}`) || await fetchJson(`/market-data/fmp/profile/${symbol}`);
      },
      staleTime: 2 * 60 * 60 * 1e3,
      // 2 hours - fundamentals update infrequently
      gcTime: 30 * 60 * 1e3,
      retry: 2,
      enabled: true
    }]
  });
  const fundamentalsQuery = fundamentalsResult[0];
  const hasFundamentals = !!fundamentalsQuery.data?.data;
  const queries = useQueries({
    queries: [
      // 1. Profile - ONLY fetch if fundamentals missing
      {
        queryKey: queryKeys.stockProfile(symbol),
        queryFn: async () => {
          return await fetchJson(`/market-data/profile/${symbol}`) || await fetchJson(`/market-data/fmp/profile/${symbol}`) || await fetchJson(`/stocks/${symbol}/profile`);
        },
        staleTime: 24 * 60 * 60 * 1e3,
        // 24 hours - company info rarely changes
        gcTime: 30 * 60 * 1e3,
        retry: 2,
        enabled: !hasFundamentals
        // ✅ CONDITIONAL: Only if fundamentals missing
      },
      // 2. Metrics - ONLY fetch if fundamentals missing
      {
        queryKey: queryKeys.stockMetrics(symbol),
        queryFn: async () => {
          return await fetchJson(`/market-data/key-metrics/${symbol}?period=quarter&limit=1`) || await fetchJson(`/market-data/fmp/key-metrics/${symbol}?period=quarter&limit=1`) || await fetchJson(`/stocks/${symbol}/metrics`);
        },
        staleTime: 60 * 60 * 1e3,
        // 1 hour
        gcTime: 30 * 60 * 1e3,
        retry: 2,
        enabled: !hasFundamentals
        // ✅ CONDITIONAL: Only if fundamentals missing
      },
      // 3. Income Statements - quarterly updates (2h cache)
      {
        queryKey: [...queryKeys.stock(symbol), "income-statements"],
        queryFn: async () => {
          const cached = await fetchJson(`/cache/financials/${symbol}`);
          if (cached?.data) return cached;
          return await fetchJson(`/market-data/income-statement/${symbol}?period=quarter&limit=8`) || await fetchJson(`/market-data/fmp/income-statement/${symbol}?period=quarter&limit=8`) || await fetchJson(`/stocks/${symbol}/financials?period=quarterly`);
        },
        staleTime: 2 * 60 * 60 * 1e3,
        // 2 hours - financials update quarterly
        gcTime: 30 * 60 * 1e3,
        retry: 2,
        enabled: true
      },
      // 4. News - frequently updated (5min cache)
      {
        queryKey: queryKeys.stockNews(symbol),
        queryFn: async () => {
          return await fetchJson(`/market-data/news/${symbol}?limit=5`) || {
            articles: []
          };
        },
        staleTime: 5 * 60 * 1e3,
        // 5 minutes - news updates frequently
        gcTime: 10 * 60 * 1e3,
        retry: 2,
        enabled: true
      },
      // 5. Historical Prices - moderate updates (30min cache)
      {
        queryKey: queryKeys.stockChart(symbol, {
          period: "1Y"
        }),
        queryFn: async () => {
          return await fetchJson(`/cache/historical/${symbol}/1y`) || await fetchJson(`/market-data/historical-price-full/${symbol}`) || null;
        },
        staleTime: 30 * 60 * 1e3,
        // 30 minutes
        gcTime: 30 * 60 * 1e3,
        retry: 2,
        enabled: true
      }
    ]
  });
  const [profileQuery, metricsQuery, financialsQuery, newsQuery, historicalQuery] = queries;
  const allQueries = [fundamentalsQuery, ...queries];
  const isLoading = allQueries.some((q) => q.isLoading);
  const isError = allQueries.some((q) => q.isError);
  const allFailed = allQueries.every((q) => q.isError);
  if (allFailed && !isLoading) {
    toast({
      title: "Partial data loaded",
      description: "Some stock details may be missing temporarily.",
      variant: "default"
    });
  }
  const fundamentalsRaw = fundamentalsQuery.data;
  const metricsRaw = metricsQuery.data;
  const financialsRaw = financialsQuery.data;
  const newsRaw = newsQuery.data;
  const historicalRaw = historicalQuery.data;
  let profile = profileQuery.data;
  if (fundamentalsRaw?.data && !profile) {
    const f = fundamentalsRaw.data;
    profile = {
      symbol,
      name: f.companyName || f.name || symbol,
      sector: f.sector || "",
      industry: f.industry || "",
      description: f.description || "",
      marketCap: f.marketCap ?? f.market_cap ?? 0,
      logo: f.image || f.logo || "",
      website: f.website,
      ceo: f.ceo,
      employees: f.fullTimeEmployees || f.employees,
      country: f.country,
      exchange: f.exchangeShortName || f.exchange,
      ipo: f.ipoDate || f.ipo
    };
  }
  let metrics = metricsRaw?.data?.[0] || metricsRaw?.data || metricsRaw;
  if (fundamentalsRaw?.data && !metrics) {
    const f = fundamentalsRaw.data;
    metrics = {
      peRatio: f.pe ?? f.peRatio ?? void 0,
      dividendYield: f.dividendYield ?? void 0,
      beta: f.beta ?? void 0,
      eps: f.eps ?? void 0,
      roe: f.roe ?? void 0,
      "52WeekLow": f.week52Low ?? f["52WeekLow"] ?? void 0,
      "52WeekHigh": f.week52High ?? f["52WeekHigh"] ?? void 0
    };
  }
  return {
    profile,
    metrics,
    incomeStatements: financialsRaw?.data || financialsRaw?.statements || financialsRaw?.income || [],
    news: newsRaw?.articles || newsRaw?.items || [],
    historicalPrices: historicalRaw?.data ? historicalRaw : historicalRaw || null,
    isLoading,
    error: isError ? "Failed to load some stock details" : null
  };
}
function ClientOnly({
  children,
  fallback = null
}) {
  const [isClient, setIsClient] = React.useState(false);
  React.useEffect(() => setIsClient(true), []);
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
    suppressHydrationWarning: true,
    children: isClient ? children : fallback
  });
}
const getCompanyData = (symbol) => {
  const companies = {
    "AAPL": {
      name: "Apple Inc.",
      sector: "Technology",
      industry: "Consumer Electronics",
      description: "Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide.",
      marketCap: "$2.7T",
      pe: "28.6",
      dividend: "0.96%",
      beta: "1.25",
      price: 203.92,
      change: 3.29,
      changePercent: 1.64,
      afterHoursPrice: 204.49,
      afterHoursChange: 0.57,
      afterHoursChangePercent: 0.28,
      volume: "52.3M",
      avgVolume: "48.1M",
      dayRange: "173.12 - 176.89",
      yearRange: "124.17 - 199.62",
      earningsDate: "Jul 30",
      logo: "https://logo.clearbit.com/apple.com"
    },
    "MSFT": {
      name: "Microsoft Corporation",
      sector: "Technology",
      industry: "Software",
      description: "Microsoft Corporation develops, licenses, and supports software, services, devices, and solutions worldwide.",
      marketCap: "$2.8T",
      pe: "35.2",
      dividend: "0.68%",
      beta: "0.89",
      price: 378.85,
      change: -1.23,
      changePercent: -0.32,
      afterHoursPrice: 379.15,
      afterHoursChange: 0.3,
      afterHoursChangePercent: 0.08,
      volume: "29.7M",
      avgVolume: "31.2M",
      dayRange: "377.45 - 380.21",
      yearRange: "309.45 - 427.33",
      earningsDate: "Oct 24",
      logo: "https://logo.clearbit.com/microsoft.com"
    }
  };
  return companies[symbol] || {
    name: `${symbol} Corporation`,
    sector: "Technology",
    industry: "Software",
    description: `${symbol} is a technology company operating in various segments.`,
    marketCap: "$150B",
    pe: "22.5",
    dividend: "1.2%",
    beta: "1.1",
    price: 150,
    change: 2.5,
    changePercent: 1.69,
    afterHoursPrice: 150.75,
    afterHoursChange: 0.75,
    afterHoursChangePercent: 0.5,
    volume: "25.0M",
    avgVolume: "28.5M",
    dayRange: "148.50 - 152.75",
    yearRange: "95.50 - 180.25",
    earningsDate: "TBD",
    logo: `https://logo.clearbit.com/${symbol.toLowerCase()}.com`
  };
};
function StockDetail() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const symbol = params.symbol?.toUpperCase() || "AAPL";
  const [isInWatchlist, setIsInWatchlist] = reactExports.useState(false);
  const [useRealtime, setUseRealtime] = reactExports.useState(true);
  const {
    quote: realtimeQuote,
    isConnected
  } = useRealtimeQuote(symbol, {
    enabled: useRealtime
  });
  const {
    profile,
    metrics
  } = useCompanyData(symbol);
  const {
    data: cachedQuote,
    isLoading: isLoadingQuote
  } = useCachedQuote(symbol);
  const {
    data: extendedHours
  } = useExtendedHours(symbol);
  reactExports.useEffect(() => {
    if (cachedQuote) {
      console.log("📊 Cached Quote Data:", cachedQuote);
      console.log("📊 Actual Price:", cachedQuote?.data?.price);
    }
  }, [cachedQuote]);
  const {
    profile: detailedProfile,
    metrics: detailedMetrics,
    incomeStatements,
    news,
    isLoading: isLoadingDetails
  } = useStockDetails(symbol);
  const {
    data: alfaValueData,
    isLoading: isLoadingAlfaValue
  } = useAlfaValue(symbol);
  const mockData = getCompanyData(symbol);
  const company = detailedProfile || profile ? {
    ...mockData,
    name: detailedProfile?.name || profile?.name || mockData.name,
    sector: detailedProfile?.sector || profile?.sector || mockData.sector,
    industry: detailedProfile?.industry || profile?.industry || mockData.industry,
    description: detailedProfile?.description || profile?.description || mockData.description,
    marketCap: detailedProfile?.marketCap ? `$${(detailedProfile.marketCap / 1e9).toFixed(1)}B` : profile?.marketCap ? `$${(profile.marketCap / 1e9).toFixed(1)}B` : mockData.marketCap,
    logo: detailedProfile?.logo || profile?.logo || mockData.logo,
    website: detailedProfile?.website || profile?.website,
    ceo: detailedProfile?.ceo || profile?.ceo,
    employees: detailedProfile?.employees || profile?.employees,
    country: detailedProfile?.country || profile?.country,
    exchange: detailedProfile?.exchange,
    ipo: detailedProfile?.ipo,
    // Use metrics if available
    pe: detailedMetrics?.peRatio?.toFixed(2) || metrics?.peRatio?.toFixed(2) || mockData.pe,
    dividend: detailedMetrics?.dividendYield ? `${(detailedMetrics.dividendYield * 100).toFixed(2)}%` : metrics?.dividendYield ? `${(metrics.dividendYield * 100).toFixed(2)}%` : mockData.dividend,
    beta: detailedMetrics?.beta?.toFixed(2) || metrics?.beta?.toFixed(2) || mockData.beta,
    eps: detailedMetrics?.eps?.toFixed(2) || metrics?.eps?.toFixed(2),
    roe: detailedMetrics?.roe ? `${(detailedMetrics.roe * 100).toFixed(2)}%` : metrics?.roe ? `${(metrics.roe * 100).toFixed(2)}%` : void 0,
    // Use cached quote for price data - NO MOCK FALLBACK
    price: cachedQuote?.data?.price || 0,
    change: cachedQuote?.data?.change || 0,
    changePercent: cachedQuote?.data?.changePercent || 0,
    volume: cachedQuote?.data?.volume ? `${(cachedQuote.data.volume / 1e6).toFixed(1)}M` : "0M",
    dayRange: cachedQuote?.data ? `${cachedQuote.data.low?.toFixed(2)} - ${cachedQuote.data.high?.toFixed(2)}` : "0.00 - 0.00",
    yearRange: detailedMetrics ? `${detailedMetrics["52WeekLow"]?.toFixed(2)} - ${detailedMetrics["52WeekHigh"]?.toFixed(2)}` : metrics ? `${metrics["52WeekLow"]?.toFixed(2)} - ${metrics["52WeekHigh"]?.toFixed(2)}` : mockData.yearRange
  } : mockData;
  const isPositive = company.change >= 0;
  alfaValueData?.iv ?? null;
  const latestPrice = Number(realtimeQuote?.price ?? company.price ?? 0);
  const valuationDiff = alfaValueData?.discount_pct ?? null;
  const isUndervalued = alfaValueData?.status === "undervalued";
  const baseIV = alfaValueData?.iv ?? null;
  const formatCurrency = (value) => new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value || 0);
  const handleAddToWatchlist = () => {
    setIsInWatchlist(!isInWatchlist);
  };
  const handleCalculateValue = () => {
    setLocation(`/intrinsic-value?symbol=${symbol}`);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(MainLayout, {
    children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
      className: "space-y-6",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "flex items-center justify-between",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
          variant: "ghost",
          size: "sm",
          onClick: () => setLocation("/stocks"),
          className: "gap-2 text-foreground hover:bg-secondary/60 border border-border/50",
          "aria-label": "Voltar à pesquisa de ações",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(ArrowLeft, {
            className: "w-4 h-4"
          }), "Voltar à pesquisa"]
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
        })]
      }), useRealtime ? /* @__PURE__ */ jsxRuntimeExports.jsx(RealtimeStockHeaderV2, {
        symbol,
        company,
        isInWatchlist,
        onAddToWatchlist: handleAddToWatchlist,
        realtimeQuote,
        isConnected,
        onShare: () => {
          if (navigator.share) {
            navigator.share({
              title: `${company.name} (${symbol})`,
              text: `Check out ${company.name} stock analysis on Alfalyzer`,
              url: window.location.href
            });
          } else {
            navigator.clipboard.writeText(window.location.href);
          }
        }
      }) : /* @__PURE__ */ jsxRuntimeExports.jsx(StockHeaderV2, {
        symbol,
        company,
        isInWatchlist,
        onAddToWatchlist: handleAddToWatchlist,
        onShare: () => {
          if (navigator.share) {
            navigator.share({
              title: `${company.name} (${symbol})`,
              text: `Check out ${company.name} stock analysis on Alfalyzer`,
              url: window.location.href
            });
          } else {
            navigator.clipboard.writeText(window.location.href);
          }
        }
      }), /* @__PURE__ */ jsxRuntimeExports.jsx(AlfaValueHeader, {
        ticker: symbol
      }), /* @__PURE__ */ jsxRuntimeExports.jsx(Card, {
        className: "border-teya-green/20",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
          className: "p-6",
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                className: "text-sm text-muted-foreground mb-1",
                children: "Current Price"
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
                className: "text-3xl font-bold",
                children: ["$", (realtimeQuote?.price || company.price || 0).toFixed(2)]
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
                className: cn("text-sm font-medium", (realtimeQuote ? realtimeQuote.change >= 0 : isPositive) ? "text-green-500" : "text-red-500"),
                children: [(realtimeQuote ? realtimeQuote.change >= 0 : isPositive) ? "+" : "", Math.abs(realtimeQuote?.change || company.change || 0).toFixed(2), "(", (realtimeQuote ? realtimeQuote.change >= 0 : isPositive) ? "+" : "", Math.abs(realtimeQuote?.change_percent || company.changePercent || 0).toFixed(2), "%)"]
              })]
            }), extendedHours && extendedHours.isExtendedHours && (extendedHours.afterHours || extendedHours.preMarket) && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "col-span-2 md:col-span-2 lg:col-span-2",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "flex items-center gap-2 mb-1",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                  className: "text-sm text-muted-foreground",
                  children: "Extended Hours"
                }), /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, {
                  variant: "outline",
                  children: extendedHours.currentSession === "pre-market" ? "Pre-Market" : extendedHours.currentSession === "after-hours" ? "After-Hours" : "Closed"
                })]
              }), (() => {
                const sess = extendedHours.currentSession === "pre-market" ? extendedHours.preMarket : extendedHours.afterHours || extendedHours.preMarket;
                if (!sess) return /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                  className: "text-sm text-muted-foreground",
                  children: "No extended trading data"
                });
                const pos = (sess.change || 0) >= 0;
                return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "flex items-baseline gap-3",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
                    className: "text-2xl font-bold",
                    children: ["$", (sess.price ?? 0).toFixed(2)]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
                    className: cn("text-sm font-medium", pos ? "text-green-500" : "text-red-500"),
                    children: [pos ? "+" : "", Math.abs(sess.change ?? 0).toFixed(2), " (", pos ? "+" : "", Math.abs(sess.changePercent ?? 0).toFixed(2), "%)"]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
                    className: "text-xs text-muted-foreground",
                    children: ["Vol: ", Intl.NumberFormat().format(sess.volume || 0)]
                  })]
                });
              })(), /* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
                className: "text-xs text-muted-foreground mt-1",
                children: ["Last update: ", extendedHours.afterHours?.timestamp || extendedHours.preMarket?.timestamp]
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                className: "text-sm text-muted-foreground mb-1",
                children: "Market Cap"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                className: "text-xl font-bold",
                children: company.marketCap
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                className: "text-sm text-muted-foreground mb-1",
                children: "P/E Ratio"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                className: "text-xl font-bold",
                children: company.pe
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                className: "text-sm text-muted-foreground mb-1",
                children: "Dividend Yield"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                className: "text-xl font-bold",
                children: company.dividend
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                className: "text-sm text-muted-foreground mb-1",
                children: "Volume"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                className: "text-xl font-bold",
                children: company.volume
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
                className: "text-xs text-muted-foreground",
                children: ["Avg: ", company.avgVolume]
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                className: "text-sm text-muted-foreground mb-1",
                children: "Beta"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                className: "text-xl font-bold",
                children: company.beta
              })]
            })]
          })
        })
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Tabs, {
        defaultValue: "overview",
        className: "space-y-6",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(TabsList, {
          className: "grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-6",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(TabsTrigger, {
            value: "overview",
            className: "flex items-center gap-2",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Activity, {
              className: "h-4 w-4"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
              className: "hidden sm:inline",
              children: "Overview"
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsTrigger, {
            value: "financials",
            className: "flex items-center gap-2",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(ChartColumn, {
              className: "h-4 w-4"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
              className: "hidden sm:inline",
              children: "Financials"
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsTrigger, {
            value: "valuation",
            className: "flex items-center gap-2",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Calculator, {
              className: "h-4 w-4"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
              className: "hidden sm:inline",
              children: "Valuation"
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsTrigger, {
            value: "news",
            className: "flex items-center gap-2",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Newspaper, {
              className: "h-4 w-4"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
              className: "hidden sm:inline",
              children: "News"
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsTrigger, {
            value: "compare",
            className: "flex items-center gap-2",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(ChartLine, {
              className: "h-4 w-4"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
              className: "hidden sm:inline",
              children: "Compare"
            })]
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, {
          value: "overview",
          className: "space-y-6",
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "grid grid-cols-1 lg:grid-cols-3 gap-6",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
              className: "lg:col-span-2",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
                children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, {
                  className: "flex items-center gap-2",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Calculator, {
                    className: "h-5 w-5 text-teya-green"
                  }), "Análise de Valor Intrínseco"]
                })
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(ClientOnly, {
                  fallback: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "bg-gradient-to-r from-teya-green/10 to-teya-green/5 border border-teya-green/20 rounded-lg p-6 space-y-4",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                      className: "h-6 w-40 bg-teya-green/20 rounded"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                      className: "h-5 w-24 bg-muted rounded"
                    })]
                  }),
                  children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "bg-gradient-to-r from-teya-green/10 to-teya-green/5 border border-teya-green/20 rounded-lg p-6 space-y-4",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                      className: "flex items-center justify-between",
                      children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                        children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h3", {
                          className: "text-2xl font-bold text-teya-green",
                          children: isLoadingAlfaValue ? /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, {
                            className: "h-8 w-32"
                          }) : baseIV ? formatCurrency(baseIV) : "N/A"
                        }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                          className: "text-sm text-muted-foreground",
                          children: "Valor Intrínseco (Oficial)"
                        })]
                      }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                        className: "text-right",
                        children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h3", {
                          className: "text-2xl font-bold",
                          children: formatCurrency(latestPrice)
                        }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                          className: "text-sm text-muted-foreground",
                          children: "Preço Atual"
                        })]
                      })]
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                      className: "flex items-center justify-between p-3 bg-background/60 rounded-lg",
                      children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                        className: "flex items-center gap-2",
                        children: isLoadingAlfaValue ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, {
                          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, {
                            className: "h-3 w-3 rounded-full"
                          }), /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, {
                            className: "h-6 w-32"
                          })]
                        }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, {
                          children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                            className: `w-3 h-3 rounded-full ${isUndervalued === null ? "bg-gray-400" : isUndervalued ? "bg-green-500" : "bg-red-500"}`
                          }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, {
                            className: `${isUndervalued ? "bg-green-500/10 text-green-700 border-green-200" : "bg-red-500/10 text-red-700 border-red-200"}`,
                            children: [isUndervalued ? /* @__PURE__ */ jsxRuntimeExports.jsx(TrendingDown, {
                              className: "h-3 w-3 mr-1"
                            }) : /* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, {
                              className: "h-3 w-3 mr-1"
                            }), isUndervalued === null ? "—" : isUndervalued ? "Subvalorizada" : "Sobrevalorizada"]
                          })]
                        })
                      }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                        className: "text-right",
                        children: isLoadingAlfaValue ? /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, {
                          className: "h-6 w-16 ml-auto"
                        }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, {
                          children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                            className: `text-lg font-bold ${valuationDiff !== null ? valuationDiff < 0 ? "text-green-600" : "text-red-600" : "text-muted-foreground"}`,
                            children: valuationDiff === null ? "—" : `${Math.abs(valuationDiff).toFixed(1)}%`
                          }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                            className: "text-xs text-muted-foreground",
                            children: "vs. Valor Intrínseco"
                          })]
                        })
                      })]
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                      className: "text-sm text-muted-foreground",
                      children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
                        className: "flex items-center gap-1",
                        children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Calculator, {
                          className: "h-3 w-3"
                        }), "Baseado em DCF com crescimento conservador e WACC estimado"]
                      })
                    })]
                  })
                })
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, {
                  children: "Resumo da Empresa"
                })
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
                className: "space-y-4",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                    className: "text-sm text-muted-foreground",
                    children: company.description
                  })
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "space-y-3",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex justify-between",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "text-sm text-muted-foreground",
                      children: "Setor"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "text-sm font-medium",
                      children: company.sector
                    })]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex justify-between",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "text-sm text-muted-foreground",
                      children: "Indústria"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "text-sm font-medium",
                      children: company.industry
                    })]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex justify-between",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "text-sm text-muted-foreground",
                      children: "Market Cap"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "text-sm font-medium",
                      children: company.marketCap
                    })]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex justify-between",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "text-sm text-muted-foreground",
                      children: "P/E Ratio"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "text-sm font-medium",
                      children: company.pe
                    })]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex justify-between",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "text-sm text-muted-foreground",
                      children: "Dividend"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "text-sm font-medium",
                      children: company.dividend
                    })]
                  })]
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
                  onClick: () => setLocation(`/compare?add=${symbol}`),
                  className: "w-full bg-teya-green hover:bg-teya-green/90 text-teya-dark",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx(ChartLine, {
                    className: "w-4 h-4 mr-2"
                  }), "Comparar com Outras"]
                })]
              })]
            })]
          })
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, {
          value: "financials",
          className: "space-y-6",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(StockFinancialsChart, {
            data: incomeStatements,
            isLoading: isLoadingDetails
          })
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, {
          value: "valuation",
          className: "space-y-6",
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "grid grid-cols-1 lg:grid-cols-2 gap-6",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
                children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, {
                  className: "flex items-center gap-2",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Calculator, {
                    className: "h-5 w-5 text-teya-green"
                  }), "Modelo DCF (Discounted Cash Flow)"]
                })
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
                className: "space-y-4",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "bg-teya-green/5 border border-teya-green/20 rounded-lg p-4",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "text-center mb-4",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h3", {
                      className: "text-3xl font-bold text-teya-green",
                      children: isLoadingAlfaValue ? /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, {
                        className: "h-9 w-40 mx-auto"
                      }) : baseIV ? formatCurrency(baseIV) : "N/A"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                      className: "text-sm text-muted-foreground",
                      children: "Valor Intrínseco (Oficial)"
                    })]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "space-y-3 text-sm",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                      className: "flex justify-between",
                      children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                        className: "text-muted-foreground",
                        children: "FCF Base (TTM)"
                      }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                        className: "font-medium",
                        children: "$78.5B"
                      })]
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                      className: "flex justify-between",
                      children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                        className: "text-muted-foreground",
                        children: "Taxa de Crescimento"
                      }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                        className: "font-medium text-green-600",
                        children: "8.0%"
                      })]
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                      className: "flex justify-between",
                      children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                        className: "text-muted-foreground",
                        children: "WACC"
                      }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                        className: "font-medium",
                        children: "10.5%"
                      })]
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                      className: "flex justify-between",
                      children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                        className: "text-muted-foreground",
                        children: "Terminal Growth"
                      }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                        className: "font-medium",
                        children: "2.5%"
                      })]
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                      className: "flex justify-between border-t pt-2",
                      children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                        className: "font-medium",
                        children: "Shares Outstanding"
                      }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                        className: "font-medium",
                        children: "15.5B"
                      })]
                    })]
                  })]
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
                  onClick: handleCalculateValue,
                  className: "w-full bg-teya-green hover:bg-teya-green/90 text-teya-dark",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Calculator, {
                    className: "w-4 h-4 mr-2"
                  }), "Recalcular com Parâmetros Personalizados"]
                })]
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
                children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, {
                  className: "flex items-center gap-2",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx(ChartColumn, {
                    className: "h-5 w-5 text-blue-500"
                  }), "Múltiplos de Valuation"]
                })
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
                className: "space-y-4",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "grid grid-cols-2 gap-4",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "text-center p-3 border rounded-lg",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                      className: "text-xs text-muted-foreground",
                      children: "P/E Ratio"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                      className: "text-lg font-bold",
                      children: company.pe
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                      className: "text-xs text-green-600",
                      children: "vs. 32.1 (setor)"
                    })]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "text-center p-3 border rounded-lg",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                      className: "text-xs text-muted-foreground",
                      children: "P/B Ratio"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                      className: "text-lg font-bold",
                      children: "8.2"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                      className: "text-xs text-red-600",
                      children: "vs. 3.8 (setor)"
                    })]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "text-center p-3 border rounded-lg",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                      className: "text-xs text-muted-foreground",
                      children: "EV/EBITDA"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                      className: "text-lg font-bold",
                      children: "22.4"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                      className: "text-xs text-green-600",
                      children: "vs. 28.5 (setor)"
                    })]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "text-center p-3 border rounded-lg",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                      className: "text-xs text-muted-foreground",
                      children: "PEG Ratio"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                      className: "text-lg font-bold",
                      children: "1.8"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                      className: "text-xs text-green-600",
                      children: "vs. 2.3 (setor)"
                    })]
                  })]
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h4", {
                    className: "font-medium text-blue-900 dark:text-blue-100 mb-2",
                    children: "Análise Comparativa"
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                    className: "text-sm text-blue-700 dark:text-blue-300",
                    children: "A empresa está negociando com múltiplos atrativos comparado ao setor, especialmente em P/E e EV/EBITDA, sugerindo uma oportunidade de valor."
                  })]
                })]
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
              className: "lg:col-span-2",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
                children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, {
                  className: "flex items-center gap-2",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Activity, {
                    className: "h-5 w-5 text-purple-500"
                  }), "Análise de Sensibilidade"]
                })
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
                children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "grid grid-cols-3 gap-4 mb-4",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "text-center",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h4", {
                      className: "font-medium mb-2",
                      children: "Cenário Conservador"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                      className: "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3",
                      children: [/* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                        className: "text-2xl font-bold text-red-600",
                        children: "N/A"
                      }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                        className: "text-sm text-muted-foreground",
                        children: "Crescimento: 5%"
                      }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                        className: "text-sm text-muted-foreground",
                        children: "WACC: 12%"
                      })]
                    })]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "text-center",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h4", {
                      className: "font-medium mb-2",
                      children: "Cenário Base"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                      className: "bg-teya-green/10 border border-teya-green/20 rounded-lg p-3",
                      children: [/* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                        className: "text-2xl font-bold text-teya-green",
                        children: baseIV ? formatCurrency(baseIV) : "N/A"
                      }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                        className: "text-sm text-muted-foreground",
                        children: "Crescimento: 8%"
                      }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                        className: "text-sm text-muted-foreground",
                        children: "WACC: 10.5%"
                      })]
                    })]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "text-center",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h4", {
                      className: "font-medium mb-2",
                      children: "Cenário Otimista"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                      className: "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3",
                      children: [/* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                        className: "text-2xl font-bold text-green-600",
                        children: "N/A"
                      }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                        className: "text-sm text-muted-foreground",
                        children: "Crescimento: 12%"
                      }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                        className: "text-sm text-muted-foreground",
                        children: "WACC: 9%"
                      })]
                    })]
                  })]
                }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                  className: "bg-gray-50 dark:bg-gray-900/20 border rounded-lg p-3",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
                    className: "text-sm text-muted-foreground",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("strong", {
                      children: "Preço Atual:"
                    }), " ", formatCurrency(latestPrice), " |", /* @__PURE__ */ jsxRuntimeExports.jsx("strong", {
                      children: " Range de Fair Value:"
                    }), " ", "—", " |", /* @__PURE__ */ jsxRuntimeExports.jsx("strong", {
                      children: " Margem de Segurança:"
                    }), " ", baseIV ? `${Math.max(0, (baseIV - latestPrice) / baseIV * 100).toFixed(0)}%` : "—"]
                  })
                })]
              })]
            })]
          })
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, {
          value: "news",
          className: "space-y-6",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "grid grid-cols-1 lg:grid-cols-2 gap-6",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
              className: "lg:col-span-2",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(StockNewsFeed, {
                articles: news,
                isLoading: isLoadingDetails
              })
            })
          })
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, {
          value: "compare",
          className: "space-y-6",
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "grid grid-cols-1 lg:grid-cols-2 gap-6",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
                children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, {
                  className: "flex items-center gap-2",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx(ChartLine, {
                    className: "h-5 w-5 text-teya-green"
                  }), "Comparação Rápida"]
                })
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
                className: "space-y-4",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
                  className: "text-sm text-muted-foreground",
                  children: ["Compare ", symbol, " com outras ações do mesmo setor ou com seus principais concorrentes."]
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "space-y-3",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
                    onClick: () => setLocation(`/compare?stocks=${symbol},MSFT,GOOGL,META`),
                    className: "w-full bg-teya-green hover:bg-teya-green/90 text-teya-dark justify-start",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx(ChartColumn, {
                      className: "w-4 h-4 mr-2"
                    }), "Comparar com Big Tech (MSFT, GOOGL, META)"]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
                    onClick: () => setLocation(`/compare?add=${symbol}`),
                    variant: "outline",
                    className: "w-full border-teya-green/30 hover:bg-teya-green/10 justify-start",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Plus, {
                      className: "w-4 h-4 mr-2"
                    }), "Adicionar a Nova Comparação"]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
                    onClick: () => setLocation(`/compare?stocks=${symbol},SPY,QQQ`),
                    variant: "outline",
                    className: "w-full border-blue-300 hover:bg-blue-50 justify-start",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, {
                      className: "w-4 h-4 mr-2"
                    }), "Comparar com Índices (SPY, QQQ)"]
                  })]
                })]
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
                children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, {
                  className: "flex items-center gap-2",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Target, {
                    className: "h-5 w-5 text-blue-500"
                  }), "Principais Concorrentes (", company.sector, ")"]
                })
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
                children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "space-y-3",
                  children: [[{
                    symbol: "MSFT",
                    name: "Microsoft Corp.",
                    pe: "35.2",
                    mc: "$2.8T",
                    change: "+0.8%"
                  }, {
                    symbol: "GOOGL",
                    name: "Alphabet Inc.",
                    pe: "26.1",
                    mc: "$1.7T",
                    change: "-0.3%"
                  }, {
                    symbol: "META",
                    name: "Meta Platforms",
                    pe: "24.8",
                    mc: "$800B",
                    change: "+1.2%"
                  }].map((competitor) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex items-center justify-between p-3 border rounded-lg hover:bg-secondary/50 cursor-pointer",
                    onClick: () => setLocation(`/stock/${competitor.symbol}`),
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                      className: "flex-1",
                      children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                        className: "font-medium",
                        children: competitor.symbol
                      }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                        className: "text-sm text-muted-foreground truncate",
                        children: competitor.name
                      })]
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                      className: "text-right text-sm",
                      children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                        children: ["P/E: ", competitor.pe]
                      }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                        className: cn("font-medium", competitor.change.startsWith("+") ? "text-green-600" : "text-red-600"),
                        children: competitor.change
                      })]
                    })]
                  }, competitor.symbol)), /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
                    onClick: () => setLocation(`/compare?stocks=${symbol},MSFT,GOOGL,META`),
                    variant: "outline",
                    className: "w-full border-teya-green/30 hover:bg-teya-green/10 mt-3",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx(ChartLine, {
                      className: "w-4 h-4 mr-2"
                    }), "Comparar Todos os Concorrentes"]
                  })]
                })
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
              className: "lg:col-span-2",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
                children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, {
                  className: "flex items-center gap-2",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Activity, {
                    className: "h-5 w-5 text-purple-500"
                  }), "Insights de Comparação"]
                })
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
                children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "grid grid-cols-1 md:grid-cols-3 gap-4",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                      className: "flex items-center gap-2 mb-2",
                      children: [/* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, {
                        className: "h-4 w-4 text-green-600"
                      }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                        className: "font-medium text-green-800 dark:text-green-200",
                        children: "Vantagem Competitiva"
                      })]
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
                      className: "text-sm text-green-700 dark:text-green-300",
                      children: [symbol, " tem melhor margem de lucro que 70% dos concorrentes do setor"]
                    })]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                      className: "flex items-center gap-2 mb-2",
                      children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Calculator, {
                        className: "h-4 w-4 text-blue-600"
                      }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                        className: "font-medium text-blue-800 dark:text-blue-200",
                        children: "Valuation"
                      })]
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                      className: "text-sm text-blue-700 dark:text-blue-300",
                      children: "P/E ratio 15% abaixo da média do setor, indicando possível subavaliação"
                    })]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                      className: "flex items-center gap-2 mb-2",
                      children: [/* @__PURE__ */ jsxRuntimeExports.jsx(ChartColumn, {
                        className: "h-4 w-4 text-purple-600"
                      }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                        className: "font-medium text-purple-800 dark:text-purple-200",
                        children: "Crescimento"
                      })]
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                      className: "text-sm text-purple-700 dark:text-purple-300",
                      children: "Taxa de crescimento de receita acima da média dos pares nos últimos 3 anos"
                    })]
                  })]
                })
              })]
            })]
          })
        })]
      })]
    })
  });
}
export {
  StockDetail as default
};
