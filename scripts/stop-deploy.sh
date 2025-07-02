#!/bin/bash

# 🛑 ALFALYZER STOP DEPLOY SCRIPT
# Gracefully stops all running services

echo "🛑 Stopping Alfalyzer services..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${YELLOW}[$(date +'%H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Stop processes by PID files
if [ -f "backend.pid" ]; then
    BACKEND_PID=$(cat backend.pid)
    log "Stopping backend (PID: $BACKEND_PID)..."
    kill $BACKEND_PID 2>/dev/null || true
    rm -f backend.pid
    success "Backend stopped"
else
    log "No backend PID file found"
fi

if [ -f "frontend.pid" ]; then
    FRONTEND_PID=$(cat frontend.pid)
    log "Stopping frontend (PID: $FRONTEND_PID)..."
    kill $FRONTEND_PID 2>/dev/null || true
    rm -f frontend.pid
    success "Frontend stopped"
else
    log "No frontend PID file found"
fi

# Force kill by port
log "Force killing processes on ports 3000 and 3001..."
lsof -ti:3001 | xargs -r kill -9 2>/dev/null || true
lsof -ti:3000 | xargs -r kill -9 2>/dev/null || true

# Kill by process name
pkill -f "vite.*3000" 2>/dev/null || true
pkill -f "tsx.*server/index.ts" 2>/dev/null || true
pkill -f "node.*3001" 2>/dev/null || true

success "All services stopped"