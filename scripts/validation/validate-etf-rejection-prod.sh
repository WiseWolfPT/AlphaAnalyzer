#!/bin/bash
#
# FASE 3 - Production ETF Rejection Validation
#
# Tests ETF rejection against production API (https://128.140.45.28.sslip.io)
# Validates both ETF rejection (422) and legitimate stocks (200)
#

set -e

BASE_URL="${TARGET_URL:-https://128.140.45.28.sslip.io}"
RESULTS_FILE="etf-rejection-validation-$(date +%Y%m%d-%H%M%S).txt"

echo "=================================================="
echo "FASE 3 - Production ETF Rejection Validation"
echo "=================================================="
echo "Base URL: $BASE_URL"
echo "Timestamp: $(date)"
echo "Results: $RESULTS_FILE"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
TOTAL=0

# Test function
test_etf_rejection() {
  local ticker=$1
  local expected_status=$2
  local test_type=$3

  TOTAL=$((TOTAL + 1))

  echo -n "Testing $ticker ($test_type)... "

  # Make request and capture response
  response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/iv/$ticker/chart" 2>/dev/null)
  status_code=$(echo "$response" | tail -n 1)
  body=$(echo "$response" | sed '$d')

  if [ "$status_code" = "$expected_status" ]; then
    echo -e "${GREEN}✓ PASS${NC} (HTTP $status_code)"
    PASSED=$((PASSED + 1))
    echo "[$ticker] PASS - HTTP $status_code" >> "$RESULTS_FILE"
  else
    echo -e "${RED}✗ FAIL${NC} (HTTP $status_code, expected $expected_status)"
    FAILED=$((FAILED + 1))
    echo "[$ticker] FAIL - HTTP $status_code (expected $expected_status)" >> "$RESULTS_FILE"
    echo "Response body: $body" >> "$RESULTS_FILE"
  fi
}

# Start logging
{
  echo "=================================================="
  echo "FASE 3 - Production ETF Rejection Validation"
  echo "=================================================="
  echo "Base URL: $BASE_URL"
  echo "Timestamp: $(date)"
  echo ""
} > "$RESULTS_FILE"

echo "=== Testing Known ETFs (should return HTTP 400) ==="
echo ""

# Test 10 popular ETFs
test_etf_rejection "SPY" "400" "ETF"
test_etf_rejection "QQQ" "400" "ETF"
test_etf_rejection "ARKK" "400" "ETF"
test_etf_rejection "VTI" "400" "ETF"
test_etf_rejection "GLD" "400" "ETF"
test_etf_rejection "IWM" "400" "ETF"
test_etf_rejection "TLT" "400" "ETF"
test_etf_rejection "EFA" "400" "ETF"
test_etf_rejection "AGG" "400" "ETF"
test_etf_rejection "XLK" "400" "ETF"

echo ""
echo "=== Testing Legitimate Stocks (should return HTTP 200) ==="
echo ""

# Test 10 well-known stocks
test_etf_rejection "AAPL" "200" "STOCK"
test_etf_rejection "MSFT" "200" "STOCK"
test_etf_rejection "GOOGL" "200" "STOCK"
test_etf_rejection "NFLX" "200" "STOCK" # Critical: regression test
test_etf_rejection "TSLA" "200" "STOCK"
test_etf_rejection "AMZN" "200" "STOCK"
test_etf_rejection "META" "200" "STOCK"
test_etf_rejection "NVDA" "200" "STOCK"
test_etf_rejection "JPM" "200" "STOCK"
test_etf_rejection "O" "200" "STOCK" # REIT

echo ""
echo "=== Testing Edge Cases ==="
echo ""

# Test lowercase (should still reject ETFs)
test_etf_rejection "spy" "400" "ETF (lowercase)"

echo ""
echo "=================================================="
echo "Summary Report"
echo "=================================================="
echo "Total tests: $TOTAL"
echo "Passed: $PASSED"
echo "Failed: $FAILED"
echo "Pass rate: $(awk "BEGIN {printf \"%.1f\", ($PASSED/$TOTAL)*100}")%"
echo ""

# Write summary to file
{
  echo ""
  echo "=================================================="
  echo "Summary Report"
  echo "=================================================="
  echo "Total tests: $TOTAL"
  echo "Passed: $PASSED"
  echo "Failed: $FAILED"
  echo "Pass rate: $(awk "BEGIN {printf \"%.1f\", ($PASSED/$TOTAL)*100}")%"
} >> "$RESULTS_FILE"

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ All tests passed!${NC}"
  echo ""
  echo "Results saved to: $RESULTS_FILE"
  exit 0
else
  echo -e "${RED}✗ $FAILED test(s) failed${NC}"
  echo ""
  echo "Full results saved to: $RESULTS_FILE"
  exit 1
fi
