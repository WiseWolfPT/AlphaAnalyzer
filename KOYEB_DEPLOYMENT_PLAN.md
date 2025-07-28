# Koyeb Deployment Plan for Express.js Middleware Fixes

## 🚨 Critical Issue: ERR_HTTP_HEADERS_SENT

The application has been experiencing crashes due to multiple response headers being sent. This comprehensive plan ensures proper deployment and monitoring.

## 📋 Pre-Deployment Checklist

### 1. Code Review
- [ ] Verify all middleware use `next()` without sending responses
- [ ] Confirm error handler is the last middleware
- [ ] Check CORS middleware is not duplicated
- [ ] Ensure no response wrapping is present
- [ ] Validate async middleware error handling

### 2. Local Testing
```bash
# Run comprehensive tests
npm test

# Run E2E test suite
node test-e2e-complete.js

# Test with production build
NODE_ENV=production npm run build
NODE_ENV=production npm start
```

### 3. Environment Variables
```env
# Required for Koyeb deployment
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# CORS Configuration
ALLOWED_ORIGINS=https://alfalyzer.vercel.app,https://alfalyzer.com

# API Keys (ensure all are set)
ALPHA_VANTAGE_API_KEY=your_key
FINNHUB_API_KEY=your_key
FMP_API_KEY=your_key
TWELVE_DATA_API_KEY=your_key
POLYGON_API_KEY=your_key

# Optional monitoring
ENABLE_PERFORMANCE_MONITOR=true
ENABLE_KEEP_ALIVE=true
DEBUG_CORS=false
```

## 🏗️ Middleware Order (Critical)

The correct middleware registration order in `/server/index.ts`:

```typescript
1. Sentry initialization
2. Health check endpoint (before all middleware)
3. Security headers (helmet)
4. Compression
5. CORS logger (debugging)
6. CORS middleware (single instance)
7. Trust proxy
8. Body parsers
9. Security middleware
10. Request ID & logging
11. Rate limiting
12. API routes
13. 404 handler
14. Error handler (must be last)
```

## 🧪 Test Plan

### Phase 1: Unit Tests
```bash
# Test individual middleware
npm run test:middleware

# Test error handler
npm run test:error-handler

# Test CORS configuration
npm run test:cors
```

### Phase 2: Integration Tests
Run the comprehensive E2E test suite:
```bash
node test-e2e-complete.js
```

Expected results:
- ✅ All concurrent requests succeed
- ✅ Error scenarios return proper status codes
- ✅ No ERR_HTTP_HEADERS_SENT errors
- ✅ CORS preflight requests work
- ✅ Consistent response headers
- ✅ Stress test passes (100+ requests)

### Phase 3: Load Testing
```bash
# Install artillery if needed
npm install -g artillery

# Run load test
artillery quick --count 50 --num 10 http://localhost:3001/api/health
```

## 🚀 Deployment Process

### Step 1: Build & Test
```bash
# Clean build
rm -rf dist/
npm run build

# Verify build
ls -la dist/
```

### Step 2: Git Deployment
```bash
# Commit fixes
git add .
git commit -m "fix: Resolve ERR_HTTP_HEADERS_SENT middleware conflicts"
git push origin main

# Tag release
git tag -a v1.2.0 -m "Fix middleware headers issue"
git push origin v1.2.0
```

### Step 3: Koyeb Deployment
1. Koyeb will auto-deploy from GitHub push
2. Monitor build logs in Koyeb dashboard
3. Watch for deployment status

### Step 4: Health Verification
```bash
# Check health endpoint
curl https://your-app.koyeb.app/health

# Test API endpoint
curl https://your-app.koyeb.app/api/stocks/AAPL/quote
```

## 📊 Monitoring Strategy

### 1. Real-time Monitoring
```javascript
// Monitor for headers errors
app.use((err, req, res, next) => {
  if (err.message?.includes('HEADERS_SENT')) {
    console.error('CRITICAL: Headers already sent error', {
      url: req.url,
      method: req.method,
      headers: req.headers,
      stack: err.stack
    });
    // Alert monitoring service
  }
  next(err);
});
```

