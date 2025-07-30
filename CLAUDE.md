# CLAUDE.md - Alfalyzer

Financial analysis platform with real-time market data, earnings transcripts, and advanced charting. Built for Portuguese market focus with global capabilities.

## CURRENT STATE

✅ **Working:**
- Landing page with animations
- Watchlists CRUD operations  
- Intrinsic value calculations
- Basic API integrations
- WebSocket implementation
- Supabase caching

❌ **Broken:**
- Dashboard navigation (cards don't link to charts)
- Mock data in most sections
- Admin panel not implemented
- Transcripts feature missing
- Authentication needs enhancement

🚧 **In Progress:**
- Backend migration: Koyeb → Hetzner CX22 + Coolify

## TECH STACK

**Frontend:** React 18.3.1, TypeScript 5.6.3, Vite 6.0, Tailwind 3.4, shadcn/ui, Wouter 3.3.5  
**Backend:** Node.js 20+, Express 4.21.2, TypeScript  
**Database:** Supabase (PostgreSQL + Auth + Realtime + Storage)  
**APIs:** Alpha Vantage, Finnhub, FMP, Twelve Data, Polygon  
**Deployment:** Vercel (frontend), Hetzner CX22/Coolify (backend €3.79/mo)

## ARCHITECTURE

```
Frontend (Vercel) → Backend API (Hetzner) → Supabase
                                         ↘ External APIs
```

**Patterns:**
- 3-tier backend: Controllers → Services → Repositories
- API rotation with automatic fallback
- Aggressive caching (5min prices, 1hr fundamentals)
- Shared types in `/shared` directory

## KEY CONVENTIONS

1. **Routing: Use Wouter, NOT React Router**
   ```typescript
   // ✅ CORRECT
   import { useLocation } from 'wouter';
   
   // ❌ WRONG
   import { useNavigate } from 'react-router-dom';
   ```

2. **Environment Variables Security**
   - `VITE_` prefix = exposed to client (BE CAREFUL!)
   - No prefix = server only (secure)

3. **Supabase RLS**
   - ALL tables MUST have Row Level Security enabled
   - Create policies for user data isolation

4. **API Fallback Order**
   Alpha Vantage → Finnhub → FMP → Twelve Data → Polygon

5. **File Naming**
   - Components: `PascalCase.tsx`
   - Other files: `kebab-case.ts`
   - No default exports

## DEVELOPMENT COMMANDS

```bash
npm install          # Install dependencies
npm run dev          # Start dev server
npm run build        # Production build
npm test             # Run tests
npm run lint         # Lint code
```

## DATABASE SCHEMA

```sql
-- Main tables (simplified)
users (id, email, created_at)
portfolios (id, user_id, name, created_at)
watchlists (id, user_id, name, symbols[])
transcripts (id, ticker, company_name, quarter, year, content, ai_summary)
cache_quotes (symbol, data, expires_at)
```

## API PATTERNS

```typescript
// All endpoints follow REST conventions
GET    /api/stocks/:symbol/quote
GET    /api/portfolios/:id
POST   /api/watchlists
PUT    /api/portfolios/:id
DELETE /api/watchlists/:id

// Standard error response
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "status": 400
}
```

## DON'T DO THIS

1. ❌ Don't use React Router (use Wouter)
2. ❌ Don't expose secrets with VITE_ prefix  
3. ❌ Don't skip RLS on Supabase tables
4. ❌ Don't make uncached API calls
5. ❌ Don't use `any` type in TypeScript
6. ❌ Don't commit .env files
7. ❌ Don't create new auth systems (use Supabase Auth)

## CRITICAL FILES

- `/client/src/App.tsx` - Main routes (needs navigation fix)
- `/server/routes/market-data.ts` - API endpoints
- `/client/src/hooks/use-realtime-quotes.ts` - WebSocket logic
- `/server/services/cache/supabase-cache-service.ts` - Caching

## QUICK FIXES NEEDED

1. **Dashboard Navigation** (Priority: HIGH)
   - File: `/client/src/components/dashboard/stock-card.tsx`
   - Add Wouter navigation to chart page

2. **Replace Mock Data** (Priority: HIGH)
   - Files: `/client/src/pages/earnings.tsx`, `/portfolios.tsx`
   - Connect to real API endpoints

3. **Admin Panel** (Priority: MEDIUM)
   - Create `/client/src/pages/admin/*`
   - Implement transcript upload feature

---
Last updated: 2025-07-29