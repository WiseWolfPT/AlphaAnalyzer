#!/bin/bash

# QUICK VALIDATION TEST - 5 minute reality check
# Tests the most critical bottlenecks immediately

set -e

BASE_URL="${BASE_URL:-http://localhost:3001}"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 ALFALYZER QUICK VALIDATION TEST${NC}"
echo -e "${BLUE}==================================${NC}"

# Check if server is running
if ! curl -s "${BASE_URL}/health" > /dev/null; then
    echo -e "${RED}❌ Server not responding at ${BASE_URL}${NC}"
    echo "Please start: npm run dev"
    exit 1
fi

echo -e "${GREEN}✅ Server is running${NC}"

# Create quick test results directory
QUICK_RESULTS="load-testing/quick-results/$(date +%Y%m%d_%H%M%S)"
mkdir -p "${QUICK_RESULTS}"

echo -e "${BLUE}📊 Running 5-minute validation tests...${NC}"

# Test 1: Rate Limit Discovery (2 minutes)
echo -e "${YELLOW}Test 1: Rate Limit Discovery${NC}"
cat > "${QUICK_RESULTS}/rate-limit-test.js" << 'EOF'
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  scenarios: {
    rate_limit_test: {
      executor: 'constant-arrival-rate',
      rate: 60,  // 60 requests per minute (2x the limit)
      timeUnit: '1m',
      duration: '2m',
      preAllocatedVUs: 5,
    },
  },
};

export default function () {
  const response = http.get(`${__ENV.BASE_URL}/api/stocks?limit=10`);
  
  const rateLimited = check(response, {
    'not_rate_limited': (r) => r.status !== 429,
    'response_ok': (r) => r.status === 200,
  });
  
  if (response.status === 429) {
    console.log(`Rate limited at ${Date.now()}`);
  }
}
EOF

k6 run --env BASE_URL="${BASE_URL}" "${QUICK_RESULTS}/rate-limit-test.js" > "${QUICK_RESULTS}/rate-limit-results.txt" 2>&1 &
RATE_TEST_PID=$!

# Test 2: Database Stress (2 minutes)
echo -e "${YELLOW}Test 2: Database Stress${NC}"
cat > "${QUICK_RESULTS}/db-stress-test.js" << 'EOF'
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  scenarios: {
    db_stress: {
      executor: 'constant-vus',
      vus: 15,
      duration: '2m',
    },
  },
};

export default function () {
  // Heavy database operations
  const searchResponse = http.get(`${__ENV.BASE_URL}/api/stocks/search?q=${Math.random().toString(36).substring(7)}`);
  
  check(searchResponse, {
    'search_works': (r) => r.status === 200 || r.status === 429,
    'search_fast': (r) => r.timings.duration < 2000,
  });
  
  const stockResponse = http.get(`${__ENV.BASE_URL}/api/stocks/AAPL`);
  
  check(stockResponse, {
    'stock_works': (r) => r.status === 200 || r.status === 429,
    'stock_fast': (r) => r.timings.duration < 1000,
  });
}
EOF

sleep 2
k6 run --env BASE_URL="${BASE_URL}" "${QUICK_RESULTS}/db-stress-test.js" > "${QUICK_RESULTS}/db-stress-results.txt" 2>&1 &
DB_TEST_PID=$!

# Wait for tests to complete
wait $RATE_TEST_PID
wait $DB_TEST_PID

echo -e "${GREEN}✅ Tests completed${NC}"

# Analyze results
echo -e "${BLUE}📊 Quick Analysis${NC}"

# Check rate limiting results
rate_limit_count=$(grep -c "429" "${QUICK_RESULTS}/rate-limit-results.txt" || echo "0")
echo -e "Rate limit hits: ${rate_limit_count}"

if [ "$rate_limit_count" -gt "0" ]; then
    echo -e "${RED}⚠️ Rate limiting triggered as expected${NC}"
else
    echo -e "${GREEN}No rate limiting detected (server may be in dev mode)${NC}"
fi

# Check for database errors
db_errors=$(grep -c -i "error\|timeout\|lock" "${QUICK_RESULTS}/db-stress-results.txt" || echo "0")
echo -e "Database errors: ${db_errors}"

if [ "$db_errors" -gt "0" ]; then
    echo -e "${RED}⚠️ Database stress detected${NC}"
else
    echo -e "${GREEN}Database handling load well${NC}"
fi

# Generate quick summary
cat > "${QUICK_RESULTS}/quick-summary.txt" << EOF
ALFALYZER QUICK VALIDATION RESULTS
Generated: $(date)
Duration: 5 minutes

RATE LIMITING TEST:
- Rate limit hits: ${rate_limit_count}
- Status: $([ "$rate_limit_count" -gt "0" ] && echo "TRIGGERED" || echo "NOT TRIGGERED")

DATABASE STRESS TEST:
- Database errors: ${db_errors}
- Status: $([ "$db_errors" -gt "0" ] && echo "STRESSED" || echo "STABLE")

RECOMMENDATION:
$([ "$rate_limit_count" -gt "0" ] && echo "✅ Rate limiting working as expected - increase limits for production")
$([ "$db_errors" -gt "0" ] && echo "⚠️ Database showing stress - consider PostgreSQL migration")
$([ "$rate_limit_count" -eq "0" ] && [ "$db_errors" -eq "0" ] && echo "🎯 System stable under light load - proceed with full load testing")

NEXT STEPS:
- Run full test suite: ./load-testing/execute-load-tests.sh
- Monitor results in: ${QUICK_RESULTS}/
- Review optimization recommendations in LOAD_TESTING_REALITY_CHECK.md
EOF

echo -e "${BLUE}📋 Quick Summary:${NC}"
cat "${QUICK_RESULTS}/quick-summary.txt"

echo -e "${GREEN}🎉 Quick validation completed!${NC}"
echo -e "${BLUE}Results saved to: ${QUICK_RESULTS}/${NC}"
echo -e "${YELLOW}For comprehensive testing, run: ./load-testing/execute-load-tests.sh${NC}"