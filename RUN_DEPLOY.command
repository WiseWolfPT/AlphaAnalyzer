#!/bin/bash

echo "🚀 AUTO-DEPLOYING 14-CHART STOCK ANALYSIS"
echo "========================================"

cd "/Users/antoniofrancisco/Documents/teste 1"

# Set environment variables
export VITE_FINNHUB_API_KEY=${VITE_FINNHUB_API_KEY:-demo}
export VITE_ALPHA_VANTAGE_API_KEY=${VITE_ALPHA_VANTAGE_API_KEY:-demo}

echo "📍 Working in: $(pwd)"

# Create deployment branch
git checkout -B fix/stock-charts-deploy

# Install and build
npm install
npm run build || { echo "❌ Build failed"; exit 1; }

# Commit
git add -A
git commit -m "fix: 14 charts page buildable + routing + env vars"

# Merge to main
git checkout main
git merge --no-edit fix/stock-charts-deploy

# Deploy
echo "🌐 Deploying to Vercel..."
NEW_URL=$(vercel --prod --force | tail -1 | grep -o 'https://[^[:space:]]*')

# Validate
sleep 5
HTML=$(curl -s "${NEW_URL}/stock/AAPL" 2>/dev/null)
if echo "$HTML" | grep -q 'id="price-chart"'; then
    echo "✅ Deploy OK → ${NEW_URL}"
else
    echo "❌ HTML validation failed"
    echo "URL: ${NEW_URL}"
fi