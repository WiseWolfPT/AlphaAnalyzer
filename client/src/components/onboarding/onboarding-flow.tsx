import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  ArrowRight, 
  ArrowLeft, 
  X, 
  Play,
  CheckCircle,
  Star,
  Target,
  Heart,
  BarChart3,
  Calculator,
  Bell,
  Lightbulb,
  Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  highlight?: string; // CSS selector for element to highlight
  position?: 'center' | 'left' | 'right' | 'top' | 'bottom';
}

const onboardingSteps: OnboardingStep[] = [
  {
    id: "welcome",
    title: "Welcome to Alfalyzer! 🎉",
    description: "Your comprehensive financial analysis platform. Let's take a quick tour to get you started with smart investing.",
    icon: Sparkles,
    position: "center"
  },
  {
    id: "dashboard",
    title: "Your Investment Dashboard",
    description: "This is your command center. Monitor your portfolio, track market trends, and discover new investment opportunities.",
    icon: BarChart3,
    action: {
      label: "Go to Dashboard",
      href: "/dashboard"
    },
    highlight: "[data-tour='dashboard']",
    position: "center"
  },
  {
    id: "watchlists",
    title: "Create Your First Watchlist",
    description: "Keep track of stocks you're interested in. Add companies you want to monitor and get real-time updates.",
    icon: Heart,
    action: {
      label: "Create Watchlist",
      href: "/watchlists"
    },
    highlight: "[data-tour='watchlists']",
    position: "right"
  },
  {
    id: "stock-analysis",
    title: "Analyze Any Stock",
    description: "Click on any stock to see detailed analysis, charts, and our proprietary intrinsic value calculations.",
    icon: Target,
    action: {
      label: "View Example",
      href: "/stock/AAPL"
    },
    highlight: "[data-tour='stock-cards']",
    position: "center"
  },
  {
    id: "intrinsic-value",
    title: "Discover Intrinsic Value",
    description: "Our AI calculates fair value for any stock using multiple methods. Never overpay for a stock again!",
    icon: Calculator,
    action: {
      label: "Try Calculator",
      href: "/intrinsic-value"
    },
    highlight: "[data-tour='intrinsic-value']",
    position: "left"
  },
  {
    id: "news",
    title: "Stay Informed",
    description: "Get the latest market news, earnings updates, and analysis. Knowledge is your best investment tool.",
    icon: Bell,
    action: {
      label: "Read News",
      href: "/news"
    },
    highlight: "[data-tour='news']",
    position: "right"
  },
  {
    id: "complete",
    title: "You're All Set! 🚀",
    description: "You now know the basics. Start building your investment portfolio and make smarter financial decisions.",
    icon: CheckCircle,
    action: {
      label: "Start Investing",
      href: "/dashboard"
    },
    position: "center"
  }
];

interface OnboardingFlowProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export function OnboardingFlow({ isOpen, onClose, onComplete }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [, setLocation] = useLocation();

  const currentStepData = onboardingSteps[currentStep];
  const progress = ((currentStep + 1) / onboardingSteps.length) * 100;

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    onComplete?.();
    onClose();
    localStorage.setItem('alfalyzer-onboarding-completed', 'true');
  };

  const handleSkip = () => {
    onClose();
    localStorage.setItem('alfalyzer-onboarding-skipped', 'true');
  };

  const handleAction = () => {
    if (currentStepData.action?.href) {
      setLocation(currentStepData.action.href);
      onClose();
    } else if (currentStepData.action?.onClick) {
      currentStepData.action.onClick();
    }
  };

  // Add spotlight effect for highlighted elements
  useEffect(() => {
    if (currentStepData.highlight && isOpen) {
      const element = document.querySelector(currentStepData.highlight);
      if (element) {
        element.classList.add('onboarding-highlight');
        return () => {
          element.classList.remove('onboarding-highlight');
        };
      }
    }
  }, [currentStep, currentStepData.highlight, isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                Step {currentStep + 1} of {onboardingSteps.length}
              </Badge>
              <DialogTitle className="text-lg">Getting Started</DialogTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={handleSkip}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Progress value={progress} className="h-2" />
        </DialogHeader>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Step Content */}
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <currentStepData.icon className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">{currentStepData.title}</h2>
              <p className="text-muted-foreground text-lg leading-relaxed max-w-md mx-auto">
                {currentStepData.description}
              </p>
            </div>

            {/* Feature Preview */}
            {currentStep === 1 && (
              <Card className="border-2 border-primary/20">
                <CardContent className="p-6">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-green-600">+23.4%</div>
                      <div className="text-sm text-muted-foreground">Portfolio Growth</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-primary">247</div>
                      <div className="text-sm text-muted-foreground">Stocks Tracked</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-orange-600">12</div>
                      <div className="text-sm text-muted-foreground">Active Alerts</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Intrinsic Value Preview */}
            {currentStep === 4 && (
              <Card className="border-2 border-primary/20">
                <CardContent className="p-6">
                  <div className="text-center space-y-3">
                    <div className="flex items-center justify-center gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Current Price</div>
                        <div className="text-xl font-bold">$175.43</div>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">Intrinsic Value</div>
                        <div className="text-xl font-bold text-green-600">$198.50</div>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                      13.1% Undervalued
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Key Features List */}
            {currentStep === 6 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { icon: BarChart3, label: "Real-time Charts" },
                  { icon: Calculator, label: "Value Analysis" },
                  { icon: Bell, label: "Smart Alerts" },
                  { icon: Heart, label: "Watchlists" }
                ].map((feature, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                    <feature.icon className="h-5 w-5 text-primary" />
                    <span className="font-medium">{feature.label}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Action Button */}
            {currentStepData.action && (
              <div className="text-center">
                <Button 
                  onClick={handleAction}
                  className="bg-gradient-to-r from-chartreuse via-chartreuse-dark to-chartreuse hover:from-chartreuse-dark hover:via-chartreuse hover:to-chartreuse-dark text-rich-black font-semibold"
                >
                  <Play className="h-4 w-4 mr-2" />
                  {currentStepData.action.label}
                </Button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-6 border-t">
          <Button
            variant="ghost"
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className={cn(
              "transition-opacity",
              currentStep === 0 ? "opacity-0 pointer-events-none" : "opacity-100"
            )}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          <div className="flex items-center gap-2">
            {onboardingSteps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  index === currentStep ? "bg-primary" : "bg-muted-foreground/30"
                )}
              />
            ))}
          </div>

          <Button onClick={handleNext}>
            {currentStep === onboardingSteps.length - 1 ? (
              <>
                Complete
                <CheckCircle className="h-4 w-4 ml-2" />
              </>
            ) : (
              <>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook to manage onboarding state
export function useOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const hasCompletedOnboarding = localStorage.getItem('alfalyzer-onboarding-completed');
    const hasSkippedOnboarding = localStorage.getItem('alfalyzer-onboarding-skipped');
    
    if (!hasCompletedOnboarding && !hasSkippedOnboarding) {
      // Show onboarding after a short delay
      const timer = setTimeout(() => {
        setShowOnboarding(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  const startOnboarding = () => setShowOnboarding(true);
  const closeOnboarding = () => setShowOnboarding(false);

  return {
    showOnboarding,
    startOnboarding,
    closeOnboarding
  };
}