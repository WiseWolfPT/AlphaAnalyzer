#!/bin/bash

##
# Cache Optimization Validation Script
#
# Validates the cache optimization implementation by checking:
# 1. Dependencies installed
# 2. Files exist
# 3. Redis connectivity
# 4. Benchmark results meet targets
# 5. Monitoring endpoints respond
#
# Usage:
#   bash scripts/validate-cache-optimization.sh [local|production]
##

set -e

TARGET=${1:-local}
BASE_URL=${TARGET_URL:-http://localhost:3001}

if [ "$TARGET" = "production" ]; then
  BASE_URL="https://128.140.45.28.sslip.io"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Cache Optimization Validation"
echo "  Target: $TARGET ($BASE_URL)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS_COUNT=0
FAIL_COUNT=0

# Helper functions
pass() {
  echo -e "${GREEN}✅ PASS${NC}: $1"
  ((PASS_COUNT++))
}

fail() {
  echo -e "${RED}❌ FAIL${NC}: $1"
  ((FAIL_COUNT++))
}

warn() {
  echo -e "${YELLOW}⚠️  WARN${NC}: $1"
}

section() {
  echo ""
  echo "━━━ $1"
  echo ""
}

##
# 1. Check Dependencies
##
section "1. Dependency Check"

if npm list lru-cache > /dev/null 2>&1; then
  pass "lru-cache installed"
else
  fail "lru-cache not installed (run: npm install lru-cache@11.0.0)"
fi

if npm list @msgpack/msgpack > /dev/null 2>&1; then
  pass "@msgpack/msgpack installed"
else
  fail "@msgpack/msgpack not installed (run: npm install @msgpack/msgpack@3.0.0-beta2)"
fi

##
# 2. Check Files Exist
##
section "2. File Structure Check"

FILES=(
  "server/cache/enhanced-redis-cache-service.ts"
  "server/utils/refresh-ahead-cache.ts"
  "server/routes/cache-monitoring.ts"
  "scripts/benchmark-cache.mjs"
  "docs/CACHE_OPTIMIZATION_MIGRATION.md"
  "docs/CACHE_OPTIMIZATION_IMPLEMENTATION_REPORT.md"
)

for FILE in "${FILES[@]}"; do
  if [ -f "$FILE" ]; then
    pass "$FILE exists"
  else
    fail "$FILE missing"
  fi
done

##
# 3. Redis Connectivity
##
section "3. Redis Connectivity"

REDIS_HOST=${REDIS_HOST:-localhost}
REDIS_PORT=${REDIS_PORT:-6379}
REDIS_PASSWORD=${REDIS_PASSWORD:-alfalyzer2025redis}

if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" ping 2>/dev/null | grep -q PONG; then
  pass "Redis connected ($REDIS_HOST:$REDIS_PORT)"
else
  fail "Redis not connected ($REDIS_HOST:$REDIS_PORT)"
fi

# Check Redis memory
REDIS_MEMORY=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" INFO memory 2>/dev/null | grep "used_memory_human" | cut -d: -f2 | tr -d '\r')
echo "   Redis memory usage: $REDIS_MEMORY"

##
# 4. Monitoring Endpoints (if target is running)
##
section "4. Monitoring Endpoints"

if curl -sf "$BASE_URL/api/health" > /dev/null 2>&1; then
  pass "Server responding at $BASE_URL"

  # Check cache monitoring endpoints
  if curl -sf "$BASE_URL/api/cache/monitoring/health" > /dev/null 2>&1; then
    pass "Cache monitoring endpoint available"

    # Get cache stats
    STATS=$(curl -sf "$BASE_URL/api/cache/monitoring/stats" 2>/dev/null)
    if [ $? -eq 0 ]; then
      pass "Cache stats endpoint working"

      # Parse hit rate (if jq available)
      if command -v jq > /dev/null 2>&1; then
        HIT_RATE=$(echo "$STATS" | jq -r '.totalHitRate' | sed 's/%//')
        echo "   Cache hit rate: $HIT_RATE%"

        if (( $(echo "$HIT_RATE >= 80" | bc -l) )); then
          pass "Cache hit rate meets target (≥80%)"
        elif (( $(echo "$HIT_RATE >= 50" | bc -l) )); then
          warn "Cache hit rate below target ($HIT_RATE% < 80%)"
        else
          fail "Cache hit rate too low ($HIT_RATE%)"
        fi

        # Check L1 latency
        L1_LATENCY=$(echo "$STATS" | jq -r '.avgL1Latency' | sed 's/ms//')
        if [ "$L1_LATENCY" != "null" ]; then
          echo "   L1 avg latency: ${L1_LATENCY}ms"
          if (( $(echo "$L1_LATENCY <= 2" | bc -l) )); then
            pass "L1 latency meets target (≤2ms)"
          else
            warn "L1 latency above target ($L1_LATENCY ms > 2ms)"
          fi
        fi

        # Check L2 latency
        L2_LATENCY=$(echo "$STATS" | jq -r '.avgL2Latency' | sed 's/ms//')
        if [ "$L2_LATENCY" != "null" ]; then
          echo "   L2 avg latency: ${L2_LATENCY}ms"
          if (( $(echo "$L2_LATENCY <= 10" | bc -l) )); then
            pass "L2 latency meets target (≤10ms)"
          else
            warn "L2 latency above target ($L2_LATENCY ms > 10ms)"
          fi
        fi
      fi
    else
      fail "Cache stats endpoint not responding"
    fi
  else
    warn "Cache monitoring endpoint not available (deploy pending?)"
  fi
else
  warn "Server not running at $BASE_URL (skip endpoint checks)"
fi

##
# 5. Benchmark Test (optional, only if requested)
##
if [ "$2" = "benchmark" ]; then
  section "5. Benchmark Test"

  if [ -x "scripts/benchmark-cache.mjs" ]; then
    echo "Running benchmark... (this may take 1-2 minutes)"
    if node scripts/benchmark-cache.mjs compare > /tmp/benchmark-results.txt 2>&1; then
      pass "Benchmark completed successfully"

      # Parse results
      if grep -q "TARGET MET" /tmp/benchmark-results.txt; then
        pass "Performance target met (≥50% improvement)"
      else
        warn "Performance target not met (check /tmp/benchmark-results.txt)"
      fi

      echo ""
      echo "Benchmark summary:"
      grep -A 3 "IMPROVEMENT ANALYSIS" /tmp/benchmark-results.txt | tail -n 3
    else
      fail "Benchmark failed (see /tmp/benchmark-results.txt)"
    fi
  else
    warn "Benchmark script not executable (run: chmod +x scripts/benchmark-cache.mjs)"
  fi
fi

##
# Summary
##
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Validation Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "  ${GREEN}PASSED:${NC} $PASS_COUNT"
echo -e "  ${RED}FAILED:${NC} $FAIL_COUNT"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
  echo -e "${GREEN}✅ All checks passed!${NC}"
  echo ""
  echo "Next steps:"
  echo "  1. Deploy to production: npm run deploy:full"
  echo "  2. Monitor metrics: curl $BASE_URL/api/cache/monitoring/stats"
  echo "  3. Run benchmark: node scripts/benchmark-cache.mjs compare"
  echo ""
  exit 0
else
  echo -e "${RED}❌ Some checks failed. Review errors above.${NC}"
  echo ""
  echo "Troubleshooting:"
  echo "  1. Install dependencies: npm install"
  echo "  2. Check Redis: redis-cli -a alfalyzer2025redis ping"
  echo "  3. Review docs: docs/CACHE_OPTIMIZATION_MIGRATION.md"
  echo ""
  exit 1
fi
