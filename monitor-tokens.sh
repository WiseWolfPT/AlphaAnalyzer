#!/bin/bash

# Token Monitor for Cursor
# Shows real-time token usage

clear
echo "🤖 Cursor Token Monitor"
echo "Press Ctrl+C to exit"
echo ""

while true; do
    # Clear previous output
    tput cup 3 0
    tput ed
    
    # Get current time
    echo "🕐 Last updated: $(date '+%H:%M:%S')"
    echo ""
    
    # Show today's usage
    ccusage --today | grep -E "2025|Total" | tail -2
    
    # Wait 5 seconds
    sleep 5
done