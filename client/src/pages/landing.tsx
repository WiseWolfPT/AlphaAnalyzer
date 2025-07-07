import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Pricing } from "@/components/marketing/Pricing";
import { ChartsShowcase } from "@/components/marketing/ChartsShowcase";
import { FundamentalsGrid } from "@/components/marketing/FundamentalsGrid";
import { WatchlistsPromo } from "@/components/marketing/WatchlistsPromo";
import { Roadmap } from "@/components/marketing/Roadmap";
import { StickyCTA } from "@/components/marketing/StickyCTA";
import { TrialCTA } from "@/components/shared/TrialCTA";
import { InteractiveDemo } from "@/components/marketing/InteractiveDemo";
import { ExitIntentModal, useExitIntent } from "@/components/marketing/ExitIntentModal";
import { ScrollProgress } from "@/components/shared/ScrollProgress";
import { 
  TrendingUp, 
  Shield, 
  Zap, 
  BarChart3, 
  Target,
  CheckCircle,
  Play,
  ArrowRight,
  Users,
  Award,
  Brain,
  Clock,
  Bell,
  Star,
  ChevronDown
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { 
  FadeIn, 
  ScaleIn, 
  SlideIn, 
  StaggerList, 
  PageTransition,
  hoverScale,
  hoverBrightness 
} from "@/components/animations/css-animations";
import { HeroAnimation } from "@/components/animations/HeroAnimation";

// Optimized animation configurations
const ANIMATION_CONFIG = {
  FAST: { duration: 0.3, ease: "easeOut" },
  MEDIUM: { duration: 0.5, ease: "easeOut" },
  SLOW: { duration: 0.8, ease: "easeOut" }
} as const;

const DELAYS = {
  NONE: 0,
  FAST: 0.1,
  MEDIUM: 0.2,
  SLOW: 0.3
} as const;

export default function Landing() {
  const { t } = useTranslation();
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
  const { showExitIntent, closeExitIntent } = useExitIntent();

  const benefits = [
    {
      icon: BarChart3,
      title: t('benefits.dataVisualization.title'),
      description: t('benefits.dataVisualization.description')
    },
    {
      icon: Target,
      title: t('benefits.intrinsicValue.title'),
      description: t('benefits.intrinsicValue.description')
    },
    {
      icon: Star,
      title: t('benefits.watchlistsPortfolios.title'),
      description: t('benefits.watchlistsPortfolios.description')
    }
  ];

  const steps = [
    {
      number: t('steps.step1.number'),
      title: t('steps.step1.title'),
      description: t('steps.step1.description')
    },
    {
      number: t('steps.step2.number'), 
      title: t('steps.step2.title'),
      description: t('steps.step2.description')
    },
    {
      number: t('steps.step3.number'),
      title: t('steps.step3.title'),
      description: t('steps.step3.description')
    }
  ];

  const faqs = [
    {
      question: t('faq.intrinsicCalculation.question'),
      answer: t('faq.intrinsicCalculation.answer')
    },
    {
      question: t('faq.dataSource.question'),
      answer: t('faq.dataSource.answer')
    },
    {
      question: t('faq.trialCancellation.question'),
      answer: t('faq.trialCancellation.answer')
    },
    {
      question: t('faq.dataSecurity.question'),
      answer: t('faq.dataSecurity.answer')
    },
    {
      question: t('faq.portugueseStocks.question'),
      answer: t('faq.portugueseStocks.answer')
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <ScrollProgress />
      <Header />
      
      {/* Hero Section */}
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
                className="inline-flex items-center gap-2 bg-chartreuse/10 text-chartreuse border border-chartreuse/20 px-4 py-2 rounded-full font-medium text-sm mb-8 hover:bg-chartreuse/20 transition-all cursor-pointer"
                onClick={() => window.location.href = '/trial'}
              >
                <div className="w-2 h-2 bg-chartreuse rounded-full animate-pulse" />
                Teste gratuito • 7 dias
              </motion.div>

              {/* Optimized Power Headline */}
              <motion.h1
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...ANIMATION_CONFIG.SLOW, delay: 0.6 }}
                className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-light mb-8 leading-[0.9] tracking-tight"
              >
                <span className="text-deep-black dark:text-pure-white">Evita Perdas de</span>
                <br />
                <span className="font-bold text-chartreuse-dark dark:text-chartreuse">-30% com 94% Precisão</span>
              </motion.h1>

              {/* Optimized Subtitle */}
              <motion.p
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...ANIMATION_CONFIG.MEDIUM, delay: 0.8 }}
                className="text-xl text-gray-700 dark:text-gray-300 mb-12 leading-relaxed max-w-2xl font-light"
              >
                O algoritmo que previu a queda da Tesla (-33%), Zoom (-85%) e PayPal (-78%). 
                <br />Evita as armadilhas que custaram aos investidores €2.1B só em 2023.
              </motion.p>
              
              {/* Simple Stats - US Market Focus */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...ANIMATION_CONFIG.MEDIUM, delay: 1.0 }}
                className="flex items-center gap-8 mb-12 text-sm text-gray-600 dark:text-gray-400"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-chartreuse rounded-full" />
                  <span>S&P 500 + NASDAQ</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-chartreuse rounded-full" />
                  <span>Tempo real</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-chartreuse rounded-full" />
                  <span>Precisão 94%+</span>
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
                    className="text-base sm:text-lg px-6 sm:px-10 py-3 sm:py-4 h-12 sm:h-14 bg-chartreuse-dark dark:bg-chartreuse hover:bg-chartreuse-dark/90 dark:hover:bg-chartreuse/90 text-deep-black dark:text-rich-black rounded-full font-semibold shadow-lg hover:shadow-xl hover:shadow-chartreuse/25 transition-all duration-300 border-0 group w-full sm:w-auto"
                    onClick={() => window.location.href = '/trial'}
                  >
                    🚨 Descobrir se Tesla está cara AGORA
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
                    className="text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 h-12 sm:h-14 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-pure-white border border-gray-300 dark:border-gray-700 hover:border-chartreuse font-medium transition-all duration-200 rounded-full group w-full sm:w-auto"
                    onClick={() => setShowVideoModal(true)}
                  >
                    Ver demonstração
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
                className="inline-flex items-center gap-2 bg-chartreuse-dark dark:bg-chartreuse hover:bg-chartreuse-dark/90 dark:hover:bg-chartreuse/90 text-deep-black px-4 py-3 rounded-lg font-semibold text-sm transition-all duration-200 cursor-pointer shadow-lg hover:shadow-xl hover:shadow-chartreuse/25 group"
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
                  <span>NOVO! Análise Automática de Valor</span>
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
              {/* Animation Placeholder - Ready for GitHub Implementation */}
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
            className="w-6 h-10 border border-gray-600 rounded-full flex justify-center group-hover:border-chartreuse transition-colors"
          >
            <div className="w-1 h-3 bg-gray-500 rounded-full mt-2 group-hover:bg-chartreuse transition-colors" />
          </motion.div>
        </motion.div>
      </section>


      {/* Interactive Demo Section */}
      <InteractiveDemo />

      {/* Education Section */}
      <section id="education" className="py-20 lg:py-32 bg-gray-100 dark:bg-gray-900">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="max-w-5xl mx-auto text-center"
          >
            <h2 className="text-4xl lg:text-6xl font-light text-deep-black dark:text-pure-white mb-8">
              O que é <span className="font-semibold text-chartreuse">Valor Intrínseco</span>?
            </h2>
            <p className="text-xl text-gray-700 dark:text-gray-300 mb-6 leading-relaxed font-light max-w-3xl mx-auto">
              O preço justo de uma ação baseado em fundamentos financeiros. 
              A estratégia que Warren Buffett usa há décadas.
            </p>
            <p className="text-base text-chartreuse font-medium mb-16">
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
                <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  Sem Valor Intrínseco
                </h3>
                <p className="text-muted-foreground text-left">
                  • Investes baseado em emoções<br/>
                  • Compras no pico, vendes no fundo<br/>
                  • Segues dicas de "gurus" no YouTube<br/>
                  • Perdas frequentes e frustração
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                viewport={{ once: true }}
                className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 sm:p-6"
              >
                <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                  Com Valor Intrínseco
                </h3>
                <p className="text-muted-foreground text-left">
                  • Investes baseado em dados concretos<br/>
                  • Compras quando está barato, vendes caro<br/>
                  • Ignoras o ruído do mercado<br/>
                  • Retornos consistentes a longo prazo
                </p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-16 lg:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Porquê Alfalyzer?
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              A tecnologia que faz a diferença entre lucro e prejuízo
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="border-border/50 hover:border-chartreuse/50 transition-all duration-300 hover:shadow-lg hover:shadow-chartreuse/20 group">
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 bg-chartreuse-dark dark:bg-chartreuse rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-chartreuse dark:group-hover:bg-chartreuse-dark transition-all duration-300 shadow-lg hover:shadow-chartreuse/30 hover:scale-105">
                      <benefit.icon className="h-8 w-8 text-deep-black" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-4">
                      {benefit.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {benefit.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Fundamentals Grid Section */}
      <FundamentalsGrid />
      
      {/* Charts Showcase Section */}
      <ChartsShowcase />

      {/* How it Works Section */}
      <section id="how-it-works" className="py-16 lg:py-24 bg-secondary/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Como funciona
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
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
                  <div className="w-16 h-16 bg-chartreuse-dark dark:bg-chartreuse rounded-full flex items-center justify-center mx-auto mb-6 text-deep-black font-bold text-lg shadow-lg hover:shadow-chartreuse/30 hover:scale-105 transition-all duration-300">
                    {step.number}
                  </div>

                  {/* Connector Line */}
                  {index < steps.length - 1 && (
                    <div className="hidden md:block absolute top-8 left-[calc(50%+2rem)] w-[calc(100%-4rem)] h-0.5 bg-chartreuse/30" />
                  )}

                  <h3 className="text-xl font-semibold text-foreground mb-4">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section id="social-proof" className="py-16 lg:py-24 bg-secondary/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Dados reais de performance
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Estatísticas verificadas dos nossos algoritmos de análise
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
                  <div className="text-4xl font-bold text-chartreuse mb-2">94.2%</div>
                  <div className="text-sm text-muted-foreground">Precisão das previsões</div>
                  <div className="text-xs text-muted-foreground mt-2">Últimos 12 meses</div>
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
                  <div className="text-sm text-muted-foreground">Retorno médio anual</div>
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
                  <div className="text-sm text-muted-foreground">Ações analisadas</div>
                  <div className="text-xs text-muted-foreground mt-2">Mercados globais</div>
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
                  <div className="text-sm text-muted-foreground">Perdas evitadas</div>
                  <div className="text-xs text-muted-foreground mt-2">Identificação de riscos</div>
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
            <Card className="border-chartreuse/20 bg-chartreuse/5 max-w-3xl mx-auto">
              <CardContent className="p-8">
                <div className="text-6xl text-chartreuse mb-4">"</div>
                <p className="text-xl text-foreground font-medium leading-relaxed mb-4">
                  O preço é o que pagas. O valor é o que recebes.
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

      {/* Watchlists & Portfolios Section */}
      <WatchlistsPromo />
      
      {/* Pricing Section */}
      <Pricing id="pricing" />

      {/* FAQ Section */}
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
              Perguntas Frequentes
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Tudo o que precisas saber sobre o Alfalyzer
            </p>
          </motion.div>

          <div className="max-w-3xl mx-auto space-y-4">
            {faqs.map((faq, index) => (
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
                      ? 'border-chartreuse/50 shadow-lg shadow-chartreuse/20 bg-chartreuse/5' 
                      : 'hover:border-chartreuse/30 hover:shadow-md'
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
                              openFAQ === index ? 'text-chartreuse' : 'text-muted-foreground'
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
                          <div className="border-l-2 border-chartreuse/30 pl-4">
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

      {/* CTA Section */}
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
              Pronto para transformar os teus investimentos?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Junta-te aos investidores inteligentes que analisam ações com dados, não emoções.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="text-lg px-8 py-4 h-14 bg-chartreuse-dark dark:bg-chartreuse hover:bg-chartreuse-dark/90 dark:hover:bg-chartreuse/90 text-deep-black font-semibold"
                onClick={() => window.location.href = '/trial'}
              >
                🎯 Evitar próxima queda como Tesla (-33%)
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="text-lg px-8 py-4 h-14 border-chartreuse/50 text-chartreuse hover:bg-chartreuse/10"
                onClick={() => setShowVideoModal(true)}
              >
                Ver demonstração
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Roadmap Section */}
      <Roadmap />
      
      {/* Sticky CTA */}
      <StickyCTA />
      
      <Footer />

      {/* Video Modal Placeholder */}
      {showVideoModal && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setShowVideoModal(false)}
        >
          <div 
            className="bg-background rounded-xl p-8 max-w-2xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold mb-4">Demo do Alfalyzer</h3>
            <div className="aspect-video bg-secondary rounded-lg flex items-center justify-center">
              <p className="text-muted-foreground">Vídeo demo aqui</p>
            </div>
            <Button 
              variant="outline" 
              className="mt-4 w-full"
              onClick={() => setShowVideoModal(false)}
            >
              Fechar
            </Button>
          </div>
        </div>
      )}

      {/* Exit Intent Modal */}
      <ExitIntentModal isOpen={showExitIntent} onClose={closeExitIntent} />
    </div>
  );
}