# CLAUDE.md - Alfalyzer Complete Project Documentation

This file provides comprehensive guidance to Claude Code (claude.ai/code) when working with the Alfalyzer codebase. 
**IMPORTANT: This document was created by Claude Opus 4 with detailed insights for Claude Sonnet to execute efficiently.**

## 🆕 IMPLEMENTATION STATUS (Updated: 2025-06-28)

**RECENT CHANGES:**
- ✅ User dropdown menu implemented in top bar
- ✅ Help and Logout moved from sidebar to dropdown
- ✅ Sidebar visual optimizations completed
- ⏳ All data still using mock - needs real API integration
- ⏳ Supabase migration pending
- ⏳ Stripe integration pending

**SEE ALSO**: `/IMPLEMENTATION_GUIDE.md` for detailed implementation instructions

## 🎯 PROJECT OVERVIEW

**Alfalyzer** is a comprehensive financial analysis platform inspired by Qualtrim, providing real-time market data, earnings transcripts, advanced charts, and investment insights. The platform aims to democratize financial analysis with a focus on the Portuguese market while serving global users.

### Core Value Proposition
- Real-time market data with multiple API fallbacks
- AI-powered earnings transcript summaries (like Qualtrim)
- Advanced charting capabilities
- Portfolio management and watchlists
- Intrinsic value calculations
- Zero-cost initial deployment strategy

## 📁 PROJECT STRUCTURE

```
/alfalyzer/
├── client/                    # React + Vite frontend
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/           # Route pages
│   │   ├── services/        # API integrations
│   │   ├── hooks/           # Custom React hooks
│   │   ├── lib/             # Utilities and helpers
│   │   └── contexts/        # React contexts
│   ├── public/              # Static assets
│   └── dist/               # Build output
├── server/                    # Node.js + Express backend
│   ├── routes/              # API endpoints
│   ├── services/            # Business logic
│   ├── middleware/          # Express middleware
│   ├── db/                  # Database configurations
│   └── types/               # TypeScript types
├── shared/                    # Shared types and schemas
├── migrations/               # Database migrations
├── scripts/                  # Utility scripts
└── docs/                    # Documentation
```

## 🔧 DEVELOPMENT COMMANDS

```bash
# Install dependencies
npm install

# Start development server (both frontend and backend)
npm run dev

# Build for production
npm run build

# Run tests (when implemented)
npm test

# Database migrations
npm run migrate

# Start admin panel only
npm run admin

# Lint and format code
npm run lint
npm run format
```

## 🏗️ ARCHITECTURE

### Technology Stack
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Node.js + Express + TypeScript
- **Database**: SQLite (local) → Supabase (production)
- **Real-time**: WebSockets + Supabase Realtime for price updates
- **Cache**: In-memory + Redis (when scaled)
- **APIs**: Alpha Vantage, Finnhub, FMP, Twelve Data, Polygon (configured)
- **AI**: ChatGPT API for transcript summaries
- **Auth**: Supabase Auth (migrating from JWT + bcrypt)
- **State**: React Query + Context API
- **Routing**: Wouter (NOT React Router!)
- **Deployment**: Vercel/Railway + GitHub Actions

### Key Design Patterns
1. **API Rotation Pattern**: Multiple API providers with automatic fallback
2. **Cache-First Strategy**: Aggressive caching to minimize API calls
3. **Modular Architecture**: Clear separation of concerns
4. **Type Safety**: Shared types between frontend and backend
5. **Progressive Enhancement**: Basic features work without JavaScript

## 📋 CURRENT STATE ANALYSIS

### ✅ What's Working
1. **Landing Page**: Hero with Lottie animation
2. **Basic Dashboard**: Stock cards (but navigation broken)
3. **Watchlists**: CRUD operations functional
4. **Intrinsic Value**: Advanced calculations
5. **Profile/Settings**: User management basics
6. **API Integration**: Multiple providers configured

### ❌ What's Broken/Missing
1. **Dashboard Navigation**: Cards don't navigate to charts
2. **Real Data**: Many sections use mock data
3. **Transcripts**: Not implemented yet
4. **Admin Panel**: Doesn't exist
5. **Earnings Calendar**: Mock data only
6. **Portfolios**: Static mock data
7. **Authentication**: Basic implementation needs enhancement

