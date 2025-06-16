#!/bin/bash

echo "🚀 FIXING 404 - DEPLOYING WEBAPP NOW..."
echo ""

cd "/Users/antoniofrancisco/Documents/teste 1"

# Check if remote exists
if git remote get-url origin 2>/dev/null; then
    echo "✅ GitHub remote already configured"
else
    echo "🔗 Setting up GitHub remote..."
    echo "⚠️  You need to replace YOUR_USERNAME with your actual GitHub username:"
    echo "git remote add origin https://github.com/YOUR_USERNAME/alpha-analyzer-webapp.git"
    echo ""
    echo "Or if you want me to help create the GitHub repo, let me know!"
    exit 1
fi

# Push to GitHub
echo "📤 Pushing complete webapp to GitHub..."
git push -u origin main

echo ""
echo "🎉 DONE! Vercel will now auto-deploy your webapp"
echo ""
echo "🌐 In 2-3 minutes, your site will be live at:"
echo "   https://alpha-analyzer-webapp.vercel.app"
echo ""
echo "✨ What you'll see:"
echo "   • Landing page (Portuguese) - /"
echo "   • Stock dashboard - /dashboard"  
echo "   • 14 financial charts - /stock/AAPL"
echo "   • All responsive + dark theme"
echo ""
echo "🔄 For future changes, just run: ./auto-deploy.sh"