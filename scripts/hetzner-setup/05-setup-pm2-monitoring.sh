#!/bin/bash

# HETZNER SERVER SETUP - STEP 5: PM2 MONITORING
# This script sets up PM2 monitoring and auto-restart

echo "📊 Setting up PM2 Monitoring for Alfalyzer"
echo "=========================================="

# Install PM2 globally if not present
echo "📦 Ensuring PM2 is installed..."
npm install -g pm2

# Install PM2 log rotate
echo "📦 Installing PM2 log rotation..."
pm2 install pm2-logrotate

# Configure log rotation
echo "⚙️ Configuring log rotation..."
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
pm2 set pm2-logrotate:dateFormat YYYY-MM-DD_HH-mm-ss
pm2 set pm2-logrotate:workerInterval 3600
pm2 set pm2-logrotate:rotateInterval '0 0 * * *'

# Install PM2 auto-pull (for monitoring)
echo "📦 Installing PM2 monitoring module..."
pm2 install pm2-auto-pull

# Configure monitoring thresholds
echo "⚙️ Setting monitoring thresholds..."
pm2 set pm2-auto-pull:max_memory_threshold 85
pm2 set pm2-auto-pull:max_cpu_threshold 85
pm2 set pm2-auto-pull:min_uptime 10000
pm2 set pm2-auto-pull:max_restarts 10

# Create PM2 startup script
echo "🚀 Setting up PM2 to start on system boot..."
pm2 startup systemd -u $USER --hp /home/$USER
# Note: The above command will output a command to run with sudo. You need to run it manually.

# Save PM2 configuration
echo "💾 Saving PM2 configuration..."
pm2 save

# Create monitoring script
echo "📝 Creating monitoring script..."
cat > /home/$USER/monitor-health.sh <<'EOF'
#!/bin/bash

# Alfalyzer Health Monitoring Script
API_URL="https://api.alfalyzer.com"
HEALTHCHECK_URL="${HEALTHCHECK_URL:-https://hc-ping.com/YOUR_HEALTHCHECK_UUID}"
LOG_FILE="/home/$USER/logs/health-monitor.log"

# Create log directory if it doesn't exist
mkdir -p $(dirname $LOG_FILE)

# Function to log messages
log_message() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

# Check API health
check_api_health() {
    response=$(curl -s -o /dev/null -w "%{http_code}" $API_URL/api/health)
    if [ "$response" = "200" ]; then
        log_message "✅ API Health Check: OK (HTTP $response)"
        return 0
    else
        log_message "❌ API Health Check: FAILED (HTTP $response)"
        return 1
    fi
}

# Check PM2 status
check_pm2_status() {
    pm2_status=$(pm2 jlist)
    if echo "$pm2_status" | grep -q '"status":"online"'; then
        log_message "✅ PM2 Status: Application is running"
        
        # Check for restarts
        restarts=$(echo "$pm2_status" | grep -o '"restart_time":[0-9]*' | cut -d: -f2)
        if [ "$restarts" -gt 5 ]; then
            log_message "⚠️ Warning: Application has restarted $restarts times"
        fi
        return 0
    else
        log_message "❌ PM2 Status: Application is not running"
        return 1
    fi
}

# Check Redis
check_redis() {
    if redis-cli ping > /dev/null 2>&1; then
        memory_usage=$(redis-cli INFO memory | grep used_memory_human | cut -d: -f2 | tr -d '\r')
        log_message "✅ Redis: OK (Memory: $memory_usage)"
        return 0
    else
        log_message "❌ Redis: Not responding"
        return 1
    fi
}

# Check disk space
check_disk_space() {
    disk_usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$disk_usage" -lt 80 ]; then
        log_message "✅ Disk Space: ${disk_usage}% used"
        return 0
    else
        log_message "⚠️ Warning: Disk space ${disk_usage}% used"
        return 1
    fi
}

# Main monitoring
log_message "Starting health check..."

all_good=true

if ! check_api_health; then
    all_good=false
    # Try to restart if API is down
    log_message "Attempting to restart application..."
    pm2 restart alfalyzer
    sleep 10
    check_api_health
fi

if ! check_pm2_status; then
    all_good=false
fi

if ! check_redis; then
    all_good=false
fi

if ! check_disk_space; then
    all_good=false
fi

# Send healthcheck ping if configured
if [ -n "$HEALTHCHECK_URL" ] && [ "$all_good" = true ]; then
    curl -s $HEALTHCHECK_URL > /dev/null
    log_message "✅ Healthcheck ping sent"
fi

log_message "Health check completed"
EOF

chmod +x /home/$USER/monitor-health.sh
echo "✅ Monitoring script created at: /home/$USER/monitor-health.sh"

# Add monitoring to crontab (every 5 minutes)
echo "⏰ Setting up health monitoring every 5 minutes..."
(crontab -l 2>/dev/null | grep -v "monitor-health.sh"; echo "*/5 * * * * /home/$USER/monitor-health.sh > /dev/null 2>&1") | crontab -

# Create PM2 monitoring dashboard script
echo "📝 Creating PM2 dashboard script..."
cat > /home/$USER/pm2-dashboard.sh <<'EOF'
#!/bin/bash

# PM2 Dashboard - Quick status overview
clear
echo "======================================"
echo "     ALFALYZER PM2 DASHBOARD"
echo "======================================"
echo ""

# Show PM2 status
echo "📊 Application Status:"
pm2 status

echo ""
echo "💾 Memory Usage:"
pm2 info alfalyzer | grep -E "memory|heap"

echo ""
echo "📈 Recent Logs:"
pm2 logs alfalyzer --lines 10 --nostream

echo ""
echo "🔄 Quick Commands:"
echo "  pm2 restart alfalyzer  - Restart application"
echo "  pm2 logs alfalyzer     - View logs"
echo "  pm2 monit              - Real-time monitoring"
echo "  pm2 info alfalyzer     - Detailed information"
echo ""
EOF

chmod +x /home/$USER/pm2-dashboard.sh
echo "✅ Dashboard script created at: /home/$USER/pm2-dashboard.sh"

# Show current PM2 status
echo ""
echo "📊 Current PM2 Status:"
pm2 status

echo ""
echo "✅ PM2 Monitoring configured!"
echo "• Log rotation: 10MB max, 7 days retention"
echo "• Health monitoring: Every 5 minutes"
echo "• Auto-restart on crash with 10s minimum uptime"
echo "• View dashboard: /home/$USER/pm2-dashboard.sh"
echo "• View monitoring: pm2 monit"
echo ""
echo "⚠️ IMPORTANT: Run the command shown by 'pm2 startup' with sudo to enable auto-start on boot"
echo ""
echo "Next step: Configure UptimeRobot at https://uptimerobot.com for external monitoring"