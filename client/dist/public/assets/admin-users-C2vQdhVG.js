import { e as createLucideIcon, r as reactExports, j as jsxRuntimeExports, C as Card, a as CardHeader, b as CardTitle, c as CardContent, d as CardDescription, B as Button, L as Label } from "./index-DF734YkB.js";
import { B as Badge } from "./badge-Bax4ZZX3.js";
import { I as Input } from "./input-vX2xFcRS.js";
import { C as Calendar, T as Tabs, a as TabsList, b as TabsTrigger, c as TabsContent } from "./tabs-CPUG2mtF.js";
import { useAdminAccess } from "./AdminRoute-DsPRXqhR.js";
import { U as Users } from "./users-DgdKh9Ro.js";
import { U as UserCheck } from "./user-check-CNVfRLKG.js";
import { S as Search } from "./search-CySG90ju.js";
import { M as Mail } from "./mail-D5HopcQP.js";
import { E as Eye } from "./eye-DQw-lb5A.js";
import { T as Trash2 } from "./trash-2-BYXtUTac.js";
import { A as Activity } from "./activity-TJHkan0R.js";
import { S as Shield } from "./shield-Sv89QQud.js";
import "./index-Dx7UitrF.js";
import "./log-in-CA1V17qY.js";
import "./database-BIWFOkVP.js";
import "./file-text-BCjG82i7.js";
import "./menu-CG6pfADK.js";
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const UserX = createLucideIcon("UserX", [
  ["path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", key: "1yyitq" }],
  ["circle", { cx: "9", cy: "7", r: "4", key: "nufk8" }],
  ["line", { x1: "17", x2: "22", y1: "8", y2: "13", key: "3nzzx3" }],
  ["line", { x1: "22", x2: "17", y1: "8", y2: "13", key: "1swrse" }]
]);
function AdminUsers() {
  const [users, setUsers] = reactExports.useState([]);
  const [stats, setStats] = reactExports.useState(null);
  const [searchTerm, setSearchTerm] = reactExports.useState("");
  const [loading, setLoading] = reactExports.useState(true);
  const [selectedUser, setSelectedUser] = reactExports.useState(null);
  const {
    permissions,
    isSuperAdmin,
    isLoadingPermissions
  } = useAdminAccess();
  const canManageUsers = isSuperAdmin || permissions?.canManageUsers;
  reactExports.useEffect(() => {
    fetchUsers();
    fetchUserStats();
  }, []);
  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/admin/users");
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
      setUsers([{
        id: "1",
        email: "usuario1@exemplo.com",
        name: "João Silva",
        created_at: "2025-01-15T10:30:00Z",
        last_seen: "2025-07-13T09:15:00Z",
        status: "active",
        role: "user",
        portfolio_count: 3,
        watchlist_count: 5,
        api_requests_today: 23
      }, {
        id: "2",
        email: "admin@alfalyzer.com",
        name: "Admin Sistema",
        created_at: "2024-12-01T00:00:00Z",
        last_seen: "2025-07-13T15:30:00Z",
        status: "active",
        role: "admin",
        portfolio_count: 1,
        watchlist_count: 8,
        api_requests_today: 145
      }, {
        id: "3",
        email: "usuario2@exemplo.com",
        created_at: "2025-07-10T14:20:00Z",
        last_seen: "2025-07-12T18:45:00Z",
        status: "inactive",
        role: "user",
        portfolio_count: 0,
        watchlist_count: 2,
        api_requests_today: 0
      }]);
    } finally {
      setLoading(false);
    }
  };
  const fetchUserStats = async () => {
    try {
      const response = await fetch("/api/admin/users/stats");
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
      setStats({
        totalUsers: 156,
        activeUsers: 89,
        newUsersToday: 7,
        bannedUsers: 2
      });
    }
  };
  const toggleUserStatus = async (userId, newStatus) => {
    if (!canManageUsers) {
      console.warn("Attempted to toggle user status without permission");
      return;
    }
    try {
      await fetch(`/api/admin/users/${userId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          status: newStatus
        })
      });
      setUsers(users.map((user) => user.id === userId ? {
        ...user,
        status: newStatus
      } : user));
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
    }
  };
  const deleteUser = async (userId) => {
    if (!canManageUsers) {
      console.warn("Attempted to delete user without permission");
      return;
    }
    if (!confirm("Tem certeza que deseja excluir este usuário? Esta ação não pode ser revertida.")) {
      return;
    }
    try {
      await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE"
      });
      setUsers(users.filter((user) => user.id !== userId));
      setSelectedUser(null);
    } catch (error) {
      console.error("Erro ao excluir usuário:", error);
    }
  };
  const filteredUsers = users.filter((user) => user.email.toLowerCase().includes(searchTerm.toLowerCase()) || user.name?.toLowerCase().includes(searchTerm.toLowerCase()));
  const getStatusBadge = (status) => {
    switch (status) {
      case "active":
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, {
          className: "bg-green-100 text-green-800",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(UserCheck, {
            className: "w-3 h-3 mr-1"
          }), "Ativo"]
        });
      case "inactive":
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, {
          variant: "secondary",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Activity, {
            className: "w-3 h-3 mr-1"
          }), "Inativo"]
        });
      case "banned":
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, {
          className: "bg-red-100 text-red-800",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(UserX, {
            className: "w-3 h-3 mr-1"
          }), "Banido"]
        });
      default:
        return /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, {
          variant: "outline",
          children: status
        });
    }
  };
  const getRoleBadge = (role) => {
    switch (role) {
      case "admin":
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, {
          className: "bg-purple-100 text-purple-800",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Shield, {
            className: "w-3 h-3 mr-1"
          }), "Admin"]
        });
      case "user":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, {
          variant: "outline",
          children: "Usuário"
        });
      default:
        return /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, {
          variant: "outline",
          children: role
        });
    }
  };
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };
  const getLastSeenText = (lastSeen) => {
    if (!lastSeen) return "Nunca conectado";
    const now = /* @__PURE__ */ new Date();
    const lastSeenDate = new Date(lastSeen);
    const diffHours = (now.getTime() - lastSeenDate.getTime()) / (1e3 * 60 * 60);
    if (diffHours < 1) return "Online agora";
    if (diffHours < 24) return `${Math.floor(diffHours)}h atrás`;
    return formatDate(lastSeen);
  };
  if (loading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
      className: "flex items-center justify-center h-64",
      children: "Carregando usuários..."
    });
  }
  if (!canManageUsers && !isLoadingPermissions) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
      className: "p-8 text-center text-sm text-muted-foreground",
      children: "Você não tem permissões para gerir usuários. Contacte um super administrador para obter acesso."
    });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
    className: "space-y-6 p-6",
    children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
      children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h1", {
        className: "text-3xl font-bold",
        children: "Gerenciamento de Usuários"
      }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
        className: "text-muted-foreground",
        children: "Administração e monitoramento de usuários do sistema"
      })]
    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
      className: "grid gap-4 md:grid-cols-2 lg:grid-cols-4",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, {
          className: "flex flex-row items-center justify-between space-y-0 pb-2",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, {
            className: "text-sm font-medium",
            children: "Total de Usuários"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(Users, {
            className: "h-4 w-4 text-muted-foreground"
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
          children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "text-2xl font-bold",
            children: stats?.totalUsers
          })
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, {
          className: "flex flex-row items-center justify-between space-y-0 pb-2",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, {
            className: "text-sm font-medium",
            children: "Usuários Ativos"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(UserCheck, {
            className: "h-4 w-4 text-muted-foreground"
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
          children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "text-2xl font-bold text-green-600",
            children: stats?.activeUsers
          })
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, {
          className: "flex flex-row items-center justify-between space-y-0 pb-2",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, {
            className: "text-sm font-medium",
            children: "Novos Hoje"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(Calendar, {
            className: "h-4 w-4 text-muted-foreground"
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
          children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "text-2xl font-bold text-blue-600",
            children: stats?.newUsersToday
          })
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, {
          className: "flex flex-row items-center justify-between space-y-0 pb-2",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, {
            className: "text-sm font-medium",
            children: "Usuários Banidos"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(UserX, {
            className: "h-4 w-4 text-muted-foreground"
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
          children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "text-2xl font-bold text-red-600",
            children: stats?.bannedUsers
          })
        })]
      })]
    }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Tabs, {
      defaultValue: "list",
      className: "space-y-4",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(TabsList, {
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, {
          value: "list",
          children: "Lista de Usuários"
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, {
          value: "details",
          children: "Detalhes do Usuário"
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, {
        value: "list",
        className: "space-y-4",
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, {
            children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "flex items-center justify-between",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, {
                  children: "Usuários Registrados"
                }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardDescription, {
                  children: "Lista completa de usuários do sistema"
                })]
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "flex items-center space-x-2",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Search, {
                  className: "w-4 h-4 text-muted-foreground"
                }), /* @__PURE__ */ jsxRuntimeExports.jsx(Input, {
                  placeholder: "Buscar por email ou nome...",
                  value: searchTerm,
                  onChange: (e) => setSearchTerm(e.target.value),
                  className: "w-64"
                })]
              })]
            })
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
            children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
              className: "space-y-4",
              children: filteredUsers.map((user) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "flex items-center justify-between p-4 border rounded-lg",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "flex items-center space-x-4",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                    className: "w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold",
                    children: user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                      className: "font-medium",
                      children: user.name || "Nome não informado"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
                      className: "text-sm text-muted-foreground flex items-center",
                      children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Mail, {
                        className: "w-3 h-3 mr-1"
                      }), user.email]
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
                      className: "text-xs text-muted-foreground",
                      children: ["Último acesso: ", getLastSeenText(user.last_seen)]
                    })]
                  })]
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "flex items-center space-x-2",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "text-right text-sm",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
                      children: [user.portfolio_count, " portfólios"]
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
                      className: "text-muted-foreground",
                      children: [user.api_requests_today, " requests hoje"]
                    })]
                  }), getStatusBadge(user.status), getRoleBadge(user.role), /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
                    variant: "outline",
                    size: "sm",
                    onClick: () => setSelectedUser(user),
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, {
                      className: "w-4 h-4"
                    })
                  })]
                })]
              }, user.id))
            })
          })]
        })
      }), /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, {
        value: "details",
        className: "space-y-4",
        children: selectedUser ? /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, {
              children: "Detalhes do Usuário"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardDescription, {
              children: "Informações detalhadas e ações administrativas"
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
            className: "space-y-6",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "grid gap-4 md:grid-cols-2",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label, {
                  children: "Email"
                }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                  className: "text-sm",
                  children: selectedUser.email
                })]
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label, {
                  children: "Nome"
                }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                  className: "text-sm",
                  children: selectedUser.name || "Não informado"
                })]
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label, {
                  children: "Data de Cadastro"
                }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                  className: "text-sm",
                  children: formatDate(selectedUser.created_at)
                })]
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label, {
                  children: "Último Acesso"
                }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                  className: "text-sm",
                  children: getLastSeenText(selectedUser.last_seen)
                })]
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label, {
                  children: "Portfólios"
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
                  className: "text-sm",
                  children: [selectedUser.portfolio_count, " criados"]
                })]
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label, {
                  children: "Watchlists"
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
                  className: "text-sm",
                  children: [selectedUser.watchlist_count, " itens"]
                })]
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "flex items-center space-x-2",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Label, {
                children: "Status Atual:"
              }), getStatusBadge(selectedUser.status), getRoleBadge(selectedUser.role)]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "flex space-x-2 pt-4 border-t",
              children: [selectedUser.status === "active" ? /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
                variant: "destructive",
                onClick: () => toggleUserStatus(selectedUser.id, "banned"),
                disabled: !canManageUsers,
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(UserX, {
                  className: "w-4 h-4 mr-2"
                }), "Banir Usuário"]
              }) : selectedUser.status === "banned" ? /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
                onClick: () => toggleUserStatus(selectedUser.id, "active"),
                disabled: !canManageUsers,
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(UserCheck, {
                  className: "w-4 h-4 mr-2"
                }), "Reativar Usuário"]
              }) : null, /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
                variant: "destructive",
                onClick: () => deleteUser(selectedUser.id),
                disabled: !canManageUsers,
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, {
                  className: "w-4 h-4 mr-2"
                }), "Excluir Usuário"]
              })]
            })]
          })]
        }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Card, {
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
            className: "flex items-center justify-center h-32",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
              className: "text-muted-foreground",
              children: "Selecione um usuário da lista para ver os detalhes"
            })
          })
        })
      })]
    })]
  });
}
export {
  AdminUsers as default
};
