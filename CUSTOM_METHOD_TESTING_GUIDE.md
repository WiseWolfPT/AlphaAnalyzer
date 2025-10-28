# Custom Method Testing Guide

**Feature**: Custom valuation method with "Based On" dropdown
**Implementation**: ONDA 3.2
**Date**: 2025-10-24

---

## Quick Test (5 minutes)

### Prerequisites
- Frontend built and running
- Backend serving API on localhost:3001 or production
- Browser with DevTools access

### Steps

1. **Navigate to Intrinsic Value page**
   ```
   http://localhost:3000/intrinsic-value?symbol=AAPL
   ```

2. **Expand "Show All Methods" section**
   - Click "Show All Methods" button
   - Verify you see the method dropdown

3. **Select "Custom" method**
   - Open method dropdown
   - Scroll to bottom "Custom" section
   - Click "Custom (DCF with selectable base)"
   - ✅ **EXPECT**: "Based On" dropdown appears below

4. **Test "Based On" options**
   - Click "Based On" dropdown
   - ✅ **EXPECT**: 3 options visible:
     - Operating Cash Flow (OCF)
     - Free Cash Flow (FCF) ← should have green checkmark
     - Net Income (NI)
   - Select **Free Cash Flow (FCF)**
   - ✅ **EXPECT**: Badge shows "Using FCF for DCF calculation"
   - ✅ **EXPECT**: Green "Recommended" badge appears

5. **Verify IV calculation**
   - Check "Auto Calculation" gauge on left
   - ✅ **EXPECT**: IV value displayed (e.g., $143.61 for AAPL)
   - ✅ **EXPECT**: Inputs section shows FCF-related fields

6. **Switch to OCF**
   - Open "Based On" dropdown again
   - Select **Operating Cash Flow (OCF)**
   - ✅ **EXPECT**: Badge updates to "Using OCF for DCF calculation"
   - ✅ **EXPECT**: "Recommended" badge disappears
   - ✅ **EXPECT**: IV value changes (e.g., $162.50 for AAPL)
   - ✅ **EXPECT**: Inputs section shows OCF-related fields

7. **Switch to NI**
   - Open "Based On" dropdown again
   - Select **Net Income (NI)**
   - ✅ **EXPECT**: Badge updates to "Using NI for DCF calculation"
   - ✅ **EXPECT**: IV value changes again
   - ✅ **EXPECT**: Inputs section shows NI-related fields

8. **Test localStorage persistence**
   - Keep "Net Income" selected
   - Refresh page (F5)
   - Expand "Show All Methods"
   - Select "Custom" method again
   - ✅ **EXPECT**: "Based On" dropdown pre-filled with "Net Income"
   - ✅ **EXPECT**: Badge shows "Using NI for DCF calculation"

9. **Verify in DevTools**
   - Open DevTools (F12)
   - Go to Application → Local Storage → http://localhost:3000
   - ✅ **EXPECT**: Key `alfavalue-custom-based-on` with value `"ni"`

---

## Detailed Test Scenarios

### Scenario A: First-Time User (No localStorage)

**Setup**: Clear localStorage
```javascript
// In DevTools Console:
localStorage.removeItem('alfavalue-custom-based-on');
```

**Steps**:
1. Refresh page
2. Select "Custom" method
3. ✅ **EXPECT**: "Based On" dropdown defaults to **FCF**
4. ✅ **EXPECT**: Badge shows "Using FCF for DCF calculation"
5. ✅ **EXPECT**: "Recommended" badge visible
6. ✅ **EXPECT**: localStorage set to `"fcf"`

**Verify**:
```javascript
// DevTools Console:
localStorage.getItem('alfavalue-custom-based-on')
// Expected output: "fcf"
```

---

### Scenario B: Returning User (Has Preference)

**Setup**: Set localStorage manually
```javascript
// In DevTools Console:
localStorage.setItem('alfavalue-custom-based-on', 'ocf');
```

**Steps**:
1. Refresh page
2. Select "Custom" method
3. ✅ **EXPECT**: "Based On" dropdown pre-filled with **OCF**
4. ✅ **EXPECT**: Badge shows "Using OCF for DCF calculation"
5. ✅ **EXPECT**: No "Recommended" badge (only for FCF)

---

### Scenario C: Compare All 3 Methods (AAPL Example)

**Symbol**: AAPL

**Steps**:
1. Select Custom + FCF
   - ✅ **EXPECT**: IV ≈ $140-150 (actual: $143.61 on StockOracle)
2. Switch to OCF
   - ✅ **EXPECT**: IV ≈ $155-165 (actual: $162.50 on StockOracle)
   - ✅ **EXPECT**: Higher than FCF (no CapEx deduction)
3. Switch to NI
   - ✅ **EXPECT**: IV different from both FCF and OCF
   - ✅ **EXPECT**: Could be higher or lower depending on non-cash items

