# Comprehensive Validation - Execution Checklist

**Use this checklist when running the validation suite after burst warming**

---

## Pre-Execution Checklist

### ✅ Prerequisites

- [ ] **Burst warming is COMPLETE**
  ```bash
  tail -20 BURST_WARMING_*.log | grep "BURST COMPLETE"
  ```
  Expected: See "BURST COMPLETE" message

- [ ] **At least 6 hours have elapsed** since burst start
  ```bash
  ls -lh BURST_WARMING_*.log  # Check creation time
  ```

- [ ] **Production is accessible**
  ```bash
  curl -I https://128.140.45.28.sslip.io
  ```
  Expected: HTTP 200 or 301/302

- [ ] **Worker is running** (optional, for Test 15)
  ```bash
  curl http://128.140.45.28:3005/health
  ```
  Expected: {"status":"ok"}

- [ ] **Node.js is available**
  ```bash
  node --version
  ```
  Expected: v20+ or v18+

- [ ] **SSH access works**
  ```bash
  ssh root@128.140.45.28 "echo OK"
  ```
  Expected: OK

---

## Step 1: Run Orchestrator Script

### Execute Main Script

```bash
cd /Users/antoniofrancisco/Documents/teste\ 1
bash scripts/validation/run-comprehensive-validation.sh
```

### Expected Output

```
╔════════════════════════════════════════════════════════════════╗
║     COMPREHENSIVE VALIDATION SUITE - 20 TESTS                  ║
╚════════════════════════════════════════════════════════════════╝

[INFO] Running pre-flight checks...
[SUCCESS] Production URL accessible
[SUCCESS] Worker health endpoint accessible
[SUCCESS] Node.js found: v20.x.x
[SUCCESS] Test script found

[INFO] Verifying burst warming completion...
[SUCCESS] Burst warming completed successfully

[INFO] Running API tests (Tests 11-15)...
```

### Checklist

- [ ] Pre-flight checks pass (all green)
- [ ] Burst verification succeeds
- [ ] API tests start running
- [ ] No critical errors shown

---

## Step 2: API Tests (Automated)

### Tests 11-15 Execute Automatically

Watch for output:

```
🧪 Test 11: Bandwidth stats API works...
✅ PASSED (75.5% used)

🧪 Test 12: Bandwidth history API works...
✅ PASSED (7 days)

🧪 Test 13: Circuit breaker headers present...
✅ PASSED (No warning - usage < 85%)

🧪 Test 14: Manual bandwidth update endpoint...
⚠️ PASSED or ❌ FAILED (403 expected)

🧪 Test 15: Worker health endpoint...
✅ PASSED (Uptime: 25430s) or ❌ FAILED
```

### Checklist

- [ ] Test 11: Bandwidth stats API ✅
- [ ] Test 12: Bandwidth history API ✅
- [ ] Test 13: Circuit breaker headers ✅
- [ ] Test 14: Manual update (⚠️ 403 OK)
- [ ] Test 15: Worker health (✅ or ⚠️)

**Passing:** 3-5 out of 5 tests (60%+)

---

## Step 3: Browser Tests (Manual)

### Prompt Appears

```
════════════════════════════════════════════════════════════════
  BROWSER TESTS (Tests 1-10, 18-20) - MANUAL EXECUTION REQUIRED
════════════════════════════════════════════════════════════════

Follow the instructions in:
  scripts/validation/chrome-devtools-browser-tests.md

Have you completed the browser tests? (y/n):
```

### Execute Browser Tests

**Option A: Chrome DevTools MCP** (recommended)

Follow `scripts/validation/chrome-devtools-browser-tests.md` for exact commands.

**Option B: Manual Browser Testing** (quick validation)

Open production and test:

#### Group 1: Cache Hit Rate (5 tests)

- [ ] **Test 1: AAPL loads fast**
  ```
  Open: https://128.140.45.28.sslip.io/intrinsic-value?symbol=AAPL
  Check: DevTools Network tab → Load time <500ms
  Verify: Growth rates visible, NOT 0%
  ```

