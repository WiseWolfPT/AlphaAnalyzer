#!/bin/bash
# COMPREHENSIVE INTRINSIC VALUE PRODUCTION TEST
# Compatible with Bash 3.2+

set -euo pipefail

BASE_URL="${TEST_API_URL:-https://128.140.45.28.sslip.io}"
REPORT_FILE="/tmp/iv-test-report-$(date +%Y-%m-%d-%H%M%S).txt"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Test counters
TOTAL_TESTS=0
PASSED=0
FAILED=0
ERRORS=0

# Performance
TOTAL_TIME=0
CACHE_MISS_TIME=0
CACHE_HIT_TIME=0
CACHE_COUNT=0

# Sector counters (using separate variables)
TECH_TOTAL=0 TECH_PASSED=0
FINANCE_TOTAL=0 FINANCE_PASSED=0
HEALTH_TOTAL=0 HEALTH_PASSED=0
CONSUMER_TOTAL=0 CONSUMER_PASSED=0
ENERGY_TOTAL=0 ENERGY_PASSED=0
INDUSTRIAL_TOTAL=0 INDUSTRIAL_PASSED=0
PORTUGUESE_TOTAL=0 PORTUGUESE_PASSED=0

# Store failures
FAILURES_LOG="/tmp/iv-test-failures.log"
: > "$FAILURES_LOG"

echo "======================================================================================================"
echo "🧪 COMPREHENSIVE INTRINSIC VALUE PRODUCTION TEST"
echo "======================================================================================================"
echo "Target: $BASE_URL"
echo "Date: $(date)"
echo "======================================================================================================"
echo ""

# Test function
test_stock() {
    local ticker="$1"
    local sector="$2"
    local expected="$3"

    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    # Update sector total
    case "$sector" in
        Technology) TECH_TOTAL=$((TECH_TOTAL + 1)) ;;
        Finance) FINANCE_TOTAL=$((FINANCE_TOTAL + 1)) ;;
        Healthcare) HEALTH_TOTAL=$((HEALTH_TOTAL + 1)) ;;
        Consumer) CONSUMER_TOTAL=$((CONSUMER_TOTAL + 1)) ;;
        Energy) ENERGY_TOTAL=$((ENERGY_TOTAL + 1)) ;;
        Industrial) INDUSTRIAL_TOTAL=$((INDUSTRIAL_TOTAL + 1)) ;;
        Portuguese) PORTUGUESE_TOTAL=$((PORTUGUESE_TOTAL + 1)) ;;
    esac

    printf "[%2d/35] %-10s (%-12s) ... " "$TOTAL_TESTS" "$ticker" "$sector"

    # Test with timing
    START=$(date +%s%3N 2>/dev/null || echo $(($(date +%s) * 1000)))
    RESPONSE=$(curl -s -w "\n%{http_code}" "${BASE_URL}/api/iv/${ticker}/chart" 2>&1 || echo -e "\nerror")
    END=$(date +%s%3N 2>/dev/null || echo $(($(date +%s) * 1000)))

    HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
    JSON=$(echo "$RESPONSE" | sed '$d')
    TIME=$((END - START))
    TOTAL_TIME=$((TOTAL_TIME + TIME))

    # Validate
    if [ "$HTTP_CODE" != "200" ]; then
        ERRORS=$((ERRORS + 1))
        echo -e "${RED}❌ ERROR${NC} (HTTP $HTTP_CODE)"
        echo "$ticker - HTTP $HTTP_CODE" >> "$FAILURES_LOG"
        return
    fi

    METHODS=$(echo "$JSON" | jq -r '.methods | length' 2>/dev/null || echo "0")

    if [ "$METHODS" -lt "$expected" ]; then
        FAILED=$((FAILED + 1))
        echo -e "${YELLOW}⚠️  FAIL${NC} (Got $METHODS methods, expected ≥$expected)"
        echo "$ticker - Only $METHODS methods (expected ≥$expected)" >> "$FAILURES_LOG"
        return
    fi

    # Test cache hit
    sleep 0.1
    CACHE_START=$(date +%s%3N 2>/dev/null || echo $(($(date +%s) * 1000)))
    curl -s "${BASE_URL}/api/iv/${ticker}/chart" >/dev/null 2>&1
    CACHE_END=$(date +%s%3N 2>/dev/null || echo $(($(date +%s) * 1000)))
    CACHE_TIME=$((CACHE_END - CACHE_START))

    CACHE_MISS_TIME=$((CACHE_MISS_TIME + TIME))
    CACHE_HIT_TIME=$((CACHE_HIT_TIME + CACHE_TIME))
    CACHE_COUNT=$((CACHE_COUNT + 1))

    # Success
    PASSED=$((PASSED + 1))

    case "$sector" in
        Technology) TECH_PASSED=$((TECH_PASSED + 1)) ;;
        Finance) FINANCE_PASSED=$((FINANCE_PASSED + 1)) ;;
        Healthcare) HEALTH_PASSED=$((HEALTH_PASSED + 1)) ;;
        Consumer) CONSUMER_PASSED=$((CONSUMER_PASSED + 1)) ;;
        Energy) ENERGY_PASSED=$((ENERGY_PASSED + 1)) ;;
        Industrial) INDUSTRIAL_PASSED=$((INDUSTRIAL_PASSED + 1)) ;;
        Portuguese) PORTUGUESE_PASSED=$((PORTUGUESE_PASSED + 1)) ;;
    esac

    echo -e "${GREEN}✅ PASS${NC} ($METHODS methods, ${TIME}ms)"

    sleep 0.5
}

