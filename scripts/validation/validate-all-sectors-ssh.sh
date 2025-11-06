#!/bin/bash

# FASE 2.6: Backend Full Re-Validation via SSH
# Testing all 10 sectors with representative samples

set -e

TARGET_HOST="root@128.140.45.28"
API_BASE="http://localhost:3001/api/iv"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
TOTAL_TESTED=0
TOTAL_PASSED=0
TOTAL_FAILED=0
TOTAL_TIME=0

# Results arrays
declare -A SECTOR_TESTED
declare -A SECTOR_PASSED
declare -A SECTOR_FAILED
declare -a FAILED_STOCKS

# Log file
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/tmp/backend_validation_${TIMESTAMP}.log"

echo "====================================" | tee -a "$LOG_FILE"
echo "FASE 2.6: Backend Full Re-Validation" | tee -a "$LOG_FILE"
echo "Target: ${TARGET_HOST}" | tee -a "$LOG_FILE"
echo "Timestamp: $(date -u +%Y-%m-%d\ %H:%M:%S\ UTC)" | tee -a "$LOG_FILE"
echo "====================================" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# Test function
test_stock() {
    local SYMBOL=$1
    local SECTOR=$2
    local EXPECTED_METHODS=$3

    TOTAL_TESTED=$((TOTAL_TESTED + 1))
    SECTOR_TESTED[$SECTOR]=$((${SECTOR_TESTED[$SECTOR]:-0} + 1))

    echo -n "Testing ${SYMBOL} (${SECTOR})... " | tee -a "$LOG_FILE"

    # Capture response, HTTP code, and time
    RESPONSE=$(ssh -q "$TARGET_HOST" "curl -s -w '\nHTTP_CODE:%{http_code}\nTIME:%{time_total}' '${API_BASE}/${SYMBOL}' 2>&1" 2>&1)

    HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
    TIME=$(echo "$RESPONSE" | grep "TIME:" | cut -d: -f2)
    JSON=$(echo "$RESPONSE" | sed '/HTTP_CODE:/,$d')

    # Accumulate time
    TOTAL_TIME=$(echo "$TOTAL_TIME + $TIME" | bc)

    # Validate response
    if [ "$HTTP_CODE" != "200" ]; then
        echo -e "${RED}FAIL${NC} (HTTP $HTTP_CODE)" | tee -a "$LOG_FILE"
        FAILED_STOCKS+=("${SYMBOL} - HTTP ${HTTP_CODE}")
        TOTAL_FAILED=$((TOTAL_FAILED + 1))
        SECTOR_FAILED[$SECTOR]=$((${SECTOR_FAILED[$SECTOR]:-0} + 1))
        return 1
    fi

    # Check if valid JSON
    if ! echo "$JSON" | jq . >/dev/null 2>&1; then
        echo -e "${RED}FAIL${NC} (Invalid JSON)" | tee -a "$LOG_FILE"
        FAILED_STOCKS+=("${SYMBOL} - Invalid JSON")
        TOTAL_FAILED=$((TOTAL_FAILED + 1))
        SECTOR_FAILED[$SECTOR]=$((${SECTOR_FAILED[$SECTOR]:-0} + 1))
        return 1
    fi

    # Extract data
    TICKER=$(echo "$JSON" | jq -r '.ticker // empty')
    METHODS_COUNT=$(echo "$JSON" | jq '.methods | length')
    NULL_IDS=$(echo "$JSON" | jq '[.methods[] | select(.method_id == null)] | length')
    NULL_IVS=$(echo "$JSON" | jq '[.methods[] | select(.iv == null)] | length')

    # Validate ticker
    if [ "$TICKER" != "$SYMBOL" ]; then
        echo -e "${RED}FAIL${NC} (Ticker mismatch: got $TICKER)" | tee -a "$LOG_FILE"
        FAILED_STOCKS+=("${SYMBOL} - Ticker mismatch")
        TOTAL_FAILED=$((TOTAL_FAILED + 1))
        SECTOR_FAILED[$SECTOR]=$((${SECTOR_FAILED[$SECTOR]:-0} + 1))
        return 1
    fi

    # Validate methods count
    if [ "$METHODS_COUNT" -lt "$EXPECTED_METHODS" ]; then
        echo -e "${YELLOW}WARN${NC} (Only $METHODS_COUNT methods, expected $EXPECTED_METHODS+) - ${TIME}s" | tee -a "$LOG_FILE"
    fi

    # Check for null values
    if [ "$NULL_IDS" -gt 0 ] || [ "$NULL_IVS" -gt 0 ]; then
        echo -e "${RED}FAIL${NC} (Null IDs: $NULL_IDS, Null IVs: $NULL_IVS)" | tee -a "$LOG_FILE"
        FAILED_STOCKS+=("${SYMBOL} - Null values (IDs: $NULL_IDS, IVs: $NULL_IVS)")
        TOTAL_FAILED=$((TOTAL_FAILED + 1))
        SECTOR_FAILED[$SECTOR]=$((${SECTOR_FAILED[$SECTOR]:-0} + 1))
        return 1
    fi

    # Sector-specific validations
    case $SECTOR in
        "Banks")
            HAS_PTBV=$(echo "$JSON" | jq '[.methods[] | select(.method_id | contains("p-tbv"))] | length')
            if [ "$HAS_PTBV" -eq 0 ]; then
                echo -e "${RED}FAIL${NC} (Missing P/TBV methods)" | tee -a "$LOG_FILE"
                FAILED_STOCKS+=("${SYMBOL} - Missing P/TBV methods")
                TOTAL_FAILED=$((TOTAL_FAILED + 1))
                SECTOR_FAILED[$SECTOR]=$((${SECTOR_FAILED[$SECTOR]:-0} + 1))
                return 1
            fi
            ;;
        "REITs")
            HAS_FFO=$(echo "$JSON" | jq '[.methods[] | select(.method_id | contains("ffo") or contains("affo"))] | length')
            if [ "$HAS_FFO" -eq 0 ]; then
                echo -e "${RED}FAIL${NC} (Missing FFO/AFFO methods)" | tee -a "$LOG_FILE"
                FAILED_STOCKS+=("${SYMBOL} - Missing FFO/AFFO methods")
                TOTAL_FAILED=$((TOTAL_FAILED + 1))
                SECTOR_FAILED[$SECTOR]=$((${SECTOR_FAILED[$SECTOR]:-0} + 1))
                return 1
            fi
            ;;
    esac

    echo -e "${GREEN}PASS${NC} ($METHODS_COUNT methods) - ${TIME}s" | tee -a "$LOG_FILE"
    TOTAL_PASSED=$((TOTAL_PASSED + 1))
    SECTOR_PASSED[$SECTOR]=$((${SECTOR_PASSED[$SECTOR]:-0} + 1))
    return 0
}

