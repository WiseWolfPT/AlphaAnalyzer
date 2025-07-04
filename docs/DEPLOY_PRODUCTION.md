# 🚀 DEPLOY PRODUCTION - Alfalyzer MVP

**Comprehensive production deployment guide for Alfalyzer Roadmap V4**

## 📋 PRE-DEPLOYMENT CHECKLIST

### ✅ Requirements Validation
- [ ] All smoke tests passing locally
- [ ] Validation checklist successful
- [ ] Environment variables configured
- [ ] Database seed completed
- [ ] GitHub repository ready

## 🗄️ 1. CONFIGURE SUPABASE PROJECT (Production)

### 1.1 Create New Supabase Project
1. Visit [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Choose organization and name: `alfalyzer-prod`
4. Select region closest to users (EU for Portuguese market)
5. Generate strong database password
6. Wait for project initialization (~2 minutes)

### 1.2 Import Database Schema
Execute the following SQL in Supabase SQL Editor:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  subscription_status TEXT DEFAULT 'free',
  is_admin BOOLEAN DEFAULT FALSE
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Stocks table
CREATE TABLE stocks (
  id SERIAL PRIMARY KEY,
  symbol TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  sector TEXT,
  market_cap BIGINT,
  price DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Watchlists table
CREATE TABLE watchlists (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own watchlists" ON watchlists
  FOR ALL USING (auth.uid() = user_id);

-- Watchlist items
CREATE TABLE watchlist_items (
  id SERIAL PRIMARY KEY,
  watchlist_id INTEGER REFERENCES watchlists(id) ON DELETE CASCADE,
  stock_id INTEGER REFERENCES stocks(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(watchlist_id, stock_id)
);

ALTER TABLE watchlist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own watchlist items" ON watchlist_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM watchlists 
      WHERE id = watchlist_id AND user_id = auth.uid()
    )
  );

-- Portfolios table
CREATE TABLE portfolios (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  total_value DECIMAL(12,2) DEFAULT 0,
  cash_balance DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own portfolios" ON portfolios
  FOR ALL USING (auth.uid() = user_id);

-- Portfolio holdings
CREATE TABLE portfolio_holdings (
  id SERIAL PRIMARY KEY,
  portfolio_id INTEGER REFERENCES portfolios(id) ON DELETE CASCADE,
  stock_id INTEGER REFERENCES stocks(id) ON DELETE CASCADE,
  quantity DECIMAL(10,4) NOT NULL,
  average_cost DECIMAL(10,2) NOT NULL,
  current_price DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(portfolio_id, stock_id)
);

ALTER TABLE portfolio_holdings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own portfolio holdings" ON portfolio_holdings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM portfolios 
      WHERE id = portfolio_id AND user_id = auth.uid()
    )
  );

-- Transcripts table
CREATE TABLE transcripts (
  id SERIAL PRIMARY KEY,
  ticker TEXT NOT NULL,
  company_name TEXT NOT NULL,
  quarter TEXT NOT NULL,
  year INTEGER NOT NULL,
  call_date DATE,
  raw_transcript TEXT,
  ai_summary JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'review', 'published')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE,
  view_count INTEGER DEFAULT 0,
  admin_notes TEXT
);

-- Public access for published transcripts
CREATE POLICY "Anyone can view published transcripts" ON transcripts
  FOR SELECT USING (status = 'published');

-- Admin access for management
CREATE POLICY "Admins can manage all transcripts" ON transcripts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- Indexes for performance
CREATE INDEX idx_stocks_symbol ON stocks(symbol);
CREATE INDEX idx_transcripts_ticker ON transcripts(ticker);
CREATE INDEX idx_transcripts_status ON transcripts(status);
CREATE INDEX idx_watchlists_user_id ON watchlists(user_id);
CREATE INDEX idx_portfolios_user_id ON portfolios(user_id);
```

### 1.3 Configure Authentication
1. Go to Authentication → Settings
2. Enable email confirmation: **OFF** (for demo)
3. Enable email confirmations for password changes: **ON**
4. Set Site URL: `https://your-domain.vercel.app`
5. Add redirect URLs: `https://your-domain.vercel.app/**`

