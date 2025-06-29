import { useState } from "react";
import { useLocation } from "wouter";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CheckCircle, 
  TrendingUp, 
  BarChart3, 
  Shield, 
  Clock, 
  ArrowRight,
  Star
} from "lucide-react";
import { motion } from "framer-motion";

export default function Trial() {
  const [, setLocation] = useLocation();
  const [isStartingTrial, setIsStartingTrial] = useState(false);

  const handleStartTrial = () => {
    setIsStartingTrial(true);
    setTimeout(() => {
      setLocation("/dashboard");
    }, 1000);
  };

  const trialFeatures = [
    {
      icon: TrendingUp,
      title: "Análise de Ações em Tempo Real",
      description: "Dados de mercado atualizados ao segundo para as principais ações"
    },
    {
      icon: BarChart3,
      title: "Gráficos Avançados",
      description: "Ferramentas de análise técnica profissional com indicadores"
    },
    {
      icon: Shield,
      title: "Valor Intrínseco",
      description: "Cálculos de valor justo baseados em fundamentos da empresa"
    },
    {
      icon: Clock,
      title: "Alertas Personalizados",
      description: "Notificações inteligentes sobre movimentos importantes"
    }
  ];

  const benefits = [
    "14 dias grátis, sem compromisso",
    "Acesso completo a todas as funcionalidades",
    "Suporte por email prioritário",
    "Cancele a qualquer momento"
  ];

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <Badge className="mb-4 bg-green-100 text-green-800 border-green-200">
            <Star className="h-4 w-4 mr-2" />
            Período de Teste Gratuito
          </Badge>
          
          <h1 className="text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Teste o Alfalyzer
            <span className="text-primary"> Gratuitamente</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Experimente todas as funcionalidades premium durante 14 dias. 
            Descubra como a análise profissional pode transformar seus investimentos.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          {/* Trial Features */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h2 className="text-2xl font-bold mb-6">O que está incluído no teste:</h2>
            <div className="space-y-4">
              {trialFeatures.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.3 + index * 0.1 }}
                    className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg"
                  >
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Trial Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card className="h-fit sticky top-8">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Começar Teste Gratuito</CardTitle>
                <div className="text-4xl font-bold text-primary">14 dias</div>
                <p className="text-muted-foreground">Depois apenas €29/mês</p>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  {benefits.map((benefit, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-sm">{benefit}</span>
                    </div>
                  ))}
                </div>

                <Button 
                  size="lg" 
                  className="w-full"
                  onClick={handleStartTrial}
                  disabled={isStartingTrial}
                >
                  {isStartingTrial ? (
                    "Iniciando teste..."
                  ) : (
                    <>
                      Começar Teste Agora
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>

                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    Sem cartão de crédito necessário. Cancele a qualquer momento durante o período de teste.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="text-center"
        >
          <h2 className="text-2xl font-bold mb-6">Perguntas Frequentes</h2>
          <div className="grid md:grid-cols-2 gap-6 text-left">
            <div>
              <h3 className="font-semibold mb-2">Como funciona o período de teste?</h3>
              <p className="text-sm text-muted-foreground">
                Acesso completo durante 14 dias. Após o período, pode escolher um plano ou cancelar sem custos.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Preciso de cartão de crédito?</h3>
              <p className="text-sm text-muted-foreground">
                Não. O teste é completamente gratuito, sem necessidade de dados de pagamento.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Posso cancelar a qualquer momento?</h3>
              <p className="text-sm text-muted-foreground">
                Sim, pode cancelar durante o teste ou após a subscrição sem penalizações.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Que suporte recebo?</h3>
              <p className="text-sm text-muted-foreground">
                Suporte por email prioritário durante todo o período de teste.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </MainLayout>
  );
}