#!/bin/bash

# 🔥 EMERGENCY STARTUP SCRIPT - SHELL VERSION
# ULTRATHINK PARALLEL EXECUTION for Alfalyzer

echo "🔥 EMERGENCY STARTUP - SHELL VERSION"
echo "================================================"
echo "⚡ Starting Alfalyzer with multiple strategies..."
echo "⚡ Time: $(date)"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if a port is in use
port_in_use() {
    lsof -i ":$1" >/dev/null 2>&1
}

# Function to kill processes on a port
kill_port() {
    echo -e "${YELLOW}🔧 Killing processes on port $1...${NC}"
    lsof -ti ":$1" | xargs kill -9 2>/dev/null || true
}

# Function to test server health
test_server() {
    local port=$1
    local path=${2:-"/api/health"}
    echo -e "${BLUE}🧪 Testing server on port $port...${NC}"
    
    for i in {1..10}; do
        if curl -s "http://localhost:$port$path" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Server on port $port is responding${NC}"
            return 0
        fi
        sleep 1
    done
    
    echo -e "${RED}❌ Server on port $port is not responding${NC}"
    return 1
}

# Clean up existing processes
echo -e "${YELLOW}🧹 Cleaning up existing processes...${NC}"
kill_port 3000
kill_port 3001
kill_port 8080
sleep 2

# Strategy 1: Try main npm dev command
echo -e "${BLUE}🚀 STRATEGY 1: Running main npm dev...${NC}"
if command_exists npm; then
    npm run dev &
    MAIN_PID=$!
    echo -e "${GREEN}✅ Main dev server started (PID: $MAIN_PID)${NC}"
else
    echo -e "${RED}❌ npm not found${NC}"
fi

# Strategy 2: Try emergency Node.js server
echo -e "${BLUE}🚀 STRATEGY 2: Running emergency Node.js server...${NC}"
if command_exists node; then
    node server/emergency-server.cjs &
    EMERGENCY_JS_PID=$!
    echo -e "${GREEN}✅ Emergency Node.js server started (PID: $EMERGENCY_JS_PID)${NC}"
else
    echo -e "${RED}❌ node not found${NC}"
fi

# Strategy 3: Try Python server
echo -e "${BLUE}🚀 STRATEGY 3: Running Python server...${NC}"
if command_exists python3; then
    python3 server/emergency-python-server.py &
    PYTHON_PID=$!
    echo -e "${GREEN}✅ Python server started (PID: $PYTHON_PID)${NC}"
else
    echo -e "${RED}❌ python3 not found${NC}"
fi

# Strategy 4: Try PHP server
echo -e "${BLUE}🚀 STRATEGY 4: Running PHP server...${NC}"
if command_exists php; then
    php -S localhost:3011 server/emergency-php-server.php &
    PHP_PID=$!
    echo -e "${GREEN}✅ PHP server started on port 3011 (PID: $PHP_PID)${NC}"
else
    echo -e "${RED}❌ php not found${NC}"
fi

# Wait for servers to start
echo -e "${YELLOW}⏳ Waiting for servers to initialize...${NC}"
sleep 5

# Test servers
echo -e "${BLUE}🧪 Testing server health...${NC}"
echo "================================================"

WORKING_SERVERS=0

# Test port 3000 (Vite frontend)
if test_server 3000 "/"; then
    echo -e "${GREEN}🌐 Frontend available at: http://localhost:3000${NC}"
    WORKING_SERVERS=$((WORKING_SERVERS + 1))
fi

# Test port 3001 (Backend)
if test_server 3001; then
    echo -e "${GREEN}🔧 Backend API available at: http://localhost:3001/api/health${NC}"
    WORKING_SERVERS=$((WORKING_SERVERS + 1))
fi

# Test port 3011 (PHP server)
if test_server 3011; then
    echo -e "${GREEN}🐘 PHP server available at: http://localhost:3011${NC}"
    WORKING_SERVERS=$((WORKING_SERVERS + 1))
fi

echo "================================================"

if [ $WORKING_SERVERS -gt 0 ]; then
    echo -e "${GREEN}🎉 SUCCESS! $WORKING_SERVERS server(s) are running!${NC}"
    echo ""
    echo -e "${BLUE}📱 Application URLs:${NC}"
    echo "   Frontend: http://localhost:3000"
    echo "   Backend:  http://localhost:3001"
    echo "   Health:   http://localhost:3001/api/health"
    echo "   Stocks:   http://localhost:3001/api/stocks"
    echo ""
    echo -e "${YELLOW}✅ Press Ctrl+C to stop all servers${NC}"
    
    # Keep script running and handle Ctrl+C
    trap 'echo -e "\n${YELLOW}🛑 Stopping all servers...${NC}"; kill $MAIN_PID $EMERGENCY_JS_PID $PYTHON_PID $PHP_PID 2>/dev/null; exit 0' INT
    
    # Wait for user to stop
    while true; do
        sleep 1
    done
else
    echo -e "${RED}❌ NO SERVERS ARE WORKING!${NC}"
    echo ""
    echo -e "${YELLOW}💡 Troubleshooting steps:${NC}"
    echo "1. Check if dependencies are installed: npm install"
    echo "2. Check if ports are free: lsof -i :3000 && lsof -i :3001"
    echo "3. Check .env file exists and has correct PORT=3001"
    echo "4. Try individual servers:"
    echo "   - npm run emergency:js"
    echo "   - npm run emergency:python"
    echo "   - npm run emergency:php"
    
    # Clean up
    kill $MAIN_PID $EMERGENCY_JS_PID $PYTHON_PID $PHP_PID 2>/dev/null
    exit 1
fi