# Run tests
echo "🔧 TECHNOLOGY SECTOR"
echo "------------------------------------------------------------------------------------------------------"
test_stock "AAPL" "Technology" 10
test_stock "MSFT" "Technology" 10
test_stock "GOOGL" "Technology" 10
test_stock "NVDA" "Technology" 10
test_stock "META" "Technology" 10

echo ""
echo "💰 FINANCE SECTOR"
echo "------------------------------------------------------------------------------------------------------"
test_stock "JPM" "Finance" 10
test_stock "BAC" "Finance" 10
test_stock "WFC" "Finance" 10
test_stock "GS" "Finance" 10
test_stock "MS" "Finance" 10

echo ""
echo "🏥 HEALTHCARE SECTOR"
echo "------------------------------------------------------------------------------------------------------"
test_stock "JNJ" "Healthcare" 10
test_stock "UNH" "Healthcare" 10
test_stock "PFE" "Healthcare" 10
test_stock "ABBV" "Healthcare" 10
test_stock "LLY" "Healthcare" 10

echo ""
echo "🛒 CONSUMER SECTOR"
echo "------------------------------------------------------------------------------------------------------"
test_stock "AMZN" "Consumer" 10
test_stock "WMT" "Consumer" 10
test_stock "COST" "Consumer" 10
test_stock "NKE" "Consumer" 10
test_stock "MCD" "Consumer" 10

echo ""
echo "⚡ ENERGY SECTOR"
echo "------------------------------------------------------------------------------------------------------"
test_stock "XOM" "Energy" 10
test_stock "CVX" "Energy" 10
test_stock "COP" "Energy" 10
test_stock "SLB" "Energy" 10
test_stock "EOG" "Energy" 10

echo ""
echo "🏭 INDUSTRIAL SECTOR"
echo "------------------------------------------------------------------------------------------------------"
test_stock "CAT" "Industrial" 10
test_stock "BA" "Industrial" 10
test_stock "HON" "Industrial" 10
test_stock "UPS" "Industrial" 10
test_stock "GE" "Industrial" 10

echo ""
echo "🇵🇹 PORTUGUESE MARKET"
echo "------------------------------------------------------------------------------------------------------"
test_stock "EDP.LS" "Portuguese" 10
test_stock "GALP.LS" "Portuguese" 10
test_stock "NOS.LS" "Portuguese" 10
test_stock "BCP.LS" "Portuguese" 10
test_stock "JMT.LS" "Portuguese" 10

# Summary
echo ""
echo "======================================================================================================"
echo "📊 TEST SUMMARY"
echo "======================================================================================================"
echo ""
echo "Total Stocks Tested: $TOTAL_TESTS"
echo -e "✅ Passed: ${GREEN}$PASSED${NC} ($(echo "scale=1; $PASSED * 100 / $TOTAL_TESTS" | bc)%)"
echo -e "⚠️  Failed: ${YELLOW}$FAILED${NC}"
echo -e "❌ Errors: ${RED}$ERRORS${NC}"

