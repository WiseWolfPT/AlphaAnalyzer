import { e as createLucideIcon, r as reactExports, ax as getI18n, ay as getDefaults, j as jsxRuntimeExports, L as Label$1, B as Button, o as Alert, v as CircleAlert, p as AlertDescription, u as useLocation, h as useSupabaseAuth, X, f as cn, a1 as createContextScope, $ as createCollection, a7 as createPopperScope, ao as useCallbackRef, a8 as Root2$1, a9 as Anchor, aa as Presence, aq as Portal$1, a3 as Primitive, a4 as useComposedRefs, a5 as composeEventHandlers, ar as hideOthers, az as dispatchDiscreteCustomEvent, au as useFocusGuards, as as ReactRemoveScroll, at as createSlot, av as FocusScope, ab as DismissableLayer, ac as Content, ad as Arrow, aA as composeRefs, a0 as useControllableState, a2 as useId, G as useToast, C as Card, c as CardContent, M as Info, n as TrendingUp, i as useTheme, aB as useCurrency } from "./index-DF734YkB.js";
import { D as Dialog, b as DialogContent, c as DialogHeader, d as DialogTitle, a as DialogTrigger } from "./dialog-B0u0SV5P.js";
import { I as Input } from "./input-vX2xFcRS.js";
import { T as Tabs, a as TabsList, b as TabsTrigger, c as TabsContent, C as Calendar, d as createRovingFocusGroupScope, I as Item, R as Root } from "./tabs-CPUG2mtF.js";
import { u as useAuthMonitoring, E as EyeOff, S as Separator$1 } from "./use-auth-monitoring-Ca9Wv08z.js";
import { M as Mail } from "./mail-D5HopcQP.js";
import { L as Lock } from "./lock-C5qTkNPd.js";
import { E as Eye } from "./eye-DQw-lb5A.js";
import { U as User, C as Crown, M as Moon, S as Sun } from "./user-C46AQImy.js";
import { M as Menu$1, L as LogOut } from "./menu-CG6pfADK.js";
import { C as ChartColumn, a as Calculator } from "./chart-column-DNzw3S_G.js";
import { S as Search } from "./search-CySG90ju.js";
import { F as FileText } from "./file-text-BCjG82i7.js";
import { L as LogIn } from "./log-in-CA1V17qY.js";
import { C as Check, S as Select, a as SelectTrigger, b as SelectValue, c as SelectContent, d as SelectItem } from "./select-Bm8Ccf9j.js";
import { u as useDirection } from "./index-Dx7UitrF.js";
import { B as Badge } from "./badge-Bax4ZZX3.js";
import { S as ScrollArea } from "./scroll-area-BRs9U-pP.js";
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const BellOff = createLucideIcon("BellOff", [
  ["path", { d: "M8.7 3A6 6 0 0 1 18 8a21.3 21.3 0 0 0 .6 5", key: "o7mx20" }],
  ["path", { d: "M17 17H3s3-2 3-9a4.67 4.67 0 0 1 .3-1.7", key: "16f1lm" }],
  ["path", { d: "M10.3 21a1.94 1.94 0 0 0 3.4 0", key: "qgo35s" }],
  ["path", { d: "m2 2 20 20", key: "1ooewy" }]
]);
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Bell = createLucideIcon("Bell", [
  ["path", { d: "M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9", key: "1qo2s2" }],
  ["path", { d: "M10.3 21a1.94 1.94 0 0 0 3.4 0", key: "qgo35s" }]
]);
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Briefcase = createLucideIcon("Briefcase", [
  ["path", { d: "M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16", key: "jecpp" }],
  ["rect", { width: "20", height: "14", x: "2", y: "6", rx: "2", key: "i6l2r4" }]
]);
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const ChartPie = createLucideIcon("ChartPie", [
  [
    "path",
    {
      d: "M21 12c.552 0 1.005-.449.95-.998a10 10 0 0 0-8.953-8.951c-.55-.055-.998.398-.998.95v8a1 1 0 0 0 1 1z",
      key: "pzmjnu"
    }
  ],
  ["path", { d: "M21.21 15.89A10 10 0 1 1 8 2.83", key: "k2fpak" }]
]);
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const ChevronLeft = createLucideIcon("ChevronLeft", [
  ["path", { d: "m15 18-6-6 6-6", key: "1wnfg3" }]
]);
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const ChevronRight = createLucideIcon("ChevronRight", [
  ["path", { d: "m9 18 6-6-6-6", key: "mthhwq" }]
]);
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const CircleHelp = createLucideIcon("CircleHelp", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3", key: "1u773s" }],
  ["path", { d: "M12 17h.01", key: "p32p05" }]
]);
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const CircleUser = createLucideIcon("CircleUser", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["circle", { cx: "12", cy: "10", r: "3", key: "ilqhr7" }],
  ["path", { d: "M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662", key: "154egf" }]
]);
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Circle = createLucideIcon("Circle", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }]
]);
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Heart = createLucideIcon("Heart", [
  [
    "path",
    {
      d: "M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z",
      key: "c3ymky"
    }
  ]
]);
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Volume2 = createLucideIcon("Volume2", [
  [
    "path",
    {
      d: "M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z",
      key: "uqj9uw"
    }
  ],
  ["path", { d: "M16 9a5 5 0 0 1 0 6", key: "1q6k2b" }],
  ["path", { d: "M19.364 18.364a9 9 0 0 0 0-12.728", key: "ijwkga" }]
]);
const warn = (i18n, code, msg, rest) => {
  const args = [msg, {
    code,
    ...rest || {}
  }];
  if (i18n?.services?.logger?.forward) {
    return i18n.services.logger.forward(args, "warn", "react-i18next::", true);
  }
  if (isString(args[0])) args[0] = `react-i18next:: ${args[0]}`;
  if (i18n?.services?.logger?.warn) {
    i18n.services.logger.warn(...args);
  } else if (console?.warn) {
    console.warn(...args);
  }
};
const alreadyWarned = {};
const warnOnce = (i18n, code, msg, rest) => {
  if (isString(msg) && alreadyWarned[msg]) return;
  if (isString(msg)) alreadyWarned[msg] = /* @__PURE__ */ new Date();
  warn(i18n, code, msg, rest);
};
const loadedClb = (i18n, cb) => () => {
  if (i18n.isInitialized) {
    cb();
  } else {
    const initialized = () => {
      setTimeout(() => {
        i18n.off("initialized", initialized);
      }, 0);
      cb();
    };
    i18n.on("initialized", initialized);
  }
};
const loadNamespaces = (i18n, ns, cb) => {
  i18n.loadNamespaces(ns, loadedClb(i18n, cb));
};
const loadLanguages = (i18n, lng, ns, cb) => {
  if (isString(ns)) ns = [ns];
  if (i18n.options.preload && i18n.options.preload.indexOf(lng) > -1) return loadNamespaces(i18n, ns, cb);
  ns.forEach((n) => {
    if (i18n.options.ns.indexOf(n) < 0) i18n.options.ns.push(n);
  });
  i18n.loadLanguages(lng, loadedClb(i18n, cb));
};
const hasLoadedNamespace = (ns, i18n, options = {}) => {
  if (!i18n.languages || !i18n.languages.length) {
    warnOnce(i18n, "NO_LANGUAGES", "i18n.languages were undefined or empty", {
      languages: i18n.languages
    });
    return true;
  }
  return i18n.hasLoadedNamespace(ns, {
    lng: options.lng,
    precheck: (i18nInstance, loadNotPending) => {
      if (options.bindI18n?.indexOf("languageChanging") > -1 && i18nInstance.services.backendConnector.backend && i18nInstance.isLanguageChangingTo && !loadNotPending(i18nInstance.isLanguageChangingTo, ns)) return false;
    }
  });
};
const isString = (obj) => typeof obj === "string";
const isObject = (obj) => typeof obj === "object" && obj !== null;
const I18nContext = reactExports.createContext();
class ReportNamespaces {
  constructor() {
    this.usedNamespaces = {};
  }
  addUsedNamespaces(namespaces) {
    namespaces.forEach((ns) => {
      if (!this.usedNamespaces[ns]) this.usedNamespaces[ns] = true;
    });
  }
  getUsedNamespaces() {
    return Object.keys(this.usedNamespaces);
  }
}
const usePrevious = (value, ignore) => {
  const ref = reactExports.useRef();
  reactExports.useEffect(() => {
    ref.current = value;
  }, [value, ignore]);
  return ref.current;
};
const alwaysNewT = (i18n, language, namespace, keyPrefix) => i18n.getFixedT(language, namespace, keyPrefix);
const useMemoizedT = (i18n, language, namespace, keyPrefix) => reactExports.useCallback(alwaysNewT(i18n, language, namespace, keyPrefix), [i18n, language, namespace, keyPrefix]);
const useTranslation = (ns, props = {}) => {
  const {
    i18n: i18nFromProps
  } = props;
  const {
    i18n: i18nFromContext,
    defaultNS: defaultNSFromContext
  } = reactExports.useContext(I18nContext) || {};
  const i18n = i18nFromProps || i18nFromContext || getI18n();
  if (i18n && !i18n.reportNamespaces) i18n.reportNamespaces = new ReportNamespaces();
  if (!i18n) {
    warnOnce(i18n, "NO_I18NEXT_INSTANCE", "useTranslation: You will need to pass in an i18next instance by using initReactI18next");
    const notReadyT = (k, optsOrDefaultValue) => {
      if (isString(optsOrDefaultValue)) return optsOrDefaultValue;
      if (isObject(optsOrDefaultValue) && isString(optsOrDefaultValue.defaultValue)) return optsOrDefaultValue.defaultValue;
      return Array.isArray(k) ? k[k.length - 1] : k;
    };
    const retNotReady = [notReadyT, {}, false];
    retNotReady.t = notReadyT;
    retNotReady.i18n = {};
    retNotReady.ready = false;
    return retNotReady;
  }
  if (i18n.options.react?.wait) warnOnce(i18n, "DEPRECATED_OPTION", "useTranslation: It seems you are still using the old wait option, you may migrate to the new useSuspense behaviour.");
  const i18nOptions = {
    ...getDefaults(),
    ...i18n.options.react,
    ...props
  };
  const {
    useSuspense,
    keyPrefix
  } = i18nOptions;
  let namespaces = ns || defaultNSFromContext || i18n.options?.defaultNS;
  namespaces = isString(namespaces) ? [namespaces] : namespaces || ["translation"];
  i18n.reportNamespaces.addUsedNamespaces?.(namespaces);
  const ready = (i18n.isInitialized || i18n.initializedStoreOnce) && namespaces.every((n) => hasLoadedNamespace(n, i18n, i18nOptions));
  const memoGetT = useMemoizedT(i18n, props.lng || null, i18nOptions.nsMode === "fallback" ? namespaces : namespaces[0], keyPrefix);
  const getT = () => memoGetT;
  const getNewT = () => alwaysNewT(i18n, props.lng || null, i18nOptions.nsMode === "fallback" ? namespaces : namespaces[0], keyPrefix);
  const [t, setT] = reactExports.useState(getT);
  let joinedNS = namespaces.join();
  if (props.lng) joinedNS = `${props.lng}${joinedNS}`;
  const previousJoinedNS = usePrevious(joinedNS);
  const isMounted = reactExports.useRef(true);
  reactExports.useEffect(() => {
    const {
      bindI18n,
      bindI18nStore
    } = i18nOptions;
    isMounted.current = true;
    if (!ready && !useSuspense) {
      if (props.lng) {
        loadLanguages(i18n, props.lng, namespaces, () => {
          if (isMounted.current) setT(getNewT);
        });
      } else {
        loadNamespaces(i18n, namespaces, () => {
          if (isMounted.current) setT(getNewT);
        });
      }
    }
    if (ready && previousJoinedNS && previousJoinedNS !== joinedNS && isMounted.current) {
      setT(getNewT);
    }
    const boundReset = () => {
      if (isMounted.current) setT(getNewT);
    };
    if (bindI18n) i18n?.on(bindI18n, boundReset);
    if (bindI18nStore) i18n?.store.on(bindI18nStore, boundReset);
    return () => {
      isMounted.current = false;
      if (i18n) bindI18n?.split(" ").forEach((e) => i18n.off(e, boundReset));
      if (bindI18nStore && i18n) bindI18nStore.split(" ").forEach((e) => i18n.store.off(e, boundReset));
    };
  }, [i18n, joinedNS]);
  reactExports.useEffect(() => {
    if (isMounted.current && ready) {
      setT(getT);
    }
  }, [i18n, keyPrefix, ready]);
  const ret = [t, i18n, ready];
  ret.t = t;
  ret.i18n = i18n;
  ret.ready = ready;
  if (ready) return ret;
  if (!ready && !useSuspense) return ret;
  throw new Promise((resolve) => {
    if (props.lng) {
      loadLanguages(i18n, props.lng, namespaces, () => resolve());
    } else {
      loadNamespaces(i18n, namespaces, () => resolve());
    }
  });
};
function AuthModal({
  isOpen,
  onClose,
  defaultTab = "login"
}) {
  const [activeTab, setActiveTab] = reactExports.useState(defaultTab);
  const [showPassword, setShowPassword] = reactExports.useState(false);
  const [loading, setLoading] = reactExports.useState(false);
  const [error, setError] = reactExports.useState(null);
  const [success, setSuccess] = reactExports.useState(null);
  const [email, setEmail] = reactExports.useState("");
  const [password, setPassword] = reactExports.useState("");
  const [confirmPassword, setConfirmPassword] = reactExports.useState("");
  const [fullName, setFullName] = reactExports.useState("");
  const {
    signIn,
    signUp,
    signInWithGoogle,
    resetPassword
  } = useAuthMonitoring();
  const resetForm = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setFullName("");
    setError(null);
    setSuccess(null);
    setShowPassword(false);
  };
  const handleClose = () => {
    resetForm();
    onClose();
  };
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await signIn(email, password);
      if (result.error) {
        setError(result.error.message || "Erro no login");
      } else {
        handleClose();
      }
    } catch (err) {
      setError("Ocorreu um erro inesperado");
    } finally {
      setLoading(false);
    }
  };
  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    if (password !== confirmPassword) {
      setError("As palavras-passe não coincidem");
      setLoading(false);
      return;
    }
    if (password.length < 6) {
      setError("A palavra-passe deve ter pelo menos 6 caracteres");
      setLoading(false);
      return;
    }
    try {
      const result = await signUp(email, password, {
        name: fullName
      });
      if (result.error) {
        setError(result.error.message || "Erro no registo");
      } else {
        setSuccess("Verifique o seu email para confirmar a conta!");
        setTimeout(() => {
          handleClose();
        }, 2e3);
      }
    } catch (err) {
      setError("Ocorreu um erro inesperado");
    } finally {
      setLoading(false);
    }
  };
  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithGoogle();
      if (result.error) {
        setError(result.error.message || "Erro no login com Google");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };
  const handleForgotPassword = async () => {
    if (!email) {
      setError("Please enter your email address first");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const {
        error: error2
      } = await resetPassword(email);
      if (error2) {
        setError(error2.message || "Erro ao solicitar reset");
      } else {
        setSuccess("Password reset email sent! Check your inbox.");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, {
    open: isOpen,
    onOpenChange: handleClose,
    children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, {
      className: "sm:max-w-md",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsx(DialogHeader, {
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, {
          className: "text-center",
          children: "Bem-vindo ao Alfalyzer"
        })
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Tabs, {
        value: activeTab,
        onValueChange: (value) => setActiveTab(value),
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(TabsList, {
          className: "grid w-full grid-cols-2",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, {
            value: "login",
            children: "Login"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, {
            value: "signup",
            children: "Sign Up"
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsContent, {
          value: "login",
          className: "space-y-4",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("form", {
            onSubmit: handleLogin,
            className: "space-y-4",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "space-y-2",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label$1, {
                htmlFor: "login-email",
                children: "Email"
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "relative",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Mail, {
                  className: "absolute left-3 top-3 h-4 w-4 text-muted-foreground"
                }), /* @__PURE__ */ jsxRuntimeExports.jsx(Input, {
                  id: "login-email",
                  type: "email",
                  placeholder: "your@email.com",
                  value: email,
                  onChange: (e) => setEmail(e.target.value),
                  className: "pl-10",
                  required: true
                })]
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "space-y-2",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label$1, {
                htmlFor: "login-password",
                children: "Password"
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "relative",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Lock, {
                  className: "absolute left-3 top-3 h-4 w-4 text-muted-foreground"
                }), /* @__PURE__ */ jsxRuntimeExports.jsx(Input, {
                  id: "login-password",
                  type: showPassword ? "text" : "password",
                  placeholder: "••••••••",
                  value: password,
                  onChange: (e) => setPassword(e.target.value),
                  className: "pl-10 pr-10",
                  required: true
                }), /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
                  type: "button",
                  variant: "ghost",
                  size: "sm",
                  className: "absolute right-0 top-0 h-full px-3 hover:bg-transparent",
                  onClick: () => setShowPassword(!showPassword),
                  children: showPassword ? /* @__PURE__ */ jsxRuntimeExports.jsx(EyeOff, {
                    className: "h-4 w-4 text-muted-foreground"
                  }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, {
                    className: "h-4 w-4 text-muted-foreground"
                  })
                })]
              })]
            }), error && /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, {
              variant: "destructive",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, {
                className: "h-4 w-4"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDescription, {
                children: error
              })]
            }), success && /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, {
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDescription, {
                children: success
              })
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
              type: "submit",
              className: "w-full bg-gradient-to-r from-teya-green via-teya-green-dark to-teya-green hover:from-teya-green-dark hover:via-teya-green hover:to-teya-green-dark text-rich-black font-semibold shadow-lg shadow-teya-green/30 hover:shadow-teya-green/50 hover:scale-105 transition-all duration-300 border-0",
              disabled: loading,
              children: loading ? "Signing in..." : "Sign In"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
              type: "button",
              variant: "link",
              className: "w-full text-sm",
              onClick: handleForgotPassword,
              disabled: loading,
              children: "Forgot your password?"
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "relative",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
              className: "absolute inset-0 flex items-center",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(Separator$1, {
                className: "w-full"
              })
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
              className: "relative flex justify-center text-xs uppercase",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                className: "bg-background px-2 text-muted-foreground",
                children: "Or continue with"
              })
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
            type: "button",
            variant: "outline",
            className: "w-full",
            onClick: handleGoogleLogin,
            disabled: loading,
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("svg", {
              className: "mr-2 h-4 w-4",
              viewBox: "0 0 24 24",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
                d: "M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z",
                fill: "#4285F4"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx("path", {
                d: "M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z",
                fill: "#34A853"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx("path", {
                d: "M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z",
                fill: "#FBBC05"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx("path", {
                d: "M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z",
                fill: "#EA4335"
              })]
            }), "Continue with Google"]
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsContent, {
          value: "signup",
          className: "space-y-4",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("form", {
            onSubmit: handleSignup,
            className: "space-y-4",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "space-y-2",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label$1, {
                htmlFor: "signup-name",
                children: "Full Name"
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "relative",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(User, {
                  className: "absolute left-3 top-3 h-4 w-4 text-muted-foreground"
                }), /* @__PURE__ */ jsxRuntimeExports.jsx(Input, {
                  id: "signup-name",
                  type: "text",
                  placeholder: "John Doe",
                  value: fullName,
                  onChange: (e) => setFullName(e.target.value),
                  className: "pl-10",
                  required: true
                })]
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "space-y-2",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label$1, {
                htmlFor: "signup-email",
                children: "Email"
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "relative",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Mail, {
                  className: "absolute left-3 top-3 h-4 w-4 text-muted-foreground"
                }), /* @__PURE__ */ jsxRuntimeExports.jsx(Input, {
                  id: "signup-email",
                  type: "email",
                  placeholder: "your@email.com",
                  value: email,
                  onChange: (e) => setEmail(e.target.value),
                  className: "pl-10",
                  required: true
                })]
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "space-y-2",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label$1, {
                htmlFor: "signup-password",
                children: "Password"
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "relative",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Lock, {
                  className: "absolute left-3 top-3 h-4 w-4 text-muted-foreground"
                }), /* @__PURE__ */ jsxRuntimeExports.jsx(Input, {
                  id: "signup-password",
                  type: showPassword ? "text" : "password",
                  placeholder: "••••••••",
                  value: password,
                  onChange: (e) => setPassword(e.target.value),
                  className: "pl-10 pr-10",
                  required: true
                }), /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
                  type: "button",
                  variant: "ghost",
                  size: "sm",
                  className: "absolute right-0 top-0 h-full px-3 hover:bg-transparent",
                  onClick: () => setShowPassword(!showPassword),
                  children: showPassword ? /* @__PURE__ */ jsxRuntimeExports.jsx(EyeOff, {
                    className: "h-4 w-4 text-muted-foreground"
                  }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, {
                    className: "h-4 w-4 text-muted-foreground"
                  })
                })]
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "space-y-2",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label$1, {
                htmlFor: "signup-confirm-password",
                children: "Confirm Password"
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "relative",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Lock, {
                  className: "absolute left-3 top-3 h-4 w-4 text-muted-foreground"
                }), /* @__PURE__ */ jsxRuntimeExports.jsx(Input, {
                  id: "signup-confirm-password",
                  type: showPassword ? "text" : "password",
                  placeholder: "••••••••",
                  value: confirmPassword,
                  onChange: (e) => setConfirmPassword(e.target.value),
                  className: "pl-10",
                  required: true
                })]
              })]
            }), error && /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, {
              variant: "destructive",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, {
                className: "h-4 w-4"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDescription, {
                children: error
              })]
            }), success && /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, {
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDescription, {
                children: success
              })
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
              type: "submit",
              className: "w-full bg-gradient-to-r from-teya-green via-teya-green-dark to-teya-green hover:from-teya-green-dark hover:via-teya-green hover:to-teya-green-dark text-rich-black font-semibold shadow-lg shadow-teya-green/30 hover:shadow-teya-green/50 hover:scale-105 transition-all duration-300 border-0",
              disabled: loading,
              children: loading ? "Creating account..." : "Create Account"
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
              className: "text-xs text-center text-muted-foreground",
              children: ["Ao criar uma conta, aceita os", " ", /* @__PURE__ */ jsxRuntimeExports.jsx("a", {
                href: "/terms-of-service",
                className: "underline hover:text-primary",
                children: "Termos e Condições"
              }), " ", "e a", " ", /* @__PURE__ */ jsxRuntimeExports.jsx("a", {
                href: "/privacy-policy",
                className: "underline hover:text-primary",
                children: "Política de Privacidade"
              })]
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "relative",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
              className: "absolute inset-0 flex items-center",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(Separator$1, {
                className: "w-full"
              })
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
              className: "relative flex justify-center text-xs uppercase",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                className: "bg-background px-2 text-muted-foreground",
                children: "Or continue with"
              })
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
            type: "button",
            variant: "outline",
            className: "w-full",
            onClick: handleGoogleLogin,
            disabled: loading,
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("svg", {
              className: "mr-2 h-4 w-4",
              viewBox: "0 0 24 24",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx("path", {
                d: "M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z",
                fill: "#4285F4"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx("path", {
                d: "M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z",
                fill: "#34A853"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx("path", {
                d: "M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z",
                fill: "#FBBC05"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx("path", {
                d: "M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z",
                fill: "#EA4335"
              })]
            }), "Continue with Google"]
          })]
        })]
      })]
    })
  });
}
const navigation = [{
  name: "Find Stocks",
  href: "/home",
  icon: Search
}, {
  name: "Intrinsic Value",
  href: "/intrinsic-value",
  icon: Calculator
}, {
  name: "My Portfolios",
  href: "/portfolios",
  icon: Briefcase
}, {
  name: "Watchlists",
  href: "/watchlists",
  icon: Heart
}, {
  name: "Transcripts",
  href: "/transcripts",
  icon: FileText
}, {
  name: "Earnings",
  href: "/earnings",
  icon: Calendar
}];
function CollapsibleSidebar() {
  const [location, navigate] = useLocation();
  const {
    user,
    userProfile
  } = useSupabaseAuth();
  const [showAuthModal, setShowAuthModal] = reactExports.useState(false);
  const [isCollapsed, setIsCollapsed] = reactExports.useState(false);
  const [isMobile, setIsMobile] = reactExports.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = reactExports.useState(false);
  const displayName = userProfile?.name || (typeof user?.user_metadata?.name === "string" ? user.user_metadata.name : void 0) || (user?.email ? user.email.split("@")[0] : null) || "User";
  const emailAddress = user?.email || "utilizador@alfalyzer.com";
  const activePlan = userProfile?.subscription_tier || "free";
  reactExports.useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };
    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);
    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);
  const toggleSidebar = () => {
    if (isMobile) {
      setIsMobileMenuOpen(!isMobileMenuOpen);
    } else {
      setIsCollapsed(!isCollapsed);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, {
    children: [isMobile && /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
      className: "fixed top-4 left-4 z-50 md:hidden",
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
        variant: "outline",
        onClick: toggleSidebar,
        className: "h-11 w-11 p-0 bg-background border-teya-green/20 hover:bg-teya-green/10",
        "aria-label": isMobileMenuOpen ? "Fechar menu lateral" : "Abrir menu lateral",
        "aria-expanded": isMobileMenuOpen,
        children: isMobileMenuOpen ? /* @__PURE__ */ jsxRuntimeExports.jsx(X, {
          className: "w-4 h-4",
          "aria-hidden": "true"
        }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Menu$1, {
          className: "w-4 h-4",
          "aria-hidden": "true"
        })
      })
    }), isMobile && isMobileMenuOpen && /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
      className: "fixed inset-0 bg-black/50 z-40 md:hidden",
      onClick: () => setIsMobileMenuOpen(false)
    }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
      className: cn("bg-sidebar-background border-r border-sidebar-border flex-shrink-0 sticky top-0 h-screen overflow-hidden transition-all duration-300 ease-out shadow-lg", isMobile ? isMobileMenuOpen ? "fixed left-0 top-0 z-50 w-72" : "hidden" : isCollapsed ? "w-16" : "w-64"),
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "flex h-full flex-col",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
          className: cn("border-b border-sidebar-border p-4 transition-all duration-300", isCollapsed && !isMobile ? "relative" : "flex items-center justify-between"),
          children: isCollapsed && !isMobile ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex flex-col items-center space-y-2",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
              className: "w-10 h-10 bg-gradient-to-br from-teya-green to-teya-green-dark rounded-xl flex items-center justify-center shadow-lg",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChartColumn, {
                className: "h-5 w-5 text-black"
              })
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
              variant: "ghost",
              size: "sm",
              onClick: toggleSidebar,
              className: "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-teya-green/10 transition-all duration-200 rounded-lg p-1 w-8 h-8 border border-transparent hover:border-teya-green/30",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, {
                className: "w-3 h-3"
              })
            })]
          }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "flex items-center gap-3",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                className: "w-10 h-10 bg-gradient-to-br from-teya-green to-teya-green-dark rounded-xl flex items-center justify-center shadow-lg",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChartColumn, {
                  className: "h-5 w-5 text-black"
                })
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "overflow-hidden",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h1", {
                  className: "font-bold text-lg text-sidebar-foreground truncate",
                  children: "Alfalyzer"
                }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                  className: "text-xs text-sidebar-foreground/60",
                  children: "Financial Analytics"
                })]
              })]
            }), !isMobile && /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
              variant: "ghost",
              size: "sm",
              onClick: toggleSidebar,
              className: "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-teya-green/10 transition-all duration-200 rounded-lg p-2 flex-shrink-0 border border-transparent hover:border-teya-green/30",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronLeft, {
                className: "w-4 h-4"
              })
            })]
          })
        }), /* @__PURE__ */ jsxRuntimeExports.jsx("nav", {
          className: "flex-1 overflow-y-auto p-3",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: cn("space-y-1", isCollapsed && !isMobile ? "space-y-2" : ""),
            children: navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href || item.href === "/find-stocks" && location === "/" || item.href === "/home" && location === "/find-stocks";
              return /* @__PURE__ */ jsxRuntimeExports.jsxs("button", {
                onClick: () => {
                  navigate(item.href);
                  if (isMobile) setIsMobileMenuOpen(false);
                },
                className: cn("w-full group relative transition-all duration-200 ease-out rounded-xl", isCollapsed && !isMobile ? "flex items-center justify-center p-3 h-12" : "flex items-center gap-3 px-4 py-3", isActive ? "bg-teya-green/15 text-teya-green shadow-lg shadow-teya-green/20 border border-teya-green/30" : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-teya-green/5 hover:shadow-md border border-transparent hover:border-teya-green/20"),
                title: isCollapsed && !isMobile ? item.name : void 0,
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Icon, {
                  className: cn("flex-shrink-0 transition-all duration-200", isCollapsed && !isMobile ? "w-5 h-5" : "w-5 h-5", isActive ? "text-teya-green" : "group-hover:scale-110")
                }), (!isCollapsed || isMobile) && /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                  className: "text-sm font-medium truncate transition-all duration-200",
                  children: item.name
                })]
              }, item.name);
            })
          })
        }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
          className: "border-t border-sidebar-border p-3",
          children: user ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "space-y-3",
            children: [(!isCollapsed || isMobile) && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "bg-gradient-to-r from-teya-green/10 to-teya-green/5 border border-teya-green/20 rounded-xl p-3",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("button", {
                onClick: () => {
                  navigate("/profile");
                  if (isMobile) setIsMobileMenuOpen(false);
                },
                className: "flex items-center gap-3 mb-2 w-full hover:bg-teya-green/5 rounded-lg p-2 -m-2 transition-colors duration-200 group",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                  className: "w-8 h-8 bg-teya-green/20 rounded-full flex items-center justify-center group-hover:bg-teya-green/30 transition-colors duration-200",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(User, {
                    className: "h-4 w-4 text-teya-green"
                  })
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "flex-1 min-w-0",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                    className: "font-medium text-sm text-sidebar-foreground truncate",
                    children: displayName
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                    className: "text-xs text-sidebar-foreground/60 truncate",
                    children: emailAddress
                  })]
                })]
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "flex items-center justify-between",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "flex items-center gap-2",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Crown, {
                    className: "h-3 w-3 text-amber-500"
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("span", {
                    className: "text-xs font-medium text-amber-600 dark:text-amber-400",
                    children: [activePlan.charAt(0).toUpperCase() + activePlan.slice(1), " Plan"]
                  })]
                }), (!userProfile?.subscription_tier || userProfile.subscription_tier === "free") && /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
                  size: "sm",
                  variant: "outline",
                  className: "h-6 px-2 text-xs border-teya-green/30 text-teya-green hover:bg-teya-green/10",
                  children: "Upgrade"
                })]
              })]
            }), isCollapsed && !isMobile && /* @__PURE__ */ jsxRuntimeExports.jsx("button", {
              onClick: () => navigate("/profile"),
              className: "flex justify-center mb-2 w-full hover:bg-teya-green/5 rounded-lg p-2 transition-colors duration-200 group",
              title: "Profile Settings",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                className: "w-8 h-8 bg-gradient-to-br from-teya-green/20 to-teya-green/10 rounded-full flex items-center justify-center group-hover:bg-teya-green/30 transition-colors duration-200",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(User, {
                  className: "w-4 h-4 text-teya-green"
                })
              })
            })]
          }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
            onClick: () => setShowAuthModal(true),
            className: cn("w-full bg-gradient-to-r from-teya-green to-teya-green-dark hover:from-teya-green-dark hover:to-teya-green text-black font-semibold shadow-lg hover:shadow-xl transition-all duration-200 rounded-lg", isCollapsed && !isMobile ? "px-2 py-3" : "py-3"),
            title: isCollapsed && !isMobile ? "Sign In" : void 0,
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(LogIn, {
              className: "w-4 h-4"
            }), (!isCollapsed || isMobile) && /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
              className: "ml-2",
              children: "Sign In"
            })]
          })
        })]
      })
    }), /* @__PURE__ */ jsxRuntimeExports.jsx(AuthModal, {
      isOpen: showAuthModal,
      onClose: () => setShowAuthModal(false)
    })]
  });
}
const MOBILE_BREAKPOINT = 768;
function useIsMobile() {
  const [isMobile, setIsMobile] = reactExports.useState(void 0);
  reactExports.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return !!isMobile;
}
var SELECTION_KEYS = ["Enter", " "];
var FIRST_KEYS = ["ArrowDown", "PageUp", "Home"];
var LAST_KEYS = ["ArrowUp", "PageDown", "End"];
var FIRST_LAST_KEYS = [...FIRST_KEYS, ...LAST_KEYS];
var SUB_OPEN_KEYS = {
  ltr: [...SELECTION_KEYS, "ArrowRight"],
  rtl: [...SELECTION_KEYS, "ArrowLeft"]
};
var SUB_CLOSE_KEYS = {
  ltr: ["ArrowLeft"],
  rtl: ["ArrowRight"]
};
var MENU_NAME = "Menu";
var [Collection, useCollection, createCollectionScope] = createCollection(MENU_NAME);
var [createMenuContext, createMenuScope] = createContextScope(MENU_NAME, [
  createCollectionScope,
  createPopperScope,
  createRovingFocusGroupScope
]);
var usePopperScope = createPopperScope();
var useRovingFocusGroupScope = createRovingFocusGroupScope();
var [MenuProvider, useMenuContext] = createMenuContext(MENU_NAME);
var [MenuRootProvider, useMenuRootContext] = createMenuContext(MENU_NAME);
var Menu = (props) => {
  const { __scopeMenu, open = false, children, dir, onOpenChange, modal = true } = props;
  const popperScope = usePopperScope(__scopeMenu);
  const [content, setContent] = reactExports.useState(null);
  const isUsingKeyboardRef = reactExports.useRef(false);
  const handleOpenChange = useCallbackRef(onOpenChange);
  const direction = useDirection(dir);
  reactExports.useEffect(() => {
    const handleKeyDown = () => {
      isUsingKeyboardRef.current = true;
      document.addEventListener("pointerdown", handlePointer, { capture: true, once: true });
      document.addEventListener("pointermove", handlePointer, { capture: true, once: true });
    };
    const handlePointer = () => isUsingKeyboardRef.current = false;
    document.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => {
      document.removeEventListener("keydown", handleKeyDown, { capture: true });
      document.removeEventListener("pointerdown", handlePointer, { capture: true });
      document.removeEventListener("pointermove", handlePointer, { capture: true });
    };
  }, []);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Root2$1, { ...popperScope, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
    MenuProvider,
    {
      scope: __scopeMenu,
      open,
      onOpenChange: handleOpenChange,
      content,
      onContentChange: setContent,
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        MenuRootProvider,
        {
          scope: __scopeMenu,
          onClose: reactExports.useCallback(() => handleOpenChange(false), [handleOpenChange]),
          isUsingKeyboardRef,
          dir: direction,
          modal,
          children
        }
      )
    }
  ) });
};
Menu.displayName = MENU_NAME;
var ANCHOR_NAME = "MenuAnchor";
var MenuAnchor = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeMenu, ...anchorProps } = props;
    const popperScope = usePopperScope(__scopeMenu);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Anchor, { ...popperScope, ...anchorProps, ref: forwardedRef });
  }
);
MenuAnchor.displayName = ANCHOR_NAME;
var PORTAL_NAME$1 = "MenuPortal";
var [PortalProvider, usePortalContext] = createMenuContext(PORTAL_NAME$1, {
  forceMount: void 0
});
var MenuPortal = (props) => {
  const { __scopeMenu, forceMount, children, container } = props;
  const context = useMenuContext(PORTAL_NAME$1, __scopeMenu);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(PortalProvider, { scope: __scopeMenu, forceMount, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Presence, { present: forceMount || context.open, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Portal$1, { asChild: true, container, children }) }) });
};
MenuPortal.displayName = PORTAL_NAME$1;
var CONTENT_NAME$1 = "MenuContent";
var [MenuContentProvider, useMenuContentContext] = createMenuContext(CONTENT_NAME$1);
var MenuContent = reactExports.forwardRef(
  (props, forwardedRef) => {
    const portalContext = usePortalContext(CONTENT_NAME$1, props.__scopeMenu);
    const { forceMount = portalContext.forceMount, ...contentProps } = props;
    const context = useMenuContext(CONTENT_NAME$1, props.__scopeMenu);
    const rootContext = useMenuRootContext(CONTENT_NAME$1, props.__scopeMenu);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Collection.Provider, { scope: props.__scopeMenu, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Presence, { present: forceMount || context.open, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Collection.Slot, { scope: props.__scopeMenu, children: rootContext.modal ? /* @__PURE__ */ jsxRuntimeExports.jsx(MenuRootContentModal, { ...contentProps, ref: forwardedRef }) : /* @__PURE__ */ jsxRuntimeExports.jsx(MenuRootContentNonModal, { ...contentProps, ref: forwardedRef }) }) }) });
  }
);
var MenuRootContentModal = reactExports.forwardRef(
  (props, forwardedRef) => {
    const context = useMenuContext(CONTENT_NAME$1, props.__scopeMenu);
    const ref = reactExports.useRef(null);
    const composedRefs = useComposedRefs(forwardedRef, ref);
    reactExports.useEffect(() => {
      const content = ref.current;
      if (content) return hideOthers(content);
    }, []);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      MenuContentImpl,
      {
        ...props,
        ref: composedRefs,
        trapFocus: context.open,
        disableOutsidePointerEvents: context.open,
        disableOutsideScroll: true,
        onFocusOutside: composeEventHandlers(
          props.onFocusOutside,
          (event) => event.preventDefault(),
          { checkForDefaultPrevented: false }
        ),
        onDismiss: () => context.onOpenChange(false)
      }
    );
  }
);
var MenuRootContentNonModal = reactExports.forwardRef((props, forwardedRef) => {
  const context = useMenuContext(CONTENT_NAME$1, props.__scopeMenu);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    MenuContentImpl,
    {
      ...props,
      ref: forwardedRef,
      trapFocus: false,
      disableOutsidePointerEvents: false,
      disableOutsideScroll: false,
      onDismiss: () => context.onOpenChange(false)
    }
  );
});
var Slot = createSlot("MenuContent.ScrollLock");
var MenuContentImpl = reactExports.forwardRef(
  (props, forwardedRef) => {
    const {
      __scopeMenu,
      loop = false,
      trapFocus,
      onOpenAutoFocus,
      onCloseAutoFocus,
      disableOutsidePointerEvents,
      onEntryFocus,
      onEscapeKeyDown,
      onPointerDownOutside,
      onFocusOutside,
      onInteractOutside,
      onDismiss,
      disableOutsideScroll,
      ...contentProps
    } = props;
    const context = useMenuContext(CONTENT_NAME$1, __scopeMenu);
    const rootContext = useMenuRootContext(CONTENT_NAME$1, __scopeMenu);
    const popperScope = usePopperScope(__scopeMenu);
    const rovingFocusGroupScope = useRovingFocusGroupScope(__scopeMenu);
    const getItems = useCollection(__scopeMenu);
    const [currentItemId, setCurrentItemId] = reactExports.useState(null);
    const contentRef = reactExports.useRef(null);
    const composedRefs = useComposedRefs(forwardedRef, contentRef, context.onContentChange);
    const timerRef = reactExports.useRef(0);
    const searchRef = reactExports.useRef("");
    const pointerGraceTimerRef = reactExports.useRef(0);
    const pointerGraceIntentRef = reactExports.useRef(null);
    const pointerDirRef = reactExports.useRef("right");
    const lastPointerXRef = reactExports.useRef(0);
    const ScrollLockWrapper = disableOutsideScroll ? ReactRemoveScroll : reactExports.Fragment;
    const scrollLockWrapperProps = disableOutsideScroll ? { as: Slot, allowPinchZoom: true } : void 0;
    const handleTypeaheadSearch = (key) => {
      const search = searchRef.current + key;
      const items = getItems().filter((item) => !item.disabled);
      const currentItem = document.activeElement;
      const currentMatch = items.find((item) => item.ref.current === currentItem)?.textValue;
      const values = items.map((item) => item.textValue);
      const nextMatch = getNextMatch(values, search, currentMatch);
      const newItem = items.find((item) => item.textValue === nextMatch)?.ref.current;
      (function updateSearch(value) {
        searchRef.current = value;
        window.clearTimeout(timerRef.current);
        if (value !== "") timerRef.current = window.setTimeout(() => updateSearch(""), 1e3);
      })(search);
      if (newItem) {
        setTimeout(() => newItem.focus());
      }
    };
    reactExports.useEffect(() => {
      return () => window.clearTimeout(timerRef.current);
    }, []);
    useFocusGuards();
    const isPointerMovingToSubmenu = reactExports.useCallback((event) => {
      const isMovingTowards = pointerDirRef.current === pointerGraceIntentRef.current?.side;
      return isMovingTowards && isPointerInGraceArea(event, pointerGraceIntentRef.current?.area);
    }, []);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      MenuContentProvider,
      {
        scope: __scopeMenu,
        searchRef,
        onItemEnter: reactExports.useCallback(
          (event) => {
            if (isPointerMovingToSubmenu(event)) event.preventDefault();
          },
          [isPointerMovingToSubmenu]
        ),
        onItemLeave: reactExports.useCallback(
          (event) => {
            if (isPointerMovingToSubmenu(event)) return;
            contentRef.current?.focus();
            setCurrentItemId(null);
          },
          [isPointerMovingToSubmenu]
        ),
        onTriggerLeave: reactExports.useCallback(
          (event) => {
            if (isPointerMovingToSubmenu(event)) event.preventDefault();
          },
          [isPointerMovingToSubmenu]
        ),
        pointerGraceTimerRef,
        onPointerGraceIntentChange: reactExports.useCallback((intent) => {
          pointerGraceIntentRef.current = intent;
        }, []),
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(ScrollLockWrapper, { ...scrollLockWrapperProps, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          FocusScope,
          {
            asChild: true,
            trapped: trapFocus,
            onMountAutoFocus: composeEventHandlers(onOpenAutoFocus, (event) => {
              event.preventDefault();
              contentRef.current?.focus({ preventScroll: true });
            }),
            onUnmountAutoFocus: onCloseAutoFocus,
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              DismissableLayer,
              {
                asChild: true,
                disableOutsidePointerEvents,
                onEscapeKeyDown,
                onPointerDownOutside,
                onFocusOutside,
                onInteractOutside,
                onDismiss,
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Root,
                  {
                    asChild: true,
                    ...rovingFocusGroupScope,
                    dir: rootContext.dir,
                    orientation: "vertical",
                    loop,
                    currentTabStopId: currentItemId,
                    onCurrentTabStopIdChange: setCurrentItemId,
                    onEntryFocus: composeEventHandlers(onEntryFocus, (event) => {
                      if (!rootContext.isUsingKeyboardRef.current) event.preventDefault();
                    }),
                    preventScrollOnEntryFocus: true,
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                      Content,
                      {
                        role: "menu",
                        "aria-orientation": "vertical",
                        "data-state": getOpenState(context.open),
                        "data-radix-menu-content": "",
                        dir: rootContext.dir,
                        ...popperScope,
                        ...contentProps,
                        ref: composedRefs,
                        style: { outline: "none", ...contentProps.style },
                        onKeyDown: composeEventHandlers(contentProps.onKeyDown, (event) => {
                          const target = event.target;
                          const isKeyDownInside = target.closest("[data-radix-menu-content]") === event.currentTarget;
                          const isModifierKey = event.ctrlKey || event.altKey || event.metaKey;
                          const isCharacterKey = event.key.length === 1;
                          if (isKeyDownInside) {
                            if (event.key === "Tab") event.preventDefault();
                            if (!isModifierKey && isCharacterKey) handleTypeaheadSearch(event.key);
                          }
                          const content = contentRef.current;
                          if (event.target !== content) return;
                          if (!FIRST_LAST_KEYS.includes(event.key)) return;
                          event.preventDefault();
                          const items = getItems().filter((item) => !item.disabled);
                          const candidateNodes = items.map((item) => item.ref.current);
                          if (LAST_KEYS.includes(event.key)) candidateNodes.reverse();
                          focusFirst(candidateNodes);
                        }),
                        onBlur: composeEventHandlers(props.onBlur, (event) => {
                          if (!event.currentTarget.contains(event.target)) {
                            window.clearTimeout(timerRef.current);
                            searchRef.current = "";
                          }
                        }),
                        onPointerMove: composeEventHandlers(
                          props.onPointerMove,
                          whenMouse((event) => {
                            const target = event.target;
                            const pointerXHasChanged = lastPointerXRef.current !== event.clientX;
                            if (event.currentTarget.contains(target) && pointerXHasChanged) {
                              const newDir = event.clientX > lastPointerXRef.current ? "right" : "left";
                              pointerDirRef.current = newDir;
                              lastPointerXRef.current = event.clientX;
                            }
                          })
                        )
                      }
                    )
                  }
                )
              }
            )
          }
        ) })
      }
    );
  }
);
MenuContent.displayName = CONTENT_NAME$1;
var GROUP_NAME$1 = "MenuGroup";
var MenuGroup = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeMenu, ...groupProps } = props;
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Primitive.div, { role: "group", ...groupProps, ref: forwardedRef });
  }
);
MenuGroup.displayName = GROUP_NAME$1;
var LABEL_NAME$1 = "MenuLabel";
var MenuLabel = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeMenu, ...labelProps } = props;
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Primitive.div, { ...labelProps, ref: forwardedRef });
  }
);
MenuLabel.displayName = LABEL_NAME$1;
var ITEM_NAME$1 = "MenuItem";
var ITEM_SELECT = "menu.itemSelect";
var MenuItem = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { disabled = false, onSelect, ...itemProps } = props;
    const ref = reactExports.useRef(null);
    const rootContext = useMenuRootContext(ITEM_NAME$1, props.__scopeMenu);
    const contentContext = useMenuContentContext(ITEM_NAME$1, props.__scopeMenu);
    const composedRefs = useComposedRefs(forwardedRef, ref);
    const isPointerDownRef = reactExports.useRef(false);
    const handleSelect = () => {
      const menuItem = ref.current;
      if (!disabled && menuItem) {
        const itemSelectEvent = new CustomEvent(ITEM_SELECT, { bubbles: true, cancelable: true });
        menuItem.addEventListener(ITEM_SELECT, (event) => onSelect?.(event), { once: true });
        dispatchDiscreteCustomEvent(menuItem, itemSelectEvent);
        if (itemSelectEvent.defaultPrevented) {
          isPointerDownRef.current = false;
        } else {
          rootContext.onClose();
        }
      }
    };
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      MenuItemImpl,
      {
        ...itemProps,
        ref: composedRefs,
        disabled,
        onClick: composeEventHandlers(props.onClick, handleSelect),
        onPointerDown: (event) => {
          props.onPointerDown?.(event);
          isPointerDownRef.current = true;
        },
        onPointerUp: composeEventHandlers(props.onPointerUp, (event) => {
          if (!isPointerDownRef.current) event.currentTarget?.click();
        }),
        onKeyDown: composeEventHandlers(props.onKeyDown, (event) => {
          const isTypingAhead = contentContext.searchRef.current !== "";
          if (disabled || isTypingAhead && event.key === " ") return;
          if (SELECTION_KEYS.includes(event.key)) {
            event.currentTarget.click();
            event.preventDefault();
          }
        })
      }
    );
  }
);
MenuItem.displayName = ITEM_NAME$1;
var MenuItemImpl = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeMenu, disabled = false, textValue, ...itemProps } = props;
    const contentContext = useMenuContentContext(ITEM_NAME$1, __scopeMenu);
    const rovingFocusGroupScope = useRovingFocusGroupScope(__scopeMenu);
    const ref = reactExports.useRef(null);
    const composedRefs = useComposedRefs(forwardedRef, ref);
    const [isFocused, setIsFocused] = reactExports.useState(false);
    const [textContent, setTextContent] = reactExports.useState("");
    reactExports.useEffect(() => {
      const menuItem = ref.current;
      if (menuItem) {
        setTextContent((menuItem.textContent ?? "").trim());
      }
    }, [itemProps.children]);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      Collection.ItemSlot,
      {
        scope: __scopeMenu,
        disabled,
        textValue: textValue ?? textContent,
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(Item, { asChild: true, ...rovingFocusGroupScope, focusable: !disabled, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          Primitive.div,
          {
            role: "menuitem",
            "data-highlighted": isFocused ? "" : void 0,
            "aria-disabled": disabled || void 0,
            "data-disabled": disabled ? "" : void 0,
            ...itemProps,
            ref: composedRefs,
            onPointerMove: composeEventHandlers(
              props.onPointerMove,
              whenMouse((event) => {
                if (disabled) {
                  contentContext.onItemLeave(event);
                } else {
                  contentContext.onItemEnter(event);
                  if (!event.defaultPrevented) {
                    const item = event.currentTarget;
                    item.focus({ preventScroll: true });
                  }
                }
              })
            ),
            onPointerLeave: composeEventHandlers(
              props.onPointerLeave,
              whenMouse((event) => contentContext.onItemLeave(event))
            ),
            onFocus: composeEventHandlers(props.onFocus, () => setIsFocused(true)),
            onBlur: composeEventHandlers(props.onBlur, () => setIsFocused(false))
          }
        ) })
      }
    );
  }
);
var CHECKBOX_ITEM_NAME$1 = "MenuCheckboxItem";
var MenuCheckboxItem = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { checked = false, onCheckedChange, ...checkboxItemProps } = props;
    return /* @__PURE__ */ jsxRuntimeExports.jsx(ItemIndicatorProvider, { scope: props.__scopeMenu, checked, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      MenuItem,
      {
        role: "menuitemcheckbox",
        "aria-checked": isIndeterminate(checked) ? "mixed" : checked,
        ...checkboxItemProps,
        ref: forwardedRef,
        "data-state": getCheckedState(checked),
        onSelect: composeEventHandlers(
          checkboxItemProps.onSelect,
          () => onCheckedChange?.(isIndeterminate(checked) ? true : !checked),
          { checkForDefaultPrevented: false }
        )
      }
    ) });
  }
);
MenuCheckboxItem.displayName = CHECKBOX_ITEM_NAME$1;
var RADIO_GROUP_NAME$1 = "MenuRadioGroup";
var [RadioGroupProvider, useRadioGroupContext] = createMenuContext(
  RADIO_GROUP_NAME$1,
  { value: void 0, onValueChange: () => {
  } }
);
var MenuRadioGroup = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { value, onValueChange, ...groupProps } = props;
    const handleValueChange = useCallbackRef(onValueChange);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(RadioGroupProvider, { scope: props.__scopeMenu, value, onValueChange: handleValueChange, children: /* @__PURE__ */ jsxRuntimeExports.jsx(MenuGroup, { ...groupProps, ref: forwardedRef }) });
  }
);
MenuRadioGroup.displayName = RADIO_GROUP_NAME$1;
var RADIO_ITEM_NAME$1 = "MenuRadioItem";
var MenuRadioItem = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { value, ...radioItemProps } = props;
    const context = useRadioGroupContext(RADIO_ITEM_NAME$1, props.__scopeMenu);
    const checked = value === context.value;
    return /* @__PURE__ */ jsxRuntimeExports.jsx(ItemIndicatorProvider, { scope: props.__scopeMenu, checked, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      MenuItem,
      {
        role: "menuitemradio",
        "aria-checked": checked,
        ...radioItemProps,
        ref: forwardedRef,
        "data-state": getCheckedState(checked),
        onSelect: composeEventHandlers(
          radioItemProps.onSelect,
          () => context.onValueChange?.(value),
          { checkForDefaultPrevented: false }
        )
      }
    ) });
  }
);
MenuRadioItem.displayName = RADIO_ITEM_NAME$1;
var ITEM_INDICATOR_NAME = "MenuItemIndicator";
var [ItemIndicatorProvider, useItemIndicatorContext] = createMenuContext(
  ITEM_INDICATOR_NAME,
  { checked: false }
);
var MenuItemIndicator = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeMenu, forceMount, ...itemIndicatorProps } = props;
    const indicatorContext = useItemIndicatorContext(ITEM_INDICATOR_NAME, __scopeMenu);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      Presence,
      {
        present: forceMount || isIndeterminate(indicatorContext.checked) || indicatorContext.checked === true,
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          Primitive.span,
          {
            ...itemIndicatorProps,
            ref: forwardedRef,
            "data-state": getCheckedState(indicatorContext.checked)
          }
        )
      }
    );
  }
);
MenuItemIndicator.displayName = ITEM_INDICATOR_NAME;
var SEPARATOR_NAME$1 = "MenuSeparator";
var MenuSeparator = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeMenu, ...separatorProps } = props;
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      Primitive.div,
      {
        role: "separator",
        "aria-orientation": "horizontal",
        ...separatorProps,
        ref: forwardedRef
      }
    );
  }
);
MenuSeparator.displayName = SEPARATOR_NAME$1;
var ARROW_NAME$1 = "MenuArrow";
var MenuArrow = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeMenu, ...arrowProps } = props;
    const popperScope = usePopperScope(__scopeMenu);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Arrow, { ...popperScope, ...arrowProps, ref: forwardedRef });
  }
);
MenuArrow.displayName = ARROW_NAME$1;
var SUB_NAME = "MenuSub";
var [MenuSubProvider, useMenuSubContext] = createMenuContext(SUB_NAME);
var SUB_TRIGGER_NAME$1 = "MenuSubTrigger";
var MenuSubTrigger = reactExports.forwardRef(
  (props, forwardedRef) => {
    const context = useMenuContext(SUB_TRIGGER_NAME$1, props.__scopeMenu);
    const rootContext = useMenuRootContext(SUB_TRIGGER_NAME$1, props.__scopeMenu);
    const subContext = useMenuSubContext(SUB_TRIGGER_NAME$1, props.__scopeMenu);
    const contentContext = useMenuContentContext(SUB_TRIGGER_NAME$1, props.__scopeMenu);
    const openTimerRef = reactExports.useRef(null);
    const { pointerGraceTimerRef, onPointerGraceIntentChange } = contentContext;
    const scope = { __scopeMenu: props.__scopeMenu };
    const clearOpenTimer = reactExports.useCallback(() => {
      if (openTimerRef.current) window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }, []);
    reactExports.useEffect(() => clearOpenTimer, [clearOpenTimer]);
    reactExports.useEffect(() => {
      const pointerGraceTimer = pointerGraceTimerRef.current;
      return () => {
        window.clearTimeout(pointerGraceTimer);
        onPointerGraceIntentChange(null);
      };
    }, [pointerGraceTimerRef, onPointerGraceIntentChange]);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(MenuAnchor, { asChild: true, ...scope, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      MenuItemImpl,
      {
        id: subContext.triggerId,
        "aria-haspopup": "menu",
        "aria-expanded": context.open,
        "aria-controls": subContext.contentId,
        "data-state": getOpenState(context.open),
        ...props,
        ref: composeRefs(forwardedRef, subContext.onTriggerChange),
        onClick: (event) => {
          props.onClick?.(event);
          if (props.disabled || event.defaultPrevented) return;
          event.currentTarget.focus();
          if (!context.open) context.onOpenChange(true);
        },
        onPointerMove: composeEventHandlers(
          props.onPointerMove,
          whenMouse((event) => {
            contentContext.onItemEnter(event);
            if (event.defaultPrevented) return;
            if (!props.disabled && !context.open && !openTimerRef.current) {
              contentContext.onPointerGraceIntentChange(null);
              openTimerRef.current = window.setTimeout(() => {
                context.onOpenChange(true);
                clearOpenTimer();
              }, 100);
            }
          })
        ),
        onPointerLeave: composeEventHandlers(
          props.onPointerLeave,
          whenMouse((event) => {
            clearOpenTimer();
            const contentRect = context.content?.getBoundingClientRect();
            if (contentRect) {
              const side = context.content?.dataset.side;
              const rightSide = side === "right";
              const bleed = rightSide ? -5 : 5;
              const contentNearEdge = contentRect[rightSide ? "left" : "right"];
              const contentFarEdge = contentRect[rightSide ? "right" : "left"];
              contentContext.onPointerGraceIntentChange({
                area: [
                  // Apply a bleed on clientX to ensure that our exit point is
                  // consistently within polygon bounds
                  { x: event.clientX + bleed, y: event.clientY },
                  { x: contentNearEdge, y: contentRect.top },
                  { x: contentFarEdge, y: contentRect.top },
                  { x: contentFarEdge, y: contentRect.bottom },
                  { x: contentNearEdge, y: contentRect.bottom }
                ],
                side
              });
              window.clearTimeout(pointerGraceTimerRef.current);
              pointerGraceTimerRef.current = window.setTimeout(
                () => contentContext.onPointerGraceIntentChange(null),
                300
              );
            } else {
              contentContext.onTriggerLeave(event);
              if (event.defaultPrevented) return;
              contentContext.onPointerGraceIntentChange(null);
            }
          })
        ),
        onKeyDown: composeEventHandlers(props.onKeyDown, (event) => {
          const isTypingAhead = contentContext.searchRef.current !== "";
          if (props.disabled || isTypingAhead && event.key === " ") return;
          if (SUB_OPEN_KEYS[rootContext.dir].includes(event.key)) {
            context.onOpenChange(true);
            context.content?.focus();
            event.preventDefault();
          }
        })
      }
    ) });
  }
);
MenuSubTrigger.displayName = SUB_TRIGGER_NAME$1;
var SUB_CONTENT_NAME$1 = "MenuSubContent";
var MenuSubContent = reactExports.forwardRef(
  (props, forwardedRef) => {
    const portalContext = usePortalContext(CONTENT_NAME$1, props.__scopeMenu);
    const { forceMount = portalContext.forceMount, ...subContentProps } = props;
    const context = useMenuContext(CONTENT_NAME$1, props.__scopeMenu);
    const rootContext = useMenuRootContext(CONTENT_NAME$1, props.__scopeMenu);
    const subContext = useMenuSubContext(SUB_CONTENT_NAME$1, props.__scopeMenu);
    const ref = reactExports.useRef(null);
    const composedRefs = useComposedRefs(forwardedRef, ref);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Collection.Provider, { scope: props.__scopeMenu, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Presence, { present: forceMount || context.open, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Collection.Slot, { scope: props.__scopeMenu, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      MenuContentImpl,
      {
        id: subContext.contentId,
        "aria-labelledby": subContext.triggerId,
        ...subContentProps,
        ref: composedRefs,
        align: "start",
        side: rootContext.dir === "rtl" ? "left" : "right",
        disableOutsidePointerEvents: false,
        disableOutsideScroll: false,
        trapFocus: false,
        onOpenAutoFocus: (event) => {
          if (rootContext.isUsingKeyboardRef.current) ref.current?.focus();
          event.preventDefault();
        },
        onCloseAutoFocus: (event) => event.preventDefault(),
        onFocusOutside: composeEventHandlers(props.onFocusOutside, (event) => {
          if (event.target !== subContext.trigger) context.onOpenChange(false);
        }),
        onEscapeKeyDown: composeEventHandlers(props.onEscapeKeyDown, (event) => {
          rootContext.onClose();
          event.preventDefault();
        }),
        onKeyDown: composeEventHandlers(props.onKeyDown, (event) => {
          const isKeyDownInside = event.currentTarget.contains(event.target);
          const isCloseKey = SUB_CLOSE_KEYS[rootContext.dir].includes(event.key);
          if (isKeyDownInside && isCloseKey) {
            context.onOpenChange(false);
            subContext.trigger?.focus();
            event.preventDefault();
          }
        })
      }
    ) }) }) });
  }
);
MenuSubContent.displayName = SUB_CONTENT_NAME$1;
function getOpenState(open) {
  return open ? "open" : "closed";
}
function isIndeterminate(checked) {
  return checked === "indeterminate";
}
function getCheckedState(checked) {
  return isIndeterminate(checked) ? "indeterminate" : checked ? "checked" : "unchecked";
}
function focusFirst(candidates) {
  const PREVIOUSLY_FOCUSED_ELEMENT = document.activeElement;
  for (const candidate of candidates) {
    if (candidate === PREVIOUSLY_FOCUSED_ELEMENT) return;
    candidate.focus();
    if (document.activeElement !== PREVIOUSLY_FOCUSED_ELEMENT) return;
  }
}
function wrapArray(array, startIndex) {
  return array.map((_, index) => array[(startIndex + index) % array.length]);
}
function getNextMatch(values, search, currentMatch) {
  const isRepeated = search.length > 1 && Array.from(search).every((char) => char === search[0]);
  const normalizedSearch = isRepeated ? search[0] : search;
  const currentMatchIndex = currentMatch ? values.indexOf(currentMatch) : -1;
  let wrappedValues = wrapArray(values, Math.max(currentMatchIndex, 0));
  const excludeCurrentMatch = normalizedSearch.length === 1;
  if (excludeCurrentMatch) wrappedValues = wrappedValues.filter((v) => v !== currentMatch);
  const nextMatch = wrappedValues.find(
    (value) => value.toLowerCase().startsWith(normalizedSearch.toLowerCase())
  );
  return nextMatch !== currentMatch ? nextMatch : void 0;
}
function isPointInPolygon(point, polygon) {
  const { x, y } = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const ii = polygon[i];
    const jj = polygon[j];
    const xi = ii.x;
    const yi = ii.y;
    const xj = jj.x;
    const yj = jj.y;
    const intersect = yi > y !== yj > y && x < (xj - xi) * (y - yi) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}
