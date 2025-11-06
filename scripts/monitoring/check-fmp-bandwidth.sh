#!/bin/bash

# FMP Bandwidth Monitoring Script
# Checks current bandwidth usage and alerts if approaching limit
# Should run every hour via cron

set -euo pipefail

# Configuration
FMP_API_KEY="${FMP_API_KEY:-}"
BANDWIDTH_LIMIT_GB=20
WARNING_THRESHOLD_PERCENT=85  # Alert at 85%
CRITICAL_THRESHOLD_PERCENT=95 # Critical at 95%
LOG_FILE="/var/log/alfalyzer/monitoring/fmp-bandwidth.log"

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Create log directory if it doesn't exist
mkdir -p "$(dirname "$LOG_FILE")"

# Function to log with timestamp
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

# Check if API key is set
if [ -z "$FMP_API_KEY" ]; then
    log "ERROR: FMP_API_KEY not set"
    exit 1
fi

# Fetch bandwidth usage from FMP dashboard
# Note: You need to scrape this from FMP dashboard or use their API
# For now, we'll create a placeholder that you can integrate with FMP's actual endpoint

log "INFO: Checking FMP bandwidth usage..."

# Placeholder: Replace with actual FMP API call
# BANDWIDTH_USED_GB=$(curl -s "https://financialmodelingprep.com/api/v4/usage?apikey=$FMP_API_KEY" | jq -r '.bandwidthUsedGB')

# For demonstration, let's assume we can extract from dashboard
# In practice, you might need to:
# 1. Use FMP's usage API (if available)
# 2. Parse from dashboard screenshot/scraping
# 3. Manually update a config file daily

# TEMPORARY: Read from config file (update manually or via automation)
CONFIG_FILE="/home/teste 1/.fmp-bandwidth-current"
if [ -f "$CONFIG_FILE" ]; then
    BANDWIDTH_USED_GB=$(cat "$CONFIG_FILE")
else
    log "WARN: Bandwidth config file not found, assuming 19.81 GB"
    BANDWIDTH_USED_GB=19.81
fi

# Calculate percentage and daily budget
BANDWIDTH_USED_PERCENT=$(awk "BEGIN {printf \"%.2f\", ($BANDWIDTH_USED_GB / $BANDWIDTH_LIMIT_GB) * 100}")
DAILY_BUDGET_GB=$(awk "BEGIN {printf \"%.3f\", $BANDWIDTH_LIMIT_GB / 30}")
DAILY_USED_GB=$(awk "BEGIN {printf \"%.3f\", $BANDWIDTH_USED_GB / 30}")
DAILY_REMAINING_GB=$(awk "BEGIN {printf \"%.3f\", $DAILY_BUDGET_GB - $DAILY_USED_GB}")

# Log current status
log "INFO: Bandwidth Status:"
log "  Total Used: ${BANDWIDTH_USED_GB} GB / ${BANDWIDTH_LIMIT_GB} GB (${BANDWIDTH_USED_PERCENT}%)"
log "  Daily Budget: ${DAILY_BUDGET_GB} GB/day"
log "  Daily Used: ${DAILY_USED_GB} GB/day"
log "  Daily Remaining: ${DAILY_REMAINING_GB} GB/day"

# Check thresholds
if (( $(awk "BEGIN {print ($BANDWIDTH_USED_PERCENT >= $CRITICAL_THRESHOLD_PERCENT)}") )); then
    echo -e "${RED}🚨 CRITICAL: Bandwidth at ${BANDWIDTH_USED_PERCENT}%!${NC}"
    log "CRITICAL: Bandwidth usage at ${BANDWIDTH_USED_PERCENT}% (threshold: ${CRITICAL_THRESHOLD_PERCENT}%)"

    # Send alert (implement your alert mechanism)
    # Examples: email, Slack, Discord webhook, etc.
    # curl -X POST "https://hooks.slack.com/..." -d "{\"text\":\"🚨 FMP Bandwidth CRITICAL: ${BANDWIDTH_USED_PERCENT}%\"}"

    exit 2
elif (( $(awk "BEGIN {print ($BANDWIDTH_USED_PERCENT >= $WARNING_THRESHOLD_PERCENT)}") )); then
    echo -e "${YELLOW}⚠️  WARNING: Bandwidth at ${BANDWIDTH_USED_PERCENT}%${NC}"
    log "WARNING: Bandwidth usage at ${BANDWIDTH_USED_PERCENT}% (threshold: ${WARNING_THRESHOLD_PERCENT}%)"

    # Send warning
    # curl -X POST "https://hooks.slack.com/..." -d "{\"text\":\"⚠️ FMP Bandwidth WARNING: ${BANDWIDTH_USED_PERCENT}%\"}"

    exit 1
else
    echo -e "${GREEN}✅ OK: Bandwidth at ${BANDWIDTH_USED_PERCENT}%${NC}"
    log "OK: Bandwidth usage at ${BANDWIDTH_USED_PERCENT}%"
    exit 0
fi
