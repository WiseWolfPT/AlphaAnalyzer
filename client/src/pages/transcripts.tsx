import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Search, Calendar, TrendingUp, ExternalLink, Play, Clock, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

// Mock transcripts data - in real app, this would come from API
const mockTranscripts = [
  {
    id: 1,
    symbol: "AAPL",
    companyName: "Apple Inc.",
    quarter: "Q1",
    year: 2025,
    callDate: "2025-01-25",
    title: "Q1 2025 Earnings Call",
    summary: "Apple reported strong iPhone sales and growth in services revenue. The company highlighted progress in AI integration and sustainable product initiatives.",
    keyHighlights: [
      "iPhone revenue up 5% year-over-year",
      "Services revenue reached record high",
      "Strong growth in emerging markets",
      "AI features driving user engagement"
    ],
    sentiment: "positive",
    published: true,
    duration: "45 min",
    rating: 4.8
  },
  {
    id: 2,
    symbol: "MSFT",
    companyName: "Microsoft Corporation",
    quarter: "Q1",
    year: 2025,
    callDate: "2025-01-24",
    title: "Q1 2025 Earnings Call",
    summary: "Microsoft showcased continued cloud growth with Azure revenue acceleration. Strong performance in productivity and business processes segments.",
    keyHighlights: [
      "Azure revenue growth of 35%",
      "Microsoft 365 subscriber growth",
      "AI-powered productivity gains",
      "Strong enterprise demand"
    ],
    sentiment: "positive",
    published: true,
    duration: "52 min",
    rating: 4.9
  },
  {
    id: 3,
    symbol: "GOOGL",
    companyName: "Alphabet Inc.",
    quarter: "Q4",
    year: 2024,
    callDate: "2025-01-23",
    title: "Q4 2024 Earnings Call",
    summary: "Google parent Alphabet reported mixed results with advertising revenue showing some pressure while cloud division continued strong growth trajectory.",
    keyHighlights: [
      "Search advertising revenue decline",
      "YouTube growth momentum",
      "Google Cloud competitive positioning",
      "AI integration across products"
    ],
    sentiment: "neutral",
    published: true,
    duration: "48 min",
    rating: 4.2
  }
];

interface TranscriptCardProps {
  transcript: typeof mockTranscripts[0];
}

