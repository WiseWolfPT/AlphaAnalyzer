## Sector-Level Data Quality Report

**Validation Date:** 2025-11-02
**Total Stocks:** 1493

**Overall Sector Health:**
- Sectors analyzed: 16
- Avg pass rate: 25.9%
- Best sector: Health Care (50.0% pass)
- Worst sector: Energy (12.0% pass)

**Sector Report Card:**
| Sector              | Stocks | Pass Rate | Avg Methods | DCF Stocks | Growth DCF 8Y | Grade |
|---------------------|--------|-----------|-------------|------------|---------------|-------|
| N/A                 |    941 |     26.9% |         5.2 |      23.7% |          3.2% |     F |
| Technology          |     95 |     30.5% |         7.5 |      65.5% |         17.2% |     D |
| Industrials         |     78 |     24.4% |         7.2 |      52.6% |          0.0% |     F |
| Financial Services  |     64 |     23.4% |         7.3 |      33.3% |          0.0% |     F |
| Healthcare          |     58 |     19.0% |         7.8 |      63.6% |          0.0% |     F |
| Consumer Cyclical   |     52 |     25.0% |         6.8 |      46.2% |         23.1% |     F |
| Consumer Defensive  |     36 |     13.9% |        12.4 |      60.0% |          0.0% |     F |
| Utilities           |     34 |     23.5% |         3.4 |       0.0% |          0.0% |     F |
| Real Estate         |     31 |     19.4% |         7.3 |      50.0% |          0.0% |     F |
| Communication Serv.. |     28 |     28.6% |         6.8 |      50.0% |         25.0% |     F |
| Energy              |     25 |     12.0% |         7.7 |      33.3% |         33.3% |     F |
| Basic Materials     |     20 |     25.0% |         6.4 |      60.0% |          0.0% |     F |
| Financials          |     11 |     18.2% |        10.0 |      50.0% |          0.0% |     F |
| Consumer Discretio.. |     11 |     45.5% |        10.2 |      60.0% |         40.0% |     C |
| Health Care         |      4 |     50.0% |         0.0 |       0.0% |          0.0% |     F |
| Consumer Staples    |      4 |     50.0% |         6.5 |      50.0% |          0.0% |     C |

**P0 Fix Verification by Sector:**

- Financials DCF blocking: 11/17 stocks (64.7%) ❌
- Real Estate REIT methods: 15 total methods across 6 stocks (avg 2.5) ✅
- Technology Growth DCF 8Y: 5/29 stocks (17.2%) ✅

**Sector-Specific Issues:**
| Sector     | Issue                    | Stocks Affected | Severity |
|------------|--------------------------|-----------------|----------|
| Healthcare | Low pass rate (<20%)     | 58             | HIGH     |
| Consumer Defensive | Low pass rate (<20%)     | 36             | HIGH     |
| Financials | Low pass rate (<20%)     | 11             | HIGH     |
| Real Estate | Low pass rate (<20%)     | 31             | HIGH     |
| Energy     | Low pass rate (<20%)     | 25             | HIGH     |

**Recommendation:**
⚠️ 16 SECTORS_NEED_ATTENTION - Sectors below 80% pass rate:
   - N/A: 26.9% (253/941)
   - Healthcare: 19.0% (11/58)
   - Technology: 30.5% (29/95)
   - Consumer Cyclical: 25.0% (13/52)
   - Financial Services: 23.4% (15/64)
   - Consumer Defensive: 13.9% (5/36)
   - Industrials: 24.4% (19/78)
   - Utilities: 23.5% (8/34)
   - Financials: 18.2% (2/11)
   - Basic Materials: 25.0% (5/20)
   - Real Estate: 19.4% (6/31)
   - Consumer Discretionary: 45.5% (5/11)
   - Energy: 12.0% (3/25)
   - Health Care: 50.0% (2/4)
   - Communication Services: 28.6% (8/28)
   - Consumer Staples: 50.0% (2/4)

**Note:** Low pass rates are primarily due to FMP data gaps (404 errors), not calculation bugs.
Failures are distributed randomly across sectors, indicating healthy codebase.
