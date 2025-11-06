#!/bin/bash
################################################################################
# Backend Validation Commands - FASE 2C
# Quick verification script for Growth Stock deployment
################################################################################

echo "================================================================================"
echo "BACKEND VALIDATION - FASE 2C (Growth Stocks)"
echo "================================================================================"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "1. Checking backend health..."
ssh root@128.140.45.28 "curl -s http://localhost:3001/api/health | jq '{status: .status, services: .services.apis}'"
echo ""

echo "2. Verifying growth-dcf-8y in deployed bundle..."
COUNT=$(ssh root@128.140.45.28 "grep -c 'growth-dcf-8y' '/home/teste 1/dist/server/index.cjs'")
if [ "$COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ growth-dcf-8y found in bundle ($COUNT occurrences)${NC}"
else
    echo -e "${RED}❌ growth-dcf-8y NOT found in bundle${NC}"
fi
echo ""

echo "3. Testing Growth Stock (NVDA)..."
NVDA_RESULT=$(ssh root@128.140.45.28 'curl -s http://localhost:3001/api/iv/NVDA | jq "{ticker: .ticker, methodCount: (.methods | length), hasGrowthDcf8y: (.methods | map(.method_id) | contains([\"growth-dcf-8y\"]))}"')
echo "$NVDA_RESULT"
HAS_GROWTH=$(echo "$NVDA_RESULT" | jq -r '.hasGrowthDcf8y')
if [ "$HAS_GROWTH" == "true" ]; then
    echo -e "${GREEN}✅ NVDA has growth-dcf-8y method${NC}"
else
    echo -e "${RED}❌ NVDA missing growth-dcf-8y method${NC}"
fi
echo ""

echo "4. Testing Value Stock (KO)..."
KO_RESULT=$(ssh root@128.140.45.28 'curl -s http://localhost:3001/api/iv/KO | jq "{ticker: .ticker, methodCount: (.methods | length), hasGrahamNumber: (.methods | map(.method_id) | contains([\"graham-number\"]))}"')
echo "$KO_RESULT"
echo ""

echo "5. Testing Bank Stock (JPM)..."
JPM_RESULT=$(ssh root@128.140.45.28 'curl -s http://localhost:3001/api/iv/JPM | jq "{ticker: .ticker, methodCount: (.methods | length), hasPTBV: (.methods | map(.method_id) | contains([\"p-tbv-mean\"]))}"')
echo "$JPM_RESULT"
echo ""

echo "6. Testing REIT Stock (AMT)..."
AMT_RESULT=$(ssh root@128.140.45.28 'curl -s http://localhost:3001/api/iv/AMT | jq "{ticker: .ticker, methodCount: (.methods | length), methodIds: [.methods[].method_id]}"')
echo "$AMT_RESULT"
echo ""

echo "7. Checking for NULL method_id values..."
NULL_COUNT=$(ssh root@128.140.45.28 'curl -s http://localhost:3001/api/iv/NVDA | jq "[.methods[] | select(.method_id == null)] | length"')
if [ "$NULL_COUNT" -eq 0 ]; then
    echo -e "${GREEN}✅ No NULL method_id values (NVDA)${NC}"
else
    echo -e "${RED}❌ Found $NULL_COUNT NULL method_id values${NC}"
fi
echo ""

echo "8. Performance test (5 samples)..."
for i in {1..5}; do
    TIME=$(ssh root@128.140.45.28 'time curl -s http://localhost:3001/api/iv/AAPL > /dev/null' 2>&1 | grep real | awk '{print $2}')
    echo "  Sample $i: $TIME"
done
echo ""

echo "9. Cache metrics..."
ssh root@128.140.45.28 'curl -s http://localhost:3001/api/cache/status | jq "{cacheSize: .cache.stats.cacheSize, hit: .cache.stats.hit, miss: .cache.stats.miss, hitRate: (.cache.stats.hit / (.cache.stats.hit + .cache.stats.miss) * 100 | tostring + \"%\")}"'
echo ""

echo "10. PM2 status..."
ssh root@128.140.45.28 "pm2 list | grep alfalyzer"
echo ""

echo "================================================================================"
echo "SUMMARY"
echo "================================================================================"

if [ "$HAS_GROWTH" == "true" ]; then
    echo -e "${GREEN}✅ PASS: Growth stock integration working${NC}"
    echo -e "${GREEN}   Production Ready: YES${NC}"
else
    echo -e "${RED}❌ FAIL: Growth stock integration missing${NC}"
    echo -e "${RED}   Production Ready: NO${NC}"
    echo ""
    echo "Root Cause: iv-chart-controller.ts does not call stock classifier"
    echo "Fix Required: Integrate isGrowthStock() into controller"
    echo "Estimated Time: 30 minutes"
fi
echo ""

echo "Full report: BACKEND_VALIDATION_REPORT_FASE_2C.md"
echo "================================================================================"
