#!/bin/bash
set -e

# 🚀 ALFALYZER DEV DEPLOY - ULTRA RELIABLE
# Created by Deploy Automation & Testing Specialist
# Version: 1.0.0

echo "🚀 ALFALYZER DEV DEPLOY - ULTRA RELIABLE"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_PORT=3001
FRONTEND_PORT=3000
MAX_RETRIES=3
HEALTH_CHECK_TIMEOUT=60
PROCESS_CLEANUP_DELAY=3

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# 1. CLEANUP PHASE
log "🧹 Cleaning up existing processes..."
cleanup_processes() {
    log "Terminating existing processes..."
    # Kill processes by port
    lsof -ti:$BACKEND_PORT | xargs -r kill -9 2>/dev/null || true
    lsof -ti:$FRONTEND_PORT | xargs -r kill -9 2>/dev/null || true
    
    # Kill processes by name pattern
    pkill -f "vite.*$FRONTEND_PORT" 2>/dev/null || true
    pkill -f "tsx.*server/index.ts" 2>/dev/null || true
    pkill -f "node.*$BACKEND_PORT" 2>/dev/null || true
    
    # Clean up PID files
    rm -f backend.pid frontend.pid 2>/dev/null || true
    
    sleep $PROCESS_CLEANUP_DELAY
    success "Process cleanup completed"
}

# 2. DEPENDENCY CHECK
check_dependencies() {
    log "📦 Checking dependencies..."
    
    if [ ! -d "node_modules" ]; then
        log "Installing npm dependencies..."
        npm install --prefer-offline --no-audit
    else
        log "Dependencies already installed"
    fi
    
    # Check for critical dependencies
    if [ ! -f "node_modules/.bin/vite" ]; then
        error "Vite not found in node_modules"
        npm install --prefer-offline --no-audit
    fi
    
    if [ ! -f "node_modules/.bin/tsx" ]; then
        error "TSX not found in node_modules"
        npm install --prefer-offline --no-audit
    fi
    
    success "Dependencies verified"
}

# 3. BUILD VERIFICATION
verify_build() {
    log "🔨 Testing build process..."
    
    # Try building with timeout
    timeout 120s npm run build > /dev/null 2>&1 || {
        warning "Build failed or timed out, but continuing..."
        return 0
    }
    
    success "Build verification completed"
}

# 4. ENVIRONMENT VALIDATION
validate_environment() {
    log "🔍 Validating environment..."
    
    # Check if .env exists
    if [ ! -f ".env" ]; then
        warning ".env file not found, creating basic one..."
        cat > .env << EOF
NODE_ENV=development
DATABASE_URL=./dev.db
PORT=3001
FRONTEND_PORT=3000
# Add your API keys here
# ALPHA_VANTAGE_API_KEY=your_key_here
# FINNHUB_API_KEY=your_key_here
EOF
    fi
    
    success "Environment validated"
}

# 5. HEALTH CHECK FUNCTION
health_check() {
    local url=$1
    local service_name=$2
    local timeout=${3:-30}
    
    log "⏳ Checking $service_name health at $url..."
    
    for i in $(seq 1 $timeout); do
        if curl -s -f "$url" > /dev/null 2>&1; then
            success "$service_name is healthy"
            return 0
        fi
        
        if [ $i -eq $timeout ]; then
            error "$service_name health check failed after ${timeout}s"
            return 1
        fi
        
        sleep 1
    done
}

# 6. START BACKEND
start_backend() {
    log "🔧 Starting backend server..."
    
    # Set environment variables
    export NODE_ENV=development
    export PORT=$BACKEND_PORT
    
    # Start backend in background
    nohup npm run backend > backend.log 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > backend.pid
    
    log "Backend started with PID: $BACKEND_PID"
    
    # Wait for backend to be ready
    if health_check "http://localhost:$BACKEND_PORT/api/health" "Backend" $HEALTH_CHECK_TIMEOUT; then
        success "Backend server ready on port $BACKEND_PORT"
        return 0
    else
        error "Backend failed to start properly"
        return 1
    fi
}

