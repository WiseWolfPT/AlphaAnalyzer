import { e as createLucideIcon, u as useLocation, r as reactExports, S as Settings, j as jsxRuntimeExports, B as Button, X, f as cn, C as Card, c as CardContent, K as TriangleAlert } from "./index-DF734YkB.js";
import { B as Badge } from "./badge-Bax4ZZX3.js";
import { S as Shield } from "./shield-Sv89QQud.js";
import { L as LogIn } from "./log-in-CA1V17qY.js";
import { A as Activity } from "./activity-TJHkan0R.js";
import { D as Database } from "./database-BIWFOkVP.js";
import { F as FileText } from "./file-text-BCjG82i7.js";
import { U as Users } from "./users-DgdKh9Ro.js";
import { M as Menu, L as LogOut } from "./menu-CG6pfADK.js";
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const LayoutDashboard = createLucideIcon("LayoutDashboard", [
  ["rect", { width: "7", height: "9", x: "3", y: "3", rx: "1", key: "10lvy0" }],
  ["rect", { width: "7", height: "5", x: "14", y: "3", rx: "1", key: "16une8" }],
  ["rect", { width: "7", height: "9", x: "14", y: "12", rx: "1", key: "1hutg5" }],
  ["rect", { width: "7", height: "5", x: "3", y: "16", rx: "1", key: "ldoo1y" }]
]);
const adminNavItems = [{
  id: "dashboard",
  label: "Dashboard",
  icon: LayoutDashboard,
  path: "/admin",
  description: "System overview and statistics"
}, {
  id: "api-monitoring",
  label: "API Monitoring",
  icon: Activity,
  path: "/admin/api-monitoring",
  description: "API usage, quotas, and performance"
}, {
  id: "cache-management",
  label: "Cache Management",
  icon: Database,
  path: "/admin/cache",
  description: "Cache statistics and management"
}, {
  id: "transcripts",
  label: "Transcripts",
  icon: FileText,
  path: "/admin/transcripts",
  description: "Earnings transcript management"
}, {
  id: "users",
  label: "Users",
  icon: Users,
  path: "/admin/users",
  description: "User management and analytics"
}, {
  id: "settings",
  label: "Settings",
  icon: Settings,
  path: "/admin/settings",
  description: "System configuration"
}];
function AdminLayout({
  children
}) {
  const [location, setLocation] = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = reactExports.useState(true);
  const {
    permissions,
    isSuperAdmin,
    isLoadingPermissions
  } = useAdminAccess();
  const allowedNavItems = reactExports.useMemo(() => {
    if (isSuperAdmin) {
      return adminNavItems;
    }
    if (!permissions) {
      return [];
    }
    const canAccess = (id) => {
      switch (id) {
        case "dashboard":
          return permissions.canViewDashboard;
        case "api-monitoring":
        case "cache-management":
          return permissions.canViewApiMonitoring;
        case "transcripts":
          return permissions.canManageTranscripts;
        case "users":
          return permissions.canManageUsers;
        case "settings":
          return permissions.canManageSettings;
        default:
          return true;
      }
    };
    return adminNavItems.filter((item) => canAccess(item.id));
  }, [permissions, isSuperAdmin]);
  const navItemsToRender = allowedNavItems.length > 0 ? allowedNavItems : adminNavItems;
  const currentPath = location;
  const currentNavItem = navItemsToRender.find((item) => item.path === currentPath) || navItemsToRender[0] || adminNavItems[0];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
    className: "min-h-screen bg-gray-50",
    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("header", {
      className: "bg-white shadow-sm border-b",
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "flex items-center justify-between px-4 py-3",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "flex items-center gap-4",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
            variant: "ghost",
            size: "sm",
            onClick: () => setIsSidebarOpen(!isSidebarOpen),
            className: "md:hidden",
            children: isSidebarOpen ? /* @__PURE__ */ jsxRuntimeExports.jsx(X, {
              className: "w-5 h-5"
            }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Menu, {
              className: "w-5 h-5"
            })
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex items-center gap-2",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Shield, {
              className: "w-6 h-6 text-red-600"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("h1", {
              className: "text-xl font-bold",
              children: "Alfalyzer Admin"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, {
              variant: "outline",
              className: "bg-red-50 text-red-700 border-red-200",
              children: "ADMIN ONLY"
            })]
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
          className: "flex items-center gap-2",
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
            variant: "ghost",
            size: "sm",
            onClick: () => setLocation("/dashboard"),
            className: "text-gray-600 hover:text-gray-900",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(LogOut, {
              className: "w-4 h-4 mr-2"
            }), "Exit Admin"]
          })
        })]
      })
    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
      className: "flex",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsx("aside", {
        className: cn("bg-white border-r shadow-sm transition-all duration-300", isSidebarOpen ? "w-72" : "w-0 md:w-16", "md:relative absolute z-10 h-[calc(100vh-64px)]"),
        children: /* @__PURE__ */ jsxRuntimeExports.jsx("nav", {
          className: "p-4 space-y-2",
          children: isLoadingPermissions && !isSuperAdmin ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "space-y-2",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
              className: "h-10 bg-muted animate-pulse rounded"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
              className: "h-10 bg-muted animate-pulse rounded"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
              className: "h-10 bg-muted animate-pulse rounded"
            })]
          }) : navItemsToRender.map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.path;
            return /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
              variant: isActive ? "default" : "ghost",
              className: cn("w-full justify-start gap-3 p-3 h-auto", isActive ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-100", !isSidebarOpen && "md:justify-center md:px-2"),
              onClick: () => setLocation(item.path),
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Icon, {
                className: "w-5 h-5 flex-shrink-0"
              }), (isSidebarOpen || window.innerWidth < 768) && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "text-left",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                  className: "font-medium",
                  children: item.label
                }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                  className: "text-xs opacity-75",
                  children: item.description
                })]
              })]
            }, item.id);
          })
        })
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs("main", {
        className: cn("flex-1 p-6 transition-all duration-300", !isSidebarOpen && "md:ml-4"),
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "mb-6",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex items-center gap-2 text-sm text-gray-600 mb-2",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
              children: "Admin"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
              children: "/"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
              className: "text-gray-900 font-medium",
              children: currentNavItem.label
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("h2", {
            className: "text-2xl font-bold text-gray-900",
            children: currentNavItem.label
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
            className: "text-gray-600 mt-1",
            children: currentNavItem.description
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
          className: "bg-white rounded-lg shadow-sm border",
          children: !isSuperAdmin && !permissions && !isLoadingPermissions ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "p-8 text-center text-sm text-muted-foreground",
            children: "Sem permissões suficientes para visualizar este módulo. Solicite acesso a um super administrador."
          }) : children
        })]
      })]
    })]
  });
}
const AdminAccessContext = reactExports.createContext(void 0);
function useAdminAccess() {
  const context = reactExports.useContext(AdminAccessContext);
  if (!context) {
    throw new Error("useAdminAccess must be used within an AdminRoute context");
  }
  return context;
}
function getStoredAccessToken() {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const directToken = window.localStorage.getItem("auth_token");
    if (directToken) {
      return directToken;
    }
    let supabaseAuthKey = null;
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key && key.startsWith("sb-") && key.includes("-auth-token")) {
        supabaseAuthKey = key;
        break;
      }
    }
    if (!supabaseAuthKey) {
      return null;
    }
    const rawValue = window.localStorage.getItem(supabaseAuthKey);
    if (!rawValue) {
      return null;
    }
    try {
      const parsed = JSON.parse(rawValue);
      if (typeof parsed === "string") {
        return parsed;
      }
      if (parsed?.access_token) {
        return parsed.access_token;
      }
      if (parsed?.currentSession?.access_token) {
        return parsed.currentSession.access_token;
      }
    } catch {
      if (rawValue.startsWith("ey")) {
        return rawValue;
      }
    }
  } catch (error) {
    console.warn("Failed to read auth token from storage", error);
  }
  return null;
}
function buildAuthHeaders() {
  const headers = {
    "Content-Type": "application/json"
  };
  const token = getStoredAccessToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}
