#!/bin/bash

# FASE 2.6: Backend Full Re-Validation via SSH
# Testing all 10 sectors with representative samples

set -e

TARGET_HOST="root@128.140.45.28"
API_BASE="http://localhost:3001/api/iv"

# Counters
TOTAL_TESTED=0
TOTAL_PASSED=0
TOTAL_FAILED=0
TOTAL_TIME=0
FAILED_STOCKS=""

# Sector counters
TECH_TESTED=0 TECH_PASSED=0 TECH_FAILED=0
BANK_TESTED=0 BANK_PASSED=0 BANK_FAILED=0
REIT_TESTED=0 REIT_PASSED=0 REIT_FAILED=0
UTIL_TESTED=0 UTIL_PASSED=0 UTIL_FAILED=0
HEALTH_TESTED=0 HEALTH_PASSED=0 HEALTH_FAILED=0
CONS_TESTED=0 CONS_PASSED=0 CONS_FAILED=0
IND_TESTED=0 IND_PASSED=0 IND_FAILED=0
ENERGY_TESTED=0 ENERGY_PASSED=0 ENERGY_FAILED=0
MAT_TESTED=0 MAT_PASSED=0 MAT_FAILED=0
COMM_TESTED=0 COMM_PASSED=0 COMM_FAILED=0

# Log file
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/tmp/backend_validation_${TIMESTAMP}.log"

echo "===================================="
echo "FASE 2.6: Backend Full Re-Validation"
echo "Target: ${TARGET_HOST}"
echo "Timestamp: $(date -u +%Y-%m-%d\ %H:%M:%S\ UTC)"
echo "===================================="
echo ""

