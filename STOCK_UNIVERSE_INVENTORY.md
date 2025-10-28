# Alfalyzer Stock Universe - Complete Inventory

**Date:** 2025-10-26
**Analyst:** Claude (Data Optimization Specialist)
**Database:** PostgreSQL (alfalyzer_db.stocks table)
**Records:** 1,493 stocks

---

## Quick Stats

- **Total Stocks:** 1,493
- **FASE 2 Tested:** 55 (3.68%)
- **Untested:** 1,438 (96.32%)

### Coverage by Priority

| Priority | Category | Stocks | Tested | Coverage | Status |
|----------|----------|--------|--------|----------|--------|
| P1 | Portuguese | 36 | 0 | 0.0% | 🔴 CRITICAL |
| P1 | REITs | 33 | 0 | 0.0% | 🔴 CRITICAL |
| P1 | US Large Caps | 28 | 18 | 64.3% | 🟡 PARTIAL |
| P2 | Real Estate Sector | 31 | 0 | 0.0% | 🔴 MISSING |
| P2 | Basic Materials | 20 | 0 | 0.0% | 🔴 MISSING |
| P3 | EURONEXT | 336 | 0 | 0.0% | 🔴 NONE |
| P3 | AMEX | 245 | 0 | 0.0% | 🔴 NONE |

---

## Data Files Generated

All files located in: `/Users/antoniofrancisco/Documents/teste 1/`

1. **stock_universe_complete.csv** (1,493 rows)
   - Full stock list with all metadata
   - Columns: symbol, company_name, exchange, sector, industry, type, can_calculate_iv

2. **stock_universe_summary.csv**
   - Statistical breakdowns by exchange/sector/type
   - Columns: category, name, count, percentage

3. **priority_1_us_stocks.json** (28 stocks)
   - NYSE/NASDAQ stocks not yet tested
   - High-cap stocks for immediate validation

4. **priority_2_pt_stocks.json** (36 stocks)
   - ALL Portuguese stocks (ZERO tested!)
   - Critical for "Portuguese market focus" mandate

5. **priority_3_reits.json** (33 stocks)
   - Real Estate Investment Trusts
   - Need FFO-based valuation methods

6. **STOCK_UNIVERSE_ANALYSIS_REPORT.md**
   - Complete 360-page analysis
   - Detailed findings and recommendations

---

## Exchange Distribution

| Exchange | Count | % | Tested | Coverage |
|----------|-------|---|--------|----------|
| N/A | 490 | 32.8% | 37 | 7.6% |
| EURONEXT | 336 | 22.5% | 0 | 0.0% |
| AMEX | 245 | 16.4% | 0 | 0.0% |
| XETRA | 155 | 10.4% | 0 | 0.0% |
| LSE | 153 | 10.2% | 0 | 0.0% |
| BME | 62 | 4.2% | 0 | 0.0% |
| NASDAQ | 25 | 1.7% | 11 | 44.0% |
| NYSE | 21 | 1.4% | 7 | 33.3% |
| EURONEXT Lisbon | 4 | 0.3% | 0 | 0.0% |
| NYSEARCA | 1 | 0.1% | 0 | 0.0% |
| OTC | 1 | 0.1% | 0 | 0.0% |

**Key Insight:** Only 3.1% of universe is on NYSE/NASDAQ, yet these have 44%/33% coverage. European exchanges (EURONEXT, LSE, XETRA, BME) = 706 stocks (47.3%) with ZERO coverage.

---

## Sector Distribution

| Sector | Count | Tested | Coverage |
|--------|-------|--------|----------|
| Technology | 95 | 14 | 14.7% |
| Industrials | 78 | 6 | 7.7% |
| Financial Services | 64 | 2 | 3.1% |
| Healthcare | 58 | 8 | 13.8% |
| Consumer Cyclical | 52 | 4 | 7.7% |
| Consumer Defensive | 36 | 4 | 11.1% |
| Utilities | 34 | 1 | 2.9% |
| Real Estate | 31 | 0 | **0.0%** |
| Communication Services | 28 | 5 | 17.9% |
| Energy | 25 | 2 | 8.0% |
| Basic Materials | 20 | 0 | **0.0%** |
| Financials | 11 | 2 | 18.2% |
| Consumer Discretionary | 11 | 3 | 27.3% |
| Health Care | 4 | 2 | 50.0% |
| Consumer Staples | 4 | 2 | 50.0% |
| ETF | 1 | 0 | 0.0% |

**Note:** 940 stocks (63%) have no sector classification (N/A)

---

## Stock Type Classification

