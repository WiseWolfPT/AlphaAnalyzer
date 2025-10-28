const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/api-BKV66h_w.js","assets/queryClient-CXMFu_RS.js","assets/api-config-Zh6ttKls.js","assets/index-DF734YkB.js","assets/index-DYOgWAf3.css"])))=>i.map(i=>d[i]);
import { e as createLucideIcon, r as reactExports, j as jsxRuntimeExports, f as cn, _ as __vitePreload, B as Button, C as Card, X, a as CardHeader, b as CardTitle, c as CardContent, n as TrendingUp, T as TrendingDown } from "./index-DF734YkB.js";
import { I as Input } from "./input-vX2xFcRS.js";
import { B as Badge } from "./badge-Bax4ZZX3.js";
import { b as useCachedQuote } from "./use-cache-data-WpPFNsyq.js";
import { LightweightMiniChart } from "./lightweight-chart-CPbISesF.js";
import { g as getAPIURL } from "./api-config-Zh6ttKls.js";
import { u as useRealtimeQuote } from "./use-realtime-quotes-C1iJFH8l.js";
import { d as useQuery } from "./useQuery-C9HFImIm.js";
import { D as Download } from "./download-8GhWTv4F.js";
import { F as FileText } from "./file-text-BCjG82i7.js";
import { W as Wifi } from "./wifi-Cr-Lls-T.js";
import { P as Plus } from "./plus-DmsdXgBw.js";
import { C as ChartColumn, a as Calculator } from "./chart-column-DNzw3S_G.js";
import { T as Target } from "./target-D9zmh0Nc.js";
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const GitCompare = createLucideIcon("GitCompare", [
  ["circle", { cx: "18", cy: "18", r: "3", key: "1xkwt0" }],
  ["circle", { cx: "6", cy: "6", r: "3", key: "1lh9wr" }],
  ["path", { d: "M13 6h3a2 2 0 0 1 2 2v7", key: "1yeb86" }],
  ["path", { d: "M11 18H8a2 2 0 0 1-2-2V9", key: "19pyzm" }]
]);
function MiniChart({
  stock,
  type,
  height = 40,
  className
}) {
  const [data, setData] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(true);
  const [trend, setTrend] = reactExports.useState("neutral");
  reactExports.useEffect(() => {
    const loadChartData = async () => {
      setLoading(true);
      try {
        let chartData = [];
        switch (type) {
          case "price":
            chartData = await generatePriceData(stock);
            break;
          case "revenue":
            chartData = await generateRevenueData(stock);
            break;
          case "earnings":
            chartData = await generateEarningsData(stock);
            break;
          case "volume":
            chartData = await generateVolumeData(stock);
            break;
        }
        setData(chartData);
        if (chartData.length >= 2) {
          const first = chartData[0].value;
          const last = chartData[chartData.length - 1].value;
          const change = (last - first) / first;
          if (change > 0.02) setTrend("up");
          else if (change < -0.02) setTrend("down");
          else setTrend("neutral");
        }
      } catch (error) {
        console.error(`Failed to load ${type} data for ${stock.symbol}:`, error);
        setData(generateFallbackData(stock, type));
        setTrend("neutral");
      } finally {
        setLoading(false);
      }
    };
    loadChartData();
  }, [stock.symbol, type]);
  if (loading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
      className: cn("animate-pulse bg-muted rounded", className),
      style: {
        height
      },
      children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
        className: "w-full h-full bg-muted/50 rounded"
      })
    });
  }
  const getChartColor = () => {
    switch (trend) {
      case "up":
        return "#10b981";
      // green
      case "down":
        return "#ef4444";
      // red
      default:
        return "#6b7280";
    }
  };
  const chartType = type === "price" ? "area" : "line";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
    className: cn("relative", className),
    style: {
      height
    },
    children: [/* @__PURE__ */ jsxRuntimeExports.jsx(LightweightMiniChart, {
      data,
      type: chartType,
      color: getChartColor(),
      height
    }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
      className: cn("absolute top-1 right-1 w-2 h-2 rounded-full", trend === "up" ? "bg-green-500" : trend === "down" ? "bg-red-500" : "bg-gray-500")
    })]
  });
}
async function generatePriceData(stock) {
  try {
    const endpoint = getAPIURL(`/cache/historical/${encodeURIComponent(stock.symbol)}/1m`);
    const resp = await fetch(endpoint, {
      credentials: "include"
    });
    if (resp.ok) {
      const body = await resp.json();
      const arr = body?.data || body || [];
      if (Array.isArray(arr) && arr.length > 0) {
        return arr.slice(-15).map((item) => ({
          date: new Date(item.date || item.timestamp || Date.now()).toLocaleDateString(),
          value: Number(item.close ?? item.price ?? item.value ?? 0)
        }));
      }
    }
  } catch (error) {
    console.warn("Failed to get cached historical data, using fallback");
  }
  return generateFallbackData(stock, "price");
}
async function generateRevenueData(stock) {
  try {
    const endpoint = getAPIURL(`/cache/financials/${encodeURIComponent(stock.symbol)}`);
    const resp = await fetch(endpoint, {
      credentials: "include"
    });
    if (resp.ok) {
      const body = await resp.json();
      const fin = body?.data || body || {};
      const series = fin.revenue || fin.quarterlyRevenue || [];
      if (Array.isArray(series) && series.length > 0) {
        return series.slice(-8).map((item) => ({
          date: item.quarter || item.date || "",
          value: Number(item.value ?? item.amount ?? 0),
          label: `${item.quarter || item.date}: $${(Number(item.value ?? item.amount ?? 0) / 1e3).toFixed(1)}B`
        }));
      }
    }
  } catch (error) {
    console.warn("Failed to get cached financials (revenue), using fallback");
  }
  return generateFallbackData(stock, "revenue");
}
async function generateEarningsData(stock) {
  try {
    const endpoint = getAPIURL(`/cache/financials/${encodeURIComponent(stock.symbol)}`);
    const resp = await fetch(endpoint, {
      credentials: "include"
    });
    if (resp.ok) {
      const body = await resp.json();
      const fin = body?.data || body || {};
      const series = fin.eps || fin.quarterlyEPS || [];
      if (Array.isArray(series) && series.length > 0) {
        return series.slice(-8).map((item) => ({
          date: item.quarter || item.date || "",
          value: Number(item.value ?? item.amount ?? 0),
          label: `${item.quarter || item.date}: $${Number(item.value ?? item.amount ?? 0).toFixed(2)}`
        }));
      }
    }
  } catch (error) {
    console.warn("Failed to get cached financials (earnings), using fallback");
  }
  return generateFallbackData(stock, "earnings");
}
async function generateVolumeData(stock) {
  const data = [];
  const baseVolume = 5e6;
  for (let i = 14; i >= 0; i--) {
    const date = /* @__PURE__ */ new Date();
    date.setDate(date.getDate() - i);
    const volume = baseVolume + (Math.random() - 0.5) * baseVolume * 0.8;
    data.push({
      date: date.toLocaleDateString(),
      value: Math.floor(volume),
      label: `${date.toLocaleDateString()}: ${(volume / 1e6).toFixed(1)}M`
    });
  }
  return data;
}
function generateFallbackData(stock, type) {
  const points = type === "price" || type === "volume" ? 15 : 8;
  const data = [];
  const baseValues = {
    price: parseFloat(stock.price),
    revenue: 8e4,
    // 80B
    earnings: parseFloat(stock.eps || "5"),
    volume: 5e6
    // 5M
  };
  const baseValue = baseValues[type] || 100;
  let currentValue = baseValue;
  for (let i = points - 1; i >= 0; i--) {
    const date = /* @__PURE__ */ new Date();
    if (type === "price" || type === "volume") {
      date.setDate(date.getDate() - i);
    } else {
      date.setMonth(date.getMonth() - i);
    }
    const volatility = type === "price" ? 0.03 : type === "volume" ? 0.4 : 0.1;
    const change = (Math.random() - 0.5) * volatility * baseValue;
    currentValue = Math.max(currentValue + change, baseValue * (1 - volatility));
    const formatDate = () => {
      if (type === "price" || type === "volume") {
        return date.toLocaleDateString();
      } else {
        return `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`;
      }
    };
    data.push({
      date: formatDate(),
      value: parseFloat(currentValue.toFixed(2)),
      label: `${formatDate()}: ${currentValue.toFixed(2)}`
    });
  }
  return data;
}
const normalizeIntrinsicValue = (data) => {
  if (!data) return null;
  const candidates = [data.intrinsicValue, data.value, data?.dcf?.value, data.dcfValue, data.fairValue];
  for (const candidate of candidates) {
    const numericValue = Number(candidate);
    if (!Number.isNaN(numericValue) && Number.isFinite(numericValue)) {
      return numericValue;
    }
  }
  return null;
};
const fetchIntrinsicValueData = async (symbol) => {
  try {
    const {
      intrinsicValueApi
    } = await __vitePreload(async () => {
      const {
        intrinsicValueApi: intrinsicValueApi2
      } = await import("./api-BKV66h_w.js");
      return {
        intrinsicValueApi: intrinsicValueApi2
      };
    }, true ? __vite__mapDeps([0,1,2,3,4]) : void 0);
    const tryFetch = async (ticker) => {
      const response = await intrinsicValueApi.getBySymbol(ticker);
      return response?.data ?? null;
    };
    const direct = await tryFetch(symbol);
    if (direct) return direct;
    const normalized = symbol.includes(".") ? symbol.replace(/\./g, "-") : symbol;
    if (normalized !== symbol) {
      const fallback = await tryFetch(normalized);
      if (fallback) return fallback;
    }
    return null;
  } catch (error) {
    console.warn("[intrinsic-value] Falha ao carregar valor intrínseco", {
      symbol,
      error
    });
    return null;
  }
};
function ComparePage() {
  const [comparisonStocks, setComparisonStocks] = reactExports.useState([{
    symbol: "AAPL"
  }, {
    symbol: "MSFT"
  }]);
  const [searchSymbol, setSearchSymbol] = reactExports.useState("");
  const [useRealtime, setUseRealtime] = reactExports.useState(false);
  const addStock = () => {
    if (searchSymbol.trim() && comparisonStocks.length < 4) {
      const symbol = searchSymbol.trim().toUpperCase();
      if (!comparisonStocks.find((s) => s.symbol === symbol)) {
        setComparisonStocks([...comparisonStocks, {
          symbol
        }]);
        setSearchSymbol("");
      }
    }
  };
  const removeStock = (symbolToRemove) => {
    setComparisonStocks(comparisonStocks.filter((s) => s.symbol !== symbolToRemove));
  };
  const exportToCSV = () => {
    if (comparisonStocks.length === 0) return;
    const headers = ["Symbol", "Current Price", "Change %", "Intrinsic Value", "Valuation", "Upside/Downside %"];
    const csvContent = [headers.join(","), ...comparisonStocks.map((stock) => {
      const symbol = stock.symbol;
      const cardElement = document.querySelector(`[data-stock-symbol="${symbol}"]`);
      const priceElement = cardElement?.querySelector("[data-price]");
      const changeElement = cardElement?.querySelector("[data-change]");
      const ivElement = cardElement?.querySelector("[data-intrinsic-value]");
      const valuationElement = cardElement?.querySelector("[data-valuation]");
      const diffElement = cardElement?.querySelector("[data-difference]");
      const price = priceElement?.textContent || "N/A";
      const changePercent = changeElement?.textContent || "N/A";
      const intrinsicValue = ivElement?.textContent || "N/A";
      const valuation = valuationElement?.textContent || "N/A";
      const difference = diffElement?.textContent || "N/A";
      const escapeCSV = (value) => value.includes(",") ? `"${value}"` : value;
      return [escapeCSV(symbol), escapeCSV(price), escapeCSV(changePercent), escapeCSV(intrinsicValue), escapeCSV(valuation), escapeCSV(difference)].join(",");
    })].join("\n");
    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;"
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `stock-comparison-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.csv`;
    link.click();
  };
  const exportToPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const tableRows = comparisonStocks.map((stock) => {
      const symbol = stock.symbol;
      const cardElement = document.querySelector(`[data-stock-symbol="${symbol}"]`);
      const priceElement = cardElement?.querySelector("[data-price]");
      const changeElement = cardElement?.querySelector("[data-change]");
      const ivElement = cardElement?.querySelector("[data-intrinsic-value]");
      const valuationElement = cardElement?.querySelector("[data-valuation]");
      const diffElement = cardElement?.querySelector("[data-difference]");
      const price = priceElement?.textContent || "N/A";
      const changePercent = changeElement?.textContent || "N/A";
      const intrinsicValue = ivElement?.textContent || "N/A";
      const valuation = valuationElement?.textContent || "N/A";
      const difference = diffElement?.textContent || "N/A";
      return `
        <tr>
          <td><strong>${symbol}</strong></td>
          <td>${price}</td>
          <td>${changePercent}</td>
          <td>${intrinsicValue}</td>
          <td>${valuation}</td>
          <td>${difference}</td>
        </tr>
      `;
    }).join("");
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Stock Comparison Report</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 20px;
            line-height: 1.6;
          }
          h1 {
            color: #059669;
            border-bottom: 3px solid #059669;
            padding-bottom: 10px;
          }
          .header-info {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
          th {
            background-color: #059669;
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: 600;
          }
          td {
            border: 1px solid #e0e0e0;
            padding: 12px;
            text-align: left;
          }
          tr:nth-child(even) {
            background-color: #f9f9f9;
          }
          tr:hover {
            background-color: #f0f9f5;
          }
          .generated {
            margin-top: 30px;
            font-size: 12px;
            color: #666;
            text-align: center;
            border-top: 1px solid #e0e0e0;
            padding-top: 20px;
          }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <h1>📊 Stock Comparison Report</h1>
        <div class="header-info">
          <p><strong>Generated:</strong> ${(/* @__PURE__ */ new Date()).toLocaleDateString()} at ${(/* @__PURE__ */ new Date()).toLocaleTimeString()}</p>
          <p><strong>Symbols Compared:</strong> ${comparisonStocks.map((s) => s.symbol).join(", ")}</p>
          <p><strong>Total Stocks:</strong> ${comparisonStocks.length}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Current Price</th>
              <th>Change %</th>
              <th>Intrinsic Value</th>
              <th>Valuation</th>
              <th>Upside/Downside %</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        <div class="generated">
          <strong>Generated by Alfalyzer</strong><br>
          Professional Stock Analysis Platform<br>
          <em>Data sourced from real-time market feeds</em>
        </div>
      </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
    className: "container mx-auto p-6 space-y-6",
    children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
      className: "flex items-center justify-between",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "flex items-center gap-3",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
          className: "p-2 bg-teya-green/20 rounded-lg",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(GitCompare, {
            className: "h-6 w-6 text-teya-green"
          })
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h1", {
            className: "text-3xl font-bold",
            children: "Compare Stocks"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
            className: "text-muted-foreground",
            children: "Analise até 4 ações lado a lado com foco em valor intrínseco"
          })]
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "flex items-center gap-2",
        children: [comparisonStocks.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, {
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
            variant: "outline",
            size: "sm",
            onClick: exportToCSV,
            title: "Export comparison to CSV",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Download, {
              className: "w-4 h-4"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
              className: "ml-1 hidden sm:inline",
              children: "CSV"
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
            variant: "outline",
            size: "sm",
            onClick: exportToPDF,
            title: "Export comparison to PDF",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(FileText, {
              className: "w-4 h-4"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
              className: "ml-1 hidden sm:inline",
              children: "PDF"
            })]
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
          variant: useRealtime ? "default" : "outline",
          size: "sm",
          onClick: () => setUseRealtime(!useRealtime),
          className: useRealtime ? "bg-teya-green hover:bg-teya-green-dark text-black" : "",
          title: "Alternar atualizações em tempo real",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Wifi, {
            className: "w-4 h-4"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
            className: "ml-1 hidden sm:inline",
            children: "Tempo Real"
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(Input, {
          placeholder: "Símbolo (ex: TSLA)",
          value: searchSymbol,
          onChange: (e) => setSearchSymbol(e.target.value),
          onKeyPress: (e) => e.key === "Enter" && addStock(),
          className: "w-40",
          disabled: comparisonStocks.length >= 4
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
          onClick: addStock,
          disabled: !searchSymbol.trim() || comparisonStocks.length >= 4,
          className: "bg-teya-green text-teya-dark hover:bg-teya-green/90",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, {
            className: "h-4 w-4"
          })
        })]
      })]
    }), comparisonStocks.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
      className: "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6",
      children: comparisonStocks.map((stockItem) => /* @__PURE__ */ jsxRuntimeExports.jsx(ComparisonCard, {
        symbol: stockItem.symbol,
        onRemove: () => removeStock(stockItem.symbol),
        canRemove: comparisonStocks.length > 1,
        useRealtime
      }, stockItem.symbol))
    }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
      className: "p-12 text-center",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsx(GitCompare, {
        className: "h-12 w-12 text-muted-foreground mx-auto mb-4"
      }), /* @__PURE__ */ jsxRuntimeExports.jsx("h3", {
        className: "text-lg font-semibold mb-2",
        children: "Nenhuma ação para comparar"
      }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
        className: "text-muted-foreground",
        children: "Adicione pelo menos 2 ações para começar a comparação"
      })]
    }), comparisonStocks.length >= 2 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
      className: "space-y-6",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("h2", {
        className: "text-2xl font-bold flex items-center gap-2",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx(ChartColumn, {
          className: "h-6 w-6 text-teya-green"
        }), "Análise Comparativa"]
      }), /* @__PURE__ */ jsxRuntimeExports.jsx(ComparisonCharts, {
        stocks: comparisonStocks
      })]
    })]
  });
}
function ComparisonCard({
  symbol,
  onRemove,
  canRemove,
  useRealtime
}) {
  const {
    data: cachedQuote,
    isLoading: stockLoading
  } = useCachedQuote(symbol);
  const {
    data: intrinsicData,
    isLoading: ivLoading
  } = useQuery({
    queryKey: ["intrinsicValue", symbol],
    queryFn: () => fetchIntrinsicValueData(symbol),
    staleTime: 24 * 60 * 60 * 1e3,
    enabled: Boolean(symbol)
  });
  const intrinsicValue = normalizeIntrinsicValue(intrinsicData);
  const {
    quote: realtimeQuote,
    isConnected
  } = useRealtimeQuote(symbol, {
    enabled: useRealtime
  });
  const calculations = reactExports.useMemo(() => {
    if (!cachedQuote?.data && !realtimeQuote) return null;
    const currentPrice = realtimeQuote?.price || cachedQuote?.data?.price || 0;
    const changePercent = realtimeQuote?.change_percent ?? cachedQuote?.data?.changePercent ?? 0;
    const isPositive = realtimeQuote ? realtimeQuote.change >= 0 : (cachedQuote?.data?.changePercent ?? 0) >= 0;
    const hasIntrinsicValue = typeof intrinsicValue === "number" && intrinsicValue !== 0;
    const valuationDiff = hasIntrinsicValue ? (currentPrice - intrinsicValue) / intrinsicValue * 100 : null;
    const isUndervalued = valuationDiff !== null ? valuationDiff < 0 : false;
    return {
      currentPrice,
      changePercent,
      isPositive,
      intrinsicValue,
      valuationDiff,
      isUndervalued
    };
  }, [cachedQuote, intrinsicValue, realtimeQuote]);
  if (stockLoading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Card, {
      className: "h-[400px] flex items-center justify-center",
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "text-center",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
          className: "w-8 h-8 border-2 border-teya-green border-t-transparent rounded-full animate-spin mx-auto mb-2"
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
          className: "text-sm text-muted-foreground",
          children: ["Carregando ", symbol, "..."]
        })]
      })
    });
  }
  if (!calculations) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Card, {
      className: "h-[400px] flex items-center justify-center",
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "text-center",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx(X, {
          className: "h-8 w-8 text-red-500 mx-auto mb-2"
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
          className: "text-sm text-muted-foreground",
          children: ["Erro ao carregar ", symbol]
        }), canRemove && /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
          variant: "outline",
          size: "sm",
          onClick: onRemove,
          className: "mt-2",
          children: "Remover"
        })]
      })
    });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
    className: "h-[400px] relative group",
    "data-stock-symbol": symbol,
    children: [useRealtime && isConnected && realtimeQuote && /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
      className: "absolute top-2 left-2 z-10",
      children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
        className: "inline-flex h-2 w-2 rounded-full bg-green-500 animate-pulse",
        title: "Dados em tempo real"
      })
    }), canRemove && /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
      variant: "ghost",
      size: "sm",
      className: "absolute top-2 right-2 w-8 h-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity z-10",
      onClick: onRemove,
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, {
        className: "h-4 w-4"
      })
    }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
      className: "pb-4",
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "flex items-center gap-3",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
          className: "w-10 h-10 bg-teya-green/20 rounded-lg flex items-center justify-center",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
            className: "font-bold text-teya-green",
            children: symbol.charAt(0)
          })
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, {
            className: "text-lg",
            children: symbol
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
            className: "text-sm text-muted-foreground truncate",
            children: "Company"
          })]
        })]
      })
    }), /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
      className: "space-y-4",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
        className: "space-y-2",
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "flex items-center justify-between",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
            className: "text-2xl font-bold",
            "data-price": true,
            children: ["$", calculations.currentPrice?.toFixed(2) || "0.00"]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, {
            variant: calculations.isPositive ? "default" : "secondary",
            className: cn(calculations.isPositive ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"),
            "data-change": true,
            children: [calculations.isPositive ? "+" : "", calculations.changePercent?.toFixed(1) || "0.0", "%"]
          })]
        })
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "bg-teya-green/5 border border-teya-green/20 rounded-lg p-3 space-y-2",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "flex items-center justify-between",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex items-center gap-1",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Calculator, {
              className: "h-3 w-3 text-teya-green"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
              className: "text-xs font-medium",
              children: "Valor Intrínseco"
            })]
          }), ivLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "w-4 h-4 border border-teya-green border-t-transparent rounded-full animate-spin"
          }) : typeof intrinsicValue === "number" ? /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
            className: "text-sm font-bold text-teya-green",
            "data-intrinsic-value": true,
            children: ["$", intrinsicValue.toFixed(2)]
          }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
            className: "text-xs text-muted-foreground",
            "data-intrinsic-value": true,
            children: "N/A"
          })]
        }), typeof calculations.intrinsicValue === "number" && calculations.valuationDiff !== null && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "flex items-center justify-between",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Badge, {
            variant: calculations.isUndervalued ? "default" : "secondary",
            className: cn("text-xs", calculations.isUndervalued ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"),
            "data-valuation": true,
            children: calculations.isUndervalued ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, {
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, {
                className: "h-3 w-3 mr-1"
              }), "Subvalorizada"]
            }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, {
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(TrendingDown, {
                className: "h-3 w-3 mr-1"
              }), "Sobrevalorizada"]
            })
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
            className: cn("text-xs font-medium", calculations.isUndervalued ? "text-green-600" : "text-red-600"),
            "data-difference": true,
            children: [calculations.valuationDiff > 0 ? "+" : "", calculations.valuationDiff?.toFixed(1) || "0.0", "%"]
          })]
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "space-y-2",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "flex items-center justify-between",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
            className: "text-xs text-muted-foreground",
            children: "Price Trend (1M)"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(ChartColumn, {
            className: "h-3 w-3 text-muted-foreground"
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
          className: "h-16 border border-border/50 rounded",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(MiniChart, {
            stock: {
              symbol,
              price: String(calculations.currentPrice ?? 0)
            },
            type: "price",
            height: 60
          })
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "space-y-2 text-sm",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "flex justify-between",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
            className: "text-muted-foreground",
            children: "Market Cap"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
            className: "font-medium",
            children: cachedQuote?.data?.marketCap ? `$${Number(cachedQuote.data.marketCap).toLocaleString()}` : "N/A"
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "flex justify-between",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
            className: "text-muted-foreground",
            children: "P/E Ratio"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
            className: "font-medium",
            children: cachedQuote?.data?.pe ?? "N/A"
          })]
        })]
      })]
    })]
  });
}
function ComparisonCharts({
  stocks
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
    className: "grid grid-cols-1 lg:grid-cols-2 gap-6",
    children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
      children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, {
          className: "flex items-center gap-2",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Target, {
            className: "h-5 w-5 text-teya-green"
          }), "Preço vs Valor Intrínseco"]
        })
      }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
        children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
          className: "space-y-4",
          children: stocks.map((stockItem) => /* @__PURE__ */ jsxRuntimeExports.jsx(PriceVsIVRow, {
            symbol: stockItem.symbol
          }, stockItem.symbol))
        })
      })]
    }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
      children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, {
          className: "flex items-center gap-2",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, {
            className: "h-5 w-5 text-teya-green"
          }), "Performance Comparison"]
        })
      }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
        children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
          className: "space-y-4",
          children: stocks.map((stockItem) => /* @__PURE__ */ jsxRuntimeExports.jsx(PerformanceRow, {
            symbol: stockItem.symbol
          }, stockItem.symbol))
        })
      })]
    })]
  });
}
function PriceVsIVRow({
  symbol
}) {
  const {
    data: cachedQuote
  } = useCachedQuote(symbol);
  const {
    data: intrinsicData
  } = useQuery({
    queryKey: ["intrinsicValue", symbol],
    queryFn: () => fetchIntrinsicValueData(symbol),
    staleTime: 24 * 60 * 60 * 1e3,
    enabled: Boolean(symbol)
  });
  const intrinsicValue = normalizeIntrinsicValue(intrinsicData);
  const currentPrice = cachedQuote?.data?.price ?? 0;
  const hasIntrinsicValue = typeof intrinsicValue === "number" && intrinsicValue !== 0;
  const valuationDiff = hasIntrinsicValue ? (currentPrice - intrinsicValue) / intrinsicValue * 100 : null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
    className: "flex items-center justify-between p-3 bg-secondary/20 rounded-lg",
    children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
      className: "flex items-center gap-3",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
        className: "font-semibold w-16",
        children: symbol
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "text-sm space-x-4",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
          children: ["Preço: ", /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
            className: "font-medium",
            children: ["$", (currentPrice ?? 0).toFixed(2)]
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
          children: ["IV: ", /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
            className: "font-medium text-teya-green",
            children: typeof intrinsicValue === "number" ? `$${intrinsicValue.toFixed(2)}` : "N/A"
          })]
        })]
      })]
    }), valuationDiff !== null && /* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, {
      variant: valuationDiff < 0 ? "default" : "secondary",
      className: cn(valuationDiff < 0 ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"),
      children: [valuationDiff > 0 ? "+" : "", valuationDiff?.toFixed(1) || "0.0", "%"]
    })]
  });
}
function PerformanceRow({
  symbol
}) {
  const {
    data: cachedQuote
  } = useCachedQuote(symbol);
  const changePercent = cachedQuote?.data?.changePercent ?? 0;
  const isPositive = (changePercent ?? 0) >= 0;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
    className: "flex items-center justify-between p-3 bg-secondary/20 rounded-lg",
    children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
      className: "flex items-center gap-3",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
        className: "font-semibold w-16",
        children: symbol
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "text-sm",
        children: ["Market Cap: ", /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
          className: "font-medium",
          children: cachedQuote?.data?.marketCap ? `$${Number(cachedQuote.data.marketCap).toLocaleString()}` : "N/A"
        })]
      })]
    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
      className: "flex items-center gap-2",
      children: [isPositive ? /* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, {
        className: "h-4 w-4 text-green-500"
      }) : /* @__PURE__ */ jsxRuntimeExports.jsx(TrendingDown, {
        className: "h-4 w-4 text-red-500"
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
        className: cn("font-semibold", isPositive ? "text-green-600" : "text-red-600"),
        children: [isPositive ? "+" : "", changePercent?.toFixed(2) || "0.00", "%"]
      })]
    })]
  });
}
export {
  ComparePage as default
};
