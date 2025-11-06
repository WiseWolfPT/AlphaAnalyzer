#!/bin/bash

TARGET_URL="${1:-https://128.140.45.28.sslip.io}"
INTERVAL=5  # seconds

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  FMP API RATE LIMIT MONITOR"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Target:   $TARGET_URL"
echo "Interval: ${INTERVAL}s refresh"
echo "Limit:    300 calls/min (FMP)"
echo "Safe:     200 calls/min (target)"
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

while true; do
  # Get health endpoint
  HEALTH=$(curl -s "$TARGET_URL/api/health" 2>/dev/null)

  # Get cache stats
  CACHE=$(curl -s "$TARGET_URL/api/cache/status" 2>/dev/null)

  # Extract metrics
  REDIS_STATUS=$(echo "$HEALTH" | jq -r '.redis.connected // "unknown"')
  CACHE_SIZE=$(echo "$CACHE" | jq -r '.totalKeys // 0')
  CACHE_MEMORY=$(echo "$CACHE" | jq -r '.memoryUsage // "0MB"')

  # Parse PM2 logs for rate info (requires SSH access)
  RECENT_CALLS=$(ssh root@128.140.45.28 "pm2 logs alfalyzer --lines 100 --nostream 2>/dev/null | grep -c 'FMP API' || echo 0")
  RATE_LIMIT_HITS=$(ssh root@128.140.45.28 "pm2 logs alfalyzer --lines 100 --nostream 2>/dev/null | grep -c '429' || echo 0")

  # Calculate rate (approximate)
  CALLS_PER_MIN=$((RECENT_CALLS * 60 / 100))

  # Determine status
  if [ "$CALLS_PER_MIN" -gt 280 ]; then
    STATUS="${RED}CRITICAL${NC}"
    STATUS_ICON="🔴"
  elif [ "$CALLS_PER_MIN" -gt 220 ]; then
    STATUS="${YELLOW}WARNING${NC}"
    STATUS_ICON="🟡"
  else
    STATUS="${GREEN}OK${NC}"
    STATUS_ICON="🟢"
  fi

  # Clear screen
  clear

  # Print dashboard
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  FMP API RATE LIMIT MONITOR - $(date '+%H:%M:%S')"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  echo -e "Status:          $STATUS_ICON $STATUS"
  echo -e "Current Rate:    $CALLS_PER_MIN calls/min"
  echo -e "Target Limit:    200 calls/min (safe)"
  echo -e "Hard Limit:      300 calls/min (FMP)"
  echo ""

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  SYSTEM HEALTH"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  echo -e "Redis:           $([ "$REDIS_STATUS" = "true" ] && echo "${GREEN}●${NC} Connected" || echo "${RED}●${NC} Disconnected")"
  echo -e "Cache Size:      $CACHE_SIZE keys"
  echo -e "Cache Memory:    $CACHE_MEMORY"
  echo ""

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  RATE LIMIT VIOLATIONS"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  if [ "$RATE_LIMIT_HITS" -gt 0 ]; then
    echo -e "${RED}⚠️  HTTP 429 errors detected: $RATE_LIMIT_HITS${NC}"
  else
    echo -e "${GREEN}✓ No rate limit violations${NC}"
  fi
  echo ""

  # Wait before next refresh
  sleep $INTERVAL
done
