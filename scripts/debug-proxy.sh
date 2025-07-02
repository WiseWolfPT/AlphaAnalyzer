#!/bin/bash

# Frontend-Backend Proxy Debug Script
# Usage: ./scripts/debug-proxy.sh

echo "🔧 ALFALYZER PROXY CONFIGURATION DEBUG"
echo "======================================"
echo ""

# Check if servers are running
echo "📊 Server Status Check:"
echo "----------------------"

# Check backend
if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "✅ Backend (3001): Running"
    BACKEND_STATUS=$(curl -s http://localhost:3001/api/health | jq -r '.status' 2>/dev/null || echo "unknown")
    echo "   Status: $BACKEND_STATUS"
else
    echo "❌ Backend (3001): Not running"
    echo "   Fix: Run 'npm run backend' in another terminal"
fi

# Check frontend
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Frontend (3000): Running"
else
    echo "❌ Frontend (3000): Not running"
    echo "   Fix: Run 'npm run frontend' in another terminal"
fi

echo ""

# Test proxy connectivity
echo "🔗 Proxy Connectivity Test:"
echo "---------------------------"

# Test direct backend
echo -n "Direct Backend:     "
if RESPONSE=$(curl -s -w "%{http_code}" http://localhost:3001/api/health 2>/dev/null); then
    HTTP_CODE="${RESPONSE: -3}"
    if [ "$HTTP_CODE" = "200" ]; then
        echo "✅ OK ($HTTP_CODE)"
    else
        echo "❌ Error ($HTTP_CODE)"
    fi
else
    echo "❌ Connection failed"
fi

# Test proxy
echo -n "Proxy Connection:   "
if RESPONSE=$(curl -s -w "%{http_code}" http://localhost:3000/api/health 2>/dev/null); then
    HTTP_CODE="${RESPONSE: -3}"
    if [ "$HTTP_CODE" = "200" ]; then
        echo "✅ OK ($HTTP_CODE)"
    else
        echo "❌ Error ($HTTP_CODE)"
    fi
else
    echo "❌ Connection failed"
fi

echo ""

# Test API endpoints
echo "🎯 API Endpoints Test:"
echo "---------------------"

ENDPOINTS=(
    "health|Health Check"
    "stocks?limit=1|Stocks API"
    "market-indices|Market Data"
)

for endpoint in "${ENDPOINTS[@]}"; do
    IFS='|' read -r path name <<< "$endpoint"
    echo -n "$name: "
    
    if RESPONSE=$(curl -s -w "%{http_code}" "http://localhost:3000/api/$path" 2>/dev/null); then
        HTTP_CODE="${RESPONSE: -3}"
        if [ "$HTTP_CODE" = "200" ]; then
            echo "✅ OK"
        else
            echo "❌ Error ($HTTP_CODE)"
        fi
    else
        echo "❌ Failed"
    fi
done

echo ""

# Environment check
echo "🌍 Environment Configuration:"
echo "-----------------------------"

if [ -f ".env" ]; then
    echo "✅ .env file exists"
    
    # Check key environment variables
    if grep -q "NODE_ENV=development" .env 2>/dev/null; then
        echo "✅ NODE_ENV: development"
    else
        echo "⚠️  NODE_ENV: not set to development"
    fi
    
    if grep -q "PORT=3001" .env 2>/dev/null; then
        echo "✅ Backend PORT: 3001"
    else
        echo "⚠️  Backend PORT: not set to 3001"
    fi
    
    if grep -q "ALLOWED_ORIGINS.*localhost:3000" .env 2>/dev/null; then
        echo "✅ CORS: localhost:3000 allowed"
    else
        echo "⚠️  CORS: localhost:3000 not in ALLOWED_ORIGINS"
    fi
else
    echo "❌ .env file missing"
    echo "   Fix: Copy .env.example to .env and configure"
fi

echo ""

# Process check
echo "🔍 Process Information:"
echo "----------------------"

# Find relevant processes
echo "Backend processes:"
ps aux | grep -E "(tsx.*server|node.*3001)" | grep -v grep | head -3 || echo "  No backend processes found"

echo ""
echo "Frontend processes:"
ps aux | grep -E "(vite.*3000|node.*3000)" | grep -v grep | head -3 || echo "  No frontend processes found"

echo ""

# Port check
echo "🔌 Port Usage:"
echo "-------------"
echo "Port 3000 (Frontend):"
lsof -i :3000 2>/dev/null | tail -n +2 || echo "  Not in use"

echo ""
echo "Port 3001 (Backend):"
lsof -i :3001 2>/dev/null | tail -n +2 || echo "  Not in use"

echo ""

# Configuration files check
echo "📄 Configuration Files:"
echo "-----------------------"

if [ -f "vite.config.ts" ]; then
    if grep -q "proxy.*3001" vite.config.ts 2>/dev/null; then
        echo "✅ vite.config.ts: Proxy configured"
    else
        echo "❌ vite.config.ts: Proxy not configured"
    fi
else
    echo "❌ vite.config.ts: Missing"
fi

if [ -f "package.json" ]; then
    if grep -q '"backend".*tsx.*server' package.json 2>/dev/null; then
        echo "✅ package.json: Backend script found"
    else
        echo "❌ package.json: Backend script missing"
    fi
    
    if grep -q '"frontend".*vite.*3000' package.json 2>/dev/null; then
        echo "✅ package.json: Frontend script found"
    else
        echo "❌ package.json: Frontend script missing"
    fi
else
    echo "❌ package.json: Missing"
fi

echo ""

# Quick fix suggestions
echo "🔧 Quick Fix Commands:"
echo "---------------------"
echo "Start backend:   npm run backend"
echo "Start frontend:  npm run frontend"
echo "Start both:      npm run dev"
echo "Kill processes:  pkill -f 'tsx.*server'; pkill -f 'vite.*3000'"
echo "Check logs:      tail -f backend.log frontend.log"

echo ""

# Final status
BACKEND_OK=false
PROXY_OK=false

if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    BACKEND_OK=true
fi

if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
    PROXY_OK=true
fi

echo "🎯 Final Status:"
echo "---------------"
if $BACKEND_OK && $PROXY_OK; then
    echo "✅ All systems operational!"
    echo "   Frontend: http://localhost:3000"
    echo "   Backend:  http://localhost:3001"
    echo "   API:      http://localhost:3000/api"
elif $BACKEND_OK && ! $PROXY_OK; then
    echo "⚠️  Backend working, proxy issues"
    echo "   Check Vite configuration and restart frontend"
elif ! $BACKEND_OK && $PROXY_OK; then
    echo "⚠️  Proxy working, backend issues"
    echo "   Check backend logs and restart server"
else
    echo "❌ Both systems need attention"
    echo "   Start servers with: npm run dev"
fi

echo ""
echo "For detailed logs, check:"
echo "  Backend:  tail -f backend.log"
echo "  Frontend: tail -f frontend.log"