#!/bin/bash

echo "🚀 Deploying Advanced Charts Solution..."

# Change to project directory
cd "/Users/antoniofrancisco/Documents/teste 1"

# Check current status
echo "📊 Current git status:"
git status

# Stage all changes
echo "📦 Staging changes..."
git add .

# Create commit
echo "💾 Creating commit..."
git commit -m "feat: implement advanced charts with dual-page solution

- Add AdvancedCharts.tsx with 14 comprehensive financial charts
- Create new route /stock/:symbol/charts for advanced analysis
- Add 'View Advanced Charts' button to stock detail page
- Preserve existing functionality at /stock/:symbol
- Implement 4x4 grid layout matching Qualtrim design
- Include navigation between overview and advanced charts

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"

# Push to remote
echo "🌐 Pushing to remote..."
git push origin main

echo "✅ Deployment complete!"
echo "🔗 Vercel will auto-deploy the changes"
echo ""
echo "📋 Test these URLs after deployment:"
echo "  - /stock/AAPL → Original charts (preserved functionality)"
echo "  - /stock/AAPL/charts → New 14 advanced charts"
echo ""
echo "🎯 Features implemented:"
echo "  ✓ 14 advanced financial charts in 4x4 grid"
echo "  ✓ Dual-page solution preserving existing functionality"
echo "  ✓ 'View Advanced Charts' button with gradient styling"
echo "  ✓ Navigation between overview and advanced charts"
echo "  ✓ Qualtrim-style layout and design"