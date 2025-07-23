#!/bin/bash

echo "🔧 Fixing Vercel Proxy Configuration"
echo "===================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "\n${YELLOW}IMPORTANT: This script will help you fix the Vercel proxy issues${NC}"
echo -e "${YELLOW}Make sure you have the Vercel CLI installed: npm i -g vercel${NC}\n"

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${RED}❌ Vercel CLI is not installed. Please install it first:${NC}"
    echo "   npm install -g vercel"
    exit 1
fi

echo -e "${GREEN}✅ Vercel CLI found${NC}\n"

# Instructions for manual steps
echo -e "${YELLOW}Manual Steps Required:${NC}"
echo -e "1. Remove VITE_API_URL from Vercel environment variables:"
echo -e "   ${GREEN}vercel env rm VITE_API_URL production${NC}"
echo -e "   ${GREEN}vercel env rm VITE_API_URL preview${NC}"
echo -e "   ${GREEN}vercel env rm VITE_API_URL development${NC}\n"

echo -e "2. Verify no VITE_API_URL is set:"
echo -e "   ${GREEN}vercel env ls${NC}\n"

echo -e "3. Redeploy the application:"
echo -e "   ${GREEN}vercel --prod${NC}\n"

echo -e "${YELLOW}Why this fixes the issue:${NC}"
echo -e "- VITE_API_URL causes the client to bypass the Vercel proxy"
echo -e "- Without it, the client uses relative paths (/api/*)"
echo -e "- Vercel proxy rewrites /api/* to your Koyeb backend"
echo -e "- This avoids CORS issues and ensures proper routing\n"

echo -e "${YELLOW}Testing after deployment:${NC}"
echo -e "1. Open browser DevTools Network tab"
echo -e "2. Visit your site: https://alfalyzerpro4.vercel.app"
echo -e "3. Check that API calls go to /api/* (not direct Koyeb URLs)"
echo -e "4. Verify no CORS errors in console\n"

echo -e "${GREEN}Configuration already updated:${NC}"
echo -e "✅ Removed VITE_API_URL from .env.production"
echo -e "✅ Fixed Vercel deployment detection"
echo -e "✅ Simplified proxy rewrite rules"
echo -e "✅ Added proper CORS headers\n"

echo -e "${YELLOW}If issues persist, check:${NC}"
echo -e "- Koyeb backend is running and accessible"
echo -e "- No hardcoded URLs in the code"
echo -e "- Browser cache is cleared\n"