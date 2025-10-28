import { ResponsiveContainer, BarChart, XAxis, YAxis } from "./lightweight-chart-CPbISesF.js";
import { ChartContainer } from "./chart-container-CPbaEAKc.js";
import { j as jsxRuntimeExports } from "./index-DF734YkB.js";
import { T as Tooltip } from "./GraphicalItemClipPath-C5BaDaiW.js";
import { B as Bar } from "./barSelectors-C4PIc_FS.js";
function DividendsChart({
  data
}) {
  if (!data || data.length === 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(ChartContainer, {
      title: "Dividends",
      subtitle: "Dividend payments",
      children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
        className: "flex items-center justify-center h-full text-muted-foreground",
        children: "No dividend data available"
      })
    });
  }
  const quarterlyData = data.reduce((acc, dividend) => {
    const date = new Date(dividend.date);
    const quarter = `Q${Math.ceil((date.getMonth() + 1) / 3)} ${date.getFullYear()}`;
    const existing = acc.find((item) => item.quarter === quarter);
    if (existing) {
      existing.amount += dividend.amount;
    } else {
      acc.push({
        quarter,
        amount: dividend.amount
      });
    }
    return acc;
  }, []);
  const latestDividend = quarterlyData[quarterlyData.length - 1]?.amount || 0;
  const previousDividend = quarterlyData[quarterlyData.length - 2]?.amount || latestDividend;
  const change = latestDividend - previousDividend;
  const changePercent = previousDividend ? change / previousDividend * 100 : 0;
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
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
            className: "inline-block w-3 h-3 bg-cyan-500 rounded mr-2"
          }), "Dividend: ", /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
            className: "font-semibold text-foreground",
            children: ["$", payload[0].value.toFixed(2)]
          })]
        })]
      });
    }
    return null;
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(ChartContainer, {
    title: "Dividends",
    subtitle: "Q2 2025",
    value: `$${latestDividend.toFixed(2)}`,
    change: `${change >= 0 ? "+" : ""}${changePercent.toFixed(1)}%`,
    trend,
    children: /* @__PURE__ */ jsxRuntimeExports.jsx(ResponsiveContainer, {
      width: "100%",
      height: "100%",
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs(BarChart, {
        data: quarterlyData,
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
          tickFormatter: (value) => `$${value}`
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, {
          content: /* @__PURE__ */ jsxRuntimeExports.jsx(CustomTooltip, {})
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(Bar, {
          dataKey: "amount",
          fill: "#06b6d4",
          radius: [2, 2, 0, 0]
        })]
      })
    })
  });
}
export {
  DividendsChart
};
