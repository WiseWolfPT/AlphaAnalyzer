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
        {/* Background - Charcoal Grey with Noise */}
        <div className="absolute inset-0 bg-gray-800" style={{ 
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.03'/%3E%3C/svg%3E")` 
        }} />
        
        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center min-h-screen py-16 sm:py-20">
            {/* Left Column - Content */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="text-left lg:text-left lg:pl-4 xl:pl-8 lg:pr-6"
            >
              {/* Trial Badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="inline-flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-full font-semibold text-sm mb-6 hover:bg-emerald-400 transition-colors cursor-pointer shadow-lg"
                onClick={() => window.location.href = '/trial'}
              >
                <Clock className="h-4 w-4" />
                Experimenta grátis por 7 dias!
              </motion.div>

              {/* Main Headline */}
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold mb-6 leading-[1.1] tracking-tight"
              >
                <span className="text-tangerine">Lucra</span>
                <br />
                <span className="text-white">em qualquer</span>
                <br />
                <span className="text-tangerine">Condição de Mercado</span>
              </motion.h1>

              {/* Subtitle */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="text-lg sm:text-xl text-gray-200 mb-8 leading-relaxed max-w-xl"
              >
                <span className="text-tangerine font-semibold">Gestores de fundos</span> recorrem ao valor intrínseco para gerar <span className="text-tangerine font-semibold">retornos consistentes</span> — agora é a tua vez.
              </motion.p>
              
              {/* Global Coverage */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.45 }}
                className="text-lg text-tangerine font-semibold mb-4"
              >
                Cobertura de +6.000 ações globais
              </motion.p>
              
              {/* International Stock Logos */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="mb-8"
              >
                <div className="flex items-center gap-3 mb-2">
                  {['AAPL', 'MSFT', 'AMZN', 'TSLA', 'BABA'].map((ticker, index) => (
                    <div
                      key={ticker}
                      className="w-8 h-8 bg-gray-600 rounded-lg flex items-center justify-center text-xs font-bold text-white opacity-60 hover:opacity-100 hover:bg-tangerine transition-all duration-200 cursor-pointer"
                    >
                      {ticker.slice(0, 2)}
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Value Proposition */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="text-lg text-gray-200 mb-8 leading-relaxed max-w-lg"
              >
                Damos-te as <span className="text-tangerine font-semibold">ferramentas, estratégias e insights</span> para investires como os profissionais.
              </motion.p>

              {/* CTAs */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="flex flex-col sm:flex-row gap-4 mb-8"
              >
                <Button 
                  size="lg" 
                  className="text-lg px-8 py-4 h-16 bg-tangerine hover:bg-orange-400 hover:shadow-2xl hover:shadow-orange-500/25 text-white shadow-xl transition-all duration-200 font-bold border-2 border-tangerine hover:border-orange-400"
                  onClick={() => window.location.href = '/trial'}
                  aria-label="Começar trial gratuito de 7 dias"
                >
                  <Target className="h-5 w-5 mr-3" />
                  Começar Trial Grátis
                </Button>
                
                <Button 
                  variant="outline"
                  size="lg" 
                  className="text-lg px-8 py-4 h-16 bg-transparent hover:bg-white/10 text-white border-2 border-gray-400 hover:border-white shadow-lg hover:shadow-xl transition-all duration-200 font-semibold"
                  onClick={() => setShowVideoModal(true)}
                  aria-label="Ver demonstração do produto"
                >
                  <Play className="h-5 w-5 mr-3" />
                  Ver Demo
                </Button>
              </motion.div>

              {/* New Feature Badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.7 }}
                className="inline-flex items-center gap-2 bg-tangerine hover:bg-orange-400 text-white px-4 py-3 rounded-lg font-semibold text-sm transition-all duration-200 cursor-pointer shadow-lg"
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

            {/* Right Column - Visual */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="relative flex justify-center items-center mt-8 lg:mt-0"
            >
              {/* Phone Mockup with Chart */}
              <div className="relative">
                <div className="w-72 sm:w-80 h-80 sm:h-96 bg-white rounded-[2.5rem] p-4 sm:p-6 shadow-2xl transform rotate-2 hover:rotate-1 transition-transform duration-300" style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255,255,255,0.1)' }}>
                  <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-4 flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-8 h-8 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg"></div>
                      <div className="flex gap-1">
                        <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                        <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                        <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                      </div>
                    </div>
                    
                    {/* Chart Area */}
                    <div className="flex-1 bg-white rounded-xl p-4 mb-4">
                      <div className="flex items-end justify-center h-full gap-2">
                        {Array.from({ length: 12 }, (_, i) => {
                          const heights = [30, 45, 60, 35, 75, 50, 40, 85, 55, 70, 45, 65];
                          const colors = ['bg-green-500', 'bg-red-500', 'bg-green-500', 'bg-red-500', 'bg-green-500', 'bg-green-500', 'bg-red-500', 'bg-green-500', 'bg-red-500', 'bg-green-500', 'bg-red-500', 'bg-green-500'];
                          return (
                            <div
                              key={i}
                              className={`w-4 rounded-t-sm ${colors[i]}`}
                              style={{ height: `${heights[i]}%` }}
                            />
                          );
                        })}
                      </div>
                    </div>
                    
                    {/* Stats */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">Valor Atual</span>
                        <span className="font-bold text-gray-800">€175.43</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">Valor Intrínseco</span>
                        <span className="font-bold text-yellow-600">€165.00</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 h-2 rounded-full w-3/4"></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating Elements */}
                <div className="absolute -top-8 -left-8 w-16 h-16 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-black font-bold text-xl">€</span>
                </div>

                <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-gradient-to-r from-yellow-600 to-orange-600 rounded-full flex items-center justify-center shadow-lg">
                  <TrendingUp className="h-6 w-6 text-black" />
                </div>

                <div className="absolute top-1/2 -right-12 w-20 h-8 bg-white rounded-lg shadow-lg flex items-center justify-center">
                  <span className="text-green-600 font-bold text-sm">+15%</span>
                </div>
              </div>

              {/* Arrow */}
              <div className="absolute -bottom-12 right-8 text-yellow-500">
                <ArrowRight className="h-16 w-16 transform rotate-45" />
              </div>
              
            </motion.div>
          </div>
        </div>

        {/* Background decoration */}
        <div className="absolute inset-x-0 bottom-0 -z-10 transform-gpu overflow-hidden">
          <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gray-700 opacity-15 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" />
        </div>
        
        {/* Social Proof */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1 }}
          className="absolute bottom-16 sm:bottom-20 left-1/2 transform -translate-x-1/2 w-full max-w-md px-4"
        >
          <div className="bg-white/10 backdrop-blur-md rounded-2xl px-6 py-4 border border-white/20 shadow-2xl">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 border-2 border-white flex items-center justify-center text-xs font-bold text-white">A</div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-green-600 border-2 border-white flex items-center justify-center text-xs font-bold text-white">M</div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-purple-600 border-2 border-white flex items-center justify-center text-xs font-bold text-white">C</div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 border-2 border-white flex items-center justify-center text-xs font-bold text-white">+</div>
                </div>
                <div className="text-white">
                  <div className="font-semibold"><span className="text-tangerine">+1.200</span> investidores</div>
                  <div className="text-xs text-gray-300">confiam no Alpha Analyzer</div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="w-3 h-3 bg-yellow-400 rounded-sm"></div>
                ))}
                <span className="text-yellow-400 text-xs font-semibold ml-1">4.9</span>
              </div>
            </div>
          </div>
        </motion.div>
        
        {/* Scroll Down Arrow */}
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2 cursor-pointer"
          onClick={() => document.getElementById('education')?.scrollIntoView({ behavior: 'smooth' })}
        >
          <div className="w-6 h-10 border-2 border-gray-500 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-tangerine rounded-full mt-2 animate-pulse"></div>
          </div>
        </motion.div>
      </section>

      {/* Trust Badges Section */}
      <section className="py-12 lg:py-16 bg-white/5">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <p className="text-sm text-gray-400 mb-8 uppercase tracking-wider font-semibold">
              Dados de fontes profissionais
            </p>
            <div className="flex flex-wrap items-center justify-center gap-8 lg:gap-12 opacity-60">
              <div className="text-gray-300 font-bold text-lg">Yahoo Finance</div>
              <div className="text-gray-300 font-bold text-lg">Alpha Vantage</div>
              <div className="text-gray-300 font-bold text-lg">Financial Modeling Prep</div>
              <div className="text-gray-300 font-bold text-lg">Polygon.io</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Education Section - What is Intrinsic Value */}
      <section id="education" className="py-16 lg:py-24 bg-secondary/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto text-center"
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
              O que é Valor Intrínseco?
            </h2>
            <p className="text-lg sm:text-xl text-muted-foreground mb-4 leading-relaxed">
              O valor intrínseco é o preço justo de uma ação baseado nos seus fundamentais financeiros. 
              Warren Buffett usa esta estratégia há 50+ anos para encontrar ações subvalorizadas.
            </p>
            <p className="text-lg text-tangerine font-semibold mb-8">
              Disponível para todas as ações S&P 500, Nasdaq 100 e principais europeias.
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
                    <div className="w-16 h-16 bg-gray-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-tangerine transition-colors">
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
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
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
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white font-semibold">
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
                  <Card className="border-border/50 hover:border-tangerine/50 transition-colors">
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