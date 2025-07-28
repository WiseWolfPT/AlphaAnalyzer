#!/bin/bash

echo "🔧 Fixing Koyeb Deployment for API-only mode"
echo "============================================"

# Make scripts executable
chmod +x koyeb-api-server.js
chmod +x koyeb-production-server.js

echo "✅ Scripts made executable"

# Show deployment instructions
echo ""
echo "📋 DEPLOYMENT INSTRUCTIONS:"
echo ""
echo "1. KOYEB CONFIGURATION:"
echo "   - Use 'node koyeb-api-server.js' as start command"
echo "   - Or let Dockerfile handle it automatically"
echo ""
echo "2. REQUIRED ENVIRONMENT VARIABLES ON KOYEB:"
echo "   NODE_ENV=production"
echo "   SERVE_STATIC=false"
echo "   VITE_APP_URL=https://alfalyzer.vercel.app"
echo "   ALLOWED_ORIGINS=https://alfalyzer.vercel.app,https://alfalyzer-*.vercel.app"
echo ""
echo "3. API KEYS (add all your keys):"
echo "   ALPHA_VANTAGE_API_KEY=xxx"
echo "   FINNHUB_API_KEY=xxx"
echo "   FMP_API_KEY=xxx"
echo "   TWELVE_DATA_API_KEY=xxx"
echo "   POLYGON_API_KEY=xxx"
echo "   SUPABASE_URL=xxx"
echo "   SUPABASE_SERVICE_ROLE_KEY=xxx"
echo ""
echo "4. VERCEL FRONTEND CONFIGURATION:"
echo "   VITE_API_URL=https://crucial-ivonne-alfalyzer-90666a9e.koyeb.app"
echo "   VITE_SUPABASE_URL=xxx"
echo "   VITE_SUPABASE_ANON_KEY=xxx"
echo ""
echo "✅ The 'index.html not found' error is EXPECTED!"
echo "   Backend should NOT serve frontend files."
echo ""
echo "🚀 Ready to deploy!"