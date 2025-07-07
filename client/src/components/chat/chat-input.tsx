import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Mic, MicOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
}

export function ChatInput({ 
  onSendMessage, 
  disabled = false, 
  placeholder = "Ask about stocks, market analysis, or investment strategies...",
  maxLength = 1000 
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isListening, setIsListening] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  // Voice input placeholder (not implemented yet)
  const handleVoiceInput = () => {
    setIsListening(!isListening);
    // TODO: Implement speech recognition
    setTimeout(() => setIsListening(false), 3000);
  };

  const canSend = message.trim().length > 0 && !disabled;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? "AI Assistant is thinking..." : placeholder}
            disabled={disabled}
            maxLength={maxLength}
            className="min-h-[40px] max-h-[120px] resize-none pr-20"
            rows={1}
          />
          
          <div className="absolute right-2 bottom-2 flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleVoiceInput}
              disabled={disabled}
              className="h-6 w-6 p-0"
            >
              {isListening ? (
                <MicOff className="h-4 w-4 text-red-500" />
              ) : (
                <Mic className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
            
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              disabled={!canSend}
              className={cn(
                "h-6 w-6 p-0",
                canSend 
                  ? "text-chartreuse hover:text-chartreuse" 
                  : "text-muted-foreground"
              )}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      
      {maxLength && (
        <div className="text-xs text-muted-foreground text-right">
          {message.length}/{maxLength}
        </div>
      )}
    </form>
  );
}