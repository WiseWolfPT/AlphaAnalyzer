import { Button } from "@/components/ui/button";
import { useTranslation } from 'react-i18next';
import { motion } from "framer-motion";

interface CTAProps {
  onShowVideoModal: (show: boolean) => void;
}

export function CTA({ onShowVideoModal }: CTAProps) {
  const { t } = useTranslation();
  return (
    <section className="py-16 lg:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center"
        >
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
            {t('pages.landing.cta.title', 'Ready to transform your investing?')}
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            {t('pages.landing.cta.subtitle', 'Join smart investors who analyze with data, not emotions.')}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="text-lg px-8 py-4 h-14 bg-teya-green hover:bg-teya-green/90 text-teya-black font-semibold"
              onClick={() => window.location.href = '/trial'}
            >
              {t('pages.landing.cta.primary', '🎯 Avoid the next Tesla‑like drop (‑33%)')}
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="text-lg px-8 py-4 h-14 border-teya-green/50 text-teya-green hover:bg-teya-green/10"
              onClick={() => onShowVideoModal(true)}
            >
              {t('pages.landing.hero.view_demo', 'View demo')}
            </Button>
          </div>

          <div className="mt-6">
            <Button
              variant="ghost"
              className="text-base text-muted-foreground hover:text-teya-green underline-offset-4 hover:underline"
              onClick={() => window.location.href = '/metodologia'}
            >
              {t('pages.landing.cta.learn_methodology', 'Learn our methodology →')}
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
