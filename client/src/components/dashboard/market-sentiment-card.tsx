import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Thermometer, TrendingUp, TrendingDown, Activity, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface MarketSentiment {
  fearGreedIndex: number;
  fearGreedLabel: string;
  vixLevel: number;
  vixChange: number;
  marketTrend: 'bullish' | 'bearish' | 'neutral';
  rsiLevel: number;
  putCallRatio: number;
  sentiment: 'extreme_fear' | 'fear' | 'neutral' | 'greed' | 'extreme_greed';
}

export function MarketSentimentCard() {
  const [, setLocation] = useLocation();
  const [sentimentData, setSentimentData] = useState<MarketSentiment | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Mock sentiment data - in real implementation, fetch from API
    const mockSentiment: MarketSentiment = {
      fearGreedIndex: 68,
      fearGreedLabel: "Greed",
      vixLevel: 18.45,
      vixChange: -2.3,
      marketTrend: 'bullish',
      rsiLevel: 62.4,
      putCallRatio: 0.87,
      sentiment: 'greed'
    };

    // Simulate API delay
    setTimeout(() => {
      setSentimentData(mockSentiment);
      setIsLoading(false);
    }, 1000);
  }, []);

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'extreme_fear':
        return 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/30';
      case 'fear':
        return 'text-orange-700 bg-orange-100 dark:text-orange-300 dark:bg-orange-900/30';
      case 'neutral':
        return 'text-gray-700 bg-gray-100 dark:text-gray-300 dark:bg-gray-900/30';
      case 'greed':
        return 'text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/30';
      case 'extreme_greed':
        return 'text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-900/30';
      default:
        return 'text-muted-foreground bg-muted';
    }
  };

  const getFearGreedProgressColor = (value: number) => {
    if (value <= 25) return 'bg-red-500';
    if (value <= 45) return 'bg-orange-500';
    if (value <= 55) return 'bg-yellow-500';
    if (value <= 75) return 'bg-green-500';
    return 'bg-emerald-500';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'bullish':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'bearish':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const handleViewDetails = () => {
    setLocation("/market-analysis");
  };

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Thermometer className="w-5 h-5" />
            Market Sentiment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded animate-pulse w-24" />
              <div className="h-2 bg-muted rounded animate-pulse w-full" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="h-3 bg-muted rounded animate-pulse w-12" />
                <div className="h-4 bg-muted rounded animate-pulse w-16" />
              </div>
              <div className="space-y-1">
                <div className="h-3 bg-muted rounded animate-pulse w-12" />
                <div className="h-4 bg-muted rounded animate-pulse w-16" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!sentimentData) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Thermometer className="w-5 h-5" />
            Market Sentiment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Thermometer className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">Unable to load sentiment data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full hover:shadow-lg transition-shadow bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200/50 dark:border-amber-800/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <Thermometer className="w-5 h-5" />
            Market Sentiment
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleViewDetails}
            className="text-amber-600 hover:text-amber-700 hover:bg-amber-100/50"
          >
            <BarChart3 className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Fear & Greed Index */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Badge className={cn("px-3 py-1", getSentimentColor(sentimentData.sentiment))}>
              {sentimentData.fearGreedLabel}
            </Badge>
            <span className="text-2xl font-bold">{sentimentData.fearGreedIndex}</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Extreme Fear</span>
              <span>Extreme Greed</span>
            </div>
            <div className="relative h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className={cn("h-full transition-all duration-500", getFearGreedProgressColor(sentimentData.fearGreedIndex))}
                style={{ width: `${sentimentData.fearGreedIndex}%` }}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Fear & Greed Index</p>
        </div>

        {/* Market Indicators */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-2 rounded-lg bg-muted/30 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <span className="text-xs font-medium text-muted-foreground">VIX</span>
              {sentimentData.vixChange < 0 ? (
                <TrendingDown className="w-3 h-3 text-green-500" />
              ) : (
                <TrendingUp className="w-3 h-3 text-red-500" />
              )}
            </div>
            <p className="text-lg font-bold">{sentimentData.vixLevel}</p>
            <p className={cn("text-xs", 
              sentimentData.vixChange < 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
            )}>
              {sentimentData.vixChange > 0 ? "+" : ""}{sentimentData.vixChange.toFixed(1)}%
            </p>
          </div>

          <div className="p-2 rounded-lg bg-muted/30 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <span className="text-xs font-medium text-muted-foreground">Trend</span>
              {getTrendIcon(sentimentData.marketTrend)}
            </div>
            <p className="text-sm font-bold capitalize">{sentimentData.marketTrend}</p>
            <p className="text-xs text-muted-foreground">RSI: {sentimentData.rsiLevel}</p>
          </div>
        </div>

        {/* Put/Call Ratio */}
        <div className="p-2 rounded-lg bg-muted/30">
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-muted-foreground">Put/Call Ratio</span>
            <span className="text-sm font-bold">{sentimentData.putCallRatio.toFixed(2)}</span>
          </div>
          <div className="mt-1">
            <Progress 
              value={Math.min(sentimentData.putCallRatio * 100, 100)} 
              className="h-1"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {sentimentData.putCallRatio < 0.7 ? "Bullish" : 
             sentimentData.putCallRatio > 1.1 ? "Bearish" : "Neutral"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}