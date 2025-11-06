#!/bin/bash

echo "🚨 CRITICAL: RATE LIMIT VIOLATIONS DETECTED 🚨"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  IMMEDIATE STATUS - $(date '+%Y-%m-%d %H:%M:%S')"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Count 429 errors in last minute
ERRORS_LAST_100=$(ssh root@128.140.45.28 "pm2 logs alfalyzer --lines 100 --nostream 2>/dev/null | grep -c '429' || echo 0")
ERRORS_LAST_200=$(ssh root@128.140.45.28 "pm2 logs alfalyzer --lines 200 --nostream 2>/dev/null | grep -c '429' || echo 0")
ERRORS_LAST_500=$(ssh root@128.140.45.28 "pm2 logs alfalyzer --lines 500 --nostream 2>/dev/null | grep -c '429' || echo 0")

echo "Rate Limit Errors (429):"
echo "  Last 100 lines: $ERRORS_LAST_100"
echo "  Last 200 lines: $ERRORS_LAST_200"
echo "  Last 500 lines: $ERRORS_LAST_500"
echo ""

# Validation progress
VALIDATION_LOG=$(ssh root@128.140.45.28 "tail -5 /tmp/validation-final-post-rate-limit-fix-*.log 2>/dev/null")
echo "Validation Progress:"
echo "$VALIDATION_LOG"
echo ""

# Get latest timestamps
LATEST_429=$(ssh root@128.140.45.28 "pm2 logs alfalyzer --lines 50 --nostream 2>/dev/null | grep '429' | tail -1")
echo "Latest 429 Error:"
echo "$LATEST_429"
echo ""

# Recommendation
if [ "$ERRORS_LAST_100" -gt 50 ]; then
  echo "🔴 CRITICAL: Rate limiter is FAILING!"
  echo "   Action: STOP validation immediately"
  echo ""
  echo "   Stop command:"
  echo "   ssh root@128.140.45.28 'pkill -f validate-v2.mjs'"
elif [ "$ERRORS_LAST_100" -gt 10 ]; then
  echo "🟡 WARNING: Moderate rate limit violations"
  echo "   Action: Monitor closely, consider slowing down"
else
  echo "🟢 OK: Rate limits under control"
fi
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
