import { ResponsiveContainer, BarChart, XAxis, YAxis } from "./lightweight-chart-CPbISesF.js";
import { ChartContainer } from "./chart-container-CPbaEAKc.js";
import { j as jsxRuntimeExports } from "./index-DF734YkB.js";
import { T as Tooltip } from "./GraphicalItemClipPath-C5BaDaiW.js";
import { B as Bar } from "./barSelectors-C4PIc_FS.js";
function RevenueChart({
  data
}) {
  if (!data || data.length === 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(ChartContainer, {
      title: "Revenue",
      subtitle: "Quarterly revenue",
      children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
        className: "flex items-center justify-center h-full text-muted-foreground",
        children: "No revenue data available"
      })
    });
  }
  const latestRevenue = data[data.length - 1]?.value || 0;
  const previousRevenue = data[data.length - 2]?.value || latestRevenue;
  const change = latestRevenue - previousRevenue;
  const changePercent = previousRevenue ? change / previousRevenue * 100 : 0;
  const trend = change >= 0 ? "up" : "down";
  const CustomTooltip = ({
    active,
    payload,
    label
  }) => {
    if (active && payload && payload.length) {
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "bg-background border border-border rounded-lg p-3 shadow-lg",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx("p", {
          className: "text-sm font-medium",
          children: label
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
          className: "text-sm text-muted-foreground",
          children: ["Revenue: ", /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
            className: "font-semibold text-foreground",
            children: ["$", payload[0].value.toFixed(0), "M"]
          })]
        })]
      });
    }
    return null;
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(ChartContainer, {
    title: "Revenue",
    subtitle: "3.22%",
    value: `$${latestRevenue.toFixed(0)}M`,
    change: `${change >= 0 ? "+" : ""}${changePercent.toFixed(1)}%`,
    trend,
    children: /* @__PURE__ */ jsxRuntimeExports.jsx(ResponsiveContainer, {
      width: "100%",
      height: "100%",
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs(BarChart, {
        data,
        margin: {
          top: 5,
          right: 5,
          left: 5,
          bottom: 5
        },
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx(XAxis, {
          dataKey: "quarter",
          axisLine: false,
          tickLine: false,
          tick: {
            fontSize: 10,
            fill: "currentColor"
          },
          angle: -45,
          textAnchor: "end",
          height: 60
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(YAxis, {
          axisLine: false,
          tickLine: false,
          tick: {
            fontSize: 10,
            fill: "currentColor"
          },
          tickFormatter: (value) => `$${value}M`
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, {
          content: /* @__PURE__ */ jsxRuntimeExports.jsx(CustomTooltip, {})
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(Bar, {
          dataKey: "value",
          fill: "#f59e0b",
          radius: [2, 2, 0, 0]
        })]
      })
    })
  });
}
export {
  RevenueChart
};
