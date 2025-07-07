import React from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatButtonProps {
  onClick: () => void;
  variant?: 'default' | 'floating' | 'compact';
  label?: string;
  className?: string;
  disabled?: boolean;
}

export function ChatButton({ 
  onClick, 
  variant = 'default',
  label = 'Ask AI Assistant',
  className,
  disabled = false
}: ChatButtonProps) {
  if (variant === 'floating') {
    return (
      <Button
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "fixed bottom-6 right-6 z-40 rounded-full w-14 h-14 shadow-lg",
          "bg-chartreuse text-dark-900 hover:bg-chartreuse/90",
          "animate-pulse hover:animate-none transition-all",
          className
        )}
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }

  if (variant === 'compact') {
    return (
      <Button
        onClick={onClick}
        disabled={disabled}
        variant="outline"
        size="sm"
        className={cn(
          "border-chartreuse/30 text-chartreuse hover:bg-chartreuse/10",
          className
        )}
      >
        <MessageCircle className="h-4 w-4 mr-2" />
        AI
      </Button>
    );
  }

  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "bg-chartreuse text-dark-900 hover:bg-chartreuse/90",
        "transition-all duration-200",
        className
      )}
    >
      <Sparkles className="h-4 w-4 mr-2" />
      {label}
    </Button>
  );
}