- [ ] **Test 2: AMD loads fast**
  ```
  Open: https://128.140.45.28.sslip.io/intrinsic-value?symbol=AMD
  Check: Load time <500ms
  Verify: Data displays correctly
  ```

- [ ] **Test 3: SHOP loads fast**
  ```
  Open: https://128.140.45.28.sslip.io/intrinsic-value?symbol=SHOP
  Check: Load time <500ms
  Verify: IV chart visible
  ```

- [ ] **Test 4: BCP.LS loads (Portuguese)**
  ```
  Open: https://128.140.45.28.sslip.io/intrinsic-value?symbol=BCP.LS
  Check: No errors
  Verify: Data loads
  ```

- [ ] **Test 5: CLSK loads (small-cap)**
  ```
  Open: https://128.140.45.28.sslip.io/intrinsic-value?symbol=CLSK
  Check: Page works
  Verify: Fallback if needed
  ```

#### Group 2: Growth Rates (5 tests)

- [ ] **Test 6: Growth rates NOT 0%**
  ```
  On AAPL page, find growth rates
  Verify: Y1-5 ≠ 0%, Y6-10 ≠ 0%
  Screenshot if needed
  ```

- [ ] **Test 7: Growth rates dynamic**
  ```
  Compare: AAPL vs NVDA growth rates
  Verify: Different values (not identical)
  Expected: AAPL ~10%, NVDA ~15-25%
  ```

- [ ] **Test 8: Data source shown**
  ```
  Look for: "Based on analyst estimates" or similar
  Verify: Source indicator visible
  ```

- [ ] **Test 9: Confidence level shown**
  ```
  Look for: "High/Medium/Low confidence"
  Verify: Confidence displayed
  ```

- [ ] **Test 10: Analyst count shown**
  ```
  Look for: "X analysts" text
  Verify: Count visible for AAPL (should be >10)
  ```

#### Group 5: UI/UX (3 tests)

- [ ] **Test 18: No median methods**
  ```
  Find dropdown: Valuation method selector
  Open dropdown: Check all options
  Verify: NO options containing "median"
  Expected: Only named methods (Alfavalue, Custom, etc.)
  ```

- [ ] **Test 19: Custom dropdown works**
  ```
  Select: "Custom DCF-20" from dropdown
  Verify: Shows "Based on:" selector
  Verify: Can select base method
  ```

- [ ] **Test 20: ETF detection**
  ```
  Open: https://128.140.45.28.sslip.io/intrinsic-value?symbol=SPY
  Verify: Error message shown
  Expected: Mentions "ETF" or "No cash flow"
  ```

### After Completing Browser Tests

```bash
# Return to terminal
# Press: y (to confirm completion)
```

### Checklist Summary

- [ ] Cache tests: 5/5 passing
- [ ] Growth tests: 5/5 passing
- [ ] UI tests: 3/3 passing

**Passing:** 13/13 browser tests (100%)

---

## Step 4: SSH Tests (Manual)

### Prompt Appears

```
════════════════════════════════════════════════════════════════
  SSH TESTS (Tests 16-17) - MANUAL VERIFICATION REQUIRED
════════════════════════════════════════════════════════════════

Test 16: Cache Invalidation
  ssh root@128.140.45.28 "redis-cli -a alfalyzer2025redis KEYS 'iv:*' | wc -l"
  Expected: Should show many IV cache keys (>100)

Test 17: Earnings Detection
  ssh root@128.140.45.28 "pm2 logs iv-worker --lines 50 | grep 'Found.*earnings events'"
  Expected: Should show earnings events being detected

Have you verified SSH tests? (y/n):
```

### Execute SSH Tests

#### Test 16: Cache Invalidation

```bash
ssh root@128.140.45.28 "redis-cli -a alfalyzer2025redis KEYS 'iv:*' | wc -l"
```

