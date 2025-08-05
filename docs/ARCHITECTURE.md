# Alfalyzer Architecture Documentation

## Overview

Alfalyzer is a financial analysis platform deployed across three cloud services for optimal performance and cost-efficiency.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         USERS                               │
└─────────────────────────────────┬───────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    VERCEL (Frontend)                        │
│                 alfalyzer.vercel.app                        │
│                                                             │
│  • React + TypeScript + Vite                                │
│  • Static site generation                                   │
│  • Edge functions for optimal performance                   │
│  • Automatic SSL/HTTPS                                      │
└─────────────────────────────────┬───────────────────────────┘
                                  │
                          API Requests
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    COOLIFY (Backend)                          │
│           alfalyzer-4rjhp-coolify.app                         │
│                                                             │
│  • Node.js + Express + TypeScript                           │
│  • RESTful API endpoints                                    │
│  • Market data aggregation                                  │
│  • Multi-provider API management                            │
│  • CORS enabled for Vercel frontend                        │
└────────────┬──────────────────────────┬─────────────────────┘
             │                          │
     Database Queries            External APIs
             │                          │
             ▼                          ▼
┌─────────────────────────┐  ┌──────────────────────────────┐
│   SUPABASE (Database)   │  │   EXTERNAL DATA PROVIDERS    │
│                         │  │                              │
│  • PostgreSQL database  │  │  • Alpha Vantage (primary)   │
│  • Authentication       │  │  • Finnhub (fallback)        │
│  • Real-time features   │  │  • Financial Modeling Prep   │
│  • Row Level Security   │  │  • Twelve Data               │
│  • File storage         │  │  • Polygon.io                │
└─────────────────────────┘  └──────────────────────────────┘
```

## Service Breakdown

### 1. Frontend (Vercel)

**URL**: https://alfalyzer.vercel.app

**Technology Stack**:
- React 18 with TypeScript
- Vite for build tooling
- Tailwind CSS + shadcn/ui for styling
- Wouter for routing
- React Query for data fetching

**Key Features**:
- Server-side rendering for SEO
- Automatic deployments from GitHub
- Global CDN distribution
- Zero-config HTTPS

**Environment Variables**:
```env
VITE_API_URL=https://alfalyzer-4rjhp-coolify.app
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

### 2. Backend (Coolify)

**URL**: https://alfalyzer-4rjhp-coolify.app

**Technology Stack**:
- Node.js with Express
- TypeScript for type safety
- SQLite for local data caching
- Node-cron for scheduled tasks

**API Endpoints**:
- `GET /api/health` - Health check
- `GET /api/stocks/:symbol` - Single stock data
- `GET /api/stocks/batch` - Multiple stock quotes
- `GET /api/search/stocks` - Stock search
- `GET /api/watchlists` - User watchlists
- `POST /api/watchlists` - Create watchlist
- More endpoints for portfolios, transcripts, etc.

**Environment Variables**:
```env
# Database
DATABASE_URL=<supabase-connection-string>
SUPABASE_URL=<your-supabase-url>
SUPABASE_SERVICE_KEY=<your-supabase-service-key>

# API Keys (never expose these to frontend!)
ALPHA_VANTAGE_API_KEY=<your-key>
FINNHUB_API_KEY=<your-key>
FMP_API_KEY=<your-key>
TWELVE_DATA_API_KEY=<your-key>
POLYGON_API_KEY=<your-key>

# App Config
NODE_ENV=production
PORT=8000
```

### 3. Database (Supabase)

**Features**:
- PostgreSQL database
- Built-in authentication
- Real-time subscriptions
- Row Level Security (RLS)
- Auto-generated APIs
- File storage

**Key Tables**:
- `users` - User accounts
- `watchlists` - User watchlists
- `watchlist_items` - Stocks in watchlists
- `portfolios` - User portfolios
- `portfolio_holdings` - Portfolio positions
- `transcripts` - Earnings call transcripts
- `user_preferences` - User settings

## Data Flow

### 1. User requests stock data:
```
User → Vercel Frontend → Coolify Backend → Cache Check
                                            ↓ (if miss)
                                         External API
                                            ↓
                                         Cache Update
                                            ↓
                                         Response → Frontend → User
```

### 2. User manages watchlist:
```
User → Vercel Frontend → Coolify Backend → Supabase
                                            ↓
                                         RLS Check
                                            ↓
                                         Database Update
                                            ↓
                                         Response → Frontend → User
```

## API Provider Strategy

The backend implements a multi-provider fallback system:

1. **Primary**: Alpha Vantage
   - 5 API calls/minute (free tier)
   - 500 calls/day
   - Best for: Real-time quotes, fundamentals

