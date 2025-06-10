import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Pricing } from "@/components/marketing/Pricing";
import { ChartsShowcase } from "@/components/marketing/ChartsShowcase";
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
  Bell
} from "lucide-react";
import { motion } from "framer-motion";

export default function Landing() {
  const [showVideoModal, setShowVideoModal] = useState(false);

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
      icon: Bell,
      title: "Alertas Inteligentes",
      description: "Recebe notificações quando as ações atingem o teu preço alvo ou quando há oportunidades de compra."
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
      title: "Descobre o valor intrínseco das ações",
      description: "Obtém o valor justo calculado automaticamente em segundos"
    },
    {
      number: "03",
      title: "Recebe alertas personalizados",
      description: "Fica a saber quando há oportunidades de compra ou venda"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section id="hero" className="relative overflow-hidden min-h-screen flex items-center">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-background to-emerald-500/5" />
        
        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              {/* Badge */}
              <div className="flex justify-center mb-8">
                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 px-4 py-2 text-sm">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Plataforma #1 em Portugal
                </Badge>
              </div>

              {/* Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-foreground mb-8 leading-tight">
                Descobre ações subvalorizadas
                <span className="block bg-gradient-to-r from-orange-500 to-emerald-500 bg-clip-text text-transparent">
                  antes dos outros
                </span>
              </h1>

              {/* Subtitle */}
              <p className="text-xl lg:text-2xl text-muted-foreground mb-6 leading-relaxed max-w-3xl mx-auto">
                Análise inteligente de ações no mercado global. 
                Valor intrínseco calculado em segundos.
              </p>

              {/* Micro-copy */}
              <p className="text-lg text-muted-foreground/80 mb-8 leading-relaxed max-w-4xl mx-auto">
                Visualizações de dados para compreender facilmente os fundamentos de cada empresa.
              </p>

              {/* Trial Benefits */}
              <div className="flex flex-wrap justify-center items-center gap-6 mb-12 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  <span>Sem cartão de crédito</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  <span>Acesso completo</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  <span>Cancela quando quiseres</span>
                </div>
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
                <Button 
                  size="lg" 
                  className="text-lg px-8 py-4 h-16 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 font-semibold"
                  onClick={() => window.location.href = '/trial'}
                >
                  🚀 Trial de 7 Dias Grátis
                </Button>
                
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="text-lg px-8 py-4 h-16 border-2 hover:bg-secondary/50"
                  onClick={() => setShowVideoModal(true)}
                >
                  <Play className="h-5 w-5 mr-2" />
                  Ver demonstração
                </Button>
              </div>

              {/* Social Proof */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-8 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>500+ investidores ativos</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  <span>89% precisão nas análises fundamentais</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  <span>Usado em 20+ corretoras</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Background decoration */}
        <div className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl">
          <div
            className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-primary to-accent opacity-20 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]"
            style={{
              clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
            }}
          />
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
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              O valor intrínseco é o preço justo de uma ação baseado nos seus fundamentais financeiros. 
              Warren Buffett usa esta estratégia há 50+ anos para encontrar ações subvalorizadas.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                viewport={{ once: true }}
                className="bg-red-500/10 border border-red-500/20 rounded-xl p-6"
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
                className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6"
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
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-primary/20 transition-colors">
                      <benefit.icon className="h-8 w-8 text-primary" />
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
                      AR
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">Ana R.</div>
                      <div className="text-sm text-muted-foreground">Lisboa</div>
                    </div>
                  </div>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    "Descobri que a EDP estava 15% subvalorizada e investi. 
                    Em 3 meses já tenho +12% de retorno. Simples e eficaz!"
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

      {/* Pricing Section */}
      <Pricing />

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

          <div className="max-w-3xl mx-auto space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true }}
            >
              <Card className="border-border/50">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-3">
                    ❓ Como calculam o valor intrínseco?
                  </h3>
                  <p className="text-muted-foreground">
                    Usamos múltiplos métodos incluindo DCF (Discounted Cash Flow), análise de múltiplos 
                    e modelos proprietários que combinam dados fundamentais e técnicos para uma avaliação precisa.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <Card className="border-border/50">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-3">
                    ❓ Que corretoras suportam?
                  </h3>
                  <p className="text-muted-foreground">
                    Funcionamos com todas as principais corretoras portuguesas e internacionais: 
                    Degiro, eToro, XTB, Interactive Brokers, Trading 212, e muitas outras.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              viewport={{ once: true }}
            >
              <Card className="border-border/50">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-3">
                    ❓ Posso cancelar o trial a qualquer momento?
                  </h3>
                  <p className="text-muted-foreground">
                    Sim! O trial de 7 dias é completamente grátis e sem compromissos. 
                    Podes cancelar a qualquer momento sem qualquer custo ou penalização.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              viewport={{ once: true }}
            >
              <Card className="border-border/50">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-3">
                    ❓ Os meus dados são seguros?
                  </h3>
                  <p className="text-muted-foreground">
                    Absolutamente. Usamos encriptação SSL de nível bancário e nunca armazenamos 
                    informações sensíveis como passwords ou dados de conta. GDPR compliant.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              viewport={{ once: true }}
            >
              <Card className="border-border/50">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-3">
                    ❓ Funciona com ações portuguesas?
                  </h3>
                  <p className="text-muted-foreground">
                    Sim! Suportamos todas as ações do PSI-20 (EDP, Galp, BCP, etc.) 
                    e mais de 10.000 ações internacionais (NASDAQ, NYSE, LSE, Euronext).
                  </p>
                </CardContent>
              </Card>
            </motion.div>
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