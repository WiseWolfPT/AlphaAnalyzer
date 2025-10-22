#!/bin/bash
# FASE 2 - Daily Valuation Run Validator
# Validates worker metrics, alarms, and cache invalidation after 06:00 UTC run
# Usage: ./scripts/monitoring/validate-daily-run.sh [server_host]

set -euo pipefail

# Configuration
SERVER="${1:-128.140.45.28}"
LOG_LINES=400
REDIS_PASSWORD="alfalyzer2025redis"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 FASE 2 - Daily Valuation Run Validator"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Server: $SERVER"
echo "Timestamp: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
echo ""

# Function to execute SSH commands
ssh_exec() {
    ssh "root@$SERVER" "$@"
}

# Function to print section header
section() {
    echo ""
    echo -e "${BLUE}━━━ $1 ━━━${NC}"
}

# Function to print success
success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Function to print warning
warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Function to print error
error() {
    echo -e "${RED}🔴 $1${NC}"
}

#############################################
# 1. EXTRACT METRICS FROM DAILY UPDATE SUMMARY
#############################################
section "1. Daily Update Metrics"

SUMMARY=$(ssh_exec "pm2 logs valuation-updater --lines $LOG_LINES --nostream 2>/dev/null | grep -A 10 'DAILY Update Summary' | tail -11" || echo "")

if [ -z "$SUMMARY" ]; then
    error "Daily Update Summary not found in logs (worker may not have run yet)"
    exit 1
fi

echo "$SUMMARY"
echo ""

# Extract metrics (Patch 2: Portable grep -E for macOS compatibility)
CALCULATED=$(echo "$SUMMARY" | grep "IVs Calculated:" | grep -oE '[0-9]+/[0-9]+' | cut -d'/' -f1 || echo "0")
TOTAL=$(echo "$SUMMARY" | grep "IVs Calculated:" | grep -oE '[0-9]+/[0-9]+' | cut -d'/' -f2 || echo "0")
FAILED=$(echo "$SUMMARY" | grep "IVs Failed" | grep -oE '[0-9]+' | head -1 || echo "0")
SUCCESS_RATE=$(echo "$SUMMARY" | grep "IVs Calculated:" | grep -oE '\([0-9.]+%\)' | tr -d '()%' || echo "0")

echo "Parsed Metrics:"
echo "  Calculated: $CALCULATED"
echo "  Failed: $FAILED"
echo "  Total: $TOTAL"
echo "  Success Rate: $SUCCESS_RATE%"

#############################################
# 2. CHECK FOR ALARMS
#############################################
section "2. Alarm Status"

ALARMS=$(ssh_exec "pm2 logs valuation-updater --lines $LOG_LINES --nostream 2>/dev/null | egrep 'ALARM|Daily Update OK'" || echo "")

if echo "$ALARMS" | grep -q "ALARM.*METRICS_SANITY_FAILED"; then
    error "METRICS_SANITY_FAILED detected"
    echo "$ALARMS" | grep "METRICS_SANITY_FAILED"
    ALARM_STATUS="CRITICAL"
elif echo "$ALARMS" | grep -q "ALARM.*SUCCESS_RATE_BELOW_TARGET"; then
    warning "SUCCESS_RATE_BELOW_TARGET detected"
    echo "$ALARMS" | grep "SUCCESS_RATE_BELOW_TARGET"
    ALARM_STATUS="WARNING"
elif echo "$ALARMS" | grep -q "ALARM.*CACHE_INVALIDATION_SUSPECT"; then
    error "CACHE_INVALIDATION_SUSPECT detected"
    echo "$ALARMS" | grep "CACHE_INVALIDATION_SUSPECT"
    ALARM_STATUS="CRITICAL"
elif echo "$ALARMS" | grep -q "Daily Update OK"; then
    success "Daily Update OK - No alarms triggered"
    echo "$ALARMS" | grep "Daily Update OK"
    ALARM_STATUS="OK"
else
    warning "No alarm status found in logs"
    ALARM_STATUS="UNKNOWN"
fi

#############################################
# 3. VALIDATE CACHE INVALIDATION
#############################################
section "3. Cache Invalidation Check"

# Count DEL operations in logs
DEL_COUNT=$(ssh_exec "pm2 logs valuation-updater --lines $LOG_LINES --nostream 2>/dev/null | grep -c 'DEL.*iv:calc:' || echo 0")

if [ "$DEL_COUNT" -gt 0 ]; then
    success "Found $DEL_COUNT cache invalidation operations (DEL iv:calc:*)"

    # Show sample of deleted keys
    echo ""
    echo "Sample deleted keys:"
    ssh_exec "pm2 logs valuation-updater --lines $LOG_LINES --nostream 2>/dev/null | grep 'iv:calc:' | head -3"
else
    error "No cache invalidation operations found (expected ~$TOTAL DEL operations)"
fi

#############################################
# 4. SPOT-CHECK ENDPOINTS
#############################################
section "4. Endpoint Spot-Checks"

TEST_TICKERS=("AAPL" "MSFT" "GOOGL")
ENDPOINT_OK=0
ENDPOINT_FAIL=0

