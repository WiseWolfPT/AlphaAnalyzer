import React from 'react';
import { useParams, useLocation } from 'wouter';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, FileText } from 'lucide-react';
import { TranscriptSection } from '@/components/transcripts/transcript-section';

export default function TranscriptsSymbolPage() {
  const params = useParams<{ symbol: string }>();
  const [, setLocation] = useLocation();
  const symbol = (params.symbol || '').toUpperCase();

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-teya-green" />
            <h1 className="text-2xl font-bold">Earnings Transcripts — {symbol}</h1>
          </div>
          <Button variant="outline" size="sm" onClick={() => setLocation('/transcripts')}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to All Transcripts
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Latest Transcript and History</CardTitle>
          </CardHeader>
          <CardContent>
            <TranscriptSection symbol={symbol} />
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

