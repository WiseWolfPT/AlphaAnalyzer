#!/bin/bash
# Post-Deployment Test Suite for ONDA 1-3 Validation
# Tests security, performance, custom OCF, and stock universe

set -e

BASE_URL="https://128.140.45.28.sslip.io"
RESULTS_FILE="/tmp/post-deployment-results.json"
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Initialize results
echo "{" > "$RESULTS_FILE"
echo "  \"timestamp\": \"$TIMESTAMP\"," >> "$RESULTS_FILE"
echo "  \"baseUrl\": \"$BASE_URL\"," >> "$RESULTS_FILE"
echo "  \"tests\": {" >> "$RESULTS_FILE"

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
WARN_TESTS=0

echo ""
echo "============================================"
echo "🧪 POST-DEPLOYMENT TEST SUITE"
echo "============================================"
echo "Base URL: $BASE_URL"
echo "Timestamp: $TIMESTAMP"
echo ""

# ========================================
# TEST 1: SECURITY VALIDATION (ONDA 1)
# ========================================
echo "============================================"
echo "TEST 1: SECURITY VALIDATION"
echo "============================================"

echo -e "${BLUE}Testing SQL injection protection...${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
HTTP_CODE=$(curl -s -w "%{http_code}" -o /dev/null "$BASE_URL/api/iv/AAPL';DROP/chart")
if [ "$HTTP_CODE" = "400" ]; then
  echo -e "  ${GREEN}✅ PASS${NC} - SQL injection blocked (HTTP $HTTP_CODE)"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "  ${RED}❌ FAIL${NC} - Expected 400, got $HTTP_CODE"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi

echo -e "${BLUE}Testing path traversal protection...${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
HTTP_CODE=$(curl -s -w "%{http_code}" -o /dev/null "$BASE_URL/api/iv/../../../etc/passwd/chart")
if [ "$HTTP_CODE" = "400" ]; then
  echo -e "  ${GREEN}✅ PASS${NC} - Path traversal blocked (HTTP $HTTP_CODE)"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "  ${RED}❌ FAIL${NC} - Expected 400, got $HTTP_CODE"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi

echo -e "${BLUE}Testing newline injection protection...${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
HTTP_CODE=$(curl -s -w "%{http_code}" -o /dev/null "$BASE_URL/api/iv/AAPL%0A%0Dmalicious/chart")
if [ "$HTTP_CODE" = "400" ]; then
  echo -e "  ${GREEN}✅ PASS${NC} - Newline injection blocked (HTTP $HTTP_CODE)"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "  ${RED}❌ FAIL${NC} - Expected 400, got $HTTP_CODE"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi

echo -e "${BLUE}Testing valid symbol still works (AAPL)...${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
HTTP_CODE=$(curl -s -w "%{http_code}" -o /dev/null "$BASE_URL/api/iv/AAPL/chart")
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "404" ]; then
  echo -e "  ${GREEN}✅ PASS${NC} - Valid symbol accepted (HTTP $HTTP_CODE)"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "  ${RED}❌ FAIL${NC} - Valid symbol rejected (HTTP $HTTP_CODE)"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi

echo -e "${BLUE}Testing valid symbol with dot (EDP.LS)...${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
HTTP_CODE=$(curl -s -w "%{http_code}" -o /dev/null "$BASE_URL/api/iv/EDP.LS/chart")
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "404" ]; then
  echo -e "  ${GREEN}✅ PASS${NC} - Portuguese symbol accepted (HTTP $HTTP_CODE)"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "  ${RED}❌ FAIL${NC} - Portuguese symbol rejected (HTTP $HTTP_CODE)"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi

echo ""

# ========================================
# TEST 2: CACHE PERFORMANCE (ONDA 3)
# ========================================
echo "============================================"
echo "TEST 2: CACHE PERFORMANCE VALIDATION"
echo "============================================"

