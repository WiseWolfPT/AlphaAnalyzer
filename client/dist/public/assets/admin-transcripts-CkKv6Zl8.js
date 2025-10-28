import { e as createLucideIcon, r as reactExports, j as jsxRuntimeExports, f as cn, v as CircleAlert, C as Card, c as CardContent, R as RefreshCw, o as Alert, p as AlertDescription, a as CardHeader, b as CardTitle, l as CircleCheckBig, d as CardDescription, B as Button, L as Label } from "./index-DF734YkB.js";
import { T as Textarea } from "./textarea-FymLzJLr.js";
import { I as Input } from "./input-vX2xFcRS.js";
import { a as axios } from "./index--4L2OUQN.js";
import { B as Badge } from "./badge-Bax4ZZX3.js";
import { S as Select, a as SelectTrigger, b as SelectValue, c as SelectContent, d as SelectItem } from "./select-Bm8Ccf9j.js";
import { D as Dialog, b as DialogContent, c as DialogHeader, d as DialogTitle, e as DialogDescription } from "./dialog-B0u0SV5P.js";
import { F as FileText } from "./file-text-BCjG82i7.js";
import { C as Clock } from "./clock-CEwJtTm9.js";
import { S as Search } from "./search-CySG90ju.js";
import { F as Filter } from "./filter-XvEjFBoX.js";
import { E as Eye } from "./eye-DQw-lb5A.js";
import { S as SquarePen } from "./square-pen-D2EBB5gO.js";
import { T as Trash2 } from "./trash-2-BYXtUTac.js";
import { useAdminAccess } from "./AdminRoute-DsPRXqhR.js";
import { S as Sparkles } from "./sparkles-b_IcKR33.js";
import "./index-IXOTxK3N.js";
import "./index-Dx7UitrF.js";
import "./chevron-down-BYhiF8im.js";
import "./index-DXvlFXpR.js";
import "./shield-Sv89QQud.js";
import "./log-in-CA1V17qY.js";
import "./activity-TJHkan0R.js";
import "./database-BIWFOkVP.js";
import "./users-DgdKh9Ro.js";
import "./menu-CG6pfADK.js";
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Hash = createLucideIcon("Hash", [
  ["line", { x1: "4", x2: "20", y1: "9", y2: "9", key: "4lhtct" }],
  ["line", { x1: "4", x2: "20", y1: "15", y2: "15", key: "vyu0kd" }],
  ["line", { x1: "10", x2: "8", y1: "3", y2: "21", key: "1ggp8o" }],
  ["line", { x1: "16", x2: "14", y1: "3", y2: "21", key: "weycgp" }]
]);
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Upload = createLucideIcon("Upload", [
  ["path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", key: "ih7n3h" }],
  ["polyline", { points: "17 8 12 3 7 8", key: "t8dd8p" }],
  ["line", { x1: "12", x2: "12", y1: "3", y2: "15", key: "widbto" }]
]);
function useTokenCounter() {
  const [isLoading, setIsLoading] = reactExports.useState(false);
  const [error, setError] = reactExports.useState(null);
  const countTokens = reactExports.useCallback(async (text, model) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.post("/api/ai/count-tokens", {
        text,
        model
      });
      return response.data;
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data) {
        const errorData = err.response.data;
        setError(errorData.error || "Failed to count tokens");
      } else {
        setError("Failed to count tokens");
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);
  const countMessagesTokens = reactExports.useCallback(async (messages, model, system) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.post("/api/ai/count-tokens", {
        messages,
        model,
        system
      });
      return response.data;
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data) {
        const errorData = err.response.data;
        setError(errorData.error || "Failed to count tokens");
      } else {
        setError("Failed to count tokens");
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);
  const estimateTokens = reactExports.useCallback(async (text) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.post("/api/ai/estimate-tokens", {
        text
      });
      return response.data;
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data) {
        const errorData = err.response.data;
        setError(errorData.error || "Failed to estimate tokens");
      } else {
        setError("Failed to estimate tokens");
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);
  const estimateTokensSync = reactExports.useCallback((text) => {
    const words = text.split(/\s+/).length;
    return Math.ceil(words * 1.3);
  }, []);
  return {
    countTokens,
    countMessagesTokens,
    estimateTokens,
    estimateTokensSync,
    isLoading,
    error
  };
}
function TokenCounter({
  text,
  model = "claude-3-opus-20240229",
  maxTokens = 15e4,
  className,
  showEstimate = true,
  debounceMs = 500
}) {
  const {
    countTokens,
    estimateTokensSync,
    isLoading,
    error
  } = useTokenCounter();
  const [tokenCount, setTokenCount] = reactExports.useState(null);
  const [isEstimate, setIsEstimate] = reactExports.useState(true);
  reactExports.useEffect(() => {
    if (!text) {
      setTokenCount(0);
      return;
    }
    const estimate = estimateTokensSync(text);
    setTokenCount(estimate);
    setIsEstimate(true);
    const timer = setTimeout(async () => {
      const result = await countTokens(text, model);
      if (result) {
        setTokenCount(result.tokens);
        setIsEstimate(false);
      }
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [text, model, debounceMs, countTokens, estimateTokensSync]);
  const percentage = tokenCount ? tokenCount / maxTokens * 100 : 0;
  const isNearLimit = percentage > 80;
  const isOverLimit = percentage > 100;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
    className: cn("flex items-center gap-2 text-sm", className),
    children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Hash, {
      className: "h-4 w-4 text-muted-foreground"
    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
      className: "flex items-center gap-1",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
        className: cn("font-mono", isOverLimit && "text-destructive", isNearLimit && !isOverLimit && "text-warning"),
        children: tokenCount?.toLocaleString() || "0"
      }), showEstimate && isEstimate && /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
        className: "text-muted-foreground text-xs",
        children: "~"
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
        className: "text-muted-foreground",
        children: ["/ ", maxTokens.toLocaleString(), " tokens"]
      })]
    }), isLoading && /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
      className: "h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent"
    }), error && /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, {
      className: "h-4 w-4 text-destructive",
      title: error
    }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
      className: "ml-2 h-2 w-24 rounded-full bg-secondary overflow-hidden",
      children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
        className: cn("h-full transition-all duration-300", isOverLimit && "bg-destructive", isNearLimit && !isOverLimit && "bg-warning", !isNearLimit && "bg-primary"),
        style: {
          width: `${Math.min(percentage, 100)}%`
        }
      })
    })]
  });
}
const Table = reactExports.forwardRef(({
  className,
  ...props
}, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
  className: "relative w-full overflow-auto",
  children: /* @__PURE__ */ jsxRuntimeExports.jsx("table", {
    ref,
    className: cn("w-full caption-bottom text-sm", className),
    ...props
  })
}));
Table.displayName = "Table";
const TableHeader = reactExports.forwardRef(({
  className,
  ...props
}, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx("thead", {
  ref,
  className: cn("[&_tr]:border-b", className),
  ...props
}));
TableHeader.displayName = "TableHeader";
const TableBody = reactExports.forwardRef(({
  className,
  ...props
}, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", {
  ref,
  className: cn("[&_tr:last-child]:border-0", className),
  ...props
}));
TableBody.displayName = "TableBody";
const TableFooter = reactExports.forwardRef(({
  className,
  ...props
}, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx("tfoot", {
  ref,
  className: cn("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", className),
  ...props
}));
TableFooter.displayName = "TableFooter";
const TableRow = reactExports.forwardRef(({
  className,
  ...props
}, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx("tr", {
  ref,
  className: cn("border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted", className),
  ...props
}));
TableRow.displayName = "TableRow";
const TableHead = reactExports.forwardRef(({
  className,
  ...props
}, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx("th", {
  ref,
  className: cn("h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0", className),
  ...props
}));
TableHead.displayName = "TableHead";
const TableCell = reactExports.forwardRef(({
  className,
  ...props
}, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx("td", {
  ref,
  className: cn("p-4 align-middle [&:has([role=checkbox])]:pr-0", className),
  ...props
}));
TableCell.displayName = "TableCell";
const TableCaption = reactExports.forwardRef(({
  className,
  ...props
}, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx("caption", {
  ref,
  className: cn("mt-4 text-sm text-muted-foreground", className),
  ...props
}));
TableCaption.displayName = "TableCaption";
function TranscriptManagement() {
  const [transcripts, setTranscripts] = reactExports.useState([]);
  const [stats, setStats] = reactExports.useState({
    total: 0,
    pending: 0,
    published: 0,
    archived: 0
  });
  const [loading, setLoading] = reactExports.useState(true);
  const [searchTerm, setSearchTerm] = reactExports.useState("");
  const [statusFilter, setStatusFilter] = reactExports.useState("all");
  const [selectedTranscript, setSelectedTranscript] = reactExports.useState(null);
  const [editDialogOpen, setEditDialogOpen] = reactExports.useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = reactExports.useState(false);
  const [error, setError] = reactExports.useState(null);
  reactExports.useEffect(() => {
    fetchTranscripts();
    fetchStats();
  }, [statusFilter]);
  const fetchTranscripts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }
      const response = await axios.get(`/api/admin/transcripts?${params.toString()}`, {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("auth_token")}`
        }
      });
      if (response.data.success) {
        setTranscripts(response.data.data);
      } else {
        setError("Failed to fetch transcripts");
      }
    } catch (error2) {
      console.error("Error fetching transcripts:", error2);
      setError("Failed to fetch transcripts");
    } finally {
      setLoading(false);
    }
  };
  const fetchStats = async () => {
    try {
      const response = await axios.get("/api/admin/transcripts/stats", {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("auth_token")}`
        }
      });
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error2) {
      console.error("Error fetching transcript stats:", error2);
    }
  };
  const updateTranscriptStatus = async (id, status) => {
    try {
      const response = await axios.put(`/api/admin/transcripts/${id}`, {
        status
      }, {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("auth_token")}`
        }
      });
      if (response.data.success) {
        fetchTranscripts();
        fetchStats();
      } else {
        setError("Failed to update transcript status");
      }
    } catch (error2) {
      console.error("Error updating transcript:", error2);
      setError("Failed to update transcript status");
    }
  };
  const deleteTranscript = async (id) => {
    if (!confirm("Are you sure you want to delete this transcript?")) {
      return;
    }
    transcripts.find((t) => t.id === id);
    try {
      const response = await axios.delete(`/api/admin/transcripts/${id}`, {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("auth_token")}`
        }
      });
      if (response.data.success) {
        fetchTranscripts();
        fetchStats();
      } else {
        setError("Failed to delete transcript");
      }
    } catch (error2) {
      console.error("Error deleting transcript:", error2);
      setError("Failed to delete transcript");
    }
  };
  const publishTranscript = async (id) => {
    transcripts.find((t) => t.id === id);
    try {
      const response = await axios.post(`/api/admin/transcripts/${id}/publish`, {}, {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("auth_token")}`
        }
      });
      if (response.data.success) {
        fetchTranscripts();
        fetchStats();
      } else {
        setError("Failed to publish transcript");
      }
    } catch (error2) {
      console.error("Error publishing transcript:", error2);
      setError("Failed to publish transcript");
    }
  };
  const getStatusBadge = (status) => {
    switch (status) {
      case "published":
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, {
          className: "bg-green-100 text-green-800",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheckBig, {
            className: "w-3 h-3 mr-1"
          }), "Published"]
        });
      case "pending":
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, {
          className: "bg-yellow-100 text-yellow-800",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Clock, {
            className: "w-3 h-3 mr-1"
          }), "Pending"]
        });
      case "review":
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, {
          className: "bg-blue-100 text-blue-800",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Eye, {
            className: "w-3 h-3 mr-1"
          }), "Review"]
        });
      case "archived":
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, {
          className: "bg-gray-100 text-gray-800",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, {
            className: "w-3 h-3 mr-1"
          }), "Archived"]
        });
      default:
        return /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, {
          variant: "secondary",
          children: status
        });
    }
  };
  const filteredTranscripts = transcripts.filter((transcript) => {
    const matchesSearch = transcript.ticker.toLowerCase().includes(searchTerm.toLowerCase()) || transcript.company_name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });
  if (loading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Card, {
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
        className: "p-8 text-center",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, {
          className: "w-8 h-8 animate-spin mx-auto mb-4"
        }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
          children: "Loading transcripts..."
        })]
      })
    });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
    className: "space-y-6",
    children: [error && /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, {
      variant: "destructive",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, {
        className: "h-4 w-4"
      }), /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDescription, {
        children: error
      })]
    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
      className: "grid gap-4 md:grid-cols-4",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, {
          className: "flex flex-row items-center justify-between space-y-0 pb-2",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, {
            className: "text-sm font-medium",
            children: "Total Transcripts"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, {
            className: "h-4 w-4 text-muted-foreground"
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
          children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "text-2xl font-bold",
            children: stats.total
          })
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, {
          className: "flex flex-row items-center justify-between space-y-0 pb-2",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, {
            className: "text-sm font-medium",
            children: "Pending Review"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, {
            className: "h-4 w-4 text-muted-foreground"
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
          children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "text-2xl font-bold text-yellow-600",
            children: stats.pending
          })
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, {
          className: "flex flex-row items-center justify-between space-y-0 pb-2",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, {
            className: "text-sm font-medium",
            children: "Published"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheckBig, {
            className: "h-4 w-4 text-muted-foreground"
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
          children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "text-2xl font-bold text-green-600",
            children: stats.published
          })
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, {
          className: "flex flex-row items-center justify-between space-y-0 pb-2",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, {
            className: "text-sm font-medium",
            children: "Archived"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, {
            className: "h-4 w-4 text-muted-foreground"
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
          children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "text-2xl font-bold text-gray-600",
            children: stats.archived
          })
        })]
      })]
    }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
      children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, {
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, {
          children: "Transcript Management"
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardDescription, {
          children: "View, edit, and manage earnings call transcripts"
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "flex gap-4 mb-6",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "flex-1",
            children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "relative",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Search, {
                className: "absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(Input, {
                placeholder: "Search by ticker or company...",
                value: searchTerm,
                onChange: (e) => setSearchTerm(e.target.value),
                className: "pl-8"
              })]
            })
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, {
            value: statusFilter,
            onValueChange: setStatusFilter,
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(SelectTrigger, {
              className: "w-48",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Filter, {
                className: "w-4 h-4 mr-2"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {
                placeholder: "Filter by status"
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, {
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                value: "all",
                children: "All Status"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                value: "pending",
                children: "Pending"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                value: "review",
                children: "In Review"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                value: "published",
                children: "Published"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                value: "archived",
                children: "Archived"
              })]
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
            onClick: fetchTranscripts,
            variant: "outline",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, {
              className: "w-4 h-4 mr-2"
            }), "Refresh"]
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
          className: "border rounded-lg",
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(TableHeader, {
              children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, {
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, {
                  children: "Company"
                }), /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, {
                  children: "Period"
                }), /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, {
                  children: "Status"
                }), /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, {
                  children: "Date"
                }), /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, {
                  children: "Views"
                }), /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, {
                  className: "text-right",
                  children: "Actions"
                })]
              })
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, {
              children: filteredTranscripts.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(TableRow, {
                children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, {
                  colSpan: 6,
                  className: "text-center py-8 text-muted-foreground",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx(FileText, {
                    className: "h-12 w-12 mx-auto mb-4 text-muted-foreground/50"
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                    children: "No transcripts found"
                  })]
                })
              }) : filteredTranscripts.map((transcript) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, {
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, {
                  children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                      className: "font-medium",
                      children: transcript.ticker
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                      className: "text-sm text-muted-foreground",
                      children: transcript.company_name
                    })]
                  })
                }), /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, {
                  children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "text-sm",
                    children: [transcript.quarter, " ", transcript.year]
                  })
                }), /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, {
                  children: getStatusBadge(transcript.status)
                }), /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, {
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                    className: "text-sm",
                    children: new Date(transcript.created_at).toLocaleDateString()
                  })
                }), /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, {
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                    className: "text-sm",
                    children: transcript.view_count || 0
                  })
                }), /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, {
                  className: "text-right",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex gap-2 justify-end",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
                      size: "sm",
                      variant: "outline",
                      onClick: () => {
                        setSelectedTranscript(transcript);
                        setPreviewDialogOpen(true);
                      },
                      children: /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, {
                        className: "w-4 h-4"
                      })
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
                      size: "sm",
                      variant: "outline",
                      onClick: () => {
                        setSelectedTranscript(transcript);
                        setEditDialogOpen(true);
                      },
                      children: /* @__PURE__ */ jsxRuntimeExports.jsx(SquarePen, {
                        className: "w-4 h-4"
                      })
                    }), transcript.status === "pending" && /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
                      size: "sm",
                      onClick: () => publishTranscript(transcript.id),
                      children: /* @__PURE__ */ jsxRuntimeExports.jsx(Upload, {
                        className: "w-4 h-4"
                      })
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
                      size: "sm",
                      variant: "destructive",
                      onClick: () => deleteTranscript(transcript.id),
                      children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, {
                        className: "w-4 h-4"
                      })
                    })]
                  })
                })]
              }, transcript.id))
            })]
          })
        })]
      })]
    }), /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, {
      open: previewDialogOpen,
      onOpenChange: setPreviewDialogOpen,
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, {
        className: "max-w-4xl max-h-[80vh] overflow-y-auto",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, {
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(DialogTitle, {
            children: [selectedTranscript?.ticker, " - ", selectedTranscript?.quarter, " ", selectedTranscript?.year]
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, {
            children: "Transcript preview and summary"
          })]
        }), selectedTranscript && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "space-y-6",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h4", {
              className: "font-medium mb-2",
              children: "AI Summary"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
              className: "p-4 bg-gray-50 rounded-lg text-sm",
              children: selectedTranscript.ai_summary || "No summary available"
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h4", {
              className: "font-medium mb-2",
              children: "Full Transcript"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
              className: "p-4 bg-gray-50 rounded-lg text-sm max-h-96 overflow-y-auto font-mono",
              children: selectedTranscript.raw_transcript || "No transcript content available"
            })]
          })]
        })]
      })
    }), /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, {
      open: editDialogOpen,
      onOpenChange: setEditDialogOpen,
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, {
        className: "max-w-2xl",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, {
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, {
            children: "Edit Transcript"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, {
            children: "Update transcript information and status"
          })]
        }), selectedTranscript && /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
          className: "space-y-4",
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "grid grid-cols-2 gap-4",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label, {
                children: "Status"
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, {
                value: selectedTranscript.status,
                onValueChange: (value) => updateTranscriptStatus(selectedTranscript.id, value),
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, {
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {})
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, {
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                    value: "pending",
                    children: "Pending"
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                    value: "review",
                    children: "In Review"
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                    value: "published",
                    children: "Published"
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                    value: "archived",
                    children: "Archived"
                  })]
                })]
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label, {
                children: "Company"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(Input, {
                value: selectedTranscript.company_name,
                disabled: true
              })]
            })]
          })
        })]
      })
    })]
  });
}
function AdminTranscripts() {
  const [transcript, setTranscript] = reactExports.useState("");
  const [ticker, setTicker] = reactExports.useState("");
  const [quarter, setQuarter] = reactExports.useState("");
  const [year, setYear] = reactExports.useState((/* @__PURE__ */ new Date()).getFullYear().toString());
  const [summary, setSummary] = reactExports.useState("");
  const [isGenerating, setIsGenerating] = reactExports.useState(false);
  const [error, setError] = reactExports.useState(null);
  const {
    countTokens
  } = useTokenCounter();
  const {
    permissions,
    isSuperAdmin,
    isLoadingPermissions
  } = useAdminAccess();
  const canManageTranscripts = isSuperAdmin || permissions?.canManageTranscripts;
  const handleGenerateSummary = async () => {
    if (!canManageTranscripts) {
      setError("You do not have permission to generate summaries.");
      return;
    }
    if (!transcript || !ticker || !quarter || !year) {
      setError("Please fill in all required fields");
      return;
    }
    setIsGenerating(true);
    setError(null);
    try {
      const tokenResult = await countTokens(transcript);
      if (tokenResult && tokenResult.tokens > 15e4) {
        setError("Transcript is too long. Maximum 150,000 tokens allowed.");
        return;
      }
      const response = await axios.post("/api/ai/generate-transcript-summary", {
        transcript,
        ticker: ticker.toUpperCase(),
        quarter,
        year: parseInt(year)
      });
      setSummary(response.data.summary);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError("Failed to generate summary");
      }
    } finally {
      setIsGenerating(false);
    }
  };
  const handleSaveTranscript = async () => {
    if (!canManageTranscripts) {
      setError("You do not have permission to save transcripts.");
      return;
    }
    if (!transcript || !ticker || !quarter || !year || !summary) {
      setError("Please complete all fields and generate a summary");
      return;
    }
    try {
      await axios.post("/api/admin/transcripts", {
        ticker: ticker.toUpperCase(),
        quarter,
        year: parseInt(year),
        rawTranscript: transcript,
        aiSummary: summary
      });
      setTranscript("");
      setTicker("");
      setQuarter("");
      setSummary("");
      setError(null);
      alert("Transcript saved successfully!");
    } catch (err) {
      setError("Failed to save transcript");
    }
  };
  if (isLoadingPermissions && !isSuperAdmin) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
      className: "p-8 text-center text-sm text-muted-foreground",
      children: "Loading admin permissions..."
    });
  }
  if (!canManageTranscripts) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
      className: "p-8 text-center text-sm text-muted-foreground",
      children: "Você não tem permissões para gerir transcripts. Contacte um super administrador para obter acesso."
    });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
    className: "container mx-auto py-8 space-y-6",
    children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
      children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h1", {
        className: "text-3xl font-bold",
        children: "Transcript Management"
      }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
        className: "text-muted-foreground mt-2",
        children: "Upload and manage earnings call transcripts with AI-powered summaries"
      })]
    }), error && /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, {
      variant: "destructive",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, {
        className: "h-4 w-4"
      }), /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDescription, {
        children: error
      })]
    }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
      children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, {
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, {
          children: "Upload New Transcript"
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardDescription, {
          children: "Paste the earnings call transcript and generate an AI summary"
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
        className: "space-y-4",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "grid grid-cols-3 gap-4",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label, {
              htmlFor: "ticker",
              children: "Stock Ticker"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(Input, {
              id: "ticker",
              value: ticker,
              onChange: (e) => setTicker(e.target.value.toUpperCase()),
              placeholder: "AAPL",
              className: "uppercase"
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label, {
              htmlFor: "quarter",
              children: "Quarter"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(Input, {
              id: "quarter",
              value: quarter,
              onChange: (e) => setQuarter(e.target.value),
              placeholder: "Q1"
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label, {
              htmlFor: "year",
              children: "Year"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(Input, {
              id: "year",
              type: "number",
              value: year,
              onChange: (e) => setYear(e.target.value),
              placeholder: "2024"
            })]
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "space-y-2",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex justify-between items-center",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label, {
              htmlFor: "transcript",
              children: "Transcript"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(TokenCounter, {
              text: transcript,
              maxTokens: 15e4,
              className: "text-xs"
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(Textarea, {
            id: "transcript",
            value: transcript,
            onChange: (e) => setTranscript(e.target.value),
            placeholder: "Paste the earnings call transcript here...",
            className: "min-h-[300px] font-mono text-sm"
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
          className: "flex gap-4",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
            onClick: handleGenerateSummary,
            disabled: !canManageTranscripts || !transcript || !ticker || !quarter || !year || isGenerating,
            className: "flex items-center gap-2",
            children: isGenerating ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, {
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                className: "h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent"
              }), "Generating Summary..."]
            }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, {
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, {
                className: "h-4 w-4"
              }), "Generate AI Summary"]
            })
          })
        }), summary && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "space-y-2",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex justify-between items-center",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label, {
              htmlFor: "summary",
              children: "AI Generated Summary"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(TokenCounter, {
              text: summary,
              maxTokens: 2e3,
              className: "text-xs"
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(Textarea, {
            id: "summary",
            value: summary,
            onChange: (e) => setSummary(e.target.value),
            className: "min-h-[300px] font-mono text-sm"
          })]
        }), summary && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "flex justify-end gap-4",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
            variant: "outline",
            onClick: () => setSummary(""),
            disabled: !canManageTranscripts,
            children: "Clear Summary"
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
            onClick: handleSaveTranscript,
            className: "flex items-center gap-2",
            disabled: isGenerating || !canManageTranscripts,
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Upload, {
              className: "h-4 w-4"
            }), "Save Transcript"]
          })]
        })]
      })]
    }), /* @__PURE__ */ jsxRuntimeExports.jsx(TranscriptManagement, {})]
  });
}
export {
  AdminTranscripts as default
};