**Expected output:**
```
(integer) 1493  # or similar large number
```

**Checklist:**
- [ ] Command succeeds (no auth errors)
- [ ] Count >100 IV keys
- [ ] If count low, check burst completion

#### Test 17: Earnings Detection

```bash
ssh root@128.140.45.28 "pm2 logs iv-worker --lines 50 | grep 'Found.*earnings events'"
```

**Expected output:**
```
Found 15 earnings events in window (2025-10-17 to 2025-10-26)
Processing earnings event: AAPL (2025-10-24)
...
```

**Checklist:**
- [ ] Command succeeds
- [ ] Shows earnings events
- [ ] Recent timestamps (within last 24h)

### After SSH Tests

```bash
# Return to terminal
# Press: y (to confirm completion)
```

### Checklist Summary

- [ ] Test 16: Cache invalidation ✅
- [ ] Test 17: Earnings detection ✅

**Passing:** 2/2 SSH tests (100%)

---

## Step 5: Review Reports

### Reports Generated

```
════════════════════════════════════════════════════════════════
  VALIDATION SUMMARY
════════════════════════════════════════════════════════════════

[SUCCESS] API Tests: PASSED
[SUCCESS] Browser Tests: COMPLETED
[SUCCESS] SSH Tests: VERIFIED

✅ Report generated: VALIDATION_REPORT_2025-10-24_19-32-45.md
```

### Read Reports

#### API Test Report

```bash
cat CHROME_DEVTOOLS_VALIDATION_2025-10-24.md
```

**Look for:**
- Total tests: 20
- Passed: X/20
- Success rate: Y%
- Performance metrics

**Checklist:**
- [ ] Report file exists
- [ ] Success rate calculated
- [ ] Performance metrics shown
- [ ] Recommendations provided

#### Overall Summary Report

```bash
cat VALIDATION_REPORT_*.md
```

**Look for:**
- Test completion status
- Next steps
- Overall assessment

**Checklist:**
- [ ] Summary file exists
- [ ] All groups reported
- [ ] Clear next steps

---

## Step 6: Final Assessment

### Calculate Overall Success Rate

```
Total tests: 20
├─ API tests (11-15): X/5
├─ Browser tests (1-10, 18-20): Y/13
└─ SSH tests (16-17): Z/2

Overall: (X + Y + Z)/20 = W%
```

### Decision Matrix

#### ✅ Success (≥95% pass rate, 19-20/20 tests)

**Status:** PRODUCTION READY

**Actions:**
- [ ] Document any minor issues
- [ ] Update CLAUDE.md if needed
- [ ] Notify team of success
- [ ] Continue with normal monitoring
- [ ] Archive validation reports

**Next steps:**
```bash
# Continue using existing monitoring
crontab -l  # Verify cron jobs active
scripts/monitoring/monitor-all.sh  # Run manual check
```

#### ⚠️ Partial Success (80-94% pass rate, 16-18/20 tests)

**Status:** REVIEW NEEDED

**Actions:**
- [ ] Review all failed tests in detail
- [ ] Check browser console for errors
- [ ] Verify API responses manually
- [ ] Check PM2 logs for issues
- [ ] Fix identified issues
- [ ] Re-run failed tests
- [ ] Generate new report
- [ ] Decide if acceptable for production

**Troubleshooting commands:**
```bash
# Check backend logs
ssh root@128.140.45.28 "pm2 logs alfalyzer --lines 100"

# Test API manually
curl "https://128.140.45.28.sslip.io/api/iv/AAPL/chart" | jq

# Check Redis
ssh root@128.140.45.28 "redis-cli -a alfalyzer2025redis INFO stats"

# Check worker
ssh root@128.140.45.28 "pm2 status iv-worker"
```

#### ❌ Failure (<80% pass rate, <16/20 tests)

**Status:** CRITICAL ISSUES

