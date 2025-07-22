# Alfalyzer Deployment Fix Guide - Real Data vs Mock Data

## Overview

The Alfalyzer application is designed to display real market data when properly configured API keys are available. However, it falls back to mock/demo data when API keys are missing or invalid. This guide helps ensure your deployments show real data.

## Current Issue Analysis

The application uses a hierarchical fallback system:
1. **Primary**: Real API data (when valid API keys are configured)
2. **Fallback**: Yahoo Finance (no API key required, but limited)
3. **Final Fallback**: Mock/demo data (when all APIs fail)

### Key Files Involved
- **Backend API Routes**: `/server/routes/market-data.ts`
- **Market Data Service**: `/server/services/market-data-service.ts`
- **Frontend Hooks**: `/client/src/hooks/use-market-data.ts`
- **Data Aggregator**: `/client/src/services/data-aggregator.ts`

## Step-by-Step Deployment Checklist

### 1. Pre-Deployment Verification

#### A. Verify API Keys Locally
```bash
# Check if environment variables are set
echo "Checking API Keys..."
echo "FINNHUB: ${FINNHUB_API_KEY:0:10}..." 
echo "ALPHA_VANTAGE: ${ALPHA_VANTAGE_API_KEY:0:10}..."
echo "FMP: ${FMP_API_KEY:0:10}..."
echo "TWELVE_DATA: ${TWELVE_DATA_API_KEY:0:10}..."
```

#### B. Test API Keys
```bash
# Test Finnhub
curl "https://finnhub.io/api/v1/quote?symbol=AAPL&token=$FINNHUB_API_KEY"

# Test Alpha Vantage
curl "https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL&apikey=$ALPHA_VANTAGE_API_KEY"

# Test Twelve Data
curl "https://api.twelvedata.com/quote?symbol=AAPL&apikey=$TWELVE_DATA_API_KEY"

# Test FMP
curl "https://financialmodelingprep.com/api/v3/quote/AAPL?apikey=$FMP_API_KEY"
```

### 2. Environment Configuration

#### A. Required Environment Variables

**Backend (.env):**
```bash
# Server Configuration
NODE_ENV=production
PORT=3001

# API Keys (REQUIRED for real data)
FINNHUB_API_KEY=your_actual_finnhub_key_here
ALPHA_VANTAGE_API_KEY=your_actual_alpha_vantage_key_here
FMP_API_KEY=your_actual_fmp_key_here
TWELVE_DATA_API_KEY=your_actual_twelve_data_key_here

# Optional but recommended
POLYGON_API_KEY=your_polygon_key_here

# Supabase (Required)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key
SUPABASE_ANON_KEY=your_supabase_anon_key

# Authentication
JWT_SECRET=your_jwt_secret_here
```

**Frontend (.env):**
```bash
# Only VITE_ prefixed variables are accessible in frontend
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=https://your-backend-url.com
```

#### B. Validate Configuration
The backend validates API keys on startup. Keys are considered invalid if they:
- Equal 'demo'
- Start with 'demo_'
- Contain '_here'
- Are shorter than 10 characters

### 3. Vercel Deployment

#### A. Configure Environment Variables
```bash
# Add all backend variables to Vercel
vercel env add FINNHUB_API_KEY production
vercel env add ALPHA_VANTAGE_API_KEY production
vercel env add FMP_API_KEY production
vercel env add TWELVE_DATA_API_KEY production
vercel env add SUPABASE_URL production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add SUPABASE_ANON_KEY production
vercel env add JWT_SECRET production

# Add frontend variables
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
vercel env add VITE_API_URL production
```

#### B. Deploy Commands
```bash
# Build and deploy
npm run build
vercel --prod

# Or use the deployment script
./deploy-vercel.sh
```

#### C. Verify Deployment
1. Check build logs for API key validation messages
2. Visit `/api/health` endpoint to verify API configuration
3. Check `/api/market-data/quote/AAPL` for real data

### 4. Koyeb Deployment

#### A. Configure Environment Variables in Koyeb Dashboard
1. Go to your Koyeb app settings
2. Navigate to Environment Variables
3. Add all backend environment variables
4. Ensure "Expose as build variable" is checked for VITE_ variables

