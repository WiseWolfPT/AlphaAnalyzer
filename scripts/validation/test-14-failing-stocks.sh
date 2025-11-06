#!/bin/bash

# Test 14 failing stocks directly against FMP API
# Identifies root causes: FIXABLE vs PARTIAL vs FMP_GAP

FMP_KEY="${FMP_API_KEY:-sEoOHoj4kGtqhkU7MrQl4lmeF4LwB2Bh}"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 14 failing stocks by severity
CRITICAL_STOCKS=("VLO" "AEP")
SEVERE_STOCKS=("CRM" "MCD" "MRK" "DUK" "MS" "MPC")
NEAR_MISS_STOCKS=("BA" "INTC" "CCI" "RTX" "APD" "NEM")

ALL_STOCKS=("${CRITICAL_STOCKS[@]}" "${SEVERE_STOCKS[@]}" "${NEAR_MISS_STOCKS[@]}")

OUTPUT_DIR="/Users/antoniofrancisco/Documents/teste 1/validation-results/fmp-direct"
mkdir -p "$OUTPUT_DIR"

echo "=========================================="
echo "FMP DIRECT API TEST - 14 FAILING STOCKS"
echo "=========================================="
echo ""

test_stock() {
  local ticker=$1
  local severity=$2

  echo -e "${YELLOW}Testing $ticker ($severity)...${NC}"

  # Test profile
  echo "  → Profile endpoint..."
  profile_result=$(curl -s "https://financialmodelingprep.com/api/v3/profile/${ticker}?apikey=${FMP_KEY}")
  echo "$profile_result" > "$OUTPUT_DIR/${ticker}_profile.json"

  # Check if profile has data
  profile_count=$(echo "$profile_result" | jq '. | length' 2>/dev/null || echo "0")

  # Test income statement (annual)
  echo "  → Income statement (annual)..."
  income_result=$(curl -s "https://financialmodelingprep.com/api/v3/income-statement/${ticker}?limit=5&apikey=${FMP_KEY}")
  echo "$income_result" > "$OUTPUT_DIR/${ticker}_income_annual.json"

  income_count=$(echo "$income_result" | jq '. | length' 2>/dev/null || echo "0")

  # Test income statement (quarterly)
  echo "  → Income statement (quarterly)..."
  income_q_result=$(curl -s "https://financialmodelingprep.com/api/v3/income-statement/${ticker}?period=quarter&limit=8&apikey=${FMP_KEY}")
  echo "$income_q_result" > "$OUTPUT_DIR/${ticker}_income_quarterly.json"

  income_q_count=$(echo "$income_q_result" | jq '. | length' 2>/dev/null || echo "0")

  # Test cash flow (annual)
  echo "  → Cash flow statement (annual)..."
  cf_result=$(curl -s "https://financialmodelingprep.com/api/v3/cash-flow-statement/${ticker}?limit=5&apikey=${FMP_KEY}")
  echo "$cf_result" > "$OUTPUT_DIR/${ticker}_cashflow_annual.json"

  cf_count=$(echo "$cf_result" | jq '. | length' 2>/dev/null || echo "0")

  # Test cash flow (quarterly)
  echo "  → Cash flow statement (quarterly)..."
  cf_q_result=$(curl -s "https://financialmodelingprep.com/api/v3/cash-flow-statement/${ticker}?period=quarter&limit=8&apikey=${FMP_KEY}")
  echo "$cf_q_result" > "$OUTPUT_DIR/${ticker}_cashflow_quarterly.json"

  cf_q_count=$(echo "$cf_q_result" | jq '. | length' 2>/dev/null || echo "0")

  # Test balance sheet (annual)
  echo "  → Balance sheet (annual)..."
  bs_result=$(curl -s "https://financialmodelingprep.com/api/v3/balance-sheet-statement/${ticker}?limit=5&apikey=${FMP_KEY}")
  echo "$bs_result" > "$OUTPUT_DIR/${ticker}_balance_annual.json"

  bs_count=$(echo "$bs_result" | jq '. | length' 2>/dev/null || echo "0")

  # Check for key metrics
  has_fcf=$(echo "$cf_result" | jq '.[0].freeCashFlow // null' 2>/dev/null)
  has_ocf=$(echo "$cf_result" | jq '.[0].operatingCashFlow // null' 2>/dev/null)
  has_capex=$(echo "$cf_result" | jq '.[0].capitalExpenditure // null' 2>/dev/null)
  has_dividends=$(echo "$cf_result" | jq '.[0].dividendsPaid // null' 2>/dev/null)
  has_revenue=$(echo "$income_result" | jq '.[0].revenue // null' 2>/dev/null)
  has_ni=$(echo "$income_result" | jq '.[0].netIncome // null' 2>/dev/null)
  has_equity=$(echo "$bs_result" | jq '.[0].totalStockholdersEquity // null' 2>/dev/null)

  # Summary
  echo ""
  if [ "$profile_count" -gt 0 ] && [ "$income_count" -ge 3 ] && [ "$cf_count" -ge 3 ]; then
    echo -e "  ${GREEN}✅ FIXABLE${NC} - FMP has sufficient data"
  elif [ "$profile_count" -gt 0 ] && [ "$income_count" -ge 1 ] && [ "$cf_count" -ge 1 ]; then
    echo -e "  ${YELLOW}⚠️  PARTIAL FIX${NC} - FMP has partial data"
  else
    echo -e "  ${RED}❌ FMP GAP${NC} - FMP missing data"
  fi

  echo "  Profile: $profile_count records"
  echo "  Income (annual): $income_count records"
  echo "  Income (quarterly): $income_q_count records"
  echo "  Cash Flow (annual): $cf_count records"
  echo "  Cash Flow (quarterly): $cf_q_count records"
  echo "  Balance Sheet: $bs_count records"
  echo "  Key Metrics:"
  echo "    - FCF: $has_fcf"
  echo "    - OCF: $has_ocf"
  echo "    - CapEx: $has_capex"
  echo "    - Dividends: $has_dividends"
  echo "    - Revenue: $has_revenue"
  echo "    - Net Income: $has_ni"
  echo "    - Equity: $has_equity"
  echo ""

  sleep 0.3  # Rate limit protection (4 req/s = 0.25s, add buffer)
}

# Test all stocks
for ticker in "${ALL_STOCKS[@]}"; do
  if [[ " ${CRITICAL_STOCKS[@]} " =~ " ${ticker} " ]]; then
    severity="CRITICAL - 0 methods"
  elif [[ " ${SEVERE_STOCKS[@]} " =~ " ${ticker} " ]]; then
    severity="SEVERE - 1-3 methods"
  else
    severity="NEAR-MISS - 4-5 methods"
  fi

  test_stock "$ticker" "$severity"
  echo "----------------------------------------"
done

echo ""
echo "✅ All tests complete. Results saved to:"
echo "   $OUTPUT_DIR/"
echo ""
echo "Next: Analyze results and categorize stocks"