echo "Starting sector validation..." | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# Technology (10 stocks)
echo -e "${BLUE}=== TECHNOLOGY ===${NC}" | tee -a "$LOG_FILE"
test_stock "AAPL" "Technology" 6
test_stock "MSFT" "Technology" 6
test_stock "GOOGL" "Technology" 6
test_stock "NVDA" "Technology" 6
test_stock "META" "Technology" 6
test_stock "TSLA" "Technology" 6
test_stock "AMZN" "Technology" 6
test_stock "NFLX" "Technology" 6
test_stock "CRM" "Technology" 6
test_stock "ADBE" "Technology" 6
echo "" | tee -a "$LOG_FILE"

# Banks (10 stocks)
echo -e "${BLUE}=== BANKS ===${NC}" | tee -a "$LOG_FILE"
test_stock "JPM" "Banks" 8
test_stock "BAC" "Banks" 8
test_stock "GS" "Banks" 8
test_stock "MS" "Banks" 8
test_stock "WFC" "Banks" 8
test_stock "C" "Banks" 8
test_stock "USB" "Banks" 8
test_stock "PNC" "Banks" 8
test_stock "TFC" "Banks" 8
test_stock "COF" "Banks" 8
echo "" | tee -a "$LOG_FILE"

# REITs (10 stocks)
echo -e "${BLUE}=== REITs ===${NC}" | tee -a "$LOG_FILE"
test_stock "AMT" "REITs" 10
test_stock "PLD" "REITs" 10
test_stock "EQIX" "REITs" 10
test_stock "PSA" "REITs" 10
test_stock "CCI" "REITs" 10
test_stock "DLR" "REITs" 10
test_stock "SPG" "REITs" 10
test_stock "O" "REITs" 10
test_stock "WELL" "REITs" 10
test_stock "AVB" "REITs" 10
echo "" | tee -a "$LOG_FILE"

