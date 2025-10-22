# Input Field Mapping Reference - Quick Guide

**Last Updated:** 2025-10-22

---

## Quick Reference: Backend → Frontend Field Mapping

### DCF Methods (9 methods)
**Methods:** AlfaValue™, DCF-20 FCF, DCF-20 FCFE, DCF Terminal FCF, DCF Terminal FCFE, DNI-20, DFCF-20, DFCF Terminal

| Frontend Field | Backend API Fields (Priority Order) | Example Value (AAPL) |
|---------------|-------------------------------------|---------------------|
| **Operating CF** | `fcf_ttm_musd` → `net_income_ttm_musd` → `operating_cf` | 108,807 |
| **Total Debt** | `total_debt_musd` → `debt_musd` | 119,059 |
| **Cash** | `cash_musd` → `cash` | 65,171 |
| **Discount Rate** | `discount_rate` × 100 | 9.47% |
| **Shares** | `shares_outstanding_m` → `shares_m` | 15,408 |
| **Growth 1-5** | `growth_rate_y1_5` × 100 → `stage1_growth_rate` × 100 | 10.35% |
| **Growth 6-10** | `growth_rate_y6_10` × 100 → `stage2_growth_rate` × 100 | 7.11% |
| **Growth 11-20** | `growth_rate_y11_20` × 100 → `terminal_growth_rate` × 100 | 4.93% |

**Checkboxes:**
- ✅ Deduct Debt: Enabled (default: true)
- ✅ Add Cash: Enabled (default: true)

---

### Growth Methods (2 methods)
**Methods:** PEG Ratio, PSG Ratio

| Frontend Field | Backend API Fields | PEG Example (AAPL) | PSG Example |
|---------------|-------------------|-------------------|-------------|
| **Operating CF** | `last_price` | 260.31 | 260.31 |
| **Total Debt** | `eps_without_nri` (PEG) / `sales_per_share` (PSG) | 6.66 | 27.34 |
| **Cash** | `pe_without_nri` (PEG) / `ps_ratio` (PSG) | 39.08 | 9.52 |
| **Discount Rate** | `fair_peg_ratio` (PEG) / `fair_psg_ratio` (PSG) | 1.5 | 0.2 |
| **Shares** | `shares_m` (from AlfaValue fallback) | 15,408 | 15,408 |
| **Growth 1-5** | `growth_rate` × 100 | 10.35% | 5.47% |
| **Growth 6-10** | 0 (not used) | 0 | 0 |
| **Growth 11-20** | 0 (not used) | 0 | 0 |

**Checkboxes:**
- ❌ Deduct Debt: Disabled (default: false)
- ❌ Add Cash: Disabled (default: false)

**Semantic Notes:**
- "Operating CF" = Last traded price (not cash flow)
- "Total Debt" = EPS or Sales per share (not debt)
- "Cash" = Current P/E or P/S ratio (not cash)
- "Discount Rate" = Fair PEG/PSG ratio benchmark

---

### Multiples Methods (6 methods)
**Methods:** P/E Mean, P/E Median, P/S Mean, P/S Median, P/B Mean, P/B Median (all with/without NRI variants)

| Frontend Field | Backend API Fields | P/E Mean Example (AAPL) |
|---------------|-------------------|------------------------|
| **Operating CF** | `current_price` | 262.77 |
| **Total Debt** | `mean_pe_ratio_5y` / `median_pe_ratio_5y` / `mean_ps_ratio_5y` / etc. | 30.22 |
| **Cash** | `eps_ttm` / `sales_per_share_ttm` / `book_value_per_share_ttm` | 6.61 |
| **Discount Rate** | 0 (not used) | 0 |
| **Shares** | `shares_m` (from AlfaValue fallback) | 15,408 |
| **Growth 1-5** | 0 (not used) | 0 |
| **Growth 6-10** | 0 (not used) | 0 |
| **Growth 11-20** | 0 (not used) | 0 |

**Checkboxes:**
- ❌ Deduct Debt: Disabled (default: false)
- ❌ Add Cash: Disabled (default: false)

**Semantic Notes:**
- "Operating CF" = Current market price (not cash flow)
- "Total Debt" = Historical P/E, P/S, or P/B ratio (not debt)
- "Cash" = EPS, Sales, or Book Value per share (not cash)
- Growth rates and discount rate not applicable to multiples

---

## Category Detection Logic

```typescript
function getMethodCategory(methodName: string): 'dcf' | 'multiples' | 'growth' {
  const name = methodName.toLowerCase();

  // DCF: Contains 'alfavalue', 'dcf', 'dni', or 'dfcf'
  if (name.includes('alfavalue') || name.includes('dcf') ||
      name.includes('dni') || name.includes('dfcf')) {
    return 'dcf';
  }

  // Growth: Contains 'peg' or 'psg'
  if (name.includes('peg') || name.includes('psg')) {
    return 'growth';
  }

  // Multiples: Everything else (P/E, P/S, P/B)
  return 'multiples';
}
```

---

## Field Fallback Priority

### Operating CF Field
```typescript
// DCF
methodInputs.fcf_ttm_musd ||
methodInputs.net_income_ttm_musd ||
methodInputs.operating_cf ||
alfaValueData.inputs?.fcf_ttm_musd || 0

// Growth
methodInputs.last_price || price

// Multiples
methodInputs.current_price || price
```

