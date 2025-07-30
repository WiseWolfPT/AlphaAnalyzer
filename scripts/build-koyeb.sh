#!/bin/bash

# Build script for Koyeb deployment with TypeScript path alias resolution

echo "🏗️ Building Alfalyzer backend for Koyeb..."

# Clean previous builds
echo "🧹 Cleaning dist directory..."
rm -rf dist

# Create dist structure
mkdir -p dist/server dist/shared

# Copy shared files first (needed for imports)
echo "📋 Copying shared files..."
cp -r shared/* dist/shared/

# Compile TypeScript with path resolution
echo "⚡ Compiling TypeScript..."
npx tsc -p tsconfig.server.json

# Fix path aliases in compiled files
echo "🔧 Resolving TypeScript path aliases..."
npx tsc-alias -p tsconfig.server.json

# Copy package files
echo "📦 Preparing package files..."
cp package.json dist/
cp package-lock.json dist/

# Create production package.json with only runtime dependencies
node -e "
const pkg = require('./package.json');
const prodPkg = {
  name: pkg.name,
  version: pkg.version,
  type: 'module',
  scripts: {
    start: 'node server/index.js'
  },
  dependencies: pkg.dependencies
};
require('fs').writeFileSync('./dist/package.json', JSON.stringify(prodPkg, null, 2));
"

# Copy environment files (for reference)
echo "🔐 Copying environment template..."
cat > dist/.env.example << 'EOF'
# Koyeb Environment Variables
NODE_ENV=production
PORT=8000

# API Keys (Set in Koyeb Dashboard)
ALPHA_VANTAGE_API_KEY=
FINNHUB_API_KEY=
FMP_API_KEY=
TWELVE_DATA_API_KEY=
POLYGON_API_KEY=

# Supabase
SUPABASE_URL=
SUPABASE_SERVICE_KEY=

# Frontend URL
VITE_APP_URL=https://alfalyzer.vercel.app
EOF

echo "✅ Build complete! Ready for Koyeb deployment."
echo "📁 Output in: dist/"
ls -la dist/