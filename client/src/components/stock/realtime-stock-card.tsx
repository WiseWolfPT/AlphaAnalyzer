import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRealtimeQuote } from '@/hooks/use-realtime-quotes';
import { ArrowUpIcon, ArrowDownIcon, TrendingUp, Activity, Loader2 } from 'lucide-react';
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
  const { quote, isConnected, error } = useRealtimeQuote(symbol);

  const handleCardClick = () => {
    setLocation(`/stock/${symbol}/charts`);
  };

  const isPositive = quote ? quote.change >= 0 : false;
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
              {isConnected && (
                <span className="inline-flex h-2 w-2 rounded-full bg-green-500 animate-pulse" 
                      title="Dados em tempo real" />
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
        ) : !quote ? (
          <div className="flex items-center justify-center h-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
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
                  <span>{Math.abs(quote.change).toFixed(2)}</span>
                  <span>({Math.abs(quote.change_percent).toFixed(2)}%)</span>
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Volume</p>
                <p className="text-sm font-medium">
                  {(quote.volume / 1000000).toFixed(2)}M
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
        )}
      </CardContent>
    </Card>
  );
}