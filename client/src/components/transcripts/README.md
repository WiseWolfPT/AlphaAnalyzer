# Transcript Section Component

**Production-ready React component for displaying earnings transcripts with progressive disclosure UX pattern.**

## Overview

The `TranscriptSection` component implements a two-section layout designed to prevent user overwhelm:

1. **Latest Transcript** - Always visible, shows AI summary and key insights
2. **Historical Transcripts** - Collapsible accordion (hidden by default)

## Features

✅ **Progressive Disclosure** - Historical data collapsed by default
✅ **Lazy Loading** - Historical transcripts fetched only when expanded
✅ **Mobile-First Design** - Responsive layout with proper touch targets (≥44px)
✅ **Accessibility** - Full keyboard navigation, ARIA labels, semantic HTML
✅ **Performance** - React Query caching, skeleton loaders (<100ms)
✅ **Error Handling** - Graceful fallbacks for empty states and errors
✅ **Type Safety** - Full TypeScript support with comprehensive types

## Usage

```tsx
import { TranscriptSection } from '@/components/transcripts';

function StockDetailPage() {
  return (
    <div>
      <h1>Apple Inc. (AAPL)</h1>
      <TranscriptSection symbol="AAPL" />
    </div>
  );
}
```

## API Requirements

The component requires two backend endpoints:

### 1. Latest Transcript
```
GET /api/transcripts/:symbol
```

**Response:**
```json
{
  "data": {
    "id": 123,
    "ticker": "AAPL",
    "company_name": "Apple Inc.",
    "quarter": "Q4",
    "year": 2024,
    "call_date": "2025-01-30",
    "ai_summary": {
      "summary": "Strong Q4 results with record revenue...",
      "keyInsights": [
        "iPhone revenue up 15% YoY",
        "Services segment hit $20B milestone"
      ]
    }
  }
}
```

### 2. Historical Transcripts
```
GET /api/transcripts/:symbol?history=true
```

**Response:**
```json
{
  "data": [
    {
      "id": 122,
      "ticker": "AAPL",
      "quarter": "Q3",
      "year": 2024,
      "call_date": "2024-10-28",
      "ai_summary": { ... }
    },
    // ... more historical transcripts
  ]
}
```

## AI Summary Format

The component supports multiple AI summary formats for backward compatibility:

### OpenAI Structure (Recommended)
```json
{
  "model": "openai",
  "summary": "Text summary...",
  "key_insights": ["insight 1", "insight 2"],
  "financial_highlights": ["highlight 1"],
  "risk_factors": ["risk 1"]
}
```

### Legacy Structure
```json
{
  "summary": "Text summary...",
  "keyInsights": ["insight 1", "insight 2"]
}
```

### Plain String
```json
"Simple text summary without structure"
```

## Component Props

```typescript
interface TranscriptSectionProps {
  symbol: string; // Stock ticker symbol (e.g., "AAPL")
}
```

## Design System

The component uses the following design tokens from shadcn/ui:

- **Colors**: `teya-green`, `muted-foreground`, `card-foreground`
- **Icons**: Lucide React (`Sparkles`, `Lightbulb`, `TrendingUp`, `Calendar`)
- **Components**: `Card`, `Badge`, `Button`, `Accordion`, `Skeleton`
- **Typography**: Font sizes from `text-sm` to `text-xl`
- **Spacing**: Consistent `gap-2`, `space-y-3`, `space-y-6` patterns

## Accessibility Features

### Keyboard Navigation
- **Enter/Space** - Toggle historical transcripts section
- **Tab** - Navigate between interactive elements
- **Escape** - Close expanded accordions

### ARIA Attributes
- `role="region"` - Landmark for screen readers
- `aria-label="Earnings Transcripts"` - Section description
- `aria-expanded` - Toggle state for historical section
- `aria-controls` - Associates toggle with content

### Touch Targets
- Minimum 44px height on all interactive elements (WCAG 2.1 AA)
- Adequate spacing between clickable areas

## Performance

### Caching Strategy
- **Latest transcript**: 5-minute stale time (React Query)
- **Historical transcripts**: 5-minute stale time, lazy loaded
- Automatic background refetch on window focus

### Loading States
- Skeleton loaders during data fetch
- Smooth transitions when expanding/collapsing
- No layout shift (CLS optimization)

### Bundle Size
- Component size: ~8KB (gzipped)
- Dependencies: React Query, Wouter, Lucide React
- Tree-shakeable imports

## Error Handling

The component gracefully handles:

1. **No transcripts available** - Shows friendly empty state
2. **Network errors** - Displays error message with retry option
3. **Malformed AI summaries** - Falls back to safe defaults
4. **Missing data fields** - Uses defensive programming (null checks)

## Testing

Example test cases:

```tsx
describe('TranscriptSection', () => {
  it('renders latest transcript', () => {
    render(<TranscriptSection symbol="AAPL" />);
    expect(screen.getByText('Latest Earnings Transcript')).toBeInTheDocument();
  });

  it('loads historical transcripts when toggled', async () => {
    render(<TranscriptSection symbol="AAPL" />);

    const toggleButton = screen.getByRole('button', { name: /historical transcripts/i });
    fireEvent.click(toggleButton);

    await waitFor(() => {
      expect(screen.getByText(/Q3 2024/)).toBeInTheDocument();
    });
  });

  it('handles keyboard navigation', () => {
    render(<TranscriptSection symbol="AAPL" />);

    const toggleButton = screen.getByRole('button', { name: /historical transcripts/i });
    fireEvent.keyDown(toggleButton, { key: 'Enter' });

    expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
  });
});
```

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Migration Guide

If upgrading from an older transcript component:

1. Update import: `import { TranscriptSection } from '@/components/transcripts'`
2. Ensure backend endpoints match expected format
3. Verify AI summary structure includes `keyInsights` array
4. Test on mobile devices for touch target sizes

## Related Components

- `TranscriptCard` - Used in transcript list pages
- `TranscriptDetail` - Full transcript viewer
- `AITranscriptSummary` - Standalone AI summary component

## License

Internal component - Part of Alfalyzer codebase
