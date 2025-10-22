#!/bin/bash
# FASE 2 - Daily Valuation Run Validator (server-side)
# Validates worker metrics, alarms, and cache invalidation after 06:00 UTC run
# Usage: run directly on the server (cron at 06:15 UTC)
set -euo pipefail

TS=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
BASE_DIR=$(cd "$SCRIPT_DIR/../.." && pwd)
LOG_DIR="$BASE_DIR/logs"
OUT="$LOG_DIR/daily-validation-$(date -u +%F).log"

mkdir -p "$LOG_DIR"

{
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📊 FASE 2 - Daily Valuation Run Validator (server-side)"
  echo "Timestamp (UTC): $TS"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  echo; echo "━━━ 1) DAILY Update Summary (last) ━━━"
  pm2 logs valuation-updater --lines 2000 --nostream | grep -n "DAILY Update Summary" -A 6 | tail -n 20 || true

  echo; echo "━━━ 2) Alarms ━━━"
  pm2 logs valuation-updater --lines 2000 --nostream | egrep -n "\[ALARM\]|METRICS BUG" | tail -n 50 || true

  echo; echo "━━━ 3) Cache Invalidation Signals ━━━"
  echo -n "DEL iv:calc:* mentions: "
  pm2 logs valuation-updater --lines 2000 --nostream | grep -c "iv:calc:" || true

  echo; echo "━━━ 4) Endpoint Spot-Checks ━━━"
  for s in AAPL MSFT GOOGL; do
    echo "Ticker $s:";
    curl -s http://127.0.0.1:3001/api/iv/$s/main | head -c 300; echo; echo "---";
  done

  echo; echo "━━━ 5) Metrics Consistency Check (parsed) ━━━"
  SUM=$(pm2 logs valuation-updater --lines 2000 --nostream | grep -n "DAILY Update Summary" -A 6 | tail -n 6)
  echo "$SUM"
  CT=$(echo "$SUM" | sed -nE 's/.*IVs Calculated: ([0-9]+)\/([0-9]+).*/\1 \2/p' | head -n1)
  CALC=$(echo "$CT" | awk '{print $1}')
  TOTAL=$(echo "$CT" | awk '{print $2}')
  FNUM=$(echo "$SUM" | sed -nE 's/.*IVs Failed: ([0-9]+).*/\1/p' | head -n1)
  NCNUM=$(echo "$SUM" | sed -nE 's/.*IVs Not Calculable: ([0-9]+).*/\1/p' | head -n1)
  [ -z "$FNUM" ] && FNUM=0
  [ -z "$NCNUM" ] && NCNUM=0
  FAILED=$(( FNUM + NCNUM ))
  echo "Parsed -> Calculated=${CALC:-0}, Failed+NC=${FAILED:-0}, Total=${TOTAL:-0}"

  echo; echo "━━━ 6) Result ━━━"
  if [ -n "${CALC:-}" ] && [ -n "${TOTAL:-}" ]; then
    if [ "$CALC" -ge 1 ] && [ "$TOTAL" -ge 1 ]; then
      if [ $((CALC+FAILED)) -eq "$TOTAL" ]; then
        RATE=$(awk -v c="$CALC" -v t="$TOTAL" 'BEGIN { if (t>0) printf "%.1f", (c/t)*100; else print "0.0" }')
        echo "✅ Metrics valid: $CALC + $FAILED = $TOTAL (Rate: $RATE%)"
      else
        echo "🔴 Metrics invalid: $CALC + $FAILED != $TOTAL"
      fi
    else
      echo "⚠️  Insufficient data to compute metrics"
    fi
  else
    echo "⚠️  Unable to parse metrics summary"
  fi

  echo; echo "Done."
} | tee -a "$OUT"
