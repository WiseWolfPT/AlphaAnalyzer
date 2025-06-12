import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Target, X } from "lucide-react";

export function StickyCTA() {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check sessionStorage for dismissed state
    const dismissed = sessionStorage.getItem('stickyCTADismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.target.id === 'pricing' && entry.isIntersecting) {
            setIsVisible(true);
          }
        });
      },
      { threshold: 0.1 }
    );

    const pricingSection = document.getElementById('pricing');
    if (pricingSection) {
      observer.observe(pricingSection);
    }

    return () => {
      if (pricingSection) {
        observer.unobserve(pricingSection);
      }
    };
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    setIsVisible(false);
    sessionStorage.setItem('stickyCTADismissed', 'true');
  };

  return (
    <AnimatePresence>
      {isVisible && !isDismissed && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed bottom-6 left-0 right-0 z-40 flex justify-center px-4"
        >
          <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-2xl p-4 max-w-md w-full">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800 mb-1">
                  Pronto para começar?
                </p>
                <p className="text-xs text-gray-600">
                  7 dias grátis • Sem compromisso
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="bg-green-400 dark:bg-green-500 hover:bg-green-500 dark:hover:bg-green-400 text-white font-semibold text-sm px-4 py-2 h-9"
                  onClick={() => window.location.href = '/trial'}
                  aria-label="Começar trial grátis"
                >
                  <Target className="h-4 w-4 mr-1" />
                  Trial Grátis
                </Button>
                
                <button
                  onClick={handleDismiss}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Fechar banner"
                >
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}