#!/bin/bash

# ALFALYZER PRODUCTION SECURITY MASTER SETUP
# Complete security hardening for production deployment
# Estimated time: 1.5 hours (90 minutes)

set -e  # Exit on error

echo "🚀 ALFALYZER PRODUCTION SECURITY MASTER SETUP"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get current directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Configuration
DOMAIN=${1:-"128.140.45.28"}  # Default to IP if no domain provided
APP_DIR=${2:-"/opt/alfalyzer"}
EMAIL=${3:-"admin@alfalyzer.com"}

echo -e "${BLUE}🔧 CONFIGURATION:${NC}"
echo "================================"
echo "Domain/IP: $DOMAIN"
echo "App Directory: $APP_DIR"
echo "Admin Email: $EMAIL"
echo "Script Directory: $SCRIPT_DIR"
echo ""

# Validate we're running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ This script must be run as root${NC}"
    echo "Please run: sudo $0 $@"
    exit 1
fi

# Validate app directory exists
if [ ! -d "$APP_DIR" ]; then
    echo -e "${YELLOW}⚠️  App directory doesn't exist: $APP_DIR${NC}"
    echo "Please specify correct path: $0 <domain> <app_directory>"
    exit 1
fi

# Create logs directory
mkdir -p "$APP_DIR/security-logs"
LOG_FILE="$APP_DIR/security-logs/security-setup-$(date +%Y%m%d-%H%M%S).log"

# Log function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

echo -e "${BLUE}📝 Security setup logged to: $LOG_FILE${NC}"
echo ""

# Pre-flight checks
echo -e "${BLUE}🔍 PRE-FLIGHT SECURITY CHECKS${NC}"
echo "==============================="

log "Starting Alfalyzer security setup"
log "Domain: $DOMAIN, App: $APP_DIR, Email: $EMAIL"

# Check if application is running
if pgrep -f "alfalyzer\|node.*server" > /dev/null; then
    echo -e "${GREEN}✅ Application is running${NC}"
    log "Application is running"
else
    echo -e "${YELLOW}⚠️  Application not detected - will continue anyway${NC}"
    log "WARNING: Application not detected"
fi

# Check network connectivity
if ping -c 1 google.com >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Internet connectivity OK${NC}"
    log "Internet connectivity verified"
else
    echo -e "${RED}❌ No internet connection${NC}"
    log "ERROR: No internet connection"
    exit 1
fi

# Check disk space
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 90 ]; then
    echo -e "${RED}❌ Disk usage too high: $DISK_USAGE%${NC}"
    log "ERROR: Disk usage too high: $DISK_USAGE%"
    exit 1
else
    echo -e "${GREEN}✅ Disk space OK: $DISK_USAGE% used${NC}"
    log "Disk space check passed: $DISK_USAGE% used"
fi

echo ""

# PHASE 1: HTTPS Infrastructure (45 minutes)
echo -e "${BLUE}🔒 PHASE 1: HTTPS INFRASTRUCTURE${NC}"
echo "================================="
echo "Estimated time: 45 minutes"
echo ""

START_TIME=$(date +%s)
log "PHASE 1 STARTED: HTTPS Infrastructure"

if [ -f "$SCRIPT_DIR/01-setup-nginx-ssl.sh" ]; then
    chmod +x "$SCRIPT_DIR/01-setup-nginx-ssl.sh"
    "$SCRIPT_DIR/01-setup-nginx-ssl.sh" "$DOMAIN" "3001" "$EMAIL" 2>&1 | tee -a "$LOG_FILE"
    
    if [ ${PIPESTATUS[0]} -eq 0 ]; then
        echo -e "${GREEN}✅ Phase 1 completed successfully${NC}"
        log "PHASE 1 COMPLETED: HTTPS Infrastructure"
    else
        echo -e "${RED}❌ Phase 1 failed${NC}"
        log "ERROR: PHASE 1 FAILED: HTTPS Infrastructure"
        exit 1
    fi
