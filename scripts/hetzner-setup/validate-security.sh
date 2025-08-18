#!/bin/bash

# ALFALYZER SECURITY VALIDATION SCRIPT
# Comprehensive security validation after production hardening

echo "🔍 ALFALYZER SECURITY VALIDATION"
echo "================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN=${1:-"128.140.45.28"}
APP_DIR=${2:-"/opt/alfalyzer"}
ENV_FILE="$APP_DIR/.env.production"

echo -e "${BLUE}Validating security for:${NC}"
echo "Domain: $DOMAIN"
echo "App Directory: $APP_DIR"
echo ""

# Validation counters
PASSED=0
FAILED=0
WARNINGS=0

# Helper functions
pass() {
    echo -e "${GREEN}✅ $1${NC}"
    ((PASSED++))
}

fail() {
    echo -e "${RED}❌ $1${NC}"
    ((FAILED++))
}

warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    ((WARNINGS++))
}

info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# 1. INFRASTRUCTURE SECURITY
echo -e "${BLUE}🏗️  INFRASTRUCTURE SECURITY${NC}"
echo "============================="

# Check Nginx is running
if systemctl is-active --quiet nginx; then
    pass "Nginx reverse proxy is running"
else
    fail "Nginx reverse proxy is not running"
fi

# Check if Nginx config exists
if [ -f "/etc/nginx/sites-available/alfalyzer" ]; then
    pass "Nginx configuration file exists"
    
    # Check if security headers are configured
    if grep -q "X-Frame-Options\|X-Content-Type-Options\|X-XSS-Protection" /etc/nginx/sites-available/alfalyzer; then
        pass "Security headers configured in Nginx"
    else
        fail "Security headers missing in Nginx configuration"
    fi
    
    # Check rate limiting
    if grep -q "limit_req_zone\|limit_req" /etc/nginx/sites-available/alfalyzer; then
        pass "Rate limiting configured in Nginx"
    else
        warn "Rate limiting not configured in Nginx"
    fi
else
    fail "Nginx configuration file missing"
fi

