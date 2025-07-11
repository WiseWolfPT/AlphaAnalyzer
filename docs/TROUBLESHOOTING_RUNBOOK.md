# Alfalyzer Troubleshooting & Runbook Guide

## 🚨 Emergency Response Procedures

### Immediate Response Checklist

When receiving a critical alert:

1. **Acknowledge the alert** within 5 minutes
2. **Assess the scope** of the issue
3. **Check system status** dashboards
4. **Determine impact** on users
5. **Initiate response** based on severity
6. **Communicate** with stakeholders
7. **Document** actions taken

### Escalation Matrix

| Severity | Response Time | Escalation Path |
|----------|---------------|-----------------|
| P0 (Critical) | 0-5 minutes | On-call → Team Lead → Engineering Manager → CTO |
| P1 (High) | 5-15 minutes | On-call → Team Lead → Engineering Manager |
| P2 (Medium) | 15-60 minutes | On-call → Team Lead |
| P3 (Low) | 1-4 hours | Team Lead → Sprint Planning |

## 🔍 Common Issues & Solutions

### 1. High Error Rate (P1)

**Symptoms:**
- Error rate > 5% in monitoring dashboard
- Multiple user reports of application errors
- Increased 5xx HTTP status codes

**Quick Diagnosis:**
```bash
# Check recent deployments
git log --oneline --since="1 hour ago"

# Check error patterns in logs
grep -i "error" /var/log/alfalyzer/app.log | tail -100

# Check database connections
docker exec alfalyzer-db psql -U postgres -c "SELECT state, count(*) FROM pg_stat_activity GROUP BY state;"
```

**Resolution Steps:**
1. **Identify error patterns** in Sentry dashboard
2. **Check recent deployments** for correlation
3. **Review database performance** metrics
4. **Rollback if necessary** to previous stable version
5. **Apply hotfix** if root cause identified

**Rollback Procedure:**
```bash
# Quick rollback to previous version
git revert HEAD --no-edit
npm run build
npm run deploy:production

# Or use container rollback
docker pull alfalyzer:previous-stable
docker stop alfalyzer-app
docker run -d --name alfalyzer-app alfalyzer:previous-stable
```

### 2. API Provider Outage (P1)

**Symptoms:**
- API health dashboard showing provider as "unhealthy"
- Stock data not updating
- User reports of missing financial data

**Quick Diagnosis:**
```bash
# Test API provider directly
curl -H "Authorization: Bearer $API_KEY" "https://api.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL"

# Check API usage quotas
curl -H "Authorization: Bearer $API_KEY" "https://api.alphavantage.co/query?function=QUOTA"

# Check failover status
grep "failover" /var/log/alfalyzer/api.log | tail -20
```

**Resolution Steps:**
1. **Verify API provider status** on their status page
2. **Check API quotas** and usage limits
3. **Test failover to backup providers**
4. **Implement manual failover** if needed
5. **Notify users** about temporary data delays

**Manual Failover:**
```typescript
// Emergency API provider switch
const emergencyConfig = {
  primary: 'finnhub',    // Switch from alphavantage
  secondary: 'fmp',
  tertiary: 'twelvedata'
};

// Update configuration
await updateAPIConfig(emergencyConfig);
await restartAPIService();
```

### 3. Performance Degradation (P2)

**Symptoms:**
- Overall performance score < 70
- Slow page load times
- User complaints about app responsiveness

**Quick Diagnosis:**
```bash
# Check system resources
top -p $(pgrep -f "node.*alfalyzer")
df -h
free -m

# Check database performance
docker exec alfalyzer-db psql -U postgres -c "SELECT query, state, query_start FROM pg_stat_activity WHERE state = 'active';"

# Check bundle sizes
npm run build -- --analyze
```

**Resolution Steps:**
1. **Identify performance bottlenecks** in dashboards
2. **Check database query performance**
3. **Analyze bundle sizes** for bloat
4. **Review component performance** metrics
5. **Optimize or add caching** as needed

**Performance Optimization:**
```typescript
// Enable aggressive caching
const cacheConfig = {
  api: {
    ttl: 300, // 5 minutes
    maxSize: 1000
  },
  static: {
    ttl: 3600, // 1 hour
    compression: true
  }
};

// Apply optimizations
await applyCacheConfig(cacheConfig);
await enableCompression();
```

### 4. Memory Leak (P2)

**Symptoms:**
- Memory usage continuously increasing
- Application becoming unresponsive
- Out of memory errors

