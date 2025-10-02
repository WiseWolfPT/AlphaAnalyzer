#!/usr/bin/env bash

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
. "$SCRIPT_DIR/common.inc.sh"

BASE_URL=$(resolve_base_url "${1:-}")
LOG_DIR=$(resolve_log_dir)
LOG_FILE="$LOG_DIR/check-health-$(date +%Y%m%d).log"

read -r CODE TIME <<EOF
$(curl_metrics "$BASE_URL/api/health")
EOF

MS=$(awk -v t="$TIME" 'BEGIN{printf "%.0f", t*1000}')

STATUS="FAIL"; COLOR=fail
if [[ "$CODE" == "200" ]]; then
  STATUS="OK"; COLOR=ok
fi

log_line "$LOG_FILE" "health code=$CODE ms=$MS url=$BASE_URL/api/health"

if [[ "$STATUS" == "OK" ]]; then
  $COLOR "[HEALTH] OK - $CODE in ${MS}ms ($BASE_URL)"
else
  $COLOR "[HEALTH] FAIL - $CODE in ${MS}ms ($BASE_URL)"
fi

