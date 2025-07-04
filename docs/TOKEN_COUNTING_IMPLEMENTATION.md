# Token Counting Implementation

This document describes the Anthropic token counting feature implemented in Alfalyzer, based on the official Anthropic documentation.

## Overview

Token counting allows you to determine the number of tokens in a message before sending it to Claude. This helps with:
- Managing rate limits and costs
- Making smart model routing decisions
- Optimizing prompts to specific lengths
- Preventing token limit errors

## Implementation Details

### Backend Service

**File**: `server/services/anthropic-service.ts`

The `AnthropicService` class provides:
- `countTokens()`: Count tokens for complex message structures
- `countTextTokens()`: Simple text token counting
- `countMessagesTokens()`: Count tokens in conversations
- `estimateTokens()`: Quick client-side estimation (words × 1.3)
- `generateTranscriptSummary()`: AI-powered transcript summaries

### API Endpoints

**File**: `server/routes/ai.ts`

- `POST /api/ai/count-tokens`: Accurate token counting using Anthropic API
- `POST /api/ai/estimate-tokens`: Quick estimation without API call
- `POST /api/ai/generate-transcript-summary`: Generate AI summaries with token validation

### Frontend Integration

**Hook**: `client/src/hooks/use-token-counter.ts`

Provides React hook for token counting:
```typescript
const { countTokens, estimateTokens, isLoading, error } = useTokenCounter();
```

**Components**: `client/src/components/ui/token-counter.tsx`

- `<TokenCounter>`: Real-time token counter with visual progress bar
- `<InlineTokenCounter>`: Simple inline token display

## Usage Examples

### 1. Real-time Token Counter in Textarea

```tsx
import { TokenCounter } from '@/components/ui/token-counter';

<Textarea
  value={text}
  onChange={(e) => setText(e.target.value)}
/>
<TokenCounter
  text={text}
  maxTokens={150000}
  showEstimate={true}
  debounceMs={500}
/>
```

### 2. Token Validation Before API Call

```tsx
const { countTokens } = useTokenCounter();

const handleSubmit = async () => {
  const result = await countTokens(transcript);
  if (result && result.tokens > 150000) {
    setError('Text too long. Maximum 150,000 tokens.');
    return;
  }
  // Proceed with API call
};
```

### 3. Inline Token Display

```tsx
import { InlineTokenCounter } from '@/components/ui/token-counter';

<p>
  Your message: <InlineTokenCounter text={message} />
</p>
```

## Configuration

### Environment Variables

Add to your `.env` file:
```bash
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

### Model Support

The implementation supports all Claude models:
- `claude-3-opus-20240229` (default)
- `claude-3-sonnet-20240229`
- `claude-3-haiku-20240307`
- `claude-opus-4-20250514`

## Features

### Visual Feedback
- Progress bar showing token usage
- Color coding: green (safe), yellow (>80%), red (>100%)
- Loading spinner during API calls
- Error indicators

### Performance Optimization
- Debounced API calls to prevent excessive requests
- Client-side estimation for immediate feedback
- Caching of token counts

### Token Limits
- Configurable maximum tokens per component
- Automatic warnings when approaching limits
- Prevents submissions exceeding token limits

## Integration Points

### 1. Transcript Management
The admin transcript page uses token counting to:
- Show real-time token count while typing
- Validate transcript length before AI summary
- Display token usage in generated summaries

### 2. Future Integration Opportunities
- Chat interfaces with Claude
- Document analysis tools
- Content generation features
- API request optimization

## Best Practices

1. **Use Estimation First**: Show quick estimates, then update with accurate counts
2. **Debounce API Calls**: Use 300-500ms debounce for text input
3. **Visual Feedback**: Always show loading states and errors
4. **Set Appropriate Limits**: Configure maxTokens based on use case
5. **Handle Errors Gracefully**: Fallback to estimates if API fails

## Rate Limits

The Anthropic token counting API has rate limits. Consider:
- Implementing request queuing
- Using client-side estimation for rapid changes
- Caching token counts for identical content

## Security

- API key stored server-side only
- Token counting requests authenticated
- No sensitive data exposed to client

## Next Steps

1. Add token counting to more UI components
2. Implement token-based pricing calculator
3. Add support for image and document token counting
4. Create admin dashboard for token usage monitoring