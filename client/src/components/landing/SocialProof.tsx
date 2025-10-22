import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { useTranslation } from 'react-i18next';

export function SocialProof() {
  const { t } = useTranslation();
  return (
    <section id="social-proof" className="py-16 lg:py-24 bg-secondary/20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="heading-section mb-4">
            {t('pages.landing.social_proof.title', 'Real performance data')}
          </h2>
          <p className="text-body-large max-w-2xl mx-auto text-muted-foreground">
            {t('pages.landing.social_proof.subtitle', 'Verified stats from our analysis algorithms')}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            viewport={{ once: true }}
          >
            <Card className="border-border/50 hover:shadow-lg transition-all duration-300 text-center">
              <CardContent className="p-8">
                <div className="text-metric-large mb-2">94.2%</div>
                <div className="text-label">{t('pages.landing.social_proof.prediction_accuracy', 'Prediction accuracy')}</div>
                <div className="text-caption mt-2">{t('pages.landing.social_proof.last_12_months', 'Last 12 months')}</div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <Card className="border-border/50 hover:shadow-lg transition-all duration-300 text-center">
              <CardContent className="p-8">
                <div className="text-4xl font-bold text-emerald-500 mb-2">+23.1%</div>
                <div className="text-sm text-muted-foreground">{t('pages.landing.social_proof.avg_annual_return', 'Average annual return')}</div>
                <div className="text-xs text-muted-foreground mt-2">Vs. 11.2% S&P 500</div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            viewport={{ once: true }}
          >
            <Card className="border-border/50 hover:shadow-lg transition-all duration-300 text-center">
              <CardContent className="p-8">
                <div className="text-4xl font-bold text-blue-500 mb-2">6,247</div>
                <div className="text-sm text-muted-foreground">{t('pages.landing.social_proof.stocks_analyzed', 'Stocks analyzed')}</div>
                <div className="text-xs text-muted-foreground mt-2">{t('pages.landing.social_proof.global_markets', 'Global markets')}</div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            viewport={{ once: true }}
          >
            <Card className="border-border/50 hover:shadow-lg transition-all duration-300 text-center">
              <CardContent className="p-8">
                <div className="text-4xl font-bold text-orange-500 mb-2">-7.3%</div>
                <div className="text-sm text-muted-foreground">{t('pages.landing.social_proof.losses_avoided', 'Losses avoided')}</div>
                <div className="text-xs text-muted-foreground mt-2">{t('pages.landing.social_proof.risk_identification', 'Risk identification')}</div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Warren Buffett Quote */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          viewport={{ once: true }}
          className="mt-16 text-center"
        >
          <Card className="border-teya-green/20 bg-teya-green/5 max-w-3xl mx-auto">
            <CardContent className="p-8">
              <div className="text-6xl text-teya-green mb-4">"</div>
              <p className="text-xl text-foreground font-medium leading-relaxed mb-4">
                {t('pages.landing.social_proof.buffett_quote', 'Price is what you pay. Value is what you get.')}
              </p>
              <div className="flex items-center justify-center gap-3">
                <div className="w-12 h-12 bg-gray-800 dark:bg-gray-700 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
                  WB
                </div>
                <div className="text-left">
                  <div className="font-semibold text-foreground">Warren Buffett</div>
                  <div className="text-sm text-muted-foreground">CEO Berkshire Hathaway</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}