**Actions:**
- [ ] DO NOT proceed to production
- [ ] Immediate investigation required
- [ ] Review all logs (PM2, Nginx, browser console)
- [ ] Check if burst warming actually completed
- [ ] Verify all environment variables
- [ ] Check database connectivity
- [ ] Review recent code changes
- [ ] Consider re-running burst warming
- [ ] Fix critical issues before retry

**Investigation checklist:**
- [ ] Burst log shows completion?
- [ ] Redis has cached data?
- [ ] FMP API responding?
- [ ] Worker is healthy?
- [ ] Frontend building correctly?
- [ ] Environment variables set?

---

## Post-Validation Checklist

### If Validation Passed (≥95%)

- [ ] Archive validation reports
  ```bash
  mkdir -p validation-results/2025-10-24/
  mv CHROME_DEVTOOLS_VALIDATION_*.md validation-results/2025-10-24/
  mv VALIDATION_REPORT_*.md validation-results/2025-10-24/
  ```

- [ ] Update CLAUDE.md
  ```bash
  # Add validation success note
  echo "✅ Validation passed: 2025-10-24 (19/20 tests)" >> CLAUDE.md
  ```

- [ ] Document lessons learned
  ```bash
  # Create notes file
  nano validation-results/2025-10-24/NOTES.md
  ```

- [ ] Notify team
  ```bash
  # Prepare success message
  echo "Validation complete: 19/20 tests passed (95% success rate)"
  echo "System ready for production use"
  echo "Reports available in validation-results/2025-10-24/"
  ```

### If Validation Failed (<95%)

- [ ] Create investigation ticket
- [ ] Save all logs
  ```bash
  mkdir -p validation-failures/2025-10-24/
  mv CHROME_DEVTOOLS_VALIDATION_*.md validation-failures/2025-10-24/
  ssh root@128.140.45.28 "pm2 logs --lines 1000" > validation-failures/2025-10-24/pm2.log
  ```

- [ ] Document failure modes
  ```bash
  nano validation-failures/2025-10-24/INVESTIGATION.md
  ```

- [ ] Plan remediation
- [ ] Schedule re-validation

---

## Quick Reference Commands

### Start Validation
```bash
cd /Users/antoniofrancisco/Documents/teste\ 1
bash scripts/validation/run-comprehensive-validation.sh
```

### Check Burst Status
```bash
tail -20 BURST_WARMING_*.log | grep "BURST COMPLETE"
```

### Test Production Manually
```bash
curl "https://128.140.45.28.sslip.io/api/health"
curl "https://128.140.45.28.sslip.io/api/bandwidth/stats" | jq
curl "https://128.140.45.28.sslip.io/api/iv/AAPL/chart" | jq '.growthRates'
```

### Check Redis Cache
```bash
ssh root@128.140.45.28 "redis-cli -a alfalyzer2025redis KEYS 'iv:*' | wc -l"
```

### Check Worker
```bash
ssh root@128.140.45.28 "pm2 status iv-worker"
ssh root@128.140.45.28 "pm2 logs iv-worker --lines 50"
```

### View Reports
```bash
cat CHROME_DEVTOOLS_VALIDATION_2025-10-24.md
cat VALIDATION_REPORT_*.md
```

---

## Final Checklist

Before marking validation complete:

- [ ] All API tests executed (5 tests)
- [ ] All browser tests executed (13 tests)
- [ ] All SSH tests executed (2 tests)
- [ ] Reports generated and reviewed
- [ ] Success rate calculated
- [ ] Decision made (proceed/review/investigate)
- [ ] Next steps documented
- [ ] Team notified
- [ ] Files archived appropriately

---

**Validation Complete! 🎉**

Success rate: ___% (___/20 tests)

Decision: ✅ Production Ready / ⚠️ Review Needed / ❌ Investigate

Next steps:
1. _______________________
2. _______________________
3. _______________________

**Date:** 2025-10-24
**Executor:** _______________________
**Notes:** _______________________

---

**Last Updated:** 2025-10-24 19:32 UTC
