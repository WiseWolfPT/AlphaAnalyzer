#!/bin/bash
# Backend IV Mass Validation - Shell Version
# Tests 100 stocks (stratified sample) for IV calculation anomalies

set -e

PROD_URL="http://localhost:3001"

# Test Universe (Stratified by Sector)
declare -A STOCKS=(
  # Technology (15)
  ["AAPL"]="Technology"
  ["MSFT"]="Technology"
  ["GOOGL"]="Technology"
  ["NVDA"]="Technology:growth"
  ["META"]="Technology:growth"
  ["TSLA"]="Technology:growth"
  ["AMZN"]="Technology:growth"
  ["NFLX"]="Technology"
  ["CRM"]="Technology"
  ["ADBE"]="Technology"
  ["ORCL"]="Technology"
  ["INTC"]="Technology"
  ["AMD"]="Technology"
  ["QCOM"]="Technology"
  ["CSCO"]="Technology"
  # Financials (10)
  ["JPM"]="Financials:bank"
  ["BAC"]="Financials:bank"
  ["GS"]="Financials:bank"
  ["MS"]="Financials:bank"
  ["WFC"]="Financials:bank"
  ["C"]="Financials:bank"
  ["USB"]="Financials:bank"
  ["PNC"]="Financials:bank"
  ["TFC"]="Financials:bank"
  ["COF"]="Financials:bank"
  # Real Estate / REITs (10)
  ["AMT"]="Real Estate:reit"
  ["PLD"]="Real Estate:reit"
  ["EQIX"]="Real Estate:reit"
  ["PSA"]="Real Estate:reit"
  ["CCI"]="Real Estate:reit"
  ["DLR"]="Real Estate:reit"
  ["SPG"]="Real Estate:reit"
  ["O"]="Real Estate:reit"
  ["WELL"]="Real Estate:reit"
  ["AVB"]="Real Estate:reit"
  # Healthcare (10)
  ["JNJ"]="Healthcare"
  ["UNH"]="Healthcare"
  ["LLY"]="Healthcare"
  ["ABBV"]="Healthcare"
  ["MRK"]="Healthcare"
  ["TMO"]="Healthcare"
  ["ABT"]="Healthcare"
  ["DHR"]="Healthcare"
  ["BMY"]="Healthcare"
  ["AMGN"]="Healthcare"
  # Consumer (10)
  ["WMT"]="Consumer"
  ["PG"]="Consumer"
  ["KO"]="Consumer"
  ["PEP"]="Consumer"
  ["COST"]="Consumer"
  ["HD"]="Consumer"
  ["MCD"]="Consumer"
  ["NKE"]="Consumer"
  ["SBUX"]="Consumer"
  ["TGT"]="Consumer"
  # Energy (10)
  ["XOM"]="Energy"
  ["CVX"]="Energy"
  ["COP"]="Energy"
  ["SLB"]="Energy"
  ["EOG"]="Energy"
  ["PSX"]="Energy"
  ["VLO"]="Energy"
  ["MPC"]="Energy"
  ["OXY"]="Energy"
  ["HAL"]="Energy"
  # Utilities (10)
  ["NEE"]="Utilities"
  ["DUK"]="Utilities"
  ["SO"]="Utilities"
  ["D"]="Utilities"
  ["AEP"]="Utilities"
  ["EXC"]="Utilities"
  ["SRE"]="Utilities"
  ["XEL"]="Utilities"
  ["ED"]="Utilities"
  ["ES"]="Utilities"
  # Industrials (10)
  ["CAT"]="Industrials"
  ["BA"]="Industrials"
  ["GE"]="Industrials"
  ["HON"]="Industrials"
  ["UPS"]="Industrials"
  ["RTX"]="Industrials"
  ["LMT"]="Industrials"
  ["MMM"]="Industrials"
  ["DE"]="Industrials"
  ["EMR"]="Industrials"
  # Materials (10)
  ["LIN"]="Materials"
  ["APD"]="Materials"
  ["SHW"]="Materials"
  ["ECL"]="Materials"
  ["NEM"]="Materials"
  ["FCX"]="Materials"
  ["DOW"]="Materials"
  ["DD"]="Materials"
  ["ALB"]="Materials"
  ["PPG"]="Materials"
  # Communication (5)
  ["DIS"]="Communication"
  ["CMCSA"]="Communication"
  ["T"]="Communication"
  ["VZ"]="Communication"
  ["TMUS"]="Communication"
)

