import { j as jsxRuntimeExports, C as Card, c as CardContent, v as CircleAlert } from "./index-DF734YkB.js";
function NotFound() {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
    className: "min-h-screen w-full flex items-center justify-center bg-gray-50",
    children: /* @__PURE__ */ jsxRuntimeExports.jsx(Card, {
      className: "w-full max-w-md mx-4",
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
        className: "pt-6",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "flex mb-4 gap-2",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, {
            className: "h-8 w-8 text-red-500"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("h1", {
            className: "text-2xl font-bold text-gray-900",
            children: "Página 404 não encontrada"
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
          className: "mt-4 text-sm text-gray-600",
          children: "Esqueceu-se de adicionar a página ao router?"
        })]
      })
    })
  });
}
export {
  NotFound as default
};
