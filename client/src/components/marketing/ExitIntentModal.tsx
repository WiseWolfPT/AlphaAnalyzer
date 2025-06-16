import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, TrendingUp, Users, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ExitIntentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExitIntentModal({ isOpen, onClose }: ExitIntentModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", duration: 0.5 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl"
        >
          <Card className="border-orange-500/50 shadow-2xl bg-gradient-to-br from-orange-500/5 to-orange-600/5">
            <CardHeader className="relative text-center pb-4">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
              
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white text-2xl">
                🚗
              </div>
              
              <CardTitle className="text-2xl font-bold text-foreground">
                Espera! Antes de saíres...
              </CardTitle>
              <p className="text-muted-foreground">
                Vê como o João evitou uma perda de 3.400€ com a Tesla
              </p>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Tesla Case Study */}
              <div className="bg-gradient-to-r from-red-500/10 to-red-600/10 border border-red-500/20 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center text-white font-bold">
                    TSLA
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Tesla Inc.</h3>
                    <p className="text-sm text-muted-foreground">Caso real • Dezembro 2023</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Preço de Mercado</div>
                    <div className="text-2xl font-bold text-foreground">$267</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Valor Intrínseco</div>
                    <div className="text-2xl font-bold text-orange-500">$198</div>
                  </div>
                </div>

                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-red-500" />
                    <span className="font-semibold text-red-500">ALERTA: Sobrevalorizada 35%</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    O Alpha Analyzer recomendou venda/short da Tesla a $267
                  </p>
                </div>

                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-emerald-500" />
                    <span className="font-semibold text-emerald-500">RESULTADO: +34% de retorno</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    3 meses depois: Tesla caiu para $178. João evitou -33% de perda.
                  </p>
                </div>
              </div>

              {/* Founder 100 Offer */}
              <div className="bg-gradient-to-r from-orange-500/10 to-orange-600/10 border border-orange-500/30 rounded-xl p-6">
                <div className="text-center mb-4">
                  <h3 className="text-xl font-bold text-foreground mb-2">
                    🔥 Última Oportunidade Founder 100
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Apenas para os primeiros 100 membros
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Founder 100</div>
                    <div className="text-3xl font-bold text-orange-500">9€</div>
                    <div className="text-xs text-muted-foreground">/mês vitalício</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Pós-Launch</div>
                    <div className="text-3xl font-bold text-foreground line-through opacity-50">29€</div>
                    <div className="text-xs text-muted-foreground">Preço normal</div>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 mb-6 text-orange-600">
                  <Clock className="h-4 w-4" />
                  <span className="font-semibold text-sm">23 lugares restantes</span>
                </div>

                <div className="space-y-3">
                  <Button 
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-3 text-lg"
                    onClick={() => {
                      window.location.href = '/trial';
                      onClose();
                    }}
                  >
                    🚀 Garantir Founder 100 - Trial Grátis
                  </Button>
                  
                  <Button 
                    variant="ghost"
                    className="w-full text-muted-foreground hover:text-foreground"
                    onClick={onClose}
                  >
                    Não, prefiro pagar 29€/mês depois
                  </Button>
                </div>

                <p className="text-xs text-center text-muted-foreground mt-4">
                  ✅ Trial grátis 7 dias • ✅ Preço bloqueado para sempre • ✅ Sem compromissos
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Hook para detectar exit intent
export function useExitIntent() {
  const [showExitIntent, setShowExitIntent] = useState(false);
  const [hasShown, setHasShown] = useState(false);

  useEffect(() => {
    const handleMouseLeave = (e: MouseEvent) => {
      // Detecta quando o mouse sai do topo da janela
      if (e.clientY <= 0 && !hasShown) {
        setShowExitIntent(true);
        setHasShown(true);
      }
    };

    const handleBeforeUnload = () => {
      if (!hasShown) {
        setShowExitIntent(true);
        setHasShown(true);
      }
    };

    // Timeout fallback - mostrar após 45 segundos se não houve exit intent
    const timeoutId = setTimeout(() => {
      if (!hasShown) {
        setShowExitIntent(true);
        setHasShown(true);
      }
    }, 45000);

    document.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      clearTimeout(timeoutId);
    };
  }, [hasShown]);

  const closeExitIntent = () => {
    setShowExitIntent(false);
  };

  return { showExitIntent, closeExitIntent };
}