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
    primary: "bg-chartreuse-dark dark:bg-chartreuse hover:bg-chartreuse-dark/90 dark:hover:bg-chartreuse/90 text-deep-black dark:text-rich-black hover:shadow-xl",
    secondary: "bg-gray-800 hover:bg-gray-900 text-white"
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