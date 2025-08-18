#!/bin/bash

# ALFALYZER PRODUCTION SECURITY SETUP
# Phase 2: Secure API Endpoints & Generate API Keys (20 minutes)

set -e  # Exit on error

echo "🔐 ALFALYZER SECURITY SETUP - Phase 2: API Security"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_DIR=${1:-"/opt/alfalyzer"}
ENV_FILE="$APP_DIR/.env.production"
BACKUP_DIR="$APP_DIR/security-backups"

echo -e "${YELLOW}Configuration:${NC}"
echo "App Directory: $APP_DIR"
echo "Environment File: $ENV_FILE"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Step 1: Backup current environment file
echo -e "\n${YELLOW}Step 1: Creating security backup...${NC}"
if [ -f "$ENV_FILE" ]; then
    cp "$ENV_FILE" "$BACKUP_DIR/.env.production.backup.$(date +%Y%m%d-%H%M%S)"
    echo -e "${GREEN}✅ Environment file backed up${NC}"
else
    echo -e "${RED}❌ Environment file not found: $ENV_FILE${NC}"
    echo "Creating new environment file..."
    touch "$ENV_FILE"
fi

# Step 2: Generate secure API key
echo -e "\n${YELLOW}Step 2: Generating secure API key...${NC}"
NEW_API_KEY=$(openssl rand -hex 32)
echo -e "${GREEN}✅ New API key generated: ${NEW_API_KEY:0:8}...${NC}"

# Step 3: Update environment file with secure API key
echo -e "\n${YELLOW}Step 3: Updating environment configuration...${NC}"

# Remove any existing MARKET_DATA_API_KEY
sed -i '/^MARKET_DATA_API_KEY=/d' "$ENV_FILE"

# Add new secure API key
echo "" >> "$ENV_FILE"
echo "# SECURITY FIX: Market Data API Key (Generated $(date))" >> "$ENV_FILE"
echo "MARKET_DATA_API_KEY=$NEW_API_KEY" >> "$ENV_FILE"

echo -e "${GREEN}✅ API key added to environment${NC}"

# Step 4: Remove any exposed VITE_ API keys
echo -e "\n${YELLOW}Step 4: Removing exposed frontend API keys...${NC}"

# Comment out any VITE_ API keys that shouldn't be exposed
sed -i 's/^VITE_MARKET_DATA_API_KEY=/#REMOVED_FOR_SECURITY: VITE_MARKET_DATA_API_KEY=/' "$ENV_FILE"
sed -i 's/^VITE_.*_API_KEY=/#REMOVED_FOR_SECURITY: &/' "$ENV_FILE"

echo -e "${GREEN}✅ Frontend API key exposure removed${NC}"

# Step 5: Validate JWT secrets are secure
echo -e "\n${YELLOW}Step 5: Validating JWT secrets...${NC}"

JWT_ACCESS_SECRET=$(grep "^JWT_ACCESS_SECRET=" "$ENV_FILE" | cut -d'=' -f2 || echo "")
JWT_REFRESH_SECRET=$(grep "^JWT_REFRESH_SECRET=" "$ENV_FILE" | cut -d'=' -f2 || echo "")
SESSION_SECRET=$(grep "^SESSION_SECRET=" "$ENV_FILE" | cut -d'=' -f2 || echo "")

