#!/bin/bash

# Deploy script to fix production issues
# Run this AFTER running fix-cors-production.sh

SERVER="root@128.140.45.28"
PROJECT_DIR="/home/teste 1"

echo "🚀 Deploying CORS fix to production..."

# 1. Build the project locally
echo "📦 Building project..."
npm run build

# 2. Copy updated cors.ts to server
echo "📤 Copying cors.ts to server..."
scp server/middleware/cors.ts "$SERVER:$PROJECT_DIR/server/middleware/"

# 3. SSH and rebuild on server
echo "🔧 Rebuilding on server..."
ssh "$SERVER" << 'REMOTE'
cd "/home/teste 1"

# Install dependencies if needed
npm install

# Build the project
npm run build

# Copy frontend files to correct location
echo "📁 Copying frontend files..."
mkdir -p dist/public
cp -r client/dist/public/* dist/public/

# Note: Environment variables should already be configured on server
# This script does not overwrite .env.production to preserve secrets
echo "📝 Note: Using existing .env.production on server"
echo "   If you need to update environment variables,"
echo "   edit them directly on the server at: /home/teste 1/.env.production"

# Restart PM2
echo "🔄 Restarting PM2..."
pm2 restart alfalyzer --update-env
pm2 save

# Check status
echo "📊 Checking status..."
pm2 status
sleep 2

# Test endpoints
echo ""
echo "🧪 Testing endpoints..."
echo "Backend health:"
curl -s http://localhost:3001/api/health | head -c 200
echo ""
echo ""
echo "Frontend via HTTPS:"
curl -I https://128.140.45.28.sslip.io/ 2>/dev/null | head -n 3

REMOTE

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📌 URLs to test:"
echo "   HTTPS: https://128.140.45.28.sslip.io/"
echo "   HTTP:  http://128.140.45.28/"
echo ""
echo "🔍 To check logs:"
echo "   ssh $SERVER"
echo "   pm2 logs alfalyzer --lines 100"
