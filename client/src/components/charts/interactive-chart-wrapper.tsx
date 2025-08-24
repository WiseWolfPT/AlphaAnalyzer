import { useState } from 'react';
import { Maximize2, Download, Info, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface InteractiveChartWrapperProps {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  value?: string | number;
  change?: number;
  changePercent?: number;
  info?: string;
  onExport?: () => void;
}

export function InteractiveChartWrapper({
  id,
  title,
  description,
  children,
  value,
  change,
  changePercent,
  info,
  onExport,
}: InteractiveChartWrapperProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleExport = () => {
    if (onExport) {
      onExport();
    } else {
      // Default export functionality - export chart data as CSV
      const chartElement = document.getElementById(id);
      if (chartElement) {
        // Simple CSV export implementation
        console.log(`Exporting chart: ${title}`);
        // In a real implementation, this would extract data and create a CSV file
      }
    }
  };

  const trend = change && change >= 0 ? 'up' : 'down';
  const isPositive = change && change >= 0;

  return (
    <>
      <div
        className={cn(
          "relative group transition-all duration-300",
          "hover:shadow-lg hover:scale-[1.02]",
          isHovered && "z-10"
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Chart Header with Interactive Controls */}
        <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="flex items-center gap-1">
            {info && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 bg-background/80 backdrop-blur-sm"
                    >
                      <Info className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-[300px]">
                    <p className="text-xs">{info}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 bg-background/80 backdrop-blur-sm"
              onClick={handleExport}
            >
              <Download className="h-3.5 w-3.5" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 bg-background/80 backdrop-blur-sm"
              onClick={() => setIsExpanded(true)}
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Value Display (if provided) */}
        {value && (
          <div className="absolute top-2 left-2 z-20 bg-background/80 backdrop-blur-sm rounded-lg px-2 py-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold">{value}</span>
              {change !== undefined && changePercent !== undefined && (
                <div className={cn(
                  "flex items-center gap-0.5 text-xs",
                  isPositive ? "text-emerald-500" : "text-red-500"
                )}>
                  {isPositive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span>
                    {isPositive ? '+' : ''}{changePercent.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Chart Content */}
        <div id={id} className="relative">
          {children}
        </div>

        {/* Hover Effect Overlay */}
        <div className={cn(
          "absolute inset-0 pointer-events-none rounded-lg",
          "bg-gradient-to-t from-primary/5 to-transparent",
          "opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        )} />
      </div>

      {/* Expanded Dialog */}
      <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div>
                <span className="text-xl font-bold">{title}</span>
                {description && (
                  <p className="text-sm text-muted-foreground mt-1">{description}</p>
                )}
              </div>
              {value && (
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold">{value}</span>
                  {change !== undefined && changePercent !== undefined && (
                    <div className={cn(
                      "flex items-center gap-1",
                      isPositive ? "text-emerald-500" : "text-red-500"
                    )}>
                      {isPositive ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                      <span className="font-medium">
                        {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
                      </span>
                    </div>
                  )}
                </div>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <div className="mt-4 h-[60vh]">
            {children}
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsExpanded(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}