#!/bin/bash
# Full Universe Intrinsic Value Cache Initial Burst
# One-time burst to warm ALL ~1,493 Alfalyzer stocks with IV data
# After this, switch to event-driven warming (earnings calendar)
#
# Usage:
#   TARGET_URL=https://128.140.45.28.sslip.io scripts/cache-warmer-iv-full-universe-initial.sh
#   TARGET_URL=http://localhost:3001 scripts/cache-warmer-iv-full-universe-initial.sh --dry-run

set -euo pipefail

# ============================================================================
# CONFIGURATION
# ============================================================================

TARGET_URL="${TARGET_URL:-http://localhost:3001}"
API_KEY="${MARKET_DATA_API_KEY:-}"
LOG_DIR="/var/log/alfalyzer/cache-warmer"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="$LOG_DIR/iv-full-universe-${TIMESTAMP}.log"
PROGRESS_FILE="$LOG_DIR/iv-full-universe-progress.txt"

# Rate limiting (300 calls/min = 5 calls/sec max, we use 4 for safety)
CALLS_PER_SECOND=4
SLEEP_INTERVAL=$(echo "scale=3; 1 / $CALLS_PER_SECOND" | bc) # 0.25 seconds

# Dry run mode
DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
  echo "🔍 DRY RUN MODE - No API calls will be made"
fi

# ============================================================================
# LOGGING SETUP
# ============================================================================

# Create log directory
mkdir -p "$LOG_DIR" 2>/dev/null || {
  LOG_DIR="./scripts/cache-warmer/logs"
  mkdir -p "$LOG_DIR"
  LOG_FILE="$LOG_DIR/iv-full-universe-${TIMESTAMP}.log"
  PROGRESS_FILE="$LOG_DIR/iv-full-universe-progress.txt"
  echo "⚠️  Using local log directory: $LOG_DIR"
}

# Helper functions
log() {
  local level="$1"
  shift
  local msg="$*"
  local ts=$(date '+%Y-%m-%d %H:%M:%S')
  echo "[$ts] [$level] $msg" | tee -a "$LOG_FILE"
}

log_info() { log "INFO" "$@"; }
log_warn() { log "WARN" "$@"; }
log_error() { log "ERROR" "$@"; }
log_success() { log "✅" "$@"; }

# ============================================================================
# STOCK UNIVERSE LOADING
# ============================================================================

log_info "=========================================="
log_info "Full Universe IV Cache Warming - INITIAL BURST"
log_info "=========================================="
log_info "Target URL: ${TARGET_URL}"
log_info "Rate limit: ${CALLS_PER_SECOND} calls/sec (${SLEEP_INTERVAL}s sleep)"
log_info "Logs: ${LOG_FILE}"
log_info ""

# Load stock universe from PostgreSQL or fallback
log_info "Loading stock universe..."

STOCKS_FILE=$(mktemp)
trap "rm -f $STOCKS_FILE" EXIT

# Try to load from PostgreSQL first
if [[ -n "${PGHOST:-}" && -n "${PGDATABASE:-}" ]]; then
  log_info "Attempting to load from PostgreSQL (${PGHOST}:${PGPORT:-5432}/${PGDATABASE})"

  # Use psql if available
  if command -v psql &> /dev/null; then
    PGPASSWORD="${PGPASSWORD:-}" psql -h "${PGHOST}" -p "${PGPORT:-5432}" \
      -U "${PGUSER:-}" -d "${PGDATABASE}" -t -A -c \
      "SELECT DISTINCT UPPER(symbol) FROM stocks WHERE symbol IS NOT NULL AND TRIM(symbol) <> '' ORDER BY symbol LIMIT 2000;" \
      > "$STOCKS_FILE" 2>/dev/null || {
        log_warn "Failed to load from PostgreSQL via psql"
      }
  else
    log_warn "psql not found, cannot load from PostgreSQL"
  fi
fi

# Fallback: Load from environment variable
if [[ ! -s "$STOCKS_FILE" && -n "${SYMBOLS_UNIVERSE:-}" ]]; then
  log_info "Loading from SYMBOLS_UNIVERSE environment variable"
  echo "${SYMBOLS_UNIVERSE}" | tr ',' '\n' | grep -v '^$' | sort -u > "$STOCKS_FILE"
fi

# Final fallback: Hardcoded S&P 500 + Portuguese stocks
if [[ ! -s "$STOCKS_FILE" ]]; then
  log_warn "No universe source available, using hardcoded S&P 500 + Portuguese stocks"
  cat > "$STOCKS_FILE" <<'EOF'
