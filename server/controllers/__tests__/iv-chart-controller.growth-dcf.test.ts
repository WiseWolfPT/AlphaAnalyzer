/**
 * TDD Test Suite: Growth DCF 8Y Distribution Bug
 *
 * Tests the controller's logic for:
 * 1. Correct input extraction from GrowthDCF8YResponse
 * 2. Growth stock classification and method distribution
 * 3. Non-growth stocks (banks, REITs, value) should NOT get growth-dcf-8y
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import axios from 'axios';

const API_BASE = process.env.TEST_API_URL || 'http://localhost:3001';

describe('Growth DCF 8Y Distribution Tests', () => {
  describe('Input Extraction (TDD Red Phase)', () => {
    it('should extract correct inputs for NVDA Growth DCF 8Y', async () => {
      const response = await axios.get(`${API_BASE}/api/iv/NVDA/chart`);

      const growthMethod = response.data.methods.find(
        (m: any) => m.method_id === 'growth-dcf-8y'
      );

      expect(growthMethod).toBeDefined();
      expect(growthMethod.inputs).toBeDefined();

      // ✅ CRITICAL: Inputs must NOT be all zeros
      expect(growthMethod.inputs.fcf_ttm_musd).toBeGreaterThan(1000); // NVDA has ~60B FCF
      expect(growthMethod.inputs.shares_outstanding_m).toBeGreaterThan(20000); // NVDA ~24.8B shares
      expect(growthMethod.inputs.cash_musd).toBeGreaterThan(5000); // NVDA ~$43B cash

      // Growth rates should be realistic for high-growth stock
      expect(growthMethod.inputs.growth_rate_y1_3).toBeGreaterThan(0.15); // At least 15%
      expect(growthMethod.inputs.growth_rate_y4_6).toBeGreaterThan(0.08); // At least 8%
      expect(growthMethod.inputs.growth_rate_y7_8).toBeGreaterThan(0.04); // At least 4%

      // IV should be realistic ($100-$300 range for NVDA)
      expect(growthMethod.iv).toBeGreaterThan(100);
      expect(growthMethod.iv).toBeLessThan(500);
    });
  });

  describe('Growth Stock Distribution', () => {
    it('NVDA (Growth-Tech) should have growth-dcf-8y', async () => {
      const response = await axios.get(`${API_BASE}/api/iv/NVDA/chart`);
      const hasMethod = response.data.methods.some(
        (m: any) => m.method_id === 'growth-dcf-8y'
      );
      expect(hasMethod).toBe(true);
    });

    it('TSLA (Growth-Auto) should have growth-dcf-8y', async () => {
      const response = await axios.get(`${API_BASE}/api/iv/TSLA/chart`);
      const hasMethod = response.data.methods.some(
        (m: any) => m.method_id === 'growth-dcf-8y'
      );
      expect(hasMethod).toBe(true);
    });

    it('AMZN (Growth-Retail) should have growth-dcf-8y', async () => {
      const response = await axios.get(`${API_BASE}/api/iv/AMZN/chart`);
      const hasMethod = response.data.methods.some(
        (m: any) => m.method_id === 'growth-dcf-8y'
      );
      expect(hasMethod).toBe(true);
    });

    it('META (Growth-Tech) should have growth-dcf-8y', async () => {
      const response = await axios.get(`${API_BASE}/api/iv/META/chart`);
      const hasMethod = response.data.methods.some(
        (m: any) => m.method_id === 'growth-dcf-8y'
      );
      expect(hasMethod).toBe(true);
    });

    it('GOOGL (Growth-Tech) should have growth-dcf-8y', async () => {
      const response = await axios.get(`${API_BASE}/api/iv/GOOGL/chart`);
      const hasMethod = response.data.methods.some(
        (m: any) => m.method_id === 'growth-dcf-8y'
      );
      expect(hasMethod).toBe(true);
    });
  });

  describe('Bank Stock Distribution (Should NOT have growth-dcf-8y)', () => {
    it('JPM (Bank) should NOT have growth-dcf-8y', async () => {
      const response = await axios.get(`${API_BASE}/api/iv/JPM/chart`);
      const hasMethod = response.data.methods.some(
        (m: any) => m.method_id === 'growth-dcf-8y'
      );
      expect(hasMethod).toBe(false);
    });

    it('BAC (Bank) should NOT have growth-dcf-8y', async () => {
      const response = await axios.get(`${API_BASE}/api/iv/BAC/chart`);
      const hasMethod = response.data.methods.some(
        (m: any) => m.method_id === 'growth-dcf-8y'
      );
      expect(hasMethod).toBe(false);
    });

    it('GS (Bank) should NOT have growth-dcf-8y', async () => {
      const response = await axios.get(`${API_BASE}/api/iv/GS/chart`);
      const hasMethod = response.data.methods.some(
        (m: any) => m.method_id === 'growth-dcf-8y'
      );
      expect(hasMethod).toBe(false);
    });

    it('MS (Bank) should NOT have growth-dcf-8y', async () => {
      const response = await axios.get(`${API_BASE}/api/iv/MS/chart`);
      const hasMethod = response.data.methods.some(
        (m: any) => m.method_id === 'growth-dcf-8y'
      );
      expect(hasMethod).toBe(false);
    });

    it('WFC (Bank) should NOT have growth-dcf-8y', async () => {
      const response = await axios.get(`${API_BASE}/api/iv/WFC/chart`);
      const hasMethod = response.data.methods.some(
        (m: any) => m.method_id === 'growth-dcf-8y'
      );
      expect(hasMethod).toBe(false);
    });
  });

  describe('REIT Distribution (Should NOT have growth-dcf-8y)', () => {
    it('AMT (REIT) should NOT have growth-dcf-8y', async () => {
      const response = await axios.get(`${API_BASE}/api/iv/AMT/chart`);
      const hasMethod = response.data.methods.some(
        (m: any) => m.method_id === 'growth-dcf-8y'
      );
      expect(hasMethod).toBe(false);
    });

    it('PLD (REIT) should NOT have growth-dcf-8y', async () => {
      const response = await axios.get(`${API_BASE}/api/iv/PLD/chart`);
      const hasMethod = response.data.methods.some(
        (m: any) => m.method_id === 'growth-dcf-8y'
      );
      expect(hasMethod).toBe(false);
    });

    it('EQIX (REIT) should NOT have growth-dcf-8y', async () => {
      const response = await axios.get(`${API_BASE}/api/iv/EQIX/chart`);
      const hasMethod = response.data.methods.some(
        (m: any) => m.method_id === 'growth-dcf-8y'
      );
      expect(hasMethod).toBe(false);
    });
  });

  describe('Value Stock Distribution (Should NOT have growth-dcf-8y)', () => {
    it('KO (Consumer-Stable) should NOT have growth-dcf-8y', async () => {
      const response = await axios.get(`${API_BASE}/api/iv/KO/chart`);
      const hasMethod = response.data.methods.some(
        (m: any) => m.method_id === 'growth-dcf-8y'
      );
      expect(hasMethod).toBe(false);
    });

    it('PG (Consumer-Stable) should NOT have growth-dcf-8y', async () => {
      const response = await axios.get(`${API_BASE}/api/iv/PG/chart`);
      const hasMethod = response.data.methods.some(
        (m: any) => m.method_id === 'growth-dcf-8y'
      );
      expect(hasMethod).toBe(false);
    });

    it('JNJ (Healthcare-Stable) should NOT have growth-dcf-8y', async () => {
      const response = await axios.get(`${API_BASE}/api/iv/JNJ/chart`);
      const hasMethod = response.data.methods.some(
        (m: any) => m.method_id === 'growth-dcf-8y'
      );
      expect(hasMethod).toBe(false);
    });
  });
});
