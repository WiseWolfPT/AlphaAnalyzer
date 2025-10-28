# Critical Bug Fix Guide - IV API Failure
**Priority:** 🔴 P0 - Production Down
**Date:** 2025-10-27
**Issue:** `/api/iv/{symbol}/main` returns 500 errors for all stocks

---

## Quick Diagnosis

### Symptom
Intrinsic Value page shows: *"Unable to calculate intrinsic value. Data may be unavailable for AAPL"*

### Root Cause
Backend `/api/iv/AAPL/main` fails with:
```json
{
  "error": "Failed to calculate AlfaValue for AAPL: No profile data found for AAPL",
  "code": "VALUATION_ERROR"
}
```

### Why It's Failing
Supporting endpoint `/api/cache/fundamentals/AAPL` returns incomplete data:
```json
{
  "data": {
    "symbol": "AAPL"  // ❌ Missing all profile fields!
  }
}
```

Expected: Full company profile with ~30 fields (sector, industry, marketCap, price, etc.)

---

## Immediate Actions

### Step 1: Verify FMP API Status (2 minutes)

```bash
# SSH to production server
ssh root@128.140.45.28

# Check FMP API key
cd "/home/teste 1"
grep FMP_API_KEY .env.production

# Test FMP profile endpoint directly
curl "https://financialmodelingprep.com/api/v3/profile/AAPL?apikey=YOUR_KEY_HERE"
```

**Expected response:** Full JSON with all profile fields
**If empty/error:** FMP API key invalid or quota exceeded

### Step 2: Check Server Logs (2 minutes)

```bash
# Check IV controller logs
pm2 logs alfalyzer --lines 100 | grep "AAPL\|profile\|VALUATION_ERROR"

# Check for FMP API errors
pm2 logs alfalyzer --lines 100 | grep "FMP\|financialmodeling"
```

Look for:
- FMP API rate limit errors (403 Forbidden)
- FMP API authentication errors (401 Unauthorized)
- FMP API timeout errors
- JSON parsing errors

### Step 3: Clear Corrupted Cache (1 minute)

```bash
# Connect to Redis
redis-cli -a alfalyzer2025redis

# Clear AAPL cache entries
DEL cache:fundamentals:AAPL
DEL cache:quotes:AAPL
DEL cache:profile:AAPL

# Verify cleared
GET cache:fundamentals:AAPL
# Should return: (nil)

exit
```

### Step 4: Test API Manually (2 minutes)

```bash
# Test fundamentals endpoint
curl -i "https://128.140.45.28.sslip.io/api/cache/fundamentals/AAPL"

# Test IV endpoint
curl -i "https://128.140.45.28.sslip.io/api/iv/AAPL/main"
```

**Expected:** 200 OK with full data
**If still failing:** Backend code bug, proceed to Step 5

---

## Backend Code Investigation

### Files to Check

1. **`server/controllers/iv-controller.ts`** - Main IV calculation logic
   - Look for profile data retrieval
   - Check error: "No profile data found"

2. **`server/services/simple-cache-service.ts`** - Cache layer
   - Check `getCompanyProfile()` or similar method
   - Validate FMP response parsing

3. **`server/services/fmp-service.ts`** - FMP API integration
   - Check `/profile/{symbol}` endpoint call
   - Validate response schema mapping

### Common Bugs to Check

#### Bug 1: FMP Response Schema Changed
```typescript
// ❌ Old code (might be broken)
const profile = fmpResponse[0]; // FMP changed from array to object?

// ✅ Fix
const profile = Array.isArray(fmpResponse) ? fmpResponse[0] : fmpResponse;
```

#### Bug 2: Missing Error Handling
```typescript
// ❌ Old code (fails silently)
const profile = await fmpService.getProfile(symbol);
if (!profile) {
  return null; // Returns only {symbol} instead of throwing
}

// ✅ Fix
const profile = await fmpService.getProfile(symbol);
if (!profile || Object.keys(profile).length === 1) {
  throw new Error(`Failed to fetch profile data for ${symbol} from FMP`);
}
```

#### Bug 3: Cache Serving Null Data
```typescript
// ❌ Old code (caches null)
const cached = await redis.get(`cache:fundamentals:${symbol}`);
if (cached) return JSON.parse(cached); // Returns {data:null}

// ✅ Fix
const cached = await redis.get(`cache:fundamentals:${symbol}`);
if (cached) {
  const parsed = JSON.parse(cached);
  if (!parsed.data || parsed.data === null) {
    // Cache corrupted, refetch
    await redis.del(`cache:fundamentals:${symbol}`);
  } else {
    return parsed;
  }
}
```

---

## Quick Fix Template

### If FMP API Key Invalid

```bash
# Update .env.production
nano .env.production

# Replace FMP_API_KEY with valid key
FMP_API_KEY=your_valid_key_here

# Restart server
pm2 restart alfalyzer --update-env
pm2 save
```

### If Cache Corrupted

```bash
# Clear all IV-related cache
redis-cli -a alfalyzer2025redis <<EOF
KEYS cache:fundamentals:*
KEYS cache:quotes:*
KEYS cache:profile:*
FLUSHDB
EOF

# Restart server
pm2 restart alfalyzer
```

### If Backend Code Bug

```bash
# Make code changes locally
# Test locally first:
npm run dev

# Build and deploy
npm run build:server
npm run deploy:server

# Validate fix
curl "https://128.140.45.28.sslip.io/api/iv/AAPL/main"
```

---

## Validation Checklist

After applying fix, validate these endpoints:

### ✅ Fundamentals Endpoint
```bash
curl "https://128.140.45.28.sslip.io/api/cache/fundamentals/AAPL" | jq .
```

