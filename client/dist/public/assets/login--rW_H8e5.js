import { u as useLocation, r as reactExports, j as jsxRuntimeExports, n as TrendingUp, C as Card, a as CardHeader, b as CardTitle, d as CardDescription, c as CardContent, o as Alert, p as AlertDescription, B as Button, k as Link } from "./index-DF734YkB.js";
import { useForm } from "./index.esm-CjJt7FRq.js";
import { t, C as Chrome, o as objectType, s as stringType } from "./types-CrDpud44.js";
import { I as Input } from "./input-vX2xFcRS.js";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "./form-Bz_iT-1k.js";
import { u as useAuthMonitoring, S as Separator, E as EyeOff } from "./use-auth-monitoring-Ca9Wv08z.js";
import { E as Eye } from "./eye-DQw-lb5A.js";
const loginSchema = objectType({
  email: stringType().email("Email inválido").min(1, "Email é obrigatório"),
  password: stringType().min(6, "Password deve ter pelo menos 6 caracteres").min(1, "Password é obrigatória")
});
function LoginPage() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = reactExports.useState(false);
  const [isLoading, setIsLoading] = reactExports.useState(false);
  const [error, setError] = reactExports.useState(null);
  const auth = useAuthMonitoring();
  const form = useForm({
    resolver: t(loginSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });
  const onSubmit = async (data) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await auth.signIn(data.email, data.password);
      if (result.error) {
        setError(result.error.message);
      } else if (result.user) {
        console.log("User metadata:", result.user.user_metadata);
        console.log("User role:", result.user.user_metadata?.role);
        const isAdmin = result.user.user_metadata?.role === "admin" || result.user.email === "alfalyzer@gmail.com";
        if (isAdmin) {
          console.log("Redirecting admin to /admin");
          setLocation("/admin");
        } else {
          console.log("Redirecting regular user to /find-stocks");
          setLocation("/find-stocks");
        }
      }
    } catch (error2) {
      setError("Erro inesperado. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await auth.signInWithGoogle();
      if (result.error) {
        setError(result.error.message);
      }
    } catch (error2) {
      setError("Erro no login com Google. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
    className: "min-h-screen flex",
    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
      className: "hidden lg:flex lg:w-1/2 bg-gradient-to-br from-teya-green/10 to-teya-green/5 flex-col justify-center px-12",
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "max-w-lg",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "flex items-center space-x-2 mb-8",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, {
            className: "h-8 w-8 text-teya-green"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
            className: "text-2xl font-bold",
            children: "Alfalyzer"
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("h1", {
          className: "text-4xl font-bold mb-6",
          children: ["Mercados USA & EU para", /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
            className: "text-teya-green",
            children: " Investidores Portugueses"
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
          className: "text-xl text-muted-foreground mb-8",
          children: "Acesso profissional aos mercados internacionais com análise em tempo real, portfolio tracking e conversão automática EUR/USD."
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "space-y-4",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex items-center space-x-3",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
              className: "w-2 h-2 bg-teya-green rounded-full"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
              children: "Dados em tempo real de NYSE, NASDAQ, Euronext"
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex items-center space-x-3",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
              className: "w-2 h-2 bg-teya-green rounded-full"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
              children: "Portfolio P&L automático com conversão EUR/USD"
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex items-center space-x-3",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
              className: "w-2 h-2 bg-teya-green rounded-full"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
              children: "Análise fundamental de empresas americanas e europeias"
            })]
          })]
        })]
      })
    }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
      className: "w-full lg:w-1/2 flex items-center justify-center px-8 py-12",
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
        className: "w-full max-w-md",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, {
          className: "space-y-1",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, {
            className: "text-2xl text-center",
            children: "Entrar na Alfalyzer"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardDescription, {
            className: "text-center",
            children: "Acesse a sua conta de investimento"
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
          className: "space-y-4",
          children: [error && /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, {
            variant: "destructive",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDescription, {
              children: error
            })
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, {
            variant: "outline",
            onClick: handleGoogleSignIn,
            disabled: isLoading,
            className: "w-full",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Chrome, {
              className: "mr-2 h-4 w-4"
            }), "Continuar com Google"]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "relative",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
              className: "absolute inset-0 flex items-center",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(Separator, {
                className: "w-full"
              })
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
              className: "relative flex justify-center text-xs uppercase",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                className: "bg-background px-2 text-muted-foreground",
                children: "Ou continue com email"
              })
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(Form, {
            ...form,
            children: /* @__PURE__ */ jsxRuntimeExports.jsxs("form", {
              onSubmit: form.handleSubmit(onSubmit),
              className: "space-y-4",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(FormField, {
                control: form.control,
                name: "email",
                render: ({
                  field
                }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(FormItem, {
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx(FormLabel, {
                    children: "Email"
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx(FormControl, {
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx(Input, {
                      type: "email",
                      placeholder: "seu.email@exemplo.com",
                      disabled: isLoading,
                      ...field
                    })
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx(FormMessage, {})]
                })
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(FormField, {
                control: form.control,
                name: "password",
                render: ({
                  field
                }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(FormItem, {
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx(FormLabel, {
                    children: "Password"
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx(FormControl, {
                    children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                      className: "relative",
                      children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Input, {
                        type: showPassword ? "text" : "password",
                        placeholder: "••••••••",
                        disabled: isLoading,
                        ...field
                      }), /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
                        type: "button",
                        variant: "ghost",
                        size: "sm",
                        className: "absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent",
                        onClick: () => setShowPassword(!showPassword),
                        disabled: isLoading,
                        children: showPassword ? /* @__PURE__ */ jsxRuntimeExports.jsx(EyeOff, {
                          className: "h-4 w-4"
                        }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, {
                          className: "h-4 w-4"
                        })
                      })]
                    })
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx(FormMessage, {})]
                })
              }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                className: "flex items-center justify-between",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(Link, {
                  href: "/auth/forgot-password",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
                    type: "button",
                    variant: "link",
                    className: "px-0 font-normal",
                    children: "Esqueceu a password?"
                  })
                })
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
                type: "submit",
                disabled: isLoading,
                className: "w-full",
                children: isLoading ? "A entrar..." : "Entrar"
              })]
            })
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "text-center text-sm text-muted-foreground",
            children: ["Não tem conta?", " ", /* @__PURE__ */ jsxRuntimeExports.jsx(Link, {
              href: "/auth/register",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
                variant: "link",
                className: "px-1 font-normal",
                children: "Criar conta grátis"
              })
            })]
          })]
        })]
      })
    })]
  });
}
export {
  LoginPage as default
};
