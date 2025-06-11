import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { X } from "lucide-react";

export function FundamentalsGrid() {
  const [selectedCard, setSelectedCard] = useState<number | null>(null);

  const fundamentalCards = [
    {
      id: 1,
      title: "Revenue",
      description: "Evolução das receitas trimestrais e anuais",
      thumbnail: "/fundamental-thumb-1.png"
    },
    {
      id: 2,
      title: "Net Income", 
      description: "Lucro líquido e margem operacional",
      thumbnail: "/fundamental-thumb-2.png"
    },
    {
      id: 3,
      title: "Free Cash Flow",
      description: "Fluxo de caixa livre e sustentabilidade",
      thumbnail: "/fundamental-thumb-3.png"
    },
    {
      id: 4,
      title: "Cash vs Debt",
      description: "Posição financeira e alavancagem",
      thumbnail: "/fundamental-thumb-4.png"
    },
    {
      id: 5,
      title: "Ratios",
      description: "P/E, P/B, ROE e outros múltiplos",
      thumbnail: "/fundamental-thumb-5.png"
    },
    {
      id: 6,
      title: "Dividends",
      description: "Histórico e yield de dividendos",
      thumbnail: "/fundamental-thumb-6.png"
    }
  ];

  return (
    <section className="py-16 lg:py-24 bg-secondary/10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Fundamentais em Gráficos
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Visualizações claras para entender receitas, margem, fluxo de caixa e muito mais.
          </p>
        </motion.div>

        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {fundamentalCards.map((card, index) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card 
                  className="border-border/50 hover:border-tangerine/50 hover:shadow-xl transition-all duration-300 cursor-pointer group"
                  onClick={() => setSelectedCard(card.id)}
                >
                  <CardContent className="p-6">
                    <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg mb-4 flex items-center justify-center group-hover:from-gray-50 group-hover:to-gray-100 transition-colors">
                      <div className="w-16 h-16 bg-tangerine/20 rounded-lg flex items-center justify-center">
                        <span className="text-tangerine font-bold text-lg">{card.title.slice(0, 2)}</span>
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-tangerine transition-colors">
                      {card.title}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {card.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal/Lightbox */}
      {selectedCard && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="bg-background rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-auto"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-foreground">
                {fundamentalCards.find(card => card.id === selectedCard)?.title}
              </h3>
              <button
                onClick={() => setSelectedCard(null)}
                className="p-2 hover:bg-secondary rounded-lg transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <div className="w-24 h-24 bg-tangerine/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-tangerine font-bold text-2xl">
                    {fundamentalCards.find(card => card.id === selectedCard)?.title.slice(0, 2)}
                  </span>
                </div>
                <p className="text-muted-foreground">
                  Gráfico detalhado de {fundamentalCards.find(card => card.id === selectedCard)?.title}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </section>
  );
}