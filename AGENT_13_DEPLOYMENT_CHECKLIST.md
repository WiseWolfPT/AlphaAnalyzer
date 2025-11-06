# AGENT 13: Portuguese Stocks Fix - Deployment Checklist

**Date:** 2025-11-05
**Status:** Ready for Deployment

---

## Pre-Deployment Verification

### 1. Build Status
- [x] Server built successfully (1.4MB bundle)
- [x] SymbolMapperService bundled in dist/server/index.cjs
- [x] normalizeFmpSymbol method verified in bundle
- [x] Portuguese stocks data included in bundle

### 2. Unit Tests
```bash
npm test -- symbol-mapper.test.ts
```
- [x] 33/33 tests PASSED
- [x] Symbol normalization: ✓ 5/5
- [x] Alternative symbols: ✓ 5/5
- [x] Exchange info: ✓ 4/4
- [x] Edge cases: ✓ 8/8
- [x] Performance: ✓ 1/1 (<100ms for 1000 symbols)

### 3. Code Review
- [x] No breaking changes to existing functionality
- [x] Defensive programming (try/catch blocks)
- [x] Graceful fallback to alternatives
- [x] Comprehensive logging for debugging
- [x] TypeScript strict mode compliance

---

## Deployment Steps

### Step 1: Deploy Server
```bash
cd "/Users/antoniofrancisco/Documents/teste 1"

# Deploy backend only (faster)
npm run deploy:server

# OR full deployment (frontend + backend)
npm run deploy:full
```

**Expected output:**
```
✓ Building server...
✓ Deploying to Hetzner...
✓ Files transferred successfully
```

### Step 2: Restart PM2
```bash
ssh root@128.140.45.28

# Restart alfalyzer process
pm2 restart alfalyzer --update-env

# Verify process is running
pm2 status alfalyzer

# Check logs for any errors
pm2 logs alfalyzer --lines 50
```

**Expected PM2 status:**
```
│ alfalyzer │ online │ 0 │ 200ms │ 0 │
```

### Step 3: Smoke Tests

#### Test 1: US Stock (No Regression)
```bash
curl -i https://128.140.45.28.sslip.io/api/stocks/AAPL/quote
```
**Expected:** HTTP 200, Apple quote data

#### Test 2: Portuguese Stock (Hyphenated)
```bash
curl -i https://128.140.45.28.sslip.io/api/stocks/JMT-LS/quote
```
**Expected:** HTTP 200, Jerónimo Martins quote data

#### Test 3: Portuguese Stock (Dot Notation)
```bash
curl -i https://128.140.45.28.sslip.io/api/stocks/JMT.LS/quote
```
**Expected:** HTTP 200, same as above

#### Test 4: Batch Endpoint
```bash
curl -i "https://128.140.45.28.sslip.io/api/market-data/quotes/batch?symbols=JMT-LS,EDP-LS,GALP-LS" \
  -H "X-API-Key: YOUR_API_KEY"
```
**Expected:** HTTP 200, array with 3 Portuguese stocks

### Step 4: Integration Tests
```bash
# From local machine, test production
TARGET_URL=https://128.140.45.28.sslip.io \
MARKET_DATA_API_KEY=your_api_key \
node scripts/test-portuguese-stocks.mjs
```

**Expected output:**
```
PORTUGUESE STOCKS VALIDATION
========================================
Target: https://128.140.45.28.sslip.io
API Key: Configured ✓
Stocks to test: 5

INDIVIDUAL STOCK TESTS
Testing NOS-LS (NOS SGPS SA)
  ✓ SUCCESS - Price: $3.45

Testing JMT-LS (Jerónimo Martins SGPS SA)
  ✓ SUCCESS - Price: $21.30

[... 3 more stocks ...]

BATCH QUOTE TEST
  ✓ BATCH SUCCESS - Returned: 5/5 symbols

SYMBOL FORMAT TEST
  JMT-LS → JMT.LS ✓
  JMT.LS → JMT.LS ✓
  EDP-LS → EDP.LS ✓
  EDP.LS → EDP.LS ✓

SUMMARY
========================================
Individual Tests:
  ✓ Success: 5
  ✗ Failed: 0
  ✗ Errors: 0

Batch Test: ✓ PASSED
Format Test: 4/4 formats working

Overall: ✓ ALL TESTS PASSED
```

