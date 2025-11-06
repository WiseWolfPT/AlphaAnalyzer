#!/bin/bash

# Quick Backend Readiness Check
# Validates backend is ready before running frontend tests

set -e

BASE_URL="https://128.140.45.28.sslip.io"

echo "======================================"
echo "BACKEND READINESS CHECK"
echo "======================================"
echo ""

# Test 1: Health endpoint
echo "1. Checking backend health..."
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/health")

if [ "$HEALTH_STATUS" = "200" ]; then
    echo "   ✅ Backend healthy (HTTP $HEALTH_STATUS)"
else
    echo "   ❌ Backend not healthy (HTTP $HEALTH_STATUS)"
    exit 1
fi

# Test 2: IV endpoint for standard stock (AAPL)
echo "2. Testing IV endpoint (AAPL)..."
AAPL_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/iv/AAPL/chart")

if [ "$AAPL_STATUS" = "200" ]; then
    echo "   ✅ IV endpoint working (HTTP $AAPL_STATUS)"
else
    echo "   ❌ IV endpoint failed (HTTP $AAPL_STATUS)"
    exit 1
fi

# Test 3: ETF rejection (SPY)
echo "3. Testing ETF rejection (SPY)..."
SPY_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/iv/SPY/chart")

if [ "$SPY_STATUS" = "422" ]; then
    echo "   ✅ ETF rejection working (HTTP $SPY_STATUS)"
else
    echo "   ⚠️  ETF rejection unexpected (HTTP $SPY_STATUS - expected 422)"
fi

# Test 4: Bank stock (JPM)
echo "4. Testing bank stock (JPM)..."
JPM_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/iv/JPM/chart")

if [ "$JPM_STATUS" = "200" ]; then
    echo "   ✅ Bank stock endpoint working (HTTP $JPM_STATUS)"
else
    echo "   ❌ Bank stock endpoint failed (HTTP $JPM_STATUS)"
    exit 1
fi

# Test 5: Growth stock (NVDA)
echo "5. Testing growth stock (NVDA)..."
NVDA_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/iv/NVDA/chart")

if [ "$NVDA_STATUS" = "200" ]; then
    echo "   ✅ Growth stock endpoint working (HTTP $NVDA_STATUS)"
else
    echo "   ❌ Growth stock endpoint failed (HTTP $NVDA_STATUS)"
    exit 1
fi

echo ""
echo "======================================"
echo "✅ ALL BACKEND CHECKS PASSED"
echo "======================================"
echo ""
echo "Backend is ready for frontend E2E testing."
echo ""
echo "Run frontend tests with:"
echo "  bash scripts/validation/run-frontend-validation.sh"
echo ""
