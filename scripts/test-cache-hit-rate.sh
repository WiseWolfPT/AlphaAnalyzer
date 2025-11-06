#!/bin/bash
# Cache Hit Rate Benchmark Script
# Tests actual cache hit vs miss timing

set -e

TARGET_URL="${1:-http://localhost:3001}"
TEST_SYMBOL="AAPL"

echo "========================================================================"
echo "CACHE HIT RATE BENCHMARK"
echo "========================================================================"
echo "Target: $TARGET_URL"
echo "Symbol: $TEST_SYMBOL"
echo ""

# Function to measure request time
measure_request() {
  local url="$1"
  local label="$2"

  echo "Testing: $label"
  echo "URL: $url"

  # Time the request (capture both timing and response)
  START=$(date +%s%3N)
  RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}\nTIME_TOTAL:%{time_total}" "$url" 2>&1)
  END=$(date +%s%3N)

  # Extract HTTP code and timing
  HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
  TIME_CURL=$(echo "$RESPONSE" | grep "TIME_TOTAL:" | cut -d: -f2)
  TIME_MS=$((END - START))

  # Check for cache header in response
  CACHE_STATUS="UNKNOWN"
  if echo "$RESPONSE" | grep -q "X-Cache-Status"; then
    CACHE_STATUS=$(echo "$RESPONSE" | grep "X-Cache-Status" | cut -d: -f2 | tr -d ' ')
  fi

  echo "  HTTP Code: $HTTP_CODE"
  echo "  Time: ${TIME_MS}ms (curl: ${TIME_CURL}s)"
  echo "  Cache Status: $CACHE_STATUS"
  echo ""
}

# Test 1: Quote endpoint (should cache for 60s)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 1: Quote Endpoint (TTL: 60s)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Clear quote cache
echo "Clearing quote cache for $TEST_SYMBOL..."
redis-cli DEL "quote:$TEST_SYMBOL" > /dev/null 2>&1 || true
echo ""

# Request 1: Cache MISS (should fetch from API)
echo "Request 1 (expected: CACHE MISS):"
measure_request "$TARGET_URL/api/market-data/quote/$TEST_SYMBOL" "First request"

# Wait 2 seconds
echo "Waiting 2 seconds..."
sleep 2
echo ""

# Request 2: Cache HIT (should be fast)
echo "Request 2 (expected: CACHE HIT):"
measure_request "$TARGET_URL/api/market-data/quote/$TEST_SYMBOL" "Second request (cached)"

# Wait 65 seconds to let cache expire
echo "Waiting 65 seconds for cache to expire..."
sleep 65
echo ""

# Request 3: Cache MISS again (cache expired)
echo "Request 3 (expected: CACHE MISS - expired):"
measure_request "$TARGET_URL/api/market-data/quote/$TEST_SYMBOL" "Third request (expired)"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 2: Intrinsic Value Endpoint (TTL: 24h)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Clear IV cache
echo "Clearing IV cache for $TEST_SYMBOL..."
redis-cli KEYS "iv:calc:$TEST_SYMBOL*" | xargs redis-cli DEL > /dev/null 2>&1 || true
echo ""

# Request 1: Cache MISS
echo "Request 1 (expected: CACHE MISS):"
measure_request "$TARGET_URL/api/iv/$TEST_SYMBOL/chart" "First IV request"

# Wait 2 seconds
echo "Waiting 2 seconds..."
sleep 2
echo ""

# Request 2: Cache HIT
echo "Request 2 (expected: CACHE HIT):"
measure_request "$TARGET_URL/api/iv/$TEST_SYMBOL/chart" "Second IV request (cached)"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "REDIS CACHE INSPECTION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check quote cache
echo "Quote cache keys:"
redis-cli KEYS "quote:*" | head -10

echo ""
echo "IV cache keys:"
redis-cli KEYS "iv:*" | head -10

echo ""
echo "Sample TTLs:"
if redis-cli EXISTS "quote:$TEST_SYMBOL" | grep -q "1"; then
  TTL=$(redis-cli TTL "quote:$TEST_SYMBOL")
  echo "  quote:$TEST_SYMBOL → $TTL seconds remaining"
fi

IV_KEY=$(redis-cli KEYS "iv:calc:$TEST_SYMBOL" | head -1)
if [ -n "$IV_KEY" ]; then
  TTL=$(redis-cli TTL "$IV_KEY")
  echo "  $IV_KEY → $TTL seconds remaining"
fi

echo ""
echo "========================================================================"
echo "END OF BENCHMARK"
echo "========================================================================"