# Check SSL certificate
if [[ $DOMAIN =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    info "SSL certificate check skipped (using IP address)"
else
    if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
        pass "SSL certificate exists"
        
        # Check certificate expiry
        CERT_DAYS=$(openssl x509 -in "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" -noout -dates | grep "notAfter" | cut -d= -f2 | xargs -I {} date -d {} +%s)
        CURRENT_TIME=$(date +%s)
        DAYS_LEFT=$(( (CERT_DAYS - CURRENT_TIME) / 86400 ))
        
        if [ $DAYS_LEFT -gt 30 ]; then
            pass "SSL certificate valid for $DAYS_LEFT days"
        elif [ $DAYS_LEFT -gt 7 ]; then
            warn "SSL certificate expires in $DAYS_LEFT days"
        else
            fail "SSL certificate expires in $DAYS_LEFT days"
        fi
    else
        fail "SSL certificate not found"
    fi
fi

# Check firewall
if ufw status | grep -q "Status: active"; then
    pass "UFW firewall is active"
    
    if ufw status | grep -q "Nginx Full\|80\|443"; then
        pass "HTTP/HTTPS ports allowed in firewall"
    else
        warn "HTTP/HTTPS ports may not be properly configured"
    fi
else
    warn "UFW firewall is not active"
fi

echo ""

# 2. APPLICATION SECURITY
echo -e "${BLUE}🔐 APPLICATION SECURITY${NC}"
echo "========================"

# Check environment file exists
if [ -f "$ENV_FILE" ]; then
    pass "Production environment file exists"
    
    # Check file permissions
    PERMS=$(stat -c "%a" "$ENV_FILE")
    if [ "$PERMS" = "600" ]; then
        pass "Environment file has secure permissions (600)"
    else
        fail "Environment file permissions insecure: $PERMS (should be 600)"
    fi
    
    # Check API key configuration
    if grep -q "^MARKET_DATA_API_KEY=" "$ENV_FILE"; then
        API_KEY=$(grep "^MARKET_DATA_API_KEY=" "$ENV_FILE" | cut -d'=' -f2)
        if [ ${#API_KEY} -ge 32 ]; then
            pass "Market data API key configured and secure length"
        else
            fail "Market data API key too short (${#API_KEY} chars, need 32+)"
        fi
    else
        fail "Market data API key not configured"
    fi
    
    # Check JWT secrets
    for SECRET in JWT_ACCESS_SECRET JWT_REFRESH_SECRET SESSION_SECRET; do
        if grep -q "^$SECRET=" "$ENV_FILE"; then
            SECRET_VALUE=$(grep "^$SECRET=" "$ENV_FILE" | cut -d'=' -f2)
            if [ ${#SECRET_VALUE} -ge 32 ]; then
                pass "$SECRET configured with secure length"
            else
                fail "$SECRET too short (${#SECRET_VALUE} chars, need 32+)"
            fi
        else
            fail "$SECRET not configured"
        fi
    done
    
    # Check for exposed VITE_ API keys
    if grep -q "^VITE_.*_API_KEY=" "$ENV_FILE"; then
        fail "Exposed VITE_ API keys found in environment file"
    else
        pass "No exposed VITE_ API keys found"
    fi
    
    # Check CORS configuration
    if grep -q "^CORS_ORIGIN=" "$ENV_FILE"; then
        pass "CORS origin configured"
    else
        warn "CORS origin not configured"
    fi
    
else
    fail "Production environment file not found: $ENV_FILE"
fi

# Check application is running
if pgrep -f "alfalyzer\|node.*server" > /dev/null; then
    pass "Application process is running"
else
    fail "Application process not detected"
fi

# Check PM2 status if available
if command -v pm2 >/dev/null 2>&1; then
    PM2_STATUS=$(pm2 list | grep alfalyzer | awk '{print $10}')
    if [ "$PM2_STATUS" = "online" ]; then
        pass "PM2 shows application online"
    else
        warn "PM2 status: $PM2_STATUS"
    fi
fi

echo ""

# 3. API SECURITY
echo -e "${BLUE}🔗 API SECURITY${NC}"
echo "==============="

# Test health endpoint (should work without API key)
if curl -f -s "http://localhost:3001/health" >/dev/null 2>&1; then
    pass "Health endpoint accessible"
else
    fail "Health endpoint not accessible"
fi

# Test protected endpoint without API key (should fail)
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3001/api/market-data/quotes/batch?symbols=AAPL" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "401" ]; then
    pass "Protected API endpoint properly secured (returns 401)"
elif [ "$HTTP_CODE" = "500" ] || [ "$HTTP_CODE" = "000" ]; then
    warn "Protected API endpoint test failed ($HTTP_CODE) - check application logs"
else
    fail "Protected API endpoint not secured (returns $HTTP_CODE, expected 401)"
fi

# Test with API key if available
if [ -f "$ENV_FILE" ] && grep -q "^MARKET_DATA_API_KEY=" "$ENV_FILE"; then
    API_KEY=$(grep "^MARKET_DATA_API_KEY=" "$ENV_FILE" | cut -d'=' -f2)
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -H "X-API-Key: $API_KEY" "http://localhost:3001/api/market-data/quotes/batch?symbols=AAPL" 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "202" ]; then
        pass "API endpoint accessible with valid API key"
    else
        warn "API endpoint with key returned $HTTP_CODE (check application functionality)"
    fi
fi

echo ""

# 4. SECURITY SERVICES
echo -e "${BLUE}🛡️  SECURITY SERVICES${NC}"
echo "====================="

# Check fail2ban
if systemctl is-active --quiet fail2ban; then
    pass "Fail2ban intrusion detection is running"
    
    # Check fail2ban status
    BANNED_IPS=$(fail2ban-client status 2>/dev/null | grep "Currently banned" | awk '{print $3}' || echo "0")
    info "Fail2ban currently has $BANNED_IPS banned IPs"
else
    warn "Fail2ban intrusion detection not running"
fi

# Check automatic updates
if [ -f "/etc/apt/apt.conf.d/20auto-upgrades" ]; then
    pass "Automatic security updates configured"
else
    warn "Automatic security updates not configured"
fi

# Check log monitoring script
if [ -f "/usr/local/bin/alfalyzer-monitor.sh" ]; then
    pass "Security monitoring script installed"
    
    # Check if it's in crontab
    if crontab -l 2>/dev/null | grep -q "alfalyzer-monitor.sh"; then
        pass "Security monitoring scheduled"
    else
        warn "Security monitoring not scheduled"
    fi
else
    warn "Security monitoring script not found"
fi

echo ""

# 5. EXTERNAL SECURITY TESTS
echo -e "${BLUE}🌐 EXTERNAL SECURITY TESTS${NC}"
echo "=========================="

# Test HTTPS redirect (if domain configured)
if [[ ! $DOMAIN =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://$DOMAIN" 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
        pass "HTTPS redirect working (HTTP $HTTP_CODE)"
    elif [ "$HTTP_CODE" = "200" ]; then
        warn "No HTTPS redirect (HTTP 200) - may be OK for testing"
    else
        warn "HTTPS redirect test failed (HTTP $HTTP_CODE)"
    fi
    
    # Test security headers
    SECURITY_HEADERS=$(curl -s -I "https://$DOMAIN" 2>/dev/null | grep -i "x-frame-options\|x-content-type-options\|x-xss-protection" | wc -l)
    if [ "$SECURITY_HEADERS" -ge 2 ]; then
        pass "Security headers present in HTTPS response"
    else
        warn "Security headers missing or incomplete"
    fi
else
    info "External HTTPS tests skipped (using IP address)"
fi

# Test external API protection
if [[ $DOMAIN =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    TEST_URL="http://$DOMAIN/api/market-data/quotes/batch?symbols=AAPL"
else
    TEST_URL="https://$DOMAIN/api/market-data/quotes/batch?symbols=AAPL"
fi

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$TEST_URL" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "401" ]; then
    pass "External API protection working"
elif [ "$HTTP_CODE" = "000" ]; then
    warn "External API test failed - check connectivity"
else
    warn "External API protection test returned $HTTP_CODE"
fi

echo ""

# 6. SYSTEM SECURITY
echo -e "${BLUE}💻 SYSTEM SECURITY${NC}"
echo "=================="

# Check system updates
UPDATES=$(apt list --upgradable 2>/dev/null | grep -c upgradable || echo "0")
if [ "$UPDATES" -eq 0 ]; then
    pass "System is up to date"
elif [ "$UPDATES" -lt 10 ]; then
    warn "$UPDATES package updates available"
else
    fail "$UPDATES package updates available (high number)"
fi

# Check disk space
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -lt 80 ]; then
    pass "Disk usage OK ($DISK_USAGE%)"
elif [ "$DISK_USAGE" -lt 90 ]; then
    warn "Disk usage high ($DISK_USAGE%)"
else
    fail "Disk usage critical ($DISK_USAGE%)"
fi

# Check memory usage
MEM_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
if [ "$MEM_USAGE" -lt 80 ]; then
    pass "Memory usage OK ($MEM_USAGE%)"
elif [ "$MEM_USAGE" -lt 90 ]; then
    warn "Memory usage high ($MEM_USAGE%)"
else
    fail "Memory usage critical ($MEM_USAGE%)"
fi

# Check open ports
OPEN_PORTS=$(netstat -tuln | grep -E ":80|:443|:22|:3001" | wc -l)
if [ "$OPEN_PORTS" -ge 2 ]; then
    pass "Expected ports are open"
else
    warn "Some expected ports may not be open"
fi

echo ""

# FINAL SUMMARY
echo -e "${BLUE}📊 SECURITY VALIDATION SUMMARY${NC}"
echo "==============================="
echo ""
echo -e "${GREEN}✅ Passed: $PASSED${NC}"
echo -e "${RED}❌ Failed: $FAILED${NC}"
echo -e "${YELLOW}⚠️  Warnings: $WARNINGS${NC}"
echo ""

TOTAL_CHECKS=$((PASSED + FAILED + WARNINGS))
SCORE=$((PASSED * 100 / TOTAL_CHECKS))

echo -e "${BLUE}Security Score: $SCORE/100${NC}"

if [ "$FAILED" -eq 0 ] && [ "$WARNINGS" -le 5 ]; then
    echo -e "${GREEN}🎉 SECURITY STATUS: EXCELLENT${NC}"
    echo "Your Alfalyzer deployment meets production security standards!"
elif [ "$FAILED" -le 2 ] && [ "$WARNINGS" -le 10 ]; then
    echo -e "${YELLOW}⚠️  SECURITY STATUS: GOOD${NC}"
    echo "Minor issues detected. Review warnings and failed checks."
elif [ "$FAILED" -le 5 ]; then
    echo -e "${YELLOW}⚠️  SECURITY STATUS: NEEDS IMPROVEMENT${NC}"
    echo "Several security issues detected. Address failed checks before production."
else
    echo -e "${RED}❌ SECURITY STATUS: CRITICAL ISSUES${NC}"
    echo "Major security vulnerabilities detected. DO NOT use in production!"
fi

echo ""
echo -e "${BLUE}📝 RECOMMENDATIONS:${NC}"

if [ "$FAILED" -gt 0 ]; then
    echo "• Address all failed security checks immediately"
fi

if [ "$WARNINGS" -gt 5 ]; then
    echo "• Review and resolve security warnings"
fi

echo "• Monitor security logs regularly"
echo "• Keep system and application updated"
echo "• Review API key usage and rotate regularly"
echo "• Set up monitoring alerts for critical issues"

echo ""
echo -e "${BLUE}🔗 USEFUL COMMANDS:${NC}"
echo "• Check logs: tail -f /var/log/nginx/access.log"
echo "• Fail2ban status: fail2ban-client status"
echo "• SSL status: certbot certificates"
echo "• Application status: pm2 status"
echo "• Security events: tail -f /var/log/alfalyzer-security.log"

# Exit with appropriate code
if [ "$FAILED" -eq 0 ]; then
    exit 0
elif [ "$FAILED" -le 2 ]; then
    exit 1
else
    exit 2
fi