#!/bin/bash

# FASE 3.1 - Test Script: Validate All 15 Valuation Methods
# Tests the /api/iv/:ticker/chart endpoint to ensure all methods are working

set -e

echo "=================================================="
echo "FASE 3.1 - Testing 15 Valuation Methods"
echo "=================================================="
echo ""

# Configuration
API_URL="${API_URL:-http://localhost:3001}"
TICKER="${1:-AAPL}"

echo "Configuration:"
echo "  API URL: $API_URL"
echo "  Ticker: $TICKER"
echo ""

# Check if server is running
echo "1. Checking if server is running..."
if ! curl -s -f "$API_URL/api/health" > /dev/null 2>&1; then
    echo "   ❌ ERROR: Server is not running at $API_URL"
    echo "   Please start the server with: npm run dev"
    exit 1
fi
echo "   ✅ Server is running"
echo ""

# Test IV Chart endpoint
echo "2. Testing GET /api/iv/$TICKER/chart..."
RESPONSE=$(curl -s "$API_URL/api/iv/$TICKER/chart")

# Check if response is valid JSON
if ! echo "$RESPONSE" | jq empty 2>/dev/null; then
    echo "   ❌ ERROR: Invalid JSON response"
    echo "   Response: $RESPONSE"
    exit 1
fi
echo "   ✅ Valid JSON response received"
echo ""

# Extract method count
METHOD_COUNT=$(echo "$RESPONSE" | jq '.methods | length')
echo "3. Validating method count..."
echo "   Expected: 15 methods"
echo "   Actual: $METHOD_COUNT methods"

if [ "$METHOD_COUNT" -ne 15 ]; then
    echo "   ❌ ERROR: Expected 15 methods, got $METHOD_COUNT"
    exit 1
fi
echo "   ✅ All 15 methods present"
echo ""

# List all method names
echo "4. Listing all method names:"
echo "$RESPONSE" | jq -r '.methods[] | "   - \(.name) (\(.category))"'
echo ""

# Validate expected method names
echo "5. Validating expected method names..."

EXPECTED_METHODS=(
    "AlfaValue™"
    "DCF-20 FCF FMP"
    "DCF-20 FCFE FMP"
    "DCF Terminal FCF FMP"
    "DCF Terminal FCFE FMP"
    "DNI-20 NI"
    "P/E Mean 5y"
    "P/E Mean without NRI"
    "P/E Median 5y"
    "P/E Median without NRI"
    "P/S Mean 5y"
    "P/S Median 5y"
    "P/B Mean 5y"
    "P/B Median 5y"
    "PEG Ratio"
    "PSG Ratio"
    "DFCF Terminal"
)

MISSING_METHODS=()

for method in "${EXPECTED_METHODS[@]}"; do
    if ! echo "$RESPONSE" | jq -e ".methods[] | select(.name == \"$method\")" > /dev/null 2>&1; then
        MISSING_METHODS+=("$method")
    fi
done

if [ ${#MISSING_METHODS[@]} -gt 0 ]; then
    echo "   ❌ ERROR: Missing methods:"
    for method in "${MISSING_METHODS[@]}"; do
        echo "      - $method"
    done
    exit 1
fi
echo "   ✅ All expected method names found"
echo ""

# Validate categories
echo "6. Validating method categories..."
PROPRIETARY_COUNT=$(echo "$RESPONSE" | jq '[.methods[] | select(.category == "proprietary")] | length')
DCF_COUNT=$(echo "$RESPONSE" | jq '[.methods[] | select(.category == "dcf")] | length')
MULTIPLES_COUNT=$(echo "$RESPONSE" | jq '[.methods[] | select(.category == "multiples")] | length')
GROWTH_COUNT=$(echo "$RESPONSE" | jq '[.methods[] | select(.category == "growth")] | length')

echo "   Proprietary: $PROPRIETARY_COUNT (expected: 1)"
echo "   DCF Models: $DCF_COUNT (expected: 6)"
echo "   Multiples: $MULTIPLES_COUNT (expected: 6)"
echo "   Growth: $GROWTH_COUNT (expected: 2)"

if [ "$PROPRIETARY_COUNT" -ne 1 ] || [ "$DCF_COUNT" -ne 6 ] || [ "$MULTIPLES_COUNT" -ne 6 ] || [ "$GROWTH_COUNT" -ne 2 ]; then
    echo "   ❌ ERROR: Category counts don't match expected values"
    exit 1
fi
echo "   ✅ All categories validated"
echo ""

# Check for valid IV values
echo "7. Checking for valid intrinsic values..."
NULL_IVS=$(echo "$RESPONSE" | jq '[.methods[] | select(.iv == null)] | length')
INVALID_IVS=$(echo "$RESPONSE" | jq '[.methods[] | select(.iv != null and (.iv <= 0 or (.iv | isinfinite or isnan)))] | length')

echo "   Methods with null IV: $NULL_IVS"
echo "   Methods with invalid IV: $INVALID_IVS"

if [ "$NULL_IVS" -gt 0 ]; then
    echo "   ⚠️  WARNING: Some methods returned null IV (may be expected for certain companies)"
    echo "$RESPONSE" | jq -r '.methods[] | select(.iv == null) | "      - \(.name)"'
fi

if [ "$INVALID_IVS" -gt 0 ]; then
    echo "   ❌ ERROR: Some methods returned invalid IV values"
    echo "$RESPONSE" | jq -r '.methods[] | select(.iv != null and (.iv <= 0 or (.iv | isinfinite or isnan))) | "      - \(.name): \(.iv)"'
    exit 1
fi
echo "   ✅ All IV values are valid (or appropriately null)"
echo ""

# Performance check (optional)
echo "8. Performance check (3 requests)..."
for i in {1..3}; do
    START=$(date +%s%3N)
    curl -s "$API_URL/api/iv/$TICKER/chart" > /dev/null
    END=$(date +%s%3N)
    DURATION=$((END - START))
    echo "   Request $i: ${DURATION}ms"
done
echo ""

# Summary
echo "=================================================="
echo "✅ ALL TESTS PASSED!"
echo "=================================================="
echo ""
echo "Summary:"
echo "  - 15 valuation methods implemented and working"
echo "  - All expected method names present"
echo "  - Categories correctly assigned"
echo "  - IV values valid (where available)"
echo "  - API endpoint responding correctly"
echo ""
echo "Next steps:"
echo "  1. Test with multiple tickers: ./scripts/test-15-methods.sh MSFT"
echo "  2. Deploy to production: npm run deploy:server"
echo "  3. Validate in production: API_URL=https://128.140.45.28.sslip.io ./scripts/test-15-methods.sh"
echo ""
