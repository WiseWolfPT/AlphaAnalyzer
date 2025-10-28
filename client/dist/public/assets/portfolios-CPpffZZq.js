import { Q as usePortfolioManager, j as jsxRuntimeExports, C as Card, c as CardContent, f as cn, n as TrendingUp, a as CardHeader, b as CardTitle, r as reactExports, B as Button, X, L as Label, u as useLocation } from "./index-DF734YkB.js";
import { M as MainLayout, B as Briefcase } from "./main-layout-iPfLAwEH.js";
import { B as Badge } from "./badge-Bax4ZZX3.js";
import { T as Tabs, a as TabsList, b as TabsTrigger, c as TabsContent } from "./tabs-CPUG2mtF.js";
import { a as useCachedBatchQuotes } from "./use-cache-data-WpPFNsyq.js";
import { D as Dialog, a as DialogTrigger, b as DialogContent, c as DialogHeader, d as DialogTitle, e as DialogDescription } from "./dialog-B0u0SV5P.js";
import { I as Input } from "./input-vX2xFcRS.js";
import { S as Select, a as SelectTrigger, b as SelectValue, c as SelectContent, d as SelectItem, C as Check } from "./select-Bm8Ccf9j.js";
import { C as ChartColumn } from "./chart-column-DNzw3S_G.js";
import { D as DollarSign } from "./dollar-sign-BDD_kA4E.js";
import { T as Target } from "./target-D9zmh0Nc.js";
import { P as Percent } from "./percent-DjAI93Y2.js";
import { A as Activity } from "./activity-TJHkan0R.js";
import { R as ResponsiveContainer, a as CartesianGrid, X as XAxis, Y as YAxis } from "./CartesianChart-DjA-4J1-.js";
import { A as AreaChart } from "./AreaChart-CRTYI7-_.js";
import { T as Tooltip } from "./GraphicalItemClipPath-C5BaDaiW.js";
import { A as Area } from "./Area-DLKIhkx_.js";
import { F as FileText } from "./file-text-BCjG82i7.js";
import { P as Plus } from "./plus-DmsdXgBw.js";
import { T as Trash2 } from "./trash-2-BYXtUTac.js";
import { E as ExternalLink } from "./external-link-BNxepo82.js";
import { f as format } from "./format-KW2jPi8X.js";
import "./use-auth-monitoring-Ca9Wv08z.js";
import "./mail-D5HopcQP.js";
import "./lock-C5qTkNPd.js";
import "./eye-DQw-lb5A.js";
import "./user-C46AQImy.js";
import "./menu-CG6pfADK.js";
import "./search-CySG90ju.js";
import "./log-in-CA1V17qY.js";
import "./index-Dx7UitrF.js";
import "./scroll-area-BRs9U-pP.js";
import "./index-IXOTxK3N.js";
import "./useQuery-C9HFImIm.js";
import "./index-DXvlFXpR.js";
import "./chevron-down-BYhiF8im.js";
import "./ActivePoints-BIcFr9ho.js";
import "./en-US-CFe7Dxf-.js";
function TransactionDialog({
  onSubmit
}) {
  const [open, setOpen] = reactExports.useState(false);
  const [formData, setFormData] = reactExports.useState({
    symbol: "",
    type: "buy",
    shares: 0,
    price: 0,
    date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    notes: ""
  });
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      date: new Date(formData.date).toISOString()
    });
    setOpen(false);
    setFormData({
      symbol: "",
      type: "buy",
      shares: 0,
      price: 0,
      date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
      notes: ""
    });
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, {
    open,
    onOpenChange: setOpen,
    children: [/* @__PURE__ */ jsxRuntimeExports.jsx(DialogTrigger, {
      asChild: true,
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
        className: "bg-gradient-to-r from-teya-green via-teya-green-dark to-teya-green hover:from-teya-green-dark hover:via-teya-green hover:to-teya-green-dark text-rich-black font-semibold",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Plus, {
          className: "h-4 w-4 mr-2"
        }), "Add Transaction"]
      })
    }), /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, {
      className: "sm:max-w-[425px]",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, {
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, {
          children: "Add Transaction"
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, {
          children: "Record a buy, sell, or dividend transaction for your portfolio."
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs("form", {
        onSubmit: handleSubmit,
        className: "space-y-4",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "space-y-2",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label, {
            htmlFor: "symbol",
            children: "Stock Symbol"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(Input, {
            id: "symbol",
            value: formData.symbol,
            onChange: (e) => setFormData({
              ...formData,
              symbol: e.target.value.toUpperCase()
            }),
            placeholder: "AAPL",
            required: true
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "space-y-2",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label, {
            htmlFor: "type",
            children: "Transaction Type"
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, {
            value: formData.type,
            onValueChange: (value) => setFormData({
              ...formData,
              type: value
            }),
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, {
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {})
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, {
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                value: "buy",
                children: "Buy"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                value: "sell",
                children: "Sell"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                value: "dividend",
                children: "Dividend"
              })]
            })]
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "grid grid-cols-2 gap-4",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "space-y-2",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label, {
              htmlFor: "shares",
              children: formData.type === "dividend" ? "Amount" : "Shares"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(Input, {
              id: "shares",
              type: "number",
              step: "0.01",
              value: formData.shares,
              onChange: (e) => setFormData({
                ...formData,
                shares: parseFloat(e.target.value) || 0
              }),
              required: true
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "space-y-2",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label, {
              htmlFor: "price",
              children: formData.type === "dividend" ? "Per Share" : "Price"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(Input, {
              id: "price",
              type: "number",
              step: "0.01",
              value: formData.price,
              onChange: (e) => setFormData({
                ...formData,
                price: parseFloat(e.target.value) || 0
              }),
              required: true
            })]
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "space-y-2",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label, {
            htmlFor: "date",
            children: "Date"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(Input, {
            id: "date",
            type: "date",
            value: formData.date,
            onChange: (e) => setFormData({
              ...formData,
              date: e.target.value
            }),
            required: true
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "space-y-2",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label, {
            htmlFor: "notes",
            children: "Notes (optional)"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(Input, {
            id: "notes",
            value: formData.notes,
            onChange: (e) => setFormData({
              ...formData,
              notes: e.target.value
            }),
            placeholder: "Add any notes..."
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "flex justify-end gap-2",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
            type: "button",
            variant: "outline",
            onClick: () => setOpen(false),
            children: "Cancel"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
            type: "submit",
            children: "Add Transaction"
          })]
        })]
      })]
    })]
  });
}
function PortfolioSelector() {
  const {
    portfolios,
    activePortfolioId,
    setActivePortfolio,
    createPortfolio,
    deletePortfolio
  } = usePortfolioManager();
  const [isCreating, setIsCreating] = reactExports.useState(false);
  const [newPortfolioName, setNewPortfolioName] = reactExports.useState("");
  const handleCreate = () => {
    if (newPortfolioName.trim()) {
      createPortfolio(newPortfolioName.trim());
      setNewPortfolioName("");
      setIsCreating(false);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
    className: "flex items-center gap-2",
    children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Briefcase, {
      className: "h-5 w-5 text-muted-foreground"
    }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, {
      value: activePortfolioId || "",
      onValueChange: setActivePortfolio,
      children: [/* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, {
        className: "w-[200px]",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {
          placeholder: "Select Portfolio"
        })
      }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, {
        children: portfolios.map((portfolio) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
          value: portfolio.id,
          children: portfolio.name
        }, portfolio.id))
      })]
    }), isCreating ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
      className: "flex items-center gap-2",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Input, {
        value: newPortfolioName,
        onChange: (e) => setNewPortfolioName(e.target.value),
        placeholder: "Portfolio name",
        className: "w-[150px]",
        onKeyDown: (e) => e.key === "Enter" && handleCreate()
      }), /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
        size: "icon",
        variant: "ghost",
        onClick: handleCreate,
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(Check, {
          className: "h-4 w-4"
        })
      }), /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
        size: "icon",
        variant: "ghost",
        onClick: () => {
          setIsCreating(false);
          setNewPortfolioName("");
        },
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, {
          className: "h-4 w-4"
        })
      })]
    }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
      size: "sm",
      variant: "outline",
      onClick: () => setIsCreating(true),
      children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Plus, {
        className: "h-4 w-4 mr-1"
      }), "New"]
    }), activePortfolioId && portfolios.length > 1 && /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
      size: "icon",
      variant: "ghost",
      onClick: () => {
        if (confirm("Are you sure you want to delete this portfolio?")) {
          deletePortfolio(activePortfolioId);
        }
      },
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, {
        className: "h-4 w-4 text-destructive"
      })
    })]
  });
}
function PortfolioHolding({
  holding,
  currentPrice
}) {
  const [, setLocation] = useLocation();
  const currentValue = currentPrice * holding.shares;
  const gainLoss = currentValue - holding.totalCost;
  const gainLossPercent = holding.totalCost > 0 ? gainLoss / holding.totalCost * 100 : 0;
  const isPositive = gainLoss >= 0;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
    className: "flex items-center justify-between p-4 hover:bg-secondary/50 rounded-lg cursor-pointer transition-colors group border",
    onClick: () => setLocation(`/stock/${holding.symbol}`),
    children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
      className: "flex items-center space-x-3",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
        className: "w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
          className: "text-sm font-medium text-primary",
          children: holding.symbol.charAt(0)
        })
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
          className: "text-label group-hover:text-primary transition-colors",
          children: holding.symbol
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "text-caption",
          children: [holding.shares.toFixed(2), " shares @ $", holding.avgPrice.toFixed(2)]
        })]
      })]
    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
      className: "text-right flex items-center space-x-3",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "text-metric",
          children: ["$", currentValue.toFixed(2)]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: cn("text-caption", isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"),
          children: [isPositive ? "+" : "", "$", gainLoss.toFixed(2), " (", isPositive ? "+" : "", gainLossPercent.toFixed(2), "%)"]
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, {
        className: "h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors"
      })]
    })]
  });
}
function TransactionList({
  transactions,
  onDelete
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
    className: "space-y-2",
    children: transactions.map((txn) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
      className: "flex items-center justify-between p-3 bg-secondary/50 rounded-lg",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "flex items-center gap-4",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Badge, {
          variant: txn.type === "buy" ? "default" : txn.type === "sell" ? "destructive" : "secondary",
          children: txn.type.toUpperCase()
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "font-medium",
            children: txn.symbol
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "text-sm text-muted-foreground",
            children: txn.type === "dividend" ? `$${(txn.shares * txn.price).toFixed(2)} total` : `${txn.shares} shares @ $${txn.price.toFixed(2)}`
          })]
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "flex items-center gap-2",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "text-right",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "text-sm font-medium",
            children: ["$", (txn.shares * txn.price).toFixed(2)]
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "text-xs text-muted-foreground",
            children: format(new Date(txn.date), "MMM dd, yyyy")
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
          size: "icon",
          variant: "ghost",
          onClick: (e) => {
            e.stopPropagation();
            if (confirm("Delete this transaction?")) {
              onDelete(txn.id);
            }
          },
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, {
            className: "h-4 w-4 text-destructive"
          })
        })]
      })]
    }, txn.id))
  });
}
function PortfoliosEnhanced() {
  const {
    activePortfolio,
    addTransaction,
    deleteTransaction,
    getPortfolioStats,
    portfolios,
    createPortfolio
  } = usePortfolioManager();
  if (portfolios.length === 0) {
    createPortfolio("My Portfolio");
  }
  const portfolioSymbols = activePortfolio ? Object.keys(activePortfolio.holdings) : [];
  const {
    data: quotesData,
    isLoading
  } = useCachedBatchQuotes(portfolioSymbols, {
    refetchInterval: 3e4
    // Refresh every 30 seconds
  });
  if (!activePortfolio) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(MainLayout, {
      children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
        className: "container mx-auto px-6 py-8",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(Card, {
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
            className: "p-8 text-center",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Briefcase, {
              className: "h-12 w-12 mx-auto mb-4 text-muted-foreground"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("h2", {
              className: "text-2xl font-bold mb-2",
              children: "No Portfolio Selected"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
              className: "text-muted-foreground mb-4",
              children: "Create or select a portfolio to get started"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(PortfolioSelector, {})]
          })
        })
      })
    });
  }
  const holdings = Object.values(activePortfolio.holdings);
  let totalValue = 0;
  let totalCost = 0;
  let totalDividends = 0;
  holdings.forEach((holding) => {
    const quote = quotesData?.quotes?.find((q) => q.symbol === holding.symbol);
    const currentPrice = quote?.price || holding.avgPrice;
    totalValue += currentPrice * holding.shares;
    totalCost += holding.totalCost;
  });
  activePortfolio.transactions.forEach((txn) => {
    if (txn.type === "dividend") {
      totalDividends += txn.shares * txn.price;
    }
  });
  const totalGainLoss = totalValue - totalCost;
  const totalGainLossPercent = totalCost > 0 ? totalGainLoss / totalCost * 100 : 0;
  const totalReturn = totalGainLoss + totalDividends;
  const totalReturnPercent = totalCost > 0 ? totalReturn / totalCost * 100 : 0;
  let dayChange = 0;
  let dayChangePercent = 0;
  holdings.forEach((holding) => {
    const quote = quotesData?.quotes?.find((q) => q.symbol === holding.symbol);
    if (quote) {
      dayChange += (quote.change || 0) * holding.shares;
      dayChangePercent += (quote.changePercent || 0) * holding.shares * quote.price / totalValue;
    }
  });
  const generatePerformanceData = () => {
    const data = [];
    let currentVal = totalCost;
    for (let i = 29; i >= 0; i--) {
      const date = /* @__PURE__ */ new Date();
      date.setDate(date.getDate() - i);
      const change = (Math.random() - 0.48) * (currentVal * 0.02);
      currentVal = Math.max(currentVal + change, totalCost * 0.9);
      data.push({
        date: date.toLocaleDateString(),
        value: parseFloat(currentVal.toFixed(2))
      });
    }
    data[data.length - 1].value = totalValue;
    return data;
  };
  const performanceData = generatePerformanceData();
  return /* @__PURE__ */ jsxRuntimeExports.jsx(MainLayout, {
    children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
      className: "container mx-auto px-6 py-8 max-w-7xl",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "flex items-center justify-between mb-6",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "flex items-center gap-3",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "p-2 bg-primary/10 rounded-xl",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChartColumn, {
              className: "h-6 w-6 text-primary"
            })
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h1", {
              className: "text-3xl font-bold text-foreground",
              children: "Portfolio Management"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
              className: "text-muted-foreground",
              children: "Track your investments and performance"
            })]
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "flex items-center gap-4",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(PortfolioSelector, {}), /* @__PURE__ */ jsxRuntimeExports.jsx(TransactionDialog, {
            onSubmit: addTransaction
          })]
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Tabs, {
        defaultValue: "overview",
        className: "w-full",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(TabsList, {
          className: "mb-6",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, {
            value: "overview",
            children: "Overview"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, {
            value: "holdings",
            children: "Holdings"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, {
            value: "transactions",
            children: "Transactions"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, {
            value: "performance",
            children: "Performance"
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsContent, {
          value: "overview",
          className: "space-y-6",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Card, {
              className: "bg-card/50 backdrop-blur-sm border border-border/50",
              children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
                className: "p-4",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "flex items-center gap-2 mb-2",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx(DollarSign, {
                    className: "h-4 w-4 text-blue-500"
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                    className: "text-sm text-muted-foreground",
                    children: "Total Value"
                  })]
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "text-2xl font-bold",
                  children: ["$", totalValue.toLocaleString(void 0, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })]
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: cn("text-sm font-medium", dayChange >= 0 ? "text-green-600" : "text-red-600"),
                  children: [dayChange >= 0 ? "+" : "", "$", dayChange.toFixed(2), " (", dayChangePercent.toFixed(2), "%) today"]
                })]
              })
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(Card, {
              className: "bg-card/50 backdrop-blur-sm border border-border/50",
              children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
                className: "p-4",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "flex items-center gap-2 mb-2",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, {
                    className: "h-4 w-4 text-green-500"
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                    className: "text-sm text-muted-foreground",
                    children: "Unrealized P&L"
                  })]
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: cn("text-2xl font-bold", totalGainLoss >= 0 ? "text-green-600" : "text-red-600"),
                  children: [totalGainLoss >= 0 ? "+" : "", "$", Math.abs(totalGainLoss).toFixed(2)]
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: cn("text-sm", totalGainLossPercent >= 0 ? "text-green-600" : "text-red-600"),
                  children: [totalGainLossPercent >= 0 ? "+" : "", totalGainLossPercent.toFixed(2), "%"]
                })]
              })
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(Card, {
              className: "bg-card/50 backdrop-blur-sm border border-border/50",
              children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
                className: "p-4",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "flex items-center gap-2 mb-2",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Target, {
                    className: "h-4 w-4 text-purple-500"
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                    className: "text-sm text-muted-foreground",
                    children: "Total Cost"
                  })]
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "text-2xl font-bold",
                  children: ["$", totalCost.toFixed(2)]
                }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                  className: "text-sm text-muted-foreground",
                  children: "Investment basis"
                })]
              })
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(Card, {
              className: "bg-card/50 backdrop-blur-sm border border-border/50",
              children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
                className: "p-4",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "flex items-center gap-2 mb-2",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Percent, {
                    className: "h-4 w-4 text-amber-500"
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                    className: "text-sm text-muted-foreground",
                    children: "Dividends"
                  })]
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "text-2xl font-bold text-green-600",
                  children: ["$", totalDividends.toFixed(2)]
                }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                  className: "text-sm text-muted-foreground",
                  children: "Total received"
                })]
              })
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(Card, {
              className: "bg-card/50 backdrop-blur-sm border border-border/50",
              children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
                className: "p-4",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "flex items-center gap-2 mb-2",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Activity, {
                    className: "h-4 w-4 text-cyan-500"
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                    className: "text-sm text-muted-foreground",
                    children: "Total Return"
                  })]
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: cn("text-2xl font-bold", totalReturn >= 0 ? "text-green-600" : "text-red-600"),
                  children: [totalReturn >= 0 ? "+" : "", "$", Math.abs(totalReturn).toFixed(2)]
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: cn("text-sm", totalReturnPercent >= 0 ? "text-green-600" : "text-red-600"),
                  children: [totalReturnPercent >= 0 ? "+" : "", totalReturnPercent.toFixed(2), "% with divs"]
                })]
              })
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
              children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, {
                className: "flex items-center gap-2",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(ChartColumn, {
                  className: "h-5 w-5"
                }), "Portfolio Performance (30 Days)"]
              })
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
              children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                className: "h-80 w-full",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(ResponsiveContainer, {
                  width: "100%",
                  height: "100%",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsxs(AreaChart, {
                    data: performanceData,
                    margin: {
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 5
                    },
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("defs", {
                      children: /* @__PURE__ */ jsxRuntimeExports.jsxs("linearGradient", {
                        id: "portfolioGradient",
                        x1: "0",
                        y1: "0",
                        x2: "0",
                        y2: "1",
                        children: [/* @__PURE__ */ jsxRuntimeExports.jsx("stop", {
                          offset: "5%",
                          stopColor: "#10b981",
                          stopOpacity: 0.3
                        }), /* @__PURE__ */ jsxRuntimeExports.jsx("stop", {
                          offset: "95%",
                          stopColor: "#10b981",
                          stopOpacity: 0
                        })]
                      })
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx(CartesianGrid, {
                      strokeDasharray: "3 3",
                      stroke: "#374151",
                      opacity: 0.3
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx(XAxis, {
                      dataKey: "date",
                      tick: {
                        fontSize: 10,
                        fill: "#9CA3AF"
                      },
                      tickFormatter: (value) => {
                        const date = new Date(value);
                        return date.toLocaleDateString([], {
                          month: "short",
                          day: "numeric"
                        });
                      }
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx(YAxis, {
                      tick: {
                        fontSize: 10,
                        fill: "#9CA3AF"
                      },
                      tickFormatter: (value) => `$${(value / 1e3).toFixed(0)}k`
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, {
                      formatter: (value) => [`$${value.toLocaleString()}`, "Portfolio Value"],
                      contentStyle: {
                        backgroundColor: "#1F2937",
                        border: "1px solid #374151",
                        borderRadius: "8px"
                      }
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx(Area, {
                      type: "monotone",
                      dataKey: "value",
                      stroke: "#10b981",
                      strokeWidth: 3,
                      fill: "url(#portfolioGradient)"
                    })]
                  })
                })
              })
            })]
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, {
          value: "holdings",
          className: "space-y-6",
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, {
                children: "Current Holdings"
              })
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
              children: holdings.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                className: "space-y-3",
                children: holdings.map((holding) => {
                  const quote = quotesData?.quotes?.find((q) => q.symbol === holding.symbol);
                  const currentPrice = quote?.price || holding.avgPrice;
                  return /* @__PURE__ */ jsxRuntimeExports.jsx(PortfolioHolding, {
                    holding,
                    currentPrice
                  }, holding.symbol);
                })
              }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "text-center py-8",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Activity, {
                  className: "h-12 w-12 mx-auto mb-4 text-muted-foreground"
                }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                  className: "text-muted-foreground",
                  children: "No holdings yet. Add transactions to build your portfolio."
                })]
              })
            })]
          })
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, {
          value: "transactions",
          className: "space-y-6",
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
              children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, {
                className: "flex items-center gap-2",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(FileText, {
                  className: "h-5 w-5"
                }), "Transaction History"]
              })
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
              children: activePortfolio.transactions.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(TransactionList, {
                transactions: activePortfolio.transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
                onDelete: deleteTransaction
              }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "text-center py-8",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(FileText, {
                  className: "h-12 w-12 mx-auto mb-4 text-muted-foreground"
                }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                  className: "text-muted-foreground",
                  children: "No transactions yet. Start by adding your first transaction."
                })]
              })
            })]
          })
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, {
          value: "performance",
          className: "space-y-6",
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "grid grid-cols-1 md:grid-cols-3 gap-6",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, {
                  className: "text-lg",
                  children: "Best Performers"
                })
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
                children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                  className: "space-y-3",
                  children: holdings.map((holding) => {
                    const quote = quotesData?.quotes?.find((q) => q.symbol === holding.symbol);
                    const currentPrice = quote?.price || holding.avgPrice;
                    const gainPercent = (currentPrice - holding.avgPrice) / holding.avgPrice * 100;
                    return {
                      ...holding,
                      currentPrice,
                      gainPercent
                    };
                  }).sort((a, b) => b.gainPercent - a.gainPercent).slice(0, 3).map((holding) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex items-center justify-between p-3 bg-green-500/10 rounded-lg",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                      children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                        className: "font-bold",
                        children: holding.symbol
                      }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                        className: "text-sm text-muted-foreground",
                        children: [holding.shares.toFixed(2), " shares"]
                      })]
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                      className: "text-right",
                      children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                        className: "font-bold text-green-600",
                        children: ["+", holding.gainPercent.toFixed(1), "%"]
                      }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                        className: "text-sm text-muted-foreground",
                        children: ["$", holding.currentPrice.toFixed(2)]
                      })]
                    })]
                  }, holding.symbol))
                })
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, {
                  className: "text-lg",
                  children: "Portfolio Composition"
                })
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
                children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                  className: "space-y-3",
                  children: holdings.map((holding) => {
                    const quote = quotesData?.quotes?.find((q) => q.symbol === holding.symbol);
                    const currentPrice = quote?.price || holding.avgPrice;
                    const value = currentPrice * holding.shares;
                    const weight = value / totalValue * 100;
                    return {
                      symbol: holding.symbol,
                      weight
                    };
                  }).sort((a, b) => b.weight - a.weight).slice(0, 5).map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex items-center justify-between",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "text-sm font-medium",
                      children: item.symbol
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                      className: "flex items-center gap-2",
                      children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                        className: "w-24 bg-secondary rounded-full h-2",
                        children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                          className: "bg-primary h-2 rounded-full",
                          style: {
                            width: `${item.weight}%`
                          }
                        })
                      }), /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
                        className: "text-sm text-muted-foreground w-12 text-right",
                        children: [item.weight.toFixed(1), "%"]
                      })]
                    })]
                  }, item.symbol))
                })
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, {
                  className: "text-lg",
                  children: "Transaction Summary"
                })
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
                children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "space-y-3",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex justify-between",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "text-muted-foreground",
                      children: "Total Buys"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "font-medium",
                      children: activePortfolio.transactions.filter((t) => t.type === "buy").length
                    })]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex justify-between",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "text-muted-foreground",
                      children: "Total Sells"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "font-medium",
                      children: activePortfolio.transactions.filter((t) => t.type === "sell").length
                    })]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex justify-between",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "text-muted-foreground",
                      children: "Dividends Received"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "font-medium",
                      children: activePortfolio.transactions.filter((t) => t.type === "dividend").length
                    })]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex justify-between",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "text-muted-foreground",
                      children: "Avg Position Size"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
                      className: "font-medium",
                      children: ["$", holdings.length > 0 ? (totalValue / holdings.length).toFixed(0) : "0"]
                    })]
                  })]
                })
              })]
            })]
          })
        })]
      })]
    })
  });
}
export {
  PortfoliosEnhanced as default
};