GALP.LS
EDP.LS
JMT.LS
NOS.LS
ALTRI.LS
BCP.LS
CTT.LS
EGL.LS
REN.LS
SCP.LS
AAPL
MSFT
GOOGL
AMZN
NVDA
META
TSLA
BRK.B
JPM
JNJ
V
PG
UNH
HD
MA
DIS
BAC
ADBE
NFLX
CRM
CMCSA
XOM
CVX
PFE
ABBV
KO
TMO
CSCO
PEP
WMT
MRK
AVGO
LLY
VZ
INTC
DHR
ABT
ACN
NKE
ORCL
IBM
QCOM
TXN
AMD
NOW
INTU
PYPL
UPS
RTX
HON
CAT
LOW
SBUX
COST
MDT
BMY
AMGN
GILD
ISRG
SYK
TGT
BKNG
MAR
HLT
YUM
CMG
DPZ
LULU
COP
SLB
EOG
PXD
VLO
MPC
FCX
NEM
APD
LIN
ECL
SHW
DD
DOW
BA
GE
MMM
DE
FDX
NSC
UNP
WM
EMR
ETN
ITW
EOF
fi

# Load stocks into array (compatible with bash 3.x on macOS)
STOCKS=()
while IFS= read -r line; do
  [[ -n "$line" ]] && STOCKS+=("$line")
done < "$STOCKS_FILE"
TOTAL_STOCKS=${#STOCKS[@]}

log_info "Loaded ${TOTAL_STOCKS} stocks for warming"

if [[ $TOTAL_STOCKS -eq 0 ]]; then
  log_error "No stocks loaded! Cannot proceed."
  exit 1
fi

# ============================================================================
# BANDWIDTH ESTIMATION
# ============================================================================

# Estimate bandwidth (based on previous measurements)
# Average IV chart response: ~7.5 KB per stock
ESTIMATED_KB_PER_STOCK=8
ESTIMATED_TOTAL_MB=$(echo "scale=2; $TOTAL_STOCKS * $ESTIMATED_KB_PER_STOCK / 1024" | bc)
ESTIMATED_DURATION_MINUTES=$(echo "scale=0; $TOTAL_STOCKS / ($CALLS_PER_SECOND * 60)" | bc)

log_info ""
log_info "=========================================="
log_info "BURST ESTIMATION"
log_info "=========================================="
log_info "Total stocks: ${TOTAL_STOCKS}"
log_info "Rate: ${CALLS_PER_SECOND} calls/sec"
log_info "Estimated duration: ${ESTIMATED_DURATION_MINUTES} minutes (~$(echo "scale=1; $ESTIMATED_DURATION_MINUTES / 60" | bc) hours)"
log_info "Estimated bandwidth: ${ESTIMATED_TOTAL_MB} MB"
log_info "Cache TTL: 24 hours"
log_info "Expires: $(date -d '+24 hours' '+%Y-%m-%d %H:%M:%S %Z' 2>/dev/null || date -v+24H '+%Y-%m-%d %H:%M:%S %Z')"
log_info ""

# ============================================================================
# SAFETY CONFIRMATION
# ============================================================================

if [[ "$DRY_RUN" == "false" ]]; then
  log_warn "⚠️  This will make ${TOTAL_STOCKS} API calls over ~${ESTIMATED_DURATION_MINUTES} minutes"
  log_warn "⚠️  Estimated bandwidth: ${ESTIMATED_TOTAL_MB} MB"
  log_warn "⚠️  Press Ctrl+C within 10 seconds to cancel..."

  for i in {10..1}; do
    echo -n "$i... "
    sleep 1
  done
  echo ""
  log_info "Starting burst warm-up..."
else
  log_info "DRY RUN - Skipping confirmation"
fi

# ============================================================================
# BURST WARMING LOOP
# ============================================================================

SUCCESS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0
START_TIME=$(date +%s)
BANDWIDTH_BYTES=0

log_info ""
log_info "=========================================="
log_info "WARMING STARTED"
log_info "=========================================="

for i in "${!STOCKS[@]}"; do
  SYMBOL="${STOCKS[$i]}"
  INDEX=$((i + 1))
  PERCENT=$(echo "scale=1; $INDEX * 100 / $TOTAL_STOCKS" | bc)

  # Skip empty symbols
  if [[ -z "$SYMBOL" || "$SYMBOL" == " " ]]; then
    SKIP_COUNT=$((SKIP_COUNT + 1))
    continue
  fi

  # Show progress every 10 stocks or on first/last
  if [[ $((INDEX % 10)) -eq 0 || $INDEX -eq 1 || $INDEX -eq $TOTAL_STOCKS ]]; then
    ELAPSED=$(($(date +%s) - START_TIME))
    ELAPSED_MIN=$(echo "scale=1; $ELAPSED / 60" | bc)
    RATE=$(echo "scale=1; $INDEX / ($ELAPSED + 1)" | bc)
    ETA_SECONDS=$(echo "scale=0; ($TOTAL_STOCKS - $INDEX) / ($RATE + 0.001)" | bc)
    ETA_MIN=$(echo "scale=0; $ETA_SECONDS / 60" | bc)

    log_info "Progress: [$INDEX/$TOTAL_STOCKS] ${PERCENT}% | Success: $SUCCESS_COUNT | Failed: $FAIL_COUNT | Elapsed: ${ELAPSED_MIN}m | ETA: ${ETA_MIN}m"
  fi

  # Dry run mode - just count
  if [[ "$DRY_RUN" == "true" ]]; then
    if [[ $((INDEX % 50)) -eq 0 ]]; then
      echo "  [DRY RUN] Would warm: $SYMBOL"
    fi
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    sleep 0.01 # Fast iteration in dry run
    continue
  fi

  # Call IV chart endpoint (caches all 19 methods at once)
  RESPONSE=$(curl -s -w "\n%{http_code}\n%{size_download}" \
    -H "X-API-Key: ${API_KEY}" \
    "${TARGET_URL}/api/iv/${SYMBOL}/chart" 2>&1)

  HTTP_CODE=$(echo "$RESPONSE" | tail -n2 | head -n1)
  SIZE_BYTES=$(echo "$RESPONSE" | tail -n1)
  BANDWIDTH_BYTES=$((BANDWIDTH_BYTES + SIZE_BYTES))

  if [[ "$HTTP_CODE" == "200" ]]; then
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))

    # Log detailed success every 100 stocks
    if [[ $((SUCCESS_COUNT % 100)) -eq 0 ]]; then
      SIZE_KB=$(echo "scale=1; $SIZE_BYTES / 1024" | bc)
      log_success "[$INDEX/$TOTAL_STOCKS] ${SYMBOL} cached (${SIZE_KB} KB)"
    fi
  else
    FAIL_COUNT=$((FAIL_COUNT + 1))
    log_error "[$INDEX/$TOTAL_STOCKS] ${SYMBOL} failed (HTTP ${HTTP_CODE})"

    # Abort if too many consecutive failures (possible API issue)
    if [[ $FAIL_COUNT -gt 50 ]]; then
      log_error "Too many failures ($FAIL_COUNT) - aborting to prevent API spam"
      break
    fi
  fi

  # Save progress checkpoint every 50 stocks
  if [[ $((INDEX % 50)) -eq 0 ]]; then
    echo "$INDEX/$TOTAL_STOCKS" > "$PROGRESS_FILE"
  fi

  # Rate limiting sleep
  sleep "$SLEEP_INTERVAL"
