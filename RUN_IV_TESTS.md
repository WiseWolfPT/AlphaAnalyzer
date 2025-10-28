# 🚀 Quick Start: Run IV Universe Tests

**ONDA 4.2 - Test 20 Diverse Stocks**

---

## ⚡ TL;DR

```bash
# 1. Fix API key (if needed)
echo "FMP_API_KEY=your_real_key_here" >> .env

# 2. Restart backend
pm2 restart alfalyzer --update-env

# 3. Run tests
TEST_API_URL=http://localhost:3000 npx tsx scripts/test-iv-universe.ts
```

---

## 📋 Prerequisites Checklist

- [ ] Backend running (check: `curl http://localhost:3000/api/health`)
- [ ] Valid FMP API key (NOT `test_key_32_chars_minimum_length_ok`)
- [ ] Quotes endpoint working (check: `curl "http://localhost:3000/api/market-data/quote/AAPL"`)
- [ ] Node.js v20+ installed
- [ ] TypeScript execution available (`npx tsx`)

---

## 🔧 Step 1: Check Backend Status

### Check if backend is running
```bash
# Check process
ps aux | grep "dist/server/index.cjs" | grep -v grep

# Check port
lsof -nP -iTCP:3000 -sTCP:LISTEN

# Check health
curl http://localhost:3000/api/health
```

**Expected:** `{"status":"healthy",...}`

### Check API key
```bash
# Get process ID
ps aux | grep "dist/server/index.cjs" | grep -v grep | awk '{print $2}'

# Check environment variables (replace 16336 with your PID)
ps eww -p 16336 | tr ' ' '\n' | grep FMP_API_KEY
```

**Expected:** `FMP_API_KEY=<real_key_not_test_key>`

---

## 🔑 Step 2: Fix API Key (If Needed)

### Option A: Update .env and restart
```bash
cd /Users/antoniofrancisco/Documents/teste\ 1

# Backup current .env
cp .env .env.backup

# Update FMP API key (replace with your real key)
# Remove old line first
grep -v "^FMP_API_KEY=" .env > .env.tmp
mv .env.tmp .env

# Add new key
echo "FMP_API_KEY=your_real_fmp_key_here" >> .env

# Restart backend
pm2 restart alfalyzer --update-env

# Wait for restart
sleep 5

# Verify
curl "http://localhost:3000/api/market-data/quote/AAPL"
```

**Expected:** Real quote data with price, not `{"error":"QUOTE_NOT_FOUND"}`

### Option B: Use production instead
```bash
# Test against production (already has valid API key)
TEST_API_URL=https://128.140.45.28.sslip.io npx tsx scripts/test-iv-universe.ts
```

---

## ▶️ Step 3: Run Tests

### Local backend (port 3000)
```bash
cd /Users/antoniofrancisco/Documents/teste\ 1

# Set API URL and run
TEST_API_URL=http://localhost:3000 npx tsx scripts/test-iv-universe.ts
```

### Production backend
```bash
cd /Users/antoniofrancisco/Documents/teste\ 1

# Run against Hetzner production
TEST_API_URL=https://128.140.45.28.sslip.io npx tsx scripts/test-iv-universe.ts
```

### Expected runtime
- **Duration:** 10-15 minutes (20 stocks × 30s each + 500ms delays)
- **API calls:** ~540 total (27 per stock × 20 stocks)
- **Rate limiting:** 500ms delay between stocks (built-in)

---

## 📊 Step 4: Review Results

### Console output
Test suite displays:
- ✅ Real-time progress (1/20, 2/20, ...)
- ✅ Pass/Fail status per stock
- ✅ Summary statistics (passed/failed/errors)
- ✅ P0 bug verification (growth rates ≠ 0%)
- ✅ Growth rates sample (top 10 stocks)
- ✅ Sector breakdown (success % per sector)
- ✅ Portuguese stocks status (BCP.LS, GALP.LS)
- ✅ Expected vs Actual comparison (9 stocks)

