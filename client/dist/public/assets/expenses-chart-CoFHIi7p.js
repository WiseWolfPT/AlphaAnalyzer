import { ResponsiveContainer, BarChart, XAxis, YAxis } from "./lightweight-chart-CPbISesF.js";
import { ChartContainer } from "./chart-container-CPbaEAKc.js";
import { j as jsxRuntimeExports } from "./index-DF734YkB.js";
import { T as Tooltip } from "./GraphicalItemClipPath-C5BaDaiW.js";
import { B as Bar } from "./barSelectors-C4PIc_FS.js";
function ExpensesChart({
  data
}) {
  if (!data || data.length === 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(ChartContainer, {
      title: "Expenses",
      subtitle: "Operating expenses breakdown",
      children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
        className: "flex items-center justify-center h-full text-muted-foreground",
        children: "No expenses data available"
      })
    });
  }
  const chartData = data.map((item) => ({
    quarter: item.quarter,
    total: item.operating + item.rd + item.sga + Math.abs(item.other),
    operating: item.operating,
    rd: item.rd,
    sga: item.sga,
    other: item.other
  }));
  const latestData = chartData[chartData.length - 1];
  const previousData = chartData[chartData.length - 2];
  const change = latestData && previousData ? latestData.total - previousData.total : 0;
  const changePercent = previousData ? change / previousData.total * 100 : 0;
  const trend = change >= 0 ? "up" : "down";
  const CustomTooltip = ({
    active,
    payload,
    label
  }) => {
    if (active && payload && payload.length) {
      const data2 = payload[0].payload;
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "bg-background border border-border rounded-lg p-3 shadow-lg",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx("p", {
          className: "text-sm font-medium mb-2",
          children: label
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "space-y-1 text-xs",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
            className: "text-cyan-600",
            children: ["CAPEX: ", /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
              className: "font-semibold",
              children: ["$", data2.operating.toFixed(0), "M"]
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
            className: "text-cyan-500",
            children: ["S&M: ", /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
              className: "font-semibold",
              children: ["$", data2.sga.toFixed(0), "M"]
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
            className: "text-cyan-400",
            children: ["R&D: ", /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
              className: "font-semibold",
              children: ["$", data2.rd.toFixed(0), "M"]
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
            className: "text-cyan-300",
            children: ["G&A: ", /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
              className: "font-semibold",
              children: ["$", Math.abs(data2.other).toFixed(0), "M"]
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
            className: "text-muted-foreground border-t pt-1",
            children: ["Total: ", /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
              className: "font-semibold text-foreground",
              children: ["$", data2.total.toFixed(0), "M"]
            })]
          })]
        })]
      });
    }
    return null;
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(ChartContainer, {
    title: "Expenses",
    subtitle: "Q1 2025",
    value: `$${latestData?.total.toFixed(0)}M`,
    change: `${change >= 0 ? "+" : ""}${changePercent.toFixed(1)}%`,
    trend,
    children: /* @__PURE__ */ jsxRuntimeExports.jsx(ResponsiveContainer, {
      width: "100%",
      height: "100%",
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs(BarChart, {
        data: chartData,
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
          dataKey: "total",
          fill: "#06b6d4",
          radius: [2, 2, 0, 0]
        })]
      })
    })
  });
}
export {
  ExpensesChart
};