**Quick Diagnosis:**
```bash
# Check memory usage over time
ps aux | grep node | grep alfalyzer

# Check for memory leaks in Node.js
node --inspect=0.0.0.0:9229 server.js
# Connect Chrome DevTools to analyze heap

# Check container memory
docker stats alfalyzer-app
```

**Resolution Steps:**
1. **Identify memory growth patterns**
2. **Check for unclosed connections**
3. **Review event listeners**
4. **Restart application** as immediate fix
5. **Implement memory monitoring**

**Memory Leak Fix:**
```typescript
// Common memory leak fixes
class ComponentCleanup {
  private subscriptions: Subscription[] = [];
  
  componentDidMount() {
    // Track subscriptions
    const sub = eventEmitter.on('data', handler);
    this.subscriptions.push(sub);
  }
  
  componentWillUnmount() {
    // Clean up subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions = [];
  }
}
```

### 5. Database Connection Issues (P1)

**Symptoms:**
- Database connection pool exhausted
- "too many connections" errors
- Data not persisting

**Quick Diagnosis:**
```bash
# Check database connections
docker exec alfalyzer-db psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"

# Check connection pool status
docker logs alfalyzer-app | grep -i "pool\|connection"

# Test database connectivity
docker exec alfalyzer-app npx pg-test-connection
```

**Resolution Steps:**
1. **Check connection pool configuration**
2. **Identify long-running queries**
3. **Kill problematic connections**
4. **Restart database service** if needed
5. **Optimize connection pooling**

**Database Recovery:**
```sql
-- Kill long-running queries
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'active' 
AND query_start < NOW() - INTERVAL '5 minutes';

-- Reset connection pool
SELECT pg_stat_reset();
```

### 6. Security Breach (P0)

**Symptoms:**
- Multiple failed login attempts
- Suspicious API access patterns
- Unauthorized data access

**Immediate Response:**
1. **Change all API keys** immediately
2. **Revoke user sessions**
3. **Enable IP blocking**
4. **Audit access logs**
5. **Contact security team**

**Security Lockdown:**
```bash
# Immediate security measures
# 1. Rotate all API keys
export NEW_API_KEY=$(generate-new-key)
kubectl patch secret api-keys -p='{"data":{"key":"'$(echo -n $NEW_API_KEY | base64)'"}}'

# 2. Enable IP blocking
iptables -A INPUT -s suspicious-ip -j DROP

# 3. Revoke sessions
redis-cli FLUSHDB

# 4. Enable audit logging
export AUDIT_LOGGING=true
```

## 📊 Monitoring Dashboard Troubleshooting

### Dashboard Not Loading

**Issue:** Monitoring dashboards showing errors or not loading

**Diagnosis:**
```bash
# Check dashboard service status
docker ps | grep dashboard
curl -f http://localhost:3000/health

# Check API endpoints
curl -f http://localhost:3001/api/health
```

**Resolution:**
1. Restart dashboard service
2. Check API connectivity
3. Verify database access
4. Clear browser cache

### Missing Metrics

**Issue:** Metrics not appearing in dashboards

**Diagnosis:**
```bash
# Check metrics collection
grep -i "metrics" /var/log/alfalyzer/app.log | tail -50

# Test metrics endpoints
curl http://localhost:3001/api/metrics/performance
curl http://localhost:3001/api/metrics/errors
```

**Resolution:**
1. Verify metrics collection is enabled
2. Check database schema
3. Restart metrics service
4. Verify Sentry configuration

### Slow Dashboard Performance

**Issue:** Dashboards loading slowly or timing out

**Diagnosis:**
```bash
# Check database query performance
docker exec alfalyzer-db psql -U postgres -c "SELECT query, query_start, state FROM pg_stat_activity WHERE state = 'active';"

# Check API response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3001/api/metrics/performance
```

**Resolution:**
1. Optimize database queries
2. Add database indexes
3. Implement caching
4. Reduce data retention period

## 🔧 System Maintenance Procedures

### Routine Maintenance Checklist

**Daily:**
- [ ] Check system health dashboards
- [ ] Review error logs
- [ ] Verify backup completion
- [ ] Check API quota usage

**Weekly:**
- [ ] Update security patches
- [ ] Review performance metrics
- [ ] Clean up old logs
- [ ] Check database performance

**Monthly:**
- [ ] Review and update alert thresholds
- [ ] Analyze performance trends
- [ ] Update documentation
- [ ] Conduct security review

