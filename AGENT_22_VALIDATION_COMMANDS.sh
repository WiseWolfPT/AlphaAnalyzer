#!/bin/bash
# AGENT 22: Production State Validation Commands
# Run these to verify the findings in the report

set -e

echo "╔═══════════════════════════════════════════════════════════════════════════════╗"
echo "║           AGENT 22: PRODUCTION STATE VALIDATION COMMANDS                     ║"
echo "╚═══════════════════════════════════════════════════════════════════════════════╝"
echo ""

SERVER="root@128.140.45.28"
BASE_PATH="/home/teste 1"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. BUNDLE ANALYSIS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo -e "\n${YELLOW}Bundle Hash:${NC}"
ssh $SERVER "md5sum '$BASE_PATH/dist/server/index.cjs'"

echo -e "\n${YELLOW}Bundle Size & Timestamp:${NC}"
ssh $SERVER "ls -lh '$BASE_PATH/dist/server/index.cjs'"

echo -e "\n${YELLOW}Feature Counts in Bundle:${NC}"
echo "TokenBucketRateLimiter:"
ssh $SERVER "grep -c 'TokenBucketRateLimiter' '$BASE_PATH/dist/server/index.cjs' || echo '0'"
echo "getBatchFinancialData:"
ssh $SERVER "grep -c 'getBatchFinancialData' '$BASE_PATH/dist/server/index.cjs' || echo '0'"
echo "GICSSectorService:"
ssh $SERVER "grep -c 'GICSSectorService' '$BASE_PATH/dist/server/index.cjs' || echo '0'"
echo "SECTOR_WARMING_CONFIG:"
ssh $SERVER "grep -c 'SECTOR_WARMING_CONFIG' '$BASE_PATH/dist/server/index.cjs' || echo '0'"
echo "DataOrchestrator:"
ssh $SERVER "grep -c 'DataOrchestrator' '$BASE_PATH/dist/server/index.cjs' || echo '0'"
echo "cacheBatchMethodResults:"
ssh $SERVER "grep -c 'cacheBatchMethodResults' '$BASE_PATH/dist/server/index.cjs' || echo '0'"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2. PM2 PROCESS STATUS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ssh $SERVER "pm2 status"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3. ERROR ANALYSIS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo -e "\n${YELLOW}HTTP 429 Rate Limit Errors (last 500 lines):${NC}"
ssh $SERVER "pm2 logs intelligent-warming-worker --lines 500 --nostream | grep -c '429' || echo '0'"

echo -e "\n${YELLOW}Timeout Errors (last 500 lines):${NC}"
ssh $SERVER "pm2 logs intelligent-warming-worker --lines 500 --nostream | grep -c 'timeout' || echo '0'"

echo -e "\n${YELLOW}Invalid IV Calculations (last 500 lines):${NC}"
ssh $SERVER "pm2 logs intelligent-warming-worker --lines 500 --nostream | grep -c 'Invalid IV calculation' || echo '0'"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4. REDIS CACHE STATUS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo -e "\n${YELLOW}Total Redis Keys:${NC}"
ssh $SERVER "redis-cli -a alfalyzer2025redis DBSIZE 2>&1 | grep -v Warning"

echo -e "\n${YELLOW}IV Cache Keys (iv:*):${NC}"
ssh $SERVER "redis-cli -a alfalyzer2025redis --scan --pattern 'iv:*' 2>&1 | wc -l"

echo -e "\n${YELLOW}Warming Queue Keys (warming:*):${NC}"
ssh $SERVER "redis-cli -a alfalyzer2025redis --scan --pattern 'warming:*' 2>&1 | wc -l"

echo -e "\n${YELLOW}Redis Memory Usage:${NC}"
ssh $SERVER "redis-cli -a alfalyzer2025redis INFO memory 2>&1 | grep -E 'used_memory_human|used_memory_peak_human' | grep -v Warning"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5. API ENDPOINT TESTING"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo -e "\n${YELLOW}Health Endpoint:${NC}"
ssh $SERVER "curl -s https://128.140.45.28.sslip.io/api/health | jq '.status, .services.redis, .services.apis.fmp'"

echo -e "\n${YELLOW}GICS Sectors Endpoint:${NC}"
ssh $SERVER "curl -s https://128.140.45.28.sslip.io/api/sectors | jq '.total, .totalStocks'"

echo -e "\n${YELLOW}Warming Overview Endpoint (should return NULL - BROKEN):${NC}"
ssh $SERVER "curl -s https://128.140.45.28.sslip.io/api/monitoring/warming/overview | jq '.bandwidth_usage, .cache_coverage'"

echo -e "\n${YELLOW}Method Coverage Endpoint:${NC}"
ssh $SERVER "curl -s https://128.140.45.28.sslip.io/api/monitoring/warming/method-coverage | jq '.data[0:3]'"

echo -e "\n${YELLOW}Cache Status Endpoint (should return NULL - BROKEN):${NC}"
ssh $SERVER "curl -s https://128.140.45.28.sslip.io/api/cache/status | jq '.hit_rate, .total_keys'"

echo -e "\n${YELLOW}IV Chart Endpoint (AAPL) - Performance Test:${NC}"
ssh $SERVER "curl -s -w '\nResponse Time: %{time_total}s\n' https://128.140.45.28.sslip.io/api/iv/AAPL/chart | jq '.ticker, .price, .available_methods | length'"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6. GIT HISTORY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo -e "\n${YELLOW}Last 10 Commits on Server:${NC}"
ssh $SERVER "cd '$BASE_PATH' && git log --oneline -10"

echo -e "\n${YELLOW}Current Git Status:${NC}"
ssh $SERVER "cd '$BASE_PATH' && git status --short"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "7. SYSTEM RESOURCES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo -e "\n${YELLOW}Memory Usage:${NC}"
ssh $SERVER "free -h"

echo -e "\n${YELLOW}Disk Usage:${NC}"
ssh $SERVER "df -h | grep -E 'Filesystem|/$'"

echo -e "\n${YELLOW}Top Node Processes by Memory:${NC}"
ssh $SERVER "ps aux | grep node | grep -v grep | head -5"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "8. DATA FILES VERIFICATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo -e "\n${YELLOW}GICS Sector Mapping File:${NC}"
ssh $SERVER "ls -lh '$BASE_PATH/server/data/gics-sector-mapping.json' 2>&1"

echo -e "\n${YELLOW}Priority Stocks Directory:${NC}"
ssh $SERVER "ls -lh '$BASE_PATH/server/data/priority-stocks/' 2>&1"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "9. CRON JOBS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo -e "\n${YELLOW}Active Cron Jobs (monitoring):${NC}"
ssh $SERVER "crontab -l | grep -E 'warming|monitoring' | grep -v '^#'"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "10. ENVIRONMENT VARIABLES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo -e "\n${YELLOW}Critical ENV Vars (production):${NC}"
ssh $SERVER "cat '$BASE_PATH/.env.production' | grep -E '(FMP_API_KEY|REDIS|SECTOR_WARMING|TOKEN_BUCKET)' | head -5"

echo ""
echo "╔═══════════════════════════════════════════════════════════════════════════════╗"
echo "║                         VALIDATION COMPLETE                                   ║"
echo "╚═══════════════════════════════════════════════════════════════════════════════╝"
echo ""
echo "Full Report: /Users/antoniofrancisco/Documents/teste 1/AGENT_22_PRODUCTION_STATE_REPORT.md"
echo "Quick Summary: /Users/antoniofrancisco/Documents/teste 1/AGENT_22_QUICK_SUMMARY.txt"
echo ""
