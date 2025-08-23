#!/bin/bash

echo "🚀 ALFALYZER PRODUCTION FIX - DEPLOY SCRIPT"
echo "=========================================="

# Configuration
SERVER_IP="128.140.45.28"
SERVER_USER="root"
REMOTE_DIR="/home/teste 1"
LOCAL_DIR="/Users/antoniofrancisco/Documents/teste 1"

echo "📦 Building production files..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build successful!"

echo "📤 Uploading dist folder to server..."
rsync -avz --delete \
    "$LOCAL_DIR/dist/" \
    "$SERVER_USER@$SERVER_IP:$REMOTE_DIR/dist/"

if [ $? -ne 0 ]; then
    echo "❌ Upload failed!"
    exit 1
fi

echo "✅ Files uploaded successfully!"

echo "🔄 Restarting PM2 on server..."
ssh "$SERVER_USER@$SERVER_IP" "cd '$REMOTE_DIR' && pm2 restart alfalyzer --update-env"

if [ $? -ne 0 ]; then
    echo "❌ PM2 restart failed!"
    exit 1
fi

echo "✅ PM2 restarted successfully!"

echo "🌐 Testing production site..."
sleep 3
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://128.140.45.28.sslip.io/)

if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ Site is accessible! HTTP Status: $HTTP_STATUS"
    echo "🎉 DEPLOYMENT SUCCESSFUL!"
    echo ""
    echo "🔗 Access your site at: https://128.140.45.28.sslip.io/"
    echo "📊 Dashboard: https://128.140.45.28.sslip.io/find-stocks"
else
    echo "⚠️  Site returned HTTP Status: $HTTP_STATUS"
    echo "Check logs with: ssh $SERVER_USER@$SERVER_IP 'pm2 logs alfalyzer --lines 50'"
fi

echo ""
echo "📋 Next steps:"
echo "1. Test find-stocks page: https://128.140.45.28.sslip.io/find-stocks"
echo "2. Check PM2 status: ssh $SERVER_USER@$SERVER_IP 'pm2 status'"
echo "3. View logs if needed: ssh $SERVER_USER@$SERVER_IP 'pm2 logs alfalyzer'"