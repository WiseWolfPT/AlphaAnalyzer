#!/bin/bash
set -e

echo "🚀 DEPLOYING 14-CHART STOCK ANALYSIS WEBAPP"

# Work in current directory
cd "/Users/antoniofrancisco/Documents/teste 1"

# Install dependencies
npm install

# Build
npm run build

# Deploy
vercel --prod --force

echo "✅ Deploy complete"