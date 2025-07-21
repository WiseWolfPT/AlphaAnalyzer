#!/bin/bash

# Koyeb Container Debug Script
# This script helps identify what's actually in your Koyeb container

echo "=== KOYEB CONTAINER DEBUG ==="
echo "Current Date: $(date)"
echo "Hostname: $(hostname)"
echo ""

echo "=== SYSTEM INFO ==="
echo "User: $(whoami)"
echo "Home: $HOME"
echo "PWD: $(pwd)"
echo "Node Version: $(node -v 2>/dev/null || echo 'Node not found')"
echo "NPM Version: $(npm -v 2>/dev/null || echo 'NPM not found')"
echo ""

echo "=== ENVIRONMENT VARIABLES ==="
echo "PORT: $PORT"
echo "NODE_ENV: $NODE_ENV"
echo "All ENV vars (filtered):"
env | grep -v -E "(SECRET|KEY|PASSWORD)" | sort
echo ""

echo "=== DIRECTORY STRUCTURE ==="
echo "Files in current directory:"
ls -la
echo ""

echo "=== CHECKING FOR COMMON PATHS ==="
paths=(
  "package.json"
  "server/index.js"
  "server/server.js"
  "dist/index.js"
  "dist/server.js"
  "build/index.js"
  "build/server.js"
  "index.js"
  "server.js"
  "app.js"
  "client/dist/index.html"
  "client/build/index.html"
  "public/index.html"
)

for path in "${paths[@]}"; do
  if [ -f "$path" ]; then
    echo "✓ Found: $path ($(stat -c%s "$path" 2>/dev/null || stat -f%z "$path" 2>/dev/null) bytes)"
  else
    echo "✗ Missing: $path"
  fi
done
echo ""

echo "=== PACKAGE.JSON CONTENT ==="
if [ -f "package.json" ]; then
  cat package.json
else
  echo "package.json not found!"
fi
echo ""

echo "=== CHECKING NODE_MODULES ==="
if [ -d "node_modules" ]; then
  echo "node_modules exists with $(find node_modules -maxdepth 1 -type d | wc -l) packages"
  echo "Top 10 packages:"
  ls node_modules | head -10
else
  echo "node_modules directory not found!"
fi
echo ""

echo "=== ATTEMPTING TO FIND ENTRY POINT ==="
if [ -f "package.json" ]; then
  echo "Scripts from package.json:"
  node -e "console.log(JSON.stringify(require('./package.json').scripts, null, 2))" 2>/dev/null || echo "Failed to parse package.json"
  
  echo ""
  echo "Main entry point:"
  node -e "console.log(require('./package.json').main || 'Not specified')" 2>/dev/null || echo "Failed to read main"
fi
echo ""

echo "=== DIRECTORY TREE (max depth 3) ==="
if command -v tree &> /dev/null; then
  tree -L 3 -I 'node_modules'
else
  echo "Tree command not available, using find instead:"
  find . -type d -not -path './node_modules*' -not -path './.git*' | head -50
fi
echo ""

echo "=== END DEBUG OUTPUT ==="