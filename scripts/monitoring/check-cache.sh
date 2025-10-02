#!/usr/bin/env bash

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
. "$SCRIPT_DIR/common.inc.sh"

BASE_URL=$(resolve_base_url "${1:-}")
LOG_DIR=$(resolve_log_dir)
LOG_FILE="$LOG_DIR/check-cache-$(date +%Y%m%d).log"

# Fetch cache status JSON and measure timing
JSON=$(curl_json "$BASE_URL/api/cache/status") || JSON='{}'
read -r CODE TIME <<EOF
$(curl_metrics "$BASE_URL/api/cache/status")
EOF
MS=$(awk -v t="$TIME" 'BEGIN{printf "%.0f", t*1000}')

# Parse with jq if available
if command -v jq >/dev/null 2>&1; then
  HIT=$(echo "$JSON" | jq -r '.cache.stats.hit // 0')
  MISS=$(echo "$JSON" | jq -r '.cache.stats.miss // 0')
  SIZE=$(echo "$JSON" | jq -r '.cache.stats.cacheSize // 0')
else
  # Fallback: best-effort regex parsing
  HIT=$(echo "$JSON" | grep -o '"hit"\s*:\s*[0-9]*' | head -1 | grep -o '[0-9]*' || echo 0)
  MISS=$(echo "$JSON" | grep -o '"miss"\s*:\s*[0-9]*' | head -1 | grep -o '[0-9]*' || echo 0)
  SIZE=$(echo "$JSON" | grep -o '"cacheSize"\s*:\s*[0-9]*' | head -1 | grep -o '[0-9]*' || echo 0)
fi

TOTAL=$(( HIT + MISS ))
RATE=0
if [[ $TOTAL -gt 0 ]]; then
  RATE=$(awk -v h="$HIT" -v t="$TOTAL" 'BEGIN{printf "%.2f", (t>0? h/t : 0)}')
fi

log_line "$LOG_FILE" "cache code=$CODE ms=$MS size=$SIZE hit=$HIT miss=$MISS rate=$RATE url=$BASE_URL/api/cache/status"

if [[ "$CODE" == "200" ]]; then
  if (( TOTAL == 0 )); then
    warn "[CACHE] OK (no traffic yet) size=$SIZE rate=-- ms=${MS} ($BASE_URL)"
  elif awk -v r="$RATE" 'BEGIN{exit !(r>=0.80)}'; then
    ok "[CACHE] OK size=$SIZE hitRate=$(awk -v r=$RATE 'BEGIN{printf "%.0f%%", r*100}') ms=${MS} ($BASE_URL)"
  else
    warn "[CACHE] WARN size=$SIZE hitRate=$(awk -v r=$RATE 'BEGIN{printf "%.0f%%", r*100}') ms=${MS} ($BASE_URL)"
  fi
else
  fail "[CACHE] FAIL code=$CODE ms=${MS} ($BASE_URL)"
fi

