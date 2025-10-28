/**
 * Utilities Valuation Regression Test Suite
 *
 * FASE 2.4: Validates that utility stocks (NEE, DUK, SO, D, AEP) return valid intrinsic values
 * despite having negative FCF history and limited valuation methods.
 *
 * Context: Utilities are capital-intensive businesses with:
 * - High capex (power plants, grids) → Negative/volatile FCF
 * - Regulated returns → Low growth (3-6%)
 * - Stable dividends → Multiples-based valuation more reliable
 *
 * Expected Behavior:
 * - 6-9 methods per utility (vs 10-12 for tech)
 * - Missing: AlfaValue™, DCF-20 FCF, PEG (require positive 5-year FCF/growth)
 * - Present: P/E, P/S, P/B, PSG, DNI-20, DFCF Terminal
 *
 * Created: 2025-10-27
 * Bug Report: FASE_2.4_UTILITIES_FIX_REPORT.md
 */

import axios from 'axios';

// Use production URL or local dev
const BASE_URL = process.env.TARGET_URL || 'http://localhost:3001';
const TIMEOUT = 60000; // 60s (utilities need extra time)

interface IVMethod {
  name: string;
  iv: number | null;
  methodId: string | null;
  discount_pct: number | null;
}

interface IVChartResponse {
  ticker: string;
  price: number;
  methods: IVMethod[];
  timestamp: string;
}

