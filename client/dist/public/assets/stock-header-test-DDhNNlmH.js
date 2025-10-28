import { j as jsxRuntimeExports, f as cn, B as Button, r as reactExports } from "./index-DF734YkB.js";
import { B as Badge } from "./badge-Bax4ZZX3.js";
import { S as Star } from "./star-Cp1OMHQ3.js";
import { P as Plus } from "./plus-DmsdXgBw.js";
import { S as Share2 } from "./share-2-C3Zli1IN.js";
function StockHeader({
  symbol,
  company,
  isInWatchlist,
  onAddToWatchlist,
  onShare
}) {
  const isPositive = company.change >= 0;
  const isAfterHoursPositive = company.afterHoursChange >= 0;
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
      className: "flex items-center justify-between",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsx("p", {
        className: "text-lg font-medium text-muted-foreground",
        children: company.name
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
        className: "text-base font-medium",
        children: ["After Hours $", company.afterHoursPrice.toFixed(2), /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
          className: cn("ml-2", isAfterHoursPositive ? "text-green-500" : "text-red-500"),
          children: [isAfterHoursPositive ? "+" : "", "$", company.afterHoursChange.toFixed(2), " (", isAfterHoursPositive ? "+" : "", company.afterHoursChangePercent.toFixed(2), "%)"]
        })]
      })]
    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
      className: "flex items-center justify-between",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Badge, {
        variant: "outline",
        className: "border-teya-green/30 text-teya-green w-fit text-sm",
        children: company.sector
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, {
        variant: "outline",
        className: "border-teya-green/30 text-teya-green text-sm",
        children: ["Earnings: ", company.earningsDate]
      })]
    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
      className: "flex items-center gap-2 pt-2",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
        variant: "outline",
        size: "sm",
        onClick: onAddToWatchlist,
        className: cn("gap-2", isInWatchlist ? "bg-teya-green/10 border-teya-green/30 text-teya-green" : "border-teya-green/20 hover:bg-teya-green/10"),
        children: [isInWatchlist ? /* @__PURE__ */ jsxRuntimeExports.jsx(Star, {
          className: "w-4 h-4 fill-current"
        }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, {
          className: "w-4 h-4"
        }), isInWatchlist ? "In Watchlist" : "Add to Watchlist"]
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
        variant: "outline",
        size: "sm",
        className: "gap-2",
        onClick: onShare,
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Share2, {
          className: "w-4 h-4"
        }), "Share"]
      })]
    })]
  });
}
const mockStockData = {
  symbol: "AAPL",
  company: {
    name: "Apple Inc.",
    sector: "Technology",
    price: 175.43,
    change: 2.15,
    changePercent: 1.24,
    afterHoursPrice: 176.2,
    afterHoursChange: 0.77,
    afterHoursChangePercent: 0.44,
    earningsDate: "Feb 1, 2024",
    logo: "https://logo.clearbit.com/apple.com"
  }
};
const mockStockDataNegative = {
  symbol: "TSLA",
  company: {
    name: "Tesla, Inc.",
    sector: "Automotive",
    price: 243.84,
    change: -5.67,
    changePercent: -2.27,
    afterHoursPrice: 242.1,
    afterHoursChange: -1.74,
    afterHoursChangePercent: -0.71,
    earningsDate: "Jan 24, 2024",
    logo: "https://logo.clearbit.com/tesla.com"
  }
};
const mockStockDataInvalidLogo = {
  symbol: "TEST",
  company: {
    name: "Test Company Ltd.",
    sector: "Testing",
    price: 50,
    change: 1.25,
    changePercent: 2.56,
    afterHoursPrice: 50.5,
    afterHoursChange: 0.5,
    afterHoursChangePercent: 1,
    earningsDate: "Dec 15, 2024",
    logo: "https://invalid-logo-url.com/test.png"
  }
};
function StockHeaderTest() {
  const [isInWatchlist, setIsInWatchlist] = reactExports.useState(false);
  const [currentDataSet, setCurrentDataSet] = reactExports.useState("positive");
  const getCurrentData = () => {
    switch (currentDataSet) {
      case "positive":
        return mockStockData;
      case "negative":
        return mockStockDataNegative;
      case "invalid-logo":
        return mockStockDataInvalidLogo;
      default:
        return mockStockData;
    }
  };
  const currentData = getCurrentData();
  const handleAddToWatchlist = () => {
    setIsInWatchlist(!isInWatchlist);
    console.log(`${isInWatchlist ? "Removed from" : "Added to"} watchlist:`, currentData.symbol);
  };
  const handleShare = () => {
    console.log("Share clicked for:", currentData.symbol);
    alert(`Sharing ${currentData.symbol} - ${currentData.company.name}`);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
    className: "p-8 max-w-4xl mx-auto space-y-8",
    children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
      className: "space-y-4",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h1", {
        className: "text-3xl font-bold mb-4",
        children: "StockHeader Component Test"
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "space-y-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h2", {
          className: "text-xl font-semibold",
          children: "Test Controls"
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "flex gap-4",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx("button", {
            onClick: () => setCurrentDataSet("positive"),
            className: `px-4 py-2 rounded ${currentDataSet === "positive" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`,
            children: "Positive Change (AAPL)"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("button", {
            onClick: () => setCurrentDataSet("negative"),
            className: `px-4 py-2 rounded ${currentDataSet === "negative" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`,
            children: "Negative Change (TSLA)"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("button", {
            onClick: () => setCurrentDataSet("invalid-logo"),
            className: `px-4 py-2 rounded ${currentDataSet === "invalid-logo" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`,
            children: "Invalid Logo (TEST)"
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "space-y-2",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("strong", {
              children: "Current Dataset:"
            }), " ", currentDataSet]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("strong", {
              children: "Watchlist Status:"
            }), " ", isInWatchlist ? "In Watchlist" : "Not in Watchlist"]
          })]
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "border-2 border-dashed border-gray-300 dark:border-gray-600 p-6 rounded-lg",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h2", {
          className: "text-xl font-semibold mb-4",
          children: "StockHeader Component Output"
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(StockHeader, {
          symbol: currentData.symbol,
          company: currentData.company,
          isInWatchlist,
          onAddToWatchlist: handleAddToWatchlist,
          onShare: handleShare
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "p-4 bg-gray-50 dark:bg-gray-900 rounded-lg",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h2", {
          className: "text-xl font-semibold mb-4",
          children: "Current Mock Data"
        }), /* @__PURE__ */ jsxRuntimeExports.jsx("pre", {
          className: "text-sm overflow-auto bg-white dark:bg-gray-800 p-4 rounded border",
          children: JSON.stringify(currentData, null, 2)
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h2", {
          className: "text-xl font-semibold mb-2",
          children: "Expected 3-Line Layout"
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("ol", {
          className: "list-decimal list-inside space-y-1 text-sm",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("li", {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("strong", {
              children: "Line 1:"
            }), " Logo + Ticker Symbol + Current Price + Daily Change (with colors)"]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("li", {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("strong", {
              children: "Line 2:"
            }), " Company Name (left) + After Hours Price & Change (right)"]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("li", {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("strong", {
              children: "Line 3:"
            }), " Sector Badge (left) + Earnings Date (right)"]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("li", {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("strong", {
              children: "Line 4:"
            }), " Action Buttons (Add to Watchlist + Share)"]
          })]
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "p-4 bg-green-50 dark:bg-green-900/20 rounded-lg",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h2", {
          className: "text-xl font-semibold mb-2",
          children: "Manual Test Checklist"
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "space-y-2 text-sm",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("label", {
            className: "flex items-center gap-2",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("input", {
              type: "checkbox"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
              children: "Logo displays correctly (or shows fallback letter)"
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("label", {
            className: "flex items-center gap-2",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("input", {
              type: "checkbox"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
              children: "Ticker symbol shows in correct size and weight"
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("label", {
            className: "flex items-center gap-2",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("input", {
              type: "checkbox"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
              children: "Price displays with 2 decimal places"
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("label", {
            className: "flex items-center gap-2",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("input", {
              type: "checkbox"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
              children: "Daily change shows correct color (green for positive, red for negative)"
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("label", {
            className: "flex items-center gap-2",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("input", {
              type: "checkbox"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
              children: "Company name displays on left side of line 2"
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("label", {
            className: "flex items-center gap-2",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("input", {
              type: "checkbox"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
              children: "After hours data displays on right side of line 2"
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("label", {
            className: "flex items-center gap-2",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("input", {
              type: "checkbox"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
              children: "Sector badge displays with correct styling"
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("label", {
            className: "flex items-center gap-2",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("input", {
              type: "checkbox"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
              children: "Earnings date displays on right side of line 3"
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("label", {
            className: "flex items-center gap-2",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("input", {
              type: "checkbox"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
              children: "Watchlist button toggles correctly"
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("label", {
            className: "flex items-center gap-2",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("input", {
              type: "checkbox"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
              children: "Share button triggers alert"
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("label", {
            className: "flex items-center gap-2",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("input", {
              type: "checkbox"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
              children: "Logo error handling works (shows first letter of symbol)"
            })]
          })]
        })]
      })]
    })
  });
}
export {
  StockHeaderTest,
  StockHeaderTest as default
};
