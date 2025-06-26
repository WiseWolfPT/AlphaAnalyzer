import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Newspaper, ExternalLink, Calendar, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Stock } from "@shared/schema";

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  publishedAt: string;
  url: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  relevanceScore: number;
  category: 'earnings' | 'analyst' | 'product' | 'financial' | 'general';
}

interface StockNewsProps {
  stock: Stock;
}

export function StockNews({ stock }: StockNewsProps) {
  const [isLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Mock news data - in production this would come from a news API
  const generateMockNews = (): NewsItem[] => {
    const categories: NewsItem['category'][] = ['earnings', 'analyst', 'product', 'financial', 'general'];
    const sources = ['Reuters', 'Bloomberg', 'Yahoo Finance', 'MarketWatch', 'The Wall Street Journal', 'CNBC'];
    const sentiments: NewsItem['sentiment'][] = ['positive', 'negative', 'neutral'];
    
    return Array.from({ length: 12 }, (_, index) => ({
      id: `news-${index}`,
      title: generateNewsTitle(stock.symbol, categories[index % categories.length]),
      summary: generateNewsSummary(stock.name, categories[index % categories.length]),
      source: sources[index % sources.length],
      publishedAt: new Date(Date.now() - (index * 2 * 60 * 60 * 1000)).toISOString(), // Every 2 hours
      url: `https://example.com/news/${index}`,
      sentiment: sentiments[index % sentiments.length],
      relevanceScore: Math.random() * 100,
      category: categories[index % categories.length]
    }));
  };

  const generateNewsTitle = (symbol: string, category: NewsItem['category']): string => {
    const titles = {
      earnings: [
        `${symbol} Reports Strong Q4 Earnings, Beats Expectations`,
        `${symbol} Quarterly Results Show Revenue Growth Despite Market Challenges`,
        `Analysts Upgrade ${symbol} Following Impressive Earnings Beat`
      ],
      analyst: [
        `Wall Street Analysts Raise Price Target for ${symbol}`,
        `${symbol} Receives "Buy" Rating from Major Investment Firm`,
        `Analyst Coverage: ${symbol} Shows Strong Fundamentals`
      ],
      product: [
        `${symbol} Launches Innovative New Product Line`,
        `${symbol} Announces Strategic Partnership to Expand Market Reach`,
        `${symbol} Unveils Technology Breakthrough in Latest Conference`
      ],
      financial: [
        `${symbol} Announces $1B Share Buyback Program`,
        `${symbol} Increases Dividend Yield for Fifth Consecutive Year`,
        `${symbol} Completes Major Acquisition to Strengthen Portfolio`
      ],
      general: [
        `${symbol} CEO Discusses Future Growth Strategy`,
        `${symbol} Commits to Sustainability Goals in Annual Report`,
        `Market Update: ${symbol} Performance in Current Economic Climate`
      ]
    };
    
    const categoryTitles = titles[category];
    return categoryTitles[Math.floor(Math.random() * categoryTitles.length)];
  };

  const generateNewsSummary = (companyName: string, category: NewsItem['category']): string => {
    const summaries = {
      earnings: `${companyName} delivered strong financial results for the quarter, with revenue and earnings per share exceeding analyst expectations. The company's performance reflects solid execution of its strategic initiatives and strong demand for its products and services.`,
      analyst: `Financial analysts have updated their outlook on ${companyName}, citing strong fundamentals and positive market positioning. The revised recommendations reflect confidence in the company's long-term growth prospects and competitive advantages.`,
      product: `${companyName} continues to innovate with new product offerings that address evolving market needs. The latest developments demonstrate the company's commitment to maintaining its competitive edge and expanding its market presence.`,
      financial: `${companyName} has announced important financial moves that underscore management's confidence in the business and commitment to returning value to shareholders. These strategic decisions reflect the company's strong cash position and financial flexibility.`,
      general: `Recent developments at ${companyName} highlight the company's strategic direction and market positioning. Management's focus on operational excellence and sustainable growth continues to drive business performance.`
    };
    
    return summaries[category];
  };

  const newsItems = generateMockNews();
  const categories = ['all', 'earnings', 'analyst', 'product', 'financial', 'general'];
  
  const filteredNews = selectedCategory === 'all' 
    ? newsItems 
    : newsItems.filter(item => item.category === selectedCategory);

  const getSentimentIcon = (sentiment: NewsItem['sentiment']) => {
    switch (sentiment) {
      case 'positive':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'negative':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getSentimentColor = (sentiment: NewsItem['sentiment']) => {
    switch (sentiment) {
      case 'positive':
        return 'text-green-600 bg-green-50 dark:bg-green-950 dark:text-green-400';
      case 'negative':
        return 'text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400';
      default:
        return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950 dark:text-yellow-400';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const publishedAt = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - publishedAt.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return publishedAt.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex gap-2 mb-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-20" />
          ))}
        </div>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <div className="flex gap-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* News Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Newspaper className="h-5 w-5" />
            Latest News for {stock.symbol}
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(category)}
            className="capitalize"
          >
            {category}
          </Button>
        ))}
      </div>

      {/* News Articles */}
      <div className="space-y-4">
        {filteredNews.map((newsItem) => (
          <Card key={newsItem.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="space-y-3">
                {/* Article Header */}
                <div className="flex items-start justify-between gap-4">
                  <h3 className="font-semibold leading-tight text-lg line-clamp-2">
                    {newsItem.title}
                  </h3>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {getSentimentIcon(newsItem.sentiment)}
                    <Badge 
                      variant="secondary" 
                      className={cn("text-xs", getSentimentColor(newsItem.sentiment))}
                    >
                      {newsItem.sentiment}
                    </Badge>
                  </div>
                </div>

                {/* Article Summary */}
                <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3">
                  {newsItem.summary}
                </p>

                {/* Article Metadata */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="font-medium">{newsItem.source}</span>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>{formatTimeAgo(newsItem.publishedAt)}</span>
                    </div>
                    <Badge variant="outline" className="text-xs capitalize">
                      {newsItem.category}
                    </Badge>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-primary hover:text-primary/80"
                    onClick={() => window.open(newsItem.url, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Read More
                  </Button>
                </div>

                {/* Relevance Score */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Relevance:</span>
                  <div className="flex-1 bg-secondary rounded-full h-2">
                    <div 
                      className="bg-primary rounded-full h-2 transition-all duration-300"
                      style={{ width: `${newsItem.relevanceScore}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {Math.round(newsItem.relevanceScore)}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Load More */}
      <div className="text-center">
        <Button variant="outline" className="w-full md:w-auto">
          Load More News
        </Button>
      </div>
    </div>
  );
}