# Utilities (10 stocks)
echo -e "${BLUE}=== UTILITIES ===${NC}" | tee -a "$LOG_FILE"
test_stock "NEE" "Utilities" 6
test_stock "DUK" "Utilities" 6
test_stock "SO" "Utilities" 6
test_stock "D" "Utilities" 6
test_stock "AEP" "Utilities" 6
test_stock "EXC" "Utilities" 6
test_stock "SRE" "Utilities" 6
test_stock "XEL" "Utilities" 6
test_stock "ED" "Utilities" 6
test_stock "ES" "Utilities" 6
echo "" | tee -a "$LOG_FILE"

# Healthcare (10 stocks)
echo -e "${BLUE}=== HEALTHCARE ===${NC}" | tee -a "$LOG_FILE"
test_stock "JNJ" "Healthcare" 6
test_stock "UNH" "Healthcare" 6
test_stock "LLY" "Healthcare" 6
test_stock "ABBV" "Healthcare" 6
test_stock "MRK" "Healthcare" 6
test_stock "TMO" "Healthcare" 6
test_stock "ABT" "Healthcare" 6
test_stock "DHR" "Healthcare" 6
test_stock "BMY" "Healthcare" 6
test_stock "AMGN" "Healthcare" 6
echo "" | tee -a "$LOG_FILE"

# Consumer (10 stocks)
echo -e "${BLUE}=== CONSUMER ===${NC}" | tee -a "$LOG_FILE"
test_stock "WMT" "Consumer" 6
test_stock "PG" "Consumer" 6
test_stock "KO" "Consumer" 6
test_stock "PEP" "Consumer" 6
test_stock "COST" "Consumer" 6
test_stock "HD" "Consumer" 6
test_stock "MCD" "Consumer" 6
test_stock "NKE" "Consumer" 6
test_stock "SBUX" "Consumer" 6
test_stock "TGT" "Consumer" 6
echo "" | tee -a "$LOG_FILE"

# Industrials (10 stocks)
echo -e "${BLUE}=== INDUSTRIALS ===${NC}" | tee -a "$LOG_FILE"
test_stock "CAT" "Industrials" 6
test_stock "BA" "Industrials" 6
test_stock "GE" "Industrials" 6
test_stock "HON" "Industrials" 6
test_stock "UPS" "Industrials" 6
test_stock "RTX" "Industrials" 6
test_stock "LMT" "Industrials" 6
test_stock "MMM" "Industrials" 6
test_stock "DE" "Industrials" 6
test_stock "EMR" "Industrials" 6
echo "" | tee -a "$LOG_FILE"

# Energy (10 stocks)
echo -e "${BLUE}=== ENERGY ===${NC}" | tee -a "$LOG_FILE"
test_stock "XOM" "Energy" 6
test_stock "CVX" "Energy" 6
test_stock "COP" "Energy" 6
test_stock "SLB" "Energy" 6
test_stock "EOG" "Energy" 6
test_stock "PSX" "Energy" 6
test_stock "VLO" "Energy" 6
test_stock "MPC" "Energy" 6
test_stock "OXY" "Energy" 6
test_stock "HAL" "Energy" 6
echo "" | tee -a "$LOG_FILE"

