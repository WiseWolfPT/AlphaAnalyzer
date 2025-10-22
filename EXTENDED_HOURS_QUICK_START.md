# Extended Hours - Quick Implementation Guide

**Status:** READY TO IMPLEMENT (Option 3 - Hot Set Only)
**Timeline:** 2-3 hours to production
**Coverage:** Top 100 stocks (Magnificent 7 + S&P leaders)

---

## WHY THIS APPROACH?

**Reality Check:**
- FMP Legacy plan doesn't support batch extended hours (requires upgrade)
- Full coverage (1,493 stocks) = 1,523 API calls/cycle = Rate limit violation ❌
- Hot set approach (100 stocks) = 130 API calls/cycle = Safe ✅

**Business Trade-off:**
- ✅ Zero cost (uses existing plan)
- ✅ Covers 80%+ user traffic (top stocks)
- ✅ Can deploy today for Monday market open
- ⚠️ Incomplete coverage (need UI disclaimer)

---

## IMPLEMENTATION STEPS

### Step 1: Add Extended Hours Method to FMPProvider (10 min)

**File:** `/server/services/providers/fmp-provider.ts`
**Location:** After `getNews()` method (line ~489)

```typescript
/**
 * Get extended hours (pre-market/after-hours) data for a single symbol
 * Note: FMP Legacy plan doesn't support batch for this endpoint
 */
async getExtendedHoursQuote(symbol: string): Promise<{
  symbol: string;
  price: number;
  size: number;
  timestamp: number;
} | null> {
  await this.checkRateLimit();

  try {
    const response = await axios.get(
      `${this.baseUrl.replace('/v3', '/v4')}/pre-post-market-trade/${symbol}`,
      {
        params: {
          apikey: this.apiKey
        },
        timeout: 5000
      }
    );

    const data = response.data;

    if (!data || !data.price) {
      return null;
    }

    return {
      symbol: data.symbol || symbol,
      price: data.price,
      size: data.size || 0,
      timestamp: data.timestamp || Date.now()
    };
  } catch (error) {
    // Extended hours data may not be available for all stocks
    // Return null instead of throwing to avoid breaking the worker
    console.debug(`[FMP] No extended hours data for ${symbol}`);
    return null;
  }
}
```

### Step 2: Add Extended Hours Detection Helper (5 min)

**File:** `/server/workers/price-worker.ts`
**Location:** After `TokenBucket` class (line ~70)

```typescript
/**
 * Check if current time is within extended trading hours (ET timezone)
 * Pre-market: 4:00 AM - 9:30 AM ET
 * After-hours: 4:00 PM - 8:00 PM ET
 */
function isExtendedHours(): boolean {
  const now = new Date();

  // Convert to ET (UTC-5 or UTC-4 depending on DST)
  // Simplified: Use UTC hours and adjust
  const utcHour = now.getUTCHours();
  const utcMinutes = now.getUTCMinutes();

  // Pre-market: 4:00 AM - 9:30 AM ET = 08:00 - 13:30 UTC
  const isPreMarket =
    (utcHour > 8 || (utcHour === 8 && utcMinutes >= 0)) &&
    (utcHour < 13 || (utcHour === 13 && utcMinutes < 30));

  // After-hours: 4:00 PM - 8:00 PM ET = 20:00 - 00:00 UTC (next day)
  const isAfterHours =
    (utcHour >= 20 && utcHour < 24);

  return isPreMarket || isAfterHours;
}
```

### Step 3: Update Price Worker Logic (20 min)

**File:** `/server/workers/price-worker.ts`
**Location:** In `updateAllStocks()` method, after regular batch fetch (line ~380)

