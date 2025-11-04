/**
 * Test Suite: Empty available_methods Array Bug (P0 Bug #3)
 *
 * BUG REPRODUCTION:
 * - 29/92 strategic stocks (31.5%) return available_methods: []
 * - Affected: USB, PNC, TFC, TSLA, AMD, SHOP, AMZN, NVDA (partial)
 * - Root Cause: available_methods derived from methods array AFTER IV validation
 * - Impact: Broken UX - users see IV but cannot select valuation method
 *
 * EXPECTED BEHAVIOR:
 * - available_methods should list ALL methods that were ATTEMPTED
 * - Should include both successful AND failed methods
 * - Frontend needs full method list to populate dropdown
 *
 * FIX STRATEGY:
 * - Derive available_methods from methodIds (attempted) not methods (successful)
 * - Or derive from (methods + failedMethods) combined
 */

import { describe, it, expect, beforeAll } from 'vitest';
import axios from 'axios';

const BASE_URL = process.env.TEST_URL || 'http://localhost:3001';

// Failing stocks identified in FASE 1 validation
const FAILING_STOCKS = [
  { symbol: 'USB', sector: 'Financial Services', expectedMethods: 9 }, // Banks: No DCF (4 removed)
  { symbol: 'PNC', sector: 'Financial Services', expectedMethods: 9 },
  { symbol: 'TFC', sector: 'Financial Services', expectedMethods: 9 },
  { symbol: 'TSLA', sector: 'Consumer Cyclical', expectedMethods: 14 }, // Growth stocks
  { symbol: 'AMD', sector: 'Technology', expectedMethods: 14 },
  { symbol: 'SHOP', sector: 'Technology', expectedMethods: 14 },
  { symbol: 'AMZN', sector: 'Consumer Cyclical', expectedMethods: 14 },
  { symbol: 'NVDA', sector: 'Technology', expectedMethods: 14 }, // Partial failure
];

