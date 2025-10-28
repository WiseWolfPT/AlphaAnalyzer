import { B as Badge } from "./badge-Bax4ZZX3.js";
import { j as jsxRuntimeExports, f as cn } from "./index-DF734YkB.js";
function isMarketOpen() {
  const now = /* @__PURE__ */ new Date();
  const easternTime = new Date(now.toLocaleString("en-US", {
    timeZone: "America/New_York"
  }));
  const day = easternTime.getDay();
  const hour = easternTime.getHours();
  const minute = easternTime.getMinutes();
  const currentTime = hour * 60 + minute;
  if (day === 0 || day === 6) return false;
  const marketOpen = 9 * 60 + 30;
  const marketClose = 16 * 60;
  return currentTime >= marketOpen && currentTime < marketClose;
}
function StockHeaderV2({
  symbol,
  company,
  isInWatchlist,
  onAddToWatchlist,
  onShare
}) {
  const isPositive = company.change >= 0;
  const isAfterHoursPositive = company.afterHoursChange >= 0;
  const marketOpen = isMarketOpen();
  const showAfterHours = !marketOpen && company.afterHoursPrice > 0;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
    className: "space-y-3",
    children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
      className: "flex items-center gap-4",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
        className: "w-12 h-12 rounded-xl overflow-hidden bg-muted flex items-center justify-center shrink-0 border",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx("img", {
          src: company.logo,
          alt: `${symbol} logo`,
          className: "w-full h-full object-cover",
          onError: (e) => {
            const target = e.target;
            target.style.display = "none";
            target.parentElement.innerHTML = `<div class="text-xl font-bold text-teya-green">${symbol[0]}</div>`;
          }
        })
      }), /* @__PURE__ */ jsxRuntimeExports.jsx("h1", {
        className: "text-2xl sm:text-3xl font-bold",
        children: symbol
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
        className: "text-2xl sm:text-3xl font-bold",
        children: ["$", company.price.toFixed(2)]
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
        className: cn("text-lg sm:text-xl font-medium", isPositive ? "text-green-500" : "text-red-500"),
        children: [isPositive ? "+" : "", "$", company.change.toFixed(2), " (", isPositive ? "+" : "", company.changePercent.toFixed(2), "%)"]
      })]
    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
      className: "flex items-center gap-6",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsx("p", {
        className: "text-lg font-medium text-muted-foreground",
        children: company.name
      }), marketOpen ? /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, {
        variant: "outline",
        className: "text-green-600 border-green-200 bg-green-50",
        children: "Market Open"
      }) : showAfterHours ? /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
        className: "text-base font-medium",
        children: ["After Hours $", company.afterHoursPrice.toFixed(2), /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
          className: cn("ml-2", isAfterHoursPositive ? "text-green-500" : "text-red-500"),
          children: [isAfterHoursPositive ? "+" : "", "$", company.afterHoursChange.toFixed(2), " (", isAfterHoursPositive ? "+" : "", company.afterHoursChangePercent.toFixed(2), "%)"]
        })]
      }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, {
        variant: "outline",
        className: "text-gray-600 border-gray-200",
        children: "Market Closed"
      })]
    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
      className: "flex items-center gap-6",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Badge, {
        variant: "outline",
        className: "border-teya-green/30 text-teya-green w-fit text-sm",
        children: company.sector
      }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
        className: "flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/15 text-amber-600 dark:text-amber-400 rounded-lg text-sm font-medium border border-amber-500/20",
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
          children: ["Earnings: ", company.earningsDate]
        })
      })]
    })]
  });
}
export {
  StockHeaderV2 as S
};
