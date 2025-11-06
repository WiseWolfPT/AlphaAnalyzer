#!/bin/bash
# FASE 1 - Agent 3: Cache Warming Infrastructure Validation
# Post-fixes validation of cache coverage, data quality, and worker status

set -e

TARGET_URL="${TARGET_URL:-https://128.140.45.28.sslip.io}"
RESULTS_DIR="/Users/antoniofrancisco/Documents/teste 1/validation-results"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
SSH_HOST="root@128.140.45.28"

echo "=== FASE 1 Agent 3: Cache Warming Infrastructure Validation ==="
echo "Target: $TARGET_URL"
echo "Timestamp: $TIMESTAMP"
echo ""

mkdir -p "$RESULTS_DIR"

# 1. Get unique symbols from IV cache
echo "1. Analyzing cache coverage..."
CACHED_SYMBOLS=$(ssh $SSH_HOST "cd '/home/teste 1' && redis-cli -a alfalyzer2025redis KEYS 'iv:chart:*' 2>/dev/null | sed 's/iv:chart://' | sort -u")
CACHED_COUNT=$(echo "$CACHED_SYMBOLS" | grep -v '^$' | wc -l | tr -d ' ')
TOTAL_UNIVERSE=1493
COVERAGE_PCT=$(echo "scale=2; ($CACHED_COUNT / $TOTAL_UNIVERSE) * 100" | bc)

echo "   Cached stocks: $CACHED_COUNT / $TOTAL_UNIVERSE ($COVERAGE_PCT%)"

# 2. Sample 200 random stocks for data quality validation
echo "2. Sampling 200 stocks for data quality validation..."
SAMPLE_SYMBOLS=$(echo "$CACHED_SYMBOLS" | shuf | head -200)
SAMPLE_SIZE=$(echo "$SAMPLE_SYMBOLS" | wc -l | tr -d ' ')

VALID_COUNT=0
CORRUPTED_COUNT=0
ZERO_METHODS_COUNT=0

HEATMAP_CSV="$RESULTS_DIR/FASE1_AGENT3_CACHE_HEATMAP_REVALIDATION.csv"
echo "Symbol,Cached,Freshness,Methods Count,Data Quality,Last Updated" > "$HEATMAP_CSV"

for SYMBOL in $SAMPLE_SYMBOLS; do
    # Test IV chart endpoint (cache-only)
    RESPONSE=$(curl -s "$TARGET_URL/api/iv/$SYMBOL/chart?cache_only=true" 2>/dev/null || echo '{}')

    # Count available methods
    METHOD_COUNT=$(echo "$RESPONSE" | jq -r '.available_methods | length' 2>/dev/null || echo "0")

    # Check if all values are $0.00 (data quality issue)
    ZERO_VALUES=$(echo "$RESPONSE" | jq -r '.available_methods[] | select(.value == 0) | .id' 2>/dev/null | wc -l | tr -d ' ')

    # Determine data quality
    if [ "$METHOD_COUNT" = "0" ]; then
        DATA_QUALITY="EMPTY"
        ZERO_METHODS_COUNT=$((ZERO_METHODS_COUNT + 1))
    elif [ "$METHOD_COUNT" = "$ZERO_VALUES" ]; then
        DATA_QUALITY="CORRUPTED"
        CORRUPTED_COUNT=$((CORRUPTED_COUNT + 1))
    else
        DATA_QUALITY="VALID"
        VALID_COUNT=$((VALID_COUNT + 1))
    fi

    # Get cache TTL for freshness
    TTL=$(ssh $SSH_HOST "redis-cli -a alfalyzer2025redis TTL 'iv:chart:$SYMBOL' 2>/dev/null" || echo "0")
    if [ "$TTL" -gt 82800 ]; then
        FRESHNESS="HOT"
    elif [ "$TTL" -gt 43200 ]; then
        FRESHNESS="WARM"
    elif [ "$TTL" -gt 0 ]; then
        FRESHNESS="COLD"
    else
        FRESHNESS="STALE"
    fi

    # Add to heatmap
    LAST_UPDATED=$(date -u -r $(($(date +%s) - 86400 + TTL)) +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || echo "N/A")
    echo "$SYMBOL,YES,$FRESHNESS,$METHOD_COUNT,$DATA_QUALITY,$LAST_UPDATED" >> "$HEATMAP_CSV"
