import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, Star, Crown, Zap, Timer } from "lucide-react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";

interface PricingProps {
  id?: string;
}

export function Pricing({ id }: PricingProps = {}) {
  const founderLeft = 23; // Dynamic counter - will be updated later
  const [, setLocation] = useLocation();

  const coreFeatures = [
    "Análise Tesla, Apple, Microsoft",
    "Gráficos em tempo real",
    "Valor intrínseco automático",
    "Alertas de oportunidades",
    "Watchlists personalizadas",
    "Suporte email"
  ];

  const founderFeatures = [
    "✅ Tudo do Core",
    "🎯 Acesso vitalício €9/mês",
    "🔥 Lives semanais de análise",
    "💬 Discord VIP exclusivo",
    "📚 Curso completo Whop",
    "🚀 Primeiros 100 membros only"
  ];

  return (
    <section id={id || "pricing"} className="py-16 lg:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Junta-te à Comunidade Financeira
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Não é só software - é uma comunidade de investidores inteligentes
          </p>
        </motion.div>

        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Founder 100 Plan */}
            {founderLeft > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="relative border-2 border-orange-500/50 shadow-xl bg-gradient-to-br from-orange-500/5 to-orange-600/5">
                  {/* Founder Badge */}
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-2 text-sm font-semibold">
                      <Crown className="h-4 w-4 mr-1" />
                      Founder 100
                    </Badge>
                  </div>

                  <CardHeader className="text-center pt-8">
                    <CardTitle className="text-2xl font-bold text-foreground">
                      Founder 100
                    </CardTitle>
                    <div className="mt-4">
                      <span className="text-4xl font-bold text-foreground">9 €</span>
                      <span className="text-muted-foreground ml-2">/mês vitalício</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Preço pós-launch: 29 €/mês
                    </div>
                    
                    {/* Contador */}
                    <div className="mt-4 p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
                      <div className="flex items-center justify-center gap-2 text-orange-600">
                        <Timer className="h-4 w-4" />
                        <span className="font-semibold">
                          Apenas {founderLeft} lugares restantes
                        </span>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    <ul className="space-y-3">
                      {founderFeatures.map((feature, index) => (
                        <li key={index} className="flex items-center gap-3">
                          <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Button 
                      className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-3"
                      onClick={() => setLocation('/register')}
                    >
                      🔥 Garantir Founder 100 - Trial Grátis
                    </Button>

                    <p className="text-xs text-center text-muted-foreground">
                      Preço bloqueado para sempre. Sem aumentos futuros.
                    </p>
                    <p className="text-xs text-center text-muted-foreground mt-2 border-t pt-2">
                      ⚠️ Investir envolve riscos. Performances passadas não garantem resultados futuros.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Core Plan */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <Card className="border-border/50 shadow-lg bg-gradient-to-br from-emerald-500/5 to-emerald-600/5">
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl font-bold text-foreground">
                    Pós-Launch
                  </CardTitle>
                  <div className="text-sm text-muted-foreground mb-4">
                    Após os primeiros 100 membros
                  </div>
                  
                  {/* Simplified Pricing */}
                  <div className="mt-6">
                    <div className="text-center">
                      <div className="line-through text-muted-foreground text-lg">39 €/mês</div>
                      <span className="text-4xl font-bold text-foreground">29 €</span>
                      <span className="text-muted-foreground ml-2">/mês</span>
                      <div className="text-sm text-emerald-500 font-medium mt-1">
                        Preço de lançamento limitado
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    {coreFeatures.map((feature, index) => (
                      <li key={index} className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button 
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3"
                    onClick={() => setLocation('/register')}
                  >
                    📋 Lista de Espera - Trial Grátis
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    Entrar na lista de espera para quando abrir.
                  </p>
                  <p className="text-xs text-center text-muted-foreground mt-2 border-t pt-2">
                    ⚠️ Investir envolve riscos. Performances passadas não garantem resultados futuros.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}