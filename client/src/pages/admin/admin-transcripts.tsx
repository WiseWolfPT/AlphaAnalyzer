import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TokenCounter } from '@/components/ui/token-counter';
import { useTokenCounter } from '@/hooks/use-token-counter';
import { AlertCircle, FileText, Sparkles, Upload } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import axios from 'axios';

export default function AdminTranscripts() {
  const [transcript, setTranscript] = useState('');
  const [ticker, setTicker] = useState('');
  const [quarter, setQuarter] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [summary, setSummary] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { countTokens } = useTokenCounter();

  const handleGenerateSummary = async () => {
    if (!transcript || !ticker || !quarter || !year) {
      setError('Please fill in all required fields');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const tokenResult = await countTokens(transcript);
      if (tokenResult && tokenResult.tokens > 150000) {
        setError('Transcript is too long. Maximum 150,000 tokens allowed.');
        return;
      }

      const response = await axios.post('/api/ai/generate-transcript-summary', {
        transcript,
        ticker: ticker.toUpperCase(),
        quarter,
        year: parseInt(year),
      });

      setSummary(response.data.summary);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError('Failed to generate summary');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveTranscript = async () => {
    if (!transcript || !ticker || !quarter || !year || !summary) {
      setError('Please complete all fields and generate a summary');
      return;
    }

    try {
      await axios.post('/api/admin/transcripts', {
        ticker: ticker.toUpperCase(),
        quarter,
        year: parseInt(year),
        rawTranscript: transcript,
        aiSummary: summary,
      });

      setTranscript('');
      setTicker('');
      setQuarter('');
      setSummary('');
      setError(null);
      alert('Transcript saved successfully!');
    } catch (err) {
      setError('Failed to save transcript');
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Transcript Management</h1>
        <p className="text-muted-foreground mt-2">
          Upload and manage earnings call transcripts with AI-powered summaries
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Upload New Transcript</CardTitle>
          <CardDescription>
            Paste the earnings call transcript and generate an AI summary
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="ticker">Stock Ticker</Label>
              <Input
                id="ticker"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                placeholder="AAPL"
                className="uppercase"
              />
            </div>
            <div>
              <Label htmlFor="quarter">Quarter</Label>
              <Input
                id="quarter"
                value={quarter}
                onChange={(e) => setQuarter(e.target.value)}
                placeholder="Q1"
              />
            </div>
            <div>
              <Label htmlFor="year">Year</Label>
              <Input
                id="year"
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="2024"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="transcript">Transcript</Label>
              <TokenCounter
                text={transcript}
                maxTokens={150000}
                className="text-xs"
              />
            </div>
            <Textarea
              id="transcript"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Paste the earnings call transcript here..."
              className="min-h-[300px] font-mono text-sm"
            />
          </div>

          <div className="flex gap-4">
            <Button
              onClick={handleGenerateSummary}
              disabled={!transcript || !ticker || !quarter || !year || isGenerating}
              className="flex items-center gap-2"
            >
              {isGenerating ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                  Generating Summary...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate AI Summary
                </>
              )}
            </Button>
          </div>

          {summary && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="summary">AI Generated Summary</Label>
                <TokenCounter
                  text={summary}
                  maxTokens={2000}
                  className="text-xs"
                />
              </div>
              <Textarea
                id="summary"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="min-h-[300px] font-mono text-sm"
              />
            </div>
          )}

          {summary && (
            <div className="flex justify-end gap-4">
              <Button variant="outline" onClick={() => setSummary('')}>
                Clear Summary
              </Button>
              <Button onClick={handleSaveTranscript} className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Save Transcript
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Transcripts</CardTitle>
          <CardDescription>
            View and manage uploaded transcripts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground text-sm">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-center">No transcripts uploaded yet</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}