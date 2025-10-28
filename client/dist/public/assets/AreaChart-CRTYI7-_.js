import { r as reactExports } from "./index-DF734YkB.js";
import { E as arrayTooltipSearcher } from "./GraphicalItemClipPath-C5BaDaiW.js";
import { C as CartesianChart } from "./CartesianChart-DjA-4J1-.js";
var allowedTooltipTypes = ["axis"];
var AreaChart = /* @__PURE__ */ reactExports.forwardRef((props, ref) => {
  return /* @__PURE__ */ reactExports.createElement(CartesianChart, {
    chartName: "AreaChart",
    defaultTooltipEventType: "axis",
    validateTooltipEventTypes: allowedTooltipTypes,
    tooltipPayloadSearcher: arrayTooltipSearcher,
    categoricalChartProps: props,
    ref
  });
});
export {
  AreaChart as A
};
