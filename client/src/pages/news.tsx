import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Newspaper, 
  Search, 
  TrendingUp, 
  ExternalLink, 
  Clock, 
  Eye,
  Bookmark,
  Share,
  Filter,
  Calendar,
  Globe,
  Star,
  ArrowRight,
  BarChart3
} from "lucide-react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  source: string;
  publishedAt: Date;
  url: string;
  category: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  stocks: string[];
  image?: string;
  views: number;
  isBookmarked: boolean;
}

export default function News() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");

  // Mock news data - in real app, this would come from news APIs
  const mockNews: NewsArticle[] = [
    {
      id: "1",
      title: "Tesla Stock Surges 8% on Strong Q4 Delivery Numbers",
      summary: "Tesla exceeded expectations with record quarterly deliveries, driving significant investor optimism for the electric vehicle giant.",
      source: "Reuters",
      publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      url: "#",
      category: "earnings",
      sentiment: "positive",
      stocks: ["TSLA"],
      views: 15420,
      isBookmarked: false
    },
    {
      id: "2",
      title: "Federal Reserve Signals Potential Rate Cut in 2024",
      summary: "Fed Chairman Powell hints at possible monetary policy easing amid cooling inflation data, boosting market sentiment.",
      source: "Financial Times",
      publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
      url: "#",
      category: "market",
      sentiment: "positive",
      stocks: ["SPY", "QQQ"],
      views: 28350,
      isBookmarked: true
    },
    {
      id: "3",
      title: "Apple Reports Mixed Q4 Results, Services Revenue Grows",
      summary: "While iPhone sales slowed, Apple's services division continues robust growth, offsetting hardware challenges.",
      source: "Bloomberg",
      publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
      url: "#",
      category: "earnings",
      sentiment: "neutral",
      stocks: ["AAPL"],
      views: 22180,
      isBookmarked: false
    },
    {
      id: "4",
      title: "Microsoft Azure Gains Market Share Against AWS",
      summary: "Microsoft's cloud computing division continues to capture market share, threatening Amazon's dominance in cloud services.",
      source: "TechCrunch",
      publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
      url: "#",
      category: "technology",
      sentiment: "positive",
      stocks: ["MSFT", "AMZN"],
      views: 18760,
      isBookmarked: true
    },
    {
      id: "5",
      title: "Oil Prices Rise on OPEC+ Production Cut Extension",
      summary: "Energy markets rally as OPEC+ extends production cuts through Q2, supporting crude oil price stability.",
      source: "CNBC",
      publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
      url: "#",
      category: "energy",
      sentiment: "positive",
      stocks: ["XOM", "CVX"],
      views: 14520,
      isBookmarked: false
    },
    {
      id: "6",
      title: "Banking Sector Faces Regulatory Scrutiny Over AI Use",
      summary: "Financial regulators increase oversight of artificial intelligence applications in banking and credit decisions.",
      source: "Wall Street Journal",
      publishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      url: "#",
      category: "regulation",
      sentiment: "negative",
      stocks: ["JPM", "BAC", "WFC"],
      views: 19340,
      isBookmarked: false
    }
  ];

  const { data: news = mockNews } = useQuery<NewsArticle[]>({
    queryKey: ["/api/news"],
    initialData: mockNews,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const categories = [
    { value: "all", label: "All News" },
    { value: "market", label: "Market News" },
    { value: "earnings", label: "Earnings" },
    { value: "technology", label: "Technology" },
    { value: "energy", label: "Energy" },
    { value: "regulation", label: "Regulation" }
  ];

  const sources = [
    { value: "all", label: "All Sources" },
    { value: "Reuters", label: "Reuters" },
    { value: "Bloomberg", label: "Bloomberg" },
    { value: "Financial Times", label: "Financial Times" },
    { value: "CNBC", label: "CNBC" },
    { value: "Wall Street Journal", label: "WSJ" }
  ];

  // Filter and sort news
  const filteredNews = news
    .filter(article => {
      const matchesSearch = searchQuery === "" || 
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.stocks.some(stock => stock.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = categoryFilter === "all" || article.category === categoryFilter;
      const matchesSource = sourceFilter === "all" || article.source === sourceFilter;
      return matchesSearch && matchesCategory && matchesSource;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "recent":
          return b.publishedAt.getTime() - a.publishedAt.getTime();
        case "popular":
          return b.views - a.views;
        case "bookmarked":
          return Number(b.isBookmarked) - Number(a.isBookmarked);
        default:
          return 0;
      }
    });

  const topStories = filteredNews.slice(0, 3);
  const marketTrends = [
    { symbol: "SPY", change: "+1.2%", trend: "up" },
    { symbol: "QQQ", change: "+1.8%", trend: "up" },
    { symbol: "VIX", change: "-5.3%", trend: "down" },
    { symbol: "DXY", change: "+0.4%", trend: "up" }
  ];

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "positive": return "text-green-600 bg-green-100 dark:bg-green-900/20";
      case "negative": return "text-red-600 bg-red-100 dark:bg-red-900/20";
      default: return "text-gray-600 bg-gray-100 dark:bg-gray-900/20";
    }
  };

  const handleStockClick = (symbol: string) => {
    setLocation(`/stock/${symbol}/charts`);
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Newspaper className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Market News</h1>
              <p className="text-muted-foreground">Stay informed with the latest financial news and market updates</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Bookmark className="h-4 w-4 mr-2" />
              Bookmarks
            </Button>
          </div>
        </div>

        {/* Quick Market Overview */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Market Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {marketTrends.map((trend) => (
                <div 
                  key={trend.symbol}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => handleStockClick(trend.symbol)}
                >
                  <span className="font-medium">{trend.symbol}</span>
                  <span className={cn(
                    "text-sm font-semibold",
                    trend.trend === "up" ? "text-green-600" : "text-red-600"
                  )}>
                    {trend.change}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search news, stocks, or topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sources.map((source) => (
                  <SelectItem key={source.value} value={source.value}>
                    {source.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Recent</SelectItem>
                <SelectItem value="popular">Popular</SelectItem>
                <SelectItem value="bookmarked">Bookmarked</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="all">All News</TabsTrigger>
            <TabsTrigger value="top">Top Stories</TabsTrigger>
            <TabsTrigger value="watchlist">My Watchlist</TabsTrigger>
            <TabsTrigger value="bookmarks">Bookmarks</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main News Feed */}
              <div className="lg:col-span-2 space-y-4">
                {filteredNews.map((article, index) => (
                  <motion.div
                    key={article.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer group">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="w-16 h-16 bg-muted rounded-lg flex-shrink-0 flex items-center justify-center">
                            <Newspaper className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="text-xs">
                                {article.category}
                              </Badge>
                              <Badge className={cn("text-xs", getSentimentColor(article.sentiment))}>
                                {article.sentiment}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {article.source}
                              </span>
                            </div>
                            <h3 className="font-semibold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                              {article.title}
                            </h3>
                            <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                              {article.summary}
                            </p>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDistanceToNow(article.publishedAt, { addSuffix: true })}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Eye className="h-3 w-3" />
                                  {article.views.toLocaleString()}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {article.stocks.map((stock) => (
                                  <Badge 
                                    key={stock}
                                    variant="secondary" 
                                    className="text-xs cursor-pointer hover:bg-primary/20"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStockClick(stock);
                                    }}
                                  >
                                    {stock}
                                  </Badge>
                                ))}
                                <Button variant="ghost" size="sm" className="p-1">
                                  <Bookmark className={cn(
                                    "h-4 w-4",
                                    article.isBookmarked ? "fill-current text-primary" : ""
                                  )} />
                                </Button>
                                <Button variant="ghost" size="sm" className="p-1">
                                  <Share className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" className="p-1">
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* Sidebar */}
              <div className="lg:col-span-1 space-y-6">
                {/* Top Stories */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Star className="h-5 w-5" />
                      Top Stories
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {topStories.map((story, index) => (
                      <div key={story.id} className="flex items-start gap-3 pb-3 border-b last:border-b-0 last:pb-0">
                        <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-xs">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm line-clamp-2 mb-1">
                            {story.title}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{story.source}</span>
                            <span>•</span>
                            <span>{formatDistanceToNow(story.publishedAt, { addSuffix: true })}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Trending Stocks */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Trending Stocks
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {["TSLA", "AAPL", "MSFT", "NVDA", "GOOGL"].map((symbol) => (
                      <div 
                        key={symbol}
                        className="flex items-center justify-between p-2 rounded hover:bg-muted transition-colors cursor-pointer"
                        onClick={() => handleStockClick(symbol)}
                      >
                        <span className="font-medium">{symbol}</span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* News Sources */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      News Sources
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {["Reuters", "Bloomberg", "Financial Times", "CNBC", "WSJ"].map((source) => (
                      <div key={source} className="flex items-center justify-between text-sm">
                        <span>{source}</span>
                        <span className="text-muted-foreground">
                          {Math.floor(Math.random() * 20) + 5} articles
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="top">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {topStories.map((story) => (
                <Card key={story.id} className="hover:shadow-lg transition-all duration-300">
                  <CardContent className="p-6">
                    <Badge variant="outline" className="mb-3">
                      {story.category}
                    </Badge>
                    <h3 className="font-semibold text-lg mb-3 line-clamp-2">
                      {story.title}
                    </h3>
                    <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                      {story.summary}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{story.source}</span>
                      <span>{formatDistanceToNow(story.publishedAt, { addSuffix: true })}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="watchlist">
            <div className="text-center py-12">
              <Newspaper className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Watchlist News</h3>
              <p className="text-muted-foreground mb-4">
                News related to stocks in your watchlists will appear here.
              </p>
              <Button onClick={() => setLocation('/watchlists')}>
                Manage Watchlists
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="bookmarks">
            <div className="space-y-4">
              {filteredNews.filter(article => article.isBookmarked).map((article) => (
                <Card key={article.id} className="hover:shadow-lg transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 bg-muted rounded-lg flex-shrink-0 flex items-center justify-center">
                        <Bookmark className="h-6 w-6 text-primary fill-current" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-2">{article.title}</h3>
                        <p className="text-muted-foreground text-sm mb-3">{article.summary}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{article.source}</span>
                          <span>{formatDistanceToNow(article.publishedAt, { addSuffix: true })}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}