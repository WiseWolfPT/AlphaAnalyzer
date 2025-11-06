#!/bin/bash
#
# Intelligent Warming Worker Fix - Automated Deployment
#
# This script automates the deployment of the warming worker fix to production.
# It includes pre-flight checks, deployment, and initial verification.
#
# Usage:
#   chmod +x deploy-warming-worker-fix.sh
#   ./deploy-warming-worker-fix.sh
#
# Author: Claude Code (AI Debug Specialist)
# Date: 2025-11-05
#

set -e  # Exit on any error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SERVER_HOST="128.140.45.28"
SERVER_USER="root"
WORKER_NAME="intelligent-warming"
VERIFICATION_CYCLES=3
CYCLE_INTERVAL=300  # 5 minutes

echo -e "${CYAN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   Warming Worker Fix - Automated Deployment           ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# ==========================================
# Phase 1: Pre-Flight Checks
# ==========================================
echo -e "${BLUE}[1/6] Running pre-flight checks...${NC}"
echo ""

# Check if validation script exists
if [ ! -f "scripts/validate-warming-worker-fix.mjs" ]; then
  echo -e "${RED}✗ FAIL${NC} Validation script not found"
  exit 1
fi

# Run validation
echo "Running validation script..."
if node scripts/validate-warming-worker-fix.mjs; then
  echo -e "${GREEN}✓ PASS${NC} Validation checks passed"
else
  echo -e "${RED}✗ FAIL${NC} Validation checks failed"
  echo ""
  echo "Fix validation errors before deploying."
  exit 1
fi

echo ""

# ==========================================
# Phase 2: Confirm Deployment
# ==========================================
echo -e "${BLUE}[2/6] Deployment confirmation...${NC}"
echo ""

echo -e "${YELLOW}⚠ WARNING${NC}: This will deploy warming worker fix to production."
echo ""
echo "Changes:"
echo "  - Remove obsolete FCFE methods from warming workers"
echo "  - Restart intelligent-warming worker"
echo ""
echo "Expected impact:"
echo "  - Worker success rate: 0% → 80%+"
echo "  - Failed tasks: 8/cycle → 0/cycle"
echo ""
read -p "Continue with deployment? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo -e "${YELLOW}Deployment cancelled.${NC}"
  exit 0
fi

echo ""

# ==========================================
# Phase 3: Build Server
# ==========================================
echo -e "${BLUE}[3/6] Building server...${NC}"
echo ""

if npm run build:server; then
  echo -e "${GREEN}✓ PASS${NC} Server build successful"
else
  echo -e "${RED}✗ FAIL${NC} Server build failed"
  exit 1
fi

echo ""

# ==========================================
# Phase 4: Deploy to Production
# ==========================================
echo -e "${BLUE}[4/6] Deploying to production...${NC}"
echo ""

echo "Deploying server (includes warming workers)..."
if npm run deploy:server; then
  echo -e "${GREEN}✓ PASS${NC} Deployment successful"
else
  echo -e "${RED}✗ FAIL${NC} Deployment failed"
  exit 1
fi

echo ""

# ==========================================
# Phase 5: Restart Worker
# ==========================================
echo -e "${BLUE}[5/6] Restarting warming worker...${NC}"
echo ""

echo "Restarting ${WORKER_NAME}..."
if ssh "${SERVER_USER}@${SERVER_HOST}" "pm2 restart ${WORKER_NAME} --update-env"; then
  echo -e "${GREEN}✓ PASS${NC} Worker restarted successfully"
else
  echo -e "${RED}✗ FAIL${NC} Worker restart failed"
  echo ""
  echo "Rollback may be required. Check PM2 logs:"
  echo "  ssh ${SERVER_USER}@${SERVER_HOST} 'pm2 logs ${WORKER_NAME} --err --lines 50'"
  exit 1
fi

echo ""
sleep 5  # Wait for worker to initialize

# ==========================================
# Phase 6: Immediate Verification
# ==========================================
echo -e "${BLUE}[6/6] Running immediate verification...${NC}"
echo ""

echo "Checking PM2 status..."
ssh "${SERVER_USER}@${SERVER_HOST}" "pm2 status ${WORKER_NAME}" || {
  echo -e "${RED}✗ FAIL${NC} Worker not running"
  exit 1
}

echo ""
echo "Checking for errors in logs..."
ERROR_COUNT=$(ssh "${SERVER_USER}@${SERVER_HOST}" "pm2 logs ${WORKER_NAME} --lines 50 --nostream 2>&1 | grep -c 'Unsupported method ID' || true")

if [ "$ERROR_COUNT" -eq 0 ]; then
  echo -e "${GREEN}✓ PASS${NC} No 'Unsupported method ID' errors found"
else
  echo -e "${RED}✗ FAIL${NC} Found ${ERROR_COUNT} 'Unsupported method ID' errors"
  echo ""
  echo "Recent errors:"
  ssh "${SERVER_USER}@${SERVER_HOST}" "pm2 logs ${WORKER_NAME} --lines 20 --nostream | grep 'Unsupported method ID'"
  echo ""
  echo -e "${YELLOW}⚠ WARNING${NC}: Obsolete method errors still present. Investigate before continuing."
fi

echo ""

# ==========================================
# Deployment Summary
# ==========================================
echo -e "${CYAN}════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}✓✓✓ DEPLOYMENT COMPLETE ✓✓✓${NC}"
echo ""
echo "Deployment successful. Worker is now running."
echo ""
echo -e "${YELLOW}Next Steps (Manual Verification):${NC}"
echo ""
echo "1. Monitor next ${VERIFICATION_CYCLES} warming cycles ($(($VERIFICATION_CYCLES * $CYCLE_INTERVAL / 60)) minutes):"
echo "   ${CYAN}ssh ${SERVER_USER}@${SERVER_HOST} 'pm2 logs ${WORKER_NAME} --lines 0'${NC}"
echo ""
echo "2. Watch for cycle completion messages:"
echo "   - Expected: 'Cycle N complete: X success, 0 failed, Y skipped'"
echo "   - X should be > 0 (was 0 before fix)"
echo "   - Failed count should be 0 (was 8 before fix)"
echo ""
echo "3. Check worker health endpoint:"
echo "   ${CYAN}curl http://localhost:3006/health | jq '.'${NC}"
echo ""
echo "4. Verify cache coverage growth (after 30 min):"
echo "   ${CYAN}curl http://localhost:3001/api/monitoring/warming/overview | jq '.coverage'${NC}"
echo ""
echo -e "${YELLOW}Success Criteria:${NC}"
echo "  ✓ No 'Unsupported method ID' errors"
echo "  ✓ Success count > 0 per cycle"
echo "  ✓ Failed count = 0 per cycle"
echo "  ✓ Cache coverage increasing over time"
echo ""
echo -e "${YELLOW}If Issues Occur:${NC}"
echo "  1. Check deployment guide: WARMING_WORKER_FIX_DEPLOYMENT_GUIDE.md"
echo "  2. Review rollback procedures"
echo "  3. Execute rollback if needed"
echo ""
echo "Deployment timestamp: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
echo ""
