#!/bin/bash

# HETZNER SERVER SETUP - STEP 2: NGINX + SSL CONFIGURATION
# This script sets up Nginx as reverse proxy with SSL certificates

echo "🔐 Setting up Nginx with SSL for Alfalyzer"
echo "==========================================="

# Check if domain is provided
if [ -z "$1" ]; then
    echo "❌ Error: Please provide your domain as argument"
    echo "Usage: ./02-setup-nginx-ssl.sh api.alfalyzer.com"
    exit 1
fi

DOMAIN=$1
EMAIL=${2:-"admin@alfalyzer.com"}

echo "📌 Domain: $DOMAIN"
echo "📧 Email: $EMAIL"
echo ""

# Install Nginx and Certbot
echo "📦 Installing Nginx and Certbot..."
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx

# Stop Nginx temporarily
echo "⏸️ Stopping Nginx temporarily..."
sudo systemctl stop nginx

# Create Nginx configuration
echo "📝 Creating Nginx configuration..."
sudo tee /etc/nginx/sites-available/alfalyzer > /dev/null <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    # Redirect all HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $DOMAIN;

    # SSL certificates will be added by Certbot
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Proxy settings
    location / {
        proxy_pass http://127.0.0.1:3001;
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
        proxy_buffering off;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        proxy_busy_buffers_size 8k;
        
        # WebSocket support
        proxy_set_header Sec-WebSocket-Extensions \$http_sec_websocket_extensions;
        proxy_set_header Sec-WebSocket-Key \$http_sec_websocket_key;
        proxy_set_header Sec-WebSocket-Version \$http_sec_websocket_version;
    }

    # Health check endpoint (no auth required)
    location /api/health {
        proxy_pass http://127.0.0.1:3001/api/health;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        access_log off;
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml+rss;

    # Logging
    access_log /var/log/nginx/alfalyzer_access.log;
    error_log /var/log/nginx/alfalyzer_error.log;
}
EOF

# Enable the site
echo "🔗 Enabling Nginx site..."
sudo ln -sf /etc/nginx/sites-available/alfalyzer /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
echo "🧪 Testing Nginx configuration..."
sudo nginx -t

# Start Nginx
echo "▶️ Starting Nginx..."
sudo systemctl start nginx
sudo systemctl enable nginx

# Obtain SSL certificate
echo "🔐 Obtaining SSL certificate from Let's Encrypt..."
sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email $EMAIL --redirect

# Reload Nginx with SSL
echo "🔄 Reloading Nginx with SSL configuration..."
sudo systemctl reload nginx

# Test SSL
echo "🧪 Testing SSL configuration..."
curl -I https://$DOMAIN/api/health

echo ""
echo "✅ Nginx + SSL configuration complete!"
echo "Your API is now accessible at: https://$DOMAIN"
echo ""
echo "Next step: Run 03-setup-redis.sh to install Redis"