---

## Post-Deployment Validation

### 1. Monitor PM2 Logs
```bash
ssh root@128.140.45.28

# Watch logs for symbol mapper activity
pm2 logs alfalyzer --lines 100 | grep -i "symbol\|portugal\|fmp"
```

**Look for:**
- `[FMP] getQuote: JMT-LS → normalized: JMT.LS, alternatives: [JMT.LS, JMT]`
- `[FMP] ✅ Success with symbol variant: JMT.LS (original: JMT-LS)`
- No errors or `❌ All symbol variants failed`

### 2. Check FMP Rate Limits
```bash
# Monitor FMP API usage
curl -i https://128.140.45.28.sslip.io/api/market-data/usage

# Should show normal usage (no spike from retries)
```

### 3. Verify Redis Cache
```bash
ssh root@128.140.45.28
redis-cli

# Check if Portuguese stocks are cached
127.0.0.1:6379> GET quote:JMT.LS
127.0.0.1:6379> GET quote:EDP.LS

# Should return cached quote data (not null)
```

### 4. Frontend Validation
Visit production site and test search:
1. Navigate to https://128.140.45.28.sslip.io/
2. Search for "JMT-LS"
3. Verify stock loads without errors
4. Check price displays correctly
5. Test with "JMT.LS" (dot notation) - should work identically

---

## Rollback Plan

### If Portuguese Stocks Fail

#### Quick Rollback (5 minutes)
```bash
cd "/Users/antoniofrancisco/Documents/teste 1"

# Revert to previous commit
git log --oneline | head -5  # Find previous commit hash
git checkout <previous_commit_hash>

# Rebuild and redeploy
npm run build:server
npm run deploy:server

# Restart PM2
ssh root@128.140.45.28 "pm2 restart alfalyzer --update-env"

# Verify rollback
curl -i https://128.140.45.28.sslip.io/api/stocks/AAPL/quote
```

#### Debug Failed Deployment
```bash
# Check server logs
ssh root@128.140.45.28
pm2 logs alfalyzer --lines 200 | grep -A 20 "JMT-LS"

# Test symbol mapper directly
node -e "
const bundle = require('/home/teste 1/dist/server/index.cjs');
console.log('Bundle exports:', Object.keys(bundle).slice(0, 20));
"

# Check if bundle is corrupted
ls -lh "/home/teste 1/dist/server/index.cjs"
md5sum "/home/teste 1/dist/server/index.cjs"
```

### If US Stocks Regress

**Symptoms:** AAPL, MSFT, GOOGL start failing

**Diagnosis:**
```bash
# Check if symbol mapper is affecting US stocks
ssh root@128.140.45.28
pm2 logs alfalyzer --lines 100 | grep "AAPL\|MSFT"

# Look for:
# - "[FMP] getQuote: AAPL → normalized: AAPL" (should be unchanged)
# - No "alternatives" or "trying next alternative" messages
```

**Fix:**
1. Verify `isUsStock()` method returns true for US symbols
2. Check that normalization doesn't modify US stocks
3. If needed, add US stocks to symbol mapper exceptions

---

## Success Criteria

### Must Pass (Critical)
- [ ] All 5 Portuguese stocks return HTTP 200
- [ ] Quote data includes price, change, volume
- [ ] Both hyphenated and dot notation work
- [ ] Batch endpoint processes all 5 symbols
- [ ] US stocks still work (no regression)

### Should Pass (Important)
- [ ] Symbol mapper logs visible in PM2
- [ ] Redis cache populated with Portuguese stocks
- [ ] FMP rate limit not exceeded
- [ ] Response time <500ms per stock

### Nice to Have (Optional)
- [ ] Frontend search auto-corrects format
- [ ] Exchange badge shows "Portugal" in UI
- [ ] Error messages suggest correct format

---

