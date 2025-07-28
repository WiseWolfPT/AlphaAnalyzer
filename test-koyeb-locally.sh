#!/bin/bash

echo "🧪 Testing Koyeb server locally..."
echo "================================"

# Test with Koyeb's default port
export PORT=8000
export NODE_ENV=production

echo "📍 Testing with PORT=$PORT"

# Start server in background
node koyeb-server-fixed.js &
SERVER_PID=$!

# Wait for server to start
sleep 3

# Test health endpoint
echo "🏥 Testing health endpoint..."
curl -s http://localhost:$PORT/health | jq

# Test with different port
echo ""
echo "📍 Testing with PORT=3001"
kill $SERVER_PID 2>/dev/null
export PORT=3001
node koyeb-server-fixed.js &
SERVER_PID=$!
sleep 3
curl -s http://localhost:$PORT/health | jq

# Cleanup
kill $SERVER_PID 2>/dev/null

echo ""
echo "✅ Local tests complete!"