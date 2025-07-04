import { useState, useCallback } from 'react';
import axios from 'axios';

interface TokenCountResult {
  tokens: number;
  model?: string;
  isEstimate?: boolean;
}

interface TokenCountError {
  error: string;
}

export function useTokenCounter() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const countTokens = useCallback(async (
    text: string,
    model?: string
  ): Promise<TokenCountResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post<TokenCountResult>('/api/ai/count-tokens', {
        text,
        model,
      });

      return response.data;
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data) {
        const errorData = err.response.data as TokenCountError;
        setError(errorData.error || 'Failed to count tokens');
      } else {
        setError('Failed to count tokens');
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const countMessagesTokens = useCallback(async (
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    model?: string,
    system?: string
  ): Promise<TokenCountResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post<TokenCountResult>('/api/ai/count-tokens', {
        messages,
        model,
        system,
      });

      return response.data;
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data) {
        const errorData = err.response.data as TokenCountError;
        setError(errorData.error || 'Failed to count tokens');
      } else {
        setError('Failed to count tokens');
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const estimateTokens = useCallback(async (
    text: string
  ): Promise<TokenCountResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post<TokenCountResult>('/api/ai/estimate-tokens', {
        text,
      });

      return response.data;
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data) {
        const errorData = err.response.data as TokenCountError;
        setError(errorData.error || 'Failed to estimate tokens');
      } else {
        setError('Failed to estimate tokens');
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const estimateTokensSync = useCallback((text: string): number => {
    const words = text.split(/\s+/).length;
    return Math.ceil(words * 1.3);
  }, []);

  return {
    countTokens,
    countMessagesTokens,
    estimateTokens,
    estimateTokensSync,
    isLoading,
    error,
  };
}