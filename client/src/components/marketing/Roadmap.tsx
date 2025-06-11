import { motion } from "framer-motion";
import { Zap, Link } from "lucide-react";

export function Roadmap() {
  const upcomingFeatures = [
    {
      icon: Zap,
      text: "Alertas inteligentes"
    },
    {
      icon: Link,
      text: "Integração com corretoras"
    }
  ];

  return (
    <section className="py-8 bg-secondary/5 border-t border-border/20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <div className="flex items-center justify-center gap-6 text-gray-400 text-xs">
            <span className="font-medium">Próximas funcionalidades:</span>
            <div className="flex items-center gap-4">
              {upcomingFeatures.map((feature, index) => (
                <div key={index} className="flex items-center gap-2">
                  <feature.icon className="h-3 w-3" />
                  <span>{feature.text}</span>
                  {index < upcomingFeatures.length - 1 && (
                    <span className="text-gray-500 mx-2">•</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}