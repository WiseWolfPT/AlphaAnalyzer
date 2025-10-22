#!/bin/bash
# Test Extended Hours Badge Fix
# This script validates that the badge displays correctly based on market hours

set -e

BASE_URL="${1:-http://localhost:3001}"
SYMBOL="${2:-AAPL}"

echo "🧪 Testing Extended Hours Badge Fix"
echo "=================================="
echo "URL: $BASE_URL"
echo "Symbol: $SYMBOL"
echo ""

# Test 1: Fetch extended hours data
echo "📡 Test 1: Fetching extended hours data..."
RESPONSE=$(curl -s "$BASE_URL/api/market-data/extended-hours/$SYMBOL")

# Extract key fields
IS_EXTENDED=$(echo "$RESPONSE" | jq -r '.isExtendedHours')
CURRENT_SESSION=$(echo "$RESPONSE" | jq -r '.currentSession')
HAS_PREMARKET=$(echo "$RESPONSE" | jq -r '.preMarket != null')
HAS_AFTERHOURS=$(echo "$RESPONSE" | jq -r '.afterHours != null')

echo "Response received:"
echo "$RESPONSE" | jq '.'
echo ""

# Test 2: Validate badge display logic
echo "🔍 Test 2: Validating badge display logic..."
echo "  isExtendedHours: $IS_EXTENDED"
echo "  currentSession: $CURRENT_SESSION"
echo "  hasPreMarket: $HAS_PREMARKET"
echo "  hasAfterHours: $HAS_AFTERHOURS"
echo ""

# Determine expected badge behavior
SHOULD_SHOW_BADGE="false"
BADGE_TEXT="N/A"

if [ "$IS_EXTENDED" = "true" ]; then
    if [ "$HAS_PREMARKET" = "true" ] || [ "$HAS_AFTERHOURS" = "true" ]; then
        SHOULD_SHOW_BADGE="true"
        case "$CURRENT_SESSION" in
            "pre-market")
                BADGE_TEXT="Pre-Market"
                ;;
            "after-hours")
                BADGE_TEXT="After-Hours"
                ;;
            *)
                BADGE_TEXT="Closed"
                ;;
        esac
    fi
fi

echo "📊 Expected Badge Behavior:"
echo "  Should Show Badge: $SHOULD_SHOW_BADGE"
echo "  Badge Text: $BADGE_TEXT"
echo ""

# Test 3: Current time context
echo "🕐 Test 3: Current market context..."
CURRENT_HOUR=$(date -u +%H)
CURRENT_DAY=$(date -u +%u)  # 1=Monday, 7=Sunday

echo "  UTC Hour: $CURRENT_HOUR"
echo "  Day of Week: $CURRENT_DAY (1=Mon, 7=Sun)"

# Validate market hours logic
EXPECTED_SESSION="closed"
if [ "$CURRENT_DAY" -ge 1 ] && [ "$CURRENT_DAY" -le 5 ]; then
    if [ "$CURRENT_HOUR" -ge 8 ] && [ "$CURRENT_HOUR" -lt 13 ]; then
        EXPECTED_SESSION="pre-market"
    elif [ "$CURRENT_HOUR" -ge 13 ] && [ "$CURRENT_HOUR" -lt 20 ]; then
        EXPECTED_SESSION="regular"
    elif [ "$CURRENT_HOUR" -ge 20 ] && [ "$CURRENT_HOUR" -lt 24 ]; then
        EXPECTED_SESSION="after-hours"
    fi
fi

echo "  Expected Session: $EXPECTED_SESSION"
echo ""

# Test 4: Validation
echo "✅ Test 4: Validation Results..."

if [ "$CURRENT_SESSION" = "$EXPECTED_SESSION" ]; then
    echo "  ✓ Session detection is correct"
else
    echo "  ✗ Session detection mismatch!"
    echo "    Expected: $EXPECTED_SESSION"
    echo "    Actual: $CURRENT_SESSION"
    exit 1
fi

if [ "$EXPECTED_SESSION" = "regular" ] && [ "$IS_EXTENDED" = "false" ]; then
    echo "  ✓ Badge correctly hidden during regular hours"
elif [ "$EXPECTED_SESSION" = "pre-market" ] && [ "$IS_EXTENDED" = "true" ]; then
    echo "  ✓ Badge correctly shown during pre-market"
elif [ "$EXPECTED_SESSION" = "after-hours" ] && [ "$IS_EXTENDED" = "true" ]; then
    echo "  ✓ Badge correctly shown during after-hours"
elif [ "$EXPECTED_SESSION" = "closed" ] && [ "$IS_EXTENDED" = "false" ]; then
    echo "  ✓ Badge correctly hidden when market is closed"
else
    echo "  ✗ Badge behavior may be incorrect"
    exit 1
fi

echo ""
echo "🎉 All tests passed!"
echo ""
echo "📝 Frontend Validation Steps:"
echo "1. Navigate to: $BASE_URL (in browser)"
echo "2. Go to stock detail page for $SYMBOL"
echo "3. Verify badge behavior matches:"
echo "   - Should Show: $SHOULD_SHOW_BADGE"
echo "   - Badge Text: $BADGE_TEXT"
echo ""
echo "💡 Tip: The badge should ONLY show when:"
echo "   - isExtendedHours = true AND"
echo "   - (afterHours data OR preMarket data exists)"
