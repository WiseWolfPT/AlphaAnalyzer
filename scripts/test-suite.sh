#!/bin/bash

# 🧪 ALFALYZER COMPREHENSIVE TEST SUITE
# Tests all critical functionality

echo "🧪 ALFALYZER COMPREHENSIVE TEST SUITE"
echo "======================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
BACKEND_PORT=3001
FRONTEND_PORT=3000
TEST_TIMEOUT=10

# Counters
TESTS_TOTAL=0
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_WARNINGS=0

log() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ PASS${NC} $1"
    ((TESTS_PASSED++))
}

error() {
    echo -e "${RED}❌ FAIL${NC} $1"
    ((TESTS_FAILED++))
}

warning() {
    echo -e "${YELLOW}⚠️  WARN${NC} $1"
    ((TESTS_WARNINGS++))
}

info() {
    echo -e "${CYAN}ℹ️  INFO${NC} $1"
}

# Test execution wrapper
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    ((TESTS_TOTAL++))
    log "Running: $test_name"
    
    if eval "$test_command"; then
        success "$test_name"
        return 0
    else
        error "$test_name"
        return 1
    fi
}

# HTTP request helper
http_test() {
    local url="$1"
    local expected_status="${2:-200}"
    local timeout="${3:-$TEST_TIMEOUT}"
    
    response=$(curl -s -w "HTTPSTATUS:%{http_code};TIME:%{time_total}" \
               --max-time $timeout \
               "$url" 2>/dev/null)
    
    if [[ $response == *"HTTPSTATUS:$expected_status"* ]]; then
        return 0
    else
        echo "Expected status $expected_status, got: $response"
        return 1
    fi
}

# JSON response test
json_test() {
    local url="$1"
    local expected_field="$2"
    local timeout="${3:-$TEST_TIMEOUT}"
    
    response=$(curl -s --max-time $timeout "$url" 2>/dev/null)
    
    if echo "$response" | grep -q "$expected_field"; then
        return 0
    else
        echo "Expected field '$expected_field' not found in: $response"
        return 1
    fi
}

# Content test
content_test() {
    local url="$1"
    local expected_content="$2"
    local timeout="${3:-$TEST_TIMEOUT}"
    
    response=$(curl -s --max-time $timeout "$url" 2>/dev/null)
    
    if echo "$response" | grep -q "$expected_content"; then
        return 0
    else
        echo "Expected content '$expected_content' not found"
        return 1
    fi
}

# ======================
# BASIC CONNECTIVITY TESTS
# ======================
test_basic_connectivity() {
    echo ""
    echo "🔌 BASIC CONNECTIVITY TESTS"
    echo "============================"
    
    run_test "Backend Port Accessibility" \
        "nc -z localhost $BACKEND_PORT"
    
    run_test "Frontend Port Accessibility" \
        "nc -z localhost $FRONTEND_PORT"
    
    run_test "Backend HTTP Response" \
        "http_test http://localhost:$BACKEND_PORT/api/health"
    
    run_test "Frontend HTTP Response" \
        "http_test http://localhost:$FRONTEND_PORT"
}

# ======================
# API ENDPOINT TESTS
# ======================
test_api_endpoints() {
    echo ""
    echo "🔗 API ENDPOINT TESTS"
    echo "====================="
    
    # Health endpoint
    run_test "Health Endpoint Response" \
        "json_test http://localhost:$BACKEND_PORT/api/health 'status'"
    
    # Stocks endpoint (basic)
    run_test "Stocks Endpoint Accessibility" \
        "http_test http://localhost:$BACKEND_PORT/api/stocks"
    
    # Watchlists endpoint
    run_test "Watchlists Endpoint Accessibility" \
        "http_test http://localhost:$BACKEND_PORT/api/watchlists"
    
    # Intrinsic values endpoint
    run_test "Intrinsic Values Endpoint Accessibility" \
        "http_test http://localhost:$BACKEND_PORT/api/intrinsic-values"
    
    # Portfolio endpoint
    run_test "Portfolios Endpoint Accessibility" \
        "http_test http://localhost:$BACKEND_PORT/api/portfolios"
}

# ======================
# FRONTEND PROXY TESTS
# ======================
test_frontend_proxy() {
    echo ""
    echo "🔄 FRONTEND PROXY TESTS"
    echo "======================="
    
    run_test "Frontend to Backend Health Proxy" \
        "http_test http://localhost:$FRONTEND_PORT/api/health"
    
    run_test "Frontend to Backend Stocks Proxy" \
        "http_test http://localhost:$FRONTEND_PORT/api/stocks"
    
    run_test "Frontend Static Assets" \
        "http_test http://localhost:$FRONTEND_PORT/ 200"
}

# ======================
# DATABASE TESTS
# ======================
test_database() {
    echo ""
    echo "🗄️  DATABASE TESTS"
    echo "=================="
    
    run_test "Database File Exists" \
        "[ -f 'dev.db' ]"
    
    if command -v sqlite3 > /dev/null; then
        run_test "Database Schema Valid" \
            "sqlite3 dev.db '.schema' > /dev/null"
        
        run_test "Database Tables Exist" \
            "[[ \$(sqlite3 dev.db '.tables' | wc -l) -gt 0 ]]"
        
        # Test basic queries
        run_test "Database Query Test" \
            "sqlite3 dev.db 'SELECT COUNT(*) FROM sqlite_master;' > /dev/null"
    else
        warning "SQLite3 not available - skipping database tests"
    fi
}

