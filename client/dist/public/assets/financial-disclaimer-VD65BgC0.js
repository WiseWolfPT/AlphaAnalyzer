import { S as ScrollArea } from "./scroll-area-BRs9U-pP.js";
import { e as createLucideIcon, j as jsxRuntimeExports, m as motion, C as Card, K as TriangleAlert, T as TrendingDown, v as CircleAlert } from "./index-DF734YkB.js";
import { B as Ban, S as Scale } from "./scale-DFDjakUx.js";
import { S as Shield } from "./shield-Sv89QQud.js";
import "./index-Dx7UitrF.js";
import "./index-IXOTxK3N.js";
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const BookOpen = createLucideIcon("BookOpen", [
  ["path", { d: "M12 7v14", key: "1akyts" }],
  [
    "path",
    {
      d: "M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z",
      key: "ruj8y"
    }
  ]
]);
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const ChartBar = createLucideIcon("ChartBar", [
  ["path", { d: "M3 3v16a2 2 0 0 0 2 2h16", key: "c24i48" }],
  ["path", { d: "M7 16h8", key: "srdodz" }],
  ["path", { d: "M7 11h12", key: "127s9w" }],
  ["path", { d: "M7 6h3", key: "w9rmul" }]
]);
function FinancialDisclaimer() {
  const lastUpdated = "24 de Janeiro de 2025";
  const sections = [{
    icon: TriangleAlert,
    title: "AVISO DE RISCO IMPORTANTE",
    critical: true,
    content: `
        <div class="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <p class="font-bold text-red-400 mb-3">INVESTIR ENVOLVE RISCOS SUBSTANCIAIS</p>
          
          <p class="mb-3">O investimento em mercados financeiros pode resultar em perdas significativas, incluindo a perda total do capital investido. Desempenhos passados não são indicativos de resultados futuros.</p>
          
          <p class="mb-3">Você deve considerar cuidadosamente se o investimento é adequado para si à luz da sua situação financeira, experiência, objetivos de investimento e tolerância ao risco.</p>
          
          <p class="font-semibold">NUNCA invista dinheiro que não pode perder.</p>
        </div>
      `
  }, {
    icon: Ban,
    title: "Sem Aconselhamento de Investimento",
    content: `
        <p class="font-semibold mb-3">A Alfalyzer NÃO é uma consultoria de investimentos registada.</p>
        
        <p>Nada neste site constitui:</p>
        <ul class="list-disc pl-6 space-y-2 mt-3">
          <li>Aconselhamento personalizado de investimento</li>
          <li>Recomendações de compra ou venda de valores mobiliários</li>
          <li>Consultoria financeira, fiscal ou jurídica</li>
          <li>Oferta ou solicitação de compra ou venda de instrumentos financeiros</li>
          <li>Garantia ou promessa de retornos de investimento</li>
        </ul>
        
        <p class="mt-4">Todas as informações fornecidas são de natureza geral e para fins educacionais e informativos apenas.</p>
      `
  }, {
    icon: BookOpen,
    title: "Natureza das Informações",
    content: `
        <h4 class="font-semibold mb-2">Finalidade Educacional:</h4>
        <p>A Alfalyzer fornece ferramentas e dados para ajudar na sua própria pesquisa e análise. As informações apresentadas são para fins educacionais e não devem ser interpretadas como recomendações.</p>
        
        <h4 class="font-semibold mb-2 mt-4">Dados de Mercado:</h4>
        <ul class="list-disc pl-6 space-y-1">
          <li>Os dados são obtidos de fornecedores terceiros (FMP, Alpha Vantage)</li>
          <li>Podem conter erros, atrasos ou imprecisões</li>
          <li>Não garantimos a exatidão, completude ou atualidade dos dados</li>
          <li>Os preços mostrados podem ter atraso de 15-20 minutos</li>
        </ul>
        
        <h4 class="font-semibold mb-2 mt-4">Análises e Cálculos:</h4>
        <p>Ferramentas como a calculadora de valor intrínseco são baseadas em modelos teóricos e suposições que podem não refletir a realidade do mercado.</p>
      `
  }, {
    icon: TrendingDown,
    title: "Riscos Específicos de Investimento",
    content: `
        <p class="mb-3">Investir em mercados financeiros envolve múltiplos riscos, incluindo mas não limitado a:</p>
        
        <h4 class="font-semibold mb-2 mt-3">Risco de Mercado:</h4>
        <ul class="list-disc pl-6 space-y-1">
          <li>Flutuações de preços devido a condições económicas</li>
          <li>Volatilidade extrema em certos períodos</li>
          <li>Eventos de "cisne negro" imprevisíveis</li>
        </ul>
        
        <h4 class="font-semibold mb-2 mt-3">Risco de Liquidez:</h4>
        <ul class="list-disc pl-6 space-y-1">
          <li>Dificuldade em vender ativos rapidamente</li>
          <li>Spreads alargados em momentos de stress</li>
          <li>Suspensão de negociação de certos títulos</li>
        </ul>
        
        <h4 class="font-semibold mb-2 mt-3">Risco de Concentração:</h4>
        <ul class="list-disc pl-6 space-y-1">
          <li>Exposição excessiva a um setor ou ativo</li>
          <li>Falta de diversificação adequada</li>
        </ul>
        
        <h4 class="font-semibold mb-2 mt-3">Risco Cambial:</h4>
        <ul class="list-disc pl-6 space-y-1">
          <li>Flutuações nas taxas de câmbio</li>
          <li>Impacto em investimentos internacionais</li>
        </ul>
        
        <h4 class="font-semibold mb-2 mt-3">Risco Regulatório:</h4>
        <ul class="list-disc pl-6 space-y-1">
          <li>Mudanças em leis e regulamentos</li>
          <li>Implicações fiscais não previstas</li>
        </ul>
      `
  }, {
    icon: Scale,
    title: "Responsabilidade Individual",
    content: `
        <p class="font-semibold mb-3">Você é totalmente responsável pelas suas decisões de investimento.</p>
        
        <h4 class="font-semibold mb-2 mt-3">Antes de Investir:</h4>
        <ul class="list-disc pl-6 space-y-2">
          <li>Faça a sua própria pesquisa detalhada (DYOR - Do Your Own Research)</li>
          <li>Consulte profissionais qualificados (consultores financeiros, contabilistas, advogados)</li>
          <li>Avalie a sua situação financeira pessoal</li>
          <li>Determine a sua tolerância ao risco</li>
          <li>Estabeleça objetivos de investimento claros</li>
          <li>Considere o seu horizonte temporal</li>
        </ul>
        
        <h4 class="font-semibold mb-2 mt-4">Diversificação:</h4>
        <p>Não coloque todos os ovos na mesma cesta. A diversificação é essencial para gerir o risco.</p>
      `
  }, {
    icon: ChartBar,
    title: "Desempenho Histórico",
    content: `
        <div class="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-4">
          <p class="font-semibold text-amber-400">DESEMPENHOS PASSADOS NÃO GARANTEM RESULTADOS FUTUROS</p>
        </div>
        
        <p>Qualquer referência a desempenho histórico:</p>
        <ul class="list-disc pl-6 space-y-2 mt-3">
          <li>É apenas para fins ilustrativos</li>
          <li>Não é uma indicação confiável de desempenho futuro</li>
          <li>Pode não incluir todos os custos e taxas</li>
          <li>Pode ser baseada em backtesting com limitações inerentes</li>
        </ul>
        
        <p class="mt-4">Os mercados mudam constantemente e estratégias que funcionaram no passado podem não funcionar no futuro.</p>
      `
  }, {
    icon: Shield,
    title: "Limitação de Responsabilidade",
    content: `
        <p class="mb-3">A Alfalyzer e os seus representantes não serão responsáveis por:</p>
        
        <ul class="list-disc pl-6 space-y-2">
          <li>Perdas ou danos resultantes do uso das informações fornecidas</li>
          <li>Decisões de investimento tomadas com base no conteúdo do site</li>
          <li>Erros ou omissões nos dados apresentados</li>
          <li>Interrupções ou falhas no serviço</li>
          <li>Ações de terceiros baseadas nas nossas informações</li>
        </ul>
        
        <p class="mt-4">O uso da Alfalyzer é por sua conta e risco.</p>
      `
  }, {
    icon: CircleAlert,
    title: "Considerações Especiais",
    content: `
        <h4 class="font-semibold mb-2">Produtos Complexos:</h4>
        <p>Certos instrumentos financeiros (opções, futuros, CFDs, criptomoedas) são particularmente complexos e de alto risco. Não são adequados para a maioria dos investidores.</p>
        
        <h4 class="font-semibold mb-2 mt-4">Alavancagem:</h4>
        <p>O uso de alavancagem pode amplificar tanto ganhos como perdas. Pode perder mais do que o investimento inicial.</p>
        
        <h4 class="font-semibold mb-2 mt-4">Day Trading:</h4>
        <p>Day trading é extremamente arriscado e a maioria dos day traders perde dinheiro. Requer conhecimento especializado, experiência e capital substancial.</p>
        
        <h4 class="font-semibold mb-2 mt-4">Investimento Emocional:</h4>
        <p>Evite tomar decisões baseadas em emoções como medo ou ganância. Mantenha disciplina e siga o seu plano de investimento.</p>
      `
  }, {
    icon: BookOpen,
    title: "Recursos Recomendados",
    content: `
        <p class="mb-3">Para melhorar a sua educação financeira, considere:</p>
        
        <h4 class="font-semibold mb-2">Livros Clássicos:</h4>
        <ul class="list-disc pl-6 space-y-1">
          <li>"The Intelligent Investor" - Benjamin Graham</li>
          <li>"A Random Walk Down Wall Street" - Burton Malkiel</li>
          <li>"Common Stocks and Uncommon Profits" - Philip Fisher</li>
        </ul>
        
        <h4 class="font-semibold mb-2 mt-4">Fontes Oficiais:</h4>
        <ul class="list-disc pl-6 space-y-1">
          <li>CMVM - Comissão do Mercado de Valores Mobiliários</li>
          <li>Banco de Portugal</li>
          <li>BCE - Banco Central Europeu</li>
        </ul>
        
        <h4 class="font-semibold mb-2 mt-4">Formação:</h4>
        <p>Considere fazer cursos certificados em análise financeira e gestão de investimentos.</p>
      `
  }, {
    icon: Scale,
    title: "Conformidade Legal",
    content: `
        <p>Este aviso está em conformidade com:</p>
        <ul class="list-disc pl-6 space-y-1 mt-3">
          <li>Regulamento (UE) n.º 596/2014 (Regulamento Abuso de Mercado)</li>
          <li>Diretiva 2014/65/UE (MiFID II)</li>
          <li>Código dos Valores Mobiliários português</li>
          <li>Regulamentos da CMVM</li>
        </ul>
        
        <p class="mt-4">A Alfalyzer não está registada como consultora de investimentos nem como intermediária financeira em nenhuma jurisdição.</p>
      `
  }];
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
    className: "min-h-screen bg-background",
    children: /* @__PURE__ */ jsxRuntimeExports.jsx(ScrollArea, {
      className: "h-screen",
      children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
        className: "container mx-auto px-4 py-8 max-w-4xl",
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs(motion.div, {
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
          children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            className: "mb-8",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h1", {
              className: "text-4xl font-bold mb-4",
              children: "Aviso Legal e Isenção de Responsabilidade Financeira"
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
              className: "text-muted-foreground",
              children: ["Última atualização: ", lastUpdated]
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(Card, {
            className: "p-6 mb-8 bg-red-500/10 border-red-500/20",
            children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "flex items-start gap-3",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, {
                className: "h-8 w-8 text-red-500 mt-1"
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h2", {
                  className: "text-2xl font-bold mb-3 text-red-400",
                  children: "LEIA COM ATENÇÃO ANTES DE USAR A ALFALYZER"
                }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                  className: "text-lg mb-3",
                  children: "A Alfalyzer NÃO oferece aconselhamento de investimento. Todas as informações são apenas para fins educacionais."
                }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                  className: "font-semibold",
                  children: "Investir pode resultar na perda total do seu capital. Consulte sempre um consultor financeiro qualificado antes de tomar decisões de investimento."
                })]
              })]
            })
          }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
            className: "space-y-6",
            children: sections.map((section, index) => /* @__PURE__ */ jsxRuntimeExports.jsx(motion.div, {
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
                delay: index * 0.05
              },
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(Card, {
                className: `p-6 ${section.critical ? "border-red-500/50" : ""}`,
                children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                  className: "flex items-start gap-3",
                  children: [/* @__PURE__ */ jsxRuntimeExports.jsx(section.icon, {
                    className: `h-5 w-5 mt-1 ${section.critical ? "text-red-500" : "text-primary"}`
                  }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                    className: "flex-1",
                    children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h2", {
                      className: `text-xl font-semibold mb-3 ${section.critical ? "text-red-400" : ""}`,
                      children: section.title
                    }), /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                      className: "prose prose-sm dark:prose-invert max-w-none text-muted-foreground",
                      dangerouslySetInnerHTML: {
                        __html: section.content
                      }
                    })]
                  })]
                })
              })
            }, index))
          }), /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
            className: "p-6 mt-8",
            children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h2", {
              className: "text-xl font-semibold mb-3",
              children: "Questões ou Preocupações"
            }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
              className: "text-muted-foreground",
              children: "Se tiver questões sobre este aviso legal:"
            }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "mt-3 space-y-2 text-muted-foreground",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx("strong", {
                  children: "Email:"
                }), " legal@alfalyzer.com"]
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("p", {
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx("strong", {
                  children: "Suporte:"
                }), " support@alfalyzer.com"]
              })]
            })]
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(Card, {
            className: "p-6 mt-6 bg-amber-500/10 border-amber-500/20",
            children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
              className: "flex items-start gap-3",
              children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, {
                className: "h-6 w-6 text-amber-500 mt-1"
              }), /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                children: [/* @__PURE__ */ jsxRuntimeExports.jsx("h3", {
                  className: "font-semibold text-lg mb-2",
                  children: "Reconhecimento"
                }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                  className: "text-muted-foreground",
                  children: "Ao utilizar a Alfalyzer, reconhece que leu, compreendeu e concorda com este aviso legal. Compreende que é totalmente responsável pelas suas decisões de investimento e que a Alfalyzer não pode ser responsabilizada por quaisquer perdas ou danos resultantes do uso da plataforma."
                }), /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
                  className: "mt-3 font-semibold text-amber-400",
                  children: "Se não concordar com estes termos, não deve utilizar a Alfalyzer."
                })]
              })]
            })
          })]
        })
      })
    })
  });
}
export {
  FinancialDisclaimer as default
};
