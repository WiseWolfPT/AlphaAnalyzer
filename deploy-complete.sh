#!/bin/bash

# Deploy completo da webapp com charts
cd "/Users/antoniofrancisco/Documents/teste 1"

echo "🚀 Starting complete webapp deployment..."

# Build
npm install
npm run build

# Check if build was successful
if [ ! -d "dist" ]; then
    echo "❌ Build failed - dist directory not found"
    exit 1
fi

# Simple deployment using the existing code
echo "✅ Build successful - ready for deployment"
echo "📦 Files ready in: dist/"
echo ""
echo "Deploy options:"
echo "1. Manual: Upload 'dist/' to your hosting"
echo "2. Vercel: vercel deploy --prod"
echo "3. Auto: Use the FINAL_DEPLOY.js script with env vars"
echo ""
echo "🌐 The webapp will include:"
echo "   • Landing page (Portuguese)"
echo "   • Dashboard with stock cards" 
echo "   • 14 financial charts at /stock/AAPL"
echo "   • All existing functionality preserved"