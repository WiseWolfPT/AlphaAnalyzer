#!/bin/bash

echo "🚀 Starting Alfalyzer Development Servers (Separate Mode)"
echo "This avoids the HMR port conflict issue"
echo ""

# Kill any existing processes
echo "🧹 Cleaning up old processes..."
pkill -f "vite" 2>/dev/null
pkill -f "tsx.*server/index.ts" 2>/dev/null
sleep 2

# Start backend
echo "🔷 Starting Backend on port 3001..."
VITE_DISABLED=true PORT=3001 npx tsx --env-file=.env server/index.ts &
BACKEND_PID=$!

# Wait for backend to start
sleep 5

# Start frontend without HMR on port 3001
echo "🔶 Starting Frontend on port 3000..."
npx vite --port 3000 --host &
FRONTEND_PID=$!

echo ""
echo "✅ Servers started!"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for Ctrl+C
trap "echo '🛑 Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT
wait