done

# ============================================================================
# FINAL REPORT
# ============================================================================

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
DURATION_MIN=$(echo "scale=1; $DURATION / 60" | bc)
BANDWIDTH_MB=$(echo "scale=2; $BANDWIDTH_BYTES / 1024 / 1024" | bc)
SUCCESS_RATE=$(echo "scale=1; $SUCCESS_COUNT * 100 / $TOTAL_STOCKS" | bc)

log_info ""
log_info "=========================================="
log_info "WARMING COMPLETE"
log_info "=========================================="
log_info "Total stocks: ${TOTAL_STOCKS}"
log_info "Success: ${SUCCESS_COUNT} (${SUCCESS_RATE}%)"
log_info "Failed: ${FAIL_COUNT}"
log_info "Skipped: ${SKIP_COUNT}"
log_info "Duration: ${DURATION_MIN} minutes ($(echo "scale=1; $DURATION_MIN / 60" | bc) hours)"
log_info "Bandwidth used: ${BANDWIDTH_MB} MB"
log_info "Average per stock: $(echo "scale=2; $BANDWIDTH_MB * 1024 / $SUCCESS_COUNT" | bc) KB"
log_info "Cache TTL: 24 hours"
log_info "Cache expires: $(date -d '+24 hours' '+%Y-%m-%d %H:%M:%S %Z' 2>/dev/null || date -v+24H '+%Y-%m-%d %H:%M:%S %Z')"
log_info "=========================================="

# Alert if high failure rate
if [[ $FAIL_COUNT -gt $((TOTAL_STOCKS / 10)) ]]; then
  log_warn "⚠️  HIGH FAILURE RATE: ${FAIL_COUNT}/${TOTAL_STOCKS} failures (>10%)"
  log_warn "⚠️  Check API endpoint health: ${TARGET_URL}/api/health"
fi

# Success threshold
if [[ $SUCCESS_COUNT -ge $((TOTAL_STOCKS * 95 / 100)) ]]; then
  log_success "✅ Burst warming completed successfully (${SUCCESS_RATE}% success rate)"
  exit 0
elif [[ $SUCCESS_COUNT -ge $((TOTAL_STOCKS * 80 / 100)) ]]; then
  log_warn "⚠️  Burst warming completed with warnings (${SUCCESS_RATE}% success rate)"
  exit 0
else
  log_error "❌ Burst warming failed (${SUCCESS_RATE}% success rate is below 80% threshold)"
  exit 1
fi