# Test function
test_stock() {
    local SYMBOL=$1
    local SECTOR=$2
    local EXPECTED_METHODS=$3

    TOTAL_TESTED=$((TOTAL_TESTED + 1))

    # Increment sector counter
    case $SECTOR in
        "Technology") TECH_TESTED=$((TECH_TESTED + 1)) ;;
        "Banks") BANK_TESTED=$((BANK_TESTED + 1)) ;;
        "REITs") REIT_TESTED=$((REIT_TESTED + 1)) ;;
        "Utilities") UTIL_TESTED=$((UTIL_TESTED + 1)) ;;
        "Healthcare") HEALTH_TESTED=$((HEALTH_TESTED + 1)) ;;
        "Consumer") CONS_TESTED=$((CONS_TESTED + 1)) ;;
        "Industrials") IND_TESTED=$((IND_TESTED + 1)) ;;
        "Energy") ENERGY_TESTED=$((ENERGY_TESTED + 1)) ;;
        "Materials") MAT_TESTED=$((MAT_TESTED + 1)) ;;
        "Communication") COMM_TESTED=$((COMM_TESTED + 1)) ;;
    esac

    echo -n "Testing ${SYMBOL} (${SECTOR})... "

    # Capture response, HTTP code, and time
    RESPONSE=$(ssh -q "$TARGET_HOST" "curl -s -w '\nHTTP_CODE:%{http_code}\nTIME:%{time_total}' '${API_BASE}/${SYMBOL}' 2>&1" 2>&1)

    HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
    TIME=$(echo "$RESPONSE" | grep "TIME:" | cut -d: -f2)
    JSON=$(echo "$RESPONSE" | sed '/HTTP_CODE:/,$d')

    # Accumulate time
    TOTAL_TIME=$(echo "$TOTAL_TIME + $TIME" | bc)

    # Validate response
    if [ "$HTTP_CODE" != "200" ]; then
        echo "FAIL (HTTP $HTTP_CODE)"
        FAILED_STOCKS="${FAILED_STOCKS}${SYMBOL} - HTTP ${HTTP_CODE}\n"
        TOTAL_FAILED=$((TOTAL_FAILED + 1))
        case $SECTOR in
            "Technology") TECH_FAILED=$((TECH_FAILED + 1)) ;;
            "Banks") BANK_FAILED=$((BANK_FAILED + 1)) ;;
            "REITs") REIT_FAILED=$((REIT_FAILED + 1)) ;;
            "Utilities") UTIL_FAILED=$((UTIL_FAILED + 1)) ;;
            "Healthcare") HEALTH_FAILED=$((HEALTH_FAILED + 1)) ;;
            "Consumer") CONS_FAILED=$((CONS_FAILED + 1)) ;;
            "Industrials") IND_FAILED=$((IND_FAILED + 1)) ;;
            "Energy") ENERGY_FAILED=$((ENERGY_FAILED + 1)) ;;
            "Materials") MAT_FAILED=$((MAT_FAILED + 1)) ;;
            "Communication") COMM_FAILED=$((COMM_FAILED + 1)) ;;
        esac
        return 1
    fi

    # Check if valid JSON
    if ! echo "$JSON" | jq . >/dev/null 2>&1; then
        echo "FAIL (Invalid JSON)"
        FAILED_STOCKS="${FAILED_STOCKS}${SYMBOL} - Invalid JSON\n"
        TOTAL_FAILED=$((TOTAL_FAILED + 1))
        case $SECTOR in
            "Technology") TECH_FAILED=$((TECH_FAILED + 1)) ;;
            "Banks") BANK_FAILED=$((BANK_FAILED + 1)) ;;
            "REITs") REIT_FAILED=$((REIT_FAILED + 1)) ;;
            "Utilities") UTIL_FAILED=$((UTIL_FAILED + 1)) ;;
            "Healthcare") HEALTH_FAILED=$((HEALTH_FAILED + 1)) ;;
            "Consumer") CONS_FAILED=$((CONS_FAILED + 1)) ;;
            "Industrials") IND_FAILED=$((IND_FAILED + 1)) ;;
            "Energy") ENERGY_FAILED=$((ENERGY_FAILED + 1)) ;;
            "Materials") MAT_FAILED=$((MAT_FAILED + 1)) ;;
            "Communication") COMM_FAILED=$((COMM_FAILED + 1)) ;;
        esac
        return 1
    fi

    # Extract data
    TICKER=$(echo "$JSON" | jq -r '.ticker // empty')
    METHODS_COUNT=$(echo "$JSON" | jq '.methods | length')
    NULL_IDS=$(echo "$JSON" | jq '[.methods[] | select(.method_id == null)] | length')
    NULL_IVS=$(echo "$JSON" | jq '[.methods[] | select(.iv == null)] | length')

    # Validate ticker
    if [ "$TICKER" != "$SYMBOL" ]; then
        echo "FAIL (Ticker mismatch: got $TICKER)"
        FAILED_STOCKS="${FAILED_STOCKS}${SYMBOL} - Ticker mismatch\n"
        TOTAL_FAILED=$((TOTAL_FAILED + 1))
        case $SECTOR in
            "Technology") TECH_FAILED=$((TECH_FAILED + 1)) ;;
            "Banks") BANK_FAILED=$((BANK_FAILED + 1)) ;;
            "REITs") REIT_FAILED=$((REIT_FAILED + 1)) ;;
            "Utilities") UTIL_FAILED=$((UTIL_FAILED + 1)) ;;
            "Healthcare") HEALTH_FAILED=$((HEALTH_FAILED + 1)) ;;
            "Consumer") CONS_FAILED=$((CONS_FAILED + 1)) ;;
            "Industrials") IND_FAILED=$((IND_FAILED + 1)) ;;
            "Energy") ENERGY_FAILED=$((ENERGY_FAILED + 1)) ;;
            "Materials") MAT_FAILED=$((MAT_FAILED + 1)) ;;
            "Communication") COMM_FAILED=$((COMM_FAILED + 1)) ;;
        esac
        return 1
    fi

    # Check for null values
    if [ "$NULL_IDS" -gt 0 ] || [ "$NULL_IVS" -gt 0 ]; then
        echo "FAIL (Null IDs: $NULL_IDS, Null IVs: $NULL_IVS)"
        FAILED_STOCKS="${FAILED_STOCKS}${SYMBOL} - Null values (IDs: $NULL_IDS, IVs: $NULL_IVS)\n"
        TOTAL_FAILED=$((TOTAL_FAILED + 1))
        case $SECTOR in
            "Technology") TECH_FAILED=$((TECH_FAILED + 1)) ;;
            "Banks") BANK_FAILED=$((BANK_FAILED + 1)) ;;
            "REITs") REIT_FAILED=$((REIT_FAILED + 1)) ;;
            "Utilities") UTIL_FAILED=$((UTIL_FAILED + 1)) ;;
            "Healthcare") HEALTH_FAILED=$((HEALTH_FAILED + 1)) ;;
            "Consumer") CONS_FAILED=$((CONS_FAILED + 1)) ;;
            "Industrials") IND_FAILED=$((IND_FAILED + 1)) ;;
            "Energy") ENERGY_FAILED=$((ENERGY_FAILED + 1)) ;;
            "Materials") MAT_FAILED=$((MAT_FAILED + 1)) ;;
            "Communication") COMM_FAILED=$((COMM_FAILED + 1)) ;;
        esac
        return 1
    fi

    # Sector-specific validations
    case $SECTOR in
        "Banks")
            HAS_PTBV=$(echo "$JSON" | jq '[.methods[] | select(.method_id | contains("p-tbv"))] | length')
            if [ "$HAS_PTBV" -eq 0 ]; then
                echo "FAIL (Missing P/TBV methods)"
                FAILED_STOCKS="${FAILED_STOCKS}${SYMBOL} - Missing P/TBV methods\n"
                TOTAL_FAILED=$((TOTAL_FAILED + 1))
                BANK_FAILED=$((BANK_FAILED + 1))
                return 1
            fi
            ;;
        "REITs")
            HAS_FFO=$(echo "$JSON" | jq '[.methods[] | select(.method_id | contains("ffo") or contains("affo"))] | length')
            if [ "$HAS_FFO" -eq 0 ]; then
                echo "FAIL (Missing FFO/AFFO methods)"
                FAILED_STOCKS="${FAILED_STOCKS}${SYMBOL} - Missing FFO/AFFO methods\n"
                TOTAL_FAILED=$((TOTAL_FAILED + 1))
                REIT_FAILED=$((REIT_FAILED + 1))
                return 1
            fi
            ;;
    esac

    echo "PASS ($METHODS_COUNT methods) - ${TIME}s"
    TOTAL_PASSED=$((TOTAL_PASSED + 1))
    case $SECTOR in
        "Technology") TECH_PASSED=$((TECH_PASSED + 1)) ;;
        "Banks") BANK_PASSED=$((BANK_PASSED + 1)) ;;
        "REITs") REIT_PASSED=$((REIT_PASSED + 1)) ;;
        "Utilities") UTIL_PASSED=$((UTIL_PASSED + 1)) ;;
        "Healthcare") HEALTH_PASSED=$((HEALTH_PASSED + 1)) ;;
        "Consumer") CONS_PASSED=$((CONS_PASSED + 1)) ;;
        "Industrials") IND_PASSED=$((IND_PASSED + 1)) ;;
        "Energy") ENERGY_PASSED=$((ENERGY_PASSED + 1)) ;;
        "Materials") MAT_PASSED=$((MAT_PASSED + 1)) ;;
        "Communication") COMM_PASSED=$((COMM_PASSED + 1)) ;;
    esac
    return 0
}