### JSON output
```bash
# Detailed results saved to:
cat /tmp/iv-universe-test-results.json | jq

# Pretty print specific stock
cat /tmp/iv-universe-test-results.json | jq '.[] | select(.ticker == "AAPL")'

# Count passed stocks
cat /tmp/iv-universe-test-results.json | jq '[.[] | select(.status == "PASS")] | length'

# Get Portuguese stocks
cat /tmp/iv-universe-test-results.json | jq '[.[] | select(.country == "PT")]'
```

---

## ✅ Success Criteria

### Overall
- [x] ≥18/20 stocks PASS (90% success rate)
- [x] Exit code: 0 (SUCCESS)

### P0 Bug Fix
- [x] 100% of passed stocks have growth_y1_5 ≠ 0%
- [x] 100% of passed stocks have growth_y6_10 ≠ 0%
- [x] All growth_y11_20 = 4.00%

### Portuguese Stocks
- [x] BCP.LS passes (100% required)
- [x] GALP.LS passes (100% required)

### Growth Accuracy
- [x] ≥7/9 known growths match within ±5% (80%+)

---

## 🐛 Troubleshooting

### Backend not running
```bash
cd /Users/antoniofrancisco/Documents/teste\ 1
npm run dev
```

### Quotes still failing
```bash
# Check FMP API key is valid
curl "https://financialmodelingprep.com/api/v3/profile/AAPL?apikey=$FMP_API_KEY"

# Should return company profile data
```

### Test timeout errors
```bash
# Increase timeout in script (default: 30s)
# Edit scripts/test-iv-universe.ts line 240
const REQUEST_TIMEOUT = 60000; // 60 seconds
```

### Rate limiting
```bash
# Increase delay between requests (default: 500ms)
# Edit scripts/test-iv-universe.ts line 526
await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second
```

### Portuguese stocks fail
```bash
# Check FMP supports .LS suffix
curl "https://financialmodelingprep.com/api/v3/profile/BCP.LS?apikey=$FMP_API_KEY"

# If not supported, may need alternative data source
```

---

## 📁 Output Files

### Console logs
Saved to terminal output (can redirect):
```bash
TEST_API_URL=http://localhost:3000 npx tsx scripts/test-iv-universe.ts > /tmp/iv-test-log.txt 2>&1
```

### JSON results
```
/tmp/iv-universe-test-results.json
```

Contains per-stock:
- Status (PASS/FAIL/ERROR)
- Methods count
- Growth rates (Y1-5, Y6-10, Y11-20)
- Data source & confidence
- Sample IV & current price
- Expected vs actual variance

---

## 📚 Documentation

- **Test Script:** `/scripts/test-iv-universe.ts` (543 lines)
- **Test Spec:** `/docs/IV_UNIVERSE_TEST_SPEC.md` (500+ lines)
- **Sector Report:** `/docs/SECTOR_COVERAGE_REPORT.md` (600+ lines)
- **Completion Report:** `/ONDA_4_2_COMPLETION_REPORT.md` (750+ lines)

---

## 🎯 What Tests Validate

1. **P0 Bug Fix:** Growth rates ≠ 0% (critical)
2. **Methods Count:** ≥10 valuation methods per stock
3. **Growth Accuracy:** Match known values within ±5%
4. **Data Sources:** Analyst/Historical/Default attribution
5. **Confidence Levels:** High/Medium/Low quality indicators
6. **Portuguese Tickers:** .LS suffix handling
7. **Sector Coverage:** All 5 sectors have ≥75% success
8. **API Integration:** FMP endpoints working correctly

---

## 🚀 Quick Commands

```bash
# Full test run (local)
cd /Users/antoniofrancisco/Documents/teste\ 1 && TEST_API_URL=http://localhost:3000 npx tsx scripts/test-iv-universe.ts

# Full test run (production)
cd /Users/antoniofrancisco/Documents/teste\ 1 && TEST_API_URL=https://128.140.45.28.sslip.io npx tsx scripts/test-iv-universe.ts

# Test single stock (manual)
curl "http://localhost:3000/api/iv/AAPL/chart" | jq

# Check results
cat /tmp/iv-universe-test-results.json | jq

# Count success
cat /tmp/iv-universe-test-results.json | jq '[.[] | select(.status == "PASS")] | length'
```

---

**Last Updated:** October 24, 2025
**Status:** ✅ Ready to run (pending valid API key)
**ETA:** <20 minutes after API key configured