#### B. Deploy via Git
```bash
# Ensure Dockerfile.koyeb is present
git add .
git commit -m "Deploy with real API keys"
git push origin main
```

#### C. Manual Deploy via Koyeb CLI
```bash
koyeb deploy . \
  --app alfalyzer \
  --env FINNHUB_API_KEY=$FINNHUB_API_KEY \
  --env ALPHA_VANTAGE_API_KEY=$ALPHA_VANTAGE_API_KEY \
  --env FMP_API_KEY=$FMP_API_KEY \
  --env TWELVE_DATA_API_KEY=$TWELVE_DATA_API_KEY
```

### 5. Post-Deployment Verification

#### A. Health Check
```bash
# Check API health
curl https://your-app.vercel.app/api/health

# Expected response should show configured APIs
{
  "status": "ok",
  "apiKeysConfigured": {
    "FINNHUB": true,
    "alphaVantage": true,
    "fmp": true,
    "twelveData": true
  }
}
```

#### B. Test Real Data Endpoint
```bash
# Test quote endpoint
curl https://your-app.vercel.app/api/market-data/quote/AAPL

# Response should include:
# - Real-time price data
# - "provider" field showing which API was used
# - "_cached": false for fresh data
```

#### C. Frontend Verification
1. Visit the dashboard at `/find-stocks`
2. Open browser DevTools Console
3. Look for logs showing:
   - "🚀 Trying [provider] (real key)"
   - "✅ Successfully fetched [symbol] from [provider]"
4. Check Network tab for `/api/market-data/quotes/batch` calls

## Common Issues and Solutions

### Issue 1: Still Seeing Mock Data

**Symptoms:**
- Prices don't change
- All stocks show the same timestamp
- Console shows "Using fallback data"

**Solutions:**
1. **Check API Key Format**:
   ```bash
   # Keys should NOT contain:
   - The word 'demo'
   - Placeholder text like 'your_key_here'
   - Be shorter than 10 characters
   ```

2. **Verify Environment Variables Are Loaded**:
   - Add logging to `/server/config/env.ts`
   - Check server startup logs for key validation

3. **Clear Cache**:
   ```bash
   # Clear browser cache
   localStorage.clear()
   
   # Clear server cache (restart server)
   pm2 restart alfalyzer
   ```

### Issue 2: Rate Limit Errors

**Symptoms:**
- "Too many requests" errors
- Data stops updating
- Console shows "Rate limit exceeded"

**Solutions:**
1. **Check Rate Limit Status**:
   ```javascript
   // In browser console
   localStorage.getItem('alfalyzer-rate-limit')
   ```

2. **Implement Rotation**:
   - The system automatically rotates between providers
   - Ensure multiple API keys are configured

3. **Adjust Cache Duration**:
   - Increase cache TTL in `/server/routes/market-data.ts`
   - Default is 60 seconds, can increase to 5 minutes

### Issue 3: CORS Errors

**Symptoms:**
- "CORS policy" errors in console
- Frontend can't reach backend

**Solutions:**
1. **Verify CORS Configuration**:
   ```javascript
   // In server/index.ts
   CORS_ORIGIN: process.env.CORS_ORIGIN || 'https://your-frontend.vercel.app'
   ```

2. **Use Proxy Endpoints**:
   - Frontend should NEVER call external APIs directly
   - Always use `/api/market-data/*` endpoints

### Issue 4: Authentication Issues

**Symptoms:**
- "No authentication" warnings
- Demo token being used

**Solutions:**
1. **Ensure Auth Flow**:
   - User must be logged in for personalized data
   - Development mode allows demo access

2. **Check Token Propagation**:
   ```javascript
   // In browser console
   const token = localStorage.getItem('alfalyzer-auth-token')
   console.log('Auth token exists:', !!token)
   ```

## Testing Procedures

### 1. Local Testing
```bash
# Start with real API keys
export FINNHUB_API_KEY=your_real_key
export ALPHA_VANTAGE_API_KEY=your_real_key
npm run dev

# Test endpoints
curl http://localhost:3001/api/health
curl http://localhost:3001/api/market-data/quote/AAPL
```

