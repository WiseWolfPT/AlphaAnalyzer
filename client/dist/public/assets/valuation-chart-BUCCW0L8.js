import { ResponsiveContainer, AreaChart, XAxis, YAxis } from "./lightweight-chart-CPbISesF.js";
import { ChartContainer } from "./chart-container-CPbaEAKc.js";
import { j as jsxRuntimeExports } from "./index-DF734YkB.js";
import { T as Tooltip } from "./GraphicalItemClipPath-C5BaDaiW.js";
import { A as Area } from "./Area-DLKIhkx_.js";
import "./ActivePoints-BIcFr9ho.js";
function ValuationChart({
  data
}) {
  if (!data || data.length === 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(ChartContainer, {
      title: "Valuation",
      subtitle: "Valuation metrics over time",
      children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
        className: "flex items-center justify-center h-full text-muted-foreground",
        children: "No valuation data available"
      })
    });
  }
  const latestValue = data[data.length - 1]?.value || 0;
  const previousValue = data[data.length - 2]?.value || latestValue;
  const change = latestValue - previousValue;
  const changePercent = previousValue ? change / previousValue * 100 : 0;
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
          children: ["P/E Ratio: ", /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
            className: "font-semibold text-foreground",
            children: payload[0].value.toFixed(1)
          })]
        })]
      });
    }
    return null;
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(ChartContainer, {
    title: "Valuation",
    subtitle: "P/E ratio trend",
    value: `${latestValue.toFixed(1)}`,
    change: `${change >= 0 ? "+" : ""}${changePercent.toFixed(1)}%`,
    trend,
    children: /* @__PURE__ */ jsxRuntimeExports.jsx(ResponsiveContainer, {
      width: "100%",
      height: "100%",
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs(AreaChart, {
        data,
        margin: {
          top: 5,
          right: 5,
          left: 5,
          bottom: 5
        },
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx("defs", {
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs("linearGradient", {
            id: "valuationGradient",
            x1: "0",
            y1: "0",
            x2: "0",
            y2: "1",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("stop", {
              offset: "5%",
              stopColor: "#22c55e",
              stopOpacity: 0.3
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("stop", {
              offset: "95%",
              stopColor: "#22c55e",
              stopOpacity: 0
            })]
          })
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(XAxis, {
          dataKey: "date",
          axisLine: false,
          tickLine: false,
          tick: {
            fontSize: 10,
            fill: "currentColor"
          },
          tickFormatter: (value) => {
            const date = new Date(value);
            return `${date.getMonth() + 1}/${date.getDate()}`;
          }
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(YAxis, {
          axisLine: false,
          tickLine: false,
          tick: {
            fontSize: 10,
            fill: "currentColor"
          }
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, {
          content: /* @__PURE__ */ jsxRuntimeExports.jsx(CustomTooltip, {})
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(Area, {
          type: "monotone",
          dataKey: "value",
          stroke: "#22c55e",
          strokeWidth: 2,
          fill: "url(#valuationGradient)"
        })]
      })
    })
  });
}
export {
  ValuationChart
};