function isPointerInGraceArea(event, area) {
  if (!area) return false;
  const cursorPos = { x: event.clientX, y: event.clientY };
  return isPointInPolygon(cursorPos, area);
}
function whenMouse(handler) {
  return (event) => event.pointerType === "mouse" ? handler(event) : void 0;
}
var Root3 = Menu;
var Anchor2 = MenuAnchor;
var Portal = MenuPortal;
var Content2$1 = MenuContent;
var Group = MenuGroup;
var Label = MenuLabel;
var Item2$1 = MenuItem;
var CheckboxItem = MenuCheckboxItem;
var RadioGroup = MenuRadioGroup;
var RadioItem = MenuRadioItem;
var ItemIndicator = MenuItemIndicator;
var Separator = MenuSeparator;
var Arrow2 = MenuArrow;
var SubTrigger = MenuSubTrigger;
var SubContent = MenuSubContent;
var DROPDOWN_MENU_NAME = "DropdownMenu";
var [createDropdownMenuContext, createDropdownMenuScope] = createContextScope(
  DROPDOWN_MENU_NAME,
  [createMenuScope]
);
var useMenuScope = createMenuScope();
var [DropdownMenuProvider, useDropdownMenuContext] = createDropdownMenuContext(DROPDOWN_MENU_NAME);
var DropdownMenu$1 = (props) => {
  const {
    __scopeDropdownMenu,
    children,
    dir,
    open: openProp,
    defaultOpen,
    onOpenChange,
    modal = true
  } = props;
  const menuScope = useMenuScope(__scopeDropdownMenu);
  const triggerRef = reactExports.useRef(null);
  const [open, setOpen] = useControllableState({
    prop: openProp,
    defaultProp: defaultOpen ?? false,
    onChange: onOpenChange,
    caller: DROPDOWN_MENU_NAME
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    DropdownMenuProvider,
    {
      scope: __scopeDropdownMenu,
      triggerId: useId(),
      triggerRef,
      contentId: useId(),
      open,
      onOpenChange: setOpen,
      onOpenToggle: reactExports.useCallback(() => setOpen((prevOpen) => !prevOpen), [setOpen]),
      modal,
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(Root3, { ...menuScope, open, onOpenChange: setOpen, dir, modal, children })
    }
  );
};
DropdownMenu$1.displayName = DROPDOWN_MENU_NAME;
var TRIGGER_NAME = "DropdownMenuTrigger";
var DropdownMenuTrigger$1 = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeDropdownMenu, disabled = false, ...triggerProps } = props;
    const context = useDropdownMenuContext(TRIGGER_NAME, __scopeDropdownMenu);
    const menuScope = useMenuScope(__scopeDropdownMenu);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Anchor2, { asChild: true, ...menuScope, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      Primitive.button,
      {
        type: "button",
        id: context.triggerId,
        "aria-haspopup": "menu",
        "aria-expanded": context.open,
        "aria-controls": context.open ? context.contentId : void 0,
        "data-state": context.open ? "open" : "closed",
        "data-disabled": disabled ? "" : void 0,
        disabled,
        ...triggerProps,
        ref: composeRefs(forwardedRef, context.triggerRef),
        onPointerDown: composeEventHandlers(props.onPointerDown, (event) => {
          if (!disabled && event.button === 0 && event.ctrlKey === false) {
            context.onOpenToggle();
            if (!context.open) event.preventDefault();
          }
        }),
        onKeyDown: composeEventHandlers(props.onKeyDown, (event) => {
          if (disabled) return;
          if (["Enter", " "].includes(event.key)) context.onOpenToggle();
          if (event.key === "ArrowDown") context.onOpenChange(true);
          if (["Enter", " ", "ArrowDown"].includes(event.key)) event.preventDefault();
        })
      }
    ) });
  }
);
DropdownMenuTrigger$1.displayName = TRIGGER_NAME;
var PORTAL_NAME = "DropdownMenuPortal";
var DropdownMenuPortal = (props) => {
  const { __scopeDropdownMenu, ...portalProps } = props;
  const menuScope = useMenuScope(__scopeDropdownMenu);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Portal, { ...menuScope, ...portalProps });
};
DropdownMenuPortal.displayName = PORTAL_NAME;
var CONTENT_NAME = "DropdownMenuContent";
var DropdownMenuContent$1 = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeDropdownMenu, ...contentProps } = props;
    const context = useDropdownMenuContext(CONTENT_NAME, __scopeDropdownMenu);
    const menuScope = useMenuScope(__scopeDropdownMenu);
    const hasInteractedOutsideRef = reactExports.useRef(false);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      Content2$1,
      {
        id: context.contentId,
        "aria-labelledby": context.triggerId,
        ...menuScope,
        ...contentProps,
        ref: forwardedRef,
        onCloseAutoFocus: composeEventHandlers(props.onCloseAutoFocus, (event) => {
          if (!hasInteractedOutsideRef.current) context.triggerRef.current?.focus();
          hasInteractedOutsideRef.current = false;
          event.preventDefault();
        }),
        onInteractOutside: composeEventHandlers(props.onInteractOutside, (event) => {
          const originalEvent = event.detail.originalEvent;
          const ctrlLeftClick = originalEvent.button === 0 && originalEvent.ctrlKey === true;
          const isRightClick = originalEvent.button === 2 || ctrlLeftClick;
          if (!context.modal || isRightClick) hasInteractedOutsideRef.current = true;
        }),
        style: {
          ...props.style,
          // re-namespace exposed content custom properties
          ...{
            "--radix-dropdown-menu-content-transform-origin": "var(--radix-popper-transform-origin)",
            "--radix-dropdown-menu-content-available-width": "var(--radix-popper-available-width)",
            "--radix-dropdown-menu-content-available-height": "var(--radix-popper-available-height)",
            "--radix-dropdown-menu-trigger-width": "var(--radix-popper-anchor-width)",
            "--radix-dropdown-menu-trigger-height": "var(--radix-popper-anchor-height)"
          }
        }
      }
    );
  }
);
DropdownMenuContent$1.displayName = CONTENT_NAME;
var GROUP_NAME = "DropdownMenuGroup";
var DropdownMenuGroup = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeDropdownMenu, ...groupProps } = props;
    const menuScope = useMenuScope(__scopeDropdownMenu);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Group, { ...menuScope, ...groupProps, ref: forwardedRef });
  }
);
DropdownMenuGroup.displayName = GROUP_NAME;
var LABEL_NAME = "DropdownMenuLabel";
var DropdownMenuLabel$1 = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeDropdownMenu, ...labelProps } = props;
    const menuScope = useMenuScope(__scopeDropdownMenu);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { ...menuScope, ...labelProps, ref: forwardedRef });
  }
);
DropdownMenuLabel$1.displayName = LABEL_NAME;
var ITEM_NAME = "DropdownMenuItem";
var DropdownMenuItem$1 = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeDropdownMenu, ...itemProps } = props;
    const menuScope = useMenuScope(__scopeDropdownMenu);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Item2$1, { ...menuScope, ...itemProps, ref: forwardedRef });
  }
);
DropdownMenuItem$1.displayName = ITEM_NAME;
var CHECKBOX_ITEM_NAME = "DropdownMenuCheckboxItem";
var DropdownMenuCheckboxItem$1 = reactExports.forwardRef((props, forwardedRef) => {
  const { __scopeDropdownMenu, ...checkboxItemProps } = props;
  const menuScope = useMenuScope(__scopeDropdownMenu);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(CheckboxItem, { ...menuScope, ...checkboxItemProps, ref: forwardedRef });
});
DropdownMenuCheckboxItem$1.displayName = CHECKBOX_ITEM_NAME;
var RADIO_GROUP_NAME = "DropdownMenuRadioGroup";
var DropdownMenuRadioGroup = reactExports.forwardRef((props, forwardedRef) => {
  const { __scopeDropdownMenu, ...radioGroupProps } = props;
  const menuScope = useMenuScope(__scopeDropdownMenu);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(RadioGroup, { ...menuScope, ...radioGroupProps, ref: forwardedRef });
});
DropdownMenuRadioGroup.displayName = RADIO_GROUP_NAME;
var RADIO_ITEM_NAME = "DropdownMenuRadioItem";
var DropdownMenuRadioItem$1 = reactExports.forwardRef((props, forwardedRef) => {
  const { __scopeDropdownMenu, ...radioItemProps } = props;
  const menuScope = useMenuScope(__scopeDropdownMenu);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(RadioItem, { ...menuScope, ...radioItemProps, ref: forwardedRef });
});
DropdownMenuRadioItem$1.displayName = RADIO_ITEM_NAME;
var INDICATOR_NAME = "DropdownMenuItemIndicator";
var DropdownMenuItemIndicator = reactExports.forwardRef((props, forwardedRef) => {
  const { __scopeDropdownMenu, ...itemIndicatorProps } = props;
  const menuScope = useMenuScope(__scopeDropdownMenu);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(ItemIndicator, { ...menuScope, ...itemIndicatorProps, ref: forwardedRef });
});
DropdownMenuItemIndicator.displayName = INDICATOR_NAME;
var SEPARATOR_NAME = "DropdownMenuSeparator";
var DropdownMenuSeparator$1 = reactExports.forwardRef((props, forwardedRef) => {
  const { __scopeDropdownMenu, ...separatorProps } = props;
  const menuScope = useMenuScope(__scopeDropdownMenu);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Separator, { ...menuScope, ...separatorProps, ref: forwardedRef });
});
DropdownMenuSeparator$1.displayName = SEPARATOR_NAME;
var ARROW_NAME = "DropdownMenuArrow";
var DropdownMenuArrow = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeDropdownMenu, ...arrowProps } = props;
    const menuScope = useMenuScope(__scopeDropdownMenu);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Arrow2, { ...menuScope, ...arrowProps, ref: forwardedRef });
  }
);
DropdownMenuArrow.displayName = ARROW_NAME;
var SUB_TRIGGER_NAME = "DropdownMenuSubTrigger";
var DropdownMenuSubTrigger$1 = reactExports.forwardRef((props, forwardedRef) => {
  const { __scopeDropdownMenu, ...subTriggerProps } = props;
  const menuScope = useMenuScope(__scopeDropdownMenu);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(SubTrigger, { ...menuScope, ...subTriggerProps, ref: forwardedRef });
});
DropdownMenuSubTrigger$1.displayName = SUB_TRIGGER_NAME;
var SUB_CONTENT_NAME = "DropdownMenuSubContent";
var DropdownMenuSubContent$1 = reactExports.forwardRef((props, forwardedRef) => {
  const { __scopeDropdownMenu, ...subContentProps } = props;
  const menuScope = useMenuScope(__scopeDropdownMenu);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    SubContent,
    {
      ...menuScope,
      ...subContentProps,
      ref: forwardedRef,
      style: {
        ...props.style,
        // re-namespace exposed content custom properties
        ...{
          "--radix-dropdown-menu-content-transform-origin": "var(--radix-popper-transform-origin)",
          "--radix-dropdown-menu-content-available-width": "var(--radix-popper-available-width)",
          "--radix-dropdown-menu-content-available-height": "var(--radix-popper-available-height)",
          "--radix-dropdown-menu-trigger-width": "var(--radix-popper-anchor-width)",
          "--radix-dropdown-menu-trigger-height": "var(--radix-popper-anchor-height)"
        }
      }
    }
  );
});
DropdownMenuSubContent$1.displayName = SUB_CONTENT_NAME;
var Root2 = DropdownMenu$1;
var Trigger = DropdownMenuTrigger$1;
var Portal2 = DropdownMenuPortal;
var Content2 = DropdownMenuContent$1;
var Label2 = DropdownMenuLabel$1;
var Item2 = DropdownMenuItem$1;
var CheckboxItem2 = DropdownMenuCheckboxItem$1;
var RadioItem2 = DropdownMenuRadioItem$1;
var ItemIndicator2 = DropdownMenuItemIndicator;
var Separator2 = DropdownMenuSeparator$1;
var SubTrigger2 = DropdownMenuSubTrigger$1;
var SubContent2 = DropdownMenuSubContent$1;
const DropdownMenu = Root2;
const DropdownMenuTrigger = Trigger;
const DropdownMenuSubTrigger = reactExports.forwardRef(({
  className,
  inset,
  children,
  ...props
}, ref) => /* @__PURE__ */ jsxRuntimeExports.jsxs(SubTrigger2, {
  ref,
  className: cn("flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent data-[state=open]:bg-accent [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0", inset && "pl-8", className),
  ...props,
  children: [children, /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, {
    className: "ml-auto"
  })]
}));
DropdownMenuSubTrigger.displayName = SubTrigger2.displayName;
const DropdownMenuSubContent = reactExports.forwardRef(({
  className,
  ...props
}, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx(SubContent2, {
  ref,
  className: cn("z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-dropdown-menu-content-transform-origin]", className),
  ...props
}));
DropdownMenuSubContent.displayName = SubContent2.displayName;
const DropdownMenuContent = reactExports.forwardRef(({
  className,
  sideOffset = 4,
  ...props
}, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx(Portal2, {
  children: /* @__PURE__ */ jsxRuntimeExports.jsx(Content2, {
    ref,
    sideOffset,
    className: cn("z-50 max-h-[var(--radix-dropdown-menu-content-available-height)] min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-dropdown-menu-content-transform-origin]", className),
    ...props
  })
}));
DropdownMenuContent.displayName = Content2.displayName;
const DropdownMenuItem = reactExports.forwardRef(({
  className,
  inset,
  ...props
}, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx(Item2, {
  ref,
  className: cn("relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0", inset && "pl-8", className),
  ...props
}));
DropdownMenuItem.displayName = Item2.displayName;
const DropdownMenuCheckboxItem = reactExports.forwardRef(({
  className,
  children,
  checked,
  ...props
}, ref) => /* @__PURE__ */ jsxRuntimeExports.jsxs(CheckboxItem2, {
  ref,
  className: cn("relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50", className),
  checked,
  ...props,
  children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
    className: "absolute left-2 flex h-3.5 w-3.5 items-center justify-center",
    children: /* @__PURE__ */ jsxRuntimeExports.jsx(ItemIndicator2, {
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(Check, {
        className: "h-4 w-4"
      })
    })
  }), children]
}));
DropdownMenuCheckboxItem.displayName = CheckboxItem2.displayName;
const DropdownMenuRadioItem = reactExports.forwardRef(({
  className,
  children,
  ...props
}, ref) => /* @__PURE__ */ jsxRuntimeExports.jsxs(RadioItem2, {
  ref,
  className: cn("relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50", className),
  ...props,
  children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
    className: "absolute left-2 flex h-3.5 w-3.5 items-center justify-center",
    children: /* @__PURE__ */ jsxRuntimeExports.jsx(ItemIndicator2, {
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(Circle, {
        className: "h-2 w-2 fill-current"
      })
    })
  }), children]
}));
DropdownMenuRadioItem.displayName = RadioItem2.displayName;
const DropdownMenuLabel = reactExports.forwardRef(({
  className,
  inset,
  ...props
}, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx(Label2, {
  ref,
  className: cn("px-2 py-1.5 text-sm font-semibold", inset && "pl-8", className),
  ...props
}));
DropdownMenuLabel.displayName = Label2.displayName;
const DropdownMenuSeparator = reactExports.forwardRef(({
  className,
  ...props
}, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx(Separator2, {
  ref,
  className: cn("-mx-1 my-1 h-px bg-muted", className),
  ...props
}));
DropdownMenuSeparator.displayName = Separator2.displayName;
const NotificationCenter = ({
  className = ""
}) => {
  const [notifications, setNotifications] = reactExports.useState([]);
  const [unreadCount, setUnreadCount] = reactExports.useState(0);
  const [loading, setLoading] = reactExports.useState(false);
  const [showDialog, setShowDialog] = reactExports.useState(false);
  const {
    toast
  } = useToast();
  reactExports.useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 3e4);
    return () => clearInterval(interval);
  }, []);
  const loadNotifications = async () => {
    try {
      const response = await fetch("/api/alerts/notifications");
      const data = await response.json();
      if (response.ok) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error("Error loading notifications:", error);
    }
  };
  const markAsRead = async (notificationId) => {
    try {
      const response = await fetch(`/api/alerts/notifications/${notificationId}/read`, {
        method: "POST"
      });
      if (response.ok) {
        setNotifications((prev) => prev.map((n) => n.id === notificationId ? {
          ...n,
          read: true
        } : n));
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };
  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter((n) => !n.read);
      for (const notification of unreadNotifications) {
        await markAsRead(notification.id);
      }
      toast({
        title: "Success",
        description: "All notifications marked as read"
      });
    } catch (error) {
      console.error("Error marking all as read:", error);
      toast({
        title: "Error",
        description: "Failed to mark notifications as read",
        variant: "destructive"
      });
    }
  };
  const clearAllNotifications = async () => {
    try {
      const response = await fetch("/api/alerts/notifications", {
        method: "DELETE"
      });
      if (response.ok) {
        setNotifications([]);
        setUnreadCount(0);
        toast({
          title: "Success",
          description: "All notifications cleared"
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to clear notifications",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error clearing notifications:", error);
      toast({
        title: "Error",
        description: "Failed to clear notifications",
        variant: "destructive"
      });
    }
  };
  const getNotificationIcon = (type, severity) => {
    const iconClass = `h-5 w-5 ${getSeverityColor(severity)}`;
    switch (type) {
      case "price_change":
      case "price_threshold":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, {
          className: iconClass
        });
      case "volume_spike":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(Volume2, {
          className: iconClass
        });
      case "earnings_reminder":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(Calendar, {
          className: iconClass
        });
      case "portfolio_performance":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(ChartPie, {
          className: iconClass
        });
      case "system_health":
      case "api_quota":
      case "cost_protection":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, {
          className: iconClass
        });
      default:
        return /* @__PURE__ */ jsxRuntimeExports.jsx(Info, {
          className: iconClass
        });
    }
  };
  const getSeverityColor = (severity) => {
    switch (severity) {
      case "critical":
        return "text-red-500";
      case "high":
        return "text-orange-500";
      case "medium":
        return "text-yellow-500";
      case "low":
        return "text-blue-500";
      default:
        return "text-gray-500";
    }
  };
  const getSeverityBadgeVariant = (severity) => {
    switch (severity) {
      case "critical":
        return "destructive";
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "outline";
    }
  };
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = /* @__PURE__ */ new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1e3 * 60));
    const diffHours = Math.floor(diffMs / (1e3 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1e3 * 60 * 60 * 24));
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };
  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
    className,
    children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, {
      open: showDialog,
      onOpenChange: setShowDialog,
      children: [/* @__PURE__ */ jsxRuntimeExports.jsx(DialogTrigger, {
        asChild: true,
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
          variant: "ghost",
          size: "sm",
          className: "relative",
          onClick: () => setShowDialog(true),
          children: [unreadCount > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(Bell, {
            className: "h-5 w-5"
          }) : /* @__PURE__ */ jsxRuntimeExports.jsx(BellOff, {
            className: "h-5 w-5"
          }), unreadCount > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, {
            variant: "destructive",
            className: "absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs",
            children: unreadCount > 99 ? "99+" : unreadCount
          })]
        })
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, {
        className: "max-w-md h-[600px] p-0",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx(DialogHeader, {
          className: "p-6 pb-4",
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex items-center justify-between",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(DialogTitle, {
              className: "flex items-center space-x-2",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Bell, {
                className: "h-5 w-5"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                children: "Notifications"
              }), unreadCount > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, {
                variant: "secondary",
                children: [unreadCount, " new"]
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "flex space-x-2",
              children: [unreadCount > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
                variant: "ghost",
                size: "sm",
                onClick: markAllAsRead,
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(Check, {
                  className: "h-4 w-4"
                })
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
                variant: "ghost",
                size: "sm",
                onClick: clearAllNotifications,
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, {
                  className: "h-4 w-4"
                })
              })]
            })]
          })
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(Separator$1, {}), /* @__PURE__ */ jsxRuntimeExports.jsx(ScrollArea, {
          className: "flex-1 p-6",
          children: loading ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "flex justify-center py-8",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
              className: "animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"
            })
          }) : notifications.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex flex-col items-center justify-center py-8 text-center",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(BellOff, {
              className: "h-12 w-12 text-muted-foreground mb-4"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("h3", {
              className: "font-semibold mb-2",
              children: "No notifications"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
              className: "text-sm text-muted-foreground",
              children: "You're all caught up! New alerts will appear here."
            })]
          }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "space-y-2",
            children: notifications.map((notification, index) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Card, {
                className: `cursor-pointer transition-all hover:shadow-md ${!notification.read ? "border-blue-200 bg-blue-50/50" : ""}`,
                onClick: () => handleNotificationClick(notification),
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
                  className: "p-4",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex items-start space-x-3",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                      className: "flex-shrink-0 mt-0.5",
                      children: getNotificationIcon(notification.type, notification.severity)
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                      className: "flex-1 min-w-0",
                      children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                        className: "flex items-center justify-between mb-1",
                        children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h4", {
                          className: "text-sm font-semibold truncate",
                          children: notification.title
                        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                          className: "flex items-center space-x-2",
                          children: [notification.symbol && /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, {
                            variant: "outline",
                            className: "text-xs",
                            children: notification.symbol
                          }), /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, {
                            variant: getSeverityBadgeVariant(notification.severity),
                            className: "text-xs",
                            children: notification.severity
                          })]
                        })]
                      }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                        className: "text-sm text-muted-foreground mb-2",
                        children: notification.message
                      }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                        className: "flex items-center justify-between",
                        children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                          className: "text-xs text-muted-foreground",
                          children: formatTimestamp(notification.timestamp)
                        }), !notification.read && /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                          className: "w-2 h-2 bg-blue-500 rounded-full"
                        })]
                      })]
                    })]
                  })
                })
              }), index < notifications.length - 1 && /* @__PURE__ */ jsxRuntimeExports.jsx(Separator$1, {
                className: "my-2"
              })]
            }, notification.id))
          })
        }), notifications.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, {
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Separator$1, {}), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "p-4",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
              variant: "outline",
              size: "sm",
              className: "w-full",
              onClick: () => {
                setShowDialog(false);
                window.location.href = "/alerts";
              },
              children: "View All Alerts"
            })
          })]
        })]
      })]
    })
  });
};
function TopBar({
  onMobileMenuToggle
}) {
  const {
    theme,
    setTheme
  } = useTheme();
  const isMobile = useIsMobile();
  const [, setLocation] = useLocation();
  const {
    user,
    userProfile,
    signOut
  } = useSupabaseAuth();
  const {
    t,
    i18n
  } = useTranslation(["common", "markets", "currencies"]);
  const {
    currentCurrency,
    setCurrency,
    formatCurrency,
    convertCurrency
  } = useCurrency();
  const indices = {
    dow: {
      value: 39131.53,
      change: 0.52
    },
    sp500: {
      value: 5088.8,
      change: 0.39
    },
    nasdaq: {
      value: 15996.82,
      change: 0.17
    }
  };
  const [convertedIndices, setConvertedIndices] = reactExports.useState({
    dow: null,
    sp500: null,
    nasdaq: null
  });
  reactExports.useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const [dow, sp, nasdaq] = await Promise.all([convertCurrency(indices.dow.value, "USD", currentCurrency), convertCurrency(indices.sp500.value, "USD", currentCurrency), convertCurrency(indices.nasdaq.value, "USD", currentCurrency)]);
        if (!cancelled) {
          setConvertedIndices({
            dow,
            sp500: sp,
            nasdaq
          });
        }
      } catch (e) {
        if (!cancelled) {
          setConvertedIndices({
            dow: indices.dow.value,
            sp500: indices.sp500.value,
            nasdaq: indices.nasdaq.value
          });
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [currentCurrency]);
  const handleLanguageChange = (lng) => {
    i18n.changeLanguage(lng);
    if (lng === "pt") {
      setCurrency("EUR");
      localStorage.setItem("aa-region", "EU");
    } else if (lng === "en") {
      setCurrency("USD");
      localStorage.setItem("aa-region", "USA");
    }
  };
  const formatChange = (change) => {
    const sign = change >= 0 ? "+" : "";
    return `${sign}${change.toFixed(2)}%`;
  };
  const displayName = userProfile?.name || (typeof user?.user_metadata?.name === "string" ? user.user_metadata.name : void 0) || (user?.email ? user.email.split("@")[0] : null) || "Investidor";
  const avatarInitial = displayName.trim().charAt(0).toUpperCase() || "A";
  const handleSignOut = async () => {
    const {
      error
    } = await signOut();
    if (error) {
      console.error("Erro ao terminar sessão:", error.message);
      return;
    }
    setLocation("/");
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("header", {
    className: "bg-teya-green/20 backdrop-blur-xl border-b border-teya-green/30 px-6 py-4 flex items-center justify-between sticky top-0 z-10 pt-[env(safe-area-inset-top)] pl-[calc(1.5rem+env(safe-area-inset-left))] pr-[calc(1.5rem+env(safe-area-inset-right))]",
    children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
      className: "flex items-center space-x-8",
      children: [isMobile && /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
        type: "button",
        variant: "ghost",
        size: "sm",
        onClick: onMobileMenuToggle,
        className: "h-11 w-11 p-0 bg-secondary/60 hover:bg-secondary text-foreground border border-border/60 md:hidden",
        "aria-label": "Menu principal",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(Menu$1, {
          className: "h-4 w-4",
          "aria-hidden": "true"
        })
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "hidden lg:flex items-center space-x-6",
        "aria-live": "polite",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "flex items-center space-x-3 bg-secondary/30 px-3 py-2 rounded-lg",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
            className: "text-xs font-medium text-muted-foreground uppercase tracking-wide",
            children: t("indices.dow", {
              ns: "markets"
            })
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
            className: "font-bold text-sm",
            children: convertedIndices.dow !== null ? formatCurrency(convertedIndices.dow) : "—"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
            className: `text-xs font-medium px-2 py-1 rounded-full ${"bg-emerald-500/10 text-emerald-500"}`,
            children: formatChange(indices.dow.change)
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "flex items-center space-x-3 bg-secondary/30 px-3 py-2 rounded-lg",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
            className: "text-xs font-medium text-muted-foreground uppercase tracking-wide",
            children: t("indices.sp500", {
              ns: "markets"
            })
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
            className: "font-bold text-sm",
            children: convertedIndices.sp500 !== null ? formatCurrency(convertedIndices.sp500) : "—"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
            className: `text-xs font-medium px-2 py-1 rounded-full ${"bg-emerald-500/10 text-emerald-500"}`,
            children: formatChange(indices.sp500.change)
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "flex items-center space-x-3 bg-secondary/30 px-3 py-2 rounded-lg",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
            className: "text-xs font-medium text-muted-foreground uppercase tracking-wide",
            children: t("indices.nasdaq", {
              ns: "markets"
            })
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
            className: "font-bold text-sm",
            children: convertedIndices.nasdaq !== null ? formatCurrency(convertedIndices.nasdaq) : "—"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
            className: `text-xs font-medium px-2 py-1 rounded-full ${"bg-emerald-500/10 text-emerald-500"}`,
            children: formatChange(indices.nasdaq.change)
          })]
        })]
      })]
    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
      className: "flex items-center space-x-3",
      children: [!isMobile && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, {
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(Select, {
          value: i18n.language,
          onValueChange: handleLanguageChange,
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, {
            className: "w-24 h-11 bg-secondary/50 border-border/50",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {})
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
              value: "en",
              children: "🇺🇸 EN"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
              value: "pt",
              children: "🇵🇹 PT"
            })]
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, {
          value: currentCurrency,
          onValueChange: (value) => setCurrency(value),
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, {
            className: "w-24 h-11 bg-secondary/50 border-border/50",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {})
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
              value: "USD",
              children: t("usd", {
                ns: "currencies"
              })
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
              value: "EUR",
              children: t("eur", {
                ns: "currencies"
              })
            })]
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, {
          value: localStorage.getItem("aa-region") || "USA",
          onValueChange: (value) => localStorage.setItem("aa-region", value),
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, {
            className: "w-24 h-11 bg-secondary/50 border-border/50",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {})
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
              value: "USA",
              children: t("regions.usa", {
                ns: "markets"
              })
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
              value: "EU",
              children: t("regions.eu", {
                ns: "markets"
              })
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
              value: "APAC",
              children: t("regions.apac", {
                ns: "markets"
              })
            })]
          })]
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsx(NotificationCenter, {}), /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
        type: "button",
        variant: "ghost",
        size: "sm",
        onClick: () => setTheme(theme === "light" ? "dark" : "light"),
        className: "h-11 w-11 p-0 bg-secondary/60 hover:bg-secondary text-foreground border border-border/60",
        "aria-label": theme === "light" ? "Ativar modo escuro" : "Ativar modo claro",
        "aria-pressed": theme === "dark",
        children: theme === "light" ? /* @__PURE__ */ jsxRuntimeExports.jsx(Moon, {
          className: "h-4 w-4",
          "aria-hidden": "true"
        }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Sun, {
          className: "h-4 w-4",
          "aria-hidden": "true"
        })
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenu, {
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuTrigger, {
          asChild: true,
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
            variant: "ghost",
            size: "sm",
            className: "h-11 w-11 p-0 bg-secondary/60 hover:bg-secondary text-foreground border border-border/60 rounded-full flex items-center justify-center",
            "aria-label": "Abrir menu do utilizador",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
              className: "h-9 w-9 rounded-full bg-teya-green/20 flex items-center justify-center text-teya-green font-medium text-sm",
              children: avatarInitial
            })
          })
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuContent, {
          align: "end",
          className: "w-56 bg-zinc-950 border-zinc-800 text-zinc-100",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuLabel, {
            className: "font-normal",
            children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "flex flex-col space-y-1",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                className: "text-sm font-medium",
                children: displayName
              }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                className: "text-xs text-zinc-500",
                children: t("general.account_management")
              })]
            })
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuSeparator, {
            className: "bg-zinc-800"
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, {
            onClick: () => setLocation("/profile"),
            className: "hover:bg-teya-green/10 hover:text-teya-green cursor-pointer",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CircleUser, {
              className: "mr-2 h-4 w-4"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
              children: t("navigation.my_account")
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, {
            onClick: () => setLocation("/help"),
            className: "hover:bg-zinc-800 cursor-pointer",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CircleHelp, {
              className: "mr-2 h-4 w-4"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
              children: t("navigation.help")
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuSeparator, {
            className: "bg-zinc-800"
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, {
            onClick: handleSignOut,
            className: "hover:bg-red-500/10 hover:text-red-500 cursor-pointer text-red-500",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(LogOut, {
              className: "mr-2 h-4 w-4"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
              children: t("navigation.log_out")
            })]
          })]
        })]
      })]
    })]
  });
}
function MainLayout({
  children
}) {
  const {
    theme
  } = useTheme();
  reactExports.useEffect(() => {
    if (theme === "dark") {
      document.body.classList.add("dashboard-dark");
    } else {
      document.body.classList.remove("dashboard-dark");
    }
    document.body.classList.remove("landing-page");
    return () => {
      document.body.classList.remove("dashboard-dark");
    };
  }, [theme]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
    className: "min-h-screen bg-background flex",
    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("a", {
      href: "#conteudo-principal",
      className: "sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-1/2 focus:-translate-x-1/2 focus:px-4 focus:py-2 focus:rounded-md focus:bg-primary focus:text-primary-foreground focus:shadow-lg z-50",
      children: "Saltar para conteúdo principal"
    }), /* @__PURE__ */ jsxRuntimeExports.jsx(CollapsibleSidebar, {}), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
      className: "flex-1 flex flex-col bg-background",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsx(TopBar, {}), /* @__PURE__ */ jsxRuntimeExports.jsx("main", {
        id: "conteudo-principal",
        tabIndex: -1,
        className: "flex-1 overflow-auto bg-background p-6",
        children
      })]
    })]
  });
}
export {
  Briefcase as B,
  ChevronRight as C,
  DropdownMenu as D,
  Heart as H,
  MainLayout as M,
  Volume2 as V,
  DropdownMenuTrigger as a,
  DropdownMenuContent as b,
  DropdownMenuItem as c,
  DropdownMenuSeparator as d,
  ChevronLeft as e,
  ChartPie as f,
  Bell as g,
  CircleHelp as h
};
