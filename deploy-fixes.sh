#!/bin/bash

echo "🚀 Alfalyzer Deployment Fix Script"
echo "=================================="
echo ""

# Check git status
echo "📋 Current git status:"
git status --short

echo ""
echo "🔧 Files created for deployment fix:"
echo "  - koyeb-server-fixed.js (Fixed Koyeb server)"
echo "  - railway-server.js (Railway optimized server)"
echo "  - railway.toml (Railway configuration)"
echo "  - test-koyeb-locally.sh (Local test script)"
echo "  - DEPLOYMENT_FIX_GUIDE.md (Complete guide)"
echo ""

# Offer to commit
read -p "📦 Commit these deployment fixes? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    git add koyeb-server-fixed.js railway-server.js railway.toml test-koyeb-locally.sh DEPLOYMENT_FIX_GUIDE.md package.json
    git commit -m "fix: Complete deployment fixes for Koyeb and Railway

- Add koyeb-server-fixed.js with proper PORT handling
- Add railway-server.js optimized for Railway
- Update package.json start scripts
- Add deployment configuration files
- Add comprehensive deployment guide

Fixes #deployment-issues"
    
    echo ""
    echo "✅ Changes committed!"
    echo ""
    read -p "🚀 Push to remote? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]
    then
        git push origin phase-0-main
        echo "✅ Pushed to remote!"
    fi
fi

echo ""
echo "📋 Next Steps:"
echo ""
echo "Option 1: Fix Koyeb (Complex)"
echo "  1. Go to Koyeb dashboard"
echo "  2. Update start command to: npm start"
echo "  3. Ensure PORT is not hardcoded in settings"
echo "  4. Redeploy"
echo ""
echo "Option 2: Switch to Railway (RECOMMENDED)"
echo "  1. Sign up at railway.app"
echo "  2. New Project > Deploy from GitHub"
echo "  3. Select your repo"
echo "  4. Add environment variables"
echo "  5. Deploy!"
echo ""
echo "Option 3: Try Render.com"
echo "  1. Sign up at render.com"
echo "  2. New > Web Service"
echo "  3. Connect GitHub"
echo "  4. Deploy with free tier"
echo ""
echo "📖 See DEPLOYMENT_FIX_GUIDE.md for detailed instructions"
echo ""
echo "🆘 If still having issues:"
echo "  - Test locally with: ./test-koyeb-locally.sh"
echo "  - Check logs in deployment platform"
echo "  - Verify all environment variables are set"
echo ""