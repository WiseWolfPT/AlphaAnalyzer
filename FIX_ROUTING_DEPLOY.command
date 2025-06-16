#!/bin/bash

# Manual deployment to fix routing issue
# Double-click this file to deploy

echo "🚀 Fixing routing issue and deploying..."
echo ""

# Navigate to project directory
cd "/Users/antoniofrancisco/Documents/teste 1"

echo "📁 Current Git Status:"
git status

echo ""
echo "📁 Adding all changes..."
git add .

echo ""
echo "💾 Committing routing fix..."
git commit -m "fix: ensure AdvancedCharts component and routing are properly deployed

- Fix missing route /stock/:symbol/charts 
- Ensure AdvancedCharts.tsx is properly built
- Update all chart component imports
- Resolve 'Did you forget to add the page to the router?' error

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"

echo ""
echo "📤 Pushing to GitHub..."
git push origin main

echo ""
echo "✅ DEPLOYMENT COMPLETE!"
echo ""
echo "🌐 Test in 2-3 minutes at:"
echo "   https://stock-analysis-app-sigma.vercel.app/stock/AAPL/charts"
echo ""
echo "If still not working, check Vercel deployment logs"
echo ""
echo "Press any key to close..."
read -n 1