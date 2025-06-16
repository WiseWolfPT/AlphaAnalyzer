#!/bin/bash

echo "🔧 FIXING ROUTING FOR 14 CHARTS..."
cd "/Users/antoniofrancisco/Documents/teste 1"

# Add the corrected App.tsx with proper routing
echo "📝 Adding routing for StockCharts..."
git add client/src/App.tsx

# Commit the routing fix
git commit -m "fix: add routing for StockCharts page with 14 financial charts

- Add /stock/:symbol route to access comprehensive charts
- Enable navigation to 14-chart financial analysis page
- Fix missing route configuration that prevented chart access

🤖 Generated with Claude Code"

# Push the fix
git push origin main

echo ""
echo "✅ ROUTING FIXED!"
echo "🔄 Vercel will now redeploy with working routes"
echo "🎯 Charts will be available at: /stock/AAPL"
echo ""
echo "⏰ Wait 2-3 minutes then test again!"