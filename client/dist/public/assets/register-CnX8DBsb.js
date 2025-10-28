import { u as useLocation, r as reactExports, j as jsxRuntimeExports, C as Card, a as CardHeader, b as CardTitle, d as CardDescription, c as CardContent, B as Button, n as TrendingUp, o as Alert, p as AlertDescription, k as Link } from "./index-DF734YkB.js";
import { useForm } from "./index.esm-CjJt7FRq.js";
import { t, C as Chrome, o as objectType, b as booleanType, e as enumType, s as stringType } from "./types-CrDpud44.js";
import { I as Input } from "./input-vX2xFcRS.js";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "./form-Bz_iT-1k.js";
import { S as Select, a as SelectTrigger, b as SelectValue, c as SelectContent, d as SelectItem } from "./select-Bm8Ccf9j.js";
import { C as Checkbox } from "./checkbox-OuCn5j1A.js";
import { u as useAuthMonitoring, S as Separator, E as EyeOff } from "./use-auth-monitoring-Ca9Wv08z.js";
import { S as Shield } from "./shield-Sv89QQud.js";
import { E as Eye } from "./eye-DQw-lb5A.js";
import "./index-IXOTxK3N.js";
import "./index-Dx7UitrF.js";
import "./chevron-down-BYhiF8im.js";
const registerSchema = objectType({
  name: stringType().min(2, "Nome deve ter pelo menos 2 caracteres").min(1, "Nome é obrigatório"),
  email: stringType().email("Email inválido").min(1, "Email é obrigatório"),
  password: stringType().min(8, "Password deve ter pelo menos 8 caracteres").regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password deve conter pelo menos: 1 minúscula, 1 maiúscula, 1 número"),
  preferred_currency: enumType(["EUR", "USD"]),
  preferred_region: enumType(["EU", "USA"]),
  terms_accepted: booleanType().refine((val) => val === true, {
    message: "Deve aceitar os termos e condições"
  })
});
function RegisterPage() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = reactExports.useState(false);
  const [isLoading, setIsLoading] = reactExports.useState(false);
  const [error, setError] = reactExports.useState(null);
  const [success, setSuccess] = reactExports.useState(false);
  const auth = useAuthMonitoring();
  const form = useForm({
    resolver: t(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      preferred_currency: "EUR",
      // Default for Portuguese users
      preferred_region: "EU",
      terms_accepted: false
    }
  });
  const onSubmit = async (data) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await auth.signUp(data.email, data.password, {
        name: data.name,
        preferred_currency: data.preferred_currency,
        preferred_region: data.preferred_region,
        preferred_language: "pt"
      });
      if (result.error) {
        setError(result.error.message);
      } else {
        setSuccess(true);
      }
    } catch (error2) {
      setError("Erro inesperado. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };
  const handleGoogleSignUp = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await auth.signInWithGoogle();
      if (result.error) {
        setError(result.error.message);
      }
    } catch (error2) {
      setError("Erro no registo com Google. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };
  if (success) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
      className: "min-h-screen flex items-center justify-center px-8 py-12",
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
        className: "w-full max-w-md",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, {
          className: "text-center",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "mx-auto w-16 h-16 bg-teya-green/10 rounded-full flex items-center justify-center mb-4",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(Shield, {
              className: "h-8 w-8 text-teya-green"
            })
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, {
            className: "text-2xl",
            children: "Conta Criada! 🎉"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardDescription, {
            children: "Verifique o seu email para ativar a conta"
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
          className: "text-center space-y-4",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
            className: "text-sm text-muted-foreground",
            children: ["Enviámos um email de confirmação para ", /* @__PURE__ */ jsxRuntimeExports.jsx("strong", {
              children: form.getValues("email")
            }), ". Clique no link para ativar a sua conta."]
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
            onClick: () => setLocation("/auth/login"),
            className: "w-full",
            children: "Ir para Login"
          })]
        })]
      })
    });
  }
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
          children: ["Comece a investir nos", /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
            className: "text-teya-green",
            children: " mercados globais"
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
          className: "text-xl text-muted-foreground mb-8",
          children: "Junte-se a milhares de investidores portugueses que acedem aos mercados americanos e europeus com ferramentas profissionais."
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "space-y-4",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex items-center space-x-3",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
              className: "w-2 h-2 bg-teya-green rounded-full"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
              children: "Conta gratuita com funcionalidades básicas"
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex items-center space-x-3",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
              className: "w-2 h-2 bg-teya-green rounded-full"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
              children: "Configuração automática para mercado português"
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "flex items-center space-x-3",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
              className: "w-2 h-2 bg-teya-green rounded-full"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
              children: "Interface em português, dados em EUR/USD"
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
            children: "Criar Conta Gratuita"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardDescription, {
            className: "text-center",
            children: "Acesso aos mercados globais em 2 minutos"
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
            onClick: handleGoogleSignUp,
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
                children: "Ou criar com email"
              })
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(Form, {
            ...form,
            children: /* @__PURE__ */ jsxRuntimeExports.jsxs("form", {
              onSubmit: form.handleSubmit(onSubmit),
              className: "space-y-4",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(FormField, {
                control: form.control,
                name: "name",
                render: ({
                  field
                }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(FormItem, {
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx(FormLabel, {
                    children: "Nome Completo"
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx(FormControl, {
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx(Input, {
                      placeholder: "João Silva",
                      disabled: isLoading,
                      ...field
                    })
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx(FormMessage, {})]
                })
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(FormField, {
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
                      placeholder: "joao@exemplo.com",
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
                        placeholder: "Mínimo 8 caracteres",
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
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className: "grid grid-cols-2 gap-4",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(FormField, {
                  control: form.control,
                  name: "preferred_currency",
                  render: ({
                    field
                  }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(FormItem, {
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx(FormLabel, {
                      children: "Moeda Principal"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, {
                      onValueChange: field.onChange,
                      defaultValue: field.value,
                      children: [/* @__PURE__ */ jsxRuntimeExports.jsx(FormControl, {
                        children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, {
                          children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {
                            placeholder: "Selecionar"
                          })
                        })
                      }), /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, {
                        children: [/* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                          value: "EUR",
                          children: "EUR (€)"
                        }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                          value: "USD",
                          children: "USD ($)"
                        })]
                      })]
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx(FormMessage, {})]
                  })
                }), /* @__PURE__ */ jsxRuntimeExports.jsx(FormField, {
                  control: form.control,
                  name: "preferred_region",
                  render: ({
                    field
                  }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(FormItem, {
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx(FormLabel, {
                      children: "Mercado Foco"
                    }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, {
                      onValueChange: field.onChange,
                      defaultValue: field.value,
                      children: [/* @__PURE__ */ jsxRuntimeExports.jsx(FormControl, {
                        children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, {
                          children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {
                            placeholder: "Selecionar"
                          })
                        })
                      }), /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, {
                        children: [/* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                          value: "EU",
                          children: "Europa"
                        }), /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, {
                          value: "USA",
                          children: "Estados Unidos"
                        })]
                      })]
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx(FormMessage, {})]
                  })
                })]
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(FormField, {
                control: form.control,
                name: "terms_accepted",
                render: ({
                  field
                }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(FormItem, {
                  className: "flex flex-row items-start space-x-3 space-y-0",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx(FormControl, {
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx(Checkbox, {
                      checked: field.value,
                      onCheckedChange: field.onChange,
                      disabled: isLoading
                    })
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "space-y-1 leading-none",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(FormLabel, {
                      className: "text-sm font-normal",
                      children: ["Aceito os", " ", /* @__PURE__ */ jsxRuntimeExports.jsx(Link, {
                        href: "/terms-of-service",
                        children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
                          variant: "link",
                          className: "px-1 h-auto font-normal text-sm",
                          children: "Termos e Condições"
                        })
                      }), " ", "e", " ", /* @__PURE__ */ jsxRuntimeExports.jsx(Link, {
                        href: "/privacy-policy",
                        children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
                          variant: "link",
                          className: "px-1 h-auto font-normal text-sm",
                          children: "Política de Privacidade"
                        })
                      })]
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx(FormMessage, {})]
                  })]
                })
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
                type: "submit",
                disabled: isLoading,
                className: "w-full",
                children: isLoading ? "A criar conta..." : "Criar Conta Gratuita"
              })]
            })
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "text-center text-sm text-muted-foreground",
            children: ["Já tem conta?", " ", /* @__PURE__ */ jsxRuntimeExports.jsx(Link, {
              href: "/auth/login",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
                variant: "link",
                className: "px-1 font-normal",
                children: "Fazer login"
              })
            })]
          })]
        })]
      })
    })]
  });
}
export {
  RegisterPage as default
};
