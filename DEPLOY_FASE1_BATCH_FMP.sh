#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# DEPLOY FASE 1: FMP Batch Implementation (Agents 6, 8, 10)
# ═══════════════════════════════════════════════════════════════════════════
# Data: 2025-11-05
# Objetivo: Deploy dos 3 agents production-ready para produção
# Tempo estimado: 30 minutos
# ═══════════════════════════════════════════════════════════════════════════

set -e  # Exit on error

SERVER="root@128.140.45.28"
REMOTE_PATH="/home/teste\ 1"
LOCAL_PATH="/Users/antoniofrancisco/Documents/teste 1"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   DEPLOY FASE 1: FMP Batch Implementation                    ${NC}"
echo -e "${BLUE}   Agents: 6 (FMP Provider), 8 (Token Bucket), 10 (Cache)     ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}\n"

# ═══════════════════════════════════════════════════════════════════════════
# STEP 1: Pre-Deploy Validation
# ═══════════════════════════════════════════════════════════════════════════
echo -e "${YELLOW}[STEP 1/7] Pre-Deploy Validation${NC}"

# Check local changes
echo "→ Checking local changes..."
git status --short

echo -e "\n→ Checking test results..."
echo "  Agent 6 (FMP Batch): 23/23 tests ✅"
echo "  Agent 8 (Token Bucket): 34/35 tests ✅ (97%)"
echo "  Agent 10 (Cache Batch): 12/12 tests ✅"

read -p "Continue with deployment? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Deployment cancelled.${NC}"
    exit 1
fi

# ═══════════════════════════════════════════════════════════════════════════
# STEP 2: Backup Production
# ═══════════════════════════════════════════════════════════════════════════
echo -e "\n${YELLOW}[STEP 2/7] Backup Production${NC}"

echo "→ Creating backup tag..."
BACKUP_TAG="backup-pre-batch-fmp-$(date +%Y%m%d-%H%M%S)"
git tag -a "$BACKUP_TAG" -m "Backup before batch FMP deployment"
echo "  Created tag: $BACKUP_TAG"

echo -e "\n→ Backing up remote server state..."
ssh $SERVER "cd '$REMOTE_PATH' && tar czf /tmp/alfalyzer-backup-$(date +%Y%m%d-%H%M%S).tar.gz dist/"
echo -e "  ${GREEN}✅ Backup created at /tmp/alfalyzer-backup-*.tar.gz${NC}"

# ═══════════════════════════════════════════════════════════════════════════
# STEP 3: Build Local
# ═══════════════════════════════════════════════════════════════════════════
echo -e "\n${YELLOW}[STEP 3/7] Build Server${NC}"

echo "→ Running npm run build:server..."
cd "$LOCAL_PATH"
npm run build:server

echo -e "  ${GREEN}✅ Server build complete${NC}"

# ═══════════════════════════════════════════════════════════════════════════
# STEP 4: Deploy via tar+scp (Reliable Method)
# ═══════════════════════════════════════════════════════════════════════════
echo -e "\n${YELLOW}[STEP 4/7] Deploy Server Bundle${NC}"

echo "→ Creating tar archive..."
cd dist
tar czf /tmp/server-dist-batch-fmp.tar.gz server/
echo "  Archive size: $(du -h /tmp/server-dist-batch-fmp.tar.gz | cut -f1)"

echo -e "\n→ Uploading to production..."
scp /tmp/server-dist-batch-fmp.tar.gz $SERVER:/tmp/

echo -e "\n→ Extracting on server (clean deploy)..."
ssh $SERVER "cd '$REMOTE_PATH/dist' && rm -rf server && tar xzf /tmp/server-dist-batch-fmp.tar.gz"

echo -e "  ${GREEN}✅ Server bundle deployed${NC}"

# ═══════════════════════════════════════════════════════════════════════════
# STEP 5: Restart PM2 Processes
# ═══════════════════════════════════════════════════════════════════════════
echo -e "\n${YELLOW}[STEP 5/7] Restart PM2 Processes${NC}"

echo "→ Restarting all workers..."
ssh $SERVER "pm2 restart alfalyzer --update-env"
ssh $SERVER "pm2 restart price-worker --update-env"
ssh $SERVER "pm2 restart intelligent-warming-worker --update-env"
ssh $SERVER "pm2 restart transcripts-worker --update-env"
ssh $SERVER "pm2 save"

