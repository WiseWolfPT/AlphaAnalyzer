#!/bin/bash

# Production Build Script for AlphaAnalyzer
# Ensures all required files are in dist/public

echo "🏗️  Building AlphaAnalyzer for production..."

# Clean dist directory
echo "🧹 Cleaning dist directory..."
rm -rf dist

# Build client
echo "⚡ Building client with Vite..."
npm run build:client

# Copy required static files
echo "📁 Copying required static files..."
cp client/public/sw.js dist/public/sw.js
cp client/public/manifest.json dist/public/manifest.json
cp -r client/public/locales dist/public/

# Copy icons
echo "🎨 Copying PWA icons..."
cp client/public/icon-*.png dist/public/ 2>/dev/null || true
cp client/public/favicon.png dist/public/ 2>/dev/null || true
cp client/public/apple-touch-icon.png dist/public/ 2>/dev/null || true

# Verify build
echo "✅ Verifying build output..."
if [ -f "dist/public/index.html" ] && [ -f "dist/public/sw.js" ] && [ -f "dist/public/manifest.json" ]; then
    echo "✅ Build successful!"
    echo "📁 Build output in: dist/public/"
    ls -la dist/public/ | head -10
else
    echo "❌ Build failed - missing required files"
    exit 1
fi