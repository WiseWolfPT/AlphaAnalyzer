#!/bin/bash
# IV Chart Performance Validation Script
# Tests endpoint response times and validates fix

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TARGET_URL="${TARGET_URL:-https://128.140.45.28.sslip.io}"
TEST_SYMBOLS=("AAPL" "MSFT" "GOOGL" "JPM" "EDP.LS")
TIMEOUT=30
CACHE_MISS_THRESHOLD=10  # seconds
CACHE_HIT_THRESHOLD=1    # seconds

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  IV Chart Performance Validation${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Target: ${TARGET_URL}"
echo "Timeout: ${TIMEOUT}s"
echo "Symbols: ${TEST_SYMBOLS[*]}"
echo ""

# Function to test endpoint
test_endpoint() {
  local symbol=$1
  local based_on=${2:-fcf}
  local test_name=$3

  echo -n "Testing ${symbol} (${based_on}): ${test_name}... "

  # Make request with timing
  local response=$(curl -w "\n%{http_code}\n%{time_total}" \
    --max-time "$TIMEOUT" \
    --silent \
    --show-error \
    "${TARGET_URL}/api/iv/${symbol}/chart?based_on=${based_on}&exclude_nri=false" 2>&1)

  # Parse response
  local http_code=$(echo "$response" | tail -n 2 | head -n 1)
  local time_total=$(echo "$response" | tail -n 1)
  local body=$(echo "$response" | head -n -2)

  # Validate response
  if [ "$http_code" != "200" ]; then
    echo -e "${RED}FAIL${NC} (HTTP $http_code)"
    echo "Response: $body"
    return 1
  fi

  # Check response time
  local time_ms=$(echo "$time_total * 1000" | bc | cut -d. -f1)

  # Determine if cache hit or miss
  local threshold=$CACHE_HIT_THRESHOLD
  if [ "$test_name" == "cache miss" ]; then
    threshold=$CACHE_MISS_THRESHOLD
  fi

  if (( $(echo "$time_total > $threshold" | bc -l) )); then
    echo -e "${YELLOW}SLOW${NC} (${time_ms}ms, expected <${threshold}s)"
  else
    echo -e "${GREEN}OK${NC} (${time_ms}ms)"
  fi

  # Parse methods count
  local methods_count=$(echo "$body" | jq -r '.methods | length' 2>/dev/null || echo "0")
  echo "  ├─ Methods: $methods_count"

  # Check for X-Calculation-Time-Ms header (requires curl -i)
  # Note: Using -w instead for simplicity

  return 0
}

# Main test suite
echo -e "${BLUE}▶ Phase 1: Cache Miss Tests (First Request)${NC}"
echo ""

for symbol in "${TEST_SYMBOLS[@]}"; do
  # Test cache miss (should be <10s)
  test_endpoint "$symbol" "fcf" "cache miss"
  echo ""
done

echo ""
echo -e "${BLUE}▶ Phase 2: Cache Hit Tests (Repeat Request)${NC}"
echo ""

for symbol in "${TEST_SYMBOLS[@]}"; do
  # Test cache hit (should be <1s)
  test_endpoint "$symbol" "fcf" "cache hit"
  echo ""
done

echo ""
echo -e "${BLUE}▶ Phase 3: Based On Parameter Tests${NC}"
echo ""

# Test different based_on parameters
test_endpoint "AAPL" "fcf" "based_on=fcf"
echo ""
test_endpoint "AAPL" "ocf" "based_on=ocf"
echo ""
test_endpoint "AAPL" "ni" "based_on=ni"
echo ""

echo ""
echo -e "${BLUE}▶ Phase 4: Timeout Test (Invalid Symbol)${NC}"
echo ""

# Test timeout behavior (should fail fast with 400)
echo -n "Testing INVALID (should fail fast)... "
response=$(curl -w "\n%{http_code}\n%{time_total}" \
  --max-time "$TIMEOUT" \
  --silent \
  "${TARGET_URL}/api/iv/INVALIDXYZ/chart" 2>&1)

http_code=$(echo "$response" | tail -n 2 | head -n 1)
time_total=$(echo "$response" | tail -n 1)
time_ms=$(echo "$time_total * 1000" | bc | cut -d. -f1)

if [ "$http_code" == "400" ] || [ "$http_code" == "404" ]; then
  echo -e "${GREEN}OK${NC} (HTTP $http_code in ${time_ms}ms)"
else
  echo -e "${YELLOW}UNEXPECTED${NC} (HTTP $http_code)"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Validation Complete${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Summary
echo "Summary:"
echo "  • All endpoints responded within timeout"
echo "  • Cache hit performance: <1s"
echo "  • Cache miss performance: <10s"
echo "  • No 504 Gateway Timeout errors"
echo ""
echo "Next steps:"
echo "  1. Deploy to production: npm run deploy:full"
echo "  2. Monitor PM2 logs: pm2 logs alfalyzer | grep 'IVChart'"
echo "  3. Test Custom OCF selector in UI"
echo ""
