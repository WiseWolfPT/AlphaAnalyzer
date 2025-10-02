#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../.."  # repo root

set -a
source ./.env.production
set +a

LOG_DIR="scripts/monitoring/logs"
mkdir -p "$LOG_DIR"
STAMP=$(date +%Y%m%d%H%M%S)
LOG_FILE="$LOG_DIR/universe-light-$STAMP.log"

echo "=== LIGHT UNIVERSE REFRESH $(date -Is) ===" | tee -a "$LOG_FILE"

BEFORE=$(node scripts/server/get-stocks-count.mjs || echo 0)
echo "before_count=$BEFORE" | tee -a "$LOG_FILE"

# Fetch only extra (AMEX/Euronext)
node scripts/server/fetch-extra-from-fmp.mjs | tee -a "$LOG_FILE" || true
node scripts/server/seed-universe-from-files.mjs | tee -a "$LOG_FILE"

AFTER=$(node scripts/server/get-stocks-count.mjs || echo 0)
echo "after_count=$AFTER" | tee -a "$LOG_FILE"

DELTA=$(( AFTER>BEFORE ? AFTER-BEFORE : BEFORE-AFTER ))
if [[ "$BEFORE" -gt 0 ]]; then
  PCT=$(python3 - "$BEFORE" "$AFTER" <<'PY'
import sys
before=int(sys.argv[1]); after=int(sys.argv[2])
delta=abs(after-before)/before*100 if before>0 else 0
print(f"{delta:.2f}")
PY
)
else
  PCT=0
fi
echo "delta_abs=$DELTA delta_pct=$PCT%" | tee -a "$LOG_FILE"

# Very small threshold for light refresh (2%)
THRESH=${UNIVERSE_LIGHT_DELTA_THRESHOLD_PERCENT:-2}
awk -v p="$PCT" -v th="$THRESH" 'BEGIN{ if (p>th) exit 1; else exit 0 }' || {
  echo "WARN: Delta $PCT% > $THRESH% — skipping worker restart" | tee -a "$LOG_FILE"
  exit 0
}

pm2 restart price-worker --update-env | tee -a "$LOG_FILE"
echo "Done." | tee -a "$LOG_FILE"

