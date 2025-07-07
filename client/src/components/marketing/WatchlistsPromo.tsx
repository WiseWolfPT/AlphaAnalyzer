import { motion } from "framer-motion";
import { Star, FileSpreadsheet, Eye, Plus } from "lucide-react";

export function WatchlistsPromo() {
  const features = [
    {
      icon: Plus,
      text: "Cria watchlists ilimitadas"
    },
    {
      icon: Eye,
      text: "Segue vários portfólios"
    },
    {
      icon: FileSpreadsheet,
      text: "Importa listas em CSV"
    }
  ];

  return (
    <section className="py-12 lg:py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:items-center"
          >
            {/* Left Column - Content */}
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-tangerine/20 rounded-xl flex items-center justify-center">
                  <Star className="h-6 w-6 text-tangerine" />
                </div>
                <h3 className="text-2xl lg:text-3xl font-bold text-foreground">
                  Watchlists & Portfolios
                </h3>
              </div>
              
              <div className="space-y-4">
                {features.map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    className="flex items-center gap-3"
                  >
                    <div className="w-8 h-8 bg-tangerine/10 rounded-lg flex items-center justify-center">
                      <feature.icon className="h-4 w-4 text-tangerine" />
                    </div>
                    <span className="text-muted-foreground font-medium">{feature.text}</span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Right Column - Screenshot Placeholder */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
              className="flex justify-center lg:justify-end lg:items-center"
            >
              <div className="w-full max-w-sm">
                <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-200">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="font-semibold text-gray-800">Minha Watchlist</h4>
                    <Star className="h-5 w-5 text-tangerine" />
                  </div>
                  
                  {/* Stock Items */}
                  <div className="space-y-4">
                    {[
                      { ticker: 'AAPL', name: 'Apple Inc.', change: '+2.4%', positive: true },
                      { ticker: 'MSFT', name: 'Microsoft', change: '+1.8%', positive: true },
                      { ticker: 'TSLA', name: 'Tesla Inc.', change: '-0.7%', positive: false },
                      { ticker: 'AMZN', name: 'Amazon', change: '+3.1%', positive: true }
                    ].map((stock, index) => (
                      <div key={index} className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center">
                            <span className="text-xs font-bold text-gray-600">{stock.ticker.slice(0, 2)}</span>
                          </div>
                          <div>
                            <div className="font-medium text-gray-800 text-sm">{stock.ticker}</div>
                            <div className="text-xs text-gray-500">{stock.name}</div>
                          </div>
                        </div>
                        <div className={`text-sm font-semibold ${stock.positive ? 'text-green-600' : 'text-red-600'}`}>
                          {stock.change}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}