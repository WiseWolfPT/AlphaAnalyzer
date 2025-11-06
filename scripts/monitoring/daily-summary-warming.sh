#!/bin/bash
# ONDA 7: Daily Warming Worker Summary Report
#
# Generates comprehensive daily report of warming worker performance
# Run at midnight via cron: 0 0 * * * /path/to/daily-summary-warming.sh
#
# Usage:
#   scripts/monitoring/daily-summary-warming.sh [URL]
#
# Examples:
#   scripts/monitoring/daily-summary-warming.sh                              # Localhost
#   scripts/monitoring/daily-summary-warming.sh https://128.140.45.28.sslip.io  # Production

TARGET_URL="${1:-http://localhost:3001}"
LOG_DIR="${LOG_DIR:-/var/log/alfalyzer/monitoring}"
REPORT_DATE=$(date +%Y-%m-%d)
REPORT_FILE="${LOG_DIR}/warming-summary-${REPORT_DATE}.txt"

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR" 2>/dev/null || {
    # Fallback to local directory if /var/log/ is not writable
    LOG_DIR="./scripts/monitoring/logs"
    mkdir -p "$LOG_DIR"
    REPORT_FILE="${LOG_DIR}/warming-summary-${REPORT_DATE}.txt"
}

# Check dependencies
if ! command -v jq &> /dev/null; then
    echo "❌ Error: jq is required but not installed"
    exit 1
fi

if ! command -v curl &> /dev/null; then
    echo "❌ Error: curl is required but not installed"
    exit 1
fi

# Fetch data
echo "📊 Generating daily summary for ${REPORT_DATE}..."

OVERVIEW=$(curl -s "${TARGET_URL}/api/monitoring/warming/overview")
METHOD_COVERAGE=$(curl -s "${TARGET_URL}/api/monitoring/warming/method-coverage")
HEATMAP=$(curl -s "${TARGET_URL}/api/monitoring/warming/cache-heatmap?limit=20")
BANDWIDTH_HISTORY=$(curl -s "${TARGET_URL}/api/bandwidth/history")

# Check if data was fetched successfully
if [ $? -ne 0 ] || [ -z "$OVERVIEW" ]; then
    echo "❌ Failed to fetch data from ${TARGET_URL}"
    exit 1
fi

# Generate report
cat > "$REPORT_FILE" << EOF
╔══════════════════════════════════════════════════════════════════════════════╗
║                    ALFALYZER WARMING WORKER DAILY SUMMARY                    ║
║                             Date: ${REPORT_DATE}                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

Generated: $(date '+%Y-%m-%d %H:%M:%S %Z')
Target URL: ${TARGET_URL}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 CACHE COVERAGE SUMMARY

