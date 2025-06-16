#!/bin/bash

echo "🔥 SOLUÇÃO DEFINITIVA - Vamos resolver isto AGORA!"
echo ""

# Install Vercel CLI if not installed
echo "📦 Installing Vercel CLI..."
npm install -g vercel

echo ""
echo "🚀 Direct deployment to Vercel..."
cd "/Users/antoniofrancisco/Documents/teste 1"

# Deploy directly using Vercel CLI
echo "🎯 Deploying directly to Vercel (this will work!)..."
vercel --prod --yes

echo ""
echo "✅ DEPLOYMENT COMPLETE!"
echo ""
echo "🌐 Your app should now be live at the Vercel URL provided above"
echo "🎯 Test: https://your-vercel-url.vercel.app/stock/AAPL/charts"
echo ""
echo "This bypasses the GitHub auto-deploy issue completely!"