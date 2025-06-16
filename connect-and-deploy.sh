#!/bin/bash

echo "🔗 CONNECTING TO YOUR GITHUB REPO..."
cd "/Users/antoniofrancisco/Documents/teste 1"

# Connect to your existing GitHub repo
echo "📡 Connecting to WiseWolfPT/AlphaAnalyzer..."
git remote add origin https://github.com/WiseWolfPT/AlphaAnalyzer.git

# Push the complete webapp
echo "📤 Pushing complete webapp with charts..."
git push -u origin main

echo ""
echo "🎉 SUCCESS! Your webapp is now on GitHub!"
echo ""
echo "🌐 Next: Connect to Vercel"
echo "   1. Go to https://vercel.com"
echo "   2. Click 'New Project'"
echo "   3. Import: WiseWolfPT/AlphaAnalyzer"
echo "   4. Deploy!"
echo ""
echo "✨ Result: https://alpha-analyzer-xxx.vercel.app"
echo "   • Landing page (Portuguese)"
echo "   • Dashboard with stocks"
echo "   • 14 financial charts"
echo "   • Auto-updates on every change"
echo ""
echo "🔄 Future updates: just run ./auto-deploy.sh"