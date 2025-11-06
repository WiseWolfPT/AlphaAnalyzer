#!/bin/bash

TARGET_URL="${1:-https://128.140.45.28.sslip.io}"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  FMP API RATE LIMIT SNAPSHOT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Timestamp: $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "Target:    $TARGET_URL"
echo ""

# Get health endpoint
echo "Fetching health data..."
HEALTH=$(curl -s "$TARGET_URL/api/health" 2>/dev/null)

# Get cache stats
echo "Fetching cache status..."
CACHE=$(curl -s "$TARGET_URL/api/cache/status" 2>/dev/null)

# Extract metrics
REDIS_STATUS=$(echo "$HEALTH" | jq -r '.redis.connected // "unknown"')
API_STATUS=$(echo "$HEALTH" | jq -r '.status // "unknown"')
CACHE_SIZE=$(echo "$CACHE" | jq -r '.totalKeys // 0')
CACHE_MEMORY=$(echo "$CACHE" | jq -r '.memoryUsage // "0MB"')

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  SYSTEM HEALTH"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "API Status:      $API_STATUS"
echo "Redis Connected: $REDIS_STATUS"
echo "Cache Size:      $CACHE_SIZE keys"
echo "Cache Memory:    $CACHE_MEMORY"
echo ""

# Parse PM2 logs for FMP activity
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  FMP API ACTIVITY (Last 100 log lines)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

FMP_CALLS=$(ssh root@128.140.45.28 "pm2 logs alfalyzer --lines 100 --nostream 2>/dev/null | grep -c 'FMP API call' || echo 0")
RATE_429=$(ssh root@128.140.45.28 "pm2 logs alfalyzer --lines 100 --nostream 2>/dev/null | grep -c '429' || echo 0")
RECENT_ERRORS=$(ssh root@128.140.45.28 "pm2 logs alfalyzer --lines 100 --nostream 2>/dev/null | grep -c 'Error' || echo 0")

echo "FMP API Calls:   $FMP_CALLS (in last 100 log lines)"
echo "Rate Limit 429s: $RATE_429"
echo "Errors Logged:   $RECENT_ERRORS"
echo ""

# Calculate approximate rate
CALLS_PER_MIN=$((FMP_CALLS * 60 / 100))
echo "Estimated Rate:  ~$CALLS_PER_MIN calls/min"
echo "Target Safe:     200 calls/min"
echo "Hard Limit:      300 calls/min (FMP)"
echo ""

# Status determination
if [ "$CALLS_PER_MIN" -gt 280 ]; then
  echo "Status: 🔴 CRITICAL - Rate approaching limit!"
elif [ "$CALLS_PER_MIN" -gt 220 ]; then
  echo "Status: 🟡 WARNING - Rate above safe threshold"
else
  echo "Status: 🟢 OK - Rate within safe limits"
fi
echo ""

# Show recent FMP API calls
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  RECENT FMP API CALLS (Last 10)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
ssh root@128.140.45.28 "pm2 logs alfalyzer --lines 100 --nostream 2>/dev/null | grep 'FMP API call' | tail -10 | sed 's/^18|alfalyz | //'"
echo ""

# PM2 process status
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  PM2 PROCESSES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
ssh root@128.140.45.28 "pm2 jlist" | jq -r '.[] | select(.pm2_env.status == "online") | "\(.name): \(.monit.cpu)% CPU, \(.monit.memory / 1024 / 1024 | floor)MB RAM, uptime \(.pm2_env.pm_uptime | tonumber | . / 1000 / 60 | floor)min"'
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
