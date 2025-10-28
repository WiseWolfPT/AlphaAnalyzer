import { u as useLocation, r as reactExports, j as jsxRuntimeExports, m as motion, n as TrendingUp, C as Card, a as CardHeader, b as CardTitle, c as CardContent, l as CircleCheckBig, B as Button, o as Alert, p as AlertDescription } from "./index-DF734YkB.js";
import { M as MainLayout } from "./main-layout-iPfLAwEH.js";
import { B as Badge } from "./badge-Bax4ZZX3.js";
import { S as Star } from "./star-Cp1OMHQ3.js";
import { C as ChartColumn } from "./chart-column-DNzw3S_G.js";
import { S as Shield } from "./shield-Sv89QQud.js";
import { C as Clock } from "./clock-CEwJtTm9.js";
import { A as ArrowRight } from "./arrow-right-B8plmmKU.js";
import "./dialog-B0u0SV5P.js";
import "./index-DXvlFXpR.js";
import "./input-vX2xFcRS.js";
import "./tabs-CPUG2mtF.js";
import "./index-Dx7UitrF.js";
import "./use-auth-monitoring-Ca9Wv08z.js";
import "./mail-D5HopcQP.js";
import "./lock-C5qTkNPd.js";
import "./eye-DQw-lb5A.js";
import "./user-C46AQImy.js";
import "./menu-CG6pfADK.js";
import "./search-CySG90ju.js";
import "./file-text-BCjG82i7.js";
import "./log-in-CA1V17qY.js";
import "./select-Bm8Ccf9j.js";
import "./index-IXOTxK3N.js";
import "./chevron-down-BYhiF8im.js";
import "./scroll-area-BRs9U-pP.js";
function Trial() {
  const [, setLocation] = useLocation();
  const [isStartingTrial, setIsStartingTrial] = reactExports.useState(false);
  const handleStartTrial = () => {
    setIsStartingTrial(true);
    setTimeout(() => {
      setLocation("/find-stocks");
    }, 1e3);
  };
  const trialFeatures = [{
    icon: TrendingUp,
    title: "Análise de Ações em Tempo Real",
    description: "Dados de mercado atualizados ao segundo para as principais ações"
  }, {
    icon: ChartColumn,
    title: "Gráficos Avançados",
    description: "Ferramentas de análise técnica profissional com indicadores"
  }, {
    icon: Shield,
    title: "Valor Intrínseco",
    description: "Cálculos de valor justo baseados em fundamentos da empresa"
  }, {
    icon: Clock,
    title: "Alertas Personalizados",
    description: "Notificações inteligentes sobre movimentos importantes"
  }];
  const benefits = ["14 dias grátis, sem compromisso", "Acesso completo a todas as funcionalidades", "Suporte por email prioritário", "Cancele a qualquer momento"];
  return /* @__PURE__ */ jsxRuntimeExports.jsx(MainLayout, {
    children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
      className: "container mx-auto px-4 py-8 max-w-4xl",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(motion.div, {
        initial: {
          opacity: 0,
          y: 20
        },
        animate: {
          opacity: 1,
          y: 0
        },
        transition: {
          duration: 0.5
        },
        className: "text-center mb-12",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, {
          className: "mb-4 bg-green-100 text-green-800 border-green-200",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Star, {
            className: "h-4 w-4 mr-2"
          }), "Período de Teste Gratuito"]
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("h1", {
          className: "text-4xl lg:text-5xl font-bold text-foreground mb-4",
          children: ["Teste o Alfalyzer", /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
            className: "text-primary",
            children: " Gratuitamente"
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
          className: "text-xl text-muted-foreground max-w-2xl mx-auto",
          children: "Experimente todas as funcionalidades premium durante 14 dias. Descubra como a análise profissional pode transformar seus investimentos."
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
        className: "grid lg:grid-cols-2 gap-8 mb-12",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(motion.div, {
          initial: {
            opacity: 0,
            x: -20
          },
          animate: {
            opacity: 1,
            x: 0
          },
          transition: {
            duration: 0.5,
            delay: 0.2
          },
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h2", {
            className: "text-2xl font-bold mb-6",
            children: "O que está incluído no teste:"
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "space-y-4",
            children: trialFeatures.map((feature, index) => {
              const Icon = feature.icon;
              return /* @__PURE__ */ jsxRuntimeExports.jsxs(motion.div, {
                initial: {
                  opacity: 0,
                  y: 20
                },
                animate: {
                  opacity: 1,
                  y: 0
                },
                transition: {
                  duration: 0.3,
                  delay: 0.3 + index * 0.1
                },
                className: "flex items-start gap-4 p-4 bg-muted/50 rounded-lg",
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                  className: "w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, {
                    className: "h-5 w-5 text-primary"
                  })
                }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h3", {
                    className: "font-semibold mb-2",
                    children: feature.title
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                    className: "text-sm text-muted-foreground",
                    children: feature.description
                  })]
                })]
              }, feature.title);
            })
          })]
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(motion.div, {
          initial: {
            opacity: 0,
            x: 20
          },
          animate: {
            opacity: 1,
            x: 0
          },
          transition: {
            duration: 0.5,
            delay: 0.4
          },
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
            className: "h-fit sticky top-8",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, {
              className: "text-center",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, {
                className: "text-2xl",
                children: "Começar Teste Gratuito"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                className: "text-4xl font-bold text-primary",
                children: "14 dias"
              }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                className: "text-muted-foreground",
                children: "Depois apenas €29/mês"
              })]
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, {
              className: "space-y-6",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                className: "space-y-3",
                children: benefits.map((benefit, index) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "flex items-center gap-3",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheckBig, {
                    className: "h-5 w-5 text-green-600"
                  }), /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                    className: "text-sm",
                    children: benefit
                  })]
                }, index))
              }), /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
                size: "lg",
                className: "w-full",
                onClick: handleStartTrial,
                disabled: isStartingTrial,
                children: isStartingTrial ? "Iniciando teste..." : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, {
                  children: ["Começar Teste Agora", /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, {
                    className: "h-4 w-4 ml-2"
                  })]
                })
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, {
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Shield, {
                  className: "h-4 w-4"
                }), /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDescription, {
                  className: "text-sm",
                  children: "Sem cartão de crédito necessário. Cancele a qualquer momento durante o período de teste."
                })]
              })]
            })]
          })
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsxs(motion.div, {
        initial: {
          opacity: 0,
          y: 20
        },
        animate: {
          opacity: 1,
          y: 0
        },
        transition: {
          duration: 0.5,
          delay: 0.6
        },
        className: "text-center",
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h2", {
          className: "text-2xl font-bold mb-6",
          children: "Perguntas Frequentes"
        }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "grid md:grid-cols-2 gap-6 text-left",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h3", {
              className: "font-semibold mb-2",
              children: "Como funciona o período de teste?"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
              className: "text-sm text-muted-foreground",
              children: "Acesso completo durante 14 dias. Após o período, pode escolher um plano ou cancelar sem custos."
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h3", {
              className: "font-semibold mb-2",
              children: "Preciso de cartão de crédito?"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
              className: "text-sm text-muted-foreground",
              children: "Não. O teste é completamente gratuito, sem necessidade de dados de pagamento."
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h3", {
              className: "font-semibold mb-2",
              children: "Posso cancelar a qualquer momento?"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
              className: "text-sm text-muted-foreground",
              children: "Sim, pode cancelar durante o teste ou após a subscrição sem penalizações."
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h3", {
              className: "font-semibold mb-2",
              children: "Que suporte recebo?"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
              className: "text-sm text-muted-foreground",
              children: "Suporte por email prioritário durante todo o período de teste."
            })]
          })]
        })]
      })]
    })
  });
}
export {
  Trial as default
};