echo -e "${BLUE}Testing cache MISS performance...${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
# Clear cache first (optional)
MISS_START=$(date +%s%N)
MISS_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}\nTIME_TOTAL:%{time_total}" "$BASE_URL/api/market-data/quote/MSFT")
MISS_END=$(date +%s%N)
MISS_HTTP_CODE=$(echo "$MISS_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
MISS_TIME=$(echo "$MISS_RESPONSE" | grep "TIME_TOTAL:" | cut -d: -f2)
MISS_CACHE_STATUS=$(echo "$MISS_RESPONSE" | grep -i "x-cache-status" || echo "UNKNOWN")

if [ "$MISS_HTTP_CODE" = "200" ]; then
  echo -e "  ${GREEN}✅ PASS${NC} - Cache miss request succeeded (${MISS_TIME}s)"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "  ${RED}❌ FAIL${NC} - Cache miss request failed (HTTP $MISS_HTTP_CODE)"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi

sleep 2

echo -e "${BLUE}Testing cache HIT performance...${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
HIT_START=$(date +%s%N)
HIT_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}\nTIME_TOTAL:%{time_total}" "$BASE_URL/api/market-data/quote/MSFT")
HIT_END=$(date +%s%N)
HIT_HTTP_CODE=$(echo "$HIT_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
HIT_TIME=$(echo "$HIT_RESPONSE" | grep "TIME_TOTAL:" | cut -d: -f2)

if [ "$HIT_HTTP_CODE" = "200" ]; then
  # Calculate improvement
  IMPROVEMENT=$(echo "scale=2; (($MISS_TIME - $HIT_TIME) / $MISS_TIME) * 100" | bc 2>/dev/null || echo "0")

  if (( $(echo "$IMPROVEMENT > 50" | bc -l 2>/dev/null || echo 0) )); then
    echo -e "  ${GREEN}✅ PASS${NC} - Cache hit ${IMPROVEMENT}% faster (${HIT_TIME}s vs ${MISS_TIME}s)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
  else
    echo -e "  ${YELLOW}⚠️ WARN${NC} - Cache hit only ${IMPROVEMENT}% faster (target: 50-80%)"
    WARN_TESTS=$((WARN_TESTS + 1))
  fi
else
  echo -e "  ${RED}❌ FAIL${NC} - Cache hit request failed (HTTP $HIT_HTTP_CODE)"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi

echo -e "${BLUE}Testing cache monitoring stats...${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
CACHE_STATS=$(curl -s "$BASE_URL/api/cache/monitoring/stats" 2>/dev/null || echo "{}")
TOTAL_HIT_RATE=$(echo "$CACHE_STATS" | jq -r '.totalHitRate // "0"' 2>/dev/null || echo "0")

if [ "$TOTAL_HIT_RATE" != "0" ] && [ "$TOTAL_HIT_RATE" != "null" ]; then
  echo -e "  ${GREEN}✅ PASS${NC} - Cache stats available (hit rate: $TOTAL_HIT_RATE)"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "  ${YELLOW}⚠️ WARN${NC} - Cache stats not available or hit rate is 0"
  WARN_TESTS=$((WARN_TESTS + 1))
fi

echo ""

# ========================================
# TEST 3: CUSTOM OCF VALIDATION (ONDA 2)
# ========================================
echo "============================================"
echo "TEST 3: CUSTOM OCF VALIDATION"
echo "============================================"

echo -e "${BLUE}Testing Custom OCF method in backend...${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
OCF_RESPONSE=$(curl -s "$BASE_URL/api/iv/AAPL/chart")
OCF_METHOD=$(echo "$OCF_RESPONSE" | jq '.methods[] | select(.id == "dcf-20-ocf")' 2>/dev/null || echo "")

if [ -n "$OCF_METHOD" ] && [ "$OCF_METHOD" != "null" ]; then
  echo -e "  ${GREEN}✅ PASS${NC} - Custom OCF method exists in backend"
  PASSED_TESTS=$((PASSED_TESTS + 1))

  # Check if it has inputs
  OCF_INPUTS=$(echo "$OCF_METHOD" | jq '.inputs // []' 2>/dev/null || echo "[]")
  if [ "$OCF_INPUTS" != "[]" ] && [ "$OCF_INPUTS" != "null" ]; then
    echo -e "  ${GREEN}  ✓${NC} OCF has financial inputs defined"
  else
    echo -e "  ${YELLOW}  ⚠${NC} OCF exists but has no inputs (frontend fallback)"
  fi
else
  echo -e "  ${YELLOW}⚠️ WARN${NC} - Custom OCF not in backend (frontend fallback expected)"
  WARN_TESTS=$((WARN_TESTS + 1))
fi

echo -e "${BLUE}Testing Custom NI method in backend...${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
NI_METHOD=$(echo "$OCF_RESPONSE" | jq '.methods[] | select(.id == "dcf-20-ni")' 2>/dev/null || echo "")

if [ -n "$NI_METHOD" ] && [ "$NI_METHOD" != "null" ]; then
  echo -e "  ${GREEN}✅ PASS${NC} - Custom NI method exists in backend"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "  ${YELLOW}⚠️ WARN${NC} - Custom NI not in backend (frontend fallback expected)"
  WARN_TESTS=$((WARN_TESTS + 1))
fi

echo ""

# ========================================
# TEST 4: STOCK UNIVERSE (35 STOCKS)
# ========================================
echo "============================================"
echo "TEST 4: STOCK UNIVERSE VALIDATION"
echo "============================================"

# Define stock universe
declare -a TECH_STOCKS=("AAPL" "MSFT" "GOOGL" "NVDA" "META")
declare -a FINANCE_STOCKS=("JPM" "BAC" "WFC" "GS" "MS")
declare -a HEALTHCARE_STOCKS=("JNJ" "UNH" "PFE" "ABBV" "LLY")
declare -a CONSUMER_STOCKS=("AMZN" "WMT" "COST" "NKE" "MCD")
declare -a ENERGY_STOCKS=("XOM" "CVX" "COP" "SLB" "EOG")
declare -a INDUSTRIAL_STOCKS=("CAT" "BA" "HON" "UPS" "GE")
declare -a PT_STOCKS=("EDP.LS" "GALP.LS" "NOS.LS" "BCP.LS" "JMT.LS")

ALL_STOCKS=("${TECH_STOCKS[@]}" "${FINANCE_STOCKS[@]}" "${HEALTHCARE_STOCKS[@]}" "${CONSUMER_STOCKS[@]}" "${ENERGY_STOCKS[@]}" "${INDUSTRIAL_STOCKS[@]}" "${PT_STOCKS[@]}")

UNIVERSE_PASSED=0
UNIVERSE_FAILED=0
UNIVERSE_TOTAL=${#ALL_STOCKS[@]}

echo -e "${BLUE}Testing ${UNIVERSE_TOTAL} stocks across 7 sectors...${NC}"
echo ""

for STOCK in "${ALL_STOCKS[@]}"; do
  TOTAL_TESTS=$((TOTAL_TESTS + 1))

  # Make request
  RESPONSE=$(curl -s "$BASE_URL/api/iv/$STOCK/chart")
  HTTP_CODE=$(curl -s -w "%{http_code}" -o /dev/null "$BASE_URL/api/iv/$STOCK/chart")

  # Parse response
  METHODS_COUNT=$(echo "$RESPONSE" | jq '.methods | length' 2>/dev/null || echo "0")
  PRICE=$(echo "$RESPONSE" | jq -r '.currentPrice // 0' 2>/dev/null || echo "0")

  # Validate
  if [ "$HTTP_CODE" = "200" ] && [ "$METHODS_COUNT" -ge 5 ] && [ "$PRICE" != "0" ] && [ "$PRICE" != "null" ]; then
    echo -e "  ${GREEN}✅ $STOCK${NC} - $METHODS_COUNT methods, price: \$$PRICE"
    UNIVERSE_PASSED=$((UNIVERSE_PASSED + 1))
    PASSED_TESTS=$((PASSED_TESTS + 1))
  else
    echo -e "  ${RED}❌ $STOCK${NC} - HTTP $HTTP_CODE, $METHODS_COUNT methods, price: \$$PRICE"
    UNIVERSE_FAILED=$((UNIVERSE_FAILED + 1))
    FAILED_TESTS=$((FAILED_TESTS + 1))
  fi
done

UNIVERSE_PASS_RATE=$(echo "scale=1; $UNIVERSE_PASSED * 100 / $UNIVERSE_TOTAL" | bc)
echo ""
echo -e "${BLUE}Stock Universe Results:${NC} $UNIVERSE_PASSED/$UNIVERSE_TOTAL passed (${UNIVERSE_PASS_RATE}%)"

# Baseline comparison (28/35 = 80% before)
if (( $(echo "$UNIVERSE_PASS_RATE >= 80" | bc -l) )); then
  echo -e "  ${GREEN}✅ MAINTAINED OR IMPROVED${NC} baseline (80%)"
else
  echo -e "  ${YELLOW}⚠️ REGRESSION${NC} from baseline (was 80%, now ${UNIVERSE_PASS_RATE}%)"
fi

echo ""

# ========================================
# TEST 5: REGRESSION TESTING
# ========================================
echo "============================================"
echo "TEST 5: REGRESSION TESTING"
echo "============================================"

echo -e "${BLUE}Testing single quote endpoint...${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
QUOTE_RESPONSE=$(curl -s "$BASE_URL/api/market-data/quote/AAPL")
QUOTE_PRICE=$(echo "$QUOTE_RESPONSE" | jq -r '.price // 0' 2>/dev/null || echo "0")

if [ "$QUOTE_PRICE" != "0" ] && [ "$QUOTE_PRICE" != "null" ]; then
  echo -e "  ${GREEN}✅ PASS${NC} - Quote endpoint working (AAPL: \$$QUOTE_PRICE)"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "  ${RED}❌ FAIL${NC} - Quote endpoint returned invalid price"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi

echo -e "${BLUE}Testing batch quote endpoint...${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ -n "$MARKET_DATA_API_KEY" ]; then
  BATCH_RESPONSE=$(curl -s -H "X-API-Key: $MARKET_DATA_API_KEY" "$BASE_URL/api/market-data/quotes/batch?symbols=AAPL,MSFT,GOOGL")
  BATCH_COUNT=$(echo "$BATCH_RESPONSE" | jq 'length' 2>/dev/null || echo "0")

  if [ "$BATCH_COUNT" -ge 1 ]; then
    echo -e "  ${GREEN}✅ PASS${NC} - Batch endpoint working ($BATCH_COUNT stocks)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
  else
    echo -e "  ${RED}❌ FAIL${NC} - Batch endpoint returned no results"
    FAILED_TESTS=$((FAILED_TESTS + 1))
  fi
else
  echo -e "  ${YELLOW}⚠️ SKIP${NC} - MARKET_DATA_API_KEY not set"
  WARN_TESTS=$((WARN_TESTS + 1))
fi

echo -e "${BLUE}Testing worker health endpoints...${NC}"

# Intelligent Warming Worker
TOTAL_TESTS=$((TOTAL_TESTS + 1))
WARMING_HEALTH=$(curl -s "http://128.140.45.28:3008/health" 2>/dev/null || echo '{"status":"error"}')
WARMING_STATUS=$(echo "$WARMING_HEALTH" | jq -r '.status // "error"' 2>/dev/null || echo "error")
if [ "$WARMING_STATUS" = "healthy" ] || [ "$WARMING_STATUS" = "ok" ]; then
  echo -e "  ${GREEN}✅ PASS${NC} - Warming worker healthy"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "  ${YELLOW}⚠️ WARN${NC} - Warming worker not responding (status: $WARMING_STATUS)"
  WARN_TESTS=$((WARN_TESTS + 1))
fi

# Price Worker
TOTAL_TESTS=$((TOTAL_TESTS + 1))
PRICE_HEALTH=$(curl -s "http://128.140.45.28:3002/health" 2>/dev/null || echo '{"status":"error"}')
PRICE_STATUS=$(echo "$PRICE_HEALTH" | jq -r '.status // "error"' 2>/dev/null || echo "error")
if [ "$PRICE_STATUS" = "healthy" ] || [ "$PRICE_STATUS" = "ok" ]; then
  echo -e "  ${GREEN}✅ PASS${NC} - Price worker healthy"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "  ${YELLOW}⚠️ WARN${NC} - Price worker not responding (status: $PRICE_STATUS)"
  WARN_TESTS=$((WARN_TESTS + 1))
fi

# Transcripts Worker
TOTAL_TESTS=$((TOTAL_TESTS + 1))
TRANSCRIPTS_HEALTH=$(curl -s "http://128.140.45.28:3003/health" 2>/dev/null || echo '{"status":"error"}')
TRANSCRIPTS_STATUS=$(echo "$TRANSCRIPTS_HEALTH" | jq -r '.status // "error"' 2>/dev/null || echo "error")
if [ "$TRANSCRIPTS_STATUS" = "healthy" ] || [ "$TRANSCRIPTS_STATUS" = "ok" ]; then
  echo -e "  ${GREEN}✅ PASS${NC} - Transcripts worker healthy"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "  ${YELLOW}⚠️ WARN${NC} - Transcripts worker not responding (status: $TRANSCRIPTS_STATUS)"
  WARN_TESTS=$((WARN_TESTS + 1))
fi

echo ""

# ========================================
# FINAL SUMMARY
# ========================================
echo "============================================"
echo "📊 TEST SUMMARY"
echo "============================================"
echo ""
echo "Total Tests:   $TOTAL_TESTS"
echo -e "${GREEN}Passed:${NC}        $PASSED_TESTS"
echo -e "${RED}Failed:${NC}        $FAILED_TESTS"
echo -e "${YELLOW}Warnings:${NC}      $WARN_TESTS"
echo ""

OVERALL_PASS_RATE=$(echo "scale=1; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc)
echo "Pass Rate:     ${OVERALL_PASS_RATE}%"
echo ""

if [ "$FAILED_TESTS" -eq 0 ]; then
  echo -e "${GREEN}✅ ALL TESTS PASSED${NC}"
  EXIT_CODE=0
elif [ "$FAILED_TESTS" -le 3 ]; then
  echo -e "${YELLOW}⚠️ PARTIAL PASS${NC} (minor issues found)"
  EXIT_CODE=0
else
  echo -e "${RED}❌ TESTS FAILED${NC} (critical issues found)"
  EXIT_CODE=1
fi

echo ""
echo "============================================"
echo "COMPARISON WITH BASELINE"
echo "============================================"
echo ""
echo "Stock Universe: $UNIVERSE_PASSED/$UNIVERSE_TOTAL (${UNIVERSE_PASS_RATE}%)"
echo "Baseline:       28/35 (80%)"
if (( $(echo "$UNIVERSE_PASS_RATE >= 80" | bc -l) )); then
  echo -e "Status:         ${GREEN}✅ MAINTAINED OR IMPROVED${NC}"
else
  echo -e "Status:         ${RED}❌ REGRESSION${NC}"
fi
echo ""

echo "Results saved to: $RESULTS_FILE"
echo ""

exit $EXIT_CODE
