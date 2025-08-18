#!/bin/bash

# 🔧 ALFALYZER PRODUCTION FIXES SCRIPT
# Execute este script NO SERVIDOR Hetzner após o deploy-frontend-hetzner.sh

echo "================================================"
echo "🔧 ALFALYZER PRODUCTION FIXES"
echo "================================================"

# Navigate to project directory
cd "/home/teste 1" || exit 1

# FASE 1: SEGURANÇA CRÍTICA
echo ""
echo "🔒 FASE 1: CONFIGURAR FIREWALL UFW"
echo "================================================"
echo "Configurando firewall..."

# Check if UFW is installed
if ! command -v ufw &> /dev/null; then
    echo "Installing UFW..."
    sudo apt update
    sudo apt install -y ufw
fi

# Configure UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 3001/tcp  # Application
sudo ufw allow 80/tcp    # HTTP (for future Nginx)
sudo ufw allow 443/tcp   # HTTPS (for future Nginx)

# Enable UFW (non-interactive)
echo "y" | sudo ufw enable

echo "✅ Firewall configured and enabled"
sudo ufw status

# FASE 2: INSTALAR REDIS REAL
echo ""
echo "💾 FASE 2: INSTALAR REDIS"
echo "================================================"

# Check if Redis is installed
if ! command -v redis-server &> /dev/null; then
    echo "Installing Redis..."
    sudo apt update
    sudo apt install -y redis-server
fi

# Configure Redis
echo "Configuring Redis..."
sudo bash -c 'cat > /etc/redis/redis.conf << EOF
bind 127.0.0.1
port 6379
maxmemory 256mb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
dir /var/lib/redis
dbfilename dump.rdb
EOF'

# Start Redis
sudo systemctl enable redis-server
sudo systemctl restart redis-server

# Test Redis
echo "Testing Redis connection..."
if redis-cli ping | grep -q "PONG"; then
    echo "✅ Redis is working!"
else
    echo "❌ Redis connection failed"
fi

# FASE 3: ATUALIZAR CONFIGURAÇÃO
echo ""
echo "⚙️ FASE 3: ATUALIZAR CONFIGURAÇÃO"
echo "================================================"

# Generate secure Redis password
REDIS_PASSWORD=$(openssl rand -base64 32)
echo "Generated Redis password: $REDIS_PASSWORD"

# Update Redis with password
sudo bash -c "echo 'requirepass $REDIS_PASSWORD' >> /etc/redis/redis.conf"
sudo systemctl restart redis-server

# Update .env file
if grep -q "REDIS_PASSWORD=" .env; then
    sed -i "s/REDIS_PASSWORD=.*/REDIS_PASSWORD=$REDIS_PASSWORD/" .env
else
    echo "REDIS_PASSWORD=$REDIS_PASSWORD" >> .env
fi

if grep -q "REDIS_HOST=" .env; then
    sed -i "s/REDIS_HOST=.*/REDIS_HOST=127.0.0.1/" .env
else
    echo "REDIS_HOST=127.0.0.1" >> .env
fi

if grep -q "REDIS_PORT=" .env; then
    sed -i "s/REDIS_PORT=.*/REDIS_PORT=6379/" .env
else
    echo "REDIS_PORT=6379" >> .env
fi

echo "✅ Configuration updated with Redis credentials"

# FASE 4: CONFIGURAR NGINX (OPCIONAL)
echo ""
echo "🌐 FASE 4: NGINX SETUP (Optional)"
echo "================================================"
echo "To setup Nginx with HTTPS, run these commands manually:"
echo ""
echo "sudo apt install -y nginx certbot python3-certbot-nginx"
echo ""
echo "Create Nginx config:"
echo "sudo nano /etc/nginx/sites-available/alfalyzer"
echo ""
echo "Add this configuration:"
cat << 'NGINX_CONFIG'
server {
    listen 80;
    server_name 128.140.45.28;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX_CONFIG
echo ""
echo "Then enable it:"
echo "sudo ln -s /etc/nginx/sites-available/alfalyzer /etc/nginx/sites-enabled/"
echo "sudo nginx -t"
echo "sudo systemctl restart nginx"

# FASE 5: CONFIGURAR BACKUPS
echo ""
echo "💾 FASE 5: CONFIGURAR BACKUPS"
echo "================================================"

# Create backup script
cat > /home/user/backup-alfalyzer.sh << 'BACKUP_SCRIPT'
#!/bin/bash
TIMESTAMP=$(date +"%F-%H%M")
BACKUP_DIR="/home/user/backups"
mkdir -p $BACKUP_DIR

# Backup Redis
cp /var/lib/redis/dump.rdb $BACKUP_DIR/redis_$TIMESTAMP.rdb

# Backup application
tar -czf $BACKUP_DIR/app_$TIMESTAMP.tar.gz /home/teste\ 1/ --exclude=node_modules --exclude=logs

# Keep only last 7 days
find $BACKUP_DIR -name "*.rdb" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $TIMESTAMP"
BACKUP_SCRIPT

chmod +x /home/user/backup-alfalyzer.sh

# Add to crontab
(crontab -l 2>/dev/null; echo "0 3 * * * /home/user/backup-alfalyzer.sh") | crontab -

echo "✅ Backup script created and scheduled"

# FASE 6: RESTART E TESTE FINAL
echo ""
echo "🔄 FASE 6: RESTART E TESTE FINAL"
echo "================================================"

# Restart PM2 with updated config
pm2 restart all --update-env
sleep 5

# Check status
pm2 status

# Test API
echo ""
echo "Testing API health..."
curl -s http://localhost:3001/api/health | python3 -m json.tool

# Final summary
echo ""
echo "================================================"
echo "✅ PRODUCTION FIXES COMPLETED"
echo "================================================"
echo ""
echo "✅ Firewall: Configured and active"
echo "✅ Redis: Installed with password authentication"
echo "✅ Configuration: Updated with Redis credentials"
echo "✅ Backups: Scheduled daily at 3 AM"
echo ""
echo "📝 MANUAL STEPS REQUIRED:"
echo "1. Setup Nginx for port 80/443 (instructions above)"
echo "2. Configure domain and SSL certificate"
echo "3. Setup monitoring (UptimeRobot, etc)"
echo ""
echo "🔒 SECURITY CHECKLIST:"
echo "[✓] Firewall active (UFW)"
echo "[✓] Redis protected with password"
echo "[✓] Redis bound to localhost only"
echo "[ ] HTTPS configured (manual step)"
echo "[ ] Monitoring configured (manual step)"
echo ""
echo "🌐 Access your application:"
echo "   http://128.140.45.28:3001"
echo "================================================"