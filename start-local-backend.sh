#!/bin/bash

# Start AlphaAnalyzer Backend Locally
# Use this if Coolify deployment fails

echo "🚀 Starting AlphaAnalyzer Backend Locally"
echo "========================================"

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found"
    echo "Please create .env file with required environment variables"
    exit 1
fi

# Kill any existing processes on port 3001
echo "🔧 Cleaning up existing processes..."
lsof -ti:3001 | xargs kill -9 2>/dev/null || true

# Build the application
echo "🏗️  Building application..."
npm run build

# Start the backend
echo "🚀 Starting backend on port 3001..."
npm run backend &

# Wait for backend to start
sleep 5

# Test if backend is running
if curl -s http://localhost:3001/api/health > /dev/null; then
    echo "✅ Backend is running at http://localhost:3001"
    echo "✅ API health check passed"
    echo ""
    echo "🌐 To expose locally for testing:"
    echo "   Option 1: ngrok http 3001"
    echo "   Option 2: localtunnel --port 3001"
    echo ""
    echo "📝 Update VITE_API_URL in frontend to use the tunnel URL"
else
    echo "❌ Backend failed to start"
    echo "Check logs above for errors"
fi

# Keep script running
echo ""
echo "Press Ctrl+C to stop the backend"
wait