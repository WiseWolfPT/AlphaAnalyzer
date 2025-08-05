# Vercel Environment Variables Configuration

## Required Environment Variables for Vercel

You need to add these environment variables in your Vercel project settings:

### 1. Go to Vercel Dashboard
- Navigate to your project: https://vercel.com/dashboard
- Click on your "alfalyzer" project
- Go to "Settings" → "Environment Variables"

### 2. Add these variables:

```bash
# Supabase Configuration (Required)
VITE_SUPABASE_URL=[Your Supabase Project URL]
VITE_SUPABASE_ANON_KEY=[Your Supabase Anon Key]

# API Configuration (Optional - uses defaults if not set)
# Remove this to use the Vercel proxy instead of direct connection
# VITE_API_URL=https://crucial-ivonne-alfalyzer-90666a9e.coolify.app
```

### 3. Important Notes:
- DO NOT set `VITE_API_URL` on Vercel - let it use the proxy configuration
- Make sure to add variables for all environments (Production, Preview, Development)
- After adding variables, redeploy your project

### 4. Verify Deployment:
After redeploying with these environment variables:
1. Check browser console for initialization logs
2. Verify no CORS errors in network tab
3. Check if authentication initializes properly

## Local Development

For local development, create a `.env` file in the client directory:

```bash
# client/.env
VITE_SUPABASE_URL=[Your Supabase Project URL]
VITE_SUPABASE_ANON_KEY=[Your Supabase Anon Key]
VITE_API_URL=http://localhost:3001
```

## How the Fix Works

1. **API Proxy**: The frontend now uses relative paths (`/api/*`) which Vercel proxies to Coolify
2. **No CORS**: Since requests go through Vercel's proxy, there are no CORS issues
3. **Supabase Auth**: With proper env vars, authentication will initialize correctly
4. **i18n**: Fixed the missing import for proper internationalization

## Testing the Fix

1. Deploy to Vercel with the environment variables
2. Open browser developer tools
3. Check Network tab - API calls should go to `/api/*` not direct Coolify URL
4. Check Console - No authentication or i18n errors
5. The app should load without the "Algo correu mal" error