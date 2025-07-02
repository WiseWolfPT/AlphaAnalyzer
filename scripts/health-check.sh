#!/bin/bash

# 🏥 ALFALYZER HEALTH CHECK SYSTEM
# Comprehensive health monitoring and diagnostics

echo "🏥 ALFALYZER HEALTH CHECK SYSTEM"
echo "================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
BACKEND_PORT=3001
FRONTEND_PORT=3000

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

# Health check function
check_service() {
    local url=$1
    local service_name=$2
    local timeout=${3:-5}
    
    if timeout $timeout curl -s -f "$url" > /dev/null 2>&1; then
        success "$service_name is healthy"
        return 0
    else
        error "$service_name is not responding"
        return 1
    fi
}

# Detailed service check
detailed_service_check() {
    local url=$1
    local service_name=$2
    
    log "Checking $service_name at $url..."
    
    # Check if port is open
    if nc -z localhost ${url##*:} 2>/dev/null; then
        success "Port ${url##*:} is open"
        
        # Check HTTP response
        response=$(curl -s -w "HTTP_CODE:%{http_code};TIME:%{time_total}" "$url" 2>/dev/null || echo "FAILED")
        
        if [[ $response == *"HTTP_CODE:200"* ]]; then
            time=$(echo $response | grep -o "TIME:[0-9.]*" | cut -d: -f2)
            success "$service_name responding (${time}s)"
        else
            error "$service_name not responding properly"
            echo "Response: $response"
        fi
    else
        error "Port ${url##*:} is not open"
    fi
}

# Process check
check_processes() {
    log "Checking running processes..."
    
    # Check for backend process
    if pgrep -f "tsx.*server/index.ts" > /dev/null; then
        BACKEND_PID=$(pgrep -f "tsx.*server/index.ts")
        success "Backend process running (PID: $BACKEND_PID)"
    else
        error "Backend process not found"
    fi
    
    # Check for frontend process
    if pgrep -f "vite.*--port 3000" > /dev/null; then
        FRONTEND_PID=$(pgrep -f "vite.*--port 3000")
        success "Frontend process running (PID: $FRONTEND_PID)"
    else
        error "Frontend process not found"
    fi
}

# File system check
check_filesystem() {
    log "Checking file system..."
    
    # Check important files
    files_to_check=(
        "package.json"
        "server/index.ts"
        "client/src/App.tsx"
        ".env"
    )
    
    for file in "${files_to_check[@]}"; do
        if [ -f "$file" ]; then
            success "$file exists"
        else
            warning "$file missing"
        fi
    done
    
    # Check directories
    dirs_to_check=(
        "node_modules"
        "server"
        "client/src"
    )
    
    for dir in "${dirs_to_check[@]}"; do
        if [ -d "$dir" ]; then
            success "$dir directory exists"
        else
            error "$dir directory missing"
        fi
    done
}

# Database check
check_database() {
    log "Checking database..."
    
    if [ -f "dev.db" ]; then
        size=$(du -h dev.db | cut -f1)
        success "Database file exists (${size})"
        
        # Try to check if it's a valid SQLite database
        if command -v sqlite3 > /dev/null; then
            if sqlite3 dev.db ".tables" > /dev/null 2>&1; then
                table_count=$(sqlite3 dev.db ".tables" | wc -l)
                success "Database is valid (${table_count} tables)"
            else
                error "Database file is corrupted"
            fi
        fi
    else
        warning "Database file not found"
    fi
}

# Memory and CPU check
check_system_resources() {
    log "Checking system resources..."
    
    # Memory usage
    if command -v free > /dev/null; then
        memory_info=$(free -h | grep '^Mem:')
        success "Memory: $memory_info"
    elif command -v vm_stat > /dev/null; then
        # macOS
        memory_pressure=$(memory_pressure 2>/dev/null | grep "System-wide memory free percentage" || echo "Memory info not available")
        success "Memory: $memory_pressure"
    fi
    
    # CPU load
    if command -v uptime > /dev/null; then
        load_avg=$(uptime | grep -o 'load average.*' || echo "Load average not available")
        success "CPU: $load_avg"
    fi
    
    # Disk space
    disk_usage=$(df -h . | tail -1 | awk '{print $4 " available"}')
    success "Disk: $disk_usage"
}

# Log file check
check_logs() {
    log "Checking log files..."
    
    if [ -f "backend.log" ]; then
        backend_lines=$(wc -l < backend.log)
        backend_size=$(du -h backend.log | cut -f1)
        success "Backend log: ${backend_lines} lines (${backend_size})"
        
        # Check for recent errors
        if tail -20 backend.log | grep -i error > /dev/null; then
            warning "Recent errors found in backend log"
        fi
    else
        warning "Backend log file not found"
    fi
    
    if [ -f "frontend.log" ]; then
        frontend_lines=$(wc -l < frontend.log)
        frontend_size=$(du -h frontend.log | cut -f1)
        success "Frontend log: ${frontend_lines} lines (${frontend_size})"
        
        # Check for recent errors
        if tail -20 frontend.log | grep -i error > /dev/null; then
            warning "Recent errors found in frontend log"
        fi
    else
        warning "Frontend log file not found"
    fi
}

# API endpoint tests
test_api_endpoints() {
    log "Testing API endpoints..."
    
    endpoints=(
        "http://localhost:$BACKEND_PORT/api/health:Health"
        "http://localhost:$BACKEND_PORT/api/stocks:Stocks API"
        "http://localhost:$FRONTEND_PORT/api/health:Frontend Proxy"
    )
    
    for endpoint_info in "${endpoints[@]}"; do
        url=$(echo $endpoint_info | cut -d: -f1,2)
        name=$(echo $endpoint_info | cut -d: -f3)
        
        if curl -s -f "$url" > /dev/null 2>&1; then
            success "$name endpoint working"
        else
            error "$name endpoint failed"
        fi
    done
}

# Network connectivity check
check_network() {
    log "Checking network connectivity..."
    
    # Check if ports are listening
    if netstat -ln 2>/dev/null | grep ":$BACKEND_PORT " > /dev/null; then
        success "Backend port $BACKEND_PORT is listening"
    else
        error "Backend port $BACKEND_PORT is not listening"
    fi
    
    if netstat -ln 2>/dev/null | grep ":$FRONTEND_PORT " > /dev/null; then
        success "Frontend port $FRONTEND_PORT is listening"
    else
        error "Frontend port $FRONTEND_PORT is not listening"
    fi
    
    # Check external connectivity (for API calls)
    if curl -s --connect-timeout 5 "https://httpbin.org/get" > /dev/null; then
        success "External network connectivity working"
    else
        warning "External network connectivity may be limited"
    fi
}

# Performance test
performance_test() {
    log "Running performance tests..."
    
    # Test response times
    backend_time=$(curl -s -w "%{time_total}" -o /dev/null "http://localhost:$BACKEND_PORT/api/health" 2>/dev/null || echo "N/A")
    frontend_time=$(curl -s -w "%{time_total}" -o /dev/null "http://localhost:$FRONTEND_PORT" 2>/dev/null || echo "N/A")
    
    if [[ $backend_time != "N/A" ]]; then
        if (( $(echo "$backend_time < 1.0" | bc -l) )); then
            success "Backend response time: ${backend_time}s (good)"
        else
            warning "Backend response time: ${backend_time}s (slow)"
        fi
    fi
    
    if [[ $frontend_time != "N/A" ]]; then
        if (( $(echo "$frontend_time < 2.0" | bc -l) )); then
            success "Frontend response time: ${frontend_time}s (good)"
        else
            warning "Frontend response time: ${frontend_time}s (slow)"
        fi
    fi
}

# Main health check execution
main() {
    log "Starting comprehensive health check..."
    echo ""
    
    # Core service checks
    echo "🔍 CORE SERVICES"
    echo "================"
    detailed_service_check "http://localhost:$BACKEND_PORT/api/health" "Backend"
    detailed_service_check "http://localhost:$FRONTEND_PORT" "Frontend"
    echo ""
    
    # Process checks
    echo "⚙️  PROCESSES"
    echo "============="
    check_processes
    echo ""
    
    # File system checks
    echo "📁 FILE SYSTEM"
    echo "=============="
    check_filesystem
    echo ""
    
    # Database checks
    echo "🗄️  DATABASE"
    echo "============"
    check_database
    echo ""
    
    # System resource checks
    echo "💻 SYSTEM RESOURCES"
    echo "==================="
    check_system_resources
    echo ""
    
    # Log file checks
    echo "📝 LOG FILES"
    echo "============"
    check_logs
    echo ""
    
    # API endpoint tests
    echo "🔌 API ENDPOINTS"
    echo "================"
    test_api_endpoints
    echo ""
    
    # Network checks
    echo "🌐 NETWORK"
    echo "=========="
    check_network
    echo ""
    
    # Performance tests
    echo "🚀 PERFORMANCE"
    echo "=============="
    performance_test
    echo ""
    
    success "Health check completed!"
    
    # Summary
    echo ""
    echo "📊 QUICK STATUS SUMMARY"
    echo "======================="
    check_service "http://localhost:$BACKEND_PORT/api/health" "Backend"
    check_service "http://localhost:$FRONTEND_PORT" "Frontend"
    
    if [ -f "backend.pid" ] && [ -f "frontend.pid" ]; then
        success "All services are managed by PID files"
    else
        warning "Some services may not be properly managed"
    fi
}

# Execute main function
main "$@"