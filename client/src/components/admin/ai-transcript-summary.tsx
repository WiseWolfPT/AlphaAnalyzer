/**
 * AI Transcript Summary Component - Phase 3 Implementation
 * 
 * Component for generating and managing AI-powered transcript summaries
 */

import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Bot, 
  Wand2, 
  AlertCircle, 
  CheckCircle, 
  Loader2,
  TrendingUp,
  DollarSign,
  Clock,
  Eye,
  Zap,
  Brain,
  Activity
} from 'lucide-react';

interface TranscriptSummaryResult {
  summary: string;
  keyInsights: string[];
  financialHighlights: string[];
  riskFactors: string[];
  model: string;
  tokensUsed: {
    input: number;
    output: number;
    total: number;
  };
  estimatedCostUSD: number;
  confidenceScore: number;
}

export function AITranscriptSummary() {
  const [selectedTranscriptId, setSelectedTranscriptId] = useState<string>('');
  const [priority, setPriority] = useState<'high' | 'normal' | 'low'>('normal');
  const [maxTokens, setMaxTokens] = useState<number>(1000);
  const [summaryResult, setSummaryResult] = useState<TranscriptSummaryResult | null>(null);

  // Query for pending transcripts that need summaries
  const { data: pendingTranscripts, isLoading: transcriptsLoading } = useQuery({
    queryKey: ['admin', 'transcripts', 'pending'],
    queryFn: async () => {
      const response = await fetch('/api/admin/transcripts/pending');
      if (!response.ok) throw new Error('Failed to fetch transcripts');
      return response.json();
    }
  });

  // Query to test AI service connection
  const { data: connectionStatus, isLoading: connectionLoading } = useQuery({
    queryKey: ['admin', 'ai-summary', 'connection'],
    queryFn: async () => {
      const response = await fetch('/api/admin/ai-summary/test-connection');
      if (!response.ok) throw new Error('Failed to test connection');
      return response.json();
    },
    refetchInterval: 30000 // Test every 30 seconds
  });

  // Mutation for generating AI summary
  const generateSummaryMutation = useMutation({
    mutationFn: async (data: {
      transcriptId: number;
      priority: 'high' | 'normal' | 'low';
      maxTokens: number;
    }) => {
      const response = await fetch('/api/admin/ai-summary/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || 'Failed to generate summary');
      }
      
      return response.json();
    },
    onSuccess: (result) => {
      setSummaryResult(result.data.summary);
    }
  });

  // Mutation for quick preview
  const quickPreviewMutation = useMutation({
    mutationFn: async (transcript: string) => {
      const response = await fetch('/api/admin/ai-summary/quick-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, maxLength: 300 })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || 'Failed to generate preview');
      }
      
      return response.json();
    }
  });

  const handleGenerateSummary = async () => {
    if (!selectedTranscriptId) return;
    
    try {
      await generateSummaryMutation.mutateAsync({
        transcriptId: parseInt(selectedTranscriptId),
        priority,
        maxTokens
      });
    } catch (error) {
      console.error('Error generating summary:', error);
    }
  };

  const getModelIcon = (model: string) => {
    if (model.includes('opus')) return <Brain className="h-4 w-4" />;
    if (model.includes('sonnet')) return <Zap className="h-4 w-4" />;
    if (model.includes('haiku')) return <Activity className="h-4 w-4" />;
    return <Bot className="h-4 w-4" />;
  };

  const getModelName = (model: string) => {
    if (model.includes('opus')) return 'Claude 3 Opus (Premium)';
    if (model.includes('sonnet')) return 'Claude 3 Sonnet (Balanced)';
    if (model.includes('haiku')) return 'Claude 3 Haiku (Fast)';
    return model;
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Service Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Status do Serviço</CardTitle>
          </CardHeader>
          <CardContent>
            {connectionLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Verificando conexão...</span>
              </div>
            ) : connectionStatus?.data?.connected ? (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-700">Anthropic Claude Online</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-700">Serviço Indisponível</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Transcrições Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="text-sm">
                {transcriptsLoading ? 'Carregando...' : `${pendingTranscripts?.data?.length || 0} aguardando resumo`}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Generation Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            Gerar Resumo com IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Transcrição</Label>
              <Select value={selectedTranscriptId} onValueChange={setSelectedTranscriptId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar transcrição" />
                </SelectTrigger>
                <SelectContent>
                  {pendingTranscripts?.data?.map((transcript: any) => (
                    <SelectItem key={transcript.id} value={transcript.id.toString()}>
                      {transcript.ticker} - {transcript.quarter} {transcript.year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa (Haiku - Rápido)</SelectItem>
                  <SelectItem value="normal">Normal (Sonnet - Balanceado)</SelectItem>
                  <SelectItem value="high">Alta (Opus - Premium)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Máximo de Tokens</Label>
              <Input
                type="number"
                min={100}
                max={2000}
                step={100}
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value))}
              />
            </div>
          </div>

          <div className="mt-4">
            <Button
              onClick={handleGenerateSummary}
              disabled={!selectedTranscriptId || generateSummaryMutation.isPending || !connectionStatus?.data?.connected}
              className="w-full md:w-auto"
            >
              {generateSummaryMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Gerando Resumo...
                </>
              ) : (
                <>
                  <Bot className="h-4 w-4 mr-2" />
                  Gerar Resumo com IA
                </>
              )}
            </Button>
          </div>

          {generateSummaryMutation.error && (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Erro ao gerar resumo: {generateSummaryMutation.error.message}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Results Display */}
      {summaryResult && (
        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  {getModelIcon(summaryResult.model)}
                  <div>
                    <div className="text-sm font-medium">Modelo</div>
                    <div className="text-xs text-muted-foreground">
                      {getModelName(summaryResult.model)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <div>
                    <div className="text-sm font-medium">Custo</div>
                    <div className="text-xs text-muted-foreground">
                      ${summaryResult.estimatedCostUSD.toFixed(4)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-blue-600" />
                  <div>
                    <div className="text-sm font-medium">Tokens</div>
                    <div className="text-xs text-muted-foreground">
                      {summaryResult.tokensUsed.total.toLocaleString()}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className={`h-4 w-4 ${getConfidenceColor(summaryResult.confidenceScore)}`} />
                  <div>
                    <div className="text-sm font-medium">Confiança</div>
                    <div className="text-xs text-muted-foreground">
                      {(summaryResult.confidenceScore * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Summary Content */}
          <Card>
            <CardHeader>
              <CardTitle>Resumo Gerado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Resumo Executivo</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {summaryResult.summary}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Insights Principais
                  </h4>
                  <div className="space-y-1">
                    {summaryResult.keyInsights.map((insight, index) => (
                      <Badge key={index} variant="secondary" className="text-xs block mb-1">
                        {insight}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Highlights Financeiros
                  </h4>
                  <div className="space-y-1">
                    {summaryResult.financialHighlights.map((highlight, index) => (
                      <Badge key={index} variant="outline" className="text-xs block mb-1">
                        {highlight}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Fatores de Risco
                  </h4>
                  <div className="space-y-1">
                    {summaryResult.riskFactors.map((risk, index) => (
                      <Badge key={index} variant="destructive" className="text-xs block mb-1">
                        {risk}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Usage Info */}
      <Alert>
        <Bot className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <p className="font-medium">Como Funciona</p>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Selecione uma transcrição pendente da lista</li>
              <li>Escolha a prioridade (afeta o modelo IA usado)</li>
              <li>Configure o limite de tokens para o resumo</li>
              <li>Clique em "Gerar Resumo" para processar com IA</li>
              <li>Revise o resumo gerado antes de publicar</li>
            </ol>
            <p className="text-xs text-muted-foreground mt-2">
              Powered by Anthropic Claude 3 • Custos calculados automaticamente
            </p>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}