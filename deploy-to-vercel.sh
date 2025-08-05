#!/bin/bash

# Deploy Frontend to Vercel Script
# This script helps deploy the AlphaAnalyzer frontend to Vercel

echo "🚀 AlphaAnalyzer Frontend Deployment to Vercel"
echo "============================================="

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm i -g vercel
fi

# Check if we're in the right directory
if [ ! -f "vercel.json" ]; then
    echo "❌ Error: vercel.json not found. Are you in the project root?"
    exit 1
fi

echo "📋 Pre-deployment checklist:"
echo "✅ vercel.json configured to point to Coolify backend"
echo "✅ Build command set to: npm run build:client"
echo "✅ Output directory set to: dist"

echo ""
echo "⚠️  IMPORTANT: Before deploying, ensure you have:"
echo "1. Created a Vercel account"
echo "2. Configured environment variables in Vercel dashboard:"
echo "   - VITE_SUPABASE_URL"
echo "   - VITE_SUPABASE_ANON_KEY"

echo ""
read -p "Have you completed the above steps? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 Starting Vercel deployment..."
    
    # Deploy to Vercel
    vercel --prod
    
    echo ""
    echo "✅ Deployment initiated!"
    echo "📱 Check your deployment at: https://vercel.com/dashboard"
else
    echo "❌ Deployment cancelled. Please complete the setup steps first."
    echo "📖 Refer to VERCEL_ENV_SETUP.md for detailed instructions."
fi