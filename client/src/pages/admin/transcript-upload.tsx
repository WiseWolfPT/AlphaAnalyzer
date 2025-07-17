/**
 * Admin Transcript Upload Interface - Wave 3 Implementation
 * 
 * Upload form for US earnings call transcripts with workflow management
 * Supports: MarketBeat, Seeking Alpha sources, AI summary integration prep
 */

import React, { useState, useCallback } from 'react';
import { useLocation } from 'wouter';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Upload, 
  FileText, 
  Search, 
  Eye, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Save,
  Send,
  Trash2,
  RefreshCw,
  Bot,
  Globe
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AITranscriptSummary } from '@/components/admin/ai-transcript-summary';


// US S&P 500 companies for transcript upload (focused list)
const US_COMPANIES = [
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'MSFT', name: 'Microsoft Corporation' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.' },
  { symbol: 'TSLA', name: 'Tesla Inc.' },
  { symbol: 'META', name: 'Meta Platforms Inc.' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation' },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.' },
  { symbol: 'V', name: 'Visa Inc.' },
  { symbol: 'JNJ', name: 'Johnson & Johnson' },
  { symbol: 'WMT', name: 'Walmart Inc.' },
  { symbol: 'PG', name: 'Procter & Gamble Co.' },
  { symbol: 'UNH', name: 'UnitedHealth Group Inc.' },
  { symbol: 'DIS', name: 'The Walt Disney Company' },
  { symbol: 'MA', name: 'Mastercard Incorporated' },
  { symbol: 'HD', name: 'The Home Depot Inc.' },
  { symbol: 'BAC', name: 'Bank of America Corporation' },
  { symbol: 'XOM', name: 'Exxon Mobil Corporation' },
  { symbol: 'KO', name: 'The Coca-Cola Company' },
  { symbol: 'PFE', name: 'Pfizer Inc.' }
];

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i);

interface TranscriptFormData {
  ticker: string;
  company_name: string;
  quarter: string;
  year: number;
  call_date: string;
  raw_transcript: string;
  ai_summary: string;
  status: 'pending' | 'review' | 'published';
}

interface TranscriptPreview {
  wordCount: number;
  speakers: string[];
  sections: string[];
  estimatedReadTime: number;
}

