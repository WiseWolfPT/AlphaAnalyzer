# 🚀 Alfalyzer Production Deployment Checklist

## Pre-Deployment Checks

### 1. Code Quality
- [ ] All critical features working locally
- [ ] Tests passing (minimum 46% for MVP)
- [ ] No console errors in browser
- [ ] TypeScript compilation successful
- [ ] ESLint warnings under threshold (50 max)

### 2. Security Verification
- [ ] No exposed API keys in code
- [ ] Environment variables properly configured
- [ ] CORS settings restrictive
- [ ] Rate limiting enabled
- [ ] SQL injection protection active

### 3. Configuration
- [ ] `.env.production` file ready
- [ ] Supabase keys configured
- [ ] FMP API key valid
- [ ] Redis password set
- [ ] PM2 ecosystem file configured

### 4. GitHub Setup
- [ ] SSH key added to GitHub secrets
- [ ] Known hosts configured
- [ ] Environment variables added as secrets:
  - [ ] `SSH_PRIVATE_KEY`
  - [ ] `SSH_KNOWN_HOSTS`
  - [ ] `VITE_SUPABASE_URL`
  - [ ] `VITE_SUPABASE_ANON_KEY`

## Deployment Steps

### 1. Manual Deployment
```bash
# Option A: Use the deployment script
./scripts/deploy-production.sh

# Option B: Deploy manually via SSH
ssh root@128.140.45.28
cd "/home/teste 1"
git pull origin main
npm ci --production
npm run build
pm2 restart alfalyzer
```

### 2. Automated Deployment (GitHub Actions)
```bash
# Push to main branch
git push origin main

# Or trigger manually from GitHub UI
# Actions → Build, Test & Deploy → Run workflow
```

## Post-Deployment Verification

### 1. Health Checks
- [ ] Frontend loads: https://128.140.45.28.sslip.io
- [ ] Health endpoint responds: `/health`
- [ ] API endpoints working: `/api/stocks/AAPL/quote`
- [ ] Real-time prices updating
- [ ] Charts displaying data

### 2. Performance Metrics
- [ ] Response time < 100ms
- [ ] Page load time < 3s
- [ ] No memory leaks detected
- [ ] CPU usage stable < 70%
- [ ] Redis cache hit rate > 80%

### 3. Monitoring
- [ ] PM2 processes running
- [ ] No critical errors in logs
- [ ] Redis connected
- [ ] Supabase connected
- [ ] FMP API calls successful

### 4. User Experience
- [ ] Login/Register working
- [ ] Stock search functional
- [ ] Watchlist operations work
- [ ] Portfolio calculations correct
- [ ] Mobile responsive design works

## Rollback Procedure

### If deployment fails:
```bash
# SSH to server
ssh root@128.140.45.28
cd "/home/teste 1"

# Rollback to previous commit
git reset --hard HEAD~1

# Rebuild
npm ci --production
npm run build

# Restart services
pm2 restart alfalyzer

# Verify rollback
pm2 status
```

## Server Access

### SSH Connection
```bash
ssh root@128.140.45.28
```

### Common Commands
```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs alfalyzer --lines 100

# Restart services
pm2 restart alfalyzer
pm2 restart price-worker

# Check Redis
redis-cli -a alfalyzer2025redis ping

# Check disk space
df -h

# Check memory
free -m

# Check nginx
nginx -t
nginx -s reload
```

## Troubleshooting

### Issue: Frontend not loading
```bash
# Check nginx
systemctl status nginx
nginx -t

# Check static files
ls -la /home/teste\ 1/dist/public/
```

### Issue: API not responding
```bash
# Check PM2
pm2 status
pm2 logs alfalyzer --err

# Check port
lsof -i :3001
```

### Issue: Prices not updating
```bash
# Check worker
pm2 status price-worker
pm2 logs price-worker

# Check Redis
redis-cli -a alfalyzer2025redis
> KEYS quote:*
```

### Issue: High memory usage
```bash
# Restart PM2
pm2 restart all

# Clear Redis cache
redis-cli -a alfalyzer2025redis FLUSHDB
```

## Emergency Contacts

- **Server Provider**: Hetzner CX22
- **IP Address**: 128.140.45.28
- **Domain**: https://128.140.45.28.sslip.io
- **Redis Password**: alfalyzer2025redis
- **PM2 Process**: alfalyzer
- **Worker Process**: price-worker

## Success Criteria

✅ **Deployment is successful when:**
1. Site loads without errors
2. Real-time prices display
3. User can login/register
4. API endpoints respond
5. No critical errors in logs
6. Performance metrics met
7. Health check passes

---

## Quick Deploy Commands

### Full deployment in one line:
```bash
ssh root@128.140.45.28 "cd '/home/teste 1' && git pull && npm ci --production && npm run build && pm2 restart all"
```

### Check status in one line:
```bash
curl -s https://128.140.45.28.sslip.io/health | jq .
```

---

**Last Updated**: 2025-08-24
**Phase**: 15 - CI/CD & Deployment
**Status**: Ready for Production 🚀