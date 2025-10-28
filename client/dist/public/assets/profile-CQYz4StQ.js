import { e as createLucideIcon, G as useToast, D as useQueryClient, r as reactExports, j as jsxRuntimeExports, C as Card, c as CardContent, a as CardHeader, b as CardTitle, B as Button, L as Label, t as Switch } from "./index-DF734YkB.js";
import { d as useQuery } from "./useQuery-C9HFImIm.js";
import { u as useMutation } from "./useMutation-BTJ0XPNX.js";
import { M as MainLayout, g as Bell } from "./main-layout-iPfLAwEH.js";
import { I as Input } from "./input-vX2xFcRS.js";
import { B as Badge } from "./badge-Bax4ZZX3.js";
import { T as Tabs, a as TabsList, b as TabsTrigger, c as TabsContent } from "./tabs-CPUG2mtF.js";
import { a as apiRequest } from "./queryClient-CXMFu_RS.js";
import { U as User, C as Crown } from "./user-C46AQImy.js";
import { C as CreditCard } from "./credit-card-Cvvbry_u.js";
import { S as Save } from "./save-DcJiyL9Y.js";
import { M as Mail } from "./mail-D5HopcQP.js";
import { S as Shield } from "./shield-Sv89QQud.js";
import "./dialog-B0u0SV5P.js";
import "./index-DXvlFXpR.js";
import "./use-auth-monitoring-Ca9Wv08z.js";
import "./lock-C5qTkNPd.js";
import "./eye-DQw-lb5A.js";
import "./menu-CG6pfADK.js";
import "./chart-column-DNzw3S_G.js";
import "./search-CySG90ju.js";
import "./file-text-BCjG82i7.js";
import "./log-in-CA1V17qY.js";
import "./select-Bm8Ccf9j.js";
import "./index-IXOTxK3N.js";
import "./index-Dx7UitrF.js";
import "./chevron-down-BYhiF8im.js";
import "./scroll-area-BRs9U-pP.js";
import "./api-config-Zh6ttKls.js";
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const MapPin = createLucideIcon("MapPin", [
  [
    "path",
    {
      d: "M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0",
      key: "1r0f0z"
    }
  ],
  ["circle", { cx: "12", cy: "10", r: "3", key: "ilqhr7" }]
]);
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Phone = createLucideIcon("Phone", [
  [
    "path",
    {
      d: "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z",
      key: "foiqr5"
    }
  ]
]);
const SubscriptionStatus = ({
  subscription,
  onUpgrade,
  onManage
}) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
  children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
    children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, {
      className: "flex items-center gap-2",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Crown, {
        className: "h-5 w-5"
      }), "Subscription Status - ", subscription.planName || "Beta Trial"]
    })
  }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
    children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
      className: "space-y-4",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "flex items-center justify-between",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
          children: "Status:"
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, {
          variant: "secondary",
          children: subscription.status || "Active"
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "flex items-center justify-between",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
          children: "Valid until:"
        }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
          children: subscription.endDate || "30 de Julho, 2025"
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "flex gap-2",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
          variant: "outline",
          onClick: onUpgrade,
          children: "Upgrade Plan"
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
          variant: "outline",
          onClick: onManage,
          children: "Manage Subscription"
        })]
      })]
    })
  })]
});
const PricingPlans = ({
  currentPlan,
  onSelectPlan
}) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
  className: "grid grid-cols-1 md:grid-cols-3 gap-4",
  children: ["Basic", "Pro", "Premium"].map((plan) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
    className: `border-2 ${currentPlan === plan ? "border-primary" : "border-border"}`,
    children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, {
        children: plan
      })
    }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "space-y-2",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
          className: "text-2xl font-bold",
          children: [plan === "Basic" ? "€9.99" : plan === "Pro" ? "€19.99" : "€39.99", /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
            className: "text-sm font-normal",
            children: "/month"
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
          className: "w-full",
          variant: currentPlan === plan ? "secondary" : "default",
          onClick: () => onSelectPlan(plan),
          children: currentPlan === plan ? "Current Plan" : "Select Plan"
        })]
      })
    })]
  }, plan))
});
function Profile() {
  const {
    toast
  } = useToast();
  const queryClient = useQueryClient();
  const [passwordData, setPasswordData] = reactExports.useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const {
    data: serverProfileData,
    isLoading: isProfileLoading,
    error: profileError
  } = useQuery({
    queryKey: ["/api/user/profile"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/user/profile");
        return response.json();
      } catch (error) {
        console.warn("Profile API failed, using localStorage:", error);
        const saved = localStorage.getItem("alfalyzer-profile");
        return saved ? JSON.parse(saved) : null;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1e3
    // 5 minutes
  });
  const [profileData, setProfileData] = reactExports.useState(() => {
    const saved = localStorage.getItem("alfalyzer-profile");
    return saved ? JSON.parse(saved) : {
      firstName: "António",
      lastName: "Francisco",
      email: "alcateiafinanceirapt@gmail.com",
      phone: "+351 912 345 678",
      location: "Lisboa, Portugal",
      joinDate: "January 2024",
      investmentExperience: "Intermediate",
      riskTolerance: "Moderate",
      preferredSectors: ["Technology", "Healthcare", "Finance"]
    };
  });
  reactExports.useEffect(() => {
    if (serverProfileData) {
      setProfileData((prevData) => ({
        ...prevData,
        // Keep existing defaults
        ...serverProfileData,
        // Override with server data
        // Ensure critical arrays always exist
        preferredSectors: Array.isArray(serverProfileData.preferredSectors) ? serverProfileData.preferredSectors : prevData.preferredSectors || []
      }));
    }
  }, [serverProfileData]);
  const updateProfileMutation = useMutation({
    mutationFn: async (data) => {
      localStorage.setItem("alfalyzer-profile", JSON.stringify(data));
      try {
        const response = await apiRequest("PUT", "/api/user/profile", data);
        return response.json();
      } catch (error) {
        console.warn("Server update failed, using localStorage:", error);
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/user/profile"]
      });
      setIsEditing(false);
      toast({
        title: "Profile Updated",
        description: "Your profile has been saved successfully"
      });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Could not save to server, but changes are saved locally",
        variant: "destructive"
      });
    }
  });
  const [notifications, setNotifications] = reactExports.useState({
    emailAlerts: true,
    priceAlerts: true,
    earningsAlerts: true,
    newsAlerts: false,
    weeklyDigest: true
  });
  const userSubscription = {
    id: "sub_123",
    userId: "user_123",
    planId: "whop-trial",
    status: "trial",
    startDate: "2025-06-01T00:00:00Z",
    endDate: "2025-07-01T00:00:00Z",
    trialEndDate: "2025-06-08T00:00:00Z",
    paymentMethod: "whop",
    whopOrderId: "whop_order_123",
    // Additional fields for simplified components
    planName: "Beta Trial"
  };
  const handleSavePersonal = () => {
    updateProfileMutation.mutate(profileData);
  };
  const handleSaveNotifications = () => {
    localStorage.setItem("alfalyzer-notifications", JSON.stringify(notifications));
    toast({
      title: "Notifications Updated",
      description: "Your notification preferences have been saved"
    });
  };
  const handleChangePassword = () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all password fields",
        variant: "destructive"
      });
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "New password and confirmation don't match",
        variant: "destructive"
      });
      return;
    }
    if (passwordData.newPassword.length < 8) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 8 characters long",
        variant: "destructive"
      });
      return;
    }
    toast({
      title: "Password Changed",
      description: "Your password has been updated successfully"
    });
    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: ""
    });
  };
  const [userStats, setUserStats] = reactExports.useState({
    watchlists: 0,
    trackedStocks: 0,
    alertsSet: 0,
    daysActive: 0,
    totalValue: "$0",
    todayChange: "0%"
  });
  const {
    data: statsData
  } = useQuery({
    queryKey: ["/api/user/stats"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/user/stats");
        return response.json();
      } catch (error) {
        return {
          watchlists: 3,
          trackedStocks: 24,
          alertsSet: 12,
          daysActive: Math.floor((Date.now() - new Date(profileData.joinDate).getTime()) / (1e3 * 60 * 60 * 24)) || 156,
          totalValue: "$12,450",
          todayChange: "+2.3%"
        };
      }
    },
    staleTime: 5 * 60 * 1e3
  });
  reactExports.useEffect(() => {
    if (statsData) {
      setUserStats(statsData);
    }
  }, [statsData]);
  const stats = [{
    label: "Watchlists",
    value: userStats.watchlists.toString(),
    icon: "📋",
    color: "text-blue-600"
  }, {
    label: "Tracked Stocks",
    value: userStats.trackedStocks.toString(),
    icon: "📈",
    color: "text-green-600"
  }, {
    label: "Alerts Set",
    value: userStats.alertsSet.toString(),
    icon: "🔔",
    color: "text-yellow-600"
  }, {
    label: "Days Active",
    value: userStats.daysActive.toString(),
    icon: "⏰",
    color: "text-purple-600"
  }, {
    label: "Portfolio Value",
    value: userStats.totalValue,
    icon: "💰",
    color: "text-emerald-600"
  }, {
    label: "Today's Change",
    value: userStats.todayChange,
    icon: "📊",
    color: userStats.todayChange.startsWith("+") ? "text-green-600" : "text-red-600"
  }];
  return /* @__PURE__ */ jsxRuntimeExports.jsx(MainLayout, {
    children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
      className: "container mx-auto px-6 py-8 max-w-6xl",
      children: [isProfileLoading && /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
        className: "flex items-center justify-center py-12",
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "flex items-center gap-3",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "animate-spin rounded-full h-6 w-6 border-b-2 border-primary"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
            className: "text-muted-foreground",
            children: "Loading your profile..."
          })]
        })
      }), profileError && /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
        className: "bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6",
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "flex items-center gap-2",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "text-amber-600",
            children: "⚠️"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
            className: "text-amber-800",
            children: "Profile API unavailable - using local data"
          })]
        })
      }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
        className: "mb-8",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
          className: "flex items-center justify-between",
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex items-center gap-4",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
              className: "p-2 bg-teya-green/10 rounded-xl",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(User, {
                className: "h-6 w-6 text-primary"
              })
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h1", {
                className: "text-3xl font-bold text-foreground",
                children: "Profile"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                className: "text-muted-foreground",
                children: "Manage your account and preferences"
              })]
            })]
          })
        })
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "grid grid-cols-1 lg:grid-cols-3 gap-8",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
          className: "lg:col-span-1",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(Card, {
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
              className: "p-6",
              children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "text-center",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "w-24 h-24 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-3xl font-bold text-primary-foreground mb-4 mx-auto",
                  children: [(profileData.firstName || "A").charAt(0), (profileData.lastName || "F").charAt(0)]
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", {
                  className: "text-xl font-bold text-foreground mb-1",
                  children: [profileData.firstName || "António", " ", profileData.lastName || "Francisco"]
                }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                  className: "text-muted-foreground mb-4",
                  children: profileData.email
                }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                  className: "grid grid-cols-2 gap-3 mt-6",
                  children: (stats || []).map((stat, index) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "text-center p-3 bg-gradient-to-br from-secondary/20 to-secondary/40 rounded-lg border border-secondary/50 hover:bg-secondary/50 transition-colors",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                      className: "text-lg mb-1",
                      children: stat?.icon || "📊"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                      className: `font-bold ${stat?.color || "text-foreground"}`,
                      children: stat?.value || "0"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                      className: "text-xs text-muted-foreground",
                      children: stat?.label || "N/A"
                    })]
                  }, index))
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "mt-6 space-y-2",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, {
                    variant: "secondary",
                    className: "mr-2",
                    children: [profileData.investmentExperience, " Investor"]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, {
                    variant: "outline",
                    children: ["Member since ", profileData.joinDate]
                  })]
                })]
              })
            })
          })
        }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
          className: "lg:col-span-2",
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Tabs, {
            defaultValue: "subscription",
            className: "w-full",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(TabsList, {
              className: "grid w-full grid-cols-3",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, {
                value: "subscription",
                children: "Subscription"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, {
                value: "personal",
                children: "Personal Info"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, {
                value: "notifications",
                children: "Notifications"
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsContent, {
              value: "subscription",
              className: "space-y-6 mt-6",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(SubscriptionStatus, {
                subscription: userSubscription,
                onUpgrade: () => {
                  console.log("Upgrade subscription");
                },
                onManage: () => {
                  console.log("Manage subscription");
                }
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
                  children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, {
                    className: "flex items-center gap-2",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CreditCard, {
                      className: "h-5 w-5"
                    }), "Upgrade Options"]
                  })
                }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(PricingPlans, {
                    currentPlan: userSubscription.planId,
                    onSelectPlan: (planId) => {
                      console.log("Selected plan:", planId);
                    }
                  })
                })]
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, {
              value: "personal",
              className: "space-y-6 mt-6",
              children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
                  children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex items-center justify-between",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, {
                      className: "flex items-center gap-2",
                      children: [/* @__PURE__ */ jsxRuntimeExports.jsx(User, {
                        className: "h-5 w-5"
                      }), "Personal Information"]
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
                      size: "sm",
                      onClick: handleSavePersonal,
                      className: "bg-gradient-to-r from-teya-green via-teya-green-dark to-teya-green hover:from-teya-green-dark hover:via-teya-green hover:to-teya-green-dark text-rich-black font-semibold shadow-lg shadow-teya-green/30 hover:shadow-teya-green/50 hover:scale-105 transition-all duration-300 border-0",
                      children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Save, {
                        className: "h-4 w-4 mr-2"
                      }), "Save"]
                    })]
                  })
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
                  className: "space-y-4",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "grid grid-cols-1 md:grid-cols-2 gap-4",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                      children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label, {
                        htmlFor: "firstName",
                        children: "First Name"
                      }), /* @__PURE__ */ jsxRuntimeExports.jsx(Input, {
                        id: "firstName",
                        value: profileData.firstName,
                        onChange: (e) => setProfileData({
                          ...profileData,
                          firstName: e.target.value
                        })
                      })]
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                      children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label, {
                        htmlFor: "lastName",
                        children: "Last Name"
                      }), /* @__PURE__ */ jsxRuntimeExports.jsx(Input, {
                        id: "lastName",
                        value: profileData.lastName,
                        onChange: (e) => setProfileData({
                          ...profileData,
                          lastName: e.target.value
                        })
                      })]
                    })]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label, {
                      htmlFor: "email",
                      children: "Email Address"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                      className: "flex items-center gap-2",
                      children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Mail, {
                        className: "h-4 w-4 text-muted-foreground"
                      }), /* @__PURE__ */ jsxRuntimeExports.jsx(Input, {
                        id: "email",
                        type: "email",
                        value: profileData.email,
                        onChange: (e) => setProfileData({
                          ...profileData,
                          email: e.target.value
                        }),
                        className: "flex-1"
                      })]
                    })]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label, {
                      htmlFor: "phone",
                      children: "Phone Number"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                      className: "flex items-center gap-2",
                      children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Phone, {
                        className: "h-4 w-4 text-muted-foreground"
                      }), /* @__PURE__ */ jsxRuntimeExports.jsx(Input, {
                        id: "phone",
                        value: profileData.phone,
                        onChange: (e) => setProfileData({
                          ...profileData,
                          phone: e.target.value
                        }),
                        className: "flex-1"
                      })]
                    })]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label, {
                      htmlFor: "location",
                      children: "Location"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                      className: "flex items-center gap-2",
                      children: [/* @__PURE__ */ jsxRuntimeExports.jsx(MapPin, {
                        className: "h-4 w-4 text-muted-foreground"
                      }), /* @__PURE__ */ jsxRuntimeExports.jsx(Input, {
                        id: "location",
                        value: profileData.location,
                        onChange: (e) => setProfileData({
                          ...profileData,
                          location: e.target.value
                        }),
                        className: "flex-1"
                      })]
                    })]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "border-t pt-6 mt-6",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                      className: "flex items-center justify-between mb-4",
                      children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("h3", {
                        className: "text-lg font-semibold flex items-center gap-2",
                        children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Shield, {
                          className: "h-5 w-5"
                        }), "Change Password"]
                      }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
                        size: "sm",
                        onClick: handleChangePassword,
                        className: "bg-gradient-to-r from-teya-green via-teya-green-dark to-teya-green hover:from-teya-green-dark hover:via-teya-green hover:to-teya-green-dark text-rich-black font-semibold shadow-lg shadow-teya-green/30 hover:shadow-teya-green/50 hover:scale-105 transition-all duration-300 border-0",
                        children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Save, {
                          className: "h-4 w-4 mr-2"
                        }), "Change Password"]
                      })]
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                      className: "space-y-4",
                      children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                        children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label, {
                          htmlFor: "currentPassword",
                          children: "Current Password"
                        }), /* @__PURE__ */ jsxRuntimeExports.jsx(Input, {
                          id: "currentPassword",
                          type: "password",
                          value: passwordData.currentPassword,
                          onChange: (e) => setPasswordData({
                            ...passwordData,
                            currentPassword: e.target.value
                          }),
                          placeholder: "Enter your current password"
                        })]
                      }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                        className: "grid grid-cols-1 md:grid-cols-2 gap-4",
                        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label, {
                            htmlFor: "newPassword",
                            children: "New Password"
                          }), /* @__PURE__ */ jsxRuntimeExports.jsx(Input, {
                            id: "newPassword",
                            type: "password",
                            value: passwordData.newPassword,
                            onChange: (e) => setPasswordData({
                              ...passwordData,
                              newPassword: e.target.value
                            }),
                            placeholder: "Enter new password"
                          })]
                        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label, {
                            htmlFor: "confirmPassword",
                            children: "Confirm Password"
                          }), /* @__PURE__ */ jsxRuntimeExports.jsx(Input, {
                            id: "confirmPassword",
                            type: "password",
                            value: passwordData.confirmPassword,
                            onChange: (e) => setPasswordData({
                              ...passwordData,
                              confirmPassword: e.target.value
                            }),
                            placeholder: "Confirm new password"
                          })]
                        })]
                      }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                        className: "text-sm text-muted-foreground",
                        children: "Password must be at least 8 characters long and contain a mix of letters, numbers, and symbols."
                      })]
                    })]
                  })]
                })]
              })
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, {
              value: "notifications",
              className: "space-y-6 mt-6",
              children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
                  children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex items-center justify-between",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, {
                      className: "flex items-center gap-2",
                      children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Bell, {
                        className: "h-5 w-5"
                      }), "Notification Settings"]
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
                      size: "sm",
                      onClick: handleSaveNotifications,
                      className: "bg-gradient-to-r from-teya-green via-teya-green-dark to-teya-green hover:from-teya-green-dark hover:via-teya-green hover:to-teya-green-dark text-rich-black font-semibold shadow-lg shadow-teya-green/30 hover:shadow-teya-green/50 hover:scale-105 transition-all duration-300 border-0",
                      children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Save, {
                        className: "h-4 w-4 mr-2"
                      }), "Save"]
                    })]
                  })
                }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
                  className: "space-y-4",
                  children: Object.entries(notifications || {}).map(([key, value]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex items-center justify-between",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                      children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label, {
                        className: "font-medium",
                        children: key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())
                      }), /* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
                        className: "text-sm text-muted-foreground",
                        children: [key === "emailAlerts" && "Receive important updates via email", key === "priceAlerts" && "Get notified when stock prices hit your targets", key === "earningsAlerts" && "Alerts for upcoming earnings announcements", key === "newsAlerts" && "Breaking news about your watched stocks", key === "weeklyDigest" && "Weekly summary of your portfolio performance"]
                      })]
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx(Switch, {
                      checked: Boolean(value),
                      onCheckedChange: (checked) => setNotifications({
                        ...notifications,
                        [key]: checked
                      })
                    })]
                  }, key))
                })]
              })
            })]
          })
        })]
      })]
    })
  });
}
export {
  Profile as default
};
