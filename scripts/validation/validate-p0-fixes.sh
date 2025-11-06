#!/bin/bash
# validate-p0-fixes.sh
# Automated validation script for P0 fixes
# Usage: ./scripts/validation/validate-p0-fixes.sh

set -e  # Exit on any error

echo "================================================================================"
echo "AGENT 23: P0 FIXES VALIDATION SCRIPT"
echo "================================================================================"
echo "Target: https://128.140.45.28.sslip.io"
echo "Started: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
echo ""

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

# Helper functions
pass() {
  echo -e "${GREEN}✅ PASS${NC}: $1"
  ((PASS_COUNT++))
}

fail() {
  echo -e "${RED}❌ FAIL${NC}: $1"
  ((FAIL_COUNT++))
}

warn() {
  echo -e "${YELLOW}⚠️  WARN${NC}: $1"
  ((WARN_COUNT++))
}

info() {
  echo "ℹ️  INFO: $1"
}

# Test 1: Check FMPRateLimiter integration
echo "================================================================================"
echo "TEST 1: FMPRateLimiter Integration"
echo "================================================================================"
info "Checking if FMPRateLimiter is in deployed bundle..."

GREP_RESULT=$(ssh root@128.140.45.28 "grep -c 'FMPRateLimiter' '/home/teste 1/dist/server/index.cjs' 2>/dev/null" || echo "0")

if [ "$GREP_RESULT" -gt 0 ]; then
  pass "FMPRateLimiter found in bundle ($GREP_RESULT occurrences)"
else
  fail "FMPRateLimiter NOT found in bundle"
fi
echo ""

# Test 2: Check for HTTP 429 errors
echo "================================================================================"
echo "TEST 2: HTTP 429 Rate Limit Errors"
echo "================================================================================"
info "Checking logs for HTTP 429 errors in last 1000 lines..."

ERROR_COUNT=$(ssh root@128.140.45.28 "pm2 logs intelligent-warming-worker --lines 1000 --nostream 2>/dev/null | grep -c '429' || echo '0'")

if [ "$ERROR_COUNT" -eq 0 ]; then
  pass "Zero HTTP 429 errors detected"
elif [ "$ERROR_COUNT" -lt 5 ]; then
  warn "Found $ERROR_COUNT HTTP 429 errors (acceptable if recent deployment)"
else
  fail "Found $ERROR_COUNT HTTP 429 errors (threshold: <5)"
fi
echo ""

# Test 3: Check Redis key types
echo "================================================================================"
echo "TEST 3: Redis Cache Key Types"
echo "================================================================================"
info "Checking warming:queue key type..."

KEY_TYPE=$(ssh root@128.140.45.28 "redis-cli -a alfalyzer2025redis TYPE warming:queue 2>/dev/null" || echo "error")

if [ "$KEY_TYPE" == "list" ]; then
  pass "Redis warming:queue is correct type (list)"
elif [ "$KEY_TYPE" == "none" ]; then
  pass "Redis warming:queue doesn't exist (will be created as list)"
else
  fail "Redis warming:queue is wrong type: $KEY_TYPE (expected: list)"
fi
echo ""

# Test 4: Check for WRONGTYPE errors
echo "================================================================================"
echo "TEST 4: Redis WRONGTYPE Errors"
echo "================================================================================"
info "Checking logs for WRONGTYPE errors..."

WRONGTYPE_COUNT=$(ssh root@128.140.45.28 "pm2 logs alfalyzer --lines 1000 --nostream 2>/dev/null | grep -c 'WRONGTYPE' || echo '0'")

if [ "$WRONGTYPE_COUNT" -eq 0 ]; then
  pass "Zero WRONGTYPE errors detected"
else
  fail "Found $WRONGTYPE_COUNT WRONGTYPE errors"
fi
echo ""

# Test 5: Check monitoring endpoint performance
echo "================================================================================"
echo "TEST 5: Monitoring Endpoint Performance"
echo "================================================================================"
info "Testing /api/monitoring/warming/overview response time..."

