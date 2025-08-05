#!/bin/bash

echo "🧪 Testing Emergency Server Locally..."
echo "=================================="

# Set test port
export PORT=3001

# Test emergency server
echo "Starting emergency server on port $PORT..."
timeout 5 node emergency-server.js &
SERVER_PID=$!

# Wait for server to start
sleep 2

# Test endpoints
echo ""
echo "Testing endpoints:"
echo -n "/ endpoint: "
curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT/
echo ""

echo -n "/health endpoint: "
curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT/health
echo ""

echo -n "/debug endpoint: "
curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT/debug
echo ""

# Kill the server
kill $SERVER_PID 2>/dev/null

echo ""
echo "✅ Test complete! If you see 200 status codes above, the server works!"
echo ""
echo "To deploy to Coolify, use this run command:"
echo "  node emergency-server.js"