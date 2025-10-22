# FASE 3 Quick Reference Guide

## 🚀 Quick Start

### Test Endpoints Locally
```bash
# Start server
npm run dev

# Test IV Chart endpoint
curl http://localhost:3001/api/iv/AAPL/chart | jq

# Test with different base metrics
curl http://localhost:3001/api/iv/AAPL/chart?based_on=ocf | jq
curl http://localhost:3001/api/iv/AAPL/chart?based_on=ni | jq

# Test Macro Multiplier
curl http://localhost:3001/api/macro/multiplier | jq

# Run test script
./scripts/test-fase3-endpoints.sh
```

---

## 📊 10+ Valuation Methods

### 1. Proprietary (1)
- **AlfaValue™** - Our multi-stage DCF with dynamic growth rates

### 2. DCF External (4)
- **DCF-20 FCF FMP** - Standard free cash flow projection
- **DCF-20 FCFE FMP** - Levered (debt-adjusted) projection
- **DCF Terminal FCF FMP** - Terminal value with Gordon Growth
- **DCF Terminal FCFE FMP** - Levered terminal value

### 3. Multiples (3)
- **P/E Mean 5y** - Mean Price/Earnings ratio 2020-2024
- **P/S Mean 5y** - Mean Price/Sales ratio 2020-2024
- **P/B Mean 5y** - Mean Price/Book ratio 2020-2024

### 4. Growth-Adjusted (2)
- **PEG Ratio** - Price/Earnings to Growth (Fair PEG = 1.5)
- **PSG Ratio** - Price/Sales to Growth (Fair PSG = 0.2)

---

## 🌍 Macro Multiplier

### Sentiment Calculation
```
yieldSlope = US10Y - US2Y
ffrYoY = FFR_current - FFR_1y_ago

BEARISH (0.97): yieldSlope < 0 && ffrYoY > 0.5%
BULLISH (1.03): yieldSlope > 1.0% && ffrYoY < -0.5%
NEUTRAL (1.00): Everything else
```

### Applied To
ALL intrinsic values are automatically adjusted by the macro multiplier

---

## 🎯 GAP #3: "Based On" Selector

### Supported Base Metrics
1. **FCF (Free Cash Flow)** - Default, most conservative
   - Formula: `Operating Cash Flow - CapEx`
   - Best for: Capital-intensive businesses

2. **OCF (Operating Cash Flow)** - Higher value, ignores CapEx
   - Formula: `Cash from Operations`
   - Best for: Service businesses with low CapEx

3. **NI (Net Income)** - Accounting-based
   - Formula: `Net Income from Income Statement`
   - Best for: Consistent earners with low non-cash items

### Usage
```http
GET /api/iv/AAPL/chart?based_on=fcf  # Default
GET /api/iv/AAPL/chart?based_on=ocf  # Operating cash flow
GET /api/iv/AAPL/chart?based_on=ni   # Net income
```

---

## 🗄️ Cache Keys Reference

| Service | Key Pattern | TTL |
|---------|------------|-----|
| FMP DCF FCF | `fmp:dcf:fcf:{TICKER}` | 24h |
| FMP DCF FCFE | `fmp:dcf:fcfe:{TICKER}` | 24h |
| FMP DCF Term FCF | `fmp:dcf:term_fcf:{TICKER}` | 24h |
| FMP DCF Term FCFE | `fmp:dcf:term_fcfe:{TICKER}` | 24h |
| P/E Mean | `iv:calc:{TICKER}:pe_mean` | 24h |
| P/S Mean | `iv:calc:{TICKER}:ps_mean` | 24h |
| P/B Mean | `iv:calc:{TICKER}:pb_mean` | 24h |
| PEG | `iv:calc:{TICKER}:peg` | 24h |
| PSG | `iv:calc:{TICKER}:psg` | 24h |
| Base Metric FCF | `iv:calc:{TICKER}:base_fcf` | 24h |
| Base Metric OCF | `iv:calc:{TICKER}:base_ocf` | 24h |
| Base Metric NI | `iv:calc:{TICKER}:base_ni` | 24h |
| Macro Multiplier | `macro:multiplier:{REGION}` | 6h |
| Treasury Yields | `macro:treasury:{REGION}` | 6h |
| Fed Funds | `macro:fed_funds:{REGION}` | 6h |

---

## 🔍 Monitoring & Debugging

### Check Cache Status
```typescript
// Redis CLI
redis-cli GET "iv:calc:AAPL:pe_mean"
redis-cli GET "macro:multiplier:US"
redis-cli KEYS "fmp:dcf:*"
```

### View Logs
```bash
# Check API calls
grep "FMP-DCF" logs/server.log
grep "MacroService" logs/server.log
grep "IVChart" logs/server.log

# Check divergence warnings
grep "DIVERGENCE WARNING" logs/server.log

# Check performance
grep "cache hit" logs/server.log
```

### Common Issues

