# How to Run Full Universe IV Tests

**Quick Reference Guide for Executing Comprehensive IV Validation**

## Prerequisites

```bash
cd /Users/antoniofrancisco/Documents/teste\ 1
npm install csv-parse  # Already installed
```

## Current Status

**Tier 1:** IN PROGRESS (50% complete, 68% pass rate)
- Running in background (shell ID: 38a4da)
- Expected completion: ~5 more minutes
- Command: Check with `ps aux | grep "test-full-universe"`

## Step-by-Step Execution

### Step 1: Monitor Tier 1 Completion

Check if Tier 1 is still running:
```bash
ps aux | grep "test-full-universe.ts"
```

View progress (if running):
```bash
tail -f validation-results/tier1-v2-execution.log
```

### Step 2: Analyze Tier 1 Results (After Completion)

```bash
# Wait for test to complete, then analyze
npx tsx scripts/validation/analyze-results.ts \
  validation-results/tier1-2025-10-26-results.json
```

This will:
- Print detailed analysis to console
- Save `tier1-2025-10-26-results-ANALYSIS.txt`
- Show priority fix list
- Give recommendations

View generated reports:
```bash
# Markdown report (human-readable)
cat validation-results/tier1-2025-10-26-REPORT.md

# CSV (Excel/Sheets compatible)
open validation-results/tier1-2025-10-26-results.csv

# JSON (machine-readable)
cat validation-results/tier1-2025-10-26-results.json | jq '.summary'
```

### Step 3: Decision Point

**If Tier 1 pass rate ≥ 80%:**
✅ Proceed to Tier 2

**If Tier 1 pass rate 70-80%:**
🟡 Review failed stocks, fix critical issues, consider proceeding

**If Tier 1 pass rate < 70%:**
❌ Debug systematically before continuing

### Step 4: Execute Tier 2 (Sector Coverage - 200 stocks)

**Duration:** ~5 minutes
**Purpose:** Validate sector-specific behavior

```bash
cd /Users/antoniofrancisco/Documents/teste\ 1
export TARGET_URL=https://128.140.45.28.sslip.io

# Run Tier 2
npx tsx scripts/validation/test-full-universe.ts --tier=2 --limit=200 \
  2>&1 | tee validation-results/tier2-execution.log
```

Monitor progress:
```bash
# In another terminal
tail -f validation-results/tier2-execution.log
```

Analyze results:
```bash
npx tsx scripts/validation/analyze-results.ts \
  validation-results/tier2-2025-10-26-results.json
```

### Step 5: Execute Tier 3 (Full Universe - 762 stocks)

**Duration:** ~15 minutes
**Purpose:** Complete coverage validation

```bash
cd /Users/antoniofrancisco/Documents/teste\ 1
export TARGET_URL=https://128.140.45.28.sslip.io

# Run Tier 3 (full universe)
npx tsx scripts/validation/test-full-universe.ts --tier=3 --full \
  2>&1 | tee validation-results/tier3-execution.log
```

Monitor progress:
```bash
tail -f validation-results/tier3-execution.log
```

Analyze results:
```bash
npx tsx scripts/validation/analyze-results.ts \
  validation-results/tier3-2025-10-26-results.json
```

## Running Tests in Background

To run tests in background (so you can close terminal):

```bash
# Using nohup
nohup npx tsx scripts/validation/test-full-universe.ts --tier=3 --full \
  > validation-results/tier3-execution.log 2>&1 &

# Get process ID
echo $!

# Check if still running
ps aux | grep $!

# View live output
tail -f validation-results/tier3-execution.log
```

## Quick Commands Reference

```bash
# Check backend health
curl -s https://128.140.45.28.sslip.io/api/health | jq '.'

# Test single stock
curl -s https://128.140.45.28.sslip.io/api/iv/AAPL | jq '.methods | length'

# Count stocks in universe
grep -E "^[A-Z]{1,5}(-[A-Z])?," stock_universe_complete.csv | wc -l

# View recent test results
ls -lt validation-results/ | head -10

# Check test progress (if running in background)
ps aux | grep "test-full-universe"

# Kill test if needed
pkill -f "test-full-universe.ts"
```

## Understanding Results

### Pass Criteria (Per Stock)
- ✅ **PASS:** 8+ of 12 methods working (66%+)
- ⚠️ **FAIL:** <8 methods working (data gaps)
- ❌ **ERROR:** HTTP error (502, 504, 404, timeout)

