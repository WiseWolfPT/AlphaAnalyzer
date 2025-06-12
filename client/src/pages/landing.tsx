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
import { motion } from "framer-motion";

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
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);

  const benefits = [
    {
      icon: BarChart3,
      title: "Visualizações de dados",
      description: "Gráficos e tabelas intuitivos que tornam a análise fundamental acessível a qualquer investidor."
    },
    {
      icon: Target,
      title: "Valor Intrínseco Instantâneo",
      description: "Calcula automaticamente o valor justo de qualquer ação em segundos, baseado em métricas fundamentais."
    },
    {
      icon: Star,
      title: "Watchlists & Portfólios",
      description: "Cria watchlists ilimitadas, segue vários portfólios e importa listas em CSV para organizar os teus investimentos."
    }
  ];

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

  const faqs = [
    {
      question: "❓ Como calculam o valor intrínseco?",
      answer: "Usamos múltiplos métodos incluindo DCF (Discounted Cash Flow), análise de múltiplos e modelos proprietários que combinam dados fundamentais e técnicos para uma avaliação precisa."
    },
    {
      question: "❓ Que dados utilizam?",
      answer: "Utilizamos dados de APIs financeiras internacionais de alta qualidade, incluindo Yahoo Finance, Alpha Vantage e fontes institucionais para garantir precisão e cobertura global."
    },
    {
      question: "❓ Posso cancelar o trial a qualquer momento?",
      answer: "Sim! O trial de 7 dias é completamente grátis e sem compromissos. Podes cancelar a qualquer momento sem qualquer custo ou penalização."
    },
    {
      question: "❓ Os meus dados são seguros?",
      answer: "Absolutamente. Usamos encriptação SSL de nível bancário e nunca armazenamos informações sensíveis como passwords ou dados de conta. GDPR compliant."
    },
    {
      question: "❓ Funciona com ações portuguesas?",
      answer: "Sim! Suportamos todas as ações do PSI-20 (EDP, Galp, BCP, etc.) e mais de 10.000 ações internacionais (NASDAQ, NYSE, LSE, Euronext)."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section id="hero" className="relative overflow-hidden min-h-screen flex items-center">
        {/* Theme-aware Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-white dark:bg-gray-900 dark:from-[#0d1117] dark:to-[#161b22]" />
        
        {/* CSS Variables for themes */}
        <style jsx>{`
          :global(.light) {
            --dashboard-bg: linear-gradient(145deg, rgb(255, 255, 255) 0%, rgb(248, 250, 252) 100%);
          }
          :global(.dark) {
            --dashboard-bg: linear-gradient(145deg, #111827 0%, #0f172a 100%);
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

              {/* Simple Dark Headline */}
              <motion.h1
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...ANIMATION_CONFIG.SLOW, delay: 0.6 }}
                className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-light mb-8 leading-[0.9] tracking-tight"
              >
                <span className="text-deep-black dark:text-pure-white">Investe com</span>
                <br />
                <span className="font-bold text-chartreuse-dark dark:text-chartreuse">Precisão</span>
              </motion.h1>

              {/* Dark Theme Subtitle */}
              <motion.p
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...ANIMATION_CONFIG.MEDIUM, delay: 0.8 }}
                className="text-xl text-gray-700 dark:text-gray-300 mb-12 leading-relaxed max-w-2xl font-light"
              >
                Análise fundamental simplificada. Valor intrínseco em segundos. 
                <br />Decisões baseadas em dados, não emoções.
              </motion.p>
              
              {/* Simple Stats */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...ANIMATION_CONFIG.MEDIUM, delay: 1.0 }}
                className="flex items-center gap-8 mb-12 text-sm text-gray-600 dark:text-gray-400"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-chartreuse rounded-full" />
                  <span>+6.000 ações</span>
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

              {/* Simple CTAs */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...ANIMATION_CONFIG.MEDIUM, delay: 1.2 }}
                className="flex flex-col sm:flex-row gap-4 mb-16"
              >
                <Button 
                  size="lg" 
                  className="text-lg px-10 py-4 h-14 bg-chartreuse-dark dark:bg-chartreuse hover:bg-chartreuse-dark/90 dark:hover:bg-chartreuse/90 text-deep-black dark:text-rich-black rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-300 border-0"
                  onClick={() => window.location.href = '/trial'}
                >
                  Começar agora
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
                
                <Button 
                  variant="ghost"
                  size="lg" 
                  className="text-lg px-8 py-4 h-14 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-pure-white border border-gray-300 dark:border-gray-700 hover:border-chartreuse font-medium transition-all duration-200 rounded-full"
                  onClick={() => setShowVideoModal(true)}
                >
                  Ver demonstração
                  <Play className="h-4 w-4 ml-2" />
                </Button>
              </motion.div>

              {/* New Feature Badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.7 }}
                className="inline-flex items-center gap-2 bg-xanthous hover:bg-xanthous/90 text-deep-black px-4 py-3 rounded-lg font-semibold text-sm transition-all duration-200 cursor-pointer shadow-lg"
                onClick={() => window.location.href = '/trial'}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  <span>NOVO! IA para Análise de Valor</span>
                </div>
                <ArrowRight className="h-4 w-4" />
              </motion.div>
              
              {/* Urgency Badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.8 }}
                className="mt-4"
              >
                <div className="inline-flex items-center gap-2 bg-red-500/20 border border-red-500/40 text-red-300 px-3 py-2 rounded-lg text-xs font-semibold">
                  <Clock className="h-3 w-3" />
                  <span>Últimas 48h para aproveitares o trial grátis</span>
                </div>
              </motion.div>
            </motion.div>

            {/* Right Column - Modern Visual */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ ...ANIMATION_CONFIG.SLOW, delay: 1.0 }}
              className="lg:col-span-5 relative flex justify-center items-center"
            >
              {/* Dark Dashboard Preview */}
              <div className="relative">
                <motion.div 
                  whileHover={{ y: -8, rotateY: 5 }}
                  className="w-80 sm:w-96 h-80 sm:h-96 rounded-3xl p-6 shadow-2xl border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800"
                  style={{ 
                    boxShadow: '0 25px 80px -12px rgba(216, 242, 45, 0.15)',
                    background: 'var(--dashboard-bg)'
                  }}
                >
                  <div className="w-full h-full flex flex-col">
                    {/* Simple Header */}
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-chartreuse rounded-xl flex items-center justify-center">
                          <BarChart3 className="h-5 w-5 text-rich-black" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-deep-black dark:text-pure-white text-sm">AAPL</h4>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Apple Inc.</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-deep-black dark:text-pure-white">$175.43</div>
                        <div className="text-xs text-chartreuse">+2.34%</div>
                      </div>
                    </div>
                    
                    {/* Simple Chart */}
                    <div className="flex-1 bg-gray-100 dark:bg-gray-800/50 rounded-2xl p-6 mb-6">
                      <div className="flex items-end justify-center h-full gap-3">
                        {Array.from({ length: 8 }, (_, i) => {
                          const heights = [40, 65, 35, 80, 55, 90, 60, 75];
                          const isActive = i === 5; // Highlight one bar
                          return (
                            <motion.div
                              key={i}
                              initial={{ height: 0 }}
                              animate={{ height: `${heights[i]}%` }}
                              transition={{ duration: 0.8, delay: 1.5 + i * 0.1 }}
                              className={`w-6 rounded-lg ${
                                isActive 
                                  ? 'bg-chartreuse' 
                                  : 'bg-gray-300 dark:bg-gray-700'
                              }`}
                            />
                          );
                        })}
                      </div>
                    </div>
                    
                    {/* Simple Value Display */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Valor Intrínseco</span>
                        <span className="font-semibold text-chartreuse">$165.00</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Margem</span>
                        <span className="text-sm font-medium text-chartreuse">+6.3%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-1.5">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: '70%' }}
                          transition={{ duration: 1, delay: 2.5 }}
                          className="bg-chartreuse h-1.5 rounded-full"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Enhanced Floating Metrics with More Animations */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0, rotate: -180 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  transition={{ duration: 0.6, delay: 2.8, type: "spring", stiffness: 100 }}
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className="absolute -top-6 -left-6 w-14 h-14 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center shadow-lg border border-gray-200 dark:border-gray-700"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  >
                    <Target className="h-6 w-6 text-chartreuse" />
                  </motion.div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, x: 40, scale: 0.5 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  transition={{ duration: 0.6, delay: 3.0, type: "spring", bounce: 0.4 }}
                  whileHover={{ scale: 1.05, x: -2 }}
                  className="absolute top-1/3 -right-8 bg-white dark:bg-gray-800 rounded-xl px-3 py-2 shadow-lg border border-gray-200 dark:border-gray-700"
                >
                  <motion.div
                    animate={{ opacity: [1, 0.7, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="text-xs font-medium text-chartreuse"
                  >
                    Subvalorizada
                  </motion.div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 30, rotate: 90 }}
                  animate={{ opacity: 1, y: 0, rotate: 0 }}
                  transition={{ duration: 0.8, delay: 3.2, type: "spring", stiffness: 80 }}
                  whileHover={{ y: -5, scale: 1.1 }}
                  className="absolute -bottom-4 right-8 w-12 h-12 bg-chartreuse rounded-xl flex items-center justify-center shadow-lg"
                >
                  <motion.div
                    animate={{ y: [-2, 2, -2] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <TrendingUp className="h-5 w-5 text-rich-black" />
                  </motion.div>
                </motion.div>

                {/* Additional Floating Elements */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 3.5 }}
                  className="absolute top-1/2 -left-12 w-8 h-8 bg-pear/20 rounded-full"
                >
                  <motion.div
                    animate={{ scale: [1, 1.5, 1] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="w-full h-full bg-chartreuse rounded-full opacity-60"
                  />
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 3.8 }}
                  className="absolute bottom-1/3 -right-6 w-6 h-6 bg-chartreuse/30 rounded-full"
                >
                  <motion.div
                    animate={{ rotate: [0, 180, 360] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    className="w-full h-full bg-chartreuse rounded-full opacity-80"
                  />
                </motion.div>
              </div>

              
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
              6.000+ ações globais • S&P 500 • Nasdaq • Europa
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
              Porquê Alpha Analyzer?
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
                <Card className="border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg group">
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 bg-gray-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-chartreuse transition-colors">
                      <benefit.icon className="h-8 w-8 text-white" />
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
                  <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mx-auto mb-6 text-white font-bold text-lg shadow-lg">
                    {step.number}
                  </div>

                  {/* Connector Line */}
                  {index < steps.length - 1 && (
                    <div className="hidden md:block absolute top-8 left-[calc(50%+2rem)] w-[calc(100%-4rem)] h-0.5 bg-gradient-to-r from-primary/50 to-transparent" />
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

      {/* Testimonials Section */}
      <section id="testimonials" className="py-16 lg:py-24 bg-secondary/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              O que dizem os nossos utilizadores
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Resultados reais de investidores portugueses
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true }}
            >
              <Card className="border-border/50 hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-gray-800 to-black rounded-full flex items-center justify-center text-white font-semibold">
                      MS
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">Miguel S.</div>
                      <div className="text-sm text-muted-foreground">Porto</div>
                    </div>
                  </div>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    "Evitei uma perda de 2.000€ na Galp graças ao Alpha Analyzer. 
                    A análise mostrou que estava sobrevalorizada antes de cair 15%."
                  </p>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="w-4 h-4 bg-yellow-400 rounded-sm"></div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <Card className="border-border/50 hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-semibold">
                      JM
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">James M.</div>
                      <div className="text-sm text-muted-foreground">London, UK</div>
                    </div>
                  </div>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    "I finally invest with data, not hype. 
                    Alpha Analyzer gives me the confidence I need to be consistent."
                  </p>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="w-4 h-4 bg-yellow-400 rounded-sm"></div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              viewport={{ once: true }}
            >
              <Card className="border-border/50 hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-gray-700 to-gray-900 rounded-full flex items-center justify-center text-white font-semibold">
                      CM
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">Carlos M.</div>
                      <div className="text-sm text-muted-foreground">Braga</div>
                    </div>
                  </div>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    "Finalmente invisto com dados, não emoções. O Alpha Analyzer 
                    deu-me a confiança que precisava para ser consistente."
                  </p>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="w-4 h-4 bg-yellow-400 rounded-sm"></div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
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
              Tudo o que precisas saber sobre o Alpha Analyzer
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
                  <Card className="border-border/50 hover:border-chartreuse/50 transition-colors">
                    <CollapsibleTrigger className="w-full">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-foreground text-left">
                            {faq.question}
                          </h3>
                          <ChevronDown 
                            className={`h-5 w-5 text-muted-foreground transition-transform ${
                              openFAQ === index ? 'rotate-180' : ''
                            }`} 
                          />
                        </div>
                      </CardContent>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="px-6 pb-6 pt-0">
                        <p className="text-muted-foreground">
                          {faq.answer}
                        </p>
                      </CardContent>
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
              Junta-te a 500+ investidores portugueses que já usam Alpha Analyzer para maximizar os seus retornos.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="text-lg px-8 py-4 h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                onClick={() => window.location.href = '/trial'}
              >
                🚀 Começar Trial Grátis
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="text-lg px-8 py-4 h-14"
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
            <h3 className="text-xl font-semibold mb-4">Demo do Alpha Analyzer</h3>
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
    </div>
  );
}