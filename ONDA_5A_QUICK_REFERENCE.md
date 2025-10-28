# ONDA 5A: Quick Reference - Log Rotation & Disk Monitoring

**Last Updated:** 2025-10-27
**Environment:** Production (128.140.45.28)

---

## Quick Health Check (30 seconds)

```bash
# SSH to server
ssh root@128.140.45.28

# Check disk usage (should be <80%)
df -h / | grep sda1

# Check PM2 logrotate status
pm2 list | grep logrotate

# Check monitoring log (last 5 entries)
tail -5 /var/log/alfalyzer/monitoring/disk-space.log

# Check largest logs
du -sh /root/.pm2/logs/* | sort -hr | head -5
```

**Expected Output:**
- Disk usage: <80% (currently 52%)
- pm2-logrotate: online
- disk-space.log: [OK] messages
- Largest log: <100MB

---

## Critical Commands

### Emergency Disk Cleanup
```bash
# If disk >90%, run immediately:
pm2 flush  # Archive all current logs
find /root/.pm2/logs/ -name '*.log.gz' -mtime +7 -delete  # Remove old archives
df -h /  # Verify space recovered
```

### Check Log Rotation Status
```bash
# View PM2 logrotate configuration
pm2 conf pm2-logrotate

# Expected output:
# max_size: 100M
# retain: 7
# compress: true
```

### Manual Disk Check
```bash
# Run monitoring script manually
bash '/home/teste 1/scripts/monitoring/check-disk-space.sh'

# Check exit code (0=OK, 1=WARNING, 2=CRITICAL)
echo $?

# View detailed log
cat /var/log/alfalyzer/monitoring/disk-space.log
```

### Check Cron Jobs
```bash
# View all ONDA 5A cron jobs
crontab -l | grep 'ONDA 5A'

# View cron execution log
tail -20 /var/log/alfalyzer/monitoring/disk-cron.log
```

---

## File Locations

| File | Path | Purpose |
|------|------|---------|
| Ecosystem Config | `/home/teste 1/ecosystem.config.cjs` | PM2 worker configuration |
| Disk Monitor Script | `/home/teste 1/scripts/monitoring/check-disk-space.sh` | Disk space monitoring |
| Disk Space Log | `/var/log/alfalyzer/monitoring/disk-space.log` | Monitoring history |
| Disk Cron Log | `/var/log/alfalyzer/monitoring/disk-cron.log` | Cron execution log |
| PM2 Logs | `/root/.pm2/logs/` | All PM2 worker logs |

---

## Thresholds & Limits

| Metric | Value | Action |
|--------|-------|--------|
| Log rotation size | 100MB | Auto-rotate when file reaches size |
| Log retention | 7 days | Auto-delete rotated logs after 7 days |
| Disk WARNING | 80% | Alert logged, show top directories |
| Disk CRITICAL | 90% | Alert + auto-cleanup of old logs |
| Weekly cleanup | 30 days | Remove logs older than 30 days |
| Worker memory limit | 200-500MB | PM2 auto-restart if exceeded |

---

## Monitoring Schedule

- **Every 15 minutes:** Disk space check (`check-disk-space.sh`)
- **Every Sunday 2 AM:** Log cleanup (remove files >30 days)
- **Every 30 seconds:** PM2 logrotate checks log sizes
- **Continuous:** PM2 monitors worker memory usage

---

## Alert Response

### WARNING (80% disk usage)
1. Check monitoring log: `tail -20 /var/log/alfalyzer/monitoring/disk-space.log`
2. Review top directories shown in log
3. Monitor next check (15 minutes)
4. Schedule manual cleanup if trend increasing

### CRITICAL (90% disk usage)
1. Auto-cleanup triggers automatically
2. Verify cleanup ran: `ls -lh /root/.pm2/logs/*.log.gz`
3. If still >90%, run emergency cleanup (see above)
4. Investigate root cause:
   ```bash
   du -sh /root/.pm2/logs/* | sort -hr
   du -sh /var/log/* | sort -hr
   du -sh /tmp/* | sort -hr
   ```

---

## Verification Tests

### Test 1: PM2 Logrotate Active
```bash
pm2 list | grep logrotate
# Expected: online status, ~60MB memory
```

### Test 2: Disk Monitoring Working
```bash
bash '/home/teste 1/scripts/monitoring/check-disk-space.sh'
tail -2 /var/log/alfalyzer/monitoring/disk-space.log
# Expected: [OK] message with current percentage
```

### Test 3: Cron Installed
```bash
crontab -l | grep -c 'ONDA 5A'
# Expected: 3 (disk monitor + 2 cleanup jobs)
```

