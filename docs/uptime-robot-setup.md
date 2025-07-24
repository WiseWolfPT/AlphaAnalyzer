# UptimeRobot Configuration for Alfalyzer Backend Keep-Alive

## Overview
This guide explains how to configure UptimeRobot to keep the Alfalyzer backend on Koyeb awake and prevent cold starts.

## Why UptimeRobot?

Koyeb's free tier has an automatic sleep feature:
- Services sleep after **1 hour** of inactivity
- Cold start takes **1-5 seconds** when waking up
- This causes poor user experience on first request
- WebSocket connections are lost during sleep

UptimeRobot will ping our service every 45 minutes to keep it awake.

## Setup Instructions

### 1. Create UptimeRobot Account
1. Go to [https://uptimerobot.com](https://uptimerobot.com)
2. Sign up for a free account (50 monitors included)
3. Verify your email address

### 2. Add New Monitor

1. Click **"+ Add New Monitor"** button
2. Configure the monitor with these settings:

**Basic Settings:**
- **Monitor Type**: HTTP(s)
- **Friendly Name**: Alfalyzer Backend Keep-Alive
- **URL**: `https://crucial-ivonne-alfalyzer-90666a9e.koyeb.app/api/health`
- **Monitoring Interval**: 45 minutes

**Advanced Settings:**
- **HTTP Method**: GET
- **Request Timeout**: 30 seconds (accounts for cold start)
- **Request Headers** (optional):
  ```
  X-Monitor-Source: UptimeRobot
  ```

### 3. Configure Alerts (Optional but Recommended)

1. In the "Alert Contacts To Notify" section:
   - Add your email address
   - Set alert threshold to **2 consecutive failures**
   - Choose alert types: Email

2. This will notify you if:
   - Backend is actually down
   - Koyeb service has issues
   - API endpoint changes

### 4. Additional Monitoring (Production)

For production, add these additional monitors:

**Critical Endpoints Monitor:**
- **URL**: `https://crucial-ivonne-alfalyzer-90666a9e.koyeb.app/api/v1/market/status`
- **Monitoring Interval**: 5 minutes
- **Purpose**: Monitor API functionality

**Admin Keep-Alive Ping:**
- **URL**: `https://crucial-ivonne-alfalyzer-90666a9e.koyeb.app/api/admin/keep-alive/ping`
- **Monitoring Interval**: 45 minutes
- **HTTP Method**: POST
- **Purpose**: Dedicated keep-alive endpoint with metrics

### 5. Verify Setup

1. After creating the monitor, wait for first check
2. Monitor should show **"Up"** status
3. Check Koyeb logs to confirm ping received:
   ```
   🫀 Keep-alive ping to prevent cold start...
   📡 Received keep-alive ping from UptimeRobot
   ```

## Alternative: GitHub Actions Keep-Alive

If you prefer not to use an external service, use GitHub Actions:

### Create `.github/workflows/keep-alive.yml`:

```yaml
name: Keep Backend Alive

on:
  schedule:
    # Run every 45 minutes
    - cron: '*/45 * * * *'
  workflow_dispatch: # Allow manual trigger

jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Keep Backend Alive
        run: |
          response=$(curl -s -o /dev/null -w "%{http_code}" https://crucial-ivonne-alfalyzer-90666a9e.koyeb.app/api/health)
          if [ $response -eq 200 ]; then
            echo "✅ Backend is alive (HTTP $response)"
          else
            echo "❌ Backend returned HTTP $response"
            exit 1
          fi
      
      - name: Log Metrics
        if: always()
        run: |
          echo "Ping timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
          echo "Next run in 45 minutes"
```

### Advantages of GitHub Actions:
- Free for public repos
- No external dependencies
- Integrated with your codebase
- Can trigger other workflows on failure

### Disadvantages:
- Limited to GitHub's infrastructure
- May have delays during high load
- Requires repository access

## Monitoring Dashboard

### Access Performance Metrics:
```
GET /api/admin/monitoring/health
GET /api/admin/monitoring/performance
GET /api/admin/cron/status
```

### Key Metrics to Watch:
1. **Cold Starts**: Should be 0 after initial setup
2. **Average Response Time**: Should be <200ms for cached data
3. **Uptime**: Should show continuous uptime
4. **Keep-Alive Pings**: Should show regular 45-minute intervals

## Troubleshooting

### Monitor Shows "Down"
1. Check Koyeb dashboard for service status
2. Verify URL hasn't changed
3. Check for API rate limiting
4. Review Koyeb logs for errors

### Still Getting Cold Starts
1. Verify monitor interval is 45 minutes (not 50 or 60)
2. Check if Koyeb has changed sleep timeout
3. Ensure health endpoint responds quickly
4. Consider adding second monitor at 30-minute offset

### High Response Times
1. First ping after setup may be slow (cold start)
2. Subsequent pings should be fast (<500ms)
3. If consistently slow, check Koyeb resource usage

## Best Practices

1. **Use Multiple Monitors**: 
   - One for keep-alive (45 min)
   - One for functionality (5 min)
   - One for critical endpoints (15 min)

2. **Monitor Different Endpoints**:
   - Prevents single point of failure
   - Tests different parts of the system
   - Provides better coverage

3. **Set Appropriate Timeouts**:
   - 30 seconds for keep-alive (accounts for cold start)
   - 10 seconds for warm endpoints
   - 5 seconds for critical paths

4. **Review Logs Regularly**:
   - Check for patterns in response times
   - Monitor for failed pings
   - Track cold start frequency

## Cost Optimization

### Free Tier Limits:
- **UptimeRobot**: 50 monitors, 5-minute minimum interval
- **Koyeb**: Unlimited requests, but sleeps after 1 hour idle
- **Solution**: 45-minute ping uses only 32 checks/day

### Estimated Usage:
- Keep-alive monitor: 32 checks/day = 960 checks/month
- Well within free tier limits
- Zero cost for basic monitoring

## Integration with Alfalyzer

The backend automatically:
1. Detects cold starts and logs them
2. Reports metrics to Supabase Realtime
3. Tracks keep-alive effectiveness
4. Provides dashboard for monitoring

### View Metrics:
```bash
# Get keep-alive metrics
curl https://crucial-ivonne-alfalyzer-90666a9e.koyeb.app/api/admin/monitoring/health

# Get cron job status
curl https://crucial-ivonne-alfalyzer-90666a9e.koyeb.app/api/admin/cron/status
```

## Conclusion

With UptimeRobot configured:
- ✅ No more cold starts for users
- ✅ Consistent response times
- ✅ Better user experience
- ✅ Zero additional cost
- ✅ Automatic monitoring and alerts

The 45-minute interval is optimal for Koyeb's 1-hour sleep timeout, ensuring the service stays warm while minimizing unnecessary requests.