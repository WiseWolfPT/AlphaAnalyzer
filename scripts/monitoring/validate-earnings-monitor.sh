#!/bin/bash
# Validate Earnings Monitor Worker
# Usage: ./scripts/monitoring/validate-earnings-monitor.sh

set -e

echo "======================================"
echo "Earnings Monitor Validation"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if running locally or on server
if [ "$1" == "--remote" ]; then
  SERVER="root@128.140.45.28"
  REMOTE_PATH="/home/teste 1"
  HEALTH_URL="http://localhost:3005/health"
  USE_SSH=true
  echo -e "${BLUE}Running validation on REMOTE server${NC}"
else
  USE_SSH=false
  echo -e "${BLUE}Running validation on LOCAL environment${NC}"
fi

echo ""

# Function to run command (local or remote)
run_cmd() {
  if [ "$USE_SSH" = true ]; then
    ssh "${SERVER}" "$1"
  else
    eval "$1"
  fi
}

# Test 1: Health Endpoint
echo -e "${YELLOW}[1/6]${NC} Testing health endpoint..."
if [ "$USE_SSH" = true ]; then
  HEALTH_RESPONSE=$(ssh "${SERVER}" "curl -s http://localhost:3005/health")
else
  HEALTH_RESPONSE=$(curl -s http://localhost:3005/health 2>/dev/null || echo "ERROR")
fi

if echo "$HEALTH_RESPONSE" | grep -q "healthy"; then
  echo -e "${GREEN}✅ Health endpoint responding${NC}"
  echo "$HEALTH_RESPONSE" | jq '.' 2>/dev/null || echo "$HEALTH_RESPONSE"
else
  echo -e "${RED}❌ Health endpoint not responding${NC}"
  echo "Response: $HEALTH_RESPONSE"
fi

echo ""

# Test 2: PM2 Process Status
echo -e "${YELLOW}[2/6]${NC} Checking PM2 process status..."
PM2_STATUS=$(run_cmd "pm2 list | grep earnings-monitor || echo 'NOT_FOUND'")

if echo "$PM2_STATUS" | grep -q "online"; then
  echo -e "${GREEN}✅ PM2 process running${NC}"
  echo "$PM2_STATUS"
elif echo "$PM2_STATUS" | grep -q "stopped"; then
  echo -e "${RED}❌ PM2 process stopped${NC}"
  echo "$PM2_STATUS"
else
  echo -e "${RED}❌ PM2 process not found${NC}"
  echo "Please start with: pm2 start ecosystem.config.cjs --only earnings-monitor"
fi

echo ""

# Test 3: Memory Usage
echo -e "${YELLOW}[3/6]${NC} Checking memory usage..."
MEMORY=$(run_cmd "pm2 describe earnings-monitor 2>/dev/null | grep memory || echo 'N/A'")
echo "$MEMORY"

if echo "$MEMORY" | grep -q "memory"; then
  echo -e "${GREEN}✅ Memory within limits${NC}"
else
  echo -e "${YELLOW}⚠️  Could not determine memory usage${NC}"
fi

echo ""

# Test 4: Recent Logs
echo -e "${YELLOW}[4/6]${NC} Checking recent logs (last 20 lines)..."
if [ "$USE_SSH" = true ]; then
  run_cmd "tail -20 '${REMOTE_PATH}/logs/earnings-monitor-out.log'" || echo "No logs found"
else
  tail -20 logs/earnings-monitor-out.log 2>/dev/null || echo "No logs found"
fi

echo ""

# Test 5: Bandwidth Usage
echo -e "${YELLOW}[5/6]${NC} Checking bandwidth usage..."
if [ "$USE_SSH" = true ]; then
  BANDWIDTH_LOGS=$(run_cmd "grep 'Bandwidth report' '${REMOTE_PATH}/logs/earnings-monitor-out.log' | tail -5" || echo "No bandwidth logs")
else
  BANDWIDTH_LOGS=$(grep "Bandwidth report" logs/earnings-monitor-out.log 2>/dev/null | tail -5 || echo "No bandwidth logs")
fi

if [ "$BANDWIDTH_LOGS" != "No bandwidth logs" ]; then
  echo -e "${GREEN}✅ Bandwidth tracking active${NC}"
  echo "$BANDWIDTH_LOGS"
else
  echo -e "${YELLOW}⚠️  No bandwidth logs found yet (worker may not have run a cycle)${NC}"
fi

echo ""

# Test 6: Last Cycle Statistics
echo -e "${YELLOW}[6/6]${NC} Checking last cycle statistics..."
if [ "$USE_SSH" = true ]; then
  CYCLE_STATS=$(ssh "${SERVER}" "curl -s http://localhost:3005/health | jq '.lastCycleStats'" 2>/dev/null)
else
  CYCLE_STATS=$(curl -s http://localhost:3005/health 2>/dev/null | jq '.lastCycleStats' 2>/dev/null)
fi

if [ "$CYCLE_STATS" != "null" ] && [ -n "$CYCLE_STATS" ]; then
  echo -e "${GREEN}✅ Last cycle completed${NC}"
  echo "$CYCLE_STATS"
else
  echo -e "${YELLOW}⚠️  No cycle statistics yet (worker starting up)${NC}"
fi

echo ""
echo -e "${GREEN}======================================"
echo "Validation Complete"
echo "======================================${NC}"
echo ""

# Summary
echo "Summary:"
if echo "$HEALTH_RESPONSE" | grep -q "healthy" && echo "$PM2_STATUS" | grep -q "online"; then
  echo -e "${GREEN}✅ Worker is healthy and running${NC}"
  echo ""
  echo "Monitor with:"
  if [ "$USE_SSH" = true ]; then
    echo "  ssh ${SERVER} 'pm2 logs earnings-monitor'"
  else
    echo "  pm2 logs earnings-monitor"
  fi
else
  echo -e "${RED}❌ Worker has issues - check logs above${NC}"
  echo ""
  echo "Troubleshoot:"
  if [ "$USE_SSH" = true ]; then
    echo "  ssh ${SERVER} 'pm2 logs earnings-monitor --err'"
    echo "  ssh ${SERVER} 'pm2 restart earnings-monitor'"
  else
    echo "  pm2 logs earnings-monitor --err"
    echo "  pm2 restart earnings-monitor"
  fi
fi

echo ""