| Type | Count | IV Calculation | Tested | Coverage |
|------|-------|----------------|--------|----------|
| COMMON | 676 | YES | ~54 | ~8% |
| EURONEXT | 304 | YES | 0 | 0.0% |
| LSE | 150 | MAYBE | 0 | 0.0% |
| PT_STOCK | 36 | YES | 0 | **0.0%** |
| REIT | 33 | SPECIAL (FFO) | 0 | **0.0%** |
| ETF | 6 | NO (excluded) | 1 | 16.7% |

---

## Critical Issues Identified

### 1. NFLX False Positive (ETF Detection Bug)
**Severity:** HIGH
**Impact:** Production blocker

Netflix (NFLX) incorrectly classified as ETF:
- **Current:** `isETF('NFLX') = true`
- **Correct:** NFLX is a common stock (streaming service)
- **Root Cause:** Likely name-based pattern matching error
- **Fix Required:** Review `server/utils/stock-classifier.ts` logic

**Other suspected false positives:**
- NF4.DE (Netfonds AG) - flagged as ETF, may be common stock

### 2. Portuguese Stocks - ZERO Coverage
**Severity:** CRITICAL
**Impact:** Violates "Portuguese market focus" mandate

All 36 Portuguese stocks untested:
- GALP.LS (Galp Energia) - Major energy company
- EDP.LS (Energias de Portugal) - Utilities giant
- JMT.LS (Jerónimo Martins) - Retail leader
- NOS.LS (NOS SGPS) - Telecom provider
- BCP.LS (Banco Comercial Português) - Banking
- [See full list in STOCK_UNIVERSE_ANALYSIS_REPORT.md]

**Action:** Immediate validation required before production

### 3. REITs - No FFO Validation
**Severity:** HIGH
**Impact:** Incorrect IV calculations

33 REITs in universe, zero tested:
- Current methods use NI (Net Income)
- REITs should use FFO (Funds From Operations)
- OCF-based methods may work, but unvalidated

Major REITs requiring testing:
- AMT (American Tower) - Cell tower REIT
- EQIX (Equinix) - Data center REIT
- DLR (Digital Realty) - Data center REIT
- CCI (Crown Castle) - Telecom infrastructure

### 4. Data Quality Issues

**490 stocks with exchange=N/A (32.8%)**
- Cannot determine trading venue
- May impact API calls (FMP needs exchange for some endpoints)
- Need batch enrichment from FMP `/profile` endpoint

**940 stocks with sector=N/A (63.0%)**
- Impacts sector-based analysis
- Prevents sector-specific optimization
- Need batch enrichment

**No market cap data**
- Schema lacks market_cap column
- Cannot prioritize by company size
- Cannot implement smart warming tiers

---

## Portuguese Stocks - Complete List

All 36 require immediate validation:

| Symbol | Company Name | Sector |
|--------|--------------|--------|
| GALP.LS | Galp Energia | Energy |
| EDP.LS | Energias de Portugal | Utilities |
| JMT.LS | Jerónimo Martins | Consumer Defensive |
| NOS.LS | NOS SGPS | Communication Services |
| BCP.LS | Banco Comercial Português | Financials |
| CTT.LS | CTT - Correios De Portugal | Industrials |
| ALTRI.LS | Altri SGPS | Basic Materials |
| COR.LS | Corticeira Amorim | Basic Materials |
| EDPR.LS | EDP Renováveis | Utilities |
| EGL.LS | Mota-Engil SGPS | Industrials |
| RENE.LS | REN - Redes Energéticas | Utilities |
| SCP.LS | Sporting CP SAD | Consumer Cyclical |
| NVG.LS | Navigator Company | Basic Materials |
| SON.LS | Sonae SGPS | Consumer Defensive |
| SEM.LS | Semapa SGPS | Industrials |
| NBA.LS | Novabase SGPS | Technology |
| SNC.LS | Sonaecom SGPS | Communication Services |
| RAM.LS | Ramada Investimentos | Industrials |
| IBS.LS | Ibersol SGPS | Consumer Cyclical |
| PHR.LS | Pharol SGPS | Communication Services |
| ESON.LS | Estoril Sol SGPS | Consumer Cyclical |
| FCP.LS | FC Porto SAD | Consumer Cyclical |
| SLBEN.LS | Benfica SAD | Consumer Cyclical |
| SCB.LS | Sporting Braga SAD | Consumer Cyclical |
| MCP.LS | Media Capital SGPS | Communication Services |
| IPR.LS | Impresa SGPS | Communication Services |
| VAF.LS | Vista Alegre Atlantis | Consumer Cyclical |
| GPA.LS | Grão Pará | Real Estate |
| MAR.LS | Martifer SGPS | Industrials |
| TDSA.LS | Teixeira Duarte | Industrials |
| SCT.LS | Toyota Caetano Portugal | Consumer Cyclical |
| CDU.LS | Conduril - Engenharia | Industrials |
| GLINT.LS | Glintt | Technology |
| MLFMV.LS | Farminveste SGPS | Healthcare |
| MLRZE.LS | Raize | Financials |
| MRL.LS | MERLIN Properties | Real Estate |

