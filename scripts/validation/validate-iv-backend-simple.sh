#!/bin/bash
# Backend IV Mass Validation - Simple Synchronous Version

PROD_URL="http://localhost:3001"

# Stock list (space-separated for easier iteration)
TECH_STOCKS="AAPL MSFT GOOGL NVDA META TSLA AMZN NFLX CRM ADBE ORCL INTC AMD QCOM CSCO"
FIN_STOCKS="JPM BAC GS MS WFC C USB PNC TFC COF"
REIT_STOCKS="AMT PLD EQIX PSA CCI DLR SPG O WELL AVB"
HEALTH_STOCKS="JNJ UNH LLY ABBV MRK TMO ABT DHR BMY AMGN"
CONSUMER_STOCKS="WMT PG KO PEP COST HD MCD NKE SBUX TGT"
ENERGY_STOCKS="XOM CVX COP SLB EOG PSX VLO MPC OXY HAL"
UTILITY_STOCKS="NEE DUK SO D AEP EXC SRE XEL ED ES"
INDUSTRIAL_STOCKS="CAT BA GE HON UPS RTX LMT MMM DE EMR"
MATERIALS_STOCKS="LIN APD SHW ECL NEM FCX DOW DD ALB PPG"
COMM_STOCKS="DIS CMCSA T VZ TMUS"

echo "BACKEND MASS VALIDATION"
echo "======================="

START_TIME=$(date +%s)

PASS=0
FAIL=0
FAILURES_FILE="/tmp/iv-failures.txt"
> "$FAILURES_FILE"

# Sector counts
TECH_PASS=0 TECH_TOTAL=15
FIN_PASS=0 FIN_TOTAL=10
REIT_PASS=0 REIT_TOTAL=10
HEALTH_PASS=0 HEALTH_TOTAL=10
CONSUMER_PASS=0 CONSUMER_TOTAL=10
ENERGY_PASS=0 ENERGY_TOTAL=10
UTILITY_PASS=0 UTILITY_TOTAL=10
IND_PASS=0 IND_TOTAL=10
MAT_PASS=0 MAT_TOTAL=10
COMM_PASS=0 COMM_TOTAL=5

# Validation function
validate() {
  local SYMBOL=$1
  local SECTOR=$2
  local CHECK_METHOD=$3

  local RESPONSE=$(curl -s -w "\n%{http_code}" "$PROD_URL/api/iv/$SYMBOL")
  local HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  local BODY=$(echo "$RESPONSE" | head -n -1)

  local ISSUES=""

  # 1. HTTP 200
  if [ "$HTTP_CODE" != "200" ]; then
    ISSUES="${ISSUES}HTTP $HTTP_CODE; "
  fi

  if [ "$HTTP_CODE" = "200" ] && echo "$BODY" | jq . > /dev/null 2>&1; then
    # 3. NULL method_id
    local NULL_IDS=$(echo "$BODY" | jq '[.methods[] | select(.method_id == null)] | length')
    if [ "$NULL_IDS" != "0" ]; then
      ISSUES="${ISSUES}${NULL_IDS} NULL method_id; "
    fi

    # 4. Method count 8-16
    local METHOD_COUNT=$(echo "$BODY" | jq '.methods | length')
    if [ "$METHOD_COUNT" -lt 8 ] || [ "$METHOD_COUNT" -gt 16 ]; then
      ISSUES="${ISSUES}Methods=$METHOD_COUNT (expect 8-16); "
    fi

    # 5. Valid IV > 0
    local VALID_IV=$(echo "$BODY" | jq '[.methods[] | select(.iv != null and .iv > 0)] | length')
    if [ "$VALID_IV" = "0" ]; then
      ISSUES="${ISSUES}No valid IV; "
    fi

    # 6. Sector-specific
    if [ -n "$CHECK_METHOD" ]; then
      local HAS_METHOD=$(echo "$BODY" | jq "[.methods[] | select(.method_id | contains(\"$CHECK_METHOD\"))] | length")
      if [ "$HAS_METHOD" = "0" ]; then
        ISSUES="${ISSUES}Missing $CHECK_METHOD; "
      fi
    fi
  elif [ "$HTTP_CODE" = "200" ]; then
    ISSUES="${ISSUES}Invalid JSON; "
  fi

  if [ -z "$ISSUES" ]; then
    PASS=$((PASS + 1))
    case "$SECTOR" in
      Technology) TECH_PASS=$((TECH_PASS + 1)) ;;
      Financials) FIN_PASS=$((FIN_PASS + 1)) ;;
      "Real Estate") REIT_PASS=$((REIT_PASS + 1)) ;;
      Healthcare) HEALTH_PASS=$((HEALTH_PASS + 1)) ;;
      Consumer) CONSUMER_PASS=$((CONSUMER_PASS + 1)) ;;
      Energy) ENERGY_PASS=$((ENERGY_PASS + 1)) ;;
      Utilities) UTILITY_PASS=$((UTILITY_PASS + 1)) ;;
      Industrials) IND_PASS=$((IND_PASS + 1)) ;;
      Materials) MAT_PASS=$((MAT_PASS + 1)) ;;
      Communication) COMM_PASS=$((COMM_PASS + 1)) ;;
    esac
  else
    FAIL=$((FAIL + 1))
    echo "$SYMBOL ($SECTOR): $ISSUES" >> "$FAILURES_FILE"
  fi
}

