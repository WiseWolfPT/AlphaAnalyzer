#!/bin/bash

echo "🚀 DEPLOYING ALPHA ANALYZER WITH 14 CHARTS..."
echo "================================================"

# Navigate to project directory
cd "/Users/antoniofrancisco/Documents/teste 1"

echo "📍 Current directory: $(pwd)"
echo ""

echo "📦 Building project..."
npm run build

echo ""
echo "📝 Committing changes..."
git add -A
git commit -m "feat: implement 14 financial charts similar to Qualtrim - Price, Revenue, EBITDA, FCF, Net Income, EPS, Cash&Debt, Dividends, ROC, Shares, Ratios, Valuation, Expenses with interactive tooltips"

echo ""
echo "🌐 Deploying to Vercel production..."
vercel --prod --force

echo ""
echo "✅ DEPLOY COMPLETE!"
echo "🎯 Test the charts: Go to /dashboard → hover stock card → click 📈 icon"
echo "📊 View charts at: /stock/AAPL (all 14 charts implemented!)"