function TranscriptCard({ transcript }: TranscriptCardProps) {
  const [, setLocation] = useLocation();

  const handleStockClick = () => {
    setLocation(`/stock/${transcript.symbol}/charts`);
  };

  const handleViewTranscript = () => {
    // Navigate to transcript detail view
    setLocation(`/transcript/${transcript.id}`);
  };

  const sentimentColor = {
    positive: "text-green-600 dark:text-green-400",
    neutral: "text-yellow-600 dark:text-yellow-400",
    negative: "text-red-600 dark:text-red-400"
  };

  const sentimentBg = {
    positive: "bg-green-100 dark:bg-green-900/20",
    neutral: "bg-yellow-100 dark:bg-yellow-900/20",
    negative: "bg-red-100 dark:bg-red-900/20"
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div 
              className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center cursor-pointer hover:bg-primary/20 transition-colors"
              onClick={handleStockClick}
            >
              <span className="text-lg font-bold text-primary">{transcript.symbol.charAt(0)}</span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-lg">{transcript.symbol}</h3>
                <Badge variant="outline">{transcript.quarter} {transcript.year}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{transcript.companyName}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={cn("text-xs", sentimentBg[transcript.sentiment])}>
              <TrendingUp className="h-3 w-3 mr-1" />
              {transcript.sentiment}
            </Badge>
            <div className="flex items-center space-x-1">
              <Star className="h-4 w-4 text-yellow-500 fill-current" />
              <span className="text-sm font-medium">{transcript.rating}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-medium mb-2">{transcript.title}</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {transcript.summary}
          </p>
        </div>

        <div>
          <h5 className="text-sm font-medium mb-2">Key Highlights</h5>
          <ul className="space-y-1">
            {transcript.keyHighlights.map((highlight, index) => (
              <li key={index} className="text-xs text-muted-foreground flex items-start space-x-2">
                <span className="w-1 h-1 bg-primary rounded-full mt-2 flex-shrink-0"></span>
                <span>{highlight}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
            <div className="flex items-center space-x-1">
              <Calendar className="h-3 w-3" />
              <span>{format(new Date(transcript.callDate), 'MMM dd, yyyy')}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>{transcript.duration}</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleStockClick}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              View Charts
            </Button>
            <Button 
              size="sm"
              onClick={handleViewTranscript}
              className="bg-gradient-to-r from-chartreuse via-chartreuse-dark to-chartreuse hover:from-chartreuse-dark hover:via-chartreuse hover:to-chartreuse-dark text-rich-black font-semibold"
            >
              <Play className="h-3 w-3 mr-1" />
              Read Transcript
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Transcripts() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedQuarter, setSelectedQuarter] = useState("all");
  const [selectedSentiment, setSelectedSentiment] = useState("all");
  const [selectedSort, setSelectedSort] = useState("recent");

  // In real app, this would be a proper API call
  const { data: transcripts, isLoading } = useQuery({
    queryKey: ["/api/transcripts", searchQuery, selectedQuarter, selectedSentiment],
    // Mock implementation
    queryFn: () => Promise.resolve(mockTranscripts),
    staleTime: 5 * 60 * 1000,
  });

  const filteredTranscripts = transcripts?.filter(transcript => {
    const matchesSearch = transcript.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         transcript.companyName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesQuarter = selectedQuarter === "all" || transcript.quarter === selectedQuarter;
    const matchesSentiment = selectedSentiment === "all" || transcript.sentiment === selectedSentiment;
    
    return matchesSearch && matchesQuarter && matchesSentiment;
  }) || [];

  const sortedTranscripts = [...filteredTranscripts].sort((a, b) => {
    switch (selectedSort) {
      case "recent":
        return new Date(b.callDate).getTime() - new Date(a.callDate).getTime();
      case "rating":
        return b.rating - a.rating;
      case "symbol":
        return a.symbol.localeCompare(b.symbol);
      default:
        return 0;
    }
  });

  return (
    <MainLayout>
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-xl">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Earnings Transcripts</h1>
              <p className="text-muted-foreground">AI-powered summaries and analysis of earnings calls</p>
            </div>
          </div>
          
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by company or symbol..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Quarter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Quarters</SelectItem>
                <SelectItem value="Q1">Q1</SelectItem>
                <SelectItem value="Q2">Q2</SelectItem>
                <SelectItem value="Q3">Q3</SelectItem>
                <SelectItem value="Q4">Q4</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={selectedSentiment} onValueChange={setSelectedSentiment}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Sentiment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sentiment</SelectItem>
                <SelectItem value="positive">Positive</SelectItem>
                <SelectItem value="neutral">Neutral</SelectItem>
                <SelectItem value="negative">Negative</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={selectedSort} onValueChange={setSelectedSort}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="rating">Highest Rated</SelectItem>
                <SelectItem value="symbol">Symbol A-Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="recent" className="space-y-6">
          <TabsList>
            <TabsTrigger value="recent">Recent Transcripts</TabsTrigger>
            <TabsTrigger value="trending">Trending</TabsTrigger>
            <TabsTrigger value="favorites">Favorites</TabsTrigger>
          </TabsList>
          
          <TabsContent value="recent" className="space-y-6">
            {isLoading ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-80 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : sortedTranscripts.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {sortedTranscripts.map((transcript) => (
                  <TranscriptCard key={transcript.id} transcript={transcript} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No transcripts found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your filters or search query
                </p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="trending" className="space-y-6">
            <div className="text-center py-12">
              <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Trending Transcripts</h3>
              <p className="text-muted-foreground">
                Most discussed earnings calls this week
              </p>
            </div>
          </TabsContent>
          
          <TabsContent value="favorites" className="space-y-6">
            <div className="text-center py-12">
              <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Your Favorites</h3>
              <p className="text-muted-foreground">
                Save transcripts to access them quickly
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}