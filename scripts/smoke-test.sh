#!/bin/bash

# ALFALYZER SMOKE TEST
# Quick validation that all critical endpoints are working

echo "🔍 Running Alfalyzer Smoke Test"
echo "================================"

# Configuration
API_URL="${API_URL:-https://api.alfalyzer.com}"
API_KEY="${MARKET_DATA_API_KEY:-BEA48F7D-7DEB-4E70-8F5A-7C8E30F23ED9}"
VERBOSE="${VERBOSE:-false}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run a test
run_test() {
    local test_name="$1"
    local url="$2"
    local expected_status="$3"
    local headers="$4"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [ "$VERBOSE" = "true" ]; then
        echo -n "Testing $test_name... "
    fi
    
    if [ -n "$headers" ]; then
        response=$(curl -s -o /dev/null -w "%{http_code}" -H "$headers" "$url")
    else
        response=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    fi
    
    if [ "$response" = "$expected_status" ]; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
        if [ "$VERBOSE" = "true" ]; then
            echo -e "${GREEN}✓ PASSED${NC} (HTTP $response)"
        else
            echo -e "${GREEN}✓${NC} $test_name"
        fi
        return 0
    else
        FAILED_TESTS=$((FAILED_TESTS + 1))
        echo -e "${RED}✗ FAILED${NC} $test_name - Expected HTTP $expected_status, got HTTP $response"
        return 1
    fi
}

# Start tests
echo "🔗 Testing API: $API_URL"
echo ""

# 1. Health check (no auth required)
run_test "Health Check" "$API_URL/api/health" "200" ""

# 2. Health check for specific services
run_test "Redis Health" "$API_URL/api/health/redis" "200" ""
run_test "Supabase Health" "$API_URL/api/health/supabase" "200" ""

# 3. Public endpoint with API key
run_test "Batch Quotes (with API key)" "$API_URL/api/market-data/quotes/batch?symbols=AAPL,MSFT" "200" "X-API-Key: $API_KEY"

# 4. Public endpoint without API key (should fail)
run_test "Batch Quotes (without API key)" "$API_URL/api/market-data/quotes/batch?symbols=AAPL" "401" ""

# 5. Auth status endpoint
run_test "Auth Status" "$API_URL/api/auth/status" "200" ""

# 6. Market status
run_test "Market Status" "$API_URL/api/market-data/market-status" "401" ""

# 7. Search endpoint (requires auth, should fail without token)
run_test "Search (no auth)" "$API_URL/api/market-data/search?query=AAPL" "401" ""

# 8. Test CORS headers
if [ "$VERBOSE" = "true" ]; then
    echo ""
    echo "📋 CORS Headers Test:"
    curl -s -I -H "Origin: https://alfalyzer.com" "$API_URL/api/health" | grep -i "access-control"
fi

# 9. Test SSL certificate
if [ "$VERBOSE" = "true" ]; then
    echo ""
    echo "🔐 SSL Certificate Test:"
    echo | openssl s_client -connect api.alfalyzer.com:443 2>/dev/null | openssl x509 -noout -dates
fi

# 10. Response time test
echo ""
echo "⏱️ Response Time Test:"
response_time=$(curl -o /dev/null -s -w '%{time_total}' "$API_URL/api/health")
response_time_ms=$(echo "$response_time * 1000" | bc)
echo "Health endpoint response time: ${response_time_ms%.*}ms"

if (( $(echo "$response_time < 1" | bc -l) )); then
    echo -e "${GREEN}✓${NC} Response time is good (< 1s)"
else
    echo -e "${YELLOW}⚠${NC} Response time is slow (> 1s)"
fi

# Summary
echo ""
echo "================================"
echo "📊 TEST SUMMARY"
echo "================================"
echo "Total Tests: $TOTAL_TESTS"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ ALL SMOKE TESTS PASSED!${NC}"
    echo "The API is ready for production."
    exit 0
else
    echo ""
    echo -e "${RED}❌ SMOKE TESTS FAILED!${NC}"
    echo "Please fix the issues before deploying to production."
    exit 1
fi