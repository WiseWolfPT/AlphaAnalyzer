# Mock Data Audit - Remaining Work

## Overview
This document lists all remaining mock data in the codebase that needs to be replaced with real API integrations.

## Status Summary

### ✅ Completed (Real Data)
- **Find Stocks Dashboard**: Using real market data from multiple providers
- **Stock Search**: Real-time search with Alpha Vantage
- **Individual Stock Data**: Real quotes with price updates
- **Watchlists**: Fully functional with Supabase backend

### ⏳ Still Using Mock Data

#### 1. Portfolios Page (`/client/src/pages/portfolios.tsx`)
**Current State**: Uses static mock portfolio data
**Required Work**:
- Create portfolio API endpoints in backend
- Implement portfolio CRUD operations
- Add real-time portfolio valuation
- Track historical performance

**Mock Data Location**:
```typescript
// Line 76: Mock portfolio data
const portfolios = [
  {
    id: "1",
    name: "Growth Portfolio",
    value: 125430.50,
    // ... static data
  }
];
```

#### 2. Transcripts Page (`/client/src/pages/transcripts.tsx`)
**Current State**: Displays hardcoded mock transcripts
**Required Work**:
- Implement transcript storage in Supabase
- Create admin upload interface
- Add ChatGPT integration for summaries
- Build transcript API endpoints

**Mock Data Location**:
```typescript
// Line 16: Mock transcripts data
const mockTranscripts = [
  {
    id: "1",
    ticker: "AAPL",
    companyName: "Apple Inc.",
    // ... static data
  }
];
```

#### 3. Earnings Calendar (`/client/src/pages/earnings.tsx`)
**Current State**: Partially integrated, falls back to mock when API fails
**Required Work**:
- Improve API reliability
- Add more earnings data providers
- Cache earnings dates properly
- Remove mock fallback

**Mock Data Detection**:
```typescript
// Line 139: Checks if data source is mock
earningsData?.source === 'mock'
```

#### 4. News Features
**Current State**: Several components reference news but no real implementation
**Required Work**:
- Integrate news API (Finnhub has news endpoint)
- Create news aggregation service
- Add sentiment analysis
- Build news UI components

**Affected Components**:
- `/components/dashboard/news-highlights-card.tsx`
- `/components/stock/stock-news.tsx`
- `/pages/news.tsx`

#### 5. Insights Page (`/pages/insights.tsx`)
**Current State**: Placeholder with no real functionality
**Required Work**:
- Define what insights to show
- Integrate AI analysis
- Create insight generation service
- Build insight UI

## Priority Order for Implementation

### High Priority (Week 1-2)
1. **Portfolios**: Core feature for users
   - Database schema exists
   - Need API endpoints
   - UI mostly ready

2. **Earnings Calendar**: Important for investors
   - API integration started
   - Need reliability improvements
   - Remove mock fallback

### Medium Priority (Week 3-4)
3. **Transcripts**: Valuable differentiation
   - Need admin interface first
   - Storage system required
   - AI integration complex

4. **News Integration**: Expected feature
   - APIs available
   - UI components exist
   - Need aggregation logic

### Low Priority (Future)
5. **Insights**: Advanced feature
   - Requires AI integration
   - Complex implementation
   - Nice-to-have initially

## Implementation Notes

### Portfolio Implementation
```typescript
// Required endpoints
POST   /api/portfolios          // Create portfolio
GET    /api/portfolios          // List user portfolios
GET    /api/portfolios/:id      // Get portfolio details
PUT    /api/portfolios/:id      // Update portfolio
DELETE /api/portfolios/:id      // Delete portfolio

POST   /api/portfolios/:id/holdings     // Add holding
PUT    /api/portfolios/:id/holdings/:holdingId  // Update holding
DELETE /api/portfolios/:id/holdings/:holdingId  // Remove holding
```

### Transcript Implementation
```typescript
// Admin endpoints
POST   /api/admin/transcripts   // Upload transcript
PUT    /api/admin/transcripts/:id   // Update transcript
POST   /api/admin/transcripts/:id/generate-summary  // AI summary

// Public endpoints
GET    /api/transcripts         // List transcripts
GET    /api/transcripts/:id     // Get transcript
```

### Earnings Calendar Fix
```typescript
// Improve reliability
- Add multiple provider fallbacks
- Implement aggressive caching
- Store earnings dates in database
- Update via cron job
```

## Database Schemas Needed

### Portfolios (Already exists, needs data)
```sql
-- Tables exist but need real data:
- portfolios
- portfolio_holdings
- portfolio_transactions
```

### Transcripts (Needs creation)
```sql
CREATE TABLE transcripts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticker VARCHAR(10) NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  quarter VARCHAR(10) NOT NULL,
  year INTEGER NOT NULL,
  call_date DATE,
  raw_transcript TEXT,
  ai_summary JSONB,
  status VARCHAR(20) DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  published_at TIMESTAMP,
  view_count INTEGER DEFAULT 0
);

CREATE INDEX idx_transcripts_ticker ON transcripts(ticker);
CREATE INDEX idx_transcripts_status ON transcripts(status);
CREATE INDEX idx_transcripts_date ON transcripts(call_date);
```

### News Cache (Recommended)
```sql
CREATE TABLE news_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticker VARCHAR(10),
  headline VARCHAR(500) NOT NULL,
  summary TEXT,
  url VARCHAR(500) NOT NULL,
  source VARCHAR(100),
  published_at TIMESTAMP NOT NULL,
  sentiment VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_news_ticker ON news_cache(ticker);
CREATE INDEX idx_news_published ON news_cache(published_at);
```

## Testing Checklist

When replacing mock data, ensure:
- [ ] Loading states work correctly
- [ ] Error states handle API failures
- [ ] Data updates in real-time where applicable
- [ ] Caching works to minimize API calls
- [ ] UI gracefully handles empty states
- [ ] Performance remains acceptable
- [ ] Mobile experience is maintained

## Conclusion

The core stock data functionality is now using real data. The remaining mock data is in secondary features that can be implemented incrementally. Priority should be given to portfolios and earnings calendar as these provide immediate value to users.