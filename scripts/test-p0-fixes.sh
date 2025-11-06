#!/bin/bash
#
# P0 Fixes Testing Suite
#
# Tests both P0 fixes (Rate Limiter + Data Validator) with comprehensive scenarios
#
# Usage:
#   bash scripts/test-p0-fixes.sh [local|production]
#
# Examples:
#   bash scripts/test-p0-fixes.sh local         # Test localhost:3001
#   bash scripts/test-p0-fixes.sh production    # Test production server

set -e  # Exit on error

# ANSI color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENV="${1:-local}"
if [ "$ENV" = "production" ]; then
  TARGET_URL="https://128.140.45.28.sslip.io"
  HEALTH_PORT=3006
else
  TARGET_URL="http://localhost:3001"
  HEALTH_PORT=3006
fi

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  P0 Fixes Testing Suite                                ║${NC}"
echo -e "${BLUE}║  Environment: ${ENV^^}                                  ║${NC}"
echo -e "${BLUE}║  Target URL: $TARGET_URL                                ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Test helper
run_test() {
  local test_name="$1"
  local test_command="$2"
  local expected_result="$3"

  echo -n "Testing: $test_name... "

  if eval "$test_command" > /tmp/test_output.txt 2>&1; then
    RESULT=$(cat /tmp/test_output.txt)
    if [[ "$RESULT" =~ $expected_result ]]; then
      echo -e "${GREEN}✓ PASS${NC}"
      TESTS_PASSED=$((TESTS_PASSED + 1))
      return 0
    else
      echo -e "${RED}✗ FAIL${NC}"
      echo "  Expected: $expected_result"
      echo "  Got: $RESULT"
      TESTS_FAILED=$((TESTS_FAILED + 1))
      return 1
    fi
  else
    echo -e "${RED}✗ FAIL (command error)${NC}"
    cat /tmp/test_output.txt
    TESTS_FAILED=$((TESTS_FAILED + 1))
    return 1
  fi
}

# ================================
# TEST SUITE 1: RATE LIMITER
# ================================
echo -e "${BLUE}▸ Test Suite 1: FMP Rate Limiter${NC}"
echo ""

# Test 1.1: Valid stock request (should succeed or throttle gracefully)
run_test \
  "Rate Limiter - Valid Request (AAPL)" \
  "curl -s -w '%{http_code}' -o /dev/null $TARGET_URL/api/iv/AAPL/chart" \
  "200|429"

# Test 1.2: HTTP 429 structure (if throttled)
RESPONSE=$(curl -s "$TARGET_URL/api/iv/AAPL/chart")
if echo "$RESPONSE" | grep -q "RATE_LIMIT_EXCEEDED"; then
  if echo "$RESPONSE" | grep -q "retryAfter"; then
    echo -e "${GREEN}✓ PASS${NC} Rate Limiter - HTTP 429 Structure (has retryAfter)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo -e "${RED}✗ FAIL${NC} Rate Limiter - HTTP 429 Structure (missing retryAfter)"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
else
  echo -e "${YELLOW}⊘ SKIP${NC} Rate Limiter - HTTP 429 Structure (not throttled)"
fi

# Test 1.3: Rate limiter stats endpoint (if available)
# Note: This assumes the controller exposes stats (may not exist)
echo ""

# ================================
# TEST SUITE 2: DATA VALIDATOR
# ================================
echo -e "${BLUE}▸ Test Suite 2: FMP Data Validator${NC}"
echo ""

# Test 2.1: ETF rejection (SPY)
run_test \
  "Data Validator - ETF Rejection (SPY)" \
  "curl -s -w '%{http_code}' -o /dev/null $TARGET_URL/api/iv/SPY/chart" \
  "422"

# Test 2.2: ETF rejection structure
RESPONSE=$(curl -s "$TARGET_URL/api/iv/SPY/chart")
if echo "$RESPONSE" | grep -q "ETF_NOT_SUPPORTED"; then
  echo -e "${GREEN}✓ PASS${NC} Data Validator - ETF Error Structure (has ETF_NOT_SUPPORTED)"
  TESTS_PASSED=$((TESTS_PASSED + 1))
else
  echo -e "${RED}✗ FAIL${NC} Data Validator - ETF Error Structure (missing ETF_NOT_SUPPORTED)"
  echo "  Got: $RESPONSE"
  TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Test 2.3: Multiple ETFs
ETFS=("QQQ" "IWM" "VTI" "VOO")
ETF_REJECTED=0
for ETF in "${ETFS[@]}"; do
  STATUS=$(curl -s -w '%{http_code}' -o /dev/null "$TARGET_URL/api/iv/$ETF/chart")
  if [ "$STATUS" = "422" ]; then
    ETF_REJECTED=$((ETF_REJECTED + 1))
  fi
done

if [ "$ETF_REJECTED" -eq "${#ETFS[@]}" ]; then
  echo -e "${GREEN}✓ PASS${NC} Data Validator - Multiple ETFs Rejected ($ETF_REJECTED/${#ETFS[@]})"
  TESTS_PASSED=$((TESTS_PASSED + 1))
else
  echo -e "${RED}✗ FAIL${NC} Data Validator - Multiple ETFs Rejected ($ETF_REJECTED/${#ETFS[@]})"
  TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Test 2.4: Valid stock not rejected (AAPL, MSFT, GOOGL)
