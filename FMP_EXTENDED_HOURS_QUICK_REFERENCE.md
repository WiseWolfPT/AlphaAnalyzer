# FMP Extended Hours - Quick Reference Guide

## Quick Links
- **Full Report:** `/FMP_LEGACY_INVESTIGATION_REPORT.md`
- **Backend Implementation:** `/server/routes/market-data.ts` (lines 2139-2248)
- **FMP Provider:** `/server/services/providers/fmp-provider.ts` (lines 98-104)
- **Frontend Hook:** `/client/src/hooks/use-extended-hours.ts`

---

## Endpoints You Can Use

### Single Symbol Extended Hours
```bash
curl https://128.140.45.28.sslip.io/api/market-data/extended-hours/AAPL
```

Response:
```json
{
  "preMarket": {
    "price": 150.02,
    "change": -0.08,
    "changePercent": -0.05,
    "volume": 876543,
    "timestamp": "2025-10-18T08:30:00Z"
  },
  "afterHours": {
    "price": 150.65,
    "change": 0.23,
    "changePercent": 0.15,
    "volume": 1234567,
    "timestamp": "2025-10-18T20:15:30Z"
  },
  "isExtendedHours": true,
  "currentSession": "after-hours"
}
```

### Batch Extended Hours
```bash
curl -X POST https://128.140.45.28.sslip.io/api/market-data/extended-hours/batch \
  -H "Content-Type: application/json" \
  -d '{"symbols": ["AAPL", "MSFT", "GOOGL"]}'
```

Response:
```json
{
  "quotes": {
    "AAPL": {
      "symbol": "AAPL",
      "bidPrice": 150.65,
      "askPrice": 150.67,
      "volume": 1234567,
      "timestamp": "2025-10-18T20:15:30Z"
    },
    "MSFT": {
      "symbol": "MSFT",
      "bidPrice": 380.15,
      "askPrice": 380.20,
      "volume": 789012,
      "timestamp": "2025-10-18T20:15:28Z"
    },
    "GOOGL": null
  },
  "_source": "stable_aftermarket"
}
```

---

## FMP Endpoints Used

| Use Case | FMP Endpoint | Method | Batch Support | Rate Limit Impact |
|----------|-------------|--------|---|---|
| After-hours (single) | `/stable/aftermarket-quote` | GET | No | 1 call |
| Pre-market (single) | `/api/v4/pre-market-quote` | GET | No | 1 call |
| After-hours (batch) | `/stable/batch-aftermarket-quote` | GET | Yes (20 max) | 1 call |
| Regular + extended | `/api/v3/quote` | GET | Yes (20 max) | 1 call |

---

## Response Field Names (Raw FMP Response)

### From `/stable/aftermarket-quote`
```json
{
  "symbol": "AAPL",
  "bidPrice": 150.65,
  "askPrice": 150.67,
  "bid": 150.65,
  "ask": 150.67,
  "volume": 1234567,
  "timestamp": "2025-10-18T20:15:30Z"
}
```

### From `/api/v4/pre-market-quote`
```json
{
  "symbol": "AAPL",
  "bid": 150.02,
  "ask": 150.05,
  "volume": 876543,
  "timestamp": "2025-10-18T08:30:00Z"
}
```

### From `/api/v3/quote` (includes extended fields)
```json
{
  "symbol": "AAPL",
  "price": 150.42,
  "afterMarketPrice": 150.65,
  "afterMarketChange": 0.23,
  "afterMarketChangePercentage": 0.15,
  "preMarketPrice": 150.02,
  "preMarketChange": -0.08,
  "preMarketChangePercentage": -0.05
}
```

---

## Rate Limits

```
FMP Starter Plan: 300 requests/minute
Current Implementation: 290 requests/minute (10-call safety buffer)

Extended hours request cost:
- Single symbol: 2 API calls (after + pre in parallel)
- Batch (20 symbols): 1 API call
```

---

## Caching

```typescript
// TTL Strategy
Extended hours (pre-market/after-hours active): 30 seconds
Regular hours: 5 minutes
Cache key format: ext:{SYMBOL}

// Redis is used
// Fallback available if Redis unavailable
```

---

## Session Times (ET - Eastern Time)

```
Pre-market:   04:00 - 09:30 ET (8-13 UTC)
Regular:      09:30 - 16:00 ET (13-20 UTC)
After-hours:  16:00 - 20:00 ET (20-24 UTC)
Closed:       20:00 - 04:00 ET (0-8 UTC)
```

Alfalyzer detects these using UTC times - see lines 2228-2233 of market-data.ts.

---

## Frontend Usage

```typescript
import { useExtendedHours } from '@/hooks/use-extended-hours';

function StockDisplay({ symbol }: { symbol: string }) {
  const { data, isLoading } = useExtendedHours(symbol);
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <div>
      <p>Session: {data?.currentSession}</p>
      {data?.preMarket && <p>Pre-market: ${data.preMarket.price}</p>}
      {data?.afterHours && <p>After-hours: ${data.afterHours.price}</p>}
    </div>
  );
}
```

---

## Common Issues & Fixes

### Issue: After-hours data is null
**Cause:** Stock not trading in extended hours, or FMP has no data  
**Fix:** Display "No data available" gracefully  

### Issue: Slow batch responses
**Cause:** Fetching pre-market individually (not batched on Starter plan)  
**Fix:** Use `/stable/batch-aftermarket-quote` for batch after-hours  

### Issue: 401 Unauthorized
**Cause:** FMP_API_KEY missing or invalid  
**Fix:** Check `.env.production` has valid FMP_API_KEY  

### Issue: High API usage
**Cause:** Refetching too frequently  
**Fix:** Use 30s TTL during extended, 5m during regular hours  

---

## Testing Extended Hours

```bash
# Test single symbol
curl https://128.140.45.28.sslip.io/api/market-data/extended-hours/AAPL

# Test batch
curl -X POST https://128.140.45.28.sslip.io/api/market-data/extended-hours/batch \
  -H "Content-Type: application/json" \
  -d '{"symbols": ["AAPL"]}'

# Check FMP health
curl https://128.140.45.28.sslip.io/api/market-data/health
```

---

## Important Notes

1. **Pre-market batch requests NOT available on Starter plan**
   - Must fetch pre-market individually
   - This is a FMP limitation, not a bug

2. **After-hours volume is estimated**
   - Display with caveat: "Volume (estimated)"
   - Don't rely for trading decisions

3. **Data freshness varies**
   - Extended hours updates less frequently
   - Show last update timestamp to users

4. **Batch maximum: 20 symbols**
   - Split larger requests into batches
   - Each batch = 1 API call

---

## File Quick Reference

| File | Purpose | Key Lines |
|------|---------|-----------|
| `fmp-provider.ts` | FMP provider implementation | 98-104 (after-hours fields) |
| `market-data.ts` | Backend routes | 2139-2248 (extended hours endpoints) |
| `use-extended-hours.ts` | Frontend hook | All |
| `provider-manager.ts` | Provider interface | 21-27 (StockQuote interface) |

---

Last Updated: October 18, 2025
