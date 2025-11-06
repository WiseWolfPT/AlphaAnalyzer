#!/bin/bash
# Security Fixes Validation Script
# Validates all 5 P0 security fixes are working correctly

set -e

echo "========================================="
echo "SECURITY FIXES VALIDATION"
echo "========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Target URL (default to localhost, override with TARGET_URL env var)
TARGET_URL="${TARGET_URL:-http://localhost:3001}"

echo "Target: $TARGET_URL"
echo ""

# Test counters
PASSED=0
FAILED=0

# Helper function to run test
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_result="$3"

    echo -n "Testing: $test_name ... "

    if eval "$test_command" > /dev/null 2>&1; then
        if [ "$expected_result" == "pass" ]; then
            echo -e "${GREEN}✓ PASS${NC}"
            ((PASSED++))
        else
            echo -e "${RED}✗ FAIL (should have failed)${NC}"
            ((FAILED++))
        fi
    else
        if [ "$expected_result" == "fail" ]; then
            echo -e "${GREEN}✓ PASS (correctly rejected)${NC}"
            ((PASSED++))
        else
            echo -e "${RED}✗ FAIL${NC}"
            ((FAILED++))
        fi
    fi
}

echo "========================================="
echo "P0-2: SQL Injection Protection"
echo "========================================="
echo ""

# Test 1: Valid symbol should work
run_test "Valid symbol (AAPL)" \
    "curl -s -f '$TARGET_URL/api/cache/intrinsic-values/AAPL'" \
    "pass"

# Test 2: SQL injection should be blocked
run_test "SQL injection blocked (AAPL'; DROP TABLE)" \
    "curl -s -f '$TARGET_URL/api/cache/intrinsic-values/AAPL%27%3B%20DROP'" \
    "fail"

# Test 3: Path traversal should be blocked
run_test "Path traversal blocked (../../etc/passwd)" \
    "curl -s -f '$TARGET_URL/api/cache/intrinsic-values/..%2F..%2Fetc%2Fpasswd'" \
    "fail"

# Test 4: Redis injection should be blocked
run_test "Redis injection blocked (AAPL\\nmalicious)" \
    "curl -s -f '$TARGET_URL/api/cache/intrinsic-values/AAPL%0Amalicious'" \
    "fail"

# Test 5: Control characters should be blocked
run_test "Control characters blocked" \
    "curl -s -f '$TARGET_URL/api/cache/intrinsic-values/AAPL%00'" \
    "fail"

echo ""
echo "========================================="
echo "P0-3: TTL Validation (Unit Tests)"
echo "========================================="
echo ""

# Run unit tests for security module
cd "$(dirname "$0")/.."
if npm test -- server/security/__tests__/input-validation.test.ts --run > /dev/null 2>&1; then
    echo -e "${GREEN}✓ All 31 security unit tests passing${NC}"
    ((PASSED+=5))
else
    echo -e "${RED}✗ Security unit tests failed${NC}"
    ((FAILED+=5))
fi

echo ""
echo "========================================="
echo "P0-4: Health Check Rate Limiting"
echo "========================================="
echo ""

# Test worker health endpoints (if running locally)
if [ "$TARGET_URL" == "http://localhost:3001" ]; then
    run_test "Intelligent warming worker health" \
        "curl -s -f http://localhost:3008/health" \
        "pass"

    run_test "Price worker health" \
        "curl -s -f http://localhost:3002/health" \
        "pass"
else
    echo -e "${YELLOW}ℹ Skipping worker health checks (not localhost)${NC}"
fi

echo ""
echo "========================================="
echo "P0-5: Bandwidth Tracking"
echo "========================================="
echo ""

# Check if bandwidth tracker module exists
if [ -f "server/utils/bandwidth-tracker.ts" ]; then
    echo -e "${GREEN}✓ BandwidthTracker module exists${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ BandwidthTracker module missing${NC}"
    ((FAILED++))
fi

# Check if warmMethod uses bandwidthTracker
if grep -q "bandwidthTracker" server/workers/intelligent-warming-worker.ts; then
    echo -e "${GREEN}✓ Intelligent warming worker uses BandwidthTracker${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ Intelligent warming worker not using BandwidthTracker${NC}"
    ((FAILED++))
fi

# Check hardcoded 60 KB estimate is removed
if grep -q "60 \* 1024" server/workers/intelligent-warming-worker.ts; then
    echo -e "${RED}✗ Hardcoded 60 KB estimate still present${NC}"
    ((FAILED++))
else
    echo -e "${GREEN}✓ Hardcoded 60 KB estimate removed${NC}"
    ((PASSED++))
fi

echo ""
echo "========================================="
echo "P0-1: PGPASSWORD Validation"
echo "========================================="
echo ""

# Check ecosystem.config.cjs has no fallback
if grep -q "process.env.PGPASSWORD || ''" ecosystem.config.cjs; then
    echo -e "${RED}✗ Dangerous PGPASSWORD fallback still present${NC}"
    ((FAILED++))
else
    echo -e "${GREEN}✓ PGPASSWORD fallback removed${NC}"
    ((PASSED++))
fi

# Check worker has validation
if grep -q "requireEnv.*PGPASSWORD" server/workers/intelligent-warming-worker.ts; then
    echo -e "${GREEN}✓ Worker validates PGPASSWORD on startup${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ Worker missing PGPASSWORD validation${NC}"
    ((FAILED++))
fi

echo ""
echo "========================================="
echo "SUMMARY"
echo "========================================="
echo ""

TOTAL=$((PASSED + FAILED))
echo "Total Tests: $TOTAL"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}========================================="
    echo "✅ ALL SECURITY FIXES VALIDATED"
    echo "=========================================${NC}"
    exit 0
else
    echo -e "${RED}========================================="
    echo "❌ SOME SECURITY FIXES FAILED"
    echo "=========================================${NC}"
    exit 1
fi
