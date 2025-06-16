#!/bin/bash

# Test local server to verify charts work
cd "/Users/antoniofrancisco/Documents/teste 1"

echo "🧪 Testing local server..."

# Install and build
npm install
npm run build

# Start simple server
echo "Starting server on http://localhost:3000"
echo "Test these URLs:"
echo "• http://localhost:3000 (Landing page)"
echo "• http://localhost:3000/dashboard (Dashboard)"
echo "• http://localhost:3000/stock/AAPL (Charts page)"
echo ""
echo "Press Ctrl+C to stop server"

# Simple HTTP server
cd dist/public && python3 -m http.server 3000