# Alfalyzer Troubleshooting Guide

## Quick Diagnosis

Run the verification script to check all services:
```bash
node scripts/verify-deployment.js
```

## Common Issues & Solutions

### 1. Frontend Issues

#### Blank Page or Loading Forever
**Symptoms**: 
- Page stays white
- Loading spinner never stops
- No errors in browser console

**Solutions**:
1. Check if backend is accessible:
   ```bash
   curl https://alfalyzer-4rjhp-koyeb.app/api/health
   ```

2. Verify environment variables in Vercel:
   - Go to Vercel Dashboard → Settings → Environment Variables
   - Ensure `VITE_API_URL` is set to `https://alfalyzer-4rjhp-koyeb.app`

3. Check browser console for CORS errors

#### Stock Data Not Loading
**Symptoms**:
- Dashboard shows empty cards
- "Failed to load" messages
- Spinner keeps spinning

**Solutions**:
1. Check API health endpoint
2. Verify API keys are set in Koyeb
3. Check if you've hit API rate limits
4. Look for errors in browser Network tab

### 2. Backend Issues

#### 502 Bad Gateway
**Symptoms**:
- API calls return 502 error
- "Bad Gateway" message

**Solutions**:
1. Check Koyeb deployment status
2. View Koyeb logs for crash reports
3. Verify PORT environment variable is set to 8000
4. Check if app is using too much memory

#### CORS Errors
**Symptoms**:
- "CORS policy blocked" in console
- "No 'Access-Control-Allow-Origin' header"

**Solutions**:
1. Verify backend CORS configuration includes frontend URL
2. Check if requests include credentials
3. Ensure backend is running on HTTPS

#### API Rate Limit Errors
**Symptoms**:
- 429 status codes
- "Rate limit exceeded" messages
- Intermittent data loading

**Solutions**:
1. Check API provider dashboards for usage
2. Verify caching is working (check cache headers)
3. Implement request queuing
4. Upgrade API plans if needed

### 3. Database Issues

#### Authentication Errors
**Symptoms**:
- Can't log in
- "Invalid credentials" errors
- Session expires immediately

**Solutions**:
1. Check Supabase service status
2. Verify SUPABASE_URL and SUPABASE_ANON_KEY
3. Check if RLS policies are too restrictive
4. Verify JWT secret matches

#### Data Not Persisting
**Symptoms**:
- Watchlists disappear on refresh
- Portfolio changes not saved
- Settings reset

**Solutions**:
1. Check Supabase RLS policies
2. Verify user is authenticated
3. Check for database connection errors
4. Look for SQL syntax errors in logs

### 4. Performance Issues

#### Slow Page Loads
**Symptoms**:
- Pages take > 3 seconds to load
- Sluggish UI interactions
- High memory usage

**Solutions**:
1. Check bundle size:
   ```bash
   npm run build
   # Check dist folder size
   ```

2. Implement code splitting:
   - Lazy load routes
   - Dynamic imports for heavy components

3. Optimize images:
   - Use WebP format
   - Implement lazy loading
   - Use appropriate sizes

#### Slow API Responses
**Symptoms**:
- API calls take > 1 second
- Timeouts on data fetching
- Inconsistent response times

**Solutions**:
1. Check cache hit rates
2. Optimize database queries
3. Implement pagination
4. Add database indexes

## Debugging Tools

### Browser DevTools
1. **Network Tab**: Monitor API calls
   - Check response times
   - Verify correct endpoints
   - Look for failed requests

2. **Console**: JavaScript errors
   - Look for red error messages
   - Check for warnings
   - Monitor API responses

3. **Performance Tab**: Page performance
   - Record page load
   - Identify bottlenecks
   - Check memory usage

### Backend Monitoring

#### Koyeb Logs
```bash
# View recent logs in Koyeb dashboard
# Look for:
- Crash reports
- Memory errors
- Unhandled exceptions
- API errors
```

#### Local Backend Testing
```bash
# Clone repo and test locally
git clone <repo>
cd alfalyzer/server
npm install
npm run dev

# Test endpoints
curl http://localhost:8080/api/health
```