**Why differences?**
- **OCF > FCF**: Operating CF doesn't subtract CapEx
- **NI ≠ FCF/OCF**: Net Income includes non-cash items (depreciation, amortization)

---

### Scenario D: Input Mapping Verification

**Symbol**: AAPL
**Method**: Custom + FCF

**Steps**:
1. Select Custom + FCF
2. Scroll to "Financial Inputs" section
3. ✅ **EXPECT**: See fields like:
   - Free Cash Flow (TTM): $XXX,XXX M
   - Total Debt: $XXX,XXX M
   - Cash & ST Investments: $XXX,XXX M
   - Discount Rate: X.XX%
   - Shares Outstanding: XXX.X M
   - Growth Rate 1-5: X.X%
   - Growth Rate 6-10: X.X%
   - Growth Rate 11-20: X.X%

4. Switch to Custom + OCF
5. ✅ **EXPECT**: "Free Cash Flow" changes to "Operating Cash Flow"
6. ✅ **EXPECT**: All other fields remain similar structure

7. Switch to Custom + NI
8. ✅ **EXPECT**: "Free Cash Flow" changes to "Net Income"
9. ✅ **EXPECT**: All other fields remain similar structure

---

### Scenario E: localStorage Error Handling

**Setup**: Simulate localStorage failure
```javascript
// In DevTools Console:
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: () => { throw new Error('Storage disabled'); },
    setItem: () => { throw new Error('Storage disabled'); },
    removeItem: () => { throw new Error('Storage disabled'); },
  },
  writable: false
});
```

**Steps**:
1. Refresh page
2. Select "Custom" method
3. ✅ **EXPECT**: Component still works
4. ✅ **EXPECT**: Defaults to FCF
5. ✅ **EXPECT**: Console shows error (graceful degradation)
6. Select OCF
7. ✅ **EXPECT**: Dropdown changes to OCF
8. ✅ **EXPECT**: IV updates correctly
9. Refresh page
10. ✅ **EXPECT**: Resets to FCF (no persistence due to localStorage error)

**Cleanup**:
```javascript
location.reload(); // Reset localStorage to normal
```

---

### Scenario F: Mobile Responsiveness

**Setup**: DevTools → Toggle Device Toolbar (Ctrl+Shift+M)

**Test on**:
- iPhone 12 Pro (390x844)
- iPad (768x1024)
- Samsung Galaxy S20 (360x800)

**Steps**:
1. Navigate to Intrinsic Value page
2. Select "Custom" method
3. ✅ **EXPECT**: "Based On" dropdown fully visible
4. ✅ **EXPECT**: All 3 options accessible
5. ✅ **EXPECT**: Badge text not truncated
6. ✅ **EXPECT**: No horizontal scroll
7. ✅ **EXPECT**: Touch-friendly (tap targets ≥44px)

---

### Scenario G: Browser Compatibility

**Test in**:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

**For each browser**:
1. Select Custom + FCF
2. ✅ **EXPECT**: Dropdown renders correctly
3. ✅ **EXPECT**: IV calculates correctly
4. ✅ **EXPECT**: localStorage persists
5. Refresh page
6. ✅ **EXPECT**: Preference loaded from localStorage

---

### Scenario H: Keyboard Navigation

**Setup**: Focus on method dropdown (Tab key)

**Steps**:
1. Tab to method dropdown
2. Press Enter to open
3. Use Arrow Down to navigate to "Custom"
4. Press Enter to select
5. ✅ **EXPECT**: "Based On" dropdown appears
6. Tab to "Based On" dropdown
7. Press Enter to open
8. Use Arrow Down to navigate options
9. Press Enter to select FCF
10. ✅ **EXPECT**: Badge updates to "Using FCF for DCF calculation"
11. ✅ **EXPECT**: Focus returns to dropdown trigger

---

### Scenario I: Network Latency

**Setup**: DevTools → Network → Throttling → Slow 3G

**Steps**:
1. Select "Custom" method
2. ✅ **EXPECT**: "Based On" dropdown appears instantly (no API call)
3. Select FCF
4. ✅ **EXPECT**: Badge updates instantly (localStorage only)
5. Wait for API response
6. ✅ **EXPECT**: IV populates when data arrives
7. Switch to OCF
8. ✅ **EXPECT**: Badge updates instantly
9. ✅ **EXPECT**: IV updates when new data arrives

**Verify**:
- Badge updates should be **instant** (no network dependency)
- IV updates may take **1-3 seconds** on Slow 3G (expected)

---

### Scenario J: Console Errors Check

**Setup**: DevTools → Console → Clear

**Steps**:
1. Select "Custom" method
2. ✅ **EXPECT**: No errors in console
3. Select FCF
4. ✅ **EXPECT**: No errors in console
5. Switch to OCF
6. ✅ **EXPECT**: No errors in console
7. Refresh page
8. ✅ **EXPECT**: No errors during localStorage load

