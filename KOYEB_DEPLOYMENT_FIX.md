# Koyeb Deployment Fix Guide

## The Issue

Your backend server on Koyeb is trying to serve frontend static files, but:
1. The frontend files aren't included in the Docker image (they're built separately for Vercel)
2. The server is looking for files that don't exist on Koyeb
3. This is causing the "index.html not found" errors

## The Architecture

Your current architecture is **CORRECT**:
- **Frontend on Vercel**: Serves the React SPA (static files)
- **Backend on Koyeb**: Provides API endpoints only

## The Solution

### Option 1: Ignore the Error (Recommended)

The error is harmless and expected. Your backend should NOT serve frontend files. The error occurs during startup checks but doesn't affect API functionality.

**To clean up the logs**, update your `server/index.ts`:

```typescript
// In server/index.ts, around line 432-437
} else if (process.env.SERVE_STATIC === 'true') {
  // Only serve static files if explicitly enabled (for local testing)
  serveStatic(app);
} else {
  console.log('📡 API-only mode: Frontend served by Vercel');
  console.log('🔗 Frontend URL:', process.env.VITE_APP_URL || 'https://alfalyzer.vercel.app');
  // Don't call serveStatic at all - this prevents the error messages
}
```

### Option 2: Create a Clean API-Only Server

Create a new file `server/koyeb-api-only.ts`:

```typescript
import express from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { errorHandler } from "./middleware/error-handler";
import { setupAuth } from "./middleware/auth";
import { corsMiddleware } from "./middleware/cors";
import rateLimit from "./middleware/rate-limit";

const app = express();
const PORT = process.env.PORT || 3001;

// Basic middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security middleware
app.use(corsMiddleware);
app.use(rateLimit);

// Auth
setupAuth(app);

// API routes only
registerRoutes(app);

// Error handler
app.use(errorHandler);

// 404 for undefined routes
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ error: 'API endpoint not found' });
  } else {
    res.status(404).json({ 
      error: 'This is an API-only server. Frontend is at ' + process.env.VITE_APP_URL 
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 API Server running on port ${PORT}`);
  console.log(`📡 API-only mode - Frontend at ${process.env.VITE_APP_URL}`);
});
```

Then update your Dockerfile.koyeb to use this file.

### Option 3: Properly Configure the Existing Server

Since the serveStatic function is being called even when it shouldn't, let's fix the root cause:

1. The issue is in the startup sequence. The serveStatic function is being called somewhere else.
2. Check if there are any other places calling serveStatic.

## Environment Variables

Ensure these are set on Koyeb:

```env
NODE_ENV=production
SERVE_STATIC=false
VITE_APP_URL=https://alfalyzerpro4-20n9vt0bo-antonios-projects-f9cd3cd0.vercel.app
ALLOWED_ORIGINS=https://alfalyzerpro4-20n9vt0bo-antonios-projects-f9cd3cd0.vercel.app,https://alfalyzer.vercel.app
```

## Verification Steps

1. Check if your API is working:
   ```bash
   curl https://crucial-ivonne-alfalyzer-90666a9e.koyeb.app/health
   ```

2. Check CORS headers:
   ```bash
   curl -H "Origin: https://alfalyzerpro4-20n9vt0bo-antonios-projects-f9cd3cd0.vercel.app" \
        -I https://crucial-ivonne-alfalyzer-90666a9e.koyeb.app/api/market-data/test
   ```

## The Real Problem

Looking at your logs, the actual API is working! The errors about index.html are just startup warnings. Your real issues are:

1. **403 errors from Polygon API**: Your API key might be invalid or rate-limited
2. **404 errors for some endpoints**: Some API routes might not be properly registered

Focus on fixing these actual API issues rather than the static file warnings.

## Quick Fix

Add this to your `server/index.ts` after line 110:

```typescript
// Early exit if we're in production and not serving static files
if (process.env.NODE_ENV === 'production' && process.env.SERVE_STATIC !== 'true') {
  console.log('🚀 Production API-only mode - skipping static file setup');
  return; // This prevents the serveStatic function from ever being called
}
```

This will prevent the static file checks from running at all in production.