#!/bin/bash
# ONDA 7: Intelligent Warming Worker Monitoring
#
# Real-time monitoring of warming worker with live updates
# Usage:
#   scripts/monitoring/watch-warming.sh [URL]
#
# Examples:
#   scripts/monitoring/watch-warming.sh                              # Localhost
#   scripts/monitoring/watch-warming.sh https://128.140.45.28.sslip.io  # Production

TARGET_URL="${1:-http://localhost:3001}"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  INTELLIGENT WARMING WORKER DASHBOARD"
echo "  Target: $TARGET_URL"
echo "  Refresh: Every 5 seconds (Ctrl+C to exit)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo "❌ Error: jq is required but not installed"
    echo "Install with: brew install jq (macOS) or apt install jq (Linux)"
    exit 1
fi

# Function to display overview
display_overview() {
    local OVERVIEW=$(curl -s "${TARGET_URL}/api/monitoring/warming/overview")

    if [ $? -ne 0 ] || [ -z "$OVERVIEW" ]; then
        echo "❌ Failed to fetch data from ${TARGET_URL}"
        return 1
    fi

    clear

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  INTELLIGENT WARMING WORKER DASHBOARD"
    echo "  $(date '+%Y-%m-%d %H:%M:%S')"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    # Cache Coverage
    echo "📊 CACHE COVERAGE"
    echo "────────────────────────────────────────────────────────────────────"
    echo "$OVERVIEW" | jq -r '
        .data.cache |
        "  Total Stocks:    \(.totalStocks)
  Cached Stocks:   \(.cachedStocks)
  Coverage:        \(.coveragePercent)%

  Hotness Distribution:
    🔥 Hot (<1h):     \(.hotness.hot)
    🟠 Warm (1-12h):  \(.hotness.warm)
    🔵 Cold (12-24h): \(.hotness.cold)
    ❄️  Stale (>24h):  \(.hotness.stale)"
    '
    echo ""

    # Bandwidth
    echo "📡 BANDWIDTH USAGE"
    echo "────────────────────────────────────────────────────────────────────"
    local BANDWIDTH_STATUS=$(echo "$OVERVIEW" | jq -r '.data.bandwidth.status')
    local STATUS_ICON="✅"

    if [ "$BANDWIDTH_STATUS" = "CRITICAL" ]; then
        STATUS_ICON="🚨"
    elif [ "$BANDWIDTH_STATUS" = "WARNING" ]; then
        STATUS_ICON="⚠️"
    elif [ "$BANDWIDTH_STATUS" = "CAUTION" ]; then
        STATUS_ICON="⚡"
    fi

    echo "$OVERVIEW" | jq -r --arg icon "$STATUS_ICON" '
        .data.bandwidth |
        "  Used:            \(.dailyUsed)
  Budget:          \(.dailyBudget)
  Percent Used:    \(.percentUsed)
  Status:          \($icon) \(.status)
  Projected EOD:   \(.projectedEOD)"
    '
    echo ""

    # API Calls
    echo "🔌 API CALLS"
    echo "────────────────────────────────────────────────────────────────────"
    echo "$OVERVIEW" | jq -r '
        .data.apiCalls |
        "  Today:           \(.today) calls
  Rate Limit:      \(.rateLimit)
  Budget Remaining: \(.budgetRemaining)"
    '
    echo ""

    # Workers
    echo "⚙️  WORKERS STATUS"
    echo "────────────────────────────────────────────────────────────────────"
    echo "$OVERVIEW" | jq -r '
        .data.workers |
        to_entries[] |
        "  \(.key | gsub("([A-Z])"; " \(.[0:1])") | .[0:1] |= ascii_upcase): \(
            if .value.status == "online" then "✅ Online"
            elif .value.status == "degraded" then "⚠️  Degraded"
            else "❌ Offline"
            end
        )"
    '
    echo ""

    # Warming Queue
    echo "📋 WARMING QUEUE"
    echo "────────────────────────────────────────────────────────────────────"
    echo "$OVERVIEW" | jq -r '
        .data.warmingQueue |
        "  Pending:         \(.pending)
  In Progress:     \(.inProgress)
  Completed Today: \(.completedToday)
  Avg Wait Time:   \(.avgWaitTime)
  Throughput:      \(.throughput)"
    '
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  Press Ctrl+C to exit | Updates every 5 seconds"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# Main loop
while true; do
    display_overview
    sleep 5
done
