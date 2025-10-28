import { r as reactExports, G as useToast, j as jsxRuntimeExports, B as Button, L as Label, t as Switch, C as Card, c as CardContent, n as TrendingUp } from "./index-DF734YkB.js";
import { B as Badge } from "./badge-Bax4ZZX3.js";
import { I as Input } from "./input-vX2xFcRS.js";
import { S as Select, a as SelectTrigger, b as SelectValue, c as SelectContent, d as SelectItem } from "./select-Bm8Ccf9j.js";
import { T as Textarea } from "./textarea-FymLzJLr.js";
import { D as Dialog, a as DialogTrigger, b as DialogContent, c as DialogHeader, d as DialogTitle, e as DialogDescription } from "./dialog-B0u0SV5P.js";
import { P as Plus } from "./plus-DmsdXgBw.js";
import { g as Bell, f as ChartPie, V as Volume2, M as MainLayout } from "./main-layout-iPfLAwEH.js";
import { S as SquarePen } from "./square-pen-D2EBB5gO.js";
import { T as Trash2 } from "./trash-2-BYXtUTac.js";
import { C as Calendar } from "./tabs-CPUG2mtF.js";
import "./index-IXOTxK3N.js";
import "./index-Dx7UitrF.js";
import "./chevron-down-BYhiF8im.js";
import "./index-DXvlFXpR.js";
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
import "./scroll-area-BRs9U-pP.js";
const AlertManager = () => {
  const [alerts, setAlerts] = reactExports.useState([]);
  const [triggers, setTriggers] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(false);
  const [selectedAlert, setSelectedAlert] = reactExports.useState(null);
  const [showCreateDialog, setShowCreateDialog] = reactExports.useState(false);
  const [activeTab, setActiveTab] = reactExports.useState("alerts");
  const {
    toast
  } = useToast();
  const [newAlert, setNewAlert] = reactExports.useState({
    name: "",
    description: "",
    type: "price_change",
    enabled: true,
    conditions: [{
      field: "changePercent",
      operator: "gt",
      value: 5,
      symbol: "AAPL"
    }],
    frequency: {
      type: "15min",
      cooldown: 60,
      maxPerDay: 10
    },
    channels: ["in_app"]
  });
  reactExports.useEffect(() => {
    loadAlerts();
    loadTriggers();
  }, []);
  const loadAlerts = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/alerts");
      const data = await response.json();
      if (response.ok) {
        setAlerts(data.alerts);
      } else {
        toast({
          title: "Error",
          description: "Failed to load alerts",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error loading alerts:", error);
      toast({
        title: "Error",
        description: "Failed to load alerts",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const loadTriggers = async () => {
    try {
      const response = await fetch("/api/alerts/triggers?limit=20");
      const data = await response.json();
      if (response.ok) {
        setTriggers(data.triggers);
      }
    } catch (error) {
      console.error("Error loading triggers:", error);
    }
  };
  const createAlert = async () => {
    try {
      const response = await fetch("/api/alerts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(newAlert)
      });
      if (response.ok) {
        toast({
          title: "Success",
          description: "Alert created successfully"
        });
        setShowCreateDialog(false);
        setNewAlert({
          name: "",
          description: "",
          type: "price_change",
          enabled: true,
          conditions: [{
            field: "changePercent",
            operator: "gt",
            value: 5,
            symbol: "AAPL"
          }],
          frequency: {
            type: "15min",
            cooldown: 60,
            maxPerDay: 10
          },
          channels: ["in_app"]
        });
        loadAlerts();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to create alert",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error creating alert:", error);
      toast({
        title: "Error",
        description: "Failed to create alert",
        variant: "destructive"
      });
    }
  };
  const deleteAlert = async (alertId) => {
    try {
      const response = await fetch(`/api/alerts/${alertId}`, {
        method: "DELETE"
      });
      if (response.ok) {
        toast({
          title: "Success",
          description: "Alert deleted successfully"
        });
        loadAlerts();
      } else {
        toast({
          title: "Error",
          description: "Failed to delete alert",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error deleting alert:", error);
      toast({
        title: "Error",
        description: "Failed to delete alert",
        variant: "destructive"
      });
    }
  };
  const toggleAlert = async (alertId, enabled) => {
    try {
      const response = await fetch(`/api/alerts/${alertId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          enabled
        })
      });
      if (response.ok) {
        toast({
          title: "Success",
          description: `Alert ${enabled ? "enabled" : "disabled"} successfully`
        });
        loadAlerts();
      } else {
        toast({
          title: "Error",
          description: "Failed to update alert",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error updating alert:", error);
      toast({
        title: "Error",
        description: "Failed to update alert",
        variant: "destructive"
      });
    }
  };
  const acknowledgeAlert = async (triggerId) => {
    try {
      const response = await fetch(`/api/alerts/triggers/${triggerId}/acknowledge`, {
        method: "POST"
      });
      if (response.ok) {
        toast({
          title: "Success",
          description: "Alert acknowledged"
        });
        loadTriggers();
      } else {
        toast({
          title: "Error",
          description: "Failed to acknowledge alert",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error acknowledging alert:", error);
      toast({
        title: "Error",
        description: "Failed to acknowledge alert",
        variant: "destructive"
      });
    }
  };
  const getAlertIcon = (type) => {
    switch (type) {
      case "price_change":
      case "price_threshold":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, {
          className: "h-4 w-4"
        });
      case "volume_spike":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(Volume2, {
          className: "h-4 w-4"
        });
      case "earnings_reminder":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(Calendar, {
          className: "h-4 w-4"
        });
      case "portfolio_performance":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(ChartPie, {
          className: "h-4 w-4"
        });
      default:
        return /* @__PURE__ */ jsxRuntimeExports.jsx(Bell, {
          className: "h-4 w-4"
        });
    }
  };
  const getSeverityColor = (severity) => {
    switch (severity) {
      case "critical":
        return "bg-red-500";
      case "high":
        return "bg-orange-500";
      case "medium":
        return "bg-yellow-500";
      case "low":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };
  const formatFrequency = (frequency) => {
    switch (frequency.type) {
      case "immediate":
        return "Immediate";
      case "5min":
        return "Every 5 minutes";
      case "15min":
        return "Every 15 minutes";
      case "1hour":
        return "Every hour";
      case "daily":
        return "Daily";
      case "weekly":
        return "Weekly";
      case "custom":
        return `Every ${frequency.value} minutes`;
      default:
        return "Unknown";
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
    className: "space-y-6",
    children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
      className: "flex items-center justify-between",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h1", {
          className: "text-3xl font-bold",
          children: "Alert Manager"
        }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
          className: "text-muted-foreground",
          children: "Manage your stock and portfolio alerts"
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, {
        open: showCreateDialog,
        onOpenChange: setShowCreateDialog,
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx(DialogTrigger, {
          asChild: true,
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Plus, {
              className: "h-4 w-4 mr-2"
            }), "Create Alert"]
          })
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, {
          className: "max-w-2xl",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, {
              children: "Create New Alert"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, {
              children: "Set up a new alert to monitor your investments"
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "space-y-4",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "grid grid-cols-2 gap-4",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label, {
                  htmlFor: "name",
                  children: "Alert Name"
                }), /* @__PURE__ */ jsxRuntimeExports.jsx(Input, {
                  id: "name",
                  value: newAlert.name || "",
                  onChange: (e) => setNewAlert({
                    ...newAlert,
                    name: e.target.value
                  }),
                  placeholder: "e.g., AAPL Price Alert"
                })]
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label, {
                  htmlFor: "type",
                  children: "Alert Type"
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, {
                  value: newAlert.type,
                  onValueChange: (value) => setNewAlert({
                    ...newAlert,
                    type: value
                  }),
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, {
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {})
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, {
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                      value: "price_change",
                      children: "Price Change"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                      value: "price_threshold",
                      children: "Price Threshold"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                      value: "volume_spike",
                      children: "Volume Spike"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                      value: "earnings_reminder",
                      children: "Earnings Reminder"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                      value: "portfolio_performance",
                      children: "Portfolio Performance"
                    })]
                  })]
                })]
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label, {
                htmlFor: "description",
                children: "Description (Optional)"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(Textarea, {
                id: "description",
                value: newAlert.description || "",
                onChange: (e) => setNewAlert({
                  ...newAlert,
                  description: e.target.value
                }),
                placeholder: "Describe when this alert should trigger...",
                rows: 2
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "space-y-2",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label, {
                children: "Alert Conditions"
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "grid grid-cols-4 gap-2",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label, {
                    htmlFor: "symbol",
                    children: "Symbol"
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx(Input, {
                    id: "symbol",
                    value: newAlert.conditions?.[0]?.symbol || "",
                    onChange: (e) => {
                      const conditions = [...newAlert.conditions || []];
                      conditions[0] = {
                        ...conditions[0],
                        symbol: e.target.value
                      };
                      setNewAlert({
                        ...newAlert,
                        conditions
                      });
                    },
                    placeholder: "AAPL"
                  })]
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label, {
                    htmlFor: "operator",
                    children: "Operator"
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, {
                    value: newAlert.conditions?.[0]?.operator,
                    onValueChange: (value) => {
                      const conditions = [...newAlert.conditions || []];
                      conditions[0] = {
                        ...conditions[0],
                        operator: value
                      };
                      setNewAlert({
                        ...newAlert,
                        conditions
                      });
                    },
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, {
                      children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {})
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, {
                      children: [/* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                        value: "gt",
                        children: "Greater than"
                      }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                        value: "lt",
                        children: "Less than"
                      }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                        value: "gte",
                        children: "Greater or equal"
                      }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                        value: "lte",
                        children: "Less or equal"
                      })]
                    })]
                  })]
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label, {
                    htmlFor: "value",
                    children: "Value"
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx(Input, {
                    id: "value",
                    type: "number",
                    value: newAlert.conditions?.[0]?.value || "",
                    onChange: (e) => {
                      const conditions = [...newAlert.conditions || []];
                      conditions[0] = {
                        ...conditions[0],
                        value: Number(e.target.value)
                      };
                      setNewAlert({
                        ...newAlert,
                        conditions
                      });
                    },
                    placeholder: "5"
                  })]
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label, {
                    htmlFor: "field",
                    children: "Field"
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, {
                    value: newAlert.conditions?.[0]?.field,
                    onValueChange: (value) => {
                      const conditions = [...newAlert.conditions || []];
                      conditions[0] = {
                        ...conditions[0],
                        field: value
                      };
                      setNewAlert({
                        ...newAlert,
                        conditions
                      });
                    },
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, {
                      children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {})
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, {
                      children: [/* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                        value: "changePercent",
                        children: "Change %"
                      }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                        value: "price",
                        children: "Price"
                      }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                        value: "volume",
                        children: "Volume"
                      })]
                    })]
                  })]
                })]
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "grid grid-cols-2 gap-4",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label, {
                  htmlFor: "frequency",
                  children: "Check Frequency"
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, {
                  value: newAlert.frequency?.type,
                  onValueChange: (value) => setNewAlert({
                    ...newAlert,
                    frequency: {
                      ...newAlert.frequency,
                      type: value
                    }
                  }),
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, {
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {})
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, {
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                      value: "immediate",
                      children: "Immediate"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                      value: "5min",
                      children: "Every 5 minutes"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                      value: "15min",
                      children: "Every 15 minutes"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                      value: "1hour",
                      children: "Every hour"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                      value: "daily",
                      children: "Daily"
                    })]
                  })]
                })]
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label, {
                  htmlFor: "cooldown",
                  children: "Cooldown (minutes)"
                }), /* @__PURE__ */ jsxRuntimeExports.jsx(Input, {
                  id: "cooldown",
                  type: "number",
                  value: newAlert.frequency?.cooldown || "",
                  onChange: (e) => setNewAlert({
                    ...newAlert,
                    frequency: {
                      ...newAlert.frequency,
                      cooldown: Number(e.target.value)
                    }
                  }),
                  placeholder: "60"
                })]
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label, {
                children: "Notification Channels"
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "flex space-x-4 mt-2",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "flex items-center space-x-2",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx("input", {
                    type: "checkbox",
                    id: "in_app",
                    checked: newAlert.channels?.includes("in_app"),
                    onChange: (e) => {
                      const channels = newAlert.channels || [];
                      if (e.target.checked) {
                        setNewAlert({
                          ...newAlert,
                          channels: [...channels, "in_app"]
                        });
                      } else {
                        setNewAlert({
                          ...newAlert,
                          channels: channels.filter((c) => c !== "in_app")
                        });
                      }
                    }
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx(Label, {
                    htmlFor: "in_app",
                    children: "In-App"
                  })]
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "flex items-center space-x-2",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx("input", {
                    type: "checkbox",
                    id: "email",
                    checked: newAlert.channels?.includes("email"),
                    onChange: (e) => {
                      const channels = newAlert.channels || [];
                      if (e.target.checked) {
                        setNewAlert({
                          ...newAlert,
                          channels: [...channels, "email"]
                        });
                      } else {
                        setNewAlert({
                          ...newAlert,
                          channels: channels.filter((c) => c !== "email")
                        });
                      }
                    }
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx(Label, {
                    htmlFor: "email",
                    children: "Email"
                  })]
                })]
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "flex items-center space-x-2",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Switch, {
                id: "enabled",
                checked: newAlert.enabled,
                onCheckedChange: (checked) => setNewAlert({
                  ...newAlert,
                  enabled: checked
                })
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(Label, {
                htmlFor: "enabled",
                children: "Enable alert immediately"
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "flex justify-end space-x-2",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
                variant: "outline",
                onClick: () => setShowCreateDialog(false),
                children: "Cancel"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
                onClick: createAlert,
                children: "Create Alert"
              })]
            })]
          })]
        })]
      })]
    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
      className: "flex space-x-1 rounded-lg bg-muted p-1",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("button", {
        onClick: () => setActiveTab("alerts"),
        className: `rounded-md px-3 py-1.5 text-sm font-medium transition-all ${activeTab === "alerts" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`,
        children: ["My Alerts (", alerts.length, ")"]
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs("button", {
        onClick: () => setActiveTab("history"),
        className: `rounded-md px-3 py-1.5 text-sm font-medium transition-all ${activeTab === "history" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`,
        children: ["Alert History (", triggers.filter((t) => !t.acknowledged).length, " unread)"]
      })]
    }), activeTab === "alerts" ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
      className: "space-y-4",
      children: loading ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
        className: "flex justify-center py-8",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
          className: "animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"
        })
      }) : alerts.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(Card, {
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
          className: "flex flex-col items-center justify-center py-8",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Bell, {
            className: "h-12 w-12 text-muted-foreground mb-4"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("h3", {
            className: "text-lg font-semibold mb-2",
            children: "No alerts configured"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
            className: "text-muted-foreground text-center mb-4",
            children: "Create your first alert to start monitoring your investments"
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
            onClick: () => setShowCreateDialog(true),
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Plus, {
              className: "h-4 w-4 mr-2"
            }), "Create Your First Alert"]
          })]
        })
      }) : alerts.map((alert) => /* @__PURE__ */ jsxRuntimeExports.jsx(Card, {
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
          className: "p-6",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex items-center justify-between",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "flex items-center space-x-3",
              children: [getAlertIcon(alert.type), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h3", {
                  className: "font-semibold",
                  children: alert.name
                }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                  className: "text-sm text-muted-foreground",
                  children: alert.description || "No description"
                })]
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "flex items-center space-x-2",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Badge, {
                variant: alert.enabled ? "default" : "secondary",
                children: alert.enabled ? "Active" : "Disabled"
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, {
                variant: "outline",
                children: [alert.triggerCount, " triggers"]
              })]
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "mt-4 grid grid-cols-2 md:grid-cols-4 gap-4",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                className: "text-xs text-muted-foreground",
                children: "Type"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                className: "text-sm capitalize",
                children: alert.type.replace("_", " ")
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                className: "text-xs text-muted-foreground",
                children: "Frequency"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                className: "text-sm",
                children: formatFrequency(alert.frequency)
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                className: "text-xs text-muted-foreground",
                children: "Channels"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                className: "text-sm",
                children: alert.channels.join(", ")
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                className: "text-xs text-muted-foreground",
                children: "Last Triggered"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                className: "text-sm",
                children: alert.lastTriggered ? new Date(alert.lastTriggered).toLocaleDateString() : "Never"
              })]
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "mt-4 flex items-center justify-between",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "flex items-center space-x-2",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Switch, {
                checked: alert.enabled,
                onCheckedChange: (checked) => toggleAlert(alert.id, checked)
              }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                className: "text-sm",
                children: alert.enabled ? "Enabled" : "Disabled"
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "flex space-x-2",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
                variant: "outline",
                size: "sm",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(SquarePen, {
                  className: "h-4 w-4"
                })
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
                variant: "outline",
                size: "sm",
                onClick: () => deleteAlert(alert.id),
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, {
                  className: "h-4 w-4"
                })
              })]
            })]
          })]
        })
      }, alert.id))
    }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
      className: "space-y-4",
      children: triggers.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(Card, {
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
          className: "flex flex-col items-center justify-center py-8",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Bell, {
            className: "h-12 w-12 text-muted-foreground mb-4"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("h3", {
            className: "text-lg font-semibold mb-2",
            children: "No alert history"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
            className: "text-muted-foreground text-center",
            children: "Your alert triggers will appear here when they are activated"
          })]
        })
      }) : triggers.map((trigger) => /* @__PURE__ */ jsxRuntimeExports.jsx(Card, {
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
          className: "p-6",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex items-center justify-between",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "flex items-center space-x-3",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                className: `w-3 h-3 rounded-full ${getSeverityColor(trigger.severity)}`
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h3", {
                  className: "font-semibold",
                  children: trigger.alert_name
                }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                  className: "text-sm text-muted-foreground",
                  children: trigger.message
                })]
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "flex items-center space-x-2",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Badge, {
                variant: "outline",
                children: trigger.severity
              }), trigger.symbol && /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, {
                variant: "secondary",
                children: trigger.symbol
              }), !trigger.acknowledged && /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
                size: "sm",
                onClick: () => acknowledgeAlert(trigger.id),
                children: "Acknowledge"
              })]
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "mt-4 grid grid-cols-2 md:grid-cols-4 gap-4",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                className: "text-xs text-muted-foreground",
                children: "Triggered"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                className: "text-sm",
                children: new Date(trigger.triggeredAt).toLocaleString()
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                className: "text-xs text-muted-foreground",
                children: "Current Value"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                className: "text-sm",
                children: trigger.currentValue
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                className: "text-xs text-muted-foreground",
                children: "Type"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                className: "text-sm capitalize",
                children: trigger.alert_type.replace("_", " ")
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                className: "text-xs text-muted-foreground",
                children: "Status"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                className: "text-sm",
                children: trigger.acknowledged ? "✅ Acknowledged" : "🔔 Pending"
              })]
            })]
          })]
        })
      }, trigger.id))
    })]
  });
};
const AlertsPage = () => {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(MainLayout, {
    children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
      className: "container mx-auto px-4 py-6",
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(AlertManager, {})
    })
  });
};
export {
  AlertsPage as default
};
