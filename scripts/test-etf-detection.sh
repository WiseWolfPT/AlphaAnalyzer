#!/bin/bash

# Test ETF Detection in IV Chart Controller
# Tests that ETFs are rejected before any API calls

echo "======================================"
echo "ETF Detection Test Suite"
echo "======================================"
echo ""

# Configuration
BASE_URL="${1:-http://localhost:3001}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASS=0
FAIL=0

# Function to test ETF rejection
test_etf() {
  local ticker=$1
  echo -n "Testing ETF $ticker... "

  response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/iv/$ticker/chart")
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)

  # Check HTTP 400 status
  if [ "$http_code" != "400" ]; then
    echo -e "${RED}FAIL${NC} (Expected 400, got $http_code)"
    FAIL=$((FAIL + 1))
    return
  fi

  # Check error code
  error_code=$(echo "$body" | grep -o '"error":"[^"]*"' | cut -d'"' -f4)
  if [ "$error_code" != "IV_NOT_APPLICABLE" ]; then
    echo -e "${RED}FAIL${NC} (Expected IV_NOT_APPLICABLE, got $error_code)"
    FAIL=$((FAIL + 1))
    return
  fi

  # Check message contains ETF ticker
  if ! echo "$body" | grep -q "$ticker"; then
    echo -e "${RED}FAIL${NC} (Message missing ticker)"
    FAIL=$((FAIL + 1))
    return
  fi

  # Check alternative methods exist
  if ! echo "$body" | grep -q "alternative_methods"; then
    echo -e "${RED}FAIL${NC} (Missing alternative_methods)"
    FAIL=$((FAIL + 1))
    return
  fi

  echo -e "${GREEN}PASS${NC}"
  PASS=$((PASS + 1))
}

# Function to test stock (should NOT be rejected)
test_stock() {
  local ticker=$1
  echo -n "Testing Stock $ticker... "

  response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/iv/$ticker/chart")
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)

  # Stock should NOT return IV_NOT_APPLICABLE error
  error_code=$(echo "$body" | grep -o '"error":"[^"]*"' | cut -d'"' -f4)
  if [ "$error_code" == "IV_NOT_APPLICABLE" ]; then
    echo -e "${RED}FAIL${NC} (Stock incorrectly rejected as ETF)"
    FAIL=$((FAIL + 1))
    return
  fi

  # Either 200 (success) or 404/500 (data issue, but not ETF rejection)
  if [ "$http_code" == "400" ] && echo "$body" | grep -q "IV_NOT_APPLICABLE"; then
    echo -e "${RED}FAIL${NC} (Stock treated as ETF)"
    FAIL=$((FAIL + 1))
    return
  fi

  echo -e "${GREEN}PASS${NC}"
  PASS=$((PASS + 1))
}

echo "Testing Major Index ETFs (should be rejected):"
echo "--------------------------------------"
test_etf "SPY"
test_etf "QQQ"
test_etf "IWM"
test_etf "VOO"

echo ""
echo "Testing Sector ETFs (should be rejected):"
echo "--------------------------------------"
test_etf "XLE"
test_etf "XLF"
test_etf "XLK"

echo ""
echo "Testing Commodity ETFs (should be rejected):"
echo "--------------------------------------"
test_etf "GLD"
test_etf "SLV"

echo ""
echo "Testing Leveraged ETFs (should be rejected):"
echo "--------------------------------------"
test_etf "TQQQ"
test_etf "SQQQ"

echo ""
echo "Testing Valid Stocks (should NOT be rejected):"
echo "--------------------------------------"
test_stock "AAPL"
test_stock "MSFT"
test_stock "TSLA"

echo ""
echo "======================================"
echo "Test Results"
echo "======================================"
echo -e "Passed: ${GREEN}$PASS${NC}"
echo -e "Failed: ${RED}$FAIL${NC}"
echo ""

# Exit with failure if any tests failed
if [ $FAIL -gt 0 ]; then
  echo -e "${RED}Some tests failed!${NC}"
  exit 1
else
  echo -e "${GREEN}All tests passed!${NC}"
  exit 0
fi
