import { r as reactExports, j as jsxRuntimeExports, f as cn } from "./index-DF734YkB.js";
const Progress = reactExports.forwardRef(({
  className,
  value = 0,
  ...props
}, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
  ref,
  className: cn("relative h-2 w-full overflow-hidden rounded-full bg-primary/20", className),
  ...props,
  children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
    className: "h-full bg-primary transition-all duration-300 ease-in-out",
    style: {
      width: `${Math.min(100, Math.max(0, value))}%`
    }
  })
}));
Progress.displayName = "Progress";
export {
  Progress as P
};
