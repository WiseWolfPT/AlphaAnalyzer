#!/bin/bash
set -e

echo "🚀 Vercel Preview Deployment Script"
echo "=================================="

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel@latest
else
    echo "✅ Vercel CLI is already installed"
fi

# Check for VERCEL_TOKEN
if [ -z "$VERCEL_TOKEN" ]; then
    echo "⚠️  VERCEL_TOKEN not set - using interactive mode"
    echo "   Set VERCEL_TOKEN environment variable for automated deployment"
    VERCEL_ARGS=""
else
    echo "✅ VERCEL_TOKEN found - using automated mode"
    VERCEL_ARGS="--token $VERCEL_TOKEN"
fi

# Ensure build exists
if [ ! -d "client/dist" ]; then
    echo "📦 Building project first..."
    npm run build
fi

echo "🔧 Build size: $(du -sh client/dist/ | cut -f1)"

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
cd client
vercel --prebuilt $VERCEL_ARGS --yes

echo "✅ Preview deployment completed!"
echo "📝 Check output above for preview URL"