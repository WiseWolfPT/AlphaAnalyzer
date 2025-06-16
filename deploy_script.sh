#!/bin/bash

echo "🎯 DEPLOYING 14 FINANCIAL CHARTS"
echo "================================="

# Navigate to project directory
cd "/Users/antoniofrancisco/Documents/teste 1"
echo "📍 Working directory: $(pwd)"

# Create and switch to deploy branch
echo "🔧 Creating deploy branch..."
git checkout -B fix/stock-charts-deploy 2>/dev/null || git checkout fix/stock-charts-deploy

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build project
echo "🏗️ Building project..."
npm run build

# Check if build succeeded
if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
else
    echo "❌ Build failed! Stopping deployment."
    exit 1
fi

# Commit changes
echo "📝 Committing changes..."
git add -A
git commit -m "feat: complete 14-chart stock analysis deployment

- StockCharts.tsx with all 14 financial charts (Price, Revenue, Revenue Segments, EBITDA, FCF, Net Income, EPS, Cash&Debt, Dividends, ROC, Shares, Ratios, Valuation, Expenses)
- Fixed routing: /stock/:symbol -> StockCharts component
- Environment variables using VITE_ prefix
- Chart container IDs for validation
- Ready for production deployment

🚀 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"

# Merge to main
echo "🔀 Merging to main..."
git checkout main
git merge fix/stock-charts-deploy

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
vercel --prod --force

echo ""
echo "✅ DEPLOYMENT COMPLETE!"
echo "🎯 Test URL: /stock/AAPL should show all 14 charts"
echo "📊 Charts: Price, Revenue, Revenue Segments, EBITDA, FCF, Net Income, EPS, Cash&Debt, Dividends, ROC, Shares, Ratios, Valuation, Expenses"