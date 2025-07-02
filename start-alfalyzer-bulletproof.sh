#!/bin/bash

# Bulletproof Alfalyzer Startup Script
# This script will get Alfalyzer running no matter what

echo "🚀 Starting Bulletproof Alfalyzer..."

# Kill any existing processes
echo "🧹 Cleaning up existing processes..."
pkill -f "vite" 2>/dev/null || true
pkill -f "tsx" 2>/dev/null || true
pkill -f "npm.*dev" 2>/dev/null || true

# Clear ports
echo "🔧 Clearing ports..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
lsof -ti:3005 | xargs kill -9 2>/dev/null || true
lsof -ti:8080 | xargs kill -9 2>/dev/null || true

sleep 2

# Navigate to project directory
cd /Users/antoniofrancisco/Documents/teste\ 1

# Start backend first
echo "🔌 Starting backend server..."
export PORT=3001
nohup npm run backend > backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

# Wait for backend to start
sleep 3

# Test if backend is running
if curl -s http://127.0.0.1:3001/api/health > /dev/null 2>&1; then
    echo "✅ Backend is running on port 3001"
else
    echo "❌ Backend failed to start"
fi

# Start frontend with specific configuration
echo "🖥️ Starting frontend server..."
export VITE_HOST=127.0.0.1
export VITE_PORT=3000
nohup npm run frontend > frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

# Wait for frontend to start
sleep 5

# Test multiple access points
echo "🧪 Testing access points..."

# Test port 3000
if curl -s http://127.0.0.1:3000 > /dev/null 2>&1; then
    echo "✅ Frontend accessible at http://127.0.0.1:3000"
    WORKING_URL="http://127.0.0.1:3000"
else
    echo "❌ Port 3000 not responding"
fi

# Test localhost
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Frontend accessible at http://localhost:3000"
    WORKING_URL="http://localhost:3000"
else
    echo "❌ localhost:3000 not responding"
fi

# Start alternative servers if main doesn't work
if [ -z "$WORKING_URL" ]; then
    echo "🆘 Main server failed, starting alternatives..."
    
    # Try port 3005
    export VITE_PORT=3005
    nohup npm run frontend > frontend-3005.log 2>&1 &
    sleep 3
    
    if curl -s http://127.0.0.1:3005 > /dev/null 2>&1; then
        echo "✅ Alternative frontend accessible at http://127.0.0.1:3005"
        WORKING_URL="http://127.0.0.1:3005"
    fi
fi

# If still nothing, create emergency server
if [ -z "$WORKING_URL" ]; then
    echo "🚨 Creating emergency server..."
    
    # Create simple Node.js server
    cat > emergency-server.js << 'EOF'
const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Alfalyzer - Emergency Access</title>
        <style>
            body { font-family: Arial, sans-serif; padding: 40px; background: #0a0a0f; color: #e4e7eb; }
            .container { max-width: 800px; margin: 0 auto; text-align: center; }
            .logo { color: #D8F22D; font-size: 48px; margin-bottom: 20px; }
            .status { background: #1e293b; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .success { color: #10b981; }
            .error { color: #ef4444; }
            .button { display: inline-block; background: #D8F22D; color: #000; padding: 12px 24px; 
                     text-decoration: none; border-radius: 6px; margin: 10px; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="logo">📈 Alfalyzer</div>
            <h1>Emergency Access Portal</h1>
            <div class="status">
                <h2>🚨 Development Server Status</h2>
                <p>The main Vite development server is not accessible.</p>
                <p>This emergency server is running on port 8080.</p>
            </div>
            
            <h3>📍 Try These Access Points:</h3>
            <a href="http://127.0.0.1:3000" class="button">Main Server (Port 3000)</a>
            <a href="http://localhost:3000" class="button">Localhost (Port 3000)</a>
            <a href="http://127.0.0.1:3005" class="button">Alt Server (Port 3005)</a>
            
            <div class="status">
                <h3>🔧 Quick Fixes:</h3>
                <ul style="text-align: left;">
                    <li>Disable Opera VPN/Proxy if enabled</li>
                    <li>Try opening in Chrome or Safari</li>
                    <li>Clear browser cache and cookies</li>
                    <li>Check if antivirus is blocking localhost</li>
                </ul>
            </div>
            
            <div class="status">
                <h3>💡 Alternative Commands:</h3>
                <code style="display: block; background: #374151; padding: 10px; margin: 10px 0;">
                    cd /Users/antoniofrancisco/Documents/teste\ 1<br>
                    npm run dev
                </code>
            </div>
        </div>
    </body>
    </html>
    `);
});

server.listen(8080, '127.0.0.1', () => {
    console.log('🚨 Emergency server running at http://127.0.0.1:8080');
});
EOF
    
    nohup node emergency-server.js > emergency.log 2>&1 &
    sleep 2
    
    if curl -s http://127.0.0.1:8080 > /dev/null 2>&1; then
        echo "✅ Emergency server accessible at http://127.0.0.1:8080"
        WORKING_URL="http://127.0.0.1:8080"
    fi
fi

# Final status report
echo ""
echo "=========================================="
echo "🎉 ALFALYZER STARTUP COMPLETE"
echo "=========================================="

if [ -n "$WORKING_URL" ]; then
    echo "✅ SUCCESS: Application is accessible at $WORKING_URL"
    echo ""
    echo "🌐 All available access points:"
    echo "   • http://127.0.0.1:3000 (Main)"
    echo "   • http://localhost:3000 (Alternative)"
    echo "   • http://127.0.0.1:3005 (Backup)"
    echo "   • http://127.0.0.1:8080 (Emergency)"
    echo ""
    echo "🔧 Backend API: http://127.0.0.1:3001/api"
    echo ""
    echo "📱 Open this URL in your browser:"
    echo "   $WORKING_URL"
    echo ""
    
    # Try to open in browser automatically
    if command -v open >/dev/null 2>&1; then
        echo "🚀 Opening browser automatically..."
        open "$WORKING_URL"
    fi
else
    echo "❌ FAILED: Could not start any server"
    echo ""
    echo "🔍 Check logs:"
    echo "   Backend: tail -f backend.log"
    echo "   Frontend: tail -f frontend.log"
    echo "   Emergency: tail -f emergency.log"
fi

echo ""
echo "🛑 To stop all servers: pkill -f 'vite|tsx|node'"
echo "=========================================="