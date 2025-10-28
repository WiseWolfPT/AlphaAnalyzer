import { u as useLocation, j as jsxRuntimeExports, C as Card, a as CardHeader, b as CardTitle, c as CardContent, S as Settings, d as CardDescription } from "./index-DF734YkB.js";
import { useAdminAccess } from "./AdminRoute-DsPRXqhR.js";
import { S as Shield } from "./shield-Sv89QQud.js";
import { U as Users } from "./users-DgdKh9Ro.js";
import { A as Activity } from "./activity-TJHkan0R.js";
import { D as Database } from "./database-BIWFOkVP.js";
import { D as DollarSign } from "./dollar-sign-BDD_kA4E.js";
import { F as FileText } from "./file-text-BCjG82i7.js";
import { A as ArrowRight } from "./arrow-right-B8plmmKU.js";
import "./badge-Bax4ZZX3.js";
import "./log-in-CA1V17qY.js";
import "./menu-CG6pfADK.js";
function AdminDashboard() {
  const [, setLocation] = useLocation();
  const {
    permissions,
    isSuperAdmin
  } = useAdminAccess();
  const adminSections = [{
    title: "Gestão de Utilizadores",
    description: "Gerir utilizadores, roles e permissões",
    icon: Users,
    path: "/admin/users",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    permission: "canManageUsers",
    stats: "Total: 8 utilizadores"
  }, {
    title: "Transcrições",
    description: "Gerir transcrições de earnings calls",
    icon: FileText,
    path: "/admin/transcripts",
    color: "text-green-600",
    bgColor: "bg-green-50",
    permission: "canManageTranscripts",
    stats: "Pendentes: 3"
  }, {
    title: "API Monitoring",
    description: "Monitorizar uso e performance das APIs",
    icon: Activity,
    path: "/admin/api-monitoring",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    permission: "canViewApiMonitoring",
    stats: "Status: Operacional"
  }, {
    title: "Cache Management",
    description: "Gerir cache Redis e otimização",
    icon: Database,
    path: "/admin/cache",
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    permission: "canViewApiMonitoring",
    stats: "Hit Rate: 92%"
  }, {
    title: "Configurações",
    description: "Configurações do sistema",
    icon: Settings,
    path: "/admin/settings",
    color: "text-gray-600",
    bgColor: "bg-gray-50",
    permission: "canManageSettings",
    stats: "Última atualização: Hoje"
  }];
  const quickStats = [{
    label: "Utilizadores Ativos",
    value: "1,247",
    change: "+12%",
    icon: Users
  }, {
    label: "API Calls Hoje",
    value: "8,543",
    change: "+23%",
    icon: Activity
  }, {
    label: "Cache Hit Rate",
    value: "92%",
    change: "+5%",
    icon: Database
  }, {
    label: "Receita Mensal",
    value: "€4,231",
    change: "+18%",
    icon: DollarSign
  }];
  const canAccess = (permission) => {
    if (isSuperAdmin) return true;
    if (!permission || !permissions) return false;
    return permissions[permission];
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
    className: "space-y-6",
    children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
      className: "flex items-center justify-between",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h1", {
          className: "text-3xl font-bold",
          children: "Dashboard Administrativo"
        }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
          className: "text-muted-foreground",
          children: "Bem-vindo ao painel de administração do Alfalyzer"
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "flex items-center gap-2",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Shield, {
          className: "w-5 h-5 text-red-600"
        }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
          className: "font-semibold",
          children: isSuperAdmin ? "Super Admin" : "Admin"
        })]
      })]
    }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
      className: "grid gap-4 md:grid-cols-2 lg:grid-cols-4",
      children: quickStats.map((stat, index) => {
        const Icon = stat.icon;
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, {
            className: "flex flex-row items-center justify-between space-y-0 pb-2",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, {
              className: "text-sm font-medium",
              children: stat.label
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, {
              className: "h-4 w-4 text-muted-foreground"
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
              className: "text-2xl font-bold",
              children: stat.value
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
              className: "text-xs text-muted-foreground",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                className: "text-green-600",
                children: stat.change
              }), " vs mês anterior"]
            })]
          })]
        }, index);
      })
    }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
      className: "grid gap-6 md:grid-cols-2 lg:grid-cols-3",
      children: adminSections.map((section) => {
        const Icon = section.icon;
        const hasAccess = canAccess(section.permission);
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
          className: `cursor-pointer transition-all hover:shadow-lg ${!hasAccess ? "opacity-50 cursor-not-allowed" : ""}`,
          onClick: () => hasAccess && setLocation(section.path),
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "flex items-center justify-between",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                className: `p-2 rounded-lg ${section.bgColor}`,
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, {
                  className: `w-6 h-6 ${section.color}`
                })
              }), hasAccess && /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, {
                className: "w-4 h-4 text-gray-400"
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, {
              className: "mt-4",
              children: section.title
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardDescription, {
              children: section.description
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("p", {
              className: "text-sm text-muted-foreground",
              children: section.stats
            }), !hasAccess && /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
              className: "text-xs text-red-500 mt-2",
              children: "Sem permissão de acesso"
            })]
          })]
        }, section.path);
      })
    }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
      children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, {
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, {
          children: "Atividade Recente"
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardDescription, {
          children: "Últimas ações administrativas"
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "space-y-4",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "flex items-center justify-between",
            children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "flex items-center gap-3",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                className: "w-2 h-2 bg-green-500 rounded-full"
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                  className: "text-sm font-medium",
                  children: "Nova transcrição adicionada"
                }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                  className: "text-xs text-muted-foreground",
                  children: "AAPL Q4 2024 - há 2 horas"
                })]
              })]
            })
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "flex items-center justify-between",
            children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "flex items-center gap-3",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                className: "w-2 h-2 bg-blue-500 rounded-full"
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                  className: "text-sm font-medium",
                  children: "Cache limpo com sucesso"
                }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                  className: "text-xs text-muted-foreground",
                  children: "Redis cache reset - há 5 horas"
                })]
              })]
            })
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "flex items-center justify-between",
            children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "flex items-center gap-3",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                className: "w-2 h-2 bg-yellow-500 rounded-full"
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                  className: "text-sm font-medium",
                  children: "API limit alcançado"
                }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                  className: "text-xs text-muted-foreground",
                  children: "Alpha Vantage - há 1 dia"
                })]
              })]
            })
          })]
        })
      })]
    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
      className: "grid gap-4 md:grid-cols-2",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, {
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, {
            children: "Saúde do Sistema"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardDescription, {
            children: "Status dos serviços principais"
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "space-y-3",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "flex items-center justify-between",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                className: "text-sm",
                children: "Backend API"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                className: "text-sm text-green-600 font-medium",
                children: "Operacional"
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "flex items-center justify-between",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                className: "text-sm",
                children: "Redis Cache"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                className: "text-sm text-green-600 font-medium",
                children: "Operacional"
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "flex items-center justify-between",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                className: "text-sm",
                children: "Supabase"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                className: "text-sm text-green-600 font-medium",
                children: "Conectado"
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "flex items-center justify-between",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                className: "text-sm",
                children: "Workers"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                className: "text-sm text-yellow-600 font-medium",
                children: "2 ativos"
              })]
            })]
          })
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, {
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, {
            children: "Métricas de Performance"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardDescription, {
            children: "Últimas 24 horas"
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "space-y-3",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "flex items-center justify-between",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                className: "text-sm",
                children: "Tempo de resposta médio"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                className: "text-sm font-medium",
                children: "125ms"
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "flex items-center justify-between",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                className: "text-sm",
                children: "Taxa de erro"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                className: "text-sm font-medium",
                children: "0.03%"
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "flex items-center justify-between",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                className: "text-sm",
                children: "Uptime"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                className: "text-sm font-medium",
                children: "99.98%"
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "flex items-center justify-between",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                className: "text-sm",
                children: "Requisições totais"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                className: "text-sm font-medium",
                children: "45.2k"
              })]
            })]
          })
        })]
      })]
    })]
  });
}
export {
  AdminDashboard as default
};
