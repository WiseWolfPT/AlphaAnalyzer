# Disaster Recovery Plan - Alfalyzer

## Overview
Recovery procedures for critical system failures. Target RTO: 15 minutes.

## Redis Backup & Restore

### Automatic Backups
- Every 60s if 10,000+ changes
- Every 5min if 10+ changes  
- Every hour if 1+ change

### Manual Backup
```bash
redis-cli BGSAVE
# Backup location: /usr/local/var/db/redis/dump.rdb (Mac)
# Or: /var/lib/redis/dump.rdb (Linux)
```

### Restore Process
```bash
# 1. Stop Redis
brew services stop redis  # Mac
sudo systemctl stop redis  # Linux

# 2. Replace dump file
cp /path/to/backup/dump.rdb /usr/local/var/db/redis/dump.rdb

# 3. Start Redis
brew services start redis  # Mac
sudo systemctl start redis  # Linux

# 4. Verify
redis-cli ping
redis-cli DBSIZE
```

## Supabase Backup & Restore

### Automatic Backups
- Daily backups retained for 7 days (Free tier)
- Point-in-time recovery available (Pro tier)

### Restore Process
1. Access Supabase Dashboard → Settings → Backups
2. Select backup to restore
3. Click "Restore" → Confirm
4. Wait 5-10 minutes
5. Update connection strings if needed

## Application Rollback

### Quick Rollback (< 2 min)
```bash
# Tag current version before changes
git tag -a v1.0.0-pre-change -m "Before changes"

# If issues occur:
git reset --hard v1.0.0-pre-change
npm run build:full
pm2 restart alfalyzer
```

### Full Rollback with Data
```bash
# 1. Stop application
pm2 stop alfalyzer

# 2. Restore code
git reset --hard [LAST_KNOWN_GOOD_COMMIT]

# 3. Restore Redis
redis-cli FLUSHALL
redis-cli --rdb /path/to/backup/dump.rdb

# 4. Rebuild and restart
npm install
npm run build:full
pm2 restart alfalyzer

# 5. Verify
curl http://localhost:3001/api/health
```

## Recovery Time Objectives (RTO)

| Component | Target RTO | Actual RTO |
|-----------|------------|------------|
| Redis Cache | 2 min | 1-2 min |
| Supabase DB | 10 min | 5-10 min |
| Application | 5 min | 2-3 min |
| **Total System** | **15 min** | **8-15 min** |

## Recovery Point Objectives (RPO)

| Component | Max Data Loss |
|-----------|---------------|
| Redis Cache | 5 minutes |
| Supabase DB | 24 hours (free tier) |
| Application | 0 (git versioned) |

## Emergency Contacts

- Supabase Support: support@supabase.com
- Hetzner Support: https://console.hetzner.cloud/support
- Coolify Discord: https://discord.gg/coolify

## Testing Schedule

- Weekly: Application rollback test
- Monthly: Redis restore test
- Quarterly: Full disaster recovery drill

## Verification Checklist

After any recovery:
- [ ] Health endpoint responding
- [ ] Redis connected
- [ ] Supabase connected
- [ ] API endpoints working
- [ ] Frontend loading
- [ ] Authentication working
- [ ] Rate limiting active
- [ ] Monitoring active

Last tested: 2025-08-17
Next test due: 2025-08-24