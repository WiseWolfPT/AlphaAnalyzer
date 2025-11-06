#!/bin/bash
# FASE 3.2: Frontend Validation Test Commands
# Production URL: https://128.140.45.28.sslip.io
# Date: 2025-10-28

set -e

BASE_URL="https://128.140.45.28.sslip.io"

echo "FASE 3.2: Frontend Validation Test Suite"
echo "=========================================="
echo ""

# Test 1: P0.5 Direct URL Routing
echo "TEST 1: P0.5 Direct URL Routing"
echo "--------------------------------"
for ticker in AAPL JPM AMT NEE; do
  echo -n "$ticker: "
  status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/intrinsic-value/$ticker")
  if [ "$status" = "200" ]; then
    echo "✅ 200 OK"
  else
    echo "❌ $status"
  fi
done
echo ""

# Test 2: P0.4 Sequential Search
echo "TEST 2: P0.4 Sequential Search"
echo "-------------------------------"
for ticker in AAPL JPM AMT NEE MSFT; do
  echo -n "$ticker: "
  count=$(curl -s "$BASE_URL/api/market-data/search?query=$ticker" | jq -r '.results | length')
  if [ "$count" -gt 0 ]; then
    echo "✅ $count results"
  else
    echo "⚠️ 0 results"
  fi
done
echo ""

# Test 3: Sector-Specific Methods
echo "TEST 3: Sector-Specific Methods"
echo "--------------------------------"

echo "Banks (P/TBV):"
for ticker in JPM BAC GS; do
  echo -n "  $ticker: "
  ptbv=$(curl -s "$BASE_URL/api/iv/$ticker/chart" | \
    jq -r '[.methods[] | select(.name | contains("P/TBV"))] | length')
  echo "$ptbv P/TBV methods"
done

echo "REITs (FFO/AFFO):"
for ticker in AMT PLD EQIX; do
  echo -n "  $ticker: "
  ffo=$(curl -s "$BASE_URL/api/iv/$ticker/chart" | \
    jq -r '[.methods[] | select(.name | contains("FFO") or contains("AFFO"))] | length')
  echo "$ffo FFO/AFFO methods"
done
echo ""

# Test 4: NULL Value Check
echo "TEST 4: NULL Value Check"
echo "------------------------"
for ticker in AAPL JPM AMT NEE; do
  echo -n "$ticker: "
  nulls=$(curl -s "$BASE_URL/api/iv/$ticker/chart" | \
    jq -r '.methods | map(select(.iv == null)) | length')
  if [ "$nulls" = "0" ]; then
    echo "✅ No NULLs"
  else
    echo "❌ $nulls NULL values"
  fi
done
echo ""

# Test 5: Performance
echo "TEST 5: Performance Metrics"
echo "---------------------------"
echo -n "Homepage: "
curl -s -o /dev/null -w "%{time_total}s\n" "$BASE_URL/"

echo -n "Search: "
curl -s -o /dev/null -w "%{time_total}s\n" "$BASE_URL/api/market-data/search?query=AAPL"

echo -n "IV API: "
curl -s -o /dev/null -w "%{time_total}s\n" "$BASE_URL/api/iv/AAPL/chart"
echo ""

# Test 6: Error Handling
echo "TEST 6: Error Handling"
echo "----------------------"
echo -n "Invalid ticker: "
error=$(curl -s "$BASE_URL/api/iv/INVALIDTICKER/chart" | jq -r '.error // "No error"')
if [ "$error" != "No error" ]; then
  echo "✅ Graceful error: $error"
else
  echo "❌ No error message"
fi
echo ""

echo "=========================================="
echo "FASE 3.2: Test Suite Complete"
echo "=========================================="