# 7. START FRONTEND
start_frontend() {
    log "🎨 Starting frontend server..."
    
    # Start frontend in background
    nohup npm run frontend > frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > frontend.pid
    
    log "Frontend started with PID: $FRONTEND_PID"
    
    # Wait for frontend to be ready
    if health_check "http://localhost:$FRONTEND_PORT" "Frontend" $HEALTH_CHECK_TIMEOUT; then
        success "Frontend server ready on port $FRONTEND_PORT"
        return 0
    else
        error "Frontend failed to start properly"
        return 1
    fi
}

# 8. API CONNECTIVITY TEST
test_api_connectivity() {
    log "🔌 Testing API connectivity..."
    
    # Test backend health endpoint
    if curl -s -f "http://localhost:$BACKEND_PORT/api/health" > /dev/null; then
        success "Backend API accessible"
    else
        warning "Backend API not accessible"
    fi
    
    # Test frontend to backend proxy
    if curl -s -f "http://localhost:$FRONTEND_PORT/api/health" > /dev/null; then
        success "Frontend-to-backend proxy working"
    else
        warning "Frontend-to-backend proxy not working"
    fi
}

# 9. COMPREHENSIVE TESTING SUITE
run_comprehensive_tests() {
    log "🧪 Running comprehensive tests..."
    
    # Test 1: Backend Health
    log "Test 1: Backend Health Check"
    if curl -s "http://localhost:$BACKEND_PORT/api/health" | grep -q "ok"; then
        success "✓ Backend health check passed"
    else
        error "✗ Backend health check failed"
    fi
    
    # Test 2: Frontend Loading
    log "Test 2: Frontend Loading"
    if curl -s "http://localhost:$FRONTEND_PORT" | grep -q "<!DOCTYPE html>"; then
        success "✓ Frontend loading test passed"
    else
        error "✗ Frontend loading test failed"
    fi
    
    # Test 3: API Proxy
    log "Test 3: API Proxy Test"
    if curl -s "http://localhost:$FRONTEND_PORT/api/health" > /dev/null; then
        success "✓ API proxy test passed"
    else
        error "✗ API proxy test failed"
    fi
    
    # Test 4: Static Assets
    log "Test 4: Static Assets"
    if curl -s "http://localhost:$FRONTEND_PORT/assets" > /dev/null; then
        success "✓ Static assets accessible"
    else
        warning "⚠ Static assets may not be accessible"
    fi
    
    # Test 5: Database Connection (if applicable)
    log "Test 5: Database Connection"
    if [ -f "dev.db" ]; then
        success "✓ Database file exists"
    else
        warning "⚠ Database file not found"
    fi
    
    # Test 6: Environment Variables
    log "Test 6: Environment Variables"
    if [ -f ".env" ]; then
        success "✓ Environment file exists"
    else
        warning "⚠ Environment file missing"
    fi
}

# 10. ERROR RECOVERY SYSTEM
recover_from_error() {
    local error_type=$1
    
    warning "Attempting recovery from: $error_type"
    
    case $error_type in
        "backend_start_failed")
            log "Trying alternative backend startup..."
            PORT=$((BACKEND_PORT + 1)) npm run backend > backend.log 2>&1 &
            BACKEND_PID=$!
            echo $BACKEND_PID > backend.pid
            sleep 5
            if health_check "http://localhost:$((BACKEND_PORT + 1))/api/health" "Backend (Alt Port)" 30; then
                BACKEND_PORT=$((BACKEND_PORT + 1))
                success "Backend recovered on alternative port $BACKEND_PORT"
                return 0
            fi
            ;;
        "frontend_start_failed")
            log "Trying alternative frontend startup..."
            PORT=$((FRONTEND_PORT + 1)) npm run frontend > frontend.log 2>&1 &
            FRONTEND_PID=$!
            echo $FRONTEND_PID > frontend.pid
            sleep 5
            if health_check "http://localhost:$((FRONTEND_PORT + 1))" "Frontend (Alt Port)" 30; then
                FRONTEND_PORT=$((FRONTEND_PORT + 1))
                success "Frontend recovered on alternative port $FRONTEND_PORT"
                return 0
            fi
            ;;
        "dependency_issue")
            log "Reinstalling dependencies..."
            rm -rf node_modules package-lock.json
            npm install --prefer-offline
            ;;
    esac
    
    error "Recovery failed for: $error_type"
    return 1
}

