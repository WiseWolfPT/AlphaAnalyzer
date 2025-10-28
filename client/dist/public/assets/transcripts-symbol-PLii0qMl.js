import { w as React, j as jsxRuntimeExports, $ as createCollection, a0 as useControllableState, a1 as createContextScope, a2 as useId, a3 as Primitive, a4 as useComposedRefs, a5 as composeEventHandlers, r as reactExports, f as cn, u as useLocation, C as Card, a as CardHeader, b as CardTitle, c as CardContent, B as Button, n as TrendingUp, H as useParams } from "./index-DF734YkB.js";
import { M as MainLayout } from "./main-layout-iPfLAwEH.js";
import { d as useQuery } from "./useQuery-C9HFImIm.js";
import { B as Badge } from "./badge-Bax4ZZX3.js";
import { c as createCollapsibleScope, R as Root, T as Trigger, C as Content } from "./index-B4jJMzO_.js";
import { u as useDirection } from "./index-Dx7UitrF.js";
import { C as ChevronDown } from "./chevron-down-BYhiF8im.js";
import { S as Skeleton } from "./skeleton-Cohz4q-x.js";
import { C as Calendar } from "./tabs-CPUG2mtF.js";
import { F as FileText } from "./file-text-BCjG82i7.js";
import { S as Sparkles } from "./sparkles-b_IcKR33.js";
import { L as Lightbulb } from "./lightbulb-BUqvVsu9.js";
import { E as ExternalLink } from "./external-link-BNxepo82.js";
import { e as ChevronUp } from "./select-Bm8Ccf9j.js";
import { A as ArrowLeft } from "./arrow-left-D76waWDu.js";
import "./dialog-B0u0SV5P.js";
import "./index-DXvlFXpR.js";
import "./input-vX2xFcRS.js";
import "./use-auth-monitoring-Ca9Wv08z.js";
import "./mail-D5HopcQP.js";
import "./lock-C5qTkNPd.js";
import "./eye-DQw-lb5A.js";
import "./user-C46AQImy.js";
import "./menu-CG6pfADK.js";
import "./chart-column-DNzw3S_G.js";
import "./search-CySG90ju.js";
import "./log-in-CA1V17qY.js";
import "./scroll-area-BRs9U-pP.js";
import "./index-IXOTxK3N.js";
var ACCORDION_NAME = "Accordion";
var ACCORDION_KEYS = ["Home", "End", "ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight"];
var [Collection, useCollection, createCollectionScope] = createCollection(ACCORDION_NAME);
var [createAccordionContext, createAccordionScope] = createContextScope(ACCORDION_NAME, [
  createCollectionScope,
  createCollapsibleScope
]);
var useCollapsibleScope = createCollapsibleScope();
var Accordion$1 = React.forwardRef(
  (props, forwardedRef) => {
    const { type, ...accordionProps } = props;
    const singleProps = accordionProps;
    const multipleProps = accordionProps;
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Collection.Provider, { scope: props.__scopeAccordion, children: type === "multiple" ? /* @__PURE__ */ jsxRuntimeExports.jsx(AccordionImplMultiple, { ...multipleProps, ref: forwardedRef }) : /* @__PURE__ */ jsxRuntimeExports.jsx(AccordionImplSingle, { ...singleProps, ref: forwardedRef }) });
  }
);
Accordion$1.displayName = ACCORDION_NAME;
var [AccordionValueProvider, useAccordionValueContext] = createAccordionContext(ACCORDION_NAME);
var [AccordionCollapsibleProvider, useAccordionCollapsibleContext] = createAccordionContext(
  ACCORDION_NAME,
  { collapsible: false }
);
var AccordionImplSingle = React.forwardRef(
  (props, forwardedRef) => {
    const {
      value: valueProp,
      defaultValue,
      onValueChange = () => {
      },
      collapsible = false,
      ...accordionSingleProps
    } = props;
    const [value, setValue] = useControllableState({
      prop: valueProp,
      defaultProp: defaultValue ?? "",
      onChange: onValueChange,
      caller: ACCORDION_NAME
    });
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      AccordionValueProvider,
      {
        scope: props.__scopeAccordion,
        value: React.useMemo(() => value ? [value] : [], [value]),
        onItemOpen: setValue,
        onItemClose: React.useCallback(() => collapsible && setValue(""), [collapsible, setValue]),
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(AccordionCollapsibleProvider, { scope: props.__scopeAccordion, collapsible, children: /* @__PURE__ */ jsxRuntimeExports.jsx(AccordionImpl, { ...accordionSingleProps, ref: forwardedRef }) })
      }
    );
  }
);
var AccordionImplMultiple = React.forwardRef((props, forwardedRef) => {
  const {
    value: valueProp,
    defaultValue,
    onValueChange = () => {
    },
    ...accordionMultipleProps
  } = props;
  const [value, setValue] = useControllableState({
    prop: valueProp,
    defaultProp: defaultValue ?? [],
    onChange: onValueChange,
    caller: ACCORDION_NAME
  });
  const handleItemOpen = React.useCallback(
    (itemValue) => setValue((prevValue = []) => [...prevValue, itemValue]),
    [setValue]
  );
  const handleItemClose = React.useCallback(
    (itemValue) => setValue((prevValue = []) => prevValue.filter((value2) => value2 !== itemValue)),
    [setValue]
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    AccordionValueProvider,
    {
      scope: props.__scopeAccordion,
      value,
      onItemOpen: handleItemOpen,
      onItemClose: handleItemClose,
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(AccordionCollapsibleProvider, { scope: props.__scopeAccordion, collapsible: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(AccordionImpl, { ...accordionMultipleProps, ref: forwardedRef }) })
    }
  );
});
var [AccordionImplProvider, useAccordionContext] = createAccordionContext(ACCORDION_NAME);
var AccordionImpl = React.forwardRef(
  (props, forwardedRef) => {
    const { __scopeAccordion, disabled, dir, orientation = "vertical", ...accordionProps } = props;
    const accordionRef = React.useRef(null);
    const composedRefs = useComposedRefs(accordionRef, forwardedRef);
    const getItems = useCollection(__scopeAccordion);
    const direction = useDirection(dir);
    const isDirectionLTR = direction === "ltr";
    const handleKeyDown = composeEventHandlers(props.onKeyDown, (event) => {
      if (!ACCORDION_KEYS.includes(event.key)) return;
      const target = event.target;
      const triggerCollection = getItems().filter((item) => !item.ref.current?.disabled);
      const triggerIndex = triggerCollection.findIndex((item) => item.ref.current === target);
      const triggerCount = triggerCollection.length;
      if (triggerIndex === -1) return;
      event.preventDefault();
      let nextIndex = triggerIndex;
      const homeIndex = 0;
      const endIndex = triggerCount - 1;
      const moveNext = () => {
        nextIndex = triggerIndex + 1;
        if (nextIndex > endIndex) {
          nextIndex = homeIndex;
        }
      };
      const movePrev = () => {
        nextIndex = triggerIndex - 1;
        if (nextIndex < homeIndex) {
          nextIndex = endIndex;
        }
      };
      switch (event.key) {
        case "Home":
          nextIndex = homeIndex;
          break;
        case "End":
          nextIndex = endIndex;
          break;
        case "ArrowRight":
          if (orientation === "horizontal") {
            if (isDirectionLTR) {
              moveNext();
            } else {
              movePrev();
            }
          }
          break;
        case "ArrowDown":
          if (orientation === "vertical") {
            moveNext();
          }
          break;
        case "ArrowLeft":
          if (orientation === "horizontal") {
            if (isDirectionLTR) {
              movePrev();
            } else {
              moveNext();
            }
          }
          break;
        case "ArrowUp":
          if (orientation === "vertical") {
            movePrev();
          }
          break;
      }
      const clampedIndex = nextIndex % triggerCount;
      triggerCollection[clampedIndex].ref.current?.focus();
    });
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      AccordionImplProvider,
      {
        scope: __scopeAccordion,
        disabled,
        direction: dir,
        orientation,
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(Collection.Slot, { scope: __scopeAccordion, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          Primitive.div,
          {
            ...accordionProps,
            "data-orientation": orientation,
            ref: composedRefs,
            onKeyDown: disabled ? void 0 : handleKeyDown
          }
        ) })
      }
    );
  }
);
var ITEM_NAME = "AccordionItem";
var [AccordionItemProvider, useAccordionItemContext] = createAccordionContext(ITEM_NAME);
var AccordionItem$1 = React.forwardRef(
  (props, forwardedRef) => {
    const { __scopeAccordion, value, ...accordionItemProps } = props;
    const accordionContext = useAccordionContext(ITEM_NAME, __scopeAccordion);
    const valueContext = useAccordionValueContext(ITEM_NAME, __scopeAccordion);
    const collapsibleScope = useCollapsibleScope(__scopeAccordion);
    const triggerId = useId();
    const open = value && valueContext.value.includes(value) || false;
    const disabled = accordionContext.disabled || props.disabled;
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      AccordionItemProvider,
      {
        scope: __scopeAccordion,
        open,
        disabled,
        triggerId,
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          Root,
          {
            "data-orientation": accordionContext.orientation,
            "data-state": getState(open),
            ...collapsibleScope,
            ...accordionItemProps,
            ref: forwardedRef,
            disabled,
            open,
            onOpenChange: (open2) => {
              if (open2) {
                valueContext.onItemOpen(value);
              } else {
                valueContext.onItemClose(value);
              }
            }
          }
        )
      }
    );
  }
);
AccordionItem$1.displayName = ITEM_NAME;
var HEADER_NAME = "AccordionHeader";
var AccordionHeader = React.forwardRef(
  (props, forwardedRef) => {
    const { __scopeAccordion, ...headerProps } = props;
    const accordionContext = useAccordionContext(ACCORDION_NAME, __scopeAccordion);
    const itemContext = useAccordionItemContext(HEADER_NAME, __scopeAccordion);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      Primitive.h3,
      {
        "data-orientation": accordionContext.orientation,
        "data-state": getState(itemContext.open),
        "data-disabled": itemContext.disabled ? "" : void 0,
        ...headerProps,
        ref: forwardedRef
      }
    );
  }
);
AccordionHeader.displayName = HEADER_NAME;
var TRIGGER_NAME = "AccordionTrigger";
var AccordionTrigger$1 = React.forwardRef(
  (props, forwardedRef) => {
    const { __scopeAccordion, ...triggerProps } = props;
    const accordionContext = useAccordionContext(ACCORDION_NAME, __scopeAccordion);
    const itemContext = useAccordionItemContext(TRIGGER_NAME, __scopeAccordion);
    const collapsibleContext = useAccordionCollapsibleContext(TRIGGER_NAME, __scopeAccordion);
    const collapsibleScope = useCollapsibleScope(__scopeAccordion);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Collection.ItemSlot, { scope: __scopeAccordion, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      Trigger,
      {
        "aria-disabled": itemContext.open && !collapsibleContext.collapsible || void 0,
        "data-orientation": accordionContext.orientation,
        id: itemContext.triggerId,
        ...collapsibleScope,
        ...triggerProps,
        ref: forwardedRef
      }
    ) });
  }
);
AccordionTrigger$1.displayName = TRIGGER_NAME;
var CONTENT_NAME = "AccordionContent";
var AccordionContent$1 = React.forwardRef(
  (props, forwardedRef) => {
    const { __scopeAccordion, ...contentProps } = props;
    const accordionContext = useAccordionContext(ACCORDION_NAME, __scopeAccordion);
    const itemContext = useAccordionItemContext(CONTENT_NAME, __scopeAccordion);
    const collapsibleScope = useCollapsibleScope(__scopeAccordion);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      Content,
      {
        role: "region",
        "aria-labelledby": itemContext.triggerId,
        "data-orientation": accordionContext.orientation,
        ...collapsibleScope,
        ...contentProps,
        ref: forwardedRef,
        style: {
          ["--radix-accordion-content-height"]: "var(--radix-collapsible-content-height)",
          ["--radix-accordion-content-width"]: "var(--radix-collapsible-content-width)",
          ...props.style
        }
      }
    );
  }
);
AccordionContent$1.displayName = CONTENT_NAME;
function getState(open) {
  return open ? "open" : "closed";
}
var Root2 = Accordion$1;
var Item = AccordionItem$1;
var Header = AccordionHeader;
var Trigger2 = AccordionTrigger$1;
var Content2 = AccordionContent$1;
const Accordion = Root2;
const AccordionItem = reactExports.forwardRef(({
  className,
  ...props
}, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx(Item, {
  ref,
  className: cn("border-b", className),
  ...props
}));
AccordionItem.displayName = "AccordionItem";
const AccordionTrigger = reactExports.forwardRef(({
  className,
  children,
  ...props
}, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx(Header, {
  className: "flex",
  children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Trigger2, {
    ref,
    className: cn("flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180", className),
    ...props,
    children: [children, /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, {
      className: "h-4 w-4 shrink-0 transition-transform duration-200"
    })]
  })
}));
AccordionTrigger.displayName = Trigger2.displayName;
const AccordionContent = reactExports.forwardRef(({
  className,
  children,
  ...props
}, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx(Content2, {
  ref,
  className: "overflow-hidden text-sm transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down",
  ...props,
  children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
    className: cn("pb-4 pt-0", className),
    children
  })
}));
AccordionContent.displayName = Content2.displayName;
const getApiUrl = () => "";
async function fetchLatestTranscript(symbol) {
  const response = await fetch(`${getApiUrl()}/api/transcripts/symbol/${symbol}`);
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error("Failed to fetch latest transcript");
  }
  const json = await response.json();
  return json.data;
}
async function fetchTranscriptHistory(symbol) {
  const response = await fetch(`${getApiUrl()}/api/transcripts/symbol/${symbol}?history=true`);
  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error("Failed to fetch transcript history");
  }
  const json = await response.json();
  return json.data || [];
}
function parseAISummary(aiSummary) {
  if (!aiSummary) return {
    summary: void 0,
    keyInsights: []
  };
  try {
    let parsed;
    if (typeof aiSummary === "object") {
      parsed = aiSummary;
    } else if (typeof aiSummary === "string") {
      parsed = JSON.parse(aiSummary);
    } else {
      return {
        summary: void 0,
        keyInsights: []
      };
    }
    const safeStringArray = (arr) => {
      if (!Array.isArray(arr)) return [];
      return arr.filter((item) => typeof item === "string" && item.trim().length > 0);
    };
    const safeString = (value) => {
      if (typeof value === "string") return value;
      if (value === null || value === void 0) return void 0;
      return String(value);
    };
    if (parsed?.model === "openai" && parsed?.summary) {
      const summaryText = typeof parsed.summary === "string" ? parsed.summary : String(parsed.summary);
      return {
        summary: summaryText,
        keyInsights: safeStringArray(parsed.key_insights || parsed.keyInsights || []),
        financial_highlights: safeStringArray(parsed.financial_highlights || parsed.financialHighlights || []),
        risk_factors: safeStringArray(parsed.risk_factors || [])
      };
    }
    if (parsed?.summary) {
      return {
        summary: safeString(parsed.summary),
        keyInsights: safeStringArray(parsed.key_insights || parsed.keyInsights || []),
        financial_highlights: safeStringArray(parsed.financial_highlights || parsed.financialHighlights || []),
        risk_factors: safeStringArray(parsed.risk_factors || [])
      };
    }
    return {
      summary: safeString(parsed.outlook || parsed.text || parsed),
      keyInsights: safeStringArray(parsed.key_insights || parsed.keyInsights || parsed.risks || []),
      financial_highlights: safeStringArray(parsed.financial_highlights || parsed.financialHighlights || []),
      risk_factors: safeStringArray(parsed.risk_factors || parsed.risks || [])
    };
  } catch (error) {
    console.error("Error parsing AI summary:", error);
    return {
      summary: typeof aiSummary === "string" ? aiSummary : "Summary not available.",
      keyInsights: []
    };
  }
}
function formatDate(dateString) {
  if (!dateString) return "Date not available";
  try {
    return new Date(dateString).toLocaleDateString("pt-PT", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  } catch (error) {
    return "Date not available";
  }
}
function TranscriptSection({
  symbol
}) {
  const [, setLocation] = useLocation();
  const [showHistory, setShowHistory] = reactExports.useState(false);
  const {
    data: latest,
    isLoading: isLoadingLatest,
    error: latestError
  } = useQuery({
    queryKey: ["transcript-latest", symbol],
    queryFn: () => fetchLatestTranscript(symbol),
    staleTime: 5 * 60 * 1e3
    // 5 minutes
  });
  const {
    data: history = [],
    isLoading: isLoadingHistory
  } = useQuery({
    queryKey: ["transcript-history", symbol],
    queryFn: () => fetchTranscriptHistory(symbol),
    enabled: showHistory,
    staleTime: 5 * 60 * 1e3
  });
  const latestParsed = latest ? parseAISummary(latest.ai_summary) : null;
  const keyInsights = latestParsed?.keyInsights || latestParsed?.key_insights || [];
  const handleToggle = () => {
    setShowHistory(!showHistory);
  };
  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleToggle();
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
    className: "space-y-4",
    role: "region",
    "aria-label": "Earnings Transcripts",
    children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
      children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
        children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
          className: "flex items-start justify-between gap-4",
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex-1",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, {
              className: "flex items-center gap-2 text-xl",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Badge, {
                variant: "default",
                className: "bg-teya-green text-teya-black",
                children: "Latest"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                className: "text-lg",
                children: "Earnings Transcript"
              })]
            }), latest && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "flex flex-wrap items-center gap-2 mt-2 text-sm text-muted-foreground",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "flex items-center gap-1",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Calendar, {
                  className: "w-4 h-4"
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
                  children: ["Q", latest.quarter, " ", latest.year]
                })]
              }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                className: "text-muted-foreground/50",
                children: "•"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                children: formatDate(latest.call_date)
              })]
            })]
          })
        })
      }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
        className: "space-y-6",
        children: isLoadingLatest ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "space-y-4",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "space-y-2",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, {
              className: "h-5 w-32"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, {
              className: "h-20 w-full"
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "space-y-2",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, {
              className: "h-5 w-32"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, {
              className: "h-4 w-full"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, {
              className: "h-4 w-full"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, {
              className: "h-4 w-3/4"
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, {
            className: "h-10 w-48"
          })]
        }) : latestError || !latest ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "flex flex-col items-center justify-center py-12 text-center",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, {
              className: "w-8 h-8 text-muted-foreground"
            })
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("h3", {
            className: "text-lg font-semibold mb-2",
            children: "No Transcripts Available"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
            className: "text-sm text-muted-foreground max-w-md",
            children: "Earnings call transcripts will appear here once they become available for this company."
          })]
        }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, {
          children: [latestParsed?.summary && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "space-y-3",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("h4", {
              className: "font-semibold flex items-center gap-2 text-base",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, {
                className: "w-5 h-5 text-teya-green"
              }), "AI Summary"]
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
              className: "text-sm leading-relaxed text-muted-foreground",
              children: latestParsed.summary
            })]
          }), keyInsights.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "space-y-3",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("h4", {
              className: "font-semibold flex items-center gap-2 text-base",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Lightbulb, {
                className: "w-5 h-5 text-amber-500"
              }), "Key Insights"]
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("ul", {
              className: "space-y-2",
              children: keyInsights.map((insight, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", {
                className: "flex items-start gap-2 text-sm",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                  className: "text-teya-green mt-0.5",
                  children: "•"
                }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                  className: "flex-1 leading-relaxed text-muted-foreground",
                  children: insight
                })]
              }, i))
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
            variant: "outline",
            className: "w-full sm:w-auto",
            onClick: () => setLocation(`/transcript/${latest.id}`),
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(FileText, {
              className: "w-4 h-4"
            }), "Read Full Transcript", /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, {
              className: "w-3 h-3"
            })]
          })]
        })
      })]
    }), !latestError && latest && /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
      children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
        className: "pb-4",
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs("button", {
          onClick: handleToggle,
          onKeyDown: handleKeyDown,
          className: cn(
            "w-full flex items-center justify-between text-left",
            "hover:opacity-80 transition-opacity",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md",
            "min-h-[44px]"
            // Minimum touch target for mobile (accessibility)
          ),
          "aria-expanded": showHistory,
          "aria-controls": "historical-transcripts",
          type: "button",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, {
            className: "flex items-center gap-2 text-lg",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, {
              className: "w-5 h-5 text-muted-foreground"
            }), "Historical Transcripts"]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex items-center gap-3",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
              className: "text-sm text-muted-foreground font-normal",
              children: history.length > 0 ? `${history.length} available` : "—"
            }), showHistory ? /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronUp, {
              className: "w-5 h-5 text-muted-foreground"
            }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, {
              className: "w-5 h-5 text-muted-foreground"
            })]
          })]
        })
      }), showHistory && /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
        id: "historical-transcripts",
        className: "pt-0",
        children: isLoadingHistory ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "space-y-3",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, {
            className: "h-16 w-full"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, {
            className: "h-16 w-full"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, {
            className: "h-16 w-full"
          })]
        }) : history.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
          className: "text-center py-8 text-muted-foreground text-sm",
          children: "No historical transcripts available"
        }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Accordion, {
          type: "single",
          collapsible: true,
          className: "w-full",
          children: history.map((transcript) => {
            const historicalSummary = parseAISummary(transcript.ai_summary);
            return /* @__PURE__ */ jsxRuntimeExports.jsxs(AccordionItem, {
              value: String(transcript.id),
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(AccordionTrigger, {
                className: "hover:no-underline",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                  className: "flex flex-col items-start text-left gap-1 pr-4",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex items-center gap-2",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, {
                      variant: "outline",
                      className: "font-normal",
                      children: ["Q", transcript.quarter, " ", transcript.year]
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "text-sm text-muted-foreground",
                      children: formatDate(transcript.call_date)
                    })]
                  })
                })
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(AccordionContent, {
                children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "space-y-3 pt-2",
                  children: [historicalSummary?.summary && /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                    className: "text-sm leading-relaxed text-muted-foreground line-clamp-3",
                    children: historicalSummary.summary
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
                    variant: "link",
                    className: "p-0 h-auto text-teya-green hover:text-teya-green/80",
                    onClick: () => setLocation(`/transcript/${transcript.id}`),
                    children: ["Read more", /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, {
                      className: "w-3 h-3"
                    })]
                  })]
                })
              })]
            }, transcript.id);
          })
        })
      })]
    })]
  });
}
function TranscriptsSymbolPage() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const symbol = (params.symbol || "").toUpperCase();
  return /* @__PURE__ */ jsxRuntimeExports.jsx(MainLayout, {
    children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
      className: "max-w-5xl mx-auto space-y-6",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "flex items-center justify-between",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "flex items-center gap-3",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(FileText, {
            className: "h-6 w-6 text-teya-green"
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("h1", {
            className: "text-2xl font-bold",
            children: ["Earnings Transcripts — ", symbol]
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
          variant: "outline",
          size: "sm",
          onClick: () => setLocation("/transcripts"),
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(ArrowLeft, {
            className: "h-4 w-4 mr-1"
          }), "Back to All Transcripts"]
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, {
            className: "text-base",
            children: "Latest Transcript and History"
          })
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(TranscriptSection, {
            symbol
          })
        })]
      })]
    })
  });
}
export {
  TranscriptsSymbolPage as default
};
