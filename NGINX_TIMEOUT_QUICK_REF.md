# Nginx Timeout Configuration - Quick Reference

## Current Production Settings

**File:** `/etc/nginx/sites-available/alfalyzer`

**Timeout Values:**
```nginx
proxy_read_timeout 90s;      # Backend processing time limit
proxy_connect_timeout 90s;   # Connection establishment limit
proxy_send_timeout 90s;      # Client send timeout
```

**Applied to:**
- `/api` location block
- `/api/market-data/` location block

**Why 90s:**
- Utilities sector IV calculations take 60-90s
- Complex DCF models for dividend-heavy stocks
- Prevents legitimate requests from timing out
- 50% buffer over default 60s

## Affected Use Cases

**Long-Running Calculations:**
1. **Utilities Sector Stocks** (60-90s)
   - NEE, DUK, SO, D, AEP
   - Multiple valuation methods
   - Dense financial data

2. **Potential Future Cases:**
   - REITs with complex cash flow models
   - Financial sector DCF calculations
   - Bulk batch processing requests

## Quick Commands

**View current timeouts:**
```bash
ssh root@128.140.45.28 "grep -A 3 'proxy_read_timeout' /etc/nginx/sites-available/alfalyzer"
```

**Test configuration:**
```bash
ssh root@128.140.45.28 "nginx -t"
```

**Reload (zero downtime):**
```bash
ssh root@128.140.45.28 "systemctl reload nginx"
```

**Test Utilities stock:**
```bash
curl -f -m 120 https://128.140.45.28.sslip.io/api/iv/NEE | jq '{ticker, methods: (.methods | length)}'
```

## When to Adjust

**Increase to 120s if:**
- Consistent timeout errors at 85-90s
- New calculation methods added
- Batch endpoints timing out

**Decrease to 60s if:**
- All calculations complete under 45s
- Need tighter protection against hung connections
- Performance optimizations reduce calculation time

**How to change:**
1. Edit `/etc/nginx/sites-available/alfalyzer`
2. Update all three timeout values consistently
3. Run `nginx -t` to verify
4. Run `systemctl reload nginx` (NOT restart)
5. Test affected endpoints

## Monitoring

**Watch for timeouts:**
```bash
ssh root@128.140.45.28 "tail -f /var/log/nginx/alfalyzer.error.log | grep timeout"
```

**Check slow requests:**
```bash
ssh root@128.140.45.28 "tail -f /var/log/nginx/alfalyzer.access.log | awk '{if (\$NF > 60) print}'"
```

## Backup

**Latest backup:** `/etc/nginx/sites-available/alfalyzer.backup-20251026-015553`

**Create new backup before changes:**
```bash
ssh root@128.140.45.28 "cp /etc/nginx/sites-available/alfalyzer /etc/nginx/sites-available/alfalyzer.backup-\$(date +%Y%m%d-%H%M%S)"
```

---

**Last Updated:** 2025-10-26
**Validated:** All 5 Utilities stocks passing (NEE, DUK, SO, D, AEP)
**Status:** ✅ Production stable
