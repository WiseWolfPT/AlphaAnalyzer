/**
 * Transcript Detail Page
 * Shows individual earnings transcript with AI insights integration
 */

import React, { useMemo, useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AIInsightsPanel } from '@/components/ai/ai-insights-panel';
import { useTranscriptAnalyses, useAnalyzeTranscript } from '@/hooks/use-ai-analysis';
import { 
  FileText, 
  ArrowLeft, 
  Calendar, 
  ExternalLink,
  Download,
  Share,
  Bookmark
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

// Helper to get API URL (consistent with list page)
const getApiUrl = () => (import.meta && import.meta.env && import.meta.env.DEV ? 'http://localhost:3001' : '');

type ApiTranscriptDetail = {
  id: number;
  ticker: string;
  company_name: string;
  quarter: string;
  year: number;
  call_date: string | null;
  ai_summary: string | null;
  raw_transcript: string | null;
  published_at?: string | null;
  view_count?: number;
};

type ParsedSummary = {
  summary?: string;
  key_insights?: string[];
  financial_highlights?: string[];
  risk_factors?: string[];
  // Backward compatibility keys
  keyInsights?: string[];
  financialHighlights?: string[];
};

function parseSummary(aiSummary: string | null): ParsedSummary | null {
  if (!aiSummary) return null;
  try {
    return JSON.parse(aiSummary) as ParsedSummary;
  } catch {
    return { summary: aiSummary };
  }
}

export default function TranscriptDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isFavorite, setIsFavorite] = useState(false);

  const transcriptId = params.id || '';

  const { data, isLoading, isError } = useQuery({
    queryKey: ['/api/transcripts/:id', transcriptId],
    enabled: !!transcriptId,
    queryFn: async () => {
      const api = getApiUrl();
      const res = await fetch(`${api}/api/transcripts/${transcriptId}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || 'Failed to fetch transcript');
      }
      const body = await res.json();
      return body.data as ApiTranscriptDetail;
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const transcript = data || null;
  const parsed = useMemo(() => parseSummary(transcript?.ai_summary || null), [transcript?.ai_summary]);
  const summaryText = useMemo(() => {
    if (!parsed) return 'Summary not available yet.';
    if (parsed.summary) return parsed.summary;
    const asAny = parsed as unknown as { text?: string };
    return asAny.text || 'Summary not available yet.';
  }, [parsed]);
  const highlights = useMemo(() => {
    if (!parsed) return [] as string[];
    return (
      parsed.key_insights ||
      parsed.keyInsights ||
      parsed.financial_highlights ||
      parsed.financialHighlights ||
      []
    ).slice(0, 8);
  }, [parsed]);

  // Fetch AI analyses for this transcript
  const { data: analyses = [], isLoading: analysesLoading } = useTranscriptAnalyses(transcriptId);
  const analyzeTranscriptMutation = useAnalyzeTranscript();

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-6 py-8">
          <div className="space-y-4">
            <div className="h-6 w-40 bg-muted rounded" />
            <div className="h-10 w-3/4 bg-muted rounded" />
            <div className="h-24 w-full bg-muted rounded" />
          </div>
        </div>
      </MainLayout>
    );
  }

  if (isError || !transcript) {
    return (
      <MainLayout>
        <div className="container mx-auto px-6 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Transcript Not Found</h1>
            <Button onClick={() => setLocation('/transcripts')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Transcripts
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  const handleGenerateAnalysis = (types: string[]) => {
    analyzeTranscriptMutation.mutate({
      transcriptId,
      types: types as ('summary' | 'sentiment' | 'metrics' | 'insights')[],
      priority: 'normal'
    });
  };

  const handleRegenerateAnalysis = (types: string[]) => {
    analyzeTranscriptMutation.mutate({
      transcriptId,
      types: types as ('summary' | 'sentiment' | 'metrics' | 'insights')[],
      priority: 'normal',
      forceRegenerate: true
    });
  };

  const handleStockClick = () => {
    setLocation(`/stock/${transcript.ticker}`);
  };

  const handleDownload = () => {
    // Create a downloadable transcript file
    const title = `${transcript.ticker} ${transcript.quarter} ${transcript.year} Earnings Call`;
    const content = `${title}\n${transcript.company_name} (${transcript.ticker})\n${transcript.quarter} ${transcript.year}\nDate: ${transcript.call_date || '-'}\n\n${transcript.raw_transcript || ''}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${transcript.ticker}_${transcript.quarter}_${transcript.year}_transcript.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Download Started",
      description: "Transcript is being downloaded as a text file.",
    });
  };

  const handleShare = async () => {
    const shareData = {
      title: transcript.title,
      text: `Check out this earnings transcript: ${transcript.title}`,
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: "Link Copied",
          description: "Transcript link has been copied to clipboard.",
        });
      }
    } catch (error) {
      toast({
        title: "Share Failed",
        description: "Unable to share transcript.",
        variant: "destructive",
      });
    }
  };

  const handleToggleFavorite = () => {
    setIsFavorite(!isFavorite);
    toast({
      title: isFavorite ? "Removed from Favorites" : "Added to Favorites",
      description: isFavorite ? "Transcript removed from your favorites." : "Transcript saved to your favorites.",
    });
  };

  // Sentiment display not shown in public detail (no field in API)

  return (
    <MainLayout>
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              onClick={() => setLocation('/transcripts')}
              className="h-10 w-10 p-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div 
                  className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center cursor-pointer hover:bg-primary/20 transition-colors"
                  onClick={handleStockClick}
                >
                  <span className="text-lg font-bold text-primary">{transcript.ticker.charAt(0)}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold">{transcript.ticker}</h1>
                    <Badge variant="outline">{transcript.quarter} {transcript.year}</Badge>
                  </div>
                  <p className="text-muted-foreground">{transcript.company_name}</p>
                </div>
              </div>
              
              <h2 className="text-xl font-semibold mb-4">{`${transcript.ticker} ${transcript.quarter} ${transcript.year} Earnings Call`}</h2>
              
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{transcript.call_date ? new Date(transcript.call_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleFavorite}
              >
                <Bookmark className={cn("h-4 w-4", { "fill-current": isFavorite })} />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
              >
                <Share className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleStockClick}
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                View Charts
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Transcript Content */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="transcript" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="transcript">Full Transcript</TabsTrigger>
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="metrics">Key Metrics</TabsTrigger>
              </TabsList>
              
              <TabsContent value="transcript" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Full Earnings Call Transcript
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      {(transcript.raw_transcript || 'Transcript not available.').split('\n\n').map((paragraph, index) => (
                        <p key={index} className="mb-4 leading-relaxed whitespace-pre-wrap">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="summary" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Executive Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">{summaryText}</p>
                    
                    <div>
                      <h4 className="font-medium mb-3">Key Highlights</h4>
                      <ul className="space-y-2">
                        {highlights.length > 0 ? (
                          highlights.map((h, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></span>
                              <span className="text-sm">{h}</span>
                            </li>
                          ))
                        ) : (
                          <li className="text-sm text-muted-foreground">No highlights available.</li>
                        )}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="metrics" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Financial Highlights</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {(parsed?.financial_highlights || parsed?.financialHighlights || []).map((item, idx) => (
                        <li key={idx} className="text-sm text-foreground flex items-start gap-2">
                          <span className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></span>
                          <span>{item}</span>
                        </li>
                      ))}
                      {!(parsed?.financial_highlights || parsed?.financialHighlights)?.length && (
                        <li className="text-sm text-muted-foreground">No financial highlights available.</li>
                      )}
                    </ul>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - AI Insights */}
          <div className="space-y-6">
            <AIInsightsPanel
              transcriptId={transcriptId}
              analyses={analyses}
              onGenerateAnalysis={handleGenerateAnalysis}
              onRegenerateAnalysis={handleRegenerateAnalysis}
              isLoading={analyzeTranscriptMutation.isPending}
            />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
