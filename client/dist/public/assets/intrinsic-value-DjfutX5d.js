import { e as createLucideIcon, r as reactExports, F as clsx, a6 as reactDomExports, j as jsxRuntimeExports, C as Card, c as CardContent, o as Alert, v as CircleAlert, p as AlertDescription, a as CardHeader, b as CardTitle, d as CardDescription, L as Label$1, n as TrendingUp, B as Button, A as AnimatePresence, m as motion, M as Info, a7 as createPopperScope, a0 as useControllableState, a1 as createContextScope, a8 as Root2$1, a9 as Anchor, a3 as Primitive, a5 as composeEventHandlers, aa as Presence, a4 as useComposedRefs, ab as DismissableLayer, ac as Content, ad as Arrow, f as cn, T as TrendingDown, ae as formatNumber, G as useToast } from "./index-DF734YkB.js";
import { d as useQuery } from "./useQuery-C9HFImIm.js";
import { C as ChevronRight, M as MainLayout } from "./main-layout-iPfLAwEH.js";
import { S as Slider, U as UniversalSearch } from "./slider-CfurqznE.js";
import { B as Badge } from "./badge-Bax4ZZX3.js";
import { I as Input } from "./input-vX2xFcRS.js";
import { T as Tabs, a as TabsList, b as TabsTrigger, c as TabsContent } from "./tabs-CPUG2mtF.js";
import { P as Progress } from "./progress-BEgkdgaS.js";
import { ResponsiveContainer as ResponsiveContainer$1 } from "./lightweight-chart-CPbISesF.js";
import { u as useRealtimeQuote } from "./use-realtime-quotes-C1iJFH8l.js";
import { q as queryKeys, d as useCachedFundamentals, e as useCachedFinancials, b as useCachedQuote } from "./use-cache-data-WpPFNsyq.js";
import { a as Calculator, C as ChartColumn } from "./chart-column-DNzw3S_G.js";
import { A as Activity } from "./activity-TJHkan0R.js";
import { P as Percent } from "./percent-DjAI93Y2.js";
import { T as Target } from "./target-D9zmh0Nc.js";
import { S as Surface, u as useLegendPortal, b as addLine, r as removeLine, c as useClipPathId, d as createLabeledScales, e as rectWithCoords, f as updatePolarOptions, g as RechartsStoreProvider, h as ChartDataContextProvider, i as ReportMainChartProps, j as ReportChartProps, k as CategoricalChart, R as ResponsiveContainer, a as CartesianGrid, X as XAxis, Y as YAxis } from "./CartesianChart-DjA-4J1-.js";
import { A as AreaChart } from "./AreaChart-CRTYI7-_.js";
import { F as adaptEventsOfChild, m as useAppSelector, H as selectLegendPayload, I as isNumber, J as useMargin, K as useElementOffset, M as useChartWidth, N as useChartHeight, O as useAppDispatch, P as setLegendSettings, Q as setLegendSize, R as getUniqPayload, c as createSelector, U as pickAxisType, V as pickAxisId, W as itemAxisPredicate, X as selectBaseAxis, Y as combineGraphicalItemsSettings, Z as combineGraphicalItemsData, _ as selectChartDataAndAlwaysIgnoreIndexes, $ as combineDisplayedData, a0 as combineAppliedValues, v as getValueByDataKey, a1 as selectDomainDefinition, a2 as combineNumericalDomain, s as selectChartLayout, a3 as selectStackOffsetType, a4 as combineAxisDomain, a5 as selectRealScaleType, a6 as combineNiceTicks, a7 as combineAxisDomainWithNiceTicks, h as getTooltipNameProp, a8 as selectChartOffsetInternal, D as uniqueId, a9 as SetPolarGraphicalItem, o as filterProps, aa as findAllByType, ab as SetPolarLegendPayload, r as resolveDefaultProps, f as SetTooltipEntrySettings, G as Global, L as Layer, ac as mathSign, ad as polarToCartesian, ae as getMaxRadius, af as getPercentValue, x as useAnimationId, A as Animate, ag as get, y as interpolateNumber, ah as selectActiveTooltipIndex, ai as DATA_ITEM_DATAKEY_ATTRIBUTE_NAME, aj as DATA_ITEM_INDEX_ATTRIBUTE_NAME, z as Curve, ak as Text, l as useIsPanorama, al as selectXAxisSettings, am as selectYAxisSettings, an as selectAxisScale, ao as useViewBox, ap as Label, aq as isNan, ar as isNumOrStr, as as isPositiveNumber, E as arrayTooltipSearcher, T as Tooltip } from "./GraphicalItemClipPath-C5BaDaiW.js";
import { A as Area } from "./Area-DLKIhkx_.js";
import { B as BarChart, u as useAlfaValue, A as AlfaValueHeader } from "./alfa-value-header-CLdKtMlR.js";
import { a as Symbols, C as Cell, u as useMouseEnterItemDispatch, b as useMouseLeaveItemDispatch, c as useMouseClickItemDispatch, d as Shape, B as Bar } from "./barSelectors-C4PIc_FS.js";
import { S as Select, a as SelectTrigger, b as SelectValue, c as SelectContent, d as SelectItem, f as SelectGroup, g as SelectLabel } from "./select-Bm8Ccf9j.js";
import { M as Minus } from "./minus-CfWEs6ED.js";
import { C as Checkbox } from "./checkbox-OuCn5j1A.js";
import { S as Save } from "./save-DcJiyL9Y.js";
import { W as Wifi } from "./wifi-Cr-Lls-T.js";
import { A as ArrowUp, a as ArrowDown } from "./arrow-up-B4M5gJ8s.js";
import { D as DollarSign } from "./dollar-sign-BDD_kA4E.js";
import "./dialog-B0u0SV5P.js";
import "./index-DXvlFXpR.js";
import "./use-auth-monitoring-Ca9Wv08z.js";
import "./mail-D5HopcQP.js";
import "./lock-C5qTkNPd.js";
import "./eye-DQw-lb5A.js";
import "./user-C46AQImy.js";
import "./menu-CG6pfADK.js";
import "./search-CySG90ju.js";
import "./file-text-BCjG82i7.js";
import "./log-in-CA1V17qY.js";
import "./index-Dx7UitrF.js";
import "./scroll-area-BRs9U-pP.js";
import "./index-IXOTxK3N.js";
import "./clock-CEwJtTm9.js";
import "./sparkles-b_IcKR33.js";
import "./ActivePoints-BIcFr9ho.js";
import "./skeleton-Cohz4q-x.js";
import "./tooltip-BFWp8RjG.js";
import "./chevron-down-BYhiF8im.js";
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const FolderOpen = createLucideIcon("FolderOpen", [
  [
    "path",
    {
      d: "m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2",
      key: "usdka0"
    }
  ]
]);
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Gauge = createLucideIcon("Gauge", [
  ["path", { d: "m12 14 4-4", key: "9kzdfg" }],
  ["path", { d: "M3.34 19a10 10 0 1 1 17.32 0", key: "19p75a" }]
]);
function _extends$4() {
  return _extends$4 = Object.assign ? Object.assign.bind() : function(n) {
    for (var e = 1; e < arguments.length; e++) {
      var t = arguments[e];
      for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]);
    }
    return n;
  }, _extends$4.apply(null, arguments);
}
function ownKeys$4(e, r) {
  var t = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var o = Object.getOwnPropertySymbols(e);
    r && (o = o.filter(function(r2) {
      return Object.getOwnPropertyDescriptor(e, r2).enumerable;
    })), t.push.apply(t, o);
  }
  return t;
}
function _objectSpread$4(e) {
  for (var r = 1; r < arguments.length; r++) {
    var t = null != arguments[r] ? arguments[r] : {};
    r % 2 ? ownKeys$4(Object(t), true).forEach(function(r2) {
      _defineProperty$4(e, r2, t[r2]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys$4(Object(t)).forEach(function(r2) {
      Object.defineProperty(e, r2, Object.getOwnPropertyDescriptor(t, r2));
    });
  }
  return e;
}
function _defineProperty$4(e, r, t) {
  return (r = _toPropertyKey$4(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: true, configurable: true, writable: true }) : e[r] = t, e;
}
function _toPropertyKey$4(t) {
  var i = _toPrimitive$4(t, "string");
  return "symbol" == typeof i ? i : i + "";
}
function _toPrimitive$4(t, r) {
  if ("object" != typeof t || !t) return t;
  var e = t[Symbol.toPrimitive];
  if (void 0 !== e) {
    var i = e.call(t, r);
    if ("object" != typeof i) return i;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return ("string" === r ? String : Number)(t);
}
var SIZE = 32;
class DefaultLegendContent extends reactExports.PureComponent {
  /**
   * Render the path of icon
   * @param data Data of each legend item
   * @param iconType if defined, it will always render this icon. If undefined then it uses icon from data.type
   * @return Path element
   */
  renderIcon(data, iconType) {
    var {
      inactiveColor
    } = this.props;
    var halfSize = SIZE / 2;
    var sixthSize = SIZE / 6;
    var thirdSize = SIZE / 3;
    var color = data.inactive ? inactiveColor : data.color;
    var preferredIcon = iconType !== null && iconType !== void 0 ? iconType : data.type;
    if (preferredIcon === "none") {
      return null;
    }
    if (preferredIcon === "plainline") {
      return /* @__PURE__ */ reactExports.createElement("line", {
        strokeWidth: 4,
        fill: "none",
        stroke: color,
        strokeDasharray: data.payload.strokeDasharray,
        x1: 0,
        y1: halfSize,
        x2: SIZE,
        y2: halfSize,
        className: "recharts-legend-icon"
      });
    }
    if (preferredIcon === "line") {
      return /* @__PURE__ */ reactExports.createElement("path", {
        strokeWidth: 4,
        fill: "none",
        stroke: color,
        d: "M0,".concat(halfSize, "h").concat(thirdSize, "\n            A").concat(sixthSize, ",").concat(sixthSize, ",0,1,1,").concat(2 * thirdSize, ",").concat(halfSize, "\n            H").concat(SIZE, "M").concat(2 * thirdSize, ",").concat(halfSize, "\n            A").concat(sixthSize, ",").concat(sixthSize, ",0,1,1,").concat(thirdSize, ",").concat(halfSize),
        className: "recharts-legend-icon"
      });
    }
    if (preferredIcon === "rect") {
      return /* @__PURE__ */ reactExports.createElement("path", {
        stroke: "none",
        fill: color,
        d: "M0,".concat(SIZE / 8, "h").concat(SIZE, "v").concat(SIZE * 3 / 4, "h").concat(-SIZE, "z"),
        className: "recharts-legend-icon"
      });
    }
    if (/* @__PURE__ */ reactExports.isValidElement(data.legendIcon)) {
      var iconProps = _objectSpread$4({}, data);
      delete iconProps.legendIcon;
      return /* @__PURE__ */ reactExports.cloneElement(data.legendIcon, iconProps);
    }
    return /* @__PURE__ */ reactExports.createElement(Symbols, {
      fill: color,
      cx: halfSize,
      cy: halfSize,
      size: SIZE,
      sizeType: "diameter",
      type: preferredIcon
    });
  }
  /**
   * Draw items of legend
   * @return Items
   */
  renderItems() {
    var {
      payload,
      iconSize,
      layout,
      formatter,
      inactiveColor,
      iconType
    } = this.props;
    var viewBox = {
      x: 0,
      y: 0,
      width: SIZE,
      height: SIZE
    };
    var itemStyle = {
      display: layout === "horizontal" ? "inline-block" : "block",
      marginRight: 10
    };
    var svgStyle = {
      display: "inline-block",
      verticalAlign: "middle",
      marginRight: 4
    };
    return payload.map((entry, i) => {
      var finalFormatter = entry.formatter || formatter;
      var className = clsx({
        "recharts-legend-item": true,
        ["legend-item-".concat(i)]: true,
        inactive: entry.inactive
      });
      if (entry.type === "none") {
        return null;
      }
      var color = entry.inactive ? inactiveColor : entry.color;
      var finalValue = finalFormatter ? finalFormatter(entry.value, entry, i) : entry.value;
      return /* @__PURE__ */ reactExports.createElement("li", _extends$4({
        className,
        style: itemStyle,
        key: "legend-item-".concat(i)
      }, adaptEventsOfChild(this.props, entry, i)), /* @__PURE__ */ reactExports.createElement(Surface, {
        width: iconSize,
        height: iconSize,
        viewBox,
        style: svgStyle,
        "aria-label": "".concat(finalValue, " legend icon")
      }, this.renderIcon(entry, iconType)), /* @__PURE__ */ reactExports.createElement("span", {
        className: "recharts-legend-item-text",
        style: {
          color
        }
      }, finalValue));
    });
  }
  render() {
    var {
      payload,
      layout,
      align
    } = this.props;
    if (!payload || !payload.length) {
      return null;
    }
    var finalStyle = {
      padding: 0,
      margin: 0,
      textAlign: layout === "horizontal" ? align : "left"
    };
    return /* @__PURE__ */ reactExports.createElement("ul", {
      className: "recharts-default-legend",
      style: finalStyle
    }, this.renderItems());
  }
}
_defineProperty$4(DefaultLegendContent, "displayName", "Legend");
_defineProperty$4(DefaultLegendContent, "defaultProps", {
  align: "center",
  iconSize: 14,
  inactiveColor: "#ccc",
  layout: "horizontal",
  verticalAlign: "middle"
});
function useLegendPayload() {
  return useAppSelector(selectLegendPayload);
}
var _excluded$2 = ["contextPayload"];
function _extends$3() {
  return _extends$3 = Object.assign ? Object.assign.bind() : function(n) {
    for (var e = 1; e < arguments.length; e++) {
      var t = arguments[e];
      for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]);
    }
    return n;
  }, _extends$3.apply(null, arguments);
}
function ownKeys$3(e, r) {
  var t = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var o = Object.getOwnPropertySymbols(e);
    r && (o = o.filter(function(r2) {
      return Object.getOwnPropertyDescriptor(e, r2).enumerable;
    })), t.push.apply(t, o);
  }
  return t;
}
function _objectSpread$3(e) {
  for (var r = 1; r < arguments.length; r++) {
    var t = null != arguments[r] ? arguments[r] : {};
    r % 2 ? ownKeys$3(Object(t), true).forEach(function(r2) {
      _defineProperty$3(e, r2, t[r2]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys$3(Object(t)).forEach(function(r2) {
      Object.defineProperty(e, r2, Object.getOwnPropertyDescriptor(t, r2));
    });
  }
  return e;
}
function _defineProperty$3(e, r, t) {
  return (r = _toPropertyKey$3(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: true, configurable: true, writable: true }) : e[r] = t, e;
}
function _toPropertyKey$3(t) {
  var i = _toPrimitive$3(t, "string");
  return "symbol" == typeof i ? i : i + "";
}
function _toPrimitive$3(t, r) {
  if ("object" != typeof t || !t) return t;
  var e = t[Symbol.toPrimitive];
  if (void 0 !== e) {
    var i = e.call(t, r);
    if ("object" != typeof i) return i;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return ("string" === r ? String : Number)(t);
}
function _objectWithoutProperties$2(e, t) {
  if (null == e) return {};
  var o, r, i = _objectWithoutPropertiesLoose$2(e, t);
  if (Object.getOwnPropertySymbols) {
    var n = Object.getOwnPropertySymbols(e);
    for (r = 0; r < n.length; r++) o = n[r], -1 === t.indexOf(o) && {}.propertyIsEnumerable.call(e, o) && (i[o] = e[o]);
  }
  return i;
}
function _objectWithoutPropertiesLoose$2(r, e) {
  if (null == r) return {};
  var t = {};
  for (var n in r) if ({}.hasOwnProperty.call(r, n)) {
    if (-1 !== e.indexOf(n)) continue;
    t[n] = r[n];
  }
  return t;
}
function defaultUniqBy(entry) {
  return entry.value;
}
function LegendContent(props) {
  var {
    contextPayload
  } = props, otherProps = _objectWithoutProperties$2(props, _excluded$2);
  var finalPayload = getUniqPayload(contextPayload, props.payloadUniqBy, defaultUniqBy);
  var contentProps = _objectSpread$3(_objectSpread$3({}, otherProps), {}, {
    payload: finalPayload
  });
  if (/* @__PURE__ */ reactExports.isValidElement(props.content)) {
    return /* @__PURE__ */ reactExports.cloneElement(props.content, contentProps);
  }
  if (typeof props.content === "function") {
    return /* @__PURE__ */ reactExports.createElement(props.content, contentProps);
  }
  return /* @__PURE__ */ reactExports.createElement(DefaultLegendContent, contentProps);
}
function getDefaultPosition(style, props, margin, chartWidth, chartHeight, box) {
  var {
    layout,
    align,
    verticalAlign
  } = props;
  var hPos, vPos;
  if (!style || (style.left === void 0 || style.left === null) && (style.right === void 0 || style.right === null)) {
    if (align === "center" && layout === "vertical") {
      hPos = {
        left: ((chartWidth || 0) - box.width) / 2
      };
    } else {
      hPos = align === "right" ? {
        right: margin && margin.right || 0
      } : {
        left: margin && margin.left || 0
      };
    }
  }
  if (!style || (style.top === void 0 || style.top === null) && (style.bottom === void 0 || style.bottom === null)) {
    if (verticalAlign === "middle") {
      vPos = {
        top: ((chartHeight || 0) - box.height) / 2
      };
    } else {
      vPos = verticalAlign === "bottom" ? {
        bottom: margin && margin.bottom || 0
      } : {
        top: margin && margin.top || 0
      };
    }
  }
  return _objectSpread$3(_objectSpread$3({}, hPos), vPos);
}
function LegendSettingsDispatcher(props) {
  var dispatch = useAppDispatch();
  reactExports.useEffect(() => {
    dispatch(setLegendSettings(props));
  }, [dispatch, props]);
  return null;
}
function LegendSizeDispatcher(props) {
  var dispatch = useAppDispatch();
  reactExports.useEffect(() => {
    dispatch(setLegendSize(props));
    return () => {
      dispatch(setLegendSize({
        width: 0,
        height: 0
      }));
    };
  }, [dispatch, props]);
  return null;
}
function LegendWrapper(props) {
  var contextPayload = useLegendPayload();
  var legendPortalFromContext = useLegendPortal();
  var margin = useMargin();
  var {
    width: widthFromProps,
    height: heightFromProps,
    wrapperStyle,
    portal: portalFromProps
  } = props;
  var [lastBoundingBox, updateBoundingBox] = useElementOffset([contextPayload]);
  var chartWidth = useChartWidth();
  var chartHeight = useChartHeight();
  var maxWidth = chartWidth - (margin.left || 0) - (margin.right || 0);
  var widthOrHeight = Legend.getWidthOrHeight(props.layout, heightFromProps, widthFromProps, maxWidth);
  var outerStyle = portalFromProps ? wrapperStyle : _objectSpread$3(_objectSpread$3({
    position: "absolute",
    width: (widthOrHeight === null || widthOrHeight === void 0 ? void 0 : widthOrHeight.width) || widthFromProps || "auto",
    height: (widthOrHeight === null || widthOrHeight === void 0 ? void 0 : widthOrHeight.height) || heightFromProps || "auto"
  }, getDefaultPosition(wrapperStyle, props, margin, chartWidth, chartHeight, lastBoundingBox)), wrapperStyle);
  var legendPortal = portalFromProps !== null && portalFromProps !== void 0 ? portalFromProps : legendPortalFromContext;
  if (legendPortal == null) {
    return null;
  }
  var legendElement = /* @__PURE__ */ reactExports.createElement("div", {
    className: "recharts-legend-wrapper",
    style: outerStyle,
    ref: updateBoundingBox
  }, /* @__PURE__ */ reactExports.createElement(LegendSettingsDispatcher, {
    layout: props.layout,
    align: props.align,
    verticalAlign: props.verticalAlign,
    itemSorter: props.itemSorter
  }), /* @__PURE__ */ reactExports.createElement(LegendSizeDispatcher, {
    width: lastBoundingBox.width,
    height: lastBoundingBox.height
  }), /* @__PURE__ */ reactExports.createElement(LegendContent, _extends$3({}, props, widthOrHeight, {
    margin,
    chartWidth,
    chartHeight,
    contextPayload
  })));
  return /* @__PURE__ */ reactDomExports.createPortal(legendElement, legendPortal);
}
class Legend extends reactExports.PureComponent {
  static getWidthOrHeight(layout, height, width, maxWidth) {
    if (layout === "vertical" && isNumber(height)) {
      return {
        height
      };
    }
    if (layout === "horizontal") {
      return {
        width: width || maxWidth
      };
    }
    return null;
  }
  render() {
    return /* @__PURE__ */ reactExports.createElement(LegendWrapper, this.props);
  }
}
_defineProperty$3(Legend, "displayName", "Legend");
_defineProperty$3(Legend, "defaultProps", {
  align: "center",
  iconSize: 14,
  itemSorter: "value",
  layout: "horizontal",
  verticalAlign: "bottom"
});
var selectUnfilteredPolarItems = (state) => state.graphicalItems.polarItems;
var selectAxisPredicate = createSelector([pickAxisType, pickAxisId], itemAxisPredicate);
var selectPolarItemsSettings = createSelector([selectUnfilteredPolarItems, selectBaseAxis, selectAxisPredicate], combineGraphicalItemsSettings);
var selectPolarGraphicalItemsData = createSelector([selectPolarItemsSettings], combineGraphicalItemsData);
var selectPolarDisplayedData = createSelector([selectPolarGraphicalItemsData, selectChartDataAndAlwaysIgnoreIndexes], combineDisplayedData);
var selectPolarAppliedValues = createSelector([selectPolarDisplayedData, selectBaseAxis, selectPolarItemsSettings], combineAppliedValues);
var selectAllPolarAppliedNumericalValues = createSelector([selectPolarDisplayedData, selectBaseAxis, selectPolarItemsSettings], (data, axisSettings, items) => {
  if (items.length > 0) {
    return data.flatMap((entry) => {
      return items.flatMap((item) => {
        var _axisSettings$dataKey;
        var valueByDataKey = getValueByDataKey(entry, (_axisSettings$dataKey = axisSettings.dataKey) !== null && _axisSettings$dataKey !== void 0 ? _axisSettings$dataKey : item.dataKey);
        return {
          value: valueByDataKey,
          errorDomain: []
          // polar charts do not have error bars
        };
      });
    }).filter(Boolean);
  }
  if ((axisSettings === null || axisSettings === void 0 ? void 0 : axisSettings.dataKey) != null) {
    return data.map((item) => ({
      value: getValueByDataKey(item, axisSettings.dataKey),
      errorDomain: []
    }));
  }
  return data.map((entry) => ({
    value: entry,
    errorDomain: []
  }));
});
var unsupportedInPolarChart = () => void 0;
var selectPolarNumericalDomain = createSelector([selectBaseAxis, selectDomainDefinition, unsupportedInPolarChart, selectAllPolarAppliedNumericalValues, unsupportedInPolarChart], combineNumericalDomain);
var selectPolarAxisDomain = createSelector([selectBaseAxis, selectChartLayout, selectPolarDisplayedData, selectPolarAppliedValues, selectStackOffsetType, pickAxisType, selectPolarNumericalDomain], combineAxisDomain);
var selectPolarNiceTicks = createSelector([selectPolarAxisDomain, selectBaseAxis, selectRealScaleType], combineNiceTicks);
createSelector([selectBaseAxis, selectPolarAxisDomain, selectPolarNiceTicks, pickAxisType], combineAxisDomainWithNiceTicks);
function ownKeys$2(e, r) {
  var t = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var o = Object.getOwnPropertySymbols(e);
    r && (o = o.filter(function(r2) {
      return Object.getOwnPropertyDescriptor(e, r2).enumerable;
    })), t.push.apply(t, o);
  }
  return t;
}
function _objectSpread$2(e) {
  for (var r = 1; r < arguments.length; r++) {
    var t = null != arguments[r] ? arguments[r] : {};
    r % 2 ? ownKeys$2(Object(t), true).forEach(function(r2) {
      _defineProperty$2(e, r2, t[r2]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys$2(Object(t)).forEach(function(r2) {
      Object.defineProperty(e, r2, Object.getOwnPropertyDescriptor(t, r2));
    });
  }
  return e;
}
function _defineProperty$2(e, r, t) {
  return (r = _toPropertyKey$2(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: true, configurable: true, writable: true }) : e[r] = t, e;
}
function _toPropertyKey$2(t) {
  var i = _toPrimitive$2(t, "string");
  return "symbol" == typeof i ? i : i + "";
}
function _toPrimitive$2(t, r) {
  if ("object" != typeof t || !t) return t;
  var e = t[Symbol.toPrimitive];
  if (void 0 !== e) {
    var i = e.call(t, r);
    if ("object" != typeof i) return i;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return ("string" === r ? String : Number)(t);
}
var pickPieSettings = (_state, pieSettings) => pieSettings;
var emptyArray = [];
var pickCells = (_state, _pieSettings, cells) => {
  if ((cells === null || cells === void 0 ? void 0 : cells.length) === 0) {
    return emptyArray;
  }
  return cells;
};
var selectDisplayedData = createSelector([selectChartDataAndAlwaysIgnoreIndexes, pickPieSettings, pickCells], (_ref, pieSettings, cells) => {
  var {
    chartData
  } = _ref;
  var displayedData;
  if ((pieSettings === null || pieSettings === void 0 ? void 0 : pieSettings.data) != null && pieSettings.data.length > 0) {
    displayedData = pieSettings.data;
  } else {
    displayedData = chartData;
  }
  if ((!displayedData || !displayedData.length) && cells != null) {
    displayedData = cells.map((cell) => _objectSpread$2(_objectSpread$2({}, pieSettings.presentationProps), cell.props));
  }
  if (displayedData == null) {
    return void 0;
  }
  return displayedData;
});
var selectPieLegend = createSelector([selectDisplayedData, pickPieSettings, pickCells], (displayedData, pieSettings, cells) => {
  if (displayedData == null) {
    return void 0;
  }
  return displayedData.map((entry, i) => {
    var _cells$i;
    var name = getValueByDataKey(entry, pieSettings.nameKey, pieSettings.name);
    var color;
    if (cells !== null && cells !== void 0 && (_cells$i = cells[i]) !== null && _cells$i !== void 0 && (_cells$i = _cells$i.props) !== null && _cells$i !== void 0 && _cells$i.fill) {
      color = cells[i].props.fill;
    } else if (typeof entry === "object" && entry != null && "fill" in entry) {
      color = entry.fill;
    } else {
      color = pieSettings.fill;
    }
    return {
      value: getTooltipNameProp(name, pieSettings.dataKey),
      color,
      payload: entry,
      type: pieSettings.legendType
    };
  });
});
var selectSynchronisedPieSettings = createSelector([selectUnfilteredPolarItems, pickPieSettings], (graphicalItems, pieSettingsFromProps) => {
  if (graphicalItems.some((pgis) => pgis.type === "pie" && pieSettingsFromProps.dataKey === pgis.dataKey && pieSettingsFromProps.data === pgis.data)) {
    return pieSettingsFromProps;
  }
  return void 0;
});
var selectPieSectors = createSelector([selectDisplayedData, selectSynchronisedPieSettings, pickCells, selectChartOffsetInternal], (displayedData, pieSettings, cells, offset) => {
  if (pieSettings == null || displayedData == null) {
    return void 0;
  }
  return computePieSectors({
    offset,
    pieSettings,
    displayedData,
    cells
  });
});
var _excluded$1 = ["onMouseEnter", "onClick", "onMouseLeave"];
function _objectWithoutProperties$1(e, t) {
  if (null == e) return {};
  var o, r, i = _objectWithoutPropertiesLoose$1(e, t);
  if (Object.getOwnPropertySymbols) {
    var n = Object.getOwnPropertySymbols(e);
    for (r = 0; r < n.length; r++) o = n[r], -1 === t.indexOf(o) && {}.propertyIsEnumerable.call(e, o) && (i[o] = e[o]);
  }
  return i;
}
function _objectWithoutPropertiesLoose$1(r, e) {
  if (null == r) return {};
  var t = {};
  for (var n in r) if ({}.hasOwnProperty.call(r, n)) {
    if (-1 !== e.indexOf(n)) continue;
    t[n] = r[n];
  }
  return t;
}
function ownKeys$1(e, r) {
  var t = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var o = Object.getOwnPropertySymbols(e);
    r && (o = o.filter(function(r2) {
      return Object.getOwnPropertyDescriptor(e, r2).enumerable;
    })), t.push.apply(t, o);
  }
  return t;
}
function _objectSpread$1(e) {
  for (var r = 1; r < arguments.length; r++) {
    var t = null != arguments[r] ? arguments[r] : {};
    r % 2 ? ownKeys$1(Object(t), true).forEach(function(r2) {
      _defineProperty$1(e, r2, t[r2]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys$1(Object(t)).forEach(function(r2) {
      Object.defineProperty(e, r2, Object.getOwnPropertyDescriptor(t, r2));
    });
  }
  return e;
}
function _defineProperty$1(e, r, t) {
  return (r = _toPropertyKey$1(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: true, configurable: true, writable: true }) : e[r] = t, e;
}
function _toPropertyKey$1(t) {
  var i = _toPrimitive$1(t, "string");
  return "symbol" == typeof i ? i : i + "";
}
function _toPrimitive$1(t, r) {
  if ("object" != typeof t || !t) return t;
  var e = t[Symbol.toPrimitive];
  if (void 0 !== e) {
    var i = e.call(t, r);
    if ("object" != typeof i) return i;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return ("string" === r ? String : Number)(t);
}
function _extends$2() {
  return _extends$2 = Object.assign ? Object.assign.bind() : function(n) {
    for (var e = 1; e < arguments.length; e++) {
      var t = arguments[e];
      for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]);
    }
    return n;
  }, _extends$2.apply(null, arguments);
}
function SetPiePayloadLegend(props) {
  var presentationProps = reactExports.useMemo(() => filterProps(props, false), [props]);
  var cells = reactExports.useMemo(() => findAllByType(props.children, Cell), [props.children]);
  var pieSettings = reactExports.useMemo(() => ({
    name: props.name,
    nameKey: props.nameKey,
    tooltipType: props.tooltipType,
    data: props.data,
    dataKey: props.dataKey,
    cx: props.cx,
    cy: props.cy,
    startAngle: props.startAngle,
    endAngle: props.endAngle,
    minAngle: props.minAngle,
    paddingAngle: props.paddingAngle,
    innerRadius: props.innerRadius,
    outerRadius: props.outerRadius,
    cornerRadius: props.cornerRadius,
    legendType: props.legendType,
    fill: props.fill,
    presentationProps
  }), [props.cornerRadius, props.cx, props.cy, props.data, props.dataKey, props.endAngle, props.innerRadius, props.minAngle, props.name, props.nameKey, props.outerRadius, props.paddingAngle, props.startAngle, props.tooltipType, props.legendType, props.fill, presentationProps]);
  var legendPayload = useAppSelector((state) => selectPieLegend(state, pieSettings, cells));
  return /* @__PURE__ */ reactExports.createElement(SetPolarLegendPayload, {
    legendPayload
  });
}
function getTooltipEntrySettings(props) {
  var {
    dataKey,
    nameKey,
    sectors,
    stroke,
    strokeWidth,
    fill,
    name,
    hide,
    tooltipType
  } = props;
  return {
    dataDefinedOnItem: sectors === null || sectors === void 0 ? void 0 : sectors.map((p) => p.tooltipPayload),
    positions: sectors === null || sectors === void 0 ? void 0 : sectors.map((p) => p.tooltipPosition),
    settings: {
      stroke,
      strokeWidth,
      fill,
      dataKey,
      nameKey,
      name: getTooltipNameProp(name, dataKey),
      hide,
      type: tooltipType,
      color: fill,
      unit: ""
      // why doesn't Pie support unit?
    }
  };
}
var getTextAnchor = (x, cx) => {
  if (x > cx) {
    return "start";
  }
  if (x < cx) {
    return "end";
  }
  return "middle";
};
var getOuterRadius = (dataPoint, outerRadius, maxPieRadius) => {
  if (typeof outerRadius === "function") {
    return outerRadius(dataPoint);
  }
  return getPercentValue(outerRadius, maxPieRadius, maxPieRadius * 0.8);
};
var parseCoordinateOfPie = (item, offset, dataPoint) => {
  var {
    top,
    left,
    width,
    height
  } = offset;
  var maxPieRadius = getMaxRadius(width, height);
  var cx = left + getPercentValue(item.cx, width, width / 2);
  var cy = top + getPercentValue(item.cy, height, height / 2);
  var innerRadius = getPercentValue(item.innerRadius, maxPieRadius, 0);
  var outerRadius = getOuterRadius(dataPoint, item.outerRadius, maxPieRadius);
  var maxRadius = item.maxRadius || Math.sqrt(width * width + height * height) / 2;
  return {
    cx,
    cy,
    innerRadius,
    outerRadius,
    maxRadius
  };
};
var parseDeltaAngle = (startAngle, endAngle) => {
  var sign = mathSign(endAngle - startAngle);
  var deltaAngle = Math.min(Math.abs(endAngle - startAngle), 360);
  return sign * deltaAngle;
};
var renderLabelLineItem = (option, props) => {
  if (/* @__PURE__ */ reactExports.isValidElement(option)) {
    return /* @__PURE__ */ reactExports.cloneElement(option, props);
  }
  if (typeof option === "function") {
    return option(props);
  }
  var className = clsx("recharts-pie-label-line", typeof option !== "boolean" ? option.className : "");
  return /* @__PURE__ */ reactExports.createElement(Curve, _extends$2({}, props, {
    type: "linear",
    className
  }));
};
var renderLabelItem = (option, props, value) => {
  if (/* @__PURE__ */ reactExports.isValidElement(option)) {
    return /* @__PURE__ */ reactExports.cloneElement(option, props);
  }
  var label = value;
  if (typeof option === "function") {
    label = option(props);
    if (/* @__PURE__ */ reactExports.isValidElement(label)) {
      return label;
    }
  }
  var className = clsx("recharts-pie-label-text", typeof option !== "boolean" && typeof option !== "function" ? option.className : "");
  return /* @__PURE__ */ reactExports.createElement(Text, _extends$2({}, props, {
    alignmentBaseline: "middle",
    className
  }), label);
};
function PieLabels(_ref) {
  var {
    sectors,
    props,
    showLabels
  } = _ref;
  var {
    label,
    labelLine,
    dataKey
  } = props;
  if (!showLabels || !label || !sectors) {
    return null;
  }
  var pieProps = filterProps(props, false);
  var customLabelProps = filterProps(label, false);
  var customLabelLineProps = filterProps(labelLine, false);
  var offsetRadius = typeof label === "object" && "offsetRadius" in label && label.offsetRadius || 20;
  var labels = sectors.map((entry, i) => {
    var midAngle = (entry.startAngle + entry.endAngle) / 2;
    var endPoint = polarToCartesian(entry.cx, entry.cy, entry.outerRadius + offsetRadius, midAngle);
    var labelProps = _objectSpread$1(_objectSpread$1(_objectSpread$1(_objectSpread$1({}, pieProps), entry), {}, {
      stroke: "none"
    }, customLabelProps), {}, {
      index: i,
      textAnchor: getTextAnchor(endPoint.x, entry.cx)
    }, endPoint);
    var lineProps = _objectSpread$1(_objectSpread$1(_objectSpread$1(_objectSpread$1({}, pieProps), entry), {}, {
      fill: "none",
      stroke: entry.fill
    }, customLabelLineProps), {}, {
      index: i,
      points: [polarToCartesian(entry.cx, entry.cy, entry.outerRadius, midAngle), endPoint],
      key: "line"
    });
    return (
      // eslint-disable-next-line react/no-array-index-key
      /* @__PURE__ */ reactExports.createElement(Layer, {
        key: "label-".concat(entry.startAngle, "-").concat(entry.endAngle, "-").concat(entry.midAngle, "-").concat(i)
      }, labelLine && renderLabelLineItem(labelLine, lineProps), renderLabelItem(label, labelProps, getValueByDataKey(entry, dataKey)))
    );
  });
  return /* @__PURE__ */ reactExports.createElement(Layer, {
    className: "recharts-pie-labels"
  }, labels);
}
function PieSectors(props) {
  var {
    sectors,
    activeShape,
    inactiveShape: inactiveShapeProp,
    allOtherPieProps,
    showLabels
  } = props;
  var activeIndex = useAppSelector(selectActiveTooltipIndex);
  var {
    onMouseEnter: onMouseEnterFromProps,
    onClick: onItemClickFromProps,
    onMouseLeave: onMouseLeaveFromProps
  } = allOtherPieProps, restOfAllOtherProps = _objectWithoutProperties$1(allOtherPieProps, _excluded$1);
  var onMouseEnterFromContext = useMouseEnterItemDispatch(onMouseEnterFromProps, allOtherPieProps.dataKey);
  var onMouseLeaveFromContext = useMouseLeaveItemDispatch(onMouseLeaveFromProps);
  var onClickFromContext = useMouseClickItemDispatch(onItemClickFromProps, allOtherPieProps.dataKey);
  if (sectors == null) {
    return null;
  }
  return /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, sectors.map((entry, i) => {
    if ((entry === null || entry === void 0 ? void 0 : entry.startAngle) === 0 && (entry === null || entry === void 0 ? void 0 : entry.endAngle) === 0 && sectors.length !== 1) return null;
    var isSectorActive = activeShape && String(i) === activeIndex;
    var inactiveShape = activeIndex ? inactiveShapeProp : null;
    var sectorOptions = isSectorActive ? activeShape : inactiveShape;
    var sectorProps = _objectSpread$1(_objectSpread$1({}, entry), {}, {
      stroke: entry.stroke,
      tabIndex: -1,
      [DATA_ITEM_INDEX_ATTRIBUTE_NAME]: i,
      [DATA_ITEM_DATAKEY_ATTRIBUTE_NAME]: allOtherPieProps.dataKey
    });
    return /* @__PURE__ */ reactExports.createElement(Layer, _extends$2({
      tabIndex: -1,
      className: "recharts-pie-sector"
    }, adaptEventsOfChild(restOfAllOtherProps, entry, i), {
      // @ts-expect-error the types need a bit of attention
      onMouseEnter: onMouseEnterFromContext(entry, i),
      onMouseLeave: onMouseLeaveFromContext(entry, i),
      onClick: onClickFromContext(entry, i),
      key: "sector-".concat(entry === null || entry === void 0 ? void 0 : entry.startAngle, "-").concat(entry === null || entry === void 0 ? void 0 : entry.endAngle, "-").concat(entry.midAngle, "-").concat(i)
    }), /* @__PURE__ */ reactExports.createElement(Shape, _extends$2({
      option: sectorOptions,
      isActive: isSectorActive,
      shapeType: "sector"
    }, sectorProps)));
  }), /* @__PURE__ */ reactExports.createElement(PieLabels, {
    sectors,
    props: allOtherPieProps,
    showLabels
  }));
}
function computePieSectors(_ref2) {
  var _pieSettings$paddingA;
  var {
    pieSettings,
    displayedData,
    cells,
    offset
  } = _ref2;
  var {
    cornerRadius,
    startAngle,
    endAngle,
    dataKey,
    nameKey,
    tooltipType
  } = pieSettings;
  var minAngle = Math.abs(pieSettings.minAngle);
  var deltaAngle = parseDeltaAngle(startAngle, endAngle);
  var absDeltaAngle = Math.abs(deltaAngle);
  var paddingAngle = displayedData.length <= 1 ? 0 : (_pieSettings$paddingA = pieSettings.paddingAngle) !== null && _pieSettings$paddingA !== void 0 ? _pieSettings$paddingA : 0;
  var notZeroItemCount = displayedData.filter((entry) => getValueByDataKey(entry, dataKey, 0) !== 0).length;
  var totalPaddingAngle = (absDeltaAngle >= 360 ? notZeroItemCount : notZeroItemCount - 1) * paddingAngle;
  var realTotalAngle = absDeltaAngle - notZeroItemCount * minAngle - totalPaddingAngle;
  var sum = displayedData.reduce((result, entry) => {
    var val = getValueByDataKey(entry, dataKey, 0);
    return result + (isNumber(val) ? val : 0);
  }, 0);
  var sectors;
  if (sum > 0) {
    var prev;
    sectors = displayedData.map((entry, i) => {
      var val = getValueByDataKey(entry, dataKey, 0);
      var name = getValueByDataKey(entry, nameKey, i);
      var coordinate = parseCoordinateOfPie(pieSettings, offset, entry);
      var percent = (isNumber(val) ? val : 0) / sum;
      var tempStartAngle;
      var entryWithCellInfo = _objectSpread$1(_objectSpread$1({}, entry), cells && cells[i] && cells[i].props);
      if (i) {
        tempStartAngle = prev.endAngle + mathSign(deltaAngle) * paddingAngle * (val !== 0 ? 1 : 0);
      } else {
        tempStartAngle = startAngle;
      }
      var tempEndAngle = tempStartAngle + mathSign(deltaAngle) * ((val !== 0 ? minAngle : 0) + percent * realTotalAngle);
      var midAngle = (tempStartAngle + tempEndAngle) / 2;
      var middleRadius = (coordinate.innerRadius + coordinate.outerRadius) / 2;
      var tooltipPayload = [{
        // @ts-expect-error getValueByDataKey does not validate the output type
        name,
        // @ts-expect-error getValueByDataKey does not validate the output type
        value: val,
        payload: entryWithCellInfo,
        dataKey,
        type: tooltipType
      }];
      var tooltipPosition = polarToCartesian(coordinate.cx, coordinate.cy, middleRadius, midAngle);
      prev = _objectSpread$1(_objectSpread$1(_objectSpread$1(_objectSpread$1({}, pieSettings.presentationProps), {}, {
        percent,
        cornerRadius,
        name,
        tooltipPayload,
        midAngle,
        middleRadius,
        tooltipPosition
      }, entryWithCellInfo), coordinate), {}, {
        value: getValueByDataKey(entry, dataKey),
        startAngle: tempStartAngle,
        endAngle: tempEndAngle,
        payload: entryWithCellInfo,
        paddingAngle: mathSign(deltaAngle) * paddingAngle
      });
      return prev;
    });
  }
  return sectors;
}
function SectorsWithAnimation(_ref3) {
  var {
    props,
    previousSectorsRef
  } = _ref3;
  var {
    sectors,
    isAnimationActive,
    animationBegin,
    animationDuration,
    animationEasing,
    activeShape,
    inactiveShape,
    onAnimationStart,
    onAnimationEnd
  } = props;
  var animationId = useAnimationId(props, "recharts-pie-");
  var prevSectors = previousSectorsRef.current;
  var [isAnimating, setIsAnimating] = reactExports.useState(true);
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
    onAnimationStart: handleAnimationStart,
    onAnimationEnd: handleAnimationEnd,
    key: animationId
  }, (_ref4) => {
    var {
      t
    } = _ref4;
    var stepData = [];
    var first = sectors && sectors[0];
    var curAngle = first.startAngle;
    sectors.forEach((entry, index) => {
      var prev = prevSectors && prevSectors[index];
      var paddingAngle = index > 0 ? get(entry, "paddingAngle", 0) : 0;
      if (prev) {
        var angleIp = interpolateNumber(prev.endAngle - prev.startAngle, entry.endAngle - entry.startAngle);
        var latest = _objectSpread$1(_objectSpread$1({}, entry), {}, {
          startAngle: curAngle + paddingAngle,
          endAngle: curAngle + angleIp(t) + paddingAngle
        });
        stepData.push(latest);
        curAngle = latest.endAngle;
      } else {
        var {
          endAngle,
          startAngle
        } = entry;
        var interpolatorAngle = interpolateNumber(0, endAngle - startAngle);
        var deltaAngle = interpolatorAngle(t);
        var _latest = _objectSpread$1(_objectSpread$1({}, entry), {}, {
          startAngle: curAngle + paddingAngle,
          endAngle: curAngle + deltaAngle + paddingAngle
        });
        stepData.push(_latest);
        curAngle = _latest.endAngle;
      }
    });
    previousSectorsRef.current = stepData;
    return /* @__PURE__ */ reactExports.createElement(Layer, null, /* @__PURE__ */ reactExports.createElement(PieSectors, {
      sectors: stepData,
      activeShape,
      inactiveShape,
      allOtherPieProps: props,
      showLabels: !isAnimating
    }));
  });
}
function RenderSectors(props) {
  var {
    sectors,
    isAnimationActive,
    activeShape,
    inactiveShape
  } = props;
  var previousSectorsRef = reactExports.useRef(null);
  var prevSectors = previousSectorsRef.current;
  if (isAnimationActive && sectors && sectors.length && (!prevSectors || prevSectors !== sectors)) {
    return /* @__PURE__ */ reactExports.createElement(SectorsWithAnimation, {
      props,
      previousSectorsRef
    });
  }
  return /* @__PURE__ */ reactExports.createElement(PieSectors, {
    sectors,
    activeShape,
    inactiveShape,
    allOtherPieProps: props,
    showLabels: true
  });
}
function PieWithTouchMove(props) {
  var {
    hide,
    className,
    rootTabIndex
  } = props;
  var layerClass = clsx("recharts-pie", className);
  if (hide) {
    return null;
  }
  return /* @__PURE__ */ reactExports.createElement(Layer, {
    tabIndex: rootTabIndex,
    className: layerClass
  }, /* @__PURE__ */ reactExports.createElement(RenderSectors, props));
}
var defaultPieProps = {
  animationBegin: 400,
  animationDuration: 1500,
  animationEasing: "ease",
  cx: "50%",
  cy: "50%",
  dataKey: "value",
  endAngle: 360,
  fill: "#808080",
  hide: false,
  innerRadius: 0,
  isAnimationActive: !Global.isSsr,
  labelLine: true,
  legendType: "rect",
  minAngle: 0,
  nameKey: "name",
  outerRadius: "80%",
  paddingAngle: 0,
  rootTabIndex: 0,
  startAngle: 0,
  stroke: "#fff"
};
function PieImpl(props) {
  var propsWithDefaults = resolveDefaultProps(props, defaultPieProps);
  var cells = reactExports.useMemo(() => findAllByType(props.children, Cell), [props.children]);
  var presentationProps = filterProps(propsWithDefaults, false);
  var pieSettings = reactExports.useMemo(() => ({
    name: propsWithDefaults.name,
    nameKey: propsWithDefaults.nameKey,
    tooltipType: propsWithDefaults.tooltipType,
    data: propsWithDefaults.data,
    dataKey: propsWithDefaults.dataKey,
    cx: propsWithDefaults.cx,
    cy: propsWithDefaults.cy,
    startAngle: propsWithDefaults.startAngle,
    endAngle: propsWithDefaults.endAngle,
    minAngle: propsWithDefaults.minAngle,
    paddingAngle: propsWithDefaults.paddingAngle,
    innerRadius: propsWithDefaults.innerRadius,
    outerRadius: propsWithDefaults.outerRadius,
    cornerRadius: propsWithDefaults.cornerRadius,
    legendType: propsWithDefaults.legendType,
    fill: propsWithDefaults.fill,
    presentationProps
  }), [propsWithDefaults.cornerRadius, propsWithDefaults.cx, propsWithDefaults.cy, propsWithDefaults.data, propsWithDefaults.dataKey, propsWithDefaults.endAngle, propsWithDefaults.innerRadius, propsWithDefaults.minAngle, propsWithDefaults.name, propsWithDefaults.nameKey, propsWithDefaults.outerRadius, propsWithDefaults.paddingAngle, propsWithDefaults.startAngle, propsWithDefaults.tooltipType, propsWithDefaults.legendType, propsWithDefaults.fill, presentationProps]);
  var sectors = useAppSelector((state) => selectPieSectors(state, pieSettings, cells));
  return /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement(SetTooltipEntrySettings, {
    fn: getTooltipEntrySettings,
    args: _objectSpread$1(_objectSpread$1({}, propsWithDefaults), {}, {
      sectors
    })
  }), /* @__PURE__ */ reactExports.createElement(PieWithTouchMove, _extends$2({}, propsWithDefaults, {
    sectors
  })));
}
class Pie extends reactExports.PureComponent {
  constructor() {
    super(...arguments);
    _defineProperty$1(this, "id", uniqueId("recharts-pie-"));
  }
  render() {
    return /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement(SetPolarGraphicalItem, {
      data: this.props.data,
      dataKey: this.props.dataKey,
      hide: this.props.hide,
      angleAxisId: 0,
      radiusAxisId: 0,
      stackId: void 0,
      barSize: void 0,
      type: "pie"
    }), /* @__PURE__ */ reactExports.createElement(SetPiePayloadLegend, this.props), /* @__PURE__ */ reactExports.createElement(PieImpl, this.props), this.props.children);
  }
}
_defineProperty$1(Pie, "displayName", "Pie");
_defineProperty$1(Pie, "defaultProps", defaultPieProps);
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
function _extends$1() {
  return _extends$1 = Object.assign ? Object.assign.bind() : function(n) {
    for (var e = 1; e < arguments.length; e++) {
      var t = arguments[e];
      for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]);
    }
    return n;
  }, _extends$1.apply(null, arguments);
}
var renderLine = (option, props) => {
  var line;
  if (/* @__PURE__ */ reactExports.isValidElement(option)) {
    line = /* @__PURE__ */ reactExports.cloneElement(option, props);
  } else if (typeof option === "function") {
    line = option(props);
  } else {
    line = /* @__PURE__ */ reactExports.createElement("line", _extends$1({}, props, {
      className: "recharts-reference-line-line"
    }));
  }
  return line;
};
var getEndPoints = (scales, isFixedX, isFixedY, isSegment, viewBox, position, xAxisOrientation, yAxisOrientation, props) => {
  var {
    x,
    y,
    width,
    height
  } = viewBox;
  if (isFixedY) {
    var {
      y: yCoord
    } = props;
    var coord = scales.y.apply(yCoord, {
      position
    });
    if (isNan(coord)) return null;
    if (props.ifOverflow === "discard" && !scales.y.isInRange(coord)) {
      return null;
    }
    var points = [{
      x: x + width,
      y: coord
    }, {
      x,
      y: coord
    }];
    return yAxisOrientation === "left" ? points.reverse() : points;
  }
  if (isFixedX) {
    var {
      x: xCoord
    } = props;
    var _coord = scales.x.apply(xCoord, {
      position
    });
    if (isNan(_coord)) return null;
    if (props.ifOverflow === "discard" && !scales.x.isInRange(_coord)) {
      return null;
    }
    var _points = [{
      x: _coord,
      y: y + height
    }, {
      x: _coord,
      y
    }];
    return xAxisOrientation === "top" ? _points.reverse() : _points;
  }
  if (isSegment) {
    var {
      segment
    } = props;
    var _points2 = segment.map((p) => scales.apply(p, {
      position
    }));
    if (props.ifOverflow === "discard" && _points2.some((p) => !scales.isInRange(p))) {
      return null;
    }
    return _points2;
  }
  return null;
};
function ReportReferenceLine(props) {
  var dispatch = useAppDispatch();
  reactExports.useEffect(() => {
    dispatch(addLine(props));
    return () => {
      dispatch(removeLine(props));
    };
  });
  return null;
}
function ReferenceLineImpl(props) {
  var {
    x: fixedX,
    y: fixedY,
    segment,
    xAxisId,
    yAxisId,
    shape,
    className,
    ifOverflow
  } = props;
  var isPanorama = useIsPanorama();
  var clipPathId = useClipPathId();
  var xAxis = useAppSelector((state) => selectXAxisSettings(state, xAxisId));
  var yAxis = useAppSelector((state) => selectYAxisSettings(state, yAxisId));
  var xAxisScale = useAppSelector((state) => selectAxisScale(state, "xAxis", xAxisId, isPanorama));
  var yAxisScale = useAppSelector((state) => selectAxisScale(state, "yAxis", yAxisId, isPanorama));
  var viewBox = useViewBox();
  var isFixedX = isNumOrStr(fixedX);
  var isFixedY = isNumOrStr(fixedY);
  if (!clipPathId || !viewBox || xAxis == null || yAxis == null || xAxisScale == null || yAxisScale == null) {
    return null;
  }
  var scales = createLabeledScales({
    x: xAxisScale,
    y: yAxisScale
  });
  var isSegment = segment && segment.length === 2;
  var endPoints = getEndPoints(scales, isFixedX, isFixedY, isSegment, viewBox, props.position, xAxis.orientation, yAxis.orientation, props);
  if (!endPoints) {
    return null;
  }
  var [{
    x: x1,
    y: y1
  }, {
    x: x2,
    y: y2
  }] = endPoints;
  var clipPath = ifOverflow === "hidden" ? "url(#".concat(clipPathId, ")") : void 0;
  var lineProps = _objectSpread(_objectSpread({
    clipPath
  }, filterProps(props, true)), {}, {
    x1,
    y1,
    x2,
    y2
  });
  return /* @__PURE__ */ reactExports.createElement(Layer, {
    className: clsx("recharts-reference-line", className)
  }, renderLine(shape, lineProps), Label.renderCallByParent(props, rectWithCoords({
    x1,
    y1,
    x2,
    y2
  })));
}
function ReferenceLineSettingsDispatcher(props) {
  return /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement(ReportReferenceLine, {
    yAxisId: props.yAxisId,
    xAxisId: props.xAxisId,
    ifOverflow: props.ifOverflow,
    x: props.x,
    y: props.y
  }), /* @__PURE__ */ reactExports.createElement(ReferenceLineImpl, props));
}
class ReferenceLine extends reactExports.Component {
  render() {
    return /* @__PURE__ */ reactExports.createElement(ReferenceLineSettingsDispatcher, this.props);
  }
}
_defineProperty(ReferenceLine, "displayName", "ReferenceLine");
_defineProperty(ReferenceLine, "defaultProps", {
  ifOverflow: "discard",
  xAxisId: 0,
  yAxisId: 0,
  fill: "none",
  stroke: "#ccc",
  fillOpacity: 1,
  strokeWidth: 1,
  position: "middle"
});
function ReportPolarOptions(props) {
  var dispatch = useAppDispatch();
  reactExports.useEffect(() => {
    dispatch(updatePolarOptions(props));
  }, [dispatch, props]);
  return null;
}
var _excluded = ["width", "height", "layout"];
function _extends() {
  return _extends = Object.assign ? Object.assign.bind() : function(n) {
    for (var e = 1; e < arguments.length; e++) {
      var t = arguments[e];
      for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]);
    }
    return n;
  }, _extends.apply(null, arguments);
}
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
var defaultMargin = {
  top: 5,
  right: 5,
  bottom: 5,
  left: 5
};
var defaultProps$1 = {
  accessibilityLayer: true,
  stackOffset: "none",
  barCategoryGap: "10%",
  barGap: 4,
  margin: defaultMargin,
  reverseStackOrder: false,
  syncMethod: "index",
  layout: "radial"
};
var PolarChart = /* @__PURE__ */ reactExports.forwardRef(function PolarChart2(props, ref) {
  var _polarChartProps$id;
  var polarChartProps = resolveDefaultProps(props.categoricalChartProps, defaultProps$1);
  var {
    width,
    height,
    layout
  } = polarChartProps, otherCategoricalProps = _objectWithoutProperties(polarChartProps, _excluded);
  if (!isPositiveNumber(width) || !isPositiveNumber(height)) {
    return null;
  }
  var {
    chartName,
    defaultTooltipEventType,
    validateTooltipEventTypes,
    tooltipPayloadSearcher
  } = props;
  var options = {
    chartName,
    defaultTooltipEventType,
    validateTooltipEventTypes,
    tooltipPayloadSearcher,
    eventEmitter: void 0
  };
  return /* @__PURE__ */ reactExports.createElement(RechartsStoreProvider, {
    preloadedState: {
      options
    },
    reduxStoreName: (_polarChartProps$id = polarChartProps.id) !== null && _polarChartProps$id !== void 0 ? _polarChartProps$id : chartName
  }, /* @__PURE__ */ reactExports.createElement(ChartDataContextProvider, {
    chartData: polarChartProps.data
  }), /* @__PURE__ */ reactExports.createElement(ReportMainChartProps, {
    width,
    height,
    layout,
    margin: polarChartProps.margin
  }), /* @__PURE__ */ reactExports.createElement(ReportChartProps, {
    accessibilityLayer: polarChartProps.accessibilityLayer,
    barCategoryGap: polarChartProps.barCategoryGap,
    maxBarSize: polarChartProps.maxBarSize,
    stackOffset: polarChartProps.stackOffset,
    barGap: polarChartProps.barGap,
    barSize: polarChartProps.barSize,
    syncId: polarChartProps.syncId,
    syncMethod: polarChartProps.syncMethod,
    className: polarChartProps.className
  }), /* @__PURE__ */ reactExports.createElement(ReportPolarOptions, {
    cx: polarChartProps.cx,
    cy: polarChartProps.cy,
    startAngle: polarChartProps.startAngle,
    endAngle: polarChartProps.endAngle,
    innerRadius: polarChartProps.innerRadius,
    outerRadius: polarChartProps.outerRadius
  }), /* @__PURE__ */ reactExports.createElement(CategoricalChart, _extends({
    width,
    height
  }, otherCategoricalProps, {
    ref
  })));
});
var allowedTooltipTypes = ["item"];
var defaultProps = {
  layout: "centric",
  startAngle: 0,
  endAngle: 360,
  cx: "50%",
  cy: "50%",
  innerRadius: 0,
  outerRadius: "80%"
};
var PieChart = /* @__PURE__ */ reactExports.forwardRef((props, ref) => {
  var propsWithDefaults = resolveDefaultProps(props, defaultProps);
  return /* @__PURE__ */ reactExports.createElement(PolarChart, {
    chartName: "PieChart",
    defaultTooltipEventType: "item",
    validateTooltipEventTypes: allowedTooltipTypes,
    tooltipPayloadSearcher: arrayTooltipSearcher,
    categoricalChartProps: propsWithDefaults,
    ref
  });
});
function calculateDCF(inputs) {
  const {
    currentPrice,
    sharesOutstanding,
    freeCashFlow,
    growthRate,
    terminalGrowthRate,
    projectionYears,
    discountRate,
    totalDebt = 0,
    cashAndEquivalents = 0,
    marginOfSafety = 25
  } = inputs;
  const g = growthRate / 100;
  const tg = terminalGrowthRate / 100;
  const r = discountRate / 100;
  const projectedCashFlows = [];
  let currentFCF = freeCashFlow;
  for (let year = 1; year <= projectionYears; year++) {
    currentFCF = currentFCF * (1 + g);
    projectedCashFlows.push(currentFCF);
  }
  let presentValueOfCashFlows = 0;
  for (let year = 1; year <= projectionYears; year++) {
    const discountFactor = Math.pow(1 + r, year);
    presentValueOfCashFlows += projectedCashFlows[year - 1] / discountFactor;
  }
  const lastProjectedFCF = projectedCashFlows[projectedCashFlows.length - 1];
  const terminalValue = lastProjectedFCF * (1 + tg) / (r - tg);
  const terminalDiscountFactor = Math.pow(1 + r, projectionYears);
  const presentValueOfTerminalValue = terminalValue / terminalDiscountFactor;
  const enterpriseValue = presentValueOfCashFlows + presentValueOfTerminalValue;
  const equityValue = enterpriseValue - totalDebt + cashAndEquivalents;
  const intrinsicValuePerShare = equityValue / sharesOutstanding;
  const upside = (intrinsicValuePerShare - currentPrice) / currentPrice * 100;
  let recommendation;
  if (upside > 50) {
    recommendation = "Strong Buy";
  } else if (upside > 20) {
    recommendation = "Buy";
  } else if (upside > -10) {
    recommendation = "Hold";
  } else if (upside > -30) {
    recommendation = "Sell";
  } else {
    recommendation = "Strong Sell";
  }
  const sensitivityAnalysis = calculateSensitivity(inputs);
  return {
    intrinsicValuePerShare,
    currentPrice,
    upside,
    marginOfSafety: (intrinsicValuePerShare - currentPrice) / intrinsicValuePerShare * 100,
    recommendation,
    projectedCashFlows,
    presentValueOfCashFlows,
    terminalValue,
    presentValueOfTerminalValue,
    enterpriseValue,
    equityValue,
    sensitivityAnalysis
  };
}
function calculateSensitivity(baseInputs, baseIntrinsicValue) {
  const growthRateSensitivity = {};
  const discountRateSensitivity = {};
  for (let delta = -2; delta <= 2; delta += 0.5) {
    const adjustedGrowth = baseInputs.growthRate + delta;
    if (adjustedGrowth > 0 && adjustedGrowth < 30) {
      const result = calculateDCF({
        ...baseInputs,
        growthRate: adjustedGrowth
      });
      growthRateSensitivity[`${adjustedGrowth.toFixed(1)}%`] = result.intrinsicValuePerShare;
    }
  }
  for (let delta = -2; delta <= 2; delta += 0.5) {
    const adjustedDiscount = baseInputs.discountRate + delta;
    if (adjustedDiscount > 5 && adjustedDiscount < 20) {
      const result = calculateDCF({
        ...baseInputs,
        discountRate: adjustedDiscount
      });
      discountRateSensitivity[`${adjustedDiscount.toFixed(1)}%`] = result.intrinsicValuePerShare;
    }
  }
  return {
    growthRate: growthRateSensitivity,
    discountRate: discountRateSensitivity
  };
}
function calculateDCFScenarios(baseInputs, scenarios) {
  return scenarios.map((scenario) => ({
    ...scenario,
    result: calculateDCF({
      ...baseInputs,
      ...scenario.inputs
    })
  }));
}
const DEFAULT_DCF_SCENARIOS = [{
  name: "Conservative",
  inputs: {
    growthRate: 5,
    terminalGrowthRate: 2,
    discountRate: 12,
    marginOfSafety: 30
  }
}, {
  name: "Base Case",
  inputs: {
    growthRate: 10,
    terminalGrowthRate: 3,
    discountRate: 10,
    marginOfSafety: 25
  }
}, {
  name: "Optimistic",
  inputs: {
    growthRate: 15,
    terminalGrowthRate: 4,
    discountRate: 8,
    marginOfSafety: 20
  }
}];
function formatLargeNumber(value) {
  const absValue = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (absValue >= 1e12) {
    return `${sign}$${(absValue / 1e12).toFixed(2)}T`;
  } else if (absValue >= 1e9) {
    return `${sign}$${(absValue / 1e9).toFixed(2)}B`;
  } else if (absValue >= 1e6) {
    return `${sign}$${(absValue / 1e6).toFixed(2)}M`;
  } else if (absValue >= 1e3) {
    return `${sign}$${(absValue / 1e3).toFixed(2)}K`;
  } else {
    return `${sign}$${absValue.toFixed(2)}`;
  }
}
function DCFCalculatorCard({
  symbol,
  currentPrice,
  onCalculate,
  preset
}) {
  const [growthRate, setGrowthRate] = reactExports.useState(10);
  const [terminalGrowth, setTerminalGrowth] = reactExports.useState(3);
  const [discountRate, setDiscountRate] = reactExports.useState(10);
  const [marginOfSafety, setMarginOfSafety] = reactExports.useState(25);
  const [projectionYears, setProjectionYears] = reactExports.useState(10);
  const [dcfResult, setDcfResult] = reactExports.useState(null);
  const [scenarios, setScenarios] = reactExports.useState([]);
  const [activeTab, setActiveTab] = reactExports.useState("calculator");
  const {
    data: dcfData,
    isLoading,
    error
  } = useQuery({
    queryKey: [`/api/market-data/dcf/${symbol}`],
    enabled: !!symbol,
    staleTime: 5 * 60 * 1e3
    // 5 minutes
  });
  reactExports.useEffect(() => {
    if (dcfData) {
      if (dcfData.suggestedGrowthRate) setGrowthRate(dcfData.suggestedGrowthRate);
      if (dcfData.suggestedTerminalGrowth) setTerminalGrowth(dcfData.suggestedTerminalGrowth);
      if (dcfData.suggestedDiscountRate) setDiscountRate(dcfData.suggestedDiscountRate);
    }
  }, [dcfData]);
  reactExports.useEffect(() => {
    if (!preset) return;
    if (typeof preset.growthRate === "number") setGrowthRate(preset.growthRate);
    if (typeof preset.terminalGrowth === "number") setTerminalGrowth(preset.terminalGrowth);
    if (typeof preset.discountRate === "number") setDiscountRate(preset.discountRate);
    if (typeof preset.marginOfSafety === "number") setMarginOfSafety(preset.marginOfSafety);
    if (typeof preset.projectionYears === "number") setProjectionYears(preset.projectionYears);
    const t = setTimeout(() => handleCalculate(), 0);
    return () => clearTimeout(t);
  }, [preset]);
  const handleCalculate = () => {
    if (!dcfData) return;
    const inputs = {
      currentPrice,
      sharesOutstanding: dcfData.sharesOutstanding || 1e9,
      // Default 1B if not available
      freeCashFlow: dcfData.freeCashFlow || 0,
      fcfHistory: dcfData.fcfHistory?.map((h) => h.freeCashFlow),
      growthRate,
      terminalGrowthRate: terminalGrowth,
      projectionYears,
      discountRate,
      totalDebt: dcfData.totalDebt || 0,
      cashAndEquivalents: dcfData.cashAndEquivalents || 0,
      marginOfSafety
    };
    const result = calculateDCF(inputs);
    setDcfResult(result);
    const scenarioResults = calculateDCFScenarios(inputs, DEFAULT_DCF_SCENARIOS);
    setScenarios(scenarioResults);
    if (onCalculate) {
      onCalculate(result);
    }
  };
  reactExports.useEffect(() => {
    if (dcfData && symbol) {
      handleCalculate();
    }
  }, [symbol, !!dcfData, currentPrice]);
  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };
  const formatPercent = (value) => {
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
  };
  const getRecommendationColor = (recommendation) => {
    switch (recommendation) {
      case "Strong Buy":
        return "bg-green-600 text-white";
      case "Buy":
        return "bg-green-500 text-white";
      case "Hold":
        return "bg-yellow-500 text-white";
      case "Sell":
        return "bg-red-500 text-white";
      case "Strong Sell":
        return "bg-red-600 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };
  const projectionChartData = dcfResult ? dcfResult.projectedCashFlows.map((cf, index) => ({
    year: `Year ${index + 1}`,
    cashFlow: cf / 1e6,
    // Convert to millions
    presentValue: cf / Math.pow(1 + discountRate / 100, index + 1) / 1e6
  })) : [];
  const scenarioChartData = scenarios.map((scenario) => ({
    name: scenario.name,
    intrinsicValue: scenario.result?.intrinsicValuePerShare || 0,
    currentPrice,
    upside: scenario.result?.upside || 0
  }));
  if (isLoading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Card, {
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
        className: "p-8",
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "flex items-center justify-center space-x-2",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Calculator, {
            className: "w-6 h-6 animate-spin"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
            children: "Loading financial data..."
          })]
        })
      })
    });
  }
  if (error || !dcfData) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Card, {
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
        className: "p-8",
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, {
          variant: "destructive",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, {
            className: "h-4 w-4"
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDescription, {
            children: ["Failed to load financial data for ", symbol]
          })]
        })
      })
    });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
    className: "overflow-hidden",
    children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "flex items-center justify-between",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, {
            className: "flex items-center gap-2",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Calculator, {
              className: "h-5 w-5 text-primary"
            }), "DCF Valuation Analysis"]
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardDescription, {
            children: "Free Cash Flow based intrinsic value calculation"
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, {
          variant: "outline",
          className: "text-xs",
          children: symbol
        })]
      })
    }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Tabs, {
        value: activeTab,
        onValueChange: setActiveTab,
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(TabsList, {
          className: "grid w-full grid-cols-4",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, {
            value: "calculator",
            children: "Calculator"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, {
            value: "results",
            children: "Results"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, {
            value: "scenarios",
            children: "Scenarios"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, {
            value: "sensitivity",
            children: "Sensitivity"
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsContent, {
          value: "calculator",
          className: "space-y-6 mt-6",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "grid grid-cols-2 md:grid-cols-4 gap-4 mb-6",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "p-3 bg-secondary/30 rounded-lg",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                className: "text-xs text-muted-foreground",
                children: "Current FCF"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                className: "text-lg font-bold",
                children: formatLargeNumber(dcfData.freeCashFlow || 0)
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "p-3 bg-secondary/30 rounded-lg",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                className: "text-xs text-muted-foreground",
                children: "FCF Growth (3Y)"
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "text-lg font-bold",
                children: [dcfData.fcfCAGR?.toFixed(1) || "0", "%"]
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "p-3 bg-secondary/30 rounded-lg",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                className: "text-xs text-muted-foreground",
                children: "P/E Ratio"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                className: "text-lg font-bold",
                children: dcfData.peRatio?.toFixed(1) || "N/A"
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "p-3 bg-secondary/30 rounded-lg",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                className: "text-xs text-muted-foreground",
                children: "ROIC"
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "text-lg font-bold",
                children: [(dcfData.roic * 100)?.toFixed(1) || "0", "%"]
              })]
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "space-y-4",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "flex items-center justify-between mb-2",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(Label$1, {
                  className: "flex items-center gap-1",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, {
                    className: "h-3 w-3"
                  }), "Growth Rate (Years 1-", projectionYears, ")"]
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
                  className: "text-sm font-medium",
                  children: [growthRate, "%"]
                })]
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(Slider, {
                value: [growthRate],
                onValueChange: (value) => setGrowthRate(value[0]),
                min: 0,
                max: 30,
                step: 0.5,
                className: "w-full"
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "flex items-center justify-between mb-2",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(Label$1, {
                  className: "flex items-center gap-1",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Activity, {
                    className: "h-3 w-3"
                  }), "Terminal Growth Rate"]
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
                  className: "text-sm font-medium",
                  children: [terminalGrowth, "%"]
                })]
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(Slider, {
                value: [terminalGrowth],
                onValueChange: (value) => setTerminalGrowth(value[0]),
                min: 0,
                max: 5,
                step: 0.5,
                className: "w-full"
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "flex items-center justify-between mb-2",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(Label$1, {
                  className: "flex items-center gap-1",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Percent, {
                    className: "h-3 w-3"
                  }), "Discount Rate (WACC)"]
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
                  className: "text-sm font-medium",
                  children: [discountRate, "%"]
                })]
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(Slider, {
                value: [discountRate],
                onValueChange: (value) => setDiscountRate(value[0]),
                min: 5,
                max: 20,
                step: 0.5,
                className: "w-full"
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "flex items-center justify-between mb-2",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(Label$1, {
                  className: "flex items-center gap-1",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Target, {
                    className: "h-3 w-3"
                  }), "Margin of Safety"]
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
                  className: "text-sm font-medium",
                  children: [marginOfSafety, "%"]
                })]
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(Slider, {
                value: [marginOfSafety],
                onValueChange: (value) => setMarginOfSafety(value[0]),
                min: 0,
                max: 50,
                step: 5,
                className: "w-full"
              })]
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
            onClick: handleCalculate,
            className: "w-full bg-gradient-to-r from-teya-green via-teya-green-dark to-teya-green hover:from-teya-green-dark hover:via-teya-green hover:to-teya-green-dark text-rich-black font-semibold",
            children: "Calculate Intrinsic Value"
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, {
          value: "results",
          className: "space-y-6 mt-6",
          children: dcfResult ? /* @__PURE__ */ jsxRuntimeExports.jsx(AnimatePresence, {
            children: /* @__PURE__ */ jsxRuntimeExports.jsxs(motion.div, {
              initial: {
                opacity: 0,
                y: 20
              },
              animate: {
                opacity: 1,
                y: 0
              },
              className: "space-y-6",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "text-center p-6 bg-gradient-to-br from-secondary/20 to-secondary/5 rounded-xl",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                  className: "text-sm text-muted-foreground mb-2",
                  children: "Intrinsic Value"
                }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                  className: "text-4xl font-bold text-primary mb-4",
                  children: formatCurrency(dcfResult.intrinsicValuePerShare)
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "flex items-center justify-center gap-4",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                      className: "text-xs text-muted-foreground",
                      children: "Current Price"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                      className: "text-lg font-semibold",
                      children: formatCurrency(currentPrice)
                    })]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, {
                    className: "h-4 w-4 text-muted-foreground"
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                      className: "text-xs text-muted-foreground",
                      children: "Upside/Downside"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                      className: `text-lg font-semibold ${dcfResult.upside >= 0 ? "text-green-600" : "text-red-600"}`,
                      children: formatPercent(dcfResult.upside)
                    })]
                  })]
                }), /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, {
                  className: `mt-4 ${getRecommendationColor(dcfResult.recommendation)}`,
                  children: dcfResult.recommendation
                })]
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "space-y-3",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h4", {
                  className: "text-sm font-semibold",
                  children: "Valuation Breakdown"
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "space-y-2",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex justify-between py-2 border-b",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "text-sm text-muted-foreground",
                      children: "PV of Cash Flows"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "text-sm font-medium",
                      children: formatLargeNumber(dcfResult.presentValueOfCashFlows)
                    })]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex justify-between py-2 border-b",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "text-sm text-muted-foreground",
                      children: "Terminal Value"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "text-sm font-medium",
                      children: formatLargeNumber(dcfResult.terminalValue)
                    })]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex justify-between py-2 border-b",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "text-sm text-muted-foreground",
                      children: "PV of Terminal Value"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "text-sm font-medium",
                      children: formatLargeNumber(dcfResult.presentValueOfTerminalValue)
                    })]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex justify-between py-2 border-b",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "text-sm text-muted-foreground",
                      children: "Enterprise Value"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "text-sm font-medium",
                      children: formatLargeNumber(dcfResult.enterpriseValue)
                    })]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex justify-between py-2",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "text-sm font-semibold",
                      children: "Equity Value"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "text-sm font-bold text-primary",
                      children: formatLargeNumber(dcfResult.equityValue)
                    })]
                  })]
                })]
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h4", {
                  className: "text-sm font-semibold mb-3",
                  children: "Projected Cash Flows"
                }), /* @__PURE__ */ jsxRuntimeExports.jsx(ResponsiveContainer, {
                  width: "100%",
                  height: 200,
                  children: /* @__PURE__ */ jsxRuntimeExports.jsxs(AreaChart, {
                    data: projectionChartData,
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CartesianGrid, {
                      strokeDasharray: "3 3",
                      stroke: "#374151",
                      opacity: 0.3
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx(XAxis, {
                      dataKey: "year",
                      tick: {
                        fontSize: 10,
                        fill: "#9CA3AF"
                      }
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx(YAxis, {
                      tick: {
                        fontSize: 10,
                        fill: "#9CA3AF"
                      }
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, {
                      contentStyle: {
                        backgroundColor: "#1F2937",
                        border: "1px solid #374151",
                        borderRadius: "8px"
                      }
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx(Area, {
                      type: "monotone",
                      dataKey: "cashFlow",
                      stroke: "#10b981",
                      fill: "#10b981",
                      fillOpacity: 0.3,
                      name: "Projected FCF ($M)"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx(Area, {
                      type: "monotone",
                      dataKey: "presentValue",
                      stroke: "#3b82f6",
                      fill: "#3b82f6",
                      fillOpacity: 0.3,
                      name: "Present Value ($M)"
                    })]
                  })
                })]
              })]
            })
          }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "text-center py-8 text-muted-foreground",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Calculator, {
              className: "w-12 h-12 mx-auto mb-3 opacity-50"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
              children: "Configure parameters and calculate to see results"
            })]
          })
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, {
          value: "scenarios",
          className: "space-y-6 mt-6",
          children: scenarios.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "space-y-6",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(ResponsiveContainer, {
              width: "100%",
              height: 250,
              children: /* @__PURE__ */ jsxRuntimeExports.jsxs(BarChart, {
                data: scenarioChartData,
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CartesianGrid, {
                  strokeDasharray: "3 3",
                  stroke: "#374151",
                  opacity: 0.3
                }), /* @__PURE__ */ jsxRuntimeExports.jsx(XAxis, {
                  dataKey: "name",
                  tick: {
                    fontSize: 10,
                    fill: "#9CA3AF"
                  }
                }), /* @__PURE__ */ jsxRuntimeExports.jsx(YAxis, {
                  tick: {
                    fontSize: 10,
                    fill: "#9CA3AF"
                  }
                }), /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, {
                  formatter: (value) => formatCurrency(value),
                  contentStyle: {
                    backgroundColor: "#1F2937",
                    border: "1px solid #374151",
                    borderRadius: "8px"
                  }
                }), /* @__PURE__ */ jsxRuntimeExports.jsx(Legend, {}), /* @__PURE__ */ jsxRuntimeExports.jsx(Bar, {
                  dataKey: "intrinsicValue",
                  fill: "#10b981",
                  name: "Intrinsic Value"
                }), /* @__PURE__ */ jsxRuntimeExports.jsx(Bar, {
                  dataKey: "currentPrice",
                  fill: "#ef4444",
                  name: "Current Price"
                })]
              })
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
              className: "space-y-3",
              children: scenarios.map((scenario, index) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "p-4 bg-secondary/20 rounded-lg",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "flex items-center justify-between mb-2",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h4", {
                    className: "font-semibold",
                    children: scenario.name
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, {
                    variant: "outline",
                    className: scenario.result && scenario.result.upside > 0 ? "border-green-600" : "border-red-600",
                    children: scenario.result ? formatPercent(scenario.result.upside) : "N/A"
                  })]
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "grid grid-cols-2 gap-2 text-sm",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "text-muted-foreground",
                      children: "Growth: "
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
                      className: "font-medium",
                      children: [scenario.inputs.growthRate, "%"]
                    })]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "text-muted-foreground",
                      children: "Discount: "
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
                      className: "font-medium",
                      children: [scenario.inputs.discountRate, "%"]
                    })]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "text-muted-foreground",
                      children: "Terminal: "
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
                      className: "font-medium",
                      children: [scenario.inputs.terminalGrowthRate, "%"]
                    })]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "text-muted-foreground",
                      children: "Value: "
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "font-medium",
                      children: scenario.result ? formatCurrency(scenario.result.intrinsicValuePerShare) : "N/A"
                    })]
                  })]
                })]
              }, index))
            })]
          }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "text-center py-8 text-muted-foreground",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(ChartColumn, {
              className: "w-12 h-12 mx-auto mb-3 opacity-50"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
              children: "Calculate DCF to see scenario analysis"
            })]
          })
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, {
          value: "sensitivity",
          className: "space-y-6 mt-6",
          children: dcfResult?.sensitivityAnalysis ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "space-y-6",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, {
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Info, {
                className: "h-4 w-4"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDescription, {
                children: "Sensitivity analysis shows how intrinsic value changes with different assumptions"
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h4", {
                className: "text-sm font-semibold mb-3",
                children: "Growth Rate Sensitivity"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                className: "space-y-2",
                children: Object.entries(dcfResult.sensitivityAnalysis.growthRate).map(([rate, value]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "flex items-center gap-2",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                    className: "text-xs text-muted-foreground w-12",
                    children: rate
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx(Progress, {
                    value: value / Math.max(...Object.values(dcfResult.sensitivityAnalysis.growthRate)) * 100,
                    className: "flex-1"
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                    className: "text-sm font-medium w-20 text-right",
                    children: formatCurrency(value)
                  })]
                }, rate))
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h4", {
                className: "text-sm font-semibold mb-3",
                children: "Discount Rate Sensitivity"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                className: "space-y-2",
                children: Object.entries(dcfResult.sensitivityAnalysis.discountRate).map(([rate, value]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "flex items-center gap-2",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                    className: "text-xs text-muted-foreground w-12",
                    children: rate
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx(Progress, {
                    value: value / Math.max(...Object.values(dcfResult.sensitivityAnalysis.discountRate)) * 100,
                    className: "flex-1"
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                    className: "text-sm font-medium w-20 text-right",
                    children: formatCurrency(value)
                  })]
                }, rate))
              })]
            })]
          }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "text-center py-8 text-muted-foreground",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Activity, {
              className: "w-12 h-12 mx-auto mb-3 opacity-50"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
              children: "Calculate DCF to see sensitivity analysis"
            })]
          })
        })]
      })
    })]
  });
}
var originalBodyUserSelect;
var HOVERCARD_NAME = "HoverCard";
var [createHoverCardContext, createHoverCardScope] = createContextScope(HOVERCARD_NAME, [
  createPopperScope
]);
var usePopperScope = createPopperScope();
var [HoverCardProvider, useHoverCardContext] = createHoverCardContext(HOVERCARD_NAME);
var HoverCard$1 = (props) => {
  const {
    __scopeHoverCard,
    children,
    open: openProp,
    defaultOpen,
    onOpenChange,
    openDelay = 700,
    closeDelay = 300
  } = props;
  const popperScope = usePopperScope(__scopeHoverCard);
  const openTimerRef = reactExports.useRef(0);
  const closeTimerRef = reactExports.useRef(0);
  const hasSelectionRef = reactExports.useRef(false);
  const isPointerDownOnContentRef = reactExports.useRef(false);
  const [open, setOpen] = useControllableState({
    prop: openProp,
    defaultProp: defaultOpen ?? false,
    onChange: onOpenChange,
    caller: HOVERCARD_NAME
  });
  const handleOpen = reactExports.useCallback(() => {
    clearTimeout(closeTimerRef.current);
    openTimerRef.current = window.setTimeout(() => setOpen(true), openDelay);
  }, [openDelay, setOpen]);
  const handleClose = reactExports.useCallback(() => {
    clearTimeout(openTimerRef.current);
    if (!hasSelectionRef.current && !isPointerDownOnContentRef.current) {
      closeTimerRef.current = window.setTimeout(() => setOpen(false), closeDelay);
    }
  }, [closeDelay, setOpen]);
  const handleDismiss = reactExports.useCallback(() => setOpen(false), [setOpen]);
  reactExports.useEffect(() => {
    return () => {
      clearTimeout(openTimerRef.current);
      clearTimeout(closeTimerRef.current);
    };
  }, []);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    HoverCardProvider,
    {
      scope: __scopeHoverCard,
      open,
      onOpenChange: setOpen,
      onOpen: handleOpen,
      onClose: handleClose,
      onDismiss: handleDismiss,
      hasSelectionRef,
      isPointerDownOnContentRef,
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(Root2$1, { ...popperScope, children })
    }
  );
};
HoverCard$1.displayName = HOVERCARD_NAME;
var TRIGGER_NAME = "HoverCardTrigger";
var HoverCardTrigger$1 = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeHoverCard, ...triggerProps } = props;
    const context = useHoverCardContext(TRIGGER_NAME, __scopeHoverCard);
    const popperScope = usePopperScope(__scopeHoverCard);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Anchor, { asChild: true, ...popperScope, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      Primitive.a,
      {
        "data-state": context.open ? "open" : "closed",
        ...triggerProps,
        ref: forwardedRef,
        onPointerEnter: composeEventHandlers(props.onPointerEnter, excludeTouch(context.onOpen)),
        onPointerLeave: composeEventHandlers(props.onPointerLeave, excludeTouch(context.onClose)),
        onFocus: composeEventHandlers(props.onFocus, context.onOpen),
        onBlur: composeEventHandlers(props.onBlur, context.onClose),
        onTouchStart: composeEventHandlers(props.onTouchStart, (event) => event.preventDefault())
      }
    ) });
  }
);
HoverCardTrigger$1.displayName = TRIGGER_NAME;
var PORTAL_NAME = "HoverCardPortal";
var [PortalProvider, usePortalContext] = createHoverCardContext(PORTAL_NAME, {
  forceMount: void 0
});
var CONTENT_NAME = "HoverCardContent";
var HoverCardContent$1 = reactExports.forwardRef(
  (props, forwardedRef) => {
    const portalContext = usePortalContext(CONTENT_NAME, props.__scopeHoverCard);
    const { forceMount = portalContext.forceMount, ...contentProps } = props;
    const context = useHoverCardContext(CONTENT_NAME, props.__scopeHoverCard);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Presence, { present: forceMount || context.open, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      HoverCardContentImpl,
      {
        "data-state": context.open ? "open" : "closed",
        ...contentProps,
        onPointerEnter: composeEventHandlers(props.onPointerEnter, excludeTouch(context.onOpen)),
        onPointerLeave: composeEventHandlers(props.onPointerLeave, excludeTouch(context.onClose)),
        ref: forwardedRef
      }
    ) });
  }
);
HoverCardContent$1.displayName = CONTENT_NAME;
var HoverCardContentImpl = reactExports.forwardRef((props, forwardedRef) => {
  const {
    __scopeHoverCard,
    onEscapeKeyDown,
    onPointerDownOutside,
    onFocusOutside,
    onInteractOutside,
    ...contentProps
  } = props;
  const context = useHoverCardContext(CONTENT_NAME, __scopeHoverCard);
  const popperScope = usePopperScope(__scopeHoverCard);
  const ref = reactExports.useRef(null);
  const composedRefs = useComposedRefs(forwardedRef, ref);
  const [containSelection, setContainSelection] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (containSelection) {
      const body = document.body;
      originalBodyUserSelect = body.style.userSelect || body.style.webkitUserSelect;
      body.style.userSelect = "none";
      body.style.webkitUserSelect = "none";
      return () => {
        body.style.userSelect = originalBodyUserSelect;
        body.style.webkitUserSelect = originalBodyUserSelect;
      };
    }
  }, [containSelection]);
  reactExports.useEffect(() => {
    if (ref.current) {
      const handlePointerUp = () => {
        setContainSelection(false);
        context.isPointerDownOnContentRef.current = false;
        setTimeout(() => {
          const hasSelection = document.getSelection()?.toString() !== "";
          if (hasSelection) context.hasSelectionRef.current = true;
        });
      };
      document.addEventListener("pointerup", handlePointerUp);
      return () => {
        document.removeEventListener("pointerup", handlePointerUp);
        context.hasSelectionRef.current = false;
        context.isPointerDownOnContentRef.current = false;
      };
    }
  }, [context.isPointerDownOnContentRef, context.hasSelectionRef]);
  reactExports.useEffect(() => {
    if (ref.current) {
      const tabbables = getTabbableNodes(ref.current);
      tabbables.forEach((tabbable) => tabbable.setAttribute("tabindex", "-1"));
    }
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    DismissableLayer,
    {
      asChild: true,
      disableOutsidePointerEvents: false,
      onInteractOutside,
      onEscapeKeyDown,
      onPointerDownOutside,
      onFocusOutside: composeEventHandlers(onFocusOutside, (event) => {
        event.preventDefault();
      }),
      onDismiss: context.onDismiss,
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        Content,
        {
          ...popperScope,
          ...contentProps,
          onPointerDown: composeEventHandlers(contentProps.onPointerDown, (event) => {
            if (event.currentTarget.contains(event.target)) {
              setContainSelection(true);
            }
            context.hasSelectionRef.current = false;
            context.isPointerDownOnContentRef.current = true;
          }),
          ref: composedRefs,
          style: {
            ...contentProps.style,
            userSelect: containSelection ? "text" : void 0,
            // Safari requires prefix
            WebkitUserSelect: containSelection ? "text" : void 0,
            // re-namespace exposed content custom properties
            ...{
              "--radix-hover-card-content-transform-origin": "var(--radix-popper-transform-origin)",
              "--radix-hover-card-content-available-width": "var(--radix-popper-available-width)",
              "--radix-hover-card-content-available-height": "var(--radix-popper-available-height)",
              "--radix-hover-card-trigger-width": "var(--radix-popper-anchor-width)",
              "--radix-hover-card-trigger-height": "var(--radix-popper-anchor-height)"
            }
          }
        }
      )
    }
  );
});
var ARROW_NAME = "HoverCardArrow";
var HoverCardArrow = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeHoverCard, ...arrowProps } = props;
    const popperScope = usePopperScope(__scopeHoverCard);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Arrow, { ...popperScope, ...arrowProps, ref: forwardedRef });
  }
);
HoverCardArrow.displayName = ARROW_NAME;
function excludeTouch(eventHandler) {
  return (event) => event.pointerType === "touch" ? void 0 : eventHandler();
}
function getTabbableNodes(container) {
  const nodes = [];
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_ELEMENT, {
    acceptNode: (node) => {
      return node.tabIndex >= 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    }
  });
  while (walker.nextNode()) nodes.push(walker.currentNode);
  return nodes;
}
var Root2 = HoverCard$1;
var Trigger = HoverCardTrigger$1;
var Content2 = HoverCardContent$1;
const HoverCard = Root2;
const HoverCardTrigger = Trigger;
const HoverCardContent = reactExports.forwardRef(({
  className,
  align = "center",
  sideOffset = 4,
  ...props
}, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx(Content2, {
  ref,
  align,
  sideOffset,
  className: cn("z-50 w-64 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-hover-card-content-transform-origin]", className),
  ...props
}));
HoverCardContent.displayName = Content2.displayName;
const CATEGORY_COLORS = {
  proprietary: "#10b981",
  // Green (Teya Green)
  dcf: "#3b82f6",
  // Blue
  multiples: "#8b5cf6",
  // Purple
  growth: "#f59e0b"
  // Amber
};
const CATEGORY_LABELS = {
  proprietary: "Proprietary",
  dcf: "DCF Models",
  multiples: "Historical Multiples",
  growth: "Growth-Adjusted"
};
const CustomTooltip = ({
  active,
  payload
}) => {
  if (!active || !payload || !payload[0]) return null;
  const data = payload[0].payload;
  const method = data.method;
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
    className: "bg-background border border-border rounded-lg p-4 shadow-lg max-w-xs",
    children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
      className: "space-y-2",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
        className: "font-bold text-foreground",
        children: method.name
      }), method.description && /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
        className: "text-xs text-muted-foreground",
        children: method.description
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "grid grid-cols-2 gap-2 text-sm",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
          className: "text-muted-foreground",
          children: "Intrinsic Value:"
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "font-semibold text-right",
          children: ["$", method.iv.toFixed(2)]
        }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
          className: "text-muted-foreground",
          children: "vs Current Price:"
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: `font-semibold text-right ${method.discount_pct > 0 ? "text-green-600" : "text-red-600"}`,
          children: [method.discount_pct > 0 ? "+" : "", method.discount_pct.toFixed(1), "%"]
        })]
      }), method.formula && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "pt-2 border-t border-border",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
          className: "text-xs text-muted-foreground mb-1",
          children: "Formula:"
        }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
          className: "text-xs font-mono bg-secondary/30 p-2 rounded",
          children: method.formula
        })]
      }), method.inputs && Object.keys(method.inputs).length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "pt-2 border-t border-border",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
          className: "text-xs text-muted-foreground mb-1",
          children: "Key Inputs:"
        }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
          className: "space-y-1",
          children: Object.entries(method.inputs).map(([key, value]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex justify-between text-xs",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
              className: "text-muted-foreground",
              children: [key, ":"]
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
              className: "font-medium",
              children: value
            })]
          }, key))
        })]
      }), method.confidence && /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
        className: "pt-2 border-t border-border",
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, {
          variant: method.confidence === "HIGH" ? "default" : "secondary",
          className: "text-xs",
          children: [method.confidence, " Confidence"]
        })
      })]
    })
  });
};
function ValuationMethodsChart({
  methods,
  currentPrice,
  highlightMethod,
  className
}) {
  const chartData = reactExports.useMemo(() => {
    return methods.sort((a, b) => {
      const categoryOrder = {
        proprietary: 0,
        dcf: 1,
        multiples: 2,
        growth: 3
      };
      const catDiff = categoryOrder[a.category] - categoryOrder[b.category];
      return catDiff !== 0 ? catDiff : b.iv - a.iv;
    }).map((method) => {
      const isHighlighted = highlightMethod ? method.name === highlightMethod || method.name.toLowerCase().includes(highlightMethod.toLowerCase()) || highlightMethod.toLowerCase().includes(method.name.toLowerCase()) : false;
      return {
        method,
        name: method.name,
        value: method.iv,
        category: method.category,
        isHighlighted,
        isUndervalued: method.iv > currentPrice
      };
    });
  }, [methods, currentPrice, highlightMethod]);
  const highlightedValue = reactExports.useMemo(() => {
    if (!highlightMethod) return null;
    let method = methods.find((m) => m.name === highlightMethod);
    if (!method) {
      const searchTerm = highlightMethod.toLowerCase();
      method = methods.find((m) => m.name.toLowerCase().includes(searchTerm) || searchTerm.includes(m.name.toLowerCase()));
    }
    return method?.iv || null;
  }, [methods, highlightMethod]);
  const domain = reactExports.useMemo(() => {
    const values = methods.map((m) => m.iv);
    const min = Math.min(...values, currentPrice);
    const max = Math.max(...values, currentPrice);
    const padding = (max - min) * 0.1;
    return [Math.floor(min - padding), Math.ceil(max + padding)];
  }, [methods, currentPrice]);
  if (methods.length === 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Card, {
      className,
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
        className: "p-8 text-center",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
          className: "text-muted-foreground",
          children: "No valuation methods available"
        })
      })
    });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
    className,
    children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "flex items-center justify-between",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, {
          className: "flex items-center gap-2",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(ChartColumn, {
            className: "h-5 w-5 text-primary"
          }), "Valuation Methods Comparison"]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs(HoverCard, {
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(HoverCardTrigger, {
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(Info, {
              className: "h-4 w-4 text-muted-foreground cursor-help"
            })
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(HoverCardContent, {
            className: "w-80",
            children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "space-y-2 text-sm",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                className: "font-semibold",
                children: "How to read this chart:"
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("ul", {
                className: "space-y-1 text-muted-foreground",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("li", {
                  children: ["• ", /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                    className: "text-green-600",
                    children: "Green bars"
                  }), ": Method suggests stock is undervalued"]
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs("li", {
                  children: ["• ", /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                    className: "text-red-600",
                    children: "Red bars"
                  }), ": Method suggests stock is overvalued"]
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs("li", {
                  children: ["• ", /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                    className: "font-semibold",
                    children: "Black line"
                  }), ": Current market price"]
                }), highlightMethod && /* @__PURE__ */ jsxRuntimeExports.jsxs("li", {
                  children: ["• ", /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                    className: "text-teya-green font-semibold",
                    children: "Green line"
                  }), ": ", highlightMethod, " (recommended)"]
                }), /* @__PURE__ */ jsxRuntimeExports.jsx("li", {
                  children: "• Hover bars for detailed formula & inputs"
                })]
              })]
            })
          })]
        })]
      })
    }), /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
      children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
        className: "h-96 w-full",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(ResponsiveContainer, {
          width: "100%",
          height: "100%",
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs(BarChart, {
            data: chartData,
            layout: "vertical",
            margin: {
              top: 5,
              right: 30,
              left: 180,
              bottom: 5
            },
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CartesianGrid, {
              strokeDasharray: "3 3",
              stroke: "hsl(var(--border))",
              opacity: 0.3
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(XAxis, {
              type: "number",
              domain,
              tick: {
                fontSize: 12,
                fill: "#e4e7eb"
              },
              tickFormatter: (value) => `$${value}`
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(YAxis, {
              type: "category",
              dataKey: "name",
              width: 160,
              tick: {
                fontSize: 12,
                fill: "#f0f1f3"
              }
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, {
              content: /* @__PURE__ */ jsxRuntimeExports.jsx(CustomTooltip, {})
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(Legend, {
              verticalAlign: "top",
              height: 40,
              formatter: (value, entry) => {
                if (value === "value") {
                  return "Intrinsic Value";
                }
                return value;
              }
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(ReferenceLine, {
              x: currentPrice,
              stroke: "hsl(var(--foreground))",
              strokeWidth: 2,
              label: {
                value: `Current: $${currentPrice.toFixed(2)}`,
                position: "top",
                fill: "hsl(var(--foreground))",
                fontSize: 11
              }
            }), highlightedValue && /* @__PURE__ */ jsxRuntimeExports.jsx(ReferenceLine, {
              x: highlightedValue,
              stroke: "#10b981",
              strokeWidth: 2,
              strokeDasharray: "5 5",
              label: {
                value: highlightMethod,
                position: "bottom",
                fill: "#10b981",
                fontSize: 11,
                fontWeight: "bold"
              }
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(Bar, {
              dataKey: "value",
              name: "Intrinsic Value",
              radius: [0, 4, 4, 0],
              children: chartData.map((entry, index) => /* @__PURE__ */ jsxRuntimeExports.jsx(Cell, {
                fill: entry.isHighlighted ? "#10b981" : entry.isUndervalued ? "#10b981" : "#ef4444",
                opacity: entry.isHighlighted ? 1 : 0.8,
                strokeWidth: entry.isHighlighted ? 2 : 0,
                stroke: entry.isHighlighted ? "#10b981" : "none"
              }, `cell-${index}`))
            })]
          })
        })
      }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
        className: "flex flex-wrap gap-4 mt-4 justify-center",
        children: Object.entries(CATEGORY_LABELS).map(([key, label]) => {
          const hasData = methods.some((m) => m.category === key);
          if (!hasData) return null;
          return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex items-center gap-2 text-sm",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
              className: "w-3 h-3 rounded",
              style: {
                backgroundColor: CATEGORY_COLORS[key]
              }
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
              className: "text-muted-foreground",
              children: label
            })]
          }, key);
        })
      })]
    })]
  });
}
function useValuationChart(ticker, options = {}) {
  const {
    basedOn = "fcf",
    excludeNRI = false,
    enabled = true,
    staleTime = 60 * 60 * 1e3,
    // 1 hour default
    retry = 3
  } = options;
  return useQuery({
    queryKey: queryKeys.valuationChart(ticker, basedOn, excludeNRI),
    queryFn: async () => {
      if (!ticker) {
        throw new Error("Ticker is required");
      }
      const params = new URLSearchParams({
        based_on: basedOn,
        exclude_nri: excludeNRI.toString()
      });
      const response = await fetch(`/api/iv/${ticker}/chart?${params}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Valuation chart data not available for ${ticker}`);
        }
        if (response.status === 400) {
          const error = await response.json();
          throw new Error(error.error || "Invalid request parameters");
        }
        throw new Error(`Failed to fetch valuation chart: ${response.statusText}`);
      }
      const data = await response.json();
      return data;
    },
    enabled: enabled && !!ticker,
    staleTime,
    // Data valid for configured duration
    gcTime: staleTime * 2,
    // Keep in cache 2x longer
    retry,
    // Retry failed requests
    retryDelay: (attemptIndex) => Math.min(1e3 * 2 ** attemptIndex, 1e4)
  });
}
function calculateValuationMetrics(iv, price) {
  const safeIv = iv ?? 0;
  const safePrice = price ?? 0;
  const discountPct = safePrice !== 0 ? (safeIv - safePrice) / safePrice * 100 : 0;
  let status;
  if (discountPct >= 30) {
    status = "strong-buy";
  } else if (discountPct >= 15) {
    status = "buy";
  } else if (discountPct >= -15) {
    status = "hold";
  } else if (discountPct >= -30) {
    status = "sell";
  } else {
    status = "strong-sell";
  }
  const clampedDiscount = Math.max(-50, Math.min(50, discountPct));
  let angle;
  if (clampedDiscount >= 30) {
    angle = 30 - (clampedDiscount - 30) / 20 * 30;
  } else if (clampedDiscount >= 15) {
    angle = 60 - (clampedDiscount - 15) / 15 * 30;
  } else if (clampedDiscount >= -15) {
    angle = 90 - clampedDiscount / 15 * 30;
  } else if (clampedDiscount >= -30) {
    angle = 120 + (Math.abs(clampedDiscount) - 15) / 15 * 30;
  } else {
    angle = 150 + (Math.abs(clampedDiscount) - 30) / 20 * 30;
  }
  return {
    discountPct,
    status,
    angle
  };
}
function getStatusConfig(status) {
  const configs = {
    "strong-buy": {
      color: "#10b981",
      // Green
      bgColor: "bg-green-500/10",
      borderColor: "border-green-500/20",
      textColor: "text-green-600",
      label: "Strong Buy",
      icon: TrendingUp
    },
    "buy": {
      color: "#34d399",
      // Light Green
      bgColor: "bg-green-400/10",
      borderColor: "border-green-400/20",
      textColor: "text-green-500",
      label: "Buy",
      icon: TrendingUp
    },
    "hold": {
      color: "#fbbf24",
      // Amber
      bgColor: "bg-amber-500/10",
      borderColor: "border-amber-500/20",
      textColor: "text-amber-600",
      label: "Hold",
      icon: Minus
    },
    "sell": {
      color: "#f87171",
      // Light Red
      bgColor: "bg-red-400/10",
      borderColor: "border-red-400/20",
      textColor: "text-red-500",
      label: "Sell",
      icon: TrendingDown
    },
    "strong-sell": {
      color: "#ef4444",
      // Red
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/20",
      textColor: "text-red-600",
      label: "Strong Sell",
      icon: TrendingDown
    }
  };
  return configs[status];
}
function ValuationGauge({
  iv,
  price,
  method,
  className
}) {
  const {
    discountPct,
    status,
    angle
  } = reactExports.useMemo(() => calculateValuationMetrics(iv, price), [iv, price]);
  const config = getStatusConfig(status);
  const StatusIcon = config.icon;
  const [animatedAngle, setAnimatedAngle] = reactExports.useState(0);
  reactExports.useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedAngle(angle);
    }, 100);
    return () => clearTimeout(timer);
  }, [angle]);
  const gaugeRadius = 90;
  const centerX = 120;
  const centerY = 130;
  const pointerRotation = animatedAngle - 180;
  const pointerLength = 75;
  const createArcPath = (startAngle, endAngle) => {
    const startRad = Math.PI - startAngle * Math.PI / 180;
    const endRad = Math.PI - endAngle * Math.PI / 180;
    const x1 = centerX + gaugeRadius * Math.cos(startRad);
    const y1 = centerY - gaugeRadius * Math.sin(startRad);
    const x2 = centerX + gaugeRadius * Math.cos(endRad);
    const y2 = centerY - gaugeRadius * Math.sin(endRad);
    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${gaugeRadius} ${gaugeRadius} 0 ${largeArcFlag} 1 ${x2} ${y2}`;
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
    className,
    children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, {
        className: "flex items-center gap-2",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Gauge, {
          className: "h-5 w-5 text-primary"
        }), "Valuation Gauge", method && /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, {
          variant: "outline",
          className: "ml-auto",
          children: method
        })]
      })
    }), /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
      className: "flex flex-col items-center space-y-6",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
        className: "relative",
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", {
          width: "240",
          height: "140",
          viewBox: "0 0 240 140",
          className: "overflow-visible",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
            d: createArcPath(0, 180),
            fill: "none",
            stroke: "hsl(var(--border))",
            strokeWidth: "20",
            strokeLinecap: "round",
            opacity: 0.2
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("path", {
            d: createArcPath(0, 30),
            fill: "none",
            stroke: "#10b981",
            strokeWidth: "20",
            strokeLinecap: "round",
            opacity: 0.8
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("path", {
            d: createArcPath(30, 60),
            fill: "none",
            stroke: "#34d399",
            strokeWidth: "20",
            strokeLinecap: "round",
            opacity: 0.9
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("path", {
            d: createArcPath(60, 120),
            fill: "none",
            stroke: "#fbbf24",
            strokeWidth: "20",
            strokeLinecap: "round",
            opacity: 0.7
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("path", {
            d: createArcPath(120, 150),
            fill: "none",
            stroke: "#f87171",
            strokeWidth: "20",
            strokeLinecap: "round",
            opacity: 0.7
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("path", {
            d: createArcPath(150, 180),
            fill: "none",
            stroke: "#ef4444",
            strokeWidth: "20",
            strokeLinecap: "round",
            opacity: 0.8
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("g", {
            style: {
              transform: `rotate(${pointerRotation}deg)`,
              transformOrigin: `${centerX}px ${centerY}px`,
              transition: "transform 700ms ease-out"
            },
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("line", {
              x1: centerX,
              y1: centerY,
              x2: centerX + pointerLength,
              y2: centerY,
              stroke: "#f5f5f5",
              strokeWidth: "3",
              strokeLinecap: "round"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("circle", {
              cx: centerX,
              cy: centerY,
              r: "6",
              fill: "#f5f5f5",
              stroke: "#333333",
              strokeWidth: "2"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("circle", {
              cx: centerX + pointerLength,
              cy: centerY,
              r: "8",
              fill: "#f5f5f5",
              stroke: "#333333",
              strokeWidth: "2"
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("text", {
            x: "30",
            y: "155",
            fill: "hsl(var(--muted-foreground))",
            fontSize: "11",
            fontWeight: "500",
            textAnchor: "middle",
            children: "Undervalued"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("text", {
            x: centerX,
            y: "25",
            fill: "hsl(var(--muted-foreground))",
            fontSize: "11",
            fontWeight: "500",
            textAnchor: "middle",
            children: "Intrinsic Value"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("text", {
            x: "210",
            y: "155",
            fill: "hsl(var(--muted-foreground))",
            fontSize: "11",
            fontWeight: "500",
            textAnchor: "middle",
            children: "Overvalued"
          })]
        })
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "text-center space-y-2 -mt-8",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "space-y-1",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "text-sm text-muted-foreground",
            children: "Intrinsic Value"
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "text-3xl font-bold text-primary",
            children: ["$", (iv ?? 0).toFixed(2)]
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "space-y-1",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "text-sm text-muted-foreground",
            children: "Current Price"
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "text-xl font-semibold",
            children: ["$", (price ?? 0).toFixed(2)]
          })]
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: cn("w-full p-4 rounded-lg border text-center space-y-2", config.bgColor, config.borderColor),
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "flex items-center justify-center gap-2",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(StatusIcon, {
            className: cn("h-5 w-5", config.textColor)
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
            className: cn("text-xl font-bold", config.textColor),
            children: config.label
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: cn("text-2xl font-bold", config.textColor),
          children: [discountPct >= 0 ? "+" : "", (discountPct ?? 0).toFixed(1), "%"]
        }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
          className: "text-sm text-muted-foreground",
          children: discountPct >= 0 ? "Discount to Fair Value" : "Premium to Fair Value"
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "w-full grid grid-cols-5 gap-2 text-xs text-center",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "space-y-1",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "w-full h-2 bg-green-500 rounded"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "text-muted-foreground",
            children: "Strong Buy"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "font-medium",
            children: "≥30%"
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "space-y-1",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "w-full h-2 bg-green-400 rounded"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "text-muted-foreground",
            children: "Buy"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "font-medium",
            children: "15-30%"
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "space-y-1",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "w-full h-2 bg-amber-500 rounded"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "text-muted-foreground",
            children: "Hold"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "font-medium",
            children: "±15%"
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "space-y-1",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "w-full h-2 bg-red-400 rounded"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "text-muted-foreground",
            children: "Sell"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "font-medium",
            children: "-15 to -30%"
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "space-y-1",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "w-full h-2 bg-red-500 rounded"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "text-muted-foreground",
            children: "Strong Sell"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "font-medium",
            children: "≤-30%"
          })]
        })]
      })]
    })]
  });
}
function FinancialInputsDynamic({
  inputs,
  mode,
  onInputChange,
  readonly = false
}) {
  if (!inputs) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
      children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, {
          className: "text-sm",
          children: "Financial Inputs"
        })
      }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
        children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
          className: "text-sm text-muted-foreground",
          children: "No financial inputs available for this method."
        })
      })]
    });
  }
  const isReadOnly = mode === "auto" || readonly;
  if (inputs.type === "dcf") {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
      children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, {
          className: "text-sm",
          children: "Financial Inputs"
        })
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
        className: "space-y-4",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label$1, {
            htmlFor: "operating-cf",
            children: "Operating CF (millions)"
          }), isReadOnly ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
            className: "text-lg font-semibold",
            children: formatNumber(inputs.operatingCF)
          }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Input, {
            id: "operating-cf",
            type: "number",
            value: inputs.operatingCF,
            onChange: (e) => onInputChange?.("operatingCF", parseFloat(e.target.value)),
            className: "mt-1"
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label$1, {
            htmlFor: "total-debt",
            children: "Total Debt (millions)"
          }), isReadOnly ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
            className: "text-lg font-semibold",
            children: formatNumber(inputs.totalDebt)
          }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Input, {
              id: "total-debt",
              type: "number",
              value: inputs.totalDebt,
              onChange: (e) => onInputChange?.("totalDebt", parseFloat(e.target.value)),
              className: "mt-1"
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "flex items-center mt-2",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Checkbox, {
                id: "deduct-debt",
                checked: inputs.deductDebt,
                onCheckedChange: (checked) => onInputChange?.("deductDebt", checked === true)
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(Label$1, {
                htmlFor: "deduct-debt",
                className: "ml-2 text-sm",
                children: "Deduct from Intrinsic Value"
              })]
            })]
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label$1, {
            htmlFor: "cash",
            children: "Cash & ST Investments (millions)"
          }), isReadOnly ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
            className: "text-lg font-semibold",
            children: formatNumber(inputs.cash)
          }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Input, {
              id: "cash",
              type: "number",
              value: inputs.cash,
              onChange: (e) => onInputChange?.("cash", parseFloat(e.target.value)),
              className: "mt-1"
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "flex items-center mt-2",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Checkbox, {
                id: "add-cash",
                checked: inputs.addCash,
                onCheckedChange: (checked) => onInputChange?.("addCash", checked === true)
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(Label$1, {
                htmlFor: "add-cash",
                className: "ml-2 text-sm",
                children: "Add to Intrinsic Value"
              })]
            })]
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label$1, {
            htmlFor: "discount-rate",
            children: "Discount Rate (%)"
          }), isReadOnly ? /* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
            className: "text-lg font-semibold",
            children: [inputs.discountRate.toFixed(2), "%"]
          }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Input, {
            id: "discount-rate",
            type: "number",
            step: "0.01",
            value: inputs.discountRate,
            onChange: (e) => onInputChange?.("discountRate", parseFloat(e.target.value)),
            className: "mt-1"
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label$1, {
            htmlFor: "shares",
            children: "Shares Outstanding (millions)"
          }), isReadOnly ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("p", {
              className: "text-lg font-semibold",
              children: formatNumber(inputs.shares)
            }), inputs.shares === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
              className: "text-xs text-amber-600 mt-1",
              children: "⚠ Shares Outstanding is 0. Data may be unavailable."
            })]
          }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Input, {
              id: "shares",
              type: "number",
              value: inputs.shares,
              onChange: (e) => onInputChange?.("shares", parseFloat(e.target.value)),
              className: "mt-1"
            }), inputs.shares === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
              className: "text-xs text-amber-600 mt-1",
              children: "⚠ Please enter shares outstanding manually"
            })]
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "pt-2 border-t",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label$1, {
            className: "text-sm font-semibold mb-2 block",
            children: "Growth Rates"
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "space-y-3",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label$1, {
                htmlFor: "growth-y1-5",
                className: "text-sm",
                children: "Year 1-5 (%)"
              }), isReadOnly ? /* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
                className: "text-sm font-medium",
                children: [inputs.growthY1_5.toFixed(2), "%"]
              }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Input, {
                id: "growth-y1-5",
                type: "number",
                step: "0.01",
                value: inputs.growthY1_5,
                onChange: (e) => onInputChange?.("growthY1_5", parseFloat(e.target.value)),
                className: "mt-1"
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label$1, {
                htmlFor: "growth-y6-10",
                className: "text-sm",
                children: "Year 6-10 (%)"
              }), isReadOnly ? /* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
                className: "text-sm font-medium",
                children: [inputs.growthY6_10.toFixed(2), "%"]
              }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Input, {
                id: "growth-y6-10",
                type: "number",
                step: "0.01",
                value: inputs.growthY6_10,
                onChange: (e) => onInputChange?.("growthY6_10", parseFloat(e.target.value)),
                className: "mt-1"
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label$1, {
                htmlFor: "growth-y11-20",
                className: "text-sm",
                children: "Year 11-20 (%)"
              }), isReadOnly ? /* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
                className: "text-sm font-medium",
                children: [inputs.growthY11_20.toFixed(2), "%"]
              }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Input, {
                id: "growth-y11-20",
                type: "number",
                step: "0.01",
                value: inputs.growthY11_20,
                onChange: (e) => onInputChange?.("growthY11_20", parseFloat(e.target.value)),
                className: "mt-1"
              })]
            })]
          })]
        })]
      })]
    });
  }
  if (inputs.type === "growth-adjusted") {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
      children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, {
          className: "text-sm",
          children: "Financial Inputs"
        })
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
        className: "space-y-4",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(Label$1, {
            htmlFor: "fair-ratio",
            children: ["Fair ", inputs.metricName.includes("EPS") ? "PEG" : "PSG", " Ratio"]
          }), isReadOnly ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
            className: "text-lg font-semibold",
            children: inputs.fairRatio.toFixed(2)
          }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Input, {
            id: "fair-ratio",
            type: "number",
            step: "0.01",
            value: inputs.fairRatio,
            onChange: (e) => onInputChange?.("fairRatio", parseFloat(e.target.value)),
            className: "mt-1",
            placeholder: "1.5 for PEG, 0.2 for PSG"
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
            className: "text-xs text-muted-foreground mt-1",
            children: ["Default: ", inputs.metricName.includes("EPS") ? "1.5 (PEG)" : "0.2 (PSG)"]
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label$1, {
            htmlFor: "last-price",
            children: "Last Price ($)"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
            className: "text-lg font-semibold",
            children: inputs.lastPrice.toFixed(2)
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(Label$1, {
            htmlFor: "metric",
            children: [inputs.metricName, " ($)"]
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
            className: "text-lg font-semibold",
            children: inputs.metric.toFixed(2)
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label$1, {
            htmlFor: "growth-rate",
            children: "Growth Rate (%)"
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
            className: "text-lg font-semibold",
            children: [inputs.growthRate.toFixed(2), "%"]
          })]
        }), inputs.pe_without_nri && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label$1, {
            htmlFor: "pe-ratio",
            children: "P/E Ratio (without NRI)"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
            className: "text-lg font-semibold",
            children: inputs.pe_without_nri.toFixed(2)
          })]
        }), inputs.peg_ratio_without_nri && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label$1, {
            htmlFor: "peg-ratio",
            children: "PEG Ratio (calculated)"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
            className: "text-lg font-semibold",
            children: inputs.peg_ratio_without_nri.toFixed(2)
          })]
        }), inputs.ps_ratio && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label$1, {
            htmlFor: "ps-ratio",
            children: "P/S Ratio"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
            className: "text-lg font-semibold",
            children: inputs.ps_ratio.toFixed(2)
          })]
        }), inputs.psg_ratio && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label$1, {
            htmlFor: "psg-ratio",
            children: "PSG Ratio (calculated)"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
            className: "text-lg font-semibold",
            children: inputs.psg_ratio.toFixed(2)
          })]
        })]
      })]
    });
  }
  if (inputs.type === "multiples") {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
      children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, {
          className: "text-sm",
          children: "Financial Inputs"
        })
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
        className: "space-y-4",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label$1, {
            htmlFor: "ratio",
            children: inputs.ratioName
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
            className: "text-lg font-semibold",
            children: inputs.ratio.toFixed(2)
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
            className: "text-xs text-muted-foreground mt-1",
            children: "Calculated from 5-year historical average"
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label$1, {
            htmlFor: "current-price",
            children: "Current Price ($)"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
            className: "text-lg font-semibold",
            children: inputs.currentPrice.toFixed(2)
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(Label$1, {
            htmlFor: "metric-per-share",
            children: [inputs.metricName, " ($)"]
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
            className: "text-lg font-semibold",
            children: inputs.metricPerShare.toFixed(2)
          })]
        }), inputs.historicalRatios.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label$1, {
            className: "text-sm font-semibold mb-2 block",
            children: "Historical Ratios (5 years)"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "flex gap-2 text-sm",
            children: inputs.historicalRatios.map((ratio, index) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "text-center",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
                className: "text-xs text-muted-foreground",
                children: ["Y", index + 1]
              }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                className: "font-medium",
                children: ratio.toFixed(2)
              })]
            }, index))
          })]
        })]
      })]
    });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
    children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, {
        className: "text-sm",
        children: "Financial Inputs"
      })
    }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
      children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
        className: "text-sm text-muted-foreground",
        children: "Unknown method type. Please contact support."
      })
    })]
  });
}
function DualValuationLayout({
  method,
  autoCalculation,
  myCalculation,
  mappedInputs,
  onMyCalculationChange,
  onCalculate,
  onSave,
  onLoad,
  className
}) {
  const formatCurrency = (value) => {
    const safeValue = typeof value === "number" && !isNaN(value) && isFinite(value) ? value : 0;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(safeValue);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
    className: cn("grid grid-cols-1 lg:grid-cols-2 gap-6", className),
    children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
      className: "border-primary/20",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
        className: "pb-4",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
          className: "flex items-center justify-between",
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, {
            className: "flex items-center gap-2",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Calculator, {
              className: "h-5 w-5 text-primary"
            }), "Auto Calculation"]
          })
        })
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
        className: "space-y-6",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "space-y-3 p-4 bg-secondary/30 rounded-lg",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex justify-between items-center",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
              className: "text-sm text-muted-foreground",
              children: "Stock price (USD)"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
              className: "font-semibold text-lg",
              children: formatCurrency(autoCalculation.stockPrice)
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex justify-between items-center",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
              className: "text-sm text-muted-foreground",
              children: "Intrinsic value (USD)"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
              className: "font-semibold text-lg text-primary",
              children: formatCurrency(autoCalculation.iv)
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex justify-between items-center pt-2 border-t",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
              className: "text-sm font-medium",
              children: "Discount (-) / Premium (+)"
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "flex items-center gap-2",
              children: [autoCalculation.premium >= 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(TrendingDown, {
                className: "h-4 w-4 text-red-500"
              }) : /* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, {
                className: "h-4 w-4 text-green-500"
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
                className: cn("font-bold text-lg", autoCalculation.premium >= 0 ? "text-red-500" : "text-green-500"),
                children: [(autoCalculation.premium ?? 0).toFixed(2), "%"]
              })]
            })]
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
          className: "py-4",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(ValuationGauge, {
            iv: autoCalculation.iv,
            price: autoCalculation.stockPrice,
            method: "Auto"
          })
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(FinancialInputsDynamic, {
          inputs: mappedInputs,
          mode: "auto",
          readonly: true
        })]
      })]
    }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
      className: "border-teya-green/20",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
        className: "pb-4",
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "flex justify-between items-center",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, {
            className: "flex items-center gap-2",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Calculator, {
              className: "h-5 w-5 text-teya-green"
            }), "My Calculation"]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex gap-2",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
              variant: "outline",
              size: "sm",
              onClick: onLoad,
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(FolderOpen, {
                className: "h-4 w-4 mr-1"
              }), "Load"]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
              variant: "outline",
              size: "sm",
              onClick: onSave,
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Save, {
                className: "h-4 w-4 mr-1"
              }), "Save"]
            })]
          })]
        })
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
        className: "space-y-6",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "space-y-3 p-4 bg-teya-green/10 rounded-lg border border-teya-green/20",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex justify-between items-center",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
              className: "text-sm text-muted-foreground",
              children: "Stock price (USD)"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
              className: "font-semibold text-lg",
              children: formatCurrency(myCalculation.stockPrice)
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex justify-between items-center",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
              className: "text-sm text-muted-foreground",
              children: "Intrinsic value (USD)"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
              className: "font-semibold text-lg text-teya-green",
              children: formatCurrency(myCalculation.iv)
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex justify-between items-center pt-2 border-t",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
              className: "text-sm font-medium",
              children: "Discount (-) / Premium (+)"
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "flex items-center gap-2",
              children: [myCalculation.premium >= 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(TrendingDown, {
                className: "h-4 w-4 text-red-500"
              }) : /* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, {
                className: "h-4 w-4 text-green-500"
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
                className: cn("font-bold text-lg", myCalculation.premium >= 0 ? "text-red-500" : "text-green-500"),
                children: [(myCalculation.premium ?? 0).toFixed(2), "%"]
              })]
            })]
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
          className: "py-4",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(ValuationGauge, {
            iv: myCalculation.iv,
            price: myCalculation.stockPrice,
            method: "Custom"
          })
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(FinancialInputsDynamic, {
          inputs: mappedInputs,
          mode: "manual",
          onInputChange: onMyCalculationChange
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
          onClick: onCalculate,
          className: "w-full mt-4 bg-teya-green hover:bg-teya-green-dark text-black font-semibold",
          size: "lg",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Calculator, {
            className: "h-4 w-4 mr-2"
          }), "Calculate"]
        })]
      })]
    })]
  });
}
function useMethodInputMapper(selectedMethod, valuationChartData, alfaValueData) {
  return reactExports.useMemo(() => {
    if (!valuationChartData) return null;
    const method = valuationChartData.methods.find((m) => m.method_id === selectedMethod);
    if (!method?.inputs) return null;
    const inputs = method.inputs;
    const methodType = inputs.method;
    if (methodType === "alfavalue" || methodType === "dcf-20" || methodType === "dcf-20-fcf" || methodType === "dcf-20-ocf" || methodType === "dcf-20-ni" || methodType === "dfcf-terminal" || methodType === "dfcf-20" || methodType === "dni-20" || methodType?.toLowerCase().includes("dcf") || methodType?.toLowerCase().includes("dni") || methodType?.toLowerCase().includes("dfcf")) {
      const shares = Number(inputs.shares_outstanding_m || inputs.shares_m || inputs.sharesOutstanding || inputs.shares_outstanding || inputs.outstanding_shares_m || inputs.outstanding_shares || inputs.diluted_shares_outstanding || inputs.dilutedSharesOutstanding || inputs.shares || 0);
      return {
        type: "dcf",
        operatingCF: Number(inputs.fcf_ttm_musd || inputs.ocf_ttm_musd || inputs.net_income_ttm_musd || inputs.ni_ttm_musd || inputs.operating_cf || inputs.base_metric_musd || 0),
        totalDebt: Number(inputs.total_debt_musd || inputs.debt_musd || 0),
        cash: Number(inputs.cash_musd || inputs.cash || 0),
        discountRate: Number(inputs.discount_rate ? inputs.discount_rate * 100 : inputs.discount_rate || 0),
        shares,
        growthY1_5: Number(inputs.growth_rate_y1_5 ? inputs.growth_rate_y1_5 * 100 : inputs.growth_rate_1_5 ? inputs.growth_rate_1_5 * 100 : inputs.stage1_growth_rate ? inputs.stage1_growth_rate * 100 : 0),
        growthY6_10: Number(inputs.growth_rate_y6_10 ? inputs.growth_rate_y6_10 * 100 : inputs.growth_rate_6_10 ? inputs.growth_rate_6_10 * 100 : inputs.stage2_growth_rate ? inputs.stage2_growth_rate * 100 : 0),
        growthY11_20: Number(inputs.growth_rate_y11_20 ? inputs.growth_rate_y11_20 * 100 : inputs.growth_rate_11_20 ? inputs.growth_rate_11_20 * 100 : inputs.terminal_growth_rate ? inputs.terminal_growth_rate * 100 : 0),
        deductDebt: inputs.deduct_debt !== false,
        // Default true
        addCash: inputs.add_cash !== false
        // Default true
      };
    }
    if (methodType === "peg" || methodType === "psg" || methodType?.toLowerCase().includes("peg") || methodType?.toLowerCase().includes("psg")) {
      const isPEG = methodType?.toLowerCase().includes("peg");
      return {
        type: "growth-adjusted",
        fairRatio: Number(inputs.fair_peg_ratio || inputs.fair_psg_ratio || 1.5),
        lastPrice: Number(inputs.last_price || inputs.current_price || 0),
        metric: Number(inputs.eps_without_nri || inputs.eps_ttm || inputs.sales_per_share || inputs.revenue_per_share_ttm || 0),
        metricName: isPEG ? "EPS without NRI" : "Sales per Share",
        growthRate: Number(inputs.growth_rate ? inputs.growth_rate * 100 : inputs.growth_rate_3_5y ? inputs.growth_rate_3_5y * 100 : inputs.eps_growth_rate ? inputs.eps_growth_rate * 100 : inputs.revenue_growth_rate ? inputs.revenue_growth_rate * 100 : 0),
        pe_without_nri: inputs.pe_without_nri,
        peg_ratio_without_nri: inputs.peg_ratio || inputs.peg_ratio_without_nri,
        ps_ratio: inputs.ps_ratio,
        psg_ratio: inputs.psg_ratio
      };
    }
    if (methodType?.includes("pe-") || methodType?.includes("ps-") || methodType?.includes("pb-") || methodType?.toLowerCase().includes("p/e") || methodType?.toLowerCase().includes("p/s") || methodType?.toLowerCase().includes("p/b")) {
      let ratio = 0;
      let ratioName = "";
      let metricPerShare = 0;
      let metricName = "";
      let historicalRatios = [];
      if (methodType?.includes("pe-") || methodType?.toLowerCase().includes("p/e")) {
        ratio = Number(inputs.mean_pe_ratio_5y || inputs.median_pe_ratio_5y || inputs.mean_pe_ratio_5y_without_nri || inputs.median_pe_ratio_5y_without_nri || inputs.avg_pe || inputs.median_pe || 0);
        ratioName = methodType?.includes("mean") || methodType?.includes("Mean") ? "Mean P/E Ratio (5Y)" : "Median P/E Ratio (5Y)";
        metricPerShare = Number(inputs.eps_ttm || inputs.eps_ttm_without_nri || inputs.eps || 0);
        metricName = inputs.exclude_nri || inputs.eps_ttm_without_nri ? "EPS without NRI" : "EPS TTM";
        historicalRatios = inputs.pe_ratios || inputs.historical_pe || [];
      } else if (methodType?.includes("ps-") || methodType?.toLowerCase().includes("p/s")) {
        ratio = Number(inputs.mean_ps_ratio_5y || inputs.median_ps_ratio_5y || inputs.avg_ps || inputs.median_ps || 0);
        ratioName = methodType?.includes("mean") || methodType?.includes("Mean") ? "Mean P/S Ratio (5Y)" : "Median P/S Ratio (5Y)";
        metricPerShare = Number(inputs.sales_per_share_ttm || inputs.revenue_per_share_ttm || inputs.sales_per_share || 0);
        metricName = "Sales per Share TTM";
        historicalRatios = inputs.ps_ratios || inputs.historical_ps || [];
      } else if (methodType?.includes("pb-") || methodType?.toLowerCase().includes("p/b")) {
        ratio = Number(inputs.mean_pb_ratio_5y || inputs.median_pb_ratio_5y || inputs.mean_pb_ratio_5y_without_nri || inputs.median_pb_ratio_5y_without_nri || inputs.avg_pb || inputs.median_pb || 0);
        ratioName = methodType?.includes("mean") || methodType?.includes("Mean") ? "Mean P/B Ratio (5Y)" : "Median P/B Ratio (5Y)";
        metricPerShare = Number(inputs.book_value_per_share_ttm || inputs.book_value_per_share_ttm_without_nri || inputs.book_value_per_share || 0);
        metricName = inputs.exclude_nri || inputs.book_value_per_share_ttm_without_nri ? "Book Value per Share without NRI" : "Book Value per Share TTM";
        historicalRatios = inputs.pb_ratios || inputs.historical_pb || [];
      }
      return {
        type: "multiples",
        ratio,
        ratioName,
        currentPrice: Number(inputs.current_price || inputs.last_price || 0),
        metricPerShare,
        metricName,
        historicalRatios
      };
    }
    console.warn(`[useMethodInputMapper] Unknown method type: ${methodType}`);
    return null;
  }, [selectedMethod, valuationChartData]);
}
function CustomMethodSelector({
  value,
  onChange
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
    className: "space-y-2 mt-4 p-4 border rounded-lg bg-muted/30",
    children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
      className: "flex items-center justify-between",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label$1, {
        htmlFor: "custom-based-on",
        className: "text-sm font-medium",
        children: "Based On"
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs(HoverCard, {
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx(HoverCardTrigger, {
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(Info, {
            className: "h-4 w-4 text-muted-foreground cursor-help"
          })
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(HoverCardContent, {
          className: "w-80",
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "space-y-2 text-sm",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("p", {
              className: "font-semibold",
              children: "Choose your cash flow basis:"
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("ul", {
              className: "space-y-1 text-muted-foreground",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("li", {
                children: ["• ", /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                  className: "font-medium",
                  children: "OCF"
                }), ": Cash from core operations (most conservative)"]
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("li", {
                children: ["• ", /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                  className: "font-medium",
                  children: "FCF"
                }), ": OCF minus CapEx (recommended)"]
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("li", {
                children: ["• ", /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                  className: "font-medium",
                  children: "NI"
                }), ": Accounting profit (least conservative)"]
              })]
            })]
          })
        })]
      })]
    }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, {
      value,
      onValueChange: onChange,
      children: [/* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, {
        id: "custom-based-on",
        className: "w-full",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {
          placeholder: "Select cash flow type"
        })
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, {
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
          value: "ocf",
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex flex-col items-start",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
              className: "font-medium",
              children: "Operating Cash Flow (OCF)"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
              className: "text-xs text-muted-foreground",
              children: "Most conservative approach"
            })]
          })
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
          value: "fcf",
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex flex-col items-start",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
              className: "font-medium",
              children: "Free Cash Flow (FCF)"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
              className: "text-xs text-muted-foreground",
              children: "Recommended for most stocks"
            })]
          })
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
          value: "ni",
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex flex-col items-start",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
              className: "font-medium",
              children: "Net Income (NI)"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
              className: "text-xs text-muted-foreground",
              children: "Accounting-based approach"
            })]
          })
        })]
      })]
    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
      className: "flex items-center gap-2 mt-2",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, {
        variant: "secondary",
        className: "text-xs",
        children: ["Using ", value.toUpperCase(), " for DCF calculation"]
      }), value === "fcf" && /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, {
        variant: "outline",
        className: "text-xs text-green-600 border-green-600",
        children: "Recommended"
      })]
    }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
      className: "text-xs text-muted-foreground mt-2",
      children: "The selected metric will be used as the base for 20-year discounted cash flow projections. Different metrics can yield significantly different intrinsic values."
    })]
  });
}
function IntrinsicValue({
  symbol: urlSymbol
} = {}) {
  const [selectedStock, setSelectedStock] = reactExports.useState(null);
  const [searchQuery, setSearchQuery] = reactExports.useState("");
  const [isCalculating, setIsCalculating] = reactExports.useState(false);
  const [calculation, setCalculation] = reactExports.useState(null);
  const [useRealtime, setUseRealtime] = reactExports.useState(true);
  const [basedOn, setBasedOn] = reactExports.useState("fcf");
  const [showAllMethods, setShowAllMethods] = reactExports.useState(false);
  const [selectedMethod, setSelectedMethod] = reactExports.useState("alfavalue");
  const [customBasedOn, setCustomBasedOn] = reactExports.useState(() => {
    try {
      const saved = localStorage.getItem("alfavalue-custom-based-on");
      if (saved && ["ocf", "fcf", "ni"].includes(saved)) {
        return saved;
      }
    } catch (error) {
      console.error("Failed to load customBasedOn from localStorage:", error);
    }
    return "fcf";
  });
  const getEffectiveMethodId = (method) => {
    if (method !== "custom") return method;
    const methodMap = {
      "ocf": "dcf-20-ocf",
      "fcf": "dcf-20-fcf",
      "ni": "dcf-20-ni"
    };
    return methodMap[customBasedOn];
  };
  const [myCalculation, setMyCalculation] = reactExports.useState({
    stockPrice: 0,
    iv: 0,
    premium: 0,
    operatingCF: 0,
    totalDebt: 0,
    cash: 0,
    discountRate: 0,
    shares: 0,
    growth_1_5: 0,
    growth_6_10: 0,
    growth_11_20: 0,
    deductDebt: true,
    addCash: true
  });
  const {
    toast
  } = useToast();
  const [eps, setEps] = reactExports.useState("6.13");
  const [growthRate, setGrowthRate] = reactExports.useState(8);
  const [discountRate, setDiscountRate] = reactExports.useState(10);
  const [terminalGrowth, setTerminalGrowth] = reactExports.useState(3);
  const [years, setYears] = reactExports.useState(10);
  const [presetKey, setPresetKey] = reactExports.useState(null);
  reactExports.useEffect(() => {
    let symbolToLoad = urlSymbol;
    if (!symbolToLoad) {
      const searchParams = new URLSearchParams(window.location.search);
      symbolToLoad = searchParams.get("symbol") || void 0;
    }
    if (symbolToLoad) {
      const normalizedSymbol2 = symbolToLoad.toUpperCase();
      if (selectedStock?.symbol !== normalizedSymbol2) {
        setSearchQuery(normalizedSymbol2);
        const stockFromUrl = {
          symbol: normalizedSymbol2,
          name: normalizedSymbol2,
          // Will be updated when data loads
          price: 0,
          change: 0,
          changePercent: 0,
          volume: 0,
          marketCap: 0
        };
        setSelectedStock(stockFromUrl);
      }
    }
  }, [urlSymbol]);
  const normalizedSymbol = (selectedStock?.symbol || "").replace(".", "-");
  const {
    quote: realtimeQuote,
    isConnected
  } = useRealtimeQuote(selectedStock?.symbol || "", {
    enabled: useRealtime && !!selectedStock?.symbol
  });
  const {
    data: fundamentals
  } = useCachedFundamentals(normalizedSymbol || "", {
    enabled: !!selectedStock?.symbol
  });
  const {
    data: financials
  } = useCachedFinancials(normalizedSymbol || "", {
    enabled: !!selectedStock?.symbol
  });
  const {
    data: cachedQuoteResp
  } = useCachedQuote(normalizedSymbol || "", {
    enabled: !!selectedStock?.symbol
  });
  const cachedQuote = cachedQuoteResp && cachedQuoteResp.data ? cachedQuoteResp.data : cachedQuoteResp;
  const {
    data: dcfData
  } = useQuery({
    queryKey: [`/api/market-data/dcf/${normalizedSymbol}`],
    enabled: !!selectedStock?.symbol,
    staleTime: 5 * 60 * 1e3
    // 5 minutes
  });
  const {
    data: alfaValueData,
    isLoading: isLoadingAlfaValue
  } = useAlfaValue(normalizedSymbol);
  const {
    data: valuationChartData,
    isLoading: isLoadingValuationChart,
    error: valuationChartError
  } = useValuationChart(normalizedSymbol, {
    basedOn,
    excludeNRI: false,
    enabled: !!selectedStock?.symbol && showAllMethods
  });
  const effectiveMethodIdForMapper = selectedMethod === "custom" ? getEffectiveMethodId(selectedMethod) : selectedMethod;
  const mappedInputs = useMethodInputMapper(effectiveMethodIdForMapper, valuationChartData);
  const {
    data: officialIV
  } = useQuery({
    queryKey: [`/api/valuation/intrinsic/${normalizedSymbol}`],
    enabled: !!selectedStock?.symbol && !alfaValueData,
    // only fetch if AlfaValue not available
    staleTime: 24 * 60 * 60 * 1e3
  });
  const {
    data: cachedIV
  } = useQuery({
    queryKey: [`/api/cache/intrinsic-values/${normalizedSymbol}`],
    enabled: !!selectedStock?.symbol && !alfaValueData && !officialIV,
    // only fetch if AlfaValue not available
    staleTime: 24 * 60 * 60 * 1e3
  });
  reactExports.useEffect(() => {
    if (!selectedStock) return;
    try {
      const payload = officialIV || cachedIV;
      const data = payload?.data ?? payload;
      if (!data || !data.intrinsicValue) return;
      const currentPrice = parseFloat(data.currentPrice || "0");
      const intrinsic = parseFloat(data.intrinsicValue || "0");
      if (!intrinsic || !currentPrice) return;
      const discount = (currentPrice - intrinsic) / intrinsic * 100;
      setCalculation({
        currentPrice,
        intrinsicValue: intrinsic,
        discount,
        isUndervalued: String(data.valuation || "").toLowerCase() === "undervalued" || discount < 0,
        methods: [{
          method: "Cached IV",
          value: intrinsic,
          description: "Last calculated intrinsic value from cache",
          confidence: 85
        }]
      });
    } catch {
    }
  }, [officialIV, cachedIV, selectedStock?.symbol]);
  reactExports.useEffect(() => {
    if (selectedMethod === "custom") {
      try {
        localStorage.setItem("alfavalue-custom-based-on", customBasedOn);
      } catch (error) {
        console.error("Failed to save customBasedOn to localStorage:", error);
      }
    }
  }, [customBasedOn, selectedMethod]);
  reactExports.useEffect(() => {
    if (!selectedStock || !presetKey) return;
    try {
      const payload = officialIV || cachedIV;
      const data = payload?.data ?? payload ?? {};
      const epsFromOfficial = parseFloat(String(data?.eps ?? ""));
      const epsFromFund = parseFloat(String(fundamentals?.eps ?? fundamentals?.EPS ?? ""));
      const epsValue = Number.isFinite(epsFromOfficial) && epsFromOfficial > 0 ? epsFromOfficial : Number.isFinite(epsFromFund) && epsFromFund > 0 ? epsFromFund : parseFloat(eps);
      const px = Number(realtimeQuote?.price ?? cachedQuote?.price ?? cachedQuote?.close ?? cachedQuote?.last ?? selectedStock.price ?? 0);
      const preset = presetKey === "conservative" ? {
        growthRate: 5,
        discountRate: 11,
        terminalGrowth: 2,
        peTerminal: 18,
        marginOfSafety: 30,
        projectionYears: 10
      } : presetKey === "base" ? {
        growthRate: 8,
        discountRate: 10,
        terminalGrowth: 2,
        peTerminal: 22,
        marginOfSafety: 25,
        projectionYears: 10
      } : {
        growthRate: 12,
        discountRate: 9,
        terminalGrowth: 2.5,
        peTerminal: 25,
        marginOfSafety: 20,
        projectionYears: 10
      };
      const dcfVal = calculateDCF2(epsValue, preset.growthRate, preset.discountRate, preset.terminalGrowth, preset.projectionYears);
      const peVal = calculatePE(epsValue, preset.peTerminal);
      const blended = 0.7 * dcfVal + 0.3 * peVal;
      const withMOS = blended * (1 - preset.marginOfSafety / 100);
      const discountPct = withMOS > 0 ? (px - withMOS) / withMOS * 100 : 0;
      setCalculation({
        currentPrice: px,
        intrinsicValue: withMOS,
        discount: discountPct,
        isUndervalued: discountPct < 0,
        methods: [{
          method: "DCF (preset)",
          value: dcfVal,
          description: "DCF based on preset inputs",
          confidence: 80
        }, {
          method: "P/E Terminal",
          value: peVal,
          description: "EPS × P/E terminal",
          confidence: 60
        }]
      });
    } catch {
    }
  }, [presetKey, officialIV, cachedIV, fundamentals, realtimeQuote, cachedQuote, selectedStock?.symbol]);
  reactExports.useEffect(() => {
    if (selectedStock?.symbol) {
      console.log("[IntrinsicValue] Selected stock:", selectedStock.symbol);
    }
  }, [selectedStock?.symbol]);
  reactExports.useEffect(() => {
    if (selectedStock && realtimeQuote && calculation) {
      const newPrice = realtimeQuote.price;
      const valuationDiff = calculation.intrinsicValue ? (newPrice - calculation.intrinsicValue) / calculation.intrinsicValue * 100 : 0;
      setCalculation((prev) => prev ? {
        ...prev,
        currentPrice: newPrice,
        discount: valuationDiff,
        isUndervalued: valuationDiff < 0
      } : null);
    }
  }, [realtimeQuote]);
  const calculateDCF2 = (eps2, growth, discount, terminal, years2) => {
    let totalValue = 0;
    let currentEps = eps2;
    for (let i = 1; i <= years2; i++) {
      currentEps *= 1 + growth / 100;
      totalValue += currentEps / Math.pow(1 + discount / 100, i);
    }
    const terminalValue = currentEps * (1 + terminal / 100) / (discount / 100 - terminal / 100);
    totalValue += terminalValue / Math.pow(1 + discount / 100, years2);
    return totalValue;
  };
  const calculatePE = (eps2, peRatio) => {
    return eps2 * peRatio;
  };
  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };
  const formatPercentage = (value) => {
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
  };
  const pieData = calculation ? [{
    name: "Undervalued",
    value: calculation.isUndervalued ? Math.abs(calculation.discount) : 0,
    color: "#10b981"
  }, {
    name: "Fair Value",
    value: calculation.isUndervalued ? 100 - Math.abs(calculation.discount) : Math.abs(calculation.discount),
    color: "#f59e0b"
  }, {
    name: "Overvalued",
    value: calculation.isUndervalued ? 0 : 100 - Math.abs(calculation.discount),
    color: "#ef4444"
  }] : [];
  const barData = calculation?.methods.map((method) => ({
    name: method.method,
    value: method.value,
    current: calculation.currentPrice
  })) || [];
  const presetConfig = presetKey ? presetKey === "conservative" ? {
    growthRate: 5,
    discountRate: 11,
    terminalGrowth: 2,
    marginOfSafety: 30,
    projectionYears: 10
  } : presetKey === "base" ? {
    growthRate: 8,
    discountRate: 10,
    terminalGrowth: 2,
    marginOfSafety: 25,
    projectionYears: 10
  } : {
    growthRate: 12,
    discountRate: 9,
    terminalGrowth: 2.5,
    marginOfSafety: 20,
    projectionYears: 10
  } : null;
  const handleMyCalculationChange = (field, value) => {
    setMyCalculation((prev) => ({
      ...prev,
      [field]: value
    }));
  };
  const handleCalculate = async () => {
    if (!selectedStock?.symbol) return;
    try {
      toast({
        title: "Calculating...",
        description: "Computing custom intrinsic value"
      });
      const response = await fetch(`/api/iv/${normalizedSymbol}/calculate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          method: selectedMethod,
          based_on: basedOn,
          operating_cf: myCalculation.operatingCF,
          total_debt: myCalculation.totalDebt,
          cash: myCalculation.cash,
          discount_rate: myCalculation.discountRate / 100,
          shares: myCalculation.shares,
          growth_1_5: myCalculation.growth_1_5 / 100,
          growth_6_10: myCalculation.growth_6_10 / 100,
          growth_11_20: myCalculation.growth_11_20 / 100,
          deduct_debt: myCalculation.deductDebt,
          add_cash: myCalculation.addCash
        })
      });
      if (!response.ok) {
        throw new Error("Calculation failed");
      }
      const result = await response.json();
      const newIV = result.iv;
      const newPremium = (myCalculation.stockPrice - newIV) / newIV * 100;
      setMyCalculation((prev) => ({
        ...prev,
        iv: newIV,
        premium: newPremium
      }));
      toast({
        title: "Calculation complete",
        description: `New intrinsic value: $${newIV.toFixed(2)}`
      });
    } catch (error) {
      console.error("Calculate error:", error);
      toast({
        variant: "destructive",
        title: "Calculation failed",
        description: "Please check your inputs and try again"
      });
    }
  };
  const handleSave = () => {
    if (!selectedStock?.symbol) return;
    try {
      const storageKey = `alfalyzer_${normalizedSymbol}_assumptions`;
      localStorage.setItem(storageKey, JSON.stringify(myCalculation));
      toast({
        title: "Assumptions saved",
        description: `Saved for ${selectedStock.symbol}`
      });
    } catch (error) {
      console.error("Save error:", error);
      toast({
        variant: "destructive",
        title: "Save failed",
        description: "Could not save to localStorage"
      });
    }
  };
  const handleLoad = () => {
    if (!selectedStock?.symbol) return;
    try {
      const storageKey = `alfalyzer_${normalizedSymbol}_assumptions`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const loadedData = JSON.parse(saved);
        setMyCalculation(loadedData);
        toast({
          title: "Assumptions loaded",
          description: `Loaded for ${selectedStock.symbol}`
        });
      } else {
        toast({
          title: "No saved data",
          description: "No assumptions found for this stock"
        });
      }
    } catch (error) {
      console.error("Load error:", error);
      toast({
        variant: "destructive",
        title: "Load failed",
        description: "Could not load from localStorage"
      });
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(MainLayout, {
    children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
      className: "container mx-auto px-6 py-8 max-w-7xl",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "mb-8",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "flex items-center justify-between mb-4",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex items-center gap-3",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
              className: "p-2 bg-teya-green/10 rounded-xl",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(Calculator, {
                className: "h-6 w-6 text-primary"
              })
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h1", {
                className: "text-3xl font-bold text-foreground",
                children: "Intrinsic Value Calculator"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                className: "text-muted-foreground",
                children: "Calculate the true worth of any stock with advanced valuation methods"
              })]
            })]
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
        }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
          className: "max-w-2xl",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(UniversalSearch, {
            onSelect: (stock) => {
              setSelectedStock(stock);
              setSearchQuery(stock.symbol);
              setCalculation(null);
              setPresetKey("base");
            },
            placeholder: "Search for a stock to analyze...",
            showRecentSearches: true,
            showPopularStocks: true
          })
        })]
      }), selectedStock && /* @__PURE__ */ jsxRuntimeExports.jsxs(motion.div, {
        initial: {
          opacity: 0,
          y: 20
        },
        animate: {
          opacity: 1,
          y: 0
        },
        className: "space-y-6",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Card, {
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
            className: "p-6",
            children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "flex items-center justify-between",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "flex items-center gap-4",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                  className: "w-12 h-12 bg-teya-green/20 rounded-lg flex items-center justify-center",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                    className: "font-bold text-primary",
                    children: selectedStock.symbol.charAt(0)
                  })
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h2", {
                    className: "text-2xl font-bold",
                    children: selectedStock.symbol
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                    className: "text-muted-foreground",
                    children: selectedStock.name
                  }), selectedStock.sector && /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, {
                    variant: "secondary",
                    children: selectedStock.sector
                  })]
                })]
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "text-right relative",
                children: [useRealtime && isConnected && realtimeQuote && /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                  className: "absolute -top-2 -right-2",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                    className: "inline-flex h-2 w-2 rounded-full bg-green-500 animate-pulse",
                    title: "Dados em tempo real"
                  })
                }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                  className: "text-3xl font-bold",
                  children: formatCurrency((realtimeQuote?.price ?? cachedQuote?.price ?? cachedQuote?.close ?? cachedQuote?.last ?? 0) || parseFloat(String(selectedStock.price || 0)))
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: `flex items-center gap-1 ${(realtimeQuote?.change ?? cachedQuote?.change ?? parseFloat(String(selectedStock.changePercent || 0))) >= 0 ? "text-green-600" : "text-red-600"}`,
                  children: [(realtimeQuote?.change ?? cachedQuote?.change ?? parseFloat(String(selectedStock.changePercent || 0))) >= 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowUp, {
                    className: "h-4 w-4"
                  }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowDown, {
                    className: "h-4 w-4"
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                    children: `${(realtimeQuote?.change_percent ?? cachedQuote?.changePercent ?? cachedQuote?.change_percent ?? parseFloat(String(selectedStock.changePercent || 0))) >= 0 ? "+" : ""}${((realtimeQuote?.change_percent ?? cachedQuote?.changePercent ?? cachedQuote?.change_percent ?? parseFloat(String(selectedStock.changePercent || 0))) || 0).toFixed(2)}%`
                  })]
                })]
              })]
            })
          })
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(AlfaValueHeader, {
          ticker: normalizedSymbol
        }), alfaValueData && /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
            children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "flex items-center justify-between",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "flex items-center gap-3",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(ChartColumn, {
                  className: "h-5 w-5 text-primary"
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, {
                    children: "Compare All Valuation Methods"
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
                    className: "text-sm text-muted-foreground mt-1",
                    children: ["See how 10+ different valuation models assess ", selectedStock.symbol, "'s fair value"]
                  })]
                })]
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
                variant: showAllMethods ? "default" : "outline",
                onClick: () => setShowAllMethods(!showAllMethods),
                className: showAllMethods ? "bg-teya-green hover:bg-teya-green-dark text-black" : "",
                children: showAllMethods ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, {
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx(ChartColumn, {
                    className: "w-4 h-4 mr-2"
                  }), "Hide Methods"]
                }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, {
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx(ChartColumn, {
                    className: "w-4 h-4 mr-2"
                  }), "Show All Methods"]
                })
              })]
            })
          }), showAllMethods && /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
            className: "space-y-6",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "flex flex-col sm:flex-row items-start sm:items-center gap-4",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label$1, {
                htmlFor: "method-selector",
                className: "text-sm font-medium min-w-[80px]",
                children: "Method:"
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, {
                value: selectedMethod,
                onValueChange: (value) => setSelectedMethod(value),
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, {
                  id: "method-selector",
                  className: "flex-1",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {
                    placeholder: "Select valuation method"
                  })
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, {
                  className: "max-h-[400px]",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                    value: "alfavalue",
                    children: "AlfaValue™ (Proprietary)"
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectGroup, {
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx(SelectLabel, {
                      className: "text-xs text-muted-foreground mt-2",
                      children: "DCF Models"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                      value: "dcf-20-fcf",
                      children: "DCF-20 Free Cash Flow"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                      value: "dcf-20-ocf",
                      children: "DCF-20 Operating Cash Flow"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                      value: "dcf-20-ni",
                      children: "DCF-20 Net Income"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                      value: "dni-20",
                      children: "DNI-20 Net Income"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                      value: "dfcf-terminal",
                      children: "DFCF Terminal (FMP)"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                      value: "dfcf-20",
                      children: "DFCF-20 (FMP)"
                    })]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectGroup, {
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx(SelectLabel, {
                      className: "text-xs text-muted-foreground mt-2",
                      children: "Historical Multiples"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                      value: "pe-mean",
                      children: "P/E Mean 5Y"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                      value: "pe-mean-nri",
                      children: "P/E Mean 5Y (without NRI)"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                      value: "ps-mean",
                      children: "P/S Mean 5Y"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                      value: "pb-mean",
                      children: "P/B Mean 5Y"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                      value: "pb-mean-nri",
                      children: "P/B Mean 5Y (without NRI)"
                    })]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectGroup, {
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx(SelectLabel, {
                      className: "text-xs text-muted-foreground mt-2",
                      children: "Growth-Adjusted"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                      value: "peg",
                      children: "PEG Ratio"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                      value: "psg",
                      children: "PSG Ratio"
                    })]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectGroup, {
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx(SelectLabel, {
                      className: "text-xs text-muted-foreground mt-2",
                      children: "Custom"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                      value: "custom",
                      children: "Custom (DCF with selectable base)"
                    })]
                  })]
                })]
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, {
                variant: "outline",
                className: "hidden sm:flex",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Info, {
                  className: "h-3 w-3 mr-1"
                }), "15 Methods"]
              })]
            }), selectedMethod === "custom" && /* @__PURE__ */ jsxRuntimeExports.jsx(CustomMethodSelector, {
              value: customBasedOn,
              onChange: setCustomBasedOn
            }), selectedMethod.includes("dcf") && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "flex items-center gap-4",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label$1, {
                htmlFor: "based-on-selector",
                className: "text-sm font-medium min-w-[80px]",
                children: "Based On:"
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, {
                value: basedOn,
                onValueChange: (value) => setBasedOn(value),
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, {
                  id: "based-on-selector",
                  className: "w-[200px]",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {
                    placeholder: "Select base metric"
                  })
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, {
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                    value: "fcf",
                    children: "Free Cash Flow (FCF)"
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                    value: "ocf",
                    children: "Operating Cash Flow (OCF)"
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                    value: "ni",
                    children: "Net Income (NI)"
                  })]
                })]
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, {
                variant: "outline",
                className: "ml-auto",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Info, {
                  className: "h-3 w-3 mr-1"
                }), "Changes DCF calculations basis"]
              })]
            }), isLoadingValuationChart && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "text-center py-8",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(motion.div, {
                animate: {
                  rotate: 360
                },
                transition: {
                  duration: 2,
                  repeat: Infinity,
                  ease: "linear"
                },
                className: "w-12 h-12 mx-auto mb-4",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(Calculator, {
                  className: "w-full h-full text-primary"
                })
              }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                className: "text-muted-foreground",
                children: "Loading valuation methods..."
              })]
            }), valuationChartError && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "text-center py-8 text-red-500",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                children: "Failed to load valuation methods"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                className: "text-sm text-muted-foreground mt-2",
                children: valuationChartError instanceof Error ? valuationChartError.message : "Unknown error"
              })]
            }), valuationChartData && alfaValueData && (() => {
              const effectiveMethodId = getEffectiveMethodId(selectedMethod);
              const autoMethod = valuationChartData.methods.find((m) => m.method_id === effectiveMethodId);
              const price = realtimeQuote?.price ?? cachedQuote?.price ?? cachedQuote?.close ?? cachedQuote?.last ?? valuationChartData.price ?? parseFloat(String(selectedStock.price || 0));
              const iv = autoMethod?.iv || alfaValueData.iv;
              const premium = iv > 0 ? (price - iv) / iv * 100 : 0;
              const autoCalculation = {
                stockPrice: price,
                iv,
                premium,
                // These fields are no longer used (replaced by mappedInputs)
                operatingCF: 0,
                totalDebt: 0,
                cash: 0,
                discountRate: 0,
                shares: 0,
                growth_1_5: 0,
                growth_6_10: 0,
                growth_11_20: 0
              };
              return /* @__PURE__ */ jsxRuntimeExports.jsx(DualValuationLayout, {
                method: selectedMethod,
                autoCalculation,
                myCalculation,
                mappedInputs,
                onMyCalculationChange: handleMyCalculationChange,
                onCalculate: handleCalculate,
                onSave: handleSave,
                onLoad: handleLoad
              });
            })(), valuationChartData && /* @__PURE__ */ jsxRuntimeExports.jsx(ValuationMethodsChart, {
              methods: valuationChartData.methods,
              currentPrice: valuationChartData.price,
              highlightMethod: selectedMethod
            })]
          })]
        }), alfaValueData && /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
          className: "border-blue-500/20 bg-gradient-to-r from-blue-500/5 to-transparent",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
            children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, {
              className: "flex items-center gap-2",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Info, {
                className: "h-5 w-5 text-blue-500"
              }), "How is Intrinsic Value Calculated?"]
            })
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
            className: "space-y-6",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
              className: "prose prose-sm max-w-none",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                className: "text-muted-foreground",
                children: "AlfaValue™ uses a 20-year Discounted Cash Flow (DCF) model to calculate intrinsic value. The model projects future cash flows and discounts them back to present value using a company-specific discount rate (WACC)."
              })
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "grid grid-cols-1 md:grid-cols-3 gap-4",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "p-4 border rounded-lg bg-background/50",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "flex items-center gap-2 mb-3",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                    className: "w-8 h-8 rounded-full bg-teya-green/10 flex items-center justify-center text-teya-green font-bold",
                    children: "1"
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx("h4", {
                    className: "font-semibold",
                    children: "Project Cash Flows"
                  })]
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "space-y-2 text-sm",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex justify-between",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "text-muted-foreground",
                      children: "Starting FCF:"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
                      className: "font-medium",
                      children: ["$", alfaValueData.inputs.fcf_ttm_musd.toFixed(0), "M"]
                    })]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex justify-between",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "text-muted-foreground",
                      children: "Years 1-5 Growth:"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
                      className: "font-medium text-green-600",
                      children: [(alfaValueData.assumptions.g_1_5 * 100).toFixed(1), "%"]
                    })]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex justify-between",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "text-muted-foreground",
                      children: "Years 6-10 Growth:"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
                      className: "font-medium text-green-600",
                      children: [(alfaValueData.assumptions.g_6_10 * 100).toFixed(1), "%"]
                    })]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex justify-between",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "text-muted-foreground",
                      children: "Years 11-20 Growth:"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
                      className: "font-medium text-green-600",
                      children: [(alfaValueData.assumptions.g_11_20 * 100).toFixed(1), "%"]
                    })]
                  })]
                })]
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "p-4 border rounded-lg bg-background/50",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "flex items-center gap-2 mb-3",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                    className: "w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 font-bold",
                    children: "2"
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx("h4", {
                    className: "font-semibold",
                    children: "Discount to Present Value"
                  })]
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "space-y-2 text-sm",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex justify-between",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "text-muted-foreground",
                      children: "Risk-Free Rate:"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
                      className: "font-medium",
                      children: [(alfaValueData.assumptions.rf * 100).toFixed(2), "%"]
                    })]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex justify-between",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "text-muted-foreground",
                      children: "Beta:"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "font-medium",
                      children: alfaValueData.assumptions.beta.toFixed(2)
                    })]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex justify-between",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "text-muted-foreground",
                      children: "Market Risk Premium:"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
                      className: "font-medium",
                      children: [(alfaValueData.assumptions.mrp * 100).toFixed(1), "%"]
                    })]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex justify-between pt-2 border-t",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "font-medium",
                      children: "WACC (Discount Rate):"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
                      className: "font-bold text-blue-600",
                      children: [(alfaValueData.assumptions.discount_rate * 100).toFixed(2), "%"]
                    })]
                  })]
                })]
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "p-4 border rounded-lg bg-background/50",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "flex items-center gap-2 mb-3",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                    className: "w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500 font-bold",
                    children: "3"
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx("h4", {
                    className: "font-semibold",
                    children: "Adjust for Balance Sheet"
                  })]
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "space-y-2 text-sm",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex justify-between",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "text-muted-foreground",
                      children: "Enterprise Value:"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "font-medium",
                      children: "Calculated"
                    })]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex justify-between text-green-600",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      children: "+ Cash:"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
                      className: "font-medium",
                      children: ["$", alfaValueData.inputs.cash_musd.toFixed(0), "M"]
                    })]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex justify-between text-red-600",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      children: "- Debt:"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
                      className: "font-medium",
                      children: ["$", alfaValueData.inputs.debt_musd.toFixed(0), "M"]
                    })]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex justify-between pt-2 border-t",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "font-medium",
                      children: "÷ Shares:"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
                      className: "font-bold",
                      children: [alfaValueData.inputs.shares_m.toFixed(0), "M"]
                    })]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex justify-between pt-2 border-t",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "font-bold text-teya-green",
                      children: "Intrinsic Value/Share:"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "font-bold text-teya-green text-lg",
                      children: formatCurrency(alfaValueData.iv)
                    })]
                  })]
                })]
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "p-4 bg-secondary/30 rounded-lg border border-secondary",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h4", {
                className: "font-semibold mb-2 text-sm",
                children: "DCF Formula"
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "font-mono text-xs text-muted-foreground overflow-x-auto",
                children: ["IV = Σ(FCF", /* @__PURE__ */ jsxRuntimeExports.jsx("sub", {
                  children: "t"
                }), " / (1 + WACC)", /* @__PURE__ */ jsxRuntimeExports.jsx("sup", {
                  children: "t"
                }), ") + (Cash - Debt) / Shares"]
              })]
            })]
          })]
        }), !alfaValueData && /* @__PURE__ */ jsxRuntimeExports.jsx(Card, {
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
            className: "p-6",
            children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "grid grid-cols-1 md:grid-cols-4 gap-6 items-center",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                  className: "text-sm text-muted-foreground",
                  children: "Valor Intrínseco Oficial"
                }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                  className: "text-2xl font-bold text-primary",
                  children: (() => {
                    const payload = officialIV || cachedIV;
                    const data = payload?.data ?? payload;
                    const iv = data?.intrinsicValue ? parseFloat(data.intrinsicValue) : null;
                    return iv ? formatCurrency(iv) : "N/A";
                  })()
                })]
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                  className: "text-sm text-muted-foreground",
                  children: "Preço Atual"
                }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                  className: "text-2xl font-bold",
                  children: formatCurrency((realtimeQuote?.price ?? cachedQuote?.price ?? cachedQuote?.close ?? cachedQuote?.last ?? 0) || parseFloat(String(selectedStock.price || 0)))
                })]
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "text-right",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                  className: "text-sm text-muted-foreground",
                  children: "Upside vs. VI"
                }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                  className: `text-2xl font-bold ${(() => {
                    const payload = officialIV || cachedIV;
                    const data = payload?.data ?? payload;
                    const iv = data?.intrinsicValue ? parseFloat(data.intrinsicValue) : null;
                    const px = Number(realtimeQuote?.price ?? cachedQuote?.price ?? cachedQuote?.close ?? cachedQuote?.last ?? 0);
                    const diff = iv && px ? (iv - px) / px * 100 : null;
                    return diff !== null && diff > 0 ? "text-green-600" : "text-red-600";
                  })()}`,
                  children: (() => {
                    const payload = officialIV || cachedIV;
                    const data = payload?.data ?? payload;
                    const iv = data?.intrinsicValue ? parseFloat(data.intrinsicValue) : null;
                    const px = Number(realtimeQuote?.price ?? cachedQuote?.price ?? cachedQuote?.close ?? cachedQuote?.last ?? 0);
                    const diff = iv && px ? (iv - px) / px * 100 : null;
                    return diff === null ? "—" : `${diff.toFixed(1)}%`;
                  })()
                }), (() => {
                  const payload = officialIV || cachedIV;
                  const data = payload?.data ?? payload;
                  const updated = data?.calculatedAt || data?.lastUpdated;
                  return updated ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "text-xs text-muted-foreground",
                    children: ["Atualizado: ", new Date(updated).toLocaleString()]
                  }) : null;
                })()]
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                  className: "text-sm text-muted-foreground",
                  children: "VI (Cenário)"
                }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                  className: "text-2xl font-bold",
                  children: calculation?.intrinsicValue ? formatCurrency(calculation.intrinsicValue) : "—"
                }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                  className: `text-sm ${calculation ? calculation.isUndervalued ? "text-green-600" : "text-red-600" : "text-muted-foreground"}`,
                  children: calculation ? `${formatPercentage(-calculation.discount)} vs. Preço` : "Selecione um preset"
                })]
              })]
            })
          })
        }), !alfaValueData && /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, {
              children: "Presets de Cenário"
            })
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
            className: "flex flex-wrap gap-3",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
              variant: presetKey === "conservative" ? "default" : "outline",
              onClick: () => setPresetKey("conservative"),
              children: "Conservador"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
              variant: presetKey === "base" ? "default" : "outline",
              onClick: () => setPresetKey("base"),
              children: "Base"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
              variant: presetKey === "optimistic" ? "default" : "outline",
              onClick: () => setPresetKey("optimistic"),
              children: "Otimista"
            })]
          })]
        }), alfaValueData ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "grid grid-cols-1 lg:grid-cols-2 gap-6",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
              children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, {
                className: "flex items-center gap-2",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Target, {
                  className: "h-5 w-5 text-teya-green"
                }), "Valuation Status"]
              })
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
              className: "space-y-6",
              children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "text-center",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "grid grid-cols-2 gap-4 mb-4",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "p-4 bg-secondary/30 rounded-lg",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                      className: "text-sm text-muted-foreground",
                      children: "Current Price"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                      className: "text-2xl font-bold",
                      children: formatCurrency(alfaValueData.price)
                    })]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "p-4 bg-teya-green/10 rounded-lg",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                      className: "text-sm text-muted-foreground",
                      children: "Intrinsic Value"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                      className: "text-2xl font-bold text-teya-green",
                      children: formatCurrency(alfaValueData.iv)
                    })]
                  })]
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: cn("text-center p-4 rounded-lg", alfaValueData.status === "undervalued" ? "bg-green-500/10 border border-green-500/20" : alfaValueData.status === "overvalued" ? "bg-red-500/10 border border-red-500/20" : "bg-gray-500/10 border border-gray-500/20"),
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                    className: cn("text-2xl font-bold", alfaValueData.status === "undervalued" ? "text-green-600" : "text-red-600"),
                    children: formatPercentage(Math.abs(alfaValueData.discount_pct))
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                    className: "text-sm",
                    children: alfaValueData.status === "undervalued" ? "Discount to Fair Value" : "Premium to Fair Value"
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, {
                    className: "mt-2",
                    variant: alfaValueData.status === "undervalued" ? "default" : "secondary",
                    children: alfaValueData.status === "undervalued" ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, {
                      children: [/* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, {
                        className: "h-3 w-3 mr-1"
                      }), "Undervalued"]
                    }) : alfaValueData.status === "overvalued" ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, {
                      children: [/* @__PURE__ */ jsxRuntimeExports.jsx(TrendingDown, {
                        className: "h-3 w-3 mr-1"
                      }), "Overvalued"]
                    }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, {
                      children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Minus, {
                        className: "h-3 w-3 mr-1"
                      }), "Fairly Priced"]
                    })
                  })]
                })]
              })
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
              children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, {
                className: "flex items-center gap-2",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Activity, {
                  className: "h-5 w-5 text-purple-500"
                }), "Analysis Metadata"]
              })
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
              className: "space-y-4",
              children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "space-y-3",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "flex justify-between items-center",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                    className: "text-sm text-muted-foreground",
                    children: "Confidence Level:"
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, {
                    variant: alfaValueData.confidence === "HIGH" ? "default" : alfaValueData.confidence === "MED" ? "secondary" : "outline",
                    children: alfaValueData.confidence
                  })]
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "flex justify-between",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                    className: "text-sm text-muted-foreground",
                    children: "Sector Growth (Mid):"
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
                    className: "font-medium",
                    children: [(alfaValueData.meta.g_sector_mid * 100).toFixed(1), "%"]
                  })]
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "flex justify-between",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                    className: "text-sm text-muted-foreground",
                    children: "Growth Source:"
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                    className: "font-medium capitalize",
                    children: alfaValueData.meta.g_sector_source
                  })]
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "flex justify-between",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                    className: "text-sm text-muted-foreground",
                    children: "Region:"
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                    className: "font-medium",
                    children: alfaValueData.meta.region
                  })]
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "flex justify-between",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                    className: "text-sm text-muted-foreground",
                    children: "Terminal Growth (Regional):"
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
                    className: "font-medium",
                    children: [(alfaValueData.meta.g_term_region * 100).toFixed(1), "%"]
                  })]
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "flex justify-between pt-3 border-t",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                    className: "text-sm text-muted-foreground",
                    children: "Calculation Date:"
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                    className: "font-medium",
                    children: new Date(alfaValueData.as_of).toLocaleDateString()
                  })]
                })]
              })
            })]
          })]
        }) : isCalculating ? /* @__PURE__ */ jsxRuntimeExports.jsx(Card, {
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
            className: "p-8 text-center",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(motion.div, {
              animate: {
                rotate: 360
              },
              transition: {
                duration: 2,
                repeat: Infinity,
                ease: "linear"
              },
              className: "w-16 h-16 mx-auto mb-4",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(Calculator, {
                className: "w-full h-full text-primary"
              })
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("h3", {
              className: "text-lg font-semibold mb-2",
              children: "Calculating Intrinsic Value..."
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
              className: "text-muted-foreground mb-4",
              children: "Analyzing financial data and running valuation models"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(Progress, {
              value: 75,
              className: "max-w-xs mx-auto"
            })]
          })
        }) : calculation && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "grid grid-cols-1 lg:grid-cols-2 gap-6",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
              children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, {
                className: "flex items-center gap-2",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Target, {
                  className: "h-5 w-5"
                }), "Valuation Overview"]
              })
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
              className: "space-y-6",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "text-center",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "grid grid-cols-2 gap-4 mb-4",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "p-4 bg-secondary/30 rounded-lg",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                      className: "text-sm text-muted-foreground",
                      children: "Current Price"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                      className: "text-2xl font-bold",
                      children: formatCurrency(calculation.currentPrice)
                    })]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "p-4 bg-teya-green/10 rounded-lg",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                      className: "text-sm text-muted-foreground",
                      children: "Intrinsic Value"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                      className: "text-2xl font-bold text-primary",
                      children: formatCurrency(calculation.intrinsicValue)
                    })]
                  })]
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: `text-center p-4 rounded-lg ${calculation.isUndervalued ? "bg-green-500/10 border border-green-500/20" : "bg-red-500/10 border border-red-500/20"}`,
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                    className: `text-2xl font-bold ${calculation.isUndervalued ? "text-green-600" : "text-red-600"}`,
                    children: formatPercentage(Math.abs(calculation.discount))
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                    className: "text-sm",
                    children: calculation.isUndervalued ? "Potential Upside" : "Premium to Fair Value"
                  })]
                })]
              }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                className: "h-64",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(ResponsiveContainer$1, {
                  width: "100%",
                  height: "100%",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsxs(PieChart, {
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Pie, {
                      data: pieData,
                      cx: "50%",
                      cy: "50%",
                      outerRadius: 80,
                      innerRadius: 40,
                      paddingAngle: 5,
                      dataKey: "value",
                      children: pieData.map((entry, index) => /* @__PURE__ */ jsxRuntimeExports.jsx(Cell, {
                        fill: entry.color
                      }, `cell-${index}`))
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, {
                      formatter: (value) => [`${value.toFixed(1)}%`, ""]
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx(Legend, {})]
                  })
                })
              })]
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
              children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, {
                className: "flex items-center gap-2",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(ChartColumn, {
                  className: "h-5 w-5"
                }), "Valuation Methods"]
              })
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
              className: "space-y-4",
              children: [calculation.methods.map((method, index) => /* @__PURE__ */ jsxRuntimeExports.jsxs(motion.div, {
                initial: {
                  opacity: 0,
                  x: -20
                },
                animate: {
                  opacity: 1,
                  x: 0
                },
                transition: {
                  delay: index * 0.1
                },
                className: "space-y-2",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "flex items-center justify-between",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                      className: "font-medium",
                      children: method.method
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                      className: "text-sm text-muted-foreground",
                      children: method.description
                    })]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "text-right",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                      className: "font-bold",
                      children: formatCurrency(method.value)
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                      className: "text-xs text-muted-foreground",
                      children: [method.confidence, "% confidence"]
                    })]
                  })]
                }), /* @__PURE__ */ jsxRuntimeExports.jsx(Progress, {
                  value: method.confidence,
                  className: "h-1"
                })]
              }, method.method)), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                className: "h-48",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(ResponsiveContainer$1, {
                  width: "100%",
                  height: "100%",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsxs(BarChart, {
                    data: barData,
                    margin: {
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 5
                    },
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CartesianGrid, {
                      strokeDasharray: "3 3",
                      stroke: "#374151",
                      opacity: 0.3
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx(XAxis, {
                      dataKey: "name",
                      tick: {
                        fontSize: 10,
                        fill: "#9CA3AF"
                      },
                      angle: -45,
                      textAnchor: "end",
                      height: 60
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx(YAxis, {
                      tick: {
                        fontSize: 10,
                        fill: "#9CA3AF"
                      },
                      tickFormatter: (value) => `$${value}`
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, {
                      formatter: (value, name) => [formatCurrency(value), name === "value" ? "Intrinsic Value" : "Current Price"],
                      labelStyle: {
                        color: "#1F2937"
                      },
                      contentStyle: {
                        backgroundColor: "#1F2937",
                        border: "1px solid #374151",
                        borderRadius: "8px"
                      }
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx(Legend, {}), /* @__PURE__ */ jsxRuntimeExports.jsx(Bar, {
                      dataKey: "value",
                      fill: "#10b981",
                      name: "Intrinsic Value",
                      radius: [2, 2, 0, 0]
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx(Bar, {
                      dataKey: "current",
                      fill: "#ef4444",
                      name: "Current Price",
                      radius: [2, 2, 0, 0]
                    })]
                  })
                })
              })]
            })]
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("details", {
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx("summary", {
            className: "cursor-pointer px-2 py-1 text-sm text-muted-foreground",
            children: "Avançado (opcional)"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "mt-4",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(DCFCalculatorCard, {
              symbol: normalizedSymbol,
              currentPrice: (realtimeQuote?.price ?? cachedQuote?.price ?? cachedQuote?.close ?? cachedQuote?.last ?? 0) || parseFloat(String(selectedStock.price || 0)),
              preset: presetConfig,
              onCalculate: (result) => {
                setCalculation({
                  currentPrice: realtimeQuote?.price || parseFloat(selectedStock.price),
                  intrinsicValue: result.intrinsicValuePerShare,
                  discount: result.upside,
                  isUndervalued: result.upside > 0,
                  methods: [{
                    method: "DCF (Free Cash Flow)",
                    value: result.intrinsicValuePerShare,
                    description: "Discounted Cash Flow with FCF",
                    confidence: 90
                  }, {
                    method: "Enterprise Value",
                    value: result.enterpriseValue / (dcfData?.sharesOutstanding || 1e9),
                    description: "Enterprise value per share",
                    confidence: 85
                  }, {
                    method: "With Margin of Safety",
                    value: result.intrinsicValuePerShare * 0.75,
                    description: "25% margin of safety applied",
                    confidence: 95
                  }]
                });
              }
            })
          })]
        }), false]
      }), !selectedStock && /* @__PURE__ */ jsxRuntimeExports.jsx(Card, {
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
          className: "p-12 text-center",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Calculator, {
            className: "w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("h3", {
            className: "text-lg font-semibold mb-2",
            children: "Start Your Analysis"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
            className: "text-muted-foreground mb-6",
            children: "Search for a stock above to calculate its intrinsic value using advanced valuation models"
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "grid grid-cols-1 md:grid-cols-3 gap-4 max-w-md mx-auto",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "text-center",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(DollarSign, {
                className: "w-8 h-8 mx-auto mb-2 text-primary"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                className: "text-sm font-medium",
                children: "DCF Analysis"
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "text-center",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Percent, {
                className: "w-8 h-8 mx-auto mb-2 text-primary"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                className: "text-sm font-medium",
                children: "Multiple Methods"
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "text-center",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, {
                className: "w-8 h-8 mx-auto mb-2 text-primary"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                className: "text-sm font-medium",
                children: "Real-time Data"
              })]
            })]
          })]
        })
      })]
    })
  });
}
export {
  IntrinsicValue as default
};
