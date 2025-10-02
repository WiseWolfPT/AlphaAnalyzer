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
import { TypewriterText } from '@/components/ui/typewriter-text';
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
  ai_summary: string | object | null;
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

function parseSummary(aiSummary: string | object | null): ParsedSummary | null {
  if (!aiSummary) return null;

  let parsed: any;

  try {
    // Handle object input (already parsed from API)
    if (typeof aiSummary === 'object') {
      parsed = aiSummary;
    } else if (typeof aiSummary === 'string') {
      // Handle string input (needs JSON parsing)
      parsed = JSON.parse(aiSummary);
    } else {
      return null;
    }

    // Helper function to safely extract string arrays, filtering out any non-strings
    const safeStringArray = (arr: any): string[] => {
      if (!Array.isArray(arr)) return [];
      return arr.filter(item => typeof item === 'string' && item.trim().length > 0);
    };

    // Helper function to safely extract string, never return objects
    const safeString = (value: any): string => {
      if (typeof value === 'string') return value;
      if (value === null || value === undefined) return '';
      // Convert any object to a safe string representation
      return String(value);
    };

    // Handle new OpenAI structure: { model: "openai", tokens: {...}, summary: "text" }
    if (parsed?.model === 'openai' && parsed?.summary) {
      // CRITICAL: Extract ONLY the summary string, never return the full object
      const summaryText = typeof parsed.summary === 'string' ? parsed.summary : String(parsed.summary);

      console.log('🔍 OpenAI structure detected, extracting summary:', summaryText.substring(0, 100));

      return {
        summary: summaryText,
        key_insights: safeStringArray(parsed.key_insights || parsed.keyInsights || []),
        financial_highlights: safeStringArray(parsed.financial_highlights || parsed.financialHighlights || []),
        risk_factors: safeStringArray(parsed.risk_factors || [])
      };
    }

    // Also handle case where summary exists regardless of model type
    if (parsed?.summary && typeof parsed.summary === 'string') {
      return {
        summary: safeString(parsed.summary),
        key_insights: safeStringArray(parsed.key_insights || parsed.keyInsights || []),
        financial_highlights: safeStringArray(parsed.financial_highlights || parsed.financialHighlights || []),
        risk_factors: safeStringArray(parsed.risk_factors || [])
      };
    }

    // Handle legacy structures with various fields
    const result: ParsedSummary = {
      summary: '',
      key_insights: [],
      financial_highlights: [],
      risk_factors: []
    };

    // Extract summary text from various possible fields using safeString helper
    if (parsed.summary) {
      result.summary = safeString(parsed.summary);
    } else if (parsed.outlook) {
      result.summary = safeString(parsed.outlook);
    } else if (parsed.text) {
      result.summary = safeString(parsed.text);
    } else if (typeof parsed === 'string') {
      result.summary = safeString(parsed);
    } else {
      // Fallback: create a summary from available fields
      const parts = [];
      if (parsed.outlook) parts.push(`Outlook: ${safeString(parsed.outlook)}`);
      if (Array.isArray(parsed.risks) && parsed.risks.length > 0) {
        const safeRisks = safeStringArray(parsed.risks);
        if (safeRisks.length > 0) parts.push(`Risks: ${safeRisks.join(', ')}`);
      }
      result.summary = parts.length > 0 ? parts.join(' | ') : 'Summary content available in detailed view.';
    }

    // Extract arrays safely using helper function
    result.key_insights = safeStringArray(parsed.key_insights || parsed.keyInsights || parsed.risks);
    result.financial_highlights = safeStringArray(parsed.financial_highlights || parsed.financialHighlights);
    result.risk_factors = safeStringArray(parsed.risk_factors || parsed.risks);

    return result;
  } catch (error) {
    console.error('Error parsing AI summary:', error);
    // If JSON parsing fails, treat as plain text summary with safe conversion
    const safeText = typeof aiSummary === 'string' ? aiSummary : 'Summary not available.';
    return {
      summary: safeText,
      key_insights: [],
      financial_highlights: [],
      risk_factors: [],
      stock_specific_metrics: []
    };
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

  console.log('🔍 TRANSCRIPT DEBUG:', {
    transcriptExists: !!transcript,
    aiSummaryType: typeof transcript?.ai_summary,
    aiSummaryValue: transcript?.ai_summary
  });

  const parsed = useMemo(() => {
    const result = parseSummary(transcript?.ai_summary || null);
    console.log('🔍 PARSED SUMMARY RESULT:', {
      result,
      type: typeof result,
      hasSummary: !!result?.summary,
      summaryType: typeof result?.summary
    });
    return result;
  }, [transcript?.ai_summary]);
  const summaryText = useMemo(() => {
    console.log('🔍 COMPUTING SUMMARY TEXT:', {
      parsed,
      hasParsed: !!parsed,
      parsedSummary: parsed?.summary,
      parsedSummaryType: typeof parsed?.summary
    });

    if (!parsed) return 'Summary not available yet.';

    // Ensure we never render an object - strict type checking
    if (parsed.summary) {
      if (typeof parsed.summary === 'string') {
        console.log('🔍 RETURNING STRING SUMMARY:', parsed.summary.substring(0, 100));
        return parsed.summary;
      } else {
        // Log the problematic object type but never log the actual object to avoid React issues
        console.warn('Summary is not a string, type:', typeof parsed.summary);
        return 'Summary format not supported. Please regenerate the AI analysis.';
      }
    }

    return 'Summary not available yet.';
  }, [parsed]);
  const highlights = useMemo(() => {
    console.log('🔍 COMPUTING HIGHLIGHTS:', {
      parsed,
      hasParsed: !!parsed,
      keyInsights: parsed?.key_insights,
      keyInsightsType: typeof parsed?.key_insights,
      financialHighlights: parsed?.financial_highlights,
      financialHighlightsType: typeof parsed?.financial_highlights
    });

    if (!parsed) return [] as string[];

    const insights = parsed.key_insights || parsed.keyInsights || [];
    const financials = parsed.financial_highlights || parsed.financialHighlights || [];

    console.log('🔍 RAW HIGHLIGHTS DATA:', {
      insights,
      insightsType: typeof insights,
      insightsIsArray: Array.isArray(insights),
      financials,
      financialsType: typeof financials,
      financialsIsArray: Array.isArray(financials)
    });

    // Ensure we have arrays
    const safeInsights = Array.isArray(insights) ? insights : [];
    const safeFinancials = Array.isArray(financials) ? financials : [];

    // Combine insights and financial highlights, ensuring they're arrays of strings
    const allHighlights = [...safeInsights, ...safeFinancials].filter(item => {
      if (typeof item !== 'string') {
        console.warn('Non-string item found in highlights, type:', typeof item, 'item:', item);
        return false;
      }
      return item.trim().length > 0;
    });

    console.log('🔍 FINAL HIGHLIGHTS:', allHighlights);
    return allHighlights.slice(0, 8);
  }, [parsed]);

  // State for typewriter animation completion
  const [insightsComplete, setInsightsComplete] = useState(false);
  const [highlightsComplete, setHighlightsComplete] = useState(false);

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

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast({
      description: "Link copied to clipboard",
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
                <Card className="overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b">
                    <CardTitle className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <span className="text-xl font-semibold">Full Earnings Call Transcript</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-8">
                    <div className="prose prose-lg dark:prose-invert max-w-none">
                      {(transcript.raw_transcript || 'Transcript not available.').split('\n\n').map((paragraph, index) => {
                        // Check if paragraph is a speaker line (usually in format "Name:" or contains "CEO", "CFO", etc.)
                        const isSpeaker = paragraph.match(/^[A-Z][^:]*:/) ||
                                        paragraph.includes('CEO') ||
                                        paragraph.includes('CFO') ||
                                        paragraph.includes('Operator') ||
                                        paragraph.includes('Analyst');

                        if (isSpeaker) {
                          const [speaker, ...content] = paragraph.split(':');
                          return (
                            <div key={index} className="mb-6 pl-4 border-l-4 border-primary/30 hover:border-primary/50 transition-colors">
                              <div className="font-semibold text-primary mb-2 text-sm uppercase tracking-wider">
                                {speaker.trim()}
                              </div>
                              <p className="text-base leading-relaxed text-foreground/90 whitespace-pre-wrap">
                                {content.join(':').trim()}
                              </p>
                            </div>
                          );
                        }

                        return (
                          <p key={index} className="mb-6 text-base leading-[1.8] text-foreground/85 whitespace-pre-wrap tracking-wide">
                            {paragraph}
                          </p>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="summary" className="space-y-4">
                <Card className="overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-blue-500/5 to-blue-500/10 border-b">
                    <CardTitle className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/10 rounded-lg">
                        <span className="text-xl">📊</span>
                      </div>
                      <span className="text-xl font-semibold">Executive Summary</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-8">
                    <div className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border border-primary/20 mb-6">
                      <p className="text-lg leading-[1.8] text-foreground/90 font-medium">
                        {typeof summaryText === 'string' ? summaryText : 'Summary not available yet.'}
                      </p>
                    </div>

                    <div>
                      <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                        <span className="text-xl">🎯</span>
                        Key Highlights
                      </h4>
                      <div className="grid gap-3">
                        {highlights.length > 0 ? (
                          highlights.map((h, index) => (
                            <div key={index} className="flex items-start gap-3 p-4 rounded-lg bg-card hover:bg-card/80 transition-colors border border-border/50">
                              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-sm font-semibold text-primary">{index + 1}</span>
                              </div>
                              <span className="text-base leading-relaxed">{typeof h === 'string' ? h : 'Invalid highlight'}</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-base text-muted-foreground p-4 text-center">No highlights available.</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="metrics" className="space-y-4">
                {(() => {
                  // Parse financial metrics from AI analysis
                  const financialHighlights = parsed?.financial_highlights || parsed?.financialHighlights || [];
                  const stockMetrics = parsed?.stock_specific_metrics || parsed?.stockSpecificMetrics || [];

                  // Convert highlights to structured metrics format
                  const metrics = [];

                  // Process financial highlights
                  financialHighlights.forEach((highlight) => {
                    if (typeof highlight !== 'string') return;

                    // Parse revenue metrics
                    if (highlight.toLowerCase().includes('revenue')) {
                      const value = highlight.match(/\$[\d.,]+\s*(billion|million)?/i)?.[0] || '';
                      const change = highlight.match(/[+-]?\d+\.?\d*%/)?.[0];
                      metrics.push({
                        label: 'Revenue',
                        value,
                        change: change ? parseFloat(change) : undefined,
                        changeType: 'percent',
                        comparison: highlight.includes('YoY') ? 'YoY' : highlight.includes('QoQ') ? 'QoQ' : undefined,
                        category: 'revenue'
                      });
                    }

                    // Parse EPS metrics
                    else if (highlight.toLowerCase().includes('eps')) {
                      const value = highlight.match(/\$[\d.]+/)?.[0] || '';
                      const beat = highlight.match(/beat.*?\$[\d.]+/i)?.[0];
                      metrics.push({
                        label: highlight.includes('GAAP') ? 'GAAP EPS' : 'EPS',
                        value,
                        comparison: beat ? `Beat by ${beat.match(/\$[\d.]+/)?.[0]}` : undefined,
                        category: 'earnings'
                      });
                    }

                    // Parse margin metrics
                    else if (highlight.toLowerCase().includes('margin')) {
                      const value = highlight.match(/\d+\.?\d*%/)?.[0] || '';
                      const change = highlight.match(/[+-]?\d+bps/)?.[0];
                      const marginType = highlight.match(/(gross|operating|net|ebitda)/i)?.[0] || 'Margin';
                      metrics.push({
                        label: `${marginType.charAt(0).toUpperCase() + marginType.slice(1)} Margin`,
                        value,
                        change: change ? parseInt(change) : undefined,
                        changeType: 'basis_points',
                        category: 'margins'
                      });
                    }

                    // Parse cash flow metrics
                    else if (highlight.toLowerCase().includes('cash flow') || highlight.toLowerCase().includes('fcf')) {
                      const value = highlight.match(/\$[\d.,]+\s*(billion|million)?/i)?.[0] || '';
                      const change = highlight.match(/[+-]?\d+\.?\d*%/)?.[0];
                      metrics.push({
                        label: highlight.includes('free') ? 'Free Cash Flow' : 'Operating Cash Flow',
                        value,
                        change: change ? parseFloat(change) : undefined,
                        changeType: 'percent',
                        category: 'cash_flow'
                      });
                    }

                    // Parse guidance
                    else if (highlight.toLowerCase().includes('guidance')) {
                      metrics.push({
                        label: 'Guidance Update',
                        value: highlight.match(/(raised|lowered|maintained|initiated)/i)?.[0] || 'Updated',
                        comparison: highlight,
                        category: 'guidance'
                      });
                    }
                  });

                  // Add stock-specific metrics
                  stockMetrics.forEach((metric) => {
                    if (typeof metric !== 'string') return;

                    // Parse various KPI formats
                    const metricName = metric.split(':')[0] || metric;
                    const metricValue = metric.split(':')[1] || metric;

                    metrics.push({
                      label: metricName.trim(),
                      value: metricValue.trim(),
                      category: 'operational'
                    });
                  });

                  // If we have structured metrics, use the new display component
                  if (metrics.length > 0) {
                    return (
                      <FinancialMetricsDisplay
                        ticker={transcript.ticker}
                        quarter={transcript.quarter}
                        year={transcript.year}
                        metrics={metrics}
                      />
                    );
                  }

                  // Fallback to simple display if no structured metrics
                  return (
                    <Card className="overflow-hidden">
                      <CardHeader className="bg-gradient-to-r from-green-500/5 to-green-500/10 border-b">
                        <CardTitle className="flex items-center gap-3">
                          <div className="p-2 bg-green-500/10 rounded-lg">
                            <span className="text-xl">💰</span>
                          </div>
                          <span className="text-xl font-semibold">Financial Highlights - {transcript.ticker}</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-8">
                        <div className="p-8 text-center">
                          <div className="text-4xl mb-4">📈</div>
                          <p className="text-muted-foreground">No financial highlights available yet.</p>
                          <p className="text-sm text-muted-foreground mt-2">AI analysis will extract metrics once processed.</p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })()}
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - AI Analysis */}
          <div className="space-y-6">
            {parsed && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-2xl">📊</span>
                    AI Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Summary Section */}
                  <div className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg border border-primary/20">
                    <h3 className="font-semibold mb-3 text-sm text-primary flex items-center gap-2">
                      <span className="text-lg">📝</span>
                      <span className="uppercase tracking-wider">Executive Summary</span>
                    </h3>
                    <p className="text-base leading-[1.75] text-foreground/90">
                      <TypewriterText
                        text={summaryText}
                        speed={20}
                        onComplete={() => setInsightsComplete(true)}
                        className="font-medium"
                      />
                    </p>
                  </div>

                  {/* Key Insights */}
                  {insightsComplete && parsed.key_insights && parsed.key_insights.length > 0 && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                      <h3 className="font-semibold mb-4 text-sm text-primary flex items-center gap-2">
                        <div className="p-1.5 bg-yellow-500/10 rounded">
                          <span className="text-base">💡</span>
                        </div>
                        <span className="uppercase tracking-wider">Key Insights</span>
                      </h3>
                      <ul className="space-y-3">
                        {parsed.key_insights.map((insight, idx) => (
                          <li key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-card/50 hover:bg-card transition-colors border border-border/50">
                            <span className="text-primary mt-1 text-lg">▸</span>
                            <span className="text-sm leading-relaxed flex-1">
                              <TypewriterText
                                text={insight}
                                speed={15}
                                delay={idx * 500}
                                onComplete={idx === (parsed.key_insights?.length || 0) - 1 ? () => setHighlightsComplete(true) : undefined}
                                className="text-foreground/85"
                              />
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Financial Highlights */}
                  {highlightsComplete && parsed.financial_highlights && parsed.financial_highlights.length > 0 && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 delay-100">
                      <h3 className="font-semibold mb-4 text-sm text-primary flex items-center gap-2">
                        <div className="p-1.5 bg-green-500/10 rounded">
                          <span className="text-base">📈</span>
                        </div>
                        <span className="uppercase tracking-wider">Financial Highlights</span>
                      </h3>
                      <ul className="space-y-3">
                        {parsed.financial_highlights.map((highlight, idx) => (
                          <li key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-gradient-to-r from-green-500/5 to-green-500/10 border border-green-500/20">
                            <span className="text-green-600 dark:text-green-400 mt-1 text-lg">▸</span>
                            <span className="text-sm leading-relaxed flex-1">
                              <TypewriterText
                                text={highlight}
                                speed={15}
                                delay={idx * 500}
                                className="text-foreground/85 font-medium"
                              />
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Risk Factors - if available */}
                  {highlightsComplete && parsed.risk_factors && parsed.risk_factors.length > 0 && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 delay-200">
                      <h3 className="font-semibold mb-4 text-sm text-primary flex items-center gap-2">
                        <div className="p-1.5 bg-red-500/10 rounded">
                          <span className="text-base">⚠️</span>
                        </div>
                        <span className="uppercase tracking-wider">Risk Factors</span>
                      </h3>
                      <ul className="space-y-3">
                        {parsed.risk_factors.map((risk, idx) => (
                          <li key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-gradient-to-r from-red-500/5 to-red-500/10 border border-red-500/20">
                            <span className="text-red-600 dark:text-red-400 mt-1 text-lg">▸</span>
                            <span className="text-sm leading-relaxed flex-1">
                              <TypewriterText
                                text={risk}
                                speed={15}
                                delay={idx * 500}
                                className="text-foreground/85"
                              />
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Show placeholder if no AI summary yet */}
            {!parsed && (
              <Card className="border-dashed">
                <CardContent className="py-12">
                  <div className="text-center space-y-3">
                    <div className="text-4xl">🤖</div>
                    <h3 className="font-semibold">AI Analysis Pending</h3>
                    <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                      AI analysis will appear here automatically once processed by our system.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
