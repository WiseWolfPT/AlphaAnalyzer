# Alfalyzer Stock Universe Analysis Report
**Generated:** 2025-10-26  
**Analyst:** Claude (Data Optimization Specialist)  
**Scope:** Complete inventory and coverage analysis

---

## Executive Summary

### Universe Statistics
- **Total Stocks:** 1,493
- **FASE 2 Coverage:** 55 stocks (3.68%)
- **Coverage Gap:** 1,438 stocks (96.32%)

### Critical Findings

1. **Massive Coverage Gap** - Only 3.68% of universe tested
2. **Zero Portuguese Coverage** - 0/36 Portuguese stocks validated
3. **Zero REIT Coverage** - 0/33 REITs tested (need special FFO handling)
4. **Limited Exchange Coverage** - Only NYSE/NASDAQ significantly tested

---

## Universe Composition

### By Exchange
| Exchange | Count | % of Total | Tested | Coverage |
|----------|-------|------------|--------|----------|
| N/A | 490 | 32.8% | 37 | 7.6% |
| EURONEXT | 336 | 22.5% | 0 | 0.0% |
| AMEX | 245 | 16.4% | 0 | 0.0% |
| XETRA | 155 | 10.4% | 0 | 0.0% |
| LSE | 153 | 10.2% | 0 | 0.0% |
| BME | 62 | 4.2% | 0 | 0.0% |
| NASDAQ | 25 | 1.7% | 11 | 44.0% |
| NYSE | 21 | 1.4% | 7 | 33.3% |
| EURONEXT Lisbon | 4 | 0.3% | 0 | 0.0% |

**Key Insight:** NASDAQ/NYSE have good coverage (44%/33%), but represent only 3% of total universe.

### By Sector (Stocks with sector data)
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

**Critical Gap:** Real Estate (0%) and Basic Materials (0%) completely untested.

### By Stock Type
| Type | Count | Can Calculate IV | Tested | Coverage |
|------|-------|------------------|--------|----------|
| Common Stocks | 676+ | YES | 54 | ~8% |
| Portuguese Stocks | 36 | YES | 0 | **0.0%** |
| REITs | 33 | SPECIAL (FFO) | 0 | **0.0%** |
| LSE Stocks | 150 | MAYBE | 0 | 0.0% |
| EURONEXT Stocks | 304 | YES | 0 | 0.0% |
| ETFs | 6 | NO (excluded) | 1 | 16.7% |
| Other | 288 | VARIES | 0 | 0.0% |

---

## Special Cases Requiring Attention

### 1. Portuguese Stocks (36 stocks - ZERO tested)
**Priority:** HIGH  
**Reason:** Core market focus per CLAUDE.md

Top Portuguese stocks to validate:
- GALP.LS - Galp Energia (Energy major)
- EDP.LS - Energias de Portugal (Utilities)
- JMT.LS - Jerónimo Martins (Consumer Defensive)
- NOS.LS - NOS SGPS (Communication Services)
- BCP.LS - Banco Comercial Português (Financials)
- CTT.LS - CTT Correios De Portugal (Industrials)

**Action Required:** Immediate validation of all 36 Portuguese stocks

### 2. REITs (33 stocks - ZERO tested)
**Priority:** HIGH  
**Reason:** Need special FFO-based valuation methods

Known REITs requiring FFO handling:
- AMT - American Tower
- EQIX - Equinix
- DLR - Digital Realty
- CCI - Crown Castle
- ARE - Alexandria Real Estate
- AVB - AvalonBay Communities
- EQR - Equity Residential
- VTR - Ventas
- WELL - Welltower
- MAA - Mid-America Apartments

**Technical Challenge:** Current IV methods use earnings (NI). REITs use FFO (Funds From Operations).

### 3. ETFs (6 detected)
**Status:** Correctly excluded (ETFs have no intrinsic value)

Detected ETFs:
- BCOR - Grayscale Bitcoin Adopters ETF
- ELON - Battleshares TSLA vs F ETF
- FLAG - Global X S&P 500 Leaders ETF
- IWM - iShares Russell 2000 ETF
- NF4.DE - Netfonds AG (may be misclassified)
- NFLX - Netflix Inc. (FALSE POSITIVE - not an ETF!)

**Action Required:** Review ETF detection logic - NFLX incorrectly flagged as ETF.

### 4. Utilities Sector (34 stocks - 1 tested = 2.9%)
**Priority:** MEDIUM  
**Reason:** Dividend-heavy stocks, may have slow IV calculations

Sample utilities:
- NEE - NextEra Energy (tested)
- DUK - Duke Energy (untested)
- SO - Southern Company (untested)
- D - Dominion Energy (untested)

