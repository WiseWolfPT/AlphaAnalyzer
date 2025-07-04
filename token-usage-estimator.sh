#!/bin/bash

# Token Usage Estimator for Claude conversations
# This script provides estimates based on typical usage patterns

echo "🤖 Claude Token Usage Estimator"
echo "================================"
echo ""

# Opus 4 model has different limits
echo "📊 Model: Claude Opus 4"
echo "📈 Current Usage (from Cursor): ~10,600 tokens"
echo ""

# Typical Claude conversation limits
echo "🎯 Token Limits:"
echo "   - Claude Opus/Sonnet: 200,000 tokens per conversation"
echo "   - Claude Haiku: 200,000 tokens per conversation"
echo "   - Claude Opus 4: Similar limits"
echo ""

# Calculate remaining estimate
CURRENT_USAGE=10600
MAX_TOKENS=200000
REMAINING=$((MAX_TOKENS - CURRENT_USAGE))
PERCENTAGE=$((CURRENT_USAGE * 100 / MAX_TOKENS))

echo "📊 Usage Statistics:"
echo "   - Used: $(printf "%'d" $CURRENT_USAGE) tokens (~$PERCENTAGE%)"
echo "   - Remaining: $(printf "%'d" $REMAINING) tokens"
echo "   - Total: $(printf "%'d" $MAX_TOKENS) tokens"
echo ""

# Rough estimates
echo "💡 Rough Estimates:"
echo "   - Average message: ~100-500 tokens"
echo "   - Code block: ~500-2000 tokens"
echo "   - Long response: ~1000-3000 tokens"
echo ""

# Visual progress bar
echo -n "Progress: ["
PROGRESS=$((PERCENTAGE / 2))
for i in $(seq 1 50); do
    if [ $i -le $PROGRESS ]; then
        echo -n "="
    else
        echo -n " "
    fi
done
echo "] $PERCENTAGE%"
echo ""

echo "⚠️  Note: These are estimates. Actual limits may vary."
echo "💡 Tip: Start a new conversation if approaching limits."