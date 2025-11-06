#!/bin/bash
# FASE 2 - Backend ETF Validation Test Script
#
# Tests that all IV endpoints reject ETFs with HTTP 422
# and allow valid stocks with HTTP 200

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${TARGET_URL:-https://128.140.45.28.sslip.io}"
VERBOSE="${VERBOSE:-false}"

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

echo "=========================================="
echo "FASE 2 - ETF Rejection Validation"
echo "=========================================="
echo ""
echo "Base URL: $BASE_URL"
echo "Verbose: $VERBOSE"
echo ""

# Known ETFs to test (5 popular ones)
ETFS=("SPY" "QQQ" "ARKK" "VTI" "GLD")

# Valid stocks to test (should work)
STOCKS=("AAPL" "MSFT" "NFLX")

# Endpoints to test (without base URL)
IV_ENDPOINTS=(
  "/api/iv/%s/chart"
  "/api/iv/%s/main"
  "/api/iv/%s"
  "/api/cache/intrinsic-values/%s"
  "/api/cache/iv/%s"
)

# Function to test endpoint
test_endpoint() {
  local ticker=$1
  local endpoint_template=$2
  local expected_status=$3
  local description=$4

  TOTAL_TESTS=$((TOTAL_TESTS + 1))

  # Format endpoint with ticker
  local endpoint=$(printf "$endpoint_template" "$ticker")
  local url="$BASE_URL$endpoint"

  # Make request and capture status code
  local status=$(curl -s -o /dev/null -w "%{http_code}" "$url")

  # Check if status matches expected
  if [ "$status" -eq "$expected_status" ]; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
    echo -e "${GREEN}✓${NC} $description"
    [ "$VERBOSE" = "true" ] && echo "  URL: $url"
    [ "$VERBOSE" = "true" ] && echo "  Status: $status (expected: $expected_status)"
  else
    FAILED_TESTS=$((FAILED_TESTS + 1))
    echo -e "${RED}✗${NC} $description"
    echo "  URL: $url"
    echo "  Status: $status (expected: $expected_status)"

    # Fetch response body for debugging
    if [ "$VERBOSE" = "true" ]; then
      local response=$(curl -s "$url")
      echo "  Response: $response"
    fi
  fi
}

echo "Testing ETF rejection (expecting HTTP 422)..."
echo ""

# Test all endpoints with ETFs (should return 422)
for etf in "${ETFS[@]}"; do
  echo "Testing $etf (ETF):"
  for endpoint in "${IV_ENDPOINTS[@]}"; do
    test_endpoint "$etf" "$endpoint" 422 "  $endpoint → HTTP 422"
  done
  echo ""
done

echo "=========================================="
echo "Testing valid stocks (expecting HTTP 200)..."
echo ""

# Test all endpoints with valid stocks (should return 200)
for stock in "${STOCKS[@]}"; do
  echo "Testing $stock (Stock):"
  for endpoint in "${IV_ENDPOINTS[@]}"; do
    test_endpoint "$stock" "$endpoint" 200 "  $endpoint → HTTP 200"
  done
  echo ""
done

echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo ""
echo "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed:${NC} $PASSED_TESTS"
echo -e "${RED}Failed:${NC} $FAILED_TESTS"
echo ""

# Calculate pass rate
PASS_RATE=$(awk "BEGIN {printf \"%.1f\", ($PASSED_TESTS/$TOTAL_TESTS)*100}")
echo "Pass Rate: $PASS_RATE%"
echo ""

# Test detailed ETF error response
echo "=========================================="
echo "Testing ETF Error Response Detail"
echo "=========================================="
echo ""

ETF_RESPONSE=$(curl -s "$BASE_URL/api/iv/SPY/chart")
echo "ETF Response (SPY):"
echo "$ETF_RESPONSE" | jq '.' 2>/dev/null || echo "$ETF_RESPONSE"
echo ""

# Check for required fields in error response
if echo "$ETF_RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC} Error field present"
else
  echo -e "${RED}✗${NC} Error field missing"
fi

if echo "$ETF_RESPONSE" | jq -e '.message' > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC} Message field present"
else
  echo -e "${RED}✗${NC} Message field missing"
fi

if echo "$ETF_RESPONSE" | jq -e '.reason' > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC} Reason field present"
else
  echo -e "${RED}✗${NC} Reason field missing"
fi

if echo "$ETF_RESPONSE" | jq -e '.suggestion' > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC} Suggestion field present"
else
  echo -e "${RED}✗${NC} Suggestion field missing"
fi

if echo "$ETF_RESPONSE" | jq -e '.alternative_methods' > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC} Alternative methods field present"
else
  echo -e "${RED}✗${NC} Alternative methods field missing"
fi

echo ""
echo "=========================================="
echo "FASE 2 Validation Complete"
echo "=========================================="
echo ""

# Exit with failure if any tests failed
if [ $FAILED_TESTS -gt 0 ]; then
  echo -e "${RED}FAILED${NC}: $FAILED_TESTS test(s) failed"
  exit 1
else
  echo -e "${GREEN}SUCCESS${NC}: All tests passed!"
  exit 0
fi
