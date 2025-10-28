# IV Calculation - Quick Fix Reference Card

**Use this for immediate troubleshooting and fixes**

---

## 🚨 CRITICAL FIXES (Deploy This Week)

### Fix 1: FCFE Methods (4-6 hours)

**Symptom:** DCF FCFE methods always return `null`

**Quick Test:**
```bash
# Check endpoint directly
curl "https://financialmodelingprep.com/api/v4/advanced_levered_discounted_cash_flow?symbol=AAPL&apikey=YOUR_KEY"
# Returns: [] (empty) - BROKEN
```

**Location:** `server/services/fmp-dcf.ts:214-282`

**Quick Fix (Fallback to FCF):**
```typescript
async getDCF_FCFE_EXT(ticker: string): Promise<ExternalDCFResponse | null> {
  // Try v4 endpoint
  const data = await fmpGet(`/api/v4/advanced_levered_discounted_cash_flow`, { symbol: ticker });

  // ✅ QUICK FIX: Fallback to FCF if v4 fails
  if (!data || (Array.isArray(data) && data.length === 0)) {
    logger.warn(`FCFE endpoint failed for ${ticker}, falling back to FCF`);
    const fcfResult = await this.getDCF_FCF_EXT(ticker);
    if (fcfResult) {
      fcfResult.method = 'DCF_FCFE';
      fcfResult.confidence = 'LOW';  // Downgrade since using proxy
    }
    return fcfResult;
  }

  // ... rest of logic
}
```

**Better Fix (Manual Calculation - 30 min more):**
```typescript
// Calculate FCFE = FCF + Net Debt Issuance
const fcf = cashFlow[0].freeCashFlow;
const debtChange = balanceSheet[0].totalDebt - balanceSheet[1].totalDebt;
const fcfe = fcf + debtChange;
// Use fcfe instead of relying on FMP endpoint
```

---

### Fix 2: Nginx Timeout (5 minutes)

**Symptom:** 504 Gateway Timeout for Utilities stocks

**Quick Test:**
```bash
# Test slow stock
curl -w "@curl-format.txt" "https://128.140.45.28.sslip.io/api/iv/DUK/chart"
# If >60s → timeout
```

**Location:** `/etc/nginx/sites-available/alfalyzer`

**Fix:**
```bash
# SSH to server
ssh root@128.140.45.28

# Edit nginx config
sudo nano /etc/nginx/sites-available/alfalyzer

# Find location /api/ block
# Change:
proxy_read_timeout 60s;
# To:
proxy_read_timeout 90s;
proxy_connect_timeout 90s;
proxy_send_timeout 90s;

# Reload nginx
sudo nginx -t  # Test config
sudo systemctl reload nginx

# Verify
curl -w "@curl-format.txt" "https://128.140.45.28.sslip.io/api/iv/DUK/chart"
```

---

### Fix 3: Failed Methods Field (2 hours)

**Symptom:** Users don't know why methods are missing

**Location:** `server/controllers/iv-chart-controller.ts:168-176`

**Current Code:**
```typescript
const results = await Promise.allSettled(
  methodIds.map(id => methodCacheService.warmMethod(ticker, id))
);

// Just filters out failures silently
const methods: ValuationMethod[] = [];
addMethod(alfaValue, 'AlfaValue™', ...);
// ... (failures ignored)
```

**Fix:**
```typescript
const results = await Promise.allSettled(
  methodIds.map(id => methodCacheService.warmMethod(ticker, id))
);

// ✅ NEW: Track failures
const failedMethods: FailedMethod[] = [];

results.forEach((result, idx) => {
  if (result.status === 'rejected') {
    failedMethods.push({
      id: methodIds[idx],
      reason: result.reason?.message || 'Unknown error',
      details: result.reason?.stack || null
    });
  }
});

// Return in response
const response: IVChartResponse = {
  ticker,
  price,
  methods,
  failedMethods,  // ✅ NEW FIELD
  macro_multiplier,
  macro_sentiment,
  as_of: new Date().toISOString().split('T')[0],
};
```

**Type Definition:**
```typescript
// server/types/valuation.ts
export interface FailedMethod {
  id: MethodId;
  reason: string;
  details?: string | null;
}

export interface IVChartResponse {
  ticker: string;
  price: number;
  methods: ValuationMethod[];
  failedMethods?: FailedMethod[];  // ✅ NEW FIELD
  macro_multiplier: number;
  macro_sentiment: string;
  as_of: string;
}
```

