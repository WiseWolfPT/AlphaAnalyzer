#!/bin/bash

# 🚀 Alfalyzer Deploy Script - Hetzner Production
# Automated deployment without GitHub Actions

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting Alfalyzer Deployment to Hetzner${NC}"
echo "=================================="

# Step 1: Build
echo -e "${YELLOW}📦 Building production bundle...${NC}"
npm run build
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build successful!${NC}"
else
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi

# Step 2: Upload to server
echo -e "${YELLOW}📤 Uploading files to server...${NC}"
rsync -avz --delete \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude '.env.local' \
    --exclude '*.log' \
    dist/ root@128.140.45.28:"/home/teste 1/dist/"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Files uploaded successfully!${NC}"
else
    echo -e "${RED}❌ Upload failed!${NC}"
    exit 1
fi

# Step 3: Restart PM2 on server
echo -e "${YELLOW}🔄 Restarting PM2 process...${NC}"
ssh root@128.140.45.28 "cd '/home/teste 1' && pm2 restart alfalyzer && pm2 status"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ PM2 restarted successfully!${NC}"
else
    echo -e "${RED}❌ PM2 restart failed!${NC}"
    exit 1
fi

# Step 4: Verify deployment
echo -e "${YELLOW}🔍 Verifying deployment...${NC}"
sleep 5  # Wait for server to start

response=$(curl -s -o /dev/null -w "%{http_code}" https://128.140.45.28.sslip.io/ || echo "000")
if [ "$response" = "200" ]; then
    echo -e "${GREEN}✅ Site is live and responding!${NC}"
    echo -e "${GREEN}🎉 DEPLOYMENT SUCCESSFUL!${NC}"
    echo "=================================="
    echo -e "🌐 Production URL: ${GREEN}https://128.140.45.28.sslip.io/${NC}"
else
    echo -e "${RED}⚠️  Site returned status code: $response${NC}"
    echo "Check the server logs: ssh root@128.140.45.28 'pm2 logs alfalyzer'"
fi

echo "=================================="
echo -e "${GREEN}Deployment completed at $(date)${NC}"
