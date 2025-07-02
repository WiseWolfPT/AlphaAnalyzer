#!/bin/bash

# ALFALYZER ROBUST STARTUP SCRIPT
# Coordinated Agents Solution for Deployment Stability

set -e

echo "🚀 ALFALYZER STARTUP SEQUENCE INITIATED"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to kill processes on ports
cleanup_ports() {
    log "Cleaning up ports 3000 and 3001..."
    
    # Kill processes on port 3000
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    
    # Kill processes on port 3001
    lsof -ti:3001 | xargs kill -9 2>/dev/null || true
    
    # Wait for cleanup
    sleep 2
    
    success "Ports cleaned up"
}

# Function to check if port is free
check_port() {
    local port=$1
    if lsof -i:$port > /dev/null 2>&1; then
        return 1
    else
        return 0
    fi
}

# Function to validate environment
validate_environment() {
    log "Validating environment..."
    
    # Check if .env exists
    if [ ! -f .env ]; then
        warning ".env file not found, creating from template..."
        if [ -f .env.template ]; then
            cp .env.template .env
            success "Created .env from template"
        else
            error ".env.template not found"
            exit 1
        fi
    fi
    
    # Check if node_modules exists
    if [ ! -d node_modules ]; then
        warning "node_modules not found, installing dependencies..."
        npm install --legacy-peer-deps
        success "Dependencies installed"
    fi
    
    # Check database
    if [ ! -f dev.db ]; then
        warning "Database not found, initializing..."
        npm run db:setup 2>/dev/null || true
        success "Database initialized"
    fi
    
    success "Environment validation complete"
}

# Function to start backend
start_backend() {
    log "Starting backend server..."
    
    # Start backend in background
    PORT=3001 npm run backend > backend.log 2>&1 &
    BACKEND_PID=$!
    
    # Wait for backend to start
    local attempts=0
    local max_attempts=30
    
    while [ $attempts -lt $max_attempts ]; do
        if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
            success "Backend server started successfully (PID: $BACKEND_PID)"
            echo $BACKEND_PID > backend.pid
            return 0
        fi
        
        sleep 1
        attempts=$((attempts + 1))
        
        if ! kill -0 $BACKEND_PID 2>/dev/null; then
            error "Backend process died"
            cat backend.log
            return 1
        fi
    done
    
    error "Backend failed to start within 30 seconds"
    cat backend.log
    return 1
}

# Function to start frontend
start_frontend() {
    log "Starting frontend server..."
    
    # Start frontend in background
    npm run frontend > frontend.log 2>&1 &
    FRONTEND_PID=$!
    
    # Wait for frontend to start
    local attempts=0
    local max_attempts=30
    
    while [ $attempts -lt $max_attempts ]; do
        if curl -s http://localhost:3000 > /dev/null 2>&1; then
            success "Frontend server started successfully (PID: $FRONTEND_PID)"
            echo $FRONTEND_PID > frontend.pid
            return 0
        fi
        
        sleep 1
        attempts=$((attempts + 1))
        
        if ! kill -0 $FRONTEND_PID 2>/dev/null; then
            error "Frontend process died"
            cat frontend.log
            return 1
        fi
    done
    
    error "Frontend failed to start within 30 seconds"
    cat frontend.log
    return 1
}

# Function to monitor services
monitor_services() {
    log "Starting service monitoring..."
    
    while true; do
        # Check backend
        if [ -f backend.pid ]; then
            if ! kill -0 $(cat backend.pid) 2>/dev/null || ! curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
                warning "Backend service down, restarting..."
                start_backend
            fi
        fi
        
        # Check frontend
        if [ -f frontend.pid ]; then
            if ! kill -0 $(cat frontend.pid) 2>/dev/null || ! curl -s http://localhost:3000 > /dev/null 2>&1; then
                warning "Frontend service down, restarting..."
                start_frontend
            fi
        fi
        
        sleep 10
    done
}

# Function to handle shutdown
shutdown() {
    log "Shutting down Alfalyzer..."
    
    # Kill backend
    if [ -f backend.pid ]; then
        kill $(cat backend.pid) 2>/dev/null || true
        rm -f backend.pid
    fi
    
    # Kill frontend
    if [ -f frontend.pid ]; then
        kill $(cat frontend.pid) 2>/dev/null || true
        rm -f frontend.pid
    fi
    
    # Clean up ports
    cleanup_ports
    
    success "Alfalyzer shut down successfully"
    exit 0
}

# Trap signals for graceful shutdown
trap shutdown SIGINT SIGTERM

# Main execution
main() {
    log "Starting Alfalyzer deployment..."
    
    # Step 1: Cleanup
    cleanup_ports
    
    # Step 2: Validate environment
    validate_environment
    
    # Step 3: Start backend
    if ! start_backend; then
        error "Failed to start backend"
        exit 1
    fi
    
    # Step 4: Start frontend
    if ! start_frontend; then
        error "Failed to start frontend"
        exit 1
    fi
    
    # Step 5: Show status
    success "🎉 ALFALYZER FULLY OPERATIONAL!"
    echo ""
    echo "📱 Frontend: http://localhost:3000"
    echo "🔧 Backend:  http://localhost:3001"
    echo "💊 Health:   http://localhost:3001/api/health"
    echo ""
    log "Press Ctrl+C to stop all services"
    
    # Step 6: Monitor services
    monitor_services
}

# Run main function
main "$@"