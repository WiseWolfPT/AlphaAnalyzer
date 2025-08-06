#!/bin/bash

# =========================================
# REDIS INSTALLATION SCRIPT FOR HETZNER CX22
# Following ALFALYZER-PRODUCTION-PLAN.md Day 3
# =========================================

echo "=== ALFALYZER REDIS SETUP FOR HETZNER ==="
echo "This script should be run on the Hetzner CX22 server"
echo "----------------------------------------"

# Check if running as root
if [[ $EUID -ne 0 ]]; then 
   echo "This script must be run as root on the Hetzner server" 
   exit 1
fi

# Update system
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install Redis
echo "🔧 Installing Redis server..."
apt install redis-server -y

# Backup original config
echo "📋 Backing up original Redis config..."
cp /etc/redis/redis.conf /etc/redis/redis.conf.backup

# Configure Redis according to ALFALYZER-PRODUCTION-PLAN.md
echo "⚙️ Configuring Redis for production..."
cat > /etc/redis/redis.conf << 'EOF'
# Redis Configuration for Alfalyzer
# Based on ALFALYZER-PRODUCTION-PLAN.md specifications

# Network
bind 127.0.0.1
port 6379
timeout 0
tcp-keepalive 300

# Memory Management (Critical for 500MB Supabase limit)
maxmemory 256mb
maxmemory-policy allkeys-lru

# Persistence
save 60 1
stop-writes-on-bgsave-error yes
rdbcompression yes
rdbchecksum yes
dbfilename dump.rdb
dir /var/lib/redis

# Append Only File
appendonly yes
appendfilename "redis.aof"
appendfsync everysec
no-appendfsync-on-rewrite no
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb

# Logging
logfile /var/log/redis/redis-server.log
loglevel notice

# Security
protected-mode yes
requirepass ${REDIS_PASSWORD:-alfalyzer_redis_2025_secure}

# Clients
maxclients 10000

# Performance
tcp-backlog 511
databases 16
EOF

# Create Redis password if not set
if [ -z "$REDIS_PASSWORD" ]; then
    REDIS_PASSWORD=$(openssl rand -base64 32)
    echo "🔐 Generated Redis password: $REDIS_PASSWORD"
    echo "IMPORTANT: Save this password in your .env file!"
    echo "REDIS_PASSWORD=$REDIS_PASSWORD" >> /root/redis-credentials.txt
fi

# Restart Redis with new config
echo "🔄 Restarting Redis server..."
systemctl restart redis-server
systemctl enable redis-server

# Test Redis
echo "🧪 Testing Redis connection..."
redis-cli -a "$REDIS_PASSWORD" ping

if [ $? -eq 0 ]; then
    echo "✅ Redis installed and configured successfully!"
else
    echo "❌ Redis test failed. Check logs: journalctl -u redis-server"
    exit 1
fi

# Show Redis info
echo "📊 Redis Memory Info:"
redis-cli -a "$REDIS_PASSWORD" INFO memory | grep used_memory_human

# Create systemd service for auto-start
echo "🚀 Enabling Redis auto-start..."
systemctl enable redis-server

# Setup log rotation
echo "📝 Setting up log rotation..."
cat > /etc/logrotate.d/redis << 'EOF'
/var/log/redis/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 640 redis redis
    sharedscripts
    postrotate
        systemctl reload redis-server
    endscript
}
EOF

# Firewall configuration (if ufw is installed)
if command -v ufw &> /dev/null; then
    echo "🔥 Configuring firewall..."
    # Redis should only be accessible locally
    ufw deny 6379
    echo "Redis port 6379 blocked from external access"
fi

# Create monitoring script
echo "📈 Creating monitoring script..."
cat > /usr/local/bin/redis-monitor.sh << 'EOF'
#!/bin/bash
# Quick Redis health check for Alfalyzer

REDIS_PASSWORD=${REDIS_PASSWORD:-alfalyzer_redis_2025_secure}

echo "=== Redis Health Check ==="
echo "Memory Usage:"
redis-cli -a "$REDIS_PASSWORD" INFO memory | grep -E "used_memory_human|used_memory_peak_human|maxmemory_human"

echo -e "\nConnected Clients:"
redis-cli -a "$REDIS_PASSWORD" INFO clients | grep connected_clients

echo -e "\nDatabase Size:"
redis-cli -a "$REDIS_PASSWORD" DBSIZE

echo -e "\nLast Save:"
redis-cli -a "$REDIS_PASSWORD" LASTSAVE
EOF

chmod +x /usr/local/bin/redis-monitor.sh

echo "
=========================================
✅ REDIS INSTALLATION COMPLETE!
=========================================

📝 NEXT STEPS:
1. Save the Redis password from /root/redis-credentials.txt
2. Update your .env file with:
   REDIS_URL=redis://default:$REDIS_PASSWORD@localhost:6379
   
3. Test from Node.js application:
   npm run test:redis

4. Monitor Redis:
   /usr/local/bin/redis-monitor.sh

5. View logs:
   journalctl -u redis-server -n 50

📊 Current Status:
$(redis-cli -a "$REDIS_PASSWORD" INFO server | grep redis_version)
Memory Limit: 256MB
Policy: LRU (Least Recently Used)
Persistence: AOF + RDB

🔒 Security:
- Bound to localhost only
- Password protected
- Firewall configured

=========================================
"

# Save installation summary
cat > /root/redis-installation-summary.txt << EOF
Redis Installation Summary
==========================
Date: $(date)
Version: $(redis-server --version)
Password: $REDIS_PASSWORD
Config: /etc/redis/redis.conf
Data Dir: /var/lib/redis
Log: /var/log/redis/redis-server.log
Monitor Script: /usr/local/bin/redis-monitor.sh

Environment Variable for Node.js:
REDIS_URL=redis://default:$REDIS_PASSWORD@localhost:6379
EOF

echo "📄 Installation summary saved to /root/redis-installation-summary.txt"