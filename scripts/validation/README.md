# Comprehensive Validation Suite - Quick Reference

**Purpose:** Validate ENTIRE system after burst warming completes (~6-7 hours).

## Files Created

1. **`run-comprehensive-validation.sh`** - Main orchestrator
2. **`chrome-devtools-comprehensive-test.mjs`** - Automated API tests
3. **`chrome-devtools-browser-tests.md`** - Manual browser test instructions
4. **This README** - Quick reference guide

## Test Coverage (20 Tests)

### Group 1: Cache Hit Rate (5 tests)
- Test 1: S&P 100 instant load (AAPL)
- Test 2: S&P 500 instant load (AMD)
- Test 3: Extended universe instant load (SHOP)
- Test 4: Portuguese stock cached (BCP.LS)
- Test 5: Small-cap stock works (CLSK)

### Group 2: Growth Rates Validation (5 tests)
- Test 6: Growth rates NOT 0%
- Test 7: Growth rates dynamic (AAPL ≠ NVDA)
- Test 8: Data source indicator shown
- Test 9: Confidence level displayed
- Test 10: Analyst count shown

### Group 3: Bandwidth Protection (4 tests)
- Test 11: Bandwidth stats API works
- Test 12: Bandwidth history API works
- Test 13: Circuit breaker headers present
- Test 14: Manual update endpoint works

### Group 4: Event-Driven Worker (3 tests)
- Test 15: Worker health endpoint
- Test 16: Cache invalidation working
- Test 17: Earnings detection working

### Group 5: UI/UX (3 tests)
- Test 18: Median methods removed
- Test 19: Custom method dropdown works
- Test 20: ETF detection works

## Quick Start

### Prerequisites

✅ **WAIT for burst warming to complete** (6-7 hours from burst start)

Check burst status:
```bash
# Local
tail -20 /Users/antoniofrancisco/Documents/teste\ 1/BURST_WARMING_2025-10-24.log

# Production
ssh root@128.140.45.28 "tail -50 /var/log/alfalyzer/iv-worker.log | grep 'BURST COMPLETE'"
```

### Step 1: Run Automated Tests

```bash
cd /Users/antoniofrancisco/Documents/teste\ 1
bash scripts/validation/run-comprehensive-validation.sh
```

This will:
- Run pre-flight checks
- Verify burst completion
- Execute API tests (11-15) automatically
- Prompt for manual browser tests (1-10, 18-20)
- Prompt for manual SSH tests (16-17)
- Generate validation report

### Step 2: Run Browser Tests (Manual)

Follow instructions in:
```
scripts/validation/chrome-devtools-browser-tests.md
```

Use Chrome DevTools MCP to execute browser-based validations.

### Step 3: Run SSH Tests (Manual)

```bash
# Test 16: Cache invalidation
ssh root@128.140.45.28 "redis-cli -a alfalyzer2025redis KEYS 'iv:*' | wc -l"
# Expected: >100 cached IV keys

# Test 17: Earnings detection
ssh root@128.140.45.28 "pm2 logs iv-worker --lines 50 | grep 'Found.*earnings events'"
# Expected: Should show earnings events
```

## Test Execution Flow

```
┌─────────────────────────────────────────┐
│  1. Pre-flight Checks                   │
│     - Production accessible?            │
│     - Worker running?                   │
│     - Node.js available?                │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  2. Verify Burst Complete               │
│     - Check burst log                   │
│     - Confirm 6-7 hours elapsed         │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  3. Run API Tests (Automated)           │
│     - Tests 11-15                       │
│     - Bandwidth protection              │
│     - Worker health                     │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  4. Run Browser Tests (Manual)          │
│     - Tests 1-10 (Cache & Growth)       │
│     - Tests 18-20 (UI/UX)               │
│     - Use Chrome DevTools MCP           │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  5. Run SSH Tests (Manual)              │
│     - Test 16 (Cache invalidation)      │
│     - Test 17 (Earnings detection)      │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  6. Generate Report                     │
│     - VALIDATION_REPORT_*.md            │
│     - CHROME_DEVTOOLS_VALIDATION_*.md   │
└─────────────────────────────────────────┘
```

## Expected Results

**Success Criteria:**
- ✅ Success rate: ≥95% (19/20 tests passing)
- ✅ Average load time: <500ms for cached stocks
- ✅ Growth rates: NOT 0%, dynamically changing
- ✅ Bandwidth protection: All APIs responding
- ✅ Worker: Health OK, cache working
- ✅ UI: No median methods, custom dropdown functional

**If Success Rate < 95%:**
1. Review failed tests in detail
2. Check browser console for errors
3. Verify API responses manually
4. Check PM2 logs for worker issues
5. Re-run failed tests individually
6. Consider re-running burst if cache issues detected

## Output Files

After running validation, you'll have:

1. **`CHROME_DEVTOOLS_VALIDATION_2025-10-24.md`**
   - Automated API test results
   - Bandwidth metrics
   - Worker health status

2. **`VALIDATION_REPORT_2025-10-24_HH-MM-SS.md`**
   - Overall summary
   - Test completion status
   - Next steps

## Troubleshooting

### "Production URL not accessible"
```bash
# Check if server is running
ssh root@128.140.45.28 "pm2 status"

# Check nginx
ssh root@128.140.45.28 "systemctl status nginx"

# Test locally
curl -I https://128.140.45.28.sslip.io
```

### "Worker health endpoint not accessible"
```bash
# Check worker status
ssh root@128.140.45.28 "pm2 status iv-worker"

# Check port 3005
ssh root@128.140.45.28 "netstat -tlnp | grep 3005"

# Restart if needed
ssh root@128.140.45.28 "pm2 restart iv-worker"
```

### "Burst warming log not found"
```bash
# Check for today's log
ls -lh BURST_WARMING_*.log

# Or check production logs
ssh root@128.140.45.28 "tail -100 /var/log/alfalyzer/iv-worker.log"
```

### Browser tests fail to find elements
- Update selectors in `chrome-devtools-browser-tests.md`
- Use verbose snapshot to find exact UIDs
- Check actual DOM structure in production

## Contact & Support

**Documentation:**
- Main guide: `scripts/validation/chrome-devtools-browser-tests.md`
- This README: Quick reference

**Logs:**
- API tests: `CHROME_DEVTOOLS_VALIDATION_*.md`
- Full report: `VALIDATION_REPORT_*.md`
- Burst warming: `BURST_WARMING_*.log`

**Production:**
- URL: https://128.140.45.28.sslip.io
- Worker: http://128.140.45.28:3005
- SSH: root@128.140.45.28

---

**Last Updated:** 2025-10-24
**Next Review:** After validation run completes
