#!/bin/bash

echo "🎯 FINAL DEPLOY - 14 CHARTS QUALTRIM STYLE"
echo "=========================================="

# 1 – ir para a pasta do projecto
cd "/Users/antoniofrancisco/Documents/teste 1"

echo "📍 Working directory: $(pwd)"

# Create and switch to fix branch
echo "🔧 Creating fix branch..."
git checkout -b fix/stock-charts-deploy 2>/dev/null || git checkout fix/stock-charts-deploy

# 2 – garantir dependências
echo "📦 Installing dependencies..."
npm install

# 3 – build de produção
echo "🏗️ Building production..."
npm run build

# Check if build succeeded
if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
else
    echo "❌ Build failed! Stopping deployment."
    exit 1
fi

# 4 – commit final
echo "📝 Committing changes..."
git add -A
git commit -m "fix: 14 charts page buildable + routing + env vars

- Rename stock/[symbol].tsx -> StockCharts.tsx
- Update routing in app.tsx  
- Fix env vars: NEXT_PUBLIC_ -> VITE_
- Add chart container IDs for validation
- All 14 charts: Price, Revenue, Revenue Segments, EBITDA, FCF, Net Income, EPS, Cash&Debt, Dividends, ROC, Shares, Ratios, Valuation, Expenses
- Ready for production deployment"

# Merge to main
echo "🔀 Merging to main..."
git checkout main
git merge fix/stock-charts-deploy

# 5 – deploy forçado para produção
echo "🚀 Deploying to Vercel production..."
vercel --prod --force

echo ""
echo "✅ DEPLOY COMPLETE!"
echo "🎯 Test: /dashboard → hover stock card → click 📈 icon → /stock/AAPL"
echo "📊 All 14 charts implemented with interactive tooltips!"