### 5. Financials (64 Financial Services + 11 Financials = 75 total)
**Priority:** MEDIUM  
**Coverage:** 4/75 = 5.3%  
**Reason:** Book value more important than earnings for banks

Sample untested:
- C - Citigroup
- WFC - Wells Fargo
- BLK - BlackRock
- SCHW - Charles Schwab

---

## Priority Testing Tiers

### Tier 1: Critical (97 stocks)
**Must test before production deployment**

1. **Portuguese Stocks** (36) - Core market focus
2. **US Large Caps** (28) - High-volume stocks
3. **REITs** (33) - Need FFO handling verification

**Estimated Testing Time:** 
- Automated: ~20 minutes (97 stocks × 14 methods = 1,358 IV calculations)
- Manual validation: 2-3 hours

### Tier 2: Important (33 stocks)
**Test after Tier 1, before full rollout**

1. **High-sector representation**
   - Real Estate: 31 stocks (0% tested)
   - Basic Materials: 20 stocks (0% tested)
   - Utilities: 33 stocks (2.9% tested)

**Estimated Testing Time:** 1 hour

### Tier 3: Extended Coverage (1,308 stocks)
**Test progressively during production operation**

1. **EURONEXT** (336 stocks)
2. **AMEX** (245 stocks)
3. **XETRA** (155 stocks)
4. **LSE** (153 stocks)
5. **BME** (62 stocks)
6. **Others** (357 stocks)

**Estimated Testing Time:** 8-12 hours (can run overnight)

---

## Technical Considerations

### Data Quality Issues

1. **490 stocks have N/A exchange** (32.8% of universe)
   - May indicate data import issues
   - Need to cross-reference with FMP API

2. **Sector data missing for ~940 stocks**
   - Only 553 stocks have sector classification
   - Impacts sector-based optimization strategies

3. **No market cap data in schema**
   - Current schema lacks market_cap column
   - Cannot prioritize by company size

### IV Calculation Constraints

**Methods requiring special handling:**
1. **DDM (Dividend Discount)** - Fails for non-dividend stocks
2. **Graham Formula** - Needs earnings growth rate
3. **PB Method** - Requires book value (important for financials)
4. **PE Method** - Fails for loss-making companies
5. **FFO Methods (REITs)** - Need custom implementation

