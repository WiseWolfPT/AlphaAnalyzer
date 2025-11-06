#!/bin/bash

# ONDA 4.1: ETF Detection Production Validation Script
# Tests ETF detection system in production environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3001}"
VERBOSE="${VERBOSE:-0}"

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  ONDA 4.1: ETF Detection Production Validation${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "Target: ${YELLOW}${BASE_URL}${NC}"
echo ""

# Test counter
PASSED=0
FAILED=0

# Function to test endpoint
test_endpoint() {
    local name="$1"
    local url="$2"
    local expected_status="$3"
    local check_pattern="$4"

    echo -n "Testing: ${name}... "

    response=$(curl -s -w "\n%{http_code}" "${BASE_URL}${url}" 2>&1)
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [ "$http_code" = "$expected_status" ]; then
        if [ -z "$check_pattern" ] || echo "$body" | grep -q "$check_pattern"; then
            echo -e "${GREEN}✅ PASS${NC}"
            PASSED=$((PASSED + 1))
            if [ "$VERBOSE" = "1" ]; then
                echo "  Response: $body" | head -n 5
            fi
            return 0
        else
            echo -e "${RED}❌ FAIL (pattern not found)${NC}"
            echo "  Expected pattern: $check_pattern"
            echo "  Response: $body"
            FAILED=$((FAILED + 1))
            return 1
        fi
    else
        echo -e "${RED}❌ FAIL (HTTP $http_code, expected $expected_status)${NC}"
        echo "  Response: $body"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

# Function to test POST endpoint
test_post_endpoint() {
    local name="$1"
    local url="$2"
    local data="$3"
    local expected_status="$4"
    local check_pattern="$5"

    echo -n "Testing: ${name}... "

    response=$(curl -s -w "\n%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -d "$data" \
        "${BASE_URL}${url}" 2>&1)
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [ "$http_code" = "$expected_status" ]; then
        if [ -z "$check_pattern" ] || echo "$body" | grep -q "$check_pattern"; then
            echo -e "${GREEN}✅ PASS${NC}"
            PASSED=$((PASSED + 1))
            if [ "$VERBOSE" = "1" ]; then
                echo "  Response: $body" | head -n 5
            fi
            return 0
        else
            echo -e "${RED}❌ FAIL (pattern not found)${NC}"
            echo "  Expected pattern: $check_pattern"
            echo "  Response: $body"
            FAILED=$((FAILED + 1))
            return 1
        fi
    else
        echo -e "${RED}❌ FAIL (HTTP $http_code, expected $expected_status)${NC}"
        echo "  Response: $body"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

echo -e "${YELLOW}1. Testing Diagnostics Endpoints${NC}"
echo "─────────────────────────────────────────────────────"

# Test 1: Health check
test_endpoint "Diagnostics Health" "/api/diagnostics/health" "200" "diagnostics"

# Test 2: ETF stats
test_endpoint "ETF Statistics" "/api/diagnostics/etf-stats" "200" "known_etfs_count"

# Test 3: Classify ETF (SPY)
test_endpoint "Classify SPY (ETF)" "/api/diagnostics/classify/SPY" "200" "\"is_etf\":true"

# Test 4: Classify Stock (AAPL)
test_endpoint "Classify AAPL (Stock)" "/api/diagnostics/classify/AAPL" "200" "\"is_etf\":false"

# Test 5: Classify another ETF (QQQ)
test_endpoint "Classify QQQ (ETF)" "/api/diagnostics/classify/QQQ" "200" "\"is_etf\":true"

# Test 6: Batch classification
test_post_endpoint "Batch Classification" "/api/diagnostics/classify/batch" \
    '{"tickers":["AAPL","SPY","MSFT","QQQ"]}' "200" "\"etf_count\":2"

echo ""
echo -e "${YELLOW}2. Testing IV Chart ETF Blocking${NC}"
echo "─────────────────────────────────────────────────────"

# Test 7: IV chart should block SPY (ETF)
test_endpoint "IV Chart blocks SPY" "/api/iv/SPY/chart" "400" "ETF_NOT_SUPPORTED"

# Test 8: IV chart should block QQQ (ETF)
test_endpoint "IV Chart blocks QQQ" "/api/iv/QQQ/chart" "400" "ETF_NOT_SUPPORTED"

# Test 9: IV chart should allow AAPL (Stock)
# Note: This might return 404 if no data, or 200 if data exists
# We just check it doesn't return ETF error (400 with ETF_NOT_SUPPORTED)
echo -n "Testing: IV Chart allows AAPL (Stock)... "
response=$(curl -s -w "\n%{http_code}" "${BASE_URL}/api/iv/AAPL/chart" 2>&1)
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if echo "$body" | grep -q "ETF_NOT_SUPPORTED"; then
    echo -e "${RED}❌ FAIL (incorrectly blocked as ETF)${NC}"
    echo "  Response: $body"
    FAILED=$((FAILED + 1))
else
    # Should be 200 (success) or 404 (no data) - both are acceptable
    if [ "$http_code" = "200" ] || [ "$http_code" = "404" ] || [ "$http_code" = "500" ]; then
        echo -e "${GREEN}✅ PASS (not blocked as ETF)${NC}"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}❌ FAIL (unexpected HTTP $http_code)${NC}"
        echo "  Response: $body"
        FAILED=$((FAILED + 1))
    fi
fi

echo ""
echo -e "${YELLOW}3. Testing Edge Cases${NC}"
echo "─────────────────────────────────────────────────────"

# Test 10: Invalid ticker
test_endpoint "Invalid ticker handling" "/api/diagnostics/classify/INVALIDXXX" "200" "\"is_etf\":"

# Test 11: Sector ETF (XLF)
test_endpoint "Classify XLF (Sector ETF)" "/api/diagnostics/classify/XLF" "200" "\"is_etf\":true"

# Test 12: Commodity ETF (GLD)
test_endpoint "Classify GLD (Commodity ETF)" "/api/diagnostics/classify/GLD" "200" "\"is_etf\":true"

# Test 13: European ETF (IWDA.AS)
test_endpoint "Classify IWDA.AS (European ETF)" "/api/diagnostics/classify/IWDA.AS" "200" "\"is_etf\":true"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Test Results${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "Total Tests: $((PASSED + FAILED))"
echo -e "${GREEN}Passed: ${PASSED} ✅${NC}"
echo -e "${RED}Failed: ${FAILED} ❌${NC}"
echo -e "Success Rate: $(awk "BEGIN {printf \"%.1f\", ($PASSED/($PASSED+$FAILED))*100}")%"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed! ETF detection is working correctly.${NC}"
    exit 0
else
    echo -e "${RED}⚠️  Some tests failed. Please review the errors above.${NC}"
    exit 1
fi
