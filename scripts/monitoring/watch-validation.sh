#!/bin/bash

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  VALIDATION PROGRESS MONITOR"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

LATEST_LOG=$(ssh root@128.140.45.28 "ls -t /tmp/validation-final-post-rate-limit-fix-*.log 2>/dev/null | head -1")

if [ -z "$LATEST_LOG" ]; then
  echo "❌ No validation log found"
  exit 1
fi

echo "Log file: $LATEST_LOG"
echo ""

# Monitor in real-time
ssh root@128.140.45.28 "tail -f $LATEST_LOG" | while read line; do
  # Highlight progress lines
  if echo "$line" | grep -q "Progress:"; then
    echo -e "\033[1;32m$line\033[0m"
  # Highlight checkpoint lines
  elif echo "$line" | grep -q "Checkpoint saved"; then
    echo -e "\033[1;34m$line\033[0m"
  # Highlight errors
  elif echo "$line" | grep -qE "(Error|FAIL|429)"; then
    echo -e "\033[1;31m$line\033[0m"
  # Regular output
  else
    echo "$line"
  fi
done
