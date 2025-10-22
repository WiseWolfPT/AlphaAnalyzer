# Transcript Section - Quick Reference Card

## 🚀 Quick Start (30 seconds)

```tsx
import { TranscriptSection } from '@/components/transcripts';

// That's it! Just pass the stock symbol:
<TranscriptSection symbol="AAPL" />
```

---

## 📁 Files Location

```
/client/src/components/transcripts/
├── transcript-section.tsx    ← Main component (404 lines)
├── index.ts                   ← Barrel export
└── README.md                  ← Full documentation
```

---

## 🎯 What It Does

1. **Latest Transcript** (always visible)
   - AI Summary with Sparkles icon
   - Key Insights with Lightbulb icon
   - "Read Full Transcript" button

2. **Historical Transcripts** (collapsible)
   - Collapsed by default (progressive disclosure)
   - Lazy loads on expand
   - Accordion with summary preview

---

## 🔌 Required API Endpoints

### 1. Latest
```
GET /api/transcripts/:symbol
→ Returns single transcript object
```

### 2. Historical
```
GET /api/transcripts/:symbol?history=true
→ Returns array of transcript objects
```

### Expected Data Format
```json
{
  "data": {
    "id": 123,
    "ticker": "AAPL",
    "quarter": "Q4",
    "year": 2024,
    "call_date": "2025-01-30",
    "ai_summary": {
      "summary": "Text here...",
      "key_insights": ["insight 1", "insight 2"]
    }
  }
}
```

---

## ✅ UX Features

- ✅ **Progressive Disclosure** - Historical data hidden by default
- ✅ **Lazy Loading** - Only fetches when expanded
- ✅ **Keyboard Accessible** - Enter/Space toggles
- ✅ **Mobile Touch Targets** - Minimum 44px height
- ✅ **ARIA Labels** - Screen reader friendly
- ✅ **Skeleton Loaders** - Instant feedback (<100ms)
- ✅ **Error States** - Graceful fallbacks

---

## 📱 Responsive Breakpoints

| Screen | Latest Card | Historical | Buttons |
|--------|-------------|------------|---------|
| Mobile (<640px) | Full width | Full width | Full width |
| Tablet (640-1024px) | Full width | Full width | Auto width |
| Desktop (>1024px) | Max width | Full width | Auto width |

---

## 🎨 Design Tokens Used

### Icons (Lucide React)
- `Sparkles` - AI Summary
- `Lightbulb` - Key Insights
- `TrendingUp` - Historical
- `Calendar` - Date display
- `ExternalLink` - "Read more" links

### Colors (Tailwind)
- `teya-green` - Primary brand color
- `muted-foreground` - Secondary text
- `card-foreground` - Card text

### Components (shadcn/ui)
- `Card`, `CardHeader`, `CardTitle`, `CardContent`
- `Badge`, `Button`, `Skeleton`
- `Accordion`, `AccordionItem`, `AccordionTrigger`, `AccordionContent`

---

## 🧪 Testing Checklist

### Manual Tests
- [ ] Toggle historical section (click)
- [ ] Toggle with keyboard (Enter/Space)
- [ ] Check mobile touch targets (≥44px)
- [ ] Verify skeleton loaders appear
- [ ] Test with no transcripts (empty state)
- [ ] Test with network error (error state)

### Browser Support
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

---

## 🐛 Troubleshooting

### Issue: No data appears
**Check:**
1. API endpoints returning correct format
2. `ai_summary` field structure matches expected
3. Network tab shows 200 responses
4. Console for any errors

### Issue: Historical section won't expand
**Check:**
1. Click/keyboard events working
2. `showHistory` state updating (React DevTools)
3. API endpoint for history is accessible

### Issue: AI summary not displaying
**Check:**
1. `ai_summary` field is not null
2. Format matches one of: OpenAI structure, legacy structure, or plain string
3. Check console for parsing errors

---

## 📊 Performance Targets

- **Time to Interactive:** <200ms
- **First Contentful Paint:** <100ms (skeleton)
- **Bundle Size:** +8KB gzipped
- **Cache Duration:** 5 minutes (React Query)

---

## 🔗 Related Components

- `TranscriptCard` - Used in `/transcripts` list page
- `TranscriptDetail` - Full transcript viewer at `/transcript/:id`
- `AITranscriptSummary` - Standalone AI summary component

---

## 📞 Integration Points

### Stock Detail Page
```tsx
import { TranscriptSection } from '@/components/transcripts';

<Tabs>
  <TabsContent value="transcripts">
    <TranscriptSection symbol={symbol} />
  </TabsContent>
</Tabs>
```

### Standalone Transcript Page
```tsx
import { TranscriptSection } from '@/components/transcripts';

export function TranscriptsPage() {
  const { symbol } = useParams();

  return (
    <MainLayout>
      <TranscriptSection symbol={symbol} />
    </MainLayout>
  );
}
```

---

## 🔐 Props Interface

```typescript
interface TranscriptSectionProps {
  symbol: string; // Stock ticker (e.g., "AAPL", "MSFT")
}
```

That's it! Only one required prop.

---

## 📚 Full Documentation

For complete documentation, see:
- `/client/src/components/transcripts/README.md` - Full API reference
- `/TRANSCRIPT_SECTION_IMPLEMENTATION_SUMMARY.md` - Implementation details

---

**Last Updated:** 2025-10-07
**Status:** ✅ Production Ready
**Component Version:** 1.0.0
