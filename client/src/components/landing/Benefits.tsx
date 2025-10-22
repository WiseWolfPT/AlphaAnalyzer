import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from 'react-i18next';
import { BarChart3, Target, Star } from "lucide-react";
import { motion } from "framer-motion";

const benefits = (t: any) => [
  {
    icon: BarChart3,
    title: t('pages.landing.benefits.data_viz.title', 'Data visualizations'),
    description: t('pages.landing.benefits.data_viz.description', 'Intuitive charts and tables that make fundamental analysis accessible to any investor.')
  },
  {
    icon: Target,
    title: t('pages.landing.benefits.instant_iv.title', 'Instant Intrinsic Value'),
    description: t('pages.landing.benefits.instant_iv.description', 'Automatically calculates fair value in seconds based on fundamentals.')
  },
  {
    icon: Star,
    title: t('pages.landing.benefits.watchlists.title', 'Watchlists & Portfolios'),
    description: t('pages.landing.benefits.watchlists.description', 'Create unlimited watchlists, follow multiple portfolios, and import CSV lists to organize your investments.')
  }
];

export function Benefits() {
  const { t } = useTranslation();
  return (
    <section id="benefits" className="py-16 lg:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="heading-section mb-4">
            {t('pages.landing.benefits.title', 'Why Alfalyzer?')}
          </h2>
          <p className="text-body-large max-w-2xl mx-auto text-muted-foreground">
            {t('pages.landing.benefits.subtitle', 'The technology that makes the difference between profit and loss')}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {benefits(t).map((benefit, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <Card className="border-border/50 hover:border-teya-green/50 transition-all duration-300 hover:shadow-lg hover:shadow-teya-green/20 group">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-teya-green rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-teya-green/90 transition-all duration-300 shadow-lg hover:shadow-teya-green/30 hover:scale-105">
                    <benefit.icon className="h-8 w-8 text-deep-black" />
                  </div>
                  <h3 className="heading-subsection mb-4">
                    {benefit.title}
                  </h3>
                  <p className="text-body">
                    {benefit.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
