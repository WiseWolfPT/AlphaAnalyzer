#!/usr/bin/env bash

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
. "$SCRIPT_DIR/common.inc.sh"

# Thresholds
P95_MS=${P95_MS:-200}
ERR_RATE_MAX=${ERR_RATE_MAX:-0.001}   # 0.1%
HIT_RATE_MIN=${HIT_RATE_MIN:-0.80}    # 80%
UPTIME_MIN=${UPTIME_MIN:-0.999}       # 99.9%
SAMPLES=${SAMPLES:-40}

BASE_URL=$(resolve_base_url "${1:-}")
LOG_DIR=$(resolve_log_dir)
RUN_ID=$(date +%Y%m%d-%H%M%S)
LOG_FILE="$LOG_DIR/slo-$RUN_ID.log"

ok "Running SLO checks against $BASE_URL"

# Collect latency and codes for endpoints
declare -a TIMES
declare -i ERR5XX=0
declare -i TOTAL=0

measure() {
  local url="$1"; shift
  for _ in $(seq 1 "$SAMPLES"); do
    read -r code time_total <<<"$(curl_metrics "$url" "$@")" || { code=599; time_total=10; }
    TOTAL=$((TOTAL+1))
    # seconds -> ms integer
    ms=$(awk -v t="$time_total" 'BEGIN{printf "%.0f", t*1000}')
    TIMES+=("$ms")
    if [[ "$code" =~ ^5 ]]; then ERR5XX=$((ERR5XX+1)); fi
  done
}

# Endpoints to sample (only include batch if API key provided)
measure "$BASE_URL/api/health"
measure "$BASE_URL/api/cache/status"
if [[ -n "${MARKET_DATA_API_KEY:-}" ]]; then
  HDR=(-H "X-API-Key: ${MARKET_DATA_API_KEY}" -H 'Content-Type: application/json' -d '{"symbols":["AAPL","MSFT","GOOGL"]}')
  for _ in $(seq 1 10); do
    read -r code time_total <<<"$(curl_metrics "$BASE_URL/api/market-data/quotes/batch" "${HDR[@]}")"
    TOTAL=$((TOTAL+1))
    ms=$(awk -v t="$time_total" 'BEGIN{printf "%.0f", t*1000}')
    TIMES+=("$ms")
    if [[ "$code" =~ ^5 ]]; then ERR5XX=$((ERR5XX+1)); fi
  done
fi

# Compute P95
P95=$(printf "%s\n" "${TIMES[@]}" | sort -n | percentile 95)
ERR_RATE=$(awk -v e="$ERR5XX" -v t="$TOTAL" 'BEGIN{printf "%.4f", (t>0? e/t : 0)}')

# Cache hit rate from status
JSON=$(curl_json "$BASE_URL/api/cache/status" || echo '{}')
if command -v jq >/dev/null 2>&1; then
  HIT=$(echo "$JSON" | jq -r '.cache.stats.hit // 0')
  MISS=$(echo "$JSON" | jq -r '.cache.stats.miss // 0')
else
  HIT=$(echo "$JSON" | grep -o '"hit"\s*:\s*[0-9]*' | head -1 | grep -o '[0-9]*' || echo 0)
  MISS=$(echo "$JSON" | grep -o '"miss"\s*:\s*[0-9]*' | head -1 | grep -o '[0-9]*' || echo 0)
fi
TOTAL_CACHE=$((HIT + MISS))
HIT_RATE=$(awk -v h="$HIT" -v t="$TOTAL_CACHE" 'BEGIN{printf "%.2f", (t>0? h/t : 0)}')

# Uptime approximation from rolling history of health checks
UP_LOG="$LOG_DIR/uptime.log"
read -r HCODE HTIME <<<"$(curl_metrics "$BASE_URL/api/health")"
HMS=$(awk -v t="$HTIME" 'BEGIN{printf "%.0f", t*1000}')
log_line "$UP_LOG" "health code=$HCODE ms=$HMS base=$BASE_URL"

UPTIME=0
if [[ -r "$UP_LOG" ]]; then
  # last 1000 entries
UPTIME=$(tail -n 1000 "$UP_LOG" | awk '{for(i=1;i<=NF;i++){if($i ~ /^code=/) {split($i,a,"="); if(a[2]==200) ok++ ; tot++}}} END{ if(tot>0) printf "%.4f", ok/tot; else print "0" }')
fi

# Log summary
log_line "$LOG_FILE" "p95_ms=$P95 err5xx=$ERR5XX total=$TOTAL err_rate=$ERR_RATE cache_hit=$HIT cache_miss=$MISS hit_rate=$HIT_RATE uptime=$UPTIME"

# Output formatted
if awk -v p="$P95" -v th="$P95_MS" 'BEGIN{exit !(p<=th)}'; then
  ok "[LATENCY] P95 ${P95}ms <= ${P95_MS}ms"
else
  fail "[LATENCY] P95 ${P95}ms > ${P95_MS}ms"
fi

if awk -v r="$ERR_RATE" -v th="$ERR_RATE_MAX" 'BEGIN{exit !(r<=th)}'; then
  ok "[ERROR RATE] $(awk -v r=$ERR_RATE 'BEGIN{printf "%.2f%%", r*100}') <= $(awk -v th=$ERR_RATE_MAX 'BEGIN{printf "%.2f%%", th*100}')"
else
  fail "[ERROR RATE] $(awk -v r=$ERR_RATE 'BEGIN{printf "%.2f%%", r*100}') > $(awk -v th=$ERR_RATE_MAX 'BEGIN{printf "%.2f%%", th*100}')"
fi

if (( TOTAL_CACHE == 0 )); then
  warn "[CACHE HIT] No traffic yet (hit=0 miss=0)"
elif awk -v r="$HIT_RATE" -v th="$HIT_RATE_MIN" 'BEGIN{exit !(r>=th)}'; then
  ok "[CACHE HIT] $(awk -v r=$HIT_RATE 'BEGIN{printf "%.0f%%", r*100}') >= $(awk -v th=$HIT_RATE_MIN 'BEGIN{printf "%.0f%%", th*100}')"
else
  fail "[CACHE HIT] $(awk -v r=$HIT_RATE 'BEGIN{printf "%.0f%%", r*100}') < $(awk -v th=$HIT_RATE_MIN 'BEGIN{printf "%.0f%%", th*100}')"
fi

if awk -v u="$UPTIME" -v th="$UPTIME_MIN" 'BEGIN{exit !(u>=th)}'; then
  ok "[UPTIME] $(awk -v u=$UPTIME 'BEGIN{printf "%.2f%%", u*100}') >= $(awk -v th=$UPTIME_MIN 'BEGIN{printf "%.2f%%", th*100}') (rolling)"
else
  warn "[UPTIME] $(awk -v u=$UPTIME 'BEGIN{printf "%.2f%%", u*100}') < $(awk -v th=$UPTIME_MIN 'BEGIN{printf "%.2f%%", th*100}') (insufficient history or degraded)"
fi