### Deployment Procedures

**Pre-deployment:**
```bash
# 1. Run all tests
npm test
npm run test:integration

# 2. Check build
npm run build

# 3. Verify configuration
npm run config:verify

# 4. Create backup
npm run backup:create
```

**Deployment:**
```bash
# 1. Deploy to staging
npm run deploy:staging

# 2. Run smoke tests
npm run test:smoke

# 3. Deploy to production
npm run deploy:production

# 4. Monitor deployment
npm run monitor:deployment
```

**Post-deployment:**
```bash
# 1. Check health endpoints
curl -f https://alfalyzer.com/health

# 2. Monitor error rates
watch -n 30 "curl -s https://alfalyzer.com/api/metrics/errors | jq '.errorRate'"

# 3. Check performance
npm run performance:check
```

### Database Maintenance

**Daily Maintenance:**
```sql
-- Check database size
SELECT pg_size_pretty(pg_database_size('alfalyzer'));

-- Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Update statistics
ANALYZE;
```

**Weekly Maintenance:**
```sql
-- Vacuum tables
VACUUM ANALYZE;

-- Check for bloat
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname NOT IN ('information_schema', 'pg_catalog')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Reindex if needed
REINDEX DATABASE alfalyzer;
```

## 🔍 Debugging Techniques

### Application Debugging

**Enable Debug Mode:**
```bash
# Enable detailed logging
export NODE_ENV=development
export DEBUG=alfalyzer:*
export LOG_LEVEL=debug

# Start application with debugging
node --inspect=0.0.0.0:9229 server.js
```

**Frontend Debugging:**
```javascript
// Enable React DevTools
window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = true;

// Enable performance profiling
import { Profiler } from 'react';

function onRenderCallback(id, phase, actualDuration) {
  console.log('Performance:', { id, phase, actualDuration });
}

<Profiler id="App" onRender={onRenderCallback}>
  <App />
</Profiler>
```

### Network Debugging

**Check Network Connectivity:**
```bash
# Test external API connectivity
curl -v https://api.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL&apikey=demo

# Check DNS resolution
nslookup api.alphavantage.co

# Test with different HTTP methods
curl -X POST -H "Content-Type: application/json" -d '{"test": "data"}' https://api.endpoint.com
```

**Monitor Network Traffic:**
```bash
# Monitor HTTP requests
sudo tcpdump -i eth0 port 80 or port 443

# Check connection stats
netstat -an | grep :3000
ss -tulpn | grep :3000
```

### Database Debugging

**Query Analysis:**
```sql
-- Enable query logging
ALTER SYSTEM SET log_statement = 'all';
SELECT pg_reload_conf();

-- Check current connections
SELECT pid, usename, application_name, client_addr, state, query_start, query 
FROM pg_stat_activity 
WHERE state = 'active';

-- Check locks
SELECT blocked_locks.pid     AS blocked_pid,
       blocked_activity.usename  AS blocked_user,
       blocking_locks.pid     AS blocking_pid,
       blocking_activity.usename AS blocking_user,
       blocked_activity.query    AS blocked_statement,
       blocking_activity.query   AS current_statement_in_blocking_process
FROM  pg_catalog.pg_locks         blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity  ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks         blocking_locks 
    ON blocking_locks.locktype = blocked_locks.locktype
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;
```

## 📋 Incident Response Procedures

### Incident Classification

**P0 - Critical (Complete Outage)**
- Service completely unavailable
- Data loss or corruption
- Security breach
- Payment system failure

**P1 - High (Major Functionality Affected)**
- Core features unavailable
- Significant performance degradation
- API provider outage
- Database connection issues

**P2 - Medium (Minor Functionality Affected)**
- Non-critical features affected
- Moderate performance issues
- Partial service degradation
- Configuration issues

**P3 - Low (Minimal Impact)**
- Cosmetic issues
- Minor performance degradation
- Enhancement requests
- Documentation updates

### Incident Response Flow

1. **Detection** - Alert received or issue reported
2. **Triage** - Assess severity and impact
3. **Response** - Assign responder and begin investigation
4. **Communication** - Notify stakeholders of status
5. **Resolution** - Implement fix and verify
6. **Recovery** - Restore full service
7. **Post-mortem** - Document lessons learned

### Communication Templates

