# Frontend E2E Validation Suite

Comprehensive Playwright-based end-to-end testing for the Intrinsic Value frontend.

## Overview

This validation suite tests all critical frontend functionality including:

- **Stock Type Coverage**: Banks, REITs, growth stocks, value stocks
- **Ticker Normalization**: BRK.B and other complex tickers
- **ETF Rejection UX**: Friendly error messages for ETFs
- **Manual Inputs**: No crashes on financial data edits
- **Mobile Responsiveness**: 375px viewport testing
- **Performance**: Page load time benchmarks

## Prerequisites

```bash
# Ensure Playwright is installed
npm install -D @playwright/test

# Install browser binaries
npx playwright install chromium
```

## Quick Start

### Step 1: Wait for Backend Validation

**DO NOT RUN** until backend agent completes their validation and confirms API endpoints are working.

### Step 2: Run Frontend Tests

```bash
# Run full validation suite
bash scripts/validation/run-frontend-validation.sh

# Or run tests directly with Playwright
npx playwright test scripts/validation/validate-frontend-e2e.spec.ts --reporter=list
```

### Step 3: Analyze Results

```bash
# Generate summary report
bash scripts/validation/analyze-results.sh

# View HTML report
npx playwright show-report validation-results/report
```

## Test Cases

### 1. Bank Stock (JPM) - 9 Methods, Zero DCF
- Validates no DCF methods present (banks don't use cash flow models)
- Confirms P/TBV and other bank-specific methods available
- Screenshot: `validation-results/jpm-initial.png`

### 2. REIT Stock (PLD) - 16-18 Methods
- Validates comprehensive method coverage for REITs
- Confirms FFO-based and yield-based methods present
- Screenshot: `validation-results/pld-initial.png`

### 3. Growth Stock (NVDA) - Growth DCF 8Y
- Validates Growth DCF 8Y method is available
- Confirms auto-detection of growth classification
- Screenshot: `validation-results/nvda-initial.png`

### 4. Value Stock (AAPL) - Standard Methods
- Validates standard DCF and PE ratio methods
- Confirms ValuationGauge component renders
- Screenshot: `validation-results/aapl-initial.png`

### 5. BRK.B Ticker Normalization
- Validates dot-notation ticker works correctly
- Confirms no 404 errors or method failures
- Screenshot: `validation-results/brkb-initial.png`

### 6. ETF Rejection (SPY) - Friendly Error
- Validates HTTP 422 response converted to user-friendly message
- Confirms alternative methods suggested
- Screenshot: `validation-results/spy-etf-rejection.png`

### 7. Manual Financial Inputs - No Crashes
- Validates no `.toFixed()` errors on undefined values
- Confirms inputs accept large numbers without scientific notation
- Screenshot: `validation-results/aapl-manual-inputs.png`

### 8. Mobile Responsiveness
- Validates 375px viewport (iPhone SE)
- Confirms no horizontal scroll
- Confirms gauge component visible and scaled
- Screenshot: `validation-results/mobile-aapl.png`

### 9. Performance Benchmarks
- Validates page load time < 5s
- Measures TTFB, DOM load, and full page load
- Logs performance metrics to console

## Output Files

```
validation-results/
├── report/
│   └── index.html              # Interactive HTML report
├── test-results.json           # Raw JSON results
├── test-artifacts/             # Videos, traces (on failure)
├── FRONTEND_VALIDATION_SUMMARY.md  # Executive summary
└── *.png                       # Screenshots (all tests)
```

## Success Criteria

### Pass Rate
- **Target:** 100% (9/9 tests passing)
- **Acceptable:** ≥ 90% (8/9 tests passing)
- **Failure:** < 90% (≤ 7/9 tests passing)

### Performance
- **Page Load:** < 5s (measured on production)
- **TTFB:** < 1s
- **DOM Load:** < 3s

### Visual Quality
- No layout shifts or overflow
- Gauge component visible on all viewports
- Method dropdowns functional and styled

## Troubleshooting

### Backend Not Ready
```
❌ Backend not responding (HTTP 000)
```
**Solution:** Wait for backend validation to complete. Check `https://128.140.45.28.sslip.io/api/health`

### Playwright Not Installed
```
Error: npx: playwright not found
```
**Solution:** Install Playwright: `npm install -D @playwright/test && npx playwright install chromium`

### Timeout Errors
```
Timeout 15000ms exceeded
```
**Solution:** Check network connectivity. Backend may be slow or down.

### Screenshot Errors
```
Error: Unable to capture screenshot
```
**Solution:** Ensure `validation-results/` directory exists: `mkdir -p validation-results`

## CI/CD Integration

```yaml
# GitHub Actions example
- name: Run Frontend E2E Tests
  run: |
    bash scripts/validation/run-frontend-validation.sh
    bash scripts/validation/analyze-results.sh

- name: Upload Test Results
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: validation-results/
```

## Manual Testing Checklist

If automated tests fail, manually verify:

- [ ] Navigate to `/intrinsic-value?symbol=JPM` - Should load 9 methods
- [ ] Navigate to `/intrinsic-value?symbol=NVDA` - Should show Growth DCF 8Y
- [ ] Navigate to `/intrinsic-value?symbol=SPY` - Should show ETF error
- [ ] Try BRK.B ticker - Should normalize to BRK-B internally
- [ ] Edit manual financial inputs - Should not crash with .toFixed() error
- [ ] Open on mobile device - Should be responsive, no horizontal scroll
- [ ] Check method dropdown - Should filter based on stock type

## Next Steps

After frontend validation:

1. **If all tests pass:**
   - Generate final report: `bash scripts/validation/analyze-results.sh`
   - Review screenshots for visual quality
   - Decision: **GO for production**

2. **If tests fail:**
   - Review HTML report: `npx playwright show-report validation-results/report`
   - Check console logs for errors
   - Fix issues and re-run tests
   - Decision: **NO-GO until fixed**

---

**Last Updated:** 2025-11-04
**Maintained By:** Claude (Frontend Agent)
