import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useStockQuote } from '@/hooks/use-market-data';
import { ArrowUpIcon, ArrowDownIcon, TrendingUp, Activity, Loader2, Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocation } from 'wouter';

interface RealtimeStockCardProps {
  symbol: string;
  companyName?: string;
  industry?: string;
  sector?: string;
  onRemove?: () => void;
  className?: string;
}

export function RealtimeStockCard({ 
  symbol, 
  companyName,
  industry,
  sector,
  onRemove,
  className 
}: RealtimeStockCardProps) {
  const [, setLocation] = useLocation();
  // Use the same hook that works in UnifiedStockCard
  const { data: quote, isLoading, error, isRealtime } = useStockQuote(symbol);

  const handleCardClick = () => {
    setLocation(`/stock/${symbol}/charts`);
  };

  const isPositive = quote ? (quote.change ?? 0) >= 0 : false;
  const changeColor = isPositive ? 'text-green-600' : 'text-red-600';
  const bgColor = isPositive ? 'bg-green-50' : 'bg-red-50';

  return (
    <Card 
      className={cn(
        "relative overflow-hidden cursor-pointer transition-all hover:shadow-lg group",
        className
      )}
      onClick={handleCardClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">{symbol}</h3>
              {isRealtime && (
                <Wifi className="w-3 h-3 text-green-500" title="Dados em tempo real" />
              )}
            </div>
            {companyName && (
              <p className="text-sm text-muted-foreground line-clamp-1">{companyName}</p>
            )}
          </div>
          <Badge variant="secondary" className="text-xs">
            {sector || 'Technology'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {error ? (
          <div className="text-sm text-red-600">Erro ao carregar dados</div>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : quote ? (
          <>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold">${quote.price.toFixed(2)}</p>
                <div className={cn("flex items-center gap-1 text-sm", changeColor)}>
                  {isPositive ? (
                    <ArrowUpIcon className="h-4 w-4" />
                  ) : (
                    <ArrowDownIcon className="h-4 w-4" />
                  )}
                  <span>{Math.abs(quote.change ?? 0).toFixed(2)}</span>
                  <span>({Math.abs(quote.changePercent ?? 0).toFixed(2)}%)</span>
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Volume</p>
                <p className="text-sm font-medium">
                  {quote.volume ? (quote.volume / 1000000).toFixed(2) + 'M' : 'N/A'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {industry || 'Technology'}
                </span>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove?.();
                }}
              >
                Remover
              </Button>
            </div>

            {/* Visual indicator for real-time updates */}
            <div className={cn(
              "absolute inset-0 opacity-0 pointer-events-none transition-opacity",
              "bg-gradient-to-r",
              isPositive ? "from-green-500/10" : "from-red-500/10"
            )} />
          </>
        ) : (
          <div className="text-sm text-muted-foreground text-center">
            Sem dados disponíveis
          </div>
        )}
      </CardContent>
    </Card>
  );
}