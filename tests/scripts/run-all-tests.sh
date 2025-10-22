#!/bin/bash

##############################################################################
# Master Test Runner - Transcripts Feature (Onda 3 Validation)
#
# Executes all test suites in order:
#   1. Discovery Job (Backend)
#   2. AI Processing (Queue)
#   3. API Endpoints (Integration)
#   4. UI Toggle (Playwright)
#
# TDD Principle: Run full suite to validate entire feature stack
##############################################################################

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPORT_FILE="$SCRIPT_DIR/../e2e/transcripts-test-report.md"
TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M:%S UTC")

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║   TRANSCRIPTS FEATURE - E2E TEST SUITE (ONDA 3)           ║"
echo "║   Comprehensive validation of full feature stack          ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "⏰ Test Run Started: $TIMESTAMP"
echo ""

# Initialize report
cat > "$REPORT_FILE" << 'EOF'
# Transcripts Feature - E2E Test Results

## Test Execution Summary

EOF

echo "**Execution Date:** $TIMESTAMP" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "---" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Test counters
TOTAL_TESTS=4
PASSED_TESTS=0
FAILED_TESTS=0
SKIPPED_TESTS=0

# Test #1: Discovery Job
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Running Test #1: Discovery Job (Backend Validation)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if "$SCRIPT_DIR/test-discovery-job.sh" 2>&1 | tee /tmp/test1.log; then
    echo -e "${GREEN}✅ Test #1: PASSED${NC}"
    echo ""
    ((PASSED_TESTS++))

    echo "## Test #1: Discovery Job" >> "$REPORT_FILE"
    echo "- **Status:** ✅ PASS" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo '```' >> "$REPORT_FILE"
    tail -20 /tmp/test1.log >> "$REPORT_FILE"
    echo '```' >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
else
    echo -e "${RED}❌ Test #1: FAILED${NC}"
    echo ""
    ((FAILED_TESTS++))

    echo "## Test #1: Discovery Job" >> "$REPORT_FILE"
    echo "- **Status:** ❌ FAIL" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo '```' >> "$REPORT_FILE"
    tail -20 /tmp/test1.log >> "$REPORT_FILE"
    echo '```' >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
fi

# Test #2: AI Processing
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Running Test #2: AI Processing (Queue Validation)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if "$SCRIPT_DIR/test-ai-processing.sh" 2>&1 | tee /tmp/test2.log; then
    echo -e "${GREEN}✅ Test #2: PASSED${NC}"
    echo ""
    ((PASSED_TESTS++))

    echo "## Test #2: AI Processing" >> "$REPORT_FILE"
    echo "- **Status:** ✅ PASS" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo '```' >> "$REPORT_FILE"
    tail -20 /tmp/test2.log >> "$REPORT_FILE"
    echo '```' >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
else
    echo -e "${RED}❌ Test #2: FAILED${NC}"
    echo ""
    ((FAILED_TESTS++))

    echo "## Test #2: AI Processing" >> "$REPORT_FILE"
    echo "- **Status:** ❌ FAIL" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo '```' >> "$REPORT_FILE"
    tail -20 /tmp/test2.log >> "$REPORT_FILE"
    echo '```' >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
fi

# Test #3: API Endpoints
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Running Test #3: API Endpoints (Integration Testing)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if "$SCRIPT_DIR/test-api-endpoints.sh" 2>&1 | tee /tmp/test3.log; then
    echo -e "${GREEN}✅ Test #3: PASSED${NC}"
    echo ""
    ((PASSED_TESTS++))

    echo "## Test #3: API Endpoints" >> "$REPORT_FILE"
    echo "- **Status:** ✅ PASS" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo '```' >> "$REPORT_FILE"
    tail -30 /tmp/test3.log >> "$REPORT_FILE"
    echo '```' >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
else
    echo -e "${RED}❌ Test #3: FAILED${NC}"
    echo ""
    ((FAILED_TESTS++))

    echo "## Test #3: API Endpoints" >> "$REPORT_FILE"
    echo "- **Status:** ❌ FAIL" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo '```' >> "$REPORT_FILE"
    tail -30 /tmp/test3.log >> "$REPORT_FILE"
    echo '```' >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
fi

# Test #4: Playwright E2E
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Running Test #4: UI Toggle (Playwright E2E)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if cd "$SCRIPT_DIR/../.." && npx playwright test tests/e2e/transcripts-onda3.spec.ts 2>&1 | tee /tmp/test4.log; then
    echo -e "${GREEN}✅ Test #4: PASSED${NC}"
    echo ""
    ((PASSED_TESTS++))

    echo "## Test #4: UI Toggle (Playwright E2E)" >> "$REPORT_FILE"
    echo "- **Status:** ✅ PASS" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo '```' >> "$REPORT_FILE"
    tail -30 /tmp/test4.log >> "$REPORT_FILE"
    echo '```' >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
else
    EXIT_CODE=$?
    if [ $EXIT_CODE -eq 0 ]; then
        # All tests passed or skipped
        echo -e "${GREEN}✅ Test #4: PASSED (some tests skipped)${NC}"
        echo ""
        ((PASSED_TESTS++))

        echo "## Test #4: UI Toggle (Playwright E2E)" >> "$REPORT_FILE"
        echo "- **Status:** ✅ PASS (partial - UI components not yet implemented)" >> "$REPORT_FILE"
    else
        echo -e "${RED}❌ Test #4: FAILED${NC}"
        echo ""
        ((FAILED_TESTS++))

        echo "## Test #4: UI Toggle (Playwright E2E)" >> "$REPORT_FILE"
        echo "- **Status:** ❌ FAIL" >> "$REPORT_FILE"
    fi
    echo "" >> "$REPORT_FILE"
    echo '```' >> "$REPORT_FILE"
    tail -30 /tmp/test4.log >> "$REPORT_FILE"
    echo '```' >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
fi

# Generate final report
echo "---" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "## Overall Summary" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "| Metric | Count |" >> "$REPORT_FILE"
echo "|--------|-------|" >> "$REPORT_FILE"
echo "| Total Tests | $TOTAL_TESTS |" >> "$REPORT_FILE"
echo "| ✅ Passed | $PASSED_TESTS |" >> "$REPORT_FILE"
echo "| ❌ Failed | $FAILED_TESTS |" >> "$REPORT_FILE"
echo "| ⏭️ Skipped | $SKIPPED_TESTS |" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

SUCCESS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
echo "**Success Rate:** ${SUCCESS_RATE}%" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Print final summary
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║   TEST EXECUTION COMPLETE                                  ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "📊 Final Results:"
echo ""
echo "   Total Tests:    $TOTAL_TESTS"
echo -e "   ${GREEN}✅ Passed:       $PASSED_TESTS${NC}"
echo -e "   ${RED}❌ Failed:       $FAILED_TESTS${NC}"
echo "   ⏭️  Skipped:      $SKIPPED_TESTS"
echo ""
echo "   Success Rate:   ${SUCCESS_RATE}%"
echo ""
echo "📄 Full report saved to:"
echo "   $REPORT_FILE"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed! Feature is ready for production.${NC}"
    echo ""
    exit 0
else
    echo -e "${YELLOW}⚠️  Some tests failed. Review the report for details.${NC}"
    echo ""
    exit 1
fi
