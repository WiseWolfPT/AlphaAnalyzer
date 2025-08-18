#!/bin/bash

# HETZNER SERVER SETUP - STEP 3: REDIS CONFIGURATION (SECURE VERSION)
# This script installs and configures Redis for production with authentication

echo "💾 Setting up Redis for Alfalyzer Production (SECURE)"
echo "=================================================="

# Generate strong Redis password
echo "🔐 Generating secure Redis password..."
REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
echo "Generated Redis password: $REDIS_PASSWORD"

# Install Redis
echo "📦 Installing Redis server..."
sudo apt update
sudo apt install -y redis-server

# Backup original config
echo "📄 Backing up original Redis configuration..."
sudo cp /etc/redis/redis.conf /etc/redis/redis.conf.backup

# Configure Redis for production with authentication
echo "⚙️ Configuring Redis for production with security..."
sudo tee /etc/redis/redis.conf > /dev/null <<EOF
# Redis Configuration for Alfalyzer Production (SECURE)

# Network - ONLY localhost access
bind 127.0.0.1 ::1
protected-mode yes
port 6379

# SECURITY: Authentication required
requirepass $REDIS_PASSWORD

# General
daemonize yes
supervised systemd
pidfile /var/run/redis/redis-server.pid
loglevel notice
logfile /var/log/redis/redis-server.log
databases 16

# Memory Management
maxmemory 256mb
maxmemory-policy allkeys-lru

# Persistence - RDB snapshots
save 900 1      # Save after 900 sec (15 min) if at least 1 key changed
save 300 10     # Save after 300 sec (5 min) if at least 10 keys changed
save 60 10000   # Save after 60 sec if at least 10000 keys changed

stop-writes-on-bgsave-error yes
rdbcompression yes
rdbchecksum yes
dbfilename dump.rdb
dir /var/lib/redis

# Append Only File (disabled for now, RDB is enough)
appendonly no

# Slow log
slowlog-log-slower-than 10000
slowlog-max-len 128

# Client connections
timeout 300
tcp-keepalive 300
tcp-backlog 511
maxclients 10000

# Threading
io-threads 4
io-threads-do-reads yes

# Security enhancements
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command DEBUG ""
rename-command CONFIG "CONFIG_9f2a8b1c3d4e5f6g"
EOF

# Set proper permissions
echo "🔒 Setting Redis permissions..."
sudo chown redis:redis /etc/redis/redis.conf
sudo chmod 640 /etc/redis/redis.conf

# Create Redis directories if needed
sudo mkdir -p /var/lib/redis
sudo chown redis:redis /var/lib/redis
sudo chmod 750 /var/lib/redis

# Restart Redis with new configuration
echo "🔄 Restarting Redis with new configuration..."
sudo systemctl restart redis-server
sudo systemctl enable redis-server

# Wait for Redis to start
echo "⏳ Waiting for Redis to start..."
sleep 3

# Save Redis credentials securely
echo "💾 Saving Redis credentials..."
sudo mkdir -p /home/teste\ 1/.env
echo "REDIS_HOST=localhost" | sudo tee /home/teste\ 1/.env/redis.conf
echo "REDIS_PORT=6379" | sudo tee -a /home/teste\ 1/.env/redis.conf
echo "REDIS_PASSWORD=$REDIS_PASSWORD" | sudo tee -a /home/teste\ 1/.env/redis.conf
echo "REDIS_URL=redis://:$REDIS_PASSWORD@localhost:6379" | sudo tee -a /home/teste\ 1/.env/redis.conf
sudo chown teste:teste /home/teste\ 1/.env/redis.conf
sudo chmod 600 /home/teste\ 1/.env/redis.conf

# Test Redis connection with auth
echo "🧪 Testing Redis connection with authentication..."
redis-cli -a $REDIS_PASSWORD ping

# Check Redis info with auth
echo "📊 Redis memory info:"
redis-cli -a $REDIS_PASSWORD INFO memory | grep -E "used_memory_human|maxmemory_human"

# Test basic operations
echo "🔧 Testing Redis operations..."
redis-cli -a $REDIS_PASSWORD set test_key "alfalyzer_redis_working"
REDIS_TEST=$(redis-cli -a $REDIS_PASSWORD get test_key)
if [ "$REDIS_TEST" = "alfalyzer_redis_working" ]; then
    echo "✅ Redis operations working correctly"
    redis-cli -a $REDIS_PASSWORD del test_key
else
    echo "❌ Redis operations failed"
    exit 1
fi

# Create systemd service override for better reliability
echo "🛡️ Creating systemd override for Redis..."
sudo mkdir -p /etc/systemd/system/redis-server.service.d
sudo tee /etc/systemd/system/redis-server.service.d/override.conf > /dev/null <<EOF
[Service]
Restart=always
RestartSec=5s
StartLimitInterval=0
EOF

# Reload systemd
sudo systemctl daemon-reload

# Final status check
echo "✅ Redis status:"
sudo systemctl status redis-server --no-pager

echo ""
echo "✅ Redis configuration complete!"
echo "Redis is running on localhost:6379 with 256MB memory limit and authentication"
echo ""
echo "🔐 Redis credentials saved to: /home/teste 1/.env/redis.conf"
echo ""
echo "📋 ADD THESE TO YOUR .env.production FILE:"
echo "REDIS_HOST=localhost"
echo "REDIS_PORT=6379"
echo "REDIS_PASSWORD=$REDIS_PASSWORD"
echo "REDIS_URL=redis://:$REDIS_PASSWORD@localhost:6379"
echo ""
echo "🚨 IMPORTANT SECURITY NOTES:"
echo "- Redis password: $REDIS_PASSWORD (SAVE THIS SECURELY!)"
echo "- Redis bound to localhost only (127.0.0.1)"
echo "- Dangerous commands disabled (FLUSHDB, FLUSHALL, DEBUG)"
echo "- CONFIG command renamed for security"
echo ""
echo "🔧 To test Redis after updating .env.production:"
echo "cd /home/teste\ 1/ && npm run redis:test"
echo ""
echo "Next step: Update .env.production with Redis credentials and restart PM2"