## ⚠️ CRITICAL SECURITY CONSIDERATIONS

### Environment Variable Security
```bash
# SECURITY WARNING: VITE_ PREFIX EXPOSES VARIABLES TO CLIENT
# -----------------------------------------------------------------
# Variables WITHOUT VITE_ prefix stay on the server (secure)
# Variables WITH VITE_ prefix are exposed in client-side JavaScript
#
# Backend only (.env - NEVER commit):
#   SUPABASE_SERVICE_KEY=...
#   ALPHA_VANTAGE_API_KEY=...
#   TWELVE_DATA_API_KEY=...
#   FMP_API_KEY=...
#   FINNHUB_API_KEY=...
#   POLYGON_API_KEY=...
#   STRIPE_SECRET_KEY=...
#   STRIPE_WEBHOOK_SECRET=...
#
# Frontend build (.env.public - safe to expose):
#   VITE_SUPABASE_URL=...
#   VITE_SUPABASE_ANON_KEY=...
# -----------------------------------------------------------------
```

### Row Level Security (RLS)
All Supabase tables MUST have RLS enabled:
```sql
-- Enable RLS on all tables
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- Create policies for user data isolation
CREATE POLICY "Users can only see own data" ON table_name
  FOR SELECT USING (auth.uid() = user_id);
```

## 🚀 DETAILED IMPLEMENTATION PLAN

### PHASE 1: CRITICAL FIXES (Week 1)

#### 1.1 Fix Dashboard Navigation & Routing
**CRITICAL**: Use Wouter, NOT React Router!
```typescript
// ❌ WRONG - Don't use React Router
import { useNavigate } from 'react-router-dom';

// ✅ CORRECT - Use Wouter
import { useLocation, useRoute } from 'wouter';
const [location, navigate] = useLocation();
```

**File**: `client/src/App.tsx`
- Fix navigation using Wouter's `<Link>` component
- Modify `EnhancedStockCard` to navigate to charts
- Test navigation from dashboard → `/stock/{symbol}/charts`

#### 1.2 Implement Real-time Data
**Files to modify**:
- `client/src/services/real-data-integration.ts`
- `client/src/hooks/use-real-time-stocks.ts`
- `server/routes/market-data.ts`

**Sonnet Instructions**:
- Ensure API keys are properly loaded from environment
- Implement proper error handling and fallback to next API
- Add rate limiting to prevent quota exhaustion
- Cache responses aggressively (5 min for prices, 1 hour for fundamentals)

### PHASE 2: ADMIN PANEL IMPLEMENTATION (Week 2)

#### 2.1 Admin Panel Structure
Create new directory: `client/src/pages/admin/`

**Core Admin Pages**:
```typescript
// admin-dashboard.tsx - Main admin overview
// admin-transcripts.tsx - Transcript management
// admin-users.tsx - User management  
// admin-apis.tsx - API monitoring
// admin-settings.tsx - System settings
```

**Sonnet Instructions**:
- Use same component library as main app (shadcn/ui)
- Implement role-based access control
- Add admin routes to App.tsx with auth guard
- Create AdminLayout component with sidebar navigation

#### 2.2 Transcript Management System
**Backend**: Create `server/services/transcripts/`
```typescript
// transcript-service.ts - Core logic
// transcript-storage.ts - Supabase operations
// chatgpt-integration.ts - AI summaries
```

**Database Schema**:
```sql
CREATE TABLE transcripts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticker TEXT NOT NULL,
  company_name TEXT NOT NULL,
  quarter TEXT NOT NULL,
  year INTEGER NOT NULL,
  call_date DATE,
  raw_transcript TEXT,
  ai_summary JSON,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  published_at TIMESTAMP,
  view_count INTEGER DEFAULT 0
);

CREATE INDEX idx_ticker ON transcripts(ticker);
CREATE INDEX idx_status ON transcripts(status);
```

**Frontend Upload Flow**:
1. Admin uploads transcript text (copy/paste from MarketBeat)
2. System validates and previews
3. Admin generates summary using ChatGPT Pro
4. Admin pastes summary back
5. System publishes to users

