import { useMemo, useState } from "react";
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
import { TranscriptCardSkeleton } from "@/components/ui/transcript-card-skeleton";
import { useColdStartHandler } from "@/hooks/use-market-data";
// Removed date-fns import - using native Date methods

// Helper to get API URL (consistent com hooks)
const getApiUrl = () => (import.meta && import.meta.env && import.meta.env.DEV ? 'http://localhost:3001' : '');

type ApiTranscript = {
  id: number;
  ticker: string;
  company_name: string;
  quarter: string;
  year: number;
  call_date: string | null;
  ai_summary: string | null;
  published_at?: string | null;
  view_count?: number;
};

interface TranscriptCardProps { transcript: ApiTranscript; }

function TranscriptCard({ transcript }: TranscriptCardProps) {
  const [, setLocation] = useLocation();

  const handleStockClick = () => setLocation(`/stock/${transcript.ticker}`);

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
              <span className="text-lg font-bold text-primary">{transcript.ticker.charAt(0)}</span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-lg">{transcript.ticker}</h3>
                <Badge variant="outline">{transcript.quarter} {transcript.year}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{transcript.company_name}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2"></div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-medium mb-2">{`${transcript.ticker} ${transcript.quarter} ${transcript.year} Earnings Call`}</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {useMemo(() => {
              try {
                const parsed = transcript.ai_summary ? JSON.parse(transcript.ai_summary) : null;
                const summary = parsed?.summary as string | undefined;
                return summary ? summary.substring(0, 500) + (summary.length > 500 ? '…' : '') : 'Summary not available yet.';
              } catch { return 'Summary not available yet.'; }
            }, [transcript.ai_summary])}
          </p>
        </div>

        <div>
          <h5 className="text-sm font-medium mb-2">Key Highlights</h5>
          <ul className="space-y-1">
            {useMemo(() => {
              try {
                const parsed = transcript.ai_summary ? JSON.parse(transcript.ai_summary) : null;
                const highlights: string[] = parsed?.keyInsights || parsed?.financialHighlights || [];
                return (highlights.slice(0, 4)).map((h, idx) => (
                  <li key={idx} className="text-xs text-muted-foreground flex items-start space-x-2">
                    <span className="w-1 h-1 bg-primary rounded-full mt-2 flex-shrink-0"></span>
                    <span>{h}</span>
                  </li>
                ));
              } catch { return null; }
            }, [transcript.ai_summary])}
          </ul>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
            <div className="flex items-center space-x-1">
              <Calendar className="h-3 w-3" />
              <span>{transcript.call_date ? new Date(transcript.call_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' }) : '-'}</span>
            </div>
            <div className="flex items-center space-x-1"></div>
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
              className="bg-gradient-to-r from-teya-green via-teya-green-dark to-teya-green hover:from-teya-green-dark hover:via-teya-green hover:to-teya-green-dark text-rich-black font-semibold"
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
  
  // Cold start handler
  const { isColdStart, coldStartMessage } = useColdStartHandler();

  // In real app, this would be a proper API call
  const { data: apiData, isLoading } = useQuery({
    queryKey: ["/api/transcripts", searchQuery, selectedQuarter, selectedSentiment, selectedSort],
    queryFn: async () => {
      const api = getApiUrl();
      const params = new URLSearchParams();
      params.set('limit', '20');
      if (searchQuery) params.set('ticker', searchQuery.toUpperCase());
      if (selectedQuarter !== 'all') params.set('quarter', selectedQuarter);
      const res = await fetch(`${api}/api/transcripts?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch transcripts');
      return (await res.json()) as { success: boolean; data: ApiTranscript[]; pagination: any };
    },
    staleTime: 5 * 60 * 1000,
    retry: 1
  });

  const sortedTranscripts = useMemo(() => {
    const list = apiData?.data || [];
    const bySearch = list.filter(t => {
      if (!searchQuery) return true;
      const s = searchQuery.toLowerCase();
      return t.ticker.toLowerCase().includes(s) || (t.company_name || '').toLowerCase().includes(s);
    });
    const byQuarter = selectedQuarter === 'all' ? bySearch : bySearch.filter(t => t.quarter === selectedQuarter);
    // sentiment/ratings não existem na API — ignorar estes filtros em dev
    const arr = [...byQuarter];
    switch (selectedSort) {
      case 'recent':
        return arr.sort((a, b) => new Date(b.published_at || b.call_date || '').getTime() - new Date(a.published_at || a.call_date || '').getTime());
      case 'symbol':
        return arr.sort((a, b) => a.ticker.localeCompare(b.ticker));
      default:
        return arr;
    }
  }, [apiData, searchQuery, selectedQuarter, selectedSort]);

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
              <div className="space-y-4">
                {isColdStart && (
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/50 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-800 dark:text-blue-200">{coldStartMessage}</p>
                  </div>
                )}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <TranscriptCardSkeleton key={i} />
                  ))}
                </div>
              </div>
            ) : sortedTranscripts.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {sortedTranscripts.map((t) => (
                  <TranscriptCard key={t.id} transcript={t} />
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
