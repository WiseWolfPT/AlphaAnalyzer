import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, TrendingDown, Calculator, DollarSign, Target, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const STOCKS = [
  {
    symbol: "TSLA",
    name: "Tesla",
    price: 248.5,
    intrinsicValue: 220.0,
    color: "from-red-500 to-red-600",
    logo: "🚗"
  },
  {
    symbol: "AAPL", 
    name: "Apple",
    price: 175.43,
    intrinsicValue: 165.0,
    color: "from-gray-500 to-gray-600",
    logo: "🍎"
  },
  {
    symbol: "MSFT",
    name: "Microsoft", 
    price: 378.85,
    intrinsicValue: 395.0,
    color: "from-blue-500 to-blue-600",
    logo: "💻"
  },
  {
    symbol: "AMZN",
    name: "Amazon",
    price: 153.75,
    intrinsicValue: 170.0,
    color: "from-orange-500 to-orange-600", 
    logo: "📦"
  },
  {
    symbol: "GOOGL",
    name: "Google",
    price: 141.80,
    intrinsicValue: 135.0,
    color: "from-green-500 to-green-600",
    logo: "🔍"
  },
  {
    symbol: "NFLX",
    name: "Netflix",
    price: 486.50,
    intrinsicValue: 520.0,
    color: "from-red-600 to-red-700",
    logo: "🎬"
  }
];