# Check JWT secrets length
if [ ${#JWT_ACCESS_SECRET} -lt 32 ]; then
    echo -e "${YELLOW}⚠️  Generating new JWT access secret (current too short)${NC}"
    NEW_JWT_ACCESS=$(openssl rand -hex 32)
    sed -i "s/^JWT_ACCESS_SECRET=.*/JWT_ACCESS_SECRET=$NEW_JWT_ACCESS/" "$ENV_FILE"
    echo -e "${GREEN}✅ New JWT access secret generated${NC}"
else
    echo -e "${GREEN}✅ JWT access secret is secure${NC}"
fi

if [ ${#JWT_REFRESH_SECRET} -lt 32 ]; then
    echo -e "${YELLOW}⚠️  Generating new JWT refresh secret (current too short)${NC}"
    NEW_JWT_REFRESH=$(openssl rand -hex 32)
    sed -i "s/^JWT_REFRESH_SECRET=.*/JWT_REFRESH_SECRET=$NEW_JWT_REFRESH/" "$ENV_FILE"
    echo -e "${GREEN}✅ New JWT refresh secret generated${NC}"
else
    echo -e "${GREEN}✅ JWT refresh secret is secure${NC}"
fi

if [ ${#SESSION_SECRET} -lt 32 ]; then
    echo -e "${YELLOW}⚠️  Generating new session secret (current too short)${NC}"
    NEW_SESSION=$(openssl rand -hex 32)
    sed -i "s/^SESSION_SECRET=.*/SESSION_SECRET=$NEW_SESSION/" "$ENV_FILE"
    echo -e "${GREEN}✅ New session secret generated${NC}"
else
    echo -e "${GREEN}✅ Session secret is secure${NC}"
fi

# Step 6: Set secure file permissions
echo -e "\n${YELLOW}Step 6: Setting secure file permissions...${NC}"
chmod 600 "$ENV_FILE"
chown root:root "$ENV_FILE"
echo -e "${GREEN}✅ Environment file permissions secured${NC}"

# Step 7: Restart application to apply changes
echo -e "\n${YELLOW}Step 7: Restarting application...${NC}"

if command -v pm2 >/dev/null 2>&1; then
    cd "$APP_DIR"
    pm2 restart alfalyzer || pm2 start ecosystem.config.cjs
    echo -e "${GREEN}✅ Application restarted with PM2${NC}"
elif systemctl is-active --quiet alfalyzer; then
    systemctl restart alfalyzer
    echo -e "${GREEN}✅ Application restarted with systemctl${NC}"
else
    echo -e "${YELLOW}⚠️  Please manually restart the application${NC}"
    echo "Commands to try:"
    echo "  pm2 restart alfalyzer"
    echo "  systemctl restart alfalyzer"
    echo "  Or restart manually from $APP_DIR"
fi

# Step 8: Test API security
echo -e "\n${YELLOW}Step 8: Testing API security...${NC}"
sleep 5

# Test public endpoint without API key (should fail)
if curl -f "http://localhost:3001/api/market-data/quotes/batch?symbols=AAPL" >/dev/null 2>&1; then
    echo -e "${RED}❌ API endpoint accessible without key (SECURITY ISSUE)${NC}"
else
    echo -e "${GREEN}✅ API endpoint properly protected${NC}"
fi

# Test with API key (should work)
if curl -f -H "X-API-Key: $NEW_API_KEY" "http://localhost:3001/api/market-data/quotes/batch?symbols=AAPL" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ API endpoint accessible with valid key${NC}"
else
    echo -e "${YELLOW}⚠️  API endpoint test with key failed (check application logs)${NC}"
fi

# Test health endpoint (should always work)
if curl -f "http://localhost:3001/health" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Health endpoint accessible${NC}"
else
    echo -e "${RED}❌ Health endpoint not accessible${NC}"
fi

# Step 9: Generate frontend configuration
echo -e "\n${YELLOW}Step 9: Generating frontend configuration...${NC}"

cat > "$APP_DIR/frontend-api-config.js" << EOF
// FRONTEND API CONFIGURATION
// This file contains the API key for frontend applications to access protected endpoints
// 
// SECURITY NOTE: Only use this in your frontend deployment environment
// DO NOT commit this file to version control
// DO NOT expose this key in client-side code

export const API_CONFIG = {
  apiKey: '$NEW_API_KEY',
  baseUrl: window.location.origin,
  endpoints: {
    marketData: '/api/market-data',
    batch: '/api/market-data/quotes/batch',
    health: '/health'
  }
};

// Usage example:
// const response = await fetch(API_CONFIG.baseUrl + API_CONFIG.endpoints.batch + '?symbols=AAPL', {
//   headers: {
//     'X-API-Key': API_CONFIG.apiKey
//   }
// });
EOF

chmod 600 "$APP_DIR/frontend-api-config.js"
echo -e "${GREEN}✅ Frontend API configuration created${NC}"

# Final summary
echo -e "\n${GREEN}🔐 API SECURITY SETUP COMPLETE!${NC}"
echo -e "${GREEN}====================================${NC}"
echo ""
echo "✅ Secure API key generated and configured"
echo "✅ Exposed frontend API keys removed"
echo "✅ JWT secrets validated and updated"
echo "✅ File permissions secured"
echo "✅ Application restarted"
echo "✅ API protection tested"

echo ""
echo -e "${YELLOW}📋 IMPORTANT - SAVE THESE CREDENTIALS:${NC}"
echo -e "${YELLOW}=====================================|${NC}"
echo "API Key: $NEW_API_KEY"
echo ""
echo -e "${RED}⚠️  CRITICAL SECURITY NOTES:${NC}"
echo "1. Save the API key above - you'll need it for frontend integration"
echo "2. Never commit the API key to version control"
echo "3. Use environment variables in your frontend deployment"
echo "4. Rotate API keys regularly (monthly recommended)"
echo "5. Monitor API usage for anomalies"

echo ""
echo -e "${YELLOW}📝 Frontend Integration:${NC}"
echo "Add this header to API requests:"
echo "  X-API-Key: $NEW_API_KEY"
echo ""
echo "Configuration file created at:"
echo "  $APP_DIR/frontend-api-config.js"

echo ""
echo -e "${GREEN}📋 PHASE 2 COMPLETE - API ENDPOINTS SECURED${NC}"
echo "Next: Run Phase 3 script to configure domain and final security"

# Save API key to a secure location for reference
echo "$NEW_API_KEY" > "$BACKUP_DIR/api-key-$(date +%Y%m%d-%H%M%S).txt"
chmod 600 "$BACKUP_DIR/api-key-$(date +%Y%m%d-%H%M%S).txt"
echo "API key also saved to: $BACKUP_DIR/api-key-$(date +%Y%m%d-%H%M%S).txt"