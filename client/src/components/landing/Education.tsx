import { motion } from "framer-motion";
import { useTranslation } from 'react-i18next';

export function Education() {
  const { t } = useTranslation();
  return (
    <section id="education" className="py-20 lg:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="max-w-5xl mx-auto text-center"
        >
          <h2 className="heading-section mb-8">
            {t('pages.landing.education.title', 'What is ')}<span className="font-semibold text-teya-green">{t('financial_terms.intrinsic_value', 'Intrinsic Value')}</span>?
          </h2>
          <p className="text-body-large mb-6 max-w-3xl mx-auto text-muted-foreground">
            {t('pages.landing.education.subtitle_1', 'The fair price of a stock based on financial fundamentals.')} {t('pages.landing.education.subtitle_2', 'The strategy Warren Buffett has used for decades.')}
          </p>
          <p className="text-label text-teya-green mb-16">
            Tesla • Apple • Microsoft • Amazon • Google • Netflix
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 mt-12">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
              className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 sm:p-6"
            >
              <h3 className="heading-subsection mb-4 flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                {t('pages.landing.education.without_iv', 'Without Intrinsic Value')}
              </h3>
              <p className="text-body text-left">
                • {t('pages.landing.education.without_1', 'You invest based on emotions')}<br/>
                • {t('pages.landing.education.without_2', 'You buy tops and sell bottoms')}<br/>
                • {t('pages.landing.education.without_3', 'You follow “guru” tips on YouTube')}<br/>
                • {t('pages.landing.education.without_4', 'Frequent losses and frustration')}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              viewport={{ once: true }}
              className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 sm:p-6"
            >
              <h3 className="heading-subsection mb-4 flex items-center gap-2">
                <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                {t('pages.landing.education.with_iv', 'With Intrinsic Value')}
              </h3>
              <p className="text-body text-left">
                • {t('pages.landing.education.with_1', 'You invest based on concrete data')}<br/>
                • {t('pages.landing.education.with_2', 'You buy low and sell high')}<br/>
                • {t('pages.landing.education.with_3', 'You ignore market noise')}<br/>
                • {t('pages.landing.education.with_4', 'Consistent long-term returns')}
              </p>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
