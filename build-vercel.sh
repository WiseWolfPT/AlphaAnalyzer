#!/bin/bash
set -e

echo "🔨 Starting Vercel build process..."

# Create public directory at root first
mkdir -p public
echo "📁 Created public directory"

# Go to client directory
cd client

# Install dependencies
echo "📦 Installing dependencies..."
npm install --legacy-peer-deps

# Build the project
echo "🏗️ Building project..."
npm run build

# Copy files to public
echo "📋 Copying files to public..."
cp -r dist/* ../public/

# Go back to root
cd ..

echo "✅ Build complete! Files are in public/"
ls -la public/