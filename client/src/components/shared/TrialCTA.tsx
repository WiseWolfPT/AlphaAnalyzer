import { Button } from "@/components/ui/button";
import { Target } from "lucide-react";

interface TrialCTAProps {
  variant?: "primary" | "secondary";
  size?: "sm" | "md" | "lg";
  className?: string;
  children?: React.ReactNode;
}

export function TrialCTA({ 
  variant = "primary", 
  size = "lg", 
  className = "",
  children 
}: TrialCTAProps) {
  const baseClasses = "font-semibold transition-all duration-200";
  
  const variants = {
    primary: "bg-tangerine hover:bg-orange-400 text-white hover:shadow-xl",
    secondary: "bg-emerald-600 hover:bg-emerald-700 text-white"
  };

  const sizes = {
    sm: "px-4 py-2 h-9 text-sm",
    md: "px-6 py-3 h-12 text-base", 
    lg: "px-8 py-4 h-16 text-lg"
  };

  return (
    <Button 
      size={size}
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
      onClick={() => window.location.href = '/trial'}
      aria-label="Começar trial gratuito de 7 dias"
    >
      <Target className="h-5 w-5 mr-3" />
      {children || "Começar Trial Grátis"}
    </Button>
  );
}