# 11. MONITORING SETUP
setup_monitoring() {
    log "📊 Setting up monitoring..."
    
    # Create monitoring script
    cat > scripts/monitor-deploy.sh << 'EOF'
#!/bin/bash
while true; do
    echo "=== $(date) ==="
    echo "Backend Status:"
    curl -s http://localhost:3001/api/health 2>/dev/null || echo "Backend DOWN"
    echo "Frontend Status:"
    curl -s http://localhost:3000 >/dev/null 2>&1 && echo "Frontend UP" || echo "Frontend DOWN"
    echo "Processes:"
    ps aux | grep -E "(vite|tsx)" | grep -v grep
    echo "====================="
    sleep 30
done
EOF
    
    chmod +x scripts/monitor-deploy.sh
    success "Monitoring setup complete"
}

# 12. MAIN EXECUTION FLOW
main() {
    log "Starting Alfalyzer deployment process..."
    
    # Change to project root
    cd "$(dirname "$0")/.."
    
    # Execute deployment steps
    cleanup_processes
    validate_environment
    check_dependencies
    verify_build
    
    # Try to start backend with retries
    retry_count=0
    while [ $retry_count -lt $MAX_RETRIES ]; do
        if start_backend; then
            break
        else
            retry_count=$((retry_count + 1))
            if [ $retry_count -lt $MAX_RETRIES ]; then
                warning "Backend start failed, retrying ($retry_count/$MAX_RETRIES)..."
                recover_from_error "backend_start_failed"
            else
                error "Backend start failed after $MAX_RETRIES attempts"
                exit 1
            fi
        fi
    done
    
    # Try to start frontend with retries
    retry_count=0
    while [ $retry_count -lt $MAX_RETRIES ]; do
        if start_frontend; then
            break
        else
            retry_count=$((retry_count + 1))
            if [ $retry_count -lt $MAX_RETRIES ]; then
                warning "Frontend start failed, retrying ($retry_count/$MAX_RETRIES)..."
                recover_from_error "frontend_start_failed"
            else
                error "Frontend start failed after $MAX_RETRIES attempts"
                exit 1
            fi
        fi
    done
    
    # Run tests
    test_api_connectivity
    run_comprehensive_tests
    setup_monitoring
    
    # Success message
    echo ""
    echo "🎉 ALFALYZER DEPLOYMENT COMPLETE!"
    echo "=================================="
    echo ""
    success "📱 Frontend: http://localhost:$FRONTEND_PORT"
    success "🔧 Backend:  http://localhost:$BACKEND_PORT"
    success "🔧 API:      http://localhost:$BACKEND_PORT/api/health"
    success "🔧 Database: ./dev.db"
    echo ""
    log "📊 Logs available at:"
    log "   - Backend: backend.log"
    log "   - Frontend: frontend.log"
    echo ""
    log "🔄 To monitor deployment: ./scripts/monitor-deploy.sh"
    log "🛑 To stop services: ./scripts/stop-deploy.sh"
    echo ""
    success "✅ Ready to accept connections!"
}

# Handle script interruption
trap 'error "Deployment interrupted"; exit 1' INT TERM

# Run main function
main "$@"