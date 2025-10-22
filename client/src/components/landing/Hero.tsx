import { useState } from "react";
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Play, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { HeroAnimation } from "@/components/animations/HeroAnimation";

// Optimized animation configurations
const ANIMATION_CONFIG = {
  FAST: { duration: 0.3, ease: "easeOut" },
  MEDIUM: { duration: 0.5, ease: "easeOut" },
  SLOW: { duration: 0.8, ease: "easeOut" }
} as const;

interface HeroProps {
  onShowVideoModal: (show: boolean) => void;
}

export function Hero({ onShowVideoModal }: HeroProps) {
  const { t } = useTranslation();
  return (
    <section id="hero" className="relative overflow-hidden min-h-screen flex items-center">
      {/* Theme-aware Background */}
      <div className="absolute inset-0 bg-slate-50 dark:bg-gray-900" />

      {/* CSS Variables for themes */}
      <style jsx>{`
        :global(.light) {
          --dashboard-bg: rgb(255, 255, 255);
        }
        :global(.dark) {
          --dashboard-bg: #111827;
        }
      `}</style>

      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center min-h-screen py-20">
          {/* Left Column - Content */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...ANIMATION_CONFIG.SLOW, delay: 0.2 }}
            className="lg:col-span-7 text-left"
          >
            {/* Orange Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...ANIMATION_CONFIG.MEDIUM, delay: 0.4 }}
              className="inline-flex items-center gap-2 bg-teya-green/10 text-teya-green border border-teya-green/20 px-4 py-2 rounded-full font-medium text-sm mb-8 hover:bg-teya-green/20 transition-all cursor-pointer"
              onClick={() => window.location.href = '/trial'}
            >
              <div className="w-2 h-2 bg-teya-green rounded-full animate-pulse" />
              {t('pages.landing.hero.badge', 'Free trial • 7 days')}
            </motion.div>

            {/* Hero Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...ANIMATION_CONFIG.SLOW, delay: 0.6 }}
              className="heading-hero mb-8"
            >
              <span className="text-foreground">{t('pages.landing.hero.title_line1', 'Visual Financial Analysis')}</span>
              <br />
              <span className="font-bold text-teya-green">{t('pages.landing.hero.title_line2', 'in Seconds')}</span>
            </motion.h1>

            {/* Hero Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...ANIMATION_CONFIG.MEDIUM, delay: 0.8 }}
              className="text-body-large mb-12 max-w-2xl text-muted-foreground"
            >
              {t('pages.landing.hero.subtitle_1', 'Charts for revenue, profit and margins + intrinsic value calculated automatically.')}
              <br />{t('pages.landing.hero.subtitle_2', 'All in one platform, no spreadsheets needed.')}
            </motion.p>

            {/* Simple Stats - US Market Focus */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...ANIMATION_CONFIG.MEDIUM, delay: 1.0 }}
              className="flex items-center gap-8 mb-12 text-caption"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-teya-green rounded-full" />
                <span>S&P 500 + NASDAQ</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-teya-green rounded-full" />
                <span>{t('general.realtime', 'Real-time')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-teya-green rounded-full" />
                <span>{t('pages.landing.hero.accuracy', '94%+ accuracy')}</span>
              </div>
            </motion.div>

            {/* Enhanced CTAs with micro-animations */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...ANIMATION_CONFIG.MEDIUM, delay: 1.2 }}
              className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-16"
            >
              <motion.div
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <Button
                  size="lg"
                  className="text-base sm:text-lg px-6 sm:px-10 py-3 sm:py-4 h-12 sm:h-14 bg-teya-green hover:bg-teya-green/90 text-teya-black rounded-full font-semibold shadow-lg hover:shadow-xl hover:shadow-teya-green/25 transition-all duration-300 border-0 group w-full sm:w-auto"
                  onClick={() => window.location.href = '/trial'}
                >
                  {t('pages.landing.hero.cta_tesla', '🚨 Find out if Tesla is overpriced NOW')}
                  <motion.div
                    className="inline-block ml-2"
                    animate={{ x: [0, 2, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <ArrowRight className="h-5 w-5" />
                  </motion.div>
                </Button>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  variant="ghost"
                  size="lg"
                  className="text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 h-12 sm:h-14 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-pure-white border border-gray-300 dark:border-gray-700 hover:border-teya-green font-medium transition-all duration-200 rounded-full group w-full sm:w-auto"
                  onClick={() => onShowVideoModal(true)}
                >
                {t('pages.landing.hero.view_demo', 'View demo')}
                  <motion.div
                    className="inline-block ml-2"
                    whileHover={{ scale: 1.2 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <Play className="h-4 w-4" />
                  </motion.div>
                </Button>
              </motion.div>
            </motion.div>

            {/* Enhanced Feature Badge with micro-animations */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center gap-2 bg-teya-green hover:bg-teya-green/90 text-teya-black px-4 py-3 rounded-lg font-semibold text-sm transition-all duration-200 cursor-pointer shadow-lg hover:shadow-xl hover:shadow-teya-green/25 group"
              onClick={() => window.location.href = '/trial'}
            >
              <div className="flex items-center gap-2">
                <motion.div
                  className="w-2 h-2 bg-white rounded-full"
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [1, 0.7, 1]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
                <span>{t('pages.landing.hero.badge_new_value', 'NEW! Automatic Value Analysis')}</span>
              </div>
              <motion.div
                animate={{ x: [0, 2, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <ArrowRight className="h-4 w-4" />
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Right Column - Animated Character & Charts */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ ...ANIMATION_CONFIG.SLOW, delay: 1.0 }}
            className="lg:col-span-5 relative flex justify-center items-center"
          >
            {/* Hero Animation with Resilient Loading */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 1.2 }}
              className="flex justify-center items-center"
            >
              <HeroAnimation
                className="drop-shadow-2xl"
                style={{
                  height: 'clamp(400px, 50vw, 600px)',
                  width: 'clamp(400px, 50vw, 600px)',
                  maxHeight: '600px',
                  maxWidth: '600px'
                }}
              />
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Background decoration */}
      <div className="absolute inset-x-0 bottom-0 -z-10 transform-gpu overflow-hidden">
        <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gray-700 opacity-15 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" />
      </div>

      {/* Dark Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 4 }}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 cursor-pointer group"
        onClick={() => document.getElementById('education')?.scrollIntoView({ behavior: 'smooth' })}
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="w-6 h-10 border border-gray-600 rounded-full flex justify-center group-hover:border-teya-green transition-colors"
        >
          <div className="w-1 h-3 bg-gray-500 rounded-full mt-2 group-hover:bg-teya-green transition-colors" />
        </motion.div>
      </motion.div>
    </section>
  );
}
