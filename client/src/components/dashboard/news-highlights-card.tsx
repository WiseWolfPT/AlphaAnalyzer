import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Newspaper, ArrowRight, ExternalLink, TrendingUp, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  impact: 'high' | 'medium' | 'low';
  sentiment: 'positive' | 'negative' | 'neutral';
  relatedStocks: string[];
  publishedAt: Date;
  source: string;
  url: string;
}

export function NewsHighlightsCard() {
  const [, setLocation] = useLocation();
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Mock news data - in real implementation, fetch from API
    const mockNews: NewsItem[] = [
      {
        id: "1",
        title: "Fed Signals Potential Rate Cut in Next Meeting",
        summary: "Federal Reserve hints at monetary policy easing amid inflation concerns",
        impact: "high",
        sentiment: "positive",
        relatedStocks: ["SPY", "QQQ", "IWM"],
        publishedAt: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
        source: "Reuters",
        url: "#"
      },
      {
        id: "2",
        title: "NVIDIA Announces New AI Chip Architecture",
        summary: "Next-gen GPU promises 40% performance improvement for AI workloads",
        impact: "high",
        sentiment: "positive",
        relatedStocks: ["NVDA", "AMD", "INTC"],
        publishedAt: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
        source: "TechCrunch",
        url: "#"
      },
      {
        id: "3",
        title: "Oil Prices Surge on Supply Concerns",
        summary: "Geopolitical tensions drive crude oil futures higher",
        impact: "medium",
        sentiment: "negative",
        relatedStocks: ["XOM", "CVX", "COP"],
        publishedAt: new Date(Date.now() - 75 * 60 * 1000), // 1h 15m ago
        source: "Bloomberg",
        url: "#"
      }
    ];

    // Simulate API delay
    setTimeout(() => {
      setNewsItems(mockNews);
      setIsLoading(false);
    }, 1000);
  }, []);

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case 'high':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'medium':
        return <Info className="w-4 h-4 text-yellow-500" />;
      case 'low':
        return <Info className="w-4 h-4 text-blue-500" />;
      default:
        return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'text-green-600 dark:text-green-400';
      case 'negative':
        return 'text-red-600 dark:text-red-400';
      case 'neutral':
        return 'text-gray-600 dark:text-gray-400';
      default:
        return 'text-muted-foreground';
    }
  };

  const getTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60));
    
    if (diff < 1) return 'just now';
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
  };

  const handleViewStock = (symbol: string) => {
    setLocation(`/stock/${symbol}`);
  };

  const handleViewAllNews = () => {
    setLocation("/news");
  };

  const handleReadMore = (url: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // In real implementation, open the news article
    window.open(url, '_blank');
  };

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Newspaper className="w-5 h-5" />
            News Highlights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse w-full" />
                <div className="h-3 bg-muted rounded animate-pulse w-3/4" />
                <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full hover:shadow-lg transition-shadow bg-gradient-to-br from-slate-50/50 to-gray-50/50 dark:from-slate-950/20 dark:to-gray-950/20 border-slate-200/50 dark:border-slate-800/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <Newspaper className="w-5 h-5" />
            News Highlights
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleViewAllNews}
            className="text-slate-600 hover:text-slate-700 hover:bg-slate-100/50"
          >
            View All
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {newsItems.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <Newspaper className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No news available</p>
          </div>
        ) : (
          newsItems.map((news) => (
            <div 
              key={news.id}
              className="p-3 rounded-lg border border-muted/50 hover:border-slate-300 dark:hover:border-slate-600 cursor-pointer transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getImpactIcon(news.impact)}
                  <span className={cn("text-xs font-medium capitalize", getSentimentColor(news.sentiment))}>
                    {news.sentiment}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{getTimeAgo(news.publishedAt)}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleReadMore(news.url, e)}
                    className="h-6 w-6 p-0"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              
              <h4 className="font-semibold text-sm mb-1 line-clamp-2">
                {news.title}
              </h4>
              
              <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                {news.summary}
              </p>
              
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-1">
                  {news.relatedStocks.slice(0, 3).map((symbol) => (
                    <Badge 
                      key={symbol}
                      variant="outline"
                      className="text-xs px-1 py-0 cursor-pointer hover:bg-primary/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewStock(symbol);
                      }}
                    >
                      {symbol}
                    </Badge>
                  ))}
                  {news.relatedStocks.length > 3 && (
                    <Badge variant="outline" className="text-xs px-1 py-0">
                      +{news.relatedStocks.length - 3}
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground font-medium">
                  {news.source}
                </span>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}