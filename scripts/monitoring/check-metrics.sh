#!/usr/bin/env bash

# check-metrics.sh - Consolidated metrics check for Alfalyzer monitoring
# Usage: ./check-metrics.sh [production|local]
# Purpose: Collect and analyze metrics for Phase 11 monitoring decisions

set -euo pipefail

# Configuration
ENV="${1:-production}"
if [[ "$ENV" == "production" ]]; then
    BASE_URL="https://128.140.45.28.sslip.io"
    API_URL="http://localhost:3001"
    REDIS_CMD="redis-cli --no-auth-warning -a alfalyzer2025redis"
else
    BASE_URL="http://localhost:3000"
    API_URL="http://localhost:3001"
    REDIS_CMD="redis-cli"
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print section headers
print_header() {
    echo -e "\n${BLUE}=== $1 ===${NC}"
}

# Function to evaluate metric against threshold
evaluate_metric() {
    local value=$1
    local threshold=$2
    local comparison=$3  # gt, lt, eq
    local label=$4

    case $comparison in
        gt)
            if (( $(echo "$value > $threshold" | bc -l) )); then
                echo -e "${GREEN}✓ $label: $value (> $threshold)${NC}"
                return 0
            else
                echo -e "${YELLOW}⚠ $label: $value (<= $threshold)${NC}"
                return 1
            fi
            ;;
        lt)
            if (( $(echo "$value < $threshold" | bc -l) )); then
                echo -e "${GREEN}✓ $label: $value (< $threshold)${NC}"
                return 0
            else
                echo -e "${YELLOW}⚠ $label: $value (>= $threshold)${NC}"
                return 1
            fi
            ;;
    esac
}

# Start metrics collection
echo "========================================="
echo "   ALFALYZER METRICS CHECK - Phase 11"
echo "========================================="
echo "Environment: $ENV"
echo "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"

# 1. Cache Hit Rate
print_header "CACHE HIT RATE"
if [[ "$ENV" == "production" ]]; then
    CACHE_STATS=$(curl -s "$BASE_URL/api/cache/status" 2>/dev/null || echo "{}")
else
    CACHE_STATS=$(curl -s "$API_URL/api/cache/status" 2>/dev/null || echo "{}")
fi

if [[ -n "$CACHE_STATS" ]] && [[ "$CACHE_STATS" != "{}" ]]; then
    HIT_RATE=$(echo "$CACHE_STATS" | jq -r '.cache.stats.hitRate // 0')
    CACHE_SIZE=$(echo "$CACHE_STATS" | jq -r '.cache.stats.cacheSize // 0')

    if [[ "$HIT_RATE" == "null" ]] || [[ "$HIT_RATE" == "0" ]]; then
        # Calculate from hits and misses if hitRate not available
        HITS=$(echo "$CACHE_STATS" | jq -r '.cache.stats.hit // 0')
        MISSES=$(echo "$CACHE_STATS" | jq -r '.cache.stats.miss // 0')
        TOTAL=$((HITS + MISSES))
        if [[ $TOTAL -gt 0 ]]; then
            HIT_RATE=$(echo "scale=2; $HITS * 100 / $TOTAL" | bc)
        else
            HIT_RATE=0
        fi
    fi

    evaluate_metric "$HIT_RATE" 80 gt "Hit Rate"
    echo "Cache Size: $CACHE_SIZE keys"
else
    echo -e "${RED}✗ Failed to fetch cache stats${NC}"
fi

# 2. API Calls per Minute
print_header "API CALLS/MINUTE"
if [[ "$ENV" == "production" ]]; then
    # SSH to production server for internal API call
    QUOTA_STATUS=$(ssh root@128.140.45.28 "curl -s localhost:3001/api/quota/status 2>/dev/null" || echo "{}")
else
    QUOTA_STATUS=$(curl -s "$API_URL/api/quota/status" 2>/dev/null || echo "{}")
fi

if [[ -n "$QUOTA_STATUS" ]] && [[ "$QUOTA_STATUS" != "{}" ]]; then
    # Try to parse new API shape; if fails, mark as unavailable
    FMP_CALLS=$(echo "$QUOTA_STATUS" | jq -r '.data.usage.fmp.lastMinute // empty' 2>/dev/null || true)
    if [[ -n "$FMP_CALLS" ]]; then
        REMAIN=$(echo "$QUOTA_STATUS" | jq -r '.data.usage.fmp.quotaRemaining.perMinute // empty' 2>/dev/null || true)
        if [[ -n "$REMAIN" ]]; then
            FMP_LIMIT=$(echo "$FMP_CALLS + $REMAIN" | bc)
        else
            FMP_LIMIT=300
        fi
        evaluate_metric "$FMP_CALLS" 220 lt "FMP Calls/min"
        echo "FMP Limit: $FMP_LIMIT calls/min"
        USAGE_PCT=$(echo "scale=2; $FMP_CALLS * 100 / $FMP_LIMIT" | bc)
        echo "Usage: ${USAGE_PCT}% of capacity"
    else
        echo -e "${YELLOW}⚠ Quota status not available (auth)${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Quota status not available (expected if /api/quota/status not implemented)${NC}"
fi

