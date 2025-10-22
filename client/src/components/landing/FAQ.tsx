import { useState } from "react";
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { motion } from "framer-motion";

const faqs = (t: any) => [
  {
    question: t('pages.landing.faq.q1.question', '❓ How do you calculate intrinsic value?'),
    answer: t('pages.landing.faq.q1.answer', 'We use multiple methods including DCF, multiples analysis, and proprietary models combining fundamentals and technicals for accuracy.')
  },
  {
    question: t('pages.landing.faq.q2.question', '❓ What data sources do you use?'),
    answer: t('pages.landing.faq.q2.answer', 'We use high‑quality international finance APIs, including Yahoo Finance, Alpha Vantage, and institutional sources for accuracy and coverage.')
  },
  {
    question: t('pages.landing.faq.q3.question', '❓ Can I cancel the trial at any time?'),
    answer: t('pages.landing.faq.q3.answer', 'Yes! The 7‑day trial is completely free with no commitments. Cancel anytime at no cost.')
  },
  {
    question: t('pages.landing.faq.q4.question', '❓ Is my data secure?'),
    answer: t('pages.landing.faq.q4.answer', 'Absolutely. We use bank‑level SSL encryption and never store sensitive information like passwords or account data. GDPR compliant.')
  },
  {
    question: t('pages.landing.faq.q5.question', '❓ Does it work with Portuguese stocks?'),
    answer: t('pages.landing.faq.q5.answer', 'Yes! We support 10,000+ international stocks (NASDAQ, NYSE, LSE, Euronext) with focus on US and European markets.')
  }
];

export function FAQ() {
  const { t } = useTranslation();
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);

  return (
    <section id="faq" className="py-16 lg:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
            {t('pages.landing.faq.title', 'Frequently Asked Questions')}
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t('pages.landing.faq.subtitle', 'Everything you need to know about Alfalyzer')}
          </p>
        </motion.div>

        <div className="max-w-3xl mx-auto space-y-4">
          {faqs(t).map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <Collapsible
                open={openFAQ === index}
                onOpenChange={(isOpen) => setOpenFAQ(isOpen ? index : null)}
              >
                <Card className={`border-border/50 transition-all duration-300 ${
                  openFAQ === index
                    ? 'border-teya-green/50 shadow-lg shadow-teya-green/20 bg-teya-green/5'
                    : 'hover:border-teya-green/30 hover:shadow-md'
                }`}>
                  <CollapsibleTrigger className="w-full">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-foreground text-left">
                          {faq.question}
                        </h3>
                        <motion.div
                          animate={{ rotate: openFAQ === index ? 180 : 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                        >
                          <ChevronDown className={`h-5 w-5 transition-colors ${
                            openFAQ === index ? 'text-teya-green' : 'text-muted-foreground'
                          }`} />
                        </motion.div>
                      </div>
                    </CardContent>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3, delay: 0.1 }}
                    >
                      <CardContent className="px-6 pb-6 pt-0">
                        <div className="border-l-2 border-teya-green/30 pl-4">
                          <p className="text-muted-foreground leading-relaxed">
                            {faq.answer}
                          </p>
                        </div>
                      </CardContent>
                    </motion.div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
