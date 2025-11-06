#!/bin/bash
# Check IV cache hit rate and key statistics

set -euo pipefail

REDIS_PASSWORD="${REDIS_PASSWORD:-alfalyzer2025redis}"
REDIS_HOST="${REDIS_HOST:-127.0.0.1}"
REDIS_PORT="${REDIS_PORT:-6379}"

echo "==================================="
echo "IV Cache Hit Rate Analysis"
echo "==================================="
echo "Timestamp: $(date)"
echo ""

# Get Redis stats
HITS=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" --no-auth-warning INFO stats | grep keyspace_hits | cut -d: -f2 | tr -d '\r')
MISSES=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" --no-auth-warning INFO stats | grep keyspace_misses | cut -d: -f2 | tr -d '\r')
TOTAL=$((HITS + MISSES))

if [ "$TOTAL" -eq 0 ]; then
  HIT_RATE=0
else
  HIT_RATE=$(echo "scale=2; ($HITS * 100) / $TOTAL" | bc)
fi

echo "Cache Performance:"
echo "  Hit Rate: ${HIT_RATE}%"
echo "  Hits: ${HITS}"
echo "  Misses: ${MISSES}"
echo "  Total: ${TOTAL}"
echo ""

# Check IV cache keys
IV_CHART_KEYS=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" --no-auth-warning KEYS 'iv:chart:*' | wc -l | tr -d ' ')
IV_CALCULATION_KEYS=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" --no-auth-warning KEYS 'iv:calculation:*' | wc -l | tr -d ' ')
TOTAL_IV_KEYS=$((IV_CHART_KEYS + IV_CALCULATION_KEYS))

echo "IV Cache Keys:"
echo "  Chart keys: ${IV_CHART_KEYS}"
echo "  Calculation keys: ${IV_CALCULATION_KEYS}"
echo "  Total IV keys: ${TOTAL_IV_KEYS}"
echo ""

# Memory usage
MEMORY_USED=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" --no-auth-warning INFO memory | grep used_memory_human | cut -d: -f2 | tr -d '\r')
echo "Memory Usage: ${MEMORY_USED}"
echo ""

# Status indicators
echo "==================================="
echo "Status Indicators:"
echo "==================================="

# Target: 75%+ hit rate
if (( $(echo "$HIT_RATE >= 75" | bc -l) )); then
  echo "✓ Hit rate GOOD (≥75%): ${HIT_RATE}%"
elif (( $(echo "$HIT_RATE >= 60" | bc -l) )); then
  echo "⚠️  Hit rate ACCEPTABLE (60-75%): ${HIT_RATE}%"
else
  echo "✗ Hit rate LOW (<60%): ${HIT_RATE}%"
fi

# Target: 100+ cached stocks
if [ "$IV_CHART_KEYS" -ge 100 ]; then
  echo "✓ Cached stocks GOOD (≥100): ${IV_CHART_KEYS}"
elif [ "$IV_CHART_KEYS" -ge 50 ]; then
  echo "⚠️  Cached stocks ACCEPTABLE (50-100): ${IV_CHART_KEYS}"
else
  echo "✗ Cached stocks LOW (<50): ${IV_CHART_KEYS}"
fi

# Capacity estimation
# Current: 42.93% hit rate = 525 users
# Formula: capacity = 525 * (hit_rate / 42.93)
ESTIMATED_CAPACITY=$(echo "scale=0; 525 * ($HIT_RATE / 42.93)" | bc)
echo ""
echo "Estimated Safe Capacity: ${ESTIMATED_CAPACITY} concurrent users"
echo ""

exit 0
