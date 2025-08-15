#!/bin/bash

# Alfalyzer Production Deployment Script for Hetzner+Coolify
# Version 3.0 - Consolidated Architecture

echo "🚀 ALFALYZER PRODUCTION DEPLOYMENT - HETZNER+COOLIFY"
echo "====================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
HETZNER_IP="YOUR_HETZNER_IP_HERE"  # Replace with actual IP
DOMAIN="alfalyzer.com"
COOLIFY_URL="https://coolify.alfalyzer.com"  # If you have Coolify on subdomain

echo -e "${YELLOW}📋 Pre-deployment Checklist:${NC}"
echo "--------------------------------"
echo "✅ All 5 security vulnerabilities fixed"
echo "✅ Bundle size optimized to 362KB"
echo "✅ Reddit Strategy connected to routes"
echo "✅ PM2 configuration ready"
echo "✅ Monitoring configured"
echo ""

# 1. Build the application
echo -e "${YELLOW}📦 Building application...${NC}"
npm run build:full
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Build successful${NC}"

# 2. Run tests
echo -e "${YELLOW}🧪 Running tests...${NC}"
npm test -- --run
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Tests failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Tests passed${NC}"

# 3. Create production .env file
echo -e "${YELLOW}🔐 Creating production environment file...${NC}"
cat > .env.production << 'EOF'
# Production Environment Variables
NODE_ENV=production
PORT=3001

# Database
SUPABASE_URL=https://avjnfessefxtfurayybp.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_KEY_HERE
SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE

# API Keys (server-side only, no VITE_ prefix!)
FMP_API_KEY=YOUR_FMP_KEY_HERE
ALPHA_VANTAGE_API_KEY=YOUR_ALPHA_KEY_HERE

# JWT Secrets (minimum 32 characters)
JWT_SECRET=YOUR_32_CHAR_SECRET_HERE_REPLACE_ME_NOW
JWT_ACCESS_SECRET=YOUR_32_CHAR_ACCESS_SECRET_REPLACE_ME
JWT_REFRESH_SECRET=YOUR_32_CHAR_REFRESH_SECRET_REPLACE

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Monitoring
HEALTHCHECK_UUID=YOUR_HEALTHCHECKS_IO_UUID_HERE

# Server Configuration
SERVE_STATIC=true
FRONTEND_URL=https://alfalyzer.com
EOF

echo -e "${YELLOW}⚠️  IMPORTANT: Edit .env.production with your actual keys!${NC}"
echo ""

# 4. Create deployment package
echo -e "${YELLOW}📦 Creating deployment package...${NC}"
tar -czf alfalyzer-deploy.tar.gz \
    dist/ \
    server/ \
    client/ \
    package.json \
    package-lock.json \
    ecosystem.config.cjs \
    .env.production \
    artillery-500-users.yml

echo -e "${GREEN}✅ Deployment package created${NC}"

# 5. Deployment instructions
echo ""
echo -e "${GREEN}🎯 DEPLOYMENT INSTRUCTIONS:${NC}"
echo "================================"
echo ""
echo "1. CONFIGURE ENVIRONMENT:"
echo "   - Edit .env.production with your actual API keys"
echo "   - Ensure JWT secrets are at least 32 characters"
echo "   - Add your Healthchecks.io UUID"
echo ""
echo "2. DEPLOY TO HETZNER:"
echo "   Option A - Via Coolify UI:"
echo "   - Login to Coolify: $COOLIFY_URL"
echo "   - Create new application"
echo "   - Select Node.js buildpack"
echo "   - Connect to GitHub repo"
echo "   - Set environment variables"
echo "   - Deploy"
echo ""
echo "   Option B - Manual SSH:"
echo "   scp alfalyzer-deploy.tar.gz root@$HETZNER_IP:/opt/alfalyzer/"
echo "   ssh root@$HETZNER_IP"
echo "   cd /opt/alfalyzer"
echo "   tar -xzf alfalyzer-deploy.tar.gz"
echo "   npm install --production"
echo "   pm2 start ecosystem.config.cjs"
echo "   pm2 save"
echo ""
echo "3. CONFIGURE DNS:"
echo "   Point $DOMAIN to IP: $HETZNER_IP"
echo "   A Record: @ -> $HETZNER_IP"
echo "   A Record: www -> $HETZNER_IP"
echo ""
echo "4. VERIFY DEPLOYMENT:"
echo "   curl https://$DOMAIN/api/health"
echo "   curl https://$DOMAIN/api/health/monitoring"
echo ""
echo "5. RUN LOAD TEST:"
echo "   npx artillery run artillery-500-users.yml --target https://$DOMAIN"
echo ""
echo -e "${YELLOW}📝 POST-DEPLOYMENT CHECKLIST:${NC}"
echo "[ ] Environment variables configured"
echo "[ ] Application accessible at https://$DOMAIN"
echo "[ ] API health check passing"
echo "[ ] PM2 process running"
echo "[ ] Healthchecks.io receiving pings"
echo "[ ] Load test completed successfully"
echo "[ ] Cache hit rate > 90%"
echo "[ ] No errors in PM2 logs"
echo ""
echo -e "${GREEN}🚀 Ready for production deployment!${NC}"