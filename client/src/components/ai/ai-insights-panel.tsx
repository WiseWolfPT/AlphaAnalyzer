/**
 * AI Insights Panel Component
 * Displays AI-powered analysis of earnings transcripts
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, 
  TrendingUp, 
  BarChart3, 
  Lightbulb, 
  Copy, 
  RefreshCw, 
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  Zap
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export interface AIAnalysis {
  id: string;
  analysisType: 'summary' | 'sentiment' | 'metrics' | 'insights';
  content: any;
  model: 'gpt-4o-mini' | 'gpt-3.5-turbo';
  confidenceScore: number;
  tokensUsed: number;
  costUSD: number;
  createdAt: Date;
}

export interface TranscriptAnalyses {
  transcriptId: string;
  analyses: AIAnalysis[];
}

interface AIInsightsPanelProps {
  transcriptId: string;
  analyses: AIAnalysis[];
  onRegenerateAnalysis?: (types: string[]) => void;
  onGenerateAnalysis?: (types: string[]) => void;
  isLoading?: boolean;
  className?: string;
}

const analysisTypeConfig = {
  summary: {
    icon: Brain,
    label: 'Summary',
    description: 'Key highlights and takeaways',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
  },
  sentiment: {
    icon: TrendingUp,
    label: 'Sentiment',
    description: 'Market sentiment analysis',
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
  },
  metrics: {
    icon: BarChart3,
    label: 'Metrics',
    description: 'Financial metrics extraction',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
  },
  insights: {
    icon: Lightbulb,
    label: 'Insights',
    description: 'Strategic insights and implications',
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
  }
};

export function AIInsightsPanel({
  transcriptId,
  analyses,
  onRegenerateAnalysis,
  onGenerateAnalysis,
  isLoading = false,
  className
}: AIInsightsPanelProps) {
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Group analyses by type
  const analysesByType = analyses.reduce((acc, analysis) => {
    acc[analysis.analysisType] = analysis;
    return acc;
  }, {} as Record<string, AIAnalysis>);

  // Get available analysis types
  const availableTypes = Object.keys(analysesByType);
  const missingTypes = Object.keys(analysisTypeConfig).filter(type => !availableTypes.includes(type));

  const handleCopyContent = async (analysis: AIAnalysis) => {
    try {
      let contentToCopy = '';
      
      if (analysis.analysisType === 'metrics' && typeof analysis.content === 'object') {
        contentToCopy = JSON.stringify(analysis.content, null, 2);
      } else if (analysis.content.text) {
        contentToCopy = analysis.content.text;
      } else {
        contentToCopy = JSON.stringify(analysis.content, null, 2);
      }

      await navigator.clipboard.writeText(contentToCopy);
      setCopiedId(analysis.id);
      
      toast({
        title: "Copied to clipboard",
        description: "Analysis content has been copied.",
      });

      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Failed to copy content to clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleGenerateMissing = () => {
    if (onGenerateAnalysis && missingTypes.length > 0) {
      onGenerateAnalysis(missingTypes);
    }
  };

  const handleRegenerateAll = () => {
    if (onRegenerateAnalysis) {
      onRegenerateAnalysis(Object.keys(analysisTypeConfig));
    }
  };

  const formatCost = (cost: number) => {
    return cost < 0.01 ? '<$0.01' : `$${cost.toFixed(3)}`;
  };

  const getModelBadgeColor = (model: string) => {
    return model === 'gpt-4o-mini' 
      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  };

  const renderAnalysisContent = (analysis: AIAnalysis) => {
    const { content, analysisType } = analysis;

    if (analysisType === 'metrics' && typeof content === 'object' && content !== null) {
      return (
        <div className="space-y-4">
          {content.revenue && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground">Revenue</div>
                <div className="font-semibold">${content.revenue.current}M</div>
                <div className="text-xs text-green-600">+{content.revenue.yoy_growth}% YoY</div>
              </div>
              {content.earnings && (
                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground">EPS</div>
                  <div className="font-semibold">${content.earnings.eps}</div>
                  <div className="text-xs text-green-600">+{content.earnings.yoy_growth}% YoY</div>
                </div>
              )}
              {content.margins && (
                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground">Operating Margin</div>
                  <div className="font-semibold">{content.margins.operating}%</div>
                </div>
              )}
            </div>
          )}
          
          {content.key_metrics && Array.isArray(content.key_metrics) && (
            <div>
              <h4 className="font-medium mb-2">Key Metrics</h4>
              <div className="space-y-2">
                {content.key_metrics.map((metric: any, index: number) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>{metric.name}</span>
                    <span className="font-medium">{metric.value} {metric.change && <span className="text-green-600">({metric.change})</span>}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {content.guidance && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-yellow-600" />
                <span className="font-medium text-yellow-800 dark:text-yellow-200">Guidance Update</span>
              </div>
              <div className="text-sm text-yellow-700 dark:text-yellow-300">
                {content.guidance.direction === 'raised' && '📈 Raised'} 
                {content.guidance.direction === 'lowered' && '📉 Lowered'}
                {content.guidance.direction === 'maintained' && '➡️ Maintained'}
                : {content.guidance.details}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (analysisType === 'sentiment' && typeof content === 'object' && content.text) {
      // Try to extract sentiment score from text if available
      const sentimentMatch = content.text.match(/sentiment score.*?(\d+)/i);
      const sentimentScore = sentimentMatch ? parseInt(sentimentMatch[1]) : null;
      
      return (
        <div className="space-y-4">
          {sentimentScore && (
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">Sentiment Score</div>
              <div className="flex items-center gap-2 flex-1">
                <Progress value={sentimentScore * 10} className="flex-1" />
                <span className="font-semibold">{sentimentScore}/10</span>
              </div>
            </div>
          )}
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {content.text.split('\n').map((line: string, index: number) => (
              <p key={index} className="mb-2">{line}</p>
            ))}
          </div>
        </div>
      );
    }

    // Default text rendering
    const textContent = content.text || (typeof content === 'string' ? content : JSON.stringify(content, null, 2));
    
    return (
      <div className="prose prose-sm dark:prose-invert max-w-none">
        {textContent.split('\n').map((line: string, index: number) => (
          <p key={index} className="mb-2">{line}</p>
        ))}
      </div>
    );
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI Insights
            </CardTitle>
            <CardDescription>
              AI-powered analysis of earnings transcript
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {missingTypes.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateMissing}
                disabled={isLoading}
              >
                <Zap className="h-4 w-4 mr-1" />
                Generate Missing
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegenerateAll}
              disabled={isLoading}
            >
              <RefreshCw className={cn("h-4 w-4 mr-1", { "animate-spin": isLoading })} />
              Regenerate All
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {analyses.length === 0 ? (
          <div className="text-center py-8">
            <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No AI Analysis Available</h3>
            <p className="text-muted-foreground mb-4">
              Generate AI-powered insights for this earnings transcript.
            </p>
            <Button onClick={handleGenerateMissing} disabled={isLoading}>
              <Brain className="h-4 w-4 mr-2" />
              Generate AI Analysis
            </Button>
          </div>
        ) : (
          <Tabs defaultValue={availableTypes[0]} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              {Object.entries(analysisTypeConfig).map(([type, config]) => {
                const Icon = config.icon;
                const hasAnalysis = availableTypes.includes(type);
                
                return (
                  <TabsTrigger
                    key={type}
                    value={type}
                    disabled={!hasAnalysis}
                    className="flex items-center gap-1"
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{config.label}</span>
                    {hasAnalysis ? (
                      <CheckCircle className="h-3 w-3 text-green-500" />
                    ) : (
                      <Clock className="h-3 w-3 text-muted-foreground" />
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {Object.entries(analysisTypeConfig).map(([type, config]) => {
              const analysis = analysesByType[type];
              
              if (!analysis) return null;

              return (
                <TabsContent key={type} value={type} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={config.color}>
                        {config.label}
                      </Badge>
                      <Badge variant="outline" className={getModelBadgeColor(analysis.model)}>
                        {analysis.model}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        {formatCost(analysis.costUSD)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Zap className="h-3 w-3" />
                        {analysis.tokensUsed.toLocaleString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <BarChart3 className="h-3 w-3" />
                        {Math.round(analysis.confidenceScore * 100)}%
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-4">
                    <Progress value={analysis.confidenceScore * 100} className="flex-1" />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyContent(analysis)}
                      className="shrink-0"
                    >
                      {copiedId === analysis.id ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-4">
                    {renderAnalysisContent(analysis)}
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Generated on {new Date(analysis.createdAt).toLocaleString()}
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}