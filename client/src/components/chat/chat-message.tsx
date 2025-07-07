import React from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
  onCopy?: (content: string) => void;
}

export function ChatMessage({ role, content, timestamp, onCopy }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const isUser = role === 'user';

  const handleCopy = async () => {
    if (onCopy) {
      onCopy(content);
    } else {
      await navigator.clipboard.writeText(content);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn(
      "flex gap-3 mb-4 group",
      isUser ? "flex-row-reverse" : "flex-row"
    )}>
      <Avatar className="w-8 h-8 shrink-0">
        <AvatarFallback className={cn(
          "text-xs font-medium",
          isUser 
            ? "bg-chartreuse text-dark-900" 
            : "bg-blue-600 text-white"
        )}>
          {isUser ? "U" : "AI"}
        </AvatarFallback>
      </Avatar>

      <div className={cn(
        "max-w-[80%] relative",
        isUser ? "flex flex-col items-end" : "flex flex-col items-start"
      )}>
        <div className={cn(
          "rounded-lg px-4 py-2 text-sm break-words",
          isUser 
            ? "bg-chartreuse text-dark-900 ml-8" 
            : "bg-muted text-foreground mr-8"
        )}>
          {content}
        </div>

        <div className="flex items-center gap-2 mt-1">
          {timestamp && (
            <span className="text-xs text-muted-foreground">
              {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          
          {!isUser && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
            >
              {copied ? (
                <Check className="h-3 w-3 text-green-500" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}