#### 1. No Methods Returned
**Cause:** FMP API key invalid or rate limited
**Fix:** Check `FMP_API_KEY` in `.env`

#### 2. Divergence Warnings
**Cause:** >10% difference between internal and external DCF
**Fix:** Normal variation, review assumptions if consistent

#### 3. Macro Multiplier Stuck at 1.00
**Cause:** Treasury/Fed Funds data unavailable
**Fix:** Falls back to neutral, check FMP API status

---

## 📈 Performance Benchmarks

### Response Times (Expected)
- **First Call (uncached):** 2-3 seconds
  - 10 parallel API calls to FMP
  - Redis cache writes

- **Cached Call:** <100ms
  - All data from Redis
  - No external API calls

### API Call Reduction
- **Before FASE 3:** ~20 calls/request (sequential)
- **After FASE 3:** ~10-15 calls/request (parallel, cached)
- **Cache Hit Rate:** ~95% (after warm-up)

---

## 🧪 Testing Checklist

### Manual Testing
```bash
# 1. Test each base metric
curl localhost:3001/api/iv/AAPL/chart?based_on=fcf
curl localhost:3001/api/iv/AAPL/chart?based_on=ocf
curl localhost:3001/api/iv/AAPL/chart?based_on=ni

# 2. Test different tickers
for ticker in AAPL MSFT GOOGL TSLA; do
  echo "Testing $ticker..."
  curl -s localhost:3001/api/iv/$ticker/chart | jq '.methods | length'
done

# 3. Test macro endpoint
curl localhost:3001/api/macro/multiplier

# 4. Verify all 10 methods present
curl localhost:3001/api/iv/AAPL/chart | jq '.methods[] | .name'

# 5. Check macro adjustment applied
curl localhost:3001/api/iv/AAPL/chart | jq '{multiplier: .macro_multiplier, sentiment: .macro_sentiment}'
```

### Automated Testing
```bash
# Run test script
./scripts/test-fase3-endpoints.sh

# Run with custom ticker
TICKER=TSLA ./scripts/test-fase3-endpoints.sh

# Run against production
API_URL=https://alfalyzer.com ./scripts/test-fase3-endpoints.sh
```

---

## 🔧 Configuration

### Environment Variables
```bash
# Required
FMP_API_KEY=<your_key>

# Optional (defaults shown)
G_1_5_FLOOR=0.00              # Min growth rate y1-5
G_6_10_USE_WEIGHTS=false      # Use weighted g6-10
G_11_20_CLAMP_MODE=dynamic    # Terminal growth clamp
```

---

## 📚 Code Examples

### Frontend Integration
```typescript
// Fetch IV chart data
const response = await fetch(`/api/iv/AAPL/chart?based_on=fcf`);
const data: IVChartResponse = await response.json();

// Display methods
data.methods.forEach(method => {
  console.log(`${method.name}: $${method.iv?.toFixed(2)} (${method.discount_pct?.toFixed(1)}%)`);
});

// Show macro sentiment
console.log(`Macro: ${data.macro_sentiment} (${data.macro_multiplier}x)`);
```

### Backend Usage
```typescript
import { fmpDCFService } from '@/server/services/fmp-dcf';
import { macroService } from '@/server/services/macro-service';
import { valuationService } from '@/server/services/valuation-service';

// Get external DCF
const dcf = await fmpDCFService.getDCF_FCF_EXT('AAPL');

// Get macro multiplier
const macro = await macroService.getMacroMultiplier('US');

// Get base metric for custom DCF
const baseMetric = await valuationService.getBaseMetricForDCF('AAPL', 'ocf');
```

---

## 🎯 Next Steps

### Immediate (Testing)
1. Write unit tests for all services
2. Integration tests for IV chart endpoint
3. Load testing for performance validation

### Frontend (FASE 3 UI)
1. Create `ValuationMethodsChart` component
2. Create `ValuationGauge` component
3. Add "Based On" selector dropdown
4. Integrate with `/intrinsic-value` page

### Future Enhancements
1. **GAP #1:** Median variants (P/E, P/S, P/B)
2. **GAP #2:** "Without NRI" toggle (optional)
3. Export to PDF/Excel functionality
4. Historical IV tracking charts

---

## 📞 Support & Troubleshooting

### Getting Help
1. Check logs: `grep "FMP-DCF\|MacroService\|IVChart" logs/server.log`
2. Review cache: `redis-cli KEYS "iv:calc:*"`
3. Test endpoints: `./scripts/test-fase3-endpoints.sh`
4. Check documentation: `FASE3_BACKEND_IMPLEMENTATION_SUMMARY.md`

### Common Solutions
- **Empty methods array:** Check FMP API key validity
- **Stale data:** Clear cache with `redis-cli FLUSHDB`
- **Slow responses:** Verify Redis is running
- **Missing methods:** Check individual method logs for errors

---

**Last Updated:** 2025-10-20
**Version:** FASE 3.0
**Status:** ✅ READY FOR TESTING
