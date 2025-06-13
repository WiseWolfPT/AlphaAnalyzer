import { motion } from "framer-motion";

const STOCK_COMPANIES = [
  { symbol: "GOOGL", name: "Google", color: "#4285F4" },
  { symbol: "META", name: "Meta", color: "#1877F2" },
  { symbol: "TSLA", name: "Tesla", color: "#CC0000" },
  { symbol: "AAPL", name: "Apple", color: "#000000" },
  { symbol: "MSFT", name: "Microsoft", color: "#00A1F1" },
  { symbol: "AMZN", name: "Amazon", color: "#FF9900" }
];

const ANIMATION_CONFIG = {
  FAST: { duration: 0.3, ease: "easeOut" },
  MEDIUM: { duration: 0.5, ease: "easeOut" },
  SLOW: { duration: 0.8, ease: "easeOut" }
} as const;

export function StockLogos() {
  return (
    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-8">
      <div className="flex gap-3">
        {STOCK_COMPANIES.map((stock, index) => (
          <motion.div
            key={stock.symbol}
            className="relative"
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1,
              transition: {
                delay: 0.5 + index * 0.1,
                ...ANIMATION_CONFIG.MEDIUM
              }
            }}
            whileHover={{ 
              scale: 1.1,
              y: -5,
              transition: ANIMATION_CONFIG.FAST
            }}
          >
            {/* Stock Logo Badge */}
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-lg border-2 border-white/20"
              style={{ backgroundColor: stock.color }}
            >
              {stock.symbol.slice(0, 2)}
            </div>
            
            {/* Tooltip on Hover */}
            <motion.div
              className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-deep-black text-pure-white text-xs px-2 py-1 rounded opacity-0 pointer-events-none"
              whileHover={{ opacity: 1 }}
              transition={ANIMATION_CONFIG.FAST}
            >
              {stock.name}
            </motion.div>
          </motion.div>
        ))}
      </div>
      
      {/* Carousel Animation Indicator */}
      <motion.div
        className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-chartreuse-dark rounded-full"
        animate={{
          x: [-24, 24, -24],
          transition: {
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }
        }}
      />
    </div>
  );
}