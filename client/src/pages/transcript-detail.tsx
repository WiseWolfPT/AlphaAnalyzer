/**
 * Transcript Detail Page
 * Shows individual earnings transcript with AI insights integration
 */

import React, { useState } from 'react';
import { useParams, useLocation } from 'wouter';
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
  Building, 
  TrendingUp, 
  Clock, 
  Star,
  ExternalLink,
  Brain,
  Download,
  Share,
  Bookmark
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

// Mock transcript data - in real app, this would come from API
const mockTranscriptData = {
  '1': {
    id: '1',
    symbol: 'AAPL',
    companyName: 'Apple Inc.',
    quarter: 'Q1',
    year: 2025,
    callDate: '2025-01-25',
    title: 'Q1 2025 Earnings Call',
    summary: 'Apple reported strong iPhone sales and growth in services revenue. The company highlighted progress in AI integration and sustainable product initiatives.',
    keyHighlights: [
      'iPhone revenue up 5% year-over-year',
      'Services revenue reached record high',
      'Strong growth in emerging markets',
      'AI features driving user engagement'
    ],
    sentiment: 'positive' as const,
    published: true,
    duration: '45 min',
    rating: 4.8,
    content: `CEO: Thank you for joining us today for Apple's Q1 2025 earnings call. I'm pleased to report another strong quarter for Apple, with record revenue of $123.9 billion, up 5% year over year.

Our iPhone business continues to be the foundation of our growth, with revenue of $69.7 billion, representing a 5% increase compared to the same quarter last year. We're particularly excited about the adoption of our AI-powered features, which are driving increased user engagement and satisfaction.

Services revenue reached a new all-time high of $23.1 billion, up 11% year over year. This growth was driven by strong performance across all our services categories, including the App Store, iCloud, Apple Music, and our growing advertising business.

CFO: From a financial perspective, our gross margin expanded to 46.2%, reflecting our continued focus on operational excellence and the strong performance of our higher-margin services business.

Looking ahead, we remain optimistic about our growth prospects. We're continuing to invest heavily in AI and machine learning capabilities, which we believe will drive the next wave of innovation across our product portfolio.

We're also making significant progress on our environmental goals, with our supply chain becoming increasingly carbon neutral. This commitment to sustainability is not just the right thing to do – it's also driving operational efficiencies and cost savings.

Q: Can you provide more details on the AI initiatives and their impact on user engagement?

CEO: Absolutely. Our AI features, particularly in iOS 18 and the latest MacOS, have seen remarkable adoption rates. Over 80% of our active users have engaged with at least one AI-powered feature in the past quarter. These features are not only enhancing user experience but also driving increased time spent in our ecosystem.

The AI capabilities are integrated across our services – from improved Siri functionality to smart photo organization and predictive text. We're seeing a 15% increase in user engagement metrics across our platform, which directly translates to higher services revenue.

Q: What's your outlook for the China market?

CEO: China remains a critical market for us. While we faced some headwinds earlier in the year, we're seeing positive momentum returning. Our local partnerships and continued investment in the region are paying off, with iPhone sales showing sequential improvement.

We're particularly excited about the reception of our AI features in China, where we've worked closely with local partners to ensure our services meet the unique needs of Chinese consumers.

The call concluded with strong guidance for Q2 2025, projecting continued growth across all major product categories and services.`,
    participants: [
      { name: 'Tim Cook', role: 'CEO' },
      { name: 'Luca Maestri', role: 'CFO' },
      { name: 'Tejas Gala', role: 'Director of Investor Relations' }
    ],
    metrics: {
      revenue: '$123.9B',
      revenueGrowth: '+5%',
      eps: '$2.18',
      epsGrowth: '+8%',
      grossMargin: '46.2%',
      guidance: 'Q2 2025: $130-135B revenue'
    }
  }
};

export default function TranscriptDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isFavorite, setIsFavorite] = useState(false);

  const transcriptId = params.id || '1';
  const transcript = mockTranscriptData[transcriptId as keyof typeof mockTranscriptData];

  // Fetch AI analyses for this transcript
  const { data: analyses = [], isLoading: analysesLoading } = useTranscriptAnalyses(transcriptId);
  const analyzeTranscriptMutation = useAnalyzeTranscript();

  if (!transcript) {
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
    setLocation(`/stock/${transcript.symbol}/charts`);
  };

  const handleDownload = () => {
    // Create a downloadable transcript file
    const content = `${transcript.title}\n${transcript.companyName} (${transcript.symbol})\n${transcript.quarter} ${transcript.year}\nDate: ${transcript.callDate}\n\n${transcript.content}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${transcript.symbol}_${transcript.quarter}_${transcript.year}_transcript.txt`;
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
                  <span className="text-lg font-bold text-primary">{transcript.symbol.charAt(0)}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold">{transcript.symbol}</h1>
                    <Badge variant="outline">{transcript.quarter} {transcript.year}</Badge>
                    <Badge className={cn("text-xs", sentimentBg[transcript.sentiment])}>
                      <TrendingUp className="h-3 w-3 mr-1" />
                      {transcript.sentiment}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">{transcript.companyName}</p>
                </div>
              </div>
              
              <h2 className="text-xl font-semibold mb-4">{transcript.title}</h2>
              
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(transcript.callDate).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{transcript.duration}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-yellow-500 fill-current" />
                  <span>{transcript.rating}</span>
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
                      {transcript.content.split('\n\n').map((paragraph, index) => (
                        <p key={index} className="mb-4 leading-relaxed">
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
                    <p className="text-muted-foreground mb-4">{transcript.summary}</p>
                    
                    <div>
                      <h4 className="font-medium mb-3">Key Highlights</h4>
                      <ul className="space-y-2">
                        {transcript.keyHighlights.map((highlight, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></span>
                            <span className="text-sm">{highlight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="metrics" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Financial Metrics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {Object.entries(transcript.metrics).map(([key, value]) => (
                        <div key={key} className="p-3 bg-muted rounded-lg">
                          <div className="text-sm text-muted-foreground capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </div>
                          <div className="font-semibold">{value}</div>
                        </div>
                      ))}
                    </div>
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
            
            {/* Participants Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Call Participants
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {transcript.participants.map((participant, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{participant.name}</div>
                        <div className="text-sm text-muted-foreground">{participant.role}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}