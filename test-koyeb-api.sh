#!/bin/bash

# Test Koyeb API endpoints
KOYEB_URL="https://crucial-ivonne-alfalyzer-90666a9e.koyeb.app"

echo "🧪 Testing Koyeb API endpoints..."
echo "================================"

# Test health endpoint
echo "1. Testing /api/health:"
curl -i "$KOYEB_URL/api/health"
echo -e "\n"

# Test market data quotes batch
echo "2. Testing /api/market-data/quotes/batch with GET:"
curl -i "$KOYEB_URL/api/market-data/quotes/batch?symbols=AAPL,GOOGL"
echo -e "\n"

# Test single quote
echo "3. Testing /api/market-data/quote/AAPL:"
curl -i "$KOYEB_URL/api/market-data/quote/AAPL"
echo -e "\n"

# Test market status
echo "4. Testing /api/market-data/market-status:"
curl -i "$KOYEB_URL/api/market-data/market-status"
echo -e "\n"

# Test with CORS headers from Vercel
echo "5. Testing with CORS headers:"
curl -i -H "Origin: https://alfalyzerpro4.vercel.app" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     "$KOYEB_URL/api/market-data/quotes/batch"
echo -e "\n"

echo "✅ Tests complete!"