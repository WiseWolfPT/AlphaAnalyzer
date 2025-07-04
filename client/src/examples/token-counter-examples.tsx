import React, { useState } from 'react';
import { TokenCounter, InlineTokenCounter } from '@/components/ui/token-counter';
import { useTokenCounter } from '@/hooks/use-token-counter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export function TokenCounterExamples() {
  const [text, setText] = useState('');
  const [messages, setMessages] = useState([
    { role: 'user' as const, content: 'Hello, Claude!' },
    { role: 'assistant' as const, content: 'Hello! How can I help you today?' },
  ]);
  
  const { countMessagesTokens, isLoading } = useTokenCounter();
  const [messageTokens, setMessageTokens] = useState<number | null>(null);

  const handleCountMessages = async () => {
    const result = await countMessagesTokens(messages);
    if (result) {
      setMessageTokens(result.tokens);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <h1 className="text-3xl font-bold">Token Counter Examples</h1>

      {/* Example 1: Real-time token counting with visual feedback */}
      <Card>
        <CardHeader>
          <CardTitle>Real-time Token Counting</CardTitle>
          <CardDescription>
            Shows token count as you type with visual progress indicator
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Enter some text:</Label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Start typing to see token count..."
              className="min-h-[150px]"
            />
          </div>
          
          <TokenCounter
            text={text}
            maxTokens={4000}
            showEstimate={true}
            debounceMs={300}
          />
        </CardContent>
      </Card>

      {/* Example 2: Inline token counter */}
      <Card>
        <CardHeader>
          <CardTitle>Inline Token Counter</CardTitle>
          <CardDescription>
            Simple inline display for quick token estimates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm">
            This paragraph contains some sample text to demonstrate the inline token counter.
            It shows a quick estimate without making API calls.{' '}
            <InlineTokenCounter 
              text="This paragraph contains some sample text to demonstrate the inline token counter. It shows a quick estimate without making API calls."
              className="font-mono"
            />
          </p>
        </CardContent>
      </Card>

      {/* Example 3: Token counting for conversation messages */}
      <Card>
        <CardHeader>
          <CardTitle>Conversation Token Counting</CardTitle>
          <CardDescription>
            Count tokens in a multi-turn conversation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {messages.map((msg, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-secondary">
                <p className="text-xs font-semibold mb-1">{msg.role.toUpperCase()}</p>
                <p className="text-sm">{msg.content}</p>
              </div>
            ))}
          </div>
          
          <div className="flex items-center gap-4">
            <Button onClick={handleCountMessages} disabled={isLoading}>
              Count Conversation Tokens
            </Button>
            
            {messageTokens !== null && (
              <p className="text-sm text-muted-foreground">
                Total tokens: <span className="font-mono font-semibold">{messageTokens}</span>
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Example 4: Different model contexts */}
      <Card>
        <CardHeader>
          <CardTitle>Model Context Limits</CardTitle>
          <CardDescription>
            Token counter with different model context windows
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div>
              <Label>Claude 3 Opus (200K tokens)</Label>
              <TokenCounter
                text={text}
                model="claude-3-opus-20240229"
                maxTokens={200000}
                className="mt-2"
              />
            </div>
            
            <div>
              <Label>Claude 3 Sonnet (200K tokens)</Label>
              <TokenCounter
                text={text}
                model="claude-3-sonnet-20240229"
                maxTokens={200000}
                className="mt-2"
              />
            </div>
            
            <div>
              <Label>Claude 3 Haiku (200K tokens)</Label>
              <TokenCounter
                text={text}
                model="claude-3-haiku-20240307"
                maxTokens={200000}
                className="mt-2"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Tips</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none">
          <ul>
            <li>Use <code>TokenCounter</code> for real-time feedback in text areas</li>
            <li>Use <code>InlineTokenCounter</code> for quick estimates in UI</li>
            <li>The component automatically shows estimates first, then accurate counts</li>
            <li>Configure <code>debounceMs</code> to control API call frequency</li>
            <li>Visual indicators warn when approaching token limits</li>
            <li>Token counting is free but has rate limits</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}