**Expected:** JSON with 20+ fields:
- `symbol`, `companyName`, `sector`, `industry`
- `marketCap`, `price`, `beta`, `volAvg`
- `exchange`, `country`, `isEtf`, etc.

**NOT:** `{"data":{"symbol":"AAPL"}}`

### ✅ Quotes Endpoint
```bash
curl "https://128.140.45.28.sslip.io/api/cache/quotes/AAPL" | jq .
```

**Expected:** `"data": {...}` with price, change, volume, etc.
**NOT:** `"data": null`

### ✅ IV Main Endpoint
```bash
curl "https://128.140.45.28.sslip.io/api/iv/AAPL/main" | jq .
```

**Expected:** 200 OK with:
```json
{
  "symbol": "AAPL",
  "intrinsicValue": 165.23,
  "currentPrice": 175.43,
  "upside": -5.8,
  "methods": [
    {"id": "dcf-fcf", "value": 170.45, "confidence": 80},
    {"id": "pe-terminal", "value": 160.12, "confidence": 60},
    ...
  ],
  "failedMethods": [
    {"id": "dcf-dividends", "reason": "Insufficient dividend history"}
  ]
}
```

**NOT:** `{"error":"...", "code":"VALUATION_ERROR"}`

### ✅ Frontend UI
1. Navigate to https://128.140.45.28.sslip.io/intrinsic-value
2. Search "AAPL"
3. Should show:
   - Current Price: **$175.43** (not $0.00)
   - Intrinsic Value: **$165.23** (not N/A)
   - Methods dropdown with **12 methods** (not empty)

---

## Monitoring Setup (Post-Fix)

### Add Alerts for Future Failures

```bash
# Add to monitoring script
# scripts/monitoring/check-iv-health.sh

#!/bin/bash
SYMBOLS=("AAPL" "MSFT" "GOOGL")

for symbol in "${SYMBOLS[@]}"; do
  response=$(curl -s "https://128.140.45.28.sslip.io/api/iv/$symbol/main")
  if echo "$response" | grep -q "VALUATION_ERROR"; then
    echo "🔴 CRITICAL: IV API failed for $symbol"
    # Send Slack/Discord alert
  fi
done
```

### Add to Cron

```bash
# Run every 15 minutes
crontab -e

# Add:
*/15 * * * * /path/to/scripts/monitoring/check-iv-health.sh >> /var/log/alfalyzer/iv-health.log 2>&1
```

---

## Escalation Path

### If Fix Doesn't Work After 30 Minutes

1. **Check FMP Dashboard:** https://financialmodelingprep.com/developer/docs/dashboard
   - Verify API quota remaining
   - Check for service incidents

2. **Try Alternative Symbol:**
   ```bash
   curl "https://financialmodelingprep.com/api/v3/profile/MSFT?apikey=YOUR_KEY"
   ```
   - If MSFT works but AAPL doesn't → Symbol-specific issue
   - If both fail → FMP API issue

3. **Check FMP Status Page:** https://status.financialmodelingprep.com/
   - Look for ongoing incidents

4. **Contact FMP Support:** support@financialmodelingprep.com
   - Include: API key, timestamp, symbol, error message

---

## Prevention Measures

### Add Circuit Breaker

```typescript
// server/services/fmp-service.ts

class FMPCircuitBreaker {
  private failures = 0;
  private lastFailure = 0;
  private readonly threshold = 5;
  private readonly timeout = 60000; // 1 minute

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.isOpen()) {
      throw new Error('FMP API circuit breaker OPEN');
    }

    try {
      const result = await fn();
      this.reset();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private isOpen(): boolean {
    if (this.failures >= this.threshold) {
      const elapsed = Date.now() - this.lastFailure;
      return elapsed < this.timeout;
    }
    return false;
  }

  private recordFailure(): void {
    this.failures++;
    this.lastFailure = Date.now();
  }

  private reset(): void {
    this.failures = 0;
  }
}
```

### Add Defensive Parsing

```typescript
// server/services/simple-cache-service.ts

async getCompanyProfile(symbol: string): Promise<CompanyProfile> {
  const fmpResponse = await this.fmpService.getProfile(symbol);

  // Defensive validation
  if (!fmpResponse) {
    throw new Error(`FMP returned null for ${symbol}`);
  }

  const profile = Array.isArray(fmpResponse) ? fmpResponse[0] : fmpResponse;

  // Ensure minimum required fields
  const requiredFields = ['symbol', 'companyName', 'sector', 'marketCap'];
  const missing = requiredFields.filter(field => !profile[field]);

  if (missing.length > 0) {
    throw new Error(`FMP profile missing required fields for ${symbol}: ${missing.join(', ')}`);
  }

  return profile;
}
```

---

## Success Criteria

Fix is complete when:

1. ✅ `/api/iv/AAPL/main` returns 200 OK
2. ✅ `/api/cache/fundamentals/AAPL` returns full profile (20+ fields)
3. ✅ `/api/cache/quotes/AAPL` returns real price (not null)
4. ✅ Frontend shows AAPL price as $175.43 (not $0.00)
5. ✅ Frontend shows AAPL IV as $165.23 (not N/A)
6. ✅ Method dropdown displays 12 methods (not empty)
7. ✅ No 500 errors in console
8. ✅ Test with 3 other symbols (MSFT, GOOGL, TSLA) - all working

---

## Timeline Estimate

- **Quick fix (FMP key/cache):** 10 minutes
- **Code bug fix:** 30-60 minutes
- **Testing & validation:** 15 minutes
- **Total:** 1-1.5 hours

---

**Last Updated:** 2025-10-27 12:35 UTC
**Status:** 🔴 Awaiting fix implementation