# 3. Worker Statistics
print_header "WORKER STATISTICS"
if [[ "$ENV" == "production" ]]; then
    WORKER_STATS=$(ssh root@128.140.45.28 "$REDIS_CMD GET worker:stats 2>/dev/null" || echo "{}")
else
    WORKER_STATS=$($REDIS_CMD GET worker:stats 2>/dev/null || echo "{}")
fi

if [[ -n "$WORKER_STATS" ]] && [[ "$WORKER_STATS" != "{}" ]]; then
    LAST_UPDATE=$(echo "$WORKER_STATS" | jq -r '.lastUpdate // "unknown"')
    UPDATED_COUNT=$(echo "$WORKER_STATS" | jq -r '.updatedCount // 0')
    API_CALLS=$(echo "$WORKER_STATS" | jq -r '.apiCalls // 0')
    SUCCESS_RATE=$(echo "$WORKER_STATS" | jq -r '.successRate // 0')

    echo "Last Update: $LAST_UPDATE"
    echo "Symbols Updated: $UPDATED_COUNT"
    echo "API Calls in Cycle: $API_CALLS"
    evaluate_metric "$SUCCESS_RATE" 90 gt "Success Rate"
else
    echo -e "${YELLOW}⚠ Worker stats not available in Redis${NC}"
fi

# 4. Current ENV Configuration
print_header "ACTIVE ENV CONFIGURATION"
if [[ "$ENV" == "production" ]]; then
    HOT_SET_SIZE=$(ssh root@128.140.45.28 "grep '^HOT_SET_SIZE=' '/home/teste 1/.env.production' | cut -d'=' -f2" 2>/dev/null || echo "not set")
    HOT_REFRESH=$(ssh root@128.140.45.28 "grep '^HOT_SET_REFRESH_SECONDS=' '/home/teste 1/.env.production' | cut -d'=' -f2" 2>/dev/null || echo "not set")
    BUDGET=$(ssh root@128.140.45.28 "grep '^QUOTES_CALLS_PER_MIN_BUDGET=' '/home/teste 1/.env.production' | cut -d'=' -f2" 2>/dev/null || echo "not set")
    WARM_SET=$(ssh root@128.140.45.28 "grep '^WARM_SET_SIZE=' '/home/teste 1/.env.production' | cut -d'=' -f2" 2>/dev/null || echo "not set")

    echo "HOT_SET_SIZE: $HOT_SET_SIZE"
    echo "HOT_SET_REFRESH_SECONDS: $HOT_REFRESH"
    echo "QUOTES_CALLS_PER_MIN_BUDGET: $BUDGET"
    echo "WARM_SET_SIZE: $WARM_SET (not active = expected)"
else
    echo "Local environment - check .env file manually"
fi

# 5. Latency Check (simplified)
print_header "RESPONSE LATENCY"
START_TIME=$(date +%s%N)
if curl -s "$BASE_URL/api/health" > /dev/null 2>&1; then
    END_TIME=$(date +%s%N)
    LATENCY=$((($END_TIME - $START_TIME) / 1000000))
    evaluate_metric "$LATENCY" 300 lt "Health Check Latency (ms)"
else
    echo -e "${RED}✗ Health check failed${NC}"
fi

# 6. System Recommendation
print_header "RECOMMENDATION"
ISSUES=0

# Check if we have metrics
if [[ "${HIT_RATE:-0}" != "0" ]]; then
    # Evaluate conditions for adjustment
    if (( $(echo "${HIT_RATE:-0} < 80" | bc -l) )); then
        echo -e "${YELLOW}→ Consider increasing HOT_SET_SIZE to 150${NC}"
        ((ISSUES++))
    fi

    if [[ "${FMP_CALLS:-0}" != "0" ]] && (( $(echo "${FMP_CALLS:-0} > 220" | bc -l) )); then
        echo -e "${YELLOW}→ Consider reducing HOT_SET_SIZE or increasing refresh interval${NC}"
        ((ISSUES++))
    fi
fi

if [[ $ISSUES -eq 0 ]]; then
    echo -e "${GREEN}✓ SYSTEM STABLE - No adjustments needed${NC}"
    if [[ "${WARM_SET:-not set}" == "not set" ]]; then
        echo -e "${BLUE}→ Consider activating warm set after 48h if stable${NC}"
    fi
else
    echo -e "${YELLOW}⚠ ADJUSTMENTS SUGGESTED - Review metrics above${NC}"
fi

# 7. Next Actions
print_header "NEXT SCHEDULED CHECK"
CURRENT_HOUR=$(date +%H)
CURRENT_DATE=$(date +%Y-%m-%d)

if [[ "$CURRENT_DATE" == "2025-09-26" ]]; then
    echo "T+24h check: 2025-09-27 ~14:00 UTC"
elif [[ "$CURRENT_DATE" == "2025-09-27" ]]; then
    echo "T+48h check: 2025-09-28 ~14:00 UTC (warm set decision)"
else
    echo "Monitoring period may be complete - check MONITORING_PLAN.md"
fi

echo ""
echo "========================================="
echo "For detailed analysis, see: docs/MONITORING_PLAN.md"
echo "========================================="
