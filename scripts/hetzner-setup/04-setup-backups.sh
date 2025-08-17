#!/bin/bash

# HETZNER SERVER SETUP - STEP 4: AUTOMATIC BACKUPS
# This script sets up automated backups for Redis and application data

echo "💾 Setting up Automatic Backups for Alfalyzer"
echo "============================================="

# Create backup directory
BACKUP_DIR="/home/$USER/backups"
echo "📁 Creating backup directory: $BACKUP_DIR"
mkdir -p $BACKUP_DIR

# Create backup script
echo "📝 Creating backup script..."
cat > /home/$USER/backup.sh <<'EOF'
#!/bin/bash

# Alfalyzer Backup Script
TIMESTAMP=$(date +"%F-%H%M")
BACKUP_DIR="/home/$USER/backups"
LOG_FILE="$BACKUP_DIR/backup.log"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Function to log messages
log_message() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

log_message "Starting backup process..."

# 1. Backup Redis
log_message "Backing up Redis database..."
if [ -f /var/lib/redis/dump.rdb ]; then
    sudo cp /var/lib/redis/dump.rdb $BACKUP_DIR/redis_$TIMESTAMP.rdb
    log_message "Redis backup completed: redis_$TIMESTAMP.rdb"
else
    log_message "Warning: Redis dump file not found"
fi

# 2. Backup environment files
log_message "Backing up environment files..."
if [ -f /home/$USER/teste\ 1/.env.production ]; then
    cp "/home/$USER/teste 1/.env.production" $BACKUP_DIR/env_$TIMESTAMP.env
    log_message "Environment backup completed: env_$TIMESTAMP.env"
fi

# 3. Backup PM2 configuration
log_message "Backing up PM2 configuration..."
pm2 save
if [ -f /home/$USER/.pm2/dump.pm2 ]; then
    cp /home/$USER/.pm2/dump.pm2 $BACKUP_DIR/pm2_$TIMESTAMP.pm2
    log_message "PM2 backup completed: pm2_$TIMESTAMP.pm2"
fi

# 4. Backup Nginx configuration
log_message "Backing up Nginx configuration..."
sudo cp /etc/nginx/sites-available/alfalyzer $BACKUP_DIR/nginx_$TIMESTAMP.conf
log_message "Nginx backup completed: nginx_$TIMESTAMP.conf"

# 5. Create compressed archive of logs (optional)
log_message "Backing up application logs..."
if [ -d "/home/$USER/teste 1/logs" ]; then
    tar -czf $BACKUP_DIR/logs_$TIMESTAMP.tar.gz -C "/home/$USER/teste 1" logs/
    log_message "Logs backup completed: logs_$TIMESTAMP.tar.gz"
fi

# 6. Clean up old backups (keep last 7 days)
log_message "Cleaning up old backups (keeping last 7 days)..."
find $BACKUP_DIR -name "redis_*.rdb" -mtime +7 -delete
find $BACKUP_DIR -name "env_*.env" -mtime +7 -delete
find $BACKUP_DIR -name "pm2_*.pm2" -mtime +7 -delete
find $BACKUP_DIR -name "nginx_*.conf" -mtime +7 -delete
find $BACKUP_DIR -name "logs_*.tar.gz" -mtime +7 -delete

# 7. Show backup size
BACKUP_SIZE=$(du -sh $BACKUP_DIR | cut -f1)
log_message "Backup completed successfully. Total backup size: $BACKUP_SIZE"

# 8. Optional: Send backup to remote storage
# Uncomment and configure if you have remote backup storage
# log_message "Sending backup to remote storage..."
# rsync -avz $BACKUP_DIR/ user@backup-server:/path/to/remote/backups/
# log_message "Remote backup completed"

log_message "Backup process finished"
echo "✅ Backup completed at $(date)"
EOF

# Make backup script executable
chmod +x /home/$USER/backup.sh
echo "✅ Backup script created at: /home/$USER/backup.sh"

# Create restore script
echo "📝 Creating restore script..."
cat > /home/$USER/restore.sh <<'EOF'
#!/bin/bash

# Alfalyzer Restore Script
echo "🔄 Alfalyzer Restore Script"
echo "=========================="

BACKUP_DIR="/home/$USER/backups"

