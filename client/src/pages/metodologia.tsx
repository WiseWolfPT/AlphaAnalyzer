import { motion } from "framer-motion";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Calculator, 
  TrendingUp, 
  BarChart3, 
  Target, 
  CheckCircle,
  ArrowRight,
  Lightbulb,
  Users,
  Award,
  Zap
} from "lucide-react";

export function MetodologiaPage() {
  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-teya-gray via-white to-teya-gray">
        {/* Hero Section */}
        <section className="py-20 lg:py-32">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center max-w-4xl mx-auto"
            >
              <Badge className="mb-6 bg-teya-green/10 text-teya-green border-teya-green/20">
                <Lightbulb className="w-4 h-4 mr-2" />
                Nossa Metodologia
              </Badge>
              
              <h1 className="heading-hero mb-6">
                Como o <span className="text-teya-green">Alfalyzer</span> 
                <br />Simplifica Análise Financeira
              </h1>
              
              <p className="text-body-large text-muted-foreground mb-8 max-w-2xl mx-auto">
                Descobra a metodologia científica por trás da nossa plataforma e como transformamos 
                análise financeira complexa em insights claros e acionáveis.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Methodology Steps */}
        <section className="py-16 lg:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="max-w-6xl mx-auto"
            >
              <div className="text-center mb-16">
                <h2 className="heading-section mb-4">
                  Os <span className="text-teya-green">4 Pilares</span> da Nossa Metodologia
                </h2>
                <p className="text-body text-muted-foreground max-w-2xl mx-auto">
                  Cada análise no Alfalyzer segue um processo rigoroso baseado em princípios 
                  de investimento comprovados e análise quantitativa moderna.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Pilar 1: Coleta de Dados */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card className="modern-card">
                    <CardContent className="p-8">
                      <div className="flex items-center mb-4">
                        <div className="w-12 h-12 bg-teya-green/10 rounded-xl flex items-center justify-center mr-4">
                          <BarChart3 className="w-6 h-6 text-teya-green" />
                        </div>
                        <div>
                          <h3 className="heading-subsection">1. Coleta de Dados</h3>
                          <Badge variant="outline" className="text-xs">Automática</Badge>
                        </div>
                      </div>
                      
                      <p className="text-body text-muted-foreground mb-4">
                        Agregamos dados financeiros de múltiplas fontes confiáveis, 
                        garantindo precisão e atualização em tempo real.
                      </p>
                      
                      <ul className="space-y-2">
                        <li className="flex items-center text-sm">
                          <CheckCircle className="w-4 h-4 text-teya-green mr-2 flex-shrink-0" />
                          Demonstrações financeiras auditadas
                        </li>
                        <li className="flex items-center text-sm">
                          <CheckCircle className="w-4 h-4 text-teya-green mr-2 flex-shrink-0" />
                          Dados de mercado em tempo real
                        </li>
                        <li className="flex items-center text-sm">
                          <CheckCircle className="w-4 h-4 text-teya-green mr-2 flex-shrink-0" />
                          Validação cruzada de múltiplas fontes
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Pilar 2: Análise Quantitativa */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  viewport={{ once: true }}
                >
                  <Card className="modern-card">
                    <CardContent className="p-8">
                      <div className="flex items-center mb-4">
                        <div className="w-12 h-12 bg-teya-green/10 rounded-xl flex items-center justify-center mr-4">
                          <Calculator className="w-6 h-6 text-teya-green" />
                        </div>
                        <div>
                          <h3 className="heading-subsection">2. Análise Quantitativa</h3>
                          <Badge variant="outline" className="text-xs">DCF + Múltiplos</Badge>
                        </div>
                      </div>
                      
                      <p className="text-body text-muted-foreground mb-4">
                        Aplicamos modelos de valuation acadêmicos combinados com 
                        análise de múltiplos comparativos do setor.
                      </p>
                      
                      <ul className="space-y-2">
                        <li className="flex items-center text-sm">
                          <CheckCircle className="w-4 h-4 text-teya-green mr-2 flex-shrink-0" />
                          Modelo DCF (Discounted Cash Flow)
                        </li>
                        <li className="flex items-center text-sm">
                          <CheckCircle className="w-4 h-4 text-teya-green mr-2 flex-shrink-0" />
                          Análise de múltiplos (P/E, EV/EBITDA)
                        </li>
                        <li className="flex items-center text-sm">
                          <CheckCircle className="w-4 h-4 text-teya-green mr-2 flex-shrink-0" />
                          Análise de sensibilidade de cenários
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Pilar 3: Contextualização */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  viewport={{ once: true }}
                >
                  <Card className="modern-card">
                    <CardContent className="p-8">
                      <div className="flex items-center mb-4">
                        <div className="w-12 h-12 bg-teya-green/10 rounded-xl flex items-center justify-center mr-4">
                          <TrendingUp className="w-6 h-6 text-teya-green" />
                        </div>
                        <div>
                          <h3 className="heading-subsection">3. Contextualização</h3>
                          <Badge variant="outline" className="text-xs">Setor + Mercado</Badge>
                        </div>
                      </div>
                      
                      <p className="text-body text-muted-foreground mb-4">
                        Contextualizamos a análise com dados do setor, ciclo econômico 
                        e tendências macroeconômicas relevantes.
                      </p>
                      
                      <ul className="space-y-2">
                        <li className="flex items-center text-sm">
                          <CheckCircle className="w-4 h-4 text-teya-green mr-2 flex-shrink-0" />
                          Benchmarking setorial
                        </li>
                        <li className="flex items-center text-sm">
                          <CheckCircle className="w-4 h-4 text-teya-green mr-2 flex-shrink-0" />
                          Análise de ciclo econômico
                        </li>
                        <li className="flex items-center text-sm">
                          <CheckCircle className="w-4 h-4 text-teya-green mr-2 flex-shrink-0" />
                          Fatores macroeconômicos
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Pilar 4: Comunicação Visual */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  viewport={{ once: true }}
                >
                  <Card className="modern-card">
                    <CardContent className="p-8">
                      <div className="flex items-center mb-4">
                        <div className="w-12 h-12 bg-teya-green/10 rounded-xl flex items-center justify-center mr-4">
                          <Target className="w-6 h-6 text-teya-green" />
                        </div>
                        <div>
                          <h3 className="heading-subsection">4. Comunicação Visual</h3>
                          <Badge variant="outline" className="text-xs">Insights Claros</Badge>
                        </div>
                      </div>
                      
                      <p className="text-body text-muted-foreground mb-4">
                        Transformamos dados complexos em visualizações intuitivas 
                        e recomendações claras e acionáveis.
                      </p>
                      
                      <ul className="space-y-2">
                        <li className="flex items-center text-sm">
                          <CheckCircle className="w-4 h-4 text-teya-green mr-2 flex-shrink-0" />
                          Dashboards visuais intuitivos
                        </li>
                        <li className="flex items-center text-sm">
                          <CheckCircle className="w-4 h-4 text-teya-green mr-2 flex-shrink-0" />
                          Recomendações baseadas em dados
                        </li>
                        <li className="flex items-center text-sm">
                          <CheckCircle className="w-4 h-4 text-teya-green mr-2 flex-shrink-0" />
                          Alertas e insights automáticos
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Differential Section */}
        <section className="py-16 lg:py-24 bg-teya-dark text-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="max-w-6xl mx-auto"
            >
              <div className="text-center mb-16">
                <h2 className="heading-section mb-4">
                  O Que Nos Torna <span className="text-teya-green">Únicos</span>
                </h2>
                <p className="text-body text-gray-300 max-w-2xl mx-auto">
                  Combinamos o rigor académico com a praticidade do mundo real, 
                  democratizando o acesso a análises de qualidade institucional.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  viewport={{ once: true }}
                  className="text-center"
                >
                  <div className="w-16 h-16 bg-teya-green/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Zap className="w-8 h-8 text-teya-green" />
                  </div>
                  <h3 className="heading-subsection mb-3">Velocidade</h3>
                  <p className="text-body text-gray-300">
                    Análises que levavam horas agora ficam prontas em segundos, 
                    sem comprometer a qualidade ou precisão.
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  viewport={{ once: true }}
                  className="text-center"
                >
                  <div className="w-16 h-16 bg-teya-green/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Award className="w-8 h-8 text-teya-green" />
                  </div>
                  <h3 className="heading-subsection mb-3">Precisão</h3>
                  <p className="text-body text-gray-300">
                    Modelos validados por décadas de investigação acadêmica 
                    e refinados com dados do mercado real.
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  viewport={{ once: true }}
                  className="text-center"
                >
                  <div className="w-16 h-16 bg-teya-green/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-teya-green" />
                  </div>
                  <h3 className="heading-subsection mb-3">Acessibilidade</h3>
                  <p className="text-body text-gray-300">
                    Tornamos análise financeira sofisticada acessível a qualquer 
                    investidor, independentemente da experiência.
                  </p>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 lg:py-32">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="text-center max-w-4xl mx-auto"
            >
              <h2 className="heading-section mb-6">
                Pronto para Experimentar a <span className="text-teya-green">Nossa Metodologia</span>?
              </h2>
              
              <p className="text-body-large text-muted-foreground mb-8">
                Junte-se a milhares de investidores que já transformaram a forma 
                como analisam oportunidades de investimento.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Button 
                  size="lg"
                  className="btn-teya-primary"
                  onClick={() => window.location.href = '/trial'}
                >
                  Começar Trial Grátis
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                
                <Button 
                  variant="outline"
                  size="lg"
                  className="btn-teya-ghost"
                  onClick={() => window.location.href = '/demo'}
                >
                  Ver Demo Interativo
                </Button>
              </div>
              
              <p className="text-caption mt-4 text-muted-foreground">
                Sem cartão de crédito • Acesso completo por 7 dias • Cancele quando quiser
              </p>
            </motion.div>
          </div>
        </section>
      </div>
    </MainLayout>
  );
}