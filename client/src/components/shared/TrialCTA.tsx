import { Button } from "@/components/ui/button";
import { Target } from "lucide-react";

interface TrialCTAProps {
  variant?: "primary" | "secondary";
  size?: "sm" | "default" | "lg";
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
    primary: "bg-gradient-to-r from-chartreuse via-chartreuse-dark to-chartreuse hover:from-chartreuse-dark hover:via-chartreuse hover:to-chartreuse-dark text-rich-black shadow-lg shadow-chartreuse/30 hover:shadow-chartreuse/50 hover:scale-105 border-0",
    secondary: "bg-gray-800 hover:bg-gray-900 text-white"
  };

  const sizes = {
    sm: "px-4 py-2 h-9 text-sm",
    default: "px-6 py-3 h-12 text-base", 
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