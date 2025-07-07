import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, TrendingDown, Target, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const STOCKS = [
  {
    symbol: "TSLA",
    name: "Tesla Inc.",
    price: 248.5,
    intrinsicValue: 220.0,
    color: "from-red-500 to-red-600",
    change: +12.4,
    changePercent: +5.25
  },
  {
    symbol: "AAPL", 
    name: "Apple Inc.",
    price: 175.43,
    intrinsicValue: 165.0,
    color: "from-gray-500 to-gray-600",
    change: +2.34,
    changePercent: +1.35
  },
  {
    symbol: "MSFT",
    name: "Microsoft Corp.",
    price: 378.85,
    intrinsicValue: 395.0,
    color: "from-blue-500 to-blue-600",
    change: -5.21,
    changePercent: -1.36
  }
];

export function ChartsShowcase() {
  const [selectedStock, setSelectedStock] = useState(STOCKS[0]);
  const [chartData, setChartData] = useState<number[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Generate realistic chart data
  useEffect(() => {
    const generateChartData = () => {
      const basePrice = selectedStock.price;
      const data = [];
      let currentPrice = basePrice * 0.95; // Start slightly lower
      
      for (let i = 0; i < 30; i++) {
        const volatility = 0.02; // 2% daily volatility
        const randomChange = (Math.random() - 0.5) * volatility;
        currentPrice *= (1 + randomChange);
        data.push(currentPrice);
      }
      
      // Ensure last price matches current price
      data[data.length - 1] = basePrice;
      return data;
    };

    setChartData(generateChartData());
  }, [selectedStock]);

  const margin = ((selectedStock.intrinsicValue - selectedStock.price) / selectedStock.price * 100);
  const isOvervalued = margin < 0;

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      // Simulate data refresh
      const newData = chartData.map(price => 
        price * (0.98 + Math.random() * 0.04) // ±2% variation
      );
      setChartData(newData);
      setIsRefreshing(false);
    }, 1000);
  };

  return (
    <section id="intrinsic" className="py-16 lg:py-24 bg-secondary/20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Gráficos em Tempo Real
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Vê como identificamos oportunidades de compra e venda instantaneamente
          </p>
        </motion.div>

        <div className="max-w-6xl mx-auto">
          {/* Stock Selector */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="flex justify-center gap-4 mb-8"
          >
            {STOCKS.map((stock) => (
              <motion.button
                key={stock.symbol}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedStock(stock)}
                className={`px-6 py-3 rounded-xl border-2 transition-all duration-200 ${
                  selectedStock.symbol === stock.symbol
                    ? 'border-chartreuse bg-chartreuse/10 text-chartreuse'
                    : 'border-gray-200 dark:border-gray-700 hover:border-chartreuse/50'
                }`}
              >
                <div className="font-bold">{stock.symbol}</div>
                <div className="text-xs text-muted-foreground">${stock.price}</div>
              </motion.button>
            ))}
          </motion.div>

          <AnimatePresence mode="wait">
            <motion.div
              key={selectedStock.symbol}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-8 shadow-xl"
            >
              {/* Chart Header */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 bg-gradient-to-br ${selectedStock.color} rounded-xl flex items-center justify-center text-white font-bold text-lg`}>
                    {selectedStock.symbol}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground">{selectedStock.name}</h3>
                    <p className="text-muted-foreground">NASDAQ: {selectedStock.symbol}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-foreground">${selectedStock.price}</div>
                  <div className={`text-sm font-medium ${selectedStock.change >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {selectedStock.change >= 0 ? '+' : ''}{selectedStock.change} ({selectedStock.changePercent >= 0 ? '+' : ''}{selectedStock.changePercent}%)
                  </div>
                </div>
              </div>

              {/* Interactive Chart */}
              <motion.div
                whileHover={{ scale: 1.01 }}
                transition={{ duration: 0.2 }}
                className="relative bg-gradient-to-br from-secondary/30 to-secondary/10 rounded-xl p-6 mb-8 overflow-hidden"
              >
                {/* Refresh Button */}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="absolute top-4 right-4 z-10"
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </Button>

                <div className="h-64 flex items-end justify-between gap-1">
                  {chartData.map((price, i) => {
                    const height = ((price - Math.min(...chartData)) / (Math.max(...chartData) - Math.min(...chartData))) * 200 + 20;
                    const isUp = i === 0 ? true : price > chartData[i - 1];
                    
                    return (
                      <motion.div
                        key={i}
                        initial={{ height: 0 }}
                        animate={{ height }}
                        transition={{ duration: 0.3, delay: i * 0.01 }}
                        className={`flex-1 max-w-2 rounded-sm transition-colors duration-200 hover:opacity-80 ${
                          isUp ? 'bg-emerald-500' : 'bg-red-500'
                        }`}
                        style={{ height: `${height}px` }}
                      />
                    );
                  })}
                </div>
                
                {/* Intrinsic Value Line */}
                <div className="absolute inset-0 flex items-center pointer-events-none">
                  <div className="w-full h-0.5 bg-orange-500 opacity-70 relative">
                    <div className="absolute right-4 -top-6 bg-orange-500 text-white text-xs px-2 py-1 rounded">
                      Valor Intrínseco: ${selectedStock.intrinsicValue}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Analysis Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                  className="bg-chartreuse/10 border border-chartreuse/20 rounded-xl p-6"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Target className="h-5 w-5 text-chartreuse-dark" />
                    <h4 className="font-semibold text-foreground">Análise de Valor</h4>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Preço Atual:</span>
                      <span className="font-medium">${selectedStock.price}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Valor Intrínseco:</span>
                      <span className="font-medium text-orange-500">${selectedStock.intrinsicValue}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Margem de Segurança:</span>
                      <span className={`font-medium ${margin >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {margin >= 0 ? '+' : ''}{margin.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.15 }}
                  className={`${isOvervalued ? 'bg-red-500/10 border-red-500/20' : 'bg-emerald-500/10 border-emerald-500/20'} border rounded-xl p-6`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    {isOvervalued ? (
                      <TrendingDown className="h-5 w-5 text-red-500" />
                    ) : (
                      <TrendingUp className="h-5 w-5 text-emerald-500" />
                    )}
                    <h4 className="font-semibold text-foreground">Recomendação</h4>
                  </div>
                  <div className="space-y-2">
                    <div className={`text-lg font-semibold ${isOvervalued ? 'text-red-500' : 'text-emerald-500'}`}>
                      {isOvervalued ? 'Sobrevalorizada' : 'Subvalorizada'}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {isOvervalued 
                        ? 'Ação a negociar acima do valor justo. Considera aguardar.' 
                        : 'Oportunidade de compra - preço abaixo do valor intrínseco.'
                      }
                    </p>
                  </div>
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
                  className="bg-gradient-to-r from-chartreuse via-chartreuse-dark to-chartreuse hover:from-chartreuse-dark hover:via-chartreuse hover:to-chartreuse-dark text-rich-black font-semibold px-8 py-3 shadow-lg shadow-chartreuse/30 hover:shadow-chartreuse/50 hover:scale-105 transition-all duration-300 border-0"
                  onClick={() => window.location.href = '/trial'}
                >
                  📊 Aceder a Todos os Gráficos - Trial Grátis
                </Button>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}