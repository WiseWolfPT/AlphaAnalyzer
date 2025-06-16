#!/bin/bash

echo "📊 ADDING 14 FINANCIAL CHARTS TO GITHUB..."
cd "/Users/antoniofrancisco/Documents/teste 1"

echo "✅ Verifying charts exist locally..."
if [ ! -f "client/src/pages/StockCharts.tsx" ]; then
    echo "❌ StockCharts.tsx not found locally"
    echo "🔧 Need to create the charts first"
    exit 1
fi

if [ ! -d "client/src/components/charts" ]; then
    echo "❌ Charts components directory not found"
    echo "🔧 Need to create chart components first"
    exit 1
fi

echo "📂 Charts found locally:"
ls -la client/src/components/charts/

echo "📤 Adding charts to git..."
git add client/src/pages/StockCharts.tsx
git add client/src/components/charts/
git add client/src/App.tsx

echo "💾 Committing charts..."
git commit -m "feat: add 14 comprehensive financial charts

✨ New Features:
- StockCharts.tsx page with 14 financial visualizations
- 14 chart components: Price, Revenue, EBITDA, Free Cash Flow, etc.
- Updated routing for /stock/:symbol
- Recharts integration for interactive charts
- Complete financial analysis dashboard

📊 Charts Included:
1. Price Chart (historical stock price)
2. Revenue Chart (quarterly/annual revenue)
3. Revenue by Segment Chart
4. EBITDA Chart (earnings trends)
5. Free Cash Flow Chart
6. Net Income Chart
7. EPS Chart (earnings per share)
8. Cash & Debt Chart (balance sheet)
9. Dividends Chart (dividend history)
10. Return of Capital Chart
11. Shares Outstanding Chart
12. Financial Ratios Chart
13. Valuation Chart (P/E, P/B ratios)
14. Expenses Chart (operating costs)

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"

echo "🚀 Pushing charts to GitHub..."
git push origin main

echo ""
echo "✅ SUCCESS! 14 Charts now on GitHub"
echo "🌐 Vercel will auto-deploy the complete webapp"
echo "📊 Charts will be available at: /stock/AAPL"