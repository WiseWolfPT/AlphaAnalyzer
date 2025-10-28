import { u as useLocation, j as jsxRuntimeExports, f as cn, n as TrendingUp, T as TrendingDown, r as reactExports, D as useQueryClient, G as useToast, B as Button, L as Label, C as Card, a as CardHeader, b as CardTitle, c as CardContent } from "./index-DF734YkB.js";
import { d as useQuery } from "./useQuery-C9HFImIm.js";
import { u as useMutation } from "./useMutation-BTJ0XPNX.js";
import { M as MainLayout, H as Heart } from "./main-layout-iPfLAwEH.js";
import { B as Badge } from "./badge-Bax4ZZX3.js";
import { D as Dialog, a as DialogTrigger, b as DialogContent, c as DialogHeader, d as DialogTitle } from "./dialog-B0u0SV5P.js";
import { I as Input } from "./input-vX2xFcRS.js";
import { a as apiRequest } from "./queryClient-CXMFu_RS.js";
import { u as useRealtimeQuote } from "./use-realtime-quotes-C1iJFH8l.js";
import { E as ExternalLink } from "./external-link-BNxepo82.js";
import { a as useCachedBatchQuotes } from "./use-cache-data-WpPFNsyq.js";
import { W as Wifi } from "./wifi-Cr-Lls-T.js";
import { P as Plus } from "./plus-DmsdXgBw.js";
import { S as SquarePen } from "./square-pen-D2EBB5gO.js";
import { T as Trash2 } from "./trash-2-BYXtUTac.js";
import "./tabs-CPUG2mtF.js";
import "./index-Dx7UitrF.js";
import "./use-auth-monitoring-Ca9Wv08z.js";
import "./mail-D5HopcQP.js";
import "./lock-C5qTkNPd.js";
import "./eye-DQw-lb5A.js";
import "./user-C46AQImy.js";
import "./menu-CG6pfADK.js";
import "./chart-column-DNzw3S_G.js";
import "./search-CySG90ju.js";
import "./file-text-BCjG82i7.js";
import "./log-in-CA1V17qY.js";
import "./select-Bm8Ccf9j.js";
import "./index-IXOTxK3N.js";
import "./chevron-down-BYhiF8im.js";
import "./scroll-area-BRs9U-pP.js";
import "./index-DXvlFXpR.js";
import "./api-config-Zh6ttKls.js";
function RealtimeWatchlistStockItem({
  ws
}) {
  const [, setLocation] = useLocation();
  const {
    quote,
    isConnected,
    error
  } = useRealtimeQuote(ws.stockSymbol);
  const handleClick = () => {
    setLocation(`/stock/${symbol}`);
  };
  if (error) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
      className: "flex items-center justify-between p-3 border rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors group",
      onClick: handleClick,
      children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "flex items-center space-x-3",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
          className: "w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
            className: "text-sm font-medium text-primary",
            children: ws.stockSymbol.charAt(0)
          })
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "font-medium group-hover:text-primary transition-colors",
            children: ws.stockSymbol
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "text-sm text-muted-foreground",
            children: "Erro ao carregar"
          })]
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, {
        className: "h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors"
      })]
    });
  }
  if (!quote) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
      className: "flex items-center justify-between p-3 border rounded-lg animate-pulse",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "flex items-center space-x-3",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
          className: "w-10 h-10 bg-gray-300 rounded-lg"
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "h-4 bg-gray-300 rounded w-16 mb-1"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "h-3 bg-gray-300 rounded w-24"
          })]
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "text-right",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
          className: "h-4 bg-gray-300 rounded w-20 mb-1"
        }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
          className: "h-3 bg-gray-300 rounded w-16"
        })]
      })]
    });
  }
  const isPositive = quote.change >= 0;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
    className: "flex items-center justify-between p-3 border rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors group relative",
    onClick: handleClick,
    children: [isConnected && /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
      className: "absolute top-2 right-2",
      children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
        className: "inline-flex h-2 w-2 rounded-full bg-green-500 animate-pulse",
        title: "Dados em tempo real"
      })
    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
      className: "flex items-center space-x-3",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
        className: "w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
          className: "text-sm font-medium text-primary",
          children: ws.stockSymbol.charAt(0)
        })
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
          className: "font-medium group-hover:text-primary transition-colors",
          children: ws.stockSymbol
        }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
          className: "text-sm text-muted-foreground",
          children: quote.company_name || `${ws.stockSymbol} Corporation`
        })]
      })]
    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
      className: "text-right flex items-center space-x-2",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "font-medium",
          children: ["$", quote.price.toFixed(2)]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: cn("text-sm flex items-center gap-1", isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"),
          children: [isPositive ? /* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, {
            className: "h-3 w-3"
          }) : /* @__PURE__ */ jsxRuntimeExports.jsx(TrendingDown, {
            className: "h-3 w-3"
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
            children: [isPositive ? "+" : "", quote.change_percent.toFixed(2), "%"]
          })]
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, {
        className: "h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors"
      })]
    })]
  });
}
function WatchlistStockItem({
  ws,
  quote
}) {
  const [, setLocation] = useLocation();
  const handleClick = () => {
    setLocation(`/stock/${symbol}`);
  };
  const price = quote?.price || 0;
  const change = quote?.changePercent || 0;
  const isPositive = change >= 0;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
    className: "flex items-center justify-between p-3 border rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors group",
    onClick: handleClick,
    children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
      className: "flex items-center space-x-3",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
        className: "w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
          className: "text-sm font-medium text-primary",
          children: ws.stockSymbol.charAt(0)
        })
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
          className: "font-medium group-hover:text-primary transition-colors",
          children: ws.stockSymbol
        }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
          className: "text-sm text-muted-foreground",
          children: quote?.name || ws.stockSymbol
        })]
      })]
    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
      className: "text-right flex items-center space-x-2",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "font-medium",
          children: ["$", price.toFixed(2)]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: cn("text-sm", isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"),
          children: [isPositive ? "+" : "", change.toFixed(2), "%"]
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, {
        className: "h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors"
      })]
    })]
  });
}
function Watchlists() {
  const [selectedWatchlistId, setSelectedWatchlistId] = reactExports.useState(null);
  const [newWatchlistName, setNewWatchlistName] = reactExports.useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = reactExports.useState(false);
  const [isAddStockDialogOpen, setIsAddStockDialogOpen] = reactExports.useState(false);
  const [stockSymbolToAdd, setStockSymbolToAdd] = reactExports.useState("");
  const [useRealtime, setUseRealtime] = reactExports.useState(true);
  const queryClient = useQueryClient();
  const {
    toast
  } = useToast();
  const {
    data: watchlists,
    isLoading: watchlistsLoading
  } = useQuery({
    queryKey: ["/api/watchlists"]
  });
  const {
    data: watchlistStocks
  } = useQuery({
    queryKey: [`/api/watchlists/${selectedWatchlistId}/stocks`],
    enabled: !!selectedWatchlistId
  });
  const watchlistSymbols = watchlistStocks?.map((ws) => ws.stockSymbol) || [];
  const {
    data: quotesData,
    isLoading: quotesLoading
  } = useCachedBatchQuotes(watchlistSymbols, {
    enabled: watchlistSymbols.length > 0,
    refetchInterval: 3e4
    // Refresh every 30 seconds
  });
  const createWatchlistMutation = useMutation({
    mutationFn: async (name) => {
      const response = await apiRequest("POST", "/api/watchlists", {
        name
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/watchlists"]
      });
      setNewWatchlistName("");
      setIsCreateDialogOpen(false);
      toast({
        title: "Success",
        description: "Watchlist created successfully"
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create watchlist",
        variant: "destructive"
      });
    }
  });
  const deleteWatchlistMutation = useMutation({
    mutationFn: async (id) => {
      await apiRequest("DELETE", `/api/watchlists/${id}`, void 0);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/watchlists"]
      });
      if (selectedWatchlistId === watchlists?.find((w) => w.id === selectedWatchlistId)?.id) {
        setSelectedWatchlistId(null);
      }
      toast({
        title: "Success",
        description: "Watchlist deleted successfully"
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete watchlist",
        variant: "destructive"
      });
    }
  });
  const addStockMutation = useMutation({
    mutationFn: async (data) => {
      await apiRequest("POST", `/api/watchlists/${data.watchlistId}/stocks`, {
        stockSymbol: data.stockSymbol.toUpperCase()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["watchlist-stocks", selectedWatchlistId]
      });
      setIsAddStockDialogOpen(false);
      setStockSymbolToAdd("");
      toast({
        title: "Success",
        description: "Stock added to watchlist successfully"
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add stock to watchlist",
        variant: "destructive"
      });
    }
  });
  const handleAddStock = () => {
    if (!selectedWatchlistId || !stockSymbolToAdd.trim()) return;
    addStockMutation.mutate({
      watchlistId: selectedWatchlistId,
      stockSymbol: stockSymbolToAdd.trim()
    });
  };
  const selectedWatchlist = watchlists?.find((w) => w.id === selectedWatchlistId);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(MainLayout, {
    children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
      className: "container mx-auto px-6 py-8 max-w-7xl",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "flex items-center justify-between mb-6",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "flex items-center gap-3",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "p-2 bg-primary/10 rounded-xl",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(Heart, {
              className: "h-6 w-6 text-primary"
            })
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h1", {
              className: "text-3xl font-bold text-foreground",
              children: "Watchlists"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
              className: "text-muted-foreground",
              children: "Track and organize your favorite stocks"
            })]
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "flex items-center space-x-2",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
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
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, {
            open: isCreateDialogOpen,
            onOpenChange: setIsCreateDialogOpen,
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(DialogTrigger, {
              asChild: true,
              children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
                size: "sm",
                className: "bg-gradient-to-r from-teya-green via-teya-green-dark to-teya-green hover:from-teya-green-dark hover:via-teya-green hover:to-teya-green-dark text-rich-black font-semibold shadow-lg shadow-teya-green/30 hover:shadow-teya-green/50 hover:scale-105 transition-all duration-300 border-0",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Plus, {
                  className: "h-4 w-4 mr-2"
                }), "Create"]
              })
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, {
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(DialogHeader, {
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, {
                  children: "Create New Watchlist"
                })
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "space-y-4",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label, {
                    htmlFor: "name",
                    children: "Watchlist Name"
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx(Input, {
                    id: "name",
                    value: newWatchlistName,
                    onChange: (e) => setNewWatchlistName(e.target.value),
                    placeholder: "Enter watchlist name"
                  })]
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "flex justify-end space-x-2",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
                    variant: "outline",
                    onClick: () => setIsCreateDialogOpen(false),
                    children: "Cancel"
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
                    onClick: () => createWatchlistMutation.mutate(newWatchlistName),
                    disabled: !newWatchlistName.trim() || createWatchlistMutation.isPending,
                    className: "bg-gradient-to-r from-teya-green via-teya-green-dark to-teya-green hover:from-teya-green-dark hover:via-teya-green hover:to-teya-green-dark text-rich-black font-semibold shadow-lg shadow-teya-green/30 hover:shadow-teya-green/50 hover:scale-105 transition-all duration-300 border-0",
                    children: "Create"
                  })]
                })]
              })]
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, {
            open: isAddStockDialogOpen,
            onOpenChange: setIsAddStockDialogOpen,
            children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, {
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(DialogHeader, {
                children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogTitle, {
                  children: ["Add Stock to ", selectedWatchlist?.name]
                })
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "space-y-4",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label, {
                    htmlFor: "stockSymbol",
                    children: "Stock Symbol"
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx(Input, {
                    id: "stockSymbol",
                    value: stockSymbolToAdd,
                    onChange: (e) => setStockSymbolToAdd(e.target.value.toUpperCase()),
                    placeholder: "Enter stock symbol (e.g., AAPL)",
                    onKeyDown: (e) => {
                      if (e.key === "Enter") {
                        handleAddStock();
                      }
                    }
                  })]
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "flex justify-end space-x-2",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
                    variant: "outline",
                    onClick: () => setIsAddStockDialogOpen(false),
                    children: "Cancel"
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
                    onClick: handleAddStock,
                    disabled: !stockSymbolToAdd.trim() || addStockMutation.isPending,
                    className: "bg-gradient-to-r from-teya-green via-teya-green-dark to-teya-green hover:from-teya-green-dark hover:via-teya-green hover:to-teya-green-dark text-rich-black font-semibold shadow-lg shadow-teya-green/30 hover:shadow-teya-green/50 hover:scale-105 transition-all duration-300 border-0",
                    children: addStockMutation.isPending ? "Adding..." : "Add Stock"
                  })]
                })]
              })]
            })
          })]
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "grid grid-cols-1 lg:grid-cols-4 gap-6",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
          className: "lg:col-span-1",
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, {
                className: "text-sm font-medium",
                children: "Your Watchlists"
              })
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
              className: "space-y-2",
              children: watchlistsLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                className: "space-y-2",
                children: Array.from({
                  length: 3
                }).map((_, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                  className: "h-10 bg-muted rounded animate-pulse"
                }, i))
              }) : watchlists?.length ? watchlists.map((watchlist) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: `flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${selectedWatchlistId === watchlist.id ? "bg-primary/10 border border-primary" : "hover:bg-muted"}`,
                onClick: () => setSelectedWatchlistId(watchlist.id),
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                  className: "text-sm font-medium",
                  children: watchlist.name
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "flex items-center space-x-1",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
                    size: "sm",
                    variant: "ghost",
                    className: "h-6 w-6 p-0",
                    onClick: (e) => {
                      e.stopPropagation();
                    },
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx(SquarePen, {
                      className: "h-3 w-3"
                    })
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
                    size: "sm",
                    variant: "ghost",
                    className: "h-6 w-6 p-0 text-destructive hover:text-destructive",
                    onClick: (e) => {
                      e.stopPropagation();
                      deleteWatchlistMutation.mutate(watchlist.id);
                    },
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, {
                      className: "h-3 w-3"
                    })
                  })]
                })]
              }, watchlist.id)) : /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                className: "text-sm text-muted-foreground text-center py-4",
                children: "No watchlists created yet"
              })
            })]
          })
        }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
          className: "lg:col-span-3 space-y-6",
          children: selectedWatchlist ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
              children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, {
                className: "flex flex-row items-center justify-between",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, {
                  children: ["Stocks in ", selectedWatchlist.name]
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
                  size: "sm",
                  onClick: () => setIsAddStockDialogOpen(true),
                  className: "bg-gradient-to-r from-teya-green via-teya-green-dark to-teya-green hover:from-teya-green-dark hover:via-teya-green hover:to-teya-green-dark text-rich-black font-semibold shadow-lg shadow-teya-green/30 hover:shadow-teya-green/50 hover:scale-105 transition-all duration-300 border-0",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Plus, {
                    className: "h-4 w-4 mr-2"
                  }), "Add Stock"]
                })]
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
                children: watchlistStocks?.length ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                  className: "space-y-3",
                  children: quotesLoading ? (
                    // Loading state
                    Array.from({
                      length: watchlistStocks.length
                    }).map((_, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                      className: "flex items-center justify-between p-3 border rounded-lg animate-pulse",
                      children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                        className: "flex items-center space-x-3",
                        children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                          className: "w-10 h-10 bg-gray-300 rounded-lg"
                        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                          children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                            className: "h-4 bg-gray-300 rounded w-16 mb-1"
                          }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                            className: "h-3 bg-gray-300 rounded w-24"
                          })]
                        })]
                      }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                        className: "text-right",
                        children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                          className: "h-4 bg-gray-300 rounded w-20 mb-1"
                        }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                          className: "h-3 bg-gray-300 rounded w-16"
                        })]
                      })]
                    }, i))
                  ) : watchlistStocks.map((ws) => {
                    const quote = quotesData?.quotes?.find((q) => q.symbol === ws.stockSymbol);
                    return useRealtime ? /* @__PURE__ */ jsxRuntimeExports.jsx(RealtimeWatchlistStockItem, {
                      ws
                    }, ws.id) : /* @__PURE__ */ jsxRuntimeExports.jsx(WatchlistStockItem, {
                      ws,
                      quote
                    }, ws.id);
                  })
                }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "text-center py-8",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                    className: "text-muted-foreground",
                    children: "No stocks in this watchlist"
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
                    size: "sm",
                    onClick: () => setIsAddStockDialogOpen(true),
                    className: "mt-2 bg-gradient-to-r from-teya-green via-teya-green-dark to-teya-green hover:from-teya-green-dark hover:via-teya-green hover:to-teya-green-dark text-rich-black font-semibold shadow-lg shadow-teya-green/30 hover:shadow-teya-green/50 hover:scale-105 transition-all duration-300 border-0",
                    children: "Add your first stock"
                  })]
                })
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
                children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, {
                  className: "flex items-center space-x-2",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx(TrendingDown, {
                    className: "h-5 w-5 text-negative"
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                    children: "Dip Finder"
                  })]
                })
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                  className: "text-sm text-muted-foreground mb-4",
                  children: "Stocks trading below their moving averages"
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "space-y-2",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex items-center justify-between text-sm",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      children: "AAPL"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "text-negative",
                      children: "-5.2% from 50D SMA"
                    })]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex items-center justify-between text-sm",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      children: "MSFT"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "text-negative",
                      children: "-3.1% from 10D SMA"
                    })]
                  })]
                })]
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
                children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, {
                  className: "flex items-center space-x-2",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, {
                    className: "h-5 w-5 text-chart-1"
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                    children: "Upcoming Earnings"
                  })]
                })
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
                children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "space-y-3",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex items-center justify-between",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                      children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                        className: "font-medium",
                        children: "AAPL"
                      }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                        className: "text-sm text-muted-foreground",
                        children: "Jan 25, After Close"
                      })]
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                      className: "text-right",
                      children: /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, {
                        variant: "secondary",
                        children: "Est. EPS: $2.11"
                      })
                    })]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex items-center justify-between",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                      children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                        className: "font-medium",
                        children: "MSFT"
                      }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                        className: "text-sm text-muted-foreground",
                        children: "Jan 26, After Close"
                      })]
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                      className: "text-right",
                      children: /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, {
                        variant: "secondary",
                        children: "Est. EPS: $2.78"
                      })
                    })]
                  })]
                })
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, {
                  children: "Latest News"
                })
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
                children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                  className: "space-y-4",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex space-x-3",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                      className: "w-16 h-16 bg-muted rounded-lg flex-shrink-0"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                      className: "flex-1",
                      children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h4", {
                        className: "font-medium text-sm mb-1",
                        children: "Apple Reports Strong Q4 Earnings"
                      }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                        className: "text-xs text-muted-foreground mb-1",
                        children: "Apple Inc. reported quarterly earnings that beat analyst expectations..."
                      }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                        className: "flex items-center space-x-2 text-xs text-muted-foreground",
                        children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                          children: "Reuters"
                        }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                          children: "•"
                        }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                          children: "2 hours ago"
                        })]
                      })]
                    })]
                  })
                })
              })]
            })]
          }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Card, {
            children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
              className: "text-center py-12",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h3", {
                className: "text-lg font-medium mb-2",
                children: "Select a Watchlist"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                className: "text-muted-foreground mb-4",
                children: "Choose a watchlist from the sidebar to view its contents"
              }), !watchlists?.length && /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
                onClick: () => setIsCreateDialogOpen(true),
                className: "bg-gradient-to-r from-teya-green via-teya-green-dark to-teya-green hover:from-teya-green-dark hover:via-teya-green hover:to-teya-green-dark text-rich-black font-semibold shadow-lg shadow-teya-green/30 hover:shadow-teya-green/50 hover:scale-105 transition-all duration-300 border-0",
                children: "Create Your First Watchlist"
              })]
            })
          })
        })]
      })]
    })
  });
}
export {
  Watchlists as default
};