echo "Starting sector validation..."
echo ""

# Technology (10 stocks)
echo "=== TECHNOLOGY ==="
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
echo ""

# Banks (10 stocks)
echo "=== BANKS ==="
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
echo ""

# REITs (10 stocks)
echo "=== REITs ==="
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
echo ""

# Utilities (10 stocks)
echo "=== UTILITIES ==="
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
echo ""

# Healthcare (10 stocks)
echo "=== HEALTHCARE ==="
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
echo ""

# Consumer (10 stocks)
echo "=== CONSUMER ==="
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
echo ""

# Industrials (10 stocks)
echo "=== INDUSTRIALS ==="
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
echo ""

# Energy (10 stocks)
echo "=== ENERGY ==="
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
echo ""

# Materials (10 stocks)
echo "=== MATERIALS ==="
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
echo ""

# Communication (10 stocks)
echo "=== COMMUNICATION ==="
test_stock "DIS" "Communication" 6
test_stock "CMCSA" "Communication" 6
test_stock "T" "Communication" 6
test_stock "VZ" "Communication" 6
test_stock "TMUS" "Communication" 6
test_stock "CHTR" "Communication" 6
test_stock "EA" "Communication" 6
echo ""

# Calculate statistics
echo "===================================="
echo "VALIDATION RESULTS"
echo "===================================="
echo ""

