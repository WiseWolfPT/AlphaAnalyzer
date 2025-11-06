#!/bin/bash
# Quick IV Backend Validation - Minimal output, fast execution

URL="http://localhost:3001"

echo "BACKEND MASS VALIDATION"
echo "======================="

# Define stock lists
TECH="AAPL MSFT GOOGL NVDA META TSLA AMZN NFLX CRM ADBE ORCL INTC AMD QCOM CSCO"
FIN="JPM BAC GS MS WFC C USB PNC TFC COF"
REIT="AMT PLD EQIX PSA CCI DLR SPG O WELL AVB"
HEALTH="JNJ UNH LLY ABBV MRK TMO ABT DHR BMY AMGN"
CONSUMER="WMT PG KO PEP COST HD MCD NKE SBUX TGT"
ENERGY="XOM CVX COP SLB EOG PSX VLO MPC OXY HAL"
UTILITY="NEE DUK SO D AEP EXC SRE XEL ED ES"
IND="CAT BA GE HON UPS RTX LMT MMM DE EMR"
MAT="LIN APD SHW ECL NEM FCX DOW DD ALB PPG"
COMM="DIS CMCSA T VZ TMUS"

START=$(date +%s)
PASS=0
FAIL=0
FAIL_LIST=""

check() {
  SYM=$1
  R=$(curl -s -w "\n%{http_code}" "$URL/api/iv/$SYM")
  CODE=$(echo "$R" | tail -1)
  BODY=$(echo "$R" | sed '$d')

  if [ "$CODE" != "200" ]; then
    FAIL=$((FAIL+1))
    FAIL_LIST="$FAIL_LIST$SYM (HTTP $CODE); "
    return 1
  fi

  MCOUNT=$(echo "$BODY" | jq '.methods | length' 2>/dev/null)
  NULLS=$(echo "$BODY" | jq '[.methods[] | select(.method_id == null)] | length' 2>/dev/null)
  VALIDIVS=$(echo "$BODY" | jq '[.methods[] | select(.iv != null and .iv > 0)] | length' 2>/dev/null)

  if [ "$MCOUNT" -lt 8 ] || [ "$MCOUNT" -gt 16 ]; then
    FAIL=$((FAIL+1))
    FAIL_LIST="$FAIL_LIST$SYM (Methods=$MCOUNT); "
    return 1
  fi

  if [ "$NULLS" != "0" ]; then
    FAIL=$((FAIL+1))
    FAIL_LIST="$FAIL_LIST$SYM (Null IDs=$NULLS); "
    return 1
  fi

  if [ "$VALIDIVS" = "0" ]; then
    FAIL=$((FAIL+1))
    FAIL_LIST="$FAIL_LIST$SYM (No valid IVs); "
    return 1
  fi

  PASS=$((PASS+1))
  return 0
}

# Technology
TP=0; for S in $TECH; do check $S && TP=$((TP+1)); done

# Financials
FP=0; for S in $FIN; do check $S && FP=$((FP+1)); done

# Real Estate
RP=0; for S in $REIT; do check $S && RP=$((RP+1)); done

# Healthcare
HP=0; for S in $HEALTH; do check $S && HP=$((HP+1)); done

# Consumer
CP=0; for S in $CONSUMER; do check $S && CP=$((CP+1)); done

# Energy
EP=0; for S in $ENERGY; do check $S && EP=$((EP+1)); done

# Utilities
UP=0; for S in $UTILITY; do check $S && UP=$((UP+1)); done

# Industrials
IP=0; for S in $IND; do check $S && IP=$((IP+1)); done

# Materials
MP=0; for S in $MAT; do check $S && MP=$((MP+1)); done

# Communication
CMP=0; for S in $COMM; do check $S && CMP=$((CMP+1)); done

END=$(date +%s)
TIME=$((END-START))

echo "PASS RATE: $PASS/100 ($PASS%)"
echo "EXECUTION TIME: $TIME seconds"
echo ""
echo "SECTOR BREAKDOWN:"
echo "- Technology: $TP/15 ($((TP*100/15))%)"
echo "- Financials: $FP/10 ($((FP*10))%)"
echo "- Real Estate: $RP/10 ($((RP*10))%)"
echo "- Healthcare: $HP/10 ($((HP*10))%)"
echo "- Consumer: $CP/10 ($((CP*10))%)"
echo "- Energy: $EP/10 ($((EP*10))%)"
echo "- Utilities: $UP/10 ($((UP*10))%)"
echo "- Industrials: $IP/10 ($((IP*10))%)"
echo "- Materials: $MP/10 ($((MP*10))%)"
echo "- Communication: $CMP/5 ($((CMP*20))%)"

if [ $FAIL -gt 0 ]; then
  echo ""
  echo "FAILURES ($FAIL stocks):"
  echo "$FAIL_LIST" | tr ';' '\n' | head -20
else
  echo ""
  echo "✅ ALL GOOD - No failures detected"
fi
