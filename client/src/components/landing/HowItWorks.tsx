import { motion } from "framer-motion";

const steps = [
  {
    number: "01",
    title: "Explora gráficos e métricas fundamentais",
    description: "Visualiza dados financeiros complexos de forma simples e intuitiva"
  },
  {
    number: "02",
    title: "Descobre o valor intrínseco de ações globais",
    description: "Obtém o valor justo calculado automaticamente em segundos"
  },
  {
    number: "03",
    title: "Recebe alertas personalizados",
    description: "Fica a saber quando há oportunidades de compra ou venda"
  }
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-16 lg:py-24 bg-secondary/20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="heading-section mb-4">
            Como funciona
          </h2>
          <p className="text-body-large max-w-2xl mx-auto text-muted-foreground">
            Simples, rápido e eficaz. Começa em minutos.
          </p>
        </motion.div>

        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.2 }}
                viewport={{ once: true }}
                className="text-center relative"
              >
                {/* Step Number */}
                <div className="w-16 h-16 bg-teya-green rounded-full flex items-center justify-center mx-auto mb-6 text-teya-black font-bold text-lg shadow-lg hover:shadow-teya-green/30 hover:scale-105 transition-all duration-300">
                  {step.number}
                </div>

                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[calc(50%+2rem)] w-[calc(100%-4rem)] h-0.5 bg-teya-green/30" />
                )}

                <h3 className="heading-subsection mb-4">
                  {step.title}
                </h3>
                <p className="text-body">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
