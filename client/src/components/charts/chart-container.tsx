// Base chart container component with consistent styling
import { ReactNode } from "react";
import { TrendingUp } from "lucide-react";

interface ChartContainerProps {
  title: string;
  children: ReactNode;
  height?: string;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  value?: string;
  change?: string;
}

export function ChartContainer({ 
  title, 
  children, 
  height = "h-64", 
  subtitle,
  trend,
  value,
  change
}: ChartContainerProps) {
  const getTrendColor = () => {
    switch (trend) {
      case 'up': return 'text-emerald-500';
      case 'down': return 'text-red-500';
      default: return 'text-muted-foreground';
    }
  };

  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp className="h-3 w-3" />;
    if (trend === 'down') return <TrendingUp className="h-3 w-3 rotate-180" />;
    return null;
  };

  return (
    <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-4 hover:bg-card/70 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-medium text-sm text-foreground">{title}</h3>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        
        {(value || change) && (
          <div className="text-right">
            {value && (
              <div className="text-sm font-semibold text-foreground">{value}</div>
            )}
            {change && (
              <div className={`flex items-center gap-1 text-xs ${getTrendColor()}`}>
                {getTrendIcon()}
                {change}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chart Content */}
      <div className={`${height} w-full`}>
        {children}
      </div>
    </div>
  );
}