---

## ⚠️ HIGH PRIORITY (Next Sprint)

### Fix 4: NRI Methods Misleading (6-8 hours)

**Symptom:** "without NRI" methods return same values as normal methods

**Location:** `server/services/valuation-service.ts:1613`

**Problem:**
```typescript
// ❌ Claims to exclude NRI but doesn't
async calculatePEMeanWithoutNRI(ticker: string) {
  // Uses same P/E ratios as normal method
  const pbRatios = keyMetrics.map(item => item.peRatio);  // No adjustment!
  // ...
  return { excludeNRI: true };  // FALSE CLAIM
}
```

**Fix:**
```typescript
async calculatePEMeanWithoutNRI(ticker: string) {
  // 1. Get special items (NRI)
  const income = await fmpGet(`/api/v3/income-statement/${ticker}`, { limit: 5 });

  // 2. Calculate adjusted EPS for each year
  const adjustedPE: number[] = [];
  for (let i = 0; i < income.length; i++) {
    const nri = income[i].specialItems || income[i].extraordinaryItems || 0;
    const epsAdjusted = (income[i].netIncome - nri) / shares;
    const peAdjusted = income[i].price / epsAdjusted;
    adjustedPE.push(peAdjusted);
  }

  // 3. Calculate mean of adjusted P/E
  const meanPE_adjusted = adjustedPE.reduce((a,b) => a+b) / adjustedPE.length;

  // 4. Apply to current adjusted EPS
  const currentNRI = income[0].specialItems || 0;
  const currentEPSAdjusted = (income[0].netIncome - currentNRI) / shares;
  const iv = meanPE_adjusted * currentEPSAdjusted;

  return { iv, excludeNRI: true };  // NOW TRUE
}
```

---

### Fix 5: REIT Detection & FFO (4-6 hours)

**Symptom:** REITs crash with 502 error

**Location:** `server/services/valuation-service.ts:1137-1217`

**Problem:**
```typescript
const eps = keyMetrics[0].netIncomePerShareTTM;  // ← 0 for REITs
const peRatio = price / eps;  // ← Infinity
const iv = peRatio * growth;  // ← NaN
```

**Fix:**
```typescript
import { isREIT } from '../utils/stock-classifier';

async calculatePEG(ticker: string): Promise<PEGValuationResponse | null> {
  // 1. Get profile
  const profile = await getCompanyProfile(ticker);

  // 2. Detect REITs
  if (isREIT(ticker, profile)) {
    logger.info(`${ticker} is a REIT, using dividend discount model`);
    return await this.calculateREITDividendModel(ticker);
  }

  // 3. Normal PEG calculation for non-REITs
  const eps = keyMetrics[0].netIncomePerShareTTM;
  // ... rest of code
}

async calculateREITDividendModel(ticker: string) {
  // Use Gordon Growth Model for REITs
  const profile = await fmpGet(`/api/v3/profile/${ticker}`);
  const dividendYield = profile[0].dividendYield / 100;  // Convert to decimal
  const currentDividend = profile[0].lastDividend;
  const dividendGrowth = 0.03;  // 3% assumption (or calculate from history)

  // IV = D1 / (r - g)
  const requiredReturn = 0.10;  // 10% for REITs (typical)
  const nextDividend = currentDividend * (1 + dividendGrowth);
  const iv = nextDividend / (requiredReturn - dividendGrowth);

  return {
    ticker,
    iv,
    currentPrice: profile[0].price,
    method: 'REIT-DDM',
    confidence: 'MED',
    as_of: new Date().toISOString().split('T')[0]
  };
}
```

---

## 🔍 DEBUGGING COMMANDS

### Test Individual Method
```bash
# Test single method via cache service
curl "https://128.140.45.28.sslip.io/api/iv/AAPL/chart?based_on=fcf" | jq '.methods[] | select(.method_id == "dcf-fcfe-20")'
```

