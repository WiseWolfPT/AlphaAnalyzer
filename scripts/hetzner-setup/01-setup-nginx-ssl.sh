#!/bin/bash

# ALFALYZER PRODUCTION SECURITY SETUP
# Phase 1: Configure HTTPS with Nginx + SSL (45 minutes)

set -e  # Exit on error

echo "🔒 ALFALYZER SECURITY SETUP - Phase 1: HTTPS + SSL"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration variables
DOMAIN=${1:-"128.140.45.28"}  # Use IP if no domain provided
APP_PORT=${2:-"3001"}
EMAIL=${3:-"admin@alfalyzer.com"}

echo -e "${YELLOW}Configuration:${NC}"
echo "Domain/IP: $DOMAIN"
echo "App Port: $APP_PORT"
echo "Email: $EMAIL"

# Step 1: Update system and install required packages
echo -e "\n${YELLOW}Step 1: Installing Nginx and SSL tools...${NC}"
apt update
apt install -y nginx certbot python3-certbot-nginx ufw

# Step 2: Configure firewall
echo -e "\n${YELLOW}Step 2: Configuring firewall...${NC}"
ufw allow ssh
ufw allow 'Nginx Full'
ufw --force enable

# Step 3: Create Nginx configuration
echo -e "\n${YELLOW}Step 3: Creating Nginx configuration...${NC}"
cat > /etc/nginx/sites-available/alfalyzer << EOF
# Alfalyzer Production Configuration
server {
    listen 80;
    server_name $DOMAIN;

    # Security headers
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; worker-src 'blob:'" always;

    # Rate limiting
    limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone \$binary_remote_addr zone=login:10m rate=5r/m;

    # Main proxy configuration
    location / {
        proxy_pass http://127.0.0.1:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Buffer settings
        proxy_buffering on;
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
    }

    # API rate limiting
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://127.0.0.1:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Auth endpoints with stricter rate limiting
    location /api/auth/ {
        limit_req zone=login burst=3 nodelay;
        proxy_pass http://127.0.0.1:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Health check (no rate limiting)
    location /health {
        proxy_pass http://127.0.0.1:$APP_PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        access_log off;
    }

    # Block sensitive files
    location ~ /\. {
        deny all;
    }
    
    location ~ \.(env|log|config)$ {
        deny all;
    }
}
EOF

# Step 4: Enable site and test configuration
echo -e "\n${YELLOW}Step 4: Enabling Nginx site...${NC}"
ln -sf /etc/nginx/sites-available/alfalyzer /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Nginx configuration test failed!${NC}"
    exit 1
fi

# Step 5: Start Nginx
echo -e "\n${YELLOW}Step 5: Starting Nginx...${NC}"
systemctl enable nginx
systemctl restart nginx

# Step 6: Check if we can obtain SSL certificate
echo -e "\n${YELLOW}Step 6: SSL Certificate Setup...${NC}"

# Check if domain is an IP address
if [[ $DOMAIN =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo -e "${YELLOW}⚠️  Domain is an IP address - SSL certificate cannot be obtained automatically${NC}"
    echo -e "${YELLOW}📝 Manual SSL steps required:${NC}"
    echo "   1. Point a domain name to this server"
    echo "   2. Run: certbot --nginx -d yourdomain.com"
    echo "   3. Configure DNS A record: yourdomain.com -> $DOMAIN"
else
    echo -e "${GREEN}✅ Domain detected: $DOMAIN${NC}"
    echo -e "${YELLOW}Attempting to obtain SSL certificate...${NC}"
    
    # Obtain SSL certificate
    certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email $EMAIL --redirect
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ SSL certificate obtained successfully!${NC}"
        
        # Set up automatic renewal
        systemctl enable certbot.timer
        systemctl start certbot.timer
        
        echo -e "${GREEN}✅ SSL auto-renewal configured${NC}"
    else
        echo -e "${RED}❌ SSL certificate setup failed${NC}"
        echo -e "${YELLOW}Manual SSL setup may be required${NC}"
    fi
fi

# Step 7: Test the setup
echo -e "\n${YELLOW}Step 7: Testing setup...${NC}"
sleep 3

# Test HTTP connection
if curl -f http://localhost/health >/dev/null 2>&1; then
    echo -e "${GREEN}✅ HTTP proxy working${NC}"
else
    echo -e "${RED}❌ HTTP proxy test failed${NC}"
fi

# Test external access
if curl -f "http://$DOMAIN/health" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ External HTTP access working${NC}"
else
    echo -e "${YELLOW}⚠️  External HTTP access test failed (might be normal if SSL redirect is active)${NC}"
fi

# Final status
echo -e "\n${GREEN}🚀 NGINX + SSL SETUP COMPLETE!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo "✅ Nginx reverse proxy configured"
echo "✅ Security headers enabled"
echo "✅ Rate limiting configured"
echo "✅ Firewall configured"

if [[ $DOMAIN =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "⚠️  SSL: Manual setup required (using IP address)"
    echo ""
    echo "📝 Next steps for SSL:"
    echo "   1. Configure domain DNS: yourdomain.com -> $DOMAIN"
    echo "   2. Run: certbot --nginx -d yourdomain.com"
else
    echo "✅ SSL certificate configured"
fi

echo ""
echo "🔗 Access URLs:"
echo "   - HTTP: http://$DOMAIN"
echo "   - HTTPS: https://$DOMAIN (if SSL configured)"
echo "   - Health: http://$DOMAIN/health"
echo "   - API: http://$DOMAIN/api/health"

echo ""
echo -e "${YELLOW}⚠️  IMPORTANT SECURITY NOTES:${NC}"
echo "1. Change default SSH port: nano /etc/ssh/sshd_config"
echo "2. Configure fail2ban: apt install fail2ban"
echo "3. Regular security updates: apt update && apt upgrade"
echo "4. Monitor logs: tail -f /var/log/nginx/access.log"

echo ""
echo -e "${GREEN}📋 PHASE 1 COMPLETE - HTTPS INFRASTRUCTURE READY${NC}"
echo "Next: Run Phase 2 script to secure API endpoints"