**Stocks likely to fail IV:**
- Loss-making companies (negative earnings)
- Non-dividend payers (DDM won't work)
- Pre-revenue biotechs
- Special purpose acquisition companies (SPACs)

### Performance Implications

**Current warming strategy:**
- 1,493 stocks × 14 methods = **20,902 IV calculations**
- At 4 req/s FMP rate limit = **87 minutes** to warm entire universe
- Bandwidth: ~20,902 × 30 KB = **627 MB per full warm**

**Recommendation:** Implement tiered warming
1. Hot tier: Top 100 US stocks (refresh every 60s)
2. Warm tier: Portuguese + REITs + Top 500 (refresh every 1h)
3. Cold tier: Rest of universe (refresh every 24h)

---

## Data Files Generated

All files available in `/tmp/`:

1. **stock_universe_analysis.json** (1,493 records)
   - Complete stock list with classification
   - Fields: symbol, company_name, exchange, sector, industry, type, can_calculate_iv

2. **priority_1_us_stocks.json** (28 stocks)
   - NYSE/NASDAQ untested stocks
   - High priority for validation

3. **priority_2_pt_stocks.json** (36 stocks)
   - All Portuguese stocks (EURONEXT Lisbon)
   - ZERO tested - immediate action required

4. **priority_3_reits.json** (33 stocks)
   - Real Estate Investment Trusts
   - Need FFO-based valuation

---

## Recommendations

### Immediate Actions (Next 24 hours)

1. **Fix NFLX false positive** in ETF detection
   - NFLX is a common stock, not an ETF
   - Review `isETF()` logic in `stock-classifier.ts`

2. **Validate all 36 Portuguese stocks**
   - Critical for "Portuguese market focus" mandate
   - Test all 14 IV methods on each

3. **Test REIT FFO handling**
   - Create test suite for 5-10 major REITs
   - Verify OCF-based methods work correctly

### Short-term Actions (Next week)

4. **Add market cap data to schema**
   ```sql
   ALTER TABLE stocks ADD COLUMN market_cap BIGINT;
   ALTER TABLE stocks ADD COLUMN market_cap_tier VARCHAR(20); -- 'Large', 'Mid', 'Small'
   ```

5. **Enrich sector data**
   - 940 stocks missing sector classification
   - Batch fetch from FMP `/profile` endpoint

6. **Fix exchange=N/A stocks** (490 stocks)
   - Query FMP for correct exchange
   - Update PostgreSQL records

### Medium-term Actions (Next 2 weeks)

7. **Implement tiered warming strategy**
   - Hot tier: 100 stocks (60s refresh)
   - Warm tier: 400 stocks (1h refresh)
   - Cold tier: 993 stocks (24h refresh)

8. **Create sector-specific validation tests**
   - Real Estate: Test FFO methods
   - Financials: Verify book value importance
   - Utilities: Check dividend yield calculations
   - Tech: Verify growth rate estimations

9. **Build coverage monitoring dashboard**
   - Track % of universe with fresh IV cache
   - Alert when coverage drops below 80%

---

## Success Criteria

### Phase 1: Critical Coverage (Target: 1 week)
- ✅ 100% Portuguese stocks validated (36/36)
- ✅ 100% Tier 1 REITs validated (10/33)
- ✅ 80%+ US large caps validated (23/28)

### Phase 2: Extended Coverage (Target: 2 weeks)
- ✅ 90%+ sector coverage (all 11 sectors tested)
- ✅ 50%+ exchange coverage (major exchanges)
- ✅ Market cap data enriched (1,493/1,493)

### Phase 3: Full Universe (Target: 1 month)
- ✅ 95%+ universe cached in production
- ✅ Tiered warming operational
- ✅ Coverage monitoring dashboard live

---

## Appendix: Portuguese Stocks (Full List)

All 36 Portuguese stocks requiring immediate validation:

| Symbol | Company Name | Sector | Status |
|--------|-------------|---------|--------|
| ALTR.LS | Altri SGPS S.A. | Basic Materials | Untested |
| BCP.LS | Banco Comercial Português S.A. | Financials | Untested |
| CDU.LS | Conduril - Engenharia S.A. | Industrials | Untested |
| COR.LS | Corticeira Amorim S.G.P.S. S.A. | Basic Materials | Untested |
| CTT.LS | CTT - Correios De Portugal S.A. | Industrials | Untested |
| EDP.LS | Energias de Portugal | Utilities | Untested |
| EDPR.LS | EDP Renováveis S.A. | Utilities | Untested |
| EGL.LS | Mota-Engil SGPS S.A. | Industrials | Untested |
| ESON.LS | Estoril Sol SGPS S.A. | Consumer Cyclical | Untested |
| FCP.LS | Futebol Clube do Porto S.A.D. | Consumer Cyclical | Untested |
| GALP.LS | Galp Energia | Energy | Untested |
| GLINT.LS | Glintt S.A. | Technology | Untested |
| GPA.LS | Grão Pará S.A. | Real Estate | Untested |
| IBS.LS | Ibersol S.G.P.S. S.A. | Consumer Cyclical | Untested |
| IPR.LS | Impresa SGPS S.A. | Communication | Untested |
| JMT.LS | Jerónimo Martins | Consumer Defensive | Untested |
| MAR.LS | Martifer SGPS S.A. | Industrials | Untested |
| MCP.LS | Media Capital SGPS S.A. | Communication | Untested |
| MLFMV.LS | Farminveste S.G.P.S. S.A. | Healthcare | Untested |
| MLRZE.LS | Raize - Instituição de Pagamentos | Financials | Untested |
| MRL.LS | MERLIN Properties SOCIMI S.A. | Real Estate | Untested |
| NBA.LS | Novabase S.G.P.S. S.A. | Technology | Untested |
| NOS.LS | NOS SGPS | Communication | Untested |
| NVG.LS | Navigator Company S.A. | Basic Materials | Untested |
| PHR.LS | Pharol SGPS S.A. | Communication | Untested |
| RAM.LS | Ramada Investimentos | Industrials | Untested |
| RENE.LS | REN - Redes Energéticas | Utilities | Untested |
| SCB.LS | Sporting Braga SAD | Consumer Cyclical | Untested |
| SCP.LS | Sporting CP SAD | Consumer Cyclical | Untested |
| SCT.LS | Toyota Caetano Portugal S.A. | Consumer Cyclical | Untested |
| SEM.LS | Semapa SGPS S.A. | Industrials | Untested |
| SLBEN.LS | Benfica SAD | Consumer Cyclical | Untested |
| SNC.LS | Sonaecom S.G.P.S. S.A. | Communication | Untested |
| SON.LS | Sonae SGPS S.A. | Consumer Defensive | Untested |
| TDSA.LS | Teixeira Duarte S.A. | Industrials | Untested |
| VAF.LS | Vista Alegre Atlantis SGPS | Consumer Cyclical | Untested |

---

**Report End**
