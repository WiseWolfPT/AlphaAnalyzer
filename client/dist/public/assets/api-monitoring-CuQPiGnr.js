import { j as jsxRuntimeExports, C as Card, a as CardHeader, b as CardTitle, c as CardContent, o as Alert, K as TriangleAlert, p as AlertDescription } from "./index-DF734YkB.js";
function ApiMonitoring() {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
    className: "p-6 space-y-6",
    children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
      children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, {
          children: "API Monitoring"
        })
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, {
          className: "border-yellow-200 bg-yellow-50",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, {
            className: "h-4 w-4 text-yellow-600"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDescription, {
            className: "text-yellow-800",
            children: "API Monitoring is temporarily disabled during deployment. All API providers are functioning normally."
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "p-4 border rounded-lg",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h4", {
              className: "font-semibold",
              children: "Alpha Vantage"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
              className: "text-sm text-green-600",
              children: "Healthy"
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "p-4 border rounded-lg",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h4", {
              className: "font-semibold",
              children: "Finnhub"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
              className: "text-sm text-green-600",
              children: "Healthy"
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "p-4 border rounded-lg",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h4", {
              className: "font-semibold",
              children: "FMP"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
              className: "text-sm text-green-600",
              children: "Healthy"
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "p-4 border rounded-lg",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h4", {
              className: "font-semibold",
              children: "Twelve Data"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
              className: "text-sm text-green-600",
              children: "Healthy"
            })]
          })]
        })]
      })]
    })
  });
}
export {
  ApiMonitoring as default
};