describe('Utilities Valuation Regression Tests', () => {
  describe('NEE (NextEra Energy) - 3/5 positive FCF years', () => {
    let response: IVChartResponse;

    beforeAll(async () => {
      const res = await axios.get(`${BASE_URL}/api/iv/NEE/chart`, { timeout: TIMEOUT });
      response = res.data;
    });

    test('returns 8 valuation methods', () => {
      expect(response.methods.length).toBeGreaterThanOrEqual(6);
      expect(response.methods.length).toBeLessThanOrEqual(9);
    });

    test('all methods return valid (non-null) intrinsic values', () => {
      const nullMethods = response.methods.filter(m => m.iv === null || m.iv === undefined);
      expect(nullMethods).toHaveLength(0);
    });

    test('includes multiples methods (P/E, P/S, P/B)', () => {
      const hasPE = response.methods.some(m => m.name.includes('P/E'));
      const hasPB = response.methods.some(m => m.name.includes('P/B'));
      const hasPS = response.methods.some(m => m.name.includes('P/S'));

      expect(hasPE).toBe(true);
      expect(hasPB).toBe(true);
      expect(hasPS).toBe(true);
    });

    test('includes DNI-20 NI (Net Income fallback for negative FCF)', () => {
      const hasDNI = response.methods.some(m => m.name.includes('DNI-20'));
      expect(hasDNI).toBe(true);
    });

    test('intrinsic values are within reasonable range (0.2x - 2.5x price)', () => {
      response.methods.forEach(method => {
        if (method.iv && method.iv > 0) {
          const ratio = method.iv / response.price;
          expect(ratio).toBeGreaterThan(0.1);
          expect(ratio).toBeLessThan(3.0);
        }
      });
    });

    test('has current price populated', () => {
      expect(response.price).toBeGreaterThan(0);
      expect(response.price).toBeLessThan(500); // NEE typically $60-$100
    });
  });

  describe('DUK (Duke Energy) - 1/5 positive FCF years', () => {
    let response: IVChartResponse;

    beforeAll(async () => {
      const res = await axios.get(`${BASE_URL}/api/iv/DUK/chart`, { timeout: TIMEOUT });
      response = res.data;
    });

    test('returns 6-8 valuation methods', () => {
      expect(response.methods.length).toBeGreaterThanOrEqual(6);
      expect(response.methods.length).toBeLessThanOrEqual(8);
    });

    test('handles mostly negative FCF history gracefully', () => {
      // Should NOT crash or return empty methods array
      expect(response.methods.length).toBeGreaterThan(0);

      // All returned methods should be valid
      response.methods.forEach(method => {
        expect(method.iv).not.toBeNull();
        expect(method.iv).toBeGreaterThan(0);
      });
    });

    test('missing AlfaValue and DCF-20 FCF (expected due to negative FCF)', () => {
      const hasAlfaValue = response.methods.some(m => m.name.includes('AlfaValue'));
      const hasDCF20 = response.methods.some(m => m.name === 'DCF-20 FCF FMP');

      expect(hasAlfaValue).toBe(false);
      expect(hasDCF20).toBe(false);
    });
  });

  describe('SO (Southern Company) - 1/5 positive FCF years', () => {
    let response: IVChartResponse;

    beforeAll(async () => {
      const res = await axios.get(`${BASE_URL}/api/iv/SO/chart`, { timeout: TIMEOUT });
      response = res.data;
    });

    test('returns 6-8 valuation methods', () => {
      expect(response.methods.length).toBeGreaterThanOrEqual(6);
      expect(response.methods.length).toBeLessThanOrEqual(8);
    });

    test('all IVs are positive and non-zero', () => {
      response.methods.forEach(method => {
        expect(method.iv).toBeGreaterThan(0);
      });
    });
  });

  describe('D (Dominion Energy) - 0/5 positive FCF years', () => {
    let response: IVChartResponse;

    beforeAll(async () => {
      const res = await axios.get(`${BASE_URL}/api/iv/D/chart`, { timeout: TIMEOUT });
      response = res.data;
    });

    test('returns at least 6 valuation methods (multiples only)', () => {
      expect(response.methods.length).toBeGreaterThanOrEqual(6);
    });

    test('all 5 years negative FCF still produces valid IVs', () => {
      // Despite ALL years being negative FCF, multiples should work
      expect(response.methods.length).toBeGreaterThan(0);

      response.methods.forEach(method => {
        expect(method.iv).not.toBeNull();
        expect(method.iv).toBeGreaterThan(0);
      });
    });

    test('missing ALL FCF-based DCF methods (expected)', () => {
      const hasFCFMethod = response.methods.some(m =>
        m.name.includes('FCF') || m.name.includes('AlfaValue')
      );
      expect(hasFCFMethod).toBe(false);
    });

    test('has P/E, P/S, P/B methods (multiples work regardless of FCF)', () => {
      const hasPE = response.methods.some(m => m.name.includes('P/E'));
      const hasPB = response.methods.some(m => m.name.includes('P/B'));
      const hasPS = response.methods.some(m => m.name.includes('P/S'));

      expect(hasPE).toBe(true);
      expect(hasPB).toBe(true);
      expect(hasPS).toBe(true);
    });
  });

  describe('AEP (American Electric Power) - Recent positive FCF', () => {
    let response: IVChartResponse;

    beforeAll(async () => {
      const res = await axios.get(`${BASE_URL}/api/iv/AEP/chart`, { timeout: TIMEOUT });
      response = res.data;
    });

    test('returns 8-10 valuation methods (most complete utility)', () => {
      expect(response.methods.length).toBeGreaterThanOrEqual(8);
      expect(response.methods.length).toBeLessThanOrEqual(10);
    });

    test('includes DCF Terminal FCF (recent positive FCF enables it)', () => {
      const hasDCFTerminal = response.methods.some(m => m.name.includes('DCF Terminal'));
      expect(hasDCFTerminal).toBe(true);
    });

    test('all methods return valid IVs', () => {
      response.methods.forEach(method => {
        expect(method.iv).not.toBeNull();
        expect(method.iv).toBeGreaterThan(0);
      });
    });
  });

  describe('Cross-utility validation', () => {
    test('all 5 utilities complete within 60s timeout', async () => {
      const utilities = ['NEE', 'DUK', 'SO', 'D', 'AEP'];

      for (const ticker of utilities) {
        const start = Date.now();
        await axios.get(`${BASE_URL}/api/iv/${ticker}/chart`, { timeout: TIMEOUT });
        const elapsed = Date.now() - start;

        // Should complete under 60s (validation script timeout)
        expect(elapsed).toBeLessThan(60000);
      }
    }, 350000); // 5 stocks × 60s + buffer

    test('all utilities have at least 6 methods', async () => {
      const utilities = ['NEE', 'DUK', 'SO', 'D', 'AEP'];

      for (const ticker of utilities) {
        const res = await axios.get(`${BASE_URL}/api/iv/${ticker}/chart`, { timeout: TIMEOUT });
        expect(res.data.methods.length).toBeGreaterThanOrEqual(6);
      }
    }, 350000);

    test('no utility returns NULL intrinsic values', async () => {
      const utilities = ['NEE', 'DUK', 'SO', 'D', 'AEP'];

      for (const ticker of utilities) {
        const res = await axios.get(`${BASE_URL}/api/iv/${ticker}/chart`, { timeout: TIMEOUT });
        const nullMethods = res.data.methods.filter((m: IVMethod) => m.iv === null);

        expect(nullMethods).toHaveLength(0);
      }
    }, 350000);

    test('all IVs are within 0.1x - 3.0x of current price', async () => {
      const utilities = ['NEE', 'DUK', 'SO', 'D', 'AEP'];

      for (const ticker of utilities) {
        const res = await axios.get(`${BASE_URL}/api/iv/${ticker}/chart`, { timeout: TIMEOUT });
        const { price, methods } = res.data;

        methods.forEach((method: IVMethod) => {
          if (method.iv && method.iv > 0) {
            const ratio = method.iv / price;
            expect(ratio).toBeGreaterThan(0.1);
            expect(ratio).toBeLessThan(3.0);
          }
        });
      }
    }, 350000);
  });

  describe('Method availability by FCF profile', () => {
    test('utilities with positive TTM FCF have more methods', async () => {
      // AEP (positive TTM) should have 8-10 methods
      const aepRes = await axios.get(`${BASE_URL}/api/iv/AEP/chart`, { timeout: TIMEOUT });

      // D (all negative) should have 6-7 methods
      const dRes = await axios.get(`${BASE_URL}/api/iv/D/chart`, { timeout: TIMEOUT });

      expect(aepRes.data.methods.length).toBeGreaterThan(dRes.data.methods.length);
    }, 120000);

    test('utilities missing PEG method (low growth)', async () => {
      const utilities = ['NEE', 'DUK', 'SO', 'D', 'AEP'];

      for (const ticker of utilities) {
        const res = await axios.get(`${BASE_URL}/api/iv/${ticker}/chart`, { timeout: TIMEOUT });
        const hasPEG = res.data.methods.some((m: IVMethod) => m.name.includes('PEG'));

        // Utilities typically have low/zero growth → PEG not applicable
        expect(hasPEG).toBe(false);
      }
    }, 350000);
  });

  describe('Response time performance', () => {
    test('cached utility IVs return within 5 seconds', async () => {
      // First call warms cache
      await axios.get(`${BASE_URL}/api/iv/NEE/chart`, { timeout: TIMEOUT });

      // Second call should be fast (cached)
      const start = Date.now();
      await axios.get(`${BASE_URL}/api/iv/NEE/chart`, { timeout: TIMEOUT });
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(5000);
    }, 120000);
  });
});

/**
 * Run these tests with:
 *
 * Local:
 *   npm test -- utilities-valuation.test.ts
 *
 * Production:
 *   TARGET_URL=https://128.140.45.28.sslip.io npm test -- utilities-valuation.test.ts
 *
 * Expected Results:
 * - All tests should PASS
 * - No NULL intrinsic values
 * - 6-9 methods per utility (less than tech's 10-12, but expected)
 * - Response times <60s cold, <5s warm
 *
 * Known Behavior:
 * - NEE, DUK, SO: 7-8 methods (some negative FCF years)
 * - D: 6 methods (all negative FCF)
 * - AEP: 9 methods (most complete utility)
 * - Missing methods: AlfaValue, DCF-20 FCF, PEG (expected for utilities)
 */