# Technology (15)
for SYM in $TECH_STOCKS; do validate "$SYM" "Technology" ""; done

# Financials (10) - expect bank-p-tbv
for SYM in $FIN_STOCKS; do validate "$SYM" "Financials" "bank"; done

# Real Estate (10) - expect reit methods
for SYM in $REIT_STOCKS; do validate "$SYM" "Real Estate" "reit"; done

# Healthcare (10)
for SYM in $HEALTH_STOCKS; do validate "$SYM" "Healthcare" ""; done

# Consumer (10)
for SYM in $CONSUMER_STOCKS; do validate "$SYM" "Consumer" ""; done

# Energy (10)
for SYM in $ENERGY_STOCKS; do validate "$SYM" "Energy" ""; done

# Utilities (10)
for SYM in $UTILITY_STOCKS; do validate "$SYM" "Utilities" ""; done

# Industrials (10)
for SYM in $INDUSTRIAL_STOCKS; do validate "$SYM" "Industrials" ""; done

# Materials (10)
for SYM in $MATERIALS_STOCKS; do validate "$SYM" "Materials" ""; done

# Communication (5)
for SYM in $COMM_STOCKS; do validate "$SYM" "Communication" ""; done

END_TIME=$(date +%s)
EXECUTION_TIME=$((END_TIME - START_TIME))

echo "PASS RATE: $PASS/100 ($((PASS))%)"
echo "EXECUTION TIME: $EXECUTION_TIME seconds"
echo ""

echo "SECTOR BREAKDOWN:"
echo "- Technology: $TECH_PASS/$TECH_TOTAL ($((TECH_PASS * 100 / TECH_TOTAL))%)"
echo "- Financials: $FIN_PASS/$FIN_TOTAL ($((FIN_PASS * 100 / FIN_TOTAL))%)"
echo "- Real Estate: $REIT_PASS/$REIT_TOTAL ($((REIT_PASS * 100 / REIT_TOTAL))%)"
echo "- Healthcare: $HEALTH_PASS/$HEALTH_TOTAL ($((HEALTH_PASS * 100 / HEALTH_TOTAL))%)"
echo "- Consumer: $CONSUMER_PASS/$CONSUMER_TOTAL ($((CONSUMER_PASS * 100 / CONSUMER_TOTAL))%)"
echo "- Energy: $ENERGY_PASS/$ENERGY_TOTAL ($((ENERGY_PASS * 100 / ENERGY_TOTAL))%)"
echo "- Utilities: $UTILITY_PASS/$UTILITY_TOTAL ($((UTILITY_PASS * 100 / UTILITY_TOTAL))%)"
echo "- Industrials: $IND_PASS/$IND_TOTAL ($((IND_PASS * 100 / IND_TOTAL))%)"
echo "- Materials: $MAT_PASS/$MAT_TOTAL ($((MAT_PASS * 100 / MAT_TOTAL))%)"
echo "- Communication: $COMM_PASS/$COMM_TOTAL ($((COMM_PASS * 100 / COMM_TOTAL))%)"

if [ $FAIL -gt 0 ]; then
  echo ""
  echo "FAILURES:"
  cat -n "$FAILURES_FILE"
else
  echo ""
  echo "✅ ALL GOOD - No failures detected"
fi

rm -f "$FAILURES_FILE"

exit $([ $PASS -ge 95 ] && echo 0 || echo 1)
