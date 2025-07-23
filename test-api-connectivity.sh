#!/bin/bash

# API Connectivity Test Script for Alfalyzer
# Tests both direct backend and Vercel proxy endpoints

echo "=== Alfalyzer API Connectivity Test ==="
echo "Backend: https://crucial-ivonne-alfalyzer-90666a9e.koyeb.app"
echo "Frontend: https://alfalyzerpro4.vercel.app"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test health endpoint (both direct and proxy)
echo "1. Testing Health Endpoint..."
echo "   Direct backend:"
if curl -s -f https://crucial-ivonne-alfalyzer-90666a9e.koyeb.app/api/market-data/health > /dev/null; then
    echo -e "   ${GREEN}✓ Success${NC}"
    curl -s https://crucial-ivonne-alfalyzer-90666a9e.koyeb.app/api/market-data/health | jq '.'
else
    echo -e "   ${RED}✗ Failed${NC}"
fi

echo ""
echo "   Through Vercel proxy:"
if curl -s -f https://alfalyzerpro4.vercel.app/api/market-data/health > /dev/null; then
    echo -e "   ${GREEN}✓ Success${NC}"
    curl -s https://alfalyzerpro4.vercel.app/api/market-data/health | jq '.'
else
    echo -e "   ${RED}✗ Failed${NC}"
fi

# Test batch quotes endpoint
echo ""
echo "2. Testing Batch Quotes Endpoint..."
echo "   Request format: {\"symbols\": [\"AAPL\", \"MSFT\"]}"
echo ""
echo "   Through Vercel proxy:"
RESPONSE=$(curl -s -X POST https://alfalyzerpro4.vercel.app/api/market-data/quotes/batch \
  -H "Content-Type: application/json" \
  -d '{"symbols": ["AAPL", "MSFT"]}')

if [ $? -eq 0 ] && echo "$RESPONSE" | jq -e '.quotes' > /dev/null 2>&1; then
    echo -e "   ${GREEN}✓ Success${NC}"
    echo "$RESPONSE" | jq '{
        quotes: [.quotes[] | {
            symbol: .symbol,
            price: .price,
            change: .change,
            changePercent: .changePercent,
            provider: .provider
        }]
    }'
else
    echo -e "   ${RED}✗ Failed${NC}"
    echo "$RESPONSE" | jq '.'
fi

# Test CORS headers
echo ""
echo "3. Testing CORS Headers..."
echo "   Checking if CORS allows all origins (*)"
CORS_HEADERS=$(curl -s -I https://alfalyzerpro4.vercel.app/api/market-data/health | grep -i "access-control")
if echo "$CORS_HEADERS" | grep -q "access-control-allow-origin: \*"; then
    echo -e "   ${GREEN}✓ CORS properly configured${NC}"
    echo "$CORS_HEADERS"
else
    echo -e "   ${RED}✗ CORS not properly configured${NC}"
    echo "$CORS_HEADERS"
fi

# Test authentication (should work without auth)
echo ""
echo "4. Testing Authentication Requirements..."
echo "   Testing without auth token:"
RESPONSE=$(curl -s https://alfalyzerpro4.vercel.app/api/market-data/health)
if [ $? -eq 0 ] && echo "$RESPONSE" | jq -e '.status' > /dev/null 2>&1; then
    echo -e "   ${GREEN}✓ API accessible without authentication${NC}"
else
    echo -e "   ${RED}✗ API requires authentication${NC}"
fi

# Document working endpoints
echo ""
echo "=== WORKING API ENDPOINTS ==="
echo ""
echo "1. Health Check:"
echo "   GET /api/market-data/health"
echo "   Response: {status, hasRealData, cacheSize, providers, rateLimit, cache}"
echo ""
echo "2. Batch Quotes:"
echo "   POST /api/market-data/quotes/batch"
echo "   Body: {\"symbols\": [\"AAPL\", \"MSFT\", ...]}"
echo "   Response: {quotes: [{symbol, price, change, changePercent, ...}], errors, timestamp}"
echo ""
echo "3. Search (NOT IMPLEMENTED YET):"
echo "   GET /api/market-data/search?q=QUERY"
echo "   Status: Returns 404 - endpoint not implemented in backend"
echo ""

# Test response times
echo "=== PERFORMANCE TEST ==="
echo ""
echo "Testing response times for batch quotes (3 requests):"
for i in 1 2 3; do
    TIME=$(curl -s -o /dev/null -w "%{time_total}" -X POST https://alfalyzerpro4.vercel.app/api/market-data/quotes/batch \
      -H "Content-Type: application/json" \
      -d '{"symbols": ["AAPL"]}')
    echo "   Request $i: ${TIME}s"
done

echo ""
echo "=== TEST COMPLETE ==="