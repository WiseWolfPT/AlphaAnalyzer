import { useState, useCallback } from 'react';
import { aiApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  tokens?: number;
}

export interface UseChatOptions {
  currentStock?: string;
  onError?: (error: Error) => void;
}

export function useAiChat(options: UseChatOptions = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalTokens, setTotalTokens] = useState(0);
  const { toast } = useToast();

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const context = {
        symbol: options.currentStock,
        conversation: messages.map(m => ({ role: m.role, content: m.content }))
      };

      const response = await aiApi.chatWithAssistant(content, context);

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.response,
        timestamp: new Date(),
        tokens: response.tokens
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      if (response.tokens) {
        setTotalTokens(prev => prev + response.tokens!);
      }
    } catch (error) {
      console.error('Chat error:', error);
      
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: "I'm sorry, I'm experiencing technical difficulties. Please try again in a moment.",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);

      if (options.onError) {
        options.onError(error as Error);
      } else {
        toast({
          title: "Chat Error",
          description: "Failed to get response from AI assistant",
          variant: "destructive"
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading, options, toast]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setTotalTokens(0);
  }, []);

  const addWelcomeMessage = useCallback((welcomeText?: string) => {
    const defaultWelcome = options.currentStock 
      ? `Hello! I'm your AI Stock Assistant. I can help you analyze ${options.currentStock} or answer any other financial questions you have.`
      : "Hello! I'm your AI Stock Assistant. I can help you with stock analysis, market insights, and investment strategies. What would you like to know?";

    const welcomeMessage: ChatMessage = {
      id: 'welcome',
      role: 'assistant',
      content: welcomeText || defaultWelcome,
      timestamp: new Date()
    };

    setMessages([welcomeMessage]);
  }, [options.currentStock]);

  return {
    messages,
    isLoading,
    totalTokens,
    sendMessage,
    clearChat,
    addWelcomeMessage
  };
}