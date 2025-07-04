import React, { useEffect, useState } from 'react';
import { useTokenCounter } from '@/hooks/use-token-counter';
import { AlertCircle, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TokenCounterProps {
  text: string;
  model?: string;
  maxTokens?: number;
  className?: string;
  showEstimate?: boolean;
  debounceMs?: number;
}

export function TokenCounter({
  text,
  model = 'claude-3-opus-20240229',
  maxTokens = 150000,
  className,
  showEstimate = true,
  debounceMs = 500,
}: TokenCounterProps) {
  const { countTokens, estimateTokensSync, isLoading, error } = useTokenCounter();
  const [tokenCount, setTokenCount] = useState<number | null>(null);
  const [isEstimate, setIsEstimate] = useState(true);

  useEffect(() => {
    if (!text) {
      setTokenCount(0);
      return;
    }

    const estimate = estimateTokensSync(text);
    setTokenCount(estimate);
    setIsEstimate(true);

    const timer = setTimeout(async () => {
      const result = await countTokens(text, model);
      if (result) {
        setTokenCount(result.tokens);
        setIsEstimate(false);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [text, model, debounceMs, countTokens, estimateTokensSync]);

  const percentage = tokenCount ? (tokenCount / maxTokens) * 100 : 0;
  const isNearLimit = percentage > 80;
  const isOverLimit = percentage > 100;

  return (
    <div className={cn('flex items-center gap-2 text-sm', className)}>
      <Hash className="h-4 w-4 text-muted-foreground" />
      
      <div className="flex items-center gap-1">
        <span
          className={cn(
            'font-mono',
            isOverLimit && 'text-destructive',
            isNearLimit && !isOverLimit && 'text-warning'
          )}
        >
          {tokenCount?.toLocaleString() || '0'}
        </span>
        
        {showEstimate && isEstimate && (
          <span className="text-muted-foreground text-xs">~</span>
        )}
        
        <span className="text-muted-foreground">
          / {maxTokens.toLocaleString()} tokens
        </span>
      </div>

      {isLoading && (
        <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      )}

      {error && (
        <AlertCircle className="h-4 w-4 text-destructive" title={error} />
      )}

      <div className="ml-2 h-2 w-24 rounded-full bg-secondary overflow-hidden">
        <div
          className={cn(
            'h-full transition-all duration-300',
            isOverLimit && 'bg-destructive',
            isNearLimit && !isOverLimit && 'bg-warning',
            !isNearLimit && 'bg-primary'
          )}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}

interface InlineTokenCounterProps {
  text: string;
  className?: string;
}

export function InlineTokenCounter({ text, className }: InlineTokenCounterProps) {
  const { estimateTokensSync } = useTokenCounter();
  const tokenCount = estimateTokensSync(text);

  return (
    <span className={cn('text-xs text-muted-foreground', className)}>
      ~{tokenCount.toLocaleString()} tokens
    </span>
  );
}