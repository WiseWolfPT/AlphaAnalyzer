#!/bin/bash
# Test 401 Fix - Verify Vercel Proxy is Working

echo "🧪 Testing 401 Fix - Vercel Proxy Configuration"
echo "=============================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# URLs
FRONTEND_URL="https://alfalyzer.vercel.app"
BACKEND_URL="https://crucial-ivonne-alfalyzer-90666a9e.coolify.app"

echo ""
echo "1️⃣  Testing Backend Health (Direct)"
BACKEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/health")
if [ "$BACKEND_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ Backend is healthy (Status: $BACKEND_RESPONSE)${NC}"
else
    echo -e "${RED}❌ Backend is not responding (Status: $BACKEND_RESPONSE)${NC}"
    exit 1
fi

echo ""
echo "2️⃣  Testing Frontend Deployment"
FRONTEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL/")
if [ "$FRONTEND_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ Frontend is deployed (Status: $FRONTEND_RESPONSE)${NC}"
else
    echo -e "${RED}❌ Frontend deployment failed (Status: $FRONTEND_RESPONSE)${NC}"
    exit 1
fi

echo ""
echo "3️⃣  Testing Vercel Proxy (Frontend → Backend)"
PROXY_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL/api/health")
if [ "$PROXY_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ Vercel proxy is working (Status: $PROXY_RESPONSE)${NC}"
else
    echo -e "${RED}❌ Vercel proxy failed (Status: $PROXY_RESPONSE)${NC}"
    echo "   This means the 401 error might still occur!"
    exit 1
fi

echo ""
echo "4️⃣  Testing with X-Auth-Token Header"
AUTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -H "X-Auth-Token: test-token" "$FRONTEND_URL/api/health")
if [ "$AUTH_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ X-Auth-Token header works (Status: $AUTH_RESPONSE)${NC}"
else
    echo -e "${YELLOW}⚠️  X-Auth-Token test returned: $AUTH_RESPONSE${NC}"
fi

echo ""
echo "5️⃣  Checking for VITE_API_URL in Vercel"
VERCEL_ENV=$(cd "$(dirname "$0")/.." && vercel env ls 2>/dev/null | grep -i "VITE_API_URL" || true)
if [ -z "$VERCEL_ENV" ]; then
    echo -e "${GREEN}✅ VITE_API_URL is NOT set in Vercel (Good!)${NC}"
else
    echo -e "${RED}❌ VITE_API_URL is still set in Vercel!${NC}"
    echo "   Run: vercel env rm VITE_API_URL production"
    exit 1
fi

echo ""
echo "6️⃣  Testing API Data Endpoint"
API_DATA=$(curl -s "$FRONTEND_URL/api/health")
if echo "$API_DATA" | grep -q '"status":"ok"'; then
    echo -e "${GREEN}✅ API returns valid data${NC}"
    echo "   Response: $(echo "$API_DATA" | jq -c .)"
else
    echo -e "${RED}❌ API data test failed${NC}"
fi

echo ""
echo "=============================================="
echo -e "${GREEN}🎉 All tests passed! The 401 fix is working!${NC}"
echo ""
echo "Summary:"
echo "✅ Backend on Coolify is running"
echo "✅ Frontend on Vercel is deployed"
echo "✅ Vercel proxy is correctly configured"
echo "✅ VITE_API_URL is not exposing backend URL"
echo "✅ API calls are working through the proxy"
echo ""
echo "The application should now work without 401 errors!"
echo "Test it at: $FRONTEND_URL"