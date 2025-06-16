#!/bin/bash

echo "🚨 FORCING CORRECT DEPLOYMENT OF 14 CHARTS..."
cd "/Users/antoniofrancisco/Documents/teste 1"

# Create a new commit to force deployment
echo "📝 Creating force deployment commit..."
git add .
git commit -m "force: deploy 14 comprehensive financial charts

🎯 FORCE DEPLOYMENT of correct StockCharts.tsx with:
- 14 financial charts in 4x4 grid layout
- Price, Revenue, EBITDA, Free Cash Flow charts
- Net Income, EPS, Cash/Debt, Dividends charts  
- Return of Capital, Shares, Ratios, Valuation charts
- Expenses chart and chart container
- Complete routing for /stock/:symbol

This should override any old deployment with new charts

🤖 Generated with Claude Code"

# Force push to trigger new deployment
git push origin main --force

echo ""
echo "✅ FORCE DEPLOYMENT TRIGGERED!"
echo "🔄 This should deploy the CORRECT 14 charts"
echo "⏰ Wait 3-5 minutes for complete rebuild"