# Alfalyzer Deployment Architecture

## Overview

Alfalyzer uses a **separated architecture** where frontend and backend are deployed independently:

- **Frontend (Vercel)**: Serves the React SPA (static files)
- **Backend (Coolify)**: Provides API endpoints only (no static file serving)

## Architecture Diagram

```
┌─────────────────┐         ┌─────────────────┐
│     Vercel      │         │     Coolify       │
│                 │         │                 │
│  React SPA      │ ──API──▶│  Express API    │
│  (Static Files) │  calls  │  (JSON only)    │
│                 │         │                 │
│ alfalyzer.      │         │ crucial-ivonne- │
│ vercel.app      │         │ alfalyzer...    │
└─────────────────┘         └─────────────────┘
```

## Key Benefits

1. **Better Performance**: CDN for static files, dedicated API server
2. **Independent Scaling**: Frontend and backend scale separately
3. **Cost Efficiency**: Static hosting is cheaper than compute
4. **Security**: API server doesn't expose static files
5. **Deployment Flexibility**: Deploy frontend/backend independently

## Deployment Steps

### 1. Backend Deployment (Coolify)

**Use the API-only server script:**

```bash
# In your Coolify configuration, use:
node coolify-api-server.js
```

**Required Environment Variables on Coolify:**
```env
# Server Configuration
PORT=3001
NODE_ENV=production
SERVE_STATIC=false  # Important: Disable static serving

# API Keys
ALPHA_VANTAGE_API_KEY=your_key
FINNHUB_API_KEY=your_key
FMP_API_KEY=your_key
TWELVE_DATA_API_KEY=your_key
POLYGON_API_KEY=your_key

# Supabase
SUPABASE_URL=your_url
SUPABASE_SERVICE_ROLE_KEY=your_key

# Frontend URL (for CORS)
VITE_APP_URL=https://alfalyzer.vercel.app
ALLOWED_ORIGINS=https://alfalyzer.vercel.app,https://alfalyzer-*.vercel.app
```

### 2. Frontend Deployment (Vercel)

**Build Command:**
```bash
cd client && npm run build
```

**Output Directory:**
```
client/dist
```

**Required Environment Variables on Vercel:**
```env
# API Configuration
VITE_API_URL=https://crucial-ivonne-alfalyzer-90666a9e.coolify.app

# Supabase (public keys only)
VITE_SUPABASE_URL=your_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## CORS Configuration

The backend must allow requests from the frontend domain:

```typescript
// server/middleware/cors.ts
const allowedOrigins = [
  'https://alfalyzer.vercel.app',
  'https://alfalyzer-*.vercel.app', // Preview deployments
  'http://localhost:5173', // Local development
];
```

## API Communication Flow

1. **Frontend makes API call:**
   ```typescript
   fetch('https://crucial-ivonne-alfalyzer-90666a9e.coolify.app/api/stocks')
   ```

2. **Backend processes request:**
   - Validates CORS headers
   - Processes the request
   - Returns JSON response

3. **Frontend receives response:**
   - Updates UI with data
   - Handles errors gracefully

## Cold Start Handling

Coolify free tier has cold starts. The frontend handles this:

```typescript
// Retry logic with exponential backoff
const response = await fetchWithRetry(url, {
  retries: 3,
  retryDelay: 2000,
  onRetry: () => showToast('Server is waking up...')
});
```

## Health Checks

**Backend Health Endpoint:**
```
GET https://crucial-ivonne-alfalyzer-90666a9e.coolify.app/health
```

**Frontend Health Check:**
```typescript
// Check if backend is accessible on app load
const checkBackendHealth = async () => {
  try {
    const response = await fetch(`${API_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
};
```

## Troubleshooting

### Issue: "Could not find index.html"
**Solution:** This is expected! The backend shouldn't serve frontend files. Ignore this error.

### Issue: CORS errors
**Solution:** Ensure `ALLOWED_ORIGINS` on backend includes your frontend URL.

### Issue: API calls fail
**Solution:** 
1. Check if backend is running: `curl https://your-coolify-url/health`
2. Verify `VITE_API_URL` in frontend matches backend URL
3. Check browser console for detailed errors

### Issue: Cold starts are slow
**Solution:**
1. Implement retry logic in frontend
2. Show loading states during cold starts
3. Consider upgrading Coolify plan for always-on instances

## Security Best Practices

1. **Never expose sensitive keys in frontend:**
   - ❌ `SUPABASE_SERVICE_ROLE_KEY`
   - ❌ `ALPHA_VANTAGE_API_KEY`
   - ✅ `VITE_SUPABASE_ANON_KEY` (safe for frontend)

2. **Use environment-specific URLs:**
   - Production: `https://alfalyzer.vercel.app`
   - Staging: `https://alfalyzer-staging.vercel.app`
   - Local: `http://localhost:5173`

3. **Implement rate limiting on backend**
4. **Use HTTPS everywhere**
5. **Validate all inputs on backend**

## Monitoring

1. **Backend Logs (Coolify):**
   - View in Coolify dashboard
   - Monitor for errors and performance

2. **Frontend Analytics (Vercel):**
   - Web Vitals
   - Error tracking
   - User analytics

3. **API Monitoring:**
   - Response times
   - Error rates
   - API usage per provider

## Cost Optimization

1. **Frontend (Vercel Free Tier):**
   - 100GB bandwidth/month
   - Unlimited deployments
   - SSL included

2. **Backend (Coolify Free Tier):**
   - 1 service
   - 512MB RAM
   - Sleeps after inactivity

3. **Database (Supabase Free Tier):**
   - 500MB database
   - 2GB bandwidth
   - 50,000 monthly active users

## Future Scaling

When ready to scale:

1. **Upgrade Coolify:** More RAM, always-on instances
2. **Add CDN:** CloudFlare for API caching
3. **Database Replication:** Read replicas for performance
4. **Load Balancing:** Multiple backend instances
5. **Redis Cache:** For API response caching