### Test 4: Log Rotation Configuration
```bash
pm2 conf pm2-logrotate | grep -E 'max_size|retain|compress'
# Expected: max_size=100M, retain=7, compress=true
```

---

## Troubleshooting

### PM2 Logrotate Not Running
```bash
pm2 restart pm2-logrotate
pm2 logs pm2-logrotate --lines 20
```

### Disk Monitor Not Running
```bash
# Check cron is running
systemctl status cron

# Check script is executable
ls -lh '/home/teste 1/scripts/monitoring/check-disk-space.sh'

# Run manually to test
bash '/home/teste 1/scripts/monitoring/check-disk-space.sh'
```

### Logs Not Rotating
```bash
# Force rotation
pm2 flush

# Check PM2 logrotate logs
pm2 logs pm2-logrotate --lines 50

# Verify configuration
pm2 conf pm2-logrotate
```

### Disk Full Despite Monitoring
```bash
# Emergency cleanup
pm2 flush
find /root/.pm2/logs/ -name '*.log.gz' -delete
find /root/.pm2/logs/ -name '*.log' -size +100M -delete

# Find largest files
du -ah / 2>/dev/null | sort -hr | head -20

# Check for core dumps
find / -name 'core.*' -size +100M 2>/dev/null
```

---

## Weekly Review Checklist

Run every Monday morning:

```bash
# 1. Check disk trend (should be stable or decreasing)
grep 'Disk usage' /var/log/alfalyzer/monitoring/disk-space.log | tail -50

# 2. Verify Sunday cleanup ran
grep 'deleted' /var/log/alfalyzer/monitoring/disk-cron.log | tail -10

# 3. Check log sizes (largest should be <100MB)
du -sh /root/.pm2/logs/* | sort -hr | head -10

# 4. Verify no CRITICAL alerts
grep CRITICAL /var/log/alfalyzer/monitoring/disk-space.log | tail -10

# 5. Check PM2 workers health
pm2 list
```

---

## Configuration Backup

Before making changes, always backup:

```bash
# Backup ecosystem config
cp '/home/teste 1/ecosystem.config.cjs' \
   '/home/teste 1/ecosystem.config.cjs.backup-'$(date +%Y%m%d-%H%M%S)

# Backup crontab
crontab -l > /tmp/crontab.backup-$(date +%Y%m%d-%H%M%S)

# Verify backups
ls -lh '/home/teste 1/ecosystem.config.cjs'*
ls -lh /tmp/crontab.backup-*
```

---

## Rollback Procedures

### Revert Ecosystem Config
```bash
# List backups
ls -lht '/home/teste 1/ecosystem.config.cjs'* | head -5

# Restore specific backup
cp '/home/teste 1/ecosystem.config.cjs.backup-YYYYMMDD-HHMMSS' \
   '/home/teste 1/ecosystem.config.cjs'

# Reload PM2
cd '/home/teste 1' && pm2 reload ecosystem.config.cjs --update-env
pm2 save
```

### Revert Crontab
```bash
# Restore from backup
crontab /tmp/crontab.backup-YYYYMMDD-HHMMSS

# Verify
crontab -l
```

### Disable Disk Monitoring Temporarily
```bash
# Remove ONDA 5A cron jobs
crontab -l | grep -v 'ONDA 5A' | crontab -

# Verify
crontab -l | grep 'ONDA 5A'
# Expected: no output
```

---

## Performance Impact

- **CPU:** Negligible (<1% during checks)
- **Memory:** pm2-logrotate uses ~60MB
- **Disk I/O:** Minimal (checks every 15 minutes)
- **Network:** None
- **Application latency:** No impact

---

## Support Contacts

| Issue | Action |
|-------|--------|
| Disk >90% | Run emergency cleanup, notify DevOps |
| PM2 logrotate crashed | Restart module: `pm2 restart pm2-logrotate` |
| Monitoring script failing | Check logs: `/var/log/alfalyzer/monitoring/disk-cron.log` |
| Critical production issue | Disable non-essential workers to free resources |

---

## Next Review Date

**Scheduled:** 2025-11-03 (7 days from implementation)

**Review Agenda:**
1. Analyze disk usage trend
2. Verify first log rotation triggered (when file hits 100MB)
3. Check compressed logs appearing (.log.gz files)
4. Assess if retention period needs adjustment
5. Document any anomalies or issues

---

**Generated:** 2025-10-27
**Status:** ACTIVE
**Classification:** OPERATIONS - CRITICAL INFRASTRUCTURE