done

SUCCESS_RATE=$(echo "scale=2; ($VALID_COUNT / $SAMPLE_SIZE) * 100" | bc)

echo "   Sampled: $SAMPLE_SIZE stocks"
echo "   Valid: $VALID_COUNT ($SUCCESS_RATE%)"
echo "   Corrupted: $CORRUPTED_COUNT"
echo "   Empty: $ZERO_METHODS_COUNT"

# 3. Check worker status
echo "3. Checking worker status..."
WORKER_STATUS=$(ssh $SSH_HOST "pm2 jlist" 2>/dev/null)

# 4. Get bandwidth usage
echo "4. Checking bandwidth usage..."
BANDWIDTH_REPORT=$(curl -s "$TARGET_URL/api/monitoring/warming/overview" | jq -r '.data.bandwidth')
BANDWIDTH_USED=$(echo "$BANDWIDTH_REPORT" | jq -r '.dailyUsed' | sed 's/ MB//')
BANDWIDTH_BUDGET=682.67
BANDWIDTH_PCT=$(echo "scale=2; ($BANDWIDTH_USED / $BANDWIDTH_BUDGET) * 100" | bc)

echo "   Daily usage: ${BANDWIDTH_USED} MB / ${BANDWIDTH_BUDGET} MB ($BANDWIDTH_PCT%)"

# 5. Generate JSON results
RESULTS_JSON="$RESULTS_DIR/FASE1_AGENT3_CACHE_WARMING_REVALIDATION_RESULTS.json"
cat > "$RESULTS_JSON" <<EOF
{
  "timestamp": "$TIMESTAMP",
  "cache_coverage": {
    "total_universe": $TOTAL_UNIVERSE,
    "cached_stocks": $CACHED_COUNT,
    "coverage_pct": $COVERAGE_PCT,
    "baseline_coverage_pct": 44.4,
    "improvement": "$(echo "scale=2; $COVERAGE_PCT - 44.4" | bc)pp",
    "target": 90.0,
    "status": "$([ $(echo "$COVERAGE_PCT >= 90" | bc) -eq 1 ] && echo "PASS" || echo "FAIL")"
  },
  "data_quality": {
    "sampled": $SAMPLE_SIZE,
    "valid": $VALID_COUNT,
    "corrupted": $CORRUPTED_COUNT,
    "empty": $ZERO_METHODS_COUNT,
    "success_rate": $SUCCESS_RATE,
    "baseline_success_rate": 72.1,
    "improvement": "$(echo "scale=2; $SUCCESS_RATE - 72.1" | bc)pp"
  },
  "bandwidth": {
    "daily_budget_mb": $BANDWIDTH_BUDGET,
    "used_mb": $BANDWIDTH_USED,
    "used_pct": $BANDWIDTH_PCT,
    "status": "$([ $(echo "$BANDWIDTH_PCT < 85" | bc) -eq 1 ] && echo "OK" || echo "WARNING")"
  }
}
EOF

echo ""
echo "=== VALIDATION COMPLETE ==="
echo "Results saved to: $RESULTS_JSON"
echo "Heatmap saved to: $HEATMAP_CSV"
echo ""

# Determine GO/NO-GO
if [ $(echo "$COVERAGE_PCT >= 90" | bc) -eq 1 ] && [ $(echo "$SUCCESS_RATE >= 90" | bc) -eq 1 ]; then
    echo "✅ GO: Coverage and data quality meet requirements"
    exit 0
else
    echo "❌ NO-GO: Requirements not met (Coverage: ${COVERAGE_PCT}%, Quality: ${SUCCESS_RATE}%)"
    exit 1
fi
