# Chrome DevTools Browser Tests - Manual Execution Guide

**IMPORTANT:** This document provides the exact MCP Chrome DevTools commands to run after the burst warming completes.

## Prerequisites

✅ Burst warming COMPLETE (6-7 hours)
✅ Chrome DevTools MCP server running
✅ Production accessible: https://128.140.45.28.sslip.io

## Test Execution Plan

### Group 1: Cache Hit Rate (5 tests)

#### Test 1: S&P 100 Stock Instant Load (AAPL)

```typescript
// Navigate to AAPL
await mcp__chrome-devtools__navigate_page({ url: 'https://128.140.45.28.sslip.io/intrinsic-value?symbol=AAPL' });

// Wait for page load
await mcp__chrome-devtools__wait_for({ text: 'Intrinsic Value', timeout: 5000 });

// Take snapshot
await mcp__chrome-devtools__take_snapshot({ verbose: false });

// Measure performance
const timing = await mcp__chrome-devtools__evaluate_script({
  function: `() => {
    const navigation = performance.getEntriesByType('navigation')[0];
    return {
      loadTime: navigation.loadEventEnd - navigation.fetchStart,
      domReady: navigation.domContentLoadedEventEnd - navigation.fetchStart,
      ttfb: navigation.responseStart - navigation.requestStart
    };
  }`
});

// ASSERT: loadTime < 500ms
// ASSERT: Growth rates visible and NOT 0%
```

#### Test 2: S&P 500 Stock Instant Load (AMD)

```typescript
await mcp__chrome-devtools__navigate_page({ url: 'https://128.140.45.28.sslip.io/intrinsic-value?symbol=AMD' });
await mcp__chrome-devtools__wait_for({ text: 'Intrinsic Value', timeout: 5000 });

const timing = await mcp__chrome-devtools__evaluate_script({
  function: `() => {
    const navigation = performance.getEntriesByType('navigation')[0];
    return navigation.loadEventEnd - navigation.fetchStart;
  }`
});

// ASSERT: loadTime < 500ms
```

#### Test 3: Extended Universe Stock (SHOP)

```typescript
await mcp__chrome-devtools__navigate_page({ url: 'https://128.140.45.28.sslip.io/intrinsic-value?symbol=SHOP' });
await mcp__chrome-devtools__wait_for({ text: 'Intrinsic Value', timeout: 5000 });

const snapshot = await mcp__chrome-devtools__take_snapshot({ verbose: false });

// ASSERT: IV chart visible
// ASSERT: Growth rates loaded
```

#### Test 4: Portuguese Stock (BCP.LS)

```typescript
await mcp__chrome-devtools__navigate_page({ url: 'https://128.140.45.28.sslip.io/intrinsic-value?symbol=BCP.LS' });
await mcp__chrome-devtools__wait_for({ text: 'Intrinsic Value', timeout: 5000 });

// ASSERT: Loads without significant delay
// ASSERT: No error messages
```

#### Test 5: Small-Cap Stock (CLSK)

```typescript
await mcp__chrome-devtools__navigate_page({ url: 'https://128.140.45.28.sslip.io/intrinsic-value?symbol=CLSK' });
await mcp__chrome-devtools__wait_for({ text: 'Intrinsic Value', timeout: 10000 }); // More tolerance for small caps

const snapshot = await mcp__chrome-devtools__take_snapshot({ verbose: false });

// ASSERT: Page loads successfully
// ASSERT: Fallback mechanism works if data sparse
```

---

### Group 2: Growth Rates Validation (5 tests)

#### Test 6: Growth Rates NOT 0%

```typescript
await mcp__chrome-devtools__navigate_page({ url: 'https://128.140.45.28.sslip.io/intrinsic-value?symbol=AAPL' });
await mcp__chrome-devtools__wait_for({ text: 'Intrinsic Value', timeout: 5000 });

const growthRates = await mcp__chrome-devtools__evaluate_script({
  function: `() => {
    // Find growth rate elements (adjust selectors based on actual DOM)
    const y1_5 = document.querySelector('[data-testid="growth-y1-5"]')?.textContent ||
                 document.querySelector('text:contains("Y1-5")')?.nextSibling?.textContent;
    const y6_10 = document.querySelector('[data-testid="growth-y6-10"]')?.textContent;

    return {
      y1_5,
      y6_10,
      allElements: Array.from(document.querySelectorAll('*[class*="growth"]')).map(el => ({
        class: el.className,
        text: el.textContent.trim()
      }))
    };
  }`
});

// ASSERT: growthRates.y1_5 !== '0.00%'
// ASSERT: growthRates.y1_5 !== '0%'
// ASSERT: growthRates.y1_5 is a valid percentage
```

