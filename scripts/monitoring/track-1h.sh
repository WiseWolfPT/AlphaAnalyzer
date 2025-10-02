#!/usr/bin/env bash

# track-1h.sh — sample every minute for 60 minutes
# Collects: hit/miss/cacheSize, latency (ms), worker apiCalls/updatedCount
# Usage: ./track-1h.sh [production|local]

set -euo pipefail

ENV="${1:-production}"
if [[ "$ENV" == "production" ]]; then
  BASE_URL="https://128.140.45.28.sslip.io"
  API_URL="http://localhost:3001"
  REDIS_CMD="redis-cli -a alfalyzer2025redis"
else
  BASE_URL="http://localhost:3000"
  API_URL="http://localhost:3001"
  REDIS_CMD="redis-cli"
fi

LOG_DIR="scripts/monitoring/logs"
mkdir -p "$LOG_DIR"
STAMP=$(date +%Y%m%d%H%M%S)
LOG_FILE="$LOG_DIR/track-1h-$STAMP.log"

echo "=== TRACK 1H START $(date -Is) env=$ENV ===" | tee -a "$LOG_FILE"
LAT_TMP="$LOG_DIR/lat-$STAMP.tmp"
> "$LAT_TMP"

for i in $(seq 1 60); do
  TS=$(date -Is)

  # 1) Cache stats
  CACHE=$(curl -s --max-time 6 "$BASE_URL/api/cache/status" || echo '{}')
  HIT=$(echo "$CACHE" | jq -r '.cache.stats.hit // 0')
  MISS=$(echo "$CACHE" | jq -r '.cache.stats.miss // 0')
  SIZE=$(echo "$CACHE" | jq -r '.cache.stats.cacheSize // 0')
  if [[ "$HIT" != "0" || "$MISS" != "0" ]]; then
    RATE=$(echo "scale=2; ($HIT*100)/($HIT+$MISS)" | bc 2>/dev/null || echo 0)
  else
    RATE=0
  fi

  # 2) Latency samples (light + cache status)
  START=$(date +%s%3N)
  curl -s --max-time 6 "$BASE_URL/api/health/light" >/dev/null || true
  END=$(date +%s%3N)
  LAT=$((END-START))
  echo "$LAT" >> "$LAT_TMP"

  START2=$(date +%s%3N)
  curl -s --max-time 6 "$BASE_URL/api/cache/status" >/dev/null || true
  END2=$(date +%s%3N)
  LAT_CACHE=$((END2-START2))

  # Optional: sample quotes batch if API key available on server
  LAT_BATCH=NA
  if [[ -z "${MARKET_DATA_API_KEY:-}" ]]; then
    # Try to read from production env file
    if [[ -f "/home/teste 1/.env.production" ]]; then
      MARKET_DATA_API_KEY=$(grep -E '^MARKET_DATA_API_KEY=' "/home/teste 1/.env.production" | sed -E 's/^MARKET_DATA_API_KEY=//')
    fi
  fi
  if [[ -n "${MARKET_DATA_API_KEY:-}" ]]; then
    local_payload='{"symbols":["AAPL","MSFT","GOOGL"]}'
    START3=$(date +%s%3N)
    curl -s --max-time 6 -H "X-API-Key: ${MARKET_DATA_API_KEY}" -H 'Content-Type: application/json' -d "$local_payload" "$BASE_URL/api/market-data/quotes/batch" >/dev/null || true
    END3=$(date +%s%3N)
    LAT_BATCH=$((END3-START3))
  fi

  # 3) Worker stats (Redis)
  WJS=$($REDIS_CMD GET worker:stats 2>/dev/null || echo '{}')
  WUPD=$(echo "$WJS" | jq -r '.updatedCount // 0')
  WAPI=$(echo "$WJS" | jq -r '.apiCalls // 0')

  echo "$TS size=$SIZE hit=$HIT miss=$MISS rate=${RATE}% lat_ms=$LAT lat_cache_ms=$LAT_CACHE lat_batch_ms=$LAT_BATCH updated=$WUPD apiCalls=$WAPI" | tee -a "$LOG_FILE"

  sleep 60
done

# Compute percentiles and average
sort -n "$LAT_TMP" > "$LAT_TMP.sorted"
COUNT=$(wc -l < "$LAT_TMP.sorted" | tr -d ' ')

percentile() {
  local p=$1
  local n=$COUNT
  if [ "$n" -le 0 ]; then echo 0; return; fi
  # Nearest-rank method
  local idx=$(awk -v p="$p" -v n="$n" 'BEGIN{ i=int(p*n); if(i<1)i=1; if(i>n)i=n; print i }')
  sed -n "${idx}p" "$LAT_TMP.sorted"
}

P50=$(percentile 0.50)
P75=$(percentile 0.75)
P95=$(percentile 0.95)
P99=$(percentile 0.99)
AVG=$(awk '{s+=$1; n+=1} END { if(n>0) printf("%.2f", s/n); else print 0 }' "$LAT_TMP.sorted")

echo "=== SUMMARY $(date -Is) ===" | tee -a "$LOG_FILE"
echo "P50_ms=$P50 P75_ms=$P75 P95_ms=$P95 P99_ms=$P99 avg_ms=$AVG" | tee -a "$LOG_FILE"
echo "Log: $LOG_FILE" | tee -a "$LOG_FILE"

# Append top endpoints (local-only endpoint guarded by server)
TOP5=$(curl -s --max-time 6 "$API_URL/monitoring/usage/top-endpoints?limit=5&period=hour" || echo '{}')
echo "TopEndpoints=$(echo "$TOP5" | jq -c '.top // []')" | tee -a "$LOG_FILE"

# Append usage summary (total requests etc.)
SUMMARY=$(curl -s --max-time 6 "$API_URL/monitoring/usage/summary?period=hour" || echo '{}')
REQ_TOTAL=$(echo "$SUMMARY" | jq -r '.summary.totalRequests // 0')
REQ_SUCCESS=$(echo "$SUMMARY" | jq -r '.summary.successfulRequests // 0')
REQ_ERRORS=$(echo "$SUMMARY" | jq -r '.summary.errorRequests // 0')
REQ_AVG_MS=$(echo "$SUMMARY" | jq -r '.summary.averageResponseTime // 0')
echo "Requests total=$REQ_TOTAL success=$REQ_SUCCESS errors=$REQ_ERRORS avg_ms=$REQ_AVG_MS" | tee -a "$LOG_FILE"
