#!/bin/bash

# Quick deploy to fix 404 error
echo "🚀 Quick Deploy - Fixing 404 Error..."

cd "/Users/antoniofrancisco/Documents/teste 1"

# Check if we have the webapp code
if [ ! -f "client/src/App.tsx" ]; then
    echo "❌ Error: App.tsx not found"
    exit 1
fi

# Initialize git and add all files
echo "📁 Adding all webapp files..."
git init
git add .

# First commit with all the webapp code
git commit -m "feat: complete Alpha Analyzer webapp with 14 financial charts

✨ Features:
- Portuguese landing page with modern design  
- Real-time stock dashboard with intrinsic value
- 14 comprehensive financial charts (Price, Revenue, EBITDA, etc.)
- Responsive design with dark theme
- API integration with Finnhub + Alpha Vantage

🔧 Tech Stack:
- React + TypeScript + Vite
- Tailwind CSS + Recharts
- Wouter routing
- Mock data for demo

🎯 Pages:
- / (Landing page)
- /dashboard (Stock dashboard) 
- /stock/AAPL (14 charts example)

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"

echo "✅ Initial commit created"

# Instructions for user
echo ""
echo "🎯 NEXT STEPS TO FIX THE 404:"
echo ""
echo "1. Connect to GitHub (if not done):"
echo "   git remote add origin https://github.com/YOUR_USERNAME/alpha-analyzer-webapp.git"
echo ""
echo "2. Push the code:"
echo "   git push -u origin main"
echo ""
echo "3. Vercel will auto-deploy and fix the 404!"
echo ""
echo "🌐 Your site will then show:"
echo "   • Landing page at: alpha-analyzer-webapp.vercel.app"
echo "   • Dashboard at: alpha-analyzer-webapp.vercel.app/dashboard"  
echo "   • Charts at: alpha-analyzer-webapp.vercel.app/stock/AAPL"
echo ""
echo "💡 If you need the GitHub repo created first, I can help with that!"