describe('P0 Bug #3: Empty available_methods Array', () => {
  describe('Current Failing Behavior', () => {
    it.skip('USB returns empty available_methods (EXPECTED FAILURE)', async () => {
      const response = await axios.get(`${BASE_URL}/api/iv/USB/chart`);
      expect(response.status).toBe(200);
      expect(response.data.available_methods).toBeDefined();

      // This will FAIL with current bug (available_methods: [])
      console.log('[USB] available_methods:', response.data.available_methods);
      console.log('[USB] methods.length:', response.data.methods?.length || 0);
      console.log('[USB] failedMethods.length:', response.data.failedMethods?.length || 0);

      // BUG: available_methods is empty even though methods were attempted
      expect(response.data.available_methods.length).toBeGreaterThan(0);
    }, 30000);

    it.skip('PNC returns empty available_methods (EXPECTED FAILURE)', async () => {
      const response = await axios.get(`${BASE_URL}/api/iv/PNC/chart`);
      expect(response.status).toBe(200);

      console.log('[PNC] available_methods:', response.data.available_methods);
      console.log('[PNC] methods.length:', response.data.methods?.length || 0);

      expect(response.data.available_methods.length).toBeGreaterThan(0);
    }, 30000);
  });

  describe('Root Cause Investigation', () => {
    it('should reveal available_methods derives from filtered methods array', async () => {
      const response = await axios.get(`${BASE_URL}/api/iv/USB/chart`);
      expect(response.status).toBe(200);

      const { available_methods, methods, failedMethods } = response.data;

      console.log('\n=== ROOT CAUSE ANALYSIS ===');
      console.log('available_methods:', available_methods || []);
      console.log('methods.length:', methods?.length || 0);
      console.log('failedMethods.length:', failedMethods?.length || 0);
      console.log('Total attempted:', (methods?.length || 0) + (failedMethods?.length || 0));

      // ROOT CAUSE: available_methods.length === methods.length (not total attempted)
      if (methods && failedMethods) {
        const totalAttempted = methods.length + failedMethods.length;
        console.log('\nBUG CONFIRMATION:');
        console.log('- available_methods.length:', available_methods?.length || 0);
        console.log('- methods.length:', methods.length);
        console.log('- Expected (total attempted):', totalAttempted);

        // This proves the bug
        if (available_methods) {
          expect(available_methods.length).toBe(methods.length); // Current (wrong)
          expect(available_methods.length).not.toBe(totalAttempted); // Should be this
        }
      }
    }, 30000);
  });

  describe('Expected Behavior After Fix', () => {
    it('USB should return 9 available methods (4 DCF blocked for banks)', async () => {
      const response = await axios.get(`${BASE_URL}/api/iv/USB/chart`);
      expect(response.status).toBe(200);
      expect(response.data.available_methods).toBeDefined();

      // After fix: Should list all attempted methods
      // Banks: 21 base - 4 DCF (blocked) = 17 attempted
      // But some may fail (DDM, Graham Number) → 9-15 expected
      console.log('[USB] available_methods:', response.data.available_methods);
      expect(response.data.available_methods.length).toBeGreaterThanOrEqual(9);
    }, 30000);

    it('TSLA should return 14+ available methods (growth stock)', async () => {
      const response = await axios.get(`${BASE_URL}/api/iv/TSLA/chart`);
      expect(response.status).toBe(200);
      expect(response.data.available_methods).toBeDefined();

      // Growth stocks: 21 base + growth-dcf-8y = 22 attempted
      // Expected available: 14-18 (some may fail like DDM if no dividend)
      console.log('[TSLA] available_methods:', response.data.available_methods);
      expect(response.data.available_methods.length).toBeGreaterThanOrEqual(14);
    }, 30000);

    it('All 8 failing stocks should have non-empty available_methods', async () => {
      const results = await Promise.all(
        FAILING_STOCKS.map(async ({ symbol, expectedMethods }) => {
          const response = await axios.get(`${BASE_URL}/api/iv/${symbol}/chart`);
          return {
            symbol,
            expectedMethods,
            available_methods: response.data.available_methods || [],
            methods_count: response.data.methods?.length || 0,
            failed_count: response.data.failedMethods?.length || 0,
          };
        })
      );

      console.log('\n=== VALIDATION RESULTS ===');
      results.forEach((r) => {
        console.log(
          `${r.symbol}: available=${r.available_methods.length}, ` +
            `success=${r.methods_count}, failed=${r.failed_count}, ` +
            `expected≥${r.expectedMethods}`
        );
      });

      // All stocks should have available_methods > 0
      results.forEach((r) => {
        expect(r.available_methods.length).toBeGreaterThan(0);
        expect(r.available_methods.length).toBeGreaterThanOrEqual(r.expectedMethods);
      });
    }, 120000); // 2 min timeout for 8 API calls
  });

  describe('Edge Cases', () => {
    it('NVDA (partial failure) should still return full method list', async () => {
      const response = await axios.get(`${BASE_URL}/api/iv/NVDA/chart`);
      expect(response.status).toBe(200);

      const { available_methods, methods, failedMethods } = response.data;

      console.log('[NVDA] available_methods:', available_methods?.length || 0);
      console.log('[NVDA] successful methods:', methods?.length || 0);
      console.log('[NVDA] failed methods:', failedMethods?.length || 0);

      // NVDA may have some successful + some failed
      // But available_methods should list ALL attempted
      expect(available_methods?.length || 0).toBeGreaterThanOrEqual(14);
    }, 30000);

    it('Banks (USB) should NOT include blocked DCF methods in available_methods', async () => {
      const response = await axios.get(`${BASE_URL}/api/iv/USB/chart`);
      expect(response.status).toBe(200);

      const { available_methods } = response.data;

      // Banks block 4 DCF methods: dcf-fcf-20, dcf-terminal-fcf, dni-20, dfcf-terminal
      const blockedDCFMethods = ['dcf-fcf-20', 'dcf-terminal-fcf', 'dni-20', 'dfcf-terminal'];

      blockedDCFMethods.forEach((methodId) => {
        expect(available_methods).not.toContain(methodId);
      });

      console.log('[USB] Correctly excluded DCF methods:', blockedDCFMethods);
    }, 30000);
  });
});