### Check FMP API Response
```bash
# Test FCFE endpoint
curl "https://financialmodelingprep.com/api/v4/advanced_levered_discounted_cash_flow?symbol=AAPL&apikey=YOUR_KEY" | jq .

# Test FCF endpoint (should work)
curl "https://financialmodelingprep.com/api/v3/discounted-cash-flow/AAPL?apikey=YOUR_KEY" | jq .
```

### Monitor Backend Logs
```bash
# SSH to server
ssh root@128.140.45.28

# Watch live logs
pm2 logs alfalyzer --lines 50 | grep "ValuationService\|FMP-DCF"

# Check for errors
pm2 logs alfalyzer --err --lines 100
```

### Check Cache Hit Rate
```bash
# Check Redis cache
ssh root@128.140.45.28
redis-cli

> KEYS iv:method:AAPL:*
> GET iv:method:AAPL:dcf-fcfe-20
> TTL iv:method:AAPL:dcf-fcfe-20
```

### Test Specific Stock Types
```bash
# Utilities (slow, should timeout)
curl -w "\nTime: %{time_total}s\n" "https://128.140.45.28.sslip.io/api/iv/DUK/chart"

# REIT (should crash)
curl -w "\nStatus: %{http_code}\n" "https://128.140.45.28.sslip.io/api/iv/VNQ/chart"

# Normal stock (should work)
curl -w "\nStatus: %{http_code}\n" "https://128.140.45.28.sslip.io/api/iv/AAPL/chart"
```

---

## 📊 VALIDATION CHECKLIST

After each fix, run this validation:

**1. Test All 14 Methods (AAPL)**
```bash
curl "https://128.140.45.28.sslip.io/api/iv/AAPL/chart" | jq '.methods | length'
# Should return: 12-14 (depending on which fixes deployed)
```

**2. Check Failed Methods Field**
```bash
curl "https://128.140.45.28.sslip.io/api/iv/AAPL/chart" | jq '.failedMethods'
# Should return: [] or [{ id, reason }]
```

**3. Verify No 502/504 Errors**
```bash
# Utilities
curl -w "%{http_code}" "https://128.140.45.28.sslip.io/api/iv/DUK/chart"
# Should return: 200 (not 504)

# REITs
curl -w "%{http_code}" "https://128.140.45.28.sslip.io/api/iv/O/chart"
# Should return: 200 (not 502)
```

**4. Test FCFE Methods**
```bash
curl "https://128.140.45.28.sslip.io/api/iv/AAPL/chart" | jq '.methods[] | select(.method_id == "dcf-fcfe-20")'
# Should return: method object (not null)
```

**5. Verify Response Time**
```bash
curl -w "\nTime: %{time_total}s\n" "https://128.140.45.28.sslip.io/api/iv/AAPL/chart"
# Should return: <5s (cached) or <90s (cold)
```

---

## 🎯 SUCCESS CRITERIA

**Before Fixes:**
- [ ] 10/14 methods working
- [ ] FCFE methods always fail
- [ ] Utilities timeout
- [ ] REITs crash
- [ ] No user feedback on failures

**After P0 (This Week):**
- [x] 12/14 methods working (FCFE fixed)
- [x] Utilities load within 90s
- [x] Users see `failedMethods` with reasons
- [ ] REITs still crash (pending P1)
- [ ] NRI methods still misleading (pending P1)

**After P1 (Next Sprint):**
- [x] 14/14 methods working
- [x] REITs use dividend discount model
- [x] NRI methods actually adjust for special items
- [x] Zero 502/504 errors
- [x] 100% user transparency

---

## 📞 EMERGENCY ROLLBACK

If production breaks after deployment:

```bash
# 1. SSH to server
ssh root@128.140.45.28

# 2. Revert git commit
cd "/home/teste 1"
git log --oneline -5  # Find last good commit
git revert HEAD --no-edit

# 3. Rebuild and restart
npm run build:server
pm2 restart alfalyzer --update-env

# 4. Revert nginx timeout (if changed)
sudo nano /etc/nginx/sites-available/alfalyzer
# Change back to: proxy_read_timeout 60s;
sudo systemctl reload nginx

# 5. Verify rollback
curl -w "%{http_code}" "https://128.140.45.28.sslip.io/api/iv/AAPL/chart"
```

---

**Created:** 2025-10-26
**Owner:** Backend Architecture Team
**Full Report:** `IV_CALCULATION_DATA_GAPS_ANALYSIS.md`
