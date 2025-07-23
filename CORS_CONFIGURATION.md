# CORS Configuration Guide for Alfalyzer

## Current Configuration

The backend is configured to accept CORS requests from multiple sources in production:

### Allowed Origins (Production)
1. **Vercel Deployments**:
   - `https://alphaanalyzer.vercel.app`
   - `https://alfalyzer.vercel.app`
   - `https://alphaanalyzer-*.vercel.app` (preview deployments)
   - `https://alfalyzer-*.vercel.app` (preview deployments)
   - `https://*.vercel.app` (any Vercel app)

2. **Koyeb Deployments**:
   - `https://crucial-ivonne-alfalyzer-*.koyeb.app`

3. **Custom Domains**:
   - `https://alfalyzer.com`
   - `https://www.alfalyzer.com`
   - `https://alphaanalyzer.com`
   - `https://www.alphaanalyzer.com`

### Environment Variables

Configure these in your Koyeb deployment:

```bash
# Frontend origin (optional)
FRONTEND_ORIGIN=https://alphaanalyzer.vercel.app

# Allow HTTP in production (for debugging only)
ALLOW_HTTP_CORS=false

# Enforce strict CORS (set to true for production)
STRICT_CORS=false

# Enable CORS debugging
CORS_DEBUG=true

# Additional allowed domains (comma-separated)
ALLOWED_DOMAINS=alfalyzer.com,alphaanalyzer.com
```

## Testing CORS

### 1. Using the Test Endpoint

```bash
# Test GET request
curl -H "Origin: https://alphaanalyzer.vercel.app" \
     https://your-backend.koyeb.app/api/cors-test

# Test POST request (preflight)
curl -X POST \
     -H "Origin: https://alphaanalyzer.vercel.app" \
     -H "Content-Type: application/json" \
     -d '{"test": "data"}' \
     https://your-backend.koyeb.app/api/cors-test
```

### 2. From Browser Console

```javascript
// Test from Vercel frontend
fetch('https://your-backend.koyeb.app/api/cors-test', {
  method: 'GET',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json'
  }
})
.then(res => res.json())
.then(data => console.log('CORS Test:', data))
.catch(err => console.error('CORS Error:', err));
```

## Debugging CORS Issues

### 1. Check Logs

The backend logs detailed CORS information:

```
🔍 CORS Request from origin: https://alphaanalyzer.vercel.app
✅ CORS: Allowing Vercel domain: https://alphaanalyzer.vercel.app
🛡️ CORS Preflight Request:
   Origin: https://alphaanalyzer.vercel.app
   Path: /api/stocks
   Access-Control-Request-Method: POST
```

### 2. Common Issues and Solutions

#### Issue: "CORS policy: No 'Access-Control-Allow-Origin' header"
**Solution**: 
- Ensure the origin is in the allowed list
- Check if `NODE_ENV=production` is set in Koyeb
- Verify the origin URL exactly matches (including https://)

#### Issue: "CORS policy: The request client is not a secure context"
**Solution**: 
- Use HTTPS for both frontend and backend
- Set `ALLOW_HTTP_CORS=true` temporarily for debugging

#### Issue: "Preflight request failed"
**Solution**: 
- Check that OPTIONS requests are allowed
- Verify all required headers are in the allowed list
- Ensure credentials are properly configured

### 3. Debug Headers

When `CORS_DEBUG=true`, the backend adds debug headers:

```
X-CORS-Debug-Origin: https://alphaanalyzer.vercel.app
X-CORS-Debug-Method: POST
X-CORS-Debug-Path: /api/stocks
X-CORS-Debug-Time: 2024-01-23T10:30:00.000Z
```

## Security Notes

1. **Production Settings**:
   - Always use `STRICT_CORS=true` in production
   - Never use `ALLOW_HTTP_CORS=true` in production
   - Disable `CORS_DEBUG=true` after debugging

2. **Credentials**:
   - `credentials: true` allows cookies and auth headers
   - Ensure your frontend includes `credentials: 'include'` in fetch requests

3. **Headers**:
   - Only necessary headers are allowed
   - Authorization header is included for JWT tokens

## Quick Deploy Checklist

1. [ ] Set `NODE_ENV=production` in Koyeb
2. [ ] Configure `FRONTEND_ORIGIN` if using a specific domain
3. [ ] Set `STRICT_CORS=true` for production
4. [ ] Test using `/api/cors-test` endpoint
5. [ ] Verify preflight requests work
6. [ ] Check logs for any CORS rejections
7. [ ] Disable debug mode when working

## Support

If CORS issues persist:
1. Check the Koyeb logs for detailed error messages
2. Test with `CORS_DEBUG=true` enabled
3. Use the `/api/cors-test` endpoint to verify configuration
4. Ensure your Vercel deployment URL matches the patterns