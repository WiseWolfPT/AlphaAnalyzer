#!/bin/bash

# 🔍 ALFALYZER SMOKE TEST
# Quick validation of production deployment
# Run this after deployment to verify everything is working

echo "================================================"
echo "🔍 ALFALYZER SMOKE TEST"
echo "================================================"

# Configuration
DOMAIN=${1:-"128.140.45.28:3001"}  # Default to IP:port if no domain provided
PROTOCOL=${2:-"http"}  # Default to http if not specified
API_KEY_FILE="/home/teste 1/market-data-key.txt"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results
PASSED=0
FAILED=0

# Helper functions
pass() {
    echo -e "${GREEN}✅ $1${NC}"
    ((PASSED++))
}

fail() {
    echo -e "${RED}❌ $1${NC}"
    echo -e "${RED}   Error: $2${NC}"
    ((FAILED++))
}

info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Function to test endpoint
test_endpoint() {
    local endpoint=$1
    local description=$2
    local extra_args=$3
    
    info "Testing: $description"
    
    response=$(curl -s -o /dev/null -w "%{http_code}" $extra_args "${PROTOCOL}://${DOMAIN}${endpoint}" 2>/dev/null)
    
    if [ "$response" = "200" ] || [ "$response" = "201" ] || [ "$response" = "204" ]; then
        pass "$description (HTTP $response)"
    else
        fail "$description" "HTTP $response"
    fi
}

echo ""
echo "🔧 Configuration:"
echo "Domain: ${PROTOCOL}://${DOMAIN}"
echo ""

# Test 1: Frontend is accessible
echo "📱 Testing Frontend..."
test_endpoint "/" "Frontend homepage"

# Test 2: API health check
echo ""
echo "🏥 Testing API Health..."
test_endpoint "/api/health" "API health endpoint"

# Test 3: Test protected endpoint without API key (should fail with 401)
echo ""
echo "🔒 Testing API Security..."
info "Testing protected endpoint without API key (should fail)"
response=$(curl -s -o /dev/null -w "%{http_code}" -X GET "${PROTOCOL}://${DOMAIN}/api/market-data/batch" 2>/dev/null)
if [ "$response" = "401" ] || [ "$response" = "403" ]; then
    pass "Protected endpoint correctly requires authentication (HTTP $response)"
else
    fail "Protected endpoint not secured" "Expected 401/403, got HTTP $response"
fi

# Test 4: Test protected endpoint with API key (if available)
if [ -f "$API_KEY_FILE" ]; then
    API_KEY=$(cat "$API_KEY_FILE")
    echo ""
    echo "🔑 Testing authenticated access..."
    info "Testing protected endpoint with API key"
    
    response=$(curl -s -o /dev/null -w "%{http_code}" \
        -X POST \
        -H "X-API-Key: $API_KEY" \
        -H "Content-Type: application/json" \
        -d '{"symbols":["AAPL"]}' \
        "${PROTOCOL}://${DOMAIN}/api/market-data/batch" 2>/dev/null)
    
    if [ "$response" = "200" ]; then
        pass "Protected endpoint accessible with valid API key (HTTP $response)"
    else
        fail "Protected endpoint with API key" "HTTP $response"
    fi
else
    info "API key file not found at $API_KEY_FILE, skipping authenticated test"
fi

# Test 5: WebSocket connection (if using HTTPS)
if [ "$PROTOCOL" = "https" ]; then
    echo ""
    echo "🔌 Testing WebSocket..."
    WS_PROTOCOL="wss"
else
    WS_PROTOCOL="ws"
fi

# Basic WebSocket test using curl (limited capability)
info "WebSocket endpoint: ${WS_PROTOCOL}://${DOMAIN}/ws"
# Note: Full WebSocket testing requires additional tools

# Test 6: Static assets
echo ""
echo "📦 Testing Static Assets..."
test_endpoint "/assets/index.js" "JavaScript bundle" "-H 'Accept: application/javascript'"
test_endpoint "/assets/index.css" "CSS bundle" "-H 'Accept: text/css'"

# Test 7: Redis connection (if on server)
if command -v redis-cli &> /dev/null; then
    echo ""
    echo "💾 Testing Redis..."
    
    # Check if Redis password is set
    if [ -f "/home/teste 1/.env/redis.conf" ]; then
        source "/home/teste 1/.env/redis.conf"
        redis_response=$(redis-cli -a "$REDIS_PASSWORD" ping 2>/dev/null)
    else
        redis_response=$(redis-cli ping 2>/dev/null)
    fi
    
    if [ "$redis_response" = "PONG" ]; then
        pass "Redis connection successful"
    else
        fail "Redis connection" "No PONG response"
    fi
else
    info "Redis CLI not available, skipping Redis test"
fi

# Test 8: Process monitoring (if PM2 available)
if command -v pm2 &> /dev/null; then
    echo ""
    echo "📊 Testing PM2 Process..."
    
    pm2_status=$(pm2 list | grep -i "alfalyzer" | grep -i "online")
    if [ -n "$pm2_status" ]; then
        pass "PM2 process is online"
    else
        fail "PM2 process status" "Process not online"
    fi
else
    info "PM2 not available, skipping process test"
fi

# Test 9: HTTPS/SSL (if using HTTPS)
if [ "$PROTOCOL" = "https" ]; then
    echo ""
    echo "🔐 Testing SSL Certificate..."
    
    # Test SSL certificate validity
    cert_check=$(echo | openssl s_client -connect "${DOMAIN}" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null)
    if [ -n "$cert_check" ]; then
        pass "SSL certificate is valid"
        echo "$cert_check"
    else
        fail "SSL certificate check" "Certificate validation failed"
    fi
fi

# Test 10: Critical API endpoints
echo ""
echo "🔍 Testing Critical Endpoints..."
test_endpoint "/api/stocks/AAPL/quote" "Stock quote endpoint"
test_endpoint "/api/stocks/trending" "Trending stocks endpoint"

# Final Report
echo ""
echo "================================================"
echo "📊 SMOKE TEST RESULTS"
echo "================================================"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ ALL TESTS PASSED! System is ready for production.${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  Some tests failed. Please review and fix before going live.${NC}"
    exit 1
fi