#### Test 7: Growth Rates Are Dynamic

```typescript
// Load AAPL
await mcp__chrome-devtools__navigate_page({ url: 'https://128.140.45.28.sslip.io/intrinsic-value?symbol=AAPL' });
await mcp__chrome-devtools__wait_for({ text: 'Intrinsic Value', timeout: 5000 });

const aaplGrowth = await mcp__chrome-devtools__evaluate_script({
  function: `() => {
    const y1_5 = document.querySelector('[data-testid="growth-y1-5"]')?.textContent || 'not found';
    return y1_5;
  }`
});

// Load NVDA
await mcp__chrome-devtools__navigate_page({ url: 'https://128.140.45.28.sslip.io/intrinsic-value?symbol=NVDA' });
await mcp__chrome-devtools__wait_for({ text: 'Intrinsic Value', timeout: 5000 });

const nvdaGrowth = await mcp__chrome-devtools__evaluate_script({
  function: `() => {
    const y1_5 = document.querySelector('[data-testid="growth-y1-5"]')?.textContent || 'not found';
    return y1_5;
  }`
});

// ASSERT: aaplGrowth !== nvdaGrowth
// ASSERT: Both are valid percentages
```

#### Test 8: Data Source Indicator

```typescript
await mcp__chrome-devtools__navigate_page({ url: 'https://128.140.45.28.sslip.io/intrinsic-value?symbol=AAPL' });
await mcp__chrome-devtools__wait_for({ text: 'Intrinsic Value', timeout: 5000 });

const dataSource = await mcp__chrome-devtools__evaluate_script({
  function: `() => {
    const sourceElement = document.querySelector('[data-testid="data-source"]') ||
                         document.querySelector('*[class*="source"]');
    return {
      text: sourceElement?.textContent,
      exists: !!sourceElement
    };
  }`
});

// ASSERT: dataSource.exists === true
// ASSERT: dataSource.text includes 'analyst' OR 'historical' OR 'default'
```

#### Test 9: Confidence Level Displayed

```typescript
const confidence = await mcp__chrome-devtools__evaluate_script({
  function: `() => {
    const confElement = document.querySelector('[data-testid="confidence"]') ||
                       document.querySelector('*[class*="confidence"]');
    return {
      text: confElement?.textContent,
      exists: !!confElement
    };
  }`
});

// ASSERT: confidence.exists === true
// ASSERT: confidence.text includes 'high' OR 'medium' OR 'low'
```

#### Test 10: Analyst Count Displayed

```typescript
const analystCount = await mcp__chrome-devtools__evaluate_script({
  function: `() => {
    const countElement = document.querySelector('[data-testid="analyst-count"]') ||
                        document.querySelector('*[class*="analyst"]');
    return {
      text: countElement?.textContent,
      count: parseInt(countElement?.textContent) || 0,
      exists: !!countElement
    };
  }`
});

// ASSERT: analystCount.count > 0 (for large caps like AAPL)
```

---

### Group 3: Bandwidth Protection (4 tests)

**Note:** Tests 11-14 are API tests (already implemented in the Node.js script).
Run them via:

```bash
node scripts/validation/chrome-devtools-comprehensive-test.mjs
```

They will test:
- Test 11: `/api/bandwidth/stats`
- Test 12: `/api/bandwidth/history`
- Test 13: Circuit breaker headers in `/api/iv/AAPL/chart`
- Test 14: Manual update endpoint POST `/api/bandwidth/manual-update`

---

### Group 4: Event-Driven Worker (3 tests)

#### Test 15: Worker Health Endpoint

**Note:** Already implemented in Node.js script. Tests `http://128.140.45.28:3005/health`

#### Test 16: Cache Invalidation Working

**Requires SSH validation:**

```bash
ssh root@128.140.45.28 "redis-cli -a alfalyzer2025redis KEYS 'iv:*' | wc -l"
```

ASSERT: Should have many IV cache keys

#### Test 17: Earnings Detection Working

**Requires PM2 logs:**

```bash
ssh root@128.140.45.28 "pm2 logs iv-worker --lines 50 | grep 'Found.*earnings events'"
```

ASSERT: Should show earnings events being detected

---

### Group 5: UI/UX (3 tests)

#### Test 18: Median Methods Removed