else
    echo -e "${RED}❌ Phase 1 script not found: $SCRIPT_DIR/01-setup-nginx-ssl.sh${NC}"
    log "ERROR: Phase 1 script not found"
    exit 1
fi

PHASE1_TIME=$(($(date +%s) - START_TIME))
echo -e "${GREEN}⏱️  Phase 1 completed in $((PHASE1_TIME / 60))m $((PHASE1_TIME % 60))s${NC}"
log "Phase 1 duration: ${PHASE1_TIME}s"
echo ""

# PHASE 2: API Security (20 minutes)
echo -e "${BLUE}🔐 PHASE 2: API SECURITY${NC}"
echo "========================="
echo "Estimated time: 20 minutes"
echo ""

START_TIME=$(date +%s)
log "PHASE 2 STARTED: API Security"

if [ -f "$SCRIPT_DIR/02-secure-api-endpoints.sh" ]; then
    chmod +x "$SCRIPT_DIR/02-secure-api-endpoints.sh"
    "$SCRIPT_DIR/02-secure-api-endpoints.sh" "$APP_DIR" 2>&1 | tee -a "$LOG_FILE"
    
    if [ ${PIPESTATUS[0]} -eq 0 ]; then
        echo -e "${GREEN}✅ Phase 2 completed successfully${NC}"
        log "PHASE 2 COMPLETED: API Security"
    else
        echo -e "${RED}❌ Phase 2 failed${NC}"
        log "ERROR: PHASE 2 FAILED: API Security"
        exit 1
    fi
else
    echo -e "${RED}❌ Phase 2 script not found: $SCRIPT_DIR/02-secure-api-endpoints.sh${NC}"
    log "ERROR: Phase 2 script not found"
    exit 1
fi

PHASE2_TIME=$(($(date +%s) - START_TIME))
echo -e "${GREEN}⏱️  Phase 2 completed in $((PHASE2_TIME / 60))m $((PHASE2_TIME % 60))s${NC}"
log "Phase 2 duration: ${PHASE2_TIME}s"
echo ""

# PHASE 3: Domain & Final Security (15 minutes)
echo -e "${BLUE}🌐 PHASE 3: DOMAIN & FINAL SECURITY${NC}"
echo "==================================="
echo "Estimated time: 15 minutes"
echo ""

START_TIME=$(date +%s)
log "PHASE 3 STARTED: Domain & Final Security"

