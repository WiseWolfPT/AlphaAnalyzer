#!/bin/bash
# FASE 2.7 - EMERGENCY DEPLOYMENT SCRIPT
# Critical: P0.4 and P0.5 fixes not deployed to production
# Run this to deploy all FASE 2 changes

set -e  # Exit on error

echo "=========================================="
echo "FASE 2.7 - DEPLOYING CRITICAL FIXES"
echo "=========================================="
echo ""

# Change to project directory
cd "/Users/antoniofrancisco/Documents/teste 1"

# Step 1: Commit changes
echo "Step 1/6: Committing FASE 2 changes..."
git add client/src/App.tsx \
        client/src/pages/intrinsic-value.tsx \
        client/src/hooks/useMethodInputMapper.ts \
        client/src/components/stock/financial-inputs-dynamic.tsx \
        client/src/components/stock/alfa-value-header.tsx \
        client/src/components/stock/dual-valuation-layout.tsx

git commit -m "fix(routing): FASE 2.5 - Add parameterized route and fix search cache

- Add :symbol parameter route to support direct URLs
- Remove legacy React Query code causing search cache issues
- Implement dynamic input mapping for method-specific inputs
- Support bank (P/TBV) and REIT (FFO/AFFO) sector-specific methods

Fixes: P0.4 (search regression), P0.5 (direct URL 404)
Validation: FASE 2.7 frontend re-validation" || echo "Already committed or nothing to commit"

echo ""

# Step 2: Build frontend
echo "Step 2/6: Building frontend bundle..."
npm run build

echo ""

# Step 3: Build server
echo "Step 3/6: Building server bundle..."
npm run build:server

echo ""

# Step 4: Deploy to production
echo "Step 4/6: Deploying to production..."
npm run deploy:full

echo ""

# Step 5: Restart PM2
echo "Step 5/6: Restarting PM2 processes..."
ssh root@128.140.45.28 "pm2 restart alfalyzer --update-env && pm2 save"

echo ""

# Step 6: Verify deployment
echo "Step 6/6: Verifying deployment..."
echo ""
echo "Checking bundle timestamp..."
ssh root@128.140.45.28 "ls -lh '/home/teste 1/dist/public/assets/' | grep index | head -1"

echo ""
echo "Testing direct URL routing..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://128.140.45.28.sslip.io/intrinsic-value/AAPL")

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ SUCCESS: Direct URL routing works! (HTTP $HTTP_CODE)"
else
    echo "❌ FAILED: Direct URL still returns HTTP $HTTP_CODE (expected 200)"
fi

echo ""
echo "=========================================="
echo "DEPLOYMENT COMPLETE"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Re-run FASE 2.7 validation suite"
echo "2. Test all blocked flows"
echo "3. Update FRONTEND_REVALIDATION_REPORT_FASE_2.7.md"
echo ""
echo "To validate:"
echo "  - Navigate to: https://128.140.45.28.sslip.io/intrinsic-value/AAPL"
echo "  - Should see intrinsic value page (not 404)"
echo "  - Test search functionality (2nd query should work)"
echo ""
