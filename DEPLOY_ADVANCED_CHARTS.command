#!/bin/bash

# Auto-deployment script for Advanced Charts
# Double-click this file to deploy automatically

echo "🚀 Auto-deploying Advanced Charts solution..."
echo ""

# Navigate to project directory
cd "/Users/antoniofrancisco/Documents/teste 1"

# Add all changes
echo "📁 Adding files..."
git add .

# Commit changes
echo "💾 Committing advanced charts implementation..."
git commit -m "feat: implement advanced charts with dual-page solution

- Add AdvancedCharts.tsx with 14 comprehensive financial charts
- Create new route /stock/:symbol/charts for advanced analysis  
- Add 'View Advanced Charts' button to stock detail page
- Preserve existing functionality at /stock/:symbol
- Implement 4x4 grid layout matching Qualtrim design
- Include navigation between overview and advanced charts

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"

# Push to GitHub
echo "📤 Pushing to GitHub..."
git push origin main

echo ""
echo "✅ DEPLOYMENT COMPLETE!"
echo ""
echo "🌐 Test in 2-3 minutes:"
echo "   • Original: https://stock-analysis-app-sigma.vercel.app/stock/AAPL"
echo "   • Advanced: https://stock-analysis-app-sigma.vercel.app/stock/AAPL/charts"
echo ""
echo "🎯 Look for the 'View Advanced Charts' button!"
echo ""
echo "Press any key to close..."
read -n 1