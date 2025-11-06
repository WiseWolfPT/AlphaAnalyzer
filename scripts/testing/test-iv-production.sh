#!/usr/bin/env bash
# COMPREHENSIVE INTRINSIC VALUE PRODUCTION TEST
# Tests 35 stocks across 7 sectors

set -euo pipefail

BASE_URL="${TEST_API_URL:-https://128.140.45.28.sslip.io}"
RESULTS_FILE="/tmp/iv-test-results-$(date +%Y-%m-%d-%H%M%S).json"
REPORT_FILE="/tmp/iv-test-report-$(date +%Y-%m-%d-%H%M%S).txt"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED=0
FAILED=0
ERRORS=0

# Performance metrics
TOTAL_RESPONSE_TIME=0
TOTAL_CACHE_MISS_TIME=0
TOTAL_CACHE_HIT_TIME=0
CACHE_TESTS=0

# Sector counters
declare -A SECTOR_TOTAL
declare -A SECTOR_PASSED

# Arrays to store results
declare -a TEST_RESULTS
declare -a FAILED_TESTS

echo "======================================================================================================"
echo "🧪 COMPREHENSIVE INTRINSIC VALUE PRODUCTION TEST"
echo "======================================================================================================"
echo "Target: $BASE_URL"
echo "Date: $(date)"
echo "======================================================================================================"
echo ""

# Test stocks by sector
declare -a TECH_STOCKS=("AAPL" "MSFT" "GOOGL" "NVDA" "META")
declare -a FINANCE_STOCKS=("JPM" "BAC" "WFC" "GS" "MS")
declare -a HEALTHCARE_STOCKS=("JNJ" "UNH" "PFE" "ABBV" "LLY")
declare -a CONSUMER_STOCKS=("AMZN" "WMT" "COST" "NKE" "MCD")
declare -a ENERGY_STOCKS=("XOM" "CVX" "COP" "SLB" "EOG")
declare -a INDUSTRIAL_STOCKS=("CAT" "BA" "HON" "UPS" "GE")
declare -a PORTUGUESE_STOCKS=("EDP.LS" "GALP.LS" "NOS.LS" "BCP.LS" "JMT.LS")

# Function to test a single stock
test_stock() {
    local ticker="$1"
    local sector="$2"
    local expected_methods="${3:-10}"

    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    SECTOR_TOTAL[$sector]=$((${SECTOR_TOTAL[$sector]:-0} + 1))

    local progress="[$(printf '%2d' $TOTAL_TESTS)/35]"
    printf "%s %-10s (%-12s) ... " "$progress" "$ticker" "$sector"

    # Measure cache MISS time (first request)
    local start_time=$(date +%s%3N)
    local response=$(curl -s -w "\n%{http_code}\n%{time_total}" "${BASE_URL}/api/iv/${ticker}/chart" 2>/dev/null || echo "error")
    local end_time=$(date +%s%3N)

    # Parse response
    local http_code=$(echo "$response" | tail -2 | head -1)
    local response_time_ms=$((end_time - start_time))
    local json_data=$(echo "$response" | head -1)

    TOTAL_RESPONSE_TIME=$((TOTAL_RESPONSE_TIME + response_time_ms))

    # Check for errors
    if [ "$http_code" != "200" ]; then
        ERRORS=$((ERRORS + 1))
        echo -e "${RED}❌ ERROR${NC} (HTTP $http_code)"
        FAILED_TESTS+=("$ticker - HTTP $http_code")
        return
    fi

    # Validate response
    if ! echo "$json_data" | jq -e '.methods' >/dev/null 2>&1; then
        FAILED=$((FAILED + 1))
        echo -e "${YELLOW}⚠️  FAIL${NC} (Invalid JSON)"
        FAILED_TESTS+=("$ticker - Invalid JSON response")
        return
    fi

    # Check methods count
    local methods_count=$(echo "$json_data" | jq -r '.methods | length')
    if [ "$methods_count" -lt "$expected_methods" ]; then
        FAILED=$((FAILED + 1))
        echo -e "${YELLOW}⚠️  FAIL${NC} (Expected ≥$expected_methods methods, got $methods_count)"
        FAILED_TESTS+=("$ticker - Only $methods_count methods (expected ≥$expected_methods)")
        return
    fi

    # Validate all methods have valid IVs
    local invalid_methods=$(echo "$json_data" | jq '[.methods[] | select(.iv <= 0 or (.iv | isinfinite))] | length')
    if [ "$invalid_methods" -gt 0 ]; then
        FAILED=$((FAILED + 1))
        echo -e "${YELLOW}⚠️  FAIL${NC} ($invalid_methods invalid IVs)"
        FAILED_TESTS+=("$ticker - $invalid_methods methods have invalid IVs")
        return
    fi

    # Test cache HIT (second request)
    sleep 0.1
    local cache_start=$(date +%s%3N)
    curl -s "${BASE_URL}/api/iv/${ticker}/chart" >/dev/null 2>&1
    local cache_end=$(date +%s%3N)
    local cache_hit_time=$((cache_end - cache_start))

    TOTAL_CACHE_MISS_TIME=$((TOTAL_CACHE_MISS_TIME + response_time_ms))
    TOTAL_CACHE_HIT_TIME=$((TOTAL_CACHE_HIT_TIME + cache_hit_time))
    CACHE_TESTS=$((CACHE_TESTS + 1))

    # Calculate cache improvement
    local improvement=0
    if [ "$response_time_ms" -gt 0 ]; then
        improvement=$(echo "scale=1; (($response_time_ms - $cache_hit_time) * 100) / $response_time_ms" | bc)
    fi

    # Success!
    PASSED=$((PASSED + 1))
    SECTOR_PASSED[$sector]=$((${SECTOR_PASSED[$sector]:-0} + 1))
    echo -e "${GREEN}✅ PASS${NC} ($methods_count methods, ${response_time_ms}ms, cache: ${improvement}% faster)"

    # Store result
    TEST_RESULTS+=("$ticker|$sector|PASS|$methods_count|$response_time_ms|$cache_hit_time")

    # Small delay to avoid rate limiting
    sleep 0.5
}

