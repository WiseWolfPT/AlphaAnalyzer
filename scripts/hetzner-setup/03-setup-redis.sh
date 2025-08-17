#!/bin/bash

# HETZNER SERVER SETUP - STEP 3: REDIS CONFIGURATION
# This script installs and configures Redis for production

echo "💾 Setting up Redis for Alfalyzer Production"
echo "==========================================="

# Install Redis
echo "📦 Installing Redis server..."
sudo apt update
sudo apt install -y redis-server

# Backup original config
echo "📄 Backing up original Redis configuration..."
sudo cp /etc/redis/redis.conf /etc/redis/redis.conf.backup

# Configure Redis for production
echo "⚙️ Configuring Redis for production..."
sudo tee /etc/redis/redis.conf > /dev/null <<'EOF'
# Redis Configuration for Alfalyzer Production

# Network - ONLY localhost access
bind 127.0.0.1 ::1
protected-mode yes
port 6379

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

# Test Redis connection
echo "🧪 Testing Redis connection..."
redis-cli ping

# Check Redis info
echo "📊 Redis memory info:"
redis-cli INFO memory | grep -E "used_memory_human|maxmemory_human"

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
echo "Redis is running on localhost:6379 with 256MB memory limit"
echo ""
echo "Next step: Run 04-setup-backups.sh to configure automatic backups"