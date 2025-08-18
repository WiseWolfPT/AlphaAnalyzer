#!/bin/bash

# 🚀 ALFALYZER FRONTEND DEPLOYMENT SCRIPT FOR HETZNER
# Execute este script NO SERVIDOR Hetzner

echo "================================================"
echo "🚀 ALFALYZER FRONTEND DEPLOYMENT"
echo "================================================"

# Navigate to project directory
cd "/home/teste 1" || exit 1

echo "📁 Current directory: $(pwd)"

# Step 1: Build the frontend
echo ""
echo "🔨 Step 1: Building frontend..."
echo "================================================"
npm run build

# Check if build was successful
if [ ! -d "dist/public" ]; then
    echo "❌ Build failed! dist/public directory not created"
    echo "Trying alternative build command..."
    npx vite build --outDir dist/public
fi

# Step 2: Verify build files
echo ""
echo "📝 Step 2: Verifying build files..."
echo "================================================"
if [ -f "dist/public/index.html" ]; then
    echo "✅ index.html found"
else
    echo "❌ index.html NOT found - build failed!"
    exit 1
fi

if [ -d "dist/public/assets" ]; then
    ASSET_COUNT=$(ls -1 dist/public/assets | wc -l)
    echo "✅ Assets directory found with $ASSET_COUNT files"
else
    echo "❌ Assets directory NOT found - build incomplete!"
    exit 1
fi

# Step 3: Restart PM2
echo ""
echo "🔄 Step 3: Restarting PM2..."
echo "================================================"
pm2 restart all
sleep 3

# Step 4: Check PM2 status
echo ""
echo "📊 Step 4: Checking PM2 status..."
echo "================================================"
pm2 status

# Step 5: Test frontend access
echo ""
echo "🧪 Step 5: Testing frontend access..."
echo "================================================"
echo "Testing local access..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/)
if [ "$RESPONSE" = "200" ]; then
    echo "✅ Frontend responding on localhost:3001"
else
    echo "⚠️ Frontend returned status: $RESPONSE"
fi

# Step 6: Check for HTML content
echo ""
echo "🔍 Step 6: Verifying HTML content..."
echo "================================================"
HTML_CHECK=$(curl -s http://localhost:3001/ | head -n 5)
if [[ "$HTML_CHECK" == *"<!DOCTYPE html>"* ]]; then
    echo "✅ HTML content verified"
else
    echo "⚠️ Unexpected response - checking logs..."
    pm2 logs --lines 20
fi

# Step 7: Final status
echo ""
echo "================================================"
echo "📋 DEPLOYMENT SUMMARY"
echo "================================================"
echo "✅ Build completed: dist/public/"
echo "✅ PM2 restarted"
echo ""
echo "🌐 Access your application at:"
echo "   - Internal: http://localhost:3001"
echo "   - External: http://128.140.45.28:3001"
echo "   - Alternative: http://128-140-45-28.nip.io:3001"
echo ""
echo "📝 Next steps:"
echo "   1. Open browser and test: http://128.140.45.28:3001"
echo "   2. If not working, check: pm2 logs --lines 50"
echo "   3. For detailed logs: pm2 logs --err"
echo ""
echo "🔒 SECURITY REMINDER:"
echo "   - Configure firewall: sudo ufw allow 3001/tcp"
echo "   - Setup HTTPS with Nginx"
echo "   - Install Redis: sudo apt install redis-server"
echo "================================================"