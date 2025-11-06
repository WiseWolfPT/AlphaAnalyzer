# Known ETFs - ONDA 4.1

## Overview

Comprehensive list of 140+ known Exchange Traded Funds (ETFs) used for automatic detection in the Alfalyzer system. ETFs are excluded from intrinsic value calculations since they represent baskets of securities without traditional cash flows.

## Statistics

- **Total Known ETFs**: 140+
- **Detection Strategies**: 4
- **ETF Providers**: 16
- **Name Indicators**: 6

## ETF Categories

### 1. US Market Broad (15 ETFs)
Major market index trackers:
- SPY, QQQ, IWM, DIA, VOO, IVV, VTI, VTV, VUG, VEA
- VWO, VXUS, ITOT, SCHB, RSP

### 2. Sector - SPDR (11 ETFs)
Official S&P 500 sector ETFs:
- **Financials**: XLF
- **Energy**: XLE
- **Technology**: XLK
- **Healthcare**: XLV
- **Industrials**: XLI
- **Consumer Staples**: XLP
- **Utilities**: XLU
- **Materials**: XLB
- **Consumer Discretionary**: XLY
- **Real Estate**: XLRE
- **Communication**: XLC

### 3. International (12 ETFs)
Global and emerging markets:
- EFA, EEM, IEFA, IEMG, VEA, VWO, IXUS, VXUS
- SCHF, EWJ, EWZ, FXI

### 4. Fixed Income (15 ETFs)
Bond and treasury ETFs:
- AGG, BND, LQD, HYG, TLT, SHY, IEF, MUB
- VCIT, VCSH, BNDX, EMB, JNK, TIP, GOVT

### 5. Commodities (10 ETFs)
Gold, silver, oil, and agriculture:
- GLD, SLV, USO, IAU, DBC, DBA, UNG, GSG, PDBC, BCI

### 6. Thematic - ARK Invest (5 ETFs)
Innovation and disruption focused:
- ARKK (Innovation)
- ARKG (Genomics)
- ARKW (Web)
- ARKF (Fintech)
- ARKQ (Autonomous Tech)

### 7. Volatility & Leveraged (12 ETFs)
Leveraged and inverse ETFs:
- VXX, UVXY, VIXY, SVXY
- TQQQ, SQQQ, UPRO, SPXU
- TNA, TZA, FAS, FAZ

### 8. Dividend Focused (8 ETFs)
High dividend yield trackers:
- VYM, SCHD, DVY, SDY, VIG, DGRO, SPHD, HDV

### 9. Growth & Value (6 ETFs)
Factor-based strategies:
- IWF, IWD, VUG, VTV, SPYG, SPYV

### 10. Real Estate (4 ETFs)
REIT and real estate focused:
- VNQ, XLRE, IYR, SCHH

### 11. Technology Specific (6 ETFs)
Semiconductor and tech sector:
- XLK, VGT, IGV, QTEC, SOXX, SMH

### 12. European Tickers (10 ETFs)
European exchange-traded funds:
- IWDA.AS, CSPX.L, VWCE.DE, EUNL.DE, VUSA.L
- IUSA.L, VUAA.AS, SWDA.L, SSAC.L, IUAG.DE

### 13. Smart Beta & Factor (8 ETFs)
Factor investing strategies:
- MTUM, USMV, VLUE, SIZE, QUAL, SPHD, SPLV, DGRW

### 14. Crypto & Alternative (4 ETFs)
Cryptocurrency and blockchain:
- BITO, GBTC, ETHE, BLOK

### 15. Emerging & Frontier (5 ETFs)
Emerging markets exposure:
- EEM, VWO, IEMG, EWY, EWT

### 16. Small Cap & Mid Cap (6 ETFs)
Small and mid-cap market coverage:
- IWM, IJH, MDY, VB, VO, SCHA

## Detection Strategies

### Strategy 1: Suffix Detection
Identifies ETFs by ticker suffix:
- `.ETF`, `-ETF`, `.ETP`, `_ETF`

### Strategy 2: Known List Match
Checks against comprehensive list of 140+ popular ETFs.

### Strategy 3: Company Profile Type
Uses API data to verify:
- `type === 'etf'`
- `isEtf === true`
- Fund-related types: "fund", "trust", "closed-end fund", "mutual fund", "index fund"