**Initial Response (Within 15 minutes):**
```
Subject: [INCIDENT] Alfalyzer Service Issue - Investigating

We are aware of issues with the Alfalyzer platform affecting [scope of impact]. 
Our team is actively investigating and will provide updates every 30 minutes.

Status: Investigating
Impact: [description of user impact]
ETA: Under investigation

We apologize for any inconvenience and will resolve this as quickly as possible.
```

**Update Message:**
```
Subject: [INCIDENT UPDATE] Alfalyzer Service Issue

UPDATE: We have identified the root cause as [brief description]. 
Our team is implementing a fix and expects resolution within [timeframe].

Status: Fix in progress
Impact: [current impact status]
ETA: [updated estimate]

Next update in 30 minutes or upon resolution.
```

**Resolution Message:**
```
Subject: [RESOLVED] Alfalyzer Service Issue

The issue affecting the Alfalyzer platform has been resolved as of [timestamp].
All services are now operating normally.

Root Cause: [brief description]
Resolution: [what was done]
Prevention: [steps to prevent recurrence]

Thank you for your patience during this incident.
```

## 🧪 Testing and Validation

### Health Check Procedures

**Application Health Check:**
```bash
#!/bin/bash
# health-check.sh

# Check web service
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
  echo "✓ Web service healthy"
else
  echo "✗ Web service unhealthy"
  exit 1
fi

# Check API service
if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
  echo "✓ API service healthy"
else
  echo "✗ API service unhealthy"
  exit 1
fi

# Check database
if docker exec alfalyzer-db pg_isready -U postgres > /dev/null 2>&1; then
  echo "✓ Database healthy"
else
  echo "✗ Database unhealthy"
  exit 1
fi

echo "All services healthy"
```

### Smoke Tests

**Post-deployment Smoke Test:**
```bash
#!/bin/bash
# smoke-test.sh

BASE_URL="https://alfalyzer.com"

# Test homepage
curl -f $BASE_URL/ || exit 1

# Test API endpoints
curl -f $BASE_URL/api/health || exit 1
curl -f $BASE_URL/api/stocks/AAPL || exit 1

# Test authentication
curl -f $BASE_URL/api/auth/status || exit 1

echo "Smoke tests passed"
```

### Performance Tests

**Load Testing:**
```bash
# Install artillery
npm install -g artillery

# Run load test
artillery run load-test.yml

# Monitor during test
watch -n 5 "curl -s $BASE_URL/api/metrics/performance | jq '.responseTime'"
```

## 📚 References and Resources

### Internal Documentation

- [Monitoring System Documentation](./MONITORING_SYSTEM_DOCUMENTATION.md)
- [Alert Configuration Guide](./ALERT_CONFIGURATION_GUIDE.md)
- [API Documentation](./API_DOCUMENTATION.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)

### External Resources

- [Sentry Documentation](https://docs.sentry.io/)
- [PostgreSQL Monitoring](https://www.postgresql.org/docs/current/monitoring.html)
- [Node.js Performance](https://nodejs.org/en/docs/guides/simple-profiling/)
- [React Performance](https://reactjs.org/docs/optimizing-performance.html)

### Emergency Contacts

| Role | Contact | Backup |
|------|---------|---------|
| On-call Engineer | on-call@alfalyzer.com | +1-555-0123 |
| Team Lead | team-lead@alfalyzer.com | +1-555-0456 |
| Engineering Manager | eng-manager@alfalyzer.com | +1-555-0789 |
| Platform Engineer | platform@alfalyzer.com | +1-555-0012 |

### Service Accounts

- **Sentry:** sentry@alfalyzer.com
- **AWS:** aws-admin@alfalyzer.com
- **Database:** db-admin@alfalyzer.com
- **Monitoring:** monitoring@alfalyzer.com

---

## 🔄 Continuous Improvement

### Post-Incident Review Process

1. **Immediate Review** (Within 24 hours)
   - What went wrong?
   - What went right?
   - What could be improved?

2. **Root Cause Analysis** (Within 48 hours)
   - Technical root cause
   - Process failures
   - Human factors

3. **Action Items** (Within 1 week)
   - Technical improvements
   - Process improvements
   - Training needs

4. **Follow-up** (Within 1 month)
   - Verify improvements implemented
   - Test effectiveness
   - Update documentation

### Runbook Updates

This runbook should be updated:
- After each incident
- When new features are deployed
- When infrastructure changes
- Quarterly during maintenance reviews

---

*This runbook is a living document and should be updated regularly based on operational experience and system changes.*

*Last updated: January 2025*
*Version: 1.0*