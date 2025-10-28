import { u as useLocation, r as reactExports, j as jsxRuntimeExports, B as Button, C as Card, a as CardHeader, b as CardTitle, c as CardContent, f as cn, m as motion, n as TrendingUp } from "./index-DF734YkB.js";
import { d as useQuery } from "./useQuery-C9HFImIm.js";
import { M as MainLayout } from "./main-layout-iPfLAwEH.js";
import { I as Input } from "./input-vX2xFcRS.js";
import { B as Badge } from "./badge-Bax4ZZX3.js";
import { S as Select, a as SelectTrigger, b as SelectValue, c as SelectContent, d as SelectItem } from "./select-Bm8Ccf9j.js";
import { T as Tabs, a as TabsList, b as TabsTrigger, c as TabsContent } from "./tabs-CPUG2mtF.js";
import { N as Newspaper } from "./newspaper-pVO4VILD.js";
import { B as Bookmark, S as Share } from "./share-CE1JpwR-.js";
import { C as ChartColumn } from "./chart-column-DNzw3S_G.js";
import { S as Search } from "./search-CySG90ju.js";
import { C as Clock } from "./clock-CEwJtTm9.js";
import { E as Eye } from "./eye-DQw-lb5A.js";
import { E as ExternalLink } from "./external-link-BNxepo82.js";
import { S as Star } from "./star-Cp1OMHQ3.js";
import { A as ArrowRight } from "./arrow-right-B8plmmKU.js";
import { G as Globe } from "./globe-b19obaKp.js";
import { d as buildFormatLongFn, f as buildLocalizeFn, h as buildMatchFn, i as buildMatchPatternFn } from "./en-US-CFe7Dxf-.js";
import { f as formatDistanceToNow } from "./formatDistanceToNow-Cp_4CwS9.js";
import "./dialog-B0u0SV5P.js";
import "./index-DXvlFXpR.js";
import "./use-auth-monitoring-Ca9Wv08z.js";
import "./mail-D5HopcQP.js";
import "./lock-C5qTkNPd.js";
import "./user-C46AQImy.js";
import "./menu-CG6pfADK.js";
import "./file-text-BCjG82i7.js";
import "./log-in-CA1V17qY.js";
import "./index-Dx7UitrF.js";
import "./scroll-area-BRs9U-pP.js";
import "./index-IXOTxK3N.js";
import "./chevron-down-BYhiF8im.js";
const formatDistanceLocale = {
  lessThanXSeconds: {
    one: "menos de um segundo",
    other: "menos de {{count}} segundos"
  },
  xSeconds: {
    one: "1 segundo",
    other: "{{count}} segundos"
  },
  halfAMinute: "meio minuto",
  lessThanXMinutes: {
    one: "menos de um minuto",
    other: "menos de {{count}} minutos"
  },
  xMinutes: {
    one: "1 minuto",
    other: "{{count}} minutos"
  },
  aboutXHours: {
    one: "aproximadamente 1 hora",
    other: "aproximadamente {{count}} horas"
  },
  xHours: {
    one: "1 hora",
    other: "{{count}} horas"
  },
  xDays: {
    one: "1 dia",
    other: "{{count}} dias"
  },
  aboutXWeeks: {
    one: "aproximadamente 1 semana",
    other: "aproximadamente {{count}} semanas"
  },
  xWeeks: {
    one: "1 semana",
    other: "{{count}} semanas"
  },
  aboutXMonths: {
    one: "aproximadamente 1 mês",
    other: "aproximadamente {{count}} meses"
  },
  xMonths: {
    one: "1 mês",
    other: "{{count}} meses"
  },
  aboutXYears: {
    one: "aproximadamente 1 ano",
    other: "aproximadamente {{count}} anos"
  },
  xYears: {
    one: "1 ano",
    other: "{{count}} anos"
  },
  overXYears: {
    one: "mais de 1 ano",
    other: "mais de {{count}} anos"
  },
  almostXYears: {
    one: "quase 1 ano",
    other: "quase {{count}} anos"
  }
};
const formatDistance = (token, count, options) => {
  let result;
  const tokenValue = formatDistanceLocale[token];
  if (typeof tokenValue === "string") {
    result = tokenValue;
  } else if (count === 1) {
    result = tokenValue.one;
  } else {
    result = tokenValue.other.replace("{{count}}", String(count));
  }
  if (options?.addSuffix) {
    if (options.comparison && options.comparison > 0) {
      return "daqui a " + result;
    } else {
      return "há " + result;
    }
  }
  return result;
};
const dateFormats = {
  full: "EEEE, d 'de' MMMM 'de' y",
  long: "d 'de' MMMM 'de' y",
  medium: "d 'de' MMM 'de' y",
  short: "dd/MM/y"
};
const timeFormats = {
  full: "HH:mm:ss zzzz",
  long: "HH:mm:ss z",
  medium: "HH:mm:ss",
  short: "HH:mm"
};
const dateTimeFormats = {
  full: "{{date}} 'às' {{time}}",
  long: "{{date}} 'às' {{time}}",
  medium: "{{date}}, {{time}}",
  short: "{{date}}, {{time}}"
};
const formatLong = {
  date: buildFormatLongFn({
    formats: dateFormats,
    defaultWidth: "full"
  }),
  time: buildFormatLongFn({
    formats: timeFormats,
    defaultWidth: "full"
  }),
  dateTime: buildFormatLongFn({
    formats: dateTimeFormats,
    defaultWidth: "full"
  })
};
const formatRelativeLocale = {
  lastWeek: (date) => {
    const weekday = date.getDay();
    const last = weekday === 0 || weekday === 6 ? "último" : "última";
    return "'" + last + "' eeee 'às' p";
  },
  yesterday: "'ontem às' p",
  today: "'hoje às' p",
  tomorrow: "'amanhã às' p",
  nextWeek: "eeee 'às' p",
  other: "P"
};
const formatRelative = (token, date, _baseDate, _options) => {
  const format = formatRelativeLocale[token];
  if (typeof format === "function") {
    return format(date);
  }
  return format;
};
const eraValues = {
  narrow: ["aC", "dC"],
  abbreviated: ["a.C.", "d.C."],
  wide: ["antes de Cristo", "depois de Cristo"]
};
const quarterValues = {
  narrow: ["1", "2", "3", "4"],
  abbreviated: ["T1", "T2", "T3", "T4"],
  wide: ["1º trimestre", "2º trimestre", "3º trimestre", "4º trimestre"]
};
const monthValues = {
  narrow: ["j", "f", "m", "a", "m", "j", "j", "a", "s", "o", "n", "d"],
  abbreviated: [
    "jan",
    "fev",
    "mar",
    "abr",
    "mai",
    "jun",
    "jul",
    "ago",
    "set",
    "out",
    "nov",
    "dez"
  ],
  wide: [
    "janeiro",
    "fevereiro",
    "março",
    "abril",
    "maio",
    "junho",
    "julho",
    "agosto",
    "setembro",
    "outubro",
    "novembro",
    "dezembro"
  ]
};
const dayValues = {
  narrow: ["d", "s", "t", "q", "q", "s", "s"],
  short: ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"],
  abbreviated: ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"],
  wide: [
    "domingo",
    "segunda-feira",
    "terça-feira",
    "quarta-feira",
    "quinta-feira",
    "sexta-feira",
    "sábado"
  ]
};
const dayPeriodValues = {
  narrow: {
    am: "AM",
    pm: "PM",
    midnight: "meia-noite",
    noon: "meio-dia",
    morning: "manhã",
    afternoon: "tarde",
    evening: "noite",
    night: "madrugada"
  },
  abbreviated: {
    am: "AM",
    pm: "PM",
    midnight: "meia-noite",
    noon: "meio-dia",
    morning: "manhã",
    afternoon: "tarde",
    evening: "noite",
    night: "madrugada"
  },
  wide: {
    am: "AM",
    pm: "PM",
    midnight: "meia-noite",
    noon: "meio-dia",
    morning: "manhã",
    afternoon: "tarde",
    evening: "noite",
    night: "madrugada"
  }
};
const formattingDayPeriodValues = {
  narrow: {
    am: "AM",
    pm: "PM",
    midnight: "meia-noite",
    noon: "meio-dia",
    morning: "da manhã",
    afternoon: "da tarde",
    evening: "da noite",
    night: "da madrugada"
  },
  abbreviated: {
    am: "AM",
    pm: "PM",
    midnight: "meia-noite",
    noon: "meio-dia",
    morning: "da manhã",
    afternoon: "da tarde",
    evening: "da noite",
    night: "da madrugada"
  },
  wide: {
    am: "AM",
    pm: "PM",
    midnight: "meia-noite",
    noon: "meio-dia",
    morning: "da manhã",
    afternoon: "da tarde",
    evening: "da noite",
    night: "da madrugada"
  }
};
const ordinalNumber = (dirtyNumber, _options) => {
  const number = Number(dirtyNumber);
  return number + "º";
};
const localize = {
  ordinalNumber,
  era: buildLocalizeFn({
    values: eraValues,
    defaultWidth: "wide"
  }),
  quarter: buildLocalizeFn({
    values: quarterValues,
    defaultWidth: "wide",
    argumentCallback: (quarter) => quarter - 1
  }),
  month: buildLocalizeFn({
    values: monthValues,
    defaultWidth: "wide"
  }),
  day: buildLocalizeFn({
    values: dayValues,
    defaultWidth: "wide"
  }),
  dayPeriod: buildLocalizeFn({
    values: dayPeriodValues,
    defaultWidth: "wide",
    formattingValues: formattingDayPeriodValues,
    defaultFormattingWidth: "wide"
  })
};
const matchOrdinalNumberPattern = /^(\d+)(º|ª)?/i;
const parseOrdinalNumberPattern = /\d+/i;
const matchEraPatterns = {
  narrow: /^(ac|dc|a|d)/i,
  abbreviated: /^(a\.?\s?c\.?|a\.?\s?e\.?\s?c\.?|d\.?\s?c\.?|e\.?\s?c\.?)/i,
  wide: /^(antes de cristo|antes da era comum|depois de cristo|era comum)/i
};
const parseEraPatterns = {
  any: [/^ac/i, /^dc/i],
  wide: [
    /^(antes de cristo|antes da era comum)/i,
    /^(depois de cristo|era comum)/i
  ]
};
const matchQuarterPatterns = {
  narrow: /^[1234]/i,
  abbreviated: /^T[1234]/i,
  wide: /^[1234](º|ª)? trimestre/i
};
const parseQuarterPatterns = {
  any: [/1/i, /2/i, /3/i, /4/i]
};
const matchMonthPatterns = {
  narrow: /^[jfmasond]/i,
  abbreviated: /^(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)/i,
  wide: /^(janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)/i
};
const parseMonthPatterns = {
  narrow: [
    /^j/i,
    /^f/i,
    /^m/i,
    /^a/i,
    /^m/i,
    /^j/i,
    /^j/i,
    /^a/i,
    /^s/i,
    /^o/i,
    /^n/i,
    /^d/i
  ],
  any: [
    /^ja/i,
    /^f/i,
    /^mar/i,
    /^ab/i,
    /^mai/i,
    /^jun/i,
    /^jul/i,
    /^ag/i,
    /^s/i,
    /^o/i,
    /^n/i,
    /^d/i
  ]
};
const matchDayPatterns = {
  narrow: /^[dstq]/i,
  short: /^(dom|seg|ter|qua|qui|sex|s[áa]b)/i,
  abbreviated: /^(dom|seg|ter|qua|qui|sex|s[áa]b)/i,
  wide: /^(domingo|segunda-?\s?feira|terça-?\s?feira|quarta-?\s?feira|quinta-?\s?feira|sexta-?\s?feira|s[áa]bado)/i
};
const parseDayPatterns = {
  narrow: [/^d/i, /^s/i, /^t/i, /^q/i, /^q/i, /^s/i, /^s/i],
  any: [/^d/i, /^seg/i, /^t/i, /^qua/i, /^qui/i, /^sex/i, /^s[áa]/i]
};
const matchDayPeriodPatterns = {
  narrow: /^(a|p|meia-?\s?noite|meio-?\s?dia|(da) (manh[ãa]|tarde|noite|madrugada))/i,
  any: /^([ap]\.?\s?m\.?|meia-?\s?noite|meio-?\s?dia|(da) (manh[ãa]|tarde|noite|madrugada))/i
};
const parseDayPeriodPatterns = {
  any: {
    am: /^a/i,
    pm: /^p/i,
    midnight: /^meia/i,
    noon: /^meio/i,
    morning: /manh[ãa]/i,
    afternoon: /tarde/i,
    evening: /noite/i,
    night: /madrugada/i
  }
};
const match = {
  ordinalNumber: buildMatchPatternFn({
    matchPattern: matchOrdinalNumberPattern,
    parsePattern: parseOrdinalNumberPattern,
    valueCallback: (value) => parseInt(value, 10)
  }),
  era: buildMatchFn({
    matchPatterns: matchEraPatterns,
    defaultMatchWidth: "wide",
    parsePatterns: parseEraPatterns,
    defaultParseWidth: "any"
  }),
  quarter: buildMatchFn({
    matchPatterns: matchQuarterPatterns,
    defaultMatchWidth: "wide",
    parsePatterns: parseQuarterPatterns,
    defaultParseWidth: "any",
    valueCallback: (index) => index + 1
  }),
  month: buildMatchFn({
    matchPatterns: matchMonthPatterns,
    defaultMatchWidth: "wide",
    parsePatterns: parseMonthPatterns,
    defaultParseWidth: "any"
  }),
  day: buildMatchFn({
    matchPatterns: matchDayPatterns,
    defaultMatchWidth: "wide",
    parsePatterns: parseDayPatterns,
    defaultParseWidth: "any"
  }),
  dayPeriod: buildMatchFn({
    matchPatterns: matchDayPeriodPatterns,
    defaultMatchWidth: "any",
    parsePatterns: parseDayPeriodPatterns,
    defaultParseWidth: "any"
  })
};
const pt = {
  code: "pt",
  formatDistance,
  formatLong,
  formatRelative,
  localize,
  match,
  options: {
    weekStartsOn: 1,
    firstWeekContainsDate: 4
  }
};
function News() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = reactExports.useState("");
  const [categoryFilter, setCategoryFilter] = reactExports.useState("all");
  const [sourceFilter, setSourceFilter] = reactExports.useState("all");
  const [sortBy, setSortBy] = reactExports.useState("recent");
  const mockNews = [{
    id: "1",
    title: "Tesla Stock Surges 8% on Strong Q4 Delivery Numbers",
    summary: "Tesla exceeded expectations with record quarterly deliveries, driving significant investor optimism for the electric vehicle giant.",
    source: "Reuters",
    publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1e3),
    // 2 hours ago
    url: "#",
    category: "earnings",
    sentiment: "positive",
    stocks: ["TSLA"],
    views: 15420,
    isBookmarked: false
  }, {
    id: "2",
    title: "Federal Reserve Signals Potential Rate Cut in 2024",
    summary: "Fed Chairman Powell hints at possible monetary policy easing amid cooling inflation data, boosting market sentiment.",
    source: "Financial Times",
    publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1e3),
    // 4 hours ago
    url: "#",
    category: "market",
    sentiment: "positive",
    stocks: ["SPY", "QQQ"],
    views: 28350,
    isBookmarked: true
  }, {
    id: "3",
    title: "Apple Reports Mixed Q4 Results, Services Revenue Grows",
    summary: "While iPhone sales slowed, Apple's services division continues robust growth, offsetting hardware challenges.",
    source: "Bloomberg",
    publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1e3),
    // 6 hours ago
    url: "#",
    category: "earnings",
    sentiment: "neutral",
    stocks: ["AAPL"],
    views: 22180,
    isBookmarked: false
  }, {
    id: "4",
    title: "Microsoft Azure Gains Market Share Against AWS",
    summary: "Microsoft's cloud computing division continues to capture market share, threatening Amazon's dominance in cloud services.",
    source: "TechCrunch",
    publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1e3),
    // 8 hours ago
    url: "#",
    category: "technology",
    sentiment: "positive",
    stocks: ["MSFT", "AMZN"],
    views: 18760,
    isBookmarked: true
  }, {
    id: "5",
    title: "Oil Prices Rise on OPEC+ Production Cut Extension",
    summary: "Energy markets rally as OPEC+ extends production cuts through Q2, supporting crude oil price stability.",
    source: "CNBC",
    publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1e3),
    // 12 hours ago
    url: "#",
    category: "energy",
    sentiment: "positive",
    stocks: ["XOM", "CVX"],
    views: 14520,
    isBookmarked: false
  }, {
    id: "6",
    title: "Banking Sector Faces Regulatory Scrutiny Over AI Use",
    summary: "Financial regulators increase oversight of artificial intelligence applications in banking and credit decisions.",
    source: "Wall Street Journal",
    publishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1e3),
    // 1 day ago
    url: "#",
    category: "regulation",
    sentiment: "negative",
    stocks: ["JPM", "BAC", "WFC"],
    views: 19340,
    isBookmarked: false
  }];
  const {
    data: news = mockNews
  } = useQuery({
    queryKey: ["/api/news"],
    initialData: mockNews,
    staleTime: 5 * 60 * 1e3
    // 5 minutes
  });
  const categories = [{
    value: "all",
    label: "All News"
  }, {
    value: "market",
    label: "Market News"
  }, {
    value: "earnings",
    label: "Earnings"
  }, {
    value: "technology",
    label: "Technology"
  }, {
    value: "energy",
    label: "Energy"
  }, {
    value: "regulation",
    label: "Regulation"
  }];
  const sources = [{
    value: "all",
    label: "All Sources"
  }, {
    value: "Reuters",
    label: "Reuters"
  }, {
    value: "Bloomberg",
    label: "Bloomberg"
  }, {
    value: "Financial Times",
    label: "Financial Times"
  }, {
    value: "CNBC",
    label: "CNBC"
  }, {
    value: "Wall Street Journal",
    label: "WSJ"
  }];
  const filteredNews = news.filter((article) => {
    const matchesSearch = searchQuery === "" || article.title.toLowerCase().includes(searchQuery.toLowerCase()) || article.summary.toLowerCase().includes(searchQuery.toLowerCase()) || article.stocks.some((stock) => stock.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = categoryFilter === "all" || article.category === categoryFilter;
    const matchesSource = sourceFilter === "all" || article.source === sourceFilter;
    return matchesSearch && matchesCategory && matchesSource;
  }).sort((a, b) => {
    switch (sortBy) {
      case "recent":
        return b.publishedAt.getTime() - a.publishedAt.getTime();
      case "popular":
        return b.views - a.views;
      case "bookmarked":
        return Number(b.isBookmarked) - Number(a.isBookmarked);
      default:
        return 0;
    }
  });
  const topStories = filteredNews.slice(0, 3);
  const marketTrends = [{
    symbol: "SPY",
    change: "+1.2%",
    trend: "up"
  }, {
    symbol: "QQQ",
    change: "+1.8%",
    trend: "up"
  }, {
    symbol: "VIX",
    change: "-5.3%",
    trend: "down"
  }, {
    symbol: "DXY",
    change: "+0.4%",
    trend: "up"
  }];
  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case "positive":
        return "text-green-600 bg-green-100 dark:bg-green-900/20";
      case "negative":
        return "text-red-600 bg-red-100 dark:bg-red-900/20";
      default:
        return "text-gray-600 bg-gray-100 dark:bg-gray-900/20";
    }
  };
  const handleStockClick = (symbol) => {
    setLocation(`/stock/${symbol}`);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(MainLayout, {
    children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
      className: "container mx-auto px-6 py-8 max-w-7xl",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "flex items-center justify-between mb-6",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "flex items-center gap-3",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "p-2 bg-primary/10 rounded-xl",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(Newspaper, {
              className: "h-6 w-6 text-primary"
            })
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h1", {
              className: "text-3xl font-bold text-foreground",
              children: "Market News"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
              className: "text-muted-foreground",
              children: "Stay informed with the latest financial news and market updates"
            })]
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
          className: "flex items-center space-x-2",
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
            variant: "outline",
            size: "sm",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Bookmark, {
              className: "h-4 w-4 mr-2"
            }), "Bookmarks"]
          })
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
        className: "mb-6",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, {
            className: "flex items-center gap-2",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(ChartColumn, {
              className: "h-5 w-5"
            }), "Market Overview"]
          })
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
          children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "grid grid-cols-2 md:grid-cols-4 gap-4",
            children: marketTrends.map((trend) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors",
              onClick: () => handleStockClick(trend.symbol),
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                className: "font-medium",
                children: trend.symbol
              }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                className: cn("text-sm font-semibold", trend.trend === "up" ? "text-green-600" : "text-red-600"),
                children: trend.change
              })]
            }, trend.symbol))
          })
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "flex flex-col sm:flex-row gap-4 mb-6",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "flex-1 relative",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Search, {
            className: "absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(Input, {
            placeholder: "Search news, stocks, or topics...",
            value: searchQuery,
            onChange: (e) => setSearchQuery(e.target.value),
            className: "pl-9"
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "flex gap-2",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(Select, {
            value: categoryFilter,
            onValueChange: setCategoryFilter,
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, {
              className: "w-36",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {})
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, {
              children: categories.map((category) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                value: category.value,
                children: category.label
              }, category.value))
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, {
            value: sourceFilter,
            onValueChange: setSourceFilter,
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, {
              className: "w-36",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {})
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, {
              children: sources.map((source) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                value: source.value,
                children: source.label
              }, source.value))
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, {
            value: sortBy,
            onValueChange: setSortBy,
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, {
              className: "w-32",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {})
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, {
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                value: "recent",
                children: "Recent"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                value: "popular",
                children: "Popular"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                value: "bookmarked",
                children: "Bookmarked"
              })]
            })]
          })]
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Tabs, {
        defaultValue: "all",
        className: "w-full",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(TabsList, {
          className: "mb-6",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, {
            value: "all",
            children: "All News"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, {
            value: "top",
            children: "Top Stories"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, {
            value: "watchlist",
            children: "My Watchlist"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, {
            value: "bookmarks",
            children: "Bookmarks"
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, {
          value: "all",
          className: "space-y-6",
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "grid grid-cols-1 lg:grid-cols-3 gap-6",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
              className: "lg:col-span-2 space-y-4",
              children: filteredNews.map((article, index) => /* @__PURE__ */ jsxRuntimeExports.jsx(motion.div, {
                initial: {
                  opacity: 0,
                  y: 20
                },
                animate: {
                  opacity: 1,
                  y: 0
                },
                transition: {
                  delay: index * 0.05
                },
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(Card, {
                  className: "hover:shadow-lg transition-all duration-300 cursor-pointer group",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
                    className: "p-6",
                    children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                      className: "flex items-start gap-4",
                      children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                        className: "w-16 h-16 bg-muted rounded-lg flex-shrink-0 flex items-center justify-center",
                        children: /* @__PURE__ */ jsxRuntimeExports.jsx(Newspaper, {
                          className: "h-6 w-6 text-muted-foreground"
                        })
                      }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                        className: "flex-1 min-w-0",
                        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                          className: "flex items-center gap-2 mb-2",
                          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Badge, {
                            variant: "outline",
                            className: "text-xs",
                            children: article.category
                          }), /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, {
                            className: cn("text-xs", getSentimentColor(article.sentiment)),
                            children: article.sentiment
                          }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                            className: "text-xs text-muted-foreground",
                            children: article.source
                          })]
                        }), /* @__PURE__ */ jsxRuntimeExports.jsx("h3", {
                          className: "font-semibold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors",
                          children: article.title
                        }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                          className: "text-muted-foreground text-sm mb-3 line-clamp-2",
                          children: article.summary
                        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                          className: "flex items-center justify-between",
                          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                            className: "flex items-center gap-4 text-xs text-muted-foreground",
                            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                              className: "flex items-center gap-1",
                              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Clock, {
                                className: "h-3 w-3"
                              }), formatDistanceToNow(article.publishedAt, {
                                addSuffix: true,
                                locale: pt
                              })]
                            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                              className: "flex items-center gap-1",
                              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Eye, {
                                className: "h-3 w-3"
                              }), article.views.toLocaleString()]
                            })]
                          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                            className: "flex items-center gap-2",
                            children: [article.stocks.map((stock) => /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, {
                              variant: "secondary",
                              className: "text-xs cursor-pointer hover:bg-primary/20",
                              onClick: (e) => {
                                e.stopPropagation();
                                handleStockClick(stock);
                              },
                              children: stock
                            }, stock)), /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
                              variant: "ghost",
                              size: "sm",
                              className: "p-1",
                              children: /* @__PURE__ */ jsxRuntimeExports.jsx(Bookmark, {
                                className: cn("h-4 w-4", article.isBookmarked ? "fill-current text-primary" : "")
                              })
                            }), /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
                              variant: "ghost",
                              size: "sm",
                              className: "p-1",
                              children: /* @__PURE__ */ jsxRuntimeExports.jsx(Share, {
                                className: "h-4 w-4"
                              })
                            }), /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
                              variant: "ghost",
                              size: "sm",
                              className: "p-1",
                              children: /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, {
                                className: "h-4 w-4"
                              })
                            })]
                          })]
                        })]
                      })]
                    })
                  })
                })
              }, article.id))
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "lg:col-span-1 space-y-6",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
                  children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, {
                    className: "flex items-center gap-2",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Star, {
                      className: "h-5 w-5"
                    }), "Top Stories"]
                  })
                }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
                  className: "space-y-4",
                  children: topStories.map((story, index) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex items-start gap-3 pb-3 border-b last:border-b-0 last:pb-0",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                      className: "w-6 h-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-xs",
                      children: index + 1
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                      className: "flex-1 min-w-0",
                      children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h4", {
                        className: "font-medium text-sm line-clamp-2 mb-1",
                        children: story.title
                      }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                        className: "flex items-center gap-2 text-xs text-muted-foreground",
                        children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                          children: story.source
                        }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                          children: "•"
                        }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                          children: formatDistanceToNow(story.publishedAt, {
                            addSuffix: true,
                            locale: pt
                          })
                        })]
                      })]
                    })]
                  }, story.id))
                })]
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
                  children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, {
                    className: "flex items-center gap-2",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, {
                      className: "h-5 w-5"
                    }), "Trending Stocks"]
                  })
                }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
                  className: "space-y-3",
                  children: ["TSLA", "AAPL", "MSFT", "NVDA", "GOOGL"].map((symbol) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex items-center justify-between p-2 rounded hover:bg-muted transition-colors cursor-pointer",
                    onClick: () => handleStockClick(symbol),
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "font-medium",
                      children: symbol
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, {
                      className: "h-4 w-4 text-muted-foreground"
                    })]
                  }, symbol))
                })]
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
                  children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, {
                    className: "flex items-center gap-2",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Globe, {
                      className: "h-5 w-5"
                    }), "News Sources"]
                  })
                }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
                  className: "space-y-2",
                  children: ["Reuters", "Bloomberg", "Financial Times", "CNBC", "WSJ"].map((source) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex items-center justify-between text-sm",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      children: source
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
                      className: "text-muted-foreground",
                      children: [Math.floor(Math.random() * 20) + 5, " articles"]
                    })]
                  }, source))
                })]
              })]
            })]
          })
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, {
          value: "top",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6",
            children: topStories.map((story) => /* @__PURE__ */ jsxRuntimeExports.jsx(Card, {
              className: "hover:shadow-lg transition-all duration-300",
              children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
                className: "p-6",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Badge, {
                  variant: "outline",
                  className: "mb-3",
                  children: story.category
                }), /* @__PURE__ */ jsxRuntimeExports.jsx("h3", {
                  className: "font-semibold text-lg mb-3 line-clamp-2",
                  children: story.title
                }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                  className: "text-muted-foreground text-sm mb-4 line-clamp-3",
                  children: story.summary
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "flex items-center justify-between text-xs text-muted-foreground",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                    children: story.source
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                    children: formatDistanceToNow(story.publishedAt, {
                      addSuffix: true,
                      locale: pt
                    })
                  })]
                })]
              })
            }, story.id))
          })
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, {
          value: "watchlist",
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "text-center py-12",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Newspaper, {
              className: "w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("h3", {
              className: "text-lg font-semibold mb-2",
              children: "Watchlist News"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
              className: "text-muted-foreground mb-4",
              children: "News related to stocks in your watchlists will appear here."
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
              onClick: () => setLocation("/watchlists"),
              children: "Manage Watchlists"
            })]
          })
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, {
          value: "bookmarks",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "space-y-4",
            children: filteredNews.filter((article) => article.isBookmarked).map((article) => /* @__PURE__ */ jsxRuntimeExports.jsx(Card, {
              className: "hover:shadow-lg transition-all duration-300",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
                className: "p-6",
                children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "flex items-start gap-4",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                    className: "w-16 h-16 bg-muted rounded-lg flex-shrink-0 flex items-center justify-center",
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx(Bookmark, {
                      className: "h-6 w-6 text-primary fill-current"
                    })
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex-1",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h3", {
                      className: "font-semibold text-lg mb-2",
                      children: article.title
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                      className: "text-muted-foreground text-sm mb-3",
                      children: article.summary
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                      className: "flex items-center gap-4 text-xs text-muted-foreground",
                      children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                        children: article.source
                      }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                        children: formatDistanceToNow(article.publishedAt, {
                          addSuffix: true,
                          locale: pt
                        })
                      })]
                    })]
                  })]
                })
              })
            }, article.id))
          })
        })]
      })]
    })
  });
}
export {
  News as default
};
