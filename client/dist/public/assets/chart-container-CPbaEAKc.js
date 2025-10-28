import { j as jsxRuntimeExports, n as TrendingUp } from "./index-DF734YkB.js";
function ChartContainer({
  title,
  children,
  height = "h-64",
  subtitle,
  trend,
  value,
  change
}) {
  const getTrendColor = () => {
    switch (trend) {
      case "up":
        return "text-emerald-500";
      case "down":
        return "text-red-500";
      default:
        return "text-muted-foreground";
    }
  };
  const getTrendIcon = () => {
    if (trend === "up") return /* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, {
      className: "h-3 w-3"
    });
    if (trend === "down") return /* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, {
      className: "h-3 w-3 rotate-180"
    });
    return null;
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
    className: "bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-4 hover:bg-card/70 transition-colors",
    children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
      className: "flex items-center justify-between mb-3",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h3", {
          className: "font-medium text-sm text-foreground",
          children: title
        }), subtitle && /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
          className: "text-xs text-muted-foreground",
          children: subtitle
        })]
      }), (value || change) && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "text-right",
        children: [value && /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
          className: "text-sm font-semibold text-foreground",
          children: value
        }), change && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: `flex items-center gap-1 text-xs ${getTrendColor()}`,
          children: [getTrendIcon(), change]
        })]
      })]
    }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
      className: `${height} w-full`,
      children
    })]
  });
}
export {
  ChartContainer
};
