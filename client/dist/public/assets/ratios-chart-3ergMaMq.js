import { ResponsiveContainer, BarChart, XAxis, YAxis } from "./lightweight-chart-CPbISesF.js";
import { ChartContainer } from "./chart-container-CPbaEAKc.js";
import { j as jsxRuntimeExports } from "./index-DF734YkB.js";
import { T as Tooltip } from "./GraphicalItemClipPath-C5BaDaiW.js";
import { B as Bar } from "./barSelectors-C4PIc_FS.js";
function RatiosChart({
  data
}) {
  if (!data || data.length === 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(ChartContainer, {
      title: "Ratios",
      subtitle: "Key financial ratios",
      children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
        className: "flex items-center justify-center h-full text-muted-foreground",
        children: "No ratios data available"
      })
    });
  }
  const chartData = data.map((item) => ({
    quarter: item.quarter,
    roe: item.roe * 100,
    // Convert to percentage
    pe: item.pe,
    roa: item.roa * 100,
    grossMargin: item.grossMargin * 100
  }));
  const latestData = chartData[chartData.length - 1];
  const previousData = chartData[chartData.length - 2];
  const roeChange = latestData && previousData ? latestData.roe - previousData.roe : 0;
  const trend = roeChange >= 0 ? "up" : "down";
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
            className: "text-teya-green",
            children: ["Return on Capital Employed: ", /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
              className: "font-semibold",
              children: [data2.roe.toFixed(1), "%"]
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
            className: "text-muted-foreground",
            children: ["P/E Ratio: ", /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
              className: "font-semibold",
              children: data2.pe.toFixed(1)
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
            className: "text-muted-foreground",
            children: ["ROA: ", /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
              className: "font-semibold",
              children: [data2.roa.toFixed(1), "%"]
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
            className: "text-muted-foreground",
            children: ["Gross Margin: ", /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
              className: "font-semibold",
              children: [data2.grossMargin.toFixed(1), "%"]
            })]
          })]
        })]
      });
    }
    return null;
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(ChartContainer, {
    title: "Ratios",
    subtitle: "Q1 2025",
    value: `${latestData?.roe.toFixed(1)}%`,
    change: `${roeChange >= 0 ? "+" : ""}${roeChange.toFixed(1)}%`,
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
          tickFormatter: (value) => `${value}%`
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, {
          content: /* @__PURE__ */ jsxRuntimeExports.jsx(CustomTooltip, {})
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(Bar, {
          dataKey: "roe",
          fill: "#F4FA4E",
          radius: [2, 2, 0, 0]
        })]
      })
    })
  });
}
export {
  RatiosChart
};
