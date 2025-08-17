#!/bin/bash

# Alfalyzer Deployment Script for Hetzner VPS
# Last updated: 2025-08-17

set -e  # Exit on error

echo "🚀 Alfalyzer Deployment Script"
echo "================================"

# Server configuration
SERVER_IP="128.140.45.28"
SERVER_USER="root"
PROJECT_PATH="/home/teste 1"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}⚠️  This script will deploy Alfalyzer to production server${NC}"
echo "Server: $SERVER_IP"
echo "Path: $PROJECT_PATH"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled"
    exit 1
fi

# Step 1: Build locally
echo -e "\n${GREEN}📦 Building frontend locally...${NC}"
npm run build

# Step 2: Create deployment archive
echo -e "\n${GREEN}📦 Creating deployment archive...${NC}"
tar -czf alfalyzer-deploy.tar.gz \
    dist/ \
    server/ \
    shared/ \
    package.json \
    package-lock.json \
    ecosystem.config.cjs \
    .env.production \
    --exclude="node_modules" \
    --exclude="*.log" \
    --exclude=".git"

# Step 3: Upload to server
echo -e "\n${GREEN}📤 Uploading to server...${NC}"
scp alfalyzer-deploy.tar.gz $SERVER_USER@$SERVER_IP:/tmp/

# Step 4: Deploy on server
echo -e "\n${GREEN}🚀 Deploying on server...${NC}"
ssh $SERVER_USER@$SERVER_IP << 'ENDSSH'
set -e

cd "/home/teste 1"

# Backup current deployment
echo "📦 Creating backup..."
timestamp=$(date +%Y%m%d-%H%M%S)
tar -czf "backup-$timestamp.tar.gz" dist/ server/ shared/ .env.production 2>/dev/null || true

# Extract new deployment
echo "📦 Extracting new deployment..."
tar -xzf /tmp/alfalyzer-deploy.tar.gz

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --production

# Stop current deployment
echo "🛑 Stopping current deployment..."
pm2 stop all || true

# Start new deployment
echo "✅ Starting new deployment..."
pm2 start ecosystem.config.cjs --env production

# Save PM2 configuration
pm2 save

# Clean up
rm -f /tmp/alfalyzer-deploy.tar.gz

# Check status
echo "📊 Deployment status:"
pm2 status

echo "✅ Deployment complete!"
ENDSSH

# Clean up local archive
rm -f alfalyzer-deploy.tar.gz

echo -e "\n${GREEN}✅ Deployment successful!${NC}"
echo ""
echo "🔗 Access your application at:"
echo "   http://$SERVER_IP"
echo "   http://128-140-45-28.nip.io"
echo ""
echo "📝 Next steps:"
echo "1. Add real API keys to .env.production on server"
echo "2. Restart backend: ssh $SERVER_USER@$SERVER_IP 'pm2 restart all'"
echo "3. Check logs: ssh $SERVER_USER@$SERVER_IP 'pm2 logs --lines 50'"