### 2. Staging Testing
1. Deploy to a staging environment first
2. Run the verification steps
3. Monitor logs for 5-10 minutes
4. Check that prices update in real-time

### 3. Production Testing
1. Deploy during market hours for immediate verification
2. Monitor error rates in logs
3. Set up alerts for API failures

## API Provider Fallback Order

The system tries providers in this order:
1. **Twelve Data** (800 requests/day)
2. **FMP** (250 requests/day)
3. **Finnhub** (60 requests/minute)
4. **Alpha Vantage** (5 requests/minute)
5. **Yahoo Finance** (no API key required)

## Monitoring and Debugging

### Enable Debug Logging
```javascript
// Add to server startup
process.env.DEBUG = 'alfalyzer:*'
```

### Check Provider Status
```bash
# API status endpoint
curl https://your-app.com/api/market-data/status
```

### View Cache Status
```bash
# Cache metrics endpoint (if implemented)
curl https://your-app.com/api/cache/stats
```

## Emergency Fallback

If all APIs fail:
1. **Enable Yahoo Finance Only Mode**:
   ```javascript
   // In market-data-service.ts
   const USE_YAHOO_ONLY = true
   ```

2. **Implement Static Data Mode**:
   - Create a JSON file with recent market data
   - Update periodically via cron job

3. **Use Cached Data Longer**:
   - Increase cache TTL to 1 hour
   - Show "delayed quotes" warning to users

## Best Practices

1. **Always Use Multiple API Providers**
   - Reduces single point of failure
   - Distributes rate limit load

2. **Monitor API Usage**
   - Track quota consumption
   - Set up alerts at 80% usage

3. **Implement Graceful Degradation**
   - Show cached data with timestamp
   - Indicate when data is stale

4. **Regular Health Checks**
   - Automated tests every 5 minutes
   - Alert on consecutive failures

## Deployment Scripts

### Quick Deploy Script
```bash
#!/bin/bash
# deploy-with-verification.sh

echo "🚀 Starting deployment with verification..."

# 1. Validate environment
if [ -z "$FINNHUB_API_KEY" ]; then
    echo "❌ ERROR: FINNHUB_API_KEY not set"
    exit 1
fi

# 2. Build
npm run build || exit 1

# 3. Deploy
vercel --prod || exit 1

# 4. Wait for deployment
sleep 30

# 5. Verify
DEPLOY_URL=$(vercel ls --json | jq -r '.[0].url')
curl -s "$DEPLOY_URL/api/health" | jq .

echo "✅ Deployment complete!"
```

## Contact for Help

If you continue to see mock data after following this guide:
1. Check server logs for specific error messages
2. Verify API keys are valid by testing directly with curl
3. Ensure the backend is properly deployed and accessible
4. Check browser console for client-side errors

Remember: The system is designed to fail gracefully. If you see any data at all, the app is working - the question is whether it's using real or mock data sources.

## Critical Mock Data Issues Found in Codebase

### Issue Analysis Summary

After thorough code analysis, I've identified several locations where mock data is hardcoded regardless of API configuration:

#### 1. **Client-Side Chart Data (HIGH PRIORITY)**
**File**: `/client/src/services/data-aggregator.ts`

The following methods always return mock data:
- `processHistoricalPrices()` - Returns fake 30-day price history
- `processRevenueSegments()` - Returns fake revenue breakdown
- `processReturnOfCapitalData()` - Returns fake capital return data
- `processRatiosData()` - Returns fake P/E, ROE, ROA ratios
- `processValuationData()` - Returns fake valuation metrics

**Impact**: Even with real-time quotes working, all charts show fake data.

#### 2. **Search Functionality (MEDIUM PRIORITY)**
**File**: `/server/routes/market-data.ts` (lines 643-652)

The `/api/market-data/search` endpoint returns a hardcoded list of 5 stocks (AAPL, GOOGL, MSFT, AMZN, TSLA) instead of real search results.

**Impact**: Users can only search within these 5 predefined stocks.

