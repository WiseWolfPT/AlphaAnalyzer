#!/bin/bash

# =========================================
# REDIS INSTALLATION FOR ALFALYZER HETZNER
# Server: 128.140.45.28 (ubuntu-4gb-nbg1-2)
# =========================================

echo "=== ALFALYZER REDIS SETUP ==="
echo "Server: 128.140.45.28"
echo "----------------------------------------"

# Check if running as root
if [[ $EUID -ne 0 ]]; then 
   echo "This script must be run as root" 
   exit 1
fi

# Update system
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install Redis
echo "🔧 Installing Redis server..."
apt install redis-server -y

# Generate secure password
REDIS_PASSWORD=$(openssl rand -base64 32)
echo "🔐 Generated Redis password: $REDIS_PASSWORD"

# Configure Redis
echo "⚙️ Configuring Redis for production..."
cat > /etc/redis/redis.conf << EOF
# Redis Configuration for Alfalyzer
bind 127.0.0.1
port 6379
maxmemory 256mb
maxmemory-policy allkeys-lru
requirepass $REDIS_PASSWORD

# Persistence
save 60 1
appendonly yes
appendfilename "redis.aof"
dir /var/lib/redis

# Logging
logfile /var/log/redis/redis-server.log
loglevel notice
EOF

# Restart Redis
echo "🔄 Restarting Redis..."
systemctl restart redis-server
systemctl enable redis-server

# Test Redis
echo "🧪 Testing Redis..."
redis-cli -a "$REDIS_PASSWORD" ping

# Save credentials
cat > /root/redis-credentials.txt << EOF
Redis Installation - Alfalyzer
==============================
Date: $(date)
Server: 128.140.45.28
Password: $REDIS_PASSWORD

For Node.js .env:
REDIS_URL=redis://default:$REDIS_PASSWORD@127.0.0.1:6379
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=$REDIS_PASSWORD
EOF

echo "
✅ REDIS INSTALLED SUCCESSFULLY!
================================
Password saved in: /root/redis-credentials.txt

Add to your .env file:
REDIS_URL=redis://default:$REDIS_PASSWORD@127.0.0.1:6379
"