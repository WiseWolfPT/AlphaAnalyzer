import { h as useSupabaseAuth, i as useTheme, G as useToast, u as useLocation, r as reactExports, j as jsxRuntimeExports, S as Settings$1, C as Card, a as CardHeader, b as CardTitle, c as CardContent, L as Label, B as Button, t as Switch, K as TriangleAlert } from "./index-DF734YkB.js";
import { M as MainLayout, g as Bell } from "./main-layout-iPfLAwEH.js";
import { I as Input } from "./input-vX2xFcRS.js";
import { S as Select, a as SelectTrigger, b as SelectValue, c as SelectContent, d as SelectItem } from "./select-Bm8Ccf9j.js";
import { S as Separator } from "./use-auth-monitoring-Ca9Wv08z.js";
import { B as Badge } from "./badge-Bax4ZZX3.js";
import { T as Tabs, a as TabsList, b as TabsTrigger, c as TabsContent } from "./tabs-CPUG2mtF.js";
import { C as Crown, U as User, S as Sun, M as Moon } from "./user-C46AQImy.js";
import { S as Shield } from "./shield-Sv89QQud.js";
import { C as CreditCard } from "./credit-card-Cvvbry_u.js";
import { D as Database } from "./database-BIWFOkVP.js";
import { E as Eye } from "./eye-DQw-lb5A.js";
import { D as Download } from "./download-8GhWTv4F.js";
import { T as Trash2 } from "./trash-2-BYXtUTac.js";
import "./dialog-B0u0SV5P.js";
import "./index-DXvlFXpR.js";
import "./mail-D5HopcQP.js";
import "./lock-C5qTkNPd.js";
import "./menu-CG6pfADK.js";
import "./chart-column-DNzw3S_G.js";
import "./search-CySG90ju.js";
import "./file-text-BCjG82i7.js";
import "./log-in-CA1V17qY.js";
import "./index-Dx7UitrF.js";
import "./scroll-area-BRs9U-pP.js";
import "./index-IXOTxK3N.js";
import "./chevron-down-BYhiF8im.js";
function Settings() {
  const {
    user,
    userProfile
  } = useSupabaseAuth();
  const {
    theme,
    setTheme
  } = useTheme();
  const {
    toast
  } = useToast();
  const [, setLocation] = useLocation();
  const displayName = userProfile?.name || (typeof user?.user_metadata?.name === "string" ? user.user_metadata.name : void 0) || (user?.email ? user.email.split("@")[0] : null) || "António Francisco";
  const emailAddress = user?.email || "alcateiafinanceirapt@gmail.com";
  const [profileData, setProfileData] = reactExports.useState({
    name: displayName,
    email: emailAddress,
    timezone: "Europe/Lisbon",
    language: "pt",
    currency: "EUR"
  });
  const [notificationSettings, setNotificationSettings] = reactExports.useState({
    emailNotifications: true,
    priceAlerts: true,
    earningsReminders: true,
    weeklyDigest: true,
    marketNews: false,
    portfolioUpdates: true
  });
  const [privacySettings, setPrivacySettings] = reactExports.useState({
    profileVisibility: "private",
    shareWatchlists: false,
    sharePortfolio: false,
    analyticsOptOut: false
  });
  reactExports.useEffect(() => {
    setProfileData((prev) => ({
      ...prev,
      name: displayName,
      email: emailAddress
    }));
  }, [displayName, emailAddress]);
  const handleSaveProfile = () => {
    toast({
      title: "Profile Updated",
      description: "Your profile settings have been saved successfully."
    });
  };
  const handleSaveNotifications = () => {
    toast({
      title: "Notifications Updated",
      description: "Your notification preferences have been saved."
    });
  };
  const handleExportData = () => {
    toast({
      title: "Export Started",
      description: "Your data export will be ready shortly and sent to your email."
    });
  };
  const handleDeleteAccount = () => {
    toast({
      title: "Account Deletion",
      description: "Please contact support to delete your account.",
      variant: "destructive"
    });
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(MainLayout, {
    children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
      className: "container mx-auto px-6 py-8 max-w-6xl",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "flex items-center justify-between mb-6",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "flex items-center gap-3",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "p-2 bg-primary/10 rounded-xl",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(Settings$1, {
              className: "h-6 w-6 text-primary"
            })
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h1", {
              className: "text-3xl font-bold text-foreground",
              children: "Settings"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
              className: "text-muted-foreground",
              children: "Manage your account and preferences"
            })]
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
          className: "flex items-center space-x-2",
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, {
            variant: "outline",
            className: "text-xs",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Crown, {
              className: "h-3 w-3 mr-1"
            }), (userProfile?.subscription_tier || "free").toUpperCase(), " Plan"]
          })
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Tabs, {
        defaultValue: "profile",
        className: "w-full",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(TabsList, {
          className: "mb-6 grid w-full grid-cols-5",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(TabsTrigger, {
            value: "profile",
            className: "flex items-center gap-2",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(User, {
              className: "h-4 w-4"
            }), "Profile"]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsTrigger, {
            value: "notifications",
            className: "flex items-center gap-2",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Bell, {
              className: "h-4 w-4"
            }), "Notifications"]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsTrigger, {
            value: "privacy",
            className: "flex items-center gap-2",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Shield, {
              className: "h-4 w-4"
            }), "Privacy"]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsTrigger, {
            value: "subscription",
            className: "flex items-center gap-2",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CreditCard, {
              className: "h-4 w-4"
            }), "Billing"]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsTrigger, {
            value: "data",
            className: "flex items-center gap-2",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Database, {
              className: "h-4 w-4"
            }), "Data"]
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsContent, {
          value: "profile",
          className: "space-y-6",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
              children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, {
                className: "flex items-center gap-2",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(User, {
                  className: "h-5 w-5"
                }), "Personal Information"]
              })
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
              className: "space-y-4",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "grid grid-cols-2 gap-4",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "space-y-2",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label, {
                    htmlFor: "name",
                    children: "Full Name"
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx(Input, {
                    id: "name",
                    value: profileData.name,
                    onChange: (e) => setProfileData((prev) => ({
                      ...prev,
                      name: e.target.value
                    }))
                  })]
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "space-y-2",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label, {
                    htmlFor: "email",
                    children: "Email Address"
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx(Input, {
                    id: "email",
                    type: "email",
                    value: profileData.email,
                    onChange: (e) => setProfileData((prev) => ({
                      ...prev,
                      email: e.target.value
                    }))
                  })]
                })]
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "grid grid-cols-3 gap-4",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "space-y-2",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label, {
                    htmlFor: "timezone",
                    children: "Timezone"
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, {
                    value: profileData.timezone,
                    onValueChange: (value) => setProfileData((prev) => ({
                      ...prev,
                      timezone: value
                    })),
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, {
                      children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {})
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, {
                      children: [/* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                        value: "Europe/Lisbon",
                        children: "Europe/Lisbon"
                      }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                        value: "Europe/London",
                        children: "Europe/London"
                      }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                        value: "America/New_York",
                        children: "America/New_York"
                      }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                        value: "America/Los_Angeles",
                        children: "America/Los_Angeles"
                      })]
                    })]
                  })]
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "space-y-2",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label, {
                    htmlFor: "language",
                    children: "Language"
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, {
                    value: profileData.language,
                    onValueChange: (value) => setProfileData((prev) => ({
                      ...prev,
                      language: value
                    })),
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, {
                      children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {})
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, {
                      children: [/* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                        value: "pt",
                        children: "Português"
                      }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                        value: "en",
                        children: "English"
                      }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                        value: "es",
                        children: "Español"
                      })]
                    })]
                  })]
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "space-y-2",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label, {
                    htmlFor: "currency",
                    children: "Currency"
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, {
                    value: profileData.currency,
                    onValueChange: (value) => setProfileData((prev) => ({
                      ...prev,
                      currency: value
                    })),
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, {
                      children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {})
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, {
                      children: [/* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                        value: "EUR",
                        children: "EUR (€)"
                      }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                        value: "USD",
                        children: "USD ($)"
                      }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                        value: "GBP",
                        children: "GBP (£)"
                      })]
                    })]
                  })]
                })]
              }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                className: "flex justify-end",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
                  onClick: handleSaveProfile,
                  children: "Save Changes"
                })
              })]
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
              children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, {
                className: "flex items-center gap-2",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Eye, {
                  className: "h-5 w-5"
                }), "Display Preferences"]
              })
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
              className: "space-y-4",
              children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "flex items-center justify-between",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "space-y-0.5",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label, {
                    children: "Theme"
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                    className: "text-sm text-muted-foreground",
                    children: "Choose your preferred theme"
                  })]
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "flex items-center space-x-2",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
                    variant: theme === "light" ? "default" : "outline",
                    size: "sm",
                    onClick: () => setTheme("light"),
                    className: "flex items-center gap-2",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Sun, {
                      className: "h-4 w-4"
                    }), "Light"]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
                    variant: theme === "dark" ? "default" : "outline",
                    size: "sm",
                    onClick: () => setTheme("dark"),
                    className: "flex items-center gap-2",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Moon, {
                      className: "h-4 w-4"
                    }), "Dark"]
                  })]
                })]
              })
            })]
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, {
          value: "notifications",
          className: "space-y-6",
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
              children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, {
                className: "flex items-center gap-2",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Bell, {
                  className: "h-5 w-5"
                }), "Email Notifications"]
              })
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
              className: "space-y-4",
              children: [Object.entries({
                emailNotifications: "Email notifications",
                priceAlerts: "Price alerts for watchlist stocks",
                earningsReminders: "Upcoming earnings reminders",
                weeklyDigest: "Weekly portfolio digest",
                marketNews: "Market news and updates",
                portfolioUpdates: "Portfolio performance updates"
              }).map(([key, label]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "flex items-center justify-between",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                  className: "space-y-0.5",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(Label, {
                    children: label
                  })
                }), /* @__PURE__ */ jsxRuntimeExports.jsx(Switch, {
                  checked: notificationSettings[key],
                  onCheckedChange: (checked) => setNotificationSettings((prev) => ({
                    ...prev,
                    [key]: checked
                  }))
                })]
              }, key)), /* @__PURE__ */ jsxRuntimeExports.jsx(Separator, {}), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                className: "flex justify-end",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
                  onClick: handleSaveNotifications,
                  children: "Save Preferences"
                })
              })]
            })]
          })
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, {
          value: "privacy",
          className: "space-y-6",
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
              children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, {
                className: "flex items-center gap-2",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Shield, {
                  className: "h-5 w-5"
                }), "Privacy & Security"]
              })
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
              className: "space-y-4",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "flex items-center justify-between",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "space-y-0.5",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label, {
                    children: "Profile Visibility"
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                    className: "text-sm text-muted-foreground",
                    children: "Control who can see your profile"
                  })]
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, {
                  value: privacySettings.profileVisibility,
                  onValueChange: (value) => setPrivacySettings((prev) => ({
                    ...prev,
                    profileVisibility: value
                  })),
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, {
                    className: "w-32",
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {})
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, {
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                      value: "private",
                      children: "Private"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                      value: "public",
                      children: "Public"
                    })]
                  })]
                })]
              }), Object.entries({
                shareWatchlists: "Allow sharing of watchlists",
                sharePortfolio: "Allow sharing of portfolio performance",
                analyticsOptOut: "Opt out of analytics tracking"
              }).map(([key, label]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "flex items-center justify-between",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                  className: "space-y-0.5",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(Label, {
                    children: label
                  })
                }), /* @__PURE__ */ jsxRuntimeExports.jsx(Switch, {
                  checked: privacySettings[key],
                  onCheckedChange: (checked) => setPrivacySettings((prev) => ({
                    ...prev,
                    [key]: checked
                  }))
                })]
              }, key))]
            })]
          })
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, {
          value: "subscription",
          className: "space-y-6",
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
              children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, {
                className: "flex items-center gap-2",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CreditCard, {
                  className: "h-5 w-5"
                }), "Subscription & Billing"]
              })
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
              className: "space-y-4",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "flex items-center justify-between p-4 bg-primary/5 rounded-lg",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                    className: "font-semibold",
                    children: "Pro Trial"
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                    className: "text-sm text-muted-foreground",
                    children: "5 days remaining"
                  })]
                }), /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
                  onClick: () => setLocation("/subscription-success"),
                  className: "bg-gradient-to-r from-teya-green via-teya-green-dark to-teya-green hover:from-teya-green-dark hover:via-teya-green hover:to-teya-green-dark text-rich-black font-semibold",
                  children: "Upgrade to Pro"
                })]
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(Separator, {}), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "space-y-3",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h4", {
                  className: "font-medium",
                  children: "Billing Information"
                }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                  className: "text-sm text-muted-foreground",
                  children: "No payment method on file. Add a payment method to continue your subscription after the trial."
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
                  variant: "outline",
                  className: "w-fit",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CreditCard, {
                    className: "h-4 w-4 mr-2"
                  }), "Add Payment Method"]
                })]
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(Separator, {}), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "space-y-3",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h4", {
                  className: "font-medium",
                  children: "Usage & Limits"
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "grid grid-cols-3 gap-4",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "text-center",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                      className: "text-2xl font-bold text-primary",
                      children: "247"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                      className: "text-sm text-muted-foreground",
                      children: "API Calls Today"
                    })]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "text-center",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                      className: "text-2xl font-bold text-primary",
                      children: "∞"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                      className: "text-sm text-muted-foreground",
                      children: "Watchlists"
                    })]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "text-center",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                      className: "text-2xl font-bold text-primary",
                      children: "3"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                      className: "text-sm text-muted-foreground",
                      children: "Portfolios"
                    })]
                  })]
                })]
              })]
            })]
          })
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, {
          value: "data",
          className: "space-y-6",
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
              children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, {
                className: "flex items-center gap-2",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Database, {
                  className: "h-5 w-5"
                }), "Data Management"]
              })
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
              className: "space-y-4",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "space-y-3",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h4", {
                  className: "font-medium",
                  children: "Export Your Data"
                }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                  className: "text-sm text-muted-foreground",
                  children: "Download a copy of all your data including watchlists, portfolios, and settings."
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
                  variant: "outline",
                  onClick: handleExportData,
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Download, {
                    className: "h-4 w-4 mr-2"
                  }), "Export Data"]
                })]
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(Separator, {}), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "space-y-3",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h4", {
                  className: "font-medium",
                  children: "Data Sources"
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "space-y-2",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex items-center justify-between p-2 bg-muted/50 rounded",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "text-sm",
                      children: "Alpha Vantage"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, {
                      variant: "outline",
                      className: "text-xs",
                      children: "Connected"
                    })]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex items-center justify-between p-2 bg-muted/50 rounded",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "text-sm",
                      children: "Finnhub"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, {
                      variant: "outline",
                      className: "text-xs",
                      children: "Connected"
                    })]
                  })]
                })]
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(Separator, {}), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "space-y-3",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h4", {
                  className: "font-medium text-red-600",
                  children: "Danger Zone"
                }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                  className: "p-4 border border-red-200 dark:border-red-800 rounded-lg",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex items-start gap-3",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, {
                      className: "h-5 w-5 text-red-500 mt-0.5"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                      className: "flex-1",
                      children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                        className: "font-medium text-red-600",
                        children: "Delete Account"
                      }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                        className: "text-sm text-muted-foreground mt-1",
                        children: "Permanently delete your account and all associated data. This action cannot be undone."
                      }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
                        variant: "destructive",
                        size: "sm",
                        className: "mt-3",
                        onClick: handleDeleteAccount,
                        children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, {
                          className: "h-4 w-4 mr-2"
                        }), "Delete Account"]
                      })]
                    })]
                  })
                })]
              })]
            })]
          })
        })]
      })]
    })
  });
}
export {
  Settings as default
};
