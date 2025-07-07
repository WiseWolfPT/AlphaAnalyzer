import React, { useState } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StockChatHelper, ChatButton } from '@/components/chat';
import { 
  MessageCircle, 
  Sparkles, 
  TrendingUp, 
  BarChart3,
  Calculator,
  Eye
} from 'lucide-react';

export default function AiChatDemo() {
  const [selectedStock, setSelectedStock] = useState<string>('AAPL');

  const popularStocks = [
    { symbol: 'AAPL', name: 'Apple Inc.' },
    { symbol: 'MSFT', name: 'Microsoft Corp.' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.' },
    { symbol: 'TSLA', name: 'Tesla Inc.' }
  ];

  const handleAskQuestion = (question: string) => {
    // This will trigger the chat widget to open with the question
    console.log('Question asked:', question);
    // In a real implementation, this would open the chat widget with the pre-filled question
  };

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold flex items-center justify-center gap-3">
            <Sparkles className="h-8 w-8 text-chartreuse" />
            AI Stock Assistant Demo
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Experience our AI-powered stock analysis assistant. Ask questions about stocks, 
            get market insights, and receive intelligent financial guidance powered by Claude AI.
          </p>
          <Badge variant="secondary" className="text-sm">
            Powered by Anthropic Claude
          </Badge>
        </div>

        {/* Features Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-8 w-8 text-chartreuse mx-auto mb-2" />
              <h3 className="font-semibold mb-1">Stock Analysis</h3>
              <p className="text-sm text-muted-foreground">
                Deep insights on performance and trends
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <Calculator className="h-8 w-8 text-chartreuse mx-auto mb-2" />
              <h3 className="font-semibold mb-1">Valuation</h3>
              <p className="text-sm text-muted-foreground">
                Fair value calculations and DCF models
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <BarChart3 className="h-8 w-8 text-chartreuse mx-auto mb-2" />
              <h3 className="font-semibold mb-1">Fundamentals</h3>
              <p className="text-sm text-muted-foreground">
                Key ratios and financial metrics
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <Eye className="h-8 w-8 text-chartreuse mx-auto mb-2" />
              <h3 className="font-semibold mb-1">Market Insights</h3>
              <p className="text-sm text-muted-foreground">
                Trends, sentiment, and outlook
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Stock Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select a Stock to Analyze</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4">
              {popularStocks.map((stock) => (
                <Button
                  key={stock.symbol}
                  variant={selectedStock === stock.symbol ? 'default' : 'outline'}
                  onClick={() => setSelectedStock(stock.symbol)}
                  className={selectedStock === stock.symbol ? 'bg-chartreuse text-dark-900' : ''}
                >
                  {stock.symbol}
                  <span className="ml-2 text-xs opacity-75">{stock.name}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* AI Chat Helper */}
        <StockChatHelper 
          symbol={selectedStock}
          onAskQuestion={handleAskQuestion}
        />

        {/* Chat Options */}
        <Card>
          <CardHeader>
            <CardTitle>Try the Chat Interface</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                The AI assistant is available through multiple interfaces:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    Floating Widget
                  </h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Always accessible chat widget in the bottom-right corner
                  </p>
                  <ChatButton variant="floating" onClick={() => {}} />
                </div>
                
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Inline Button</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Embedded chat buttons throughout the platform
                  </p>
                  <ChatButton onClick={() => {}} />
                </div>
                
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Compact Mode</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Small chat buttons for toolbars and menus
                  </p>
                  <ChatButton variant="compact" onClick={() => {}} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Language Support */}
        <Card>
          <CardHeader>
            <CardTitle>Language Support</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2">English</h4>
                <div className="space-y-2 text-sm">
                  <p>• "Analyze Apple's performance"</p>
                  <p>• "What's the fair value of MSFT?"</p>
                  <p>• "Show me Tesla's key ratios"</p>
                  <p>• "What's the market outlook?"</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Português</h4>
                <div className="space-y-2 text-sm">
                  <p>• "Analise o desempenho da Apple"</p>
                  <p>• "Qual é o valor justo da MSFT?"</p>
                  <p>• "Mostre os principais índices da Tesla"</p>
                  <p>• "Qual é a perspectiva do mercado?"</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>How to Use</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <div className="bg-chartreuse text-dark-900 rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs">1</div>
                <div>
                  <p className="font-semibold">Click the chat button</p>
                  <p className="text-muted-foreground">Look for the floating chat widget in the bottom-right corner</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="bg-chartreuse text-dark-900 rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs">2</div>
                <div>
                  <p className="font-semibold">Ask your question</p>
                  <p className="text-muted-foreground">Type any stock-related question or use the suggested prompts</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="bg-chartreuse text-dark-900 rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs">3</div>
                <div>
                  <p className="font-semibold">Get AI insights</p>
                  <p className="text-muted-foreground">Receive detailed, educational responses about your financial questions</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}