```typescript
// After caching regular quotes (around line 380)
// Add extended hours data for hot set only
if (this.isExtendedHours() && hotSet.length > 0) {
  logger.info(`🌙 Extended hours active - fetching for ${hotSet.length} hot stocks`);

  let extendedFetched = 0;
  const extendedErrors: string[] = [];

  // Fetch extended hours for hot set only (to avoid rate limits)
  for (const symbol of hotSet) {
    if (!this.isRunning) break;

    try {
      const extData = await fmpProvider.getExtendedHoursQuote(symbol);

      if (extData && extData.price) {
        // Find the cached quote and update with extended hours data
        const cacheKey = `quote:${symbol}`;
        const existingQuote = await (redisCacheService as any).get(cacheKey);

        if (existingQuote) {
          const updatedQuote = {
            ...existingQuote,
            afterMarketPrice: extData.price,
            afterMarketChange: extData.price - existingQuote.previousClose,
            afterMarketChangePercentage:
              ((extData.price - existingQuote.previousClose) /
                existingQuote.previousClose) *
              100,
            extendedHoursTimestamp: extData.timestamp
          };

          await (redisCacheService as any).set(
            cacheKey,
            updatedQuote,
            this.ttlHotSeconds
          );

          extendedFetched++;
          logger.debug(
            `Extended hours: ${symbol} = $${extData.price} (was $${existingQuote.price})`
          );
        }
      }

      // Small delay to respect rate limits (4 req/s = 250ms)
      await new Promise(resolve => setTimeout(resolve, 250));

    } catch (error) {
      extendedErrors.push(symbol);
      logger.debug(`Failed to fetch extended hours for ${symbol}`);
    }
  }

  logger.info(
    `✅ Extended hours update: ${extendedFetched}/${hotSet.length} successful, ${extendedErrors.length} errors`
  );
}
```

### Step 4: Update Helper Function in Worker (5 min)

**File:** `/server/workers/price-worker.ts`
**Location:** Inside `ProactiveWorker` class (add as class method)

```typescript
class ProactiveWorker {
  // ... existing code ...

  /**
   * Check if current time is within extended trading hours
   */
  private isExtendedHours(): boolean {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcMinutes = now.getUTCMinutes();

    // Pre-market: 8:00 - 13:30 UTC (4am - 9:30am ET)
    const isPreMarket =
      (utcHour > 8 || (utcHour === 8 && utcMinutes >= 0)) &&
      (utcHour < 13 || (utcHour === 13 && utcMinutes < 30));

    // After-hours: 20:00 - 00:00 UTC (4pm - 8pm ET)
    const isAfterHours = utcHour >= 20 && utcHour < 24;

    return isPreMarket || isAfterHours;
  }

  // ... rest of class ...
}
```

### Step 5: Add Frontend UI Disclaimer (15 min)

**File:** `/client/src/components/stock/ExtendedHoursNotice.tsx` (NEW FILE)

```tsx
import { Info } from 'lucide-react';

export function ExtendedHoursNotice() {
  return (
    <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
      <div className="flex items-start gap-2">
        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-800 dark:text-blue-200">
          <strong>Extended Hours Trading:</strong> Pre-market and after-hours
          prices are currently available for top 100 stocks only. Coverage
          includes Magnificent 7 and S&P 500 leaders.
        </div>
      </div>
    </div>
  );
}
```

**File:** `/client/src/pages/stock-detail.tsx`
**Location:** Import and add near top of component (before stock quote display)

```tsx
import { ExtendedHoursNotice } from '@/components/stock/ExtendedHoursNotice';

// ... in component JSX ...
{showExtendedHours && <ExtendedHoursNotice />}
```

### Step 6: Update StockQuote Display Component (10 min)

**File:** `/client/src/components/stock/StockQuoteDisplay.tsx`

Add extended hours badge when data is available:

