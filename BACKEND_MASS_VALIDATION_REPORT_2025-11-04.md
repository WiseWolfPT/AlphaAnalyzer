# Backend IV Validation Report

**Date:** 2025-11-04T14:14:13.475Z
**Target:** https://128.140.45.28.sslip.io
**Duration:** 11.2 minutes

## Summary

- **Total Tested:** 155
- **Passed:** 138 (89.03%)
- **Failed:** 17
- **ETF Rejected:** 0
- **Status:** ❌ FAIL

## Performance

- **Avg Response Time:** 4100ms
- **P95 Response Time:** 19627ms
- **Max Response Time:** 24261ms
- **Status:** ❌ FAIL

## By Stock Classification

### BANK
- **Passed:** 28/28
- **Avg Methods:** 8.8
- **Stocks:** JPM, BAC, WFC, C, GS, MS, USB, PNC, TFC, BK...

### REIT
- **Passed:** 14/14
- **Avg Methods:** 14.9
- **Stocks:** PLD, AMT, CCI, EQIX, VICI, EQR, INVH, MAA, ESS, REG...

### GROWTH
- **Passed:** 17/17
- **Avg Methods:** 11.4
- **Stocks:** NVDA, TSLA, NFLX, META, GOOGL, SNOW, DDOG, BILL, DOCN, CMI...

### VALUE
- **Passed:** 79/79
- **Avg Methods:** 7.1
- **Stocks:** COF, SCHW, AXP, ONB, PSA, DLR, O, ARE, AVB, CPT...


## Method Distribution

| Methods | Stocks | Percentage |
|---------|--------|------------|
| 0 | 32 | 23.2% |
| 3 | 1 | 0.7% |
| 4 | 1 | 0.7% |
| 5 | 2 | 1.4% |
| 6 | 3 | 2.2% |
| 7 | 7 | 5.1% |
| 8 | 6 | 4.3% |
| 9 | 7 | 5.1% |
| 10 | 16 | 11.6% |
| 11 | 15 | 10.9% |
| 12 | 7 | 5.1% |
| 13 | 11 | 8.0% |
| 14 | 12 | 8.7% |
| 15 | 7 | 5.1% |
| 16 | 3 | 2.2% |
| 17 | 2 | 1.4% |
| 18 | 6 | 4.3% |

## Failures

- **WTFC:** HTTP 404 - {"error":"No price data found for WTFC"}
- **WELL:** HTTP 404 - {"error":"No price data found for WELL"}
- **SPG:** HTTP 404 - {"error":"No price data found for SPG"}
- **SUI:** HTTP 404 - {"error":"No price data found for SUI"}
- **UDR:** HTTP 404 - {"error":"No price data found for UDR"}
- **MAC:** HTTP 404 - {"error":"No price data found for MAC"}
- **SLG:** HTTP 404 - {"error":"No price data found for SLG"}
- **NET:** HTTP 404 - {"error":"No price data found for NET"}
- **MDB:** HTTP 404 - {"error":"No price data found for MDB"}
- **TWLO:** HTTP 404 - {"error":"No price data found for TWLO"}
- **FROG:** HTTP 404 - {"error":"No price data found for FROG"}
- **GTLB:** HTTP 404 - {"error":"No price data found for GTLB"}
- **ESTC:** HTTP 404 - {"error":"No price data found for ESTC"}
- **CFLT:** HTTP 404 - {"error":"No price data found for CFLT"}
- **ITW:** HTTP 404 - {"error":"No price data found for ITW"}
- **BRK.A:** HTTP 404 - {"error":"No price data found for BRK-A"}
- **PANW:** HTTP 404 - {"error":"No price data found for PANW"}

## Overall Status

**❌ FAIL - Issues need resolution**
