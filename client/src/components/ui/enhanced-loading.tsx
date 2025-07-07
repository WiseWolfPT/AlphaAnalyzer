import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "default" | "chartreuse" | "dots" | "pulse";
  className?: string;
  text?: string;
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
  xl: "h-12 w-12"
};

export function LoadingSpinner({ 
  size = "md", 
  variant = "default", 
  className,
  text 
}: LoadingSpinnerProps) {
  if (variant === "dots") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="loading-dots">
          <span />
          <span />
          <span />
        </div>
        {text && <span className="text-sm text-muted-foreground">{text}</span>}
      </div>
    );
  }

  if (variant === "pulse") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className={cn(
          "rounded-full loading-pulse",
          variant === "chartreuse" ? "bg-chartreuse" : "bg-primary",
          sizeClasses[size]
        )} />
        {text && <span className="text-sm text-muted-foreground">{text}</span>}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Loader2 className={cn(
        "animate-spin",
        variant === "chartreuse" ? "text-chartreuse" : "text-primary",
        sizeClasses[size]
      )} />
      {text && <span className="text-sm text-muted-foreground">{text}</span>}
    </div>
  );
}

interface LoadingOverlayProps {
  isLoading: boolean;
  children: React.ReactNode;
  text?: string;
  className?: string;
}

export function LoadingOverlay({ 
  isLoading, 
  children, 
  text = "Loading...",
  className 
}: LoadingOverlayProps) {
  return (
    <div className={cn("relative", className)}>
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg">
          <div className="flex flex-col items-center gap-3">
            <LoadingSpinner variant="chartreuse" size="lg" />
            <p className="text-sm text-muted-foreground font-medium">{text}</p>
          </div>
        </div>
      )}
    </div>
  );
}

interface ProgressBarProps {
  progress: number;
  className?: string;
  variant?: "default" | "chartreuse";
  showText?: boolean;
}

export function ProgressBar({ 
  progress, 
  className, 
  variant = "default",
  showText = false 
}: ProgressBarProps) {
  const clampedProgress = Math.max(0, Math.min(100, progress));
  
  return (
    <div className={cn("space-y-2", className)}>
      {showText && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">{Math.round(clampedProgress)}%</span>
        </div>
      )}
      <div className="progress-bar">
        <div 
          className={cn(
            "progress-fill",
            variant === "chartreuse" 
              ? "bg-chartreuse" 
              : "bg-primary"
          )}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
}

interface LoadingCardProps {
  title?: string;
  description?: string;
  className?: string;
}

export function LoadingCard({ 
  title = "Loading", 
  description = "Please wait while we fetch your data",
  className 
}: LoadingCardProps) {
  return (
    <div className={cn(
      "border rounded-lg p-6 bg-card",
      "flex flex-col items-center justify-center text-center",
      "min-h-[200px] space-y-4",
      className
    )}>
      <LoadingSpinner variant="chartreuse" size="lg" />
      <div className="space-y-2">
        <h3 className="font-semibold text-lg">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-[250px]">
          {description}
        </p>
      </div>
    </div>
  );
}

// Success state animation
interface SuccessCheckProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function SuccessCheck({ className, size = "md" }: SuccessCheckProps) {
  const sizeClass = {
    sm: "h-4 w-4",
    md: "h-6 w-6", 
    lg: "h-8 w-8"
  };

  return (
    <div className={cn(
      "rounded-full bg-green-500 flex items-center justify-center success-bounce",
      sizeClass[size],
      className
    )}>
      <svg
        className="h-1/2 w-1/2 text-white"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={3}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5 13l4 4L19 7"
        />
      </svg>
    </div>
  );
}

// Error state
interface ErrorStateProps {
  message?: string;
  retry?: () => void;
  className?: string;
}

export function ErrorState({ 
  message = "Something went wrong", 
  retry,
  className 
}: ErrorStateProps) {
  return (
    <div className={cn(
      "border border-red-200 rounded-lg p-6 bg-red-50 dark:bg-red-900/10 dark:border-red-800",
      "flex flex-col items-center justify-center text-center",
      "min-h-[200px] space-y-4",
      className
    )}>
      <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
        <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <div className="space-y-2">
        <h3 className="font-semibold text-lg text-red-800 dark:text-red-200">Error</h3>
        <p className="text-sm text-red-600 dark:text-red-300 max-w-[250px]">
          {message}
        </p>
      </div>
      {retry && (
        <button
          onClick={retry}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors btn-bounce"
        >
          Try Again
        </button>
      )}
    </div>
  );
}