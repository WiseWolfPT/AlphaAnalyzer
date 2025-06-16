#!/bin/bash

echo "🔄 UPDATING GITHUB WITH COMPLETE WEBAPP + 14 CHARTS..."
cd "/Users/antoniofrancisco/Documents/teste 1"

# Remove old remote if exists
git remote remove origin 2>/dev/null || true

# Connect to your GitHub repo
echo "📡 Connecting to WiseWolfPT/AlphaAnalyzer..."
git remote add origin https://github.com/WiseWolfPT/AlphaAnalyzer.git

# Force push the complete updated code
echo "📤 Pushing COMPLETE webapp with 14 charts..."
echo "   • Landing page (Portuguese)"
echo "   • Dashboard with stocks" 
echo "   • 14 financial charts (Price, Revenue, EBITDA, etc.)"
echo "   • StockCharts.tsx page"
echo "   • All chart components"
echo "   • Routing for /stock/:symbol"

git push -f origin main

echo ""
echo "✅ GITHUB UPDATED WITH COMPLETE WEBAPP!"
echo ""
echo "🌐 Now GitHub has:"
echo "   • client/src/pages/StockCharts.tsx ✅"
echo "   • client/src/components/charts/ (14 charts) ✅"
echo "   • Route /stock/:symbol ✅"
echo "   • Portuguese landing page ✅"
echo "   • Complete dashboard ✅"
echo ""
echo "🚀 Next: Deploy to Vercel"
echo "   Your Vercel will now auto-update with the complete webapp!"