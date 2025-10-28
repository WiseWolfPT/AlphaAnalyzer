import { e as createLucideIcon, u as useLocation, G as useToast, r as reactExports, j as jsxRuntimeExports, B as Button, m as motion, C as Card, c as CardContent, a as CardHeader, b as CardTitle, f as cn, L as Label } from "./index-DF734YkB.js";
import { M as MainLayout, h as CircleHelp } from "./main-layout-iPfLAwEH.js";
import { I as Input } from "./input-vX2xFcRS.js";
import { T as Textarea } from "./textarea-FymLzJLr.js";
import { B as Badge } from "./badge-Bax4ZZX3.js";
import { T as Tabs, a as TabsList, b as TabsTrigger, c as TabsContent } from "./tabs-CPUG2mtF.js";
import { C as Collapsible, a as CollapsibleTrigger, b as CollapsibleContent, M as MessageCircle } from "./collapsible-eiNFQU8O.js";
import { S as Search } from "./search-CySG90ju.js";
import { F as FileText } from "./file-text-BCjG82i7.js";
import { U as Users } from "./users-DgdKh9Ro.js";
import { L as Lightbulb } from "./lightbulb-BUqvVsu9.js";
import { A as ArrowRight } from "./arrow-right-B8plmmKU.js";
import { C as ChevronDown } from "./chevron-down-BYhiF8im.js";
import { M as Mail } from "./mail-D5HopcQP.js";
import { C as Clock } from "./clock-CEwJtTm9.js";
import { E as ExternalLink } from "./external-link-BNxepo82.js";
import "./dialog-B0u0SV5P.js";
import "./index-DXvlFXpR.js";
import "./use-auth-monitoring-Ca9Wv08z.js";
import "./lock-C5qTkNPd.js";
import "./eye-DQw-lb5A.js";
import "./user-C46AQImy.js";
import "./menu-CG6pfADK.js";
import "./chart-column-DNzw3S_G.js";
import "./log-in-CA1V17qY.js";
import "./select-Bm8Ccf9j.js";
import "./index-IXOTxK3N.js";
import "./index-Dx7UitrF.js";
import "./scroll-area-BRs9U-pP.js";
import "./index-B4jJMzO_.js";
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Book = createLucideIcon("Book", [
  [
    "path",
    {
      d: "M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20",
      key: "k3hazp"
    }
  ]
]);
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const CirclePlay = createLucideIcon("CirclePlay", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["polygon", { points: "10 8 16 12 10 16 10 8", key: "1cimsy" }]
]);
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Video = createLucideIcon("Video", [
  [
    "path",
    {
      d: "m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5",
      key: "ftymec"
    }
  ],
  ["rect", { x: "2", y: "6", width: "14", height: "12", rx: "2", key: "158x01" }]
]);
function Help() {
  const [, setLocation] = useLocation();
  const {
    toast
  } = useToast();
  const [searchQuery, setSearchQuery] = reactExports.useState("");
  const [openFAQ, setOpenFAQ] = reactExports.useState(null);
  const [contactForm, setContactForm] = reactExports.useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });
  const handleSearch = (e) => {
    e.preventDefault();
    toast({
      title: "Search",
      description: `Searching for: "${searchQuery}"`
    });
  };
  const handleContactSubmit = (e) => {
    e.preventDefault();
    toast({
      title: "Message Sent",
      description: "Thank you for contacting us. We'll get back to you within 24 hours."
    });
    setContactForm({
      name: "",
      email: "",
      subject: "",
      message: ""
    });
  };
  const quickLinks = [{
    title: "Getting Started Guide",
    description: "Learn the basics of using Alfalyzer",
    icon: Book,
    href: "#getting-started",
    category: "Beginner"
  }, {
    title: "Video Tutorials",
    description: "Watch step-by-step tutorials",
    icon: Video,
    href: "#tutorials",
    category: "Learning"
  }, {
    title: "API Documentation",
    description: "Technical documentation for developers",
    icon: FileText,
    href: "#api-docs",
    category: "Advanced"
  }, {
    title: "Community Forum",
    description: "Connect with other users",
    icon: Users,
    href: "#community",
    category: "Community"
  }];
  const faqItems = [{
    question: "How do I calculate intrinsic value?",
    answer: "Alfalyzer automatically calculates intrinsic value using multiple methods including DCF (Discounted Cash Flow), P/E ratios, and proprietary algorithms. You can view the intrinsic value on any stock detail page or use our dedicated Intrinsic Value calculator.",
    category: "Analysis"
  }, {
    question: "What data sources does Alfalyzer use?",
    answer: "We use multiple premium data sources including Alpha Vantage, Finnhub, Financial Modeling Prep, and Twelve Data to ensure accuracy and reliability. We also have fallback systems to maintain service availability.",
    category: "Data"
  }, {
    question: "How often is the data updated?",
    answer: "Stock prices are updated in real-time during market hours. Fundamental data is updated quarterly after earnings releases. Our system automatically refreshes data based on market conditions.",
    category: "Data"
  }, {
    question: "Can I export my watchlists and portfolios?",
    answer: "Yes! You can export your data in CSV format from the Settings page. This includes all your watchlists, portfolios, and historical data for your records.",
    category: "Account"
  }, {
    question: "How do I set up price alerts?",
    answer: "Price alerts can be set up from any stock detail page. Click the 'Alert' button, set your target price, and choose your notification preferences. You'll receive notifications via email or in-app.",
    category: "Features"
  }, {
    question: "What's the difference between Free and Pro plans?",
    answer: "Pro users get unlimited API calls, advanced charts, portfolio analytics, real-time alerts, and priority support. Free users have limited API calls and basic features.",
    category: "Subscription"
  }, {
    question: "How do I cancel my subscription?",
    answer: "You can cancel your subscription anytime from the Billing section in Settings. Your access will continue until the end of your current billing period.",
    category: "Subscription"
  }, {
    question: "Is my financial data secure?",
    answer: "Yes, we use bank-level SSL encryption and never store sensitive financial information like passwords or banking details. All data is encrypted both in transit and at rest.",
    category: "Security"
  }];
  const tutorials = [{
    title: "Setting Up Your First Watchlist",
    duration: "5 min",
    level: "Beginner",
    thumbnail: "/api/placeholder/300/200"
  }, {
    title: "Understanding Intrinsic Value",
    duration: "8 min",
    level: "Intermediate",
    thumbnail: "/api/placeholder/300/200"
  }, {
    title: "Advanced Portfolio Analytics",
    duration: "12 min",
    level: "Advanced",
    thumbnail: "/api/placeholder/300/200"
  }, {
    title: "Reading Earnings Reports",
    duration: "6 min",
    level: "Intermediate",
    thumbnail: "/api/placeholder/300/200"
  }];
  const filteredFAQs = faqItems.filter((item) => item.question.toLowerCase().includes(searchQuery.toLowerCase()) || item.answer.toLowerCase().includes(searchQuery.toLowerCase()));
  return /* @__PURE__ */ jsxRuntimeExports.jsx(MainLayout, {
    children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
      className: "container mx-auto px-6 py-8 max-w-6xl",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "text-center mb-8",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
          className: "flex items-center justify-center gap-3 mb-4",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "p-3 bg-primary/10 rounded-xl",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(CircleHelp, {
              className: "h-8 w-8 text-primary"
            })
          })
        }), /* @__PURE__ */ jsxRuntimeExports.jsx("h1", {
          className: "text-4xl font-bold text-foreground mb-2",
          children: "Help Center"
        }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
          className: "text-xl text-muted-foreground max-w-2xl mx-auto",
          children: "Find answers, learn new features, and get the most out of Alfalyzer"
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
        className: "max-w-2xl mx-auto mb-8",
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs("form", {
          onSubmit: handleSearch,
          className: "relative",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Search, {
            className: "absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(Input, {
            type: "text",
            placeholder: "Search for help articles, tutorials, or FAQ...",
            value: searchQuery,
            onChange: (e) => setSearchQuery(e.target.value),
            className: "pl-10 pr-4 py-3 text-lg"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
            type: "submit",
            className: "absolute right-1 top-1/2 transform -translate-y-1/2",
            children: "Search"
          })]
        })
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Tabs, {
        defaultValue: "getting-started",
        className: "w-full",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(TabsList, {
          className: "mb-8 grid w-full grid-cols-4",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, {
            value: "getting-started",
            children: "Getting Started"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, {
            value: "faq",
            children: "FAQ"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, {
            value: "tutorials",
            children: "Tutorials"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, {
            value: "contact",
            children: "Contact"
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsContent, {
          value: "getting-started",
          className: "space-y-8",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4",
            children: quickLinks.map((link, index) => /* @__PURE__ */ jsxRuntimeExports.jsx(motion.div, {
              initial: {
                opacity: 0,
                y: 20
              },
              animate: {
                opacity: 1,
                y: 0
              },
              transition: {
                delay: index * 0.1
              },
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(Card, {
                className: "hover:shadow-lg transition-all duration-300 cursor-pointer group",
                children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
                  className: "p-6 text-center",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                    className: "w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors",
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx(link.icon, {
                      className: "h-6 w-6 text-primary"
                    })
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx("h3", {
                    className: "font-semibold mb-2 group-hover:text-primary transition-colors",
                    children: link.title
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                    className: "text-sm text-muted-foreground mb-3",
                    children: link.description
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, {
                    variant: "secondary",
                    className: "text-xs",
                    children: link.category
                  })]
                })
              })
            }, index))
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
              children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, {
                className: "flex items-center gap-2",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Lightbulb, {
                  className: "h-5 w-5"
                }), "Quick Start Guide"]
              })
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
              children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                className: "space-y-6",
                children: [{
                  step: 1,
                  title: "Create Your Account",
                  description: "Sign up for your free trial and complete your profile setup.",
                  action: "Go to Registration",
                  href: "/register"
                }, {
                  step: 2,
                  title: "Add Your First Stocks",
                  description: "Use the search feature to add stocks to your watchlist.",
                  action: "Go to Dashboard",
                  href: "/dashboard"
                }, {
                  step: 3,
                  title: "Explore Stock Analysis",
                  description: "Click on any stock to view detailed analysis and charts.",
                  action: "View Example",
                  href: "/stock/AAPL"
                }, {
                  step: 4,
                  title: "Set Up Alerts",
                  description: "Create price alerts to stay informed about your investments.",
                  action: "Learn More",
                  href: "#alerts"
                }].map((guide) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "flex items-start gap-4 p-4 border rounded-lg",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                    className: "w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm",
                    children: guide.step
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex-1",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h4", {
                      className: "font-medium mb-1",
                      children: guide.title
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                      className: "text-sm text-muted-foreground mb-3",
                      children: guide.description
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
                      variant: "outline",
                      size: "sm",
                      onClick: () => setLocation(guide.href),
                      children: [guide.action, /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, {
                        className: "h-4 w-4 ml-2"
                      })]
                    })]
                  })]
                }, guide.step))
              })
            })]
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, {
          value: "faq",
          className: "space-y-6",
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "grid grid-cols-1 lg:grid-cols-4 gap-6",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
              className: "lg:col-span-1",
              children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, {
                    className: "text-sm",
                    children: "Categories"
                  })
                }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
                  className: "space-y-2",
                  children: ["All", "Analysis", "Data", "Features", "Account", "Subscription", "Security"].map((category) => /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
                    variant: "ghost",
                    size: "sm",
                    className: "w-full justify-start",
                    children: category
                  }, category))
                })]
              })
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
              className: "lg:col-span-3 space-y-4",
              children: filteredFAQs.map((faq, index) => /* @__PURE__ */ jsxRuntimeExports.jsx(Card, {
                children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Collapsible, {
                  open: openFAQ === index,
                  onOpenChange: (isOpen) => setOpenFAQ(isOpen ? index : null),
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CollapsibleTrigger, {
                    className: "w-full",
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
                      className: "hover:bg-muted/50 transition-colors",
                      children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                        className: "flex items-center justify-between",
                        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                          className: "flex items-center gap-3",
                          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Badge, {
                            variant: "outline",
                            className: "text-xs",
                            children: faq.category
                          }), /* @__PURE__ */ jsxRuntimeExports.jsx("h3", {
                            className: "font-medium text-left",
                            children: faq.question
                          })]
                        }), /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, {
                          className: cn("h-5 w-5 text-muted-foreground transition-transform", openFAQ === index ? "rotate-180" : "")
                        })]
                      })
                    })
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx(CollapsibleContent, {
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
                      className: "pt-0",
                      children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                        className: "border-l-2 border-primary/30 pl-4",
                        children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                          className: "text-muted-foreground leading-relaxed",
                          children: faq.answer
                        })
                      })
                    })
                  })]
                })
              }, index))
            })]
          })
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsContent, {
          value: "tutorials",
          className: "space-y-6",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6",
            children: tutorials.map((tutorial, index) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
              className: "hover:shadow-lg transition-all duration-300 cursor-pointer group",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "relative",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                  className: "aspect-video bg-muted rounded-t-lg flex items-center justify-center",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(CirclePlay, {
                    className: "h-12 w-12 text-muted-foreground group-hover:text-primary transition-colors"
                  })
                }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                  className: "absolute top-2 right-2",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, {
                    variant: "secondary",
                    className: "text-xs",
                    children: tutorial.duration
                  })
                })]
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
                className: "p-4",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                  className: "flex items-center gap-2 mb-2",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, {
                    variant: "outline",
                    className: "text-xs",
                    children: tutorial.level
                  })
                }), /* @__PURE__ */ jsxRuntimeExports.jsx("h3", {
                  className: "font-semibold mb-2 group-hover:text-primary transition-colors",
                  children: tutorial.title
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
                  variant: "outline",
                  size: "sm",
                  className: "w-full",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CirclePlay, {
                    className: "h-4 w-4 mr-2"
                  }), "Watch Tutorial"]
                })]
              })]
            }, index))
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, {
                children: "Request a Tutorial"
              })
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                className: "text-muted-foreground mb-4",
                children: "Don't see what you're looking for? Let us know what tutorial you'd like to see next."
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
                variant: "outline",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(MessageCircle, {
                  className: "h-4 w-4 mr-2"
                }), "Suggest a Tutorial"]
              })]
            })]
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, {
          value: "contact",
          className: "space-y-6",
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "grid grid-cols-1 lg:grid-cols-2 gap-6",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
                children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, {
                  className: "flex items-center gap-2",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Mail, {
                    className: "h-5 w-5"
                  }), "Send us a Message"]
                })
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
                children: /* @__PURE__ */ jsxRuntimeExports.jsxs("form", {
                  onSubmit: handleContactSubmit,
                  className: "space-y-4",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "grid grid-cols-2 gap-4",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                      className: "space-y-2",
                      children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label, {
                        htmlFor: "name",
                        children: "Name"
                      }), /* @__PURE__ */ jsxRuntimeExports.jsx(Input, {
                        id: "name",
                        value: contactForm.name,
                        onChange: (e) => setContactForm((prev) => ({
                          ...prev,
                          name: e.target.value
                        })),
                        required: true
                      })]
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                      className: "space-y-2",
                      children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label, {
                        htmlFor: "email",
                        children: "Email"
                      }), /* @__PURE__ */ jsxRuntimeExports.jsx(Input, {
                        id: "email",
                        type: "email",
                        value: contactForm.email,
                        onChange: (e) => setContactForm((prev) => ({
                          ...prev,
                          email: e.target.value
                        })),
                        required: true
                      })]
                    })]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "space-y-2",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label, {
                      htmlFor: "subject",
                      children: "Subject"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx(Input, {
                      id: "subject",
                      value: contactForm.subject,
                      onChange: (e) => setContactForm((prev) => ({
                        ...prev,
                        subject: e.target.value
                      })),
                      required: true
                    })]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "space-y-2",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label, {
                      htmlFor: "message",
                      children: "Message"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx(Textarea, {
                      id: "message",
                      rows: 5,
                      value: contactForm.message,
                      onChange: (e) => setContactForm((prev) => ({
                        ...prev,
                        message: e.target.value
                      })),
                      required: true
                    })]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
                    type: "submit",
                    className: "w-full",
                    children: "Send Message"
                  })]
                })
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "space-y-6",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, {
                    children: "Other Ways to Reach Us"
                  })
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
                  className: "space-y-4",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex items-center gap-3 p-3 border rounded-lg",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Mail, {
                      className: "h-5 w-5 text-primary"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                      children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                        className: "font-medium",
                        children: "Email Support"
                      }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                        className: "text-sm text-muted-foreground",
                        children: "support@alfalyzer.com"
                      })]
                    })]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex items-center gap-3 p-3 border rounded-lg",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Clock, {
                      className: "h-5 w-5 text-primary"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                      children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                        className: "font-medium",
                        children: "Response Time"
                      }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                        className: "text-sm text-muted-foreground",
                        children: "Usually within 24 hours"
                      })]
                    })]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex items-center gap-3 p-3 border rounded-lg",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Users, {
                      className: "h-5 w-5 text-primary"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                      children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                        className: "font-medium",
                        children: "Community Forum"
                      }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                        className: "text-sm text-muted-foreground",
                        children: "Get help from other users"
                      })]
                    })]
                  })]
                })]
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, {
                    children: "Status & Updates"
                  })
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex items-center gap-2 mb-3",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                      className: "w-3 h-3 bg-green-500 rounded-full"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "text-sm font-medium",
                      children: "All systems operational"
                    })]
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
                    variant: "outline",
                    size: "sm",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, {
                      className: "h-4 w-4 mr-2"
                    }), "View Status Page"]
                  })]
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
  Help as default
};
