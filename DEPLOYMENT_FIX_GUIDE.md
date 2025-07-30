# 🚨 CRITICAL DEPLOYMENT FIX GUIDE

## Current Issue Analysis

Your Koyeb deployment is failing because:
1. **Port Configuration**: Server hardcoded to 3001, but Koyeb sets PORT env var (usually 8000)
2. **Health Check Timing**: Koyeb checks health before TypeScript server fully starts
3. **CORS Configuration**: Already correct, but frontend can't reach unhealthy backend

## Solution 1: Fix Koyeb Deployment

### Step 1: Test Locally
```bash
# Run the test script
./test-koyeb-locally.sh
```

### Step 2: Commit Changes
```bash
git add koyeb-server-fixed.js package.json test-koyeb-locally.sh
git commit -m "fix: Koyeb deployment with proper PORT handling and health checks"
git push origin phase-0-main
```

### Step 3: Update Koyeb Configuration
1. Go to Koyeb Dashboard
2. Update your service:
   - **Build command**: `npm install`
   - **Start command**: `npm start` (now uses fixed server)
   - **Port**: Leave empty (Koyeb will set PORT env var)
   - **Health check path**: `/health`
   - **Health check port**: Leave as "exposed port"

### Step 4: Add Environment Variables in Koyeb
Make sure all your API keys are set:
```
ALPHA_VANTAGE_API_KEY=your_key
FINNHUB_API_KEY=your_key
FMP_API_KEY=your_key
TWELVE_DATA_API_KEY=your_key
POLYGON_API_KEY=your_key
SUPABASE_URL=your_url
SUPABASE_ANON_KEY=your_key
FRONTEND_URL=https://alfalyzerpro4.vercel.app
```

### Step 5: Redeploy
Click "Redeploy" in Koyeb dashboard

## Solution 2: Migrate to Railway (RECOMMENDED)

Railway is more reliable and easier to configure. Here is how:

### Step 1: Sign up for Railway
1. Go to [railway.app](https://railway.app)
2. Sign in with GitHub
3. You get $5 free credits monthly

### Step 2: Deploy from GitHub
```bash
# First, commit all changes
git add .
git commit -m "feat: Add Railway deployment configuration"
git push origin phase-0-main
```

### Step 3: Create New Project in Railway
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose your repository
4. Railway will auto-detect Node.js

### Step 4: Configure Environment Variables
In Railway dashboard, add all your environment variables:
```
NODE_ENV=production
ALPHA_VANTAGE_API_KEY=your_key
FINNHUB_API_KEY=your_key
FMP_API_KEY=your_key
TWELVE_DATA_API_KEY=your_key
POLYGON_API_KEY=your_key
SUPABASE_URL=your_url
SUPABASE_ANON_KEY=your_key
FRONTEND_URL=https://alfalyzerpro4.vercel.app
```

### Step 5: Deploy
Railway will automatically:
- Build your app
- Assign a URL like `alfalyzer-api.up.railway.app`
- Start with the correct PORT
- Handle health checks properly

### Step 6: Update Frontend
Update your Vercel frontend environment variable:
```
VITE_API_URL=https://alfalyzer-api.up.railway.app
```

## Quick Comparison

| Feature | Koyeb | Railway |
|---------|-------|---------|
| Free Tier | $5.50/month | $5/month |
| Setup Difficulty | Complex | Simple |
| Cold Starts | Yes (after 1hr) | No |
| Custom Domains | Yes | Yes |
| Auto Deploy | Yes | Yes |
| Health Checks | Strict | Flexible |
| Support | Limited | Good |

## Emergency Alternative: Use Render.com

If both fail, try Render:

1. Create account at [render.com](https://render.com)
2. New > Web Service > Connect GitHub
3. Use these settings:
   - Build: `npm install`
   - Start: `npm start`
   - Free tier available (with cold starts)

## Testing Your Deployment

Once deployed, test with:

```bash
# Test health endpoint
curl https://your-backend-url/health

# Test CORS
curl -X OPTIONS https://your-backend-url/api/stocks \
  -H "Origin: https://alfalyzerpro4.vercel.app" \
  -H "Access-Control-Request-Method: GET" -v

# Test API
curl https://your-backend-url/api/stocks/AAPL \
  -H "Origin: https://alfalyzerpro4.vercel.app"
```

## If Everything Fails

Contact me with:
1. Full Koyeb logs
2. Browser console errors
3. Network tab screenshots

The fixed server (`koyeb-server-fixed.js`) addresses all known issues:
- ✅ Uses process.env.PORT
- ✅ Immediate health check response
- ✅ Proper 0.0.0.0 binding
- ✅ Self-ping to prevent sleep
- ✅ Graceful shutdown

This SHOULD work. If not, Railway is your best alternative.
EOF < /dev/null