### Database Monitoring

#### Supabase Dashboard
1. **Logs**: SQL queries and errors
2. **Performance**: Slow queries
3. **Auth**: User sessions
4. **Storage**: File uploads

#### Test Queries
```sql
-- Check user data
SELECT * FROM users LIMIT 10;

-- Check watchlists
SELECT * FROM watchlists 
WHERE user_id = '<user-id>';

-- Check API logs
SELECT * FROM api_logs 
ORDER BY created_at DESC 
LIMIT 100;
```

## Emergency Procedures

### Backend Down
1. Check Koyeb status page
2. Restart deployment in Koyeb
3. Check for memory/CPU limits
4. Roll back to previous version if needed

### Database Down
1. Check Supabase status page
2. Verify connection string
3. Test with Supabase client directly
4. Contact Supabase support

### API Providers Down
1. Check provider status pages
2. Switch to fallback providers
3. Increase cache duration temporarily
4. Notify users of degraded service

## Monitoring Checklist

### Daily Checks
- [ ] Verify health endpoint
- [ ] Check error logs
- [ ] Monitor API usage
- [ ] Check cache hit rates

### Weekly Checks
- [ ] Review performance metrics
- [ ] Check database size
- [ ] Audit API costs
- [ ] Update dependencies

### Monthly Checks
- [ ] Security audit
- [ ] Backup verification
- [ ] Cost analysis
- [ ] User feedback review

## Contact Information

### Service Status Pages
- Vercel: https://www.vercel-status.com/
- Koyeb: https://status.koyeb.com/
- Supabase: https://status.supabase.com/

### Support Channels
- GitHub Issues: [Create issue for bugs]
- Email: support@alfalyzer.com
- Discord: [Community support]

## Useful Commands

### Test API Endpoints
```bash
# Health check
curl https://alfalyzer-4rjhp-koyeb.app/api/health

# Get stock data
curl https://alfalyzer-4rjhp-koyeb.app/api/stocks/AAPL

# Search stocks
curl "https://alfalyzer-4rjhp-koyeb.app/api/search/stocks?q=apple"

# Batch quotes
curl "https://alfalyzer-4rjhp-koyeb.app/api/stocks/batch?symbols=AAPL,GOOGL,MSFT"
```

### Check Service Status
```bash
# Frontend
curl -I https://alfalyzer.vercel.app

# Backend
curl -I https://alfalyzer-4rjhp-koyeb.app/api/health

# With timing
curl -w "@curl-format.txt" -o /dev/null -s https://alfalyzer-4rjhp-koyeb.app/api/health
```

### Debug CORS
```bash
# Test CORS headers
curl -H "Origin: https://alfalyzer.vercel.app" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     https://alfalyzer-4rjhp-koyeb.app/api/health \
     -verbose
```

## Recovery Procedures

### Rolling Back Deployment

#### Frontend (Vercel)
1. Go to Vercel Dashboard
2. Navigate to Deployments
3. Find last working deployment
4. Click "..." → "Promote to Production"

#### Backend (Koyeb)
1. Go to Koyeb Dashboard
2. Navigate to your service
3. Click on "Deployments"
4. Redeploy previous version

### Data Recovery

#### Supabase Backup
1. Go to Supabase Dashboard
2. Navigate to Backups
3. Download point-in-time backup
4. Restore using pg_restore

### Cache Clear
```bash
# If cache is corrupted
# Backend will automatically rebuild cache
# Just restart the backend service
```

## Performance Optimization Tips

### Frontend
1. Enable Vercel Edge caching
2. Use `next/image` for images
3. Implement virtual scrolling for lists
4. Lazy load heavy components

### Backend
1. Increase cache durations during high load
2. Implement request queuing
3. Use connection pooling
4. Add read replicas for database

### Database
1. Add indexes for common queries
2. Use materialized views for complex queries
3. Implement query result caching
4. Regular VACUUM and ANALYZE