#### 3. **Market Overview Indices (MEDIUM PRIORITY)**
**File**: `/server/routes/market-data.ts` (lines 681-706)

The `/api/market-data/market-overview` endpoint returns hardcoded values for S&P 500, NASDAQ, DOW, and VIX with random variations.

**Impact**: Market indices don't reflect real market conditions.

### Quick Fixes to Enable Real Data

#### Fix 1: Enable Real Historical Price Data
Replace the mock implementation in `processHistoricalPrices()`:

```typescript
private async processHistoricalPrices(symbol: string): Promise<Array<{ date: string; price: number }>> {
  try {
    // Use Alpha Vantage TIME_SERIES_DAILY
    const response = await fetch(
      `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${API_KEYS.ALPHA_VANTAGE}`
    );
    const data = await response.json();
    
    if (data['Time Series (Daily)']) {
      const timeSeries = data['Time Series (Daily)'];
      return Object.entries(timeSeries)
        .slice(0, 30)
        .map(([date, values]: [string, any]) => ({
          date,
          price: parseFloat(values['4. close'])
        }))
        .reverse();
    }
  } catch (error) {
    console.error('Failed to fetch historical prices:', error);
  }
  
  // Return empty array instead of mock data
  return [];
}
```

#### Fix 2: Enable Real Search
Replace the mock search in `/server/routes/market-data.ts`:

```typescript
// Add to ServerMarketDataService
async searchSymbols(query: string): Promise<any[]> {
  try {
    // Use Finnhub symbol search
    const response = await fetch(
      `https://finnhub.io/api/v1/search?q=${query}&token=${API_KEYS.FINNHUB}`
    );
    const data = await response.json();
    
    return data.result.map(item => ({
      symbol: item.symbol,
      name: item.description,
      type: item.type,
      exchange: item.exchange
    }));
  } catch (error) {
    console.error('Search failed:', error);
    return [];
  }
}
```

#### Fix 3: Enable Real Market Indices
Replace the mock market overview:

```typescript
// Use Alpha Vantage or FMP for real indices
async getMarketIndices(): Promise<any> {
  try {
    // Example using FMP
    const indices = ['SPY', 'QQQ', 'DIA', 'VIX'];
    const promises = indices.map(symbol => 
      fetch(`https://financialmodelingprep.com/api/v3/quote/${symbol}?apikey=${API_KEYS.FMP}`)
        .then(res => res.json())
    );
    
    const results = await Promise.all(promises);
    
    return {
      sp500: { value: results[0][0].price, change: results[0][0].changePercentage },
      nasdaq: { value: results[1][0].price, change: results[1][0].changePercentage },
      dow: { value: results[2][0].price, change: results[2][0].changePercentage },
      vix: { value: results[3][0].price, change: results[3][0].changePercentage }
    };
  } catch (error) {
    console.error('Failed to fetch indices:', error);
    return null;
  }
}
```

### Verification After Fixes

1. **Check Chart Data**:
   - Navigate to `/stock/AAPL/charts`
   - Open DevTools Network tab
   - Look for calls to historical data endpoints
   - Verify charts show real price movements

2. **Check Search**:
   - Use the search bar to find a non-popular stock (e.g., "ZM" for Zoom)
   - Should return real search results, not just the 5 hardcoded stocks

3. **Check Market Overview**:
   - Dashboard should show real S&P 500, NASDAQ values
   - Values should match current market data
   - Should update during market hours

### Deployment Checklist Addition

Before deploying, ensure:
- [ ] All mock data methods have been replaced or flagged with `TODO` comments
- [ ] API endpoints return real data when valid keys are provided
- [ ] Frontend gracefully handles empty data (no mock fallback)
- [ ] Test with at least 2 different API providers for redundancy

### Priority Order for Fixes

1. **Real-time quotes** - ✅ Already working when API keys configured
2. **Search functionality** - 🔴 Needs implementation
3. **Historical charts** - 🔴 Needs implementation  
4. **Market indices** - 🔴 Needs implementation
5. **Financial statements** - 🔴 Needs implementation

Focus on implementing these in order of user impact. Search and historical charts are most critical for user experience.