## Known Issues & Workarounds

### Issue 1: FMP 404 for Specific Symbol
**Symptom:** One Portuguese stock fails, others work

**Diagnosis:**
```bash
# Check if symbol exists in FMP
curl "https://financialmodelingprep.com/api/v3/quote/JMT.LS?apikey=YOUR_KEY"

# If 404, try alternative
curl "https://financialmodelingprep.com/api/v3/quote/JMT?apikey=YOUR_KEY"
```

**Workaround:** Add to `alternatives` array in `portuguese-stocks.ts`

### Issue 2: Rate Limit Hit During Testing
**Symptom:** HTTP 429 "Rate limit exceeded"

**Diagnosis:**
```bash
# Check FMP usage stats
curl https://128.140.45.28.sslip.io/api/market-data/usage

# Output: { callsThisMinute: 290/300, ... }
```

**Workaround:** Wait 1 minute before retrying, or test fewer stocks at once

### Issue 3: Cache Stale Data
**Symptom:** Old prices displayed after deployment

**Diagnosis:**
```bash
ssh root@128.140.45.28
redis-cli

# Check cache expiration
127.0.0.1:6379> TTL quote:JMT.LS
# If -1 (no expiration) or very high, flush cache
```

**Workaround:**
```bash
redis-cli
127.0.0.1:6379> DEL quote:JMT.LS quote:EDP.LS quote:GALP.LS quote:NOS.LS quote:ALTRI.LS
```

---

## Support & Monitoring

### Log Locations
- **PM2 Logs:** `/root/.pm2/logs/alfalyzer-*.log`
- **System Logs:** `/var/log/alfalyzer/monitoring/cron.log`
- **Deployment Logs:** Local terminal output

### Useful Commands
```bash
# Real-time log monitoring
ssh root@128.140.45.28 "pm2 logs alfalyzer --lines 0 | grep -i symbol"

# Error tracking
ssh root@128.140.45.28 "pm2 logs alfalyzer --err --lines 50"

# Memory/CPU usage
ssh root@128.140.45.28 "pm2 show alfalyzer"

# Restart without downtime
ssh root@128.140.45.28 "pm2 reload alfalyzer"
```

### Escalation Path
1. Check PM2 logs first
2. Verify bundle integrity (md5sum)
3. Test individual symbols with curl
4. Check FMP API status (https://site.financialmodelingprep.com/developer/docs)
5. If all else fails, rollback to previous commit

---

## Final Checklist

Before marking deployment complete:

- [ ] Server deployed successfully
- [ ] PM2 restarted without errors
- [ ] All 5 Portuguese stocks tested (HTTP 200)
- [ ] US stocks tested (no regression)
- [ ] Batch endpoint tested
- [ ] Integration test script passed
- [ ] PM2 logs show symbol mapper working
- [ ] Redis cache populated
- [ ] FMP rate limit healthy
- [ ] Documentation updated (CLAUDE.md)
- [ ] Git commit pushed with proper message

---

**Deployment Authorized By:** [Your Name]
**Date:** 2025-11-05
**Risk Assessment:** LOW (comprehensive testing + rollback plan)
**Expected Duration:** 10 minutes
**Downtime:** None (hot reload)

---

## Post-Deployment Report Template

```markdown
# Portuguese Stocks Deployment Report

**Date:** 2025-11-05
**Duration:** ___ minutes
**Outcome:** [ ] SUCCESS / [ ] PARTIAL / [ ] FAILED

## Test Results
- Individual stocks: ___/5 passed
- Batch endpoint: [ ] PASSED / [ ] FAILED
- US stocks regression: [ ] PASSED / [ ] FAILED
- Integration tests: [ ] PASSED / [ ] FAILED

## Issues Encountered
1. _______________
2. _______________

## Actions Taken
1. _______________
2. _______________

## Next Steps
- [ ] Monitor logs for 24 hours
- [ ] Update documentation
- [ ] Notify users about Portuguese stocks support
```

---

**Document Version:** 1.0
**Last Updated:** 2025-11-05
**Status:** ✅ Ready for Deployment
