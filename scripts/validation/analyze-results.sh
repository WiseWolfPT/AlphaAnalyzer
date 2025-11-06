#!/bin/bash

# Analyze Frontend E2E Test Results
# Generates summary report from test execution

set -e

PROJECT_ROOT="/Users/antoniofrancisco/Documents/teste 1"
cd "$PROJECT_ROOT"

RESULTS_FILE="validation-results/test-results.json"
REPORT_FILE="validation-results/FRONTEND_VALIDATION_SUMMARY.md"

echo "======================================"
echo "FRONTEND VALIDATION ANALYSIS"
echo "======================================"
echo ""

if [ ! -f "$RESULTS_FILE" ]; then
    echo "❌ No test results found at $RESULTS_FILE"
    echo "Run tests first: bash scripts/validation/run-frontend-validation.sh"
    exit 1
fi

# Parse JSON results
TOTAL_TESTS=$(jq '.suites[].suites[].specs | length' "$RESULTS_FILE" | awk '{sum+=$1} END {print sum}')
PASSED_TESTS=$(jq '[.suites[].suites[].specs[].tests[] | select(.status == "passed")] | length' "$RESULTS_FILE")
FAILED_TESTS=$(jq '[.suites[].suites[].specs[].tests[] | select(.status == "failed")] | length' "$RESULTS_FILE")

# Generate report
cat > "$REPORT_FILE" <<EOF
# Frontend E2E Validation Report
**Date:** $(date '+%Y-%m-%d %H:%M:%S')
**Environment:** Production (https://128.140.45.28.sslip.io)

## Summary

- **Total Tests:** $TOTAL_TESTS
- **Passed:** ✅ $PASSED_TESTS
- **Failed:** ❌ $FAILED_TESTS
- **Pass Rate:** $(echo "scale=1; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc)%

## Test Coverage

### Stock Type Validation
1. **Bank Stock (JPM)** - Validates 9 methods, zero DCF
2. **REIT Stock (PLD)** - Validates 16-18 methods
3. **Growth Stock (NVDA)** - Validates Growth DCF 8Y presence
4. **Value Stock (AAPL)** - Validates standard methods
5. **BRK.B Ticker** - Validates normalization

### UX Validation
6. **ETF Rejection (SPY)** - Validates friendly error message
7. **Manual Inputs** - Validates no .toFixed() crashes
8. **Mobile Responsive** - Validates 375px viewport

### Performance
9. **Page Load Time** - Validates < 5s load time

## Test Results Detail

EOF

# Extract individual test results
jq -r '.suites[].suites[].specs[] | "### \(.title)\n- **Status:** \(.tests[0].status)\n- **Duration:** \(.tests[0].results[0].duration)ms\n"' "$RESULTS_FILE" >> "$REPORT_FILE"

cat >> "$REPORT_FILE" <<EOF

## Screenshots Generated

\`\`\`
validation-results/
├── jpm-initial.png (Bank stock)
├── pld-initial.png (REIT stock)
├── nvda-initial.png (Growth stock)
├── aapl-initial.png (Value stock)
├── brkb-initial.png (BRK.B ticker)
├── spy-etf-rejection.png (ETF rejection)
├── aapl-manual-inputs.png (Manual inputs)
└── mobile-aapl.png (Mobile responsive)
\`\`\`

## Recommendations

EOF

if [ "$FAILED_TESTS" -eq 0 ]; then
    cat >> "$REPORT_FILE" <<EOF
✅ **ALL TESTS PASSED - READY FOR PRODUCTION**

No issues detected. Frontend is fully validated across:
- All stock types (bank, REIT, growth, value)
- ETF rejection UX
- Manual financial inputs
- Mobile responsiveness
- Performance benchmarks

**Decision:** GO for production deployment.
EOF
else
    cat >> "$REPORT_FILE" <<EOF
⚠️ **SOME TESTS FAILED - REVIEW REQUIRED**

Failed tests: $FAILED_TESTS/$TOTAL_TESTS

Please review:
1. Check individual test failures in HTML report
2. Examine screenshots for visual issues
3. Review console logs for errors
4. Verify backend API responses

**Decision:** NO-GO until failures resolved.
EOF
fi

cat >> "$REPORT_FILE" <<EOF

---
**Generated:** $(date '+%Y-%m-%d %H:%M:%S')
**Report Location:** validation-results/report/index.html
EOF

echo "✅ Analysis complete!"
echo ""
echo "Report saved to: $REPORT_FILE"
echo ""
cat "$REPORT_FILE"