$(echo "$OVERVIEW" | jq -r '
    .data.cache |
    "Total Stocks:        \(.totalStocks)
Cached Stocks:       \(.cachedStocks)
Coverage Percentage: \(.coveragePercent)%

Cache Hotness Distribution:
  🔥 Hot (<1h):        \(.hotness.hot) stocks
  🟠 Warm (1-12h):     \(.hotness.warm) stocks
  🔵 Cold (12-24h):    \(.hotness.cold) stocks
  ❄️  Stale (>24h):     \(.hotness.stale) stocks"
')

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📡 BANDWIDTH USAGE

$(echo "$OVERVIEW" | jq -r '
    .data.bandwidth |
    "Daily Used:          \(.dailyUsed)
Daily Budget:        \(.dailyBudget)
Percent Used:        \(.percentUsed)
Status:              \(.status)
Projected EOD:       \(.projectedEOD)"
')

Last 7 Days Bandwidth:
$(echo "$BANDWIDTH_HISTORY" | jq -r '
    .data.history[] |
    "  \(.date): \(.usedMB) MB (\(.requests) requests)"
')

Total (7 days):      $(echo "$BANDWIDTH_HISTORY" | jq -r '.data.totalLast7Days')

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔌 API CALLS

$(echo "$OVERVIEW" | jq -r '
    .data.apiCalls |
    "Total Today:         \(.today) calls
Rate Limit:          \(.rateLimit)
Budget Remaining:    \(.budgetRemaining)"
')

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 WARMING QUEUE METRICS

$(echo "$OVERVIEW" | jq -r '
    .data.warmingQueue |
    "Pending Tasks:       \(.pending)
In Progress:         \(.inProgress)
Completed Today:     \(.completedToday)
Avg Wait Time:       \(.avgWaitTime)
Throughput:          \(.throughput)"
')

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚙️  WORKERS STATUS

$(echo "$OVERVIEW" | jq -r '
    .data.workers |
    to_entries[] |
    "  \(.key):
    Status:  \(.value.status)
    Uptime:  \(.value.uptime // "N/A") seconds
    Last Run: \(.value.lastRunAt // "N/A")
    "
')

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📈 COVERAGE BY VALUATION METHOD

$(echo "$METHOD_COVERAGE" | jq -r '
    def ljust(n): . + (" " * (n - length));
    def rjust(n): (" " * (n - length)) + .;
    .data[] |
    "\(.methodId | ljust(20)): \(.cachedStocks | tostring | rjust(5)) / \(.totalStocks) (\(.coveragePercent | rjust(6))%)"
')

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔥 TOP 20 CACHED STOCKS (Heatmap)

$(echo "$HEATMAP" | jq -r '
    def ljust(n): . + (" " * (n - length));
    .data[] |
    "\(.ticker | ljust(8)): \(.cachedMethods)/\(.totalMethods) methods (\(.coverage)% coverage)"
')

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 PERFORMANCE SUMMARY

Overall Health:      $(echo "$OVERVIEW" | jq -r '.data.bandwidth.status')
Cache Efficiency:    $(echo "$OVERVIEW" | jq -r '.data.cache.coveragePercent')%
Bandwidth Usage:     $(echo "$OVERVIEW" | jq -r '.data.bandwidth.percentUsed')
Worker Uptime:       $(echo "$OVERVIEW" | jq -r '.data.workers | to_entries | map(select(.value.status == "online")) | length') / $(echo "$OVERVIEW" | jq -r '.data.workers | length') online

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 RECOMMENDATIONS

$(echo "$OVERVIEW" | jq -r '
    .data |
    if (.bandwidth.percentUsed | tonumber) > 85 then
        "⚠️  Bandwidth usage high (\(.bandwidth.percentUsed)). Consider:
   - Reducing warming frequency
   - Implementing tiered warming (hot/warm/cold)
   - Review cache TTLs to maximize cache hits"
    elif (.bandwidth.percentUsed | tonumber) > 70 then
        "⚡ Bandwidth usage moderate (\(.bandwidth.percentUsed)). Monitor closely."
    else
        "✅ Bandwidth usage healthy (\(.bandwidth.percentUsed))"
    end
')"

$(echo "$OVERVIEW" | jq -r '
    .data.cache |
    if (.coveragePercent | tonumber) < 50 then
        "
⚠️  Cache coverage low (\(.coveragePercent)%). Consider:
   - Checking worker health
   - Reviewing queue processing speed
   - Verifying no blocked stocks"
    elif (.coveragePercent | tonumber) < 75 then
        "
⚡ Cache coverage moderate (\(.coveragePercent)%). Room for improvement."
    else
        "
✅ Cache coverage healthy (\(.coveragePercent)%)"
    end
')"

$(echo "$OVERVIEW" | jq -r '
    .data.workers |
    if (to_entries | map(select(.value.status != "online")) | length) > 0 then
        "
🚨 Workers offline: \(to_entries | map(select(.value.status != "online") | .key) | join(", "))
   Action: Check PM2 logs and restart if needed"
    else
        ""
    end
')"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

End of Report
EOF

# Display report
cat "$REPORT_FILE"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Daily summary saved to: $REPORT_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Optional: Email report (if configured)
if [ -n "$REPORT_EMAIL" ]; then
    if command -v mail &> /dev/null; then
        cat "$REPORT_FILE" | mail -s "Alfalyzer Warming Summary - ${REPORT_DATE}" "$REPORT_EMAIL"
        echo "📧 Report emailed to: $REPORT_EMAIL"
    fi
fi

exit 0
