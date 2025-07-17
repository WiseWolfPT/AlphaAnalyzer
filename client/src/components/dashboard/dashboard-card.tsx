import { memo, ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface DashboardCardProps {
  /** Card title displayed in header */
  title: string;
  /** Optional icon component to display next to title */
  icon?: React.ComponentType<{ className?: string }>;
  /** Optional action button in header */
  action?: {
    label: string;
    onClick: () => void;
    variant?: "default" | "ghost" | "outline";
  };
  /** Visual variant of the card */
  variant?: "default" | "gradient" | "compact" | "metric";
  /** Custom gradient colors (only applies to gradient variant) */
  gradientColors?: string;
  /** Loading state */
  isLoading?: boolean;
  /** Error state */
  error?: string;
  /** Additional CSS classes */
  className?: string;
  /** Optional footer content */
  footer?: ReactNode;
  /** Card content */
  children: ReactNode;
  /** Click handler for entire card */
  onClick?: () => void;
  /** Disable hover effects */
  disableHover?: boolean;
}

const gradientPresets = {
  purple: "bg-gradient-to-br from-purple-50/50 to-indigo-50/50 dark:from-purple-950/20 dark:to-indigo-950/20 border-purple-200/50 dark:border-purple-800/50",
  blue: "bg-gradient-to-br from-teya-green/10 to-teya-green/5 dark:from-teya-green/20 dark:to-teya-green/10 border-teya-green/20 dark:border-teya-green/50",
  green: "bg-gradient-to-br from-emerald-50/50 to-green-50/50 dark:from-emerald-950/20 dark:to-green-950/20 border-emerald-200/50 dark:border-emerald-800/50",
  amber: "bg-gradient-to-br from-amber-50/50 to-yellow-50/50 dark:from-amber-950/20 dark:to-yellow-950/20 border-amber-200/50 dark:border-amber-800/50",
  slate: "bg-gradient-to-br from-slate-50/50 to-gray-50/50 dark:from-slate-950/20 dark:to-gray-950/20 border-slate-200/50 dark:border-slate-800/50",
  rose: "bg-gradient-to-br from-rose-50/50 to-pink-50/50 dark:from-rose-950/20 dark:to-pink-950/20 border-rose-200/50 dark:border-rose-800/50"
};

const LoadingSkeleton = memo(function LoadingSkeleton({ variant }: { variant?: string }) {
  return (
    <Card className="h-full">
      <CardHeader className={cn("pb-3", variant === "compact" && "pb-2")}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="w-5 h-5 rounded" />
            <Skeleton className="h-5 w-32" />
          </div>
          <Skeleton className="h-8 w-16" />
        </div>
      </CardHeader>
      <CardContent className={cn("space-y-4", variant === "compact" && "space-y-2")}>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        {variant !== "compact" && (
          <>
            <Skeleton className="h-4 w-1/2" />
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
});

const ErrorFallback = memo(function ErrorFallback({ 
  error, 
  onRetry 
}: { 
  error: string; 
  onRetry?: () => void; 
}) {
  return (
    <Card className="h-full border-red-200/50 dark:border-red-800/50">
      <CardContent className="flex flex-col items-center justify-center p-6 text-center">
        <div className="text-red-500 mb-2">⚠️</div>
        <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>
        {onRetry && (
          <Button 
            size="sm" 
            variant="outline" 
            onClick={onRetry}
            className="border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950"
          >
            Try Again
          </Button>
        )}
      </CardContent>
    </Card>
  );
});

export const DashboardCard = memo(function DashboardCard({
  title,
  icon: Icon,
  action,
  variant = "default",
  gradientColors,
  isLoading = false,
  error,
  className,
  footer,
  children,
  onClick,
  disableHover = false
}: DashboardCardProps) {
  // Handle loading state
  if (isLoading) {
    return <LoadingSkeleton variant={variant} />;
  }

  // Handle error state
  if (error) {
    return <ErrorFallback error={error} onRetry={onClick} />;
  }

  // Determine card styling based on variant
  const getCardClassName = () => {
    const baseClass = "h-full transition-all duration-300";
    
    // Add hover effects unless disabled
    const hoverClass = !disableHover && onClick 
      ? "cursor-pointer hover:shadow-lg hover:-translate-y-0.5"
      : "";

    // Apply variant-specific styling
    switch (variant) {
      case "gradient":
        const gradientClass = gradientColors || gradientPresets.purple;
        return cn(baseClass, hoverClass, gradientClass, className);
      
      case "compact":
        return cn(baseClass, hoverClass, "border-muted/50", className);
      
      case "metric":
        return cn(
          baseClass, 
          hoverClass,
          "bg-gradient-to-r from-card to-card/80 border-muted/30",
          className
        );
      
      default:
        return cn(baseClass, hoverClass, className);
    }
  };

  // Determine content padding based on variant
  const getContentPadding = () => {
    switch (variant) {
      case "compact":
        return "p-4";
      case "metric":
        return "p-5";
      default:
        return "p-6";
    }
  };

  return (
    <Card 
      className={getCardClassName()}
      onClick={onClick}
    >
      {/* Header with title, icon, and action */}
      <CardHeader className={cn(
        variant === "compact" ? "pb-2" : "pb-3",
        variant === "metric" ? "pb-2" : ""
      )}>
        <div className="flex items-center justify-between">
          <CardTitle className={cn(
            "flex items-center gap-2",
            variant === "compact" ? "text-base" : "text-lg",
            variant === "metric" ? "text-base" : ""
          )}>
            {Icon && (
              <Icon className={cn(
                variant === "compact" ? "w-4 h-4" : "w-5 h-5"
              )} />
            )}
            {title}
          </CardTitle>
          
          {action && (
            <Button
              variant={action.variant || "ghost"}
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                action.onClick();
              }}
              className="flex items-center gap-1 text-xs"
            >
              {action.label}
              <ArrowRight className="w-3 h-3" />
            </Button>
          )}
        </div>
      </CardHeader>

      {/* Main content */}
      <CardContent className={getContentPadding()}>
        {children}
      </CardContent>

      {/* Optional footer */}
      {footer && (
        <CardFooter className={cn(
          variant === "compact" ? "pt-2" : "pt-4"
        )}>
          {footer}
        </CardFooter>
      )}
    </Card>
  );
});

// Convenience components for common metric cards
export const MetricCard = memo(function MetricCard({
  label,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  ...props
}: {
  label: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon?: React.ComponentType<{ className?: string }>;
} & Omit<DashboardCardProps, "children" | "variant">) {
  const changeColor = {
    positive: "text-emerald-600 dark:text-emerald-400",
    negative: "text-red-600 dark:text-red-400",
    neutral: "text-muted-foreground"
  }[changeType];

  return (
    <DashboardCard variant="metric" icon={Icon} {...props}>
      <div className="space-y-2">
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-sm text-muted-foreground">{label}</div>
        {change && (
          <div className={cn("text-xs font-medium", changeColor)}>
            {change}
          </div>
        )}
      </div>
    </DashboardCard>
  );
});

// Export gradient presets for external use
export { gradientPresets };