### 2. Health Check Monitoring
- Set up uptime monitoring on `/health` endpoint
- Configure alerts for response time > 1000ms
- Monitor for 5xx status codes

### 3. Log Analysis
Look for patterns in Koyeb logs:
```bash
# Common error patterns
"Cannot set headers after they are sent"
"ERR_HTTP_HEADERS_SENT"
"Error [ERR_HTTP_HEADERS_SENT]"
```

### 4. Performance Metrics
Monitor these KPIs:
- Request response time (p50, p95, p99)
- Error rate (especially 5xx errors)
- Memory usage trends
- CPU utilization
- Restart frequency

## 🔄 Rollback Plan

### Immediate Rollback
If issues persist after deployment:

1. **Revert in Koyeb Dashboard**
   - Navigate to Deployments
   - Select previous working version
   - Click "Rollback"

2. **Git Revert**
   ```bash
   git revert HEAD
   git push origin main
   ```

3. **Emergency Response**
   - Enable maintenance mode
   - Route traffic to backup server
   - Investigate logs

### Root Cause Analysis
If rollback is needed:
1. Export recent logs from Koyeb
2. Analyze error patterns
3. Test locally with production config
4. Implement fixes with extensive testing

## 🛡️ Prevention Measures

### 1. Code Standards
```javascript
// ✅ Good: Always use next() in middleware
app.use((req, res, next) => {
  req.customData = processData();
  next(); // Pass control
});

// ❌ Bad: Sending response in middleware
app.use((req, res, next) => {
  res.json({ data: 'something' }); // Don't do this!
  next(); // This will cause headers error
});
```

### 2. Async Error Handling
```javascript
// ✅ Good: Proper async error handling
app.use(async (req, res, next) => {
  try {
    await someAsyncOperation();
    next();
  } catch (error) {
    next(error); // Pass to error handler
  }
});
```

### 3. Response Guard
```javascript
// Add response guard utility
function safeResponse(res, data) {
  if (!res.headersSent) {
    res.json(data);
  } else {
    console.error('Attempted to send response after headers sent');
  }
}
```

## 📈 Performance Impact

Expected improvements after fixes:
- **Stability**: 99.9% uptime (no more crashes)
- **Response Time**: < 100ms for cached requests
- **Error Rate**: < 0.1% (down from current spikes)
- **Memory Usage**: Stable at ~200MB
- **CPU Usage**: < 30% under normal load

## 🔍 Verification Commands

Post-deployment verification:
```bash
# 1. Check server health
curl -i https://your-app.koyeb.app/health

# 2. Test concurrent requests
for i in {1..10}; do
  curl https://your-app.koyeb.app/api/stocks/AAPL/quote &
done
wait

# 3. Check response headers
curl -I https://your-app.koyeb.app/api/health

# 4. Monitor logs (in Koyeb dashboard)
# Look for successful request patterns
```

## 📝 Post-Deployment Tasks

1. **Monitor for 24 hours**
   - Check error rates every hour
   - Verify no header conflicts
   - Monitor memory usage

2. **Update Documentation**
   - Document middleware order
   - Add troubleshooting guide
   - Update API documentation

3. **Team Communication**
   - Notify team of deployment
   - Share monitoring dashboard
   - Schedule review meeting

4. **Performance Tuning**
   - Analyze response times
   - Optimize slow endpoints
   - Adjust rate limits if needed

## 🚦 Success Criteria

Deployment is successful when:
- ✅ No ERR_HTTP_HEADERS_SENT errors in 24 hours
- ✅ All E2E tests pass in production
- ✅ Response times < 200ms for 95% of requests
- ✅ Zero server restarts due to crashes
- ✅ Error rate < 0.1%

## 📞 Emergency Contacts

If issues arise:
1. Check Koyeb status page
2. Review deployment logs
3. Run diagnostic tests
4. Implement rollback if needed
5. Contact DevOps team lead

---

**Last Updated**: 2025-07-28
**Version**: 1.0.0
**Status**: Ready for Deployment