echo "BACKEND MASS VALIDATION"
echo "======================="

START_TIME=$(date +%s)

PASS_COUNT=0
FAIL_COUNT=0
declare -a FAILURES
declare -A SECTOR_PASS
declare -A SECTOR_TOTAL
declare -A ISSUE_CATEGORIES

# Validation function
validate_stock() {
  local SYMBOL=$1
  local SECTOR_INFO=$2
  local SECTOR=$(echo "$SECTOR_INFO" | cut -d: -f1)
  local SPECIAL=$(echo "$SECTOR_INFO" | cut -d: -f2)

  # Initialize sector stats
  if [ -z "${SECTOR_TOTAL[$SECTOR]}" ]; then
    SECTOR_TOTAL[$SECTOR]=0
    SECTOR_PASS[$SECTOR]=0
  fi
  SECTOR_TOTAL[$SECTOR]=$((SECTOR_TOTAL[$SECTOR] + 1))

  # Fetch data
  local RESPONSE=$(curl -s -w "\n%{http_code}" "$PROD_URL/api/iv/$SYMBOL" 2>/dev/null)
  local HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  local BODY=$(echo "$RESPONSE" | head -n -1)

  local ISSUES=()

  # 1. HTTP 200 response
  if [ "$HTTP_CODE" != "200" ]; then
    ISSUES+=("HTTP $HTTP_CODE")
    ISSUE_CATEGORIES["http_errors"]+="$SYMBOL "
  fi

  # 2-6. JSON validations
  if [ "$HTTP_CODE" = "200" ]; then
    # Check if valid JSON
    if ! echo "$BODY" | jq . > /dev/null 2>&1; then
      ISSUES+=("Invalid JSON")
      ISSUE_CATEGORIES["invalid_json"]+="$SYMBOL "
    else
      # 3. Zero NULL method_id values
      local NULL_METHOD_IDS=$(echo "$BODY" | jq '[.methods[] | select(.method_id == null)] | length' 2>/dev/null)
      if [ "$NULL_METHOD_IDS" != "0" ] && [ -n "$NULL_METHOD_IDS" ]; then
        ISSUES+=("$NULL_METHOD_IDS NULL method_id")
        ISSUE_CATEGORIES["null_method_id"]+="$SYMBOL "
      fi

      # 4. Methods array length between 8-16
      local METHOD_COUNT=$(echo "$BODY" | jq '.methods | length' 2>/dev/null)
      if [ -n "$METHOD_COUNT" ] && ([ "$METHOD_COUNT" -lt 8 ] || [ "$METHOD_COUNT" -gt 16 ]); then
        ISSUES+=("Method count $METHOD_COUNT (expected 8-16)")
        ISSUE_CATEGORIES["wrong_method_count"]+="$SYMBOL "
      fi

      # 5. At least 1 method has valid IV > 0
      local VALID_IV_COUNT=$(echo "$BODY" | jq '[.methods[] | select(.iv != null and .iv > 0)] | length' 2>/dev/null)
      if [ "$VALID_IV_COUNT" = "0" ] || [ -z "$VALID_IV_COUNT" ]; then
        ISSUES+=("No valid IV values > 0")
        ISSUE_CATEGORIES["no_valid_iv"]+="$SYMBOL "
      fi

      # 6. Sector-specific validations
      if [ "$SPECIAL" = "reit" ]; then
        local HAS_REIT=$(echo "$BODY" | jq '[.methods[] | select(.method_id == "reit-ffo" or .method_id == "reit-affo")] | length' 2>/dev/null)
        if [ "$HAS_REIT" = "0" ] || [ -z "$HAS_REIT" ]; then
          ISSUES+=("Missing REIT methods (reit-ffo/reit-affo)")
          ISSUE_CATEGORIES["missing_sector_methods"]+="$SYMBOL "
        fi
      elif [ "$SPECIAL" = "bank" ]; then
        local HAS_BANK=$(echo "$BODY" | jq '[.methods[] | select(.method_id == "bank-p-tbv")] | length' 2>/dev/null)
        if [ "$HAS_BANK" = "0" ] || [ -z "$HAS_BANK" ]; then
          ISSUES+=("Missing bank method (bank-p-tbv)")
          ISSUE_CATEGORIES["missing_sector_methods"]+="$SYMBOL "
        fi
      elif [ "$SPECIAL" = "growth" ]; then
        # Note: growth-dcf-8y is conditional on beta > 1.5, so we don't enforce it
        :
      fi
    fi
  fi

  # Record result
  if [ ${#ISSUES[@]} -eq 0 ]; then
    PASS_COUNT=$((PASS_COUNT + 1))
    SECTOR_PASS[$SECTOR]=$((SECTOR_PASS[$SECTOR] + 1))
  else
    FAIL_COUNT=$((FAIL_COUNT + 1))
    local FAILURE_MSG="$SYMBOL ($SECTOR): ${ISSUES[*]}"
    FAILURES+=("$FAILURE_MSG")
  fi
}

# Run validations
echo "Testing 100 stocks across all sectors..."
echo ""

for SYMBOL in "${!STOCKS[@]}"; do
  validate_stock "$SYMBOL" "${STOCKS[$SYMBOL]}" &

  # Limit concurrent requests to 10
  if (( $(jobs -r | wc -l) >= 10 )); then
    wait -n
  fi
done

# Wait for all remaining jobs
wait

END_TIME=$(date +%s)
EXECUTION_TIME=$((END_TIME - START_TIME))

# Calculate pass rate
PASS_RATE=$(( (PASS_COUNT * 100) / 100 ))

echo "PASS RATE: $PASS_COUNT/100 ($PASS_RATE%)"
echo "EXECUTION TIME: $EXECUTION_TIME seconds"
echo ""

# Sector breakdown
echo "SECTOR BREAKDOWN:"
for SECTOR in "Technology" "Financials" "Real Estate" "Healthcare" "Consumer" "Energy" "Utilities" "Industrials" "Materials" "Communication"; do
  if [ -n "${SECTOR_TOTAL[$SECTOR]}" ]; then
    local PASS=${SECTOR_PASS[$SECTOR]:-0}
    local TOTAL=${SECTOR_TOTAL[$SECTOR]}
    local SECTOR_RATE=$(( (PASS * 100) / TOTAL ))
    echo "- $SECTOR: $PASS/$TOTAL ($SECTOR_RATE%)"
  fi
done

# List failures
if [ ${#FAILURES[@]} -gt 0 ]; then
  echo ""
  echo "FAILURES:"
  local COUNT=1
  for FAILURE in "${FAILURES[@]}"; do
    echo "$COUNT. $FAILURE"
    COUNT=$((COUNT + 1))
  done

  # Top issues
  echo ""
  echo "TOP ISSUES:"

  if [ -n "${ISSUE_CATEGORIES[null_method_id]}" ]; then
    local SYMBOLS=(${ISSUE_CATEGORIES[null_method_id]})
    local COUNT=${#SYMBOLS[@]}
    echo "- NULL method_id: $COUNT stocks [${SYMBOLS[@]:0:5}...]"
  fi

  if [ -n "${ISSUE_CATEGORIES[missing_sector_methods]}" ]; then
    local SYMBOLS=(${ISSUE_CATEGORIES[missing_sector_methods]})
    local COUNT=${#SYMBOLS[@]}
    echo "- Missing sector methods: $COUNT stocks [${SYMBOLS[@]:0:5}...]"
  fi

  if [ -n "${ISSUE_CATEGORIES[http_errors]}" ]; then
    local SYMBOLS=(${ISSUE_CATEGORIES[http_errors]})
    local COUNT=${#SYMBOLS[@]}
    echo "- HTTP errors: $COUNT stocks [${SYMBOLS[@]:0:5}...]"
  fi

  if [ -n "${ISSUE_CATEGORIES[no_valid_iv]}" ]; then
    local SYMBOLS=(${ISSUE_CATEGORIES[no_valid_iv]})
    local COUNT=${#SYMBOLS[@]}
    echo "- No valid IV: $COUNT stocks [${SYMBOLS[@]:0:5}...]"
  fi

  if [ -n "${ISSUE_CATEGORIES[wrong_method_count]}" ]; then
    local SYMBOLS=(${ISSUE_CATEGORIES[wrong_method_count]})
    local COUNT=${#SYMBOLS[@]}
    echo "- Wrong method count: $COUNT stocks [${SYMBOLS[@]:0:5}...]"
  fi
else
  echo ""
  echo "✅ ALL GOOD - No failures detected"
fi

# Exit with appropriate code
if [ $PASS_COUNT -ge 95 ]; then
  exit 0
else
  exit 1
fi
