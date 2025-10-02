#!/usr/bin/env bash

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
. "$SCRIPT_DIR/common.inc.sh"

BASE_URL=$(resolve_base_url "${1:-}")

export TARGET_URL="$BASE_URL"

ok "Running all monitors against $BASE_URL"

bash "$SCRIPT_DIR/check-health.sh" "$BASE_URL" || true
bash "$SCRIPT_DIR/check-cache.sh" "$BASE_URL" || true
bash "$SCRIPT_DIR/check-batch.sh" "$BASE_URL" || true
bash "$SCRIPT_DIR/check-slo.sh" "$BASE_URL" || true

ok "Monitoring run complete"