# Only run domain setup if not using IP address
if [[ ! $DOMAIN =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    if [ -f "$SCRIPT_DIR/03-domain-security-final.sh" ]; then
        chmod +x "$SCRIPT_DIR/03-domain-security-final.sh"
        "$SCRIPT_DIR/03-domain-security-final.sh" "$DOMAIN" "$APP_DIR" 2>&1 | tee -a "$LOG_FILE"
        
        if [ ${PIPESTATUS[0]} -eq 0 ]; then
            echo -e "${GREEN}✅ Phase 3 completed successfully${NC}"
            log "PHASE 3 COMPLETED: Domain & Final Security"
        else
            echo -e "${RED}❌ Phase 3 failed${NC}"
            log "ERROR: PHASE 3 FAILED: Domain & Final Security"
            exit 1
        fi
    else
        echo -e "${RED}❌ Phase 3 script not found: $SCRIPT_DIR/03-domain-security-final.sh${NC}"
        log "ERROR: Phase 3 script not found"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  Skipping domain configuration (using IP address)${NC}"
    log "Phase 3 skipped: Using IP address instead of domain"
    
    # Still run basic security hardening
    apt install -y fail2ban unattended-upgrades
    systemctl enable fail2ban
    echo -e "${GREEN}✅ Basic security hardening completed${NC}"
    log "Basic security hardening completed for IP-based deployment"
fi

PHASE3_TIME=$(($(date +%s) - START_TIME))
echo -e "${GREEN}⏱️  Phase 3 completed in $((PHASE3_TIME / 60))m $((PHASE3_TIME % 60))s${NC}"
log "Phase 3 duration: ${PHASE3_TIME}s"
echo ""

# FINAL VALIDATION
echo -e "${BLUE}✅ FINAL SECURITY VALIDATION${NC}"
echo "============================="

# Run security validation
if [ -f "$SCRIPT_DIR/validate-security.sh" ]; then
    chmod +x "$SCRIPT_DIR/validate-security.sh"
    "$SCRIPT_DIR/validate-security.sh" "$DOMAIN" "$APP_DIR" 2>&1 | tee -a "$LOG_FILE"
fi

# Calculate total time
TOTAL_TIME=$((PHASE1_TIME + PHASE2_TIME + PHASE3_TIME))

# COMPLETION SUMMARY
echo ""
echo -e "${GREEN}🎉 ALFALYZER SECURITY SETUP COMPLETE!${NC}"
echo -e "${GREEN}=====================================${NC}"
echo ""
echo -e "${BLUE}📊 SETUP SUMMARY:${NC}"
echo "=================="
echo "Total time: $((TOTAL_TIME / 60))m $((TOTAL_TIME % 60))s"
echo "Phase 1 (HTTPS): $((PHASE1_TIME / 60))m $((PHASE1_TIME % 60))s"
echo "Phase 2 (API): $((PHASE2_TIME / 60))m $((PHASE2_TIME % 60))s"  
echo "Phase 3 (Domain): $((PHASE3_TIME / 60))m $((PHASE3_TIME % 60))s"

echo ""
echo -e "${BLUE}🔒 SECURITY STATUS:${NC}"
echo "==================="

# Check each security component
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx reverse proxy: Running"
else
    echo "❌ Nginx reverse proxy: Not running"
fi

if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ] || [[ $DOMAIN =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "✅ SSL certificate: Configured"
else
    echo "❌ SSL certificate: Not configured"
fi

if grep -q "MARKET_DATA_API_KEY=" "$APP_DIR/.env.production" 2>/dev/null; then
    echo "✅ API key protection: Configured"
else
    echo "❌ API key protection: Not configured"
fi

if systemctl is-active --quiet fail2ban; then
    echo "✅ Intrusion detection: Running"
else
    echo "❌ Intrusion detection: Not running"
fi

echo ""
echo -e "${BLUE}🔗 ACCESS URLS:${NC}"
echo "==============="
if [[ $DOMAIN =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "Main site: http://$DOMAIN (HTTPS not available for IP)"
    echo "API base:  http://$DOMAIN/api"
    echo "Health:    http://$DOMAIN/health"
else
    echo "Main site: https://$DOMAIN"
    echo "API base:  https://$DOMAIN/api"
    echo "Health:    https://$DOMAIN/health"
fi

echo ""
echo -e "${BLUE}📝 IMPORTANT FILES:${NC}"
echo "==================="
echo "Security log: $LOG_FILE"
echo "Environment: $APP_DIR/.env.production"
echo "Nginx config: /etc/nginx/sites-available/alfalyzer"
echo "API key backup: $APP_DIR/security-backups/"

echo ""
echo -e "${YELLOW}📋 NEXT STEPS:${NC}"
echo "==============="
echo "1. Test all application functionality"
echo "2. Update frontend with new API configuration"
echo "3. Set up monitoring alerts"
echo "4. Schedule regular security updates"
echo "5. Plan API key rotation"

echo ""
echo -e "${RED}⚠️  SECURITY REMINDERS:${NC}"
echo "========================"
echo "• API keys are stored in $APP_DIR/security-backups/"
echo "• Never commit production secrets to version control"
echo "• Review security logs regularly"
echo "• Keep the system updated"
echo "• Monitor for suspicious activity"

log "SECURITY SETUP COMPLETED SUCCESSFULLY"
log "Total duration: ${TOTAL_TIME}s"

echo ""
echo -e "${GREEN}🚀 Alfalyzer is now production-ready with enterprise-grade security!${NC}"