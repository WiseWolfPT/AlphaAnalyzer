/**
 * TDD Tests for 14 Failing Stocks (Backend Validation)
 *
 * Target: Fix 86% → 100% pass rate (14 stocks failing to meet 6-method threshold)
 *
 * Test Strategy:
 * - Write failing tests first (RED)
 * - Implement fixes (GREEN)
 * - Verify recovery (REFACTOR)
 *
 * Expected Recovery:
 * - Priority 1 (Sector Filter): +3 stocks (VLO, AEP, MPC)
 * - Priority 2 (OCF Fallback): +3 stocks (INTC, APD, DUK)
 * - Priority 3 (Classification): +2 stocks (MS, CCI)
 * - Priority 4 (Data Requirements): +4 stocks (CRM, MRK, RTX, NEM)
 * - Priority 5 (Special Cases): +2 stocks (MCD, BA)
 *
 * Run: npm test -- test-14-failing-stocks-tdd.test.ts
 */

import axios from 'axios';

const API_BASE = process.env.API_BASE || 'http://localhost:3001';
const EXPECTED_MIN_METHODS = 6;

describe('14 Failing Stocks - Root Cause Fixes', () => {
  // Helper: Fetch IV chart and validate
  async function getIVChart(ticker: string) {
    const response = await axios.get(`${API_BASE}/api/iv/${ticker}/chart`);
    return response.data;
  }

  // Helper: Assert minimum method count
  function assertMinMethods(ticker: string, result: any, minExpected: number = EXPECTED_MIN_METHODS) {
    expect(result.methods).toBeDefined();
    expect(result.methods.length).toBeGreaterThanOrEqual(minExpected);
    console.log(
      `✅ ${ticker}: ${result.methods.length} methods (expected ≥${minExpected})`
    );
  }

  // Helper: Assert specific method exists
  function assertMethodExists(ticker: string, result: any, methodId: string) {
    const method = result.methods.find((m: any) => m.method_id === methodId);
    expect(method).toBeDefined();
    expect(method.iv).toBeGreaterThan(0);
    console.log(`  ✓ ${ticker}: ${methodId} = $${method.iv.toFixed(2)}`);
  }

  describe('Priority 1: SECTOR FILTER BUG (CRITICAL)', () => {
    /**
     * Root Cause: Energy/Utilities sectors incorrectly excluded
     * Impact: VLO, AEP, MPC returning 0 methods despite complete FMP data
     * Fix: Remove sector exclusion logic in valuation-service.ts:649-653
     */

    it('VLO (Valero Energy) should return ≥10 methods', async () => {
      const result = await getIVChart('VLO');

      // VLO has complete data → should pass all standard methods
      assertMinMethods('VLO', result, 10);

      // Critical methods VLO MUST have:
      assertMethodExists('VLO', result, 'alfavalue');          // Has FCF
      assertMethodExists('VLO', result, 'dcf-20-fcf');         // Has 5yr FCF
      assertMethodExists('VLO', result, 'dcf-terminal-fcf');   // Has 5yr FCF
      assertMethodExists('VLO', result, 'pe-mean');            // Has 5yr earnings
      assertMethodExists('VLO', result, 'ps-mean');            // Has 5yr revenue
      assertMethodExists('VLO', result, 'pb-mean');            // Has positive equity
      assertMethodExists('VLO', result, 'dni-20');             // Has 5yr NI
      assertMethodExists('VLO', result, 'dfcf-terminal');      // Has 5yr FCF
      assertMethodExists('VLO', result, 'peg');                // Has EPS growth
      assertMethodExists('VLO', result, 'psg');                // Has revenue growth

      console.log(`  ℹ VLO Data: FCF=$5,776M, OCF=$6,683M, Revenue=$129,881M`);
    }, 30000);

    it('AEP (American Electric Power) should return ≥10 methods', async () => {
      const result = await getIVChart('AEP');

      // AEP is dividend-paying utility → should have DDM too
      assertMinMethods('AEP', result, 10);

      assertMethodExists('AEP', result, 'alfavalue');
      assertMethodExists('AEP', result, 'dcf-20-fcf');
      assertMethodExists('AEP', result, 'pe-mean');
      assertMethodExists('AEP', result, 'ps-mean');
      assertMethodExists('AEP', result, 'pb-mean');
      assertMethodExists('AEP', result, 'ddm');  // Dividend payer

      console.log(`  ℹ AEP Data: FCF=$6,664M, Dividends=$1,904M, Equity=$26,944M`);
    }, 30000);

    it('MPC (Marathon Petroleum) should return ≥10 methods', async () => {
      const result = await getIVChart('MPC');

      assertMinMethods('MPC', result, 10);

      assertMethodExists('MPC', result, 'alfavalue');
      assertMethodExists('MPC', result, 'dcf-20-fcf');
      assertMethodExists('MPC', result, 'pe-mean');
      assertMethodExists('MPC', result, 'ps-mean');
      assertMethodExists('MPC', result, 'pb-mean');

      console.log(`  ℹ MPC Data: FCF=$6,132M, OCF=$8,665M, Revenue=$138,517M`);
    }, 30000);
  });

  describe('Priority 2: OCF FALLBACK (Capital-Intensive Stocks)', () => {
    /**
     * Root Cause: Negative FCF not falling back to OCF
     * Impact: INTC, APD, DUK have positive OCF but negative FCF → FCF methods failing
     * Fix: Add OCF fallback in valuation-service.ts:671-683
     */

    it('INTC (Intel) should use OCF when FCF negative', async () => {
      const result = await getIVChart('INTC');

      // INTC: FCF=-$15,656M, but OCF=+$8,288M (massive CapEx for fabs)
      assertMinMethods('INTC', result, 7);

      // Should have OCF-based DCF methods
      assertMethodExists('INTC', result, 'alfavalue');  // Using OCF fallback
      assertMethodExists('INTC', result, 'ps-mean');    // Revenue positive
      assertMethodExists('INTC', result, 'pb-mean');    // Equity positive

      // Check that AlfaValue used OCF (inputs should show OCF-based FCF)
      const alfaValue = result.methods.find((m: any) => m.method_id === 'alfavalue');
      expect(alfaValue.inputs.fcf_ttm_musd).toBeGreaterThan(0);  // Should be OCF, not negative FCF

      console.log(`  ℹ INTC Data: FCF=-$15,656M (❌), OCF=$8,288M (✅ fallback)`);
    }, 30000);

    it('APD (Air Products) should use OCF when FCF negative', async () => {
      const result = await getIVChart('APD');

      // APD: FCF=-$3,150M, but OCF=+$3,647M (high CapEx for industrial infrastructure)
      assertMinMethods('APD', result, 7);

      assertMethodExists('APD', result, 'alfavalue');
      assertMethodExists('APD', result, 'pe-mean');
      assertMethodExists('APD', result, 'ps-mean');
      assertMethodExists('APD', result, 'pb-mean');

      console.log(`  ℹ APD Data: FCF=-$3,150M (❌), OCF=$3,647M (✅ fallback)`);
    }, 30000);

    it('DUK (Duke Energy) should use OCF when FCF near-zero', async () => {
      const result = await getIVChart('DUK');

      // DUK: FCF=$48M (nearly zero), OCF=$12,328M (massive CapEx for utilities)
      assertMinMethods('DUK', result, 7);

      assertMethodExists('DUK', result, 'alfavalue');
      assertMethodExists('DUK', result, 'pe-mean');
      assertMethodExists('DUK', result, 'ddm');  // Dividend payer

      console.log(`  ℹ DUK Data: FCF=$48M (⚠️ low), OCF=$12,328M (✅ robust)`);
    }, 30000);
  });

  describe('Priority 3: CLASSIFICATION FIXES', () => {
    /**
     * Root Cause: Bank/REIT classifiers not detecting MS/CCI
     * Impact: Missing specialized methods (P/TBV for banks, FFO/AFFO for REITs)
     * Fix: Update stock-classifier.ts isBank() and isREIT()
     */

    it('MS (Morgan Stanley) should be classified as bank with P/TBV methods', async () => {
      const result = await getIVChart('MS');

      // MS is Financial Services → should have bank-specific methods
      assertMinMethods('MS', result, 8);

      assertMethodExists('MS', result, 'pe-mean');
      assertMethodExists('MS', result, 'pb-mean');
      assertMethodExists('MS', result, 'p-tbv-mean');    // Bank-specific
      assertMethodExists('MS', result, 'p-tbv-sector');  // Bank-specific
      assertMethodExists('MS', result, 'dni-20');        // NI-based (banks don't have FCF)

      console.log(`  ℹ MS Data: Negative FCF (bank characteristic), NI=$13,390M, Equity=$104,511M`);
    }, 30000);

    it('CCI (Crown Castle) should be classified as REIT with FFO methods', async () => {
      const result = await getIVChart('CCI');

      // CCI is Real Estate → should have REIT-specific methods
      assertMinMethods('CCI', result, 8);

      assertMethodExists('CCI', result, 'ffo-reit');           // FFO valuation
      assertMethodExists('CCI', result, 'affo-reit');          // AFFO valuation
      assertMethodExists('CCI', result, 'p-ffo-mean');         // P/FFO historical
      assertMethodExists('CCI', result, 'p-ffo-sector');       // P/FFO sector
      assertMethodExists('CCI', result, 'dividend-yield-reit'); // Dividend model

      console.log(`  ℹ CCI Data: Sector=Real Estate, Industry=REIT - Specialty, Dividends=$2,729M`);
    }, 30000);
  });

  describe('Priority 4: RELAX DATA REQUIREMENTS', () => {
    /**
     * Root Cause: Too strict validation (requiring exactly 5 years, rejecting 3-4 year data)
     * Impact: CRM, MRK, RTX, NEM failing methods unnecessarily
     * Fix: Relax 5yr requirement to 3yr minimum in all method calculations
     */

    it('CRM (Salesforce) should return ≥10 methods', async () => {
      const result = await getIVChart('CRM');

      assertMinMethods('CRM', result, 10);

      assertMethodExists('CRM', result, 'alfavalue');
      assertMethodExists('CRM', result, 'dcf-20-fcf');
      assertMethodExists('CRM', result, 'pe-mean');
      assertMethodExists('CRM', result, 'ps-mean');
      assertMethodExists('CRM', result, 'pb-mean');

      console.log(`  ℹ CRM Data: FCF=$12,434M, Revenue=$37,895M, Equity=$61,173M`);
    }, 30000);

    it('MRK (Merck) should return ≥10 methods', async () => {
      const result = await getIVChart('MRK');

      assertMinMethods('MRK', result, 10);

      assertMethodExists('MRK', result, 'alfavalue');
      assertMethodExists('MRK', result, 'dcf-20-fcf');
      assertMethodExists('MRK', result, 'pe-mean');
      assertMethodExists('MRK', result, 'ddm');  // Dividend payer

      console.log(`  ℹ MRK Data: FCF=$18,096M, NI=$17,117M, Dividends=$7,840M`);
    }, 30000);

    it('RTX (Raytheon) should return ≥10 methods', async () => {
      const result = await getIVChart('RTX');

      assertMinMethods('RTX', result, 10);

      assertMethodExists('RTX', result, 'alfavalue');
      assertMethodExists('RTX', result, 'dcf-20-fcf');
      assertMethodExists('RTX', result, 'pe-mean');
      assertMethodExists('RTX', result, 'ps-mean');

      console.log(`  ℹ RTX Data: FCF=$4,534M, OCF=$7,159M, Revenue=$80,738M`);
    }, 30000);

    it('NEM (Newmont Mining) should return ≥10 methods', async () => {
      const result = await getIVChart('NEM');

      assertMinMethods('NEM', result, 10);

      assertMethodExists('NEM', result, 'alfavalue');
      assertMethodExists('NEM', result, 'dcf-20-fcf');
      assertMethodExists('NEM', result, 'pe-mean');
      assertMethodExists('NEM', result, 'ps-mean');

      console.log(`  ℹ NEM Data: FCF=$2,961M, OCF=$6,363M, Revenue=$18,557M`);
    }, 30000);
  });

  describe('Priority 5: SPECIAL CASES (Edge Cases)', () => {
    /**
     * Root Cause: Legitimate negative metrics (equity, FCF, NI) causing failures
     * Impact: MCD (negative equity), BA (distressed - all negatives)
     * Fix: Handle gracefully, allow lower method counts for distressed stocks
     */

    it('MCD (McDonald\'s) should handle negative equity gracefully', async () => {
      const result = await getIVChart('MCD');

      // MCD has legitimate negative equity (buybacks/debt) → P/B methods fail
      // Should still have 8+ other methods
      assertMinMethods('MCD', result, 8);

      assertMethodExists('MCD', result, 'alfavalue');
      assertMethodExists('MCD', result, 'dcf-20-fcf');
      assertMethodExists('MCD', result, 'pe-mean');
      assertMethodExists('MCD', result, 'ps-mean');
      assertMethodExists('MCD', result, 'ddm');  // Strong dividend payer

      // P/B should be in failedMethods (negative equity)
      const failedPB = result.failedMethods.find((f: any) => f.method_id === 'pb-mean');
      expect(failedPB).toBeDefined();
      expect(failedPB.reason).toContain('negative');

      console.log(`  ℹ MCD Data: FCF=$6,672M (✅), Equity=-$3,796M (❌ buybacks), Dividends=$4,870M`);
    }, 30000);

    it('BA (Boeing) should pass with 3-4 methods (distressed exception)', async () => {
      const result = await getIVChart('BA');

      // BA is legitimately distressed (COVID impact):
      // FCF=-$14,398M, OCF=-$12,080M, NI=-$11,817M, Equity=-$3,908M
      // Only P/S methods should work (revenue still positive: $66,518M)
      // Lower threshold to 3 for distressed stocks
      assertMinMethods('BA', result, 3);

      assertMethodExists('BA', result, 'ps-mean');  // Revenue positive
      assertMethodExists('BA', result, 'psg');      // Revenue growth calculable

      // Most methods should be in failedMethods
      expect(result.failedMethods.length).toBeGreaterThan(10);

      console.log(`  ℹ BA Data: DISTRESSED - all negatives except revenue ($66,518M)`);
      console.log(`  ℹ BA: Accepting 3-4 methods as valid (distressed exception)`);
    }, 30000);
  });

  describe('Integration: All 14 Stocks Should Pass', () => {
    /**
     * Final validation: After all fixes, ALL 14 stocks should meet threshold
     * Target: 86/100 → 100/100 (14 stocks recovered)
     */

    const FAILING_STOCKS = [
      // CRITICAL (0 methods)
      { ticker: 'VLO', minExpected: 10, category: 'Energy' },
      { ticker: 'AEP', minExpected: 10, category: 'Utilities' },

      // SEVERE (1-3 methods)
      { ticker: 'CRM', minExpected: 10, category: 'Technology' },
      { ticker: 'MCD', minExpected: 8, category: 'Consumer (negative equity)' },
      { ticker: 'MRK', minExpected: 10, category: 'Healthcare' },
      { ticker: 'DUK', minExpected: 7, category: 'Utilities (low FCF)' },
      { ticker: 'MS', minExpected: 8, category: 'Financials (bank)' },
      { ticker: 'MPC', minExpected: 10, category: 'Energy' },

      // NEAR-MISS (4-5 methods)
      { ticker: 'BA', minExpected: 3, category: 'Industrials (distressed)' },
      { ticker: 'INTC', minExpected: 7, category: 'Technology (negative FCF)' },
      { ticker: 'CCI', minExpected: 8, category: 'Real Estate (REIT)' },
      { ticker: 'RTX', minExpected: 10, category: 'Industrials' },
      { ticker: 'APD', minExpected: 7, category: 'Materials (negative FCF)' },
      { ticker: 'NEM', minExpected: 10, category: 'Materials' },
    ];

    FAILING_STOCKS.forEach(({ ticker, minExpected, category }) => {
      it(`${ticker} (${category}) should return ≥${minExpected} methods`, async () => {
        const result = await getIVChart(ticker);
        assertMinMethods(ticker, result, minExpected);
      }, 30000);
    });
  });

  describe('Regression: Previously Passing Stocks Should Still Pass', () => {
    /**
     * Ensure fixes don't break existing stocks
     * Sample 5 stocks from the 86 that were passing
     */

    const SAMPLE_PASSING = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA'];

    SAMPLE_PASSING.forEach((ticker) => {
      it(`${ticker} should still return ≥6 methods (regression check)`, async () => {
        const result = await getIVChart(ticker);
        assertMinMethods(ticker, result, 6);
      }, 30000);
    });
  });
});