**Sonnet Instructions**:
- Create simple textarea for transcript paste
- Add preview mode with speaker identification
- Implement status workflow: pending → review → published
- Add search and filter capabilities

### PHASE 3: FEATURE ENHANCEMENTS (Week 3)

#### 3.1 Earnings Calendar with Real Data
**File**: `client/src/pages/earnings.tsx`

Replace mock data with real earnings dates:
- Use Alpha Vantage earnings calendar endpoint
- Cache upcoming earnings for 24 hours
- Group by week as current UI shows

#### 3.2 Portfolio Management
**Files**: 
- `client/src/pages/portfolios.tsx`
- `server/routes/portfolios.ts`

Implement real portfolio tracking:
- User can add/remove holdings
- Calculate real-time portfolio value
- Track performance over time
- Import/export CSV functionality

#### 3.3 Enhanced Watchlists
Add real-time prices to watchlist items:
- Fetch prices for all watchlist stocks
- Show mini charts (sparklines)
- Add price alerts functionality

### PHASE 4: REFACTORING PLAN (Week 4)

#### 4.1 API Management Refactoring

**Current Issues**:
- API keys scattered across files
- No centralized quota management
- Inefficient fallback logic

**Refactoring Plan**:
```typescript
// server/services/api-manager/
├── api-manager.ts         // Central API orchestrator
├── providers/            
│   ├── alpha-vantage.ts  // Provider-specific logic
│   ├── finnhub.ts
│   ├── fmp.ts
│   └── twelve-data.ts
├── quota-tracker.ts      // Track API usage
├── cache-strategy.ts     // Intelligent caching
└── types.ts             // Shared types
```

**Sonnet Instructions**:
- Create ApiManager singleton class
- Implement provider interface for consistency
- Add quota tracking with Redis/SQLite
- Implement smart caching based on data type
- Add circuit breaker pattern for failed APIs

#### 4.2 Component Library Standardization

**Current Issues**:
- Mixed component styles
- Inconsistent prop interfaces
- Duplicate components

**Refactoring Plan**:
- Standardize on shadcn/ui components
- Create component documentation
- Remove duplicate implementations
- Add Storybook for component preview

#### 4.3 State Management Optimization

**Current Issues**:
- Prop drilling in some components
- Inconsistent data fetching patterns
- No global state management

**Refactoring Plan**:
- Implement Zustand for global state
- Standardize on React Query for server state
- Create custom hooks for common patterns
- Add optimistic updates for better UX

## 🎯 NEW FEATURES ROADMAP

### 1. AI-Powered Features
- **AI Stock Assistant**: Chat interface for stock questions
- **Smart Alerts**: AI-detected unusual market movements
- **Sentiment Analysis**: Social media sentiment tracking
- **Earnings Prediction**: ML model for earnings estimates

### 2. Social Features
- **User Portfolios Sharing**: Share portfolio performance
- **Discussion Forums**: Stock-specific discussions
- **Expert Insights**: Verified analyst contributions
- **Copy Trading**: Follow successful investors

### 3. Advanced Analytics
- **Backtesting Engine**: Test investment strategies
- **Risk Analytics**: Portfolio risk assessment
- **Correlation Matrix**: Asset correlation analysis
- **Options Analytics**: Options chain analysis

### 4. Mobile App (Progressive Web App)
- **Offline Support**: View cached data offline
- **Push Notifications**: Price alerts, news
- **Biometric Auth**: Face/Touch ID
- **Widget Support**: Home screen widgets

## 🔐 SECURITY CONSIDERATIONS

### Critical Security Tasks
1. **API Key Security**: Move all keys to environment variables
2. **Input Validation**: Sanitize all user inputs
3. **SQL Injection**: Use parameterized queries
4. **XSS Prevention**: Sanitize rendered content
5. **Rate Limiting**: Implement per-user rate limits
6. **Authentication**: Add 2FA support
7. **Data Encryption**: Encrypt sensitive data at rest

**Sonnet Instructions**:
- Never commit API keys to repository
- Use helmet.js for security headers
- Implement CORS properly
- Add request validation middleware
- Log security events for monitoring

