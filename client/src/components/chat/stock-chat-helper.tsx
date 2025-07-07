import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  MessageCircle, 
  TrendingUp,
  Calculator,
  BarChart3,
  Eye,
  Target,
  AlertTriangle
} from 'lucide-react';

interface StockChatHelperProps {
  symbol: string;
  onAskQuestion: (question: string) => void;
  className?: string;
}

const STOCK_SPECIFIC_QUESTIONS = [
  { 
    icon: TrendingUp, 
    text: "Analyze [SYMBOL]'s recent performance", 
    category: "Performance",
    description: "Get insights on price movements and trends"
  },
  { 
    icon: Calculator, 
    text: "What's [SYMBOL]'s fair value?", 
    category: "Valuation",
    description: "DCF analysis and valuation models"
  },
  { 
    icon: BarChart3, 
    text: "Show [SYMBOL]'s key financial ratios", 
    category: "Fundamentals",
    description: "P/E, ROE, debt ratios, and more"
  },
  { 
    icon: Eye, 
    text: "What are analysts saying about [SYMBOL]?", 
    category: "Analysis",
    description: "Analyst ratings and price targets"
  },
  { 
    icon: Target, 
    text: "Should I buy [SYMBOL] now?", 
    category: "Strategy",
    description: "Investment recommendation based on analysis"
  },
  { 
    icon: AlertTriangle, 
    text: "What are the risks with [SYMBOL]?", 
    category: "Risk",
    description: "Risk factors and potential concerns"
  }
];

export function StockChatHelper({ symbol, onAskQuestion, className }: StockChatHelperProps) {
  const handleQuestionClick = (questionTemplate: string) => {
    const question = questionTemplate.replace(/\[SYMBOL\]/g, symbol);
    onAskQuestion(question);
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-chartreuse" />
          Ask AI About {symbol}
          <Badge variant="secondary" className="text-xs">
            Powered by Claude
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {STOCK_SPECIFIC_QUESTIONS.map((question, index) => (
            <Button
              key={index}
              variant="outline"
              onClick={() => handleQuestionClick(question.text)}
              className="h-auto p-3 flex flex-col items-start gap-2 text-left hover:bg-muted/50"
            >
              <div className="flex items-center gap-2 w-full">
                <question.icon className="h-4 w-4 text-chartreuse shrink-0" />
                <div className="flex flex-col items-start gap-1 min-w-0">
                  <span className="text-xs text-muted-foreground font-medium">
                    {question.category}
                  </span>
                  <span className="text-sm font-medium text-foreground break-words">
                    {question.text.replace(/\[SYMBOL\]/g, symbol)}
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground w-full">
                {question.description}
              </p>
            </Button>
          ))}
        </div>
        
        <div className="mt-4 p-3 bg-muted/30 rounded-lg">
          <p className="text-xs text-muted-foreground text-center">
            💡 You can also ask custom questions about {symbol}, compare it with other stocks, 
            or get market insights. The AI assistant has access to real-time data and analysis.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}