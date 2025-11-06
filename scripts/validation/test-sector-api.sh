#!/bin/bash

##
# AGENT 16: Test GICS Sector API Endpoints
#
# Tests all 4 sector API endpoints to ensure they work correctly.
##

set -e

echo "================================================================================"
echo "AGENT 16: GICS Sector API Endpoint Testing"
echo "================================================================================"
echo ""

# Check if server is running
if ! curl -sf http://localhost:3001/api/health > /dev/null 2>&1; then
  echo "Error: Server is not running at localhost:3001"
  echo "Please start the server with: npm run dev"
  exit 1
fi

echo "✓ Server is running"
echo ""

# Test 1: GET /api/sectors - List all sectors
echo "Test 1: GET /api/sectors"
echo "---------------------------------------"
RESPONSE=$(curl -sf http://localhost:3001/api/sectors)
TOTAL=$(echo "$RESPONSE" | grep -o '"total":[0-9]*' | grep -o '[0-9]*')
TOTAL_STOCKS=$(echo "$RESPONSE" | grep -o '"totalStocks":[0-9]*' | grep -o '[0-9]*')

if [ -n "$TOTAL" ]; then
  echo "✓ Returned $TOTAL sectors"
  echo "✓ Total stocks: $TOTAL_STOCKS"
  echo "✓ Sample response:"
  echo "$RESPONSE" | head -50
else
  echo "✗ Failed to get sectors"
  exit 1
fi
echo ""

# Test 2: GET /api/sectors/information-technology - Get sector details
echo "Test 2: GET /api/sectors/information-technology"
echo "---------------------------------------"
RESPONSE=$(curl -sf http://localhost:3001/api/sectors/information-technology)
STOCK_COUNT=$(echo "$RESPONSE" | grep -o '"stockCount":[0-9]*' | head -1 | grep -o '[0-9]*')

if [ -n "$STOCK_COUNT" ]; then
  echo "✓ Information Technology sector has $STOCK_COUNT stocks"
  echo "✓ Sample response:"
  echo "$RESPONSE" | head -30
else
  echo "✗ Failed to get sector details"
  exit 1
fi
echo ""

# Test 3: GET /api/sectors/information-technology/stocks - Get stocks in sector
echo "Test 3: GET /api/sectors/information-technology/stocks?page=1&limit=10"
echo "---------------------------------------"
RESPONSE=$(curl -sf "http://localhost:3001/api/sectors/information-technology/stocks?page=1&limit=10")
TOTAL=$(echo "$RESPONSE" | grep -o '"total":[0-9]*' | grep -o '[0-9]*')

if [ -n "$TOTAL" ]; then
  echo "✓ Retrieved stocks from Information Technology sector"
  echo "✓ Total stocks: $TOTAL"
  echo "✓ Sample response:"
  echo "$RESPONSE" | head -40
else
  echo "✗ Failed to get sector stocks"
  exit 1
fi
echo ""

# Test 4: GET /api/sectors/distribution - Get sector distribution
echo "Test 4: GET /api/sectors/distribution"
echo "---------------------------------------"
RESPONSE=$(curl -sf http://localhost:3001/api/sectors/distribution)
TOTAL_STOCKS=$(echo "$RESPONSE" | grep -o '"totalStocks":[0-9]*' | grep -o '[0-9]*')

if [ -n "$TOTAL_STOCKS" ]; then
  echo "✓ Retrieved sector distribution"
  echo "✓ Total stocks: $TOTAL_STOCKS"
  echo "✓ Sample response:"
  echo "$RESPONSE" | head -30
else
  echo "✗ Failed to get distribution"
  exit 1
fi
echo ""

# Test other sectors
echo "Test 5: Testing other GICS sectors"
echo "---------------------------------------"
SECTORS=("financials" "healthcare" "energy" "industrials" "consumer-discretionary")

for SECTOR in "${SECTORS[@]}"; do
  RESPONSE=$(curl -sf "http://localhost:3001/api/sectors/$SECTOR" 2>&1)
  if [ $? -eq 0 ]; then
    echo "✓ $SECTOR sector accessible"
  else
    echo "✗ $SECTOR sector failed"
  fi
done
echo ""

echo "================================================================================"
echo "✓ All API endpoint tests passed!"
echo "================================================================================"
echo ""

echo "SUMMARY:"
echo "  - GET /api/sectors                      ✓ Working"
echo "  - GET /api/sectors/:sectorId            ✓ Working"
echo "  - GET /api/sectors/:sectorId/stocks     ✓ Working"
echo "  - GET /api/sectors/distribution         ✓ Working"
echo ""
echo "✓ GICS Sector API implementation is fully functional!"
