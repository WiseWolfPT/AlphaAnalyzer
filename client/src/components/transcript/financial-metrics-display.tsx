import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, DollarSign, BarChart3, PieChart, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FinancialMetric {
  label: string;
  value: string | number;
  change?: number;
  changeType?: 'percent' | 'absolute' | 'basis_points';
  comparison?: string;
  icon?: React.ReactNode;
  category?: 'revenue' | 'earnings' | 'margins' | 'cash_flow' | 'guidance' | 'operational';
}

interface FinancialMetricsDisplayProps {
  ticker: string;
  quarter: string;
  year: number;
  metrics: FinancialMetric[];
  rawMetrics?: any; // Full metrics object from AI
}

export function FinancialMetricsDisplay({
  ticker,
  quarter,
  year,
  metrics,
  rawMetrics
}: FinancialMetricsDisplayProps) {

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case 'revenue':
        return <DollarSign className="h-4 w-4" />;
      case 'earnings':
        return <BarChart3 className="h-4 w-4" />;
      case 'margins':
        return <PieChart className="h-4 w-4" />;
      case 'cash_flow':
        return <Activity className="h-4 w-4" />;
      default:
        return <BarChart3 className="h-4 w-4" />;
    }
  };

  const getTrendIcon = (change?: number) => {
    if (!change) return <Minus className="h-4 w-4 text-muted-foreground" />;
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    return <TrendingDown className="h-4 w-4 text-red-500" />;
  };

  const formatChange = (change: number, type?: string) => {
    const isPositive = change > 0;
    const color = isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';

    let formatted = '';
    switch (type) {
      case 'basis_points':
        formatted = `${isPositive ? '+' : ''}${change}bps`;
        break;
      case 'absolute':
        formatted = `${isPositive ? '+' : ''}${change}`;
        break;
      default:
        formatted = `${isPositive ? '+' : ''}${change}%`;
    }

    return <span className={cn('font-medium', color)}>{formatted}</span>;
  };

  // Group metrics by category
  const groupedMetrics = metrics.reduce((acc, metric) => {
    const category = metric.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(metric);
    return acc;
  }, {} as Record<string, FinancialMetric[]>);

  const categoryTitles: Record<string, string> = {
    revenue: 'Revenue Metrics',
    earnings: 'Earnings & Profitability',
    margins: 'Margin Analysis',
    cash_flow: 'Cash Flow & Balance Sheet',
    guidance: 'Guidance & Outlook',
    operational: 'Operational KPIs',
    other: 'Additional Metrics'
  };

  const categoryColors: Record<string, string> = {
    revenue: 'from-green-500/10 to-green-500/20',
    earnings: 'from-blue-500/10 to-blue-500/20',
    margins: 'from-purple-500/10 to-purple-500/20',
    cash_flow: 'from-amber-500/10 to-amber-500/20',
    guidance: 'from-indigo-500/10 to-indigo-500/20',
    operational: 'from-pink-500/10 to-pink-500/20',
    other: 'from-gray-500/10 to-gray-500/20'
  };

  return (
    <div className="space-y-6">
      {/* Header with context */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <span>{ticker}</span>
            <Badge variant="outline">{quarter} {year}</Badge>
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Comprehensive financial metrics from earnings call
          </p>
        </div>
      </div>

      {/* Metrics by category */}
      {Object.entries(groupedMetrics).map(([category, categoryMetrics]) => (
        <Card key={category} className="overflow-hidden">
          <CardHeader className={cn(
            "bg-gradient-to-r",
            categoryColors[category] || categoryColors.other
          )}>
            <CardTitle className="flex items-center gap-2">
              {getCategoryIcon(category)}
              <span>{categoryTitles[category] || 'Metrics'}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryMetrics.map((metric, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-lg bg-card hover:bg-card/80 transition-colors border border-border/50"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-sm text-muted-foreground">
                      {metric.label}
                    </span>
                    {metric.icon || getTrendIcon(metric.change)}
                  </div>
                  <div className="space-y-1">
                    <div className="text-2xl font-bold">
                      {metric.value}
                    </div>
                    {metric.change !== undefined && (
                      <div className="text-sm">
                        {formatChange(metric.change, metric.changeType)}
                        {metric.comparison && (
                          <span className="text-muted-foreground ml-2">
                            {metric.comparison}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Raw metrics display (optional, for debugging) */}
      {rawMetrics && process.env.NODE_ENV === 'development' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Raw Metrics (Dev Only)</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs overflow-auto p-4 bg-muted rounded">
              {JSON.stringify(rawMetrics, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}