for ticker in "${TEST_TICKERS[@]}"; do
    RESULT=$(ssh_exec "curl -s http://127.0.0.1:3001/api/iv/$ticker/main | jq -c '{ticker, iv, shares_m: .inputs.shares_m, price}' 2>/dev/null" || echo "")

    if [ -n "$RESULT" ]; then
        IV=$(echo "$RESULT" | jq -r '.iv // "null"')
        SHARES=$(echo "$RESULT" | jq -r '.shares_m // "null"')

        if [ "$IV" != "null" ] && [ "$SHARES" != "null" ]; then
            success "$ticker: IV=$IV, shares=$SHARES"
            ((ENDPOINT_OK++))
        else
            warning "$ticker: IV or shares is null"
            echo "  Response: $RESULT"
            ((ENDPOINT_FAIL++))
        fi
    else
        error "$ticker: Endpoint failed or returned invalid JSON"
        ((ENDPOINT_FAIL++))
    fi
done

echo ""
echo "Endpoint Results: $ENDPOINT_OK/$((ENDPOINT_OK + ENDPOINT_FAIL)) successful"

#############################################
# 5. VALIDATE METRICS CONSISTENCY
#############################################
section "5. Metrics Consistency Check"

SUM=$((CALCULATED + FAILED))

if [ "$SUM" -eq "$TOTAL" ]; then
    success "Metrics consistent: $CALCULATED + $FAILED = $TOTAL ✓"
elif [ "$SUM" -gt "$TOTAL" ]; then
    error "Metrics BUG: $CALCULATED + $FAILED = $SUM > $TOTAL (double counting detected)"
elif [ "$SUM" -lt "$TOTAL" ]; then
    warning "Metrics GAP: $CALCULATED + $FAILED = $SUM < $TOTAL (missing $((TOTAL - SUM)) tickers)"
else
    warning "Unable to validate metrics consistency"
fi

#############################################
# 6. SUCCESS RATE VALIDATION
#############################################
section "6. Success Rate Validation"

TARGET_RATE=70.0

if (( $(echo "$SUCCESS_RATE >= $TARGET_RATE" | bc -l) )); then
    success "Success rate $SUCCESS_RATE% meets target (≥ $TARGET_RATE%)"
elif (( $(echo "$SUCCESS_RATE >= 50.0" | bc -l) )); then
    warning "Success rate $SUCCESS_RATE% below target but acceptable (≥ 50%)"
else
    error "Success rate $SUCCESS_RATE% critically low (< 50%)"
fi

#############################################
# 7. SUMMARY REPORT
#############################################
section "7. Validation Summary"

echo ""
echo "┌─────────────────────────────────────────────────────────┐"
echo "│                    VALIDATION REPORT                    │"
echo "├─────────────────────────────────────────────────────────┤"
echo "│ Metrics:                                                │"
echo "│   Calculated: $CALCULATED/$TOTAL ($SUCCESS_RATE%)                        │"
echo "│   Failed: $FAILED                                         │"
echo "│   Consistency: $([ "$SUM" -eq "$TOTAL" ] && echo "✅ Valid" || echo "❌ Invalid")                               │"
echo "│                                                         │"
echo "│ Alarms:                                                 │"
echo "│   Status: $ALARM_STATUS                                       │"
echo "│                                                         │"
echo "│ Cache Invalidation:                                     │"
echo "│   DEL operations: $DEL_COUNT (expected: ~$TOTAL)                │"
echo "│                                                         │"
echo "│ Endpoints:                                              │"
echo "│   Spot-checks: $ENDPOINT_OK/$((ENDPOINT_OK + ENDPOINT_FAIL)) successful                       │"
echo "│                                                         │"
echo "│ Overall Status:                                         │"

if [ "$ALARM_STATUS" = "OK" ] && [ "$SUM" -eq "$TOTAL" ] && (( $(echo "$SUCCESS_RATE >= $TARGET_RATE" | bc -l) )); then
    echo "│   🎉 ALL CHECKS PASSED                                  │"
    OVERALL="PASS"
elif [ "$ALARM_STATUS" = "CRITICAL" ] || [ "$SUM" -ne "$TOTAL" ]; then
    echo "│   🔴 CRITICAL ISSUES DETECTED                           │"
    OVERALL="CRITICAL"
else
    echo "│   ⚠️  WARNINGS DETECTED                                 │"
    OVERALL="WARNING"
fi

echo "└─────────────────────────────────────────────────────────┘"
echo ""

#############################################
# 8. RECOMMENDATIONS
#############################################
if [ "$OVERALL" != "PASS" ]; then
    section "8. Recommendations"

    if [ "$ALARM_STATUS" = "CRITICAL" ]; then
        echo "• Investigate CRITICAL alarm root cause"
        echo "• Check PM2 logs: pm2 logs valuation-updater --lines 500"
    fi

    if [ "$SUM" -ne "$TOTAL" ]; then
        echo "• Review worker logic for double-counting or missing tickers"
        echo "• Check 'counted' flag implementation"
    fi

    if (( $(echo "$SUCCESS_RATE < $TARGET_RATE" | bc -l) )); then
        echo "• Review shares fallback cascade effectiveness"
        echo "• Check [Shares] tier logs for common failure patterns"
    fi

    if [ "$DEL_COUNT" -eq 0 ]; then
        echo "• Verify cache invalidation logic (redisCacheService.del)"
        echo "• Check Redis connectivity"
    fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Validation completed at $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Exit with appropriate code
if [ "$OVERALL" = "PASS" ]; then
    exit 0
elif [ "$OVERALL" = "WARNING" ]; then
    exit 1
else
    exit 2
fi
