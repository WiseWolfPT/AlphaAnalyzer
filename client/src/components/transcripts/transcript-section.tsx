/**
 * Transcript Section Component
 * Two-section layout with Latest (always visible) + Historical (collapsible)
 *
 * Design Pattern:
 * - Latest Transcript: Always expanded, shows AI summary and key insights
 * - Historical Transcripts: Collapsible accordion, prevents overwhelming users
 *
 * UX Principles:
 * - Progressive disclosure (historical data hidden by default)
 * - Mobile-first responsive design
 * - Accessibility (ARIA labels, keyboard navigation)
 * - Performance (lazy loading historical data)
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  FileText,
  Calendar,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Lightbulb,
  TrendingUp,
  ExternalLink
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Helper to get API URL
const getApiUrl = () => (import.meta && import.meta.env && import.meta.env.DEV ? 'http://localhost:3001' : '');

type Transcript = {
  id: number;
  ticker: string;
  company_name: string;
  quarter: string;
  year: number;
  call_date: string | null;
  ai_summary: string | object | null;
  published_at?: string | null;
};

interface TranscriptSectionProps {
  symbol: string;
}

// Fetch functions
async function fetchLatestTranscript(symbol: string): Promise<Transcript | null> {
  const response = await fetch(`${getApiUrl()}/api/transcripts/symbol/${symbol}`);
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error('Failed to fetch latest transcript');
  }
  const json = await response.json();
  return json.data;
}

async function fetchTranscriptHistory(symbol: string): Promise<Transcript[]> {
  const response = await fetch(`${getApiUrl()}/api/transcripts/symbol/${symbol}?history=true`);
  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error('Failed to fetch transcript history');
  }
  const json = await response.json();
  return json.data || [];
}

// Enhanced type for parsed summary
type ParsedSummary = {
  summary?: string;
  keyInsights?: string[];
  key_insights?: string[];
  financial_highlights?: string[];
  financialHighlights?: string[];
  risk_factors?: string[];
};

// Utility to parse AI summary with robust handling
function parseAISummary(aiSummary: string | object | null): ParsedSummary {
  if (!aiSummary) return { summary: undefined, keyInsights: [] };

  try {
    let parsed: any;

    // Handle object input (already parsed from API)
    if (typeof aiSummary === 'object') {
      parsed = aiSummary;
    } else if (typeof aiSummary === 'string') {
      // Handle string input (needs JSON parsing)
      parsed = JSON.parse(aiSummary);
    } else {
      return { summary: undefined, keyInsights: [] };
    }

    // Helper to safely extract string arrays
    const safeStringArray = (arr: any): string[] => {
      if (!Array.isArray(arr)) return [];
      return arr.filter(item => typeof item === 'string' && item.trim().length > 0);
    };

    // Helper to safely extract string
    const safeString = (value: any): string | undefined => {
      if (typeof value === 'string') return value;
      if (value === null || value === undefined) return undefined;
      return String(value);
    };

    // Handle OpenAI structure: { model: "openai", summary: "text" }
    if (parsed?.model === 'openai' && parsed?.summary) {
      const summaryText = typeof parsed.summary === 'string' ? parsed.summary : String(parsed.summary);

      return {
        summary: summaryText,
        keyInsights: safeStringArray(parsed.key_insights || parsed.keyInsights || []),
        financial_highlights: safeStringArray(parsed.financial_highlights || parsed.financialHighlights || []),
        risk_factors: safeStringArray(parsed.risk_factors || [])
      };
    }

    // Handle general case with summary field
    if (parsed?.summary) {
      return {
        summary: safeString(parsed.summary),
        keyInsights: safeStringArray(parsed.key_insights || parsed.keyInsights || []),
        financial_highlights: safeStringArray(parsed.financial_highlights || parsed.financialHighlights || []),
        risk_factors: safeStringArray(parsed.risk_factors || [])
      };
    }

    // Legacy fallback
    return {
      summary: safeString(parsed.outlook || parsed.text || parsed),
      keyInsights: safeStringArray(parsed.key_insights || parsed.keyInsights || parsed.risks || []),
      financial_highlights: safeStringArray(parsed.financial_highlights || parsed.financialHighlights || []),
      risk_factors: safeStringArray(parsed.risk_factors || parsed.risks || [])
    };
  } catch (error) {
    console.error('Error parsing AI summary:', error);
    return {
      summary: typeof aiSummary === 'string' ? aiSummary : 'Summary not available.',
      keyInsights: []
    };
  }
}

// Format date for Portuguese locale
function formatDate(dateString: string | null): string {
  if (!dateString) return 'Date not available';

  try {
    return new Date(dateString).toLocaleDateString('pt-PT', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    return 'Date not available';
  }
}

export function TranscriptSection({ symbol }: TranscriptSectionProps) {
  const [, setLocation] = useLocation();
  const [showHistory, setShowHistory] = useState(false);

  // Fetch latest transcript
  const {
    data: latest,
    isLoading: isLoadingLatest,
    error: latestError
  } = useQuery({
    queryKey: ['transcript-latest', symbol],
    queryFn: () => fetchLatestTranscript(symbol),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch historical transcripts (only when toggled)
  const {
    data: history = [],
    isLoading: isLoadingHistory
  } = useQuery({
    queryKey: ['transcript-history', symbol],
    queryFn: () => fetchTranscriptHistory(symbol),
    enabled: showHistory,
    staleTime: 5 * 60 * 1000,
  });

  // Parse latest AI summary
  const latestParsed = latest ? parseAISummary(latest.ai_summary) : null;
  const keyInsights = latestParsed?.keyInsights || latestParsed?.key_insights || [];

  // Handle toggle with keyboard accessibility
  const handleToggle = () => {
    setShowHistory(!showHistory);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggle();
    }
  };

  return (
    <div className="space-y-4" role="region" aria-label="Earnings Transcripts">
      {/* Latest Transcript - Always Visible */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Badge variant="default" className="bg-teya-green text-teya-black">
                  Latest
                </Badge>
                <span className="text-lg">Earnings Transcript</span>
              </CardTitle>
              {latest && (
                <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>Q{latest.quarter} {latest.year}</span>
                  </div>
                  <span className="text-muted-foreground/50">•</span>
                  <span>{formatDate(latest.call_date)}</span>
                </div>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {isLoadingLatest ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-20 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
              <Skeleton className="h-10 w-48" />
            </div>
          ) : latestError || !latest ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Transcripts Available</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Earnings call transcripts will appear here once they become available for this company.
              </p>
            </div>
          ) : (
            <>
              {/* AI Summary Section */}
              {latestParsed?.summary && (
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2 text-base">
                    <Sparkles className="w-5 h-5 text-teya-green" />
                    AI Summary
                  </h4>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {latestParsed.summary}
                  </p>
                </div>
              )}

              {/* Key Insights Section */}
              {keyInsights.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2 text-base">
                    <Lightbulb className="w-5 h-5 text-amber-500" />
                    Key Insights
                  </h4>
                  <ul className="space-y-2">
                    {keyInsights.map((insight, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-teya-green mt-0.5">•</span>
                        <span className="flex-1 leading-relaxed text-muted-foreground">{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Read Full Transcript Button */}
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => setLocation(`/transcript/${latest.id}`)}
              >
                <FileText className="w-4 h-4" />
                Read Full Transcript
                <ExternalLink className="w-3 h-3" />
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Historical Transcripts - Collapsible */}
      {!latestError && latest && (
        <Card>
          <CardHeader className="pb-4">
            <button
              onClick={handleToggle}
              onKeyDown={handleKeyDown}
              className={cn(
                "w-full flex items-center justify-between text-left",
                "hover:opacity-80 transition-opacity",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md",
                "min-h-[44px]" // Minimum touch target for mobile (accessibility)
              )}
              aria-expanded={showHistory}
              aria-controls="historical-transcripts"
              type="button"
            >
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="w-5 h-5 text-muted-foreground" />
                Historical Transcripts
              </CardTitle>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground font-normal">
                  {history.length > 0 ? `${history.length} available` : '—'}
                </span>
                {showHistory ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
            </button>
          </CardHeader>

          {/* Expandable Historical Content */}
          {showHistory && (
            <CardContent id="historical-transcripts" className="pt-0">
              {isLoadingHistory ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No historical transcripts available
                </div>
              ) : (
                <Accordion type="single" collapsible className="w-full">
                  {history.map((transcript) => {
                    const historicalSummary = parseAISummary(transcript.ai_summary);

                    return (
                      <AccordionItem key={transcript.id} value={String(transcript.id)}>
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex flex-col items-start text-left gap-1 pr-4">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="font-normal">
                                Q{transcript.quarter} {transcript.year}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {formatDate(transcript.call_date)}
                              </span>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-3 pt-2">
                            {historicalSummary?.summary && (
                              <p className="text-sm leading-relaxed text-muted-foreground line-clamp-3">
                                {historicalSummary.summary}
                              </p>
                            )}
                            <Button
                              variant="link"
                              className="p-0 h-auto text-teya-green hover:text-teya-green/80"
                              onClick={() => setLocation(`/transcript/${transcript.id}`)}
                            >
                              Read more
                              <ExternalLink className="w-3 h-3" />
                            </Button>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              )}
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
