#!/usr/bin/env bash

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
. "$SCRIPT_DIR/common.inc.sh"

# Base URL
BASE_URL=$(resolve_base_url "${1:-}")

# Load env (for API key) if present
if [[ -f "$(dirname "$SCRIPT_DIR")/../.env" ]]; then
  # attempt to source repo-root .env (relative two directories up)
  set +u
  source "$(dirname "$SCRIPT_DIR")/../.env" 2>/dev/null || true
  set -u
elif [[ -f ".env" ]]; then
  set +u
  source .env 2>/dev/null || true
  set -u
fi

LOG_DIR=$(resolve_log_dir)
LOG_FILE="$LOG_DIR/smoke-quick-$(date +%Y%m%d).log"

ok "Running quick smoke against $BASE_URL"

# 1) Health
read -r HC HT <<<"$(curl_metrics "$BASE_URL/api/health")"
HMS=$(awk -v t="$HT" 'BEGIN{printf "%.0f", t*1000}')
log_line "$LOG_FILE" "health code=$HC ms=$HMS"
if [[ "$HC" == "200" ]]; then ok "[HEALTH] 200 in ${HMS}ms"; else fail "[HEALTH] $HC in ${HMS}ms"; fi

# 2) Cache status
read -r CC CT <<<"$(curl_metrics "$BASE_URL/api/cache/status")"
CMS=$(awk -v t="$CT" 'BEGIN{printf "%.0f", t*1000}')
log_line "$LOG_FILE" "cache code=$CC ms=$CMS"
if [[ "$CC" == "200" ]]; then ok "[CACHE] 200 in ${CMS}ms"; else fail "[CACHE] $CC in ${CMS}ms"; fi

# 3) Admin auth (expect 401/403 unauthenticated)
read -r AC AT <<<"$(curl_metrics "$BASE_URL/api/admin/system-stats")"
AMS=$(awk -v t="$AT" 'BEGIN{printf "%.0f", t*1000}')
log_line "$LOG_FILE" "admin code=$AC ms=$AMS"
if [[ "$AC" == "401" || "$AC" == "403" ]]; then ok "[ADMIN] protected ($AC) in ${AMS}ms"; else fail "[ADMIN] unexpected $AC in ${AMS}ms"; fi

# 4) Batch quotes
HDR=(-H 'Content-Type: application/json')
if [[ -n "${MARKET_DATA_API_KEY:-}" ]]; then HDR+=(-H "X-API-Key: ${MARKET_DATA_API_KEY}"); fi
BODY='{"symbols":["AAPL","MSFT","GOOGL"]}'
read -r BC BT <<<"$(curl_metrics "$BASE_URL/api/market-data/quotes/batch" "${HDR[@]}" -d "$BODY")"
BMS=$(awk -v t="$BT" 'BEGIN{printf "%.0f", t*1000}')
log_line "$LOG_FILE" "batch code=$BC ms=$BMS"
if [[ -n "${MARKET_DATA_API_KEY:-}" ]]; then
  [[ "$BC" == "200" ]] && ok "[BATCH] 200 in ${BMS}ms" || fail "[BATCH] $BC in ${BMS}ms"
else
  if [[ "$BC" == "401" || "$BC" == "403" ]]; then ok "[BATCH] protected ($BC) in ${BMS}ms"; else warn "[BATCH] unexpected $BC in ${BMS}ms"; fi
fi

# 5) Front page
read -r IC IT <<<"$(curl_metrics "$BASE_URL/")"
IMS=$(awk -v t="$IT" 'BEGIN{printf "%.0f", t*1000}')
log_line "$LOG_FILE" "index code=$IC ms=$IMS"
if [[ "$IC" == "200" ]]; then ok "[INDEX] 200 in ${IMS}ms"; else fail "[INDEX] $IC in ${IMS}ms"; fi

ok "Smoke complete"

