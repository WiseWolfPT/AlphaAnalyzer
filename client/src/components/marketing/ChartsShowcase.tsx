import { motion } from "framer-motion";
import { TrendingUp, Target } from "lucide-react";

export function ChartsShowcase() {
  return (
    <section id="intrinsic" className="py-16 lg:py-24 bg-secondary/20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Vê em ação
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Descobre rapidamente se uma ação está sobrevalorizada ou subvalorizada
          </p>
        </motion.div>

        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-8 shadow-xl"
          >
            {/* Mock Chart Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                  AAPL
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-foreground">Apple Inc.</h3>
                  <p className="text-muted-foreground">NASDAQ: AAPL</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-foreground">$175.43</div>
                <div className="text-emerald-500 text-sm font-medium">+2.34 (1.35%)</div>
              </div>
            </div>

            {/* Mock Candlestick Chart */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
              className="relative bg-gradient-to-br from-secondary/30 to-secondary/10 rounded-xl p-6 mb-8"
            >
              <div className="h-64 flex items-end justify-center gap-2">
                {/* Mock candlestick bars */}
                {Array.from({ length: 20 }, (_, i) => {
                  const height = Math.random() * 150 + 50;
                  const isGreen = Math.random() > 0.5;
                  return (
                    <motion.div
                      key={i}
                      initial={{ height: 0 }}
                      whileInView={{ height }}
                      transition={{ duration: 0.5, delay: i * 0.05 }}
                      viewport={{ once: true }}
                      className={`w-3 rounded-sm ${
                        isGreen ? 'bg-emerald-500' : 'bg-red-500'
                      }`}
                      style={{ height: `${height}px` }}
                    />
                  );
                })}
              </div>
              
              {/* Chart overlay with intrinsic value line */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-full h-0.5 bg-orange-500 opacity-70 relative">
                  <div className="absolute right-0 -top-6 bg-orange-500 text-white text-xs px-2 py-1 rounded">
                    Valor Intrínseco: $165.00
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Intrinsic Value Analysis */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                viewport={{ once: true }}
                className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6"
              >
                <div className="flex items-center gap-3 mb-3">
                  <Target className="h-5 w-5 text-emerald-500" />
                  <h4 className="font-semibold text-foreground">Análise de Valor</h4>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Preço Atual:</span>
                    <span className="font-medium">$175.43</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Valor Intrínseco:</span>
                    <span className="font-medium text-orange-500">$165.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Margem de Segurança:</span>
                    <span className="font-medium text-red-500">-6.3%</span>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                viewport={{ once: true }}
                className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-6"
              >
                <div className="flex items-center gap-3 mb-3">
                  <TrendingUp className="h-5 w-5 text-orange-500" />
                  <h4 className="font-semibold text-foreground">Recomendação</h4>
                </div>
                <div className="space-y-2">
                  <div className="text-lg font-semibold text-orange-500">
                    Sobrevalorizada
                  </div>
                  <p className="text-sm text-muted-foreground">
                    A ação está a negociar acima do seu valor intrínseco. 
                    Considera aguardar por um preço mais favorável.
                  </p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}