PASS_RATE=$(echo "scale=2; $TOTAL_PASSED * 100 / $TOTAL_TESTED" | bc)
AVG_TIME=$(echo "scale=3; $TOTAL_TIME / $TOTAL_TESTED" | bc)

echo "Overall Statistics:"
echo "  Total Tested: $TOTAL_TESTED"
echo "  Passed: $TOTAL_PASSED"
echo "  Failed: $TOTAL_FAILED"
echo "  Pass Rate: ${PASS_RATE}%"
echo "  Avg Response Time: ${AVG_TIME}s"
echo ""

echo "Results by Sector:"

if [ $TECH_TESTED -gt 0 ]; then
    TECH_RATE=$(echo "scale=2; $TECH_PASSED * 100 / $TECH_TESTED" | bc)
    echo "  Technology: $TECH_PASSED/$TECH_TESTED passed (${TECH_RATE}%)"
fi

if [ $BANK_TESTED -gt 0 ]; then
    BANK_RATE=$(echo "scale=2; $BANK_PASSED * 100 / $BANK_TESTED" | bc)
    echo "  Banks: $BANK_PASSED/$BANK_TESTED passed (${BANK_RATE}%)"
fi

if [ $REIT_TESTED -gt 0 ]; then
    REIT_RATE=$(echo "scale=2; $REIT_PASSED * 100 / $REIT_TESTED" | bc)
    echo "  REITs: $REIT_PASSED/$REIT_TESTED passed (${REIT_RATE}%)"
fi

if [ $UTIL_TESTED -gt 0 ]; then
    UTIL_RATE=$(echo "scale=2; $UTIL_PASSED * 100 / $UTIL_TESTED" | bc)
    echo "  Utilities: $UTIL_PASSED/$UTIL_TESTED passed (${UTIL_RATE}%)"
fi

if [ $HEALTH_TESTED -gt 0 ]; then
    HEALTH_RATE=$(echo "scale=2; $HEALTH_PASSED * 100 / $HEALTH_TESTED" | bc)
    echo "  Healthcare: $HEALTH_PASSED/$HEALTH_TESTED passed (${HEALTH_RATE}%)"
fi

if [ $CONS_TESTED -gt 0 ]; then
    CONS_RATE=$(echo "scale=2; $CONS_PASSED * 100 / $CONS_TESTED" | bc)
    echo "  Consumer: $CONS_PASSED/$CONS_TESTED passed (${CONS_RATE}%)"
fi

if [ $IND_TESTED -gt 0 ]; then
    IND_RATE=$(echo "scale=2; $IND_PASSED * 100 / $IND_TESTED" | bc)
    echo "  Industrials: $IND_PASSED/$IND_TESTED passed (${IND_RATE}%)"
fi

if [ $ENERGY_TESTED -gt 0 ]; then
    ENERGY_RATE=$(echo "scale=2; $ENERGY_PASSED * 100 / $ENERGY_TESTED" | bc)
    echo "  Energy: $ENERGY_PASSED/$ENERGY_TESTED passed (${ENERGY_RATE}%)"
fi

if [ $MAT_TESTED -gt 0 ]; then
    MAT_RATE=$(echo "scale=2; $MAT_PASSED * 100 / $MAT_TESTED" | bc)
    echo "  Materials: $MAT_PASSED/$MAT_TESTED passed (${MAT_RATE}%)"
fi

if [ $COMM_TESTED -gt 0 ]; then
    COMM_RATE=$(echo "scale=2; $COMM_PASSED * 100 / $COMM_TESTED" | bc)
    echo "  Communication: $COMM_PASSED/$COMM_TESTED passed (${COMM_RATE}%)"
fi

echo ""

if [ $TOTAL_FAILED -gt 0 ]; then
    echo "Failed Stocks:"
    echo -e "$FAILED_STOCKS"
    echo ""
fi

# Final verdict
echo "===================================="
if (( $(echo "$PASS_RATE >= 95" | bc -l) )); then
    echo "✓ VALIDATION PASSED (Pass rate: ${PASS_RATE}%)"
    EXIT_CODE=0
else
    echo "✗ VALIDATION FAILED (Pass rate: ${PASS_RATE}% < 95%)"
    EXIT_CODE=1
fi
echo "===================================="

exit $EXIT_CODE
