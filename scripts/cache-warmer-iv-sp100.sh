#!/bin/bash
# S&P 100 Intrinsic Value Cache Pre-Warmer
# Warms top 100 S&P stocks every 30 min during market hours
# Keeps cache fresh (24h TTL) and improves hit rate to 75%+

set -euo pipefail

# Configuration
TARGET_URL="${TARGET_URL:-http://localhost:3001}"
API_KEY="${MARKET_DATA_API_KEY:-}"
LOG_DIR="/var/log/alfalyzer/cache-warmer"
LOG_FILE="$LOG_DIR/iv-sp100-$(date +%Y%m%d).log"

# Create log directory
mkdir -p "$LOG_DIR" 2>/dev/null || {
  LOG_DIR="/Users/antoniofrancisco/Documents/teste 1/scripts/cache-warmer/logs"
  mkdir -p "$LOG_DIR"
  LOG_FILE="$LOG_DIR/iv-sp100-$(date +%Y%m%d).log"
}

# S&P 100 symbols (top 100 by market cap)
SP100_SYMBOLS=(
  # Mega-cap (>$1T)
  AAPL MSFT GOOGL AMZN NVDA

  # Large-cap ($200B-$1T)
  META TSLA BRK.B V JPM UNH WMT MA PG JNJ XOM HD
  AVGO CVX LLY MRK ABBV KO PEP COST TMO BAC CSCO
  ACN MCD ABT DHR NKE ADBE CRM DIS CMCSA VZ WFC

  # Mid-cap ($50B-$200B) - Popular
  INTC AMD QCOM NFLX TXN UNP PM BMY HON UPS AMGN
  SBUX RTX LOW INTU CAT GS BA CVS AXP DE SPGI NOW
  GILD MDLZ BLK PLD AMT SYK ISRG C MS SCHW ZTS
  LRCX ADI MMM AMAT REGN VRTX PGR TJX FISV MU

  # High-volume trading stocks
  IBM GE F ORCL PYPL USB GM T FDX SLB DUK SO EL
)

echo "[$(date)] Starting S&P 100 IV cache warming" | tee -a "$LOG_FILE"
echo "[$(date)] Target: ${TARGET_URL}" | tee -a "$LOG_FILE"
echo "[$(date)] Symbols: ${#SP100_SYMBOLS[@]}" | tee -a "$LOG_FILE"

SUCCESS_COUNT=0
FAIL_COUNT=0
START_TIME=$(date +%s)

# Warm each symbol
for symbol in "${SP100_SYMBOLS[@]}"; do
  # Call chart endpoint (caches all 19 methods at once)
  RESPONSE=$(curl -s -w "\n%{http_code}" \
    -H "X-API-Key: ${API_KEY}" \
    "${TARGET_URL}/api/iv/${symbol}/chart" 2>&1)

  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

  if [ "$HTTP_CODE" = "200" ]; then
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    echo "[$(date)] ✓ ${symbol} - cached" >> "$LOG_FILE"
  else
    FAIL_COUNT=$((FAIL_COUNT + 1))
    echo "[$(date)] ✗ ${symbol} - failed (HTTP ${HTTP_CODE})" >> "$LOG_FILE"
  fi

  # Rate limiting: 300 calls/min = 5 calls/sec
  # 100 symbols / 30 min = 3.33 symbols/min = safe
  sleep 0.5
done

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo "[$(date)] Warming complete" | tee -a "$LOG_FILE"
echo "[$(date)] Success: ${SUCCESS_COUNT}/${#SP100_SYMBOLS[@]}" | tee -a "$LOG_FILE"
echo "[$(date)] Failed: ${FAIL_COUNT}" | tee -a "$LOG_FILE"
echo "[$(date)] Duration: ${DURATION}s" | tee -a "$LOG_FILE"

# Alert if too many failures
if [ "$FAIL_COUNT" -gt 10 ]; then
  echo "[$(date)] ⚠️  HIGH FAILURE RATE: ${FAIL_COUNT} failures" | tee -a "$LOG_FILE"
  # TODO: Send alert (email, Slack, etc.)
fi

exit 0