function AdminRoute({
  children,
  requireSuperAdmin = false
}) {
  const [, setLocation] = useLocation();
  const [adminCheck, setAdminCheck] = reactExports.useState({
    isAdmin: false,
    isSuperAdmin: false,
    loading: true,
    error: null
  });
  const [permissions, setPermissions] = reactExports.useState(null);
  const [permissionsLoading, setPermissionsLoading] = reactExports.useState(false);
  reactExports.useEffect(() => {
    checkAdminStatus();
  }, []);
  const loadPermissions = async () => {
    setPermissionsLoading(true);
    try {
      const response = await fetch("/api/admin/auth/permissions", {
        headers: buildAuthHeaders(),
        credentials: "include"
        // Include cookies for authentication
      });
      if (!response.ok) {
        setPermissions(null);
        return;
      }
      const data = await response.json();
      setPermissions(data.permissions);
    } catch (error) {
      console.error("Failed to load admin permissions:", error);
      setPermissions(null);
    } finally {
      setPermissionsLoading(false);
    }
  };
  const checkAdminStatus = async () => {
    try {
      const response = await fetch("/api/admin/auth/check", {
        headers: buildAuthHeaders(),
        credentials: "include"
        // Include cookies for authentication
      });
      if (response.status === 401) {
        setAdminCheck({
          isAdmin: false,
          isSuperAdmin: false,
          loading: false,
          error: "Not authenticated"
        });
        setPermissions(null);
        return;
      }
      if (response.status === 403) {
        setAdminCheck({
          isAdmin: false,
          isSuperAdmin: false,
          loading: false,
          error: "Admin access required"
        });
        setPermissions(null);
        return;
      }
      if (response.ok) {
        const data = await response.json();
        setAdminCheck({
          isAdmin: data.isAdmin,
          isSuperAdmin: data.isSuperAdmin,
          loading: false,
          error: null
        });
        if (data.isAdmin) {
          await loadPermissions();
        } else {
          setPermissions(null);
        }
      } else {
        throw new Error("Failed to check admin status");
      }
    } catch (error) {
      console.error("Admin status check failed:", error);
      setAdminCheck({
        isAdmin: false,
        isSuperAdmin: false,
        loading: false,
        error: "Failed to verify admin status"
      });
      setPermissions(null);
    }
  };
  if (adminCheck.loading || adminCheck.isAdmin && permissionsLoading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
      className: "min-h-screen flex items-center justify-center bg-gray-50",
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(Card, {
        className: "w-96",
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
          className: "p-8 text-center",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Shield, {
            className: "w-12 h-12 mx-auto mb-4 text-blue-600 animate-pulse"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("h2", {
            className: "text-xl font-semibold mb-2",
            children: "Verificando Acesso"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
            className: "text-gray-600",
            children: "Validando permissões de administrador..."
          })]
        })
      })
    });
  }
  if (adminCheck.error === "Not authenticated") {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
      className: "min-h-screen flex items-center justify-center bg-gray-50",
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(Card, {
        className: "w-96",
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
          className: "p-8 text-center",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(LogIn, {
            className: "w-12 h-12 mx-auto mb-4 text-orange-600"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("h2", {
            className: "text-xl font-semibold mb-2",
            children: "Autenticação Necessária"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
            className: "text-gray-600 mb-6",
            children: "Faça login para acessar o painel administrativo."
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
            onClick: () => setLocation("/login"),
            className: "w-full",
            children: "Ir para Login"
          })]
        })
      })
    });
  }
  if (!adminCheck.isAdmin || requireSuperAdmin && !adminCheck.isSuperAdmin) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
      className: "min-h-screen flex items-center justify-center bg-gray-50",
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(Card, {
        className: "w-96",
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
          className: "p-8 text-center",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, {
            className: "w-12 h-12 mx-auto mb-4 text-red-600"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("h2", {
            className: "text-xl font-semibold mb-2",
            children: "Acesso Negado"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
            className: "text-gray-600 mb-6",
            children: requireSuperAdmin ? "Você precisa de permissões de super administrador para acessar esta área." : "Você precisa de permissões de administrador para acessar esta área."
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "space-y-2",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
              onClick: () => setLocation("/dashboard"),
              className: "w-full",
              children: "Voltar ao Dashboard"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
              variant: "outline",
              onClick: checkAdminStatus,
              className: "w-full",
              children: "Verificar Novamente"
            })]
          })]
        })
      })
    });
  }
  const contextValue = reactExports.useMemo(() => ({
    isAdmin: adminCheck.isAdmin,
    isSuperAdmin: adminCheck.isSuperAdmin,
    permissions,
    isLoadingPermissions: permissionsLoading,
    refreshPermissions: loadPermissions
  }), [adminCheck.isAdmin, adminCheck.isSuperAdmin, permissions, permissionsLoading]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(AdminAccessContext.Provider, {
    value: contextValue,
    children: /* @__PURE__ */ jsxRuntimeExports.jsx(AdminLayout, {
      children
    })
  });
}
export {
  AdminAccessContext,
  AdminRoute,
  useAdminAccess
};