## 📊 PERFORMANCE OPTIMIZATION

### Key Optimizations Needed
1. **Code Splitting**: Lazy load routes and components
2. **Image Optimization**: Use WebP, lazy loading
3. **Bundle Size**: Analyze and reduce bundle size
4. **API Response Caching**: Cache at multiple levels
5. **Database Indexing**: Add indexes for common queries
6. **CDN Integration**: Serve static assets from CDN
7. **Service Worker**: Cache for offline support

## 🚀 DEPLOYMENT STRATEGY

### Zero-Cost Initial Deployment
```bash
Frontend: Vercel (free tier)
Backend: Railway.app (free tier)
Database: Supabase (free tier - includes auth, realtime, storage)
Domain: alfalyzer.vercel.app (free)
SSL: Automatic (free)
Monitoring: LogRocket (free tier) + Prometheus
Analytics: Google Analytics (free)
CI/CD: GitHub Actions (free for public repos)
```

### Scaling Strategy
When revenue allows:
1. Upgrade to paid hosting tiers
2. Add Redis for caching
3. Implement CDN (Cloudflare)
4. Add monitoring (Sentry)
5. Database replication
6. Load balancing

## 🆘 BACKUP API OPTIONS

### When Primary APIs Fail
```typescript
// 1. POLYGON.IO (5 calls/minute free)
// - Great for US market data
// - REST + WebSocket support

// 2. YAHOO FINANCE (via yfinance)
// - Unlimited calls (use responsibly)
// - Python microservice recommended
// - WARNING: Non-commercial use only

// 3. MARKETSTACK (1000 calls/month)
// - End-of-day data
// - Good for historical data
```

## 📝 IMPLEMENTATION PRIORITIES FOR SONNET

### Week 1 Priority Tasks
1. **Fix dashboard navigation** (2 hours)
2. **Implement basic admin panel** (2 days)
3. **Add transcript upload feature** (1 day)
4. **Fix real-time data integration** (1 day)
5. **Add basic authentication to admin** (4 hours)

### Week 2 Priority Tasks
1. **Complete transcript management** (2 days)
2. **Add user management to admin** (1 day)
3. **Implement API monitoring dashboard** (1 day)
4. **Add basic analytics** (1 day)

### Week 3 Priority Tasks
1. **Real earnings calendar data** (1 day)
2. **Portfolio management system** (2 days)
3. **Enhanced watchlists with prices** (1 day)
4. **Performance optimizations** (1 day)

### Week 4 Priority Tasks
1. **API management refactoring** (2 days)
2. **Component standardization** (1 day)
3. **Security audit and fixes** (1 day)
4. **Deployment and testing** (1 day)

## 🤖 SPECIAL INSTRUCTIONS FOR SONNET

### Code Quality Standards
1. **Always use TypeScript** with strict mode
2. **Follow existing patterns** in the codebase
3. **Write self-documenting code** (avoid comments)
4. **Use meaningful variable names**
5. **Keep functions small** (< 50 lines)
6. **Handle errors properly** (no silent failures)
7. **Add loading and error states** to all async operations
8. **Accessibility**: Follow WCAG 2.1 AA standards
9. **i18n Ready**: Use constants for all user-facing text
10. **Mobile First**: Test on mobile devices first

### Testing Requirements
1. **Test critical paths** (auth, payments, data)
2. **Add error boundary components**
3. **Test on mobile devices**
4. **Validate in different browsers**
5. **Check accessibility** (WCAG 2.1 AA)
6. **Unit tests** using Vitest for hooks and services
7. **Integration tests** for API endpoints
8. **E2E tests** for critical user flows
9. **Performance tests** for data-heavy pages
10. **Security tests** for auth and payments

### Performance Guidelines
1. **Lazy load all routes**
2. **Debounce search inputs** (300ms)
3. **Throttle scroll handlers** (100ms)
4. **Use React.memo** for expensive components
5. **Implement virtual scrolling** for long lists

### Git Commit Standards
```bash
feat: Add new feature
fix: Bug fix
refactor: Code refactoring
docs: Documentation updates
style: Formatting changes
test: Test additions/changes
chore: Maintenance tasks
```

