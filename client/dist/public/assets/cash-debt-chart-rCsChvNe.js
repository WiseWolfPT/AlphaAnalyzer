import { ResponsiveContainer, BarChart, XAxis, YAxis } from "./lightweight-chart-CPbISesF.js";
import { ChartContainer } from "./chart-container-CPbaEAKc.js";
import { j as jsxRuntimeExports } from "./index-DF734YkB.js";
import { T as Tooltip } from "./GraphicalItemClipPath-C5BaDaiW.js";
import { B as Bar } from "./barSelectors-C4PIc_FS.js";
function CashDebtChart({
  data
}) {
  if (!data || data.length === 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(ChartContainer, {
      title: "Cash & Debt",
      subtitle: "Cash vs debt levels",
      children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
        className: "flex items-center justify-center h-full text-muted-foreground",
        children: "No cash & debt data available"
      })
    });
  }
  const latestData = data[data.length - 1];
  const netCash = latestData ? latestData.cash - latestData.debt : 0;
  const isNetPositive = netCash >= 0;
  const CustomTooltip = ({
    active,
    payload,
    label
  }) => {
    if (active && payload && payload.length) {
      const cashValue = payload.find((p) => p.dataKey === "cash")?.value || 0;
      const debtValue = payload.find((p) => p.dataKey === "debt")?.value || 0;
      const netValue = cashValue - debtValue;
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "bg-background border border-border rounded-lg p-3 shadow-lg",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx("p", {
          className: "text-sm font-medium mb-2",
          children: label
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "space-y-1",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
            className: "text-xs text-emerald-500",
            children: ["Cash: ", /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
              className: "font-semibold",
              children: ["$", cashValue.toFixed(0), "M"]
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
            className: "text-xs text-red-500",
            children: ["Debt: ", /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
              className: "font-semibold",
              children: ["$", debtValue.toFixed(0), "M"]
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
            className: "text-xs text-muted-foreground border-t pt-1",
            children: ["Net: ", /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
              className: `font-semibold ${netValue >= 0 ? "text-emerald-500" : "text-red-500"}`,
              children: ["$", netValue.toFixed(0), "M"]
            })]
          })]
        })]
      });
    }
    return null;
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(ChartContainer, {
    title: "Cash & Debt",
    subtitle: "Q1 2025",
    value: `$${Math.abs(netCash).toFixed(0)}M`,
    change: isNetPositive ? "Net Cash" : "Net Debt",
    trend: isNetPositive ? "up" : "down",
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
          dataKey: "cash",
          stackId: "cashDebt",
          fill: "#22c55e",
          radius: [2, 2, 0, 0]
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(Bar, {
          dataKey: "debt",
          stackId: "cashDebt",
          fill: "#ef4444",
          radius: [0, 0, 0, 0]
        })]
      })
    })
  });
}
export {
  CashDebtChart
};
