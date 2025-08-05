# Vercel Deployment Guide for Alfalyzer

## Issue Fixed
The frontend was showing mock data because it was configured to proxy API requests to the wrong Coolify URL.

## What Was Changed
1. Updated `client/vercel.json` to use the correct Coolify backend URL: `https://crucial-ivonne-alfalyzer-90666a9e.coolify.app`
2. Created proper environment variable files for different environments

## Environment Variables to Set in Vercel

Go to your Vercel project settings and add these environment variables:

### Required Variables
```
VITE_API_URL=https://crucial-ivonne-alfalyzer-90666a9e.coolify.app
```

### Optional Variables (if using Supabase)
```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## How the API Connection Works

1. **Direct API calls**: The frontend makes requests to `VITE_API_URL` (e.g., `https://crucial-ivonne-alfalyzer-90666a9e.coolify.app/api/market-data/quotes/batch`)

2. **Proxy rewrites**: The `vercel.json` configuration also includes a rewrite rule that proxies `/api/*` requests to your Coolify backend. This provides two ways to access the API:
   - Direct: `https://crucial-ivonne-alfalyzer-90666a9e.coolify.app/api/...`
   - Proxied: `https://your-vercel-app.vercel.app/api/...` (rewrites to Coolify)

3. **Fallback mechanism**: If API requests fail, the frontend automatically falls back to mock data via `invisible-fallback-service.ts` to ensure users never see errors.

## Deployment Steps

1. **Commit the changes**:
   ```bash
   git add client/vercel.json client/.env.production client/.env.local
   git commit -m "fix: Update Coolify backend URL for production deployment"
   git push
   ```

2. **Configure Vercel environment variables**:
   - Go to your Vercel project dashboard
   - Navigate to Settings → Environment Variables
   - Add `VITE_API_URL` with value `https://crucial-ivonne-alfalyzer-90666a9e.coolify.app`
   - Save the changes

3. **Trigger a new deployment**:
   - Vercel will automatically deploy when you push to your connected branch
   - Or manually trigger a deployment from the Vercel dashboard

4. **Verify the deployment**:
   - Check the browser console for API requests going to the correct Coolify URL
   - Look for successful responses with real market data
   - The console logs in `market-data-client.ts` will show the API URLs being used

## Troubleshooting

### If you still see mock data:
1. Check browser console for errors
2. Verify CORS is properly configured on your Coolify backend
3. Check if the authentication token is being sent correctly
4. Look for "Using fallback data" messages in the console

### CORS Configuration
Your Coolify backend should have CORS configured to allow requests from your Vercel domain:
```javascript
// In your backend server
app.use(cors({
  origin: [
    'https://your-app.vercel.app',
    'http://localhost:5173', // For local development
    'http://localhost:3000'
  ],
  credentials: true
}));
```

### Authentication
The frontend tries to send an authentication token with API requests. If users are not logged in, it uses a demo token. Make sure your backend accepts these tokens appropriately.

## Local Development

To test with the production Coolify backend locally:
1. Edit `client/.env.local`
2. Uncomment the line with the Coolify URL
3. Run `npm run dev` in the client directory

## Success Indicators

When everything is working correctly, you should see:
- Real stock prices updating in the dashboard
- Console logs showing "Successfully fetched batch quotes"
- API requests going to `https://crucial-ivonne-alfalyzer-90666a9e.coolify.app`
- No "Using fallback data" messages