```typescript
await mcp__chrome-devtools__navigate_page({ url: 'https://128.140.45.28.sslip.io/intrinsic-value?symbol=AAPL' });
await mcp__chrome-devtools__wait_for({ text: 'Intrinsic Value', timeout: 5000 });

const snapshot = await mcp__chrome-devtools__take_snapshot({ verbose: true });

// Find dropdown options
const dropdownOptions = await mcp__chrome-devtools__evaluate_script({
  function: `() => {
    const dropdown = document.querySelector('[data-testid="method-dropdown"]') ||
                    document.querySelector('select[name*="method"]');

    if (!dropdown) return { error: 'Dropdown not found' };

    const options = Array.from(dropdown.querySelectorAll('option')).map(opt => ({
      value: opt.value,
      text: opt.textContent.trim()
    }));

    return {
      options,
      hasMedian: options.some(opt => opt.text.toLowerCase().includes('median'))
    };
  }`
});

// ASSERT: dropdownOptions.hasMedian === false
```

#### Test 19: Custom Method Dropdown

```typescript
// Take snapshot first to find dropdown UID
const snapshot = await mcp__chrome-devtools__take_snapshot({ verbose: false });

// Select custom method from dropdown (use UID from snapshot)
await mcp__chrome-devtools__fill({
  uid: '<UID_FROM_SNAPSHOT>', // e.g., "select-method-dropdown"
  value: 'custom-dcf-20'
});

// Wait for custom selector to appear
await mcp__chrome-devtools__wait_for({ text: 'Based on', timeout: 3000 });

const customSelector = await mcp__chrome-devtools__evaluate_script({
  function: `() => {
    const selector = document.querySelector('[data-testid="custom-based-on"]');
    return {
      exists: !!selector,
      visible: selector && selector.offsetParent !== null
    };
  }`
});

// ASSERT: customSelector.visible === true
```

#### Test 20: ETF Detection

```typescript
await mcp__chrome-devtools__navigate_page({ url: 'https://128.140.45.28.sslip.io/intrinsic-value?symbol=SPY' });

// Wait for error message or content
await mcp__chrome-devtools__wait_for({ text: 'ETF', timeout: 10000 });

const errorMessage = await mcp__chrome-devtools__evaluate_script({
  function: `() => {
    const errorEl = document.querySelector('[data-testid="error-message"]') ||
                   document.querySelector('*[class*="error"]');
    return {
      text: errorEl?.textContent || '',
      exists: !!errorEl
    };
  }`
});

// ASSERT: errorMessage.text.includes('ETF') OR errorMessage.text.includes('No cash flow')
```

---

## Execution Checklist

### Before Starting:
- [ ] Confirm burst warming is COMPLETE (check Agent 1 logs)
- [ ] Verify production is accessible: `curl -I https://128.140.45.28.sslip.io`
- [ ] Ensure Chrome DevTools MCP server is running
- [ ] Check worker health: `curl http://128.140.45.28:3005/health`

### During Execution:
- [ ] Run API tests first (Groups 3 & 4 non-browser tests)
- [ ] Open Chrome DevTools MCP connection
- [ ] Execute browser tests sequentially (Groups 1, 2, 5)
- [ ] Take screenshots of failures for debugging
- [ ] Record performance metrics

### After Completion:
- [ ] Review validation report
- [ ] Investigate any failures
- [ ] Update CLAUDE.md if issues found
- [ ] Notify team of results

---

## Expected Results

**Pass Criteria:**
- Success rate: ≥95% (19/20 tests passing)
- Average load time: <500ms for cached stocks
- Growth rates: NOT 0%, dynamically changing
- Bandwidth protection: All APIs responding correctly
- Worker: Health endpoint OK, cache invalidation working
- UI: No median methods, custom dropdown functional, ETF detection working

**If Success Rate < 95%:**
1. Review failed tests in detail
2. Check browser console for errors
3. Verify API responses manually
4. Check PM2 logs for worker issues
5. Re-run failed tests individually
6. Consider re-running burst warming if cache issues detected

---

## Troubleshooting

### "Dropdown not found" error:
- Check actual DOM structure in browser
- Update selectors based on real implementation
- Use verbose snapshot to find exact UIDs

### Load time > 500ms:
- Check Redis cache hit rates
- Verify FMP API is responding quickly
- Look for network throttling in DevTools

### Growth rates still 0%:
- Check backend logs for API errors
- Verify ONDA 1-6 implementations deployed
- Test API endpoint directly: `curl https://128.140.45.28.sslip.io/api/iv/AAPL/chart`

### Worker health fails:
- Check PM2 status: `pm2 status iv-worker`
- Review worker logs: `pm2 logs iv-worker --lines 100`
- Verify port 3005 is accessible

---

**Last Updated:** 2025-10-24
**Next Review:** After burst completion + validation run