### 1.4 Get Environment Variables
1. Go to Settings → API
2. Copy **Project URL** → `SUPABASE_URL`
3. Copy **anon public** key → `SUPABASE_ANON_KEY`
4. Copy **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

## ⚡ 2. CONFIGURE UPSTASH REDIS (Rate Limiting)

### 2.1 Create Upstash Account
1. Visit [Upstash Console](https://console.upstash.com/)
2. Sign up with GitHub (free)
3. Create new Redis database:
   - Name: `alfalyzer-ratelimit`
   - Region: Same as Supabase
   - Type: Free (25k commands/day)

### 2.2 Get Redis Credentials
1. Go to your Redis database
2. Copy **UPSTASH_REDIS_REST_URL**
3. Copy **UPSTASH_REDIS_REST_TOKEN**

## 🌐 3. DEPLOY TO VERCEL (Frontend + Backend)

### 3.1 Prepare Repository
```bash
# Ensure latest changes are committed
git add .
git commit -m "feat: prepare for production deployment"
git push origin main
```

### 3.2 Deploy to Vercel
1. Visit [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import from GitHub: select your repository
4. Configure settings:
   - **Framework Preset**: Vite
   - **Root Directory**: `.` (default)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist/public`

### 3.3 Configure Environment Variables in Vercel
Go to Settings → Environment Variables and add:

**Backend Variables** (Server-side only):
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_upstash_token
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key
TWELVE_DATA_API_KEY=your_twelve_data_key
FMP_API_KEY=your_fmp_key
FINNHUB_API_KEY=your_finnhub_key
JWT_SECRET=your_32_char_random_secret
NODE_ENV=production
```

**Frontend Variables** (Exposed to client):
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_BASE_URL=https://your-domain.vercel.app
```

### 3.4 Deploy
1. Click "Deploy"
2. Wait for build completion (~3-5 minutes)
3. Visit your deployed app at `https://your-project.vercel.app`

## 🔒 4. POST-DEPLOY SECURITY CHECKLIST

### 4.1 Supabase Security
- [ ] **Enable 2FA** on Supabase account
- [ ] **Verify RLS policies** are active on all tables
- [ ] **Check API key permissions** (anon key has correct restrictions)
- [ ] **Review auth settings** (email confirmation disabled for demo)

### 4.2 Vercel Security
- [ ] **Enable 2FA** on Vercel account
- [ ] **Verify environment variables** are correctly set
- [ ] **Check domain settings** (no unauthorized domains)
- [ ] **Review deployment logs** for any exposed secrets

### 4.3 General Security
- [ ] **Scan for exposed secrets** in frontend bundles
- [ ] **Verify HTTPS** is enforced
- [ ] **Test rate limiting** functionality
- [ ] **Check CORS settings** are restrictive

## 🧪 5. POST-DEPLOY TESTING

### 5.1 Automated Health Checks
```bash
# Test main health endpoint
curl -s https://your-domain.vercel.app/api/health

# Test KV monitoring
curl -s https://your-domain.vercel.app/api/health/kv

# Test rate limiting headers
curl -I https://your-domain.vercel.app/api/health | grep -i ratelimit
```

### 5.2 Manual Testing Checklist
- [ ] **Landing page loads** correctly
- [ ] **Login with demo user** (demo+1@alfalyzer.com / Demo123!@#)
- [ ] **Dashboard shows data** (real or mock fallback)
- [ ] **Navigation works** between pages
- [ ] **Admin panel accessible** (admin users only)
- [ ] **Rate limiting triggers** after 30 requests/minute
- [ ] **Mobile responsive** design works

### 5.3 Performance Testing
- [ ] **Page load time** < 2 seconds
- [ ] **API response time** < 1 second
- [ ] **TTFB** < 300ms for cached responses
- [ ] **No console errors** on any page

## 📊 6. MONITORING & OBSERVABILITY

### 6.1 Upstash Monitoring
1. Check KV usage dashboard: `https://your-domain.vercel.app/api/health/kv`
2. Monitor daily quota: 100k operations
3. Set up alerts when usage ≥ 90%

### 6.2 GitHub Actions Monitoring
The deployed app includes automated monitoring:
- **Daily KV usage check** at 07:30 UTC
- **Automatic alerts** when quota usage ≥ 90%
- **Manual trigger** available for immediate checks

### 6.3 Vercel Analytics
1. Enable Vercel Analytics in project settings
2. Monitor Core Web Vitals
3. Track user sessions and page views

## 🆘 7. TROUBLESHOOTING GUIDE

### Common Issues & Solutions

#### ❌ "Supabase connection failed"
```bash
# Check environment variables
echo $SUPABASE_URL
echo $SUPABASE_ANON_KEY

# Test connection manually
curl -H "apikey: $SUPABASE_ANON_KEY" "$SUPABASE_URL/rest/v1/"
```

#### ❌ "Rate limiting not working"
```bash
# Check Upstash connection
curl -s https://your-domain.vercel.app/api/health/kv

# Should show: "status": "healthy"
```

#### ❌ "Admin panel access denied"
1. Check user has `is_admin: true` in Supabase users table
2. Verify JWT token includes admin claim
3. Check middleware authentication logic

#### ❌ "Build fails on Vercel"
1. Check build logs for specific errors
2. Verify all dependencies are in package.json
3. Ensure environment variables are set
4. Check for TypeScript errors

### Emergency Rollback
If deployment fails completely:
```bash
# Revert to previous Vercel deployment
vercel rollback <deployment-url>

# Or redeploy from last known good commit
git reset --hard <last-good-commit>
git push --force origin main
```

## ✅ 8. SUCCESS CRITERIA

### Production Ready Checklist
- [ ] **All health endpoints** returning 200 OK
- [ ] **Demo login** working (demo+1@alfalyzer.com)
- [ ] **Real-time data** displaying (or graceful mock fallback)
- [ ] **Admin panel** accessible to admin users
- [ ] **Rate limiting** enforced (30 req/min)
- [ ] **KV monitoring** tracking usage < 100k/day
- [ ] **No console errors** on production
- [ ] **Mobile responsive** design
- [ ] **Performance** metrics within targets
- [ ] **Security** checklist completed

### Expected Response Format
When ALL criteria are met, health check returns:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "environment": "production",
  "features": {
    "auth": "enabled",
    "rateLimit": "active",
    "kvMonitoring": "healthy",
    "realTimeData": "available"
  }
}
```

## 🚀 9. GO-LIVE FINAL STEPS

### 9.1 DNS Configuration (Optional)
If using custom domain:
1. Add domain in Vercel project settings
2. Configure DNS CNAME: `your-domain.com` → `cname.vercel-dns.com`
3. Wait for SSL certificate generation

### 9.2 Analytics Setup
1. Add Google Analytics 4 property
2. Configure conversion tracking
3. Set up user journey funnels

### 9.3 Launch Announcement
1. Update social media profiles
2. Prepare launch blog post
3. Notify early beta users
4. Share on relevant Portuguese finance communities

---

## 📞 SUPPORT & MAINTENANCE

### Regular Maintenance Tasks
- **Weekly**: Check Upstash KV usage
- **Monthly**: Review Supabase storage and API usage
- **Quarterly**: Security audit and dependency updates

### Monitoring Endpoints
- **Health Check**: `https://your-domain.vercel.app/api/health`
- **KV Usage**: `https://your-domain.vercel.app/api/health/kv`
- **Admin Dashboard**: `https://your-domain.vercel.app/admin`

### Emergency Contacts
- **Supabase Support**: [support@supabase.io](mailto:support@supabase.io)
- **Vercel Support**: [vercel.com/support](https://vercel.com/support)
- **Upstash Support**: [support@upstash.com](mailto:support@upstash.com)

---

**🎯 Created by Claude Opus 4 - Production Deployment Guide**  
**📅 Last Updated:** 2025-07-04  
**🚀 Ready for Alfalyzer MVP Launch**