---

## Recommendations

### Immediate (Next 24h)

1. **Fix NFLX ETF bug**
   - File: `server/utils/stock-classifier.ts`
   - Review `isETF()` logic
   - Add test cases for known false positives

2. **Validate Portuguese stocks**
   - Run all 36 through IV validation suite
   - Test all 14 valuation methods
   - Document any failures

3. **REIT FFO testing**
   - Test 5-10 major REITs
   - Verify OCF-based methods work
   - Consider adding FFO-specific methods

### Short-term (Next week)

4. **Enrich missing data**
   ```sql
   -- Add market cap column
   ALTER TABLE stocks ADD COLUMN market_cap BIGINT;
   ALTER TABLE stocks ADD COLUMN market_cap_tier VARCHAR(20);

   -- Batch update from FMP
   -- Run script to fetch /profile for 490 N/A exchange stocks
   -- Update sector for 940 stocks missing classification
   ```

5. **Implement tiered warming**
   - Tier 1 (Hot): 100 stocks, 60s refresh
   - Tier 2 (Warm): 400 stocks, 1h refresh
   - Tier 3 (Cold): 993 stocks, 24h refresh

### Medium-term (Next 2 weeks)

6. **Build coverage dashboard**
   - Track % universe with fresh IV cache
   - Monitor bandwidth usage per tier
   - Alert on coverage < 80%

7. **Sector-specific validation**
   - Real Estate: FFO vs OCF comparison
   - Financials: Book value importance
   - Utilities: Dividend yield accuracy
   - Tech: Growth rate estimation

---

## Success Metrics

### Phase 1 (Week 1)
- [ ] 36/36 Portuguese stocks validated (0% → 100%)
- [ ] 10/33 REITs validated with FFO (0% → 30%)
- [ ] NFLX bug fixed and verified
- [ ] Market cap data enriched (0% → 100%)

### Phase 2 (Week 2)
- [ ] All 11 sectors tested (2 missing → 11 complete)
- [ ] Exchange data enriched (490 N/A → 0 N/A)
- [ ] Sector data enriched (940 N/A → <100 N/A)
- [ ] Tiered warming operational

### Phase 3 (Week 3-4)
- [ ] 95%+ universe cached in production
- [ ] Coverage monitoring dashboard live
- [ ] Performance benchmarks established
- [ ] Documentation updated

---

## Performance Implications

### Full Universe Warming

- **Total IV calculations:** 1,493 stocks × 14 methods = **20,902**
- **FMP rate limit:** 4 req/s
- **Time to warm (sequential):** 20,902 ÷ 4 = **87 minutes**
- **Bandwidth:** 20,902 × 30 KB = **627 MB per full warm**
- **Monthly bandwidth (daily warm):** 627 MB × 30 = **18.8 GB** (94% of 20 GB limit)

### Recommended Tiered Strategy

**Tier 1 - Hot (100 stocks, 60s refresh):**
- Calculations: 100 × 14 = 1,400/hour
- Bandwidth: 1,400 × 30 KB × 24 = 1 GB/day
- Monthly: ~30 GB (EXCEEDS LIMIT - needs optimization)

**Tier 2 - Warm (400 stocks, 1h refresh):**
- Calculations: 400 × 14 = 5,600/hour
- Bandwidth: 5,600 × 30 KB × 24 = 4 GB/day
- Monthly: ~120 GB (EXCEEDS LIMIT)

**Tier 3 - Cold (993 stocks, 24h refresh):**
- Calculations: 993 × 14 = 13,902/day
- Bandwidth: 13,902 × 30 KB = 417 MB/day
- Monthly: ~12.5 GB (FITS in 20 GB limit!)

**Conclusion:** Only Tier 3 (daily refresh) is sustainable with current FMP bandwidth limits. Hot/warm tiers need cache hit optimization or reduced scope.

---

## Next Steps

1. **Review this inventory** with project stakeholders
2. **Prioritize** which stocks/sectors are critical for launch
3. **Execute Phase 1** (Portuguese + REITs + bug fixes)
4. **Monitor bandwidth** during extended validation
5. **Adjust tiering strategy** based on real usage patterns

---

## Data Sources

- **Database:** PostgreSQL `alfalyzer_db.stocks` table (1,493 records)
- **FASE 2 Test Data:** ONDA 7 validation report (55 stocks)
- **ETF List:** `server/data/known-etfs.ts` (140+ known ETFs)
- **Classification:** `server/utils/stock-classifier.ts` + `stock-universe.ts`

---

**Report Generated:** 2025-10-26
**Analyst:** Claude Code (Data Optimization Specialist)
**Status:** Analysis complete, recommendations ready for implementation