2. **Fallback 1**: Finnhub
   - 60 calls/minute (free tier)
   - Best for: Real-time data, news

3. **Fallback 2**: Financial Modeling Prep
   - 250 calls/day (free tier)
   - Best for: Historical data, financials

4. **Fallback 3**: Twelve Data
   - 8 calls/minute (free tier)
   - 800 calls/day
   - Best for: Technical indicators

5. **Fallback 4**: Polygon.io
   - 5 calls/minute (free tier)
   - Best for: US market data

## Caching Strategy

```typescript
// Cache durations by data type
const CACHE_DURATIONS = {
  QUOTE: 60,          // 1 minute for real-time quotes
  COMPANY: 86400,     // 24 hours for company info
  SEARCH: 3600,       // 1 hour for search results
  FUNDAMENTALS: 3600, // 1 hour for fundamentals
  NEWS: 300,          // 5 minutes for news
};
```

## Security Considerations

### API Key Security
- All sensitive API keys stored in Coolify environment variables
- Never exposed to frontend (no VITE_ prefix)
- Backend acts as proxy for all external API calls

### Database Security
- Supabase Row Level Security (RLS) enabled
- Users can only access their own data
- Service key only used on backend

### CORS Configuration
```typescript
// Backend CORS setup
app.use(cors({
  origin: [
    'https://alfalyzer.vercel.app',
    'http://localhost:5173' // Development
  ],
  credentials: true
}));
```

## Deployment Process

### Frontend (Vercel)
1. Push to GitHub main branch
2. Vercel automatically builds and deploys
3. Preview deployments for pull requests

### Backend (Coolify)
1. Push to GitHub main branch
2. Coolify detects changes
3. Builds Docker container
4. Deploys with zero downtime

### Database (Supabase)
1. Migrations managed through Supabase CLI
2. RLS policies version controlled
3. Automatic backups enabled

## Monitoring & Troubleshooting

### Health Checks
- Frontend: Check https://alfalyzer.vercel.app
- Backend: Check https://alfalyzer-4rjhp-coolify.app/api/health
- Database: Check Supabase dashboard

### Common Issues

#### 1. CORS Errors
- Verify backend CORS configuration
- Check if frontend URL matches allowed origins
- Ensure credentials are included in requests

#### 2. API Rate Limits
- Check cache hit rates
- Monitor API usage in provider dashboards
- Implement request queuing if needed

#### 3. Database Connection
- Verify DATABASE_URL is correct
- Check Supabase service status
- Ensure connection pooling is configured

#### 4. Slow Performance
- Check API response times
- Verify caching is working
- Monitor database query performance
- Check CDN cache hit rates

### Debugging Steps
1. Check browser console for errors
2. Verify backend health endpoint
3. Check Coolify logs for backend errors
4. Review Supabase logs for database issues
5. Verify environment variables are set correctly

## Scaling Considerations

### When to Scale

1. **Frontend**: Vercel auto-scales
2. **Backend**: Scale when:
   - Response times > 500ms consistently
   - Memory usage > 80%
   - API rate limits frequently hit

3. **Database**: Scale when:
   - Queries take > 100ms
   - Storage > 80% of limit
   - Connection pool exhausted

### Scaling Options

1. **Upgrade API Plans**:
   - Alpha Vantage Premium: $50/month
   - Polygon.io Starter: $29/month

2. **Add Redis Cache**:
   - Reduce database load
   - Improve response times
   - Share cache across instances

3. **Horizontal Scaling**:
   - Multiple Coolify instances
   - Load balancer
   - Shared Redis cache

## Cost Analysis

### Current (Free Tier)
- Vercel: $0/month
- Coolify: $0/month
- Supabase: $0/month
- **Total**: $0/month

### Growth Phase
- Vercel Pro: $20/month
- Coolify (2 instances): $10/month
- Supabase Pro: $25/month
- Redis Cloud: $10/month
- **Total**: ~$65/month

### Scale Phase
- Vercel Pro: $20/month
- Coolify (4 instances): $40/month
- Supabase Pro: $25/month
- Redis Cloud: $30/month
- API Upgrades: $100/month
- **Total**: ~$215/month

## Future Enhancements

1. **WebSocket Support**:
   - Real-time price updates
   - Live notifications
   - Collaborative features

2. **Edge Functions**:
   - Geographically distributed API
   - Reduced latency
   - Better caching

3. **Microservices**:
   - Separate services for different features
   - Independent scaling
   - Technology diversity

4. **AI Integration**:
   - ChatGPT for analysis
   - ML for predictions
   - NLP for news sentiment