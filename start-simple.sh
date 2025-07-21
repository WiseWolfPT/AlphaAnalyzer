#!/bin/bash

echo "Starting simple test servers..."

# Kill any existing processes
pkill -f "tsx.*server" || true
pkill -f "vite" || true

# Start backend
echo "Starting backend on port 3001..."
PORT=3001 npx tsx --env-file=.env server/index.ts &
BACKEND_PID=$!

# Wait for backend to start
sleep 5

# Test backend
echo -e "\nTesting backend directly..."
curl -s http://localhost:3001/api/health | jq .

echo -e "\nTesting market data endpoint..."
curl -s http://localhost:3001/api/market-data/quotes/batch?symbols=AAPL,MSFT,GOOGL | head -50

echo -e "\nBackend PID: $BACKEND_PID"
echo "Backend running on http://localhost:3001"
echo "Press Ctrl+C to stop..."

# Keep script running
wait $BACKEND_PID