import { LightweightChartContainer, LightweightPriceChart } from "./lightweight-chart-CPbISesF.js";
import { j as jsxRuntimeExports } from "./index-DF734YkB.js";
function PriceChart({
  data
}) {
  if (!data || data.length === 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(LightweightChartContainer, {
      config: {},
      className: "min-h-[300px]",
      title: "Price Chart",
      subtitle: "No data available",
      children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
        className: "flex items-center justify-center h-full text-muted-foreground",
        children: "No price data available"
      })
    });
  }
  const firstPrice = data[0]?.price || 0;
  const currentPrice = data[data.length - 1]?.price || 0;
  const totalChange = currentPrice - firstPrice;
  const totalChangePercent = firstPrice ? totalChange / firstPrice * 100 : 0;
  const isPositive = totalChange >= 0;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(LightweightChartContainer, {
    config: {},
    className: "min-h-[300px]",
    title: "Price Chart",
    subtitle: `${isPositive ? "+" : ""}${totalChangePercent.toFixed(2)}% • $${currentPrice.toFixed(2)}`,
    children: /* @__PURE__ */ jsxRuntimeExports.jsx(LightweightPriceChart, {
      data,
      color: isPositive ? "#10b981" : "#ef4444"
    })
  });
}
export {
  PriceChart
};
