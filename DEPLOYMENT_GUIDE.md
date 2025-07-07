# 🚀 ALFALYZER DEPLOYMENT GUIDE

## Zero-Cost Production Deployment

**Architecture**: Vercel (Frontend) + Railway (Backend) + Supabase (Database) + GitHub Actions (CI/CD)

---

## 📋 PRE-DEPLOYMENT CHECKLIST

### 1. GitHub Secrets Setup
Configure these secrets in your GitHub repository settings:

```bash
# Vercel Configuration
VERCEL_TOKEN=                    # Get from vercel.com/account/tokens
VERCEL_ORG_ID=                   # Get from vercel.com/[team]/settings  
VERCEL_PROJECT_ID=               # Get from project settings

# Railway Configuration  
RAILWAY_TOKEN_STAGING=           # Get from railway.app/account/tokens
RAILWAY_TOKEN_PRODUCTION=        # Get from railway.app/account/tokens

# Supabase Configuration
STAGING_SUPABASE_URL=            # Your staging project URL
STAGING_SUPABASE_ANON_KEY=       # Your staging anon key
PRODUCTION_SUPABASE_URL=         # Your production project URL  
PRODUCTION_SUPABASE_ANON_KEY=    # Your production anon key

# API Configuration
STAGING_API_URL=                 # https://your-staging-app.railway.app
PRODUCTION_API_URL=              # https://your-production-app.railway.app

# Optional: Monitoring
SLACK_WEBHOOK=                   # For deployment notifications
```

### 2. Railway Backend Setup

1. **Create Railway Project**:
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli
   
   # Login and create project
   railway login
   railway init
   ```

2. **Configure Environment Variables** in Railway dashboard:
   ```bash
   NODE_ENV=production
   PORT=${{RAILWAY_PORT}}         # Railway auto-assigns
   
   # Supabase
   SUPABASE_URL=https://xxx.supabase.co
   SUPABASE_SERVICE_KEY=xxx       # Service role key (secret)
   
   # Financial APIs
   ALPHA_VANTAGE_API_KEY=xxx
   TWELVE_DATA_API_KEY=xxx
   FMP_API_KEY=xxx
   FINNHUB_API_KEY=xxx
   
   # Cache (Upstash Redis)
   REDIS_URL=redis://xxx.upstash.io:xxx
   UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
   UPSTASH_REDIS_REST_TOKEN=xxx
   
   # AI Integration
   OPENAI_API_KEY=sk-xxx          # Your existing ChatGPT Pro key
   
   # Security
   JWT_SECRET=xxx                 # Generate strong secret
   ```

3. **Deploy to Railway**:
   ```bash
   railway up
   ```

### 3. Vercel Frontend Setup

1. **Create Vercel Project**:
   ```bash
   # Install Vercel CLI
   npm install -g vercel
   
   # Login and deploy
   vercel login
   vercel --prod
   ```

2. **Configure Environment Variables** in Vercel dashboard:
   ```bash
   # These are safe for frontend (VITE_ prefix)
   VITE_API_URL=https://your-app.railway.app
   VITE_SUPABASE_URL=https://xxx.supabase.co  
   VITE_SUPABASE_ANON_KEY=xxx     # Anonymous key (safe to expose)
   ```

### 4. Supabase Database Setup

1. **Create Project** at supabase.com
2. **Run Migration**:
   ```bash
   npm run migrate:supabase
   ```
3. **Enable RLS** on all tables
4. **Configure Auth** (Google OAuth, Magic Links, etc.)

---

## 🔄 DEPLOYMENT WORKFLOW

### Automatic Staging Deployment
- **Trigger**: Push to `develop` branch
- **URL**: https://staging.alfalyzer.com
- **Process**: Build → Test → Deploy → Smoke Tests

### Manual Production Deployment  
- **Trigger**: GitHub Actions manual dispatch
- **URL**: https://alfalyzer.com
- **Process**: Build → Test → Deploy → Approval → Smoke Tests → Release

### Emergency Rollback
```bash
# Via GitHub Actions
gh workflow run deploy.yml -f environment=production -f skip_tests=true

# Via Vercel CLI
vercel rollback --prod

# Via Railway CLI  
railway rollback
```

---

## 🔧 LOCAL DEVELOPMENT

### 1. Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Configure your local environment
# See .env.example for all required variables
```

