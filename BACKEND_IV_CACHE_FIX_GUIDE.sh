#!/bin/bash
################################################################################
# BACKEND IV CACHE FIX GUIDE
# Agent 3 - Backend IV Validation
# Date: 2025-11-05
################################################################################

echo "================================================================================"
echo " BACKEND IV CACHE FIX - 3 Stocks with Empty Methods Arrays"
echo "================================================================================"
echo ""
echo "Affected Stocks: JNJ, PG, PSA"
echo "Issue: Valid cache, valid price, but 0 methods in array"
echo "Root Cause: Stale cached data with empty methods"
echo "Fix: Cache invalidation to force fresh calculation"
echo ""

# SSH into production server
ssh root@128.140.45.28 << 'EOF'

echo "--- Pre-Fix Validation ---"
echo ""

# Test current state
test_current() {
  local symbol=$1
  echo "Testing $symbol..."

  response=$(curl -s "http://localhost:3001/api/iv/$symbol/chart" 2>/dev/null)
  methods=$(echo "$response" | jq -r '.methods | length' 2>/dev/null)
  price=$(echo "$response" | jq -r '.price' 2>/dev/null)
  iv=$(echo "$response" | jq -r '.methods[0].iv // "null"' 2>/dev/null)

  echo "  Price: $price"
  echo "  Methods: $methods"
  echo "  First IV: $iv"
  echo ""
}

echo "Current State:"
test_current "JNJ"
test_current "PG"
test_current "PSA"

echo ""
echo "--- Clearing Cache ---"
echo ""

# Clear cache keys
redis-cli -a alfalyzer2025redis << 'REDIS'
DEL iv:chart:JNJ:fcf
DEL iv:chart:PG:fcf
DEL iv:chart:PSA:fcf
REDIS

echo "Cache keys deleted for JNJ, PG, PSA"
echo ""

echo "--- Post-Fix Validation (Wait 5s for recalculation) ---"
echo ""
sleep 5

# Test after cache clear
test_after() {
  local symbol=$1
  echo "Testing $symbol..."

  response=$(curl -s "http://localhost:3001/api/iv/$symbol/chart" 2>/dev/null)
  http_code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3001/api/iv/$symbol/chart" 2>/dev/null)
  methods=$(echo "$response" | jq -r '.methods | length' 2>/dev/null)
  price=$(echo "$response" | jq -r '.price' 2>/dev/null)
  iv=$(echo "$response" | jq -r '.methods[0].iv // "null"' 2>/dev/null)

  echo "  HTTP Code: $http_code"
  echo "  Price: $price"
  echo "  Methods: $methods"
  echo "  First IV: $iv"

  if [ "$methods" -gt "0" ] && [ "$iv" != "null" ]; then
    echo "  Status: ✅ FIXED"
  else
    echo "  Status: ❌ STILL FAILING"
  fi
  echo ""
}

echo "New State:"
test_after "JNJ"
test_after "PG"
test_after "PSA"

echo ""
echo "--- Expected Outcomes ---"
echo ""
echo "JNJ:  Should have ~13 methods (value stock)"
echo "PG:   Should have ~13 methods (value stock)"
echo "PSA:  Should have ~16-18 methods (REIT with FFO/AFFO)"
echo ""

echo "--- Verification Complete ---"
echo ""
echo "If all 3 stocks now show methods > 0 and valid IVs:"
echo "  → Overall pass rate improves from 80% to 95% (19/20)"
echo "  → Value stocks: 100% (4/4)"
echo "  → REITs: 100% (5/5)"
echo ""

EOF

echo ""
echo "================================================================================"
echo " ALTERNATIVE: Test Locally (if SSH unavailable)"
echo "================================================================================"
echo ""
echo "1. Clear cache:"
echo "   redis-cli -h 128.140.45.28 -p 6379 -a alfalyzer2025redis DEL iv:chart:JNJ:fcf"
echo "   redis-cli -h 128.140.45.28 -p 6379 -a alfalyzer2025redis DEL iv:chart:PG:fcf"
echo "   redis-cli -h 128.140.45.28 -p 6379 -a alfalyzer2025redis DEL iv:chart:PSA:fcf"
echo ""
echo "2. Test endpoints:"
echo "   curl https://128.140.45.28.sslip.io/api/iv/JNJ/chart | jq '.methods | length'"
echo "   curl https://128.140.45.28.sslip.io/api/iv/PG/chart | jq '.methods | length'"
echo "   curl https://128.140.45.28.sslip.io/api/iv/PSA/chart | jq '.methods | length'"
echo ""
echo "3. Expected results:"
echo "   JNJ:  13+ methods"
echo "   PG:   13+ methods"
echo "   PSA:  16-18 methods"
echo ""

echo "================================================================================"
echo " MONITORING RECOMMENDATION"
echo "================================================================================"
echo ""
echo "Add automated cache health check:"
echo ""
echo "1. Daily cron job to detect empty methods arrays:"
echo "   */0 2 * * * /path/to/check-iv-cache-health.sh"
echo ""
echo "2. Alert on stocks with methods < 5:"
echo "   curl http://localhost:3001/api/iv/\$SYMBOL/chart | jq '.methods | length'"
echo ""
echo "3. Implement cache validation layer in valuation-service.ts:"
echo "   if (cachedResult.methods?.length === 0) {"
echo "     logger.warn('Empty methods array in cache, recalculating');"
echo "     // Trigger recalculation"
echo "   }"
echo ""
echo "================================================================================"