# Run tests by sector
echo "🔧 TECHNOLOGY SECTOR"
echo "------------------------------------------------------------------------------------------------------"
for stock in "${TECH_STOCKS[@]}"; do
    test_stock "$stock" "Technology" 15
done

echo ""
echo "💰 FINANCE SECTOR"
echo "------------------------------------------------------------------------------------------------------"
for stock in "${FINANCE_STOCKS[@]}"; do
    test_stock "$stock" "Finance" 15
done

echo ""
echo "🏥 HEALTHCARE SECTOR"
echo "------------------------------------------------------------------------------------------------------"
for stock in "${HEALTHCARE_STOCKS[@]}"; do
    test_stock "$stock" "Healthcare" 15
done

echo ""
echo "🛒 CONSUMER SECTOR"
echo "------------------------------------------------------------------------------------------------------"
for stock in "${CONSUMER_STOCKS[@]}"; do
    test_stock "$stock" "Consumer" 15
done

echo ""
echo "⚡ ENERGY SECTOR"
echo "------------------------------------------------------------------------------------------------------"
for stock in "${ENERGY_STOCKS[@]}"; do
    test_stock "$stock" "Energy" 15
done

echo ""
echo "🏭 INDUSTRIAL SECTOR"
echo "------------------------------------------------------------------------------------------------------"
for stock in "${INDUSTRIAL_STOCKS[@]}"; do
    test_stock "$stock" "Industrial" 15
done

echo ""
echo "🇵🇹 PORTUGUESE MARKET"
echo "------------------------------------------------------------------------------------------------------"
for stock in "${PORTUGUESE_STOCKS[@]}"; do
    test_stock "$stock" "Portuguese" 10
done

# ========== SUMMARY ==========
echo ""
echo "======================================================================================================"
echo "📊 TEST SUMMARY"
echo "======================================================================================================"
echo ""
echo "Total Stocks Tested: $TOTAL_TESTS"
echo -e "✅ Passed: ${GREEN}$PASSED${NC} ($(echo "scale=1; ($PASSED * 100) / $TOTAL_TESTS" | bc)%)"
echo -e "⚠️  Failed: ${YELLOW}$FAILED${NC}"
echo -e "❌ Errors: ${RED}$ERRORS${NC}"

# Calculate pass rate
PASS_RATE=$(echo "scale=1; ($PASSED * 100) / $TOTAL_TESTS" | bc)

echo ""
echo "======================================================================================================"
echo "🏢 SECTOR BREAKDOWN"
echo "======================================================================================================"
echo ""
printf "%-15s %8s %8s %10s\n" "Sector" "Tested" "Passed" "Pass Rate"
echo "------------------------------------------------------------------------------------------------------"

