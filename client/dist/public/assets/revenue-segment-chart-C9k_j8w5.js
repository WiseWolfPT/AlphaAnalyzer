import { ResponsiveContainer, BarChart, XAxis, YAxis } from "./lightweight-chart-CPbISesF.js";
import { ChartContainer } from "./chart-container-CPbaEAKc.js";
import { j as jsxRuntimeExports } from "./index-DF734YkB.js";
import { T as Tooltip } from "./GraphicalItemClipPath-C5BaDaiW.js";
import { B as Bar } from "./barSelectors-C4PIc_FS.js";
function RevenueSegmentChart({
  data
}) {
  if (!data || data.length === 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(ChartContainer, {
      title: "Revenue By Segment",
      subtitle: "Revenue breakdown",
      children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
        className: "flex items-center justify-center h-full text-muted-foreground",
        children: "No segment data available"
      })
    });
  }
  const chartData = data.map((item) => ({
    quarter: item.quarter,
    ...Object.fromEntries(
      Object.entries(item.segments).map(([key, value]) => [key, value / 1e6])
      // Convert to millions
    )
  }));
  const segmentNames = Object.keys(data[0]?.segments || {});
  const segmentColors = [
    "#ef4444",
    // red
    "#f97316",
    // orange  
    "#eab308",
    // yellow
    "#22c55e",
    // green
    "#3b82f6",
    // blue
    "#8b5cf6",
    // purple
    "#ec4899"
    // pink
  ];
  const latestData = data[data.length - 1];
  const totalRevenue = latestData ? Object.values(latestData.segments).reduce((sum, val) => sum + val, 0) / 1e6 : 0;
  const CustomTooltip = ({
    active,
    payload,
    label
  }) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum, entry) => sum + entry.value, 0);
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "bg-background border border-border rounded-lg p-3 shadow-lg",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx("p", {
          className: "text-sm font-medium mb-2",
          children: label
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
          className: "text-sm text-muted-foreground mb-2",
          children: ["Total: ", /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
            className: "font-semibold text-foreground",
            children: ["$", total.toFixed(0), "M"]
          })]
        }), payload.map((entry, index) => /* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
          className: "text-xs",
          style: {
            color: entry.color
          },
          children: [entry.dataKey, ": $", entry.value.toFixed(0), "M"]
        }, index))]
      });
    }
    return null;
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(ChartContainer, {
    title: "Revenue By Segment",
    subtitle: "24.30%",
    value: `$${totalRevenue.toFixed(0)}M`,
    trend: "up",
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
        }), segmentNames.map((segment, index) => /* @__PURE__ */ jsxRuntimeExports.jsx(Bar, {
          dataKey: segment,
          stackId: "segments",
          fill: segmentColors[index % segmentColors.length],
          radius: index === segmentNames.length - 1 ? [2, 2, 0, 0] : [0, 0, 0, 0]
        }, segment))]
      })
    })
  });
}
export {
  RevenueSegmentChart
};