PASS_RATE=$(echo "scale=1; $PASSED * 100 / $TOTAL_TESTS" | bc)

echo ""
echo "======================================================================================================"
echo "🏢 SECTOR BREAKDOWN"
echo "======================================================================================================"
echo ""
printf "%-15s %8s %8s %10s\n" "Sector" "Tested" "Passed" "Pass Rate"
echo "------------------------------------------------------------------------------------------------------"

print_sector() {
    local name="$1" total="$2" passed="$3"
    if [ "$total" -gt 0 ]; then
        local rate=$(echo "scale=1; $passed * 100 / $total" | bc)
        local status="✅"
        [ "$passed" -lt "$total" ] && [ "$passed" -gt 0 ] && status="⚠️"
        [ "$passed" -eq 0 ] && status="❌"
        printf "%-15s %8d %8d %9s%% %s\n" "$name" "$total" "$passed" "$rate" "$status"
    fi
}

print_sector "Technology" $TECH_TOTAL $TECH_PASSED
print_sector "Finance" $FINANCE_TOTAL $FINANCE_PASSED
print_sector "Healthcare" $HEALTH_TOTAL $HEALTH_PASSED
print_sector "Consumer" $CONSUMER_TOTAL $CONSUMER_PASSED
print_sector "Energy" $ENERGY_TOTAL $ENERGY_PASSED
print_sector "Industrial" $INDUSTRIAL_TOTAL $INDUSTRIAL_PASSED
print_sector "Portuguese" $PORTUGUESE_TOTAL $PORTUGUESE_PASSED

# Performance
echo ""
echo "======================================================================================================"
echo "⚡ PERFORMANCE METRICS"
echo "======================================================================================================"
echo ""

AVG_TIME=$(echo "scale=0; $TOTAL_TIME / $TOTAL_TESTS" | bc)
echo "Avg Response Time (all): ${AVG_TIME}ms"

if [ $CACHE_COUNT -gt 0 ]; then
    AVG_MISS=$(echo "scale=0; $CACHE_MISS_TIME / $CACHE_COUNT" | bc)
    AVG_HIT=$(echo "scale=0; $CACHE_HIT_TIME / $CACHE_COUNT" | bc)
    IMPROVEMENT=$(echo "scale=1; ($CACHE_MISS_TIME - $CACHE_HIT_TIME) * 100 / $CACHE_MISS_TIME" | bc)

    echo "Avg Response Time (cache miss): ${AVG_MISS}ms"
    echo "Avg Response Time (cache hit): ${AVG_HIT}ms"
    echo "Cache Improvement: ${IMPROVEMENT}%"
    echo ""

    [ "$AVG_MISS" -lt 2000 ] && echo "✅ Cache miss performance GOOD (< 2000ms)" || echo "⚠️  Cache miss needs improvement"
    [ "$AVG_HIT" -lt 500 ] && echo "✅ Cache hit performance GOOD (< 500ms)" || echo "⚠️  Cache hit needs improvement"
fi

# Failed tests
if [ -s "$FAILURES_LOG" ]; then
    echo ""
    echo "======================================================================================================"
    echo "❌ FAILED TESTS"
    echo "======================================================================================================"
    echo ""
    cat "$FAILURES_LOG"
fi

# Verdict
echo ""
echo "======================================================================================================"
echo "⚖️  VERDICT"
echo "======================================================================================================"
echo ""

if (( $(echo "$PASS_RATE >= 90" | bc -l) )) && [ ! -s "$FAILURES_LOG" ]; then
    echo -e "${GREEN}✅ PASS${NC} - System is production ready"
    echo "   - Pass rate: ${PASS_RATE}% (target: ≥90%)"
    echo "   - All sectors working"
    EXIT_CODE=0
elif (( $(echo "$PASS_RATE >= 90" | bc -l) )); then
    echo -e "${YELLOW}⚠️  CONDITIONAL PASS${NC} - System working with minor issues"
    echo "   - Pass rate: ${PASS_RATE}% (target: ≥90%)"
    EXIT_CODE=0
else
    echo -e "${RED}❌ FAIL${NC} - System not production ready"
    echo "   - Pass rate: ${PASS_RATE}% (target: ≥90%)"
    EXIT_CODE=1
fi

echo ""
echo "======================================================================================================"
echo ""

exit $EXIT_CODE
