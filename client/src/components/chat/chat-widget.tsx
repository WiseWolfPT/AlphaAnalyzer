import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  MessageCircle, 
  X, 
  Minimize2, 
  Maximize2, 
  Trash2, 
  TrendingUp,
  Calculator,
  BarChart3,
  Globe
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatMessage } from './chat-message';
import { ChatInput } from './chat-input';
import { useLocation } from 'wouter';
import { useAiChat } from '@/hooks/use-ai-chat';
import { useToast } from '@/hooks/use-toast';

interface ChatWidgetProps {
  currentStock?: string;
  className?: string;
}

const SUGGESTED_QUESTIONS = [
  { icon: TrendingUp, text: "Analyze this stock's performance", category: "Analysis" },
  { icon: Calculator, text: "Calculate fair value", category: "Valuation" },
  { icon: BarChart3, text: "Show key financial ratios", category: "Fundamentals" },
  { icon: Globe, text: "What's the market outlook?", category: "Market" }
];

const SUGGESTED_QUESTIONS_PT = [
  { icon: TrendingUp, text: "Analise o desempenho desta ação", category: "Análise" },
  { icon: Calculator, text: "Calcule o valor justo", category: "Avaliação" },
  { icon: BarChart3, text: "Mostre os principais índices financeiros", category: "Fundamentos" },
  { icon: Globe, text: "Qual é a perspectiva do mercado?", category: "Mercado" }
];

export function ChatWidget({ currentStock, className }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [language, setLanguage] = useState<'en' | 'pt'>('en');
  const [location] = useLocation();
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  const { 
    messages, 
    isLoading, 
    totalTokens,
    sendMessage, 
    clearChat: clearChatMessages,
    addWelcomeMessage 
  } = useAiChat({ 
    currentStock,
    onError: (error) => {
      console.error('Chat error:', error);
    }
  });

  // Detect language from browser or user preference
  useEffect(() => {
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.includes('pt')) {
      setLanguage('pt');
    }
  }, []);

  const suggestedQuestions = language === 'pt' ? SUGGESTED_QUESTIONS_PT : SUGGESTED_QUESTIONS;

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      // Find the viewport element within the ScrollArea
      const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
      if (viewport) {
        setTimeout(() => {
          viewport.scrollTop = viewport.scrollHeight;
        }, 100);
      }
    }
  }, [messages]);

  // Add welcome message when first opened
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      addWelcomeMessage();
    }
  }, [isOpen, messages.length, addWelcomeMessage]);

  const handleSuggestedQuestion = (question: string) => {
    let contextualQuestion = question;
    
    if (currentStock && question.includes("this stock")) {
      contextualQuestion = question.replace("this stock", currentStock);
    }
    
    sendMessage(contextualQuestion);
  };

  const clearChat = () => {
    clearChatMessages();
    setIsOpen(false);
    setTimeout(() => setIsOpen(true), 100); // Reopen to trigger welcome message
  };

  const handleCopy = async (content: string) => {
    await navigator.clipboard.writeText(content);
    toast({
      title: "Copied!",
      description: "Message copied to clipboard"
    });
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-50 rounded-full w-14 h-14 shadow-lg",
          "bg-chartreuse text-dark-900 hover:bg-chartreuse/90",
          "animate-pulse hover:animate-none transition-all",
          className
        )}
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className={cn(
      "fixed bottom-6 right-6 z-50 w-96 h-[500px] shadow-xl",
      "border-chartreuse/20 bg-background/95 backdrop-blur-sm",
      isMinimized && "h-auto",
      className
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          AI Stock Assistant
          {currentStock && (
            <Badge variant="secondary" className="ml-2 text-xs">
              {currentStock}
            </Badge>
          )}
          {totalTokens > 0 && (
            <Badge variant="outline" className="ml-2 text-xs">
              {totalTokens} tokens
            </Badge>
          )}
        </CardTitle>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(!isMinimized)}
            className="h-6 w-6 p-0"
          >
            {isMinimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearChat}
            className="h-6 w-6 p-0"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>

      {!isMinimized && (
        <CardContent className="flex flex-col h-[420px] p-4 pt-0">
          {/* Messages */}
          <ScrollArea ref={scrollAreaRef} className="flex-1 pr-4 mb-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  role={message.role}
                  content={message.content}
                  timestamp={message.timestamp}
                  onCopy={handleCopy}
                />
              ))}
              
              {isLoading && (
                <div className="flex gap-3 mb-4">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-medium">AI</span>
                  </div>
                  <div className="bg-muted rounded-lg px-4 py-2 text-sm">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Suggested Questions */}
          {messages.length <= 1 && !isLoading && (
            <div className="mb-4">
              <p className="text-xs text-muted-foreground mb-2">
                {language === 'pt' ? 'Sugestões rápidas:' : 'Quick suggestions:'}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {suggestedQuestions.map((suggestion, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSuggestedQuestion(suggestion.text)}
                    className="text-xs h-auto py-2 px-3 flex flex-col items-start gap-1"
                  >
                    <div className="flex items-center gap-1">
                      <suggestion.icon className="h-3 w-3" />
                      <span className="text-xs text-muted-foreground">{suggestion.category}</span>
                    </div>
                    <span>{suggestion.text}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <ChatInput
            onSendMessage={sendMessage}
            disabled={isLoading}
            placeholder={currentStock 
              ? `Ask about ${currentStock} or any financial question...`
              : "Ask about stocks, analysis, or market insights..."
            }
          />
        </CardContent>
      )}
    </Card>
  );
}