## 📊 MONITORING & OBSERVABILITY

### API Usage Monitoring
```typescript
// server/middleware/api-monitor.ts
export const apiMonitor = {
  trackRequest: (provider: string, endpoint: string) => {
    // Log to Prometheus/console
    console.log(`📊 API Call: ${provider} - ${endpoint}`);
  },
  
  checkQuotaUsage: async () => {
    const usage = await getAPIUsageStats();
    if (usage.percentage > 80) {
      console.warn(`⚠️ API quota at ${usage.percentage}% for ${usage.provider}`);
    }
  }
};
```

### Real-time Data Strategy
```typescript
// Use WebSocket + Supabase Realtime
// Backend: Connect to TwelveData WebSocket
// Broadcast to Supabase Realtime channel
// Frontend: Subscribe to channel for updates
// Fallback: Polling every 60 seconds if WebSocket fails
```

### Performance Monitoring
- Monitor WebSocket connections
- Track Supabase Realtime subscriptions
- Log client-side errors to Sentry
- Performance metrics with Web Vitals

## 🚀 CI/CD PIPELINE

### GitHub Actions Workflow
- Lint and type check on every PR
- Run tests before merge
- Security audit with npm audit
- Check for exposed secrets
- Auto-deploy to staging on develop branch
- Manual approval for production deploy

## 📚 ADDITIONAL RESOURCES FOR SONNET

### API Documentation Links
- Alpha Vantage: https://www.alphavantage.co/documentation/
- Finnhub: https://finnhub.io/docs/api
- FMP: https://site.financialmodelingprep.com/developer/docs
- Twelve Data: https://twelvedata.com/docs

### UI Component Libraries
- Shadcn/ui: https://ui.shadcn.com/
- Tailwind CSS: https://tailwindcss.com/docs
- Recharts: https://recharts.org/
- Framer Motion: https://www.framer.com/motion/

### Key Dependencies Versions
```json
{
  "react": "^18.2.0",
  "typescript": "^5.0.0",
  "vite": "^5.0.0",
  "tailwindcss": "^3.3.0",
  "express": "^4.18.0",
  "@supabase/supabase-js": "^2.39.0",
  "wouter": "^3.0.0",
  "@tanstack/react-query": "^5.0.0",
  "vitest": "^1.0.0",
  "stripe": "^14.0.0"
}
```

## 🎯 SUCCESS METRICS

### Week 1 Goals
- [ ] Dashboard navigation working
- [ ] Basic admin panel deployed
- [ ] 5+ transcripts uploaded
- [ ] Real-time prices showing

### Week 2 Goals
- [ ] Full transcript management
- [ ] 20+ transcripts published
- [ ] User management functional
- [ ] API monitoring active

### Week 3 Goals
- [ ] Real earnings calendar
- [ ] Portfolio tracking working
- [ ] Enhanced watchlists
- [ ] Performance improved

### Week 4 Goals
- [ ] Refactoring complete
- [ ] Security audit passed
- [ ] Deployed to production
- [ ] First users onboarded

---

## ⚠️ COMMON PITFALLS TO AVOID

### DON'T DO THIS
```typescript
// ❌ Don't create new auth systems (use Supabase Auth)
// ❌ Don't use React Router (use Wouter)
// ❌ Don't expose API keys with VITE_ prefix
// ❌ Don't make API calls without caching
// ❌ Don't forget RLS policies on new tables
// ❌ Don't skip error and loading states
// ❌ Don't ignore mobile responsiveness
```

### ALWAYS DO THIS
```typescript
// ✅ Check if component exists before creating
// ✅ Use TypeScript strict mode
// ✅ Handle loading and error states
// ✅ Cache API responses appropriately
// ✅ Test on mobile devices
// ✅ Follow existing patterns
// ✅ Add aria-labels for accessibility
// ✅ Use environment variables correctly
// ✅ Enable RLS on all Supabase tables
// ✅ Write tests for critical paths
```

**Document created by Claude Opus 4 on June 23, 2025**
**Updated with security and implementation improvements on June 28, 2025**
**For questions about implementation details, Sonnet should refer to this document first**