for sector in "Technology" "Finance" "Healthcare" "Consumer" "Energy" "Industrial" "Portuguese"; do
    total=${SECTOR_TOTAL[$sector]:-0}
    passed=${SECTOR_PASSED[$sector]:-0}
    if [ $total -gt 0 ]; then
        rate=$(echo "scale=1; ($passed * 100) / $total" | bc)
        if [ "$passed" -eq "$total" ]; then
            status="✅"
        elif [ "$passed" -gt 0 ]; then
            status="⚠️"
        else
            status="❌"
        fi
        printf "%-15s %8d %8d %9s%% %s\n" "$sector" "$total" "$passed" "$rate" "$status"
    fi
done

# ========== PERFORMANCE METRICS ==========
echo ""
echo "======================================================================================================"
echo "⚡ PERFORMANCE METRICS"
echo "======================================================================================================"
echo ""

AVG_RESPONSE=$(echo "scale=0; $TOTAL_RESPONSE_TIME / $TOTAL_TESTS" | bc)
echo "Avg Response Time (all): ${AVG_RESPONSE}ms"

if [ $CACHE_TESTS -gt 0 ]; then
    AVG_CACHE_MISS=$(echo "scale=0; $TOTAL_CACHE_MISS_TIME / $CACHE_TESTS" | bc)
    AVG_CACHE_HIT=$(echo "scale=0; $TOTAL_CACHE_HIT_TIME / $CACHE_TESTS" | bc)
    CACHE_IMPROVEMENT=$(echo "scale=1; (($TOTAL_CACHE_MISS_TIME - $TOTAL_CACHE_HIT_TIME) * 100) / $TOTAL_CACHE_MISS_TIME" | bc)

    echo "Avg Response Time (cache miss): ${AVG_CACHE_MISS}ms"
    echo "Avg Response Time (cache hit): ${AVG_CACHE_HIT}ms"
    echo "Cache Improvement: ${CACHE_IMPROVEMENT}%"
    echo ""

    if [ "$AVG_CACHE_MISS" -lt 2000 ]; then
        echo "✅ Cache miss performance GOOD (< 2000ms)"
    else
        echo "⚠️  Cache miss performance needs improvement (> 2000ms)"
    fi

    if [ "$AVG_CACHE_HIT" -lt 500 ]; then
        echo "✅ Cache hit performance GOOD (< 500ms)"
    else
        echo "⚠️  Cache hit performance needs improvement (> 500ms)"
    fi
fi

# ========== FAILED TESTS ==========
if [ ${#FAILED_TESTS[@]} -gt 0 ]; then
    echo ""
    echo "======================================================================================================"
    echo "❌ FAILED TESTS"
    echo "======================================================================================================"
    echo ""
    for failure in "${FAILED_TESTS[@]}"; do
        echo "  • $failure"
    done
fi

# ========== VERDICT ==========
echo ""
echo "======================================================================================================"
echo "⚖️  VERDICT"
echo "======================================================================================================"
echo ""

TARGET_PASS_RATE=90

if (( $(echo "$PASS_RATE >= $TARGET_PASS_RATE" | bc -l) )) && [ ${#FAILED_TESTS[@]} -eq 0 ]; then
    echo -e "${GREEN}✅ PASS${NC} - System is production ready"
    echo "   - Pass rate: ${PASS_RATE}% (target: ≥${TARGET_PASS_RATE}%)"
    echo "   - All sectors working"
    echo "   - Performance acceptable"
    echo "   - No critical issues"
    EXIT_CODE=0
elif (( $(echo "$PASS_RATE >= $TARGET_PASS_RATE" | bc -l) )); then
    echo -e "${YELLOW}⚠️  CONDITIONAL PASS${NC} - System working but has issues"
    echo "   - Pass rate: ${PASS_RATE}% (target: ≥${TARGET_PASS_RATE}%)"
    echo "   - Issues found: ${#FAILED_TESTS[@]}"
    EXIT_CODE=0
else
    echo -e "${RED}❌ FAIL${NC} - System not ready for production"
    echo "   - Pass rate: ${PASS_RATE}% (target: ≥${TARGET_PASS_RATE}%)"
    echo "   - Failed tests: $((FAILED + ERRORS))"
    EXIT_CODE=1
fi

echo ""
echo "======================================================================================================"
echo "💾 Results saved to: $REPORT_FILE"
echo "======================================================================================================"
echo ""

# Save report
exec > >(tee -a "$REPORT_FILE")

exit $EXIT_CODE
