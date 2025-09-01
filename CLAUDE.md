# CLAUDE.md - Alfalyzer

Financial analysis platform with real-time market data, earnings transcripts, and advanced charting. Built for Portuguese market focus with global capabilities.

## PRODUCTION STATUS

**URL:** https://128.140.45.28.sslip.io/ ✅ **FUNCIONANDO!**  
**Server:** Hetzner CX22 (128.140.45.28)  
**Status:** 95% Production Ready  
**SSL Certificate:** Valid until 2025-11-16 (auto-renews)

✅ **Working:**
- Frontend loading correctly (CORS fixed)
- Nginx serving static files properly  
- HTTPS functioning at https://128.140.45.28.sslip.io/
- PM2 stable (alfalyzer process)
- Redis connected (256MB, password: alfalyzer2025redis)
- FMP API key valid and working
- All external APIs responding
- Real-time quotes updating

⚠️ **Pending Features:**
- API endpoint /api/market-data/batch needs protection
- Admin panel not implemented
- Transcripts feature missing
- Dashboard navigation improvements

## TECH STACK

**Frontend:** React 18.3.1, TypeScript 5.6.3, Vite 6.0, Tailwind 3.4, shadcn/ui, Wouter 3.3.5  
**Backend:** Node.js 20+, Express 4.21.2, TypeScript  
**Database:** Supabase (PostgreSQL + Auth + Realtime + Storage)  
**Cache:** Redis 6.2+ (256MB configured)
**APIs:** Alpha Vantage, Finnhub, FMP, Twelve Data, Polygon  
**Deployment:** Hetzner CX22 (€3.79/mo) - Frontend e Backend no mesmo servidor com PM2

## PORTS & SERVICES

### Local Development
- **Frontend (Vite):** http://localhost:3000
- **Backend (Express):** http://localhost:3001
- **Redis Cache:** localhost:6379
- **Supabase:** Hosted cloud (not local)

### Production (Hetzner)
- **Public URL:** https://128.140.45.28.sslip.io
- **Nginx:** Port 80/443 (proxies to backend 3001)
- **Backend:** localhost:3001 (internal)
- **Redis:** 127.0.0.1:6379 (password: alfalyzer2025redis)
- **PM2 Process:** alfalyzer

## ARCHITECTURE (UPDATED 2025-09-01)

### Arquitetura Híbrida Viável - €18.78/mês Total
```
┌─────────────────────────────────────────┐
│         1000+ Utilizadores              │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│     NGINX (Hetzner - Port 443/80)       │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│    EXPRESS BACKEND (Hetzner:3001)       │
│    RAM: 200MB                           │
├─────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────────┐ │
│  │Redis Local  │  │PostgreSQL Local  │ │
│  │RAM: 256MB   │  │RAM: 500MB        │ │
│  └─────────────┘  └──────────────────┘ │
│                                         │
│  ┌────────────────────────────────────┐ │
│  │   Supabase Free (Remoto)           │ │
│  │   - Auth (Login/Register)          │ │
│  │   - User Profiles (Leve)           │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**Recursos Confirmados (Hetzner CX22):**
- CPU: 2 vCPUs ✅ Suficiente
- RAM: 4 GB (1.5 GB usado, 2.5 GB livre) ✅
- Disco: 40 GB (5 GB usado, 35 GB livre) ✅
- Capacidade: 1000-2000 users simultâneos

**Data Distribution:**
- **Redis Local**: Cache temporário (preços, news) - TTL 60s a 24h
- **PostgreSQL Local**: Dados pesados (transcripts, portfolios, AI analysis)
- **Supabase Free**: Apenas auth + profiles leves

**Patterns:**
- 3-tier backend: Controllers → Services → Repositories
- API rotation with automatic fallback
- Single Redis cache layer (60s TTL for prices)
- Shared types in `/shared` directory
- Worker updates cache proactively every 60s

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

## DEPLOYMENT COMMANDS ✅ (SSH Key Configured - No Password!)

```bash
npm run deploy       # Build + Deploy to Hetzner (quick)
npm run ship         # Git commit + push + deploy (complete)
./ship-to-production.sh  # Interactive deploy with custom commit message

# Manual deployment if needed:
scp -r dist/* root@128.140.45.28:"/home/teste 1/dist/"
ssh root@128.140.45.28 "pm2 restart alfalyzer"
```

**SSH Setup Complete**: Passwordless deployment configured on 2025-08-25

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
8. ❌ Don't use .toFixed() without null checks
   ```typescript
   // ❌ WRONG - Crashes if value is undefined
   price.toFixed(2)
   
   // ✅ CORRECT - Safe with defensive programming
   (price ?? 0).toFixed(2)
   // or
   price ? price.toFixed(2) : '0.00'
   ```

## KNOWN ISSUES & SOLUTIONS

### Prices showing $0.00
**Cause:** Reddit Strategy serves cached data to minimize API costs
**Solution:** This is intentional! Free users get cached data, premium users will get real-time
**Note:** If API returns HTML instead of JSON, check SERVE_STATIC env variable

### Page crashes with .toFixed() error
**Cause:** Calling .toFixed() on undefined values
**Solution:** Always use defensive programming (see DON'T DO THIS #8)

## CRITICAL FILES

- `/client/src/App.tsx` - Main routes (needs navigation fix)
- `/server/routes/market-data.ts` - API endpoints
- `/client/src/hooks/use-realtime-quotes.ts` - WebSocket logic
- `/server/services/cache/supabase-cache-service.ts` - Caching
- `/server/services/reddit-strategy.ts` - Cache-first data strategy

## SERVER ACCESS

```bash
ssh root@128.140.45.28
cd "/home/teste 1/"
pm2 status              # Check application
pm2 logs alfalyzer      # View logs
pm2 restart alfalyzer   # Restart if needed
```

## ENVIRONMENT VARIABLES

Production file: `/home/teste 1/.env.production`

Key variables:
- `FMP_API_KEY` - Primary data provider (most important)
- `REDIS_PASSWORD=alfalyzer2025redis`
- Supabase keys configured and working

## QUICK FIXES NEEDED

1. **API Protection** (Priority: HIGH)
   ```bash
   # Check if middleware is applied
   grep -n "marketDataApiKey" server/routes/market-data.ts
   ```

2. **Dashboard Navigation** (Priority: HIGH)
   - Cards should link to `/stocks/:symbol`
   - Fix in `/client/src/components/Dashboard.tsx`

3. **TypeScript Errors** (Priority: LOW)
   - Only in test files, not blocking production

---
Last updated: 2025-09-01