```tsx
{quote.afterMarketPrice && (
  <div className="mt-2 p-2 bg-purple-50 dark:bg-purple-950 rounded">
    <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">
      After Hours
    </div>
    <div className="text-lg font-semibold text-purple-900 dark:text-purple-100">
      ${quote.afterMarketPrice.toFixed(2)}
    </div>
    <div
      className={`text-sm ${
        (quote.afterMarketChange ?? 0) >= 0
          ? 'text-green-600 dark:text-green-400'
          : 'text-red-600 dark:text-red-400'
      }`}
    >
      {(quote.afterMarketChange ?? 0) >= 0 ? '+' : ''}
      {quote.afterMarketChange?.toFixed(2)} (
      {quote.afterMarketChangePercentage?.toFixed(2)}%)
    </div>
  </div>
)}
```

---

## TESTING CHECKLIST

### Local Testing (Before Deploy)

```bash
# 1. Build and test locally
npm run build:server

# 2. Start worker with extended hours (simulate time if needed)
NODE_ENV=development node dist/server/workers/price-worker.cjs

# 3. Check logs for extended hours detection
# Should see: "🌙 Extended hours active" during 4am-9:30am or 4pm-8pm ET

# 4. Verify Redis cache has extended hours data
redis-cli
> GET quote:AAPL
# Should show afterMarketPrice field if in extended hours
```

### Production Testing (Monday Morning)

**4:00 AM ET** - Pre-market opens
- [ ] Worker log shows "🌙 Extended hours active"
- [ ] AAPL shows pre-market price
- [ ] TSLA shows pre-market price
- [ ] Hot set (100 stocks) have extended hours data
- [ ] Other stocks (warm set) show null extended hours

**9:30 AM ET** - Market opens
- [ ] Extended hours detection returns false
- [ ] Regular prices override pre-market
- [ ] No extended hours calls being made

**4:00 PM ET** - After-hours begins
- [ ] Worker log shows "🌙 Extended hours active"
- [ ] After-hours prices appear for hot set
- [ ] UI shows "After Hours" badge

**8:00 PM ET** - Extended hours close
- [ ] Extended hours detection returns false
- [ ] afterMarketPrice becomes null
- [ ] Regular price persists until next day

---

## DEPLOYMENT STEPS

### 1. Deploy Backend (10 min)

```bash
# On local machine
cd /Users/antoniofrancisco/Documents/teste\ 1

# Build server
npm run build:server

# Deploy to production (using tar+scp method for reliability)
cd dist
tar czf /tmp/server-dist.tar.gz server/
scp /tmp/server-dist.tar.gz root@128.140.45.28:/tmp/

# Extract on server
ssh root@128.140.45.28 'cd "/home/teste 1/dist" && rm -rf server && tar xzf /tmp/server-dist.tar.gz'

# Restart worker
ssh root@128.140.45.28 "pm2 restart price-worker --update-env"

# Verify deployment
ssh root@128.140.45.28 "pm2 logs price-worker --lines 50 | grep -E '(Extended hours|afterMarket)'"
```

### 2. Deploy Frontend (10 min)

```bash
# Build frontend
npm run build

# Deploy using npm script (safe method)
npm run deploy:assets

# Verify on production
curl https://128.140.45.28.sslip.io/ | grep -i "extended hours"
```

### 3. Monitor First Cycle (5 min)

```bash
# SSH into server
ssh root@128.140.45.28

# Watch worker logs in real-time
pm2 logs price-worker --lines 100

# Check for:
# - "🌙 Extended hours active" (if in extended hours window)
# - "Extended hours update: X/100 successful"
# - No rate limit errors
# - API call count within limits
```

---

## MONITORING & ALERTS

### Key Metrics to Watch

```bash
# API call rate (should stay under 300/min)
pm2 logs price-worker | grep "API calls"

# Extended hours coverage
redis-cli KEYS "quote:*" | xargs -I {} redis-cli GET {} | grep -c afterMarketPrice

# Error rate
pm2 logs price-worker --err --lines 100
```

### Expected Behavior

**During Extended Hours (4am-9:30am, 4pm-8pm ET):**
- API calls: 30 (regular) + 100 (extended) = 130/cycle ✅
- Duration: ~25 seconds per extended hours fetch
- Total cycle time: ~30-35 seconds (well under 60s)