### Total Debt Field
```typescript
// DCF
methodInputs.total_debt_musd ||
methodInputs.debt_musd ||
alfaValueData.inputs?.debt_musd || 0

// Growth (PEG)
methodInputs.eps_without_nri || methodInputs.sales_per_share || 0

// Multiples
methodInputs.mean_pe_ratio_5y ||
methodInputs.median_pe_ratio_5y ||
methodInputs.mean_ps_ratio_5y ||
methodInputs.median_ps_ratio_5y ||
methodInputs.mean_pb_ratio_5y ||
methodInputs.median_pb_ratio_5y || 0
```

### Cash Field
```typescript
// DCF
methodInputs.cash_musd ||
methodInputs.cash ||
alfaValueData.inputs?.cash_musd || 0

// Growth (PEG)
methodInputs.pe_without_nri || methodInputs.ps_ratio || 0

// Multiples
methodInputs.eps_ttm ||
methodInputs.sales_per_share_ttm ||
methodInputs.book_value_per_share_ttm || 0
```

---

## Testing Checklist

### Manual Test Cases

**Test 1: DCF → Growth Transition**
1. Navigate to `/intrinsic-value?symbol=AAPL`
2. Click "Show All Methods"
3. Select "AlfaValue™"
   - ✅ Operating CF = 108,807
   - ✅ Total Debt = 119,059
   - ✅ Cash = 65,171
   - ✅ Growth 1-5 = 10.35%
4. Switch dropdown to "PEG Ratio"
   - ✅ Operating CF = 260.31 (last_price)
   - ✅ Total Debt = 6.66 (eps_without_nri)
   - ✅ Cash = 39.08 (pe_without_nri)
   - ✅ Growth 1-5 = 10.35% (growth_rate)

**Test 2: Growth → Multiples Transition**
1. Keep "PEG Ratio" selected
   - ✅ Operating CF = 260.31
   - ✅ Total Debt = 6.66
2. Switch dropdown to "P/E Mean 5Y"
   - ✅ Operating CF = 262.77 (current_price)
   - ✅ Total Debt = 30.22 (mean_pe_ratio_5y)
   - ✅ Cash = 6.61 (eps_ttm)
   - ✅ Growth rates = 0

**Test 3: Multiples → DCF Transition**
1. Keep "P/E Mean 5Y" selected
   - ✅ Operating CF = 262.77
   - ✅ Total Debt = 30.22
2. Switch dropdown to "DCF-20 FCF"
   - ✅ Operating CF = 108,807 (fcf_ttm_musd)
   - ✅ Total Debt = 119,059 (total_debt_musd)
   - ✅ Cash = 65,171 (cash_musd)
   - ✅ Growth rates restored

### Console Log Validation
Expected logs in browser console:
```
[DEBUG] useEffect methodInputs for alfavalue (category: dcf): { fcf_ttm_musd: 108807, ... }
[DEBUG] useEffect methodInputs for peg (category: growth): { last_price: 260.31, ... }
[DEBUG] useEffect methodInputs for pe-mean (category: multiples): { current_price: 262.77, ... }
```

---

## Troubleshooting

### Issue: Fields remain empty after dropdown selection
**Cause:** Backend API returned `null` for `autoMethod.inputs`
**Solution:** Check fallback to `alfaValueData.inputs` is working
**Verify:** Console log shows `methodInputs` object is populated

### Issue: Wrong values displayed (e.g., PEG showing FCF instead of last_price)
**Cause:** Category detection failed or conditional mapping not applied
**Solution:** Check `getMethodCategory()` returns correct category
**Verify:** Console log shows correct category ('dcf' | 'growth' | 'multiples')

### Issue: Growth rates show 0 for DCF methods
**Cause:** Field names mismatch (e.g., `g_1_5` vs `growth_rate_y1_5`)
**Solution:** Add missing fallback in conditional mapping
**Verify:** Check backend response field names match expected structure

---

## Future Enhancements

### Priority 1: Dynamic Field Labels
Replace generic labels with category-specific labels:

| Category | Operating CF Label | Total Debt Label | Cash Label |
|----------|-------------------|-----------------|-----------|
| DCF | "Operating CF (millions)" | "Total Debt (millions)" | "Cash & ST Inv (millions)" |
| Growth | "Last Price (USD)" | "EPS / Sales per Share" | "P/E / P/S Ratio" |
| Multiples | "Current Price (USD)" | "Historical Ratio (5Y)" | "Per-Share Metric" |

### Priority 2: Conditional Field Visibility
Hide unused fields per category:
- Growth: Hide Growth 6-10, Growth 11-20
- Multiples: Hide Growth 1-5, Growth 6-10, Growth 11-20, Discount Rate
- All non-DCF: Hide Deduct/Add checkboxes

### Priority 3: Enhanced Tooltips
Add Info icons with explanations:
- PEG: "Fair PEG Ratio: Conservative investors use 1.5, aggressive use 1.0"
- P/E Mean: "Historical P/E Mean: Average ratio over last 5 years"
- DCF: "Discount Rate: WACC calculated via CAPM (RF + β × MRP)"

---

**Last Updated:** 2025-10-22
**Implementation Status:** ✅ COMPLETE
**Production Ready:** ✅ YES
