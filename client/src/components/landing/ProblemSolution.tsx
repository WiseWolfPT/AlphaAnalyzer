import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export function ProblemSolution() {
  return (
    <section id="problem-solution" className="py-20 lg:py-32 bg-gray-100 dark:bg-gray-900">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="max-w-6xl mx-auto text-center"
        >
          <h2 className="heading-section mb-8">
            Da análise <span className="text-red-500">confusa</span> aos insights <span className="text-teya-green">claros</span>
          </h2>
          <p className="text-body-large mb-16 max-w-3xl mx-auto text-muted-foreground">
            Deixa de perder horas em relatórios PDF e planilhas complexas.
            Com o Alfalyzer, toda a análise fundamental fica visual e automática.
          </p>

          {/* Before/After Visual Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            {/* ANTES - Left Side */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 bg-red-500/10 text-red-600 border border-red-500/20 px-4 py-2 rounded-full font-semibold text-lg mb-4">
                  ❌ ANTES
                </div>
                <h3 className="heading-subsection text-red-600 mb-2">Método Tradicional</h3>
                <p className="text-sm text-muted-foreground">Horas de trabalho manual</p>
              </div>

              <div className="space-y-4">
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-left">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">1</div>
                    <div>
                      <h4 className="font-semibold text-red-700 dark:text-red-300 mb-1">Procurar relatórios financeiros</h4>
                      <p className="text-sm text-red-600 dark:text-red-400">PDFs de 50+ páginas, sites diferentes, dados desorganizados</p>
                    </div>
                  </div>
                </div>

                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-left">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">2</div>
                    <div>
                      <h4 className="font-semibold text-red-700 dark:text-red-300 mb-1">Criar gráficos manualmente</h4>
                      <p className="text-sm text-red-600 dark:text-red-400">Excel, fórmulas complexas, muito tempo perdido</p>
                    </div>
                  </div>
                </div>

                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-left">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">3</div>
                    <div>
                      <h4 className="font-semibold text-red-700 dark:text-red-300 mb-1">Calcular valor intrínseco</h4>
                      <p className="text-sm text-red-600 dark:text-red-400">Modelos DCF complicados, propensos a erros</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-red-100 dark:bg-red-900/30 border-2 border-red-300 dark:border-red-700 rounded-lg p-4 text-center">
                <p className="text-red-700 dark:text-red-300 font-semibold">⏱️ Resultado: 3-4 horas por análise</p>
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">E ainda com risco de erros</p>
              </div>
            </motion.div>

            {/* AGORA - Right Side */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 bg-teya-green/10 text-teya-green border border-teya-green/20 px-4 py-2 rounded-full font-semibold text-lg mb-4">
                  ✅ AGORA
                </div>
                <h3 className="heading-subsection text-teya-green mb-2">Com Alfalyzer</h3>
                <p className="text-sm text-muted-foreground">Análise automática e visual</p>
              </div>

              <div className="space-y-4">
                <div className="bg-teya-green/5 border border-teya-green/20 rounded-lg p-4 text-left">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-teya-green text-teya-dark rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">1</div>
                    <div>
                      <h4 className="font-semibold text-teya-green mb-1">Tudo num só lugar</h4>
                      <p className="text-sm text-muted-foreground">Dados financeiros organizados, atualizados em tempo real</p>
                    </div>
                  </div>
                </div>

                <div className="bg-teya-green/5 border border-teya-green/20 rounded-lg p-4 text-left">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-teya-green text-teya-dark rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">2</div>
                    <div>
                      <h4 className="font-semibold text-teya-green mb-1">Gráficos prontos</h4>
                      <p className="text-sm text-muted-foreground">Receitas, lucros, margens - tudo visualizado automaticamente</p>
                    </div>
                  </div>
                </div>

                <div className="bg-teya-green/5 border border-teya-green/20 rounded-lg p-4 text-left">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-teya-green text-teya-dark rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">3</div>
                    <div>
                      <h4 className="font-semibold text-teya-green mb-1">Valor intrínseco automático</h4>
                      <p className="text-sm text-muted-foreground">DCF calculado em segundos, sempre atualizado</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-teya-green/10 border-2 border-teya-green/30 rounded-lg p-4 text-center">
                <p className="text-teya-green font-semibold">⚡ Resultado: Análise em 30 segundos</p>
                <p className="text-sm text-muted-foreground mt-1">Com precisão institucional</p>
              </div>
            </motion.div>
          </div>

          {/* Call to Action */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            viewport={{ once: true }}
            className="mt-12"
          >
            <Button
              size="lg"
              className="text-lg px-8 py-4 h-14 bg-teya-green hover:bg-teya-green/90 text-teya-dark font-semibold"
              onClick={() => window.location.href = '/trial'}
            >
              🚀 Testar Agora Gratuitamente
            </Button>
            <p className="text-sm text-muted-foreground mt-2">
              7 dias grátis • Sem cartão de crédito
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