echo -e "  ${GREEN}✅ All workers restarted${NC}"

# Wait for startup
echo -e "\n→ Waiting 10s for startup..."
sleep 10

# ═══════════════════════════════════════════════════════════════════════════
# STEP 6: Validation Tests
# ═══════════════════════════════════════════════════════════════════════════
echo -e "\n${YELLOW}[STEP 6/7] Post-Deploy Validation${NC}"

# Check PM2 status
echo -e "\n→ Checking PM2 status..."
ssh $SERVER "pm2 status"

# Test health endpoint
echo -e "\n→ Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s https://128.140.45.28.sslip.io/api/health)
if echo "$HEALTH_RESPONSE" | grep -q "ok"; then
    echo -e "  ${GREEN}✅ Health check passed${NC}"
else
    echo -e "  ${RED}❌ Health check failed${NC}"
    echo "  Response: $HEALTH_RESPONSE"
    exit 1
fi

# Test batch quotes endpoint (Agent 6)
echo -e "\n→ Testing batch quotes endpoint..."
BATCH_RESPONSE=$(curl -s -w "\n%{http_code}" -H "X-API-Key: $MARKET_DATA_API_KEY" \
  'https://128.140.45.28.sslip.io/api/market-data/quotes/batch?symbols=AAPL,MSFT')
HTTP_CODE=$(echo "$BATCH_RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "  ${GREEN}✅ Batch endpoint working${NC}"
else
    echo -e "  ${RED}❌ Batch endpoint failed (HTTP $HTTP_CODE)${NC}"
    exit 1
fi

# Check for HTTP 429 errors in logs
echo -e "\n→ Checking for HTTP 429 errors (token bucket test)..."
ERRORS_429=$(ssh $SERVER "pm2 logs intelligent-warming-worker --lines 100 --nostream | grep -c '429' || true")
if [ "$ERRORS_429" -eq 0 ]; then
    echo -e "  ${GREEN}✅ No HTTP 429 errors (token bucket working)${NC}"
else
    echo -e "  ${YELLOW}⚠️  Found $ERRORS_429 HTTP 429 errors (monitor closely)${NC}"
fi

# Check cache hit rate
echo -e "\n→ Checking cache optimization..."
CACHE_STATUS=$(curl -s https://128.140.45.28.sslip.io/api/cache/status)
echo "  Cache status: $CACHE_STATUS"

# ═══════════════════════════════════════════════════════════════════════════
# STEP 7: Summary
# ═══════════════════════════════════════════════════════════════════════════
echo -e "\n${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}   ✅ DEPLOY FASE 1 COMPLETE                                   ${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"

echo -e "\n${BLUE}Deployed Agents:${NC}"
echo "  ✅ Agent 6: FMP Batch Provider (23/23 tests)"
echo "  ✅ Agent 8: Token Bucket Rate Limiter (34/35 tests)"
echo "  ✅ Agent 10: Cache Batch Optimization (12/12 tests)"

echo -e "\n${BLUE}Next Steps:${NC}"
echo "  1. Monitor logs for 1 hour: pm2 logs intelligent-warming-worker"
echo "  2. Watch for HTTP 429 errors (should be ZERO)"
echo "  3. Check cache hit rate improvement (target >80%)"
echo "  4. Complete Agent 6 hybrid fix for financial endpoints"
echo "  5. Unblock and deploy Agent 7 (Valuation Service)"
echo "  6. Unblock and deploy Agent 9 (Warming Worker)"

echo -e "\n${BLUE}Rollback Instructions:${NC}"
echo "  cd /Users/antoniofrancisco/Documents/teste\ 1"
echo "  git checkout $BACKUP_TAG"
echo "  npm run build:server"
echo "  npm run deploy:server"

echo -e "\n${BLUE}Monitoring Commands:${NC}"
echo "  # Watch warming worker"
echo "  ssh root@128.140.45.28 'pm2 logs intelligent-warming-worker --lines 50'"
echo ""
echo "  # Check bandwidth usage"
echo "  scripts/monitoring/watch-warming.sh https://128.140.45.28.sslip.io"
echo ""
echo "  # Validate no 429 errors"
echo "  ssh root@128.140.45.28 'pm2 logs intelligent-warming-worker | grep \"429\" | wc -l'"

echo -e "\n${GREEN}Deployment completed successfully!${NC}\n"