### 2. Start Development
```bash
# Install dependencies
npm install

# Start both frontend and backend
npm run dev

# Or start individually
npm run frontend  # Vite dev server on :3000
npm run backend   # Express server on :3001
```

### 3. Test Before Deploy
```bash
# Run all tests
npm run test:all

# Run production build locally
npm run build
npm run start
```

---

## 📊 MONITORING & HEALTH CHECKS

### Health Endpoints
- **Frontend**: https://alfalyzer.com
- **API**: https://alfalyzer.com/api/health  
- **KV Cache**: https://alfalyzer.com/api/health/kv

### Automated Monitoring
- **GitHub Actions**: KV usage check every 6 hours
- **Uptime**: Built-in health checks
- **Error Tracking**: Console logs + structured logging
- **Performance**: Web Vitals tracking

### Alerts & Thresholds
- **KV Usage**: Alert at 80%, fail at 90%
- **Response Time**: Target < 300ms for cache hits
- **Error Rate**: Monitor 5xx responses
- **Build Status**: Slack notifications

---

## 🚨 TROUBLESHOOTING

### Common Issues

**Build Failures**:
```bash
# Check dependencies
npm audit fix
npm run check  # TypeScript
npm run lint   # Code quality
```

**Deployment Failures**:
```bash
# Check environment variables
vercel env ls
railway variables

# Check logs  
vercel logs
railway logs
```

**Database Issues**:
```bash
# Test Supabase connection
npm run migrate:status

# Reset if needed
npm run migrate:rollback
npm run migrate:supabase
```

### Performance Issues
- **Slow API**: Check API provider quotas
- **High Memory**: Monitor Redis/cache usage  
- **Bundle Size**: Run `npm run build` and check output

### Security Issues
- **API Keys Exposed**: Check no VITE_ prefix on secrets
- **CORS Errors**: Verify domain configuration
- **Auth Failures**: Check Supabase RLS policies

---

## 📈 SCALING STRATEGY

### Free Tier Limits
- **Vercel**: 100GB bandwidth, 100 builds/month
- **Railway**: $5 credit, 500 hours runtime
- **Supabase**: 2 projects, 500MB database
- **GitHub Actions**: 2000 minutes/month

### Upgrade Path
1. **Railway Pro** ($20/month): Unlimited usage
2. **Vercel Pro** ($20/month): Advanced features  
3. **Supabase Pro** ($25/month): More database/bandwidth
4. **Upstash** ($0.20/100K requests): Redis scaling

---

## ✅ DEPLOYMENT VERIFICATION

After each deployment, verify:

1. **✅ Frontend loads** at https://alfalyzer.com
2. **✅ API responds** at https://alfalyzer.com/api/health
3. **✅ Authentication works** (login/logout)
4. **✅ Find Stocks page** displays data
5. **✅ KV cache operational** via /api/health/kv
6. **✅ No console errors** in browser
7. **✅ Mobile responsive** on different devices

### Production Smoke Test
```bash
# Run automated E2E tests
npm run test:e2e -- --grep "@smoke"

# Manual verification checklist
# [ ] Landing page loads
# [ ] User can sign up/login  
# [ ] Stock search returns results
# [ ] Navigation works correctly
# [ ] Real-time data updates
```

---

## 🎯 SUCCESS METRICS

**Performance Targets**:
- ⚡ First Contentful Paint: < 1.5s
- ⚡ Largest Contentful Paint: < 2.5s  
- ⚡ API Response Time: < 300ms (cached)
- ⚡ Bundle Size: < 200KB gzipped

**Reliability Targets**:
- 🎯 Uptime: > 99.5%
- 🎯 Error Rate: < 1%
- 🎯 Build Success: > 95%
- 🎯 Test Coverage: > 30%

---

## 🆘 SUPPORT

**Quick Links**:
- [GitHub Issues](https://github.com/your-repo/issues)
- [Vercel Docs](https://vercel.com/docs)
- [Railway Docs](https://docs.railway.app)
- [Supabase Docs](https://supabase.com/docs)

**Emergency Contacts**:
- DevOps Issues: GitHub Issues
- Security Issues: Create private issue
- Billing Issues: Platform support channels

---

*Last Updated: 2025-01-06*
*Generated by Claude Code + AGENTE 9 (Deploy Production)*