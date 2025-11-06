#!/bin/bash

# Frontend E2E Validation Runner
# Waits for backend validation to complete, then runs comprehensive tests

set -e

PROJECT_ROOT="/Users/antoniofrancisco/Documents/teste 1"
cd "$PROJECT_ROOT"

echo "======================================"
echo "FRONTEND E2E VALIDATION - PHASE 0"
echo "======================================"
echo ""

# Create results directory
mkdir -p validation-results/screenshots

# Check if backend is ready
echo "Checking backend status..."
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://128.140.45.28.sslip.io/api/health || echo "000")

if [ "$BACKEND_STATUS" != "200" ]; then
    echo "❌ Backend not responding (HTTP $BACKEND_STATUS)"
    echo "Please ensure backend validation is complete and server is running"
    exit 1
fi

echo "✅ Backend is ready (HTTP $BACKEND_STATUS)"
echo ""

# Check Playwright installation
echo "Checking Playwright installation..."
if ! npx playwright --version &> /dev/null; then
    echo "Installing Playwright browsers..."
    npx playwright install chromium
fi

echo "✅ Playwright ready"
echo ""

# Run tests
echo "======================================"
echo "RUNNING E2E TESTS"
echo "======================================"
echo ""

npx playwright test scripts/validation/validate-frontend-e2e.spec.ts \
    --reporter=list \
    --reporter=html \
    --reporter=json

TEST_EXIT_CODE=$?

echo ""
echo "======================================"
echo "TEST RESULTS SUMMARY"
echo "======================================"

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "✅ ALL TESTS PASSED"
    echo ""
    echo "Reports generated:"
    echo "  - HTML: validation-results/report/index.html"
    echo "  - JSON: validation-results/test-results.json"
    echo "  - Screenshots: validation-results/*.png"
    echo ""
    echo "To view HTML report:"
    echo "  npx playwright show-report validation-results/report"
    exit 0
else
    echo "❌ SOME TESTS FAILED"
    echo ""
    echo "Check detailed results:"
    echo "  npx playwright show-report validation-results/report"
    exit 1
fi