### Overall Success Criteria
- ✅ **Production Ready:** 80%+ pass rate
- 🟡 **Needs Work:** 70-80% pass rate
- ❌ **Not Ready:** <70% pass rate

### Output Files (Per Tier)

Each test run generates:
1. **CSV:** `tierN-YYYY-MM-DD-results.csv` (Excel-compatible)
2. **JSON:** `tierN-YYYY-MM-DD-results.json` (structured data)
3. **Markdown:** `tierN-YYYY-MM-DD-REPORT.md` (readable report)
4. **Analysis:** `tierN-YYYY-MM-DD-results-ANALYSIS.txt` (detailed analysis)

## Troubleshooting

### Test Hangs or Times Out

```bash
# Check if backend is healthy
curl https://128.140.45.28.sslip.io/api/health

# Restart backend if needed (SSH to server)
ssh root@128.140.45.28 "pm2 restart alfalyzer"

# Kill hung test
pkill -f "test-full-universe.ts"

# Re-run with more conservative settings (slower rate)
# Edit test-full-universe.ts and change:
# const RATE_LIMIT_DELAY = 2000; // 2s instead of 1s
```

### High Error Rate (>10%)

**Check backend logs:**
```bash
ssh root@128.140.45.28 "pm2 logs alfalyzer --lines 100"
```

**Possible causes:**
- Backend overload → slow down rate (2-3s delay)
- FMP API issues → check API status
- Network issues → retry failed stocks manually

**Re-run failed stocks only:**
```bash
# Extract failed tickers from CSV
grep "ERROR" validation-results/tier1-2025-10-26-results.csv | \
  cut -d',' -f1 > failed-stocks.txt

# Re-test manually (create custom script if needed)
```

### Results Not Generating

```bash
# Check for errors in log
tail -100 validation-results/tier1-v2-execution.log | grep -i error

# Verify results directory exists
mkdir -p validation-results

# Check disk space
df -h .

# Verify permissions
ls -la validation-results/
```

## Performance Tuning

### Faster Testing (If Backend Can Handle It)

Edit `scripts/validation/test-full-universe.ts`:
```typescript
const RATE_LIMIT_DELAY = 500; // 500ms = 2 req/s (faster)
const MAX_RETRIES = 1; // Fewer retries
```

### Slower Testing (If Many Errors)

```typescript
const RATE_LIMIT_DELAY = 2000; // 2s = 0.5 req/s (slower)
const MAX_RETRIES = 3; // More retries
```

## Estimated Timelines

| Tier | Stocks | Rate | Est. Time | With Retries |
|------|--------|------|-----------|--------------|
| 1    | 100    | 1/s  | 2 min     | ~5 min       |
| 2    | 200    | 1/s  | 3 min     | ~5 min       |
| 3    | 762    | 1/s  | 13 min    | ~15 min      |
| **Total** | **762** | **1/s** | **18 min** | **~25 min** |

*Note: Retries add 2-5 minutes depending on error rate*

## Success Checklist

After completing all tiers, verify:

- [ ] All 3 tiers executed successfully
- [ ] Reports generated for each tier
- [ ] Analysis scripts run without errors
- [ ] Overall pass rate ≥ 80%
- [ ] Error rate < 5%
- [ ] Average response time < 10s
- [ ] Failed stocks documented
- [ ] Priority fix list created

## Next Steps After Completion

1. **Aggregate Results**
   - Combine all tier results
   - Generate master report
   - Calculate overall statistics

2. **Create Production Report**
   - Executive summary
   - Stock-by-stock findings
   - Sector analysis
   - Recommendations

3. **Address Data Gaps**
   - Contact FMP for missing data
   - Document known limitations
   - Plan alternative data sources

4. **Deploy to Production**
   - Update documentation
   - Set up monitoring
   - Configure alerts

## Files Reference

| File | Purpose |
|------|---------|
| `scripts/validation/test-full-universe.ts` | Main test runner |
| `scripts/validation/analyze-results.ts` | Results analyzer |
| `FULL_UNIVERSE_TEST_PLAN.md` | Test strategy |
| `COMPREHENSIVE_IV_TEST_SUITE_SUMMARY.md` | Implementation details |
| `RUN_FULL_UNIVERSE_TESTS.md` | This guide |

---

**Last Updated:** 2025-10-26 02:00 UTC
**Current Status:** Tier 1 in progress (68% pass rate at 50%)
**Next Action:** Wait for Tier 1 completion, then analyze results