**Allowed warnings**:
- React hydration warnings (if any) - not critical
- FMP API rate limit warnings - expected behavior

**NOT allowed**:
- TypeScript type errors
- Undefined variable errors
- Failed API calls (500/400 errors)

---

## API Verification

### Endpoint: `/api/iv/:ticker/chart`

**Test with curl**:

```bash
# Test OCF
curl "http://localhost:3001/api/iv/AAPL/chart?based_on=ocf" | jq '.methods[] | select(.method_id == "dcf-20-ocf")'

# Test FCF
curl "http://localhost:3001/api/iv/AAPL/chart?based_on=fcf" | jq '.methods[] | select(.method_id == "dcf-20-fcf")'

# Test NI
curl "http://localhost:3001/api/iv/AAPL/chart?based_on=ni" | jq '.methods[] | select(.method_id == "dcf-20-ni")'
```

**Expected response structure**:
```json
{
  "name": "DCF-20 Free Cash Flow",
  "method_id": "dcf-20-fcf",
  "category": "dcf",
  "iv": 143.61,
  "discount_pct": -20.5,
  "formula": "DCF 20-year with FCF",
  "confidence": "HIGH",
  "source": "internal",
  "inputs": {
    "fcf_ttm_musd": 99584,
    "total_debt_musd": 106620,
    "cash_musd": 29956,
    "discount_rate": 6.27,
    "shares_outstanding_m": 15204.1,
    "growth_rate_1_5": 10.07,
    "growth_rate_6_10": 7.26,
    "growth_rate_11_20": 4.0
  }
}
```

---

## Performance Benchmarks

### Expected Timings:

| Operation | Expected Time | Acceptable Range |
|-----------|---------------|------------------|
| CustomMethodSelector render | <10ms | 0-20ms |
| Dropdown open | <50ms | 0-100ms |
| Selection change | <5ms | 0-10ms |
| localStorage write | <1ms | 0-5ms |
| localStorage read | <1ms | 0-5ms |
| IV recalculation | <100ms | 50-500ms |
| API call (localhost) | <200ms | 100-1000ms |
| API call (production) | <500ms | 200-2000ms |

### Measure with DevTools:

```javascript
// In Console:
console.time('CustomMethodRender');
// Select Custom method
console.timeEnd('CustomMethodRender');

console.time('DropdownChange');
// Change dropdown selection
console.timeEnd('DropdownChange');
```

---

## Regression Tests

Ensure existing features still work:

1. ✅ **Other methods unaffected**
   - Select "AlfaValue™" method
   - ✅ EXPECT: Works as before (no Custom dropdown)

2. ✅ **DCF methods work standalone**
   - Select "DCF-20 Free Cash Flow" (not Custom)
   - ✅ EXPECT: Shows IV without "Based On" dropdown

3. ✅ **"Based On" for DCF methods**
   - Select "DCF-20 Free Cash Flow"
   - ✅ EXPECT: Original "Based On" dropdown appears (for all DCF methods)
   - ✅ EXPECT: Custom dropdown does NOT appear

4. ✅ **Method count badge**
   - Collapsed state: No badge visible
   - Expanded state: Badge shows "15 Methods"

---

## Known Issues / Limitations

1. **Backend dependency**: Requires DCF-20 methods available in API
2. **No preview**: Doesn't show IV preview before selection
3. **No comparison**: Can't see OCF vs FCF vs NI side-by-side
4. **Single selection**: Can't select multiple cash flow types at once

---

## Success Criteria

✅ **All 3 options work** (OCF, FCF, NI)
✅ **IV changes** when switching between options
✅ **localStorage persists** across page reloads
✅ **No console errors** during normal operation
✅ **Mobile responsive** on all screen sizes
✅ **Keyboard accessible** (full navigation support)
✅ **Cross-browser compatible** (Chrome, Firefox, Safari, Edge)
✅ **Performance acceptable** (<100ms for UI updates)
✅ **Graceful degradation** when localStorage fails

---

## Rollback Procedure

If critical issues found:

1. **Quick fix available**: Deploy patch
2. **No quick fix**: Hide Custom method:
   ```typescript
   // In intrinsic-value.tsx, comment out:
   // <SelectGroup>
   //   <SelectLabel>Custom</SelectLabel>
   //   <SelectItem value="custom">Custom (DCF with selectable base)</SelectItem>
   // </SelectGroup>
   ```
3. **Full rollback**: Revert to previous commit:
   ```bash
   git revert HEAD
   npm run build
   npm run deploy
   ```

---

## Contact

**Issues/Questions**: See `ONDA_3_2_CUSTOM_METHOD_IMPLEMENTATION_REPORT.md`
**Component**: `client/src/components/intrinsic-value/custom-method-selector.tsx`
**Integration**: `client/src/pages/intrinsic-value.tsx`

---

**END OF TESTING GUIDE**