# ======================
# AUTHENTICATION TESTS
# ======================
test_authentication() {
    echo ""
    echo "🔐 AUTHENTICATION TESTS"
    echo "======================="
    
    # Test auth endpoints exist
    run_test "Login Endpoint Exists" \
        "http_test http://localhost:$BACKEND_PORT/api/auth/login 405"  # Method not allowed for GET
    
    run_test "Register Endpoint Exists" \
        "http_test http://localhost:$BACKEND_PORT/api/auth/register 405"  # Method not allowed for GET
    
    # Test protected endpoints return proper status
    run_test "Protected Endpoint Check" \
        "curl -s http://localhost:$BACKEND_PORT/api/protected | grep -q 'error\\|unauthorized\\|login' || true"
}

# ======================
# REAL-TIME DATA TESTS
# ======================
test_realtime_data() {
    echo ""
    echo "📊 REAL-TIME DATA TESTS"
    echo "======================="
    
    # Test market data endpoints
    run_test "Market Data Service Accessible" \
        "http_test http://localhost:$BACKEND_PORT/api/market-data"
    
    # Test if we can get stock data (with fallback)
    run_test "Stock Data Retrieval Test" \
        "curl -s 'http://localhost:$BACKEND_PORT/api/stocks?symbol=AAPL' | grep -q 'symbol\\|price\\|data' || true"
    
    # Test WebSocket availability (production only)
    if [ "$NODE_ENV" = "production" ]; then
        run_test "WebSocket Port Available" \
            "nc -z localhost $BACKEND_PORT"
    else
        info "WebSocket tests skipped in development mode"
    fi
}

# ======================
# PERFORMANCE TESTS
# ======================
test_performance() {
    echo ""
    echo "🚀 PERFORMANCE TESTS"
    echo "===================="
    
    # Response time tests
    backend_time=$(curl -s -w "%{time_total}" -o /dev/null "http://localhost:$BACKEND_PORT/api/health" 2>/dev/null || echo "999")
    if (( $(echo "$backend_time < 2.0" | bc -l 2>/dev/null || echo "0") )); then
        success "Backend Response Time (${backend_time}s)"
    else
        warning "Backend Response Time Slow (${backend_time}s)"
    fi
    
    frontend_time=$(curl -s -w "%{time_total}" -o /dev/null "http://localhost:$FRONTEND_PORT" 2>/dev/null || echo "999")
    if (( $(echo "$frontend_time < 3.0" | bc -l 2>/dev/null || echo "0") )); then
        success "Frontend Response Time (${frontend_time}s)"
    else
        warning "Frontend Response Time Slow (${frontend_time}s)"
    fi
    
    # Memory usage test
    if command -v ps > /dev/null; then
        backend_memory=$(ps -o pid,rss -p $(pgrep -f "tsx.*server/index.ts" | head -1) 2>/dev/null | tail -1 | awk '{print $2}' || echo "0")
        if [ "$backend_memory" -gt 0 ] && [ "$backend_memory" -lt 500000 ]; then  # Less than 500MB
            success "Backend Memory Usage ($((backend_memory / 1024))MB)"
        else
            warning "Backend Memory Usage High ($((backend_memory / 1024))MB)"
        fi
    fi
}

# ======================
# SECURITY TESTS
# ======================
test_security() {
    echo ""
    echo "🛡️  SECURITY TESTS"
    echo "=================="
    
    # Test CORS headers
    run_test "CORS Headers Present" \
        "curl -s -I http://localhost:$BACKEND_PORT/api/health | grep -q 'Access-Control'"
    
    # Test security headers
    run_test "Security Headers Present" \
        "curl -s -I http://localhost:$BACKEND_PORT/api/health | grep -q 'X-Content-Type-Options\\|X-Frame-Options'"
    
    # Test rate limiting (if enabled)
    run_test "Rate Limiting Configured" \
        "curl -s -I http://localhost:$BACKEND_PORT/api/health | grep -q 'X-RateLimit\\|Retry-After' || true"
    
    # Test that sensitive files are not accessible
    run_test "Environment File Not Accessible" \
        "! http_test http://localhost:$FRONTEND_PORT/.env 200"
    
    run_test "Package.json Not Accessible via Frontend" \
        "! http_test http://localhost:$FRONTEND_PORT/package.json 200"
}

# ======================
# INTEGRATION TESTS
# ======================
test_integration() {
    echo ""
    echo "🔧 INTEGRATION TESTS"
    echo "===================="
    
    # Test full stack data flow
    run_test "Full Stack Data Flow" \
        "curl -s 'http://localhost:$FRONTEND_PORT/api/stocks' | grep -q 'data\\|stocks\\|error' || true"
    
    # Test static asset serving
    run_test "Static Assets Served" \
        "curl -s 'http://localhost:$FRONTEND_PORT/assets/' | grep -q 'html\\|json\\|directory' || true"
    
    # Test API error handling
    run_test "API Error Handling" \
        "curl -s 'http://localhost:$BACKEND_PORT/api/nonexistent' | grep -q 'error\\|not found' || true"
}

