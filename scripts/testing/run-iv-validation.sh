#!/bin/bash
# ONDA 7 IV Validation - Multi-Stock Testing Suite
# Tests intrinsic value functionality across diverse stocks

set -euo pipefail

# Test stocks covering different sectors
STOCKS=(
  "AAPL:Large Cap Tech"
  "MSFT:Large Cap Tech"
  "NVDA:Large Cap Tech"
  "JPM:Finance"
  "BRK.B:Finance Conglomerate"
  "AMZN:Consumer Discretionary"
  "TSLA:Automotive/Tech"
  "JNJ:Healthcare Pharma"
  "UNH:Healthcare Insurance"
  "PLTR:Smaller Cap"
)

BASE_URL="https://128.140.45.28.sslip.io"
RESULTS_FILE="/Users/antoniofrancisco/Documents/teste 1/scripts/testing/iv-validation-results-$(date +%Y%m%d-%H%M%S).json"

echo "ONDA 7 IV Validation Suite"
echo "=========================="
echo "Testing ${#STOCKS[@]} stocks across diverse sectors"
echo "Results will be saved to: $RESULTS_FILE"
echo ""

# Initialize results JSON
echo '{"timestamp":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","stocks":[]}' > "$RESULTS_FILE"

# Function to test a single stock via API
test_stock() {
  local ticker="$1"
  local sector="$2"

  echo "Testing $ticker ($sector)..."

  # Test the IV endpoint
  local response=$(curl -s "${BASE_URL}/api/iv/${ticker}/chart" || echo '{"error":"API failed"}')

  # Check if we got valid data
  if echo "$response" | jq -e '.methods' > /dev/null 2>&1; then
    local method_count=$(echo "$response" | jq '.methods | length')
    local price=$(echo "$response" | jq -r '.price // 0')
    local has_data=$([ "$method_count" -gt 0 ] && echo "true" || echo "false")

    echo "  ✓ $ticker: $method_count methods, price: \$$price"

    # Return structured data
    jq -n \
      --arg ticker "$ticker" \
      --arg sector "$sector" \
      --arg methods "$method_count" \
      --arg price "$price" \
      --arg status "PASS" \
      '{ticker: $ticker, sector: $sector, methods: ($methods|tonumber), price: ($price|tonumber), status: $status}'
  else
    echo "  ✗ $ticker: API error or no data"
    jq -n \
      --arg ticker "$ticker" \
      --arg sector "$sector" \
      --arg status "FAIL" \
      '{ticker: $ticker, sector: $sector, methods: 0, price: 0, status: $status, error: "API failed"}'
  fi
}

# Test each stock
for stock in "${STOCKS[@]}"; do
  IFS=: read -r ticker sector <<< "$stock"
  test_stock "$ticker" "$sector"
  sleep 1  # Rate limiting
done

echo ""
echo "Validation complete. Check $RESULTS_FILE for detailed results."