export default function TranscriptUpload() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  // Form state
  const [formData, setFormData] = useState<TranscriptFormData>({
    ticker: '',
    company_name: '',
    quarter: 'Q1',
    year: CURRENT_YEAR,
    call_date: '',
    raw_transcript: '',
    ai_summary: '',
    status: 'pending'
  });
  
  const [activeTab, setActiveTab] = useState('upload');
  const [previewData, setPreviewData] = useState<TranscriptPreview | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Filtered companies based on search
  const filteredCompanies = US_COMPANIES.filter(company =>
    company.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    company.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Mutations for transcript operations
  const createTranscriptMutation = useMutation({
    mutationFn: async (data: Partial<TranscriptFormData>) => {
      const response = await fetch('/api/admin/transcripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error('Failed to create transcript');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'transcripts'] });
      setFormData({
        ticker: '',
        company_name: '',
        quarter: 'Q1',
        year: CURRENT_YEAR,
        call_date: '',
        raw_transcript: '',
        ai_summary: '',
        status: 'pending'
      });
    }
  });

  // Query for existing transcripts
  const { data: existingTranscripts, isLoading: transcriptsLoading } = useQuery({
    queryKey: ['admin', 'transcripts', 'pending'],
    queryFn: async () => {
      const response = await fetch('/api/admin/transcripts/pending');
      if (!response.ok) throw new Error('Failed to fetch transcripts');
      return response.json();
    }
  });

  // Form handlers
  const handleCompanySelect = useCallback((symbol: string) => {
    const company = US_COMPANIES.find(c => c.symbol === symbol);
    if (company) {
      setFormData(prev => ({
        ...prev,
        ticker: company.symbol,
        company_name: company.name
      }));
    }
  }, []);

  const handleTranscriptChange = useCallback((transcript: string) => {
    setFormData(prev => ({ ...prev, raw_transcript: transcript }));
    
    // Generate preview data
    if (transcript.trim()) {
      const words = transcript.trim().split(/\\s+/).length;
      const lines = transcript.split('\\n');
      const speakers = [...new Set(
        lines
          .filter(line => line.includes(':'))
          .map(line => line.split(':')[0].trim())
          .filter(speaker => speaker.length > 0 && speaker.length < 50)
      )].slice(0, 10);
      
      const sections = lines
        .filter(line => line.trim().startsWith('[') || line.trim().toLowerCase().includes('presentation'))
        .slice(0, 5);
      
      setPreviewData({
        wordCount: words,
        speakers,
        sections,
        estimatedReadTime: Math.ceil(words / 200) // 200 words per minute
      });
    } else {
      setPreviewData(null);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.ticker || !formData.raw_transcript) {
      return;
    }
    
    try {
      await createTranscriptMutation.mutateAsync(formData);
      setActiveTab('library'); // Switch to library view
    } catch (error) {
      console.error('Error creating transcript:', error);
    }
  };

  const handleSaveDraft = async () => {
    if (!formData.ticker) return;
    
    try {
      await createTranscriptMutation.mutateAsync({
        ...formData,
        status: 'pending'
      });
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Upload de Transcrições</h1>
              <p className="text-muted-foreground">Sistema de gestão para earnings calls americanas</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              <Globe className="h-3 w-3 mr-1" />
              Foco: Mercados USA 🇺🇸
            </Badge>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              S&P 500 Companies
            </Badge>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload">
              <Upload className="h-4 w-4 mr-2" />
              Upload Nova
            </TabsTrigger>
            <TabsTrigger value="library">
              <FileText className="h-4 w-4 mr-2" />
              Biblioteca
            </TabsTrigger>
            <TabsTrigger value="ai-summary">
              <Bot className="h-4 w-4 mr-2" />
              AI Summary
            </TabsTrigger>
          </TabsList>

          {/* Upload Tab */}
          <TabsContent value="upload" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Upload Form */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Nova Transcrição de Earnings Call</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                      {/* Company Selection */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="company-search">Empresa (S&P 500)</Label>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="company-search"
                              placeholder="Pesquisar AAPL, Microsoft..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="pl-10"
                            />
                          </div>
                          {searchQuery && (
                            <div className="max-h-40 overflow-y-auto border rounded-md bg-popover">
                              {filteredCompanies.slice(0, 10).map((company) => (
                                <button
                                  key={company.symbol}
                                  type="button"
                                  className="w-full px-3 py-2 text-left hover:bg-muted flex items-center justify-between"
                                  onClick={() => {
                                    handleCompanySelect(company.symbol);
                                    setSearchQuery('');
                                  }}
                                >
                                  <span>
                                    <strong>{company.symbol}</strong> - {company.name}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Empresa Selecionada</Label>
                          <div className="p-3 bg-muted rounded-md">
                            {formData.ticker ? (
                              <div>
                                <div className="font-medium">{formData.ticker}</div>
                                <div className="text-sm text-muted-foreground">{formData.company_name}</div>
                              </div>
                            ) : (
                              <div className="text-muted-foreground">Nenhuma empresa selecionada</div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Quarter and Year */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="quarter">Trimestre</Label>
                          <Select value={formData.quarter} onValueChange={(value) => setFormData(prev => ({ ...prev, quarter: value }))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {QUARTERS.map(quarter => (
                                <SelectItem key={quarter} value={quarter}>{quarter}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="year">Ano</Label>
                          <Select value={formData.year.toString()} onValueChange={(value) => setFormData(prev => ({ ...prev, year: parseInt(value) }))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {YEARS.map(year => (
                                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="call-date">Data da Call</Label>
                          <Input
                            id="call-date"
                            type="date"
                            value={formData.call_date}
                            onChange={(e) => setFormData(prev => ({ ...prev, call_date: e.target.value }))}
                          />
                        </div>
                      </div>

                      {/* Transcript Content */}
                      <div className="space-y-2">
                        <Label htmlFor="transcript">Transcrição Completa</Label>
                        <Textarea
                          id="transcript"
                          placeholder="Cole aqui a transcrição da earnings call do MarketBeat, Seeking Alpha ou outras fontes..."
                          value={formData.raw_transcript}
                          onChange={(e) => handleTranscriptChange(e.target.value)}
                          className="min-h-[300px] font-mono text-sm"
                        />
                        <div className="text-xs text-muted-foreground">
                          Suporte para transcrições de: MarketBeat, Seeking Alpha, Motley Fool
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <Button
                          type="submit"
                          disabled={!formData.ticker || !formData.raw_transcript || createTranscriptMutation.isPending}
                        >
                          {createTranscriptMutation.isPending ? (
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4 mr-2" />
                          )}
                          Enviar para Revisão
                        </Button>
                        
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleSaveDraft}
                          disabled={!formData.ticker || createTranscriptMutation.isPending}
                        >
                          <Save className="h-4 w-4 mr-2" />
                          Salvar Rascunho
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </div>

              {/* Preview Panel */}
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="h-5 w-5" />
                      Preview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {previewData ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="font-medium">Palavras</div>
                            <div className="text-2xl font-bold text-primary">
                              {previewData.wordCount.toLocaleString()}
                            </div>
                          </div>
                          <div>
                            <div className="font-medium">Tempo Leitura</div>
                            <div className="text-2xl font-bold text-primary">
                              {previewData.estimatedReadTime}min
                            </div>
                          </div>
                        </div>
                        
                        {previewData.speakers.length > 0 && (
                          <div>
                            <div className="font-medium mb-2">Speakers Detectados</div>
                            <div className="flex flex-wrap gap-1">
                              {previewData.speakers.map((speaker, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {speaker}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {previewData.sections.length > 0 && (
                          <div>
                            <div className="font-medium mb-2">Seções</div>
                            <div className="space-y-1">
                              {previewData.sections.map((section, index) => (
                                <div key={index} className="text-xs text-muted-foreground truncate">
                                  {section}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground py-8">
                        <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <div>Cole uma transcrição para ver o preview</div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Library Tab */}
          <TabsContent value="library" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Transcrições Pendentes</CardTitle>
              </CardHeader>
              <CardContent>
                {transcriptsLoading ? (
                  <div className="text-center py-8">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
                    <div>Carregando transcrições...</div>
                  </div>
                ) : existingTranscripts?.data?.length > 0 ? (
                  <div className="space-y-4">
                    {existingTranscripts.data.map((transcript: any) => (
                      <div key={transcript.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <div className="font-medium">
                            {transcript.ticker} - {transcript.quarter} {transcript.year}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {transcript.company_name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Criado em {new Date(transcript.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' })}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            transcript.status === 'pending' ? 'secondary' :
                            transcript.status === 'review' ? 'default' :
                            'outline'
                          }>
                            {transcript.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                            {transcript.status === 'review' && <AlertCircle className="h-3 w-3 mr-1" />}
                            {transcript.status === 'published' && <CheckCircle className="h-3 w-3 mr-1" />}
                            {transcript.status}
                          </Badge>
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4 mr-1" />
                            Ver
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <div>Nenhuma transcrição pendente</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Summary Tab */}
          <TabsContent value="ai-summary" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  Geração de Resumo com IA (Anthropic Claude)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AITranscriptSummary />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}