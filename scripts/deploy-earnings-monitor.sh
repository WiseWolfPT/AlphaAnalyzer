#!/bin/bash
# Deploy Earnings Monitor Worker to Production
# Usage: ./scripts/deploy-earnings-monitor.sh

set -e

echo "======================================"
echo "Earnings Monitor Worker Deployment"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
SERVER="root@128.140.45.28"
REMOTE_PATH="/home/teste 1"

echo -e "${YELLOW}[1/6]${NC} Building server and workers..."
npm run build:server

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Build failed!${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Build complete${NC}"
echo ""

echo -e "${YELLOW}[2/6]${NC} Creating deployment tarball..."
cd dist
tar czf /tmp/earnings-monitor-deploy.tar.gz server/workers/earnings-monitor.cjs
cd ..

echo -e "${GREEN}✅ Tarball created${NC}"
echo ""

echo -e "${YELLOW}[3/6]${NC} Uploading to production server..."
scp /tmp/earnings-monitor-deploy.tar.gz "${SERVER}:/tmp/"
scp ecosystem.config.cjs "${SERVER}:${REMOTE_PATH}/"

echo -e "${GREEN}✅ Upload complete${NC}"
echo ""

echo -e "${YELLOW}[4/6]${NC} Extracting on server..."
ssh "${SERVER}" "cd '${REMOTE_PATH}/dist' && tar xzf /tmp/earnings-monitor-deploy.tar.gz"

echo -e "${GREEN}✅ Extraction complete${NC}"
echo ""

echo -e "${YELLOW}[5/6]${NC} Starting earnings-monitor worker with PM2..."
ssh "${SERVER}" "cd '${REMOTE_PATH}' && pm2 start ecosystem.config.cjs --only earnings-monitor --update-env && pm2 save"

echo -e "${GREEN}✅ Worker started${NC}"
echo ""

echo -e "${YELLOW}[6/6]${NC} Validating deployment..."
sleep 3

# Check health endpoint
echo "Checking health endpoint..."
ssh "${SERVER}" "curl -s http://localhost:3005/health | jq '.status'"

# Check PM2 status
echo ""
echo "PM2 Status:"
ssh "${SERVER}" "pm2 list | grep earnings-monitor"

echo ""
echo -e "${GREEN}======================================"
echo "✅ Deployment Complete!"
echo "======================================${NC}"
echo ""
echo "Health endpoint: http://localhost:3005/health"
echo "Logs: pm2 logs earnings-monitor"
echo ""
echo "Next steps:"
echo "1. Monitor first cycle: ssh ${SERVER} 'tail -f ${REMOTE_PATH}/logs/earnings-monitor-out.log'"
echo "2. Check health: ssh ${SERVER} 'curl http://localhost:3005/health | jq'"
echo "3. Validate bandwidth: Check logs for 'Bandwidth report'"
echo ""