export function InteractiveDemo() {
  const [selectedStock, setSelectedStock] = useState(STOCKS[0]);
  const [isAnimating, setIsAnimating] = useState(false);

  const getMargin = (price: number, intrinsic: number) => {
    return ((intrinsic - price) / price * 100);
  };

  const getRecommendation = (margin: number) => {
    if (margin > 15) return { 
      text: "🔥 COMPRAR FORTE", 
      color: "text-green-600", 
      bgColor: "bg-green-500/20",
      explanation: "Excelente oportunidade - desconto significativo"
    };
    if (margin > 5) return { 
      text: "✅ COMPRAR", 
      color: "text-green-500", 
      bgColor: "bg-green-500/10",
      explanation: "Boa oportunidade - preço atrativo"
    };
    if (margin > -5) return { 
      text: "⚖️ NEUTRO", 
      color: "text-yellow-600", 
      bgColor: "bg-yellow-500/10",
      explanation: "Preço justo - sem urgência"
    };
    if (margin > -15) return { 
      text: "⚠️ VENDER", 
      color: "text-orange-500", 
      bgColor: "bg-orange-500/10",
      explanation: "Sobrevalorizada - considerar venda"
    };
    return { 
      text: "🚨 VENDER FORTE", 
      color: "text-red-500", 
      bgColor: "bg-red-500/10",
      explanation: "Muito cara - venda recomendada"
    };
  };

  const handleStockChange = (stock: typeof STOCKS[0]) => {
    setIsAnimating(true);
    setTimeout(() => {
      setSelectedStock(stock);
      setIsAnimating(false);
    }, 200);
  };

  const margin = getMargin(selectedStock.price, selectedStock.intrinsicValue);
  const recommendation = getRecommendation(margin);
  const isUndervalued = margin > 0;

  return (
    <section className="py-16 lg:py-24 bg-gray-50 dark:bg-gray-900/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 bg-teya-green/10 text-teya-green border border-teya-green/20 px-4 py-2 rounded-full font-medium text-sm mb-6">
            <Sparkles className="w-4 h-4" />
            Demo Interativo
          </div>
          <h2 className="heading-section mb-4">
            Experimenta o <span className="text-teya-green font-bold">Alfalyzer</span>
          </h2>
          <p className="text-body-large max-w-2xl mx-auto text-muted-foreground">
            Clica numa ação e vê instantaneamente se está cara ou barata
          </p>
        </motion.div>

        <div className="max-w-6xl mx-auto">
          {/* Stock Selector */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 mb-8 sm:mb-12"
          >
            {STOCKS.map((stock) => (
              <motion.button
                key={stock.symbol}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleStockChange(stock)}
                className={`p-2 sm:p-4 rounded-xl border-2 transition-all duration-200 touch-target-44 ${
                  selectedStock.symbol === stock.symbol
                    ? 'border-teya-green bg-teya-green/10 shadow-lg shadow-teya-green/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-teya-green/50 hover:bg-teya-green/5'
                }`}
              >
                <div className="text-xl sm:text-2xl mb-1 sm:mb-2">{stock.logo}</div>
                <div className="font-bold text-xs sm:text-sm">{stock.symbol}</div>
                <div className="text-xs text-muted-foreground hidden sm:block">{stock.name}</div>
              </motion.button>
            ))}
          </motion.div>

          {/* Analysis Result */}
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedStock.symbol}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: isAnimating ? 0.5 : 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-border/50 shadow-xl bg-gradient-to-br from-background to-secondary/20">
                <CardContent className="p-8">
                  {/* Stock Header */}
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                      <div className={`w-16 h-16 bg-gradient-to-br ${selectedStock.color} rounded-2xl flex items-center justify-center text-white text-2xl font-bold`}>
                        {selectedStock.logo}
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-foreground">{selectedStock.name}</h3>
                        <p className="text-muted-foreground">NASDAQ: {selectedStock.symbol}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-foreground">${selectedStock.price}</div>
                      <div className={`text-sm font-medium ${isUndervalued ? 'text-emerald-500' : 'text-red-500'}`}>
                        {isUndervalued ? '+' : ''}{margin.toFixed(1)}% vs. valor justo
                      </div>
                    </div>
                  </div>

                  {/* Analysis Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {/* Current Price */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: 0.1 }}
                      className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6 text-center"
                    >
                      <DollarSign className="h-8 w-8 text-blue-500 mx-auto mb-3" />
                      <h4 className="font-semibold text-foreground mb-2">Preço Atual</h4>
                      <div className="text-2xl font-bold text-blue-600">${selectedStock.price}</div>
                      <p className="text-sm text-muted-foreground mt-2">Preço de mercado</p>
                    </motion.div>

                    {/* Intrinsic Value */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: 0.2 }}
                      className="bg-teya-green/10 border border-teya-green/20 rounded-xl p-6 text-center"
                    >
                      <Calculator className="h-8 w-8 text-teya-green mx-auto mb-3" />
                      <h4 className="font-semibold text-foreground mb-2">Valor Intrínseco</h4>
                      <div className="text-2xl font-bold text-teya-green">${selectedStock.intrinsicValue}</div>
                      <p className="text-sm text-muted-foreground mt-2">Valor justo (DCF)</p>
                    </motion.div>

                    {/* Recommendation */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: 0.3 }}
                      className={`${recommendation.bgColor} border ${recommendation.color.replace('text-', 'border-')}/20 rounded-xl p-6 text-center lg:col-span-1 sm:col-span-2`}
                    >
                      {isUndervalued ? (
                        <TrendingUp className={`h-8 w-8 ${recommendation.color} mx-auto mb-3`} />
                      ) : (
                        <TrendingDown className={`h-8 w-8 ${recommendation.color} mx-auto mb-3`} />
                      )}
                      <h4 className="font-semibold text-foreground mb-2">Recomendação IA</h4>
                      <div className={`text-lg font-bold ${recommendation.color} mb-2`}>
                        {recommendation.text}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {recommendation.explanation}
                      </p>
                    </motion.div>
                  </div>

                  {/* CTA */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.4 }}
                    className="mt-8 text-center"
                  >
                    <Button 
                      size="lg"
                      className="bg-gradient-to-r from-teya-green via-teya-green-dark to-teya-green hover:from-teya-green-dark hover:via-teya-green hover:to-teya-green-dark text-teya-black font-semibold px-8 py-3 shadow-lg shadow-teya-green/30 hover:shadow-teya-green/50 hover:scale-105 transition-all duration-300 border-0"
                      onClick={() => window.location.href = '/trial'}
                    >
                      🚀 Analisar Todas as Ações - Trial Grátis
                    </Button>
                    <p className="text-sm text-muted-foreground mt-3">
                      Acesso completo por 7 dias. Sem cartão de crédito.
                    </p>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}