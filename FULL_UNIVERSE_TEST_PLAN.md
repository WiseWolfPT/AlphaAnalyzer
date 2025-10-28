# Full Universe IV Test Plan - ONDA 2 Follow-Up

**Date:** 2025-10-26
**Goal:** Validate Intrinsic Value calculations across entire US stock universe (762 stocks)
**Previous Results:** ONDA 2 achieved 85%+ pass rate on 55 tested stocks

## Test Strategy

### Three-Tier Approach

**Tier 1: Smoke Test (100 stocks)**
- Purpose: Quick validation of system stability
- Expected time: ~3 minutes (1 req/s + retries)
- Success criteria: 80%+ pass rate
- Status: IN PROGRESS

**Tier 2: Sector Coverage (200 stocks)**
- Purpose: Representative sample across all sectors
- Expected time: ~5 minutes
- Breakdown: 20 stocks per sector (11 sectors)
- Status: PENDING

**Tier 3: Full Universe (762 stocks)**
- Purpose: Complete coverage
- Expected time: ~15 minutes
- Coverage: All US stocks (excluded European/Portuguese)
- Status: PENDING

## Stock Universe

**Total in CSV:** 1,494 stocks
**European/Non-US:** 732 stocks (excluded)
**US Stocks:** 762 stocks (target universe)

### Filtering Criteria

Excluded:
- European exchanges: LSE, XETRA, BME, Euronext
- Symbols with suffixes: .L, .LS, .DE, .F, .MC, .PA, .AS, .MI
- Non-US ticker formats

Included:
- Clean US tickers: 1-5 uppercase letters (e.g., AAPL, MSFT, BRK-B)
- Exchanges: NASDAQ, NYSE, AMEX, N/A

## Test Configuration

**Rate Limiting:**
- Speed: 1 request/second (conservative)
- Reason: IV calculations are CPU-intensive on backend

**Retry Logic:**
- Max retries: 2 attempts
- Backoff: 2 seconds between retries
- Retry on: 502, 504, ETIMEDOUT errors

**Timeout:**
- Per request: 120 seconds (2 minutes)
- Learned from ONDA 2 testing

**Pass Criteria:**
- Per stock: 8+ of 12 methods working (66%+)
- Overall: 80%+ stocks passing

## Known Issues (From Initial Testing)

### Backend 502 Errors
- **Symptom:** Many stocks returning 502 errors
- **Likely cause:** Backend overload from concurrent IV calculations
- **Mitigation:** Slowed to 1 req/s, added retry logic

### Mixed Success Rates
- **Working well:** Large-cap tech stocks (AAPL, MSFT, GOOGL)
- **Issues:** Some mid/small-cap stocks with data gaps
- **Expected:** Aligns with ONDA 2 findings

## Test Script Location

**Main script:** `/scripts/validation/test-full-universe.ts`

**Key features:**
- CSV parsing with smart filtering
- Retry logic with exponential backoff
- Real-time progress reporting
- Multiple output formats (CSV, JSON, Markdown)
- Sector/exchange breakdown
- HTTP status code tracking

## Expected Outputs

### Files Generated

1. **CSV Results:** `validation-results/tier{N}-YYYY-MM-DD-results.csv`
   - Stock-by-stock detailed results
   - Importable to Excel/Google Sheets

2. **JSON Results:** `validation-results/tier{N}-YYYY-MM-DD-results.json`
   - Structured data with aggregated stats
   - Machine-readable for further analysis

3. **Markdown Report:** `validation-results/tier{N}-YYYY-MM-DD-REPORT.md`
   - Human-readable executive summary
   - Pass/fail breakdown by sector
   - Error analysis
   - Recommendations

### Report Sections

Each report includes:
- Executive summary (pass rate, duration, avg response time)
- Results by sector (pass rates per sector)
- Results by exchange
- HTTP status code distribution
- Failed stocks table (stocks with <8 methods)
- Error stocks table (502, 504, timeouts)
- Priority fix recommendations

## Success Metrics

**Primary:**
- ✅ 80%+ overall pass rate across universe
- ✅ All 762 stocks tested
- ✅ Reports generated successfully

**Secondary:**
- Average response time < 10 seconds
- <5% 502/504 errors after retries
- All 11 sectors represented

## Timeline

- **Tier 1 (100 stocks):** ~3 minutes
- **Tier 2 (200 stocks):** ~5 minutes
- **Tier 3 (762 stocks):** ~15 minutes
- **Total (with analysis):** ~30 minutes

## Next Steps After Completion

1. **If pass rate ≥ 80%:**
   - ✅ Proceed to production validation
   - Document any stocks with data gaps
   - Monitor stocks with <12 methods

2. **If pass rate < 80%:**
   - Identify systematic failure patterns
   - Debug stocks with consistent 502/504 errors
   - Contact FMP for data quality issues
   - Re-test after fixes

## Related Documents

- **ONDA 2 Results:** (Previous 55-stock validation - 85%+ pass rate)
- **Stock Universe:** `stock_universe_complete.csv`
- **Backend Code:** `server/controllers/iv-controller.ts`
- **IV Methods:** 12 valuation methods (DCF, multiples, growth-based)

---

**Status:** Tier 1 testing in progress (started 2025-10-26 01:49 UTC)
**Next Update:** After Tier 1 completion