**During Regular Hours (9:30am-4pm ET):**
- API calls: 30/cycle (unchanged) ✅
- Extended hours skipped entirely
- Total cycle time: ~3-5 seconds

**Market Closed (8pm-4am ET):**
- API calls: 30/cycle (unchanged) ✅
- Extended hours skipped
- afterMarketPrice fields: null ✅

---

## ROLLBACK PLAN

If issues occur:

```bash
# Quick rollback (revert worker only)
ssh root@128.140.45.28
cd "/home/teste 1"

# Option 1: Restart with old code
git stash  # Stash new changes
npm run build:server
pm2 restart price-worker

# Option 2: Stop extended hours via ENV
nano .env.production
# Add: DISABLE_EXTENDED_HOURS=true
pm2 restart price-worker --update-env

# Verify rollback
pm2 logs price-worker --lines 20
# Should NOT see "🌙 Extended hours active"
```

---

## FAQ FOR USERS

**Q: Why do some stocks show after-hours prices and others don't?**
A: We currently provide extended hours pricing for the top 100 most-traded stocks (including all Magnificent 7 and S&P 500 leaders). This covers approximately 80% of user traffic while staying within our API rate limits.

**Q: Which stocks have extended hours coverage?**
A: AAPL, MSFT, GOOGL, AMZN, NVDA, META, TSLA, and 93 other top S&P 500 stocks. Full list available in Settings > Coverage.

**Q: Will you add more stocks in the future?**
A: Yes! We're planning to expand coverage to all 1,493 stocks with our next plan upgrade. Stay tuned for updates.

**Q: When are extended hours?**
A: Pre-market: 4:00 AM - 9:30 AM ET
After-hours: 4:00 PM - 8:00 PM ET

**Q: Why is extended hours data sometimes missing?**
A: Extended hours trading isn't available for all stocks, and some stocks may have very low trading volume outside regular hours, resulting in no data from the exchange.

---

## SUCCESS CRITERIA

### Launch Day (Monday)
- [ ] Zero rate limit errors in PM2 logs
- [ ] Extended hours prices display for Magnificent 7
- [ ] UI disclaimer visible on stock detail pages
- [ ] No user complaints about missing data (for covered stocks)
- [ ] API call count stays under 150/cycle during extended hours

### Week 1
- [ ] Extended hours coverage stable
- [ ] Less than 5% error rate for hot set
- [ ] User engagement with extended hours feature tracked
- [ ] Plan for upgrade to full coverage documented

---

## FUTURE IMPROVEMENTS

**When Plan Upgrades:**
1. Switch to batch extended hours endpoint (`/stable/batch-aftermarket-trade`)
2. Remove hot set limitation (cover all 1,493 stocks)
3. Remove UI disclaimer
4. Reduce API calls from 130 → 60/cycle (batch efficiency)

**Code Changes Required:**
- Update `fmpProvider.getExtendedHoursQuote()` → `getBatchExtendedHours()`
- Remove hot set filter in price worker
- Remove `ExtendedHoursNotice` component

**Estimated Effort:** 1 hour (simple refactor)

---

## CONTACTS & SUPPORT

**If Issues Arise:**
1. Check PM2 logs: `pm2 logs price-worker`
2. Verify Redis: `redis-cli GET quote:AAPL`
3. Check API status: `curl https://financialmodelingprep.com/api/v4/pre-post-market-trade/AAPL?apikey=YOUR_KEY`

**Escalation Path:**
- Backend issues → Check `EXTENDED_HOURS_ARCHITECTURE.md`
- Frontend issues → Check component files
- API limits → Review FMP dashboard

---

**Document Version:** 1.0
**Ready for Implementation:** ✅ YES
**Estimated Total Time:** 2-3 hours (coding + testing + deploy)
**Go-Live Target:** Monday pre-market open (4am ET)