### Strategy 4: Name Pattern Detection
Combines provider and indicator checks:

**ETF Providers** (16):
- ishares, vanguard, spdr, invesco, proshares
- ark invest, state street, blackrock, wisdomtree
- first trust, global x, direxion, vaneck, schwab, fidelity

**Name Indicators** (6):
- etf, fund, trust, index, tracker, portfolio

## Testing

**Test Suite**: `scripts/test-etf-detection.ts`

**Test Coverage**: 10 test cases (5 ETFs + 5 Stocks)
- SPY, QQQ, XLF, ARKK, GLD (ETFs)
- AAPL, MSFT, GOOGL, JPM, TSLA (Stocks)

**Latest Test Results** (2025-10-24):
- Total Tests: 10
- Passed: 10 ✅
- Failed: 0 ❌
- Success Rate: 100.0%

## API Endpoints

### 1. Classify Single Ticker
```bash
GET /api/diagnostics/classify/:ticker
```

**Example**:
```bash
curl http://localhost:3001/api/diagnostics/classify/SPY
```

**Response**:
```json
{
  "ticker": "SPY",
  "is_etf": true,
  "reason": "Known ETF list (140+ popular ETFs)",
  "can_calculate_iv": false,
  "checks": {
    "suffix_match": false,
    "in_known_list": true,
    "profile_type_etf": true,
    "profile_is_etf_flag": true,
    "name_pattern_match": true
  },
  "company_info": {
    "type": "etf",
    "name": "SPDR S&P 500 ETF Trust",
    "is_etf_flag": true
  }
}
```

### 2. Batch Classification
```bash
POST /api/diagnostics/classify/batch
Content-Type: application/json

{
  "tickers": ["AAPL", "SPY", "MSFT", "QQQ"]
}
```

**Response**:
```json
{
  "count": 4,
  "etf_count": 2,
  "stock_count": 2,
  "results": [...]
}
```

### 3. Detection Statistics
```bash
GET /api/diagnostics/etf-stats
```

**Response**:
```json
{
  "known_etfs_count": 140,
  "providers_count": 16,
  "indicators_count": 6,
  "total_detection_strategies": 4
}
```

### 4. Health Check
```bash
GET /api/diagnostics/health
```

## Integration

### IV Chart Controller
ETF detection is integrated at `/api/iv/:ticker/chart`:

```typescript
// Early return if ETF detected
if (isETF(ticker, companyProfile)) {
  const reason = getETFReason(ticker, companyProfile);
  return res.status(400).json({
    error: 'ETF_NOT_SUPPORTED',
    message: `${ticker} is an ETF. Intrinsic value calculations are only available for individual stocks.`,
    reason,
    suggestion: 'Try analyzing individual stocks within the ETF instead.'
  });
}
```

## Files Created

1. **Core Logic**:
   - `/server/utils/stock-classifier.ts` (4 detection strategies)
   - `/server/data/known-etfs.ts` (140+ ETF list)

2. **API Routes**:
   - `/server/routes/diagnostics.ts` (4 endpoints)

3. **Testing**:
   - `/scripts/test-etf-detection.ts` (10 test cases)

4. **Documentation**:
   - `/docs/KNOWN_ETFS.md` (this file)

## Maintenance

### Adding New ETFs
Update `/server/data/known-etfs.ts`:

```typescript
export const KNOWN_ETFS: string[] = [
  // ... existing ETFs
  'NEW_ETF_TICKER', // Add with category comment
];
```

### Running Tests
```bash
npx tsx scripts/test-etf-detection.ts
```

### Verifying Production
```bash
curl https://128.140.45.28.sslip.io/api/diagnostics/etf-stats
curl https://128.140.45.28.sslip.io/api/diagnostics/classify/SPY
```

## References

- **ONDA 4.1 Spec**: `IMPLEMENTATION_MASTER_PLAN_2025-10-23.md`
- **Alignment Doc**: `ALFALYZER_STOCKORACLE_ALIGNMENT_PLAN.md` Section 6
- **ETF Database**: https://etfdb.com/etfs/

---

**Last Updated**: 2025-10-24
**Implementation**: ONDA 4.1 - Enhanced ETF Detection
**Status**: ✅ Complete (100% test pass rate)