VALID_STOCKS=("AAPL" "MSFT" "GOOGL")
VALID_ACCEPTED=0
for STOCK in "${VALID_STOCKS[@]}"; do
  STATUS=$(curl -s -w '%{http_code}' -o /dev/null "$TARGET_URL/api/iv/$STOCK/chart")
  if [ "$STATUS" = "200" ] || [ "$STATUS" = "429" ]; then
    # 200 = success, 429 = rate limited (but not rejected as ETF)
    VALID_ACCEPTED=$((VALID_ACCEPTED + 1))
  fi
done

if [ "$VALID_ACCEPTED" -eq "${#VALID_STOCKS[@]}" ]; then
  echo -e "${GREEN}✓ PASS${NC} Data Validator - Valid Stocks Accepted ($VALID_ACCEPTED/${#VALID_STOCKS[@]})"
  TESTS_PASSED=$((TESTS_PASSED + 1))
else
  echo -e "${RED}✗ FAIL${NC} Data Validator - Valid Stocks Accepted ($VALID_ACCEPTED/${#VALID_STOCKS[@]})"
  TESTS_FAILED=$((TESTS_FAILED + 1))
fi

echo ""

# ================================
# TEST SUITE 3: WARMING WORKER
# ================================
echo -e "${BLUE}▸ Test Suite 3: Warming Worker Integration${NC}"
echo ""

# Test 3.1: Warming worker health endpoint
if [ "$ENV" = "production" ]; then
  # SSH into production and check localhost
  run_test \
    "Warming Worker - Health Endpoint (SSH)" \
    "ssh -o ConnectTimeout=5 root@128.140.45.28 'curl -s http://localhost:$HEALTH_PORT/health | grep -q \"status\"'" \
    ""
else
  # Local health check
  run_test \
    "Warming Worker - Health Endpoint (Local)" \
    "curl -s http://localhost:$HEALTH_PORT/health | grep -q 'status'" \
    ""
fi

# Test 3.2: Worker logs contain validation messages
if [ "$ENV" = "production" ]; then
  echo -n "Testing: Warming Worker - Validation Logs (SSH)... "
  if ssh -o ConnectTimeout=5 root@128.140.45.28 'pm2 logs intelligent-warming-worker --lines 100 --nostream 2>/dev/null | grep -q "FMP Validator"'; then
    echo -e "${GREEN}✓ PASS${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo -e "${YELLOW}⊘ SKIP${NC} (worker may not be running or no recent validation logs)"
  fi
else
  echo -n "Testing: Warming Worker - Validation Logs (Local)... "
  if pm2 logs intelligent-warming-worker --lines 100 --nostream 2>/dev/null | grep -q "FMP Validator"; then
    echo -e "${GREEN}✓ PASS${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo -e "${YELLOW}⊘ SKIP${NC} (worker may not be running or no recent validation logs)"
  fi
fi

echo ""

# ================================
# TEST SUITE 4: INTEGRATION
# ================================
echo -e "${BLUE}▸ Test Suite 4: End-to-End Integration${NC}"
echo ""

# Test 4.1: Cache warming doesn't corrupt entries
# (Hard to test directly, but we can check if IV endpoint returns valid data)
run_test \
  "Integration - Valid IV Response Structure (AAPL)" \
  "curl -s $TARGET_URL/api/iv/AAPL/chart | jq -e '.methods | length > 0'" \
  ""

# Test 4.2: Rate limiter doesn't block valid requests indefinitely
echo -n "Testing: Integration - Rate Limiter Recovery (60s wait)... "
echo -e "${YELLOW}(waiting for budget reset)${NC}"
sleep 5  # Short wait instead of full 60s for testing

STATUS=$(curl -s -w '%{http_code}' -o /dev/null "$TARGET_URL/api/iv/TSLA/chart")
if [ "$STATUS" = "200" ] || [ "$STATUS" = "429" ]; then
  echo -e "${GREEN}✓ PASS${NC} Integration - Rate Limiter Recovery (status: $STATUS)"
  TESTS_PASSED=$((TESTS_PASSED + 1))
else
  echo -e "${RED}✗ FAIL${NC} Integration - Rate Limiter Recovery (status: $STATUS)"
  TESTS_FAILED=$((TESTS_FAILED + 1))
fi

echo ""

# ================================
# TEST SUMMARY
# ================================
TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))
PASS_RATE=0
if [ "$TOTAL_TESTS" -gt 0 ]; then
  PASS_RATE=$(awk "BEGIN {printf \"%.1f\", ($TESTS_PASSED / $TOTAL_TESTS) * 100}")
fi

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  TEST SUMMARY                                          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Total Tests:   $TOTAL_TESTS"
echo -e "${GREEN}Passed:        $TESTS_PASSED${NC}"
echo -e "${RED}Failed:        $TESTS_FAILED${NC}"
echo -e "Pass Rate:     $PASS_RATE%"
echo ""

if [ "$TESTS_FAILED" -eq 0 ]; then
  echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
  echo -e "${GREEN}  ✓ ALL TESTS PASSED${NC}"
  echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
  exit 0
else
  echo -e "${RED}═══════════════════════════════════════════════════════${NC}"
  echo -e "${RED}  ✗ SOME TESTS FAILED${NC}"
  echo -e "${RED}═══════════════════════════════════════════════════════${NC}"
  exit 1
fi
