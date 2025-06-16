#!/bin/bash

echo "🚀 Deploying Alpha Analyzer with 14 Charts..."

# Navigate to project directory
cd "/Users/antoniofrancisco/Documents/teste 1"

echo "📦 Building project..."
npm run build

echo "📝 Committing changes..."
git add -A
git commit -m "feat: implement 14 financial charts similar to Qualtrim with interactive tooltips and responsive design"

echo "🌐 Deploying to Vercel production..."
vercel --prod --force

echo "✅ Deploy complete! Check the URL above."