# Materials (10 stocks)
echo -e "${BLUE}=== MATERIALS ===${NC}" | tee -a "$LOG_FILE"
test_stock "LIN" "Materials" 6
test_stock "APD" "Materials" 6
test_stock "SHW" "Materials" 6
test_stock "ECL" "Materials" 6
test_stock "NEM" "Materials" 6
test_stock "FCX" "Materials" 6
test_stock "DOW" "Materials" 6
test_stock "DD" "Materials" 6
test_stock "ALB" "Materials" 6
test_stock "PPG" "Materials" 6
echo "" | tee -a "$LOG_FILE"

# Communication (10 stocks)
echo -e "${BLUE}=== COMMUNICATION ===${NC}" | tee -a "$LOG_FILE"
test_stock "META" "Communication" 6
test_stock "GOOGL" "Communication" 6
test_stock "DIS" "Communication" 6
test_stock "NFLX" "Communication" 6
test_stock "CMCSA" "Communication" 6
test_stock "T" "Communication" 6
test_stock "VZ" "Communication" 6
test_stock "TMUS" "Communication" 6
test_stock "CHTR" "Communication" 6
test_stock "EA" "Communication" 6
echo "" | tee -a "$LOG_FILE"

# Calculate statistics
echo "====================================" | tee -a "$LOG_FILE"
echo "VALIDATION RESULTS" | tee -a "$LOG_FILE"
echo "====================================" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

PASS_RATE=$(echo "scale=2; $TOTAL_PASSED * 100 / $TOTAL_TESTED" | bc)
AVG_TIME=$(echo "scale=3; $TOTAL_TIME / $TOTAL_TESTED" | bc)

echo "Overall Statistics:" | tee -a "$LOG_FILE"
echo "  Total Tested: $TOTAL_TESTED" | tee -a "$LOG_FILE"
echo "  Passed: $TOTAL_PASSED" | tee -a "$LOG_FILE"
echo "  Failed: $TOTAL_FAILED" | tee -a "$LOG_FILE"
echo "  Pass Rate: ${PASS_RATE}%" | tee -a "$LOG_FILE"
echo "  Avg Response Time: ${AVG_TIME}s" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

echo "Results by Sector:" | tee -a "$LOG_FILE"
for SECTOR in Technology Banks REITs Utilities Healthcare Consumer Industrials Energy Materials Communication; do
    TESTED=${SECTOR_TESTED[$SECTOR]:-0}
    PASSED=${SECTOR_PASSED[$SECTOR]:-0}
    FAILED=${SECTOR_FAILED[$SECTOR]:-0}

    if [ $TESTED -gt 0 ]; then
        SECTOR_RATE=$(echo "scale=2; $PASSED * 100 / $TESTED" | bc)
        echo "  $SECTOR: $PASSED/$TESTED passed (${SECTOR_RATE}%)" | tee -a "$LOG_FILE"
    fi
done
echo "" | tee -a "$LOG_FILE"

if [ $TOTAL_FAILED -gt 0 ]; then
    echo "Failed Stocks:" | tee -a "$LOG_FILE"
    for STOCK in "${FAILED_STOCKS[@]}"; do
        echo "  - $STOCK" | tee -a "$LOG_FILE"
    done
    echo "" | tee -a "$LOG_FILE"
fi

# Final verdict
echo "====================================" | tee -a "$LOG_FILE"
if (( $(echo "$PASS_RATE >= 95" | bc -l) )); then
    echo -e "${GREEN}✓ VALIDATION PASSED${NC} (Pass rate: ${PASS_RATE}%)" | tee -a "$LOG_FILE"
    EXIT_CODE=0
else
    echo -e "${RED}✗ VALIDATION FAILED${NC} (Pass rate: ${PASS_RATE}% < 95%)" | tee -a "$LOG_FILE"
    EXIT_CODE=1
fi
echo "====================================" | tee -a "$LOG_FILE"

echo "" | tee -a "$LOG_FILE"
echo "Full log saved to: $LOG_FILE"

exit $EXIT_CODE
