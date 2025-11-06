#!/bin/bash
# Validate cache warmer setup and performance

set -euo pipefail

echo "========================================="
echo "Cache Warmer Validation Script"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
REDIS_PASSWORD="${REDIS_PASSWORD:-alfalyzer2025redis}"
TARGET_URL="${TARGET_URL:-http://localhost:3001}"

# Check 1: Scripts exist and are executable
echo "1. Checking script files..."
if [ -x "scripts/cache-warmer-iv-sp100.sh" ]; then
  echo -e "${GREEN}✓${NC} cache-warmer-iv-sp100.sh exists and is executable"
else
  echo -e "${RED}✗${NC} cache-warmer-iv-sp100.sh not found or not executable"
  exit 1
fi

if [ -x "scripts/monitoring/check-iv-cache-hit-rate.sh" ]; then
  echo -e "${GREEN}✓${NC} check-iv-cache-hit-rate.sh exists and is executable"
else
  echo -e "${RED}✗${NC} check-iv-cache-hit-rate.sh not found or not executable"
  exit 1
fi
echo ""

# Check 2: Redis connectivity
echo "2. Checking Redis connectivity..."
if redis-cli -a "$REDIS_PASSWORD" --no-auth-warning PING > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC} Redis is responding"
else
  echo -e "${RED}✗${NC} Redis connection failed"
  exit 1
fi
echo ""

# Check 3: Environment variables
echo "3. Checking environment variables..."
if [ -n "${MARKET_DATA_API_KEY:-}" ]; then
  echo -e "${GREEN}✓${NC} MARKET_DATA_API_KEY is set"
else
  echo -e "${YELLOW}⚠${NC}  MARKET_DATA_API_KEY not set (required for warming)"
fi

if [ -n "${TARGET_URL:-}" ]; then
  echo -e "${GREEN}✓${NC} TARGET_URL is set: $TARGET_URL"
else
  echo -e "${YELLOW}⚠${NC}  TARGET_URL not set (using default: http://localhost:3001)"
fi
echo ""

# Check 4: Backend health
echo "4. Checking backend health..."
HEALTH_RESPONSE=$(curl -s "${TARGET_URL}/api/health" || echo "failed")
if echo "$HEALTH_RESPONSE" | grep -q "ok"; then
  echo -e "${GREEN}✓${NC} Backend is healthy"
else
  echo -e "${RED}✗${NC} Backend health check failed"
  echo "Response: $HEALTH_RESPONSE"
  exit 1
fi
echo ""

# Check 5: IV endpoint availability
echo "5. Checking IV endpoint..."
if [ -n "${MARKET_DATA_API_KEY:-}" ]; then
  IV_RESPONSE=$(curl -s -w "\n%{http_code}" \
    -H "X-API-Key: ${MARKET_DATA_API_KEY}" \
    "${TARGET_URL}/api/iv/AAPL/chart" 2>&1)

  HTTP_CODE=$(echo "$IV_RESPONSE" | tail -n1)

  if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓${NC} IV endpoint is working (HTTP 200)"
  else
    echo -e "${RED}✗${NC} IV endpoint failed (HTTP ${HTTP_CODE})"
  fi
else
  echo -e "${YELLOW}⚠${NC}  Skipping IV endpoint test (no API key)"
fi
echo ""

# Check 6: Current cache stats
echo "6. Current cache statistics..."
HITS=$(redis-cli -a "$REDIS_PASSWORD" --no-auth-warning INFO stats | grep keyspace_hits | cut -d: -f2 | tr -d '\r')
MISSES=$(redis-cli -a "$REDIS_PASSWORD" --no-auth-warning INFO stats | grep keyspace_misses | cut -d: -f2 | tr -d '\r')
TOTAL=$((HITS + MISSES))

if [ "$TOTAL" -gt 0 ]; then
  HIT_RATE=$(echo "scale=2; ($HITS * 100) / $TOTAL" | bc)
  echo "  Hit Rate: ${HIT_RATE}%"

  if (( $(echo "$HIT_RATE >= 75" | bc -l) )); then
    echo -e "  ${GREEN}✓${NC} Hit rate is GOOD (≥75%)"
  elif (( $(echo "$HIT_RATE >= 60" | bc -l) )); then
    echo -e "  ${YELLOW}⚠${NC}  Hit rate is ACCEPTABLE (60-75%)"
  else
    echo -e "  ${YELLOW}⚠${NC}  Hit rate is LOW (<60%) - warming will help!"
  fi
else
  echo -e "  ${YELLOW}⚠${NC}  No cache statistics yet (Redis freshly started)"
fi

IV_KEYS=$(redis-cli -a "$REDIS_PASSWORD" --no-auth-warning KEYS 'iv:chart:*' | wc -l | tr -d ' ')
echo "  IV Chart Keys: ${IV_KEYS}"

if [ "$IV_KEYS" -ge 100 ]; then
  echo -e "  ${GREEN}✓${NC} Cache is well-populated (≥100 stocks)"
elif [ "$IV_KEYS" -ge 50 ]; then
  echo -e "  ${YELLOW}⚠${NC}  Cache is partially populated (50-100 stocks)"
else
  echo -e "  ${YELLOW}⚠${NC}  Cache is sparse (<50 stocks) - warming will help!"
fi
echo ""

# Check 7: Log directory
echo "7. Checking log directories..."
if [ -d "/var/log/alfalyzer/cache-warmer" ]; then
  echo -e "${GREEN}✓${NC} Production log directory exists"
elif [ -d "scripts/cache-warmer/logs" ]; then
  echo -e "${GREEN}✓${NC} Local log directory exists"
else
  echo -e "${YELLOW}⚠${NC}  No log directory found (will be created on first run)"
fi
echo ""

# Summary
echo "========================================="
echo "Validation Summary"
echo "========================================="
echo ""
echo "Ready to deploy cache warmer!"
echo ""
echo "Next steps:"
echo "  1. Export MARKET_DATA_API_KEY if not set"
echo "  2. Run: ./scripts/cache-warmer-iv-sp100.sh"
echo "  3. Check: ./scripts/monitoring/check-iv-cache-hit-rate.sh"
echo "  4. Deploy to production via cron"
echo ""