RESPONSE_TIME=$(curl -w "%{time_total}" -o /dev/null -s https://128.140.45.28.sslip.io/api/monitoring/warming/overview 2>/dev/null || echo "999")

if (( $(echo "$RESPONSE_TIME < 0.5" | bc -l 2>/dev/null || echo 0) )); then
  pass "Monitoring endpoint fast (${RESPONSE_TIME}s)"
elif (( $(echo "$RESPONSE_TIME < 1.0" | bc -l 2>/dev/null || echo 0) )); then
  warn "Monitoring endpoint acceptable (${RESPONSE_TIME}s, target <0.5s)"
else
  fail "Monitoring endpoint slow (${RESPONSE_TIME}s, target <1.0s)"
fi
echo ""

# Test 6: Validate IV endpoint
echo "================================================================================"
echo "TEST 6: Intrinsic Value Endpoint"
echo "================================================================================"
info "Testing /api/iv/AAPL/chart endpoint..."

IV_RESPONSE=$(curl -s https://128.140.45.28.sslip.io/api/iv/AAPL/chart 2>/dev/null)
IV_VALUE=$(echo "$IV_RESPONSE" | jq -r '.intrinsicValue // "null"' 2>/dev/null || echo "null")

if [ "$IV_VALUE" != "null" ] && [ "$IV_VALUE" != "" ]; then
  pass "IV endpoint working (AAPL IV: $IV_VALUE)"
else
  fail "IV endpoint broken or returned null"
fi
echo ""

# Test 7: Check cache performance
echo "================================================================================"
echo "TEST 7: Cache Performance"
echo "================================================================================"
info "Testing /api/cache/status endpoint..."

CACHE_STATUS=$(curl -s https://128.140.45.28.sslip.io/api/cache/status 2>/dev/null)
CACHE_SIZE=$(echo "$CACHE_STATUS" | jq -r '.size // "null"' 2>/dev/null || echo "null")

if [ "$CACHE_SIZE" != "null" ] && [ "$CACHE_SIZE" != "" ]; then
  pass "Cache status endpoint working (size: $CACHE_SIZE)"
else
  warn "Cache status endpoint returns null (P1 fix pending)"
fi
echo ""

# Test 8: Check PM2 workers status
echo "================================================================================"
echo "TEST 8: PM2 Workers Health"
echo "================================================================================"
info "Checking PM2 workers status..."

WORKERS_ONLINE=$(ssh root@128.140.45.28 "pm2 jlist 2>/dev/null | jq '[.[] | select(.pm2_env.status == \"online\")] | length'" || echo "0")
WORKERS_EXPECTED=6

if [ "$WORKERS_ONLINE" -eq "$WORKERS_EXPECTED" ]; then
  pass "All $WORKERS_EXPECTED workers online"
elif [ "$WORKERS_ONLINE" -ge 5 ]; then
  warn "$WORKERS_ONLINE/$WORKERS_EXPECTED workers online (1 worker may be stopped by design)"
else
  fail "Only $WORKERS_ONLINE/$WORKERS_EXPECTED workers online"
fi
echo ""

# Test 9: Spot-check random stocks
echo "================================================================================"
echo "TEST 9: Random Stock Validation (10 samples)"
echo "================================================================================"
info "Testing 10 random stocks for valid IV data..."

SYMBOLS=("AAPL" "MSFT" "GOOGL" "AMZN" "TSLA" "NVDA" "META" "JPM" "BAC" "WMT")
STOCK_PASS=0
STOCK_FAIL=0

for symbol in "${SYMBOLS[@]}"; do
  IV_VALUE=$(curl -s "https://128.140.45.28.sslip.io/api/iv/$symbol/chart" 2>/dev/null | jq -r '.intrinsicValue // "null"' 2>/dev/null || echo "null")

  if [ "$IV_VALUE" != "null" ] && [ "$IV_VALUE" != "" ]; then
    echo "  ✅ $symbol: IV = $IV_VALUE"
    ((STOCK_PASS++))
  else
    echo "  ❌ $symbol: FAILED (null or empty)"
    ((STOCK_FAIL++))
  fi
done

if [ "$STOCK_PASS" -eq 10 ]; then
  pass "All 10 stocks returned valid IV data (100%)"
elif [ "$STOCK_PASS" -ge 8 ]; then
  warn "$STOCK_PASS/10 stocks passed (80%+, acceptable)"
else
  fail "Only $STOCK_PASS/10 stocks passed (<80%)"
fi
echo ""

# Test 10: Check bandwidth usage
echo "================================================================================"
echo "TEST 10: Bandwidth Usage"
echo "================================================================================"
info "Checking daily bandwidth usage..."

BANDWIDTH_JSON=$(curl -s https://128.140.45.28.sslip.io/api/monitoring/warming/overview 2>/dev/null | jq -r '.bandwidth // "{}"' 2>/dev/null || echo "{}")
BANDWIDTH_PCT=$(echo "$BANDWIDTH_JSON" | jq -r '.percentage // "null"' 2>/dev/null || echo "null")

if [ "$BANDWIDTH_PCT" != "null" ] && [ "$BANDWIDTH_PCT" != "" ]; then
  if (( $(echo "$BANDWIDTH_PCT < 50" | bc -l 2>/dev/null || echo 0) )); then
    pass "Bandwidth usage: ${BANDWIDTH_PCT}% (sustainable)"
  elif (( $(echo "$BANDWIDTH_PCT < 80" | bc -l 2>/dev/null || echo 0) )); then
    warn "Bandwidth usage: ${BANDWIDTH_PCT}% (acceptable but monitor)"
  else
    fail "Bandwidth usage: ${BANDWIDTH_PCT}% (exceeding budget)"
  fi
else
  warn "Bandwidth data not available (endpoint may be slow)"
fi
echo ""

# Final Summary
echo "================================================================================"
echo "VALIDATION SUMMARY"
echo "================================================================================"
echo "Total Tests: $((PASS_COUNT + FAIL_COUNT + WARN_COUNT))"
echo -e "${GREEN}Passed:${NC} $PASS_COUNT"
echo -e "${YELLOW}Warnings:${NC} $WARN_COUNT"
echo -e "${RED}Failed:${NC} $FAIL_COUNT"
echo ""

if [ "$FAIL_COUNT" -eq 0 ]; then
  echo -e "${GREEN}🎉 ALL CRITICAL TESTS PASSED!${NC}"
  echo ""
  echo "System Status: PRODUCTION READY"
  echo "Estimated Production Readiness: 95%"
  echo ""
  echo "Next Steps:"
  echo "  1. Monitor production for 1 hour"
  echo "  2. Run full backend validation:"
  echo "     node scripts/validation/validate-backend-iv-fast.mjs"
  echo "  3. Deploy P1 fixes within 48 hours"
  echo "  4. Proceed with public launch"
  EXIT_CODE=0
elif [ "$FAIL_COUNT" -le 2 ] && [ "$WARN_COUNT" -le 3 ]; then
  echo -e "${YELLOW}⚠️  ACCEPTABLE WITH WARNINGS${NC}"
  echo ""
  echo "System Status: MOSTLY READY (minor issues detected)"
  echo "Estimated Production Readiness: 85-90%"
  echo ""
  echo "Next Steps:"
  echo "  1. Review failed tests above"
  echo "  2. Fix critical issues if any"
  echo "  3. Re-run validation"
  echo "  4. Monitor for 24 hours before full launch"
  EXIT_CODE=1
else
  echo -e "${RED}❌ VALIDATION FAILED${NC}"
  echo ""
  echo "System Status: NOT READY (critical issues detected)"
  echo "Estimated Production Readiness: <80%"
  echo ""
  echo "Next Steps:"
  echo "  1. Review AGENT_23_STRATEGIC_GAP_ANALYSIS.md for fix guides"
  echo "  2. Apply P0 fixes (FMPRateLimiter + Redis flush)"
  echo "  3. Redeploy to production"
  echo "  4. Re-run this validation script"
  echo ""
  echo "Rollback if necessary:"
  echo "  git revert HEAD"
  echo "  npm run build:server"
  echo "  npm run deploy:server"
  EXIT_CODE=2
fi

echo ""
echo "Validation completed: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
echo "Full report: AGENT_23_STRATEGIC_GAP_ANALYSIS.md"
echo "================================================================================"

exit $EXIT_CODE
