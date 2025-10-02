#!/usr/bin/env bash

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
. "$SCRIPT_DIR/common.inc.sh"

BASE_URL=$(resolve_base_url "${1:-}")
SYMS=${SYMS:-"AAPL,MSFT,GOOGL"}
LOG_DIR=$(resolve_log_dir)
LOG_FILE="$LOG_DIR/check-batch-$(date +%Y%m%d).log"

# Headers (API key is required in production for /api/market-data/quotes/batch)
HDR=(-H 'Content-Type: application/json')
if [[ -n "${MARKET_DATA_API_KEY:-}" ]]; then
  HDR+=(-H "X-API-Key: ${MARKET_DATA_API_KEY}")
fi

BODY=$(printf '{"symbols":["%s"]}' "${SYMS//,/","}")

URL="$BASE_URL/api/market-data/quotes/batch"
JSON=$(curl -sS "${HDR[@]}" -d "$BODY" "$URL" || echo '{}')
read -r CODE TIME <<EOF
$(curl_metrics "$URL" "${HDR[@]}" -d "$BODY")
EOF
MS=$(awk -v t="$TIME" 'BEGIN{printf "%.0f", t*1000}')

COUNT=0
if command -v jq >/dev/null 2>&1; then
  COUNT=$(echo "$JSON" | jq -r '.quotes | length // 0')
else
  COUNT=$(echo "$JSON" | grep -o '"symbol"' | wc -l | tr -d ' ')
fi

REQ=$(awk -F, '{print NF}' <<<"$SYMS")
log_line "$LOG_FILE" "batch code=$CODE ms=$MS returned=$COUNT requested=$REQ url=$URL"

if [[ "$CODE" == "200" && "$COUNT" -ge 1 ]]; then
  ok "[BATCH] OK - $COUNT/${REQ} in ${MS}ms ($URL)"
elif [[ "$CODE" == "401" ]]; then
  warn "[BATCH] UNAUTHORIZED (set MARKET_DATA_API_KEY) code=$CODE in ${MS}ms ($URL)"
else
  fail "[BATCH] FAIL - code=$CODE returned=$COUNT in ${MS}ms ($URL)"
fi