# List available backups
echo "📋 Available backups:"
ls -lh $BACKUP_DIR/*.rdb 2>/dev/null | tail -5
echo ""

# Ask for backup date
read -p "Enter backup date (YYYY-MM-DD-HHMM) or 'latest' for most recent: " BACKUP_DATE

if [ "$BACKUP_DATE" == "latest" ]; then
    REDIS_BACKUP=$(ls -t $BACKUP_DIR/redis_*.rdb 2>/dev/null | head -1)
    ENV_BACKUP=$(ls -t $BACKUP_DIR/env_*.env 2>/dev/null | head -1)
    PM2_BACKUP=$(ls -t $BACKUP_DIR/pm2_*.pm2 2>/dev/null | head -1)
    NGINX_BACKUP=$(ls -t $BACKUP_DIR/nginx_*.conf 2>/dev/null | head -1)
else
    REDIS_BACKUP="$BACKUP_DIR/redis_$BACKUP_DATE.rdb"
    ENV_BACKUP="$BACKUP_DIR/env_$BACKUP_DATE.env"
    PM2_BACKUP="$BACKUP_DIR/pm2_$BACKUP_DATE.pm2"
    NGINX_BACKUP="$BACKUP_DIR/nginx_$BACKUP_DATE.conf"
fi

echo "Will restore from:"
echo "  Redis: $REDIS_BACKUP"
echo "  Env: $ENV_BACKUP"
echo "  PM2: $PM2_BACKUP"
echo "  Nginx: $NGINX_BACKUP"
echo ""

read -p "⚠️ This will overwrite current data. Continue? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo "Restore cancelled"
    exit 1
fi

# Stop services
echo "Stopping services..."
pm2 stop all
sudo systemctl stop redis-server

# Restore Redis
if [ -f "$REDIS_BACKUP" ]; then
    echo "Restoring Redis..."
    sudo cp "$REDIS_BACKUP" /var/lib/redis/dump.rdb
    sudo chown redis:redis /var/lib/redis/dump.rdb
    echo "✅ Redis restored"
else
    echo "⚠️ Redis backup not found"
fi

# Restore environment
if [ -f "$ENV_BACKUP" ]; then
    echo "Restoring environment file..."
    cp "$ENV_BACKUP" "/home/$USER/teste 1/.env.production"
    echo "✅ Environment restored"
else
    echo "⚠️ Environment backup not found"
fi

# Restore PM2
if [ -f "$PM2_BACKUP" ]; then
    echo "Restoring PM2 configuration..."
    cp "$PM2_BACKUP" /home/$USER/.pm2/dump.pm2
    echo "✅ PM2 configuration restored"
else
    echo "⚠️ PM2 backup not found"
fi

# Restore Nginx
if [ -f "$NGINX_BACKUP" ]; then
    echo "Restoring Nginx configuration..."
    sudo cp "$NGINX_BACKUP" /etc/nginx/sites-available/alfalyzer
    sudo nginx -t && sudo systemctl reload nginx
    echo "✅ Nginx configuration restored"
else
    echo "⚠️ Nginx backup not found"
fi

# Restart services
echo "Starting services..."
sudo systemctl start redis-server
pm2 resurrect
pm2 restart all

echo "✅ Restore completed!"
EOF

chmod +x /home/$USER/restore.sh
echo "✅ Restore script created at: /home/$USER/restore.sh"

# Run initial backup
echo "🔄 Running initial backup..."
/home/$USER/backup.sh

# Add to crontab
echo "⏰ Setting up automatic daily backup at 3 AM..."
(crontab -l 2>/dev/null | grep -v "/home/$USER/backup.sh"; echo "0 3 * * * /home/$USER/backup.sh >> /home/$USER/backups/cron.log 2>&1") | crontab -

# Verify crontab
echo "📋 Current crontab:"
crontab -l | grep backup

echo ""
echo "✅ Backup system configured!"
echo "• Automatic backups run daily at 3 AM"
echo "• Backups are stored in: $BACKUP_DIR"
echo "• Old backups are automatically deleted after 7 days"
echo "• Run manually: /home/$USER/backup.sh"
echo "• Restore from backup: /home/$USER/restore.sh"
echo ""
echo "Next step: Run 05-setup-pm2-monitoring.sh to configure PM2 monitoring"