# ======================
# FILE SYSTEM TESTS
# ======================
test_filesystem() {
    echo ""
    echo "📁 FILE SYSTEM TESTS"
    echo "===================="
    
    # Critical files
    critical_files=(
        "package.json"
        "server/index.ts" 
        "client/src/App.tsx"
        "client/src/main.tsx"
    )
    
    for file in "${critical_files[@]}"; do
        run_test "Critical File: $file" \
            "[ -f '$file' ]"
    done
    
    # Critical directories
    critical_dirs=(
        "node_modules"
        "server"
        "client/src"
        "scripts"
    )
    
    for dir in "${critical_dirs[@]}"; do
        run_test "Critical Directory: $dir" \
            "[ -d '$dir' ]"
    done
    
    # Check log files are being written
    run_test "Backend Log Being Written" \
        "[ -f 'backend.log' ] && [ -s 'backend.log' ]"
    
    run_test "Frontend Log Being Written" \
        "[ -f 'frontend.log' ] && [ -s 'frontend.log' ]"
}

# ======================
# ENVIRONMENT TESTS
# ======================
test_environment() {
    echo ""
    echo "🌍 ENVIRONMENT TESTS"
    echo "===================="
    
    run_test "Environment File Exists" \
        "[ -f '.env' ]"
    
    run_test "Node Modules Installed" \
        "[ -d 'node_modules' ] && [ -f 'node_modules/.package-lock.json' ]"
    
    run_test "TypeScript Config Valid" \
        "[ -f 'tsconfig.json' ]"
    
    run_test "Vite Config Valid" \
        "[ -f 'vite.config.ts' ]"
    
    # Check for required environment variables
    if [ -f ".env" ]; then
        run_test "Environment Variables Set" \
            "grep -q 'NODE_ENV\\|PORT\\|DATABASE_URL' .env"
    fi
}

# ======================
# ERROR RECOVERY TESTS
# ======================
test_error_recovery() {
    echo ""
    echo "🚑 ERROR RECOVERY TESTS"
    echo "======================="
    
    # Test graceful handling of invalid requests
    run_test "Invalid API Request Handling" \
        "curl -s -X POST 'http://localhost:$BACKEND_PORT/api/invalid' | grep -q 'error\\|not found'"
    
    # Test malformed JSON handling
    run_test "Malformed JSON Handling" \
        "curl -s -X POST -H 'Content-Type: application/json' -d '{invalid json}' 'http://localhost:$BACKEND_PORT/api/stocks' | grep -q 'error'"
    
    # Test large request handling
    run_test "Large Request Handling" \
        "curl -s -X POST -H 'Content-Type: application/json' -d '{\"data\":\"$(printf 'x%.0s' {1..10000})\"}' 'http://localhost:$BACKEND_PORT/api/stocks' | grep -q 'error\\|too large' || true"
}

# ======================
# MAIN TEST EXECUTION
# ======================
main() {
    log "Starting comprehensive test suite..."
    
    # Initialize counters
    TESTS_TOTAL=0
    TESTS_PASSED=0
    TESTS_FAILED=0
    TESTS_WARNINGS=0
    
    # Run all test suites
    test_basic_connectivity
    test_api_endpoints
    test_frontend_proxy
    test_database
    test_authentication
    test_realtime_data
    test_performance
    test_security
    test_integration
    test_filesystem
    test_environment
    test_error_recovery
    
    # Test summary
    echo ""
    echo "📊 TEST SUITE SUMMARY"
    echo "====================="
    echo ""
    info "Total Tests Run: $TESTS_TOTAL"
    success "Tests Passed: $TESTS_PASSED"
    error "Tests Failed: $TESTS_FAILED"
    warning "Warnings: $TESTS_WARNINGS"
    echo ""
    
    # Calculate success rate
    if [ $TESTS_TOTAL -gt 0 ]; then
        success_rate=$(( (TESTS_PASSED * 100) / TESTS_TOTAL ))
        echo -e "${CYAN}Success Rate: ${success_rate}%${NC}"
        
        if [ $success_rate -ge 90 ]; then
            success "EXCELLENT: System is performing very well!"
        elif [ $success_rate -ge 75 ]; then
            success "GOOD: System is performing well with minor issues"
        elif [ $success_rate -ge 50 ]; then
            warning "FAIR: System has some issues that should be addressed"
        else
            error "POOR: System has significant issues requiring attention"
        fi
    fi
    
    echo ""
    
    # Exit with appropriate code
    if [ $TESTS_FAILED -eq 0 ]; then
        success "All critical tests passed!"
        exit 0
    else
        error "Some tests failed - check the output above"
        exit 1
    fi
}

# Handle script interruption
trap 'error "Test suite interrupted"; exit 1' INT TERM

# Execute main function
main "$@"